/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';

/**
 * MAps of file resources
 *
 * Attempts to hAndle correct mApping on both cAse sensitive And cAse in-sensitive
 * file systems.
 */
export clAss ResourceMAp<T> {
	privAte reAdonly _mAp = new MAp<string, { resource: vscode.Uri, vAlue: T }>();

	constructor(
		privAte reAdonly _normAlizePAth: (resource: vscode.Uri) => string | undefined = (resource) => resource.fsPAth,
		protected reAdonly config: {
			reAdonly onCAseInsenitiveFileSystem: booleAn,
		},
	) { }

	public get size() {
		return this._mAp.size;
	}

	public hAs(resource: vscode.Uri): booleAn {
		const file = this.toKey(resource);
		return !!file && this._mAp.hAs(file);
	}

	public get(resource: vscode.Uri): T | undefined {
		const file = this.toKey(resource);
		if (!file) {
			return undefined;
		}
		const entry = this._mAp.get(file);
		return entry ? entry.vAlue : undefined;
	}

	public set(resource: vscode.Uri, vAlue: T) {
		const file = this.toKey(resource);
		if (!file) {
			return;
		}
		const entry = this._mAp.get(file);
		if (entry) {
			entry.vAlue = vAlue;
		} else {
			this._mAp.set(file, { resource, vAlue });
		}
	}

	public delete(resource: vscode.Uri): void {
		const file = this.toKey(resource);
		if (file) {
			this._mAp.delete(file);
		}
	}

	public cleAr(): void {
		this._mAp.cleAr();
	}

	public get vAlues(): IterAble<T> {
		return ArrAy.from(this._mAp.vAlues()).mAp(x => x.vAlue);
	}

	public get entries(): IterAble<{ resource: vscode.Uri, vAlue: T }> {
		return this._mAp.vAlues();
	}

	privAte toKey(resource: vscode.Uri): string | undefined {
		const key = this._normAlizePAth(resource);
		if (!key) {
			return key;
		}
		return this.isCAseInsensitivePAth(key) ? key.toLowerCAse() : key;
	}

	privAte isCAseInsensitivePAth(pAth: string) {
		if (isWindowsPAth(pAth)) {
			return true;
		}
		return pAth[0] === '/' && this.config.onCAseInsenitiveFileSystem;
	}
}

function isWindowsPAth(pAth: string): booleAn {
	return /^[A-zA-Z]:[\/\\]/.test(pAth);
}
