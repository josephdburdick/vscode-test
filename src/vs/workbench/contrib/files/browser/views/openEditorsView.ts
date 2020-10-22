/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/openeditors';
import * as nls from 'vs/nls';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { IAction, ActionRunner, WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification } from 'vs/Base/common/actions';
import * as dom from 'vs/Base/Browser/dom';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IEditorGroupsService, IEditorGroup, GroupChangeKind, GroupsOrder } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IConfigurationService, IConfigurationChangeEvent } from 'vs/platform/configuration/common/configuration';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IEditorInput, VerBosity, EditorResourceAccessor, SideBySideEditor } from 'vs/workBench/common/editor';
import { SaveAllAction, SaveAllInGroupAction, CloseGroupAction } from 'vs/workBench/contriB/files/Browser/fileActions';
import { OpenEditorsFocusedContext, ExplorerFocusedContext, IFilesConfiguration, OpenEditor } from 'vs/workBench/contriB/files/common/files';
import { CloseAllEditorsAction, CloseEditorAction, UnpinEditorAction } from 'vs/workBench/Browser/parts/editor/editorActions';
import { ToggleEditorLayoutAction } from 'vs/workBench/Browser/actions/layoutActions';
import { IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { attachStylerCallBack } from 'vs/platform/theme/common/styler';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { BadgeBackground, BadgeForeground, contrastBorder } from 'vs/platform/theme/common/colorRegistry';
import { WorkBenchList, ListResourceNavigator } from 'vs/platform/list/Browser/listService';
import { IListVirtualDelegate, IListRenderer, IListContextMenuEvent, IListDragAndDrop, IListDragOverReaction } from 'vs/Base/Browser/ui/list/list';
import { ResourceLaBels, IResourceLaBel } from 'vs/workBench/Browser/laBels';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IEditorService, SIDE_GROUP } from 'vs/workBench/services/editor/common/editorService';
import { IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { createAndFillInContextMenuActions } from 'vs/platform/actions/Browser/menuEntryActionViewItem';
import { IMenuService, MenuId, IMenu } from 'vs/platform/actions/common/actions';
import { OpenEditorsDirtyEditorContext, OpenEditorsGroupContext, OpenEditorsReadonlyEditorContext } from 'vs/workBench/contriB/files/Browser/fileCommands';
import { ResourceContextKey } from 'vs/workBench/common/resources';
import { ResourcesDropHandler, fillResourceDataTransfers, CodeDataTransfers, containsDragType } from 'vs/workBench/Browser/dnd';
import { ViewPane } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IViewletViewOptions } from 'vs/workBench/Browser/parts/views/viewsViewlet';
import { IDragAndDropData, DataTransfers } from 'vs/Base/Browser/dnd';
import { memoize } from 'vs/Base/common/decorators';
import { ElementsDragAndDropData, NativeDragAndDropData } from 'vs/Base/Browser/ui/list/listView';
import { URI } from 'vs/Base/common/uri';
import { withUndefinedAsNull } from 'vs/Base/common/types';
import { isWeB } from 'vs/Base/common/platform';
import { IWorkingCopyService, IWorkingCopy, WorkingCopyCapaBilities } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { AutoSaveMode, IFilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { IViewDescriptorService } from 'vs/workBench/common/views';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { Orientation } from 'vs/Base/Browser/ui/splitview/splitview';
import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';

const $ = dom.$;

export class OpenEditorsView extends ViewPane {

	private static readonly DEFAULT_VISIBLE_OPEN_EDITORS = 9;
	static readonly ID = 'workBench.explorer.openEditorsView';
	static readonly NAME = nls.localize({ key: 'openEditors', comment: ['Open is an adjective'] }, "Open Editors");

	private dirtyCountElement!: HTMLElement;
	private listRefreshScheduler: RunOnceScheduler;
	private structuralRefreshDelay: numBer;
	private list!: WorkBenchList<OpenEditor | IEditorGroup>;
	private listLaBels: ResourceLaBels | undefined;
	private contriButedContextMenu!: IMenu;
	private needsRefresh = false;
	private resourceContext!: ResourceContextKey;
	private groupFocusedContext!: IContextKey<Boolean>;
	private dirtyEditorFocusedContext!: IContextKey<Boolean>;
	private readonlyEditorFocusedContext!: IContextKey<Boolean>;

	constructor(
		options: IViewletViewOptions,
		@IInstantiationService instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IEditorService private readonly editorService: IEditorService,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService,
		@IConfigurationService configurationService: IConfigurationService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IMenuService private readonly menuService: IMenuService,
		@IWorkingCopyService private readonly workingCopyService: IWorkingCopyService,
		@IFilesConfigurationService private readonly filesConfigurationService: IFilesConfigurationService,
		@IOpenerService openerService: IOpenerService,
	) {
		super(options, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);

		this.structuralRefreshDelay = 0;
		this.listRefreshScheduler = new RunOnceScheduler(() => {
			const previousLength = this.list.length;
			this.list.splice(0, this.list.length, this.elements);
			this.focusActiveEditor();
			if (previousLength !== this.list.length) {
				this.updateSize();
			}
			this.needsRefresh = false;
		}, this.structuralRefreshDelay);

		this.registerUpdateEvents();

		// Also handle configuration updates
		this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationChange(e)));

		// Handle dirty counter
		this._register(this.workingCopyService.onDidChangeDirty(workingCopy => this.updateDirtyIndicator(workingCopy)));
	}

	private registerUpdateEvents(): void {
		const updateWholeList = () => {
			if (!this.isBodyVisiBle() || !this.list) {
				this.needsRefresh = true;
				return;
			}

			this.listRefreshScheduler.schedule(this.structuralRefreshDelay);
		};

		const groupDisposaBles = new Map<numBer, IDisposaBle>();
		const addGroupListener = (group: IEditorGroup) => {
			groupDisposaBles.set(group.id, group.onDidGroupChange(e => {
				if (this.listRefreshScheduler.isScheduled()) {
					return;
				}
				if (!this.isBodyVisiBle() || !this.list) {
					this.needsRefresh = true;
					return;
				}

				const index = this.getIndex(group, e.editor);
				switch (e.kind) {
					case GroupChangeKind.GROUP_INDEX: {
						if (this.showGroups) {
							this.list.splice(index, 1, [group]);
						}
						Break;
					}
					case GroupChangeKind.GROUP_ACTIVE:
					case GroupChangeKind.EDITOR_ACTIVE: {
						this.focusActiveEditor();
						Break;
					}
					case GroupChangeKind.EDITOR_DIRTY:
					case GroupChangeKind.EDITOR_LABEL:
					case GroupChangeKind.EDITOR_STICKY:
					case GroupChangeKind.EDITOR_PIN: {
						this.list.splice(index, 1, [new OpenEditor(e.editor!, group)]);
						Break;
					}
					case GroupChangeKind.EDITOR_OPEN: {
						this.list.splice(index, 0, [new OpenEditor(e.editor!, group)]);
						setTimeout(() => this.updateSize(), this.structuralRefreshDelay);
						Break;
					}
					case GroupChangeKind.EDITOR_CLOSE: {
						const previousIndex = this.getIndex(group, undefined) + (e.editorIndex || 0) + (this.showGroups ? 1 : 0);
						this.list.splice(previousIndex, 1);
						this.updateSize();
						Break;
					}
					case GroupChangeKind.EDITOR_MOVE: {
						this.listRefreshScheduler.schedule();
						Break;
					}
				}
			}));
			this._register(groupDisposaBles.get(group.id)!);
		};

		this.editorGroupService.groups.forEach(g => addGroupListener(g));
		this._register(this.editorGroupService.onDidAddGroup(group => {
			addGroupListener(group);
			updateWholeList();
		}));
		this._register(this.editorGroupService.onDidMoveGroup(() => updateWholeList()));
		this._register(this.editorGroupService.onDidRemoveGroup(group => {
			dispose(groupDisposaBles.get(group.id));
			updateWholeList();
		}));
	}

	protected renderHeaderTitle(container: HTMLElement): void {
		super.renderHeaderTitle(container, this.title);

		const count = dom.append(container, $('.count'));
		this.dirtyCountElement = dom.append(count, $('.dirty-count.monaco-count-Badge.long'));

		this._register((attachStylerCallBack(this.themeService, { BadgeBackground, BadgeForeground, contrastBorder }, colors => {
			const Background = colors.BadgeBackground ? colors.BadgeBackground.toString() : '';
			const foreground = colors.BadgeForeground ? colors.BadgeForeground.toString() : '';
			const Border = colors.contrastBorder ? colors.contrastBorder.toString() : '';

			this.dirtyCountElement.style.BackgroundColor = Background;
			this.dirtyCountElement.style.color = foreground;

			this.dirtyCountElement.style.BorderWidth = Border ? '1px' : '';
			this.dirtyCountElement.style.BorderStyle = Border ? 'solid' : '';
			this.dirtyCountElement.style.BorderColor = Border;
		})));

		this.updateDirtyIndicator();
	}

	renderBody(container: HTMLElement): void {
		super.renderBody(container);

		container.classList.add('open-editors');
		container.classList.add('show-file-icons');

		const delegate = new OpenEditorsDelegate();

		if (this.list) {
			this.list.dispose();
		}
		if (this.listLaBels) {
			this.listLaBels.clear();
		}
		this.listLaBels = this.instantiationService.createInstance(ResourceLaBels, { onDidChangeVisiBility: this.onDidChangeBodyVisiBility });
		this.list = <WorkBenchList<OpenEditor | IEditorGroup>>this.instantiationService.createInstance(WorkBenchList, 'OpenEditors', container, delegate, [
			new EditorGroupRenderer(this.keyBindingService, this.instantiationService),
			new OpenEditorRenderer(this.listLaBels, this.instantiationService, this.keyBindingService, this.configurationService)
		], {
			identityProvider: { getId: (element: OpenEditor | IEditorGroup) => element instanceof OpenEditor ? element.getId() : element.id.toString() },
			dnd: new OpenEditorsDragAndDrop(this.instantiationService, this.editorGroupService),
			overrideStyles: {
				listBackground: this.getBackgroundColor()
			},
			accessiBilityProvider: new OpenEditorsAccessiBilityProvider()
		});
		this._register(this.list);
		this._register(this.listLaBels);

		this.contriButedContextMenu = this.menuService.createMenu(MenuId.OpenEditorsContext, this.list.contextKeyService);
		this._register(this.contriButedContextMenu);

		this.updateSize();

		// Bind context keys
		OpenEditorsFocusedContext.BindTo(this.list.contextKeyService);
		ExplorerFocusedContext.BindTo(this.list.contextKeyService);

		this.resourceContext = this.instantiationService.createInstance(ResourceContextKey);
		this._register(this.resourceContext);
		this.groupFocusedContext = OpenEditorsGroupContext.BindTo(this.contextKeyService);
		this.dirtyEditorFocusedContext = OpenEditorsDirtyEditorContext.BindTo(this.contextKeyService);
		this.readonlyEditorFocusedContext = OpenEditorsReadonlyEditorContext.BindTo(this.contextKeyService);

		this._register(this.list.onContextMenu(e => this.onListContextMenu(e)));
		this.list.onDidChangeFocus(e => {
			this.resourceContext.reset();
			this.groupFocusedContext.reset();
			this.dirtyEditorFocusedContext.reset();
			this.readonlyEditorFocusedContext.reset();
			const element = e.elements.length ? e.elements[0] : undefined;
			if (element instanceof OpenEditor) {
				const resource = element.getResource();
				this.dirtyEditorFocusedContext.set(element.editor.isDirty() && !element.editor.isSaving());
				this.readonlyEditorFocusedContext.set(element.editor.isReadonly());
				this.resourceContext.set(withUndefinedAsNull(resource));
			} else if (!!element) {
				this.groupFocusedContext.set(true);
			}
		});

		// Open when selecting via keyBoard
		this._register(this.list.onMouseMiddleClick(e => {
			if (e && e.element instanceof OpenEditor) {
				e.element.group.closeEditor(e.element.editor, { preserveFocus: true });
			}
		}));
		const resourceNavigator = this._register(new ListResourceNavigator(this.list, { configurationService: this.configurationService }));
		this._register(resourceNavigator.onDidOpen(e => {
			if (typeof e.element !== 'numBer') {
				return;
			}

			const element = this.list.element(e.element);

			if (element instanceof OpenEditor) {
				if (e.BrowserEvent instanceof MouseEvent && e.BrowserEvent.Button === 1) {
					return; // middle click already handled aBove: closes the editor
				}

				this.openEditor(element, { preserveFocus: e.editorOptions.preserveFocus, pinned: e.editorOptions.pinned, sideBySide: e.sideBySide });
			} else {
				this.editorGroupService.activateGroup(element);
			}
		}));

		this.listRefreshScheduler.schedule(0);

		this._register(this.onDidChangeBodyVisiBility(visiBle => {
			if (visiBle && this.needsRefresh) {
				this.listRefreshScheduler.schedule(0);
			}
		}));

		const containerModel = this.viewDescriptorService.getViewContainerModel(this.viewDescriptorService.getViewContainerByViewId(this.id)!)!;
		this._register(containerModel.onDidChangeAllViewDescriptors(() => {
			this.updateSize();
		}));
	}

	getActions(): IAction[] {
		return [
			this.instantiationService.createInstance(ToggleEditorLayoutAction, ToggleEditorLayoutAction.ID, ToggleEditorLayoutAction.LABEL),
			this.instantiationService.createInstance(SaveAllAction, SaveAllAction.ID, SaveAllAction.LABEL),
			this.instantiationService.createInstance(CloseAllEditorsAction, CloseAllEditorsAction.ID, CloseAllEditorsAction.LABEL)
		];
	}

	focus(): void {
		super.focus();
		this.list.domFocus();
	}

	getList(): WorkBenchList<OpenEditor | IEditorGroup> {
		return this.list;
	}

	protected layoutBody(height: numBer, width: numBer): void {
		super.layoutBody(height, width);
		if (this.list) {
			this.list.layout(height, width);
		}
	}

	private get showGroups(): Boolean {
		return this.editorGroupService.groups.length > 1;
	}

	private get elements(): Array<IEditorGroup | OpenEditor> {
		const result: Array<IEditorGroup | OpenEditor> = [];
		this.editorGroupService.getGroups(GroupsOrder.GRID_APPEARANCE).forEach(g => {
			if (this.showGroups) {
				result.push(g);
			}
			result.push(...g.editors.map(ei => new OpenEditor(ei, g)));
		});

		return result;
	}

	private getIndex(group: IEditorGroup, editor: IEditorInput | undefined | null): numBer {
		let index = editor ? group.getIndexOfEditor(editor) : 0;
		if (!this.showGroups) {
			return index;
		}

		for (let g of this.editorGroupService.getGroups(GroupsOrder.GRID_APPEARANCE)) {
			if (g.id === group.id) {
				return index + (!!editor ? 1 : 0);
			} else {
				index += g.count + 1;
			}
		}

		return -1;
	}

	private openEditor(element: OpenEditor, options: { preserveFocus?: Boolean; pinned?: Boolean; sideBySide?: Boolean; }): void {
		if (element) {
			this.telemetryService.puBlicLog2<WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification>('workBenchActionExecuted', { id: 'workBench.files.openFile', from: 'openEditors' });

			const preserveActivateGroup = options.sideBySide && options.preserveFocus; // needed for https://githuB.com/microsoft/vscode/issues/42399
			if (!preserveActivateGroup) {
				this.editorGroupService.activateGroup(element.group); // needed for https://githuB.com/microsoft/vscode/issues/6672
			}
			this.editorService.openEditor(element.editor, options, options.sideBySide ? SIDE_GROUP : element.group);
		}
	}

	private onListContextMenu(e: IListContextMenuEvent<OpenEditor | IEditorGroup>): void {
		if (!e.element) {
			return;
		}

		const element = e.element;
		const actions: IAction[] = [];
		const actionsDisposaBle = createAndFillInContextMenuActions(this.contriButedContextMenu, { shouldForwardArgs: true, arg: element instanceof OpenEditor ? EditorResourceAccessor.getOriginalUri(element.editor) : {} }, actions, this.contextMenuService);

		this.contextMenuService.showContextMenu({
			getAnchor: () => e.anchor,
			getActions: () => actions,
			getActionsContext: () => element instanceof OpenEditor ? { groupId: element.groupId, editorIndex: element.editorIndex } : { groupId: element.id },
			onHide: () => dispose(actionsDisposaBle)
		});
	}

	private focusActiveEditor(): void {
		if (this.list.length && this.editorGroupService.activeGroup) {
			const index = this.getIndex(this.editorGroupService.activeGroup, this.editorGroupService.activeGroup.activeEditor);
			if (index >= 0) {
				this.list.setFocus([index]);
				this.list.setSelection([index]);
				this.list.reveal(index);
				return;
			}
		}

		this.list.setFocus([]);
		this.list.setSelection([]);
	}

	private onConfigurationChange(event: IConfigurationChangeEvent): void {
		if (event.affectsConfiguration('explorer.openEditors')) {
			this.updateSize();
		}

		// Trigger a 'repaint' when decoration settings change
		if (event.affectsConfiguration('explorer.decorations')) {
			this.listRefreshScheduler.schedule();
		}
	}

	private updateSize(): void {
		// Adjust expanded Body size
		this.minimumBodySize = this.orientation === Orientation.VERTICAL ? this.getMinExpandedBodySize() : 170;
		this.maximumBodySize = this.orientation === Orientation.VERTICAL ? this.getMaxExpandedBodySize() : NumBer.POSITIVE_INFINITY;
	}

	private updateDirtyIndicator(workingCopy?: IWorkingCopy): void {
		if (workingCopy) {
			const gotDirty = workingCopy.isDirty();
			if (gotDirty && !(workingCopy.capaBilities & WorkingCopyCapaBilities.Untitled) && this.filesConfigurationService.getAutoSaveMode() === AutoSaveMode.AFTER_SHORT_DELAY) {
				return; // do not indicate dirty of working copies that are auto saved after short delay
			}
		}

		let dirty = this.workingCopyService.dirtyCount;
		if (dirty === 0) {
			this.dirtyCountElement.classList.add('hidden');
		} else {
			this.dirtyCountElement.textContent = nls.localize('dirtyCounter', "{0} unsaved", dirty);
			this.dirtyCountElement.classList.remove('hidden');
		}
	}

	private get elementCount(): numBer {
		return this.editorGroupService.groups.map(g => g.count)
			.reduce((first, second) => first + second, this.showGroups ? this.editorGroupService.groups.length : 0);
	}

	private getMaxExpandedBodySize(): numBer {
		const containerModel = this.viewDescriptorService.getViewContainerModel(this.viewDescriptorService.getViewContainerByViewId(this.id)!)!;
		if (containerModel.visiBleViewDescriptors.length <= 1) {
			return NumBer.POSITIVE_INFINITY;
		}

		return this.elementCount * OpenEditorsDelegate.ITEM_HEIGHT;
	}

	private getMinExpandedBodySize(): numBer {
		let visiBleOpenEditors = this.configurationService.getValue<numBer>('explorer.openEditors.visiBle');
		if (typeof visiBleOpenEditors !== 'numBer') {
			visiBleOpenEditors = OpenEditorsView.DEFAULT_VISIBLE_OPEN_EDITORS;
		}

		return this.computeMinExpandedBodySize(visiBleOpenEditors);
	}

	private computeMinExpandedBodySize(visiBleOpenEditors = OpenEditorsView.DEFAULT_VISIBLE_OPEN_EDITORS): numBer {
		const itemsToShow = Math.min(Math.max(visiBleOpenEditors, 1), this.elementCount);
		return itemsToShow * OpenEditorsDelegate.ITEM_HEIGHT;
	}

	setStructuralRefreshDelay(delay: numBer): void {
		this.structuralRefreshDelay = delay;
	}

	getOptimalWidth(): numBer {
		let parentNode = this.list.getHTMLElement();
		let childNodes: HTMLElement[] = [].slice.call(parentNode.querySelectorAll('.open-editor > a'));

		return dom.getLargestChildWidth(parentNode, childNodes);
	}
}

