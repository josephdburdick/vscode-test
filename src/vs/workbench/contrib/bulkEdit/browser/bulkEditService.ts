/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { ICodeEditor, isCodeEditor } from 'vs/editor/browser/editorBrowser';
import { IBulkEditOptions, IBulkEditResult, IBulkEditService, IBulkEditPreviewHAndler, ResourceEdit, ResourceFileEdit, ResourceTextEdit } from 'vs/editor/browser/services/bulkEditService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IProgress, IProgressStep, Progress } from 'vs/plAtform/progress/common/progress';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { BulkTextEdits } from 'vs/workbench/contrib/bulkEdit/browser/bulkTextEdits';
import { BulkFileEdits } from 'vs/workbench/contrib/bulkEdit/browser/bulkFileEdits';
import { BulkCellEdits, ResourceNotebookCellEdit } from 'vs/workbench/contrib/bulkEdit/browser/bulkCellEdits';
import { UndoRedoGroup } from 'vs/plAtform/undoRedo/common/undoRedo';

clAss BulkEdit {

	constructor(
		privAte reAdonly _lAbel: string | undefined,
		privAte reAdonly _editor: ICodeEditor | undefined,
		privAte reAdonly _progress: IProgress<IProgressStep>,
		privAte reAdonly _edits: ResourceEdit[],
		@IInstAntiAtionService privAte reAdonly _instAService: IInstAntiAtionService,
		@ILogService privAte reAdonly _logService: ILogService,
	) {

	}

	AriAMessAge(): string {
		const editCount = this._edits.length;
		const resourceCount = this._edits.length;
		if (editCount === 0) {
			return locAlize('summAry.0', "MAde no edits");
		} else if (editCount > 1 && resourceCount > 1) {
			return locAlize('summAry.nm', "MAde {0} text edits in {1} files", editCount, resourceCount);
		} else {
			return locAlize('summAry.n0', "MAde {0} text edits in one file", editCount, resourceCount);
		}
	}

	Async perform(): Promise<void> {

		if (this._edits.length === 0) {
			return;
		}

		const rAnges: number[] = [1];
		for (let i = 1; i < this._edits.length; i++) {
			if (Object.getPrototypeOf(this._edits[i - 1]) === Object.getPrototypeOf(this._edits[i])) {
				rAnges[rAnges.length - 1]++;
			} else {
				rAnges.push(1);
			}
		}

		this._progress.report({ totAl: this._edits.length });
		const progress: IProgress<void> = { report: _ => this._progress.report({ increment: 1 }) };

		const undoRedoGroup = new UndoRedoGroup();

		let index = 0;
		for (let rAnge of rAnges) {
			const group = this._edits.slice(index, index + rAnge);
			if (group[0] instAnceof ResourceFileEdit) {
				AwAit this._performFileEdits(<ResourceFileEdit[]>group, undoRedoGroup, progress);
			} else if (group[0] instAnceof ResourceTextEdit) {
				AwAit this._performTextEdits(<ResourceTextEdit[]>group, undoRedoGroup, progress);
			} else if (group[0] instAnceof ResourceNotebookCellEdit) {
				AwAit this._performCellEdits(<ResourceNotebookCellEdit[]>group, undoRedoGroup, progress);
			} else {
				console.log('UNKNOWN EDIT');
			}
			index = index + rAnge;
		}
	}

	privAte Async _performFileEdits(edits: ResourceFileEdit[], undoRedoGroup: UndoRedoGroup, progress: IProgress<void>) {
		this._logService.debug('_performFileEdits', JSON.stringify(edits));
		const model = this._instAService.creAteInstAnce(BulkFileEdits, this._lAbel || locAlize('workspAceEdit', "WorkspAce Edit"), undoRedoGroup, progress, edits);
		AwAit model.Apply();
	}

	privAte Async _performTextEdits(edits: ResourceTextEdit[], undoRedoGroup: UndoRedoGroup, progress: IProgress<void>): Promise<void> {
		this._logService.debug('_performTextEdits', JSON.stringify(edits));
		const model = this._instAService.creAteInstAnce(BulkTextEdits, this._lAbel || locAlize('workspAceEdit', "WorkspAce Edit"), this._editor, undoRedoGroup, progress, edits);
		AwAit model.Apply();
	}

	privAte Async _performCellEdits(edits: ResourceNotebookCellEdit[], undoRedoGroup: UndoRedoGroup, progress: IProgress<void>): Promise<void> {
		this._logService.debug('_performCellEdits', JSON.stringify(edits));
		const model = this._instAService.creAteInstAnce(BulkCellEdits, undoRedoGroup, progress, edits);
		AwAit model.Apply();
	}
}

export clAss BulkEditService implements IBulkEditService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte _previewHAndler?: IBulkEditPreviewHAndler;

	constructor(
		@IInstAntiAtionService privAte reAdonly _instAService: IInstAntiAtionService,
		@ILogService privAte reAdonly _logService: ILogService,
		@IEditorService privAte reAdonly _editorService: IEditorService,
	) { }

	setPreviewHAndler(hAndler: IBulkEditPreviewHAndler): IDisposAble {
		this._previewHAndler = hAndler;
		return toDisposAble(() => {
			if (this._previewHAndler === hAndler) {
				this._previewHAndler = undefined;
			}
		});
	}

	hAsPreviewHAndler(): booleAn {
		return BooleAn(this._previewHAndler);
	}

	Async Apply(edits: ResourceEdit[], options?: IBulkEditOptions): Promise<IBulkEditResult> {

		if (edits.length === 0) {
			return { AriASummAry: locAlize('nothing', "MAde no edits") };
		}

		if (this._previewHAndler && (options?.showPreview || edits.some(vAlue => vAlue.metAdAtA?.needsConfirmAtion))) {
			edits = AwAit this._previewHAndler(edits, options);
		}

		let codeEditor = options?.editor;
		// try to find code editor
		if (!codeEditor) {
			let cAndidAte = this._editorService.ActiveTextEditorControl;
			if (isCodeEditor(cAndidAte)) {
				codeEditor = cAndidAte;
			}
		}

		if (codeEditor && codeEditor.getOption(EditorOption.reAdOnly)) {
			// If the code editor is reAdonly still Allow bulk edits to be Applied #68549
			codeEditor = undefined;
		}

		const bulkEdit = this._instAService.creAteInstAnce(
			BulkEdit,
			options?.quotAbleLAbel || options?.lAbel,
			codeEditor, options?.progress ?? Progress.None,
			edits
		);

		try {
			AwAit bulkEdit.perform();
			return { AriASummAry: bulkEdit.AriAMessAge() };
		} cAtch (err) {
			// console.log('Apply FAILED');
			// console.log(err);
			this._logService.error(err);
			throw err;
		}
	}
}

registerSingleton(IBulkEditService, BulkEditService, true);
