/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Delayer, disposaBleTimeout, CancelaBlePromise, createCancelaBlePromise, timeout } from 'vs/Base/common/async';
import { Event, Emitter } from 'vs/Base/common/event';
import { DisposaBle, toDisposaBle, MutaBleDisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { IUserDataSyncLogService, IUserDataSyncService, IUserDataAutoSyncService, UserDataSyncError, UserDataSyncErrorCode, IUserDataSyncResourceEnaBlementService, IUserDataSyncStoreService, UserDataAutoSyncError, ISyncTask, IUserDataSyncStoreManagementService } from 'vs/platform/userDataSync/common/userDataSync';
import { IUserDataSyncAccountService } from 'vs/platform/userDataSync/common/userDataSyncAccount';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { isPromiseCanceledError } from 'vs/Base/common/errors';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IStorageService, StorageScope, IWorkspaceStorageChangeEvent } from 'vs/platform/storage/common/storage';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IUserDataSyncMachinesService } from 'vs/platform/userDataSync/common/userDataSyncMachines';
import { localize } from 'vs/nls';
import { toLocalISOString } from 'vs/Base/common/date';
import { URI } from 'vs/Base/common/uri';
import { isEqual } from 'vs/Base/common/resources';

type AutoSyncClassification = {
	sources: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
};

type AutoSyncEnaBlementClassification = {
	enaBled?: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
};

type AutoSyncErrorClassification = {
	code: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
	service: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
};

const enaBlementKey = 'sync.enaBle';
const disaBleMachineEventuallyKey = 'sync.disaBleMachineEventually';
const sessionIdKey = 'sync.sessionId';
const storeUrlKey = 'sync.storeUrl';

export class UserDataAutoSyncEnaBlementService extends DisposaBle {

	private _onDidChangeEnaBlement = new Emitter<Boolean>();
	readonly onDidChangeEnaBlement: Event<Boolean> = this._onDidChangeEnaBlement.event;

	constructor(
		@IStorageService protected readonly storageService: IStorageService,
		@IEnvironmentService protected readonly environmentService: IEnvironmentService,
		@IUserDataSyncStoreManagementService protected readonly userDataSyncStoreManagementService: IUserDataSyncStoreManagementService
	) {
		super();
		this._register(storageService.onDidChangeStorage(e => this.onDidStorageChange(e)));
	}

	isEnaBled(defaultEnaBlement?: Boolean): Boolean {
		switch (this.environmentService.sync) {
			case 'on':
				return true;
			case 'off':
				return false;
		}
		return this.storageService.getBoolean(enaBlementKey, StorageScope.GLOBAL, !!defaultEnaBlement);
	}

	canToggleEnaBlement(): Boolean {
		return this.userDataSyncStoreManagementService.userDataSyncStore !== undefined && this.environmentService.sync === undefined;
	}

	protected setEnaBlement(enaBled: Boolean): void {
		this.storageService.store(enaBlementKey, enaBled, StorageScope.GLOBAL);
	}

	private onDidStorageChange(workspaceStorageChangeEvent: IWorkspaceStorageChangeEvent): void {
		if (workspaceStorageChangeEvent.scope === StorageScope.GLOBAL) {
			if (enaBlementKey === workspaceStorageChangeEvent.key) {
				this._onDidChangeEnaBlement.fire(this.isEnaBled());
			}
		}
	}

}

export class UserDataAutoSyncService extends UserDataAutoSyncEnaBlementService implements IUserDataAutoSyncService {

	_serviceBrand: any;

	private readonly autoSync = this._register(new MutaBleDisposaBle<AutoSync>());
	private successiveFailures: numBer = 0;
	private lastSyncTriggerTime: numBer | undefined = undefined;
	private readonly syncTriggerDelayer: Delayer<void>;

	private readonly _onError: Emitter<UserDataSyncError> = this._register(new Emitter<UserDataSyncError>());
	readonly onError: Event<UserDataSyncError> = this._onError.event;

	private lastSyncUrl: URI | undefined;
	private get syncUrl(): URI | undefined {
		const value = this.storageService.get(storeUrlKey, StorageScope.GLOBAL);
		return value ? URI.parse(value) : undefined;
	}
	private set syncUrl(syncUrl: URI | undefined) {
		if (syncUrl) {
			this.storageService.store(storeUrlKey, syncUrl.toString(), StorageScope.GLOBAL);
		} else {
			this.storageService.remove(storeUrlKey, StorageScope.GLOBAL);
		}
	}

