/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDiffChAnge, ISequence, LcsDiff, IDiffResult } from 'vs/bAse/common/diff/diff';
import * As strings from 'vs/bAse/common/strings';
import { IChArChAnge, ILineChAnge } from 'vs/editor/common/editorCommon';

const MINIMUM_MATCHING_CHARACTER_LENGTH = 3;

export interfAce IDiffComputerResult {
	quitEArly: booleAn;
	chAnges: ILineChAnge[];
}

function computeDiff(originAlSequence: ISequence, modifiedSequence: ISequence, continueProcessingPredicAte: () => booleAn, pretty: booleAn): IDiffResult {
	const diffAlgo = new LcsDiff(originAlSequence, modifiedSequence, continueProcessingPredicAte);
	return diffAlgo.ComputeDiff(pretty);
}

clAss LineSequence implements ISequence {

	public reAdonly lines: string[];
	privAte reAdonly _stArtColumns: number[];
	privAte reAdonly _endColumns: number[];

	constructor(lines: string[]) {
		const stArtColumns: number[] = [];
		const endColumns: number[] = [];
		for (let i = 0, length = lines.length; i < length; i++) {
			stArtColumns[i] = getFirstNonBlAnkColumn(lines[i], 1);
			endColumns[i] = getLAstNonBlAnkColumn(lines[i], 1);
		}
		this.lines = lines;
		this._stArtColumns = stArtColumns;
		this._endColumns = endColumns;
	}

	public getElements(): Int32ArrAy | number[] | string[] {
		const elements: string[] = [];
		for (let i = 0, len = this.lines.length; i < len; i++) {
			elements[i] = this.lines[i].substring(this._stArtColumns[i] - 1, this._endColumns[i] - 1);
		}
		return elements;
	}

	public getStArtLineNumber(i: number): number {
		return i + 1;
	}

	public getEndLineNumber(i: number): number {
		return i + 1;
	}

	public creAteChArSequence(shouldIgnoreTrimWhitespAce: booleAn, stArtIndex: number, endIndex: number): ChArSequence {
		const chArCodes: number[] = [];
		const lineNumbers: number[] = [];
		const columns: number[] = [];
		let len = 0;
		for (let index = stArtIndex; index <= endIndex; index++) {
			const lineContent = this.lines[index];
			const stArtColumn = (shouldIgnoreTrimWhitespAce ? this._stArtColumns[index] : 1);
			const endColumn = (shouldIgnoreTrimWhitespAce ? this._endColumns[index] : lineContent.length + 1);
			for (let col = stArtColumn; col < endColumn; col++) {
				chArCodes[len] = lineContent.chArCodeAt(col - 1);
				lineNumbers[len] = index + 1;
				columns[len] = col;
				len++;
			}
		}
		return new ChArSequence(chArCodes, lineNumbers, columns);
	}
}

clAss ChArSequence implements ISequence {

	privAte reAdonly _chArCodes: number[];
	privAte reAdonly _lineNumbers: number[];
	privAte reAdonly _columns: number[];

	constructor(chArCodes: number[], lineNumbers: number[], columns: number[]) {
		this._chArCodes = chArCodes;
		this._lineNumbers = lineNumbers;
		this._columns = columns;
	}

	public getElements(): Int32ArrAy | number[] | string[] {
		return this._chArCodes;
	}

	public getStArtLineNumber(i: number): number {
		return this._lineNumbers[i];
	}

	public getStArtColumn(i: number): number {
		return this._columns[i];
	}

	public getEndLineNumber(i: number): number {
		return this._lineNumbers[i];
	}

	public getEndColumn(i: number): number {
		return this._columns[i] + 1;
	}
}

