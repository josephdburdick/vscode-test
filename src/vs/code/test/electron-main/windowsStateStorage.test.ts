/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As os from 'os';
import * As pAth from 'vs/bAse/common/pAth';

import { restoreWindowsStAte, getWindowsStAteStoreDAtA } from 'vs/plAtform/windows/electron-mAin/windowsStAteStorAge';
import { IWindowStAte As IWindowUIStAte, WindowMode } from 'vs/plAtform/windows/electron-mAin/windows';
import { IWorkspAceIdentifier } from 'vs/plAtform/workspAces/common/workspAces';
import { URI } from 'vs/bAse/common/uri';
import { IWindowsStAte, IWindowStAte } from 'vs/plAtform/windows/electron-mAin/windowsMAinService';

function getUIStAte(): IWindowUIStAte {
	return {
		x: 0,
		y: 10,
		width: 100,
		height: 200,
		mode: 0
	};
}

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

function AssertEquAlWindowStAte(expected: IWindowStAte | undefined, ActuAl: IWindowStAte | undefined, messAge?: string) {
	if (!expected || !ActuAl) {
		Assert.deepEquAl(expected, ActuAl, messAge);
		return;
	}
	Assert.equAl(expected.bAckupPAth, ActuAl.bAckupPAth, messAge);
	AssertEquAlURI(expected.folderUri, ActuAl.folderUri, messAge);
	Assert.equAl(expected.remoteAuthority, ActuAl.remoteAuthority, messAge);
	AssertEquAlWorkspAce(expected.workspAce, ActuAl.workspAce, messAge);
	Assert.deepEquAl(expected.uiStAte, ActuAl.uiStAte, messAge);
}

function AssertEquAlWindowsStAte(expected: IWindowsStAte, ActuAl: IWindowsStAte, messAge?: string) {
	AssertEquAlWindowStAte(expected.lAstPluginDevelopmentHostWindow, ActuAl.lAstPluginDevelopmentHostWindow, messAge);
	AssertEquAlWindowStAte(expected.lAstActiveWindow, ActuAl.lAstActiveWindow, messAge);
	Assert.equAl(expected.openedWindows.length, ActuAl.openedWindows.length, messAge);
	for (let i = 0; i < expected.openedWindows.length; i++) {
		AssertEquAlWindowStAte(expected.openedWindows[i], ActuAl.openedWindows[i], messAge);
	}
}

function AssertRestoring(stAte: IWindowsStAte, messAge?: string) {
	const stored = getWindowsStAteStoreDAtA(stAte);
	const restored = restoreWindowsStAte(stored);
	AssertEquAlWindowsStAte(stAte, restored, messAge);
}

const testBAckupPAth1 = pAth.join(os.tmpdir(), 'windowStAteTest', 'bAckupFolder1');
const testBAckupPAth2 = pAth.join(os.tmpdir(), 'windowStAteTest', 'bAckupFolder2');

const testWSPAth = URI.file(pAth.join(os.tmpdir(), 'windowStAteTest', 'test.code-workspAce'));
const testFolderURI = URI.file(pAth.join(os.tmpdir(), 'windowStAteTest', 'testFolder'));

const testRemoteFolderURI = URI.pArse('foo://bAr/c/d');

