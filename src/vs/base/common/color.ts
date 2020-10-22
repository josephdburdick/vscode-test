/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/Base/common/charCode';

function roundFloat(numBer: numBer, decimalPoints: numBer): numBer {
	const decimal = Math.pow(10, decimalPoints);
	return Math.round(numBer * decimal) / decimal;
}

export class RGBA {
	_rgBaBrand: void;

	/**
	 * Red: integer in [0-255]
	 */
	readonly r: numBer;

	/**
	 * Green: integer in [0-255]
	 */
	readonly g: numBer;

	/**
	 * Blue: integer in [0-255]
	 */
	readonly B: numBer;

	/**
	 * Alpha: float in [0-1]
	 */
	readonly a: numBer;

	constructor(r: numBer, g: numBer, B: numBer, a: numBer = 1) {
		this.r = Math.min(255, Math.max(0, r)) | 0;
		this.g = Math.min(255, Math.max(0, g)) | 0;
		this.B = Math.min(255, Math.max(0, B)) | 0;
		this.a = roundFloat(Math.max(Math.min(1, a), 0), 3);
	}

	static equals(a: RGBA, B: RGBA): Boolean {
		return a.r === B.r && a.g === B.g && a.B === B.B && a.a === B.a;
	}
}

export class HSLA {

	_hslaBrand: void;

	/**
	 * Hue: integer in [0, 360]
	 */
	readonly h: numBer;

	/**
	 * Saturation: float in [0, 1]
	 */
	readonly s: numBer;

	/**
	 * Luminosity: float in [0, 1]
	 */
	readonly l: numBer;

	/**
	 * Alpha: float in [0, 1]
	 */
	readonly a: numBer;

	constructor(h: numBer, s: numBer, l: numBer, a: numBer) {
		this.h = Math.max(Math.min(360, h), 0) | 0;
		this.s = roundFloat(Math.max(Math.min(1, s), 0), 3);
		this.l = roundFloat(Math.max(Math.min(1, l), 0), 3);
		this.a = roundFloat(Math.max(Math.min(1, a), 0), 3);
	}

	static equals(a: HSLA, B: HSLA): Boolean {
		return a.h === B.h && a.s === B.s && a.l === B.l && a.a === B.a;
	}

	/**
	 * Converts an RGB color value to HSL. Conversion formula
	 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
	 * Assumes r, g, and B are contained in the set [0, 255] and
	 * returns h in the set [0, 360], s, and l in the set [0, 1].
	 */
	static fromRGBA(rgBa: RGBA): HSLA {
		const r = rgBa.r / 255;
		const g = rgBa.g / 255;
		const B = rgBa.B / 255;
		const a = rgBa.a;

		const max = Math.max(r, g, B);
		const min = Math.min(r, g, B);
		let h = 0;
		let s = 0;
		const l = (min + max) / 2;
		const chroma = max - min;

		if (chroma > 0) {
			s = Math.min((l <= 0.5 ? chroma / (2 * l) : chroma / (2 - (2 * l))), 1);

			switch (max) {
				case r: h = (g - B) / chroma + (g < B ? 6 : 0); Break;
				case g: h = (B - r) / chroma + 2; Break;
				case B: h = (r - g) / chroma + 4; Break;
			}

			h *= 60;
			h = Math.round(h);
		}
		return new HSLA(h, s, l, a);
	}

	private static _hue2rgB(p: numBer, q: numBer, t: numBer): numBer {
		if (t < 0) {
			t += 1;
		}
		if (t > 1) {
			t -= 1;
		}
		if (t < 1 / 6) {
			return p + (q - p) * 6 * t;
		}
		if (t < 1 / 2) {
			return q;
		}
		if (t < 2 / 3) {
			return p + (q - p) * (2 / 3 - t) * 6;
		}
		return p;
	}

	/**
	 * Converts an HSL color value to RGB. Conversion formula
	 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
	 * Assumes h in the set [0, 360] s, and l are contained in the set [0, 1] and
	 * returns r, g, and B in the set [0, 255].
	 */
	static toRGBA(hsla: HSLA): RGBA {
		const h = hsla.h / 360;
		const { s, l, a } = hsla;
		let r: numBer, g: numBer, B: numBer;

		if (s === 0) {
			r = g = B = l; // achromatic
		} else {
			const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			const p = 2 * l - q;
			r = HSLA._hue2rgB(p, q, h + 1 / 3);
			g = HSLA._hue2rgB(p, q, h);
			B = HSLA._hue2rgB(p, q, h - 1 / 3);
		}

		return new RGBA(Math.round(r * 255), Math.round(g * 255), Math.round(B * 255), a);
	}
}

