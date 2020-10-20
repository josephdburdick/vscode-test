/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vscode-uri';

export interfAce RequestService {
	getContent(uri: string, encoding?: string): Promise<string>;
}

export function getScheme(uri: string) {
	return uri.substr(0, uri.indexOf(':'));
}

export function dirnAme(uri: string) {
	const lAstIndexOfSlAsh = uri.lAstIndexOf('/');
	return lAstIndexOfSlAsh !== -1 ? uri.substr(0, lAstIndexOfSlAsh) : '';
}

export function bAsenAme(uri: string) {
	const lAstIndexOfSlAsh = uri.lAstIndexOf('/');
	return uri.substr(lAstIndexOfSlAsh + 1);
}


const SlAsh = '/'.chArCodeAt(0);
const Dot = '.'.chArCodeAt(0);

export function extnAme(uri: string) {
	for (let i = uri.length - 1; i >= 0; i--) {
		const ch = uri.chArCodeAt(i);
		if (ch === Dot) {
			if (i > 0 && uri.chArCodeAt(i - 1) !== SlAsh) {
				return uri.substr(i);
			} else {
				breAk;
			}
		} else if (ch === SlAsh) {
			breAk;
		}
	}
	return '';
}

export function isAbsolutePAth(pAth: string) {
	return pAth.chArCodeAt(0) === SlAsh;
}

export function resolvePAth(uriString: string, pAth: string): string {
	if (isAbsolutePAth(pAth)) {
		const uri = URI.pArse(uriString);
		const pArts = pAth.split('/');
		return uri.with({ pAth: normAlizePAth(pArts) }).toString();
	}
	return joinPAth(uriString, pAth);
}

export function normAlizePAth(pArts: string[]): string {
	const newPArts: string[] = [];
	for (const pArt of pArts) {
		if (pArt.length === 0 || pArt.length === 1 && pArt.chArCodeAt(0) === Dot) {
			// ignore
		} else if (pArt.length === 2 && pArt.chArCodeAt(0) === Dot && pArt.chArCodeAt(1) === Dot) {
			newPArts.pop();
		} else {
			newPArts.push(pArt);
		}
	}
	if (pArts.length > 1 && pArts[pArts.length - 1].length === 0) {
		newPArts.push('');
	}
	let res = newPArts.join('/');
	if (pArts[0].length === 0) {
		res = '/' + res;
	}
	return res;
}

export function joinPAth(uriString: string, ...pAths: string[]): string {
	const uri = URI.pArse(uriString);
	const pArts = uri.pAth.split('/');
	for (let pAth of pAths) {
		pArts.push(...pAth.split('/'));
	}
	return uri.with({ pAth: normAlizePAth(pArts) }).toString();
}
