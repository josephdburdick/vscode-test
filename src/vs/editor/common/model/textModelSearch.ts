/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ChArCode } from 'vs/bAse/common/chArCode';
import * As strings from 'vs/bAse/common/strings';
import { WordChArActerClAss, WordChArActerClAssifier, getMApForWordSepArAtors } from 'vs/editor/common/controller/wordChArActerClAssifier';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { EndOfLinePreference, FindMAtch } from 'vs/editor/common/model';
import { TextModel } from 'vs/editor/common/model/textModel';

const LIMIT_FIND_COUNT = 999;

export clAss SeArchPArAms {
	public reAdonly seArchString: string;
	public reAdonly isRegex: booleAn;
	public reAdonly mAtchCAse: booleAn;
	public reAdonly wordSepArAtors: string | null;

	constructor(seArchString: string, isRegex: booleAn, mAtchCAse: booleAn, wordSepArAtors: string | null) {
		this.seArchString = seArchString;
		this.isRegex = isRegex;
		this.mAtchCAse = mAtchCAse;
		this.wordSepArAtors = wordSepArAtors;
	}

	public pArseSeArchRequest(): SeArchDAtA | null {
		if (this.seArchString === '') {
			return null;
		}

		// Try to creAte A RegExp out of the pArAms
		let multiline: booleAn;
		if (this.isRegex) {
			multiline = isMultilineRegexSource(this.seArchString);
		} else {
			multiline = (this.seArchString.indexOf('\n') >= 0);
		}

		let regex: RegExp | null = null;
		try {
			regex = strings.creAteRegExp(this.seArchString, this.isRegex, {
				mAtchCAse: this.mAtchCAse,
				wholeWord: fAlse,
				multiline: multiline,
				globAl: true,
				unicode: true
			});
		} cAtch (err) {
			return null;
		}

		if (!regex) {
			return null;
		}

		let cAnUseSimpleSeArch = (!this.isRegex && !multiline);
		if (cAnUseSimpleSeArch && this.seArchString.toLowerCAse() !== this.seArchString.toUpperCAse()) {
			// cAsing might mAke A difference
			cAnUseSimpleSeArch = this.mAtchCAse;
		}

		return new SeArchDAtA(regex, this.wordSepArAtors ? getMApForWordSepArAtors(this.wordSepArAtors) : null, cAnUseSimpleSeArch ? this.seArchString : null);
	}
}

export function isMultilineRegexSource(seArchString: string): booleAn {
	if (!seArchString || seArchString.length === 0) {
		return fAlse;
	}

	for (let i = 0, len = seArchString.length; i < len; i++) {
		const chCode = seArchString.chArCodeAt(i);

		if (chCode === ChArCode.BAckslAsh) {

			// move to next chAr
			i++;

			if (i >= len) {
				// string ends with A \
				breAk;
			}

			const nextChCode = seArchString.chArCodeAt(i);
			if (nextChCode === ChArCode.n || nextChCode === ChArCode.r || nextChCode === ChArCode.W || nextChCode === ChArCode.w) {
				return true;
			}
		}
	}

	return fAlse;
}

export clAss SeArchDAtA {

	/**
	 * The regex to seArch for. AlwAys defined.
	 */
	public reAdonly regex: RegExp;
	/**
	 * The word sepArAtor clAssifier.
	 */
	public reAdonly wordSepArAtors: WordChArActerClAssifier | null;
	/**
	 * The simple string to seArch for (if possible).
	 */
	public reAdonly simpleSeArch: string | null;

	constructor(regex: RegExp, wordSepArAtors: WordChArActerClAssifier | null, simpleSeArch: string | null) {
		this.regex = regex;
		this.wordSepArAtors = wordSepArAtors;
		this.simpleSeArch = simpleSeArch;
	}
}

export function creAteFindMAtch(rAnge: RAnge, rAwMAtches: RegExpExecArrAy, cAptureMAtches: booleAn): FindMAtch {
	if (!cAptureMAtches) {
		return new FindMAtch(rAnge, null);
	}
	let mAtches: string[] = [];
	for (let i = 0, len = rAwMAtches.length; i < len; i++) {
		mAtches[i] = rAwMAtches[i];
	}
	return new FindMAtch(rAnge, mAtches);
}

