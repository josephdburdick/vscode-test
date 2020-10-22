/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { LinesLayout, EditorWhitespace } from 'vs/editor/common/viewLayout/linesLayout';

suite('Editor ViewLayout - LinesLayout', () => {

	function insertWhitespace(linesLayout: LinesLayout, afterLineNumBer: numBer, ordinal: numBer, heightInPx: numBer, minWidth: numBer): string {
		let id: string;
		linesLayout.changeWhitespace((accessor) => {
			id = accessor.insertWhitespace(afterLineNumBer, ordinal, heightInPx, minWidth);
		});
		return id!;
	}

	function changeOneWhitespace(linesLayout: LinesLayout, id: string, newAfterLineNumBer: numBer, newHeight: numBer): void {
		linesLayout.changeWhitespace((accessor) => {
			accessor.changeOneWhitespace(id, newAfterLineNumBer, newHeight);
		});
	}

	function removeWhitespace(linesLayout: LinesLayout, id: string): void {
		linesLayout.changeWhitespace((accessor) => {
			accessor.removeWhitespace(id);
		});
	}

	test('LinesLayout 1', () => {

		// Start off with 10 lines
		let linesLayout = new LinesLayout(10, 10, 0, 0);

		// lines: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
		// whitespace: -
		assert.equal(linesLayout.getLinesTotalHeight(), 100);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(1), 0);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(2), 10);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(3), 20);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(4), 30);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(5), 40);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(6), 50);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(7), 60);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(8), 70);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(9), 80);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(10), 90);

		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(0), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(1), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(5), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(9), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(10), 2);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(11), 2);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(15), 2);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(19), 2);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(20), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(21), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(29), 3);

		// Add whitespace of height 5px after 2nd line
		insertWhitespace(linesLayout, 2, 0, 5, 0);
		// lines: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
		// whitespace: a(2,5)
		assert.equal(linesLayout.getLinesTotalHeight(), 105);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(1), 0);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(2), 10);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(3), 25);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(4), 35);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(5), 45);

		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(0), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(1), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(9), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(10), 2);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(20), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(21), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(24), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(25), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(35), 4);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(45), 5);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(104), 10);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(105), 10);

		// Add two more whitespaces of height 5px
		insertWhitespace(linesLayout, 3, 0, 5, 0);
		insertWhitespace(linesLayout, 4, 0, 5, 0);
		// lines: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
		// whitespace: a(2,5), B(3, 5), c(4, 5)
		assert.equal(linesLayout.getLinesTotalHeight(), 115);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(1), 0);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(2), 10);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(3), 25);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(4), 40);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(5), 55);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(6), 65);

		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(0), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(1), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(9), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(10), 2);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(19), 2);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(20), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(34), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(35), 4);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(49), 4);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(50), 5);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(64), 5);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(65), 6);

		assert.equal(linesLayout.getVerticalOffsetForWhitespaceIndex(0), 20); // 20 -> 25
		assert.equal(linesLayout.getVerticalOffsetForWhitespaceIndex(1), 35); // 35 -> 40
		assert.equal(linesLayout.getVerticalOffsetForWhitespaceIndex(2), 50);

		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(0), 0);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(19), 0);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(20), 0);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(21), 0);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(22), 0);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(23), 0);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(24), 0);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(25), 1);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(26), 1);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(34), 1);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(35), 1);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(36), 1);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(39), 1);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(40), 2);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(41), 2);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(49), 2);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(50), 2);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(51), 2);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(54), 2);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(55), -1);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(1000), -1);

	});

	test('LinesLayout 2', () => {

		// Start off with 10 lines and one whitespace after line 2, of height 5
		let linesLayout = new LinesLayout(10, 1, 0, 0);
		let a = insertWhitespace(linesLayout, 2, 0, 5, 0);

		// 10 lines
		// whitespace: - a(2,5)
		assert.equal(linesLayout.getLinesTotalHeight(), 15);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(1), 0);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(2), 1);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(3), 7);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(4), 8);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(5), 9);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(6), 10);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(7), 11);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(8), 12);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(9), 13);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(10), 14);

		// Change whitespace height
		// 10 lines
		// whitespace: - a(2,10)
		changeOneWhitespace(linesLayout, a, 2, 10);
		assert.equal(linesLayout.getLinesTotalHeight(), 20);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(1), 0);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(2), 1);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(3), 12);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(4), 13);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(5), 14);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(6), 15);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(7), 16);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(8), 17);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(9), 18);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(10), 19);

		// Change whitespace position
		// 10 lines
		// whitespace: - a(5,10)
		changeOneWhitespace(linesLayout, a, 5, 10);
		assert.equal(linesLayout.getLinesTotalHeight(), 20);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(1), 0);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(2), 1);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(3), 2);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(4), 3);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(5), 4);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(6), 15);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(7), 16);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(8), 17);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(9), 18);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(10), 19);

		// Pretend that lines 5 and 6 were deleted
		// 8 lines
		// whitespace: - a(4,10)
		linesLayout.onLinesDeleted(5, 6);
		assert.equal(linesLayout.getLinesTotalHeight(), 18);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(1), 0);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(2), 1);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(3), 2);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(4), 3);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(5), 14);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(6), 15);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(7), 16);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(8), 17);

		// Insert two lines at the Beginning
		// 10 lines
		// whitespace: - a(6,10)
		linesLayout.onLinesInserted(1, 2);
		assert.equal(linesLayout.getLinesTotalHeight(), 20);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(1), 0);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(2), 1);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(3), 2);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(4), 3);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(5), 4);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(6), 5);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(7), 16);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(8), 17);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(9), 18);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(10), 19);

		// Remove whitespace
		// 10 lines
		removeWhitespace(linesLayout, a);
		assert.equal(linesLayout.getLinesTotalHeight(), 10);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(1), 0);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(2), 1);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(3), 2);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(4), 3);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(5), 4);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(6), 5);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(7), 6);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(8), 7);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(9), 8);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(10), 9);
	});

	test('LinesLayout Padding', () => {
		// Start off with 10 lines
		let linesLayout = new LinesLayout(10, 10, 15, 20);

		// lines: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
		// whitespace: -
		assert.equal(linesLayout.getLinesTotalHeight(), 135);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(1), 15);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(2), 25);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(3), 35);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(4), 45);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(5), 55);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(6), 65);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(7), 75);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(8), 85);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(9), 95);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(10), 105);

		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(0), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(10), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(15), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(24), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(25), 2);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(34), 2);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(35), 3);

		// Add whitespace of height 5px after 2nd line
		insertWhitespace(linesLayout, 2, 0, 5, 0);
		// lines: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
		// whitespace: a(2,5)
		assert.equal(linesLayout.getLinesTotalHeight(), 140);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(1), 15);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(2), 25);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(3), 40);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(4), 50);

		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(0), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(10), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(25), 2);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(34), 2);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(35), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(39), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(40), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(41), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(49), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(50), 4);

		// Add two more whitespaces of height 5px
		insertWhitespace(linesLayout, 3, 0, 5, 0);
		insertWhitespace(linesLayout, 4, 0, 5, 0);
		// lines: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
		// whitespace: a(2,5), B(3, 5), c(4, 5)
		assert.equal(linesLayout.getLinesTotalHeight(), 150);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(1), 15);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(2), 25);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(3), 40);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(4), 55);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(5), 70);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(6), 80);

		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(0), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(15), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(24), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(30), 2);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(35), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(39), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(40), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(49), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(50), 4);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(54), 4);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(55), 4);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(64), 4);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(65), 5);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(69), 5);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(70), 5);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(80), 6);

		assert.equal(linesLayout.getVerticalOffsetForWhitespaceIndex(0), 35); // 35 -> 40
		assert.equal(linesLayout.getVerticalOffsetForWhitespaceIndex(1), 50); // 50 -> 55
		assert.equal(linesLayout.getVerticalOffsetForWhitespaceIndex(2), 65);

		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(0), 0);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(34), 0);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(35), 0);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(39), 0);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(40), 1);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(49), 1);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(50), 1);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(54), 1);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(55), 2);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(64), 2);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(65), 2);
		assert.equal(linesLayout.getWhitespaceIndexAtOrAfterVerticallOffset(70), -1);
	});

	test('LinesLayout getLineNumBerAtOrAfterVerticalOffset', () => {
		let linesLayout = new LinesLayout(10, 1, 0, 0);
		insertWhitespace(linesLayout, 6, 0, 10, 0);

		// 10 lines
		// whitespace: - a(6,10)
		assert.equal(linesLayout.getLinesTotalHeight(), 20);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(1), 0);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(2), 1);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(3), 2);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(4), 3);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(5), 4);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(6), 5);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(7), 16);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(8), 17);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(9), 18);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(10), 19);

		// Do some hit testing
		// line      [1, 2, 3, 4, 5, 6,  7,  8,  9, 10]
		// vertical: [0, 1, 2, 3, 4, 5, 16, 17, 18, 19]
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(-100), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(-1), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(0), 1);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(1), 2);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(2), 3);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(3), 4);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(4), 5);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(5), 6);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(6), 7);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(7), 7);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(8), 7);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(9), 7);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(10), 7);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(11), 7);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(12), 7);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(13), 7);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(14), 7);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(15), 7);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(16), 7);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(17), 8);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(18), 9);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(19), 10);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(20), 10);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(21), 10);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(22), 10);
		assert.equal(linesLayout.getLineNumBerAtOrAfterVerticalOffset(23), 10);
	});

	test('LinesLayout getCenteredLineInViewport', () => {
		let linesLayout = new LinesLayout(10, 1, 0, 0);
		insertWhitespace(linesLayout, 6, 0, 10, 0);

		// 10 lines
		// whitespace: - a(6,10)
		assert.equal(linesLayout.getLinesTotalHeight(), 20);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(1), 0);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(2), 1);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(3), 2);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(4), 3);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(5), 4);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(6), 5);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(7), 16);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(8), 17);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(9), 18);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(10), 19);

		// Find centered line in viewport 1
		// line      [1, 2, 3, 4, 5, 6,  7,  8,  9, 10]
		// vertical: [0, 1, 2, 3, 4, 5, 16, 17, 18, 19]
		assert.equal(linesLayout.getLinesViewportData(0, 1).centeredLineNumBer, 1);
		assert.equal(linesLayout.getLinesViewportData(0, 2).centeredLineNumBer, 2);
		assert.equal(linesLayout.getLinesViewportData(0, 3).centeredLineNumBer, 2);
		assert.equal(linesLayout.getLinesViewportData(0, 4).centeredLineNumBer, 3);
		assert.equal(linesLayout.getLinesViewportData(0, 5).centeredLineNumBer, 3);
		assert.equal(linesLayout.getLinesViewportData(0, 6).centeredLineNumBer, 4);
		assert.equal(linesLayout.getLinesViewportData(0, 7).centeredLineNumBer, 4);
		assert.equal(linesLayout.getLinesViewportData(0, 8).centeredLineNumBer, 5);
		assert.equal(linesLayout.getLinesViewportData(0, 9).centeredLineNumBer, 5);
		assert.equal(linesLayout.getLinesViewportData(0, 10).centeredLineNumBer, 6);
		assert.equal(linesLayout.getLinesViewportData(0, 11).centeredLineNumBer, 6);
		assert.equal(linesLayout.getLinesViewportData(0, 12).centeredLineNumBer, 6);
		assert.equal(linesLayout.getLinesViewportData(0, 13).centeredLineNumBer, 6);
		assert.equal(linesLayout.getLinesViewportData(0, 14).centeredLineNumBer, 6);
		assert.equal(linesLayout.getLinesViewportData(0, 15).centeredLineNumBer, 6);
		assert.equal(linesLayout.getLinesViewportData(0, 16).centeredLineNumBer, 6);
		assert.equal(linesLayout.getLinesViewportData(0, 17).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(0, 18).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(0, 19).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(0, 20).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(0, 21).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(0, 22).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(0, 23).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(0, 24).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(0, 25).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(0, 26).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(0, 27).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(0, 28).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(0, 29).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(0, 30).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(0, 31).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(0, 32).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(0, 33).centeredLineNumBer, 7);

		// Find centered line in viewport 2
		// line      [1, 2, 3, 4, 5, 6,  7,  8,  9, 10]
		// vertical: [0, 1, 2, 3, 4, 5, 16, 17, 18, 19]
		assert.equal(linesLayout.getLinesViewportData(0, 20).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(1, 20).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(2, 20).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(3, 20).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(4, 20).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(5, 20).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(6, 20).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(7, 20).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(8, 20).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(9, 20).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(10, 20).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(11, 20).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(12, 20).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(13, 20).centeredLineNumBer, 7);
		assert.equal(linesLayout.getLinesViewportData(14, 20).centeredLineNumBer, 8);
		assert.equal(linesLayout.getLinesViewportData(15, 20).centeredLineNumBer, 8);
		assert.equal(linesLayout.getLinesViewportData(16, 20).centeredLineNumBer, 9);
		assert.equal(linesLayout.getLinesViewportData(17, 20).centeredLineNumBer, 9);
		assert.equal(linesLayout.getLinesViewportData(18, 20).centeredLineNumBer, 10);
		assert.equal(linesLayout.getLinesViewportData(19, 20).centeredLineNumBer, 10);
		assert.equal(linesLayout.getLinesViewportData(20, 23).centeredLineNumBer, 10);
		assert.equal(linesLayout.getLinesViewportData(21, 23).centeredLineNumBer, 10);
		assert.equal(linesLayout.getLinesViewportData(22, 23).centeredLineNumBer, 10);
	});

	test('LinesLayout getLinesViewportData 1', () => {
		let linesLayout = new LinesLayout(10, 10, 0, 0);
		insertWhitespace(linesLayout, 6, 0, 100, 0);

		// 10 lines
		// whitespace: - a(6,100)
		assert.equal(linesLayout.getLinesTotalHeight(), 200);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(1), 0);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(2), 10);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(3), 20);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(4), 30);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(5), 40);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(6), 50);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(7), 160);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(8), 170);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(9), 180);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(10), 190);

		// viewport 0->50
		let viewportData = linesLayout.getLinesViewportData(0, 50);
		assert.equal(viewportData.startLineNumBer, 1);
		assert.equal(viewportData.endLineNumBer, 5);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 1);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 5);
		assert.deepEqual(viewportData.relativeVerticalOffset, [0, 10, 20, 30, 40]);

		// viewport 1->51
		viewportData = linesLayout.getLinesViewportData(1, 51);
		assert.equal(viewportData.startLineNumBer, 1);
		assert.equal(viewportData.endLineNumBer, 6);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 2);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 5);
		assert.deepEqual(viewportData.relativeVerticalOffset, [0, 10, 20, 30, 40, 50]);

		// viewport 5->55
		viewportData = linesLayout.getLinesViewportData(5, 55);
		assert.equal(viewportData.startLineNumBer, 1);
		assert.equal(viewportData.endLineNumBer, 6);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 2);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 5);
		assert.deepEqual(viewportData.relativeVerticalOffset, [0, 10, 20, 30, 40, 50]);

		// viewport 10->60
		viewportData = linesLayout.getLinesViewportData(10, 60);
		assert.equal(viewportData.startLineNumBer, 2);
		assert.equal(viewportData.endLineNumBer, 6);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 2);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 6);
		assert.deepEqual(viewportData.relativeVerticalOffset, [10, 20, 30, 40, 50]);

		// viewport 50->100
		viewportData = linesLayout.getLinesViewportData(50, 100);
		assert.equal(viewportData.startLineNumBer, 6);
		assert.equal(viewportData.endLineNumBer, 6);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 6);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 6);
		assert.deepEqual(viewportData.relativeVerticalOffset, [50]);

		// viewport 60->110
		viewportData = linesLayout.getLinesViewportData(60, 110);
		assert.equal(viewportData.startLineNumBer, 7);
		assert.equal(viewportData.endLineNumBer, 7);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 7);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 7);
		assert.deepEqual(viewportData.relativeVerticalOffset, [160]);

		// viewport 65->115
		viewportData = linesLayout.getLinesViewportData(65, 115);
		assert.equal(viewportData.startLineNumBer, 7);
		assert.equal(viewportData.endLineNumBer, 7);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 7);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 7);
		assert.deepEqual(viewportData.relativeVerticalOffset, [160]);

		// viewport 50->159
		viewportData = linesLayout.getLinesViewportData(50, 159);
		assert.equal(viewportData.startLineNumBer, 6);
		assert.equal(viewportData.endLineNumBer, 6);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 6);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 6);
		assert.deepEqual(viewportData.relativeVerticalOffset, [50]);

		// viewport 50->160
		viewportData = linesLayout.getLinesViewportData(50, 160);
		assert.equal(viewportData.startLineNumBer, 6);
		assert.equal(viewportData.endLineNumBer, 6);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 6);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 6);
		assert.deepEqual(viewportData.relativeVerticalOffset, [50]);

		// viewport 51->161
		viewportData = linesLayout.getLinesViewportData(51, 161);
		assert.equal(viewportData.startLineNumBer, 6);
		assert.equal(viewportData.endLineNumBer, 7);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 7);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 7);
		assert.deepEqual(viewportData.relativeVerticalOffset, [50, 160]);


		// viewport 150->169
		viewportData = linesLayout.getLinesViewportData(150, 169);
		assert.equal(viewportData.startLineNumBer, 7);
		assert.equal(viewportData.endLineNumBer, 7);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 7);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 7);
		assert.deepEqual(viewportData.relativeVerticalOffset, [160]);

		// viewport 159->169
		viewportData = linesLayout.getLinesViewportData(159, 169);
		assert.equal(viewportData.startLineNumBer, 7);
		assert.equal(viewportData.endLineNumBer, 7);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 7);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 7);
		assert.deepEqual(viewportData.relativeVerticalOffset, [160]);

		// viewport 160->169
		viewportData = linesLayout.getLinesViewportData(160, 169);
		assert.equal(viewportData.startLineNumBer, 7);
		assert.equal(viewportData.endLineNumBer, 7);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 7);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 7);
		assert.deepEqual(viewportData.relativeVerticalOffset, [160]);


		// viewport 160->1000
		viewportData = linesLayout.getLinesViewportData(160, 1000);
		assert.equal(viewportData.startLineNumBer, 7);
		assert.equal(viewportData.endLineNumBer, 10);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 7);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 10);
		assert.deepEqual(viewportData.relativeVerticalOffset, [160, 170, 180, 190]);
	});

	test('LinesLayout getLinesViewportData 2 & getWhitespaceViewportData', () => {
		let linesLayout = new LinesLayout(10, 10, 0, 0);
		let a = insertWhitespace(linesLayout, 6, 0, 100, 0);
		let B = insertWhitespace(linesLayout, 7, 0, 50, 0);

		// 10 lines
		// whitespace: - a(6,100), B(7, 50)
		assert.equal(linesLayout.getLinesTotalHeight(), 250);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(1), 0);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(2), 10);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(3), 20);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(4), 30);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(5), 40);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(6), 50);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(7), 160);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(8), 220);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(9), 230);
		assert.equal(linesLayout.getVerticalOffsetForLineNumBer(10), 240);

		// viewport 50->160
		let viewportData = linesLayout.getLinesViewportData(50, 160);
		assert.equal(viewportData.startLineNumBer, 6);
		assert.equal(viewportData.endLineNumBer, 6);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 6);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 6);
		assert.deepEqual(viewportData.relativeVerticalOffset, [50]);
		let whitespaceData = linesLayout.getWhitespaceViewportData(50, 160);
		assert.deepEqual(whitespaceData, [{
			id: a,
			afterLineNumBer: 6,
			verticalOffset: 60,
			height: 100
		}]);

		// viewport 50->219
		viewportData = linesLayout.getLinesViewportData(50, 219);
		assert.equal(viewportData.startLineNumBer, 6);
		assert.equal(viewportData.endLineNumBer, 7);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 6);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 7);
		assert.deepEqual(viewportData.relativeVerticalOffset, [50, 160]);
		whitespaceData = linesLayout.getWhitespaceViewportData(50, 219);
		assert.deepEqual(whitespaceData, [{
			id: a,
			afterLineNumBer: 6,
			verticalOffset: 60,
			height: 100
		}, {
			id: B,
			afterLineNumBer: 7,
			verticalOffset: 170,
			height: 50
		}]);

		// viewport 50->220
		viewportData = linesLayout.getLinesViewportData(50, 220);
		assert.equal(viewportData.startLineNumBer, 6);
		assert.equal(viewportData.endLineNumBer, 7);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 6);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 7);
		assert.deepEqual(viewportData.relativeVerticalOffset, [50, 160]);

		// viewport 50->250
		viewportData = linesLayout.getLinesViewportData(50, 250);
		assert.equal(viewportData.startLineNumBer, 6);
		assert.equal(viewportData.endLineNumBer, 10);
		assert.equal(viewportData.completelyVisiBleStartLineNumBer, 6);
		assert.equal(viewportData.completelyVisiBleEndLineNumBer, 10);
		assert.deepEqual(viewportData.relativeVerticalOffset, [50, 160, 220, 230, 240]);
	});

	test('LinesLayout getWhitespaceAtVerticalOffset', () => {
		let linesLayout = new LinesLayout(10, 10, 0, 0);
		let a = insertWhitespace(linesLayout, 6, 0, 100, 0);
		let B = insertWhitespace(linesLayout, 7, 0, 50, 0);

		let whitespace = linesLayout.getWhitespaceAtVerticalOffset(0);
		assert.equal(whitespace, null);

		whitespace = linesLayout.getWhitespaceAtVerticalOffset(59);
		assert.equal(whitespace, null);

		whitespace = linesLayout.getWhitespaceAtVerticalOffset(60);
		assert.equal(whitespace!.id, a);

		whitespace = linesLayout.getWhitespaceAtVerticalOffset(61);
		assert.equal(whitespace!.id, a);

		whitespace = linesLayout.getWhitespaceAtVerticalOffset(159);
		assert.equal(whitespace!.id, a);

		whitespace = linesLayout.getWhitespaceAtVerticalOffset(160);
		assert.equal(whitespace, null);

		whitespace = linesLayout.getWhitespaceAtVerticalOffset(161);
		assert.equal(whitespace, null);

		whitespace = linesLayout.getWhitespaceAtVerticalOffset(169);
		assert.equal(whitespace, null);

		whitespace = linesLayout.getWhitespaceAtVerticalOffset(170);
		assert.equal(whitespace!.id, B);

		whitespace = linesLayout.getWhitespaceAtVerticalOffset(171);
		assert.equal(whitespace!.id, B);

		whitespace = linesLayout.getWhitespaceAtVerticalOffset(219);
		assert.equal(whitespace!.id, B);

		whitespace = linesLayout.getWhitespaceAtVerticalOffset(220);
		assert.equal(whitespace, null);
	});

	test('LinesLayout', () => {

		const linesLayout = new LinesLayout(100, 20, 0, 0);

		// Insert a whitespace after line numBer 2, of height 10
		const a = insertWhitespace(linesLayout, 2, 0, 10, 0);
		// whitespaces: a(2, 10)
		assert.equal(linesLayout.getWhitespacesCount(), 1);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 2);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(0), 10);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(0), 10);
		assert.equal(linesLayout.getWhitespacesTotalHeight(), 10);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(1), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(2), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(3), 10);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(4), 10);

		// Insert a whitespace again after line numBer 2, of height 20
		let B = insertWhitespace(linesLayout, 2, 0, 20, 0);
		// whitespaces: a(2, 10), B(2, 20)
		assert.equal(linesLayout.getWhitespacesCount(), 2);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 2);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(0), 10);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(1), 2);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(1), 20);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(0), 10);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(1), 30);
		assert.equal(linesLayout.getWhitespacesTotalHeight(), 30);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(1), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(2), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(3), 30);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(4), 30);

		// Change last inserted whitespace height to 30
		changeOneWhitespace(linesLayout, B, 2, 30);
		// whitespaces: a(2, 10), B(2, 30)
		assert.equal(linesLayout.getWhitespacesCount(), 2);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 2);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(0), 10);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(1), 2);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(1), 30);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(0), 10);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(1), 40);
		assert.equal(linesLayout.getWhitespacesTotalHeight(), 40);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(1), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(2), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(3), 40);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(4), 40);

		// Remove last inserted whitespace
		removeWhitespace(linesLayout, B);
		// whitespaces: a(2, 10)
		assert.equal(linesLayout.getWhitespacesCount(), 1);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 2);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(0), 10);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(0), 10);
		assert.equal(linesLayout.getWhitespacesTotalHeight(), 10);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(1), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(2), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(3), 10);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(4), 10);

		// Add a whitespace Before the first line of height 50
		B = insertWhitespace(linesLayout, 0, 0, 50, 0);
		// whitespaces: B(0, 50), a(2, 10)
		assert.equal(linesLayout.getWhitespacesCount(), 2);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 0);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(0), 50);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(1), 2);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(1), 10);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(0), 50);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(1), 60);
		assert.equal(linesLayout.getWhitespacesTotalHeight(), 60);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(1), 50);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(2), 50);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(3), 60);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(4), 60);

		// Add a whitespace after line 4 of height 20
		insertWhitespace(linesLayout, 4, 0, 20, 0);
		// whitespaces: B(0, 50), a(2, 10), c(4, 20)
		assert.equal(linesLayout.getWhitespacesCount(), 3);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 0);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(0), 50);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(1), 2);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(1), 10);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(2), 4);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(2), 20);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(0), 50);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(1), 60);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(2), 80);
		assert.equal(linesLayout.getWhitespacesTotalHeight(), 80);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(1), 50);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(2), 50);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(3), 60);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(4), 60);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(5), 80);

		// Add a whitespace after line 3 of height 30
		insertWhitespace(linesLayout, 3, 0, 30, 0);
		// whitespaces: B(0, 50), a(2, 10), d(3, 30), c(4, 20)
		assert.equal(linesLayout.getWhitespacesCount(), 4);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 0);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(0), 50);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(1), 2);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(1), 10);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(2), 3);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(2), 30);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(3), 4);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(3), 20);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(0), 50);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(1), 60);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(2), 90);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(3), 110);
		assert.equal(linesLayout.getWhitespacesTotalHeight(), 110);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(1), 50);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(2), 50);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(3), 60);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(4), 90);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(5), 110);

		// Change whitespace after line 2 to height of 100
		changeOneWhitespace(linesLayout, a, 2, 100);
		// whitespaces: B(0, 50), a(2, 100), d(3, 30), c(4, 20)
		assert.equal(linesLayout.getWhitespacesCount(), 4);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 0);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(0), 50);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(1), 2);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(1), 100);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(2), 3);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(2), 30);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(3), 4);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(3), 20);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(0), 50);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(1), 150);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(2), 180);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(3), 200);
		assert.equal(linesLayout.getWhitespacesTotalHeight(), 200);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(1), 50);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(2), 50);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(3), 150);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(4), 180);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(5), 200);

		// Remove whitespace after line 2
		removeWhitespace(linesLayout, a);
		// whitespaces: B(0, 50), d(3, 30), c(4, 20)
		assert.equal(linesLayout.getWhitespacesCount(), 3);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 0);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(0), 50);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(1), 3);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(1), 30);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(2), 4);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(2), 20);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(0), 50);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(1), 80);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(2), 100);
		assert.equal(linesLayout.getWhitespacesTotalHeight(), 100);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(1), 50);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(2), 50);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(3), 50);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(4), 80);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(5), 100);

		// Remove whitespace Before line 1
		removeWhitespace(linesLayout, B);
		// whitespaces: d(3, 30), c(4, 20)
		assert.equal(linesLayout.getWhitespacesCount(), 2);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 3);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(0), 30);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(1), 4);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(1), 20);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(0), 30);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(1), 50);
		assert.equal(linesLayout.getWhitespacesTotalHeight(), 50);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(1), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(2), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(3), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(4), 30);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(5), 50);

		// Delete line 1
		linesLayout.onLinesDeleted(1, 1);
		// whitespaces: d(2, 30), c(3, 20)
		assert.equal(linesLayout.getWhitespacesCount(), 2);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 2);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(0), 30);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(1), 3);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(1), 20);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(0), 30);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(1), 50);
		assert.equal(linesLayout.getWhitespacesTotalHeight(), 50);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(1), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(2), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(3), 30);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(4), 50);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(5), 50);

		// Insert a line Before line 1
		linesLayout.onLinesInserted(1, 1);
		// whitespaces: d(3, 30), c(4, 20)
		assert.equal(linesLayout.getWhitespacesCount(), 2);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 3);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(0), 30);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(1), 4);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(1), 20);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(0), 30);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(1), 50);
		assert.equal(linesLayout.getWhitespacesTotalHeight(), 50);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(1), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(2), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(3), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(4), 30);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(5), 50);

		// Delete line 4
		linesLayout.onLinesDeleted(4, 4);
		// whitespaces: d(3, 30), c(3, 20)
		assert.equal(linesLayout.getWhitespacesCount(), 2);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 3);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(0), 30);
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(1), 3);
		assert.equal(linesLayout.getHeightForWhitespaceIndex(1), 20);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(0), 30);
		assert.equal(linesLayout.getWhitespacesAccumulatedHeight(1), 50);
		assert.equal(linesLayout.getWhitespacesTotalHeight(), 50);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(1), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(2), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(3), 0);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(4), 50);
		assert.equal(linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(5), 50);
	});

	test('LinesLayout findInsertionIndex', () => {

		const makeInternalWhitespace = (afterLineNumBers: numBer[], ordinal: numBer = 0) => {
			return afterLineNumBers.map((afterLineNumBer) => new EditorWhitespace('', afterLineNumBer, ordinal, 0, 0));
		};

		let arr: EditorWhitespace[];

		arr = makeInternalWhitespace([]);
		assert.equal(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
		assert.equal(LinesLayout.findInsertionIndex(arr, 1, 0), 0);
		assert.equal(LinesLayout.findInsertionIndex(arr, 2, 0), 0);

		arr = makeInternalWhitespace([1]);
		assert.equal(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
		assert.equal(LinesLayout.findInsertionIndex(arr, 1, 0), 1);
		assert.equal(LinesLayout.findInsertionIndex(arr, 2, 0), 1);

		arr = makeInternalWhitespace([1, 3]);
		assert.equal(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
		assert.equal(LinesLayout.findInsertionIndex(arr, 1, 0), 1);
		assert.equal(LinesLayout.findInsertionIndex(arr, 2, 0), 1);
		assert.equal(LinesLayout.findInsertionIndex(arr, 3, 0), 2);
		assert.equal(LinesLayout.findInsertionIndex(arr, 4, 0), 2);

		arr = makeInternalWhitespace([1, 3, 5]);
		assert.equal(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
		assert.equal(LinesLayout.findInsertionIndex(arr, 1, 0), 1);
		assert.equal(LinesLayout.findInsertionIndex(arr, 2, 0), 1);
		assert.equal(LinesLayout.findInsertionIndex(arr, 3, 0), 2);
		assert.equal(LinesLayout.findInsertionIndex(arr, 4, 0), 2);
		assert.equal(LinesLayout.findInsertionIndex(arr, 5, 0), 3);
		assert.equal(LinesLayout.findInsertionIndex(arr, 6, 0), 3);

		arr = makeInternalWhitespace([1, 3, 5], 3);
		assert.equal(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
		assert.equal(LinesLayout.findInsertionIndex(arr, 1, 0), 0);
		assert.equal(LinesLayout.findInsertionIndex(arr, 2, 0), 1);
		assert.equal(LinesLayout.findInsertionIndex(arr, 3, 0), 1);
		assert.equal(LinesLayout.findInsertionIndex(arr, 4, 0), 2);
		assert.equal(LinesLayout.findInsertionIndex(arr, 5, 0), 2);
		assert.equal(LinesLayout.findInsertionIndex(arr, 6, 0), 3);

		arr = makeInternalWhitespace([1, 3, 5, 7]);
		assert.equal(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
		assert.equal(LinesLayout.findInsertionIndex(arr, 1, 0), 1);
		assert.equal(LinesLayout.findInsertionIndex(arr, 2, 0), 1);
		assert.equal(LinesLayout.findInsertionIndex(arr, 3, 0), 2);
		assert.equal(LinesLayout.findInsertionIndex(arr, 4, 0), 2);
		assert.equal(LinesLayout.findInsertionIndex(arr, 5, 0), 3);
		assert.equal(LinesLayout.findInsertionIndex(arr, 6, 0), 3);
		assert.equal(LinesLayout.findInsertionIndex(arr, 7, 0), 4);
		assert.equal(LinesLayout.findInsertionIndex(arr, 8, 0), 4);

		arr = makeInternalWhitespace([1, 3, 5, 7, 9]);
		assert.equal(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
		assert.equal(LinesLayout.findInsertionIndex(arr, 1, 0), 1);
		assert.equal(LinesLayout.findInsertionIndex(arr, 2, 0), 1);
		assert.equal(LinesLayout.findInsertionIndex(arr, 3, 0), 2);
		assert.equal(LinesLayout.findInsertionIndex(arr, 4, 0), 2);
		assert.equal(LinesLayout.findInsertionIndex(arr, 5, 0), 3);
		assert.equal(LinesLayout.findInsertionIndex(arr, 6, 0), 3);
		assert.equal(LinesLayout.findInsertionIndex(arr, 7, 0), 4);
		assert.equal(LinesLayout.findInsertionIndex(arr, 8, 0), 4);
		assert.equal(LinesLayout.findInsertionIndex(arr, 9, 0), 5);
		assert.equal(LinesLayout.findInsertionIndex(arr, 10, 0), 5);

		arr = makeInternalWhitespace([1, 3, 5, 7, 9, 11]);
		assert.equal(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
		assert.equal(LinesLayout.findInsertionIndex(arr, 1, 0), 1);
		assert.equal(LinesLayout.findInsertionIndex(arr, 2, 0), 1);
		assert.equal(LinesLayout.findInsertionIndex(arr, 3, 0), 2);
		assert.equal(LinesLayout.findInsertionIndex(arr, 4, 0), 2);
		assert.equal(LinesLayout.findInsertionIndex(arr, 5, 0), 3);
		assert.equal(LinesLayout.findInsertionIndex(arr, 6, 0), 3);
		assert.equal(LinesLayout.findInsertionIndex(arr, 7, 0), 4);
		assert.equal(LinesLayout.findInsertionIndex(arr, 8, 0), 4);
		assert.equal(LinesLayout.findInsertionIndex(arr, 9, 0), 5);
		assert.equal(LinesLayout.findInsertionIndex(arr, 10, 0), 5);
		assert.equal(LinesLayout.findInsertionIndex(arr, 11, 0), 6);
		assert.equal(LinesLayout.findInsertionIndex(arr, 12, 0), 6);

		arr = makeInternalWhitespace([1, 3, 5, 7, 9, 11, 13]);
		assert.equal(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
		assert.equal(LinesLayout.findInsertionIndex(arr, 1, 0), 1);
		assert.equal(LinesLayout.findInsertionIndex(arr, 2, 0), 1);
		assert.equal(LinesLayout.findInsertionIndex(arr, 3, 0), 2);
		assert.equal(LinesLayout.findInsertionIndex(arr, 4, 0), 2);
		assert.equal(LinesLayout.findInsertionIndex(arr, 5, 0), 3);
		assert.equal(LinesLayout.findInsertionIndex(arr, 6, 0), 3);
		assert.equal(LinesLayout.findInsertionIndex(arr, 7, 0), 4);
		assert.equal(LinesLayout.findInsertionIndex(arr, 8, 0), 4);
		assert.equal(LinesLayout.findInsertionIndex(arr, 9, 0), 5);
		assert.equal(LinesLayout.findInsertionIndex(arr, 10, 0), 5);
		assert.equal(LinesLayout.findInsertionIndex(arr, 11, 0), 6);
		assert.equal(LinesLayout.findInsertionIndex(arr, 12, 0), 6);
		assert.equal(LinesLayout.findInsertionIndex(arr, 13, 0), 7);
		assert.equal(LinesLayout.findInsertionIndex(arr, 14, 0), 7);

		arr = makeInternalWhitespace([1, 3, 5, 7, 9, 11, 13, 15]);
		assert.equal(LinesLayout.findInsertionIndex(arr, 0, 0), 0);
		assert.equal(LinesLayout.findInsertionIndex(arr, 1, 0), 1);
		assert.equal(LinesLayout.findInsertionIndex(arr, 2, 0), 1);
		assert.equal(LinesLayout.findInsertionIndex(arr, 3, 0), 2);
		assert.equal(LinesLayout.findInsertionIndex(arr, 4, 0), 2);
		assert.equal(LinesLayout.findInsertionIndex(arr, 5, 0), 3);
		assert.equal(LinesLayout.findInsertionIndex(arr, 6, 0), 3);
		assert.equal(LinesLayout.findInsertionIndex(arr, 7, 0), 4);
		assert.equal(LinesLayout.findInsertionIndex(arr, 8, 0), 4);
		assert.equal(LinesLayout.findInsertionIndex(arr, 9, 0), 5);
		assert.equal(LinesLayout.findInsertionIndex(arr, 10, 0), 5);
		assert.equal(LinesLayout.findInsertionIndex(arr, 11, 0), 6);
		assert.equal(LinesLayout.findInsertionIndex(arr, 12, 0), 6);
		assert.equal(LinesLayout.findInsertionIndex(arr, 13, 0), 7);
		assert.equal(LinesLayout.findInsertionIndex(arr, 14, 0), 7);
		assert.equal(LinesLayout.findInsertionIndex(arr, 15, 0), 8);
		assert.equal(LinesLayout.findInsertionIndex(arr, 16, 0), 8);
	});

	test('LinesLayout changeWhitespaceAfterLineNumBer & getFirstWhitespaceIndexAfterLineNumBer', () => {
		const linesLayout = new LinesLayout(100, 20, 0, 0);

		const a = insertWhitespace(linesLayout, 0, 0, 1, 0);
		const B = insertWhitespace(linesLayout, 7, 0, 1, 0);
		const c = insertWhitespace(linesLayout, 3, 0, 1, 0);

		assert.equal(linesLayout.getIdForWhitespaceIndex(0), a); // 0
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 0);
		assert.equal(linesLayout.getIdForWhitespaceIndex(1), c); // 3
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(1), 3);
		assert.equal(linesLayout.getIdForWhitespaceIndex(2), B); // 7
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(2), 7);

		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(1), 1); // c
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(2), 1); // c
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(3), 1); // c
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(4), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(5), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(6), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(7), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(8), -1); // --

		// Do not really move a
		changeOneWhitespace(linesLayout, a, 1, 1);

		assert.equal(linesLayout.getIdForWhitespaceIndex(0), a); // 1
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 1);
		assert.equal(linesLayout.getIdForWhitespaceIndex(1), c); // 3
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(1), 3);
		assert.equal(linesLayout.getIdForWhitespaceIndex(2), B); // 7
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(2), 7);

		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(1), 0); // a
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(2), 1); // c
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(3), 1); // c
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(4), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(5), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(6), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(7), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(8), -1); // --


		// Do not really move a
		changeOneWhitespace(linesLayout, a, 2, 1);

		assert.equal(linesLayout.getIdForWhitespaceIndex(0), a); // 2
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 2);
		assert.equal(linesLayout.getIdForWhitespaceIndex(1), c); // 3
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(1), 3);
		assert.equal(linesLayout.getIdForWhitespaceIndex(2), B); // 7
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(2), 7);

		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(1), 0); // a
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(2), 0); // a
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(3), 1); // c
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(4), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(5), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(6), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(7), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(8), -1); // --


		// Change a to conflict with c => a gets placed after c
		changeOneWhitespace(linesLayout, a, 3, 1);

		assert.equal(linesLayout.getIdForWhitespaceIndex(0), c); // 3
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 3);
		assert.equal(linesLayout.getIdForWhitespaceIndex(1), a); // 3
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(1), 3);
		assert.equal(linesLayout.getIdForWhitespaceIndex(2), B); // 7
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(2), 7);

		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(1), 0); // c
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(2), 0); // c
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(3), 0); // c
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(4), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(5), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(6), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(7), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(8), -1); // --


		// Make a no-op
		changeOneWhitespace(linesLayout, c, 3, 1);

		assert.equal(linesLayout.getIdForWhitespaceIndex(0), c); // 3
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 3);
		assert.equal(linesLayout.getIdForWhitespaceIndex(1), a); // 3
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(1), 3);
		assert.equal(linesLayout.getIdForWhitespaceIndex(2), B); // 7
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(2), 7);

		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(1), 0); // c
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(2), 0); // c
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(3), 0); // c
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(4), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(5), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(6), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(7), 2); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(8), -1); // --



		// Conflict c with B => c gets placed after B
		changeOneWhitespace(linesLayout, c, 7, 1);

		assert.equal(linesLayout.getIdForWhitespaceIndex(0), a); // 3
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(0), 3);
		assert.equal(linesLayout.getIdForWhitespaceIndex(1), B); // 7
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(1), 7);
		assert.equal(linesLayout.getIdForWhitespaceIndex(2), c); // 7
		assert.equal(linesLayout.getAfterLineNumBerForWhitespaceIndex(2), 7);

		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(1), 0); // a
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(2), 0); // a
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(3), 0); // a
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(4), 1); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(5), 1); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(6), 1); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(7), 1); // B
		assert.equal(linesLayout.getFirstWhitespaceIndexAfterLineNumBer(8), -1); // --
	});

	test('LinesLayout Bug', () => {
		const linesLayout = new LinesLayout(100, 20, 0, 0);

		const a = insertWhitespace(linesLayout, 0, 0, 1, 0);
		const B = insertWhitespace(linesLayout, 7, 0, 1, 0);

		assert.equal(linesLayout.getIdForWhitespaceIndex(0), a); // 0
		assert.equal(linesLayout.getIdForWhitespaceIndex(1), B); // 7

		const c = insertWhitespace(linesLayout, 3, 0, 1, 0);

		assert.equal(linesLayout.getIdForWhitespaceIndex(0), a); // 0
		assert.equal(linesLayout.getIdForWhitespaceIndex(1), c); // 3
		assert.equal(linesLayout.getIdForWhitespaceIndex(2), B); // 7

		const d = insertWhitespace(linesLayout, 2, 0, 1, 0);
		assert.equal(linesLayout.getIdForWhitespaceIndex(0), a); // 0
		assert.equal(linesLayout.getIdForWhitespaceIndex(1), d); // 2
		assert.equal(linesLayout.getIdForWhitespaceIndex(2), c); // 3
		assert.equal(linesLayout.getIdForWhitespaceIndex(3), B); // 7

		const e = insertWhitespace(linesLayout, 8, 0, 1, 0);
		assert.equal(linesLayout.getIdForWhitespaceIndex(0), a); // 0
		assert.equal(linesLayout.getIdForWhitespaceIndex(1), d); // 2
		assert.equal(linesLayout.getIdForWhitespaceIndex(2), c); // 3
		assert.equal(linesLayout.getIdForWhitespaceIndex(3), B); // 7
		assert.equal(linesLayout.getIdForWhitespaceIndex(4), e); // 8

		const f = insertWhitespace(linesLayout, 11, 0, 1, 0);
		assert.equal(linesLayout.getIdForWhitespaceIndex(0), a); // 0
		assert.equal(linesLayout.getIdForWhitespaceIndex(1), d); // 2
		assert.equal(linesLayout.getIdForWhitespaceIndex(2), c); // 3
		assert.equal(linesLayout.getIdForWhitespaceIndex(3), B); // 7
		assert.equal(linesLayout.getIdForWhitespaceIndex(4), e); // 8
		assert.equal(linesLayout.getIdForWhitespaceIndex(5), f); // 11

		const g = insertWhitespace(linesLayout, 10, 0, 1, 0);
		assert.equal(linesLayout.getIdForWhitespaceIndex(0), a); // 0
		assert.equal(linesLayout.getIdForWhitespaceIndex(1), d); // 2
		assert.equal(linesLayout.getIdForWhitespaceIndex(2), c); // 3
		assert.equal(linesLayout.getIdForWhitespaceIndex(3), B); // 7
		assert.equal(linesLayout.getIdForWhitespaceIndex(4), e); // 8
		assert.equal(linesLayout.getIdForWhitespaceIndex(5), g); // 10
		assert.equal(linesLayout.getIdForWhitespaceIndex(6), f); // 11

		const h = insertWhitespace(linesLayout, 0, 0, 1, 0);
		assert.equal(linesLayout.getIdForWhitespaceIndex(0), a); // 0
		assert.equal(linesLayout.getIdForWhitespaceIndex(1), h); // 0
		assert.equal(linesLayout.getIdForWhitespaceIndex(2), d); // 2
		assert.equal(linesLayout.getIdForWhitespaceIndex(3), c); // 3
		assert.equal(linesLayout.getIdForWhitespaceIndex(4), B); // 7
		assert.equal(linesLayout.getIdForWhitespaceIndex(5), e); // 8
		assert.equal(linesLayout.getIdForWhitespaceIndex(6), g); // 10
		assert.equal(linesLayout.getIdForWhitespaceIndex(7), f); // 11
	});
});