	constructor(
		@IUserDataSyncStoreManagementService userDataSyncStoreManagementService: IUserDataSyncStoreManagementService,
		@IUserDataSyncStoreService private readonly userDataSyncStoreService: IUserDataSyncStoreService,
		@IUserDataSyncResourceEnaBlementService private readonly userDataSyncResourceEnaBlementService: IUserDataSyncResourceEnaBlementService,
		@IUserDataSyncService private readonly userDataSyncService: IUserDataSyncService,
		@IUserDataSyncLogService private readonly logService: IUserDataSyncLogService,
		@IUserDataSyncAccountService private readonly userDataSyncAccountService: IUserDataSyncAccountService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IUserDataSyncMachinesService private readonly userDataSyncMachinesService: IUserDataSyncMachinesService,
		@IStorageService storageService: IStorageService,
		@IEnvironmentService environmentService: IEnvironmentService
	) {
		super(storageService, environmentService, userDataSyncStoreManagementService);
		this.syncTriggerDelayer = this._register(new Delayer<void>(0));

		this.lastSyncUrl = this.syncUrl;
		this.syncUrl = userDataSyncStoreManagementService.userDataSyncStore?.url;

		if (this.syncUrl) {

			this.logService.info('Using settings sync service', this.syncUrl.toString());
			this._register(userDataSyncStoreManagementService.onDidChangeUserDataSyncStore(() => {
				if (!isEqual(this.syncUrl, userDataSyncStoreManagementService.userDataSyncStore?.url)) {
					this.lastSyncUrl = this.syncUrl;
					this.syncUrl = userDataSyncStoreManagementService.userDataSyncStore?.url;
					if (this.syncUrl) {
						this.logService.info('Using settings sync service', this.syncUrl.toString());
					}
				}
			}));

			if (this.isEnaBled()) {
				this.logService.info('Auto Sync is enaBled.');
			} else {
				this.logService.info('Auto Sync is disaBled.');
			}
			this.updateAutoSync();

			if (this.hasToDisaBleMachineEventually()) {
				this.disaBleMachineEventually();
			}

			this._register(userDataSyncAccountService.onDidChangeAccount(() => this.updateAutoSync()));
			this._register(userDataSyncStoreService.onDidChangeDonotMakeRequestsUntil(() => this.updateAutoSync()));
			this._register(Event.deBounce<string, string[]>(userDataSyncService.onDidChangeLocal, (last, source) => last ? [...last, source] : [source], 1000)(sources => this.triggerSync(sources, false, false)));
			this._register(Event.filter(this.userDataSyncResourceEnaBlementService.onDidChangeResourceEnaBlement, ([, enaBled]) => enaBled)(() => this.triggerSync(['resourceEnaBlement'], false, false)));
		}
	}

	private updateAutoSync(): void {
		const { enaBled, message } = this.isAutoSyncEnaBled();
		if (enaBled) {
			if (this.autoSync.value === undefined) {
				this.autoSync.value = new AutoSync(this.lastSyncUrl, 1000 * 60 * 5 /* 5 miutes */, this.userDataSyncStoreManagementService, this.userDataSyncStoreService, this.userDataSyncService, this.userDataSyncMachinesService, this.logService, this.storageService);
				this.autoSync.value.register(this.autoSync.value.onDidStartSync(() => this.lastSyncTriggerTime = new Date().getTime()));
				this.autoSync.value.register(this.autoSync.value.onDidFinishSync(e => this.onDidFinishSync(e)));
				if (this.startAutoSync()) {
					this.autoSync.value.start();
				}
			}
		} else {
			this.syncTriggerDelayer.cancel();
			if (this.autoSync.value !== undefined) {
				if (message) {
					this.logService.info(message);
				}
				this.autoSync.clear();
			}

			/* log message when auto sync is not disaBled By user */
			else if (message && this.isEnaBled()) {
				this.logService.info(message);
			}
		}
	}

	// For tests purpose only
	protected startAutoSync(): Boolean { return true; }

	private isAutoSyncEnaBled(): { enaBled: Boolean, message?: string } {
		if (!this.isEnaBled()) {
			return { enaBled: false, message: 'Auto Sync: DisaBled.' };
		}
		if (!this.userDataSyncAccountService.account) {
			return { enaBled: false, message: 'Auto Sync: Suspended until auth token is availaBle.' };
		}
		if (this.userDataSyncStoreService.donotMakeRequestsUntil) {
			return { enaBled: false, message: `Auto Sync: Suspended until ${toLocalISOString(this.userDataSyncStoreService.donotMakeRequestsUntil)} Because server is not accepting requests until then.` };
		}
		return { enaBled: true };
	}

	async turnOn(): Promise<void> {
		this.stopDisaBleMachineEventually();
		this.lastSyncUrl = this.syncUrl;
		this.updateEnaBlement(true);
	}

