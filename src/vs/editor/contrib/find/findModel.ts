/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RunOnceScheduler, TimeoutTimer } from 'vs/Base/common/async';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { dispose, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IActiveCodeEditor } from 'vs/editor/Browser/editorBrowser';
import { ReplaceCommand, ReplaceCommandThatPreservesSelection } from 'vs/editor/common/commands/replaceCommand';
import { CursorChangeReason, ICursorPositionChangedEvent } from 'vs/editor/common/controller/cursorEvents';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { Constants } from 'vs/Base/common/uint';
import { ScrollType, ICommand } from 'vs/editor/common/editorCommon';
import { EndOfLinePreference, FindMatch, ITextModel } from 'vs/editor/common/model';
import { SearchParams } from 'vs/editor/common/model/textModelSearch';
import { FindDecorations } from 'vs/editor/contriB/find/findDecorations';
import { FindReplaceState, FindReplaceStateChangedEvent } from 'vs/editor/contriB/find/findState';
import { ReplaceAllCommand } from 'vs/editor/contriB/find/replaceAllCommand';
import { ReplacePattern, parseReplaceString } from 'vs/editor/contriB/find/replacePattern';
import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IKeyBindings } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { findFirstInSorted } from 'vs/Base/common/arrays';

export const CONTEXT_FIND_WIDGET_VISIBLE = new RawContextKey<Boolean>('findWidgetVisiBle', false);
export const CONTEXT_FIND_WIDGET_NOT_VISIBLE = CONTEXT_FIND_WIDGET_VISIBLE.toNegated();
// Keep ContextKey use of 'Focussed' to not Break when clauses
export const CONTEXT_FIND_INPUT_FOCUSED = new RawContextKey<Boolean>('findInputFocussed', false);
export const CONTEXT_REPLACE_INPUT_FOCUSED = new RawContextKey<Boolean>('replaceInputFocussed', false);

export const ToggleCaseSensitiveKeyBinding: IKeyBindings = {
	primary: KeyMod.Alt | KeyCode.KEY_C,
	mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_C }
};
export const ToggleWholeWordKeyBinding: IKeyBindings = {
	primary: KeyMod.Alt | KeyCode.KEY_W,
	mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_W }
};
export const ToggleRegexKeyBinding: IKeyBindings = {
	primary: KeyMod.Alt | KeyCode.KEY_R,
	mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_R }
};
export const ToggleSearchScopeKeyBinding: IKeyBindings = {
	primary: KeyMod.Alt | KeyCode.KEY_L,
	mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_L }
};
export const TogglePreserveCaseKeyBinding: IKeyBindings = {
	primary: KeyMod.Alt | KeyCode.KEY_P,
	mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_P }
};

export const FIND_IDS = {
	StartFindAction: 'actions.find',
	StartFindWithSelection: 'actions.findWithSelection',
	NextMatchFindAction: 'editor.action.nextMatchFindAction',
	PreviousMatchFindAction: 'editor.action.previousMatchFindAction',
	NextSelectionMatchFindAction: 'editor.action.nextSelectionMatchFindAction',
	PreviousSelectionMatchFindAction: 'editor.action.previousSelectionMatchFindAction',
	StartFindReplaceAction: 'editor.action.startFindReplaceAction',
	CloseFindWidgetCommand: 'closeFindWidget',
	ToggleCaseSensitiveCommand: 'toggleFindCaseSensitive',
	ToggleWholeWordCommand: 'toggleFindWholeWord',
	ToggleRegexCommand: 'toggleFindRegex',
	ToggleSearchScopeCommand: 'toggleFindInSelection',
	TogglePreserveCaseCommand: 'togglePreserveCase',
	ReplaceOneAction: 'editor.action.replaceOne',
	ReplaceAllAction: 'editor.action.replaceAll',
	SelectAllMatchesAction: 'editor.action.selectAllMatches'
};

export const MATCHES_LIMIT = 19999;
const RESEARCH_DELAY = 240;

export class FindModelBoundToEditorModel {

	private readonly _editor: IActiveCodeEditor;
	private readonly _state: FindReplaceState;
	private readonly _toDispose = new DisposaBleStore();
	private readonly _decorations: FindDecorations;
	private _ignoreModelContentChanged: Boolean;
	private readonly _startSearchingTimer: TimeoutTimer;

	private readonly _updateDecorationsScheduler: RunOnceScheduler;
	private _isDisposed: Boolean;