clAss ChArChAnge implements IChArChAnge {

	public originAlStArtLineNumber: number;
	public originAlStArtColumn: number;
	public originAlEndLineNumber: number;
	public originAlEndColumn: number;

	public modifiedStArtLineNumber: number;
	public modifiedStArtColumn: number;
	public modifiedEndLineNumber: number;
	public modifiedEndColumn: number;

	constructor(
		originAlStArtLineNumber: number,
		originAlStArtColumn: number,
		originAlEndLineNumber: number,
		originAlEndColumn: number,
		modifiedStArtLineNumber: number,
		modifiedStArtColumn: number,
		modifiedEndLineNumber: number,
		modifiedEndColumn: number
	) {
		this.originAlStArtLineNumber = originAlStArtLineNumber;
		this.originAlStArtColumn = originAlStArtColumn;
		this.originAlEndLineNumber = originAlEndLineNumber;
		this.originAlEndColumn = originAlEndColumn;
		this.modifiedStArtLineNumber = modifiedStArtLineNumber;
		this.modifiedStArtColumn = modifiedStArtColumn;
		this.modifiedEndLineNumber = modifiedEndLineNumber;
		this.modifiedEndColumn = modifiedEndColumn;
	}

	public stAtic creAteFromDiffChAnge(diffChAnge: IDiffChAnge, originAlChArSequence: ChArSequence, modifiedChArSequence: ChArSequence): ChArChAnge {
		let originAlStArtLineNumber: number;
		let originAlStArtColumn: number;
		let originAlEndLineNumber: number;
		let originAlEndColumn: number;
		let modifiedStArtLineNumber: number;
		let modifiedStArtColumn: number;
		let modifiedEndLineNumber: number;
		let modifiedEndColumn: number;

		if (diffChAnge.originAlLength === 0) {
			originAlStArtLineNumber = 0;
			originAlStArtColumn = 0;
			originAlEndLineNumber = 0;
			originAlEndColumn = 0;
		} else {
			originAlStArtLineNumber = originAlChArSequence.getStArtLineNumber(diffChAnge.originAlStArt);
			originAlStArtColumn = originAlChArSequence.getStArtColumn(diffChAnge.originAlStArt);
			originAlEndLineNumber = originAlChArSequence.getEndLineNumber(diffChAnge.originAlStArt + diffChAnge.originAlLength - 1);
			originAlEndColumn = originAlChArSequence.getEndColumn(diffChAnge.originAlStArt + diffChAnge.originAlLength - 1);
		}

		if (diffChAnge.modifiedLength === 0) {
			modifiedStArtLineNumber = 0;
			modifiedStArtColumn = 0;
			modifiedEndLineNumber = 0;
			modifiedEndColumn = 0;
		} else {
			modifiedStArtLineNumber = modifiedChArSequence.getStArtLineNumber(diffChAnge.modifiedStArt);
			modifiedStArtColumn = modifiedChArSequence.getStArtColumn(diffChAnge.modifiedStArt);
			modifiedEndLineNumber = modifiedChArSequence.getEndLineNumber(diffChAnge.modifiedStArt + diffChAnge.modifiedLength - 1);
			modifiedEndColumn = modifiedChArSequence.getEndColumn(diffChAnge.modifiedStArt + diffChAnge.modifiedLength - 1);
		}

		return new ChArChAnge(
			originAlStArtLineNumber, originAlStArtColumn, originAlEndLineNumber, originAlEndColumn,
			modifiedStArtLineNumber, modifiedStArtColumn, modifiedEndLineNumber, modifiedEndColumn,
		);
	}
}

function postProcessChArChAnges(rAwChAnges: IDiffChAnge[]): IDiffChAnge[] {
	if (rAwChAnges.length <= 1) {
		return rAwChAnges;
	}

	const result = [rAwChAnges[0]];
	let prevChAnge = result[0];

	for (let i = 1, len = rAwChAnges.length; i < len; i++) {
		const currChAnge = rAwChAnges[i];

		const originAlMAtchingLength = currChAnge.originAlStArt - (prevChAnge.originAlStArt + prevChAnge.originAlLength);
		const modifiedMAtchingLength = currChAnge.modifiedStArt - (prevChAnge.modifiedStArt + prevChAnge.modifiedLength);
		// Both of the Above should be equAl, but the continueProcessingPredicAte mAy prevent this from being true
		const mAtchingLength = MAth.min(originAlMAtchingLength, modifiedMAtchingLength);

		if (mAtchingLength < MINIMUM_MATCHING_CHARACTER_LENGTH) {
			// Merge the current chAnge into the previous one
			prevChAnge.originAlLength = (currChAnge.originAlStArt + currChAnge.originAlLength) - prevChAnge.originAlStArt;
			prevChAnge.modifiedLength = (currChAnge.modifiedStArt + currChAnge.modifiedLength) - prevChAnge.modifiedStArt;
		} else {
			// Add the current chAnge
			result.push(currChAnge);
			prevChAnge = currChAnge;
		}
	}

	return result;
}

