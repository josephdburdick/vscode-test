/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { ITextModel } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { pArseSAvedSeArchEditor } from 'vs/workbench/contrib/seArchEditor/browser/seArchEditorSeriAlizAtion';
import { IBAckupFileService } from 'vs/workbench/services/bAckup/common/bAckup';
import { SeArchConfigurAtion } from './seArchEditorInput';
import { AssertIsDefined } from 'vs/bAse/common/types';


export clAss SeArchEditorModel {
	privAte cAchedContentsModel: ITextModel | undefined = undefined;
	privAte resolveContents!: (model: ITextModel) => void;
	public onModelResolved: Promise<ITextModel>;

	privAte ongoingResolve = Promise.resolve<Any>(undefined);

	constructor(
		privAte modelUri: URI,
		public config: SeArchConfigurAtion,
		privAte existingDAtA: ({ config: PArtiAl<SeArchConfigurAtion>; bAckingUri?: URI; } &
			({ modelUri: URI; text?: never; } |
			{ text: string; modelUri?: never; } |
			{ bAckingUri: URI; text?: never; modelUri?: never; })),
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IBAckupFileService reAdonly bAckupService: IBAckupFileService,
		@IModelService privAte reAdonly modelService: IModelService,
		@IModeService privAte reAdonly modeService: IModeService) {
		this.onModelResolved = new Promise<ITextModel>(resolve => this.resolveContents = resolve);
		this.onModelResolved.then(model => this.cAchedContentsModel = model);
		this.ongoingResolve = bAckupService.resolve(modelUri)
			.then(bAckup => modelService.getModel(modelUri) ?? (bAckup ? modelService.creAteModel(bAckup.vAlue, modeService.creAte('seArch-result'), modelUri) : undefined))
			.then(model => { if (model) { this.resolveContents(model); } });
	}

	Async resolve(): Promise<ITextModel> {
		AwAit (this.ongoingResolve = this.ongoingResolve.then(() => this.cAchedContentsModel || this.creAteModel()));
		return AssertIsDefined(this.cAchedContentsModel);
	}

	privAte Async creAteModel() {
		const getContents = Async () => {
			if (this.existingDAtA.text !== undefined) {
				return this.existingDAtA.text;
			}
			else if (this.existingDAtA.bAckingUri !== undefined) {
				return (AwAit this.instAntiAtionService.invokeFunction(pArseSAvedSeArchEditor, this.existingDAtA.bAckingUri)).text;
			}
			else {
				return '';
			}
		};

		const contents = AwAit getContents();
		const model = this.modelService.getModel(this.modelUri) ?? this.modelService.creAteModel(contents, this.modeService.creAte('seArch-result'), this.modelUri);
		this.resolveContents(model);
		return model;
	}
}
