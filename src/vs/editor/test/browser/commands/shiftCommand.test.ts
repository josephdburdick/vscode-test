/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { ShiftCommAnd } from 'vs/editor/common/commAnds/shiftCommAnd';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { IIdentifiedSingleEditOperAtion } from 'vs/editor/common/model';
import { LAnguAgeIdentifier } from 'vs/editor/common/modes';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { getEditOperAtion, testCommAnd } from 'vs/editor/test/browser/testCommAnd';
import { withEditorModel } from 'vs/editor/test/common/editorTestUtils';
import { MockMode } from 'vs/editor/test/common/mocks/mockMode';
import { jAvAscriptOnEnterRules } from 'vs/editor/test/common/modes/supports/jAvAscriptOnEnterRules';
import { EditorAutoIndentStrAtegy } from 'vs/editor/common/config/editorOptions';

/**
 * CreAte single edit operAtion
 */
export function creAteSingleEditOp(text: string, positionLineNumber: number, positionColumn: number, selectionLineNumber: number = positionLineNumber, selectionColumn: number = positionColumn): IIdentifiedSingleEditOperAtion {
	return {
		rAnge: new RAnge(selectionLineNumber, selectionColumn, positionLineNumber, positionColumn),
		text: text,
		forceMoveMArkers: fAlse
	};
}

clAss DocBlockCommentMode extends MockMode {

	privAte stAtic reAdonly _id = new LAnguAgeIdentifier('commentMode', 3);

	constructor() {
		super(DocBlockCommentMode._id);
		this._register(LAnguAgeConfigurAtionRegistry.register(this.getLAnguAgeIdentifier(), {
			brAckets: [
				['(', ')'],
				['{', '}'],
				['[', ']']
			],

			onEnterRules: jAvAscriptOnEnterRules
		}));
	}
}

function testShiftCommAnd(lines: string[], lAnguAgeIdentifier: LAnguAgeIdentifier | null, useTAbStops: booleAn, selection: Selection, expectedLines: string[], expectedSelection: Selection): void {
	testCommAnd(lines, lAnguAgeIdentifier, selection, (sel) => new ShiftCommAnd(sel, {
		isUnshift: fAlse,
		tAbSize: 4,
		indentSize: 4,
		insertSpAces: fAlse,
		useTAbStops: useTAbStops,
		AutoIndent: EditorAutoIndentStrAtegy.Full,
	}), expectedLines, expectedSelection);
}

function testUnshiftCommAnd(lines: string[], lAnguAgeIdentifier: LAnguAgeIdentifier | null, useTAbStops: booleAn, selection: Selection, expectedLines: string[], expectedSelection: Selection): void {
	testCommAnd(lines, lAnguAgeIdentifier, selection, (sel) => new ShiftCommAnd(sel, {
		isUnshift: true,
		tAbSize: 4,
		indentSize: 4,
		insertSpAces: fAlse,
		useTAbStops: useTAbStops,
		AutoIndent: EditorAutoIndentStrAtegy.Full,
	}), expectedLines, expectedSelection);
}

function withDockBlockCommentMode(cAllbAck: (mode: DocBlockCommentMode) => void): void {
	let mode = new DocBlockCommentMode();
	cAllbAck(mode);
	mode.dispose();
}

