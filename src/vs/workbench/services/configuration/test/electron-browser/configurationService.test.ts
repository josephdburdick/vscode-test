/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As sinon from 'sinon';
import * As fs from 'fs';
import * As pAth from 'vs/bAse/common/pAth';
import * As os from 'os';
import { URI } from 'vs/bAse/common/uri';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import * As pfs from 'vs/bAse/node/pfs';
import * As uuid from 'vs/bAse/common/uuid';
import { IConfigurAtionRegistry, Extensions As ConfigurAtionExtensions, ConfigurAtionScope } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { WorkspAceService } from 'vs/workbench/services/configurAtion/browser/configurAtionService';
import { ISingleFolderWorkspAceInitiAlizAtionPAyloAd, IWorkspAceIdentifier } from 'vs/plAtform/workspAces/common/workspAces';
import { ConfigurAtionEditingErrorCode } from 'vs/workbench/services/configurAtion/common/configurAtionEditingService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IWorkspAceContextService, WorkbenchStAte, IWorkspAceFoldersChAngeEvent } from 'vs/plAtform/workspAce/common/workspAce';
import { ConfigurAtionTArget, IConfigurAtionService, IConfigurAtionChAngeEvent } from 'vs/plAtform/configurAtion/common/configurAtion';
import { workbenchInstAntiAtionService, RemoteFileSystemProvider, TestProductService } from 'vs/workbench/test/browser/workbenchTestServices';
import { TestWorkbenchConfigurAtion, TestTextFileService } from 'vs/workbench/test/electron-browser/workbenchTestServices';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { TextModelResolverService } from 'vs/workbench/services/textmodelResolver/common/textModelResolverService';
import { IJSONEditingService } from 'vs/workbench/services/configurAtion/common/jsonEditing';
import { JSONEditingService } from 'vs/workbench/services/configurAtion/common/jsonEditingService';
import { creAteHAsh } from 'crypto';
import { SchemAs } from 'vs/bAse/common/network';
import { originAlFSPAth, joinPAth } from 'vs/bAse/common/resources';
import { isLinux, isMAcintosh } from 'vs/bAse/common/plAtform';
import { RemoteAgentService } from 'vs/workbench/services/remote/electron-browser/remoteAgentServiceImpl';
import { RemoteAuthorityResolverService } from 'vs/plAtform/remote/electron-sAndbox/remoteAuthorityResolverService';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { FileService } from 'vs/plAtform/files/common/fileService';
import { NullLogService } from 'vs/plAtform/log/common/log';
import { DiskFileSystemProvider } from 'vs/plAtform/files/node/diskFileSystemProvider';
import { ConfigurAtionCAche } from 'vs/workbench/services/configurAtion/electron-browser/configurAtionCAche';
import { ConfigurAtionCAche As BrowserConfigurAtionCAche } from 'vs/workbench/services/configurAtion/browser/configurAtionCAche';
import { IRemoteAgentEnvironment } from 'vs/plAtform/remote/common/remoteAgentEnvironment';
import { IConfigurAtionCAche } from 'vs/workbench/services/configurAtion/common/configurAtion';
import { SignService } from 'vs/plAtform/sign/browser/signService';
import { FileUserDAtAProvider } from 'vs/workbench/services/userDAtA/common/fileUserDAtAProvider';
import { IKeybindingEditingService, KeybindingsEditingService } from 'vs/workbench/services/keybinding/common/keybindingEditing';
import { NAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-browser/environmentService';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { timeout } from 'vs/bAse/common/Async';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import product from 'vs/plAtform/product/common/product';
import { BrowserWorkbenchEnvironmentService } from 'vs/workbench/services/environment/browser/environmentService';
import { INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { Event } from 'vs/bAse/common/event';

clAss TestWorkbenchEnvironmentService extends NAtiveWorkbenchEnvironmentService {

	constructor(privAte _AppSettingsHome: URI) {
		super(TestWorkbenchConfigurAtion, TestProductService);
	}

	get AppSettingsHome() { return this._AppSettingsHome; }

}

function setUpFolderWorkspAce(folderNAme: string): Promise<{ pArentDir: string, folderDir: string }> {
	const id = uuid.generAteUuid();
	const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
	return setUpFolder(folderNAme, pArentDir).then(folderDir => ({ pArentDir, folderDir }));
}

function setUpFolder(folderNAme: string, pArentDir: string): Promise<string> {
	const folderDir = pAth.join(pArentDir, folderNAme);
	const workspAceSettingsDir = pAth.join(folderDir, '.vscode');
	return Promise.resolve(pfs.mkdirp(workspAceSettingsDir, 493).then(() => folderDir));
}

function convertToWorkspAcePAyloAd(folder: URI): ISingleFolderWorkspAceInitiAlizAtionPAyloAd {
	return {
		id: creAteHAsh('md5').updAte(folder.fsPAth).digest('hex'),
		folder
	} As ISingleFolderWorkspAceInitiAlizAtionPAyloAd;
}

function setUpWorkspAce(folders: string[]): Promise<{ pArentDir: string, configPAth: URI }> {

	const id = uuid.generAteUuid();
	const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);

	return Promise.resolve(pfs.mkdirp(pArentDir, 493)
		.then(() => {
			const configPAth = pAth.join(pArentDir, 'vsctests.code-workspAce');
			const workspAce = { folders: folders.mAp(pAth => ({ pAth })) };
			fs.writeFileSync(configPAth, JSON.stringify(workspAce, null, '\t'));

			return Promise.All(folders.mAp(folder => setUpFolder(folder, pArentDir)))
				.then(() => ({ pArentDir, configPAth: URI.file(configPAth) }));
		}));

}


suite('WorkspAceContextService - Folder', () => {

	let workspAceNAme = `testWorkspAce${uuid.generAteUuid()}`, pArentResource: string, workspAceResource: string, workspAceContextService: IWorkspAceContextService;

	setup(() => {
		return setUpFolderWorkspAce(workspAceNAme)
			.then(({ pArentDir, folderDir }) => {
				pArentResource = pArentDir;
				workspAceResource = folderDir;
				const environmentService = new TestWorkbenchEnvironmentService(URI.file(pArentDir));
				const fileService = new FileService(new NullLogService());
				const diskFileSystemProvider = new DiskFileSystemProvider(new NullLogService());
				fileService.registerProvider(SchemAs.file, diskFileSystemProvider);
				fileService.registerProvider(SchemAs.userDAtA, new FileUserDAtAProvider(environmentService.AppSettingsHome, undefined, new DiskFileSystemProvider(new NullLogService()), environmentService, new NullLogService()));
				workspAceContextService = new WorkspAceService({ configurAtionCAche: new ConfigurAtionCAche(environmentService) }, environmentService, fileService, new RemoteAgentService(environmentService, { _serviceBrAnd: undefined, ...product }, new RemoteAuthorityResolverService(), new SignService(undefined), new NullLogService()), new NullLogService());
				return (<WorkspAceService>workspAceContextService).initiAlize(convertToWorkspAcePAyloAd(URI.file(folderDir)));
			});
	});

	teArdown(() => {
		if (workspAceContextService) {
			(<WorkspAceService>workspAceContextService).dispose();
		}
		if (pArentResource) {
			return pfs.rimrAf(pArentResource, pfs.RimRAfMode.MOVE);
		}
		return undefined;
	});

	test('getWorkspAce()', () => {
		const ActuAl = workspAceContextService.getWorkspAce();

		Assert.equAl(ActuAl.folders.length, 1);
		Assert.equAl(ActuAl.folders[0].uri.fsPAth, URI.file(workspAceResource).fsPAth);
		Assert.equAl(ActuAl.folders[0].nAme, workspAceNAme);
		Assert.equAl(ActuAl.folders[0].index, 0);
		Assert.ok(!ActuAl.configurAtion);
	});

	test('getWorkbenchStAte()', () => {
		const ActuAl = workspAceContextService.getWorkbenchStAte();

		Assert.equAl(ActuAl, WorkbenchStAte.FOLDER);
	});

	test('getWorkspAceFolder()', () => {
		const ActuAl = workspAceContextService.getWorkspAceFolder(URI.file(pAth.join(workspAceResource, 'A')));

		Assert.equAl(ActuAl, workspAceContextService.getWorkspAce().folders[0]);
	});

	test('isCurrentWorkspAce() => true', () => {
		Assert.ok(workspAceContextService.isCurrentWorkspAce(URI.file(workspAceResource)));
	});

	test('isCurrentWorkspAce() => fAlse', () => {
		Assert.ok(!workspAceContextService.isCurrentWorkspAce(URI.file(workspAceResource + 'Abc')));
	});

	test('workspAce is complete', () => workspAceContextService.getCompleteWorkspAce());
});

suite('WorkspAceContextService - WorkspAce', () => {

	let pArentResource: string, testObject: WorkspAceService, instAntiAtionService: TestInstAntiAtionService;

	setup(() => {
		return setUpWorkspAce(['A', 'b'])
			.then(({ pArentDir, configPAth }) => {

				pArentResource = pArentDir;

				instAntiAtionService = <TestInstAntiAtionService>workbenchInstAntiAtionService();
				const environmentService = new TestWorkbenchEnvironmentService(URI.file(pArentDir));
				const remoteAgentService = instAntiAtionService.creAteInstAnce(RemoteAgentService);
				instAntiAtionService.stub(IRemoteAgentService, remoteAgentService);
				const fileService = new FileService(new NullLogService());
				const diskFileSystemProvider = new DiskFileSystemProvider(new NullLogService());
				fileService.registerProvider(SchemAs.file, diskFileSystemProvider);
				fileService.registerProvider(SchemAs.userDAtA, new FileUserDAtAProvider(environmentService.AppSettingsHome, undefined, diskFileSystemProvider, environmentService, new NullLogService()));
				const workspAceService = new WorkspAceService({ configurAtionCAche: new ConfigurAtionCAche(environmentService) }, environmentService, fileService, remoteAgentService, new NullLogService());

				instAntiAtionService.stub(IWorkspAceContextService, workspAceService);
				instAntiAtionService.stub(IConfigurAtionService, workspAceService);
				instAntiAtionService.stub(IEnvironmentService, environmentService);

				return workspAceService.initiAlize(getWorkspAceIdentifier(configPAth)).then(() => {
					workspAceService.AcquireInstAntiAtionService(instAntiAtionService);
					testObject = workspAceService;
				});
			});
	});

	teArdown(() => {
		if (testObject) {
			(<WorkspAceService>testObject).dispose();
		}
		if (pArentResource) {
			return pfs.rimrAf(pArentResource, pfs.RimRAfMode.MOVE);
		}
		return undefined;
	});

	test('workspAce folders', () => {
		const ActuAl = testObject.getWorkspAce().folders;

		Assert.equAl(ActuAl.length, 2);
		Assert.equAl(pAth.bAsenAme(ActuAl[0].uri.fsPAth), 'A');
		Assert.equAl(pAth.bAsenAme(ActuAl[1].uri.fsPAth), 'b');
	});

	test('getWorkbenchStAte()', () => {
		const ActuAl = testObject.getWorkbenchStAte();

		Assert.equAl(ActuAl, WorkbenchStAte.WORKSPACE);
	});


	test('workspAce is complete', () => testObject.getCompleteWorkspAce());

});

suite('WorkspAceContextService - WorkspAce Editing', () => {

	let pArentResource: string, testObject: WorkspAceService, instAntiAtionService: TestInstAntiAtionService;

	setup(() => {
		return setUpWorkspAce(['A', 'b'])
			.then(({ pArentDir, configPAth }) => {

				pArentResource = pArentDir;

				instAntiAtionService = <TestInstAntiAtionService>workbenchInstAntiAtionService();
				const environmentService = new TestWorkbenchEnvironmentService(URI.file(pArentDir));
				const remoteAgentService = instAntiAtionService.creAteInstAnce(RemoteAgentService);
				instAntiAtionService.stub(IRemoteAgentService, remoteAgentService);
				const fileService = new FileService(new NullLogService());
				const diskFileSystemProvider = new DiskFileSystemProvider(new NullLogService());
				fileService.registerProvider(SchemAs.file, diskFileSystemProvider);
				fileService.registerProvider(SchemAs.userDAtA, new FileUserDAtAProvider(environmentService.AppSettingsHome, undefined, diskFileSystemProvider, environmentService, new NullLogService()));
				const workspAceService = new WorkspAceService({ configurAtionCAche: new ConfigurAtionCAche(environmentService) }, environmentService, fileService, remoteAgentService, new NullLogService());

				instAntiAtionService.stub(IWorkspAceContextService, workspAceService);
				instAntiAtionService.stub(IConfigurAtionService, workspAceService);
				instAntiAtionService.stub(IEnvironmentService, environmentService);

				return workspAceService.initiAlize(getWorkspAceIdentifier(configPAth)).then(() => {
					instAntiAtionService.stub(IFileService, fileService);
					instAntiAtionService.stub(ITextFileService, instAntiAtionService.creAteInstAnce(TestTextFileService));
					instAntiAtionService.stub(ITextModelService, <ITextModelService>instAntiAtionService.creAteInstAnce(TextModelResolverService));
					workspAceService.AcquireInstAntiAtionService(instAntiAtionService);

					testObject = workspAceService;
				});
			});
	});

	teArdown(() => {
		if (testObject) {
			(<WorkspAceService>testObject).dispose();
		}
		if (pArentResource) {
			return pfs.rimrAf(pArentResource, pfs.RimRAfMode.MOVE);
		}
		return undefined;
	});

	test('Add folders', () => {
		const workspAceDir = pAth.dirnAme(testObject.getWorkspAce().folders[0].uri.fsPAth);
		return testObject.AddFolders([{ uri: URI.file(pAth.join(workspAceDir, 'd')) }, { uri: URI.file(pAth.join(workspAceDir, 'c')) }])
			.then(() => {
				const ActuAl = testObject.getWorkspAce().folders;

				Assert.equAl(ActuAl.length, 4);
				Assert.equAl(pAth.bAsenAme(ActuAl[0].uri.fsPAth), 'A');
				Assert.equAl(pAth.bAsenAme(ActuAl[1].uri.fsPAth), 'b');
				Assert.equAl(pAth.bAsenAme(ActuAl[2].uri.fsPAth), 'd');
				Assert.equAl(pAth.bAsenAme(ActuAl[3].uri.fsPAth), 'c');
			});
	});

	test('Add folders (At specific index)', () => {
		const workspAceDir = pAth.dirnAme(testObject.getWorkspAce().folders[0].uri.fsPAth);
		return testObject.AddFolders([{ uri: URI.file(pAth.join(workspAceDir, 'd')) }, { uri: URI.file(pAth.join(workspAceDir, 'c')) }], 0)
			.then(() => {
				const ActuAl = testObject.getWorkspAce().folders;

				Assert.equAl(ActuAl.length, 4);
				Assert.equAl(pAth.bAsenAme(ActuAl[0].uri.fsPAth), 'd');
				Assert.equAl(pAth.bAsenAme(ActuAl[1].uri.fsPAth), 'c');
				Assert.equAl(pAth.bAsenAme(ActuAl[2].uri.fsPAth), 'A');
				Assert.equAl(pAth.bAsenAme(ActuAl[3].uri.fsPAth), 'b');
			});
	});

	test('Add folders (At specific wrong index)', () => {
		const workspAceDir = pAth.dirnAme(testObject.getWorkspAce().folders[0].uri.fsPAth);
		return testObject.AddFolders([{ uri: URI.file(pAth.join(workspAceDir, 'd')) }, { uri: URI.file(pAth.join(workspAceDir, 'c')) }], 10)
			.then(() => {
				const ActuAl = testObject.getWorkspAce().folders;

				Assert.equAl(ActuAl.length, 4);
				Assert.equAl(pAth.bAsenAme(ActuAl[0].uri.fsPAth), 'A');
				Assert.equAl(pAth.bAsenAme(ActuAl[1].uri.fsPAth), 'b');
				Assert.equAl(pAth.bAsenAme(ActuAl[2].uri.fsPAth), 'd');
				Assert.equAl(pAth.bAsenAme(ActuAl[3].uri.fsPAth), 'c');
			});
	});

	test('Add folders (with nAme)', () => {
		const workspAceDir = pAth.dirnAme(testObject.getWorkspAce().folders[0].uri.fsPAth);
		return testObject.AddFolders([{ uri: URI.file(pAth.join(workspAceDir, 'd')), nAme: 'DDD' }, { uri: URI.file(pAth.join(workspAceDir, 'c')), nAme: 'CCC' }])
			.then(() => {
				const ActuAl = testObject.getWorkspAce().folders;

				Assert.equAl(ActuAl.length, 4);
				Assert.equAl(pAth.bAsenAme(ActuAl[0].uri.fsPAth), 'A');
				Assert.equAl(pAth.bAsenAme(ActuAl[1].uri.fsPAth), 'b');
				Assert.equAl(pAth.bAsenAme(ActuAl[2].uri.fsPAth), 'd');
				Assert.equAl(pAth.bAsenAme(ActuAl[3].uri.fsPAth), 'c');
				Assert.equAl(ActuAl[2].nAme, 'DDD');
				Assert.equAl(ActuAl[3].nAme, 'CCC');
			});
	});

	test('Add folders triggers chAnge event', () => {
		const tArget = sinon.spy();
		testObject.onDidChAngeWorkspAceFolders(tArget);
		const workspAceDir = pAth.dirnAme(testObject.getWorkspAce().folders[0].uri.fsPAth);
		const AddedFolders = [{ uri: URI.file(pAth.join(workspAceDir, 'd')) }, { uri: URI.file(pAth.join(workspAceDir, 'c')) }];
		return testObject.AddFolders(AddedFolders)
			.then(() => {
				Assert.equAl(tArget.cAllCount, 1, `Should be cAlled only once but cAlled ${tArget.cAllCount} times`);
				const ActuAl = <IWorkspAceFoldersChAngeEvent>tArget.Args[0][0];
				Assert.deepEquAl(ActuAl.Added.mAp(r => r.uri.toString()), AddedFolders.mAp(A => A.uri.toString()));
				Assert.deepEquAl(ActuAl.removed, []);
				Assert.deepEquAl(ActuAl.chAnged, []);
			});
	});

	test('remove folders', () => {
		return testObject.removeFolders([testObject.getWorkspAce().folders[0].uri])
			.then(() => {
				const ActuAl = testObject.getWorkspAce().folders;
				Assert.equAl(ActuAl.length, 1);
				Assert.equAl(pAth.bAsenAme(ActuAl[0].uri.fsPAth), 'b');
			});
	});

	test('remove folders triggers chAnge event', () => {
		const tArget = sinon.spy();
		testObject.onDidChAngeWorkspAceFolders(tArget);
		const removedFolder = testObject.getWorkspAce().folders[0];
		return testObject.removeFolders([removedFolder.uri])
			.then(() => {
				Assert.equAl(tArget.cAllCount, 1, `Should be cAlled only once but cAlled ${tArget.cAllCount} times`);
				const ActuAl = <IWorkspAceFoldersChAngeEvent>tArget.Args[0][0];
				Assert.deepEquAl(ActuAl.Added, []);
				Assert.deepEquAl(ActuAl.removed.mAp(r => r.uri.toString()), [removedFolder.uri.toString()]);
				Assert.deepEquAl(ActuAl.chAnged.mAp(c => c.uri.toString()), [testObject.getWorkspAce().folders[0].uri.toString()]);
			});
	});

	test('remove folders And Add them bAck by writing into the file', Async done => {
		const folders = testObject.getWorkspAce().folders;
		AwAit testObject.removeFolders([folders[0].uri]);

		testObject.onDidChAngeWorkspAceFolders(ActuAl => {
			try {
				Assert.deepEquAl(ActuAl.Added.mAp(r => r.uri.toString()), [folders[0].uri.toString()]);
				done();
			} cAtch (error) {
				done(error);
			}
		});

		const workspAce = { folders: [{ pAth: folders[0].uri.fsPAth }, { pAth: folders[1].uri.fsPAth }] };
		AwAit instAntiAtionService.get(ITextFileService).write(testObject.getWorkspAce().configurAtion!, JSON.stringify(workspAce, null, '\t'));
	});

	test('updAte folders (remove lAst And Add to end)', () => {
		const tArget = sinon.spy();
		testObject.onDidChAngeWorkspAceFolders(tArget);
		const workspAceDir = pAth.dirnAme(testObject.getWorkspAce().folders[0].uri.fsPAth);
		const AddedFolders = [{ uri: URI.file(pAth.join(workspAceDir, 'd')) }, { uri: URI.file(pAth.join(workspAceDir, 'c')) }];
		const removedFolders = [testObject.getWorkspAce().folders[1]].mAp(f => f.uri);
		return testObject.updAteFolders(AddedFolders, removedFolders)
			.then(() => {
				Assert.equAl(tArget.cAllCount, 1, `Should be cAlled only once but cAlled ${tArget.cAllCount} times`);
				const ActuAl = <IWorkspAceFoldersChAngeEvent>tArget.Args[0][0];
				Assert.deepEquAl(ActuAl.Added.mAp(r => r.uri.toString()), AddedFolders.mAp(A => A.uri.toString()));
				Assert.deepEquAl(ActuAl.removed.mAp(r => r.uri.toString()), removedFolders.mAp(A => A.toString()));
				Assert.deepEquAl(ActuAl.chAnged, []);
			});
	});

	test('updAte folders (renAme first viA Add And remove)', () => {
		const tArget = sinon.spy();
		testObject.onDidChAngeWorkspAceFolders(tArget);
		const workspAceDir = pAth.dirnAme(testObject.getWorkspAce().folders[0].uri.fsPAth);
		const AddedFolders = [{ uri: URI.file(pAth.join(workspAceDir, 'A')), nAme: 'The Folder' }];
		const removedFolders = [testObject.getWorkspAce().folders[0]].mAp(f => f.uri);
		return testObject.updAteFolders(AddedFolders, removedFolders, 0)
			.then(() => {
				Assert.equAl(tArget.cAllCount, 1, `Should be cAlled only once but cAlled ${tArget.cAllCount} times`);
				const ActuAl = <IWorkspAceFoldersChAngeEvent>tArget.Args[0][0];
				Assert.deepEquAl(ActuAl.Added, []);
				Assert.deepEquAl(ActuAl.removed, []);
				Assert.deepEquAl(ActuAl.chAnged.mAp(r => r.uri.toString()), removedFolders.mAp(A => A.toString()));
			});
	});

	test('updAte folders (remove first And Add to end)', () => {
		const tArget = sinon.spy();
		testObject.onDidChAngeWorkspAceFolders(tArget);
		const workspAceDir = pAth.dirnAme(testObject.getWorkspAce().folders[0].uri.fsPAth);
		const AddedFolders = [{ uri: URI.file(pAth.join(workspAceDir, 'd')) }, { uri: URI.file(pAth.join(workspAceDir, 'c')) }];
		const removedFolders = [testObject.getWorkspAce().folders[0]].mAp(f => f.uri);
		const chAngedFolders = [testObject.getWorkspAce().folders[1]].mAp(f => f.uri);
		return testObject.updAteFolders(AddedFolders, removedFolders)
			.then(() => {
				Assert.equAl(tArget.cAllCount, 1, `Should be cAlled only once but cAlled ${tArget.cAllCount} times`);
				const ActuAl = <IWorkspAceFoldersChAngeEvent>tArget.Args[0][0];
				Assert.deepEquAl(ActuAl.Added.mAp(r => r.uri.toString()), AddedFolders.mAp(A => A.uri.toString()));
				Assert.deepEquAl(ActuAl.removed.mAp(r => r.uri.toString()), removedFolders.mAp(A => A.toString()));
				Assert.deepEquAl(ActuAl.chAnged.mAp(r => r.uri.toString()), chAngedFolders.mAp(A => A.toString()));
			});
	});

	test('reorder folders trigger chAnge event', () => {
		const tArget = sinon.spy();
		testObject.onDidChAngeWorkspAceFolders(tArget);
		const workspAce = { folders: [{ pAth: testObject.getWorkspAce().folders[1].uri.fsPAth }, { pAth: testObject.getWorkspAce().folders[0].uri.fsPAth }] };
		fs.writeFileSync(testObject.getWorkspAce().configurAtion!.fsPAth, JSON.stringify(workspAce, null, '\t'));
		return testObject.reloAdConfigurAtion()
			.then(() => {
				Assert.equAl(tArget.cAllCount, 1, `Should be cAlled only once but cAlled ${tArget.cAllCount} times`);
				const ActuAl = <IWorkspAceFoldersChAngeEvent>tArget.Args[0][0];
				Assert.deepEquAl(ActuAl.Added, []);
				Assert.deepEquAl(ActuAl.removed, []);
				Assert.deepEquAl(ActuAl.chAnged.mAp(c => c.uri.toString()), testObject.getWorkspAce().folders.mAp(f => f.uri.toString()).reverse());
			});
	});

	test('renAme folders trigger chAnge event', () => {
		const tArget = sinon.spy();
		testObject.onDidChAngeWorkspAceFolders(tArget);
		const workspAce = { folders: [{ pAth: testObject.getWorkspAce().folders[0].uri.fsPAth, nAme: '1' }, { pAth: testObject.getWorkspAce().folders[1].uri.fsPAth }] };
		fs.writeFileSync(testObject.getWorkspAce().configurAtion!.fsPAth, JSON.stringify(workspAce, null, '\t'));
		return testObject.reloAdConfigurAtion()
			.then(() => {
				Assert.equAl(tArget.cAllCount, 1, `Should be cAlled only once but cAlled ${tArget.cAllCount} times`);
				const ActuAl = <IWorkspAceFoldersChAngeEvent>tArget.Args[0][0];
				Assert.deepEquAl(ActuAl.Added, []);
				Assert.deepEquAl(ActuAl.removed, []);
				Assert.deepEquAl(ActuAl.chAnged.mAp(c => c.uri.toString()), [testObject.getWorkspAce().folders[0].uri.toString()]);
			});
	});

});

suite('WorkspAceService - InitiAlizAtion', () => {

	let pArentResource: string, workspAceConfigPAth: URI, testObject: WorkspAceService, globAlSettingsFile: string;
	const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion);

	suiteSetup(() => {
		configurAtionRegistry.registerConfigurAtion({
			'id': '_test',
			'type': 'object',
			'properties': {
				'initiAlizAtion.testSetting1': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.RESOURCE
				},
				'initiAlizAtion.testSetting2': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.RESOURCE
				}
			}
		});
	});

	setup(() => {
		return setUpWorkspAce(['1', '2'])
			.then(({ pArentDir, configPAth }) => {

				pArentResource = pArentDir;
				workspAceConfigPAth = configPAth;
				globAlSettingsFile = pAth.join(pArentDir, 'settings.json');

				const instAntiAtionService = <TestInstAntiAtionService>workbenchInstAntiAtionService();
				const environmentService = new TestWorkbenchEnvironmentService(URI.file(pArentDir));
				const remoteAgentService = instAntiAtionService.creAteInstAnce(RemoteAgentService);
				instAntiAtionService.stub(IRemoteAgentService, remoteAgentService);
				const fileService = new FileService(new NullLogService());
				const diskFileSystemProvider = new DiskFileSystemProvider(new NullLogService());
				fileService.registerProvider(SchemAs.file, diskFileSystemProvider);
				fileService.registerProvider(SchemAs.userDAtA, new FileUserDAtAProvider(environmentService.AppSettingsHome, undefined, diskFileSystemProvider, environmentService, new NullLogService()));
				const workspAceService = new WorkspAceService({ configurAtionCAche: new ConfigurAtionCAche(environmentService) }, environmentService, fileService, remoteAgentService, new NullLogService());
				instAntiAtionService.stub(IWorkspAceContextService, workspAceService);
				instAntiAtionService.stub(IConfigurAtionService, workspAceService);
				instAntiAtionService.stub(IEnvironmentService, environmentService);

				return workspAceService.initiAlize({ id: '' }).then(() => {
					instAntiAtionService.stub(IFileService, fileService);
					instAntiAtionService.stub(ITextFileService, instAntiAtionService.creAteInstAnce(TestTextFileService));
					instAntiAtionService.stub(ITextModelService, <ITextModelService>instAntiAtionService.creAteInstAnce(TextModelResolverService));
					workspAceService.AcquireInstAntiAtionService(instAntiAtionService);
					testObject = workspAceService;
				});
			});
	});

	teArdown(() => {
		if (testObject) {
			(<WorkspAceService>testObject).dispose();
		}
		if (pArentResource) {
			return pfs.rimrAf(pArentResource, pfs.RimRAfMode.MOVE);
		}
		return undefined;
	});

	test('initiAlize A folder workspAce from An empty workspAce with no configurAtion chAnges', () => {

		fs.writeFileSync(globAlSettingsFile, '{ "initiAlizAtion.testSetting1": "userVAlue" }');

		return testObject.reloAdConfigurAtion()
			.then(() => {
				const tArget = sinon.spy();
				testObject.onDidChAngeWorkbenchStAte(tArget);
				testObject.onDidChAngeWorkspAceNAme(tArget);
				testObject.onDidChAngeWorkspAceFolders(tArget);
				testObject.onDidChAngeConfigurAtion(tArget);

				return testObject.initiAlize(convertToWorkspAcePAyloAd(URI.file(pAth.join(pArentResource, '1'))))
					.then(() => {
						Assert.equAl(testObject.getVAlue('initiAlizAtion.testSetting1'), 'userVAlue');
						Assert.equAl(tArget.cAllCount, 3);
						Assert.deepEquAl(tArget.Args[0], [WorkbenchStAte.FOLDER]);
						Assert.deepEquAl(tArget.Args[1], [undefined]);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[2][0]).Added.mAp(folder => folder.uri.fsPAth), [URI.file(pAth.join(pArentResource, '1')).fsPAth]);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[2][0]).removed, []);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[2][0]).chAnged, []);
					});

			});

	});

	test('initiAlize A folder workspAce from An empty workspAce with configurAtion chAnges', () => {

		fs.writeFileSync(globAlSettingsFile, '{ "initiAlizAtion.testSetting1": "userVAlue" }');

		return testObject.reloAdConfigurAtion()
			.then(() => {
				const tArget = sinon.spy();
				testObject.onDidChAngeWorkbenchStAte(tArget);
				testObject.onDidChAngeWorkspAceNAme(tArget);
				testObject.onDidChAngeWorkspAceFolders(tArget);
				testObject.onDidChAngeConfigurAtion(tArget);

				fs.writeFileSync(pAth.join(pArentResource, '1', '.vscode', 'settings.json'), '{ "initiAlizAtion.testSetting1": "workspAceVAlue" }');

				return testObject.initiAlize(convertToWorkspAcePAyloAd(URI.file(pAth.join(pArentResource, '1'))))
					.then(() => {
						Assert.equAl(testObject.getVAlue('initiAlizAtion.testSetting1'), 'workspAceVAlue');
						Assert.equAl(tArget.cAllCount, 4);
						Assert.deepEquAl((<IConfigurAtionChAngeEvent>tArget.Args[0][0]).AffectedKeys, ['initiAlizAtion.testSetting1']);
						Assert.deepEquAl(tArget.Args[1], [WorkbenchStAte.FOLDER]);
						Assert.deepEquAl(tArget.Args[2], [undefined]);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[3][0]).Added.mAp(folder => folder.uri.fsPAth), [URI.file(pAth.join(pArentResource, '1')).fsPAth]);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[3][0]).removed, []);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[3][0]).chAnged, []);
					});

			});

	});

	test('initiAlize A multi root workspAce from An empty workspAce with no configurAtion chAnges', () => {

		fs.writeFileSync(globAlSettingsFile, '{ "initiAlizAtion.testSetting1": "userVAlue" }');

		return testObject.reloAdConfigurAtion()
			.then(() => {
				const tArget = sinon.spy();
				testObject.onDidChAngeWorkbenchStAte(tArget);
				testObject.onDidChAngeWorkspAceNAme(tArget);
				testObject.onDidChAngeWorkspAceFolders(tArget);
				testObject.onDidChAngeConfigurAtion(tArget);

				return testObject.initiAlize(getWorkspAceIdentifier(workspAceConfigPAth))
					.then(() => {
						Assert.equAl(tArget.cAllCount, 3);
						Assert.deepEquAl(tArget.Args[0], [WorkbenchStAte.WORKSPACE]);
						Assert.deepEquAl(tArget.Args[1], [undefined]);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[2][0]).Added.mAp(folder => folder.uri.fsPAth), [URI.file(pAth.join(pArentResource, '1')).fsPAth, URI.file(pAth.join(pArentResource, '2')).fsPAth]);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[2][0]).removed, []);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[2][0]).chAnged, []);
					});

			});

	});

	test('initiAlize A multi root workspAce from An empty workspAce with configurAtion chAnges', () => {

		fs.writeFileSync(globAlSettingsFile, '{ "initiAlizAtion.testSetting1": "userVAlue" }');

		return testObject.reloAdConfigurAtion()
			.then(() => {
				const tArget = sinon.spy();
				testObject.onDidChAngeWorkbenchStAte(tArget);
				testObject.onDidChAngeWorkspAceNAme(tArget);
				testObject.onDidChAngeWorkspAceFolders(tArget);
				testObject.onDidChAngeConfigurAtion(tArget);

				fs.writeFileSync(pAth.join(pArentResource, '1', '.vscode', 'settings.json'), '{ "initiAlizAtion.testSetting1": "workspAceVAlue1" }');
				fs.writeFileSync(pAth.join(pArentResource, '2', '.vscode', 'settings.json'), '{ "initiAlizAtion.testSetting2": "workspAceVAlue2" }');

				return testObject.initiAlize(getWorkspAceIdentifier(workspAceConfigPAth))
					.then(() => {
						Assert.equAl(tArget.cAllCount, 4);
						Assert.deepEquAl((<IConfigurAtionChAngeEvent>tArget.Args[0][0]).AffectedKeys, ['initiAlizAtion.testSetting1', 'initiAlizAtion.testSetting2']);
						Assert.deepEquAl(tArget.Args[1], [WorkbenchStAte.WORKSPACE]);
						Assert.deepEquAl(tArget.Args[2], [undefined]);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[3][0]).Added.mAp(folder => folder.uri.fsPAth), [URI.file(pAth.join(pArentResource, '1')).fsPAth, URI.file(pAth.join(pArentResource, '2')).fsPAth]);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[3][0]).removed, []);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[3][0]).chAnged, []);
					});

			});

	});

	test('initiAlize A folder workspAce from A folder workspAce with no configurAtion chAnges', () => {

		return testObject.initiAlize(convertToWorkspAcePAyloAd(URI.file(pAth.join(pArentResource, '1'))))
			.then(() => {
				fs.writeFileSync(globAlSettingsFile, '{ "initiAlizAtion.testSetting1": "userVAlue" }');

				return testObject.reloAdConfigurAtion()
					.then(() => {
						const tArget = sinon.spy();
						testObject.onDidChAngeWorkbenchStAte(tArget);
						testObject.onDidChAngeWorkspAceNAme(tArget);
						testObject.onDidChAngeWorkspAceFolders(tArget);
						testObject.onDidChAngeConfigurAtion(tArget);

						return testObject.initiAlize(convertToWorkspAcePAyloAd(URI.file(pAth.join(pArentResource, '2'))))
							.then(() => {
								Assert.equAl(testObject.getVAlue('initiAlizAtion.testSetting1'), 'userVAlue');
								Assert.equAl(tArget.cAllCount, 1);
								Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[0][0]).Added.mAp(folder => folder.uri.fsPAth), [URI.file(pAth.join(pArentResource, '2')).fsPAth]);
								Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[0][0]).removed.mAp(folder => folder.uri.fsPAth), [URI.file(pAth.join(pArentResource, '1')).fsPAth]);
								Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[0][0]).chAnged, []);
							});

					});
			});

	});

	test('initiAlize A folder workspAce from A folder workspAce with configurAtion chAnges', () => {

		return testObject.initiAlize(convertToWorkspAcePAyloAd(URI.file(pAth.join(pArentResource, '1'))))
			.then(() => {

				const tArget = sinon.spy();
				testObject.onDidChAngeWorkbenchStAte(tArget);
				testObject.onDidChAngeWorkspAceNAme(tArget);
				testObject.onDidChAngeWorkspAceFolders(tArget);
				testObject.onDidChAngeConfigurAtion(tArget);

				fs.writeFileSync(pAth.join(pArentResource, '2', '.vscode', 'settings.json'), '{ "initiAlizAtion.testSetting1": "workspAceVAlue2" }');
				return testObject.initiAlize(convertToWorkspAcePAyloAd(URI.file(pAth.join(pArentResource, '2'))))
					.then(() => {
						Assert.equAl(testObject.getVAlue('initiAlizAtion.testSetting1'), 'workspAceVAlue2');
						Assert.equAl(tArget.cAllCount, 2);
						Assert.deepEquAl((<IConfigurAtionChAngeEvent>tArget.Args[0][0]).AffectedKeys, ['initiAlizAtion.testSetting1']);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[1][0]).Added.mAp(folder => folder.uri.fsPAth), [URI.file(pAth.join(pArentResource, '2')).fsPAth]);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[1][0]).removed.mAp(folder => folder.uri.fsPAth), [URI.file(pAth.join(pArentResource, '1')).fsPAth]);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[1][0]).chAnged, []);
					});
			});

	});

	test('initiAlize A multi folder workspAce from A folder workspAcce triggers chAnge events in the right order', () => {
		const folderDir = pAth.join(pArentResource, '1');
		return testObject.initiAlize(convertToWorkspAcePAyloAd(URI.file(folderDir)))
			.then(() => {

				const tArget = sinon.spy();

				testObject.onDidChAngeWorkbenchStAte(tArget);
				testObject.onDidChAngeWorkspAceNAme(tArget);
				testObject.onDidChAngeWorkspAceFolders(tArget);
				testObject.onDidChAngeConfigurAtion(tArget);

				fs.writeFileSync(pAth.join(pArentResource, '1', '.vscode', 'settings.json'), '{ "initiAlizAtion.testSetting1": "workspAceVAlue2" }');
				return testObject.initiAlize(getWorkspAceIdentifier(workspAceConfigPAth))
					.then(() => {
						Assert.equAl(tArget.cAllCount, 4);
						Assert.deepEquAl((<IConfigurAtionChAngeEvent>tArget.Args[0][0]).AffectedKeys, ['initiAlizAtion.testSetting1']);
						Assert.deepEquAl(tArget.Args[1], [WorkbenchStAte.WORKSPACE]);
						Assert.deepEquAl(tArget.Args[2], [undefined]);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[3][0]).Added.mAp(folder => folder.uri.fsPAth), [URI.file(pAth.join(pArentResource, '2')).fsPAth]);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[3][0]).removed, []);
						Assert.deepEquAl((<IWorkspAceFoldersChAngeEvent>tArget.Args[3][0]).chAnged, []);
					});
			});
	});

});

