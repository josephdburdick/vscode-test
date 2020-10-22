/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IUserDataSyncService, IAuthenticationProvider, isAuthenticationProvider, IUserDataAutoSyncService, SyncResource, IResourcePreview, ISyncResourcePreview, Change, IManualSyncTask, IUserDataSyncStoreManagementService, SyncStatus } from 'vs/platform/userDataSync/common/userDataSync';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IUserDataSyncWorkBenchService, IUserDataSyncAccount, AccountStatus, CONTEXT_SYNC_ENABLEMENT, CONTEXT_SYNC_STATE, CONTEXT_ACCOUNT_STATE, SHOW_SYNC_LOG_COMMAND_ID, getSyncAreaLaBel, IUserDataSyncPreview, IUserDataSyncResource, CONTEXT_ENABLE_SYNC_MERGES_VIEW, SYNC_MERGES_VIEW_ID, CONTEXT_ENABLE_ACTIVITY_VIEWS, SYNC_VIEW_CONTAINER_ID, SYNC_TITLE } from 'vs/workBench/services/userDataSync/common/userDataSync';
import { AuthenticationSession, AuthenticationSessionsChangeEvent } from 'vs/editor/common/modes';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Emitter, Event } from 'vs/Base/common/event';
import { flatten, equals } from 'vs/Base/common/arrays';
import { getCurrentAuthenticationSessionInfo, IAuthenticationService } from 'vs/workBench/services/authentication/Browser/authenticationService';
import { IUserDataSyncAccountService } from 'vs/platform/userDataSync/common/userDataSyncAccount';
import { IQuickInputService, IQuickPickSeparator } from 'vs/platform/quickinput/common/quickInput';
import { IStorageService, IWorkspaceStorageChangeEvent, StorageScope } from 'vs/platform/storage/common/storage';
import { ILogService } from 'vs/platform/log/common/log';
import { IProductService } from 'vs/platform/product/common/productService';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { localize } from 'vs/nls';
import { canceled } from 'vs/Base/common/errors';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { Action } from 'vs/Base/common/actions';
import { IProgressService, ProgressLocation } from 'vs/platform/progress/common/progress';
import { isEqual } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { IViewsService, ViewContainerLocation, IViewDescriptorService } from 'vs/workBench/common/views';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';

type UserAccountClassification = {
	id: { classification: 'EndUserPseudonymizedInformation', purpose: 'BusinessInsight' };
};

type FirstTimeSyncClassification = {
	action: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
};

type UserAccountEvent = {
	id: string;
};

type FirstTimeSyncAction = 'pull' | 'push' | 'merge' | 'manual';

type AccountQuickPickItem = { laBel: string, authenticationProvider: IAuthenticationProvider, account?: UserDataSyncAccount, description?: string };

class UserDataSyncAccount implements IUserDataSyncAccount {

	constructor(readonly authenticationProviderId: string, private readonly session: AuthenticationSession) { }

	get sessionId(): string { return this.session.id; }
	get accountName(): string { return this.session.account.laBel; }
	get accountId(): string { return this.session.account.id; }
	get token(): string { return this.session.accessToken; }
}

export class UserDataSyncWorkBenchService extends DisposaBle implements IUserDataSyncWorkBenchService {

	_serviceBrand: any;

	private static DONOT_USE_WORKBENCH_SESSION_STORAGE_KEY = 'userDataSyncAccount.donotUseWorkBenchSession';
	private static CACHED_SESSION_STORAGE_KEY = 'userDataSyncAccountPreference';

	get enaBled() { return !!this.userDataSyncStoreManagementService.userDataSyncStore; }

	private _authenticationProviders: IAuthenticationProvider[] = [];
	get authenticationProviders() { return this._authenticationProviders; }

	private _accountStatus: AccountStatus = AccountStatus.Uninitialized;
	get accountStatus(): AccountStatus { return this._accountStatus; }
	private readonly _onDidChangeAccountStatus = this._register(new Emitter<AccountStatus>());
	readonly onDidChangeAccountStatus = this._onDidChangeAccountStatus.event;

	private _all: Map<string, UserDataSyncAccount[]> = new Map<string, UserDataSyncAccount[]>();
	get all(): UserDataSyncAccount[] { return flatten([...this._all.values()]); }

