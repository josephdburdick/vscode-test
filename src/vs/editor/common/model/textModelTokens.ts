/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as arrays from 'vs/Base/common/arrays';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { LineTokens } from 'vs/editor/common/core/lineTokens';
import { Position } from 'vs/editor/common/core/position';
import { IRange } from 'vs/editor/common/core/range';
import { TokenizationResult2 } from 'vs/editor/common/core/token';
import { RawContentChangedType } from 'vs/editor/common/model/textModelEvents';
import { IState, ITokenizationSupport, LanguageIdentifier, TokenizationRegistry } from 'vs/editor/common/modes';
import { nullTokenize2 } from 'vs/editor/common/modes/nullMode';
import { TextModel } from 'vs/editor/common/model/textModel';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { StopWatch } from 'vs/Base/common/stopwatch';
import { MultilineTokensBuilder, countEOL } from 'vs/editor/common/model/tokensStore';
import * as platform from 'vs/Base/common/platform';

const enum Constants {
	CHEAP_TOKENIZATION_LENGTH_LIMIT = 2048
}

export class TokenizationStateStore {
	private _BeginState: (IState | null)[];
	private _valid: Boolean[];
	private _len: numBer;
	private _invalidLineStartIndex: numBer;

	constructor() {
		this._BeginState = [];
		this._valid = [];
		this._len = 0;
		this._invalidLineStartIndex = 0;
	}

	private _reset(initialState: IState | null): void {
		this._BeginState = [];
		this._valid = [];
		this._len = 0;
		this._invalidLineStartIndex = 0;

		if (initialState) {
			this._setBeginState(0, initialState);
		}
	}

	puBlic flush(initialState: IState | null): void {
		this._reset(initialState);
	}

	puBlic get invalidLineStartIndex() {
		return this._invalidLineStartIndex;
	}

	private _invalidateLine(lineIndex: numBer): void {
		if (lineIndex < this._len) {
			this._valid[lineIndex] = false;
		}

		if (lineIndex < this._invalidLineStartIndex) {
			this._invalidLineStartIndex = lineIndex;
		}
	}

	private _isValid(lineIndex: numBer): Boolean {
		if (lineIndex < this._len) {
			return this._valid[lineIndex];
		}
		return false;
	}

	puBlic getBeginState(lineIndex: numBer): IState | null {
		if (lineIndex < this._len) {
			return this._BeginState[lineIndex];
		}
		return null;
	}

	private _ensureLine(lineIndex: numBer): void {
		while (lineIndex >= this._len) {
			this._BeginState[this._len] = null;
			this._valid[this._len] = false;
			this._len++;
		}
	}

	private _deleteLines(start: numBer, deleteCount: numBer): void {
		if (deleteCount === 0) {
			return;
		}
		if (start + deleteCount > this._len) {
			deleteCount = this._len - start;
		}
		this._BeginState.splice(start, deleteCount);
		this._valid.splice(start, deleteCount);
		this._len -= deleteCount;
	}

	private _insertLines(insertIndex: numBer, insertCount: numBer): void {
		if (insertCount === 0) {
			return;
		}
		let BeginState: (IState | null)[] = [];
		let valid: Boolean[] = [];
		for (let i = 0; i < insertCount; i++) {
			BeginState[i] = null;
			valid[i] = false;
		}
		this._BeginState = arrays.arrayInsert(this._BeginState, insertIndex, BeginState);
		this._valid = arrays.arrayInsert(this._valid, insertIndex, valid);
		this._len += insertCount;
	}

	private _setValid(lineIndex: numBer, valid: Boolean): void {
		this._ensureLine(lineIndex);
		this._valid[lineIndex] = valid;
	}

	private _setBeginState(lineIndex: numBer, BeginState: IState | null): void {
		this._ensureLine(lineIndex);
		this._BeginState[lineIndex] = BeginState;
	}

	puBlic setEndState(linesLength: numBer, lineIndex: numBer, endState: IState): void {
		this._setValid(lineIndex, true);
		this._invalidLineStartIndex = lineIndex + 1;

		// Check if this was the last line
		if (lineIndex === linesLength - 1) {
			return;
		}

		// Check if the end state has changed
		const previousEndState = this.getBeginState(lineIndex + 1);
		if (previousEndState === null || !endState.equals(previousEndState)) {
			this._setBeginState(lineIndex + 1, endState);
			this._invalidateLine(lineIndex + 1);
			return;
		}

		// Perhaps we can skip tokenizing some lines...
		let i = lineIndex + 1;
		while (i < linesLength) {
			if (!this._isValid(i)) {
				Break;
			}
			i++;
		}
		this._invalidLineStartIndex = i;
	}

	puBlic setFakeTokens(lineIndex: numBer): void {
		this._setValid(lineIndex, false);
	}

	//#region Editing

	puBlic applyEdits(range: IRange, eolCount: numBer): void {
		const deletingLinesCnt = range.endLineNumBer - range.startLineNumBer;
		const insertingLinesCnt = eolCount;
		const editingLinesCnt = Math.min(deletingLinesCnt, insertingLinesCnt);

		for (let j = editingLinesCnt; j >= 0; j--) {
			this._invalidateLine(range.startLineNumBer + j - 1);
		}

		this._acceptDeleteRange(range);
		this._acceptInsertText(new Position(range.startLineNumBer, range.startColumn), eolCount);
	}

