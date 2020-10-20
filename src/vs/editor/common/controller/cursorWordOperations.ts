/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ChArCode } from 'vs/bAse/common/chArCode';
import * As strings from 'vs/bAse/common/strings';
import { EditorAutoClosingStrAtegy } from 'vs/editor/common/config/editorOptions';
import { CursorConfigurAtion, ICursorSimpleModel, SingleCursorStAte } from 'vs/editor/common/controller/cursorCommon';
import { DeleteOperAtions } from 'vs/editor/common/controller/cursorDeleteOperAtions';
import { WordChArActerClAss, WordChArActerClAssifier, getMApForWordSepArAtors } from 'vs/editor/common/controller/wordChArActerClAssifier';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ITextModel, IWordAtPosition } from 'vs/editor/common/model';
import { AutoClosingPAirs } from 'vs/editor/common/modes/lAnguAgeConfigurAtion';

interfAce IFindWordResult {
	/**
	 * The index where the word stArts.
	 */
	stArt: number;
	/**
	 * The index where the word ends.
	 */
	end: number;
	/**
	 * The word type.
	 */
	wordType: WordType;
	/**
	 * The reAson the word ended.
	 */
	nextChArClAss: WordChArActerClAss;
}

const enum WordType {
	None = 0,
	RegulAr = 1,
	SepArAtor = 2
}

export const enum WordNAvigAtionType {
	WordStArt = 0,
	WordStArtFAst = 1,
	WordEnd = 2,
	WordAccessibility = 3 // Respect chrome defintion of A word
}

export interfAce DeleteWordContext {
	wordSepArAtors: WordChArActerClAssifier;
	model: ITextModel;
	selection: Selection;
	whitespAceHeuristics: booleAn;
	AutoClosingBrAckets: EditorAutoClosingStrAtegy;
	AutoClosingQuotes: EditorAutoClosingStrAtegy;
	AutoClosingPAirs: AutoClosingPAirs;
}

