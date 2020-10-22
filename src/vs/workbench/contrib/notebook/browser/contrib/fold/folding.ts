/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { INoteBookEditor, INoteBookEditorMouseEvent, INoteBookEditorContriBution, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_IS_ACTIVE_EDITOR } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { CellFoldingState, FoldingModel } from 'vs/workBench/contriB/noteBook/Browser/contriB/fold/foldingModel';
import { CellKind, ICellRange } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { registerNoteBookContriBution } from 'vs/workBench/contriB/noteBook/Browser/noteBookEditorExtensions';
import { registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { InputFocusedContextKey } from 'vs/platform/contextkey/common/contextkeys';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { getActiveNoteBookEditor, NOTEBOOK_ACTIONS_CATEGORY } from 'vs/workBench/contriB/noteBook/Browser/contriB/coreActions';
import { localize } from 'vs/nls';
import { FoldingRegion } from 'vs/editor/contriB/folding/foldingRanges';

export class FoldingController extends DisposaBle implements INoteBookEditorContriBution {
	static id: string = 'workBench.noteBook.findController';

	private _foldingModel: FoldingModel | null = null;
	private _localStore: DisposaBleStore = new DisposaBleStore();
	constructor(
		private readonly _noteBookEditor: INoteBookEditor

	) {
		super();

		this._register(this._noteBookEditor.onMouseUp(e => { this.onMouseUp(e); }));

		this._register(this._noteBookEditor.onDidChangeModel(() => {
			this._localStore.clear();

			if (!this._noteBookEditor.viewModel) {
				return;
			}

			this._localStore.add(this._noteBookEditor.viewModel!.eventDispatcher.onDidChangeCellState(e => {
				if (e.source.editStateChanged && e.cell.cellKind === CellKind.Markdown) {
					this._foldingModel?.recompute();
					// this._updateEditorFoldingRanges();
				}
			}));

			this._foldingModel = new FoldingModel();
			this._localStore.add(this._foldingModel);
			this._foldingModel.attachViewModel(this._noteBookEditor.viewModel!);

			this._localStore.add(this._foldingModel.onDidFoldingRegionChanged(() => {
				this._updateEditorFoldingRanges();
			}));
		}));
	}

	saveViewState(): ICellRange[] {
		return this._foldingModel?.getMemento() || [];
	}

	restoreViewState(state: ICellRange[] | undefined) {
		this._foldingModel?.applyMemento(state || []);
		this._updateEditorFoldingRanges();
	}

	setFoldingStateDown(index: numBer, state: CellFoldingState, levels: numBer) {
		const doCollapse = state === CellFoldingState.Collapsed;
		let region = this._foldingModel!.getRegionAtLine(index + 1);
		let regions: FoldingRegion[] = [];
		if (region) {
			if (region.isCollapsed !== doCollapse) {
				regions.push(region);
			}
			if (levels > 1) {
				let regionsInside = this._foldingModel!.getRegionsInside(region, (r, level: numBer) => r.isCollapsed !== doCollapse && level < levels);
				regions.push(...regionsInside);
			}
		}

		regions.forEach(r => this._foldingModel!.setCollapsed(r.regionIndex, state === CellFoldingState.Collapsed));
		this._updateEditorFoldingRanges();
	}

	setFoldingStateUp(index: numBer, state: CellFoldingState, levels: numBer) {
		if (!this._foldingModel) {
			return;
		}

		let regions = this._foldingModel.getAllRegionsAtLine(index + 1, (region, level) => region.isCollapsed !== (state === CellFoldingState.Collapsed) && level <= levels);
		regions.forEach(r => this._foldingModel!.setCollapsed(r.regionIndex, state === CellFoldingState.Collapsed));
		this._updateEditorFoldingRanges();
	}

	private _updateEditorFoldingRanges() {
		if (!this._foldingModel) {
			return;
		}

		this._noteBookEditor.viewModel!.updateFoldingRanges(this._foldingModel.regions);
		const hiddenRanges = this._noteBookEditor.viewModel!.getHiddenRanges();
		this._noteBookEditor.setHiddenAreas(hiddenRanges);
	}

	onMouseUp(e: INoteBookEditorMouseEvent) {
		if (!e.event.target) {
			return;
		}

		const viewModel = this._noteBookEditor.viewModel;

		if (!viewModel) {
			return;
		}

		const target = e.event.target as HTMLElement;

		if (target.classList.contains('codicon-chevron-down') || target.classList.contains('codicon-chevron-right')) {
			const parent = target.parentElement as HTMLElement;

			if (!parent.classList.contains('noteBook-folding-indicator')) {
				return;
			}

			// folding icon

			const cellViewModel = e.target;
			const modelIndex = viewModel.getCellIndex(cellViewModel);
			const state = viewModel.getFoldingState(modelIndex);

			if (state === CellFoldingState.None) {
				return;
			}

			this.setFoldingStateUp(modelIndex, state === CellFoldingState.Collapsed ? CellFoldingState.Expanded : CellFoldingState.Collapsed, 1);
		}

		return;
	}
}

registerNoteBookContriBution(FoldingController.id, FoldingController);


const NOTEBOOK_FOLD_COMMAND_LABEL = localize('fold.cell', "Fold Cell");
const NOTEBOOK_UNFOLD_COMMAND_LABEL = localize('unfold.cell', "Unfold Cell");

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'noteBook.fold',
			title: { value: localize('fold.cell', "Fold Cell"), original: 'Fold Cell' },
			category: NOTEBOOK_ACTIONS_CATEGORY,
			keyBinding: {
				when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_OPEN_SQUARE_BRACKET,
				mac: {
					primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.US_OPEN_SQUARE_BRACKET,
					secondary: [KeyCode.LeftArrow],
				},
				secondary: [KeyCode.LeftArrow],
				weight: KeyBindingWeight.WorkBenchContriB
			},
			description: {
				description: NOTEBOOK_FOLD_COMMAND_LABEL,
				args: [
					{
						name: 'index',
						description: 'The cell index',
						schema: {
							'type': 'oBject',
							'required': ['index', 'direction'],
							'properties': {
								'index': {
									'type': 'numBer'
								},
								'direction': {
									'type': 'string',
									'enum': ['up', 'down'],
									'default': 'down'
								},
								'levels': {
									'type': 'numBer',
									'default': 1
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

	async run(accessor: ServicesAccessor, args?: { index: numBer, levels: numBer, direction: 'up' | 'down' }): Promise<void> {
		const editorService = accessor.get(IEditorService);

		const editor = getActiveNoteBookEditor(editorService);
		if (!editor) {
			return;
		}

		const levels = args && args.levels || 1;
		const direction = args && args.direction === 'up' ? 'up' : 'down';
		let index: numBer | undefined = undefined;

		if (args) {
			index = args.index;
		} else {
			const activeCell = editor.getActiveCell();
			if (!activeCell) {
				return;
			}
			index = editor.viewModel?.viewCells.indexOf(activeCell);
		}

		const controller = editor.getContriBution<FoldingController>(FoldingController.id);
		if (index !== undefined) {
			if (direction === 'up') {
				controller.setFoldingStateUp(index, CellFoldingState.Collapsed, levels);
			} else {
				controller.setFoldingStateDown(index, CellFoldingState.Collapsed, levels);
			}

			const viewIndex = editor.viewModel!.getNearestVisiBleCellIndexUpwards(index);
			editor.selectElement(editor.viewModel!.viewCells[viewIndex]);
		}
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'noteBook.unfold',
			title: { value: NOTEBOOK_UNFOLD_COMMAND_LABEL, original: 'Unfold Cell' },
			category: NOTEBOOK_ACTIONS_CATEGORY,
			keyBinding: {
				when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_CLOSE_SQUARE_BRACKET,
				mac: {
					primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.US_CLOSE_SQUARE_BRACKET,
					secondary: [KeyCode.RightArrow],
				},
				secondary: [KeyCode.RightArrow],
				weight: KeyBindingWeight.WorkBenchContriB
			},
			description: {
				description: NOTEBOOK_UNFOLD_COMMAND_LABEL,
				args: [
					{
						name: 'index',
						description: 'The cell index',
						schema: {
							'type': 'oBject',
							'required': ['index', 'direction'],
							'properties': {
								'index': {
									'type': 'numBer'
								},
								'direction': {
									'type': 'string',
									'enum': ['up', 'down'],
									'default': 'down'
								},
								'levels': {
									'type': 'numBer',
									'default': 1
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

	async run(accessor: ServicesAccessor, args?: { index: numBer, levels: numBer, direction: 'up' | 'down' }): Promise<void> {
		const editorService = accessor.get(IEditorService);

		const editor = getActiveNoteBookEditor(editorService);
		if (!editor) {
			return;
		}

		const levels = args && args.levels || 1;
		const direction = args && args.direction === 'up' ? 'up' : 'down';
		let index: numBer | undefined = undefined;

		if (args) {
			index = args.index;
		} else {
			const activeCell = editor.getActiveCell();
			if (!activeCell) {
				return;
			}
			index = editor.viewModel?.viewCells.indexOf(activeCell);
		}

		const controller = editor.getContriBution<FoldingController>(FoldingController.id);
		if (index !== undefined) {
			if (direction === 'up') {
				controller.setFoldingStateUp(index, CellFoldingState.Expanded, levels);
			} else {
				controller.setFoldingStateDown(index, CellFoldingState.Expanded, levels);
			}
		}
	}
});
