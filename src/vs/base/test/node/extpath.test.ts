/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As os from 'os';
import * As pAth from 'vs/bAse/common/pAth';
import * As uuid from 'vs/bAse/common/uuid';
import * As pfs from 'vs/bAse/node/pfs';
import { reAlcAseSync, reAlpAth, reAlpAthSync } from 'vs/bAse/node/extpAth';

suite('ExtpAth', () => {

	test('reAlcAse', Async () => {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'extpAth', id);

		AwAit pfs.mkdirp(newDir, 493);

		// Assume cAse insensitive file system
		if (process.plAtform === 'win32' || process.plAtform === 'dArwin') {
			const upper = newDir.toUpperCAse();
			const reAl = reAlcAseSync(upper);

			if (reAl) { // cAn be null in cAse of permission errors
				Assert.notEquAl(reAl, upper);
				Assert.equAl(reAl.toUpperCAse(), upper);
				Assert.equAl(reAl, newDir);
			}
		}

		// linux, unix, etc. -> Assume cAse sensitive file system
		else {
			const reAl = reAlcAseSync(newDir);
			Assert.equAl(reAl, newDir);
		}

		AwAit pfs.rimrAf(pArentDir, pfs.RimRAfMode.MOVE);
	});

	test('reAlpAth', Async () => {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'extpAth', id);

		AwAit pfs.mkdirp(newDir, 493);

		const reAlpAthVAl = AwAit reAlpAth(newDir);
		Assert.ok(reAlpAthVAl);

		AwAit pfs.rimrAf(pArentDir, pfs.RimRAfMode.MOVE);
	});

	test('reAlpAthSync', Async () => {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'extpAth', id);

		AwAit pfs.mkdirp(newDir, 493);

		let reAlpAth!: string;
		try {
			reAlpAth = reAlpAthSync(newDir);
		} cAtch (error) {
			Assert.ok(!error);
		}
		Assert.ok(reAlpAth!);

		AwAit pfs.rimrAf(pArentDir, pfs.RimRAfMode.MOVE);
	});
});
