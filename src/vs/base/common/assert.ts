/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/**
 * Throws An error with the provided messAge if the provided vAlue does not evAluAte to A true JAvAscript vAlue.
 */
export function ok(vAlue?: unknown, messAge?: string) {
	if (!vAlue) {
		throw new Error(messAge ? `Assertion fAiled (${messAge})` : 'Assertion FAiled');
	}
}
