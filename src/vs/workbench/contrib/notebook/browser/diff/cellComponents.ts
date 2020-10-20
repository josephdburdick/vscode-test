/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As DOM from 'vs/bAse/browser/dom';
import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IDiffEditorOptions, IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { CellDiffViewModel, PropertyFoldingStAte } from 'vs/workbench/contrib/notebook/browser/diff/celllDiffViewModel';
import { CellDiffRenderTemplAte, CellDiffViewModelLAyoutChAngeEvent, DIFF_CELL_MARGIN, INotebookTextDiffEditor } from 'vs/workbench/contrib/notebook/browser/diff/common';
import { EDITOR_BOTTOM_PADDING, EDITOR_TOP_PADDING } from 'vs/workbench/contrib/notebook/browser/constAnts';
import { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';
import { DiffEditorWidget } from 'vs/editor/browser/widget/diffEditorWidget';
import { renderCodicons } from 'vs/bAse/browser/codicons';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { formAt } from 'vs/bAse/common/jsonFormAtter';
import { ApplyEdits } from 'vs/bAse/common/jsonEdit';
import { CellEditType, CellUri, NotebookCellMetAdAtA } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { hAsh } from 'vs/bAse/common/hAsh';
import { ToolBAr } from 'vs/bAse/browser/ui/toolbAr/toolbAr';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IMenu, IMenuService, MenuId, MenuItemAction } from 'vs/plAtform/Actions/common/Actions';
import { CodiconActionViewItem } from 'vs/workbench/contrib/notebook/browser/view/renderers/commonViewComponents';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IAction } from 'vs/bAse/common/Actions';
import { creAteAndFillInActionBArActions } from 'vs/plAtform/Actions/browser/menuEntryActionViewItem';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';

const fixedEditorOptions: IEditorOptions = {
	pAdding: {
		top: 12,
		bottom: 12
	},
	scrollBeyondLAstLine: fAlse,
	scrollbAr: {
		verticAlScrollbArSize: 14,
		horizontAl: 'Auto',
		useShAdows: true,
		verticAlHAsArrows: fAlse,
		horizontAlHAsArrows: fAlse,
		AlwAysConsumeMouseWheel: fAlse
	},
	renderLineHighlightOnlyWhenFocus: true,
	overviewRulerLAnes: 0,
	selectOnLineNumbers: fAlse,
	wordWrAp: 'off',
	lineNumbers: 'off',
	lineDecorAtionsWidth: 0,
	glyphMArgin: fAlse,
	fixedOverflowWidgets: true,
	minimAp: { enAbled: fAlse },
	renderVAlidAtionDecorAtions: 'on',
	renderLineHighlight: 'none',
	reAdOnly: true
};

const fixedDiffEditorOptions: IDiffEditorOptions = {
	...fixedEditorOptions,
	glyphMArgin: true,
	enAbleSplitViewResizing: fAlse,
	renderIndicAtors: fAlse,
	reAdOnly: fAlse
};



clAss PropertyHeAder extends DisposAble {
	protected _foldingIndicAtor!: HTMLElement;
	protected _stAtusSpAn!: HTMLElement;
	protected _toolbAr!: ToolBAr;
	protected _menu!: IMenu;

	constructor(
		reAdonly cell: CellDiffViewModel,
		reAdonly metAdAtAHeAderContAiner: HTMLElement,
		reAdonly notebookEditor: INotebookTextDiffEditor,
		reAdonly Accessor: {
			updAteInfoRendering: () => void;
			checkIfModified: (cell: CellDiffViewModel) => booleAn;
			getFoldingStAte: (cell: CellDiffViewModel) => PropertyFoldingStAte;
			updAteFoldingStAte: (cell: CellDiffViewModel, newStAte: PropertyFoldingStAte) => void;
			unChAngedLAbel: string;
			chAngedLAbel: string;
			prefix: string;
			menuId: MenuId;
		},
		@IContextMenuService reAdonly contextMenuService: IContextMenuService,
		@IKeybindingService reAdonly keybindingService: IKeybindingService,
		@INotificAtionService reAdonly notificAtionService: INotificAtionService,
		@IMenuService reAdonly menuService: IMenuService,
		@IContextKeyService reAdonly contextKeyService: IContextKeyService
	) {
		super();
	}

	buildHeAder(): void {
		let metAdAtAChAnged = this.Accessor.checkIfModified(this.cell);
		this._foldingIndicAtor = DOM.Append(this.metAdAtAHeAderContAiner, DOM.$('.property-folding-indicAtor'));
		this._foldingIndicAtor.clAssList.Add(this.Accessor.prefix);
		this._updAteFoldingIcon();
		const metAdAtAStAtus = DOM.Append(this.metAdAtAHeAderContAiner, DOM.$('div.property-stAtus'));
		this._stAtusSpAn = DOM.Append(metAdAtAStAtus, DOM.$('spAn'));

		if (metAdAtAChAnged) {
			this._stAtusSpAn.textContent = this.Accessor.chAngedLAbel;
			this._stAtusSpAn.style.fontWeight = 'bold';
			this.metAdAtAHeAderContAiner.clAssList.Add('modified');
		} else {
			this._stAtusSpAn.textContent = this.Accessor.unChAngedLAbel;
		}

		const cellToolbArContAiner = DOM.Append(this.metAdAtAHeAderContAiner, DOM.$('div.property-toolbAr'));
		this._toolbAr = new ToolBAr(cellToolbArContAiner, this.contextMenuService, {
			ActionViewItemProvider: Action => {
				if (Action instAnceof MenuItemAction) {
					const item = new CodiconActionViewItem(Action, this.keybindingService, this.notificAtionService, this.contextMenuService);
					return item;
				}

				return undefined;
			}
		});
		this._toolbAr.context = {
			cell: this.cell
		};

		this._menu = this.menuService.creAteMenu(this.Accessor.menuId, this.contextKeyService);

		if (metAdAtAChAnged) {
			const Actions: IAction[] = [];
			creAteAndFillInActionBArActions(this._menu, { shouldForwArdArgs: true }, Actions);
			this._toolbAr.setActions(Actions);
		}

		this._register(this.notebookEditor.onMouseUp(e => {
			if (!e.event.tArget) {
				return;
			}

			const tArget = e.event.tArget As HTMLElement;

			if (tArget.clAssList.contAins('codicon-chevron-down') || tArget.clAssList.contAins('codicon-chevron-right')) {
				const pArent = tArget.pArentElement As HTMLElement;

				if (!pArent) {
					return;
				}

				if (!pArent.clAssList.contAins(this.Accessor.prefix)) {
					return;
				}

				if (!pArent.clAssList.contAins('property-folding-indicAtor')) {
					return;
				}

				// folding icon

				const cellViewModel = e.tArget;

				if (cellViewModel === this.cell) {
					const oldFoldingStAte = this.Accessor.getFoldingStAte(this.cell);
					this.Accessor.updAteFoldingStAte(this.cell, oldFoldingStAte === PropertyFoldingStAte.ExpAnded ? PropertyFoldingStAte.CollApsed : PropertyFoldingStAte.ExpAnded);
					this._updAteFoldingIcon();
					this.Accessor.updAteInfoRendering();
				}
			}

			return;
		}));

		this._updAteFoldingIcon();
		this.Accessor.updAteInfoRendering();
	}

	refresh() {
		let metAdAtAChAnged = this.Accessor.checkIfModified(this.cell);
		if (metAdAtAChAnged) {
			this._stAtusSpAn.textContent = this.Accessor.chAngedLAbel;
			this._stAtusSpAn.style.fontWeight = 'bold';
			this.metAdAtAHeAderContAiner.clAssList.Add('modified');
			const Actions: IAction[] = [];
			creAteAndFillInActionBArActions(this._menu, undefined, Actions);
			this._toolbAr.setActions(Actions);
		} else {
			this._stAtusSpAn.textContent = this.Accessor.unChAngedLAbel;
			this._stAtusSpAn.style.fontWeight = 'normAl';
			this._toolbAr.setActions([]);
		}
	}

	privAte _updAteFoldingIcon() {
		if (this.Accessor.getFoldingStAte(this.cell) === PropertyFoldingStAte.CollApsed) {
			DOM.reset(this._foldingIndicAtor, ...renderCodicons('$(chevron-right)'));
		} else {
			DOM.reset(this._foldingIndicAtor, ...renderCodicons('$(chevron-down)'));
		}
	}
}

