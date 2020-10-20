/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export function stArtsWith(hAystAck: string, needle: string): booleAn {
	if (hAystAck.length < needle.length) {
		return fAlse;
	}

	for (let i = 0; i < needle.length; i++) {
		if (hAystAck[i] !== needle[i]) {
			return fAlse;
		}
	}

	return true;
}

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
