/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { ILineChAnge } from 'vs/editor/common/editorCommon';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { INotebookDiffResult } from 'vs/workbench/contrib/notebook/common/notebookCommon';

export const ID_NOTEBOOK_EDITOR_WORKER_SERVICE = 'notebookEditorWorkerService';
export const INotebookEditorWorkerService = creAteDecorAtor<INotebookEditorWorkerService>(ID_NOTEBOOK_EDITOR_WORKER_SERVICE);

export interfAce IDiffComputAtionResult {
	quitEArly: booleAn;
	identicAl: booleAn;
	chAnges: ILineChAnge[];
}

export interfAce INotebookEditorWorkerService {
	reAdonly _serviceBrAnd: undefined;

	cAnComputeDiff(originAl: URI, modified: URI): booleAn;
	computeDiff(originAl: URI, modified: URI): Promise<INotebookDiffResult>;
}
