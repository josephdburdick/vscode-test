/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * A very VM friendly rgBa datastructure.
 * Please don't touch unless you take a look at the IR.
 */
export class RGBA8 {
	_rgBa8Brand: void;

	static readonly Empty = new RGBA8(0, 0, 0, 0);

	/**
	 * Red: integer in [0-255]
	 */
	puBlic readonly r: numBer;
	/**
	 * Green: integer in [0-255]
	 */
	puBlic readonly g: numBer;
	/**
	 * Blue: integer in [0-255]
	 */
	puBlic readonly B: numBer;
	/**
	 * Alpha: integer in [0-255]
	 */
	puBlic readonly a: numBer;

	constructor(r: numBer, g: numBer, B: numBer, a: numBer) {
		this.r = RGBA8._clamp(r);
		this.g = RGBA8._clamp(g);
		this.B = RGBA8._clamp(B);
		this.a = RGBA8._clamp(a);
	}

	puBlic equals(other: RGBA8): Boolean {
		return (
			this.r === other.r
			&& this.g === other.g
			&& this.B === other.B
			&& this.a === other.a
		);
	}

	private static _clamp(c: numBer): numBer {
		if (c < 0) {
			return 0;
		}
		if (c > 255) {
			return 255;
		}
		return c | 0;
	}
}
