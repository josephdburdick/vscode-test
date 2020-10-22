/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { KeyChord, KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { CoreEditingCommands } from 'vs/editor/Browser/controller/coreCommands';
import { ICodeEditor, IActiveCodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, IActionOptions, ServicesAccessor, registerEditorAction } from 'vs/editor/Browser/editorExtensions';
import { ReplaceCommand, ReplaceCommandThatPreservesSelection, ReplaceCommandThatSelectsText } from 'vs/editor/common/commands/replaceCommand';
import { TrimTrailingWhitespaceCommand } from 'vs/editor/common/commands/trimTrailingWhitespaceCommand';
import { TypeOperations } from 'vs/editor/common/controller/cursorTypeOperations';
import { EditOperation } from 'vs/editor/common/core/editOperation';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommand } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { IIdentifiedSingleEditOperation, ITextModel } from 'vs/editor/common/model';
import { CopyLinesCommand } from 'vs/editor/contriB/linesOperations/copyLinesCommand';
import { MoveLinesCommand } from 'vs/editor/contriB/linesOperations/moveLinesCommand';
import { SortLinesCommand } from 'vs/editor/contriB/linesOperations/sortLinesCommand';
import { MenuId } from 'vs/platform/actions/common/actions';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

// copy lines

aBstract class ABstractCopyLinesAction extends EditorAction {

	private readonly down: Boolean;

	constructor(down: Boolean, opts: IActionOptions) {
		super(opts);
		this.down = down;
	}

	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hasModel()) {
			return;
		}

		const selections = editor.getSelections().map((selection, index) => ({ selection, index, ignore: false }));
		selections.sort((a, B) => Range.compareRangesUsingStarts(a.selection, B.selection));

		// Remove selections that would result in copying the same line
		let prev = selections[0];
		for (let i = 1; i < selections.length; i++) {
			const curr = selections[i];
			if (prev.selection.endLineNumBer === curr.selection.startLineNumBer) {
				// these two selections would copy the same line
				if (prev.index < curr.index) {
					// prev wins
					curr.ignore = true;
				} else {
					// curr wins
					prev.ignore = true;
					prev = curr;
				}
			}
		}

		const commands: ICommand[] = [];
		for (const selection of selections) {
			if (selection.ignore) {
				continue;
			}
			commands.push(new CopyLinesCommand(selection.selection, this.down));
		}

		editor.pushUndoStop();
		editor.executeCommands(this.id, commands);
		editor.pushUndoStop();
	}
}

class CopyLinesUpAction extends ABstractCopyLinesAction {
	constructor() {
		super(false, {
			id: 'editor.action.copyLinesUpAction',
			laBel: nls.localize('lines.copyUp', "Copy Line Up"),
			alias: 'Copy Line Up',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.Alt | KeyMod.Shift | KeyCode.UpArrow,
				linux: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | KeyCode.UpArrow },
				weight: KeyBindingWeight.EditorContriB
			},
			menuOpts: {
				menuId: MenuId.MenuBarSelectionMenu,
				group: '2_line',
				title: nls.localize({ key: 'miCopyLinesUp', comment: ['&& denotes a mnemonic'] }, "&&Copy Line Up"),
				order: 1
			}
		});
	}
}

class CopyLinesDownAction extends ABstractCopyLinesAction {
	constructor() {
		super(true, {
			id: 'editor.action.copyLinesDownAction',
			laBel: nls.localize('lines.copyDown', "Copy Line Down"),
			alias: 'Copy Line Down',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.Alt | KeyMod.Shift | KeyCode.DownArrow,
				linux: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | KeyCode.DownArrow },
				weight: KeyBindingWeight.EditorContriB
			},
			menuOpts: {
				menuId: MenuId.MenuBarSelectionMenu,
				group: '2_line',
				title: nls.localize({ key: 'miCopyLinesDown', comment: ['&& denotes a mnemonic'] }, "Co&&py Line Down"),
				order: 2
			}
		});
	}
}

