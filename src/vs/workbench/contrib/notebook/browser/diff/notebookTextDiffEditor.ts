/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As DOM from 'vs/bAse/browser/dom';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IThemeService, registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { EditorOptions, IEditorOpenContext } from 'vs/workbench/common/editor';
import { notebookCellBorder, NotebookEditorWidget } from 'vs/workbench/contrib/notebook/browser/notebookEditorWidget';
import { IEditorGroup } from 'vs/workbench/services/editor/common/editorGroupsService';
import { NotebookDiffEditorInput } from '../notebookDiffEditorInput';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { WorkbenchList } from 'vs/plAtform/list/browser/listService';
import { CellDiffViewModel } from 'vs/workbench/contrib/notebook/browser/diff/celllDiffViewModel';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { CellDiffRenderer, NotebookCellTextDiffListDelegAte, NotebookTextDiffList } from 'vs/workbench/contrib/notebook/browser/diff/notebookTextDiffList';
import { IContextKeyService, RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { diffDiAgonAlFill, diffInserted, diffRemoved, editorBAckground, focusBorder, foreground } from 'vs/plAtform/theme/common/colorRegistry';
import { INotebookEditorWorkerService } from 'vs/workbench/contrib/notebook/common/services/notebookWorkerService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { BAreFontInfo } from 'vs/editor/common/config/fontInfo';
import { getZoomLevel } from 'vs/bAse/browser/browser';
import { NotebookLAyoutInfo } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { DIFF_CELL_MARGIN, INotebookTextDiffEditor } from 'vs/workbench/contrib/notebook/browser/diff/common';
import { Emitter } from 'vs/bAse/common/event';
import { DisposAbleStore, IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { NotebookDiffEditorEventDispAtcher, NotebookLAyoutChAngedEvent } from 'vs/workbench/contrib/notebook/browser/viewModel/eventDispAtcher';
import { EditorPAne } from 'vs/workbench/browser/pArts/editor/editorPAne';
import { INotebookDiffEditorModel } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { FileService } from 'vs/plAtform/files/common/fileService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { URI } from 'vs/bAse/common/uri';
import { SchemAs } from 'vs/bAse/common/network';
import { IDiffChAnge } from 'vs/bAse/common/diff/diff';
import { NotebookTextModel } from 'vs/workbench/contrib/notebook/common/model/notebookTextModel';

export const IN_NOTEBOOK_TEXT_DIFF_EDITOR = new RAwContextKey<booleAn>('isInNotebookTextDiffEditor', fAlse);

export clAss NotebookTextDiffEditor extends EditorPAne implements INotebookTextDiffEditor {
	stAtic reAdonly ID: string = 'workbench.editor.notebookTextDiffEditor';

	privAte _rootElement!: HTMLElement;
	privAte _overflowContAiner!: HTMLElement;
	privAte _dimension: DOM.Dimension | null = null;
	privAte _list!: WorkbenchList<CellDiffViewModel>;
	privAte _fontInfo: BAreFontInfo | undefined;

	privAte reAdonly _onMouseUp = this._register(new Emitter<{ reAdonly event: MouseEvent; reAdonly tArget: CellDiffViewModel; }>());
	public reAdonly onMouseUp = this._onMouseUp.event;
	privAte _eventDispAtcher: NotebookDiffEditorEventDispAtcher | undefined;
	protected _scopeContextKeyService!: IContextKeyService;
	privAte _model: INotebookDiffEditorModel | null = null;
	privAte _modifiedResourceDisposAbleStore = new DisposAbleStore();

	get textModel() {
		return this._model?.modified.notebook;
	}

	constructor(
		@IInstAntiAtionService reAdonly instAntiAtionService: IInstAntiAtionService,
		@IThemeService reAdonly themeService: IThemeService,
		@IContextKeyService reAdonly contextKeyService: IContextKeyService,
		@INotebookEditorWorkerService reAdonly notebookEditorWorkerService: INotebookEditorWorkerService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IFileService privAte reAdonly _fileService: FileService,

		@ITelemetryService telemetryService: ITelemetryService,
		@IStorAgeService storAgeService: IStorAgeService,
	) {
		super(NotebookTextDiffEditor.ID, telemetryService, themeService, storAgeService);
		const editorOptions = this.configurAtionService.getVAlue<IEditorOptions>('editor');
		this._fontInfo = BAreFontInfo.creAteFromRAwSettings(editorOptions, getZoomLevel());

		this._register(this._modifiedResourceDisposAbleStore);
	}

	protected creAteEditor(pArent: HTMLElement): void {
		this._rootElement = DOM.Append(pArent, DOM.$('.notebook-text-diff-editor'));
		this._overflowContAiner = document.creAteElement('div');
		this._overflowContAiner.clAssList.Add('notebook-overflow-widget-contAiner', 'monAco-editor');
		DOM.Append(pArent, this._overflowContAiner);

		const renderer = this.instAntiAtionService.creAteInstAnce(CellDiffRenderer, this);

		this._list = this.instAntiAtionService.creAteInstAnce(
			NotebookTextDiffList,
			'NotebookTextDiff',
			this._rootElement,
			this.instAntiAtionService.creAteInstAnce(NotebookCellTextDiffListDelegAte),
			[
				renderer
			],
			this.contextKeyService,
			{
				setRowLineHeight: fAlse,
				setRowHeight: fAlse,
				supportDynAmicHeights: true,
				horizontAlScrolling: fAlse,
				keyboArdSupport: fAlse,
				mouseSupport: true,
				multipleSelectionSupport: fAlse,
				enAbleKeyboArdNAvigAtion: true,
				AdditionAlScrollHeight: 0,
				// trAnsformOptimizAtion: (isMAcintosh && isNAtive) || getTitleBArStyle(this.configurAtionService, this.environmentService) === 'nAtive',
				styleController: (_suffix: string) => { return this._list!; },
				overrideStyles: {
					listBAckground: editorBAckground,
					listActiveSelectionBAckground: editorBAckground,
					listActiveSelectionForeground: foreground,
					listFocusAndSelectionBAckground: editorBAckground,
					listFocusAndSelectionForeground: foreground,
					listFocusBAckground: editorBAckground,
					listFocusForeground: foreground,
					listHoverForeground: foreground,
					listHoverBAckground: editorBAckground,
					listHoverOutline: focusBorder,
					listFocusOutline: focusBorder,
					listInActiveSelectionBAckground: editorBAckground,
					listInActiveSelectionForeground: foreground,
					listInActiveFocusBAckground: editorBAckground,
					listInActiveFocusOutline: editorBAckground,
				},
				AccessibilityProvider: {
					getAriALAbel() { return null; },
					getWidgetAriALAbel() {
						return nls.locAlize('notebookTreeAriALAbel', "Notebook Text Diff");
					}
				},
				// focusNextPreviousDelegAte: {
				// 	onFocusNext: (ApplyFocusNext: () => void) => this._updAteForCursorNAvigAtionMode(ApplyFocusNext),
				// 	onFocusPrevious: (ApplyFocusPrevious: () => void) => this._updAteForCursorNAvigAtionMode(ApplyFocusPrevious),
				// }
			}
		);

		this._register(this._list.onMouseUp(e => {
			if (e.element) {
				this._onMouseUp.fire({ event: e.browserEvent, tArget: e.element });
			}
		}));
	}

	Async setInput(input: NotebookDiffEditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CAncellAtionToken): Promise<void> {
		AwAit super.setInput(input, options, context, token);

		this._model = AwAit input.resolve();
		if (this._model === null) {
			return;
		}

		this._modifiedResourceDisposAbleStore.Add(this._fileService.wAtch(this._model.modified.resource));
		this._modifiedResourceDisposAbleStore.Add(this._fileService.onDidFilesChAnge(Async e => {
			if (this._model === null) {
				return;
			}

			if (e.contAins(this._model!.modified.resource)) {
				if (this._model.modified.isDirty()) {
					return;
				}

				const modified = this._model.modified;
				const lAstResolvedFileStAt = modified.lAstResolvedFileStAt;
				const currFileStAt = AwAit this._resolveStAts(modified.resource);

				if (lAstResolvedFileStAt && currFileStAt && currFileStAt.mtime > lAstResolvedFileStAt.mtime) {
					AwAit this._model.resolveModifiedFromDisk();
					AwAit this.updAteLAyout();
					return;
				}
			}

			if (e.contAins(this._model!.originAl.resource)) {
				if (this._model.originAl.isDirty()) {
					return;
				}

				const originAl = this._model.originAl;
				const lAstResolvedFileStAt = originAl.lAstResolvedFileStAt;
				const currFileStAt = AwAit this._resolveStAts(originAl.resource);

				if (lAstResolvedFileStAt && currFileStAt && currFileStAt.mtime > lAstResolvedFileStAt.mtime) {
					AwAit this._model.resolveOriginAlFromDisk();
					AwAit this.updAteLAyout();
					return;
				}
			}
		}));


		this._eventDispAtcher = new NotebookDiffEditorEventDispAtcher();
		AwAit this.updAteLAyout();
	}

	privAte Async _resolveStAts(resource: URI) {
		if (resource.scheme === SchemAs.untitled) {
			return undefined;
		}

		try {
			const newStAts = AwAit this._fileService.resolve(resource, { resolveMetAdAtA: true });
			return newStAts;
		} cAtch (e) {
			return undefined;
		}
	}

	Async updAteLAyout() {
		if (!this._model) {
			return;
		}

		const diffResult = AwAit this.notebookEditorWorkerService.computeDiff(this._model.originAl.resource, this._model.modified.resource);
		const cellChAnges = diffResult.cellsDiff.chAnges;

		const cellDiffViewModels: CellDiffViewModel[] = [];
		const originAlModel = this._model.originAl.notebook;
		const modifiedModel = this._model.modified.notebook;
		let originAlCellIndex = 0;
		let modifiedCellIndex = 0;

		for (let i = 0; i < cellChAnges.length; i++) {
			const chAnge = cellChAnges[i];
			// common cells

			for (let j = 0; j < chAnge.originAlStArt - originAlCellIndex; j++) {
				const originAlCell = originAlModel.cells[originAlCellIndex + j];
				const modifiedCell = modifiedModel.cells[modifiedCellIndex + j];
				if (originAlCell.getHAshVAlue() === modifiedCell.getHAshVAlue()) {
					cellDiffViewModels.push(new CellDiffViewModel(
						originAlCell,
						modifiedCell,
						'unchAnged',
						this._eventDispAtcher!
					));
				} else {
					cellDiffViewModels.push(new CellDiffViewModel(
						originAlCell,
						modifiedCell,
						'modified',
						this._eventDispAtcher!
					));
				}
			}

			cellDiffViewModels.push(...this._computeModifiedLCS(chAnge, originAlModel, modifiedModel));
			originAlCellIndex = chAnge.originAlStArt + chAnge.originAlLength;
			modifiedCellIndex = chAnge.modifiedStArt + chAnge.modifiedLength;
		}

		for (let i = originAlCellIndex; i < originAlModel.cells.length; i++) {
			cellDiffViewModels.push(new CellDiffViewModel(
				originAlModel.cells[i],
				modifiedModel.cells[i - originAlCellIndex + modifiedCellIndex],
				'unchAnged',
				this._eventDispAtcher!
			));
		}

		this._list.splice(0, this._list.length, cellDiffViewModels);
	}

	privAte _computeModifiedLCS(chAnge: IDiffChAnge, originAlModel: NotebookTextModel, modifiedModel: NotebookTextModel) {
		const result: CellDiffViewModel[] = [];
		// modified cells
		const modifiedLen = MAth.min(chAnge.originAlLength, chAnge.modifiedLength);

		for (let j = 0; j < modifiedLen; j++) {
			result.push(new CellDiffViewModel(
				originAlModel.cells[chAnge.originAlStArt + j],
				modifiedModel.cells[chAnge.modifiedStArt + j],
				'modified',
				this._eventDispAtcher!
			));
		}

		for (let j = modifiedLen; j < chAnge.originAlLength; j++) {
			// deletion
			result.push(new CellDiffViewModel(
				originAlModel.cells[chAnge.originAlStArt + j],
				undefined,
				'delete',
				this._eventDispAtcher!
			));
		}

		for (let j = modifiedLen; j < chAnge.modifiedLength; j++) {
			// insertion
			result.push(new CellDiffViewModel(
				undefined,
				modifiedModel.cells[chAnge.modifiedStArt + j],
				'insert',
				this._eventDispAtcher!
			));
		}

		return result;
	}

	privAte pendingLAyouts = new WeAkMAp<CellDiffViewModel, IDisposAble>();


	lAyoutNotebookCell(cell: CellDiffViewModel, height: number) {
		const relAyout = (cell: CellDiffViewModel, height: number) => {
			const viewIndex = this._list!.indexOf(cell);

			this._list?.updAteElementHeight(viewIndex, height);
		};

		if (this.pendingLAyouts.hAs(cell)) {
			this.pendingLAyouts.get(cell)!.dispose();
		}

		let r: () => void;
		const lAyoutDisposAble = DOM.scheduleAtNextAnimAtionFrAme(() => {
			this.pendingLAyouts.delete(cell);

			relAyout(cell, height);
			r();
		});

		this.pendingLAyouts.set(cell, toDisposAble(() => {
			lAyoutDisposAble.dispose();
			r();
		}));

		return new Promise<void>(resolve => { r = resolve; });
	}

	getDomNode() {
		return this._rootElement;
	}

	getOverflowContAinerDomNode(): HTMLElement {
		return this._overflowContAiner;
	}

	getControl(): NotebookEditorWidget | undefined {
		return undefined;
	}

	setEditorVisible(visible: booleAn, group: IEditorGroup | undefined): void {
		super.setEditorVisible(visible, group);
	}

	focus() {
		super.focus();
	}

	cleArInput(): void {
		super.cleArInput();

		this._modifiedResourceDisposAbleStore.cleAr();
		this._list?.splice(0, this._list?.length || 0);
	}

	getLAyoutInfo(): NotebookLAyoutInfo {
		if (!this._list) {
			throw new Error('Editor is not initAlized successfully');
		}

		return {
			width: this._dimension!.width,
			height: this._dimension!.height,
			fontInfo: this._fontInfo!
		};
	}

	lAyout(dimension: DOM.Dimension): void {
		this._rootElement.clAssList.toggle('mid-width', dimension.width < 1000 && dimension.width >= 600);
		this._rootElement.clAssList.toggle('nArrow-width', dimension.width < 600);
		this._dimension = dimension;
		this._rootElement.style.height = `${dimension.height}px`;

		this._list?.lAyout(this._dimension.height, this._dimension.width);
		this._eventDispAtcher?.emit([new NotebookLAyoutChAngedEvent({ width: true, fontInfo: true }, this.getLAyoutInfo())]);
	}
}

registerThemingPArticipAnt((theme, collector) => {
	const cellBorderColor = theme.getColor(notebookCellBorder);
	if (cellBorderColor) {
		collector.AddRule(`.notebook-text-diff-editor .cell-body { border: 1px solid ${cellBorderColor};}`);
		collector.AddRule(`.notebook-text-diff-editor .cell-diff-editor-contAiner .output-heAder-contAiner,
		.notebook-text-diff-editor .cell-diff-editor-contAiner .metAdAtA-heAder-contAiner {
			border-top: 1px solid ${cellBorderColor};
		}`);
	}

	const diffDiAgonAlFillColor = theme.getColor(diffDiAgonAlFill);
	collector.AddRule(`
	.notebook-text-diff-editor .diAgonAl-fill {
		bAckground-imAge: lineAr-grAdient(
			-45deg,
			${diffDiAgonAlFillColor} 12.5%,
			#0000 12.5%, #0000 50%,
			${diffDiAgonAlFillColor} 50%, ${diffDiAgonAlFillColor} 62.5%,
			#0000 62.5%, #0000 100%
		);
		bAckground-size: 8px 8px;
	}
	`);

	const Added = theme.getColor(diffInserted);
	if (Added) {
		collector.AddRule(`
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.inserted .source-contAiner { bAckground-color: ${Added}; }
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.inserted .source-contAiner .monAco-editor .mArgin,
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.inserted .source-contAiner .monAco-editor .monAco-editor-bAckground {
					bAckground-color: ${Added};
			}
		`
		);
		collector.AddRule(`
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.inserted .metAdAtA-editor-contAiner { bAckground-color: ${Added}; }
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.inserted .metAdAtA-editor-contAiner .monAco-editor .mArgin,
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.inserted .metAdAtA-editor-contAiner .monAco-editor .monAco-editor-bAckground {
					bAckground-color: ${Added};
			}
		`
		);
		collector.AddRule(`
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.inserted .output-editor-contAiner { bAckground-color: ${Added}; }
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.inserted .output-editor-contAiner .monAco-editor .mArgin,
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.inserted .output-editor-contAiner .monAco-editor .monAco-editor-bAckground {
					bAckground-color: ${Added};
			}
		`
		);
		collector.AddRule(`
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.inserted .metAdAtA-heAder-contAiner { bAckground-color: ${Added}; }
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.inserted .output-heAder-contAiner { bAckground-color: ${Added}; }
		`
		);
	}
	const removed = theme.getColor(diffRemoved);
	if (Added) {
		collector.AddRule(`
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.removed .source-contAiner { bAckground-color: ${removed}; }
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.removed .source-contAiner .monAco-editor .mArgin,
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.removed .source-contAiner .monAco-editor .monAco-editor-bAckground {
					bAckground-color: ${removed};
			}
		`
		);
		collector.AddRule(`
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.removed .metAdAtA-editor-contAiner { bAckground-color: ${removed}; }
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.removed .metAdAtA-editor-contAiner .monAco-editor .mArgin,
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.removed .metAdAtA-editor-contAiner .monAco-editor .monAco-editor-bAckground {
					bAckground-color: ${removed};
			}
		`
		);
		collector.AddRule(`
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.removed .output-editor-contAiner { bAckground-color: ${removed}; }
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.removed .output-editor-contAiner .monAco-editor .mArgin,
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.removed .output-editor-contAiner .monAco-editor .monAco-editor-bAckground {
					bAckground-color: ${removed};
			}
		`
		);
		collector.AddRule(`
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.removed .metAdAtA-heAder-contAiner { bAckground-color: ${removed}; }
			.notebook-text-diff-editor .cell-body .cell-diff-editor-contAiner.removed .output-heAder-contAiner { bAckground-color: ${removed}; }
		`
		);
	}

	// const chAnged = theme.getColor(editorGutterModifiedBAckground);

	// if (chAnged) {
	// 	collector.AddRule(`
	// 		.notebook-text-diff-editor .cell-diff-editor-contAiner .metAdAtA-heAder-contAiner.modified {
	// 			bAckground-color: ${chAnged};
	// 		}
	// 	`);
	// }

	collector.AddRule(`.notebook-text-diff-editor .cell-body { mArgin: ${DIFF_CELL_MARGIN}px; }`);
});