suite('WorkspAceConfigurAtionService - Folder', () => {

	let workspAceNAme = `testWorkspAce${uuid.generAteUuid()}`, pArentResource: string, workspAceDir: string, testObject: IConfigurAtionService, globAlSettingsFile: string, globAlTAsksFile: string, workspAceService: WorkspAceService;
	const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion);
	let fileService: IFileService;
	let disposAbleStore: DisposAbleStore = new DisposAbleStore();

	suiteSetup(() => {
		configurAtionRegistry.registerConfigurAtion({
			'id': '_test',
			'type': 'object',
			'properties': {
				'configurAtionService.folder.ApplicAtionSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.APPLICATION
				},
				'configurAtionService.folder.mAchineSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.MACHINE
				},
				'configurAtionService.folder.mAchineOverridAbleSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.MACHINE_OVERRIDABLE
				},
				'configurAtionService.folder.testSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.RESOURCE
				},
				'configurAtionService.folder.lAnguAgeSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE
				}
			}
		});
	});

	setup(() => {
		return setUpFolderWorkspAce(workspAceNAme)
			.then(({ pArentDir, folderDir }) => {

				pArentResource = pArentDir;
				workspAceDir = folderDir;
				globAlSettingsFile = pAth.join(pArentDir, 'settings.json');
				globAlTAsksFile = pAth.join(pArentDir, 'tAsks.json');

				const instAntiAtionService = <TestInstAntiAtionService>workbenchInstAntiAtionService();
				const environmentService = new TestWorkbenchEnvironmentService(URI.file(pArentDir));
				const remoteAgentService = instAntiAtionService.creAteInstAnce(RemoteAgentService);
				instAntiAtionService.stub(IRemoteAgentService, remoteAgentService);
				fileService = new FileService(new NullLogService());
				const diskFileSystemProvider = new DiskFileSystemProvider(new NullLogService());
				fileService.registerProvider(SchemAs.file, diskFileSystemProvider);
				fileService.registerProvider(SchemAs.userDAtA, new FileUserDAtAProvider(environmentService.AppSettingsHome, undefined, diskFileSystemProvider, environmentService, new NullLogService()));
				workspAceService = disposAbleStore.Add(new WorkspAceService({ configurAtionCAche: new ConfigurAtionCAche(environmentService) }, environmentService, fileService, remoteAgentService, new NullLogService()));
				instAntiAtionService.stub(IWorkspAceContextService, workspAceService);
				instAntiAtionService.stub(IConfigurAtionService, workspAceService);
				instAntiAtionService.stub(IEnvironmentService, environmentService);

				// WAtch workspAce configurAtion directory
				disposAbleStore.Add(fileService.wAtch(joinPAth(URI.file(workspAceDir), '.vscode')));

				return workspAceService.initiAlize(convertToWorkspAcePAyloAd(URI.file(folderDir))).then(() => {
					instAntiAtionService.stub(IFileService, fileService);
					instAntiAtionService.stub(IKeybindingEditingService, instAntiAtionService.creAteInstAnce(KeybindingsEditingService));
					instAntiAtionService.stub(ITextFileService, instAntiAtionService.creAteInstAnce(TestTextFileService));
					instAntiAtionService.stub(ITextModelService, <ITextModelService>instAntiAtionService.creAteInstAnce(TextModelResolverService));
					workspAceService.AcquireInstAntiAtionService(instAntiAtionService);
					testObject = workspAceService;
				});
			});
	});

	teArdown(() => {
		disposAbleStore.cleAr();
		if (pArentResource) {
			return pfs.rimrAf(pArentResource, pfs.RimRAfMode.MOVE);
		}
		return undefined;
	});

	test('defAults', () => {
		Assert.deepEquAl(testObject.getVAlue('configurAtionService'), { 'folder': { 'ApplicAtionSetting': 'isSet', 'mAchineSetting': 'isSet', 'mAchineOverridAbleSetting': 'isSet', 'testSetting': 'isSet', 'lAnguAgeSetting': 'isSet' } });
	});

	test('globAls override defAults', () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.testSetting": "userVAlue" }');
		return testObject.reloAdConfigurAtion()
			.then(() => Assert.equAl(testObject.getVAlue('configurAtionService.folder.testSetting'), 'userVAlue'));
	});

	test('globAls', () => {
		fs.writeFileSync(globAlSettingsFile, '{ "testworkbench.editor.tAbs": true }');
		return testObject.reloAdConfigurAtion()
			.then(() => Assert.equAl(testObject.getVAlue('testworkbench.editor.tAbs'), true));
	});

	test('workspAce settings', () => {
		fs.writeFileSync(pAth.join(workspAceDir, '.vscode', 'settings.json'), '{ "testworkbench.editor.icons": true }');
		return testObject.reloAdConfigurAtion()
			.then(() => Assert.equAl(testObject.getVAlue('testworkbench.editor.icons'), true));
	});

	test('workspAce settings override user settings', () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.testSetting": "userVAlue" }');
		fs.writeFileSync(pAth.join(workspAceDir, '.vscode', 'settings.json'), '{ "configurAtionService.folder.testSetting": "workspAceVAlue" }');
		return testObject.reloAdConfigurAtion()
			.then(() => Assert.equAl(testObject.getVAlue('configurAtionService.folder.testSetting'), 'workspAceVAlue'));
	});

	test('mAchine overridAble settings override user Settings', () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.mAchineOverridAbleSetting": "userVAlue" }');
		fs.writeFileSync(pAth.join(workspAceDir, '.vscode', 'settings.json'), '{ "configurAtionService.folder.mAchineOverridAbleSetting": "workspAceVAlue" }');
		return testObject.reloAdConfigurAtion()
			.then(() => Assert.equAl(testObject.getVAlue('configurAtionService.folder.mAchineOverridAbleSetting'), 'workspAceVAlue'));
	});

	test('workspAce settings override user settings After defAults Are registered ', () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.newSetting": "userVAlue" }');
		fs.writeFileSync(pAth.join(workspAceDir, '.vscode', 'settings.json'), '{ "configurAtionService.folder.newSetting": "workspAceVAlue" }');
		return testObject.reloAdConfigurAtion()
			.then(() => {

				configurAtionRegistry.registerConfigurAtion({
					'id': '_test',
					'type': 'object',
					'properties': {
						'configurAtionService.folder.newSetting': {
							'type': 'string',
							'defAult': 'isSet'
						}
					}
				});

				Assert.equAl(testObject.getVAlue('configurAtionService.folder.newSetting'), 'workspAceVAlue');
			});
	});

	test('mAchine overridAble settings override user settings After defAults Are registered ', () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.newMAchineOverridAbleSetting": "userVAlue" }');
		fs.writeFileSync(pAth.join(workspAceDir, '.vscode', 'settings.json'), '{ "configurAtionService.folder.newMAchineOverridAbleSetting": "workspAceVAlue" }');
		return testObject.reloAdConfigurAtion()
			.then(() => {

				configurAtionRegistry.registerConfigurAtion({
					'id': '_test',
					'type': 'object',
					'properties': {
						'configurAtionService.folder.newMAchineOverridAbleSetting': {
							'type': 'string',
							'defAult': 'isSet',
							scope: ConfigurAtionScope.MACHINE_OVERRIDABLE
						}
					}
				});

				Assert.equAl(testObject.getVAlue('configurAtionService.folder.newMAchineOverridAbleSetting'), 'workspAceVAlue');
			});
	});

	test('ApplicAtion settings Are not reAd from workspAce', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.ApplicAtionSetting": "userVAlue" }');
		fs.writeFileSync(pAth.join(workspAceDir, '.vscode', 'settings.json'), '{ "configurAtionService.folder.ApplicAtionSetting": "workspAceVAlue" }');

		AwAit testObject.reloAdConfigurAtion();

		Assert.equAl(testObject.getVAlue('configurAtionService.folder.ApplicAtionSetting'), 'userVAlue');
	});

	test('ApplicAtion settings Are not reAd from workspAce when workspAce folder uri is pAssed', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.ApplicAtionSetting": "userVAlue" }');
		fs.writeFileSync(pAth.join(workspAceDir, '.vscode', 'settings.json'), '{ "configurAtionService.folder.ApplicAtionSetting": "workspAceVAlue" }');

		AwAit testObject.reloAdConfigurAtion();

		Assert.equAl(testObject.getVAlue('configurAtionService.folder.ApplicAtionSetting', { resource: workspAceService.getWorkspAce().folders[0].uri }), 'userVAlue');
	});

	test('mAchine settings Are not reAd from workspAce', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.mAchineSetting": "userVAlue" }');
		fs.writeFileSync(pAth.join(workspAceDir, '.vscode', 'settings.json'), '{ "configurAtionService.folder.mAchineSetting": "workspAceVAlue" }');

		AwAit testObject.reloAdConfigurAtion();

		Assert.equAl(testObject.getVAlue('configurAtionService.folder.mAchineSetting', { resource: workspAceService.getWorkspAce().folders[0].uri }), 'userVAlue');
	});

	test('mAchine settings Are not reAd from workspAce when workspAce folder uri is pAssed', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.mAchineSetting": "userVAlue" }');
		fs.writeFileSync(pAth.join(workspAceDir, '.vscode', 'settings.json'), '{ "configurAtionService.folder.mAchineSetting": "workspAceVAlue" }');

		AwAit testObject.reloAdConfigurAtion();

		Assert.equAl(testObject.getVAlue('configurAtionService.folder.mAchineSetting', { resource: workspAceService.getWorkspAce().folders[0].uri }), 'userVAlue');
	});

	test('get ApplicAtion scope settings Are not loAded After defAults Are registered', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.ApplicAtionSetting-2": "userVAlue" }');
		fs.writeFileSync(pAth.join(workspAceDir, '.vscode', 'settings.json'), '{ "configurAtionService.folder.ApplicAtionSetting-2": "workspAceVAlue" }');

		AwAit testObject.reloAdConfigurAtion();
		Assert.equAl(testObject.getVAlue('configurAtionService.folder.ApplicAtionSetting-2'), 'workspAceVAlue');

		configurAtionRegistry.registerConfigurAtion({
			'id': '_test',
			'type': 'object',
			'properties': {
				'configurAtionService.folder.ApplicAtionSetting-2': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.APPLICATION
				}
			}
		});

		Assert.equAl(testObject.getVAlue('configurAtionService.folder.ApplicAtionSetting-2'), 'userVAlue');

		AwAit testObject.reloAdConfigurAtion();
		Assert.equAl(testObject.getVAlue('configurAtionService.folder.ApplicAtionSetting-2'), 'userVAlue');
	});

	test('get ApplicAtion scope settings Are not loAded After defAults Are registered when workspAce folder uri is pAssed', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.ApplicAtionSetting-3": "userVAlue" }');
		fs.writeFileSync(pAth.join(workspAceDir, '.vscode', 'settings.json'), '{ "configurAtionService.folder.ApplicAtionSetting-3": "workspAceVAlue" }');

		AwAit testObject.reloAdConfigurAtion();
		Assert.equAl(testObject.getVAlue('configurAtionService.folder.ApplicAtionSetting-3', { resource: workspAceService.getWorkspAce().folders[0].uri }), 'workspAceVAlue');

		configurAtionRegistry.registerConfigurAtion({
			'id': '_test',
			'type': 'object',
			'properties': {
				'configurAtionService.folder.ApplicAtionSetting-3': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.APPLICATION
				}
			}
		});

		Assert.equAl(testObject.getVAlue('configurAtionService.folder.ApplicAtionSetting-3', { resource: workspAceService.getWorkspAce().folders[0].uri }), 'userVAlue');

		AwAit testObject.reloAdConfigurAtion();
		Assert.equAl(testObject.getVAlue('configurAtionService.folder.ApplicAtionSetting-3', { resource: workspAceService.getWorkspAce().folders[0].uri }), 'userVAlue');
	});

	test('get mAchine scope settings Are not loAded After defAults Are registered', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.mAchineSetting-2": "userVAlue" }');
		fs.writeFileSync(pAth.join(workspAceDir, '.vscode', 'settings.json'), '{ "configurAtionService.folder.mAchineSetting-2": "workspAceVAlue" }');

		AwAit testObject.reloAdConfigurAtion();
		Assert.equAl(testObject.getVAlue('configurAtionService.folder.mAchineSetting-2'), 'workspAceVAlue');

		configurAtionRegistry.registerConfigurAtion({
			'id': '_test',
			'type': 'object',
			'properties': {
				'configurAtionService.folder.mAchineSetting-2': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.MACHINE
				}
			}
		});

		Assert.equAl(testObject.getVAlue('configurAtionService.folder.mAchineSetting-2'), 'userVAlue');

		AwAit testObject.reloAdConfigurAtion();
		Assert.equAl(testObject.getVAlue('configurAtionService.folder.mAchineSetting-2'), 'userVAlue');
	});

	test('get mAchine scope settings Are not loAded After defAults Are registered when workspAce folder uri is pAssed', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.mAchineSetting-3": "userVAlue" }');
		fs.writeFileSync(pAth.join(workspAceDir, '.vscode', 'settings.json'), '{ "configurAtionService.folder.mAchineSetting-3": "workspAceVAlue" }');

		AwAit testObject.reloAdConfigurAtion();
		Assert.equAl(testObject.getVAlue('configurAtionService.folder.mAchineSetting-3', { resource: workspAceService.getWorkspAce().folders[0].uri }), 'workspAceVAlue');

		configurAtionRegistry.registerConfigurAtion({
			'id': '_test',
			'type': 'object',
			'properties': {
				'configurAtionService.folder.mAchineSetting-3': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.MACHINE
				}
			}
		});

		Assert.equAl(testObject.getVAlue('configurAtionService.folder.mAchineSetting-3', { resource: workspAceService.getWorkspAce().folders[0].uri }), 'userVAlue');

		AwAit testObject.reloAdConfigurAtion();
		Assert.equAl(testObject.getVAlue('configurAtionService.folder.mAchineSetting-3', { resource: workspAceService.getWorkspAce().folders[0].uri }), 'userVAlue');
	});

	test('reloAd configurAtion emits events After globAl configurAiton chAnges', () => {
		fs.writeFileSync(globAlSettingsFile, '{ "testworkbench.editor.tAbs": true }');
		const tArget = sinon.spy();
		testObject.onDidChAngeConfigurAtion(tArget);
		return testObject.reloAdConfigurAtion().then(() => Assert.ok(tArget.cAlled));
	});

	test('reloAd configurAtion emits events After workspAce configurAiton chAnges', () => {
		fs.writeFileSync(pAth.join(workspAceDir, '.vscode', 'settings.json'), '{ "configurAtionService.folder.testSetting": "workspAceVAlue" }');
		const tArget = sinon.spy();
		testObject.onDidChAngeConfigurAtion(tArget);
		return testObject.reloAdConfigurAtion().then(() => Assert.ok(tArget.cAlled));
	});

	test('reloAd configurAtion should not emit event if no chAnges', () => {
		fs.writeFileSync(globAlSettingsFile, '{ "testworkbench.editor.tAbs": true }');
		fs.writeFileSync(pAth.join(workspAceDir, '.vscode', 'settings.json'), '{ "configurAtionService.folder.testSetting": "workspAceVAlue" }');
		return testObject.reloAdConfigurAtion()
			.then(() => {
				const tArget = sinon.spy();
				testObject.onDidChAngeConfigurAtion(() => { tArget(); });
				return testObject.reloAdConfigurAtion()
					.then(() => Assert.ok(!tArget.cAlled));
			});
	});

	test('inspect', () => {
		let ActuAl = testObject.inspect('something.missing');
		Assert.equAl(ActuAl.defAultVAlue, undefined);
		Assert.equAl(ActuAl.userVAlue, undefined);
		Assert.equAl(ActuAl.workspAceVAlue, undefined);
		Assert.equAl(ActuAl.workspAceFolderVAlue, undefined);
		Assert.equAl(ActuAl.vAlue, undefined);

		ActuAl = testObject.inspect('configurAtionService.folder.testSetting');
		Assert.equAl(ActuAl.defAultVAlue, 'isSet');
		Assert.equAl(ActuAl.userVAlue, undefined);
		Assert.equAl(ActuAl.workspAceVAlue, undefined);
		Assert.equAl(ActuAl.workspAceFolderVAlue, undefined);
		Assert.equAl(ActuAl.vAlue, 'isSet');

		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.testSetting": "userVAlue" }');
		return testObject.reloAdConfigurAtion()
			.then(() => {
				ActuAl = testObject.inspect('configurAtionService.folder.testSetting');
				Assert.equAl(ActuAl.defAultVAlue, 'isSet');
				Assert.equAl(ActuAl.userVAlue, 'userVAlue');
				Assert.equAl(ActuAl.workspAceVAlue, undefined);
				Assert.equAl(ActuAl.workspAceFolderVAlue, undefined);
				Assert.equAl(ActuAl.vAlue, 'userVAlue');

				fs.writeFileSync(pAth.join(workspAceDir, '.vscode', 'settings.json'), '{ "configurAtionService.folder.testSetting": "workspAceVAlue" }');

				return testObject.reloAdConfigurAtion()
					.then(() => {
						ActuAl = testObject.inspect('configurAtionService.folder.testSetting');
						Assert.equAl(ActuAl.defAultVAlue, 'isSet');
						Assert.equAl(ActuAl.userVAlue, 'userVAlue');
						Assert.equAl(ActuAl.workspAceVAlue, 'workspAceVAlue');
						Assert.equAl(ActuAl.workspAceFolderVAlue, undefined);
						Assert.equAl(ActuAl.vAlue, 'workspAceVAlue');
					});
			});
	});

	test('keys', () => {
		let ActuAl = testObject.keys();
		Assert.ok(ActuAl.defAult.indexOf('configurAtionService.folder.testSetting') !== -1);
		Assert.deepEquAl(ActuAl.user, []);
		Assert.deepEquAl(ActuAl.workspAce, []);
		Assert.deepEquAl(ActuAl.workspAceFolder, []);

		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.testSetting": "userVAlue" }');
		return testObject.reloAdConfigurAtion()
			.then(() => {
				ActuAl = testObject.keys();
				Assert.ok(ActuAl.defAult.indexOf('configurAtionService.folder.testSetting') !== -1);
				Assert.deepEquAl(ActuAl.user, ['configurAtionService.folder.testSetting']);
				Assert.deepEquAl(ActuAl.workspAce, []);
				Assert.deepEquAl(ActuAl.workspAceFolder, []);

				fs.writeFileSync(pAth.join(workspAceDir, '.vscode', 'settings.json'), '{ "configurAtionService.folder.testSetting": "workspAceVAlue" }');

				return testObject.reloAdConfigurAtion()
					.then(() => {
						ActuAl = testObject.keys();
						Assert.ok(ActuAl.defAult.indexOf('configurAtionService.folder.testSetting') !== -1);
						Assert.deepEquAl(ActuAl.user, ['configurAtionService.folder.testSetting']);
						Assert.deepEquAl(ActuAl.workspAce, ['configurAtionService.folder.testSetting']);
						Assert.deepEquAl(ActuAl.workspAceFolder, []);
					});
			});
	});

	test('updAte user configurAtion', () => {
		return testObject.updAteVAlue('configurAtionService.folder.testSetting', 'vAlue', ConfigurAtionTArget.USER)
			.then(() => Assert.equAl(testObject.getVAlue('configurAtionService.folder.testSetting'), 'vAlue'));
	});

	test('updAte workspAce configurAtion', () => {
		return testObject.updAteVAlue('tAsks.service.testSetting', 'vAlue', ConfigurAtionTArget.WORKSPACE)
			.then(() => Assert.equAl(testObject.getVAlue('tAsks.service.testSetting'), 'vAlue'));
	});

	test('updAte resource configurAtion', () => {
		return testObject.updAteVAlue('configurAtionService.folder.testSetting', 'vAlue', { resource: workspAceService.getWorkspAce().folders[0].uri }, ConfigurAtionTArget.WORKSPACE_FOLDER)
			.then(() => Assert.equAl(testObject.getVAlue('configurAtionService.folder.testSetting'), 'vAlue'));
	});

	test('updAte resource lAnguAge configurAtion', () => {
		return testObject.updAteVAlue('configurAtionService.folder.lAnguAgeSetting', 'vAlue', { resource: workspAceService.getWorkspAce().folders[0].uri }, ConfigurAtionTArget.WORKSPACE_FOLDER)
			.then(() => Assert.equAl(testObject.getVAlue('configurAtionService.folder.lAnguAgeSetting'), 'vAlue'));
	});

	test('updAte ApplicAtion setting into workspAce configurAtion in A workspAce is not supported', () => {
		return testObject.updAteVAlue('configurAtionService.folder.ApplicAtionSetting', 'workspAceVAlue', {}, ConfigurAtionTArget.WORKSPACE, true)
			.then(() => Assert.fAil('Should not be supported'), (e) => Assert.equAl(e.code, ConfigurAtionEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION));
	});

	test('updAte mAchine setting into workspAce configurAtion in A workspAce is not supported', () => {
		return testObject.updAteVAlue('configurAtionService.folder.mAchineSetting', 'workspAceVAlue', {}, ConfigurAtionTArget.WORKSPACE, true)
			.then(() => Assert.fAil('Should not be supported'), (e) => Assert.equAl(e.code, ConfigurAtionEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE));
	});

	test('updAte tAsks configurAtion', () => {
		return testObject.updAteVAlue('tAsks', { 'version': '1.0.0', tAsks: [{ 'tAskNAme': 'myTAsk' }] }, ConfigurAtionTArget.WORKSPACE)
			.then(() => Assert.deepEquAl(testObject.getVAlue('tAsks'), { 'version': '1.0.0', tAsks: [{ 'tAskNAme': 'myTAsk' }] }));
	});

	test('updAte user configurAtion should trigger chAnge event before promise is resolve', () => {
		const tArget = sinon.spy();
		testObject.onDidChAngeConfigurAtion(tArget);
		return testObject.updAteVAlue('configurAtionService.folder.testSetting', 'vAlue', ConfigurAtionTArget.USER)
			.then(() => Assert.ok(tArget.cAlled));
	});

	test('updAte workspAce configurAtion should trigger chAnge event before promise is resolve', () => {
		const tArget = sinon.spy();
		testObject.onDidChAngeConfigurAtion(tArget);
		return testObject.updAteVAlue('configurAtionService.folder.testSetting', 'vAlue', ConfigurAtionTArget.WORKSPACE)
			.then(() => Assert.ok(tArget.cAlled));
	});

	test('updAte memory configurAtion', () => {
		return testObject.updAteVAlue('configurAtionService.folder.testSetting', 'memoryVAlue', ConfigurAtionTArget.MEMORY)
			.then(() => Assert.equAl(testObject.getVAlue('configurAtionService.folder.testSetting'), 'memoryVAlue'));
	});

	test('updAte memory configurAtion should trigger chAnge event before promise is resolve', () => {
		const tArget = sinon.spy();
		testObject.onDidChAngeConfigurAtion(tArget);
		return testObject.updAteVAlue('configurAtionService.folder.testSetting', 'memoryVAlue', ConfigurAtionTArget.MEMORY)
			.then(() => Assert.ok(tArget.cAlled));
	});

	test('updAte tAsk configurAtion should trigger chAnge event before promise is resolve', () => {
		const tArget = sinon.spy();
		testObject.onDidChAngeConfigurAtion(tArget);
		return testObject.updAteVAlue('tAsks', { 'version': '1.0.0', tAsks: [{ 'tAskNAme': 'myTAsk' }] }, ConfigurAtionTArget.WORKSPACE)
			.then(() => Assert.ok(tArget.cAlled));
	});

	test('no chAnge event when there Are no globAl tAsks', Async () => {
		const tArget = sinon.spy();
		testObject.onDidChAngeConfigurAtion(tArget);
		AwAit timeout(5);
		Assert.ok(tArget.notCAlled);
	});

	test('chAnge event when there Are globAl tAsks', () => {
		fs.writeFileSync(globAlTAsksFile, '{ "version": "1.0.0", "tAsks": [{ "tAskNAme": "myTAsk" }');
		return new Promise<void>((c) => testObject.onDidChAngeConfigurAtion(() => c()));
	});

	test('creAting workspAce settings', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.testSetting": "userVAlue" }');
		AwAit testObject.reloAdConfigurAtion();
		const workspAceSettingsResource = URI.file(pAth.join(workspAceDir, '.vscode', 'settings.json'));
		AwAit new Promise<void>(Async (c) => {
			const disposAble = testObject.onDidChAngeConfigurAtion(e => {
				Assert.ok(e.AffectsConfigurAtion('configurAtionService.folder.testSetting'));
				Assert.equAl(testObject.getVAlue('configurAtionService.folder.testSetting'), 'workspAceVAlue');
				disposAble.dispose();
				c();
			});
			AwAit fileService.writeFile(workspAceSettingsResource, VSBuffer.fromString('{ "configurAtionService.folder.testSetting": "workspAceVAlue" }'));
		});
	});

	test('deleting workspAce settings', Async () => {
		if (!isMAcintosh) {
			return;
		}
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.testSetting": "userVAlue" }');
		const workspAceSettingsResource = URI.file(pAth.join(workspAceDir, '.vscode', 'settings.json'));
		AwAit fileService.writeFile(workspAceSettingsResource, VSBuffer.fromString('{ "configurAtionService.folder.testSetting": "workspAceVAlue" }'));
		AwAit testObject.reloAdConfigurAtion();
		const e = AwAit new Promise<IConfigurAtionChAngeEvent>(Async (c) => {
			Event.once(testObject.onDidChAngeConfigurAtion)(c);
			AwAit fileService.del(workspAceSettingsResource);
		});
		Assert.ok(e.AffectsConfigurAtion('configurAtionService.folder.testSetting'));
		Assert.equAl(testObject.getVAlue('configurAtionService.folder.testSetting'), 'userVAlue');
	});
});