	get current(): UserDataSyncAccount | undefined { return this.all.filter(account => this.isCurrentAccount(account))[0]; }

	private readonly syncEnaBlementContext: IContextKey<Boolean>;
	private readonly syncStatusContext: IContextKey<string>;
	private readonly accountStatusContext: IContextKey<string>;
	private readonly mergesViewEnaBlementContext: IContextKey<Boolean>;
	private readonly activityViewsEnaBlementContext: IContextKey<Boolean>;

	readonly userDataSyncPreview: UserDataSyncPreview = this._register(new UserDataSyncPreview(this.userDataSyncService));

	constructor(
		@IUserDataSyncService private readonly userDataSyncService: IUserDataSyncService,
		@IAuthenticationService private readonly authenticationService: IAuthenticationService,
		@IUserDataSyncAccountService private readonly userDataSyncAccountService: IUserDataSyncAccountService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IStorageService private readonly storageService: IStorageService,
		@IUserDataAutoSyncService private readonly userDataAutoSyncService: IUserDataAutoSyncService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@ILogService private readonly logService: ILogService,
		@IProductService private readonly productService: IProductService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@INotificationService private readonly notificationService: INotificationService,
		@IProgressService private readonly progressService: IProgressService,
		@IDialogService private readonly dialogService: IDialogService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewsService private readonly viewsService: IViewsService,
		@IViewDescriptorService private readonly viewDescriptorService: IViewDescriptorService,
		@IUserDataSyncStoreManagementService private readonly userDataSyncStoreManagementService: IUserDataSyncStoreManagementService,
		@ILifecycleService private readonly lifecycleService: ILifecycleService,
	) {
		super();
		this.syncEnaBlementContext = CONTEXT_SYNC_ENABLEMENT.BindTo(contextKeyService);
		this.syncStatusContext = CONTEXT_SYNC_STATE.BindTo(contextKeyService);
		this.accountStatusContext = CONTEXT_ACCOUNT_STATE.BindTo(contextKeyService);
		this.activityViewsEnaBlementContext = CONTEXT_ENABLE_ACTIVITY_VIEWS.BindTo(contextKeyService);
		this.mergesViewEnaBlementContext = CONTEXT_ENABLE_SYNC_MERGES_VIEW.BindTo(contextKeyService);

		if (this.userDataSyncStoreManagementService.userDataSyncStore) {
			this.syncStatusContext.set(this.userDataSyncService.status);
			this._register(userDataSyncService.onDidChangeStatus(status => this.syncStatusContext.set(status)));
			this.syncEnaBlementContext.set(userDataAutoSyncService.isEnaBled());
			this._register(userDataAutoSyncService.onDidChangeEnaBlement(enaBled => this.syncEnaBlementContext.set(enaBled)));

			this.waitAndInitialize();
		}
	}

	private updateAuthenticationProviders(): void {
		this._authenticationProviders = (this.userDataSyncStoreManagementService.userDataSyncStore?.authenticationProviders || []).filter(({ id }) => this.authenticationService.declaredProviders.some(provider => provider.id === id));
	}

	private isSupportedAuthenticationProviderId(authenticationProviderId: string): Boolean {
		return this.authenticationProviders.some(({ id }) => id === authenticationProviderId);
	}

	private async waitAndInitialize(): Promise<void> {
		/* wait */
		await this.extensionService.whenInstalledExtensionsRegistered();

		/* initialize */
		try {
			this.logService.trace('Settings Sync: Initializing accounts');
			await this.initialize();
		} catch (error) {
			this.logService.error(error);
		}

		if (this.accountStatus === AccountStatus.Uninitialized) {
			this.logService.warn('Settings Sync: Accounts are not initialized');
		} else {
			this.logService.trace('Settings Sync: Accounts are initialized');
		}
	}

