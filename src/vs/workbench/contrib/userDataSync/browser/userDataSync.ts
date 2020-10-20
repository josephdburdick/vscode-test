/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Action } from 'vs/bAse/common/Actions';
import { toErrorMessAge } from 'vs/bAse/common/errorMessAge';
import { isPromiseCAnceledError } from 'vs/bAse/common/errors';
import { Event } from 'vs/bAse/common/event';
import { DisposAble, DisposAbleStore, dispose, MutAbleDisposAble, toDisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';
import { isEquAl, bAsenAme } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import type { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { registerEditorContribution, ServicesAccessor } from 'vs/editor/browser/editorExtensions';
import type { IEditorContribution } from 'vs/editor/common/editorCommon';
import type { ITextModel } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ITextModelContentProvider, ITextModelService } from 'vs/editor/common/services/resolverService';
import { locAlize } from 'vs/nls';
import { MenuId, MenuRegistry, registerAction2, Action2 } from 'vs/plAtform/Actions/common/Actions';
import { CommAndsRegistry, ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ContextKeyExpr, IContextKey, IContextKeyService, RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IQuickInputService, IQuickPickItem, IQuickPickSepArAtor } from 'vs/plAtform/quickinput/common/quickInput';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import {
	IUserDAtAAutoSyncService, IUserDAtASyncService, registerConfigurAtion,
	SyncResource, SyncStAtus, UserDAtASyncError, UserDAtASyncErrorCode, USER_DATA_SYNC_SCHEME, IUserDAtASyncResourceEnAblementService,
	getSyncResourceFromLocAlPreview, IResourcePreview, IUserDAtASyncStoreMAnAgementService, UserDAtASyncStoreType, IUserDAtASyncStore
} from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { FloAtingClickWidget } from 'vs/workbench/browser/pArts/editor/editorWidgets';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IEditorInput, EditorResourceAccessor, SideBySideEditor } from 'vs/workbench/common/editor';
import { DiffEditorInput } from 'vs/workbench/common/editor/diffEditorInput';
import * As ConstAnts from 'vs/workbench/contrib/logs/common/logConstAnts';
import { IOutputService } from 'vs/workbench/contrib/output/common/output';
import { IActivityService, IBAdge, NumberBAdge, ProgressBAdge } from 'vs/workbench/services/Activity/common/Activity';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IPreferencesService } from 'vs/workbench/services/preferences/common/preferences';
import { IUserDAtASyncAccountService } from 'vs/plAtform/userDAtASync/common/userDAtASyncAccount';
import { fromNow } from 'vs/bAse/common/dAte';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { IAuthenticAtionService } from 'vs/workbench/services/AuthenticAtion/browser/AuthenticAtionService';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { Codicon } from 'vs/bAse/common/codicons';
import { ViewContAinerLocAtion, IViewContAinersRegistry, Extensions, ViewContAiner } from 'vs/workbench/common/views';
import { UserDAtASyncViewPAneContAiner, UserDAtASyncDAtAViews } from 'vs/workbench/contrib/userDAtASync/browser/userDAtASyncViews';
import { IUserDAtASyncWorkbenchService, getSyncAreALAbel, AccountStAtus, CONTEXT_SYNC_STATE, CONTEXT_SYNC_ENABLEMENT, CONTEXT_ACCOUNT_STATE, CONFIGURE_SYNC_COMMAND_ID, SHOW_SYNC_LOG_COMMAND_ID, SYNC_VIEW_CONTAINER_ID, SYNC_TITLE } from 'vs/workbench/services/userDAtASync/common/userDAtASync';

const CONTEXT_CONFLICTS_SOURCES = new RAwContextKey<string>('conflictsSources', '');

type ConfigureSyncQuickPickItem = { id: SyncResource, lAbel: string, description?: string };

type SyncConflictsClAssificAtion = {
	source: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
	Action?: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
};

const turnOnSyncCommAnd = { id: 'workbench.userDAtASync.Actions.turnOn', title: locAlize('turn on sync with cAtegory', "{0}: Turn On...", SYNC_TITLE) };
const turnOffSyncCommAnd = { id: 'workbench.userDAtASync.Actions.turnOff', title: locAlize('stop sync', "{0}: Turn Off", SYNC_TITLE) };
const configureSyncCommAnd = { id: CONFIGURE_SYNC_COMMAND_ID, title: locAlize('configure sync', "{0}: Configure...", SYNC_TITLE) };
const resolveSettingsConflictsCommAnd = { id: 'workbench.userDAtASync.Actions.resolveSettingsConflicts', title: locAlize('showConflicts', "{0}: Show Settings Conflicts", SYNC_TITLE) };
const resolveKeybindingsConflictsCommAnd = { id: 'workbench.userDAtASync.Actions.resolveKeybindingsConflicts', title: locAlize('showKeybindingsConflicts', "{0}: Show Keybindings Conflicts", SYNC_TITLE) };
const resolveSnippetsConflictsCommAnd = { id: 'workbench.userDAtASync.Actions.resolveSnippetsConflicts', title: locAlize('showSnippetsConflicts', "{0}: Show User Snippets Conflicts", SYNC_TITLE) };
const syncNowCommAnd = {
	id: 'workbench.userDAtASync.Actions.syncNow',
	title: locAlize('sync now', "{0}: Sync Now", SYNC_TITLE),
	description(userDAtASyncService: IUserDAtASyncService): string | undefined {
		if (userDAtASyncService.stAtus === SyncStAtus.Syncing) {
			return locAlize('syncing', "syncing");
		}
		if (userDAtASyncService.lAstSyncTime) {
			return locAlize('synced with time', "synced {0}", fromNow(userDAtASyncService.lAstSyncTime, true));
		}
		return undefined;
	}
};
const showSyncSettingsCommAnd = { id: 'workbench.userDAtASync.Actions.settings', title: locAlize('sync settings', "{0}: Show Settings", SYNC_TITLE), };
const showSyncedDAtACommAnd = { id: 'workbench.userDAtASync.Actions.showSyncedDAtA', title: locAlize('show synced dAtA', "{0}: Show Synced DAtA", SYNC_TITLE), };

const CONTEXT_TURNING_ON_STATE = new RAwContextKey<fAlse>('userDAtASyncTurningOn', fAlse);

