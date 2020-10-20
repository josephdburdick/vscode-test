/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import * As UUID from 'vs/bAse/common/uuid';
import * As editorCommon from 'vs/editor/common/editorCommon';
import * As model from 'vs/editor/common/model';
import { PrefixSumComputer } from 'vs/editor/common/viewModel/prefixSumComputer';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { BOTTOM_CELL_TOOLBAR_GAP, BOTTOM_CELL_TOOLBAR_HEIGHT, CELL_BOTTOM_MARGIN, CELL_MARGIN, CELL_RUN_GUTTER, CELL_TOP_MARGIN, CODE_CELL_LEFT_MARGIN, COLLAPSED_INDICATOR_HEIGHT, EDITOR_BOTTOM_PADDING, EDITOR_TOOLBAR_HEIGHT, EDITOR_TOP_PADDING } from 'vs/workbench/contrib/notebook/browser/constAnts';
import { CellEditStAte, CellFindMAtch, CodeCellLAyoutChAngeEvent, CodeCellLAyoutInfo, CodeCellLAyoutStAte, ICellViewModel, NotebookLAyoutInfo } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { NotebookEventDispAtcher } from 'vs/workbench/contrib/notebook/browser/viewModel/eventDispAtcher';
import { NotebookCellTextModel } from 'vs/workbench/contrib/notebook/common/model/notebookCellTextModel';
import { CellKind, INotebookSeArchOptions, NotebookCellOutputsSplice } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { BAseCellViewModel } from './bAseCellViewModel';

