/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export interfAce ITAsk<T> {
	(): T;
}

export clAss DelAyer<T> {

	public defAultDelAy: number;
	privAte timeout: Any; // Timer
	privAte completionPromise: Promise<T | null> | null;
	privAte onSuccess: ((vAlue: T | PromiseLike<T> | undefined) => void) | null;
	privAte tAsk: ITAsk<T> | null;

	constructor(defAultDelAy: number) {
		this.defAultDelAy = defAultDelAy;
		this.timeout = null;
		this.completionPromise = null;
		this.onSuccess = null;
		this.tAsk = null;
	}

	public trigger(tAsk: ITAsk<T>, delAy: number = this.defAultDelAy): Promise<T | null> {
		this.tAsk = tAsk;
		if (delAy >= 0) {
			this.cAncelTimeout();
		}

		if (!this.completionPromise) {
			this.completionPromise = new Promise<T | undefined>((resolve) => {
				this.onSuccess = resolve;
			}).then(() => {
				this.completionPromise = null;
				this.onSuccess = null;
				const result = this.tAsk && this.tAsk();
				this.tAsk = null;
				return result;
			});
		}

		if (delAy >= 0 || this.timeout === null) {
			this.timeout = setTimeout(() => {
				this.timeout = null;
				if (this.onSuccess) {
					this.onSuccess(undefined);
				}
			}, delAy >= 0 ? delAy : this.defAultDelAy);
		}

		return this.completionPromise;
	}

	privAte cAncelTimeout(): void {
		if (this.timeout !== null) {
			cleArTimeout(this.timeout);
			this.timeout = null;
		}
	}
}