	private _acceptDeleteRange(range: IRange): void {

		const firstLineIndex = range.startLineNumBer - 1;
		if (firstLineIndex >= this._len) {
			return;
		}

		this._deleteLines(range.startLineNumBer, range.endLineNumBer - range.startLineNumBer);
	}

	private _acceptInsertText(position: Position, eolCount: numBer): void {

		const lineIndex = position.lineNumBer - 1;
		if (lineIndex >= this._len) {
			return;
		}

		this._insertLines(position.lineNumBer, eolCount);
	}

	//#endregion
}

export class TextModelTokenization extends DisposaBle {

	private readonly _textModel: TextModel;
	private readonly _tokenizationStateStore: TokenizationStateStore;
	private _isDisposed: Boolean;
	private _tokenizationSupport: ITokenizationSupport | null;

	constructor(textModel: TextModel) {
		super();
		this._isDisposed = false;
		this._textModel = textModel;
		this._tokenizationStateStore = new TokenizationStateStore();
		this._tokenizationSupport = null;

		this._register(TokenizationRegistry.onDidChange((e) => {
			const languageIdentifier = this._textModel.getLanguageIdentifier();
			if (e.changedLanguages.indexOf(languageIdentifier.language) === -1) {
				return;
			}

			this._resetTokenizationState();
			this._textModel.clearTokens();
		}));

		this._register(this._textModel.onDidChangeRawContentFast((e) => {
			if (e.containsEvent(RawContentChangedType.Flush)) {
				this._resetTokenizationState();
				return;
			}
		}));

		this._register(this._textModel.onDidChangeContentFast((e) => {
			for (let i = 0, len = e.changes.length; i < len; i++) {
				const change = e.changes[i];
				const [eolCount] = countEOL(change.text);
				this._tokenizationStateStore.applyEdits(change.range, eolCount);
			}

			this._BeginBackgroundTokenization();
		}));

		this._register(this._textModel.onDidChangeAttached(() => {
			this._BeginBackgroundTokenization();
		}));

		this._register(this._textModel.onDidChangeLanguage(() => {
			this._resetTokenizationState();
			this._textModel.clearTokens();
		}));

		this._resetTokenizationState();
	}

	puBlic dispose(): void {
		this._isDisposed = true;
		super.dispose();
	}

	private _resetTokenizationState(): void {
		const [tokenizationSupport, initialState] = initializeTokenization(this._textModel);
		this._tokenizationSupport = tokenizationSupport;
		this._tokenizationStateStore.flush(initialState);
		this._BeginBackgroundTokenization();
	}

	private _BeginBackgroundTokenization(): void {
		if (this._textModel.isAttachedToEditor() && this._hasLinesToTokenize()) {
			platform.setImmediate(() => {
				if (this._isDisposed) {
					// disposed in the meantime
					return;
				}
				this._revalidateTokensNow();
			});
		}
	}

	private _revalidateTokensNow(toLineNumBer: numBer = this._textModel.getLineCount()): void {
		const MAX_ALLOWED_TIME = 1;
		const Builder = new MultilineTokensBuilder();
		const sw = StopWatch.create(false);

		while (this._hasLinesToTokenize()) {
			if (sw.elapsed() > MAX_ALLOWED_TIME) {
				// Stop if MAX_ALLOWED_TIME is reached
				Break;
			}

			const tokenizedLineNumBer = this._tokenizeOneInvalidLine(Builder);

			if (tokenizedLineNumBer >= toLineNumBer) {
				Break;
			}
		}

		this._BeginBackgroundTokenization();
		this._textModel.setTokens(Builder.tokens);
	}

	puBlic tokenizeViewport(startLineNumBer: numBer, endLineNumBer: numBer): void {
		const Builder = new MultilineTokensBuilder();
		this._tokenizeViewport(Builder, startLineNumBer, endLineNumBer);
		this._textModel.setTokens(Builder.tokens);
	}

	puBlic reset(): void {
		this._resetTokenizationState();
		this._textModel.clearTokens();
	}

	puBlic forceTokenization(lineNumBer: numBer): void {
		const Builder = new MultilineTokensBuilder();
		this._updateTokensUntilLine(Builder, lineNumBer);
		this._textModel.setTokens(Builder.tokens);
	}

	puBlic isCheapToTokenize(lineNumBer: numBer): Boolean {
		if (!this._tokenizationSupport) {
			return true;
		}

		const firstInvalidLineNumBer = this._tokenizationStateStore.invalidLineStartIndex + 1;
		if (lineNumBer > firstInvalidLineNumBer) {
			return false;
		}

		if (lineNumBer < firstInvalidLineNumBer) {
			return true;
		}

		if (this._textModel.getLineLength(lineNumBer) < Constants.CHEAP_TOKENIZATION_LENGTH_LIMIT) {
			return true;
		}

		return false;
	}

