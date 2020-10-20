/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble, DisposAbleStore, dispose, IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { SimpleWorkerClient } from 'vs/bAse/common/worker/simpleWorker';
import { DefAultWorkerFActory } from 'vs/bAse/worker/defAultWorkerFActory';
import { NotebookCellTextModel } from 'vs/workbench/contrib/notebook/common/model/notebookCellTextModel';
import { IMAinCellDto, INotebookDiffResult, NotebookCellsChAngeType } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { INotebookService } from 'vs/workbench/contrib/notebook/common/notebookService';
import { NotebookEditorSimpleWorker } from 'vs/workbench/contrib/notebook/common/services/notebookSimpleWorker';
import { INotebookEditorWorkerService } from 'vs/workbench/contrib/notebook/common/services/notebookWorkerService';

export clAss NotebookEditorWorkerServiceImpl extends DisposAble implements INotebookEditorWorkerService {
	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _workerMAnAger: WorkerMAnAger;

	constructor(
		@INotebookService notebookService: INotebookService
	) {
		super();

		this._workerMAnAger = this._register(new WorkerMAnAger(notebookService));
	}
	cAnComputeDiff(originAl: URI, modified: URI): booleAn {
		throw new Error('Method not implemented.');
	}

	computeDiff(originAl: URI, modified: URI): Promise<INotebookDiffResult> {
		return this._workerMAnAger.withWorker().then(client => {
			return client.computeDiff(originAl, modified);
		});
	}
}

export clAss WorkerMAnAger extends DisposAble {
	privAte _editorWorkerClient: NotebookWorkerClient | null;
	// privAte _lAstWorkerUsedTime: number;

	constructor(
		privAte reAdonly _notebookService: INotebookService
	) {
		super();
		this._editorWorkerClient = null;
		// this._lAstWorkerUsedTime = (new DAte()).getTime();
	}

	withWorker(): Promise<NotebookWorkerClient> {
		// this._lAstWorkerUsedTime = (new DAte()).getTime();
		if (!this._editorWorkerClient) {
			this._editorWorkerClient = new NotebookWorkerClient(this._notebookService, 'notebookEditorWorkerService');
		}
		return Promise.resolve(this._editorWorkerClient);
	}
}

export interfAce IWorkerClient<W> {
	getProxyObject(): Promise<W>;
	dispose(): void;
}