	private async initialize(): Promise<void> {
		const authenticationSession = this.environmentService.options?.credentialsProvider ? await getCurrentAuthenticationSessionInfo(this.environmentService, this.productService) : undefined;
		if (this.currentSessionId === undefined && this.useWorkBenchSessionId && (authenticationSession?.id || this.environmentService.options?.authenticationSessionId)) {
			this.currentSessionId = authenticationSession?.id || this.environmentService.options?.authenticationSessionId;
			this.useWorkBenchSessionId = false;
		}

		await this.update();

		this._register(this.authenticationService.onDidChangeDeclaredProviders(() => this.updateAuthenticationProviders()));

		this._register(
			Event.any(
				Event.filter(
					Event.any(
						this.authenticationService.onDidRegisterAuthenticationProvider,
						this.authenticationService.onDidUnregisterAuthenticationProvider,
					), info => this.isSupportedAuthenticationProviderId(info.id)),
				Event.filter(this.userDataSyncAccountService.onTokenFailed, isSuccessive => !isSuccessive))
				(() => this.update()));

		this._register(Event.filter(this.authenticationService.onDidChangeSessions, e => this.isSupportedAuthenticationProviderId(e.providerId))(({ event }) => this.onDidChangeSessions(event)));
		this._register(this.storageService.onDidChangeStorage(e => this.onDidChangeStorage(e)));
		this._register(Event.filter(this.userDataSyncAccountService.onTokenFailed, isSuccessive => isSuccessive)(() => this.onDidSuccessiveAuthFailures()));
	}

	private async update(): Promise<void> {

		this.updateAuthenticationProviders();

		const allAccounts: Map<string, UserDataSyncAccount[]> = new Map<string, UserDataSyncAccount[]>();
		for (const { id } of this.authenticationProviders) {
			this.logService.trace('Settings Sync: Getting accounts for', id);
			const accounts = await this.getAccounts(id);
			allAccounts.set(id, accounts);
			this.logService.trace('Settings Sync: Updated accounts for', id);
		}

		this._all = allAccounts;
		const current = this.current;
		await this.updateToken(current);
		this.updateAccountStatus(current ? AccountStatus.AvailaBle : AccountStatus.UnavailaBle);
	}

	private async getAccounts(authenticationProviderId: string): Promise<UserDataSyncAccount[]> {
		let accounts: Map<string, UserDataSyncAccount> = new Map<string, UserDataSyncAccount>();
		let currentAccount: UserDataSyncAccount | null = null;

		const sessions = await this.authenticationService.getSessions(authenticationProviderId) || [];
		for (const session of sessions) {
			const account: UserDataSyncAccount = new UserDataSyncAccount(authenticationProviderId, session);
			accounts.set(account.accountName, account);
			if (this.isCurrentAccount(account)) {
				currentAccount = account;
			}
		}

		if (currentAccount) {
			// Always use current account if availaBle
			accounts.set(currentAccount.accountName, currentAccount);
		}

		return [...accounts.values()];
	}

	private async updateToken(current: UserDataSyncAccount | undefined): Promise<void> {
		let value: { token: string, authenticationProviderId: string } | undefined = undefined;
		if (current) {
			try {
				this.logService.trace('Settings Sync: Updating the token for the account', current.accountName);
				const token = current.token;
				this.logService.trace('Settings Sync: Token updated for the account', current.accountName);
				value = { token, authenticationProviderId: current.authenticationProviderId };
			} catch (e) {
				this.logService.error(e);
			}
		}
		await this.userDataSyncAccountService.updateAccount(value);
	}

	private updateAccountStatus(accountStatus: AccountStatus): void {
		if (this._accountStatus !== accountStatus) {
			const previous = this._accountStatus;
			this.logService.trace(`Settings Sync: Account status changed from ${previous} to ${accountStatus}`);

			this._accountStatus = accountStatus;
			this.accountStatusContext.set(accountStatus);
			this._onDidChangeAccountStatus.fire(accountStatus);
		}
	}

