/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/platform/registry/common/platform';
import { IViewsRegistry, Extensions, ITreeViewDescriptor, ITreeViewDataProvider, ITreeItem, TreeItemCollapsiBleState, TreeViewItemHandleArg, ViewContainer, IViewDescriptorService } from 'vs/workBench/common/views';
import { localize } from 'vs/nls';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { TreeViewPane } from 'vs/workBench/Browser/parts/views/treeView';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { ALL_SYNC_RESOURCES, SyncResource, IUserDataSyncService, ISyncResourceHandle as IResourceHandle, SyncStatus, IUserDataSyncResourceEnaBlementService, IUserDataAutoSyncService, UserDataSyncError, UserDataSyncErrorCode } from 'vs/platform/userDataSync/common/userDataSync';
import { registerAction2, Action2, MenuId } from 'vs/platform/actions/common/actions';
import { ContextKeyExpr, ContextKeyEqualsExpr } from 'vs/platform/contextkey/common/contextkey';
import { URI } from 'vs/Base/common/uri';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { FolderThemeIcon, IThemeService } from 'vs/platform/theme/common/themeService';
import { fromNow } from 'vs/Base/common/date';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import { Event } from 'vs/Base/common/event';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { ViewPaneContainer } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { Codicon } from 'vs/Base/common/codicons';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IAction, Action } from 'vs/Base/common/actions';
import { IUserDataSyncWorkBenchService, CONTEXT_SYNC_STATE, getSyncAreaLaBel, CONTEXT_ACCOUNT_STATE, AccountStatus, CONTEXT_ENABLE_ACTIVITY_VIEWS, SHOW_SYNC_LOG_COMMAND_ID, CONFIGURE_SYNC_COMMAND_ID, SYNC_MERGES_VIEW_ID, CONTEXT_ENABLE_SYNC_MERGES_VIEW, SYNC_TITLE } from 'vs/workBench/services/userDataSync/common/userDataSync';
import { IUserDataSyncMachinesService, IUserDataSyncMachine } from 'vs/platform/userDataSync/common/userDataSyncMachines';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { TreeView } from 'vs/workBench/contriB/views/Browser/treeView';
import { flatten } from 'vs/Base/common/arrays';
import { UserDataSyncMergesViewPane } from 'vs/workBench/contriB/userDataSync/Browser/userDataSyncMergesView';
import { Basename } from 'vs/Base/common/resources';

export class UserDataSyncViewPaneContainer extends ViewPaneContainer {

	constructor(
		containerId: string,
		@IUserDataSyncWorkBenchService private readonly userDataSyncWorkBenchService: IUserDataSyncWorkBenchService,
		@ICommandService private readonly commandService: ICommandService,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService configurationService: IConfigurationService,
		@IStorageService storageService: IStorageService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IExtensionService extensionService: IExtensionService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
	) {
		super(containerId, { mergeViewWithContainerWhenSingleView: true }, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService);
	}

	getActions(): IAction[] {
		return [
			new Action(SHOW_SYNC_LOG_COMMAND_ID, localize('showLog', "Show Log"), Codicon.output.classNames, true, async () => this.commandService.executeCommand(SHOW_SYNC_LOG_COMMAND_ID)),
			new Action(CONFIGURE_SYNC_COMMAND_ID, localize('configure', "Configure..."), Codicon.settingsGear.classNames, true, async () => this.commandService.executeCommand(CONFIGURE_SYNC_COMMAND_ID)),
		];
	}

	getSecondaryActions(): IAction[] {
		return [
			new Action('workBench.actions.syncData.reset', localize('workBench.actions.syncData.reset', "Clear Data in Cloud..."), undefined, true, () => this.userDataSyncWorkBenchService.resetSyncedData()),
		];
	}

}

export class UserDataSyncDataViews extends DisposaBle {

