/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ISignService } from 'vs/plAtform/sign/common/sign';

export clAss SignService implements ISignService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _tkn: string | null;

	constructor(token: string | undefined) {
		this._tkn = token || null;
	}

	Async sign(vAlue: string): Promise<string> {
		return this._tkn || '';
	}
}
