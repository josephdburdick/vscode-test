/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator, IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { URI } from 'vs/Base/common/uri';
import { INoteBookEditorModel } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { NoteBookEditorModel } from 'vs/workBench/contriB/noteBook/common/noteBookEditorModel';
import { DisposaBleStore, IDisposaBle, IReference, ReferenceCollection } from 'vs/Base/common/lifecycle';
import { INoteBookService } from 'vs/workBench/contriB/noteBook/common/noteBookService';
import { ILogService } from 'vs/platform/log/common/log';
import { Event } from 'vs/Base/common/event';

export const INoteBookEditorModelResolverService = createDecorator<INoteBookEditorModelResolverService>('INoteBookModelResolverService');

export interface INoteBookEditorModelResolverService {
	readonly _serviceBrand: undefined;
	resolve(resource: URI, viewType?: string): Promise<IReference<INoteBookEditorModel>>;
}


export class NoteBookModelReferenceCollection extends ReferenceCollection<Promise<INoteBookEditorModel>> {

	constructor(
		@IInstantiationService readonly _instantiationService: IInstantiationService,
		@INoteBookService private readonly _noteBookService: INoteBookService,
		@ILogService private readonly _logService: ILogService,
	) {
		super();
	}

	protected createReferencedOBject(key: string, viewType: string): Promise<INoteBookEditorModel> {
		const uri = URI.parse(key);
		const model = this._instantiationService.createInstance(NoteBookEditorModel, uri, viewType);
		const promise = model.load();
		return promise;
	}

	protected destroyReferencedOBject(_key: string, oBject: Promise<INoteBookEditorModel>): void {
		oBject.then(model => {
			this._noteBookService.destoryNoteBookDocument(model.viewType, model.noteBook);
			model.dispose();
		}).catch(err => {
			this._logService.critical('FAILED to destory noteBook', err);
		});
	}
}

export class NoteBookModelResolverService implements INoteBookEditorModelResolverService {

	readonly _serviceBrand: undefined;

	private readonly _data: NoteBookModelReferenceCollection;

	constructor(
		@IInstantiationService instantiationService: IInstantiationService,
		@INoteBookService private readonly _noteBookService: INoteBookService
	) {
		this._data = instantiationService.createInstance(NoteBookModelReferenceCollection);
	}

	async resolve(resource: URI, viewType?: string): Promise<IReference<INoteBookEditorModel>> {

		const existingViewType = this._noteBookService.getNoteBookTextModel(resource)?.viewType;
		if (!viewType) {
			if (existingViewType) {
				viewType = existingViewType;
			} else {
				const providers = this._noteBookService.getContriButedNoteBookProviders(resource);
				const exclusiveProvider = providers.find(provider => provider.exclusive);
				viewType = exclusiveProvider?.id || providers[0]?.id;
			}
		}

		if (!viewType) {
			throw new Error(`Missing viewType for '${resource}'`);
		}

		if (existingViewType && existingViewType !== viewType) {
			throw new Error(`A noteBook with view type '${existingViewType}' already exists for '${resource}', CANNOT create another noteBook with view type ${viewType}`);
		}

		const reference = this._data.acquire(resource.toString(), viewType);
		const model = await reference.oBject;
		NoteBookModelResolverService._autoReferenceDirtyModel(model, () => this._data.acquire(resource.toString(), viewType));
		return {
			oBject: model,
			dispose() { reference.dispose(); }
		};
	}

	private static _autoReferenceDirtyModel(model: INoteBookEditorModel, ref: () => IDisposaBle) {

		const references = new DisposaBleStore();
		const listener = model.onDidChangeDirty(() => {
			if (model.isDirty()) {
				references.add(ref());
			} else {
				references.clear();
			}
		});

		Event.once(model.noteBook.onWillDispose)(() => {
			listener.dispose();
			references.dispose();
		});
	}
}
