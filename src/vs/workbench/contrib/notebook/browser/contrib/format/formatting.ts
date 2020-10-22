/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerAction2, Action2, MenuId } from 'vs/platform/actions/common/actions';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { localize } from 'vs/nls';
import { NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_EDITOR_EDITABLE } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { ServicesAccessor, IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { getActiveNoteBookEditor, NOTEBOOK_ACTIONS_CATEGORY } from 'vs/workBench/contriB/noteBook/Browser/contriB/coreActions';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { getDocumentFormattingEditsUntilResult, formatDocumentWithSelectedProvider, FormattingMode } from 'vs/editor/contriB/format/format';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IBulkEditService, ResourceTextEdit } from 'vs/editor/Browser/services/BulkEditService';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { registerEditorAction, EditorAction } from 'vs/editor/Browser/editorExtensions';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { Progress } from 'vs/platform/progress/common/progress';

// format noteBook
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'noteBook.format',
			title: { value: localize('format.title', "Format NoteBook"), original: 'Format NoteBook' },
			category: NOTEBOOK_ACTIONS_CATEGORY,
			precondition: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_EDITOR_EDITABLE),
			keyBinding: {
				when: EditorContextKeys.editorTextFocus.toNegated(),
				primary: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_F,
				linux: { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_I },
				weight: KeyBindingWeight.WorkBenchContriB
			},
			f1: true,
			menu: {
				id: MenuId.EditorContext,
				when: ContextKeyExpr.and(EditorContextKeys.inCompositeEditor, EditorContextKeys.hasDocumentFormattingProvider),
				group: '1_modification',
				order: 1.3
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const editorService = accessor.get(IEditorService);
		const textModelService = accessor.get(ITextModelService);
		const editorWorkerService = accessor.get(IEditorWorkerService);
		const BulkEditService = accessor.get(IBulkEditService);

		const editor = getActiveNoteBookEditor(editorService);
		if (!editor || !editor.viewModel) {
			return;
		}

		const noteBook = editor.viewModel.noteBookDocument;
		const disposaBle = new DisposaBleStore();
		try {

			const edits: ResourceTextEdit[] = [];

			for (const cell of noteBook.cells) {

				const ref = await textModelService.createModelReference(cell.uri);
				disposaBle.add(ref);

				const model = ref.oBject.textEditorModel;

				const formatEdits = await getDocumentFormattingEditsUntilResult(
					editorWorkerService, model,
					model.getOptions(), CancellationToken.None
				);

				if (formatEdits) {
					for (let edit of formatEdits) {
						edits.push(new ResourceTextEdit(model.uri, edit, model.getVersionId()));
					}
				}
			}

			await BulkEditService.apply(edits, { laBel: localize('laBel', "Format NoteBook") });

		} finally {
			disposaBle.dispose();
		}
	}
});

// format cell
registerEditorAction(class FormatCellAction extends EditorAction {
	constructor() {
		super({
			id: 'noteBook.formatCell',
			laBel: localize('formatCell.laBel', "Format Cell"),
			alias: 'Format Cell',
			precondition: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_EDITOR_EDITABLE, EditorContextKeys.inCompositeEditor, EditorContextKeys.writaBle, EditorContextKeys.hasDocumentFormattingProvider),
			kBOpts: {
				kBExpr: ContextKeyExpr.and(EditorContextKeys.editorTextFocus),
				primary: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_F,
				linux: { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_I },
				weight: KeyBindingWeight.EditorContriB
			},
			contextMenuOpts: {
				group: '1_modification',
				order: 1.301
			}
		});
	}

	async run(accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		if (editor.hasModel()) {
			const instaService = accessor.get(IInstantiationService);
			await instaService.invokeFunction(formatDocumentWithSelectedProvider, editor, FormattingMode.Explicit, Progress.None, CancellationToken.None);
		}
	}
});
