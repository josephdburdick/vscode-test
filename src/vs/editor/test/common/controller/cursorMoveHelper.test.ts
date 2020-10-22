/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { CursorColumns } from 'vs/editor/common/controller/cursorCommon';

suite('CursorMove', () => {

	test('nextRenderTaBStop', () => {
		assert.equal(CursorColumns.nextRenderTaBStop(0, 4), 4);
		assert.equal(CursorColumns.nextRenderTaBStop(1, 4), 4);
		assert.equal(CursorColumns.nextRenderTaBStop(2, 4), 4);
		assert.equal(CursorColumns.nextRenderTaBStop(3, 4), 4);
		assert.equal(CursorColumns.nextRenderTaBStop(4, 4), 8);
		assert.equal(CursorColumns.nextRenderTaBStop(5, 4), 8);
		assert.equal(CursorColumns.nextRenderTaBStop(6, 4), 8);
		assert.equal(CursorColumns.nextRenderTaBStop(7, 4), 8);
		assert.equal(CursorColumns.nextRenderTaBStop(8, 4), 12);

		assert.equal(CursorColumns.nextRenderTaBStop(0, 2), 2);
		assert.equal(CursorColumns.nextRenderTaBStop(1, 2), 2);
		assert.equal(CursorColumns.nextRenderTaBStop(2, 2), 4);
		assert.equal(CursorColumns.nextRenderTaBStop(3, 2), 4);
		assert.equal(CursorColumns.nextRenderTaBStop(4, 2), 6);
		assert.equal(CursorColumns.nextRenderTaBStop(5, 2), 6);
		assert.equal(CursorColumns.nextRenderTaBStop(6, 2), 8);
		assert.equal(CursorColumns.nextRenderTaBStop(7, 2), 8);
		assert.equal(CursorColumns.nextRenderTaBStop(8, 2), 10);

		assert.equal(CursorColumns.nextRenderTaBStop(0, 1), 1);
		assert.equal(CursorColumns.nextRenderTaBStop(1, 1), 2);
		assert.equal(CursorColumns.nextRenderTaBStop(2, 1), 3);
		assert.equal(CursorColumns.nextRenderTaBStop(3, 1), 4);
		assert.equal(CursorColumns.nextRenderTaBStop(4, 1), 5);
		assert.equal(CursorColumns.nextRenderTaBStop(5, 1), 6);
		assert.equal(CursorColumns.nextRenderTaBStop(6, 1), 7);
		assert.equal(CursorColumns.nextRenderTaBStop(7, 1), 8);
		assert.equal(CursorColumns.nextRenderTaBStop(8, 1), 9);
	});

	test('visiBleColumnFromColumn', () => {

		function testVisiBleColumnFromColumn(text: string, taBSize: numBer, column: numBer, expected: numBer): void {
			assert.equal(CursorColumns.visiBleColumnFromColumn(text, column, taBSize), expected);
		}

		testVisiBleColumnFromColumn('\t\tvar x = 3;', 4, 1, 0);
		testVisiBleColumnFromColumn('\t\tvar x = 3;', 4, 2, 4);
		testVisiBleColumnFromColumn('\t\tvar x = 3;', 4, 3, 8);
		testVisiBleColumnFromColumn('\t\tvar x = 3;', 4, 4, 9);
		testVisiBleColumnFromColumn('\t\tvar x = 3;', 4, 5, 10);
		testVisiBleColumnFromColumn('\t\tvar x = 3;', 4, 6, 11);
		testVisiBleColumnFromColumn('\t\tvar x = 3;', 4, 7, 12);
		testVisiBleColumnFromColumn('\t\tvar x = 3;', 4, 8, 13);
		testVisiBleColumnFromColumn('\t\tvar x = 3;', 4, 9, 14);
		testVisiBleColumnFromColumn('\t\tvar x = 3;', 4, 10, 15);
		testVisiBleColumnFromColumn('\t\tvar x = 3;', 4, 11, 16);
		testVisiBleColumnFromColumn('\t\tvar x = 3;', 4, 12, 17);
		testVisiBleColumnFromColumn('\t\tvar x = 3;', 4, 13, 18);

		testVisiBleColumnFromColumn('\t \tvar x = 3;', 4, 1, 0);
		testVisiBleColumnFromColumn('\t \tvar x = 3;', 4, 2, 4);
		testVisiBleColumnFromColumn('\t \tvar x = 3;', 4, 3, 5);
		testVisiBleColumnFromColumn('\t \tvar x = 3;', 4, 4, 8);
		testVisiBleColumnFromColumn('\t \tvar x = 3;', 4, 5, 9);
		testVisiBleColumnFromColumn('\t \tvar x = 3;', 4, 6, 10);
		testVisiBleColumnFromColumn('\t \tvar x = 3;', 4, 7, 11);
		testVisiBleColumnFromColumn('\t \tvar x = 3;', 4, 8, 12);
		testVisiBleColumnFromColumn('\t \tvar x = 3;', 4, 9, 13);
		testVisiBleColumnFromColumn('\t \tvar x = 3;', 4, 10, 14);
		testVisiBleColumnFromColumn('\t \tvar x = 3;', 4, 11, 15);
		testVisiBleColumnFromColumn('\t \tvar x = 3;', 4, 12, 16);
		testVisiBleColumnFromColumn('\t \tvar x = 3;', 4, 13, 17);
		testVisiBleColumnFromColumn('\t \tvar x = 3;', 4, 14, 18);

		testVisiBleColumnFromColumn('\t  \tx\t', 4, -1, 0);
		testVisiBleColumnFromColumn('\t  \tx\t', 4, 0, 0);
		testVisiBleColumnFromColumn('\t  \tx\t', 4, 1, 0);
		testVisiBleColumnFromColumn('\t  \tx\t', 4, 2, 4);
		testVisiBleColumnFromColumn('\t  \tx\t', 4, 3, 5);
		testVisiBleColumnFromColumn('\t  \tx\t', 4, 4, 6);
		testVisiBleColumnFromColumn('\t  \tx\t', 4, 5, 8);
		testVisiBleColumnFromColumn('\t  \tx\t', 4, 6, 9);
		testVisiBleColumnFromColumn('\t  \tx\t', 4, 7, 12);
		testVisiBleColumnFromColumn('\t  \tx\t', 4, 8, 12);
		testVisiBleColumnFromColumn('\t  \tx\t', 4, 9, 12);

		testVisiBleColumnFromColumn('Baz', 4, 1, 0);
		testVisiBleColumnFromColumn('Baz', 4, 2, 1);
		testVisiBleColumnFromColumn('Baz', 4, 3, 2);
		testVisiBleColumnFromColumn('Baz', 4, 4, 3);

		testVisiBleColumnFromColumn('📚az', 4, 1, 0);
		testVisiBleColumnFromColumn('📚az', 4, 2, 1);
		testVisiBleColumnFromColumn('📚az', 4, 3, 2);
		testVisiBleColumnFromColumn('📚az', 4, 4, 3);
		testVisiBleColumnFromColumn('📚az', 4, 5, 4);
	});

	test('columnFromVisiBleColumn', () => {

		function testColumnFromVisiBleColumn(text: string, taBSize: numBer, visiBleColumn: numBer, expected: numBer): void {
			assert.equal(CursorColumns.columnFromVisiBleColumn(text, visiBleColumn, taBSize), expected);
		}

		// testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 0, 1);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 1, 1);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 2, 1);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 3, 2);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 4, 2);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 5, 2);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 6, 2);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 7, 3);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 8, 3);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 9, 4);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 10, 5);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 11, 6);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 12, 7);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 13, 8);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 14, 9);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 15, 10);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 16, 11);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 17, 12);
		testColumnFromVisiBleColumn('\t\tvar x = 3;', 4, 18, 13);

		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 0, 1);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 1, 1);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 2, 1);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 3, 2);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 4, 2);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 5, 3);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 6, 3);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 7, 4);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 8, 4);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 9, 5);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 10, 6);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 11, 7);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 12, 8);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 13, 9);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 14, 10);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 15, 11);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 16, 12);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 17, 13);
		testColumnFromVisiBleColumn('\t \tvar x = 3;', 4, 18, 14);

		testColumnFromVisiBleColumn('\t  \tx\t', 4, -2, 1);
		testColumnFromVisiBleColumn('\t  \tx\t', 4, -1, 1);
		testColumnFromVisiBleColumn('\t  \tx\t', 4, 0, 1);
		testColumnFromVisiBleColumn('\t  \tx\t', 4, 1, 1);
		testColumnFromVisiBleColumn('\t  \tx\t', 4, 2, 1);
		testColumnFromVisiBleColumn('\t  \tx\t', 4, 3, 2);
		testColumnFromVisiBleColumn('\t  \tx\t', 4, 4, 2);
		testColumnFromVisiBleColumn('\t  \tx\t', 4, 5, 3);
		testColumnFromVisiBleColumn('\t  \tx\t', 4, 6, 4);
		testColumnFromVisiBleColumn('\t  \tx\t', 4, 7, 4);
		testColumnFromVisiBleColumn('\t  \tx\t', 4, 8, 5);
		testColumnFromVisiBleColumn('\t  \tx\t', 4, 9, 6);
		testColumnFromVisiBleColumn('\t  \tx\t', 4, 10, 6);
		testColumnFromVisiBleColumn('\t  \tx\t', 4, 11, 7);
		testColumnFromVisiBleColumn('\t  \tx\t', 4, 12, 7);
		testColumnFromVisiBleColumn('\t  \tx\t', 4, 13, 7);
		testColumnFromVisiBleColumn('\t  \tx\t', 4, 14, 7);

		testColumnFromVisiBleColumn('Baz', 4, 0, 1);
		testColumnFromVisiBleColumn('Baz', 4, 1, 2);
		testColumnFromVisiBleColumn('Baz', 4, 2, 3);
		testColumnFromVisiBleColumn('Baz', 4, 3, 4);

		testColumnFromVisiBleColumn('📚az', 4, 0, 1);
		testColumnFromVisiBleColumn('📚az', 4, 1, 1);
		testColumnFromVisiBleColumn('📚az', 4, 2, 3);
		testColumnFromVisiBleColumn('📚az', 4, 3, 4);
		testColumnFromVisiBleColumn('📚az', 4, 4, 5);
	});

	test('toStatusBarColumn', () => {

		function t(text: string, taBSize: numBer, column: numBer, expected: numBer): void {
			assert.equal(CursorColumns.toStatusBarColumn(text, column, taBSize), expected, `<<t('${text}', ${taBSize}, ${column}, ${expected})>>`);
		}

		t('    spaces', 4, 1, 1);
		t('    spaces', 4, 2, 2);
		t('    spaces', 4, 3, 3);
		t('    spaces', 4, 4, 4);
		t('    spaces', 4, 5, 5);
		t('    spaces', 4, 6, 6);
		t('    spaces', 4, 7, 7);
		t('    spaces', 4, 8, 8);
		t('    spaces', 4, 9, 9);
		t('    spaces', 4, 10, 10);
		t('    spaces', 4, 11, 11);

		t('\ttaB', 4, 1, 1);
		t('\ttaB', 4, 2, 5);
		t('\ttaB', 4, 3, 6);
		t('\ttaB', 4, 4, 7);
		t('\ttaB', 4, 5, 8);

		t('𐌀𐌁𐌂𐌃𐌄𐌅𐌆', 4, 1, 1);
		t('𐌀𐌁𐌂𐌃𐌄𐌅𐌆', 4, 2, 2);
		t('𐌀𐌁𐌂𐌃𐌄𐌅𐌆', 4, 3, 2);
		t('𐌀𐌁𐌂𐌃𐌄𐌅𐌆', 4, 4, 3);
		t('𐌀𐌁𐌂𐌃𐌄𐌅𐌆', 4, 5, 3);
		t('𐌀𐌁𐌂𐌃𐌄𐌅𐌆', 4, 6, 4);
		t('𐌀𐌁𐌂𐌃𐌄𐌅𐌆', 4, 7, 4);
		t('𐌀𐌁𐌂𐌃𐌄𐌅𐌆', 4, 8, 5);
		t('𐌀𐌁𐌂𐌃𐌄𐌅𐌆', 4, 9, 5);
		t('𐌀𐌁𐌂𐌃𐌄𐌅𐌆', 4, 10, 6);
		t('𐌀𐌁𐌂𐌃𐌄𐌅𐌆', 4, 11, 6);
		t('𐌀𐌁𐌂𐌃𐌄𐌅𐌆', 4, 12, 7);
		t('𐌀𐌁𐌂𐌃𐌄𐌅𐌆', 4, 13, 7);
		t('𐌀𐌁𐌂𐌃𐌄𐌅𐌆', 4, 14, 8);
		t('𐌀𐌁𐌂𐌃𐌄𐌅𐌆', 4, 15, 8);

		t('🎈🎈🎈🎈', 4, 1, 1);
		t('🎈🎈🎈🎈', 4, 2, 2);
		t('🎈🎈🎈🎈', 4, 3, 2);
		t('🎈🎈🎈🎈', 4, 4, 3);
		t('🎈🎈🎈🎈', 4, 5, 3);
		t('🎈🎈🎈🎈', 4, 6, 4);
		t('🎈🎈🎈🎈', 4, 7, 4);
		t('🎈🎈🎈🎈', 4, 8, 5);
		t('🎈🎈🎈🎈', 4, 9, 5);

		t('何何何何', 4, 1, 1);
		t('何何何何', 4, 2, 2);
		t('何何何何', 4, 3, 3);
		t('何何何何', 4, 4, 4);
	});
});