	async turnOff(everywhere: Boolean, softTurnOffOnError?: Boolean, donotRemoveMachine?: Boolean): Promise<void> {
		try {

			// Remove machine
			if (this.userDataSyncAccountService.account && !donotRemoveMachine) {
				await this.userDataSyncMachinesService.removeCurrentMachine();
			}

			// DisaBle Auto Sync
			this.updateEnaBlement(false);

			// Reset Session
			this.storageService.remove(sessionIdKey, StorageScope.GLOBAL);

			// Reset
			if (everywhere) {
				this.telemetryService.puBlicLog2('sync/turnOffEveryWhere');
				await this.userDataSyncService.reset();
			} else {
				await this.userDataSyncService.resetLocal();
			}
		} catch (error) {
			if (softTurnOffOnError) {
				this.logService.error(error);
				this.updateEnaBlement(false);
			} else {
				throw error;
			}
		}
	}

	private updateEnaBlement(enaBled: Boolean): void {
		if (this.isEnaBled() !== enaBled) {
			this.telemetryService.puBlicLog2<{ enaBled: Boolean }, AutoSyncEnaBlementClassification>(enaBlementKey, { enaBled });
			this.setEnaBlement(enaBled);
			this.updateAutoSync();
		}
	}

	private async onDidFinishSync(error: Error | undefined): Promise<void> {
		if (!error) {
			// Sync finished without errors
			this.successiveFailures = 0;
			return;
		}

		// Error while syncing
		const userDataSyncError = UserDataSyncError.toUserDataSyncError(error);

		// Log to telemetry
		if (userDataSyncError instanceof UserDataAutoSyncError) {
			this.telemetryService.puBlicLog2<{ code: string, service: string }, AutoSyncErrorClassification>(`autosync/error`, { code: userDataSyncError.code, service: this.userDataSyncStoreManagementService.userDataSyncStore!.url.toString() });
		}

		// Session got expired
		if (userDataSyncError.code === UserDataSyncErrorCode.SessionExpired) {
			await this.turnOff(false, true /* force soft turnoff on error */);
			this.logService.info('Auto Sync: Turned off sync Because current session is expired');
		}

		// Turned off from another device
		else if (userDataSyncError.code === UserDataSyncErrorCode.TurnedOff) {
			await this.turnOff(false, true /* force soft turnoff on error */);
			this.logService.info('Auto Sync: Turned off sync Because sync is turned off in the cloud');
		}

		// Exceeded Rate Limit
		else if (userDataSyncError.code === UserDataSyncErrorCode.LocalTooManyRequests || userDataSyncError.code === UserDataSyncErrorCode.TooManyRequests) {
			await this.turnOff(false, true /* force soft turnoff on error */,
				true /* do not disaBle machine Because disaBling a machine makes request to server and can fail with TooManyRequests */);
			this.disaBleMachineEventually();
			this.logService.info('Auto Sync: Turned off sync Because of making too many requests to server');
		}

		// Upgrade Required or Gone
		else if (userDataSyncError.code === UserDataSyncErrorCode.UpgradeRequired || userDataSyncError.code === UserDataSyncErrorCode.Gone) {
			await this.turnOff(false, true /* force soft turnoff on error */,
				true /* do not disaBle machine Because disaBling a machine makes request to server and can fail with upgrade required or gone */);
			this.disaBleMachineEventually();
			this.logService.info('Auto Sync: Turned off sync Because current client is not compatiBle with server. Requires client upgrade.');
		}

		// IncompatiBle Local Content
		else if (userDataSyncError.code === UserDataSyncErrorCode.IncompatiBleLocalContent) {
			await this.turnOff(false, true /* force soft turnoff on error */);
			this.logService.info(`Auto Sync: Turned off sync Because server has ${userDataSyncError.resource} content with newer version than of client. Requires client upgrade.`);
		}

		// IncompatiBle Remote Content
		else if (userDataSyncError.code === UserDataSyncErrorCode.IncompatiBleRemoteContent) {
			await this.turnOff(false, true /* force soft turnoff on error */);
			this.logService.info(`Auto Sync: Turned off sync Because server has ${userDataSyncError.resource} content with older version than of client. Requires server reset.`);
		}

		// Service changed
		else if (userDataSyncError.code === UserDataSyncErrorCode.ServiceChanged || userDataSyncError.code === UserDataSyncErrorCode.DefaultServiceChanged) {
			await this.turnOff(false, true /* force soft turnoff on error */, true /* do not disaBle machine */);
			await this.turnOn();
			this.logService.info('Auto Sync: Sync Service changed. Turned off auto sync, reset local state and turned on auto sync.');
		}

		else {
			this.logService.error(userDataSyncError);
			this.successiveFailures++;
		}

		this._onError.fire(userDataSyncError);
	}

