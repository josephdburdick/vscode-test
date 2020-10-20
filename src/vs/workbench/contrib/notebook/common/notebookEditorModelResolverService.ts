/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor, IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { URI } from 'vs/bAse/common/uri';
import { INotebookEditorModel } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { NotebookEditorModel } from 'vs/workbench/contrib/notebook/common/notebookEditorModel';
import { DisposAbleStore, IDisposAble, IReference, ReferenceCollection } from 'vs/bAse/common/lifecycle';
import { INotebookService } from 'vs/workbench/contrib/notebook/common/notebookService';
import { ILogService } from 'vs/plAtform/log/common/log';
import { Event } from 'vs/bAse/common/event';

export const INotebookEditorModelResolverService = creAteDecorAtor<INotebookEditorModelResolverService>('INotebookModelResolverService');

export interfAce INotebookEditorModelResolverService {
	reAdonly _serviceBrAnd: undefined;
	resolve(resource: URI, viewType?: string): Promise<IReference<INotebookEditorModel>>;
}


export clAss NotebookModelReferenceCollection extends ReferenceCollection<Promise<INotebookEditorModel>> {

	constructor(
		@IInstAntiAtionService reAdonly _instAntiAtionService: IInstAntiAtionService,
		@INotebookService privAte reAdonly _notebookService: INotebookService,
		@ILogService privAte reAdonly _logService: ILogService,
	) {
		super();
	}

	protected creAteReferencedObject(key: string, viewType: string): Promise<INotebookEditorModel> {
		const uri = URI.pArse(key);
		const model = this._instAntiAtionService.creAteInstAnce(NotebookEditorModel, uri, viewType);
		const promise = model.loAd();
		return promise;
	}

	protected destroyReferencedObject(_key: string, object: Promise<INotebookEditorModel>): void {
		object.then(model => {
			this._notebookService.destoryNotebookDocument(model.viewType, model.notebook);
			model.dispose();
		}).cAtch(err => {
			this._logService.criticAl('FAILED to destory notebook', err);
		});
	}
}

export clAss NotebookModelResolverService implements INotebookEditorModelResolverService {

	reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _dAtA: NotebookModelReferenceCollection;

	constructor(
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@INotebookService privAte reAdonly _notebookService: INotebookService
	) {
		this._dAtA = instAntiAtionService.creAteInstAnce(NotebookModelReferenceCollection);
	}

	Async resolve(resource: URI, viewType?: string): Promise<IReference<INotebookEditorModel>> {

		const existingViewType = this._notebookService.getNotebookTextModel(resource)?.viewType;
		if (!viewType) {
			if (existingViewType) {
				viewType = existingViewType;
			} else {
				const providers = this._notebookService.getContributedNotebookProviders(resource);
				const exclusiveProvider = providers.find(provider => provider.exclusive);
				viewType = exclusiveProvider?.id || providers[0]?.id;
			}
		}

		if (!viewType) {
			throw new Error(`Missing viewType for '${resource}'`);
		}

		if (existingViewType && existingViewType !== viewType) {
			throw new Error(`A notebook with view type '${existingViewType}' AlreAdy exists for '${resource}', CANNOT creAte Another notebook with view type ${viewType}`);
		}

		const reference = this._dAtA.Acquire(resource.toString(), viewType);
		const model = AwAit reference.object;
		NotebookModelResolverService._AutoReferenceDirtyModel(model, () => this._dAtA.Acquire(resource.toString(), viewType));
		return {
			object: model,
			dispose() { reference.dispose(); }
		};
	}

	privAte stAtic _AutoReferenceDirtyModel(model: INotebookEditorModel, ref: () => IDisposAble) {

		const references = new DisposAbleStore();
		const listener = model.onDidChAngeDirty(() => {
			if (model.isDirty()) {
				references.Add(ref());
			} else {
				references.cleAr();
			}
		});

		Event.once(model.notebook.onWillDispose)(() => {
			listener.dispose();
			references.dispose();
		});
	}
}