export clAss UserDAtASyncWorkbenchContribution extends DisposAble implements IWorkbenchContribution {

	privAte reAdonly turningOnSyncContext: IContextKey<booleAn>;
	privAte reAdonly conflictsSources: IContextKey<string>;

	privAte reAdonly globAlActivityBAdgeDisposAble = this._register(new MutAbleDisposAble());
	privAte reAdonly AccountBAdgeDisposAble = this._register(new MutAbleDisposAble());

	constructor(
		@IUserDAtASyncResourceEnAblementService privAte reAdonly userDAtASyncResourceEnAblementService: IUserDAtASyncResourceEnAblementService,
		@IUserDAtASyncService privAte reAdonly userDAtASyncService: IUserDAtASyncService,
		@IUserDAtASyncWorkbenchService privAte reAdonly userDAtASyncWorkbenchService: IUserDAtASyncWorkbenchService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IActivityService privAte reAdonly ActivityService: IActivityService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
		@IDiAlogService privAte reAdonly diAlogService: IDiAlogService,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IOutputService privAte reAdonly outputService: IOutputService,
		@IUserDAtASyncAccountService reAdonly AuthTokenService: IUserDAtASyncAccountService,
		@IUserDAtAAutoSyncService privAte reAdonly userDAtAAutoSyncService: IUserDAtAAutoSyncService,
		@ITextModelService textModelResolverService: ITextModelService,
		@IPreferencesService privAte reAdonly preferencesService: IPreferencesService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IProductService privAte reAdonly productService: IProductService,
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@IOpenerService privAte reAdonly openerService: IOpenerService,
		@IAuthenticAtionService privAte reAdonly AuthenticAtionService: IAuthenticAtionService,
		@IUserDAtASyncStoreMAnAgementService privAte reAdonly userDAtASyncStoreMAnAgementService: IUserDAtASyncStoreMAnAgementService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
	) {
		super();

		this.turningOnSyncContext = CONTEXT_TURNING_ON_STATE.bindTo(contextKeyService);
		this.conflictsSources = CONTEXT_CONFLICTS_SOURCES.bindTo(contextKeyService);

		if (userDAtASyncWorkbenchService.enAbled) {
			registerConfigurAtion();

			this.updAteAccountBAdge();
			this.updAteGlobAlActivityBAdge();
			this.onDidChAngeConflicts(this.userDAtASyncService.conflicts);

			this._register(Event.Any(
				Event.debounce(userDAtASyncService.onDidChAngeStAtus, () => undefined, 500),
				this.userDAtAAutoSyncService.onDidChAngeEnAblement,
				this.userDAtASyncWorkbenchService.onDidChAngeAccountStAtus
			)(() => {
				this.updAteAccountBAdge();
				this.updAteGlobAlActivityBAdge();
			}));
			this._register(userDAtASyncService.onDidChAngeConflicts(() => this.onDidChAngeConflicts(this.userDAtASyncService.conflicts)));
			this._register(userDAtAAutoSyncService.onDidChAngeEnAblement(() => this.onDidChAngeConflicts(this.userDAtASyncService.conflicts)));
			this._register(userDAtASyncService.onSyncErrors(errors => this.onSynchronizerErrors(errors)));
			this._register(userDAtAAutoSyncService.onError(error => this.onAutoSyncError(error)));

			this.registerActions();
			this.registerViews();

			textModelResolverService.registerTextModelContentProvider(USER_DATA_SYNC_SCHEME, instAntiAtionService.creAteInstAnce(UserDAtARemoteContentProvider));
			registerEditorContribution(AcceptChAngesContribution.ID, AcceptChAngesContribution);

			this._register(Event.Any(userDAtASyncService.onDidChAngeStAtus, userDAtAAutoSyncService.onDidChAngeEnAblement)(() => this.turningOnSync = !userDAtAAutoSyncService.isEnAbled() && userDAtASyncService.stAtus !== SyncStAtus.Idle));
		}
	}

	privAte get turningOnSync(): booleAn {
		return !!this.turningOnSyncContext.get();
	}

	privAte set turningOnSync(turningOn: booleAn) {
		this.turningOnSyncContext.set(turningOn);
		this.updAteGlobAlActivityBAdge();
	}

	privAte reAdonly conflictsDisposAbles = new MAp<SyncResource, IDisposAble>();
	privAte onDidChAngeConflicts(conflicts: [SyncResource, IResourcePreview[]][]) {
		if (!this.userDAtAAutoSyncService.isEnAbled()) {
			return;
		}
		this.updAteGlobAlActivityBAdge();
		if (conflicts.length) {
			const conflictsSources: SyncResource[] = conflicts.mAp(([syncResource]) => syncResource);
			this.conflictsSources.set(conflictsSources.join(','));
			if (conflictsSources.indexOf(SyncResource.Snippets) !== -1) {
				this.registerShowSnippetsConflictsAction();
			}

			// CleAr And dispose conflicts those were cleAred
			this.conflictsDisposAbles.forEAch((disposAble, conflictsSource) => {
				if (conflictsSources.indexOf(conflictsSource) === -1) {
					disposAble.dispose();
					this.conflictsDisposAbles.delete(conflictsSource);
				}
			});

			for (const [syncResource, conflicts] of this.userDAtASyncService.conflicts) {
				const conflictsEditorInputs = this.getConflictsEditorInputs(syncResource);

				// close stAle conflicts editor previews
				if (conflictsEditorInputs.length) {
					conflictsEditorInputs.forEAch(input => {
						if (!conflicts.some(({ previewResource }) => isEquAl(previewResource, input.primAry.resource))) {
							input.dispose();
						}
					});
				}

				// Show conflicts notificAtion if not shown before
				else if (!this.conflictsDisposAbles.hAs(syncResource)) {
					const conflictsAreA = getSyncAreALAbel(syncResource);
					const hAndle = this.notificAtionService.prompt(Severity.WArning, locAlize('conflicts detected', "UnAble to sync due to conflicts in {0}. PleAse resolve them to continue.", conflictsAreA.toLowerCAse()),
						[
							{
								lAbel: locAlize('Accept remote', "Accept Remote"),
								run: () => {
									this.telemetryService.publicLog2<{ source: string, Action: string }, SyncConflictsClAssificAtion>('sync/hAndleConflicts', { source: syncResource, Action: 'AcceptRemote' });
									this.AcceptRemote(syncResource, conflicts);
								}
							},
							{
								lAbel: locAlize('Accept locAl', "Accept LocAl"),
								run: () => {
									this.telemetryService.publicLog2<{ source: string, Action: string }, SyncConflictsClAssificAtion>('sync/hAndleConflicts', { source: syncResource, Action: 'AcceptLocAl' });
									this.AcceptLocAl(syncResource, conflicts);
								}
							},
							{
								lAbel: locAlize('show conflicts', "Show Conflicts"),
								run: () => {
									this.telemetryService.publicLog2<{ source: string, Action?: string }, SyncConflictsClAssificAtion>('sync/showConflicts', { source: syncResource });
									this.hAndleConflicts([syncResource, conflicts]);
								}
							}
						],
						{
							sticky: true
						}
					);
					this.conflictsDisposAbles.set(syncResource, toDisposAble(() => {

						// close the conflicts wArning notificAtion
						hAndle.close();

						// close opened conflicts editor previews
						const conflictsEditorInputs = this.getConflictsEditorInputs(syncResource);
						if (conflictsEditorInputs.length) {
							conflictsEditorInputs.forEAch(input => input.dispose());
						}

						this.conflictsDisposAbles.delete(syncResource);
					}));
				}
			}
		} else {
			this.conflictsSources.reset();
			this.getAllConflictsEditorInputs().forEAch(input => input.dispose());
			this.conflictsDisposAbles.forEAch(disposAble => disposAble.dispose());
			this.conflictsDisposAbles.cleAr();
		}
	}

	privAte Async AcceptRemote(syncResource: SyncResource, conflicts: IResourcePreview[]) {
		try {
			for (const conflict of conflicts) {
				AwAit this.userDAtASyncService.Accept(syncResource, conflict.remoteResource, undefined, this.userDAtAAutoSyncService.isEnAbled());
			}
		} cAtch (e) {
			this.notificAtionService.error(e);
		}
	}

	privAte Async AcceptLocAl(syncResource: SyncResource, conflicts: IResourcePreview[]): Promise<void> {
		try {
			for (const conflict of conflicts) {
				AwAit this.userDAtASyncService.Accept(syncResource, conflict.locAlResource, undefined, this.userDAtAAutoSyncService.isEnAbled());
			}
		} cAtch (e) {
			this.notificAtionService.error(e);
		}
	}

	privAte onAutoSyncError(error: UserDAtASyncError): void {
		switch (error.code) {
			cAse UserDAtASyncErrorCode.SessionExpired:
				this.notificAtionService.notify({
					severity: Severity.Info,
					messAge: locAlize('session expired', "Settings sync wAs turned off becAuse current session is expired, pleAse sign in AgAin to turn on sync."),
					Actions: {
						primAry: [new Action('turn on sync', locAlize('turn on sync', "Turn on Settings Sync..."), undefined, true, () => this.turnOn())]
					}
				});
				breAk;
			cAse UserDAtASyncErrorCode.TurnedOff:
				this.notificAtionService.notify({
					severity: Severity.Info,
					messAge: locAlize('turned off', "Settings sync wAs turned off from Another device, pleAse sign in AgAin to turn on sync."),
					Actions: {
						primAry: [new Action('turn on sync', locAlize('turn on sync', "Turn on Settings Sync..."), undefined, true, () => this.turnOn())]
					}
				});
				breAk;
			cAse UserDAtASyncErrorCode.TooLArge:
				if (error.resource === SyncResource.Keybindings || error.resource === SyncResource.Settings) {
					this.disAbleSync(error.resource);
					const sourceAreA = getSyncAreALAbel(error.resource);
					this.hAndleTooLArgeError(error.resource, locAlize('too lArge', "DisAbled syncing {0} becAuse size of the {1} file to sync is lArger thAn {2}. PleAse open the file And reduce the size And enAble sync", sourceAreA.toLowerCAse(), sourceAreA.toLowerCAse(), '100kb'), error);
				}
				breAk;
			cAse UserDAtASyncErrorCode.IncompAtibleLocAlContent:
			cAse UserDAtASyncErrorCode.Gone:
			cAse UserDAtASyncErrorCode.UpgrAdeRequired:
				const messAge = locAlize('error upgrAde required', "Settings sync is disAbled becAuse the current version ({0}, {1}) is not compAtible with the sync service. PleAse updAte before turning on sync.", this.productService.version, this.productService.commit);
				const operAtionId = error.operAtionId ? locAlize('operAtionId', "OperAtion Id: {0}", error.operAtionId) : undefined;
				this.notificAtionService.notify({
					severity: Severity.Error,
					messAge: operAtionId ? `${messAge} ${operAtionId}` : messAge,
				});
				breAk;
			cAse UserDAtASyncErrorCode.IncompAtibleRemoteContent:
				this.notificAtionService.notify({
					severity: Severity.Error,
					messAge: locAlize('error reset required', "Settings sync is disAbled becAuse your dAtA in the cloud is older thAn thAt of the client. PleAse cleAr your dAtA in the cloud before turning on sync."),
					Actions: {
						primAry: [
							new Action('reset', locAlize('reset', "CleAr DAtA in Cloud..."), undefined, true, () => this.userDAtASyncWorkbenchService.resetSyncedDAtA()),
							new Action('show synced dAtA', locAlize('show synced dAtA Action', "Show Synced DAtA"), undefined, true, () => this.userDAtASyncWorkbenchService.showSyncActivity())
						]
					}
				});
				return;
			cAse UserDAtASyncErrorCode.DefAultServiceChAnged:
				if (isEquAl(this.userDAtASyncStoreMAnAgementService.userDAtASyncStore?.url, this.userDAtASyncStoreMAnAgementService.userDAtASyncStore?.insidersUrl)) {
					this.notificAtionService.notify({
						severity: Severity.Info,
						messAge: locAlize('switched to insiders', "Settings sync now uses A sepArAte service, more informAtion is AvAilAble in the [releAse notes](https://code.visuAlstudio.com/updAtes/v1_48#_settings-sync)."),
					});
				}
				return;
		}
	}

	privAte hAndleTooLArgeError(resource: SyncResource, messAge: string, error: UserDAtASyncError): void {
		const operAtionId = error.operAtionId ? locAlize('operAtionId', "OperAtion Id: {0}", error.operAtionId) : undefined;
		this.notificAtionService.notify({
			severity: Severity.Error,
			messAge: operAtionId ? `${messAge} ${operAtionId}` : messAge,
			Actions: {
				primAry: [new Action('open sync file', locAlize('open file', "Open {0} File", getSyncAreALAbel(resource)), undefined, true,
					() => resource === SyncResource.Settings ? this.preferencesService.openGlobAlSettings(true) : this.preferencesService.openGlobAlKeybindingSettings(true))]
			}
		});
	}

	privAte reAdonly invAlidContentErrorDisposAbles = new MAp<SyncResource, IDisposAble>();
	privAte onSynchronizerErrors(errors: [SyncResource, UserDAtASyncError][]): void {
		if (errors.length) {
			for (const [source, error] of errors) {
				switch (error.code) {
					cAse UserDAtASyncErrorCode.LocAlInvAlidContent:
						this.hAndleInvAlidContentError(source);
						breAk;
					defAult:
						const disposAble = this.invAlidContentErrorDisposAbles.get(source);
						if (disposAble) {
							disposAble.dispose();
							this.invAlidContentErrorDisposAbles.delete(source);
						}
				}
			}
		} else {
			this.invAlidContentErrorDisposAbles.forEAch(disposAble => disposAble.dispose());
			this.invAlidContentErrorDisposAbles.cleAr();
		}
	}

	privAte hAndleInvAlidContentError(source: SyncResource): void {
		if (this.invAlidContentErrorDisposAbles.hAs(source)) {
			return;
		}
		if (source !== SyncResource.Settings && source !== SyncResource.Keybindings) {
			return;
		}
		const resource = source === SyncResource.Settings ? this.environmentService.settingsResource : this.environmentService.keybindingsResource;
		if (isEquAl(resource, EditorResourceAccessor.getCAnonicAlUri(this.editorService.ActiveEditor, { supportSideBySide: SideBySideEditor.PRIMARY }))) {
			// Do not show notificAtion if the file in error is Active
			return;
		}
		const errorAreA = getSyncAreALAbel(source);
		const hAndle = this.notificAtionService.notify({
			severity: Severity.Error,
			messAge: locAlize('errorInvAlidConfigurAtion', "UnAble to sync {0} becAuse the content in the file is not vAlid. PleAse open the file And correct it.", errorAreA.toLowerCAse()),
			Actions: {
				primAry: [new Action('open sync file', locAlize('open file', "Open {0} File", errorAreA), undefined, true,
					() => source === SyncResource.Settings ? this.preferencesService.openGlobAlSettings(true) : this.preferencesService.openGlobAlKeybindingSettings(true))]
			}
		});
		this.invAlidContentErrorDisposAbles.set(source, toDisposAble(() => {
			// close the error wArning notificAtion
			hAndle.close();
			this.invAlidContentErrorDisposAbles.delete(source);
		}));
	}

	privAte Async updAteGlobAlActivityBAdge(): Promise<void> {
		this.globAlActivityBAdgeDisposAble.cleAr();

		let bAdge: IBAdge | undefined = undefined;
		let clAzz: string | undefined;
		let priority: number | undefined = undefined;

		if (this.userDAtASyncService.conflicts.length && this.userDAtAAutoSyncService.isEnAbled()) {
			bAdge = new NumberBAdge(this.userDAtASyncService.conflicts.reduce((result, [, conflicts]) => { return result + conflicts.length; }, 0), () => locAlize('hAs conflicts', "{0}: Conflicts Detected", SYNC_TITLE));
		} else if (this.turningOnSync) {
			bAdge = new ProgressBAdge(() => locAlize('turning on syncing', "Turning on Settings Sync..."));
			clAzz = 'progress-bAdge';
			priority = 1;
		}

		if (bAdge) {
			this.globAlActivityBAdgeDisposAble.vAlue = this.ActivityService.showGlobAlActivity({ bAdge, clAzz, priority });
		}
	}

	privAte Async updAteAccountBAdge(): Promise<void> {
		this.AccountBAdgeDisposAble.cleAr();

		let bAdge: IBAdge | undefined = undefined;

		if (this.userDAtASyncService.stAtus !== SyncStAtus.UninitiAlized && this.userDAtAAutoSyncService.isEnAbled() && this.userDAtASyncWorkbenchService.AccountStAtus === AccountStAtus.UnAvAilAble) {
			bAdge = new NumberBAdge(1, () => locAlize('sign in to sync', "Sign in to Sync Settings"));
		}

		if (bAdge) {
			this.AccountBAdgeDisposAble.vAlue = this.ActivityService.showAccountsActivity({ bAdge, clAzz: undefined, priority: undefined });
		}
	}

	privAte Async turnOn(): Promise<void> {
		try {
			if (!this.userDAtASyncWorkbenchService.AuthenticAtionProviders.length) {
				throw new Error(locAlize('no AuthenticAtion providers', "No AuthenticAtion providers Are AvAilAble."));
			}
			if (!this.storAgeService.getBooleAn('sync.donotAskPreviewConfirmAtion', StorAgeScope.GLOBAL, fAlse)) {
				if (!AwAit this.AskForConfirmAtion()) {
					return;
				}
			}
			const turnOn = AwAit this.AskToConfigure();
			if (!turnOn) {
				return;
			}
			if (this.userDAtASyncStoreMAnAgementService.userDAtASyncStore?.cAnSwitch) {
				AwAit this.selectSettingsSyncService(this.userDAtASyncStoreMAnAgementService.userDAtASyncStore);
			}
			AwAit this.userDAtASyncWorkbenchService.turnOn();
			this.storAgeService.store('sync.donotAskPreviewConfirmAtion', true, StorAgeScope.GLOBAL);
		} cAtch (e) {
			if (isPromiseCAnceledError(e)) {
				return;
			}
			if (e instAnceof UserDAtASyncError) {
				switch (e.code) {
					cAse UserDAtASyncErrorCode.TooLArge:
						if (e.resource === SyncResource.Keybindings || e.resource === SyncResource.Settings) {
							this.hAndleTooLArgeError(e.resource, locAlize('too lArge while stArting sync', "Settings sync cAnnot be turned on becAuse size of the {0} file to sync is lArger thAn {1}. PleAse open the file And reduce the size And turn on sync", getSyncAreALAbel(e.resource).toLowerCAse(), '100kb'), e);
							return;
						}
						breAk;
					cAse UserDAtASyncErrorCode.IncompAtibleLocAlContent:
					cAse UserDAtASyncErrorCode.Gone:
					cAse UserDAtASyncErrorCode.UpgrAdeRequired:
						const messAge = locAlize('error upgrAde required while stArting sync', "Settings sync cAnnot be turned on becAuse the current version ({0}, {1}) is not compAtible with the sync service. PleAse updAte before turning on sync.", this.productService.version, this.productService.commit);
						const operAtionId = e.operAtionId ? locAlize('operAtionId', "OperAtion Id: {0}", e.operAtionId) : undefined;
						this.notificAtionService.notify({
							severity: Severity.Error,
							messAge: operAtionId ? `${messAge} ${operAtionId}` : messAge,
						});
						return;
					cAse UserDAtASyncErrorCode.IncompAtibleRemoteContent:
						this.notificAtionService.notify({
							severity: Severity.Error,
							messAge: locAlize('error reset required while stArting sync', "Settings sync cAnnot be turned on becAuse your dAtA in the cloud is older thAn thAt of the client. PleAse cleAr your dAtA in the cloud before turning on sync."),
							Actions: {
								primAry: [
									new Action('reset', locAlize('reset', "CleAr DAtA in Cloud..."), undefined, true, () => this.userDAtASyncWorkbenchService.resetSyncedDAtA()),
									new Action('show synced dAtA', locAlize('show synced dAtA Action', "Show Synced DAtA"), undefined, true, () => this.userDAtASyncWorkbenchService.showSyncActivity())
								]
							}
						});
						return;
				}
			}
			this.notificAtionService.error(locAlize('turn on fAiled', "Error while stArting Settings Sync: {0}", toErrorMessAge(e)));
		}
	}

	privAte Async AskForConfirmAtion(): Promise<booleAn> {
		const result = AwAit this.diAlogService.show(
			Severity.Info,
			locAlize('sync preview messAge', "Synchronizing your settings is A preview feAture, pleAse reAd the documentAtion before turning it on."),
			[
				locAlize('turn on', "Turn On"),
				locAlize('open doc', "Open DocumentAtion"),
				locAlize('cAncel', "CAncel"),
			],
			{
				cAncelId: 2
			}
		);
		switch (result.choice) {
			cAse 1: this.openerService.open(URI.pArse('https://AkA.ms/vscode-settings-sync-help')); return fAlse;
			cAse 2: return fAlse;
		}
		return true;
	}

	privAte Async AskToConfigure(): Promise<booleAn> {
		return new Promise<booleAn>((c, e) => {
			const disposAbles: DisposAbleStore = new DisposAbleStore();
			const quickPick = this.quickInputService.creAteQuickPick<ConfigureSyncQuickPickItem>();
			disposAbles.Add(quickPick);
			quickPick.title = SYNC_TITLE;
			quickPick.ok = fAlse;
			quickPick.customButton = true;
			quickPick.customLAbel = locAlize('sign in And turn on', "Sign in & Turn on");
			quickPick.description = locAlize('configure And turn on sync detAil', "PleAse sign in to synchronize your dAtA Across devices.");
			quickPick.cAnSelectMAny = true;
			quickPick.ignoreFocusOut = true;
			quickPick.hideInput = true;
			quickPick.hideCheckAll = true;

			const items = this.getConfigureSyncQuickPickItems();
			quickPick.items = items;
			quickPick.selectedItems = items.filter(item => this.userDAtASyncResourceEnAblementService.isResourceEnAbled(item.id));
			let Accepted: booleAn = fAlse;
			disposAbles.Add(Event.Any(quickPick.onDidAccept, quickPick.onDidCustom)(() => {
				Accepted = true;
				quickPick.hide();
			}));
			disposAbles.Add(quickPick.onDidHide(() => {
				try {
					if (Accepted) {
						this.updAteConfigurAtion(items, quickPick.selectedItems);
					}
					c(Accepted);
				} cAtch (error) {
					e(error);
				} finAlly {
					disposAbles.dispose();
				}
			}));
			quickPick.show();
		});
	}

	privAte getConfigureSyncQuickPickItems(): ConfigureSyncQuickPickItem[] {
		return [{
			id: SyncResource.Settings,
			lAbel: getSyncAreALAbel(SyncResource.Settings)
		}, {
			id: SyncResource.Keybindings,
			lAbel: getSyncAreALAbel(SyncResource.Keybindings),
			description: this.configurAtionService.getVAlue('settingsSync.keybindingsPerPlAtform') ? locAlize('per plAtform', "for eAch plAtform") : undefined
		}, {
			id: SyncResource.Snippets,
			lAbel: getSyncAreALAbel(SyncResource.Snippets)
		}, {
			id: SyncResource.Extensions,
			lAbel: getSyncAreALAbel(SyncResource.Extensions)
		}, {
			id: SyncResource.GlobAlStAte,
			lAbel: getSyncAreALAbel(SyncResource.GlobAlStAte),
		}];
	}

	privAte updAteConfigurAtion(items: ConfigureSyncQuickPickItem[], selectedItems: ReAdonlyArrAy<ConfigureSyncQuickPickItem>): void {
		for (const item of items) {
			const wAsEnAbled = this.userDAtASyncResourceEnAblementService.isResourceEnAbled(item.id);
			const isEnAbled = !!selectedItems.filter(selected => selected.id === item.id)[0];
			if (wAsEnAbled !== isEnAbled) {
				this.userDAtASyncResourceEnAblementService.setResourceEnAblement(item.id!, isEnAbled);
			}
		}
	}

	privAte Async configureSyncOptions(): Promise<void> {
		return new Promise((c, e) => {
			const disposAbles: DisposAbleStore = new DisposAbleStore();
			const quickPick = this.quickInputService.creAteQuickPick<ConfigureSyncQuickPickItem>();
			disposAbles.Add(quickPick);
			quickPick.title = locAlize('configure sync', "{0}: Configure...", SYNC_TITLE);
			quickPick.plAceholder = locAlize('configure sync plAceholder', "Choose whAt to sync");
			quickPick.cAnSelectMAny = true;
			quickPick.ignoreFocusOut = true;
			quickPick.ok = true;
			const items = this.getConfigureSyncQuickPickItems();
			quickPick.items = items;
			quickPick.selectedItems = items.filter(item => this.userDAtASyncResourceEnAblementService.isResourceEnAbled(item.id));
			disposAbles.Add(quickPick.onDidAccept(Async () => {
				if (quickPick.selectedItems.length) {
					this.updAteConfigurAtion(items, quickPick.selectedItems);
					quickPick.hide();
				}
			}));
			disposAbles.Add(quickPick.onDidHide(() => {
				disposAbles.dispose();
				c();
			}));
			quickPick.show();
		});
	}

	privAte Async turnOff(): Promise<void> {
		const result = AwAit this.diAlogService.confirm({
			type: 'info',
			messAge: locAlize('turn off sync confirmAtion', "Do you wAnt to turn off sync?"),
			detAil: locAlize('turn off sync detAil', "Your settings, keybindings, extensions, snippets And UI StAte will no longer be synced."),
			primAryButton: locAlize({ key: 'turn off', comment: ['&& denotes A mnemonic'] }, "&&Turn off"),
			checkbox: this.userDAtASyncWorkbenchService.AccountStAtus === AccountStAtus.AvAilAble ? {
				lAbel: locAlize('turn off sync everywhere', "Turn off sync on All your devices And cleAr the dAtA from the cloud.")
			} : undefined
		});
		if (result.confirmed) {
			return this.userDAtASyncWorkbenchService.turnoff(!!result.checkboxChecked);
		}
	}

	privAte disAbleSync(source: SyncResource): void {
		switch (source) {
			cAse SyncResource.Settings: return this.userDAtASyncResourceEnAblementService.setResourceEnAblement(SyncResource.Settings, fAlse);
			cAse SyncResource.Keybindings: return this.userDAtASyncResourceEnAblementService.setResourceEnAblement(SyncResource.Keybindings, fAlse);
			cAse SyncResource.Snippets: return this.userDAtASyncResourceEnAblementService.setResourceEnAblement(SyncResource.Snippets, fAlse);
			cAse SyncResource.Extensions: return this.userDAtASyncResourceEnAblementService.setResourceEnAblement(SyncResource.Extensions, fAlse);
			cAse SyncResource.GlobAlStAte: return this.userDAtASyncResourceEnAblementService.setResourceEnAblement(SyncResource.GlobAlStAte, fAlse);
		}
	}

	privAte getConflictsEditorInputs(syncResource: SyncResource): DiffEditorInput[] {
		return this.editorService.editors.filter(input => {
			const resource = input instAnceof DiffEditorInput ? input.primAry.resource : input.resource;
			return resource && getSyncResourceFromLocAlPreview(resource!, this.environmentService) === syncResource;
		}) As DiffEditorInput[];
	}

	privAte getAllConflictsEditorInputs(): IEditorInput[] {
		return this.editorService.editors.filter(input => {
			const resource = input instAnceof DiffEditorInput ? input.primAry.resource : input.resource;
			return resource && getSyncResourceFromLocAlPreview(resource!, this.environmentService) !== undefined;
		});
	}

	privAte Async hAndleSyncResourceConflicts(resource: SyncResource): Promise<void> {
		const syncResourceCoflicts = this.userDAtASyncService.conflicts.filter(([syncResource]) => syncResource === resource)[0];
		if (syncResourceCoflicts) {
			this.hAndleConflicts(syncResourceCoflicts);
		}
	}

	privAte Async hAndleConflicts([syncResource, conflicts]: [SyncResource, IResourcePreview[]]): Promise<void> {
		for (const conflict of conflicts) {
			const leftResourceNAme = locAlize({ key: 'leftResourceNAme', comment: ['remote As in file in cloud'] }, "{0} (Remote)", bAsenAme(conflict.remoteResource));
			const rightResourceNAme = locAlize('merges', "{0} (Merges)", bAsenAme(conflict.previewResource));
			AwAit this.editorService.openEditor({
				leftResource: conflict.remoteResource,
				rightResource: conflict.previewResource,
				lAbel: locAlize('sideBySideLAbels', "{0} ↔ {1}", leftResourceNAme, rightResourceNAme),
				options: {
					preserveFocus: fAlse,
					pinned: true,
					reveAlIfVisible: true,
				},
			});
		}
	}

	privAte showSyncActivity(): Promise<void> {
		return this.outputService.showChAnnel(ConstAnts.userDAtASyncLogChAnnelId);
	}

	privAte Async selectSettingsSyncService(userDAtASyncStore: IUserDAtASyncStore): Promise<void> {
		return new Promise<void>((c, e) => {
			const disposAbles: DisposAbleStore = new DisposAbleStore();
			const quickPick = disposAbles.Add(this.quickInputService.creAteQuickPick<{ id: UserDAtASyncStoreType, lAbel: string, description?: string }>());
			quickPick.title = locAlize('switchSyncService.title', "{0}: Select Service", SYNC_TITLE);
			quickPick.description = locAlize('switchSyncService.description', "Ensure you Are using the sAme settings sync service when syncing with multiple environments");
			quickPick.hideInput = true;
			quickPick.ignoreFocusOut = true;
			const getDescription = (url: URI): string | undefined => {
				const isDefAult = isEquAl(url, userDAtASyncStore.defAultUrl);
				if (isDefAult) {
					return locAlize('defAult', "DefAult");
				}
				return undefined;
			};
			quickPick.items = [
				{
					id: 'insiders',
					lAbel: locAlize('insiders', "Insiders"),
					description: getDescription(userDAtASyncStore.insidersUrl)
				},
				{
					id: 'stAble',
					lAbel: locAlize('stAble', "StAble"),
					description: getDescription(userDAtASyncStore.stAbleUrl)
				}
			];
			disposAbles.Add(quickPick.onDidAccept(Async () => {
				try {
					AwAit this.userDAtASyncStoreMAnAgementService.switch(quickPick.selectedItems[0].id);
					c();
				} cAtch (error) {
					e(error);
				} finAlly {
					quickPick.hide();
				}
			}));
			disposAbles.Add(quickPick.onDidHide(() => disposAbles.dispose()));
			quickPick.show();
		});
	}

	privAte registerActions(): void {
		if (this.userDAtAAutoSyncService.cAnToggleEnAblement()) {
			this.registerTurnOnSyncAction();
			this.registerTurnOffSyncAction();
		}
		this.registerTurninOnSyncAction();
		this.registerSignInAction(); // When Sync is turned on from CLI
		this.registerShowSettingsConflictsAction();
		this.registerShowKeybindingsConflictsAction();
		this.registerShowSnippetsConflictsAction();

		this.registerEnAbleSyncViewsAction();
		this.registerMAnAgeSyncAction();
		this.registerSyncNowAction();
		this.registerConfigureSyncAction();
		this.registerShowSettingsAction();
		this.registerShowLogAction();
	}

	privAte registerTurnOnSyncAction(): void {
		const turnOnSyncWhenContext = ContextKeyExpr.And(CONTEXT_SYNC_STATE.notEquAlsTo(SyncStAtus.UninitiAlized), CONTEXT_SYNC_ENABLEMENT.toNegAted(), CONTEXT_ACCOUNT_STATE.notEquAlsTo(AccountStAtus.UninitiAlized), CONTEXT_TURNING_ON_STATE.negAte());
		CommAndsRegistry.registerCommAnd(turnOnSyncCommAnd.id, () => this.turnOn());
		MenuRegistry.AppendMenuItem(MenuId.GlobAlActivity, {
			group: '5_sync',
			commAnd: {
				id: turnOnSyncCommAnd.id,
				title: locAlize('globAl Activity turn on sync', "Turn on Settings Sync...")
			},
			when: turnOnSyncWhenContext,
			order: 1
		});
		MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
			commAnd: turnOnSyncCommAnd,
			when: turnOnSyncWhenContext,
		});
		MenuRegistry.AppendMenuItem(MenuId.MenubArPreferencesMenu, {
			group: '5_sync',
			commAnd: {
				id: turnOnSyncCommAnd.id,
				title: locAlize('globAl Activity turn on sync', "Turn on Settings Sync...")
			},
			when: turnOnSyncWhenContext,
		});
		MenuRegistry.AppendMenuItem(MenuId.AccountsContext, {
			group: '1_sync',
			commAnd: {
				id: turnOnSyncCommAnd.id,
				title: locAlize('globAl Activity turn on sync', "Turn on Settings Sync...")
			},
			when: turnOnSyncWhenContext
		});
	}

	privAte registerTurninOnSyncAction(): void {
		const when = ContextKeyExpr.And(CONTEXT_SYNC_STATE.notEquAlsTo(SyncStAtus.UninitiAlized), CONTEXT_SYNC_ENABLEMENT.toNegAted(), CONTEXT_ACCOUNT_STATE.notEquAlsTo(AccountStAtus.UninitiAlized), CONTEXT_TURNING_ON_STATE);
		this._register(registerAction2(clAss TurningOnSyncAction extends Action2 {
			constructor() {
				super({
					id: 'workbench.userDAtA.Actions.turningOn',
					title: locAlize('turnin on sync', "Turning on Settings Sync..."),
					precondition: ContextKeyExpr.fAlse(),
					menu: [{
						group: '5_sync',
						id: MenuId.GlobAlActivity,
						when,
						order: 2
					}, {
						group: '1_sync',
						id: MenuId.AccountsContext,
						when,
					}]
				});
			}
			Async run(): Promise<Any> { }
		}));
	}

	privAte registerSignInAction(): void {
		const thAt = this;
		const id = 'workbench.userDAtA.Actions.signin';
		const when = ContextKeyExpr.And(CONTEXT_SYNC_STATE.notEquAlsTo(SyncStAtus.UninitiAlized), CONTEXT_SYNC_ENABLEMENT, CONTEXT_ACCOUNT_STATE.isEquAlTo(AccountStAtus.UnAvAilAble));
		this._register(registerAction2(clAss StopSyncAction extends Action2 {
			constructor() {
				super({
					id: 'workbench.userDAtA.Actions.signin',
					title: locAlize('sign in globAl', "Sign in to Sync Settings"),
					menu: {
						group: '5_sync',
						id: MenuId.GlobAlActivity,
						when,
						order: 2
					}
				});
			}
			Async run(): Promise<Any> {
				try {
					AwAit thAt.userDAtASyncWorkbenchService.signIn();
				} cAtch (e) {
					thAt.notificAtionService.error(e);
				}
			}
		}));
		this._register(MenuRegistry.AppendMenuItem(MenuId.AccountsContext, {
			group: '1_sync',
			commAnd: {
				id,
				title: locAlize('sign in Accounts', "Sign in to Sync Settings (1)"),
			},
			when
		}));
	}

	privAte registerShowSettingsConflictsAction(): void {
		const resolveSettingsConflictsWhenContext = ContextKeyExpr.regex(CONTEXT_CONFLICTS_SOURCES.keys()[0], /.*settings.*/i);
		CommAndsRegistry.registerCommAnd(resolveSettingsConflictsCommAnd.id, () => this.hAndleSyncResourceConflicts(SyncResource.Settings));
		MenuRegistry.AppendMenuItem(MenuId.GlobAlActivity, {
			group: '5_sync',
			commAnd: {
				id: resolveSettingsConflictsCommAnd.id,
				title: locAlize('resolveConflicts_globAl', "{0}: Show Settings Conflicts (1)", SYNC_TITLE),
			},
			when: resolveSettingsConflictsWhenContext,
			order: 2
		});
		MenuRegistry.AppendMenuItem(MenuId.MenubArPreferencesMenu, {
			group: '5_sync',
			commAnd: {
				id: resolveSettingsConflictsCommAnd.id,
				title: locAlize('resolveConflicts_globAl', "{0}: Show Settings Conflicts (1)", SYNC_TITLE),
			},
			when: resolveSettingsConflictsWhenContext,
			order: 2
		});
		MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
			commAnd: resolveSettingsConflictsCommAnd,
			when: resolveSettingsConflictsWhenContext,
		});
	}

	privAte registerShowKeybindingsConflictsAction(): void {
		const resolveKeybindingsConflictsWhenContext = ContextKeyExpr.regex(CONTEXT_CONFLICTS_SOURCES.keys()[0], /.*keybindings.*/i);
		CommAndsRegistry.registerCommAnd(resolveKeybindingsConflictsCommAnd.id, () => this.hAndleSyncResourceConflicts(SyncResource.Keybindings));
		MenuRegistry.AppendMenuItem(MenuId.GlobAlActivity, {
			group: '5_sync',
			commAnd: {
				id: resolveKeybindingsConflictsCommAnd.id,
				title: locAlize('resolveKeybindingsConflicts_globAl', "{0}: Show Keybindings Conflicts (1)", SYNC_TITLE),
			},
			when: resolveKeybindingsConflictsWhenContext,
			order: 2
		});
		MenuRegistry.AppendMenuItem(MenuId.MenubArPreferencesMenu, {
			group: '5_sync',
			commAnd: {
				id: resolveKeybindingsConflictsCommAnd.id,
				title: locAlize('resolveKeybindingsConflicts_globAl', "{0}: Show Keybindings Conflicts (1)", SYNC_TITLE),
			},
			when: resolveKeybindingsConflictsWhenContext,
			order: 2
		});
		MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
			commAnd: resolveKeybindingsConflictsCommAnd,
			when: resolveKeybindingsConflictsWhenContext,
		});
	}

	privAte _snippetsConflictsActionsDisposAble: DisposAbleStore = new DisposAbleStore();
	privAte registerShowSnippetsConflictsAction(): void {
		this._snippetsConflictsActionsDisposAble.cleAr();
		const resolveSnippetsConflictsWhenContext = ContextKeyExpr.regex(CONTEXT_CONFLICTS_SOURCES.keys()[0], /.*snippets.*/i);
		const conflicts: IResourcePreview[] | undefined = this.userDAtASyncService.conflicts.filter(([syncResource]) => syncResource === SyncResource.Snippets)[0]?.[1];
		this._snippetsConflictsActionsDisposAble.Add(CommAndsRegistry.registerCommAnd(resolveSnippetsConflictsCommAnd.id, () => this.hAndleSyncResourceConflicts(SyncResource.Snippets)));
		this._snippetsConflictsActionsDisposAble.Add(MenuRegistry.AppendMenuItem(MenuId.GlobAlActivity, {
			group: '5_sync',
			commAnd: {
				id: resolveSnippetsConflictsCommAnd.id,
				title: locAlize('resolveSnippetsConflicts_globAl', "{0}: Show User Snippets Conflicts ({1})", SYNC_TITLE, conflicts?.length || 1),
			},
			when: resolveSnippetsConflictsWhenContext,
			order: 2
		}));
		this._snippetsConflictsActionsDisposAble.Add(MenuRegistry.AppendMenuItem(MenuId.MenubArPreferencesMenu, {
			group: '5_sync',
			commAnd: {
				id: resolveSnippetsConflictsCommAnd.id,
				title: locAlize('resolveSnippetsConflicts_globAl', "{0}: Show User Snippets Conflicts ({1})", SYNC_TITLE, conflicts?.length || 1),
			},
			when: resolveSnippetsConflictsWhenContext,
			order: 2
		}));
		this._snippetsConflictsActionsDisposAble.Add(MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
			commAnd: resolveSnippetsConflictsCommAnd,
			when: resolveSnippetsConflictsWhenContext,
		}));
	}

	privAte registerMAnAgeSyncAction(): void {
		const thAt = this;
		const when = ContextKeyExpr.And(CONTEXT_SYNC_ENABLEMENT, CONTEXT_ACCOUNT_STATE.isEquAlTo(AccountStAtus.AvAilAble), CONTEXT_SYNC_STATE.notEquAlsTo(SyncStAtus.UninitiAlized));
		this._register(registerAction2(clAss SyncStAtusAction extends Action2 {
			constructor() {
				super({
					id: 'workbench.userDAtASync.Actions.mAnAge',
					title: locAlize('sync is on', "Settings Sync is On"),
					menu: [
						{
							id: MenuId.GlobAlActivity,
							group: '5_sync',
							when,
							order: 3
						},
						{
							id: MenuId.MenubArPreferencesMenu,
							group: '5_sync',
							when,
							order: 3,
						},
						{
							id: MenuId.AccountsContext,
							group: '1_sync',
							when,
						}
					],
				});
			}
			run(Accessor: ServicesAccessor): Any {
				return new Promise<void>((c, e) => {
					const quickInputService = Accessor.get(IQuickInputService);
					const commAndService = Accessor.get(ICommAndService);
					const disposAbles = new DisposAbleStore();
					const quickPick = quickInputService.creAteQuickPick();
					disposAbles.Add(quickPick);
					const items: ArrAy<IQuickPickItem | IQuickPickSepArAtor> = [];
					if (thAt.userDAtASyncService.conflicts.length) {
						for (const [syncResource] of thAt.userDAtASyncService.conflicts) {
							switch (syncResource) {
								cAse SyncResource.Settings:
									items.push({ id: resolveSettingsConflictsCommAnd.id, lAbel: resolveSettingsConflictsCommAnd.title });
									breAk;
								cAse SyncResource.Keybindings:
									items.push({ id: resolveKeybindingsConflictsCommAnd.id, lAbel: resolveKeybindingsConflictsCommAnd.title });
									breAk;
								cAse SyncResource.Snippets:
									items.push({ id: resolveSnippetsConflictsCommAnd.id, lAbel: resolveSnippetsConflictsCommAnd.title });
									breAk;
							}
						}
						items.push({ type: 'sepArAtor' });
					}
					items.push({ id: configureSyncCommAnd.id, lAbel: configureSyncCommAnd.title });
					items.push({ id: showSyncSettingsCommAnd.id, lAbel: showSyncSettingsCommAnd.title });
					items.push({ id: showSyncedDAtACommAnd.id, lAbel: showSyncedDAtACommAnd.title });
					items.push({ type: 'sepArAtor' });
					items.push({ id: syncNowCommAnd.id, lAbel: syncNowCommAnd.title, description: syncNowCommAnd.description(thAt.userDAtASyncService) });
					if (thAt.userDAtAAutoSyncService.cAnToggleEnAblement()) {
						const Account = thAt.userDAtASyncWorkbenchService.current;
						items.push({ id: turnOffSyncCommAnd.id, lAbel: turnOffSyncCommAnd.title, description: Account ? `${Account.AccountNAme} (${thAt.AuthenticAtionService.getLAbel(Account.AuthenticAtionProviderId)})` : undefined });
					}
					quickPick.items = items;
					disposAbles.Add(quickPick.onDidAccept(() => {
						if (quickPick.selectedItems[0] && quickPick.selectedItems[0].id) {
							commAndService.executeCommAnd(quickPick.selectedItems[0].id);
						}
						quickPick.hide();
					}));
					disposAbles.Add(quickPick.onDidHide(() => {
						disposAbles.dispose();
						c();
					}));
					quickPick.show();
				});
			}
		}));
	}

	privAte registerEnAbleSyncViewsAction(): void {
		const thAt = this;
		const when = ContextKeyExpr.And(CONTEXT_ACCOUNT_STATE.isEquAlTo(AccountStAtus.AvAilAble), CONTEXT_SYNC_STATE.notEquAlsTo(SyncStAtus.UninitiAlized));
		this._register(registerAction2(clAss SyncStAtusAction extends Action2 {
			constructor() {
				super({
					id: showSyncedDAtACommAnd.id,
					title: { vAlue: locAlize('workbench.Action.showSyncRemoteBAckup', "Show Synced DAtA"), originAl: `Show Synced DAtA` },
					cAtegory: { vAlue: SYNC_TITLE, originAl: `Settings Sync` },
					precondition: when,
					menu: {
						id: MenuId.CommAndPAlette,
						when
					}
				});
			}
			run(Accessor: ServicesAccessor): Promise<void> {
				return thAt.userDAtASyncWorkbenchService.showSyncActivity();
			}
		}));
	}

	privAte registerSyncNowAction(): void {
		const thAt = this;
		this._register(registerAction2(clAss SyncNowAction extends Action2 {
			constructor() {
				super({
					id: syncNowCommAnd.id,
					title: syncNowCommAnd.title,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyExpr.And(CONTEXT_SYNC_ENABLEMENT, CONTEXT_ACCOUNT_STATE.isEquAlTo(AccountStAtus.AvAilAble), CONTEXT_SYNC_STATE.notEquAlsTo(SyncStAtus.UninitiAlized))
					}
				});
			}
			run(Accessor: ServicesAccessor): Promise<Any> {
				return thAt.userDAtAAutoSyncService.triggerSync([syncNowCommAnd.id], fAlse, true);
			}
		}));
	}

	privAte registerTurnOffSyncAction(): void {
		const thAt = this;
		this._register(registerAction2(clAss StopSyncAction extends Action2 {
			constructor() {
				super({
					id: turnOffSyncCommAnd.id,
					title: turnOffSyncCommAnd.title,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyExpr.And(CONTEXT_SYNC_STATE.notEquAlsTo(SyncStAtus.UninitiAlized), CONTEXT_SYNC_ENABLEMENT),
					},
				});
			}
			Async run(): Promise<Any> {
				try {
					AwAit thAt.turnOff();
				} cAtch (e) {
					if (!isPromiseCAnceledError(e)) {
						thAt.notificAtionService.error(locAlize('turn off fAiled', "Error while turning off sync: {0}", toErrorMessAge(e)));
					}
				}
			}
		}));
	}

	privAte registerConfigureSyncAction(): void {
		const thAt = this;
		const when = ContextKeyExpr.And(CONTEXT_SYNC_STATE.notEquAlsTo(SyncStAtus.UninitiAlized), CONTEXT_SYNC_ENABLEMENT);
		this._register(registerAction2(clAss ConfigureSyncAction extends Action2 {
			constructor() {
				super({
					id: configureSyncCommAnd.id,
					title: configureSyncCommAnd.title,
					menu: {
						id: MenuId.CommAndPAlette,
						when
					}
				});
			}
			run(): Any { return thAt.configureSyncOptions(); }
		}));
	}

	privAte registerShowLogAction(): void {
		const thAt = this;
		this._register(registerAction2(clAss ShowSyncActivityAction extends Action2 {
			constructor() {
				super({
					id: SHOW_SYNC_LOG_COMMAND_ID,
					title: locAlize('show sync log title', "{0}: Show Log", SYNC_TITLE),
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyExpr.And(CONTEXT_SYNC_STATE.notEquAlsTo(SyncStAtus.UninitiAlized)),
					},
				});
			}
			run(): Any { return thAt.showSyncActivity(); }
		}));
	}

	privAte registerShowSettingsAction(): void {
		this._register(registerAction2(clAss ShowSyncSettingsAction extends Action2 {
			constructor() {
				super({
					id: showSyncSettingsCommAnd.id,
					title: showSyncSettingsCommAnd.title,
					menu: {
						id: MenuId.CommAndPAlette,
						when: ContextKeyExpr.And(CONTEXT_SYNC_STATE.notEquAlsTo(SyncStAtus.UninitiAlized)),
					},
				});
			}
			run(Accessor: ServicesAccessor): Any {
				Accessor.get(IPreferencesService).openGlobAlSettings(fAlse, { query: '@tAg:sync' });
			}
		}));
	}

	privAte registerViews(): void {
		const contAiner = this.registerViewContAiner();
		this.registerDAtAViews(contAiner);
	}

	privAte registerViewContAiner(): ViewContAiner {
		return Registry.As<IViewContAinersRegistry>(Extensions.ViewContAinersRegistry).registerViewContAiner(
			{
				id: SYNC_VIEW_CONTAINER_ID,
				nAme: SYNC_TITLE,
				ctorDescriptor: new SyncDescriptor(
					UserDAtASyncViewPAneContAiner,
					[SYNC_VIEW_CONTAINER_ID]
				),
				icon: Codicon.sync.clAssNAmes,
				hideIfEmpty: true,
			}, ViewContAinerLocAtion.SidebAr);
	}

	privAte registerDAtAViews(contAiner: ViewContAiner): void {
		this._register(this.instAntiAtionService.creAteInstAnce(UserDAtASyncDAtAViews, contAiner));
	}

}

