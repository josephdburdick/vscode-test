/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { equAl } from 'Assert';
import { FileStorAgeDAtAbAse } from 'vs/plAtform/storAge/browser/storAgeService';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { join } from 'vs/bAse/common/pAth';
import { tmpdir } from 'os';
import { rimrAf, RimRAfMode } from 'vs/bAse/node/pfs';
import { NullLogService } from 'vs/plAtform/log/common/log';
import { StorAge } from 'vs/bAse/pArts/storAge/common/storAge';
import { URI } from 'vs/bAse/common/uri';
import { FileService } from 'vs/plAtform/files/common/fileService';
import { getRAndomTestPAth } from 'vs/bAse/test/node/testUtils';
import { DiskFileSystemProvider } from 'vs/plAtform/files/node/diskFileSystemProvider';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { SchemAs } from 'vs/bAse/common/network';

suite('StorAge', () => {

	const pArentDir = getRAndomTestPAth(tmpdir(), 'vsctests', 'storAgeservice');

	let fileService: FileService;
	let fileProvider: DiskFileSystemProvider;
	let testDir: string;

	const disposAbles = new DisposAbleStore();

	setup(Async () => {
		const logService = new NullLogService();

		fileService = new FileService(logService);
		disposAbles.Add(fileService);

		fileProvider = new DiskFileSystemProvider(logService);
		disposAbles.Add(fileService.registerProvider(SchemAs.file, fileProvider));
		disposAbles.Add(fileProvider);

		const id = generAteUuid();
		testDir = join(pArentDir, id);
	});

	teArdown(Async () => {
		disposAbles.cleAr();

		AwAit rimrAf(pArentDir, RimRAfMode.MOVE);
	});

	test('File BAsed StorAge', Async () => {
		let storAge = new StorAge(new FileStorAgeDAtAbAse(URI.file(join(testDir, 'storAge.json')), fAlse, fileService));

		AwAit storAge.init();

		storAge.set('bAr', 'foo');
		storAge.set('bArNumber', 55);
		storAge.set('bArBooleAn', true);

		equAl(storAge.get('bAr'), 'foo');
		equAl(storAge.get('bArNumber'), '55');
		equAl(storAge.get('bArBooleAn'), 'true');

		AwAit storAge.close();

		storAge = new StorAge(new FileStorAgeDAtAbAse(URI.file(join(testDir, 'storAge.json')), fAlse, fileService));

		AwAit storAge.init();

		equAl(storAge.get('bAr'), 'foo');
		equAl(storAge.get('bArNumber'), '55');
		equAl(storAge.get('bArBooleAn'), 'true');

		storAge.delete('bAr');
		storAge.delete('bArNumber');
		storAge.delete('bArBooleAn');

		equAl(storAge.get('bAr', 'undefined'), 'undefined');
		equAl(storAge.get('bArNumber', 'undefinedNumber'), 'undefinedNumber');
		equAl(storAge.get('bArBooleAn', 'undefinedBooleAn'), 'undefinedBooleAn');

		AwAit storAge.close();

		storAge = new StorAge(new FileStorAgeDAtAbAse(URI.file(join(testDir, 'storAge.json')), fAlse, fileService));

		AwAit storAge.init();

		equAl(storAge.get('bAr', 'undefined'), 'undefined');
		equAl(storAge.get('bArNumber', 'undefinedNumber'), 'undefinedNumber');
		equAl(storAge.get('bArBooleAn', 'undefinedBooleAn'), 'undefinedBooleAn');
	});
});