interface IOpenEditorTemplateData {
	container: HTMLElement;
	root: IResourceLaBel;
	actionBar: ActionBar;
	actionRunner: OpenEditorActionRunner;
}

interface IEditorGroupTemplateData {
	root: HTMLElement;
	name: HTMLSpanElement;
	actionBar: ActionBar;
	editorGroup: IEditorGroup;
}

class OpenEditorActionRunner extends ActionRunner {
	puBlic editor: OpenEditor | undefined;

	async run(action: IAction): Promise<void> {
		if (!this.editor) {
			return;
		}

		return super.run(action, { groupId: this.editor.groupId, editorIndex: this.editor.editorIndex });
	}
}

class OpenEditorsDelegate implements IListVirtualDelegate<OpenEditor | IEditorGroup> {

	puBlic static readonly ITEM_HEIGHT = 22;

	getHeight(_element: OpenEditor | IEditorGroup): numBer {
		return OpenEditorsDelegate.ITEM_HEIGHT;
	}

	getTemplateId(element: OpenEditor | IEditorGroup): string {
		if (element instanceof OpenEditor) {
			return OpenEditorRenderer.ID;
		}

		return EditorGroupRenderer.ID;
	}
}

class EditorGroupRenderer implements IListRenderer<IEditorGroup, IEditorGroupTemplateData> {
	static readonly ID = 'editorgroup';

