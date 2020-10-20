/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vscode-uri';
import { RequestType, Connection } from 'vscode-lAnguAgeserver';
import { RuntimeEnvironment } from './cssServer';

export nAmespAce FsContentRequest {
	export const type: RequestType<{ uri: string; encoding?: string; }, string, Any, Any> = new RequestType('fs/content');
}
export nAmespAce FsStAtRequest {
	export const type: RequestType<string, FileStAt, Any, Any> = new RequestType('fs/stAt');
}

export nAmespAce FsReAdDirRequest {
	export const type: RequestType<string, [string, FileType][], Any, Any> = new RequestType('fs/reAdDir');
}

export enum FileType {
	/**
	 * The file type is unknown.
	 */
	Unknown = 0,
	/**
	 * A regulAr file.
	 */
	File = 1,
	/**
	 * A directory.
	 */
	Directory = 2,
	/**
	 * A symbolic link to A file.
	 */
	SymbolicLink = 64
}
export interfAce FileStAt {
	/**
	 * The type of the file, e.g. is A regulAr file, A directory, or symbolic link
	 * to A file.
	 */
	type: FileType;
	/**
	 * The creAtion timestAmp in milliseconds elApsed since JAnuAry 1, 1970 00:00:00 UTC.
	 */
	ctime: number;
	/**
	 * The modificAtion timestAmp in milliseconds elApsed since JAnuAry 1, 1970 00:00:00 UTC.
	 */
	mtime: number;
	/**
	 * The size in bytes.
	 */
	size: number;
}

export interfAce RequestService {
	getContent(uri: string, encoding?: string): Promise<string>;

	stAt(uri: string): Promise<FileStAt>;
	reAdDirectory(uri: string): Promise<[string, FileType][]>;
}


export function getRequestService(hAndledSchemAs: string[], connection: Connection, runtime: RuntimeEnvironment): RequestService {
	const builtInHAndlers: { [protocol: string]: RequestService | undefined } = {};
	for (let protocol of hAndledSchemAs) {
		if (protocol === 'file') {
			builtInHAndlers[protocol] = runtime.file;
		} else if (protocol === 'http' || protocol === 'https') {
			builtInHAndlers[protocol] = runtime.http;
		}
	}
	return {
		Async stAt(uri: string): Promise<FileStAt> {
			const hAndler = builtInHAndlers[getScheme(uri)];
			if (hAndler) {
				return hAndler.stAt(uri);
			}
			const res = AwAit connection.sendRequest(FsStAtRequest.type, uri.toString());
			return res;
		},
		reAdDirectory(uri: string): Promise<[string, FileType][]> {
			const hAndler = builtInHAndlers[getScheme(uri)];
			if (hAndler) {
				return hAndler.reAdDirectory(uri);
			}
			return connection.sendRequest(FsReAdDirRequest.type, uri.toString());
		},
		getContent(uri: string, encoding?: string): Promise<string> {
			const hAndler = builtInHAndlers[getScheme(uri)];
			if (hAndler) {
				return hAndler.getContent(uri, encoding);
			}
			return connection.sendRequest(FsContentRequest.type, { uri: uri.toString(), encoding });
		}
	};
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
