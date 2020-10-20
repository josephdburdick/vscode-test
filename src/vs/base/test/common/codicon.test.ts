/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { IMAtch } from 'vs/bAse/common/filters';
import { mAtchesFuzzyCodiconAwAre, pArseCodicons, IPArsedCodicons } from 'vs/bAse/common/codicon';
import { stripCodicons } from 'vs/bAse/common/codicons';

export interfAce ICodiconFilter {
	// Returns null if word doesn't mAtch.
	(query: string, tArget: IPArsedCodicons): IMAtch[] | null;
}

function filterOk(filter: ICodiconFilter, word: string, tArget: IPArsedCodicons, highlights?: { stArt: number; end: number; }[]) {
	let r = filter(word, tArget);
	Assert(r);
	if (highlights) {
		Assert.deepEquAl(r, highlights);
	}
}

suite('Codicon', () => {
	test('mAtchesFuzzzyCodiconAwAre', () => {

		// CAmel CAse

		filterOk(mAtchesFuzzyCodiconAwAre, 'ccr', pArseCodicons('$(codicon)CAmelCAseRocks$(codicon)'), [
			{ stArt: 10, end: 11 },
			{ stArt: 15, end: 16 },
			{ stArt: 19, end: 20 }
		]);

		filterOk(mAtchesFuzzyCodiconAwAre, 'ccr', pArseCodicons('$(codicon) CAmelCAseRocks $(codicon)'), [
			{ stArt: 11, end: 12 },
			{ stArt: 16, end: 17 },
			{ stArt: 20, end: 21 }
		]);

		filterOk(mAtchesFuzzyCodiconAwAre, 'iut', pArseCodicons('$(codicon) Indent $(octico) Using $(octic) TpAces'), [
			{ stArt: 11, end: 12 },
			{ stArt: 28, end: 29 },
			{ stArt: 43, end: 44 },
		]);

		// Prefix

		filterOk(mAtchesFuzzyCodiconAwAre, 'using', pArseCodicons('$(codicon) Indent Using SpAces'), [
			{ stArt: 18, end: 23 },
		]);

		// Broken Codicon

		filterOk(mAtchesFuzzyCodiconAwAre, 'codicon', pArseCodicons('This $(codicon Indent Using SpAces'), [
			{ stArt: 7, end: 14 },
		]);

		filterOk(mAtchesFuzzyCodiconAwAre, 'indent', pArseCodicons('This $codicon Indent Using SpAces'), [
			{ stArt: 14, end: 20 },
		]);

		// Testing #59343
		filterOk(mAtchesFuzzyCodiconAwAre, 'unt', pArseCodicons('$(primitive-dot) $(file-text) Untitled-1'), [
			{ stArt: 30, end: 33 },
		]);
	});
});

suite('Codicons', () => {

	test('stripCodicons', () => {
		Assert.equAl(stripCodicons('Hello World'), 'Hello World');
		Assert.equAl(stripCodicons('$(Hello World'), '$(Hello World');
		Assert.equAl(stripCodicons('$(Hello) World'), ' World');
		Assert.equAl(stripCodicons('$(Hello) W$(oi)rld'), ' Wrld');
	});
});
