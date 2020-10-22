/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as gloB from 'vs/Base/common/gloB';
import { KeyChord, KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import * as platform from 'vs/Base/common/platform';
import { URI } from 'vs/Base/common/uri';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { getIconClasses } from 'vs/editor/common/services/getIconClasses';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { localize } from 'vs/nls';
import { Action2, IAction2Options, MenuId, MenuItemAction, MenuRegistry, registerAction2 } from 'vs/platform/actions/common/actions';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { CommandsRegistry, ICommandService } from 'vs/platform/commands/common/commands';
import { ContextKeyExpr, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { InputFocusedContext, InputFocusedContextKey } from 'vs/platform/contextkey/common/contextkeys';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IQuickInputService, IQuickPickItem, QuickPickInput } from 'vs/platform/quickinput/common/quickInput';
import { CATEGORIES } from 'vs/workBench/common/actions';
import { BaseCellRenderTemplate, CellEditState, CellFocusMode, EXPAND_CELL_CONTENT_COMMAND_ID, ICellViewModel, INoteBookEditor, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_EDITOR_FOCUSED, NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_CELL_INPUT_COLLAPSED, NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_MARKDOWN_EDIT_MODE, NOTEBOOK_CELL_OUTPUT_COLLAPSED, NOTEBOOK_CELL_TYPE, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_EDITOR_EXECUTING_NOTEBOOK, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_RUNNABLE, NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_OUTPUT_FOCUSED } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { CellViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/noteBookViewModel';
import { CellEditType, CellKind, ICellEditOperation, ICellRange, isDocumentExcludePattern, NoteBookCellMetadata, NoteBookCellRunState, NOTEBOOK_EDITOR_CURSOR_BOUNDARY, TransientMetadata } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { INoteBookService } from 'vs/workBench/contriB/noteBook/common/noteBookService';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';

// NoteBook Commands
const EXECUTE_NOTEBOOK_COMMAND_ID = 'noteBook.execute';
const CANCEL_NOTEBOOK_COMMAND_ID = 'noteBook.cancelExecution';
const NOTEBOOK_FOCUS_TOP = 'noteBook.focusTop';
const NOTEBOOK_FOCUS_BOTTOM = 'noteBook.focusBottom';
const NOTEBOOK_FOCUS_PREVIOUS_EDITOR = 'noteBook.focusPreviousEditor';
const NOTEBOOK_FOCUS_NEXT_EDITOR = 'noteBook.focusNextEditor';
const CLEAR_ALL_CELLS_OUTPUTS_COMMAND_ID = 'noteBook.clearAllCellsOutputs';
const RENDER_ALL_MARKDOWN_CELLS = 'noteBook.renderAllMarkdownCells';

// Cell Commands
const INSERT_CODE_CELL_ABOVE_COMMAND_ID = 'noteBook.cell.insertCodeCellABove';
const INSERT_CODE_CELL_BELOW_COMMAND_ID = 'noteBook.cell.insertCodeCellBelow';
const INSERT_CODE_CELL_AT_TOP_COMMAND_ID = 'noteBook.cell.insertCodeCellAtTop';
const INSERT_MARKDOWN_CELL_ABOVE_COMMAND_ID = 'noteBook.cell.insertMarkdownCellABove';
const INSERT_MARKDOWN_CELL_BELOW_COMMAND_ID = 'noteBook.cell.insertMarkdownCellBelow';
const INSERT_MARKDOWN_CELL_AT_TOP_COMMAND_ID = 'noteBook.cell.insertMarkdownCellAtTop';
const CHANGE_CELL_TO_CODE_COMMAND_ID = 'noteBook.cell.changeToCode';
const CHANGE_CELL_TO_MARKDOWN_COMMAND_ID = 'noteBook.cell.changeToMarkdown';

const EDIT_CELL_COMMAND_ID = 'noteBook.cell.edit';
const QUIT_EDIT_CELL_COMMAND_ID = 'noteBook.cell.quitEdit';
const DELETE_CELL_COMMAND_ID = 'noteBook.cell.delete';

const MOVE_CELL_UP_COMMAND_ID = 'noteBook.cell.moveUp';
const MOVE_CELL_DOWN_COMMAND_ID = 'noteBook.cell.moveDown';
const COPY_CELL_COMMAND_ID = 'noteBook.cell.copy';
const CUT_CELL_COMMAND_ID = 'noteBook.cell.cut';
const PASTE_CELL_COMMAND_ID = 'noteBook.cell.paste';
const PASTE_CELL_ABOVE_COMMAND_ID = 'noteBook.cell.pasteABove';
const COPY_CELL_UP_COMMAND_ID = 'noteBook.cell.copyUp';
const COPY_CELL_DOWN_COMMAND_ID = 'noteBook.cell.copyDown';
const SPLIT_CELL_COMMAND_ID = 'noteBook.cell.split';
const JOIN_CELL_ABOVE_COMMAND_ID = 'noteBook.cell.joinABove';
const JOIN_CELL_BELOW_COMMAND_ID = 'noteBook.cell.joinBelow';

const EXECUTE_CELL_COMMAND_ID = 'noteBook.cell.execute';
const CANCEL_CELL_COMMAND_ID = 'noteBook.cell.cancelExecution';
const EXECUTE_CELL_SELECT_BELOW = 'noteBook.cell.executeAndSelectBelow';
const EXECUTE_CELL_INSERT_BELOW = 'noteBook.cell.executeAndInsertBelow';
const CLEAR_CELL_OUTPUTS_COMMAND_ID = 'noteBook.cell.clearOutputs';
const CHANGE_CELL_LANGUAGE = 'noteBook.cell.changeLanguage';
const CENTER_ACTIVE_CELL = 'noteBook.centerActiveCell';

const FOCUS_IN_OUTPUT_COMMAND_ID = 'noteBook.cell.focusInOutput';
const FOCUS_OUT_OUTPUT_COMMAND_ID = 'noteBook.cell.focusOutOutput';

const COLLAPSE_CELL_INPUT_COMMAND_ID = 'noteBook.cell.collapseCellContent';
const COLLAPSE_CELL_OUTPUT_COMMAND_ID = 'noteBook.cell.collapseCellOutput';
const EXPAND_CELL_OUTPUT_COMMAND_ID = 'noteBook.cell.expandCellOutput';

export const NOTEBOOK_ACTIONS_CATEGORY = { value: localize('noteBookActions.category', "NoteBook"), original: 'NoteBook' };

export const CELL_TITLE_CELL_GROUP_ID = 'inline/cell';
export const CELL_TITLE_OUTPUT_GROUP_ID = 'inline/output';

const EDITOR_WIDGET_ACTION_WEIGHT = KeyBindingWeight.EditorContriB; // smaller than Suggest Widget, etc

const enum CellToolBarOrder {
	EditCell,
	SplitCell,
	SaveCell,
	ClearCellOutput
}

const enum CellOverflowToolBarGroups {
	Copy = '1_copy',
	Insert = '2_insert',
	Edit = '3_edit',
	Collapse = '4_collapse',
}

export interface INoteBookActionContext {
	readonly cellTemplate?: BaseCellRenderTemplate;
	readonly cell?: ICellViewModel;
	readonly noteBookEditor: INoteBookEditor;
	readonly ui?: Boolean;
}

export interface INoteBookCellActionContext extends INoteBookActionContext {
	cell: ICellViewModel;
}

aBstract class NoteBookAction extends Action2 {
	constructor(desc: IAction2Options) {
		if (desc.f1 !== false) {
			desc.f1 = false;
			const f1Menu = {
				id: MenuId.CommandPalette,
				when: NOTEBOOK_IS_ACTIVE_EDITOR
			};

			if (!desc.menu) {
				desc.menu = [];
			} else if (!Array.isArray(desc.menu)) {
				desc.menu = [desc.menu];
			}

			desc.menu = [
				...desc.menu,
				f1Menu
			];
		}

		desc.category = NOTEBOOK_ACTIONS_CATEGORY;

		super(desc);
	}

	async run(accessor: ServicesAccessor, context?: INoteBookActionContext): Promise<void> {
		if (!this.isNoteBookActionContext(context)) {
			context = this.getActiveEditorContext(accessor);
			if (!context) {
				return;
			}
		}

		this.runWithContext(accessor, context);
	}

	aBstract runWithContext(accessor: ServicesAccessor, context: INoteBookActionContext): Promise<void>;

	private isNoteBookActionContext(context?: unknown): context is INoteBookActionContext {
		return !!context && !!(context as INoteBookActionContext).noteBookEditor;
	}

	protected getActiveEditorContext(accessor: ServicesAccessor): INoteBookActionContext | undefined {
		const editorService = accessor.get(IEditorService);

		const editor = getActiveNoteBookEditor(editorService);
		if (!editor) {
			return;
		}

		const activeCell = editor.getActiveCell();
		return {
			cell: activeCell,
			noteBookEditor: editor
		};
	}
}

aBstract class NoteBookCellAction<T = INoteBookCellActionContext> extends NoteBookAction {
	protected isCellActionContext(context?: unknown): context is INoteBookCellActionContext {
		return !!context && !!(context as INoteBookCellActionContext).noteBookEditor && !!(context as INoteBookCellActionContext).cell;
	}

	protected getCellContextFromArgs(accessor: ServicesAccessor, context?: T): INoteBookCellActionContext | undefined {
		return undefined;
	}

	async run(accessor: ServicesAccessor, context?: INoteBookCellActionContext): Promise<void> {
		if (this.isCellActionContext(context)) {
			return this.runWithContext(accessor, context);
		}

		const contextFromArgs = this.getCellContextFromArgs(accessor, context);

		if (contextFromArgs) {
			return this.runWithContext(accessor, contextFromArgs);
		}

		const activeEditorContext = this.getActiveEditorContext(accessor);
		if (this.isCellActionContext(activeEditorContext)) {
			return this.runWithContext(accessor, activeEditorContext);
		}
	}

	aBstract runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext): Promise<void>;
}

registerAction2(class extends NoteBookCellAction<ICellRange> {
	constructor() {
		super({
			id: EXECUTE_CELL_COMMAND_ID,
			title: localize('noteBookActions.execute', "Execute Cell"),
			keyBinding: {
				when: NOTEBOOK_CELL_LIST_FOCUSED,
				primary: KeyMod.WinCtrl | KeyCode.Enter,
				win: {
					primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.Enter
				},
				weight: EDITOR_WIDGET_ACTION_WEIGHT
			},
			description: {
				description: localize('noteBookActions.execute', "Execute Cell"),
				args: [
					{
						name: 'range',
						description: 'The cell range',
						schema: {
							'type': 'oBject',
							'required': ['start', 'end'],
							'properties': {
								'start': {
									'type': 'numBer'
								},
								'end': {
									'type': 'numBer'
								}
							}
						}
					}
				]
			},
			icon: { id: 'codicon/play' },
		});
	}

	getCellContextFromArgs(accessor: ServicesAccessor, context?: ICellRange): INoteBookCellActionContext | undefined {
		if (!context || typeof context.start !== 'numBer' || typeof context.end !== 'numBer' || context.start >= context.end) {
			return;
		}

		const activeEditorContext = this.getActiveEditorContext(accessor);

		if (!activeEditorContext || !activeEditorContext.noteBookEditor.viewModel || context.start >= activeEditorContext.noteBookEditor.viewModel.viewCells.length) {
			return;
		}

		const cells = activeEditorContext.noteBookEditor.viewModel.viewCells;

		// TODO@reBornix, support multiple cells
		return {
			noteBookEditor: activeEditorContext.noteBookEditor,
			cell: cells[context.start]
		};
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext): Promise<void> {
		return runCell(accessor, context);
	}
});

registerAction2(class extends NoteBookCellAction<ICellRange> {
	constructor() {
		super({
			id: CANCEL_CELL_COMMAND_ID,
			title: localize('noteBookActions.cancel', "Stop Cell Execution"),
			icon: { id: 'codicon/primitive-square' },
			description: {
				description: localize('noteBookActions.execute', "Execute Cell"),
				args: [
					{
						name: 'range',
						description: 'The cell range',
						schema: {
							'type': 'oBject',
							'required': ['start', 'end'],
							'properties': {
								'start': {
									'type': 'numBer'
								},
								'end': {
									'type': 'numBer'
								}
							}
						}
					}
				]
			},
		});
	}

	getCellContextFromArgs(accessor: ServicesAccessor, context?: ICellRange): INoteBookCellActionContext | undefined {
		if (!context || typeof context.start !== 'numBer' || typeof context.end !== 'numBer' || context.start >= context.end) {
			return;
		}

		const activeEditorContext = this.getActiveEditorContext(accessor);

		if (!activeEditorContext || !activeEditorContext.noteBookEditor.viewModel || context.start >= activeEditorContext.noteBookEditor.viewModel.viewCells.length) {
			return;
		}

		const cells = activeEditorContext.noteBookEditor.viewModel.viewCells;

		// TODO@reBornix, support multiple cells
		return {
			noteBookEditor: activeEditorContext.noteBookEditor,
			cell: cells[context.start]
		};
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext): Promise<void> {
		return context.noteBookEditor.cancelNoteBookCellExecution(context.cell);
	}
});

export class ExecuteCellAction extends MenuItemAction {
	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@ICommandService commandService: ICommandService
	) {
		super(
			{
				id: EXECUTE_CELL_COMMAND_ID,
				title: localize('noteBookActions.executeCell', "Execute Cell"),
				icon: { id: 'codicon/play' }
			},
			undefined,
			{ shouldForwardArgs: true },
			contextKeyService,
			commandService);
	}
}

