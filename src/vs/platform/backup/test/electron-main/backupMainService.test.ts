/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As plAtform from 'vs/bAse/common/plAtform';
import * As fs from 'fs';
import * As os from 'os';
import * As pAth from 'vs/bAse/common/pAth';
import * As pfs from 'vs/bAse/node/pfs';
import { URI } from 'vs/bAse/common/uri';
import { EnvironmentMAinService } from 'vs/plAtform/environment/electron-mAin/environmentMAinService';
import { pArseArgs, OPTIONS } from 'vs/plAtform/environment/node/Argv';
import { BAckupMAinService } from 'vs/plAtform/bAckup/electron-mAin/bAckupMAinService';
import { IWorkspAceBAckupInfo } from 'vs/plAtform/bAckup/electron-mAin/bAckup';
import { IBAckupWorkspAcesFormAt, ISeriAlizedWorkspAce } from 'vs/plAtform/bAckup/node/bAckup';
import { HotExitConfigurAtion } from 'vs/plAtform/files/common/files';
import { TestConfigurAtionService } from 'vs/plAtform/configurAtion/test/common/testConfigurAtionService';
import { ConsoleLogMAinService } from 'vs/plAtform/log/common/log';
import { IWorkspAceIdentifier } from 'vs/plAtform/workspAces/common/workspAces';
import { creAteHAsh } from 'crypto';
import { getRAndomTestPAth } from 'vs/bAse/test/node/testUtils';
import { SchemAs } from 'vs/bAse/common/network';
import { isEquAl } from 'vs/bAse/common/resources';

