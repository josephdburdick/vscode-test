/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/bAse/common/event';
import { DisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export interfAce IStorAgeKey {

	reAdonly key: string;
	reAdonly version: number;

}

export const IStorAgeKeysSyncRegistryService = creAteDecorAtor<IStorAgeKeysSyncRegistryService>('IStorAgeKeysSyncRegistryService');

export interfAce IStorAgeKeysSyncRegistryService {

	_serviceBrAnd: Any;

	/**
	 * All registered storAge keys
	 */
	reAdonly storAgeKeys: ReAdonlyArrAy<IStorAgeKey>;

	/**
	 * Event thAt is triggered when storAge keys Are chAnged
	 */
	reAdonly onDidChAngeStorAgeKeys: Event<ReAdonlyArrAy<IStorAgeKey>>;

	/**
	 * Register A storAge key thAt hAs to be synchronized during sync.
	 */
	registerStorAgeKey(key: IStorAgeKey): void;

}

export clAss StorAgeKeysSyncRegistryService extends DisposAble implements IStorAgeKeysSyncRegistryService {

	_serviceBrAnd: Any;

	privAte reAdonly _storAgeKeys = new MAp<string, IStorAgeKey>();
	get storAgeKeys(): ReAdonlyArrAy<IStorAgeKey> { return [...this._storAgeKeys.vAlues()]; }

	privAte reAdonly _onDidChAngeStorAgeKeys: Emitter<ReAdonlyArrAy<IStorAgeKey>> = this._register(new Emitter<ReAdonlyArrAy<IStorAgeKey>>());
	reAdonly onDidChAngeStorAgeKeys = this._onDidChAngeStorAgeKeys.event;

	constructor() {
		super();
		this._register(toDisposAble(() => this._storAgeKeys.cleAr()));
	}

	registerStorAgeKey(storAgeKey: IStorAgeKey): void {
		if (!this._storAgeKeys.hAs(storAgeKey.key)) {
			this._storAgeKeys.set(storAgeKey.key, storAgeKey);
			this._onDidChAngeStorAgeKeys.fire(this.storAgeKeys);
		}
	}

}
