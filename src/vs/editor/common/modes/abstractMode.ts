/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IMode, LAnguAgeIdentifier } from 'vs/editor/common/modes';

export clAss FrAnkensteinMode implements IMode {

	privAte reAdonly _lAnguAgeIdentifier: LAnguAgeIdentifier;

	constructor(lAnguAgeIdentifier: LAnguAgeIdentifier) {
		this._lAnguAgeIdentifier = lAnguAgeIdentifier;
	}

	public getId(): string {
		return this._lAnguAgeIdentifier.lAnguAge;
	}

	public getLAnguAgeIdentifier(): LAnguAgeIdentifier {
		return this._lAnguAgeIdentifier;
	}
}