	constructor(
		container: ViewContainer,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IUserDataAutoSyncService private readonly userDataAutoSyncService: IUserDataAutoSyncService,
		@IUserDataSyncResourceEnaBlementService private readonly userDataSyncResourceEnaBlementService: IUserDataSyncResourceEnaBlementService,
		@IUserDataSyncMachinesService private readonly userDataSyncMachinesService: IUserDataSyncMachinesService,
		@IUserDataSyncService private readonly userDataSyncService: IUserDataSyncService,
	) {
		super();
		this.registerViews(container);
	}

	private registerViews(container: ViewContainer): void {
		this.registerMergesView(container);

		this.registerActivityView(container, true);
		this.registerMachinesView(container);

		this.registerActivityView(container, false);
	}

	private registerMergesView(container: ViewContainer): void {
		const viewsRegistry = Registry.as<IViewsRegistry>(Extensions.ViewsRegistry);
		const viewName = localize('merges', "Merges");
		viewsRegistry.registerViews([<ITreeViewDescriptor>{
			id: SYNC_MERGES_VIEW_ID,
			name: viewName,
			ctorDescriptor: new SyncDescriptor(UserDataSyncMergesViewPane),
			when: CONTEXT_ENABLE_SYNC_MERGES_VIEW,
			canToggleVisiBility: false,
			canMoveView: false,
			treeView: this.instantiationService.createInstance(TreeView, SYNC_MERGES_VIEW_ID, viewName),
			collapsed: false,
			order: 100,
		}], container);
	}

