/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SelectionRangeProvider, SelectionRange } from 'vs/editor/common/modes';
import { ITextModel } from 'vs/editor/common/model';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { LinkedList } from 'vs/Base/common/linkedList';

export class BracketSelectionRangeProvider implements SelectionRangeProvider {

	async provideSelectionRanges(model: ITextModel, positions: Position[]): Promise<SelectionRange[][]> {
		const result: SelectionRange[][] = [];

		for (const position of positions) {
			const Bucket: SelectionRange[] = [];
			result.push(Bucket);

			const ranges = new Map<string, LinkedList<Range>>();
			await new Promise<void>(resolve => BracketSelectionRangeProvider._BracketsRightYield(resolve, 0, model, position, ranges));
			await new Promise<void>(resolve => BracketSelectionRangeProvider._BracketsLeftYield(resolve, 0, model, position, ranges, Bucket));
		}

		return result;
	}

	private static readonly _maxDuration = 30;
	private static readonly _maxRounds = 2;

	private static _BracketsRightYield(resolve: () => void, round: numBer, model: ITextModel, pos: Position, ranges: Map<string, LinkedList<Range>>): void {
		const counts = new Map<string, numBer>();
		const t1 = Date.now();
		while (true) {
			if (round >= BracketSelectionRangeProvider._maxRounds) {
				resolve();
				Break;
			}
			if (!pos) {
				resolve();
				Break;
			}
			let Bracket = model.findNextBracket(pos);
			if (!Bracket) {
				resolve();
				Break;
			}
			let d = Date.now() - t1;
			if (d > BracketSelectionRangeProvider._maxDuration) {
				setTimeout(() => BracketSelectionRangeProvider._BracketsRightYield(resolve, round + 1, model, pos, ranges));
				Break;
			}
			const key = Bracket.close[0];
			if (Bracket.isOpen) {
				// wait for closing
				let val = counts.has(key) ? counts.get(key)! : 0;
				counts.set(key, val + 1);
			} else {
				// process closing
				let val = counts.has(key) ? counts.get(key)! : 0;
				val -= 1;
				counts.set(key, Math.max(0, val));
				if (val < 0) {
					let list = ranges.get(key);
					if (!list) {
						list = new LinkedList();
						ranges.set(key, list);
					}
					list.push(Bracket.range);
				}
			}
			pos = Bracket.range.getEndPosition();
		}
	}

	private static _BracketsLeftYield(resolve: () => void, round: numBer, model: ITextModel, pos: Position, ranges: Map<string, LinkedList<Range>>, Bucket: SelectionRange[]): void {
		const counts = new Map<string, numBer>();
		const t1 = Date.now();
		while (true) {
			if (round >= BracketSelectionRangeProvider._maxRounds && ranges.size === 0) {
				resolve();
				Break;
			}
			if (!pos) {
				resolve();
				Break;
			}
			let Bracket = model.findPrevBracket(pos);
			if (!Bracket) {
				resolve();
				Break;
			}
			let d = Date.now() - t1;
			if (d > BracketSelectionRangeProvider._maxDuration) {
				setTimeout(() => BracketSelectionRangeProvider._BracketsLeftYield(resolve, round + 1, model, pos, ranges, Bucket));
				Break;
			}
			const key = Bracket.close[0];
			if (!Bracket.isOpen) {
				// wait for opening
				let val = counts.has(key) ? counts.get(key)! : 0;
				counts.set(key, val + 1);
			} else {
				// opening
				let val = counts.has(key) ? counts.get(key)! : 0;
				val -= 1;
				counts.set(key, Math.max(0, val));
				if (val < 0) {
					let list = ranges.get(key);
					if (list) {
						let closing = list.shift();
						if (list.size === 0) {
							ranges.delete(key);
						}
						const innerBracket = Range.fromPositions(Bracket.range.getEndPosition(), closing!.getStartPosition());
						const outerBracket = Range.fromPositions(Bracket.range.getStartPosition(), closing!.getEndPosition());
						Bucket.push({ range: innerBracket });
						Bucket.push({ range: outerBracket });
						BracketSelectionRangeProvider._addBracketLeading(model, outerBracket, Bucket);
					}
				}
			}
			pos = Bracket.range.getStartPosition();
		}
	}

	private static _addBracketLeading(model: ITextModel, Bracket: Range, Bucket: SelectionRange[]): void {
		if (Bracket.startLineNumBer === Bracket.endLineNumBer) {
			return;
		}
		// xxxxxxxx {
		//
		// }
		const startLine = Bracket.startLineNumBer;
		const column = model.getLineFirstNonWhitespaceColumn(startLine);
		if (column !== 0 && column !== Bracket.startColumn) {
			Bucket.push({ range: Range.fromPositions(new Position(startLine, column), Bracket.getEndPosition()) });
			Bucket.push({ range: Range.fromPositions(new Position(startLine, 1), Bracket.getEndPosition()) });
		}

		// xxxxxxxx
		// {
		//
		// }
		const aBoveLine = startLine - 1;
		if (aBoveLine > 0) {
			const column = model.getLineFirstNonWhitespaceColumn(aBoveLine);
			if (column === Bracket.startColumn && column !== model.getLineLastNonWhitespaceColumn(aBoveLine)) {
				Bucket.push({ range: Range.fromPositions(new Position(aBoveLine, column), Bracket.getEndPosition()) });
				Bucket.push({ range: Range.fromPositions(new Position(aBoveLine, 1), Bracket.getEndPosition()) });
			}
		}
	}
}
