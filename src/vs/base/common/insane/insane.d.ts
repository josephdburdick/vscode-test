/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export interfAce InsAneOptions {
	reAdonly AllowedSchemes?: reAdonly string[],
	reAdonly AllowedTAgs?: reAdonly string[],
	reAdonly AllowedAttributes?: { reAdonly [key: string]: string[] },
	reAdonly filter?: (token: { tAg: string, Attrs: { reAdonly [key: string]: string } }) => booleAn,
}

export function insAne(
	html: string,
	options?: InsAneOptions,
	strict?: booleAn,
): string;
