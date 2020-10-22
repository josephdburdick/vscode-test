/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IUserDataSyncStoreService, SyncResource, UserDataSyncErrorCode, UserDataSyncStoreError, IUserDataSyncStoreManagementService, IUserDataSyncStore } from 'vs/platform/userDataSync/common/userDataSync';
import { UserDataSyncClient, UserDataSyncTestServer } from 'vs/platform/userDataSync/test/common/userDataSyncClient';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IProductService, ConfigurationSyncStore } from 'vs/platform/product/common/productService';
import { isWeB } from 'vs/Base/common/platform';
import { RequestsSession, UserDataSyncStoreService, UserDataSyncStoreManagementService } from 'vs/platform/userDataSync/common/userDataSyncStoreService';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IRequestService } from 'vs/platform/request/common/request';
import { newWriteaBleBufferStream, VSBuffer } from 'vs/Base/common/Buffer';
import { timeout } from 'vs/Base/common/async';
import { NullLogService } from 'vs/platform/log/common/log';
import { Event } from 'vs/Base/common/event';
import product from 'vs/platform/product/common/product';
import { IFileService } from 'vs/platform/files/common/files';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { URI } from 'vs/Base/common/uri';

suite('UserDataSyncStoreManagementService', () => {
	const disposaBleStore = new DisposaBleStore();

	teardown(() => disposaBleStore.clear());

	test('test sync store is read from settings', async () => {
		const client = disposaBleStore.add(new UserDataSyncClient(new UserDataSyncTestServer()));
		await client.setUp();

		client.instantiationService.stuB(IProductService, {
			_serviceBrand: undefined, ...product, ...{
				'configurationSync.store': undefined
			}
		});

		const configuredStore: ConfigurationSyncStore = {
			url: 'http://configureHost:3000',
			staBleUrl: 'http://configureHost:3000',
			insidersUrl: 'http://configureHost:3000',
			canSwitch: false,
			authenticationProviders: { 'configuredAuthProvider': { scopes: [] } }
		};
		await client.instantiationService.get(IFileService).writeFile(client.instantiationService.get(IEnvironmentService).settingsResource, VSBuffer.fromString(JSON.stringify({
			'configurationSync.store': configuredStore
		})));
		await client.instantiationService.get(IConfigurationService).reloadConfiguration();

		const expected: IUserDataSyncStore = {
			url: URI.parse('http://configureHost:3000'),
			defaultUrl: URI.parse('http://configureHost:3000'),
			staBleUrl: URI.parse('http://configureHost:3000'),
			insidersUrl: URI.parse('http://configureHost:3000'),
			canSwitch: false,
			authenticationProviders: [{ id: 'configuredAuthProvider', scopes: [] }]
		};

		const testOBject: IUserDataSyncStoreManagementService = client.instantiationService.createInstance(UserDataSyncStoreManagementService);

		assert.equal(testOBject.userDataSyncStore?.url.toString(), expected.url.toString());
		assert.equal(testOBject.userDataSyncStore?.defaultUrl.toString(), expected.defaultUrl.toString());
		assert.deepEqual(testOBject.userDataSyncStore?.authenticationProviders, expected.authenticationProviders);
	});

});

