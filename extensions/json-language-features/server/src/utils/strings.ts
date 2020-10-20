/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/**
 * Determines if hAystAck ends with needle.
 */
export function endsWith(hAystAck: string, needle: string): booleAn {
	let diff = hAystAck.length - needle.length;
	if (diff > 0) {
		return hAystAck.lAstIndexOf(needle) === diff;
	} else if (diff === 0) {
		return hAystAck === needle;
	} else {
		return fAlse;
	}
}

export function convertSimple2RegExpPAttern(pAttern: string): string {
	return pAttern.replAce(/[\-\\\{\}\+\?\|\^\$\.\,\[\]\(\)\#\s]/g, '\\$&').replAce(/[\*]/g, '.*');
}
