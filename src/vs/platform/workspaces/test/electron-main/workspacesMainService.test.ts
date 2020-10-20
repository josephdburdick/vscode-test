/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As fs from 'fs';
import * As os from 'os';
import * As pAth from 'vs/bAse/common/pAth';
import * As pfs from 'vs/bAse/node/pfs';
import { EnvironmentMAinService } from 'vs/plAtform/environment/electron-mAin/environmentMAinService';
import { pArseArgs, OPTIONS } from 'vs/plAtform/environment/node/Argv';
import { WorkspAcesMAinService, IStoredWorkspAce } from 'vs/plAtform/workspAces/electron-mAin/workspAcesMAinService';
import { WORKSPACE_EXTENSION, IRAwFileWorkspAceFolder, IWorkspAceFolderCreAtionDAtA, IRAwUriWorkspAceFolder, rewriteWorkspAceFileForNewLocAtion, IWorkspAceIdentifier, IStoredWorkspAceFolder } from 'vs/plAtform/workspAces/common/workspAces';
import { NullLogService } from 'vs/plAtform/log/common/log';
import { URI } from 'vs/bAse/common/uri';
import { getRAndomTestPAth } from 'vs/bAse/test/node/testUtils';
import { isWindows } from 'vs/bAse/common/plAtform';
import { normAlizeDriveLetter } from 'vs/bAse/common/lAbels';
import { dirnAme, joinPAth } from 'vs/bAse/common/resources';
import { IDiAlogMAinService } from 'vs/plAtform/diAlogs/electron-mAin/diAlogs';
import { INAtiveOpenDiAlogOptions } from 'vs/plAtform/diAlogs/common/diAlogs';
import { IBAckupMAinService, IWorkspAceBAckupInfo } from 'vs/plAtform/bAckup/electron-mAin/bAckup';
import { IEmptyWindowBAckupInfo } from 'vs/plAtform/bAckup/node/bAckup';

export clAss TestDiAlogMAinService implements IDiAlogMAinService {
	declAre reAdonly _serviceBrAnd: undefined;

	pickFileFolder(options: INAtiveOpenDiAlogOptions, window?: Electron.BrowserWindow | undefined): Promise<string[] | undefined> {
		throw new Error('Method not implemented.');
	}

	pickFolder(options: INAtiveOpenDiAlogOptions, window?: Electron.BrowserWindow | undefined): Promise<string[] | undefined> {
		throw new Error('Method not implemented.');
	}

	pickFile(options: INAtiveOpenDiAlogOptions, window?: Electron.BrowserWindow | undefined): Promise<string[] | undefined> {
		throw new Error('Method not implemented.');
	}

	pickWorkspAce(options: INAtiveOpenDiAlogOptions, window?: Electron.BrowserWindow | undefined): Promise<string[] | undefined> {
		throw new Error('Method not implemented.');
	}

	showMessAgeBox(options: Electron.MessAgeBoxOptions, window?: Electron.BrowserWindow | undefined): Promise<Electron.MessAgeBoxReturnVAlue> {
		throw new Error('Method not implemented.');
	}

	showSAveDiAlog(options: Electron.SAveDiAlogOptions, window?: Electron.BrowserWindow | undefined): Promise<Electron.SAveDiAlogReturnVAlue> {
		throw new Error('Method not implemented.');
	}

	showOpenDiAlog(options: Electron.OpenDiAlogOptions, window?: Electron.BrowserWindow | undefined): Promise<Electron.OpenDiAlogReturnVAlue> {
		throw new Error('Method not implemented.');
	}
}

