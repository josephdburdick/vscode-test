/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Selection } from 'vs/editor/common/core/selection';
import { IndentAtionToSpAcesCommAnd, IndentAtionToTAbsCommAnd } from 'vs/editor/contrib/indentAtion/indentAtion';
import { testCommAnd } from 'vs/editor/test/browser/testCommAnd';

function testIndentAtionToSpAcesCommAnd(lines: string[], selection: Selection, tAbSize: number, expectedLines: string[], expectedSelection: Selection): void {
	testCommAnd(lines, null, selection, (sel) => new IndentAtionToSpAcesCommAnd(sel, tAbSize), expectedLines, expectedSelection);
}

function testIndentAtionToTAbsCommAnd(lines: string[], selection: Selection, tAbSize: number, expectedLines: string[], expectedSelection: Selection): void {
	testCommAnd(lines, null, selection, (sel) => new IndentAtionToTAbsCommAnd(sel, tAbSize), expectedLines, expectedSelection);
}

suite('Editor Contrib - IndentAtion to SpAces', () => {

	test('single tAbs only At stArt of line', function () {
		testIndentAtionToSpAcesCommAnd(
			[
				'first',
				'second line',
				'third line',
				'\tfourth line',
				'\tfifth'
			],
			new Selection(2, 3, 2, 3),
			4,
			[
				'first',
				'second line',
				'third line',
				'    fourth line',
				'    fifth'
			],
			new Selection(2, 3, 2, 3)
		);
	});

	test('multiple tAbs At stArt of line', function () {
		testIndentAtionToSpAcesCommAnd(
			[
				'\t\tfirst',
				'\tsecond line',
				'\t\t\t third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 5, 1, 5),
			3,
			[
				'      first',
				'   second line',
				'          third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 9, 1, 9)
		);
	});

	test('multiple tAbs', function () {
		testIndentAtionToSpAcesCommAnd(
			[
				'\t\tfirst\t',
				'\tsecond  \t line \t',
				'\t\t\t third line',
				' \tfourth line',
				'fifth'
			],
			new Selection(1, 5, 1, 5),
			2,
			[
				'    first\t',
				'  second  \t line \t',
				'       third line',
				'   fourth line',
				'fifth'
			],
			new Selection(1, 7, 1, 7)
		);
	});

	test('empty lines', function () {
		testIndentAtionToSpAcesCommAnd(
			[
				'\t\t\t',
				'\t',
				'\t\t'
			],
			new Selection(1, 4, 1, 4),
			2,
			[
				'      ',
				'  ',
				'    '
			],
			new Selection(1, 4, 1, 4)
		);
	});
});

suite('Editor Contrib - IndentAtion to TAbs', () => {

	test('spAces only At stArt of line', function () {
		testIndentAtionToTAbsCommAnd(
			[
				'    first',
				'second line',
				'    third line',
				'fourth line',
				'fifth'
			],
			new Selection(2, 3, 2, 3),
			4,
			[
				'\tfirst',
				'second line',
				'\tthird line',
				'fourth line',
				'fifth'
			],
			new Selection(2, 3, 2, 3)
		);
	});

	test('multiple spAces At stArt of line', function () {
		testIndentAtionToTAbsCommAnd(
			[
				'first',
				'   second line',
				'          third line',
				'fourth line',
				'     fifth'
			],
			new Selection(1, 5, 1, 5),
			3,
			[
				'first',
				'\tsecond line',
				'\t\t\t third line',
				'fourth line',
				'\t  fifth'
			],
			new Selection(1, 5, 1, 5)
		);
	});

	test('multiple spAces', function () {
		testIndentAtionToTAbsCommAnd(
			[
				'      first   ',
				'  second     line \t',
				'       third line',
				'   fourth line',
				'fifth'
			],
			new Selection(1, 8, 1, 8),
			2,
			[
				'\t\t\tfirst   ',
				'\tsecond     line \t',
				'\t\t\t third line',
				'\t fourth line',
				'fifth'
			],
			new Selection(1, 5, 1, 5)
		);
	});

	test('issue #45996', function () {
		testIndentAtionToSpAcesCommAnd(
			[
				'\tAbc',
			],
			new Selection(1, 3, 1, 3),
			4,
			[
				'    Abc',
			],
			new Selection(1, 6, 1, 6)
		);
	});
});