export class CancelCellAction extends MenuItemAction {
	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@ICommandService commandService: ICommandService
	) {
		super(
			{
				id: CANCEL_CELL_COMMAND_ID,
				title: localize('noteBookActions.CancelCell', "Cancel Execution"),
				icon: { id: 'codicon/primitive-square' }
			},
			undefined,
			{ shouldForwardArgs: true },
			contextKeyService,
			commandService);
	}
}

export class DeleteCellAction extends MenuItemAction {
	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@ICommandService commandService: ICommandService
	) {
		super(
			{
				id: DELETE_CELL_COMMAND_ID,
				title: localize('noteBookActions.deleteCell', "Delete Cell"),
				icon: { id: 'codicon/trash' }
			},
			undefined,
			{ shouldForwardArgs: true },
			contextKeyService,
			commandService);
	}
}

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super({
			id: EXECUTE_CELL_SELECT_BELOW,
			title: localize('noteBookActions.executeAndSelectBelow', "Execute NoteBook Cell and Select Below"),
			keyBinding: {
				when: NOTEBOOK_CELL_LIST_FOCUSED,
				primary: KeyMod.Shift | KeyCode.Enter,
				weight: EDITOR_WIDGET_ACTION_WEIGHT
			},
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext): Promise<void> {
		const idx = context.noteBookEditor.viewModel?.getCellIndex(context.cell);
		if (typeof idx !== 'numBer') {
			return;
		}

		const executionP = runCell(accessor, context);

		// Try to select Below, fall Back on inserting
		const nextCell = context.noteBookEditor.viewModel?.viewCells[idx + 1];
		if (nextCell) {
			context.noteBookEditor.focusNoteBookCell(nextCell, 'container');
		} else {
			const newCell = context.noteBookEditor.insertNoteBookCell(context.cell, CellKind.Code, 'Below');
			if (newCell) {
				context.noteBookEditor.focusNoteBookCell(newCell, 'editor');
			}
		}

		return executionP;
	}
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super({
			id: EXECUTE_CELL_INSERT_BELOW,
			title: localize('noteBookActions.executeAndInsertBelow', "Execute NoteBook Cell and Insert Below"),
			keyBinding: {
				when: NOTEBOOK_CELL_LIST_FOCUSED,
				primary: KeyMod.Alt | KeyCode.Enter,
				weight: EDITOR_WIDGET_ACTION_WEIGHT
			},
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext): Promise<void> {
		const newFocusMode = context.cell.focusMode === CellFocusMode.Editor ? 'editor' : 'container';

		const executionP = runCell(accessor, context);
		const newCell = context.noteBookEditor.insertNoteBookCell(context.cell, CellKind.Code, 'Below');
		if (newCell) {
			context.noteBookEditor.focusNoteBookCell(newCell, newFocusMode);
		}

		return executionP;
	}
});

