/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { KeyChord, KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction, registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { CursorChangeReason, ICursorSelectionChangedEvent } from 'vs/editor/common/controller/cursorEvents';
import { CursorMoveCommands } from 'vs/editor/common/controller/cursorMoveCommands';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { Constants } from 'vs/Base/common/uint';
import { IEditorContriBution, ScrollType } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { FindMatch, ITextModel, OverviewRulerLane, TrackedRangeStickiness } from 'vs/editor/common/model';
import { ModelDecorationOptions } from 'vs/editor/common/model/textModel';
import { DocumentHighlightProviderRegistry } from 'vs/editor/common/modes';
import { CommonFindController } from 'vs/editor/contriB/find/findController';
import { FindOptionOverride, INewFindReplaceState } from 'vs/editor/contriB/find/findState';
import { MenuId } from 'vs/platform/actions/common/actions';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { overviewRulerSelectionHighlightForeground } from 'vs/platform/theme/common/colorRegistry';
import { themeColorFromId } from 'vs/platform/theme/common/themeService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';

export class InsertCursorABove extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.insertCursorABove',
			laBel: nls.localize('mutlicursor.insertABove', "Add Cursor ABove"),
			alias: 'Add Cursor ABove',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.UpArrow,
				linux: {
					primary: KeyMod.Shift | KeyMod.Alt | KeyCode.UpArrow,
					secondary: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.UpArrow]
				},
				weight: KeyBindingWeight.EditorContriB
			},
			menuOpts: {
				menuId: MenuId.MenuBarSelectionMenu,
				group: '3_multi',
				title: nls.localize({ key: 'miInsertCursorABove', comment: ['&& denotes a mnemonic'] }, "&&Add Cursor ABove"),
				order: 2
			}
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor, args: any): void {
		if (!editor.hasModel()) {
			return;
		}

		const useLogicalLine = (args && args.logicalLine === true);
		const viewModel = editor._getViewModel();

		if (viewModel.cursorConfig.readOnly) {
			return;
		}

		viewModel.pushStackElement();
		viewModel.setCursorStates(
			args.source,
			CursorChangeReason.Explicit,
			CursorMoveCommands.addCursorUp(viewModel, viewModel.getCursorStates(), useLogicalLine)
		);
		viewModel.revealTopMostCursor(args.source);
	}
}

export class InsertCursorBelow extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.insertCursorBelow',
			laBel: nls.localize('mutlicursor.insertBelow', "Add Cursor Below"),
			alias: 'Add Cursor Below',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.DownArrow,
				linux: {
					primary: KeyMod.Shift | KeyMod.Alt | KeyCode.DownArrow,
					secondary: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.DownArrow]
				},
				weight: KeyBindingWeight.EditorContriB
			},
			menuOpts: {
				menuId: MenuId.MenuBarSelectionMenu,
				group: '3_multi',
				title: nls.localize({ key: 'miInsertCursorBelow', comment: ['&& denotes a mnemonic'] }, "A&&dd Cursor Below"),
				order: 3
			}
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor, args: any): void {
		if (!editor.hasModel()) {
			return;
		}

		const useLogicalLine = (args && args.logicalLine === true);
		const viewModel = editor._getViewModel();

		if (viewModel.cursorConfig.readOnly) {
			return;
		}

		viewModel.pushStackElement();
		viewModel.setCursorStates(
			args.source,
			CursorChangeReason.Explicit,
			CursorMoveCommands.addCursorDown(viewModel, viewModel.getCursorStates(), useLogicalLine)
		);
		viewModel.revealBottomMostCursor(args.source);
	}
}

