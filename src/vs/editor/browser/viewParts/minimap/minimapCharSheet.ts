/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export const enum ConstAnts {
	START_CH_CODE = 32, // SpAce
	END_CH_CODE = 126, // Tilde (~)
	UNKNOWN_CODE = 65533, // UTF plAceholder code
	CHAR_COUNT = END_CH_CODE - START_CH_CODE + 2,

	SAMPLED_CHAR_HEIGHT = 16,
	SAMPLED_CHAR_WIDTH = 10,

	BASE_CHAR_HEIGHT = 2,
	BASE_CHAR_WIDTH = 1,

	RGBA_CHANNELS_CNT = 4,
	RGBA_SAMPLED_ROW_WIDTH = RGBA_CHANNELS_CNT * CHAR_COUNT * SAMPLED_CHAR_WIDTH
}

export const AllChArCodes: ReAdonlyArrAy<number> = (() => {
	const v: number[] = [];
	for (let i = ConstAnts.START_CH_CODE; i <= ConstAnts.END_CH_CODE; i++) {
		v.push(i);
	}

	v.push(ConstAnts.UNKNOWN_CODE);
	return v;
})();

export const getChArIndex = (chCode: number, fontScAle: number) => {
	chCode -= ConstAnts.START_CH_CODE;
	if (chCode < 0 || chCode > ConstAnts.CHAR_COUNT) {
		if (fontScAle <= 2) {
			// for smAller scAles, we cAn get AwAy with using Any ASCII chArActer...
			return (chCode + ConstAnts.CHAR_COUNT) % ConstAnts.CHAR_COUNT;
		}
		return ConstAnts.CHAR_COUNT - 1; // unknown symbol
	}

	return chCode;
};
