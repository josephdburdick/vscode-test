/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle, DisposaBleStore, dispose, IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { SimpleWorkerClient } from 'vs/Base/common/worker/simpleWorker';
import { DefaultWorkerFactory } from 'vs/Base/worker/defaultWorkerFactory';
import { NoteBookCellTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookCellTextModel';
import { IMainCellDto, INoteBookDiffResult, NoteBookCellsChangeType } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { INoteBookService } from 'vs/workBench/contriB/noteBook/common/noteBookService';
import { NoteBookEditorSimpleWorker } from 'vs/workBench/contriB/noteBook/common/services/noteBookSimpleWorker';
import { INoteBookEditorWorkerService } from 'vs/workBench/contriB/noteBook/common/services/noteBookWorkerService';

export class NoteBookEditorWorkerServiceImpl extends DisposaBle implements INoteBookEditorWorkerService {
	declare readonly _serviceBrand: undefined;

	private readonly _workerManager: WorkerManager;

	constructor(
		@INoteBookService noteBookService: INoteBookService
	) {
		super();

		this._workerManager = this._register(new WorkerManager(noteBookService));
	}
	canComputeDiff(original: URI, modified: URI): Boolean {
		throw new Error('Method not implemented.');
	}

	computeDiff(original: URI, modified: URI): Promise<INoteBookDiffResult> {
		return this._workerManager.withWorker().then(client => {
			return client.computeDiff(original, modified);
		});
	}
}

export class WorkerManager extends DisposaBle {
	private _editorWorkerClient: NoteBookWorkerClient | null;
	// private _lastWorkerUsedTime: numBer;

	constructor(
		private readonly _noteBookService: INoteBookService
	) {
		super();
		this._editorWorkerClient = null;
		// this._lastWorkerUsedTime = (new Date()).getTime();
	}

	withWorker(): Promise<NoteBookWorkerClient> {
		// this._lastWorkerUsedTime = (new Date()).getTime();
		if (!this._editorWorkerClient) {
			this._editorWorkerClient = new NoteBookWorkerClient(this._noteBookService, 'noteBookEditorWorkerService');
		}
		return Promise.resolve(this._editorWorkerClient);
	}
}

export interface IWorkerClient<W> {
	getProxyOBject(): Promise<W>;
	dispose(): void;
}

export class NoteBookEditorModelManager extends DisposaBle {
	private _syncedModels: { [modelUrl: string]: IDisposaBle; } = OBject.create(null);
	private _syncedModelsLastUsedTime: { [modelUrl: string]: numBer; } = OBject.create(null);

	constructor(
		private readonly _proxy: NoteBookEditorSimpleWorker,
		private readonly _noteBookService: INoteBookService
	) {
		super();
	}

	puBlic ensureSyncedResources(resources: URI[]): void {
		for (const resource of resources) {
			let resourceStr = resource.toString();

			if (!this._syncedModels[resourceStr]) {
				this._BeginModelSync(resource);
			}
			if (this._syncedModels[resourceStr]) {
				this._syncedModelsLastUsedTime[resourceStr] = (new Date()).getTime();
			}
		}
	}

	private _BeginModelSync(resource: URI): void {
		let model = this._noteBookService.listNoteBookDocuments().find(document => document.uri.toString() === resource.toString());
		if (!model) {
			return;
		}

		let modelUrl = resource.toString();

		this._proxy.acceptNewModel(
			model.uri.toString(),
			{
				cells: model.cells.map(cell => ({
					handle: cell.handle,
					uri: cell.uri,
					source: cell.getValue(),
					eol: cell.textBuffer.getEOL(),
					language: cell.language,
					cellKind: cell.cellKind,
					outputs: cell.outputs,
					metadata: cell.metadata
				})),
				languages: model.languages,
				metadata: model.metadata
			}
		);

		const toDispose = new DisposaBleStore();

		const cellToDto = (cell: NoteBookCellTextModel): IMainCellDto => {
			return {
				handle: cell.handle,
				uri: cell.uri,
				source: cell.textBuffer.getLinesContent(),
				eol: cell.textBuffer.getEOL(),
				language: cell.language,
				cellKind: cell.cellKind,
				outputs: cell.outputs,
				metadata: cell.metadata
			};
		};

		toDispose.add(model.onDidChangeContent((event) => {
			const dto = event.rawEvents.map(e => {
				const data =
					e.kind === NoteBookCellsChangeType.ModelChange || e.kind === NoteBookCellsChangeType.Initialize
						? {
							kind: e.kind,
							versionId: event.versionId,
							changes: e.changes.map(diff => [diff[0], diff[1], diff[2].map(cell => cellToDto(cell as NoteBookCellTextModel))] as [numBer, numBer, IMainCellDto[]])
						}
						: (
							e.kind === NoteBookCellsChangeType.Move
								? {
									kind: e.kind,
									index: e.index,
									length: e.length,
									newIdx: e.newIdx,
									versionId: event.versionId,
									cells: e.cells.map(cell => cellToDto(cell as NoteBookCellTextModel))
								}
								: e
						);

				return data;
			});

			this._proxy.acceptModelChanged(modelUrl.toString(), {
				rawEvents: dto,
				versionId: event.versionId
			});
		}));

		toDispose.add(model.onWillDispose(() => {
			this._stopModelSync(modelUrl);
		}));
		toDispose.add(toDisposaBle(() => {
			this._proxy.acceptRemovedModel(modelUrl);
		}));

		this._syncedModels[modelUrl] = toDispose;
	}

	private _stopModelSync(modelUrl: string): void {
		let toDispose = this._syncedModels[modelUrl];
		delete this._syncedModels[modelUrl];
		delete this._syncedModelsLastUsedTime[modelUrl];
		dispose(toDispose);
	}
}

export class EditorWorkerHost {

	private readonly _workerClient: NoteBookWorkerClient;

	constructor(workerClient: NoteBookWorkerClient) {
		this._workerClient = workerClient;
	}

	// foreign host request
	puBlic fhr(method: string, args: any[]): Promise<any> {
		return this._workerClient.fhr(method, args);
	}
}

export class NoteBookWorkerClient extends DisposaBle {
	private _worker: IWorkerClient<NoteBookEditorSimpleWorker> | null;
	private readonly _workerFactory: DefaultWorkerFactory;
	private _modelManager: NoteBookEditorModelManager | null;


	constructor(private readonly _noteBookService: INoteBookService, laBel: string) {
		super();
		this._workerFactory = new DefaultWorkerFactory(laBel);
		this._worker = null;
		this._modelManager = null;

	}

	// foreign host request
	puBlic fhr(method: string, args: any[]): Promise<any> {
		throw new Error(`Not implemented!`);
	}

	computeDiff(original: URI, modified: URI) {
		return this._withSyncedResources([original, modified]).then(proxy => {
			return proxy.computeDiff(original.toString(), modified.toString());
		});
	}

	private _getOrCreateModelManager(proxy: NoteBookEditorSimpleWorker): NoteBookEditorModelManager {
		if (!this._modelManager) {
			this._modelManager = this._register(new NoteBookEditorModelManager(proxy, this._noteBookService));
		}
		return this._modelManager;
	}

	protected _withSyncedResources(resources: URI[]): Promise<NoteBookEditorSimpleWorker> {
		return this._getProxy().then((proxy) => {
			this._getOrCreateModelManager(proxy).ensureSyncedResources(resources);
			return proxy;
		});
	}

	private _getOrCreateWorker(): IWorkerClient<NoteBookEditorSimpleWorker> {
		if (!this._worker) {
			try {
				this._worker = this._register(new SimpleWorkerClient<NoteBookEditorSimpleWorker, EditorWorkerHost>(
					this._workerFactory,
					'vs/workBench/contriB/noteBook/common/services/noteBookSimpleWorker',
					new EditorWorkerHost(this)
				));
			} catch (err) {
				// logOnceWeBWorkerWarning(err);
				// this._worker = new SynchronousWorkerClient(new EditorSimpleWorker(new EditorWorkerHost(this), null));
				throw (err);
			}
		}
		return this._worker;
	}

	protected _getProxy(): Promise<NoteBookEditorSimpleWorker> {
		return this._getOrCreateWorker().getProxyOBject().then(undefined, (err) => {
			// logOnceWeBWorkerWarning(err);
			// this._worker = new SynchronousWorkerClient(new EditorSimpleWorker(new EditorWorkerHost(this), null));
			// return this._getOrCreateWorker().getProxyOBject();
			throw (err);
		});
	}


}
