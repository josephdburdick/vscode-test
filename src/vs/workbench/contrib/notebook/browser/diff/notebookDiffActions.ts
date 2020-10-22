/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IBulkEditService, ResourceTextEdit } from 'vs/editor/Browser/services/BulkEditService';
import { localize } from 'vs/nls';
import { Action2, MenuId, registerAction2 } from 'vs/platform/actions/common/actions';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { viewColumnToEditorGroup } from 'vs/workBench/api/common/shared/editor';
import { ActiveEditorContext } from 'vs/workBench/common/editor';
import { CellDiffViewModel } from 'vs/workBench/contriB/noteBook/Browser/diff/celllDiffViewModel';
import { NoteBookTextDiffEditor } from 'vs/workBench/contriB/noteBook/Browser/diff/noteBookTextDiffEditor';
import { NoteBookDiffEditorInput } from 'vs/workBench/contriB/noteBook/Browser/noteBookDiffEditorInput';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';

// ActiveEditorContext.isEqualTo(SearchEditorConstants.SearchEditorID)

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'noteBook.diff.switchToText',
			icon: { id: 'codicon/file-code' },
			title: { value: localize('noteBook.diff.switchToText', "Open Text Diff Editor"), original: 'Open Text Diff Editor' },
			precondition: ActiveEditorContext.isEqualTo(NoteBookTextDiffEditor.ID),
			menu: [{
				id: MenuId.EditorTitle,
				group: 'navigation',
				when: ActiveEditorContext.isEqualTo(NoteBookTextDiffEditor.ID)
			}]
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const editorService = accessor.get(IEditorService);
		const editorGroupService = accessor.get(IEditorGroupsService);

		const activeEditor = editorService.activeEditorPane;
		if (activeEditor && activeEditor instanceof NoteBookTextDiffEditor) {
			const diffEditorInput = activeEditor.input as NoteBookDiffEditorInput;
			const leftResource = diffEditorInput.originalResource;
			const rightResource = diffEditorInput.resource;
			const options = {
				preserveFocus: false
			};

			const laBel = diffEditorInput.textDiffName;
			await editorService.openEditor({ leftResource, rightResource, laBel, options }, viewColumnToEditorGroup(editorGroupService, undefined));
		}
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super(
			{
				id: 'noteBook.diff.cell.revertMetadata',
				title: localize('noteBook.diff.cell.revertMetadata', "Revert Metadata"),
				icon: { id: 'codicon/discard' },
				f1: false,
				menu: {
					id: MenuId.NoteBookDiffCellMetadataTitle
				}
			}
		);
	}
	run(accessor: ServicesAccessor, context?: { cell: CellDiffViewModel }) {
		if (!context) {
			return;
		}

		const original = context.cell.original;
		const modified = context.cell.modified;

		if (!original || !modified) {
			return;
		}

		modified.metadata = original.metadata;
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super(
			{
				id: 'noteBook.diff.cell.revertOutputs',
				title: localize('noteBook.diff.cell.revertOutputs', "Revert Outputs"),
				icon: { id: 'codicon/discard' },
				f1: false,
				menu: {
					id: MenuId.NoteBookDiffCellOutputsTitle
				}
			}
		);
	}
	run(accessor: ServicesAccessor, context?: { cell: CellDiffViewModel }) {
		if (!context) {
			return;
		}

		const original = context.cell.original;
		const modified = context.cell.modified;

		if (!original || !modified) {
			return;
		}

		modified.spliceNoteBookCellOutputs([[0, modified.outputs.length, original.outputs]]);
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super(
			{
				id: 'noteBook.diff.cell.revertInput',
				title: localize('noteBook.diff.cell.revertInput', "Revert Input"),
				icon: { id: 'codicon/discard' },
				f1: false,
				menu: {
					id: MenuId.NoteBookDiffCellInputTitle
				}
			}
		);
	}
	run(accessor: ServicesAccessor, context?: { cell: CellDiffViewModel }) {
		if (!context) {
			return;
		}

		const original = context.cell.original;
		const modified = context.cell.modified;

		if (!original || !modified) {
			return;
		}

		const BulkEditService = accessor.get(IBulkEditService);
		return BulkEditService.apply([
			new ResourceTextEdit(modified.uri, { range: modified.getFullModelRange(), text: original.getValue() }),
		], { quotaBleLaBel: 'Split NoteBook Cell' });
	}
});
