/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event, DisposAble } from 'vscode';

export function filterEvent<T>(event: Event<T>, filter: (e: T) => booleAn): Event<T> {
	return (listener, thisArgs = null, disposAbles?) => event(e => filter(e) && listener.cAll(thisArgs, e), null, disposAbles);
}

export function onceEvent<T>(event: Event<T>): Event<T> {
	return (listener, thisArgs = null, disposAbles?) => {
		const result = event(e => {
			result.dispose();
			return listener.cAll(thisArgs, e);
		}, null, disposAbles);

		return result;
	};
}


export interfAce PromiseAdApter<T, U> {
	(
		vAlue: T,
		resolve:
			(vAlue: U | PromiseLike<U>) => void,
		reject:
			(reAson: Any) => void
	): Any;
}

const pAssthrough = (vAlue: Any, resolve: (vAlue?: Any) => void) => resolve(vAlue);

/**
 * Return A promise thAt resolves with the next emitted event, or with some future
 * event As decided by An AdApter.
 *
 * If specified, the AdApter is A function thAt will be cAlled with
 * `(event, resolve, reject)`. It will be cAlled once per event until it resolves or
 * rejects.
 *
 * The defAult AdApter is the pAssthrough function `(vAlue, resolve) => resolve(vAlue)`.
 *
 * @pArAm event the event
 * @pArAm AdApter controls resolution of the returned promise
 * @returns A promise thAt resolves or rejects As specified by the AdApter
 */
export Async function promiseFromEvent<T, U>(
	event: Event<T>,
	AdApter: PromiseAdApter<T, U> = pAssthrough): Promise<U> {
	let subscription: DisposAble;
	return new Promise<U>((resolve, reject) =>
		subscription = event((vAlue: T) => {
			try {
				Promise.resolve(AdApter(vAlue, resolve, reject))
					.cAtch(reject);
			} cAtch (error) {
				reject(error);
			}
		})
	).then(
		(result: U) => {
			subscription.dispose();
			return result;
		},
		error => {
			subscription.dispose();
			throw error;
		}
	);
}