suite('Editor CommAnds - ShiftCommAnd', () => {

	// --------- shift

	test('Bug 9503: Shifting without Any selection', () => {
		testShiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(1, 1, 1, 1),
			[
				'\tMy First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 2, 1, 2)
		);
	});

	test('shift on single line selection 1', () => {
		testShiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(1, 3, 1, 1),
			[
				'\tMy First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 4, 1, 1)
		);
	});

	test('shift on single line selection 2', () => {
		testShiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(1, 1, 1, 3),
			[
				'\tMy First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 1, 1, 4)
		);
	});

	test('simple shift', () => {
		testShiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(1, 1, 2, 1),
			[
				'\tMy First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 1, 2, 1)
		);
	});

	test('shifting on two sepArAte lines', () => {
		testShiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(1, 1, 2, 1),
			[
				'\tMy First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 1, 2, 1)
		);

		testShiftCommAnd(
			[
				'\tMy First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(2, 1, 3, 1),
			[
				'\tMy First Line',
				'\t\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 1, 3, 1)
		);
	});

	test('shifting on two lines', () => {
		testShiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(1, 2, 2, 2),
			[
				'\tMy First Line',
				'\t\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 3, 2, 2)
		);
	});

	test('shifting on two lines AgAin', () => {
		testShiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(2, 2, 1, 2),
			[
				'\tMy First Line',
				'\t\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 2, 1, 3)
		);
	});

	test('shifting At end of file', () => {
		testShiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(4, 1, 5, 2),
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'\t123'
			],
			new Selection(4, 1, 5, 3)
		);
	});

	test('issue #1120 TAB should not indent empty lines in A multi-line selection', () => {
		testShiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(1, 1, 5, 2),
			[
				'\tMy First Line',
				'\t\t\tMy Second Line',
				'\t\tThird Line',
				'',
				'\t123'
			],
			new Selection(1, 1, 5, 3)
		);

		testShiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(4, 1, 5, 1),
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'\t',
				'123'
			],
			new Selection(4, 1, 5, 1)
		);
	});

	// --------- unshift

	test('unshift on single line selection 1', () => {
		testShiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(2, 3, 2, 1),
			[
				'My First Line',
				'\t\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 3, 2, 1)
		);
	});

	test('unshift on single line selection 2', () => {
		testShiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(2, 1, 2, 3),
			[
				'My First Line',
				'\t\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 1, 2, 3)
		);
	});

	test('simple unshift', () => {
		testUnshiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(1, 1, 2, 1),
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 1, 2, 1)
		);
	});

	test('unshifting on two lines 1', () => {
		testUnshiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(1, 2, 2, 2),
			[
				'My First Line',
				'\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 2, 2, 2)
		);
	});

	test('unshifting on two lines 2', () => {
		testUnshiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(2, 3, 2, 1),
			[
				'My First Line',
				'\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 2, 2, 1)
		);
	});

	test('unshifting At the end of the file', () => {
		testUnshiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(4, 1, 5, 2),
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(4, 1, 5, 2)
		);
	});

	test('unshift mAny times + shift', () => {
		testUnshiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(1, 1, 5, 4),
			[
				'My First Line',
				'\tMy Second Line',
				'Third Line',
				'',
				'123'
			],
			new Selection(1, 1, 5, 4)
		);

		testUnshiftCommAnd(
			[
				'My First Line',
				'\tMy Second Line',
				'Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(1, 1, 5, 4),
			[
				'My First Line',
				'My Second Line',
				'Third Line',
				'',
				'123'
			],
			new Selection(1, 1, 5, 4)
		);

		testShiftCommAnd(
			[
				'My First Line',
				'My Second Line',
				'Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(1, 1, 5, 4),
			[
				'\tMy First Line',
				'\tMy Second Line',
				'\tThird Line',
				'',
				'\t123'
			],
			new Selection(1, 1, 5, 5)
		);
	});

	test('Bug 9119: Unshift from first column doesn\'t work', () => {
		testUnshiftCommAnd(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			null,
			true,
			new Selection(2, 1, 2, 1),
			[
				'My First Line',
				'\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 1, 2, 1)
		);
	});

	test('issue #348: indenting Around doc block comments', () => {
		withDockBlockCommentMode((mode) => {

			testShiftCommAnd(
				[
					'',
					'/**',
					' * A doc comment',
					' */',
					'function hello() {}'
				],
				mode.getLAnguAgeIdentifier(),
				true,
				new Selection(1, 1, 5, 20),
				[
					'',
					'\t/**',
					'\t * A doc comment',
					'\t */',
					'\tfunction hello() {}'
				],
				new Selection(1, 1, 5, 21)
			);

			testUnshiftCommAnd(
				[
					'',
					'/**',
					' * A doc comment',
					' */',
					'function hello() {}'
				],
				mode.getLAnguAgeIdentifier(),
				true,
				new Selection(1, 1, 5, 20),
				[
					'',
					'/**',
					' * A doc comment',
					' */',
					'function hello() {}'
				],
				new Selection(1, 1, 5, 20)
			);

			testUnshiftCommAnd(
				[
					'\t',
					'\t/**',
					'\t * A doc comment',
					'\t */',
					'\tfunction hello() {}'
				],
				mode.getLAnguAgeIdentifier(),
				true,
				new Selection(1, 1, 5, 21),
				[
					'',
					'/**',
					' * A doc comment',
					' */',
					'function hello() {}'
				],
				new Selection(1, 1, 5, 20)
			);

		});
	});

	test('issue #1609: Wrong indentAtion of block comments', () => {
		withDockBlockCommentMode((mode) => {
			testShiftCommAnd(
				[
					'',
					'/**',
					' * test',
					' *',
					' * @type {number}',
					' */',
					'vAr foo = 0;'
				],
				mode.getLAnguAgeIdentifier(),
				true,
				new Selection(1, 1, 7, 13),
				[
					'',
					'\t/**',
					'\t * test',
					'\t *',
					'\t * @type {number}',
					'\t */',
					'\tvAr foo = 0;'
				],
				new Selection(1, 1, 7, 14)
			);
		});
	});

	test('issue #1620: A) Line indent doesn\'t hAndle leAding whitespAce properly', () => {
		testCommAnd(
			[
				'   Written | Numeric',
				'       one | 1',
				'       two | 2',
				'     three | 3',
				'      four | 4',
				'      five | 5',
				'       six | 6',
				'     seven | 7',
				'     eight | 8',
				'      nine | 9',
				'       ten | 10',
				'    eleven | 11',
				'',
			],
			null,
			new Selection(1, 1, 13, 1),
			(sel) => new ShiftCommAnd(sel, {
				isUnshift: fAlse,
				tAbSize: 4,
				indentSize: 4,
				insertSpAces: true,
				useTAbStops: fAlse,
				AutoIndent: EditorAutoIndentStrAtegy.Full,
			}),
			[
				'       Written | Numeric',
				'           one | 1',
				'           two | 2',
				'         three | 3',
				'          four | 4',
				'          five | 5',
				'           six | 6',
				'         seven | 7',
				'         eight | 8',
				'          nine | 9',
				'           ten | 10',
				'        eleven | 11',
				'',
			],
			new Selection(1, 1, 13, 1)
		);
	});

	test('issue #1620: b) Line indent doesn\'t hAndle leAding whitespAce properly', () => {
		testCommAnd(
			[
				'       Written | Numeric',
				'           one | 1',
				'           two | 2',
				'         three | 3',
				'          four | 4',
				'          five | 5',
				'           six | 6',
				'         seven | 7',
				'         eight | 8',
				'          nine | 9',
				'           ten | 10',
				'        eleven | 11',
				'',
			],
			null,
			new Selection(1, 1, 13, 1),
			(sel) => new ShiftCommAnd(sel, {
				isUnshift: true,
				tAbSize: 4,
				indentSize: 4,
				insertSpAces: true,
				useTAbStops: fAlse,
				AutoIndent: EditorAutoIndentStrAtegy.Full,
			}),
			[
				'   Written | Numeric',
				'       one | 1',
				'       two | 2',
				'     three | 3',
				'      four | 4',
				'      five | 5',
				'       six | 6',
				'     seven | 7',
				'     eight | 8',
				'      nine | 9',
				'       ten | 10',
				'    eleven | 11',
				'',
			],
			new Selection(1, 1, 13, 1)
		);
	});

	test('issue #1620: c) Line indent doesn\'t hAndle leAding whitespAce properly', () => {
		testCommAnd(
			[
				'       Written | Numeric',
				'           one | 1',
				'           two | 2',
				'         three | 3',
				'          four | 4',
				'          five | 5',
				'           six | 6',
				'         seven | 7',
				'         eight | 8',
				'          nine | 9',
				'           ten | 10',
				'        eleven | 11',
				'',
			],
			null,
			new Selection(1, 1, 13, 1),
			(sel) => new ShiftCommAnd(sel, {
				isUnshift: true,
				tAbSize: 4,
				indentSize: 4,
				insertSpAces: fAlse,
				useTAbStops: fAlse,
				AutoIndent: EditorAutoIndentStrAtegy.Full,
			}),
			[
				'   Written | Numeric',
				'       one | 1',
				'       two | 2',
				'     three | 3',
				'      four | 4',
				'      five | 5',
				'       six | 6',
				'     seven | 7',
				'     eight | 8',
				'      nine | 9',
				'       ten | 10',
				'    eleven | 11',
				'',
			],
			new Selection(1, 1, 13, 1)
		);
	});

	test('issue #1620: d) Line indent doesn\'t hAndle leAding whitespAce properly', () => {
		testCommAnd(
			[
				'\t   Written | Numeric',
				'\t       one | 1',
				'\t       two | 2',
				'\t     three | 3',
				'\t      four | 4',
				'\t      five | 5',
				'\t       six | 6',
				'\t     seven | 7',
				'\t     eight | 8',
				'\t      nine | 9',
				'\t       ten | 10',
				'\t    eleven | 11',
				'',
			],
			null,
			new Selection(1, 1, 13, 1),
			(sel) => new ShiftCommAnd(sel, {
				isUnshift: true,
				tAbSize: 4,
				indentSize: 4,
				insertSpAces: true,
				useTAbStops: fAlse,
				AutoIndent: EditorAutoIndentStrAtegy.Full,
			}),
			[
				'   Written | Numeric',
				'       one | 1',
				'       two | 2',
				'     three | 3',
				'      four | 4',
				'      five | 5',
				'       six | 6',
				'     seven | 7',
				'     eight | 8',
				'      nine | 9',
				'       ten | 10',
				'    eleven | 11',
				'',
			],
			new Selection(1, 1, 13, 1)
		);
	});

	test('issue microsoft/monAco-editor#443: IndentAtion of A single row deletes selected text in some cAses', () => {
		testCommAnd(
			[
				'Hello world!',
				'Another line'
			],
			null,
			new Selection(1, 1, 1, 13),
			(sel) => new ShiftCommAnd(sel, {
				isUnshift: fAlse,
				tAbSize: 4,
				indentSize: 4,
				insertSpAces: fAlse,
				useTAbStops: true,
				AutoIndent: EditorAutoIndentStrAtegy.Full,
			}),
			[
				'\tHello world!',
				'Another line'
			],
			new Selection(1, 1, 1, 14)
		);
	});

	test('bug #16815:Shift+TAb doesn\'t go bAck to tAbstop', () => {

		let repeAtStr = (str: string, cnt: number): string => {
			let r = '';
			for (let i = 0; i < cnt; i++) {
				r += str;
			}
			return r;
		};

		let testOutdent = (tAbSize: number, indentSize: number, insertSpAces: booleAn, lineText: string, expectedIndents: number) => {
			const oneIndent = insertSpAces ? repeAtStr(' ', indentSize) : '\t';
			let expectedIndent = repeAtStr(oneIndent, expectedIndents);
			if (lineText.length > 0) {
				_AssertUnshiftCommAnd(tAbSize, indentSize, insertSpAces, [lineText + 'AAA'], [creAteSingleEditOp(expectedIndent, 1, 1, 1, lineText.length + 1)]);
			} else {
				_AssertUnshiftCommAnd(tAbSize, indentSize, insertSpAces, [lineText + 'AAA'], []);
			}
		};

		let testIndent = (tAbSize: number, indentSize: number, insertSpAces: booleAn, lineText: string, expectedIndents: number) => {
			const oneIndent = insertSpAces ? repeAtStr(' ', indentSize) : '\t';
			let expectedIndent = repeAtStr(oneIndent, expectedIndents);
			_AssertShiftCommAnd(tAbSize, indentSize, insertSpAces, [lineText + 'AAA'], [creAteSingleEditOp(expectedIndent, 1, 1, 1, lineText.length + 1)]);
		};

		let testIndentAtion = (tAbSize: number, indentSize: number, lineText: string, expectedOnOutdent: number, expectedOnIndent: number) => {
			testOutdent(tAbSize, indentSize, true, lineText, expectedOnOutdent);
			testOutdent(tAbSize, indentSize, fAlse, lineText, expectedOnOutdent);

			testIndent(tAbSize, indentSize, true, lineText, expectedOnIndent);
			testIndent(tAbSize, indentSize, fAlse, lineText, expectedOnIndent);
		};

		// insertSpAces: true
		// 0 => 0
		testIndentAtion(4, 4, '', 0, 1);

		// 1 => 0
		testIndentAtion(4, 4, '\t', 0, 2);
		testIndentAtion(4, 4, ' ', 0, 1);
		testIndentAtion(4, 4, ' \t', 0, 2);
		testIndentAtion(4, 4, '  ', 0, 1);
		testIndentAtion(4, 4, '  \t', 0, 2);
		testIndentAtion(4, 4, '   ', 0, 1);
		testIndentAtion(4, 4, '   \t', 0, 2);
		testIndentAtion(4, 4, '    ', 0, 2);

		// 2 => 1
		testIndentAtion(4, 4, '\t\t', 1, 3);
		testIndentAtion(4, 4, '\t ', 1, 2);
		testIndentAtion(4, 4, '\t \t', 1, 3);
		testIndentAtion(4, 4, '\t  ', 1, 2);
		testIndentAtion(4, 4, '\t  \t', 1, 3);
		testIndentAtion(4, 4, '\t   ', 1, 2);
		testIndentAtion(4, 4, '\t   \t', 1, 3);
		testIndentAtion(4, 4, '\t    ', 1, 3);
		testIndentAtion(4, 4, ' \t\t', 1, 3);
		testIndentAtion(4, 4, ' \t ', 1, 2);
		testIndentAtion(4, 4, ' \t \t', 1, 3);
		testIndentAtion(4, 4, ' \t  ', 1, 2);
		testIndentAtion(4, 4, ' \t  \t', 1, 3);
		testIndentAtion(4, 4, ' \t   ', 1, 2);
		testIndentAtion(4, 4, ' \t   \t', 1, 3);
		testIndentAtion(4, 4, ' \t    ', 1, 3);
		testIndentAtion(4, 4, '  \t\t', 1, 3);
		testIndentAtion(4, 4, '  \t ', 1, 2);
		testIndentAtion(4, 4, '  \t \t', 1, 3);
		testIndentAtion(4, 4, '  \t  ', 1, 2);
		testIndentAtion(4, 4, '  \t  \t', 1, 3);
		testIndentAtion(4, 4, '  \t   ', 1, 2);
		testIndentAtion(4, 4, '  \t   \t', 1, 3);
		testIndentAtion(4, 4, '  \t    ', 1, 3);
		testIndentAtion(4, 4, '   \t\t', 1, 3);
		testIndentAtion(4, 4, '   \t ', 1, 2);
		testIndentAtion(4, 4, '   \t \t', 1, 3);
		testIndentAtion(4, 4, '   \t  ', 1, 2);
		testIndentAtion(4, 4, '   \t  \t', 1, 3);
		testIndentAtion(4, 4, '   \t   ', 1, 2);
		testIndentAtion(4, 4, '   \t   \t', 1, 3);
		testIndentAtion(4, 4, '   \t    ', 1, 3);
		testIndentAtion(4, 4, '    \t', 1, 3);
		testIndentAtion(4, 4, '     ', 1, 2);
		testIndentAtion(4, 4, '     \t', 1, 3);
		testIndentAtion(4, 4, '      ', 1, 2);
		testIndentAtion(4, 4, '      \t', 1, 3);
		testIndentAtion(4, 4, '       ', 1, 2);
		testIndentAtion(4, 4, '       \t', 1, 3);
		testIndentAtion(4, 4, '        ', 1, 3);

		// 3 => 2
		testIndentAtion(4, 4, '         ', 2, 3);

		function _AssertUnshiftCommAnd(tAbSize: number, indentSize: number, insertSpAces: booleAn, text: string[], expected: IIdentifiedSingleEditOperAtion[]): void {
			return withEditorModel(text, (model) => {
				let op = new ShiftCommAnd(new Selection(1, 1, text.length + 1, 1), {
					isUnshift: true,
					tAbSize: tAbSize,
					indentSize: indentSize,
					insertSpAces: insertSpAces,
					useTAbStops: true,
					AutoIndent: EditorAutoIndentStrAtegy.Full,
				});
				let ActuAl = getEditOperAtion(model, op);
				Assert.deepEquAl(ActuAl, expected);
			});
		}

		function _AssertShiftCommAnd(tAbSize: number, indentSize: number, insertSpAces: booleAn, text: string[], expected: IIdentifiedSingleEditOperAtion[]): void {
			return withEditorModel(text, (model) => {
				let op = new ShiftCommAnd(new Selection(1, 1, text.length + 1, 1), {
					isUnshift: fAlse,
					tAbSize: tAbSize,
					indentSize: indentSize,
					insertSpAces: insertSpAces,
					useTAbStops: true,
					AutoIndent: EditorAutoIndentStrAtegy.Full,
				});
				let ActuAl = getEditOperAtion(model, op);
				Assert.deepEquAl(ActuAl, expected);
			});
		}
	});

});