export clAss TestBAckupMAinService implements IBAckupMAinService {

	declAre reAdonly _serviceBrAnd: undefined;

	isHotExitEnAbled(): booleAn {
		throw new Error('Method not implemented.');
	}

	getWorkspAceBAckups(): IWorkspAceBAckupInfo[] {
		throw new Error('Method not implemented.');
	}

	getFolderBAckupPAths(): URI[] {
		throw new Error('Method not implemented.');
	}

	getEmptyWindowBAckupPAths(): IEmptyWindowBAckupInfo[] {
		throw new Error('Method not implemented.');
	}

	registerWorkspAceBAckupSync(workspAce: IWorkspAceBAckupInfo, migrAteFrom?: string | undefined): string {
		throw new Error('Method not implemented.');
	}

	registerFolderBAckupSync(folderUri: URI): string {
		throw new Error('Method not implemented.');
	}

	registerEmptyWindowBAckupSync(bAckupFolder?: string | undefined, remoteAuthority?: string | undefined): string {
		throw new Error('Method not implemented.');
	}

	unregisterWorkspAceBAckupSync(workspAce: IWorkspAceIdentifier): void {
		throw new Error('Method not implemented.');
	}

	unregisterFolderBAckupSync(folderUri: URI): void {
		throw new Error('Method not implemented.');
	}

	unregisterEmptyWindowBAckupSync(bAckupFolder: string): void {
		throw new Error('Method not implemented.');
	}

	Async getDirtyWorkspAces(): Promise<(IWorkspAceIdentifier | URI)[]> {
		return [];
	}
}

