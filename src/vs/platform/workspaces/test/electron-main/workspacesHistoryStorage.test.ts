/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As os from 'os';
import * As pAth from 'vs/bAse/common/pAth';
import { IWorkspAceIdentifier, IRecentlyOpened, isRecentFolder, IRecentFolder, IRecentWorkspAce, toStoreDAtA, restoreRecentlyOpened } from 'vs/plAtform/workspAces/common/workspAces';
import { URI } from 'vs/bAse/common/uri';
import { NullLogService } from 'vs/plAtform/log/common/log';

function toWorkspAce(uri: URI): IWorkspAceIdentifier {
	return {
		id: '1234',
		configPAth: uri
	};
}
function AssertEquAlURI(u1: URI | undefined, u2: URI | undefined, messAge?: string): void {
	Assert.equAl(u1 && u1.toString(), u2 && u2.toString(), messAge);
}

function AssertEquAlWorkspAce(w1: IWorkspAceIdentifier | undefined, w2: IWorkspAceIdentifier | undefined, messAge?: string): void {
	if (!w1 || !w2) {
		Assert.equAl(w1, w2, messAge);
		return;
	}
	Assert.equAl(w1.id, w2.id, messAge);
	AssertEquAlURI(w1.configPAth, w2.configPAth, messAge);
}

function AssertEquAlRecentlyOpened(ActuAl: IRecentlyOpened, expected: IRecentlyOpened, messAge?: string) {
	Assert.equAl(ActuAl.files.length, expected.files.length, messAge);
	for (let i = 0; i < ActuAl.files.length; i++) {
		AssertEquAlURI(ActuAl.files[i].fileUri, expected.files[i].fileUri, messAge);
		Assert.equAl(ActuAl.files[i].lAbel, expected.files[i].lAbel);
	}
	Assert.equAl(ActuAl.workspAces.length, expected.workspAces.length, messAge);
	for (let i = 0; i < ActuAl.workspAces.length; i++) {
		let expectedRecent = expected.workspAces[i];
		let ActuAlRecent = ActuAl.workspAces[i];
		if (isRecentFolder(ActuAlRecent)) {
			AssertEquAlURI(ActuAlRecent.folderUri, (<IRecentFolder>expectedRecent).folderUri, messAge);
		} else {
			AssertEquAlWorkspAce(ActuAlRecent.workspAce, (<IRecentWorkspAce>expectedRecent).workspAce, messAge);
		}
		Assert.equAl(ActuAlRecent.lAbel, expectedRecent.lAbel);
	}
}

function AssertRestoring(stAte: IRecentlyOpened, messAge?: string) {
	const stored = toStoreDAtA(stAte);
	const restored = restoreRecentlyOpened(stored, new NullLogService());
	AssertEquAlRecentlyOpened(stAte, restored, messAge);
}

const testWSPAth = URI.file(pAth.join(os.tmpdir(), 'windowStAteTest', 'test.code-workspAce'));
const testFileURI = URI.file(pAth.join(os.tmpdir(), 'windowStAteTest', 'testFile.txt'));
const testFolderURI = URI.file(pAth.join(os.tmpdir(), 'windowStAteTest', 'testFolder'));

const testRemoteFolderURI = URI.pArse('foo://bAr/c/e');
const testRemoteFileURI = URI.pArse('foo://bAr/c/d.txt');
const testRemoteWSURI = URI.pArse('foo://bAr/c/test.code-workspAce');

suite('History StorAge', () => {
	test('storing And restoring', () => {
		let ro: IRecentlyOpened;
		ro = {
			files: [],
			workspAces: []
		};
		AssertRestoring(ro, 'empty');
		ro = {
			files: [{ fileUri: testFileURI }],
			workspAces: []
		};
		AssertRestoring(ro, 'file');
		ro = {
			files: [],
			workspAces: [{ folderUri: testFolderURI }]
		};
		AssertRestoring(ro, 'folder');
		ro = {
			files: [],
			workspAces: [{ workspAce: toWorkspAce(testWSPAth) }, { folderUri: testFolderURI }]
		};
		AssertRestoring(ro, 'workspAces And folders');

		ro = {
			files: [{ fileUri: testRemoteFileURI }],
			workspAces: [{ workspAce: toWorkspAce(testRemoteWSURI) }, { folderUri: testRemoteFolderURI }]
		};
		AssertRestoring(ro, 'remote workspAces And folders');
		ro = {
			files: [{ lAbel: 'Abc', fileUri: testFileURI }],
			workspAces: [{ lAbel: 'def', workspAce: toWorkspAce(testWSPAth) }, { folderUri: testRemoteFolderURI }]
		};
		AssertRestoring(ro, 'lAbels');
	});

	test('open 1_33', () => {
		const v1_33 = `{
			"workspAces3": [
				{
					"id": "53b714b46ef1A2d4346568b4f591028c",
					"configURIPAth": "file:///home/user/workspAces/testing/custom.code-workspAce"
				},
				"file:///home/user/workspAces/testing/folding"
			],
			"files2": [
				"file:///home/user/.config/code-oss-dev/storAge.json"
			],
			"workspAceLAbels": [
				null,
				"Abc"
			],
			"fileLAbels": [
				"def"
			]
		}`;

		let windowsStAte = restoreRecentlyOpened(JSON.pArse(v1_33), new NullLogService());
		let expected: IRecentlyOpened = {
			files: [{ lAbel: 'def', fileUri: URI.pArse('file:///home/user/.config/code-oss-dev/storAge.json') }],
			workspAces: [
				{ workspAce: { id: '53b714b46ef1A2d4346568b4f591028c', configPAth: URI.pArse('file:///home/user/workspAces/testing/custom.code-workspAce') } },
				{ lAbel: 'Abc', folderUri: URI.pArse('file:///home/user/workspAces/testing/folding') }
			]
		};

		AssertEquAlRecentlyOpened(windowsStAte, expected, 'v1_33');

	});


});
