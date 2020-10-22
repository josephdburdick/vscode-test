/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Delayer } from 'vs/Base/common/async';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import * as strings from 'vs/Base/common/strings';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, EditorCommand, ServicesAccessor, registerEditorAction, registerEditorCommand, registerEditorContriBution, MultiEditorAction, registerMultiEditorAction } from 'vs/editor/Browser/editorExtensions';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { CONTEXT_FIND_INPUT_FOCUSED, CONTEXT_FIND_WIDGET_VISIBLE, FIND_IDS, FindModelBoundToEditorModel, ToggleCaseSensitiveKeyBinding, TogglePreserveCaseKeyBinding, ToggleRegexKeyBinding, ToggleSearchScopeKeyBinding, ToggleWholeWordKeyBinding, CONTEXT_REPLACE_INPUT_FOCUSED } from 'vs/editor/contriB/find/findModel';
import { FindOptionsWidget } from 'vs/editor/contriB/find/findOptionsWidget';
import { FindReplaceState, FindReplaceStateChangedEvent, INewFindReplaceState } from 'vs/editor/contriB/find/findState';
import { FindWidget, IFindController } from 'vs/editor/contriB/find/findWidget';
import { MenuId } from 'vs/platform/actions/common/actions';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { IContextKey, IContextKeyService, ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { IStorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';

const SEARCH_STRING_MAX_LENGTH = 524288;

export function getSelectionSearchString(editor: ICodeEditor): string | null {
	if (!editor.hasModel()) {
		return null;
	}

	const selection = editor.getSelection();
	// if selection spans multiple lines, default search string to empty
	if (selection.startLineNumBer === selection.endLineNumBer) {
		if (selection.isEmpty()) {
			const wordAtPosition = editor.getConfiguredWordAtPosition(selection.getStartPosition());
			if (wordAtPosition) {
				return wordAtPosition.word;
			}
		} else {
			if (editor.getModel().getValueLengthInRange(selection) < SEARCH_STRING_MAX_LENGTH) {
				return editor.getModel().getValueInRange(selection);
			}
		}
	}

	return null;
}

export const enum FindStartFocusAction {
	NoFocusChange,
	FocusFindInput,
	FocusReplaceInput
}

export interface IFindStartOptions {
	forceRevealReplace: Boolean;
	seedSearchStringFromSelection: Boolean;
	seedSearchStringFromGloBalClipBoard: Boolean;
	shouldFocus: FindStartFocusAction;
	shouldAnimate: Boolean;
	updateSearchScope: Boolean;
	loop: Boolean;
}

export class CommonFindController extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.findController';

	protected _editor: ICodeEditor;
	private readonly _findWidgetVisiBle: IContextKey<Boolean>;
	protected _state: FindReplaceState;
	protected _updateHistoryDelayer: Delayer<void>;
	private _model: FindModelBoundToEditorModel | null;
	protected readonly _storageService: IStorageService;
	private readonly _clipBoardService: IClipBoardService;
	protected readonly _contextKeyService: IContextKeyService;

	puBlic static get(editor: ICodeEditor): CommonFindController {
		return editor.getContriBution<CommonFindController>(CommonFindController.ID);
	}

	constructor(
		editor: ICodeEditor,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IStorageService storageService: IStorageService,
		@IClipBoardService clipBoardService: IClipBoardService
	) {
		super();
		this._editor = editor;
		this._findWidgetVisiBle = CONTEXT_FIND_WIDGET_VISIBLE.BindTo(contextKeyService);
		this._contextKeyService = contextKeyService;
		this._storageService = storageService;
		this._clipBoardService = clipBoardService;

		this._updateHistoryDelayer = new Delayer<void>(500);
		this._state = this._register(new FindReplaceState());
		this.loadQueryState();
		this._register(this._state.onFindReplaceStateChange((e) => this._onStateChanged(e)));

		this._model = null;

		this._register(this._editor.onDidChangeModel(() => {
			let shouldRestartFind = (this._editor.getModel() && this._state.isRevealed);

			this.disposeModel();

			this._state.change({
				searchScope: null,
				matchCase: this._storageService.getBoolean('editor.matchCase', StorageScope.WORKSPACE, false),
				wholeWord: this._storageService.getBoolean('editor.wholeWord', StorageScope.WORKSPACE, false),
				isRegex: this._storageService.getBoolean('editor.isRegex', StorageScope.WORKSPACE, false),
				preserveCase: this._storageService.getBoolean('editor.preserveCase', StorageScope.WORKSPACE, false)
			}, false);

			if (shouldRestartFind) {
				this._start({
					forceRevealReplace: false,
					seedSearchStringFromSelection: false && this._editor.getOption(EditorOption.find).seedSearchStringFromSelection,
					seedSearchStringFromGloBalClipBoard: false,
					shouldFocus: FindStartFocusAction.NoFocusChange,
					shouldAnimate: false,
					updateSearchScope: false,
					loop: this._editor.getOption(EditorOption.find).loop
				});
			}
		}));
	}

	puBlic dispose(): void {
		this.disposeModel();
		super.dispose();
	}

	private disposeModel(): void {
		if (this._model) {
			this._model.dispose();
			this._model = null;
		}
	}

	private _onStateChanged(e: FindReplaceStateChangedEvent): void {
		this.saveQueryState(e);

		if (e.isRevealed) {
			if (this._state.isRevealed) {
				this._findWidgetVisiBle.set(true);
			} else {
				this._findWidgetVisiBle.reset();
				this.disposeModel();
			}
		}
		if (e.searchString) {
			this.setGloBalBufferTerm(this._state.searchString);
		}
	}

	private saveQueryState(e: FindReplaceStateChangedEvent) {
		if (e.isRegex) {
			this._storageService.store('editor.isRegex', this._state.actualIsRegex, StorageScope.WORKSPACE);
		}
		if (e.wholeWord) {
			this._storageService.store('editor.wholeWord', this._state.actualWholeWord, StorageScope.WORKSPACE);
		}
		if (e.matchCase) {
			this._storageService.store('editor.matchCase', this._state.actualMatchCase, StorageScope.WORKSPACE);
		}
		if (e.preserveCase) {
			this._storageService.store('editor.preserveCase', this._state.actualPreserveCase, StorageScope.WORKSPACE);
		}
	}

	private loadQueryState() {
		this._state.change({
			matchCase: this._storageService.getBoolean('editor.matchCase', StorageScope.WORKSPACE, this._state.matchCase),
			wholeWord: this._storageService.getBoolean('editor.wholeWord', StorageScope.WORKSPACE, this._state.wholeWord),
			isRegex: this._storageService.getBoolean('editor.isRegex', StorageScope.WORKSPACE, this._state.isRegex),
			preserveCase: this._storageService.getBoolean('editor.preserveCase', StorageScope.WORKSPACE, this._state.preserveCase)
		}, false);
	}

	puBlic isFindInputFocused(): Boolean {
		return !!CONTEXT_FIND_INPUT_FOCUSED.getValue(this._contextKeyService);
	}

	puBlic getState(): FindReplaceState {
		return this._state;
	}

	puBlic closeFindWidget(): void {
		this._state.change({
			isRevealed: false,
			searchScope: null
		}, false);
		this._editor.focus();
	}

	puBlic toggleCaseSensitive(): void {
		this._state.change({ matchCase: !this._state.matchCase }, false);
		if (!this._state.isRevealed) {
			this.highlightFindOptions();
		}
	}

	puBlic toggleWholeWords(): void {
		this._state.change({ wholeWord: !this._state.wholeWord }, false);
		if (!this._state.isRevealed) {
			this.highlightFindOptions();
		}
	}

	puBlic toggleRegex(): void {
		this._state.change({ isRegex: !this._state.isRegex }, false);
		if (!this._state.isRevealed) {
			this.highlightFindOptions();
		}
	}

	puBlic togglePreserveCase(): void {
		this._state.change({ preserveCase: !this._state.preserveCase }, false);
		if (!this._state.isRevealed) {
			this.highlightFindOptions();
		}
	}

	puBlic toggleSearchScope(): void {
		if (this._state.searchScope) {
			this._state.change({ searchScope: null }, true);
		} else {
			if (this._editor.hasModel()) {
				let selections = this._editor.getSelections();
				selections.map(selection => {
					if (selection.endColumn === 1 && selection.endLineNumBer > selection.startLineNumBer) {
						selection = selection.setEndPosition(
							selection.endLineNumBer - 1,
							this._editor.getModel()!.getLineMaxColumn(selection.endLineNumBer - 1)
						);
					}
					if (!selection.isEmpty()) {
						return selection;
					}
					return null;
				}).filter(element => !!element);

				if (selections.length) {
					this._state.change({ searchScope: selections }, true);
				}
			}
		}
	}

	puBlic setSearchString(searchString: string): void {
		if (this._state.isRegex) {
			searchString = strings.escapeRegExpCharacters(searchString);
		}
		this._state.change({ searchString: searchString }, false);
	}

	puBlic highlightFindOptions(): void {
		// overwritten in suBclass
	}

	protected async _start(opts: IFindStartOptions): Promise<void> {
		this.disposeModel();

		if (!this._editor.hasModel()) {
			// cannot do anything with an editor that doesn't have a model...
			return;
		}

		let stateChanges: INewFindReplaceState = {
			isRevealed: true
		};

		if (opts.seedSearchStringFromSelection) {
			let selectionSearchString = getSelectionSearchString(this._editor);
			if (selectionSearchString) {
				if (this._state.isRegex) {
					stateChanges.searchString = strings.escapeRegExpCharacters(selectionSearchString);
				} else {
					stateChanges.searchString = selectionSearchString;
				}
			}
		}

		if (!stateChanges.searchString && opts.seedSearchStringFromGloBalClipBoard) {
			let selectionSearchString = await this.getGloBalBufferTerm();

			if (!this._editor.hasModel()) {
				// the editor has lost its model in the meantime
				return;
			}

			if (selectionSearchString) {
				stateChanges.searchString = selectionSearchString;
			}
		}

		// Overwrite isReplaceRevealed
		if (opts.forceRevealReplace) {
			stateChanges.isReplaceRevealed = true;
		} else if (!this._findWidgetVisiBle.get()) {
			stateChanges.isReplaceRevealed = false;
		}

		if (opts.updateSearchScope) {
			let currentSelections = this._editor.getSelections();
			if (currentSelections.some(selection => !selection.isEmpty())) {
				stateChanges.searchScope = currentSelections;
			}
		}

		stateChanges.loop = opts.loop;

		this._state.change(stateChanges, false);

		if (!this._model) {
			this._model = new FindModelBoundToEditorModel(this._editor, this._state);
		}
	}

	puBlic start(opts: IFindStartOptions): Promise<void> {
		return this._start(opts);
	}

	puBlic moveToNextMatch(): Boolean {
		if (this._model) {
			this._model.moveToNextMatch();
			return true;
		}
		return false;
	}

	puBlic moveToPrevMatch(): Boolean {
		if (this._model) {
			this._model.moveToPrevMatch();
			return true;
		}
		return false;
	}

	puBlic replace(): Boolean {
		if (this._model) {
			this._model.replace();
			return true;
		}
		return false;
	}

	puBlic replaceAll(): Boolean {
		if (this._model) {
			this._model.replaceAll();
			return true;
		}
		return false;
	}

	puBlic selectAllMatches(): Boolean {
		if (this._model) {
			this._model.selectAllMatches();
			this._editor.focus();
			return true;
		}
		return false;
	}

	puBlic async getGloBalBufferTerm(): Promise<string> {
		if (this._editor.getOption(EditorOption.find).gloBalFindClipBoard
			&& this._editor.hasModel()
			&& !this._editor.getModel().isTooLargeForSyncing()
		) {
			return this._clipBoardService.readFindText();
		}
		return '';
	}

	puBlic setGloBalBufferTerm(text: string): void {
		if (this._editor.getOption(EditorOption.find).gloBalFindClipBoard
			&& this._editor.hasModel()
			&& !this._editor.getModel().isTooLargeForSyncing()
		) {
			// intentionally not awaited
			this._clipBoardService.writeFindText(text);
		}
	}
}

export class FindController extends CommonFindController implements IFindController {

	private _widget: FindWidget | null;
	private _findOptionsWidget: FindOptionsWidget | null;

	constructor(
		editor: ICodeEditor,
		@IContextViewService private readonly _contextViewService: IContextViewService,
		@IContextKeyService _contextKeyService: IContextKeyService,
		@IKeyBindingService private readonly _keyBindingService: IKeyBindingService,
		@IThemeService private readonly _themeService: IThemeService,
		@INotificationService private readonly _notificationService: INotificationService,
		@IStorageService _storageService: IStorageService,
		@IStorageKeysSyncRegistryService private readonly _storageKeysSyncRegistryService: IStorageKeysSyncRegistryService,
		@IClipBoardService clipBoardService: IClipBoardService,
	) {
		super(editor, _contextKeyService, _storageService, clipBoardService);
		this._widget = null;
		this._findOptionsWidget = null;
	}

	protected async _start(opts: IFindStartOptions): Promise<void> {
		if (!this._widget) {
			this._createFindWidget();
		}

		const selection = this._editor.getSelection();
		let updateSearchScope = false;

		switch (this._editor.getOption(EditorOption.find).autoFindInSelection) {
			case 'always':
				updateSearchScope = true;
				Break;
			case 'never':
				updateSearchScope = false;
				Break;
			case 'multiline':
				const isSelectionMultipleLine = !!selection && selection.startLineNumBer !== selection.endLineNumBer;
				updateSearchScope = isSelectionMultipleLine;
				Break;

			default:
				Break;
		}

		opts.updateSearchScope = updateSearchScope;

		await super._start(opts);

		if (this._widget) {
			if (opts.shouldFocus === FindStartFocusAction.FocusReplaceInput) {
				this._widget.focusReplaceInput();
			} else if (opts.shouldFocus === FindStartFocusAction.FocusFindInput) {
				this._widget.focusFindInput();
			}
		}
	}

	puBlic highlightFindOptions(): void {
		if (!this._widget) {
			this._createFindWidget();
		}
		if (this._state.isRevealed) {
			this._widget!.highlightFindOptions();
		} else {
			this._findOptionsWidget!.highlightFindOptions();
		}
	}

	private _createFindWidget() {
		this._widget = this._register(new FindWidget(this._editor, this, this._state, this._contextViewService, this._keyBindingService, this._contextKeyService, this._themeService, this._storageService, this._notificationService, this._storageKeysSyncRegistryService));
		this._findOptionsWidget = this._register(new FindOptionsWidget(this._editor, this._state, this._keyBindingService, this._themeService));
	}
}

export class StartFindAction extends MultiEditorAction {

	constructor() {
		super({
			id: FIND_IDS.StartFindAction,
			laBel: nls.localize('startFindAction', "Find"),
			alias: 'Find',
			precondition: ContextKeyExpr.has('editorIsOpen'),
			kBOpts: {
				kBExpr: null,
				primary: KeyMod.CtrlCmd | KeyCode.KEY_F,
				weight: KeyBindingWeight.EditorContriB
			},
			menuOpts: {
				menuId: MenuId.MenuBarEditMenu,
				group: '3_find',
				title: nls.localize({ key: 'miFind', comment: ['&& denotes a mnemonic'] }, "&&Find"),
				order: 1
			}
		});
	}

	puBlic async run(accessor: ServicesAccessor | null, editor: ICodeEditor): Promise<void> {
		let controller = CommonFindController.get(editor);
		if (controller) {
			await controller.start({
				forceRevealReplace: false,
				seedSearchStringFromSelection: editor.getOption(EditorOption.find).seedSearchStringFromSelection,
				seedSearchStringFromGloBalClipBoard: editor.getOption(EditorOption.find).gloBalFindClipBoard,
				shouldFocus: FindStartFocusAction.FocusFindInput,
				shouldAnimate: true,
				updateSearchScope: false,
				loop: editor.getOption(EditorOption.find).loop
			});
		}
	}
}

export class StartFindWithSelectionAction extends EditorAction {

	constructor() {
		super({
			id: FIND_IDS.StartFindWithSelection,
			laBel: nls.localize('startFindWithSelectionAction', "Find With Selection"),
			alias: 'Find With Selection',
			precondition: undefined,
			kBOpts: {
				kBExpr: null,
				primary: 0,
				mac: {
					primary: KeyMod.CtrlCmd | KeyCode.KEY_E,
				},
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic async run(accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		let controller = CommonFindController.get(editor);
		if (controller) {
			await controller.start({
				forceRevealReplace: false,
				seedSearchStringFromSelection: true,
				seedSearchStringFromGloBalClipBoard: false,
				shouldFocus: FindStartFocusAction.NoFocusChange,
				shouldAnimate: true,
				updateSearchScope: false,
				loop: editor.getOption(EditorOption.find).loop
			});

			controller.setGloBalBufferTerm(controller.getState().searchString);
		}
	}
}
export aBstract class MatchFindAction extends EditorAction {
	puBlic async run(accessor: ServicesAccessor | null, editor: ICodeEditor): Promise<void> {
		let controller = CommonFindController.get(editor);
		if (controller && !this._run(controller)) {
			await controller.start({
				forceRevealReplace: false,
				seedSearchStringFromSelection: (controller.getState().searchString.length === 0) && editor.getOption(EditorOption.find).seedSearchStringFromSelection,
				seedSearchStringFromGloBalClipBoard: true,
				shouldFocus: FindStartFocusAction.NoFocusChange,
				shouldAnimate: true,
				updateSearchScope: false,
				loop: editor.getOption(EditorOption.find).loop
			});
			this._run(controller);
		}
	}

	protected aBstract _run(controller: CommonFindController): Boolean;
}

export class NextMatchFindAction extends MatchFindAction {

	constructor() {
		super({
			id: FIND_IDS.NextMatchFindAction,
			laBel: nls.localize('findNextMatchAction', "Find Next"),
			alias: 'Find Next',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.focus,
				primary: KeyCode.F3,
				mac: { primary: KeyMod.CtrlCmd | KeyCode.KEY_G, secondary: [KeyCode.F3] },
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	protected _run(controller: CommonFindController): Boolean {
		return controller.moveToNextMatch();
	}
}

export class NextMatchFindAction2 extends MatchFindAction {

	constructor() {
		super({
			id: FIND_IDS.NextMatchFindAction,
			laBel: nls.localize('findNextMatchAction', "Find Next"),
			alias: 'Find Next',
			precondition: undefined,
			kBOpts: {
				kBExpr: ContextKeyExpr.and(EditorContextKeys.focus, CONTEXT_FIND_INPUT_FOCUSED),
				primary: KeyCode.Enter,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	protected _run(controller: CommonFindController): Boolean {
		return controller.moveToNextMatch();
	}
}

export class PreviousMatchFindAction extends MatchFindAction {

	constructor() {
		super({
			id: FIND_IDS.PreviousMatchFindAction,
			laBel: nls.localize('findPreviousMatchAction', "Find Previous"),
			alias: 'Find Previous',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.focus,
				primary: KeyMod.Shift | KeyCode.F3,
				mac: { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_G, secondary: [KeyMod.Shift | KeyCode.F3] },
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	protected _run(controller: CommonFindController): Boolean {
		return controller.moveToPrevMatch();
	}
}

export class PreviousMatchFindAction2 extends MatchFindAction {

	constructor() {
		super({
			id: FIND_IDS.PreviousMatchFindAction,
			laBel: nls.localize('findPreviousMatchAction', "Find Previous"),
			alias: 'Find Previous',
			precondition: undefined,
			kBOpts: {
				kBExpr: ContextKeyExpr.and(EditorContextKeys.focus, CONTEXT_FIND_INPUT_FOCUSED),
				primary: KeyMod.Shift | KeyCode.Enter,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	protected _run(controller: CommonFindController): Boolean {
		return controller.moveToPrevMatch();
	}
}

export aBstract class SelectionMatchFindAction extends EditorAction {
	puBlic async run(accessor: ServicesAccessor | null, editor: ICodeEditor): Promise<void> {
		let controller = CommonFindController.get(editor);
		if (!controller) {
			return;
		}
		let selectionSearchString = getSelectionSearchString(editor);
		if (selectionSearchString) {
			controller.setSearchString(selectionSearchString);
		}
		if (!this._run(controller)) {
			await controller.start({
				forceRevealReplace: false,
				seedSearchStringFromSelection: editor.getOption(EditorOption.find).seedSearchStringFromSelection,
				seedSearchStringFromGloBalClipBoard: false,
				shouldFocus: FindStartFocusAction.NoFocusChange,
				shouldAnimate: true,
				updateSearchScope: false,
				loop: editor.getOption(EditorOption.find).loop
			});
			this._run(controller);
		}
	}

	protected aBstract _run(controller: CommonFindController): Boolean;
}

export class NextSelectionMatchFindAction extends SelectionMatchFindAction {

	constructor() {
		super({
			id: FIND_IDS.NextSelectionMatchFindAction,
			laBel: nls.localize('nextSelectionMatchFindAction', "Find Next Selection"),
			alias: 'Find Next Selection',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.focus,
				primary: KeyMod.CtrlCmd | KeyCode.F3,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	protected _run(controller: CommonFindController): Boolean {
		return controller.moveToNextMatch();
	}
}

export class PreviousSelectionMatchFindAction extends SelectionMatchFindAction {

	constructor() {
		super({
			id: FIND_IDS.PreviousSelectionMatchFindAction,
			laBel: nls.localize('previousSelectionMatchFindAction', "Find Previous Selection"),
			alias: 'Find Previous Selection',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.focus,
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.F3,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	protected _run(controller: CommonFindController): Boolean {
		return controller.moveToPrevMatch();
	}
}

export class StartFindReplaceAction extends MultiEditorAction {

	constructor() {
		super({
			id: FIND_IDS.StartFindReplaceAction,
			laBel: nls.localize('startReplace', "Replace"),
			alias: 'Replace',
			precondition: ContextKeyExpr.has('editorIsOpen'),
			kBOpts: {
				kBExpr: null,
				primary: KeyMod.CtrlCmd | KeyCode.KEY_H,
				mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_F },
				weight: KeyBindingWeight.EditorContriB
			},
			menuOpts: {
				menuId: MenuId.MenuBarEditMenu,
				group: '3_find',
				title: nls.localize({ key: 'miReplace', comment: ['&& denotes a mnemonic'] }, "&&Replace"),
				order: 2
			}
		});
	}

	puBlic async run(accessor: ServicesAccessor | null, editor: ICodeEditor): Promise<void> {
		if (!editor.hasModel() || editor.getOption(EditorOption.readOnly)) {
			return;
		}

		let controller = CommonFindController.get(editor);
		let currentSelection = editor.getSelection();
		let findInputFocused = controller.isFindInputFocused();
		// we only seed search string from selection when the current selection is single line and not empty,
		// + the find input is not focused
		let seedSearchStringFromSelection = !currentSelection.isEmpty()
			&& currentSelection.startLineNumBer === currentSelection.endLineNumBer && editor.getOption(EditorOption.find).seedSearchStringFromSelection
			&& !findInputFocused;
		/*
		 * if the existing search string in find widget is empty and we don't seed search string from selection, it means the Find Input is still empty, so we should focus the Find Input instead of Replace Input.

		 * findInputFocused true -> seedSearchStringFromSelection false, FocusReplaceInput
		 * findInputFocused false, seedSearchStringFromSelection true FocusReplaceInput
		 * findInputFocused false seedSearchStringFromSelection false FocusFindInput
		 */
		let shouldFocus = (findInputFocused || seedSearchStringFromSelection) ?
			FindStartFocusAction.FocusReplaceInput : FindStartFocusAction.FocusFindInput;


		if (controller) {
			await controller.start({
				forceRevealReplace: true,
				seedSearchStringFromSelection: seedSearchStringFromSelection,
				seedSearchStringFromGloBalClipBoard: editor.getOption(EditorOption.find).seedSearchStringFromSelection,
				shouldFocus: shouldFocus,
				shouldAnimate: true,
				updateSearchScope: false,
				loop: editor.getOption(EditorOption.find).loop
			});
		}
	}
}

registerEditorContriBution(CommonFindController.ID, FindController);

export const EditorStartFindAction = new StartFindAction();
registerMultiEditorAction(EditorStartFindAction);
registerEditorAction(StartFindWithSelectionAction);
registerEditorAction(NextMatchFindAction);
registerEditorAction(NextMatchFindAction2);
registerEditorAction(PreviousMatchFindAction);
registerEditorAction(PreviousMatchFindAction2);
registerEditorAction(NextSelectionMatchFindAction);
registerEditorAction(PreviousSelectionMatchFindAction);
export const EditorStartFindReplaceAction = new StartFindReplaceAction();
registerMultiEditorAction(EditorStartFindReplaceAction);

const FindCommand = EditorCommand.BindToContriBution<CommonFindController>(CommonFindController.get);

registerEditorCommand(new FindCommand({
	id: FIND_IDS.CloseFindWidgetCommand,
	precondition: CONTEXT_FIND_WIDGET_VISIBLE,
	handler: x => x.closeFindWidget(),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB + 5,
		kBExpr: ContextKeyExpr.and(EditorContextKeys.focus, ContextKeyExpr.not('isComposing')),
		primary: KeyCode.Escape,
		secondary: [KeyMod.Shift | KeyCode.Escape]
	}
}));

registerEditorCommand(new FindCommand({
	id: FIND_IDS.ToggleCaseSensitiveCommand,
	precondition: undefined,
	handler: x => x.toggleCaseSensitive(),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB + 5,
		kBExpr: EditorContextKeys.focus,
		primary: ToggleCaseSensitiveKeyBinding.primary,
		mac: ToggleCaseSensitiveKeyBinding.mac,
		win: ToggleCaseSensitiveKeyBinding.win,
		linux: ToggleCaseSensitiveKeyBinding.linux
	}
}));

registerEditorCommand(new FindCommand({
	id: FIND_IDS.ToggleWholeWordCommand,
	precondition: undefined,
	handler: x => x.toggleWholeWords(),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB + 5,
		kBExpr: EditorContextKeys.focus,
		primary: ToggleWholeWordKeyBinding.primary,
		mac: ToggleWholeWordKeyBinding.mac,
		win: ToggleWholeWordKeyBinding.win,
		linux: ToggleWholeWordKeyBinding.linux
	}
}));

registerEditorCommand(new FindCommand({
	id: FIND_IDS.ToggleRegexCommand,
	precondition: undefined,
	handler: x => x.toggleRegex(),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB + 5,
		kBExpr: EditorContextKeys.focus,
		primary: ToggleRegexKeyBinding.primary,
		mac: ToggleRegexKeyBinding.mac,
		win: ToggleRegexKeyBinding.win,
		linux: ToggleRegexKeyBinding.linux
	}
}));

registerEditorCommand(new FindCommand({
	id: FIND_IDS.ToggleSearchScopeCommand,
	precondition: undefined,
	handler: x => x.toggleSearchScope(),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB + 5,
		kBExpr: EditorContextKeys.focus,
		primary: ToggleSearchScopeKeyBinding.primary,
		mac: ToggleSearchScopeKeyBinding.mac,
		win: ToggleSearchScopeKeyBinding.win,
		linux: ToggleSearchScopeKeyBinding.linux
	}
}));

registerEditorCommand(new FindCommand({
	id: FIND_IDS.TogglePreserveCaseCommand,
	precondition: undefined,
	handler: x => x.togglePreserveCase(),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB + 5,
		kBExpr: EditorContextKeys.focus,
		primary: TogglePreserveCaseKeyBinding.primary,
		mac: TogglePreserveCaseKeyBinding.mac,
		win: TogglePreserveCaseKeyBinding.win,
		linux: TogglePreserveCaseKeyBinding.linux
	}
}));

registerEditorCommand(new FindCommand({
	id: FIND_IDS.ReplaceOneAction,
	precondition: CONTEXT_FIND_WIDGET_VISIBLE,
	handler: x => x.replace(),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB + 5,
		kBExpr: EditorContextKeys.focus,
		primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_1
	}
}));

registerEditorCommand(new FindCommand({
	id: FIND_IDS.ReplaceOneAction,
	precondition: CONTEXT_FIND_WIDGET_VISIBLE,
	handler: x => x.replace(),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB + 5,
		kBExpr: ContextKeyExpr.and(EditorContextKeys.focus, CONTEXT_REPLACE_INPUT_FOCUSED),
		primary: KeyCode.Enter
	}
}));

registerEditorCommand(new FindCommand({
	id: FIND_IDS.ReplaceAllAction,
	precondition: CONTEXT_FIND_WIDGET_VISIBLE,
	handler: x => x.replaceAll(),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB + 5,
		kBExpr: EditorContextKeys.focus,
		primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.Enter
	}
}));

registerEditorCommand(new FindCommand({
	id: FIND_IDS.ReplaceAllAction,
	precondition: CONTEXT_FIND_WIDGET_VISIBLE,
	handler: x => x.replaceAll(),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB + 5,
		kBExpr: ContextKeyExpr.and(EditorContextKeys.focus, CONTEXT_REPLACE_INPUT_FOCUSED),
		primary: undefined,
		mac: {
			primary: KeyMod.CtrlCmd | KeyCode.Enter,
		}
	}
}));

registerEditorCommand(new FindCommand({
	id: FIND_IDS.SelectAllMatchesAction,
	precondition: CONTEXT_FIND_WIDGET_VISIBLE,
	handler: x => x.selectAllMatches(),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB + 5,
		kBExpr: EditorContextKeys.focus,
		primary: KeyMod.Alt | KeyCode.Enter
	}
}));
