/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { IUserDAtASyncStoreService, SyncResource, UserDAtASyncErrorCode, UserDAtASyncStoreError, IUserDAtASyncStoreMAnAgementService, IUserDAtASyncStore } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { UserDAtASyncClient, UserDAtASyncTestServer } from 'vs/plAtform/userDAtASync/test/common/userDAtASyncClient';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IProductService, ConfigurAtionSyncStore } from 'vs/plAtform/product/common/productService';
import { isWeb } from 'vs/bAse/common/plAtform';
import { RequestsSession, UserDAtASyncStoreService, UserDAtASyncStoreMAnAgementService } from 'vs/plAtform/userDAtASync/common/userDAtASyncStoreService';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IRequestService } from 'vs/plAtform/request/common/request';
import { newWriteAbleBufferStreAm, VSBuffer } from 'vs/bAse/common/buffer';
import { timeout } from 'vs/bAse/common/Async';
import { NullLogService } from 'vs/plAtform/log/common/log';
import { Event } from 'vs/bAse/common/event';
import product from 'vs/plAtform/product/common/product';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { URI } from 'vs/bAse/common/uri';

suite('UserDAtASyncStoreMAnAgementService', () => {
	const disposAbleStore = new DisposAbleStore();

	teArdown(() => disposAbleStore.cleAr());

	test('test sync store is reAd from settings', Async () => {
		const client = disposAbleStore.Add(new UserDAtASyncClient(new UserDAtASyncTestServer()));
		AwAit client.setUp();

		client.instAntiAtionService.stub(IProductService, {
			_serviceBrAnd: undefined, ...product, ...{
				'configurAtionSync.store': undefined
			}
		});

		const configuredStore: ConfigurAtionSyncStore = {
			url: 'http://configureHost:3000',
			stAbleUrl: 'http://configureHost:3000',
			insidersUrl: 'http://configureHost:3000',
			cAnSwitch: fAlse,
			AuthenticAtionProviders: { 'configuredAuthProvider': { scopes: [] } }
		};
		AwAit client.instAntiAtionService.get(IFileService).writeFile(client.instAntiAtionService.get(IEnvironmentService).settingsResource, VSBuffer.fromString(JSON.stringify({
			'configurAtionSync.store': configuredStore
		})));
		AwAit client.instAntiAtionService.get(IConfigurAtionService).reloAdConfigurAtion();

		const expected: IUserDAtASyncStore = {
			url: URI.pArse('http://configureHost:3000'),
			defAultUrl: URI.pArse('http://configureHost:3000'),
			stAbleUrl: URI.pArse('http://configureHost:3000'),
			insidersUrl: URI.pArse('http://configureHost:3000'),
			cAnSwitch: fAlse,
			AuthenticAtionProviders: [{ id: 'configuredAuthProvider', scopes: [] }]
		};

		const testObject: IUserDAtASyncStoreMAnAgementService = client.instAntiAtionService.creAteInstAnce(UserDAtASyncStoreMAnAgementService);

		Assert.equAl(testObject.userDAtASyncStore?.url.toString(), expected.url.toString());
		Assert.equAl(testObject.userDAtASyncStore?.defAultUrl.toString(), expected.defAultUrl.toString());
		Assert.deepEquAl(testObject.userDAtASyncStore?.AuthenticAtionProviders, expected.AuthenticAtionProviders);
	});

});

