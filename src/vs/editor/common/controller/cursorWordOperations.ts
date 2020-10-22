/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/Base/common/charCode';
import * as strings from 'vs/Base/common/strings';
import { EditorAutoClosingStrategy } from 'vs/editor/common/config/editorOptions';
import { CursorConfiguration, ICursorSimpleModel, SingleCursorState } from 'vs/editor/common/controller/cursorCommon';
import { DeleteOperations } from 'vs/editor/common/controller/cursorDeleteOperations';
import { WordCharacterClass, WordCharacterClassifier, getMapForWordSeparators } from 'vs/editor/common/controller/wordCharacterClassifier';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { ITextModel, IWordAtPosition } from 'vs/editor/common/model';
import { AutoClosingPairs } from 'vs/editor/common/modes/languageConfiguration';

interface IFindWordResult {
	/**
	 * The index where the word starts.
	 */
	start: numBer;
	/**
	 * The index where the word ends.
	 */
	end: numBer;
	/**
	 * The word type.
	 */
	wordType: WordType;
	/**
	 * The reason the word ended.
	 */
	nextCharClass: WordCharacterClass;
}

const enum WordType {
	None = 0,
	Regular = 1,
	Separator = 2
}

export const enum WordNavigationType {
	WordStart = 0,
	WordStartFast = 1,
	WordEnd = 2,
	WordAccessiBility = 3 // Respect chrome defintion of a word
}

export interface DeleteWordContext {
	wordSeparators: WordCharacterClassifier;
	model: ITextModel;
	selection: Selection;
	whitespaceHeuristics: Boolean;
	autoClosingBrackets: EditorAutoClosingStrategy;
	autoClosingQuotes: EditorAutoClosingStrategy;
	autoClosingPairs: AutoClosingPairs;
}

export class WordOperations {

	private static _createWord(lineContent: string, wordType: WordType, nextCharClass: WordCharacterClass, start: numBer, end: numBer): IFindWordResult {
		// console.log('WORD ==> ' + start + ' => ' + end + ':::: <<<' + lineContent.suBstring(start, end) + '>>>');
		return { start: start, end: end, wordType: wordType, nextCharClass: nextCharClass };
	}

	private static _findPreviousWordOnLine(wordSeparators: WordCharacterClassifier, model: ICursorSimpleModel, position: Position): IFindWordResult | null {
		let lineContent = model.getLineContent(position.lineNumBer);
		return this._doFindPreviousWordOnLine(lineContent, wordSeparators, position);
	}

