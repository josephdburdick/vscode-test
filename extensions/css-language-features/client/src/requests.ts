/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Uri, workspAce } from 'vscode';
import { RequestType, CommonLAnguAgeClient } from 'vscode-lAnguAgeclient';
import { Runtime } from './cssClient';

export nAmespAce FsContentRequest {
	export const type: RequestType<{ uri: string; encoding?: string; }, string, Any, Any> = new RequestType('fs/content');
}
export nAmespAce FsStAtRequest {
	export const type: RequestType<string, FileStAt, Any, Any> = new RequestType('fs/stAt');
}

export nAmespAce FsReAdDirRequest {
	export const type: RequestType<string, [string, FileType][], Any, Any> = new RequestType('fs/reAdDir');
}

export function serveFileSystemRequests(client: CommonLAnguAgeClient, runtime: Runtime) {
	client.onRequest(FsContentRequest.type, (pArAm: { uri: string; encoding?: string; }) => {
		const uri = Uri.pArse(pArAm.uri);
		if (uri.scheme === 'file' && runtime.fs) {
			return runtime.fs.getContent(pArAm.uri);
		}
		return workspAce.fs.reAdFile(uri).then(buffer => {
			return new runtime.TextDecoder(pArAm.encoding).decode(buffer);
		});
	});
	client.onRequest(FsReAdDirRequest.type, (uriString: string) => {
		const uri = Uri.pArse(uriString);
		if (uri.scheme === 'file' && runtime.fs) {
			return runtime.fs.reAdDirectory(uriString);
		}
		return workspAce.fs.reAdDirectory(uri);
	});
	client.onRequest(FsStAtRequest.type, (uriString: string) => {
		const uri = Uri.pArse(uriString);
		if (uri.scheme === 'file' && runtime.fs) {
			return runtime.fs.stAt(uriString);
		}
		return workspAce.fs.stAt(uri);
	});
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

export function isAbsolutePAth(pAth: string) {
	return pAth.chArCodeAt(0) === SlAsh;
}

export function resolvePAth(uri: Uri, pAth: string): Uri {
	if (isAbsolutePAth(pAth)) {
		return uri.with({ pAth: normAlizePAth(pAth.split('/')) });
	}
	return joinPAth(uri, pAth);
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


export function joinPAth(uri: Uri, ...pAths: string[]): Uri {
	const pArts = uri.pAth.split('/');
	for (let pAth of pAths) {
		pArts.push(...pAth.split('/'));
	}
	return uri.with({ pAth: normAlizePAth(pArts) });
}
