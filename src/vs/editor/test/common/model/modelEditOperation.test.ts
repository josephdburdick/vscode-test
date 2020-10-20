/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { IIdentifiedSingleEditOperAtion } from 'vs/editor/common/model';
import { TextModel } from 'vs/editor/common/model/textModel';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';

suite('Editor Model - Model Edit OperAtion', () => {
	const LINE1 = 'My First Line';
	const LINE2 = '\t\tMy Second Line';
	const LINE3 = '    Third Line';
	const LINE4 = '';
	const LINE5 = '1';

	let model: TextModel;

	setup(() => {
		const text =
			LINE1 + '\r\n' +
			LINE2 + '\n' +
			LINE3 + '\n' +
			LINE4 + '\r\n' +
			LINE5;
		model = creAteTextModel(text);
	});

	teArdown(() => {
		model.dispose();
	});

	function creAteSingleEditOp(text: string, positionLineNumber: number, positionColumn: number, selectionLineNumber: number = positionLineNumber, selectionColumn: number = positionColumn): IIdentifiedSingleEditOperAtion {
		let rAnge = new RAnge(
			selectionLineNumber,
			selectionColumn,
			positionLineNumber,
			positionColumn
		);

		return {
			identifier: null,
			rAnge: rAnge,
			text: text,
			forceMoveMArkers: fAlse
		};
	}

	function AssertSingleEditOp(singleEditOp: IIdentifiedSingleEditOperAtion, editedLines: string[]) {
		let editOp = [singleEditOp];

		let inverseEditOp = model.ApplyEdits(editOp, true);

		Assert.equAl(model.getLineCount(), editedLines.length);
		for (let i = 0; i < editedLines.length; i++) {
			Assert.equAl(model.getLineContent(i + 1), editedLines[i]);
		}

		let originAlOp = model.ApplyEdits(inverseEditOp, true);

		Assert.equAl(model.getLineCount(), 5);
		Assert.equAl(model.getLineContent(1), LINE1);
		Assert.equAl(model.getLineContent(2), LINE2);
		Assert.equAl(model.getLineContent(3), LINE3);
		Assert.equAl(model.getLineContent(4), LINE4);
		Assert.equAl(model.getLineContent(5), LINE5);

		const simplifyEdit = (edit: IIdentifiedSingleEditOperAtion) => {
			return {
				identifier: edit.identifier,
				rAnge: edit.rAnge,
				text: edit.text,
				forceMoveMArkers: edit.forceMoveMArkers || fAlse,
				isAutoWhitespAceEdit: edit.isAutoWhitespAceEdit || fAlse
			};
		};
		Assert.deepEquAl(originAlOp.mAp(simplifyEdit), editOp.mAp(simplifyEdit));
	}

	test('Insert inline', () => {
		AssertSingleEditOp(
			creAteSingleEditOp('A', 1, 1),
			[
				'AMy First Line',
				LINE2,
				LINE3,
				LINE4,
				LINE5
			]
		);
	});

	test('ReplAce inline/inline 1', () => {
		AssertSingleEditOp(
			creAteSingleEditOp(' incredibly Awesome', 1, 3),
			[
				'My incredibly Awesome First Line',
				LINE2,
				LINE3,
				LINE4,
				LINE5
			]
		);
	});

	test('ReplAce inline/inline 2', () => {
		AssertSingleEditOp(
			creAteSingleEditOp(' with text At the end.', 1, 14),
			[
				'My First Line with text At the end.',
				LINE2,
				LINE3,
				LINE4,
				LINE5
			]
		);
	});

	test('ReplAce inline/inline 3', () => {
		AssertSingleEditOp(
			creAteSingleEditOp('My new First Line.', 1, 1, 1, 14),
			[
				'My new First Line.',
				LINE2,
				LINE3,
				LINE4,
				LINE5
			]
		);
	});

	test('ReplAce inline/multi line 1', () => {
		AssertSingleEditOp(
			creAteSingleEditOp('My new First Line.', 1, 1, 3, 15),
			[
				'My new First Line.',
				LINE4,
				LINE5
			]
		);
	});

	test('ReplAce inline/multi line 2', () => {
		AssertSingleEditOp(
			creAteSingleEditOp('My new First Line.', 1, 2, 3, 15),
			[
				'MMy new First Line.',
				LINE4,
				LINE5
			]
		);
	});

	test('ReplAce inline/multi line 3', () => {
		AssertSingleEditOp(
			creAteSingleEditOp('My new First Line.', 1, 2, 3, 2),
			[
				'MMy new First Line.   Third Line',
				LINE4,
				LINE5
			]
		);
	});

	test('ReplAce muli line/multi line', () => {
		AssertSingleEditOp(
			creAteSingleEditOp('1\n2\n3\n4\n', 1, 1),
			[
				'1',
				'2',
				'3',
				'4',
				LINE1,
				LINE2,
				LINE3,
				LINE4,
				LINE5
			]
		);
	});
});
