/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export function toBase64UrlEncoding(Base64string: string) {
	return Base64string.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); // Need to use Base64url encoding
}
