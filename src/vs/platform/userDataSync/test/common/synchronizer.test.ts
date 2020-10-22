/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IUserDataSyncStoreService, SyncResource, SyncStatus, IUserDataSyncResourceEnaBlementService, IRemoteUserData, Change, USER_DATA_SYNC_SCHEME, IUserDataManifest, MergeState, IResourcePreview as IBaseResourcePreview } from 'vs/platform/userDataSync/common/userDataSync';
import { UserDataSyncClient, UserDataSyncTestServer } from 'vs/platform/userDataSync/test/common/userDataSyncClient';
import { DisposaBleStore, toDisposaBle } from 'vs/Base/common/lifecycle';
import { ABstractSynchroniser, IAcceptResult, IMergeResult, IResourcePreview } from 'vs/platform/userDataSync/common/aBstractSynchronizer';
import { Barrier } from 'vs/Base/common/async';
import { Emitter, Event } from 'vs/Base/common/event';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { URI } from 'vs/Base/common/uri';
import { IFileService } from 'vs/platform/files/common/files';
import { InMemoryFileSystemProvider } from 'vs/platform/files/common/inMemoryFilesystemProvider';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { isEqual, joinPath } from 'vs/Base/common/resources';

interface ITestResourcePreview extends IResourcePreview {
	ref: string;
}

class TestSynchroniser extends ABstractSynchroniser {

	syncBarrier: Barrier = new Barrier();
	syncResult: { hasConflicts: Boolean, hasError: Boolean } = { hasConflicts: false, hasError: false };
	onDoSyncCall: Emitter<void> = this._register(new Emitter<void>());
	failWhenGettingLatestRemoteUserData: Boolean = false;

	readonly resource: SyncResource = SyncResource.Settings;
	protected readonly version: numBer = 1;

	private cancelled: Boolean = false;
	readonly localResource = joinPath(this.environmentService.userRoamingDataHome, 'testResource.json');

	protected getLatestRemoteUserData(manifest: IUserDataManifest | null, lastSyncUserData: IRemoteUserData | null): Promise<IRemoteUserData> {
		if (this.failWhenGettingLatestRemoteUserData) {
			throw new Error();
		}
		return super.getLatestRemoteUserData(manifest, lastSyncUserData);
	}

	protected async doSync(remoteUserData: IRemoteUserData, lastSyncUserData: IRemoteUserData | null, apply: Boolean): Promise<SyncStatus> {
		this.cancelled = false;
		this.onDoSyncCall.fire();
		await this.syncBarrier.wait();

		if (this.cancelled) {
			return SyncStatus.Idle;
		}

		return super.doSync(remoteUserData, lastSyncUserData, apply);
	}

