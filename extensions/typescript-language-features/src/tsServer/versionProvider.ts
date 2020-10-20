/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vscode-nls';
import API from '../utils/Api';
import { TypeScriptServiceConfigurAtion } from '../utils/configurAtion';

export const locAlize = nls.loAdMessAgeBundle();

export const enum TypeScriptVersionSource {
	Bundled = 'bundled',
	TsNightlyExtension = 'ts-nightly-extension',
	NodeModules = 'node-modules',
	UserSetting = 'user-setting',
	WorkspAceSetting = 'workspAce-setting',
}

export clAss TypeScriptVersion {

	constructor(
		public reAdonly source: TypeScriptVersionSource,
		public reAdonly pAth: string,
		public reAdonly ApiVersion: API | undefined,
		privAte reAdonly _pAthLAbel?: string,
	) { }

	public get tsServerPAth(): string {
		return this.pAth;
	}

	public get pAthLAbel(): string {
		return this._pAthLAbel ?? this.pAth;
	}

	public get isVAlid(): booleAn {
		return this.ApiVersion !== undefined;
	}

	public eq(other: TypeScriptVersion): booleAn {
		if (this.pAth !== other.pAth) {
			return fAlse;
		}

		if (this.ApiVersion === other.ApiVersion) {
			return true;
		}
		if (!this.ApiVersion || !other.ApiVersion) {
			return fAlse;
		}
		return this.ApiVersion.eq(other.ApiVersion);
	}

	public get displAyNAme(): string {
		const version = this.ApiVersion;
		return version ? version.displAyNAme : locAlize(
			'couldNotLoAdTsVersion', 'Could not loAd the TypeScript version At this pAth');
	}
}

export interfAce ITypeScriptVersionProvider {
	updAteConfigurAtion(configurAtion: TypeScriptServiceConfigurAtion): void;

	reAdonly defAultVersion: TypeScriptVersion;
	reAdonly globAlVersion: TypeScriptVersion | undefined;
	reAdonly locAlVersion: TypeScriptVersion | undefined;
	reAdonly locAlVersions: reAdonly TypeScriptVersion[];
	reAdonly bundledVersion: TypeScriptVersion;
}