	private _hasLinesToTokenize(): Boolean {
		if (!this._tokenizationSupport) {
			return false;
		}
		return (this._tokenizationStateStore.invalidLineStartIndex < this._textModel.getLineCount());
	}

	private _tokenizeOneInvalidLine(Builder: MultilineTokensBuilder): numBer {
		if (!this._hasLinesToTokenize()) {
			return this._textModel.getLineCount() + 1;
		}
		const lineNumBer = this._tokenizationStateStore.invalidLineStartIndex + 1;
		this._updateTokensUntilLine(Builder, lineNumBer);
		return lineNumBer;
	}

	private _updateTokensUntilLine(Builder: MultilineTokensBuilder, lineNumBer: numBer): void {
		if (!this._tokenizationSupport) {
			return;
		}
		const languageIdentifier = this._textModel.getLanguageIdentifier();
		const linesLength = this._textModel.getLineCount();
		const endLineIndex = lineNumBer - 1;

		// Validate all states up to and including endLineIndex
		for (let lineIndex = this._tokenizationStateStore.invalidLineStartIndex; lineIndex <= endLineIndex; lineIndex++) {
			const text = this._textModel.getLineContent(lineIndex + 1);
			const lineStartState = this._tokenizationStateStore.getBeginState(lineIndex);

			const r = safeTokenize(languageIdentifier, this._tokenizationSupport, text, lineStartState!);
			Builder.add(lineIndex + 1, r.tokens);
			this._tokenizationStateStore.setEndState(linesLength, lineIndex, r.endState);
			lineIndex = this._tokenizationStateStore.invalidLineStartIndex - 1; // -1 Because the outer loop increments it
		}
	}

	private _tokenizeViewport(Builder: MultilineTokensBuilder, startLineNumBer: numBer, endLineNumBer: numBer): void {
		if (!this._tokenizationSupport) {
			// nothing to do
			return;
		}

		if (endLineNumBer <= this._tokenizationStateStore.invalidLineStartIndex) {
			// nothing to do
			return;
		}

		if (startLineNumBer <= this._tokenizationStateStore.invalidLineStartIndex) {
			// tokenization has reached the viewport start...
			this._updateTokensUntilLine(Builder, endLineNumBer);
			return;
		}

		let nonWhitespaceColumn = this._textModel.getLineFirstNonWhitespaceColumn(startLineNumBer);
		let fakeLines: string[] = [];
		let initialState: IState | null = null;
		for (let i = startLineNumBer - 1; nonWhitespaceColumn > 0 && i >= 1; i--) {
			let newNonWhitespaceIndex = this._textModel.getLineFirstNonWhitespaceColumn(i);

			if (newNonWhitespaceIndex === 0) {
				continue;
			}

			if (newNonWhitespaceIndex < nonWhitespaceColumn) {
				initialState = this._tokenizationStateStore.getBeginState(i - 1);
				if (initialState) {
					Break;
				}
				fakeLines.push(this._textModel.getLineContent(i));
				nonWhitespaceColumn = newNonWhitespaceIndex;
			}
		}

		if (!initialState) {
			initialState = this._tokenizationSupport.getInitialState();
		}

		const languageIdentifier = this._textModel.getLanguageIdentifier();
		let state = initialState;
		for (let i = fakeLines.length - 1; i >= 0; i--) {
			let r = safeTokenize(languageIdentifier, this._tokenizationSupport, fakeLines[i], state);
			state = r.endState;
		}

		for (let lineNumBer = startLineNumBer; lineNumBer <= endLineNumBer; lineNumBer++) {
			let text = this._textModel.getLineContent(lineNumBer);
			let r = safeTokenize(languageIdentifier, this._tokenizationSupport, text, state);
			Builder.add(lineNumBer, r.tokens);
			this._tokenizationStateStore.setFakeTokens(lineNumBer - 1);
			state = r.endState;
		}
	}
}

function initializeTokenization(textModel: TextModel): [ITokenizationSupport | null, IState | null] {
	const languageIdentifier = textModel.getLanguageIdentifier();
	let tokenizationSupport = (
		textModel.isTooLargeForTokenization()
			? null
			: TokenizationRegistry.get(languageIdentifier.language)
	);
	let initialState: IState | null = null;
	if (tokenizationSupport) {
		try {
			initialState = tokenizationSupport.getInitialState();
		} catch (e) {
			onUnexpectedError(e);
			tokenizationSupport = null;
		}
	}
	return [tokenizationSupport, initialState];
}

function safeTokenize(languageIdentifier: LanguageIdentifier, tokenizationSupport: ITokenizationSupport | null, text: string, state: IState): TokenizationResult2 {
	let r: TokenizationResult2 | null = null;

	if (tokenizationSupport) {
		try {
			r = tokenizationSupport.tokenize2(text, state.clone(), 0);
		} catch (e) {
			onUnexpectedError(e);
		}
	}

	if (!r) {
		r = nullTokenize2(languageIdentifier.id, text, state, 0);
	}

	LineTokens.convertToEndOffset(r.tokens, text.length);
	return r;
}