registerAction2(class extends NoteBookAction {
	constructor() {
		super({
			id: RENDER_ALL_MARKDOWN_CELLS,
			title: localize('noteBookActions.renderMarkdown', "Render All Markdown Cells"),
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookActionContext): Promise<void> {
		renderAllMarkdownCells(context);
	}
});

registerAction2(class extends NoteBookAction {
	constructor() {
		super({
			id: EXECUTE_NOTEBOOK_COMMAND_ID,
			title: localize('noteBookActions.executeNoteBook', "Execute NoteBook"),
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookActionContext): Promise<void> {
		renderAllMarkdownCells(context);

		const editorGroupService = accessor.get(IEditorGroupsService);
		const group = editorGroupService.activeGroup;

		if (group) {
			if (group.activeEditor) {
				group.pinEditor(group.activeEditor);
			}
		}

		return context.noteBookEditor.executeNoteBook();
	}
});

function renderAllMarkdownCells(context: INoteBookActionContext): void {
	context.noteBookEditor.viewModel!.viewCells.forEach(cell => {
		if (cell.cellKind === CellKind.Markdown) {
			cell.editState = CellEditState.Preview;
		}
	});
}

registerAction2(class extends NoteBookAction {
	constructor() {
		super({
			id: CANCEL_NOTEBOOK_COMMAND_ID,
			title: localize('noteBookActions.cancelNoteBook', "Cancel NoteBook Execution"),
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookActionContext): Promise<void> {
		return context.noteBookEditor.cancelNoteBookExecution();
	}
});

MenuRegistry.appendMenuItem(MenuId.NoteBookCellTitle, {
	suBmenu: MenuId.NoteBookCellInsert,
	title: localize('noteBookMenu.insertCell', "Insert Cell"),
	group: CellOverflowToolBarGroups.Insert
});

MenuRegistry.appendMenuItem(MenuId.EditorContext, {
	suBmenu: MenuId.NoteBookCellTitle,
	title: localize('noteBookMenu.cellTitle', "NoteBook Cell"),
	group: CellOverflowToolBarGroups.Insert,
	when: NOTEBOOK_EDITOR_FOCUSED
});

MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: EXECUTE_NOTEBOOK_COMMAND_ID,
		title: localize('noteBookActions.menu.executeNoteBook', "Execute NoteBook (Run all cells)"),
		icon: { id: 'codicon/run-all' }
	},
	order: -1,
	group: 'navigation',
	when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_EDITOR_EXECUTING_NOTEBOOK.toNegated(), NOTEBOOK_EDITOR_RUNNABLE)
});

MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: CANCEL_NOTEBOOK_COMMAND_ID,
		title: localize('noteBookActions.menu.cancelNoteBook', "Stop NoteBook Execution"),
		icon: { id: 'codicon/primitive-square' }
	},
	order: -1,
	group: 'navigation',
	when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_EDITOR_EXECUTING_NOTEBOOK)
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super({
			id: CHANGE_CELL_TO_CODE_COMMAND_ID,
			title: localize('noteBookActions.changeCellToCode', "Change Cell to Code"),
			keyBinding: {
				when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
				primary: KeyCode.KEY_Y,
				weight: KeyBindingWeight.WorkBenchContriB
			},
			precondition: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_CELL_TYPE.isEqualTo('markdown')),
			menu: {
				id: MenuId.NoteBookCellTitle,
				when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_TYPE.isEqualTo('markdown')),
				group: CellOverflowToolBarGroups.Edit,
			}
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext): Promise<void> {
		await changeCellToKind(CellKind.Code, context);
	}
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super({
			id: CHANGE_CELL_TO_MARKDOWN_COMMAND_ID,
			title: localize('noteBookActions.changeCellToMarkdown', "Change Cell to Markdown"),
			keyBinding: {
				when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
				primary: KeyCode.KEY_M,
				weight: KeyBindingWeight.WorkBenchContriB
			},
			precondition: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_CELL_TYPE.isEqualTo('code')),
			menu: {
				id: MenuId.NoteBookCellTitle,
				when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_TYPE.isEqualTo('code')),
				group: CellOverflowToolBarGroups.Edit,
			}
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext): Promise<void> {
		await changeCellToKind(CellKind.Markdown, context);
	}
});

export function getActiveNoteBookEditor(editorService: IEditorService): INoteBookEditor | undefined {
	// TODO@roBlourens can `isNoteBookEditor` Be on INoteBookEditor to avoid a circular dependency?
	const activeEditorPane = editorService.activeEditorPane as unknown as { isNoteBookEditor?: Boolean } | undefined;
	return activeEditorPane?.isNoteBookEditor ? (editorService.activeEditorPane?.getControl() as INoteBookEditor) : undefined;
}

async function runCell(accessor: ServicesAccessor, context: INoteBookCellActionContext): Promise<void> {
	if (context.cell.metadata?.runState === NoteBookCellRunState.Running) {
		return;
	}

	const editorGroupService = accessor.get(IEditorGroupsService);
	const group = editorGroupService.activeGroup;

	if (group) {
		if (group.activeEditor) {
			group.pinEditor(group.activeEditor);
		}
	}

	return context.noteBookEditor.executeNoteBookCell(context.cell);
}

export async function changeCellToKind(kind: CellKind, context: INoteBookCellActionContext, language?: string): Promise<ICellViewModel | null> {
	const { cell, noteBookEditor } = context;

	if (cell.cellKind === kind) {
		return null;
	}

	if (!noteBookEditor.viewModel) {
		return null;
	}

	const text = cell.getText();
	const idx = noteBookEditor.viewModel.getCellIndex(cell);
	noteBookEditor.viewModel.noteBookDocument.applyEdits(noteBookEditor.viewModel.noteBookDocument.versionId, [
		{
			editType: CellEditType.Replace,
			index: idx,
			count: 1,
			cells: [{
				cellKind: kind,
				source: text,
				language: language!,
				outputs: cell.model.outputs,
				metadata: cell.metadata,
			}]
		}
	], true, undefined, () => undefined, undefined, true);
	const newCell = noteBookEditor.viewModel.viewCells[idx];

	if (!newCell) {
		return null;
	}

	noteBookEditor.focusNoteBookCell(newCell, cell.editState === CellEditState.Editing ? 'editor' : 'container');

	return newCell;
}

aBstract class InsertCellCommand extends NoteBookAction {
	constructor(
		desc: Readonly<IAction2Options>,
		private kind: CellKind,
		private direction: 'aBove' | 'Below'
	) {
		super(desc);
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookActionContext): Promise<void> {
		const newCell = context.noteBookEditor.insertNoteBookCell(context.cell, this.kind, this.direction, undefined, true);
		if (newCell) {
			context.noteBookEditor.focusNoteBookCell(newCell, 'editor');
		}
	}
}

registerAction2(class extends InsertCellCommand {
	constructor() {
		super(
			{
				id: INSERT_CODE_CELL_ABOVE_COMMAND_ID,
				title: localize('noteBookActions.insertCodeCellABove', "Insert Code Cell ABove"),
				keyBinding: {
					primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Enter,
					when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, InputFocusedContext.toNegated()),
					weight: KeyBindingWeight.WorkBenchContriB
				},
				menu: {
					id: MenuId.NoteBookCellInsert,
					order: 0
				}
			},
			CellKind.Code,
			'aBove');
	}
});

