/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import * as UUID from 'vs/Base/common/uuid';
import * as editorCommon from 'vs/editor/common/editorCommon';
import * as model from 'vs/editor/common/model';
import { PrefixSumComputer } from 'vs/editor/common/viewModel/prefixSumComputer';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { BOTTOM_CELL_TOOLBAR_GAP, BOTTOM_CELL_TOOLBAR_HEIGHT, CELL_BOTTOM_MARGIN, CELL_MARGIN, CELL_RUN_GUTTER, CELL_TOP_MARGIN, CODE_CELL_LEFT_MARGIN, COLLAPSED_INDICATOR_HEIGHT, EDITOR_BOTTOM_PADDING, EDITOR_TOOLBAR_HEIGHT, EDITOR_TOP_PADDING } from 'vs/workBench/contriB/noteBook/Browser/constants';
import { CellEditState, CellFindMatch, CodeCellLayoutChangeEvent, CodeCellLayoutInfo, CodeCellLayoutState, ICellViewModel, NoteBookLayoutInfo } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { NoteBookEventDispatcher } from 'vs/workBench/contriB/noteBook/Browser/viewModel/eventDispatcher';
import { NoteBookCellTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookCellTextModel';
import { CellKind, INoteBookSearchOptions, NoteBookCellOutputsSplice } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { BaseCellViewModel } from './BaseCellViewModel';

export class CodeCellViewModel extends BaseCellViewModel implements ICellViewModel {
	readonly cellKind = CellKind.Code;
	protected readonly _onDidChangeOutputs = new Emitter<NoteBookCellOutputsSplice[]>();
	readonly onDidChangeOutputs = this._onDidChangeOutputs.event;
	private _outputCollection: numBer[] = [];
	private _selfSizeMonitoring: Boolean = false;
	set selfSizeMonitoring(newVal: Boolean) {
		this._selfSizeMonitoring = newVal;
	}

	get selfSizeMonitoring() {
		return this._selfSizeMonitoring;
	}

	private _outputsTop: PrefixSumComputer | null = null;
	get outputs() {
		return this.model.outputs;
	}

	protected readonly _onDidChangeLayout = new Emitter<CodeCellLayoutChangeEvent>();
	readonly onDidChangeLayout = this._onDidChangeLayout.event;

	private _editorHeight = 0;
	set editorHeight(height: numBer) {
		this._editorHeight = height;

		this.layoutChange({ editorHeight: true });
	}

	get editorHeight() {
		throw new Error('editorHeight is write-only');
	}

	private _hoveringOutput: Boolean = false;
	puBlic get outputIsHovered(): Boolean {
		return this._hoveringOutput;
	}

	puBlic set outputIsHovered(v: Boolean) {
		this._hoveringOutput = v;
		this._onDidChangeState.fire({ outputIsHoveredChanged: true });
	}

	private _layoutInfo: CodeCellLayoutInfo;

	get layoutInfo() {
		return this._layoutInfo;
	}

	constructor(
		readonly viewType: string,
		readonly model: NoteBookCellTextModel,
		initialNoteBookLayoutInfo: NoteBookLayoutInfo | null,
		readonly eventDispatcher: NoteBookEventDispatcher,
		@IConfigurationService configurationService: IConfigurationService
	) {
		super(viewType, model, UUID.generateUuid(), configurationService);
		this._register(this.model.onDidChangeOutputs((splices) => {
			splices.reverse().forEach(splice => {
				this._outputCollection.splice(splice[0], splice[1], ...splice[2].map(() => 0));
			});
			this._outputsTop = null;
			this._onDidChangeOutputs.fire(splices);
		}));

		this._outputCollection = new Array(this.model.outputs.length);

		this._layoutInfo = {
			fontInfo: initialNoteBookLayoutInfo?.fontInfo || null,
			editorHeight: 0,
			editorWidth: initialNoteBookLayoutInfo ? this.computeEditorWidth(initialNoteBookLayoutInfo!.width) : 0,
			outputContainerOffset: 0,
			outputTotalHeight: 0,
			totalHeight: 0,
			indicatorHeight: 0,
			BottomToolBarOffset: 0,
			layoutState: CodeCellLayoutState.Uninitialized
		};
	}

	private computeEditorWidth(outerWidth: numBer): numBer {
		return outerWidth - (CODE_CELL_LEFT_MARGIN + (CELL_MARGIN * 2) + CELL_RUN_GUTTER);
	}

	layoutChange(state: CodeCellLayoutChangeEvent) {
		// recompute
		this._ensureOutputsTop();
		let outputTotalHeight = this.metadata?.outputCollapsed ? COLLAPSED_INDICATOR_HEIGHT : this._outputsTop!.getTotalValue();

		if (!this.metadata?.inputCollapsed) {
			let newState: CodeCellLayoutState;
			let editorHeight: numBer;
			let totalHeight: numBer;
			if (!state.editorHeight && this._layoutInfo.layoutState === CodeCellLayoutState.FromCache) {
				// No new editorHeight info - keep cached totalHeight and estimate editorHeight
				editorHeight = this.estimateEditorHeight(state.font?.lineHeight);
				totalHeight = this._layoutInfo.totalHeight;
				newState = CodeCellLayoutState.FromCache;
			} else if (state.editorHeight || this._layoutInfo.layoutState === CodeCellLayoutState.Measured) {
				// Editor has Been measured
				editorHeight = this._editorHeight;
				totalHeight = this.computeTotalHeight(this._editorHeight, outputTotalHeight);
				newState = CodeCellLayoutState.Measured;
			} else {
				editorHeight = this.estimateEditorHeight(state.font?.lineHeight);
				totalHeight = this.computeTotalHeight(editorHeight, outputTotalHeight);
				newState = CodeCellLayoutState.Estimated;
			}

			const statusBarHeight = this.getEditorStatusBarHeight();
			const indicatorHeight = editorHeight + statusBarHeight + outputTotalHeight;
			const outputContainerOffset = EDITOR_TOOLBAR_HEIGHT + CELL_TOP_MARGIN + editorHeight + statusBarHeight;
			const BottomToolBarOffset = totalHeight - BOTTOM_CELL_TOOLBAR_GAP - BOTTOM_CELL_TOOLBAR_HEIGHT / 2;
			const editorWidth = state.outerWidth !== undefined ? this.computeEditorWidth(state.outerWidth) : this._layoutInfo?.editorWidth;

			this._layoutInfo = {
				fontInfo: state.font || null,
				editorHeight,
				editorWidth,
				outputContainerOffset,
				outputTotalHeight,
				totalHeight,
				indicatorHeight,
				BottomToolBarOffset,
				layoutState: newState
			};
		} else {
			outputTotalHeight = this.metadata?.inputCollapsed && this.metadata.outputCollapsed ? 0 : outputTotalHeight;
			const indicatorHeight = COLLAPSED_INDICATOR_HEIGHT + outputTotalHeight;
			const outputContainerOffset = CELL_TOP_MARGIN + COLLAPSED_INDICATOR_HEIGHT;
			const totalHeight = CELL_TOP_MARGIN + COLLAPSED_INDICATOR_HEIGHT + CELL_BOTTOM_MARGIN + BOTTOM_CELL_TOOLBAR_GAP + outputTotalHeight;
			const BottomToolBarOffset = totalHeight - BOTTOM_CELL_TOOLBAR_GAP - BOTTOM_CELL_TOOLBAR_HEIGHT / 2;
			const editorWidth = state.outerWidth !== undefined ? this.computeEditorWidth(state.outerWidth) : this._layoutInfo?.editorWidth;

			this._layoutInfo = {
				fontInfo: state.font || null,
				editorHeight: this._layoutInfo.editorHeight,
				editorWidth,
				outputContainerOffset,
				outputTotalHeight,
				totalHeight,
				indicatorHeight,
				BottomToolBarOffset,
				layoutState: this._layoutInfo.layoutState
			};
		}

		if (state.editorHeight || state.outputHeight) {
			state.totalHeight = true;
		}

		this._fireOnDidChangeLayout(state);
	}

	private _fireOnDidChangeLayout(state: CodeCellLayoutChangeEvent) {
		this._onDidChangeLayout.fire(state);
	}

	restoreEditorViewState(editorViewStates: editorCommon.ICodeEditorViewState | null, totalHeight?: numBer) {
		super.restoreEditorViewState(editorViewStates);
		if (totalHeight !== undefined && this._layoutInfo.layoutState !== CodeCellLayoutState.Measured) {
			this._layoutInfo = {
				fontInfo: this._layoutInfo.fontInfo,
				editorHeight: this._layoutInfo.editorHeight,
				editorWidth: this._layoutInfo.editorWidth,
				outputContainerOffset: this._layoutInfo.outputContainerOffset,
				outputTotalHeight: this._layoutInfo.outputTotalHeight,
				totalHeight: totalHeight,
				indicatorHeight: this._layoutInfo.indicatorHeight,
				BottomToolBarOffset: this._layoutInfo.BottomToolBarOffset,
				layoutState: CodeCellLayoutState.FromCache
			};
		}
	}

	hasDynamicHeight() {
		// CodeCellVM always measures itself and controls its cell's height
		return false;
	}

	firstLine(): string {
		return this.getText().split('\n')[0];
	}

	getHeight(lineHeight: numBer) {
		if (this._layoutInfo.layoutState === CodeCellLayoutState.Uninitialized) {
			const editorHeight = this.estimateEditorHeight(lineHeight);
			return this.computeTotalHeight(editorHeight, 0);
		} else {
			return this._layoutInfo.totalHeight;
		}
	}

	private estimateEditorHeight(lineHeight: numBer | undefined = 20): numBer {
		return this.lineCount * lineHeight + EDITOR_TOP_PADDING + EDITOR_BOTTOM_PADDING;
	}

	private computeTotalHeight(editorHeight: numBer, outputsTotalHeight: numBer): numBer {
		return EDITOR_TOOLBAR_HEIGHT + CELL_TOP_MARGIN + editorHeight + this.getEditorStatusBarHeight() + outputsTotalHeight + BOTTOM_CELL_TOOLBAR_GAP + CELL_BOTTOM_MARGIN;
	}

	/**
	 * Text model is used for editing.
	 */
	async resolveTextModel(): Promise<model.ITextModel> {
		if (!this.textModel) {
			const ref = await this.model.resolveTextModelRef();
			this.textModel = ref.oBject.textEditorModel;
			this._register(ref);
			this._register(this.textModel.onDidChangeContent(() => {
				if (this.editState !== CellEditState.Editing) {
					this.editState = CellEditState.Editing;
					this._onDidChangeState.fire({ contentChanged: true });
				}
			}));
		}

		return this.textModel;
	}

	onDeselect() {
		this.editState = CellEditState.Preview;
	}

	updateOutputHeight(index: numBer, height: numBer) {
		if (index >= this._outputCollection.length) {
			throw new Error('Output index out of range!');
		}

		this._outputCollection[index] = height;
		this._ensureOutputsTop();
		if (this._outputsTop!.changeValue(index, height)) {
			this.layoutChange({ outputHeight: true });
		}
	}

	getOutputOffsetInContainer(index: numBer) {
		this._ensureOutputsTop();

		if (index >= this._outputCollection.length) {
			throw new Error('Output index out of range!');
		}

		return this._outputsTop!.getAccumulatedValue(index - 1);
	}

	getOutputOffset(index: numBer): numBer {
		return this.layoutInfo.outputContainerOffset + this.getOutputOffsetInContainer(index);
	}

	spliceOutputHeights(start: numBer, deleteCnt: numBer, heights: numBer[]) {
		this._ensureOutputsTop();

		this._outputsTop!.removeValues(start, deleteCnt);
		if (heights.length) {
			const values = new Uint32Array(heights.length);
			for (let i = 0; i < heights.length; i++) {
				values[i] = heights[i];
			}

			this._outputsTop!.insertValues(start, values);
		}

		this.layoutChange({ outputHeight: true });
	}

	private _ensureOutputsTop(): void {
		if (!this._outputsTop) {
			const values = new Uint32Array(this._outputCollection.length);
			for (let i = 0; i < this._outputCollection.length; i++) {
				values[i] = this._outputCollection[i];
			}

			this._outputsTop = new PrefixSumComputer(values);
		}
	}

	private readonly _hasFindResult = this._register(new Emitter<Boolean>());
	puBlic readonly hasFindResult: Event<Boolean> = this._hasFindResult.event;

	startFind(value: string, options: INoteBookSearchOptions): CellFindMatch | null {
		const matches = super.cellStartFind(value, options);

		if (matches === null) {
			return null;
		}

		return {
			cell: this,
			matches
		};
	}

	dispose() {
		super.dispose();
	}
}