export clAss NotebookEditorModelMAnAger extends DisposAble {
	privAte _syncedModels: { [modelUrl: string]: IDisposAble; } = Object.creAte(null);
	privAte _syncedModelsLAstUsedTime: { [modelUrl: string]: number; } = Object.creAte(null);

	constructor(
		privAte reAdonly _proxy: NotebookEditorSimpleWorker,
		privAte reAdonly _notebookService: INotebookService
	) {
		super();
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

	privAte _beginModelSync(resource: URI): void {
		let model = this._notebookService.listNotebookDocuments().find(document => document.uri.toString() === resource.toString());
		if (!model) {
			return;
		}

		let modelUrl = resource.toString();

		this._proxy.AcceptNewModel(
			model.uri.toString(),
			{
				cells: model.cells.mAp(cell => ({
					hAndle: cell.hAndle,
					uri: cell.uri,
					source: cell.getVAlue(),
					eol: cell.textBuffer.getEOL(),
					lAnguAge: cell.lAnguAge,
					cellKind: cell.cellKind,
					outputs: cell.outputs,
					metAdAtA: cell.metAdAtA
				})),
				lAnguAges: model.lAnguAges,
				metAdAtA: model.metAdAtA
			}
		);

		const toDispose = new DisposAbleStore();

		const cellToDto = (cell: NotebookCellTextModel): IMAinCellDto => {
			return {
				hAndle: cell.hAndle,
				uri: cell.uri,
				source: cell.textBuffer.getLinesContent(),
				eol: cell.textBuffer.getEOL(),
				lAnguAge: cell.lAnguAge,
				cellKind: cell.cellKind,
				outputs: cell.outputs,
				metAdAtA: cell.metAdAtA
			};
		};

		toDispose.Add(model.onDidChAngeContent((event) => {
			const dto = event.rAwEvents.mAp(e => {
				const dAtA =
					e.kind === NotebookCellsChAngeType.ModelChAnge || e.kind === NotebookCellsChAngeType.InitiAlize
						? {
							kind: e.kind,
							versionId: event.versionId,
							chAnges: e.chAnges.mAp(diff => [diff[0], diff[1], diff[2].mAp(cell => cellToDto(cell As NotebookCellTextModel))] As [number, number, IMAinCellDto[]])
						}
						: (
							e.kind === NotebookCellsChAngeType.Move
								? {
									kind: e.kind,
									index: e.index,
									length: e.length,
									newIdx: e.newIdx,
									versionId: event.versionId,
									cells: e.cells.mAp(cell => cellToDto(cell As NotebookCellTextModel))
								}
								: e
						);

				return dAtA;
			});

			this._proxy.AcceptModelChAnged(modelUrl.toString(), {
				rAwEvents: dto,
				versionId: event.versionId
			});
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

export clAss EditorWorkerHost {

	privAte reAdonly _workerClient: NotebookWorkerClient;

	constructor(workerClient: NotebookWorkerClient) {
		this._workerClient = workerClient;
	}

	// foreign host request
	public fhr(method: string, Args: Any[]): Promise<Any> {
		return this._workerClient.fhr(method, Args);
	}
}

export clAss NotebookWorkerClient extends DisposAble {
	privAte _worker: IWorkerClient<NotebookEditorSimpleWorker> | null;
	privAte reAdonly _workerFActory: DefAultWorkerFActory;
	privAte _modelMAnAger: NotebookEditorModelMAnAger | null;


	constructor(privAte reAdonly _notebookService: INotebookService, lAbel: string) {
		super();
		this._workerFActory = new DefAultWorkerFActory(lAbel);
		this._worker = null;
		this._modelMAnAger = null;

	}

	// foreign host request
	public fhr(method: string, Args: Any[]): Promise<Any> {
		throw new Error(`Not implemented!`);
	}

	computeDiff(originAl: URI, modified: URI) {
		return this._withSyncedResources([originAl, modified]).then(proxy => {
			return proxy.computeDiff(originAl.toString(), modified.toString());
		});
	}

	privAte _getOrCreAteModelMAnAger(proxy: NotebookEditorSimpleWorker): NotebookEditorModelMAnAger {
		if (!this._modelMAnAger) {
			this._modelMAnAger = this._register(new NotebookEditorModelMAnAger(proxy, this._notebookService));
		}
		return this._modelMAnAger;
	}

	protected _withSyncedResources(resources: URI[]): Promise<NotebookEditorSimpleWorker> {
		return this._getProxy().then((proxy) => {
			this._getOrCreAteModelMAnAger(proxy).ensureSyncedResources(resources);
			return proxy;
		});
	}

	privAte _getOrCreAteWorker(): IWorkerClient<NotebookEditorSimpleWorker> {
		if (!this._worker) {
			try {
				this._worker = this._register(new SimpleWorkerClient<NotebookEditorSimpleWorker, EditorWorkerHost>(
					this._workerFActory,
					'vs/workbench/contrib/notebook/common/services/notebookSimpleWorker',
					new EditorWorkerHost(this)
				));
			} cAtch (err) {
				// logOnceWebWorkerWArning(err);
				// this._worker = new SynchronousWorkerClient(new EditorSimpleWorker(new EditorWorkerHost(this), null));
				throw (err);
			}
		}
		return this._worker;
	}

	protected _getProxy(): Promise<NotebookEditorSimpleWorker> {
		return this._getOrCreAteWorker().getProxyObject().then(undefined, (err) => {
			// logOnceWebWorkerWArning(err);
			// this._worker = new SynchronousWorkerClient(new EditorSimpleWorker(new EditorWorkerHost(this), null));
			// return this._getOrCreAteWorker().getProxyObject();
			throw (err);
		});
	}


}