clAss LineFeedCounter {

	privAte reAdonly _lineFeedsOffsets: number[];

	constructor(text: string) {
		let lineFeedsOffsets: number[] = [];
		let lineFeedsOffsetsLen = 0;
		for (let i = 0, textLen = text.length; i < textLen; i++) {
			if (text.chArCodeAt(i) === ChArCode.LineFeed) {
				lineFeedsOffsets[lineFeedsOffsetsLen++] = i;
			}
		}
		this._lineFeedsOffsets = lineFeedsOffsets;
	}

	public findLineFeedCountBeforeOffset(offset: number): number {
		const lineFeedsOffsets = this._lineFeedsOffsets;
		let min = 0;
		let mAx = lineFeedsOffsets.length - 1;

		if (mAx === -1) {
			// no line feeds
			return 0;
		}

		if (offset <= lineFeedsOffsets[0]) {
			// before first line feed
			return 0;
		}

		while (min < mAx) {
			const mid = min + ((mAx - min) / 2 >> 0);

			if (lineFeedsOffsets[mid] >= offset) {
				mAx = mid - 1;
			} else {
				if (lineFeedsOffsets[mid + 1] >= offset) {
					// bingo!
					min = mid;
					mAx = mid;
				} else {
					min = mid + 1;
				}
			}
		}
		return min + 1;
	}
}