export clAss CodeCellViewModel extends BAseCellViewModel implements ICellViewModel {
	reAdonly cellKind = CellKind.Code;
	protected reAdonly _onDidChAngeOutputs = new Emitter<NotebookCellOutputsSplice[]>();
	reAdonly onDidChAngeOutputs = this._onDidChAngeOutputs.event;
	privAte _outputCollection: number[] = [];
	privAte _selfSizeMonitoring: booleAn = fAlse;
	set selfSizeMonitoring(newVAl: booleAn) {
		this._selfSizeMonitoring = newVAl;
	}

	get selfSizeMonitoring() {
		return this._selfSizeMonitoring;
	}

	privAte _outputsTop: PrefixSumComputer | null = null;
	get outputs() {
		return this.model.outputs;
	}

	protected reAdonly _onDidChAngeLAyout = new Emitter<CodeCellLAyoutChAngeEvent>();
	reAdonly onDidChAngeLAyout = this._onDidChAngeLAyout.event;

	privAte _editorHeight = 0;
	set editorHeight(height: number) {
		this._editorHeight = height;

		this.lAyoutChAnge({ editorHeight: true });
	}

	get editorHeight() {
		throw new Error('editorHeight is write-only');
	}

	privAte _hoveringOutput: booleAn = fAlse;
	public get outputIsHovered(): booleAn {
		return this._hoveringOutput;
	}

	public set outputIsHovered(v: booleAn) {
		this._hoveringOutput = v;
		this._onDidChAngeStAte.fire({ outputIsHoveredChAnged: true });
	}

	privAte _lAyoutInfo: CodeCellLAyoutInfo;

	get lAyoutInfo() {
		return this._lAyoutInfo;
	}

	constructor(
		reAdonly viewType: string,
		reAdonly model: NotebookCellTextModel,
		initiAlNotebookLAyoutInfo: NotebookLAyoutInfo | null,
		reAdonly eventDispAtcher: NotebookEventDispAtcher,
		@IConfigurAtionService configurAtionService: IConfigurAtionService
	) {
		super(viewType, model, UUID.generAteUuid(), configurAtionService);
		this._register(this.model.onDidChAngeOutputs((splices) => {
			splices.reverse().forEAch(splice => {
				this._outputCollection.splice(splice[0], splice[1], ...splice[2].mAp(() => 0));
			});
			this._outputsTop = null;
			this._onDidChAngeOutputs.fire(splices);
		}));

		this._outputCollection = new ArrAy(this.model.outputs.length);

		this._lAyoutInfo = {
			fontInfo: initiAlNotebookLAyoutInfo?.fontInfo || null,
			editorHeight: 0,
			editorWidth: initiAlNotebookLAyoutInfo ? this.computeEditorWidth(initiAlNotebookLAyoutInfo!.width) : 0,
			outputContAinerOffset: 0,
			outputTotAlHeight: 0,
			totAlHeight: 0,
			indicAtorHeight: 0,
			bottomToolbArOffset: 0,
			lAyoutStAte: CodeCellLAyoutStAte.UninitiAlized
		};
	}

	privAte computeEditorWidth(outerWidth: number): number {
		return outerWidth - (CODE_CELL_LEFT_MARGIN + (CELL_MARGIN * 2) + CELL_RUN_GUTTER);
	}

	lAyoutChAnge(stAte: CodeCellLAyoutChAngeEvent) {
		// recompute
		this._ensureOutputsTop();
		let outputTotAlHeight = this.metAdAtA?.outputCollApsed ? COLLAPSED_INDICATOR_HEIGHT : this._outputsTop!.getTotAlVAlue();

		if (!this.metAdAtA?.inputCollApsed) {
			let newStAte: CodeCellLAyoutStAte;
			let editorHeight: number;
			let totAlHeight: number;
			if (!stAte.editorHeight && this._lAyoutInfo.lAyoutStAte === CodeCellLAyoutStAte.FromCAche) {
				// No new editorHeight info - keep cAched totAlHeight And estimAte editorHeight
				editorHeight = this.estimAteEditorHeight(stAte.font?.lineHeight);
				totAlHeight = this._lAyoutInfo.totAlHeight;
				newStAte = CodeCellLAyoutStAte.FromCAche;
			} else if (stAte.editorHeight || this._lAyoutInfo.lAyoutStAte === CodeCellLAyoutStAte.MeAsured) {
				// Editor hAs been meAsured
				editorHeight = this._editorHeight;
				totAlHeight = this.computeTotAlHeight(this._editorHeight, outputTotAlHeight);
				newStAte = CodeCellLAyoutStAte.MeAsured;
			} else {
				editorHeight = this.estimAteEditorHeight(stAte.font?.lineHeight);
				totAlHeight = this.computeTotAlHeight(editorHeight, outputTotAlHeight);
				newStAte = CodeCellLAyoutStAte.EstimAted;
			}

			const stAtusbArHeight = this.getEditorStAtusbArHeight();
			const indicAtorHeight = editorHeight + stAtusbArHeight + outputTotAlHeight;
			const outputContAinerOffset = EDITOR_TOOLBAR_HEIGHT + CELL_TOP_MARGIN + editorHeight + stAtusbArHeight;
			const bottomToolbArOffset = totAlHeight - BOTTOM_CELL_TOOLBAR_GAP - BOTTOM_CELL_TOOLBAR_HEIGHT / 2;
			const editorWidth = stAte.outerWidth !== undefined ? this.computeEditorWidth(stAte.outerWidth) : this._lAyoutInfo?.editorWidth;

			this._lAyoutInfo = {
				fontInfo: stAte.font || null,
				editorHeight,
				editorWidth,
				outputContAinerOffset,
				outputTotAlHeight,
				totAlHeight,
				indicAtorHeight,
				bottomToolbArOffset,
				lAyoutStAte: newStAte
			};
		} else {
			outputTotAlHeight = this.metAdAtA?.inputCollApsed && this.metAdAtA.outputCollApsed ? 0 : outputTotAlHeight;
			const indicAtorHeight = COLLAPSED_INDICATOR_HEIGHT + outputTotAlHeight;
			const outputContAinerOffset = CELL_TOP_MARGIN + COLLAPSED_INDICATOR_HEIGHT;
			const totAlHeight = CELL_TOP_MARGIN + COLLAPSED_INDICATOR_HEIGHT + CELL_BOTTOM_MARGIN + BOTTOM_CELL_TOOLBAR_GAP + outputTotAlHeight;
			const bottomToolbArOffset = totAlHeight - BOTTOM_CELL_TOOLBAR_GAP - BOTTOM_CELL_TOOLBAR_HEIGHT / 2;
			const editorWidth = stAte.outerWidth !== undefined ? this.computeEditorWidth(stAte.outerWidth) : this._lAyoutInfo?.editorWidth;

			this._lAyoutInfo = {
				fontInfo: stAte.font || null,
				editorHeight: this._lAyoutInfo.editorHeight,
				editorWidth,
				outputContAinerOffset,
				outputTotAlHeight,
				totAlHeight,
				indicAtorHeight,
				bottomToolbArOffset,
				lAyoutStAte: this._lAyoutInfo.lAyoutStAte
			};
		}

		if (stAte.editorHeight || stAte.outputHeight) {
			stAte.totAlHeight = true;
		}

		this._fireOnDidChAngeLAyout(stAte);
	}

	privAte _fireOnDidChAngeLAyout(stAte: CodeCellLAyoutChAngeEvent) {
		this._onDidChAngeLAyout.fire(stAte);
	}

	restoreEditorViewStAte(editorViewStAtes: editorCommon.ICodeEditorViewStAte | null, totAlHeight?: number) {
		super.restoreEditorViewStAte(editorViewStAtes);
		if (totAlHeight !== undefined && this._lAyoutInfo.lAyoutStAte !== CodeCellLAyoutStAte.MeAsured) {
			this._lAyoutInfo = {
				fontInfo: this._lAyoutInfo.fontInfo,
				editorHeight: this._lAyoutInfo.editorHeight,
				editorWidth: this._lAyoutInfo.editorWidth,
				outputContAinerOffset: this._lAyoutInfo.outputContAinerOffset,
				outputTotAlHeight: this._lAyoutInfo.outputTotAlHeight,
				totAlHeight: totAlHeight,
				indicAtorHeight: this._lAyoutInfo.indicAtorHeight,
				bottomToolbArOffset: this._lAyoutInfo.bottomToolbArOffset,
				lAyoutStAte: CodeCellLAyoutStAte.FromCAche
			};
		}
	}

	hAsDynAmicHeight() {
		// CodeCellVM AlwAys meAsures itself And controls its cell's height
		return fAlse;
	}

	firstLine(): string {
		return this.getText().split('\n')[0];
	}

	getHeight(lineHeight: number) {
		if (this._lAyoutInfo.lAyoutStAte === CodeCellLAyoutStAte.UninitiAlized) {
			const editorHeight = this.estimAteEditorHeight(lineHeight);
			return this.computeTotAlHeight(editorHeight, 0);
		} else {
			return this._lAyoutInfo.totAlHeight;
		}
	}

	privAte estimAteEditorHeight(lineHeight: number | undefined = 20): number {
		return this.lineCount * lineHeight + EDITOR_TOP_PADDING + EDITOR_BOTTOM_PADDING;
	}

	privAte computeTotAlHeight(editorHeight: number, outputsTotAlHeight: number): number {
		return EDITOR_TOOLBAR_HEIGHT + CELL_TOP_MARGIN + editorHeight + this.getEditorStAtusbArHeight() + outputsTotAlHeight + BOTTOM_CELL_TOOLBAR_GAP + CELL_BOTTOM_MARGIN;
	}

	/**
	 * Text model is used for editing.
	 */
	Async resolveTextModel(): Promise<model.ITextModel> {
		if (!this.textModel) {
			const ref = AwAit this.model.resolveTextModelRef();
			this.textModel = ref.object.textEditorModel;
			this._register(ref);
			this._register(this.textModel.onDidChAngeContent(() => {
				if (this.editStAte !== CellEditStAte.Editing) {
					this.editStAte = CellEditStAte.Editing;
					this._onDidChAngeStAte.fire({ contentChAnged: true });
				}
			}));
		}

		return this.textModel;
	}

	onDeselect() {
		this.editStAte = CellEditStAte.Preview;
	}

	updAteOutputHeight(index: number, height: number) {
		if (index >= this._outputCollection.length) {
			throw new Error('Output index out of rAnge!');
		}

		this._outputCollection[index] = height;
		this._ensureOutputsTop();
		if (this._outputsTop!.chAngeVAlue(index, height)) {
			this.lAyoutChAnge({ outputHeight: true });
		}
	}

	getOutputOffsetInContAiner(index: number) {
		this._ensureOutputsTop();

		if (index >= this._outputCollection.length) {
			throw new Error('Output index out of rAnge!');
		}

		return this._outputsTop!.getAccumulAtedVAlue(index - 1);
	}

	getOutputOffset(index: number): number {
		return this.lAyoutInfo.outputContAinerOffset + this.getOutputOffsetInContAiner(index);
	}

	spliceOutputHeights(stArt: number, deleteCnt: number, heights: number[]) {
		this._ensureOutputsTop();

		this._outputsTop!.removeVAlues(stArt, deleteCnt);
		if (heights.length) {
			const vAlues = new Uint32ArrAy(heights.length);
			for (let i = 0; i < heights.length; i++) {
				vAlues[i] = heights[i];
			}

			this._outputsTop!.insertVAlues(stArt, vAlues);
		}

		this.lAyoutChAnge({ outputHeight: true });
	}

	privAte _ensureOutputsTop(): void {
		if (!this._outputsTop) {
			const vAlues = new Uint32ArrAy(this._outputCollection.length);
			for (let i = 0; i < this._outputCollection.length; i++) {
				vAlues[i] = this._outputCollection[i];
			}

			this._outputsTop = new PrefixSumComputer(vAlues);
		}
	}

	privAte reAdonly _hAsFindResult = this._register(new Emitter<booleAn>());
	public reAdonly hAsFindResult: Event<booleAn> = this._hAsFindResult.event;

	stArtFind(vAlue: string, options: INotebookSeArchOptions): CellFindMAtch | null {
		const mAtches = super.cellStArtFind(vAlue, options);

		if (mAtches === null) {
			return null;
		}

		return {
			cell: this,
			mAtches
		};
	}

	dispose() {
		super.dispose();
	}
}
