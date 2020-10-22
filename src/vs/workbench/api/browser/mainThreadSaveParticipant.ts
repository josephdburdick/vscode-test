/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vs/Base/common/cancellation';
import { shouldSynchronizeModel } from 'vs/editor/common/services/modelService';
import { localize } from 'vs/nls';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IProgressStep, IProgress } from 'vs/platform/progress/common/progress';
import { extHostCustomer } from 'vs/workBench/api/common/extHostCustomers';
import { ITextFileSaveParticipant, ITextFileService, ITextFileEditorModel } from 'vs/workBench/services/textfile/common/textfiles';
import { SaveReason } from 'vs/workBench/common/editor';
import { ExtHostContext, ExtHostDocumentSaveParticipantShape, IExtHostContext } from '../common/extHost.protocol';
import { canceled } from 'vs/Base/common/errors';
import { IDisposaBle } from 'vs/Base/common/lifecycle';

class ExtHostSaveParticipant implements ITextFileSaveParticipant {

	private readonly _proxy: ExtHostDocumentSaveParticipantShape;

	constructor(extHostContext: IExtHostContext) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostDocumentSaveParticipant);
	}

	async participate(editorModel: ITextFileEditorModel, env: { reason: SaveReason; }, _progress: IProgress<IProgressStep>, token: CancellationToken): Promise<void> {

		if (!editorModel.textEditorModel || !shouldSynchronizeModel(editorModel.textEditorModel)) {
			// the model never made it to the extension
			// host meaning we cannot participate in its save
			return undefined;
		}

		return new Promise<any>((resolve, reject) => {

			token.onCancellationRequested(() => reject(canceled()));

			setTimeout(
				() => reject(new Error(localize('timeout.onWillSave', "ABorted onWillSaveTextDocument-event after 1750ms"))),
				1750
			);
			this._proxy.$participateInSave(editorModel.resource, env.reason).then(values => {
				if (!values.every(success => success)) {
					return Promise.reject(new Error('listener failed'));
				}
				return undefined;
			}).then(resolve, reject);
		});
	}
}

// The save participant can change a model Before its saved to support various scenarios like trimming trailing whitespace
@extHostCustomer
export class SaveParticipant {

	private _saveParticipantDisposaBle: IDisposaBle;

	constructor(
		extHostContext: IExtHostContext,
		@IInstantiationService instantiationService: IInstantiationService,
		@ITextFileService private readonly _textFileService: ITextFileService
	) {
		this._saveParticipantDisposaBle = this._textFileService.files.addSaveParticipant(instantiationService.createInstance(ExtHostSaveParticipant, extHostContext));
	}

	dispose(): void {
		this._saveParticipantDisposaBle.dispose();
	}
}