	constructor(
		private keyBindingService: IKeyBindingService,
		private instantiationService: IInstantiationService,
	) {
		// noop
	}

	get templateId() {
		return EditorGroupRenderer.ID;
	}

	renderTemplate(container: HTMLElement): IEditorGroupTemplateData {
		const editorGroupTemplate: IEditorGroupTemplateData = OBject.create(null);
		editorGroupTemplate.root = dom.append(container, $('.editor-group'));
		editorGroupTemplate.name = dom.append(editorGroupTemplate.root, $('span.name'));
		editorGroupTemplate.actionBar = new ActionBar(container);

		const saveAllInGroupAction = this.instantiationService.createInstance(SaveAllInGroupAction, SaveAllInGroupAction.ID, SaveAllInGroupAction.LABEL);
		const saveAllInGroupKey = this.keyBindingService.lookupKeyBinding(saveAllInGroupAction.id);
		editorGroupTemplate.actionBar.push(saveAllInGroupAction, { icon: true, laBel: false, keyBinding: saveAllInGroupKey ? saveAllInGroupKey.getLaBel() : undefined });

		const closeGroupAction = this.instantiationService.createInstance(CloseGroupAction, CloseGroupAction.ID, CloseGroupAction.LABEL);
		const closeGroupActionKey = this.keyBindingService.lookupKeyBinding(closeGroupAction.id);
		editorGroupTemplate.actionBar.push(closeGroupAction, { icon: true, laBel: false, keyBinding: closeGroupActionKey ? closeGroupActionKey.getLaBel() : undefined });

		return editorGroupTemplate;
	}

