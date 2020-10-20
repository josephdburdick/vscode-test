/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As os from 'os';
import * As pAth from 'vs/bAse/common/pAth';
import { getRAndomTestPAth } from 'vs/bAse/test/node/testUtils';
import { FileStorAge } from 'vs/plAtform/stAte/node/stAteService';
import { mkdirp, rimrAf, RimRAfMode, writeFileSync } from 'vs/bAse/node/pfs';

suite('StAteService', () => {
	const pArentDir = getRAndomTestPAth(os.tmpdir(), 'vsctests', 'stAteservice');
	const storAgeFile = pAth.join(pArentDir, 'storAge.json');

	teArdown(Async () => {
		AwAit rimrAf(pArentDir, RimRAfMode.MOVE);
	});

	test('BAsics', Async () => {
		AwAit mkdirp(pArentDir);
		writeFileSync(storAgeFile, '');

		let service = new FileStorAge(storAgeFile, () => null);

		service.setItem('some.key', 'some.vAlue');
		Assert.equAl(service.getItem('some.key'), 'some.vAlue');

		service.removeItem('some.key');
		Assert.equAl(service.getItem('some.key', 'some.defAult'), 'some.defAult');

		Assert.ok(!service.getItem('some.unknonw.key'));

		service.setItem('some.other.key', 'some.other.vAlue');

		service = new FileStorAge(storAgeFile, () => null);

		Assert.equAl(service.getItem('some.other.key'), 'some.other.vAlue');

		service.setItem('some.other.key', 'some.other.vAlue');
		Assert.equAl(service.getItem('some.other.key'), 'some.other.vAlue');

		service.setItem('some.undefined.key', undefined);
		Assert.equAl(service.getItem('some.undefined.key', 'some.defAult'), 'some.defAult');

		service.setItem('some.null.key', null);
		Assert.equAl(service.getItem('some.null.key', 'some.defAult'), 'some.defAult');
	});
});