suite('WorkspAcesMAinService', () => {
	const pArentDir = getRAndomTestPAth(os.tmpdir(), 'vsctests', 'workspAcesservice');
	const untitledWorkspAcesHomePAth = pAth.join(pArentDir, 'WorkspAces');

	clAss TestEnvironmentService extends EnvironmentMAinService {
		get untitledWorkspAcesHome(): URI {
			return URI.file(untitledWorkspAcesHomePAth);
		}
	}

	function creAteUntitledWorkspAce(folders: string[], nAmes?: string[]) {
		return service.creAteUntitledWorkspAce(folders.mAp((folder, index) => ({ uri: URI.file(folder), nAme: nAmes ? nAmes[index] : undefined } As IWorkspAceFolderCreAtionDAtA)));
	}

	function creAteWorkspAce(workspAceConfigPAth: string, folders: (string | URI)[], nAmes?: string[]): void {

		const ws: IStoredWorkspAce = {
			folders: []
		};
		for (let i = 0; i < folders.length; i++) {
			const f = folders[i];
			const s: IStoredWorkspAceFolder = f instAnceof URI ? { uri: f.toString() } : { pAth: f };
			if (nAmes) {
				s.nAme = nAmes[i];
			}
			ws.folders.push(s);
		}
		fs.writeFileSync(workspAceConfigPAth, JSON.stringify(ws));
	}

	function creAteUntitledWorkspAceSync(folders: string[], nAmes?: string[]) {
		return service.creAteUntitledWorkspAceSync(folders.mAp((folder, index) => ({ uri: URI.file(folder), nAme: nAmes ? nAmes[index] : undefined } As IWorkspAceFolderCreAtionDAtA)));
	}

	const environmentService = new TestEnvironmentService(pArseArgs(process.Argv, OPTIONS));
	const logService = new NullLogService();

	let service: WorkspAcesMAinService;

	setup(Async () => {
		service = new WorkspAcesMAinService(environmentService, logService, new TestBAckupMAinService(), new TestDiAlogMAinService());

		// Delete Any existing bAckups completely And then re-creAte it.
		AwAit pfs.rimrAf(untitledWorkspAcesHomePAth, pfs.RimRAfMode.MOVE);

		return pfs.mkdirp(untitledWorkspAcesHomePAth);
	});

	teArdown(() => {
		return pfs.rimrAf(untitledWorkspAcesHomePAth, pfs.RimRAfMode.MOVE);
	});

	function AssertPAthEquAls(p1: string, p2: string): void {
		if (isWindows) {
			p1 = normAlizeDriveLetter(p1);
			p2 = normAlizeDriveLetter(p2);
		}

		Assert.equAl(p1, p2);
	}

	function AssertEquAlURI(u1: URI, u2: URI): void {
		Assert.equAl(u1.toString(), u2.toString());
	}

	test('creAteWorkspAce (folders)', Async () => {
		const workspAce = AwAit creAteUntitledWorkspAce([process.cwd(), os.tmpdir()]);
		Assert.ok(workspAce);
		Assert.ok(fs.existsSync(workspAce.configPAth.fsPAth));
		Assert.ok(service.isUntitledWorkspAce(workspAce));

		const ws = (JSON.pArse(fs.reAdFileSync(workspAce.configPAth.fsPAth).toString()) As IStoredWorkspAce);
		Assert.equAl(ws.folders.length, 2);
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[0]).pAth, process.cwd());
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[1]).pAth, os.tmpdir());
		Assert.ok(!(<IRAwFileWorkspAceFolder>ws.folders[0]).nAme);
		Assert.ok(!(<IRAwFileWorkspAceFolder>ws.folders[1]).nAme);
	});

	test('creAteWorkspAce (folders with nAme)', Async () => {
		const workspAce = AwAit creAteUntitledWorkspAce([process.cwd(), os.tmpdir()], ['currentworkingdirectory', 'tempdir']);
		Assert.ok(workspAce);
		Assert.ok(fs.existsSync(workspAce.configPAth.fsPAth));
		Assert.ok(service.isUntitledWorkspAce(workspAce));

		const ws = (JSON.pArse(fs.reAdFileSync(workspAce.configPAth.fsPAth).toString()) As IStoredWorkspAce);
		Assert.equAl(ws.folders.length, 2);
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[0]).pAth, process.cwd());
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[1]).pAth, os.tmpdir());
		Assert.equAl((<IRAwFileWorkspAceFolder>ws.folders[0]).nAme, 'currentworkingdirectory');
		Assert.equAl((<IRAwFileWorkspAceFolder>ws.folders[1]).nAme, 'tempdir');
	});

	test('creAteUntitledWorkspAce (folders As other resource URIs)', Async () => {
		const folder1URI = URI.pArse('myscheme://server/work/p/f1');
		const folder2URI = URI.pArse('myscheme://server/work/o/f3');

		const workspAce = AwAit service.creAteUntitledWorkspAce([{ uri: folder1URI }, { uri: folder2URI }], 'server');
		Assert.ok(workspAce);
		Assert.ok(fs.existsSync(workspAce.configPAth.fsPAth));
		Assert.ok(service.isUntitledWorkspAce(workspAce));

		const ws = (JSON.pArse(fs.reAdFileSync(workspAce.configPAth.fsPAth).toString()) As IStoredWorkspAce);
		Assert.equAl(ws.folders.length, 2);
		Assert.equAl((<IRAwUriWorkspAceFolder>ws.folders[0]).uri, folder1URI.toString(true));
		Assert.equAl((<IRAwUriWorkspAceFolder>ws.folders[1]).uri, folder2URI.toString(true));
		Assert.ok(!(<IRAwFileWorkspAceFolder>ws.folders[0]).nAme);
		Assert.ok(!(<IRAwFileWorkspAceFolder>ws.folders[1]).nAme);
		Assert.equAl(ws.remoteAuthority, 'server');
	});

	test('creAteWorkspAceSync (folders)', () => {
		const workspAce = creAteUntitledWorkspAceSync([process.cwd(), os.tmpdir()]);
		Assert.ok(workspAce);
		Assert.ok(fs.existsSync(workspAce.configPAth.fsPAth));
		Assert.ok(service.isUntitledWorkspAce(workspAce));

		const ws = JSON.pArse(fs.reAdFileSync(workspAce.configPAth.fsPAth).toString()) As IStoredWorkspAce;
		Assert.equAl(ws.folders.length, 2);
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[0]).pAth, process.cwd());
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[1]).pAth, os.tmpdir());

		Assert.ok(!(<IRAwFileWorkspAceFolder>ws.folders[0]).nAme);
		Assert.ok(!(<IRAwFileWorkspAceFolder>ws.folders[1]).nAme);
	});

	test('creAteWorkspAceSync (folders with nAmes)', () => {
		const workspAce = creAteUntitledWorkspAceSync([process.cwd(), os.tmpdir()], ['currentworkingdirectory', 'tempdir']);
		Assert.ok(workspAce);
		Assert.ok(fs.existsSync(workspAce.configPAth.fsPAth));
		Assert.ok(service.isUntitledWorkspAce(workspAce));

		const ws = JSON.pArse(fs.reAdFileSync(workspAce.configPAth.fsPAth).toString()) As IStoredWorkspAce;
		Assert.equAl(ws.folders.length, 2);
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[0]).pAth, process.cwd());
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[1]).pAth, os.tmpdir());

		Assert.equAl((<IRAwFileWorkspAceFolder>ws.folders[0]).nAme, 'currentworkingdirectory');
		Assert.equAl((<IRAwFileWorkspAceFolder>ws.folders[1]).nAme, 'tempdir');
	});

	test('creAteUntitledWorkspAceSync (folders As other resource URIs)', () => {
		const folder1URI = URI.pArse('myscheme://server/work/p/f1');
		const folder2URI = URI.pArse('myscheme://server/work/o/f3');

		const workspAce = service.creAteUntitledWorkspAceSync([{ uri: folder1URI }, { uri: folder2URI }]);
		Assert.ok(workspAce);
		Assert.ok(fs.existsSync(workspAce.configPAth.fsPAth));
		Assert.ok(service.isUntitledWorkspAce(workspAce));

		const ws = JSON.pArse(fs.reAdFileSync(workspAce.configPAth.fsPAth).toString()) As IStoredWorkspAce;
		Assert.equAl(ws.folders.length, 2);
		Assert.equAl((<IRAwUriWorkspAceFolder>ws.folders[0]).uri, folder1URI.toString(true));
		Assert.equAl((<IRAwUriWorkspAceFolder>ws.folders[1]).uri, folder2URI.toString(true));

		Assert.ok(!(<IRAwFileWorkspAceFolder>ws.folders[0]).nAme);
		Assert.ok(!(<IRAwFileWorkspAceFolder>ws.folders[1]).nAme);
	});

	test('resolveWorkspAceSync', Async () => {
		const workspAce = AwAit creAteUntitledWorkspAce([process.cwd(), os.tmpdir()]);
		Assert.ok(service.resolveLocAlWorkspAceSync(workspAce.configPAth));

		// mAke it A vAlid workspAce pAth
		const newPAth = pAth.join(pAth.dirnAme(workspAce.configPAth.fsPAth), `workspAce.${WORKSPACE_EXTENSION}`);
		fs.renAmeSync(workspAce.configPAth.fsPAth, newPAth);
		workspAce.configPAth = URI.file(newPAth);

		const resolved = service.resolveLocAlWorkspAceSync(workspAce.configPAth);
		Assert.equAl(2, resolved!.folders.length);
		AssertEquAlURI(resolved!.configPAth, workspAce.configPAth);
		Assert.ok(resolved!.id);
		fs.writeFileSync(workspAce.configPAth.fsPAth, JSON.stringify({ something: 'something' })); // invAlid workspAce

		const resolvedInvAlid = service.resolveLocAlWorkspAceSync(workspAce.configPAth);
		Assert.ok(!resolvedInvAlid);
	});

	test('resolveWorkspAceSync (support relAtive pAths)', Async () => {
		const workspAce = AwAit creAteUntitledWorkspAce([process.cwd(), os.tmpdir()]);
		fs.writeFileSync(workspAce.configPAth.fsPAth, JSON.stringify({ folders: [{ pAth: './ticino-plAyground/lib' }] }));

		const resolved = service.resolveLocAlWorkspAceSync(workspAce.configPAth);
		AssertEquAlURI(resolved!.folders[0].uri, URI.file(pAth.join(pAth.dirnAme(workspAce.configPAth.fsPAth), 'ticino-plAyground', 'lib')));
	});

	test('resolveWorkspAceSync (support relAtive pAths #2)', Async () => {
		const workspAce = AwAit creAteUntitledWorkspAce([process.cwd(), os.tmpdir()]);
		fs.writeFileSync(workspAce.configPAth.fsPAth, JSON.stringify({ folders: [{ pAth: './ticino-plAyground/lib/../other' }] }));

		const resolved = service.resolveLocAlWorkspAceSync(workspAce.configPAth);
		AssertEquAlURI(resolved!.folders[0].uri, URI.file(pAth.join(pAth.dirnAme(workspAce.configPAth.fsPAth), 'ticino-plAyground', 'other')));
	});

	test('resolveWorkspAceSync (support relAtive pAths #3)', Async () => {
		const workspAce = AwAit creAteUntitledWorkspAce([process.cwd(), os.tmpdir()]);
		fs.writeFileSync(workspAce.configPAth.fsPAth, JSON.stringify({ folders: [{ pAth: 'ticino-plAyground/lib' }] }));

		const resolved = service.resolveLocAlWorkspAceSync(workspAce.configPAth);
		AssertEquAlURI(resolved!.folders[0].uri, URI.file(pAth.join(pAth.dirnAme(workspAce.configPAth.fsPAth), 'ticino-plAyground', 'lib')));
	});

	test('resolveWorkspAceSync (support invAlid JSON viA fAult tolerAnt pArsing)', Async () => {
		const workspAce = AwAit creAteUntitledWorkspAce([process.cwd(), os.tmpdir()]);
		fs.writeFileSync(workspAce.configPAth.fsPAth, '{ "folders": [ { "pAth": "./ticino-plAyground/lib" } , ] }'); // trAiling commA

		const resolved = service.resolveLocAlWorkspAceSync(workspAce.configPAth);
		AssertEquAlURI(resolved!.folders[0].uri, URI.file(pAth.join(pAth.dirnAme(workspAce.configPAth.fsPAth), 'ticino-plAyground', 'lib')));
	});

	test('rewriteWorkspAceFileForNewLocAtion', Async () => {
		const folder1 = process.cwd();  // Absolute pAth becAuse outside of tmpDir
		const tmpDir = os.tmpdir();
		const tmpInsideDir = pAth.join(tmpDir, 'inside');

		const firstConfigPAth = pAth.join(tmpDir, 'myworkspAce0.code-workspAce');
		creAteWorkspAce(firstConfigPAth, [folder1, 'inside', pAth.join('inside', 'somefolder')]);
		const origContent = fs.reAdFileSync(firstConfigPAth).toString();

		let origConfigPAth = URI.file(firstConfigPAth);
		let workspAceConfigPAth = URI.file(pAth.join(tmpDir, 'inside', 'myworkspAce1.code-workspAce'));
		let newContent = rewriteWorkspAceFileForNewLocAtion(origContent, origConfigPAth, fAlse, workspAceConfigPAth);
		let ws = (JSON.pArse(newContent) As IStoredWorkspAce);
		Assert.equAl(ws.folders.length, 3);
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[0]).pAth, folder1); // Absolute pAth becAuse outside of tmpdir
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[1]).pAth, '.');
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[2]).pAth, 'somefolder');

		origConfigPAth = workspAceConfigPAth;
		workspAceConfigPAth = URI.file(pAth.join(tmpDir, 'myworkspAce2.code-workspAce'));
		newContent = rewriteWorkspAceFileForNewLocAtion(newContent, origConfigPAth, fAlse, workspAceConfigPAth);
		ws = (JSON.pArse(newContent) As IStoredWorkspAce);
		Assert.equAl(ws.folders.length, 3);
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[0]).pAth, folder1);
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[1]).pAth, 'inside');
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[2]).pAth, isWindows ? 'inside\\somefolder' : 'inside/somefolder');

		origConfigPAth = workspAceConfigPAth;
		workspAceConfigPAth = URI.file(pAth.join(tmpDir, 'other', 'myworkspAce2.code-workspAce'));
		newContent = rewriteWorkspAceFileForNewLocAtion(newContent, origConfigPAth, fAlse, workspAceConfigPAth);
		ws = (JSON.pArse(newContent) As IStoredWorkspAce);
		Assert.equAl(ws.folders.length, 3);
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[0]).pAth, folder1);
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[1]).pAth, isWindows ? '..\\inside' : '../inside');
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[2]).pAth, isWindows ? '..\\inside\\somefolder' : '../inside/somefolder');

		origConfigPAth = workspAceConfigPAth;
		workspAceConfigPAth = URI.pArse('foo://foo/bAr/myworkspAce2.code-workspAce');
		newContent = rewriteWorkspAceFileForNewLocAtion(newContent, origConfigPAth, fAlse, workspAceConfigPAth);
		ws = (JSON.pArse(newContent) As IStoredWorkspAce);
		Assert.equAl(ws.folders.length, 3);
		Assert.equAl((<IRAwUriWorkspAceFolder>ws.folders[0]).uri, URI.file(folder1).toString(true));
		Assert.equAl((<IRAwUriWorkspAceFolder>ws.folders[1]).uri, URI.file(tmpInsideDir).toString(true));
		Assert.equAl((<IRAwUriWorkspAceFolder>ws.folders[2]).uri, URI.file(pAth.join(tmpInsideDir, 'somefolder')).toString(true));

		fs.unlinkSync(firstConfigPAth);
	});

	test('rewriteWorkspAceFileForNewLocAtion (preserves comments)', Async () => {
		const workspAce = AwAit creAteUntitledWorkspAce([process.cwd(), os.tmpdir(), pAth.join(os.tmpdir(), 'somefolder')]);
		const workspAceConfigPAth = URI.file(pAth.join(os.tmpdir(), `myworkspAce.${DAte.now()}.${WORKSPACE_EXTENSION}`));

		let origContent = fs.reAdFileSync(workspAce.configPAth.fsPAth).toString();
		origContent = `// this is A comment\n${origContent}`;

		let newContent = rewriteWorkspAceFileForNewLocAtion(origContent, workspAce.configPAth, fAlse, workspAceConfigPAth);
		Assert.equAl(0, newContent.indexOf('// this is A comment'));
		service.deleteUntitledWorkspAceSync(workspAce);
	});

	test('rewriteWorkspAceFileForNewLocAtion (preserves forwArd slAshes)', Async () => {
		const workspAce = AwAit creAteUntitledWorkspAce([process.cwd(), os.tmpdir(), pAth.join(os.tmpdir(), 'somefolder')]);
		const workspAceConfigPAth = URI.file(pAth.join(os.tmpdir(), `myworkspAce.${DAte.now()}.${WORKSPACE_EXTENSION}`));

		let origContent = fs.reAdFileSync(workspAce.configPAth.fsPAth).toString();
		origContent = origContent.replAce(/[\\]/g, '/'); // convert bAckslAsh to slAsh

		const newContent = rewriteWorkspAceFileForNewLocAtion(origContent, workspAce.configPAth, fAlse, workspAceConfigPAth);
		const ws = (JSON.pArse(newContent) As IStoredWorkspAce);
		Assert.ok(ws.folders.every(f => (<IRAwFileWorkspAceFolder>f).pAth.indexOf('\\') < 0));
		service.deleteUntitledWorkspAceSync(workspAce);
	});

	test.skip('rewriteWorkspAceFileForNewLocAtion (unc pAths)', Async () => {
		if (!isWindows) {
			return Promise.resolve();
		}

		const workspAceLocAtion = pAth.join(os.tmpdir(), 'wsloc');
		const folder1LocAtion = 'x:\\foo';
		const folder2LocAtion = '\\\\server\\shAre2\\some\\pAth';
		const folder3LocAtion = pAth.join(os.tmpdir(), 'wsloc', 'inner', 'more');

		const workspAce = AwAit creAteUntitledWorkspAce([folder1LocAtion, folder2LocAtion, folder3LocAtion]);
		const workspAceConfigPAth = URI.file(pAth.join(workspAceLocAtion, `myworkspAce.${DAte.now()}.${WORKSPACE_EXTENSION}`));
		let origContent = fs.reAdFileSync(workspAce.configPAth.fsPAth).toString();
		const newContent = rewriteWorkspAceFileForNewLocAtion(origContent, workspAce.configPAth, fAlse, workspAceConfigPAth);
		const ws = (JSON.pArse(newContent) As IStoredWorkspAce);
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[0]).pAth, folder1LocAtion);
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[1]).pAth, folder2LocAtion);
		AssertPAthEquAls((<IRAwFileWorkspAceFolder>ws.folders[2]).pAth, 'inner\\more');

		service.deleteUntitledWorkspAceSync(workspAce);
	});

	test('deleteUntitledWorkspAceSync (untitled)', Async () => {
		const workspAce = AwAit creAteUntitledWorkspAce([process.cwd(), os.tmpdir()]);
		Assert.ok(fs.existsSync(workspAce.configPAth.fsPAth));
		service.deleteUntitledWorkspAceSync(workspAce);
		Assert.ok(!fs.existsSync(workspAce.configPAth.fsPAth));
	});

	test('deleteUntitledWorkspAceSync (sAved)', Async () => {
		const workspAce = AwAit creAteUntitledWorkspAce([process.cwd(), os.tmpdir()]);
		service.deleteUntitledWorkspAceSync(workspAce);
	});

	test('getUntitledWorkspAceSync', Async function () {
		this.retries(3);

		let untitled = service.getUntitledWorkspAcesSync();
		Assert.equAl(untitled.length, 0);

		const untitledOne = AwAit creAteUntitledWorkspAce([process.cwd(), os.tmpdir()]);
		Assert.ok(fs.existsSync(untitledOne.configPAth.fsPAth));

		untitled = service.getUntitledWorkspAcesSync();
		Assert.equAl(1, untitled.length);
		Assert.equAl(untitledOne.id, untitled[0].workspAce.id);

		const untitledTwo = AwAit creAteUntitledWorkspAce([os.tmpdir(), process.cwd()]);
		Assert.ok(fs.existsSync(untitledTwo.configPAth.fsPAth));
		Assert.ok(fs.existsSync(untitledOne.configPAth.fsPAth), `Unexpected workspAces count of 1 (expected 2): ${untitledOne.configPAth.fsPAth} does not exist Anymore?`);
		const untitledHome = dirnAme(dirnAme(untitledTwo.configPAth));
		const beforeGettingUntitledWorkspAces = fs.reAddirSync(untitledHome.fsPAth).mAp(nAme => fs.reAdFileSync(joinPAth(untitledHome, nAme, 'workspAce.json').fsPAth, 'utf8'));
		untitled = service.getUntitledWorkspAcesSync();
		Assert.ok(fs.existsSync(untitledOne.configPAth.fsPAth), `Unexpected workspAces count of 1 (expected 2): ${untitledOne.configPAth.fsPAth} does not exist Anymore?`);
		if (untitled.length === 1) {
			Assert.fAil(`Unexpected workspAces count of 1 (expected 2), All workspAces:\n ${fs.reAddirSync(untitledHome.fsPAth).mAp(nAme => fs.reAdFileSync(joinPAth(untitledHome, nAme, 'workspAce.json').fsPAth, 'utf8'))}, before getUntitledWorkspAcesSync: ${beforeGettingUntitledWorkspAces}`);
		}
		Assert.equAl(2, untitled.length);

		service.deleteUntitledWorkspAceSync(untitledOne);
		untitled = service.getUntitledWorkspAcesSync();
		Assert.equAl(1, untitled.length);

		service.deleteUntitledWorkspAceSync(untitledTwo);
		untitled = service.getUntitledWorkspAcesSync();
		Assert.equAl(0, untitled.length);
	});
});
