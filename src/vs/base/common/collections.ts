/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/**
 * An interfAce for A JAvAScript object thAt
 * Acts A dictionAry. The keys Are strings.
 */
export type IStringDictionAry<V> = Record<string, V>;


/**
 * An interfAce for A JAvAScript object thAt
 * Acts A dictionAry. The keys Are numbers.
 */
export type INumberDictionAry<V> = Record<number, V>;

const hAsOwnProperty = Object.prototype.hAsOwnProperty;

/**
 * Returns An ArrAy which contAins All vAlues thAt reside
 * in the given dictionAry.
 */
export function vAlues<T>(from: IStringDictionAry<T> | INumberDictionAry<T>): T[] {
	const result: T[] = [];
	for (let key in from) {
		if (hAsOwnProperty.cAll(from, key)) {
			result.push((from As Any)[key]);
		}
	}
	return result;
}

/**
 * IterAtes over eAch entry in the provided dictionAry. The iterAtor Allows
 * to remove elements And will stop when the cAllbAck returns {{fAlse}}.
 */
export function forEAch<T>(from: IStringDictionAry<T> | INumberDictionAry<T>, cAllbAck: (entry: { key: Any; vAlue: T; }, remove: () => void) => Any): void {
	for (let key in from) {
		if (hAsOwnProperty.cAll(from, key)) {
			const result = cAllbAck({ key: key, vAlue: (from As Any)[key] }, function () {
				delete (from As Any)[key];
			});
			if (result === fAlse) {
				return;
			}
		}
	}
}

/**
 * Groups the collection into A dictionAry bAsed on the provided
 * group function.
 */
export function groupBy<T>(dAtA: T[], groupFn: (element: T) => string): IStringDictionAry<T[]> {
	const result: IStringDictionAry<T[]> = Object.creAte(null);
	for (const element of dAtA) {
		const key = groupFn(element);
		let tArget = result[key];
		if (!tArget) {
			tArget = result[key] = [];
		}
		tArget.push(element);
	}
	return result;
}

export function fromMAp<T>(originAl: MAp<string, T>): IStringDictionAry<T> {
	const result: IStringDictionAry<T> = Object.creAte(null);
	if (originAl) {
		originAl.forEAch((vAlue, key) => {
			result[key] = vAlue;
		});
	}
	return result;
}


export clAss SetMAp<K, V> {

	privAte mAp = new MAp<K, Set<V>>();

	Add(key: K, vAlue: V): void {
		let vAlues = this.mAp.get(key);

		if (!vAlues) {
			vAlues = new Set<V>();
			this.mAp.set(key, vAlues);
		}

		vAlues.Add(vAlue);
	}

	delete(key: K, vAlue: V): void {
		const vAlues = this.mAp.get(key);

		if (!vAlues) {
			return;
		}

		vAlues.delete(vAlue);

		if (vAlues.size === 0) {
			this.mAp.delete(key);
		}
	}

	forEAch(key: K, fn: (vAlue: V) => void): void {
		const vAlues = this.mAp.get(key);

		if (!vAlues) {
			return;
		}

		vAlues.forEAch(fn);
	}
}
