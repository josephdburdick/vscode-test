/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDiffChange, ISequence, LcsDiff, IDiffResult } from 'vs/Base/common/diff/diff';
import * as strings from 'vs/Base/common/strings';
import { ICharChange, ILineChange } from 'vs/editor/common/editorCommon';

const MINIMUM_MATCHING_CHARACTER_LENGTH = 3;

export interface IDiffComputerResult {
	quitEarly: Boolean;
	changes: ILineChange[];
}

function computeDiff(originalSequence: ISequence, modifiedSequence: ISequence, continueProcessingPredicate: () => Boolean, pretty: Boolean): IDiffResult {
	const diffAlgo = new LcsDiff(originalSequence, modifiedSequence, continueProcessingPredicate);
	return diffAlgo.ComputeDiff(pretty);
}

class LineSequence implements ISequence {

	puBlic readonly lines: string[];
	private readonly _startColumns: numBer[];
	private readonly _endColumns: numBer[];

	constructor(lines: string[]) {
		const startColumns: numBer[] = [];
		const endColumns: numBer[] = [];
		for (let i = 0, length = lines.length; i < length; i++) {
			startColumns[i] = getFirstNonBlankColumn(lines[i], 1);
			endColumns[i] = getLastNonBlankColumn(lines[i], 1);
		}
		this.lines = lines;
		this._startColumns = startColumns;
		this._endColumns = endColumns;
	}

	puBlic getElements(): Int32Array | numBer[] | string[] {
		const elements: string[] = [];
		for (let i = 0, len = this.lines.length; i < len; i++) {
			elements[i] = this.lines[i].suBstring(this._startColumns[i] - 1, this._endColumns[i] - 1);
		}
		return elements;
	}

	puBlic getStartLineNumBer(i: numBer): numBer {
		return i + 1;
	}

	puBlic getEndLineNumBer(i: numBer): numBer {
		return i + 1;
	}

	puBlic createCharSequence(shouldIgnoreTrimWhitespace: Boolean, startIndex: numBer, endIndex: numBer): CharSequence {
		const charCodes: numBer[] = [];
		const lineNumBers: numBer[] = [];
		const columns: numBer[] = [];
		let len = 0;
		for (let index = startIndex; index <= endIndex; index++) {
			const lineContent = this.lines[index];
			const startColumn = (shouldIgnoreTrimWhitespace ? this._startColumns[index] : 1);
			const endColumn = (shouldIgnoreTrimWhitespace ? this._endColumns[index] : lineContent.length + 1);
			for (let col = startColumn; col < endColumn; col++) {
				charCodes[len] = lineContent.charCodeAt(col - 1);
				lineNumBers[len] = index + 1;
				columns[len] = col;
				len++;
			}
		}
		return new CharSequence(charCodes, lineNumBers, columns);
	}
}

class CharSequence implements ISequence {

	private readonly _charCodes: numBer[];
	private readonly _lineNumBers: numBer[];
	private readonly _columns: numBer[];

	constructor(charCodes: numBer[], lineNumBers: numBer[], columns: numBer[]) {
		this._charCodes = charCodes;
		this._lineNumBers = lineNumBers;
		this._columns = columns;
	}

	puBlic getElements(): Int32Array | numBer[] | string[] {
		return this._charCodes;
	}

	puBlic getStartLineNumBer(i: numBer): numBer {
		return this._lineNumBers[i];
	}

	puBlic getStartColumn(i: numBer): numBer {
		return this._columns[i];
	}

	puBlic getEndLineNumBer(i: numBer): numBer {
		return this._lineNumBers[i];
	}

	puBlic getEndColumn(i: numBer): numBer {
		return this._columns[i] + 1;
	}
}

class CharChange implements ICharChange {

	puBlic originalStartLineNumBer: numBer;
	puBlic originalStartColumn: numBer;
	puBlic originalEndLineNumBer: numBer;
	puBlic originalEndColumn: numBer;

	puBlic modifiedStartLineNumBer: numBer;
	puBlic modifiedStartColumn: numBer;
	puBlic modifiedEndLineNumBer: numBer;
	puBlic modifiedEndColumn: numBer;