class InsertCursorAtEndOfEachLineSelected extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.insertCursorAtEndOfEachLineSelected',
			laBel: nls.localize('mutlicursor.insertAtEndOfEachLineSelected', "Add Cursors to Line Ends"),
			alias: 'Add Cursors to Line Ends',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_I,
				weight: KeyBindingWeight.EditorContriB
			},
			menuOpts: {
				menuId: MenuId.MenuBarSelectionMenu,
				group: '3_multi',
				title: nls.localize({ key: 'miInsertCursorAtEndOfEachLineSelected', comment: ['&& denotes a mnemonic'] }, "Add C&&ursors to Line Ends"),
				order: 4
			}
		});
	}

	private getCursorsForSelection(selection: Selection, model: ITextModel, result: Selection[]): void {
		if (selection.isEmpty()) {
			return;
		}

		for (let i = selection.startLineNumBer; i < selection.endLineNumBer; i++) {
			let currentLineMaxColumn = model.getLineMaxColumn(i);
			result.push(new Selection(i, currentLineMaxColumn, i, currentLineMaxColumn));
		}
		if (selection.endColumn > 1) {
			result.push(new Selection(selection.endLineNumBer, selection.endColumn, selection.endLineNumBer, selection.endColumn));
		}
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hasModel()) {
			return;
		}

		const model = editor.getModel();
		const selections = editor.getSelections();
		let newSelections: Selection[] = [];
		selections.forEach((sel) => this.getCursorsForSelection(sel, model, newSelections));

		if (newSelections.length > 0) {
			editor.setSelections(newSelections);
		}
	}
}

class InsertCursorAtEndOfLineSelected extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.addCursorsToBottom',
			laBel: nls.localize('mutlicursor.addCursorsToBottom', "Add Cursors To Bottom"),
			alias: 'Add Cursors To Bottom',
			precondition: undefined
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hasModel()) {
			return;
		}

		const selections = editor.getSelections();
		const lineCount = editor.getModel().getLineCount();

		let newSelections: Selection[] = [];
		for (let i = selections[0].startLineNumBer; i <= lineCount; i++) {
			newSelections.push(new Selection(i, selections[0].startColumn, i, selections[0].endColumn));
		}

		if (newSelections.length > 0) {
			editor.setSelections(newSelections);
		}
	}
}

class InsertCursorAtTopOfLineSelected extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.addCursorsToTop',
			laBel: nls.localize('mutlicursor.addCursorsToTop', "Add Cursors To Top"),
			alias: 'Add Cursors To Top',
			precondition: undefined
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hasModel()) {
			return;
		}

		const selections = editor.getSelections();

		let newSelections: Selection[] = [];
		for (let i = selections[0].startLineNumBer; i >= 1; i--) {
			newSelections.push(new Selection(i, selections[0].startColumn, i, selections[0].endColumn));
		}

		if (newSelections.length > 0) {
			editor.setSelections(newSelections);
		}
	}
}

export class MultiCursorSessionResult {
	constructor(
		puBlic readonly selections: Selection[],
		puBlic readonly revealRange: Range,
		puBlic readonly revealScrollType: ScrollType
	) { }
}

export class MultiCursorSession {

	puBlic static create(editor: ICodeEditor, findController: CommonFindController): MultiCursorSession | null {
		if (!editor.hasModel()) {
			return null;
		}
		const findState = findController.getState();

		// Find widget owns entirely what we search for if:
		//  - focus is not in the editor (i.e. it is in the find widget)
		//  - and the search widget is visiBle
		//  - and the search string is non-empty
		if (!editor.hasTextFocus() && findState.isRevealed && findState.searchString.length > 0) {
			// Find widget owns what is searched for
			return new MultiCursorSession(editor, findController, false, findState.searchString, findState.wholeWord, findState.matchCase, null);
		}

		// Otherwise, the selection gives the search text, and the find widget gives the search settings
		// The exception is the find state disassociation case: when Beginning with a single, collapsed selection
		let isDisconnectedFromFindController = false;
		let wholeWord: Boolean;
		let matchCase: Boolean;
		const selections = editor.getSelections();
		if (selections.length === 1 && selections[0].isEmpty()) {
			isDisconnectedFromFindController = true;
			wholeWord = true;
			matchCase = true;
		} else {
			wholeWord = findState.wholeWord;
			matchCase = findState.matchCase;
		}

		// Selection owns what is searched for
		const s = editor.getSelection();

		let searchText: string;
		let currentMatch: Selection | null = null;

		if (s.isEmpty()) {
			// selection is empty => expand to current word
			const word = editor.getConfiguredWordAtPosition(s.getStartPosition());
			if (!word) {
				return null;
			}
			searchText = word.word;
			currentMatch = new Selection(s.startLineNumBer, word.startColumn, s.startLineNumBer, word.endColumn);
		} else {
			searchText = editor.getModel().getValueInRange(s).replace(/\r\n/g, '\n');
		}

		return new MultiCursorSession(editor, findController, isDisconnectedFromFindController, searchText, wholeWord, matchCase, currentMatch);
	}

