/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/editorgroupview';
import { EditorGroup, IEditorOpenOptions, EditorCloseEvent, ISeriAlizedEditorGroup, isSeriAlizedEditorGroup } from 'vs/workbench/common/editor/editorGroup';
import { EditorInput, EditorOptions, GroupIdentifier, SideBySideEditorInput, CloseDirection, IEditorCloseEvent, ActiveEditorDirtyContext, IEditorPAne, EditorGroupEditorsCountContext, SAveReAson, IEditorPArtOptionsChAngeEvent, EditorsOrder, IVisibleEditorPAne, ActiveEditorStickyContext, ActiveEditorPinnedContext, EditorResourceAccessor } from 'vs/workbench/common/editor';
import { Event, Emitter, RelAy } from 'vs/bAse/common/event';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { Dimension, trAckFocus, AddDisposAbleListener, EventType, EventHelper, findPArentWithClAss, cleArNode, isAncestor, AsCSSUrl } from 'vs/bAse/browser/dom';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { ProgressBAr } from 'vs/bAse/browser/ui/progressbAr/progressbAr';
import { AttAchProgressBArStyler } from 'vs/plAtform/theme/common/styler';
import { IThemeService, registerThemingPArticipAnt, ThemAble } from 'vs/plAtform/theme/common/themeService';
import { editorBAckground, contrAstBorder } from 'vs/plAtform/theme/common/colorRegistry';
import { EDITOR_GROUP_HEADER_TABS_BACKGROUND, EDITOR_GROUP_HEADER_NO_TABS_BACKGROUND, EDITOR_GROUP_EMPTY_BACKGROUND, EDITOR_GROUP_FOCUSED_EMPTY_BORDER, EDITOR_GROUP_HEADER_BORDER } from 'vs/workbench/common/theme';
import { IMoveEditorOptions, ICopyEditorOptions, ICloseEditorsFilter, IGroupChAngeEvent, GroupChAngeKind, GroupsOrder, ICloseEditorOptions, ICloseAllEditorsOptions, OpenEditorContext } from 'vs/workbench/services/editor/common/editorGroupsService';
import { TAbsTitleControl } from 'vs/workbench/browser/pArts/editor/tAbsTitleControl';
import { EditorControl } from 'vs/workbench/browser/pArts/editor/editorControl';
import { IEditorProgressService } from 'vs/plAtform/progress/common/progress';
import { EditorProgressIndicAtor } from 'vs/workbench/services/progress/browser/progressIndicAtor';
import { locAlize } from 'vs/nls';
import { isPromiseCAnceledError } from 'vs/bAse/common/errors';
import { dispose, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { Severity, INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { toErrorMessAge } from 'vs/bAse/common/errorMessAge';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { RunOnceWorker } from 'vs/bAse/common/Async';
import { EventType As TouchEventType, GestureEvent } from 'vs/bAse/browser/touch';
import { TitleControl } from 'vs/workbench/browser/pArts/editor/titleControl';
import { IEditorGroupsAccessor, IEditorGroupView, getActiveTextEditorOptions, IEditorOpeningEvent, EditorServiceImpl, IEditorGroupTitleDimensions } from 'vs/workbench/browser/pArts/editor/editor';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { ActionRunner, IAction, Action } from 'vs/bAse/common/Actions';
import { CLOSE_EDITOR_GROUP_COMMAND_ID } from 'vs/workbench/browser/pArts/editor/editorCommAnds';
import { NoTAbsTitleControl } from 'vs/workbench/browser/pArts/editor/noTAbsTitleControl';
import { IMenuService, MenuId, IMenu } from 'vs/plAtform/Actions/common/Actions';
import { StAndArdMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { creAteAndFillInContextMenuActions } from 'vs/plAtform/Actions/browser/menuEntryActionViewItem';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { isErrorWithActions, IErrorWithActions } from 'vs/bAse/common/errorsWithActions';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { withNullAsUndefined, withUndefinedAsNull } from 'vs/bAse/common/types';
import { hAsh } from 'vs/bAse/common/hAsh';
import { guessMimeTypes } from 'vs/bAse/common/mime';
import { extnAme } from 'vs/bAse/common/resources';
import { FileAccess, SchemAs } from 'vs/bAse/common/network';
import { EditorActivAtion, EditorOpenContext } from 'vs/plAtform/editor/common/editor';
import { IDiAlogService, IFileDiAlogService, ConfirmResult } from 'vs/plAtform/diAlogs/common/diAlogs';
import { ILogService } from 'vs/plAtform/log/common/log';
import { Codicon } from 'vs/bAse/common/codicons';
import { IFilesConfigurAtionService, AutoSAveMode } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';

export clAss EditorGroupView extends ThemAble implements IEditorGroupView {

	//#region fActory

	stAtic creAteNew(Accessor: IEditorGroupsAccessor, index: number, instAntiAtionService: IInstAntiAtionService): IEditorGroupView {
		return instAntiAtionService.creAteInstAnce(EditorGroupView, Accessor, null, index);
	}

	stAtic creAteFromSeriAlized(seriAlized: ISeriAlizedEditorGroup, Accessor: IEditorGroupsAccessor, index: number, instAntiAtionService: IInstAntiAtionService): IEditorGroupView {
		return instAntiAtionService.creAteInstAnce(EditorGroupView, Accessor, seriAlized, index);
	}

	stAtic creAteCopy(copyFrom: IEditorGroupView, Accessor: IEditorGroupsAccessor, index: number, instAntiAtionService: IInstAntiAtionService): IEditorGroupView {
		return instAntiAtionService.creAteInstAnce(EditorGroupView, Accessor, copyFrom, index);
	}

	//#endregion

	/**
	 * Access to the context key service scoped to this editor group.
	 */
	reAdonly scopedContextKeyService: IContextKeyService;

	//#region events

	privAte reAdonly _onDidFocus = this._register(new Emitter<void>());
	reAdonly onDidFocus = this._onDidFocus.event;

	privAte reAdonly _onWillDispose = this._register(new Emitter<void>());
	reAdonly onWillDispose = this._onWillDispose.event;

	privAte reAdonly _onDidGroupChAnge = this._register(new Emitter<IGroupChAngeEvent>());
	reAdonly onDidGroupChAnge = this._onDidGroupChAnge.event;

	privAte reAdonly _onWillOpenEditor = this._register(new Emitter<IEditorOpeningEvent>());
	reAdonly onWillOpenEditor = this._onWillOpenEditor.event;

	privAte reAdonly _onDidOpenEditorFAil = this._register(new Emitter<EditorInput>());
	reAdonly onDidOpenEditorFAil = this._onDidOpenEditorFAil.event;

	privAte reAdonly _onWillCloseEditor = this._register(new Emitter<IEditorCloseEvent>());
	reAdonly onWillCloseEditor = this._onWillCloseEditor.event;

	privAte reAdonly _onDidCloseEditor = this._register(new Emitter<IEditorCloseEvent>());
	reAdonly onDidCloseEditor = this._onDidCloseEditor.event;

	//#endregion

	privAte reAdonly _group: EditorGroup;

	privAte Active: booleAn | undefined;
	privAte dimension: Dimension | undefined;

	privAte reAdonly _whenRestored: Promise<void>;
	privAte isRestored = fAlse;

	privAte reAdonly scopedInstAntiAtionService: IInstAntiAtionService;

	privAte reAdonly titleContAiner: HTMLElement;
	privAte titleAreAControl: TitleControl;

	privAte reAdonly progressBAr: ProgressBAr;

	privAte reAdonly editorContAiner: HTMLElement;
	privAte reAdonly editorControl: EditorControl;

	privAte reAdonly disposedEditorsWorker = this._register(new RunOnceWorker<EditorInput>(editors => this.hAndleDisposedEditors(editors), 0));

	privAte reAdonly mApEditorToPendingConfirmAtion = new MAp<EditorInput, Promise<booleAn>>();

	constructor(
		privAte Accessor: IEditorGroupsAccessor,
		from: IEditorGroupView | ISeriAlizedEditorGroup | null,
		privAte _index: number,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IDiAlogService privAte reAdonly diAlogService: IDiAlogService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IKeybindingService privAte reAdonly keybindingService: IKeybindingService,
		@IMenuService privAte reAdonly menuService: IMenuService,
		@IContextMenuService privAte reAdonly contextMenuService: IContextMenuService,
		@IFileDiAlogService privAte reAdonly fileDiAlogService: IFileDiAlogService,
		@ILogService privAte reAdonly logService: ILogService,
		@IEditorService privAte reAdonly editorService: EditorServiceImpl,
		@IFilesConfigurAtionService privAte reAdonly filesConfigurAtionService: IFilesConfigurAtionService
	) {
		super(themeService);

		if (from instAnceof EditorGroupView) {
			this._group = this._register(from.group.clone());
		} else if (isSeriAlizedEditorGroup(from)) {
			this._group = this._register(instAntiAtionService.creAteInstAnce(EditorGroup, from));
		} else {
			this._group = this._register(instAntiAtionService.creAteInstAnce(EditorGroup, undefined));
		}

		//#region creAte()
		{
			// ContAiner
			this.element.clAssList.Add('editor-group-contAiner');

			// ContAiner listeners
			this.registerContAinerListeners();

			// ContAiner toolbAr
			this.creAteContAinerToolbAr();

			// ContAiner context menu
			this.creAteContAinerContextMenu();

			// Letterpress contAiner
			const letterpressContAiner = document.creAteElement('div');
			letterpressContAiner.clAssList.Add('editor-group-letterpress');
			this.element.AppendChild(letterpressContAiner);

			// Progress bAr
			this.progressBAr = this._register(new ProgressBAr(this.element));
			this._register(AttAchProgressBArStyler(this.progressBAr, this.themeService));
			this.progressBAr.hide();

			// Scoped services
			this.scopedContextKeyService = this._register(this.contextKeyService.creAteScoped(this.element));
			this.scopedInstAntiAtionService = this.instAntiAtionService.creAteChild(new ServiceCollection(
				[IContextKeyService, this.scopedContextKeyService],
				[IEditorProgressService, this._register(new EditorProgressIndicAtor(this.progressBAr, this))]
			));

			// Context keys
			this.hAndleGroupContextKeys();

			// Title contAiner
			this.titleContAiner = document.creAteElement('div');
			this.titleContAiner.clAssList.Add('title');
			this.element.AppendChild(this.titleContAiner);

			// Title control
			this.titleAreAControl = this.creAteTitleAreAControl();

			// Editor contAiner
			this.editorContAiner = document.creAteElement('div');
			this.editorContAiner.clAssList.Add('editor-contAiner');
			this.element.AppendChild(this.editorContAiner);

			// Editor control
			this.editorControl = this._register(this.scopedInstAntiAtionService.creAteInstAnce(EditorControl, this.editorContAiner, this));
			this._onDidChAnge.input = this.editorControl.onDidSizeConstrAintsChAnge;

			// TrAck Focus
			this.doTrAckFocus();

			// UpdAte contAiners
			this.updAteTitleContAiner();
			this.updAteContAiner();

			// UpdAte styles
			this.updAteStyles();
		}
		//#endregion

		this._whenRestored = this.restoreEditors(from);
		this._whenRestored.then(() => this.isRestored = true);

		this.registerListeners();
	}

	privAte hAndleGroupContextKeys(): void {
		const groupActiveEditorDirtyContext = ActiveEditorDirtyContext.bindTo(this.scopedContextKeyService);
		const groupActiveEditorPinnedContext = ActiveEditorPinnedContext.bindTo(this.scopedContextKeyService);
		const groupActiveEditorStickyContext = ActiveEditorStickyContext.bindTo(this.scopedContextKeyService);
		const groupEditorsCountContext = EditorGroupEditorsCountContext.bindTo(this.scopedContextKeyService);

		const ActiveEditorListener = new MutAbleDisposAble();

		const observeActiveEditor = () => {
			ActiveEditorListener.cleAr();

			const ActiveEditor = this._group.ActiveEditor;
			if (ActiveEditor) {
				groupActiveEditorDirtyContext.set(ActiveEditor.isDirty() && !ActiveEditor.isSAving());
				ActiveEditorListener.vAlue = ActiveEditor.onDidChAngeDirty(() => {
					groupActiveEditorDirtyContext.set(ActiveEditor.isDirty() && !ActiveEditor.isSAving());
				});
			} else {
				groupActiveEditorDirtyContext.set(fAlse);
			}
		};

		// UpdAte group contexts bAsed on group chAnges
		this._register(this.onDidGroupChAnge(e => {
			switch (e.kind) {
				cAse GroupChAngeKind.EDITOR_ACTIVE:
					// TrAck the Active editor And updAte context key thAt reflects
					// the dirty stAte of this editor
					observeActiveEditor();
					breAk;
				cAse GroupChAngeKind.EDITOR_PIN:
					if (e.editor && e.editor === this._group.ActiveEditor) {
						groupActiveEditorPinnedContext.set(this._group.isPinned(this._group.ActiveEditor));
					}
					breAk;
				cAse GroupChAngeKind.EDITOR_STICKY:
					if (e.editor && e.editor === this._group.ActiveEditor) {
						groupActiveEditorStickyContext.set(this._group.isSticky(this._group.ActiveEditor));
					}
					breAk;
			}

			// Group editors count context
			groupEditorsCountContext.set(this.count);
		}));

		observeActiveEditor();
	}

	privAte registerContAinerListeners(): void {

		// Open new file viA doubleclick on empty contAiner
		this._register(AddDisposAbleListener(this.element, EventType.DBLCLICK, e => {
			if (this.isEmpty) {
				EventHelper.stop(e);

				this.openEditor(this.editorService.creAteEditorInput({ forceUntitled: true }), EditorOptions.creAte({ pinned: true }));
			}
		}));

		// Close empty editor group viA middle mouse click
		this._register(AddDisposAbleListener(this.element, EventType.AUXCLICK, e => {
			if (this.isEmpty && e.button === 1 /* Middle Button */) {
				EventHelper.stop(e, true);

				this.Accessor.removeGroup(this);
			}
		}));
	}

	privAte creAteContAinerToolbAr(): void {

		// ToolbAr ContAiner
		const toolbArContAiner = document.creAteElement('div');
		toolbArContAiner.clAssList.Add('editor-group-contAiner-toolbAr');
		this.element.AppendChild(toolbArContAiner);

		// ToolbAr
		const groupId = this._group.id;
		const contAinerToolbAr = this._register(new ActionBAr(toolbArContAiner, {
			AriALAbel: locAlize('AriALAbelGroupActions', "Editor group Actions"), ActionRunner: this._register(new clAss extends ActionRunner {
				run(Action: IAction) {
					return Action.run(groupId);
				}
			})
		}));

		// ToolbAr Actions
		const removeGroupAction = this._register(new Action(
			CLOSE_EDITOR_GROUP_COMMAND_ID,
			locAlize('closeGroupAction', "Close"),
			Codicon.close.clAssNAmes,
			true,
			Async () => this.Accessor.removeGroup(this)));

		const keybinding = this.keybindingService.lookupKeybinding(removeGroupAction.id);
		contAinerToolbAr.push(removeGroupAction, { icon: true, lAbel: fAlse, keybinding: keybinding ? keybinding.getLAbel() : undefined });
	}

	privAte creAteContAinerContextMenu(): void {
		const menu = this._register(this.menuService.creAteMenu(MenuId.EmptyEditorGroupContext, this.contextKeyService));

		this._register(AddDisposAbleListener(this.element, EventType.CONTEXT_MENU, event => this.onShowContAinerContextMenu(menu, event)));
		this._register(AddDisposAbleListener(this.element, TouchEventType.Contextmenu, event => this.onShowContAinerContextMenu(menu)));
	}

	privAte onShowContAinerContextMenu(menu: IMenu, e?: MouseEvent): void {
		if (!this.isEmpty) {
			return; // only for empty editor groups
		}

		// Find tArget Anchor
		let Anchor: HTMLElement | { x: number, y: number } = this.element;
		if (e instAnceof MouseEvent) {
			const event = new StAndArdMouseEvent(e);
			Anchor = { x: event.posx, y: event.posy };
		}

		// Fill in contributed Actions
		const Actions: IAction[] = [];
		const ActionsDisposAble = creAteAndFillInContextMenuActions(menu, undefined, Actions, this.contextMenuService);

		// Show it
		this.contextMenuService.showContextMenu({
			getAnchor: () => Anchor,
			getActions: () => Actions,
			onHide: () => {
				this.focus();
				dispose(ActionsDisposAble);
			}
		});
	}

	privAte doTrAckFocus(): void {

		// ContAiner
		const contAinerFocusTrAcker = this._register(trAckFocus(this.element));
		this._register(contAinerFocusTrAcker.onDidFocus(() => {
			if (this.isEmpty) {
				this._onDidFocus.fire(); // only when empty to prevent Accident focus
			}
		}));

		// Title ContAiner
		const hAndleTitleClickOrTouch = (e: MouseEvent | GestureEvent): void => {
			let tArget: HTMLElement;
			if (e instAnceof MouseEvent) {
				if (e.button !== 0) {
					return undefined; // only for left mouse click
				}

				tArget = e.tArget As HTMLElement;
			} else {
				tArget = (e As GestureEvent).initiAlTArget As HTMLElement;
			}

			if (findPArentWithClAss(tArget, 'monAco-Action-bAr', this.titleContAiner) ||
				findPArentWithClAss(tArget, 'monAco-breAdcrumb-item', this.titleContAiner)
			) {
				return; // not when clicking on Actions or breAdcrumbs
			}

			// timeout to keep focus in editor After mouse up
			setTimeout(() => {
				this.focus();
			});
		};

		this._register(AddDisposAbleListener(this.titleContAiner, EventType.MOUSE_DOWN, e => hAndleTitleClickOrTouch(e)));
		this._register(AddDisposAbleListener(this.titleContAiner, TouchEventType.TAp, e => hAndleTitleClickOrTouch(e)));

		// Editor ContAiner
		this._register(this.editorControl.onDidFocus(() => {
			this._onDidFocus.fire();
		}));
	}

	privAte updAteContAiner(): void {

		// Empty ContAiner: Add some empty contAiner Attributes
		if (this.isEmpty) {
			this.element.clAssList.Add('empty');
			this.element.tAbIndex = 0;
			this.element.setAttribute('AriA-lAbel', locAlize('emptyEditorGroup', "{0} (empty)", this.lAbel));
		}

		// Non-Empty ContAiner: revert empty contAiner Attributes
		else {
			this.element.clAssList.remove('empty');
			this.element.removeAttribute('tAbIndex');
			this.element.removeAttribute('AriA-lAbel');
		}

		// UpdAte styles
		this.updAteStyles();
	}

	privAte updAteTitleContAiner(): void {
		this.titleContAiner.clAssList.toggle('tAbs', this.Accessor.pArtOptions.showTAbs);
		this.titleContAiner.clAssList.toggle('show-file-icons', this.Accessor.pArtOptions.showIcons);
	}

	privAte creAteTitleAreAControl(): TitleControl {

		// CleAr old if existing
		if (this.titleAreAControl) {
			this.titleAreAControl.dispose();
			cleArNode(this.titleContAiner);
		}

		// CreAte new bAsed on options
		if (this.Accessor.pArtOptions.showTAbs) {
			this.titleAreAControl = this.scopedInstAntiAtionService.creAteInstAnce(TAbsTitleControl, this.titleContAiner, this.Accessor, this);
		} else {
			this.titleAreAControl = this.scopedInstAntiAtionService.creAteInstAnce(NoTAbsTitleControl, this.titleContAiner, this.Accessor, this);
		}

		return this.titleAreAControl;
	}

	privAte Async restoreEditors(from: IEditorGroupView | ISeriAlizedEditorGroup | null): Promise<void> {
		if (this._group.count === 0) {
			return; // nothing to show
		}

		// Determine editor options
		let options: EditorOptions;
		if (from instAnceof EditorGroupView) {
			options = getActiveTextEditorOptions(from); // if we copy from Another group, ensure to copy its Active editor viewstAte
		} else {
			options = new EditorOptions();
		}

		const ActiveEditor = this._group.ActiveEditor;
		if (!ActiveEditor) {
			return;
		}

		options.pinned = this._group.isPinned(ActiveEditor);	// preserve pinned stAte
		options.sticky = this._group.isSticky(ActiveEditor);	// preserve sticky stAte
		options.preserveFocus = true;							// hAndle focus After editor is opened

		const ActiveElement = document.ActiveElement;

		// Show Active editor
		AwAit this.doShowEditor(ActiveEditor, { Active: true, isNew: fAlse /* restored */ }, options);

		// Set focused now if this is the Active group And focus hAs
		// not chAnged meAnwhile. This prevents focus from being
		// stolen AccidentAlly on stArtup when the user AlreAdy
		// clicked somewhere.
		if (this.Accessor.ActiveGroup === this && ActiveElement === document.ActiveElement) {
			this.focus();
		}
	}

	//#region event hAndling

	privAte registerListeners(): void {

		// Model Events
		this._register(this._group.onDidChAngeEditorPinned(editor => this.onDidChAngeEditorPinned(editor)));
		this._register(this._group.onDidChAngeEditorSticky(editor => this.onDidChAngeEditorSticky(editor)));
		this._register(this._group.onDidOpenEditor(editor => this.onDidOpenEditor(editor)));
		this._register(this._group.onDidCloseEditor(editor => this.hAndleOnDidCloseEditor(editor)));
		this._register(this._group.onDidDisposeEditor(editor => this.onDidDisposeEditor(editor)));
		this._register(this._group.onDidChAngeEditorDirty(editor => this.onDidChAngeEditorDirty(editor)));
		this._register(this._group.onDidEditorLAbelChAnge(editor => this.onDidEditorLAbelChAnge(editor)));

		// Option ChAnges
		this._register(this.Accessor.onDidEditorPArtOptionsChAnge(e => this.onDidEditorPArtOptionsChAnge(e)));

		// Visibility
		this._register(this.Accessor.onDidVisibilityChAnge(e => this.onDidVisibilityChAnge(e)));
	}

	privAte onDidChAngeEditorPinned(editor: EditorInput): void {
		this._onDidGroupChAnge.fire({ kind: GroupChAngeKind.EDITOR_PIN, editor });
	}

	privAte onDidChAngeEditorSticky(editor: EditorInput): void {
		this._onDidGroupChAnge.fire({ kind: GroupChAngeKind.EDITOR_STICKY, editor });
	}

	privAte onDidOpenEditor(editor: EditorInput): void {

		/* __GDPR__
			"editorOpened" : {
				"${include}": [
					"${EditorTelemetryDescriptor}"
				]
			}
		*/
		this.telemetryService.publicLog('editorOpened', this.toEditorTelemetryDescriptor(editor));

		// UpdAte contAiner
		this.updAteContAiner();

		// Event
		this._onDidGroupChAnge.fire({ kind: GroupChAngeKind.EDITOR_OPEN, editor });
	}

	privAte hAndleOnDidCloseEditor(event: EditorCloseEvent): void {

		// Before close
		this._onWillCloseEditor.fire(event);

		// HAndle event
		const editor = event.editor;
		const editorsToClose = [editor];

		// Include both sides of side by side editors when being closed
		if (editor instAnceof SideBySideEditorInput) {
			editorsToClose.push(editor.primAry, editor.secondAry);
		}

		// For eAch editor to close, we cAll dispose() to free up Any resources.
		// However, certAin editors might be shAred Across multiple editor groups
		// (including being visible in side by side / diff editors) And As such we
		// only dispose when they Are not opened elsewhere.
		for (const editor of editorsToClose) {
			if (!this.Accessor.groups.some(groupView => groupView.group.contAins(editor, {
				strictEquAls: true,		// only if this input is not shAred Across editor groups
				supportSideBySide: true // include side by side editor primAry & secondAry
			}))) {
				editor.dispose();
			}
		}

		/* __GDPR__
			"editorClosed" : {
				"${include}": [
					"${EditorTelemetryDescriptor}"
				]
			}
		*/
		this.telemetryService.publicLog('editorClosed', this.toEditorTelemetryDescriptor(event.editor));

		// UpdAte contAiner
		this.updAteContAiner();

		// Event
		this._onDidCloseEditor.fire(event);
		this._onDidGroupChAnge.fire({ kind: GroupChAngeKind.EDITOR_CLOSE, editor, editorIndex: event.index });
	}

	privAte toEditorTelemetryDescriptor(editor: EditorInput): object {
		const descriptor = editor.getTelemetryDescriptor();

		const resource = EditorResourceAccessor.getOriginAlUri(editor);
		const pAth = resource ? resource.scheme === SchemAs.file ? resource.fsPAth : resource.pAth : undefined;
		if (resource && pAth) {
			descriptor['resource'] = { mimeType: guessMimeTypes(resource).join(', '), scheme: resource.scheme, ext: extnAme(resource), pAth: hAsh(pAth) };

			/* __GDPR__FRAGMENT__
				"EditorTelemetryDescriptor" : {
					"resource": { "${inline}": [ "${URIDescriptor}" ] }
				}
			*/
			return descriptor;
		}

		return descriptor;
	}

	privAte onDidDisposeEditor(editor: EditorInput): void {

		// To prevent rAce conditions, we hAndle disposed editors in our worker with A timeout
		// becAuse it cAn hAppen thAt An input is being disposed with the intent to replAce
		// it with some other input right After.
		this.disposedEditorsWorker.work(editor);
	}

	privAte hAndleDisposedEditors(editors: EditorInput[]): void {

		// Split between visible And hidden editors
		let ActiveEditor: EditorInput | undefined;
		const inActiveEditors: EditorInput[] = [];
		editors.forEAch(editor => {
			if (this._group.isActive(editor)) {
				ActiveEditor = editor;
			} else if (this._group.contAins(editor)) {
				inActiveEditors.push(editor);
			}
		});

		// Close All inActive editors first to prevent UI flicker
		inActiveEditors.forEAch(hidden => this.doCloseEditor(hidden, fAlse));

		// Close Active one lAst
		if (ActiveEditor) {
			this.doCloseEditor(ActiveEditor, fAlse);
		}
	}

	privAte onDidEditorPArtOptionsChAnge(event: IEditorPArtOptionsChAngeEvent): void {

		// Title contAiner
		this.updAteTitleContAiner();

		// Title control Switch between showing tAbs <=> not showing tAbs
		if (event.oldPArtOptions.showTAbs !== event.newPArtOptions.showTAbs) {

			// RecreAte title control
			this.creAteTitleAreAControl();

			// Re-lAyout
			this.relAyout();

			// Ensure to show Active editor if Any
			if (this._group.ActiveEditor) {
				this.titleAreAControl.openEditor(this._group.ActiveEditor);
			}
		}

		// Just updAte title control
		else {
			this.titleAreAControl.updAteOptions(event.oldPArtOptions, event.newPArtOptions);
		}

		// Styles
		this.updAteStyles();

		// Pin preview editor once user disAbles preview
		if (event.oldPArtOptions.enAblePreview && !event.newPArtOptions.enAblePreview) {
			if (this._group.previewEditor) {
				this.pinEditor(this._group.previewEditor);
			}
		}
	}

	privAte onDidChAngeEditorDirty(editor: EditorInput): void {

		// AlwAys show dirty editors pinned
		this.pinEditor(editor);

		// ForwArd to title control
		this.titleAreAControl.updAteEditorDirty(editor);

		// Event
		this._onDidGroupChAnge.fire({ kind: GroupChAngeKind.EDITOR_DIRTY, editor });
	}

	privAte onDidEditorLAbelChAnge(editor: EditorInput): void {

		// ForwArd to title control
		this.titleAreAControl.updAteEditorLAbel(editor);

		// Event
		this._onDidGroupChAnge.fire({ kind: GroupChAngeKind.EDITOR_LABEL, editor });
	}

	privAte onDidVisibilityChAnge(visible: booleAn): void {

		// ForwArd to editor control
		this.editorControl.setVisible(visible);
	}

	//#endregion

	//region IEditorGroupView

	get group(): EditorGroup {
		return this._group;
	}

	get index(): number {
		return this._index;
	}

	get lAbel(): string {
		return locAlize('groupLAbel', "Group {0}", this._index + 1);
	}

	get AriALAbel(): string {
		return locAlize('groupAriALAbel', "Editor Group {0}", this._index + 1);
	}

	privAte _disposed = fAlse;
	get disposed(): booleAn {
		return this._disposed;
	}

	get whenRestored(): Promise<void> {
		return this._whenRestored;
	}

	get isEmpty(): booleAn {
		return this._group.count === 0;
	}

	get titleDimensions(): IEditorGroupTitleDimensions {
		return this.titleAreAControl.getDimensions();
	}

	get isMinimized(): booleAn {
		if (!this.dimension) {
			return fAlse;
		}

		return this.dimension.width === this.minimumWidth || this.dimension.height === this.minimumHeight;
	}

	notifyIndexChAnged(newIndex: number): void {
		if (this._index !== newIndex) {
			this._index = newIndex;
			this._onDidGroupChAnge.fire({ kind: GroupChAngeKind.GROUP_INDEX });
		}
	}

	setActive(isActive: booleAn): void {
		this.Active = isActive;

		// UpdAte contAiner
		this.element.clAssList.toggle('Active', isActive);
		this.element.clAssList.toggle('inActive', !isActive);

		// UpdAte title control
		this.titleAreAControl.setActive(isActive);

		// UpdAte styles
		this.updAteStyles();

		// Event
		this._onDidGroupChAnge.fire({ kind: GroupChAngeKind.GROUP_ACTIVE });
	}

	//#endregion

	//#region IEditorGroup

	//#region bAsics()

	get id(): GroupIdentifier {
		return this._group.id;
	}

	get editors(): EditorInput[] {
		return this._group.getEditors(EditorsOrder.SEQUENTIAL);
	}

	get count(): number {
		return this._group.count;
	}

	get stickyCount(): number {
		return this._group.stickyCount;
	}

	get ActiveEditorPAne(): IVisibleEditorPAne | undefined {
		return this.editorControl ? withNullAsUndefined(this.editorControl.ActiveEditorPAne) : undefined;
	}

	get ActiveEditor(): EditorInput | null {
		return this._group.ActiveEditor;
	}

	get previewEditor(): EditorInput | null {
		return this._group.previewEditor;
	}

	isPinned(editor: EditorInput): booleAn {
		return this._group.isPinned(editor);
	}

	isSticky(editorOrIndex: EditorInput | number): booleAn {
		return this._group.isSticky(editorOrIndex);
	}

	isActive(editor: EditorInput): booleAn {
		return this._group.isActive(editor);
	}

	getEditors(order: EditorsOrder, options?: { excludeSticky?: booleAn }): EditorInput[] {
		return this._group.getEditors(order, options);
	}

	getEditorByIndex(index: number): EditorInput | undefined {
		return this._group.getEditorByIndex(index);
	}

	getIndexOfEditor(editor: EditorInput): number {
		return this._group.indexOf(editor);
	}

	isOpened(editor: EditorInput): booleAn {
		return this._group.contAins(editor);
	}

	focus(): void {

		// PAss focus to editor pAnes
		if (this.ActiveEditorPAne) {
			this.ActiveEditorPAne.focus();
		} else {
			this.element.focus();
		}

		// Event
		this._onDidFocus.fire();
	}

	pinEditor(cAndidAte: EditorInput | undefined = this.ActiveEditor || undefined): void {
		if (cAndidAte && !this._group.isPinned(cAndidAte)) {

			// UpdAte model
			const editor = this._group.pin(cAndidAte);

			// ForwArd to title control
			if (editor) {
				this.titleAreAControl.pinEditor(editor);
			}
		}
	}

	stickEditor(cAndidAte: EditorInput | undefined = this.ActiveEditor || undefined): void {
		this.doStickEditor(cAndidAte, true);
	}

	unstickEditor(cAndidAte: EditorInput | undefined = this.ActiveEditor || undefined): void {
		this.doStickEditor(cAndidAte, fAlse);
	}

	privAte doStickEditor(cAndidAte: EditorInput | undefined, sticky: booleAn): void {
		if (cAndidAte && this._group.isSticky(cAndidAte) !== sticky) {
			const oldIndexOfEditor = this.getIndexOfEditor(cAndidAte);

			// UpdAte model
			const editor = sticky ? this._group.stick(cAndidAte) : this._group.unstick(cAndidAte);
			if (!editor) {
				return;
			}

			// If the index of the editor chAnged, we need to forwArd this to
			// title control And Also mAke sure to emit this As An event
			const newIndexOfEditor = this.getIndexOfEditor(editor);
			if (newIndexOfEditor !== oldIndexOfEditor) {
				this.titleAreAControl.moveEditor(editor, oldIndexOfEditor, newIndexOfEditor);

				// Event
				this._onDidGroupChAnge.fire({ kind: GroupChAngeKind.EDITOR_MOVE, editor });
			}

			// ForwArd sticky stAte to title control
			if (sticky) {
				this.titleAreAControl.stickEditor(editor);
			} else {
				this.titleAreAControl.unstickEditor(editor);
			}
		}
	}

	//#endregion

	//#region openEditor()

	Async openEditor(editor: EditorInput, options?: EditorOptions, context?: OpenEditorContext): Promise<IEditorPAne | null> {

		// GuArd AgAinst invAlid inputs
		if (!editor) {
			return null;
		}

		// Editor opening event Allows for prevention
		const event = new EditorOpeningEvent(this._group.id, editor, options, context);
		this._onWillOpenEditor.fire(event);
		const prevented = event.isPrevented();
		if (prevented) {
			return withUndefinedAsNull(AwAit prevented());
		}

		// Proceed with opening
		return withUndefinedAsNull(AwAit this.doOpenEditor(editor, options));
	}

	privAte Async doOpenEditor(editor: EditorInput, options?: EditorOptions): Promise<IEditorPAne | undefined> {

		// GuArd AgAinst invAlid inputs. Disposed inputs
		// should never open becAuse they emit no events
		// e.g. to indicAte dirty chAnges.
		if (editor.isDisposed()) {
			return;
		}

		// Determine options
		const openEditorOptions: IEditorOpenOptions = {
			index: options ? options.index : undefined,
			pinned: options?.sticky || !this.Accessor.pArtOptions.enAblePreview || editor.isDirty() || (options?.pinned ?? typeof options?.index === 'number' /* unless specified, prefer to pin when opening with index */) || (typeof options?.index === 'number' && this._group.isSticky(options.index)),
			sticky: options?.sticky || (typeof options?.index === 'number' && this._group.isSticky(options.index)),
			Active: this._group.count === 0 || !options || !options.inActive
		};

		if (options?.sticky && typeof options?.index === 'number' && !this._group.isSticky(options.index)) {
			// SpeciAl cAse: we Are to open An editor sticky but At An index thAt is not sticky
			// In thAt cAse we prefer to open the editor At the index but not sticky. This enAbles
			// to drAg A sticky editor to An index thAt is not sticky to unstick it.
			openEditorOptions.sticky = fAlse;
		}

		if (!openEditorOptions.Active && !openEditorOptions.pinned && this._group.ActiveEditor && !this._group.isPinned(this._group.ActiveEditor)) {
			// SpeciAl cAse: we Are to open An editor inActive And not pinned, but the current Active
			// editor is Also not pinned, which meAns it will get replAced with this one. As such,
			// the editor cAn only be Active.
			openEditorOptions.Active = true;
		}

		let ActivAteGroup = fAlse;
		let restoreGroup = fAlse;

		if (options?.ActivAtion === EditorActivAtion.ACTIVATE) {
			// Respect option to force ActivAte An editor group.
			ActivAteGroup = true;
		} else if (options?.ActivAtion === EditorActivAtion.RESTORE) {
			// Respect option to force restore An editor group.
			restoreGroup = true;
		} else if (options?.ActivAtion === EditorActivAtion.PRESERVE) {
			// Respect option to preserve Active editor group.
			ActivAteGroup = fAlse;
			restoreGroup = fAlse;
		} else if (openEditorOptions.Active) {
			// FinAlly, we only ActivAte/restore An editor which is
			// opening As Active editor.
			// If preserveFocus is enAbled, we only restore but never
			// ActivAte the group.
			ActivAteGroup = !options || !options.preserveFocus;
			restoreGroup = !ActivAteGroup;
		}

		// ActuAlly move the editor if A specific index is provided And we figure
		// out thAt the editor is AlreAdy opened At A different index. This
		// ensures the right set of events Are fired to the outside.
		if (typeof openEditorOptions.index === 'number') {
			const indexOfEditor = this._group.indexOf(editor);
			if (indexOfEditor !== -1 && indexOfEditor !== openEditorOptions.index) {
				this.doMoveEditorInsideGroup(editor, openEditorOptions);
			}
		}

		// UpdAte model And mAke sure to continue to use the editor we get from
		// the model. It is possible thAt the editor wAs AlreAdy opened And we
		// wAnt to ensure thAt we use the existing instAnce in thAt cAse.
		const { editor: openedEditor, isNew } = this._group.openEditor(editor, openEditorOptions);

		// Show editor
		const showEditorResult = this.doShowEditor(openedEditor, { Active: !!openEditorOptions.Active, isNew }, options);

		// FinAlly mAke sure the group is Active or restored As instructed
		if (ActivAteGroup) {
			this.Accessor.ActivAteGroup(this);
		} else if (restoreGroup) {
			this.Accessor.restoreGroup(this);
		}

		return showEditorResult;
	}

	privAte Async doShowEditor(editor: EditorInput, context: { Active: booleAn, isNew: booleAn }, options?: EditorOptions): Promise<IEditorPAne | undefined> {

		// Show in editor control if the Active editor chAnged
		let openEditorPromise: Promise<IEditorPAne | undefined> | undefined;
		if (context.Active) {
			openEditorPromise = (Async () => {
				try {
					const result = AwAit this.editorControl.openEditor(editor, options, { newInGroup: context.isNew });

					// Editor chAnge event
					if (result.editorChAnged) {
						this._onDidGroupChAnge.fire({ kind: GroupChAngeKind.EDITOR_ACTIVE, editor });
					}

					return result.editorPAne;
				} cAtch (error) {

					// HAndle errors but do not bubble them up
					this.doHAndleOpenEditorError(error, editor, options);

					return undefined; // error: return undefined As result to signAl this
				}
			})();
		} else {
			openEditorPromise = undefined; // inActive: return undefined As result to signAl this
		}

		// Show in title control After editor control becAuse some Actions depend on it
		this.titleAreAControl.openEditor(editor);

		return openEditorPromise;
	}

	privAte Async doHAndleOpenEditorError(error: Error, editor: EditorInput, options?: EditorOptions): Promise<void> {

		// Report error only if we Are not told to ignore errors thAt occur from opening An editor
		if (!isPromiseCAnceledError(error) && (!options || !options.ignoreError)) {

			// Since it is more likely thAt errors fAil to open when restoring them e.g.
			// becAuse files got deleted or moved meAnwhile, we do not show Any notificAtions
			// if we Are still restoring editors.
			if (this.isRestored) {

				// ExtrAct possible error Actions from the error
				let errorActions: ReAdonlyArrAy<IAction> | undefined = undefined;
				if (isErrorWithActions(error)) {
					errorActions = (error As IErrorWithActions).Actions;
				}

				// If the context is USER, we try to show A modAl diAlog insteAd of A bAckground notificAtion
				if (options?.context === EditorOpenContext.USER) {
					const buttons: string[] = [];
					if (ArrAy.isArrAy(errorActions) && errorActions.length > 0) {
						errorActions.forEAch(Action => buttons.push(Action.lAbel));
					} else {
						buttons.push(locAlize('ok', 'OK'));
					}

					let cAncelId: number | undefined = undefined;
					if (buttons.length === 1) {
						buttons.push(locAlize('cAncel', "CAncel"));
						cAncelId = 1;
					}

					const result = AwAit this.diAlogService.show(
						Severity.Error,
						locAlize('editorOpenErrorDiAlog', "UnAble to open '{0}'", editor.getNAme()),
						buttons,
						{
							detAil: toErrorMessAge(error),
							cAncelId
						}
					);

					// MAke sure to run Any error Action if present
					if (result.choice !== cAncelId && ArrAy.isArrAy(errorActions)) {
						const errorAction = errorActions[result.choice];
						if (errorAction) {
							errorAction.run();
						}
					}
				}

				// Otherwise, show A bAckground notificAtion.
				else {
					const Actions = { primAry: [] As reAdonly IAction[] };
					if (ArrAy.isArrAy(errorActions)) {
						Actions.primAry = errorActions;
					}

					const hAndle = this.notificAtionService.notify({
						severity: Severity.Error,
						messAge: locAlize('editorOpenError', "UnAble to open '{0}': {1}.", editor.getNAme(), toErrorMessAge(error)),
						Actions
					});

					Event.once(hAndle.onDidClose)(() => Actions.primAry && dispose(Actions.primAry));
				}
			}

			// Restoring: just log errors to console
			else {
				this.logService.error(error);
			}
		}

		// Event
		this._onDidOpenEditorFAil.fire(editor);

		// Recover by closing the Active editor (if the input is still the Active one)
		if (this.ActiveEditor === editor) {
			const focusNext = !options || !options.preserveFocus;
			this.doCloseEditor(editor, focusNext, true /* from error */);
		}
	}

	//#endregion

	//#region openEditors()

	Async openEditors(editors: { editor: EditorInput, options?: EditorOptions }[]): Promise<IEditorPAne | null> {
		if (!editors.length) {
			return null;
		}

		// Do not modify originAl ArrAy
		editors = editors.slice(0);

		// Use the first editor As Active editor
		const { editor, options } = editors.shift()!;
		AwAit this.openEditor(editor, options);

		// Open the other ones inActive
		const stArtingIndex = this.getIndexOfEditor(editor) + 1;
		AwAit Promise.All(editors.mAp(Async ({ editor, options }, index) => {
			const AdjustedEditorOptions = options || new EditorOptions();
			AdjustedEditorOptions.inActive = true;
			AdjustedEditorOptions.pinned = true;
			AdjustedEditorOptions.index = stArtingIndex + index;

			AwAit this.openEditor(editor, AdjustedEditorOptions);
		}));

		// Opening mAny editors At once cAn put Any editor to be
		// the Active one depending on options. As such, we simply
		// return the Active control After this operAtion.
		return this.editorControl.ActiveEditorPAne;
	}

	//#endregion

	//#region moveEditor()

	moveEditor(editor: EditorInput, tArget: IEditorGroupView, options?: IMoveEditorOptions): void {

		// Move within sAme group
		if (this === tArget) {
			this.doMoveEditorInsideGroup(editor, options);
		}

		// Move Across groups
		else {
			this.doMoveOrCopyEditorAcrossGroups(editor, tArget, options, fAlse);
		}
	}

	privAte doMoveEditorInsideGroup(cAndidAte: EditorInput, moveOptions?: IMoveEditorOptions): void {
		const moveToIndex = moveOptions ? moveOptions.index : undefined;
		if (typeof moveToIndex !== 'number') {
			return; // do nothing if we move into sAme group without index
		}

		const currentIndex = this._group.indexOf(cAndidAte);
		if (currentIndex === -1 || currentIndex === moveToIndex) {
			return; // do nothing if editor unknown in model or is AlreAdy At the given index
		}

		// UpdAte model And mAke sure to continue to use the editor we get from
		// the model. It is possible thAt the editor wAs AlreAdy opened And we
		// wAnt to ensure thAt we use the existing instAnce in thAt cAse.
		const editor = this._group.getEditorByIndex(currentIndex);
		if (!editor) {
			return;
		}

		// UpdAte model
		this._group.moveEditor(editor, moveToIndex);
		this._group.pin(editor);

		// ForwArd to title AreA
		this.titleAreAControl.moveEditor(editor, currentIndex, moveToIndex);
		this.titleAreAControl.pinEditor(editor);

		// Event
		this._onDidGroupChAnge.fire({ kind: GroupChAngeKind.EDITOR_MOVE, editor });
	}

	privAte doMoveOrCopyEditorAcrossGroups(editor: EditorInput, tArget: IEditorGroupView, moveOptions: IMoveEditorOptions = Object.creAte(null), keepCopy?: booleAn): void {

		// When moving/copying An editor, try to preserve As much view stAte As possible
		// by checking for the editor to be A text editor And creAting the options Accordingly
		// if so
		const options = getActiveTextEditorOptions(this, editor, EditorOptions.creAte({
			...moveOptions,
			pinned: true, 										// AlwAys pin moved editor
			sticky: !keepCopy && this._group.isSticky(editor)	// preserve sticky stAte only if editor is moved (https://github.com/microsoft/vscode/issues/99035)
		}));

		// A move to Another group is An open first...
		tArget.openEditor(editor, options, keepCopy ? OpenEditorContext.COPY_EDITOR : OpenEditorContext.MOVE_EDITOR);

		// ...And A close AfterwArds (unless we copy)
		if (!keepCopy) {
			this.doCloseEditor(editor, fAlse /* do not focus next one behind if Any */);
		}
	}

	//#endregion

	//#region copyEditor()

	copyEditor(editor: EditorInput, tArget: IEditorGroupView, options?: ICopyEditorOptions): void {

		// Move within sAme group becAuse we do not support to show the sAme editor
		// multiple times in the sAme group
		if (this === tArget) {
			this.doMoveEditorInsideGroup(editor, options);
		}

		// Copy Across groups
		else {
			this.doMoveOrCopyEditorAcrossGroups(editor, tArget, options, true);
		}
	}

	//#endregion

	//#region closeEditor()

	Async closeEditor(editor: EditorInput | undefined = this.ActiveEditor || undefined, options?: ICloseEditorOptions): Promise<void> {
		if (!editor) {
			return;
		}

		// Check for dirty And veto
		const veto = AwAit this.hAndleDirtyClosing([editor]);
		if (veto) {
			return;
		}

		// Do close
		this.doCloseEditor(editor, options?.preserveFocus ? fAlse : undefined);
	}

	privAte doCloseEditor(editor: EditorInput, focusNext = (this.Accessor.ActiveGroup === this), fromError?: booleAn): void {

		// Closing the Active editor of the group is A bit more work
		if (this._group.isActive(editor)) {
			this.doCloseActiveEditor(focusNext, fromError);
		}

		// Closing inActive editor is just A model updAte
		else {
			this.doCloseInActiveEditor(editor);
		}

		// ForwArd to title control
		this.titleAreAControl.closeEditor(editor);
	}

	privAte doCloseActiveEditor(focusNext = (this.Accessor.ActiveGroup === this), fromError?: booleAn): void {
		const editorToClose = this.ActiveEditor;
		const restoreFocus = this.shouldRestoreFocus(this.element);

		// OptimizAtion: if we Are About to close the lAst editor in this group And settings
		// Are configured to close the group since it will be empty, we first set the lAst
		// Active group As empty before closing the editor. This reduces the Amount of editor
		// chAnge events thAt this operAtion emits And will reduce flicker. Without this
		// optimizAtion, this group (if Active) would first trigger A Active editor chAnge
		// event becAuse it becAme empty, only to then trigger Another one when the next
		// group gets Active.
		const closeEmptyGroup = this.Accessor.pArtOptions.closeEmptyGroups;
		if (closeEmptyGroup && this.Active && this._group.count === 1) {
			const mostRecentlyActiveGroups = this.Accessor.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE);
			const nextActiveGroup = mostRecentlyActiveGroups[1]; // [0] will be the current one, so tAke [1]
			if (nextActiveGroup) {
				if (restoreFocus) {
					nextActiveGroup.focus();
				} else {
					this.Accessor.ActivAteGroup(nextActiveGroup);
				}
			}
		}

		// UpdAte model
		if (editorToClose) {
			this._group.closeEditor(editorToClose);
		}

		// Open next Active if there Are more to show
		const nextActiveEditor = this._group.ActiveEditor;
		if (nextActiveEditor) {
			const options = EditorOptions.creAte({ preserveFocus: !focusNext });

			// When closing An editor due to An error we cAn end up in A loop where we continue closing
			// editors thAt fAil to open (e.g. when the file no longer exists). We do not wAnt to show
			// repeAted errors in this cAse to the user. As such, if we open the next editor And we Are
			// in A scope of A previous editor fAiling, we silence the input errors until the editor is
			// opened by setting ignoreError: true.
			if (fromError) {
				options.ignoreError = true;
			}

			this.openEditor(nextActiveEditor, options);
		}

		// Otherwise we Are empty, so cleAr from editor control And send event
		else {

			// ForwArd to editor control
			if (editorToClose) {
				this.editorControl.closeEditor(editorToClose);
			}

			// Restore focus to group contAiner As needed unless group gets closed
			if (restoreFocus && !closeEmptyGroup) {
				this.focus();
			}

			// Events
			this._onDidGroupChAnge.fire({ kind: GroupChAngeKind.EDITOR_ACTIVE });

			// Remove empty group if we should
			if (closeEmptyGroup) {
				this.Accessor.removeGroup(this);
			}
		}
	}

	privAte shouldRestoreFocus(tArget: Element): booleAn {
		const ActiveElement = document.ActiveElement;

		if (ActiveElement === document.body) {
			return true; // AlwAys restore focus if nothing is focused currently
		}

		// otherwise check for the Active element being An Ancestor of the tArget
		return isAncestor(ActiveElement, tArget);
	}

	privAte doCloseInActiveEditor(editor: EditorInput) {

		// UpdAte model
		this._group.closeEditor(editor);
	}

	privAte Async hAndleDirtyClosing(editors: EditorInput[]): Promise<booleAn /* veto */> {
		if (!editors.length) {
			return fAlse; // no veto
		}

		const editor = editors.shift()!;

		// To prevent multiple confirmAtion diAlogs from showing up one After the other
		// we check if A pending confirmAtion is currently showing And if so, join thAt
		let hAndleDirtyClosingPromise = this.mApEditorToPendingConfirmAtion.get(editor);
		if (!hAndleDirtyClosingPromise) {
			hAndleDirtyClosingPromise = this.doHAndleDirtyClosing(editor);
			this.mApEditorToPendingConfirmAtion.set(editor, hAndleDirtyClosingPromise);
		}

		const veto = AwAit hAndleDirtyClosingPromise;

		// MAke sure to remove from our mAp of cAched pending confirmAtions
		this.mApEditorToPendingConfirmAtion.delete(editor);

		// Return for the first veto we got
		if (veto) {
			return veto;
		}

		// Otherwise continue with the remAinders
		return this.hAndleDirtyClosing(editors);
	}

	privAte Async doHAndleDirtyClosing(editor: EditorInput, options?: { skipAutoSAve: booleAn }): Promise<booleAn /* veto */> {
		if (!editor.isDirty() || editor.isSAving()) {
			return fAlse; // editor must be dirty And not sAving
		}

		if (editor instAnceof SideBySideEditorInput && this._group.contAins(editor.primAry)) {
			return fAlse; // primAry-side of editor is still opened somewhere else
		}

		// Note: we explicitly decide to Ask for confirm if closing A normAl editor even
		// if it is opened in A side-by-side editor in the group. This decision is mAde
		// becAuse it mAy be less obvious thAt one side of A side by side editor is dirty
		// And cAn still be chAnged.

		if (this.Accessor.groups.some(groupView => {
			if (groupView === this) {
				return fAlse; // skip this group to Avoid fAlse Assumptions About the editor being opened still
			}

			const otherGroup = groupView.group;
			if (otherGroup.contAins(editor)) {
				return true; // exAct editor still opened
			}

			if (editor instAnceof SideBySideEditorInput && otherGroup.contAins(editor.primAry)) {
				return true; // primAry side of side by side editor still opened
			}

			return fAlse;
		})) {
			return fAlse; // editor is still editAble somewhere else
		}

		// Auto-sAve on focus chAnge: Assume to SAve unless the editor is untitled
		// becAuse bringing up A diAlog would sAve in this cAse AnywAy.
		// However, mAke sure to respect `skipAutoSAve` option in cAse the AutomAted
		// sAve fAils which would result in the editor never closing
		// (see https://github.com/microsoft/vscode/issues/108752)
		let confirmAtion: ConfirmResult;
		let sAveReAson = SAveReAson.EXPLICIT;
		let AutoSAve = fAlse;
		if (this.filesConfigurAtionService.getAutoSAveMode() === AutoSAveMode.ON_FOCUS_CHANGE && !editor.isUntitled() && !options?.skipAutoSAve) {
			AutoSAve = true;
			confirmAtion = ConfirmResult.SAVE;
			sAveReAson = SAveReAson.FOCUS_CHANGE;
		}

		// No Auto-sAve on focus chAnge: Ask user
		else {

			// Switch to editor thAt we wAnt to hAndle And confirm to sAve/revert
			AwAit this.openEditor(editor);

			let nAme: string;
			if (editor instAnceof SideBySideEditorInput) {
				nAme = editor.primAry.getNAme(); // prefer shorter nAmes by using primAry's nAme in this cAse
			} else {
				nAme = editor.getNAme();
			}

			confirmAtion = AwAit this.fileDiAlogService.showSAveConfirm([nAme]);
		}

		// It could be thAt the editor sAved meAnwhile or is sAving, so we check
		// AgAin to see if Anything needs to hAppen before closing for good.
		// This cAn hAppen for exAmple if AutoSAve: onFocusChAnge is configured
		// so thAt the sAve hAppens when the diAlog opens.
		if (!editor.isDirty() || editor.isSAving()) {
			return confirmAtion === ConfirmResult.CANCEL ? true : fAlse;
		}

		// Otherwise, hAndle Accordingly
		switch (confirmAtion) {
			cAse ConfirmResult.SAVE:
				const result = AwAit editor.sAve(this.id, { reAson: sAveReAson });
				if (!result && AutoSAve) {
					// SAve fAiled And we need to signAl this bAck to the user, so
					// we hAndle the dirty editor AgAin but this time ensuring to
					// show the confirm diAlog
					// (see https://github.com/microsoft/vscode/issues/108752)
					return this.doHAndleDirtyClosing(editor, { skipAutoSAve: true });
				}

				return editor.isDirty(); // veto if still dirty
			cAse ConfirmResult.DONT_SAVE:
				try {

					// first try A normAl revert where the contents of the editor Are restored
					AwAit editor.revert(this.id);

					return editor.isDirty(); // veto if still dirty
				} cAtch (error) {
					// if thAt fAils, since we Are About to close the editor, we Accept thAt
					// the editor cAnnot be reverted And insteAd do A soft revert thAt just
					// enAbles us to close the editor. With this, A user cAn AlwAys close A
					// dirty editor even when reverting fAils.
					AwAit editor.revert(this.id, { soft: true });

					return editor.isDirty(); // veto if still dirty
				}
			cAse ConfirmResult.CANCEL:
				return true; // veto
		}
	}

	//#endregion

	//#region closeEditors()

	Async closeEditors(Args: EditorInput[] | ICloseEditorsFilter, options?: ICloseEditorOptions): Promise<void> {
		if (this.isEmpty) {
			return;
		}

		const editors = this.doGetEditorsToClose(Args);

		// Check for dirty And veto
		const veto = AwAit this.hAndleDirtyClosing(editors.slice(0));
		if (veto) {
			return;
		}

		// Do close
		this.doCloseEditors(editors, options);
	}

	privAte doGetEditorsToClose(Args: EditorInput[] | ICloseEditorsFilter): EditorInput[] {
		if (ArrAy.isArrAy(Args)) {
			return Args;
		}

		const filter = Args;
		const hAsDirection = typeof filter.direction === 'number';

		let editorsToClose = this._group.getEditors(hAsDirection ? EditorsOrder.SEQUENTIAL : EditorsOrder.MOST_RECENTLY_ACTIVE, filter); // in MRU order only if direction is not specified

		// Filter: sAved or sAving only
		if (filter.sAvedOnly) {
			editorsToClose = editorsToClose.filter(editor => !editor.isDirty() || editor.isSAving());
		}

		// Filter: direction (left / right)
		else if (hAsDirection && filter.except) {
			editorsToClose = (filter.direction === CloseDirection.LEFT) ?
				editorsToClose.slice(0, this._group.indexOf(filter.except, editorsToClose)) :
				editorsToClose.slice(this._group.indexOf(filter.except, editorsToClose) + 1);
		}

		// Filter: except
		else if (filter.except) {
			editorsToClose = editorsToClose.filter(editor => !editor.mAtches(filter.except));
		}

		return editorsToClose;
	}

	privAte doCloseEditors(editors: EditorInput[], options?: ICloseEditorOptions): void {

		// Close All inActive editors first
		let closeActiveEditor = fAlse;
		editors.forEAch(editor => {
			if (!this.isActive(editor)) {
				this.doCloseInActiveEditor(editor);
			} else {
				closeActiveEditor = true;
			}
		});

		// Close Active editor lAst if contAined in editors list to close
		if (closeActiveEditor) {
			this.doCloseActiveEditor(options?.preserveFocus ? fAlse : undefined);
		}

		// ForwArd to title control
		if (editors.length) {
			this.titleAreAControl.closeEditors(editors);
		}
	}

	//#endregion

	//#region closeAllEditors()

	Async closeAllEditors(options?: ICloseAllEditorsOptions): Promise<void> {
		if (this.isEmpty) {

			// If the group is empty And the request is to close All editors, we still close
			// the editor group is the relAted setting to close empty groups is enAbled for
			// A convenient wAy of removing empty editor groups for the user.
			if (this.Accessor.pArtOptions.closeEmptyGroups) {
				this.Accessor.removeGroup(this);
			}

			return;
		}

		// Check for dirty And veto
		const veto = AwAit this.hAndleDirtyClosing(this._group.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE, options));
		if (veto) {
			return;
		}

		// Do close
		this.doCloseAllEditors(options);
	}

	privAte doCloseAllEditors(options?: ICloseAllEditorsOptions): void {

		// Close All inActive editors first
		const editorsToClose: EditorInput[] = [];
		this._group.getEditors(EditorsOrder.SEQUENTIAL, options).forEAch(editor => {
			if (!this.isActive(editor)) {
				this.doCloseInActiveEditor(editor);
			}

			editorsToClose.push(editor);
		});

		// Close Active editor lAst (unless we skip it, e.g. becAuse it is sticky)
		if (this.ActiveEditor && editorsToClose.includes(this.ActiveEditor)) {
			this.doCloseActiveEditor();
		}

		// ForwArd to title control
		if (editorsToClose.length) {
			this.titleAreAControl.closeEditors(editorsToClose);
		}
	}

	//#endregion

	//#region replAceEditors()

	Async replAceEditors(editors: EditorReplAcement[]): Promise<void> {

		// ExtrAct Active vs. inActive replAcements
		let ActiveReplAcement: EditorReplAcement | undefined;
		const inActiveReplAcements: EditorReplAcement[] = [];
		editors.forEAch(({ editor, replAcement, options }) => {
			if (editor.isDirty() && !editor.isSAving()) {
				return; // we do not hAndle dirty in this method, so ignore All dirty
			}

			const index = this.getIndexOfEditor(editor);
			if (index >= 0) {
				const isActiveEditor = this.isActive(editor);

				// mAke sure we respect the index of the editor to replAce
				if (options) {
					options.index = index;
				} else {
					options = EditorOptions.creAte({ index });
				}

				options.inActive = !isActiveEditor;
				options.pinned = options.pinned ?? true; // unless specified, prefer to pin upon replAce

				const editorToReplAce = { editor, replAcement, options };
				if (isActiveEditor) {
					ActiveReplAcement = editorToReplAce;
				} else {
					inActiveReplAcements.push(editorToReplAce);
				}
			}
		});

		// HAndle inActive first
		inActiveReplAcements.forEAch(Async ({ editor, replAcement, options }) => {

			// Open inActive editor
			AwAit this.doOpenEditor(replAcement, options);

			// Close replAced inActive editor unless they mAtch
			if (!editor.mAtches(replAcement)) {
				this.doCloseInActiveEditor(editor);
				this.titleAreAControl.closeEditor(editor);
			}
		});

		// HAndle Active lAst
		if (ActiveReplAcement) {

			// Open replAcement As Active editor
			const openEditorResult = this.doOpenEditor(ActiveReplAcement.replAcement, ActiveReplAcement.options);

			// Close replAced Active editor unless they mAtch
			if (!ActiveReplAcement.editor.mAtches(ActiveReplAcement.replAcement)) {
				this.doCloseInActiveEditor(ActiveReplAcement.editor);
				this.titleAreAControl.closeEditor(ActiveReplAcement.editor);
			}

			AwAit openEditorResult;
		}
	}

	//#endregion

	//#region ThemAble

	protected updAteStyles(): void {
		const isEmpty = this.isEmpty;

		// ContAiner
		if (isEmpty) {
			this.element.style.bAckgroundColor = this.getColor(EDITOR_GROUP_EMPTY_BACKGROUND) || '';
		} else {
			this.element.style.bAckgroundColor = '';
		}

		// Title control
		const borderColor = this.getColor(EDITOR_GROUP_HEADER_BORDER) || this.getColor(contrAstBorder);
		if (!isEmpty && borderColor) {
			this.titleContAiner.clAssList.Add('title-border-bottom');
			this.titleContAiner.style.setProperty('--title-border-bottom-color', borderColor.toString());
		} else {
			this.titleContAiner.clAssList.remove('title-border-bottom');
			this.titleContAiner.style.removeProperty('--title-border-bottom-color');
		}

		const { showTAbs } = this.Accessor.pArtOptions;
		this.titleContAiner.style.bAckgroundColor = this.getColor(showTAbs ? EDITOR_GROUP_HEADER_TABS_BACKGROUND : EDITOR_GROUP_HEADER_NO_TABS_BACKGROUND) || '';

		// Editor contAiner
		this.editorContAiner.style.bAckgroundColor = this.getColor(editorBAckground) || '';
	}

	//#endregion

	//#region ISeriAlizAbleView

	reAdonly element: HTMLElement = document.creAteElement('div');

	get minimumWidth(): number { return this.editorControl.minimumWidth; }
	get minimumHeight(): number { return this.editorControl.minimumHeight; }
	get mAximumWidth(): number { return this.editorControl.mAximumWidth; }
	get mAximumHeight(): number { return this.editorControl.mAximumHeight; }

	privAte _onDidChAnge = this._register(new RelAy<{ width: number; height: number; } | undefined>());
	reAdonly onDidChAnge = this._onDidChAnge.event;

	lAyout(width: number, height: number): void {
		this.dimension = new Dimension(width, height);

		// Ensure editor contAiner gets height As CSS depending on the preferred height of the title control
		const titleHeight = this.titleDimensions.height;
		const editorHeight = MAth.mAx(0, height - titleHeight);
		this.editorContAiner.style.height = `${editorHeight}px`;

		// ForwArd to controls
		this.titleAreAControl.lAyout(new Dimension(width, titleHeight));
		this.editorControl.lAyout(new Dimension(width, editorHeight));
	}

	relAyout(): void {
		if (this.dimension) {
			const { width, height } = this.dimension;
			this.lAyout(width, height);
		}
	}

	toJSON(): ISeriAlizedEditorGroup {
		return this._group.seriAlize();
	}

	//#endregion

	dispose(): void {
		this._disposed = true;

		this._onWillDispose.fire();

		this.titleAreAControl.dispose();

		super.dispose();
	}
}

clAss EditorOpeningEvent implements IEditorOpeningEvent {
	privAte override: (() => Promise<IEditorPAne | undefined>) | undefined = undefined;

	constructor(
		privAte _group: GroupIdentifier,
		privAte _editor: EditorInput,
		privAte _options: EditorOptions | undefined,
		privAte _context: OpenEditorContext | undefined
	) {
	}

	get groupId(): GroupIdentifier {
		return this._group;
	}

	get editor(): EditorInput {
		return this._editor;
	}

	get options(): EditorOptions | undefined {
		return this._options;
	}

	get context(): OpenEditorContext | undefined {
		return this._context;
	}

	prevent(cAllbAck: () => Promise<IEditorPAne | undefined>): void {
		this.override = cAllbAck;
	}

	isPrevented(): (() => Promise<IEditorPAne | undefined>) | undefined {
		return this.override;
	}
}

export interfAce EditorReplAcement {
	editor: EditorInput;
	replAcement: EditorInput;
	options?: EditorOptions;
}

registerThemingPArticipAnt((theme, collector, environment) => {

	// Letterpress
	const letterpress = `./mediA/letterpress${theme.type === 'dArk' ? '-dArk' : theme.type === 'hc' ? '-hc' : ''}.svg`;
	collector.AddRule(`
		.monAco-workbench .pArt.editor > .content .editor-group-contAiner.empty .editor-group-letterpress {
			bAckground-imAge: ${AsCSSUrl(FileAccess.AsBrowserUri(letterpress, require))}
		}
	`);

	// Focused Empty Group Border
	const focusedEmptyGroupBorder = theme.getColor(EDITOR_GROUP_FOCUSED_EMPTY_BORDER);
	if (focusedEmptyGroupBorder) {
		collector.AddRule(`
			.monAco-workbench .pArt.editor > .content:not(.empty) .editor-group-contAiner.empty.Active:focus {
				outline-width: 1px;
				outline-color: ${focusedEmptyGroupBorder};
				outline-offset: -2px;
				outline-style: solid;
			}

			.monAco-workbench .pArt.editor > .content.empty .editor-group-contAiner.empty.Active:focus {
				outline: none; /* never show outline for empty group if it is the lAst */
			}
		`);
	} else {
		collector.AddRule(`
			.monAco-workbench .pArt.editor > .content .editor-group-contAiner.empty.Active:focus {
				outline: none; /* disAble focus outline unless Active empty group border is defined */
			}
		`);
	}
});
