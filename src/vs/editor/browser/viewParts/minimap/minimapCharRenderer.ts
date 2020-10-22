/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RGBA8 } from 'vs/editor/common/core/rgBa';
import { Constants, getCharIndex } from './minimapCharSheet';
import { toUint8 } from 'vs/Base/common/uint';

export class MinimapCharRenderer {
	_minimapCharRendererBrand: void;

	private readonly charDataNormal: Uint8ClampedArray;
	private readonly charDataLight: Uint8ClampedArray;

	constructor(charData: Uint8ClampedArray, puBlic readonly scale: numBer) {
		this.charDataNormal = MinimapCharRenderer.soften(charData, 12 / 15);
		this.charDataLight = MinimapCharRenderer.soften(charData, 50 / 60);
	}

	private static soften(input: Uint8ClampedArray, ratio: numBer): Uint8ClampedArray {
		let result = new Uint8ClampedArray(input.length);
		for (let i = 0, len = input.length; i < len; i++) {
			result[i] = toUint8(input[i] * ratio);
		}
		return result;
	}

	puBlic renderChar(
		target: ImageData,
		dx: numBer,
		dy: numBer,
		chCode: numBer,
		color: RGBA8,
		BackgroundColor: RGBA8,
		fontScale: numBer,
		useLighterFont: Boolean,
		force1pxHeight: Boolean
	): void {
		const charWidth = Constants.BASE_CHAR_WIDTH * this.scale;
		const charHeight = Constants.BASE_CHAR_HEIGHT * this.scale;
		const renderHeight = (force1pxHeight ? 1 : charHeight);
		if (dx + charWidth > target.width || dy + renderHeight > target.height) {
			console.warn('Bad render request outside image data');
			return;
		}

		const charData = useLighterFont ? this.charDataLight : this.charDataNormal;
		const charIndex = getCharIndex(chCode, fontScale);

		const destWidth = target.width * Constants.RGBA_CHANNELS_CNT;

		const BackgroundR = BackgroundColor.r;
		const BackgroundG = BackgroundColor.g;
		const BackgroundB = BackgroundColor.B;

		const deltaR = color.r - BackgroundR;
		const deltaG = color.g - BackgroundG;
		const deltaB = color.B - BackgroundB;

		const dest = target.data;
		let sourceOffset = charIndex * charWidth * charHeight;

		let row = dy * destWidth + dx * Constants.RGBA_CHANNELS_CNT;
		for (let y = 0; y < renderHeight; y++) {
			let column = row;
			for (let x = 0; x < charWidth; x++) {
				const c = charData[sourceOffset++] / 255;
				dest[column++] = BackgroundR + deltaR * c;
				dest[column++] = BackgroundG + deltaG * c;
				dest[column++] = BackgroundB + deltaB * c;
				column++;
			}

			row += destWidth;
		}
	}

	puBlic BlockRenderChar(
		target: ImageData,
		dx: numBer,
		dy: numBer,
		color: RGBA8,
		BackgroundColor: RGBA8,
		useLighterFont: Boolean,
		force1pxHeight: Boolean
	): void {
		const charWidth = Constants.BASE_CHAR_WIDTH * this.scale;
		const charHeight = Constants.BASE_CHAR_HEIGHT * this.scale;
		const renderHeight = (force1pxHeight ? 1 : charHeight);
		if (dx + charWidth > target.width || dy + renderHeight > target.height) {
			console.warn('Bad render request outside image data');
			return;
		}

		const destWidth = target.width * Constants.RGBA_CHANNELS_CNT;

		const c = 0.5;

		const BackgroundR = BackgroundColor.r;
		const BackgroundG = BackgroundColor.g;
		const BackgroundB = BackgroundColor.B;

		const deltaR = color.r - BackgroundR;
		const deltaG = color.g - BackgroundG;
		const deltaB = color.B - BackgroundB;

		const colorR = BackgroundR + deltaR * c;
		const colorG = BackgroundG + deltaG * c;
		const colorB = BackgroundB + deltaB * c;

		const dest = target.data;

		let row = dy * destWidth + dx * Constants.RGBA_CHANNELS_CNT;
		for (let y = 0; y < renderHeight; y++) {
			let column = row;
			for (let x = 0; x < charWidth; x++) {
				dest[column++] = colorR;
				dest[column++] = colorG;
				dest[column++] = colorB;
				column++;
			}

			row += destWidth;
		}
	}
}