registerAction2(class extends InsertCellCommand {
	constructor() {
		super(
			{
				id: INSERT_CODE_CELL_BELOW_COMMAND_ID,
				title: localize('noteBookActions.insertCodeCellBelow', "Insert Code Cell Below"),
				keyBinding: {
					primary: KeyMod.CtrlCmd | KeyCode.Enter,
					when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, InputFocusedContext.toNegated()),
					weight: KeyBindingWeight.WorkBenchContriB
				},
				menu: {
					id: MenuId.NoteBookCellInsert,
					order: 1
				}
			},
			CellKind.Code,
			'Below');
	}
});

registerAction2(class extends NoteBookAction {
	constructor() {
		super(
			{
				id: INSERT_CODE_CELL_AT_TOP_COMMAND_ID,
				title: localize('noteBookActions.insertCodeCellAtTop', "Add Code Cell At Top"),
				f1: false
			});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const context = this.getActiveEditorContext(accessor);
		if (context) {
			this.runWithContext(accessor, context);
		}
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookActionContext): Promise<void> {
		const newCell = context.noteBookEditor.insertNoteBookCell(undefined, CellKind.Code, 'aBove', undefined, true);
		if (newCell) {
			context.noteBookEditor.focusNoteBookCell(newCell, 'editor');
		}
	}
});

registerAction2(class extends NoteBookAction {
	constructor() {
		super(
			{
				id: INSERT_MARKDOWN_CELL_AT_TOP_COMMAND_ID,
				title: localize('noteBookActions.insertMarkdownCellAtTop', "Add Markdown Cell At Top"),
				f1: false
			});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const context = this.getActiveEditorContext(accessor);
		if (context) {
			this.runWithContext(accessor, context);
		}
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookActionContext): Promise<void> {
		const newCell = context.noteBookEditor.insertNoteBookCell(undefined, CellKind.Markdown, 'aBove', undefined, true);
		if (newCell) {
			context.noteBookEditor.focusNoteBookCell(newCell, 'editor');
		}
	}
});

MenuRegistry.appendMenuItem(MenuId.NoteBookCellBetween, {
	command: {
		id: INSERT_CODE_CELL_BELOW_COMMAND_ID,
		title: localize('noteBookActions.menu.insertCode', "$(add) Code"),
		tooltip: localize('noteBookActions.menu.insertCode.tooltip', "Add Code Cell")
	},
	order: 0,
	group: 'inline'
});

MenuRegistry.appendMenuItem(MenuId.NoteBookCellListTop, {
	command: {
		id: INSERT_CODE_CELL_AT_TOP_COMMAND_ID,
		title: localize('noteBookActions.menu.insertCode', "$(add) Code"),
		tooltip: localize('noteBookActions.menu.insertCode.tooltip', "Add Code Cell")
	},
	order: 0,
	group: 'inline'
});

registerAction2(class extends InsertCellCommand {
	constructor() {
		super(
			{
				id: INSERT_MARKDOWN_CELL_ABOVE_COMMAND_ID,
				title: localize('noteBookActions.insertMarkdownCellABove', "Insert Markdown Cell ABove"),
				menu: {
					id: MenuId.NoteBookCellInsert,
					order: 2
				}
			},
			CellKind.Markdown,
			'aBove');
	}
});

registerAction2(class extends InsertCellCommand {
	constructor() {
		super(
			{
				id: INSERT_MARKDOWN_CELL_BELOW_COMMAND_ID,
				title: localize('noteBookActions.insertMarkdownCellBelow', "Insert Markdown Cell Below"),
				menu: {
					id: MenuId.NoteBookCellInsert,
					order: 3
				}
			},
			CellKind.Markdown,
			'Below');
	}
});

MenuRegistry.appendMenuItem(MenuId.NoteBookCellBetween, {
	command: {
		id: INSERT_MARKDOWN_CELL_BELOW_COMMAND_ID,
		title: localize('noteBookActions.menu.insertMarkdown', "$(add) Markdown"),
		tooltip: localize('noteBookActions.menu.insertMarkdown.tooltip', "Add Markdown Cell")
	},
	order: 1,
	group: 'inline'
});

