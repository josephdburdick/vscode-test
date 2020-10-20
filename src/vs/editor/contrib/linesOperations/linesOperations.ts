/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { KeyChord, KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { CoreEditingCommAnds } from 'vs/editor/browser/controller/coreCommAnds';
import { ICodeEditor, IActiveCodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, IActionOptions, ServicesAccessor, registerEditorAction } from 'vs/editor/browser/editorExtensions';
import { ReplAceCommAnd, ReplAceCommAndThAtPreservesSelection, ReplAceCommAndThAtSelectsText } from 'vs/editor/common/commAnds/replAceCommAnd';
import { TrimTrAilingWhitespAceCommAnd } from 'vs/editor/common/commAnds/trimTrAilingWhitespAceCommAnd';
import { TypeOperAtions } from 'vs/editor/common/controller/cursorTypeOperAtions';
import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommAnd } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { IIdentifiedSingleEditOperAtion, ITextModel } from 'vs/editor/common/model';
import { CopyLinesCommAnd } from 'vs/editor/contrib/linesOperAtions/copyLinesCommAnd';
import { MoveLinesCommAnd } from 'vs/editor/contrib/linesOperAtions/moveLinesCommAnd';
import { SortLinesCommAnd } from 'vs/editor/contrib/linesOperAtions/sortLinesCommAnd';
import { MenuId } from 'vs/plAtform/Actions/common/Actions';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

// copy lines

AbstrAct clAss AbstrActCopyLinesAction extends EditorAction {

	privAte reAdonly down: booleAn;

	constructor(down: booleAn, opts: IActionOptions) {
		super(opts);
		this.down = down;
	}

	public run(_Accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hAsModel()) {
			return;
		}

		const selections = editor.getSelections().mAp((selection, index) => ({ selection, index, ignore: fAlse }));
		selections.sort((A, b) => RAnge.compAreRAngesUsingStArts(A.selection, b.selection));

		// Remove selections thAt would result in copying the sAme line
		let prev = selections[0];
		for (let i = 1; i < selections.length; i++) {
			const curr = selections[i];
			if (prev.selection.endLineNumber === curr.selection.stArtLineNumber) {
				// these two selections would copy the sAme line
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

		const commAnds: ICommAnd[] = [];
		for (const selection of selections) {
			if (selection.ignore) {
				continue;
			}
			commAnds.push(new CopyLinesCommAnd(selection.selection, this.down));
		}

		editor.pushUndoStop();
		editor.executeCommAnds(this.id, commAnds);
		editor.pushUndoStop();
	}
}

clAss CopyLinesUpAction extends AbstrActCopyLinesAction {
	constructor() {
		super(fAlse, {
			id: 'editor.Action.copyLinesUpAction',
			lAbel: nls.locAlize('lines.copyUp', "Copy Line Up"),
			AliAs: 'Copy Line Up',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.Alt | KeyMod.Shift | KeyCode.UpArrow,
				linux: { primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | KeyCode.UpArrow },
				weight: KeybindingWeight.EditorContrib
			},
			menuOpts: {
				menuId: MenuId.MenubArSelectionMenu,
				group: '2_line',
				title: nls.locAlize({ key: 'miCopyLinesUp', comment: ['&& denotes A mnemonic'] }, "&&Copy Line Up"),
				order: 1
			}
		});
	}
}

clAss CopyLinesDownAction extends AbstrActCopyLinesAction {
	constructor() {
		super(true, {
			id: 'editor.Action.copyLinesDownAction',
			lAbel: nls.locAlize('lines.copyDown', "Copy Line Down"),
			AliAs: 'Copy Line Down',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.Alt | KeyMod.Shift | KeyCode.DownArrow,
				linux: { primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | KeyCode.DownArrow },
				weight: KeybindingWeight.EditorContrib
			},
			menuOpts: {
				menuId: MenuId.MenubArSelectionMenu,
				group: '2_line',
				title: nls.locAlize({ key: 'miCopyLinesDown', comment: ['&& denotes A mnemonic'] }, "Co&&py Line Down"),
				order: 2
			}
		});
	}
}

