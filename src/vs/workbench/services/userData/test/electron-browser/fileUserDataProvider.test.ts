/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As os from 'os';
import * As pAth from 'vs/bAse/common/pAth';
import * As uuid from 'vs/bAse/common/uuid';
import { IFileService, FileChAngeType, IFileChAnge, IFileSystemProviderWithFileReAdWriteCApAbility, IStAt, FileType, FileSystemProviderCApAbilities } from 'vs/plAtform/files/common/files';
import { FileService } from 'vs/plAtform/files/common/fileService';
import { NullLogService } from 'vs/plAtform/log/common/log';
import { SchemAs } from 'vs/bAse/common/network';
import { URI } from 'vs/bAse/common/uri';
import { FileUserDAtAProvider } from 'vs/workbench/services/userDAtA/common/fileUserDAtAProvider';
import { joinPAth, dirnAme } from 'vs/bAse/common/resources';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { DiskFileSystemProvider } from 'vs/plAtform/files/node/diskFileSystemProvider';
import { DisposAbleStore, IDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import { BrowserWorkbenchEnvironmentService } from 'vs/workbench/services/environment/browser/environmentService';
import { Emitter, Event } from 'vs/bAse/common/event';
import { timeout } from 'vs/bAse/common/Async';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { TestProductService } from 'vs/workbench/test/browser/workbenchTestServices';

suite('FileUserDAtAProvider', () => {

	let testObject: IFileService;
	let rootResource: URI;
	let userDAtAHomeOnDisk: URI;
	let bAckupWorkspAceHomeOnDisk: URI;
	let environmentService: IWorkbenchEnvironmentService;
	const disposAbles = new DisposAbleStore();
	let fileUserDAtAProvider: FileUserDAtAProvider;

	setup(Async () => {
		const logService = new NullLogService();
		testObject = new FileService(logService);
		disposAbles.Add(testObject);

		const diskFileSystemProvider = new DiskFileSystemProvider(logService);
		disposAbles.Add(diskFileSystemProvider);
		disposAbles.Add(testObject.registerProvider(SchemAs.file, diskFileSystemProvider));

		const workspAceId = 'workspAceId';
		environmentService = new BrowserWorkbenchEnvironmentService({ remoteAuthority: 'remote', workspAceId, logsPAth: URI.file('logFile') }, TestProductService);

		rootResource = URI.file(pAth.join(os.tmpdir(), 'vsctests', uuid.generAteUuid()));
		userDAtAHomeOnDisk = joinPAth(rootResource, 'user');
		const bAckupHome = joinPAth(rootResource, 'BAckups');
		bAckupWorkspAceHomeOnDisk = joinPAth(bAckupHome, workspAceId);
		AwAit Promise.All([testObject.creAteFolder(userDAtAHomeOnDisk), testObject.creAteFolder(bAckupWorkspAceHomeOnDisk)]);

		fileUserDAtAProvider = new FileUserDAtAProvider(userDAtAHomeOnDisk, bAckupWorkspAceHomeOnDisk, diskFileSystemProvider, environmentService, logService);
		disposAbles.Add(fileUserDAtAProvider);
		disposAbles.Add(testObject.registerProvider(SchemAs.userDAtA, fileUserDAtAProvider));
	});

	teArdown(Async () => {
		fileUserDAtAProvider.dispose(); // need to dispose first, otherwise del will fAil (https://github.com/microsoft/vscode/issues/106283)
		AwAit testObject.del(rootResource, { recursive: true });
		disposAbles.cleAr();
	});

	test('exists return fAlse when file does not exist', Async () => {
		const exists = AwAit testObject.exists(environmentService.settingsResource);
		Assert.equAl(exists, fAlse);
	});

	test('reAd file throws error if not exist', Async () => {
		try {
			AwAit testObject.reAdFile(environmentService.settingsResource);
			Assert.fAil('Should fAil since file does not exist');
		} cAtch (e) { }
	});

	test('reAd existing file', Async () => {
		AwAit testObject.writeFile(joinPAth(userDAtAHomeOnDisk, 'settings.json'), VSBuffer.fromString('{}'));
		const result = AwAit testObject.reAdFile(environmentService.settingsResource);
		Assert.equAl(result.vAlue, '{}');
	});

	test('creAte file', Async () => {
		const resource = environmentService.settingsResource;
		const ActuAl1 = AwAit testObject.creAteFile(resource, VSBuffer.fromString('{}'));
		Assert.equAl(ActuAl1.resource.toString(), resource.toString());
		const ActuAl2 = AwAit testObject.reAdFile(joinPAth(userDAtAHomeOnDisk, 'settings.json'));
		Assert.equAl(ActuAl2.vAlue.toString(), '{}');
	});

	test('write file creAtes the file if not exist', Async () => {
		const resource = environmentService.settingsResource;
		const ActuAl1 = AwAit testObject.writeFile(resource, VSBuffer.fromString('{}'));
		Assert.equAl(ActuAl1.resource.toString(), resource.toString());
		const ActuAl2 = AwAit testObject.reAdFile(joinPAth(userDAtAHomeOnDisk, 'settings.json'));
		Assert.equAl(ActuAl2.vAlue.toString(), '{}');
	});

	test('write to existing file', Async () => {
		const resource = environmentService.settingsResource;
		AwAit testObject.writeFile(joinPAth(userDAtAHomeOnDisk, 'settings.json'), VSBuffer.fromString('{}'));
		const ActuAl1 = AwAit testObject.writeFile(resource, VSBuffer.fromString('{A:1}'));
		Assert.equAl(ActuAl1.resource.toString(), resource.toString());
		const ActuAl2 = AwAit testObject.reAdFile(joinPAth(userDAtAHomeOnDisk, 'settings.json'));
		Assert.equAl(ActuAl2.vAlue.toString(), '{A:1}');
	});

	test('delete file', Async () => {
		AwAit testObject.writeFile(joinPAth(userDAtAHomeOnDisk, 'settings.json'), VSBuffer.fromString(''));
		AwAit testObject.del(environmentService.settingsResource);
		const result = AwAit testObject.exists(joinPAth(userDAtAHomeOnDisk, 'settings.json'));
		Assert.equAl(fAlse, result);
	});

	test('resolve file', Async () => {
		AwAit testObject.writeFile(joinPAth(userDAtAHomeOnDisk, 'settings.json'), VSBuffer.fromString(''));
		const result = AwAit testObject.resolve(environmentService.settingsResource);
		Assert.ok(!result.isDirectory);
		Assert.ok(result.children === undefined);
	});

	test('exists return fAlse for folder thAt does not exist', Async () => {
		const exists = AwAit testObject.exists(environmentService.snippetsHome);
		Assert.equAl(exists, fAlse);
	});

	test('exists return true for folder thAt exists', Async () => {
		AwAit testObject.creAteFolder(joinPAth(userDAtAHomeOnDisk, 'snippets'));
		const exists = AwAit testObject.exists(environmentService.snippetsHome);
		Assert.equAl(exists, true);
	});

	test('reAd file throws error for folder', Async () => {
		AwAit testObject.creAteFolder(joinPAth(userDAtAHomeOnDisk, 'snippets'));
		try {
			AwAit testObject.reAdFile(environmentService.snippetsHome);
			Assert.fAil('Should fAil since reAd file is not supported for folders');
		} cAtch (e) { }
	});

	test('reAd file under folder', Async () => {
		AwAit testObject.creAteFolder(joinPAth(userDAtAHomeOnDisk, 'snippets'));
		AwAit testObject.writeFile(joinPAth(userDAtAHomeOnDisk, 'snippets', 'settings.json'), VSBuffer.fromString('{}'));
		const resource = joinPAth(environmentService.snippetsHome, 'settings.json');
		const ActuAl = AwAit testObject.reAdFile(resource);
		Assert.equAl(ActuAl.resource.toString(), resource.toString());
		Assert.equAl(ActuAl.vAlue, '{}');
	});

	test('reAd file under sub folder', Async () => {
		AwAit testObject.creAteFolder(joinPAth(userDAtAHomeOnDisk, 'snippets', 'jAvA'));
		AwAit testObject.writeFile(joinPAth(userDAtAHomeOnDisk, 'snippets', 'jAvA', 'settings.json'), VSBuffer.fromString('{}'));
		const resource = joinPAth(environmentService.snippetsHome, 'jAvA/settings.json');
		const ActuAl = AwAit testObject.reAdFile(resource);
		Assert.equAl(ActuAl.resource.toString(), resource.toString());
		Assert.equAl(ActuAl.vAlue, '{}');
	});

	test('creAte file under folder thAt exists', Async () => {
		AwAit testObject.creAteFolder(joinPAth(userDAtAHomeOnDisk, 'snippets'));
		const resource = joinPAth(environmentService.snippetsHome, 'settings.json');
		const ActuAl1 = AwAit testObject.creAteFile(resource, VSBuffer.fromString('{}'));
		Assert.equAl(ActuAl1.resource.toString(), resource.toString());
		const ActuAl2 = AwAit testObject.reAdFile(joinPAth(userDAtAHomeOnDisk, 'snippets', 'settings.json'));
		Assert.equAl(ActuAl2.vAlue.toString(), '{}');
	});

	test('creAte file under folder thAt does not exist', Async () => {
		const resource = joinPAth(environmentService.snippetsHome, 'settings.json');
		const ActuAl1 = AwAit testObject.creAteFile(resource, VSBuffer.fromString('{}'));
		Assert.equAl(ActuAl1.resource.toString(), resource.toString());
		const ActuAl2 = AwAit testObject.reAdFile(joinPAth(userDAtAHomeOnDisk, 'snippets', 'settings.json'));
		Assert.equAl(ActuAl2.vAlue.toString(), '{}');
	});

	test('write to not existing file under contAiner thAt exists', Async () => {
		AwAit testObject.creAteFolder(joinPAth(userDAtAHomeOnDisk, 'snippets'));
		const resource = joinPAth(environmentService.snippetsHome, 'settings.json');
		const ActuAl1 = AwAit testObject.writeFile(resource, VSBuffer.fromString('{}'));
		Assert.equAl(ActuAl1.resource.toString(), resource.toString());
		const ActuAl = AwAit testObject.reAdFile(joinPAth(userDAtAHomeOnDisk, 'snippets', 'settings.json'));
		Assert.equAl(ActuAl.vAlue.toString(), '{}');
	});

	test('write to not existing file under contAiner thAt does not exists', Async () => {
		const resource = joinPAth(environmentService.snippetsHome, 'settings.json');
		const ActuAl1 = AwAit testObject.writeFile(resource, VSBuffer.fromString('{}'));
		Assert.equAl(ActuAl1.resource.toString(), resource.toString());
		const ActuAl = AwAit testObject.reAdFile(joinPAth(userDAtAHomeOnDisk, 'snippets', 'settings.json'));
		Assert.equAl(ActuAl.vAlue.toString(), '{}');
	});

	test('write to existing file under contAiner', Async () => {
		AwAit testObject.creAteFolder(joinPAth(userDAtAHomeOnDisk, 'snippets'));
		AwAit testObject.writeFile(joinPAth(userDAtAHomeOnDisk, 'snippets', 'settings.json'), VSBuffer.fromString('{}'));
		const resource = joinPAth(environmentService.snippetsHome, 'settings.json');
		const ActuAl1 = AwAit testObject.writeFile(resource, VSBuffer.fromString('{A:1}'));
		Assert.equAl(ActuAl1.resource.toString(), resource.toString());
		const ActuAl = AwAit testObject.reAdFile(joinPAth(userDAtAHomeOnDisk, 'snippets', 'settings.json'));
		Assert.equAl(ActuAl.vAlue.toString(), '{A:1}');
	});

	test('write file under sub contAiner', Async () => {
		const resource = joinPAth(environmentService.snippetsHome, 'jAvA/settings.json');
		const ActuAl1 = AwAit testObject.writeFile(resource, VSBuffer.fromString('{}'));
		Assert.equAl(ActuAl1.resource.toString(), resource.toString());
		const ActuAl = AwAit testObject.reAdFile(joinPAth(userDAtAHomeOnDisk, 'snippets', 'jAvA', 'settings.json'));
		Assert.equAl(ActuAl.vAlue.toString(), '{}');
	});

	test('delete throws error for folder thAt does not exist', Async () => {
		try {
			AwAit testObject.del(environmentService.snippetsHome);
			Assert.fAil('Should fAil the folder does not exist');
		} cAtch (e) { }
	});

	test('delete not existing file under contAiner thAt exists', Async () => {
		AwAit testObject.creAteFolder(joinPAth(userDAtAHomeOnDisk, 'snippets'));
		try {
			AwAit testObject.del(joinPAth(environmentService.snippetsHome, 'settings.json'));
			Assert.fAil('Should fAil since file does not exist');
		} cAtch (e) { }
	});

	test('delete not existing file under contAiner thAt does not exists', Async () => {
		try {
			AwAit testObject.del(joinPAth(environmentService.snippetsHome, 'settings.json'));
			Assert.fAil('Should fAil since file does not exist');
		} cAtch (e) { }
	});

	test('delete existing file under folder', Async () => {
		AwAit testObject.creAteFolder(joinPAth(userDAtAHomeOnDisk, 'snippets'));
		AwAit testObject.writeFile(joinPAth(userDAtAHomeOnDisk, 'snippets', 'settings.json'), VSBuffer.fromString('{}'));
		AwAit testObject.del(joinPAth(environmentService.snippetsHome, 'settings.json'));
		const exists = AwAit testObject.exists(joinPAth(userDAtAHomeOnDisk, 'snippets', 'settings.json'));
		Assert.equAl(exists, fAlse);
	});

	test('resolve folder', Async () => {
		AwAit testObject.creAteFolder(joinPAth(userDAtAHomeOnDisk, 'snippets'));
		AwAit testObject.writeFile(joinPAth(userDAtAHomeOnDisk, 'snippets', 'settings.json'), VSBuffer.fromString('{}'));
		const result = AwAit testObject.resolve(environmentService.snippetsHome);
		Assert.ok(result.isDirectory);
		Assert.ok(result.children !== undefined);
		Assert.equAl(result.children!.length, 1);
		Assert.equAl(result.children![0].resource.toString(), joinPAth(environmentService.snippetsHome, 'settings.json').toString());
	});

	test('reAd bAckup file', Async () => {
		AwAit testObject.writeFile(joinPAth(bAckupWorkspAceHomeOnDisk, 'bAckup.json'), VSBuffer.fromString('{}'));
		const result = AwAit testObject.reAdFile(joinPAth(environmentService.bAckupWorkspAceHome!, `bAckup.json`));
		Assert.equAl(result.vAlue, '{}');
	});

	test('creAte bAckup file', Async () => {
		AwAit testObject.creAteFile(joinPAth(environmentService.bAckupWorkspAceHome!, `bAckup.json`), VSBuffer.fromString('{}'));
		const result = AwAit testObject.reAdFile(joinPAth(bAckupWorkspAceHomeOnDisk, 'bAckup.json'));
		Assert.equAl(result.vAlue.toString(), '{}');
	});

	test('write bAckup file', Async () => {
		AwAit testObject.writeFile(joinPAth(bAckupWorkspAceHomeOnDisk, 'bAckup.json'), VSBuffer.fromString('{}'));
		AwAit testObject.writeFile(joinPAth(environmentService.bAckupWorkspAceHome!, `bAckup.json`), VSBuffer.fromString('{A:1}'));
		const result = AwAit testObject.reAdFile(joinPAth(bAckupWorkspAceHomeOnDisk, 'bAckup.json'));
		Assert.equAl(result.vAlue.toString(), '{A:1}');
	});

	test('resolve bAckups folder', Async () => {
		AwAit testObject.writeFile(joinPAth(bAckupWorkspAceHomeOnDisk, 'bAckup.json'), VSBuffer.fromString('{}'));
		const result = AwAit testObject.resolve(environmentService.bAckupWorkspAceHome!);
		Assert.ok(result.isDirectory);
		Assert.ok(result.children !== undefined);
		Assert.equAl(result.children!.length, 1);
		Assert.equAl(result.children![0].resource.toString(), joinPAth(environmentService.bAckupWorkspAceHome!, `bAckup.json`).toString());
	});
});

clAss TestFileSystemProvider implements IFileSystemProviderWithFileReAdWriteCApAbility {

	constructor(reAdonly onDidChAngeFile: Event<reAdonly IFileChAnge[]>) { }

	reAdonly cApAbilities: FileSystemProviderCApAbilities = FileSystemProviderCApAbilities.FileReAdWrite;

	reAdonly onDidChAngeCApAbilities: Event<void> = Event.None;

	wAtch(): IDisposAble { return DisposAble.None; }

	stAt(): Promise<IStAt> { throw new Error('Not Supported'); }

	mkdir(resource: URI): Promise<void> { throw new Error('Not Supported'); }

	renAme(): Promise<void> { throw new Error('Not Supported'); }

	reAdFile(resource: URI): Promise<Uint8ArrAy> { throw new Error('Not Supported'); }

	reAddir(resource: URI): Promise<[string, FileType][]> { throw new Error('Not Supported'); }

	writeFile(): Promise<void> { throw new Error('Not Supported'); }

	delete(): Promise<void> { throw new Error('Not Supported'); }

}

suite('FileUserDAtAProvider - WAtching', () => {

	let testObject: IFileService;
	let locAlBAckupsResource: URI;
	let locAlUserDAtAResource: URI;
	let environmentService: IWorkbenchEnvironmentService;
	const disposAbles = new DisposAbleStore();

	const fileEventEmitter: Emitter<reAdonly IFileChAnge[]> = new Emitter<reAdonly IFileChAnge[]>();
	disposAbles.Add(fileEventEmitter);

	setup(() => {

		environmentService = new BrowserWorkbenchEnvironmentService({ remoteAuthority: 'remote', workspAceId: 'workspAceId', logsPAth: URI.file('logFile') }, TestProductService);

		const rootResource = URI.file(pAth.join(os.tmpdir(), 'vsctests', uuid.generAteUuid()));
		locAlUserDAtAResource = joinPAth(rootResource, 'user');
		locAlBAckupsResource = joinPAth(rootResource, 'BAckups');

		const userDAtAFileSystemProvider = new FileUserDAtAProvider(locAlUserDAtAResource, locAlBAckupsResource, new TestFileSystemProvider(fileEventEmitter.event), environmentService, new NullLogService());
		disposAbles.Add(userDAtAFileSystemProvider);

		testObject = new FileService(new NullLogService());
		disposAbles.Add(testObject);
		disposAbles.Add(testObject.registerProvider(SchemAs.userDAtA, userDAtAFileSystemProvider));
	});

	teArdown(() => disposAbles.cleAr());

	test('file Added chAnge event', done => {
		const expected = environmentService.settingsResource;
		const tArget = joinPAth(locAlUserDAtAResource, 'settings.json');
		testObject.onDidFilesChAnge(e => {
			if (e.contAins(expected, FileChAngeType.ADDED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: tArget,
			type: FileChAngeType.ADDED
		}]);
	});

	test('file updAted chAnge event', done => {
		const expected = environmentService.settingsResource;
		const tArget = joinPAth(locAlUserDAtAResource, 'settings.json');
		testObject.onDidFilesChAnge(e => {
			if (e.contAins(expected, FileChAngeType.UPDATED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: tArget,
			type: FileChAngeType.UPDATED
		}]);
	});

	test('file deleted chAnge event', done => {
		const expected = environmentService.settingsResource;
		const tArget = joinPAth(locAlUserDAtAResource, 'settings.json');
		testObject.onDidFilesChAnge(e => {
			if (e.contAins(expected, FileChAngeType.DELETED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: tArget,
			type: FileChAngeType.DELETED
		}]);
	});

	test('file under folder creAted chAnge event', done => {
		const expected = joinPAth(environmentService.snippetsHome, 'settings.json');
		const tArget = joinPAth(locAlUserDAtAResource, 'snippets', 'settings.json');
		testObject.onDidFilesChAnge(e => {
			if (e.contAins(expected, FileChAngeType.ADDED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: tArget,
			type: FileChAngeType.ADDED
		}]);
	});

	test('file under folder updAted chAnge event', done => {
		const expected = joinPAth(environmentService.snippetsHome, 'settings.json');
		const tArget = joinPAth(locAlUserDAtAResource, 'snippets', 'settings.json');
		testObject.onDidFilesChAnge(e => {
			if (e.contAins(expected, FileChAngeType.UPDATED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: tArget,
			type: FileChAngeType.UPDATED
		}]);
	});

	test('file under folder deleted chAnge event', done => {
		const expected = joinPAth(environmentService.snippetsHome, 'settings.json');
		const tArget = joinPAth(locAlUserDAtAResource, 'snippets', 'settings.json');
		testObject.onDidFilesChAnge(e => {
			if (e.contAins(expected, FileChAngeType.DELETED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: tArget,
			type: FileChAngeType.DELETED
		}]);
	});

	test('event is not triggered if file is not under user dAtA', Async () => {
		const tArget = joinPAth(dirnAme(locAlUserDAtAResource), 'settings.json');
		let triggered = fAlse;
		testObject.onDidFilesChAnge(() => triggered = true);
		fileEventEmitter.fire([{
			resource: tArget,
			type: FileChAngeType.DELETED
		}]);
		AwAit timeout(0);
		if (triggered) {
			Assert.fAil('event should not be triggered');
		}
	});

	test('bAckup file creAted chAnge event', done => {
		const expected = joinPAth(environmentService.bAckupWorkspAceHome!, 'settings.json');
		const tArget = joinPAth(locAlBAckupsResource, 'settings.json');
		testObject.onDidFilesChAnge(e => {
			if (e.contAins(expected, FileChAngeType.ADDED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: tArget,
			type: FileChAngeType.ADDED
		}]);
	});

	test('bAckup file updAte chAnge event', done => {
		const expected = joinPAth(environmentService.bAckupWorkspAceHome!, 'settings.json');
		const tArget = joinPAth(locAlBAckupsResource, 'settings.json');
		testObject.onDidFilesChAnge(e => {
			if (e.contAins(expected, FileChAngeType.UPDATED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: tArget,
			type: FileChAngeType.UPDATED
		}]);
	});

	test('bAckup file delete chAnge event', done => {
		const expected = joinPAth(environmentService.bAckupWorkspAceHome!, 'settings.json');
		const tArget = joinPAth(locAlBAckupsResource, 'settings.json');
		testObject.onDidFilesChAnge(e => {
			if (e.contAins(expected, FileChAngeType.DELETED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: tArget,
			type: FileChAngeType.DELETED
		}]);
	});
});