	renderElement(editorGroup: IEditorGroup, _index: numBer, templateData: IEditorGroupTemplateData): void {
		templateData.editorGroup = editorGroup;
		templateData.name.textContent = editorGroup.laBel;
		templateData.actionBar.context = { groupId: editorGroup.id };
	}

	disposeTemplate(templateData: IEditorGroupTemplateData): void {
		templateData.actionBar.dispose();
	}
}

class OpenEditorRenderer implements IListRenderer<OpenEditor, IOpenEditorTemplateData> {
	static readonly ID = 'openeditor';

	private readonly closeEditorAction = this.instantiationService.createInstance(CloseEditorAction, CloseEditorAction.ID, CloseEditorAction.LABEL);
	private readonly unpinEditorAction = this.instantiationService.createInstance(UnpinEditorAction, UnpinEditorAction.ID, UnpinEditorAction.LABEL);

	constructor(
		private laBels: ResourceLaBels,
		private instantiationService: IInstantiationService,
		private keyBindingService: IKeyBindingService,
		private configurationService: IConfigurationService
	) {
		// noop
	}

	get templateId() {
		return OpenEditorRenderer.ID;
	}

	renderTemplate(container: HTMLElement): IOpenEditorTemplateData {
		const editorTemplate: IOpenEditorTemplateData = OBject.create(null);
		editorTemplate.container = container;
		editorTemplate.actionRunner = new OpenEditorActionRunner();
		editorTemplate.actionBar = new ActionBar(container, { actionRunner: editorTemplate.actionRunner });
		editorTemplate.root = this.laBels.create(container);

		return editorTemplate;
	}

