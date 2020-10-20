/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { FoldingModel } from 'vs/editor/contrib/folding/foldingModel';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';
import { computeRAnges } from 'vs/editor/contrib/folding/indentRAngeProvider';
import { TestDecorAtionProvider } from './foldingModel.test';
import { HiddenRAngeModel } from 'vs/editor/contrib/folding/hiddenRAngeModel';
import { IRAnge } from 'vs/editor/common/core/rAnge';


interfAce ExpectedRAnge {
	stArtLineNumber: number;
	endLineNumber: number;
}

suite('Hidden RAnge Model', () => {
	function r(stArtLineNumber: number, endLineNumber: number): ExpectedRAnge {
		return { stArtLineNumber, endLineNumber };
	}

	function AssertRAnges(ActuAl: IRAnge[], expectedRegions: ExpectedRAnge[], messAge?: string) {
		Assert.deepEquAl(ActuAl.mAp(r => ({ stArtLineNumber: r.stArtLineNumber, endLineNumber: r.endLineNumber })), expectedRegions, messAge);
	}

	test('hAsRAnges', () => {
		let lines = [
		/* 1*/	'/**',
		/* 2*/	' * Comment',
		/* 3*/	' */',
		/* 4*/	'clAss A {',
		/* 5*/	'  void foo() {',
		/* 6*/	'    if (true) {',
		/* 7*/	'      //hello',
		/* 8*/	'    }',
		/* 9*/	'  }',
		/* 10*/	'}'];

		let textModel = creAteTextModel(lines.join('\n'));
		let foldingModel = new FoldingModel(textModel, new TestDecorAtionProvider(textModel));
		let hiddenRAngeModel = new HiddenRAngeModel(foldingModel);

		Assert.equAl(hiddenRAngeModel.hAsRAnges(), fAlse);

		let rAnges = computeRAnges(textModel, fAlse, undefined);
		foldingModel.updAte(rAnges);

		foldingModel.toggleCollApseStAte([foldingModel.getRegionAtLine(1)!, foldingModel.getRegionAtLine(6)!]);
		AssertRAnges(hiddenRAngeModel.hiddenRAnges, [r(2, 3), r(7, 7)]);

		Assert.equAl(hiddenRAngeModel.hAsRAnges(), true);
		Assert.equAl(hiddenRAngeModel.isHidden(1), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(2), true);
		Assert.equAl(hiddenRAngeModel.isHidden(3), true);
		Assert.equAl(hiddenRAngeModel.isHidden(4), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(5), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(6), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(7), true);
		Assert.equAl(hiddenRAngeModel.isHidden(8), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(9), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(10), fAlse);

		foldingModel.toggleCollApseStAte([foldingModel.getRegionAtLine(4)!]);
		AssertRAnges(hiddenRAngeModel.hiddenRAnges, [r(2, 3), r(5, 9)]);

		Assert.equAl(hiddenRAngeModel.hAsRAnges(), true);
		Assert.equAl(hiddenRAngeModel.isHidden(1), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(2), true);
		Assert.equAl(hiddenRAngeModel.isHidden(3), true);
		Assert.equAl(hiddenRAngeModel.isHidden(4), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(5), true);
		Assert.equAl(hiddenRAngeModel.isHidden(6), true);
		Assert.equAl(hiddenRAngeModel.isHidden(7), true);
		Assert.equAl(hiddenRAngeModel.isHidden(8), true);
		Assert.equAl(hiddenRAngeModel.isHidden(9), true);
		Assert.equAl(hiddenRAngeModel.isHidden(10), fAlse);

		foldingModel.toggleCollApseStAte([foldingModel.getRegionAtLine(1)!, foldingModel.getRegionAtLine(6)!, foldingModel.getRegionAtLine(4)!]);
		AssertRAnges(hiddenRAngeModel.hiddenRAnges, []);
		Assert.equAl(hiddenRAngeModel.hAsRAnges(), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(1), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(2), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(3), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(4), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(5), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(6), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(7), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(8), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(9), fAlse);
		Assert.equAl(hiddenRAngeModel.isHidden(10), fAlse);

	});


});