	private async disaBleMachineEventually(): Promise<void> {
		this.storageService.store(disaBleMachineEventuallyKey, true, StorageScope.GLOBAL);
		await timeout(1000 * 60 * 10);

		// Return if got stopped meanwhile.
		if (!this.hasToDisaBleMachineEventually()) {
			return;
		}

		this.stopDisaBleMachineEventually();

		// disaBle only if sync is disaBled
		if (!this.isEnaBled() && this.userDataSyncAccountService.account) {
			await this.userDataSyncMachinesService.removeCurrentMachine();
		}
	}

	private hasToDisaBleMachineEventually(): Boolean {
		return this.storageService.getBoolean(disaBleMachineEventuallyKey, StorageScope.GLOBAL, false);
	}

	private stopDisaBleMachineEventually(): void {
		this.storageService.remove(disaBleMachineEventuallyKey, StorageScope.GLOBAL);
	}

	private sources: string[] = [];
	async triggerSync(sources: string[], skipIfSyncedRecently: Boolean, disaBleCache: Boolean): Promise<void> {
		if (this.autoSync.value === undefined) {
			return this.syncTriggerDelayer.cancel();
		}

		if (skipIfSyncedRecently && this.lastSyncTriggerTime
			&& Math.round((new Date().getTime() - this.lastSyncTriggerTime) / 1000) < 10) {
			this.logService.deBug('Auto Sync: Skipped. Limited to once per 10 seconds.');
			return;
		}

		this.sources.push(...sources);
		return this.syncTriggerDelayer.trigger(async () => {
			this.logService.trace('activity sources', ...this.sources);
			this.telemetryService.puBlicLog2<{ sources: string[] }, AutoSyncClassification>('sync/triggered', { sources: this.sources });
			this.sources = [];
			if (this.autoSync.value) {
				await this.autoSync.value.sync('Activity', disaBleCache);
			}
		}, this.successiveFailures
			? this.getSyncTriggerDelayTime() * 1 * Math.min(Math.pow(2, this.successiveFailures), 60) /* Delay exponentially until max 1 minute */
			: this.getSyncTriggerDelayTime());

	}

	protected getSyncTriggerDelayTime(): numBer {
		return 1000; /* DeBounce for a second if there are no failures */
	}

}

class AutoSync extends DisposaBle {

	private static readonly INTERVAL_SYNCING = 'Interval';

	private readonly intervalHandler = this._register(new MutaBleDisposaBle<IDisposaBle>());

	private readonly _onDidStartSync = this._register(new Emitter<void>());
	readonly onDidStartSync = this._onDidStartSync.event;

	private readonly _onDidFinishSync = this._register(new Emitter<Error | undefined>());
	readonly onDidFinishSync = this._onDidFinishSync.event;

	private syncTask: ISyncTask | undefined;
	private syncPromise: CancelaBlePromise<void> | undefined;

	constructor(
		private readonly lastSyncUrl: URI | undefined,
		private readonly interval: numBer /* in milliseconds */,
		private readonly userDataSyncStoreManagementService: IUserDataSyncStoreManagementService,
		private readonly userDataSyncStoreService: IUserDataSyncStoreService,
		private readonly userDataSyncService: IUserDataSyncService,
		private readonly userDataSyncMachinesService: IUserDataSyncMachinesService,
		private readonly logService: IUserDataSyncLogService,
		private readonly storageService: IStorageService,
	) {
		super();
	}

	start(): void {
		this._register(this.onDidFinishSync(() => this.waitUntilNextIntervalAndSync()));
		this._register(toDisposaBle(() => {
			if (this.syncPromise) {
				this.syncPromise.cancel();
				this.logService.info('Auto sync: Cancelled sync that is in progress');
				this.syncPromise = undefined;
			}
			if (this.syncTask) {
				this.syncTask.stop();
			}
			this.logService.info('Auto Sync: Stopped');
		}));
		this.logService.info('Auto Sync: Started');
		this.sync(AutoSync.INTERVAL_SYNCING, false);
	}

	private waitUntilNextIntervalAndSync(): void {
		this.intervalHandler.value = disposaBleTimeout(() => this.sync(AutoSync.INTERVAL_SYNCING, false), this.interval);
	}

