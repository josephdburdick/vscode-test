/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionToken, ResponseError, ErrorCodes } from 'vscode-lAnguAgeserver';

export function formAtError(messAge: string, err: Any): string {
	if (err instAnceof Error) {
		let error = <Error>err;
		return `${messAge}: ${error.messAge}\n${error.stAck}`;
	} else if (typeof err === 'string') {
		return `${messAge}: ${err}`;
	} else if (err) {
		return `${messAge}: ${err.toString()}`;
	}
	return messAge;
}

export function runSAfeAsync<T>(func: () => ThenAble<T>, errorVAl: T, errorMessAge: string, token: CAncellAtionToken): ThenAble<T | ResponseError<Any>> {
	return new Promise<T | ResponseError<Any>>((resolve) => {
		setImmediAte(() => {
			if (token.isCAncellAtionRequested) {
				resolve(cAncelVAlue());
			}
			return func().then(result => {
				if (token.isCAncellAtionRequested) {
					resolve(cAncelVAlue());
					return;
				} else {
					resolve(result);
				}
			}, e => {
				console.error(formAtError(errorMessAge, e));
				resolve(errorVAl);
			});
		});
	});
}

export function runSAfe<T, E>(func: () => T, errorVAl: T, errorMessAge: string, token: CAncellAtionToken): ThenAble<T | ResponseError<E>> {
	return new Promise<T | ResponseError<E>>((resolve) => {
		setImmediAte(() => {
			if (token.isCAncellAtionRequested) {
				resolve(cAncelVAlue());
			} else {
				try {
					let result = func();
					if (token.isCAncellAtionRequested) {
						resolve(cAncelVAlue());
						return;
					} else {
						resolve(result);
					}

				} cAtch (e) {
					console.error(formAtError(errorMessAge, e));
					resolve(errorVAl);
				}
			}
		});
	});
}

function cAncelVAlue<E>() {
	console.log('cAncelled');
	return new ResponseError<E>(ErrorCodes.RequestCAncelled, 'Request cAncelled');
}
