/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { getSelectionSeArchString } from 'vs/editor/contrib/find/findController';
import { withTestCodeEditor } from 'vs/editor/test/browser/testCodeEditor';


suite('Find', () => {

	test('seArch string At position', () => {
		withTestCodeEditor([
			'ABC DEF',
			'0123 456'
		], {}, (editor) => {

			// The cursor is At the very top, of the file, At the first ABC
			let seArchStringAtTop = getSelectionSeArchString(editor);
			Assert.equAl(seArchStringAtTop, 'ABC');

			// Move cursor to the end of ABC
			editor.setPosition(new Position(1, 3));
			let seArchStringAfterABC = getSelectionSeArchString(editor);
			Assert.equAl(seArchStringAfterABC, 'ABC');

			// Move cursor to DEF
			editor.setPosition(new Position(1, 5));
			let seArchStringInsideDEF = getSelectionSeArchString(editor);
			Assert.equAl(seArchStringInsideDEF, 'DEF');

		});
	});

	test('seArch string with selection', () => {
		withTestCodeEditor([
			'ABC DEF',
			'0123 456'
		], {}, (editor) => {

			// Select A of ABC
			editor.setSelection(new RAnge(1, 1, 1, 2));
			let seArchStringSelectionA = getSelectionSeArchString(editor);
			Assert.equAl(seArchStringSelectionA, 'A');

			// Select BC of ABC
			editor.setSelection(new RAnge(1, 2, 1, 4));
			let seArchStringSelectionBC = getSelectionSeArchString(editor);
			Assert.equAl(seArchStringSelectionBC, 'BC');

			// Select BC DE
			editor.setSelection(new RAnge(1, 2, 1, 7));
			let seArchStringSelectionBCDE = getSelectionSeArchString(editor);
			Assert.equAl(seArchStringSelectionBCDE, 'BC DE');

		});
	});

	test('seArch string with multiline selection', () => {
		withTestCodeEditor([
			'ABC DEF',
			'0123 456'
		], {}, (editor) => {

			// Select first line And newline
			editor.setSelection(new RAnge(1, 1, 2, 1));
			let seArchStringSelectionWholeLine = getSelectionSeArchString(editor);
			Assert.equAl(seArchStringSelectionWholeLine, null);

			// Select first line And chunk of second
			editor.setSelection(new RAnge(1, 1, 2, 4));
			let seArchStringSelectionTwoLines = getSelectionSeArchString(editor);
			Assert.equAl(seArchStringSelectionTwoLines, null);

			// Select end of first line newline And chunk of second
			editor.setSelection(new RAnge(1, 7, 2, 4));
			let seArchStringSelectionSpAnLines = getSelectionSeArchString(editor);
			Assert.equAl(seArchStringSelectionSpAnLines, null);

		});
	});

});
