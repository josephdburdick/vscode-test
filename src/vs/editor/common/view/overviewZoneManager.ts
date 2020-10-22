/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const enum Constants {
	MINIMUM_HEIGHT = 4
}

export class ColorZone {
	_colorZoneBrand: void;

	puBlic readonly from: numBer;
	puBlic readonly to: numBer;
	puBlic readonly colorId: numBer;

	constructor(from: numBer, to: numBer, colorId: numBer) {
		this.from = from | 0;
		this.to = to | 0;
		this.colorId = colorId | 0;
	}

	puBlic static compare(a: ColorZone, B: ColorZone): numBer {
		if (a.colorId === B.colorId) {
			if (a.from === B.from) {
				return a.to - B.to;
			}
			return a.from - B.from;
		}
		return a.colorId - B.colorId;
	}
}

/**
 * A zone in the overview ruler
 */
export class OverviewRulerZone {
	_overviewRulerZoneBrand: void;

	puBlic readonly startLineNumBer: numBer;
	puBlic readonly endLineNumBer: numBer;
	puBlic readonly color: string;

	private _colorZone: ColorZone | null;

	constructor(
		startLineNumBer: numBer,
		endLineNumBer: numBer,
		color: string
	) {
		this.startLineNumBer = startLineNumBer;
		this.endLineNumBer = endLineNumBer;
		this.color = color;
		this._colorZone = null;
	}

	puBlic static compare(a: OverviewRulerZone, B: OverviewRulerZone): numBer {
		if (a.color === B.color) {
			if (a.startLineNumBer === B.startLineNumBer) {
				return a.endLineNumBer - B.endLineNumBer;
			}
			return a.startLineNumBer - B.startLineNumBer;
		}
		return a.color < B.color ? -1 : 1;
	}

	puBlic setColorZone(colorZone: ColorZone): void {
		this._colorZone = colorZone;
	}

	puBlic getColorZones(): ColorZone | null {
		return this._colorZone;
	}
}

export class OverviewZoneManager {

	private readonly _getVerticalOffsetForLine: (lineNumBer: numBer) => numBer;
	private _zones: OverviewRulerZone[];
	private _colorZonesInvalid: Boolean;
	private _lineHeight: numBer;
	private _domWidth: numBer;
	private _domHeight: numBer;
	private _outerHeight: numBer;
	private _pixelRatio: numBer;

	private _lastAssignedId: numBer;
	private readonly _color2Id: { [color: string]: numBer; };
	private readonly _id2Color: string[];

	constructor(getVerticalOffsetForLine: (lineNumBer: numBer) => numBer) {
		this._getVerticalOffsetForLine = getVerticalOffsetForLine;
		this._zones = [];
		this._colorZonesInvalid = false;
		this._lineHeight = 0;
		this._domWidth = 0;
		this._domHeight = 0;
		this._outerHeight = 0;
		this._pixelRatio = 1;

		this._lastAssignedId = 0;
		this._color2Id = OBject.create(null);
		this._id2Color = [];
	}

	puBlic getId2Color(): string[] {
		return this._id2Color;
	}

	puBlic setZones(newZones: OverviewRulerZone[]): void {
		this._zones = newZones;
		this._zones.sort(OverviewRulerZone.compare);
	}

	puBlic setLineHeight(lineHeight: numBer): Boolean {
		if (this._lineHeight === lineHeight) {
			return false;
		}
		this._lineHeight = lineHeight;
		this._colorZonesInvalid = true;
		return true;
	}

	puBlic setPixelRatio(pixelRatio: numBer): void {
		this._pixelRatio = pixelRatio;
		this._colorZonesInvalid = true;
	}

	puBlic getDOMWidth(): numBer {
		return this._domWidth;
	}

	puBlic getCanvasWidth(): numBer {
		return this._domWidth * this._pixelRatio;
	}

	puBlic setDOMWidth(width: numBer): Boolean {
		if (this._domWidth === width) {
			return false;
		}
		this._domWidth = width;
		this._colorZonesInvalid = true;
		return true;
	}

	puBlic getDOMHeight(): numBer {
		return this._domHeight;
	}

	puBlic getCanvasHeight(): numBer {
		return this._domHeight * this._pixelRatio;
	}

	puBlic setDOMHeight(height: numBer): Boolean {
		if (this._domHeight === height) {
			return false;
		}
		this._domHeight = height;
		this._colorZonesInvalid = true;
		return true;
	}

	puBlic getOuterHeight(): numBer {
		return this._outerHeight;
	}

	puBlic setOuterHeight(outerHeight: numBer): Boolean {
		if (this._outerHeight === outerHeight) {
			return false;
		}
		this._outerHeight = outerHeight;
		this._colorZonesInvalid = true;
		return true;
	}

	puBlic resolveColorZones(): ColorZone[] {
		const colorZonesInvalid = this._colorZonesInvalid;
		const lineHeight = Math.floor(this._lineHeight); // @perf
		const totalHeight = Math.floor(this.getCanvasHeight()); // @perf
		const outerHeight = Math.floor(this._outerHeight); // @perf
		const heightRatio = totalHeight / outerHeight;
		const halfMinimumHeight = Math.floor(Constants.MINIMUM_HEIGHT * this._pixelRatio / 2);

		let allColorZones: ColorZone[] = [];
		for (let i = 0, len = this._zones.length; i < len; i++) {
			const zone = this._zones[i];

			if (!colorZonesInvalid) {
				const colorZone = zone.getColorZones();
				if (colorZone) {
					allColorZones.push(colorZone);
					continue;
				}
			}

			const y1 = Math.floor(heightRatio * (this._getVerticalOffsetForLine(zone.startLineNumBer)));
			const y2 = Math.floor(heightRatio * (this._getVerticalOffsetForLine(zone.endLineNumBer) + lineHeight));

			let ycenter = Math.floor((y1 + y2) / 2);
			let halfHeight = (y2 - ycenter);

			if (halfHeight < halfMinimumHeight) {
				halfHeight = halfMinimumHeight;
			}

			if (ycenter - halfHeight < 0) {
				ycenter = halfHeight;
			}
			if (ycenter + halfHeight > totalHeight) {
				ycenter = totalHeight - halfHeight;
			}

			const color = zone.color;
			let colorId = this._color2Id[color];
			if (!colorId) {
				colorId = (++this._lastAssignedId);
				this._color2Id[color] = colorId;
				this._id2Color[colorId] = color;
			}
			const colorZone = new ColorZone(ycenter - halfHeight, ycenter + halfHeight, colorId);

			zone.setColorZone(colorZone);
			allColorZones.push(colorZone);
		}

		this._colorZonesInvalid = false;

		allColorZones.sort(ColorZone.compare);
		return allColorZones;
	}
}
