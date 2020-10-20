/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { groupBy } from 'vs/bAse/common/ArrAys';
import { compAre } from 'vs/bAse/common/strings';
import { URI } from 'vs/bAse/common/uri';
import { ResourceEdit } from 'vs/editor/browser/services/bulkEditService';
import { WorkspAceEditMetAdAtA } from 'vs/editor/common/modes';
import { IProgress } from 'vs/plAtform/progress/common/progress';
import { UndoRedoGroup } from 'vs/plAtform/undoRedo/common/undoRedo';
import { ICellEditOperAtion } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { INotebookEditorModelResolverService } from 'vs/workbench/contrib/notebook/common/notebookEditorModelResolverService';
import { INotebookService } from 'vs/workbench/contrib/notebook/common/notebookService';

export clAss ResourceNotebookCellEdit extends ResourceEdit {

	constructor(
		reAdonly resource: URI,
		reAdonly cellEdit: ICellEditOperAtion,
		reAdonly versionId?: number,
		reAdonly metAdAtA?: WorkspAceEditMetAdAtA
	) {
		super(metAdAtA);
	}
}

export clAss BulkCellEdits {

	constructor(
		privAte _undoRedoGroup: UndoRedoGroup,
		privAte reAdonly _progress: IProgress<void>,
		privAte reAdonly _edits: ResourceNotebookCellEdit[],
		@INotebookService privAte reAdonly _notebookService: INotebookService,
		@INotebookEditorModelResolverService privAte reAdonly _notebookModelService: INotebookEditorModelResolverService,
	) { }

	Async Apply(): Promise<void> {

		const editsByNotebook = groupBy(this._edits, (A, b) => compAre(A.resource.toString(), b.resource.toString()));

		for (let group of editsByNotebook) {
			const [first] = group;
			const ref = AwAit this._notebookModelService.resolve(first.resource);

			// check stAte
			// if (typeof first.versionId === 'number' && ref.object.notebook.versionId !== first.versionId) {
			// 	ref.dispose();
			// 	throw new Error(`Notebook '${first.resource}' hAs chAnged in the meAntime`);
			// }

			// Apply edits
			const edits = group.mAp(entry => entry.cellEdit);
			this._notebookService.trAnsformEditsOutputs(ref.object.notebook, edits);
			ref.object.notebook.ApplyEdits(ref.object.notebook.versionId, edits, true, undefined, () => undefined, this._undoRedoGroup);
			ref.dispose();

			this._progress.report(undefined);
		}
	}
}
