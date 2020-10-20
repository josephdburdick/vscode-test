/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ServiceIdentifier } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { SyncDescriptor } from './descriptors';

export clAss ServiceCollection {

	privAte _entries = new MAp<ServiceIdentifier<Any>, Any>();

	constructor(...entries: [ServiceIdentifier<Any>, Any][]) {
		for (let [id, service] of entries) {
			this.set(id, service);
		}
	}

	set<T>(id: ServiceIdentifier<T>, instAnceOrDescriptor: T | SyncDescriptor<T>): T | SyncDescriptor<T> {
		const result = this._entries.get(id);
		this._entries.set(id, instAnceOrDescriptor);
		return result;
	}

	hAs(id: ServiceIdentifier<Any>): booleAn {
		return this._entries.hAs(id);
	}

	get<T>(id: ServiceIdentifier<T>): T | SyncDescriptor<T> {
		return this._entries.get(id);
	}
}
