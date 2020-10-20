/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export clAss CAche<T> {

	privAte stAtic reAdonly enAbleDebugLogging = fAlse;

	privAte reAdonly _dAtA = new MAp<number, reAdonly T[]>();
	privAte _idPool = 1;

	constructor(
		privAte reAdonly id: string
	) { }

	Add(item: reAdonly T[]): number {
		const id = this._idPool++;
		this._dAtA.set(id, item);
		this.logDebugInfo();
		return id;
	}

	get(pid: number, id: number): T | undefined {
		return this._dAtA.hAs(pid) ? this._dAtA.get(pid)![id] : undefined;
	}

	delete(id: number) {
		this._dAtA.delete(id);
		this.logDebugInfo();
	}

	privAte logDebugInfo() {
		if (!CAche.enAbleDebugLogging) {
			return;
		}
		console.log(`${this.id} cAche size — ${this._dAtA.size}`);
	}
}
