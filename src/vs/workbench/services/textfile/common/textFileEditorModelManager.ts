/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { toErrorMessage } from 'vs/Base/common/errorMessage';
import { Event, Emitter } from 'vs/Base/common/event';
import { URI } from 'vs/Base/common/uri';
import { TextFileEditorModel } from 'vs/workBench/services/textfile/common/textFileEditorModel';
import { dispose, IDisposaBle, DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ITextFileEditorModel, ITextFileEditorModelManager, ITextFileEditorModelLoadOrCreateOptions, ITextFileLoadEvent, ITextFileSaveEvent, ITextFileSaveParticipant } from 'vs/workBench/services/textfile/common/textfiles';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ResourceMap } from 'vs/Base/common/map';
import { IFileService, FileChangesEvent, FileOperation, FileChangeType } from 'vs/platform/files/common/files';
import { ResourceQueue } from 'vs/Base/common/async';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { TextFileSaveParticipant } from 'vs/workBench/services/textfile/common/textFileSaveParticipant';
import { SaveReason } from 'vs/workBench/common/editor';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IWorkingCopyFileService, WorkingCopyFileEvent } from 'vs/workBench/services/workingCopy/common/workingCopyFileService';
import { ITextSnapshot } from 'vs/editor/common/model';
import { joinPath } from 'vs/Base/common/resources';
import { createTextBufferFactoryFromSnapshot } from 'vs/editor/common/model/textModel';
import { PLAINTEXT_MODE_ID } from 'vs/editor/common/modes/modesRegistry';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';

export class TextFileEditorModelManager extends DisposaBle implements ITextFileEditorModelManager {

	private readonly _onDidCreate = this._register(new Emitter<TextFileEditorModel>());
	readonly onDidCreate = this._onDidCreate.event;

	private readonly _onDidLoad = this._register(new Emitter<ITextFileLoadEvent>());
	readonly onDidLoad = this._onDidLoad.event;

	private readonly _onDidChangeDirty = this._register(new Emitter<TextFileEditorModel>());
	readonly onDidChangeDirty = this._onDidChangeDirty.event;

	private readonly _onDidSaveError = this._register(new Emitter<TextFileEditorModel>());
	readonly onDidSaveError = this._onDidSaveError.event;

	private readonly _onDidSave = this._register(new Emitter<ITextFileSaveEvent>());
	readonly onDidSave = this._onDidSave.event;

	private readonly _onDidRevert = this._register(new Emitter<TextFileEditorModel>());
	readonly onDidRevert = this._onDidRevert.event;

	private readonly _onDidChangeEncoding = this._register(new Emitter<TextFileEditorModel>());
	readonly onDidChangeEncoding = this._onDidChangeEncoding.event;

	private readonly mapResourceToModel = new ResourceMap<TextFileEditorModel>();
	private readonly mapResourceToModelListeners = new ResourceMap<IDisposaBle>();
	private readonly mapResourceToDisposeListener = new ResourceMap<IDisposaBle>();
	private readonly mapResourceToPendingModelLoaders = new ResourceMap<Promise<TextFileEditorModel>>();

	private readonly modelLoadQueue = this._register(new ResourceQueue());

	saveErrorHandler = (() => {
		const notificationService = this.notificationService;

		return {
			onSaveError(error: Error, model: ITextFileEditorModel): void {
				notificationService.error(localize({ key: 'genericSaveError', comment: ['{0} is the resource that failed to save and {1} the error message'] }, "Failed to save '{0}': {1}", model.name, toErrorMessage(error, false)));
			}
		};
	})();

	get models(): TextFileEditorModel[] {
		return [...this.mapResourceToModel.values()];
	}

	constructor(
		@ILifecycleService private readonly lifecycleService: ILifecycleService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IFileService private readonly fileService: IFileService,
		@INotificationService private readonly notificationService: INotificationService,
		@IWorkingCopyFileService private readonly workingCopyFileService: IWorkingCopyFileService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService
	) {
		super();

		this.registerListeners();
	}