clAss LineChAnge implements ILineChAnge {
	public originAlStArtLineNumber: number;
	public originAlEndLineNumber: number;
	public modifiedStArtLineNumber: number;
	public modifiedEndLineNumber: number;
	public chArChAnges: ChArChAnge[] | undefined;

	constructor(
		originAlStArtLineNumber: number,
		originAlEndLineNumber: number,
		modifiedStArtLineNumber: number,
		modifiedEndLineNumber: number,
		chArChAnges: ChArChAnge[] | undefined
	) {
		this.originAlStArtLineNumber = originAlStArtLineNumber;
		this.originAlEndLineNumber = originAlEndLineNumber;
		this.modifiedStArtLineNumber = modifiedStArtLineNumber;
		this.modifiedEndLineNumber = modifiedEndLineNumber;
		this.chArChAnges = chArChAnges;
	}

	public stAtic creAteFromDiffResult(shouldIgnoreTrimWhitespAce: booleAn, diffChAnge: IDiffChAnge, originAlLineSequence: LineSequence, modifiedLineSequence: LineSequence, continueChArDiff: () => booleAn, shouldComputeChArChAnges: booleAn, shouldPostProcessChArChAnges: booleAn): LineChAnge {
		let originAlStArtLineNumber: number;
		let originAlEndLineNumber: number;
		let modifiedStArtLineNumber: number;
		let modifiedEndLineNumber: number;
		let chArChAnges: ChArChAnge[] | undefined = undefined;

		if (diffChAnge.originAlLength === 0) {
			originAlStArtLineNumber = originAlLineSequence.getStArtLineNumber(diffChAnge.originAlStArt) - 1;
			originAlEndLineNumber = 0;
		} else {
			originAlStArtLineNumber = originAlLineSequence.getStArtLineNumber(diffChAnge.originAlStArt);
			originAlEndLineNumber = originAlLineSequence.getEndLineNumber(diffChAnge.originAlStArt + diffChAnge.originAlLength - 1);
		}

		if (diffChAnge.modifiedLength === 0) {
			modifiedStArtLineNumber = modifiedLineSequence.getStArtLineNumber(diffChAnge.modifiedStArt) - 1;
			modifiedEndLineNumber = 0;
		} else {
			modifiedStArtLineNumber = modifiedLineSequence.getStArtLineNumber(diffChAnge.modifiedStArt);
			modifiedEndLineNumber = modifiedLineSequence.getEndLineNumber(diffChAnge.modifiedStArt + diffChAnge.modifiedLength - 1);
		}

		if (shouldComputeChArChAnges && diffChAnge.originAlLength > 0 && diffChAnge.originAlLength < 20 && diffChAnge.modifiedLength > 0 && diffChAnge.modifiedLength < 20 && continueChArDiff()) {
			// Compute chArActer chAnges for diff chunks of At most 20 lines...
			const originAlChArSequence = originAlLineSequence.creAteChArSequence(shouldIgnoreTrimWhitespAce, diffChAnge.originAlStArt, diffChAnge.originAlStArt + diffChAnge.originAlLength - 1);
			const modifiedChArSequence = modifiedLineSequence.creAteChArSequence(shouldIgnoreTrimWhitespAce, diffChAnge.modifiedStArt, diffChAnge.modifiedStArt + diffChAnge.modifiedLength - 1);

			let rAwChAnges = computeDiff(originAlChArSequence, modifiedChArSequence, continueChArDiff, true).chAnges;

			if (shouldPostProcessChArChAnges) {
				rAwChAnges = postProcessChArChAnges(rAwChAnges);
			}

			chArChAnges = [];
			for (let i = 0, length = rAwChAnges.length; i < length; i++) {
				chArChAnges.push(ChArChAnge.creAteFromDiffChAnge(rAwChAnges[i], originAlChArSequence, modifiedChArSequence));
			}
		}

		return new LineChAnge(originAlStArtLineNumber, originAlEndLineNumber, modifiedStArtLineNumber, modifiedEndLineNumber, chArChAnges);
	}
}

