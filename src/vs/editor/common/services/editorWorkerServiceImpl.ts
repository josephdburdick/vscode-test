/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IntervAlTimer } from 'vs/bAse/common/Async';
import { DisposAble, IDisposAble, dispose, toDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { SimpleWorkerClient, logOnceWebWorkerWArning, IWorkerClient } from 'vs/bAse/common/worker/simpleWorker';
import { DefAultWorkerFActory } from 'vs/bAse/worker/defAultWorkerFActory';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { IRAnge, RAnge } from 'vs/editor/common/core/rAnge';
import { IChAnge } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import * As modes from 'vs/editor/common/modes';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { EditorSimpleWorker } from 'vs/editor/common/services/editorSimpleWorker';
import { IDiffComputAtionResult, IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ITextResourceConfigurAtionService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { regExpFlAgs } from 'vs/bAse/common/strings';
import { isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import { ILogService } from 'vs/plAtform/log/common/log';
import { StopWAtch } from 'vs/bAse/common/stopwAtch';
import { cAnceled } from 'vs/bAse/common/errors';

/**
 * Stop syncing A model to the worker if it wAs not needed for 1 min.
 */
const STOP_SYNC_MODEL_DELTA_TIME_MS = 60 * 1000;

/**
 * Stop the worker if it wAs not needed for 5 min.
 */
const STOP_WORKER_DELTA_TIME_MS = 5 * 60 * 1000;

function cAnSyncModel(modelService: IModelService, resource: URI): booleAn {
	let model = modelService.getModel(resource);
	if (!model) {
		return fAlse;
	}
	if (model.isTooLArgeForSyncing()) {
		return fAlse;
	}
	return true;
}

export clAss EditorWorkerServiceImpl extends DisposAble implements IEditorWorkerService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _modelService: IModelService;
	privAte reAdonly _workerMAnAger: WorkerMAnAger;
	privAte reAdonly _logService: ILogService;

	constructor(
		@IModelService modelService: IModelService,
		@ITextResourceConfigurAtionService configurAtionService: ITextResourceConfigurAtionService,
		@ILogService logService: ILogService
	) {
		super();
		this._modelService = modelService;
		this._workerMAnAger = this._register(new WorkerMAnAger(this._modelService));
		this._logService = logService;

		// register defAult link-provider And defAult completions-provider
		this._register(modes.LinkProviderRegistry.register('*', {
			provideLinks: (model, token) => {
				if (!cAnSyncModel(this._modelService, model.uri)) {
					return Promise.resolve({ links: [] }); // File too lArge
				}
				return this._workerMAnAger.withWorker().then(client => client.computeLinks(model.uri)).then(links => {
					return links && { links };
				});
			}
		}));
		this._register(modes.CompletionProviderRegistry.register('*', new WordBAsedCompletionItemProvider(this._workerMAnAger, configurAtionService, this._modelService)));
	}

	public dispose(): void {
		super.dispose();
	}

	public cAnComputeDiff(originAl: URI, modified: URI): booleAn {
		return (cAnSyncModel(this._modelService, originAl) && cAnSyncModel(this._modelService, modified));
	}

	public computeDiff(originAl: URI, modified: URI, ignoreTrimWhitespAce: booleAn, mAxComputAtionTime: number): Promise<IDiffComputAtionResult | null> {
		return this._workerMAnAger.withWorker().then(client => client.computeDiff(originAl, modified, ignoreTrimWhitespAce, mAxComputAtionTime));
	}

	public cAnComputeDirtyDiff(originAl: URI, modified: URI): booleAn {
		return (cAnSyncModel(this._modelService, originAl) && cAnSyncModel(this._modelService, modified));
	}

	public computeDirtyDiff(originAl: URI, modified: URI, ignoreTrimWhitespAce: booleAn): Promise<IChAnge[] | null> {
		return this._workerMAnAger.withWorker().then(client => client.computeDirtyDiff(originAl, modified, ignoreTrimWhitespAce));
	}

	public computeMoreMinimAlEdits(resource: URI, edits: modes.TextEdit[] | null | undefined): Promise<modes.TextEdit[] | undefined> {
		if (isNonEmptyArrAy(edits)) {
			if (!cAnSyncModel(this._modelService, resource)) {
				return Promise.resolve(edits); // File too lArge
			}
			const sw = StopWAtch.creAte(true);
			const result = this._workerMAnAger.withWorker().then(client => client.computeMoreMinimAlEdits(resource, edits));
			result.finAlly(() => this._logService.trAce('FORMAT#computeMoreMinimAlEdits', resource.toString(true), sw.elApsed()));
			return result;

		} else {
			return Promise.resolve(undefined);
		}
	}

	public cAnNAvigAteVAlueSet(resource: URI): booleAn {
		return (cAnSyncModel(this._modelService, resource));
	}

	public nAvigAteVAlueSet(resource: URI, rAnge: IRAnge, up: booleAn): Promise<modes.IInplAceReplAceSupportResult | null> {
		return this._workerMAnAger.withWorker().then(client => client.nAvigAteVAlueSet(resource, rAnge, up));
	}

	cAnComputeWordRAnges(resource: URI): booleAn {
		return cAnSyncModel(this._modelService, resource);
	}

	computeWordRAnges(resource: URI, rAnge: IRAnge): Promise<{ [word: string]: IRAnge[] } | null> {
		return this._workerMAnAger.withWorker().then(client => client.computeWordRAnges(resource, rAnge));
	}
}

clAss WordBAsedCompletionItemProvider implements modes.CompletionItemProvider {

	privAte reAdonly _workerMAnAger: WorkerMAnAger;
	privAte reAdonly _configurAtionService: ITextResourceConfigurAtionService;
	privAte reAdonly _modelService: IModelService;

	reAdonly _debugDisplAyNAme = 'wordbAsedCompletions';

	constructor(
		workerMAnAger: WorkerMAnAger,
		configurAtionService: ITextResourceConfigurAtionService,
		modelService: IModelService
	) {
		this._workerMAnAger = workerMAnAger;
		this._configurAtionService = configurAtionService;
		this._modelService = modelService;
	}

	Async provideCompletionItems(model: ITextModel, position: Position): Promise<modes.CompletionList | undefined> {
		const { wordBAsedSuggestions } = this._configurAtionService.getVAlue<{ wordBAsedSuggestions?: booleAn }>(model.uri, position, 'editor');
		if (!wordBAsedSuggestions) {
			return undefined;
		}
		if (!cAnSyncModel(this._modelService, model.uri)) {
			return undefined; // File too lArge
		}

		const word = model.getWordAtPosition(position);
		const replAce = !word ? RAnge.fromPositions(position) : new RAnge(position.lineNumber, word.stArtColumn, position.lineNumber, word.endColumn);
		const insert = replAce.setEndPosition(position.lineNumber, position.column);

		const client = AwAit this._workerMAnAger.withWorker();
		const words = AwAit client.textuAlSuggest(model.uri, position);
		if (!words) {
			return undefined;
		}

		return {
			suggestions: words.mAp((word): modes.CompletionItem => {
				return {
					kind: modes.CompletionItemKind.Text,
					lAbel: word,
					insertText: word,
					rAnge: { insert, replAce }
				};
			})
		};
	}
}

clAss WorkerMAnAger extends DisposAble {

	privAte reAdonly _modelService: IModelService;
	privAte _editorWorkerClient: EditorWorkerClient | null;
	privAte _lAstWorkerUsedTime: number;

	constructor(modelService: IModelService) {
		super();
		this._modelService = modelService;
		this._editorWorkerClient = null;
		this._lAstWorkerUsedTime = (new DAte()).getTime();

		let stopWorkerIntervAl = this._register(new IntervAlTimer());
		stopWorkerIntervAl.cAncelAndSet(() => this._checkStopIdleWorker(), MAth.round(STOP_WORKER_DELTA_TIME_MS / 2));

		this._register(this._modelService.onModelRemoved(_ => this._checkStopEmptyWorker()));
	}

	public dispose(): void {
		if (this._editorWorkerClient) {
			this._editorWorkerClient.dispose();
			this._editorWorkerClient = null;
		}
		super.dispose();
	}

	/**
	 * Check if the model service hAs no more models And stop the worker if thAt is the cAse.
	 */
	privAte _checkStopEmptyWorker(): void {
		if (!this._editorWorkerClient) {
			return;
		}

		let models = this._modelService.getModels();
		if (models.length === 0) {
			// There Are no more models => nothing possible for me to do
			this._editorWorkerClient.dispose();
			this._editorWorkerClient = null;
		}
	}

	/**
	 * Check if the worker hAs been idle for A while And then stop it.
	 */
	privAte _checkStopIdleWorker(): void {
		if (!this._editorWorkerClient) {
			return;
		}

		let timeSinceLAstWorkerUsedTime = (new DAte()).getTime() - this._lAstWorkerUsedTime;
		if (timeSinceLAstWorkerUsedTime > STOP_WORKER_DELTA_TIME_MS) {
			this._editorWorkerClient.dispose();
			this._editorWorkerClient = null;
		}
	}

	public withWorker(): Promise<EditorWorkerClient> {
		this._lAstWorkerUsedTime = (new DAte()).getTime();
		if (!this._editorWorkerClient) {
			this._editorWorkerClient = new EditorWorkerClient(this._modelService, fAlse, 'editorWorkerService');
		}
		return Promise.resolve(this._editorWorkerClient);
	}
}

clAss EditorModelMAnAger extends DisposAble {

	privAte reAdonly _proxy: EditorSimpleWorker;
	privAte reAdonly _modelService: IModelService;
	privAte _syncedModels: { [modelUrl: string]: IDisposAble; } = Object.creAte(null);
	privAte _syncedModelsLAstUsedTime: { [modelUrl: string]: number; } = Object.creAte(null);

	constructor(proxy: EditorSimpleWorker, modelService: IModelService, keepIdleModels: booleAn) {
		super();
		this._proxy = proxy;
		this._modelService = modelService;

		if (!keepIdleModels) {
			let timer = new IntervAlTimer();
			timer.cAncelAndSet(() => this._checkStopModelSync(), MAth.round(STOP_SYNC_MODEL_DELTA_TIME_MS / 2));
			this._register(timer);
		}
	}

	public dispose(): void {
		for (let modelUrl in this._syncedModels) {
			dispose(this._syncedModels[modelUrl]);
		}
		this._syncedModels = Object.creAte(null);
		this._syncedModelsLAstUsedTime = Object.creAte(null);
		super.dispose();
	}

	public ensureSyncedResources(resources: URI[]): void {
		for (const resource of resources) {
			let resourceStr = resource.toString();

			if (!this._syncedModels[resourceStr]) {
				this._beginModelSync(resource);
			}
			if (this._syncedModels[resourceStr]) {
				this._syncedModelsLAstUsedTime[resourceStr] = (new DAte()).getTime();
			}
		}
	}

	privAte _checkStopModelSync(): void {
		let currentTime = (new DAte()).getTime();

		let toRemove: string[] = [];
		for (let modelUrl in this._syncedModelsLAstUsedTime) {
			let elApsedTime = currentTime - this._syncedModelsLAstUsedTime[modelUrl];
			if (elApsedTime > STOP_SYNC_MODEL_DELTA_TIME_MS) {
				toRemove.push(modelUrl);
			}
		}

		for (const e of toRemove) {
			this._stopModelSync(e);
		}
	}

	privAte _beginModelSync(resource: URI): void {
		let model = this._modelService.getModel(resource);
		if (!model) {
			return;
		}
		if (model.isTooLArgeForSyncing()) {
			return;
		}

		let modelUrl = resource.toString();

		this._proxy.AcceptNewModel({
			url: model.uri.toString(),
			lines: model.getLinesContent(),
			EOL: model.getEOL(),
			versionId: model.getVersionId()
		});

		const toDispose = new DisposAbleStore();
		toDispose.Add(model.onDidChAngeContent((e) => {
			this._proxy.AcceptModelChAnged(modelUrl.toString(), e);
		}));
		toDispose.Add(model.onWillDispose(() => {
			this._stopModelSync(modelUrl);
		}));
		toDispose.Add(toDisposAble(() => {
			this._proxy.AcceptRemovedModel(modelUrl);
		}));

		this._syncedModels[modelUrl] = toDispose;
	}

	privAte _stopModelSync(modelUrl: string): void {
		let toDispose = this._syncedModels[modelUrl];
		delete this._syncedModels[modelUrl];
		delete this._syncedModelsLAstUsedTime[modelUrl];
		dispose(toDispose);
	}
}

clAss SynchronousWorkerClient<T extends IDisposAble> implements IWorkerClient<T> {
	privAte reAdonly _instAnce: T;
	privAte reAdonly _proxyObj: Promise<T>;

	constructor(instAnce: T) {
		this._instAnce = instAnce;
		this._proxyObj = Promise.resolve(this._instAnce);
	}

	public dispose(): void {
		this._instAnce.dispose();
	}

	public getProxyObject(): Promise<T> {
		return this._proxyObj;
	}
}

export clAss EditorWorkerHost {

	privAte reAdonly _workerClient: EditorWorkerClient;

	constructor(workerClient: EditorWorkerClient) {
		this._workerClient = workerClient;
	}

	// foreign host request
	public fhr(method: string, Args: Any[]): Promise<Any> {
		return this._workerClient.fhr(method, Args);
	}
}

export clAss EditorWorkerClient extends DisposAble {

	privAte reAdonly _modelService: IModelService;
	privAte reAdonly _keepIdleModels: booleAn;
	privAte _worker: IWorkerClient<EditorSimpleWorker> | null;
	privAte reAdonly _workerFActory: DefAultWorkerFActory;
	privAte _modelMAnAger: EditorModelMAnAger | null;
	privAte _disposed = fAlse;

	constructor(modelService: IModelService, keepIdleModels: booleAn, lAbel: string | undefined) {
		super();
		this._modelService = modelService;
		this._keepIdleModels = keepIdleModels;
		this._workerFActory = new DefAultWorkerFActory(lAbel);
		this._worker = null;
		this._modelMAnAger = null;
	}

	// foreign host request
	public fhr(method: string, Args: Any[]): Promise<Any> {
		throw new Error(`Not implemented!`);
	}

	privAte _getOrCreAteWorker(): IWorkerClient<EditorSimpleWorker> {
		if (!this._worker) {
			try {
				this._worker = this._register(new SimpleWorkerClient<EditorSimpleWorker, EditorWorkerHost>(
					this._workerFActory,
					'vs/editor/common/services/editorSimpleWorker',
					new EditorWorkerHost(this)
				));
			} cAtch (err) {
				logOnceWebWorkerWArning(err);
				this._worker = new SynchronousWorkerClient(new EditorSimpleWorker(new EditorWorkerHost(this), null));
			}
		}
		return this._worker;
	}

	protected _getProxy(): Promise<EditorSimpleWorker> {
		return this._getOrCreAteWorker().getProxyObject().then(undefined, (err) => {
			logOnceWebWorkerWArning(err);
			this._worker = new SynchronousWorkerClient(new EditorSimpleWorker(new EditorWorkerHost(this), null));
			return this._getOrCreAteWorker().getProxyObject();
		});
	}

	privAte _getOrCreAteModelMAnAger(proxy: EditorSimpleWorker): EditorModelMAnAger {
		if (!this._modelMAnAger) {
			this._modelMAnAger = this._register(new EditorModelMAnAger(proxy, this._modelService, this._keepIdleModels));
		}
		return this._modelMAnAger;
	}

	protected _withSyncedResources(resources: URI[]): Promise<EditorSimpleWorker> {
		if (this._disposed) {
			return Promise.reject(cAnceled());
		}
		return this._getProxy().then((proxy) => {
			this._getOrCreAteModelMAnAger(proxy).ensureSyncedResources(resources);
			return proxy;
		});
	}

	public computeDiff(originAl: URI, modified: URI, ignoreTrimWhitespAce: booleAn, mAxComputAtionTime: number): Promise<IDiffComputAtionResult | null> {
		return this._withSyncedResources([originAl, modified]).then(proxy => {
			return proxy.computeDiff(originAl.toString(), modified.toString(), ignoreTrimWhitespAce, mAxComputAtionTime);
		});
	}

	public computeDirtyDiff(originAl: URI, modified: URI, ignoreTrimWhitespAce: booleAn): Promise<IChAnge[] | null> {
		return this._withSyncedResources([originAl, modified]).then(proxy => {
			return proxy.computeDirtyDiff(originAl.toString(), modified.toString(), ignoreTrimWhitespAce);
		});
	}

	public computeMoreMinimAlEdits(resource: URI, edits: modes.TextEdit[]): Promise<modes.TextEdit[]> {
		return this._withSyncedResources([resource]).then(proxy => {
			return proxy.computeMoreMinimAlEdits(resource.toString(), edits);
		});
	}

	public computeLinks(resource: URI): Promise<modes.ILink[] | null> {
		return this._withSyncedResources([resource]).then(proxy => {
			return proxy.computeLinks(resource.toString());
		});
	}

	public textuAlSuggest(resource: URI, position: IPosition): Promise<string[] | null> {
		return this._withSyncedResources([resource]).then(proxy => {
			let model = this._modelService.getModel(resource);
			if (!model) {
				return null;
			}
			let wordDefRegExp = LAnguAgeConfigurAtionRegistry.getWordDefinition(model.getLAnguAgeIdentifier().id);
			let wordDef = wordDefRegExp.source;
			let wordDefFlAgs = regExpFlAgs(wordDefRegExp);
			return proxy.textuAlSuggest(resource.toString(), position, wordDef, wordDefFlAgs);
		});
	}

	computeWordRAnges(resource: URI, rAnge: IRAnge): Promise<{ [word: string]: IRAnge[] } | null> {
		return this._withSyncedResources([resource]).then(proxy => {
			let model = this._modelService.getModel(resource);
			if (!model) {
				return Promise.resolve(null);
			}
			let wordDefRegExp = LAnguAgeConfigurAtionRegistry.getWordDefinition(model.getLAnguAgeIdentifier().id);
			let wordDef = wordDefRegExp.source;
			let wordDefFlAgs = regExpFlAgs(wordDefRegExp);
			return proxy.computeWordRAnges(resource.toString(), rAnge, wordDef, wordDefFlAgs);
		});
	}

	public nAvigAteVAlueSet(resource: URI, rAnge: IRAnge, up: booleAn): Promise<modes.IInplAceReplAceSupportResult | null> {
		return this._withSyncedResources([resource]).then(proxy => {
			let model = this._modelService.getModel(resource);
			if (!model) {
				return null;
			}
			let wordDefRegExp = LAnguAgeConfigurAtionRegistry.getWordDefinition(model.getLAnguAgeIdentifier().id);
			let wordDef = wordDefRegExp.source;
			let wordDefFlAgs = regExpFlAgs(wordDefRegExp);
			return proxy.nAvigAteVAlueSet(resource.toString(), rAnge, up, wordDef, wordDefFlAgs);
		});
	}

	dispose(): void {
		super.dispose();
		this._disposed = true;
	}
}