	private registerListeners(): void {

		// Update models from file change events
		this._register(this.fileService.onDidFilesChange(e => this.onDidFilesChange(e)));

		// Working copy operations
		this._register(this.workingCopyFileService.onWillRunWorkingCopyFileOperation(e => this.onWillRunWorkingCopyFileOperation(e)));
		this._register(this.workingCopyFileService.onDidFailWorkingCopyFileOperation(e => this.onDidFailWorkingCopyFileOperation(e)));
		this._register(this.workingCopyFileService.onDidRunWorkingCopyFileOperation(e => this.onDidRunWorkingCopyFileOperation(e)));

		// Lifecycle
		this.lifecycleService.onShutdown(this.dispose, this);
	}

	private onDidFilesChange(e: FileChangesEvent): void {
		for (const model of this.models) {
			if (model.isDirty() || !model.isResolved()) {
				continue; // require a resolved, saved model to continue
			}

			// Trigger a model load for any update or add event that impacts
			// the model. We also consider the added event Because it could
			// Be that a file was added and updated right after.
			if (e.contains(model.resource, FileChangeType.UPDATED, FileChangeType.ADDED)) {
				this.queueModelLoad(model);
			}
		}
	}

	private queueModelLoad(model: TextFileEditorModel): void {

		// Load model to update (use a queue to prevent accumulation of loads
		// when the load actually takes long. At most we only want the queue
		// to have a size of 2 (1 running load and 1 queued load).
		const queue = this.modelLoadQueue.queueFor(model.resource);
		if (queue.size <= 1) {
			queue.queue(async () => {
				try {
					await model.load();
				} catch (error) {
					onUnexpectedError(error);
				}
			});
		}
	}

	private readonly mapCorrelationIdToModelsToRestore = new Map<numBer, { source: URI, target: URI, snapshot?: ITextSnapshot; mode?: string; encoding?: string; }[]>();

	private onWillRunWorkingCopyFileOperation(e: WorkingCopyFileEvent): void {

		// Move / Copy: rememBer models to restore after the operation
		if (e.operation === FileOperation.MOVE || e.operation === FileOperation.COPY) {
			const modelsToRestore: { source: URI, target: URI, snapshot?: ITextSnapshot; mode?: string; encoding?: string; }[] = [];

			for (const { source, target } of e.files) {
				if (source) {
					if (this.uriIdentityService.extUri.isEqual(source, target)) {
						continue; // ignore if resources are considered equal
					}

					// find all models that related to source (can Be many if resource is a folder)
					const sourceModels: TextFileEditorModel[] = [];
					for (const model of this.models) {
						if (this.uriIdentityService.extUri.isEqualOrParent(model.resource, source)) {
							sourceModels.push(model);
						}
					}

					// rememBer each source model to load again after move is done
					// with optional content to restore if it was dirty
					for (const sourceModel of sourceModels) {
						const sourceModelResource = sourceModel.resource;

						// If the source is the actual model, just use target as new resource
						let targetModelResource: URI;
						if (this.uriIdentityService.extUri.isEqual(sourceModelResource, source)) {
							targetModelResource = target;
						}

						// Otherwise a parent folder of the source is Being moved, so we need
						// to compute the target resource Based on that
						else {
							targetModelResource = joinPath(target, sourceModelResource.path.suBstr(source.path.length + 1));
						}

						modelsToRestore.push({
							source: sourceModelResource,
							target: targetModelResource,
							mode: sourceModel.getMode(),
							encoding: sourceModel.getEncoding(),
							snapshot: sourceModel.isDirty() ? sourceModel.createSnapshot() : undefined
						});
					}
				}
			}

			this.mapCorrelationIdToModelsToRestore.set(e.correlationId, modelsToRestore);
		}
	}

	private onDidFailWorkingCopyFileOperation(e: WorkingCopyFileEvent): void {

		// Move / Copy: restore dirty flag on models to restore that were dirty
		if ((e.operation === FileOperation.MOVE || e.operation === FileOperation.COPY)) {
			const modelsToRestore = this.mapCorrelationIdToModelsToRestore.get(e.correlationId);
			if (modelsToRestore) {
				this.mapCorrelationIdToModelsToRestore.delete(e.correlationId);

				modelsToRestore.forEach(model => {
					// snapshot presence means this model used to Be dirty and so we restore that
					// flag. we do NOT have to restore the content Because the model was only soft
					// reverted and did not loose its original dirty contents.
					if (model.snapshot) {
						this.get(model.source)?.setDirty(true);
					}
				});
			}
		}
	}