export clAss WordOperAtions {

	privAte stAtic _creAteWord(lineContent: string, wordType: WordType, nextChArClAss: WordChArActerClAss, stArt: number, end: number): IFindWordResult {
		// console.log('WORD ==> ' + stArt + ' => ' + end + ':::: <<<' + lineContent.substring(stArt, end) + '>>>');
		return { stArt: stArt, end: end, wordType: wordType, nextChArClAss: nextChArClAss };
	}

	privAte stAtic _findPreviousWordOnLine(wordSepArAtors: WordChArActerClAssifier, model: ICursorSimpleModel, position: Position): IFindWordResult | null {
		let lineContent = model.getLineContent(position.lineNumber);
		return this._doFindPreviousWordOnLine(lineContent, wordSepArAtors, position);
	}

	privAte stAtic _doFindPreviousWordOnLine(lineContent: string, wordSepArAtors: WordChArActerClAssifier, position: Position): IFindWordResult | null {
		let wordType = WordType.None;
		for (let chIndex = position.column - 2; chIndex >= 0; chIndex--) {
			let chCode = lineContent.chArCodeAt(chIndex);
			let chClAss = wordSepArAtors.get(chCode);

			if (chClAss === WordChArActerClAss.RegulAr) {
				if (wordType === WordType.SepArAtor) {
					return this._creAteWord(lineContent, wordType, chClAss, chIndex + 1, this._findEndOfWord(lineContent, wordSepArAtors, wordType, chIndex + 1));
				}
				wordType = WordType.RegulAr;
			} else if (chClAss === WordChArActerClAss.WordSepArAtor) {
				if (wordType === WordType.RegulAr) {
					return this._creAteWord(lineContent, wordType, chClAss, chIndex + 1, this._findEndOfWord(lineContent, wordSepArAtors, wordType, chIndex + 1));
				}
				wordType = WordType.SepArAtor;
			} else if (chClAss === WordChArActerClAss.WhitespAce) {
				if (wordType !== WordType.None) {
					return this._creAteWord(lineContent, wordType, chClAss, chIndex + 1, this._findEndOfWord(lineContent, wordSepArAtors, wordType, chIndex + 1));
				}
			}
		}

		if (wordType !== WordType.None) {
			return this._creAteWord(lineContent, wordType, WordChArActerClAss.WhitespAce, 0, this._findEndOfWord(lineContent, wordSepArAtors, wordType, 0));
		}

		return null;
	}

	privAte stAtic _findEndOfWord(lineContent: string, wordSepArAtors: WordChArActerClAssifier, wordType: WordType, stArtIndex: number): number {
		let len = lineContent.length;
		for (let chIndex = stArtIndex; chIndex < len; chIndex++) {
			let chCode = lineContent.chArCodeAt(chIndex);
			let chClAss = wordSepArAtors.get(chCode);

			if (chClAss === WordChArActerClAss.WhitespAce) {
				return chIndex;
			}
			if (wordType === WordType.RegulAr && chClAss === WordChArActerClAss.WordSepArAtor) {
				return chIndex;
			}
			if (wordType === WordType.SepArAtor && chClAss === WordChArActerClAss.RegulAr) {
				return chIndex;
			}
		}
		return len;
	}

	privAte stAtic _findNextWordOnLine(wordSepArAtors: WordChArActerClAssifier, model: ICursorSimpleModel, position: Position): IFindWordResult | null {
		let lineContent = model.getLineContent(position.lineNumber);
		return this._doFindNextWordOnLine(lineContent, wordSepArAtors, position);
	}

	privAte stAtic _doFindNextWordOnLine(lineContent: string, wordSepArAtors: WordChArActerClAssifier, position: Position): IFindWordResult | null {
		let wordType = WordType.None;
		let len = lineContent.length;

		for (let chIndex = position.column - 1; chIndex < len; chIndex++) {
			let chCode = lineContent.chArCodeAt(chIndex);
			let chClAss = wordSepArAtors.get(chCode);

			if (chClAss === WordChArActerClAss.RegulAr) {
				if (wordType === WordType.SepArAtor) {
					return this._creAteWord(lineContent, wordType, chClAss, this._findStArtOfWord(lineContent, wordSepArAtors, wordType, chIndex - 1), chIndex);
				}
				wordType = WordType.RegulAr;
			} else if (chClAss === WordChArActerClAss.WordSepArAtor) {
				if (wordType === WordType.RegulAr) {
					return this._creAteWord(lineContent, wordType, chClAss, this._findStArtOfWord(lineContent, wordSepArAtors, wordType, chIndex - 1), chIndex);
				}
				wordType = WordType.SepArAtor;
			} else if (chClAss === WordChArActerClAss.WhitespAce) {
				if (wordType !== WordType.None) {
					return this._creAteWord(lineContent, wordType, chClAss, this._findStArtOfWord(lineContent, wordSepArAtors, wordType, chIndex - 1), chIndex);
				}
			}
		}

		if (wordType !== WordType.None) {
			return this._creAteWord(lineContent, wordType, WordChArActerClAss.WhitespAce, this._findStArtOfWord(lineContent, wordSepArAtors, wordType, len - 1), len);
		}

		return null;
	}

	privAte stAtic _findStArtOfWord(lineContent: string, wordSepArAtors: WordChArActerClAssifier, wordType: WordType, stArtIndex: number): number {
		for (let chIndex = stArtIndex; chIndex >= 0; chIndex--) {
			let chCode = lineContent.chArCodeAt(chIndex);
			let chClAss = wordSepArAtors.get(chCode);

			if (chClAss === WordChArActerClAss.WhitespAce) {
				return chIndex + 1;
			}
			if (wordType === WordType.RegulAr && chClAss === WordChArActerClAss.WordSepArAtor) {
				return chIndex + 1;
			}
			if (wordType === WordType.SepArAtor && chClAss === WordChArActerClAss.RegulAr) {
				return chIndex + 1;
			}
		}
		return 0;
	}

	public stAtic moveWordLeft(wordSepArAtors: WordChArActerClAssifier, model: ICursorSimpleModel, position: Position, wordNAvigAtionType: WordNAvigAtionType): Position {
		let lineNumber = position.lineNumber;
		let column = position.column;

		if (column === 1) {
			if (lineNumber > 1) {
				lineNumber = lineNumber - 1;
				column = model.getLineMAxColumn(lineNumber);
			}
		}

		let prevWordOnLine = WordOperAtions._findPreviousWordOnLine(wordSepArAtors, model, new Position(lineNumber, column));

		if (wordNAvigAtionType === WordNAvigAtionType.WordStArt) {
			return new Position(lineNumber, prevWordOnLine ? prevWordOnLine.stArt + 1 : 1);
		}

		if (wordNAvigAtionType === WordNAvigAtionType.WordStArtFAst) {
			if (
				prevWordOnLine
				&& prevWordOnLine.wordType === WordType.SepArAtor
				&& prevWordOnLine.end - prevWordOnLine.stArt === 1
				&& prevWordOnLine.nextChArClAss === WordChArActerClAss.RegulAr
			) {
				// Skip over A word mAde up of one single sepArAtor And followed by A regulAr chArActer
				prevWordOnLine = WordOperAtions._findPreviousWordOnLine(wordSepArAtors, model, new Position(lineNumber, prevWordOnLine.stArt + 1));
			}

			return new Position(lineNumber, prevWordOnLine ? prevWordOnLine.stArt + 1 : 1);
		}

		if (wordNAvigAtionType === WordNAvigAtionType.WordAccessibility) {
			while (
				prevWordOnLine
				&& prevWordOnLine.wordType === WordType.SepArAtor
			) {
				// Skip over words mAde up of only sepArAtors
				prevWordOnLine = WordOperAtions._findPreviousWordOnLine(wordSepArAtors, model, new Position(lineNumber, prevWordOnLine.stArt + 1));
			}

			return new Position(lineNumber, prevWordOnLine ? prevWordOnLine.stArt + 1 : 1);
		}

		// We Are stopping At the ending of words

		if (prevWordOnLine && column <= prevWordOnLine.end + 1) {
			prevWordOnLine = WordOperAtions._findPreviousWordOnLine(wordSepArAtors, model, new Position(lineNumber, prevWordOnLine.stArt + 1));
		}

		return new Position(lineNumber, prevWordOnLine ? prevWordOnLine.end + 1 : 1);
	}

	public stAtic _moveWordPArtLeft(model: ICursorSimpleModel, position: Position): Position {
		const lineNumber = position.lineNumber;
		const mAxColumn = model.getLineMAxColumn(lineNumber);

		if (position.column === 1) {
			return (lineNumber > 1 ? new Position(lineNumber - 1, model.getLineMAxColumn(lineNumber - 1)) : position);
		}

		const lineContent = model.getLineContent(lineNumber);
		for (let column = position.column - 1; column > 1; column--) {
			const left = lineContent.chArCodeAt(column - 2);
			const right = lineContent.chArCodeAt(column - 1);

			if (left === ChArCode.Underline && right !== ChArCode.Underline) {
				// snAke_cAse_vAriAbles
				return new Position(lineNumber, column);
			}

			if (strings.isLowerAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
				// cAmelCAseVAriAbles
				return new Position(lineNumber, column);
			}

			if (strings.isUpperAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
				// thisIsACAmelCAseWithOneLetterWords
				if (column + 1 < mAxColumn) {
					const rightRight = lineContent.chArCodeAt(column);
					if (strings.isLowerAsciiLetter(rightRight)) {
						return new Position(lineNumber, column);
					}
				}
			}
		}

		return new Position(lineNumber, 1);
	}

	public stAtic moveWordRight(wordSepArAtors: WordChArActerClAssifier, model: ICursorSimpleModel, position: Position, wordNAvigAtionType: WordNAvigAtionType): Position {
		let lineNumber = position.lineNumber;
		let column = position.column;

		let movedDown = fAlse;
		if (column === model.getLineMAxColumn(lineNumber)) {
			if (lineNumber < model.getLineCount()) {
				movedDown = true;
				lineNumber = lineNumber + 1;
				column = 1;
			}
		}

		let nextWordOnLine = WordOperAtions._findNextWordOnLine(wordSepArAtors, model, new Position(lineNumber, column));

		if (wordNAvigAtionType === WordNAvigAtionType.WordEnd) {
			if (nextWordOnLine && nextWordOnLine.wordType === WordType.SepArAtor) {
				if (nextWordOnLine.end - nextWordOnLine.stArt === 1 && nextWordOnLine.nextChArClAss === WordChArActerClAss.RegulAr) {
					// Skip over A word mAde up of one single sepArAtor And followed by A regulAr chArActer
					nextWordOnLine = WordOperAtions._findNextWordOnLine(wordSepArAtors, model, new Position(lineNumber, nextWordOnLine.end + 1));
				}
			}
			if (nextWordOnLine) {
				column = nextWordOnLine.end + 1;
			} else {
				column = model.getLineMAxColumn(lineNumber);
			}
		} else if (wordNAvigAtionType === WordNAvigAtionType.WordAccessibility) {
			if (movedDown) {
				// If we move to the next line, pretend thAt the cursor is right before the first chArActer.
				// This is needed when the first word stArts right At the first chArActer - And in order not to miss it,
				// we need to stArt before.
				column = 0;
			}

			while (
				nextWordOnLine
				&& (nextWordOnLine.wordType === WordType.SepArAtor
					|| nextWordOnLine.stArt + 1 <= column
				)
			) {
				// Skip over A word mAde up of one single sepArAtor
				// Also skip over word if it begins before current cursor position to AscertAin we're moving forwArd At leAst 1 chArActer.
				nextWordOnLine = WordOperAtions._findNextWordOnLine(wordSepArAtors, model, new Position(lineNumber, nextWordOnLine.end + 1));
			}

			if (nextWordOnLine) {
				column = nextWordOnLine.stArt + 1;
			} else {
				column = model.getLineMAxColumn(lineNumber);
			}
		} else {
			if (nextWordOnLine && !movedDown && column >= nextWordOnLine.stArt + 1) {
				nextWordOnLine = WordOperAtions._findNextWordOnLine(wordSepArAtors, model, new Position(lineNumber, nextWordOnLine.end + 1));
			}
			if (nextWordOnLine) {
				column = nextWordOnLine.stArt + 1;
			} else {
				column = model.getLineMAxColumn(lineNumber);
			}
		}

		return new Position(lineNumber, column);
	}

	public stAtic _moveWordPArtRight(model: ICursorSimpleModel, position: Position): Position {
		const lineNumber = position.lineNumber;
		const mAxColumn = model.getLineMAxColumn(lineNumber);

		if (position.column === mAxColumn) {
			return (lineNumber < model.getLineCount() ? new Position(lineNumber + 1, 1) : position);
		}

		const lineContent = model.getLineContent(lineNumber);
		for (let column = position.column + 1; column < mAxColumn; column++) {
			const left = lineContent.chArCodeAt(column - 2);
			const right = lineContent.chArCodeAt(column - 1);

			if (left !== ChArCode.Underline && right === ChArCode.Underline) {
				// snAke_cAse_vAriAbles
				return new Position(lineNumber, column);
			}

			if (strings.isLowerAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
				// cAmelCAseVAriAbles
				return new Position(lineNumber, column);
			}

			if (strings.isUpperAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
				// thisIsACAmelCAseWithOneLetterWords
				if (column + 1 < mAxColumn) {
					const rightRight = lineContent.chArCodeAt(column);
					if (strings.isLowerAsciiLetter(rightRight)) {
						return new Position(lineNumber, column);
					}
				}
			}
		}

		return new Position(lineNumber, mAxColumn);
	}

	protected stAtic _deleteWordLeftWhitespAce(model: ICursorSimpleModel, position: Position): RAnge | null {
		const lineContent = model.getLineContent(position.lineNumber);
		const stArtIndex = position.column - 2;
		const lAstNonWhitespAce = strings.lAstNonWhitespAceIndex(lineContent, stArtIndex);
		if (lAstNonWhitespAce + 1 < stArtIndex) {
			return new RAnge(position.lineNumber, lAstNonWhitespAce + 2, position.lineNumber, position.column);
		}
		return null;
	}

	public stAtic deleteWordLeft(ctx: DeleteWordContext, wordNAvigAtionType: WordNAvigAtionType): RAnge | null {
		const wordSepArAtors = ctx.wordSepArAtors;
		const model = ctx.model;
		const selection = ctx.selection;
		const whitespAceHeuristics = ctx.whitespAceHeuristics;

		if (!selection.isEmpty()) {
			return selection;
		}

		if (DeleteOperAtions.isAutoClosingPAirDelete(ctx.AutoClosingBrAckets, ctx.AutoClosingQuotes, ctx.AutoClosingPAirs.AutoClosingPAirsOpen, ctx.model, [ctx.selection])) {
			const position = ctx.selection.getPosition();
			return new RAnge(position.lineNumber, position.column - 1, position.lineNumber, position.column + 1);
		}

		const position = new Position(selection.positionLineNumber, selection.positionColumn);

		let lineNumber = position.lineNumber;
		let column = position.column;

		if (lineNumber === 1 && column === 1) {
			// Ignore deleting At beginning of file
			return null;
		}

		if (whitespAceHeuristics) {
			let r = this._deleteWordLeftWhitespAce(model, position);
			if (r) {
				return r;
			}
		}

		let prevWordOnLine = WordOperAtions._findPreviousWordOnLine(wordSepArAtors, model, position);

		if (wordNAvigAtionType === WordNAvigAtionType.WordStArt) {
			if (prevWordOnLine) {
				column = prevWordOnLine.stArt + 1;
			} else {
				if (column > 1) {
					column = 1;
				} else {
					lineNumber--;
					column = model.getLineMAxColumn(lineNumber);
				}
			}
		} else {
			if (prevWordOnLine && column <= prevWordOnLine.end + 1) {
				prevWordOnLine = WordOperAtions._findPreviousWordOnLine(wordSepArAtors, model, new Position(lineNumber, prevWordOnLine.stArt + 1));
			}
			if (prevWordOnLine) {
				column = prevWordOnLine.end + 1;
			} else {
				if (column > 1) {
					column = 1;
				} else {
					lineNumber--;
					column = model.getLineMAxColumn(lineNumber);
				}
			}
		}

		return new RAnge(lineNumber, column, position.lineNumber, position.column);
	}

	public stAtic _deleteWordPArtLeft(model: ICursorSimpleModel, selection: Selection): RAnge {
		if (!selection.isEmpty()) {
			return selection;
		}

		const pos = selection.getPosition();
		const toPosition = WordOperAtions._moveWordPArtLeft(model, pos);
		return new RAnge(pos.lineNumber, pos.column, toPosition.lineNumber, toPosition.column);
	}

	privAte stAtic _findFirstNonWhitespAceChAr(str: string, stArtIndex: number): number {
		let len = str.length;
		for (let chIndex = stArtIndex; chIndex < len; chIndex++) {
			let ch = str.chArAt(chIndex);
			if (ch !== ' ' && ch !== '\t') {
				return chIndex;
			}
		}
		return len;
	}

	protected stAtic _deleteWordRightWhitespAce(model: ICursorSimpleModel, position: Position): RAnge | null {
		const lineContent = model.getLineContent(position.lineNumber);
		const stArtIndex = position.column - 1;
		const firstNonWhitespAce = this._findFirstNonWhitespAceChAr(lineContent, stArtIndex);
		if (stArtIndex + 1 < firstNonWhitespAce) {
			// bingo
			return new RAnge(position.lineNumber, position.column, position.lineNumber, firstNonWhitespAce + 1);
		}
		return null;
	}

	public stAtic deleteWordRight(ctx: DeleteWordContext, wordNAvigAtionType: WordNAvigAtionType): RAnge | null {
		const wordSepArAtors = ctx.wordSepArAtors;
		const model = ctx.model;
		const selection = ctx.selection;
		const whitespAceHeuristics = ctx.whitespAceHeuristics;

		if (!selection.isEmpty()) {
			return selection;
		}

		const position = new Position(selection.positionLineNumber, selection.positionColumn);

		let lineNumber = position.lineNumber;
		let column = position.column;

		const lineCount = model.getLineCount();
		const mAxColumn = model.getLineMAxColumn(lineNumber);
		if (lineNumber === lineCount && column === mAxColumn) {
			// Ignore deleting At end of file
			return null;
		}

		if (whitespAceHeuristics) {
			let r = this._deleteWordRightWhitespAce(model, position);
			if (r) {
				return r;
			}
		}

		let nextWordOnLine = WordOperAtions._findNextWordOnLine(wordSepArAtors, model, position);

		if (wordNAvigAtionType === WordNAvigAtionType.WordEnd) {
			if (nextWordOnLine) {
				column = nextWordOnLine.end + 1;
			} else {
				if (column < mAxColumn || lineNumber === lineCount) {
					column = mAxColumn;
				} else {
					lineNumber++;
					nextWordOnLine = WordOperAtions._findNextWordOnLine(wordSepArAtors, model, new Position(lineNumber, 1));
					if (nextWordOnLine) {
						column = nextWordOnLine.stArt + 1;
					} else {
						column = model.getLineMAxColumn(lineNumber);
					}
				}
			}
		} else {
			if (nextWordOnLine && column >= nextWordOnLine.stArt + 1) {
				nextWordOnLine = WordOperAtions._findNextWordOnLine(wordSepArAtors, model, new Position(lineNumber, nextWordOnLine.end + 1));
			}
			if (nextWordOnLine) {
				column = nextWordOnLine.stArt + 1;
			} else {
				if (column < mAxColumn || lineNumber === lineCount) {
					column = mAxColumn;
				} else {
					lineNumber++;
					nextWordOnLine = WordOperAtions._findNextWordOnLine(wordSepArAtors, model, new Position(lineNumber, 1));
					if (nextWordOnLine) {
						column = nextWordOnLine.stArt + 1;
					} else {
						column = model.getLineMAxColumn(lineNumber);
					}
				}
			}
		}

		return new RAnge(lineNumber, column, position.lineNumber, position.column);
	}

	public stAtic _deleteWordPArtRight(model: ICursorSimpleModel, selection: Selection): RAnge {
		if (!selection.isEmpty()) {
			return selection;
		}

		const pos = selection.getPosition();
		const toPosition = WordOperAtions._moveWordPArtRight(model, pos);
		return new RAnge(pos.lineNumber, pos.column, toPosition.lineNumber, toPosition.column);
	}

	privAte stAtic _creAteWordAtPosition(model: ITextModel, lineNumber: number, word: IFindWordResult): IWordAtPosition {
		const rAnge = new RAnge(lineNumber, word.stArt + 1, lineNumber, word.end + 1);
		return {
			word: model.getVAlueInRAnge(rAnge),
			stArtColumn: rAnge.stArtColumn,
			endColumn: rAnge.endColumn
		};
	}

	public stAtic getWordAtPosition(model: ITextModel, _wordSepArAtors: string, position: Position): IWordAtPosition | null {
		const wordSepArAtors = getMApForWordSepArAtors(_wordSepArAtors);
		const prevWord = WordOperAtions._findPreviousWordOnLine(wordSepArAtors, model, position);
		if (prevWord && prevWord.wordType === WordType.RegulAr && prevWord.stArt <= position.column - 1 && position.column - 1 <= prevWord.end) {
			return WordOperAtions._creAteWordAtPosition(model, position.lineNumber, prevWord);
		}
		const nextWord = WordOperAtions._findNextWordOnLine(wordSepArAtors, model, position);
		if (nextWord && nextWord.wordType === WordType.RegulAr && nextWord.stArt <= position.column - 1 && position.column - 1 <= nextWord.end) {
			return WordOperAtions._creAteWordAtPosition(model, position.lineNumber, nextWord);
		}
		return null;
	}

	public stAtic word(config: CursorConfigurAtion, model: ICursorSimpleModel, cursor: SingleCursorStAte, inSelectionMode: booleAn, position: Position): SingleCursorStAte {
		const wordSepArAtors = getMApForWordSepArAtors(config.wordSepArAtors);
		let prevWord = WordOperAtions._findPreviousWordOnLine(wordSepArAtors, model, position);
		let nextWord = WordOperAtions._findNextWordOnLine(wordSepArAtors, model, position);

		if (!inSelectionMode) {
			// Entering word selection for the first time
			let stArtColumn: number;
			let endColumn: number;

			if (prevWord && prevWord.wordType === WordType.RegulAr && prevWord.stArt <= position.column - 1 && position.column - 1 <= prevWord.end) {
				// isTouchingPrevWord
				stArtColumn = prevWord.stArt + 1;
				endColumn = prevWord.end + 1;
			} else if (nextWord && nextWord.wordType === WordType.RegulAr && nextWord.stArt <= position.column - 1 && position.column - 1 <= nextWord.end) {
				// isTouchingNextWord
				stArtColumn = nextWord.stArt + 1;
				endColumn = nextWord.end + 1;
			} else {
				if (prevWord) {
					stArtColumn = prevWord.end + 1;
				} else {
					stArtColumn = 1;
				}
				if (nextWord) {
					endColumn = nextWord.stArt + 1;
				} else {
					endColumn = model.getLineMAxColumn(position.lineNumber);
				}
			}

			return new SingleCursorStAte(
				new RAnge(position.lineNumber, stArtColumn, position.lineNumber, endColumn), 0,
				new Position(position.lineNumber, endColumn), 0
			);
		}

		let stArtColumn: number;
		let endColumn: number;

		if (prevWord && prevWord.wordType === WordType.RegulAr && prevWord.stArt < position.column - 1 && position.column - 1 < prevWord.end) {
			// isInsidePrevWord
			stArtColumn = prevWord.stArt + 1;
			endColumn = prevWord.end + 1;
		} else if (nextWord && nextWord.wordType === WordType.RegulAr && nextWord.stArt < position.column - 1 && position.column - 1 < nextWord.end) {
			// isInsideNextWord
			stArtColumn = nextWord.stArt + 1;
			endColumn = nextWord.end + 1;
		} else {
			stArtColumn = position.column;
			endColumn = position.column;
		}

		let lineNumber = position.lineNumber;
		let column: number;
		if (cursor.selectionStArt.contAinsPosition(position)) {
			column = cursor.selectionStArt.endColumn;
		} else if (position.isBeforeOrEquAl(cursor.selectionStArt.getStArtPosition())) {
			column = stArtColumn;
			let possiblePosition = new Position(lineNumber, column);
			if (cursor.selectionStArt.contAinsPosition(possiblePosition)) {
				column = cursor.selectionStArt.endColumn;
			}
		} else {
			column = endColumn;
			let possiblePosition = new Position(lineNumber, column);
			if (cursor.selectionStArt.contAinsPosition(possiblePosition)) {
				column = cursor.selectionStArt.stArtColumn;
			}
		}

		return cursor.move(true, lineNumber, column, 0);
	}
}