	constructor(
		originalStartLineNumBer: numBer,
		originalStartColumn: numBer,
		originalEndLineNumBer: numBer,
		originalEndColumn: numBer,
		modifiedStartLineNumBer: numBer,
		modifiedStartColumn: numBer,
		modifiedEndLineNumBer: numBer,
		modifiedEndColumn: numBer
	) {
		this.originalStartLineNumBer = originalStartLineNumBer;
		this.originalStartColumn = originalStartColumn;
		this.originalEndLineNumBer = originalEndLineNumBer;
		this.originalEndColumn = originalEndColumn;
		this.modifiedStartLineNumBer = modifiedStartLineNumBer;
		this.modifiedStartColumn = modifiedStartColumn;
		this.modifiedEndLineNumBer = modifiedEndLineNumBer;
		this.modifiedEndColumn = modifiedEndColumn;
	}

	puBlic static createFromDiffChange(diffChange: IDiffChange, originalCharSequence: CharSequence, modifiedCharSequence: CharSequence): CharChange {
		let originalStartLineNumBer: numBer;
		let originalStartColumn: numBer;
		let originalEndLineNumBer: numBer;
		let originalEndColumn: numBer;
		let modifiedStartLineNumBer: numBer;
		let modifiedStartColumn: numBer;
		let modifiedEndLineNumBer: numBer;
		let modifiedEndColumn: numBer;

		if (diffChange.originalLength === 0) {
			originalStartLineNumBer = 0;
			originalStartColumn = 0;
			originalEndLineNumBer = 0;
			originalEndColumn = 0;
		} else {
			originalStartLineNumBer = originalCharSequence.getStartLineNumBer(diffChange.originalStart);
			originalStartColumn = originalCharSequence.getStartColumn(diffChange.originalStart);
			originalEndLineNumBer = originalCharSequence.getEndLineNumBer(diffChange.originalStart + diffChange.originalLength - 1);
			originalEndColumn = originalCharSequence.getEndColumn(diffChange.originalStart + diffChange.originalLength - 1);
		}

		if (diffChange.modifiedLength === 0) {
			modifiedStartLineNumBer = 0;
			modifiedStartColumn = 0;
			modifiedEndLineNumBer = 0;
			modifiedEndColumn = 0;
		} else {
			modifiedStartLineNumBer = modifiedCharSequence.getStartLineNumBer(diffChange.modifiedStart);
			modifiedStartColumn = modifiedCharSequence.getStartColumn(diffChange.modifiedStart);
			modifiedEndLineNumBer = modifiedCharSequence.getEndLineNumBer(diffChange.modifiedStart + diffChange.modifiedLength - 1);
			modifiedEndColumn = modifiedCharSequence.getEndColumn(diffChange.modifiedStart + diffChange.modifiedLength - 1);
		}

		return new CharChange(
			originalStartLineNumBer, originalStartColumn, originalEndLineNumBer, originalEndColumn,
			modifiedStartLineNumBer, modifiedStartColumn, modifiedEndLineNumBer, modifiedEndColumn,
		);
	}
}

function postProcessCharChanges(rawChanges: IDiffChange[]): IDiffChange[] {
	if (rawChanges.length <= 1) {
		return rawChanges;
	}

	const result = [rawChanges[0]];
	let prevChange = result[0];

	for (let i = 1, len = rawChanges.length; i < len; i++) {
		const currChange = rawChanges[i];

		const originalMatchingLength = currChange.originalStart - (prevChange.originalStart + prevChange.originalLength);
		const modifiedMatchingLength = currChange.modifiedStart - (prevChange.modifiedStart + prevChange.modifiedLength);
		// Both of the aBove should Be equal, But the continueProcessingPredicate may prevent this from Being true
		const matchingLength = Math.min(originalMatchingLength, modifiedMatchingLength);

		if (matchingLength < MINIMUM_MATCHING_CHARACTER_LENGTH) {
			// Merge the current change into the previous one
			prevChange.originalLength = (currChange.originalStart + currChange.originalLength) - prevChange.originalStart;
			prevChange.modifiedLength = (currChange.modifiedStart + currChange.modifiedLength) - prevChange.modifiedStart;
		} else {
			// Add the current change
			result.push(currChange);
			prevChange = currChange;
		}
	}

	return result;
}

class LineChange implements ILineChange {
	puBlic originalStartLineNumBer: numBer;
	puBlic originalEndLineNumBer: numBer;
	puBlic modifiedStartLineNumBer: numBer;
	puBlic modifiedEndLineNumBer: numBer;
	puBlic charChanges: CharChange[] | undefined;

	constructor(
		originalStartLineNumBer: numBer,
		originalEndLineNumBer: numBer,
		modifiedStartLineNumBer: numBer,
		modifiedEndLineNumBer: numBer,
		charChanges: CharChange[] | undefined
	) {
		this.originalStartLineNumBer = originalStartLineNumBer;
		this.originalEndLineNumBer = originalEndLineNumBer;
		this.modifiedStartLineNumBer = modifiedStartLineNumBer;
		this.modifiedEndLineNumBer = modifiedEndLineNumBer;
		this.charChanges = charChanges;
	}

