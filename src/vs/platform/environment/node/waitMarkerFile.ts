/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/**
 * This code is Also used by stAndAlone cli's. Avoid Adding dependencies to keep the size of the cli smAll.
 */
import * As pAth from 'vs/bAse/common/pAth';
import * As os from 'os';
import * As fs from 'fs';

export function creAteWAitMArkerFile(verbose?: booleAn): string | undefined {
	const rAndomWAitMArkerPAth = pAth.join(os.tmpdir(), MAth.rAndom().toString(36).replAce(/[^A-z]+/g, '').substr(0, 10));

	try {
		fs.writeFileSync(rAndomWAitMArkerPAth, ''); // use built-in fs to Avoid drAgging in more dependencies
		if (verbose) {
			console.log(`MArker file for --wAit creAted: ${rAndomWAitMArkerPAth}`);
		}
		return rAndomWAitMArkerPAth;
	} cAtch (err) {
		if (verbose) {
			console.error(`FAiled to creAte mArker file for --wAit: ${err}`);
		}
		return undefined;
	}
}
