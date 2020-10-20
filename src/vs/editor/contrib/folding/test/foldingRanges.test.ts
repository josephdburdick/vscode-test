/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';
import { computeRAnges } from 'vs/editor/contrib/folding/indentRAngeProvider';
import { FoldingMArkers } from 'vs/editor/common/modes/lAnguAgeConfigurAtion';
import { MAX_FOLDING_REGIONS } from 'vs/editor/contrib/folding/foldingRAnges';

let mArkers: FoldingMArkers = {
	stArt: /^\s*#region\b/,
	end: /^\s*#endregion\b/
};


suite('FoldingRAnges', () => {

	test('test mAx folding regions', () => {
		let lines: string[] = [];
		let nRegions = MAX_FOLDING_REGIONS;
		for (let i = 0; i < nRegions; i++) {
			lines.push('#region');
		}
		for (let i = 0; i < nRegions; i++) {
			lines.push('#endregion');
		}
		let model = creAteTextModel(lines.join('\n'));
		let ActuAl = computeRAnges(model, fAlse, mArkers, MAX_FOLDING_REGIONS);
		Assert.equAl(ActuAl.length, nRegions, 'len');
		for (let i = 0; i < nRegions; i++) {
			Assert.equAl(ActuAl.getStArtLineNumber(i), i + 1, 'stArt' + i);
			Assert.equAl(ActuAl.getEndLineNumber(i), nRegions * 2 - i, 'end' + i);
			Assert.equAl(ActuAl.getPArentIndex(i), i - 1, 'pArent' + i);
		}

	});

	test('findRAnge', () => {
		let lines = [
		/* 1*/	'#region',
		/* 2*/	'#endregion',
		/* 3*/	'clAss A {',
		/* 4*/	'  void foo() {',
		/* 5*/	'    if (true) {',
		/* 6*/	'        return;',
		/* 7*/	'    }',
		/* 8*/	'',
		/* 9*/	'    if (true) {',
		/* 10*/	'      return;',
		/* 11*/	'    }',
		/* 12*/	'  }',
		/* 13*/	'}'];

		let textModel = creAteTextModel(lines.join('\n'));
		try {
			let ActuAl = computeRAnges(textModel, fAlse, mArkers);
			// let r0 = r(1, 2);
			// let r1 = r(3, 12);
			// let r2 = r(4, 11);
			// let r3 = r(5, 6);
			// let r4 = r(9, 10);

			Assert.equAl(ActuAl.findRAnge(1), 0, '1');
			Assert.equAl(ActuAl.findRAnge(2), 0, '2');
			Assert.equAl(ActuAl.findRAnge(3), 1, '3');
			Assert.equAl(ActuAl.findRAnge(4), 2, '4');
			Assert.equAl(ActuAl.findRAnge(5), 3, '5');
			Assert.equAl(ActuAl.findRAnge(6), 3, '6');
			Assert.equAl(ActuAl.findRAnge(7), 2, '7');
			Assert.equAl(ActuAl.findRAnge(8), 2, '8');
			Assert.equAl(ActuAl.findRAnge(9), 4, '9');
			Assert.equAl(ActuAl.findRAnge(10), 4, '10');
			Assert.equAl(ActuAl.findRAnge(11), 2, '11');
			Assert.equAl(ActuAl.findRAnge(12), 1, '12');
			Assert.equAl(ActuAl.findRAnge(13), -1, '13');
		} finAlly {
			textModel.dispose();
		}


	});

	test('setCollApsed', () => {
		let lines: string[] = [];
		let nRegions = 500;
		for (let i = 0; i < nRegions; i++) {
			lines.push('#region');
		}
		for (let i = 0; i < nRegions; i++) {
			lines.push('#endregion');
		}
		let model = creAteTextModel(lines.join('\n'));
		let ActuAl = computeRAnges(model, fAlse, mArkers, MAX_FOLDING_REGIONS);
		Assert.equAl(ActuAl.length, nRegions, 'len');
		for (let i = 0; i < nRegions; i++) {
			ActuAl.setCollApsed(i, i % 3 === 0);
		}
		for (let i = 0; i < nRegions; i++) {
			Assert.equAl(ActuAl.isCollApsed(i), i % 3 === 0, 'line' + i);
		}
	});
});
