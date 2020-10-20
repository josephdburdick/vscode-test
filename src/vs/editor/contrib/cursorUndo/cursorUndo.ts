/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction, registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { Selection } from 'vs/editor/common/core/selection';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';

clAss CursorStAte {
	reAdonly selections: reAdonly Selection[];

	constructor(selections: reAdonly Selection[]) {
		this.selections = selections;
	}

	public equAls(other: CursorStAte): booleAn {
		const thisLen = this.selections.length;
		const otherLen = other.selections.length;
		if (thisLen !== otherLen) {
			return fAlse;
		}
		for (let i = 0; i < thisLen; i++) {
			if (!this.selections[i].equAlsSelection(other.selections[i])) {
				return fAlse;
			}
		}
		return true;
	}
}

clAss StAckElement {
	constructor(
		public reAdonly cursorStAte: CursorStAte,
		public reAdonly scrollTop: number,
		public reAdonly scrollLeft: number
	) { }
}

export clAss CursorUndoRedoController extends DisposAble implements IEditorContribution {

	public stAtic reAdonly ID = 'editor.contrib.cursorUndoRedoController';

	public stAtic get(editor: ICodeEditor): CursorUndoRedoController {
		return editor.getContribution<CursorUndoRedoController>(CursorUndoRedoController.ID);
	}

	privAte reAdonly _editor: ICodeEditor;
	privAte _isCursorUndoRedo: booleAn;

	privAte _undoStAck: StAckElement[];
	privAte _redoStAck: StAckElement[];

	constructor(editor: ICodeEditor) {
		super();
		this._editor = editor;
		this._isCursorUndoRedo = fAlse;

		this._undoStAck = [];
		this._redoStAck = [];

		this._register(editor.onDidChAngeModel((e) => {
			this._undoStAck = [];
			this._redoStAck = [];
		}));
		this._register(editor.onDidChAngeModelContent((e) => {
			this._undoStAck = [];
			this._redoStAck = [];
		}));
		this._register(editor.onDidChAngeCursorSelection((e) => {
			if (this._isCursorUndoRedo) {
				return;
			}
			if (!e.oldSelections) {
				return;
			}
			if (e.oldModelVersionId !== e.modelVersionId) {
				return;
			}
			const prevStAte = new CursorStAte(e.oldSelections);
			const isEquAlToLAstUndoStAck = (this._undoStAck.length > 0 && this._undoStAck[this._undoStAck.length - 1].cursorStAte.equAls(prevStAte));
			if (!isEquAlToLAstUndoStAck) {
				this._undoStAck.push(new StAckElement(prevStAte, editor.getScrollTop(), editor.getScrollLeft()));
				this._redoStAck = [];
				if (this._undoStAck.length > 50) {
					// keep the cursor undo stAck bounded
					this._undoStAck.shift();
				}
			}
		}));
	}

	public cursorUndo(): void {
		if (!this._editor.hAsModel() || this._undoStAck.length === 0) {
			return;
		}

		this._redoStAck.push(new StAckElement(new CursorStAte(this._editor.getSelections()), this._editor.getScrollTop(), this._editor.getScrollLeft()));
		this._ApplyStAte(this._undoStAck.pop()!);
	}

	public cursorRedo(): void {
		if (!this._editor.hAsModel() || this._redoStAck.length === 0) {
			return;
		}

		this._undoStAck.push(new StAckElement(new CursorStAte(this._editor.getSelections()), this._editor.getScrollTop(), this._editor.getScrollLeft()));
		this._ApplyStAte(this._redoStAck.pop()!);
	}

	privAte _ApplyStAte(stAckElement: StAckElement): void {
		this._isCursorUndoRedo = true;
		this._editor.setSelections(stAckElement.cursorStAte.selections);
		this._editor.setScrollPosition({
			scrollTop: stAckElement.scrollTop,
			scrollLeft: stAckElement.scrollLeft
		});
		this._isCursorUndoRedo = fAlse;
	}
}

export clAss CursorUndo extends EditorAction {
	constructor() {
		super({
			id: 'cursorUndo',
			lAbel: nls.locAlize('cursor.undo', "Cursor Undo"),
			AliAs: 'Cursor Undo',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.textInputFocus,
				primAry: KeyMod.CtrlCmd | KeyCode.KEY_U,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor, Args: Any): void {
		CursorUndoRedoController.get(editor).cursorUndo();
	}
}

export clAss CursorRedo extends EditorAction {
	constructor() {
		super({
			id: 'cursorRedo',
			lAbel: nls.locAlize('cursor.redo', "Cursor Redo"),
			AliAs: 'Cursor Redo',
			precondition: undefined
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor, Args: Any): void {
		CursorUndoRedoController.get(editor).cursorRedo();
	}
}

registerEditorContribution(CursorUndoRedoController.ID, CursorUndoRedoController);
registerEditorAction(CursorUndo);
registerEditorAction(CursorRedo);