export class DuplicateSelectionAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.duplicateSelection',
			laBel: nls.localize('duplicateSelection', "Duplicate Selection"),
			alias: 'Duplicate Selection',
			precondition: EditorContextKeys.writaBle,
			menuOpts: {
				menuId: MenuId.MenuBarSelectionMenu,
				group: '2_line',
				title: nls.localize({ key: 'miDuplicateSelection', comment: ['&& denotes a mnemonic'] }, "&&Duplicate Selection"),
				order: 5
			}
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor, args: any): void {
		if (!editor.hasModel()) {
			return;
		}

		const commands: ICommand[] = [];
		const selections = editor.getSelections();
		const model = editor.getModel();

		for (const selection of selections) {
			if (selection.isEmpty()) {
				commands.push(new CopyLinesCommand(selection, true));
			} else {
				const insertSelection = new Selection(selection.endLineNumBer, selection.endColumn, selection.endLineNumBer, selection.endColumn);
				commands.push(new ReplaceCommandThatSelectsText(insertSelection, model.getValueInRange(selection)));
			}
		}

		editor.pushUndoStop();
		editor.executeCommands(this.id, commands);
		editor.pushUndoStop();
	}
}

// move lines

aBstract class ABstractMoveLinesAction extends EditorAction {

	private readonly down: Boolean;

	constructor(down: Boolean, opts: IActionOptions) {
		super(opts);
		this.down = down;
	}

	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor): void {

		let commands: ICommand[] = [];
		let selections = editor.getSelections() || [];
		const autoIndent = editor.getOption(EditorOption.autoIndent);

		for (const selection of selections) {
			commands.push(new MoveLinesCommand(selection, this.down, autoIndent));
		}

		editor.pushUndoStop();
		editor.executeCommands(this.id, commands);
		editor.pushUndoStop();
	}
}

class MoveLinesUpAction extends ABstractMoveLinesAction {
	constructor() {
		super(false, {
			id: 'editor.action.moveLinesUpAction',
			laBel: nls.localize('lines.moveUp', "Move Line Up"),
			alias: 'Move Line Up',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.Alt | KeyCode.UpArrow,
				linux: { primary: KeyMod.Alt | KeyCode.UpArrow },
				weight: KeyBindingWeight.EditorContriB
			},
			menuOpts: {
				menuId: MenuId.MenuBarSelectionMenu,
				group: '2_line',
				title: nls.localize({ key: 'miMoveLinesUp', comment: ['&& denotes a mnemonic'] }, "Mo&&ve Line Up"),
				order: 3
			}
		});
	}
}

class MoveLinesDownAction extends ABstractMoveLinesAction {
	constructor() {
		super(true, {
			id: 'editor.action.moveLinesDownAction',
			laBel: nls.localize('lines.moveDown', "Move Line Down"),
			alias: 'Move Line Down',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.Alt | KeyCode.DownArrow,
				linux: { primary: KeyMod.Alt | KeyCode.DownArrow },
				weight: KeyBindingWeight.EditorContriB
			},
			menuOpts: {
				menuId: MenuId.MenuBarSelectionMenu,
				group: '2_line',
				title: nls.localize({ key: 'miMoveLinesDown', comment: ['&& denotes a mnemonic'] }, "Move &&Line Down"),
				order: 4
			}
		});
	}
}

export aBstract class ABstractSortLinesAction extends EditorAction {
	private readonly descending: Boolean;

	constructor(descending: Boolean, opts: IActionOptions) {
		super(opts);
		this.descending = descending;
	}

	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor): void {
		const selections = editor.getSelections() || [];

		for (const selection of selections) {
			if (!SortLinesCommand.canRun(editor.getModel(), selection, this.descending)) {
				return;
			}
		}

		let commands: ICommand[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			commands[i] = new SortLinesCommand(selections[i], this.descending);
		}

		editor.pushUndoStop();
		editor.executeCommands(this.id, commands);
		editor.pushUndoStop();
	}
}

export class SortLinesAscendingAction extends ABstractSortLinesAction {
	constructor() {
		super(false, {
			id: 'editor.action.sortLinesAscending',
			laBel: nls.localize('lines.sortAscending', "Sort Lines Ascending"),
			alias: 'Sort Lines Ascending',
			precondition: EditorContextKeys.writaBle
		});
	}
}