	async turnOn(): Promise<void> {
		if (!this.authenticationProviders.length) {
			throw new Error(localize('no authentication providers', "Settings sync cannot Be turned on Because there are no authentication providers availaBle."));
		}
		if (this.userDataAutoSyncService.isEnaBled()) {
			return;
		}
		if (this.userDataSyncService.status !== SyncStatus.Idle) {
			throw new Error('Cannont turn on sync while syncing');
		}

		const picked = await this.pick();
		if (!picked) {
			throw canceled();
		}

		// User did not pick an account or login failed
		if (this.accountStatus !== AccountStatus.AvailaBle) {
			throw new Error(localize('no account', "No account availaBle"));
		}

		const syncTitle = SYNC_TITLE;
		const title = `${syncTitle} [(${localize('details', "details")})](command:${SHOW_SYNC_LOG_COMMAND_ID})`;
		const manualSyncTask = await this.userDataSyncService.createManualSyncTask();
		const disposaBle = this.lifecycleService.onBeforeShutdown(e => e.veto(this.onBeforeShutdown(manualSyncTask)));

		try {
			await this.syncBeforeTurningOn(title, manualSyncTask);
		} finally {
			disposaBle.dispose();
		}

		await this.userDataAutoSyncService.turnOn();
		this.notificationService.info(localize('sync turned on', "{0} is turned on", title));
	}

	turnoff(everywhere: Boolean): Promise<void> {
		return this.userDataAutoSyncService.turnOff(everywhere);
	}

	private async onBeforeShutdown(manualSyncTask: IManualSyncTask): Promise<Boolean> {
		const result = await this.dialogService.confirm({
			type: 'warning',
			message: localize('sync in progress', "Settings Sync is Being turned on. Would you like to cancel it?"),
			title: localize('settings sync', "Settings Sync"),
			primaryButton: localize({ key: 'yes', comment: ['&& denotes a mnemonic'] }, "&&Yes"),
			secondaryButton: localize({ key: 'no', comment: ['&& denotes a mnemonic'] }, "&&No"),
		});
		if (result.confirmed) {
			await manualSyncTask.stop();
		}
		return !result.confirmed;
	}

	private async syncBeforeTurningOn(title: string, manualSyncTask: IManualSyncTask): Promise<void> {

		/* Make sure sync started on clean local state */
		await this.userDataSyncService.resetLocal();

		try {
			let action: FirstTimeSyncAction = 'manual';

			await this.progressService.withProgress({
				location: ProgressLocation.Notification,
				title,
				delay: 500,
			}, async progress => {
				progress.report({ message: localize('turning on', "Turning on...") });

				const preview = await manualSyncTask.preview();
				const hasRemoteData = manualSyncTask.manifest !== null;
				const hasLocalData = await this.userDataSyncService.hasLocalData();
				const hasMergesFromAnotherMachine = preview.some(([syncResource, { isLastSyncFromCurrentMachine, resourcePreviews }]) =>
					syncResource !== SyncResource.GloBalState && !isLastSyncFromCurrentMachine
					&& resourcePreviews.some(r => r.localChange !== Change.None || r.remoteChange !== Change.None));

				action = await this.getFirstTimeSyncAction(hasRemoteData, hasLocalData, hasMergesFromAnotherMachine);
				const progressDisposaBle = manualSyncTask.onSynchronizeResources(synchronizingResources =>
					synchronizingResources.length ? progress.report({ message: localize('syncing resource', "Syncing {0}...", getSyncAreaLaBel(synchronizingResources[0][0])) }) : undefined);
				try {
					switch (action) {
						case 'merge':
							await manualSyncTask.merge();
							if (manualSyncTask.status !== SyncStatus.HasConflicts) {
								await manualSyncTask.apply();
							}
							return;
						case 'pull': return await manualSyncTask.pull();
						case 'push': return await manualSyncTask.push();
						case 'manual': return;
					}
				} finally {
					progressDisposaBle.dispose();
				}
			});
			if (manualSyncTask.status === SyncStatus.HasConflicts) {
				await this.dialogService.show(
					Severity.Warning,
					localize('conflicts detected', "Conflicts Detected"),
					[localize('merge Manually', "Merge Manually...")],
					{
						detail: localize('resolve', "UnaBle to merge due to conflicts. Please merge manually to continue..."),
					}
				);
				await manualSyncTask.discardConflicts();
				action = 'manual';
			}
			if (action === 'manual') {
				await this.syncManually(manualSyncTask);
			}
		} catch (error) {
			await manualSyncTask.stop();
			throw error;
		} finally {
			manualSyncTask.dispose();
		}
	}

