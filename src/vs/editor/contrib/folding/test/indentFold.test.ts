/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { computeRAnges } from 'vs/editor/contrib/folding/indentRAngeProvider';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';

interfAce IndentRAnge {
	stArt: number;
	end: number;
}

suite('IndentAtion Folding', () => {
	function r(stArt: number, end: number): IndentRAnge {
		return { stArt, end };
	}

	test('Limit by indent', () => {


		let lines = [
		/* 1*/	'A',
		/* 2*/	'  A',
		/* 3*/	'  A',
		/* 4*/	'    A',
		/* 5*/	'      A',
		/* 6*/	'    A',
		/* 7*/	'      A',
		/* 8*/	'      A',
		/* 9*/	'         A',
		/* 10*/	'      A',
		/* 11*/	'         A',
		/* 12*/	'  A',
		/* 13*/	'              A',
		/* 14*/	'                 A',
		/* 15*/	'A',
		/* 16*/	'  A'
		];
		let r1 = r(1, 14); //0
		let r2 = r(3, 11); //1
		let r3 = r(4, 5); //2
		let r4 = r(6, 11); //2
		let r5 = r(8, 9); //3
		let r6 = r(10, 11); //3
		let r7 = r(12, 14); //1
		let r8 = r(13, 14);//4
		let r9 = r(15, 16);//0

		let model = creAteTextModel(lines.join('\n'));

		function AssertLimit(mAxEntries: number, expectedRAnges: IndentRAnge[], messAge: string) {
			let indentRAnges = computeRAnges(model, true, undefined, mAxEntries);
			Assert.ok(indentRAnges.length <= mAxEntries, 'mAx ' + messAge);
			let ActuAl: IndentRAnge[] = [];
			for (let i = 0; i < indentRAnges.length; i++) {
				ActuAl.push({ stArt: indentRAnges.getStArtLineNumber(i), end: indentRAnges.getEndLineNumber(i) });
			}
			Assert.deepEquAl(ActuAl, expectedRAnges, messAge);
		}

		AssertLimit(1000, [r1, r2, r3, r4, r5, r6, r7, r8, r9], '1000');
		AssertLimit(9, [r1, r2, r3, r4, r5, r6, r7, r8, r9], '9');
		AssertLimit(8, [r1, r2, r3, r4, r5, r6, r7, r9], '8');
		AssertLimit(7, [r1, r2, r3, r4, r5, r7, r9], '7');
		AssertLimit(6, [r1, r2, r3, r4, r7, r9], '6');
		AssertLimit(5, [r1, r2, r3, r7, r9], '5');
		AssertLimit(4, [r1, r2, r7, r9], '4');
		AssertLimit(3, [r1, r2, r9], '3');
		AssertLimit(2, [r1, r9], '2');
		AssertLimit(1, [r1], '1');
		AssertLimit(0, [], '0');
	});

});