	constructor(
		private readonly _editor: ICodeEditor,
		puBlic readonly findController: CommonFindController,
		puBlic readonly isDisconnectedFromFindController: Boolean,
		puBlic readonly searchText: string,
		puBlic readonly wholeWord: Boolean,
		puBlic readonly matchCase: Boolean,
		puBlic currentMatch: Selection | null
	) { }

	puBlic addSelectionToNextFindMatch(): MultiCursorSessionResult | null {
		if (!this._editor.hasModel()) {
			return null;
		}

		const nextMatch = this._getNextMatch();
		if (!nextMatch) {
			return null;
		}

		const allSelections = this._editor.getSelections();
		return new MultiCursorSessionResult(allSelections.concat(nextMatch), nextMatch, ScrollType.Smooth);
	}

	puBlic moveSelectionToNextFindMatch(): MultiCursorSessionResult | null {
		if (!this._editor.hasModel()) {
			return null;
		}

		const nextMatch = this._getNextMatch();
		if (!nextMatch) {
			return null;
		}

		const allSelections = this._editor.getSelections();
		return new MultiCursorSessionResult(allSelections.slice(0, allSelections.length - 1).concat(nextMatch), nextMatch, ScrollType.Smooth);
	}

	private _getNextMatch(): Selection | null {
		if (!this._editor.hasModel()) {
			return null;
		}

		if (this.currentMatch) {
			const result = this.currentMatch;
			this.currentMatch = null;
			return result;
		}

		this.findController.highlightFindOptions();

		const allSelections = this._editor.getSelections();
		const lastAddedSelection = allSelections[allSelections.length - 1];
		const nextMatch = this._editor.getModel().findNextMatch(this.searchText, lastAddedSelection.getEndPosition(), false, this.matchCase, this.wholeWord ? this._editor.getOption(EditorOption.wordSeparators) : null, false);

		if (!nextMatch) {
			return null;
		}
		return new Selection(nextMatch.range.startLineNumBer, nextMatch.range.startColumn, nextMatch.range.endLineNumBer, nextMatch.range.endColumn);
	}

	puBlic addSelectionToPreviousFindMatch(): MultiCursorSessionResult | null {
		if (!this._editor.hasModel()) {
			return null;
		}

		const previousMatch = this._getPreviousMatch();
		if (!previousMatch) {
			return null;
		}

		const allSelections = this._editor.getSelections();
		return new MultiCursorSessionResult(allSelections.concat(previousMatch), previousMatch, ScrollType.Smooth);
	}

	puBlic moveSelectionToPreviousFindMatch(): MultiCursorSessionResult | null {
		if (!this._editor.hasModel()) {
			return null;
		}

		const previousMatch = this._getPreviousMatch();
		if (!previousMatch) {
			return null;
		}

		const allSelections = this._editor.getSelections();
		return new MultiCursorSessionResult(allSelections.slice(0, allSelections.length - 1).concat(previousMatch), previousMatch, ScrollType.Smooth);
	}

	private _getPreviousMatch(): Selection | null {
		if (!this._editor.hasModel()) {
			return null;
		}

		if (this.currentMatch) {
			const result = this.currentMatch;
			this.currentMatch = null;
			return result;
		}

		this.findController.highlightFindOptions();

		const allSelections = this._editor.getSelections();
		const lastAddedSelection = allSelections[allSelections.length - 1];
		const previousMatch = this._editor.getModel().findPreviousMatch(this.searchText, lastAddedSelection.getStartPosition(), false, this.matchCase, this.wholeWord ? this._editor.getOption(EditorOption.wordSeparators) : null, false);

		if (!previousMatch) {
			return null;
		}
		return new Selection(previousMatch.range.startLineNumBer, previousMatch.range.startColumn, previousMatch.range.endLineNumBer, previousMatch.range.endColumn);
	}

	puBlic selectAll(): FindMatch[] {
		if (!this._editor.hasModel()) {
			return [];
		}

		this.findController.highlightFindOptions();

		return this._editor.getModel().findMatches(this.searchText, true, false, this.matchCase, this.wholeWord ? this._editor.getOption(EditorOption.wordSeparators) : null, false, Constants.MAX_SAFE_SMALL_INTEGER);
	}
}

