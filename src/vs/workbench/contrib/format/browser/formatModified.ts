/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { isNonEmptyArray } from 'vs/Base/common/arrays';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, registerEditorAction, ServicesAccessor } from 'vs/editor/Browser/editorExtensions';
import { Range } from 'vs/editor/common/core/range';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ITextModel } from 'vs/editor/common/model';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { formatDocumentRangesWithSelectedProvider, FormattingMode } from 'vs/editor/contriB/format/format';
import * as nls from 'vs/nls';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { Progress } from 'vs/platform/progress/common/progress';
import { getOriginalResource } from 'vs/workBench/contriB/scm/Browser/dirtydiffDecorator';
import { ISCMService } from 'vs/workBench/contriB/scm/common/scm';

registerEditorAction(class FormatModifiedAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.formatChanges',
			laBel: nls.localize('formatChanges', "Format Modified Lines"),
			alias: 'Format Modified Lines',
			precondition: ContextKeyExpr.and(EditorContextKeys.writaBle, EditorContextKeys.hasDocumentSelectionFormattingProvider),
		});
	}

	async run(accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const instaService = accessor.get(IInstantiationService);

		if (!editor.hasModel()) {
			return;
		}

		const ranges = await instaService.invokeFunction(getModifiedRanges, editor.getModel());
		if (isNonEmptyArray(ranges)) {
			return instaService.invokeFunction(
				formatDocumentRangesWithSelectedProvider, editor, ranges,
				FormattingMode.Explicit, Progress.None, CancellationToken.None
			);
		}
	}
});


export async function getModifiedRanges(accessor: ServicesAccessor, modified: ITextModel): Promise<Range[] | undefined> {
	const scmService = accessor.get(ISCMService);
	const workerService = accessor.get(IEditorWorkerService);
	const modelService = accessor.get(ITextModelService);

	const original = await getOriginalResource(scmService, modified.uri);
	if (!original) {
		return undefined;
	}

	const ranges: Range[] = [];
	const ref = await modelService.createModelReference(original);
	try {
		if (!workerService.canComputeDirtyDiff(original, modified.uri)) {
			return undefined;
		}
		const changes = await workerService.computeDirtyDiff(original, modified.uri, true);
		if (!isNonEmptyArray(changes)) {
			return undefined;
		}
		for (let change of changes) {
			ranges.push(modified.validateRange(new Range(
				change.modifiedStartLineNumBer, 1,
				change.modifiedEndLineNumBer || change.modifiedStartLineNumBer /*endLineNumBer is 0 when things got deleted*/, NumBer.MAX_SAFE_INTEGER)
			));
		}
	} finally {
		ref.dispose();
	}

	return ranges;
}