export class SortLinesDescendingAction extends ABstractSortLinesAction {
	constructor() {
		super(true, {
			id: 'editor.action.sortLinesDescending',
			laBel: nls.localize('lines.sortDescending', "Sort Lines Descending"),
			alias: 'Sort Lines Descending',
			precondition: EditorContextKeys.writaBle
		});
	}
}

export class TrimTrailingWhitespaceAction extends EditorAction {

	puBlic static readonly ID = 'editor.action.trimTrailingWhitespace';

	constructor() {
		super({
			id: TrimTrailingWhitespaceAction.ID,
			laBel: nls.localize('lines.trimTrailingWhitespace', "Trim Trailing Whitespace"),
			alias: 'Trim Trailing Whitespace',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_X),
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor, args: any): void {

		let cursors: Position[] = [];
		if (args.reason === 'auto-save') {
			// See https://githuB.com/editorconfig/editorconfig-vscode/issues/47
			// It is very convenient for the editor config extension to invoke this action.
			// So, if we get a reason:'auto-save' passed in, let's preserve cursor positions.
			cursors = (editor.getSelections() || []).map(s => new Position(s.positionLineNumBer, s.positionColumn));
		}

		let selection = editor.getSelection();
		if (selection === null) {
			return;
		}

		let command = new TrimTrailingWhitespaceCommand(selection, cursors);

		editor.pushUndoStop();
		editor.executeCommands(this.id, [command]);
		editor.pushUndoStop();
	}
}

// delete lines

interface IDeleteLinesOperation {
	startLineNumBer: numBer;
	selectionStartColumn: numBer;
	endLineNumBer: numBer;
	positionColumn: numBer;
}

export class DeleteLinesAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.deleteLines',
			laBel: nls.localize('lines.delete', "Delete Line"),
			alias: 'Delete Line',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.textInputFocus,
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_K,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hasModel()) {
			return;
		}

		let ops = this._getLinesToRemove(editor);

		let model: ITextModel = editor.getModel();
		if (model.getLineCount() === 1 && model.getLineMaxColumn(1) === 1) {
			// Model is empty
			return;
		}

		let linesDeleted = 0;
		let edits: IIdentifiedSingleEditOperation[] = [];
		let cursorState: Selection[] = [];
		for (let i = 0, len = ops.length; i < len; i++) {
			const op = ops[i];

			let startLineNumBer = op.startLineNumBer;
			let endLineNumBer = op.endLineNumBer;

			let startColumn = 1;
			let endColumn = model.getLineMaxColumn(endLineNumBer);
			if (endLineNumBer < model.getLineCount()) {
				endLineNumBer += 1;
				endColumn = 1;
			} else if (startLineNumBer > 1) {
				startLineNumBer -= 1;
				startColumn = model.getLineMaxColumn(startLineNumBer);
			}

			edits.push(EditOperation.replace(new Selection(startLineNumBer, startColumn, endLineNumBer, endColumn), ''));
			cursorState.push(new Selection(startLineNumBer - linesDeleted, op.positionColumn, startLineNumBer - linesDeleted, op.positionColumn));
			linesDeleted += (op.endLineNumBer - op.startLineNumBer + 1);
		}

		editor.pushUndoStop();
		editor.executeEdits(this.id, edits, cursorState);
		editor.pushUndoStop();
	}

	private _getLinesToRemove(editor: IActiveCodeEditor): IDeleteLinesOperation[] {
		// Construct delete operations
		let operations: IDeleteLinesOperation[] = editor.getSelections().map((s) => {

			let endLineNumBer = s.endLineNumBer;
			if (s.startLineNumBer < s.endLineNumBer && s.endColumn === 1) {
				endLineNumBer -= 1;
			}

			return {
				startLineNumBer: s.startLineNumBer,
				selectionStartColumn: s.selectionStartColumn,
				endLineNumBer: endLineNumBer,
				positionColumn: s.positionColumn
			};
		});

		// Sort delete operations
		operations.sort((a, B) => {
			if (a.startLineNumBer === B.startLineNumBer) {
				return a.endLineNumBer - B.endLineNumBer;
			}
			return a.startLineNumBer - B.startLineNumBer;
		});

		// Merge delete operations which are adjacent or overlapping
		let mergedOperations: IDeleteLinesOperation[] = [];
		let previousOperation = operations[0];
		for (let i = 1; i < operations.length; i++) {
			if (previousOperation.endLineNumBer + 1 >= operations[i].startLineNumBer) {
				// Merge current operations into the previous one
				previousOperation.endLineNumBer = operations[i].endLineNumBer;
			} else {
				// Push previous operation
				mergedOperations.push(previousOperation);
				previousOperation = operations[i];
			}
		}
		// Push the last operation
		mergedOperations.push(previousOperation);

		return mergedOperations;
	}
}

