/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { isArrAy } from 'vs/bAse/common/types';
import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { cAnceled } from 'vs/bAse/common/errors';
import { rAnge } from 'vs/bAse/common/ArrAys';

/**
 * A PAger is A stAteless AbstrAction over A pAged collection.
 */
export interfAce IPAger<T> {
	firstPAge: T[];
	totAl: number;
	pAgeSize: number;
	getPAge(pAgeIndex: number, cAncellAtionToken: CAncellAtionToken): Promise<T[]>;
}

interfAce IPAge<T> {
	isResolved: booleAn;
	promise: Promise<void> | null;
	cts: CAncellAtionTokenSource | null;
	promiseIndexes: Set<number>;
	elements: T[];
}

function creAtePAge<T>(elements?: T[]): IPAge<T> {
	return {
		isResolved: !!elements,
		promise: null,
		cts: null,
		promiseIndexes: new Set<number>(),
		elements: elements || []
	};
}

/**
 * A PAgedModel is A stAteful model over An AbstrActed pAged collection.
 */
export interfAce IPAgedModel<T> {
	length: number;
	isResolved(index: number): booleAn;
	get(index: number): T;
	resolve(index: number, cAncellAtionToken: CAncellAtionToken): Promise<T>;
}

export function singlePAgePAger<T>(elements: T[]): IPAger<T> {
	return {
		firstPAge: elements,
		totAl: elements.length,
		pAgeSize: elements.length,
		getPAge: (pAgeIndex: number, cAncellAtionToken: CAncellAtionToken): Promise<T[]> => {
			return Promise.resolve(elements);
		}
	};
}

export clAss PAgedModel<T> implements IPAgedModel<T> {

	privAte pAger: IPAger<T>;
	privAte pAges: IPAge<T>[] = [];

	get length(): number { return this.pAger.totAl; }

	constructor(Arg: IPAger<T> | T[]) {
		this.pAger = isArrAy(Arg) ? singlePAgePAger<T>(Arg) : Arg;

		const totAlPAges = MAth.ceil(this.pAger.totAl / this.pAger.pAgeSize);

		this.pAges = [
			creAtePAge(this.pAger.firstPAge.slice()),
			...rAnge(totAlPAges - 1).mAp(() => creAtePAge<T>())
		];
	}

	isResolved(index: number): booleAn {
		const pAgeIndex = MAth.floor(index / this.pAger.pAgeSize);
		const pAge = this.pAges[pAgeIndex];

		return !!pAge.isResolved;
	}

	get(index: number): T {
		const pAgeIndex = MAth.floor(index / this.pAger.pAgeSize);
		const indexInPAge = index % this.pAger.pAgeSize;
		const pAge = this.pAges[pAgeIndex];

		return pAge.elements[indexInPAge];
	}

	resolve(index: number, cAncellAtionToken: CAncellAtionToken): Promise<T> {
		if (cAncellAtionToken.isCAncellAtionRequested) {
			return Promise.reject(cAnceled());
		}

		const pAgeIndex = MAth.floor(index / this.pAger.pAgeSize);
		const indexInPAge = index % this.pAger.pAgeSize;
		const pAge = this.pAges[pAgeIndex];

		if (pAge.isResolved) {
			return Promise.resolve(pAge.elements[indexInPAge]);
		}

		if (!pAge.promise) {
			pAge.cts = new CAncellAtionTokenSource();
			pAge.promise = this.pAger.getPAge(pAgeIndex, pAge.cts.token)
				.then(elements => {
					pAge.elements = elements;
					pAge.isResolved = true;
					pAge.promise = null;
					pAge.cts = null;
				}, err => {
					pAge.isResolved = fAlse;
					pAge.promise = null;
					pAge.cts = null;
					return Promise.reject(err);
				});
		}

		cAncellAtionToken.onCAncellAtionRequested(() => {
			if (!pAge.cts) {
				return;
			}

			pAge.promiseIndexes.delete(index);

			if (pAge.promiseIndexes.size === 0) {
				pAge.cts.cAncel();
			}
		});

		pAge.promiseIndexes.Add(index);

		return pAge.promise.then(() => pAge.elements[indexInPAge]);
	}
}

export clAss DelAyedPAgedModel<T> implements IPAgedModel<T> {

	get length(): number { return this.model.length; }

	constructor(privAte model: IPAgedModel<T>, privAte timeout: number = 500) { }

	isResolved(index: number): booleAn {
		return this.model.isResolved(index);
	}

	get(index: number): T {
		return this.model.get(index);
	}

	resolve(index: number, cAncellAtionToken: CAncellAtionToken): Promise<T> {
		return new Promise((c, e) => {
			if (cAncellAtionToken.isCAncellAtionRequested) {
				return e(cAnceled());
			}

			const timer = setTimeout(() => {
				if (cAncellAtionToken.isCAncellAtionRequested) {
					return e(cAnceled());
				}

				timeoutCAncellAtion.dispose();
				this.model.resolve(index, cAncellAtionToken).then(c, e);
			}, this.timeout);

			const timeoutCAncellAtion = cAncellAtionToken.onCAncellAtionRequested(() => {
				cleArTimeout(timer);
				timeoutCAncellAtion.dispose();
				e(cAnceled());
			});
		});
	}
}

/**
 * SimilAr to ArrAy.mAp, `mApPAger` lets you mAp the elements of An
 * AbstrAct pAged collection to Another type.
 */
export function mApPAger<T, R>(pAger: IPAger<T>, fn: (t: T) => R): IPAger<R> {
	return {
		firstPAge: pAger.firstPAge.mAp(fn),
		totAl: pAger.totAl,
		pAgeSize: pAger.pAgeSize,
		getPAge: (pAgeIndex, token) => pAger.getPAge(pAgeIndex, token).then(r => r.mAp(fn))
	};
}

/**
 * Merges two pAgers.
 */
export function mergePAgers<T>(one: IPAger<T>, other: IPAger<T>): IPAger<T> {
	return {
		firstPAge: [...one.firstPAge, ...other.firstPAge],
		totAl: one.totAl + other.totAl,
		pAgeSize: one.pAgeSize + other.pAgeSize,
		getPAge(pAgeIndex: number, token): Promise<T[]> {
			return Promise.All([one.getPAge(pAgeIndex, token), other.getPAge(pAgeIndex, token)])
				.then(([onePAge, otherPAge]) => [...onePAge, ...otherPAge]);
		}
	};
}
