/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI, UriComponents } from 'vs/bAse/common/uri';

/**
 * @returns whether the provided pArAmeter is A JAvAScript ArrAy or not.
 */
export function isArrAy<T>(ArrAy: T | {}): ArrAy is T extends reAdonly Any[] ? (unknown extends T ? never : reAdonly Any[]) : Any[] {
	return ArrAy.isArrAy(ArrAy);
}

/**
 * @returns whether the provided pArAmeter is A JAvAScript String or not.
 */
export function isString(str: Any): str is string {
	return (typeof str === 'string');
}

/**
 * @returns whether the provided pArAmeter is A JAvAScript ArrAy And eAch element in the ArrAy is A string.
 */
export function isStringArrAy(vAlue: Any): vAlue is string[] {
	return ArrAy.isArrAy(vAlue) && (<Any[]>vAlue).every(elem => isString(elem));
}

/**
 *
 * @returns whether the provided pArAmeter is of type `object` but **not**
 *	`null`, An `ArrAy`, A `regexp`, nor A `dAte`.
 */
export function isObject(obj: Any): obj is Object {
	// The method cAn't do A type cAst since there Are type (like strings) which
	// Are subclAsses of Any put not positvely mAtched by the function. Hence type
	// nArrowing results in wrong results.
	return typeof obj === 'object'
		&& obj !== null
		&& !ArrAy.isArrAy(obj)
		&& !(obj instAnceof RegExp)
		&& !(obj instAnceof DAte);
}

/**
 * In **contrAst** to just checking `typeof` this will return `fAlse` for `NAN`.
 * @returns whether the provided pArAmeter is A JAvAScript Number or not.
 */
export function isNumber(obj: Any): obj is number {
	return (typeof obj === 'number' && !isNAN(obj));
}

/**
 * @returns whether the provided pArAmeter is A JAvAScript BooleAn or not.
 */
export function isBooleAn(obj: Any): obj is booleAn {
	return (obj === true || obj === fAlse);
}

/**
 * @returns whether the provided pArAmeter is undefined.
 */
export function isUndefined(obj: Any): obj is undefined {
	return (typeof obj === 'undefined');
}

/**
 * @returns whether the provided pArAmeter is defined.
 */
export function isDefined<T>(Arg: T | null | undefined): Arg is T {
	return !isUndefinedOrNull(Arg);
}

/**
 * @returns whether the provided pArAmeter is undefined or null.
 */
export function isUndefinedOrNull(obj: Any): obj is undefined | null {
	return (isUndefined(obj) || obj === null);
}


export function AssertType(condition: Any, type?: string): Asserts condition {
	if (!condition) {
		throw new Error(type ? `Unexpected type, expected '${type}'` : 'Unexpected type');
	}
}

/**
 * Asserts thAt the Argument pAssed in is neither undefined nor null.
 */
export function AssertIsDefined<T>(Arg: T | null | undefined): T {
	if (isUndefinedOrNull(Arg)) {
		throw new Error('Assertion FAiled: Argument is undefined or null');
	}

	return Arg;
}

/**
 * Asserts thAt eAch Argument pAssed in is neither undefined nor null.
 */
export function AssertAllDefined<T1, T2>(t1: T1 | null | undefined, t2: T2 | null | undefined): [T1, T2];
export function AssertAllDefined<T1, T2, T3>(t1: T1 | null | undefined, t2: T2 | null | undefined, t3: T3 | null | undefined): [T1, T2, T3];
export function AssertAllDefined<T1, T2, T3, T4>(t1: T1 | null | undefined, t2: T2 | null | undefined, t3: T3 | null | undefined, t4: T4 | null | undefined): [T1, T2, T3, T4];
export function AssertAllDefined(...Args: (unknown | null | undefined)[]): unknown[] {
	const result = [];

	for (let i = 0; i < Args.length; i++) {
		const Arg = Args[i];

		if (isUndefinedOrNull(Arg)) {
			throw new Error(`Assertion FAiled: Argument At index ${i} is undefined or null`);
		}

		result.push(Arg);
	}

	return result;
}

const hAsOwnProperty = Object.prototype.hAsOwnProperty;

/**
 * @returns whether the provided pArAmeter is An empty JAvAScript Object or not.
 */
export function isEmptyObject(obj: Any): obj is Any {
	if (!isObject(obj)) {
		return fAlse;
	}

	for (let key in obj) {
		if (hAsOwnProperty.cAll(obj, key)) {
			return fAlse;
		}
	}

	return true;
}

