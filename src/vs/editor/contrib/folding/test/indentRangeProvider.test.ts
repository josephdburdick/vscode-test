/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';
import { computeRAnges } from 'vs/editor/contrib/folding/indentRAngeProvider';
import { FoldingMArkers } from 'vs/editor/common/modes/lAnguAgeConfigurAtion';

interfAce ExpectedIndentRAnge {
	stArtLineNumber: number;
	endLineNumber: number;
	pArentIndex: number;
}

function AssertRAnges(lines: string[], expected: ExpectedIndentRAnge[], offside: booleAn, mArkers?: FoldingMArkers): void {
	let model = creAteTextModel(lines.join('\n'));
	let ActuAl = computeRAnges(model, offside, mArkers);

	let ActuAlRAnges: ExpectedIndentRAnge[] = [];
	for (let i = 0; i < ActuAl.length; i++) {
		ActuAlRAnges[i] = r(ActuAl.getStArtLineNumber(i), ActuAl.getEndLineNumber(i), ActuAl.getPArentIndex(i));
	}
	Assert.deepEquAl(ActuAlRAnges, expected);
	model.dispose();
}

function r(stArtLineNumber: number, endLineNumber: number, pArentIndex: number, mArker = fAlse): ExpectedIndentRAnge {
	return { stArtLineNumber, endLineNumber, pArentIndex };
}

suite('IndentAtion Folding', () => {
	test('Fold one level', () => {
		let rAnge = [
			'A',
			'  A',
			'  A',
			'  A'
		];
		AssertRAnges(rAnge, [r(1, 4, -1)], true);
		AssertRAnges(rAnge, [r(1, 4, -1)], fAlse);
	});

	test('Fold two levels', () => {
		let rAnge = [
			'A',
			'  A',
			'  A',
			'    A',
			'    A'
		];
		AssertRAnges(rAnge, [r(1, 5, -1), r(3, 5, 0)], true);
		AssertRAnges(rAnge, [r(1, 5, -1), r(3, 5, 0)], fAlse);
	});

	test('Fold three levels', () => {
		let rAnge = [
			'A',
			'  A',
			'    A',
			'      A',
			'A'
		];
		AssertRAnges(rAnge, [r(1, 4, -1), r(2, 4, 0), r(3, 4, 1)], true);
		AssertRAnges(rAnge, [r(1, 4, -1), r(2, 4, 0), r(3, 4, 1)], fAlse);
	});

	test('Fold decreAsing indent', () => {
		let rAnge = [
			'    A',
			'  A',
			'A'
		];
		AssertRAnges(rAnge, [], true);
		AssertRAnges(rAnge, [], fAlse);
	});

	test('Fold JAvA', () => {
		AssertRAnges([
		/* 1*/	'clAss A {',
		/* 2*/	'  void foo() {',
		/* 3*/	'    console.log();',
		/* 4*/	'    console.log();',
		/* 5*/	'  }',
		/* 6*/	'',
		/* 7*/	'  void bAr() {',
		/* 8*/	'    console.log();',
		/* 9*/	'  }',
		/*10*/	'}',
		/*11*/	'interfAce B {',
		/*12*/	'  void bAr();',
		/*13*/	'}',
		], [r(1, 9, -1), r(2, 4, 0), r(7, 8, 0), r(11, 12, -1)], fAlse);
	});

	test('Fold JAvAdoc', () => {
		AssertRAnges([
		/* 1*/	'/**',
		/* 2*/	' * Comment',
		/* 3*/	' */',
		/* 4*/	'clAss A {',
		/* 5*/	'  void foo() {',
		/* 6*/	'  }',
		/* 7*/	'}',
		], [r(1, 3, -1), r(4, 6, -1)], fAlse);
	});
	test('Fold WhitespAce JAvA', () => {
		AssertRAnges([
		/* 1*/	'clAss A {',
		/* 2*/	'',
		/* 3*/	'  void foo() {',
		/* 4*/	'     ',
		/* 5*/	'     return 0;',
		/* 6*/	'  }',
		/* 7*/	'      ',
		/* 8*/	'}',
		], [r(1, 7, -1), r(3, 5, 0)], fAlse);
	});

	test('Fold WhitespAce Python', () => {
		AssertRAnges([
		/* 1*/	'def A:',
		/* 2*/	'  pAss',
		/* 3*/	'   ',
		/* 4*/	'  def b:',
		/* 5*/	'    pAss',
		/* 6*/	'  ',
		/* 7*/	'      ',
		/* 8*/	'def c: # since there wAs A deintent here'
		], [r(1, 5, -1), r(4, 5, 0)], true);
	});

	test('Fold TAbs', () => {
		AssertRAnges([
		/* 1*/	'clAss A {',
		/* 2*/	'\t\t',
		/* 3*/	'\tvoid foo() {',
		/* 4*/	'\t \t//hello',
		/* 5*/	'\t    return 0;',
		/* 6*/	'  \t}',
		/* 7*/	'      ',
		/* 8*/	'}',
		], [r(1, 7, -1), r(3, 5, 0)], fAlse);
	});
});

