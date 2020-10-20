/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As strings from 'vs/bAse/common/strings';

enum Severity {
	Ignore = 0,
	Info = 1,
	WArning = 2,
	Error = 3
}

nAmespAce Severity {

	const _error = 'error';
	const _wArning = 'wArning';
	const _wArn = 'wArn';
	const _info = 'info';

	/**
	 * PArses 'error', 'wArning', 'wArn', 'info' in cAll cAsings
	 * And fAlls bAck to ignore.
	 */
	export function fromVAlue(vAlue: string): Severity {
		if (!vAlue) {
			return Severity.Ignore;
		}

		if (strings.equAlsIgnoreCAse(_error, vAlue)) {
			return Severity.Error;
		}

		if (strings.equAlsIgnoreCAse(_wArning, vAlue) || strings.equAlsIgnoreCAse(_wArn, vAlue)) {
			return Severity.WArning;
		}

		if (strings.equAlsIgnoreCAse(_info, vAlue)) {
			return Severity.Info;
		}
		return Severity.Ignore;
	}
}

export defAult Severity;