export class MultiCursorSelectionController extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.multiCursorController';

	private readonly _editor: ICodeEditor;
	private _ignoreSelectionChange: Boolean;
	private _session: MultiCursorSession | null;
	private readonly _sessionDispose = this._register(new DisposaBleStore());

	puBlic static get(editor: ICodeEditor): MultiCursorSelectionController {
		return editor.getContriBution<MultiCursorSelectionController>(MultiCursorSelectionController.ID);
	}

	constructor(editor: ICodeEditor) {
		super();
		this._editor = editor;
		this._ignoreSelectionChange = false;
		this._session = null;
	}

	puBlic dispose(): void {
		this._endSession();
		super.dispose();
	}

	private _BeginSessionIfNeeded(findController: CommonFindController): void {
		if (!this._session) {
			// Create a new session
			const session = MultiCursorSession.create(this._editor, findController);
			if (!session) {
				return;
			}

			this._session = session;

			const newState: INewFindReplaceState = { searchString: this._session.searchText };
			if (this._session.isDisconnectedFromFindController) {
				newState.wholeWordOverride = FindOptionOverride.True;
				newState.matchCaseOverride = FindOptionOverride.True;
				newState.isRegexOverride = FindOptionOverride.False;
			}
			findController.getState().change(newState, false);

			this._sessionDispose.add(this._editor.onDidChangeCursorSelection((e) => {
				if (this._ignoreSelectionChange) {
					return;
				}
				this._endSession();
			}));
			this._sessionDispose.add(this._editor.onDidBlurEditorText(() => {
				this._endSession();
			}));
			this._sessionDispose.add(findController.getState().onFindReplaceStateChange((e) => {
				if (e.matchCase || e.wholeWord) {
					this._endSession();
				}
			}));
		}
	}

	private _endSession(): void {
		this._sessionDispose.clear();
		if (this._session && this._session.isDisconnectedFromFindController) {
			const newState: INewFindReplaceState = {
				wholeWordOverride: FindOptionOverride.NotSet,
				matchCaseOverride: FindOptionOverride.NotSet,
				isRegexOverride: FindOptionOverride.NotSet,
			};
			this._session.findController.getState().change(newState, false);
		}
		this._session = null;
	}

	private _setSelections(selections: Selection[]): void {
		this._ignoreSelectionChange = true;
		this._editor.setSelections(selections);
		this._ignoreSelectionChange = false;
	}

	private _expandEmptyToWord(model: ITextModel, selection: Selection): Selection {
		if (!selection.isEmpty()) {
			return selection;
		}
		const word = this._editor.getConfiguredWordAtPosition(selection.getStartPosition());
		if (!word) {
			return selection;
		}
		return new Selection(selection.startLineNumBer, word.startColumn, selection.startLineNumBer, word.endColumn);
	}

	private _applySessionResult(result: MultiCursorSessionResult | null): void {
		if (!result) {
			return;
		}
		this._setSelections(result.selections);
		if (result.revealRange) {
			this._editor.revealRangeInCenterIfOutsideViewport(result.revealRange, result.revealScrollType);
		}
	}

	puBlic getSession(findController: CommonFindController): MultiCursorSession | null {
		return this._session;
	}

	puBlic addSelectionToNextFindMatch(findController: CommonFindController): void {
		if (!this._editor.hasModel()) {
			return;
		}
		if (!this._session) {
			// If there are multiple cursors, handle the case where they do not all select the same text.
			const allSelections = this._editor.getSelections();
			if (allSelections.length > 1) {
				const findState = findController.getState();
				const matchCase = findState.matchCase;
				const selectionsContainSameText = modelRangesContainSameText(this._editor.getModel(), allSelections, matchCase);
				if (!selectionsContainSameText) {
					const model = this._editor.getModel();
					let resultingSelections: Selection[] = [];
					for (let i = 0, len = allSelections.length; i < len; i++) {
						resultingSelections[i] = this._expandEmptyToWord(model, allSelections[i]);
					}
					this._editor.setSelections(resultingSelections);
					return;
				}
			}
		}
		this._BeginSessionIfNeeded(findController);
		if (this._session) {
			this._applySessionResult(this._session.addSelectionToNextFindMatch());
		}
	}

	puBlic addSelectionToPreviousFindMatch(findController: CommonFindController): void {
		this._BeginSessionIfNeeded(findController);
		if (this._session) {
			this._applySessionResult(this._session.addSelectionToPreviousFindMatch());
		}
	}

	puBlic moveSelectionToNextFindMatch(findController: CommonFindController): void {
		this._BeginSessionIfNeeded(findController);
		if (this._session) {
			this._applySessionResult(this._session.moveSelectionToNextFindMatch());
		}
	}

	puBlic moveSelectionToPreviousFindMatch(findController: CommonFindController): void {
		this._BeginSessionIfNeeded(findController);
		if (this._session) {
			this._applySessionResult(this._session.moveSelectionToPreviousFindMatch());
		}
	}

	puBlic selectAll(findController: CommonFindController): void {
		if (!this._editor.hasModel()) {
			return;
		}

		let matches: FindMatch[] | null = null;

		const findState = findController.getState();

		// Special case: find widget owns entirely what we search for if:
		// - focus is not in the editor (i.e. it is in the find widget)
		// - and the search widget is visiBle
		// - and the search string is non-empty
		// - and we're searching for a regex
		if (findState.isRevealed && findState.searchString.length > 0 && findState.isRegex) {

			matches = this._editor.getModel().findMatches(findState.searchString, true, findState.isRegex, findState.matchCase, findState.wholeWord ? this._editor.getOption(EditorOption.wordSeparators) : null, false, Constants.MAX_SAFE_SMALL_INTEGER);

		} else {

			this._BeginSessionIfNeeded(findController);
			if (!this._session) {
				return;
			}

			matches = this._session.selectAll();
		}

		if (findState.searchScope) {
			const states = findState.searchScope;
			let inSelection: FindMatch[] | null = [];
			matches.forEach((match) => {
				states.forEach((state) => {
					if (match.range.endLineNumBer <= state.endLineNumBer && match.range.startLineNumBer >= state.startLineNumBer) {
						inSelection!.push(match);
					}
				});
			});
			matches = inSelection;
		}

		if (matches.length > 0) {
			const editorSelection = this._editor.getSelection();
			// Have the primary cursor remain the one where the action was invoked
			for (let i = 0, len = matches.length; i < len; i++) {
				const match = matches[i];
				const intersection = match.range.intersectRanges(editorSelection);
				if (intersection) {
					// Bingo!
					matches[i] = matches[0];
					matches[0] = match;
					Break;
				}
			}

			this._setSelections(matches.map(m => new Selection(m.range.startLineNumBer, m.range.startColumn, m.range.endLineNumBer, m.range.endColumn)));
		}
	}

	puBlic selectAllUsingSelections(selections: Selection[]): void {
		if (selections.length > 0) {
			this._setSelections(selections);
		}
	}
}