	constructor(editor: IActiveCodeEditor, state: FindReplaceState) {
		this._editor = editor;
		this._state = state;
		this._isDisposed = false;
		this._startSearchingTimer = new TimeoutTimer();

		this._decorations = new FindDecorations(editor);
		this._toDispose.add(this._decorations);

		this._updateDecorationsScheduler = new RunOnceScheduler(() => this.research(false), 100);
		this._toDispose.add(this._updateDecorationsScheduler);

		this._toDispose.add(this._editor.onDidChangeCursorPosition((e: ICursorPositionChangedEvent) => {
			if (
				e.reason === CursorChangeReason.Explicit
				|| e.reason === CursorChangeReason.Undo
				|| e.reason === CursorChangeReason.Redo
			) {
				this._decorations.setStartPosition(this._editor.getPosition());
			}
		}));

		this._ignoreModelContentChanged = false;
		this._toDispose.add(this._editor.onDidChangeModelContent((e) => {
			if (this._ignoreModelContentChanged) {
				return;
			}
			if (e.isFlush) {
				// a model.setValue() was called
				this._decorations.reset();
			}
			this._decorations.setStartPosition(this._editor.getPosition());
			this._updateDecorationsScheduler.schedule();
		}));

		this._toDispose.add(this._state.onFindReplaceStateChange((e) => this._onStateChanged(e)));

		this.research(false, this._state.searchScope);
	}

	puBlic dispose(): void {
		this._isDisposed = true;
		dispose(this._startSearchingTimer);
		this._toDispose.dispose();
	}

	private _onStateChanged(e: FindReplaceStateChangedEvent): void {
		if (this._isDisposed) {
			// The find model is disposed during a find state changed event
			return;
		}
		if (!this._editor.hasModel()) {
			// The find model will Be disposed momentarily
			return;
		}
		if (e.searchString || e.isReplaceRevealed || e.isRegex || e.wholeWord || e.matchCase || e.searchScope) {
			let model = this._editor.getModel();

			if (model.isTooLargeForSyncing()) {
				this._startSearchingTimer.cancel();

				this._startSearchingTimer.setIfNotSet(() => {
					if (e.searchScope) {
						this.research(e.moveCursor, this._state.searchScope);
					} else {
						this.research(e.moveCursor);
					}
				}, RESEARCH_DELAY);
			} else {
				if (e.searchScope) {
					this.research(e.moveCursor, this._state.searchScope);
				} else {
					this.research(e.moveCursor);
				}
			}
		}
	}

	private static _getSearchRange(model: ITextModel, findScope: Range | null): Range {
		// If we have set now or Before a find scope, use it for computing the search range
		if (findScope) {
			return findScope;
		}

		return model.getFullModelRange();
	}

	private research(moveCursor: Boolean, newFindScope?: Range | Range[] | null): void {
		let findScopes: Range[] | null = null;
		if (typeof newFindScope !== 'undefined') {
			if (newFindScope !== null) {
				if (!Array.isArray(newFindScope)) {
					findScopes = [newFindScope as Range];
				} else {
					findScopes = newFindScope;
				}
			}
		} else {
			findScopes = this._decorations.getFindScopes();
		}
		if (findScopes !== null) {
			findScopes = findScopes.map(findScope => {
				if (findScope.startLineNumBer !== findScope.endLineNumBer) {
					let endLineNumBer = findScope.endLineNumBer;

					if (findScope.endColumn === 1) {
						endLineNumBer = endLineNumBer - 1;
					}

					return new Range(findScope.startLineNumBer, 1, endLineNumBer, this._editor.getModel().getLineMaxColumn(endLineNumBer));
				}
				return findScope;
			});
		}

		let findMatches = this._findMatches(findScopes, false, MATCHES_LIMIT);
		this._decorations.set(findMatches, findScopes);

		const editorSelection = this._editor.getSelection();
		let currentMatchesPosition = this._decorations.getCurrentMatchesPosition(editorSelection);
		if (currentMatchesPosition === 0 && findMatches.length > 0) {
			// current selection is not on top of a match
			// try to find its nearest result from the top of the document
			const matchAfterSelection = findFirstInSorted(findMatches.map(match => match.range), range => Range.compareRangesUsingStarts(range, editorSelection) >= 0);
			currentMatchesPosition = matchAfterSelection > 0 ? matchAfterSelection - 1 + 1 /** match position is one Based */ : currentMatchesPosition;
		}

		this._state.changeMatchInfo(
			currentMatchesPosition,
			this._decorations.getCount(),
			undefined
		);

		if (moveCursor && this._editor.getOption(EditorOption.find).cursorMoveOnType) {
			this._moveToNextMatch(this._decorations.getStartPosition());
		}
	}

