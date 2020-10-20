/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RunOnceScheduler, TimeoutTimer } from 'vs/bAse/common/Async';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { dispose, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IActiveCodeEditor } from 'vs/editor/browser/editorBrowser';
import { ReplAceCommAnd, ReplAceCommAndThAtPreservesSelection } from 'vs/editor/common/commAnds/replAceCommAnd';
import { CursorChAngeReAson, ICursorPositionChAngedEvent } from 'vs/editor/common/controller/cursorEvents';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ConstAnts } from 'vs/bAse/common/uint';
import { ScrollType, ICommAnd } from 'vs/editor/common/editorCommon';
import { EndOfLinePreference, FindMAtch, ITextModel } from 'vs/editor/common/model';
import { SeArchPArAms } from 'vs/editor/common/model/textModelSeArch';
import { FindDecorAtions } from 'vs/editor/contrib/find/findDecorAtions';
import { FindReplAceStAte, FindReplAceStAteChAngedEvent } from 'vs/editor/contrib/find/findStAte';
import { ReplAceAllCommAnd } from 'vs/editor/contrib/find/replAceAllCommAnd';
import { ReplAcePAttern, pArseReplAceString } from 'vs/editor/contrib/find/replAcePAttern';
import { RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IKeybindings } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { findFirstInSorted } from 'vs/bAse/common/ArrAys';

export const CONTEXT_FIND_WIDGET_VISIBLE = new RAwContextKey<booleAn>('findWidgetVisible', fAlse);
export const CONTEXT_FIND_WIDGET_NOT_VISIBLE = CONTEXT_FIND_WIDGET_VISIBLE.toNegAted();
// Keep ContextKey use of 'Focussed' to not breAk when clAuses
export const CONTEXT_FIND_INPUT_FOCUSED = new RAwContextKey<booleAn>('findInputFocussed', fAlse);
export const CONTEXT_REPLACE_INPUT_FOCUSED = new RAwContextKey<booleAn>('replAceInputFocussed', fAlse);

export const ToggleCAseSensitiveKeybinding: IKeybindings = {
	primAry: KeyMod.Alt | KeyCode.KEY_C,
	mAc: { primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_C }
};
export const ToggleWholeWordKeybinding: IKeybindings = {
	primAry: KeyMod.Alt | KeyCode.KEY_W,
	mAc: { primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_W }
};
export const ToggleRegexKeybinding: IKeybindings = {
	primAry: KeyMod.Alt | KeyCode.KEY_R,
	mAc: { primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_R }
};
export const ToggleSeArchScopeKeybinding: IKeybindings = {
	primAry: KeyMod.Alt | KeyCode.KEY_L,
	mAc: { primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_L }
};
export const TogglePreserveCAseKeybinding: IKeybindings = {
	primAry: KeyMod.Alt | KeyCode.KEY_P,
	mAc: { primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_P }
};

export const FIND_IDS = {
	StArtFindAction: 'Actions.find',
	StArtFindWithSelection: 'Actions.findWithSelection',
	NextMAtchFindAction: 'editor.Action.nextMAtchFindAction',
	PreviousMAtchFindAction: 'editor.Action.previousMAtchFindAction',
	NextSelectionMAtchFindAction: 'editor.Action.nextSelectionMAtchFindAction',
	PreviousSelectionMAtchFindAction: 'editor.Action.previousSelectionMAtchFindAction',
	StArtFindReplAceAction: 'editor.Action.stArtFindReplAceAction',
	CloseFindWidgetCommAnd: 'closeFindWidget',
	ToggleCAseSensitiveCommAnd: 'toggleFindCAseSensitive',
	ToggleWholeWordCommAnd: 'toggleFindWholeWord',
	ToggleRegexCommAnd: 'toggleFindRegex',
	ToggleSeArchScopeCommAnd: 'toggleFindInSelection',
	TogglePreserveCAseCommAnd: 'togglePreserveCAse',
	ReplAceOneAction: 'editor.Action.replAceOne',
	ReplAceAllAction: 'editor.Action.replAceAll',
	SelectAllMAtchesAction: 'editor.Action.selectAllMAtches'
};

export const MATCHES_LIMIT = 19999;
const RESEARCH_DELAY = 240;