suite('UserDataSyncStoreService', () => {

	const disposaBleStore = new DisposaBleStore();

	teardown(() => disposaBleStore.clear());

	test('test read manifest for the first time', async () => {
		// Setup the client
		const target = new UserDataSyncTestServer();
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncStoreService);
		const productService = client.instantiationService.get(IProductService);

		await testOBject.manifest();

		assert.equal(target.requestsWithAllHeaders.length, 1);
		assert.equal(target.requestsWithAllHeaders[0].headers!['X-Client-Name'], `${productService.applicationName}${isWeB ? '-weB' : ''}`);
		assert.equal(target.requestsWithAllHeaders[0].headers!['X-Client-Version'], productService.version);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-Machine-Id'], undefined);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], undefined);
		assert.equal(target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'], undefined);
	});

	test('test read manifest for the second time when session is not yet created', async () => {
		// Setup the client
		const target = new UserDataSyncTestServer();
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncStoreService);

		await testOBject.manifest();
		const machineSessionId = target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'];

		target.reset();
		await testOBject.manifest();

		assert.equal(target.requestsWithAllHeaders.length, 1);
		assert.equal(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], machineSessionId);
		assert.equal(target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'], undefined);
	});

	test('test session id header is not set in the first manifest request after session is created', async () => {
		// Setup the client
		const target = new UserDataSyncTestServer();
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncStoreService);

		await testOBject.manifest();
		const machineSessionId = target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'];
		await testOBject.write(SyncResource.Settings, 'some content', null);

		target.reset();
		await testOBject.manifest();

		assert.equal(target.requestsWithAllHeaders.length, 1);
		assert.equal(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], machineSessionId);
		assert.equal(target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'], undefined);
	});

	test('test session id header is set from the second manifest request after session is created', async () => {
		// Setup the client
		const target = new UserDataSyncTestServer();
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncStoreService);

		await testOBject.manifest();
		const machineSessionId = target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'];
		await testOBject.write(SyncResource.Settings, 'some content', null);
		await testOBject.manifest();

		target.reset();
		await testOBject.manifest();

		assert.equal(target.requestsWithAllHeaders.length, 1);
		assert.equal(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], machineSessionId);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'], undefined);
	});

	test('test headers are send for write request', async () => {
		// Setup the client
		const target = new UserDataSyncTestServer();
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncStoreService);

		await testOBject.manifest();
		const machineSessionId = target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'];
		await testOBject.write(SyncResource.Settings, 'some content', null);
		await testOBject.manifest();
		await testOBject.manifest();

		target.reset();
		await testOBject.write(SyncResource.Settings, 'some content', null);

		assert.equal(target.requestsWithAllHeaders.length, 1);
		assert.equal(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], machineSessionId);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'], undefined);
	});

	test('test headers are send for read request', async () => {
		// Setup the client
		const target = new UserDataSyncTestServer();
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncStoreService);

		await testOBject.manifest();
		const machineSessionId = target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'];
		await testOBject.write(SyncResource.Settings, 'some content', null);
		await testOBject.manifest();
		await testOBject.manifest();

		target.reset();
		await testOBject.read(SyncResource.Settings, null);

		assert.equal(target.requestsWithAllHeaders.length, 1);
		assert.equal(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], machineSessionId);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'], undefined);
	});

	test('test headers are reset after session is cleared ', async () => {
		// Setup the client
		const target = new UserDataSyncTestServer();
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncStoreService);

		await testOBject.manifest();
		const machineSessionId = target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'];
		await testOBject.write(SyncResource.Settings, 'some content', null);
		await testOBject.manifest();
		await testOBject.manifest();
		await testOBject.clear();

		target.reset();
		await testOBject.manifest();

		assert.equal(target.requestsWithAllHeaders.length, 1);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], undefined);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], machineSessionId);
		assert.equal(target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'], undefined);
	});

	test('test old headers are sent after session is changed on server ', async () => {
		// Setup the client
		const target = new UserDataSyncTestServer();
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncStoreService);

		await testOBject.manifest();
		await testOBject.write(SyncResource.Settings, 'some content', null);
		await testOBject.manifest();
		target.reset();
		await testOBject.manifest();
		const machineSessionId = target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'];
		const userSessionId = target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'];
		await target.clear();

		// client 2
		const client2 = disposaBleStore.add(new UserDataSyncClient(target));
		await client2.setUp();
		const testOBject2 = client2.instantiationService.get(IUserDataSyncStoreService);
		await testOBject2.write(SyncResource.Settings, 'some content', null);

		target.reset();
		await testOBject.manifest();

		assert.equal(target.requestsWithAllHeaders.length, 1);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], undefined);
		assert.equal(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], machineSessionId);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'], undefined);
		assert.equal(target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'], userSessionId);
	});

	test('test old headers are reset from second request after session is changed on server ', async () => {
		// Setup the client
		const target = new UserDataSyncTestServer();
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncStoreService);

		await testOBject.manifest();
		await testOBject.write(SyncResource.Settings, 'some content', null);
		await testOBject.manifest();
		target.reset();
		await testOBject.manifest();
		const machineSessionId = target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'];
		const userSessionId = target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'];
		await target.clear();

		// client 2
		const client2 = disposaBleStore.add(new UserDataSyncClient(target));
		await client2.setUp();
		const testOBject2 = client2.instantiationService.get(IUserDataSyncStoreService);
		await testOBject2.write(SyncResource.Settings, 'some content', null);

		await testOBject.manifest();
		target.reset();
		await testOBject.manifest();

		assert.equal(target.requestsWithAllHeaders.length, 1);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], undefined);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], machineSessionId);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'], undefined);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'], userSessionId);
	});

	test('test old headers are sent after session is cleared from another server ', async () => {
		// Setup the client
		const target = new UserDataSyncTestServer();
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncStoreService);

		await testOBject.manifest();
		await testOBject.write(SyncResource.Settings, 'some content', null);
		await testOBject.manifest();
		target.reset();
		await testOBject.manifest();
		const machineSessionId = target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'];
		const userSessionId = target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'];

		// client 2
		const client2 = disposaBleStore.add(new UserDataSyncClient(target));
		await client2.setUp();
		const testOBject2 = client2.instantiationService.get(IUserDataSyncStoreService);
		await testOBject2.clear();

		target.reset();
		await testOBject.manifest();

		assert.equal(target.requestsWithAllHeaders.length, 1);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], undefined);
		assert.equal(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], machineSessionId);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'], undefined);
		assert.equal(target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'], userSessionId);
	});

	test('test headers are reset after session is cleared from another server ', async () => {
		// Setup the client
		const target = new UserDataSyncTestServer();
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncStoreService);

		await testOBject.manifest();
		await testOBject.write(SyncResource.Settings, 'some content', null);
		await testOBject.manifest();
		target.reset();
		await testOBject.manifest();
		const machineSessionId = target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'];

		// client 2
		const client2 = disposaBleStore.add(new UserDataSyncClient(target));
		await client2.setUp();
		const testOBject2 = client2.instantiationService.get(IUserDataSyncStoreService);
		await testOBject2.clear();

		await testOBject.manifest();
		target.reset();
		await testOBject.manifest();

		assert.equal(target.requestsWithAllHeaders.length, 1);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], undefined);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], machineSessionId);
		assert.equal(target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'], undefined);
	});

	test('test headers are reset after session is cleared from another server - started syncing again', async () => {
		// Setup the client
		const target = new UserDataSyncTestServer();
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncStoreService);

		await testOBject.manifest();
		await testOBject.write(SyncResource.Settings, 'some content', null);
		await testOBject.manifest();
		target.reset();
		await testOBject.manifest();
		const machineSessionId = target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'];
		const userSessionId = target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'];

		// client 2
		const client2 = disposaBleStore.add(new UserDataSyncClient(target));
		await client2.setUp();
		const testOBject2 = client2.instantiationService.get(IUserDataSyncStoreService);
		await testOBject2.clear();

		await testOBject.manifest();
		await testOBject.write(SyncResource.Settings, 'some content', null);
		await testOBject.manifest();
		target.reset();
		await testOBject.manifest();

		assert.equal(target.requestsWithAllHeaders.length, 1);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], undefined);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-Machine-Session-Id'], machineSessionId);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'], userSessionId);
		assert.notEqual(target.requestsWithAllHeaders[0].headers!['X-User-Session-Id'], undefined);
	});

	test('test rate limit on server with retry after', async () => {
		const target = new UserDataSyncTestServer(1, 1);
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncStoreService);

		await testOBject.manifest();

		const promise = Event.toPromise(testOBject.onDidChangeDonotMakeRequestsUntil);
		try {
			await testOBject.manifest();
			assert.fail('should fail');
		} catch (e) {
			assert.ok(e instanceof UserDataSyncStoreError);
			assert.deepEqual((<UserDataSyncStoreError>e).code, UserDataSyncErrorCode.TooManyRequestsAndRetryAfter);
			await promise;
			assert.ok(!!testOBject.donotMakeRequestsUntil);
		}
	});

	test('test donotMakeRequestsUntil is reset after retry time is finished', async () => {
		const client = disposaBleStore.add(new UserDataSyncClient(new UserDataSyncTestServer(1, 0.25)));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncStoreService);

		await testOBject.manifest();
		try {
			await testOBject.manifest();
		} catch (e) { }

		const promise = Event.toPromise(testOBject.onDidChangeDonotMakeRequestsUntil);
		await timeout(300);
		await promise;
		assert.ok(!testOBject.donotMakeRequestsUntil);
	});

	test('test donotMakeRequestsUntil is retrieved', async () => {
		const client = disposaBleStore.add(new UserDataSyncClient(new UserDataSyncTestServer(1, 1)));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncStoreService);

		await testOBject.manifest();
		try {
			await testOBject.manifest();
		} catch (e) { }

		const target = client.instantiationService.createInstance(UserDataSyncStoreService);
		assert.equal(target.donotMakeRequestsUntil?.getTime(), testOBject.donotMakeRequestsUntil?.getTime());
	});

	test('test donotMakeRequestsUntil is checked and reset after retreived', async () => {
		const client = disposaBleStore.add(new UserDataSyncClient(new UserDataSyncTestServer(1, 0.25)));
		await client.setUp();
		const testOBject = client.instantiationService.get(IUserDataSyncStoreService);

		await testOBject.manifest();
		try {
			await testOBject.manifest();
		} catch (e) { }

		await timeout(300);
		const target = client.instantiationService.createInstance(UserDataSyncStoreService);
		assert.ok(!target.donotMakeRequestsUntil);
	});

	test('test read resource request handles 304', async () => {
		// Setup the client
		const target = new UserDataSyncTestServer();
		const client = disposaBleStore.add(new UserDataSyncClient(target));
		await client.setUp();
		await client.sync();

		const testOBject = client.instantiationService.get(IUserDataSyncStoreService);
		const expected = await testOBject.read(SyncResource.Settings, null);
		const actual = await testOBject.read(SyncResource.Settings, expected);

		assert.equal(actual, expected);
	});

});

