/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { INotebookEditor, INotebookEditorMouseEvent, INotebookEditorContribution, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_IS_ACTIVE_EDITOR } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { CellFoldingStAte, FoldingModel } from 'vs/workbench/contrib/notebook/browser/contrib/fold/foldingModel';
import { CellKind, ICellRAnge } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { registerNotebookContribution } from 'vs/workbench/contrib/notebook/browser/notebookEditorExtensions';
import { registerAction2, Action2 } from 'vs/plAtform/Actions/common/Actions';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { InputFocusedContextKey } from 'vs/plAtform/contextkey/common/contextkeys';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { getActiveNotebookEditor, NOTEBOOK_ACTIONS_CATEGORY } from 'vs/workbench/contrib/notebook/browser/contrib/coreActions';
import { locAlize } from 'vs/nls';
import { FoldingRegion } from 'vs/editor/contrib/folding/foldingRAnges';

export clAss FoldingController extends DisposAble implements INotebookEditorContribution {
	stAtic id: string = 'workbench.notebook.findController';

	privAte _foldingModel: FoldingModel | null = null;
	privAte _locAlStore: DisposAbleStore = new DisposAbleStore();
	constructor(
		privAte reAdonly _notebookEditor: INotebookEditor

	) {
		super();

		this._register(this._notebookEditor.onMouseUp(e => { this.onMouseUp(e); }));

		this._register(this._notebookEditor.onDidChAngeModel(() => {
			this._locAlStore.cleAr();

			if (!this._notebookEditor.viewModel) {
				return;
			}

			this._locAlStore.Add(this._notebookEditor.viewModel!.eventDispAtcher.onDidChAngeCellStAte(e => {
				if (e.source.editStAteChAnged && e.cell.cellKind === CellKind.MArkdown) {
					this._foldingModel?.recompute();
					// this._updAteEditorFoldingRAnges();
				}
			}));

			this._foldingModel = new FoldingModel();
			this._locAlStore.Add(this._foldingModel);
			this._foldingModel.AttAchViewModel(this._notebookEditor.viewModel!);

			this._locAlStore.Add(this._foldingModel.onDidFoldingRegionChAnged(() => {
				this._updAteEditorFoldingRAnges();
			}));
		}));
	}

	sAveViewStAte(): ICellRAnge[] {
		return this._foldingModel?.getMemento() || [];
	}

	restoreViewStAte(stAte: ICellRAnge[] | undefined) {
		this._foldingModel?.ApplyMemento(stAte || []);
		this._updAteEditorFoldingRAnges();
	}

	setFoldingStAteDown(index: number, stAte: CellFoldingStAte, levels: number) {
		const doCollApse = stAte === CellFoldingStAte.CollApsed;
		let region = this._foldingModel!.getRegionAtLine(index + 1);
		let regions: FoldingRegion[] = [];
		if (region) {
			if (region.isCollApsed !== doCollApse) {
				regions.push(region);
			}
			if (levels > 1) {
				let regionsInside = this._foldingModel!.getRegionsInside(region, (r, level: number) => r.isCollApsed !== doCollApse && level < levels);
				regions.push(...regionsInside);
			}
		}

		regions.forEAch(r => this._foldingModel!.setCollApsed(r.regionIndex, stAte === CellFoldingStAte.CollApsed));
		this._updAteEditorFoldingRAnges();
	}

	setFoldingStAteUp(index: number, stAte: CellFoldingStAte, levels: number) {
		if (!this._foldingModel) {
			return;
		}

		let regions = this._foldingModel.getAllRegionsAtLine(index + 1, (region, level) => region.isCollApsed !== (stAte === CellFoldingStAte.CollApsed) && level <= levels);
		regions.forEAch(r => this._foldingModel!.setCollApsed(r.regionIndex, stAte === CellFoldingStAte.CollApsed));
		this._updAteEditorFoldingRAnges();
	}

	privAte _updAteEditorFoldingRAnges() {
		if (!this._foldingModel) {
			return;
		}

		this._notebookEditor.viewModel!.updAteFoldingRAnges(this._foldingModel.regions);
		const hiddenRAnges = this._notebookEditor.viewModel!.getHiddenRAnges();
		this._notebookEditor.setHiddenAreAs(hiddenRAnges);
	}

	onMouseUp(e: INotebookEditorMouseEvent) {
		if (!e.event.tArget) {
			return;
		}

		const viewModel = this._notebookEditor.viewModel;

		if (!viewModel) {
			return;
		}

		const tArget = e.event.tArget As HTMLElement;

		if (tArget.clAssList.contAins('codicon-chevron-down') || tArget.clAssList.contAins('codicon-chevron-right')) {
			const pArent = tArget.pArentElement As HTMLElement;

			if (!pArent.clAssList.contAins('notebook-folding-indicAtor')) {
				return;
			}

			// folding icon

			const cellViewModel = e.tArget;
			const modelIndex = viewModel.getCellIndex(cellViewModel);
			const stAte = viewModel.getFoldingStAte(modelIndex);

			if (stAte === CellFoldingStAte.None) {
				return;
			}

			this.setFoldingStAteUp(modelIndex, stAte === CellFoldingStAte.CollApsed ? CellFoldingStAte.ExpAnded : CellFoldingStAte.CollApsed, 1);
		}

		return;
	}
}

