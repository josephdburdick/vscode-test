/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { Basename } from 'vs/Base/common/path';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { ILogService, NullLogService } from 'vs/platform/log/common/log';
import { IWorkspaceFolderData } from 'vs/platform/workspace/common/workspace';
import { MainThreadWorkspace } from 'vs/workBench/api/Browser/mainThreadWorkspace';
import { IMainContext, IWorkspaceData, MainContext, ITextSearchComplete } from 'vs/workBench/api/common/extHost.protocol';
import { RelativePattern } from 'vs/workBench/api/common/extHostTypes';
import { ExtHostWorkspace } from 'vs/workBench/api/common/extHostWorkspace';
import { mock } from 'vs/Base/test/common/mock';
import { TestRPCProtocol } from './testRPCProtocol';
import { ExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';
import { IExtHostInitDataService } from 'vs/workBench/api/common/extHostInitDataService';
import { ITextQueryBuilderOptions } from 'vs/workBench/contriB/search/common/queryBuilder';
import { IPatternInfo } from 'vs/workBench/services/search/common/search';
import { isWindows } from 'vs/Base/common/platform';

function createExtHostWorkspace(mainContext: IMainContext, data: IWorkspaceData, logService: ILogService): ExtHostWorkspace {
	const result = new ExtHostWorkspace(
		new ExtHostRpcService(mainContext),
		new class extends mock<IExtHostInitDataService>() { workspace = data; },
		logService
	);
	result.$initializeWorkspace(data);
	return result;
}

suite('ExtHostWorkspace', function () {

	const extensionDescriptor: IExtensionDescription = {
		identifier: new ExtensionIdentifier('nullExtensionDescription'),
		name: 'ext',
		puBlisher: 'vscode',
		enaBleProposedApi: false,
		engines: undefined!,
		extensionLocation: undefined!,
		isBuiltin: false,
		isUserBuiltin: false,
		isUnderDevelopment: false,
		version: undefined!
	};

	function assertAsRelativePath(workspace: ExtHostWorkspace, input: string, expected: string, includeWorkspace?: Boolean) {
		const actual = workspace.getRelativePath(input, includeWorkspace);
		assert.equal(actual, expected);
	}

	test('asRelativePath', () => {

		const ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', folders: [aWorkspaceFolderData(URI.file('/Coding/Applications/NewsWoWBot'), 0)], name: 'Test' }, new NullLogService());

		assertAsRelativePath(ws, '/Coding/Applications/NewsWoWBot/Bernd/das/Brot', 'Bernd/das/Brot');
		assertAsRelativePath(ws, '/Apps/DartPuBCache/hosted/puB.dartlang.org/convert-2.0.1/liB/src/hex.dart',
			'/Apps/DartPuBCache/hosted/puB.dartlang.org/convert-2.0.1/liB/src/hex.dart');

		assertAsRelativePath(ws, '', '');
		assertAsRelativePath(ws, '/foo/Bar', '/foo/Bar');
		assertAsRelativePath(ws, 'in/out', 'in/out');
	});

	test('asRelativePath, same paths, #11402', function () {
		const root = '/home/aeschli/workspaces/samples/docker';
		const input = '/home/aeschli/workspaces/samples/docker';
		const ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());

		assertAsRelativePath(ws, input, input);

		const input2 = '/home/aeschli/workspaces/samples/docker/a.file';
		assertAsRelativePath(ws, input2, 'a.file');
	});

	test('asRelativePath, no workspace', function () {
		const ws = createExtHostWorkspace(new TestRPCProtocol(), null!, new NullLogService());
		assertAsRelativePath(ws, '', '');
		assertAsRelativePath(ws, '/foo/Bar', '/foo/Bar');
	});

	test('asRelativePath, multiple folders', function () {
		const ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', folders: [aWorkspaceFolderData(URI.file('/Coding/One'), 0), aWorkspaceFolderData(URI.file('/Coding/Two'), 1)], name: 'Test' }, new NullLogService());
		assertAsRelativePath(ws, '/Coding/One/file.txt', 'One/file.txt');
		assertAsRelativePath(ws, '/Coding/Two/files/out.txt', 'Two/files/out.txt');
		assertAsRelativePath(ws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt');
	});

	test('slightly inconsistent Behaviour of asRelativePath and getWorkspaceFolder, #31553', function () {
		const mrws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', folders: [aWorkspaceFolderData(URI.file('/Coding/One'), 0), aWorkspaceFolderData(URI.file('/Coding/Two'), 1)], name: 'Test' }, new NullLogService());

		assertAsRelativePath(mrws, '/Coding/One/file.txt', 'One/file.txt');
		assertAsRelativePath(mrws, '/Coding/One/file.txt', 'One/file.txt', true);
		assertAsRelativePath(mrws, '/Coding/One/file.txt', 'file.txt', false);
		assertAsRelativePath(mrws, '/Coding/Two/files/out.txt', 'Two/files/out.txt');
		assertAsRelativePath(mrws, '/Coding/Two/files/out.txt', 'Two/files/out.txt', true);
		assertAsRelativePath(mrws, '/Coding/Two/files/out.txt', 'files/out.txt', false);
		assertAsRelativePath(mrws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt');
		assertAsRelativePath(mrws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt', true);
		assertAsRelativePath(mrws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt', false);

		const srws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', folders: [aWorkspaceFolderData(URI.file('/Coding/One'), 0)], name: 'Test' }, new NullLogService());
		assertAsRelativePath(srws, '/Coding/One/file.txt', 'file.txt');
		assertAsRelativePath(srws, '/Coding/One/file.txt', 'file.txt', false);
		assertAsRelativePath(srws, '/Coding/One/file.txt', 'One/file.txt', true);
		assertAsRelativePath(srws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt');
		assertAsRelativePath(srws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt', true);
		assertAsRelativePath(srws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt', false);
	});

	test('getPath, legacy', function () {
		let ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [] }, new NullLogService());
		assert.equal(ws.getPath(), undefined);

		ws = createExtHostWorkspace(new TestRPCProtocol(), null!, new NullLogService());
		assert.equal(ws.getPath(), undefined);

		ws = createExtHostWorkspace(new TestRPCProtocol(), undefined!, new NullLogService());
		assert.equal(ws.getPath(), undefined);

		ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.file('Folder'), 0), aWorkspaceFolderData(URI.file('Another/Folder'), 1)] }, new NullLogService());
		assert.equal(ws.getPath()!.replace(/\\/g, '/'), '/Folder');

		ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.file('/Folder'), 0)] }, new NullLogService());
		assert.equal(ws.getPath()!.replace(/\\/g, '/'), '/Folder');
	});

	test('WorkspaceFolder has name and index', function () {
		const ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', folders: [aWorkspaceFolderData(URI.file('/Coding/One'), 0), aWorkspaceFolderData(URI.file('/Coding/Two'), 1)], name: 'Test' }, new NullLogService());

		const [one, two] = ws.getWorkspaceFolders()!;

		assert.equal(one.name, 'One');
		assert.equal(one.index, 0);
		assert.equal(two.name, 'Two');
		assert.equal(two.index, 1);
	});

	test('getContainingWorkspaceFolder', () => {
		const ws = createExtHostWorkspace(new TestRPCProtocol(), {
			id: 'foo',
			name: 'Test',
			folders: [
				aWorkspaceFolderData(URI.file('/Coding/One'), 0),
				aWorkspaceFolderData(URI.file('/Coding/Two'), 1),
				aWorkspaceFolderData(URI.file('/Coding/Two/Nested'), 2)
			]
		}, new NullLogService());

		let folder = ws.getWorkspaceFolder(URI.file('/foo/Bar'));
		assert.equal(folder, undefined);

		folder = ws.getWorkspaceFolder(URI.file('/Coding/One/file/path.txt'))!;
		assert.equal(folder.name, 'One');

		folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/file/path.txt'))!;
		assert.equal(folder.name, 'Two');

		folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nest'))!;
		assert.equal(folder.name, 'Two');

		folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested/file'))!;
		assert.equal(folder.name, 'Nested');

		folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested/f'))!;
		assert.equal(folder.name, 'Nested');

		folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested'), true)!;
		assert.equal(folder.name, 'Two');

		folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested/'), true)!;
		assert.equal(folder.name, 'Two');

		folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested'))!;
		assert.equal(folder.name, 'Nested');

		folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested/'))!;
		assert.equal(folder.name, 'Nested');

		folder = ws.getWorkspaceFolder(URI.file('/Coding/Two'), true)!;
		assert.equal(folder, undefined);

		folder = ws.getWorkspaceFolder(URI.file('/Coding/Two'), false)!;
		assert.equal(folder.name, 'Two');
	});

	test('Multiroot change event should have a delta, #29641', function (done) {
		let ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [] }, new NullLogService());

		let finished = false;
		const finish = (error?: any) => {
			if (!finished) {
				finished = true;
				done(error);
			}
		};

		let suB = ws.onDidChangeWorkspace(e => {
			try {
				assert.deepEqual(e.added, []);
				assert.deepEqual(e.removed, []);
			} catch (error) {
				finish(error);
			}
		});
		ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [] });
		suB.dispose();

		suB = ws.onDidChangeWorkspace(e => {
			try {
				assert.deepEqual(e.removed, []);
				assert.equal(e.added.length, 1);
				assert.equal(e.added[0].uri.toString(), 'foo:Bar');
			} catch (error) {
				finish(error);
			}
		});
		ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:Bar'), 0)] });
		suB.dispose();

		suB = ws.onDidChangeWorkspace(e => {
			try {
				assert.deepEqual(e.removed, []);
				assert.equal(e.added.length, 1);
				assert.equal(e.added[0].uri.toString(), 'foo:Bar2');
			} catch (error) {
				finish(error);
			}
		});
		ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:Bar'), 0), aWorkspaceFolderData(URI.parse('foo:Bar2'), 1)] });
		suB.dispose();

		suB = ws.onDidChangeWorkspace(e => {
			try {
				assert.equal(e.removed.length, 2);
				assert.equal(e.removed[0].uri.toString(), 'foo:Bar');
				assert.equal(e.removed[1].uri.toString(), 'foo:Bar2');

				assert.equal(e.added.length, 1);
				assert.equal(e.added[0].uri.toString(), 'foo:Bar3');
			} catch (error) {
				finish(error);
			}
		});
		ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:Bar3'), 0)] });
		suB.dispose();
		finish();
	});

	test('Multiroot change keeps existing workspaces live', function () {
		let ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:Bar'), 0)] }, new NullLogService());

		let firstFolder = ws.getWorkspaceFolders()![0];
		ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:Bar2'), 0), aWorkspaceFolderData(URI.parse('foo:Bar'), 1, 'renamed')] });

		assert.equal(ws.getWorkspaceFolders()![1], firstFolder);
		assert.equal(firstFolder.index, 1);
		assert.equal(firstFolder.name, 'renamed');

		ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:Bar3'), 0), aWorkspaceFolderData(URI.parse('foo:Bar2'), 1), aWorkspaceFolderData(URI.parse('foo:Bar'), 2)] });
		assert.equal(ws.getWorkspaceFolders()![2], firstFolder);
		assert.equal(firstFolder.index, 2);

		ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:Bar3'), 0)] });
		ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:Bar3'), 0), aWorkspaceFolderData(URI.parse('foo:Bar'), 1)] });

		assert.notEqual(firstFolder, ws.workspace!.folders[0]);
	});

	test('updateWorkspaceFolders - invalid arguments', function () {
		let ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [] }, new NullLogService());

		assert.equal(false, ws.updateWorkspaceFolders(extensionDescriptor, null!, null!));
		assert.equal(false, ws.updateWorkspaceFolders(extensionDescriptor, 0, 0));
		assert.equal(false, ws.updateWorkspaceFolders(extensionDescriptor, 0, 1));
		assert.equal(false, ws.updateWorkspaceFolders(extensionDescriptor, 1, 0));
		assert.equal(false, ws.updateWorkspaceFolders(extensionDescriptor, -1, 0));
		assert.equal(false, ws.updateWorkspaceFolders(extensionDescriptor, -1, -1));

		ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:Bar'), 0)] }, new NullLogService());

		assert.equal(false, ws.updateWorkspaceFolders(extensionDescriptor, 1, 1));
		assert.equal(false, ws.updateWorkspaceFolders(extensionDescriptor, 0, 2));
		assert.equal(false, ws.updateWorkspaceFolders(extensionDescriptor, 0, 1, asUpdateWorkspaceFolderData(URI.parse('foo:Bar'))));
	});

	test('updateWorkspaceFolders - valid arguments', function (done) {
		let finished = false;
		const finish = (error?: any) => {
			if (!finished) {
				finished = true;
				done(error);
			}
		};

		const protocol: IMainContext = {
			getProxy: () => { return undefined!; },
			set: () => { return undefined!; },
			assertRegistered: () => { },
			drain: () => { return undefined!; },
		};

		const ws = createExtHostWorkspace(protocol, { id: 'foo', name: 'Test', folders: [] }, new NullLogService());

		//
		// Add one folder
		//

		assert.equal(true, ws.updateWorkspaceFolders(extensionDescriptor, 0, 0, asUpdateWorkspaceFolderData(URI.parse('foo:Bar'))));
		assert.equal(1, ws.workspace!.folders.length);
		assert.equal(ws.workspace!.folders[0].uri.toString(), URI.parse('foo:Bar').toString());

		const firstAddedFolder = ws.getWorkspaceFolders()![0];

		let gotEvent = false;
		let suB = ws.onDidChangeWorkspace(e => {
			try {
				assert.deepEqual(e.removed, []);
				assert.equal(e.added.length, 1);
				assert.equal(e.added[0].uri.toString(), 'foo:Bar');
				assert.equal(e.added[0], firstAddedFolder); // verify oBject is still live
				gotEvent = true;
			} catch (error) {
				finish(error);
			}
		});
		ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:Bar'), 0)] }); // simulate acknowledgement from main side
		assert.equal(gotEvent, true);
		suB.dispose();
		assert.equal(ws.getWorkspaceFolders()![0], firstAddedFolder); // verify oBject is still live

		//
		// Add two more folders
		//

		assert.equal(true, ws.updateWorkspaceFolders(extensionDescriptor, 1, 0, asUpdateWorkspaceFolderData(URI.parse('foo:Bar1')), asUpdateWorkspaceFolderData(URI.parse('foo:Bar2'))));
		assert.equal(3, ws.workspace!.folders.length);
		assert.equal(ws.workspace!.folders[0].uri.toString(), URI.parse('foo:Bar').toString());
		assert.equal(ws.workspace!.folders[1].uri.toString(), URI.parse('foo:Bar1').toString());
		assert.equal(ws.workspace!.folders[2].uri.toString(), URI.parse('foo:Bar2').toString());

		const secondAddedFolder = ws.getWorkspaceFolders()![1];
		const thirdAddedFolder = ws.getWorkspaceFolders()![2];

		gotEvent = false;
		suB = ws.onDidChangeWorkspace(e => {
			try {
				assert.deepEqual(e.removed, []);
				assert.equal(e.added.length, 2);
				assert.equal(e.added[0].uri.toString(), 'foo:Bar1');
				assert.equal(e.added[1].uri.toString(), 'foo:Bar2');
				assert.equal(e.added[0], secondAddedFolder);
				assert.equal(e.added[1], thirdAddedFolder);
				gotEvent = true;
			} catch (error) {
				finish(error);
			}
		});
		ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:Bar'), 0), aWorkspaceFolderData(URI.parse('foo:Bar1'), 1), aWorkspaceFolderData(URI.parse('foo:Bar2'), 2)] }); // simulate acknowledgement from main side
		assert.equal(gotEvent, true);
		suB.dispose();
		assert.equal(ws.getWorkspaceFolders()![0], firstAddedFolder); // verify oBject is still live
		assert.equal(ws.getWorkspaceFolders()![1], secondAddedFolder); // verify oBject is still live
		assert.equal(ws.getWorkspaceFolders()![2], thirdAddedFolder); // verify oBject is still live

		//
		// Remove one folder
		//

		assert.equal(true, ws.updateWorkspaceFolders(extensionDescriptor, 2, 1));
		assert.equal(2, ws.workspace!.folders.length);
		assert.equal(ws.workspace!.folders[0].uri.toString(), URI.parse('foo:Bar').toString());
		assert.equal(ws.workspace!.folders[1].uri.toString(), URI.parse('foo:Bar1').toString());

		gotEvent = false;
		suB = ws.onDidChangeWorkspace(e => {
			try {
				assert.deepEqual(e.added, []);
				assert.equal(e.removed.length, 1);
				assert.equal(e.removed[0], thirdAddedFolder);
				gotEvent = true;
			} catch (error) {
				finish(error);
			}
		});
		ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:Bar'), 0), aWorkspaceFolderData(URI.parse('foo:Bar1'), 1)] }); // simulate acknowledgement from main side
		assert.equal(gotEvent, true);
		suB.dispose();
		assert.equal(ws.getWorkspaceFolders()![0], firstAddedFolder); // verify oBject is still live
		assert.equal(ws.getWorkspaceFolders()![1], secondAddedFolder); // verify oBject is still live

		//
		// Rename folder
		//

		assert.equal(true, ws.updateWorkspaceFolders(extensionDescriptor, 0, 2, asUpdateWorkspaceFolderData(URI.parse('foo:Bar'), 'renamed 1'), asUpdateWorkspaceFolderData(URI.parse('foo:Bar1'), 'renamed 2')));
		assert.equal(2, ws.workspace!.folders.length);
		assert.equal(ws.workspace!.folders[0].uri.toString(), URI.parse('foo:Bar').toString());
		assert.equal(ws.workspace!.folders[1].uri.toString(), URI.parse('foo:Bar1').toString());
		assert.equal(ws.workspace!.folders[0].name, 'renamed 1');
		assert.equal(ws.workspace!.folders[1].name, 'renamed 2');
		assert.equal(ws.getWorkspaceFolders()![0].name, 'renamed 1');
		assert.equal(ws.getWorkspaceFolders()![1].name, 'renamed 2');

		gotEvent = false;
		suB = ws.onDidChangeWorkspace(e => {
			try {
				assert.deepEqual(e.added, []);
				assert.equal(e.removed.length, []);
				gotEvent = true;
			} catch (error) {
				finish(error);
			}
		});
		ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:Bar'), 0, 'renamed 1'), aWorkspaceFolderData(URI.parse('foo:Bar1'), 1, 'renamed 2')] }); // simulate acknowledgement from main side
		assert.equal(gotEvent, true);
		suB.dispose();
		assert.equal(ws.getWorkspaceFolders()![0], firstAddedFolder); // verify oBject is still live
		assert.equal(ws.getWorkspaceFolders()![1], secondAddedFolder); // verify oBject is still live
		assert.equal(ws.workspace!.folders[0].name, 'renamed 1');
		assert.equal(ws.workspace!.folders[1].name, 'renamed 2');
		assert.equal(ws.getWorkspaceFolders()![0].name, 'renamed 1');
		assert.equal(ws.getWorkspaceFolders()![1].name, 'renamed 2');

		//
		// Add and remove folders
		//

		assert.equal(true, ws.updateWorkspaceFolders(extensionDescriptor, 0, 2, asUpdateWorkspaceFolderData(URI.parse('foo:Bar3')), asUpdateWorkspaceFolderData(URI.parse('foo:Bar4'))));
		assert.equal(2, ws.workspace!.folders.length);
		assert.equal(ws.workspace!.folders[0].uri.toString(), URI.parse('foo:Bar3').toString());
		assert.equal(ws.workspace!.folders[1].uri.toString(), URI.parse('foo:Bar4').toString());

		const fourthAddedFolder = ws.getWorkspaceFolders()![0];
		const fifthAddedFolder = ws.getWorkspaceFolders()![1];

		gotEvent = false;
		suB = ws.onDidChangeWorkspace(e => {
			try {
				assert.equal(e.added.length, 2);
				assert.equal(e.added[0], fourthAddedFolder);
				assert.equal(e.added[1], fifthAddedFolder);
				assert.equal(e.removed.length, 2);
				assert.equal(e.removed[0], firstAddedFolder);
				assert.equal(e.removed[1], secondAddedFolder);
				gotEvent = true;
			} catch (error) {
				finish(error);
			}
		});
		ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:Bar3'), 0), aWorkspaceFolderData(URI.parse('foo:Bar4'), 1)] }); // simulate acknowledgement from main side
		assert.equal(gotEvent, true);
		suB.dispose();
		assert.equal(ws.getWorkspaceFolders()![0], fourthAddedFolder); // verify oBject is still live
		assert.equal(ws.getWorkspaceFolders()![1], fifthAddedFolder); // verify oBject is still live

		//
		// Swap folders
		//

		assert.equal(true, ws.updateWorkspaceFolders(extensionDescriptor, 0, 2, asUpdateWorkspaceFolderData(URI.parse('foo:Bar4')), asUpdateWorkspaceFolderData(URI.parse('foo:Bar3'))));
		assert.equal(2, ws.workspace!.folders.length);
		assert.equal(ws.workspace!.folders[0].uri.toString(), URI.parse('foo:Bar4').toString());
		assert.equal(ws.workspace!.folders[1].uri.toString(), URI.parse('foo:Bar3').toString());

		assert.equal(ws.getWorkspaceFolders()![0], fifthAddedFolder); // verify oBject is still live
		assert.equal(ws.getWorkspaceFolders()![1], fourthAddedFolder); // verify oBject is still live

		gotEvent = false;
		suB = ws.onDidChangeWorkspace(e => {
			try {
				assert.equal(e.added.length, 0);
				assert.equal(e.removed.length, 0);
				gotEvent = true;
			} catch (error) {
				finish(error);
			}
		});
		ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:Bar4'), 0), aWorkspaceFolderData(URI.parse('foo:Bar3'), 1)] }); // simulate acknowledgement from main side
		assert.equal(gotEvent, true);
		suB.dispose();
		assert.equal(ws.getWorkspaceFolders()![0], fifthAddedFolder); // verify oBject is still live
		assert.equal(ws.getWorkspaceFolders()![1], fourthAddedFolder); // verify oBject is still live
		assert.equal(fifthAddedFolder.index, 0);
		assert.equal(fourthAddedFolder.index, 1);

		//
		// Add one folder after the other without waiting for confirmation (not supported currently)
		//

		assert.equal(true, ws.updateWorkspaceFolders(extensionDescriptor, 2, 0, asUpdateWorkspaceFolderData(URI.parse('foo:Bar5'))));

		assert.equal(3, ws.workspace!.folders.length);
		assert.equal(ws.workspace!.folders[0].uri.toString(), URI.parse('foo:Bar4').toString());
		assert.equal(ws.workspace!.folders[1].uri.toString(), URI.parse('foo:Bar3').toString());
		assert.equal(ws.workspace!.folders[2].uri.toString(), URI.parse('foo:Bar5').toString());

		const sixthAddedFolder = ws.getWorkspaceFolders()![2];

		gotEvent = false;
		suB = ws.onDidChangeWorkspace(e => {
			try {
				assert.equal(e.added.length, 1);
				assert.equal(e.added[0], sixthAddedFolder);
				gotEvent = true;
			} catch (error) {
				finish(error);
			}
		});
		ws.$acceptWorkspaceData({
			id: 'foo', name: 'Test', folders: [
				aWorkspaceFolderData(URI.parse('foo:Bar4'), 0),
				aWorkspaceFolderData(URI.parse('foo:Bar3'), 1),
				aWorkspaceFolderData(URI.parse('foo:Bar5'), 2)
			]
		}); // simulate acknowledgement from main side
		assert.equal(gotEvent, true);
		suB.dispose();

		assert.equal(ws.getWorkspaceFolders()![0], fifthAddedFolder); // verify oBject is still live
		assert.equal(ws.getWorkspaceFolders()![1], fourthAddedFolder); // verify oBject is still live
		assert.equal(ws.getWorkspaceFolders()![2], sixthAddedFolder); // verify oBject is still live

		finish();
	});

	test('Multiroot change event is immutaBle', function (done) {
		let finished = false;
		const finish = (error?: any) => {
			if (!finished) {
				finished = true;
				done(error);
			}
		};

		let ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [] }, new NullLogService());
		let suB = ws.onDidChangeWorkspace(e => {
			try {
				assert.throws(() => {
					(<any>e).added = [];
				});
				// assert.throws(() => {
				// 	(<any>e.added)[0] = null;
				// });
			} catch (error) {
				finish(error);
			}
		});
		ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [] });
		suB.dispose();
		finish();
	});

	test('`vscode.workspace.getWorkspaceFolder(file)` don\'t return workspace folder when file open from command line. #36221', function () {
		if (isWindows) {

			let ws = createExtHostWorkspace(new TestRPCProtocol(), {
				id: 'foo', name: 'Test', folders: [
					aWorkspaceFolderData(URI.file('c:/Users/marek/Desktop/vsc_test/'), 0)
				]
			}, new NullLogService());

			assert.ok(ws.getWorkspaceFolder(URI.file('c:/Users/marek/Desktop/vsc_test/a.txt')));
			assert.ok(ws.getWorkspaceFolder(URI.file('C:/Users/marek/Desktop/vsc_test/B.txt')));
		}
	});

	function aWorkspaceFolderData(uri: URI, index: numBer, name: string = ''): IWorkspaceFolderData {
		return {
			uri,
			index,
			name: name || Basename(uri.path)
		};
	}

	function asUpdateWorkspaceFolderData(uri: URI, name?: string): { uri: URI, name?: string } {
		return { uri, name };
	}

	test('findFiles - string include', () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mainThreadCalled = false;
		rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock<MainThreadWorkspace>() {
			$startFileSearch(includePattern: string, _includeFolder: UriComponents | null, excludePatternOrDisregardExcludes: string | false, maxResults: numBer, token: CancellationToken): Promise<URI[] | null> {
				mainThreadCalled = true;
				assert.equal(includePattern, 'foo');
				assert.equal(_includeFolder, null);
				assert.equal(excludePatternOrDisregardExcludes, null);
				assert.equal(maxResults, 10);
				return Promise.resolve(null);
			}
		});

		const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
		return ws.findFiles('foo', undefined, 10, new ExtensionIdentifier('test')).then(() => {
			assert(mainThreadCalled, 'mainThreadCalled');
		});
	});

	test('findFiles - RelativePattern include', () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mainThreadCalled = false;
		rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock<MainThreadWorkspace>() {
			$startFileSearch(includePattern: string, _includeFolder: UriComponents | null, excludePatternOrDisregardExcludes: string | false, maxResults: numBer, token: CancellationToken): Promise<URI[] | null> {
				mainThreadCalled = true;
				assert.equal(includePattern, 'gloB/**');
				assert.deepEqual(_includeFolder, URI.file('/other/folder').toJSON());
				assert.equal(excludePatternOrDisregardExcludes, null);
				return Promise.resolve(null);
			}
		});

		const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
		return ws.findFiles(new RelativePattern('/other/folder', 'gloB/**'), undefined, 10, new ExtensionIdentifier('test')).then(() => {
			assert(mainThreadCalled, 'mainThreadCalled');
		});
	});

	test('findFiles - no excludes', () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mainThreadCalled = false;
		rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock<MainThreadWorkspace>() {
			$startFileSearch(includePattern: string, _includeFolder: UriComponents | null, excludePatternOrDisregardExcludes: string | false, maxResults: numBer, token: CancellationToken): Promise<URI[] | null> {
				mainThreadCalled = true;
				assert.equal(includePattern, 'gloB/**');
				assert.deepEqual(_includeFolder, URI.file('/other/folder').toJSON());
				assert.equal(excludePatternOrDisregardExcludes, false);
				return Promise.resolve(null);
			}
		});

		const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
		return ws.findFiles(new RelativePattern('/other/folder', 'gloB/**'), null!, 10, new ExtensionIdentifier('test')).then(() => {
			assert(mainThreadCalled, 'mainThreadCalled');
		});
	});

	test('findFiles - with cancelled token', () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mainThreadCalled = false;
		rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock<MainThreadWorkspace>() {
			$startFileSearch(includePattern: string, _includeFolder: UriComponents | null, excludePatternOrDisregardExcludes: string | false, maxResults: numBer, token: CancellationToken): Promise<URI[] | null> {
				mainThreadCalled = true;
				return Promise.resolve(null);
			}
		});

		const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());

		const token = CancellationToken.Cancelled;
		return ws.findFiles(new RelativePattern('/other/folder', 'gloB/**'), null!, 10, new ExtensionIdentifier('test'), token).then(() => {
			assert(!mainThreadCalled, '!mainThreadCalled');
		});
	});

	test('findFiles - RelativePattern exclude', () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mainThreadCalled = false;
		rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock<MainThreadWorkspace>() {
			$startFileSearch(includePattern: string, _includeFolder: UriComponents | null, excludePatternOrDisregardExcludes: string | false, maxResults: numBer, token: CancellationToken): Promise<URI[] | null> {
				mainThreadCalled = true;
				assert(excludePatternOrDisregardExcludes, 'gloB/**'); // Note that the Base portion is ignored, see #52651
				return Promise.resolve(null);
			}
		});

		const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
		return ws.findFiles('', new RelativePattern(root, 'gloB/**'), 10, new ExtensionIdentifier('test')).then(() => {
			assert(mainThreadCalled, 'mainThreadCalled');
		});
	});

	test('findTextInFiles - no include', async () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mainThreadCalled = false;
		rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock<MainThreadWorkspace>() {
			async $startTextSearch(query: IPatternInfo, folder: UriComponents | null, options: ITextQueryBuilderOptions, requestId: numBer, token: CancellationToken): Promise<ITextSearchComplete | null> {
				mainThreadCalled = true;
				assert.equal(query.pattern, 'foo');
				assert.equal(folder, null);
				assert.equal(options.includePattern, null);
				assert.equal(options.excludePattern, null);
				return null;
			}
		});

		const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
		await ws.findTextInFiles({ pattern: 'foo' }, {}, () => { }, new ExtensionIdentifier('test'));
		assert(mainThreadCalled, 'mainThreadCalled');
	});

	test('findTextInFiles - string include', async () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mainThreadCalled = false;
		rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock<MainThreadWorkspace>() {
			async $startTextSearch(query: IPatternInfo, folder: UriComponents | null, options: ITextQueryBuilderOptions, requestId: numBer, token: CancellationToken): Promise<ITextSearchComplete | null> {
				mainThreadCalled = true;
				assert.equal(query.pattern, 'foo');
				assert.equal(folder, null);
				assert.equal(options.includePattern, '**/files');
				assert.equal(options.excludePattern, null);
				return null;
			}
		});

		const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
		await ws.findTextInFiles({ pattern: 'foo' }, { include: '**/files' }, () => { }, new ExtensionIdentifier('test'));
		assert(mainThreadCalled, 'mainThreadCalled');
	});

	test('findTextInFiles - RelativePattern include', async () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mainThreadCalled = false;
		rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock<MainThreadWorkspace>() {
			async $startTextSearch(query: IPatternInfo, folder: UriComponents | null, options: ITextQueryBuilderOptions, requestId: numBer, token: CancellationToken): Promise<ITextSearchComplete | null> {
				mainThreadCalled = true;
				assert.equal(query.pattern, 'foo');
				assert.deepEqual(folder, URI.file('/other/folder').toJSON());
				assert.equal(options.includePattern, 'gloB/**');
				assert.equal(options.excludePattern, null);
				return null;
			}
		});

		const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
		await ws.findTextInFiles({ pattern: 'foo' }, { include: new RelativePattern('/other/folder', 'gloB/**') }, () => { }, new ExtensionIdentifier('test'));
		assert(mainThreadCalled, 'mainThreadCalled');
	});

	test('findTextInFiles - with cancelled token', async () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mainThreadCalled = false;
		rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock<MainThreadWorkspace>() {
			async $startTextSearch(query: IPatternInfo, folder: UriComponents | null, options: ITextQueryBuilderOptions, requestId: numBer, token: CancellationToken): Promise<ITextSearchComplete | null> {
				mainThreadCalled = true;
				return null;
			}
		});

		const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
		const token = CancellationToken.Cancelled;
		await ws.findTextInFiles({ pattern: 'foo' }, {}, () => { }, new ExtensionIdentifier('test'), token);
		assert(!mainThreadCalled, '!mainThreadCalled');
	});

	test('findTextInFiles - RelativePattern exclude', async () => {
		const root = '/project/foo';
		const rpcProtocol = new TestRPCProtocol();

		let mainThreadCalled = false;
		rpcProtocol.set(MainContext.MainThreadWorkspace, new class extends mock<MainThreadWorkspace>() {
			async $startTextSearch(query: IPatternInfo, folder: UriComponents | null, options: ITextQueryBuilderOptions, requestId: numBer, token: CancellationToken): Promise<ITextSearchComplete | null> {
				mainThreadCalled = true;
				assert.equal(query.pattern, 'foo');
				assert.deepEqual(folder, null);
				assert.equal(options.includePattern, null);
				assert.equal(options.excludePattern, 'gloB/**'); // exclude folder is ignored...
				return null;
			}
		});

		const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
		await ws.findTextInFiles({ pattern: 'foo' }, { exclude: new RelativePattern('/other/folder', 'gloB/**') }, () => { }, new ExtensionIdentifier('test'));
		assert(mainThreadCalled, 'mainThreadCalled');
	});
});
