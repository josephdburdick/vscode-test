/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/openeditors';
import * As nls from 'vs/nls';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { IAction, ActionRunner, WorkbenchActionExecutedEvent, WorkbenchActionExecutedClAssificAtion } from 'vs/bAse/common/Actions';
import * As dom from 'vs/bAse/browser/dom';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IEditorGroupsService, IEditorGroup, GroupChAngeKind, GroupsOrder } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IConfigurAtionService, IConfigurAtionChAngeEvent } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IEditorInput, Verbosity, EditorResourceAccessor, SideBySideEditor } from 'vs/workbench/common/editor';
import { SAveAllAction, SAveAllInGroupAction, CloseGroupAction } from 'vs/workbench/contrib/files/browser/fileActions';
import { OpenEditorsFocusedContext, ExplorerFocusedContext, IFilesConfigurAtion, OpenEditor } from 'vs/workbench/contrib/files/common/files';
import { CloseAllEditorsAction, CloseEditorAction, UnpinEditorAction } from 'vs/workbench/browser/pArts/editor/editorActions';
import { ToggleEditorLAyoutAction } from 'vs/workbench/browser/Actions/lAyoutActions';
import { IContextKeyService, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { AttAchStylerCAllbAck } from 'vs/plAtform/theme/common/styler';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { bAdgeBAckground, bAdgeForeground, contrAstBorder } from 'vs/plAtform/theme/common/colorRegistry';
import { WorkbenchList, ListResourceNAvigAtor } from 'vs/plAtform/list/browser/listService';
import { IListVirtuAlDelegAte, IListRenderer, IListContextMenuEvent, IListDrAgAndDrop, IListDrAgOverReAction } from 'vs/bAse/browser/ui/list/list';
import { ResourceLAbels, IResourceLAbel } from 'vs/workbench/browser/lAbels';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IEditorService, SIDE_GROUP } from 'vs/workbench/services/editor/common/editorService';
import { IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { creAteAndFillInContextMenuActions } from 'vs/plAtform/Actions/browser/menuEntryActionViewItem';
import { IMenuService, MenuId, IMenu } from 'vs/plAtform/Actions/common/Actions';
import { OpenEditorsDirtyEditorContext, OpenEditorsGroupContext, OpenEditorsReAdonlyEditorContext } from 'vs/workbench/contrib/files/browser/fileCommAnds';
import { ResourceContextKey } from 'vs/workbench/common/resources';
import { ResourcesDropHAndler, fillResourceDAtATrAnsfers, CodeDAtATrAnsfers, contAinsDrAgType } from 'vs/workbench/browser/dnd';
import { ViewPAne } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { IViewletViewOptions } from 'vs/workbench/browser/pArts/views/viewsViewlet';
import { IDrAgAndDropDAtA, DAtATrAnsfers } from 'vs/bAse/browser/dnd';
import { memoize } from 'vs/bAse/common/decorAtors';
import { ElementsDrAgAndDropDAtA, NAtiveDrAgAndDropDAtA } from 'vs/bAse/browser/ui/list/listView';
import { URI } from 'vs/bAse/common/uri';
import { withUndefinedAsNull } from 'vs/bAse/common/types';
import { isWeb } from 'vs/bAse/common/plAtform';
import { IWorkingCopyService, IWorkingCopy, WorkingCopyCApAbilities } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { AutoSAveMode, IFilesConfigurAtionService } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { OrientAtion } from 'vs/bAse/browser/ui/splitview/splitview';
import { IListAccessibilityProvider } from 'vs/bAse/browser/ui/list/listWidget';

const $ = dom.$;

export clAss OpenEditorsView extends ViewPAne {

	privAte stAtic reAdonly DEFAULT_VISIBLE_OPEN_EDITORS = 9;
	stAtic reAdonly ID = 'workbench.explorer.openEditorsView';
	stAtic reAdonly NAME = nls.locAlize({ key: 'openEditors', comment: ['Open is An Adjective'] }, "Open Editors");

	privAte dirtyCountElement!: HTMLElement;
	privAte listRefreshScheduler: RunOnceScheduler;
	privAte structurAlRefreshDelAy: number;
	privAte list!: WorkbenchList<OpenEditor | IEditorGroup>;
	privAte listLAbels: ResourceLAbels | undefined;
	privAte contributedContextMenu!: IMenu;
	privAte needsRefresh = fAlse;
	privAte resourceContext!: ResourceContextKey;
	privAte groupFocusedContext!: IContextKey<booleAn>;
	privAte dirtyEditorFocusedContext!: IContextKey<booleAn>;
	privAte reAdonlyEditorFocusedContext!: IContextKey<booleAn>;

	constructor(
		options: IViewletViewOptions,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IMenuService privAte reAdonly menuService: IMenuService,
		@IWorkingCopyService privAte reAdonly workingCopyService: IWorkingCopyService,
		@IFilesConfigurAtionService privAte reAdonly filesConfigurAtionService: IFilesConfigurAtionService,
		@IOpenerService openerService: IOpenerService,
	) {
		super(options, keybindingService, contextMenuService, configurAtionService, contextKeyService, viewDescriptorService, instAntiAtionService, openerService, themeService, telemetryService);

		this.structurAlRefreshDelAy = 0;
		this.listRefreshScheduler = new RunOnceScheduler(() => {
			const previousLength = this.list.length;
			this.list.splice(0, this.list.length, this.elements);
			this.focusActiveEditor();
			if (previousLength !== this.list.length) {
				this.updAteSize();
			}
			this.needsRefresh = fAlse;
		}, this.structurAlRefreshDelAy);

		this.registerUpdAteEvents();

		// Also hAndle configurAtion updAtes
		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => this.onConfigurAtionChAnge(e)));

		// HAndle dirty counter
		this._register(this.workingCopyService.onDidChAngeDirty(workingCopy => this.updAteDirtyIndicAtor(workingCopy)));
	}

	privAte registerUpdAteEvents(): void {
		const updAteWholeList = () => {
			if (!this.isBodyVisible() || !this.list) {
				this.needsRefresh = true;
				return;
			}

			this.listRefreshScheduler.schedule(this.structurAlRefreshDelAy);
		};

		const groupDisposAbles = new MAp<number, IDisposAble>();
		const AddGroupListener = (group: IEditorGroup) => {
			groupDisposAbles.set(group.id, group.onDidGroupChAnge(e => {
				if (this.listRefreshScheduler.isScheduled()) {
					return;
				}
				if (!this.isBodyVisible() || !this.list) {
					this.needsRefresh = true;
					return;
				}

				const index = this.getIndex(group, e.editor);
				switch (e.kind) {
					cAse GroupChAngeKind.GROUP_INDEX: {
						if (this.showGroups) {
							this.list.splice(index, 1, [group]);
						}
						breAk;
					}
					cAse GroupChAngeKind.GROUP_ACTIVE:
					cAse GroupChAngeKind.EDITOR_ACTIVE: {
						this.focusActiveEditor();
						breAk;
					}
					cAse GroupChAngeKind.EDITOR_DIRTY:
					cAse GroupChAngeKind.EDITOR_LABEL:
					cAse GroupChAngeKind.EDITOR_STICKY:
					cAse GroupChAngeKind.EDITOR_PIN: {
						this.list.splice(index, 1, [new OpenEditor(e.editor!, group)]);
						breAk;
					}
					cAse GroupChAngeKind.EDITOR_OPEN: {
						this.list.splice(index, 0, [new OpenEditor(e.editor!, group)]);
						setTimeout(() => this.updAteSize(), this.structurAlRefreshDelAy);
						breAk;
					}
					cAse GroupChAngeKind.EDITOR_CLOSE: {
						const previousIndex = this.getIndex(group, undefined) + (e.editorIndex || 0) + (this.showGroups ? 1 : 0);
						this.list.splice(previousIndex, 1);
						this.updAteSize();
						breAk;
					}
					cAse GroupChAngeKind.EDITOR_MOVE: {
						this.listRefreshScheduler.schedule();
						breAk;
					}
				}
			}));
			this._register(groupDisposAbles.get(group.id)!);
		};

		this.editorGroupService.groups.forEAch(g => AddGroupListener(g));
		this._register(this.editorGroupService.onDidAddGroup(group => {
			AddGroupListener(group);
			updAteWholeList();
		}));
		this._register(this.editorGroupService.onDidMoveGroup(() => updAteWholeList()));
		this._register(this.editorGroupService.onDidRemoveGroup(group => {
			dispose(groupDisposAbles.get(group.id));
			updAteWholeList();
		}));
	}

	protected renderHeAderTitle(contAiner: HTMLElement): void {
		super.renderHeAderTitle(contAiner, this.title);

		const count = dom.Append(contAiner, $('.count'));
		this.dirtyCountElement = dom.Append(count, $('.dirty-count.monAco-count-bAdge.long'));

		this._register((AttAchStylerCAllbAck(this.themeService, { bAdgeBAckground, bAdgeForeground, contrAstBorder }, colors => {
			const bAckground = colors.bAdgeBAckground ? colors.bAdgeBAckground.toString() : '';
			const foreground = colors.bAdgeForeground ? colors.bAdgeForeground.toString() : '';
			const border = colors.contrAstBorder ? colors.contrAstBorder.toString() : '';

			this.dirtyCountElement.style.bAckgroundColor = bAckground;
			this.dirtyCountElement.style.color = foreground;

			this.dirtyCountElement.style.borderWidth = border ? '1px' : '';
			this.dirtyCountElement.style.borderStyle = border ? 'solid' : '';
			this.dirtyCountElement.style.borderColor = border;
		})));

		this.updAteDirtyIndicAtor();
	}

	renderBody(contAiner: HTMLElement): void {
		super.renderBody(contAiner);

		contAiner.clAssList.Add('open-editors');
		contAiner.clAssList.Add('show-file-icons');

		const delegAte = new OpenEditorsDelegAte();

		if (this.list) {
			this.list.dispose();
		}
		if (this.listLAbels) {
			this.listLAbels.cleAr();
		}
		this.listLAbels = this.instAntiAtionService.creAteInstAnce(ResourceLAbels, { onDidChAngeVisibility: this.onDidChAngeBodyVisibility });
		this.list = <WorkbenchList<OpenEditor | IEditorGroup>>this.instAntiAtionService.creAteInstAnce(WorkbenchList, 'OpenEditors', contAiner, delegAte, [
			new EditorGroupRenderer(this.keybindingService, this.instAntiAtionService),
			new OpenEditorRenderer(this.listLAbels, this.instAntiAtionService, this.keybindingService, this.configurAtionService)
		], {
			identityProvider: { getId: (element: OpenEditor | IEditorGroup) => element instAnceof OpenEditor ? element.getId() : element.id.toString() },
			dnd: new OpenEditorsDrAgAndDrop(this.instAntiAtionService, this.editorGroupService),
			overrideStyles: {
				listBAckground: this.getBAckgroundColor()
			},
			AccessibilityProvider: new OpenEditorsAccessibilityProvider()
		});
		this._register(this.list);
		this._register(this.listLAbels);

		this.contributedContextMenu = this.menuService.creAteMenu(MenuId.OpenEditorsContext, this.list.contextKeyService);
		this._register(this.contributedContextMenu);

		this.updAteSize();

		// Bind context keys
		OpenEditorsFocusedContext.bindTo(this.list.contextKeyService);
		ExplorerFocusedContext.bindTo(this.list.contextKeyService);

		this.resourceContext = this.instAntiAtionService.creAteInstAnce(ResourceContextKey);
		this._register(this.resourceContext);
		this.groupFocusedContext = OpenEditorsGroupContext.bindTo(this.contextKeyService);
		this.dirtyEditorFocusedContext = OpenEditorsDirtyEditorContext.bindTo(this.contextKeyService);
		this.reAdonlyEditorFocusedContext = OpenEditorsReAdonlyEditorContext.bindTo(this.contextKeyService);

		this._register(this.list.onContextMenu(e => this.onListContextMenu(e)));
		this.list.onDidChAngeFocus(e => {
			this.resourceContext.reset();
			this.groupFocusedContext.reset();
			this.dirtyEditorFocusedContext.reset();
			this.reAdonlyEditorFocusedContext.reset();
			const element = e.elements.length ? e.elements[0] : undefined;
			if (element instAnceof OpenEditor) {
				const resource = element.getResource();
				this.dirtyEditorFocusedContext.set(element.editor.isDirty() && !element.editor.isSAving());
				this.reAdonlyEditorFocusedContext.set(element.editor.isReAdonly());
				this.resourceContext.set(withUndefinedAsNull(resource));
			} else if (!!element) {
				this.groupFocusedContext.set(true);
			}
		});

		// Open when selecting viA keyboArd
		this._register(this.list.onMouseMiddleClick(e => {
			if (e && e.element instAnceof OpenEditor) {
				e.element.group.closeEditor(e.element.editor, { preserveFocus: true });
			}
		}));
		const resourceNAvigAtor = this._register(new ListResourceNAvigAtor(this.list, { configurAtionService: this.configurAtionService }));
		this._register(resourceNAvigAtor.onDidOpen(e => {
			if (typeof e.element !== 'number') {
				return;
			}

			const element = this.list.element(e.element);

			if (element instAnceof OpenEditor) {
				if (e.browserEvent instAnceof MouseEvent && e.browserEvent.button === 1) {
					return; // middle click AlreAdy hAndled Above: closes the editor
				}

				this.openEditor(element, { preserveFocus: e.editorOptions.preserveFocus, pinned: e.editorOptions.pinned, sideBySide: e.sideBySide });
			} else {
				this.editorGroupService.ActivAteGroup(element);
			}
		}));

		this.listRefreshScheduler.schedule(0);

		this._register(this.onDidChAngeBodyVisibility(visible => {
			if (visible && this.needsRefresh) {
				this.listRefreshScheduler.schedule(0);
			}
		}));

		const contAinerModel = this.viewDescriptorService.getViewContAinerModel(this.viewDescriptorService.getViewContAinerByViewId(this.id)!)!;
		this._register(contAinerModel.onDidChAngeAllViewDescriptors(() => {
			this.updAteSize();
		}));
	}

	getActions(): IAction[] {
		return [
			this.instAntiAtionService.creAteInstAnce(ToggleEditorLAyoutAction, ToggleEditorLAyoutAction.ID, ToggleEditorLAyoutAction.LABEL),
			this.instAntiAtionService.creAteInstAnce(SAveAllAction, SAveAllAction.ID, SAveAllAction.LABEL),
			this.instAntiAtionService.creAteInstAnce(CloseAllEditorsAction, CloseAllEditorsAction.ID, CloseAllEditorsAction.LABEL)
		];
	}

	focus(): void {
		super.focus();
		this.list.domFocus();
	}

	getList(): WorkbenchList<OpenEditor | IEditorGroup> {
		return this.list;
	}

	protected lAyoutBody(height: number, width: number): void {
		super.lAyoutBody(height, width);
		if (this.list) {
			this.list.lAyout(height, width);
		}
	}

	privAte get showGroups(): booleAn {
		return this.editorGroupService.groups.length > 1;
	}

	privAte get elements(): ArrAy<IEditorGroup | OpenEditor> {
		const result: ArrAy<IEditorGroup | OpenEditor> = [];
		this.editorGroupService.getGroups(GroupsOrder.GRID_APPEARANCE).forEAch(g => {
			if (this.showGroups) {
				result.push(g);
			}
			result.push(...g.editors.mAp(ei => new OpenEditor(ei, g)));
		});

		return result;
	}

	privAte getIndex(group: IEditorGroup, editor: IEditorInput | undefined | null): number {
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

	privAte openEditor(element: OpenEditor, options: { preserveFocus?: booleAn; pinned?: booleAn; sideBySide?: booleAn; }): void {
		if (element) {
			this.telemetryService.publicLog2<WorkbenchActionExecutedEvent, WorkbenchActionExecutedClAssificAtion>('workbenchActionExecuted', { id: 'workbench.files.openFile', from: 'openEditors' });

			const preserveActivAteGroup = options.sideBySide && options.preserveFocus; // needed for https://github.com/microsoft/vscode/issues/42399
			if (!preserveActivAteGroup) {
				this.editorGroupService.ActivAteGroup(element.group); // needed for https://github.com/microsoft/vscode/issues/6672
			}
			this.editorService.openEditor(element.editor, options, options.sideBySide ? SIDE_GROUP : element.group);
		}
	}

	privAte onListContextMenu(e: IListContextMenuEvent<OpenEditor | IEditorGroup>): void {
		if (!e.element) {
			return;
		}

		const element = e.element;
		const Actions: IAction[] = [];
		const ActionsDisposAble = creAteAndFillInContextMenuActions(this.contributedContextMenu, { shouldForwArdArgs: true, Arg: element instAnceof OpenEditor ? EditorResourceAccessor.getOriginAlUri(element.editor) : {} }, Actions, this.contextMenuService);

		this.contextMenuService.showContextMenu({
			getAnchor: () => e.Anchor,
			getActions: () => Actions,
			getActionsContext: () => element instAnceof OpenEditor ? { groupId: element.groupId, editorIndex: element.editorIndex } : { groupId: element.id },
			onHide: () => dispose(ActionsDisposAble)
		});
	}

	privAte focusActiveEditor(): void {
		if (this.list.length && this.editorGroupService.ActiveGroup) {
			const index = this.getIndex(this.editorGroupService.ActiveGroup, this.editorGroupService.ActiveGroup.ActiveEditor);
			if (index >= 0) {
				this.list.setFocus([index]);
				this.list.setSelection([index]);
				this.list.reveAl(index);
				return;
			}
		}

		this.list.setFocus([]);
		this.list.setSelection([]);
	}

	privAte onConfigurAtionChAnge(event: IConfigurAtionChAngeEvent): void {
		if (event.AffectsConfigurAtion('explorer.openEditors')) {
			this.updAteSize();
		}

		// Trigger A 'repAint' when decorAtion settings chAnge
		if (event.AffectsConfigurAtion('explorer.decorAtions')) {
			this.listRefreshScheduler.schedule();
		}
	}

	privAte updAteSize(): void {
		// Adjust expAnded body size
		this.minimumBodySize = this.orientAtion === OrientAtion.VERTICAL ? this.getMinExpAndedBodySize() : 170;
		this.mAximumBodySize = this.orientAtion === OrientAtion.VERTICAL ? this.getMAxExpAndedBodySize() : Number.POSITIVE_INFINITY;
	}

	privAte updAteDirtyIndicAtor(workingCopy?: IWorkingCopy): void {
		if (workingCopy) {
			const gotDirty = workingCopy.isDirty();
			if (gotDirty && !(workingCopy.cApAbilities & WorkingCopyCApAbilities.Untitled) && this.filesConfigurAtionService.getAutoSAveMode() === AutoSAveMode.AFTER_SHORT_DELAY) {
				return; // do not indicAte dirty of working copies thAt Are Auto sAved After short delAy
			}
		}

		let dirty = this.workingCopyService.dirtyCount;
		if (dirty === 0) {
			this.dirtyCountElement.clAssList.Add('hidden');
		} else {
			this.dirtyCountElement.textContent = nls.locAlize('dirtyCounter', "{0} unsAved", dirty);
			this.dirtyCountElement.clAssList.remove('hidden');
		}
	}

	privAte get elementCount(): number {
		return this.editorGroupService.groups.mAp(g => g.count)
			.reduce((first, second) => first + second, this.showGroups ? this.editorGroupService.groups.length : 0);
	}

	privAte getMAxExpAndedBodySize(): number {
		const contAinerModel = this.viewDescriptorService.getViewContAinerModel(this.viewDescriptorService.getViewContAinerByViewId(this.id)!)!;
		if (contAinerModel.visibleViewDescriptors.length <= 1) {
			return Number.POSITIVE_INFINITY;
		}

		return this.elementCount * OpenEditorsDelegAte.ITEM_HEIGHT;
	}

	privAte getMinExpAndedBodySize(): number {
		let visibleOpenEditors = this.configurAtionService.getVAlue<number>('explorer.openEditors.visible');
		if (typeof visibleOpenEditors !== 'number') {
			visibleOpenEditors = OpenEditorsView.DEFAULT_VISIBLE_OPEN_EDITORS;
		}

		return this.computeMinExpAndedBodySize(visibleOpenEditors);
	}

	privAte computeMinExpAndedBodySize(visibleOpenEditors = OpenEditorsView.DEFAULT_VISIBLE_OPEN_EDITORS): number {
		const itemsToShow = MAth.min(MAth.mAx(visibleOpenEditors, 1), this.elementCount);
		return itemsToShow * OpenEditorsDelegAte.ITEM_HEIGHT;
	}

	setStructurAlRefreshDelAy(delAy: number): void {
		this.structurAlRefreshDelAy = delAy;
	}

	getOptimAlWidth(): number {
		let pArentNode = this.list.getHTMLElement();
		let childNodes: HTMLElement[] = [].slice.cAll(pArentNode.querySelectorAll('.open-editor > A'));

		return dom.getLArgestChildWidth(pArentNode, childNodes);
	}
}