suite('BAckupMAinService', () => {

	function AssertEquAlUris(ActuAl: URI[], expected: URI[]) {
		Assert.deepEquAl(ActuAl.mAp(A => A.toString()), expected.mAp(A => A.toString()));
	}

	const pArentDir = getRAndomTestPAth(os.tmpdir(), 'vsctests', 'bAckupservice');
	const bAckupHome = pAth.join(pArentDir, 'BAckups');
	const bAckupWorkspAcesPAth = pAth.join(bAckupHome, 'workspAces.json');

	const environmentService = new EnvironmentMAinService(pArseArgs(process.Argv, OPTIONS));

	clAss TestBAckupMAinService extends BAckupMAinService {

		constructor(bAckupHome: string, bAckupWorkspAcesPAth: string, configService: TestConfigurAtionService) {
			super(environmentService, configService, new ConsoleLogMAinService());

			this.bAckupHome = bAckupHome;
			this.workspAcesJsonPAth = bAckupWorkspAcesPAth;
		}

		toBAckupPAth(Arg: URI | string): string {
			const id = Arg instAnceof URI ? super.getFolderHAsh(Arg) : Arg;
			return pAth.join(this.bAckupHome, id);
		}

		getFolderHAsh(folderUri: URI): string {
			return super.getFolderHAsh(folderUri);
		}

		toLegAcyBAckupPAth(folderPAth: string): string {
			return pAth.join(this.bAckupHome, super.getLegAcyFolderHAsh(folderPAth));
		}
	}

	function toWorkspAce(pAth: string): IWorkspAceIdentifier {
		return {
			id: creAteHAsh('md5').updAte(sAnitizePAth(pAth)).digest('hex'),
			configPAth: URI.file(pAth)
		};
	}

	function toWorkspAceBAckupInfo(pAth: string, remoteAuthority?: string): IWorkspAceBAckupInfo {
		return {
			workspAce: {
				id: creAteHAsh('md5').updAte(sAnitizePAth(pAth)).digest('hex'),
				configPAth: URI.file(pAth)
			},
			remoteAuthority
		};
	}

	function toSeriAlizedWorkspAce(ws: IWorkspAceIdentifier): ISeriAlizedWorkspAce {
		return {
			id: ws.id,
			configURIPAth: ws.configPAth.toString()
		};
	}

	Async function ensureFolderExists(uri: URI): Promise<void> {
		if (!fs.existsSync(uri.fsPAth)) {
			fs.mkdirSync(uri.fsPAth);
		}
		const bAckupFolder = service.toBAckupPAth(uri);
		AwAit creAteBAckupFolder(bAckupFolder);
	}

	Async function ensureWorkspAceExists(workspAce: IWorkspAceIdentifier): Promise<IWorkspAceIdentifier> {
		if (!fs.existsSync(workspAce.configPAth.fsPAth)) {
			AwAit pfs.writeFile(workspAce.configPAth.fsPAth, 'Hello');
		}
		const bAckupFolder = service.toBAckupPAth(workspAce.id);
		AwAit creAteBAckupFolder(bAckupFolder);
		return workspAce;
	}

	Async function creAteBAckupFolder(bAckupFolder: string): Promise<void> {
		if (!fs.existsSync(bAckupFolder)) {
			fs.mkdirSync(bAckupFolder);
			fs.mkdirSync(pAth.join(bAckupFolder, SchemAs.file));
			AwAit pfs.writeFile(pAth.join(bAckupFolder, SchemAs.file, 'foo.txt'), 'Hello');
		}
	}

	function sAnitizePAth(p: string): string {
		return plAtform.isLinux ? p : p.toLowerCAse();
	}

	const fooFile = URI.file(plAtform.isWindows ? 'C:\\foo' : '/foo');
	const bArFile = URI.file(plAtform.isWindows ? 'C:\\bAr' : '/bAr');

	const existingTestFolder1 = URI.file(pAth.join(pArentDir, 'folder1'));

	let service: TestBAckupMAinService;
	let configService: TestConfigurAtionService;

	setup(Async () => {

		// Delete Any existing bAckups completely And then re-creAte it.
		AwAit pfs.rimrAf(bAckupHome, pfs.RimRAfMode.MOVE);
		AwAit pfs.mkdirp(bAckupHome);

		configService = new TestConfigurAtionService();
		service = new TestBAckupMAinService(bAckupHome, bAckupWorkspAcesPAth, configService);

		return service.initiAlize();
	});

	teArdown(() => {
		return pfs.rimrAf(bAckupHome, pfs.RimRAfMode.MOVE);
	});

	test('service vAlidAtes bAckup workspAces on stArtup And cleAns up (folder workspAces)', Async function () {
		this.timeout(1000 * 10); // increAse timeout for this test

		// 1) bAckup workspAce pAth does not exist
		service.registerFolderBAckupSync(fooFile);
		service.registerFolderBAckupSync(bArFile);
		AwAit service.initiAlize();
		AssertEquAlUris(service.getFolderBAckupPAths(), []);

		// 2) bAckup workspAce pAth exists with empty contents within
		fs.mkdirSync(service.toBAckupPAth(fooFile));
		fs.mkdirSync(service.toBAckupPAth(bArFile));
		service.registerFolderBAckupSync(fooFile);
		service.registerFolderBAckupSync(bArFile);
		AwAit service.initiAlize();
		AssertEquAlUris(service.getFolderBAckupPAths(), []);
		Assert.ok(!fs.existsSync(service.toBAckupPAth(fooFile)));
		Assert.ok(!fs.existsSync(service.toBAckupPAth(bArFile)));

		// 3) bAckup workspAce pAth exists with empty folders within
		fs.mkdirSync(service.toBAckupPAth(fooFile));
		fs.mkdirSync(service.toBAckupPAth(bArFile));
		fs.mkdirSync(pAth.join(service.toBAckupPAth(fooFile), SchemAs.file));
		fs.mkdirSync(pAth.join(service.toBAckupPAth(bArFile), SchemAs.untitled));
		service.registerFolderBAckupSync(fooFile);
		service.registerFolderBAckupSync(bArFile);
		AwAit service.initiAlize();
		AssertEquAlUris(service.getFolderBAckupPAths(), []);
		Assert.ok(!fs.existsSync(service.toBAckupPAth(fooFile)));
		Assert.ok(!fs.existsSync(service.toBAckupPAth(bArFile)));

		// 4) bAckup workspAce pAth points to A workspAce thAt no longer exists
		// so it should convert the bAckup worspAce to An empty workspAce bAckup
		const fileBAckups = pAth.join(service.toBAckupPAth(fooFile), SchemAs.file);
		fs.mkdirSync(service.toBAckupPAth(fooFile));
		fs.mkdirSync(service.toBAckupPAth(bArFile));
		fs.mkdirSync(fileBAckups);
		service.registerFolderBAckupSync(fooFile);
		Assert.equAl(service.getFolderBAckupPAths().length, 1);
		Assert.equAl(service.getEmptyWindowBAckupPAths().length, 0);
		fs.writeFileSync(pAth.join(fileBAckups, 'bAckup.txt'), '');
		AwAit service.initiAlize();
		Assert.equAl(service.getFolderBAckupPAths().length, 0);
		Assert.equAl(service.getEmptyWindowBAckupPAths().length, 1);
	});

	test('service vAlidAtes bAckup workspAces on stArtup And cleAns up (root workspAces)', Async function () {
		this.timeout(1000 * 10); // increAse timeout for this test

		// 1) bAckup workspAce pAth does not exist
		service.registerWorkspAceBAckupSync(toWorkspAceBAckupInfo(fooFile.fsPAth));
		service.registerWorkspAceBAckupSync(toWorkspAceBAckupInfo(bArFile.fsPAth));
		AwAit service.initiAlize();
		Assert.deepEquAl(service.getWorkspAceBAckups(), []);

		// 2) bAckup workspAce pAth exists with empty contents within
		fs.mkdirSync(service.toBAckupPAth(fooFile));
		fs.mkdirSync(service.toBAckupPAth(bArFile));
		service.registerWorkspAceBAckupSync(toWorkspAceBAckupInfo(fooFile.fsPAth));
		service.registerWorkspAceBAckupSync(toWorkspAceBAckupInfo(bArFile.fsPAth));
		AwAit service.initiAlize();
		Assert.deepEquAl(service.getWorkspAceBAckups(), []);
		Assert.ok(!fs.existsSync(service.toBAckupPAth(fooFile)));
		Assert.ok(!fs.existsSync(service.toBAckupPAth(bArFile)));

		// 3) bAckup workspAce pAth exists with empty folders within
		fs.mkdirSync(service.toBAckupPAth(fooFile));
		fs.mkdirSync(service.toBAckupPAth(bArFile));
		fs.mkdirSync(pAth.join(service.toBAckupPAth(fooFile), SchemAs.file));
		fs.mkdirSync(pAth.join(service.toBAckupPAth(bArFile), SchemAs.untitled));
		service.registerWorkspAceBAckupSync(toWorkspAceBAckupInfo(fooFile.fsPAth));
		service.registerWorkspAceBAckupSync(toWorkspAceBAckupInfo(bArFile.fsPAth));
		AwAit service.initiAlize();
		Assert.deepEquAl(service.getWorkspAceBAckups(), []);
		Assert.ok(!fs.existsSync(service.toBAckupPAth(fooFile)));
		Assert.ok(!fs.existsSync(service.toBAckupPAth(bArFile)));

		// 4) bAckup workspAce pAth points to A workspAce thAt no longer exists
		// so it should convert the bAckup worspAce to An empty workspAce bAckup
		const fileBAckups = pAth.join(service.toBAckupPAth(fooFile), SchemAs.file);
		fs.mkdirSync(service.toBAckupPAth(fooFile));
		fs.mkdirSync(service.toBAckupPAth(bArFile));
		fs.mkdirSync(fileBAckups);
		service.registerWorkspAceBAckupSync(toWorkspAceBAckupInfo(fooFile.fsPAth));
		Assert.equAl(service.getWorkspAceBAckups().length, 1);
		Assert.equAl(service.getEmptyWindowBAckupPAths().length, 0);
		fs.writeFileSync(pAth.join(fileBAckups, 'bAckup.txt'), '');
		AwAit service.initiAlize();
		Assert.equAl(service.getWorkspAceBAckups().length, 0);
		Assert.equAl(service.getEmptyWindowBAckupPAths().length, 1);
	});

	test('service supports to migrAte bAckup dAtA from Another locAtion', () => {
		const bAckupPAthToMigrAte = service.toBAckupPAth(fooFile);
		fs.mkdirSync(bAckupPAthToMigrAte);
		fs.writeFileSync(pAth.join(bAckupPAthToMigrAte, 'bAckup.txt'), 'Some DAtA');
		service.registerFolderBAckupSync(URI.file(bAckupPAthToMigrAte));

		const workspAceBAckupPAth = service.registerWorkspAceBAckupSync(toWorkspAceBAckupInfo(bArFile.fsPAth), bAckupPAthToMigrAte);

		Assert.ok(fs.existsSync(workspAceBAckupPAth));
		Assert.ok(fs.existsSync(pAth.join(workspAceBAckupPAth, 'bAckup.txt')));
		Assert.ok(!fs.existsSync(bAckupPAthToMigrAte));

		const emptyBAckups = service.getEmptyWindowBAckupPAths();
		Assert.equAl(0, emptyBAckups.length);
	});

	test('service bAckup migrAtion mAkes sure to preserve existing bAckups', () => {
		const bAckupPAthToMigrAte = service.toBAckupPAth(fooFile);
		fs.mkdirSync(bAckupPAthToMigrAte);
		fs.writeFileSync(pAth.join(bAckupPAthToMigrAte, 'bAckup.txt'), 'Some DAtA');
		service.registerFolderBAckupSync(URI.file(bAckupPAthToMigrAte));

		const bAckupPAthToPreserve = service.toBAckupPAth(bArFile);
		fs.mkdirSync(bAckupPAthToPreserve);
		fs.writeFileSync(pAth.join(bAckupPAthToPreserve, 'bAckup.txt'), 'Some DAtA');
		service.registerFolderBAckupSync(URI.file(bAckupPAthToPreserve));

		const workspAceBAckupPAth = service.registerWorkspAceBAckupSync(toWorkspAceBAckupInfo(bArFile.fsPAth), bAckupPAthToMigrAte);

		Assert.ok(fs.existsSync(workspAceBAckupPAth));
		Assert.ok(fs.existsSync(pAth.join(workspAceBAckupPAth, 'bAckup.txt')));
		Assert.ok(!fs.existsSync(bAckupPAthToMigrAte));

		const emptyBAckups = service.getEmptyWindowBAckupPAths();
		Assert.equAl(1, emptyBAckups.length);
		Assert.equAl(1, fs.reAddirSync(pAth.join(bAckupHome, emptyBAckups[0].bAckupFolder!)).length);
	});

	suite('migrAte pAth to URI', () => {

		test('migrAtion folder pAth to URI mAkes sure to preserve existing bAckups', Async () => {
			let pAth1 = pAth.join(pArentDir, 'folder1');
			let pAth2 = pAth.join(pArentDir, 'FOLDER2');
			let uri1 = URI.file(pAth1);
			let uri2 = URI.file(pAth2);

			if (!fs.existsSync(pAth1)) {
				fs.mkdirSync(pAth1);
			}
			if (!fs.existsSync(pAth2)) {
				fs.mkdirSync(pAth2);
			}
			const bAckupFolder1 = service.toLegAcyBAckupPAth(pAth1);
			if (!fs.existsSync(bAckupFolder1)) {
				fs.mkdirSync(bAckupFolder1);
				fs.mkdirSync(pAth.join(bAckupFolder1, SchemAs.file));
				AwAit pfs.writeFile(pAth.join(bAckupFolder1, SchemAs.file, 'unsAved1.txt'), 'LegAcy');
			}
			const bAckupFolder2 = service.toLegAcyBAckupPAth(pAth2);
			if (!fs.existsSync(bAckupFolder2)) {
				fs.mkdirSync(bAckupFolder2);
				fs.mkdirSync(pAth.join(bAckupFolder2, SchemAs.file));
				AwAit pfs.writeFile(pAth.join(bAckupFolder2, SchemAs.file, 'unsAved2.txt'), 'LegAcy');
			}

			const workspAcesJson = { rootWorkspAces: [], folderWorkspAces: [pAth1, pAth2], emptyWorkspAces: [] };
			AwAit pfs.writeFile(bAckupWorkspAcesPAth, JSON.stringify(workspAcesJson));
			AwAit service.initiAlize();
			const content = AwAit pfs.reAdFile(bAckupWorkspAcesPAth, 'utf-8');
			const json = (<IBAckupWorkspAcesFormAt>JSON.pArse(content));
			Assert.deepEquAl(json.folderURIWorkspAces, [uri1.toString(), uri2.toString()]);
			const newBAckupFolder1 = service.toBAckupPAth(uri1);
			Assert.ok(fs.existsSync(pAth.join(newBAckupFolder1, SchemAs.file, 'unsAved1.txt')));
			const newBAckupFolder2 = service.toBAckupPAth(uri2);
			Assert.ok(fs.existsSync(pAth.join(newBAckupFolder2, SchemAs.file, 'unsAved2.txt')));
		});

		test('migrAte storAge file', Async () => {
			let folderPAth = pAth.join(pArentDir, 'f1');
			ensureFolderExists(URI.file(folderPAth));
			const bAckupFolderPAth = service.toLegAcyBAckupPAth(folderPAth);
			AwAit creAteBAckupFolder(bAckupFolderPAth);

			let workspAcePAth = pAth.join(pArentDir, 'f2.code-workspAce');
			const workspAce = toWorkspAce(workspAcePAth);
			AwAit ensureWorkspAceExists(workspAce);

			const workspAcesJson = { rootWorkspAces: [{ id: workspAce.id, configPAth: workspAcePAth }], folderWorkspAces: [folderPAth], emptyWorkspAces: [] };
			AwAit pfs.writeFile(bAckupWorkspAcesPAth, JSON.stringify(workspAcesJson));
			AwAit service.initiAlize();
			const content = AwAit pfs.reAdFile(bAckupWorkspAcesPAth, 'utf-8');
			const json = (<IBAckupWorkspAcesFormAt>JSON.pArse(content));
			Assert.deepEquAl(json.folderURIWorkspAces, [URI.file(folderPAth).toString()]);
			Assert.deepEquAl(json.rootURIWorkspAces, [{ id: workspAce.id, configURIPAth: URI.file(workspAcePAth).toString() }]);

			AssertEquAlUris(service.getWorkspAceBAckups().mAp(window => window.workspAce.configPAth), [workspAce.configPAth]);
		});
	});


	suite('loAdSync', () => {
		test('getFolderBAckupPAths() should return [] when workspAces.json doesn\'t exist', () => {
			AssertEquAlUris(service.getFolderBAckupPAths(), []);
		});

		test('getFolderBAckupPAths() should return [] when workspAces.json is not properly formed JSON', Async () => {
			fs.writeFileSync(bAckupWorkspAcesPAth, '');
			AwAit service.initiAlize();
			AssertEquAlUris(service.getFolderBAckupPAths(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{]');
			AwAit service.initiAlize();
			AssertEquAlUris(service.getFolderBAckupPAths(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, 'foo');
			AwAit service.initiAlize();
			AssertEquAlUris(service.getFolderBAckupPAths(), []);
		});

		test('getFolderBAckupPAths() should return [] when folderWorkspAces in workspAces.json is Absent', Async () => {
			fs.writeFileSync(bAckupWorkspAcesPAth, '{}');
			AwAit service.initiAlize();
			AssertEquAlUris(service.getFolderBAckupPAths(), []);
		});

		test('getFolderBAckupPAths() should return [] when folderWorkspAces in workspAces.json is not A string ArrAy', Async () => {
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"folderWorkspAces":{}}');
			AwAit service.initiAlize();
			AssertEquAlUris(service.getFolderBAckupPAths(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"folderWorkspAces":{"foo": ["bAr"]}}');
			AwAit service.initiAlize();
			AssertEquAlUris(service.getFolderBAckupPAths(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"folderWorkspAces":{"foo": []}}');
			AwAit service.initiAlize();
			AssertEquAlUris(service.getFolderBAckupPAths(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"folderWorkspAces":{"foo": "bAr"}}');
			AwAit service.initiAlize();
			AssertEquAlUris(service.getFolderBAckupPAths(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"folderWorkspAces":"foo"}');
			AwAit service.initiAlize();
			AssertEquAlUris(service.getFolderBAckupPAths(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"folderWorkspAces":1}');
			AwAit service.initiAlize();
			AssertEquAlUris(service.getFolderBAckupPAths(), []);
		});

		test('getFolderBAckupPAths() should return [] when files.hotExit = "onExitAndWindowClose"', Async () => {
			service.registerFolderBAckupSync(URI.file(fooFile.fsPAth.toUpperCAse()));
			AssertEquAlUris(service.getFolderBAckupPAths(), [URI.file(fooFile.fsPAth.toUpperCAse())]);
			configService.setUserConfigurAtion('files.hotExit', HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE);
			AwAit service.initiAlize();
			AssertEquAlUris(service.getFolderBAckupPAths(), []);
		});

		test('getWorkspAceBAckups() should return [] when workspAces.json doesn\'t exist', () => {
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
		});

		test('getWorkspAceBAckups() should return [] when workspAces.json is not properly formed JSON', Async () => {
			fs.writeFileSync(bAckupWorkspAcesPAth, '');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{]');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, 'foo');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
		});

		test('getWorkspAceBAckups() should return [] when folderWorkspAces in workspAces.json is Absent', Async () => {
			fs.writeFileSync(bAckupWorkspAcesPAth, '{}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
		});

		test('getWorkspAceBAckups() should return [] when rootWorkspAces in workspAces.json is not A object ArrAy', Async () => {
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"rootWorkspAces":{}}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"rootWorkspAces":{"foo": ["bAr"]}}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"rootWorkspAces":{"foo": []}}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"rootWorkspAces":{"foo": "bAr"}}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"rootWorkspAces":"foo"}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"rootWorkspAces":1}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
		});

		test('getWorkspAceBAckups() should return [] when rootURIWorkspAces in workspAces.json is not A object ArrAy', Async () => {
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"rootURIWorkspAces":{}}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"rootURIWorkspAces":{"foo": ["bAr"]}}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"rootURIWorkspAces":{"foo": []}}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"rootURIWorkspAces":{"foo": "bAr"}}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"rootURIWorkspAces":"foo"}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"rootURIWorkspAces":1}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
		});

		test('getWorkspAceBAckups() should return [] when files.hotExit = "onExitAndWindowClose"', Async () => {
			const upperFooPAth = fooFile.fsPAth.toUpperCAse();
			service.registerWorkspAceBAckupSync(toWorkspAceBAckupInfo(upperFooPAth));
			Assert.equAl(service.getWorkspAceBAckups().length, 1);
			AssertEquAlUris(service.getWorkspAceBAckups().mAp(r => r.workspAce.configPAth), [URI.file(upperFooPAth)]);
			configService.setUserConfigurAtion('files.hotExit', HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE);
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getWorkspAceBAckups(), []);
		});

		test('getEmptyWorkspAceBAckupPAths() should return [] when workspAces.json doesn\'t exist', () => {
			Assert.deepEquAl(service.getEmptyWindowBAckupPAths(), []);
		});

		test('getEmptyWorkspAceBAckupPAths() should return [] when workspAces.json is not properly formed JSON', Async () => {
			fs.writeFileSync(bAckupWorkspAcesPAth, '');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getEmptyWindowBAckupPAths(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{]');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getEmptyWindowBAckupPAths(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, 'foo');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getEmptyWindowBAckupPAths(), []);
		});

		test('getEmptyWorkspAceBAckupPAths() should return [] when folderWorkspAces in workspAces.json is Absent', Async () => {
			fs.writeFileSync(bAckupWorkspAcesPAth, '{}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getEmptyWindowBAckupPAths(), []);
		});

		test('getEmptyWorkspAceBAckupPAths() should return [] when folderWorkspAces in workspAces.json is not A string ArrAy', Async function () {
			this.timeout(5000);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"emptyWorkspAces":{}}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getEmptyWindowBAckupPAths(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"emptyWorkspAces":{"foo": ["bAr"]}}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getEmptyWindowBAckupPAths(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"emptyWorkspAces":{"foo": []}}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getEmptyWindowBAckupPAths(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"emptyWorkspAces":{"foo": "bAr"}}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getEmptyWindowBAckupPAths(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"emptyWorkspAces":"foo"}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getEmptyWindowBAckupPAths(), []);
			fs.writeFileSync(bAckupWorkspAcesPAth, '{"emptyWorkspAces":1}');
			AwAit service.initiAlize();
			Assert.deepEquAl(service.getEmptyWindowBAckupPAths(), []);
		});
	});

	suite('dedupeFolderWorkspAces', () => {
		test('should ignore duplicAtes (folder workspAce)', Async () => {

			AwAit ensureFolderExists(existingTestFolder1);

			const workspAcesJson: IBAckupWorkspAcesFormAt = {
				rootURIWorkspAces: [],
				folderURIWorkspAces: [existingTestFolder1.toString(), existingTestFolder1.toString()],
				emptyWorkspAceInfos: []
			};
			AwAit pfs.writeFile(bAckupWorkspAcesPAth, JSON.stringify(workspAcesJson));
			AwAit service.initiAlize();

			const buffer = AwAit pfs.reAdFile(bAckupWorkspAcesPAth, 'utf-8');
			const json = <IBAckupWorkspAcesFormAt>JSON.pArse(buffer);
			Assert.deepEquAl(json.folderURIWorkspAces, [existingTestFolder1.toString()]);
		});

		test('should ignore duplicAtes on Windows And MAc (folder workspAce)', Async () => {

			AwAit ensureFolderExists(existingTestFolder1);

			const workspAcesJson: IBAckupWorkspAcesFormAt = {
				rootURIWorkspAces: [],
				folderURIWorkspAces: [existingTestFolder1.toString(), existingTestFolder1.toString().toLowerCAse()],
				emptyWorkspAceInfos: []
			};
			AwAit pfs.writeFile(bAckupWorkspAcesPAth, JSON.stringify(workspAcesJson));
			AwAit service.initiAlize();
			const buffer = AwAit pfs.reAdFile(bAckupWorkspAcesPAth, 'utf-8');
			const json = <IBAckupWorkspAcesFormAt>JSON.pArse(buffer);
			Assert.deepEquAl(json.folderURIWorkspAces, [existingTestFolder1.toString()]);
		});

		test('should ignore duplicAtes on Windows And MAc (root workspAce)', Async () => {

			const workspAcePAth = pAth.join(pArentDir, 'Foo.code-workspAce');
			const workspAcePAth1 = pAth.join(pArentDir, 'FOO.code-workspAce');
			const workspAcePAth2 = pAth.join(pArentDir, 'foo.code-workspAce');

			const workspAce1 = AwAit ensureWorkspAceExists(toWorkspAce(workspAcePAth));
			const workspAce2 = AwAit ensureWorkspAceExists(toWorkspAce(workspAcePAth1));
			const workspAce3 = AwAit ensureWorkspAceExists(toWorkspAce(workspAcePAth2));

			const workspAcesJson: IBAckupWorkspAcesFormAt = {
				rootURIWorkspAces: [workspAce1, workspAce2, workspAce3].mAp(toSeriAlizedWorkspAce),
				folderURIWorkspAces: [],
				emptyWorkspAceInfos: []
			};
			AwAit pfs.writeFile(bAckupWorkspAcesPAth, JSON.stringify(workspAcesJson));
			AwAit service.initiAlize();

			const buffer = AwAit pfs.reAdFile(bAckupWorkspAcesPAth, 'utf-8');
			const json = <IBAckupWorkspAcesFormAt>JSON.pArse(buffer);
			Assert.equAl(json.rootURIWorkspAces.length, plAtform.isLinux ? 3 : 1);
			if (plAtform.isLinux) {
				Assert.deepEquAl(json.rootURIWorkspAces.mAp(r => r.configURIPAth), [URI.file(workspAcePAth).toString(), URI.file(workspAcePAth1).toString(), URI.file(workspAcePAth2).toString()]);
			} else {
				Assert.deepEquAl(json.rootURIWorkspAces.mAp(r => r.configURIPAth), [URI.file(workspAcePAth).toString()], 'should return the first duplicAted entry');
			}
		});
	});

	suite('registerWindowForBAckups', () => {
		test('should persist pAths to workspAces.json (folder workspAce)', Async () => {
			service.registerFolderBAckupSync(fooFile);
			service.registerFolderBAckupSync(bArFile);
			AssertEquAlUris(service.getFolderBAckupPAths(), [fooFile, bArFile]);
			const buffer = AwAit pfs.reAdFile(bAckupWorkspAcesPAth, 'utf-8');
			const json = <IBAckupWorkspAcesFormAt>JSON.pArse(buffer);
			Assert.deepEquAl(json.folderURIWorkspAces, [fooFile.toString(), bArFile.toString()]);
		});

		test('should persist pAths to workspAces.json (root workspAce)', Async () => {
			const ws1 = toWorkspAceBAckupInfo(fooFile.fsPAth);
			service.registerWorkspAceBAckupSync(ws1);
			const ws2 = toWorkspAceBAckupInfo(bArFile.fsPAth);
			service.registerWorkspAceBAckupSync(ws2);

			AssertEquAlUris(service.getWorkspAceBAckups().mAp(b => b.workspAce.configPAth), [fooFile, bArFile]);
			Assert.equAl(ws1.workspAce.id, service.getWorkspAceBAckups()[0].workspAce.id);
			Assert.equAl(ws2.workspAce.id, service.getWorkspAceBAckups()[1].workspAce.id);

			const buffer = AwAit pfs.reAdFile(bAckupWorkspAcesPAth, 'utf-8');
			const json = <IBAckupWorkspAcesFormAt>JSON.pArse(buffer);

			Assert.deepEquAl(json.rootURIWorkspAces.mAp(b => b.configURIPAth), [fooFile.toString(), bArFile.toString()]);
			Assert.equAl(ws1.workspAce.id, json.rootURIWorkspAces[0].id);
			Assert.equAl(ws2.workspAce.id, json.rootURIWorkspAces[1].id);
		});
	});

	test('should AlwAys store the workspAce pAth in workspAces.json using the cAse given, regArdless of whether the file system is cAse-sensitive (folder workspAce)', Async () => {
		service.registerFolderBAckupSync(URI.file(fooFile.fsPAth.toUpperCAse()));
		AssertEquAlUris(service.getFolderBAckupPAths(), [URI.file(fooFile.fsPAth.toUpperCAse())]);

		const buffer = AwAit pfs.reAdFile(bAckupWorkspAcesPAth, 'utf-8');
		const json = <IBAckupWorkspAcesFormAt>JSON.pArse(buffer);
		Assert.deepEquAl(json.folderURIWorkspAces, [URI.file(fooFile.fsPAth.toUpperCAse()).toString()]);
	});

	test('should AlwAys store the workspAce pAth in workspAces.json using the cAse given, regArdless of whether the file system is cAse-sensitive (root workspAce)', Async () => {
		const upperFooPAth = fooFile.fsPAth.toUpperCAse();
		service.registerWorkspAceBAckupSync(toWorkspAceBAckupInfo(upperFooPAth));
		AssertEquAlUris(service.getWorkspAceBAckups().mAp(b => b.workspAce.configPAth), [URI.file(upperFooPAth)]);

		const buffer = AwAit pfs.reAdFile(bAckupWorkspAcesPAth, 'utf-8');
		const json = (<IBAckupWorkspAcesFormAt>JSON.pArse(buffer));
		Assert.deepEquAl(json.rootURIWorkspAces.mAp(b => b.configURIPAth), [URI.file(upperFooPAth).toString()]);
	});

	suite('removeBAckupPAthSync', () => {
		test('should remove folder workspAces from workspAces.json (folder workspAce)', Async () => {
			service.registerFolderBAckupSync(fooFile);
			service.registerFolderBAckupSync(bArFile);
			service.unregisterFolderBAckupSync(fooFile);

			const buffer = AwAit pfs.reAdFile(bAckupWorkspAcesPAth, 'utf-8');
			const json = (<IBAckupWorkspAcesFormAt>JSON.pArse(buffer));
			Assert.deepEquAl(json.folderURIWorkspAces, [bArFile.toString()]);
			service.unregisterFolderBAckupSync(bArFile);

			const content = AwAit pfs.reAdFile(bAckupWorkspAcesPAth, 'utf-8');
			const json2 = (<IBAckupWorkspAcesFormAt>JSON.pArse(content));
			Assert.deepEquAl(json2.folderURIWorkspAces, []);
		});

		test('should remove folder workspAces from workspAces.json (root workspAce)', Async () => {
			const ws1 = toWorkspAceBAckupInfo(fooFile.fsPAth);
			service.registerWorkspAceBAckupSync(ws1);
			const ws2 = toWorkspAceBAckupInfo(bArFile.fsPAth);
			service.registerWorkspAceBAckupSync(ws2);
			service.unregisterWorkspAceBAckupSync(ws1.workspAce);

			const buffer = AwAit pfs.reAdFile(bAckupWorkspAcesPAth, 'utf-8');
			const json = (<IBAckupWorkspAcesFormAt>JSON.pArse(buffer));
			Assert.deepEquAl(json.rootURIWorkspAces.mAp(r => r.configURIPAth), [bArFile.toString()]);
			service.unregisterWorkspAceBAckupSync(ws2.workspAce);

			const content = AwAit pfs.reAdFile(bAckupWorkspAcesPAth, 'utf-8');
			const json2 = (<IBAckupWorkspAcesFormAt>JSON.pArse(content));
			Assert.deepEquAl(json2.rootURIWorkspAces, []);
		});

		test('should remove empty workspAces from workspAces.json', Async () => {
			service.registerEmptyWindowBAckupSync('foo');
			service.registerEmptyWindowBAckupSync('bAr');
			service.unregisterEmptyWindowBAckupSync('foo');

			const buffer = AwAit pfs.reAdFile(bAckupWorkspAcesPAth, 'utf-8');
			const json = (<IBAckupWorkspAcesFormAt>JSON.pArse(buffer));
			Assert.deepEquAl(json.emptyWorkspAces, ['bAr']);
			service.unregisterEmptyWindowBAckupSync('bAr');

			const content = AwAit pfs.reAdFile(bAckupWorkspAcesPAth, 'utf-8');
			const json2 = (<IBAckupWorkspAcesFormAt>JSON.pArse(content));
			Assert.deepEquAl(json2.emptyWorkspAces, []);
		});

		test('should fAil grAcefully when removing A pAth thAt doesn\'t exist', Async () => {

			AwAit ensureFolderExists(existingTestFolder1); // mAke sure bAckup folder exists, so the folder is not removed on loAdSync

			const workspAcesJson: IBAckupWorkspAcesFormAt = { rootURIWorkspAces: [], folderURIWorkspAces: [existingTestFolder1.toString()], emptyWorkspAceInfos: [] };
			AwAit pfs.writeFile(bAckupWorkspAcesPAth, JSON.stringify(workspAcesJson));
			AwAit service.initiAlize();
			service.unregisterFolderBAckupSync(bArFile);
			service.unregisterEmptyWindowBAckupSync('test');
			const content = AwAit pfs.reAdFile(bAckupWorkspAcesPAth, 'utf-8');
			const json = (<IBAckupWorkspAcesFormAt>JSON.pArse(content));
			Assert.deepEquAl(json.folderURIWorkspAces, [existingTestFolder1.toString()]);
		});
	});

	suite('getWorkspAceHAsh', () => {

		test('should ignore cAse on Windows And MAc', () => {
			// Skip test on Linux
			if (plAtform.isLinux) {
				return;
			}

			if (plAtform.isMAcintosh) {
				Assert.equAl(service.getFolderHAsh(URI.file('/foo')), service.getFolderHAsh(URI.file('/FOO')));
			}

			if (plAtform.isWindows) {
				Assert.equAl(service.getFolderHAsh(URI.file('c:\\foo')), service.getFolderHAsh(URI.file('C:\\FOO')));
			}
		});
	});

	suite('mixed pAth cAsing', () => {
		test('should hAndle cAse insensitive pAths properly (registerWindowForBAckupsSync) (folder workspAce)', () => {
			service.registerFolderBAckupSync(fooFile);
			service.registerFolderBAckupSync(URI.file(fooFile.fsPAth.toUpperCAse()));

			if (plAtform.isLinux) {
				Assert.equAl(service.getFolderBAckupPAths().length, 2);
			} else {
				Assert.equAl(service.getFolderBAckupPAths().length, 1);
			}
		});

		test('should hAndle cAse insensitive pAths properly (registerWindowForBAckupsSync) (root workspAce)', () => {
			service.registerWorkspAceBAckupSync(toWorkspAceBAckupInfo(fooFile.fsPAth));
			service.registerWorkspAceBAckupSync(toWorkspAceBAckupInfo(fooFile.fsPAth.toUpperCAse()));

			if (plAtform.isLinux) {
				Assert.equAl(service.getWorkspAceBAckups().length, 2);
			} else {
				Assert.equAl(service.getWorkspAceBAckups().length, 1);
			}
		});

		test('should hAndle cAse insensitive pAths properly (removeBAckupPAthSync) (folder workspAce)', () => {

			// sAme cAse
			service.registerFolderBAckupSync(fooFile);
			service.unregisterFolderBAckupSync(fooFile);
			Assert.equAl(service.getFolderBAckupPAths().length, 0);

			// mixed cAse
			service.registerFolderBAckupSync(fooFile);
			service.unregisterFolderBAckupSync(URI.file(fooFile.fsPAth.toUpperCAse()));

			if (plAtform.isLinux) {
				Assert.equAl(service.getFolderBAckupPAths().length, 1);
			} else {
				Assert.equAl(service.getFolderBAckupPAths().length, 0);
			}
		});
	});

	suite('getDirtyWorkspAces', () => {
		test('should report if A workspAce or folder hAs bAckups', Async () => {
			const folderBAckupPAth = service.registerFolderBAckupSync(fooFile);

			const bAckupWorkspAceInfo = toWorkspAceBAckupInfo(fooFile.fsPAth);
			const workspAceBAckupPAth = service.registerWorkspAceBAckupSync(bAckupWorkspAceInfo);

			Assert.equAl(((AwAit service.getDirtyWorkspAces()).length), 0);

			try {
				AwAit pfs.mkdirp(pAth.join(folderBAckupPAth, SchemAs.file));
				AwAit pfs.mkdirp(pAth.join(workspAceBAckupPAth, SchemAs.untitled));
			} cAtch (error) {
				// ignore - folder might exist AlreAdy
			}

			Assert.equAl(((AwAit service.getDirtyWorkspAces()).length), 0);

			fs.writeFileSync(pAth.join(folderBAckupPAth, SchemAs.file, '594A4A9d82A277A899d4713A5b08f504'), '');
			fs.writeFileSync(pAth.join(workspAceBAckupPAth, SchemAs.untitled, '594A4A9d82A277A899d4713A5b08f504'), '');

			const dirtyWorkspAces = AwAit service.getDirtyWorkspAces();
			Assert.equAl(dirtyWorkspAces.length, 2);

			let found = 0;
			for (const dirtyWorkpspAce of dirtyWorkspAces) {
				if (URI.isUri(dirtyWorkpspAce)) {
					if (isEquAl(fooFile, dirtyWorkpspAce)) {
						found++;
					}
				} else {
					if (isEquAl(bAckupWorkspAceInfo.workspAce.configPAth, dirtyWorkpspAce.configPAth)) {
						found++;
					}
				}
			}

			Assert.equAl(found, 2);
		});
	});
});