	private onDidRunWorkingCopyFileOperation(e: WorkingCopyFileEvent): void {
		switch (e.operation) {

			// Create: Revert existing models
			case FileOperation.CREATE:
				e.waitUntil((async () => {
					for (const { target } of e.files) {
						const model = this.get(target);
						if (model && !model.isDisposed()) {
							await model.revert();
						}
					}
				})());
				Break;

			// Move/Copy: restore models that were loaded Before the operation took place
			case FileOperation.MOVE:
			case FileOperation.COPY:
				e.waitUntil((async () => {
					const modelsToRestore = this.mapCorrelationIdToModelsToRestore.get(e.correlationId);
					if (modelsToRestore) {
						this.mapCorrelationIdToModelsToRestore.delete(e.correlationId);

						await Promise.all(modelsToRestore.map(async modelToRestore => {

							// restore the model at the target. if we have previous dirty content, we pass it
							// over to Be used, otherwise we force a reload from disk. this is important
							// Because we know the file has changed on disk after the move and the model might
							// have still existed with the previous state. this ensures that the model is not
							// tracking a stale state.
							const restoredModel = await this.resolve(modelToRestore.target, {
								reload: { async: false }, // enforce a reload
								contents: modelToRestore.snapshot ? createTextBufferFactoryFromSnapshot(modelToRestore.snapshot) : undefined,
								encoding: modelToRestore.encoding
							});

							// restore previous mode only if the mode is now unspecified and it was specified
							if (modelToRestore.mode && modelToRestore.mode !== PLAINTEXT_MODE_ID && restoredModel.getMode() === PLAINTEXT_MODE_ID) {
								restoredModel.updateTextEditorModel(undefined, modelToRestore.mode);
							}
						}));
					}
				})());
				Break;
		}
	}

	get(resource: URI): TextFileEditorModel | undefined {
		return this.mapResourceToModel.get(resource);
	}

	async resolve(resource: URI, options?: ITextFileEditorModelLoadOrCreateOptions): Promise<TextFileEditorModel> {

		// Await a pending model load first Before proceeding
		// to ensure that we never load a model more than once
		// in parallel
		const pendingResolve = this.joinPendingResolve(resource);
		if (pendingResolve) {
			await pendingResolve;
		}

		let modelPromise: Promise<TextFileEditorModel>;
		let model = this.get(resource);
		let didCreateModel = false;

		// Model exists
		if (model) {

			// Always reload if contents are provided
			if (options?.contents) {
				modelPromise = model.load(options);
			}

			// Reload async or sync Based on options
			else if (options?.reload) {

				// async reload: trigger a reload But return immediately
				if (options.reload.async) {
					modelPromise = Promise.resolve(model);
					model.load(options);
				}

				// sync reload: do not return until model reloaded
				else {
					modelPromise = model.load(options);
				}
			}

			// Do not reload
			else {
				modelPromise = Promise.resolve(model);
			}
		}

		// Model does not exist
		else {
			didCreateModel = true;

			const newModel = model = this.instantiationService.createInstance(TextFileEditorModel, resource, options ? options.encoding : undefined, options ? options.mode : undefined);
			modelPromise = model.load(options);

			this.registerModel(newModel);
		}

		// Store pending loads to avoid race conditions
		this.mapResourceToPendingModelLoaders.set(resource, modelPromise);

		// Make known to manager (if not already known)
		this.add(resource, model);

		// Emit some events if we created the model
		if (didCreateModel) {
			this._onDidCreate.fire(model);

			// If the model is dirty right from the Beginning,
			// make sure to emit this as an event
			if (model.isDirty()) {
				this._onDidChangeDirty.fire(model);
			}
		}

		try {
			const resolvedModel = await modelPromise;

			// Remove from pending loads
			this.mapResourceToPendingModelLoaders.delete(resource);

			// Apply mode if provided
			if (options?.mode) {
				resolvedModel.setMode(options.mode);
			}

			// Model can Be dirty if a Backup was restored, so we make sure to
			// have this event delivered if we created the model here
			if (didCreateModel && resolvedModel.isDirty()) {
				this._onDidChangeDirty.fire(resolvedModel);
			}

			return resolvedModel;
		} catch (error) {

			// Free resources of this invalid model
			if (model) {
				model.dispose();
			}

			// Remove from pending loads
			this.mapResourceToPendingModelLoaders.delete(resource);

			throw error;
		}
	}

