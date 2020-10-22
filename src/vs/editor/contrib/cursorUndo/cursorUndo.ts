/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction, registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { Selection } from 'vs/editor/common/core/selection';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';

class CursorState {
	readonly selections: readonly Selection[];

	constructor(selections: readonly Selection[]) {
		this.selections = selections;
	}

	puBlic equals(other: CursorState): Boolean {
		const thisLen = this.selections.length;
		const otherLen = other.selections.length;
		if (thisLen !== otherLen) {
			return false;
		}
		for (let i = 0; i < thisLen; i++) {
			if (!this.selections[i].equalsSelection(other.selections[i])) {
				return false;
			}
		}
		return true;
	}
}

class StackElement {
	constructor(
		puBlic readonly cursorState: CursorState,
		puBlic readonly scrollTop: numBer,
		puBlic readonly scrollLeft: numBer
	) { }
}

export class CursorUndoRedoController extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.cursorUndoRedoController';

	puBlic static get(editor: ICodeEditor): CursorUndoRedoController {
		return editor.getContriBution<CursorUndoRedoController>(CursorUndoRedoController.ID);
	}

	private readonly _editor: ICodeEditor;
	private _isCursorUndoRedo: Boolean;

	private _undoStack: StackElement[];
	private _redoStack: StackElement[];

	constructor(editor: ICodeEditor) {
		super();
		this._editor = editor;
		this._isCursorUndoRedo = false;

		this._undoStack = [];
		this._redoStack = [];

		this._register(editor.onDidChangeModel((e) => {
			this._undoStack = [];
			this._redoStack = [];
		}));
		this._register(editor.onDidChangeModelContent((e) => {
			this._undoStack = [];
			this._redoStack = [];
		}));
		this._register(editor.onDidChangeCursorSelection((e) => {
			if (this._isCursorUndoRedo) {
				return;
			}
			if (!e.oldSelections) {
				return;
			}
			if (e.oldModelVersionId !== e.modelVersionId) {
				return;
			}
			const prevState = new CursorState(e.oldSelections);
			const isEqualToLastUndoStack = (this._undoStack.length > 0 && this._undoStack[this._undoStack.length - 1].cursorState.equals(prevState));
			if (!isEqualToLastUndoStack) {
				this._undoStack.push(new StackElement(prevState, editor.getScrollTop(), editor.getScrollLeft()));
				this._redoStack = [];
				if (this._undoStack.length > 50) {
					// keep the cursor undo stack Bounded
					this._undoStack.shift();
				}
			}
		}));
	}

	puBlic cursorUndo(): void {
		if (!this._editor.hasModel() || this._undoStack.length === 0) {
			return;
		}

		this._redoStack.push(new StackElement(new CursorState(this._editor.getSelections()), this._editor.getScrollTop(), this._editor.getScrollLeft()));
		this._applyState(this._undoStack.pop()!);
	}

	puBlic cursorRedo(): void {
		if (!this._editor.hasModel() || this._redoStack.length === 0) {
			return;
		}

		this._undoStack.push(new StackElement(new CursorState(this._editor.getSelections()), this._editor.getScrollTop(), this._editor.getScrollLeft()));
		this._applyState(this._redoStack.pop()!);
	}

	private _applyState(stackElement: StackElement): void {
		this._isCursorUndoRedo = true;
		this._editor.setSelections(stackElement.cursorState.selections);
		this._editor.setScrollPosition({
			scrollTop: stackElement.scrollTop,
			scrollLeft: stackElement.scrollLeft
		});
		this._isCursorUndoRedo = false;
	}
}

export class CursorUndo extends EditorAction {
	constructor() {
		super({
			id: 'cursorUndo',
			laBel: nls.localize('cursor.undo', "Cursor Undo"),
			alias: 'Cursor Undo',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.textInputFocus,
				primary: KeyMod.CtrlCmd | KeyCode.KEY_U,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor, args: any): void {
		CursorUndoRedoController.get(editor).cursorUndo();
	}
}

export class CursorRedo extends EditorAction {
	constructor() {
		super({
			id: 'cursorRedo',
			laBel: nls.localize('cursor.redo', "Cursor Redo"),
			alias: 'Cursor Redo',
			precondition: undefined
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor, args: any): void {
		CursorUndoRedoController.get(editor).cursorRedo();
	}
}

registerEditorContriBution(CursorUndoRedoController.ID, CursorUndoRedoController);
registerEditorAction(CursorUndo);
registerEditorAction(CursorRedo);
