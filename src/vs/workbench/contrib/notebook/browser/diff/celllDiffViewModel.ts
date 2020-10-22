/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NoteBookCellTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookCellTextModel';
import { NoteBookDiffEditorEventDispatcher } from 'vs/workBench/contriB/noteBook/Browser/viewModel/eventDispatcher';
import { Emitter } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { CellDiffViewModelLayoutChangeEvent, DIFF_CELL_MARGIN } from 'vs/workBench/contriB/noteBook/Browser/diff/common';
import { NoteBookLayoutInfo } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { DiffEditorWidget } from 'vs/editor/Browser/widget/diffEditorWidget';

export enum PropertyFoldingState {
	Expanded,
	Collapsed
}

export class CellDiffViewModel extends DisposaBle {
	puBlic metadataFoldingState: PropertyFoldingState;
	puBlic outputFoldingState: PropertyFoldingState;
	private _layoutInfoEmitter = new Emitter<CellDiffViewModelLayoutChangeEvent>();

	onDidLayoutChange = this._layoutInfoEmitter.event;

	constructor(
		readonly original: NoteBookCellTextModel | undefined,
		readonly modified: NoteBookCellTextModel | undefined,
		readonly type: 'unchanged' | 'insert' | 'delete' | 'modified',
		readonly editorEventDispatcher: NoteBookDiffEditorEventDispatcher
	) {
		super();
		this.metadataFoldingState = PropertyFoldingState.Collapsed;
		this.outputFoldingState = PropertyFoldingState.Collapsed;

		this._register(this.editorEventDispatcher.onDidChangeLayout(e => {
			this._layoutInfoEmitter.fire({ outerWidth: e.value.width });
		}));
	}

	getComputedCellContainerWidth(layoutInfo: NoteBookLayoutInfo, diffEditor: Boolean, fullWidth: Boolean) {
		if (fullWidth) {
			return layoutInfo.width - 2 * DIFF_CELL_MARGIN + (diffEditor ? DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH : 0) - 2;
		}

		return (layoutInfo.width - 2 * DIFF_CELL_MARGIN + (diffEditor ? DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH : 0)) / 2 - 18 - 2;
	}
}