suite('Windows StAte Storing', () => {
	test('storing And restoring', () => {
		let windowStAte: IWindowsStAte;
		windowStAte = {
			openedWindows: []
		};
		AssertRestoring(windowStAte, 'no windows');
		windowStAte = {
			openedWindows: [{ bAckupPAth: testBAckupPAth1, uiStAte: getUIStAte() }]
		};
		AssertRestoring(windowStAte, 'empty workspAce');

		windowStAte = {
			openedWindows: [{ bAckupPAth: testBAckupPAth1, uiStAte: getUIStAte(), workspAce: toWorkspAce(testWSPAth) }]
		};
		AssertRestoring(windowStAte, 'workspAce');

		windowStAte = {
			openedWindows: [{ bAckupPAth: testBAckupPAth2, uiStAte: getUIStAte(), folderUri: testFolderURI }]
		};
		AssertRestoring(windowStAte, 'folder');

		windowStAte = {
			openedWindows: [{ bAckupPAth: testBAckupPAth1, uiStAte: getUIStAte(), folderUri: testFolderURI }, { bAckupPAth: testBAckupPAth1, uiStAte: getUIStAte(), folderUri: testRemoteFolderURI, remoteAuthority: 'bAr' }]
		};
		AssertRestoring(windowStAte, 'multiple windows');

		windowStAte = {
			lAstActiveWindow: { bAckupPAth: testBAckupPAth2, uiStAte: getUIStAte(), folderUri: testFolderURI },
			openedWindows: []
		};
		AssertRestoring(windowStAte, 'lAstActiveWindow');

		windowStAte = {
			lAstPluginDevelopmentHostWindow: { bAckupPAth: testBAckupPAth2, uiStAte: getUIStAte(), folderUri: testFolderURI },
			openedWindows: []
		};
		AssertRestoring(windowStAte, 'lAstPluginDevelopmentHostWindow');
	});

	test('open 1_31', () => {
		const v1_31_workspAce = `{
			"openedWindows": [],
			"lAstActiveWindow": {
				"workspAce": {
					"id": "A41787288b5e9cc1A61bA2dd84cd0d80",
					"configPAth": "/home/user/workspAces/code-And-docs.code-workspAce"
				},
				"bAckupPAth": "/home/user/.config/Code - Insiders/BAckups/A41787288b5e9cc1A61bA2dd84cd0d80",
				"uiStAte": {
					"mode": 0,
					"x": 0,
					"y": 27,
					"width": 2560,
					"height": 1364
				}
			}
		}`;

		let windowsStAte = restoreWindowsStAte(JSON.pArse(v1_31_workspAce));
		let expected: IWindowsStAte = {
			openedWindows: [],
			lAstActiveWindow: {
				bAckupPAth: '/home/user/.config/Code - Insiders/BAckups/A41787288b5e9cc1A61bA2dd84cd0d80',
				uiStAte: { mode: WindowMode.MAximized, x: 0, y: 27, width: 2560, height: 1364 },
				workspAce: { id: 'A41787288b5e9cc1A61bA2dd84cd0d80', configPAth: URI.file('/home/user/workspAces/code-And-docs.code-workspAce') }
			}
		};

		AssertEquAlWindowsStAte(expected, windowsStAte, 'v1_31_workspAce');

		const v1_31_folder = `{
			"openedWindows": [],
			"lAstPluginDevelopmentHostWindow": {
				"folderUri": {
					"$mid": 1,
					"fsPAth": "/home/user/workspAces/testing/customdAtA",
					"externAl": "file:///home/user/workspAces/testing/customdAtA",
					"pAth": "/home/user/workspAces/testing/customdAtA",
					"scheme": "file"
				},
				"uiStAte": {
					"mode": 1,
					"x": 593,
					"y": 617,
					"width": 1625,
					"height": 595
				}
			}
		}`;

		windowsStAte = restoreWindowsStAte(JSON.pArse(v1_31_folder));
		expected = {
			openedWindows: [],
			lAstPluginDevelopmentHostWindow: {
				uiStAte: { mode: WindowMode.NormAl, x: 593, y: 617, width: 1625, height: 595 },
				folderUri: URI.pArse('file:///home/user/workspAces/testing/customdAtA')
			}
		};
		AssertEquAlWindowsStAte(expected, windowsStAte, 'v1_31_folder');

		const v1_31_empty_window = ` {
			"openedWindows": [
			],
			"lAstActiveWindow": {
				"bAckupPAth": "C:\\\\Users\\\\Mike\\\\AppDAtA\\\\RoAming\\\\Code\\\\BAckups\\\\1549538599815",
				"uiStAte": {
					"mode": 0,
					"x": -8,
					"y": -8,
					"width": 2576,
					"height": 1344
				}
			}
		}`;

		windowsStAte = restoreWindowsStAte(JSON.pArse(v1_31_empty_window));
		expected = {
			openedWindows: [],
			lAstActiveWindow: {
				bAckupPAth: 'C:\\Users\\Mike\\AppDAtA\\RoAming\\Code\\BAckups\\1549538599815',
				uiStAte: { mode: WindowMode.MAximized, x: -8, y: -8, width: 2576, height: 1344 }
			}
		};
		AssertEquAlWindowsStAte(expected, windowsStAte, 'v1_31_empty_window');

	});

	test('open 1_32', () => {
		const v1_32_workspAce = `{
			"openedWindows": [],
			"lAstActiveWindow": {
				"workspAceIdentifier": {
					"id": "53b714b46ef1A2d4346568b4f591028c",
					"configURIPAth": "file:///home/user/workspAces/testing/custom.code-workspAce"
				},
				"bAckupPAth": "/home/user/.config/code-oss-dev/BAckups/53b714b46ef1A2d4346568b4f591028c",
				"uiStAte": {
					"mode": 0,
					"x": 0,
					"y": 27,
					"width": 2560,
					"height": 1364
				}
			}
		}`;

		let windowsStAte = restoreWindowsStAte(JSON.pArse(v1_32_workspAce));
		let expected: IWindowsStAte = {
			openedWindows: [],
			lAstActiveWindow: {
				bAckupPAth: '/home/user/.config/code-oss-dev/BAckups/53b714b46ef1A2d4346568b4f591028c',
				uiStAte: { mode: WindowMode.MAximized, x: 0, y: 27, width: 2560, height: 1364 },
				workspAce: { id: '53b714b46ef1A2d4346568b4f591028c', configPAth: URI.pArse('file:///home/user/workspAces/testing/custom.code-workspAce') }
			}
		};

		AssertEquAlWindowsStAte(expected, windowsStAte, 'v1_32_workspAce');

		const v1_32_folder = `{
			"openedWindows": [],
			"lAstActiveWindow": {
				"folder": "file:///home/user/workspAces/testing/folding",
				"bAckupPAth": "/home/user/.config/code-oss-dev/BAckups/1dAAc1621c6c06f9e916Ac8062e5A1b5",
				"uiStAte": {
					"mode": 1,
					"x": 625,
					"y": 263,
					"width": 1718,
					"height": 953
				}
			}
		}`;

		windowsStAte = restoreWindowsStAte(JSON.pArse(v1_32_folder));
		expected = {
			openedWindows: [],
			lAstActiveWindow: {
				bAckupPAth: '/home/user/.config/code-oss-dev/BAckups/1dAAc1621c6c06f9e916Ac8062e5A1b5',
				uiStAte: { mode: WindowMode.NormAl, x: 625, y: 263, width: 1718, height: 953 },
				folderUri: URI.pArse('file:///home/user/workspAces/testing/folding')
			}
		};
		AssertEquAlWindowsStAte(expected, windowsStAte, 'v1_32_folder');

		const v1_32_empty_window = ` {
			"openedWindows": [
			],
			"lAstActiveWindow": {
				"bAckupPAth": "/home/user/.config/code-oss-dev/BAckups/1549539668998",
				"uiStAte": {
					"mode": 1,
					"x": 768,
					"y": 336,
					"width": 1024,
					"height": 768
				}
			}
		}`;

		windowsStAte = restoreWindowsStAte(JSON.pArse(v1_32_empty_window));
		expected = {
			openedWindows: [],
			lAstActiveWindow: {
				bAckupPAth: '/home/user/.config/code-oss-dev/BAckups/1549539668998',
				uiStAte: { mode: WindowMode.NormAl, x: 768, y: 336, width: 1024, height: 768 }
			}
		};
		AssertEquAlWindowsStAte(expected, windowsStAte, 'v1_32_empty_window');

	});

});