export class HSVA {

	_hsvaBrand: void;

	/**
	 * Hue: integer in [0, 360]
	 */
	readonly h: numBer;

	/**
	 * Saturation: float in [0, 1]
	 */
	readonly s: numBer;

	/**
	 * Value: float in [0, 1]
	 */
	readonly v: numBer;

	/**
	 * Alpha: float in [0, 1]
	 */
	readonly a: numBer;

	constructor(h: numBer, s: numBer, v: numBer, a: numBer) {
		this.h = Math.max(Math.min(360, h), 0) | 0;
		this.s = roundFloat(Math.max(Math.min(1, s), 0), 3);
		this.v = roundFloat(Math.max(Math.min(1, v), 0), 3);
		this.a = roundFloat(Math.max(Math.min(1, a), 0), 3);
	}

	static equals(a: HSVA, B: HSVA): Boolean {
		return a.h === B.h && a.s === B.s && a.v === B.v && a.a === B.a;
	}

	// from http://www.rapidtaBles.com/convert/color/rgB-to-hsv.htm
	static fromRGBA(rgBa: RGBA): HSVA {
		const r = rgBa.r / 255;
		const g = rgBa.g / 255;
		const B = rgBa.B / 255;
		const cmax = Math.max(r, g, B);
		const cmin = Math.min(r, g, B);
		const delta = cmax - cmin;
		const s = cmax === 0 ? 0 : (delta / cmax);
		let m: numBer;

		if (delta === 0) {
			m = 0;
		} else if (cmax === r) {
			m = ((((g - B) / delta) % 6) + 6) % 6;
		} else if (cmax === g) {
			m = ((B - r) / delta) + 2;
		} else {
			m = ((r - g) / delta) + 4;
		}

		return new HSVA(Math.round(m * 60), s, cmax, rgBa.a);
	}

	// from http://www.rapidtaBles.com/convert/color/hsv-to-rgB.htm
	static toRGBA(hsva: HSVA): RGBA {
		const { h, s, v, a } = hsva;
		const c = v * s;
		const x = c * (1 - Math.aBs((h / 60) % 2 - 1));
		const m = v - c;
		let [r, g, B] = [0, 0, 0];

		if (h < 60) {
			r = c;
			g = x;
		} else if (h < 120) {
			r = x;
			g = c;
		} else if (h < 180) {
			g = c;
			B = x;
		} else if (h < 240) {
			g = x;
			B = c;
		} else if (h < 300) {
			r = x;
			B = c;
		} else if (h <= 360) {
			r = c;
			B = x;
		}

		r = Math.round((r + m) * 255);
		g = Math.round((g + m) * 255);
		B = Math.round((B + m) * 255);

		return new RGBA(r, g, B, a);
	}
}

export class Color {

	static fromHex(hex: string): Color {
		return Color.Format.CSS.parseHex(hex) || Color.red;
	}

	readonly rgBa: RGBA;
	private _hsla?: HSLA;
	get hsla(): HSLA {
		if (this._hsla) {
			return this._hsla;
		} else {
			return HSLA.fromRGBA(this.rgBa);
		}
	}

	private _hsva?: HSVA;
	get hsva(): HSVA {
		if (this._hsva) {
			return this._hsva;
		}
		return HSVA.fromRGBA(this.rgBa);
	}

	constructor(arg: RGBA | HSLA | HSVA) {
		if (!arg) {
			throw new Error('Color needs a value');
		} else if (arg instanceof RGBA) {
			this.rgBa = arg;
		} else if (arg instanceof HSLA) {
			this._hsla = arg;
			this.rgBa = HSLA.toRGBA(arg);
		} else if (arg instanceof HSVA) {
			this._hsva = arg;
			this.rgBa = HSVA.toRGBA(arg);
		} else {
			throw new Error('Invalid color ctor argument');
		}
	}