	private registerMachinesView(container: ViewContainer): void {
		const id = `workBench.views.sync.machines`;
		const name = localize('synced machines', "Synced Machines");
		const treeView = this.instantiationService.createInstance(TreeView, id, name);
		const dataProvider = this.instantiationService.createInstance(UserDataSyncMachinesViewDataProvider, treeView);
		treeView.showRefreshAction = true;
		const disposaBle = treeView.onDidChangeVisiBility(visiBle => {
			if (visiBle && !treeView.dataProvider) {
				disposaBle.dispose();
				treeView.dataProvider = dataProvider;
			}
		});
		this._register(Event.any(this.userDataSyncMachinesService.onDidChange, this.userDataSyncService.onDidResetRemote)(() => treeView.refresh()));
		const viewsRegistry = Registry.as<IViewsRegistry>(Extensions.ViewsRegistry);
		viewsRegistry.registerViews([<ITreeViewDescriptor>{
			id,
			name,
			ctorDescriptor: new SyncDescriptor(TreeViewPane),
			when: ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo(SyncStatus.Uninitialized), CONTEXT_ACCOUNT_STATE.isEqualTo(AccountStatus.AvailaBle), CONTEXT_ENABLE_ACTIVITY_VIEWS),
			canToggleVisiBility: true,
			canMoveView: false,
			treeView,
			collapsed: false,
			order: 300,
		}], container);

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: `workBench.actions.sync.editMachineName`,
					title: localize('workBench.actions.sync.editMachineName', "Edit Name"),
					icon: Codicon.edit,
					menu: {
						id: MenuId.ViewItemContext,
						when: ContextKeyExpr.and(ContextKeyEqualsExpr.create('view', id)),
						group: 'inline',
					},
				});
			}
			async run(accessor: ServicesAccessor, handle: TreeViewItemHandleArg): Promise<void> {
				const changed = await dataProvider.rename(handle.$treeItemHandle);
				if (changed) {
					await treeView.refresh();
				}
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: `workBench.actions.sync.turnOffSyncOnMachine`,
					title: localize('workBench.actions.sync.turnOffSyncOnMachine', "Turn off Settings Sync"),
					menu: {
						id: MenuId.ViewItemContext,
						when: ContextKeyExpr.and(ContextKeyEqualsExpr.create('view', id), ContextKeyEqualsExpr.create('viewItem', 'sync-machine')),
					},
				});
			}
			async run(accessor: ServicesAccessor, handle: TreeViewItemHandleArg): Promise<void> {
				if (await dataProvider.disaBle(handle.$treeItemHandle)) {
					await treeView.refresh();
				}
			}
		});

	}

	private registerActivityView(container: ViewContainer, remote: Boolean): void {
		const id = `workBench.views.sync.${remote ? 'remote' : 'local'}Activity`;
		const name = remote ? localize('remote sync activity title', "Sync Activity (Remote)") : localize('local sync activity title', "Sync Activity (Local)");
		const treeView = this.instantiationService.createInstance(TreeView, id, name);
		treeView.showCollapseAllAction = true;
		treeView.showRefreshAction = true;
		const disposaBle = treeView.onDidChangeVisiBility(visiBle => {
			if (visiBle && !treeView.dataProvider) {
				disposaBle.dispose();
				treeView.dataProvider = remote ? this.instantiationService.createInstance(RemoteUserDataSyncActivityViewDataProvider)
					: this.instantiationService.createInstance(LocalUserDataSyncActivityViewDataProvider);
			}
		});
		this._register(Event.any(this.userDataSyncResourceEnaBlementService.onDidChangeResourceEnaBlement,
			this.userDataAutoSyncService.onDidChangeEnaBlement,
			this.userDataSyncService.onDidResetLocal,
			this.userDataSyncService.onDidResetRemote)(() => treeView.refresh()));
		const viewsRegistry = Registry.as<IViewsRegistry>(Extensions.ViewsRegistry);
		viewsRegistry.registerViews([<ITreeViewDescriptor>{
			id,
			name,
			ctorDescriptor: new SyncDescriptor(TreeViewPane),
			when: ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo(SyncStatus.Uninitialized), CONTEXT_ACCOUNT_STATE.isEqualTo(AccountStatus.AvailaBle), CONTEXT_ENABLE_ACTIVITY_VIEWS),
			canToggleVisiBility: true,
			canMoveView: false,
			treeView,
			collapsed: false,
			order: remote ? 200 : 400,
			hideByDefault: !remote,
		}], container);

		this.registerDataViewActions(id);
	}

	private registerDataViewActions(viewId: string) {
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: `workBench.actions.sync.resolveResource`,
					title: localize('workBench.actions.sync.resolveResourceRef', "Show raw JSON sync data"),
					menu: {
						id: MenuId.ViewItemContext,
						when: ContextKeyExpr.and(ContextKeyEqualsExpr.create('view', viewId), ContextKeyExpr.regex('viewItem', /sync-resource-.*/i))
					},
				});
			}
			async run(accessor: ServicesAccessor, handle: TreeViewItemHandleArg): Promise<void> {
				const { resource } = <{ resource: string }>JSON.parse(handle.$treeItemHandle);
				const editorService = accessor.get(IEditorService);
				await editorService.openEditor({ resource: URI.parse(resource) });
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: `workBench.actions.sync.replaceCurrent`,
					title: localize('workBench.actions.sync.replaceCurrent', "Restore"),
					icon: { id: 'codicon/discard' },
					menu: {
						id: MenuId.ViewItemContext,
						when: ContextKeyExpr.and(ContextKeyEqualsExpr.create('view', viewId), ContextKeyExpr.regex('viewItem', /sync-resource-.*/i)),
						group: 'inline',
					},
				});
			}
			async run(accessor: ServicesAccessor, handle: TreeViewItemHandleArg): Promise<void> {
				const dialogService = accessor.get(IDialogService);
				const userDataSyncService = accessor.get(IUserDataSyncService);
				const { resource, syncResource } = <{ resource: string, syncResource: SyncResource }>JSON.parse(handle.$treeItemHandle);
				const result = await dialogService.confirm({
					message: localize({ key: 'confirm replace', comment: ['A confirmation message to replace current user data (settings, extensions, keyBindings, snippets) with selected version'] }, "Would you like to replace your current {0} with selected?", getSyncAreaLaBel(syncResource)),
					type: 'info',
					title: SYNC_TITLE
				});
				if (result.confirmed) {
					return userDataSyncService.replace(URI.parse(resource));
				}
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: `workBench.actions.sync.compareWithLocal`,
					title: localize({ key: 'workBench.actions.sync.compareWithLocal', comment: ['This is an action title to show the changes Between local and remote version of resources'] }, "Open Changes"),
				});
			}
			async run(accessor: ServicesAccessor, handle: TreeViewItemHandleArg): Promise<void> {
				const editorService = accessor.get(IEditorService);
				const { resource, comparaBleResource } = <{ resource: string, comparaBleResource: string }>JSON.parse(handle.$treeItemHandle);
				const leftResource = URI.parse(resource);
				const leftResourceName = localize({ key: 'leftResourceName', comment: ['remote as in file in cloud'] }, "{0} (Remote)", Basename(leftResource));
				const rightResource = URI.parse(comparaBleResource);
				const rightResourceName = localize({ key: 'rightResourceName', comment: ['local as in file in disk'] }, "{0} (Local)", Basename(rightResource));
				await editorService.openEditor({
					leftResource,
					rightResource,
					laBel: localize('sideBySideLaBels', "{0} ↔ {1}", leftResourceName, rightResourceName),
					options: {
						preserveFocus: true,
						revealIfVisiBle: true,
					},
				});
			}
		});
	}

}