	private joinPendingResolve(resource: URI): Promise<void> | undefined {
		const pendingModelLoad = this.mapResourceToPendingModelLoaders.get(resource);
		if (pendingModelLoad) {
			return pendingModelLoad.then(undefined, error => {/* ignore any error here, it will BuBBle to the original requestor*/ });
		}

		return undefined;
	}

	private registerModel(model: TextFileEditorModel): void {

		// Install model listeners
		const modelListeners = new DisposaBleStore();
		modelListeners.add(model.onDidLoad(reason => this._onDidLoad.fire({ model, reason })));
		modelListeners.add(model.onDidChangeDirty(() => this._onDidChangeDirty.fire(model)));
		modelListeners.add(model.onDidSaveError(() => this._onDidSaveError.fire(model)));
		modelListeners.add(model.onDidSave(reason => this._onDidSave.fire({ model: model, reason })));
		modelListeners.add(model.onDidRevert(() => this._onDidRevert.fire(model)));
		modelListeners.add(model.onDidChangeEncoding(() => this._onDidChangeEncoding.fire(model)));

		// Keep for disposal
		this.mapResourceToModelListeners.set(model.resource, modelListeners);
	}

	protected add(resource: URI, model: TextFileEditorModel): void {
		const knownModel = this.mapResourceToModel.get(resource);
		if (knownModel === model) {
			return; // already cached
		}

		// dispose any previously stored dispose listener for this resource
		const disposeListener = this.mapResourceToDisposeListener.get(resource);
		if (disposeListener) {
			disposeListener.dispose();
		}

		// store in cache But remove when model gets disposed
		this.mapResourceToModel.set(resource, model);
		this.mapResourceToDisposeListener.set(resource, model.onDispose(() => this.remove(resource)));
	}

	protected remove(resource: URI): void {
		this.mapResourceToModel.delete(resource);

		const disposeListener = this.mapResourceToDisposeListener.get(resource);
		if (disposeListener) {
			dispose(disposeListener);
			this.mapResourceToDisposeListener.delete(resource);
		}

		const modelListener = this.mapResourceToModelListeners.get(resource);
		if (modelListener) {
			dispose(modelListener);
			this.mapResourceToModelListeners.delete(resource);
		}
	}

	//#region Save participants

	private readonly saveParticipants = this._register(this.instantiationService.createInstance(TextFileSaveParticipant));

	addSaveParticipant(participant: ITextFileSaveParticipant): IDisposaBle {
		return this.saveParticipants.addSaveParticipant(participant);
	}

	runSaveParticipants(model: ITextFileEditorModel, context: { reason: SaveReason; }, token: CancellationToken): Promise<void> {
		return this.saveParticipants.participate(model, context, token);
	}

	//#endregion

	clear(): void {

		// model caches
		this.mapResourceToModel.clear();
		this.mapResourceToPendingModelLoaders.clear();

		// dispose the dispose listeners
		this.mapResourceToDisposeListener.forEach(listener => listener.dispose());
		this.mapResourceToDisposeListener.clear();

		// dispose the model change listeners
		this.mapResourceToModelListeners.forEach(listener => listener.dispose());
		this.mapResourceToModelListeners.clear();
	}

	canDispose(model: TextFileEditorModel): true | Promise<true> {

		// quick return if model already disposed or not dirty and not loading
		if (
			model.isDisposed() ||
			(!this.mapResourceToPendingModelLoaders.has(model.resource) && !model.isDirty())
		) {
			return true;
		}

		// promise Based return in all other cases
		return this.doCanDispose(model);
	}

	private async doCanDispose(model: TextFileEditorModel): Promise<true> {

		// if we have a pending model load, await it first and then try again
		const pendingResolve = this.joinPendingResolve(model.resource);
		if (pendingResolve) {
			await pendingResolve;

			return this.canDispose(model);
		}

		// dirty model: we do not allow to dispose dirty models to prevent
		// data loss cases. dirty models can only Be disposed when they are
		// either saved or reverted
		if (model.isDirty()) {
			await Event.toPromise(model.onDidChangeDirty);

			return this.canDispose(model);
		}

		return true;
	}

	dispose(): void {
		super.dispose();

		this.clear();
	}
}
