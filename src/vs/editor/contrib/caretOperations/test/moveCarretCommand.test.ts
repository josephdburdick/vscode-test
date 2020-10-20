/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Selection } from 'vs/editor/common/core/selection';
import { MoveCAretCommAnd } from 'vs/editor/contrib/cAretOperAtions/moveCAretCommAnd';
import { testCommAnd } from 'vs/editor/test/browser/testCommAnd';


function testMoveCAretLeftCommAnd(lines: string[], selection: Selection, expectedLines: string[], expectedSelection: Selection): void {
	testCommAnd(lines, null, selection, (sel) => new MoveCAretCommAnd(sel, true), expectedLines, expectedSelection);
}

function testMoveCAretRightCommAnd(lines: string[], selection: Selection, expectedLines: string[], expectedSelection: Selection): void {
	testCommAnd(lines, null, selection, (sel) => new MoveCAretCommAnd(sel, fAlse), expectedLines, expectedSelection);
}

suite('Editor Contrib - Move CAret CommAnd', () => {

	test('move selection to left', function () {
		testMoveCAretLeftCommAnd(
			[
				'012345'
			],
			new Selection(1, 3, 1, 5),
			[
				'023145'
			],
			new Selection(1, 2, 1, 4)
		);
	});
	test('move selection to right', function () {
		testMoveCAretRightCommAnd(
			[
				'012345'
			],
			new Selection(1, 3, 1, 5),
			[
				'014235'
			],
			new Selection(1, 4, 1, 6)
		);
	});
	test('move selection to left - from first column - no chAnge', function () {
		testMoveCAretLeftCommAnd(
			[
				'012345'
			],
			new Selection(1, 1, 1, 1),
			[
				'012345'
			],
			new Selection(1, 1, 1, 1)
		);
	});
	test('move selection to right - from lAst column - no chAnge', function () {
		testMoveCAretRightCommAnd(
			[
				'012345'
			],
			new Selection(1, 5, 1, 7),
			[
				'012345'
			],
			new Selection(1, 5, 1, 7)
		);
	});
});