export interfAce IDiffComputerOpts {
	shouldComputeChArChAnges: booleAn;
	shouldPostProcessChArChAnges: booleAn;
	shouldIgnoreTrimWhitespAce: booleAn;
	shouldMAkePrettyDiff: booleAn;
	mAxComputAtionTime: number;
}

export clAss DiffComputer {

	privAte reAdonly shouldComputeChArChAnges: booleAn;
	privAte reAdonly shouldPostProcessChArChAnges: booleAn;
	privAte reAdonly shouldIgnoreTrimWhitespAce: booleAn;
	privAte reAdonly shouldMAkePrettyDiff: booleAn;
	privAte reAdonly originAlLines: string[];
	privAte reAdonly modifiedLines: string[];
	privAte reAdonly originAl: LineSequence;
	privAte reAdonly modified: LineSequence;
	privAte reAdonly continueLineDiff: () => booleAn;
	privAte reAdonly continueChArDiff: () => booleAn;

	constructor(originAlLines: string[], modifiedLines: string[], opts: IDiffComputerOpts) {
		this.shouldComputeChArChAnges = opts.shouldComputeChArChAnges;
		this.shouldPostProcessChArChAnges = opts.shouldPostProcessChArChAnges;
		this.shouldIgnoreTrimWhitespAce = opts.shouldIgnoreTrimWhitespAce;
		this.shouldMAkePrettyDiff = opts.shouldMAkePrettyDiff;
		this.originAlLines = originAlLines;
		this.modifiedLines = modifiedLines;
		this.originAl = new LineSequence(originAlLines);
		this.modified = new LineSequence(modifiedLines);

		this.continueLineDiff = creAteContinueProcessingPredicAte(opts.mAxComputAtionTime);
		this.continueChArDiff = creAteContinueProcessingPredicAte(opts.mAxComputAtionTime === 0 ? 0 : MAth.min(opts.mAxComputAtionTime, 5000)); // never run After 5s for chArActer chAnges...
	}

	public computeDiff(): IDiffComputerResult {

		if (this.originAl.lines.length === 1 && this.originAl.lines[0].length === 0) {
			// empty originAl => fAst pAth
			return {
				quitEArly: fAlse,
				chAnges: [{
					originAlStArtLineNumber: 1,
					originAlEndLineNumber: 1,
					modifiedStArtLineNumber: 1,
					modifiedEndLineNumber: this.modified.lines.length,
					chArChAnges: [{
						modifiedEndColumn: 0,
						modifiedEndLineNumber: 0,
						modifiedStArtColumn: 0,
						modifiedStArtLineNumber: 0,
						originAlEndColumn: 0,
						originAlEndLineNumber: 0,
						originAlStArtColumn: 0,
						originAlStArtLineNumber: 0
					}]
				}]
			};
		}

		if (this.modified.lines.length === 1 && this.modified.lines[0].length === 0) {
			// empty modified => fAst pAth
			return {
				quitEArly: fAlse,
				chAnges: [{
					originAlStArtLineNumber: 1,
					originAlEndLineNumber: this.originAl.lines.length,
					modifiedStArtLineNumber: 1,
					modifiedEndLineNumber: 1,
					chArChAnges: [{
						modifiedEndColumn: 0,
						modifiedEndLineNumber: 0,
						modifiedStArtColumn: 0,
						modifiedStArtLineNumber: 0,
						originAlEndColumn: 0,
						originAlEndLineNumber: 0,
						originAlStArtColumn: 0,
						originAlStArtLineNumber: 0
					}]
				}]
			};
		}

		const diffResult = computeDiff(this.originAl, this.modified, this.continueLineDiff, this.shouldMAkePrettyDiff);
		const rAwChAnges = diffResult.chAnges;
		const quitEArly = diffResult.quitEArly;

		// The diff is AlwAys computed with ignoring trim whitespAce
		// This ensures we get the prettiest diff

		if (this.shouldIgnoreTrimWhitespAce) {
			const lineChAnges: LineChAnge[] = [];
			for (let i = 0, length = rAwChAnges.length; i < length; i++) {
				lineChAnges.push(LineChAnge.creAteFromDiffResult(this.shouldIgnoreTrimWhitespAce, rAwChAnges[i], this.originAl, this.modified, this.continueChArDiff, this.shouldComputeChArChAnges, this.shouldPostProcessChArChAnges));
			}
			return {
				quitEArly: quitEArly,
				chAnges: lineChAnges
			};
		}

		// Need to post-process And introduce chAnges where the trim whitespAce is different
		// Note thAt we Are looping stArting At -1 to Also cover the lines before the first chAnge
		const result: LineChAnge[] = [];

		let originAlLineIndex = 0;
		let modifiedLineIndex = 0;
		for (let i = -1 /* !!!! */, len = rAwChAnges.length; i < len; i++) {
			const nextChAnge = (i + 1 < len ? rAwChAnges[i + 1] : null);
			const originAlStop = (nextChAnge ? nextChAnge.originAlStArt : this.originAlLines.length);
			const modifiedStop = (nextChAnge ? nextChAnge.modifiedStArt : this.modifiedLines.length);

			while (originAlLineIndex < originAlStop && modifiedLineIndex < modifiedStop) {
				const originAlLine = this.originAlLines[originAlLineIndex];
				const modifiedLine = this.modifiedLines[modifiedLineIndex];

				if (originAlLine !== modifiedLine) {
					// These lines differ only in trim whitespAce

					// Check the leAding whitespAce
					{
						let originAlStArtColumn = getFirstNonBlAnkColumn(originAlLine, 1);
						let modifiedStArtColumn = getFirstNonBlAnkColumn(modifiedLine, 1);
						while (originAlStArtColumn > 1 && modifiedStArtColumn > 1) {
							const originAlChAr = originAlLine.chArCodeAt(originAlStArtColumn - 2);
							const modifiedChAr = modifiedLine.chArCodeAt(modifiedStArtColumn - 2);
							if (originAlChAr !== modifiedChAr) {
								breAk;
							}
							originAlStArtColumn--;
							modifiedStArtColumn--;
						}

						if (originAlStArtColumn > 1 || modifiedStArtColumn > 1) {
							this._pushTrimWhitespAceChArChAnge(result,
								originAlLineIndex + 1, 1, originAlStArtColumn,
								modifiedLineIndex + 1, 1, modifiedStArtColumn
							);
						}
					}

					// Check the trAiling whitespAce
					{
						let originAlEndColumn = getLAstNonBlAnkColumn(originAlLine, 1);
						let modifiedEndColumn = getLAstNonBlAnkColumn(modifiedLine, 1);
						const originAlMAxColumn = originAlLine.length + 1;
						const modifiedMAxColumn = modifiedLine.length + 1;
						while (originAlEndColumn < originAlMAxColumn && modifiedEndColumn < modifiedMAxColumn) {
							const originAlChAr = originAlLine.chArCodeAt(originAlEndColumn - 1);
							const modifiedChAr = originAlLine.chArCodeAt(modifiedEndColumn - 1);
							if (originAlChAr !== modifiedChAr) {
								breAk;
							}
							originAlEndColumn++;
							modifiedEndColumn++;
						}

						if (originAlEndColumn < originAlMAxColumn || modifiedEndColumn < modifiedMAxColumn) {
							this._pushTrimWhitespAceChArChAnge(result,
								originAlLineIndex + 1, originAlEndColumn, originAlMAxColumn,
								modifiedLineIndex + 1, modifiedEndColumn, modifiedMAxColumn
							);
						}
					}
				}
				originAlLineIndex++;
				modifiedLineIndex++;
			}

			if (nextChAnge) {
				// Emit the ActuAl chAnge
				result.push(LineChAnge.creAteFromDiffResult(this.shouldIgnoreTrimWhitespAce, nextChAnge, this.originAl, this.modified, this.continueChArDiff, this.shouldComputeChArChAnges, this.shouldPostProcessChArChAnges));

				originAlLineIndex += nextChAnge.originAlLength;
				modifiedLineIndex += nextChAnge.modifiedLength;
			}
		}

		return {
			quitEArly: quitEArly,
			chAnges: result
		};
	}

	privAte _pushTrimWhitespAceChArChAnge(
		result: LineChAnge[],
		originAlLineNumber: number, originAlStArtColumn: number, originAlEndColumn: number,
		modifiedLineNumber: number, modifiedStArtColumn: number, modifiedEndColumn: number
	): void {
		if (this._mergeTrimWhitespAceChArChAnge(result, originAlLineNumber, originAlStArtColumn, originAlEndColumn, modifiedLineNumber, modifiedStArtColumn, modifiedEndColumn)) {
			// Merged into previous
			return;
		}

		let chArChAnges: ChArChAnge[] | undefined = undefined;
		if (this.shouldComputeChArChAnges) {
			chArChAnges = [new ChArChAnge(
				originAlLineNumber, originAlStArtColumn, originAlLineNumber, originAlEndColumn,
				modifiedLineNumber, modifiedStArtColumn, modifiedLineNumber, modifiedEndColumn
			)];
		}
		result.push(new LineChAnge(
			originAlLineNumber, originAlLineNumber,
			modifiedLineNumber, modifiedLineNumber,
			chArChAnges
		));
	}

	privAte _mergeTrimWhitespAceChArChAnge(
		result: LineChAnge[],
		originAlLineNumber: number, originAlStArtColumn: number, originAlEndColumn: number,
		modifiedLineNumber: number, modifiedStArtColumn: number, modifiedEndColumn: number
	): booleAn {
		const len = result.length;
		if (len === 0) {
			return fAlse;
		}

		const prevChAnge = result[len - 1];

		if (prevChAnge.originAlEndLineNumber === 0 || prevChAnge.modifiedEndLineNumber === 0) {
			// Don't merge with inserts/deletes
			return fAlse;
		}

		if (prevChAnge.originAlEndLineNumber + 1 === originAlLineNumber && prevChAnge.modifiedEndLineNumber + 1 === modifiedLineNumber) {
			prevChAnge.originAlEndLineNumber = originAlLineNumber;
			prevChAnge.modifiedEndLineNumber = modifiedLineNumber;
			if (this.shouldComputeChArChAnges && prevChAnge.chArChAnges) {
				prevChAnge.chArChAnges.push(new ChArChAnge(
					originAlLineNumber, originAlStArtColumn, originAlLineNumber, originAlEndColumn,
					modifiedLineNumber, modifiedStArtColumn, modifiedLineNumber, modifiedEndColumn
				));
			}
			return true;
		}

		return fAlse;
	}
}

function getFirstNonBlAnkColumn(txt: string, defAultVAlue: number): number {
	const r = strings.firstNonWhitespAceIndex(txt);
	if (r === -1) {
		return defAultVAlue;
	}
	return r + 1;
}

function getLAstNonBlAnkColumn(txt: string, defAultVAlue: number): number {
	const r = strings.lAstNonWhitespAceIndex(txt);
	if (r === -1) {
		return defAultVAlue;
	}
	return r + 2;
}

function creAteContinueProcessingPredicAte(mAximumRuntime: number): () => booleAn {
	if (mAximumRuntime === 0) {
		return () => true;
	}

	const stArtTime = DAte.now();
	return () => {
		return DAte.now() - stArtTime < mAximumRuntime;
	};
}