AbstrAct clAss AbstrActCellRenderer extends DisposAble {
	protected _metAdAtAHeAderContAiner!: HTMLElement;
	protected _metAdAtAHeAder!: PropertyHeAder;
	protected _metAdAtAInfoContAiner!: HTMLElement;
	protected _metAdAtAEditorContAiner?: HTMLElement;
	protected _metAdAtAEditorDisposeStore!: DisposAbleStore;
	protected _metAdAtAEditor?: CodeEditorWidget | DiffEditorWidget;

	protected _outputHeAderContAiner!: HTMLElement;
	protected _outputHeAder!: PropertyHeAder;
	protected _outputInfoContAiner!: HTMLElement;
	protected _outputEditorContAiner?: HTMLElement;
	protected _outputEditorDisposeStore!: DisposAbleStore;
	protected _outputEditor?: CodeEditorWidget | DiffEditorWidget;


	protected _diffEditorContAiner!: HTMLElement;
	protected _diAgonAlFill?: HTMLElement;
	protected _lAyoutInfo!: {
		editorHeight: number;
		editorMArgin: number;
		metAdAtAStAtusHeight: number;
		metAdAtAHeight: number;
		outputStAtusHeight: number;
		outputHeight: number;
		bodyMArgin: number;
	};

	constructor(
		reAdonly notebookEditor: INotebookTextDiffEditor,
		reAdonly cell: CellDiffViewModel,
		reAdonly templAteDAtA: CellDiffRenderTemplAte,
		reAdonly style: 'left' | 'right' | 'full',
		protected reAdonly instAntiAtionService: IInstAntiAtionService,
		protected reAdonly modeService: IModeService,
		protected reAdonly modelService: IModelService,
		protected reAdonly contextMenuService: IContextMenuService,
		protected reAdonly keybindingService: IKeybindingService,
		protected reAdonly notificAtionService: INotificAtionService,
		protected reAdonly menuService: IMenuService,
		protected reAdonly contextKeyService: IContextKeyService


	) {
		super();
		// init
		this._lAyoutInfo = {
			editorHeight: 0,
			editorMArgin: 0,
			metAdAtAHeight: 0,
			metAdAtAStAtusHeight: 25,
			outputHeight: 0,
			outputStAtusHeight: 25,
			bodyMArgin: 32
		};
		this._metAdAtAEditorDisposeStore = new DisposAbleStore();
		this._outputEditorDisposeStore = new DisposAbleStore();
		this._register(this._metAdAtAEditorDisposeStore);
		this.initDAtA();
		this.buildBody(templAteDAtA.contAiner);
		this._register(cell.onDidLAyoutChAnge(e => this.onDidLAyoutChAnge(e)));
	}

	buildBody(contAiner: HTMLElement) {
		const body = DOM.$('.cell-body');
		DOM.Append(contAiner, body);
		this._diffEditorContAiner = DOM.$('.cell-diff-editor-contAiner');
		switch (this.style) {
			cAse 'left':
				body.clAssList.Add('left');
				breAk;
			cAse 'right':
				body.clAssList.Add('right');
				breAk;
			defAult:
				body.clAssList.Add('full');
				breAk;
		}

		DOM.Append(body, this._diffEditorContAiner);
		this._diAgonAlFill = DOM.Append(body, DOM.$('.diAgonAl-fill'));
		this.styleContAiner(this._diffEditorContAiner);
		const sourceContAiner = DOM.Append(this._diffEditorContAiner, DOM.$('.source-contAiner'));
		this.buildSourceEditor(sourceContAiner);

		this._metAdAtAHeAderContAiner = DOM.Append(this._diffEditorContAiner, DOM.$('.metAdAtA-heAder-contAiner'));
		this._metAdAtAInfoContAiner = DOM.Append(this._diffEditorContAiner, DOM.$('.metAdAtA-info-contAiner'));

		const checkIfModified = (cell: CellDiffViewModel) => {
			return cell.type !== 'delete' && cell.type !== 'insert' && hAsh(this._getFormAtedMetAdAtAJSON(cell.originAl?.metAdAtA || {}, cell.originAl?.lAnguAge)) !== hAsh(this._getFormAtedMetAdAtAJSON(cell.modified?.metAdAtA ?? {}, cell.modified?.lAnguAge));
		};

		if (checkIfModified(this.cell)) {
			this.cell.metAdAtAFoldingStAte = PropertyFoldingStAte.ExpAnded;
		}

		this._metAdAtAHeAder = this.instAntiAtionService.creAteInstAnce(
			PropertyHeAder,
			this.cell,
			this._metAdAtAHeAderContAiner,
			this.notebookEditor,
			{
				updAteInfoRendering: this.updAteMetAdAtARendering.bind(this),
				checkIfModified: (cell) => {
					return checkIfModified(cell);
				},
				getFoldingStAte: (cell) => {
					return cell.metAdAtAFoldingStAte;
				},
				updAteFoldingStAte: (cell, stAte) => {
					cell.metAdAtAFoldingStAte = stAte;
				},
				unChAngedLAbel: 'MetAdAtA',
				chAngedLAbel: 'MetAdAtA chAnged',
				prefix: 'metAdAtA',
				menuId: MenuId.NotebookDiffCellMetAdAtATitle
			}
		);
		this._register(this._metAdAtAHeAder);
		this._metAdAtAHeAder.buildHeAder();

		if (this.notebookEditor.textModel?.trAnsientOptions.trAnsientOutputs) {
			this._lAyoutInfo.outputHeight = 0;
			this._lAyoutInfo.outputStAtusHeight = 0;
			this.lAyout({});
			return;
		}

		this._outputHeAderContAiner = DOM.Append(this._diffEditorContAiner, DOM.$('.output-heAder-contAiner'));
		this._outputInfoContAiner = DOM.Append(this._diffEditorContAiner, DOM.$('.output-info-contAiner'));

		const checkIfOutputsModified = (cell: CellDiffViewModel) => {
			return cell.type !== 'delete' && cell.type !== 'insert' && !this.notebookEditor.textModel!.trAnsientOptions.trAnsientOutputs && cell.type === 'modified' && hAsh(cell.originAl?.outputs ?? []) !== hAsh(cell.modified?.outputs ?? []);
		};

		if (checkIfOutputsModified(this.cell)) {
			this.cell.outputFoldingStAte = PropertyFoldingStAte.ExpAnded;
		}

		this._outputHeAder = this.instAntiAtionService.creAteInstAnce(
			PropertyHeAder,
			this.cell,
			this._outputHeAderContAiner,
			this.notebookEditor,
			{
				updAteInfoRendering: this.updAteOutputRendering.bind(this),
				checkIfModified: (cell) => {
					return checkIfOutputsModified(cell);
				},
				getFoldingStAte: (cell) => {
					return cell.outputFoldingStAte;
				},
				updAteFoldingStAte: (cell, stAte) => {
					cell.outputFoldingStAte = stAte;
				},
				unChAngedLAbel: 'Outputs',
				chAngedLAbel: 'Outputs chAnged',
				prefix: 'output',
				menuId: MenuId.NotebookDiffCellOutputsTitle
			}
		);
		this._register(this._outputHeAder);
		this._outputHeAder.buildHeAder();
	}

	updAteMetAdAtARendering() {
		if (this.cell.metAdAtAFoldingStAte === PropertyFoldingStAte.ExpAnded) {
			// we should expAnd the metAdAtA editor
			this._metAdAtAInfoContAiner.style.displAy = 'block';

			if (!this._metAdAtAEditorContAiner || !this._metAdAtAEditor) {
				// creAte editor
				this._metAdAtAEditorContAiner = DOM.Append(this._metAdAtAInfoContAiner, DOM.$('.metAdAtA-editor-contAiner'));
				this._buildMetAdAtAEditor();
			} else {
				this._lAyoutInfo.metAdAtAHeight = this._metAdAtAEditor.getContentHeight();
				this.lAyout({ metAdAtAEditor: true });
			}
		} else {
			// we should collApse the metAdAtA editor
			this._metAdAtAInfoContAiner.style.displAy = 'none';
			this._metAdAtAEditorDisposeStore.cleAr();
			this._lAyoutInfo.metAdAtAHeight = 0;
			this.lAyout({});
		}
	}

	updAteOutputRendering() {
		if (this.cell.outputFoldingStAte === PropertyFoldingStAte.ExpAnded) {
			this._outputInfoContAiner.style.displAy = 'block';

			if (!this._outputEditorContAiner || !this._outputEditor) {
				// creAte editor
				this._outputEditorContAiner = DOM.Append(this._outputInfoContAiner, DOM.$('.output-editor-contAiner'));
				this._buildOutputEditor();
			} else {
				this._lAyoutInfo.outputHeight = this._outputEditor.getContentHeight();
				this.lAyout({ outputEditor: true });
			}
		} else {
			this._outputInfoContAiner.style.displAy = 'none';
			this._outputEditorDisposeStore.cleAr();
			this._lAyoutInfo.outputHeight = 0;
			this.lAyout({});
		}
	}

	protected _getFormAtedMetAdAtAJSON(metAdAtA: NotebookCellMetAdAtA, lAnguAge?: string) {
		let filteredMetAdAtA: { [key: string]: Any } = {};

		if (this.notebookEditor.textModel) {
			const trAnsientMetAdAtA = this.notebookEditor.textModel!.trAnsientOptions.trAnsientMetAdAtA;

			const keys = new Set([...Object.keys(metAdAtA)]);
			for (let key of keys) {
				if (!(trAnsientMetAdAtA[key As keyof NotebookCellMetAdAtA])
				) {
					filteredMetAdAtA[key] = metAdAtA[key As keyof NotebookCellMetAdAtA];
				}
			}
		} else {
			filteredMetAdAtA = metAdAtA;
		}

		const content = JSON.stringify({
			lAnguAge,
			...filteredMetAdAtA
		});

		const edits = formAt(content, undefined, {});
		const metAdAtASource = ApplyEdits(content, edits);

		return metAdAtASource;
	}

	privAte _ApplySAnitizedMetAdAtAChAnges(currentMetAdAtA: NotebookCellMetAdAtA, newMetAdAtA: Any) {
		let result: { [key: string]: Any } = {};
		let newLAngAuge: string | undefined = undefined;
		try {
			const newMetAdAtAObj = JSON.pArse(newMetAdAtA);
			const keys = new Set([...Object.keys(newMetAdAtAObj)]);
			for (let key of keys) {
				switch (key As keyof NotebookCellMetAdAtA) {
					cAse 'breAkpointMArgin':
					cAse 'editAble':
					cAse 'hAsExecutionOrder':
					cAse 'inputCollApsed':
					cAse 'outputCollApsed':
					cAse 'runnAble':
						// booleAn
						if (typeof newMetAdAtAObj[key] === 'booleAn') {
							result[key] = newMetAdAtAObj[key];
						} else {
							result[key] = currentMetAdAtA[key As keyof NotebookCellMetAdAtA];
						}
						breAk;

					cAse 'executionOrder':
					cAse 'lAstRunDurAtion':
						// number
						if (typeof newMetAdAtAObj[key] === 'number') {
							result[key] = newMetAdAtAObj[key];
						} else {
							result[key] = currentMetAdAtA[key As keyof NotebookCellMetAdAtA];
						}
						breAk;
					cAse 'runStAte':
						// enum
						if (typeof newMetAdAtAObj[key] === 'number' && [1, 2, 3, 4].indexOf(newMetAdAtAObj[key]) >= 0) {
							result[key] = newMetAdAtAObj[key];
						} else {
							result[key] = currentMetAdAtA[key As keyof NotebookCellMetAdAtA];
						}
						breAk;
					cAse 'stAtusMessAge':
						// string
						if (typeof newMetAdAtAObj[key] === 'string') {
							result[key] = newMetAdAtAObj[key];
						} else {
							result[key] = currentMetAdAtA[key As keyof NotebookCellMetAdAtA];
						}
						breAk;
					defAult:
						if (key === 'lAnguAge') {
							newLAngAuge = newMetAdAtAObj[key];
						}
						result[key] = newMetAdAtAObj[key];
						breAk;
				}
			}

			if (newLAngAuge !== undefined && newLAngAuge !== this.cell.modified!.lAnguAge) {
				const index = this.notebookEditor.textModel!.cells.indexOf(this.cell.modified!);
				this.notebookEditor.textModel!.ApplyEdits(
					this.notebookEditor.textModel!.versionId,
					[{ editType: CellEditType.CellLAnguAge, index, lAnguAge: newLAngAuge }],
					true,
					undefined,
					() => undefined,
					undefined
				);
			}

			const index = this.notebookEditor.textModel!.cells.indexOf(this.cell.modified!);

			if (index < 0) {
				return;
			}

			this.notebookEditor.textModel!.ApplyEdits(this.notebookEditor.textModel!.versionId, [
				{ editType: CellEditType.MetAdAtA, index, metAdAtA: result }
			], true, undefined, () => undefined, undefined);
		} cAtch {
		}
	}

	privAte _buildMetAdAtAEditor() {
		if (this.cell.type === 'modified' || this.cell.type === 'unchAnged') {
			const originAlMetAdAtASource = this._getFormAtedMetAdAtAJSON(this.cell.originAl?.metAdAtA || {}, this.cell.originAl?.lAnguAge);
			const modifiedMetAdAtASource = this._getFormAtedMetAdAtAJSON(this.cell.modified?.metAdAtA || {}, this.cell.modified?.lAnguAge);
			this._metAdAtAEditor = this.instAntiAtionService.creAteInstAnce(DiffEditorWidget, this._metAdAtAEditorContAiner!, {
				...fixedDiffEditorOptions,
				overflowWidgetsDomNode: this.notebookEditor.getOverflowContAinerDomNode(),
				reAdOnly: fAlse,
				originAlEditAble: fAlse,
				ignoreTrimWhitespAce: fAlse
			});

			this._metAdAtAEditorContAiner?.clAssList.Add('diff');

			const mode = this.modeService.creAte('json');
			const originAlMetAdAtAModel = this.modelService.creAteModel(originAlMetAdAtASource, mode, CellUri.generAteCellMetAdAtAUri(this.cell.originAl!.uri, this.cell.originAl!.hAndle), fAlse);
			const modifiedMetAdAtAModel = this.modelService.creAteModel(modifiedMetAdAtASource, mode, CellUri.generAteCellMetAdAtAUri(this.cell.modified!.uri, this.cell.modified!.hAndle), fAlse);
			this._metAdAtAEditor.setModel({
				originAl: originAlMetAdAtAModel,
				modified: modifiedMetAdAtAModel
			});

			this._register(originAlMetAdAtAModel);
			this._register(modifiedMetAdAtAModel);

			this._lAyoutInfo.metAdAtAHeight = this._metAdAtAEditor.getContentHeight();
			this.lAyout({ metAdAtAEditor: true });

			this._register(this._metAdAtAEditor.onDidContentSizeChAnge((e) => {
				if (e.contentHeightChAnged && this.cell.metAdAtAFoldingStAte === PropertyFoldingStAte.ExpAnded) {
					this._lAyoutInfo.metAdAtAHeight = e.contentHeight;
					this.lAyout({ metAdAtAEditor: true });
				}
			}));

			let respondingToContentChAnge = fAlse;

			this._register(modifiedMetAdAtAModel.onDidChAngeContent(() => {
				respondingToContentChAnge = true;
				const vAlue = modifiedMetAdAtAModel.getVAlue();
				this._ApplySAnitizedMetAdAtAChAnges(this.cell.modified!.metAdAtA, vAlue);
				this._metAdAtAHeAder.refresh();
				respondingToContentChAnge = fAlse;
			}));

			this._register(this.cell.modified!.onDidChAngeMetAdAtA(() => {
				if (respondingToContentChAnge) {
					return;
				}

				const modifiedMetAdAtASource = this._getFormAtedMetAdAtAJSON(this.cell.modified?.metAdAtA || {}, this.cell.modified?.lAnguAge);
				modifiedMetAdAtAModel.setVAlue(modifiedMetAdAtASource);
			}));

			return;
		}

		this._metAdAtAEditor = this.instAntiAtionService.creAteInstAnce(CodeEditorWidget, this._metAdAtAEditorContAiner!, {
			...fixedEditorOptions,
			dimension: {
				width: this.cell.getComputedCellContAinerWidth(this.notebookEditor.getLAyoutInfo(), fAlse, true),
				height: 0
			},
			overflowWidgetsDomNode: this.notebookEditor.getOverflowContAinerDomNode(),
			reAdOnly: fAlse
		}, {});

		const mode = this.modeService.creAte('jsonc');
		const originAlMetAdAtASource = this._getFormAtedMetAdAtAJSON(
			this.cell.type === 'insert'
				? this.cell.modified!.metAdAtA || {}
				: this.cell.originAl!.metAdAtA || {});
		const uri = this.cell.type === 'insert'
			? this.cell.modified!.uri
			: this.cell.originAl!.uri;
		const hAndle = this.cell.type === 'insert'
			? this.cell.modified!.hAndle
			: this.cell.originAl!.hAndle;

		const modelUri = CellUri.generAteCellMetAdAtAUri(uri, hAndle);
		const metAdAtAModel = this.modelService.creAteModel(originAlMetAdAtASource, mode, modelUri, fAlse);
		this._metAdAtAEditor.setModel(metAdAtAModel);
		this._register(metAdAtAModel);

		this._lAyoutInfo.metAdAtAHeight = this._metAdAtAEditor.getContentHeight();
		this.lAyout({ metAdAtAEditor: true });

		this._register(this._metAdAtAEditor.onDidContentSizeChAnge((e) => {
			if (e.contentHeightChAnged && this.cell.metAdAtAFoldingStAte === PropertyFoldingStAte.ExpAnded) {
				this._lAyoutInfo.metAdAtAHeight = e.contentHeight;
				this.lAyout({ metAdAtAEditor: true });
			}
		}));
	}

	privAte _getFormAtedOutputJSON(outputs: Any[]) {
		const content = JSON.stringify(outputs);

		const edits = formAt(content, undefined, {});
		const source = ApplyEdits(content, edits);

		return source;
	}

	privAte _buildOutputEditor() {
		if ((this.cell.type === 'modified' || this.cell.type === 'unchAnged') && !this.notebookEditor.textModel!.trAnsientOptions.trAnsientOutputs) {
			const originAlOutputsSource = this._getFormAtedOutputJSON(this.cell.originAl?.outputs || []);
			const modifiedOutputsSource = this._getFormAtedOutputJSON(this.cell.modified?.outputs || []);
			if (originAlOutputsSource !== modifiedOutputsSource) {
				this._outputEditor = this.instAntiAtionService.creAteInstAnce(DiffEditorWidget, this._outputEditorContAiner!, {
					...fixedDiffEditorOptions,
					overflowWidgetsDomNode: this.notebookEditor.getOverflowContAinerDomNode(),
					reAdOnly: true,
					ignoreTrimWhitespAce: fAlse
				});

				this._outputEditorContAiner?.clAssList.Add('diff');

				const mode = this.modeService.creAte('json');
				const originAlModel = this.modelService.creAteModel(originAlOutputsSource, mode, undefined, true);
				const modifiedModel = this.modelService.creAteModel(modifiedOutputsSource, mode, undefined, true);
				this._outputEditor.setModel({
					originAl: originAlModel,
					modified: modifiedModel
				});

				this._lAyoutInfo.outputHeight = this._outputEditor.getContentHeight();
				this.lAyout({ outputEditor: true });

				this._register(this._outputEditor.onDidContentSizeChAnge((e) => {
					if (e.contentHeightChAnged && this.cell.outputFoldingStAte === PropertyFoldingStAte.ExpAnded) {
						this._lAyoutInfo.outputHeight = e.contentHeight;
						this.lAyout({ outputEditor: true });
					}
				}));

				this._register(this.cell.modified!.onDidChAngeOutputs(() => {
					const modifiedOutputsSource = this._getFormAtedOutputJSON(this.cell.modified?.outputs || []);
					modifiedModel.setVAlue(modifiedOutputsSource);
					this._outputHeAder.refresh();
				}));

				return;
			}
		}

		this._outputEditor = this.instAntiAtionService.creAteInstAnce(CodeEditorWidget, this._outputEditorContAiner!, {
			...fixedEditorOptions,
			dimension: {
				width: this.cell.getComputedCellContAinerWidth(this.notebookEditor.getLAyoutInfo(), fAlse, true),
				height: 0
			},
			overflowWidgetsDomNode: this.notebookEditor.getOverflowContAinerDomNode()
		}, {});

		const mode = this.modeService.creAte('json');
		const originAloutputSource = this._getFormAtedOutputJSON(
			this.notebookEditor.textModel!.trAnsientOptions
				? []
				: this.cell.type === 'insert'
					? this.cell.modified!.outputs || []
					: this.cell.originAl!.outputs || []);
		const outputModel = this.modelService.creAteModel(originAloutputSource, mode, undefined, true);
		this._outputEditor.setModel(outputModel);

		this._lAyoutInfo.outputHeight = this._outputEditor.getContentHeight();
		this.lAyout({ outputEditor: true });

		this._register(this._outputEditor.onDidContentSizeChAnge((e) => {
			if (e.contentHeightChAnged && this.cell.outputFoldingStAte === PropertyFoldingStAte.ExpAnded) {
				this._lAyoutInfo.outputHeight = e.contentHeight;
				this.lAyout({ outputEditor: true });
			}
		}));
	}

	protected lAyoutNotebookCell() {
		this.notebookEditor.lAyoutNotebookCell(
			this.cell,
			this._lAyoutInfo.editorHeight
			+ this._lAyoutInfo.editorMArgin
			+ this._lAyoutInfo.metAdAtAHeight
			+ this._lAyoutInfo.metAdAtAStAtusHeight
			+ this._lAyoutInfo.outputHeight
			+ this._lAyoutInfo.outputStAtusHeight
			+ this._lAyoutInfo.bodyMArgin
		);
	}

	AbstrAct initDAtA(): void;
	AbstrAct styleContAiner(contAiner: HTMLElement): void;
	AbstrAct buildSourceEditor(sourceContAiner: HTMLElement): void;
	AbstrAct onDidLAyoutChAnge(event: CellDiffViewModelLAyoutChAngeEvent): void;
	AbstrAct lAyout(stAte: { outerWidth?: booleAn, editorHeight?: booleAn, metAdAtAEditor?: booleAn, outputEditor?: booleAn }): void;
}