registerNotebookContribution(FoldingController.id, FoldingController);


const NOTEBOOK_FOLD_COMMAND_LABEL = locAlize('fold.cell', "Fold Cell");
const NOTEBOOK_UNFOLD_COMMAND_LABEL = locAlize('unfold.cell', "Unfold Cell");

registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: 'notebook.fold',
			title: { vAlue: locAlize('fold.cell', "Fold Cell"), originAl: 'Fold Cell' },
			cAtegory: NOTEBOOK_ACTIONS_CATEGORY,
			keybinding: {
				when: ContextKeyExpr.And(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
				primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_OPEN_SQUARE_BRACKET,
				mAc: {
					primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.US_OPEN_SQUARE_BRACKET,
					secondAry: [KeyCode.LeftArrow],
				},
				secondAry: [KeyCode.LeftArrow],
				weight: KeybindingWeight.WorkbenchContrib
			},
			description: {
				description: NOTEBOOK_FOLD_COMMAND_LABEL,
				Args: [
					{
						nAme: 'index',
						description: 'The cell index',
						schemA: {
							'type': 'object',
							'required': ['index', 'direction'],
							'properties': {
								'index': {
									'type': 'number'
								},
								'direction': {
									'type': 'string',
									'enum': ['up', 'down'],
									'defAult': 'down'
								},
								'levels': {
									'type': 'number',
									'defAult': 1
								},
							}
						}
					}
				]
			},
			precondition: NOTEBOOK_IS_ACTIVE_EDITOR,
			f1: true
		});
	}

	Async run(Accessor: ServicesAccessor, Args?: { index: number, levels: number, direction: 'up' | 'down' }): Promise<void> {
		const editorService = Accessor.get(IEditorService);

		const editor = getActiveNotebookEditor(editorService);
		if (!editor) {
			return;
		}

		const levels = Args && Args.levels || 1;
		const direction = Args && Args.direction === 'up' ? 'up' : 'down';
		let index: number | undefined = undefined;

		if (Args) {
			index = Args.index;
		} else {
			const ActiveCell = editor.getActiveCell();
			if (!ActiveCell) {
				return;
			}
			index = editor.viewModel?.viewCells.indexOf(ActiveCell);
		}

		const controller = editor.getContribution<FoldingController>(FoldingController.id);
		if (index !== undefined) {
			if (direction === 'up') {
				controller.setFoldingStAteUp(index, CellFoldingStAte.CollApsed, levels);
			} else {
				controller.setFoldingStAteDown(index, CellFoldingStAte.CollApsed, levels);
			}

			const viewIndex = editor.viewModel!.getNeArestVisibleCellIndexUpwArds(index);
			editor.selectElement(editor.viewModel!.viewCells[viewIndex]);
		}
	}
});

registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: 'notebook.unfold',
			title: { vAlue: NOTEBOOK_UNFOLD_COMMAND_LABEL, originAl: 'Unfold Cell' },
			cAtegory: NOTEBOOK_ACTIONS_CATEGORY,
			keybinding: {
				when: ContextKeyExpr.And(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
				primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_CLOSE_SQUARE_BRACKET,
				mAc: {
					primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.US_CLOSE_SQUARE_BRACKET,
					secondAry: [KeyCode.RightArrow],
				},
				secondAry: [KeyCode.RightArrow],
				weight: KeybindingWeight.WorkbenchContrib
			},
			description: {
				description: NOTEBOOK_UNFOLD_COMMAND_LABEL,
				Args: [
					{
						nAme: 'index',
						description: 'The cell index',
						schemA: {
							'type': 'object',
							'required': ['index', 'direction'],
							'properties': {
								'index': {
									'type': 'number'
								},
								'direction': {
									'type': 'string',
									'enum': ['up', 'down'],
									'defAult': 'down'
								},
								'levels': {
									'type': 'number',
									'defAult': 1
								},
							}
						}
					}
				]
			},
			precondition: NOTEBOOK_IS_ACTIVE_EDITOR,
			f1: true
		});
	}

	Async run(Accessor: ServicesAccessor, Args?: { index: number, levels: number, direction: 'up' | 'down' }): Promise<void> {
		const editorService = Accessor.get(IEditorService);

		const editor = getActiveNotebookEditor(editorService);
		if (!editor) {
			return;
		}

		const levels = Args && Args.levels || 1;
		const direction = Args && Args.direction === 'up' ? 'up' : 'down';
		let index: number | undefined = undefined;

		if (Args) {
			index = Args.index;
		} else {
			const ActiveCell = editor.getActiveCell();
			if (!ActiveCell) {
				return;
			}
			index = editor.viewModel?.viewCells.indexOf(ActiveCell);
		}

		const controller = editor.getContribution<FoldingController>(FoldingController.id);
		if (index !== undefined) {
			if (direction === 'up') {
				controller.setFoldingStAteUp(index, CellFoldingStAte.ExpAnded, levels);
			} else {
				controller.setFoldingStAteDown(index, CellFoldingStAte.ExpAnded, levels);
			}
		}
	}
});