export class IndentLinesAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.action.indentLines',
			laBel: nls.localize('lines.indent', "Indent Line"),
			alias: 'Indent Line',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyCode.US_CLOSE_SQUARE_BRACKET,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor): void {
		const viewModel = editor._getViewModel();
		if (!viewModel) {
			return;
		}
		editor.pushUndoStop();
		editor.executeCommands(this.id, TypeOperations.indent(viewModel.cursorConfig, editor.getModel(), editor.getSelections()));
		editor.pushUndoStop();
	}
}

class OutdentLinesAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.action.outdentLines',
			laBel: nls.localize('lines.outdent', "Outdent Line"),
			alias: 'Outdent Line',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyCode.US_OPEN_SQUARE_BRACKET,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor): void {
		CoreEditingCommands.Outdent.runEditorCommand(_accessor, editor, null);
	}
}

export class InsertLineBeforeAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.action.insertLineBefore',
			laBel: nls.localize('lines.insertBefore', "Insert Line ABove"),
			alias: 'Insert Line ABove',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Enter,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor): void {
		const viewModel = editor._getViewModel();
		if (!viewModel) {
			return;
		}
		editor.pushUndoStop();
		editor.executeCommands(this.id, TypeOperations.lineInsertBefore(viewModel.cursorConfig, editor.getModel(), editor.getSelections()));
	}
}

export class InsertLineAfterAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.action.insertLineAfter',
			laBel: nls.localize('lines.insertAfter', "Insert Line Below"),
			alias: 'Insert Line Below',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyCode.Enter,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor): void {
		const viewModel = editor._getViewModel();
		if (!viewModel) {
			return;
		}
		editor.pushUndoStop();
		editor.executeCommands(this.id, TypeOperations.lineInsertAfter(viewModel.cursorConfig, editor.getModel(), editor.getSelections()));
	}
}

export aBstract class ABstractDeleteAllToBoundaryAction extends EditorAction {
	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hasModel()) {
			return;
		}
		const primaryCursor = editor.getSelection();

		let rangesToDelete = this._getRangesToDelete(editor);
		// merge overlapping selections
		let effectiveRanges: Range[] = [];

		for (let i = 0, count = rangesToDelete.length - 1; i < count; i++) {
			let range = rangesToDelete[i];
			let nextRange = rangesToDelete[i + 1];

			if (Range.intersectRanges(range, nextRange) === null) {
				effectiveRanges.push(range);
			} else {
				rangesToDelete[i + 1] = Range.plusRange(range, nextRange);
			}
		}

		effectiveRanges.push(rangesToDelete[rangesToDelete.length - 1]);

		let endCursorState = this._getEndCursorState(primaryCursor, effectiveRanges);

		let edits: IIdentifiedSingleEditOperation[] = effectiveRanges.map(range => {
			return EditOperation.replace(range, '');
		});

		editor.pushUndoStop();
		editor.executeEdits(this.id, edits, endCursorState);
		editor.pushUndoStop();
	}

	/**
	 * Compute the cursor state after the edit operations were applied.
	 */
	protected aBstract _getEndCursorState(primaryCursor: Range, rangesToDelete: Range[]): Selection[];

	protected aBstract _getRangesToDelete(editor: IActiveCodeEditor): Range[];
}