export clAss DeletedCell extends AbstrActCellRenderer {
	privAte _editor!: CodeEditorWidget;
	constructor(
		reAdonly notebookEditor: INotebookTextDiffEditor,
		reAdonly cell: CellDiffViewModel,
		reAdonly templAteDAtA: CellDiffRenderTemplAte,
		@IModeService reAdonly modeService: IModeService,
		@IModelService reAdonly modelService: IModelService,
		@IInstAntiAtionService protected reAdonly instAntiAtionService: IInstAntiAtionService,
		@IContextMenuService protected reAdonly contextMenuService: IContextMenuService,
		@IKeybindingService protected reAdonly keybindingService: IKeybindingService,
		@INotificAtionService protected reAdonly notificAtionService: INotificAtionService,
		@IMenuService protected reAdonly menuService: IMenuService,
		@IContextKeyService protected reAdonly contextKeyService: IContextKeyService,


	) {
		super(notebookEditor, cell, templAteDAtA, 'left', instAntiAtionService, modeService, modelService, contextMenuService, keybindingService, notificAtionService, menuService, contextKeyService);
	}

	initDAtA(): void {
	}

	styleContAiner(contAiner: HTMLElement) {
		contAiner.clAssList.Add('removed');
	}

	buildSourceEditor(sourceContAiner: HTMLElement): void {
		const originAlCell = this.cell.originAl!;
		const lineCount = originAlCell.textBuffer.getLineCount();
		const lineHeight = this.notebookEditor.getLAyoutInfo().fontInfo.lineHeight || 17;
		const editorHeight = lineCount * lineHeight + EDITOR_TOP_PADDING + EDITOR_BOTTOM_PADDING;

		const editorContAiner = DOM.Append(sourceContAiner, DOM.$('.editor-contAiner'));

		this._editor = this.instAntiAtionService.creAteInstAnce(CodeEditorWidget, editorContAiner, {
			...fixedEditorOptions,
			dimension: {
				width: (this.notebookEditor.getLAyoutInfo().width - 2 * DIFF_CELL_MARGIN) / 2 - 18,
				height: editorHeight
			},
			overflowWidgetsDomNode: this.notebookEditor.getOverflowContAinerDomNode()
		}, {});
		this._lAyoutInfo.editorHeight = editorHeight;

		this._register(this._editor.onDidContentSizeChAnge((e) => {
			if (e.contentHeightChAnged && this._lAyoutInfo.editorHeight !== e.contentHeight) {
				this._lAyoutInfo.editorHeight = e.contentHeight;
				this.lAyout({ editorHeight: true });
			}
		}));

		originAlCell.resolveTextModelRef().then(ref => {
			this._register(ref);

			const textModel = ref.object.textEditorModel;
			this._editor.setModel(textModel);
			this._lAyoutInfo.editorHeight = this._editor.getContentHeight();
			this.lAyout({ editorHeight: true });
		});

	}

	onDidLAyoutChAnge(e: CellDiffViewModelLAyoutChAngeEvent) {
		if (e.outerWidth !== undefined) {
			this.lAyout({ outerWidth: true });
		}
	}
	lAyout(stAte: { outerWidth?: booleAn, editorHeight?: booleAn, metAdAtAEditor?: booleAn, outputEditor?: booleAn }) {
		DOM.scheduleAtNextAnimAtionFrAme(() => {
			if (stAte.editorHeight || stAte.outerWidth) {
				this._editor.lAyout({
					width: this.cell.getComputedCellContAinerWidth(this.notebookEditor.getLAyoutInfo(), fAlse, fAlse),
					height: this._lAyoutInfo.editorHeight
				});
			}

			if (stAte.metAdAtAEditor || stAte.outerWidth) {
				this._metAdAtAEditor?.lAyout({
					width: this.cell.getComputedCellContAinerWidth(this.notebookEditor.getLAyoutInfo(), fAlse, fAlse),
					height: this._lAyoutInfo.metAdAtAHeight
				});
			}

			if (stAte.outputEditor || stAte.outerWidth) {
				this._outputEditor?.lAyout({
					width: this.cell.getComputedCellContAinerWidth(this.notebookEditor.getLAyoutInfo(), fAlse, fAlse),
					height: this._lAyoutInfo.outputHeight
				});
			}

			this.lAyoutNotebookCell();
		});
	}
}

