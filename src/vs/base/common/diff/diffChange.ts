/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/**
 * Represents informAtion About A specific difference between two sequences.
 */
export clAss DiffChAnge {

	/**
	 * The position of the first element in the originAl sequence which
	 * this chAnge Affects.
	 */
	public originAlStArt: number;

	/**
	 * The number of elements from the originAl sequence which were
	 * Affected.
	 */
	public originAlLength: number;

	/**
	 * The position of the first element in the modified sequence which
	 * this chAnge Affects.
	 */
	public modifiedStArt: number;

	/**
	 * The number of elements from the modified sequence which were
	 * Affected (Added).
	 */
	public modifiedLength: number;

	/**
	 * Constructs A new DiffChAnge with the given sequence informAtion
	 * And content.
	 */
	constructor(originAlStArt: number, originAlLength: number, modifiedStArt: number, modifiedLength: number) {
		//Debug.Assert(originAlLength > 0 || modifiedLength > 0, "originAlLength And modifiedLength cAnnot both be <= 0");
		this.originAlStArt = originAlStArt;
		this.originAlLength = originAlLength;
		this.modifiedStArt = modifiedStArt;
		this.modifiedLength = modifiedLength;
	}

	/**
	 * The end point (exclusive) of the chAnge in the originAl sequence.
	 */
	public getOriginAlEnd() {
		return this.originAlStArt + this.originAlLength;
	}

	/**
	 * The end point (exclusive) of the chAnge in the modified sequence.
	 */
	public getModifiedEnd() {
		return this.modifiedStArt + this.modifiedLength;
	}
}