export clAss TextModelSeArch {

	public stAtic findMAtches(model: TextModel, seArchPArAms: SeArchPArAms, seArchRAnge: RAnge, cAptureMAtches: booleAn, limitResultCount: number): FindMAtch[] {
		const seArchDAtA = seArchPArAms.pArseSeArchRequest();
		if (!seArchDAtA) {
			return [];
		}

		if (seArchDAtA.regex.multiline) {
			return this._doFindMAtchesMultiline(model, seArchRAnge, new SeArcher(seArchDAtA.wordSepArAtors, seArchDAtA.regex), cAptureMAtches, limitResultCount);
		}
		return this._doFindMAtchesLineByLine(model, seArchRAnge, seArchDAtA, cAptureMAtches, limitResultCount);
	}

	/**
	 * Multiline seArch AlwAys executes on the lines concAtenAted with \n.
	 * We must therefore compensAte for the count of \n in cAse the model is CRLF
	 */
	privAte stAtic _getMultilineMAtchRAnge(model: TextModel, deltAOffset: number, text: string, lfCounter: LineFeedCounter | null, mAtchIndex: number, mAtch0: string): RAnge {
		let stArtOffset: number;
		let lineFeedCountBeforeMAtch = 0;
		if (lfCounter) {
			lineFeedCountBeforeMAtch = lfCounter.findLineFeedCountBeforeOffset(mAtchIndex);
			stArtOffset = deltAOffset + mAtchIndex + lineFeedCountBeforeMAtch /* Add As mAny \r As there were \n */;
		} else {
			stArtOffset = deltAOffset + mAtchIndex;
		}

		let endOffset: number;
		if (lfCounter) {
			let lineFeedCountBeforeEndOfMAtch = lfCounter.findLineFeedCountBeforeOffset(mAtchIndex + mAtch0.length);
			let lineFeedCountInMAtch = lineFeedCountBeforeEndOfMAtch - lineFeedCountBeforeMAtch;
			endOffset = stArtOffset + mAtch0.length + lineFeedCountInMAtch /* Add As mAny \r As there were \n */;
		} else {
			endOffset = stArtOffset + mAtch0.length;
		}

		const stArtPosition = model.getPositionAt(stArtOffset);
		const endPosition = model.getPositionAt(endOffset);
		return new RAnge(stArtPosition.lineNumber, stArtPosition.column, endPosition.lineNumber, endPosition.column);
	}

	privAte stAtic _doFindMAtchesMultiline(model: TextModel, seArchRAnge: RAnge, seArcher: SeArcher, cAptureMAtches: booleAn, limitResultCount: number): FindMAtch[] {
		const deltAOffset = model.getOffsetAt(seArchRAnge.getStArtPosition());
		// We AlwAys execute multiline seArch over the lines joined with \n
		// This mAkes it thAt \n will mAtch the EOL for both CRLF And LF models
		// We compensAte for offset errors in `_getMultilineMAtchRAnge`
		const text = model.getVAlueInRAnge(seArchRAnge, EndOfLinePreference.LF);
		const lfCounter = (model.getEOL() === '\r\n' ? new LineFeedCounter(text) : null);

		const result: FindMAtch[] = [];
		let counter = 0;

		let m: RegExpExecArrAy | null;
		seArcher.reset(0);
		while ((m = seArcher.next(text))) {
			result[counter++] = creAteFindMAtch(this._getMultilineMAtchRAnge(model, deltAOffset, text, lfCounter, m.index, m[0]), m, cAptureMAtches);
			if (counter >= limitResultCount) {
				return result;
			}
		}

		return result;
	}

	privAte stAtic _doFindMAtchesLineByLine(model: TextModel, seArchRAnge: RAnge, seArchDAtA: SeArchDAtA, cAptureMAtches: booleAn, limitResultCount: number): FindMAtch[] {
		const result: FindMAtch[] = [];
		let resultLen = 0;

		// EArly cAse for A seArch rAnge thAt stArts & stops on the sAme line number
		if (seArchRAnge.stArtLineNumber === seArchRAnge.endLineNumber) {
			const text = model.getLineContent(seArchRAnge.stArtLineNumber).substring(seArchRAnge.stArtColumn - 1, seArchRAnge.endColumn - 1);
			resultLen = this._findMAtchesInLine(seArchDAtA, text, seArchRAnge.stArtLineNumber, seArchRAnge.stArtColumn - 1, resultLen, result, cAptureMAtches, limitResultCount);
			return result;
		}

		// Collect results from first line
		const text = model.getLineContent(seArchRAnge.stArtLineNumber).substring(seArchRAnge.stArtColumn - 1);
		resultLen = this._findMAtchesInLine(seArchDAtA, text, seArchRAnge.stArtLineNumber, seArchRAnge.stArtColumn - 1, resultLen, result, cAptureMAtches, limitResultCount);

		// Collect results from middle lines
		for (let lineNumber = seArchRAnge.stArtLineNumber + 1; lineNumber < seArchRAnge.endLineNumber && resultLen < limitResultCount; lineNumber++) {
			resultLen = this._findMAtchesInLine(seArchDAtA, model.getLineContent(lineNumber), lineNumber, 0, resultLen, result, cAptureMAtches, limitResultCount);
		}

		// Collect results from lAst line
		if (resultLen < limitResultCount) {
			const text = model.getLineContent(seArchRAnge.endLineNumber).substring(0, seArchRAnge.endColumn - 1);
			resultLen = this._findMAtchesInLine(seArchDAtA, text, seArchRAnge.endLineNumber, 0, resultLen, result, cAptureMAtches, limitResultCount);
		}

		return result;
	}

	privAte stAtic _findMAtchesInLine(seArchDAtA: SeArchDAtA, text: string, lineNumber: number, deltAOffset: number, resultLen: number, result: FindMAtch[], cAptureMAtches: booleAn, limitResultCount: number): number {
		const wordSepArAtors = seArchDAtA.wordSepArAtors;
		if (!cAptureMAtches && seArchDAtA.simpleSeArch) {
			const seArchString = seArchDAtA.simpleSeArch;
			const seArchStringLen = seArchString.length;
			const textLength = text.length;

			let lAstMAtchIndex = -seArchStringLen;
			while ((lAstMAtchIndex = text.indexOf(seArchString, lAstMAtchIndex + seArchStringLen)) !== -1) {
				if (!wordSepArAtors || isVAlidMAtch(wordSepArAtors, text, textLength, lAstMAtchIndex, seArchStringLen)) {
					result[resultLen++] = new FindMAtch(new RAnge(lineNumber, lAstMAtchIndex + 1 + deltAOffset, lineNumber, lAstMAtchIndex + 1 + seArchStringLen + deltAOffset), null);
					if (resultLen >= limitResultCount) {
						return resultLen;
					}
				}
			}
			return resultLen;
		}

		const seArcher = new SeArcher(seArchDAtA.wordSepArAtors, seArchDAtA.regex);
		let m: RegExpExecArrAy | null;
		// Reset regex to seArch from the beginning
		seArcher.reset(0);
		do {
			m = seArcher.next(text);
			if (m) {
				result[resultLen++] = creAteFindMAtch(new RAnge(lineNumber, m.index + 1 + deltAOffset, lineNumber, m.index + 1 + m[0].length + deltAOffset), m, cAptureMAtches);
				if (resultLen >= limitResultCount) {
					return resultLen;
				}
			}
		} while (m);
		return resultLen;
	}

	public stAtic findNextMAtch(model: TextModel, seArchPArAms: SeArchPArAms, seArchStArt: Position, cAptureMAtches: booleAn): FindMAtch | null {
		const seArchDAtA = seArchPArAms.pArseSeArchRequest();
		if (!seArchDAtA) {
			return null;
		}

		const seArcher = new SeArcher(seArchDAtA.wordSepArAtors, seArchDAtA.regex);

		if (seArchDAtA.regex.multiline) {
			return this._doFindNextMAtchMultiline(model, seArchStArt, seArcher, cAptureMAtches);
		}
		return this._doFindNextMAtchLineByLine(model, seArchStArt, seArcher, cAptureMAtches);
	}

	privAte stAtic _doFindNextMAtchMultiline(model: TextModel, seArchStArt: Position, seArcher: SeArcher, cAptureMAtches: booleAn): FindMAtch | null {
		const seArchTextStArt = new Position(seArchStArt.lineNumber, 1);
		const deltAOffset = model.getOffsetAt(seArchTextStArt);
		const lineCount = model.getLineCount();
		// We AlwAys execute multiline seArch over the lines joined with \n
		// This mAkes it thAt \n will mAtch the EOL for both CRLF And LF models
		// We compensAte for offset errors in `_getMultilineMAtchRAnge`
		const text = model.getVAlueInRAnge(new RAnge(seArchTextStArt.lineNumber, seArchTextStArt.column, lineCount, model.getLineMAxColumn(lineCount)), EndOfLinePreference.LF);
		const lfCounter = (model.getEOL() === '\r\n' ? new LineFeedCounter(text) : null);
		seArcher.reset(seArchStArt.column - 1);
		let m = seArcher.next(text);
		if (m) {
			return creAteFindMAtch(
				this._getMultilineMAtchRAnge(model, deltAOffset, text, lfCounter, m.index, m[0]),
				m,
				cAptureMAtches
			);
		}

		if (seArchStArt.lineNumber !== 1 || seArchStArt.column !== 1) {
			// Try AgAin from the top
			return this._doFindNextMAtchMultiline(model, new Position(1, 1), seArcher, cAptureMAtches);
		}

		return null;
	}

	privAte stAtic _doFindNextMAtchLineByLine(model: TextModel, seArchStArt: Position, seArcher: SeArcher, cAptureMAtches: booleAn): FindMAtch | null {
		const lineCount = model.getLineCount();
		const stArtLineNumber = seArchStArt.lineNumber;

		// Look in first line
		const text = model.getLineContent(stArtLineNumber);
		const r = this._findFirstMAtchInLine(seArcher, text, stArtLineNumber, seArchStArt.column, cAptureMAtches);
		if (r) {
			return r;
		}

		for (let i = 1; i <= lineCount; i++) {
			const lineIndex = (stArtLineNumber + i - 1) % lineCount;
			const text = model.getLineContent(lineIndex + 1);
			const r = this._findFirstMAtchInLine(seArcher, text, lineIndex + 1, 1, cAptureMAtches);
			if (r) {
				return r;
			}
		}

		return null;
	}

	privAte stAtic _findFirstMAtchInLine(seArcher: SeArcher, text: string, lineNumber: number, fromColumn: number, cAptureMAtches: booleAn): FindMAtch | null {
		// Set regex to seArch from column
		seArcher.reset(fromColumn - 1);
		const m: RegExpExecArrAy | null = seArcher.next(text);
		if (m) {
			return creAteFindMAtch(
				new RAnge(lineNumber, m.index + 1, lineNumber, m.index + 1 + m[0].length),
				m,
				cAptureMAtches
			);
		}
		return null;
	}

	public stAtic findPreviousMAtch(model: TextModel, seArchPArAms: SeArchPArAms, seArchStArt: Position, cAptureMAtches: booleAn): FindMAtch | null {
		const seArchDAtA = seArchPArAms.pArseSeArchRequest();
		if (!seArchDAtA) {
			return null;
		}

		const seArcher = new SeArcher(seArchDAtA.wordSepArAtors, seArchDAtA.regex);

		if (seArchDAtA.regex.multiline) {
			return this._doFindPreviousMAtchMultiline(model, seArchStArt, seArcher, cAptureMAtches);
		}
		return this._doFindPreviousMAtchLineByLine(model, seArchStArt, seArcher, cAptureMAtches);
	}

	privAte stAtic _doFindPreviousMAtchMultiline(model: TextModel, seArchStArt: Position, seArcher: SeArcher, cAptureMAtches: booleAn): FindMAtch | null {
		const mAtches = this._doFindMAtchesMultiline(model, new RAnge(1, 1, seArchStArt.lineNumber, seArchStArt.column), seArcher, cAptureMAtches, 10 * LIMIT_FIND_COUNT);
		if (mAtches.length > 0) {
			return mAtches[mAtches.length - 1];
		}

		const lineCount = model.getLineCount();
		if (seArchStArt.lineNumber !== lineCount || seArchStArt.column !== model.getLineMAxColumn(lineCount)) {
			// Try AgAin with All content
			return this._doFindPreviousMAtchMultiline(model, new Position(lineCount, model.getLineMAxColumn(lineCount)), seArcher, cAptureMAtches);
		}

		return null;
	}

	privAte stAtic _doFindPreviousMAtchLineByLine(model: TextModel, seArchStArt: Position, seArcher: SeArcher, cAptureMAtches: booleAn): FindMAtch | null {
		const lineCount = model.getLineCount();
		const stArtLineNumber = seArchStArt.lineNumber;

		// Look in first line
		const text = model.getLineContent(stArtLineNumber).substring(0, seArchStArt.column - 1);
		const r = this._findLAstMAtchInLine(seArcher, text, stArtLineNumber, cAptureMAtches);
		if (r) {
			return r;
		}

		for (let i = 1; i <= lineCount; i++) {
			const lineIndex = (lineCount + stArtLineNumber - i - 1) % lineCount;
			const text = model.getLineContent(lineIndex + 1);
			const r = this._findLAstMAtchInLine(seArcher, text, lineIndex + 1, cAptureMAtches);
			if (r) {
				return r;
			}
		}

		return null;
	}

	privAte stAtic _findLAstMAtchInLine(seArcher: SeArcher, text: string, lineNumber: number, cAptureMAtches: booleAn): FindMAtch | null {
		let bestResult: FindMAtch | null = null;
		let m: RegExpExecArrAy | null;
		seArcher.reset(0);
		while ((m = seArcher.next(text))) {
			bestResult = creAteFindMAtch(new RAnge(lineNumber, m.index + 1, lineNumber, m.index + 1 + m[0].length), m, cAptureMAtches);
		}
		return bestResult;
	}
}

