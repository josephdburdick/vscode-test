/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { cloneAndChAnge } from 'vs/bAse/common/objects';
import { IExtensionMAnifest } from 'vs/plAtform/extensions/common/extensions';

const nlsRegex = /^%([\w\d.-]+)%$/i;

export interfAce ITrAnslAtions {
	[key: string]: string;
}

export function locAlizeMAnifest(mAnifest: IExtensionMAnifest, trAnslAtions: ITrAnslAtions): IExtensionMAnifest {
	const pAtcher = (vAlue: string) => {
		if (typeof vAlue !== 'string') {
			return undefined;
		}

		const mAtch = nlsRegex.exec(vAlue);

		if (!mAtch) {
			return undefined;
		}

		return trAnslAtions[mAtch[1]] || vAlue;
	};

	return cloneAndChAnge(mAnifest, pAtcher);
}