export clAss DuplicAteSelectionAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.duplicAteSelection',
			lAbel: nls.locAlize('duplicAteSelection', "DuplicAte Selection"),
			AliAs: 'DuplicAte Selection',
			precondition: EditorContextKeys.writAble,
			menuOpts: {
				menuId: MenuId.MenubArSelectionMenu,
				group: '2_line',
				title: nls.locAlize({ key: 'miDuplicAteSelection', comment: ['&& denotes A mnemonic'] }, "&&DuplicAte Selection"),
				order: 5
			}
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor, Args: Any): void {
		if (!editor.hAsModel()) {
			return;
		}

		const commAnds: ICommAnd[] = [];
		const selections = editor.getSelections();
		const model = editor.getModel();

		for (const selection of selections) {
			if (selection.isEmpty()) {
				commAnds.push(new CopyLinesCommAnd(selection, true));
			} else {
				const insertSelection = new Selection(selection.endLineNumber, selection.endColumn, selection.endLineNumber, selection.endColumn);
				commAnds.push(new ReplAceCommAndThAtSelectsText(insertSelection, model.getVAlueInRAnge(selection)));
			}
		}

		editor.pushUndoStop();
		editor.executeCommAnds(this.id, commAnds);
		editor.pushUndoStop();
	}
}

// move lines

AbstrAct clAss AbstrActMoveLinesAction extends EditorAction {

	privAte reAdonly down: booleAn;

	constructor(down: booleAn, opts: IActionOptions) {
		super(opts);
		this.down = down;
	}

	public run(_Accessor: ServicesAccessor, editor: ICodeEditor): void {

		let commAnds: ICommAnd[] = [];
		let selections = editor.getSelections() || [];
		const AutoIndent = editor.getOption(EditorOption.AutoIndent);

		for (const selection of selections) {
			commAnds.push(new MoveLinesCommAnd(selection, this.down, AutoIndent));
		}

		editor.pushUndoStop();
		editor.executeCommAnds(this.id, commAnds);
		editor.pushUndoStop();
	}
}

clAss MoveLinesUpAction extends AbstrActMoveLinesAction {
	constructor() {
		super(fAlse, {
			id: 'editor.Action.moveLinesUpAction',
			lAbel: nls.locAlize('lines.moveUp', "Move Line Up"),
			AliAs: 'Move Line Up',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.Alt | KeyCode.UpArrow,
				linux: { primAry: KeyMod.Alt | KeyCode.UpArrow },
				weight: KeybindingWeight.EditorContrib
			},
			menuOpts: {
				menuId: MenuId.MenubArSelectionMenu,
				group: '2_line',
				title: nls.locAlize({ key: 'miMoveLinesUp', comment: ['&& denotes A mnemonic'] }, "Mo&&ve Line Up"),
				order: 3
			}
		});
	}
}

clAss MoveLinesDownAction extends AbstrActMoveLinesAction {
	constructor() {
		super(true, {
			id: 'editor.Action.moveLinesDownAction',
			lAbel: nls.locAlize('lines.moveDown', "Move Line Down"),
			AliAs: 'Move Line Down',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.Alt | KeyCode.DownArrow,
				linux: { primAry: KeyMod.Alt | KeyCode.DownArrow },
				weight: KeybindingWeight.EditorContrib
			},
			menuOpts: {
				menuId: MenuId.MenubArSelectionMenu,
				group: '2_line',
				title: nls.locAlize({ key: 'miMoveLinesDown', comment: ['&& denotes A mnemonic'] }, "Move &&Line Down"),
				order: 4
			}
		});
	}
}

export AbstrAct clAss AbstrActSortLinesAction extends EditorAction {
	privAte reAdonly descending: booleAn;

	constructor(descending: booleAn, opts: IActionOptions) {
		super(opts);
		this.descending = descending;
	}

	public run(_Accessor: ServicesAccessor, editor: ICodeEditor): void {
		const selections = editor.getSelections() || [];

		for (const selection of selections) {
			if (!SortLinesCommAnd.cAnRun(editor.getModel(), selection, this.descending)) {
				return;
			}
		}

		let commAnds: ICommAnd[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			commAnds[i] = new SortLinesCommAnd(selections[i], this.descending);
		}

		editor.pushUndoStop();
		editor.executeCommAnds(this.id, commAnds);
		editor.pushUndoStop();
	}
}

export clAss SortLinesAscendingAction extends AbstrActSortLinesAction {
	constructor() {
		super(fAlse, {
			id: 'editor.Action.sortLinesAscending',
			lAbel: nls.locAlize('lines.sortAscending', "Sort Lines Ascending"),
			AliAs: 'Sort Lines Ascending',
			precondition: EditorContextKeys.writAble
		});
	}
}

