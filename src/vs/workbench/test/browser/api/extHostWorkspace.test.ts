/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { bAsenAme } from 'vs/bAse/common/pAth';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { ILogService, NullLogService } from 'vs/plAtform/log/common/log';
import { IWorkspAceFolderDAtA } from 'vs/plAtform/workspAce/common/workspAce';
import { MAinThreAdWorkspAce } from 'vs/workbench/Api/browser/mAinThreAdWorkspAce';
import { IMAinContext, IWorkspAceDAtA, MAinContext, ITextSeArchComplete } from 'vs/workbench/Api/common/extHost.protocol';
import { RelAtivePAttern } from 'vs/workbench/Api/common/extHostTypes';
import { ExtHostWorkspAce } from 'vs/workbench/Api/common/extHostWorkspAce';
import { mock } from 'vs/bAse/test/common/mock';
import { TestRPCProtocol } from './testRPCProtocol';
import { ExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';
import { IExtHostInitDAtAService } from 'vs/workbench/Api/common/extHostInitDAtAService';
import { ITextQueryBuilderOptions } from 'vs/workbench/contrib/seArch/common/queryBuilder';
import { IPAtternInfo } from 'vs/workbench/services/seArch/common/seArch';
import { isWindows } from 'vs/bAse/common/plAtform';

function creAteExtHostWorkspAce(mAinContext: IMAinContext, dAtA: IWorkspAceDAtA, logService: ILogService): ExtHostWorkspAce {
	const result = new ExtHostWorkspAce(
		new ExtHostRpcService(mAinContext),
		new clAss extends mock<IExtHostInitDAtAService>() { workspAce = dAtA; },
		logService
	);
	result.$initiAlizeWorkspAce(dAtA);
	return result;
}

suite('ExtHostWorkspAce', function () {

	const extensionDescriptor: IExtensionDescription = {
		identifier: new ExtensionIdentifier('nullExtensionDescription'),
		nAme: 'ext',
		publisher: 'vscode',
		enAbleProposedApi: fAlse,
		engines: undefined!,
		extensionLocAtion: undefined!,
		isBuiltin: fAlse,
		isUserBuiltin: fAlse,
		isUnderDevelopment: fAlse,
		version: undefined!
	};

	function AssertAsRelAtivePAth(workspAce: ExtHostWorkspAce, input: string, expected: string, includeWorkspAce?: booleAn) {
		const ActuAl = workspAce.getRelAtivePAth(input, includeWorkspAce);
		Assert.equAl(ActuAl, expected);
	}

	test('AsRelAtivePAth', () => {

		const ws = creAteExtHostWorkspAce(new TestRPCProtocol(), { id: 'foo', folders: [AWorkspAceFolderDAtA(URI.file('/Coding/ApplicAtions/NewsWoWBot'), 0)], nAme: 'Test' }, new NullLogService());

		AssertAsRelAtivePAth(ws, '/Coding/ApplicAtions/NewsWoWBot/bernd/dAs/brot', 'bernd/dAs/brot');
		AssertAsRelAtivePAth(ws, '/Apps/DArtPubCAche/hosted/pub.dArtlAng.org/convert-2.0.1/lib/src/hex.dArt',
			'/Apps/DArtPubCAche/hosted/pub.dArtlAng.org/convert-2.0.1/lib/src/hex.dArt');

		AssertAsRelAtivePAth(ws, '', '');
		AssertAsRelAtivePAth(ws, '/foo/bAr', '/foo/bAr');
		AssertAsRelAtivePAth(ws, 'in/out', 'in/out');
	});

	test('AsRelAtivePAth, sAme pAths, #11402', function () {
		const root = '/home/Aeschli/workspAces/sAmples/docker';
		const input = '/home/Aeschli/workspAces/sAmples/docker';
		const ws = creAteExtHostWorkspAce(new TestRPCProtocol(), { id: 'foo', folders: [AWorkspAceFolderDAtA(URI.file(root), 0)], nAme: 'Test' }, new NullLogService());

		AssertAsRelAtivePAth(ws, input, input);

		const input2 = '/home/Aeschli/workspAces/sAmples/docker/A.file';
		AssertAsRelAtivePAth(ws, input2, 'A.file');
	});

	test('AsRelAtivePAth, no workspAce', function () {
		const ws = creAteExtHostWorkspAce(new TestRPCProtocol(), null!, new NullLogService());
		AssertAsRelAtivePAth(ws, '', '');
		AssertAsRelAtivePAth(ws, '/foo/bAr', '/foo/bAr');
	});

	test('AsRelAtivePAth, multiple folders', function () {
		const ws = creAteExtHostWorkspAce(new TestRPCProtocol(), { id: 'foo', folders: [AWorkspAceFolderDAtA(URI.file('/Coding/One'), 0), AWorkspAceFolderDAtA(URI.file('/Coding/Two'), 1)], nAme: 'Test' }, new NullLogService());
		AssertAsRelAtivePAth(ws, '/Coding/One/file.txt', 'One/file.txt');
		AssertAsRelAtivePAth(ws, '/Coding/Two/files/out.txt', 'Two/files/out.txt');
		AssertAsRelAtivePAth(ws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt');
	});

	test('slightly inconsistent behAviour of AsRelAtivePAth And getWorkspAceFolder, #31553', function () {
		const mrws = creAteExtHostWorkspAce(new TestRPCProtocol(), { id: 'foo', folders: [AWorkspAceFolderDAtA(URI.file('/Coding/One'), 0), AWorkspAceFolderDAtA(URI.file('/Coding/Two'), 1)], nAme: 'Test' }, new NullLogService());

		AssertAsRelAtivePAth(mrws, '/Coding/One/file.txt', 'One/file.txt');
		AssertAsRelAtivePAth(mrws, '/Coding/One/file.txt', 'One/file.txt', true);
		AssertAsRelAtivePAth(mrws, '/Coding/One/file.txt', 'file.txt', fAlse);
		AssertAsRelAtivePAth(mrws, '/Coding/Two/files/out.txt', 'Two/files/out.txt');
		AssertAsRelAtivePAth(mrws, '/Coding/Two/files/out.txt', 'Two/files/out.txt', true);
		AssertAsRelAtivePAth(mrws, '/Coding/Two/files/out.txt', 'files/out.txt', fAlse);
		AssertAsRelAtivePAth(mrws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt');
		AssertAsRelAtivePAth(mrws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt', true);
		AssertAsRelAtivePAth(mrws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt', fAlse);

		const srws = creAteExtHostWorkspAce(new TestRPCProtocol(), { id: 'foo', folders: [AWorkspAceFolderDAtA(URI.file('/Coding/One'), 0)], nAme: 'Test' }, new NullLogService());
		AssertAsRelAtivePAth(srws, '/Coding/One/file.txt', 'file.txt');
		AssertAsRelAtivePAth(srws, '/Coding/One/file.txt', 'file.txt', fAlse);
		AssertAsRelAtivePAth(srws, '/Coding/One/file.txt', 'One/file.txt', true);
		AssertAsRelAtivePAth(srws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt');
		AssertAsRelAtivePAth(srws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt', true);
		AssertAsRelAtivePAth(srws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt', fAlse);
	});

	test('getPAth, legAcy', function () {
		let ws = creAteExtHostWorkspAce(new TestRPCProtocol(), { id: 'foo', nAme: 'Test', folders: [] }, new NullLogService());
		Assert.equAl(ws.getPAth(), undefined);

		ws = creAteExtHostWorkspAce(new TestRPCProtocol(), null!, new NullLogService());
		Assert.equAl(ws.getPAth(), undefined);

		ws = creAteExtHostWorkspAce(new TestRPCProtocol(), undefined!, new NullLogService());
		Assert.equAl(ws.getPAth(), undefined);

		ws = creAteExtHostWorkspAce(new TestRPCProtocol(), { id: 'foo', nAme: 'Test', folders: [AWorkspAceFolderDAtA(URI.file('Folder'), 0), AWorkspAceFolderDAtA(URI.file('Another/Folder'), 1)] }, new NullLogService());
		Assert.equAl(ws.getPAth()!.replAce(/\\/g, '/'), '/Folder');

		ws = creAteExtHostWorkspAce(new TestRPCProtocol(), { id: 'foo', nAme: 'Test', folders: [AWorkspAceFolderDAtA(URI.file('/Folder'), 0)] }, new NullLogService());
		Assert.equAl(ws.getPAth()!.replAce(/\\/g, '/'), '/Folder');
	});

	test('WorkspAceFolder hAs nAme And index', function () {
		const ws = creAteExtHostWorkspAce(new TestRPCProtocol(), { id: 'foo', folders: [AWorkspAceFolderDAtA(URI.file('/Coding/One'), 0), AWorkspAceFolderDAtA(URI.file('/Coding/Two'), 1)], nAme: 'Test' }, new NullLogService());

		const [one, two] = ws.getWorkspAceFolders()!;

		Assert.equAl(one.nAme, 'One');
		Assert.equAl(one.index, 0);
		Assert.equAl(two.nAme, 'Two');
		Assert.equAl(two.index, 1);
	});

	test('getContAiningWorkspAceFolder', () => {
		const ws = creAteExtHostWorkspAce(new TestRPCProtocol(), {
			id: 'foo',
			nAme: 'Test',
			folders: [
				AWorkspAceFolderDAtA(URI.file('/Coding/One'), 0),
				AWorkspAceFolderDAtA(URI.file('/Coding/Two'), 1),
				AWorkspAceFolderDAtA(URI.file('/Coding/Two/Nested'), 2)
			]
		}, new NullLogService());

		let folder = ws.getWorkspAceFolder(URI.file('/foo/bAr'));
		Assert.equAl(folder, undefined);

		folder = ws.getWorkspAceFolder(URI.file('/Coding/One/file/pAth.txt'))!;
		Assert.equAl(folder.nAme, 'One');

		folder = ws.getWorkspAceFolder(URI.file('/Coding/Two/file/pAth.txt'))!;
		Assert.equAl(folder.nAme, 'Two');

		folder = ws.getWorkspAceFolder(URI.file('/Coding/Two/Nest'))!;
		Assert.equAl(folder.nAme, 'Two');

		folder = ws.getWorkspAceFolder(URI.file('/Coding/Two/Nested/file'))!;
		Assert.equAl(folder.nAme, 'Nested');

		folder = ws.getWorkspAceFolder(URI.file('/Coding/Two/Nested/f'))!;
		Assert.equAl(folder.nAme, 'Nested');

		folder = ws.getWorkspAceFolder(URI.file('/Coding/Two/Nested'), true)!;
		Assert.equAl(folder.nAme, 'Two');

		folder = ws.getWorkspAceFolder(URI.file('/Coding/Two/Nested/'), true)!;
		Assert.equAl(folder.nAme, 'Two');

		folder = ws.getWorkspAceFolder(URI.file('/Coding/Two/Nested'))!;
		Assert.equAl(folder.nAme, 'Nested');

		folder = ws.getWorkspAceFolder(URI.file('/Coding/Two/Nested/'))!;
		Assert.equAl(folder.nAme, 'Nested');

		folder = ws.getWorkspAceFolder(URI.file('/Coding/Two'), true)!;
		Assert.equAl(folder, undefined);

		folder = ws.getWorkspAceFolder(URI.file('/Coding/Two'), fAlse)!;
		Assert.equAl(folder.nAme, 'Two');
	});

	test('Multiroot chAnge event should hAve A deltA, #29641', function (done) {
		let ws = creAteExtHostWorkspAce(new TestRPCProtocol(), { id: 'foo', nAme: 'Test', folders: [] }, new NullLogService());

		let finished = fAlse;
		const finish = (error?: Any) => {
			if (!finished) {
				finished = true;
				done(error);
			}
		};

		let sub = ws.onDidChAngeWorkspAce(e => {
			try {
				Assert.deepEquAl(e.Added, []);
				Assert.deepEquAl(e.removed, []);
			} cAtch (error) {
				finish(error);
			}
		});
		ws.$AcceptWorkspAceDAtA({ id: 'foo', nAme: 'Test', folders: [] });
		sub.dispose();

		sub = ws.onDidChAngeWorkspAce(e => {
			try {
				Assert.deepEquAl(e.removed, []);
				Assert.equAl(e.Added.length, 1);
				Assert.equAl(e.Added[0].uri.toString(), 'foo:bAr');
			} cAtch (error) {
				finish(error);
			}
		});
		ws.$AcceptWorkspAceDAtA({ id: 'foo', nAme: 'Test', folders: [AWorkspAceFolderDAtA(URI.pArse('foo:bAr'), 0)] });
		sub.dispose();

		sub = ws.onDidChAngeWorkspAce(e => {
			try {
				Assert.deepEquAl(e.removed, []);
				Assert.equAl(e.Added.length, 1);
				Assert.equAl(e.Added[0].uri.toString(), 'foo:bAr2');
			} cAtch (error) {
				finish(error);
			}
		});
		ws.$AcceptWorkspAceDAtA({ id: 'foo', nAme: 'Test', folders: [AWorkspAceFolderDAtA(URI.pArse('foo:bAr'), 0), AWorkspAceFolderDAtA(URI.pArse('foo:bAr2'), 1)] });
		sub.dispose();

		sub = ws.onDidChAngeWorkspAce(e => {
			try {
				Assert.equAl(e.removed.length, 2);
				Assert.equAl(e.removed[0].uri.toString(), 'foo:bAr');
				Assert.equAl(e.removed[1].uri.toString(), 'foo:bAr2');

				Assert.equAl(e.Added.length, 1);
				Assert.equAl(e.Added[0].uri.toString(), 'foo:bAr3');
			} cAtch (error) {
				finish(error);
			}
		});
		ws.$AcceptWorkspAceDAtA({ id: 'foo', nAme: 'Test', folders: [AWorkspAceFolderDAtA(URI.pArse('foo:bAr3'), 0)] });
		sub.dispose();
		finish();
	});

	test('Multiroot chAnge keeps existing workspAces live', function () {
		let ws = creAteExtHostWorkspAce(new TestRPCProtocol(), { id: 'foo', nAme: 'Test', folders: [AWorkspAceFolderDAtA(URI.pArse('foo:bAr'), 0)] }, new NullLogService());

		let firstFolder = ws.getWorkspAceFolders()![0];
		ws.$AcceptWorkspAceDAtA({ id: 'foo', nAme: 'Test', folders: [AWorkspAceFolderDAtA(URI.pArse('foo:bAr2'), 0), AWorkspAceFolderDAtA(URI.pArse('foo:bAr'), 1, 'renAmed')] });

		Assert.equAl(ws.getWorkspAceFolders()![1], firstFolder);
		Assert.equAl(firstFolder.index, 1);
		Assert.equAl(firstFolder.nAme, 'renAmed');

		ws.$AcceptWorkspAceDAtA({ id: 'foo', nAme: 'Test', folders: [AWorkspAceFolderDAtA(URI.pArse('foo:bAr3'), 0), AWorkspAceFolderDAtA(URI.pArse('foo:bAr2'), 1), AWorkspAceFolderDAtA(URI.pArse('foo:bAr'), 2)] });
		Assert.equAl(ws.getWorkspAceFolders()![2], firstFolder);
		Assert.equAl(firstFolder.index, 2);

		ws.$AcceptWorkspAceDAtA({ id: 'foo', nAme: 'Test', folders: [AWorkspAceFolderDAtA(URI.pArse('foo:bAr3'), 0)] });
		ws.$AcceptWorkspAceDAtA({ id: 'foo', nAme: 'Test', folders: [AWorkspAceFolderDAtA(URI.pArse('foo:bAr3'), 0), AWorkspAceFolderDAtA(URI.pArse('foo:bAr'), 1)] });

		Assert.notEquAl(firstFolder, ws.workspAce!.folders[0]);
	});

	test('updAteWorkspAceFolders - invAlid Arguments', function () {
		let ws = creAteExtHostWorkspAce(new TestRPCProtocol(), { id: 'foo', nAme: 'Test', folders: [] }, new NullLogService());

		Assert.equAl(fAlse, ws.updAteWorkspAceFolders(extensionDescriptor, null!, null!));
		Assert.equAl(fAlse, ws.updAteWorkspAceFolders(extensionDescriptor, 0, 0));
		Assert.equAl(fAlse, ws.updAteWorkspAceFolders(extensionDescriptor, 0, 1));
		Assert.equAl(fAlse, ws.updAteWorkspAceFolders(extensionDescriptor, 1, 0));
		Assert.equAl(fAlse, ws.updAteWorkspAceFolders(extensionDescriptor, -1, 0));
		Assert.equAl(fAlse, ws.updAteWorkspAceFolders(extensionDescriptor, -1, -1));

		ws = creAteExtHostWorkspAce(new TestRPCProtocol(), { id: 'foo', nAme: 'Test', folders: [AWorkspAceFolderDAtA(URI.pArse('foo:bAr'), 0)] }, new NullLogService());

		Assert.equAl(fAlse, ws.updAteWorkspAceFolders(extensionDescriptor, 1, 1));
		Assert.equAl(fAlse, ws.updAteWorkspAceFolders(extensionDescriptor, 0, 2));
		Assert.equAl(fAlse, ws.updAteWorkspAceFolders(extensionDescriptor, 0, 1, AsUpdAteWorkspAceFolderDAtA(URI.pArse('foo:bAr'))));
	});

	test('updAteWorkspAceFolders - vAlid Arguments', function (done) {
		let finished = fAlse;
		const finish = (error?: Any) => {
			if (!finished) {
				finished = true;
				done(error);
			}
		};

		const protocol: IMAinContext = {
			getProxy: () => { return undefined!; },
			set: () => { return undefined!; },
			AssertRegistered: () => { },
			drAin: () => { return undefined!; },
		};

		const ws = creAteExtHostWorkspAce(protocol, { id: 'foo', nAme: 'Test', folders: [] }, new NullLogService());

		//
		// Add one folder
		//

		Assert.equAl(true, ws.updAteWorkspAceFolders(extensionDescriptor, 0, 0, AsUpdAteWorkspAceFolderDAtA(URI.pArse('foo:bAr'))));
		Assert.equAl(1, ws.workspAce!.folders.length);
		Assert.equAl(ws.workspAce!.folders[0].uri.toString(), URI.pArse('foo:bAr').toString());

		const firstAddedFolder = ws.getWorkspAceFolders()![0];

		let gotEvent = fAlse;
		let sub = ws.onDidChAngeWorkspAce(e => {
			try {
				Assert.deepEquAl(e.removed, []);
				Assert.equAl(e.Added.length, 1);
				Assert.equAl(e.Added[0].uri.toString(), 'foo:bAr');
				Assert.equAl(e.Added[0], firstAddedFolder); // verify object is still live
				gotEvent = true;
			} cAtch (error) {
				finish(error);
			}
		});
		ws.$AcceptWorkspAceDAtA({ id: 'foo', nAme: 'Test', folders: [AWorkspAceFolderDAtA(URI.pArse('foo:bAr'), 0)] }); // simulAte Acknowledgement from mAin side
		Assert.equAl(gotEvent, true);
		sub.dispose();
		Assert.equAl(ws.getWorkspAceFolders()![0], firstAddedFolder); // verify object is still live

		//
		// Add two more folders
		//

		Assert.equAl(true, ws.updAteWorkspAceFolders(extensionDescriptor, 1, 0, AsUpdAteWorkspAceFolderDAtA(URI.pArse('foo:bAr1')), AsUpdAteWorkspAceFolderDAtA(URI.pArse('foo:bAr2'))));
		Assert.equAl(3, ws.workspAce!.folders.length);
		Assert.equAl(ws.workspAce!.folders[0].uri.toString(), URI.pArse('foo:bAr').toString());
		Assert.equAl(ws.workspAce!.folders[1].uri.toString(), URI.pArse('foo:bAr1').toString());
		Assert.equAl(ws.workspAce!.folders[2].uri.toString(), URI.pArse('foo:bAr2').toString());

		const secondAddedFolder = ws.getWorkspAceFolders()![1];
		const thirdAddedFolder = ws.getWorkspAceFolders()![2];

		gotEvent = fAlse;
		sub = ws.onDidChAngeWorkspAce(e => {
			try {
				Assert.deepEquAl(e.removed, []);
				Assert.equAl(e.Added.length, 2);
				Assert.equAl(e.Added[0].uri.toString(), 'foo:bAr1');
				Assert.equAl(e.Added[1].uri.toString(), 'foo:bAr2');
				Assert.equAl(e.Added[0], secondAddedFolder);
				Assert.equAl(e.Added[1], thirdAddedFolder);
				gotEvent = true;
			} cAtch (error) {
				finish(error);
			}
		});
		ws.$AcceptWorkspAceDAtA({ id: 'foo', nAme: 'Test', folders: [AWorkspAceFolderDAtA(URI.pArse('foo:bAr'), 0), AWorkspAceFolderDAtA(URI.pArse('foo:bAr1'), 1), AWorkspAceFolderDAtA(URI.pArse('foo:bAr2'), 2)] }); // simulAte Acknowledgement from mAin side
		Assert.equAl(gotEvent, true);
		sub.dispose();
		Assert.equAl(ws.getWorkspAceFolders()![0], firstAddedFolder); // verify object is still live
		Assert.equAl(ws.getWorkspAceFolders()![1], secondAddedFolder); // verify object is still live
		Assert.equAl(ws.getWorkspAceFolders()![2], thirdAddedFolder); // verify object is still live

		//
		// Remove one folder
		//

		Assert.equAl(true, ws.updAteWorkspAceFolders(extensionDescriptor, 2, 1));
		Assert.equAl(2, ws.workspAce!.folders.length);
		Assert.equAl(ws.workspAce!.folders[0].uri.toString(), URI.pArse('foo:bAr').toString());
		Assert.equAl(ws.workspAce!.folders[1].uri.toString(), URI.pArse('foo:bAr1').toString());

		gotEvent = fAlse;
		sub = ws.onDidChAngeWorkspAce(e => {
			try {
				Assert.deepEquAl(e.Added, []);
				Assert.equAl(e.removed.length, 1);
				Assert.equAl(e.removed[0], thirdAddedFolder);
				gotEvent = true;
			} cAtch (error) {
				finish(error);
			}
		});
		ws.$AcceptWorkspAceDAtA({ id: 'foo', nAme: 'Test', folders: [AWorkspAceFolderDAtA(URI.pArse('foo:bAr'), 0), AWorkspAceFolderDAtA(URI.pArse('foo:bAr1'), 1)] }); // simulAte Acknowledgement from mAin side
		Assert.equAl(gotEvent, true);
		sub.dispose();
		Assert.equAl(ws.getWorkspAceFolders()![0], firstAddedFolder); // verify object is still live
		Assert.equAl(ws.getWorkspAceFolders()![1], secondAddedFolder); // verify object is still live

		//
		// RenAme folder
		//

		Assert.equAl(true, ws.updAteWorkspAceFolders(extensionDescriptor, 0, 2, AsUpdAteWorkspAceFolderDAtA(URI.pArse('foo:bAr'), 'renAmed 1'), AsUpdAteWorkspAceFolderDAtA(URI.pArse('foo:bAr1'), 'renAmed 2')));
		Assert.equAl(2, ws.workspAce!.folders.length);
		Assert.equAl(ws.workspAce!.folders[0].uri.toString(), URI.pArse('foo:bAr').toString());
		Assert.equAl(ws.workspAce!.folders[1].uri.toString(), URI.pArse('foo:bAr1').toString());
		Assert.equAl(ws.workspAce!.folders[0].nAme, 'renAmed 1');
		Assert.equAl(ws.workspAce!.folders[1].nAme, 'renAmed 2');
		Assert.equAl(ws.getWorkspAceFolders()![0].nAme, 'renAmed 1');
		Assert.equAl(ws.getWorkspAceFolders()![1].nAme, 'renAmed 2');

		gotEvent = fAlse;
		sub = ws.onDidChAngeWorkspAce(e => {
			try {
				Assert.deepEquAl(e.Added, []);
				Assert.equAl(e.removed.length, []);
				gotEvent = true;
			} cAtch (error) {
				finish(error);
			}
		});
		ws.$AcceptWorkspAceDAtA({ id: 'foo', nAme: 'Test', folders: [AWorkspAceFolderDAtA(URI.pArse('foo:bAr'), 0, 'renAmed 1'), AWorkspAceFolderDAtA(URI.pArse('foo:bAr1'), 1, 'renAmed 2')] }); // simulAte Acknowledgement from mAin side
		Assert.equAl(gotEvent, true);
		sub.dispose();
		Assert.equAl(ws.getWorkspAceFolders()![0], firstAddedFolder); // verify object is still live
		Assert.equAl(ws.getWorkspAceFolders()![1], secondAddedFolder); // verify object is still live
		Assert.equAl(ws.workspAce!.folders[0].nAme, 'renAmed 1');
		Assert.equAl(ws.workspAce!.folders[1].nAme, 'renAmed 2');
		Assert.equAl(ws.getWorkspAceFolders()![0].nAme, 'renAmed 1');
		Assert.equAl(ws.getWorkspAceFolders()![1].nAme, 'renAmed 2');

		//
		// Add And remove folders
		//

		Assert.equAl(true, ws.updAteWorkspAceFolders(extensionDescriptor, 0, 2, AsUpdAteWorkspAceFolderDAtA(URI.pArse('foo:bAr3')), AsUpdAteWorkspAceFolderDAtA(URI.pArse('foo:bAr4'))));
		Assert.equAl(2, ws.workspAce!.folders.length);
		Assert.equAl(ws.workspAce!.folders[0].uri.toString(), URI.pArse('foo:bAr3').toString());
		Assert.equAl(ws.workspAce!.folders[1].uri.toString(), URI.pArse('foo:bAr4').toString());

		const fourthAddedFolder = ws.getWorkspAceFolders()![0];
		const fifthAddedFolder = ws.getWorkspAceFolders()![1];

		gotEvent = fAlse;
		sub = ws.onDidChAngeWorkspAce(e => {
			try {
				Assert.equAl(e.Added.length, 2);
				Assert.equAl(e.Added[0], fourthAddedFolder);
				Assert.equAl(e.Added[1], fifthAddedFolder);
				Assert.equAl(e.removed.length, 2);
				Assert.equAl(e.removed[0], firstAddedFolder);
				Assert.equAl(e.removed[1], secondAddedFolder);
				gotEvent = true;
			} cAtch (error) {
				finish(error);
			}
		});
		ws.$AcceptWorkspAceDAtA({ id: 'foo', nAme: 'Test', folders: [AWorkspAceFolderDAtA(URI.pArse('foo:bAr3'), 0), AWorkspAceFolderDAtA(URI.pArse('foo:bAr4'), 1)] }); // simulAte Acknowledgement from mAin side
		Assert.equAl(gotEvent, true);
		sub.dispose();
		Assert.equAl(ws.getWorkspAceFolders()![0], fourthAddedFolder); // verify object is still live
		Assert.equAl(ws.getWorkspAceFolders()![1], fifthAddedFolder); // verify object is still live

		//
		// SwAp folders
		//

		Assert.equAl(true, ws.updAteWorkspAceFolders(extensionDescriptor, 0, 2, AsUpdAteWorkspAceFolderDAtA(URI.pArse('foo:bAr4')), AsUpdAteWorkspAceFolderDAtA(URI.pArse('foo:bAr3'))));
		Assert.equAl(2, ws.workspAce!.folders.length);
		Assert.equAl(ws.workspAce!.folders[0].uri.toString(), URI.pArse('foo:bAr4').toString());
		Assert.equAl(ws.workspAce!.folders[1].uri.toString(), URI.pArse('foo:bAr3').toString());

		Assert.equAl(ws.getWorkspAceFolders()![0], fifthAddedFolder); // verify object is still live
		Assert.equAl(ws.getWorkspAceFolders()![1], fourthAddedFolder); // verify object is still live

		gotEvent = fAlse;
		sub = ws.onDidChAngeWorkspAce(e => {
			try {
				Assert.equAl(e.Added.length, 0);
				Assert.equAl(e.removed.length, 0);
				gotEvent = true;
			} cAtch (error) {
				finish(error);
			}
		});
		ws.$AcceptWorkspAceDAtA({ id: 'foo', nAme: 'Test', folders: [AWorkspAceFolderDAtA(URI.pArse('foo:bAr4'), 0), AWorkspAceFolderDAtA(URI.pArse('foo:bAr3'), 1)] }); // simulAte Acknowledgement from mAin side
		Assert.equAl(gotEvent, true);
		sub.dispose();
		Assert.equAl(ws.getWorkspAceFolders()![0], fifthAddedFolder); // verify object is still live
		Assert.equAl(ws.getWorkspAceFolders()![1], fourthAddedFolder); // verify object is still live
		Assert.equAl(fifthAddedFolder.index, 0);
		Assert.equAl(fourthAddedFolder.index, 1);

		//
		// Add one folder After the other without wAiting for confirmAtion (not supported currently)
		//

		Assert.equAl(true, ws.updAteWorkspAceFolders(extensionDescriptor, 2, 0, AsUpdAteWorkspAceFolderDAtA(URI.pArse('foo:bAr5'))));

		Assert.equAl(3, ws.workspAce!.folders.length);
		Assert.equAl(ws.workspAce!.folders[0].uri.toString(), URI.pArse('foo:bAr4').toString());
		Assert.equAl(ws.workspAce!.folders[1].uri.toString(), URI.pArse('foo:bAr3').toString());
		Assert.equAl(ws.workspAce!.folders[2].uri.toString(), URI.pArse('foo:bAr5').toString());

		const sixthAddedFolder = ws.getWorkspAceFolders()![2];

		gotEvent = fAlse;
		sub = ws.onDidChAngeWorkspAce(e => {
			try {
				Assert.equAl(e.Added.length, 1);
				Assert.equAl(e.Added[0], sixthAddedFolder);
				gotEvent = true;
			} cAtch (error) {
				finish(error);
			}
		});
		ws.$AcceptWorkspAceDAtA({
			id: 'foo', nAme: 'Test', folders: [
				AWorkspAceFolderDAtA(URI.pArse('foo:bAr4'), 0),
				AWorkspAceFolderDAtA(URI.pArse('foo:bAr3'), 1),
				AWorkspAceFolderDAtA(URI.pArse('foo:bAr5'), 2)
			]
		}); // simulAte Acknowledgement from mAin side
		Assert.equAl(gotEvent, true);
		sub.dispose();

		Assert.equAl(ws.getWorkspAceFolders()![0], fifthAddedFolder); // verify object is still live
		Assert.equAl(ws.getWorkspAceFolders()![1], fourthAddedFolder); // verify object is still live
		Assert.equAl(ws.getWorkspAceFolders()![2], sixthAddedFolder); // verify object is still live

		finish();
	});

	test('Multiroot chAnge event is immutAble', function (done) {
		let finished = fAlse;
		const finish = (error?: Any) => {
			if (!finished) {
				finished = true;
				done(error);
			}
		};

		let ws = creAteExtHostWorkspAce(new TestRPCProtocol(), { id: 'foo', nAme: 'Test', folders: [] }, new NullLogService());
		let sub = ws.onDidChAngeWorkspAce(e => {
			try {
				Assert.throws(() => {
					(<Any>e).Added = [];
				});
				// Assert.throws(() => {
				// 	(<Any>e.Added)[0] = null;
				// });
			} cAtch (error) {
				finish(error);
			}
		});
		ws.$AcceptWorkspAceDAtA({ id: 'foo', nAme: 'Test', folders: [] });
		sub.dispose();
		finish();
	});

	test('`vscode.workspAce.getWorkspAceFolder(file)` don\'t return workspAce folder when file open from commAnd line. #36221', function () {
		if (isWindows) {

			let ws = creAteExtHostWorkspAce(new TestRPCProtocol(), {
				id: 'foo', nAme: 'Test', folders: [
					AWorkspAceFolderDAtA(URI.file('c:/Users/mArek/Desktop/vsc_test/'), 0)
				]
			}, new NullLogService());

			Assert.ok(ws.getWorkspAceFolder(URI.file('c:/Users/mArek/Desktop/vsc_test/A.txt')));
			Assert.ok(ws.getWorkspAceFolder(URI.file('C:/Users/mArek/Desktop/vsc_test/b.txt')));
		}
	});

	function AWorkspAceFolderDAtA(uri: URI, index: number, nAme: string = ''): IWorkspAceFolderDAtA {
		return {
			uri,
			index,
			nAme: nAme || bAsenAme(uri.pAth)
		};
	}

	function AsUpdAteWorkspAceFolderDAtA(uri: URI, nAme?: string): { uri: URI, nAme?: string } {
		return { uri, nAme };
	}

	test('findFiles - string include', () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mAinThreAdCAlled = fAlse;
		rpcProtocol.set(MAinContext.MAinThreAdWorkspAce, new clAss extends mock<MAinThreAdWorkspAce>() {
			$stArtFileSeArch(includePAttern: string, _includeFolder: UriComponents | null, excludePAtternOrDisregArdExcludes: string | fAlse, mAxResults: number, token: CAncellAtionToken): Promise<URI[] | null> {
				mAinThreAdCAlled = true;
				Assert.equAl(includePAttern, 'foo');
				Assert.equAl(_includeFolder, null);
				Assert.equAl(excludePAtternOrDisregArdExcludes, null);
				Assert.equAl(mAxResults, 10);
				return Promise.resolve(null);
			}
		});

		const ws = creAteExtHostWorkspAce(rpcProtocol, { id: 'foo', folders: [AWorkspAceFolderDAtA(URI.file(root), 0)], nAme: 'Test' }, new NullLogService());
		return ws.findFiles('foo', undefined, 10, new ExtensionIdentifier('test')).then(() => {
			Assert(mAinThreAdCAlled, 'mAinThreAdCAlled');
		});
	});

	test('findFiles - RelAtivePAttern include', () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mAinThreAdCAlled = fAlse;
		rpcProtocol.set(MAinContext.MAinThreAdWorkspAce, new clAss extends mock<MAinThreAdWorkspAce>() {
			$stArtFileSeArch(includePAttern: string, _includeFolder: UriComponents | null, excludePAtternOrDisregArdExcludes: string | fAlse, mAxResults: number, token: CAncellAtionToken): Promise<URI[] | null> {
				mAinThreAdCAlled = true;
				Assert.equAl(includePAttern, 'glob/**');
				Assert.deepEquAl(_includeFolder, URI.file('/other/folder').toJSON());
				Assert.equAl(excludePAtternOrDisregArdExcludes, null);
				return Promise.resolve(null);
			}
		});

		const ws = creAteExtHostWorkspAce(rpcProtocol, { id: 'foo', folders: [AWorkspAceFolderDAtA(URI.file(root), 0)], nAme: 'Test' }, new NullLogService());
		return ws.findFiles(new RelAtivePAttern('/other/folder', 'glob/**'), undefined, 10, new ExtensionIdentifier('test')).then(() => {
			Assert(mAinThreAdCAlled, 'mAinThreAdCAlled');
		});
	});

	test('findFiles - no excludes', () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mAinThreAdCAlled = fAlse;
		rpcProtocol.set(MAinContext.MAinThreAdWorkspAce, new clAss extends mock<MAinThreAdWorkspAce>() {
			$stArtFileSeArch(includePAttern: string, _includeFolder: UriComponents | null, excludePAtternOrDisregArdExcludes: string | fAlse, mAxResults: number, token: CAncellAtionToken): Promise<URI[] | null> {
				mAinThreAdCAlled = true;
				Assert.equAl(includePAttern, 'glob/**');
				Assert.deepEquAl(_includeFolder, URI.file('/other/folder').toJSON());
				Assert.equAl(excludePAtternOrDisregArdExcludes, fAlse);
				return Promise.resolve(null);
			}
		});

		const ws = creAteExtHostWorkspAce(rpcProtocol, { id: 'foo', folders: [AWorkspAceFolderDAtA(URI.file(root), 0)], nAme: 'Test' }, new NullLogService());
		return ws.findFiles(new RelAtivePAttern('/other/folder', 'glob/**'), null!, 10, new ExtensionIdentifier('test')).then(() => {
			Assert(mAinThreAdCAlled, 'mAinThreAdCAlled');
		});
	});

	test('findFiles - with cAncelled token', () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mAinThreAdCAlled = fAlse;
		rpcProtocol.set(MAinContext.MAinThreAdWorkspAce, new clAss extends mock<MAinThreAdWorkspAce>() {
			$stArtFileSeArch(includePAttern: string, _includeFolder: UriComponents | null, excludePAtternOrDisregArdExcludes: string | fAlse, mAxResults: number, token: CAncellAtionToken): Promise<URI[] | null> {
				mAinThreAdCAlled = true;
				return Promise.resolve(null);
			}
		});

		const ws = creAteExtHostWorkspAce(rpcProtocol, { id: 'foo', folders: [AWorkspAceFolderDAtA(URI.file(root), 0)], nAme: 'Test' }, new NullLogService());

		const token = CAncellAtionToken.CAncelled;
		return ws.findFiles(new RelAtivePAttern('/other/folder', 'glob/**'), null!, 10, new ExtensionIdentifier('test'), token).then(() => {
			Assert(!mAinThreAdCAlled, '!mAinThreAdCAlled');
		});
	});

	test('findFiles - RelAtivePAttern exclude', () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mAinThreAdCAlled = fAlse;
		rpcProtocol.set(MAinContext.MAinThreAdWorkspAce, new clAss extends mock<MAinThreAdWorkspAce>() {
			$stArtFileSeArch(includePAttern: string, _includeFolder: UriComponents | null, excludePAtternOrDisregArdExcludes: string | fAlse, mAxResults: number, token: CAncellAtionToken): Promise<URI[] | null> {
				mAinThreAdCAlled = true;
				Assert(excludePAtternOrDisregArdExcludes, 'glob/**'); // Note thAt the bAse portion is ignored, see #52651
				return Promise.resolve(null);
			}
		});

		const ws = creAteExtHostWorkspAce(rpcProtocol, { id: 'foo', folders: [AWorkspAceFolderDAtA(URI.file(root), 0)], nAme: 'Test' }, new NullLogService());
		return ws.findFiles('', new RelAtivePAttern(root, 'glob/**'), 10, new ExtensionIdentifier('test')).then(() => {
			Assert(mAinThreAdCAlled, 'mAinThreAdCAlled');
		});
	});

	test('findTextInFiles - no include', Async () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mAinThreAdCAlled = fAlse;
		rpcProtocol.set(MAinContext.MAinThreAdWorkspAce, new clAss extends mock<MAinThreAdWorkspAce>() {
			Async $stArtTextSeArch(query: IPAtternInfo, folder: UriComponents | null, options: ITextQueryBuilderOptions, requestId: number, token: CAncellAtionToken): Promise<ITextSeArchComplete | null> {
				mAinThreAdCAlled = true;
				Assert.equAl(query.pAttern, 'foo');
				Assert.equAl(folder, null);
				Assert.equAl(options.includePAttern, null);
				Assert.equAl(options.excludePAttern, null);
				return null;
			}
		});

		const ws = creAteExtHostWorkspAce(rpcProtocol, { id: 'foo', folders: [AWorkspAceFolderDAtA(URI.file(root), 0)], nAme: 'Test' }, new NullLogService());
		AwAit ws.findTextInFiles({ pAttern: 'foo' }, {}, () => { }, new ExtensionIdentifier('test'));
		Assert(mAinThreAdCAlled, 'mAinThreAdCAlled');
	});

	test('findTextInFiles - string include', Async () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mAinThreAdCAlled = fAlse;
		rpcProtocol.set(MAinContext.MAinThreAdWorkspAce, new clAss extends mock<MAinThreAdWorkspAce>() {
			Async $stArtTextSeArch(query: IPAtternInfo, folder: UriComponents | null, options: ITextQueryBuilderOptions, requestId: number, token: CAncellAtionToken): Promise<ITextSeArchComplete | null> {
				mAinThreAdCAlled = true;
				Assert.equAl(query.pAttern, 'foo');
				Assert.equAl(folder, null);
				Assert.equAl(options.includePAttern, '**/files');
				Assert.equAl(options.excludePAttern, null);
				return null;
			}
		});

		const ws = creAteExtHostWorkspAce(rpcProtocol, { id: 'foo', folders: [AWorkspAceFolderDAtA(URI.file(root), 0)], nAme: 'Test' }, new NullLogService());
		AwAit ws.findTextInFiles({ pAttern: 'foo' }, { include: '**/files' }, () => { }, new ExtensionIdentifier('test'));
		Assert(mAinThreAdCAlled, 'mAinThreAdCAlled');
	});

	test('findTextInFiles - RelAtivePAttern include', Async () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mAinThreAdCAlled = fAlse;
		rpcProtocol.set(MAinContext.MAinThreAdWorkspAce, new clAss extends mock<MAinThreAdWorkspAce>() {
			Async $stArtTextSeArch(query: IPAtternInfo, folder: UriComponents | null, options: ITextQueryBuilderOptions, requestId: number, token: CAncellAtionToken): Promise<ITextSeArchComplete | null> {
				mAinThreAdCAlled = true;
				Assert.equAl(query.pAttern, 'foo');
				Assert.deepEquAl(folder, URI.file('/other/folder').toJSON());
				Assert.equAl(options.includePAttern, 'glob/**');
				Assert.equAl(options.excludePAttern, null);
				return null;
			}
		});

		const ws = creAteExtHostWorkspAce(rpcProtocol, { id: 'foo', folders: [AWorkspAceFolderDAtA(URI.file(root), 0)], nAme: 'Test' }, new NullLogService());
		AwAit ws.findTextInFiles({ pAttern: 'foo' }, { include: new RelAtivePAttern('/other/folder', 'glob/**') }, () => { }, new ExtensionIdentifier('test'));
		Assert(mAinThreAdCAlled, 'mAinThreAdCAlled');
	});

	test('findTextInFiles - with cAncelled token', Async () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mAinThreAdCAlled = fAlse;
		rpcProtocol.set(MAinContext.MAinThreAdWorkspAce, new clAss extends mock<MAinThreAdWorkspAce>() {
			Async $stArtTextSeArch(query: IPAtternInfo, folder: UriComponents | null, options: ITextQueryBuilderOptions, requestId: number, token: CAncellAtionToken): Promise<ITextSeArchComplete | null> {
				mAinThreAdCAlled = true;
				return null;
			}
		});

		const ws = creAteExtHostWorkspAce(rpcProtocol, { id: 'foo', folders: [AWorkspAceFolderDAtA(URI.file(root), 0)], nAme: 'Test' }, new NullLogService());
		const token = CAncellAtionToken.CAncelled;
		AwAit ws.findTextInFiles({ pAttern: 'foo' }, {}, () => { }, new ExtensionIdentifier('test'), token);
		Assert(!mAinThreAdCAlled, '!mAinThreAdCAlled');
	});

	test('findTextInFiles - RelAtivePAttern exclude', Async () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mAinThreAdCAlled = fAlse;
		rpcProtocol.set(MAinContext.MAinThreAdWorkspAce, new clAss extends mock<MAinThreAdWorkspAce>() {
			Async $stArtTextSeArch(query: IPAtternInfo, folder: UriComponents | null, options: ITextQueryBuilderOptions, requestId: number, token: CAncellAtionToken): Promise<ITextSeArchComplete | null> {
				mAinThreAdCAlled = true;
				Assert.equAl(query.pAttern, 'foo');
				Assert.deepEquAl(folder, null);
				Assert.equAl(options.includePAttern, null);
				Assert.equAl(options.excludePAttern, 'glob/**'); // exclude folder is ignored...
				return null;
			}
		});

		const ws = creAteExtHostWorkspAce(rpcProtocol, { id: 'foo', folders: [AWorkspAceFolderDAtA(URI.file(root), 0)], nAme: 'Test' }, new NullLogService());
		AwAit ws.findTextInFiles({ pAttern: 'foo' }, { exclude: new RelAtivePAttern('/other/folder', 'glob/**') }, () => { }, new ExtensionIdentifier('test'));
		Assert(mAinThreAdCAlled, 'mAinThreAdCAlled');
	});
});
