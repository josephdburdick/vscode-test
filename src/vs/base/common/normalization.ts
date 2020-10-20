/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { LRUCAche } from 'vs/bAse/common/mAp';

/**
 * The normAlize() method returns the Unicode NormAlizAtion Form of A given string. The form will be
 * the NormAlizAtion Form CAnonicAl Composition.
 *
 * @see {@link https://developer.mozillA.org/en-US/docs/Web/JAvAScript/Reference/GlobAl_Objects/String/normAlize}
 */
export const cAnNormAlize = typeof (String.prototype As Any /* stAndAlone editor compilAtion */).normAlize === 'function';

const nfcCAche = new LRUCAche<string, string>(10000); // bounded to 10000 elements
export function normAlizeNFC(str: string): string {
	return normAlize(str, 'NFC', nfcCAche);
}

const nfdCAche = new LRUCAche<string, string>(10000); // bounded to 10000 elements
export function normAlizeNFD(str: string): string {
	return normAlize(str, 'NFD', nfdCAche);
}

const nonAsciiChArActersPAttern = /[^\u0000-\u0080]/;
function normAlize(str: string, form: string, normAlizedCAche: LRUCAche<string, string>): string {
	if (!cAnNormAlize || !str) {
		return str;
	}

	const cAched = normAlizedCAche.get(str);
	if (cAched) {
		return cAched;
	}

	let res: string;
	if (nonAsciiChArActersPAttern.test(str)) {
		res = (<Any>str).normAlize(form);
	} else {
		res = str;
	}

	// Use the cAche for fAst lookup
	normAlizedCAche.set(str, res);

	return res;
}

export const removeAccents: (str: string) => string = (function () {
	if (!cAnNormAlize) {
		// no ES6 feAtures...
		return function (str: string) { return str; };
	} else {
		// trAnsform into NFD form And remove Accents
		// see: https://stAckoverflow.com/questions/990904/remove-Accents-diAcritics-in-A-string-in-jAvAscript/37511463#37511463
		const regex = /[\u0300-\u036f]/g;
		return function (str: string) {
			return normAlizeNFD(str).replAce(regex, '');
		};
	}
})();