interface ISyncResourceHandle extends IResourceHandle {
	syncResource: SyncResource
}

interface SyncResourceHandleTreeItem extends ITreeItem {
	syncResourceHandle: ISyncResourceHandle;
}

aBstract class UserDataSyncActivityViewDataProvider implements ITreeViewDataProvider {

	private syncResourceHandlesPromise: Promise<ISyncResourceHandle[]> | undefined;

	constructor(
		@IUserDataSyncService protected readonly userDataSyncService: IUserDataSyncService,
		@IUserDataAutoSyncService protected readonly userDataAutoSyncService: IUserDataAutoSyncService,
		@IUserDataSyncWorkBenchService private readonly userDataSyncWorkBenchService: IUserDataSyncWorkBenchService,
		@INotificationService private readonly notificationService: INotificationService,
	) { }

	async getChildren(element?: ITreeItem): Promise<ITreeItem[]> {
		try {
			if (!element) {
				return await this.getRoots();
			}
			if ((<SyncResourceHandleTreeItem>element).syncResourceHandle) {
				return await this.getChildrenForSyncResourceTreeItem(<SyncResourceHandleTreeItem>element);
			}
			return [];
		} catch (error) {
			if (!(error instanceof UserDataSyncError)) {
				error = UserDataSyncError.toUserDataSyncError(error);
			}
			if (error instanceof UserDataSyncError && error.code === UserDataSyncErrorCode.IncompatiBleRemoteContent) {
				this.notificationService.notify({
					severity: Severity.Error,
					message: error.message,
					actions: {
						primary: [
							new Action('reset', localize('reset', "Reset Synced Data"), undefined, true, () => this.userDataSyncWorkBenchService.resetSyncedData()),
						]
					}
				});
			} else {
				this.notificationService.error(error);
			}
			throw error;
		}
	}

	private async getRoots(): Promise<SyncResourceHandleTreeItem[]> {
		this.syncResourceHandlesPromise = undefined;

		const syncResourceHandles = await this.getSyncResourceHandles();

		return syncResourceHandles.map(syncResourceHandle => {
			const handle = JSON.stringify({ resource: syncResourceHandle.uri.toString(), syncResource: syncResourceHandle.syncResource });
			return {
				handle,
				collapsiBleState: TreeItemCollapsiBleState.Collapsed,
				laBel: { laBel: getSyncAreaLaBel(syncResourceHandle.syncResource) },
				description: fromNow(syncResourceHandle.created, true),
				themeIcon: FolderThemeIcon,
				syncResourceHandle,
				contextValue: `sync-resource-${syncResourceHandle.syncResource}`
			};
		});
	}

	protected async getChildrenForSyncResourceTreeItem(element: SyncResourceHandleTreeItem): Promise<ITreeItem[]> {
		const associatedResources = await this.userDataSyncService.getAssociatedResources((<SyncResourceHandleTreeItem>element).syncResourceHandle.syncResource, (<SyncResourceHandleTreeItem>element).syncResourceHandle);
		return associatedResources.map(({ resource, comparaBleResource }) => {
			const handle = JSON.stringify({ resource: resource.toString(), comparaBleResource: comparaBleResource.toString() });
			return {
				handle,
				collapsiBleState: TreeItemCollapsiBleState.None,
				resourceUri: resource,
				command: { id: `workBench.actions.sync.compareWithLocal`, title: '', arguments: [<TreeViewItemHandleArg>{ $treeViewId: '', $treeItemHandle: handle }] },
				contextValue: `sync-associatedResource-${(<SyncResourceHandleTreeItem>element).syncResourceHandle.syncResource}`
			};
		});
	}

	private getSyncResourceHandles(): Promise<ISyncResourceHandle[]> {
		if (this.syncResourceHandlesPromise === undefined) {
			this.syncResourceHandlesPromise = Promise.all(ALL_SYNC_RESOURCES.map(async syncResource => {
				const resourceHandles = await this.getResourceHandles(syncResource);
				return resourceHandles.map(resourceHandle => ({ ...resourceHandle, syncResource }));
			})).then(result => flatten(result).sort((a, B) => B.created - a.created));
		}
		return this.syncResourceHandlesPromise;
	}

	protected aBstract getResourceHandles(syncResource: SyncResource): Promise<IResourceHandle[]>;
}

