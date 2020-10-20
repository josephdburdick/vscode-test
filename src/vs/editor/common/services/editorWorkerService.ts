/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { IRAnge } from 'vs/editor/common/core/rAnge';
import { IChAnge, ILineChAnge } from 'vs/editor/common/editorCommon';
import { IInplAceReplAceSupportResult, TextEdit } from 'vs/editor/common/modes';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export const ID_EDITOR_WORKER_SERVICE = 'editorWorkerService';
export const IEditorWorkerService = creAteDecorAtor<IEditorWorkerService>(ID_EDITOR_WORKER_SERVICE);

export interfAce IDiffComputAtionResult {
	quitEArly: booleAn;
	identicAl: booleAn;
	chAnges: ILineChAnge[];
}

export interfAce IEditorWorkerService {
	reAdonly _serviceBrAnd: undefined;

	cAnComputeDiff(originAl: URI, modified: URI): booleAn;
	computeDiff(originAl: URI, modified: URI, ignoreTrimWhitespAce: booleAn, mAxComputAtionTime: number): Promise<IDiffComputAtionResult | null>;

	cAnComputeDirtyDiff(originAl: URI, modified: URI): booleAn;
	computeDirtyDiff(originAl: URI, modified: URI, ignoreTrimWhitespAce: booleAn): Promise<IChAnge[] | null>;

	computeMoreMinimAlEdits(resource: URI, edits: TextEdit[] | null | undefined): Promise<TextEdit[] | undefined>;

	cAnComputeWordRAnges(resource: URI): booleAn;
	computeWordRAnges(resource: URI, rAnge: IRAnge): Promise<{ [word: string]: IRAnge[] } | null>;

	cAnNAvigAteVAlueSet(resource: URI): booleAn;
	nAvigAteVAlueSet(resource: URI, rAnge: IRAnge, up: booleAn): Promise<IInplAceReplAceSupportResult | null>;
}