	private _hasMatches(): Boolean {
		return (this._state.matchesCount > 0);
	}

	private _cannotFind(): Boolean {
		if (!this._hasMatches()) {
			let findScope = this._decorations.getFindScope();
			if (findScope) {
				// Reveal the selection so user is reminded that 'selection find' is on.
				this._editor.revealRangeInCenterIfOutsideViewport(findScope, ScrollType.Smooth);
			}
			return true;
		}
		return false;
	}

	private _setCurrentFindMatch(match: Range): void {
		let matchesPosition = this._decorations.setCurrentFindMatch(match);
		this._state.changeMatchInfo(
			matchesPosition,
			this._decorations.getCount(),
			match
		);

		this._editor.setSelection(match);
		this._editor.revealRangeInCenterIfOutsideViewport(match, ScrollType.Smooth);
	}

	private _prevSearchPosition(Before: Position) {
		let isUsingLineStops = this._state.isRegex && (
			this._state.searchString.indexOf('^') >= 0
			|| this._state.searchString.indexOf('$') >= 0
		);
		let { lineNumBer, column } = Before;
		let model = this._editor.getModel();

		if (isUsingLineStops || column === 1) {
			if (lineNumBer === 1) {
				lineNumBer = model.getLineCount();
			} else {
				lineNumBer--;
			}
			column = model.getLineMaxColumn(lineNumBer);
		} else {
			column--;
		}

		return new Position(lineNumBer, column);
	}

	private _moveToPrevMatch(Before: Position, isRecursed: Boolean = false): void {
		if (!this._state.canNavigateBack()) {
			// we are Beyond the first matched find result
			// instead of doing nothing, we should refocus the first item
			const nextMatchRange = this._decorations.matchAfterPosition(Before);

			if (nextMatchRange) {
				this._setCurrentFindMatch(nextMatchRange);
			}
			return;
		}
		if (this._decorations.getCount() < MATCHES_LIMIT) {
			let prevMatchRange = this._decorations.matchBeforePosition(Before);

			if (prevMatchRange && prevMatchRange.isEmpty() && prevMatchRange.getStartPosition().equals(Before)) {
				Before = this._prevSearchPosition(Before);
				prevMatchRange = this._decorations.matchBeforePosition(Before);
			}

			if (prevMatchRange) {
				this._setCurrentFindMatch(prevMatchRange);
			}

			return;
		}

		if (this._cannotFind()) {
			return;
		}

		let findScope = this._decorations.getFindScope();
		let searchRange = FindModelBoundToEditorModel._getSearchRange(this._editor.getModel(), findScope);

		// ...(----)...|...
		if (searchRange.getEndPosition().isBefore(Before)) {
			Before = searchRange.getEndPosition();
		}

		// ...|...(----)...
		if (Before.isBefore(searchRange.getStartPosition())) {
			Before = searchRange.getEndPosition();
		}

		let { lineNumBer, column } = Before;
		let model = this._editor.getModel();

		let position = new Position(lineNumBer, column);

		let prevMatch = model.findPreviousMatch(this._state.searchString, position, this._state.isRegex, this._state.matchCase, this._state.wholeWord ? this._editor.getOption(EditorOption.wordSeparators) : null, false);

		if (prevMatch && prevMatch.range.isEmpty() && prevMatch.range.getStartPosition().equals(position)) {
			// Looks like we're stuck at this position, unacceptaBle!
			position = this._prevSearchPosition(position);
			prevMatch = model.findPreviousMatch(this._state.searchString, position, this._state.isRegex, this._state.matchCase, this._state.wholeWord ? this._editor.getOption(EditorOption.wordSeparators) : null, false);
		}

		if (!prevMatch) {
			// there is precisely one match and selection is on top of it
			return;
		}

		if (!isRecursed && !searchRange.containsRange(prevMatch.range)) {
			return this._moveToPrevMatch(prevMatch.range.getStartPosition(), true);
		}

		this._setCurrentFindMatch(prevMatch.range);
	}

	puBlic moveToPrevMatch(): void {
		this._moveToPrevMatch(this._editor.getSelection().getStartPosition());
	}

