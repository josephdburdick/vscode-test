/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { ILineChange } from 'vs/editor/common/editorCommon';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { INoteBookDiffResult } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';

export const ID_NOTEBOOK_EDITOR_WORKER_SERVICE = 'noteBookEditorWorkerService';
export const INoteBookEditorWorkerService = createDecorator<INoteBookEditorWorkerService>(ID_NOTEBOOK_EDITOR_WORKER_SERVICE);

export interface IDiffComputationResult {
	quitEarly: Boolean;
	identical: Boolean;
	changes: ILineChange[];
}

export interface INoteBookEditorWorkerService {
	readonly _serviceBrand: undefined;

	canComputeDiff(original: URI, modified: URI): Boolean;
	computeDiff(original: URI, modified: URI): Promise<INoteBookDiffResult>;
}
