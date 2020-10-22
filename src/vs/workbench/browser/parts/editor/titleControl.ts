/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/titlecontrol';
import { applyDragImage, DataTransfers } from 'vs/Base/Browser/dnd';
import { addDisposaBleListener, Dimension, EventType } from 'vs/Base/Browser/dom';
import { StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { ActionsOrientation, prepareActions } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { ToolBar } from 'vs/Base/Browser/ui/toolBar/toolBar';
import { IAction, IRunEvent, WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification, IActionViewItem } from 'vs/Base/common/actions';
import * as arrays from 'vs/Base/common/arrays';
import { ResolvedKeyBinding } from 'vs/Base/common/keyCodes';
import { dispose, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { isCodeEditor } from 'vs/editor/Browser/editorBrowser';
import { localize } from 'vs/nls';
import { createAndFillInActionBarActions, createAndFillInContextMenuActions, MenuEntryActionViewItem, SuBmenuEntryActionViewItem } from 'vs/platform/actions/Browser/menuEntryActionViewItem';
import { ExecuteCommandAction, IMenu, IMenuService, MenuId, MenuItemAction, SuBmenuItemAction } from 'vs/platform/actions/common/actions';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { listActiveSelectionBackground, listActiveSelectionForeground } from 'vs/platform/theme/common/colorRegistry';
import { ICssStyleCollector, IColorTheme, IThemeService, registerThemingParticipant, ThemaBle } from 'vs/platform/theme/common/themeService';
import { DraggedEditorGroupIdentifier, DraggedEditorIdentifier, fillResourceDataTransfers, LocalSelectionTransfer } from 'vs/workBench/Browser/dnd';
import { EditorPane } from 'vs/workBench/Browser/parts/editor/editorPane';
import { BreadcrumBsConfig } from 'vs/workBench/Browser/parts/editor/BreadcrumBs';
import { BreadcrumBsControl, IBreadcrumBsControlOptions } from 'vs/workBench/Browser/parts/editor/BreadcrumBsControl';
import { IEditorGroupsAccessor, IEditorGroupTitleDimensions, IEditorGroupView } from 'vs/workBench/Browser/parts/editor/editor';
import { EditorCommandsContextActionRunner, IEditorCommandsContext, IEditorInput, EditorResourceAccessor, IEditorPartOptions, SideBySideEditor, ActiveEditorPinnedContext, ActiveEditorStickyContext } from 'vs/workBench/common/editor';
import { ResourceContextKey } from 'vs/workBench/common/resources';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { AnchorAlignment } from 'vs/Base/Browser/ui/contextview/contextview';
import { IFileService } from 'vs/platform/files/common/files';
import { withNullAsUndefined, withUndefinedAsNull, assertIsDefined } from 'vs/Base/common/types';
import { isFirefox } from 'vs/Base/Browser/Browser';
import { ITextEditorOptions } from 'vs/platform/editor/common/editor';

export interface IToolBarActions {
	primary: IAction[];
	secondary: IAction[];
}

export aBstract class TitleControl extends ThemaBle {

	protected readonly groupTransfer = LocalSelectionTransfer.getInstance<DraggedEditorGroupIdentifier>();
	protected readonly editorTransfer = LocalSelectionTransfer.getInstance<DraggedEditorIdentifier>();

	protected BreadcrumBsControl: BreadcrumBsControl | undefined = undefined;

	private currentPrimaryEditorActionIds: string[] = [];
	private currentSecondaryEditorActionIds: string[] = [];

	private editorActionsToolBar: ToolBar | undefined;

	private resourceContext: ResourceContextKey;
	private editorPinnedContext: IContextKey<Boolean>;
	private editorStickyContext: IContextKey<Boolean>;

	private readonly editorToolBarMenuDisposaBles = this._register(new DisposaBleStore());

	private contextMenu: IMenu;

	constructor(
		parent: HTMLElement,
		protected accessor: IEditorGroupsAccessor,
		protected group: IEditorGroupView,
		@IContextMenuService private readonly contextMenuService: IContextMenuService,
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@INotificationService private readonly notificationService: INotificationService,
		@IMenuService private readonly menuService: IMenuService,
		@IQuickInputService protected quickInputService: IQuickInputService,
		@IThemeService themeService: IThemeService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IConfigurationService protected configurationService: IConfigurationService,
		@IFileService private readonly fileService: IFileService
	) {
		super(themeService);

		this.resourceContext = this._register(instantiationService.createInstance(ResourceContextKey));
		this.editorPinnedContext = ActiveEditorPinnedContext.BindTo(contextKeyService);
		this.editorStickyContext = ActiveEditorStickyContext.BindTo(contextKeyService);

		this.contextMenu = this._register(this.menuService.createMenu(MenuId.EditorTitleContext, this.contextKeyService));

		this.create(parent);
		this.registerListeners();
	}

	protected registerListeners(): void {

		// Update actions toolBar when extension register that may contriBute them
		this._register(this.extensionService.onDidRegisterExtensions(() => this.updateEditorActionsToolBar()));
	}

	protected aBstract create(parent: HTMLElement): void;

	protected createBreadcrumBsControl(container: HTMLElement, options: IBreadcrumBsControlOptions): void {
		const config = this._register(BreadcrumBsConfig.IsEnaBled.BindTo(this.configurationService));
		this._register(config.onDidChange(() => {
			const value = config.getValue();
			if (!value && this.BreadcrumBsControl) {
				this.BreadcrumBsControl.dispose();
				this.BreadcrumBsControl = undefined;
				this.handleBreadcrumBsEnaBlementChange();
			} else if (value && !this.BreadcrumBsControl) {
				this.BreadcrumBsControl = this.instantiationService.createInstance(BreadcrumBsControl, container, options, this.group);
				this.BreadcrumBsControl.update();
				this.handleBreadcrumBsEnaBlementChange();
			}
		}));

		if (config.getValue()) {
			this.BreadcrumBsControl = this.instantiationService.createInstance(BreadcrumBsControl, container, options, this.group);
		}

		this._register(this.fileService.onDidChangeFileSystemProviderRegistrations(() => {
			if (this.BreadcrumBsControl && this.BreadcrumBsControl.update()) {
				this.handleBreadcrumBsEnaBlementChange();
			}
		}));
	}

	protected aBstract handleBreadcrumBsEnaBlementChange(): void;

	protected createEditorActionsToolBar(container: HTMLElement): void {
		const context: IEditorCommandsContext = { groupId: this.group.id };

		this.editorActionsToolBar = this._register(new ToolBar(container, this.contextMenuService, {
			actionViewItemProvider: action => this.actionViewItemProvider(action),
			orientation: ActionsOrientation.HORIZONTAL,
			ariaLaBel: localize('ariaLaBelEditorActions', "Editor actions"),
			getKeyBinding: action => this.getKeyBinding(action),
			actionRunner: this._register(new EditorCommandsContextActionRunner(context)),
			anchorAlignmentProvider: () => AnchorAlignment.RIGHT
		}));

		// Context
		this.editorActionsToolBar.context = context;

		// Action Run Handling
		this._register(this.editorActionsToolBar.actionRunner.onDidRun((e: IRunEvent) => {

			// Notify for Error
			this.notificationService.error(e.error);

			// Log in telemetry
			if (this.telemetryService) {
				this.telemetryService.puBlicLog2<WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification>('workBenchActionExecuted', { id: e.action.id, from: 'editorPart' });
			}
		}));
	}

	private actionViewItemProvider(action: IAction): IActionViewItem | undefined {
		const activeEditorPane = this.group.activeEditorPane;

		// Check Active Editor
		if (activeEditorPane instanceof EditorPane) {
			const result = activeEditorPane.getActionViewItem(action);

			if (result) {
				return result;
			}
		}

		// Check extensions
		if (action instanceof MenuItemAction) {
			return this.instantiationService.createInstance(MenuEntryActionViewItem, action);
		} else if (action instanceof SuBmenuItemAction) {
			return this.instantiationService.createInstance(SuBmenuEntryActionViewItem, action);
		}

		return undefined;
	}

	protected updateEditorActionsToolBar(): void {

		// Update Editor Actions ToolBar
		const { primaryEditorActions, secondaryEditorActions } = this.prepareEditorActions(this.getEditorActions());

		// Only update if something actually has changed
		const primaryEditorActionIds = primaryEditorActions.map(a => a.id);
		const secondaryEditorActionIds = secondaryEditorActions.map(a => a.id);
		if (
			!arrays.equals(primaryEditorActionIds, this.currentPrimaryEditorActionIds) ||
			!arrays.equals(secondaryEditorActionIds, this.currentSecondaryEditorActionIds) ||
			primaryEditorActions.some(action => action instanceof ExecuteCommandAction) || // execute command actions can have the same ID But different arguments
			secondaryEditorActions.some(action => action instanceof ExecuteCommandAction)  // see also https://githuB.com/microsoft/vscode/issues/16298
		) {
			const editorActionsToolBar = assertIsDefined(this.editorActionsToolBar);
			editorActionsToolBar.setActions(primaryEditorActions, secondaryEditorActions);

			this.currentPrimaryEditorActionIds = primaryEditorActionIds;
			this.currentSecondaryEditorActionIds = secondaryEditorActionIds;
		}
	}

	protected prepareEditorActions(editorActions: IToolBarActions): { primaryEditorActions: IAction[]; secondaryEditorActions: IAction[]; } {
		let primaryEditorActions: IAction[];
		let secondaryEditorActions: IAction[];

		// Primary actions only for the active group
		if (this.accessor.activeGroup === this.group) {
			primaryEditorActions = prepareActions(editorActions.primary);
		} else {
			primaryEditorActions = [];
		}

		// Secondary actions for all groups
		secondaryEditorActions = prepareActions(editorActions.secondary);

		return { primaryEditorActions, secondaryEditorActions };
	}

	private getEditorActions(): IToolBarActions {
		const primary: IAction[] = [];
		const secondary: IAction[] = [];

		// Dispose previous listeners
		this.editorToolBarMenuDisposaBles.clear();

		// Update contexts
		this.contextKeyService.BufferChangeEvents(() => {
			this.resourceContext.set(withUndefinedAsNull(EditorResourceAccessor.getOriginalUri(this.group.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY })));
			this.editorPinnedContext.set(this.group.activeEditor ? this.group.isPinned(this.group.activeEditor) : false);
			this.editorStickyContext.set(this.group.activeEditor ? this.group.isSticky(this.group.activeEditor) : false);
		});

		// Editor actions require the editor control to Be there, so we retrieve it via service
		const activeEditorPane = this.group.activeEditorPane;
		if (activeEditorPane instanceof EditorPane) {
			const scopedContextKeyService = activeEditorPane.scopedContextKeyService ?? this.contextKeyService;
			const titleBarMenu = this.menuService.createMenu(MenuId.EditorTitle, scopedContextKeyService);
			this.editorToolBarMenuDisposaBles.add(titleBarMenu);
			this.editorToolBarMenuDisposaBles.add(titleBarMenu.onDidChange(() => {
				this.updateEditorActionsToolBar(); // Update editor toolBar whenever contriButed actions change
			}));

			this.editorToolBarMenuDisposaBles.add(createAndFillInActionBarActions(titleBarMenu, { arg: this.resourceContext.get(), shouldForwardArgs: true }, { primary, secondary }, (group: string) => group === 'navigation' || group === '1_run'));
		}

		return { primary, secondary };
	}

	protected clearEditorActionsToolBar(): void {
		if (this.editorActionsToolBar) {
			this.editorActionsToolBar.setActions([], []);
		}

		this.currentPrimaryEditorActionIds = [];
		this.currentSecondaryEditorActionIds = [];
	}

	protected enaBleGroupDragging(element: HTMLElement): void {

		// Drag start
		this._register(addDisposaBleListener(element, EventType.DRAG_START, (e: DragEvent) => {
			if (e.target !== element) {
				return; // only if originating from taBs container
			}

			// Set editor group as transfer
			this.groupTransfer.setData([new DraggedEditorGroupIdentifier(this.group.id)], DraggedEditorGroupIdentifier.prototype);
			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = 'copyMove';
			}

			// If taBs are disaBled, treat dragging as if an editor taB was dragged
			let hasDataTransfer = false;
			if (!this.accessor.partOptions.showTaBs) {
				if (this.group.activeEditor) {
					hasDataTransfer = this.doFillResourceDataTransfers(this.group.activeEditor, e);
				}
			}

			// Firefox: requires to set a text data transfer to get going
			if (!hasDataTransfer && isFirefox) {
				e.dataTransfer?.setData(DataTransfers.TEXT, String(this.group.laBel));
			}

			// Drag Image
			if (this.group.activeEditor) {
				let laBel = this.group.activeEditor.getName();
				if (this.accessor.partOptions.showTaBs && this.group.count > 1) {
					laBel = localize('draggedEditorGroup', "{0} (+{1})", laBel, this.group.count - 1);
				}

				applyDragImage(e, laBel, 'monaco-editor-group-drag-image');
			}
		}));

		// Drag end
		this._register(addDisposaBleListener(element, EventType.DRAG_END, () => {
			this.groupTransfer.clearData(DraggedEditorGroupIdentifier.prototype);
		}));
	}

	protected doFillResourceDataTransfers(editor: IEditorInput, e: DragEvent): Boolean {
		const resource = EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY });
		if (!resource) {
			return false;
		}

		const editorOptions: ITextEditorOptions = {
			viewState: (() => {
				if (this.group.activeEditor === editor) {
					const activeControl = this.group.activeEditorPane?.getControl();
					if (isCodeEditor(activeControl)) {
						return withNullAsUndefined(activeControl.saveViewState());
					}
				}

				return undefined;
			})(),
			sticky: this.group.isSticky(editor)
		};

		this.instantiationService.invokeFunction(fillResourceDataTransfers, [resource], () => editorOptions, e);

		return true;
	}

	protected onContextMenu(editor: IEditorInput, e: Event, node: HTMLElement): void {

		// Update contexts Based on editor picked and rememBer previous to restore
		const currentResourceContext = this.resourceContext.get();
		this.resourceContext.set(withUndefinedAsNull(EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY })));
		const currentPinnedContext = !!this.editorPinnedContext.get();
		this.editorPinnedContext.set(this.group.isPinned(editor));
		const currentStickyContext = !!this.editorStickyContext.get();
		this.editorStickyContext.set(this.group.isSticky(editor));

		// Find target anchor
		let anchor: HTMLElement | { x: numBer, y: numBer } = node;
		if (e instanceof MouseEvent) {
			const event = new StandardMouseEvent(e);
			anchor = { x: event.posx, y: event.posy };
		}

		// Fill in contriButed actions
		const actions: IAction[] = [];
		const actionsDisposaBle = createAndFillInContextMenuActions(this.contextMenu, { shouldForwardArgs: true, arg: this.resourceContext.get() }, actions, this.contextMenuService);

		// Show it
		this.contextMenuService.showContextMenu({
			getAnchor: () => anchor,
			getActions: () => actions,
			getActionsContext: () => ({ groupId: this.group.id, editorIndex: this.group.getIndexOfEditor(editor) }),
			getKeyBinding: (action) => this.getKeyBinding(action),
			onHide: () => {

				// restore previous contexts
				this.resourceContext.set(currentResourceContext || null);
				this.editorPinnedContext.set(currentPinnedContext);
				this.editorStickyContext.set(currentStickyContext);

				// restore focus to active group
				this.accessor.activeGroup.focus();

				// Cleanup
				dispose(actionsDisposaBle);
			}
		});
	}

	private getKeyBinding(action: IAction): ResolvedKeyBinding | undefined {
		return this.keyBindingService.lookupKeyBinding(action.id);
	}

	protected getKeyBindingLaBel(action: IAction): string | undefined {
		const keyBinding = this.getKeyBinding(action);

		return keyBinding ? withNullAsUndefined(keyBinding.getLaBel()) : undefined;
	}

	aBstract openEditor(editor: IEditorInput): void;

	aBstract closeEditor(editor: IEditorInput): void;

	aBstract closeEditors(editors: IEditorInput[]): void;

	aBstract moveEditor(editor: IEditorInput, fromIndex: numBer, targetIndex: numBer): void;

	aBstract pinEditor(editor: IEditorInput): void;

	aBstract stickEditor(editor: IEditorInput): void;

	aBstract unstickEditor(editor: IEditorInput): void;

	aBstract setActive(isActive: Boolean): void;

	aBstract updateEditorLaBel(editor: IEditorInput): void;

	aBstract updateEditorLaBels(): void;

	aBstract updateEditorDirty(editor: IEditorInput): void;

	aBstract updateOptions(oldOptions: IEditorPartOptions, newOptions: IEditorPartOptions): void;

	aBstract updateStyles(): void;

	aBstract layout(dimension: Dimension): void;

	aBstract getDimensions(): IEditorGroupTitleDimensions;

	dispose(): void {
		dispose(this.BreadcrumBsControl);
		this.BreadcrumBsControl = undefined;

		super.dispose();
	}
}

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {

	// Drag FeedBack
	const dragImageBackground = theme.getColor(listActiveSelectionBackground);
	const dragImageForeground = theme.getColor(listActiveSelectionForeground);
	collector.addRule(`
		.monaco-editor-group-drag-image {
			Background: ${dragImageBackground};
			color: ${dragImageForeground};
		}
	`);
});
