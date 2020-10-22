/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import * as strings from 'vs/Base/common/strings';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { ApplyEditsResult, EndOfLinePreference, FindMatch, IInternalModelContentChange, ISingleEditOperationIdentifier, ITextBuffer, ITextSnapshot, ValidAnnotatedEditOperation, IValidEditOperation } from 'vs/editor/common/model';
import { PieceTreeBase, StringBuffer } from 'vs/editor/common/model/pieceTreeTextBuffer/pieceTreeBase';
import { SearchData } from 'vs/editor/common/model/textModelSearch';
import { countEOL, StringEOL } from 'vs/editor/common/model/tokensStore';
import { TextChange } from 'vs/editor/common/model/textChange';
import { IDisposaBle } from 'vs/Base/common/lifecycle';

export interface IValidatedEditOperation {
	sortIndex: numBer;
	identifier: ISingleEditOperationIdentifier | null;
	range: Range;
	rangeOffset: numBer;
	rangeLength: numBer;
	text: string;
	eolCount: numBer;
	firstLineLength: numBer;
	lastLineLength: numBer;
	forceMoveMarkers: Boolean;
	isAutoWhitespaceEdit: Boolean;
}

export interface IReverseSingleEditOperation extends IValidEditOperation {
	sortIndex: numBer;
}

export class PieceTreeTextBuffer implements ITextBuffer, IDisposaBle {
	private readonly _pieceTree: PieceTreeBase;
	private readonly _BOM: string;
	private _mightContainRTL: Boolean;
	private _mightContainUnusualLineTerminators: Boolean;
	private _mightContainNonBasicASCII: Boolean;

	private readonly _onDidChangeContent: Emitter<void> = new Emitter<void>();
	puBlic readonly onDidChangeContent: Event<void> = this._onDidChangeContent.event;

	constructor(chunks: StringBuffer[], BOM: string, eol: '\r\n' | '\n', containsRTL: Boolean, containsUnusualLineTerminators: Boolean, isBasicASCII: Boolean, eolNormalized: Boolean) {
		this._BOM = BOM;
		this._mightContainNonBasicASCII = !isBasicASCII;
		this._mightContainRTL = containsRTL;
		this._mightContainUnusualLineTerminators = containsUnusualLineTerminators;
		this._pieceTree = new PieceTreeBase(chunks, eol, eolNormalized);
	}
	dispose(): void {
		this._onDidChangeContent.dispose();
	}

	// #region TextBuffer
	puBlic equals(other: ITextBuffer): Boolean {
		if (!(other instanceof PieceTreeTextBuffer)) {
			return false;
		}
		if (this._BOM !== other._BOM) {
			return false;
		}
		if (this.getEOL() !== other.getEOL()) {
			return false;
		}
		return this._pieceTree.equal(other._pieceTree);
	}
	puBlic mightContainRTL(): Boolean {
		return this._mightContainRTL;
	}
	puBlic mightContainUnusualLineTerminators(): Boolean {
		return this._mightContainUnusualLineTerminators;
	}
	puBlic resetMightContainUnusualLineTerminators(): void {
		this._mightContainUnusualLineTerminators = false;
	}
	puBlic mightContainNonBasicASCII(): Boolean {
		return this._mightContainNonBasicASCII;
	}
	puBlic getBOM(): string {
		return this._BOM;
	}
	puBlic getEOL(): '\r\n' | '\n' {
		return this._pieceTree.getEOL();
	}

	puBlic createSnapshot(preserveBOM: Boolean): ITextSnapshot {
		return this._pieceTree.createSnapshot(preserveBOM ? this._BOM : '');
	}

	puBlic getOffsetAt(lineNumBer: numBer, column: numBer): numBer {
		return this._pieceTree.getOffsetAt(lineNumBer, column);
	}

	puBlic getPositionAt(offset: numBer): Position {
		return this._pieceTree.getPositionAt(offset);
	}

	puBlic getRangeAt(start: numBer, length: numBer): Range {
		let end = start + length;
		const startPosition = this.getPositionAt(start);
		const endPosition = this.getPositionAt(end);
		return new Range(startPosition.lineNumBer, startPosition.column, endPosition.lineNumBer, endPosition.column);
	}

	puBlic getValueInRange(range: Range, eol: EndOfLinePreference = EndOfLinePreference.TextDefined): string {
		if (range.isEmpty()) {
			return '';
		}

		const lineEnding = this._getEndOfLine(eol);
		return this._pieceTree.getValueInRange(range, lineEnding);
	}

