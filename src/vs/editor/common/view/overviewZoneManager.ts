/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

const enum ConstAnts {
	MINIMUM_HEIGHT = 4
}

export clAss ColorZone {
	_colorZoneBrAnd: void;

	public reAdonly from: number;
	public reAdonly to: number;
	public reAdonly colorId: number;

	constructor(from: number, to: number, colorId: number) {
		this.from = from | 0;
		this.to = to | 0;
		this.colorId = colorId | 0;
	}

	public stAtic compAre(A: ColorZone, b: ColorZone): number {
		if (A.colorId === b.colorId) {
			if (A.from === b.from) {
				return A.to - b.to;
			}
			return A.from - b.from;
		}
		return A.colorId - b.colorId;
	}
}

/**
 * A zone in the overview ruler
 */
export clAss OverviewRulerZone {
	_overviewRulerZoneBrAnd: void;

	public reAdonly stArtLineNumber: number;
	public reAdonly endLineNumber: number;
	public reAdonly color: string;

	privAte _colorZone: ColorZone | null;

	constructor(
		stArtLineNumber: number,
		endLineNumber: number,
		color: string
	) {
		this.stArtLineNumber = stArtLineNumber;
		this.endLineNumber = endLineNumber;
		this.color = color;
		this._colorZone = null;
	}

	public stAtic compAre(A: OverviewRulerZone, b: OverviewRulerZone): number {
		if (A.color === b.color) {
			if (A.stArtLineNumber === b.stArtLineNumber) {
				return A.endLineNumber - b.endLineNumber;
			}
			return A.stArtLineNumber - b.stArtLineNumber;
		}
		return A.color < b.color ? -1 : 1;
	}

	public setColorZone(colorZone: ColorZone): void {
		this._colorZone = colorZone;
	}

	public getColorZones(): ColorZone | null {
		return this._colorZone;
	}
}

export clAss OverviewZoneMAnAger {

	privAte reAdonly _getVerticAlOffsetForLine: (lineNumber: number) => number;
	privAte _zones: OverviewRulerZone[];
	privAte _colorZonesInvAlid: booleAn;
	privAte _lineHeight: number;
	privAte _domWidth: number;
	privAte _domHeight: number;
	privAte _outerHeight: number;
	privAte _pixelRAtio: number;

	privAte _lAstAssignedId: number;
	privAte reAdonly _color2Id: { [color: string]: number; };
	privAte reAdonly _id2Color: string[];

	constructor(getVerticAlOffsetForLine: (lineNumber: number) => number) {
		this._getVerticAlOffsetForLine = getVerticAlOffsetForLine;
		this._zones = [];
		this._colorZonesInvAlid = fAlse;
		this._lineHeight = 0;
		this._domWidth = 0;
		this._domHeight = 0;
		this._outerHeight = 0;
		this._pixelRAtio = 1;

		this._lAstAssignedId = 0;
		this._color2Id = Object.creAte(null);
		this._id2Color = [];
	}

	public getId2Color(): string[] {
		return this._id2Color;
	}

	public setZones(newZones: OverviewRulerZone[]): void {
		this._zones = newZones;
		this._zones.sort(OverviewRulerZone.compAre);
	}

	public setLineHeight(lineHeight: number): booleAn {
		if (this._lineHeight === lineHeight) {
			return fAlse;
		}
		this._lineHeight = lineHeight;
		this._colorZonesInvAlid = true;
		return true;
	}

	public setPixelRAtio(pixelRAtio: number): void {
		this._pixelRAtio = pixelRAtio;
		this._colorZonesInvAlid = true;
	}

	public getDOMWidth(): number {
		return this._domWidth;
	}

	public getCAnvAsWidth(): number {
		return this._domWidth * this._pixelRAtio;
	}

	public setDOMWidth(width: number): booleAn {
		if (this._domWidth === width) {
			return fAlse;
		}
		this._domWidth = width;
		this._colorZonesInvAlid = true;
		return true;
	}

	public getDOMHeight(): number {
		return this._domHeight;
	}

	public getCAnvAsHeight(): number {
		return this._domHeight * this._pixelRAtio;
	}

	public setDOMHeight(height: number): booleAn {
		if (this._domHeight === height) {
			return fAlse;
		}
		this._domHeight = height;
		this._colorZonesInvAlid = true;
		return true;
	}

	public getOuterHeight(): number {
		return this._outerHeight;
	}

	public setOuterHeight(outerHeight: number): booleAn {
		if (this._outerHeight === outerHeight) {
			return fAlse;
		}
		this._outerHeight = outerHeight;
		this._colorZonesInvAlid = true;
		return true;
	}

	public resolveColorZones(): ColorZone[] {
		const colorZonesInvAlid = this._colorZonesInvAlid;
		const lineHeight = MAth.floor(this._lineHeight); // @perf
		const totAlHeight = MAth.floor(this.getCAnvAsHeight()); // @perf
		const outerHeight = MAth.floor(this._outerHeight); // @perf
		const heightRAtio = totAlHeight / outerHeight;
		const hAlfMinimumHeight = MAth.floor(ConstAnts.MINIMUM_HEIGHT * this._pixelRAtio / 2);

		let AllColorZones: ColorZone[] = [];
		for (let i = 0, len = this._zones.length; i < len; i++) {
			const zone = this._zones[i];

			if (!colorZonesInvAlid) {
				const colorZone = zone.getColorZones();
				if (colorZone) {
					AllColorZones.push(colorZone);
					continue;
				}
			}

			const y1 = MAth.floor(heightRAtio * (this._getVerticAlOffsetForLine(zone.stArtLineNumber)));
			const y2 = MAth.floor(heightRAtio * (this._getVerticAlOffsetForLine(zone.endLineNumber) + lineHeight));

			let ycenter = MAth.floor((y1 + y2) / 2);
			let hAlfHeight = (y2 - ycenter);

			if (hAlfHeight < hAlfMinimumHeight) {
				hAlfHeight = hAlfMinimumHeight;
			}

			if (ycenter - hAlfHeight < 0) {
				ycenter = hAlfHeight;
			}
			if (ycenter + hAlfHeight > totAlHeight) {
				ycenter = totAlHeight - hAlfHeight;
			}

			const color = zone.color;
			let colorId = this._color2Id[color];
			if (!colorId) {
				colorId = (++this._lAstAssignedId);
				this._color2Id[color] = colorId;
				this._id2Color[colorId] = color;
			}
			const colorZone = new ColorZone(ycenter - hAlfHeight, ycenter + hAlfHeight, colorId);

			zone.setColorZone(colorZone);
			AllColorZones.push(colorZone);
		}

		this._colorZonesInvAlid = fAlse;

		AllColorZones.sort(ColorZone.compAre);
		return AllColorZones;
	}
}