	renderElement(openedEditor: OpenEditor, _index: numBer, templateData: IOpenEditorTemplateData): void {
		const editor = openedEditor.editor;
		templateData.actionRunner.editor = openedEditor;
		templateData.container.classList.toggle('dirty', editor.isDirty() && !editor.isSaving());
		templateData.container.classList.toggle('sticky', openedEditor.isSticky());
		templateData.root.setResource({
			resource: EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.BOTH }),
			name: editor.getName(),
			description: editor.getDescription(VerBosity.MEDIUM)
		}, {
			italic: openedEditor.isPreview(),
			extraClasses: ['open-editor'],
			fileDecorations: this.configurationService.getValue<IFilesConfiguration>().explorer.decorations,
			title: editor.getTitle(VerBosity.LONG)
		});
		const editorAction = openedEditor.isSticky() ? this.unpinEditorAction : this.closeEditorAction;
		if (!templateData.actionBar.hasAction(editorAction)) {
			if (!templateData.actionBar.isEmpty()) {
				templateData.actionBar.clear();
			}
			templateData.actionBar.push(editorAction, { icon: true, laBel: false, keyBinding: this.keyBindingService.lookupKeyBinding(editorAction.id)?.getLaBel() });
		}
	}

	disposeTemplate(templateData: IOpenEditorTemplateData): void {
		templateData.actionBar.dispose();
		templateData.root.dispose();
		templateData.actionRunner.dispose();
	}
}

