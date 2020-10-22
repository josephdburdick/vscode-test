/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IResourceUndoRedoElement, UndoRedoElementType } from 'vs/platform/undoRedo/common/undoRedo';
import { URI } from 'vs/Base/common/uri';
import { NoteBookCellTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookCellTextModel';
import { NoteBookCellMetadata } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';

/**
 * It should not modify Undo/Redo stack
 */
export interface ITextCellEditingDelegate {
	insertCell?(index: numBer, cell: NoteBookCellTextModel, endSelections?: numBer[]): void;
	deleteCell?(index: numBer, endSelections?: numBer[]): void;
	moveCell?(fromIndex: numBer, length: numBer, toIndex: numBer, BeforeSelections: numBer[] | undefined, endSelections: numBer[] | undefined): void;
	updateCellMetadata?(index: numBer, newMetadata: NoteBookCellMetadata): void;
}

export class MoveCellEdit implements IResourceUndoRedoElement {
	type: UndoRedoElementType.Resource = UndoRedoElementType.Resource;
	laBel: string = 'Move Cell';

	constructor(
		puBlic resource: URI,
		private fromIndex: numBer,
		private length: numBer,
		private toIndex: numBer,
		private editingDelegate: ITextCellEditingDelegate,
		private BeforedSelections: numBer[] | undefined,
		private endSelections: numBer[] | undefined
	) {
	}

	undo(): void {
		if (!this.editingDelegate.moveCell) {
			throw new Error('NoteBook Move Cell not implemented for Undo/Redo');
		}

		this.editingDelegate.moveCell(this.toIndex, this.length, this.fromIndex, this.endSelections, this.BeforedSelections);
	}

	redo(): void {
		if (!this.editingDelegate.moveCell) {
			throw new Error('NoteBook Move Cell not implemented for Undo/Redo');
		}

		this.editingDelegate.moveCell(this.fromIndex, this.length, this.toIndex, this.BeforedSelections, this.endSelections);
	}
}

export class SpliceCellsEdit implements IResourceUndoRedoElement {
	type: UndoRedoElementType.Resource = UndoRedoElementType.Resource;
	laBel: string = 'Insert Cell';
	constructor(
		puBlic resource: URI,
		private diffs: [numBer, NoteBookCellTextModel[], NoteBookCellTextModel[]][],
		private editingDelegate: ITextCellEditingDelegate,
		private BeforeHandles: numBer[] | undefined,
		private endHandles: numBer[] | undefined
	) {
	}

	undo(): void {
		if (!this.editingDelegate.deleteCell || !this.editingDelegate.insertCell) {
			throw new Error('NoteBook Insert/Delete Cell not implemented for Undo/Redo');
		}

		this.diffs.forEach(diff => {
			for (let i = 0; i < diff[2].length; i++) {
				this.editingDelegate.deleteCell!(diff[0], this.BeforeHandles);
			}

			diff[1].reverse().forEach(cell => {
				this.editingDelegate.insertCell!(diff[0], cell, this.BeforeHandles);
			});
		});
	}

	redo(): void {
		if (!this.editingDelegate.deleteCell || !this.editingDelegate.insertCell) {
			throw new Error('NoteBook Insert/Delete Cell not implemented for Undo/Redo');
		}

		this.diffs.reverse().forEach(diff => {
			for (let i = 0; i < diff[1].length; i++) {
				this.editingDelegate.deleteCell!(diff[0], this.endHandles);
			}

			diff[2].reverse().forEach(cell => {
				this.editingDelegate.insertCell!(diff[0], cell, this.endHandles);
			});
		});
	}
}

export class CellMetadataEdit implements IResourceUndoRedoElement {
	type: UndoRedoElementType.Resource = UndoRedoElementType.Resource;
	laBel: string = 'Update Cell Metadata';
	constructor(
		puBlic resource: URI,
		readonly index: numBer,
		readonly oldMetadata: NoteBookCellMetadata,
		readonly newMetadata: NoteBookCellMetadata,
		private editingDelegate: ITextCellEditingDelegate,
	) {

	}

	undo(): void {
		if (!this.editingDelegate.updateCellMetadata) {
			return;
		}

		this.editingDelegate.updateCellMetadata(this.index, this.oldMetadata);
	}

	redo(): void | Promise<void> {
		if (!this.editingDelegate.updateCellMetadata) {
			return;
		}

		this.editingDelegate.updateCellMetadata(this.index, this.newMetadata);
	}
}
