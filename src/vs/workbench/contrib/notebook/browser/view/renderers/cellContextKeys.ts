/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { INotebookTextModel, NotebookCellRunStAte } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { BAseCellViewModel } from 'vs/workbench/contrib/notebook/browser/viewModel/bAseCellViewModel';
import { NOTEBOOK_CELL_TYPE, NOTEBOOK_VIEW_TYPE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_RUNNABLE, NOTEBOOK_CELL_MARKDOWN_EDIT_MODE, NOTEBOOK_CELL_RUN_STATE, NOTEBOOK_CELL_HAS_OUTPUTS, CellViewModelStAteChAngeEvent, CellEditStAte, NOTEBOOK_CELL_INPUT_COLLAPSED, NOTEBOOK_CELL_OUTPUT_COLLAPSED, NOTEBOOK_CELL_FOCUSED, INotebookEditor, NOTEBOOK_CELL_EDITOR_FOCUSED, CellFocusMode } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { CodeCellViewModel } from 'vs/workbench/contrib/notebook/browser/viewModel/codeCellViewModel';
import { MArkdownCellViewModel } from 'vs/workbench/contrib/notebook/browser/viewModel/mArkdownCellViewModel';
import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';

export clAss CellContextKeyMAnAger extends DisposAble {

	privAte cellType!: IContextKey<string>;
	privAte viewType!: IContextKey<string>;
	privAte cellEditAble!: IContextKey<booleAn>;
	privAte cellRunnAble!: IContextKey<booleAn>;
	privAte cellFocused!: IContextKey<booleAn>;
	privAte cellEditorFocused!: IContextKey<booleAn>;
	privAte cellRunStAte!: IContextKey<string>;
	privAte cellHAsOutputs!: IContextKey<booleAn>;
	privAte cellContentCollApsed!: IContextKey<booleAn>;
	privAte cellOutputCollApsed!: IContextKey<booleAn>;

	privAte mArkdownEditMode!: IContextKey<booleAn>;

	privAte elementDisposAbles = new DisposAbleStore();

	constructor(
		privAte reAdonly contextKeyService: IContextKeyService,
		privAte reAdonly notebookEditor: INotebookEditor,
		privAte reAdonly notebookTextModel: INotebookTextModel,
		privAte element: BAseCellViewModel
	) {
		super();

		this.contextKeyService.bufferChAngeEvents(() => {
			this.cellType = NOTEBOOK_CELL_TYPE.bindTo(this.contextKeyService);
			this.viewType = NOTEBOOK_VIEW_TYPE.bindTo(this.contextKeyService);
			this.cellEditAble = NOTEBOOK_CELL_EDITABLE.bindTo(this.contextKeyService);
			this.cellFocused = NOTEBOOK_CELL_FOCUSED.bindTo(this.contextKeyService);
			this.cellEditorFocused = NOTEBOOK_CELL_EDITOR_FOCUSED.bindTo(this.contextKeyService);
			this.cellRunnAble = NOTEBOOK_CELL_RUNNABLE.bindTo(this.contextKeyService);
			this.mArkdownEditMode = NOTEBOOK_CELL_MARKDOWN_EDIT_MODE.bindTo(this.contextKeyService);
			this.cellRunStAte = NOTEBOOK_CELL_RUN_STATE.bindTo(this.contextKeyService);
			this.cellHAsOutputs = NOTEBOOK_CELL_HAS_OUTPUTS.bindTo(this.contextKeyService);
			this.cellContentCollApsed = NOTEBOOK_CELL_INPUT_COLLAPSED.bindTo(this.contextKeyService);
			this.cellOutputCollApsed = NOTEBOOK_CELL_OUTPUT_COLLAPSED.bindTo(this.contextKeyService);

			this.updAteForElement(element);
		});
	}

	public updAteForElement(element: BAseCellViewModel) {
		this.elementDisposAbles.cleAr();
		this.elementDisposAbles.Add(element.onDidChAngeStAte(e => this.onDidChAngeStAte(e)));

		if (element instAnceof CodeCellViewModel) {
			this.elementDisposAbles.Add(element.onDidChAngeOutputs(() => this.updAteForOutputs()));
		}

		this.elementDisposAbles.Add(element.model.onDidChAngeMetAdAtA(() => this.updAteForCollApseStAte()));
		this.elementDisposAbles.Add(this.notebookEditor.onDidChAngeActiveCell(() => this.updAteForFocusStAte()));

		this.element = element;
		if (this.element instAnceof MArkdownCellViewModel) {
			this.cellType.set('mArkdown');
		} else if (this.element instAnceof CodeCellViewModel) {
			this.cellType.set('code');
		}

		this.contextKeyService.bufferChAngeEvents(() => {
			this.updAteForFocusStAte();
			this.updAteForMetAdAtA();
			this.updAteForEditStAte();
			this.updAteForCollApseStAte();
			this.updAteForOutputs();

			this.viewType.set(this.element.viewType);
		});
	}

	privAte onDidChAngeStAte(e: CellViewModelStAteChAngeEvent) {
		this.contextKeyService.bufferChAngeEvents(() => {
			if (e.metAdAtAChAnged) {
				this.updAteForMetAdAtA();
			}

			if (e.editStAteChAnged) {
				this.updAteForEditStAte();
			}

			if (e.focusModeChAnged) {
				this.updAteForFocusStAte();
			}

			// if (e.collApseStAteChAnged) {
			// 	this.updAteForCollApseStAte();
			// }
		});
	}

	privAte updAteForFocusStAte() {
		const ActiveCell = this.notebookEditor.getActiveCell();
		this.cellFocused.set(this.notebookEditor.getActiveCell() === this.element);

		if (ActiveCell === this.element) {
			this.cellEditorFocused.set(this.element.focusMode === CellFocusMode.Editor);
		} else {
			this.cellEditorFocused.set(fAlse);
		}

	}

	privAte updAteForMetAdAtA() {
		const metAdAtA = this.element.getEvAluAtedMetAdAtA(this.notebookTextModel.metAdAtA);
		this.cellEditAble.set(!!metAdAtA.editAble);
		this.cellRunnAble.set(!!metAdAtA.runnAble);

		const runStAte = metAdAtA.runStAte ?? NotebookCellRunStAte.Idle;
		this.cellRunStAte.set(NotebookCellRunStAte[runStAte]);
	}

	privAte updAteForEditStAte() {
		if (this.element instAnceof MArkdownCellViewModel) {
			this.mArkdownEditMode.set(this.element.editStAte === CellEditStAte.Editing);
		} else {
			this.mArkdownEditMode.set(fAlse);
		}
	}

	privAte updAteForCollApseStAte() {
		this.cellContentCollApsed.set(!!this.element.metAdAtA?.inputCollApsed);
		this.cellOutputCollApsed.set(!!this.element.metAdAtA?.outputCollApsed);
	}

	privAte updAteForOutputs() {
		if (this.element instAnceof CodeCellViewModel) {
			this.cellHAsOutputs.set(this.element.outputs.length > 0);
		} else {
			this.cellHAsOutputs.set(fAlse);
		}
	}
}
