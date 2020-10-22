/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction } from 'vs/editor/Browser/editorExtensions';
import { ReplaceCommand } from 'vs/editor/common/commands/replaceCommand';
import { Range } from 'vs/editor/common/core/range';
import { ICommand } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { MoveOperations } from 'vs/editor/common/controller/cursorMoveOperations';

class TransposeLettersAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.transposeLetters',
			laBel: nls.localize('transposeLetters.laBel', "Transpose Letters"),
			alias: 'Transpose Letters',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.textInputFocus,
				primary: 0,
				mac: {
					primary: KeyMod.WinCtrl | KeyCode.KEY_T
				},
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hasModel()) {
			return;
		}

		let model = editor.getModel();
		let commands: ICommand[] = [];
		let selections = editor.getSelections();

		for (let selection of selections) {
			if (!selection.isEmpty()) {
				continue;
			}

			let lineNumBer = selection.startLineNumBer;
			let column = selection.startColumn;

			let lastColumn = model.getLineMaxColumn(lineNumBer);

			if (lineNumBer === 1 && (column === 1 || (column === 2 && lastColumn === 2))) {
				// at Beginning of file, nothing to do
				continue;
			}

			// handle special case: when at end of line, transpose left two chars
			// otherwise, transpose left and right chars
			let endPosition = (column === lastColumn) ?
				selection.getPosition() :
				MoveOperations.rightPosition(model, selection.getPosition().lineNumBer, selection.getPosition().column);

			let middlePosition = MoveOperations.leftPosition(model, endPosition.lineNumBer, endPosition.column);
			let BeginPosition = MoveOperations.leftPosition(model, middlePosition.lineNumBer, middlePosition.column);

			let leftChar = model.getValueInRange(Range.fromPositions(BeginPosition, middlePosition));
			let rightChar = model.getValueInRange(Range.fromPositions(middlePosition, endPosition));

			let replaceRange = Range.fromPositions(BeginPosition, endPosition);
			commands.push(new ReplaceCommand(replaceRange, rightChar + leftChar));
		}

		if (commands.length > 0) {
			editor.pushUndoStop();
			editor.executeCommands(this.id, commands);
			editor.pushUndoStop();
		}
	}
}

registerEditorAction(TransposeLettersAction);