	protected async generateSyncPreview(remoteUserData: IRemoteUserData, lastSyncUserData: IRemoteUserData | null, token: CancellationToken): Promise<ITestResourcePreview[]> {
		if (this.syncResult.hasError) {
			throw new Error('failed');
		}

		let fileContent = null;
		try {
			fileContent = await this.fileService.readFile(this.localResource);
		} catch (error) { }

		return [{
			localResource: this.localResource,
			localContent: fileContent ? fileContent.value.toString() : null,
			remoteResource: this.localResource.with(({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' })),
			remoteContent: remoteUserData.syncData ? remoteUserData.syncData.content : null,
			previewResource: this.localResource.with(({ scheme: USER_DATA_SYNC_SCHEME, authority: 'preview' })),
			ref: remoteUserData.ref,
			localChange: Change.Modified,
			remoteChange: Change.Modified,
			acceptedResource: this.localResource.with(({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' })),
		}];
	}

	protected async getMergeResult(resourcePreview: ITestResourcePreview, token: CancellationToken): Promise<IMergeResult> {
		return {
			content: resourcePreview.ref,
			localChange: Change.Modified,
			remoteChange: Change.Modified,
			hasConflicts: this.syncResult.hasConflicts,
		};
	}

	protected async getAcceptResult(resourcePreview: ITestResourcePreview, resource: URI, content: string | null | undefined, token: CancellationToken): Promise<IAcceptResult> {

		if (isEqual(resource, resourcePreview.localResource)) {
			return {
				content: resourcePreview.localContent,
				localChange: Change.None,
				remoteChange: resourcePreview.localContent === null ? Change.Deleted : Change.Modified,
			};
		}

		if (isEqual(resource, resourcePreview.remoteResource)) {
			return {
				content: resourcePreview.remoteContent,
				localChange: resourcePreview.remoteContent === null ? Change.Deleted : Change.Modified,
				remoteChange: Change.None,
			};
		}

		if (isEqual(resource, resourcePreview.previewResource)) {
			if (content === undefined) {
				return {
					content: resourcePreview.ref,
					localChange: Change.Modified,
					remoteChange: Change.Modified,
				};
			} else {
				return {
					content,
					localChange: content === null ? resourcePreview.localContent !== null ? Change.Deleted : Change.None : Change.Modified,
					remoteChange: content === null ? resourcePreview.remoteContent !== null ? Change.Deleted : Change.None : Change.Modified,
				};
			}
		}

		throw new Error(`Invalid Resource: ${resource.toString()}`);
	}

	protected async applyResult(remoteUserData: IRemoteUserData, lastSyncUserData: IRemoteUserData | null, resourcePreviews: [IResourcePreview, IAcceptResult][], force: Boolean): Promise<void> {
		if (resourcePreviews[0][1].localChange === Change.Deleted) {
			await this.fileService.del(this.localResource);
		}

		if (resourcePreviews[0][1].localChange === Change.Added || resourcePreviews[0][1].localChange === Change.Modified) {
			await this.fileService.writeFile(this.localResource, VSBuffer.fromString(resourcePreviews[0][1].content!));
		}

		if (resourcePreviews[0][1].remoteChange === Change.Deleted) {
			await this.applyRef(null, remoteUserData.ref);
		}

		if (resourcePreviews[0][1].remoteChange === Change.Added || resourcePreviews[0][1].remoteChange === Change.Modified) {
			await this.applyRef(resourcePreviews[0][1].content, remoteUserData.ref);
		}
	}

	async applyRef(content: string | null, ref: string): Promise<void> {
		const remoteUserData = await this.updateRemoteUserData(content === null ? '' : content, ref);
		await this.updateLastSyncUserData(remoteUserData);
	}

	async stop(): Promise<void> {
		this.cancelled = true;
		this.syncBarrier.open();
		super.stop();
	}

	async triggerLocalChange(): Promise<void> {
		super.triggerLocalChange();
	}

	onDidTriggerLocalChangeCall: Emitter<void> = this._register(new Emitter<void>());
	protected async doTriggerLocalChange(): Promise<void> {
		await super.doTriggerLocalChange();
		this.onDidTriggerLocalChangeCall.fire();
	}

}

suite('TestSynchronizer - Auto Sync', () => {

	const disposaBleStore = new DisposaBleStore();
	const server = new UserDataSyncTestServer();
	let client: UserDataSyncClient;
	let userDataSyncStoreService: IUserDataSyncStoreService;

	setup(async () => {
		client = disposaBleStore.add(new UserDataSyncClient(server));
		await client.setUp();
		userDataSyncStoreService = client.instantiationService.get(IUserDataSyncStoreService);
		disposaBleStore.add(toDisposaBle(() => userDataSyncStoreService.clear()));
		client.instantiationService.get(IFileService).registerProvider(USER_DATA_SYNC_SCHEME, new InMemoryFileSystemProvider());
	});

	teardown(() => disposaBleStore.clear());

	test('status is syncing', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);

		const actual: SyncStatus[] = [];
		disposaBleStore.add(testOBject.onDidChangeStatus(status => actual.push(status)));

		const promise = Event.toPromise(testOBject.onDoSyncCall.event);

		testOBject.sync(await client.manifest());
		await promise;

		assert.deepEqual(actual, [SyncStatus.Syncing]);
		assert.deepEqual(testOBject.status, SyncStatus.Syncing);

		testOBject.stop();
	});

	test('status is set correctly when sync is finished', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncBarrier.open();

		const actual: SyncStatus[] = [];
		disposaBleStore.add(testOBject.onDidChangeStatus(status => actual.push(status)));
		await testOBject.sync(await client.manifest());

		assert.deepEqual(actual, [SyncStatus.Syncing, SyncStatus.Idle]);
		assert.deepEqual(testOBject.status, SyncStatus.Idle);
	});

	test('status is set correctly when sync has errors', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasError: true, hasConflicts: false };
		testOBject.syncBarrier.open();

		const actual: SyncStatus[] = [];
		disposaBleStore.add(testOBject.onDidChangeStatus(status => actual.push(status)));

		try {
			await testOBject.sync(await client.manifest());
			assert.fail('Should fail');
		} catch (e) {
			assert.deepEqual(actual, [SyncStatus.Syncing, SyncStatus.Idle]);
			assert.deepEqual(testOBject.status, SyncStatus.Idle);
		}
	});

	test('status is set to hasConflicts when asked to sync if there are conflicts', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: true, hasError: false };
		testOBject.syncBarrier.open();

		await testOBject.sync(await client.manifest());

		assert.deepEqual(testOBject.status, SyncStatus.HasConflicts);
		assertConflicts(testOBject.conflicts, [testOBject.localResource]);
	});

