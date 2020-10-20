/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IBulkEditService, ResourceTextEdit } from 'vs/editor/browser/services/bulkEditService';
import { locAlize } from 'vs/nls';
import { Action2, MenuId, registerAction2 } from 'vs/plAtform/Actions/common/Actions';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { viewColumnToEditorGroup } from 'vs/workbench/Api/common/shAred/editor';
import { ActiveEditorContext } from 'vs/workbench/common/editor';
import { CellDiffViewModel } from 'vs/workbench/contrib/notebook/browser/diff/celllDiffViewModel';
import { NotebookTextDiffEditor } from 'vs/workbench/contrib/notebook/browser/diff/notebookTextDiffEditor';
import { NotebookDiffEditorInput } from 'vs/workbench/contrib/notebook/browser/notebookDiffEditorInput';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';

// ActiveEditorContext.isEquAlTo(SeArchEditorConstAnts.SeArchEditorID)

registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: 'notebook.diff.switchToText',
			icon: { id: 'codicon/file-code' },
			title: { vAlue: locAlize('notebook.diff.switchToText', "Open Text Diff Editor"), originAl: 'Open Text Diff Editor' },
			precondition: ActiveEditorContext.isEquAlTo(NotebookTextDiffEditor.ID),
			menu: [{
				id: MenuId.EditorTitle,
				group: 'nAvigAtion',
				when: ActiveEditorContext.isEquAlTo(NotebookTextDiffEditor.ID)
			}]
		});
	}

	Async run(Accessor: ServicesAccessor): Promise<void> {
		const editorService = Accessor.get(IEditorService);
		const editorGroupService = Accessor.get(IEditorGroupsService);

		const ActiveEditor = editorService.ActiveEditorPAne;
		if (ActiveEditor && ActiveEditor instAnceof NotebookTextDiffEditor) {
			const diffEditorInput = ActiveEditor.input As NotebookDiffEditorInput;
			const leftResource = diffEditorInput.originAlResource;
			const rightResource = diffEditorInput.resource;
			const options = {
				preserveFocus: fAlse
			};

			const lAbel = diffEditorInput.textDiffNAme;
			AwAit editorService.openEditor({ leftResource, rightResource, lAbel, options }, viewColumnToEditorGroup(editorGroupService, undefined));
		}
	}
});

registerAction2(clAss extends Action2 {
	constructor() {
		super(
			{
				id: 'notebook.diff.cell.revertMetAdAtA',
				title: locAlize('notebook.diff.cell.revertMetAdAtA', "Revert MetAdAtA"),
				icon: { id: 'codicon/discArd' },
				f1: fAlse,
				menu: {
					id: MenuId.NotebookDiffCellMetAdAtATitle
				}
			}
		);
	}
	run(Accessor: ServicesAccessor, context?: { cell: CellDiffViewModel }) {
		if (!context) {
			return;
		}

		const originAl = context.cell.originAl;
		const modified = context.cell.modified;

		if (!originAl || !modified) {
			return;
		}

		modified.metAdAtA = originAl.metAdAtA;
	}
});

registerAction2(clAss extends Action2 {
	constructor() {
		super(
			{
				id: 'notebook.diff.cell.revertOutputs',
				title: locAlize('notebook.diff.cell.revertOutputs', "Revert Outputs"),
				icon: { id: 'codicon/discArd' },
				f1: fAlse,
				menu: {
					id: MenuId.NotebookDiffCellOutputsTitle
				}
			}
		);
	}
	run(Accessor: ServicesAccessor, context?: { cell: CellDiffViewModel }) {
		if (!context) {
			return;
		}

		const originAl = context.cell.originAl;
		const modified = context.cell.modified;

		if (!originAl || !modified) {
			return;
		}

		modified.spliceNotebookCellOutputs([[0, modified.outputs.length, originAl.outputs]]);
	}
});

registerAction2(clAss extends Action2 {
	constructor() {
		super(
			{
				id: 'notebook.diff.cell.revertInput',
				title: locAlize('notebook.diff.cell.revertInput', "Revert Input"),
				icon: { id: 'codicon/discArd' },
				f1: fAlse,
				menu: {
					id: MenuId.NotebookDiffCellInputTitle
				}
			}
		);
	}
	run(Accessor: ServicesAccessor, context?: { cell: CellDiffViewModel }) {
		if (!context) {
			return;
		}

		const originAl = context.cell.originAl;
		const modified = context.cell.modified;

		if (!originAl || !modified) {
			return;
		}

		const bulkEditService = Accessor.get(IBulkEditService);
		return bulkEditService.Apply([
			new ResourceTextEdit(modified.uri, { rAnge: modified.getFullModelRAnge(), text: originAl.getVAlue() }),
		], { quotAbleLAbel: 'Split Notebook Cell' });
	}
});