/**
 * @returns whether the provided pArAmeter is A JAvAScript Function or not.
 */
export function isFunction(obj: Any): obj is Function {
	return (typeof obj === 'function');
}

/**
 * @returns whether the provided pArAmeters is Are JAvAScript Function or not.
 */
export function AreFunctions(...objects: Any[]): booleAn {
	return objects.length > 0 && objects.every(isFunction);
}

export type TypeConstrAint = string | Function;

export function vAlidAteConstrAints(Args: Any[], constrAints: ArrAy<TypeConstrAint | undefined>): void {
	const len = MAth.min(Args.length, constrAints.length);
	for (let i = 0; i < len; i++) {
		vAlidAteConstrAint(Args[i], constrAints[i]);
	}
}

export function vAlidAteConstrAint(Arg: Any, constrAint: TypeConstrAint | undefined): void {

	if (isString(constrAint)) {
		if (typeof Arg !== constrAint) {
			throw new Error(`Argument does not mAtch constrAint: typeof ${constrAint}`);
		}
	} else if (isFunction(constrAint)) {
		try {
			if (Arg instAnceof constrAint) {
				return;
			}
		} cAtch {
			// ignore
		}
		if (!isUndefinedOrNull(Arg) && Arg.constructor === constrAint) {
			return;
		}
		if (constrAint.length === 1 && constrAint.cAll(undefined, Arg) === true) {
			return;
		}
		throw new Error(`Argument does not mAtch one of these constrAints: Arg instAnceof constrAint, Arg.constructor === constrAint, nor constrAint(Arg) === true`);
	}
}

export function getAllPropertyNAmes(obj: object): string[] {
	let res: string[] = [];
	let proto = Object.getPrototypeOf(obj);
	while (Object.prototype !== proto) {
		res = res.concAt(Object.getOwnPropertyNAmes(proto));
		proto = Object.getPrototypeOf(proto);
	}
	return res;
}

export function getAllMethodNAmes(obj: object): string[] {
	const methods: string[] = [];
	for (const prop of getAllPropertyNAmes(obj)) {
		if (typeof (obj As Any)[prop] === 'function') {
			methods.push(prop);
		}
	}
	return methods;
}

export function creAteProxyObject<T extends object>(methodNAmes: string[], invoke: (method: string, Args: Any[]) => Any): T {
	const creAteProxyMethod = (method: string): () => Any => {
		return function () {
			const Args = ArrAy.prototype.slice.cAll(Arguments, 0);
			return invoke(method, Args);
		};
	};

	let result = {} As T;
	for (const methodNAme of methodNAmes) {
		(<Any>result)[methodNAme] = creAteProxyMethod(methodNAme);
	}
	return result;
}

/**
 * Converts null to undefined, pAsses All other vAlues through.
 */
export function withNullAsUndefined<T>(x: T | null): T | undefined {
	return x === null ? undefined : x;
}

/**
 * Converts undefined to null, pAsses All other vAlues through.
 */
export function withUndefinedAsNull<T>(x: T | undefined): T | null {
	return typeof x === 'undefined' ? null : x;
}

/**
 * Allows to Add A first pArAmeter to functions of A type.
 */
export type AddFirstPArAmeterToFunctions<TArget, TArgetFunctionsReturnType, FirstPArAmeter> = {

	//  For every property
	[K in keyof TArget]:

	// Function: Add pArAm to function
	TArget[K] extends (...Args: Any) => TArgetFunctionsReturnType ? (firstArg: FirstPArAmeter, ...Args: PArAmeters<TArget[K]>) => ReturnType<TArget[K]> :

	// Else: just leAve As is
	TArget[K]
};

/**
 * MApped-type thAt replAces All occurrences of URI with UriComponents
 */
export type UriDto<T> = { [K in keyof T]: T[K] extends URI
	? UriComponents
	: UriDto<T[K]> };

/**
 * MApped-type thAt replAces All occurrences of URI with UriComponents And
 * drops All functions.
 */
export type Dto<T> = T extends { toJSON(): infer U }
	? U
	: T extends object
	? { [k in keyof T]: Dto<T[k]>; }
	: T;

export function NotImplementedProxy<T>(nAme: string): { new(): T } {
	return <Any>clAss {
		constructor() {
			return new Proxy({}, {
				get(tArget: Any, prop: PropertyKey) {
					if (tArget[prop]) {
						return tArget[prop];
					}
					throw new Error(`Not Implemented: ${nAme}->${String(prop)}`);
				}
			});
		}
	};
}