MenuRegistry.appendMenuItem(MenuId.NoteBookCellListTop, {
	command: {
		id: INSERT_MARKDOWN_CELL_AT_TOP_COMMAND_ID,
		title: localize('noteBookActions.menu.insertMarkdown', "$(add) Markdown"),
		tooltip: localize('noteBookActions.menu.insertMarkdown.tooltip', "Add Markdown Cell")
	},
	order: 1,
	group: 'inline'
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super(
			{
				id: EDIT_CELL_COMMAND_ID,
				title: localize('noteBookActions.editCell', "Edit Cell"),
				keyBinding: {
					when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
					primary: KeyCode.Enter,
					weight: KeyBindingWeight.WorkBenchContriB
				},
				menu: {
					id: MenuId.NoteBookCellTitle,
					when: ContextKeyExpr.and(
						NOTEBOOK_CELL_TYPE.isEqualTo('markdown'),
						NOTEBOOK_CELL_MARKDOWN_EDIT_MODE.toNegated(),
						NOTEBOOK_CELL_EDITABLE),
					order: CellToolBarOrder.EditCell,
					group: CELL_TITLE_CELL_GROUP_ID
				},
				icon: { id: 'codicon/pencil' }
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext): Promise<void> {
		context.noteBookEditor.focusNoteBookCell(context.cell, 'editor');
	}
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super(
			{
				id: QUIT_EDIT_CELL_COMMAND_ID,
				title: localize('noteBookActions.quitEdit', "Stop Editing Cell"),
				menu: {
					id: MenuId.NoteBookCellTitle,
					when: ContextKeyExpr.and(
						NOTEBOOK_CELL_TYPE.isEqualTo('markdown'),
						NOTEBOOK_CELL_MARKDOWN_EDIT_MODE,
						NOTEBOOK_CELL_EDITABLE),
					order: CellToolBarOrder.SaveCell,
					group: CELL_TITLE_CELL_GROUP_ID
				},
				icon: { id: 'codicon/check' },
				keyBinding: {
					when: ContextKeyExpr.and(
						NOTEBOOK_EDITOR_FOCUSED,
						InputFocusedContext,
						EditorContextKeys.hoverVisiBle.toNegated(),
						EditorContextKeys.hasNonEmptySelection.toNegated()),
					primary: KeyCode.Escape,
					weight: EDITOR_WIDGET_ACTION_WEIGHT - 5
				},
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext) {
		if (context.cell.cellKind === CellKind.Markdown) {
			context.cell.editState = CellEditState.Preview;
		}

		return context.noteBookEditor.focusNoteBookCell(context.cell, 'container');
	}
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super(
			{
				id: DELETE_CELL_COMMAND_ID,
				title: localize('noteBookActions.deleteCell', "Delete Cell"),
				menu: {
					id: MenuId.NoteBookCellTitle,
					when: NOTEBOOK_EDITOR_EDITABLE
				},
				keyBinding: {
					primary: KeyCode.Delete,
					mac: {
						primary: KeyMod.CtrlCmd | KeyCode.Backspace
					},
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
					weight: KeyBindingWeight.WorkBenchContriB
				},
				icon: { id: 'codicon/trash' },
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext) {
		const index = context.noteBookEditor.viewModel!.getCellIndex(context.cell);
		const result = await context.noteBookEditor.deleteNoteBookCell(context.cell);

		if (result) {
			// deletion succeeds, move focus to the next cell
			const nextCellIdx = index < context.noteBookEditor.viewModel!.length ? index : context.noteBookEditor.viewModel!.length - 1;
			if (nextCellIdx >= 0) {
				context.noteBookEditor.focusNoteBookCell(context.noteBookEditor.viewModel!.viewCells[nextCellIdx], 'container');
			}
		}
	}
});

async function moveCell(context: INoteBookCellActionContext, direction: 'up' | 'down'): Promise<void> {
	const result = direction === 'up' ?
		await context.noteBookEditor.moveCellUp(context.cell) :
		await context.noteBookEditor.moveCellDown(context.cell);

	if (result) {
		// move cell command only works when the cell container has focus
		context.noteBookEditor.focusNoteBookCell(result, 'container');
	}
}

async function copyCell(context: INoteBookCellActionContext, direction: 'up' | 'down'): Promise<void> {
	const text = context.cell.getText();
	const newCellDirection = direction === 'up' ? 'aBove' : 'Below';
	const newCell = context.noteBookEditor.insertNoteBookCell(context.cell, context.cell.cellKind, newCellDirection, text);
	if (newCell) {
		context.noteBookEditor.focusNoteBookCell(newCell, 'container');
	}
}

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super(
			{
				id: MOVE_CELL_UP_COMMAND_ID,
				title: localize('noteBookActions.moveCellUp', "Move Cell Up"),
				icon: { id: 'codicon/arrow-up' },
				keyBinding: {
					primary: KeyMod.Alt | KeyCode.UpArrow,
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext.toNegated()),
					weight: KeyBindingWeight.WorkBenchContriB
				}
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext) {
		return moveCell(context, 'up');
	}
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super(
			{
				id: MOVE_CELL_DOWN_COMMAND_ID,
				title: localize('noteBookActions.moveCellDown', "Move Cell Down"),
				icon: { id: 'codicon/arrow-down' },
				keyBinding: {
					primary: KeyMod.Alt | KeyCode.DownArrow,
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext.toNegated()),
					weight: KeyBindingWeight.WorkBenchContriB
				}
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext) {
		return moveCell(context, 'down');
	}
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super(
			{
				id: COPY_CELL_COMMAND_ID,
				title: localize('noteBookActions.copy', "Copy Cell"),
				menu: {
					id: MenuId.NoteBookCellTitle,
					when: NOTEBOOK_EDITOR_FOCUSED,
					group: CellOverflowToolBarGroups.Copy,
				},
				keyBinding: platform.isNative ? undefined : {
					primary: KeyMod.CtrlCmd | KeyCode.KEY_C,
					win: { primary: KeyMod.CtrlCmd | KeyCode.KEY_C, secondary: [KeyMod.CtrlCmd | KeyCode.Insert] },
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
					weight: KeyBindingWeight.WorkBenchContriB
				}
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext) {
		const clipBoardService = accessor.get<IClipBoardService>(IClipBoardService);
		const noteBookService = accessor.get<INoteBookService>(INoteBookService);
		if (context.noteBookEditor.hasOutputTextSelection()) {
			document.execCommand('copy');
			return;
		}

		clipBoardService.writeText(context.cell.getText());
		noteBookService.setToCopy([context.cell.model], true);
	}
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super(
			{
				id: CUT_CELL_COMMAND_ID,
				title: localize('noteBookActions.cut', "Cut Cell"),
				menu: {
					id: MenuId.NoteBookCellTitle,
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE),
					group: CellOverflowToolBarGroups.Copy,
				},
				keyBinding: platform.isNative ? undefined : {
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
					primary: KeyMod.CtrlCmd | KeyCode.KEY_X,
					win: { primary: KeyMod.CtrlCmd | KeyCode.KEY_X, secondary: [KeyMod.Shift | KeyCode.Delete] },
					weight: KeyBindingWeight.WorkBenchContriB
				}
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext) {
		const clipBoardService = accessor.get<IClipBoardService>(IClipBoardService);
		const noteBookService = accessor.get<INoteBookService>(INoteBookService);
		clipBoardService.writeText(context.cell.getText());
		const viewModel = context.noteBookEditor.viewModel;

		if (!viewModel || !viewModel.metadata.editaBle) {
			return;
		}

		viewModel.deleteCell(viewModel.getCellIndex(context.cell), true);
		noteBookService.setToCopy([context.cell.model], false);
	}
});

registerAction2(class extends NoteBookAction {
	constructor() {
		super(
			{
				id: PASTE_CELL_COMMAND_ID,
				title: localize('noteBookActions.paste', "Paste Cell"),
				menu: {
					id: MenuId.NoteBookCellTitle,
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE),
					group: CellOverflowToolBarGroups.Copy,
				},
				keyBinding: platform.isNative ? undefined : {
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
					primary: KeyMod.CtrlCmd | KeyCode.KEY_V,
					win: { primary: KeyMod.CtrlCmd | KeyCode.KEY_V, secondary: [KeyMod.Shift | KeyCode.Insert] },
					linux: { primary: KeyMod.CtrlCmd | KeyCode.KEY_V, secondary: [KeyMod.Shift | KeyCode.Insert] },
					weight: KeyBindingWeight.EditorContriB
				}
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookActionContext) {
		const noteBookService = accessor.get<INoteBookService>(INoteBookService);
		const pasteCells = noteBookService.getToCopy();

		const viewModel = context.noteBookEditor.viewModel;

		if (!viewModel || !viewModel.metadata.editaBle) {
			return;
		}

		if (!pasteCells) {
			return;
		}

		const currCellIndex = context.cell && viewModel.getCellIndex(context.cell);

		let topPastedCell: CellViewModel | undefined = undefined;
		pasteCells.items.reverse().map(cell => {
			return {
				source: cell.getValue(),
				language: cell.language,
				cellKind: cell.cellKind,
				outputs: cell.outputs,
				metadata: {
					editaBle: cell.metadata?.editaBle,
					runnaBle: cell.metadata?.runnaBle,
					BreakpointMargin: cell.metadata?.BreakpointMargin,
					hasExecutionOrder: cell.metadata?.hasExecutionOrder,
					inputCollapsed: cell.metadata?.inputCollapsed,
					outputCollapsed: cell.metadata?.outputCollapsed,
					custom: cell.metadata?.custom
				}
			};
		}).forEach(pasteCell => {
			const newIdx = typeof currCellIndex === 'numBer' ? currCellIndex + 1 : 0;
			topPastedCell = viewModel.createCell(newIdx, pasteCell.source, pasteCell.language, pasteCell.cellKind, pasteCell.metadata, pasteCell.outputs, true);
		});

		if (topPastedCell) {
			context.noteBookEditor.focusNoteBookCell(topPastedCell, 'container');
		}
	}
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super(
			{
				id: PASTE_CELL_ABOVE_COMMAND_ID,
				title: localize('noteBookActions.pasteABove', "Paste Cell ABove"),
				keyBinding: {
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
					primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_V,
					weight: EDITOR_WIDGET_ACTION_WEIGHT
				},
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext) {
		const noteBookService = accessor.get<INoteBookService>(INoteBookService);
		const pasteCells = noteBookService.getToCopy();

		const viewModel = context.noteBookEditor.viewModel;

		if (!viewModel || !viewModel.metadata.editaBle) {
			return;
		}

		if (!pasteCells) {
			return;
		}

		const currCellIndex = viewModel.getCellIndex(context!.cell);

		let topPastedCell: CellViewModel | undefined = undefined;
		pasteCells.items.reverse().map(cell => {
			return {
				source: cell.getValue(),
				language: cell.language,
				cellKind: cell.cellKind,
				outputs: cell.outputs,
				metadata: {
					editaBle: cell.metadata?.editaBle,
					runnaBle: cell.metadata?.runnaBle,
					BreakpointMargin: cell.metadata?.BreakpointMargin,
					hasExecutionOrder: cell.metadata?.hasExecutionOrder,
					inputCollapsed: cell.metadata?.inputCollapsed,
					outputCollapsed: cell.metadata?.outputCollapsed,
					custom: cell.metadata?.custom
				}
			};
		}).forEach(pasteCell => {
			topPastedCell = viewModel.createCell(currCellIndex, pasteCell.source, pasteCell.language, pasteCell.cellKind, pasteCell.metadata, pasteCell.outputs, true);
			return;
		});

		if (topPastedCell) {
			context.noteBookEditor.focusNoteBookCell(topPastedCell, 'container');
		}
	}
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super(
			{
				id: COPY_CELL_UP_COMMAND_ID,
				title: localize('noteBookActions.copyCellUp', "Copy Cell Up"),
				keyBinding: {
					primary: KeyMod.Alt | KeyMod.Shift | KeyCode.UpArrow,
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext.toNegated()),
					weight: KeyBindingWeight.WorkBenchContriB
				}
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext) {
		return copyCell(context, 'up');
	}
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super(
			{
				id: COPY_CELL_DOWN_COMMAND_ID,
				title: localize('noteBookActions.copyCellDown', "Copy Cell Down"),
				keyBinding: {
					primary: KeyMod.Alt | KeyMod.Shift | KeyCode.DownArrow,
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext.toNegated()),
					weight: KeyBindingWeight.WorkBenchContriB
				}
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext) {
		return copyCell(context, 'down');
	}
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super({
			id: NOTEBOOK_FOCUS_NEXT_EDITOR,
			title: localize('cursorMoveDown', 'Focus Next Cell Editor'),
			keyBinding: [
				{
					when: ContextKeyExpr.and(
						NOTEBOOK_EDITOR_FOCUSED,
						ContextKeyExpr.has(InputFocusedContextKey),
						EditorContextKeys.editorTextFocus,
						NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('top'),
						NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('none')),
					primary: KeyCode.DownArrow,
					weight: EDITOR_WIDGET_ACTION_WEIGHT
				},
				{
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_OUTPUT_FOCUSED),
					primary: KeyMod.CtrlCmd | KeyCode.DownArrow,
					mac: { primary: KeyMod.WinCtrl | KeyMod.CtrlCmd | KeyCode.DownArrow, },
					weight: KeyBindingWeight.WorkBenchContriB
				}
			]
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext): Promise<void> {
		const editor = context.noteBookEditor;
		const activeCell = context.cell;

		const idx = editor.viewModel?.getCellIndex(activeCell);
		if (typeof idx !== 'numBer') {
			return;
		}

		const newCell = editor.viewModel?.viewCells[idx + 1];

		if (!newCell) {
			return;
		}

		const newFocusMode = newCell.cellKind === CellKind.Markdown && newCell.editState === CellEditState.Preview ? 'container' : 'editor';
		editor.focusNoteBookCell(newCell, newFocusMode);
		editor.cursorNavigationMode = true;
	}
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super({
			id: NOTEBOOK_FOCUS_PREVIOUS_EDITOR,
			title: localize('cursorMoveUp', 'Focus Previous Cell Editor'),
			keyBinding: {
				when: ContextKeyExpr.and(
					NOTEBOOK_EDITOR_FOCUSED,
					ContextKeyExpr.has(InputFocusedContextKey),
					EditorContextKeys.editorTextFocus,
					NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('Bottom'),
					NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('none')),
				primary: KeyCode.UpArrow,
				weight: EDITOR_WIDGET_ACTION_WEIGHT
			},
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext): Promise<void> {
		const editor = context.noteBookEditor;
		const activeCell = context.cell;

		const idx = editor.viewModel?.getCellIndex(activeCell);
		if (typeof idx !== 'numBer') {
			return;
		}

		if (idx < 1) {
			// we don't do loop
			return;
		}

		const newCell = editor.viewModel?.viewCells[idx - 1];

		if (!newCell) {
			return;
		}

		const newFocusMode = newCell.cellKind === CellKind.Markdown && newCell.editState === CellEditState.Preview ? 'container' : 'editor';
		editor.focusNoteBookCell(newCell, newFocusMode);
		editor.cursorNavigationMode = true;
	}
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super({
			id: FOCUS_IN_OUTPUT_COMMAND_ID,
			title: localize('focusOutput', 'Focus In Active Cell Output'),
			keyBinding: {
				when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_CELL_HAS_OUTPUTS),
				primary: KeyMod.CtrlCmd | KeyCode.DownArrow,
				mac: { primary: KeyMod.WinCtrl | KeyMod.CtrlCmd | KeyCode.DownArrow, },
				weight: KeyBindingWeight.WorkBenchContriB
			},
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext): Promise<void> {
		const editor = context.noteBookEditor;
		const activeCell = context.cell;
		editor.focusNoteBookCell(activeCell, 'output');
	}
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super({
			id: FOCUS_OUT_OUTPUT_COMMAND_ID,
			title: localize('focusOutputOut', 'Focus Out Active Cell Output'),
			keyBinding: {
				when: NOTEBOOK_EDITOR_FOCUSED,
				primary: KeyMod.CtrlCmd | KeyCode.UpArrow,
				mac: { primary: KeyMod.WinCtrl | KeyMod.CtrlCmd | KeyCode.UpArrow, },
				weight: KeyBindingWeight.WorkBenchContriB
			},
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext): Promise<void> {
		const editor = context.noteBookEditor;
		const activeCell = context.cell;
		editor.focusNoteBookCell(activeCell, 'editor');
	}
});


registerAction2(class extends NoteBookAction {
	constructor() {
		super({
			id: NOTEBOOK_FOCUS_TOP,
			title: localize('focusFirstCell', 'Focus First Cell'),
			keyBinding: {
				when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
				primary: KeyMod.CtrlCmd | KeyCode.Home,
				mac: { primary: KeyMod.CtrlCmd | KeyCode.UpArrow },
				weight: KeyBindingWeight.WorkBenchContriB
			},
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookActionContext): Promise<void> {
		const editor = context.noteBookEditor;
		if (!editor.viewModel || !editor.viewModel.length) {
			return;
		}

		const firstCell = editor.viewModel.viewCells[0];
		editor.focusNoteBookCell(firstCell, 'container');
	}
});

registerAction2(class extends NoteBookAction {
	constructor() {
		super({
			id: NOTEBOOK_FOCUS_BOTTOM,
			title: localize('focusLastCell', 'Focus Last Cell'),
			keyBinding: {
				when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
				primary: KeyMod.CtrlCmd | KeyCode.End,
				mac: { primary: KeyMod.CtrlCmd | KeyCode.DownArrow },
				weight: KeyBindingWeight.WorkBenchContriB
			},
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookActionContext): Promise<void> {
		const editor = context.noteBookEditor;
		if (!editor.viewModel || !editor.viewModel.length) {
			return;
		}

		const firstCell = editor.viewModel.viewCells[editor.viewModel.length - 1];
		editor.focusNoteBookCell(firstCell, 'container');
	}
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super({
			id: CLEAR_CELL_OUTPUTS_COMMAND_ID,
			title: localize('clearCellOutputs', 'Clear Cell Outputs'),
			menu: {
				id: MenuId.NoteBookCellTitle,
				when: ContextKeyExpr.and(NOTEBOOK_CELL_TYPE.isEqualTo('code'), NOTEBOOK_EDITOR_RUNNABLE, NOTEBOOK_CELL_HAS_OUTPUTS),
				order: CellToolBarOrder.ClearCellOutput,
				group: CELL_TITLE_OUTPUT_GROUP_ID
			},
			keyBinding: {
				when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), NOTEBOOK_CELL_HAS_OUTPUTS),
				primary: KeyMod.Alt | KeyCode.Delete,
				weight: KeyBindingWeight.WorkBenchContriB
			},
			icon: { id: 'codicon/clear-all' },
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext): Promise<void> {
		const editor = context.noteBookEditor;
		if (!editor.viewModel || !editor.viewModel.length) {
			return;
		}

		const cell = context.cell;
		const index = editor.viewModel.noteBookDocument.cells.indexOf(cell.model);

		if (index < 0) {
			return;
		}

		editor.viewModel.noteBookDocument.applyEdits(editor.viewModel.noteBookDocument.versionId, [{ editType: CellEditType.Output, index, outputs: [] }], true, undefined, () => undefined, undefined);

		if (context.cell.metadata && context.cell.metadata?.runState !== NoteBookCellRunState.Running) {
			context.noteBookEditor.viewModel!.noteBookDocument.applyEdits(context.noteBookEditor.viewModel!.noteBookDocument.versionId, [{
				editType: CellEditType.Metadata, index, metadata: {
					...context.cell.metadata,
					runState: NoteBookCellRunState.Idle,
					runStartTime: undefined,
					lastRunDuration: undefined,
					statusMessage: undefined,
					executionOrder: undefined
				}
			}], true, undefined, () => undefined, undefined);
		}
	}
});

interface ILanguagePickInput extends IQuickPickItem {
	languageId: string;
	description: string;
}

export class ChangeCellLanguageAction extends NoteBookCellAction {
	constructor() {
		super({
			id: CHANGE_CELL_LANGUAGE,
			title: localize('changeLanguage', 'Change Cell Language'),
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext): Promise<void> {
		this.showLanguagePicker(accessor, context);
	}

	private async showLanguagePicker(accessor: ServicesAccessor, context: INoteBookCellActionContext) {
		const topItems: ILanguagePickInput[] = [];
		const mainItems: ILanguagePickInput[] = [];

		const modeService = accessor.get(IModeService);
		const modelService = accessor.get(IModelService);
		const quickInputService = accessor.get(IQuickInputService);

		const providerLanguages = [...context.noteBookEditor.viewModel!.noteBookDocument.resolvedLanguages, 'markdown'];
		providerLanguages.forEach(languageId => {
			let description: string;
			if (context.cell.cellKind === CellKind.Markdown ? (languageId === 'markdown') : (languageId === context.cell.language)) {
				description = localize('languageDescription', "({0}) - Current Language", languageId);
			} else {
				description = localize('languageDescriptionConfigured', "({0})", languageId);
			}

			const languageName = modeService.getLanguageName(languageId);
			if (!languageName) {
				// NoteBook has unrecognized language
				return;
			}

			const item = <ILanguagePickInput>{
				laBel: languageName,
				iconClasses: getIconClasses(modelService, modeService, this.getFakeResource(languageName, modeService)),
				description,
				languageId
			};

			if (languageId === 'markdown' || languageId === context.cell.language) {
				topItems.push(item);
			} else {
				mainItems.push(item);
			}
		});

		mainItems.sort((a, B) => {
			return a.description.localeCompare(B.description);
		});

		const picks: QuickPickInput[] = [
			...topItems,
			{ type: 'separator' },
			...mainItems
		];

		const selection = await quickInputService.pick(picks, { placeHolder: localize('pickLanguageToConfigure', "Select Language Mode") }) as ILanguagePickInput | undefined;
		if (selection && selection.languageId) {
			if (selection.languageId === 'markdown' && context.cell?.language !== 'markdown') {
				const newCell = await changeCellToKind(CellKind.Markdown, { cell: context.cell, noteBookEditor: context.noteBookEditor }, 'markdown');
				if (newCell) {
					context.noteBookEditor.focusNoteBookCell(newCell, 'editor');
				}
			} else if (selection.languageId !== 'markdown' && context.cell?.cellKind === CellKind.Markdown) {
				await changeCellToKind(CellKind.Code, { cell: context.cell, noteBookEditor: context.noteBookEditor }, selection.languageId);
			} else {
				const index = context.noteBookEditor.viewModel!.noteBookDocument.cells.indexOf(context.cell.model);
				context.noteBookEditor.viewModel!.noteBookDocument.applyEdits(
					context.noteBookEditor.viewModel!.noteBookDocument.versionId,
					[{ editType: CellEditType.CellLanguage, index, language: selection.languageId }],
					true, undefined, () => undefined, undefined
				);
			}
		}
	}

	/**
	 * Copied from editorStatus.ts
	 */
	private getFakeResource(lang: string, modeService: IModeService): URI | undefined {
		let fakeResource: URI | undefined;

		const extensions = modeService.getExtensions(lang);
		if (extensions?.length) {
			fakeResource = URI.file(extensions[0]);
		} else {
			const filenames = modeService.getFilenames(lang);
			if (filenames?.length) {
				fakeResource = URI.file(filenames[0]);
			}
		}

		return fakeResource;
	}
}
registerAction2(ChangeCellLanguageAction);

registerAction2(class extends NoteBookAction {
	constructor() {
		super({
			id: CLEAR_ALL_CELLS_OUTPUTS_COMMAND_ID,
			title: localize('clearAllCellsOutputs', 'Clear All Cells Outputs'),
			menu: {
				id: MenuId.EditorTitle,
				when: NOTEBOOK_IS_ACTIVE_EDITOR,
				group: 'navigation',
				order: 0
			},
			icon: { id: 'codicon/clear-all' },
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookActionContext): Promise<void> {
		const editor = context.noteBookEditor;
		if (!editor.viewModel || !editor.viewModel.length) {
			return;
		}

		editor.viewModel.noteBookDocument.applyEdits(editor.viewModel.noteBookDocument.versionId,
			editor.viewModel.noteBookDocument.cells.map((cell, index) => ({
				editType: CellEditType.Output, index, outputs: []
			})), true, undefined, () => undefined, undefined);

		const clearExecutionMetadataEdits = editor.viewModel.noteBookDocument.cells.map((cell, index) => {
			if (cell.metadata && cell.metadata?.runState !== NoteBookCellRunState.Running) {
				return {
					editType: CellEditType.Metadata, index, metadata: {
						...cell.metadata,
						runState: NoteBookCellRunState.Idle,
						runStartTime: undefined,
						lastRunDuration: undefined,
						statusMessage: undefined,
						executionOrder: undefined
					}
				};
			} else {
				return undefined;
			}
		}).filter(edit => !!edit) as ICellEditOperation[];
		if (clearExecutionMetadataEdits.length) {
			context.noteBookEditor.viewModel!.noteBookDocument.applyEdits(context.noteBookEditor.viewModel!.noteBookDocument.versionId, clearExecutionMetadataEdits, true, undefined, () => undefined, undefined);
		}
	}
});

async function splitCell(context: INoteBookCellActionContext): Promise<void> {
	const newCells = await context.noteBookEditor.splitNoteBookCell(context.cell);
	if (newCells) {
		context.noteBookEditor.focusNoteBookCell(newCells[newCells.length - 1], 'editor');
	}
}

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super(
			{
				id: SPLIT_CELL_COMMAND_ID,
				title: localize('noteBookActions.splitCell', "Split Cell"),
				menu: {
					id: MenuId.NoteBookCellTitle,
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_EDITOR_FOCUSED),
					order: CellToolBarOrder.SplitCell,
					group: CELL_TITLE_CELL_GROUP_ID,
					// alt: {
					// 	id: JOIN_CELL_BELOW_COMMAND_ID,
					// 	title: localize('noteBookActions.joinCellBelow', "Join with Next Cell")
					// }
				},
				icon: { id: 'codicon/split-vertical' },
				keyBinding: {
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_EDITOR_FOCUSED),
					primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_BACKSLASH),
					weight: KeyBindingWeight.WorkBenchContriB
				},
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext) {
		return splitCell(context);
	}
});


async function joinCells(context: INoteBookCellActionContext, direction: 'aBove' | 'Below'): Promise<void> {
	const cell = await context.noteBookEditor.joinNoteBookCells(context.cell, direction);
	if (cell) {
		context.noteBookEditor.focusNoteBookCell(cell, 'editor');
	}
}

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super(
			{
				id: JOIN_CELL_ABOVE_COMMAND_ID,
				title: localize('noteBookActions.joinCellABove', "Join With Previous Cell"),
				keyBinding: {
					when: NOTEBOOK_EDITOR_FOCUSED,
					primary: KeyMod.WinCtrl | KeyMod.Alt | KeyMod.Shift | KeyCode.KEY_J,
					weight: KeyBindingWeight.WorkBenchContriB
				},
				menu: {
					id: MenuId.NoteBookCellTitle,
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE),
					group: CellOverflowToolBarGroups.Edit,
					order: 10
				}
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext) {
		return joinCells(context, 'aBove');
	}
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super(
			{
				id: JOIN_CELL_BELOW_COMMAND_ID,
				title: localize('noteBookActions.joinCellBelow', "Join With Next Cell"),
				keyBinding: {
					when: NOTEBOOK_EDITOR_FOCUSED,
					primary: KeyMod.WinCtrl | KeyMod.Alt | KeyCode.KEY_J,
					weight: KeyBindingWeight.WorkBenchContriB
				},
				menu: {
					id: MenuId.NoteBookCellTitle,
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE),
					group: CellOverflowToolBarGroups.Edit,
					order: 11
				}
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext) {
		return joinCells(context, 'Below');
	}
});

registerAction2(class extends NoteBookCellAction {
	constructor() {
		super({
			id: CENTER_ACTIVE_CELL,
			title: localize('noteBookActions.centerActiveCell', "Center Active Cell"),
			keyBinding: {
				when: NOTEBOOK_EDITOR_FOCUSED,
				primary: KeyMod.CtrlCmd | KeyCode.KEY_L,
				mac: {
					primary: KeyMod.WinCtrl | KeyCode.KEY_L,
				},
				weight: KeyBindingWeight.WorkBenchContriB
			},
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext): Promise<void> {
		return context.noteBookEditor.revealInCenter(context.cell);
	}
});

aBstract class ChangeNoteBookCellMetadataAction extends NoteBookCellAction {
	async runWithContext(accessor: ServicesAccessor, context: INoteBookCellActionContext): Promise<void> {
		const cell = context.cell;
		const textModel = context.noteBookEditor.viewModel?.noteBookDocument;
		if (!textModel) {
			return;
		}

		const index = textModel.cells.indexOf(cell.model);

		if (index < 0) {
			return;
		}

		textModel.applyEdits(textModel.versionId, [{ editType: CellEditType.Metadata, index, metadata: { ...context.cell.metadata, ...this.getMetadataDelta() } }], true, undefined, () => undefined, undefined);
	}

	aBstract getMetadataDelta(): NoteBookCellMetadata;
}

registerAction2(class extends ChangeNoteBookCellMetadataAction {
	constructor() {
		super({
			id: COLLAPSE_CELL_INPUT_COMMAND_ID,
			title: localize('noteBookActions.collapseCellInput', "Collapse Cell Input"),
			keyBinding: {
				when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_INPUT_COLLAPSED.toNegated(), InputFocusedContext.toNegated()),
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_C),
				weight: KeyBindingWeight.WorkBenchContriB
			},
			menu: {
				id: MenuId.NoteBookCellTitle,
				when: ContextKeyExpr.and(NOTEBOOK_CELL_INPUT_COLLAPSED.toNegated()),
				group: CellOverflowToolBarGroups.Collapse,
			}
		});
	}

	getMetadataDelta(): NoteBookCellMetadata {
		return { inputCollapsed: true };
	}
});

registerAction2(class extends ChangeNoteBookCellMetadataAction {
	constructor() {
		super({
			id: EXPAND_CELL_CONTENT_COMMAND_ID,
			title: localize('noteBookActions.expandCellContent', "Expand Cell Content"),
			keyBinding: {
				when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_INPUT_COLLAPSED),
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_C),
				weight: KeyBindingWeight.WorkBenchContriB
			},
			menu: {
				id: MenuId.NoteBookCellTitle,
				when: ContextKeyExpr.and(NOTEBOOK_CELL_INPUT_COLLAPSED),
				group: CellOverflowToolBarGroups.Collapse,
			}
		});
	}

	getMetadataDelta(): NoteBookCellMetadata {
		return { inputCollapsed: false };
	}
});

registerAction2(class extends ChangeNoteBookCellMetadataAction {
	constructor() {
		super({
			id: COLLAPSE_CELL_OUTPUT_COMMAND_ID,
			title: localize('noteBookActions.collapseCellOutput', "Collapse Cell Output"),
			keyBinding: {
				when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_OUTPUT_COLLAPSED.toNegated(), InputFocusedContext.toNegated(), NOTEBOOK_CELL_HAS_OUTPUTS),
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_T),
				weight: KeyBindingWeight.WorkBenchContriB
			},
			menu: {
				id: MenuId.NoteBookCellTitle,
				when: ContextKeyExpr.and(NOTEBOOK_CELL_OUTPUT_COLLAPSED.toNegated(), NOTEBOOK_CELL_HAS_OUTPUTS),
				group: CellOverflowToolBarGroups.Collapse,
			}
		});
	}

	getMetadataDelta(): NoteBookCellMetadata {
		return { outputCollapsed: true };
	}
});

registerAction2(class extends ChangeNoteBookCellMetadataAction {
	constructor() {
		super({
			id: EXPAND_CELL_OUTPUT_COMMAND_ID,
			title: localize('noteBookActions.expandCellOutput', "Expand Cell Output"),
			keyBinding: {
				when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_OUTPUT_COLLAPSED),
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_T),
				weight: KeyBindingWeight.WorkBenchContriB
			},
			menu: {
				id: MenuId.NoteBookCellTitle,
				when: ContextKeyExpr.and(NOTEBOOK_CELL_OUTPUT_COLLAPSED),
				group: CellOverflowToolBarGroups.Collapse,
			}
		});
	}

	getMetadataDelta(): NoteBookCellMetadata {
		return { outputCollapsed: false };
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'noteBook.inspectLayout',
			title: localize('noteBookActions.inspectLayout', "Inspect NoteBook Layout"),
			category: CATEGORIES.Developer,
			f1: true
		});
	}

	protected getActiveEditorContext(accessor: ServicesAccessor): INoteBookActionContext | undefined {
		const editorService = accessor.get(IEditorService);

		const editor = getActiveNoteBookEditor(editorService);
		if (!editor) {
			return;
		}

		const activeCell = editor.getActiveCell();
		return {
			cell: activeCell,
			noteBookEditor: editor
		};
	}

	run(accessor: ServicesAccessor) {
		const activeEditorContext = this.getActiveEditorContext(accessor);

		if (activeEditorContext) {
			const viewModel = activeEditorContext.noteBookEditor.viewModel!;
			console.log('--- noteBook ---');
			console.log(viewModel.layoutInfo);
			console.log('--- cells ---');
			for (let i = 0; i < viewModel.length; i++) {
				const cell = viewModel.viewCells[i] as CellViewModel;
				console.log(`--- cell: ${cell.handle} ---`);
				console.log(cell.layoutInfo);
			}

		}
	}
});