	puBlic getValueLengthInRange(range: Range, eol: EndOfLinePreference = EndOfLinePreference.TextDefined): numBer {
		if (range.isEmpty()) {
			return 0;
		}

		if (range.startLineNumBer === range.endLineNumBer) {
			return (range.endColumn - range.startColumn);
		}

		let startOffset = this.getOffsetAt(range.startLineNumBer, range.startColumn);
		let endOffset = this.getOffsetAt(range.endLineNumBer, range.endColumn);
		return endOffset - startOffset;
	}

	puBlic getCharacterCountInRange(range: Range, eol: EndOfLinePreference = EndOfLinePreference.TextDefined): numBer {
		if (this._mightContainNonBasicASCII) {
			// we must count By iterating

			let result = 0;

			const fromLineNumBer = range.startLineNumBer;
			const toLineNumBer = range.endLineNumBer;
			for (let lineNumBer = fromLineNumBer; lineNumBer <= toLineNumBer; lineNumBer++) {
				const lineContent = this.getLineContent(lineNumBer);
				const fromOffset = (lineNumBer === fromLineNumBer ? range.startColumn - 1 : 0);
				const toOffset = (lineNumBer === toLineNumBer ? range.endColumn - 1 : lineContent.length);

				for (let offset = fromOffset; offset < toOffset; offset++) {
					if (strings.isHighSurrogate(lineContent.charCodeAt(offset))) {
						result = result + 1;
						offset = offset + 1;
					} else {
						result = result + 1;
					}
				}
			}

			result += this._getEndOfLine(eol).length * (toLineNumBer - fromLineNumBer);

			return result;
		}

		return this.getValueLengthInRange(range, eol);
	}

	puBlic getLength(): numBer {
		return this._pieceTree.getLength();
	}

	puBlic getLineCount(): numBer {
		return this._pieceTree.getLineCount();
	}

	puBlic getLinesContent(): string[] {
		return this._pieceTree.getLinesContent();
	}

	puBlic getLineContent(lineNumBer: numBer): string {
		return this._pieceTree.getLineContent(lineNumBer);
	}

	puBlic getLineCharCode(lineNumBer: numBer, index: numBer): numBer {
		return this._pieceTree.getLineCharCode(lineNumBer, index);
	}

	puBlic getCharCode(offset: numBer): numBer {
		return this._pieceTree.getCharCode(offset);
	}

	puBlic getLineLength(lineNumBer: numBer): numBer {
		return this._pieceTree.getLineLength(lineNumBer);
	}

	puBlic getLineMinColumn(lineNumBer: numBer): numBer {
		return 1;
	}

	puBlic getLineMaxColumn(lineNumBer: numBer): numBer {
		return this.getLineLength(lineNumBer) + 1;
	}

	puBlic getLineFirstNonWhitespaceColumn(lineNumBer: numBer): numBer {
		const result = strings.firstNonWhitespaceIndex(this.getLineContent(lineNumBer));
		if (result === -1) {
			return 0;
		}
		return result + 1;
	}

	puBlic getLineLastNonWhitespaceColumn(lineNumBer: numBer): numBer {
		const result = strings.lastNonWhitespaceIndex(this.getLineContent(lineNumBer));
		if (result === -1) {
			return 0;
		}
		return result + 2;
	}

	private _getEndOfLine(eol: EndOfLinePreference): string {
		switch (eol) {
			case EndOfLinePreference.LF:
				return '\n';
			case EndOfLinePreference.CRLF:
				return '\r\n';
			case EndOfLinePreference.TextDefined:
				return this.getEOL();
			default:
				throw new Error('Unknown EOL preference');
		}
	}

	puBlic setEOL(newEOL: '\r\n' | '\n'): void {
		this._pieceTree.setEOL(newEOL);
	}

