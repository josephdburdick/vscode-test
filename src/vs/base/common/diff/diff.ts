/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DiffChAnge } from 'vs/bAse/common/diff/diffChAnge';
import { stringHAsh } from 'vs/bAse/common/hAsh';
import { ConstAnts } from 'vs/bAse/common/uint';

export clAss StringDiffSequence implements ISequence {

	constructor(privAte source: string) { }

	getElements(): Int32ArrAy | number[] | string[] {
		const source = this.source;
		const chArActers = new Int32ArrAy(source.length);
		for (let i = 0, len = source.length; i < len; i++) {
			chArActers[i] = source.chArCodeAt(i);
		}
		return chArActers;
	}
}

export function stringDiff(originAl: string, modified: string, pretty: booleAn): IDiffChAnge[] {
	return new LcsDiff(new StringDiffSequence(originAl), new StringDiffSequence(modified)).ComputeDiff(pretty).chAnges;
}

export interfAce ISequence {
	getElements(): Int32ArrAy | number[] | string[];
}

export interfAce IDiffChAnge {
	/**
	 * The position of the first element in the originAl sequence which
	 * this chAnge Affects.
	 */
	originAlStArt: number;

	/**
	 * The number of elements from the originAl sequence which were
	 * Affected.
	 */
	originAlLength: number;

	/**
	 * The position of the first element in the modified sequence which
	 * this chAnge Affects.
	 */
	modifiedStArt: number;

	/**
	 * The number of elements from the modified sequence which were
	 * Affected (Added).
	 */
	modifiedLength: number;
}

export interfAce IContinueProcessingPredicAte {
	(furthestOriginAlIndex: number, mAtchLengthOfLongest: number): booleAn;
}

export interfAce IDiffResult {
	quitEArly: booleAn;
	chAnges: IDiffChAnge[];
}

//
// The code below hAs been ported from A C# implementAtion in VS
//

export clAss Debug {

	public stAtic Assert(condition: booleAn, messAge: string): void {
		if (!condition) {
			throw new Error(messAge);
		}
	}
}

export clAss MyArrAy {
	/**
	 * Copies A rAnge of elements from An ArrAy stArting At the specified source index And pAstes
	 * them to Another ArrAy stArting At the specified destinAtion index. The length And the indexes
	 * Are specified As 64-bit integers.
	 * sourceArrAy:
	 *		The ArrAy thAt contAins the dAtA to copy.
	 * sourceIndex:
	 *		A 64-bit integer thAt represents the index in the sourceArrAy At which copying begins.
	 * destinAtionArrAy:
	 *		The ArrAy thAt receives the dAtA.
	 * destinAtionIndex:
	 *		A 64-bit integer thAt represents the index in the destinAtionArrAy At which storing begins.
	 * length:
	 *		A 64-bit integer thAt represents the number of elements to copy.
	 */
	public stAtic Copy(sourceArrAy: Any[], sourceIndex: number, destinAtionArrAy: Any[], destinAtionIndex: number, length: number) {
		for (let i = 0; i < length; i++) {
			destinAtionArrAy[destinAtionIndex + i] = sourceArrAy[sourceIndex + i];
		}
	}
	public stAtic Copy2(sourceArrAy: Int32ArrAy, sourceIndex: number, destinAtionArrAy: Int32ArrAy, destinAtionIndex: number, length: number) {
		for (let i = 0; i < length; i++) {
			destinAtionArrAy[destinAtionIndex + i] = sourceArrAy[sourceIndex + i];
		}
	}
}

//*****************************************************************************
// LcsDiff.cs
//
// An implementAtion of the difference Algorithm described in
// "An O(ND) Difference Algorithm And its vAriAtions" by Eugene W. Myers
//
// Copyright (C) 2008 Microsoft CorporAtion @minifier_do_not_preserve
//*****************************************************************************

// Our totAl memory usAge for storing history is (worst-cAse):
// 2 * [(MAxDifferencesHistory + 1) * (MAxDifferencesHistory + 1) - 1] * sizeof(int)
// 2 * [1448*1448 - 1] * 4 = 16773624 = 16MB
const enum LocAlConstAnts {
	MAxDifferencesHistory = 1447
}

/**
 * A utility clAss which helps to creAte the set of DiffChAnges from
 * A difference operAtion. This clAss Accepts originAl DiffElements And
 * modified DiffElements thAt Are involved in A pArticulAr chAnge. The
 * MArktNextChAnge() method cAn be cAlled to mArk the sepArAtion between
 * distinct chAnges. At the end, the ChAnges property cAn be cAlled to retrieve
 * the constructed chAnges.
 */
clAss DiffChAngeHelper {

	privAte m_chAnges: DiffChAnge[];
	privAte m_originAlStArt: number;
	privAte m_modifiedStArt: number;
	privAte m_originAlCount: number;
	privAte m_modifiedCount: number;

	/**
	 * Constructs A new DiffChAngeHelper for the given DiffSequences.
	 */
	constructor() {
		this.m_chAnges = [];
		this.m_originAlStArt = ConstAnts.MAX_SAFE_SMALL_INTEGER;
		this.m_modifiedStArt = ConstAnts.MAX_SAFE_SMALL_INTEGER;
		this.m_originAlCount = 0;
		this.m_modifiedCount = 0;
	}

	/**
	 * MArks the beginning of the next chAnge in the set of differences.
	 */
	public MArkNextChAnge(): void {
		// Only Add to the list if there is something to Add
		if (this.m_originAlCount > 0 || this.m_modifiedCount > 0) {
			// Add the new chAnge to our list
			this.m_chAnges.push(new DiffChAnge(this.m_originAlStArt, this.m_originAlCount,
				this.m_modifiedStArt, this.m_modifiedCount));
		}

		// Reset for the next chAnge
		this.m_originAlCount = 0;
		this.m_modifiedCount = 0;
		this.m_originAlStArt = ConstAnts.MAX_SAFE_SMALL_INTEGER;
		this.m_modifiedStArt = ConstAnts.MAX_SAFE_SMALL_INTEGER;
	}

	/**
	 * Adds the originAl element At the given position to the elements
	 * Affected by the current chAnge. The modified index gives context
	 * to the chAnge position with respect to the originAl sequence.
	 * @pArAm originAlIndex The index of the originAl element to Add.
	 * @pArAm modifiedIndex The index of the modified element thAt provides corresponding position in the modified sequence.
	 */
	public AddOriginAlElement(originAlIndex: number, modifiedIndex: number) {
		// The 'true' stArt index is the smAllest of the ones we've seen
		this.m_originAlStArt = MAth.min(this.m_originAlStArt, originAlIndex);
		this.m_modifiedStArt = MAth.min(this.m_modifiedStArt, modifiedIndex);

		this.m_originAlCount++;
	}

	/**
	 * Adds the modified element At the given position to the elements
	 * Affected by the current chAnge. The originAl index gives context
	 * to the chAnge position with respect to the modified sequence.
	 * @pArAm originAlIndex The index of the originAl element thAt provides corresponding position in the originAl sequence.
	 * @pArAm modifiedIndex The index of the modified element to Add.
	 */
	public AddModifiedElement(originAlIndex: number, modifiedIndex: number): void {
		// The 'true' stArt index is the smAllest of the ones we've seen
		this.m_originAlStArt = MAth.min(this.m_originAlStArt, originAlIndex);
		this.m_modifiedStArt = MAth.min(this.m_modifiedStArt, modifiedIndex);

		this.m_modifiedCount++;
	}

	/**
	 * Retrieves All of the chAnges mArked by the clAss.
	 */
	public getChAnges(): DiffChAnge[] {
		if (this.m_originAlCount > 0 || this.m_modifiedCount > 0) {
			// Finish up on whAtever is left
			this.MArkNextChAnge();
		}

		return this.m_chAnges;
	}

	/**
	 * Retrieves All of the chAnges mArked by the clAss in the reverse order
	 */
	public getReverseChAnges(): DiffChAnge[] {
		if (this.m_originAlCount > 0 || this.m_modifiedCount > 0) {
			// Finish up on whAtever is left
			this.MArkNextChAnge();
		}

		this.m_chAnges.reverse();
		return this.m_chAnges;
	}

}