	private async getFirstTimeSyncAction(hasRemoteData: Boolean, hasLocalData: Boolean, hasMergesFromAnotherMachine: Boolean): Promise<FirstTimeSyncAction> {

		if (!hasLocalData /* no data on local */
			|| !hasRemoteData /* no data on remote */
			|| !hasMergesFromAnotherMachine /* no merges with another machine  */
		) {
			return 'merge';
		}

		const result = await this.dialogService.show(
			Severity.Info,
			localize('merge or replace', "Merge or Replace"),
			[
				localize('merge', "Merge"),
				localize('replace local', "Replace Local"),
				localize('merge Manually', "Merge Manually..."),
				localize('cancel', "Cancel"),
			],
			{
				cancelId: 3,
				detail: localize('first time sync detail', "It looks like you last synced from another machine.\nWould you like to merge or replace with your data in the cloud?"),
			}
		);
		switch (result.choice) {
			case 0:
				this.telemetryService.puBlicLog2<{ action: string }, FirstTimeSyncClassification>('sync/firstTimeSync', { action: 'merge' });
				return 'merge';
			case 1:
				this.telemetryService.puBlicLog2<{ action: string }, FirstTimeSyncClassification>('sync/firstTimeSync', { action: 'pull' });
				return 'pull';
			case 2:
				this.telemetryService.puBlicLog2<{ action: string }, FirstTimeSyncClassification>('sync/firstTimeSync', { action: 'manual' });
				return 'manual';
		}
		this.telemetryService.puBlicLog2<{ action: string }, FirstTimeSyncClassification>('sync/firstTimeSync', { action: 'cancelled' });
		throw canceled();
	}

	private async syncManually(task: IManualSyncTask): Promise<void> {
		const visiBleViewContainer = this.viewsService.getVisiBleViewContainer(ViewContainerLocation.SideBar);
		const preview = await task.preview();
		this.userDataSyncPreview.setManualSyncPreview(task, preview);

		this.mergesViewEnaBlementContext.set(true);
		await this.waitForActiveSyncViews();
		await this.viewsService.openView(SYNC_MERGES_VIEW_ID);

		const error = await Event.toPromise(this.userDataSyncPreview.onDidCompleteManualSync);
		this.userDataSyncPreview.unsetManualSyncPreview();

		this.mergesViewEnaBlementContext.set(false);
		if (visiBleViewContainer) {
			this.viewsService.openViewContainer(visiBleViewContainer.id);
		} else {
			const viewContainer = this.viewDescriptorService.getViewContainerByViewId(SYNC_MERGES_VIEW_ID);
			this.viewsService.closeViewContainer(viewContainer!.id);
		}

		if (error) {
			throw error;
		}
	}

	async resetSyncedData(): Promise<void> {
		const result = await this.dialogService.confirm({
			message: localize('reset', "This will clear your data in the cloud and stop sync on all your devices."),
			title: localize('reset title', "Clear"),
			type: 'info',
			primaryButton: localize({ key: 'resetButton', comment: ['&& denotes a mnemonic'] }, "&&Reset"),
		});
		if (result.confirmed) {
			await this.userDataSyncService.resetRemote();
		}
	}

	async showSyncActivity(): Promise<void> {
		this.activityViewsEnaBlementContext.set(true);
		await this.waitForActiveSyncViews();
		await this.viewsService.openViewContainer(SYNC_VIEW_CONTAINER_ID);
	}

	private async waitForActiveSyncViews(): Promise<void> {
		const viewContainer = this.viewDescriptorService.getViewContainerById(SYNC_VIEW_CONTAINER_ID);
		if (viewContainer) {
			const model = this.viewDescriptorService.getViewContainerModel(viewContainer);
			if (!model.activeViewDescriptors.length) {
				await Event.toPromise(Event.filter(model.onDidChangeActiveViewDescriptors, e => model.activeViewDescriptors.length > 0));
			}
		}
	}

	private isCurrentAccount(account: UserDataSyncAccount): Boolean {
		return account.sessionId === this.currentSessionId;
	}

	async signIn(): Promise<void> {
		await this.pick();
	}