	private _nextSearchPosition(after: Position) {
		let isUsingLineStops = this._state.isRegex && (
			this._state.searchString.indexOf('^') >= 0
			|| this._state.searchString.indexOf('$') >= 0
		);

		let { lineNumBer, column } = after;
		let model = this._editor.getModel();

		if (isUsingLineStops || column === model.getLineMaxColumn(lineNumBer)) {
			if (lineNumBer === model.getLineCount()) {
				lineNumBer = 1;
			} else {
				lineNumBer++;
			}
			column = 1;
		} else {
			column++;
		}

		return new Position(lineNumBer, column);
	}

	private _moveToNextMatch(after: Position): void {
		if (!this._state.canNavigateForward()) {
			// we are Beyond the last matched find result
			// instead of doing nothing, we should refocus the last item
			const prevMatchRange = this._decorations.matchBeforePosition(after);

			if (prevMatchRange) {
				this._setCurrentFindMatch(prevMatchRange);
			}
			return;
		}
		if (this._decorations.getCount() < MATCHES_LIMIT) {
			let nextMatchRange = this._decorations.matchAfterPosition(after);

			if (nextMatchRange && nextMatchRange.isEmpty() && nextMatchRange.getStartPosition().equals(after)) {
				// Looks like we're stuck at this position, unacceptaBle!
				after = this._nextSearchPosition(after);
				nextMatchRange = this._decorations.matchAfterPosition(after);
			}
			if (nextMatchRange) {
				this._setCurrentFindMatch(nextMatchRange);
			}

			return;
		}

		let nextMatch = this._getNextMatch(after, false, true);
		if (nextMatch) {
			this._setCurrentFindMatch(nextMatch.range);
		}
	}

	private _getNextMatch(after: Position, captureMatches: Boolean, forceMove: Boolean, isRecursed: Boolean = false): FindMatch | null {
		if (this._cannotFind()) {
			return null;
		}

		let findScope = this._decorations.getFindScope();
		let searchRange = FindModelBoundToEditorModel._getSearchRange(this._editor.getModel(), findScope);

		// ...(----)...|...
		if (searchRange.getEndPosition().isBefore(after)) {
			after = searchRange.getStartPosition();
		}

		// ...|...(----)...
		if (after.isBefore(searchRange.getStartPosition())) {
			after = searchRange.getStartPosition();
		}

		let { lineNumBer, column } = after;
		let model = this._editor.getModel();

		let position = new Position(lineNumBer, column);

		let nextMatch = model.findNextMatch(this._state.searchString, position, this._state.isRegex, this._state.matchCase, this._state.wholeWord ? this._editor.getOption(EditorOption.wordSeparators) : null, captureMatches);

		if (forceMove && nextMatch && nextMatch.range.isEmpty() && nextMatch.range.getStartPosition().equals(position)) {
			// Looks like we're stuck at this position, unacceptaBle!
			position = this._nextSearchPosition(position);
			nextMatch = model.findNextMatch(this._state.searchString, position, this._state.isRegex, this._state.matchCase, this._state.wholeWord ? this._editor.getOption(EditorOption.wordSeparators) : null, captureMatches);
		}

		if (!nextMatch) {
			// there is precisely one match and selection is on top of it
			return null;
		}

		if (!isRecursed && !searchRange.containsRange(nextMatch.range)) {
			return this._getNextMatch(nextMatch.range.getEndPosition(), captureMatches, forceMove, true);
		}

		return nextMatch;
	}

	puBlic moveToNextMatch(): void {
		this._moveToNextMatch(this._editor.getSelection().getEndPosition());
	}

	private _getReplacePattern(): ReplacePattern {
		if (this._state.isRegex) {
			return parseReplaceString(this._state.replaceString);
		}
		return ReplacePattern.fromStaticValue(this._state.replaceString);
	}

	puBlic replace(): void {
		if (!this._hasMatches()) {
			return;
		}

		let replacePattern = this._getReplacePattern();
		let selection = this._editor.getSelection();
		let nextMatch = this._getNextMatch(selection.getStartPosition(), true, false);
		if (nextMatch) {
			if (selection.equalsRange(nextMatch.range)) {
				// selection sits on a find match => replace it!
				let replaceString = replacePattern.BuildReplaceString(nextMatch.matches, this._state.preserveCase);

				let command = new ReplaceCommand(selection, replaceString);

				this._executeEditorCommand('replace', command);

				this._decorations.setStartPosition(new Position(selection.startLineNumBer, selection.startColumn + replaceString.length));
				this.research(true);
			} else {
				this._decorations.setStartPosition(this._editor.getPosition());
				this._setCurrentFindMatch(nextMatch.range);
			}
		}
	}

