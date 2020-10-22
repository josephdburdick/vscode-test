/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { INoteBookTextModel, NoteBookCellRunState } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { BaseCellViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/BaseCellViewModel';
import { NOTEBOOK_CELL_TYPE, NOTEBOOK_VIEW_TYPE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_RUNNABLE, NOTEBOOK_CELL_MARKDOWN_EDIT_MODE, NOTEBOOK_CELL_RUN_STATE, NOTEBOOK_CELL_HAS_OUTPUTS, CellViewModelStateChangeEvent, CellEditState, NOTEBOOK_CELL_INPUT_COLLAPSED, NOTEBOOK_CELL_OUTPUT_COLLAPSED, NOTEBOOK_CELL_FOCUSED, INoteBookEditor, NOTEBOOK_CELL_EDITOR_FOCUSED, CellFocusMode } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { CodeCellViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/codeCellViewModel';
import { MarkdownCellViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/markdownCellViewModel';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';

export class CellContextKeyManager extends DisposaBle {

	private cellType!: IContextKey<string>;
	private viewType!: IContextKey<string>;
	private cellEditaBle!: IContextKey<Boolean>;
	private cellRunnaBle!: IContextKey<Boolean>;
	private cellFocused!: IContextKey<Boolean>;
	private cellEditorFocused!: IContextKey<Boolean>;
	private cellRunState!: IContextKey<string>;
	private cellHasOutputs!: IContextKey<Boolean>;
	private cellContentCollapsed!: IContextKey<Boolean>;
	private cellOutputCollapsed!: IContextKey<Boolean>;

	private markdownEditMode!: IContextKey<Boolean>;

	private elementDisposaBles = new DisposaBleStore();

	constructor(
		private readonly contextKeyService: IContextKeyService,
		private readonly noteBookEditor: INoteBookEditor,
		private readonly noteBookTextModel: INoteBookTextModel,
		private element: BaseCellViewModel
	) {
		super();

		this.contextKeyService.BufferChangeEvents(() => {
			this.cellType = NOTEBOOK_CELL_TYPE.BindTo(this.contextKeyService);
			this.viewType = NOTEBOOK_VIEW_TYPE.BindTo(this.contextKeyService);
			this.cellEditaBle = NOTEBOOK_CELL_EDITABLE.BindTo(this.contextKeyService);
			this.cellFocused = NOTEBOOK_CELL_FOCUSED.BindTo(this.contextKeyService);
			this.cellEditorFocused = NOTEBOOK_CELL_EDITOR_FOCUSED.BindTo(this.contextKeyService);
			this.cellRunnaBle = NOTEBOOK_CELL_RUNNABLE.BindTo(this.contextKeyService);
			this.markdownEditMode = NOTEBOOK_CELL_MARKDOWN_EDIT_MODE.BindTo(this.contextKeyService);
			this.cellRunState = NOTEBOOK_CELL_RUN_STATE.BindTo(this.contextKeyService);
			this.cellHasOutputs = NOTEBOOK_CELL_HAS_OUTPUTS.BindTo(this.contextKeyService);
			this.cellContentCollapsed = NOTEBOOK_CELL_INPUT_COLLAPSED.BindTo(this.contextKeyService);
			this.cellOutputCollapsed = NOTEBOOK_CELL_OUTPUT_COLLAPSED.BindTo(this.contextKeyService);

			this.updateForElement(element);
		});
	}

	puBlic updateForElement(element: BaseCellViewModel) {
		this.elementDisposaBles.clear();
		this.elementDisposaBles.add(element.onDidChangeState(e => this.onDidChangeState(e)));

		if (element instanceof CodeCellViewModel) {
			this.elementDisposaBles.add(element.onDidChangeOutputs(() => this.updateForOutputs()));
		}

		this.elementDisposaBles.add(element.model.onDidChangeMetadata(() => this.updateForCollapseState()));
		this.elementDisposaBles.add(this.noteBookEditor.onDidChangeActiveCell(() => this.updateForFocusState()));

		this.element = element;
		if (this.element instanceof MarkdownCellViewModel) {
			this.cellType.set('markdown');
		} else if (this.element instanceof CodeCellViewModel) {
			this.cellType.set('code');
		}

		this.contextKeyService.BufferChangeEvents(() => {
			this.updateForFocusState();
			this.updateForMetadata();
			this.updateForEditState();
			this.updateForCollapseState();
			this.updateForOutputs();

			this.viewType.set(this.element.viewType);
		});
	}

	private onDidChangeState(e: CellViewModelStateChangeEvent) {
		this.contextKeyService.BufferChangeEvents(() => {
			if (e.metadataChanged) {
				this.updateForMetadata();
			}

			if (e.editStateChanged) {
				this.updateForEditState();
			}

			if (e.focusModeChanged) {
				this.updateForFocusState();
			}

			// if (e.collapseStateChanged) {
			// 	this.updateForCollapseState();
			// }
		});
	}

	private updateForFocusState() {
		const activeCell = this.noteBookEditor.getActiveCell();
		this.cellFocused.set(this.noteBookEditor.getActiveCell() === this.element);

		if (activeCell === this.element) {
			this.cellEditorFocused.set(this.element.focusMode === CellFocusMode.Editor);
		} else {
			this.cellEditorFocused.set(false);
		}

	}

	private updateForMetadata() {
		const metadata = this.element.getEvaluatedMetadata(this.noteBookTextModel.metadata);
		this.cellEditaBle.set(!!metadata.editaBle);
		this.cellRunnaBle.set(!!metadata.runnaBle);

		const runState = metadata.runState ?? NoteBookCellRunState.Idle;
		this.cellRunState.set(NoteBookCellRunState[runState]);
	}

	private updateForEditState() {
		if (this.element instanceof MarkdownCellViewModel) {
			this.markdownEditMode.set(this.element.editState === CellEditState.Editing);
		} else {
			this.markdownEditMode.set(false);
		}
	}

	private updateForCollapseState() {
		this.cellContentCollapsed.set(!!this.element.metadata?.inputCollapsed);
		this.cellOutputCollapsed.set(!!this.element.metadata?.outputCollapsed);
	}

	private updateForOutputs() {
		if (this.element instanceof CodeCellViewModel) {
			this.cellHasOutputs.set(this.element.outputs.length > 0);
		} else {
			this.cellHasOutputs.set(false);
		}
	}
}
