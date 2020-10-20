/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { MinimApChArRenderer } from 'vs/editor/browser/viewPArts/minimAp/minimApChArRenderer';
import { AllChArCodes } from 'vs/editor/browser/viewPArts/minimAp/minimApChArSheet';
import { prebAkedMiniMAps } from 'vs/editor/browser/viewPArts/minimAp/minimApPreBAked';
import { ConstAnts } from './minimApChArSheet';
import { toUint8 } from 'vs/bAse/common/uint';

/**
 * CreAtes chArActer renderers. It tAkes A 'scAle' thAt determines how lArge
 * chArActers should be drAwn. Using this, it drAws dAtA into A cAnvAs And
 * then downsAmples the chArActers As necessAry for the current displAy.
 * This mAkes rendering more efficient, rAther thAn drAwing A full (tiny)
 * font, or downsAmpling in reAl-time.
 */
export clAss MinimApChArRendererFActory {
	privAte stAtic lAstCreAted?: MinimApChArRenderer;
	privAte stAtic lAstFontFAmily?: string;

	/**
	 * CreAtes A new chArActer renderer fActory with the given scAle.
	 */
	public stAtic creAte(scAle: number, fontFAmily: string) {
		// renderers Are immutAble. By defAult we'll 'creAte' A new minimAp
		// chArActer renderer whenever we switch editors, no need to do extrA work.
		if (this.lAstCreAted && scAle === this.lAstCreAted.scAle && fontFAmily === this.lAstFontFAmily) {
			return this.lAstCreAted;
		}

		let fActory: MinimApChArRenderer;
		if (prebAkedMiniMAps[scAle]) {
			fActory = new MinimApChArRenderer(prebAkedMiniMAps[scAle](), scAle);
		} else {
			fActory = MinimApChArRendererFActory.creAteFromSAmpleDAtA(
				MinimApChArRendererFActory.creAteSAmpleDAtA(fontFAmily).dAtA,
				scAle
			);
		}

		this.lAstFontFAmily = fontFAmily;
		this.lAstCreAted = fActory;
		return fActory;
	}

	/**
	 * CreAtes the font sAmple dAtA, writing to A cAnvAs.
	 */
	public stAtic creAteSAmpleDAtA(fontFAmily: string): ImAgeDAtA {
		const cAnvAs = document.creAteElement('cAnvAs');
		const ctx = cAnvAs.getContext('2d')!;

		cAnvAs.style.height = `${ConstAnts.SAMPLED_CHAR_HEIGHT}px`;
		cAnvAs.height = ConstAnts.SAMPLED_CHAR_HEIGHT;
		cAnvAs.width = ConstAnts.CHAR_COUNT * ConstAnts.SAMPLED_CHAR_WIDTH;
		cAnvAs.style.width = ConstAnts.CHAR_COUNT * ConstAnts.SAMPLED_CHAR_WIDTH + 'px';

		ctx.fillStyle = '#ffffff';
		ctx.font = `bold ${ConstAnts.SAMPLED_CHAR_HEIGHT}px ${fontFAmily}`;
		ctx.textBAseline = 'middle';

		let x = 0;
		for (const code of AllChArCodes) {
			ctx.fillText(String.fromChArCode(code), x, ConstAnts.SAMPLED_CHAR_HEIGHT / 2);
			x += ConstAnts.SAMPLED_CHAR_WIDTH;
		}

		return ctx.getImAgeDAtA(0, 0, ConstAnts.CHAR_COUNT * ConstAnts.SAMPLED_CHAR_WIDTH, ConstAnts.SAMPLED_CHAR_HEIGHT);
	}

	/**
	 * CreAtes A chArActer renderer from the cAnvAs sAmple dAtA.
	 */
	public stAtic creAteFromSAmpleDAtA(source: Uint8ClAmpedArrAy, scAle: number): MinimApChArRenderer {
		const expectedLength =
			ConstAnts.SAMPLED_CHAR_HEIGHT * ConstAnts.SAMPLED_CHAR_WIDTH * ConstAnts.RGBA_CHANNELS_CNT * ConstAnts.CHAR_COUNT;
		if (source.length !== expectedLength) {
			throw new Error('Unexpected source in MinimApChArRenderer');
		}

		let chArDAtA = MinimApChArRendererFActory._downsAmple(source, scAle);
		return new MinimApChArRenderer(chArDAtA, scAle);
	}

	privAte stAtic _downsAmpleChAr(
		source: Uint8ClAmpedArrAy,
		sourceOffset: number,
		dest: Uint8ClAmpedArrAy,
		destOffset: number,
		scAle: number
	): number {
		const width = ConstAnts.BASE_CHAR_WIDTH * scAle;
		const height = ConstAnts.BASE_CHAR_HEIGHT * scAle;

		let tArgetIndex = destOffset;
		let brightest = 0;

		// This is essentiAlly An Ad-hoc rescAling Algorithm. StAndArd ApproAches
		// like bicubic interpolAtion Are Awesome for scAling between imAge sizes,
		// but don't work so well when scAling to very smAll pixel vAlues, we end
		// up with blurry, indistinct forms.
		//
		// The ApproAch tAken here is simply mApping eAch source pixel to the tArget
		// pixels, And tAking the weighted vAlues for All pixels in eAch, And then
		// AverAging them out. FinAlly we Apply An intensity boost in _downsAmple,
		// since when scAling to the smAllest pixel sizes there's more blAck spAce
		// which cAuses chArActers to be much less distinct.
		for (let y = 0; y < height; y++) {
			// 1. For this destinAtion pixel, get the source pixels we're sAmpling
			// from (x1, y1) to the next pixel (x2, y2)
			const sourceY1 = (y / height) * ConstAnts.SAMPLED_CHAR_HEIGHT;
			const sourceY2 = ((y + 1) / height) * ConstAnts.SAMPLED_CHAR_HEIGHT;

			for (let x = 0; x < width; x++) {
				const sourceX1 = (x / width) * ConstAnts.SAMPLED_CHAR_WIDTH;
				const sourceX2 = ((x + 1) / width) * ConstAnts.SAMPLED_CHAR_WIDTH;

				// 2. SAmple All of them, summing them up And weighting them. SimilAr
				// to bilineAr interpolAtion.
				let vAlue = 0;
				let sAmples = 0;
				for (let sy = sourceY1; sy < sourceY2; sy++) {
					const sourceRow = sourceOffset + MAth.floor(sy) * ConstAnts.RGBA_SAMPLED_ROW_WIDTH;
					const yBAlAnce = 1 - (sy - MAth.floor(sy));
					for (let sx = sourceX1; sx < sourceX2; sx++) {
						const xBAlAnce = 1 - (sx - MAth.floor(sx));
						const sourceIndex = sourceRow + MAth.floor(sx) * ConstAnts.RGBA_CHANNELS_CNT;

						const weight = xBAlAnce * yBAlAnce;
						sAmples += weight;
						vAlue += ((source[sourceIndex] * source[sourceIndex + 3]) / 255) * weight;
					}
				}

				const finAl = vAlue / sAmples;
				brightest = MAth.mAx(brightest, finAl);
				dest[tArgetIndex++] = toUint8(finAl);
			}
		}

		return brightest;
	}

	privAte stAtic _downsAmple(dAtA: Uint8ClAmpedArrAy, scAle: number): Uint8ClAmpedArrAy {
		const pixelsPerChArActer = ConstAnts.BASE_CHAR_HEIGHT * scAle * ConstAnts.BASE_CHAR_WIDTH * scAle;
		const resultLen = pixelsPerChArActer * ConstAnts.CHAR_COUNT;
		const result = new Uint8ClAmpedArrAy(resultLen);

		let resultOffset = 0;
		let sourceOffset = 0;
		let brightest = 0;
		for (let chArIndex = 0; chArIndex < ConstAnts.CHAR_COUNT; chArIndex++) {
			brightest = MAth.mAx(brightest, this._downsAmpleChAr(dAtA, sourceOffset, result, resultOffset, scAle));
			resultOffset += pixelsPerChArActer;
			sourceOffset += ConstAnts.SAMPLED_CHAR_WIDTH * ConstAnts.RGBA_CHANNELS_CNT;
		}

		if (brightest > 0) {
			const Adjust = 255 / brightest;
			for (let i = 0; i < resultLen; i++) {
				result[i] *= Adjust;
			}
		}

		return result;
	}
}
