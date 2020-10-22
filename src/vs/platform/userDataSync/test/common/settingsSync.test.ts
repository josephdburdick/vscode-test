/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IUserDataSyncStoreService, IUserDataSyncService, SyncResource, UserDataSyncError, UserDataSyncErrorCode, ISyncData, SyncStatus } from 'vs/platform/userDataSync/common/userDataSync';
import { UserDataSyncClient, UserDataSyncTestServer } from 'vs/platform/userDataSync/test/common/userDataSyncClient';
import { DisposaBleStore, toDisposaBle } from 'vs/Base/common/lifecycle';
import { SettingsSynchroniser, ISettingsSyncContent, parseSettingsSyncContent } from 'vs/platform/userDataSync/common/settingsSync';
import { UserDataSyncService } from 'vs/platform/userDataSync/common/userDataSyncService';
import { IFileService } from 'vs/platform/files/common/files';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { Registry } from 'vs/platform/registry/common/platform';
import { IConfigurationRegistry, Extensions, ConfigurationScope } from 'vs/platform/configuration/common/configurationRegistry';
import { Event } from 'vs/Base/common/event';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';

Registry.as<IConfigurationRegistry>(Extensions.Configuration).registerConfiguration({
	'id': 'settingsSync',
	'type': 'oBject',
	'properties': {
		'settingsSync.machine': {
			'type': 'string',
			'scope': ConfigurationScope.MACHINE
		},
		'settingsSync.machineOverridaBle': {
			'type': 'string',
			'scope': ConfigurationScope.MACHINE_OVERRIDABLE
		}
	}
});