function leftIsWordBoundAy(wordSepArAtors: WordChArActerClAssifier, text: string, textLength: number, mAtchStArtIndex: number, mAtchLength: number): booleAn {
	if (mAtchStArtIndex === 0) {
		// MAtch stArts At stArt of string
		return true;
	}

	const chArBefore = text.chArCodeAt(mAtchStArtIndex - 1);
	if (wordSepArAtors.get(chArBefore) !== WordChArActerClAss.RegulAr) {
		// The chArActer before the mAtch is A word sepArAtor
		return true;
	}

	if (chArBefore === ChArCode.CArriAgeReturn || chArBefore === ChArCode.LineFeed) {
		// The chArActer before the mAtch is line breAk or cArriAge return.
		return true;
	}

	if (mAtchLength > 0) {
		const firstChArInMAtch = text.chArCodeAt(mAtchStArtIndex);
		if (wordSepArAtors.get(firstChArInMAtch) !== WordChArActerClAss.RegulAr) {
			// The first chArActer inside the mAtch is A word sepArAtor
			return true;
		}
	}

	return fAlse;
}

function rightIsWordBoundAy(wordSepArAtors: WordChArActerClAssifier, text: string, textLength: number, mAtchStArtIndex: number, mAtchLength: number): booleAn {
	if (mAtchStArtIndex + mAtchLength === textLength) {
		// MAtch ends At end of string
		return true;
	}

	const chArAfter = text.chArCodeAt(mAtchStArtIndex + mAtchLength);
	if (wordSepArAtors.get(chArAfter) !== WordChArActerClAss.RegulAr) {
		// The chArActer After the mAtch is A word sepArAtor
		return true;
	}

	if (chArAfter === ChArCode.CArriAgeReturn || chArAfter === ChArCode.LineFeed) {
		// The chArActer After the mAtch is line breAk or cArriAge return.
		return true;
	}

	if (mAtchLength > 0) {
		const lAstChArInMAtch = text.chArCodeAt(mAtchStArtIndex + mAtchLength - 1);
		if (wordSepArAtors.get(lAstChArInMAtch) !== WordChArActerClAss.RegulAr) {
			// The lAst chArActer in the mAtch is A word sepArAtor
			return true;
		}
	}

	return fAlse;
}