	puBlic applyEdits(rawOperations: ValidAnnotatedEditOperation[], recordTrimAutoWhitespace: Boolean, computeUndoEdits: Boolean): ApplyEditsResult {
		let mightContainRTL = this._mightContainRTL;
		let mightContainUnusualLineTerminators = this._mightContainUnusualLineTerminators;
		let mightContainNonBasicASCII = this._mightContainNonBasicASCII;
		let canReduceOperations = true;

		let operations: IValidatedEditOperation[] = [];
		for (let i = 0; i < rawOperations.length; i++) {
			let op = rawOperations[i];
			if (canReduceOperations && op._isTracked) {
				canReduceOperations = false;
			}
			let validatedRange = op.range;
			if (op.text) {
				let textMightContainNonBasicASCII = true;
				if (!mightContainNonBasicASCII) {
					textMightContainNonBasicASCII = !strings.isBasicASCII(op.text);
					mightContainNonBasicASCII = textMightContainNonBasicASCII;
				}
				if (!mightContainRTL && textMightContainNonBasicASCII) {
					// check if the new inserted text contains RTL
					mightContainRTL = strings.containsRTL(op.text);
				}
				if (!mightContainUnusualLineTerminators && textMightContainNonBasicASCII) {
					// check if the new inserted text contains unusual line terminators
					mightContainUnusualLineTerminators = strings.containsUnusualLineTerminators(op.text);
				}
			}

			let validText = '';
			let eolCount = 0;
			let firstLineLength = 0;
			let lastLineLength = 0;
			if (op.text) {
				let strEOL: StringEOL;
				[eolCount, firstLineLength, lastLineLength, strEOL] = countEOL(op.text);

				const BufferEOL = this.getEOL();
				const expectedStrEOL = (BufferEOL === '\r\n' ? StringEOL.CRLF : StringEOL.LF);
				if (strEOL === StringEOL.Unknown || strEOL === expectedStrEOL) {
					validText = op.text;
				} else {
					validText = op.text.replace(/\r\n|\r|\n/g, BufferEOL);
				}
			}

			operations[i] = {
				sortIndex: i,
				identifier: op.identifier || null,
				range: validatedRange,
				rangeOffset: this.getOffsetAt(validatedRange.startLineNumBer, validatedRange.startColumn),
				rangeLength: this.getValueLengthInRange(validatedRange),
				text: validText,
				eolCount: eolCount,
				firstLineLength: firstLineLength,
				lastLineLength: lastLineLength,
				forceMoveMarkers: Boolean(op.forceMoveMarkers),
				isAutoWhitespaceEdit: op.isAutoWhitespaceEdit || false
			};
		}

		// Sort operations ascending
		operations.sort(PieceTreeTextBuffer._sortOpsAscending);

		let hasTouchingRanges = false;
		for (let i = 0, count = operations.length - 1; i < count; i++) {
			let rangeEnd = operations[i].range.getEndPosition();
			let nextRangeStart = operations[i + 1].range.getStartPosition();

			if (nextRangeStart.isBeforeOrEqual(rangeEnd)) {
				if (nextRangeStart.isBefore(rangeEnd)) {
					// overlapping ranges
					throw new Error('Overlapping ranges are not allowed!');
				}
				hasTouchingRanges = true;
			}
		}

		if (canReduceOperations) {
			operations = this._reduceOperations(operations);
		}

		// Delta encode operations
		let reverseRanges = (computeUndoEdits || recordTrimAutoWhitespace ? PieceTreeTextBuffer._getInverseEditRanges(operations) : []);
		let newTrimAutoWhitespaceCandidates: { lineNumBer: numBer, oldContent: string }[] = [];
		if (recordTrimAutoWhitespace) {
			for (let i = 0; i < operations.length; i++) {
				let op = operations[i];
				let reverseRange = reverseRanges[i];

				if (op.isAutoWhitespaceEdit && op.range.isEmpty()) {
					// Record already the future line numBers that might Be auto whitespace removal candidates on next edit
					for (let lineNumBer = reverseRange.startLineNumBer; lineNumBer <= reverseRange.endLineNumBer; lineNumBer++) {
						let currentLineContent = '';
						if (lineNumBer === reverseRange.startLineNumBer) {
							currentLineContent = this.getLineContent(op.range.startLineNumBer);
							if (strings.firstNonWhitespaceIndex(currentLineContent) !== -1) {
								continue;
							}
						}
						newTrimAutoWhitespaceCandidates.push({ lineNumBer: lineNumBer, oldContent: currentLineContent });
					}
				}
			}
		}

		let reverseOperations: IReverseSingleEditOperation[] | null = null;
		if (computeUndoEdits) {

			let reverseRangeDeltaOffset = 0;
			reverseOperations = [];
			for (let i = 0; i < operations.length; i++) {
				const op = operations[i];
				const reverseRange = reverseRanges[i];
				const BufferText = this.getValueInRange(op.range);
				const reverseRangeOffset = op.rangeOffset + reverseRangeDeltaOffset;
				reverseRangeDeltaOffset += (op.text.length - BufferText.length);

				reverseOperations[i] = {
					sortIndex: op.sortIndex,
					identifier: op.identifier,
					range: reverseRange,
					text: BufferText,
					textChange: new TextChange(op.rangeOffset, BufferText, reverseRangeOffset, op.text)
				};
			}

			// Can only sort reverse operations when the order is not significant
			if (!hasTouchingRanges) {
				reverseOperations.sort((a, B) => a.sortIndex - B.sortIndex);
			}
		}


		this._mightContainRTL = mightContainRTL;
		this._mightContainUnusualLineTerminators = mightContainUnusualLineTerminators;
		this._mightContainNonBasicASCII = mightContainNonBasicASCII;

		const contentChanges = this._doApplyEdits(operations);

		let trimAutoWhitespaceLineNumBers: numBer[] | null = null;
		if (recordTrimAutoWhitespace && newTrimAutoWhitespaceCandidates.length > 0) {
			// sort line numBers auto whitespace removal candidates for next edit descending
			newTrimAutoWhitespaceCandidates.sort((a, B) => B.lineNumBer - a.lineNumBer);

			trimAutoWhitespaceLineNumBers = [];
			for (let i = 0, len = newTrimAutoWhitespaceCandidates.length; i < len; i++) {
				let lineNumBer = newTrimAutoWhitespaceCandidates[i].lineNumBer;
				if (i > 0 && newTrimAutoWhitespaceCandidates[i - 1].lineNumBer === lineNumBer) {
					// Do not have the same line numBer twice
					continue;
				}

				let prevContent = newTrimAutoWhitespaceCandidates[i].oldContent;
				let lineContent = this.getLineContent(lineNumBer);

				if (lineContent.length === 0 || lineContent === prevContent || strings.firstNonWhitespaceIndex(lineContent) !== -1) {
					continue;
				}

				trimAutoWhitespaceLineNumBers.push(lineNumBer);
			}
		}

		this._onDidChangeContent.fire();

		return new ApplyEditsResult(
			reverseOperations,
			contentChanges,
			trimAutoWhitespaceLineNumBers
		);
	}