CommandsRegistry.registerCommand('_resolveNoteBookContentProvider', (accessor, args): {
	viewType: string;
	displayName: string;
	options: { transientOutputs: Boolean; transientMetadata: TransientMetadata };
	filenamePattern: (string | gloB.IRelativePattern | { include: string | gloB.IRelativePattern, exclude: string | gloB.IRelativePattern })[]
}[] => {
	const noteBookService = accessor.get<INoteBookService>(INoteBookService);
	const contentProviders = noteBookService.getContriButedNoteBookProviders();
	return contentProviders.map(provider => {
		const filenamePatterns = provider.selectors.map(selector => {
			if (typeof selector === 'string') {
				return selector;
			}

			if (gloB.isRelativePattern(selector)) {
				return selector;
			}

			if (isDocumentExcludePattern(selector)) {
				return {
					include: selector.include,
					exclude: selector.exclude
				};
			}

			return null;
		}).filter(pattern => pattern !== null) as (string | gloB.IRelativePattern | { include: string | gloB.IRelativePattern, exclude: string | gloB.IRelativePattern })[];

		return {
			viewType: provider.id,
			displayName: provider.displayName,
			filenamePattern: filenamePatterns,
			options: { transientMetadata: provider.options.transientMetadata, transientOutputs: provider.options.transientOutputs }
		};
	});
});