clAss UserDAtARemoteContentProvider implements ITextModelContentProvider {

	constructor(
		@IUserDAtASyncService privAte reAdonly userDAtASyncService: IUserDAtASyncService,
		@IModelService privAte reAdonly modelService: IModelService,
		@IModeService privAte reAdonly modeService: IModeService,
	) {
	}

	provideTextContent(uri: URI): Promise<ITextModel> | null {
		if (uri.scheme === USER_DATA_SYNC_SCHEME) {
			return this.userDAtASyncService.resolveContent(uri).then(content => this.modelService.creAteModel(content || '', this.modeService.creAte('jsonc'), uri));
		}
		return null;
	}
}

clAss AcceptChAngesContribution extends DisposAble implements IEditorContribution {

	stAtic get(editor: ICodeEditor): AcceptChAngesContribution {
		return editor.getContribution<AcceptChAngesContribution>(AcceptChAngesContribution.ID);
	}

	public stAtic reAdonly ID = 'editor.contrib.AcceptChAngesButton';

	privAte AcceptChAngesButton: FloAtingClickWidget | undefined;

	constructor(
		privAte editor: ICodeEditor,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IUserDAtASyncService privAte reAdonly userDAtASyncService: IUserDAtASyncService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IDiAlogService privAte reAdonly diAlogService: IDiAlogService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IUserDAtAAutoSyncService privAte reAdonly userDAtAAutoSyncService: IUserDAtAAutoSyncService,
	) {
		super();

		this.updAte();
		this.registerListeners();
	}

	privAte registerListeners(): void {
		this._register(this.editor.onDidChAngeModel(() => this.updAte()));
		this._register(this.userDAtASyncService.onDidChAngeConflicts(() => this.updAte()));
		this._register(Event.filter(this.configurAtionService.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion('diffEditor.renderSideBySide'))(() => this.updAte()));
	}

	privAte updAte(): void {
		if (!this.shouldShowButton(this.editor)) {
			this.disposeAcceptChAngesWidgetRenderer();
			return;
		}

		this.creAteAcceptChAngesWidgetRenderer();
	}

	privAte shouldShowButton(editor: ICodeEditor): booleAn {
		const model = editor.getModel();
		if (!model) {
			return fAlse; // we need A model
		}

		if (!this.userDAtAAutoSyncService.isEnAbled()) {
			return fAlse;
		}

		const syncResourceConflicts = this.getSyncResourceConflicts(model.uri);
		if (!syncResourceConflicts) {
			return fAlse;
		}

		if (syncResourceConflicts[1].some(({ previewResource }) => isEquAl(previewResource, model.uri))) {
			return true;
		}

		if (syncResourceConflicts[1].some(({ remoteResource }) => isEquAl(remoteResource, model.uri))) {
			return this.configurAtionService.getVAlue<booleAn>('diffEditor.renderSideBySide');
		}

		return fAlse;
	}

	privAte creAteAcceptChAngesWidgetRenderer(): void {
		if (!this.AcceptChAngesButton) {
			const resource = this.editor.getModel()!.uri;
			const [syncResource, conflicts] = this.getSyncResourceConflicts(resource)!;
			const isRemote = conflicts.some(({ remoteResource }) => isEquAl(remoteResource, resource));
			const AcceptRemoteLAbel = locAlize('Accept remote', "Accept Remote");
			const AcceptMergesLAbel = locAlize('Accept merges', "Accept Merges");
			const AcceptRemoteButtonLAbel = locAlize('Accept remote button', "Accept &&Remote");
			const AcceptMergesButtonLAbel = locAlize('Accept merges button', "Accept &&Merges");
			this.AcceptChAngesButton = this.instAntiAtionService.creAteInstAnce(FloAtingClickWidget, this.editor, isRemote ? AcceptRemoteLAbel : AcceptMergesLAbel, null);
			this._register(this.AcceptChAngesButton.onClick(Async () => {
				const model = this.editor.getModel();
				if (model) {
					this.telemetryService.publicLog2<{ source: string, Action: string }, SyncConflictsClAssificAtion>('sync/hAndleConflicts', { source: syncResource, Action: isRemote ? 'AcceptRemote' : 'AcceptLocAl' });
					const syncAreALAbel = getSyncAreALAbel(syncResource);
					const result = AwAit this.diAlogService.confirm({
						type: 'info',
						title: isRemote
							? locAlize('Sync Accept remote', "{0}: {1}", SYNC_TITLE, AcceptRemoteLAbel)
							: locAlize('Sync Accept merges', "{0}: {1}", SYNC_TITLE, AcceptMergesLAbel),
						messAge: isRemote
							? locAlize('confirm replAce And overwrite locAl', "Would you like to Accept remote {0} And replAce locAl {1}?", syncAreALAbel.toLowerCAse(), syncAreALAbel.toLowerCAse())
							: locAlize('confirm replAce And overwrite remote', "Would you like to Accept merges And replAce remote {0}?", syncAreALAbel.toLowerCAse()),
						primAryButton: isRemote ? AcceptRemoteButtonLAbel : AcceptMergesButtonLAbel
					});
					if (result.confirmed) {
						try {
							AwAit this.userDAtASyncService.Accept(syncResource, model.uri, model.getVAlue(), true);
						} cAtch (e) {
							if (e instAnceof UserDAtASyncError && e.code === UserDAtASyncErrorCode.LocAlPreconditionFAiled) {
								const syncResourceCoflicts = this.userDAtASyncService.conflicts.filter(syncResourceCoflicts => syncResourceCoflicts[0] === syncResource)[0];
								if (syncResourceCoflicts && conflicts.some(conflict => isEquAl(conflict.previewResource, model.uri) || isEquAl(conflict.remoteResource, model.uri))) {
									this.notificAtionService.wArn(locAlize('updAte conflicts', "Could not resolve conflicts As there is new locAl version AvAilAble. PleAse try AgAin."));
								}
							} else {
								this.notificAtionService.error(e);
							}
						}
					}
				}
			}));

			this.AcceptChAngesButton.render();
		}
	}

	privAte getSyncResourceConflicts(resource: URI): [SyncResource, IResourcePreview[]] | undefined {
		return this.userDAtASyncService.conflicts.filter(([, conflicts]) => conflicts.some(({ previewResource, remoteResource }) => isEquAl(previewResource, resource) || isEquAl(remoteResource, resource)))[0];
	}

	privAte disposeAcceptChAngesWidgetRenderer(): void {
		dispose(this.AcceptChAngesButton);
		this.AcceptChAngesButton = undefined;
	}

	dispose(): void {
		this.disposeAcceptChAngesWidgetRenderer();
		super.dispose();
	}
}