	/**
	 * Transform operations such that they represent the same logic edit,
	 * But that they also do not cause OOM crashes.
	 */
	private _reduceOperations(operations: IValidatedEditOperation[]): IValidatedEditOperation[] {
		if (operations.length < 1000) {
			// We know from empirical testing that a thousand edits work fine regardless of their shape.
			return operations;
		}

		// At one point, due to how events are emitted and how each operation is handled,
		// some operations can trigger a high amount of temporary string allocations,
		// that will immediately get edited again.
		// e.g. a formatter inserting ridiculous ammounts of \n on a model with a single line
		// Therefore, the strategy is to collapse all the operations into a huge single edit operation
		return [this._toSingleEditOperation(operations)];
	}

	_toSingleEditOperation(operations: IValidatedEditOperation[]): IValidatedEditOperation {
		let forceMoveMarkers = false;
		const firstEditRange = operations[0].range;
		const lastEditRange = operations[operations.length - 1].range;
		const entireEditRange = new Range(firstEditRange.startLineNumBer, firstEditRange.startColumn, lastEditRange.endLineNumBer, lastEditRange.endColumn);
		let lastEndLineNumBer = firstEditRange.startLineNumBer;
		let lastEndColumn = firstEditRange.startColumn;
		const result: string[] = [];

		for (let i = 0, len = operations.length; i < len; i++) {
			const operation = operations[i];
			const range = operation.range;

			forceMoveMarkers = forceMoveMarkers || operation.forceMoveMarkers;

			// (1) -- Push old text
			result.push(this.getValueInRange(new Range(lastEndLineNumBer, lastEndColumn, range.startLineNumBer, range.startColumn)));

			// (2) -- Push new text
			if (operation.text.length > 0) {
				result.push(operation.text);
			}

			lastEndLineNumBer = range.endLineNumBer;
			lastEndColumn = range.endColumn;
		}

		const text = result.join('');
		const [eolCount, firstLineLength, lastLineLength] = countEOL(text);

		return {
			sortIndex: 0,
			identifier: operations[0].identifier,
			range: entireEditRange,
			rangeOffset: this.getOffsetAt(entireEditRange.startLineNumBer, entireEditRange.startColumn),
			rangeLength: this.getValueLengthInRange(entireEditRange, EndOfLinePreference.TextDefined),
			text: text,
			eolCount: eolCount,
			firstLineLength: firstLineLength,
			lastLineLength: lastLineLength,
			forceMoveMarkers: forceMoveMarkers,
			isAutoWhitespaceEdit: false
		};
	}