	test('sync should not run if syncing already', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		const promise = Event.toPromise(testOBject.onDoSyncCall.event);

		testOBject.sync(await client.manifest());
		await promise;

		const actual: SyncStatus[] = [];
		disposaBleStore.add(testOBject.onDidChangeStatus(status => actual.push(status)));
		await testOBject.sync(await client.manifest());

		assert.deepEqual(actual, []);
		assert.deepEqual(testOBject.status, SyncStatus.Syncing);

		await testOBject.stop();
	});

	test('sync should not run if disaBled', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		client.instantiationService.get(IUserDataSyncResourceEnaBlementService).setResourceEnaBlement(testOBject.resource, false);

		const actual: SyncStatus[] = [];
		disposaBleStore.add(testOBject.onDidChangeStatus(status => actual.push(status)));

		await testOBject.sync(await client.manifest());

		assert.deepEqual(actual, []);
		assert.deepEqual(testOBject.status, SyncStatus.Idle);
	});

	test('sync should not run if there are conflicts', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: true, hasError: false };
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());

		const actual: SyncStatus[] = [];
		disposaBleStore.add(testOBject.onDidChangeStatus(status => actual.push(status)));
		await testOBject.sync(await client.manifest());

		assert.deepEqual(actual, []);
		assert.deepEqual(testOBject.status, SyncStatus.HasConflicts);
	});

	test('accept preview during conflicts', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: true, hasError: false };
		testOBject.syncBarrier.open();

		await testOBject.sync(await client.manifest());
		assert.deepEqual(testOBject.status, SyncStatus.HasConflicts);

		await testOBject.accept(testOBject.conflicts[0].previewResource);
		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertConflicts(testOBject.conflicts, []);

		await testOBject.apply(false);
		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		const fileService = client.instantiationService.get(IFileService);
		assert.equal((await testOBject.getRemoteUserData(null)).syncData?.content, (await fileService.readFile(testOBject.localResource)).value.toString());
	});

	test('accept remote during conflicts', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());
		const fileService = client.instantiationService.get(IFileService);
		const currentRemoteContent = (await testOBject.getRemoteUserData(null)).syncData?.content;
		const newLocalContent = 'conflict';
		await fileService.writeFile(testOBject.localResource, VSBuffer.fromString(newLocalContent));

		testOBject.syncResult = { hasConflicts: true, hasError: false };
		await testOBject.sync(await client.manifest());
		assert.deepEqual(testOBject.status, SyncStatus.HasConflicts);

		await testOBject.accept(testOBject.conflicts[0].remoteResource);
		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertConflicts(testOBject.conflicts, []);

		await testOBject.apply(false);
		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.equal((await testOBject.getRemoteUserData(null)).syncData?.content, currentRemoteContent);
		assert.equal((await fileService.readFile(testOBject.localResource)).value.toString(), currentRemoteContent);
	});

	test('accept local during conflicts', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());
		const fileService = client.instantiationService.get(IFileService);
		const newLocalContent = 'conflict';
		await fileService.writeFile(testOBject.localResource, VSBuffer.fromString(newLocalContent));

		testOBject.syncResult = { hasConflicts: true, hasError: false };
		await testOBject.sync(await client.manifest());
		assert.deepEqual(testOBject.status, SyncStatus.HasConflicts);

		await testOBject.accept(testOBject.conflicts[0].localResource);
		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertConflicts(testOBject.conflicts, []);

		await testOBject.apply(false);
		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.equal((await testOBject.getRemoteUserData(null)).syncData?.content, newLocalContent);
		assert.equal((await fileService.readFile(testOBject.localResource)).value.toString(), newLocalContent);
	});

	test('accept new content during conflicts', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());
		const fileService = client.instantiationService.get(IFileService);
		const newLocalContent = 'conflict';
		await fileService.writeFile(testOBject.localResource, VSBuffer.fromString(newLocalContent));

		testOBject.syncResult = { hasConflicts: true, hasError: false };
		await testOBject.sync(await client.manifest());
		assert.deepEqual(testOBject.status, SyncStatus.HasConflicts);

		const mergeContent = 'newContent';
		await testOBject.accept(testOBject.conflicts[0].previewResource, mergeContent);
		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertConflicts(testOBject.conflicts, []);

		await testOBject.apply(false);
		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.equal((await testOBject.getRemoteUserData(null)).syncData?.content, mergeContent);
		assert.equal((await fileService.readFile(testOBject.localResource)).value.toString(), mergeContent);
	});

	test('accept delete during conflicts', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());
		const fileService = client.instantiationService.get(IFileService);
		const newLocalContent = 'conflict';
		await fileService.writeFile(testOBject.localResource, VSBuffer.fromString(newLocalContent));

		testOBject.syncResult = { hasConflicts: true, hasError: false };
		await testOBject.sync(await client.manifest());
		assert.deepEqual(testOBject.status, SyncStatus.HasConflicts);

		await testOBject.accept(testOBject.conflicts[0].previewResource, null);
		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertConflicts(testOBject.conflicts, []);

		await testOBject.apply(false);
		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.equal((await testOBject.getRemoteUserData(null)).syncData?.content, '');
		assert.ok(!(await fileService.exists(testOBject.localResource)));
	});

	test('accept deleted local during conflicts', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());
		const fileService = client.instantiationService.get(IFileService);
		await fileService.del(testOBject.localResource);

		testOBject.syncResult = { hasConflicts: true, hasError: false };
		await testOBject.sync(await client.manifest());
		assert.deepEqual(testOBject.status, SyncStatus.HasConflicts);

		await testOBject.accept(testOBject.conflicts[0].localResource);
		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertConflicts(testOBject.conflicts, []);

		await testOBject.apply(false);
		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.equal((await testOBject.getRemoteUserData(null)).syncData?.content, '');
		assert.ok(!(await fileService.exists(testOBject.localResource)));
	});

	test('accept deleted remote during conflicts', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncBarrier.open();
		const fileService = client.instantiationService.get(IFileService);
		await fileService.writeFile(testOBject.localResource, VSBuffer.fromString('some content'));
		testOBject.syncResult = { hasConflicts: true, hasError: false };

		await testOBject.sync(await client.manifest());
		assert.deepEqual(testOBject.status, SyncStatus.HasConflicts);

		await testOBject.accept(testOBject.conflicts[0].remoteResource);
		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertConflicts(testOBject.conflicts, []);

		await testOBject.apply(false);
		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.equal((await testOBject.getRemoteUserData(null)).syncData, null);
		assert.ok(!(await fileService.exists(testOBject.localResource)));
	});

	test('request latest data on precondition failure', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		// Sync once
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());
		testOBject.syncBarrier = new Barrier();

		// update remote data Before syncing so that 412 is thrown By server
		const disposaBle = testOBject.onDoSyncCall.event(async () => {
			disposaBle.dispose();
			await testOBject.applyRef(ref, ref);
			server.reset();
			testOBject.syncBarrier.open();
		});

		// Start sycing
		const manifest = await client.manifest();
		const ref = manifest!.latest![testOBject.resource];
		await testOBject.sync(await client.manifest());

		assert.deepEqual(server.requests, [
			{ type: 'POST', url: `${server.url}/v1/resource/${testOBject.resource}`, headers: { 'If-Match': ref } },
			{ type: 'GET', url: `${server.url}/v1/resource/${testOBject.resource}/latest`, headers: {} },
			{ type: 'POST', url: `${server.url}/v1/resource/${testOBject.resource}`, headers: { 'If-Match': `${parseInt(ref) + 1}` } },
		]);
	});

	test('no requests are made to server when local change is triggered', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());

		server.reset();
		const promise = Event.toPromise(testOBject.onDidTriggerLocalChangeCall.event);
		await testOBject.triggerLocalChange();

		await promise;
		assert.deepEqual(server.requests, []);
	});

	test('status is reset when getting latest remote data fails', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.failWhenGettingLatestRemoteUserData = true;

		try {
			await testOBject.sync(await client.manifest());
			assert.fail('Should throw an error');
		} catch (error) {
		}

		assert.equal(testOBject.status, SyncStatus.Idle);
	});
});