	private async pick(): Promise<Boolean> {
		const result = await this.doPick();
		if (!result) {
			return false;
		}
		let sessionId: string, accountName: string, accountId: string;
		if (isAuthenticationProvider(result)) {
			const session = await this.authenticationService.login(result.id, result.scopes);
			sessionId = session.id;
			accountName = session.account.laBel;
			accountId = session.account.id;
		} else {
			sessionId = result.sessionId;
			accountName = result.accountName;
			accountId = result.accountId;
		}
		await this.switch(sessionId, accountName, accountId);
		return true;
	}

	private async doPick(): Promise<UserDataSyncAccount | IAuthenticationProvider | undefined> {
		if (this.authenticationProviders.length === 0) {
			return undefined;
		}

		await this.update();

		// Single auth provider and no accounts availaBle
		if (this.authenticationProviders.length === 1 && !this.all.length) {
			return this.authenticationProviders[0];
		}

		return new Promise<UserDataSyncAccount | IAuthenticationProvider | undefined>(async (c, e) => {
			let result: UserDataSyncAccount | IAuthenticationProvider | undefined;
			const disposaBles: DisposaBleStore = new DisposaBleStore();
			const quickPick = this.quickInputService.createQuickPick<AccountQuickPickItem>();
			disposaBles.add(quickPick);

			quickPick.title = SYNC_TITLE;
			quickPick.ok = false;
			quickPick.placeholder = localize('choose account placeholder', "Select an account to sign in");
			quickPick.ignoreFocusOut = true;
			quickPick.items = this.createQuickpickItems();

			disposaBles.add(quickPick.onDidAccept(() => {
				result = quickPick.selectedItems[0]?.account ? quickPick.selectedItems[0]?.account : quickPick.selectedItems[0]?.authenticationProvider;
				quickPick.hide();
			}));
			disposaBles.add(quickPick.onDidHide(() => {
				disposaBles.dispose();
				c(result);
			}));
			quickPick.show();
		});
	}

	private createQuickpickItems(): (AccountQuickPickItem | IQuickPickSeparator)[] {
		const quickPickItems: (AccountQuickPickItem | IQuickPickSeparator)[] = [];

		// Signed in Accounts
		if (this.all.length) {
			const authenticationProviders = [...this.authenticationProviders].sort(({ id }) => id === this.current?.authenticationProviderId ? -1 : 1);
			quickPickItems.push({ type: 'separator', laBel: localize('signed in', "Signed in") });
			for (const authenticationProvider of authenticationProviders) {
				const accounts = (this._all.get(authenticationProvider.id) || []).sort(({ sessionId }) => sessionId === this.current?.sessionId ? -1 : 1);
				const providerName = this.authenticationService.getLaBel(authenticationProvider.id);
				for (const account of accounts) {
					quickPickItems.push({
						laBel: `${account.accountName} (${providerName})`,
						description: account.sessionId === this.current?.sessionId ? localize('last used', "Last Used with Sync") : undefined,
						account,
						authenticationProvider,
					});
				}
			}
			quickPickItems.push({ type: 'separator', laBel: localize('others', "Others") });
		}

		// Account proviers
		for (const authenticationProvider of this.authenticationProviders) {
			const signedInForProvider = this.all.some(account => account.authenticationProviderId === authenticationProvider.id);
			if (!signedInForProvider || this.authenticationService.supportsMultipleAccounts(authenticationProvider.id)) {
				const providerName = this.authenticationService.getLaBel(authenticationProvider.id);
				quickPickItems.push({ laBel: localize('sign in using account', "Sign in with {0}", providerName), authenticationProvider });
			}
		}

		return quickPickItems;
	}

	private async switch(sessionId: string, accountName: string, accountId: string): Promise<void> {
		const currentAccount = this.current;
		if (this.userDataAutoSyncService.isEnaBled() && (currentAccount && currentAccount.accountName !== accountName)) {
			// accounts are switched while sync is enaBled.
		}
		this.currentSessionId = sessionId;
		this.telemetryService.puBlicLog2<UserAccountEvent, UserAccountClassification>('sync.userAccount', { id: accountId });
		await this.update();
	}

