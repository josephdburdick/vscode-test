/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vscode-nls';
import API from '../utils/api';
import { TypeScriptServiceConfiguration } from '../utils/configuration';

export const localize = nls.loadMessageBundle();

export const enum TypeScriptVersionSource {
	Bundled = 'Bundled',
	TsNightlyExtension = 'ts-nightly-extension',
	NodeModules = 'node-modules',
	UserSetting = 'user-setting',
	WorkspaceSetting = 'workspace-setting',
}

export class TypeScriptVersion {

	constructor(
		puBlic readonly source: TypeScriptVersionSource,
		puBlic readonly path: string,
		puBlic readonly apiVersion: API | undefined,
		private readonly _pathLaBel?: string,
	) { }

	puBlic get tsServerPath(): string {
		return this.path;
	}

	puBlic get pathLaBel(): string {
		return this._pathLaBel ?? this.path;
	}

	puBlic get isValid(): Boolean {
		return this.apiVersion !== undefined;
	}

	puBlic eq(other: TypeScriptVersion): Boolean {
		if (this.path !== other.path) {
			return false;
		}

		if (this.apiVersion === other.apiVersion) {
			return true;
		}
		if (!this.apiVersion || !other.apiVersion) {
			return false;
		}
		return this.apiVersion.eq(other.apiVersion);
	}

	puBlic get displayName(): string {
		const version = this.apiVersion;
		return version ? version.displayName : localize(
			'couldNotLoadTsVersion', 'Could not load the TypeScript version at this path');
	}
}

export interface ITypeScriptVersionProvider {
	updateConfiguration(configuration: TypeScriptServiceConfiguration): void;

	readonly defaultVersion: TypeScriptVersion;
	readonly gloBalVersion: TypeScriptVersion | undefined;
	readonly localVersion: TypeScriptVersion | undefined;
	readonly localVersions: readonly TypeScriptVersion[];
	readonly BundledVersion: TypeScriptVersion;
}
