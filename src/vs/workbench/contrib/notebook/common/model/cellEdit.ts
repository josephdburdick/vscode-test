/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IResourceUndoRedoElement, UndoRedoElementType } from 'vs/plAtform/undoRedo/common/undoRedo';
import { URI } from 'vs/bAse/common/uri';
import { NotebookCellTextModel } from 'vs/workbench/contrib/notebook/common/model/notebookCellTextModel';
import { NotebookCellMetAdAtA } from 'vs/workbench/contrib/notebook/common/notebookCommon';

/**
 * It should not modify Undo/Redo stAck
 */
export interfAce ITextCellEditingDelegAte {
	insertCell?(index: number, cell: NotebookCellTextModel, endSelections?: number[]): void;
	deleteCell?(index: number, endSelections?: number[]): void;
	moveCell?(fromIndex: number, length: number, toIndex: number, beforeSelections: number[] | undefined, endSelections: number[] | undefined): void;
	updAteCellMetAdAtA?(index: number, newMetAdAtA: NotebookCellMetAdAtA): void;
}

export clAss MoveCellEdit implements IResourceUndoRedoElement {
	type: UndoRedoElementType.Resource = UndoRedoElementType.Resource;
	lAbel: string = 'Move Cell';

	constructor(
		public resource: URI,
		privAte fromIndex: number,
		privAte length: number,
		privAte toIndex: number,
		privAte editingDelegAte: ITextCellEditingDelegAte,
		privAte beforedSelections: number[] | undefined,
		privAte endSelections: number[] | undefined
	) {
	}

	undo(): void {
		if (!this.editingDelegAte.moveCell) {
			throw new Error('Notebook Move Cell not implemented for Undo/Redo');
		}

		this.editingDelegAte.moveCell(this.toIndex, this.length, this.fromIndex, this.endSelections, this.beforedSelections);
	}

	redo(): void {
		if (!this.editingDelegAte.moveCell) {
			throw new Error('Notebook Move Cell not implemented for Undo/Redo');
		}

		this.editingDelegAte.moveCell(this.fromIndex, this.length, this.toIndex, this.beforedSelections, this.endSelections);
	}
}

export clAss SpliceCellsEdit implements IResourceUndoRedoElement {
	type: UndoRedoElementType.Resource = UndoRedoElementType.Resource;
	lAbel: string = 'Insert Cell';
	constructor(
		public resource: URI,
		privAte diffs: [number, NotebookCellTextModel[], NotebookCellTextModel[]][],
		privAte editingDelegAte: ITextCellEditingDelegAte,
		privAte beforeHAndles: number[] | undefined,
		privAte endHAndles: number[] | undefined
	) {
	}

	undo(): void {
		if (!this.editingDelegAte.deleteCell || !this.editingDelegAte.insertCell) {
			throw new Error('Notebook Insert/Delete Cell not implemented for Undo/Redo');
		}

		this.diffs.forEAch(diff => {
			for (let i = 0; i < diff[2].length; i++) {
				this.editingDelegAte.deleteCell!(diff[0], this.beforeHAndles);
			}

			diff[1].reverse().forEAch(cell => {
				this.editingDelegAte.insertCell!(diff[0], cell, this.beforeHAndles);
			});
		});
	}

	redo(): void {
		if (!this.editingDelegAte.deleteCell || !this.editingDelegAte.insertCell) {
			throw new Error('Notebook Insert/Delete Cell not implemented for Undo/Redo');
		}

		this.diffs.reverse().forEAch(diff => {
			for (let i = 0; i < diff[1].length; i++) {
				this.editingDelegAte.deleteCell!(diff[0], this.endHAndles);
			}

			diff[2].reverse().forEAch(cell => {
				this.editingDelegAte.insertCell!(diff[0], cell, this.endHAndles);
			});
		});
	}
}

export clAss CellMetAdAtAEdit implements IResourceUndoRedoElement {
	type: UndoRedoElementType.Resource = UndoRedoElementType.Resource;
	lAbel: string = 'UpdAte Cell MetAdAtA';
	constructor(
		public resource: URI,
		reAdonly index: number,
		reAdonly oldMetAdAtA: NotebookCellMetAdAtA,
		reAdonly newMetAdAtA: NotebookCellMetAdAtA,
		privAte editingDelegAte: ITextCellEditingDelegAte,
	) {

	}

	undo(): void {
		if (!this.editingDelegAte.updAteCellMetAdAtA) {
			return;
		}

		this.editingDelegAte.updAteCellMetAdAtA(this.index, this.oldMetAdAtA);
	}

	redo(): void | Promise<void> {
		if (!this.editingDelegAte.updAteCellMetAdAtA) {
			return;
		}

		this.editingDelegAte.updAteCellMetAdAtA(this.index, this.newMetAdAtA);
	}
}