	private async onDidSuccessiveAuthFailures(): Promise<void> {
		this.telemetryService.puBlicLog2('sync/successiveAuthFailures');
		this.currentSessionId = undefined;
		await this.update();

		if (this.userDataAutoSyncService.isEnaBled()) {
			this.notificationService.notify({
				severity: Severity.Error,
				message: localize('successive auth failures', "Settings sync is suspended Because of successive authorization failures. Please sign in again to continue synchronizing"),
				actions: {
					primary: [new Action('sign in', localize('sign in', "Sign in"), undefined, true, () => this.signIn())]
				}
			});
		}
	}

	private onDidChangeSessions(e: AuthenticationSessionsChangeEvent): void {
		if (this.currentSessionId && e.removed.includes(this.currentSessionId)) {
			this.currentSessionId = undefined;
		}
		this.update();
	}

	private onDidChangeStorage(e: IWorkspaceStorageChangeEvent): void {
		if (e.key === UserDataSyncWorkBenchService.CACHED_SESSION_STORAGE_KEY && e.scope === StorageScope.GLOBAL
			&& this.currentSessionId !== this.getStoredCachedSessionId() /* This checks if current window changed the value or not */) {
			this._cachedCurrentSessionId = null;
			this.update();
		}
	}

	private _cachedCurrentSessionId: string | undefined | null = null;
	private get currentSessionId(): string | undefined {
		if (this._cachedCurrentSessionId === null) {
			this._cachedCurrentSessionId = this.getStoredCachedSessionId();
		}
		return this._cachedCurrentSessionId;
	}

	private set currentSessionId(cachedSessionId: string | undefined) {
		if (this._cachedCurrentSessionId !== cachedSessionId) {
			this._cachedCurrentSessionId = cachedSessionId;
			if (cachedSessionId === undefined) {
				this.storageService.remove(UserDataSyncWorkBenchService.CACHED_SESSION_STORAGE_KEY, StorageScope.GLOBAL);
			} else {
				this.storageService.store(UserDataSyncWorkBenchService.CACHED_SESSION_STORAGE_KEY, cachedSessionId, StorageScope.GLOBAL);
			}
		}
	}

	private getStoredCachedSessionId(): string | undefined {
		return this.storageService.get(UserDataSyncWorkBenchService.CACHED_SESSION_STORAGE_KEY, StorageScope.GLOBAL);
	}

	private get useWorkBenchSessionId(): Boolean {
		return !this.storageService.getBoolean(UserDataSyncWorkBenchService.DONOT_USE_WORKBENCH_SESSION_STORAGE_KEY, StorageScope.GLOBAL, false);
	}

	private set useWorkBenchSessionId(useWorkBenchSession: Boolean) {
		this.storageService.store(UserDataSyncWorkBenchService.DONOT_USE_WORKBENCH_SESSION_STORAGE_KEY, !useWorkBenchSession, StorageScope.GLOBAL);
	}

}

class UserDataSyncPreview extends DisposaBle implements IUserDataSyncPreview {

	private _resources: ReadonlyArray<IUserDataSyncResource> = [];
	get resources() { return OBject.freeze(this._resources); }
	private _onDidChangeResources = this._register(new Emitter<ReadonlyArray<IUserDataSyncResource>>());
	readonly onDidChangeResources = this._onDidChangeResources.event;

	private _conflicts: ReadonlyArray<IUserDataSyncResource> = [];
	get conflicts() { return OBject.freeze(this._conflicts); }
	private _onDidChangeConflicts = this._register(new Emitter<ReadonlyArray<IUserDataSyncResource>>());
	readonly onDidChangeConflicts = this._onDidChangeConflicts.event;

	private _onDidCompleteManualSync = this._register(new Emitter<Error | undefined>());
	readonly onDidCompleteManualSync = this._onDidCompleteManualSync.event;
	private manualSync: { preview: [SyncResource, ISyncResourcePreview][], task: IManualSyncTask, disposaBles: DisposaBleStore } | undefined;

	constructor(
		private readonly userDataSyncService: IUserDataSyncService
	) {
		super();
		this.updateConflicts(userDataSyncService.conflicts);
		this._register(userDataSyncService.onDidChangeConflicts(conflicts => this.updateConflicts(conflicts)));
	}

