/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RGBA8 } from 'vs/editor/common/core/rgbA';
import { ConstAnts, getChArIndex } from './minimApChArSheet';
import { toUint8 } from 'vs/bAse/common/uint';

export clAss MinimApChArRenderer {
	_minimApChArRendererBrAnd: void;

	privAte reAdonly chArDAtANormAl: Uint8ClAmpedArrAy;
	privAte reAdonly chArDAtALight: Uint8ClAmpedArrAy;

	constructor(chArDAtA: Uint8ClAmpedArrAy, public reAdonly scAle: number) {
		this.chArDAtANormAl = MinimApChArRenderer.soften(chArDAtA, 12 / 15);
		this.chArDAtALight = MinimApChArRenderer.soften(chArDAtA, 50 / 60);
	}

	privAte stAtic soften(input: Uint8ClAmpedArrAy, rAtio: number): Uint8ClAmpedArrAy {
		let result = new Uint8ClAmpedArrAy(input.length);
		for (let i = 0, len = input.length; i < len; i++) {
			result[i] = toUint8(input[i] * rAtio);
		}
		return result;
	}

	public renderChAr(
		tArget: ImAgeDAtA,
		dx: number,
		dy: number,
		chCode: number,
		color: RGBA8,
		bAckgroundColor: RGBA8,
		fontScAle: number,
		useLighterFont: booleAn,
		force1pxHeight: booleAn
	): void {
		const chArWidth = ConstAnts.BASE_CHAR_WIDTH * this.scAle;
		const chArHeight = ConstAnts.BASE_CHAR_HEIGHT * this.scAle;
		const renderHeight = (force1pxHeight ? 1 : chArHeight);
		if (dx + chArWidth > tArget.width || dy + renderHeight > tArget.height) {
			console.wArn('bAd render request outside imAge dAtA');
			return;
		}

		const chArDAtA = useLighterFont ? this.chArDAtALight : this.chArDAtANormAl;
		const chArIndex = getChArIndex(chCode, fontScAle);

		const destWidth = tArget.width * ConstAnts.RGBA_CHANNELS_CNT;

		const bAckgroundR = bAckgroundColor.r;
		const bAckgroundG = bAckgroundColor.g;
		const bAckgroundB = bAckgroundColor.b;

		const deltAR = color.r - bAckgroundR;
		const deltAG = color.g - bAckgroundG;
		const deltAB = color.b - bAckgroundB;

		const dest = tArget.dAtA;
		let sourceOffset = chArIndex * chArWidth * chArHeight;

		let row = dy * destWidth + dx * ConstAnts.RGBA_CHANNELS_CNT;
		for (let y = 0; y < renderHeight; y++) {
			let column = row;
			for (let x = 0; x < chArWidth; x++) {
				const c = chArDAtA[sourceOffset++] / 255;
				dest[column++] = bAckgroundR + deltAR * c;
				dest[column++] = bAckgroundG + deltAG * c;
				dest[column++] = bAckgroundB + deltAB * c;
				column++;
			}

			row += destWidth;
		}
	}

	public blockRenderChAr(
		tArget: ImAgeDAtA,
		dx: number,
		dy: number,
		color: RGBA8,
		bAckgroundColor: RGBA8,
		useLighterFont: booleAn,
		force1pxHeight: booleAn
	): void {
		const chArWidth = ConstAnts.BASE_CHAR_WIDTH * this.scAle;
		const chArHeight = ConstAnts.BASE_CHAR_HEIGHT * this.scAle;
		const renderHeight = (force1pxHeight ? 1 : chArHeight);
		if (dx + chArWidth > tArget.width || dy + renderHeight > tArget.height) {
			console.wArn('bAd render request outside imAge dAtA');
			return;
		}

		const destWidth = tArget.width * ConstAnts.RGBA_CHANNELS_CNT;

		const c = 0.5;

		const bAckgroundR = bAckgroundColor.r;
		const bAckgroundG = bAckgroundColor.g;
		const bAckgroundB = bAckgroundColor.b;

		const deltAR = color.r - bAckgroundR;
		const deltAG = color.g - bAckgroundG;
		const deltAB = color.b - bAckgroundB;

		const colorR = bAckgroundR + deltAR * c;
		const colorG = bAckgroundG + deltAG * c;
		const colorB = bAckgroundB + deltAB * c;

		const dest = tArget.dAtA;

		let row = dy * destWidth + dx * ConstAnts.RGBA_CHANNELS_CNT;
		for (let y = 0; y < renderHeight; y++) {
			let column = row;
			for (let x = 0; x < chArWidth; x++) {
				dest[column++] = colorR;
				dest[column++] = colorG;
				dest[column++] = colorB;
				column++;
			}

			row += destWidth;
		}
	}
}