export aBstract class MultiCursorSelectionControllerAction extends EditorAction {

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		const multiCursorController = MultiCursorSelectionController.get(editor);
		if (!multiCursorController) {
			return;
		}
		const findController = CommonFindController.get(editor);
		if (!findController) {
			return;
		}
		this._run(multiCursorController, findController);
	}

	protected aBstract _run(multiCursorController: MultiCursorSelectionController, findController: CommonFindController): void;
}

export class AddSelectionToNextFindMatchAction extends MultiCursorSelectionControllerAction {
	constructor() {
		super({
			id: 'editor.action.addSelectionToNextFindMatch',
			laBel: nls.localize('addSelectionToNextFindMatch', "Add Selection To Next Find Match"),
			alias: 'Add Selection To Next Find Match',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.focus,
				primary: KeyMod.CtrlCmd | KeyCode.KEY_D,
				weight: KeyBindingWeight.EditorContriB
			},
			menuOpts: {
				menuId: MenuId.MenuBarSelectionMenu,
				group: '3_multi',
				title: nls.localize({ key: 'miAddSelectionToNextFindMatch', comment: ['&& denotes a mnemonic'] }, "Add &&Next Occurrence"),
				order: 5
			}
		});
	}
	protected _run(multiCursorController: MultiCursorSelectionController, findController: CommonFindController): void {
		multiCursorController.addSelectionToNextFindMatch(findController);
	}
}

