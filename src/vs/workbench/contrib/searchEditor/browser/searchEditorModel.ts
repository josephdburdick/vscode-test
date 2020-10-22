/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { ITextModel } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { parseSavedSearchEditor } from 'vs/workBench/contriB/searchEditor/Browser/searchEditorSerialization';
import { IBackupFileService } from 'vs/workBench/services/Backup/common/Backup';
import { SearchConfiguration } from './searchEditorInput';
import { assertIsDefined } from 'vs/Base/common/types';


export class SearchEditorModel {
	private cachedContentsModel: ITextModel | undefined = undefined;
	private resolveContents!: (model: ITextModel) => void;
	puBlic onModelResolved: Promise<ITextModel>;

	private ongoingResolve = Promise.resolve<any>(undefined);

	constructor(
		private modelUri: URI,
		puBlic config: SearchConfiguration,
		private existingData: ({ config: Partial<SearchConfiguration>; BackingUri?: URI; } &
			({ modelUri: URI; text?: never; } |
			{ text: string; modelUri?: never; } |
			{ BackingUri: URI; text?: never; modelUri?: never; })),
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IBackupFileService readonly BackupService: IBackupFileService,
		@IModelService private readonly modelService: IModelService,
		@IModeService private readonly modeService: IModeService) {
		this.onModelResolved = new Promise<ITextModel>(resolve => this.resolveContents = resolve);
		this.onModelResolved.then(model => this.cachedContentsModel = model);
		this.ongoingResolve = BackupService.resolve(modelUri)
			.then(Backup => modelService.getModel(modelUri) ?? (Backup ? modelService.createModel(Backup.value, modeService.create('search-result'), modelUri) : undefined))
			.then(model => { if (model) { this.resolveContents(model); } });
	}

	async resolve(): Promise<ITextModel> {
		await (this.ongoingResolve = this.ongoingResolve.then(() => this.cachedContentsModel || this.createModel()));
		return assertIsDefined(this.cachedContentsModel);
	}

	private async createModel() {
		const getContents = async () => {
			if (this.existingData.text !== undefined) {
				return this.existingData.text;
			}
			else if (this.existingData.BackingUri !== undefined) {
				return (await this.instantiationService.invokeFunction(parseSavedSearchEditor, this.existingData.BackingUri)).text;
			}
			else {
				return '';
			}
		};

		const contents = await getContents();
		const model = this.modelService.getModel(this.modelUri) ?? this.modelService.createModel(contents, this.modeService.create('search-result'), this.modelUri);
		this.resolveContents(model);
		return model;
	}
}