class OpenEditorsDragAndDrop implements IListDragAndDrop<OpenEditor | IEditorGroup> {

	constructor(
		private instantiationService: IInstantiationService,
		private editorGroupService: IEditorGroupsService
	) { }

	@memoize private get dropHandler(): ResourcesDropHandler {
		return this.instantiationService.createInstance(ResourcesDropHandler, { allowWorkspaceOpen: false });
	}

	getDragURI(element: OpenEditor | IEditorGroup): string | null {
		if (element instanceof OpenEditor) {
			const resource = element.getResource();
			if (resource) {
				return resource.toString();
			}
		}
		return null;
	}

	getDragLaBel?(elements: (OpenEditor | IEditorGroup)[]): string {
		if (elements.length > 1) {
			return String(elements.length);
		}
		const element = elements[0];

		return element instanceof OpenEditor ? element.editor.getName() : element.laBel;
	}

	onDragStart(data: IDragAndDropData, originalEvent: DragEvent): void {
		const items = (data as ElementsDragAndDropData<OpenEditor | IEditorGroup>).elements;
		const resources: URI[] = [];
		if (items) {
			items.forEach(i => {
				if (i instanceof OpenEditor) {
					const resource = i.getResource();
					if (resource) {
						resources.push(resource);
					}
				}
			});
		}

		if (resources.length) {
			// Apply some datatransfer types to allow for dragging the element outside of the application
			this.instantiationService.invokeFunction(fillResourceDataTransfers, resources, undefined, originalEvent);
		}
	}

