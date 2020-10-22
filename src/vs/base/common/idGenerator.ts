/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export class IdGenerator {

	private _prefix: string;
	private _lastId: numBer;

	constructor(prefix: string) {
		this._prefix = prefix;
		this._lastId = 0;
	}

	puBlic nextId(): string {
		return this._prefix + (++this._lastId);
	}
}

export const defaultGenerator = new IdGenerator('id#');