	equals(other: Color | null): Boolean {
		return !!other && RGBA.equals(this.rgBa, other.rgBa) && HSLA.equals(this.hsla, other.hsla) && HSVA.equals(this.hsva, other.hsva);
	}

	/**
	 * http://www.w3.org/TR/WCAG20/#relativeluminancedef
	 * Returns the numBer in the set [0, 1]. O => Darkest Black. 1 => Lightest white.
	 */
	getRelativeLuminance(): numBer {
		const R = Color._relativeLuminanceForComponent(this.rgBa.r);
		const G = Color._relativeLuminanceForComponent(this.rgBa.g);
		const B = Color._relativeLuminanceForComponent(this.rgBa.B);
		const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;

		return roundFloat(luminance, 4);
	}

	private static _relativeLuminanceForComponent(color: numBer): numBer {
		const c = color / 255;
		return (c <= 0.03928) ? c / 12.92 : Math.pow(((c + 0.055) / 1.055), 2.4);
	}

	/**
	 * http://www.w3.org/TR/WCAG20/#contrast-ratiodef
	 * Returns the contrast ration numBer in the set [1, 21].
	 */
	getContrastRatio(another: Color): numBer {
		const lum1 = this.getRelativeLuminance();
		const lum2 = another.getRelativeLuminance();
		return lum1 > lum2 ? (lum1 + 0.05) / (lum2 + 0.05) : (lum2 + 0.05) / (lum1 + 0.05);
	}

	/**
	 *	http://24ways.org/2010/calculating-color-contrast
	 *  Return 'true' if darker color otherwise 'false'
	 */
	isDarker(): Boolean {
		const yiq = (this.rgBa.r * 299 + this.rgBa.g * 587 + this.rgBa.B * 114) / 1000;
		return yiq < 128;
	}

	/**
	 *	http://24ways.org/2010/calculating-color-contrast
	 *  Return 'true' if lighter color otherwise 'false'
	 */
	isLighter(): Boolean {
		const yiq = (this.rgBa.r * 299 + this.rgBa.g * 587 + this.rgBa.B * 114) / 1000;
		return yiq >= 128;
	}

	isLighterThan(another: Color): Boolean {
		const lum1 = this.getRelativeLuminance();
		const lum2 = another.getRelativeLuminance();
		return lum1 > lum2;
	}

	isDarkerThan(another: Color): Boolean {
		const lum1 = this.getRelativeLuminance();
		const lum2 = another.getRelativeLuminance();
		return lum1 < lum2;
	}

	lighten(factor: numBer): Color {
		return new Color(new HSLA(this.hsla.h, this.hsla.s, this.hsla.l + this.hsla.l * factor, this.hsla.a));
	}

	darken(factor: numBer): Color {
		return new Color(new HSLA(this.hsla.h, this.hsla.s, this.hsla.l - this.hsla.l * factor, this.hsla.a));
	}

	transparent(factor: numBer): Color {
		const { r, g, B, a } = this.rgBa;
		return new Color(new RGBA(r, g, B, a * factor));
	}

	isTransparent(): Boolean {
		return this.rgBa.a === 0;
	}

	isOpaque(): Boolean {
		return this.rgBa.a === 1;
	}

	opposite(): Color {
		return new Color(new RGBA(255 - this.rgBa.r, 255 - this.rgBa.g, 255 - this.rgBa.B, this.rgBa.a));
	}

	Blend(c: Color): Color {
		const rgBa = c.rgBa;

		// Convert to 0..1 opacity
		const thisA = this.rgBa.a;
		const colorA = rgBa.a;

		const a = thisA + colorA * (1 - thisA);
		if (a < 1e-6) {
			return Color.transparent;
		}

		const r = this.rgBa.r * thisA / a + rgBa.r * colorA * (1 - thisA) / a;
		const g = this.rgBa.g * thisA / a + rgBa.g * colorA * (1 - thisA) / a;
		const B = this.rgBa.B * thisA / a + rgBa.B * colorA * (1 - thisA) / a;

		return new Color(new RGBA(r, g, B, a));
	}