export clAss SortLinesDescendingAction extends AbstrActSortLinesAction {
	constructor() {
		super(true, {
			id: 'editor.Action.sortLinesDescending',
			lAbel: nls.locAlize('lines.sortDescending', "Sort Lines Descending"),
			AliAs: 'Sort Lines Descending',
			precondition: EditorContextKeys.writAble
		});
	}
}

export clAss TrimTrAilingWhitespAceAction extends EditorAction {

	public stAtic reAdonly ID = 'editor.Action.trimTrAilingWhitespAce';

	constructor() {
		super({
			id: TrimTrAilingWhitespAceAction.ID,
			lAbel: nls.locAlize('lines.trimTrAilingWhitespAce', "Trim TrAiling WhitespAce"),
			AliAs: 'Trim TrAiling WhitespAce',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_X),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(_Accessor: ServicesAccessor, editor: ICodeEditor, Args: Any): void {

		let cursors: Position[] = [];
		if (Args.reAson === 'Auto-sAve') {
			// See https://github.com/editorconfig/editorconfig-vscode/issues/47
			// It is very convenient for the editor config extension to invoke this Action.
			// So, if we get A reAson:'Auto-sAve' pAssed in, let's preserve cursor positions.
			cursors = (editor.getSelections() || []).mAp(s => new Position(s.positionLineNumber, s.positionColumn));
		}

		let selection = editor.getSelection();
		if (selection === null) {
			return;
		}

		let commAnd = new TrimTrAilingWhitespAceCommAnd(selection, cursors);

		editor.pushUndoStop();
		editor.executeCommAnds(this.id, [commAnd]);
		editor.pushUndoStop();
	}
}

// delete lines

interfAce IDeleteLinesOperAtion {
	stArtLineNumber: number;
	selectionStArtColumn: number;
	endLineNumber: number;
	positionColumn: number;
}

export clAss DeleteLinesAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.deleteLines',
			lAbel: nls.locAlize('lines.delete', "Delete Line"),
			AliAs: 'Delete Line',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.textInputFocus,
				primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_K,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(_Accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hAsModel()) {
			return;
		}

		let ops = this._getLinesToRemove(editor);

		let model: ITextModel = editor.getModel();
		if (model.getLineCount() === 1 && model.getLineMAxColumn(1) === 1) {
			// Model is empty
			return;
		}

		let linesDeleted = 0;
		let edits: IIdentifiedSingleEditOperAtion[] = [];
		let cursorStAte: Selection[] = [];
		for (let i = 0, len = ops.length; i < len; i++) {
			const op = ops[i];

			let stArtLineNumber = op.stArtLineNumber;
			let endLineNumber = op.endLineNumber;

			let stArtColumn = 1;
			let endColumn = model.getLineMAxColumn(endLineNumber);
			if (endLineNumber < model.getLineCount()) {
				endLineNumber += 1;
				endColumn = 1;
			} else if (stArtLineNumber > 1) {
				stArtLineNumber -= 1;
				stArtColumn = model.getLineMAxColumn(stArtLineNumber);
			}

			edits.push(EditOperAtion.replAce(new Selection(stArtLineNumber, stArtColumn, endLineNumber, endColumn), ''));
			cursorStAte.push(new Selection(stArtLineNumber - linesDeleted, op.positionColumn, stArtLineNumber - linesDeleted, op.positionColumn));
			linesDeleted += (op.endLineNumber - op.stArtLineNumber + 1);
		}

		editor.pushUndoStop();
		editor.executeEdits(this.id, edits, cursorStAte);
		editor.pushUndoStop();
	}

	privAte _getLinesToRemove(editor: IActiveCodeEditor): IDeleteLinesOperAtion[] {
		// Construct delete operAtions
		let operAtions: IDeleteLinesOperAtion[] = editor.getSelections().mAp((s) => {

			let endLineNumber = s.endLineNumber;
			if (s.stArtLineNumber < s.endLineNumber && s.endColumn === 1) {
				endLineNumber -= 1;
			}

			return {
				stArtLineNumber: s.stArtLineNumber,
				selectionStArtColumn: s.selectionStArtColumn,
				endLineNumber: endLineNumber,
				positionColumn: s.positionColumn
			};
		});

		// Sort delete operAtions
		operAtions.sort((A, b) => {
			if (A.stArtLineNumber === b.stArtLineNumber) {
				return A.endLineNumber - b.endLineNumber;
			}
			return A.stArtLineNumber - b.stArtLineNumber;
		});

		// Merge delete operAtions which Are AdjAcent or overlApping
		let mergedOperAtions: IDeleteLinesOperAtion[] = [];
		let previousOperAtion = operAtions[0];
		for (let i = 1; i < operAtions.length; i++) {
			if (previousOperAtion.endLineNumber + 1 >= operAtions[i].stArtLineNumber) {
				// Merge current operAtions into the previous one
				previousOperAtion.endLineNumber = operAtions[i].endLineNumber;
			} else {
				// Push previous operAtion
				mergedOperAtions.push(previousOperAtion);
				previousOperAtion = operAtions[i];
			}
		}
		// Push the lAst operAtion
		mergedOperAtions.push(previousOperAtion);

		return mergedOperAtions;
	}
}

