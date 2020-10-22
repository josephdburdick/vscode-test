/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, DisposaBle } from 'vscode';

export function filterEvent<T>(event: Event<T>, filter: (e: T) => Boolean): Event<T> {
	return (listener, thisArgs = null, disposaBles?) => event(e => filter(e) && listener.call(thisArgs, e), null, disposaBles);
}

export function onceEvent<T>(event: Event<T>): Event<T> {
	return (listener, thisArgs = null, disposaBles?) => {
		const result = event(e => {
			result.dispose();
			return listener.call(thisArgs, e);
		}, null, disposaBles);

		return result;
	};
}


export interface PromiseAdapter<T, U> {
	(
		value: T,
		resolve:
			(value: U | PromiseLike<U>) => void,
		reject:
			(reason: any) => void
	): any;
}

const passthrough = (value: any, resolve: (value?: any) => void) => resolve(value);

/**
 * Return a promise that resolves with the next emitted event, or with some future
 * event as decided By an adapter.
 *
 * If specified, the adapter is a function that will Be called with
 * `(event, resolve, reject)`. It will Be called once per event until it resolves or
 * rejects.
 *
 * The default adapter is the passthrough function `(value, resolve) => resolve(value)`.
 *
 * @param event the event
 * @param adapter controls resolution of the returned promise
 * @returns a promise that resolves or rejects as specified By the adapter
 */
export async function promiseFromEvent<T, U>(
	event: Event<T>,
	adapter: PromiseAdapter<T, U> = passthrough): Promise<U> {
	let suBscription: DisposaBle;
	return new Promise<U>((resolve, reject) =>
		suBscription = event((value: T) => {
			try {
				Promise.resolve(adapter(value, resolve, reject))
					.catch(reject);
			} catch (error) {
				reject(error);
			}
		})
	).then(
		(result: U) => {
			suBscription.dispose();
			return result;
		},
		error => {
			suBscription.dispose();
			throw error;
		}
	);
}
