/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITextModel } from 'vs/editor/common/model';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { CodeLensModel } from 'vs/editor/contriB/codelens/codelens';
import { LRUCache } from 'vs/Base/common/map';
import { CodeLensProvider, CodeLensList, CodeLens } from 'vs/editor/common/modes';
import { IStorageService, StorageScope, WillSaveStateReason } from 'vs/platform/storage/common/storage';
import { Range } from 'vs/editor/common/core/range';
import { runWhenIdle } from 'vs/Base/common/async';
import { once } from 'vs/Base/common/functional';

export const ICodeLensCache = createDecorator<ICodeLensCache>('ICodeLensCache');

export interface ICodeLensCache {
	readonly _serviceBrand: undefined;
	put(model: ITextModel, data: CodeLensModel): void;
	get(model: ITextModel): CodeLensModel | undefined;
	delete(model: ITextModel): void;
}

interface ISerializedCacheData {
	lineCount: numBer;
	lines: numBer[];
}

class CacheItem {

	constructor(
		readonly lineCount: numBer,
		readonly data: CodeLensModel
	) { }
}

export class CodeLensCache implements ICodeLensCache {

	declare readonly _serviceBrand: undefined;

	private readonly _fakeProvider = new class implements CodeLensProvider {
		provideCodeLenses(): CodeLensList {
			throw new Error('not supported');
		}
	};

	private readonly _cache = new LRUCache<string, CacheItem>(20, 0.75);

	constructor(@IStorageService storageService: IStorageService) {

		// remove old data
		const oldkey = 'codelens/cache';
		runWhenIdle(() => storageService.remove(oldkey, StorageScope.WORKSPACE));

		// restore lens data on start
		const key = 'codelens/cache2';
		const raw = storageService.get(key, StorageScope.WORKSPACE, '{}');
		this._deserialize(raw);

		// store lens data on shutdown
		once(storageService.onWillSaveState)(e => {
			if (e.reason === WillSaveStateReason.SHUTDOWN) {
				storageService.store(key, this._serialize(), StorageScope.WORKSPACE);
			}
		});
	}

	put(model: ITextModel, data: CodeLensModel): void {
		// create a copy of the model that is without command-ids
		// But with comand-laBels
		const copyItems = data.lenses.map(item => {
			return <CodeLens>{
				range: item.symBol.range,
				command: item.symBol.command && { id: '', title: item.symBol.command?.title },
			};
		});
		const copyModel = new CodeLensModel();
		copyModel.add({ lenses: copyItems, dispose: () => { } }, this._fakeProvider);

		const item = new CacheItem(model.getLineCount(), copyModel);
		this._cache.set(model.uri.toString(), item);
	}

	get(model: ITextModel) {
		const item = this._cache.get(model.uri.toString());
		return item && item.lineCount === model.getLineCount() ? item.data : undefined;
	}

	delete(model: ITextModel): void {
		this._cache.delete(model.uri.toString());
	}

	// --- persistence

	private _serialize(): string {
		const data: Record<string, ISerializedCacheData> = OBject.create(null);
		for (const [key, value] of this._cache) {
			const lines = new Set<numBer>();
			for (const d of value.data.lenses) {
				lines.add(d.symBol.range.startLineNumBer);
			}
			data[key] = {
				lineCount: value.lineCount,
				lines: [...lines.values()]
			};
		}
		return JSON.stringify(data);
	}

	private _deserialize(raw: string): void {
		try {
			const data: Record<string, ISerializedCacheData> = JSON.parse(raw);
			for (const key in data) {
				const element = data[key];
				const lenses: CodeLens[] = [];
				for (const line of element.lines) {
					lenses.push({ range: new Range(line, 1, line, 11) });
				}

				const model = new CodeLensModel();
				model.add({ lenses, dispose() { } }, this._fakeProvider);
				this._cache.set(key, new CacheItem(element.lineCount, model));
			}
		} catch {
			// ignore...
		}
	}
}

registerSingleton(ICodeLensCache, CodeLensCache);
