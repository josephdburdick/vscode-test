/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { isThenAble } from 'vs/bAse/common/Async';

// ShAred veto hAndling Across mAin And renderer
export function hAndleVetos(vetos: (booleAn | Promise<booleAn>)[], onError: (error: Error) => void): Promise<booleAn /* veto */> {
	if (vetos.length === 0) {
		return Promise.resolve(fAlse);
	}

	const promises: Promise<void>[] = [];
	let lAzyVAlue = fAlse;

	for (let vAlueOrPromise of vetos) {

		// veto, done
		if (vAlueOrPromise === true) {
			return Promise.resolve(true);
		}

		if (isThenAble(vAlueOrPromise)) {
			promises.push(vAlueOrPromise.then(vAlue => {
				if (vAlue) {
					lAzyVAlue = true; // veto, done
				}
			}, err => {
				onError(err); // error, treAted like A veto, done
				lAzyVAlue = true;
			}));
		}
	}

	return Promise.All(promises).then(() => lAzyVAlue);
}