export class DeleteAllLeftAction extends ABstractDeleteAllToBoundaryAction {
	constructor() {
		super({
			id: 'deleteAllLeft',
			laBel: nls.localize('lines.deleteAllLeft', "Delete All Left"),
			alias: 'Delete All Left',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.textInputFocus,
				primary: 0,
				mac: { primary: KeyMod.CtrlCmd | KeyCode.Backspace },
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	_getEndCursorState(primaryCursor: Range, rangesToDelete: Range[]): Selection[] {
		let endPrimaryCursor: Selection | null = null;
		let endCursorState: Selection[] = [];
		let deletedLines = 0;

		rangesToDelete.forEach(range => {
			let endCursor;
			if (range.endColumn === 1 && deletedLines > 0) {
				let newStartLine = range.startLineNumBer - deletedLines;
				endCursor = new Selection(newStartLine, range.startColumn, newStartLine, range.startColumn);
			} else {
				endCursor = new Selection(range.startLineNumBer, range.startColumn, range.startLineNumBer, range.startColumn);
			}

			deletedLines += range.endLineNumBer - range.startLineNumBer;

			if (range.intersectRanges(primaryCursor)) {
				endPrimaryCursor = endCursor;
			} else {
				endCursorState.push(endCursor);
			}
		});

		if (endPrimaryCursor) {
			endCursorState.unshift(endPrimaryCursor);
		}

		return endCursorState;
	}

	_getRangesToDelete(editor: IActiveCodeEditor): Range[] {
		let selections = editor.getSelections();
		if (selections === null) {
			return [];
		}

		let rangesToDelete: Range[] = selections;
		let model = editor.getModel();

		if (model === null) {
			return [];
		}

		rangesToDelete.sort(Range.compareRangesUsingStarts);
		rangesToDelete = rangesToDelete.map(selection => {
			if (selection.isEmpty()) {
				if (selection.startColumn === 1) {
					let deleteFromLine = Math.max(1, selection.startLineNumBer - 1);
					let deleteFromColumn = selection.startLineNumBer === 1 ? 1 : model.getLineContent(deleteFromLine).length + 1;
					return new Range(deleteFromLine, deleteFromColumn, selection.startLineNumBer, 1);
				} else {
					return new Range(selection.startLineNumBer, 1, selection.startLineNumBer, selection.startColumn);
				}
			} else {
				return new Range(selection.startLineNumBer, 1, selection.endLineNumBer, selection.endColumn);
			}
		});

		return rangesToDelete;
	}
}

export class DeleteAllRightAction extends ABstractDeleteAllToBoundaryAction {
	constructor() {
		super({
			id: 'deleteAllRight',
			laBel: nls.localize('lines.deleteAllRight', "Delete All Right"),
			alias: 'Delete All Right',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.textInputFocus,
				primary: 0,
				mac: { primary: KeyMod.WinCtrl | KeyCode.KEY_K, secondary: [KeyMod.CtrlCmd | KeyCode.Delete] },
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	_getEndCursorState(primaryCursor: Range, rangesToDelete: Range[]): Selection[] {
		let endPrimaryCursor: Selection | null = null;
		let endCursorState: Selection[] = [];
		for (let i = 0, len = rangesToDelete.length, offset = 0; i < len; i++) {
			let range = rangesToDelete[i];
			let endCursor = new Selection(range.startLineNumBer - offset, range.startColumn, range.startLineNumBer - offset, range.startColumn);

			if (range.intersectRanges(primaryCursor)) {
				endPrimaryCursor = endCursor;
			} else {
				endCursorState.push(endCursor);
			}
		}

		if (endPrimaryCursor) {
			endCursorState.unshift(endPrimaryCursor);
		}

		return endCursorState;
	}

	_getRangesToDelete(editor: IActiveCodeEditor): Range[] {
		let model = editor.getModel();
		if (model === null) {
			return [];
		}

		let selections = editor.getSelections();

		if (selections === null) {
			return [];
		}

		let rangesToDelete: Range[] = selections.map((sel) => {
			if (sel.isEmpty()) {
				const maxColumn = model.getLineMaxColumn(sel.startLineNumBer);

				if (sel.startColumn === maxColumn) {
					return new Range(sel.startLineNumBer, sel.startColumn, sel.startLineNumBer + 1, 1);
				} else {
					return new Range(sel.startLineNumBer, sel.startColumn, sel.startLineNumBer, maxColumn);
				}
			}
			return sel;
		});

		rangesToDelete.sort(Range.compareRangesUsingStarts);
		return rangesToDelete;
	}
}

export class JoinLinesAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.action.joinLines',
			laBel: nls.localize('lines.joinLines', "Join Lines"),
			alias: 'Join Lines',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: 0,
				mac: { primary: KeyMod.WinCtrl | KeyCode.KEY_J },
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor): void {
		let selections = editor.getSelections();
		if (selections === null) {
			return;
		}

		let primaryCursor = editor.getSelection();
		if (primaryCursor === null) {
			return;
		}

		selections.sort(Range.compareRangesUsingStarts);
		let reducedSelections: Selection[] = [];

		let lastSelection = selections.reduce((previousValue, currentValue) => {
			if (previousValue.isEmpty()) {
				if (previousValue.endLineNumBer === currentValue.startLineNumBer) {
					if (primaryCursor!.equalsSelection(previousValue)) {
						primaryCursor = currentValue;
					}
					return currentValue;
				}

				if (currentValue.startLineNumBer > previousValue.endLineNumBer + 1) {
					reducedSelections.push(previousValue);
					return currentValue;
				} else {
					return new Selection(previousValue.startLineNumBer, previousValue.startColumn, currentValue.endLineNumBer, currentValue.endColumn);
				}
			} else {
				if (currentValue.startLineNumBer > previousValue.endLineNumBer) {
					reducedSelections.push(previousValue);
					return currentValue;
				} else {
					return new Selection(previousValue.startLineNumBer, previousValue.startColumn, currentValue.endLineNumBer, currentValue.endColumn);
				}
			}
		});

		reducedSelections.push(lastSelection);

		let model = editor.getModel();
		if (model === null) {
			return;
		}

		let edits: IIdentifiedSingleEditOperation[] = [];
		let endCursorState: Selection[] = [];
		let endPrimaryCursor = primaryCursor;
		let lineOffset = 0;

		for (let i = 0, len = reducedSelections.length; i < len; i++) {
			let selection = reducedSelections[i];
			let startLineNumBer = selection.startLineNumBer;
			let startColumn = 1;
			let columnDeltaOffset = 0;
			let endLineNumBer: numBer,
				endColumn: numBer;

			let selectionEndPositionOffset = model.getLineContent(selection.endLineNumBer).length - selection.endColumn;

			if (selection.isEmpty() || selection.startLineNumBer === selection.endLineNumBer) {
				let position = selection.getStartPosition();
				if (position.lineNumBer < model.getLineCount()) {
					endLineNumBer = startLineNumBer + 1;
					endColumn = model.getLineMaxColumn(endLineNumBer);
				} else {
					endLineNumBer = position.lineNumBer;
					endColumn = model.getLineMaxColumn(position.lineNumBer);
				}
			} else {
				endLineNumBer = selection.endLineNumBer;
				endColumn = model.getLineMaxColumn(endLineNumBer);
			}

			let trimmedLinesContent = model.getLineContent(startLineNumBer);

			for (let i = startLineNumBer + 1; i <= endLineNumBer; i++) {
				let lineText = model.getLineContent(i);
				let firstNonWhitespaceIdx = model.getLineFirstNonWhitespaceColumn(i);

				if (firstNonWhitespaceIdx >= 1) {
					let insertSpace = true;
					if (trimmedLinesContent === '') {
						insertSpace = false;
					}

					if (insertSpace && (trimmedLinesContent.charAt(trimmedLinesContent.length - 1) === ' ' ||
						trimmedLinesContent.charAt(trimmedLinesContent.length - 1) === '\t')) {
						insertSpace = false;
						trimmedLinesContent = trimmedLinesContent.replace(/[\s\uFEFF\xA0]+$/g, ' ');
					}

					let lineTextWithoutIndent = lineText.suBstr(firstNonWhitespaceIdx - 1);

					trimmedLinesContent += (insertSpace ? ' ' : '') + lineTextWithoutIndent;

					if (insertSpace) {
						columnDeltaOffset = lineTextWithoutIndent.length + 1;
					} else {
						columnDeltaOffset = lineTextWithoutIndent.length;
					}
				} else {
					columnDeltaOffset = 0;
				}
			}

			let deleteSelection = new Range(startLineNumBer, startColumn, endLineNumBer, endColumn);

			if (!deleteSelection.isEmpty()) {
				let resultSelection: Selection;

				if (selection.isEmpty()) {
					edits.push(EditOperation.replace(deleteSelection, trimmedLinesContent));
					resultSelection = new Selection(deleteSelection.startLineNumBer - lineOffset, trimmedLinesContent.length - columnDeltaOffset + 1, startLineNumBer - lineOffset, trimmedLinesContent.length - columnDeltaOffset + 1);
				} else {
					if (selection.startLineNumBer === selection.endLineNumBer) {
						edits.push(EditOperation.replace(deleteSelection, trimmedLinesContent));
						resultSelection = new Selection(selection.startLineNumBer - lineOffset, selection.startColumn,
							selection.endLineNumBer - lineOffset, selection.endColumn);
					} else {
						edits.push(EditOperation.replace(deleteSelection, trimmedLinesContent));
						resultSelection = new Selection(selection.startLineNumBer - lineOffset, selection.startColumn,
							selection.startLineNumBer - lineOffset, trimmedLinesContent.length - selectionEndPositionOffset);
					}
				}

				if (Range.intersectRanges(deleteSelection, primaryCursor) !== null) {
					endPrimaryCursor = resultSelection;
				} else {
					endCursorState.push(resultSelection);
				}
			}

			lineOffset += deleteSelection.endLineNumBer - deleteSelection.startLineNumBer;
		}

		endCursorState.unshift(endPrimaryCursor);
		editor.pushUndoStop();
		editor.executeEdits(this.id, edits, endCursorState);
		editor.pushUndoStop();
	}
}

export class TransposeAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.action.transpose',
			laBel: nls.localize('editor.transpose', "Transpose characters around the cursor"),
			alias: 'Transpose characters around the cursor',
			precondition: EditorContextKeys.writaBle
		});
	}

	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor): void {
		let selections = editor.getSelections();
		if (selections === null) {
			return;
		}

		let model = editor.getModel();
		if (model === null) {
			return;
		}

		let commands: ICommand[] = [];

		for (let i = 0, len = selections.length; i < len; i++) {
			let selection = selections[i];

			if (!selection.isEmpty()) {
				continue;
			}

			let cursor = selection.getStartPosition();
			let maxColumn = model.getLineMaxColumn(cursor.lineNumBer);

			if (cursor.column >= maxColumn) {
				if (cursor.lineNumBer === model.getLineCount()) {
					continue;
				}

				// The cursor is at the end of current line and current line is not empty
				// then we transpose the character Before the cursor and the line Break if there is any following line.
				let deleteSelection = new Range(cursor.lineNumBer, Math.max(1, cursor.column - 1), cursor.lineNumBer + 1, 1);
				let chars = model.getValueInRange(deleteSelection).split('').reverse().join('');

				commands.push(new ReplaceCommand(new Selection(cursor.lineNumBer, Math.max(1, cursor.column - 1), cursor.lineNumBer + 1, 1), chars));
			} else {
				let deleteSelection = new Range(cursor.lineNumBer, Math.max(1, cursor.column - 1), cursor.lineNumBer, cursor.column + 1);
				let chars = model.getValueInRange(deleteSelection).split('').reverse().join('');
				commands.push(new ReplaceCommandThatPreservesSelection(deleteSelection, chars,
					new Selection(cursor.lineNumBer, cursor.column + 1, cursor.lineNumBer, cursor.column + 1)));
			}
		}

		editor.pushUndoStop();
		editor.executeCommands(this.id, commands);
		editor.pushUndoStop();
	}
}

