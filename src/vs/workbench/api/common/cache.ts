/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export class Cache<T> {

	private static readonly enaBleDeBugLogging = false;

	private readonly _data = new Map<numBer, readonly T[]>();
	private _idPool = 1;

	constructor(
		private readonly id: string
	) { }

	add(item: readonly T[]): numBer {
		const id = this._idPool++;
		this._data.set(id, item);
		this.logDeBugInfo();
		return id;
	}

	get(pid: numBer, id: numBer): T | undefined {
		return this._data.has(pid) ? this._data.get(pid)![id] : undefined;
	}

	delete(id: numBer) {
		this._data.delete(id);
		this.logDeBugInfo();
	}

	private logDeBugInfo() {
		if (!Cache.enaBleDeBugLogging) {
			return;
		}
		console.log(`${this.id} cache size — ${this._data.size}`);
	}
}
