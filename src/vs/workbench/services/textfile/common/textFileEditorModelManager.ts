/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { toErrorMessAge } from 'vs/bAse/common/errorMessAge';
import { Event, Emitter } from 'vs/bAse/common/event';
import { URI } from 'vs/bAse/common/uri';
import { TextFileEditorModel } from 'vs/workbench/services/textfile/common/textFileEditorModel';
import { dispose, IDisposAble, DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ITextFileEditorModel, ITextFileEditorModelMAnAger, ITextFileEditorModelLoAdOrCreAteOptions, ITextFileLoAdEvent, ITextFileSAveEvent, ITextFileSAvePArticipAnt } from 'vs/workbench/services/textfile/common/textfiles';
import { ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { IFileService, FileChAngesEvent, FileOperAtion, FileChAngeType } from 'vs/plAtform/files/common/files';
import { ResourceQueue } from 'vs/bAse/common/Async';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { TextFileSAvePArticipAnt } from 'vs/workbench/services/textfile/common/textFileSAvePArticipAnt';
import { SAveReAson } from 'vs/workbench/common/editor';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IWorkingCopyFileService, WorkingCopyFileEvent } from 'vs/workbench/services/workingCopy/common/workingCopyFileService';
import { ITextSnApshot } from 'vs/editor/common/model';
import { joinPAth } from 'vs/bAse/common/resources';
import { creAteTextBufferFActoryFromSnApshot } from 'vs/editor/common/model/textModel';
import { PLAINTEXT_MODE_ID } from 'vs/editor/common/modes/modesRegistry';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';

