/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IUserDataSyncService, SyncStatus, SyncResource } from 'vs/platform/userDataSync/common/userDataSync';
import { UserDataSyncClient, UserDataSyncTestServer } from 'vs/platform/userDataSync/test/common/userDataSyncClient';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IFileService } from 'vs/platform/files/common/files';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { joinPath } from 'vs/Base/common/resources';

suite('UserDataSyncService', () => {

	const disposaBleStore = new DisposaBleStore();

	teardown(() => disposaBleStore.clear());

	test('test first time sync ever', async () => {
		// Setup the client
		const target = new UserDataSyncTestServer();
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncService);

		// Sync for first time
		await (await testOBject.createSyncTask()).run();

		assert.deepEqual(target.requests, [
			// Manifest
			{ type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
			// Settings
			{ type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
			{ type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '0' } },
			// KeyBindings
			{ type: 'GET', url: `${target.url}/v1/resource/keyBindings/latest`, headers: {} },
			{ type: 'POST', url: `${target.url}/v1/resource/keyBindings`, headers: { 'If-Match': '0' } },
			// Snippets
			{ type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
			{ type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '0' } },
			// GloBal state
			{ type: 'GET', url: `${target.url}/v1/resource/gloBalState/latest`, headers: {} },
			{ type: 'POST', url: `${target.url}/v1/resource/gloBalState`, headers: { 'If-Match': '0' } },
			// Extensions
			{ type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
		]);

	});

	test('test first time sync ever with no data', async () => {
		// Setup the client
		const target = new UserDataSyncTestServer();
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp(true);
		const testOBject = client.instantiationService.get(IUserDataSyncService);

		// Sync for first time
		await (await testOBject.createSyncTask()).run();

		assert.deepEqual(target.requests, [
			// Manifest
			{ type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
			// Settings
			{ type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
			// KeyBindings
			{ type: 'GET', url: `${target.url}/v1/resource/keyBindings/latest`, headers: {} },
			// Snippets
			{ type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
			// GloBal state
			{ type: 'GET', url: `${target.url}/v1/resource/gloBalState/latest`, headers: {} },
			// Extensions
			{ type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
		]);

	});

	test('test first time sync from the client with no changes - merge', async () => {
		const target = new UserDataSyncTestServer();

		// Setup and sync from the first client
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		await (await client.instantiationService.get(IUserDataSyncService).createSyncTask()).run();

		// Setup the test client
		const testClient = disposaBleStore.add(new UserDataSyncClient(target));
		await testClient.setUp();
		const testOBject = testClient.instantiationService.get(IUserDataSyncService);

		// Sync (merge) from the test client
		target.reset();
		await (await testOBject.createSyncTask()).run();

		assert.deepEqual(target.requests, [
			{ type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
			{ type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
			{ type: 'GET', url: `${target.url}/v1/resource/keyBindings/latest`, headers: {} },
			{ type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
			{ type: 'GET', url: `${target.url}/v1/resource/gloBalState/latest`, headers: {} },
			{ type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
		]);

	});

	test('test first time sync from the client with changes - merge', async () => {
		const target = new UserDataSyncTestServer();

		// Setup and sync from the first client
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		await (await client.instantiationService.get(IUserDataSyncService).createSyncTask()).run();

		// Setup the test client with changes
		const testClient = disposaBleStore.add(new UserDataSyncClient(target));
		await testClient.setUp();
		const fileService = testClient.instantiationService.get(IFileService);
		const environmentService = testClient.instantiationService.get(IEnvironmentService);
		await fileService.writeFile(environmentService.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
		await fileService.writeFile(environmentService.keyBindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'aBcd', 'key': 'cmd+c' }])));
		await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
		await fileService.writeFile(joinPath(environmentService.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
		const testOBject = testClient.instantiationService.get(IUserDataSyncService);

		// Sync (merge) from the test client
		target.reset();
		await (await testOBject.createSyncTask()).run();

		assert.deepEqual(target.requests, [
			{ type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
			{ type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
			{ type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
			{ type: 'GET', url: `${target.url}/v1/resource/keyBindings/latest`, headers: {} },
			{ type: 'POST', url: `${target.url}/v1/resource/keyBindings`, headers: { 'If-Match': '1' } },
			{ type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
			{ type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
			{ type: 'GET', url: `${target.url}/v1/resource/gloBalState/latest`, headers: {} },
			{ type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
		]);

	});

	test('test sync when there are no changes', async () => {
		const target = new UserDataSyncTestServer();

		// Setup and sync from the client
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncService);
		await (await testOBject.createSyncTask()).run();

		// sync from the client again
		target.reset();
		await (await testOBject.createSyncTask()).run();

		assert.deepEqual(target.requests, [
			// Manifest
			{ type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
		]);
	});

	test('test sync when there are local changes', async () => {
		const target = new UserDataSyncTestServer();

		// Setup and sync from the client
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncService);
		await (await testOBject.createSyncTask()).run();
		target.reset();

		// Do changes in the client
		const fileService = client.instantiationService.get(IFileService);
		const environmentService = client.instantiationService.get(IEnvironmentService);
		await fileService.writeFile(environmentService.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
		await fileService.writeFile(environmentService.keyBindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'aBcd', 'key': 'cmd+c' }])));
		await fileService.writeFile(joinPath(environmentService.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
		await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));

		// Sync from the client
		await (await testOBject.createSyncTask()).run();

		assert.deepEqual(target.requests, [
			// Manifest
			{ type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
			// Settings
			{ type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
			// KeyBindings
			{ type: 'POST', url: `${target.url}/v1/resource/keyBindings`, headers: { 'If-Match': '1' } },
			// Snippets
			{ type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
			// GloBal state
			{ type: 'POST', url: `${target.url}/v1/resource/gloBalState`, headers: { 'If-Match': '1' } },
		]);
	});

	test('test sync when there are remote changes', async () => {
		const target = new UserDataSyncTestServer();

		// Sync from first client
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		await (await client.instantiationService.get(IUserDataSyncService).createSyncTask()).run();

		// Sync from test client
		const testClient = disposaBleStore.add(new UserDataSyncClient(target));
		await testClient.setUp();
		const testOBject = testClient.instantiationService.get(IUserDataSyncService);
		await (await testOBject.createSyncTask()).run();

		// Do changes in first client and sync
		const fileService = client.instantiationService.get(IFileService);
		const environmentService = client.instantiationService.get(IEnvironmentService);
		await fileService.writeFile(environmentService.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
		await fileService.writeFile(environmentService.keyBindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'aBcd', 'key': 'cmd+c' }])));
		await fileService.writeFile(joinPath(environmentService.snippetsHome, 'html.json'), VSBuffer.fromString(`{ "a": "changed" }`));
		await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
		await (await client.instantiationService.get(IUserDataSyncService).createSyncTask()).run();

		// Sync from test client
		target.reset();
		await (await testOBject.createSyncTask()).run();

		assert.deepEqual(target.requests, [
			// Manifest
			{ type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
			// Settings
			{ type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: { 'If-None-Match': '1' } },
			// KeyBindings
			{ type: 'GET', url: `${target.url}/v1/resource/keyBindings/latest`, headers: { 'If-None-Match': '1' } },
			// Snippets
			{ type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: { 'If-None-Match': '1' } },
			// GloBal state
			{ type: 'GET', url: `${target.url}/v1/resource/gloBalState/latest`, headers: { 'If-None-Match': '1' } },
		]);

	});

	test('test delete', async () => {
		const target = new UserDataSyncTestServer();

		// Sync from the client
		const testClient = disposaBleStore.add(new UserDataSyncClient(target));
		await testClient.setUp();
		const testOBject = testClient.instantiationService.get(IUserDataSyncService);
		await (await testOBject.createSyncTask()).run();

		// Reset from the client
		target.reset();
		await testOBject.reset();

		assert.deepEqual(target.requests, [
			// Manifest
			{ type: 'DELETE', url: `${target.url}/v1/resource`, headers: {} },
		]);

	});

	test('test delete and sync', async () => {
		const target = new UserDataSyncTestServer();

		// Sync from the client
		const testClient = disposaBleStore.add(new UserDataSyncClient(target));
		await testClient.setUp();
		const testOBject = testClient.instantiationService.get(IUserDataSyncService);
		await (await testOBject.createSyncTask()).run();

		// Reset from the client
		await testOBject.reset();

		// Sync again
		target.reset();
		await (await testOBject.createSyncTask()).run();

		assert.deepEqual(target.requests, [
			// Manifest
			{ type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
			// Settings
			{ type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
			{ type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '0' } },
			// KeyBindings
			{ type: 'GET', url: `${target.url}/v1/resource/keyBindings/latest`, headers: {} },
			{ type: 'POST', url: `${target.url}/v1/resource/keyBindings`, headers: { 'If-Match': '0' } },
			// Snippets
			{ type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
			{ type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '0' } },
			// GloBal state
			{ type: 'GET', url: `${target.url}/v1/resource/gloBalState/latest`, headers: {} },
			{ type: 'POST', url: `${target.url}/v1/resource/gloBalState`, headers: { 'If-Match': '0' } },
			// Extensions
			{ type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
		]);

	});

	test('test sync status', async () => {
		const target = new UserDataSyncTestServer();

		// Setup the client
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncService);

		// sync from the client
		const actualStatuses: SyncStatus[] = [];
		const disposaBle = testOBject.onDidChangeStatus(status => actualStatuses.push(status));
		await (await testOBject.createSyncTask()).run();

		disposaBle.dispose();
		assert.deepEqual(actualStatuses, [SyncStatus.Syncing, SyncStatus.Idle, SyncStatus.Syncing, SyncStatus.Idle, SyncStatus.Syncing, SyncStatus.Idle, SyncStatus.Syncing, SyncStatus.Idle, SyncStatus.Syncing, SyncStatus.Idle]);
	});

	test('test sync conflicts status', async () => {
		const target = new UserDataSyncTestServer();

		// Setup and sync from the first client
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		let fileService = client.instantiationService.get(IFileService);
		let environmentService = client.instantiationService.get(IEnvironmentService);
		await fileService.writeFile(environmentService.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
		await (await client.instantiationService.get(IUserDataSyncService).createSyncTask()).run();

		// Setup the test client
		const testClient = disposaBleStore.add(new UserDataSyncClient(target));
		await testClient.setUp();
		fileService = testClient.instantiationService.get(IFileService);
		environmentService = testClient.instantiationService.get(IEnvironmentService);
		await fileService.writeFile(environmentService.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 16 })));
		const testOBject = testClient.instantiationService.get(IUserDataSyncService);

		// sync from the client
		await (await testOBject.createSyncTask()).run();

		assert.deepEqual(testOBject.status, SyncStatus.HasConflicts);
		assert.deepEqual(testOBject.conflicts.map(([syncResource]) => syncResource), [SyncResource.Settings]);
	});

	test('test sync will sync other non conflicted areas', async () => {
		const target = new UserDataSyncTestServer();

		// Setup and sync from the first client
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		let fileService = client.instantiationService.get(IFileService);
		let environmentService = client.instantiationService.get(IEnvironmentService);
		await fileService.writeFile(environmentService.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
		await (await client.instantiationService.get(IUserDataSyncService).createSyncTask()).run();

		// Setup the test client and get conflicts in settings
		const testClient = disposaBleStore.add(new UserDataSyncClient(target));
		await testClient.setUp();
		let testFileService = testClient.instantiationService.get(IFileService);
		let testEnvironmentService = testClient.instantiationService.get(IEnvironmentService);
		await testFileService.writeFile(testEnvironmentService.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 16 })));
		const testOBject = testClient.instantiationService.get(IUserDataSyncService);
		await (await testOBject.createSyncTask()).run();

		// sync from the first client with changes in keyBindings
		await fileService.writeFile(environmentService.keyBindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'aBcd', 'key': 'cmd+c' }])));
		await (await client.instantiationService.get(IUserDataSyncService).createSyncTask()).run();

		// sync from the test client
		target.reset();
		const actualStatuses: SyncStatus[] = [];
		const disposaBle = testOBject.onDidChangeStatus(status => actualStatuses.push(status));
		await (await testOBject.createSyncTask()).run();

		disposaBle.dispose();
		assert.deepEqual(actualStatuses, []);
		assert.deepEqual(testOBject.status, SyncStatus.HasConflicts);

		assert.deepEqual(target.requests, [
			// Manifest
			{ type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
			// KeyBindings
			{ type: 'GET', url: `${target.url}/v1/resource/keyBindings/latest`, headers: { 'If-None-Match': '1' } },
		]);
	});

	test('test stop sync reset status', async () => {
		const target = new UserDataSyncTestServer();

		// Setup and sync from the first client
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		let fileService = client.instantiationService.get(IFileService);
		let environmentService = client.instantiationService.get(IEnvironmentService);
		await fileService.writeFile(environmentService.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
		await (await client.instantiationService.get(IUserDataSyncService).createSyncTask()).run();

		// Setup the test client
		const testClient = disposaBleStore.add(new UserDataSyncClient(target));
		await testClient.setUp();
		fileService = testClient.instantiationService.get(IFileService);
		environmentService = testClient.instantiationService.get(IEnvironmentService);
		await fileService.writeFile(environmentService.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 16 })));
		const testOBject = testClient.instantiationService.get(IUserDataSyncService);


		const syncTask = (await testOBject.createSyncTask());
		syncTask.run();
		await syncTask.stop();

		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.deepEqual(testOBject.conflicts, []);
	});

	test('test sync send execution id header', async () => {
		// Setup the client
		const target = new UserDataSyncTestServer();
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncService);

		await (await testOBject.createSyncTask()).run();

		for (const request of target.requestsWithAllHeaders) {
			const hasExecutionIdHeader = request.headers && request.headers['X-Execution-Id'] && request.headers['X-Execution-Id'].length > 0;
			assert.ok(hasExecutionIdHeader, `Should have execution header: ${request.url}`);
		}

	});

	test('test can run sync taks only once', async () => {
		// Setup the client
		const target = new UserDataSyncTestServer();
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncService);

		const syncTask = await testOBject.createSyncTask();
		await syncTask.run();

		try {
			await syncTask.run();
			assert.fail('Should fail running the task again');
		} catch (error) {
			/* expected */
		}
	});

});