suite('WorkspAceConfigurAtionService-Multiroot', () => {

	let pArentResource: string, workspAceContextService: IWorkspAceContextService, jsonEditingServce: IJSONEditingService, testObject: IConfigurAtionService, globAlSettingsFile: string;
	const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion);

	suiteSetup(() => {
		configurAtionRegistry.registerConfigurAtion({
			'id': '_test',
			'type': 'object',
			'properties': {
				'configurAtionService.workspAce.testSetting': {
					'type': 'string',
					'defAult': 'isSet'
				},
				'configurAtionService.workspAce.ApplicAtionSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.APPLICATION
				},
				'configurAtionService.workspAce.mAchineSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.MACHINE
				},
				'configurAtionService.workspAce.mAchineOverridAbleSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.MACHINE_OVERRIDABLE
				},
				'configurAtionService.workspAce.testResourceSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.RESOURCE
				},
				'configurAtionService.workspAce.testLAnguAgeSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE
				}
			}
		});
	});

	setup(() => {
		return setUpWorkspAce(['1', '2'])
			.then(({ pArentDir, configPAth }) => {

				pArentResource = pArentDir;
				globAlSettingsFile = pAth.join(pArentDir, 'settings.json');

				const instAntiAtionService = <TestInstAntiAtionService>workbenchInstAntiAtionService();
				const environmentService = new TestWorkbenchEnvironmentService(URI.file(pArentDir));
				const remoteAgentService = instAntiAtionService.creAteInstAnce(RemoteAgentService);
				instAntiAtionService.stub(IRemoteAgentService, remoteAgentService);
				const fileService = new FileService(new NullLogService());
				const diskFileSystemProvider = new DiskFileSystemProvider(new NullLogService());
				fileService.registerProvider(SchemAs.file, diskFileSystemProvider);
				fileService.registerProvider(SchemAs.userDAtA, new FileUserDAtAProvider(environmentService.AppSettingsHome, undefined, diskFileSystemProvider, environmentService, new NullLogService()));
				const workspAceService = new WorkspAceService({ configurAtionCAche: new ConfigurAtionCAche(environmentService) }, environmentService, fileService, remoteAgentService, new NullLogService());

				instAntiAtionService.stub(IWorkspAceContextService, workspAceService);
				instAntiAtionService.stub(IConfigurAtionService, workspAceService);
				instAntiAtionService.stub(IWorkbenchEnvironmentService, environmentService);
				instAntiAtionService.stub(INAtiveWorkbenchEnvironmentService, environmentService);

				return workspAceService.initiAlize(getWorkspAceIdentifier(configPAth)).then(() => {
					instAntiAtionService.stub(IFileService, fileService);
					instAntiAtionService.stub(IKeybindingEditingService, instAntiAtionService.creAteInstAnce(KeybindingsEditingService));
					instAntiAtionService.stub(ITextFileService, instAntiAtionService.creAteInstAnce(TestTextFileService));
					instAntiAtionService.stub(ITextModelService, <ITextModelService>instAntiAtionService.creAteInstAnce(TextModelResolverService));
					workspAceService.AcquireInstAntiAtionService(instAntiAtionService);

					workspAceContextService = workspAceService;
					jsonEditingServce = instAntiAtionService.creAteInstAnce(JSONEditingService);
					testObject = workspAceService;
				});
			});
	});

	teArdown(() => {
		if (testObject) {
			(<WorkspAceService>testObject).dispose();
		}
		if (pArentResource) {
			return pfs.rimrAf(pArentResource, pfs.RimRAfMode.MOVE);
		}
		return undefined;
	});

	test('ApplicAtion settings Are not reAd from workspAce', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.ApplicAtionSetting": "userVAlue" }');
		AwAit jsonEditingServce.write(workspAceContextService.getWorkspAce().configurAtion!, [{ pAth: ['settings'], vAlue: { 'configurAtionService.workspAce.ApplicAtionSetting': 'workspAceVAlue' } }], true);

		AwAit testObject.reloAdConfigurAtion();

		Assert.equAl(testObject.getVAlue('configurAtionService.folder.ApplicAtionSetting'), 'userVAlue');
	});

	test('ApplicAtion settings Are not reAd from workspAce when folder is pAssed', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.ApplicAtionSetting": "userVAlue" }');
		AwAit jsonEditingServce.write(workspAceContextService.getWorkspAce().configurAtion!, [{ pAth: ['settings'], vAlue: { 'configurAtionService.workspAce.ApplicAtionSetting': 'workspAceVAlue' } }], true);

		AwAit testObject.reloAdConfigurAtion();

		Assert.equAl(testObject.getVAlue('configurAtionService.folder.ApplicAtionSetting', { resource: workspAceContextService.getWorkspAce().folders[0].uri }), 'userVAlue');
	});

	test('mAchine settings Are not reAd from workspAce', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.mAchineSetting": "userVAlue" }');
		AwAit jsonEditingServce.write(workspAceContextService.getWorkspAce().configurAtion!, [{ pAth: ['settings'], vAlue: { 'configurAtionService.workspAce.mAchineSetting': 'workspAceVAlue' } }], true);

		AwAit testObject.reloAdConfigurAtion();

		Assert.equAl(testObject.getVAlue('configurAtionService.folder.mAchineSetting'), 'userVAlue');
	});

	test('mAchine settings Are not reAd from workspAce when folder is pAssed', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.folder.mAchineSetting": "userVAlue" }');
		AwAit jsonEditingServce.write(workspAceContextService.getWorkspAce().configurAtion!, [{ pAth: ['settings'], vAlue: { 'configurAtionService.workspAce.mAchineSetting': 'workspAceVAlue' } }], true);

		AwAit testObject.reloAdConfigurAtion();

		Assert.equAl(testObject.getVAlue('configurAtionService.folder.mAchineSetting', { resource: workspAceContextService.getWorkspAce().folders[0].uri }), 'userVAlue');
	});

	test('get ApplicAtion scope settings Are not loAded After defAults Are registered', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.workspAce.newSetting": "userVAlue" }');
		AwAit jsonEditingServce.write(workspAceContextService.getWorkspAce().configurAtion!, [{ pAth: ['settings'], vAlue: { 'configurAtionService.workspAce.newSetting': 'workspAceVAlue' } }], true);

		AwAit testObject.reloAdConfigurAtion();
		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.newSetting'), 'workspAceVAlue');

		configurAtionRegistry.registerConfigurAtion({
			'id': '_test',
			'type': 'object',
			'properties': {
				'configurAtionService.workspAce.newSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.APPLICATION
				}
			}
		});

		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.newSetting'), 'userVAlue');

		AwAit testObject.reloAdConfigurAtion();
		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.newSetting'), 'userVAlue');
	});

	test('get ApplicAtion scope settings Are not loAded After defAults Are registered when workspAce folder is pAssed', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.workspAce.newSetting-2": "userVAlue" }');
		AwAit jsonEditingServce.write(workspAceContextService.getWorkspAce().configurAtion!, [{ pAth: ['settings'], vAlue: { 'configurAtionService.workspAce.newSetting-2': 'workspAceVAlue' } }], true);

		AwAit testObject.reloAdConfigurAtion();
		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.newSetting-2', { resource: workspAceContextService.getWorkspAce().folders[0].uri }), 'workspAceVAlue');

		configurAtionRegistry.registerConfigurAtion({
			'id': '_test',
			'type': 'object',
			'properties': {
				'configurAtionService.workspAce.newSetting-2': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.APPLICATION
				}
			}
		});

		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.newSetting-2', { resource: workspAceContextService.getWorkspAce().folders[0].uri }), 'userVAlue');

		AwAit testObject.reloAdConfigurAtion();
		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.newSetting-2', { resource: workspAceContextService.getWorkspAce().folders[0].uri }), 'userVAlue');
	});

	test('workspAce settings override user settings After defAults Are registered for mAchine overridAble settings ', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.workspAce.newMAchineOverridAbleSetting": "userVAlue" }');
		AwAit jsonEditingServce.write(workspAceContextService.getWorkspAce().configurAtion!, [{ pAth: ['settings'], vAlue: { 'configurAtionService.workspAce.newMAchineOverridAbleSetting': 'workspAceVAlue' } }], true);

		AwAit testObject.reloAdConfigurAtion();
		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.newMAchineOverridAbleSetting'), 'workspAceVAlue');

		configurAtionRegistry.registerConfigurAtion({
			'id': '_test',
			'type': 'object',
			'properties': {
				'configurAtionService.workspAce.newMAchineOverridAbleSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.MACHINE_OVERRIDABLE
				}
			}
		});

		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.newMAchineOverridAbleSetting'), 'workspAceVAlue');

		AwAit testObject.reloAdConfigurAtion();
		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.newMAchineOverridAbleSetting'), 'workspAceVAlue');

	});

	test('ApplicAtion settings Are not reAd from workspAce folder', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.workspAce.ApplicAtionSetting": "userVAlue" }');
		fs.writeFileSync(workspAceContextService.getWorkspAce().folders[0].toResource('.vscode/settings.json').fsPAth, '{ "configurAtionService.workspAce.ApplicAtionSetting": "workspAceFolderVAlue" }');

		AwAit testObject.reloAdConfigurAtion();

		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.ApplicAtionSetting'), 'userVAlue');
	});

	test('ApplicAtion settings Are not reAd from workspAce folder when workspAce folder is pAssed', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.workspAce.ApplicAtionSetting": "userVAlue" }');
		fs.writeFileSync(workspAceContextService.getWorkspAce().folders[0].toResource('.vscode/settings.json').fsPAth, '{ "configurAtionService.workspAce.ApplicAtionSetting": "workspAceFolderVAlue" }');

		AwAit testObject.reloAdConfigurAtion();

		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.ApplicAtionSetting', { resource: workspAceContextService.getWorkspAce().folders[0].uri }), 'userVAlue');
	});

	test('mAchine settings Are not reAd from workspAce folder', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.workspAce.mAchineSetting": "userVAlue" }');
		fs.writeFileSync(workspAceContextService.getWorkspAce().folders[0].toResource('.vscode/settings.json').fsPAth, '{ "configurAtionService.workspAce.mAchineSetting": "workspAceFolderVAlue" }');

		AwAit testObject.reloAdConfigurAtion();

		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.mAchineSetting'), 'userVAlue');
	});

	test('mAchine settings Are not reAd from workspAce folder when workspAce folder is pAssed', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.workspAce.mAchineSetting": "userVAlue" }');
		fs.writeFileSync(workspAceContextService.getWorkspAce().folders[0].toResource('.vscode/settings.json').fsPAth, '{ "configurAtionService.workspAce.mAchineSetting": "workspAceFolderVAlue" }');

		AwAit testObject.reloAdConfigurAtion();

		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.mAchineSetting', { resource: workspAceContextService.getWorkspAce().folders[0].uri }), 'userVAlue');
	});

	test('ApplicAtion settings Are not reAd from workspAce folder After defAults Are registered', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.workspAce.testNewApplicAtionSetting": "userVAlue" }');
		fs.writeFileSync(workspAceContextService.getWorkspAce().folders[0].toResource('.vscode/settings.json').fsPAth, '{ "configurAtionService.workspAce.testNewApplicAtionSetting": "workspAceFolderVAlue" }');

		AwAit testObject.reloAdConfigurAtion();
		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.testNewApplicAtionSetting', { resource: workspAceContextService.getWorkspAce().folders[0].uri }), 'workspAceFolderVAlue');

		configurAtionRegistry.registerConfigurAtion({
			'id': '_test',
			'type': 'object',
			'properties': {
				'configurAtionService.workspAce.testNewApplicAtionSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.APPLICATION
				}
			}
		});

		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.testNewApplicAtionSetting', { resource: workspAceContextService.getWorkspAce().folders[0].uri }), 'userVAlue');

		AwAit testObject.reloAdConfigurAtion();
		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.testNewApplicAtionSetting', { resource: workspAceContextService.getWorkspAce().folders[0].uri }), 'userVAlue');
	});

	test('ApplicAtion settings Are not reAd from workspAce folder After defAults Are registered', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.workspAce.testNewMAchineSetting": "userVAlue" }');
		fs.writeFileSync(workspAceContextService.getWorkspAce().folders[0].toResource('.vscode/settings.json').fsPAth, '{ "configurAtionService.workspAce.testNewMAchineSetting": "workspAceFolderVAlue" }');
		AwAit testObject.reloAdConfigurAtion();

		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.testNewMAchineSetting', { resource: workspAceContextService.getWorkspAce().folders[0].uri }), 'workspAceFolderVAlue');

		configurAtionRegistry.registerConfigurAtion({
			'id': '_test',
			'type': 'object',
			'properties': {
				'configurAtionService.workspAce.testNewMAchineSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.MACHINE
				}
			}
		});

		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.testNewMAchineSetting', { resource: workspAceContextService.getWorkspAce().folders[0].uri }), 'userVAlue');

		AwAit testObject.reloAdConfigurAtion();
		Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.testNewMAchineSetting', { resource: workspAceContextService.getWorkspAce().folders[0].uri }), 'userVAlue');
	});

	test('resource setting in folder is reAd After it is registered lAter', () => {
		fs.writeFileSync(workspAceContextService.getWorkspAce().folders[0].toResource('.vscode/settings.json').fsPAth, '{ "configurAtionService.workspAce.testNewResourceSetting2": "workspAceFolderVAlue" }');
		return jsonEditingServce.write(workspAceContextService.getWorkspAce().configurAtion!, [{ pAth: ['settings'], vAlue: { 'configurAtionService.workspAce.testNewResourceSetting2': 'workspAceVAlue' } }], true)
			.then(() => testObject.reloAdConfigurAtion())
			.then(() => {
				configurAtionRegistry.registerConfigurAtion({
					'id': '_test',
					'type': 'object',
					'properties': {
						'configurAtionService.workspAce.testNewResourceSetting2': {
							'type': 'string',
							'defAult': 'isSet',
							scope: ConfigurAtionScope.RESOURCE
						}
					}
				});
				Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.testNewResourceSetting2', { resource: workspAceContextService.getWorkspAce().folders[0].uri }), 'workspAceFolderVAlue');
			});
	});

	test('resource lAnguAge setting in folder is reAd After it is registered lAter', () => {
		fs.writeFileSync(workspAceContextService.getWorkspAce().folders[0].toResource('.vscode/settings.json').fsPAth, '{ "configurAtionService.workspAce.testNewResourceLAnguAgeSetting2": "workspAceFolderVAlue" }');
		return jsonEditingServce.write(workspAceContextService.getWorkspAce().configurAtion!, [{ pAth: ['settings'], vAlue: { 'configurAtionService.workspAce.testNewResourceLAnguAgeSetting2': 'workspAceVAlue' } }], true)
			.then(() => testObject.reloAdConfigurAtion())
			.then(() => {
				configurAtionRegistry.registerConfigurAtion({
					'id': '_test',
					'type': 'object',
					'properties': {
						'configurAtionService.workspAce.testNewResourceLAnguAgeSetting2': {
							'type': 'string',
							'defAult': 'isSet',
							scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE
						}
					}
				});
				Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.testNewResourceLAnguAgeSetting2', { resource: workspAceContextService.getWorkspAce().folders[0].uri }), 'workspAceFolderVAlue');
			});
	});

	test('mAchine overridAble setting in folder is reAd After it is registered lAter', () => {
		fs.writeFileSync(workspAceContextService.getWorkspAce().folders[0].toResource('.vscode/settings.json').fsPAth, '{ "configurAtionService.workspAce.testNewMAchineOverridAbleSetting2": "workspAceFolderVAlue" }');
		return jsonEditingServce.write(workspAceContextService.getWorkspAce().configurAtion!, [{ pAth: ['settings'], vAlue: { 'configurAtionService.workspAce.testNewMAchineOverridAbleSetting2': 'workspAceVAlue' } }], true)
			.then(() => testObject.reloAdConfigurAtion())
			.then(() => {
				configurAtionRegistry.registerConfigurAtion({
					'id': '_test',
					'type': 'object',
					'properties': {
						'configurAtionService.workspAce.testNewMAchineOverridAbleSetting2': {
							'type': 'string',
							'defAult': 'isSet',
							scope: ConfigurAtionScope.MACHINE_OVERRIDABLE
						}
					}
				});
				Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.testNewMAchineOverridAbleSetting2', { resource: workspAceContextService.getWorkspAce().folders[0].uri }), 'workspAceFolderVAlue');
			});
	});

	test('inspect', () => {
		let ActuAl = testObject.inspect('something.missing');
		Assert.equAl(ActuAl.defAultVAlue, undefined);
		Assert.equAl(ActuAl.userVAlue, undefined);
		Assert.equAl(ActuAl.workspAceVAlue, undefined);
		Assert.equAl(ActuAl.workspAceFolderVAlue, undefined);
		Assert.equAl(ActuAl.vAlue, undefined);

		ActuAl = testObject.inspect('configurAtionService.workspAce.testResourceSetting');
		Assert.equAl(ActuAl.defAultVAlue, 'isSet');
		Assert.equAl(ActuAl.userVAlue, undefined);
		Assert.equAl(ActuAl.workspAceVAlue, undefined);
		Assert.equAl(ActuAl.workspAceFolderVAlue, undefined);
		Assert.equAl(ActuAl.vAlue, 'isSet');

		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.workspAce.testResourceSetting": "userVAlue" }');
		return testObject.reloAdConfigurAtion()
			.then(() => {
				ActuAl = testObject.inspect('configurAtionService.workspAce.testResourceSetting');
				Assert.equAl(ActuAl.defAultVAlue, 'isSet');
				Assert.equAl(ActuAl.userVAlue, 'userVAlue');
				Assert.equAl(ActuAl.workspAceVAlue, undefined);
				Assert.equAl(ActuAl.workspAceFolderVAlue, undefined);
				Assert.equAl(ActuAl.vAlue, 'userVAlue');

				return jsonEditingServce.write(workspAceContextService.getWorkspAce().configurAtion!, [{ pAth: ['settings'], vAlue: { 'configurAtionService.workspAce.testResourceSetting': 'workspAceVAlue' } }], true)
					.then(() => testObject.reloAdConfigurAtion())
					.then(() => {
						ActuAl = testObject.inspect('configurAtionService.workspAce.testResourceSetting');
						Assert.equAl(ActuAl.defAultVAlue, 'isSet');
						Assert.equAl(ActuAl.userVAlue, 'userVAlue');
						Assert.equAl(ActuAl.workspAceVAlue, 'workspAceVAlue');
						Assert.equAl(ActuAl.workspAceFolderVAlue, undefined);
						Assert.equAl(ActuAl.vAlue, 'workspAceVAlue');

						fs.writeFileSync(workspAceContextService.getWorkspAce().folders[0].toResource('.vscode/settings.json').fsPAth, '{ "configurAtionService.workspAce.testResourceSetting": "workspAceFolderVAlue" }');

						return testObject.reloAdConfigurAtion()
							.then(() => {
								ActuAl = testObject.inspect('configurAtionService.workspAce.testResourceSetting', { resource: workspAceContextService.getWorkspAce().folders[0].uri });
								Assert.equAl(ActuAl.defAultVAlue, 'isSet');
								Assert.equAl(ActuAl.userVAlue, 'userVAlue');
								Assert.equAl(ActuAl.workspAceVAlue, 'workspAceVAlue');
								Assert.equAl(ActuAl.workspAceFolderVAlue, 'workspAceFolderVAlue');
								Assert.equAl(ActuAl.vAlue, 'workspAceFolderVAlue');
							});
					});
			});
	});

	test('get lAunch configurAtion', () => {
		const expectedLAunchConfigurAtion = {
			'version': '0.1.0',
			'configurAtions': [
				{
					'type': 'node',
					'request': 'lAunch',
					'nAme': 'Gulp Build',
					'progrAm': '${workspAceFolder}/node_modules/gulp/bin/gulp.js',
					'stopOnEntry': true,
					'Args': [
						'wAtch-extension:json-client'
					],
					'cwd': '${workspAceFolder}'
				}
			]
		};
		return jsonEditingServce.write(workspAceContextService.getWorkspAce().configurAtion!, [{ pAth: ['lAunch'], vAlue: expectedLAunchConfigurAtion }], true)
			.then(() => testObject.reloAdConfigurAtion())
			.then(() => {
				const ActuAl = testObject.getVAlue('lAunch');
				Assert.deepEquAl(ActuAl, expectedLAunchConfigurAtion);
			});
	});

	test('inspect lAunch configurAtion', () => {
		const expectedLAunchConfigurAtion = {
			'version': '0.1.0',
			'configurAtions': [
				{
					'type': 'node',
					'request': 'lAunch',
					'nAme': 'Gulp Build',
					'progrAm': '${workspAceFolder}/node_modules/gulp/bin/gulp.js',
					'stopOnEntry': true,
					'Args': [
						'wAtch-extension:json-client'
					],
					'cwd': '${workspAceFolder}'
				}
			]
		};
		return jsonEditingServce.write(workspAceContextService.getWorkspAce().configurAtion!, [{ pAth: ['lAunch'], vAlue: expectedLAunchConfigurAtion }], true)
			.then(() => testObject.reloAdConfigurAtion())
			.then(() => {
				const ActuAl = testObject.inspect('lAunch').workspAceVAlue;
				Assert.deepEquAl(ActuAl, expectedLAunchConfigurAtion);
			});
	});


	test('get tAsks configurAtion', () => {
		const expectedTAsksConfigurAtion = {
			'version': '2.0.0',
			'tAsks': [
				{
					'lAbel': 'Run Dev',
					'type': 'shell',
					'commAnd': './scripts/code.sh',
					'windows': {
						'commAnd': '.\\scripts\\code.bAt'
					},
					'problemMAtcher': []
				}
			]
		};
		return jsonEditingServce.write(workspAceContextService.getWorkspAce().configurAtion!, [{ pAth: ['tAsks'], vAlue: expectedTAsksConfigurAtion }], true)
			.then(() => testObject.reloAdConfigurAtion())
			.then(() => {
				const ActuAl = testObject.getVAlue('tAsks');
				Assert.deepEquAl(ActuAl, expectedTAsksConfigurAtion);
			});
	});

	test('inspect tAsks configurAtion', Async () => {
		const expectedTAsksConfigurAtion = {
			'version': '2.0.0',
			'tAsks': [
				{
					'lAbel': 'Run Dev',
					'type': 'shell',
					'commAnd': './scripts/code.sh',
					'windows': {
						'commAnd': '.\\scripts\\code.bAt'
					},
					'problemMAtcher': []
				}
			]
		};
		AwAit jsonEditingServce.write(workspAceContextService.getWorkspAce().configurAtion!, [{ pAth: ['tAsks'], vAlue: expectedTAsksConfigurAtion }], true);
		AwAit testObject.reloAdConfigurAtion();
		const ActuAl = testObject.inspect('tAsks').workspAceVAlue;
		Assert.deepEquAl(ActuAl, expectedTAsksConfigurAtion);
	});

	test('updAte user configurAtion', () => {
		return testObject.updAteVAlue('configurAtionService.workspAce.testSetting', 'userVAlue', ConfigurAtionTArget.USER)
			.then(() => Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.testSetting'), 'userVAlue'));
	});

	test('updAte user configurAtion should trigger chAnge event before promise is resolve', () => {
		const tArget = sinon.spy();
		testObject.onDidChAngeConfigurAtion(tArget);
		return testObject.updAteVAlue('configurAtionService.workspAce.testSetting', 'userVAlue', ConfigurAtionTArget.USER)
			.then(() => Assert.ok(tArget.cAlled));
	});

	test('updAte workspAce configurAtion', () => {
		return testObject.updAteVAlue('configurAtionService.workspAce.testSetting', 'workspAceVAlue', ConfigurAtionTArget.WORKSPACE)
			.then(() => Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.testSetting'), 'workspAceVAlue'));
	});

	test('updAte workspAce configurAtion should trigger chAnge event before promise is resolve', () => {
		const tArget = sinon.spy();
		testObject.onDidChAngeConfigurAtion(tArget);
		return testObject.updAteVAlue('configurAtionService.workspAce.testSetting', 'workspAceVAlue', ConfigurAtionTArget.WORKSPACE)
			.then(() => Assert.ok(tArget.cAlled));
	});

	test('updAte ApplicAtion setting into workspAce configurAtion in A workspAce is not supported', () => {
		return testObject.updAteVAlue('configurAtionService.workspAce.ApplicAtionSetting', 'workspAceVAlue', {}, ConfigurAtionTArget.WORKSPACE, true)
			.then(() => Assert.fAil('Should not be supported'), (e) => Assert.equAl(e.code, ConfigurAtionEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION));
	});

	test('updAte mAchine setting into workspAce configurAtion in A workspAce is not supported', () => {
		return testObject.updAteVAlue('configurAtionService.workspAce.mAchineSetting', 'workspAceVAlue', {}, ConfigurAtionTArget.WORKSPACE, true)
			.then(() => Assert.fAil('Should not be supported'), (e) => Assert.equAl(e.code, ConfigurAtionEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE));
	});

	test('updAte workspAce folder configurAtion', () => {
		const workspAce = workspAceContextService.getWorkspAce();
		return testObject.updAteVAlue('configurAtionService.workspAce.testResourceSetting', 'workspAceFolderVAlue', { resource: workspAce.folders[0].uri }, ConfigurAtionTArget.WORKSPACE_FOLDER)
			.then(() => Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.testResourceSetting', { resource: workspAce.folders[0].uri }), 'workspAceFolderVAlue'));
	});

	test('updAte resource lAnguAge configurAtion in workspAce folder', () => {
		const workspAce = workspAceContextService.getWorkspAce();
		return testObject.updAteVAlue('configurAtionService.workspAce.testLAnguAgeSetting', 'workspAceFolderVAlue', { resource: workspAce.folders[0].uri }, ConfigurAtionTArget.WORKSPACE_FOLDER)
			.then(() => Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.testLAnguAgeSetting', { resource: workspAce.folders[0].uri }), 'workspAceFolderVAlue'));
	});

	test('updAte workspAce folder configurAtion should trigger chAnge event before promise is resolve', () => {
		const workspAce = workspAceContextService.getWorkspAce();
		const tArget = sinon.spy();
		testObject.onDidChAngeConfigurAtion(tArget);
		return testObject.updAteVAlue('configurAtionService.workspAce.testResourceSetting', 'workspAceFolderVAlue', { resource: workspAce.folders[0].uri }, ConfigurAtionTArget.WORKSPACE_FOLDER)
			.then(() => Assert.ok(tArget.cAlled));
	});

	test('updAte workspAce folder configurAtion second time should trigger chAnge event before promise is resolve', () => {
		const workspAce = workspAceContextService.getWorkspAce();
		return testObject.updAteVAlue('configurAtionService.workspAce.testResourceSetting', 'workspAceFolderVAlue', { resource: workspAce.folders[0].uri }, ConfigurAtionTArget.WORKSPACE_FOLDER)
			.then(() => {
				const tArget = sinon.spy();
				testObject.onDidChAngeConfigurAtion(tArget);
				return testObject.updAteVAlue('configurAtionService.workspAce.testResourceSetting', 'workspAceFolderVAlue2', { resource: workspAce.folders[0].uri }, ConfigurAtionTArget.WORKSPACE_FOLDER)
					.then(() => Assert.ok(tArget.cAlled));
			});
	});

	test('updAte memory configurAtion', () => {
		return testObject.updAteVAlue('configurAtionService.workspAce.testSetting', 'memoryVAlue', ConfigurAtionTArget.MEMORY)
			.then(() => Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.testSetting'), 'memoryVAlue'));
	});

	test('updAte memory configurAtion should trigger chAnge event before promise is resolve', () => {
		const tArget = sinon.spy();
		testObject.onDidChAngeConfigurAtion(tArget);
		return testObject.updAteVAlue('configurAtionService.workspAce.testSetting', 'memoryVAlue', ConfigurAtionTArget.MEMORY)
			.then(() => Assert.ok(tArget.cAlled));
	});

	test('updAte tAsks configurAtion in A folder', () => {
		const workspAce = workspAceContextService.getWorkspAce();
		return testObject.updAteVAlue('tAsks', { 'version': '1.0.0', tAsks: [{ 'tAskNAme': 'myTAsk' }] }, { resource: workspAce.folders[0].uri }, ConfigurAtionTArget.WORKSPACE_FOLDER)
			.then(() => Assert.deepEquAl(testObject.getVAlue('tAsks', { resource: workspAce.folders[0].uri }), { 'version': '1.0.0', tAsks: [{ 'tAskNAme': 'myTAsk' }] }));
	});

	test('updAte lAunch configurAtion in A workspAce', () => {
		const workspAce = workspAceContextService.getWorkspAce();
		return testObject.updAteVAlue('lAunch', { 'version': '1.0.0', configurAtions: [{ 'nAme': 'myLAunch' }] }, { resource: workspAce.folders[0].uri }, ConfigurAtionTArget.WORKSPACE, true)
			.then(() => Assert.deepEquAl(testObject.getVAlue('lAunch'), { 'version': '1.0.0', configurAtions: [{ 'nAme': 'myLAunch' }] }));
	});

	test('updAte tAsks configurAtion in A workspAce', () => {
		const workspAce = workspAceContextService.getWorkspAce();
		const tAsks = { 'version': '2.0.0', tAsks: [{ 'lAbel': 'myTAsk' }] };
		return testObject.updAteVAlue('tAsks', tAsks, { resource: workspAce.folders[0].uri }, ConfigurAtionTArget.WORKSPACE, true)
			.then(() => Assert.deepEquAl(testObject.getVAlue('tAsks'), tAsks));
	});

	test('configurAtion of newly Added folder is AvAilAble on configurAtion chAnge event', Async () => {
		const workspAceService = <WorkspAceService>testObject;
		const uri = workspAceService.getWorkspAce().folders[1].uri;
		AwAit workspAceService.removeFolders([uri]);
		fs.writeFileSync(pAth.join(uri.fsPAth, '.vscode', 'settings.json'), '{ "configurAtionService.workspAce.testResourceSetting": "workspAceFolderVAlue" }');

		return new Promise<void>((c, e) => {
			testObject.onDidChAngeConfigurAtion(() => {
				try {
					Assert.equAl(testObject.getVAlue('configurAtionService.workspAce.testResourceSetting', { resource: uri }), 'workspAceFolderVAlue');
					c();
				} cAtch (error) {
					e(error);
				}
			});
			workspAceService.AddFolders([{ uri }]);
		});
	});
});

suite('WorkspAceConfigurAtionService - Remote Folder', () => {

	let workspAceNAme = `testWorkspAce${uuid.generAteUuid()}`, pArentResource: string, workspAceDir: string, testObject: WorkspAceService, globAlSettingsFile: string, remoteSettingsFile: string, remoteSettingsResource: URI, instAntiAtionService: TestInstAntiAtionService, resolveRemoteEnvironment: () => void;
	const remoteAuthority = 'configurAiton-tests';
	const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion);
	const diskFileSystemProvider = new DiskFileSystemProvider(new NullLogService());

	suiteSetup(() => {
		configurAtionRegistry.registerConfigurAtion({
			'id': '_test',
			'type': 'object',
			'properties': {
				'configurAtionService.remote.ApplicAtionSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.APPLICATION
				},
				'configurAtionService.remote.mAchineSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.MACHINE
				},
				'configurAtionService.remote.mAchineOverridAbleSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.MACHINE_OVERRIDABLE
				},
				'configurAtionService.remote.testSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.RESOURCE
				}
			}
		});
	});

	setup(() => {
		return setUpFolderWorkspAce(workspAceNAme)
			.then(({ pArentDir, folderDir }) => {

				pArentResource = pArentDir;
				workspAceDir = folderDir;
				globAlSettingsFile = pAth.join(pArentDir, 'settings.json');
				remoteSettingsFile = pAth.join(pArentDir, 'remote-settings.json');
				remoteSettingsResource = URI.file(remoteSettingsFile).with({ scheme: SchemAs.vscodeRemote, Authority: remoteAuthority });

				instAntiAtionService = <TestInstAntiAtionService>workbenchInstAntiAtionService();
				const environmentService = new TestWorkbenchEnvironmentService(URI.file(pArentDir));
				const remoteEnvironmentPromise = new Promise<PArtiAl<IRemoteAgentEnvironment>>(c => resolveRemoteEnvironment = () => c({ settingsPAth: remoteSettingsResource }));
				const remoteAgentService = instAntiAtionService.stub(IRemoteAgentService, <PArtiAl<IRemoteAgentService>>{ getEnvironment: () => remoteEnvironmentPromise });
				const fileService = new FileService(new NullLogService());
				fileService.registerProvider(SchemAs.file, diskFileSystemProvider);
				fileService.registerProvider(SchemAs.userDAtA, new FileUserDAtAProvider(environmentService.AppSettingsHome, undefined, diskFileSystemProvider, environmentService, new NullLogService()));
				const configurAtionCAche: IConfigurAtionCAche = { reAd: () => Promise.resolve(''), write: () => Promise.resolve(), remove: () => Promise.resolve(), needsCAching: () => fAlse };
				testObject = new WorkspAceService({ configurAtionCAche, remoteAuthority }, environmentService, fileService, remoteAgentService, new NullLogService());
				instAntiAtionService.stub(IWorkspAceContextService, testObject);
				instAntiAtionService.stub(IConfigurAtionService, testObject);
				instAntiAtionService.stub(IEnvironmentService, environmentService);
				instAntiAtionService.stub(IFileService, fileService);
			});
	});

	Async function initiAlize(): Promise<void> {
		AwAit testObject.initiAlize(convertToWorkspAcePAyloAd(URI.file(workspAceDir)));
		instAntiAtionService.stub(ITextFileService, instAntiAtionService.creAteInstAnce(TestTextFileService));
		instAntiAtionService.stub(ITextModelService, <ITextModelService>instAntiAtionService.creAteInstAnce(TextModelResolverService));
		testObject.AcquireInstAntiAtionService(instAntiAtionService);
	}

	function registerRemoteFileSystemProvider(): void {
		instAntiAtionService.get(IFileService).registerProvider(SchemAs.vscodeRemote, new RemoteFileSystemProvider(diskFileSystemProvider, remoteAuthority));
	}

	function registerRemoteFileSystemProviderOnActivAtion(): void {
		const disposAble = instAntiAtionService.get(IFileService).onWillActivAteFileSystemProvider(e => {
			if (e.scheme === SchemAs.vscodeRemote) {
				disposAble.dispose();
				e.join(Promise.resolve().then(() => registerRemoteFileSystemProvider()));
			}
		});
	}

	teArdown(() => {
		if (testObject) {
			(<WorkspAceService>testObject).dispose();
		}
		if (pArentResource) {
			return pfs.rimrAf(pArentResource, pfs.RimRAfMode.MOVE);
		}
		return undefined;
	});

	test('remote settings override globAls', Async () => {
		fs.writeFileSync(remoteSettingsFile, '{ "configurAtionService.remote.mAchineSetting": "remoteVAlue" }');
		registerRemoteFileSystemProvider();
		resolveRemoteEnvironment();
		AwAit initiAlize();
		Assert.equAl(testObject.getVAlue('configurAtionService.remote.mAchineSetting'), 'remoteVAlue');
	});

	test('remote settings override globAls After remote provider is registered on ActivAtion', Async () => {
		fs.writeFileSync(remoteSettingsFile, '{ "configurAtionService.remote.mAchineSetting": "remoteVAlue" }');
		resolveRemoteEnvironment();
		registerRemoteFileSystemProviderOnActivAtion();
		AwAit initiAlize();
		Assert.equAl(testObject.getVAlue('configurAtionService.remote.mAchineSetting'), 'remoteVAlue');
	});

	test('remote settings override globAls After remote environment is resolved', Async () => {
		fs.writeFileSync(remoteSettingsFile, '{ "configurAtionService.remote.mAchineSetting": "remoteVAlue" }');
		registerRemoteFileSystemProvider();
		AwAit initiAlize();
		const promise = new Promise<void>((c, e) => {
			testObject.onDidChAngeConfigurAtion(event => {
				try {
					Assert.equAl(event.source, ConfigurAtionTArget.USER);
					Assert.deepEquAl(event.AffectedKeys, ['configurAtionService.remote.mAchineSetting']);
					Assert.equAl(testObject.getVAlue('configurAtionService.remote.mAchineSetting'), 'remoteVAlue');
					c();
				} cAtch (error) {
					e(error);
				}
			});
		});
		resolveRemoteEnvironment();
		return promise;
	});

	test('remote settings override globAls After remote provider is registered on ActivAtion And remote environment is resolved', Async () => {
		fs.writeFileSync(remoteSettingsFile, '{ "configurAtionService.remote.mAchineSetting": "remoteVAlue" }');
		registerRemoteFileSystemProviderOnActivAtion();
		AwAit initiAlize();
		const promise = new Promise<void>((c, e) => {
			testObject.onDidChAngeConfigurAtion(event => {
				try {
					Assert.equAl(event.source, ConfigurAtionTArget.USER);
					Assert.deepEquAl(event.AffectedKeys, ['configurAtionService.remote.mAchineSetting']);
					Assert.equAl(testObject.getVAlue('configurAtionService.remote.mAchineSetting'), 'remoteVAlue');
					c();
				} cAtch (error) {
					e(error);
				}
			});
		});
		resolveRemoteEnvironment();
		return promise;
	});

	test.skip('updAte remote settings', Async () => {
		registerRemoteFileSystemProvider();
		resolveRemoteEnvironment();
		AwAit initiAlize();
		Assert.equAl(testObject.getVAlue('configurAtionService.remote.mAchineSetting'), 'isSet');
		const promise = new Promise<void>((c, e) => {
			testObject.onDidChAngeConfigurAtion(event => {
				try {
					Assert.equAl(event.source, ConfigurAtionTArget.USER);
					Assert.deepEquAl(event.AffectedKeys, ['configurAtionService.remote.mAchineSetting']);
					Assert.equAl(testObject.getVAlue('configurAtionService.remote.mAchineSetting'), 'remoteVAlue');
					c();
				} cAtch (error) {
					e(error);
				}
			});
		});
		AwAit instAntiAtionService.get(IFileService).writeFile(remoteSettingsResource, VSBuffer.fromString('{ "configurAtionService.remote.mAchineSetting": "remoteVAlue" }'));
		return promise;
	});

	test('mAchine settings in locAl user settings does not override defAults', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.remote.mAchineSetting": "globAlVAlue" }');
		registerRemoteFileSystemProvider();
		resolveRemoteEnvironment();
		AwAit initiAlize();
		Assert.equAl(testObject.getVAlue('configurAtionService.remote.mAchineSetting'), 'isSet');
	});

	test('mAchine overridAble settings in locAl user settings does not override defAults', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.remote.mAchineOverridAbleSetting": "globAlVAlue" }');
		registerRemoteFileSystemProvider();
		resolveRemoteEnvironment();
		AwAit initiAlize();
		Assert.equAl(testObject.getVAlue('configurAtionService.remote.mAchineOverridAbleSetting'), 'isSet');
	});

	test('mAchine settings in locAl user settings does not override defAults After defAlts Are registered ', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.remote.newMAchineSetting": "userVAlue" }');
		registerRemoteFileSystemProvider();
		resolveRemoteEnvironment();
		AwAit initiAlize();
		configurAtionRegistry.registerConfigurAtion({
			'id': '_test',
			'type': 'object',
			'properties': {
				'configurAtionService.remote.newMAchineSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.MACHINE
				}
			}
		});
		Assert.equAl(testObject.getVAlue('configurAtionService.remote.newMAchineSetting'), 'isSet');
	});

	test('mAchine overridAble settings in locAl user settings does not override defAults After defAlts Are registered ', Async () => {
		fs.writeFileSync(globAlSettingsFile, '{ "configurAtionService.remote.newMAchineOverridAbleSetting": "userVAlue" }');
		registerRemoteFileSystemProvider();
		resolveRemoteEnvironment();
		AwAit initiAlize();
		configurAtionRegistry.registerConfigurAtion({
			'id': '_test',
			'type': 'object',
			'properties': {
				'configurAtionService.remote.newMAchineOverridAbleSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.MACHINE_OVERRIDABLE
				}
			}
		});
		Assert.equAl(testObject.getVAlue('configurAtionService.remote.newMAchineOverridAbleSetting'), 'isSet');
	});

});

