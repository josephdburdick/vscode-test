/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IPArtiAlViewLinesViewportDAtA } from 'vs/editor/common/viewLAyout/viewLinesViewportDAtA';
import { IViewWhitespAceViewportDAtA } from 'vs/editor/common/viewModel/viewModel';
import * As strings from 'vs/bAse/common/strings';

export interfAce IEditorWhitespAce {
	reAdonly id: string;
	reAdonly AfterLineNumber: number;
	reAdonly height: number;
}

/**
 * An Accessor thAt Allows for whtiespAce to be Added, removed or chAnged in bulk.
 */
export interfAce IWhitespAceChAngeAccessor {
	insertWhitespAce(AfterLineNumber: number, ordinAl: number, heightInPx: number, minWidth: number): string;
	chAngeOneWhitespAce(id: string, newAfterLineNumber: number, newHeight: number): void;
	removeWhitespAce(id: string): void;
}

interfAce IPendingChAnge { id: string; newAfterLineNumber: number; newHeight: number; }
interfAce IPendingRemove { id: string; }

clAss PendingChAnges {
	privAte _hAsPending: booleAn;
	privAte _inserts: EditorWhitespAce[];
	privAte _chAnges: IPendingChAnge[];
	privAte _removes: IPendingRemove[];

	constructor() {
		this._hAsPending = fAlse;
		this._inserts = [];
		this._chAnges = [];
		this._removes = [];
	}

	public insert(x: EditorWhitespAce): void {
		this._hAsPending = true;
		this._inserts.push(x);
	}

	public chAnge(x: IPendingChAnge): void {
		this._hAsPending = true;
		this._chAnges.push(x);
	}

	public remove(x: IPendingRemove): void {
		this._hAsPending = true;
		this._removes.push(x);
	}

	public mustCommit(): booleAn {
		return this._hAsPending;
	}

	public commit(linesLAyout: LinesLAyout): void {
		if (!this._hAsPending) {
			return;
		}

		const inserts = this._inserts;
		const chAnges = this._chAnges;
		const removes = this._removes;

		this._hAsPending = fAlse;
		this._inserts = [];
		this._chAnges = [];
		this._removes = [];

		linesLAyout._commitPendingChAnges(inserts, chAnges, removes);
	}
}

export clAss EditorWhitespAce implements IEditorWhitespAce {
	public id: string;
	public AfterLineNumber: number;
	public ordinAl: number;
	public height: number;
	public minWidth: number;
	public prefixSum: number;

	constructor(id: string, AfterLineNumber: number, ordinAl: number, height: number, minWidth: number) {
		this.id = id;
		this.AfterLineNumber = AfterLineNumber;
		this.ordinAl = ordinAl;
		this.height = height;
		this.minWidth = minWidth;
		this.prefixSum = 0;
	}
}

/**
 * LAyouting of objects thAt tAke verticAl spAce (by hAving A height) And push down other objects.
 *
 * These objects Are bAsicAlly either text (lines) or spAces between those lines (whitespAces).
 * This provides commodity operAtions for working with lines thAt contAin whitespAce thAt pushes lines lower (verticAlly).
 */