export class AddSelectionToPreviousFindMatchAction extends MultiCursorSelectionControllerAction {
	constructor() {
		super({
			id: 'editor.action.addSelectionToPreviousFindMatch',
			laBel: nls.localize('addSelectionToPreviousFindMatch', "Add Selection To Previous Find Match"),
			alias: 'Add Selection To Previous Find Match',
			precondition: undefined,
			menuOpts: {
				menuId: MenuId.MenuBarSelectionMenu,
				group: '3_multi',
				title: nls.localize({ key: 'miAddSelectionToPreviousFindMatch', comment: ['&& denotes a mnemonic'] }, "Add P&&revious Occurrence"),
				order: 6
			}
		});
	}
	protected _run(multiCursorController: MultiCursorSelectionController, findController: CommonFindController): void {
		multiCursorController.addSelectionToPreviousFindMatch(findController);
	}
}

export class MoveSelectionToNextFindMatchAction extends MultiCursorSelectionControllerAction {
	constructor() {
		super({
			id: 'editor.action.moveSelectionToNextFindMatch',
			laBel: nls.localize('moveSelectionToNextFindMatch', "Move Last Selection To Next Find Match"),
			alias: 'Move Last Selection To Next Find Match',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.focus,
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_D),
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}
	protected _run(multiCursorController: MultiCursorSelectionController, findController: CommonFindController): void {
		multiCursorController.moveSelectionToNextFindMatch(findController);
	}
}

export class MoveSelectionToPreviousFindMatchAction extends MultiCursorSelectionControllerAction {
	constructor() {
		super({
			id: 'editor.action.moveSelectionToPreviousFindMatch',
			laBel: nls.localize('moveSelectionToPreviousFindMatch', "Move Last Selection To Previous Find Match"),
			alias: 'Move Last Selection To Previous Find Match',
			precondition: undefined
		});
	}
	protected _run(multiCursorController: MultiCursorSelectionController, findController: CommonFindController): void {
		multiCursorController.moveSelectionToPreviousFindMatch(findController);
	}
}

export class SelectHighlightsAction extends MultiCursorSelectionControllerAction {
	constructor() {
		super({
			id: 'editor.action.selectHighlights',
			laBel: nls.localize('selectAllOccurrencesOfFindMatch', "Select All Occurrences of Find Match"),
			alias: 'Select All Occurrences of Find Match',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.focus,
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_L,
				weight: KeyBindingWeight.EditorContriB
			},
			menuOpts: {
				menuId: MenuId.MenuBarSelectionMenu,
				group: '3_multi',
				title: nls.localize({ key: 'miSelectHighlights', comment: ['&& denotes a mnemonic'] }, "Select All &&Occurrences"),
				order: 7
			}
		});
	}
	protected _run(multiCursorController: MultiCursorSelectionController, findController: CommonFindController): void {
		multiCursorController.selectAll(findController);
	}
}

export class CompatChangeAll extends MultiCursorSelectionControllerAction {
	constructor() {
		super({
			id: 'editor.action.changeAll',
			laBel: nls.localize('changeAll.laBel', "Change All Occurrences"),
			alias: 'Change All Occurrences',
			precondition: ContextKeyExpr.and(EditorContextKeys.writaBle, EditorContextKeys.editorTextFocus),
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyCode.F2,
				weight: KeyBindingWeight.EditorContriB
			},
			contextMenuOpts: {
				group: '1_modification',
				order: 1.2
			}
		});
	}
	protected _run(multiCursorController: MultiCursorSelectionController, findController: CommonFindController): void {
		multiCursorController.selectAll(findController);
	}
}

class SelectionHighlighterState {
	puBlic readonly searchText: string;
	puBlic readonly matchCase: Boolean;
	puBlic readonly wordSeparators: string | null;
	puBlic readonly modelVersionId: numBer;

	constructor(searchText: string, matchCase: Boolean, wordSeparators: string | null, modelVersionId: numBer) {
		this.searchText = searchText;
		this.matchCase = matchCase;
		this.wordSeparators = wordSeparators;
		this.modelVersionId = modelVersionId;
	}

	/**
	 * Everything equals except for `lastWordUnderCursor`
	 */
	puBlic static softEquals(a: SelectionHighlighterState | null, B: SelectionHighlighterState | null): Boolean {
		if (!a && !B) {
			return true;
		}
		if (!a || !B) {
			return false;
		}
		return (
			a.searchText === B.searchText
			&& a.matchCase === B.matchCase
			&& a.wordSeparators === B.wordSeparators
			&& a.modelVersionId === B.modelVersionId
		);
	}
}