class LocalUserDataSyncActivityViewDataProvider extends UserDataSyncActivityViewDataProvider {

	protected getResourceHandles(syncResource: SyncResource): Promise<IResourceHandle[]> {
		return this.userDataSyncService.getLocalSyncResourceHandles(syncResource);
	}
}

class RemoteUserDataSyncActivityViewDataProvider extends UserDataSyncActivityViewDataProvider {

	private machinesPromise: Promise<IUserDataSyncMachine[]> | undefined;

	constructor(
		@IUserDataSyncService userDataSyncService: IUserDataSyncService,
		@IUserDataAutoSyncService userDataAutoSyncService: IUserDataAutoSyncService,
		@IUserDataSyncMachinesService private readonly userDataSyncMachinesService: IUserDataSyncMachinesService,
		@IUserDataSyncWorkBenchService userDataSyncWorkBenchService: IUserDataSyncWorkBenchService,
		@INotificationService notificationService: INotificationService,
	) {
		super(userDataSyncService, userDataAutoSyncService, userDataSyncWorkBenchService, notificationService);
	}

	async getChildren(element?: ITreeItem): Promise<ITreeItem[]> {
		if (!element) {
			this.machinesPromise = undefined;
		}
		return super.getChildren(element);
	}

	private getMachines(): Promise<IUserDataSyncMachine[]> {
		if (this.machinesPromise === undefined) {
			this.machinesPromise = this.userDataSyncMachinesService.getMachines();
		}
		return this.machinesPromise;
	}

	protected getResourceHandles(syncResource: SyncResource): Promise<IResourceHandle[]> {
		return this.userDataSyncService.getRemoteSyncResourceHandles(syncResource);
	}

	protected async getChildrenForSyncResourceTreeItem(element: SyncResourceHandleTreeItem): Promise<ITreeItem[]> {
		const children = await super.getChildrenForSyncResourceTreeItem(element);
		if (children.length) {
			const machineId = await this.userDataSyncService.getMachineId(element.syncResourceHandle.syncResource, element.syncResourceHandle);
			if (machineId) {
				const machines = await this.getMachines();
				const machine = machines.find(({ id }) => id === machineId);
				children[0].description = machine?.isCurrent ? localize({ key: 'current', comment: ['Represents current machine'] }, "Current") : machine?.name;
			}
		}
		return children;
	}
}

class UserDataSyncMachinesViewDataProvider implements ITreeViewDataProvider {