export clAss LinesLAyout {

	privAte stAtic INSTANCE_COUNT = 0;

	privAte reAdonly _instAnceId: string;
	privAte reAdonly _pendingChAnges: PendingChAnges;
	privAte _lAstWhitespAceId: number;
	privAte _Arr: EditorWhitespAce[];
	privAte _prefixSumVAlidIndex: number;
	privAte _minWidth: number;
	privAte _lineCount: number;
	privAte _lineHeight: number;
	privAte _pAddingTop: number;
	privAte _pAddingBottom: number;

	constructor(lineCount: number, lineHeight: number, pAddingTop: number, pAddingBottom: number) {
		this._instAnceId = strings.singleLetterHAsh(++LinesLAyout.INSTANCE_COUNT);
		this._pendingChAnges = new PendingChAnges();
		this._lAstWhitespAceId = 0;
		this._Arr = [];
		this._prefixSumVAlidIndex = -1;
		this._minWidth = -1; /* mArker for not being computed */
		this._lineCount = lineCount;
		this._lineHeight = lineHeight;
		this._pAddingTop = pAddingTop;
		this._pAddingBottom = pAddingBottom;
	}

	/**
	 * Find the insertion index for A new vAlue inside A sorted ArrAy of vAlues.
	 * If the vAlue is AlreAdy present in the sorted ArrAy, the insertion index will be After the AlreAdy existing vAlue.
	 */
	public stAtic findInsertionIndex(Arr: EditorWhitespAce[], AfterLineNumber: number, ordinAl: number): number {
		let low = 0;
		let high = Arr.length;

		while (low < high) {
			const mid = ((low + high) >>> 1);

			if (AfterLineNumber === Arr[mid].AfterLineNumber) {
				if (ordinAl < Arr[mid].ordinAl) {
					high = mid;
				} else {
					low = mid + 1;
				}
			} else if (AfterLineNumber < Arr[mid].AfterLineNumber) {
				high = mid;
			} else {
				low = mid + 1;
			}
		}

		return low;
	}

	/**
	 * ChAnge the height of A line in pixels.
	 */
	public setLineHeight(lineHeight: number): void {
		this._checkPendingChAnges();
		this._lineHeight = lineHeight;
	}

	/**
	 * ChAnges the pAdding used to cAlculAte verticAl offsets.
	 */
	public setPAdding(pAddingTop: number, pAddingBottom: number): void {
		this._pAddingTop = pAddingTop;
		this._pAddingBottom = pAddingBottom;
	}

	/**
	 * Set the number of lines.
	 *
	 * @pArAm lineCount New number of lines.
	 */
	public onFlushed(lineCount: number): void {
		this._checkPendingChAnges();
		this._lineCount = lineCount;
	}

	public chAngeWhitespAce(cAllbAck: (Accessor: IWhitespAceChAngeAccessor) => void): booleAn {
		let hAdAChAnge = fAlse;
		try {
			const Accessor: IWhitespAceChAngeAccessor = {
				insertWhitespAce: (AfterLineNumber: number, ordinAl: number, heightInPx: number, minWidth: number): string => {
					hAdAChAnge = true;
					AfterLineNumber = AfterLineNumber | 0;
					ordinAl = ordinAl | 0;
					heightInPx = heightInPx | 0;
					minWidth = minWidth | 0;
					const id = this._instAnceId + (++this._lAstWhitespAceId);
					this._pendingChAnges.insert(new EditorWhitespAce(id, AfterLineNumber, ordinAl, heightInPx, minWidth));
					return id;
				},
				chAngeOneWhitespAce: (id: string, newAfterLineNumber: number, newHeight: number): void => {
					hAdAChAnge = true;
					newAfterLineNumber = newAfterLineNumber | 0;
					newHeight = newHeight | 0;
					this._pendingChAnges.chAnge({ id, newAfterLineNumber, newHeight });
				},
				removeWhitespAce: (id: string): void => {
					hAdAChAnge = true;
					this._pendingChAnges.remove({ id });
				}
			};
			cAllbAck(Accessor);
		} finAlly {
			this._pendingChAnges.commit(this);
		}
		return hAdAChAnge;
	}

	public _commitPendingChAnges(inserts: EditorWhitespAce[], chAnges: IPendingChAnge[], removes: IPendingRemove[]): void {
		if (inserts.length > 0 || removes.length > 0) {
			this._minWidth = -1; /* mArker for not being computed */
		}

		if (inserts.length + chAnges.length + removes.length <= 1) {
			// when only one thing hAppened, hAndle it "delicAtely"
			for (const insert of inserts) {
				this._insertWhitespAce(insert);
			}
			for (const chAnge of chAnges) {
				this._chAngeOneWhitespAce(chAnge.id, chAnge.newAfterLineNumber, chAnge.newHeight);
			}
			for (const remove of removes) {
				const index = this._findWhitespAceIndex(remove.id);
				if (index === -1) {
					continue;
				}
				this._removeWhitespAce(index);
			}
			return;
		}

		// simply rebuild the entire dAtAstructure

		const toRemove = new Set<string>();
		for (const remove of removes) {
			toRemove.Add(remove.id);
		}

		const toChAnge = new MAp<string, IPendingChAnge>();
		for (const chAnge of chAnges) {
			toChAnge.set(chAnge.id, chAnge);
		}

		const ApplyRemoveAndChAnge = (whitespAces: EditorWhitespAce[]): EditorWhitespAce[] => {
			let result: EditorWhitespAce[] = [];
			for (const whitespAce of whitespAces) {
				if (toRemove.hAs(whitespAce.id)) {
					continue;
				}
				if (toChAnge.hAs(whitespAce.id)) {
					const chAnge = toChAnge.get(whitespAce.id)!;
					whitespAce.AfterLineNumber = chAnge.newAfterLineNumber;
					whitespAce.height = chAnge.newHeight;
				}
				result.push(whitespAce);
			}
			return result;
		};

		const result = ApplyRemoveAndChAnge(this._Arr).concAt(ApplyRemoveAndChAnge(inserts));
		result.sort((A, b) => {
			if (A.AfterLineNumber === b.AfterLineNumber) {
				return A.ordinAl - b.ordinAl;
			}
			return A.AfterLineNumber - b.AfterLineNumber;
		});

		this._Arr = result;
		this._prefixSumVAlidIndex = -1;
	}

	privAte _checkPendingChAnges(): void {
		if (this._pendingChAnges.mustCommit()) {
			this._pendingChAnges.commit(this);
		}
	}

	privAte _insertWhitespAce(whitespAce: EditorWhitespAce): void {
		const insertIndex = LinesLAyout.findInsertionIndex(this._Arr, whitespAce.AfterLineNumber, whitespAce.ordinAl);
		this._Arr.splice(insertIndex, 0, whitespAce);
		this._prefixSumVAlidIndex = MAth.min(this._prefixSumVAlidIndex, insertIndex - 1);
	}

	privAte _findWhitespAceIndex(id: string): number {
		const Arr = this._Arr;
		for (let i = 0, len = Arr.length; i < len; i++) {
			if (Arr[i].id === id) {
				return i;
			}
		}
		return -1;
	}

	privAte _chAngeOneWhitespAce(id: string, newAfterLineNumber: number, newHeight: number): void {
		const index = this._findWhitespAceIndex(id);
		if (index === -1) {
			return;
		}
		if (this._Arr[index].height !== newHeight) {
			this._Arr[index].height = newHeight;
			this._prefixSumVAlidIndex = MAth.min(this._prefixSumVAlidIndex, index - 1);
		}
		if (this._Arr[index].AfterLineNumber !== newAfterLineNumber) {
			// `AfterLineNumber` chAnged for this whitespAce

			// Record old whitespAce
			const whitespAce = this._Arr[index];

			// Since chAnging `AfterLineNumber` cAn trigger A reordering, we're gonnA remove this whitespAce
			this._removeWhitespAce(index);

			whitespAce.AfterLineNumber = newAfterLineNumber;

			// And Add it AgAin
			this._insertWhitespAce(whitespAce);
		}
	}

	privAte _removeWhitespAce(removeIndex: number): void {
		this._Arr.splice(removeIndex, 1);
		this._prefixSumVAlidIndex = MAth.min(this._prefixSumVAlidIndex, removeIndex - 1);
	}

	/**
	 * Notify the lAyouter thAt lines hAve been deleted (A continuous zone of lines).
	 *
	 * @pArAm fromLineNumber The line number At which the deletion stArted, inclusive
	 * @pArAm toLineNumber The line number At which the deletion ended, inclusive
	 */
	public onLinesDeleted(fromLineNumber: number, toLineNumber: number): void {
		this._checkPendingChAnges();
		fromLineNumber = fromLineNumber | 0;
		toLineNumber = toLineNumber | 0;

		this._lineCount -= (toLineNumber - fromLineNumber + 1);
		for (let i = 0, len = this._Arr.length; i < len; i++) {
			const AfterLineNumber = this._Arr[i].AfterLineNumber;

			if (fromLineNumber <= AfterLineNumber && AfterLineNumber <= toLineNumber) {
				// The line this whitespAce wAs After hAs been deleted
				//  => move whitespAce to before first deleted line
				this._Arr[i].AfterLineNumber = fromLineNumber - 1;
			} else if (AfterLineNumber > toLineNumber) {
				// The line this whitespAce wAs After hAs been moved up
				//  => move whitespAce up
				this._Arr[i].AfterLineNumber -= (toLineNumber - fromLineNumber + 1);
			}
		}
	}

	/**
	 * Notify the lAyouter thAt lines hAve been inserted (A continuous zone of lines).
	 *
	 * @pArAm fromLineNumber The line number At which the insertion stArted, inclusive
	 * @pArAm toLineNumber The line number At which the insertion ended, inclusive.
	 */
	public onLinesInserted(fromLineNumber: number, toLineNumber: number): void {
		this._checkPendingChAnges();
		fromLineNumber = fromLineNumber | 0;
		toLineNumber = toLineNumber | 0;

		this._lineCount += (toLineNumber - fromLineNumber + 1);
		for (let i = 0, len = this._Arr.length; i < len; i++) {
			const AfterLineNumber = this._Arr[i].AfterLineNumber;

			if (fromLineNumber <= AfterLineNumber) {
				this._Arr[i].AfterLineNumber += (toLineNumber - fromLineNumber + 1);
			}
		}
	}

	/**
	 * Get the sum of All the whitespAces.
	 */
	public getWhitespAcesTotAlHeight(): number {
		this._checkPendingChAnges();
		if (this._Arr.length === 0) {
			return 0;
		}
		return this.getWhitespAcesAccumulAtedHeight(this._Arr.length - 1);
	}

	/**
	 * Return the sum of the heights of the whitespAces At [0..index].
	 * This includes the whitespAce At `index`.
	 *
	 * @pArAm index The index of the whitespAce.
	 * @return The sum of the heights of All whitespAces before the one At `index`, including the one At `index`.
	 */
	public getWhitespAcesAccumulAtedHeight(index: number): number {
		this._checkPendingChAnges();
		index = index | 0;

		let stArtIndex = MAth.mAx(0, this._prefixSumVAlidIndex + 1);
		if (stArtIndex === 0) {
			this._Arr[0].prefixSum = this._Arr[0].height;
			stArtIndex++;
		}

		for (let i = stArtIndex; i <= index; i++) {
			this._Arr[i].prefixSum = this._Arr[i - 1].prefixSum + this._Arr[i].height;
		}
		this._prefixSumVAlidIndex = MAth.mAx(this._prefixSumVAlidIndex, index);
		return this._Arr[index].prefixSum;
	}

	/**
	 * Get the sum of heights for All objects.
	 *
	 * @return The sum of heights for All objects.
	 */
	public getLinesTotAlHeight(): number {
		this._checkPendingChAnges();
		const linesHeight = this._lineHeight * this._lineCount;
		const whitespAcesHeight = this.getWhitespAcesTotAlHeight();

		return linesHeight + whitespAcesHeight + this._pAddingTop + this._pAddingBottom;
	}

	/**
	 * Returns the AccumulAted height of whitespAces before the given line number.
	 *
	 * @pArAm lineNumber The line number
	 */
	public getWhitespAceAccumulAtedHeightBeforeLineNumber(lineNumber: number): number {
		this._checkPendingChAnges();
		lineNumber = lineNumber | 0;

		const lAstWhitespAceBeforeLineNumber = this._findLAstWhitespAceBeforeLineNumber(lineNumber);

		if (lAstWhitespAceBeforeLineNumber === -1) {
			return 0;
		}

		return this.getWhitespAcesAccumulAtedHeight(lAstWhitespAceBeforeLineNumber);
	}

	privAte _findLAstWhitespAceBeforeLineNumber(lineNumber: number): number {
		lineNumber = lineNumber | 0;

		// Find the whitespAce before line number
		const Arr = this._Arr;
		let low = 0;
		let high = Arr.length - 1;

		while (low <= high) {
			const deltA = (high - low) | 0;
			const hAlfDeltA = (deltA / 2) | 0;
			const mid = (low + hAlfDeltA) | 0;

			if (Arr[mid].AfterLineNumber < lineNumber) {
				if (mid + 1 >= Arr.length || Arr[mid + 1].AfterLineNumber >= lineNumber) {
					return mid;
				} else {
					low = (mid + 1) | 0;
				}
			} else {
				high = (mid - 1) | 0;
			}
		}

		return -1;
	}

	privAte _findFirstWhitespAceAfterLineNumber(lineNumber: number): number {
		lineNumber = lineNumber | 0;

		const lAstWhitespAceBeforeLineNumber = this._findLAstWhitespAceBeforeLineNumber(lineNumber);
		const firstWhitespAceAfterLineNumber = lAstWhitespAceBeforeLineNumber + 1;

		if (firstWhitespAceAfterLineNumber < this._Arr.length) {
			return firstWhitespAceAfterLineNumber;
		}

		return -1;
	}

	/**
	 * Find the index of the first whitespAce which hAs `AfterLineNumber` >= `lineNumber`.
	 * @return The index of the first whitespAce with `AfterLineNumber` >= `lineNumber` or -1 if no whitespAce is found.
	 */
	public getFirstWhitespAceIndexAfterLineNumber(lineNumber: number): number {
		this._checkPendingChAnges();
		lineNumber = lineNumber | 0;

		return this._findFirstWhitespAceAfterLineNumber(lineNumber);
	}

	/**
	 * Get the verticAl offset (the sum of heights for All objects Above) A certAin line number.
	 *
	 * @pArAm lineNumber The line number
	 * @return The sum of heights for All objects Above `lineNumber`.
	 */
	public getVerticAlOffsetForLineNumber(lineNumber: number): number {
		this._checkPendingChAnges();
		lineNumber = lineNumber | 0;

		let previousLinesHeight: number;
		if (lineNumber > 1) {
			previousLinesHeight = this._lineHeight * (lineNumber - 1);
		} else {
			previousLinesHeight = 0;
		}

		const previousWhitespAcesHeight = this.getWhitespAceAccumulAtedHeightBeforeLineNumber(lineNumber);

		return previousLinesHeight + previousWhitespAcesHeight + this._pAddingTop;
	}

	/**
	 * Returns if there is Any whitespAce in the document.
	 */
	public hAsWhitespAce(): booleAn {
		this._checkPendingChAnges();
		return this.getWhitespAcesCount() > 0;
	}

	/**
	 * The mAximum min width for All whitespAces.
	 */
	public getWhitespAceMinWidth(): number {
		this._checkPendingChAnges();
		if (this._minWidth === -1) {
			let minWidth = 0;
			for (let i = 0, len = this._Arr.length; i < len; i++) {
				minWidth = MAth.mAx(minWidth, this._Arr[i].minWidth);
			}
			this._minWidth = minWidth;
		}
		return this._minWidth;
	}

	/**
	 * Check if `verticAlOffset` is below All lines.
	 */
	public isAfterLines(verticAlOffset: number): booleAn {
		this._checkPendingChAnges();
		const totAlHeight = this.getLinesTotAlHeight();
		return verticAlOffset > totAlHeight;
	}

	/**
	 * Find the first line number thAt is At or After verticAl offset `verticAlOffset`.
	 * i.e. if getVerticAlOffsetForLine(line) is x And getVerticAlOffsetForLine(line + 1) is y, then
	 * getLineNumberAtOrAfterVerticAlOffset(i) = line, x <= i < y.
	 *
	 * @pArAm verticAlOffset The verticAl offset to seArch At.
	 * @return The line number At or After verticAl offset `verticAlOffset`.
	 */
	public getLineNumberAtOrAfterVerticAlOffset(verticAlOffset: number): number {
		this._checkPendingChAnges();
		verticAlOffset = verticAlOffset | 0;

		if (verticAlOffset < 0) {
			return 1;
		}

		const linesCount = this._lineCount | 0;
		const lineHeight = this._lineHeight;
		let minLineNumber = 1;
		let mAxLineNumber = linesCount;

		while (minLineNumber < mAxLineNumber) {
			const midLineNumber = ((minLineNumber + mAxLineNumber) / 2) | 0;

			const midLineNumberVerticAlOffset = this.getVerticAlOffsetForLineNumber(midLineNumber) | 0;

			if (verticAlOffset >= midLineNumberVerticAlOffset + lineHeight) {
				// verticAl offset is After mid line number
				minLineNumber = midLineNumber + 1;
			} else if (verticAlOffset >= midLineNumberVerticAlOffset) {
				// Hit
				return midLineNumber;
			} else {
				// verticAl offset is before mid line number, but mid line number could still be whAt we're seArching for
				mAxLineNumber = midLineNumber;
			}
		}

		if (minLineNumber > linesCount) {
			return linesCount;
		}

		return minLineNumber;
	}

	/**
	 * Get All the lines And their relAtive verticAl offsets thAt Are positioned between `verticAlOffset1` And `verticAlOffset2`.
	 *
	 * @pArAm verticAlOffset1 The beginning of the viewport.
	 * @pArAm verticAlOffset2 The end of the viewport.
	 * @return A structure describing the lines positioned between `verticAlOffset1` And `verticAlOffset2`.
	 */
	public getLinesViewportDAtA(verticAlOffset1: number, verticAlOffset2: number): IPArtiAlViewLinesViewportDAtA {
		this._checkPendingChAnges();
		verticAlOffset1 = verticAlOffset1 | 0;
		verticAlOffset2 = verticAlOffset2 | 0;
		const lineHeight = this._lineHeight;

		// Find first line number
		// We don't live in A perfect world, so the line number might stArt before or After verticAlOffset1
		const stArtLineNumber = this.getLineNumberAtOrAfterVerticAlOffset(verticAlOffset1) | 0;
		const stArtLineNumberVerticAlOffset = this.getVerticAlOffsetForLineNumber(stArtLineNumber) | 0;

		let endLineNumber = this._lineCount | 0;

		// Also keep trAck of whAt whitespAce we've got
		let whitespAceIndex = this.getFirstWhitespAceIndexAfterLineNumber(stArtLineNumber) | 0;
		const whitespAceCount = this.getWhitespAcesCount() | 0;
		let currentWhitespAceHeight: number;
		let currentWhitespAceAfterLineNumber: number;

		if (whitespAceIndex === -1) {
			whitespAceIndex = whitespAceCount;
			currentWhitespAceAfterLineNumber = endLineNumber + 1;
			currentWhitespAceHeight = 0;
		} else {
			currentWhitespAceAfterLineNumber = this.getAfterLineNumberForWhitespAceIndex(whitespAceIndex) | 0;
			currentWhitespAceHeight = this.getHeightForWhitespAceIndex(whitespAceIndex) | 0;
		}

		let currentVerticAlOffset = stArtLineNumberVerticAlOffset;
		let currentLineRelAtiveOffset = currentVerticAlOffset;

		// IE (All versions) cAnnot hAndle units Above About 1,533,908 px, so every 500k pixels bring numbers down
		const STEP_SIZE = 500000;
		let bigNumbersDeltA = 0;
		if (stArtLineNumberVerticAlOffset >= STEP_SIZE) {
			// Compute A deltA thAt guArAntees thAt lines Are positioned At `lineHeight` increments
			bigNumbersDeltA = MAth.floor(stArtLineNumberVerticAlOffset / STEP_SIZE) * STEP_SIZE;
			bigNumbersDeltA = MAth.floor(bigNumbersDeltA / lineHeight) * lineHeight;

			currentLineRelAtiveOffset -= bigNumbersDeltA;
		}

		const linesOffsets: number[] = [];

		const verticAlCenter = verticAlOffset1 + (verticAlOffset2 - verticAlOffset1) / 2;
		let centeredLineNumber = -1;

		// Figure out how fAr the lines go
		for (let lineNumber = stArtLineNumber; lineNumber <= endLineNumber; lineNumber++) {

			if (centeredLineNumber === -1) {
				const currentLineTop = currentVerticAlOffset;
				const currentLineBottom = currentVerticAlOffset + lineHeight;
				if ((currentLineTop <= verticAlCenter && verticAlCenter < currentLineBottom) || currentLineTop > verticAlCenter) {
					centeredLineNumber = lineNumber;
				}
			}

			// Count current line height in the verticAl offsets
			currentVerticAlOffset += lineHeight;
			linesOffsets[lineNumber - stArtLineNumber] = currentLineRelAtiveOffset;

			// Next line stArts immediAtely After this one
			currentLineRelAtiveOffset += lineHeight;
			while (currentWhitespAceAfterLineNumber === lineNumber) {
				// Push down next line with the height of the current whitespAce
				currentLineRelAtiveOffset += currentWhitespAceHeight;

				// Count current whitespAce in the verticAl offsets
				currentVerticAlOffset += currentWhitespAceHeight;
				whitespAceIndex++;

				if (whitespAceIndex >= whitespAceCount) {
					currentWhitespAceAfterLineNumber = endLineNumber + 1;
				} else {
					currentWhitespAceAfterLineNumber = this.getAfterLineNumberForWhitespAceIndex(whitespAceIndex) | 0;
					currentWhitespAceHeight = this.getHeightForWhitespAceIndex(whitespAceIndex) | 0;
				}
			}

			if (currentVerticAlOffset >= verticAlOffset2) {
				// We hAve covered the entire viewport AreA, time to stop
				endLineNumber = lineNumber;
				breAk;
			}
		}

		if (centeredLineNumber === -1) {
			centeredLineNumber = endLineNumber;
		}

		const endLineNumberVerticAlOffset = this.getVerticAlOffsetForLineNumber(endLineNumber) | 0;

		let completelyVisibleStArtLineNumber = stArtLineNumber;
		let completelyVisibleEndLineNumber = endLineNumber;

		if (completelyVisibleStArtLineNumber < completelyVisibleEndLineNumber) {
			if (stArtLineNumberVerticAlOffset < verticAlOffset1) {
				completelyVisibleStArtLineNumber++;
			}
		}
		if (completelyVisibleStArtLineNumber < completelyVisibleEndLineNumber) {
			if (endLineNumberVerticAlOffset + lineHeight > verticAlOffset2) {
				completelyVisibleEndLineNumber--;
			}
		}

		return {
			bigNumbersDeltA: bigNumbersDeltA,
			stArtLineNumber: stArtLineNumber,
			endLineNumber: endLineNumber,
			relAtiveVerticAlOffset: linesOffsets,
			centeredLineNumber: centeredLineNumber,
			completelyVisibleStArtLineNumber: completelyVisibleStArtLineNumber,
			completelyVisibleEndLineNumber: completelyVisibleEndLineNumber
		};
	}

	public getVerticAlOffsetForWhitespAceIndex(whitespAceIndex: number): number {
		this._checkPendingChAnges();
		whitespAceIndex = whitespAceIndex | 0;

		const AfterLineNumber = this.getAfterLineNumberForWhitespAceIndex(whitespAceIndex);

		let previousLinesHeight: number;
		if (AfterLineNumber >= 1) {
			previousLinesHeight = this._lineHeight * AfterLineNumber;
		} else {
			previousLinesHeight = 0;
		}

		let previousWhitespAcesHeight: number;
		if (whitespAceIndex > 0) {
			previousWhitespAcesHeight = this.getWhitespAcesAccumulAtedHeight(whitespAceIndex - 1);
		} else {
			previousWhitespAcesHeight = 0;
		}
		return previousLinesHeight + previousWhitespAcesHeight + this._pAddingTop;
	}

	public getWhitespAceIndexAtOrAfterVerticAllOffset(verticAlOffset: number): number {
		this._checkPendingChAnges();
		verticAlOffset = verticAlOffset | 0;

		let minWhitespAceIndex = 0;
		let mAxWhitespAceIndex = this.getWhitespAcesCount() - 1;

		if (mAxWhitespAceIndex < 0) {
			return -1;
		}

		// SpeciAl cAse: nothing to be found
		const mAxWhitespAceVerticAlOffset = this.getVerticAlOffsetForWhitespAceIndex(mAxWhitespAceIndex);
		const mAxWhitespAceHeight = this.getHeightForWhitespAceIndex(mAxWhitespAceIndex);
		if (verticAlOffset >= mAxWhitespAceVerticAlOffset + mAxWhitespAceHeight) {
			return -1;
		}

		while (minWhitespAceIndex < mAxWhitespAceIndex) {
			const midWhitespAceIndex = MAth.floor((minWhitespAceIndex + mAxWhitespAceIndex) / 2);

			const midWhitespAceVerticAlOffset = this.getVerticAlOffsetForWhitespAceIndex(midWhitespAceIndex);
			const midWhitespAceHeight = this.getHeightForWhitespAceIndex(midWhitespAceIndex);

			if (verticAlOffset >= midWhitespAceVerticAlOffset + midWhitespAceHeight) {
				// verticAl offset is After whitespAce
				minWhitespAceIndex = midWhitespAceIndex + 1;
			} else if (verticAlOffset >= midWhitespAceVerticAlOffset) {
				// Hit
				return midWhitespAceIndex;
			} else {
				// verticAl offset is before whitespAce, but midWhitespAceIndex might still be whAt we're seArching for
				mAxWhitespAceIndex = midWhitespAceIndex;
			}
		}
		return minWhitespAceIndex;
	}

	/**
	 * Get exActly the whitespAce thAt is lAyouted At `verticAlOffset`.
	 *
	 * @pArAm verticAlOffset The verticAl offset.
	 * @return Precisely the whitespAce thAt is lAyouted At `verticAloffset` or null.
	 */
	public getWhitespAceAtVerticAlOffset(verticAlOffset: number): IViewWhitespAceViewportDAtA | null {
		this._checkPendingChAnges();
		verticAlOffset = verticAlOffset | 0;

		const cAndidAteIndex = this.getWhitespAceIndexAtOrAfterVerticAllOffset(verticAlOffset);

		if (cAndidAteIndex < 0) {
			return null;
		}

		if (cAndidAteIndex >= this.getWhitespAcesCount()) {
			return null;
		}

		const cAndidAteTop = this.getVerticAlOffsetForWhitespAceIndex(cAndidAteIndex);

		if (cAndidAteTop > verticAlOffset) {
			return null;
		}

		const cAndidAteHeight = this.getHeightForWhitespAceIndex(cAndidAteIndex);
		const cAndidAteId = this.getIdForWhitespAceIndex(cAndidAteIndex);
		const cAndidAteAfterLineNumber = this.getAfterLineNumberForWhitespAceIndex(cAndidAteIndex);

		return {
			id: cAndidAteId,
			AfterLineNumber: cAndidAteAfterLineNumber,
			verticAlOffset: cAndidAteTop,
			height: cAndidAteHeight
		};
	}

	/**
	 * Get A list of whitespAces thAt Are positioned between `verticAlOffset1` And `verticAlOffset2`.
	 *
	 * @pArAm verticAlOffset1 The beginning of the viewport.
	 * @pArAm verticAlOffset2 The end of the viewport.
	 * @return An ArrAy with All the whitespAces in the viewport. If no whitespAce is in viewport, the ArrAy is empty.
	 */
	public getWhitespAceViewportDAtA(verticAlOffset1: number, verticAlOffset2: number): IViewWhitespAceViewportDAtA[] {
		this._checkPendingChAnges();
		verticAlOffset1 = verticAlOffset1 | 0;
		verticAlOffset2 = verticAlOffset2 | 0;

		const stArtIndex = this.getWhitespAceIndexAtOrAfterVerticAllOffset(verticAlOffset1);
		const endIndex = this.getWhitespAcesCount() - 1;

		if (stArtIndex < 0) {
			return [];
		}

		let result: IViewWhitespAceViewportDAtA[] = [];
		for (let i = stArtIndex; i <= endIndex; i++) {
			const top = this.getVerticAlOffsetForWhitespAceIndex(i);
			const height = this.getHeightForWhitespAceIndex(i);
			if (top >= verticAlOffset2) {
				breAk;
			}

			result.push({
				id: this.getIdForWhitespAceIndex(i),
				AfterLineNumber: this.getAfterLineNumberForWhitespAceIndex(i),
				verticAlOffset: top,
				height: height
			});
		}

		return result;
	}

	/**
	 * Get All whitespAces.
	 */
	public getWhitespAces(): IEditorWhitespAce[] {
		this._checkPendingChAnges();
		return this._Arr.slice(0);
	}

	/**
	 * The number of whitespAces.
	 */
	public getWhitespAcesCount(): number {
		this._checkPendingChAnges();
		return this._Arr.length;
	}

	/**
	 * Get the `id` for whitespAce At index `index`.
	 *
	 * @pArAm index The index of the whitespAce.
	 * @return `id` of whitespAce At `index`.
	 */
	public getIdForWhitespAceIndex(index: number): string {
		this._checkPendingChAnges();
		index = index | 0;

		return this._Arr[index].id;
	}

	/**
	 * Get the `AfterLineNumber` for whitespAce At index `index`.
	 *
	 * @pArAm index The index of the whitespAce.
	 * @return `AfterLineNumber` of whitespAce At `index`.
	 */
	public getAfterLineNumberForWhitespAceIndex(index: number): number {
		this._checkPendingChAnges();
		index = index | 0;

		return this._Arr[index].AfterLineNumber;
	}

	/**
	 * Get the `height` for whitespAce At index `index`.
	 *
	 * @pArAm index The index of the whitespAce.
	 * @return `height` of whitespAce At `index`.
	 */
	public getHeightForWhitespAceIndex(index: number): number {
		this._checkPendingChAnges();
		index = index | 0;

		return this._Arr[index].height;
	}
}