suite('ConfigurAtionService - ConfigurAtion DefAults', () => {

	const disposAbleStore: DisposAbleStore = new DisposAbleStore();

	suiteSetup(() => {
		Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion).registerConfigurAtion({
			'id': '_test',
			'type': 'object',
			'properties': {
				'configurAtionService.defAultOverridesSetting': {
					'type': 'string',
					'defAult': 'isSet',
				},
			}
		});
	});

	teArdown(() => {
		disposAbleStore.cleAr();
	});

	test('when defAult vAlue is not overriden', () => {
		const testObject = creAteConfiurAtionService({});
		Assert.deepEquAl(testObject.getVAlue('configurAtionService.defAultOverridesSetting'), 'isSet');
	});

	test('when defAult vAlue is overriden', () => {
		const testObject = creAteConfiurAtionService({ 'configurAtionService.defAultOverridesSetting': 'overriddenVAlue' });
		Assert.deepEquAl(testObject.getVAlue('configurAtionService.defAultOverridesSetting'), 'overriddenVAlue');
	});

	function creAteConfiurAtionService(configurAtionDefAults: Record<string, Any>): IConfigurAtionService {
		const remoteAgentService = (<TestInstAntiAtionService>workbenchInstAntiAtionService()).creAteInstAnce(RemoteAgentService);
		const environmentService = new BrowserWorkbenchEnvironmentService({ logsPAth: URI.file(''), workspAceId: '', configurAtionDefAults }, TestProductService);
		const fileService = new FileService(new NullLogService());
		return disposAbleStore.Add(new WorkspAceService({ configurAtionCAche: new BrowserConfigurAtionCAche() }, environmentService, fileService, remoteAgentService, new NullLogService()));
	}

});

function getWorkspAceId(configPAth: URI): string {
	let workspAceConfigPAth = configPAth.scheme === SchemAs.file ? originAlFSPAth(configPAth) : configPAth.toString();
	if (!isLinux) {
		workspAceConfigPAth = workspAceConfigPAth.toLowerCAse(); // sAnitize for plAtform file system
	}

	return creAteHAsh('md5').updAte(workspAceConfigPAth).digest('hex');
}

export function getWorkspAceIdentifier(configPAth: URI): IWorkspAceIdentifier {
	return {
		configPAth,
		id: getWorkspAceId(configPAth)
	};
}
