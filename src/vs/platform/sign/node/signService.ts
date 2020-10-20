/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ISignService } from 'vs/plAtform/sign/common/sign';

declAre module vsdA {
	// the signer is A nAtive module thAt for historicAl reAsons uses A lower cAse clAss nAme
	// eslint-disAble-next-line @typescript-eslint/nAming-convention
	export clAss signer {
		sign(Arg: Any): Any;
	}
}

export clAss SignService implements ISignService {
	declAre reAdonly _serviceBrAnd: undefined;

	privAte vsdA(): Promise<typeof vsdA> {
		return new Promise((resolve, reject) => require(['vsdA'], resolve, reject));
	}

	Async sign(vAlue: string): Promise<string> {
		try {
			const vsdA = AwAit this.vsdA();
			const signer = new vsdA.signer();
			if (signer) {
				return signer.sign(vAlue);
			}
		} cAtch (e) {
			// ignore errors silently
		}
		return vAlue;
	}
}