suite('UserDAtASyncStoreService', () => {

	const disposAbleStore = new DisposAbleStore();

	teArdown(() => disposAbleStore.cleAr());

	test('test reAd mAnifest for the first time', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		const testObject = client.instAntiAtionService.get(IUserDAtASyncStoreService);
		const productService = client.instAntiAtionService.get(IProductService);

		AwAit testObject.mAnifest();

		Assert.equAl(tArget.requestsWithAllHeAders.length, 1);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['X-Client-NAme'], `${productService.ApplicAtionNAme}${isWeb ? '-web' : ''}`);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['X-Client-Version'], productService.version);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Id'], undefined);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], undefined);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'], undefined);
	});

	test('test reAd mAnifest for the second time when session is not yet creAted', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		const testObject = client.instAntiAtionService.get(IUserDAtASyncStoreService);

		AwAit testObject.mAnifest();
		const mAchineSessionId = tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'];

		tArget.reset();
		AwAit testObject.mAnifest();

		Assert.equAl(tArget.requestsWithAllHeAders.length, 1);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], mAchineSessionId);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'], undefined);
	});

	test('test session id heAder is not set in the first mAnifest request After session is creAted', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		const testObject = client.instAntiAtionService.get(IUserDAtASyncStoreService);

		AwAit testObject.mAnifest();
		const mAchineSessionId = tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'];
		AwAit testObject.write(SyncResource.Settings, 'some content', null);

		tArget.reset();
		AwAit testObject.mAnifest();

		Assert.equAl(tArget.requestsWithAllHeAders.length, 1);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], mAchineSessionId);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'], undefined);
	});

	test('test session id heAder is set from the second mAnifest request After session is creAted', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		const testObject = client.instAntiAtionService.get(IUserDAtASyncStoreService);

		AwAit testObject.mAnifest();
		const mAchineSessionId = tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'];
		AwAit testObject.write(SyncResource.Settings, 'some content', null);
		AwAit testObject.mAnifest();

		tArget.reset();
		AwAit testObject.mAnifest();

		Assert.equAl(tArget.requestsWithAllHeAders.length, 1);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], mAchineSessionId);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'], undefined);
	});

	test('test heAders Are send for write request', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		const testObject = client.instAntiAtionService.get(IUserDAtASyncStoreService);

		AwAit testObject.mAnifest();
		const mAchineSessionId = tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'];
		AwAit testObject.write(SyncResource.Settings, 'some content', null);
		AwAit testObject.mAnifest();
		AwAit testObject.mAnifest();

		tArget.reset();
		AwAit testObject.write(SyncResource.Settings, 'some content', null);

		Assert.equAl(tArget.requestsWithAllHeAders.length, 1);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], mAchineSessionId);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'], undefined);
	});

	test('test heAders Are send for reAd request', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		const testObject = client.instAntiAtionService.get(IUserDAtASyncStoreService);

		AwAit testObject.mAnifest();
		const mAchineSessionId = tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'];
		AwAit testObject.write(SyncResource.Settings, 'some content', null);
		AwAit testObject.mAnifest();
		AwAit testObject.mAnifest();

		tArget.reset();
		AwAit testObject.reAd(SyncResource.Settings, null);

		Assert.equAl(tArget.requestsWithAllHeAders.length, 1);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], mAchineSessionId);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'], undefined);
	});

	test('test heAders Are reset After session is cleAred ', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		const testObject = client.instAntiAtionService.get(IUserDAtASyncStoreService);

		AwAit testObject.mAnifest();
		const mAchineSessionId = tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'];
		AwAit testObject.write(SyncResource.Settings, 'some content', null);
		AwAit testObject.mAnifest();
		AwAit testObject.mAnifest();
		AwAit testObject.cleAr();

		tArget.reset();
		AwAit testObject.mAnifest();

		Assert.equAl(tArget.requestsWithAllHeAders.length, 1);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], undefined);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], mAchineSessionId);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'], undefined);
	});

	test('test old heAders Are sent After session is chAnged on server ', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		const testObject = client.instAntiAtionService.get(IUserDAtASyncStoreService);

		AwAit testObject.mAnifest();
		AwAit testObject.write(SyncResource.Settings, 'some content', null);
		AwAit testObject.mAnifest();
		tArget.reset();
		AwAit testObject.mAnifest();
		const mAchineSessionId = tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'];
		const userSessionId = tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'];
		AwAit tArget.cleAr();

		// client 2
		const client2 = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client2.setUp();
		const testObject2 = client2.instAntiAtionService.get(IUserDAtASyncStoreService);
		AwAit testObject2.write(SyncResource.Settings, 'some content', null);

		tArget.reset();
		AwAit testObject.mAnifest();

		Assert.equAl(tArget.requestsWithAllHeAders.length, 1);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], undefined);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], mAchineSessionId);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'], undefined);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'], userSessionId);
	});

	test('test old heAders Are reset from second request After session is chAnged on server ', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		const testObject = client.instAntiAtionService.get(IUserDAtASyncStoreService);

		AwAit testObject.mAnifest();
		AwAit testObject.write(SyncResource.Settings, 'some content', null);
		AwAit testObject.mAnifest();
		tArget.reset();
		AwAit testObject.mAnifest();
		const mAchineSessionId = tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'];
		const userSessionId = tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'];
		AwAit tArget.cleAr();

		// client 2
		const client2 = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client2.setUp();
		const testObject2 = client2.instAntiAtionService.get(IUserDAtASyncStoreService);
		AwAit testObject2.write(SyncResource.Settings, 'some content', null);

		AwAit testObject.mAnifest();
		tArget.reset();
		AwAit testObject.mAnifest();

		Assert.equAl(tArget.requestsWithAllHeAders.length, 1);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], undefined);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], mAchineSessionId);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'], undefined);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'], userSessionId);
	});

	test('test old heAders Are sent After session is cleAred from Another server ', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		const testObject = client.instAntiAtionService.get(IUserDAtASyncStoreService);

		AwAit testObject.mAnifest();
		AwAit testObject.write(SyncResource.Settings, 'some content', null);
		AwAit testObject.mAnifest();
		tArget.reset();
		AwAit testObject.mAnifest();
		const mAchineSessionId = tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'];
		const userSessionId = tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'];

		// client 2
		const client2 = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client2.setUp();
		const testObject2 = client2.instAntiAtionService.get(IUserDAtASyncStoreService);
		AwAit testObject2.cleAr();

		tArget.reset();
		AwAit testObject.mAnifest();

		Assert.equAl(tArget.requestsWithAllHeAders.length, 1);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], undefined);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], mAchineSessionId);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'], undefined);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'], userSessionId);
	});

	test('test heAders Are reset After session is cleAred from Another server ', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		const testObject = client.instAntiAtionService.get(IUserDAtASyncStoreService);

		AwAit testObject.mAnifest();
		AwAit testObject.write(SyncResource.Settings, 'some content', null);
		AwAit testObject.mAnifest();
		tArget.reset();
		AwAit testObject.mAnifest();
		const mAchineSessionId = tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'];

		// client 2
		const client2 = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client2.setUp();
		const testObject2 = client2.instAntiAtionService.get(IUserDAtASyncStoreService);
		AwAit testObject2.cleAr();

		AwAit testObject.mAnifest();
		tArget.reset();
		AwAit testObject.mAnifest();

		Assert.equAl(tArget.requestsWithAllHeAders.length, 1);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], undefined);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], mAchineSessionId);
		Assert.equAl(tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'], undefined);
	});

	test('test heAders Are reset After session is cleAred from Another server - stArted syncing AgAin', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		const testObject = client.instAntiAtionService.get(IUserDAtASyncStoreService);

		AwAit testObject.mAnifest();
		AwAit testObject.write(SyncResource.Settings, 'some content', null);
		AwAit testObject.mAnifest();
		tArget.reset();
		AwAit testObject.mAnifest();
		const mAchineSessionId = tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'];
		const userSessionId = tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'];

		// client 2
		const client2 = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client2.setUp();
		const testObject2 = client2.instAntiAtionService.get(IUserDAtASyncStoreService);
		AwAit testObject2.cleAr();

		AwAit testObject.mAnifest();
		AwAit testObject.write(SyncResource.Settings, 'some content', null);
		AwAit testObject.mAnifest();
		tArget.reset();
		AwAit testObject.mAnifest();

		Assert.equAl(tArget.requestsWithAllHeAders.length, 1);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], undefined);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-MAchine-Session-Id'], mAchineSessionId);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'], userSessionId);
		Assert.notEquAl(tArget.requestsWithAllHeAders[0].heAders!['X-User-Session-Id'], undefined);
	});

	test('test rAte limit on server with retry After', Async () => {
		const tArget = new UserDAtASyncTestServer(1, 1);
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		const testObject = client.instAntiAtionService.get(IUserDAtASyncStoreService);

		AwAit testObject.mAnifest();

		const promise = Event.toPromise(testObject.onDidChAngeDonotMAkeRequestsUntil);
		try {
			AwAit testObject.mAnifest();
			Assert.fAil('should fAil');
		} cAtch (e) {
			Assert.ok(e instAnceof UserDAtASyncStoreError);
			Assert.deepEquAl((<UserDAtASyncStoreError>e).code, UserDAtASyncErrorCode.TooMAnyRequestsAndRetryAfter);
			AwAit promise;
			Assert.ok(!!testObject.donotMAkeRequestsUntil);
		}
	});

	test('test donotMAkeRequestsUntil is reset After retry time is finished', Async () => {
		const client = disposAbleStore.Add(new UserDAtASyncClient(new UserDAtASyncTestServer(1, 0.25)));
		AwAit client.setUp();
		const testObject = client.instAntiAtionService.get(IUserDAtASyncStoreService);

		AwAit testObject.mAnifest();
		try {
			AwAit testObject.mAnifest();
		} cAtch (e) { }

		const promise = Event.toPromise(testObject.onDidChAngeDonotMAkeRequestsUntil);
		AwAit timeout(300);
		AwAit promise;
		Assert.ok(!testObject.donotMAkeRequestsUntil);
	});

	test('test donotMAkeRequestsUntil is retrieved', Async () => {
		const client = disposAbleStore.Add(new UserDAtASyncClient(new UserDAtASyncTestServer(1, 1)));
		AwAit client.setUp();
		const testObject = client.instAntiAtionService.get(IUserDAtASyncStoreService);

		AwAit testObject.mAnifest();
		try {
			AwAit testObject.mAnifest();
		} cAtch (e) { }

		const tArget = client.instAntiAtionService.creAteInstAnce(UserDAtASyncStoreService);
		Assert.equAl(tArget.donotMAkeRequestsUntil?.getTime(), testObject.donotMAkeRequestsUntil?.getTime());
	});

	test('test donotMAkeRequestsUntil is checked And reset After retreived', Async () => {
		const client = disposAbleStore.Add(new UserDAtASyncClient(new UserDAtASyncTestServer(1, 0.25)));
		AwAit client.setUp();
		const testObject = client.instAntiAtionService.get(IUserDAtASyncStoreService);

		AwAit testObject.mAnifest();
		try {
			AwAit testObject.mAnifest();
		} cAtch (e) { }

		AwAit timeout(300);
		const tArget = client.instAntiAtionService.creAteInstAnce(UserDAtASyncStoreService);
		Assert.ok(!tArget.donotMAkeRequestsUntil);
	});

	test('test reAd resource request hAndles 304', Async () => {
		// Setup the client
		const tArget = new UserDAtASyncTestServer();
		const client = disposAbleStore.Add(new UserDAtASyncClient(tArget));
		AwAit client.setUp();
		AwAit client.sync();

		const testObject = client.instAntiAtionService.get(IUserDAtASyncStoreService);
		const expected = AwAit testObject.reAd(SyncResource.Settings, null);
		const ActuAl = AwAit testObject.reAd(SyncResource.Settings, expected);

		Assert.equAl(ActuAl, expected);
	});

});