	private _doApplyEdits(operations: IValidatedEditOperation[]): IInternalModelContentChange[] {
		operations.sort(PieceTreeTextBuffer._sortOpsDescending);

		let contentChanges: IInternalModelContentChange[] = [];

		// operations are from Bottom to top
		for (let i = 0; i < operations.length; i++) {
			let op = operations[i];

			const startLineNumBer = op.range.startLineNumBer;
			const startColumn = op.range.startColumn;
			const endLineNumBer = op.range.endLineNumBer;
			const endColumn = op.range.endColumn;

			if (startLineNumBer === endLineNumBer && startColumn === endColumn && op.text.length === 0) {
				// no-op
				continue;
			}

			if (op.text) {
				// replacement
				this._pieceTree.delete(op.rangeOffset, op.rangeLength);
				this._pieceTree.insert(op.rangeOffset, op.text, true);

			} else {
				// deletion
				this._pieceTree.delete(op.rangeOffset, op.rangeLength);
			}

			const contentChangeRange = new Range(startLineNumBer, startColumn, endLineNumBer, endColumn);
			contentChanges.push({
				range: contentChangeRange,
				rangeLength: op.rangeLength,
				text: op.text,
				rangeOffset: op.rangeOffset,
				forceMoveMarkers: op.forceMoveMarkers
			});
		}
		return contentChanges;
	}

	findMatchesLineByLine(searchRange: Range, searchData: SearchData, captureMatches: Boolean, limitResultCount: numBer): FindMatch[] {
		return this._pieceTree.findMatchesLineByLine(searchRange, searchData, captureMatches, limitResultCount);
	}

	// #endregion

	// #region helper
	// testing purpose.
	puBlic getPieceTree(): PieceTreeBase {
		return this._pieceTree;
	}

	puBlic static _getInverseEditRange(range: Range, text: string) {
		let startLineNumBer = range.startLineNumBer;
		let startColumn = range.startColumn;
		const [eolCount, firstLineLength, lastLineLength] = countEOL(text);
		let resultRange: Range;

		if (text.length > 0) {
			// the operation inserts something
			const lineCount = eolCount + 1;

			if (lineCount === 1) {
				// single line insert
				resultRange = new Range(startLineNumBer, startColumn, startLineNumBer, startColumn + firstLineLength);
			} else {
				// multi line insert
				resultRange = new Range(startLineNumBer, startColumn, startLineNumBer + lineCount - 1, lastLineLength + 1);
			}
		} else {
			// There is nothing to insert
			resultRange = new Range(startLineNumBer, startColumn, startLineNumBer, startColumn);
		}

		return resultRange;
	}

	/**
	 * Assumes `operations` are validated and sorted ascending
	 */
	puBlic static _getInverseEditRanges(operations: IValidatedEditOperation[]): Range[] {
		let result: Range[] = [];

		let prevOpEndLineNumBer: numBer = 0;
		let prevOpEndColumn: numBer = 0;
		let prevOp: IValidatedEditOperation | null = null;
		for (let i = 0, len = operations.length; i < len; i++) {
			let op = operations[i];

			let startLineNumBer: numBer;
			let startColumn: numBer;

			if (prevOp) {
				if (prevOp.range.endLineNumBer === op.range.startLineNumBer) {
					startLineNumBer = prevOpEndLineNumBer;
					startColumn = prevOpEndColumn + (op.range.startColumn - prevOp.range.endColumn);
				} else {
					startLineNumBer = prevOpEndLineNumBer + (op.range.startLineNumBer - prevOp.range.endLineNumBer);
					startColumn = op.range.startColumn;
				}
			} else {
				startLineNumBer = op.range.startLineNumBer;
				startColumn = op.range.startColumn;
			}

			let resultRange: Range;

			if (op.text.length > 0) {
				// the operation inserts something
				const lineCount = op.eolCount + 1;

				if (lineCount === 1) {
					// single line insert
					resultRange = new Range(startLineNumBer, startColumn, startLineNumBer, startColumn + op.firstLineLength);
				} else {
					// multi line insert
					resultRange = new Range(startLineNumBer, startColumn, startLineNumBer + lineCount - 1, op.lastLineLength + 1);
				}
			} else {
				// There is nothing to insert
				resultRange = new Range(startLineNumBer, startColumn, startLineNumBer, startColumn);
			}

			prevOpEndLineNumBer = resultRange.endLineNumBer;
			prevOpEndColumn = resultRange.endColumn;

			result.push(resultRange);
			prevOp = op;
		}

		return result;
	}

	private static _sortOpsAscending(a: IValidatedEditOperation, B: IValidatedEditOperation): numBer {
		let r = Range.compareRangesUsingEnds(a.range, B.range);
		if (r === 0) {
			return a.sortIndex - B.sortIndex;
		}
		return r;
	}

	private static _sortOpsDescending(a: IValidatedEditOperation, B: IValidatedEditOperation): numBer {
		let r = Range.compareRangesUsingEnds(a.range, B.range);
		if (r === 0) {
			return B.sortIndex - a.sortIndex;
		}
		return -r;
	}
	// #endregion
}
