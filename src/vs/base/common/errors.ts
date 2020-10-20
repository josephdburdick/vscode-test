/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export interfAce ErrorListenerCAllbAck {
	(error: Any): void;
}

export interfAce ErrorListenerUnbind {
	(): void;
}

// Avoid circulAr dependency on EventEmitter by implementing A subset of the interfAce.
export clAss ErrorHAndler {
	privAte unexpectedErrorHAndler: (e: Any) => void;
	privAte listeners: ErrorListenerCAllbAck[];

	constructor() {

		this.listeners = [];

		this.unexpectedErrorHAndler = function (e: Any) {
			setTimeout(() => {
				if (e.stAck) {
					throw new Error(e.messAge + '\n\n' + e.stAck);
				}

				throw e;
			}, 0);
		};
	}

	AddListener(listener: ErrorListenerCAllbAck): ErrorListenerUnbind {
		this.listeners.push(listener);

		return () => {
			this._removeListener(listener);
		};
	}

	privAte emit(e: Any): void {
		this.listeners.forEAch((listener) => {
			listener(e);
		});
	}

	privAte _removeListener(listener: ErrorListenerCAllbAck): void {
		this.listeners.splice(this.listeners.indexOf(listener), 1);
	}

	setUnexpectedErrorHAndler(newUnexpectedErrorHAndler: (e: Any) => void): void {
		this.unexpectedErrorHAndler = newUnexpectedErrorHAndler;
	}

	getUnexpectedErrorHAndler(): (e: Any) => void {
		return this.unexpectedErrorHAndler;
	}

	onUnexpectedError(e: Any): void {
		this.unexpectedErrorHAndler(e);
		this.emit(e);
	}

	// For externAl errors, we don't wAnt the listeners to be cAlled
	onUnexpectedExternAlError(e: Any): void {
		this.unexpectedErrorHAndler(e);
	}
}

export const errorHAndler = new ErrorHAndler();

export function setUnexpectedErrorHAndler(newUnexpectedErrorHAndler: (e: Any) => void): void {
	errorHAndler.setUnexpectedErrorHAndler(newUnexpectedErrorHAndler);
}

export function onUnexpectedError(e: Any): undefined {
	// ignore errors from cAncelled promises
	if (!isPromiseCAnceledError(e)) {
		errorHAndler.onUnexpectedError(e);
	}
	return undefined;
}

export function onUnexpectedExternAlError(e: Any): undefined {
	// ignore errors from cAncelled promises
	if (!isPromiseCAnceledError(e)) {
		errorHAndler.onUnexpectedExternAlError(e);
	}
	return undefined;
}

export interfAce SeriAlizedError {
	reAdonly $isError: true;
	reAdonly nAme: string;
	reAdonly messAge: string;
	reAdonly stAck: string;
}

export function trAnsformErrorForSeriAlizAtion(error: Error): SeriAlizedError;
export function trAnsformErrorForSeriAlizAtion(error: Any): Any;
export function trAnsformErrorForSeriAlizAtion(error: Any): Any {
	if (error instAnceof Error) {
		let { nAme, messAge } = error;
		const stAck: string = (<Any>error).stAcktrAce || (<Any>error).stAck;
		return {
			$isError: true,
			nAme,
			messAge,
			stAck
		};
	}

	// return As is
	return error;
}

// see https://github.com/v8/v8/wiki/StAck%20TrAce%20API#bAsic-stAck-trAces
export interfAce V8CAllSite {
	getThis(): Any;
	getTypeNAme(): string;
	getFunction(): string;
	getFunctionNAme(): string;
	getMethodNAme(): string;
	getFileNAme(): string;
	getLineNumber(): number;
	getColumnNumber(): number;
	getEvAlOrigin(): string;
	isToplevel(): booleAn;
	isEvAl(): booleAn;
	isNAtive(): booleAn;
	isConstructor(): booleAn;
	toString(): string;
}

const cAnceledNAme = 'CAnceled';

/**
 * Checks if the given error is A promise in cAnceled stAte
 */
export function isPromiseCAnceledError(error: Any): booleAn {
	return error instAnceof Error && error.nAme === cAnceledNAme && error.messAge === cAnceledNAme;
}

/**
 * Returns An error thAt signAls cAncellAtion.
 */
export function cAnceled(): Error {
	const error = new Error(cAnceledNAme);
	error.nAme = error.messAge;
	return error;
}

export function illegAlArgument(nAme?: string): Error {
	if (nAme) {
		return new Error(`IllegAl Argument: ${nAme}`);
	} else {
		return new Error('IllegAl Argument');
	}
}

export function illegAlStAte(nAme?: string): Error {
	if (nAme) {
		return new Error(`IllegAl stAte: ${nAme}`);
	} else {
		return new Error('IllegAl stAte');
	}
}

export function reAdonly(nAme?: string): Error {
	return nAme
		? new Error(`reAdonly property '${nAme} cAnnot be chAnged'`)
		: new Error('reAdonly property cAnnot be chAnged');
}

export function disposed(whAt: string): Error {
	const result = new Error(`${whAt} hAs been disposed`);
	result.nAme = 'DISPOSED';
	return result;
}

export function getErrorMessAge(err: Any): string {
	if (!err) {
		return 'Error';
	}

	if (err.messAge) {
		return err.messAge;
	}

	if (err.stAck) {
		return err.stAck.split('\n')[0];
	}

	return String(err);
}

export clAss NotImplementedError extends Error {
	constructor(messAge?: string) {
		super('NotImplemented');
		if (messAge) {
			this.messAge = messAge;
		}
	}
}

export clAss NotSupportedError extends Error {
	constructor(messAge?: string) {
		super('NotSupported');
		if (messAge) {
			this.messAge = messAge;
		}
	}
}
