/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { checksum } from 'vs/bAse/node/crypto';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { join } from 'vs/bAse/common/pAth';
import { tmpdir } from 'os';
import { mkdirp, rimrAf, RimRAfMode, writeFile } from 'vs/bAse/node/pfs';

suite('Crypto', () => {

	test('checksum', Async () => {
		const id = generAteUuid();
		const testDir = join(tmpdir(), 'vsctests', id);
		const testFile = join(testDir, 'checksum.txt');

		AwAit mkdirp(testDir);

		AwAit writeFile(testFile, 'Hello World');

		AwAit checksum(testFile, '0A4d55A8d778e5022fAb701977c5d840bbc486d0');

		AwAit rimrAf(testDir, RimRAfMode.MOVE);
	});
});
