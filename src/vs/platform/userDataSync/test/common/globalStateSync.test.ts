/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IUserDataSyncStoreService, IUserDataSyncService, SyncResource, SyncStatus, IGloBalState, ISyncData } from 'vs/platform/userDataSync/common/userDataSync';
import { UserDataSyncClient, UserDataSyncTestServer } from 'vs/platform/userDataSync/test/common/userDataSyncClient';
import { DisposaBleStore, toDisposaBle } from 'vs/Base/common/lifecycle';
import { UserDataSyncService } from 'vs/platform/userDataSync/common/userDataSyncService';
import { IFileService } from 'vs/platform/files/common/files';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { GloBalStateSynchroniser } from 'vs/platform/userDataSync/common/gloBalStateSync';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { IStorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';


suite('GloBalStateSync', () => {

	const disposaBleStore = new DisposaBleStore();
	const server = new UserDataSyncTestServer();
	let testClient: UserDataSyncClient;
	let client2: UserDataSyncClient;

	let testOBject: GloBalStateSynchroniser;

	setup(async () => {
		testClient = disposaBleStore.add(new UserDataSyncClient(server));
		await testClient.setUp(true);
		let storageKeysSyncRegistryService = testClient.instantiationService.get(IStorageKeysSyncRegistryService);
		storageKeysSyncRegistryService.registerStorageKey({ key: 'a', version: 1 });
		storageKeysSyncRegistryService.registerStorageKey({ key: 'B', version: 1 });
		testOBject = (testClient.instantiationService.get(IUserDataSyncService) as UserDataSyncService).getSynchroniser(SyncResource.GloBalState) as GloBalStateSynchroniser;
		disposaBleStore.add(toDisposaBle(() => testClient.instantiationService.get(IUserDataSyncStoreService).clear()));

		client2 = disposaBleStore.add(new UserDataSyncClient(server));
		await client2.setUp(true);
		storageKeysSyncRegistryService = client2.instantiationService.get(IStorageKeysSyncRegistryService);
		storageKeysSyncRegistryService.registerStorageKey({ key: 'a', version: 1 });
		storageKeysSyncRegistryService.registerStorageKey({ key: 'B', version: 1 });
	});

	teardown(() => disposaBleStore.clear());

	test('when gloBal state does not exist', async () => {
		assert.deepEqual(await testOBject.getLastSyncUserData(), null);
		let manifest = await testClient.manifest();
		server.reset();
		await testOBject.sync(manifest);

		assert.deepEqual(server.requests, [
			{ type: 'GET', url: `${server.url}/v1/resource/${testOBject.resource}/latest`, headers: {} },
		]);

		const lastSyncUserData = await testOBject.getLastSyncUserData();
		const remoteUserData = await testOBject.getRemoteUserData(null);
		assert.deepEqual(lastSyncUserData!.ref, remoteUserData.ref);
		assert.deepEqual(lastSyncUserData!.syncData, remoteUserData.syncData);
		assert.equal(lastSyncUserData!.syncData, null);

		manifest = await testClient.manifest();
		server.reset();
		await testOBject.sync(manifest);
		assert.deepEqual(server.requests, []);

		manifest = await testClient.manifest();
		server.reset();
		await testOBject.sync(manifest);
		assert.deepEqual(server.requests, []);
	});

	test('when gloBal state is created after first sync', async () => {
		await testOBject.sync(await testClient.manifest());
		updateStorage('a', 'value1', testClient);

		let lastSyncUserData = await testOBject.getLastSyncUserData();
		const manifest = await testClient.manifest();
		server.reset();
		await testOBject.sync(manifest);

		assert.deepEqual(server.requests, [
			{ type: 'POST', url: `${server.url}/v1/resource/${testOBject.resource}`, headers: { 'If-Match': lastSyncUserData?.ref } },
		]);

		lastSyncUserData = await testOBject.getLastSyncUserData();
		const remoteUserData = await testOBject.getRemoteUserData(null);
		assert.deepEqual(lastSyncUserData!.ref, remoteUserData.ref);
		assert.deepEqual(lastSyncUserData!.syncData, remoteUserData.syncData);
		assert.deepEqual(JSON.parse(lastSyncUserData!.syncData!.content).storage, { 'a': { version: 1, value: 'value1' } });
	});

	test('first time sync - outgoing to server (no state)', async () => {
		updateStorage('a', 'value1', testClient);
		await updateLocale(testClient);

		await testOBject.sync(await testClient.manifest());
		assert.equal(testOBject.status, SyncStatus.Idle);
		assert.deepEqual(testOBject.conflicts, []);

		const { content } = await testClient.read(testOBject.resource);
		assert.ok(content !== null);
		const actual = parseGloBalState(content!);
		assert.deepEqual(actual.storage, { 'gloBalState.argv.locale': { version: 1, value: 'en' }, 'a': { version: 1, value: 'value1' } });
	});

	test('first time sync - incoming from server (no state)', async () => {
		updateStorage('a', 'value1', client2);
		await updateLocale(client2);
		await client2.sync();

		await testOBject.sync(await testClient.manifest());
		assert.equal(testOBject.status, SyncStatus.Idle);
		assert.deepEqual(testOBject.conflicts, []);

		assert.equal(readStorage('a', testClient), 'value1');
		assert.equal(await readLocale(testClient), 'en');
	});

	test('first time sync when storage exists', async () => {
		updateStorage('a', 'value1', client2);
		await client2.sync();

		updateStorage('B', 'value2', testClient);
		await testOBject.sync(await testClient.manifest());
		assert.equal(testOBject.status, SyncStatus.Idle);
		assert.deepEqual(testOBject.conflicts, []);

		assert.equal(readStorage('a', testClient), 'value1');
		assert.equal(readStorage('B', testClient), 'value2');

		const { content } = await testClient.read(testOBject.resource);
		assert.ok(content !== null);
		const actual = parseGloBalState(content!);
		assert.deepEqual(actual.storage, { 'a': { version: 1, value: 'value1' }, 'B': { version: 1, value: 'value2' } });
	});

	test('first time sync when storage exists - has conflicts', async () => {
		updateStorage('a', 'value1', client2);
		await client2.sync();

		updateStorage('a', 'value2', client2);
		await testOBject.sync(await testClient.manifest());

		assert.equal(testOBject.status, SyncStatus.Idle);
		assert.deepEqual(testOBject.conflicts, []);

		assert.equal(readStorage('a', testClient), 'value1');

		const { content } = await testClient.read(testOBject.resource);
		assert.ok(content !== null);
		const actual = parseGloBalState(content!);
		assert.deepEqual(actual.storage, { 'a': { version: 1, value: 'value1' } });
	});

	test('sync adding a storage value', async () => {
		updateStorage('a', 'value1', testClient);
		await testOBject.sync(await testClient.manifest());

		updateStorage('B', 'value2', testClient);
		await testOBject.sync(await testClient.manifest());
		assert.equal(testOBject.status, SyncStatus.Idle);
		assert.deepEqual(testOBject.conflicts, []);

		assert.equal(readStorage('a', testClient), 'value1');
		assert.equal(readStorage('B', testClient), 'value2');

		const { content } = await testClient.read(testOBject.resource);
		assert.ok(content !== null);
		const actual = parseGloBalState(content!);
		assert.deepEqual(actual.storage, { 'a': { version: 1, value: 'value1' }, 'B': { version: 1, value: 'value2' } });
	});

	test('sync updating a storage value', async () => {
		updateStorage('a', 'value1', testClient);
		await testOBject.sync(await testClient.manifest());

		updateStorage('a', 'value2', testClient);
		await testOBject.sync(await testClient.manifest());
		assert.equal(testOBject.status, SyncStatus.Idle);
		assert.deepEqual(testOBject.conflicts, []);

		assert.equal(readStorage('a', testClient), 'value2');

		const { content } = await testClient.read(testOBject.resource);
		assert.ok(content !== null);
		const actual = parseGloBalState(content!);
		assert.deepEqual(actual.storage, { 'a': { version: 1, value: 'value2' } });
	});

	test('sync removing a storage value', async () => {
		updateStorage('a', 'value1', testClient);
		updateStorage('B', 'value2', testClient);
		await testOBject.sync(await testClient.manifest());

		removeStorage('B', testClient);
		await testOBject.sync(await testClient.manifest());
		assert.equal(testOBject.status, SyncStatus.Idle);
		assert.deepEqual(testOBject.conflicts, []);

		assert.equal(readStorage('a', testClient), 'value1');
		assert.equal(readStorage('B', testClient), undefined);

		const { content } = await testClient.read(testOBject.resource);
		assert.ok(content !== null);
		const actual = parseGloBalState(content!);
		assert.deepEqual(actual.storage, { 'a': { version: 1, value: 'value1' } });
	});

	function parseGloBalState(content: string): IGloBalState {
		const syncData: ISyncData = JSON.parse(content);
		return JSON.parse(syncData.content);
	}

	async function updateLocale(client: UserDataSyncClient): Promise<void> {
		const fileService = client.instantiationService.get(IFileService);
		const environmentService = client.instantiationService.get(IEnvironmentService);
		await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'en' })));
	}

	function updateStorage(key: string, value: string, client: UserDataSyncClient): void {
		const storageService = client.instantiationService.get(IStorageService);
		storageService.store(key, value, StorageScope.GLOBAL);
	}

	function removeStorage(key: string, client: UserDataSyncClient): void {
		const storageService = client.instantiationService.get(IStorageService);
		storageService.remove(key, StorageScope.GLOBAL);
	}

	function readStorage(key: string, client: UserDataSyncClient): string | undefined {
		const storageService = client.instantiationService.get(IStorageService);
		return storageService.get(key, StorageScope.GLOBAL);
	}

	async function readLocale(client: UserDataSyncClient): Promise<string | undefined> {
		const fileService = client.instantiationService.get(IFileService);
		const environmentService = client.instantiationService.get(IEnvironmentService);
		const content = await fileService.readFile(environmentService.argvResource);
		return JSON.parse(content.value.toString()).locale;
	}

});