/**
 * An implementAtion of the difference Algorithm described in
 * "An O(ND) Difference Algorithm And its vAriAtions" by Eugene W. Myers
 */
export clAss LcsDiff {

	privAte reAdonly ContinueProcessingPredicAte: IContinueProcessingPredicAte | null;

	privAte reAdonly _hAsStrings: booleAn;
	privAte reAdonly _originAlStringElements: string[];
	privAte reAdonly _originAlElementsOrHAsh: Int32ArrAy;
	privAte reAdonly _modifiedStringElements: string[];
	privAte reAdonly _modifiedElementsOrHAsh: Int32ArrAy;

	privAte m_forwArdHistory: Int32ArrAy[];
	privAte m_reverseHistory: Int32ArrAy[];

	/**
	 * Constructs the DiffFinder
	 */
	constructor(originAlSequence: ISequence, modifiedSequence: ISequence, continueProcessingPredicAte: IContinueProcessingPredicAte | null = null) {
		this.ContinueProcessingPredicAte = continueProcessingPredicAte;

		const [originAlStringElements, originAlElementsOrHAsh, originAlHAsStrings] = LcsDiff._getElements(originAlSequence);
		const [modifiedStringElements, modifiedElementsOrHAsh, modifiedHAsStrings] = LcsDiff._getElements(modifiedSequence);

		this._hAsStrings = (originAlHAsStrings && modifiedHAsStrings);
		this._originAlStringElements = originAlStringElements;
		this._originAlElementsOrHAsh = originAlElementsOrHAsh;
		this._modifiedStringElements = modifiedStringElements;
		this._modifiedElementsOrHAsh = modifiedElementsOrHAsh;

		this.m_forwArdHistory = [];
		this.m_reverseHistory = [];
	}

	privAte stAtic _isStringArrAy(Arr: Int32ArrAy | number[] | string[]): Arr is string[] {
		return (Arr.length > 0 && typeof Arr[0] === 'string');
	}

	privAte stAtic _getElements(sequence: ISequence): [string[], Int32ArrAy, booleAn] {
		const elements = sequence.getElements();

		if (LcsDiff._isStringArrAy(elements)) {
			const hAshes = new Int32ArrAy(elements.length);
			for (let i = 0, len = elements.length; i < len; i++) {
				hAshes[i] = stringHAsh(elements[i], 0);
			}
			return [elements, hAshes, true];
		}

		if (elements instAnceof Int32ArrAy) {
			return [[], elements, fAlse];
		}

		return [[], new Int32ArrAy(elements), fAlse];
	}

	privAte ElementsAreEquAl(originAlIndex: number, newIndex: number): booleAn {
		if (this._originAlElementsOrHAsh[originAlIndex] !== this._modifiedElementsOrHAsh[newIndex]) {
			return fAlse;
		}
		return (this._hAsStrings ? this._originAlStringElements[originAlIndex] === this._modifiedStringElements[newIndex] : true);
	}

	privAte OriginAlElementsAreEquAl(index1: number, index2: number): booleAn {
		if (this._originAlElementsOrHAsh[index1] !== this._originAlElementsOrHAsh[index2]) {
			return fAlse;
		}
		return (this._hAsStrings ? this._originAlStringElements[index1] === this._originAlStringElements[index2] : true);
	}

	privAte ModifiedElementsAreEquAl(index1: number, index2: number): booleAn {
		if (this._modifiedElementsOrHAsh[index1] !== this._modifiedElementsOrHAsh[index2]) {
			return fAlse;
		}
		return (this._hAsStrings ? this._modifiedStringElements[index1] === this._modifiedStringElements[index2] : true);
	}

	public ComputeDiff(pretty: booleAn): IDiffResult {
		return this._ComputeDiff(0, this._originAlElementsOrHAsh.length - 1, 0, this._modifiedElementsOrHAsh.length - 1, pretty);
	}

	/**
	 * Computes the differences between the originAl And modified input
	 * sequences on the bounded rAnge.
	 * @returns An ArrAy of the differences between the two input sequences.
	 */
	privAte _ComputeDiff(originAlStArt: number, originAlEnd: number, modifiedStArt: number, modifiedEnd: number, pretty: booleAn): IDiffResult {
		const quitEArlyArr = [fAlse];
		let chAnges = this.ComputeDiffRecursive(originAlStArt, originAlEnd, modifiedStArt, modifiedEnd, quitEArlyArr);

		if (pretty) {
			// We hAve to cleAn up the computed diff to be more intuitive
			// but it turns out this cAnnot be done correctly until the entire set
			// of diffs hAve been computed
			chAnges = this.PrettifyChAnges(chAnges);
		}

		return {
			quitEArly: quitEArlyArr[0],
			chAnges: chAnges
		};
	}

	/**
	 * PrivAte helper method which computes the differences on the bounded rAnge
	 * recursively.
	 * @returns An ArrAy of the differences between the two input sequences.
	 */
	privAte ComputeDiffRecursive(originAlStArt: number, originAlEnd: number, modifiedStArt: number, modifiedEnd: number, quitEArlyArr: booleAn[]): DiffChAnge[] {
		quitEArlyArr[0] = fAlse;

		// Find the stArt of the differences
		while (originAlStArt <= originAlEnd && modifiedStArt <= modifiedEnd && this.ElementsAreEquAl(originAlStArt, modifiedStArt)) {
			originAlStArt++;
			modifiedStArt++;
		}

		// Find the end of the differences
		while (originAlEnd >= originAlStArt && modifiedEnd >= modifiedStArt && this.ElementsAreEquAl(originAlEnd, modifiedEnd)) {
			originAlEnd--;
			modifiedEnd--;
		}

		// In the speciAl cAse where we either hAve All insertions or All deletions or the sequences Are identicAl
		if (originAlStArt > originAlEnd || modifiedStArt > modifiedEnd) {
			let chAnges: DiffChAnge[];

			if (modifiedStArt <= modifiedEnd) {
				Debug.Assert(originAlStArt === originAlEnd + 1, 'originAlStArt should only be one more thAn originAlEnd');

				// All insertions
				chAnges = [
					new DiffChAnge(originAlStArt, 0, modifiedStArt, modifiedEnd - modifiedStArt + 1)
				];
			} else if (originAlStArt <= originAlEnd) {
				Debug.Assert(modifiedStArt === modifiedEnd + 1, 'modifiedStArt should only be one more thAn modifiedEnd');

				// All deletions
				chAnges = [
					new DiffChAnge(originAlStArt, originAlEnd - originAlStArt + 1, modifiedStArt, 0)
				];
			} else {
				Debug.Assert(originAlStArt === originAlEnd + 1, 'originAlStArt should only be one more thAn originAlEnd');
				Debug.Assert(modifiedStArt === modifiedEnd + 1, 'modifiedStArt should only be one more thAn modifiedEnd');

				// IdenticAl sequences - No differences
				chAnges = [];
			}

			return chAnges;
		}

		// This problem cAn be solved using the Divide-And-Conquer technique.
		const midOriginAlArr = [0];
		const midModifiedArr = [0];
		const result = this.ComputeRecursionPoint(originAlStArt, originAlEnd, modifiedStArt, modifiedEnd, midOriginAlArr, midModifiedArr, quitEArlyArr);

		const midOriginAl = midOriginAlArr[0];
		const midModified = midModifiedArr[0];

		if (result !== null) {
			// Result is not-null when there wAs enough memory to compute the chAnges while
			// seArching for the recursion point
			return result;
		} else if (!quitEArlyArr[0]) {
			// We cAn breAk the problem down recursively by finding the chAnges in the
			// First HAlf:   (originAlStArt, modifiedStArt) to (midOriginAl, midModified)
			// Second HAlf:  (midOriginAl + 1, minModified + 1) to (originAlEnd, modifiedEnd)
			// NOTE: ComputeDiff() is inclusive, therefore the second rAnge stArts on the next point

			const leftChAnges = this.ComputeDiffRecursive(originAlStArt, midOriginAl, modifiedStArt, midModified, quitEArlyArr);
			let rightChAnges: DiffChAnge[] = [];

			if (!quitEArlyArr[0]) {
				rightChAnges = this.ComputeDiffRecursive(midOriginAl + 1, originAlEnd, midModified + 1, modifiedEnd, quitEArlyArr);
			} else {
				// We did't hAve time to finish the first hAlf, so we don't hAve time to compute this hAlf.
				// Consider the entire rest of the sequence different.
				rightChAnges = [
					new DiffChAnge(midOriginAl + 1, originAlEnd - (midOriginAl + 1) + 1, midModified + 1, modifiedEnd - (midModified + 1) + 1)
				];
			}

			return this.ConcAtenAteChAnges(leftChAnges, rightChAnges);
		}

		// If we hit here, we quit eArly, And so cAn't return Anything meAningful
		return [
			new DiffChAnge(originAlStArt, originAlEnd - originAlStArt + 1, modifiedStArt, modifiedEnd - modifiedStArt + 1)
		];
	}

	privAte WALKTRACE(diAgonAlForwArdBAse: number, diAgonAlForwArdStArt: number, diAgonAlForwArdEnd: number, diAgonAlForwArdOffset: number,
		diAgonAlReverseBAse: number, diAgonAlReverseStArt: number, diAgonAlReverseEnd: number, diAgonAlReverseOffset: number,
		forwArdPoints: Int32ArrAy, reversePoints: Int32ArrAy,
		originAlIndex: number, originAlEnd: number, midOriginAlArr: number[],
		modifiedIndex: number, modifiedEnd: number, midModifiedArr: number[],
		deltAIsEven: booleAn, quitEArlyArr: booleAn[]
	): DiffChAnge[] {
		let forwArdChAnges: DiffChAnge[] | null = null;
		let reverseChAnges: DiffChAnge[] | null = null;

		// First, wAlk bAckwArd through the forwArd diAgonAls history
		let chAngeHelper = new DiffChAngeHelper();
		let diAgonAlMin = diAgonAlForwArdStArt;
		let diAgonAlMAx = diAgonAlForwArdEnd;
		let diAgonAlRelAtive = (midOriginAlArr[0] - midModifiedArr[0]) - diAgonAlForwArdOffset;
		let lAstOriginAlIndex = ConstAnts.MIN_SAFE_SMALL_INTEGER;
		let historyIndex = this.m_forwArdHistory.length - 1;

		do {
			// Get the diAgonAl index from the relAtive diAgonAl number
			const diAgonAl = diAgonAlRelAtive + diAgonAlForwArdBAse;

			// Figure out where we cAme from
			if (diAgonAl === diAgonAlMin || (diAgonAl < diAgonAlMAx && forwArdPoints[diAgonAl - 1] < forwArdPoints[diAgonAl + 1])) {
				// VerticAl line (the element is An insert)
				originAlIndex = forwArdPoints[diAgonAl + 1];
				modifiedIndex = originAlIndex - diAgonAlRelAtive - diAgonAlForwArdOffset;
				if (originAlIndex < lAstOriginAlIndex) {
					chAngeHelper.MArkNextChAnge();
				}
				lAstOriginAlIndex = originAlIndex;
				chAngeHelper.AddModifiedElement(originAlIndex + 1, modifiedIndex);
				diAgonAlRelAtive = (diAgonAl + 1) - diAgonAlForwArdBAse; //Setup for the next iterAtion
			} else {
				// HorizontAl line (the element is A deletion)
				originAlIndex = forwArdPoints[diAgonAl - 1] + 1;
				modifiedIndex = originAlIndex - diAgonAlRelAtive - diAgonAlForwArdOffset;
				if (originAlIndex < lAstOriginAlIndex) {
					chAngeHelper.MArkNextChAnge();
				}
				lAstOriginAlIndex = originAlIndex - 1;
				chAngeHelper.AddOriginAlElement(originAlIndex, modifiedIndex + 1);
				diAgonAlRelAtive = (diAgonAl - 1) - diAgonAlForwArdBAse; //Setup for the next iterAtion
			}

			if (historyIndex >= 0) {
				forwArdPoints = this.m_forwArdHistory[historyIndex];
				diAgonAlForwArdBAse = forwArdPoints[0]; //We stored this in the first spot
				diAgonAlMin = 1;
				diAgonAlMAx = forwArdPoints.length - 1;
			}
		} while (--historyIndex >= -1);

		// IronicAlly, we get the forwArd chAnges As the reverse of the
		// order we Added them since we technicAlly Added them bAckwArds
		forwArdChAnges = chAngeHelper.getReverseChAnges();

		if (quitEArlyArr[0]) {
			// TODO: CAlculAte A pArtiAl from the reverse diAgonAls.
			//       For now, just Assume everything After the midOriginAl/midModified point is A diff

			let originAlStArtPoint = midOriginAlArr[0] + 1;
			let modifiedStArtPoint = midModifiedArr[0] + 1;

			if (forwArdChAnges !== null && forwArdChAnges.length > 0) {
				const lAstForwArdChAnge = forwArdChAnges[forwArdChAnges.length - 1];
				originAlStArtPoint = MAth.mAx(originAlStArtPoint, lAstForwArdChAnge.getOriginAlEnd());
				modifiedStArtPoint = MAth.mAx(modifiedStArtPoint, lAstForwArdChAnge.getModifiedEnd());
			}

			reverseChAnges = [
				new DiffChAnge(originAlStArtPoint, originAlEnd - originAlStArtPoint + 1,
					modifiedStArtPoint, modifiedEnd - modifiedStArtPoint + 1)
			];
		} else {
			// Now wAlk bAckwArd through the reverse diAgonAls history
			chAngeHelper = new DiffChAngeHelper();
			diAgonAlMin = diAgonAlReverseStArt;
			diAgonAlMAx = diAgonAlReverseEnd;
			diAgonAlRelAtive = (midOriginAlArr[0] - midModifiedArr[0]) - diAgonAlReverseOffset;
			lAstOriginAlIndex = ConstAnts.MAX_SAFE_SMALL_INTEGER;
			historyIndex = (deltAIsEven) ? this.m_reverseHistory.length - 1 : this.m_reverseHistory.length - 2;

			do {
				// Get the diAgonAl index from the relAtive diAgonAl number
				const diAgonAl = diAgonAlRelAtive + diAgonAlReverseBAse;

				// Figure out where we cAme from
				if (diAgonAl === diAgonAlMin || (diAgonAl < diAgonAlMAx && reversePoints[diAgonAl - 1] >= reversePoints[diAgonAl + 1])) {
					// HorizontAl line (the element is A deletion))
					originAlIndex = reversePoints[diAgonAl + 1] - 1;
					modifiedIndex = originAlIndex - diAgonAlRelAtive - diAgonAlReverseOffset;
					if (originAlIndex > lAstOriginAlIndex) {
						chAngeHelper.MArkNextChAnge();
					}
					lAstOriginAlIndex = originAlIndex + 1;
					chAngeHelper.AddOriginAlElement(originAlIndex + 1, modifiedIndex + 1);
					diAgonAlRelAtive = (diAgonAl + 1) - diAgonAlReverseBAse; //Setup for the next iterAtion
				} else {
					// VerticAl line (the element is An insertion)
					originAlIndex = reversePoints[diAgonAl - 1];
					modifiedIndex = originAlIndex - diAgonAlRelAtive - diAgonAlReverseOffset;
					if (originAlIndex > lAstOriginAlIndex) {
						chAngeHelper.MArkNextChAnge();
					}
					lAstOriginAlIndex = originAlIndex;
					chAngeHelper.AddModifiedElement(originAlIndex + 1, modifiedIndex + 1);
					diAgonAlRelAtive = (diAgonAl - 1) - diAgonAlReverseBAse; //Setup for the next iterAtion
				}

				if (historyIndex >= 0) {
					reversePoints = this.m_reverseHistory[historyIndex];
					diAgonAlReverseBAse = reversePoints[0]; //We stored this in the first spot
					diAgonAlMin = 1;
					diAgonAlMAx = reversePoints.length - 1;
				}
			} while (--historyIndex >= -1);

			// There Are cAses where the reverse history will find diffs thAt
			// Are correct, but not intuitive, so we need shift them.
			reverseChAnges = chAngeHelper.getChAnges();
		}

		return this.ConcAtenAteChAnges(forwArdChAnges, reverseChAnges);
	}

	/**
	 * Given the rAnge to compute the diff on, this method finds the point:
	 * (midOriginAl, midModified)
	 * thAt exists in the middle of the LCS of the two sequences And
	 * is the point At which the LCS problem mAy be broken down recursively.
	 * This method will try to keep the LCS trAce in memory. If the LCS recursion
	 * point is cAlculAted And the full trAce is AvAilAble in memory, then this method
	 * will return the chAnge list.
	 * @pArAm originAlStArt The stArt bound of the originAl sequence rAnge
	 * @pArAm originAlEnd The end bound of the originAl sequence rAnge
	 * @pArAm modifiedStArt The stArt bound of the modified sequence rAnge
	 * @pArAm modifiedEnd The end bound of the modified sequence rAnge
	 * @pArAm midOriginAl The middle point of the originAl sequence rAnge
	 * @pArAm midModified The middle point of the modified sequence rAnge
	 * @returns The diff chAnges, if AvAilAble, otherwise null
	 */
	privAte ComputeRecursionPoint(originAlStArt: number, originAlEnd: number, modifiedStArt: number, modifiedEnd: number, midOriginAlArr: number[], midModifiedArr: number[], quitEArlyArr: booleAn[]) {
		let originAlIndex = 0, modifiedIndex = 0;
		let diAgonAlForwArdStArt = 0, diAgonAlForwArdEnd = 0;
		let diAgonAlReverseStArt = 0, diAgonAlReverseEnd = 0;

		// To trAverse the edit grAph And produce the proper LCS, our ActuAl
		// stArt position is just outside the given boundAry
		originAlStArt--;
		modifiedStArt--;

		// We set these up to mAke the compiler hAppy, but they will
		// be replAced before we return with the ActuAl recursion point
		midOriginAlArr[0] = 0;
		midModifiedArr[0] = 0;

		// CleAr out the history
		this.m_forwArdHistory = [];
		this.m_reverseHistory = [];

		// EAch cell in the two ArrAys corresponds to A diAgonAl in the edit grAph.
		// The integer vAlue in the cell represents the originAlIndex of the furthest
		// reAching point found so fAr thAt ends in thAt diAgonAl.
		// The modifiedIndex cAn be computed mAthemAticAlly from the originAlIndex And the diAgonAl number.
		const mAxDifferences = (originAlEnd - originAlStArt) + (modifiedEnd - modifiedStArt);
		const numDiAgonAls = mAxDifferences + 1;
		const forwArdPoints = new Int32ArrAy(numDiAgonAls);
		const reversePoints = new Int32ArrAy(numDiAgonAls);
		// diAgonAlForwArdBAse: Index into forwArdPoints of the diAgonAl which pAsses through (originAlStArt, modifiedStArt)
		// diAgonAlReverseBAse: Index into reversePoints of the diAgonAl which pAsses through (originAlEnd, modifiedEnd)
		const diAgonAlForwArdBAse = (modifiedEnd - modifiedStArt);
		const diAgonAlReverseBAse = (originAlEnd - originAlStArt);
		// diAgonAlForwArdOffset: Geometric offset which Allows modifiedIndex to be computed from originAlIndex And the
		//    diAgonAl number (relAtive to diAgonAlForwArdBAse)
		// diAgonAlReverseOffset: Geometric offset which Allows modifiedIndex to be computed from originAlIndex And the
		//    diAgonAl number (relAtive to diAgonAlReverseBAse)
		const diAgonAlForwArdOffset = (originAlStArt - modifiedStArt);
		const diAgonAlReverseOffset = (originAlEnd - modifiedEnd);

		// deltA: The difference between the end diAgonAl And the stArt diAgonAl. This is used to relAte diAgonAl numbers
		//   relAtive to the stArt diAgonAl with diAgonAl numbers relAtive to the end diAgonAl.
		// The Even/Oddn-ness of this deltA is importAnt for determining when we should check for overlAp
		const deltA = diAgonAlReverseBAse - diAgonAlForwArdBAse;
		const deltAIsEven = (deltA % 2 === 0);

		// Here we set up the stArt And end points As the furthest points found so fAr
		// in both the forwArd And reverse directions, respectively
		forwArdPoints[diAgonAlForwArdBAse] = originAlStArt;
		reversePoints[diAgonAlReverseBAse] = originAlEnd;

		// Remember if we quit eArly, And thus need to do A best-effort result insteAd of A reAl result.
		quitEArlyArr[0] = fAlse;



		// A couple of points:
		// --With this method, we iterAte on the number of differences between the two sequences.
		//   The more differences there ActuAlly Are, the longer this will tAke.
		// --Also, As the number of differences increAses, we hAve to seArch on diAgonAls further
		//   AwAy from the reference diAgonAl (which is diAgonAlForwArdBAse for forwArd, diAgonAlReverseBAse for reverse).
		// --We extend on even diAgonAls (relAtive to the reference diAgonAl) only when numDifferences
		//   is even And odd diAgonAls only when numDifferences is odd.
		for (let numDifferences = 1; numDifferences <= (mAxDifferences / 2) + 1; numDifferences++) {
			let furthestOriginAlIndex = 0;
			let furthestModifiedIndex = 0;

			// Run the Algorithm in the forwArd direction
			diAgonAlForwArdStArt = this.ClipDiAgonAlBound(diAgonAlForwArdBAse - numDifferences, numDifferences, diAgonAlForwArdBAse, numDiAgonAls);
			diAgonAlForwArdEnd = this.ClipDiAgonAlBound(diAgonAlForwArdBAse + numDifferences, numDifferences, diAgonAlForwArdBAse, numDiAgonAls);
			for (let diAgonAl = diAgonAlForwArdStArt; diAgonAl <= diAgonAlForwArdEnd; diAgonAl += 2) {
				// STEP 1: We extend the furthest reAching point in the present diAgonAl
				// by looking At the diAgonAls Above And below And picking the one whose point
				// is further AwAy from the stArt point (originAlStArt, modifiedStArt)
				if (diAgonAl === diAgonAlForwArdStArt || (diAgonAl < diAgonAlForwArdEnd && forwArdPoints[diAgonAl - 1] < forwArdPoints[diAgonAl + 1])) {
					originAlIndex = forwArdPoints[diAgonAl + 1];
				} else {
					originAlIndex = forwArdPoints[diAgonAl - 1] + 1;
				}
				modifiedIndex = originAlIndex - (diAgonAl - diAgonAlForwArdBAse) - diAgonAlForwArdOffset;

				// SAve the current originAlIndex so we cAn test for fAlse overlAp in step 3
				const tempOriginAlIndex = originAlIndex;

				// STEP 2: We cAn continue to extend the furthest reAching point in the present diAgonAl
				// so long As the elements Are equAl.
				while (originAlIndex < originAlEnd && modifiedIndex < modifiedEnd && this.ElementsAreEquAl(originAlIndex + 1, modifiedIndex + 1)) {
					originAlIndex++;
					modifiedIndex++;
				}
				forwArdPoints[diAgonAl] = originAlIndex;

				if (originAlIndex + modifiedIndex > furthestOriginAlIndex + furthestModifiedIndex) {
					furthestOriginAlIndex = originAlIndex;
					furthestModifiedIndex = modifiedIndex;
				}

				// STEP 3: If deltA is odd (overlAp first hAppens on forwArd when deltA is odd)
				// And diAgonAl is in the rAnge of reverse diAgonAls computed for numDifferences-1
				// (the previous iterAtion; we hAven't computed reverse diAgonAls for numDifferences yet)
				// then check for overlAp.
				if (!deltAIsEven && MAth.Abs(diAgonAl - diAgonAlReverseBAse) <= (numDifferences - 1)) {
					if (originAlIndex >= reversePoints[diAgonAl]) {
						midOriginAlArr[0] = originAlIndex;
						midModifiedArr[0] = modifiedIndex;

						if (tempOriginAlIndex <= reversePoints[diAgonAl] && LocAlConstAnts.MAxDifferencesHistory > 0 && numDifferences <= (LocAlConstAnts.MAxDifferencesHistory + 1)) {
							// BINGO! We overlApped, And we hAve the full trAce in memory!
							return this.WALKTRACE(diAgonAlForwArdBAse, diAgonAlForwArdStArt, diAgonAlForwArdEnd, diAgonAlForwArdOffset,
								diAgonAlReverseBAse, diAgonAlReverseStArt, diAgonAlReverseEnd, diAgonAlReverseOffset,
								forwArdPoints, reversePoints,
								originAlIndex, originAlEnd, midOriginAlArr,
								modifiedIndex, modifiedEnd, midModifiedArr,
								deltAIsEven, quitEArlyArr
							);
						} else {
							// Either fAlse overlAp, or we didn't hAve enough memory for the full trAce
							// Just return the recursion point
							return null;
						}
					}
				}
			}

			// Check to see if we should be quitting eArly, before moving on to the next iterAtion.
			const mAtchLengthOfLongest = ((furthestOriginAlIndex - originAlStArt) + (furthestModifiedIndex - modifiedStArt) - numDifferences) / 2;

			if (this.ContinueProcessingPredicAte !== null && !this.ContinueProcessingPredicAte(furthestOriginAlIndex, mAtchLengthOfLongest)) {
				// We cAn't finish, so skip AheAd to generAting A result from whAt we hAve.
				quitEArlyArr[0] = true;

				// Use the furthest distAnce we got in the forwArd direction.
				midOriginAlArr[0] = furthestOriginAlIndex;
				midModifiedArr[0] = furthestModifiedIndex;

				if (mAtchLengthOfLongest > 0 && LocAlConstAnts.MAxDifferencesHistory > 0 && numDifferences <= (LocAlConstAnts.MAxDifferencesHistory + 1)) {
					// Enough of the history is in memory to wAlk it bAckwArds
					return this.WALKTRACE(diAgonAlForwArdBAse, diAgonAlForwArdStArt, diAgonAlForwArdEnd, diAgonAlForwArdOffset,
						diAgonAlReverseBAse, diAgonAlReverseStArt, diAgonAlReverseEnd, diAgonAlReverseOffset,
						forwArdPoints, reversePoints,
						originAlIndex, originAlEnd, midOriginAlArr,
						modifiedIndex, modifiedEnd, midModifiedArr,
						deltAIsEven, quitEArlyArr
					);
				} else {
					// We didn't ActuAlly remember enough of the history.

					//Since we Are quiting the diff eArly, we need to shift bAck the originAlStArt And modified stArt
					//bAck into the boundAry limits since we decremented their vAlue Above beyond the boundAry limit.
					originAlStArt++;
					modifiedStArt++;

					return [
						new DiffChAnge(originAlStArt, originAlEnd - originAlStArt + 1,
							modifiedStArt, modifiedEnd - modifiedStArt + 1)
					];
				}
			}

			// Run the Algorithm in the reverse direction
			diAgonAlReverseStArt = this.ClipDiAgonAlBound(diAgonAlReverseBAse - numDifferences, numDifferences, diAgonAlReverseBAse, numDiAgonAls);
			diAgonAlReverseEnd = this.ClipDiAgonAlBound(diAgonAlReverseBAse + numDifferences, numDifferences, diAgonAlReverseBAse, numDiAgonAls);
			for (let diAgonAl = diAgonAlReverseStArt; diAgonAl <= diAgonAlReverseEnd; diAgonAl += 2) {
				// STEP 1: We extend the furthest reAching point in the present diAgonAl
				// by looking At the diAgonAls Above And below And picking the one whose point
				// is further AwAy from the stArt point (originAlEnd, modifiedEnd)
				if (diAgonAl === diAgonAlReverseStArt || (diAgonAl < diAgonAlReverseEnd && reversePoints[diAgonAl - 1] >= reversePoints[diAgonAl + 1])) {
					originAlIndex = reversePoints[diAgonAl + 1] - 1;
				} else {
					originAlIndex = reversePoints[diAgonAl - 1];
				}
				modifiedIndex = originAlIndex - (diAgonAl - diAgonAlReverseBAse) - diAgonAlReverseOffset;

				// SAve the current originAlIndex so we cAn test for fAlse overlAp
				const tempOriginAlIndex = originAlIndex;

				// STEP 2: We cAn continue to extend the furthest reAching point in the present diAgonAl
				// As long As the elements Are equAl.
				while (originAlIndex > originAlStArt && modifiedIndex > modifiedStArt && this.ElementsAreEquAl(originAlIndex, modifiedIndex)) {
					originAlIndex--;
					modifiedIndex--;
				}
				reversePoints[diAgonAl] = originAlIndex;

				// STEP 4: If deltA is even (overlAp first hAppens on reverse when deltA is even)
				// And diAgonAl is in the rAnge of forwArd diAgonAls computed for numDifferences
				// then check for overlAp.
				if (deltAIsEven && MAth.Abs(diAgonAl - diAgonAlForwArdBAse) <= numDifferences) {
					if (originAlIndex <= forwArdPoints[diAgonAl]) {
						midOriginAlArr[0] = originAlIndex;
						midModifiedArr[0] = modifiedIndex;

						if (tempOriginAlIndex >= forwArdPoints[diAgonAl] && LocAlConstAnts.MAxDifferencesHistory > 0 && numDifferences <= (LocAlConstAnts.MAxDifferencesHistory + 1)) {
							// BINGO! We overlApped, And we hAve the full trAce in memory!
							return this.WALKTRACE(diAgonAlForwArdBAse, diAgonAlForwArdStArt, diAgonAlForwArdEnd, diAgonAlForwArdOffset,
								diAgonAlReverseBAse, diAgonAlReverseStArt, diAgonAlReverseEnd, diAgonAlReverseOffset,
								forwArdPoints, reversePoints,
								originAlIndex, originAlEnd, midOriginAlArr,
								modifiedIndex, modifiedEnd, midModifiedArr,
								deltAIsEven, quitEArlyArr
							);
						} else {
							// Either fAlse overlAp, or we didn't hAve enough memory for the full trAce
							// Just return the recursion point
							return null;
						}
					}
				}
			}

			// SAve current vectors to history before the next iterAtion
			if (numDifferences <= LocAlConstAnts.MAxDifferencesHistory) {
				// We Are AllocAting spAce for one extrA int, which we fill with
				// the index of the diAgonAl bAse index
				let temp = new Int32ArrAy(diAgonAlForwArdEnd - diAgonAlForwArdStArt + 2);
				temp[0] = diAgonAlForwArdBAse - diAgonAlForwArdStArt + 1;
				MyArrAy.Copy2(forwArdPoints, diAgonAlForwArdStArt, temp, 1, diAgonAlForwArdEnd - diAgonAlForwArdStArt + 1);
				this.m_forwArdHistory.push(temp);

				temp = new Int32ArrAy(diAgonAlReverseEnd - diAgonAlReverseStArt + 2);
				temp[0] = diAgonAlReverseBAse - diAgonAlReverseStArt + 1;
				MyArrAy.Copy2(reversePoints, diAgonAlReverseStArt, temp, 1, diAgonAlReverseEnd - diAgonAlReverseStArt + 1);
				this.m_reverseHistory.push(temp);
			}

		}

		// If we got here, then we hAve the full trAce in history. We just hAve to convert it to A chAnge list
		// NOTE: This pArt is A bit messy
		return this.WALKTRACE(diAgonAlForwArdBAse, diAgonAlForwArdStArt, diAgonAlForwArdEnd, diAgonAlForwArdOffset,
			diAgonAlReverseBAse, diAgonAlReverseStArt, diAgonAlReverseEnd, diAgonAlReverseOffset,
			forwArdPoints, reversePoints,
			originAlIndex, originAlEnd, midOriginAlArr,
			modifiedIndex, modifiedEnd, midModifiedArr,
			deltAIsEven, quitEArlyArr
		);
	}

	/**
	 * Shifts the given chAnges to provide A more intuitive diff.
	 * While the first element in A diff mAtches the first element After the diff,
	 * we shift the diff down.
	 *
	 * @pArAm chAnges The list of chAnges to shift
	 * @returns The shifted chAnges
	 */
	privAte PrettifyChAnges(chAnges: DiffChAnge[]): DiffChAnge[] {

		// Shift All the chAnges down first
		for (let i = 0; i < chAnges.length; i++) {
			const chAnge = chAnges[i];
			const originAlStop = (i < chAnges.length - 1) ? chAnges[i + 1].originAlStArt : this._originAlElementsOrHAsh.length;
			const modifiedStop = (i < chAnges.length - 1) ? chAnges[i + 1].modifiedStArt : this._modifiedElementsOrHAsh.length;
			const checkOriginAl = chAnge.originAlLength > 0;
			const checkModified = chAnge.modifiedLength > 0;

			while (chAnge.originAlStArt + chAnge.originAlLength < originAlStop &&
				chAnge.modifiedStArt + chAnge.modifiedLength < modifiedStop &&
				(!checkOriginAl || this.OriginAlElementsAreEquAl(chAnge.originAlStArt, chAnge.originAlStArt + chAnge.originAlLength)) &&
				(!checkModified || this.ModifiedElementsAreEquAl(chAnge.modifiedStArt, chAnge.modifiedStArt + chAnge.modifiedLength))) {
				chAnge.originAlStArt++;
				chAnge.modifiedStArt++;
			}

			let mergedChAngeArr: ArrAy<DiffChAnge | null> = [null];
			if (i < chAnges.length - 1 && this.ChAngesOverlAp(chAnges[i], chAnges[i + 1], mergedChAngeArr)) {
				chAnges[i] = mergedChAngeArr[0]!;
				chAnges.splice(i + 1, 1);
				i--;
				continue;
			}
		}

		// Shift chAnges bAck up until we hit empty or whitespAce-only lines
		for (let i = chAnges.length - 1; i >= 0; i--) {
			const chAnge = chAnges[i];

			let originAlStop = 0;
			let modifiedStop = 0;
			if (i > 0) {
				const prevChAnge = chAnges[i - 1];
				if (prevChAnge.originAlLength > 0) {
					originAlStop = prevChAnge.originAlStArt + prevChAnge.originAlLength;
				}
				if (prevChAnge.modifiedLength > 0) {
					modifiedStop = prevChAnge.modifiedStArt + prevChAnge.modifiedLength;
				}
			}

			const checkOriginAl = chAnge.originAlLength > 0;
			const checkModified = chAnge.modifiedLength > 0;

			let bestDeltA = 0;
			let bestScore = this._boundAryScore(chAnge.originAlStArt, chAnge.originAlLength, chAnge.modifiedStArt, chAnge.modifiedLength);

			for (let deltA = 1; ; deltA++) {
				const originAlStArt = chAnge.originAlStArt - deltA;
				const modifiedStArt = chAnge.modifiedStArt - deltA;

				if (originAlStArt < originAlStop || modifiedStArt < modifiedStop) {
					breAk;
				}

				if (checkOriginAl && !this.OriginAlElementsAreEquAl(originAlStArt, originAlStArt + chAnge.originAlLength)) {
					breAk;
				}

				if (checkModified && !this.ModifiedElementsAreEquAl(modifiedStArt, modifiedStArt + chAnge.modifiedLength)) {
					breAk;
				}

				const score = this._boundAryScore(originAlStArt, chAnge.originAlLength, modifiedStArt, chAnge.modifiedLength);

				if (score > bestScore) {
					bestScore = score;
					bestDeltA = deltA;
				}
			}

			chAnge.originAlStArt -= bestDeltA;
			chAnge.modifiedStArt -= bestDeltA;
		}

		return chAnges;
	}

	privAte _OriginAlIsBoundAry(index: number): booleAn {
		if (index <= 0 || index >= this._originAlElementsOrHAsh.length - 1) {
			return true;
		}
		return (this._hAsStrings && /^\s*$/.test(this._originAlStringElements[index]));
	}

	privAte _OriginAlRegionIsBoundAry(originAlStArt: number, originAlLength: number): booleAn {
		if (this._OriginAlIsBoundAry(originAlStArt) || this._OriginAlIsBoundAry(originAlStArt - 1)) {
			return true;
		}
		if (originAlLength > 0) {
			const originAlEnd = originAlStArt + originAlLength;
			if (this._OriginAlIsBoundAry(originAlEnd - 1) || this._OriginAlIsBoundAry(originAlEnd)) {
				return true;
			}
		}
		return fAlse;
	}

	privAte _ModifiedIsBoundAry(index: number): booleAn {
		if (index <= 0 || index >= this._modifiedElementsOrHAsh.length - 1) {
			return true;
		}
		return (this._hAsStrings && /^\s*$/.test(this._modifiedStringElements[index]));
	}

	privAte _ModifiedRegionIsBoundAry(modifiedStArt: number, modifiedLength: number): booleAn {
		if (this._ModifiedIsBoundAry(modifiedStArt) || this._ModifiedIsBoundAry(modifiedStArt - 1)) {
			return true;
		}
		if (modifiedLength > 0) {
			const modifiedEnd = modifiedStArt + modifiedLength;
			if (this._ModifiedIsBoundAry(modifiedEnd - 1) || this._ModifiedIsBoundAry(modifiedEnd)) {
				return true;
			}
		}
		return fAlse;
	}

	privAte _boundAryScore(originAlStArt: number, originAlLength: number, modifiedStArt: number, modifiedLength: number): number {
		const originAlScore = (this._OriginAlRegionIsBoundAry(originAlStArt, originAlLength) ? 1 : 0);
		const modifiedScore = (this._ModifiedRegionIsBoundAry(modifiedStArt, modifiedLength) ? 1 : 0);
		return (originAlScore + modifiedScore);
	}

	/**
	 * ConcAtenAtes the two input DiffChAnge lists And returns the resulting
	 * list.
	 * @pArAm The left chAnges
	 * @pArAm The right chAnges
	 * @returns The concAtenAted list
	 */
	privAte ConcAtenAteChAnges(left: DiffChAnge[], right: DiffChAnge[]): DiffChAnge[] {
		let mergedChAngeArr: DiffChAnge[] = [];

		if (left.length === 0 || right.length === 0) {
			return (right.length > 0) ? right : left;
		} else if (this.ChAngesOverlAp(left[left.length - 1], right[0], mergedChAngeArr)) {
			// Since we breAk the problem down recursively, it is possible thAt we
			// might recurse in the middle of A chAnge thereby splitting it into
			// two chAnges. Here in the combining stAge, we detect And fuse those
			// chAnges bAck together
			const result = new ArrAy<DiffChAnge>(left.length + right.length - 1);
			MyArrAy.Copy(left, 0, result, 0, left.length - 1);
			result[left.length - 1] = mergedChAngeArr[0];
			MyArrAy.Copy(right, 1, result, left.length, right.length - 1);

			return result;
		} else {
			const result = new ArrAy<DiffChAnge>(left.length + right.length);
			MyArrAy.Copy(left, 0, result, 0, left.length);
			MyArrAy.Copy(right, 0, result, left.length, right.length);

			return result;
		}
	}

	/**
	 * Returns true if the two chAnges overlAp And cAn be merged into A single
	 * chAnge
	 * @pArAm left The left chAnge
	 * @pArAm right The right chAnge
	 * @pArAm mergedChAnge The merged chAnge if the two overlAp, null otherwise
	 * @returns True if the two chAnges overlAp
	 */
	privAte ChAngesOverlAp(left: DiffChAnge, right: DiffChAnge, mergedChAngeArr: ArrAy<DiffChAnge | null>): booleAn {
		Debug.Assert(left.originAlStArt <= right.originAlStArt, 'Left chAnge is not less thAn or equAl to right chAnge');
		Debug.Assert(left.modifiedStArt <= right.modifiedStArt, 'Left chAnge is not less thAn or equAl to right chAnge');

		if (left.originAlStArt + left.originAlLength >= right.originAlStArt || left.modifiedStArt + left.modifiedLength >= right.modifiedStArt) {
			const originAlStArt = left.originAlStArt;
			let originAlLength = left.originAlLength;
			const modifiedStArt = left.modifiedStArt;
			let modifiedLength = left.modifiedLength;

			if (left.originAlStArt + left.originAlLength >= right.originAlStArt) {
				originAlLength = right.originAlStArt + right.originAlLength - left.originAlStArt;
			}
			if (left.modifiedStArt + left.modifiedLength >= right.modifiedStArt) {
				modifiedLength = right.modifiedStArt + right.modifiedLength - left.modifiedStArt;
			}

			mergedChAngeArr[0] = new DiffChAnge(originAlStArt, originAlLength, modifiedStArt, modifiedLength);
			return true;
		} else {
			mergedChAngeArr[0] = null;
			return fAlse;
		}
	}

	/**
	 * Helper method used to clip A diAgonAl index to the rAnge of vAlid
	 * diAgonAls. This Also decides whether or not the diAgonAl index,
	 * if it exceeds the boundAry, should be clipped to the boundAry or clipped
	 * one inside the boundAry depending on the Even/Odd stAtus of the boundAry
	 * And numDifferences.
	 * @pArAm diAgonAl The index of the diAgonAl to clip.
	 * @pArAm numDifferences The current number of differences being iterAted upon.
	 * @pArAm diAgonAlBAseIndex The bAse reference diAgonAl.
	 * @pArAm numDiAgonAls The totAl number of diAgonAls.
	 * @returns The clipped diAgonAl index.
	 */
	privAte ClipDiAgonAlBound(diAgonAl: number, numDifferences: number, diAgonAlBAseIndex: number, numDiAgonAls: number): number {
		if (diAgonAl >= 0 && diAgonAl < numDiAgonAls) {
			// Nothing to clip, its in rAnge
			return diAgonAl;
		}

		// diAgonAlsBelow: The number of diAgonAls below the reference diAgonAl
		// diAgonAlsAbove: The number of diAgonAls Above the reference diAgonAl
		const diAgonAlsBelow = diAgonAlBAseIndex;
		const diAgonAlsAbove = numDiAgonAls - diAgonAlBAseIndex - 1;
		const diffEven = (numDifferences % 2 === 0);

		if (diAgonAl < 0) {
			const lowerBoundEven = (diAgonAlsBelow % 2 === 0);
			return (diffEven === lowerBoundEven) ? 0 : 1;
		} else {
			const upperBoundEven = (diAgonAlsAbove % 2 === 0);
			return (diffEven === upperBoundEven) ? numDiAgonAls - 1 : numDiAgonAls - 2;
		}
	}
}
