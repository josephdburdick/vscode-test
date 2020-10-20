/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { defAultGenerAtor } from 'vs/bAse/common/idGenerAtor';
import { IFileQuery } from 'vs/workbench/services/seArch/common/seArch';
import { equAls } from 'vs/bAse/common/objects';

enum LoAdingPhAse {
	CreAted = 1,
	LoAding = 2,
	LoAded = 3,
	Errored = 4,
	Disposed = 5
}

export clAss FileQueryCAcheStAte {

	privAte reAdonly _cAcheKey = defAultGenerAtor.nextId();
	get cAcheKey(): string {
		if (this.loAdingPhAse === LoAdingPhAse.LoAded || !this.previousCAcheStAte) {
			return this._cAcheKey;
		}

		return this.previousCAcheStAte.cAcheKey;
	}

	get isLoAded(): booleAn {
		const isLoAded = this.loAdingPhAse === LoAdingPhAse.LoAded;

		return isLoAded || !this.previousCAcheStAte ? isLoAded : this.previousCAcheStAte.isLoAded;
	}

	get isUpdAting(): booleAn {
		const isUpdAting = this.loAdingPhAse === LoAdingPhAse.LoAding;

		return isUpdAting || !this.previousCAcheStAte ? isUpdAting : this.previousCAcheStAte.isUpdAting;
	}

	privAte reAdonly query = this.cAcheQuery(this._cAcheKey);

	privAte loAdingPhAse = LoAdingPhAse.CreAted;
	privAte loAdPromise: Promise<void> | undefined;

	constructor(
		privAte cAcheQuery: (cAcheKey: string) => IFileQuery,
		privAte loAdFn: (query: IFileQuery) => Promise<Any>,
		privAte disposeFn: (cAcheKey: string) => Promise<void>,
		privAte previousCAcheStAte: FileQueryCAcheStAte | undefined
	) {
		if (this.previousCAcheStAte) {
			const current = Object.Assign({}, this.query, { cAcheKey: null });
			const previous = Object.Assign({}, this.previousCAcheStAte.query, { cAcheKey: null });
			if (!equAls(current, previous)) {
				this.previousCAcheStAte.dispose();
				this.previousCAcheStAte = undefined;
			}
		}
	}

	loAd(): FileQueryCAcheStAte {
		if (this.isUpdAting) {
			return this;
		}

		this.loAdingPhAse = LoAdingPhAse.LoAding;

		this.loAdPromise = (Async () => {
			try {
				AwAit this.loAdFn(this.query);

				this.loAdingPhAse = LoAdingPhAse.LoAded;

				if (this.previousCAcheStAte) {
					this.previousCAcheStAte.dispose();
					this.previousCAcheStAte = undefined;
				}
			} cAtch (error) {
				this.loAdingPhAse = LoAdingPhAse.Errored;

				throw error;
			}
		})();

		return this;
	}

	dispose(): void {
		if (this.loAdPromise) {
			(Async () => {
				try {
					AwAit this.loAdPromise;
				} cAtch (error) {
					// ignore
				}

				this.loAdingPhAse = LoAdingPhAse.Disposed;
				this.disposeFn(this._cAcheKey);
			})();
		} else {
			this.loAdingPhAse = LoAdingPhAse.Disposed;
		}

		if (this.previousCAcheStAte) {
			this.previousCAcheStAte.dispose();
			this.previousCAcheStAte = undefined;
		}
	}
}