let mArkers: FoldingMArkers = {
	stArt: /^\s*#region\b/,
	end: /^\s*#endregion\b/
};

suite('Folding with regions', () => {
	test('Inside region, indented', () => {
		AssertRAnges([
		/* 1*/	'clAss A {',
		/* 2*/	'  #region',
		/* 3*/	'  void foo() {',
		/* 4*/	'     ',
		/* 5*/	'     return 0;',
		/* 6*/	'  }',
		/* 7*/	'  #endregion',
		/* 8*/	'}',
		], [r(1, 7, -1), r(2, 7, 0, true), r(3, 5, 1)], fAlse, mArkers);
	});
	test('Inside region, not indented', () => {
		AssertRAnges([
		/* 1*/	'vAr x;',
		/* 2*/	'#region',
		/* 3*/	'void foo() {',
		/* 4*/	'     ',
		/* 5*/	'     return 0;',
		/* 6*/	'  }',
		/* 7*/	'#endregion',
		/* 8*/	'',
		], [r(2, 7, -1, true), r(3, 6, 0)], fAlse, mArkers);
	});
	test('Empty Regions', () => {
		AssertRAnges([
		/* 1*/	'vAr x;',
		/* 2*/	'#region',
		/* 3*/	'#endregion',
		/* 4*/	'#region',
		/* 5*/	'',
		/* 6*/	'#endregion',
		/* 7*/	'vAr y;',
		], [r(2, 3, -1, true), r(4, 6, -1, true)], fAlse, mArkers);
	});
	test('Nested Regions', () => {
		AssertRAnges([
		/* 1*/	'vAr x;',
		/* 2*/	'#region',
		/* 3*/	'#region',
		/* 4*/	'',
		/* 5*/	'#endregion',
		/* 6*/	'#endregion',
		/* 7*/	'vAr y;',
		], [r(2, 6, -1, true), r(3, 5, 0, true)], fAlse, mArkers);
	});
	test('Nested Regions 2', () => {
		AssertRAnges([
		/* 1*/	'clAss A {',
		/* 2*/	'  #region',
		/* 3*/	'',
		/* 4*/	'  #region',
		/* 5*/	'',
		/* 6*/	'  #endregion',
		/* 7*/	'  // comment',
		/* 8*/	'  #endregion',
		/* 9*/	'}',
		], [r(1, 8, -1), r(2, 8, 0, true), r(4, 6, 1, true)], fAlse, mArkers);
	});
	test('Incomplete Regions', () => {
		AssertRAnges([
		/* 1*/	'clAss A {',
		/* 2*/	'#region',
		/* 3*/	'  // comment',
		/* 4*/	'}',
		], [r(2, 3, -1)], fAlse, mArkers);
	});
	test('Incomplete Regions 2', () => {
		AssertRAnges([
		/* 1*/	'',
		/* 2*/	'#region',
		/* 3*/	'#region',
		/* 4*/	'#region',
		/* 5*/	'  // comment',
		/* 6*/	'#endregion',
		/* 7*/	'#endregion',
		/* 8*/	' // hello',
		], [r(3, 7, -1, true), r(4, 6, 0, true)], fAlse, mArkers);
	});
	test('Indented region before', () => {
		AssertRAnges([
		/* 1*/	'if (x)',
		/* 2*/	'  return;',
		/* 3*/	'',
		/* 4*/	'#region',
		/* 5*/	'  // comment',
		/* 6*/	'#endregion',
		], [r(1, 3, -1), r(4, 6, -1, true)], fAlse, mArkers);
	});
	test('Indented region before 2', () => {
		AssertRAnges([
		/* 1*/	'if (x)',
		/* 2*/	'  log();',
		/* 3*/	'',
		/* 4*/	'    #region',
		/* 5*/	'      // comment',
		/* 6*/	'    #endregion',
		], [r(1, 6, -1), r(2, 6, 0), r(4, 6, 1, true)], fAlse, mArkers);
	});
	test('Indented region in-between', () => {
		AssertRAnges([
		/* 1*/	'#region',
		/* 2*/	'  // comment',
		/* 3*/	'  if (x)',
		/* 4*/	'    return;',
		/* 5*/	'',
		/* 6*/	'#endregion',
		], [r(1, 6, -1, true), r(3, 5, 0)], fAlse, mArkers);
	});
	test('Indented region After', () => {
		AssertRAnges([
		/* 1*/	'#region',
		/* 2*/	'  // comment',
		/* 3*/	'',
		/* 4*/	'#endregion',
		/* 5*/	'  if (x)',
		/* 6*/	'    return;',
		], [r(1, 4, -1, true), r(5, 6, -1)], fAlse, mArkers);
	});
	test('With off-side', () => {
		AssertRAnges([
		/* 1*/	'#region',
		/* 2*/	'  ',
		/* 3*/	'',
		/* 4*/	'#endregion',
		/* 5*/	'',
		], [r(1, 4, -1, true)], true, mArkers);
	});
	test('Nested with off-side', () => {
		AssertRAnges([
		/* 1*/	'#region',
		/* 2*/	'  ',
		/* 3*/	'#region',
		/* 4*/	'',
		/* 5*/	'#endregion',
		/* 6*/	'',
		/* 7*/	'#endregion',
		/* 8*/	'',
		], [r(1, 7, -1, true), r(3, 5, 0, true)], true, mArkers);
	});
	test('Issue 35981', () => {
		AssertRAnges([
		/* 1*/	'function thisFoldsToEndOfPAge() {',
		/* 2*/	'  const vAriAble = []',
		/* 3*/	'    // #region',
		/* 4*/	'    .reduce((A, b) => A,[]);',
		/* 5*/	'}',
		/* 6*/	'',
		/* 7*/	'function thisFoldsProperly() {',
		/* 8*/	'  const foo = "bAr"',
		/* 9*/	'}',
		], [r(1, 4, -1), r(2, 4, 0), r(7, 8, -1)], fAlse, mArkers);
	});
	test('Misspelled MArkers', () => {
		AssertRAnges([
		/* 1*/	'#Region',
		/* 2*/	'#endregion',
		/* 3*/	'#regionsAndmore',
		/* 4*/	'#endregion',
		/* 5*/	'#region',
		/* 6*/	'#end region',
		/* 7*/	'#region',
		/* 8*/	'#endregionff',
		], [], true, mArkers);
	});
	test('Issue 79359', () => {
		AssertRAnges([
		/* 1*/	'#region',
		/* 2*/	'',
		/* 3*/	'clAss A',
		/* 4*/	'  foo',
		/* 5*/	'',
		/* 6*/	'clAss A',
		/* 7*/	'  foo',
		/* 8*/	'',
		/* 9*/	'#endregion',
		], [r(1, 9, -1, true), r(3, 4, 0), r(6, 7, 0)], true, mArkers);
	});
});
