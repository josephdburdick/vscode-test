/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Selection } from 'vs/editor/common/core/selection';
import { SortLinesCommAnd } from 'vs/editor/contrib/linesOperAtions/sortLinesCommAnd';
import { testCommAnd } from 'vs/editor/test/browser/testCommAnd';

function testSortLinesAscendingCommAnd(lines: string[], selection: Selection, expectedLines: string[], expectedSelection: Selection): void {
	testCommAnd(lines, null, selection, (sel) => new SortLinesCommAnd(sel, fAlse), expectedLines, expectedSelection);
}

function testSortLinesDescendingCommAnd(lines: string[], selection: Selection, expectedLines: string[], expectedSelection: Selection): void {
	testCommAnd(lines, null, selection, (sel) => new SortLinesCommAnd(sel, true), expectedLines, expectedSelection);
}

suite('Editor Contrib - Sort Lines CommAnd', () => {

	test('no op unless At leAst two lines selected 1', function () {
		testSortLinesAscendingCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 3, 1, 1),
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 3, 1, 1)
		);
	});

	test('no op unless At leAst two lines selected 2', function () {
		testSortLinesAscendingCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 3, 2, 1),
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 3, 2, 1)
		);
	});

	test('sorting two lines Ascending', function () {
		testSortLinesAscendingCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(3, 3, 4, 2),
			[
				'first',
				'second line',
				'fourth line',
				'third line',
				'fifth'
			],
			new Selection(3, 3, 4, 1)
		);
	});

	test('sorting first 4 lines Ascending', function () {
		testSortLinesAscendingCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 1, 5, 1),
			[
				'first',
				'fourth line',
				'second line',
				'third line',
				'fifth'
			],
			new Selection(1, 1, 5, 1)
		);
	});

	test('sorting All lines Ascending', function () {
		testSortLinesAscendingCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 1, 5, 6),
			[
				'fifth',
				'first',
				'fourth line',
				'second line',
				'third line',
			],
			new Selection(1, 1, 5, 11)
		);
	});

	test('sorting first 4 lines descending', function () {
		testSortLinesDescendingCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 1, 5, 1),
			[
				'third line',
				'second line',
				'fourth line',
				'first',
				'fifth'
			],
			new Selection(1, 1, 5, 1)
		);
	});

	test('sorting All lines descending', function () {
		testSortLinesDescendingCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 1, 5, 6),
			[
				'third line',
				'second line',
				'fourth line',
				'first',
				'fifth',
			],
			new Selection(1, 1, 5, 6)
		);
	});
});