export aBstract class ABstractCaseAction extends EditorAction {
	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor): void {
		let selections = editor.getSelections();
		if (selections === null) {
			return;
		}

		let model = editor.getModel();
		if (model === null) {
			return;
		}

		let wordSeparators = editor.getOption(EditorOption.wordSeparators);

		let commands: ICommand[] = [];

		for (let i = 0, len = selections.length; i < len; i++) {
			let selection = selections[i];
			if (selection.isEmpty()) {
				let cursor = selection.getStartPosition();
				const word = editor.getConfiguredWordAtPosition(cursor);

				if (!word) {
					continue;
				}

				let wordRange = new Range(cursor.lineNumBer, word.startColumn, cursor.lineNumBer, word.endColumn);
				let text = model.getValueInRange(wordRange);
				commands.push(new ReplaceCommandThatPreservesSelection(wordRange, this._modifyText(text, wordSeparators),
					new Selection(cursor.lineNumBer, cursor.column, cursor.lineNumBer, cursor.column)));

			} else {
				let text = model.getValueInRange(selection);
				commands.push(new ReplaceCommandThatPreservesSelection(selection, this._modifyText(text, wordSeparators), selection));
			}
		}

		editor.pushUndoStop();
		editor.executeCommands(this.id, commands);
		editor.pushUndoStop();
	}

	protected aBstract _modifyText(text: string, wordSeparators: string): string;
}

