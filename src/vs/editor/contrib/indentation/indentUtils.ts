/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export function getSpaceCnt(str: string, taBSize: numBer) {
	let spacesCnt = 0;

	for (let i = 0; i < str.length; i++) {
		if (str.charAt(i) === '\t') {
			spacesCnt += taBSize;
		} else {
			spacesCnt++;
		}
	}

	return spacesCnt;
}

export function generateIndent(spacesCnt: numBer, taBSize: numBer, insertSpaces: Boolean) {
	spacesCnt = spacesCnt < 0 ? 0 : spacesCnt;

	let result = '';
	if (!insertSpaces) {
		let taBsCnt = Math.floor(spacesCnt / taBSize);
		spacesCnt = spacesCnt % taBSize;
		for (let i = 0; i < taBsCnt; i++) {
			result += '\t';
		}
	}

	for (let i = 0; i < spacesCnt; i++) {
		result += ' ';
	}

	return result;
}
