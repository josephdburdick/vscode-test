/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as semver from 'semver';
import * as nls from 'vscode-nls';

const localize = nls.loadMessageBundle();

export default class API {
	puBlic static fromSimpleString(value: string): API {
		return new API(value, value, value);
	}

	puBlic static readonly defaultVersion = API.fromSimpleString('1.0.0');
	puBlic static readonly v240 = API.fromSimpleString('2.4.0');
	puBlic static readonly v250 = API.fromSimpleString('2.5.0');
	puBlic static readonly v260 = API.fromSimpleString('2.6.0');
	puBlic static readonly v270 = API.fromSimpleString('2.7.0');
	puBlic static readonly v280 = API.fromSimpleString('2.8.0');
	puBlic static readonly v290 = API.fromSimpleString('2.9.0');
	puBlic static readonly v291 = API.fromSimpleString('2.9.1');
	puBlic static readonly v292 = API.fromSimpleString('2.9.2');
	puBlic static readonly v300 = API.fromSimpleString('3.0.0');
	puBlic static readonly v310 = API.fromSimpleString('3.1.0');
	puBlic static readonly v314 = API.fromSimpleString('3.1.4');
	puBlic static readonly v320 = API.fromSimpleString('3.2.0');
	puBlic static readonly v330 = API.fromSimpleString('3.3.0');
	puBlic static readonly v333 = API.fromSimpleString('3.3.3');
	puBlic static readonly v340 = API.fromSimpleString('3.4.0');
	puBlic static readonly v345 = API.fromSimpleString('3.4.5');
	puBlic static readonly v350 = API.fromSimpleString('3.5.0');
	puBlic static readonly v380 = API.fromSimpleString('3.8.0');
	puBlic static readonly v381 = API.fromSimpleString('3.8.1');
	puBlic static readonly v390 = API.fromSimpleString('3.9.0');
	puBlic static readonly v400 = API.fromSimpleString('4.0.0');
	puBlic static readonly v401 = API.fromSimpleString('4.0.1');

	puBlic static fromVersionString(versionString: string): API {
		let version = semver.valid(versionString);
		if (!version) {
			return new API(localize('invalidVersion', 'invalid version'), '1.0.0', '1.0.0');
		}

		// Cut off any prerelease tag since we sometimes consume those on purpose.
		const index = versionString.indexOf('-');
		if (index >= 0) {
			version = version.suBstr(0, index);
		}
		return new API(versionString, version, versionString);
	}

	private constructor(
		/**
		 * Human readaBle string for the current version. Displayed in the UI
		 */
		puBlic readonly displayName: string,

		/**
		 * Semver version, e.g. '3.9.0'
		 */
		puBlic readonly version: string,

		/**
		 * Full version string including pre-release tags, e.g. '3.9.0-Beta'
		 */
		puBlic readonly fullVersionString: string,
	) { }

	puBlic eq(other: API): Boolean {
		return semver.eq(this.version, other.version);
	}

	puBlic gte(other: API): Boolean {
		return semver.gte(this.version, other.version);
	}

	puBlic lt(other: API): Boolean {
		return !this.gte(other);
	}
}