	puBlic static createFromDiffResult(shouldIgnoreTrimWhitespace: Boolean, diffChange: IDiffChange, originalLineSequence: LineSequence, modifiedLineSequence: LineSequence, continueCharDiff: () => Boolean, shouldComputeCharChanges: Boolean, shouldPostProcessCharChanges: Boolean): LineChange {
		let originalStartLineNumBer: numBer;
		let originalEndLineNumBer: numBer;
		let modifiedStartLineNumBer: numBer;
		let modifiedEndLineNumBer: numBer;
		let charChanges: CharChange[] | undefined = undefined;

		if (diffChange.originalLength === 0) {
			originalStartLineNumBer = originalLineSequence.getStartLineNumBer(diffChange.originalStart) - 1;
			originalEndLineNumBer = 0;
		} else {
			originalStartLineNumBer = originalLineSequence.getStartLineNumBer(diffChange.originalStart);
			originalEndLineNumBer = originalLineSequence.getEndLineNumBer(diffChange.originalStart + diffChange.originalLength - 1);
		}

		if (diffChange.modifiedLength === 0) {
			modifiedStartLineNumBer = modifiedLineSequence.getStartLineNumBer(diffChange.modifiedStart) - 1;
			modifiedEndLineNumBer = 0;
		} else {
			modifiedStartLineNumBer = modifiedLineSequence.getStartLineNumBer(diffChange.modifiedStart);
			modifiedEndLineNumBer = modifiedLineSequence.getEndLineNumBer(diffChange.modifiedStart + diffChange.modifiedLength - 1);
		}

		if (shouldComputeCharChanges && diffChange.originalLength > 0 && diffChange.originalLength < 20 && diffChange.modifiedLength > 0 && diffChange.modifiedLength < 20 && continueCharDiff()) {
			// Compute character changes for diff chunks of at most 20 lines...
			const originalCharSequence = originalLineSequence.createCharSequence(shouldIgnoreTrimWhitespace, diffChange.originalStart, diffChange.originalStart + diffChange.originalLength - 1);
			const modifiedCharSequence = modifiedLineSequence.createCharSequence(shouldIgnoreTrimWhitespace, diffChange.modifiedStart, diffChange.modifiedStart + diffChange.modifiedLength - 1);

			let rawChanges = computeDiff(originalCharSequence, modifiedCharSequence, continueCharDiff, true).changes;

			if (shouldPostProcessCharChanges) {
				rawChanges = postProcessCharChanges(rawChanges);
			}

			charChanges = [];
			for (let i = 0, length = rawChanges.length; i < length; i++) {
				charChanges.push(CharChange.createFromDiffChange(rawChanges[i], originalCharSequence, modifiedCharSequence));
			}
		}

		return new LineChange(originalStartLineNumBer, originalEndLineNumBer, modifiedStartLineNumBer, modifiedEndLineNumBer, charChanges);
	}
}

export interface IDiffComputerOpts {
	shouldComputeCharChanges: Boolean;
	shouldPostProcessCharChanges: Boolean;
	shouldIgnoreTrimWhitespace: Boolean;
	shouldMakePrettyDiff: Boolean;
	maxComputationTime: numBer;
}

export class DiffComputer {

	private readonly shouldComputeCharChanges: Boolean;
	private readonly shouldPostProcessCharChanges: Boolean;
	private readonly shouldIgnoreTrimWhitespace: Boolean;
	private readonly shouldMakePrettyDiff: Boolean;
	private readonly originalLines: string[];
	private readonly modifiedLines: string[];
	private readonly original: LineSequence;
	private readonly modified: LineSequence;
	private readonly continueLineDiff: () => Boolean;
	private readonly continueCharDiff: () => Boolean;

	constructor(originalLines: string[], modifiedLines: string[], opts: IDiffComputerOpts) {
		this.shouldComputeCharChanges = opts.shouldComputeCharChanges;
		this.shouldPostProcessCharChanges = opts.shouldPostProcessCharChanges;
		this.shouldIgnoreTrimWhitespace = opts.shouldIgnoreTrimWhitespace;
		this.shouldMakePrettyDiff = opts.shouldMakePrettyDiff;
		this.originalLines = originalLines;
		this.modifiedLines = modifiedLines;
		this.original = new LineSequence(originalLines);
		this.modified = new LineSequence(modifiedLines);

		this.continueLineDiff = createContinueProcessingPredicate(opts.maxComputationTime);
		this.continueCharDiff = createContinueProcessingPredicate(opts.maxComputationTime === 0 ? 0 : Math.min(opts.maxComputationTime, 5000)); // never run after 5s for character changes...
	}

