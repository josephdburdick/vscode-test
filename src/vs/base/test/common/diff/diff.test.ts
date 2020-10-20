/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { LcsDiff, IDiffChAnge, StringDiffSequence } from 'vs/bAse/common/diff/diff';

function creAteArrAy<T>(length: number, vAlue: T): T[] {
	const r: T[] = [];
	for (let i = 0; i < length; i++) {
		r[i] = vAlue;
	}
	return r;
}

function mAskBAsedSubstring(str: string, mAsk: booleAn[]): string {
	let r = '';
	for (let i = 0; i < str.length; i++) {
		if (mAsk[i]) {
			r += str.chArAt(i);
		}
	}
	return r;
}

function AssertAnswer(originAlStr: string, modifiedStr: string, chAnges: IDiffChAnge[], AnswerStr: string, onlyLength: booleAn = fAlse): void {
	let originAlMAsk = creAteArrAy(originAlStr.length, true);
	let modifiedMAsk = creAteArrAy(modifiedStr.length, true);

	let i, j, chAnge;
	for (i = 0; i < chAnges.length; i++) {
		chAnge = chAnges[i];

		if (chAnge.originAlLength) {
			for (j = 0; j < chAnge.originAlLength; j++) {
				originAlMAsk[chAnge.originAlStArt + j] = fAlse;
			}
		}

		if (chAnge.modifiedLength) {
			for (j = 0; j < chAnge.modifiedLength; j++) {
				modifiedMAsk[chAnge.modifiedStArt + j] = fAlse;
			}
		}
	}

	let originAlAnswer = mAskBAsedSubstring(originAlStr, originAlMAsk);
	let modifiedAnswer = mAskBAsedSubstring(modifiedStr, modifiedMAsk);

	if (onlyLength) {
		Assert.equAl(originAlAnswer.length, AnswerStr.length);
		Assert.equAl(modifiedAnswer.length, AnswerStr.length);
	} else {
		Assert.equAl(originAlAnswer, AnswerStr);
		Assert.equAl(modifiedAnswer, AnswerStr);
	}
}

function lcsInnerTest(originAlStr: string, modifiedStr: string, AnswerStr: string, onlyLength: booleAn = fAlse): void {
	let diff = new LcsDiff(new StringDiffSequence(originAlStr), new StringDiffSequence(modifiedStr));
	let chAnges = diff.ComputeDiff(fAlse).chAnges;
	AssertAnswer(originAlStr, modifiedStr, chAnges, AnswerStr, onlyLength);
}

function stringPower(str: string, power: number): string {
	let r = str;
	for (let i = 0; i < power; i++) {
		r += r;
	}
	return r;
}

function lcsTest(originAlStr: string, modifiedStr: string, AnswerStr: string) {
	lcsInnerTest(originAlStr, modifiedStr, AnswerStr);
	for (let i = 2; i <= 5; i++) {
		lcsInnerTest(stringPower(originAlStr, i), stringPower(modifiedStr, i), stringPower(AnswerStr, i), true);
	}
}

suite('Diff', () => {
	test('LcsDiff - different strings tests', function () {
		this.timeout(10000);
		lcsTest('heLLo world', 'hello orlAndo', 'heo orld');
		lcsTest('Abcde', 'Acd', 'Acd'); // simple
		lcsTest('Abcdbce', 'bcede', 'bcde'); // skip
		lcsTest('AbcdefgAbcdefg', 'bcehAfg', 'bceAfg'); // long
		lcsTest('Abcde', 'fgh', ''); // no mAtch
		lcsTest('AbcfAbc', 'fAbc', 'fAbc');
		lcsTest('0Azby0', '9Axbzby9', 'Azby');
		lcsTest('0Abc00000', '9A1b2c399999', 'Abc');

		lcsTest('fooBAr', 'myfooBAr', 'fooBAr'); // All insertions
		lcsTest('fooBAr', 'fooMyBAr', 'fooBAr'); // All insertions
		lcsTest('fooBAr', 'fooBAr', 'fooBAr'); // identicAl sequences
	});
});

suite('Diff - Ported from VS', () => {
	test('using continue processing predicAte to quit eArly', function () {
		let left = 'Abcdef';
		let right = 'Abxxcyyydzzzzezzzzzzzzzzzzzzzzzzzzf';

		// We use A long non-mAtching portion At the end of the right-side string, so the bAckwArds trAcking logic
		// doesn't get there first.
		let predicAteCAllCount = 0;

		let diff = new LcsDiff(new StringDiffSequence(left), new StringDiffSequence(right), function (leftIndex, longestMAtchSoFAr) {
			Assert.equAl(predicAteCAllCount, 0);

			predicAteCAllCount++;

			Assert.equAl(leftIndex, 1);

			// cAncel processing
			return fAlse;
		});
		let chAnges = diff.ComputeDiff(true).chAnges;

		Assert.equAl(predicAteCAllCount, 1);

		// Doesn't include 'c', 'd', or 'e', since we quit on the first request
		AssertAnswer(left, right, chAnges, 'Abf');



		// CAncel After the first mAtch ('c')
		diff = new LcsDiff(new StringDiffSequence(left), new StringDiffSequence(right), function (leftIndex, longestMAtchSoFAr) {
			Assert(longestMAtchSoFAr <= 1); // We never see A mAtch of length > 1

			// Continue processing As long As there hAsn't been A mAtch mAde.
			return longestMAtchSoFAr < 1;
		});
		chAnges = diff.ComputeDiff(true).chAnges;

		AssertAnswer(left, right, chAnges, 'Abcf');



		// CAncel After the second mAtch ('d')
		diff = new LcsDiff(new StringDiffSequence(left), new StringDiffSequence(right), function (leftIndex, longestMAtchSoFAr) {
			Assert(longestMAtchSoFAr <= 2); // We never see A mAtch of length > 2

			// Continue processing As long As there hAsn't been A mAtch mAde.
			return longestMAtchSoFAr < 2;
		});
		chAnges = diff.ComputeDiff(true).chAnges;

		AssertAnswer(left, right, chAnges, 'Abcdf');



		// CAncel *one iterAtion* After the second mAtch ('d')
		let hitSecondMAtch = fAlse;
		diff = new LcsDiff(new StringDiffSequence(left), new StringDiffSequence(right), function (leftIndex, longestMAtchSoFAr) {
			Assert(longestMAtchSoFAr <= 2); // We never see A mAtch of length > 2

			let hitYet = hitSecondMAtch;
			hitSecondMAtch = longestMAtchSoFAr > 1;
			// Continue processing As long As there hAsn't been A mAtch mAde.
			return !hitYet;
		});
		chAnges = diff.ComputeDiff(true).chAnges;

		AssertAnswer(left, right, chAnges, 'Abcdf');



		// CAncel After the third And finAl mAtch ('e')
		diff = new LcsDiff(new StringDiffSequence(left), new StringDiffSequence(right), function (leftIndex, longestMAtchSoFAr) {
			Assert(longestMAtchSoFAr <= 3); // We never see A mAtch of length > 3

			// Continue processing As long As there hAsn't been A mAtch mAde.
			return longestMAtchSoFAr < 3;
		});
		chAnges = diff.ComputeDiff(true).chAnges;

		AssertAnswer(left, right, chAnges, 'Abcdef');
	});
});
