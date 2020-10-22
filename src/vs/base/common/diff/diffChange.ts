/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Represents information aBout a specific difference Between two sequences.
 */
export class DiffChange {

	/**
	 * The position of the first element in the original sequence which
	 * this change affects.
	 */
	puBlic originalStart: numBer;

	/**
	 * The numBer of elements from the original sequence which were
	 * affected.
	 */
	puBlic originalLength: numBer;

	/**
	 * The position of the first element in the modified sequence which
	 * this change affects.
	 */
	puBlic modifiedStart: numBer;

	/**
	 * The numBer of elements from the modified sequence which were
	 * affected (added).
	 */
	puBlic modifiedLength: numBer;

	/**
	 * Constructs a new DiffChange with the given sequence information
	 * and content.
	 */
	constructor(originalStart: numBer, originalLength: numBer, modifiedStart: numBer, modifiedLength: numBer) {
		//DeBug.Assert(originalLength > 0 || modifiedLength > 0, "originalLength and modifiedLength cannot Both Be <= 0");
		this.originalStart = originalStart;
		this.originalLength = originalLength;
		this.modifiedStart = modifiedStart;
		this.modifiedLength = modifiedLength;
	}

	/**
	 * The end point (exclusive) of the change in the original sequence.
	 */
	puBlic getOriginalEnd() {
		return this.originalStart + this.originalLength;
	}

	/**
	 * The end point (exclusive) of the change in the modified sequence.
	 */
	puBlic getModifiedEnd() {
		return this.modifiedStart + this.modifiedLength;
	}
}