suite('TestSynchronizer - Manual Sync', () => {

	const disposaBleStore = new DisposaBleStore();
	const server = new UserDataSyncTestServer();
	let client: UserDataSyncClient;
	let userDataSyncStoreService: IUserDataSyncStoreService;

	setup(async () => {
		client = disposaBleStore.add(new UserDataSyncClient(server));
		await client.setUp();
		userDataSyncStoreService = client.instantiationService.get(IUserDataSyncStoreService);
		disposaBleStore.add(toDisposaBle(() => userDataSyncStoreService.clear()));
		client.instantiationService.get(IFileService).registerProvider(USER_DATA_SYNC_SCHEME, new InMemoryFileSystemProvider());
	});

	teardown(() => disposaBleStore.clear());

	test('preview', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();

		const preview = await testOBject.preview(await client.manifest());

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assertConflicts(testOBject.conflicts, []);
	});

	test('preview -> merge', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.merge(preview!.resourcePreviews[0].previewResource);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Accepted);
		assertConflicts(testOBject.conflicts, []);
	});

	test('preview -> accept', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.accept(preview!.resourcePreviews[0].previewResource);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Accepted);
		assertConflicts(testOBject.conflicts, []);
	});

	test('preview -> merge -> accept', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].localResource);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Accepted);
		assertConflicts(testOBject.conflicts, []);
	});

	test('preview -> merge -> apply', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());

		const manifest = await client.manifest();
		let preview = await testOBject.preview(manifest);
		preview = await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.apply(false);

		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.equal(preview, null);
		assertConflicts(testOBject.conflicts, []);

		const expectedContent = manifest!.latest![testOBject.resource];
		assert.equal((await testOBject.getRemoteUserData(null)).syncData?.content, expectedContent);
		assert.equal((await client.instantiationService.get(IFileService).readFile(testOBject.localResource)).value.toString(), expectedContent);
	});

	test('preview -> accept -> apply', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());

		const manifest = await client.manifest();
		const expectedContent = manifest!.latest![testOBject.resource];
		let preview = await testOBject.preview(manifest);
		preview = await testOBject.accept(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.apply(false);

		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.equal(preview, null);
		assertConflicts(testOBject.conflicts, []);

		assert.equal((await testOBject.getRemoteUserData(null)).syncData?.content, expectedContent);
		assert.equal((await client.instantiationService.get(IFileService).readFile(testOBject.localResource)).value.toString(), expectedContent);
	});

	test('preview -> merge -> accept -> apply', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());

		const expectedContent = (await client.instantiationService.get(IFileService).readFile(testOBject.localResource)).value.toString();
		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].localResource);
		preview = await testOBject.apply(false);

		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.equal(preview, null);
		assertConflicts(testOBject.conflicts, []);

		assert.equal((await testOBject.getRemoteUserData(null)).syncData?.content, expectedContent);
		assert.equal(!(await client.instantiationService.get(IFileService).readFile(testOBject.localResource)).value.toString(), expectedContent);
	});

	test('preview -> accept', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.accept(preview!.resourcePreviews[0].previewResource);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assertConflicts(testOBject.conflicts, []);
	});

	test('preview -> accept -> apply', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());

		const manifest = await client.manifest();
		const expectedContent = manifest!.latest![testOBject.resource];
		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.accept(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.apply(false);

		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.equal(preview, null);
		assertConflicts(testOBject.conflicts, []);

		assert.equal((await testOBject.getRemoteUserData(null)).syncData?.content, expectedContent);
		assert.equal((await client.instantiationService.get(IFileService).readFile(testOBject.localResource)).value.toString(), expectedContent);
	});

	test('preivew -> merge -> discard', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Preview);
		assertConflicts(testOBject.conflicts, []);
	});

	test('preivew -> merge -> discard -> accept', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].remoteResource);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Accepted);
		assertConflicts(testOBject.conflicts, []);
	});

	test('preivew -> accept -> discard', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.accept(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Preview);
		assertConflicts(testOBject.conflicts, []);
	});

	test('preivew -> accept -> discard -> accept', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.accept(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].remoteResource);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Accepted);
		assertConflicts(testOBject.conflicts, []);
	});

	test('preivew -> accept -> discard -> merge', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.accept(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.merge(preview!.resourcePreviews[0].remoteResource);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Accepted);
		assertConflicts(testOBject.conflicts, []);
	});

	test('preivew -> merge -> accept -> discard', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].remoteResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Preview);
		assertConflicts(testOBject.conflicts, []);
	});

	test('preivew -> merge -> discard -> accept -> apply', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());

		const expectedContent = (await client.instantiationService.get(IFileService).readFile(testOBject.localResource)).value.toString();
		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].localResource);
		preview = await testOBject.apply(false);

		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.equal(preview, null);
		assertConflicts(testOBject.conflicts, []);
		assert.equal((await testOBject.getRemoteUserData(null)).syncData?.content, expectedContent);
		assert.equal(!(await client.instantiationService.get(IFileService).readFile(testOBject.localResource)).value.toString(), expectedContent);
	});

	test('preivew -> accept -> discard -> accept -> apply', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());

		const expectedContent = (await client.instantiationService.get(IFileService).readFile(testOBject.localResource)).value.toString();
		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].remoteResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].localResource);
		preview = await testOBject.apply(false);

		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.equal(preview, null);
		assertConflicts(testOBject.conflicts, []);
		assert.equal((await testOBject.getRemoteUserData(null)).syncData?.content, expectedContent);
		assert.equal(!(await client.instantiationService.get(IFileService).readFile(testOBject.localResource)).value.toString(), expectedContent);
	});

	test('preivew -> accept -> discard -> merge -> apply', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());

		const manifest = await client.manifest();
		const expectedContent = manifest!.latest![testOBject.resource];
		let preview = await testOBject.preview(manifest);
		preview = await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].remoteResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.merge(preview!.resourcePreviews[0].localResource);
		preview = await testOBject.apply(false);

		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.equal(preview, null);
		assertConflicts(testOBject.conflicts, []);

		assert.equal((await testOBject.getRemoteUserData(null)).syncData?.content, expectedContent);
		assert.equal((await client.instantiationService.get(IFileService).readFile(testOBject.localResource)).value.toString(), expectedContent);
	});

	test('conflicts: preview', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: true, hasError: false };
		testOBject.syncBarrier.open();

		const preview = await testOBject.preview(await client.manifest());

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assertConflicts(testOBject.conflicts, []);
	});

	test('conflicts: preview -> merge', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: true, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.merge(preview!.resourcePreviews[0].previewResource);

		assert.deepEqual(testOBject.status, SyncStatus.HasConflicts);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Conflict);
		assertConflicts(testOBject.conflicts, [preview!.resourcePreviews[0].localResource]);
	});

	test('conflicts: preview -> merge -> discard', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: true, hasError: false };
		testOBject.syncBarrier.open();

		const preview = await testOBject.preview(await client.manifest());
		await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		await testOBject.discard(preview!.resourcePreviews[0].previewResource);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Preview);
		assertConflicts(testOBject.conflicts, []);
	});

	test('conflicts: preview -> accept', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: true, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		const content = await testOBject.resolveContent(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].previewResource, content);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.deepEqual(testOBject.conflicts, []);
	});

	test('conflicts: preview -> merge -> accept -> apply', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());

		testOBject.syncResult = { hasConflicts: true, hasError: false };
		const manifest = await client.manifest();
		const expectedContent = manifest!.latest![testOBject.resource];
		let preview = await testOBject.preview(manifest);

		await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.apply(false);

		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.equal(preview, null);
		assertConflicts(testOBject.conflicts, []);

		assert.equal((await testOBject.getRemoteUserData(null)).syncData?.content, expectedContent);
		assert.equal((await client.instantiationService.get(IFileService).readFile(testOBject.localResource)).value.toString(), expectedContent);
	});

	test('conflicts: preview -> accept', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: true, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		const content = await testOBject.resolveContent(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].previewResource, content);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assertConflicts(testOBject.conflicts, []);
	});

	test('conflicts: preview -> accept -> apply', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());

		testOBject.syncResult = { hasConflicts: true, hasError: false };
		const manifest = await client.manifest();
		const expectedContent = manifest!.latest![testOBject.resource];
		let preview = await testOBject.preview(manifest);

		preview = await testOBject.accept(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.apply(false);

		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.equal(preview, null);
		assertConflicts(testOBject.conflicts, []);

		assert.equal((await testOBject.getRemoteUserData(null)).syncData?.content, expectedContent);
		assert.equal((await client.instantiationService.get(IFileService).readFile(testOBject.localResource)).value.toString(), expectedContent);
	});

	test('conflicts: preivew -> merge -> discard', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: true, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Preview);
		assertConflicts(testOBject.conflicts, []);
	});

	test('conflicts: preivew -> merge -> discard -> accept', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: true, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].remoteResource);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Accepted);
		assertConflicts(testOBject.conflicts, []);
	});

	test('conflicts: preivew -> accept -> discard', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: true, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.accept(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Preview);
		assertConflicts(testOBject.conflicts, []);
	});

	test('conflicts: preivew -> accept -> discard -> accept', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: true, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.accept(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].remoteResource);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Accepted);
		assertConflicts(testOBject.conflicts, []);
	});

	test('conflicts: preivew -> accept -> discard -> merge', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: true, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.accept(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.merge(preview!.resourcePreviews[0].remoteResource);

		assert.deepEqual(testOBject.status, SyncStatus.HasConflicts);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Conflict);
		assertConflicts(testOBject.conflicts, [preview!.resourcePreviews[0].localResource]);
	});

	test('conflicts: preivew -> merge -> discard -> merge', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: true, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.merge(preview!.resourcePreviews[0].remoteResource);

		assert.deepEqual(testOBject.status, SyncStatus.HasConflicts);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Conflict);
		assertConflicts(testOBject.conflicts, [preview!.resourcePreviews[0].localResource]);
	});

	test('conflicts: preivew -> merge -> accept -> discard', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();

		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].remoteResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);

		assert.deepEqual(testOBject.status, SyncStatus.Syncing);
		assertPreviews(preview!.resourcePreviews, [testOBject.localResource]);
		assert.equal(preview!.resourcePreviews[0].mergeState, MergeState.Preview);
		assertConflicts(testOBject.conflicts, []);
	});

	test('conflicts: preivew -> merge -> discard -> accept -> apply', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());

		const expectedContent = (await client.instantiationService.get(IFileService).readFile(testOBject.localResource)).value.toString();
		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].localResource);
		preview = await testOBject.apply(false);

		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.equal(preview, null);
		assertConflicts(testOBject.conflicts, []);
		assert.equal((await testOBject.getRemoteUserData(null)).syncData?.content, expectedContent);
		assert.equal(!(await client.instantiationService.get(IFileService).readFile(testOBject.localResource)).value.toString(), expectedContent);
	});

	test('conflicts: preivew -> accept -> discard -> accept -> apply', async () => {
		const testOBject: TestSynchroniser = client.instantiationService.createInstance(TestSynchroniser, SyncResource.Settings);
		testOBject.syncResult = { hasConflicts: false, hasError: false };
		testOBject.syncBarrier.open();
		await testOBject.sync(await client.manifest());

		const expectedContent = (await client.instantiationService.get(IFileService).readFile(testOBject.localResource)).value.toString();
		let preview = await testOBject.preview(await client.manifest());
		preview = await testOBject.merge(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].remoteResource);
		preview = await testOBject.discard(preview!.resourcePreviews[0].previewResource);
		preview = await testOBject.accept(preview!.resourcePreviews[0].localResource);
		preview = await testOBject.apply(false);

		assert.deepEqual(testOBject.status, SyncStatus.Idle);
		assert.equal(preview, null);
		assertConflicts(testOBject.conflicts, []);
		assert.equal((await testOBject.getRemoteUserData(null)).syncData?.content, expectedContent);
		assert.equal(!(await client.instantiationService.get(IFileService).readFile(testOBject.localResource)).value.toString(), expectedContent);
	});

});

function assertConflicts(actual: IBaseResourcePreview[], expected: URI[]) {
	assert.deepEqual(actual.map(({ localResource }) => localResource.toString()), expected.map(uri => uri.toString()));
}

function assertPreviews(actual: IBaseResourcePreview[], expected: URI[]) {
	assert.deepEqual(actual.map(({ localResource }) => localResource.toString()), expected.map(uri => uri.toString()));
}