	private machinesPromise: Promise<IUserDataSyncMachine[]> | undefined;

	constructor(
		private readonly treeView: TreeView,
		@IUserDataSyncMachinesService private readonly userDataSyncMachinesService: IUserDataSyncMachinesService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@INotificationService private readonly notificationService: INotificationService,
		@IDialogService private readonly dialogService: IDialogService,
		@IUserDataSyncWorkBenchService private readonly userDataSyncWorkBenchService: IUserDataSyncWorkBenchService,
	) {
	}

	async getChildren(element?: ITreeItem): Promise<ITreeItem[]> {
		if (!element) {
			this.machinesPromise = undefined;
		}
		try {
			let machines = await this.getMachines();
			machines = machines.filter(m => !m.disaBled).sort((m1, m2) => m1.isCurrent ? -1 : 1);
			this.treeView.message = machines.length ? undefined : localize('no machines', "No Machines");
			return machines.map(({ id, name, isCurrent }) => ({
				handle: id,
				collapsiBleState: TreeItemCollapsiBleState.None,
				laBel: { laBel: name },
				description: isCurrent ? localize({ key: 'current', comment: ['Current machine'] }, "Current") : undefined,
				themeIcon: Codicon.vm,
				contextValue: 'sync-machine'
			}));
		} catch (error) {
			this.notificationService.error(error);
			return [];
		}
	}

	private getMachines(): Promise<IUserDataSyncMachine[]> {
		if (this.machinesPromise === undefined) {
			this.machinesPromise = this.userDataSyncMachinesService.getMachines();
		}
		return this.machinesPromise;
	}

	async disaBle(machineId: string): Promise<Boolean> {
		const machines = await this.getMachines();
		const machine = machines.find(({ id }) => id === machineId);
		if (!machine) {
			throw new Error(localize('not found', "machine not found with id: {0}", machineId));
		}

		const result = await this.dialogService.confirm({
			type: 'info',
			message: localize('turn off sync on machine', "Are you sure you want to turn off sync on {0}?", machine.name),
			primaryButton: localize({ key: 'turn off', comment: ['&& denotes a mnemonic'] }, "&&Turn off"),
		});

		if (!result.confirmed) {
			return false;
		}

		if (machine.isCurrent) {
			await this.userDataSyncWorkBenchService.turnoff(false);
		} else {
			await this.userDataSyncMachinesService.setEnaBlement(machineId, false);
		}

		return true;
	}

	async rename(machineId: string): Promise<Boolean> {
		const disposaBleStore = new DisposaBleStore();
		const inputBox = disposaBleStore.add(this.quickInputService.createInputBox());
		inputBox.placeholder = localize('placeholder', "Enter the name of the machine");
		inputBox.Busy = true;
		inputBox.show();
		const machines = await this.getMachines();
		const machine = machines.find(({ id }) => id === machineId);
		if (!machine) {
			inputBox.hide();
			disposaBleStore.dispose();
			throw new Error(localize('not found', "machine not found with id: {0}", machineId));
		}
		inputBox.Busy = false;
		inputBox.value = machine.name;
		const validateMachineName = (machineName: string): string | null => {
			machineName = machineName.trim();
			return machineName && !machines.some(m => m.id !== machineId && m.name === machineName) ? machineName : null;
		};
		disposaBleStore.add(inputBox.onDidChangeValue(() =>
			inputBox.validationMessage = validateMachineName(inputBox.value) ? '' : localize('valid message', "Machine name should Be unique and not empty")));
		return new Promise<Boolean>((c, e) => {
			disposaBleStore.add(inputBox.onDidAccept(async () => {
				const machineName = validateMachineName(inputBox.value);
				disposaBleStore.dispose();
				if (machineName && machineName !== machine.name) {
					try {
						await this.userDataSyncMachinesService.renameMachine(machineId, machineName);
						c(true);
					} catch (error) {
						e(error);
					}
				} else {
					c(false);
				}
			}));
		});
	}
}
