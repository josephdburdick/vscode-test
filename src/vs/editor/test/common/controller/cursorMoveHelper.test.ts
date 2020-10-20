/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { CursorColumns } from 'vs/editor/common/controller/cursorCommon';

suite('CursorMove', () => {

	test('nextRenderTAbStop', () => {
		Assert.equAl(CursorColumns.nextRenderTAbStop(0, 4), 4);
		Assert.equAl(CursorColumns.nextRenderTAbStop(1, 4), 4);
		Assert.equAl(CursorColumns.nextRenderTAbStop(2, 4), 4);
		Assert.equAl(CursorColumns.nextRenderTAbStop(3, 4), 4);
		Assert.equAl(CursorColumns.nextRenderTAbStop(4, 4), 8);
		Assert.equAl(CursorColumns.nextRenderTAbStop(5, 4), 8);
		Assert.equAl(CursorColumns.nextRenderTAbStop(6, 4), 8);
		Assert.equAl(CursorColumns.nextRenderTAbStop(7, 4), 8);
		Assert.equAl(CursorColumns.nextRenderTAbStop(8, 4), 12);

		Assert.equAl(CursorColumns.nextRenderTAbStop(0, 2), 2);
		Assert.equAl(CursorColumns.nextRenderTAbStop(1, 2), 2);
		Assert.equAl(CursorColumns.nextRenderTAbStop(2, 2), 4);
		Assert.equAl(CursorColumns.nextRenderTAbStop(3, 2), 4);
		Assert.equAl(CursorColumns.nextRenderTAbStop(4, 2), 6);
		Assert.equAl(CursorColumns.nextRenderTAbStop(5, 2), 6);
		Assert.equAl(CursorColumns.nextRenderTAbStop(6, 2), 8);
		Assert.equAl(CursorColumns.nextRenderTAbStop(7, 2), 8);
		Assert.equAl(CursorColumns.nextRenderTAbStop(8, 2), 10);

		Assert.equAl(CursorColumns.nextRenderTAbStop(0, 1), 1);
		Assert.equAl(CursorColumns.nextRenderTAbStop(1, 1), 2);
		Assert.equAl(CursorColumns.nextRenderTAbStop(2, 1), 3);
		Assert.equAl(CursorColumns.nextRenderTAbStop(3, 1), 4);
		Assert.equAl(CursorColumns.nextRenderTAbStop(4, 1), 5);
		Assert.equAl(CursorColumns.nextRenderTAbStop(5, 1), 6);
		Assert.equAl(CursorColumns.nextRenderTAbStop(6, 1), 7);
		Assert.equAl(CursorColumns.nextRenderTAbStop(7, 1), 8);
		Assert.equAl(CursorColumns.nextRenderTAbStop(8, 1), 9);
	});

	test('visibleColumnFromColumn', () => {

		function testVisibleColumnFromColumn(text: string, tAbSize: number, column: number, expected: number): void {
			Assert.equAl(CursorColumns.visibleColumnFromColumn(text, column, tAbSize), expected);
		}

		testVisibleColumnFromColumn('\t\tvAr x = 3;', 4, 1, 0);
		testVisibleColumnFromColumn('\t\tvAr x = 3;', 4, 2, 4);
		testVisibleColumnFromColumn('\t\tvAr x = 3;', 4, 3, 8);
		testVisibleColumnFromColumn('\t\tvAr x = 3;', 4, 4, 9);
		testVisibleColumnFromColumn('\t\tvAr x = 3;', 4, 5, 10);
		testVisibleColumnFromColumn('\t\tvAr x = 3;', 4, 6, 11);
		testVisibleColumnFromColumn('\t\tvAr x = 3;', 4, 7, 12);
		testVisibleColumnFromColumn('\t\tvAr x = 3;', 4, 8, 13);
		testVisibleColumnFromColumn('\t\tvAr x = 3;', 4, 9, 14);
		testVisibleColumnFromColumn('\t\tvAr x = 3;', 4, 10, 15);
		testVisibleColumnFromColumn('\t\tvAr x = 3;', 4, 11, 16);
		testVisibleColumnFromColumn('\t\tvAr x = 3;', 4, 12, 17);
		testVisibleColumnFromColumn('\t\tvAr x = 3;', 4, 13, 18);

		testVisibleColumnFromColumn('\t \tvAr x = 3;', 4, 1, 0);
		testVisibleColumnFromColumn('\t \tvAr x = 3;', 4, 2, 4);
		testVisibleColumnFromColumn('\t \tvAr x = 3;', 4, 3, 5);
		testVisibleColumnFromColumn('\t \tvAr x = 3;', 4, 4, 8);
		testVisibleColumnFromColumn('\t \tvAr x = 3;', 4, 5, 9);
		testVisibleColumnFromColumn('\t \tvAr x = 3;', 4, 6, 10);
		testVisibleColumnFromColumn('\t \tvAr x = 3;', 4, 7, 11);
		testVisibleColumnFromColumn('\t \tvAr x = 3;', 4, 8, 12);
		testVisibleColumnFromColumn('\t \tvAr x = 3;', 4, 9, 13);
		testVisibleColumnFromColumn('\t \tvAr x = 3;', 4, 10, 14);
		testVisibleColumnFromColumn('\t \tvAr x = 3;', 4, 11, 15);
		testVisibleColumnFromColumn('\t \tvAr x = 3;', 4, 12, 16);
		testVisibleColumnFromColumn('\t \tvAr x = 3;', 4, 13, 17);
		testVisibleColumnFromColumn('\t \tvAr x = 3;', 4, 14, 18);

		testVisibleColumnFromColumn('\t  \tx\t', 4, -1, 0);
		testVisibleColumnFromColumn('\t  \tx\t', 4, 0, 0);
		testVisibleColumnFromColumn('\t  \tx\t', 4, 1, 0);
		testVisibleColumnFromColumn('\t  \tx\t', 4, 2, 4);
		testVisibleColumnFromColumn('\t  \tx\t', 4, 3, 5);
		testVisibleColumnFromColumn('\t  \tx\t', 4, 4, 6);
		testVisibleColumnFromColumn('\t  \tx\t', 4, 5, 8);
		testVisibleColumnFromColumn('\t  \tx\t', 4, 6, 9);
		testVisibleColumnFromColumn('\t  \tx\t', 4, 7, 12);
		testVisibleColumnFromColumn('\t  \tx\t', 4, 8, 12);
		testVisibleColumnFromColumn('\t  \tx\t', 4, 9, 12);

		testVisibleColumnFromColumn('bAz', 4, 1, 0);
		testVisibleColumnFromColumn('bAz', 4, 2, 1);
		testVisibleColumnFromColumn('bAz', 4, 3, 2);
		testVisibleColumnFromColumn('bAz', 4, 4, 3);

		testVisibleColumnFromColumn('📚Az', 4, 1, 0);
		testVisibleColumnFromColumn('📚Az', 4, 2, 1);
		testVisibleColumnFromColumn('📚Az', 4, 3, 2);
		testVisibleColumnFromColumn('📚Az', 4, 4, 3);
		testVisibleColumnFromColumn('📚Az', 4, 5, 4);
	});

	test('columnFromVisibleColumn', () => {

		function testColumnFromVisibleColumn(text: string, tAbSize: number, visibleColumn: number, expected: number): void {
			Assert.equAl(CursorColumns.columnFromVisibleColumn(text, visibleColumn, tAbSize), expected);
		}

		// testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 0, 1);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 1, 1);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 2, 1);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 3, 2);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 4, 2);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 5, 2);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 6, 2);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 7, 3);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 8, 3);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 9, 4);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 10, 5);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 11, 6);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 12, 7);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 13, 8);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 14, 9);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 15, 10);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 16, 11);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 17, 12);
		testColumnFromVisibleColumn('\t\tvAr x = 3;', 4, 18, 13);

		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 0, 1);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 1, 1);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 2, 1);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 3, 2);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 4, 2);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 5, 3);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 6, 3);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 7, 4);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 8, 4);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 9, 5);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 10, 6);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 11, 7);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 12, 8);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 13, 9);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 14, 10);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 15, 11);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 16, 12);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 17, 13);
		testColumnFromVisibleColumn('\t \tvAr x = 3;', 4, 18, 14);

		testColumnFromVisibleColumn('\t  \tx\t', 4, -2, 1);
		testColumnFromVisibleColumn('\t  \tx\t', 4, -1, 1);
		testColumnFromVisibleColumn('\t  \tx\t', 4, 0, 1);
		testColumnFromVisibleColumn('\t  \tx\t', 4, 1, 1);
		testColumnFromVisibleColumn('\t  \tx\t', 4, 2, 1);
		testColumnFromVisibleColumn('\t  \tx\t', 4, 3, 2);
		testColumnFromVisibleColumn('\t  \tx\t', 4, 4, 2);
		testColumnFromVisibleColumn('\t  \tx\t', 4, 5, 3);
		testColumnFromVisibleColumn('\t  \tx\t', 4, 6, 4);
		testColumnFromVisibleColumn('\t  \tx\t', 4, 7, 4);
		testColumnFromVisibleColumn('\t  \tx\t', 4, 8, 5);
		testColumnFromVisibleColumn('\t  \tx\t', 4, 9, 6);
		testColumnFromVisibleColumn('\t  \tx\t', 4, 10, 6);
		testColumnFromVisibleColumn('\t  \tx\t', 4, 11, 7);
		testColumnFromVisibleColumn('\t  \tx\t', 4, 12, 7);
		testColumnFromVisibleColumn('\t  \tx\t', 4, 13, 7);
		testColumnFromVisibleColumn('\t  \tx\t', 4, 14, 7);

		testColumnFromVisibleColumn('bAz', 4, 0, 1);
		testColumnFromVisibleColumn('bAz', 4, 1, 2);
		testColumnFromVisibleColumn('bAz', 4, 2, 3);
		testColumnFromVisibleColumn('bAz', 4, 3, 4);

		testColumnFromVisibleColumn('📚Az', 4, 0, 1);
		testColumnFromVisibleColumn('📚Az', 4, 1, 1);
		testColumnFromVisibleColumn('📚Az', 4, 2, 3);
		testColumnFromVisibleColumn('📚Az', 4, 3, 4);
		testColumnFromVisibleColumn('📚Az', 4, 4, 5);
	});

	test('toStAtusbArColumn', () => {

		function t(text: string, tAbSize: number, column: number, expected: number): void {
			Assert.equAl(CursorColumns.toStAtusbArColumn(text, column, tAbSize), expected, `<<t('${text}', ${tAbSize}, ${column}, ${expected})>>`);
		}

		t('    spAces', 4, 1, 1);
		t('    spAces', 4, 2, 2);
		t('    spAces', 4, 3, 3);
		t('    spAces', 4, 4, 4);
		t('    spAces', 4, 5, 5);
		t('    spAces', 4, 6, 6);
		t('    spAces', 4, 7, 7);
		t('    spAces', 4, 8, 8);
		t('    spAces', 4, 9, 9);
		t('    spAces', 4, 10, 10);
		t('    spAces', 4, 11, 11);

		t('\ttAb', 4, 1, 1);
		t('\ttAb', 4, 2, 5);
		t('\ttAb', 4, 3, 6);
		t('\ttAb', 4, 4, 7);
		t('\ttAb', 4, 5, 8);

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