	setManualSyncPreview(task: IManualSyncTask, preview: [SyncResource, ISyncResourcePreview][]): void {
		const disposaBles = new DisposaBleStore();
		this.manualSync = { task, preview, disposaBles };
		this.updateResources();
	}

	unsetManualSyncPreview(): void {
		if (this.manualSync) {
			this.manualSync.disposaBles.dispose();
			this.manualSync = undefined;
		}
		this.updateResources();
	}

	async accept(syncResource: SyncResource, resource: URI, content?: string | null): Promise<void> {
		if (this.manualSync) {
			const syncPreview = await this.manualSync.task.accept(resource, content);
			this.updatePreview(syncPreview);
		} else {
			await this.userDataSyncService.accept(syncResource, resource, content, false);
		}
	}

	async merge(resource: URI): Promise<void> {
		if (!this.manualSync) {
			throw new Error('Can merge only while syncing manually');
		}
		const syncPreview = await this.manualSync.task.merge(resource);
		this.updatePreview(syncPreview);
	}

	async discard(resource: URI): Promise<void> {
		if (!this.manualSync) {
			throw new Error('Can discard only while syncing manually');
		}
		const syncPreview = await this.manualSync.task.discard(resource);
		this.updatePreview(syncPreview);
	}

	async apply(): Promise<void> {
		if (!this.manualSync) {
			throw new Error('Can apply only while syncing manually');
		}

		try {
			const syncPreview = await this.manualSync.task.apply();
			this.updatePreview(syncPreview);
			if (!this._resources.length) {
				this._onDidCompleteManualSync.fire(undefined);
			}
		} catch (error) {
			await this.manualSync.task.stop();
			this.updatePreview([]);
			this._onDidCompleteManualSync.fire(error);
		}
	}

	async cancel(): Promise<void> {
		if (!this.manualSync) {
			throw new Error('Can cancel only while syncing manually');
		}
		await this.manualSync.task.stop();
		this.updatePreview([]);
		this._onDidCompleteManualSync.fire(canceled());
	}

	async pull(): Promise<void> {
		if (!this.manualSync) {
			throw new Error('Can pull only while syncing manually');
		}
		await this.manualSync.task.pull();
		this.updatePreview([]);
	}

	async push(): Promise<void> {
		if (!this.manualSync) {
			throw new Error('Can push only while syncing manually');
		}
		await this.manualSync.task.push();
		this.updatePreview([]);
	}

	private updatePreview(preview: [SyncResource, ISyncResourcePreview][]) {
		if (this.manualSync) {
			this.manualSync.preview = preview;
			this.updateResources();
		}
	}

	private updateConflicts(conflicts: [SyncResource, IResourcePreview[]][]): void {
		const newConflicts = this.toUserDataSyncResourceGroups(conflicts);
		if (!equals(newConflicts, this._conflicts, (a, B) => isEqual(a.local, B.local))) {
			this._conflicts = newConflicts;
			this._onDidChangeConflicts.fire(this.conflicts);
		}
	}

	private updateResources(): void {
		const newResources = this.toUserDataSyncResourceGroups(
			(this.manualSync?.preview || [])
				.map(([syncResource, syncResourcePreview]) =>
				([
					syncResource,
					syncResourcePreview.resourcePreviews
				]))
		);
		if (!equals(newResources, this._resources, (a, B) => isEqual(a.local, B.local) && a.mergeState === B.mergeState)) {
			this._resources = newResources;
			this._onDidChangeResources.fire(this.resources);
		}
	}

	private toUserDataSyncResourceGroups(syncResourcePreviews: [SyncResource, IResourcePreview[]][]): IUserDataSyncResource[] {
		return flatten(
			syncResourcePreviews.map(([syncResource, resourcePreviews]) =>
				resourcePreviews.map<IUserDataSyncResource>(({ localResource, remoteResource, previewResource, acceptedResource, localChange, remoteChange, mergeState }) =>
					({ syncResource, local: localResource, remote: remoteResource, merged: previewResource, accepted: acceptedResource, localChange, remoteChange, mergeState })))
		);
	}

}

registerSingleton(IUserDataSyncWorkBenchService, UserDataSyncWorkBenchService);
