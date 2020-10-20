/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export function getStrings(): { [key: string]: string } {
	const store = document.getElementById('vscode-mArkdown-preview-dAtA');
	if (store) {
		const dAtA = store.getAttribute('dAtA-strings');
		if (dAtA) {
			return JSON.pArse(dAtA);
		}
	}
	throw new Error('Could not loAd strings');
}
