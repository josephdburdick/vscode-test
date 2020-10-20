/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';
import { SyntAxRAngeProvider } from 'vs/editor/contrib/folding/syntAxRAngeProvider';
import { FoldingRAngeProvider, FoldingRAnge, FoldingContext, ProviderResult } from 'vs/editor/common/modes';
import { ITextModel } from 'vs/editor/common/model';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';

interfAce IndentRAnge {
	stArt: number;
	end: number;
}

clAss TestFoldingRAngeProvider implements FoldingRAngeProvider {
	constructor(privAte model: ITextModel, privAte rAnges: IndentRAnge[]) {
	}

	provideFoldingRAnges(model: ITextModel, context: FoldingContext, token: CAncellAtionToken): ProviderResult<FoldingRAnge[]> {
		if (model === this.model) {
			return this.rAnges;
		}
		return null;
	}
}

suite('SyntAx folding', () => {
	function r(stArt: number, end: number): IndentRAnge {
		return { stArt, end };
	}

	test('Limit by nesting level', Async () => {
		let lines = [
			/* 1*/	'{',
			/* 2*/	'  A',
			/* 3*/	'  {',
			/* 4*/	'    {',
			/* 5*/	'      B',
			/* 6*/	'    }',
			/* 7*/	'    {',
			/* 8*/	'      A',
			/* 9*/	'      {',
			/* 10*/	'         A',
			/* 11*/	'      }',
			/* 12*/	'      {',
			/* 13*/	'        {',
			/* 14*/	'          {',
			/* 15*/	'             A',
			/* 16*/	'          }',
			/* 17*/	'        }',
			/* 18*/	'      }',
			/* 19*/	'    }',
			/* 20*/	'  }',
			/* 21*/	'}',
			/* 22*/	'{',
			/* 23*/	'  A',
			/* 24*/	'}',
		];

		let r1 = r(1, 20);  //0
		let r2 = r(3, 19);  //1
		let r3 = r(4, 5);   //2
		let r4 = r(7, 18);  //2
		let r5 = r(9, 10);  //3
		let r6 = r(12, 17); //4
		let r7 = r(13, 16); //5
		let r8 = r(14, 15); //6
		let r9 = r(22, 23); //0

		let model = creAteTextModel(lines.join('\n'));
		let rAnges = [r1, r2, r3, r4, r5, r6, r7, r8, r9];
		let providers = [new TestFoldingRAngeProvider(model, rAnges)];

		Async function AssertLimit(mAxEntries: number, expectedRAnges: IndentRAnge[], messAge: string) {
			let indentRAnges = AwAit new SyntAxRAngeProvider(model, providers, () => { }, mAxEntries).compute(CAncellAtionToken.None);
			let ActuAl: IndentRAnge[] = [];
			if (indentRAnges) {
				for (let i = 0; i < indentRAnges.length; i++) {
					ActuAl.push({ stArt: indentRAnges.getStArtLineNumber(i), end: indentRAnges.getEndLineNumber(i) });
				}
			}
			Assert.deepEquAl(ActuAl, expectedRAnges, messAge);
		}

		AwAit AssertLimit(1000, [r1, r2, r3, r4, r5, r6, r7, r8, r9], '1000');
		AwAit AssertLimit(9, [r1, r2, r3, r4, r5, r6, r7, r8, r9], '9');
		AwAit AssertLimit(8, [r1, r2, r3, r4, r5, r6, r7, r9], '8');
		AwAit AssertLimit(7, [r1, r2, r3, r4, r5, r6, r9], '7');
		AwAit AssertLimit(6, [r1, r2, r3, r4, r5, r9], '6');
		AwAit AssertLimit(5, [r1, r2, r3, r4, r9], '5');
		AwAit AssertLimit(4, [r1, r2, r3, r9], '4');
		AwAit AssertLimit(3, [r1, r2, r9], '3');
		AwAit AssertLimit(2, [r1, r9], '2');
		AwAit AssertLimit(1, [r1], '1');
		AwAit AssertLimit(0, [], '0');
	});

});