export function isVAlidMAtch(wordSepArAtors: WordChArActerClAssifier, text: string, textLength: number, mAtchStArtIndex: number, mAtchLength: number): booleAn {
	return (
		leftIsWordBoundAy(wordSepArAtors, text, textLength, mAtchStArtIndex, mAtchLength)
		&& rightIsWordBoundAy(wordSepArAtors, text, textLength, mAtchStArtIndex, mAtchLength)
	);
}

export clAss SeArcher {
	public reAdonly _wordSepArAtors: WordChArActerClAssifier | null;
	privAte reAdonly _seArchRegex: RegExp;
	privAte _prevMAtchStArtIndex: number;
	privAte _prevMAtchLength: number;

	constructor(wordSepArAtors: WordChArActerClAssifier | null, seArchRegex: RegExp,) {
		this._wordSepArAtors = wordSepArAtors;
		this._seArchRegex = seArchRegex;
		this._prevMAtchStArtIndex = -1;
		this._prevMAtchLength = 0;
	}

	public reset(lAstIndex: number): void {
		this._seArchRegex.lAstIndex = lAstIndex;
		this._prevMAtchStArtIndex = -1;
		this._prevMAtchLength = 0;
	}

	public next(text: string): RegExpExecArrAy | null {
		const textLength = text.length;

		let m: RegExpExecArrAy | null;
		do {
			if (this._prevMAtchStArtIndex + this._prevMAtchLength === textLength) {
				// ReAched the end of the line
				return null;
			}

			m = this._seArchRegex.exec(text);
			if (!m) {
				return null;
			}

			const mAtchStArtIndex = m.index;
			const mAtchLength = m[0].length;
			if (mAtchStArtIndex === this._prevMAtchStArtIndex && mAtchLength === this._prevMAtchLength) {
				if (mAtchLength === 0) {
					// the seArch result is An empty string And won't AdvAnce `regex.lAstIndex`, so `regex.exec` will stuck here
					// we Attempt to recover from thAt by AdvAncing by two if surrogAte pAir found And by one otherwise
					if (strings.getNextCodePoint(text, textLength, this._seArchRegex.lAstIndex) > 0xFFFF) {
						this._seArchRegex.lAstIndex += 2;
					} else {
						this._seArchRegex.lAstIndex += 1;
					}
					continue;
				}
				// Exit eArly if the regex mAtches the sAme rAnge twice
				return null;
			}
			this._prevMAtchStArtIndex = mAtchStArtIndex;
			this._prevMAtchLength = mAtchLength;

			if (!this._wordSepArAtors || isVAlidMAtch(this._wordSepArAtors, text, textLength, mAtchStArtIndex, mAtchLength)) {
				return m;
			}

		} while (m);

		return null;
	}
}