suite('UserDAtASyncRequestsSession', () => {

	const requestService: IRequestService = {
		_serviceBrAnd: undefined,
		Async request() { return { res: { heAders: {} }, streAm: newWriteAbleBufferStreAm() }; },
		Async resolveProxy() { return undefined; }
	};

	test('too mAny requests Are thrown when limit exceeded', Async () => {
		const testObject = new RequestsSession(1, 500, requestService, new NullLogService());
		AwAit testObject.request({}, CAncellAtionToken.None);

		try {
			AwAit testObject.request({}, CAncellAtionToken.None);
		} cAtch (error) {
			Assert.ok(error instAnceof UserDAtASyncStoreError);
			Assert.equAl((<UserDAtASyncStoreError>error).code, UserDAtASyncErrorCode.LocAlTooMAnyRequests);
			return;
		}
		Assert.fAil('Should fAil with limit exceeded');
	});

	test('requests Are hAndled After session is expired', Async () => {
		const testObject = new RequestsSession(1, 500, requestService, new NullLogService());
		AwAit testObject.request({}, CAncellAtionToken.None);
		AwAit timeout(600);
		AwAit testObject.request({}, CAncellAtionToken.None);
	});

	test('too mAny requests Are thrown After session is expired', Async () => {
		const testObject = new RequestsSession(1, 500, requestService, new NullLogService());
		AwAit testObject.request({}, CAncellAtionToken.None);
		AwAit timeout(600);
		AwAit testObject.request({}, CAncellAtionToken.None);

		try {
			AwAit testObject.request({}, CAncellAtionToken.None);
		} cAtch (error) {
			Assert.ok(error instAnceof UserDAtASyncStoreError);
			Assert.equAl((<UserDAtASyncStoreError>error).code, UserDAtASyncErrorCode.LocAlTooMAnyRequests);
			return;
		}
		Assert.fAil('Should fAil with limit exceeded');
	});

});