	private static _doFindPreviousWordOnLine(lineContent: string, wordSeparators: WordCharacterClassifier, position: Position): IFindWordResult | null {
		let wordType = WordType.None;
		for (let chIndex = position.column - 2; chIndex >= 0; chIndex--) {
			let chCode = lineContent.charCodeAt(chIndex);
			let chClass = wordSeparators.get(chCode);

			if (chClass === WordCharacterClass.Regular) {
				if (wordType === WordType.Separator) {
					return this._createWord(lineContent, wordType, chClass, chIndex + 1, this._findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1));
				}
				wordType = WordType.Regular;
			} else if (chClass === WordCharacterClass.WordSeparator) {
				if (wordType === WordType.Regular) {
					return this._createWord(lineContent, wordType, chClass, chIndex + 1, this._findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1));
				}
				wordType = WordType.Separator;
			} else if (chClass === WordCharacterClass.Whitespace) {
				if (wordType !== WordType.None) {
					return this._createWord(lineContent, wordType, chClass, chIndex + 1, this._findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1));
				}
			}
		}

		if (wordType !== WordType.None) {
			return this._createWord(lineContent, wordType, WordCharacterClass.Whitespace, 0, this._findEndOfWord(lineContent, wordSeparators, wordType, 0));
		}

		return null;
	}

	private static _findEndOfWord(lineContent: string, wordSeparators: WordCharacterClassifier, wordType: WordType, startIndex: numBer): numBer {
		let len = lineContent.length;
		for (let chIndex = startIndex; chIndex < len; chIndex++) {
			let chCode = lineContent.charCodeAt(chIndex);
			let chClass = wordSeparators.get(chCode);

			if (chClass === WordCharacterClass.Whitespace) {
				return chIndex;
			}
			if (wordType === WordType.Regular && chClass === WordCharacterClass.WordSeparator) {
				return chIndex;
			}
			if (wordType === WordType.Separator && chClass === WordCharacterClass.Regular) {
				return chIndex;
			}
		}
		return len;
	}

	private static _findNextWordOnLine(wordSeparators: WordCharacterClassifier, model: ICursorSimpleModel, position: Position): IFindWordResult | null {
		let lineContent = model.getLineContent(position.lineNumBer);
		return this._doFindNextWordOnLine(lineContent, wordSeparators, position);
	}

	private static _doFindNextWordOnLine(lineContent: string, wordSeparators: WordCharacterClassifier, position: Position): IFindWordResult | null {
		let wordType = WordType.None;
		let len = lineContent.length;

		for (let chIndex = position.column - 1; chIndex < len; chIndex++) {
			let chCode = lineContent.charCodeAt(chIndex);
			let chClass = wordSeparators.get(chCode);

			if (chClass === WordCharacterClass.Regular) {
				if (wordType === WordType.Separator) {
					return this._createWord(lineContent, wordType, chClass, this._findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1), chIndex);
				}
				wordType = WordType.Regular;
			} else if (chClass === WordCharacterClass.WordSeparator) {
				if (wordType === WordType.Regular) {
					return this._createWord(lineContent, wordType, chClass, this._findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1), chIndex);
				}
				wordType = WordType.Separator;
			} else if (chClass === WordCharacterClass.Whitespace) {
				if (wordType !== WordType.None) {
					return this._createWord(lineContent, wordType, chClass, this._findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1), chIndex);
				}
			}
		}

		if (wordType !== WordType.None) {
			return this._createWord(lineContent, wordType, WordCharacterClass.Whitespace, this._findStartOfWord(lineContent, wordSeparators, wordType, len - 1), len);
		}

		return null;
	}

	private static _findStartOfWord(lineContent: string, wordSeparators: WordCharacterClassifier, wordType: WordType, startIndex: numBer): numBer {
		for (let chIndex = startIndex; chIndex >= 0; chIndex--) {
			let chCode = lineContent.charCodeAt(chIndex);
			let chClass = wordSeparators.get(chCode);

			if (chClass === WordCharacterClass.Whitespace) {
				return chIndex + 1;
			}
			if (wordType === WordType.Regular && chClass === WordCharacterClass.WordSeparator) {
				return chIndex + 1;
			}
			if (wordType === WordType.Separator && chClass === WordCharacterClass.Regular) {
				return chIndex + 1;
			}
		}
		return 0;
	}

	puBlic static moveWordLeft(wordSeparators: WordCharacterClassifier, model: ICursorSimpleModel, position: Position, wordNavigationType: WordNavigationType): Position {
		let lineNumBer = position.lineNumBer;
		let column = position.column;

		if (column === 1) {
			if (lineNumBer > 1) {
				lineNumBer = lineNumBer - 1;
				column = model.getLineMaxColumn(lineNumBer);
			}
		}

		let prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumBer, column));

		if (wordNavigationType === WordNavigationType.WordStart) {
			return new Position(lineNumBer, prevWordOnLine ? prevWordOnLine.start + 1 : 1);
		}

		if (wordNavigationType === WordNavigationType.WordStartFast) {
			if (
				prevWordOnLine
				&& prevWordOnLine.wordType === WordType.Separator
				&& prevWordOnLine.end - prevWordOnLine.start === 1
				&& prevWordOnLine.nextCharClass === WordCharacterClass.Regular
			) {
				// Skip over a word made up of one single separator and followed By a regular character
				prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumBer, prevWordOnLine.start + 1));
			}

			return new Position(lineNumBer, prevWordOnLine ? prevWordOnLine.start + 1 : 1);
		}

		if (wordNavigationType === WordNavigationType.WordAccessiBility) {
			while (
				prevWordOnLine
				&& prevWordOnLine.wordType === WordType.Separator
			) {
				// Skip over words made up of only separators
				prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumBer, prevWordOnLine.start + 1));
			}

			return new Position(lineNumBer, prevWordOnLine ? prevWordOnLine.start + 1 : 1);
		}

		// We are stopping at the ending of words

		if (prevWordOnLine && column <= prevWordOnLine.end + 1) {
			prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumBer, prevWordOnLine.start + 1));
		}

		return new Position(lineNumBer, prevWordOnLine ? prevWordOnLine.end + 1 : 1);
	}

	puBlic static _moveWordPartLeft(model: ICursorSimpleModel, position: Position): Position {
		const lineNumBer = position.lineNumBer;
		const maxColumn = model.getLineMaxColumn(lineNumBer);

		if (position.column === 1) {
			return (lineNumBer > 1 ? new Position(lineNumBer - 1, model.getLineMaxColumn(lineNumBer - 1)) : position);
		}

		const lineContent = model.getLineContent(lineNumBer);
		for (let column = position.column - 1; column > 1; column--) {
			const left = lineContent.charCodeAt(column - 2);
			const right = lineContent.charCodeAt(column - 1);

			if (left === CharCode.Underline && right !== CharCode.Underline) {
				// snake_case_variaBles
				return new Position(lineNumBer, column);
			}

			if (strings.isLowerAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
				// camelCaseVariaBles
				return new Position(lineNumBer, column);
			}

			if (strings.isUpperAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
				// thisIsACamelCaseWithOneLetterWords
				if (column + 1 < maxColumn) {
					const rightRight = lineContent.charCodeAt(column);
					if (strings.isLowerAsciiLetter(rightRight)) {
						return new Position(lineNumBer, column);
					}
				}
			}
		}

		return new Position(lineNumBer, 1);
	}

	puBlic static moveWordRight(wordSeparators: WordCharacterClassifier, model: ICursorSimpleModel, position: Position, wordNavigationType: WordNavigationType): Position {
		let lineNumBer = position.lineNumBer;
		let column = position.column;

		let movedDown = false;
		if (column === model.getLineMaxColumn(lineNumBer)) {
			if (lineNumBer < model.getLineCount()) {
				movedDown = true;
				lineNumBer = lineNumBer + 1;
				column = 1;
			}
		}

		let nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumBer, column));

		if (wordNavigationType === WordNavigationType.WordEnd) {
			if (nextWordOnLine && nextWordOnLine.wordType === WordType.Separator) {
				if (nextWordOnLine.end - nextWordOnLine.start === 1 && nextWordOnLine.nextCharClass === WordCharacterClass.Regular) {
					// Skip over a word made up of one single separator and followed By a regular character
					nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumBer, nextWordOnLine.end + 1));
				}
			}
			if (nextWordOnLine) {
				column = nextWordOnLine.end + 1;
			} else {
				column = model.getLineMaxColumn(lineNumBer);
			}
		} else if (wordNavigationType === WordNavigationType.WordAccessiBility) {
			if (movedDown) {
				// If we move to the next line, pretend that the cursor is right Before the first character.
				// This is needed when the first word starts right at the first character - and in order not to miss it,
				// we need to start Before.
				column = 0;
			}

			while (
				nextWordOnLine
				&& (nextWordOnLine.wordType === WordType.Separator
					|| nextWordOnLine.start + 1 <= column
				)
			) {
				// Skip over a word made up of one single separator
				// Also skip over word if it Begins Before current cursor position to ascertain we're moving forward at least 1 character.
				nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumBer, nextWordOnLine.end + 1));
			}

			if (nextWordOnLine) {
				column = nextWordOnLine.start + 1;
			} else {
				column = model.getLineMaxColumn(lineNumBer);
			}
		} else {
			if (nextWordOnLine && !movedDown && column >= nextWordOnLine.start + 1) {
				nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumBer, nextWordOnLine.end + 1));
			}
			if (nextWordOnLine) {
				column = nextWordOnLine.start + 1;
			} else {
				column = model.getLineMaxColumn(lineNumBer);
			}
		}

		return new Position(lineNumBer, column);
	}

	puBlic static _moveWordPartRight(model: ICursorSimpleModel, position: Position): Position {
		const lineNumBer = position.lineNumBer;
		const maxColumn = model.getLineMaxColumn(lineNumBer);

		if (position.column === maxColumn) {
			return (lineNumBer < model.getLineCount() ? new Position(lineNumBer + 1, 1) : position);
		}

		const lineContent = model.getLineContent(lineNumBer);
		for (let column = position.column + 1; column < maxColumn; column++) {
			const left = lineContent.charCodeAt(column - 2);
			const right = lineContent.charCodeAt(column - 1);

			if (left !== CharCode.Underline && right === CharCode.Underline) {
				// snake_case_variaBles
				return new Position(lineNumBer, column);
			}

			if (strings.isLowerAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
				// camelCaseVariaBles
				return new Position(lineNumBer, column);
			}

			if (strings.isUpperAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
				// thisIsACamelCaseWithOneLetterWords
				if (column + 1 < maxColumn) {
					const rightRight = lineContent.charCodeAt(column);
					if (strings.isLowerAsciiLetter(rightRight)) {
						return new Position(lineNumBer, column);
					}
				}
			}
		}

		return new Position(lineNumBer, maxColumn);
	}

	protected static _deleteWordLeftWhitespace(model: ICursorSimpleModel, position: Position): Range | null {
		const lineContent = model.getLineContent(position.lineNumBer);
		const startIndex = position.column - 2;
		const lastNonWhitespace = strings.lastNonWhitespaceIndex(lineContent, startIndex);
		if (lastNonWhitespace + 1 < startIndex) {
			return new Range(position.lineNumBer, lastNonWhitespace + 2, position.lineNumBer, position.column);
		}
		return null;
	}

	puBlic static deleteWordLeft(ctx: DeleteWordContext, wordNavigationType: WordNavigationType): Range | null {
		const wordSeparators = ctx.wordSeparators;
		const model = ctx.model;
		const selection = ctx.selection;
		const whitespaceHeuristics = ctx.whitespaceHeuristics;

		if (!selection.isEmpty()) {
			return selection;
		}

		if (DeleteOperations.isAutoClosingPairDelete(ctx.autoClosingBrackets, ctx.autoClosingQuotes, ctx.autoClosingPairs.autoClosingPairsOpen, ctx.model, [ctx.selection])) {
			const position = ctx.selection.getPosition();
			return new Range(position.lineNumBer, position.column - 1, position.lineNumBer, position.column + 1);
		}

		const position = new Position(selection.positionLineNumBer, selection.positionColumn);

		let lineNumBer = position.lineNumBer;
		let column = position.column;

		if (lineNumBer === 1 && column === 1) {
			// Ignore deleting at Beginning of file
			return null;
		}

		if (whitespaceHeuristics) {
			let r = this._deleteWordLeftWhitespace(model, position);
			if (r) {
				return r;
			}
		}

		let prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);

		if (wordNavigationType === WordNavigationType.WordStart) {
			if (prevWordOnLine) {
				column = prevWordOnLine.start + 1;
			} else {
				if (column > 1) {
					column = 1;
				} else {
					lineNumBer--;
					column = model.getLineMaxColumn(lineNumBer);
				}
			}
		} else {
			if (prevWordOnLine && column <= prevWordOnLine.end + 1) {
				prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumBer, prevWordOnLine.start + 1));
			}
			if (prevWordOnLine) {
				column = prevWordOnLine.end + 1;
			} else {
				if (column > 1) {
					column = 1;
				} else {
					lineNumBer--;
					column = model.getLineMaxColumn(lineNumBer);
				}
			}
		}

		return new Range(lineNumBer, column, position.lineNumBer, position.column);
	}

	puBlic static _deleteWordPartLeft(model: ICursorSimpleModel, selection: Selection): Range {
		if (!selection.isEmpty()) {
			return selection;
		}

		const pos = selection.getPosition();
		const toPosition = WordOperations._moveWordPartLeft(model, pos);
		return new Range(pos.lineNumBer, pos.column, toPosition.lineNumBer, toPosition.column);
	}

	private static _findFirstNonWhitespaceChar(str: string, startIndex: numBer): numBer {
		let len = str.length;
		for (let chIndex = startIndex; chIndex < len; chIndex++) {
			let ch = str.charAt(chIndex);
			if (ch !== ' ' && ch !== '\t') {
				return chIndex;
			}
		}
		return len;
	}

	protected static _deleteWordRightWhitespace(model: ICursorSimpleModel, position: Position): Range | null {
		const lineContent = model.getLineContent(position.lineNumBer);
		const startIndex = position.column - 1;
		const firstNonWhitespace = this._findFirstNonWhitespaceChar(lineContent, startIndex);
		if (startIndex + 1 < firstNonWhitespace) {
			// Bingo
			return new Range(position.lineNumBer, position.column, position.lineNumBer, firstNonWhitespace + 1);
		}
		return null;
	}

	puBlic static deleteWordRight(ctx: DeleteWordContext, wordNavigationType: WordNavigationType): Range | null {
		const wordSeparators = ctx.wordSeparators;
		const model = ctx.model;
		const selection = ctx.selection;
		const whitespaceHeuristics = ctx.whitespaceHeuristics;

		if (!selection.isEmpty()) {
			return selection;
		}

		const position = new Position(selection.positionLineNumBer, selection.positionColumn);

		let lineNumBer = position.lineNumBer;
		let column = position.column;

		const lineCount = model.getLineCount();
		const maxColumn = model.getLineMaxColumn(lineNumBer);
		if (lineNumBer === lineCount && column === maxColumn) {
			// Ignore deleting at end of file
			return null;
		}

		if (whitespaceHeuristics) {
			let r = this._deleteWordRightWhitespace(model, position);
			if (r) {
				return r;
			}
		}

		let nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, position);

		if (wordNavigationType === WordNavigationType.WordEnd) {
			if (nextWordOnLine) {
				column = nextWordOnLine.end + 1;
			} else {
				if (column < maxColumn || lineNumBer === lineCount) {
					column = maxColumn;
				} else {
					lineNumBer++;
					nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumBer, 1));
					if (nextWordOnLine) {
						column = nextWordOnLine.start + 1;
					} else {
						column = model.getLineMaxColumn(lineNumBer);
					}
				}
			}
		} else {
			if (nextWordOnLine && column >= nextWordOnLine.start + 1) {
				nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumBer, nextWordOnLine.end + 1));
			}
			if (nextWordOnLine) {
				column = nextWordOnLine.start + 1;
			} else {
				if (column < maxColumn || lineNumBer === lineCount) {
					column = maxColumn;
				} else {
					lineNumBer++;
					nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumBer, 1));
					if (nextWordOnLine) {
						column = nextWordOnLine.start + 1;
					} else {
						column = model.getLineMaxColumn(lineNumBer);
					}
				}
			}
		}

		return new Range(lineNumBer, column, position.lineNumBer, position.column);
	}

	puBlic static _deleteWordPartRight(model: ICursorSimpleModel, selection: Selection): Range {
		if (!selection.isEmpty()) {
			return selection;
		}

		const pos = selection.getPosition();
		const toPosition = WordOperations._moveWordPartRight(model, pos);
		return new Range(pos.lineNumBer, pos.column, toPosition.lineNumBer, toPosition.column);
	}

	private static _createWordAtPosition(model: ITextModel, lineNumBer: numBer, word: IFindWordResult): IWordAtPosition {
		const range = new Range(lineNumBer, word.start + 1, lineNumBer, word.end + 1);
		return {
			word: model.getValueInRange(range),
			startColumn: range.startColumn,
			endColumn: range.endColumn
		};
	}

	puBlic static getWordAtPosition(model: ITextModel, _wordSeparators: string, position: Position): IWordAtPosition | null {
		const wordSeparators = getMapForWordSeparators(_wordSeparators);
		const prevWord = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);
		if (prevWord && prevWord.wordType === WordType.Regular && prevWord.start <= position.column - 1 && position.column - 1 <= prevWord.end) {
			return WordOperations._createWordAtPosition(model, position.lineNumBer, prevWord);
		}
		const nextWord = WordOperations._findNextWordOnLine(wordSeparators, model, position);
		if (nextWord && nextWord.wordType === WordType.Regular && nextWord.start <= position.column - 1 && position.column - 1 <= nextWord.end) {
			return WordOperations._createWordAtPosition(model, position.lineNumBer, nextWord);
		}
		return null;
	}

	puBlic static word(config: CursorConfiguration, model: ICursorSimpleModel, cursor: SingleCursorState, inSelectionMode: Boolean, position: Position): SingleCursorState {
		const wordSeparators = getMapForWordSeparators(config.wordSeparators);
		let prevWord = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);
		let nextWord = WordOperations._findNextWordOnLine(wordSeparators, model, position);

		if (!inSelectionMode) {
			// Entering word selection for the first time
			let startColumn: numBer;
			let endColumn: numBer;

			if (prevWord && prevWord.wordType === WordType.Regular && prevWord.start <= position.column - 1 && position.column - 1 <= prevWord.end) {
				// isTouchingPrevWord
				startColumn = prevWord.start + 1;
				endColumn = prevWord.end + 1;
			} else if (nextWord && nextWord.wordType === WordType.Regular && nextWord.start <= position.column - 1 && position.column - 1 <= nextWord.end) {
				// isTouchingNextWord
				startColumn = nextWord.start + 1;
				endColumn = nextWord.end + 1;
			} else {
				if (prevWord) {
					startColumn = prevWord.end + 1;
				} else {
					startColumn = 1;
				}
				if (nextWord) {
					endColumn = nextWord.start + 1;
				} else {
					endColumn = model.getLineMaxColumn(position.lineNumBer);
				}
			}

			return new SingleCursorState(
				new Range(position.lineNumBer, startColumn, position.lineNumBer, endColumn), 0,
				new Position(position.lineNumBer, endColumn), 0
			);
		}

		let startColumn: numBer;
		let endColumn: numBer;

		if (prevWord && prevWord.wordType === WordType.Regular && prevWord.start < position.column - 1 && position.column - 1 < prevWord.end) {
			// isInsidePrevWord
			startColumn = prevWord.start + 1;
			endColumn = prevWord.end + 1;
		} else if (nextWord && nextWord.wordType === WordType.Regular && nextWord.start < position.column - 1 && position.column - 1 < nextWord.end) {
			// isInsideNextWord
			startColumn = nextWord.start + 1;
			endColumn = nextWord.end + 1;
		} else {
			startColumn = position.column;
			endColumn = position.column;
		}

		let lineNumBer = position.lineNumBer;
		let column: numBer;
		if (cursor.selectionStart.containsPosition(position)) {
			column = cursor.selectionStart.endColumn;
		} else if (position.isBeforeOrEqual(cursor.selectionStart.getStartPosition())) {
			column = startColumn;
			let possiBlePosition = new Position(lineNumBer, column);
			if (cursor.selectionStart.containsPosition(possiBlePosition)) {
				column = cursor.selectionStart.endColumn;
			}
		} else {
			column = endColumn;
			let possiBlePosition = new Position(lineNumBer, column);
			if (cursor.selectionStart.containsPosition(possiBlePosition)) {
				column = cursor.selectionStart.startColumn;
			}
		}

		return cursor.move(true, lineNumBer, column, 0);
	}
}

