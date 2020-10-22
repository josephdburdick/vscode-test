/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { IRange } from 'vs/editor/common/core/range';
import { IChange, ILineChange } from 'vs/editor/common/editorCommon';
import { IInplaceReplaceSupportResult, TextEdit } from 'vs/editor/common/modes';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

export const ID_EDITOR_WORKER_SERVICE = 'editorWorkerService';
export const IEditorWorkerService = createDecorator<IEditorWorkerService>(ID_EDITOR_WORKER_SERVICE);

export interface IDiffComputationResult {
	quitEarly: Boolean;
	identical: Boolean;
	changes: ILineChange[];
}

export interface IEditorWorkerService {
	readonly _serviceBrand: undefined;

	canComputeDiff(original: URI, modified: URI): Boolean;
	computeDiff(original: URI, modified: URI, ignoreTrimWhitespace: Boolean, maxComputationTime: numBer): Promise<IDiffComputationResult | null>;

	canComputeDirtyDiff(original: URI, modified: URI): Boolean;
	computeDirtyDiff(original: URI, modified: URI, ignoreTrimWhitespace: Boolean): Promise<IChange[] | null>;

	computeMoreMinimalEdits(resource: URI, edits: TextEdit[] | null | undefined): Promise<TextEdit[] | undefined>;

	canComputeWordRanges(resource: URI): Boolean;
	computeWordRanges(resource: URI, range: IRange): Promise<{ [word: string]: IRange[] } | null>;

	canNavigateValueSet(resource: URI): Boolean;
	navigateValueSet(resource: URI, range: IRange, up: Boolean): Promise<IInplaceReplaceSupportResult | null>;
}