export clAss TextFileEditorModelMAnAger extends DisposAble implements ITextFileEditorModelMAnAger {

	privAte reAdonly _onDidCreAte = this._register(new Emitter<TextFileEditorModel>());
	reAdonly onDidCreAte = this._onDidCreAte.event;

	privAte reAdonly _onDidLoAd = this._register(new Emitter<ITextFileLoAdEvent>());
	reAdonly onDidLoAd = this._onDidLoAd.event;

	privAte reAdonly _onDidChAngeDirty = this._register(new Emitter<TextFileEditorModel>());
	reAdonly onDidChAngeDirty = this._onDidChAngeDirty.event;

	privAte reAdonly _onDidSAveError = this._register(new Emitter<TextFileEditorModel>());
	reAdonly onDidSAveError = this._onDidSAveError.event;

	privAte reAdonly _onDidSAve = this._register(new Emitter<ITextFileSAveEvent>());
	reAdonly onDidSAve = this._onDidSAve.event;

	privAte reAdonly _onDidRevert = this._register(new Emitter<TextFileEditorModel>());
	reAdonly onDidRevert = this._onDidRevert.event;

	privAte reAdonly _onDidChAngeEncoding = this._register(new Emitter<TextFileEditorModel>());
	reAdonly onDidChAngeEncoding = this._onDidChAngeEncoding.event;

	privAte reAdonly mApResourceToModel = new ResourceMAp<TextFileEditorModel>();
	privAte reAdonly mApResourceToModelListeners = new ResourceMAp<IDisposAble>();
	privAte reAdonly mApResourceToDisposeListener = new ResourceMAp<IDisposAble>();
	privAte reAdonly mApResourceToPendingModelLoAders = new ResourceMAp<Promise<TextFileEditorModel>>();

	privAte reAdonly modelLoAdQueue = this._register(new ResourceQueue());

	sAveErrorHAndler = (() => {
		const notificAtionService = this.notificAtionService;

		return {
			onSAveError(error: Error, model: ITextFileEditorModel): void {
				notificAtionService.error(locAlize({ key: 'genericSAveError', comment: ['{0} is the resource thAt fAiled to sAve And {1} the error messAge'] }, "FAiled to sAve '{0}': {1}", model.nAme, toErrorMessAge(error, fAlse)));
			}
		};
	})();

	get models(): TextFileEditorModel[] {
		return [...this.mApResourceToModel.vAlues()];
	}

	constructor(
		@ILifecycleService privAte reAdonly lifecycleService: ILifecycleService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IFileService privAte reAdonly fileService: IFileService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IWorkingCopyFileService privAte reAdonly workingCopyFileService: IWorkingCopyFileService,
		@IUriIdentityService privAte reAdonly uriIdentityService: IUriIdentityService
	) {
		super();

		this.registerListeners();
	}

	privAte registerListeners(): void {

		// UpdAte models from file chAnge events
		this._register(this.fileService.onDidFilesChAnge(e => this.onDidFilesChAnge(e)));

		// Working copy operAtions
		this._register(this.workingCopyFileService.onWillRunWorkingCopyFileOperAtion(e => this.onWillRunWorkingCopyFileOperAtion(e)));
		this._register(this.workingCopyFileService.onDidFAilWorkingCopyFileOperAtion(e => this.onDidFAilWorkingCopyFileOperAtion(e)));
		this._register(this.workingCopyFileService.onDidRunWorkingCopyFileOperAtion(e => this.onDidRunWorkingCopyFileOperAtion(e)));

		// Lifecycle
		this.lifecycleService.onShutdown(this.dispose, this);
	}

	privAte onDidFilesChAnge(e: FileChAngesEvent): void {
		for (const model of this.models) {
			if (model.isDirty() || !model.isResolved()) {
				continue; // require A resolved, sAved model to continue
			}

			// Trigger A model loAd for Any updAte or Add event thAt impActs
			// the model. We Also consider the Added event becAuse it could
			// be thAt A file wAs Added And updAted right After.
			if (e.contAins(model.resource, FileChAngeType.UPDATED, FileChAngeType.ADDED)) {
				this.queueModelLoAd(model);
			}
		}
	}

	privAte queueModelLoAd(model: TextFileEditorModel): void {

		// LoAd model to updAte (use A queue to prevent AccumulAtion of loAds
		// when the loAd ActuAlly tAkes long. At most we only wAnt the queue
		// to hAve A size of 2 (1 running loAd And 1 queued loAd).
		const queue = this.modelLoAdQueue.queueFor(model.resource);
		if (queue.size <= 1) {
			queue.queue(Async () => {
				try {
					AwAit model.loAd();
				} cAtch (error) {
					onUnexpectedError(error);
				}
			});
		}
	}

	privAte reAdonly mApCorrelAtionIdToModelsToRestore = new MAp<number, { source: URI, tArget: URI, snApshot?: ITextSnApshot; mode?: string; encoding?: string; }[]>();

	privAte onWillRunWorkingCopyFileOperAtion(e: WorkingCopyFileEvent): void {

		// Move / Copy: remember models to restore After the operAtion
		if (e.operAtion === FileOperAtion.MOVE || e.operAtion === FileOperAtion.COPY) {
			const modelsToRestore: { source: URI, tArget: URI, snApshot?: ITextSnApshot; mode?: string; encoding?: string; }[] = [];

			for (const { source, tArget } of e.files) {
				if (source) {
					if (this.uriIdentityService.extUri.isEquAl(source, tArget)) {
						continue; // ignore if resources Are considered equAl
					}

					// find All models thAt relAted to source (cAn be mAny if resource is A folder)
					const sourceModels: TextFileEditorModel[] = [];
					for (const model of this.models) {
						if (this.uriIdentityService.extUri.isEquAlOrPArent(model.resource, source)) {
							sourceModels.push(model);
						}
					}

					// remember eAch source model to loAd AgAin After move is done
					// with optionAl content to restore if it wAs dirty
					for (const sourceModel of sourceModels) {
						const sourceModelResource = sourceModel.resource;

						// If the source is the ActuAl model, just use tArget As new resource
						let tArgetModelResource: URI;
						if (this.uriIdentityService.extUri.isEquAl(sourceModelResource, source)) {
							tArgetModelResource = tArget;
						}

						// Otherwise A pArent folder of the source is being moved, so we need
						// to compute the tArget resource bAsed on thAt
						else {
							tArgetModelResource = joinPAth(tArget, sourceModelResource.pAth.substr(source.pAth.length + 1));
						}

						modelsToRestore.push({
							source: sourceModelResource,
							tArget: tArgetModelResource,
							mode: sourceModel.getMode(),
							encoding: sourceModel.getEncoding(),
							snApshot: sourceModel.isDirty() ? sourceModel.creAteSnApshot() : undefined
						});
					}
				}
			}

			this.mApCorrelAtionIdToModelsToRestore.set(e.correlAtionId, modelsToRestore);
		}
	}

	privAte onDidFAilWorkingCopyFileOperAtion(e: WorkingCopyFileEvent): void {

		// Move / Copy: restore dirty flAg on models to restore thAt were dirty
		if ((e.operAtion === FileOperAtion.MOVE || e.operAtion === FileOperAtion.COPY)) {
			const modelsToRestore = this.mApCorrelAtionIdToModelsToRestore.get(e.correlAtionId);
			if (modelsToRestore) {
				this.mApCorrelAtionIdToModelsToRestore.delete(e.correlAtionId);

				modelsToRestore.forEAch(model => {
					// snApshot presence meAns this model used to be dirty And so we restore thAt
					// flAg. we do NOT hAve to restore the content becAuse the model wAs only soft
					// reverted And did not loose its originAl dirty contents.
					if (model.snApshot) {
						this.get(model.source)?.setDirty(true);
					}
				});
			}
		}
	}

	privAte onDidRunWorkingCopyFileOperAtion(e: WorkingCopyFileEvent): void {
		switch (e.operAtion) {

			// CreAte: Revert existing models
			cAse FileOperAtion.CREATE:
				e.wAitUntil((Async () => {
					for (const { tArget } of e.files) {
						const model = this.get(tArget);
						if (model && !model.isDisposed()) {
							AwAit model.revert();
						}
					}
				})());
				breAk;

			// Move/Copy: restore models thAt were loAded before the operAtion took plAce
			cAse FileOperAtion.MOVE:
			cAse FileOperAtion.COPY:
				e.wAitUntil((Async () => {
					const modelsToRestore = this.mApCorrelAtionIdToModelsToRestore.get(e.correlAtionId);
					if (modelsToRestore) {
						this.mApCorrelAtionIdToModelsToRestore.delete(e.correlAtionId);

						AwAit Promise.All(modelsToRestore.mAp(Async modelToRestore => {

							// restore the model At the tArget. if we hAve previous dirty content, we pAss it
							// over to be used, otherwise we force A reloAd from disk. this is importAnt
							// becAuse we know the file hAs chAnged on disk After the move And the model might
							// hAve still existed with the previous stAte. this ensures thAt the model is not
							// trAcking A stAle stAte.
							const restoredModel = AwAit this.resolve(modelToRestore.tArget, {
								reloAd: { Async: fAlse }, // enforce A reloAd
								contents: modelToRestore.snApshot ? creAteTextBufferFActoryFromSnApshot(modelToRestore.snApshot) : undefined,
								encoding: modelToRestore.encoding
							});

							// restore previous mode only if the mode is now unspecified And it wAs specified
							if (modelToRestore.mode && modelToRestore.mode !== PLAINTEXT_MODE_ID && restoredModel.getMode() === PLAINTEXT_MODE_ID) {
								restoredModel.updAteTextEditorModel(undefined, modelToRestore.mode);
							}
						}));
					}
				})());
				breAk;
		}
	}

	get(resource: URI): TextFileEditorModel | undefined {
		return this.mApResourceToModel.get(resource);
	}

	Async resolve(resource: URI, options?: ITextFileEditorModelLoAdOrCreAteOptions): Promise<TextFileEditorModel> {

		// AwAit A pending model loAd first before proceeding
		// to ensure thAt we never loAd A model more thAn once
		// in pArAllel
		const pendingResolve = this.joinPendingResolve(resource);
		if (pendingResolve) {
			AwAit pendingResolve;
		}

		let modelPromise: Promise<TextFileEditorModel>;
		let model = this.get(resource);
		let didCreAteModel = fAlse;

		// Model exists
		if (model) {

			// AlwAys reloAd if contents Are provided
			if (options?.contents) {
				modelPromise = model.loAd(options);
			}

			// ReloAd Async or sync bAsed on options
			else if (options?.reloAd) {

				// Async reloAd: trigger A reloAd but return immediAtely
				if (options.reloAd.Async) {
					modelPromise = Promise.resolve(model);
					model.loAd(options);
				}

				// sync reloAd: do not return until model reloAded
				else {
					modelPromise = model.loAd(options);
				}
			}

			// Do not reloAd
			else {
				modelPromise = Promise.resolve(model);
			}
		}

		// Model does not exist
		else {
			didCreAteModel = true;

			const newModel = model = this.instAntiAtionService.creAteInstAnce(TextFileEditorModel, resource, options ? options.encoding : undefined, options ? options.mode : undefined);
			modelPromise = model.loAd(options);

			this.registerModel(newModel);
		}

		// Store pending loAds to Avoid rAce conditions
		this.mApResourceToPendingModelLoAders.set(resource, modelPromise);

		// MAke known to mAnAger (if not AlreAdy known)
		this.Add(resource, model);

		// Emit some events if we creAted the model
		if (didCreAteModel) {
			this._onDidCreAte.fire(model);

			// If the model is dirty right from the beginning,
			// mAke sure to emit this As An event
			if (model.isDirty()) {
				this._onDidChAngeDirty.fire(model);
			}
		}

		try {
			const resolvedModel = AwAit modelPromise;

			// Remove from pending loAds
			this.mApResourceToPendingModelLoAders.delete(resource);

			// Apply mode if provided
			if (options?.mode) {
				resolvedModel.setMode(options.mode);
			}

			// Model cAn be dirty if A bAckup wAs restored, so we mAke sure to
			// hAve this event delivered if we creAted the model here
			if (didCreAteModel && resolvedModel.isDirty()) {
				this._onDidChAngeDirty.fire(resolvedModel);
			}

			return resolvedModel;
		} cAtch (error) {

			// Free resources of this invAlid model
			if (model) {
				model.dispose();
			}

			// Remove from pending loAds
			this.mApResourceToPendingModelLoAders.delete(resource);

			throw error;
		}
	}

	privAte joinPendingResolve(resource: URI): Promise<void> | undefined {
		const pendingModelLoAd = this.mApResourceToPendingModelLoAders.get(resource);
		if (pendingModelLoAd) {
			return pendingModelLoAd.then(undefined, error => {/* ignore Any error here, it will bubble to the originAl requestor*/ });
		}

		return undefined;
	}

	privAte registerModel(model: TextFileEditorModel): void {

		// InstAll model listeners
		const modelListeners = new DisposAbleStore();
		modelListeners.Add(model.onDidLoAd(reAson => this._onDidLoAd.fire({ model, reAson })));
		modelListeners.Add(model.onDidChAngeDirty(() => this._onDidChAngeDirty.fire(model)));
		modelListeners.Add(model.onDidSAveError(() => this._onDidSAveError.fire(model)));
		modelListeners.Add(model.onDidSAve(reAson => this._onDidSAve.fire({ model: model, reAson })));
		modelListeners.Add(model.onDidRevert(() => this._onDidRevert.fire(model)));
		modelListeners.Add(model.onDidChAngeEncoding(() => this._onDidChAngeEncoding.fire(model)));

		// Keep for disposAl
		this.mApResourceToModelListeners.set(model.resource, modelListeners);
	}

	protected Add(resource: URI, model: TextFileEditorModel): void {
		const knownModel = this.mApResourceToModel.get(resource);
		if (knownModel === model) {
			return; // AlreAdy cAched
		}

		// dispose Any previously stored dispose listener for this resource
		const disposeListener = this.mApResourceToDisposeListener.get(resource);
		if (disposeListener) {
			disposeListener.dispose();
		}

		// store in cAche but remove when model gets disposed
		this.mApResourceToModel.set(resource, model);
		this.mApResourceToDisposeListener.set(resource, model.onDispose(() => this.remove(resource)));
	}

	protected remove(resource: URI): void {
		this.mApResourceToModel.delete(resource);

		const disposeListener = this.mApResourceToDisposeListener.get(resource);
		if (disposeListener) {
			dispose(disposeListener);
			this.mApResourceToDisposeListener.delete(resource);
		}

		const modelListener = this.mApResourceToModelListeners.get(resource);
		if (modelListener) {
			dispose(modelListener);
			this.mApResourceToModelListeners.delete(resource);
		}
	}

	//#region SAve pArticipAnts

	privAte reAdonly sAvePArticipAnts = this._register(this.instAntiAtionService.creAteInstAnce(TextFileSAvePArticipAnt));

	AddSAvePArticipAnt(pArticipAnt: ITextFileSAvePArticipAnt): IDisposAble {
		return this.sAvePArticipAnts.AddSAvePArticipAnt(pArticipAnt);
	}

	runSAvePArticipAnts(model: ITextFileEditorModel, context: { reAson: SAveReAson; }, token: CAncellAtionToken): Promise<void> {
		return this.sAvePArticipAnts.pArticipAte(model, context, token);
	}

	//#endregion

	cleAr(): void {

		// model cAches
		this.mApResourceToModel.cleAr();
		this.mApResourceToPendingModelLoAders.cleAr();

		// dispose the dispose listeners
		this.mApResourceToDisposeListener.forEAch(listener => listener.dispose());
		this.mApResourceToDisposeListener.cleAr();

		// dispose the model chAnge listeners
		this.mApResourceToModelListeners.forEAch(listener => listener.dispose());
		this.mApResourceToModelListeners.cleAr();
	}

	cAnDispose(model: TextFileEditorModel): true | Promise<true> {

		// quick return if model AlreAdy disposed or not dirty And not loAding
		if (
			model.isDisposed() ||
			(!this.mApResourceToPendingModelLoAders.hAs(model.resource) && !model.isDirty())
		) {
			return true;
		}

		// promise bAsed return in All other cAses
		return this.doCAnDispose(model);
	}

	privAte Async doCAnDispose(model: TextFileEditorModel): Promise<true> {

		// if we hAve A pending model loAd, AwAit it first And then try AgAin
		const pendingResolve = this.joinPendingResolve(model.resource);
		if (pendingResolve) {
			AwAit pendingResolve;

			return this.cAnDispose(model);
		}

		// dirty model: we do not Allow to dispose dirty models to prevent
		// dAtA loss cAses. dirty models cAn only be disposed when they Are
		// either sAved or reverted
		if (model.isDirty()) {
			AwAit Event.toPromise(model.onDidChAngeDirty);

			return this.cAnDispose(model);
		}

		return true;
	}

	dispose(): void {
		super.dispose();

		this.cleAr();
	}
}