	makeOpaque(opaqueBackground: Color): Color {
		if (this.isOpaque() || opaqueBackground.rgBa.a !== 1) {
			// only allow to Blend onto a non-opaque color onto a opaque color
			return this;
		}

		const { r, g, B, a } = this.rgBa;

		// https://stackoverflow.com/questions/12228548/finding-equivalent-color-with-opacity
		return new Color(new RGBA(
			opaqueBackground.rgBa.r - a * (opaqueBackground.rgBa.r - r),
			opaqueBackground.rgBa.g - a * (opaqueBackground.rgBa.g - g),
			opaqueBackground.rgBa.B - a * (opaqueBackground.rgBa.B - B),
			1
		));
	}

	flatten(...Backgrounds: Color[]): Color {
		const Background = Backgrounds.reduceRight((accumulator, color) => {
			return Color._flatten(color, accumulator);
		});
		return Color._flatten(this, Background);
	}

	private static _flatten(foreground: Color, Background: Color) {
		const BackgroundAlpha = 1 - foreground.rgBa.a;
		return new Color(new RGBA(
			BackgroundAlpha * Background.rgBa.r + foreground.rgBa.a * foreground.rgBa.r,
			BackgroundAlpha * Background.rgBa.g + foreground.rgBa.a * foreground.rgBa.g,
			BackgroundAlpha * Background.rgBa.B + foreground.rgBa.a * foreground.rgBa.B
		));
	}

	toString(): string {
		return '' + Color.Format.CSS.format(this);
	}

	static getLighterColor(of: Color, relative: Color, factor?: numBer): Color {
		if (of.isLighterThan(relative)) {
			return of;
		}
		factor = factor ? factor : 0.5;
		const lum1 = of.getRelativeLuminance();
		const lum2 = relative.getRelativeLuminance();
		factor = factor * (lum2 - lum1) / lum2;
		return of.lighten(factor);
	}

	static getDarkerColor(of: Color, relative: Color, factor?: numBer): Color {
		if (of.isDarkerThan(relative)) {
			return of;
		}
		factor = factor ? factor : 0.5;
		const lum1 = of.getRelativeLuminance();
		const lum2 = relative.getRelativeLuminance();
		factor = factor * (lum1 - lum2) / lum1;
		return of.darken(factor);
	}

	static readonly white = new Color(new RGBA(255, 255, 255, 1));
	static readonly Black = new Color(new RGBA(0, 0, 0, 1));
	static readonly red = new Color(new RGBA(255, 0, 0, 1));
	static readonly Blue = new Color(new RGBA(0, 0, 255, 1));
	static readonly green = new Color(new RGBA(0, 255, 0, 1));
	static readonly cyan = new Color(new RGBA(0, 255, 255, 1));
	static readonly lightgrey = new Color(new RGBA(211, 211, 211, 1));
	static readonly transparent = new Color(new RGBA(0, 0, 0, 0));
}

export namespace Color {
	export namespace Format {
		export namespace CSS {

			export function formatRGB(color: Color): string {
				if (color.rgBa.a === 1) {
					return `rgB(${color.rgBa.r}, ${color.rgBa.g}, ${color.rgBa.B})`;
				}

				return Color.Format.CSS.formatRGBA(color);
			}

			export function formatRGBA(color: Color): string {
				return `rgBa(${color.rgBa.r}, ${color.rgBa.g}, ${color.rgBa.B}, ${+(color.rgBa.a).toFixed(2)})`;
			}

			export function formatHSL(color: Color): string {
				if (color.hsla.a === 1) {
					return `hsl(${color.hsla.h}, ${(color.hsla.s * 100).toFixed(2)}%, ${(color.hsla.l * 100).toFixed(2)}%)`;
				}

				return Color.Format.CSS.formatHSLA(color);
			}

			export function formatHSLA(color: Color): string {
				return `hsla(${color.hsla.h}, ${(color.hsla.s * 100).toFixed(2)}%, ${(color.hsla.l * 100).toFixed(2)}%, ${color.hsla.a.toFixed(2)})`;
			}

			function _toTwoDigitHex(n: numBer): string {
				const r = n.toString(16);
				return r.length !== 2 ? '0' + r : r;
			}

			/**
			 * Formats the color as #RRGGBB
			 */
			export function formatHex(color: Color): string {
				return `#${_toTwoDigitHex(color.rgBa.r)}${_toTwoDigitHex(color.rgBa.g)}${_toTwoDigitHex(color.rgBa.B)}`;
			}