interfAce IOpenEditorTemplAteDAtA {
	contAiner: HTMLElement;
	root: IResourceLAbel;
	ActionBAr: ActionBAr;
	ActionRunner: OpenEditorActionRunner;
}

interfAce IEditorGroupTemplAteDAtA {
	root: HTMLElement;
	nAme: HTMLSpAnElement;
	ActionBAr: ActionBAr;
	editorGroup: IEditorGroup;
}

clAss OpenEditorActionRunner extends ActionRunner {
	public editor: OpenEditor | undefined;

	Async run(Action: IAction): Promise<void> {
		if (!this.editor) {
			return;
		}

		return super.run(Action, { groupId: this.editor.groupId, editorIndex: this.editor.editorIndex });
	}
}

clAss OpenEditorsDelegAte implements IListVirtuAlDelegAte<OpenEditor | IEditorGroup> {

	public stAtic reAdonly ITEM_HEIGHT = 22;

	getHeight(_element: OpenEditor | IEditorGroup): number {
		return OpenEditorsDelegAte.ITEM_HEIGHT;
	}

	getTemplAteId(element: OpenEditor | IEditorGroup): string {
		if (element instAnceof OpenEditor) {
			return OpenEditorRenderer.ID;
		}

		return EditorGroupRenderer.ID;
	}
}