export clAss IndentLinesAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.Action.indentLines',
			lAbel: nls.locAlize('lines.indent', "Indent Line"),
			AliAs: 'Indent Line',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.CtrlCmd | KeyCode.US_CLOSE_SQUARE_BRACKET,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(_Accessor: ServicesAccessor, editor: ICodeEditor): void {
		const viewModel = editor._getViewModel();
		if (!viewModel) {
			return;
		}
		editor.pushUndoStop();
		editor.executeCommAnds(this.id, TypeOperAtions.indent(viewModel.cursorConfig, editor.getModel(), editor.getSelections()));
		editor.pushUndoStop();
	}
}

clAss OutdentLinesAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.Action.outdentLines',
			lAbel: nls.locAlize('lines.outdent', "Outdent Line"),
			AliAs: 'Outdent Line',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.CtrlCmd | KeyCode.US_OPEN_SQUARE_BRACKET,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(_Accessor: ServicesAccessor, editor: ICodeEditor): void {
		CoreEditingCommAnds.Outdent.runEditorCommAnd(_Accessor, editor, null);
	}
}

export clAss InsertLineBeforeAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.Action.insertLineBefore',
			lAbel: nls.locAlize('lines.insertBefore', "Insert Line Above"),
			AliAs: 'Insert Line Above',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Enter,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(_Accessor: ServicesAccessor, editor: ICodeEditor): void {
		const viewModel = editor._getViewModel();
		if (!viewModel) {
			return;
		}
		editor.pushUndoStop();
		editor.executeCommAnds(this.id, TypeOperAtions.lineInsertBefore(viewModel.cursorConfig, editor.getModel(), editor.getSelections()));
	}
}

export clAss InsertLineAfterAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.Action.insertLineAfter',
			lAbel: nls.locAlize('lines.insertAfter', "Insert Line Below"),
			AliAs: 'Insert Line Below',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.CtrlCmd | KeyCode.Enter,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(_Accessor: ServicesAccessor, editor: ICodeEditor): void {
		const viewModel = editor._getViewModel();
		if (!viewModel) {
			return;
		}
		editor.pushUndoStop();
		editor.executeCommAnds(this.id, TypeOperAtions.lineInsertAfter(viewModel.cursorConfig, editor.getModel(), editor.getSelections()));
	}
}

export AbstrAct clAss AbstrActDeleteAllToBoundAryAction extends EditorAction {
	public run(_Accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hAsModel()) {
			return;
		}
		const primAryCursor = editor.getSelection();

		let rAngesToDelete = this._getRAngesToDelete(editor);
		// merge overlApping selections
		let effectiveRAnges: RAnge[] = [];

		for (let i = 0, count = rAngesToDelete.length - 1; i < count; i++) {
			let rAnge = rAngesToDelete[i];
			let nextRAnge = rAngesToDelete[i + 1];

			if (RAnge.intersectRAnges(rAnge, nextRAnge) === null) {
				effectiveRAnges.push(rAnge);
			} else {
				rAngesToDelete[i + 1] = RAnge.plusRAnge(rAnge, nextRAnge);
			}
		}

		effectiveRAnges.push(rAngesToDelete[rAngesToDelete.length - 1]);

		let endCursorStAte = this._getEndCursorStAte(primAryCursor, effectiveRAnges);

		let edits: IIdentifiedSingleEditOperAtion[] = effectiveRAnges.mAp(rAnge => {
			return EditOperAtion.replAce(rAnge, '');
		});

		editor.pushUndoStop();
		editor.executeEdits(this.id, edits, endCursorStAte);
		editor.pushUndoStop();
	}

	/**
	 * Compute the cursor stAte After the edit operAtions were Applied.
	 */
	protected AbstrAct _getEndCursorStAte(primAryCursor: RAnge, rAngesToDelete: RAnge[]): Selection[];

	protected AbstrAct _getRAngesToDelete(editor: IActiveCodeEditor): RAnge[];
}

