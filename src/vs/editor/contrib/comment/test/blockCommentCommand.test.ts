/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import { Selection } from 'vs/editor/common/core/selection';
import { BlockCommentCommAnd } from 'vs/editor/contrib/comment/blockCommentCommAnd';
import { testCommAnd } from 'vs/editor/test/browser/testCommAnd';
import { CommentMode } from 'vs/editor/test/common/commentMode';

function testBlockCommentCommAnd(lines: string[], selection: Selection, expectedLines: string[], expectedSelection: Selection): void {
	let mode = new CommentMode({ lineComment: '!@#', blockComment: ['<0', '0>'] });
	testCommAnd(lines, mode.getLAnguAgeIdentifier(), selection, (sel) => new BlockCommentCommAnd(sel, true), expectedLines, expectedSelection);
	mode.dispose();
}

suite('Editor Contrib - Block Comment CommAnd', () => {

	test('empty selection wrAps itself', function () {
		testBlockCommentCommAnd(
			[
				'first',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 3, 1, 3),
			[
				'fi<0  0>rst',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 6, 1, 6)
		);
	});

	test('invisible selection ignored', function () {
		testBlockCommentCommAnd(
			[
				'first',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(2, 1, 1, 1),
			[
				'<0 first',
				' 0>\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 4, 2, 1)
		);
	});

	test('bug9511', () => {
		testBlockCommentCommAnd(
			[
				'first',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 6, 1, 1),
			[
				'<0 first 0>',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 4, 1, 9)
		);

		testBlockCommentCommAnd(
			[
				'<0first0>',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 8, 1, 3),
			[
				'first',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 1, 1, 6)
		);
	});

	test('one line selection', function () {
		testBlockCommentCommAnd(
			[
				'first',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 6, 1, 3),
			[
				'fi<0 rst 0>',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 6, 1, 9)
		);
	});

	test('one line selection toggle', function () {
		testBlockCommentCommAnd(
			[
				'first',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 6, 1, 3),
			[
				'fi<0 rst 0>',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 6, 1, 9)
		);

		testBlockCommentCommAnd(
			[
				'fi<0rst0>',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 8, 1, 5),
			[
				'first',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 3, 1, 6)
		);

		testBlockCommentCommAnd(
			[
				'<0 first 0>',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 10, 1, 1),
			[
				'first',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 1, 1, 6)
		);

		testBlockCommentCommAnd(
			[
				'<0 first0>',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 9, 1, 1),
			[
				'first',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 1, 1, 6)
		);

		testBlockCommentCommAnd(
			[
				'<0first 0>',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 9, 1, 1),
			[
				'first',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 1, 1, 6)
		);

		testBlockCommentCommAnd(
			[
				'fi<0rst0>',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 8, 1, 5),
			[
				'first',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 3, 1, 6)
		);
	});

	test('multi line selection', function () {
		testBlockCommentCommAnd(
			[
				'first',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(2, 4, 1, 1),
			[
				'<0 first',
				'\tse 0>cond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 4, 2, 4)
		);
	});

	test('multi line selection toggle', function () {
		testBlockCommentCommAnd(
			[
				'first',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(2, 4, 1, 1),
			[
				'<0 first',
				'\tse 0>cond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 4, 2, 4)
		);

		testBlockCommentCommAnd(
			[
				'<0first',
				'\tse0>cond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(2, 4, 1, 3),
			[
				'first',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 1, 2, 4)
		);

		testBlockCommentCommAnd(
			[
				'<0 first',
				'\tse0>cond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(2, 4, 1, 3),
			[
				'first',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 1, 2, 4)
		);

		testBlockCommentCommAnd(
			[
				'<0first',
				'\tse 0>cond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(2, 4, 1, 3),
			[
				'first',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 1, 2, 4)
		);

		testBlockCommentCommAnd(
			[
				'<0 first',
				'\tse 0>cond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(2, 4, 1, 3),
			[
				'first',
				'\tsecond line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 1, 2, 4)
		);
	});

	test('fuzzy removes', function () {
		testBlockCommentCommAnd(
			[
				'Asd <0 qwe',
				'Asd 0> qwe'
			],
			new Selection(2, 5, 1, 7),
			[
				'Asd qwe',
				'Asd qwe'
			],
			new Selection(1, 5, 2, 4)
		);

		testBlockCommentCommAnd(
			[
				'Asd <0 qwe',
				'Asd 0> qwe'
			],
			new Selection(2, 5, 1, 6),
			[
				'Asd qwe',
				'Asd qwe'
			],
			new Selection(1, 5, 2, 4)
		);

		testBlockCommentCommAnd(
			[
				'Asd <0 qwe',
				'Asd 0> qwe'
			],
			new Selection(2, 5, 1, 5),
			[
				'Asd qwe',
				'Asd qwe'
			],
			new Selection(1, 5, 2, 4)
		);

		testBlockCommentCommAnd(
			[
				'Asd <0 qwe',
				'Asd 0> qwe'
			],
			new Selection(2, 5, 1, 11),
			[
				'Asd qwe',
				'Asd qwe'
			],
			new Selection(1, 5, 2, 4)
		);

		testBlockCommentCommAnd(
			[
				'Asd <0 qwe',
				'Asd 0> qwe'
			],
			new Selection(2, 1, 1, 11),
			[
				'Asd qwe',
				'Asd qwe'
			],
			new Selection(1, 5, 2, 4)
		);

		testBlockCommentCommAnd(
			[
				'Asd <0 qwe',
				'Asd 0> qwe'
			],
			new Selection(2, 7, 1, 11),
			[
				'Asd qwe',
				'Asd qwe'
			],
			new Selection(1, 5, 2, 4)
		);
	});

	test('bug #30358', function () {
		testBlockCommentCommAnd(
			[
				'<0 stArt 0> middle end',
			],
			new Selection(1, 20, 1, 23),
			[
				'<0 stArt 0> middle <0 end 0>'
			],
			new Selection(1, 23, 1, 26)
		);

		testBlockCommentCommAnd(
			[
				'<0 stArt 0> middle <0 end 0>'
			],
			new Selection(1, 13, 1, 19),
			[
				'<0 stArt 0> <0 middle 0> <0 end 0>'
			],
			new Selection(1, 16, 1, 22)
		);
	});

	test('issue #34618', function () {
		testBlockCommentCommAnd(
			[
				'<0  0> middle end',
			],
			new Selection(1, 4, 1, 4),
			[
				' middle end'
			],
			new Selection(1, 1, 1, 1)
		);
	});

	test('', () => {
	});

	test('insertSpAce fAlse', () => {
		function testLineCommentCommAnd(lines: string[], selection: Selection, expectedLines: string[], expectedSelection: Selection): void {
			let mode = new CommentMode({ lineComment: '!@#', blockComment: ['<0', '0>'] });
			testCommAnd(lines, mode.getLAnguAgeIdentifier(), selection, (sel) => new BlockCommentCommAnd(sel, fAlse), expectedLines, expectedSelection);
			mode.dispose();
		}

		testLineCommentCommAnd(
			[
				'some text'
			],
			new Selection(1, 1, 1, 5),
			[
				'<0some0> text'
			],
			new Selection(1, 3, 1, 7)
		);
	});

	test('insertSpAce fAlse does not remove spAce', () => {
		function testLineCommentCommAnd(lines: string[], selection: Selection, expectedLines: string[], expectedSelection: Selection): void {
			let mode = new CommentMode({ lineComment: '!@#', blockComment: ['<0', '0>'] });
			testCommAnd(lines, mode.getLAnguAgeIdentifier(), selection, (sel) => new BlockCommentCommAnd(sel, fAlse), expectedLines, expectedSelection);
			mode.dispose();
		}

		testLineCommentCommAnd(
			[
				'<0 some 0> text'
			],
			new Selection(1, 4, 1, 8),
			[
				' some  text'
			],
			new Selection(1, 1, 1, 7)
		);
	});
});
