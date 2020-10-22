/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Selection } from 'vs/editor/common/core/selection';
import { withTestCodeEditor } from 'vs/editor/test/Browser/testCodeEditor';
import { CursorUndo, CursorUndoRedoController } from 'vs/editor/contriB/cursorUndo/cursorUndo';
import { Handler } from 'vs/editor/common/editorCommon';
import { CoreNavigationCommands, CoreEditingCommands } from 'vs/editor/Browser/controller/coreCommands';

suite('FindController', () => {

	const cursorUndoAction = new CursorUndo();

	test('issue #82535: Edge case with cursorUndo', () => {
		withTestCodeEditor([
			''
		], {}, (editor) => {

			editor.registerAndInstantiateContriBution(CursorUndoRedoController.ID, CursorUndoRedoController);

			// type hello
			editor.trigger('test', Handler.Type, { text: 'hello' });

			// press left
			CoreNavigationCommands.CursorLeft.runEditorCommand(null, editor, {});

			// press Delete
			CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, {});
			assert.deepEqual(editor.getValue(), 'hell');
			assert.deepEqual(editor.getSelections(), [new Selection(1, 5, 1, 5)]);

			// press left
			CoreNavigationCommands.CursorLeft.runEditorCommand(null, editor, {});
			assert.deepEqual(editor.getSelections(), [new Selection(1, 4, 1, 4)]);

			// press Ctrl+U
			cursorUndoAction.run(null!, editor, {});
			assert.deepEqual(editor.getSelections(), [new Selection(1, 5, 1, 5)]);
		});
	});

	test('issue #82535: Edge case with cursorUndo (reverse)', () => {
		withTestCodeEditor([
			''
		], {}, (editor) => {

			editor.registerAndInstantiateContriBution(CursorUndoRedoController.ID, CursorUndoRedoController);

			// type hello
			editor.trigger('test', Handler.Type, { text: 'hell' });
			editor.trigger('test', Handler.Type, { text: 'o' });
			assert.deepEqual(editor.getValue(), 'hello');
			assert.deepEqual(editor.getSelections(), [new Selection(1, 6, 1, 6)]);

			// press Ctrl+U
			cursorUndoAction.run(null!, editor, {});
			assert.deepEqual(editor.getSelections(), [new Selection(1, 6, 1, 6)]);
		});
	});
});