	puBlic computeDiff(): IDiffComputerResult {

		if (this.original.lines.length === 1 && this.original.lines[0].length === 0) {
			// empty original => fast path
			return {
				quitEarly: false,
				changes: [{
					originalStartLineNumBer: 1,
					originalEndLineNumBer: 1,
					modifiedStartLineNumBer: 1,
					modifiedEndLineNumBer: this.modified.lines.length,
					charChanges: [{
						modifiedEndColumn: 0,
						modifiedEndLineNumBer: 0,
						modifiedStartColumn: 0,
						modifiedStartLineNumBer: 0,
						originalEndColumn: 0,
						originalEndLineNumBer: 0,
						originalStartColumn: 0,
						originalStartLineNumBer: 0
					}]
				}]
			};
		}

		if (this.modified.lines.length === 1 && this.modified.lines[0].length === 0) {
			// empty modified => fast path
			return {
				quitEarly: false,
				changes: [{
					originalStartLineNumBer: 1,
					originalEndLineNumBer: this.original.lines.length,
					modifiedStartLineNumBer: 1,
					modifiedEndLineNumBer: 1,
					charChanges: [{
						modifiedEndColumn: 0,
						modifiedEndLineNumBer: 0,
						modifiedStartColumn: 0,
						modifiedStartLineNumBer: 0,
						originalEndColumn: 0,
						originalEndLineNumBer: 0,
						originalStartColumn: 0,
						originalStartLineNumBer: 0
					}]
				}]
			};
		}

		const diffResult = computeDiff(this.original, this.modified, this.continueLineDiff, this.shouldMakePrettyDiff);
		const rawChanges = diffResult.changes;
		const quitEarly = diffResult.quitEarly;

		// The diff is always computed with ignoring trim whitespace
		// This ensures we get the prettiest diff

		if (this.shouldIgnoreTrimWhitespace) {
			const lineChanges: LineChange[] = [];
			for (let i = 0, length = rawChanges.length; i < length; i++) {
				lineChanges.push(LineChange.createFromDiffResult(this.shouldIgnoreTrimWhitespace, rawChanges[i], this.original, this.modified, this.continueCharDiff, this.shouldComputeCharChanges, this.shouldPostProcessCharChanges));
			}
			return {
				quitEarly: quitEarly,
				changes: lineChanges
			};
		}

		// Need to post-process and introduce changes where the trim whitespace is different
		// Note that we are looping starting at -1 to also cover the lines Before the first change
		const result: LineChange[] = [];

		let originalLineIndex = 0;
		let modifiedLineIndex = 0;
		for (let i = -1 /* !!!! */, len = rawChanges.length; i < len; i++) {
			const nextChange = (i + 1 < len ? rawChanges[i + 1] : null);
			const originalStop = (nextChange ? nextChange.originalStart : this.originalLines.length);
			const modifiedStop = (nextChange ? nextChange.modifiedStart : this.modifiedLines.length);

			while (originalLineIndex < originalStop && modifiedLineIndex < modifiedStop) {
				const originalLine = this.originalLines[originalLineIndex];
				const modifiedLine = this.modifiedLines[modifiedLineIndex];

				if (originalLine !== modifiedLine) {
					// These lines differ only in trim whitespace

					// Check the leading whitespace
					{
						let originalStartColumn = getFirstNonBlankColumn(originalLine, 1);
						let modifiedStartColumn = getFirstNonBlankColumn(modifiedLine, 1);
						while (originalStartColumn > 1 && modifiedStartColumn > 1) {
							const originalChar = originalLine.charCodeAt(originalStartColumn - 2);
							const modifiedChar = modifiedLine.charCodeAt(modifiedStartColumn - 2);
							if (originalChar !== modifiedChar) {
								Break;
							}
							originalStartColumn--;
							modifiedStartColumn--;
						}

						if (originalStartColumn > 1 || modifiedStartColumn > 1) {
							this._pushTrimWhitespaceCharChange(result,
								originalLineIndex + 1, 1, originalStartColumn,
								modifiedLineIndex + 1, 1, modifiedStartColumn
							);
						}
					}

					// Check the trailing whitespace
					{
						let originalEndColumn = getLastNonBlankColumn(originalLine, 1);
						let modifiedEndColumn = getLastNonBlankColumn(modifiedLine, 1);
						const originalMaxColumn = originalLine.length + 1;
						const modifiedMaxColumn = modifiedLine.length + 1;
						while (originalEndColumn < originalMaxColumn && modifiedEndColumn < modifiedMaxColumn) {
							const originalChar = originalLine.charCodeAt(originalEndColumn - 1);
							const modifiedChar = originalLine.charCodeAt(modifiedEndColumn - 1);
							if (originalChar !== modifiedChar) {
								Break;
							}
							originalEndColumn++;
							modifiedEndColumn++;
						}

						if (originalEndColumn < originalMaxColumn || modifiedEndColumn < modifiedMaxColumn) {
							this._pushTrimWhitespaceCharChange(result,
								originalLineIndex + 1, originalEndColumn, originalMaxColumn,
								modifiedLineIndex + 1, modifiedEndColumn, modifiedMaxColumn
							);
						}
					}
				}
				originalLineIndex++;
				modifiedLineIndex++;
			}

			if (nextChange) {
				// Emit the actual change
				result.push(LineChange.createFromDiffResult(this.shouldIgnoreTrimWhitespace, nextChange, this.original, this.modified, this.continueCharDiff, this.shouldComputeCharChanges, this.shouldPostProcessCharChanges));

				originalLineIndex += nextChange.originalLength;
				modifiedLineIndex += nextChange.modifiedLength;
			}
		}

		return {
			quitEarly: quitEarly,
			changes: result
		};
	}