export clAss InsertCell extends AbstrActCellRenderer {
	privAte _editor!: CodeEditorWidget;
	constructor(
		reAdonly notebookEditor: INotebookTextDiffEditor,
		reAdonly cell: CellDiffViewModel,
		reAdonly templAteDAtA: CellDiffRenderTemplAte,
		@IInstAntiAtionService protected reAdonly instAntiAtionService: IInstAntiAtionService,
		@IModeService reAdonly modeService: IModeService,
		@IModelService reAdonly modelService: IModelService,
		@IContextMenuService protected reAdonly contextMenuService: IContextMenuService,
		@IKeybindingService protected reAdonly keybindingService: IKeybindingService,
		@INotificAtionService protected reAdonly notificAtionService: INotificAtionService,
		@IMenuService protected reAdonly menuService: IMenuService,
		@IContextKeyService protected reAdonly contextKeyService: IContextKeyService,
	) {
		super(notebookEditor, cell, templAteDAtA, 'right', instAntiAtionService, modeService, modelService, contextMenuService, keybindingService, notificAtionService, menuService, contextKeyService);
	}

	initDAtA(): void {
	}

	styleContAiner(contAiner: HTMLElement): void {
		contAiner.clAssList.Add('inserted');
	}

	buildSourceEditor(sourceContAiner: HTMLElement): void {
		const modifiedCell = this.cell.modified!;
		const lineCount = modifiedCell.textBuffer.getLineCount();
		const lineHeight = this.notebookEditor.getLAyoutInfo().fontInfo.lineHeight || 17;
		const editorHeight = lineCount * lineHeight + EDITOR_TOP_PADDING + EDITOR_BOTTOM_PADDING;
		const editorContAiner = DOM.Append(sourceContAiner, DOM.$('.editor-contAiner'));

		this._editor = this.instAntiAtionService.creAteInstAnce(CodeEditorWidget, editorContAiner, {
			...fixedEditorOptions,
			dimension: {
				width: (this.notebookEditor.getLAyoutInfo().width - 2 * DIFF_CELL_MARGIN) / 2 - 18,
				height: editorHeight
			},
			overflowWidgetsDomNode: this.notebookEditor.getOverflowContAinerDomNode(),
			reAdOnly: fAlse
		}, {});

		this._lAyoutInfo.editorHeight = editorHeight;

		this._register(this._editor.onDidContentSizeChAnge((e) => {
			if (e.contentHeightChAnged && this._lAyoutInfo.editorHeight !== e.contentHeight) {
				this._lAyoutInfo.editorHeight = e.contentHeight;
				this.lAyout({ editorHeight: true });
			}
		}));

		modifiedCell.resolveTextModelRef().then(ref => {
			this._register(ref);

			const textModel = ref.object.textEditorModel;
			this._editor.setModel(textModel);
			this._lAyoutInfo.editorHeight = this._editor.getContentHeight();
			this.lAyout({ editorHeight: true });
		});
	}

	onDidLAyoutChAnge(e: CellDiffViewModelLAyoutChAngeEvent) {
		if (e.outerWidth !== undefined) {
			this.lAyout({ outerWidth: true });
		}
	}

	lAyout(stAte: { outerWidth?: booleAn, editorHeight?: booleAn, metAdAtAEditor?: booleAn, outputEditor?: booleAn }) {
		DOM.scheduleAtNextAnimAtionFrAme(() => {
			if (stAte.editorHeight || stAte.outerWidth) {
				this._editor.lAyout({
					width: this.cell.getComputedCellContAinerWidth(this.notebookEditor.getLAyoutInfo(), fAlse, fAlse),
					height: this._lAyoutInfo.editorHeight
				});
			}

			if (stAte.metAdAtAEditor || stAte.outerWidth) {
				this._metAdAtAEditor?.lAyout({
					width: this.cell.getComputedCellContAinerWidth(this.notebookEditor.getLAyoutInfo(), fAlse, true),
					height: this._lAyoutInfo.metAdAtAHeight
				});
			}

			if (stAte.outputEditor || stAte.outerWidth) {
				this._outputEditor?.lAyout({
					width: this.cell.getComputedCellContAinerWidth(this.notebookEditor.getLAyoutInfo(), fAlse, true),
					height: this._lAyoutInfo.outputHeight
				});
			}

			this.lAyoutNotebookCell();
		});
	}
}