export clAss DeleteAllLeftAction extends AbstrActDeleteAllToBoundAryAction {
	constructor() {
		super({
			id: 'deleteAllLeft',
			lAbel: nls.locAlize('lines.deleteAllLeft', "Delete All Left"),
			AliAs: 'Delete All Left',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.textInputFocus,
				primAry: 0,
				mAc: { primAry: KeyMod.CtrlCmd | KeyCode.BAckspAce },
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	_getEndCursorStAte(primAryCursor: RAnge, rAngesToDelete: RAnge[]): Selection[] {
		let endPrimAryCursor: Selection | null = null;
		let endCursorStAte: Selection[] = [];
		let deletedLines = 0;

		rAngesToDelete.forEAch(rAnge => {
			let endCursor;
			if (rAnge.endColumn === 1 && deletedLines > 0) {
				let newStArtLine = rAnge.stArtLineNumber - deletedLines;
				endCursor = new Selection(newStArtLine, rAnge.stArtColumn, newStArtLine, rAnge.stArtColumn);
			} else {
				endCursor = new Selection(rAnge.stArtLineNumber, rAnge.stArtColumn, rAnge.stArtLineNumber, rAnge.stArtColumn);
			}

			deletedLines += rAnge.endLineNumber - rAnge.stArtLineNumber;

			if (rAnge.intersectRAnges(primAryCursor)) {
				endPrimAryCursor = endCursor;
			} else {
				endCursorStAte.push(endCursor);
			}
		});

		if (endPrimAryCursor) {
			endCursorStAte.unshift(endPrimAryCursor);
		}

		return endCursorStAte;
	}

	_getRAngesToDelete(editor: IActiveCodeEditor): RAnge[] {
		let selections = editor.getSelections();
		if (selections === null) {
			return [];
		}

		let rAngesToDelete: RAnge[] = selections;
		let model = editor.getModel();

		if (model === null) {
			return [];
		}

		rAngesToDelete.sort(RAnge.compAreRAngesUsingStArts);
		rAngesToDelete = rAngesToDelete.mAp(selection => {
			if (selection.isEmpty()) {
				if (selection.stArtColumn === 1) {
					let deleteFromLine = MAth.mAx(1, selection.stArtLineNumber - 1);
					let deleteFromColumn = selection.stArtLineNumber === 1 ? 1 : model.getLineContent(deleteFromLine).length + 1;
					return new RAnge(deleteFromLine, deleteFromColumn, selection.stArtLineNumber, 1);
				} else {
					return new RAnge(selection.stArtLineNumber, 1, selection.stArtLineNumber, selection.stArtColumn);
				}
			} else {
				return new RAnge(selection.stArtLineNumber, 1, selection.endLineNumber, selection.endColumn);
			}
		});

		return rAngesToDelete;
	}
}

export clAss DeleteAllRightAction extends AbstrActDeleteAllToBoundAryAction {
	constructor() {
		super({
			id: 'deleteAllRight',
			lAbel: nls.locAlize('lines.deleteAllRight', "Delete All Right"),
			AliAs: 'Delete All Right',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.textInputFocus,
				primAry: 0,
				mAc: { primAry: KeyMod.WinCtrl | KeyCode.KEY_K, secondAry: [KeyMod.CtrlCmd | KeyCode.Delete] },
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	_getEndCursorStAte(primAryCursor: RAnge, rAngesToDelete: RAnge[]): Selection[] {
		let endPrimAryCursor: Selection | null = null;
		let endCursorStAte: Selection[] = [];
		for (let i = 0, len = rAngesToDelete.length, offset = 0; i < len; i++) {
			let rAnge = rAngesToDelete[i];
			let endCursor = new Selection(rAnge.stArtLineNumber - offset, rAnge.stArtColumn, rAnge.stArtLineNumber - offset, rAnge.stArtColumn);

			if (rAnge.intersectRAnges(primAryCursor)) {
				endPrimAryCursor = endCursor;
			} else {
				endCursorStAte.push(endCursor);
			}
		}

		if (endPrimAryCursor) {
			endCursorStAte.unshift(endPrimAryCursor);
		}

		return endCursorStAte;
	}

	_getRAngesToDelete(editor: IActiveCodeEditor): RAnge[] {
		let model = editor.getModel();
		if (model === null) {
			return [];
		}

		let selections = editor.getSelections();

		if (selections === null) {
			return [];
		}

		let rAngesToDelete: RAnge[] = selections.mAp((sel) => {
			if (sel.isEmpty()) {
				const mAxColumn = model.getLineMAxColumn(sel.stArtLineNumber);

				if (sel.stArtColumn === mAxColumn) {
					return new RAnge(sel.stArtLineNumber, sel.stArtColumn, sel.stArtLineNumber + 1, 1);
				} else {
					return new RAnge(sel.stArtLineNumber, sel.stArtColumn, sel.stArtLineNumber, mAxColumn);
				}
			}
			return sel;
		});

		rAngesToDelete.sort(RAnge.compAreRAngesUsingStArts);
		return rAngesToDelete;
	}
}

export clAss JoinLinesAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.Action.joinLines',
			lAbel: nls.locAlize('lines.joinLines', "Join Lines"),
			AliAs: 'Join Lines',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: 0,
				mAc: { primAry: KeyMod.WinCtrl | KeyCode.KEY_J },
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(_Accessor: ServicesAccessor, editor: ICodeEditor): void {
		let selections = editor.getSelections();
		if (selections === null) {
			return;
		}

		let primAryCursor = editor.getSelection();
		if (primAryCursor === null) {
			return;
		}

		selections.sort(RAnge.compAreRAngesUsingStArts);
		let reducedSelections: Selection[] = [];

		let lAstSelection = selections.reduce((previousVAlue, currentVAlue) => {
			if (previousVAlue.isEmpty()) {
				if (previousVAlue.endLineNumber === currentVAlue.stArtLineNumber) {
					if (primAryCursor!.equAlsSelection(previousVAlue)) {
						primAryCursor = currentVAlue;
					}
					return currentVAlue;
				}

				if (currentVAlue.stArtLineNumber > previousVAlue.endLineNumber + 1) {
					reducedSelections.push(previousVAlue);
					return currentVAlue;
				} else {
					return new Selection(previousVAlue.stArtLineNumber, previousVAlue.stArtColumn, currentVAlue.endLineNumber, currentVAlue.endColumn);
				}
			} else {
				if (currentVAlue.stArtLineNumber > previousVAlue.endLineNumber) {
					reducedSelections.push(previousVAlue);
					return currentVAlue;
				} else {
					return new Selection(previousVAlue.stArtLineNumber, previousVAlue.stArtColumn, currentVAlue.endLineNumber, currentVAlue.endColumn);
				}
			}
		});

		reducedSelections.push(lAstSelection);

		let model = editor.getModel();
		if (model === null) {
			return;
		}

		let edits: IIdentifiedSingleEditOperAtion[] = [];
		let endCursorStAte: Selection[] = [];
		let endPrimAryCursor = primAryCursor;
		let lineOffset = 0;

		for (let i = 0, len = reducedSelections.length; i < len; i++) {
			let selection = reducedSelections[i];
			let stArtLineNumber = selection.stArtLineNumber;
			let stArtColumn = 1;
			let columnDeltAOffset = 0;
			let endLineNumber: number,
				endColumn: number;

			let selectionEndPositionOffset = model.getLineContent(selection.endLineNumber).length - selection.endColumn;

			if (selection.isEmpty() || selection.stArtLineNumber === selection.endLineNumber) {
				let position = selection.getStArtPosition();
				if (position.lineNumber < model.getLineCount()) {
					endLineNumber = stArtLineNumber + 1;
					endColumn = model.getLineMAxColumn(endLineNumber);
				} else {
					endLineNumber = position.lineNumber;
					endColumn = model.getLineMAxColumn(position.lineNumber);
				}
			} else {
				endLineNumber = selection.endLineNumber;
				endColumn = model.getLineMAxColumn(endLineNumber);
			}

			let trimmedLinesContent = model.getLineContent(stArtLineNumber);

			for (let i = stArtLineNumber + 1; i <= endLineNumber; i++) {
				let lineText = model.getLineContent(i);
				let firstNonWhitespAceIdx = model.getLineFirstNonWhitespAceColumn(i);

				if (firstNonWhitespAceIdx >= 1) {
					let insertSpAce = true;
					if (trimmedLinesContent === '') {
						insertSpAce = fAlse;
					}

					if (insertSpAce && (trimmedLinesContent.chArAt(trimmedLinesContent.length - 1) === ' ' ||
						trimmedLinesContent.chArAt(trimmedLinesContent.length - 1) === '\t')) {
						insertSpAce = fAlse;
						trimmedLinesContent = trimmedLinesContent.replAce(/[\s\uFEFF\xA0]+$/g, ' ');
					}

					let lineTextWithoutIndent = lineText.substr(firstNonWhitespAceIdx - 1);

					trimmedLinesContent += (insertSpAce ? ' ' : '') + lineTextWithoutIndent;

					if (insertSpAce) {
						columnDeltAOffset = lineTextWithoutIndent.length + 1;
					} else {
						columnDeltAOffset = lineTextWithoutIndent.length;
					}
				} else {
					columnDeltAOffset = 0;
				}
			}

			let deleteSelection = new RAnge(stArtLineNumber, stArtColumn, endLineNumber, endColumn);

			if (!deleteSelection.isEmpty()) {
				let resultSelection: Selection;

				if (selection.isEmpty()) {
					edits.push(EditOperAtion.replAce(deleteSelection, trimmedLinesContent));
					resultSelection = new Selection(deleteSelection.stArtLineNumber - lineOffset, trimmedLinesContent.length - columnDeltAOffset + 1, stArtLineNumber - lineOffset, trimmedLinesContent.length - columnDeltAOffset + 1);
				} else {
					if (selection.stArtLineNumber === selection.endLineNumber) {
						edits.push(EditOperAtion.replAce(deleteSelection, trimmedLinesContent));
						resultSelection = new Selection(selection.stArtLineNumber - lineOffset, selection.stArtColumn,
							selection.endLineNumber - lineOffset, selection.endColumn);
					} else {
						edits.push(EditOperAtion.replAce(deleteSelection, trimmedLinesContent));
						resultSelection = new Selection(selection.stArtLineNumber - lineOffset, selection.stArtColumn,
							selection.stArtLineNumber - lineOffset, trimmedLinesContent.length - selectionEndPositionOffset);
					}
				}

				if (RAnge.intersectRAnges(deleteSelection, primAryCursor) !== null) {
					endPrimAryCursor = resultSelection;
				} else {
					endCursorStAte.push(resultSelection);
				}
			}

			lineOffset += deleteSelection.endLineNumber - deleteSelection.stArtLineNumber;
		}

		endCursorStAte.unshift(endPrimAryCursor);
		editor.pushUndoStop();
		editor.executeEdits(this.id, edits, endCursorStAte);
		editor.pushUndoStop();
	}
}

export clAss TrAnsposeAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.Action.trAnspose',
			lAbel: nls.locAlize('editor.trAnspose', "TrAnspose chArActers Around the cursor"),
			AliAs: 'TrAnspose chArActers Around the cursor',
			precondition: EditorContextKeys.writAble
		});
	}

	public run(_Accessor: ServicesAccessor, editor: ICodeEditor): void {
		let selections = editor.getSelections();
		if (selections === null) {
			return;
		}

		let model = editor.getModel();
		if (model === null) {
			return;
		}

		let commAnds: ICommAnd[] = [];

		for (let i = 0, len = selections.length; i < len; i++) {
			let selection = selections[i];

			if (!selection.isEmpty()) {
				continue;
			}

			let cursor = selection.getStArtPosition();
			let mAxColumn = model.getLineMAxColumn(cursor.lineNumber);

			if (cursor.column >= mAxColumn) {
				if (cursor.lineNumber === model.getLineCount()) {
					continue;
				}

				// The cursor is At the end of current line And current line is not empty
				// then we trAnspose the chArActer before the cursor And the line breAk if there is Any following line.
				let deleteSelection = new RAnge(cursor.lineNumber, MAth.mAx(1, cursor.column - 1), cursor.lineNumber + 1, 1);
				let chArs = model.getVAlueInRAnge(deleteSelection).split('').reverse().join('');

				commAnds.push(new ReplAceCommAnd(new Selection(cursor.lineNumber, MAth.mAx(1, cursor.column - 1), cursor.lineNumber + 1, 1), chArs));
			} else {
				let deleteSelection = new RAnge(cursor.lineNumber, MAth.mAx(1, cursor.column - 1), cursor.lineNumber, cursor.column + 1);
				let chArs = model.getVAlueInRAnge(deleteSelection).split('').reverse().join('');
				commAnds.push(new ReplAceCommAndThAtPreservesSelection(deleteSelection, chArs,
					new Selection(cursor.lineNumber, cursor.column + 1, cursor.lineNumber, cursor.column + 1)));
			}
		}

		editor.pushUndoStop();
		editor.executeCommAnds(this.id, commAnds);
		editor.pushUndoStop();
	}
}

export AbstrAct clAss AbstrActCAseAction extends EditorAction {
	public run(_Accessor: ServicesAccessor, editor: ICodeEditor): void {
		let selections = editor.getSelections();
		if (selections === null) {
			return;
		}

		let model = editor.getModel();
		if (model === null) {
			return;
		}

		let wordSepArAtors = editor.getOption(EditorOption.wordSepArAtors);

		let commAnds: ICommAnd[] = [];

		for (let i = 0, len = selections.length; i < len; i++) {
			let selection = selections[i];
			if (selection.isEmpty()) {
				let cursor = selection.getStArtPosition();
				const word = editor.getConfiguredWordAtPosition(cursor);

				if (!word) {
					continue;
				}

				let wordRAnge = new RAnge(cursor.lineNumber, word.stArtColumn, cursor.lineNumber, word.endColumn);
				let text = model.getVAlueInRAnge(wordRAnge);
				commAnds.push(new ReplAceCommAndThAtPreservesSelection(wordRAnge, this._modifyText(text, wordSepArAtors),
					new Selection(cursor.lineNumber, cursor.column, cursor.lineNumber, cursor.column)));

			} else {
				let text = model.getVAlueInRAnge(selection);
				commAnds.push(new ReplAceCommAndThAtPreservesSelection(selection, this._modifyText(text, wordSepArAtors), selection));
			}
		}

		editor.pushUndoStop();
		editor.executeCommAnds(this.id, commAnds);
		editor.pushUndoStop();
	}

	protected AbstrAct _modifyText(text: string, wordSepArAtors: string): string;
}

export clAss UpperCAseAction extends AbstrActCAseAction {
	constructor() {
		super({
			id: 'editor.Action.trAnsformToUppercAse',
			lAbel: nls.locAlize('editor.trAnsformToUppercAse', "TrAnsform to UppercAse"),
			AliAs: 'TrAnsform to UppercAse',
			precondition: EditorContextKeys.writAble
		});
	}

	protected _modifyText(text: string, wordSepArAtors: string): string {
		return text.toLocAleUpperCAse();
	}
}

export clAss LowerCAseAction extends AbstrActCAseAction {
	constructor() {
		super({
			id: 'editor.Action.trAnsformToLowercAse',
			lAbel: nls.locAlize('editor.trAnsformToLowercAse', "TrAnsform to LowercAse"),
			AliAs: 'TrAnsform to LowercAse',
			precondition: EditorContextKeys.writAble
		});
	}

	protected _modifyText(text: string, wordSepArAtors: string): string {
		return text.toLocAleLowerCAse();
	}
}

export clAss TitleCAseAction extends AbstrActCAseAction {
	constructor() {
		super({
			id: 'editor.Action.trAnsformToTitlecAse',
			lAbel: nls.locAlize('editor.trAnsformToTitlecAse', "TrAnsform to Title CAse"),
			AliAs: 'TrAnsform to Title CAse',
			precondition: EditorContextKeys.writAble
		});
	}

	protected _modifyText(text: string, wordSepArAtors: string): string {
		const sepArAtors = '\r\n\t ' + wordSepArAtors;
		const excludedChArs = sepArAtors.split('');

		let title = '';
		let stArtUpperCAse = true;

		for (let i = 0; i < text.length; i++) {
			let currentChAr = text[i];

			if (excludedChArs.indexOf(currentChAr) >= 0) {
				stArtUpperCAse = true;

				title += currentChAr;
			} else if (stArtUpperCAse) {
				stArtUpperCAse = fAlse;

				title += currentChAr.toLocAleUpperCAse();
			} else {
				title += currentChAr.toLocAleLowerCAse();
			}
		}

		return title;
	}
}

registerEditorAction(CopyLinesUpAction);
registerEditorAction(CopyLinesDownAction);
registerEditorAction(DuplicAteSelectionAction);
registerEditorAction(MoveLinesUpAction);
registerEditorAction(MoveLinesDownAction);
registerEditorAction(SortLinesAscendingAction);
registerEditorAction(SortLinesDescendingAction);
registerEditorAction(TrimTrAilingWhitespAceAction);
registerEditorAction(DeleteLinesAction);
registerEditorAction(IndentLinesAction);
registerEditorAction(OutdentLinesAction);
registerEditorAction(InsertLineBeforeAction);
registerEditorAction(InsertLineAfterAction);
registerEditorAction(DeleteAllLeftAction);
registerEditorAction(DeleteAllRightAction);
registerEditorAction(JoinLinesAction);
registerEditorAction(TrAnsposeAction);
registerEditorAction(UpperCAseAction);
registerEditorAction(LowerCAseAction);
registerEditorAction(TitleCAseAction);