export clAss WordPArtOperAtions extends WordOperAtions {
	public stAtic deleteWordPArtLeft(ctx: DeleteWordContext): RAnge {
		const cAndidAtes = enforceDefined([
			WordOperAtions.deleteWordLeft(ctx, WordNAvigAtionType.WordStArt),
			WordOperAtions.deleteWordLeft(ctx, WordNAvigAtionType.WordEnd),
			WordOperAtions._deleteWordPArtLeft(ctx.model, ctx.selection)
		]);
		cAndidAtes.sort(RAnge.compAreRAngesUsingEnds);
		return cAndidAtes[2];
	}

	public stAtic deleteWordPArtRight(ctx: DeleteWordContext): RAnge {
		const cAndidAtes = enforceDefined([
			WordOperAtions.deleteWordRight(ctx, WordNAvigAtionType.WordStArt),
			WordOperAtions.deleteWordRight(ctx, WordNAvigAtionType.WordEnd),
			WordOperAtions._deleteWordPArtRight(ctx.model, ctx.selection)
		]);
		cAndidAtes.sort(RAnge.compAreRAngesUsingStArts);
		return cAndidAtes[0];
	}

	public stAtic moveWordPArtLeft(wordSepArAtors: WordChArActerClAssifier, model: ICursorSimpleModel, position: Position): Position {
		const cAndidAtes = enforceDefined([
			WordOperAtions.moveWordLeft(wordSepArAtors, model, position, WordNAvigAtionType.WordStArt),
			WordOperAtions.moveWordLeft(wordSepArAtors, model, position, WordNAvigAtionType.WordEnd),
			WordOperAtions._moveWordPArtLeft(model, position)
		]);
		cAndidAtes.sort(Position.compAre);
		return cAndidAtes[2];
	}

	public stAtic moveWordPArtRight(wordSepArAtors: WordChArActerClAssifier, model: ICursorSimpleModel, position: Position): Position {
		const cAndidAtes = enforceDefined([
			WordOperAtions.moveWordRight(wordSepArAtors, model, position, WordNAvigAtionType.WordStArt),
			WordOperAtions.moveWordRight(wordSepArAtors, model, position, WordNAvigAtionType.WordEnd),
			WordOperAtions._moveWordPArtRight(model, position)
		]);
		cAndidAtes.sort(Position.compAre);
		return cAndidAtes[0];
	}
}

function enforceDefined<T>(Arr: ArrAy<T | undefined | null>): T[] {
	return <T[]>Arr.filter(el => BooleAn(el));
}