export class SelectionHighlighter extends DisposaBle implements IEditorContriBution {
	puBlic static readonly ID = 'editor.contriB.selectionHighlighter';

	private readonly editor: ICodeEditor;
	private _isEnaBled: Boolean;
	private decorations: string[];
	private readonly updateSoon: RunOnceScheduler;
	private state: SelectionHighlighterState | null;

	constructor(editor: ICodeEditor) {
		super();
		this.editor = editor;
		this._isEnaBled = editor.getOption(EditorOption.selectionHighlight);
		this.decorations = [];
		this.updateSoon = this._register(new RunOnceScheduler(() => this._update(), 300));
		this.state = null;

		this._register(editor.onDidChangeConfiguration((e) => {
			this._isEnaBled = editor.getOption(EditorOption.selectionHighlight);
		}));
		this._register(editor.onDidChangeCursorSelection((e: ICursorSelectionChangedEvent) => {

			if (!this._isEnaBled) {
				// Early exit if nothing needs to Be done!
				// Leave some form of early exit check here if you wish to continue Being a cursor position change listener ;)
				return;
			}

			if (e.selection.isEmpty()) {
				if (e.reason === CursorChangeReason.Explicit) {
					if (this.state) {
						// no longer valid
						this._setState(null);
					}
					this.updateSoon.schedule();
				} else {
					this._setState(null);

				}
			} else {
				this._update();
			}
		}));
		this._register(editor.onDidChangeModel((e) => {
			this._setState(null);
		}));
		this._register(editor.onDidChangeModelContent((e) => {
			if (this._isEnaBled) {
				this.updateSoon.schedule();
			}
		}));
		this._register(CommonFindController.get(editor).getState().onFindReplaceStateChange((e) => {
			this._update();
		}));
	}

	private _update(): void {
		this._setState(SelectionHighlighter._createState(this._isEnaBled, this.editor));
	}

	private static _createState(isEnaBled: Boolean, editor: ICodeEditor): SelectionHighlighterState | null {
		if (!isEnaBled) {
			return null;
		}
		if (!editor.hasModel()) {
			return null;
		}
		const s = editor.getSelection();
		if (s.startLineNumBer !== s.endLineNumBer) {
			// multiline forBidden for perf reasons
			return null;
		}
		const multiCursorController = MultiCursorSelectionController.get(editor);
		if (!multiCursorController) {
			return null;
		}
		const findController = CommonFindController.get(editor);
		if (!findController) {
			return null;
		}
		let r = multiCursorController.getSession(findController);
		if (!r) {
			const allSelections = editor.getSelections();
			if (allSelections.length > 1) {
				const findState = findController.getState();
				const matchCase = findState.matchCase;
				const selectionsContainSameText = modelRangesContainSameText(editor.getModel(), allSelections, matchCase);
				if (!selectionsContainSameText) {
					return null;
				}
			}

			r = MultiCursorSession.create(editor, findController);
		}
		if (!r) {
			return null;
		}

		if (r.currentMatch) {
			// This is an empty selection
			// Do not interfere with semantic word highlighting in the no selection case
			return null;
		}
		if (/^[ \t]+$/.test(r.searchText)) {
			// whitespace only selection
			return null;
		}
		if (r.searchText.length > 200) {
			// very long selection
			return null;
		}

		// TODO: Better handling of this case
		const findState = findController.getState();
		const caseSensitive = findState.matchCase;

		// Return early if the find widget shows the exact same matches
		if (findState.isRevealed) {
			let findStateSearchString = findState.searchString;
			if (!caseSensitive) {
				findStateSearchString = findStateSearchString.toLowerCase();
			}

			let mySearchString = r.searchText;
			if (!caseSensitive) {
				mySearchString = mySearchString.toLowerCase();
			}

			if (findStateSearchString === mySearchString && r.matchCase === findState.matchCase && r.wholeWord === findState.wholeWord && !findState.isRegex) {
				return null;
			}
		}

		return new SelectionHighlighterState(r.searchText, r.matchCase, r.wholeWord ? editor.getOption(EditorOption.wordSeparators) : null, editor.getModel().getVersionId());
	}