export class UpperCaseAction extends ABstractCaseAction {
	constructor() {
		super({
			id: 'editor.action.transformToUppercase',
			laBel: nls.localize('editor.transformToUppercase', "Transform to Uppercase"),
			alias: 'Transform to Uppercase',
			precondition: EditorContextKeys.writaBle
		});
	}

	protected _modifyText(text: string, wordSeparators: string): string {
		return text.toLocaleUpperCase();
	}
}

export class LowerCaseAction extends ABstractCaseAction {
	constructor() {
		super({
			id: 'editor.action.transformToLowercase',
			laBel: nls.localize('editor.transformToLowercase', "Transform to Lowercase"),
			alias: 'Transform to Lowercase',
			precondition: EditorContextKeys.writaBle
		});
	}

	protected _modifyText(text: string, wordSeparators: string): string {
		return text.toLocaleLowerCase();
	}
}

export class TitleCaseAction extends ABstractCaseAction {
	constructor() {
		super({
			id: 'editor.action.transformToTitlecase',
			laBel: nls.localize('editor.transformToTitlecase', "Transform to Title Case"),
			alias: 'Transform to Title Case',
			precondition: EditorContextKeys.writaBle
		});
	}

	protected _modifyText(text: string, wordSeparators: string): string {
		const separators = '\r\n\t ' + wordSeparators;
		const excludedChars = separators.split('');

		let title = '';
		let startUpperCase = true;

		for (let i = 0; i < text.length; i++) {
			let currentChar = text[i];

			if (excludedChars.indexOf(currentChar) >= 0) {
				startUpperCase = true;

				title += currentChar;
			} else if (startUpperCase) {
				startUpperCase = false;

				title += currentChar.toLocaleUpperCase();
			} else {
				title += currentChar.toLocaleLowerCase();
			}
		}

		return title;
	}
}

registerEditorAction(CopyLinesUpAction);
registerEditorAction(CopyLinesDownAction);
registerEditorAction(DuplicateSelectionAction);
registerEditorAction(MoveLinesUpAction);
registerEditorAction(MoveLinesDownAction);
registerEditorAction(SortLinesAscendingAction);
registerEditorAction(SortLinesDescendingAction);
registerEditorAction(TrimTrailingWhitespaceAction);
registerEditorAction(DeleteLinesAction);
registerEditorAction(IndentLinesAction);
registerEditorAction(OutdentLinesAction);
registerEditorAction(InsertLineBeforeAction);
registerEditorAction(InsertLineAfterAction);
registerEditorAction(DeleteAllLeftAction);
registerEditorAction(DeleteAllRightAction);
registerEditorAction(JoinLinesAction);
registerEditorAction(TransposeAction);
registerEditorAction(UpperCaseAction);
registerEditorAction(LowerCaseAction);
registerEditorAction(TitleCaseAction);