clAss EditorGroupRenderer implements IListRenderer<IEditorGroup, IEditorGroupTemplAteDAtA> {
	stAtic reAdonly ID = 'editorgroup';

	constructor(
		privAte keybindingService: IKeybindingService,
		privAte instAntiAtionService: IInstAntiAtionService,
	) {
		// noop
	}

	get templAteId() {
		return EditorGroupRenderer.ID;
	}

	renderTemplAte(contAiner: HTMLElement): IEditorGroupTemplAteDAtA {
		const editorGroupTemplAte: IEditorGroupTemplAteDAtA = Object.creAte(null);
		editorGroupTemplAte.root = dom.Append(contAiner, $('.editor-group'));
		editorGroupTemplAte.nAme = dom.Append(editorGroupTemplAte.root, $('spAn.nAme'));
		editorGroupTemplAte.ActionBAr = new ActionBAr(contAiner);

		const sAveAllInGroupAction = this.instAntiAtionService.creAteInstAnce(SAveAllInGroupAction, SAveAllInGroupAction.ID, SAveAllInGroupAction.LABEL);
		const sAveAllInGroupKey = this.keybindingService.lookupKeybinding(sAveAllInGroupAction.id);
		editorGroupTemplAte.ActionBAr.push(sAveAllInGroupAction, { icon: true, lAbel: fAlse, keybinding: sAveAllInGroupKey ? sAveAllInGroupKey.getLAbel() : undefined });

		const closeGroupAction = this.instAntiAtionService.creAteInstAnce(CloseGroupAction, CloseGroupAction.ID, CloseGroupAction.LABEL);
		const closeGroupActionKey = this.keybindingService.lookupKeybinding(closeGroupAction.id);
		editorGroupTemplAte.ActionBAr.push(closeGroupAction, { icon: true, lAbel: fAlse, keybinding: closeGroupActionKey ? closeGroupActionKey.getLAbel() : undefined });

		return editorGroupTemplAte;
	}

	renderElement(editorGroup: IEditorGroup, _index: number, templAteDAtA: IEditorGroupTemplAteDAtA): void {
		templAteDAtA.editorGroup = editorGroup;
		templAteDAtA.nAme.textContent = editorGroup.lAbel;
		templAteDAtA.ActionBAr.context = { groupId: editorGroup.id };
	}

	disposeTemplAte(templAteDAtA: IEditorGroupTemplAteDAtA): void {
		templAteDAtA.ActionBAr.dispose();
	}
}