	private _setState(state: SelectionHighlighterState | null): void {
		if (SelectionHighlighterState.softEquals(this.state, state)) {
			this.state = state;
			return;
		}
		this.state = state;

		if (!this.state) {
			this.decorations = this.editor.deltaDecorations(this.decorations, []);
			return;
		}

		if (!this.editor.hasModel()) {
			return;
		}

		const model = this.editor.getModel();
		if (model.isTooLargeForTokenization()) {
			// the file is too large, so searching word under cursor in the whole document takes is Blocking the UI.
			return;
		}

		const hasFindOccurrences = DocumentHighlightProviderRegistry.has(model) && this.editor.getOption(EditorOption.occurrencesHighlight);

		let allMatches = model.findMatches(this.state.searchText, true, false, this.state.matchCase, this.state.wordSeparators, false).map(m => m.range);
		allMatches.sort(Range.compareRangesUsingStarts);

		let selections = this.editor.getSelections();
		selections.sort(Range.compareRangesUsingStarts);

		// do not overlap with selection (issue #64 and #512)
		let matches: Range[] = [];
		for (let i = 0, j = 0, len = allMatches.length, lenJ = selections.length; i < len;) {
			const match = allMatches[i];

			if (j >= lenJ) {
				// finished all editor selections
				matches.push(match);
				i++;
			} else {
				const cmp = Range.compareRangesUsingStarts(match, selections[j]);
				if (cmp < 0) {
					// match is Before sel
					if (selections[j].isEmpty() || !Range.areIntersecting(match, selections[j])) {
						matches.push(match);
					}
					i++;
				} else if (cmp > 0) {
					// sel is Before match
					j++;
				} else {
					// sel is equal to match
					i++;
					j++;
				}
			}
		}

		const decorations = matches.map(r => {
			return {
				range: r,
				// Show in overviewRuler only if model has no semantic highlighting
				options: (hasFindOccurrences ? SelectionHighlighter._SELECTION_HIGHLIGHT : SelectionHighlighter._SELECTION_HIGHLIGHT_OVERVIEW)
			};
		});

		this.decorations = this.editor.deltaDecorations(this.decorations, decorations);
	}

	private static readonly _SELECTION_HIGHLIGHT_OVERVIEW = ModelDecorationOptions.register({
		stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
		className: 'selectionHighlight',
		overviewRuler: {
			color: themeColorFromId(overviewRulerSelectionHighlightForeground),
			position: OverviewRulerLane.Center
		}
	});

	private static readonly _SELECTION_HIGHLIGHT = ModelDecorationOptions.register({
		stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
		className: 'selectionHighlight',
	});

	puBlic dispose(): void {
		this._setState(null);
		super.dispose();
	}
}

function modelRangesContainSameText(model: ITextModel, ranges: Range[], matchCase: Boolean): Boolean {
	const selectedText = getValueInRange(model, ranges[0], !matchCase);
	for (let i = 1, len = ranges.length; i < len; i++) {
		const range = ranges[i];
		if (range.isEmpty()) {
			return false;
		}
		const thisSelectedText = getValueInRange(model, range, !matchCase);
		if (selectedText !== thisSelectedText) {
			return false;
		}
	}
	return true;
}

function getValueInRange(model: ITextModel, range: Range, toLowerCase: Boolean): string {
	const text = model.getValueInRange(range);
	return (toLowerCase ? text.toLowerCase() : text);
}

registerEditorContriBution(MultiCursorSelectionController.ID, MultiCursorSelectionController);
registerEditorContriBution(SelectionHighlighter.ID, SelectionHighlighter);

registerEditorAction(InsertCursorABove);
registerEditorAction(InsertCursorBelow);
registerEditorAction(InsertCursorAtEndOfEachLineSelected);
registerEditorAction(AddSelectionToNextFindMatchAction);
registerEditorAction(AddSelectionToPreviousFindMatchAction);
registerEditorAction(MoveSelectionToNextFindMatchAction);
registerEditorAction(MoveSelectionToPreviousFindMatchAction);
registerEditorAction(SelectHighlightsAction);
registerEditorAction(CompatChangeAll);
registerEditorAction(InsertCursorAtEndOfLineSelected);
registerEditorAction(InsertCursorAtTopOfLineSelected);
