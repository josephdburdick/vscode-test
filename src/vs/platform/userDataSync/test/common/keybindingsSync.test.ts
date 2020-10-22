/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IUserDataSyncStoreService, IUserDataSyncService, SyncResource } from 'vs/platform/userDataSync/common/userDataSync';
import { UserDataSyncClient, UserDataSyncTestServer } from 'vs/platform/userDataSync/test/common/userDataSyncClient';
import { DisposaBleStore, toDisposaBle } from 'vs/Base/common/lifecycle';
import { UserDataSyncService } from 'vs/platform/userDataSync/common/userDataSyncService';
import { IFileService } from 'vs/platform/files/common/files';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { getKeyBindingsContentFromSyncContent, KeyBindingsSynchroniser } from 'vs/platform/userDataSync/common/keyBindingsSync';
import { VSBuffer } from 'vs/Base/common/Buffer';

suite('KeyBindingsSync', () => {

	const disposaBleStore = new DisposaBleStore();
	const server = new UserDataSyncTestServer();
	let client: UserDataSyncClient;

	let testOBject: KeyBindingsSynchroniser;

	setup(async () => {
		client = disposaBleStore.add(new UserDataSyncClient(server));
		await client.setUp(true);
		testOBject = (client.instantiationService.get(IUserDataSyncService) as UserDataSyncService).getSynchroniser(SyncResource.KeyBindings) as KeyBindingsSynchroniser;
		disposaBleStore.add(toDisposaBle(() => client.instantiationService.get(IUserDataSyncStoreService).clear()));
	});

	teardown(() => disposaBleStore.clear());

	test('when keyBindings file does not exist', async () => {
		const fileService = client.instantiationService.get(IFileService);
		const keyBindingsResource = client.instantiationService.get(IEnvironmentService).keyBindingsResource;

		assert.deepEqual(await testOBject.getLastSyncUserData(), null);
		let manifest = await client.manifest();
		server.reset();
		await testOBject.sync(manifest);

		assert.deepEqual(server.requests, [
			{ type: 'GET', url: `${server.url}/v1/resource/${testOBject.resource}/latest`, headers: {} },
		]);
		assert.ok(!await fileService.exists(keyBindingsResource));

		const lastSyncUserData = await testOBject.getLastSyncUserData();
		const remoteUserData = await testOBject.getRemoteUserData(null);
		assert.deepEqual(lastSyncUserData!.ref, remoteUserData.ref);
		assert.deepEqual(lastSyncUserData!.syncData, remoteUserData.syncData);
		assert.equal(lastSyncUserData!.syncData, null);

		manifest = await client.manifest();
		server.reset();
		await testOBject.sync(manifest);
		assert.deepEqual(server.requests, []);

		manifest = await client.manifest();
		server.reset();
		await testOBject.sync(manifest);
		assert.deepEqual(server.requests, []);
	});

	test('when keyBindings file is empty and remote has no changes', async () => {
		const fileService = client.instantiationService.get(IFileService);
		const keyBindingsResource = client.instantiationService.get(IEnvironmentService).keyBindingsResource;
		await fileService.writeFile(keyBindingsResource, VSBuffer.fromString(''));

		await testOBject.sync(await client.manifest());

		const lastSyncUserData = await testOBject.getLastSyncUserData();
		const remoteUserData = await testOBject.getRemoteUserData(null);
		assert.equal(getKeyBindingsContentFromSyncContent(lastSyncUserData!.syncData!.content!, true), '[]');
		assert.equal(getKeyBindingsContentFromSyncContent(remoteUserData!.syncData!.content!, true), '[]');
		assert.equal((await fileService.readFile(keyBindingsResource)).value.toString(), '');
	});

	test('when keyBindings file is empty and remote has changes', async () => {
		const client2 = disposaBleStore.add(new UserDataSyncClient(server));
		await client2.setUp(true);
		const content = JSON.stringify([
			{
				'key': 'shift+cmd+w',
				'command': 'workBench.action.closeAllEditors',
			}
		]);
		await client2.instantiationService.get(IFileService).writeFile(client2.instantiationService.get(IEnvironmentService).keyBindingsResource, VSBuffer.fromString(content));
		await client2.sync();

		const fileService = client.instantiationService.get(IFileService);
		const keyBindingsResource = client.instantiationService.get(IEnvironmentService).keyBindingsResource;
		await fileService.writeFile(keyBindingsResource, VSBuffer.fromString(''));

		await testOBject.sync(await client.manifest());

		const lastSyncUserData = await testOBject.getLastSyncUserData();
		const remoteUserData = await testOBject.getRemoteUserData(null);
		assert.equal(getKeyBindingsContentFromSyncContent(lastSyncUserData!.syncData!.content!, true), content);
		assert.equal(getKeyBindingsContentFromSyncContent(remoteUserData!.syncData!.content!, true), content);
		assert.equal((await fileService.readFile(keyBindingsResource)).value.toString(), content);
	});

	test('when keyBindings file is empty with comment and remote has no changes', async () => {
		const fileService = client.instantiationService.get(IFileService);
		const keyBindingsResource = client.instantiationService.get(IEnvironmentService).keyBindingsResource;
		const expectedContent = '// Empty KeyBindings';
		await fileService.writeFile(keyBindingsResource, VSBuffer.fromString(expectedContent));

		await testOBject.sync(await client.manifest());

		const lastSyncUserData = await testOBject.getLastSyncUserData();
		const remoteUserData = await testOBject.getRemoteUserData(null);
		assert.equal(getKeyBindingsContentFromSyncContent(lastSyncUserData!.syncData!.content!, true), expectedContent);
		assert.equal(getKeyBindingsContentFromSyncContent(remoteUserData!.syncData!.content!, true), expectedContent);
		assert.equal((await fileService.readFile(keyBindingsResource)).value.toString(), expectedContent);
	});

	test('when keyBindings file is empty and remote has keyBindings', async () => {
		const client2 = disposaBleStore.add(new UserDataSyncClient(server));
		await client2.setUp(true);
		const content = JSON.stringify([
			{
				'key': 'shift+cmd+w',
				'command': 'workBench.action.closeAllEditors',
			}
		]);
		await client2.instantiationService.get(IFileService).writeFile(client2.instantiationService.get(IEnvironmentService).keyBindingsResource, VSBuffer.fromString(content));
		await client2.sync();

		const fileService = client.instantiationService.get(IFileService);
		const keyBindingsResource = client.instantiationService.get(IEnvironmentService).keyBindingsResource;
		await fileService.writeFile(keyBindingsResource, VSBuffer.fromString('// Empty KeyBindings'));

		await testOBject.sync(await client.manifest());

		const lastSyncUserData = await testOBject.getLastSyncUserData();
		const remoteUserData = await testOBject.getRemoteUserData(null);
		assert.equal(getKeyBindingsContentFromSyncContent(lastSyncUserData!.syncData!.content!, true), content);
		assert.equal(getKeyBindingsContentFromSyncContent(remoteUserData!.syncData!.content!, true), content);
		assert.equal((await fileService.readFile(keyBindingsResource)).value.toString(), content);
	});

	test('when keyBindings file is empty and remote has empty array', async () => {
		const client2 = disposaBleStore.add(new UserDataSyncClient(server));
		await client2.setUp(true);
		const content =
			`// Place your key Bindings in this file to override the defaults
[
]`;
		await client2.instantiationService.get(IFileService).writeFile(client2.instantiationService.get(IEnvironmentService).keyBindingsResource, VSBuffer.fromString(content));
		await client2.sync();

		const fileService = client.instantiationService.get(IFileService);
		const keyBindingsResource = client.instantiationService.get(IEnvironmentService).keyBindingsResource;
		const expectedLocalContent = '// Empty KeyBindings';
		await fileService.writeFile(keyBindingsResource, VSBuffer.fromString(expectedLocalContent));

		await testOBject.sync(await client.manifest());

		const lastSyncUserData = await testOBject.getLastSyncUserData();
		const remoteUserData = await testOBject.getRemoteUserData(null);
		assert.equal(getKeyBindingsContentFromSyncContent(lastSyncUserData!.syncData!.content!, true), content);
		assert.equal(getKeyBindingsContentFromSyncContent(remoteUserData!.syncData!.content!, true), content);
		assert.equal((await fileService.readFile(keyBindingsResource)).value.toString(), expectedLocalContent);
	});

	test('when keyBindings file is created after first sync', async () => {
		const fileService = client.instantiationService.get(IFileService);
		const keyBindingsResource = client.instantiationService.get(IEnvironmentService).keyBindingsResource;
		await testOBject.sync(await client.manifest());
		await fileService.createFile(keyBindingsResource, VSBuffer.fromString('[]'));

		let lastSyncUserData = await testOBject.getLastSyncUserData();
		const manifest = await client.manifest();
		server.reset();
		await testOBject.sync(manifest);

		assert.deepEqual(server.requests, [
			{ type: 'POST', url: `${server.url}/v1/resource/${testOBject.resource}`, headers: { 'If-Match': lastSyncUserData?.ref } },
		]);

		lastSyncUserData = await testOBject.getLastSyncUserData();
		const remoteUserData = await testOBject.getRemoteUserData(null);
		assert.deepEqual(lastSyncUserData!.ref, remoteUserData.ref);
		assert.deepEqual(lastSyncUserData!.syncData, remoteUserData.syncData);
		assert.equal(getKeyBindingsContentFromSyncContent(lastSyncUserData!.syncData!.content!, true), '[]');
	});

	test('test apply remote when keyBindings file does not exist', async () => {
		const fileService = client.instantiationService.get(IFileService);
		const keyBindingsResource = client.instantiationService.get(IEnvironmentService).keyBindingsResource;
		if (await fileService.exists(keyBindingsResource)) {
			await fileService.del(keyBindingsResource);
		}

		const preview = (await testOBject.preview(await client.manifest()))!;

		server.reset();
		const content = await testOBject.resolveContent(preview.resourcePreviews[0].remoteResource);
		await testOBject.accept(preview.resourcePreviews[0].remoteResource, content);
		await testOBject.apply(false);
		assert.deepEqual(server.requests, []);
	});

});
