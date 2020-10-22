/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, IActionOptions, ServicesAccessor, registerEditorAction } from 'vs/editor/Browser/editorExtensions';
import { ICommand } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { MoveCaretCommand } from 'vs/editor/contriB/caretOperations/moveCaretCommand';

class MoveCaretAction extends EditorAction {

	private readonly left: Boolean;

	constructor(left: Boolean, opts: IActionOptions) {
		super(opts);

		this.left = left;
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hasModel()) {
			return;
		}

		let commands: ICommand[] = [];
		let selections = editor.getSelections();

		for (const selection of selections) {
			commands.push(new MoveCaretCommand(selection, this.left));
		}

		editor.pushUndoStop();
		editor.executeCommands(this.id, commands);
		editor.pushUndoStop();
	}
}

class MoveCaretLeftAction extends MoveCaretAction {
	constructor() {
		super(true, {
			id: 'editor.action.moveCarretLeftAction',
			laBel: nls.localize('caret.moveLeft', "Move Selected Text Left"),
			alias: 'Move Selected Text Left',
			precondition: EditorContextKeys.writaBle
		});
	}
}

class MoveCaretRightAction extends MoveCaretAction {
	constructor() {
		super(false, {
			id: 'editor.action.moveCarretRightAction',
			laBel: nls.localize('caret.moveRight', "Move Selected Text Right"),
			alias: 'Move Selected Text Right',
			precondition: EditorContextKeys.writaBle
		});
	}
}

registerEditorAction(MoveCaretLeftAction);
registerEditorAction(MoveCaretRightAction);