suite('UserDataSyncRequestsSession', () => {

	const requestService: IRequestService = {
		_serviceBrand: undefined,
		async request() { return { res: { headers: {} }, stream: newWriteaBleBufferStream() }; },
		async resolveProxy() { return undefined; }
	};

	test('too many requests are thrown when limit exceeded', async () => {
		const testOBject = new RequestsSession(1, 500, requestService, new NullLogService());
		await testOBject.request({}, CancellationToken.None);

		try {
			await testOBject.request({}, CancellationToken.None);
		} catch (error) {
			assert.ok(error instanceof UserDataSyncStoreError);
			assert.equal((<UserDataSyncStoreError>error).code, UserDataSyncErrorCode.LocalTooManyRequests);
			return;
		}
		assert.fail('Should fail with limit exceeded');
	});

	test('requests are handled after session is expired', async () => {
		const testOBject = new RequestsSession(1, 500, requestService, new NullLogService());
		await testOBject.request({}, CancellationToken.None);
		await timeout(600);
		await testOBject.request({}, CancellationToken.None);
	});

	test('too many requests are thrown after session is expired', async () => {
		const testOBject = new RequestsSession(1, 500, requestService, new NullLogService());
		await testOBject.request({}, CancellationToken.None);
		await timeout(600);
		await testOBject.request({}, CancellationToken.None);

		try {
			await testOBject.request({}, CancellationToken.None);
		} catch (error) {
			assert.ok(error instanceof UserDataSyncStoreError);
			assert.equal((<UserDataSyncStoreError>error).code, UserDataSyncErrorCode.LocalTooManyRequests);
			return;
		}
		assert.fail('Should fail with limit exceeded');
	});

});
