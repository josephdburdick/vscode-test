/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, registerEditorAction, ServicesAccessor } from 'vs/editor/browser/editorExtensions';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ITextModel } from 'vs/editor/common/model';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { formAtDocumentRAngesWithSelectedProvider, FormAttingMode } from 'vs/editor/contrib/formAt/formAt';
import * As nls from 'vs/nls';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { Progress } from 'vs/plAtform/progress/common/progress';
import { getOriginAlResource } from 'vs/workbench/contrib/scm/browser/dirtydiffDecorAtor';
import { ISCMService } from 'vs/workbench/contrib/scm/common/scm';

registerEditorAction(clAss FormAtModifiedAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.formAtChAnges',
			lAbel: nls.locAlize('formAtChAnges', "FormAt Modified Lines"),
			AliAs: 'FormAt Modified Lines',
			precondition: ContextKeyExpr.And(EditorContextKeys.writAble, EditorContextKeys.hAsDocumentSelectionFormAttingProvider),
		});
	}

	Async run(Accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const instAService = Accessor.get(IInstAntiAtionService);

		if (!editor.hAsModel()) {
			return;
		}

		const rAnges = AwAit instAService.invokeFunction(getModifiedRAnges, editor.getModel());
		if (isNonEmptyArrAy(rAnges)) {
			return instAService.invokeFunction(
				formAtDocumentRAngesWithSelectedProvider, editor, rAnges,
				FormAttingMode.Explicit, Progress.None, CAncellAtionToken.None
			);
		}
	}
});


export Async function getModifiedRAnges(Accessor: ServicesAccessor, modified: ITextModel): Promise<RAnge[] | undefined> {
	const scmService = Accessor.get(ISCMService);
	const workerService = Accessor.get(IEditorWorkerService);
	const modelService = Accessor.get(ITextModelService);

	const originAl = AwAit getOriginAlResource(scmService, modified.uri);
	if (!originAl) {
		return undefined;
	}

	const rAnges: RAnge[] = [];
	const ref = AwAit modelService.creAteModelReference(originAl);
	try {
		if (!workerService.cAnComputeDirtyDiff(originAl, modified.uri)) {
			return undefined;
		}
		const chAnges = AwAit workerService.computeDirtyDiff(originAl, modified.uri, true);
		if (!isNonEmptyArrAy(chAnges)) {
			return undefined;
		}
		for (let chAnge of chAnges) {
			rAnges.push(modified.vAlidAteRAnge(new RAnge(
				chAnge.modifiedStArtLineNumber, 1,
				chAnge.modifiedEndLineNumber || chAnge.modifiedStArtLineNumber /*endLineNumber is 0 when things got deleted*/, Number.MAX_SAFE_INTEGER)
			));
		}
	} finAlly {
		ref.dispose();
	}

	return rAnges;
}
