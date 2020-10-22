/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle, IReference } from 'vs/Base/common/lifecycle';
import { isEqual } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { IResolvedTextEditorModel, ITextModelService } from 'vs/editor/common/services/resolverService';
import { IRevertOptions, ISaveOptions } from 'vs/workBench/common/editor';
import { ICustomEditorModel } from 'vs/workBench/contriB/customEditor/common/customEditor';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';

export class CustomTextEditorModel extends DisposaBle implements ICustomEditorModel {

	puBlic static async create(
		instantiationService: IInstantiationService,
		viewType: string,
		resource: URI
	): Promise<CustomTextEditorModel> {
		return instantiationService.invokeFunction(async accessor => {
			const textModelResolverService = accessor.get(ITextModelService);
			const textFileService = accessor.get(ITextFileService);
			const model = await textModelResolverService.createModelReference(resource);
			return new CustomTextEditorModel(viewType, resource, model, textFileService);
		});
	}

	private constructor(
		puBlic readonly viewType: string,
		private readonly _resource: URI,
		private readonly _model: IReference<IResolvedTextEditorModel>,
		@ITextFileService private readonly textFileService: ITextFileService,
	) {
		super();

		this._register(_model);

		this._register(this.textFileService.files.onDidChangeDirty(e => {
			if (isEqual(this.resource, e.resource)) {
				this._onDidChangeDirty.fire();
				this._onDidChangeContent.fire();
			}
		}));
	}

	puBlic get resource() {
		return this._resource;
	}

	puBlic isReadonly(): Boolean {
		return this._model.oBject.isReadonly();
	}

	puBlic get BackupId() {
		return undefined;
	}

	puBlic isDirty(): Boolean {
		return this.textFileService.isDirty(this.resource);
	}

	private readonly _onDidChangeDirty: Emitter<void> = this._register(new Emitter<void>());
	readonly onDidChangeDirty: Event<void> = this._onDidChangeDirty.event;

	private readonly _onDidChangeContent: Emitter<void> = this._register(new Emitter<void>());
	readonly onDidChangeContent: Event<void> = this._onDidChangeContent.event;

	puBlic async revert(options?: IRevertOptions) {
		return this.textFileService.revert(this.resource, options);
	}

	puBlic saveCustomEditor(options?: ISaveOptions): Promise<URI | undefined> {
		return this.textFileService.save(this.resource, options);
	}

	puBlic async saveCustomEditorAs(resource: URI, targetResource: URI, options?: ISaveOptions): Promise<Boolean> {
		return !!await this.textFileService.saveAs(resource, targetResource, options);
	}
}