clAss OpenEditorRenderer implements IListRenderer<OpenEditor, IOpenEditorTemplAteDAtA> {
	stAtic reAdonly ID = 'openeditor';

	privAte reAdonly closeEditorAction = this.instAntiAtionService.creAteInstAnce(CloseEditorAction, CloseEditorAction.ID, CloseEditorAction.LABEL);
	privAte reAdonly unpinEditorAction = this.instAntiAtionService.creAteInstAnce(UnpinEditorAction, UnpinEditorAction.ID, UnpinEditorAction.LABEL);

	constructor(
		privAte lAbels: ResourceLAbels,
		privAte instAntiAtionService: IInstAntiAtionService,
		privAte keybindingService: IKeybindingService,
		privAte configurAtionService: IConfigurAtionService
	) {
		// noop
	}

	get templAteId() {
		return OpenEditorRenderer.ID;
	}

	renderTemplAte(contAiner: HTMLElement): IOpenEditorTemplAteDAtA {
		const editorTemplAte: IOpenEditorTemplAteDAtA = Object.creAte(null);
		editorTemplAte.contAiner = contAiner;
		editorTemplAte.ActionRunner = new OpenEditorActionRunner();
		editorTemplAte.ActionBAr = new ActionBAr(contAiner, { ActionRunner: editorTemplAte.ActionRunner });
		editorTemplAte.root = this.lAbels.creAte(contAiner);

		return editorTemplAte;
	}

	renderElement(openedEditor: OpenEditor, _index: number, templAteDAtA: IOpenEditorTemplAteDAtA): void {
		const editor = openedEditor.editor;
		templAteDAtA.ActionRunner.editor = openedEditor;
		templAteDAtA.contAiner.clAssList.toggle('dirty', editor.isDirty() && !editor.isSAving());
		templAteDAtA.contAiner.clAssList.toggle('sticky', openedEditor.isSticky());
		templAteDAtA.root.setResource({
			resource: EditorResourceAccessor.getOriginAlUri(editor, { supportSideBySide: SideBySideEditor.BOTH }),
			nAme: editor.getNAme(),
			description: editor.getDescription(Verbosity.MEDIUM)
		}, {
			itAlic: openedEditor.isPreview(),
			extrAClAsses: ['open-editor'],
			fileDecorAtions: this.configurAtionService.getVAlue<IFilesConfigurAtion>().explorer.decorAtions,
			title: editor.getTitle(Verbosity.LONG)
		});
		const editorAction = openedEditor.isSticky() ? this.unpinEditorAction : this.closeEditorAction;
		if (!templAteDAtA.ActionBAr.hAsAction(editorAction)) {
			if (!templAteDAtA.ActionBAr.isEmpty()) {
				templAteDAtA.ActionBAr.cleAr();
			}
			templAteDAtA.ActionBAr.push(editorAction, { icon: true, lAbel: fAlse, keybinding: this.keybindingService.lookupKeybinding(editorAction.id)?.getLAbel() });
		}
	}

	disposeTemplAte(templAteDAtA: IOpenEditorTemplAteDAtA): void {
		templAteDAtA.ActionBAr.dispose();
		templAteDAtA.root.dispose();
		templAteDAtA.ActionRunner.dispose();
	}
}