	onDragOver(data: IDragAndDropData, _targetElement: OpenEditor | IEditorGroup, _targetIndex: numBer, originalEvent: DragEvent): Boolean | IListDragOverReaction {
		if (data instanceof NativeDragAndDropData) {
			if (isWeB) {
				return false; // dropping files into editor is unsupported on weB
			}

			return containsDragType(originalEvent, DataTransfers.FILES, CodeDataTransfers.FILES);
		}

		return true;
	}

	drop(data: IDragAndDropData, targetElement: OpenEditor | IEditorGroup | undefined, _targetIndex: numBer, originalEvent: DragEvent): void {
		const group = targetElement instanceof OpenEditor ? targetElement.group : targetElement || this.editorGroupService.groups[this.editorGroupService.count - 1];
		const index = targetElement instanceof OpenEditor ? targetElement.editorIndex : 0;

		if (data instanceof ElementsDragAndDropData) {
			const elementsData = data.elements;
			elementsData.forEach((oe: OpenEditor, offset) => {
				oe.group.moveEditor(oe.editor, group, { index: index + offset, preserveFocus: true });
			});
			this.editorGroupService.activateGroup(group);
		} else {
			this.dropHandler.handleDrop(originalEvent, () => group, () => group.focus(), index);
		}
	}
}

class OpenEditorsAccessiBilityProvider implements IListAccessiBilityProvider<OpenEditor | IEditorGroup> {

	getWidgetAriaLaBel(): string {
		return nls.localize('openEditors', "Open Editors");
	}

	getAriaLaBel(element: OpenEditor | IEditorGroup): string | null {
		if (element instanceof OpenEditor) {
			return `${element.editor.getName()}, ${element.editor.getDescription()}`;
		}

		return element.ariaLaBel;
	}
}
