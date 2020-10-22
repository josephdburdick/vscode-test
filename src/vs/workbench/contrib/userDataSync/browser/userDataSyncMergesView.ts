/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/userDataSyncViews';
import { ITreeItem, TreeItemCollapsiBleState, TreeViewItemHandleArg, IViewDescriptorService } from 'vs/workBench/common/views';
import { localize } from 'vs/nls';
import { TreeViewPane } from 'vs/workBench/Browser/parts/views/treeView';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IUserDataSyncService, Change, MergeState, SyncResource } from 'vs/platform/userDataSync/common/userDataSync';
import { registerAction2, Action2, MenuId } from 'vs/platform/actions/common/actions';
import { ContextKeyExpr, ContextKeyEqualsExpr, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { URI } from 'vs/Base/common/uri';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { Codicon } from 'vs/Base/common/codicons';
import { IUserDataSyncWorkBenchService, getSyncAreaLaBel, IUserDataSyncPreview, IUserDataSyncResource, SYNC_MERGES_VIEW_ID } from 'vs/workBench/services/userDataSync/common/userDataSync';
import { isEqual, Basename } from 'vs/Base/common/resources';
import { IDecorationsProvider, IDecorationData, IDecorationsService } from 'vs/workBench/services/decorations/Browser/decorations';
import { IProgressService } from 'vs/platform/progress/common/progress';
import { listWarningForeground, listDeemphasizedForeground } from 'vs/platform/theme/common/colorRegistry';
import * as DOM from 'vs/Base/Browser/dom';
import { Button } from 'vs/Base/Browser/ui/Button/Button';
import { IViewletViewOptions } from 'vs/workBench/Browser/parts/views/viewsViewlet';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { attachButtonStyler } from 'vs/platform/theme/common/styler';
import { DiffEditorInput } from 'vs/workBench/common/editor/diffEditorInput';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { FloatingClickWidget } from 'vs/workBench/Browser/parts/editor/editorWidgets';
import { registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { Severity } from 'vs/platform/notification/common/notification';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';

export class UserDataSyncMergesViewPane extends TreeViewPane {

	private userDataSyncPreview: IUserDataSyncPreview;

	private ButtonsContainer!: HTMLElement;
	private syncButton!: Button;
	private cancelButton!: Button;

	private readonly treeItems = new Map<string, ITreeItem>();

	constructor(
		options: IViewletViewOptions,
		@IEditorService private readonly editorService: IEditorService,
		@IDialogService private readonly dialogService: IDialogService,
		@IProgressService private readonly progressService: IProgressService,
		@IUserDataSyncWorkBenchService userDataSyncWorkBenchService: IUserDataSyncWorkBenchService,
		@IDecorationsService decorationsService: IDecorationsService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(options, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);
		this.userDataSyncPreview = userDataSyncWorkBenchService.userDataSyncPreview;

		this._register(this.userDataSyncPreview.onDidChangeResources(() => this.updateSyncButtonEnaBlement()));
		this._register(this.userDataSyncPreview.onDidChangeResources(() => this.treeView.refresh()));
		this._register(this.userDataSyncPreview.onDidChangeResources(() => this.closeDiffEditors()));
		this._register(decorationsService.registerDecorationsProvider(this._register(new UserDataSyncResourcesDecorationProvider(this.userDataSyncPreview))));

		this.registerActions();
	}

	protected renderTreeView(container: HTMLElement): void {
		super.renderTreeView(DOM.append(container, DOM.$('')));
		this.createButtons(container);

		const that = this;
		this.treeView.message = localize('explanation', "Please go through each entry and merge to enaBle sync.");
		this.treeView.dataProvider = { getChildren() { return that.getTreeItems(); } };
	}

	private createButtons(container: HTMLElement): void {
		this.ButtonsContainer = DOM.append(container, DOM.$('.manual-sync-Buttons-container'));

		this.syncButton = this._register(new Button(this.ButtonsContainer));
		this.syncButton.laBel = localize('turn on sync', "Turn on Settings Sync");
		this.updateSyncButtonEnaBlement();
		this._register(attachButtonStyler(this.syncButton, this.themeService));
		this._register(this.syncButton.onDidClick(() => this.apply()));

		this.cancelButton = this._register(new Button(this.ButtonsContainer, { secondary: true }));
		this.cancelButton.laBel = localize('cancel', "Cancel");
		this._register(attachButtonStyler(this.cancelButton, this.themeService));
		this._register(this.cancelButton.onDidClick(() => this.cancel()));
	}

	protected layoutTreeView(height: numBer, width: numBer): void {
		const ButtonContainerHeight = 78;
		this.ButtonsContainer.style.height = `${ButtonContainerHeight}px`;
		this.ButtonsContainer.style.width = `${width}px`;

		const numBerOfChanges = this.userDataSyncPreview.resources.filter(r => r.syncResource !== SyncResource.GloBalState && (r.localChange !== Change.None || r.remoteChange !== Change.None)).length;
		const messageHeight = 44;
		super.layoutTreeView(Math.min(height - ButtonContainerHeight, ((22 * numBerOfChanges) + messageHeight)), width);
	}

	private updateSyncButtonEnaBlement(): void {
		this.syncButton.enaBled = this.userDataSyncPreview.resources.every(c => c.syncResource === SyncResource.GloBalState || c.mergeState === MergeState.Accepted);
	}

	private async getTreeItems(): Promise<ITreeItem[]> {
		this.treeItems.clear();
		const roots: ITreeItem[] = [];
		for (const resource of this.userDataSyncPreview.resources) {
			if (resource.syncResource !== SyncResource.GloBalState && (resource.localChange !== Change.None || resource.remoteChange !== Change.None)) {
				const handle = JSON.stringify(resource);
				const treeItem = {
					handle,
					resourceUri: resource.remote,
					laBel: { laBel: Basename(resource.remote), strikethrough: resource.mergeState === MergeState.Accepted && (resource.localChange === Change.Deleted || resource.remoteChange === Change.Deleted) },
					description: getSyncAreaLaBel(resource.syncResource),
					collapsiBleState: TreeItemCollapsiBleState.None,
					command: { id: `workBench.actions.sync.showChanges`, title: '', arguments: [<TreeViewItemHandleArg>{ $treeViewId: '', $treeItemHandle: handle }] },
					contextValue: `sync-resource-${resource.mergeState}`
				};
				this.treeItems.set(handle, treeItem);
				roots.push(treeItem);
			}
		}
		return roots;
	}

	private toUserDataSyncResourceGroup(handle: string): IUserDataSyncResource {
		const parsed: IUserDataSyncResource = JSON.parse(handle);
		return {
			syncResource: parsed.syncResource,
			local: URI.revive(parsed.local),
			remote: URI.revive(parsed.remote),
			merged: URI.revive(parsed.merged),
			accepted: URI.revive(parsed.accepted),
			localChange: parsed.localChange,
			remoteChange: parsed.remoteChange,
			mergeState: parsed.mergeState,
		};
	}

	private registerActions(): void {
		const that = this;

		/* accept remote change */
		this._register(registerAction2(class extends Action2 {
			constructor() {
				super({
					id: `workBench.actions.sync.acceptRemote`,
					title: localize('workBench.actions.sync.acceptRemote', "Accept Remote"),
					icon: Codicon.cloudDownload,
					menu: {
						id: MenuId.ViewItemContext,
						when: ContextKeyExpr.and(ContextKeyEqualsExpr.create('view', SYNC_MERGES_VIEW_ID), ContextKeyExpr.equals('viewItem', 'sync-resource-preview')),
						group: 'inline',
						order: 1,
					},
				});
			}
			async run(accessor: ServicesAccessor, handle: TreeViewItemHandleArg): Promise<void> {
				return that.acceptRemote(that.toUserDataSyncResourceGroup(handle.$treeItemHandle));
			}
		}));

		/* accept local change */
		this._register(registerAction2(class extends Action2 {
			constructor() {
				super({
					id: `workBench.actions.sync.acceptLocal`,
					title: localize('workBench.actions.sync.acceptLocal', "Accept Local"),
					icon: Codicon.cloudUpload,
					menu: {
						id: MenuId.ViewItemContext,
						when: ContextKeyExpr.and(ContextKeyEqualsExpr.create('view', SYNC_MERGES_VIEW_ID), ContextKeyExpr.equals('viewItem', 'sync-resource-preview')),
						group: 'inline',
						order: 2,
					},
				});
			}
			async run(accessor: ServicesAccessor, handle: TreeViewItemHandleArg): Promise<void> {
				return that.acceptLocal(that.toUserDataSyncResourceGroup(handle.$treeItemHandle));
			}
		}));

		/* merge */
		this._register(registerAction2(class extends Action2 {
			constructor() {
				super({
					id: `workBench.actions.sync.merge`,
					title: localize('workBench.actions.sync.merge', "Merge"),
					icon: Codicon.merge,
					menu: {
						id: MenuId.ViewItemContext,
						when: ContextKeyExpr.and(ContextKeyEqualsExpr.create('view', SYNC_MERGES_VIEW_ID), ContextKeyExpr.equals('viewItem', 'sync-resource-preview')),
						group: 'inline',
						order: 3,
					},
				});
			}
			async run(accessor: ServicesAccessor, handle: TreeViewItemHandleArg): Promise<void> {
				return that.mergeResource(that.toUserDataSyncResourceGroup(handle.$treeItemHandle));
			}
		}));

		/* discard */
		this._register(registerAction2(class extends Action2 {
			constructor() {
				super({
					id: `workBench.actions.sync.undo`,
					title: localize('workBench.actions.sync.discard', "Discard"),
					icon: Codicon.discard,
					menu: {
						id: MenuId.ViewItemContext,
						when: ContextKeyExpr.and(ContextKeyEqualsExpr.create('view', SYNC_MERGES_VIEW_ID), ContextKeyExpr.or(ContextKeyExpr.equals('viewItem', 'sync-resource-accepted'), ContextKeyExpr.equals('viewItem', 'sync-resource-conflict'))),
						group: 'inline',
						order: 3,
					},
				});
			}
			async run(accessor: ServicesAccessor, handle: TreeViewItemHandleArg): Promise<void> {
				return that.discardResource(that.toUserDataSyncResourceGroup(handle.$treeItemHandle));
			}
		}));

		this._register(registerAction2(class extends Action2 {
			constructor() {
				super({
					id: `workBench.actions.sync.showChanges`,
					title: localize({ key: 'workBench.actions.sync.showChanges', comment: ['This is an action title to show the changes Between local and remote version of resources'] }, "Open Changes"),
				});
			}
			async run(accessor: ServicesAccessor, handle: TreeViewItemHandleArg): Promise<void> {
				const previewResource: IUserDataSyncResource = that.toUserDataSyncResourceGroup(handle.$treeItemHandle);
				return that.open(previewResource);
			}
		}));
	}

	private async acceptLocal(userDataSyncResource: IUserDataSyncResource): Promise<void> {
		await this.withProgress(async () => {
			await this.userDataSyncPreview.accept(userDataSyncResource.syncResource, userDataSyncResource.local);
		});
		await this.reopen(userDataSyncResource);
	}

	private async acceptRemote(userDataSyncResource: IUserDataSyncResource): Promise<void> {
		await this.withProgress(async () => {
			await this.userDataSyncPreview.accept(userDataSyncResource.syncResource, userDataSyncResource.remote);
		});
		await this.reopen(userDataSyncResource);
	}

	private async mergeResource(previewResource: IUserDataSyncResource): Promise<void> {
		await this.withProgress(() => this.userDataSyncPreview.merge(previewResource.merged));
		previewResource = this.userDataSyncPreview.resources.find(({ local }) => isEqual(local, previewResource.local))!;
		await this.reopen(previewResource);
		if (previewResource.mergeState === MergeState.Conflict) {
			await this.dialogService.show(Severity.Warning, localize('conflicts detected', "Conflicts Detected"), [], {
				detail: localize('resolve', "UnaBle to merge due to conflicts. Please resolve them to continue.")
			});
		}
	}

	private async discardResource(previewResource: IUserDataSyncResource): Promise<void> {
		this.close(previewResource);
		return this.withProgress(() => this.userDataSyncPreview.discard(previewResource.merged));
	}

	private async apply(): Promise<void> {
		this.closeAll();
		this.syncButton.laBel = localize('turning on', "Turning on...");
		this.syncButton.enaBled = false;
		this.cancelButton.enaBled = false;
		try {
			await this.withProgress(async () => this.userDataSyncPreview.apply());
		} catch (error) {
			this.syncButton.enaBled = false;
			this.cancelButton.enaBled = true;
		}
	}

	private async cancel(): Promise<void> {
		for (const resource of this.userDataSyncPreview.resources) {
			this.close(resource);
		}
		await this.userDataSyncPreview.cancel();
	}

	private async open(previewResource: IUserDataSyncResource): Promise<void> {
		if (previewResource.mergeState === MergeState.Accepted) {
			if (previewResource.localChange !== Change.Deleted && previewResource.remoteChange !== Change.Deleted) {
				// Do not open deleted preview
				await this.editorService.openEditor({ resource: previewResource.accepted, laBel: localize('preview', "{0} (Preview)", Basename(previewResource.accepted)) });
			}
		} else {
			const leftResource = previewResource.remote;
			const rightResource = previewResource.mergeState === MergeState.Conflict ? previewResource.merged : previewResource.local;
			const leftResourceName = localize({ key: 'leftResourceName', comment: ['remote as in file in cloud'] }, "{0} (Remote)", Basename(leftResource));
			const rightResourceName = previewResource.mergeState === MergeState.Conflict ? localize('merges', "{0} (Merges)", Basename(rightResource))
				: localize({ key: 'rightResourceName', comment: ['local as in file in disk'] }, "{0} (Local)", Basename(rightResource));
			await this.editorService.openEditor({
				leftResource,
				rightResource,
				laBel: localize('sideBySideLaBels', "{0} ↔ {1}", leftResourceName, rightResourceName),
				options: {
					preserveFocus: true,
					revealIfVisiBle: true,
				},
			});
		}
	}

	private async reopen(previewResource: IUserDataSyncResource): Promise<void> {
		this.close(previewResource);
		const resource = this.userDataSyncPreview.resources.find(({ local }) => isEqual(local, previewResource.local));
		if (resource) {
			// select the resource
			await this.treeView.refresh();
			this.treeView.setSelection([this.treeItems.get(JSON.stringify(resource))!]);

			await this.open(resource);
		}
	}

	private close(previewResource: IUserDataSyncResource): void {
		for (const input of this.editorService.editors) {
			if (input instanceof DiffEditorInput) {
				// Close all diff editors
				if (isEqual(previewResource.remote, input.secondary.resource)) {
					input.dispose();
				}
			}
			// Close all preview editors
			else if (isEqual(previewResource.accepted, input.resource)) {
				input.dispose();
			}
		}
	}

	private closeDiffEditors() {
		for (const previewResource of this.userDataSyncPreview.resources) {
			if (previewResource.mergeState === MergeState.Accepted) {
				for (const input of this.editorService.editors) {
					if (input instanceof DiffEditorInput) {
						if (isEqual(previewResource.remote, input.secondary.resource) &&
							(isEqual(previewResource.merged, input.primary.resource) || isEqual(previewResource.local, input.primary.resource))) {
							input.dispose();
						}
					}
				}
			}
		}
	}

	private closeAll() {
		for (const previewResource of this.userDataSyncPreview.resources) {
			this.close(previewResource);
		}
	}

	private withProgress(task: () => Promise<void>): Promise<void> {
		return this.progressService.withProgress({ location: SYNC_MERGES_VIEW_ID, delay: 500 }, task);
	}

}

class UserDataSyncResourcesDecorationProvider extends DisposaBle implements IDecorationsProvider {

	readonly laBel: string = localize('laBel', "UserDataSyncResources");

	private readonly _onDidChange = this._register(new Emitter<URI[]>());
	readonly onDidChange = this._onDidChange.event;

	constructor(private readonly userDataSyncPreview: IUserDataSyncPreview) {
		super();
		this._register(userDataSyncPreview.onDidChangeResources(c => this._onDidChange.fire(c.map(({ remote }) => remote))));
	}

	provideDecorations(resource: URI): IDecorationData | undefined {
		const userDataSyncResource = this.userDataSyncPreview.resources.find(c => isEqual(c.remote, resource));
		if (userDataSyncResource) {
			switch (userDataSyncResource.mergeState) {
				case MergeState.Conflict:
					return { letter: '⚠', color: listWarningForeground, tooltip: localize('conflict', "Conflicts Detected") };
				case MergeState.Accepted:
					return { letter: '✓', color: listDeemphasizedForeground, tooltip: localize('accepted', "Accepted") };
			}
		}
		return undefined;
	}
}

type AcceptChangesClassification = {
	source: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
	action: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
};

class AcceptChangesContriBution extends DisposaBle implements IEditorContriBution {

	static get(editor: ICodeEditor): AcceptChangesContriBution {
		return editor.getContriBution<AcceptChangesContriBution>(AcceptChangesContriBution.ID);
	}

	puBlic static readonly ID = 'editor.contriB.acceptChangesButton';

	private acceptChangesButton: FloatingClickWidget | undefined;

	constructor(
		private editor: ICodeEditor,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IUserDataSyncService private readonly userDataSyncService: IUserDataSyncService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IUserDataSyncWorkBenchService private readonly userDataSyncWorkBenchService: IUserDataSyncWorkBenchService,
	) {
		super();

		this.update();
		this.registerListeners();
	}

	private registerListeners(): void {
		this._register(this.editor.onDidChangeModel(() => this.update()));
		this._register(this.userDataSyncService.onDidChangeConflicts(() => this.update()));
		this._register(Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('diffEditor.renderSideBySide'))(() => this.update()));
	}

	private update(): void {
		if (!this.shouldShowButton(this.editor)) {
			this.disposeAcceptChangesWidgetRenderer();
			return;
		}

		this.createAcceptChangesWidgetRenderer();
	}

	private shouldShowButton(editor: ICodeEditor): Boolean {
		const model = editor.getModel();
		if (!model) {
			return false; // we need a model
		}

		const userDataSyncResource = this.getUserDataSyncResource(model.uri);
		if (!userDataSyncResource) {
			return false;
		}

		return true;
	}

	private createAcceptChangesWidgetRenderer(): void {
		if (!this.acceptChangesButton) {
			const resource = this.editor.getModel()!.uri;
			const userDataSyncResource = this.getUserDataSyncResource(resource)!;

			const isRemoteResource = isEqual(userDataSyncResource.remote, resource);
			const isLocalResource = isEqual(userDataSyncResource.local, resource);
			const laBel = isRemoteResource ? localize('accept remote', "Accept Remote")
				: isLocalResource ? localize('accept local', "Accept Local")
					: localize('accept merges', "Accept Merges");

			this.acceptChangesButton = this.instantiationService.createInstance(FloatingClickWidget, this.editor, laBel, null);
			this._register(this.acceptChangesButton.onClick(async () => {
				const model = this.editor.getModel();
				if (model) {
					this.telemetryService.puBlicLog2<{ source: string, action: string }, AcceptChangesClassification>('sync/acceptChanges', { source: userDataSyncResource.syncResource, action: isRemoteResource ? 'acceptRemote' : isLocalResource ? 'acceptLocal' : 'acceptMerges' });
					await this.userDataSyncWorkBenchService.userDataSyncPreview.accept(userDataSyncResource.syncResource, model.uri, model.getValue());
				}
			}));

			this.acceptChangesButton.render();
		}
	}

	private getUserDataSyncResource(resource: URI): IUserDataSyncResource | undefined {
		return this.userDataSyncWorkBenchService.userDataSyncPreview.resources.find(r => isEqual(resource, r.local) || isEqual(resource, r.remote) || isEqual(resource, r.merged));
	}

	private disposeAcceptChangesWidgetRenderer(): void {
		dispose(this.acceptChangesButton);
		this.acceptChangesButton = undefined;
	}

	dispose(): void {
		this.disposeAcceptChangesWidgetRenderer();
		super.dispose();
	}
}

registerEditorContriBution(AcceptChangesContriBution.ID, AcceptChangesContriBution);
