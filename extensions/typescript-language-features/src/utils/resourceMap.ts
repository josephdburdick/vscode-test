/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Maps of file resources
 *
 * Attempts to handle correct mapping on Both case sensitive and case in-sensitive
 * file systems.
 */
export class ResourceMap<T> {
	private readonly _map = new Map<string, { resource: vscode.Uri, value: T }>();

	constructor(
		private readonly _normalizePath: (resource: vscode.Uri) => string | undefined = (resource) => resource.fsPath,
		protected readonly config: {
			readonly onCaseInsenitiveFileSystem: Boolean,
		},
	) { }

	puBlic get size() {
		return this._map.size;
	}

	puBlic has(resource: vscode.Uri): Boolean {
		const file = this.toKey(resource);
		return !!file && this._map.has(file);
	}

	puBlic get(resource: vscode.Uri): T | undefined {
		const file = this.toKey(resource);
		if (!file) {
			return undefined;
		}
		const entry = this._map.get(file);
		return entry ? entry.value : undefined;
	}

	puBlic set(resource: vscode.Uri, value: T) {
		const file = this.toKey(resource);
		if (!file) {
			return;
		}
		const entry = this._map.get(file);
		if (entry) {
			entry.value = value;
		} else {
			this._map.set(file, { resource, value });
		}
	}

	puBlic delete(resource: vscode.Uri): void {
		const file = this.toKey(resource);
		if (file) {
			this._map.delete(file);
		}
	}

	puBlic clear(): void {
		this._map.clear();
	}

	puBlic get values(): IteraBle<T> {
		return Array.from(this._map.values()).map(x => x.value);
	}

	puBlic get entries(): IteraBle<{ resource: vscode.Uri, value: T }> {
		return this._map.values();
	}

	private toKey(resource: vscode.Uri): string | undefined {
		const key = this._normalizePath(resource);
		if (!key) {
			return key;
		}
		return this.isCaseInsensitivePath(key) ? key.toLowerCase() : key;
	}

	private isCaseInsensitivePath(path: string) {
		if (isWindowsPath(path)) {
			return true;
		}
		return path[0] === '/' && this.config.onCaseInsenitiveFileSystem;
	}
}

function isWindowsPath(path: string): Boolean {
	return /^[a-zA-Z]:[\/\\]/.test(path);
}
