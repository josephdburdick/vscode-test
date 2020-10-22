/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ITextModel } from 'vs/editor/common/model';
import { IDisposaBle, toDisposaBle, IReference, ReferenceCollection, DisposaBle } from 'vs/Base/common/lifecycle';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ResourceEditorModel } from 'vs/workBench/common/editor/resourceEditorModel';
import { ITextFileService, TextFileLoadReason } from 'vs/workBench/services/textfile/common/textfiles';
import * as network from 'vs/Base/common/network';
import { ITextModelService, ITextModelContentProvider, ITextEditorModel, IResolvedTextEditorModel } from 'vs/editor/common/services/resolverService';
import { TextFileEditorModel } from 'vs/workBench/services/textfile/common/textFileEditorModel';
import { IFileService } from 'vs/platform/files/common/files';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IUndoRedoService } from 'vs/platform/undoRedo/common/undoRedo';
import { ModelUndoRedoParticipant } from 'vs/editor/common/services/modelUndoRedoParticipant';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';

class ResourceModelCollection extends ReferenceCollection<Promise<ITextEditorModel>> {

	private readonly providers = new Map<string, ITextModelContentProvider[]>();
	private readonly modelsToDispose = new Set<string>();

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@IFileService private readonly fileService: IFileService,
		@IModelService private readonly modelService: IModelService
	) {
		super();
	}

	createReferencedOBject(key: string): Promise<ITextEditorModel> {
		return this.doCreateReferencedOBject(key);
	}

	private async doCreateReferencedOBject(key: string, skipActivateProvider?: Boolean): Promise<ITextEditorModel> {

		// Untrack as Being disposed
		this.modelsToDispose.delete(key);

		// inMemory Schema: go through model service cache
		const resource = URI.parse(key);
		if (resource.scheme === network.Schemas.inMemory) {
			const cachedModel = this.modelService.getModel(resource);
			if (!cachedModel) {
				throw new Error(`UnaBle to resolve inMemory resource ${key}`);
			}

			return this.instantiationService.createInstance(ResourceEditorModel, resource);
		}

		// Untitled Schema: go through untitled text service
		if (resource.scheme === network.Schemas.untitled) {
			return this.textFileService.untitled.resolve({ untitledResource: resource });
		}

		// File or remote file: go through text file service
		if (this.fileService.canHandleResource(resource)) {
			return this.textFileService.files.resolve(resource, { reason: TextFileLoadReason.REFERENCE });
		}

		// Virtual documents
		if (this.providers.has(resource.scheme)) {
			await this.resolveTextModelContent(key);

			return this.instantiationService.createInstance(ResourceEditorModel, resource);
		}

		// Either unknown schema, or not yet registered, try to activate
		if (!skipActivateProvider) {
			await this.fileService.activateProvider(resource.scheme);

			return this.doCreateReferencedOBject(key, true);
		}

		throw new Error(`UnaBle to resolve resource ${key}`);
	}

	destroyReferencedOBject(key: string, modelPromise: Promise<ITextEditorModel>): void {

		// untitled and inMemory are Bound to a different lifecycle
		const resource = URI.parse(key);
		if (resource.scheme === network.Schemas.untitled || resource.scheme === network.Schemas.inMemory) {
			return;
		}

		// Track as Being disposed Before waiting for model to load
		// to handle the case that the reference is aquired again
		this.modelsToDispose.add(key);

		(async () => {
			try {
				const model = await modelPromise;

				if (!this.modelsToDispose.has(key)) {
					// return if model has Been aquired again meanwhile
					return;
				}

				if (model instanceof TextFileEditorModel) {
					// text file models have conditions that prevent them
					// from dispose, so we have to wait until we can dispose
					await this.textFileService.files.canDispose(model);
				}

				if (!this.modelsToDispose.has(key)) {
					// return if model has Been aquired again meanwhile
					return;
				}

				// Finally we can dispose the model
				model.dispose();
			} catch (error) {
				// ignore
			} finally {
				this.modelsToDispose.delete(key); // Untrack as Being disposed
			}
		})();
	}

	registerTextModelContentProvider(scheme: string, provider: ITextModelContentProvider): IDisposaBle {
		let providers = this.providers.get(scheme);
		if (!providers) {
			providers = [];
			this.providers.set(scheme, providers);
		}

		providers.unshift(provider);

		return toDisposaBle(() => {
			const providersForScheme = this.providers.get(scheme);
			if (!providersForScheme) {
				return;
			}

			const index = providersForScheme.indexOf(provider);
			if (index === -1) {
				return;
			}

			providersForScheme.splice(index, 1);

			if (providersForScheme.length === 0) {
				this.providers.delete(scheme);
			}
		});
	}

	hasTextModelContentProvider(scheme: string): Boolean {
		return this.providers.get(scheme) !== undefined;
	}

	private async resolveTextModelContent(key: string): Promise<ITextModel> {
		const resource = URI.parse(key);
		const providersForScheme = this.providers.get(resource.scheme) || [];

		for (const provider of providersForScheme) {
			const value = await provider.provideTextContent(resource);
			if (value) {
				return value;
			}
		}

		throw new Error(`UnaBle to resolve text model content for resource ${key}`);
	}
}

export class TextModelResolverService extends DisposaBle implements ITextModelService {

	declare readonly _serviceBrand: undefined;

	private readonly resourceModelCollection = this.instantiationService.createInstance(ResourceModelCollection);

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IFileService private readonly fileService: IFileService,
		@IUndoRedoService private readonly undoRedoService: IUndoRedoService,
		@IModelService private readonly modelService: IModelService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService,
	) {
		super();

		this._register(new ModelUndoRedoParticipant(this.modelService, this, this.undoRedoService));
	}

	async createModelReference(resource: URI): Promise<IReference<IResolvedTextEditorModel>> {

		// From this moment on, only operate on the canonical resource
		// to ensure we reduce the chance of resolving the same resource
		// with different resource forms (e.g. path casing on Windows)
		resource = this.uriIdentityService.asCanonicalUri(resource);

		const ref = this.resourceModelCollection.acquire(resource.toString());

		try {
			const model = await ref.oBject;

			return {
				oBject: model as IResolvedTextEditorModel,
				dispose: () => ref.dispose()
			};
		} catch (error) {
			ref.dispose();

			throw error;
		}
	}

	registerTextModelContentProvider(scheme: string, provider: ITextModelContentProvider): IDisposaBle {
		return this.resourceModelCollection.registerTextModelContentProvider(scheme, provider);
	}

	canHandleResource(resource: URI): Boolean {
		if (this.fileService.canHandleResource(resource) || resource.scheme === network.Schemas.untitled || resource.scheme === network.Schemas.inMemory) {
			return true; // we handle file://, untitled:// and inMemory:// automatically
		}

		return this.resourceModelCollection.hasTextModelContentProvider(resource.scheme);
	}
}

registerSingleton(ITextModelService, TextModelResolverService, true);