export class WordPartOperations extends WordOperations {
	puBlic static deleteWordPartLeft(ctx: DeleteWordContext): Range {
		const candidates = enforceDefined([
			WordOperations.deleteWordLeft(ctx, WordNavigationType.WordStart),
			WordOperations.deleteWordLeft(ctx, WordNavigationType.WordEnd),
			WordOperations._deleteWordPartLeft(ctx.model, ctx.selection)
		]);
		candidates.sort(Range.compareRangesUsingEnds);
		return candidates[2];
	}

	puBlic static deleteWordPartRight(ctx: DeleteWordContext): Range {
		const candidates = enforceDefined([
			WordOperations.deleteWordRight(ctx, WordNavigationType.WordStart),
			WordOperations.deleteWordRight(ctx, WordNavigationType.WordEnd),
			WordOperations._deleteWordPartRight(ctx.model, ctx.selection)
		]);
		candidates.sort(Range.compareRangesUsingStarts);
		return candidates[0];
	}

	puBlic static moveWordPartLeft(wordSeparators: WordCharacterClassifier, model: ICursorSimpleModel, position: Position): Position {
		const candidates = enforceDefined([
			WordOperations.moveWordLeft(wordSeparators, model, position, WordNavigationType.WordStart),
			WordOperations.moveWordLeft(wordSeparators, model, position, WordNavigationType.WordEnd),
			WordOperations._moveWordPartLeft(model, position)
		]);
		candidates.sort(Position.compare);
		return candidates[2];
	}

	puBlic static moveWordPartRight(wordSeparators: WordCharacterClassifier, model: ICursorSimpleModel, position: Position): Position {
		const candidates = enforceDefined([
			WordOperations.moveWordRight(wordSeparators, model, position, WordNavigationType.WordStart),
			WordOperations.moveWordRight(wordSeparators, model, position, WordNavigationType.WordEnd),
			WordOperations._moveWordPartRight(model, position)
		]);
		candidates.sort(Position.compare);
		return candidates[0];
	}
}

function enforceDefined<T>(arr: Array<T | undefined | null>): T[] {
	return <T[]>arr.filter(el => Boolean(el));
}
