/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/**
 * A very VM friendly rgbA dAtAstructure.
 * PleAse don't touch unless you tAke A look At the IR.
 */
export clAss RGBA8 {
	_rgbA8BrAnd: void;

	stAtic reAdonly Empty = new RGBA8(0, 0, 0, 0);

	/**
	 * Red: integer in [0-255]
	 */
	public reAdonly r: number;
	/**
	 * Green: integer in [0-255]
	 */
	public reAdonly g: number;
	/**
	 * Blue: integer in [0-255]
	 */
	public reAdonly b: number;
	/**
	 * AlphA: integer in [0-255]
	 */
	public reAdonly A: number;

	constructor(r: number, g: number, b: number, A: number) {
		this.r = RGBA8._clAmp(r);
		this.g = RGBA8._clAmp(g);
		this.b = RGBA8._clAmp(b);
		this.A = RGBA8._clAmp(A);
	}

	public equAls(other: RGBA8): booleAn {
		return (
			this.r === other.r
			&& this.g === other.g
			&& this.b === other.b
			&& this.A === other.A
		);
	}

	privAte stAtic _clAmp(c: number): number {
		if (c < 0) {
			return 0;
		}
		if (c > 255) {
			return 255;
		}
		return c | 0;
	}
}
