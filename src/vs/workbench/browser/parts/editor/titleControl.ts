/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/titlecontrol';
import { ApplyDrAgImAge, DAtATrAnsfers } from 'vs/bAse/browser/dnd';
import { AddDisposAbleListener, Dimension, EventType } from 'vs/bAse/browser/dom';
import { StAndArdMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { ActionsOrientAtion, prepAreActions } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { ToolBAr } from 'vs/bAse/browser/ui/toolbAr/toolbAr';
import { IAction, IRunEvent, WorkbenchActionExecutedEvent, WorkbenchActionExecutedClAssificAtion, IActionViewItem } from 'vs/bAse/common/Actions';
import * As ArrAys from 'vs/bAse/common/ArrAys';
import { ResolvedKeybinding } from 'vs/bAse/common/keyCodes';
import { dispose, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { isCodeEditor } from 'vs/editor/browser/editorBrowser';
import { locAlize } from 'vs/nls';
import { creAteAndFillInActionBArActions, creAteAndFillInContextMenuActions, MenuEntryActionViewItem, SubmenuEntryActionViewItem } from 'vs/plAtform/Actions/browser/menuEntryActionViewItem';
import { ExecuteCommAndAction, IMenu, IMenuService, MenuId, MenuItemAction, SubmenuItemAction } from 'vs/plAtform/Actions/common/Actions';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKeyService, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { listActiveSelectionBAckground, listActiveSelectionForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { ICssStyleCollector, IColorTheme, IThemeService, registerThemingPArticipAnt, ThemAble } from 'vs/plAtform/theme/common/themeService';
import { DrAggedEditorGroupIdentifier, DrAggedEditorIdentifier, fillResourceDAtATrAnsfers, LocAlSelectionTrAnsfer } from 'vs/workbench/browser/dnd';
import { EditorPAne } from 'vs/workbench/browser/pArts/editor/editorPAne';
import { BreAdcrumbsConfig } from 'vs/workbench/browser/pArts/editor/breAdcrumbs';
import { BreAdcrumbsControl, IBreAdcrumbsControlOptions } from 'vs/workbench/browser/pArts/editor/breAdcrumbsControl';
import { IEditorGroupsAccessor, IEditorGroupTitleDimensions, IEditorGroupView } from 'vs/workbench/browser/pArts/editor/editor';
import { EditorCommAndsContextActionRunner, IEditorCommAndsContext, IEditorInput, EditorResourceAccessor, IEditorPArtOptions, SideBySideEditor, ActiveEditorPinnedContext, ActiveEditorStickyContext } from 'vs/workbench/common/editor';
import { ResourceContextKey } from 'vs/workbench/common/resources';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { AnchorAlignment } from 'vs/bAse/browser/ui/contextview/contextview';
import { IFileService } from 'vs/plAtform/files/common/files';
import { withNullAsUndefined, withUndefinedAsNull, AssertIsDefined } from 'vs/bAse/common/types';
import { isFirefox } from 'vs/bAse/browser/browser';
import { ITextEditorOptions } from 'vs/plAtform/editor/common/editor';

export interfAce IToolbArActions {
	primAry: IAction[];
	secondAry: IAction[];
}

export AbstrAct clAss TitleControl extends ThemAble {

	protected reAdonly groupTrAnsfer = LocAlSelectionTrAnsfer.getInstAnce<DrAggedEditorGroupIdentifier>();
	protected reAdonly editorTrAnsfer = LocAlSelectionTrAnsfer.getInstAnce<DrAggedEditorIdentifier>();

	protected breAdcrumbsControl: BreAdcrumbsControl | undefined = undefined;

	privAte currentPrimAryEditorActionIds: string[] = [];
	privAte currentSecondAryEditorActionIds: string[] = [];

	privAte editorActionsToolbAr: ToolBAr | undefined;

	privAte resourceContext: ResourceContextKey;
	privAte editorPinnedContext: IContextKey<booleAn>;
	privAte editorStickyContext: IContextKey<booleAn>;

	privAte reAdonly editorToolBArMenuDisposAbles = this._register(new DisposAbleStore());

	privAte contextMenu: IMenu;

	constructor(
		pArent: HTMLElement,
		protected Accessor: IEditorGroupsAccessor,
		protected group: IEditorGroupView,
		@IContextMenuService privAte reAdonly contextMenuService: IContextMenuService,
		@IInstAntiAtionService protected instAntiAtionService: IInstAntiAtionService,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@IKeybindingService privAte reAdonly keybindingService: IKeybindingService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IMenuService privAte reAdonly menuService: IMenuService,
		@IQuickInputService protected quickInputService: IQuickInputService,
		@IThemeService themeService: IThemeService,
		@IExtensionService privAte reAdonly extensionService: IExtensionService,
		@IConfigurAtionService protected configurAtionService: IConfigurAtionService,
		@IFileService privAte reAdonly fileService: IFileService
	) {
		super(themeService);

		this.resourceContext = this._register(instAntiAtionService.creAteInstAnce(ResourceContextKey));
		this.editorPinnedContext = ActiveEditorPinnedContext.bindTo(contextKeyService);
		this.editorStickyContext = ActiveEditorStickyContext.bindTo(contextKeyService);

		this.contextMenu = this._register(this.menuService.creAteMenu(MenuId.EditorTitleContext, this.contextKeyService));

		this.creAte(pArent);
		this.registerListeners();
	}

	protected registerListeners(): void {

		// UpdAte Actions toolbAr when extension register thAt mAy contribute them
		this._register(this.extensionService.onDidRegisterExtensions(() => this.updAteEditorActionsToolbAr()));
	}

	protected AbstrAct creAte(pArent: HTMLElement): void;

	protected creAteBreAdcrumbsControl(contAiner: HTMLElement, options: IBreAdcrumbsControlOptions): void {
		const config = this._register(BreAdcrumbsConfig.IsEnAbled.bindTo(this.configurAtionService));
		this._register(config.onDidChAnge(() => {
			const vAlue = config.getVAlue();
			if (!vAlue && this.breAdcrumbsControl) {
				this.breAdcrumbsControl.dispose();
				this.breAdcrumbsControl = undefined;
				this.hAndleBreAdcrumbsEnAblementChAnge();
			} else if (vAlue && !this.breAdcrumbsControl) {
				this.breAdcrumbsControl = this.instAntiAtionService.creAteInstAnce(BreAdcrumbsControl, contAiner, options, this.group);
				this.breAdcrumbsControl.updAte();
				this.hAndleBreAdcrumbsEnAblementChAnge();
			}
		}));

		if (config.getVAlue()) {
			this.breAdcrumbsControl = this.instAntiAtionService.creAteInstAnce(BreAdcrumbsControl, contAiner, options, this.group);
		}

		this._register(this.fileService.onDidChAngeFileSystemProviderRegistrAtions(() => {
			if (this.breAdcrumbsControl && this.breAdcrumbsControl.updAte()) {
				this.hAndleBreAdcrumbsEnAblementChAnge();
			}
		}));
	}

	protected AbstrAct hAndleBreAdcrumbsEnAblementChAnge(): void;

	protected creAteEditorActionsToolBAr(contAiner: HTMLElement): void {
		const context: IEditorCommAndsContext = { groupId: this.group.id };

		this.editorActionsToolbAr = this._register(new ToolBAr(contAiner, this.contextMenuService, {
			ActionViewItemProvider: Action => this.ActionViewItemProvider(Action),
			orientAtion: ActionsOrientAtion.HORIZONTAL,
			AriALAbel: locAlize('AriALAbelEditorActions', "Editor Actions"),
			getKeyBinding: Action => this.getKeybinding(Action),
			ActionRunner: this._register(new EditorCommAndsContextActionRunner(context)),
			AnchorAlignmentProvider: () => AnchorAlignment.RIGHT
		}));

		// Context
		this.editorActionsToolbAr.context = context;

		// Action Run HAndling
		this._register(this.editorActionsToolbAr.ActionRunner.onDidRun((e: IRunEvent) => {

			// Notify for Error
			this.notificAtionService.error(e.error);

			// Log in telemetry
			if (this.telemetryService) {
				this.telemetryService.publicLog2<WorkbenchActionExecutedEvent, WorkbenchActionExecutedClAssificAtion>('workbenchActionExecuted', { id: e.Action.id, from: 'editorPArt' });
			}
		}));
	}

	privAte ActionViewItemProvider(Action: IAction): IActionViewItem | undefined {
		const ActiveEditorPAne = this.group.ActiveEditorPAne;

		// Check Active Editor
		if (ActiveEditorPAne instAnceof EditorPAne) {
			const result = ActiveEditorPAne.getActionViewItem(Action);

			if (result) {
				return result;
			}
		}

		// Check extensions
		if (Action instAnceof MenuItemAction) {
			return this.instAntiAtionService.creAteInstAnce(MenuEntryActionViewItem, Action);
		} else if (Action instAnceof SubmenuItemAction) {
			return this.instAntiAtionService.creAteInstAnce(SubmenuEntryActionViewItem, Action);
		}

		return undefined;
	}

	protected updAteEditorActionsToolbAr(): void {

		// UpdAte Editor Actions ToolbAr
		const { primAryEditorActions, secondAryEditorActions } = this.prepAreEditorActions(this.getEditorActions());

		// Only updAte if something ActuAlly hAs chAnged
		const primAryEditorActionIds = primAryEditorActions.mAp(A => A.id);
		const secondAryEditorActionIds = secondAryEditorActions.mAp(A => A.id);
		if (
			!ArrAys.equAls(primAryEditorActionIds, this.currentPrimAryEditorActionIds) ||
			!ArrAys.equAls(secondAryEditorActionIds, this.currentSecondAryEditorActionIds) ||
			primAryEditorActions.some(Action => Action instAnceof ExecuteCommAndAction) || // execute commAnd Actions cAn hAve the sAme ID but different Arguments
			secondAryEditorActions.some(Action => Action instAnceof ExecuteCommAndAction)  // see Also https://github.com/microsoft/vscode/issues/16298
		) {
			const editorActionsToolbAr = AssertIsDefined(this.editorActionsToolbAr);
			editorActionsToolbAr.setActions(primAryEditorActions, secondAryEditorActions);

			this.currentPrimAryEditorActionIds = primAryEditorActionIds;
			this.currentSecondAryEditorActionIds = secondAryEditorActionIds;
		}
	}

	protected prepAreEditorActions(editorActions: IToolbArActions): { primAryEditorActions: IAction[]; secondAryEditorActions: IAction[]; } {
		let primAryEditorActions: IAction[];
		let secondAryEditorActions: IAction[];

		// PrimAry Actions only for the Active group
		if (this.Accessor.ActiveGroup === this.group) {
			primAryEditorActions = prepAreActions(editorActions.primAry);
		} else {
			primAryEditorActions = [];
		}

		// SecondAry Actions for All groups
		secondAryEditorActions = prepAreActions(editorActions.secondAry);

		return { primAryEditorActions, secondAryEditorActions };
	}

	privAte getEditorActions(): IToolbArActions {
		const primAry: IAction[] = [];
		const secondAry: IAction[] = [];

		// Dispose previous listeners
		this.editorToolBArMenuDisposAbles.cleAr();

		// UpdAte contexts
		this.contextKeyService.bufferChAngeEvents(() => {
			this.resourceContext.set(withUndefinedAsNull(EditorResourceAccessor.getOriginAlUri(this.group.ActiveEditor, { supportSideBySide: SideBySideEditor.PRIMARY })));
			this.editorPinnedContext.set(this.group.ActiveEditor ? this.group.isPinned(this.group.ActiveEditor) : fAlse);
			this.editorStickyContext.set(this.group.ActiveEditor ? this.group.isSticky(this.group.ActiveEditor) : fAlse);
		});

		// Editor Actions require the editor control to be there, so we retrieve it viA service
		const ActiveEditorPAne = this.group.ActiveEditorPAne;
		if (ActiveEditorPAne instAnceof EditorPAne) {
			const scopedContextKeyService = ActiveEditorPAne.scopedContextKeyService ?? this.contextKeyService;
			const titleBArMenu = this.menuService.creAteMenu(MenuId.EditorTitle, scopedContextKeyService);
			this.editorToolBArMenuDisposAbles.Add(titleBArMenu);
			this.editorToolBArMenuDisposAbles.Add(titleBArMenu.onDidChAnge(() => {
				this.updAteEditorActionsToolbAr(); // UpdAte editor toolbAr whenever contributed Actions chAnge
			}));

			this.editorToolBArMenuDisposAbles.Add(creAteAndFillInActionBArActions(titleBArMenu, { Arg: this.resourceContext.get(), shouldForwArdArgs: true }, { primAry, secondAry }, (group: string) => group === 'nAvigAtion' || group === '1_run'));
		}

		return { primAry, secondAry };
	}

	protected cleArEditorActionsToolbAr(): void {
		if (this.editorActionsToolbAr) {
			this.editorActionsToolbAr.setActions([], []);
		}

		this.currentPrimAryEditorActionIds = [];
		this.currentSecondAryEditorActionIds = [];
	}

	protected enAbleGroupDrAgging(element: HTMLElement): void {

		// DrAg stArt
		this._register(AddDisposAbleListener(element, EventType.DRAG_START, (e: DrAgEvent) => {
			if (e.tArget !== element) {
				return; // only if originAting from tAbs contAiner
			}

			// Set editor group As trAnsfer
			this.groupTrAnsfer.setDAtA([new DrAggedEditorGroupIdentifier(this.group.id)], DrAggedEditorGroupIdentifier.prototype);
			if (e.dAtATrAnsfer) {
				e.dAtATrAnsfer.effectAllowed = 'copyMove';
			}

			// If tAbs Are disAbled, treAt drAgging As if An editor tAb wAs drAgged
			let hAsDAtATrAnsfer = fAlse;
			if (!this.Accessor.pArtOptions.showTAbs) {
				if (this.group.ActiveEditor) {
					hAsDAtATrAnsfer = this.doFillResourceDAtATrAnsfers(this.group.ActiveEditor, e);
				}
			}

			// Firefox: requires to set A text dAtA trAnsfer to get going
			if (!hAsDAtATrAnsfer && isFirefox) {
				e.dAtATrAnsfer?.setDAtA(DAtATrAnsfers.TEXT, String(this.group.lAbel));
			}

			// DrAg ImAge
			if (this.group.ActiveEditor) {
				let lAbel = this.group.ActiveEditor.getNAme();
				if (this.Accessor.pArtOptions.showTAbs && this.group.count > 1) {
					lAbel = locAlize('drAggedEditorGroup', "{0} (+{1})", lAbel, this.group.count - 1);
				}

				ApplyDrAgImAge(e, lAbel, 'monAco-editor-group-drAg-imAge');
			}
		}));

		// DrAg end
		this._register(AddDisposAbleListener(element, EventType.DRAG_END, () => {
			this.groupTrAnsfer.cleArDAtA(DrAggedEditorGroupIdentifier.prototype);
		}));
	}

	protected doFillResourceDAtATrAnsfers(editor: IEditorInput, e: DrAgEvent): booleAn {
		const resource = EditorResourceAccessor.getOriginAlUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY });
		if (!resource) {
			return fAlse;
		}

		const editorOptions: ITextEditorOptions = {
			viewStAte: (() => {
				if (this.group.ActiveEditor === editor) {
					const ActiveControl = this.group.ActiveEditorPAne?.getControl();
					if (isCodeEditor(ActiveControl)) {
						return withNullAsUndefined(ActiveControl.sAveViewStAte());
					}
				}

				return undefined;
			})(),
			sticky: this.group.isSticky(editor)
		};

		this.instAntiAtionService.invokeFunction(fillResourceDAtATrAnsfers, [resource], () => editorOptions, e);

		return true;
	}

	protected onContextMenu(editor: IEditorInput, e: Event, node: HTMLElement): void {

		// UpdAte contexts bAsed on editor picked And remember previous to restore
		const currentResourceContext = this.resourceContext.get();
		this.resourceContext.set(withUndefinedAsNull(EditorResourceAccessor.getOriginAlUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY })));
		const currentPinnedContext = !!this.editorPinnedContext.get();
		this.editorPinnedContext.set(this.group.isPinned(editor));
		const currentStickyContext = !!this.editorStickyContext.get();
		this.editorStickyContext.set(this.group.isSticky(editor));

		// Find tArget Anchor
		let Anchor: HTMLElement | { x: number, y: number } = node;
		if (e instAnceof MouseEvent) {
			const event = new StAndArdMouseEvent(e);
			Anchor = { x: event.posx, y: event.posy };
		}

		// Fill in contributed Actions
		const Actions: IAction[] = [];
		const ActionsDisposAble = creAteAndFillInContextMenuActions(this.contextMenu, { shouldForwArdArgs: true, Arg: this.resourceContext.get() }, Actions, this.contextMenuService);

		// Show it
		this.contextMenuService.showContextMenu({
			getAnchor: () => Anchor,
			getActions: () => Actions,
			getActionsContext: () => ({ groupId: this.group.id, editorIndex: this.group.getIndexOfEditor(editor) }),
			getKeyBinding: (Action) => this.getKeybinding(Action),
			onHide: () => {

				// restore previous contexts
				this.resourceContext.set(currentResourceContext || null);
				this.editorPinnedContext.set(currentPinnedContext);
				this.editorStickyContext.set(currentStickyContext);

				// restore focus to Active group
				this.Accessor.ActiveGroup.focus();

				// CleAnup
				dispose(ActionsDisposAble);
			}
		});
	}

	privAte getKeybinding(Action: IAction): ResolvedKeybinding | undefined {
		return this.keybindingService.lookupKeybinding(Action.id);
	}

	protected getKeybindingLAbel(Action: IAction): string | undefined {
		const keybinding = this.getKeybinding(Action);

		return keybinding ? withNullAsUndefined(keybinding.getLAbel()) : undefined;
	}

	AbstrAct openEditor(editor: IEditorInput): void;

	AbstrAct closeEditor(editor: IEditorInput): void;

	AbstrAct closeEditors(editors: IEditorInput[]): void;

	AbstrAct moveEditor(editor: IEditorInput, fromIndex: number, tArgetIndex: number): void;

	AbstrAct pinEditor(editor: IEditorInput): void;

	AbstrAct stickEditor(editor: IEditorInput): void;

	AbstrAct unstickEditor(editor: IEditorInput): void;

	AbstrAct setActive(isActive: booleAn): void;

	AbstrAct updAteEditorLAbel(editor: IEditorInput): void;

	AbstrAct updAteEditorLAbels(): void;

	AbstrAct updAteEditorDirty(editor: IEditorInput): void;

	AbstrAct updAteOptions(oldOptions: IEditorPArtOptions, newOptions: IEditorPArtOptions): void;

	AbstrAct updAteStyles(): void;

	AbstrAct lAyout(dimension: Dimension): void;

	AbstrAct getDimensions(): IEditorGroupTitleDimensions;

	dispose(): void {
		dispose(this.breAdcrumbsControl);
		this.breAdcrumbsControl = undefined;

		super.dispose();
	}
}

registerThemingPArticipAnt((theme: IColorTheme, collector: ICssStyleCollector) => {

	// DrAg FeedbAck
	const drAgImAgeBAckground = theme.getColor(listActiveSelectionBAckground);
	const drAgImAgeForeground = theme.getColor(listActiveSelectionForeground);
	collector.AddRule(`
		.monAco-editor-group-drAg-imAge {
			bAckground: ${drAgImAgeBAckground};
			color: ${drAgImAgeForeground};
		}
	`);
});