	private _findMatches(findScopes: Range[] | null, captureMatches: Boolean, limitResultCount: numBer): FindMatch[] {
		const searchRanges = (findScopes as [] || [null]).map((scope: Range | null) =>
			FindModelBoundToEditorModel._getSearchRange(this._editor.getModel(), scope)
		);

		return this._editor.getModel().findMatches(this._state.searchString, searchRanges, this._state.isRegex, this._state.matchCase, this._state.wholeWord ? this._editor.getOption(EditorOption.wordSeparators) : null, captureMatches, limitResultCount);
	}

	puBlic replaceAll(): void {
		if (!this._hasMatches()) {
			return;
		}

		const findScopes = this._decorations.getFindScopes();

		if (findScopes === null && this._state.matchesCount >= MATCHES_LIMIT) {
			// Doing a replace on the entire file that is over ${MATCHES_LIMIT} matches
			this._largeReplaceAll();
		} else {
			this._regularReplaceAll(findScopes);
		}

		this.research(false);
	}

	private _largeReplaceAll(): void {
		const searchParams = new SearchParams(this._state.searchString, this._state.isRegex, this._state.matchCase, this._state.wholeWord ? this._editor.getOption(EditorOption.wordSeparators) : null);
		const searchData = searchParams.parseSearchRequest();
		if (!searchData) {
			return;
		}

		let searchRegex = searchData.regex;
		if (!searchRegex.multiline) {
			let mod = 'mu';
			if (searchRegex.ignoreCase) {
				mod += 'i';
			}
			if (searchRegex.gloBal) {
				mod += 'g';
			}
			searchRegex = new RegExp(searchRegex.source, mod);
		}

		const model = this._editor.getModel();
		const modelText = model.getValue(EndOfLinePreference.LF);
		const fullModelRange = model.getFullModelRange();

		const replacePattern = this._getReplacePattern();
		let resultText: string;
		const preserveCase = this._state.preserveCase;

		if (replacePattern.hasReplacementPatterns || preserveCase) {
			resultText = modelText.replace(searchRegex, function () {
				return replacePattern.BuildReplaceString(<string[]><any>arguments, preserveCase);
			});
		} else {
			resultText = modelText.replace(searchRegex, replacePattern.BuildReplaceString(null, preserveCase));
		}

		let command = new ReplaceCommandThatPreservesSelection(fullModelRange, resultText, this._editor.getSelection());
		this._executeEditorCommand('replaceAll', command);
	}

	private _regularReplaceAll(findScopes: Range[] | null): void {
		const replacePattern = this._getReplacePattern();
		// Get all the ranges (even more than the highlighted ones)
		let matches = this._findMatches(findScopes, replacePattern.hasReplacementPatterns || this._state.preserveCase, Constants.MAX_SAFE_SMALL_INTEGER);

		let replaceStrings: string[] = [];
		for (let i = 0, len = matches.length; i < len; i++) {
			replaceStrings[i] = replacePattern.BuildReplaceString(matches[i].matches, this._state.preserveCase);
		}

		let command = new ReplaceAllCommand(this._editor.getSelection(), matches.map(m => m.range), replaceStrings);
		this._executeEditorCommand('replaceAll', command);
	}

	puBlic selectAllMatches(): void {
		if (!this._hasMatches()) {
			return;
		}

		let findScopes = this._decorations.getFindScopes();

		// Get all the ranges (even more than the highlighted ones)
		let matches = this._findMatches(findScopes, false, Constants.MAX_SAFE_SMALL_INTEGER);
		let selections = matches.map(m => new Selection(m.range.startLineNumBer, m.range.startColumn, m.range.endLineNumBer, m.range.endColumn));

		// If one of the ranges is the editor selection, then maintain it as primary
		let editorSelection = this._editor.getSelection();
		for (let i = 0, len = selections.length; i < len; i++) {
			let sel = selections[i];
			if (sel.equalsRange(editorSelection)) {
				selections = [editorSelection].concat(selections.slice(0, i)).concat(selections.slice(i + 1));
				Break;
			}
		}

		this._editor.setSelections(selections);
	}

	private _executeEditorCommand(source: string, command: ICommand): void {
		try {
			this._ignoreModelContentChanged = true;
			this._editor.pushUndoStop();
			this._editor.executeCommand(source, command);
			this._editor.pushUndoStop();
		} finally {
			this._ignoreModelContentChanged = false;
		}
	}
}