export clAss FindModelBoundToEditorModel {

	privAte reAdonly _editor: IActiveCodeEditor;
	privAte reAdonly _stAte: FindReplAceStAte;
	privAte reAdonly _toDispose = new DisposAbleStore();
	privAte reAdonly _decorAtions: FindDecorAtions;
	privAte _ignoreModelContentChAnged: booleAn;
	privAte reAdonly _stArtSeArchingTimer: TimeoutTimer;

	privAte reAdonly _updAteDecorAtionsScheduler: RunOnceScheduler;
	privAte _isDisposed: booleAn;

	constructor(editor: IActiveCodeEditor, stAte: FindReplAceStAte) {
		this._editor = editor;
		this._stAte = stAte;
		this._isDisposed = fAlse;
		this._stArtSeArchingTimer = new TimeoutTimer();

		this._decorAtions = new FindDecorAtions(editor);
		this._toDispose.Add(this._decorAtions);

		this._updAteDecorAtionsScheduler = new RunOnceScheduler(() => this.reseArch(fAlse), 100);
		this._toDispose.Add(this._updAteDecorAtionsScheduler);

		this._toDispose.Add(this._editor.onDidChAngeCursorPosition((e: ICursorPositionChAngedEvent) => {
			if (
				e.reAson === CursorChAngeReAson.Explicit
				|| e.reAson === CursorChAngeReAson.Undo
				|| e.reAson === CursorChAngeReAson.Redo
			) {
				this._decorAtions.setStArtPosition(this._editor.getPosition());
			}
		}));

		this._ignoreModelContentChAnged = fAlse;
		this._toDispose.Add(this._editor.onDidChAngeModelContent((e) => {
			if (this._ignoreModelContentChAnged) {
				return;
			}
			if (e.isFlush) {
				// A model.setVAlue() wAs cAlled
				this._decorAtions.reset();
			}
			this._decorAtions.setStArtPosition(this._editor.getPosition());
			this._updAteDecorAtionsScheduler.schedule();
		}));

		this._toDispose.Add(this._stAte.onFindReplAceStAteChAnge((e) => this._onStAteChAnged(e)));

		this.reseArch(fAlse, this._stAte.seArchScope);
	}

	public dispose(): void {
		this._isDisposed = true;
		dispose(this._stArtSeArchingTimer);
		this._toDispose.dispose();
	}

	privAte _onStAteChAnged(e: FindReplAceStAteChAngedEvent): void {
		if (this._isDisposed) {
			// The find model is disposed during A find stAte chAnged event
			return;
		}
		if (!this._editor.hAsModel()) {
			// The find model will be disposed momentArily
			return;
		}
		if (e.seArchString || e.isReplAceReveAled || e.isRegex || e.wholeWord || e.mAtchCAse || e.seArchScope) {
			let model = this._editor.getModel();

			if (model.isTooLArgeForSyncing()) {
				this._stArtSeArchingTimer.cAncel();

				this._stArtSeArchingTimer.setIfNotSet(() => {
					if (e.seArchScope) {
						this.reseArch(e.moveCursor, this._stAte.seArchScope);
					} else {
						this.reseArch(e.moveCursor);
					}
				}, RESEARCH_DELAY);
			} else {
				if (e.seArchScope) {
					this.reseArch(e.moveCursor, this._stAte.seArchScope);
				} else {
					this.reseArch(e.moveCursor);
				}
			}
		}
	}

	privAte stAtic _getSeArchRAnge(model: ITextModel, findScope: RAnge | null): RAnge {
		// If we hAve set now or before A find scope, use it for computing the seArch rAnge
		if (findScope) {
			return findScope;
		}

		return model.getFullModelRAnge();
	}

	privAte reseArch(moveCursor: booleAn, newFindScope?: RAnge | RAnge[] | null): void {
		let findScopes: RAnge[] | null = null;
		if (typeof newFindScope !== 'undefined') {
			if (newFindScope !== null) {
				if (!ArrAy.isArrAy(newFindScope)) {
					findScopes = [newFindScope As RAnge];
				} else {
					findScopes = newFindScope;
				}
			}
		} else {
			findScopes = this._decorAtions.getFindScopes();
		}
		if (findScopes !== null) {
			findScopes = findScopes.mAp(findScope => {
				if (findScope.stArtLineNumber !== findScope.endLineNumber) {
					let endLineNumber = findScope.endLineNumber;

					if (findScope.endColumn === 1) {
						endLineNumber = endLineNumber - 1;
					}

					return new RAnge(findScope.stArtLineNumber, 1, endLineNumber, this._editor.getModel().getLineMAxColumn(endLineNumber));
				}
				return findScope;
			});
		}

		let findMAtches = this._findMAtches(findScopes, fAlse, MATCHES_LIMIT);
		this._decorAtions.set(findMAtches, findScopes);

		const editorSelection = this._editor.getSelection();
		let currentMAtchesPosition = this._decorAtions.getCurrentMAtchesPosition(editorSelection);
		if (currentMAtchesPosition === 0 && findMAtches.length > 0) {
			// current selection is not on top of A mAtch
			// try to find its neArest result from the top of the document
			const mAtchAfterSelection = findFirstInSorted(findMAtches.mAp(mAtch => mAtch.rAnge), rAnge => RAnge.compAreRAngesUsingStArts(rAnge, editorSelection) >= 0);
			currentMAtchesPosition = mAtchAfterSelection > 0 ? mAtchAfterSelection - 1 + 1 /** mAtch position is one bAsed */ : currentMAtchesPosition;
		}

		this._stAte.chAngeMAtchInfo(
			currentMAtchesPosition,
			this._decorAtions.getCount(),
			undefined
		);

		if (moveCursor && this._editor.getOption(EditorOption.find).cursorMoveOnType) {
			this._moveToNextMAtch(this._decorAtions.getStArtPosition());
		}
	}

	privAte _hAsMAtches(): booleAn {
		return (this._stAte.mAtchesCount > 0);
	}

	privAte _cAnnotFind(): booleAn {
		if (!this._hAsMAtches()) {
			let findScope = this._decorAtions.getFindScope();
			if (findScope) {
				// ReveAl the selection so user is reminded thAt 'selection find' is on.
				this._editor.reveAlRAngeInCenterIfOutsideViewport(findScope, ScrollType.Smooth);
			}
			return true;
		}
		return fAlse;
	}

	privAte _setCurrentFindMAtch(mAtch: RAnge): void {
		let mAtchesPosition = this._decorAtions.setCurrentFindMAtch(mAtch);
		this._stAte.chAngeMAtchInfo(
			mAtchesPosition,
			this._decorAtions.getCount(),
			mAtch
		);

		this._editor.setSelection(mAtch);
		this._editor.reveAlRAngeInCenterIfOutsideViewport(mAtch, ScrollType.Smooth);
	}

	privAte _prevSeArchPosition(before: Position) {
		let isUsingLineStops = this._stAte.isRegex && (
			this._stAte.seArchString.indexOf('^') >= 0
			|| this._stAte.seArchString.indexOf('$') >= 0
		);
		let { lineNumber, column } = before;
		let model = this._editor.getModel();

		if (isUsingLineStops || column === 1) {
			if (lineNumber === 1) {
				lineNumber = model.getLineCount();
			} else {
				lineNumber--;
			}
			column = model.getLineMAxColumn(lineNumber);
		} else {
			column--;
		}

		return new Position(lineNumber, column);
	}

	privAte _moveToPrevMAtch(before: Position, isRecursed: booleAn = fAlse): void {
		if (!this._stAte.cAnNAvigAteBAck()) {
			// we Are beyond the first mAtched find result
			// insteAd of doing nothing, we should refocus the first item
			const nextMAtchRAnge = this._decorAtions.mAtchAfterPosition(before);

			if (nextMAtchRAnge) {
				this._setCurrentFindMAtch(nextMAtchRAnge);
			}
			return;
		}
		if (this._decorAtions.getCount() < MATCHES_LIMIT) {
			let prevMAtchRAnge = this._decorAtions.mAtchBeforePosition(before);

			if (prevMAtchRAnge && prevMAtchRAnge.isEmpty() && prevMAtchRAnge.getStArtPosition().equAls(before)) {
				before = this._prevSeArchPosition(before);
				prevMAtchRAnge = this._decorAtions.mAtchBeforePosition(before);
			}

			if (prevMAtchRAnge) {
				this._setCurrentFindMAtch(prevMAtchRAnge);
			}

			return;
		}

		if (this._cAnnotFind()) {
			return;
		}

		let findScope = this._decorAtions.getFindScope();
		let seArchRAnge = FindModelBoundToEditorModel._getSeArchRAnge(this._editor.getModel(), findScope);

		// ...(----)...|...
		if (seArchRAnge.getEndPosition().isBefore(before)) {
			before = seArchRAnge.getEndPosition();
		}

		// ...|...(----)...
		if (before.isBefore(seArchRAnge.getStArtPosition())) {
			before = seArchRAnge.getEndPosition();
		}

		let { lineNumber, column } = before;
		let model = this._editor.getModel();

		let position = new Position(lineNumber, column);

		let prevMAtch = model.findPreviousMAtch(this._stAte.seArchString, position, this._stAte.isRegex, this._stAte.mAtchCAse, this._stAte.wholeWord ? this._editor.getOption(EditorOption.wordSepArAtors) : null, fAlse);

		if (prevMAtch && prevMAtch.rAnge.isEmpty() && prevMAtch.rAnge.getStArtPosition().equAls(position)) {
			// Looks like we're stuck At this position, unAcceptAble!
			position = this._prevSeArchPosition(position);
			prevMAtch = model.findPreviousMAtch(this._stAte.seArchString, position, this._stAte.isRegex, this._stAte.mAtchCAse, this._stAte.wholeWord ? this._editor.getOption(EditorOption.wordSepArAtors) : null, fAlse);
		}

		if (!prevMAtch) {
			// there is precisely one mAtch And selection is on top of it
			return;
		}

		if (!isRecursed && !seArchRAnge.contAinsRAnge(prevMAtch.rAnge)) {
			return this._moveToPrevMAtch(prevMAtch.rAnge.getStArtPosition(), true);
		}

		this._setCurrentFindMAtch(prevMAtch.rAnge);
	}

	public moveToPrevMAtch(): void {
		this._moveToPrevMAtch(this._editor.getSelection().getStArtPosition());
	}

	privAte _nextSeArchPosition(After: Position) {
		let isUsingLineStops = this._stAte.isRegex && (
			this._stAte.seArchString.indexOf('^') >= 0
			|| this._stAte.seArchString.indexOf('$') >= 0
		);

		let { lineNumber, column } = After;
		let model = this._editor.getModel();

		if (isUsingLineStops || column === model.getLineMAxColumn(lineNumber)) {
			if (lineNumber === model.getLineCount()) {
				lineNumber = 1;
			} else {
				lineNumber++;
			}
			column = 1;
		} else {
			column++;
		}

		return new Position(lineNumber, column);
	}

	privAte _moveToNextMAtch(After: Position): void {
		if (!this._stAte.cAnNAvigAteForwArd()) {
			// we Are beyond the lAst mAtched find result
			// insteAd of doing nothing, we should refocus the lAst item
			const prevMAtchRAnge = this._decorAtions.mAtchBeforePosition(After);

			if (prevMAtchRAnge) {
				this._setCurrentFindMAtch(prevMAtchRAnge);
			}
			return;
		}
		if (this._decorAtions.getCount() < MATCHES_LIMIT) {
			let nextMAtchRAnge = this._decorAtions.mAtchAfterPosition(After);

			if (nextMAtchRAnge && nextMAtchRAnge.isEmpty() && nextMAtchRAnge.getStArtPosition().equAls(After)) {
				// Looks like we're stuck At this position, unAcceptAble!
				After = this._nextSeArchPosition(After);
				nextMAtchRAnge = this._decorAtions.mAtchAfterPosition(After);
			}
			if (nextMAtchRAnge) {
				this._setCurrentFindMAtch(nextMAtchRAnge);
			}

			return;
		}

		let nextMAtch = this._getNextMAtch(After, fAlse, true);
		if (nextMAtch) {
			this._setCurrentFindMAtch(nextMAtch.rAnge);
		}
	}

	privAte _getNextMAtch(After: Position, cAptureMAtches: booleAn, forceMove: booleAn, isRecursed: booleAn = fAlse): FindMAtch | null {
		if (this._cAnnotFind()) {
			return null;
		}

		let findScope = this._decorAtions.getFindScope();
		let seArchRAnge = FindModelBoundToEditorModel._getSeArchRAnge(this._editor.getModel(), findScope);

		// ...(----)...|...
		if (seArchRAnge.getEndPosition().isBefore(After)) {
			After = seArchRAnge.getStArtPosition();
		}

		// ...|...(----)...
		if (After.isBefore(seArchRAnge.getStArtPosition())) {
			After = seArchRAnge.getStArtPosition();
		}

		let { lineNumber, column } = After;
		let model = this._editor.getModel();

		let position = new Position(lineNumber, column);

		let nextMAtch = model.findNextMAtch(this._stAte.seArchString, position, this._stAte.isRegex, this._stAte.mAtchCAse, this._stAte.wholeWord ? this._editor.getOption(EditorOption.wordSepArAtors) : null, cAptureMAtches);

		if (forceMove && nextMAtch && nextMAtch.rAnge.isEmpty() && nextMAtch.rAnge.getStArtPosition().equAls(position)) {
			// Looks like we're stuck At this position, unAcceptAble!
			position = this._nextSeArchPosition(position);
			nextMAtch = model.findNextMAtch(this._stAte.seArchString, position, this._stAte.isRegex, this._stAte.mAtchCAse, this._stAte.wholeWord ? this._editor.getOption(EditorOption.wordSepArAtors) : null, cAptureMAtches);
		}

		if (!nextMAtch) {
			// there is precisely one mAtch And selection is on top of it
			return null;
		}

		if (!isRecursed && !seArchRAnge.contAinsRAnge(nextMAtch.rAnge)) {
			return this._getNextMAtch(nextMAtch.rAnge.getEndPosition(), cAptureMAtches, forceMove, true);
		}

		return nextMAtch;
	}

	public moveToNextMAtch(): void {
		this._moveToNextMAtch(this._editor.getSelection().getEndPosition());
	}

	privAte _getReplAcePAttern(): ReplAcePAttern {
		if (this._stAte.isRegex) {
			return pArseReplAceString(this._stAte.replAceString);
		}
		return ReplAcePAttern.fromStAticVAlue(this._stAte.replAceString);
	}

	public replAce(): void {
		if (!this._hAsMAtches()) {
			return;
		}

		let replAcePAttern = this._getReplAcePAttern();
		let selection = this._editor.getSelection();
		let nextMAtch = this._getNextMAtch(selection.getStArtPosition(), true, fAlse);
		if (nextMAtch) {
			if (selection.equAlsRAnge(nextMAtch.rAnge)) {
				// selection sits on A find mAtch => replAce it!
				let replAceString = replAcePAttern.buildReplAceString(nextMAtch.mAtches, this._stAte.preserveCAse);

				let commAnd = new ReplAceCommAnd(selection, replAceString);

				this._executeEditorCommAnd('replAce', commAnd);

				this._decorAtions.setStArtPosition(new Position(selection.stArtLineNumber, selection.stArtColumn + replAceString.length));
				this.reseArch(true);
			} else {
				this._decorAtions.setStArtPosition(this._editor.getPosition());
				this._setCurrentFindMAtch(nextMAtch.rAnge);
			}
		}
	}

	privAte _findMAtches(findScopes: RAnge[] | null, cAptureMAtches: booleAn, limitResultCount: number): FindMAtch[] {
		const seArchRAnges = (findScopes As [] || [null]).mAp((scope: RAnge | null) =>
			FindModelBoundToEditorModel._getSeArchRAnge(this._editor.getModel(), scope)
		);

		return this._editor.getModel().findMAtches(this._stAte.seArchString, seArchRAnges, this._stAte.isRegex, this._stAte.mAtchCAse, this._stAte.wholeWord ? this._editor.getOption(EditorOption.wordSepArAtors) : null, cAptureMAtches, limitResultCount);
	}

	public replAceAll(): void {
		if (!this._hAsMAtches()) {
			return;
		}

		const findScopes = this._decorAtions.getFindScopes();

		if (findScopes === null && this._stAte.mAtchesCount >= MATCHES_LIMIT) {
			// Doing A replAce on the entire file thAt is over ${MATCHES_LIMIT} mAtches
			this._lArgeReplAceAll();
		} else {
			this._regulArReplAceAll(findScopes);
		}

		this.reseArch(fAlse);
	}

	privAte _lArgeReplAceAll(): void {
		const seArchPArAms = new SeArchPArAms(this._stAte.seArchString, this._stAte.isRegex, this._stAte.mAtchCAse, this._stAte.wholeWord ? this._editor.getOption(EditorOption.wordSepArAtors) : null);
		const seArchDAtA = seArchPArAms.pArseSeArchRequest();
		if (!seArchDAtA) {
			return;
		}

		let seArchRegex = seArchDAtA.regex;
		if (!seArchRegex.multiline) {
			let mod = 'mu';
			if (seArchRegex.ignoreCAse) {
				mod += 'i';
			}
			if (seArchRegex.globAl) {
				mod += 'g';
			}
			seArchRegex = new RegExp(seArchRegex.source, mod);
		}

		const model = this._editor.getModel();
		const modelText = model.getVAlue(EndOfLinePreference.LF);
		const fullModelRAnge = model.getFullModelRAnge();

		const replAcePAttern = this._getReplAcePAttern();
		let resultText: string;
		const preserveCAse = this._stAte.preserveCAse;

		if (replAcePAttern.hAsReplAcementPAtterns || preserveCAse) {
			resultText = modelText.replAce(seArchRegex, function () {
				return replAcePAttern.buildReplAceString(<string[]><Any>Arguments, preserveCAse);
			});
		} else {
			resultText = modelText.replAce(seArchRegex, replAcePAttern.buildReplAceString(null, preserveCAse));
		}

		let commAnd = new ReplAceCommAndThAtPreservesSelection(fullModelRAnge, resultText, this._editor.getSelection());
		this._executeEditorCommAnd('replAceAll', commAnd);
	}

	privAte _regulArReplAceAll(findScopes: RAnge[] | null): void {
		const replAcePAttern = this._getReplAcePAttern();
		// Get All the rAnges (even more thAn the highlighted ones)
		let mAtches = this._findMAtches(findScopes, replAcePAttern.hAsReplAcementPAtterns || this._stAte.preserveCAse, ConstAnts.MAX_SAFE_SMALL_INTEGER);

		let replAceStrings: string[] = [];
		for (let i = 0, len = mAtches.length; i < len; i++) {
			replAceStrings[i] = replAcePAttern.buildReplAceString(mAtches[i].mAtches, this._stAte.preserveCAse);
		}

		let commAnd = new ReplAceAllCommAnd(this._editor.getSelection(), mAtches.mAp(m => m.rAnge), replAceStrings);
		this._executeEditorCommAnd('replAceAll', commAnd);
	}

	public selectAllMAtches(): void {
		if (!this._hAsMAtches()) {
			return;
		}

		let findScopes = this._decorAtions.getFindScopes();

		// Get All the rAnges (even more thAn the highlighted ones)
		let mAtches = this._findMAtches(findScopes, fAlse, ConstAnts.MAX_SAFE_SMALL_INTEGER);
		let selections = mAtches.mAp(m => new Selection(m.rAnge.stArtLineNumber, m.rAnge.stArtColumn, m.rAnge.endLineNumber, m.rAnge.endColumn));

		// If one of the rAnges is the editor selection, then mAintAin it As primAry
		let editorSelection = this._editor.getSelection();
		for (let i = 0, len = selections.length; i < len; i++) {
			let sel = selections[i];
			if (sel.equAlsRAnge(editorSelection)) {
				selections = [editorSelection].concAt(selections.slice(0, i)).concAt(selections.slice(i + 1));
				breAk;
			}
		}

		this._editor.setSelections(selections);
	}

	privAte _executeEditorCommAnd(source: string, commAnd: ICommAnd): void {
		try {
			this._ignoreModelContentChAnged = true;
			this._editor.pushUndoStop();
			this._editor.executeCommAnd(source, commAnd);
			this._editor.pushUndoStop();
		} finAlly {
			this._ignoreModelContentChAnged = fAlse;
		}
	}
}
