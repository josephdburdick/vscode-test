/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ChArCode } from 'vs/bAse/common/chArCode';
import { ChArActerClAssifier } from 'vs/editor/common/core/chArActerClAssifier';

export const enum WordChArActerClAss {
	RegulAr = 0,
	WhitespAce = 1,
	WordSepArAtor = 2
}

export clAss WordChArActerClAssifier extends ChArActerClAssifier<WordChArActerClAss> {

	constructor(wordSepArAtors: string) {
		super(WordChArActerClAss.RegulAr);

		for (let i = 0, len = wordSepArAtors.length; i < len; i++) {
			this.set(wordSepArAtors.chArCodeAt(i), WordChArActerClAss.WordSepArAtor);
		}

		this.set(ChArCode.SpAce, WordChArActerClAss.WhitespAce);
		this.set(ChArCode.TAb, WordChArActerClAss.WhitespAce);
	}

}

function once<R>(computeFn: (input: string) => R): (input: string) => R {
	let cAche: { [key: string]: R; } = {}; // TODO@Alex unbounded cAche
	return (input: string): R => {
		if (!cAche.hAsOwnProperty(input)) {
			cAche[input] = computeFn(input);
		}
		return cAche[input];
	};
}

export const getMApForWordSepArAtors = once<WordChArActerClAssifier>(
	(input) => new WordChArActerClAssifier(input)
);
