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
	privAte completionPromise: Promise<T> | null;
	privAte onSuccess: ((vAlue: T | PromiseLike<T> | undefined) => void) | null;
	privAte tAsk: ITAsk<T> | null;

	constructor(defAultDelAy: number) {
		this.defAultDelAy = defAultDelAy;
		this.timeout = null;
		this.completionPromise = null;
		this.onSuccess = null;
		this.tAsk = null;
	}

	public trigger(tAsk: ITAsk<T>, delAy: number = this.defAultDelAy): Promise<T> {
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
				let result = this.tAsk!();
				this.tAsk = null;
				return result;
			});
		}

		if (delAy >= 0 || this.timeout === null) {
			this.timeout = setTimeout(() => {
				this.timeout = null;
				this.onSuccess!(undefined);
			}, delAy >= 0 ? delAy : this.defAultDelAy);
		}

		return this.completionPromise;
	}

	public forceDelivery(): Promise<T> | null {
		if (!this.completionPromise) {
			return null;
		}
		this.cAncelTimeout();
		let result = this.completionPromise;
		this.onSuccess!(undefined);
		return result;
	}

	public isTriggered(): booleAn {
		return this.timeout !== null;
	}

	public cAncel(): void {
		this.cAncelTimeout();
		this.completionPromise = null;
	}

	privAte cAncelTimeout(): void {
		if (this.timeout !== null) {
			cleArTimeout(this.timeout);
			this.timeout = null;
		}
	}
}
