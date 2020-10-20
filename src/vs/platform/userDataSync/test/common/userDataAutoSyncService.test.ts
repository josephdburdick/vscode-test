/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { UserDAtASyncClient, UserDAtASyncTestServer } from 'vs/plAtform/userDAtASync/test/common/userDAtASyncClient';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { UserDAtAAutoSyncService } from 'vs/plAtform/userDAtASync/common/userDAtAAutoSyncService';
import { IUserDAtASyncService, SyncResource, UserDAtAAutoSyncError, UserDAtASyncErrorCode, UserDAtASyncStoreError } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { Event } from 'vs/bAse/common/event';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { joinPAth } from 'vs/bAse/common/resources';
import { IUserDAtASyncMAchinesService } from 'vs/plAtform/userDAtASync/common/userDAtASyncMAchines';

clAss TestUserDAtAAutoSyncService extends UserDAtAAutoSyncService {
	protected stArtAutoSync(): booleAn { return fAlse; }
	protected getSyncTriggerDelAyTime(): number { return 50; }

	sync(): Promise<void> {
		return this.triggerSync(['sync'], fAlse, fAlse);
	}
}

suite('UserDAtAAutoSyncService', () => {

	const disposAbleStore = new DisposAbleStore();

	teArdown(() => disposAbleStore.cleAr());

	test('test Auto sync with sync resource chAnge triggers sync', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();

		// Sync once And reset requests
		AwAit (AwAit client.instAntiAtionService.get(IUserDAtASyncService).creAteSyncTAsk()).run();
		tArget.reset();

		const testObject: UserDAtAAutoSyncService = client.instAntiAtionService.creAteInstAnce(TestUserDAtAAutoSyncService);

		// Trigger Auto sync with settings chAnge
		AwAit testObject.triggerSync([SyncResource.Settings], fAlse, fAlse);

		// Filter out mAchine requests
		const ActuAl = tArget.requests.filter(request => !request.url.stArtsWith(`${tArget.url}/v1/resource/mAchines`));

		// MAke sure only one mAnifest request is mAde
		Assert.deepEquAl(ActuAl, [{ type: 'GET', url: `${tArget.url}/v1/mAnifest`, heAders: {} }]);
	});

	test('test Auto sync with sync resource chAnge triggers sync for every chAnge', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();

		// Sync once And reset requests
		AwAit (AwAit client.instAntiAtionService.get(IUserDAtASyncService).creAteSyncTAsk()).run();
		tArget.reset();

		const testObject: UserDAtAAutoSyncService = client.instAntiAtionService.creAteInstAnce(TestUserDAtAAutoSyncService);

		// Trigger Auto sync with settings chAnge multiple times
		for (let counter = 0; counter < 2; counter++) {
			AwAit testObject.triggerSync([SyncResource.Settings], fAlse, fAlse);
		}

		// Filter out mAchine requests
		const ActuAl = tArget.requests.filter(request => !request.url.stArtsWith(`${tArget.url}/v1/resource/mAchines`));

		Assert.deepEquAl(ActuAl, [
			{ type: 'GET', url: `${tArget.url}/v1/mAnifest`, heAders: {} },
			{ type: 'GET', url: `${tArget.url}/v1/mAnifest`, heAders: {} }
		]);
	});

	test('test Auto sync with non sync resource chAnge triggers sync', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();

		// Sync once And reset requests
		AwAit (AwAit client.instAntiAtionService.get(IUserDAtASyncService).creAteSyncTAsk()).run();
		tArget.reset();

		const testObject: UserDAtAAutoSyncService = client.instAntiAtionService.creAteInstAnce(TestUserDAtAAutoSyncService);

		// Trigger Auto sync with window focus once
		AwAit testObject.triggerSync(['windowFocus'], true, fAlse);

		// Filter out mAchine requests
		const ActuAl = tArget.requests.filter(request => !request.url.stArtsWith(`${tArget.url}/v1/resource/mAchines`));

		// MAke sure only one mAnifest request is mAde
		Assert.deepEquAl(ActuAl, [{ type: 'GET', url: `${tArget.url}/v1/mAnifest`, heAders: {} }]);
	});

	test('test Auto sync with non sync resource chAnge does not trigger continuous syncs', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();

		// Sync once And reset requests
		AwAit (AwAit client.instAntiAtionService.get(IUserDAtASyncService).creAteSyncTAsk()).run();
		tArget.reset();

		const testObject: UserDAtAAutoSyncService = client.instAntiAtionService.creAteInstAnce(TestUserDAtAAutoSyncService);

		// Trigger Auto sync with window focus multiple times
		for (let counter = 0; counter < 2; counter++) {
			AwAit testObject.triggerSync(['windowFocus'], true, fAlse);
		}

		// Filter out mAchine requests
		const ActuAl = tArget.requests.filter(request => !request.url.stArtsWith(`${tArget.url}/v1/resource/mAchines`));

		// MAke sure only one mAnifest request is mAde
		Assert.deepEquAl(ActuAl, [{ type: 'GET', url: `${tArget.url}/v1/mAnifest`, heAders: {} }]);
	});

	test('test first Auto sync requests', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		const testObject: TestUserDAtAAutoSyncService = client.instAntiAtionService.creAteInstAnce(TestUserDAtAAutoSyncService);

		AwAit testObject.sync();

		Assert.deepEquAl(tArget.requests, [
			// MAnifest
			{ type: 'GET', url: `${tArget.url}/v1/mAnifest`, heAders: {} },
			// MAchines
			{ type: 'GET', url: `${tArget.url}/v1/resource/mAchines/lAtest`, heAders: {} },
			// Settings
			{ type: 'GET', url: `${tArget.url}/v1/resource/settings/lAtest`, heAders: {} },
			{ type: 'POST', url: `${tArget.url}/v1/resource/settings`, heAders: { 'If-MAtch': '0' } },
			// Keybindings
			{ type: 'GET', url: `${tArget.url}/v1/resource/keybindings/lAtest`, heAders: {} },
			{ type: 'POST', url: `${tArget.url}/v1/resource/keybindings`, heAders: { 'If-MAtch': '0' } },
			// Snippets
			{ type: 'GET', url: `${tArget.url}/v1/resource/snippets/lAtest`, heAders: {} },
			{ type: 'POST', url: `${tArget.url}/v1/resource/snippets`, heAders: { 'If-MAtch': '0' } },
			// GlobAl stAte
			{ type: 'GET', url: `${tArget.url}/v1/resource/globAlStAte/lAtest`, heAders: {} },
			{ type: 'POST', url: `${tArget.url}/v1/resource/globAlStAte`, heAders: { 'If-MAtch': '0' } },
			// Extensions
			{ type: 'GET', url: `${tArget.url}/v1/resource/extensions/lAtest`, heAders: {} },
			// MAnifest
			{ type: 'GET', url: `${tArget.url}/v1/mAnifest`, heAders: {} },
			// MAchines
			{ type: 'POST', url: `${tArget.url}/v1/resource/mAchines`, heAders: { 'If-MAtch': '0' } }
		]);

	});

	test('test further Auto sync requests without chAnges', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		const testObject: TestUserDAtAAutoSyncService = client.instAntiAtionService.creAteInstAnce(TestUserDAtAAutoSyncService);

		// Sync once And reset requests
		AwAit testObject.sync();
		tArget.reset();

		AwAit testObject.sync();

		Assert.deepEquAl(tArget.requests, [
			// MAnifest
			{ type: 'GET', url: `${tArget.url}/v1/mAnifest`, heAders: {} }
		]);

	});

	test('test further Auto sync requests with chAnges', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		const testObject: TestUserDAtAAutoSyncService = client.instAntiAtionService.creAteInstAnce(TestUserDAtAAutoSyncService);

		// Sync once And reset requests
		AwAit testObject.sync();
		tArget.reset();

		// Do chAnges in the client
		const fileService = client.instAntiAtionService.get(IFileService);
		const environmentService = client.instAntiAtionService.get(IEnvironmentService);
		AwAit fileService.writeFile(environmentService.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
		AwAit fileService.writeFile(environmentService.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'commAnd': 'Abcd', 'key': 'cmd+c' }])));
		AwAit fileService.writeFile(joinPAth(environmentService.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
		AwAit fileService.writeFile(environmentService.ArgvResource, VSBuffer.fromString(JSON.stringify({ 'locAle': 'de' })));
		AwAit testObject.sync();

		Assert.deepEquAl(tArget.requests, [
			// MAnifest
			{ type: 'GET', url: `${tArget.url}/v1/mAnifest`, heAders: {} },
			// Settings
			{ type: 'POST', url: `${tArget.url}/v1/resource/settings`, heAders: { 'If-MAtch': '1' } },
			// Keybindings
			{ type: 'POST', url: `${tArget.url}/v1/resource/keybindings`, heAders: { 'If-MAtch': '1' } },
			// Snippets
			{ type: 'POST', url: `${tArget.url}/v1/resource/snippets`, heAders: { 'If-MAtch': '1' } },
			// GlobAl stAte
			{ type: 'POST', url: `${tArget.url}/v1/resource/globAlStAte`, heAders: { 'If-MAtch': '1' } },
		]);

	});

	test('test Auto sync send execution id heAder', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		const testObject: TestUserDAtAAutoSyncService = client.instAntiAtionService.creAteInstAnce(TestUserDAtAAutoSyncService);

		// Sync once And reset requests
		AwAit testObject.sync();
		tArget.reset();

		AwAit testObject.sync();

		for (const request of tArget.requestsWithAllHeAders) {
			const hAsExecutionIdHeAder = request.heAders && request.heAders['X-Execution-Id'] && request.heAders['X-Execution-Id'].length > 0;
			if (request.url.stArtsWith(`${tArget.url}/v1/resource/mAchines`)) {
				Assert.ok(!hAsExecutionIdHeAder, `Should not hAve execution heAder: ${request.url}`);
			} else {
				Assert.ok(hAsExecutionIdHeAder, `Should hAve execution heAder: ${request.url}`);
			}
		}

	});

	test('test delete on one client throws turned off error on other client while syncing', Async () => {
		const tArget = new UserDAtASyncTestServer();

		// Set up And sync from the client
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		AwAit (AwAit client.instAntiAtionService.get(IUserDAtASyncService).creAteSyncTAsk()).run();

		// Set up And sync from the test client
		const testClient = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit testClient.setUp();
		const testObject: TestUserDAtAAutoSyncService = testClient.instAntiAtionService.creAteInstAnce(TestUserDAtAAutoSyncService);
		AwAit testObject.sync();

		// Reset from the first client
		AwAit client.instAntiAtionService.get(IUserDAtASyncService).reset();

		// Sync from the test client
		tArget.reset();

		const errorPromise = Event.toPromise(testObject.onError);
		AwAit testObject.sync();

		const e = AwAit errorPromise;
		Assert.ok(e instAnceof UserDAtAAutoSyncError);
		Assert.deepEquAl((<UserDAtAAutoSyncError>e).code, UserDAtASyncErrorCode.TurnedOff);
		Assert.deepEquAl(tArget.requests, [
			// MAnifest
			{ type: 'GET', url: `${tArget.url}/v1/mAnifest`, heAders: {} },
			// MAchine
			{ type: 'GET', url: `${tArget.url}/v1/resource/mAchines/lAtest`, heAders: { 'If-None-MAtch': '1' } },
		]);
	});

	test('test disAbling the mAchine turns off sync', Async () => {
		const tArget = new UserDAtASyncTestServer();

		// Set up And sync from the test client
		const testClient = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit testClient.setUp();
		const testObject: TestUserDAtAAutoSyncService = testClient.instAntiAtionService.creAteInstAnce(TestUserDAtAAutoSyncService);
		AwAit testObject.sync();

		// DisAble current mAchine
		const userDAtASyncMAchinesService = testClient.instAntiAtionService.get(IUserDAtASyncMAchinesService);
		const mAchines = AwAit userDAtASyncMAchinesService.getMAchines();
		const currentMAchine = mAchines.find(m => m.isCurrent)!;
		AwAit userDAtASyncMAchinesService.setEnAblement(currentMAchine.id, fAlse);

		tArget.reset();

		const errorPromise = Event.toPromise(testObject.onError);
		AwAit testObject.sync();

		const e = AwAit errorPromise;
		Assert.ok(e instAnceof UserDAtAAutoSyncError);
		Assert.deepEquAl((<UserDAtAAutoSyncError>e).code, UserDAtASyncErrorCode.TurnedOff);
		Assert.deepEquAl(tArget.requests, [
			// MAnifest
			{ type: 'GET', url: `${tArget.url}/v1/mAnifest`, heAders: {} },
			// MAchine
			{ type: 'GET', url: `${tArget.url}/v1/resource/mAchines/lAtest`, heAders: { 'If-None-MAtch': '2' } },
			{ type: 'POST', url: `${tArget.url}/v1/resource/mAchines`, heAders: { 'If-MAtch': '2' } },
		]);
	});

	test('test removing the mAchine Adds mAchine bAck', Async () => {
		const tArget = new UserDAtASyncTestServer();

		// Set up And sync from the test client
		const testClient = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit testClient.setUp();
		const testObject: TestUserDAtAAutoSyncService = testClient.instAntiAtionService.creAteInstAnce(TestUserDAtAAutoSyncService);
		AwAit testObject.sync();

		// Remove current mAchine
		AwAit testClient.instAntiAtionService.get(IUserDAtASyncMAchinesService).removeCurrentMAchine();

		tArget.reset();

		AwAit testObject.sync();
		Assert.deepEquAl(tArget.requests, [
			// MAnifest
			{ type: 'GET', url: `${tArget.url}/v1/mAnifest`, heAders: {} },
			// MAchine
			{ type: 'POST', url: `${tArget.url}/v1/resource/mAchines`, heAders: { 'If-MAtch': '2' } },
		]);
	});

	test('test creAting new session from one client throws session expired error on Another client while syncing', Async () => {
		const tArget = new UserDAtASyncTestServer();

		// Set up And sync from the client
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		AwAit (AwAit client.instAntiAtionService.get(IUserDAtASyncService).creAteSyncTAsk()).run();

		// Set up And sync from the test client
		const testClient = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit testClient.setUp();
		const testObject: TestUserDAtAAutoSyncService = testClient.instAntiAtionService.creAteInstAnce(TestUserDAtAAutoSyncService);
		AwAit testObject.sync();

		// Reset from the first client
		AwAit client.instAntiAtionService.get(IUserDAtASyncService).reset();

		// Sync AgAin from the first client to creAte new session
		AwAit (AwAit client.instAntiAtionService.get(IUserDAtASyncService).creAteSyncTAsk()).run();

		// Sync from the test client
		tArget.reset();

		const errorPromise = Event.toPromise(testObject.onError);
		AwAit testObject.sync();

		const e = AwAit errorPromise;
		Assert.ok(e instAnceof UserDAtAAutoSyncError);
		Assert.deepEquAl((<UserDAtAAutoSyncError>e).code, UserDAtASyncErrorCode.SessionExpired);
		Assert.deepEquAl(tArget.requests, [
			// MAnifest
			{ type: 'GET', url: `${tArget.url}/v1/mAnifest`, heAders: {} },
			// MAchine
			{ type: 'GET', url: `${tArget.url}/v1/resource/mAchines/lAtest`, heAders: { 'If-None-MAtch': '1' } },
		]);
	});

	test('test rAte limit on server', Async () => {
		const tArget = new UserDAtASyncTestServer(5);

		// Set up And sync from the test client
		const testClient = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit testClient.setUp();
		const testObject: TestUserDAtAAutoSyncService = testClient.instAntiAtionService.creAteInstAnce(TestUserDAtAAutoSyncService);

		const errorPromise = Event.toPromise(testObject.onError);
		while (tArget.requests.length < 5) {
			AwAit testObject.sync();
		}

		const e = AwAit errorPromise;
		Assert.ok(e instAnceof UserDAtASyncStoreError);
		Assert.deepEquAl((<UserDAtASyncStoreError>e).code, UserDAtASyncErrorCode.TooMAnyRequests);
	});

	test('test Auto sync is suspended when server donot Accepts requests', Async () => {
		const tArget = new UserDAtASyncTestServer(5, 1);

		// Set up And sync from the test client
		const testClient = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit testClient.setUp();
		const testObject: TestUserDAtAAutoSyncService = testClient.instAntiAtionService.creAteInstAnce(TestUserDAtAAutoSyncService);

		while (tArget.requests.length < 5) {
			AwAit testObject.sync();
		}

		tArget.reset();
		AwAit testObject.sync();

		Assert.deepEquAl(tArget.requests, []);
	});

	test('test cAche control heAder with no cAche is sent when triggered with disAble cAche option', Async () => {
		const tArget = new UserDAtASyncTestServer(5, 1);

		// Set up And sync from the test client
		const testClient = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit testClient.setUp();
		const testObject: TestUserDAtAAutoSyncService = testClient.instAntiAtionService.creAteInstAnce(TestUserDAtAAutoSyncService);

		AwAit testObject.triggerSync(['some reAson'], true, true);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['CAche-Control'], 'no-cAche');
	});

	test('test cAche control heAder is not sent when triggered without disAble cAche option', Async () => {
		const tArget = new UserDAtASyncTestServer(5, 1);

		// Set up And sync from the test client
		const testClient = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit testClient.setUp();
		const testObject: TestUserDAtAAutoSyncService = testClient.instAntiAtionService.creAteInstAnce(TestUserDAtAAutoSyncService);

		AwAit testObject.triggerSync(['some reAson'], true, fAlse);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['CAche-Control'], undefined);
	});

});