clAss OpenEditorsDrAgAndDrop implements IListDrAgAndDrop<OpenEditor | IEditorGroup> {

	constructor(
		privAte instAntiAtionService: IInstAntiAtionService,
		privAte editorGroupService: IEditorGroupsService
	) { }

	@memoize privAte get dropHAndler(): ResourcesDropHAndler {
		return this.instAntiAtionService.creAteInstAnce(ResourcesDropHAndler, { AllowWorkspAceOpen: fAlse });
	}

	getDrAgURI(element: OpenEditor | IEditorGroup): string | null {
		if (element instAnceof OpenEditor) {
			const resource = element.getResource();
			if (resource) {
				return resource.toString();
			}
		}
		return null;
	}

	getDrAgLAbel?(elements: (OpenEditor | IEditorGroup)[]): string {
		if (elements.length > 1) {
			return String(elements.length);
		}
		const element = elements[0];

		return element instAnceof OpenEditor ? element.editor.getNAme() : element.lAbel;
	}

	onDrAgStArt(dAtA: IDrAgAndDropDAtA, originAlEvent: DrAgEvent): void {
		const items = (dAtA As ElementsDrAgAndDropDAtA<OpenEditor | IEditorGroup>).elements;
		const resources: URI[] = [];
		if (items) {
			items.forEAch(i => {
				if (i instAnceof OpenEditor) {
					const resource = i.getResource();
					if (resource) {
						resources.push(resource);
					}
				}
			});
		}

		if (resources.length) {
			// Apply some dAtAtrAnsfer types to Allow for drAgging the element outside of the ApplicAtion
			this.instAntiAtionService.invokeFunction(fillResourceDAtATrAnsfers, resources, undefined, originAlEvent);
		}
	}

	onDrAgOver(dAtA: IDrAgAndDropDAtA, _tArgetElement: OpenEditor | IEditorGroup, _tArgetIndex: number, originAlEvent: DrAgEvent): booleAn | IListDrAgOverReAction {
		if (dAtA instAnceof NAtiveDrAgAndDropDAtA) {
			if (isWeb) {
				return fAlse; // dropping files into editor is unsupported on web
			}

			return contAinsDrAgType(originAlEvent, DAtATrAnsfers.FILES, CodeDAtATrAnsfers.FILES);
		}

		return true;
	}

	drop(dAtA: IDrAgAndDropDAtA, tArgetElement: OpenEditor | IEditorGroup | undefined, _tArgetIndex: number, originAlEvent: DrAgEvent): void {
		const group = tArgetElement instAnceof OpenEditor ? tArgetElement.group : tArgetElement || this.editorGroupService.groups[this.editorGroupService.count - 1];
		const index = tArgetElement instAnceof OpenEditor ? tArgetElement.editorIndex : 0;

		if (dAtA instAnceof ElementsDrAgAndDropDAtA) {
			const elementsDAtA = dAtA.elements;
			elementsDAtA.forEAch((oe: OpenEditor, offset) => {
				oe.group.moveEditor(oe.editor, group, { index: index + offset, preserveFocus: true });
			});
			this.editorGroupService.ActivAteGroup(group);
		} else {
			this.dropHAndler.hAndleDrop(originAlEvent, () => group, () => group.focus(), index);
		}
	}
}

clAss OpenEditorsAccessibilityProvider implements IListAccessibilityProvider<OpenEditor | IEditorGroup> {

	getWidgetAriALAbel(): string {
		return nls.locAlize('openEditors', "Open Editors");
	}

	getAriALAbel(element: OpenEditor | IEditorGroup): string | null {
		if (element instAnceof OpenEditor) {
			return `${element.editor.getNAme()}, ${element.editor.getDescription()}`;
		}

		return element.AriALAbel;
	}
}
