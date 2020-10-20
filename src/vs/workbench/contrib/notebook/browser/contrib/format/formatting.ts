/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { registerAction2, Action2, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { locAlize } from 'vs/nls';
import { NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_EDITOR_EDITABLE } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { ServicesAccessor, IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { getActiveNotebookEditor, NOTEBOOK_ACTIONS_CATEGORY } from 'vs/workbench/contrib/notebook/browser/contrib/coreActions';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { getDocumentFormAttingEditsUntilResult, formAtDocumentWithSelectedProvider, FormAttingMode } from 'vs/editor/contrib/formAt/formAt';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IBulkEditService, ResourceTextEdit } from 'vs/editor/browser/services/bulkEditService';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { registerEditorAction, EditorAction } from 'vs/editor/browser/editorExtensions';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { Progress } from 'vs/plAtform/progress/common/progress';

// formAt notebook
registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: 'notebook.formAt',
			title: { vAlue: locAlize('formAt.title', "FormAt Notebook"), originAl: 'FormAt Notebook' },
			cAtegory: NOTEBOOK_ACTIONS_CATEGORY,
			precondition: ContextKeyExpr.And(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_EDITOR_EDITABLE),
			keybinding: {
				when: EditorContextKeys.editorTextFocus.toNegAted(),
				primAry: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_F,
				linux: { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_I },
				weight: KeybindingWeight.WorkbenchContrib
			},
			f1: true,
			menu: {
				id: MenuId.EditorContext,
				when: ContextKeyExpr.And(EditorContextKeys.inCompositeEditor, EditorContextKeys.hAsDocumentFormAttingProvider),
				group: '1_modificAtion',
				order: 1.3
			}
		});
	}

	Async run(Accessor: ServicesAccessor): Promise<void> {
		const editorService = Accessor.get(IEditorService);
		const textModelService = Accessor.get(ITextModelService);
		const editorWorkerService = Accessor.get(IEditorWorkerService);
		const bulkEditService = Accessor.get(IBulkEditService);

		const editor = getActiveNotebookEditor(editorService);
		if (!editor || !editor.viewModel) {
			return;
		}

		const notebook = editor.viewModel.notebookDocument;
		const disposAble = new DisposAbleStore();
		try {

			const edits: ResourceTextEdit[] = [];

			for (const cell of notebook.cells) {

				const ref = AwAit textModelService.creAteModelReference(cell.uri);
				disposAble.Add(ref);

				const model = ref.object.textEditorModel;

				const formAtEdits = AwAit getDocumentFormAttingEditsUntilResult(
					editorWorkerService, model,
					model.getOptions(), CAncellAtionToken.None
				);

				if (formAtEdits) {
					for (let edit of formAtEdits) {
						edits.push(new ResourceTextEdit(model.uri, edit, model.getVersionId()));
					}
				}
			}

			AwAit bulkEditService.Apply(edits, { lAbel: locAlize('lAbel', "FormAt Notebook") });

		} finAlly {
			disposAble.dispose();
		}
	}
});

// formAt cell
registerEditorAction(clAss FormAtCellAction extends EditorAction {
	constructor() {
		super({
			id: 'notebook.formAtCell',
			lAbel: locAlize('formAtCell.lAbel', "FormAt Cell"),
			AliAs: 'FormAt Cell',
			precondition: ContextKeyExpr.And(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_EDITOR_EDITABLE, EditorContextKeys.inCompositeEditor, EditorContextKeys.writAble, EditorContextKeys.hAsDocumentFormAttingProvider),
			kbOpts: {
				kbExpr: ContextKeyExpr.And(EditorContextKeys.editorTextFocus),
				primAry: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_F,
				linux: { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_I },
				weight: KeybindingWeight.EditorContrib
			},
			contextMenuOpts: {
				group: '1_modificAtion',
				order: 1.301
			}
		});
	}

	Async run(Accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		if (editor.hAsModel()) {
			const instAService = Accessor.get(IInstAntiAtionService);
			AwAit instAService.invokeFunction(formAtDocumentWithSelectedProvider, editor, FormAttingMode.Explicit, Progress.None, CAncellAtionToken.None);
		}
	}
});