export clAss ModifiedCell extends AbstrActCellRenderer {
	privAte _editor?: DiffEditorWidget;
	privAte _editorContAiner!: HTMLElement;
	privAte _inputToolbArContAiner!: HTMLElement;
	protected _toolbAr!: ToolBAr;
	protected _menu!: IMenu;

	constructor(
		reAdonly notebookEditor: INotebookTextDiffEditor,
		reAdonly cell: CellDiffViewModel,
		reAdonly templAteDAtA: CellDiffRenderTemplAte,
		@IInstAntiAtionService protected reAdonly instAntiAtionService: IInstAntiAtionService,
		@IModeService reAdonly modeService: IModeService,
		@IModelService reAdonly modelService: IModelService,
		@IContextMenuService protected reAdonly contextMenuService: IContextMenuService,
		@IKeybindingService protected reAdonly keybindingService: IKeybindingService,
		@INotificAtionService protected reAdonly notificAtionService: INotificAtionService,
		@IMenuService protected reAdonly menuService: IMenuService,
		@IContextKeyService protected reAdonly contextKeyService: IContextKeyService
	) {
		super(notebookEditor, cell, templAteDAtA, 'full', instAntiAtionService, modeService, modelService, contextMenuService, keybindingService, notificAtionService, menuService, contextKeyService);
	}

	initDAtA(): void {
	}

	styleContAiner(contAiner: HTMLElement): void {
	}

	buildSourceEditor(sourceContAiner: HTMLElement): void {
		const modifiedCell = this.cell.modified!;
		const lineCount = modifiedCell.textBuffer.getLineCount();
		const lineHeight = this.notebookEditor.getLAyoutInfo().fontInfo.lineHeight || 17;
		const editorHeight = lineCount * lineHeight + EDITOR_TOP_PADDING + EDITOR_BOTTOM_PADDING;
		this._editorContAiner = DOM.Append(sourceContAiner, DOM.$('.editor-contAiner'));

		this._editor = this.instAntiAtionService.creAteInstAnce(DiffEditorWidget, this._editorContAiner, {
			...fixedDiffEditorOptions,
			overflowWidgetsDomNode: this.notebookEditor.getOverflowContAinerDomNode(),
			originAlEditAble: fAlse,
			ignoreTrimWhitespAce: fAlse
		});
		this._editorContAiner.clAssList.Add('diff');

		this._editor.lAyout({
			width: this.notebookEditor.getLAyoutInfo().width - 2 * DIFF_CELL_MARGIN,
			height: editorHeight
		});

		this._editorContAiner.style.height = `${editorHeight}px`;

		this._register(this._editor.onDidContentSizeChAnge((e) => {
			if (e.contentHeightChAnged && this._lAyoutInfo.editorHeight !== e.contentHeight) {
				this._lAyoutInfo.editorHeight = e.contentHeight;
				this.lAyout({ editorHeight: true });
			}
		}));

		this._initiAlizeSourceDiffEditor();

		this._inputToolbArContAiner = DOM.Append(sourceContAiner, DOM.$('.editor-input-toolbAr-contAiner'));
		const cellToolbArContAiner = DOM.Append(this._inputToolbArContAiner, DOM.$('div.property-toolbAr'));
		this._toolbAr = new ToolBAr(cellToolbArContAiner, this.contextMenuService, {
			ActionViewItemProvider: Action => {
				if (Action instAnceof MenuItemAction) {
					const item = new CodiconActionViewItem(Action, this.keybindingService, this.notificAtionService, this.contextMenuService);
					return item;
				}

				return undefined;
			}
		});

		this._toolbAr.context = {
			cell: this.cell
		};

		this._menu = this.menuService.creAteMenu(MenuId.NotebookDiffCellInputTitle, this.contextKeyService);
		const Actions: IAction[] = [];
		creAteAndFillInActionBArActions(this._menu, { shouldForwArdArgs: true }, Actions);
		this._toolbAr.setActions(Actions);

		if (this.cell.modified!.getVAlue() !== this.cell.originAl!.getVAlue()) {
			this._inputToolbArContAiner.style.displAy = 'block';
		} else {
			this._inputToolbArContAiner.style.displAy = 'none';
		}

		this._register(this.cell.modified!.onDidChAngeContent(() => {
			if (this.cell.modified!.getVAlue() !== this.cell.originAl!.getVAlue()) {
				this._inputToolbArContAiner.style.displAy = 'block';
			} else {
				this._inputToolbArContAiner.style.displAy = 'none';
			}
		}));
	}

	privAte Async _initiAlizeSourceDiffEditor() {
		const originAlCell = this.cell.originAl!;
		const modifiedCell = this.cell.modified!;

		const originAlRef = AwAit originAlCell.resolveTextModelRef();
		const modifiedRef = AwAit modifiedCell.resolveTextModelRef();
		const textModel = originAlRef.object.textEditorModel;
		const modifiedTextModel = modifiedRef.object.textEditorModel;
		this._register(originAlRef);
		this._register(modifiedRef);

		this._editor!.setModel({
			originAl: textModel,
			modified: modifiedTextModel
		});

		const contentHeight = this._editor!.getContentHeight();
		this._lAyoutInfo.editorHeight = contentHeight;
		this.lAyout({ editorHeight: true });

	}

	onDidLAyoutChAnge(e: CellDiffViewModelLAyoutChAngeEvent) {
		if (e.outerWidth !== undefined) {
			this.lAyout({ outerWidth: true });
		}
	}

	lAyout(stAte: { outerWidth?: booleAn, editorHeight?: booleAn, metAdAtAEditor?: booleAn, outputEditor?: booleAn }) {
		DOM.scheduleAtNextAnimAtionFrAme(() => {
			if (stAte.editorHeight || stAte.outerWidth) {
				this._editorContAiner.style.height = `${this._lAyoutInfo.editorHeight}px`;
				this._editor!.lAyout();
			}

			if (stAte.metAdAtAEditor || stAte.outerWidth) {
				if (this._metAdAtAEditorContAiner) {
					this._metAdAtAEditorContAiner.style.height = `${this._lAyoutInfo.metAdAtAHeight}px`;
					this._metAdAtAEditor?.lAyout();
				}
			}

			if (stAte.outputEditor || stAte.outerWidth) {
				if (this._outputEditorContAiner) {
					this._outputEditorContAiner.style.height = `${this._lAyoutInfo.outputHeight}px`;
					this._outputEditor?.lAyout();
				}
			}

			this.lAyoutNotebookCell();
		});
	}
}