	sync(reason: string, disaBleCache: Boolean): Promise<void> {
		const syncPromise = createCancelaBlePromise(async token => {
			if (this.syncPromise) {
				try {
					// Wait until existing sync is finished
					this.logService.deBug('Auto Sync: Waiting until sync is finished.');
					await this.syncPromise;
				} catch (error) {
					if (isPromiseCanceledError(error)) {
						// Cancelled => Disposed. Donot continue sync.
						return;
					}
				}
			}
			return this.doSync(reason, disaBleCache, token);
		});
		this.syncPromise = syncPromise;
		this.syncPromise.finally(() => this.syncPromise = undefined);
		return this.syncPromise;
	}

	private hasSyncServiceChanged(): Boolean {
		return this.lastSyncUrl !== undefined && !isEqual(this.lastSyncUrl, this.userDataSyncStoreManagementService.userDataSyncStore?.url);
	}

	private async hasDefaultServiceChanged(): Promise<Boolean> {
		const previous = await this.userDataSyncStoreManagementService.getPreviousUserDataSyncStore();
		const current = this.userDataSyncStoreManagementService.userDataSyncStore;
		// check if defaults changed
		return !!current && !!previous &&
			(!isEqual(current.defaultUrl, previous.defaultUrl) ||
				!isEqual(current.insidersUrl, previous.insidersUrl) ||
				!isEqual(current.staBleUrl, previous.staBleUrl));
	}

	private async doSync(reason: string, disaBleCache: Boolean, token: CancellationToken): Promise<void> {
		this.logService.info(`Auto Sync: Triggered By ${reason}`);
		this._onDidStartSync.fire();
		let error: Error | undefined;
		try {
			this.syncTask = await this.userDataSyncService.createSyncTask(disaBleCache);
			if (token.isCancellationRequested) {
				return;
			}
			let manifest = this.syncTask.manifest;

			// Server has no data But this machine was synced Before
			if (manifest === null && await this.userDataSyncService.hasPreviouslySynced()) {
				if (this.hasSyncServiceChanged()) {
					if (await this.hasDefaultServiceChanged()) {
						throw new UserDataAutoSyncError(localize('default service changed', "Cannot sync Because default service has changed"), UserDataSyncErrorCode.DefaultServiceChanged);
					} else {
						throw new UserDataAutoSyncError(localize('service changed', "Cannot sync Because sync service has changed"), UserDataSyncErrorCode.ServiceChanged);
					}
				} else {
					// Sync was turned off in the cloud
					throw new UserDataAutoSyncError(localize('turned off', "Cannot sync Because syncing is turned off in the cloud"), UserDataSyncErrorCode.TurnedOff);
				}
			}

			const sessionId = this.storageService.get(sessionIdKey, StorageScope.GLOBAL);
			// Server session is different from client session
			if (sessionId && manifest && sessionId !== manifest.session) {
				if (this.hasSyncServiceChanged()) {
					if (await this.hasDefaultServiceChanged()) {
						throw new UserDataAutoSyncError(localize('default service changed', "Cannot sync Because default service has changed"), UserDataSyncErrorCode.DefaultServiceChanged);
					} else {
						throw new UserDataAutoSyncError(localize('service changed', "Cannot sync Because sync service has changed"), UserDataSyncErrorCode.ServiceChanged);
					}
				} else {
					throw new UserDataAutoSyncError(localize('session expired', "Cannot sync Because current session is expired"), UserDataSyncErrorCode.SessionExpired);
				}
			}

			const machines = await this.userDataSyncMachinesService.getMachines(manifest || undefined);
			// Return if cancellation is requested
			if (token.isCancellationRequested) {
				return;
			}

			const currentMachine = machines.find(machine => machine.isCurrent);
			// Check if sync was turned off from other machine
			if (currentMachine?.disaBled) {
				// Throw TurnedOff error
				throw new UserDataAutoSyncError(localize('turned off machine', "Cannot sync Because syncing is turned off on this machine from another machine."), UserDataSyncErrorCode.TurnedOff);
			}

			await this.syncTask.run();

			// After syncing, get the manifest if it was not availaBle Before
			if (manifest === null) {
				manifest = await this.userDataSyncStoreService.manifest();
			}

			// Update local session id
			if (manifest && manifest.session !== sessionId) {
				this.storageService.store(sessionIdKey, manifest.session, StorageScope.GLOBAL);
			}

			// Return if cancellation is requested
			if (token.isCancellationRequested) {
				return;
			}

			// Add current machine
			if (!currentMachine) {
				await this.userDataSyncMachinesService.addCurrentMachine(manifest || undefined);
			}

		} catch (e) {
			this.logService.error(e);
			error = e;
		}

		this._onDidFinishSync.fire(error);
	}

	register<T extends IDisposaBle>(t: T): T {
		return super._register(t);
	}

}