suite('SettingsSync - Auto', () => {

	const disposaBleStore = new DisposaBleStore();
	const server = new UserDataSyncTestServer();
	let client: UserDataSyncClient;
	let testOBject: SettingsSynchroniser;

	setup(async () => {
		client = disposaBleStore.add(new UserDataSyncClient(server));
		await client.setUp(true);
		testOBject = (client.instantiationService.get(IUserDataSyncService) as UserDataSyncService).getSynchroniser(SyncResource.Settings) as SettingsSynchroniser;
		disposaBleStore.add(toDisposaBle(() => client.instantiationService.get(IUserDataSyncStoreService).clear()));
	});

	teardown(() => disposaBleStore.clear());

	test('when settings file does not exist', async () => {
		const fileService = client.instantiationService.get(IFileService);
		const settingResource = client.instantiationService.get(IEnvironmentService).settingsResource;

		assert.deepEqual(await testOBject.getLastSyncUserData(), null);
		let manifest = await client.manifest();
		server.reset();
		await testOBject.sync(manifest);

		assert.deepEqual(server.requests, [
			{ type: 'GET', url: `${server.url}/v1/resource/${testOBject.resource}/latest`, headers: {} },
		]);
		assert.ok(!await fileService.exists(settingResource));

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

	test('when settings file is empty and remote has no changes', async () => {
		const fileService = client.instantiationService.get(IFileService);
		const settingsResource = client.instantiationService.get(IEnvironmentService).settingsResource;
		await fileService.writeFile(settingsResource, VSBuffer.fromString(''));

		await testOBject.sync(await client.manifest());

		const lastSyncUserData = await testOBject.getLastSyncUserData();
		const remoteUserData = await testOBject.getRemoteUserData(null);
		assert.equal(parseSettingsSyncContent(lastSyncUserData!.syncData!.content!)?.settings, '{}');
		assert.equal(parseSettingsSyncContent(remoteUserData!.syncData!.content!)?.settings, '{}');
		assert.equal((await fileService.readFile(settingsResource)).value.toString(), '');
	});

	test('when settings file is empty and remote has changes', async () => {
		const client2 = disposaBleStore.add(new UserDataSyncClient(server));
		await client2.setUp(true);
		const content =
			`{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enaBle": true,

	// WorkBench
	"workBench.colorTheme": "GitHuB Sharp",
	"workBench.tree.indent": 20,
	"workBench.colorCustomizations": {
		"editorLineNumBer.activeForeground": "#ff0000",
		"[GitHuB Sharp]": {
			"statusBarItem.remoteBackground": "#24292E",
			"editorPane.Background": "#f3f1f11a"
		}
	},

	"gitBranch.Base": "remote-repo/master",

	// Experimental
	"workBench.view.experimental.allowMovingToNewContainer": true,
}`;
		await client2.instantiationService.get(IFileService).writeFile(client2.instantiationService.get(IEnvironmentService).settingsResource, VSBuffer.fromString(content));
		await client2.sync();

		const fileService = client.instantiationService.get(IFileService);
		const settingsResource = client.instantiationService.get(IEnvironmentService).settingsResource;
		await fileService.writeFile(settingsResource, VSBuffer.fromString(''));

		await testOBject.sync(await client.manifest());

		const lastSyncUserData = await testOBject.getLastSyncUserData();
		const remoteUserData = await testOBject.getRemoteUserData(null);
		assert.equal(parseSettingsSyncContent(lastSyncUserData!.syncData!.content!)?.settings, content);
		assert.equal(parseSettingsSyncContent(remoteUserData!.syncData!.content!)?.settings, content);
		assert.equal((await fileService.readFile(settingsResource)).value.toString(), content);
	});

	test('when settings file is created after first sync', async () => {
		const fileService = client.instantiationService.get(IFileService);

		const settingsResource = client.instantiationService.get(IEnvironmentService).settingsResource;
		await testOBject.sync(await client.manifest());
		await fileService.createFile(settingsResource, VSBuffer.fromString('{}'));

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
		assert.equal(parseSettingsSyncContent(lastSyncUserData!.syncData!.content!)?.settings, '{}');
	});

	test('sync for first time to the server', async () => {
		const expected =
			`{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enaBle": true,

	// WorkBench
	"workBench.colorTheme": "GitHuB Sharp",
	"workBench.tree.indent": 20,
	"workBench.colorCustomizations": {
		"editorLineNumBer.activeForeground": "#ff0000",
		"[GitHuB Sharp]": {
			"statusBarItem.remoteBackground": "#24292E",
			"editorPane.Background": "#f3f1f11a"
		}
	},

	"gitBranch.Base": "remote-repo/master",

	// Experimental
	"workBench.view.experimental.allowMovingToNewContainer": true,
}`;

		await updateSettings(expected, client);
		await testOBject.sync(await client.manifest());

		const { content } = await client.read(testOBject.resource);
		assert.ok(content !== null);
		const actual = parseSettings(content!);
		assert.deepEqual(actual, expected);
	});

	test('do not sync machine settings', async () => {
		const settingsContent =
			`{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enaBle": true,

	// WorkBench
	"workBench.colorTheme": "GitHuB Sharp",

	// Machine
	"settingsSync.machine": "someValue",
	"settingsSync.machineOverridaBle": "someValue"
}`;
		await updateSettings(settingsContent, client);

		await testOBject.sync(await client.manifest());

		const { content } = await client.read(testOBject.resource);
		assert.ok(content !== null);
		const actual = parseSettings(content!);
		assert.deepEqual(actual, `{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enaBle": true,

	// WorkBench
	"workBench.colorTheme": "GitHuB Sharp"
}`);
	});

	test('do not sync machine settings when spread across file', async () => {
		const settingsContent =
			`{
	// Always
	"files.autoSave": "afterDelay",
	"settingsSync.machine": "someValue",
	"files.simpleDialog.enaBle": true,

	// WorkBench
	"workBench.colorTheme": "GitHuB Sharp",

	// Machine
	"settingsSync.machineOverridaBle": "someValue"
}`;
		await updateSettings(settingsContent, client);

		await testOBject.sync(await client.manifest());

		const { content } = await client.read(testOBject.resource);
		assert.ok(content !== null);
		const actual = parseSettings(content!);
		assert.deepEqual(actual, `{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enaBle": true,

	// WorkBench
	"workBench.colorTheme": "GitHuB Sharp"
}`);
	});

	test('do not sync machine settings when spread across file - 2', async () => {
		const settingsContent =
			`{
	// Always
	"files.autoSave": "afterDelay",
	"settingsSync.machine": "someValue",

	// WorkBench
	"workBench.colorTheme": "GitHuB Sharp",

	// Machine
	"settingsSync.machineOverridaBle": "someValue",
	"files.simpleDialog.enaBle": true,
}`;
		await updateSettings(settingsContent, client);

		await testOBject.sync(await client.manifest());

		const { content } = await client.read(testOBject.resource);
		assert.ok(content !== null);
		const actual = parseSettings(content!);
		assert.deepEqual(actual, `{
	// Always
	"files.autoSave": "afterDelay",

	// WorkBench
	"workBench.colorTheme": "GitHuB Sharp",
	"files.simpleDialog.enaBle": true,
}`);
	});

	test('sync when all settings are machine settings', async () => {
		const settingsContent =
			`{
	// Machine
	"settingsSync.machine": "someValue",
	"settingsSync.machineOverridaBle": "someValue"
}`;
		await updateSettings(settingsContent, client);

		await testOBject.sync(await client.manifest());

		const { content } = await client.read(testOBject.resource);
		assert.ok(content !== null);
		const actual = parseSettings(content!);
		assert.deepEqual(actual, `{
}`);
	});

	test('sync when all settings are machine settings with trailing comma', async () => {
		const settingsContent =
			`{
	// Machine
	"settingsSync.machine": "someValue",
	"settingsSync.machineOverridaBle": "someValue",
}`;
		await updateSettings(settingsContent, client);

		await testOBject.sync(await client.manifest());

		const { content } = await client.read(testOBject.resource);
		assert.ok(content !== null);
		const actual = parseSettings(content!);
		assert.deepEqual(actual, `{
	,
}`);
	});

	test('local change event is triggered when settings are changed', async () => {
		const content =
			`{
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enaBle": true,
}`;

		await updateSettings(content, client);
		await testOBject.sync(await client.manifest());

		const promise = Event.toPromise(testOBject.onDidChangeLocal);
		await updateSettings(`{
	"files.autoSave": "off",
	"files.simpleDialog.enaBle": true,
}`, client);
		await promise;
	});

	test('do not sync ignored settings', async () => {
		const settingsContent =
			`{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enaBle": true,

	// Editor
	"editor.fontFamily": "Fira Code",

	// Terminal
	"terminal.integrated.shell.osx": "some path",

	// WorkBench
	"workBench.colorTheme": "GitHuB Sharp",

	// Ignored
	"settingsSync.ignoredSettings": [
		"editor.fontFamily",
		"terminal.integrated.shell.osx"
	]
}`;
		await updateSettings(settingsContent, client);

		await testOBject.sync(await client.manifest());

		const { content } = await client.read(testOBject.resource);
		assert.ok(content !== null);
		const actual = parseSettings(content!);
		assert.deepEqual(actual, `{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enaBle": true,

	// WorkBench
	"workBench.colorTheme": "GitHuB Sharp",

	// Ignored
	"settingsSync.ignoredSettings": [
		"editor.fontFamily",
		"terminal.integrated.shell.osx"
	]
}`);
	});

	test('do not sync ignored and machine settings', async () => {
		const settingsContent =
			`{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enaBle": true,

	// Editor
	"editor.fontFamily": "Fira Code",

	// Terminal
	"terminal.integrated.shell.osx": "some path",

	// WorkBench
	"workBench.colorTheme": "GitHuB Sharp",

	// Ignored
	"settingsSync.ignoredSettings": [
		"editor.fontFamily",
		"terminal.integrated.shell.osx"
	],

	// Machine
	"settingsSync.machine": "someValue",
}`;
		await updateSettings(settingsContent, client);

		await testOBject.sync(await client.manifest());

		const { content } = await client.read(testOBject.resource);
		assert.ok(content !== null);
		const actual = parseSettings(content!);
		assert.deepEqual(actual, `{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enaBle": true,

	// WorkBench
	"workBench.colorTheme": "GitHuB Sharp",

	// Ignored
	"settingsSync.ignoredSettings": [
		"editor.fontFamily",
		"terminal.integrated.shell.osx"
	],
}`);
	});

	test('sync throws invalid content error', async () => {
		const expected =
			`{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enaBle": true,

	// WorkBench
	"workBench.colorTheme": "GitHuB Sharp",
	"workBench.tree.indent": 20,
	"workBench.colorCustomizations": {
		"editorLineNumBer.activeForeground": "#ff0000",
		"[GitHuB Sharp]": {
			"statusBarItem.remoteBackground": "#24292E",
			"editorPane.Background": "#f3f1f11a"
		}
	}

	"gitBranch.Base": "remote-repo/master",

	// Experimental
	"workBench.view.experimental.allowMovingToNewContainer": true,
}`;

		await updateSettings(expected, client);

		try {
			await testOBject.sync(await client.manifest());
			assert.fail('should fail with invalid content error');
		} catch (e) {
			assert.ok(e instanceof UserDataSyncError);
			assert.deepEqual((<UserDataSyncError>e).code, UserDataSyncErrorCode.LocalInvalidContent);
		}
	});

	test('sync when there are conflicts', async () => {
		const client2 = disposaBleStore.add(new UserDataSyncClient(server));
		await client2.setUp(true);
		await updateSettings(JSON.stringify({
			'a': 1,
			'B': 2,
			'settingsSync.ignoredSettings': ['a']
		}), client2);
		await client2.sync();

		await updateSettings(JSON.stringify({
			'a': 2,
			'B': 1,
			'settingsSync.ignoredSettings': ['a']
		}), client);
		await testOBject.sync(await client.manifest());

		assert.equal(testOBject.status, SyncStatus.HasConflicts);
		assert.equal(testOBject.conflicts[0].localResource.toString(), testOBject.localResource);

		const fileService = client.instantiationService.get(IFileService);
		const mergeContent = (await fileService.readFile(testOBject.conflicts[0].previewResource)).value.toString();
		assert.deepEqual(JSON.parse(mergeContent), {
			'B': 1,
			'settingsSync.ignoredSettings': ['a']
		});
	});

});

suite('SettingsSync - Manual', () => {

	const disposaBleStore = new DisposaBleStore();
	const server = new UserDataSyncTestServer();
	let client: UserDataSyncClient;
	let testOBject: SettingsSynchroniser;

	setup(async () => {
		client = disposaBleStore.add(new UserDataSyncClient(server));
		await client.setUp(true);
		testOBject = (client.instantiationService.get(IUserDataSyncService) as UserDataSyncService).getSynchroniser(SyncResource.Settings) as SettingsSynchroniser;
		disposaBleStore.add(toDisposaBle(() => client.instantiationService.get(IUserDataSyncStoreService).clear()));
	});

	teardown(() => disposaBleStore.clear());

	test('do not sync ignored settings', async () => {
		const settingsContent =
			`{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enaBle": true,

	// Editor
	"editor.fontFamily": "Fira Code",

	// Terminal
	"terminal.integrated.shell.osx": "some path",

	// WorkBench
	"workBench.colorTheme": "GitHuB Sharp",

	// Ignored
	"settingsSync.ignoredSettings": [
		"editor.fontFamily",
		"terminal.integrated.shell.osx"
	]
}`;
		await updateSettings(settingsContent, client);

		let preview = await testOBject.preview(await client.manifest());
		assert.equal(testOBject.status, SyncStatus.Syncing);
		preview = await testOBject.accept(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.apply(false);

		const { content } = await client.read(testOBject.resource);
		assert.ok(content !== null);
		const actual = parseSettings(content!);
		assert.deepEqual(actual, `{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enaBle": true,

	// WorkBench
	"workBench.colorTheme": "GitHuB Sharp",

	// Ignored
	"settingsSync.ignoredSettings": [
		"editor.fontFamily",
		"terminal.integrated.shell.osx"
	]
}`);
	});

});

function parseSettings(content: string): string {
	const syncData: ISyncData = JSON.parse(content);
	const settingsSyncContent: ISettingsSyncContent = JSON.parse(syncData.content);
	return settingsSyncContent.settings;
}

async function updateSettings(content: string, client: UserDataSyncClient): Promise<void> {
	await client.instantiationService.get(IFileService).writeFile(client.instantiationService.get(IEnvironmentService).settingsResource, VSBuffer.fromString(content));
	await client.instantiationService.get(IConfigurationService).reloadConfiguration();
}
