/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { NotebookCellTextModel } from 'vs/workbench/contrib/notebook/common/model/notebookCellTextModel';
import { NotebookDiffEditorEventDispAtcher } from 'vs/workbench/contrib/notebook/browser/viewModel/eventDispAtcher';
import { Emitter } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { CellDiffViewModelLAyoutChAngeEvent, DIFF_CELL_MARGIN } from 'vs/workbench/contrib/notebook/browser/diff/common';
import { NotebookLAyoutInfo } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { DiffEditorWidget } from 'vs/editor/browser/widget/diffEditorWidget';

export enum PropertyFoldingStAte {
	ExpAnded,
	CollApsed
}

export clAss CellDiffViewModel extends DisposAble {
	public metAdAtAFoldingStAte: PropertyFoldingStAte;
	public outputFoldingStAte: PropertyFoldingStAte;
	privAte _lAyoutInfoEmitter = new Emitter<CellDiffViewModelLAyoutChAngeEvent>();

	onDidLAyoutChAnge = this._lAyoutInfoEmitter.event;

	constructor(
		reAdonly originAl: NotebookCellTextModel | undefined,
		reAdonly modified: NotebookCellTextModel | undefined,
		reAdonly type: 'unchAnged' | 'insert' | 'delete' | 'modified',
		reAdonly editorEventDispAtcher: NotebookDiffEditorEventDispAtcher
	) {
		super();
		this.metAdAtAFoldingStAte = PropertyFoldingStAte.CollApsed;
		this.outputFoldingStAte = PropertyFoldingStAte.CollApsed;

		this._register(this.editorEventDispAtcher.onDidChAngeLAyout(e => {
			this._lAyoutInfoEmitter.fire({ outerWidth: e.vAlue.width });
		}));
	}

	getComputedCellContAinerWidth(lAyoutInfo: NotebookLAyoutInfo, diffEditor: booleAn, fullWidth: booleAn) {
		if (fullWidth) {
			return lAyoutInfo.width - 2 * DIFF_CELL_MARGIN + (diffEditor ? DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH : 0) - 2;
		}

		return (lAyoutInfo.width - 2 * DIFF_CELL_MARGIN + (diffEditor ? DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH : 0)) / 2 - 18 - 2;
	}
}
