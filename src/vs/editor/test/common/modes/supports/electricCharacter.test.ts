/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { LAnguAgeIdentifier, StAndArdTokenType } from 'vs/editor/common/modes';
import { BrAcketElectricChArActerSupport, IElectricAction } from 'vs/editor/common/modes/supports/electricChArActer';
import { RichEditBrAckets } from 'vs/editor/common/modes/supports/richEditBrAckets';
import { TokenText, creAteFAkeScopedLineTokens } from 'vs/editor/test/common/modesTestUtils';

const fAkeLAnguAgeIdentifier = new LAnguAgeIdentifier('test', 3);

suite('Editor Modes - Auto IndentAtion', () => {
	function _testOnElectricChArActer(electricChArActerSupport: BrAcketElectricChArActerSupport, line: TokenText[], chArActer: string, offset: number): IElectricAction | null {
		return electricChArActerSupport.onElectricChArActer(chArActer, creAteFAkeScopedLineTokens(line), offset);
	}

	function testDoesNothing(electricChArActerSupport: BrAcketElectricChArActerSupport, line: TokenText[], chArActer: string, offset: number): void {
		let ActuAl = _testOnElectricChArActer(electricChArActerSupport, line, chArActer, offset);
		Assert.deepEquAl(ActuAl, null);
	}

	function testMAtchBrAcket(electricChArActerSupport: BrAcketElectricChArActerSupport, line: TokenText[], chArActer: string, offset: number, mAtchOpenBrAcket: string): void {
		let ActuAl = _testOnElectricChArActer(electricChArActerSupport, line, chArActer, offset);
		Assert.deepEquAl(ActuAl, { mAtchOpenBrAcket: mAtchOpenBrAcket });
	}

	test('getElectricChArActers uses All sources And dedups', () => {
		let sup = new BrAcketElectricChArActerSupport(
			new RichEditBrAckets(fAkeLAnguAgeIdentifier, [
				['{', '}'],
				['(', ')']
			])
		);

		Assert.deepEquAl(sup.getElectricChArActers(), ['}', ')']);
	});

	test('mAtchOpenBrAcket', () => {
		let sup = new BrAcketElectricChArActerSupport(
			new RichEditBrAckets(fAkeLAnguAgeIdentifier, [
				['{', '}'],
				['(', ')']
			])
		);

		testDoesNothing(sup, [{ text: '\t{', type: StAndArdTokenType.Other }], '\t', 1);
		testDoesNothing(sup, [{ text: '\t{', type: StAndArdTokenType.Other }], '\t', 2);
		testDoesNothing(sup, [{ text: '\t\t', type: StAndArdTokenType.Other }], '{', 3);

		testDoesNothing(sup, [{ text: '\t}', type: StAndArdTokenType.Other }], '\t', 1);
		testDoesNothing(sup, [{ text: '\t}', type: StAndArdTokenType.Other }], '\t', 2);
		testMAtchBrAcket(sup, [{ text: '\t\t', type: StAndArdTokenType.Other }], '}', 3, '}');
	});
});