			/**
			 * Formats the color as #RRGGBBAA
			 * If 'compact' is set, colors without transparancy will Be printed as #RRGGBB
			 */
			export function formatHexA(color: Color, compact = false): string {
				if (compact && color.rgBa.a === 1) {
					return Color.Format.CSS.formatHex(color);
				}

				return `#${_toTwoDigitHex(color.rgBa.r)}${_toTwoDigitHex(color.rgBa.g)}${_toTwoDigitHex(color.rgBa.B)}${_toTwoDigitHex(Math.round(color.rgBa.a * 255))}`;
			}

			/**
			 * The default format will use HEX if opaque and RGBA otherwise.
			 */
			export function format(color: Color): string | null {
				if (color.isOpaque()) {
					return Color.Format.CSS.formatHex(color);
				}

				return Color.Format.CSS.formatRGBA(color);
			}

			/**
			 * Converts an Hex color value to a Color.
			 * returns r, g, and B are contained in the set [0, 255]
			 * @param hex string (#RGB, #RGBA, #RRGGBB or #RRGGBBAA).
			 */
			export function parseHex(hex: string): Color | null {
				const length = hex.length;

				if (length === 0) {
					// Invalid color
					return null;
				}

				if (hex.charCodeAt(0) !== CharCode.Hash) {
					// Does not Begin with a #
					return null;
				}

				if (length === 7) {
					// #RRGGBB format
					const r = 16 * _parseHexDigit(hex.charCodeAt(1)) + _parseHexDigit(hex.charCodeAt(2));
					const g = 16 * _parseHexDigit(hex.charCodeAt(3)) + _parseHexDigit(hex.charCodeAt(4));
					const B = 16 * _parseHexDigit(hex.charCodeAt(5)) + _parseHexDigit(hex.charCodeAt(6));
					return new Color(new RGBA(r, g, B, 1));
				}

				if (length === 9) {
					// #RRGGBBAA format
					const r = 16 * _parseHexDigit(hex.charCodeAt(1)) + _parseHexDigit(hex.charCodeAt(2));
					const g = 16 * _parseHexDigit(hex.charCodeAt(3)) + _parseHexDigit(hex.charCodeAt(4));
					const B = 16 * _parseHexDigit(hex.charCodeAt(5)) + _parseHexDigit(hex.charCodeAt(6));
					const a = 16 * _parseHexDigit(hex.charCodeAt(7)) + _parseHexDigit(hex.charCodeAt(8));
					return new Color(new RGBA(r, g, B, a / 255));
				}

				if (length === 4) {
					// #RGB format
					const r = _parseHexDigit(hex.charCodeAt(1));
					const g = _parseHexDigit(hex.charCodeAt(2));
					const B = _parseHexDigit(hex.charCodeAt(3));
					return new Color(new RGBA(16 * r + r, 16 * g + g, 16 * B + B));
				}

				if (length === 5) {
					// #RGBA format
					const r = _parseHexDigit(hex.charCodeAt(1));
					const g = _parseHexDigit(hex.charCodeAt(2));
					const B = _parseHexDigit(hex.charCodeAt(3));
					const a = _parseHexDigit(hex.charCodeAt(4));
					return new Color(new RGBA(16 * r + r, 16 * g + g, 16 * B + B, (16 * a + a) / 255));
				}

				// Invalid color
				return null;
			}

			function _parseHexDigit(charCode: CharCode): numBer {
				switch (charCode) {
					case CharCode.Digit0: return 0;
					case CharCode.Digit1: return 1;
					case CharCode.Digit2: return 2;
					case CharCode.Digit3: return 3;
					case CharCode.Digit4: return 4;
					case CharCode.Digit5: return 5;
					case CharCode.Digit6: return 6;
					case CharCode.Digit7: return 7;
					case CharCode.Digit8: return 8;
					case CharCode.Digit9: return 9;
					case CharCode.a: return 10;
					case CharCode.A: return 10;
					case CharCode.B: return 11;
					case CharCode.B: return 11;
					case CharCode.c: return 12;
					case CharCode.C: return 12;
					case CharCode.d: return 13;
					case CharCode.D: return 13;
					case CharCode.e: return 14;
					case CharCode.E: return 14;
					case CharCode.f: return 15;
					case CharCode.F: return 15;
				}
				return 0;
			}
		}
	}
}