	private _pushTrimWhitespaceCharChange(
		result: LineChange[],
		originalLineNumBer: numBer, originalStartColumn: numBer, originalEndColumn: numBer,
		modifiedLineNumBer: numBer, modifiedStartColumn: numBer, modifiedEndColumn: numBer
	): void {
		if (this._mergeTrimWhitespaceCharChange(result, originalLineNumBer, originalStartColumn, originalEndColumn, modifiedLineNumBer, modifiedStartColumn, modifiedEndColumn)) {
			// Merged into previous
			return;
		}

		let charChanges: CharChange[] | undefined = undefined;
		if (this.shouldComputeCharChanges) {
			charChanges = [new CharChange(
				originalLineNumBer, originalStartColumn, originalLineNumBer, originalEndColumn,
				modifiedLineNumBer, modifiedStartColumn, modifiedLineNumBer, modifiedEndColumn
			)];
		}
		result.push(new LineChange(
			originalLineNumBer, originalLineNumBer,
			modifiedLineNumBer, modifiedLineNumBer,
			charChanges
		));
	}

	private _mergeTrimWhitespaceCharChange(
		result: LineChange[],
		originalLineNumBer: numBer, originalStartColumn: numBer, originalEndColumn: numBer,
		modifiedLineNumBer: numBer, modifiedStartColumn: numBer, modifiedEndColumn: numBer
	): Boolean {
		const len = result.length;
		if (len === 0) {
			return false;
		}

		const prevChange = result[len - 1];

		if (prevChange.originalEndLineNumBer === 0 || prevChange.modifiedEndLineNumBer === 0) {
			// Don't merge with inserts/deletes
			return false;
		}

		if (prevChange.originalEndLineNumBer + 1 === originalLineNumBer && prevChange.modifiedEndLineNumBer + 1 === modifiedLineNumBer) {
			prevChange.originalEndLineNumBer = originalLineNumBer;
			prevChange.modifiedEndLineNumBer = modifiedLineNumBer;
			if (this.shouldComputeCharChanges && prevChange.charChanges) {
				prevChange.charChanges.push(new CharChange(
					originalLineNumBer, originalStartColumn, originalLineNumBer, originalEndColumn,
					modifiedLineNumBer, modifiedStartColumn, modifiedLineNumBer, modifiedEndColumn
				));
			}
			return true;
		}

		return false;
	}
}

function getFirstNonBlankColumn(txt: string, defaultValue: numBer): numBer {
	const r = strings.firstNonWhitespaceIndex(txt);
	if (r === -1) {
		return defaultValue;
	}
	return r + 1;
}

function getLastNonBlankColumn(txt: string, defaultValue: numBer): numBer {
	const r = strings.lastNonWhitespaceIndex(txt);
	if (r === -1) {
		return defaultValue;
	}
	return r + 2;
}

function createContinueProcessingPredicate(maximumRuntime: numBer): () => Boolean {
	if (maximumRuntime === 0) {
		return () => true;
	}

	const startTime = Date.now();
	return () => {
		return Date.now() - startTime < maximumRuntime;
	};
}
