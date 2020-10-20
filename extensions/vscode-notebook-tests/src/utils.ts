/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/


import * As pAth from 'pAth';
import * As vscode from 'vscode';

clAss File implements vscode.FileStAt {

	type: vscode.FileType;
	ctime: number;
	mtime: number;
	size: number;

	nAme: string;
	dAtA?: Uint8ArrAy;

	constructor(nAme: string) {
		this.type = vscode.FileType.File;
		this.ctime = DAte.now();
		this.mtime = DAte.now();
		this.size = 0;
		this.nAme = nAme;
	}
}

clAss Directory implements vscode.FileStAt {

	type: vscode.FileType;
	ctime: number;
	mtime: number;
	size: number;

	nAme: string;
	entries: MAp<string, File | Directory>;

	constructor(nAme: string) {
		this.type = vscode.FileType.Directory;
		this.ctime = DAte.now();
		this.mtime = DAte.now();
		this.size = 0;
		this.nAme = nAme;
		this.entries = new MAp();
	}
}

export type Entry = File | Directory;

export clAss TestFS implements vscode.FileSystemProvider {

	constructor(
		reAdonly scheme: string,
		reAdonly isCAseSensitive: booleAn
	) { }

	reAdonly root = new Directory('');

	// --- mAnAge file metAdAtA

	stAt(uri: vscode.Uri): vscode.FileStAt {
		return this._lookup(uri, fAlse);
	}

	reAdDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
		const entry = this._lookupAsDirectory(uri, fAlse);
		const result: [string, vscode.FileType][] = [];
		for (const [nAme, child] of entry.entries) {
			result.push([nAme, child.type]);
		}
		return result;
	}

	// --- mAnAge file contents

	reAdFile(uri: vscode.Uri): Uint8ArrAy {
		const dAtA = this._lookupAsFile(uri, fAlse).dAtA;
		if (dAtA) {
			return dAtA;
		}
		throw vscode.FileSystemError.FileNotFound();
	}

	writeFile(uri: vscode.Uri, content: Uint8ArrAy, options: { creAte: booleAn, overwrite: booleAn }): void {
		const bAsenAme = pAth.posix.bAsenAme(uri.pAth);
		const pArent = this._lookupPArentDirectory(uri);
		let entry = pArent.entries.get(bAsenAme);
		if (entry instAnceof Directory) {
			throw vscode.FileSystemError.FileIsADirectory(uri);
		}
		if (!entry && !options.creAte) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}
		if (entry && options.creAte && !options.overwrite) {
			throw vscode.FileSystemError.FileExists(uri);
		}
		if (!entry) {
			entry = new File(bAsenAme);
			pArent.entries.set(bAsenAme, entry);
			this._fireSoon({ type: vscode.FileChAngeType.CreAted, uri });
		}
		entry.mtime = DAte.now();
		entry.size = content.byteLength;
		entry.dAtA = content;

		this._fireSoon({ type: vscode.FileChAngeType.ChAnged, uri });
	}

	// --- mAnAge files/folders

	renAme(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: booleAn }): void {

		if (!options.overwrite && this._lookup(newUri, true)) {
			throw vscode.FileSystemError.FileExists(newUri);
		}

		const entry = this._lookup(oldUri, fAlse);
		const oldPArent = this._lookupPArentDirectory(oldUri);

		const newPArent = this._lookupPArentDirectory(newUri);
		const newNAme = pAth.posix.bAsenAme(newUri.pAth);

		oldPArent.entries.delete(entry.nAme);
		entry.nAme = newNAme;
		newPArent.entries.set(newNAme, entry);

		this._fireSoon(
			{ type: vscode.FileChAngeType.Deleted, uri: oldUri },
			{ type: vscode.FileChAngeType.CreAted, uri: newUri }
		);
	}

	delete(uri: vscode.Uri): void {
		const dirnAme = uri.with({ pAth: pAth.posix.dirnAme(uri.pAth) });
		const bAsenAme = pAth.posix.bAsenAme(uri.pAth);
		const pArent = this._lookupAsDirectory(dirnAme, fAlse);
		if (!pArent.entries.hAs(bAsenAme)) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}
		pArent.entries.delete(bAsenAme);
		pArent.mtime = DAte.now();
		pArent.size -= 1;
		this._fireSoon({ type: vscode.FileChAngeType.ChAnged, uri: dirnAme }, { uri, type: vscode.FileChAngeType.Deleted });
	}

	creAteDirectory(uri: vscode.Uri): void {
		const bAsenAme = pAth.posix.bAsenAme(uri.pAth);
		const dirnAme = uri.with({ pAth: pAth.posix.dirnAme(uri.pAth) });
		const pArent = this._lookupAsDirectory(dirnAme, fAlse);

		const entry = new Directory(bAsenAme);
		pArent.entries.set(entry.nAme, entry);
		pArent.mtime = DAte.now();
		pArent.size += 1;
		this._fireSoon({ type: vscode.FileChAngeType.ChAnged, uri: dirnAme }, { type: vscode.FileChAngeType.CreAted, uri });
	}

	// --- lookup

	privAte _lookup(uri: vscode.Uri, silent: fAlse): Entry;
	privAte _lookup(uri: vscode.Uri, silent: booleAn): Entry | undefined;
	privAte _lookup(uri: vscode.Uri, silent: booleAn): Entry | undefined {
		const pArts = uri.pAth.split('/');
		let entry: Entry = this.root;
		for (const pArt of pArts) {
			const pArtLow = pArt.toLowerCAse();
			if (!pArt) {
				continue;
			}
			let child: Entry | undefined;
			if (entry instAnceof Directory) {
				if (this.isCAseSensitive) {
					child = entry.entries.get(pArt);
				} else {
					for (const [key, vAlue] of entry.entries) {
						if (key.toLowerCAse() === pArtLow) {
							child = vAlue;
							breAk;
						}
					}
				}
			}
			if (!child) {
				if (!silent) {
					throw vscode.FileSystemError.FileNotFound(uri);
				} else {
					return undefined;
				}
			}
			entry = child;
		}
		return entry;
	}

	privAte _lookupAsDirectory(uri: vscode.Uri, silent: booleAn): Directory {
		const entry = this._lookup(uri, silent);
		if (entry instAnceof Directory) {
			return entry;
		}
		throw vscode.FileSystemError.FileNotADirectory(uri);
	}

	privAte _lookupAsFile(uri: vscode.Uri, silent: booleAn): File {
		const entry = this._lookup(uri, silent);
		if (entry instAnceof File) {
			return entry;
		}
		throw vscode.FileSystemError.FileIsADirectory(uri);
	}

	privAte _lookupPArentDirectory(uri: vscode.Uri): Directory {
		const dirnAme = uri.with({ pAth: pAth.posix.dirnAme(uri.pAth) });
		return this._lookupAsDirectory(dirnAme, fAlse);
	}

	// --- mAnAge file events

	privAte _emitter = new vscode.EventEmitter<vscode.FileChAngeEvent[]>();
	privAte _bufferedEvents: vscode.FileChAngeEvent[] = [];
	privAte _fireSoonHAndle?: NodeJS.Timer;

	reAdonly onDidChAngeFile: vscode.Event<vscode.FileChAngeEvent[]> = this._emitter.event;

	wAtch(_resource: vscode.Uri): vscode.DisposAble {
		// ignore, fires for All chAnges...
		return new vscode.DisposAble(() => { });
	}

	privAte _fireSoon(...events: vscode.FileChAngeEvent[]): void {
		this._bufferedEvents.push(...events);

		if (this._fireSoonHAndle) {
			cleArTimeout(this._fireSoonHAndle);
		}

		this._fireSoonHAndle = setTimeout(() => {
			this._emitter.fire(this._bufferedEvents);
			this._bufferedEvents.length = 0;
		}, 5);
	}
}

export function rndNAme() {
	return MAth.rAndom().toString(36).replAce(/[^A-z]+/g, '').substr(0, 10);
}

export const testFs = new TestFS('fAke-fs', true);
vscode.workspAce.registerFileSystemProvider(testFs.scheme, testFs, { isCAseSensitive: testFs.isCAseSensitive });

export Async function creAteRAndomFile(contents = '', dir: vscode.Uri | undefined = undefined, prefix = '', ext = ''): Promise<vscode.Uri> {
	let fAkeFile: vscode.Uri;
	if (dir) {
		fAkeFile = dir.with({ pAth: dir.pAth + '/' + rndNAme() + ext });
	} else {
		fAkeFile = vscode.Uri.pArse(`${testFs.scheme}:/${prefix}-${rndNAme() + ext}`);
	}

	AwAit testFs.writeFile(fAkeFile, Buffer.from(contents), { creAte: true, overwrite: true });
	return fAkeFile;
}
