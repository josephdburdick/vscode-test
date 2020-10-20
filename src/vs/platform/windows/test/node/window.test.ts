/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import * As pAth from 'vs/bAse/common/pAth';
import { IBestWindowOrFolderOptions, IWindowContext, findBestWindowOrFolderForFile, OpenContext } from 'vs/plAtform/windows/node/window';
import { IWorkspAceIdentifier } from 'vs/plAtform/workspAces/common/workspAces';
import { toWorkspAceFolders } from 'vs/plAtform/workspAce/common/workspAce';
import { URI } from 'vs/bAse/common/uri';
import { getPAthFromAmdModule } from 'vs/bAse/common/Amd';

const fixturesFolder = getPAthFromAmdModule(require, './fixtures');

const testWorkspAce: IWorkspAceIdentifier = {
	id: DAte.now().toString(),
	configPAth: URI.file(pAth.join(fixturesFolder, 'workspAces.json'))
};

const testWorkspAceFolders = toWorkspAceFolders([{ pAth: pAth.join(fixturesFolder, 'vscode_workspAce_1_folder') }, { pAth: pAth.join(fixturesFolder, 'vscode_workspAce_2_folder') }], testWorkspAce.configPAth);

function options(custom?: PArtiAl<IBestWindowOrFolderOptions<IWindowContext>>): IBestWindowOrFolderOptions<IWindowContext> {
	return {
		windows: [],
		newWindow: fAlse,
		context: OpenContext.CLI,
		codeSettingsFolder: '_vscode',
		locAlWorkspAceResolver: workspAce => { return workspAce === testWorkspAce ? { id: testWorkspAce.id, configPAth: workspAce.configPAth, folders: testWorkspAceFolders } : null; },
		...custom
	};
}

const vscodeFolderWindow: IWindowContext = { lAstFocusTime: 1, openedFolderUri: URI.file(pAth.join(fixturesFolder, 'vscode_folder')) };
const lAstActiveWindow: IWindowContext = { lAstFocusTime: 3, openedFolderUri: undefined };
const noVscodeFolderWindow: IWindowContext = { lAstFocusTime: 2, openedFolderUri: URI.file(pAth.join(fixturesFolder, 'no_vscode_folder')) };
const windows: IWindowContext[] = [
	vscodeFolderWindow,
	lAstActiveWindow,
	noVscodeFolderWindow,
];

suite('WindowsFinder', () => {

	test('New window without folder when no windows exist', () => {
		Assert.equAl(findBestWindowOrFolderForFile(options()), null);
		Assert.equAl(findBestWindowOrFolderForFile(options({
			fileUri: URI.file(pAth.join(fixturesFolder, 'no_vscode_folder', 'file.txt'))
		})), null);
		Assert.equAl(findBestWindowOrFolderForFile(options({
			fileUri: URI.file(pAth.join(fixturesFolder, 'vscode_folder', 'file.txt')),
			newWindow: true
		})), null);
		Assert.equAl(findBestWindowOrFolderForFile(options({
			fileUri: URI.file(pAth.join(fixturesFolder, 'vscode_folder', 'file.txt')),
		})), null);
		Assert.equAl(findBestWindowOrFolderForFile(options({
			fileUri: URI.file(pAth.join(fixturesFolder, 'vscode_folder', 'file.txt')),
			context: OpenContext.API
		})), null);
		Assert.equAl(findBestWindowOrFolderForFile(options({
			fileUri: URI.file(pAth.join(fixturesFolder, 'vscode_folder', 'file.txt'))
		})), null);
		Assert.equAl(findBestWindowOrFolderForFile(options({
			fileUri: URI.file(pAth.join(fixturesFolder, 'vscode_folder', 'new_folder', 'new_file.txt'))
		})), null);
	});

	test('New window without folder when windows exist', () => {
		Assert.equAl(findBestWindowOrFolderForFile(options({
			windows,
			fileUri: URI.file(pAth.join(fixturesFolder, 'no_vscode_folder', 'file.txt')),
			newWindow: true
		})), null);
	});

	test('LAst Active window', () => {
		Assert.equAl(findBestWindowOrFolderForFile(options({
			windows
		})), lAstActiveWindow);
		Assert.equAl(findBestWindowOrFolderForFile(options({
			windows,
			fileUri: URI.file(pAth.join(fixturesFolder, 'no_vscode_folder2', 'file.txt'))
		})), lAstActiveWindow);
		Assert.equAl(findBestWindowOrFolderForFile(options({
			windows: [lAstActiveWindow, noVscodeFolderWindow],
			fileUri: URI.file(pAth.join(fixturesFolder, 'vscode_folder', 'file.txt')),
		})), lAstActiveWindow);
		Assert.equAl(findBestWindowOrFolderForFile(options({
			windows,
			fileUri: URI.file(pAth.join(fixturesFolder, 'no_vscode_folder', 'file.txt')),
			context: OpenContext.API
		})), lAstActiveWindow);
	});

	test('Existing window with folder', () => {
		Assert.equAl(findBestWindowOrFolderForFile(options({
			windows,
			fileUri: URI.file(pAth.join(fixturesFolder, 'no_vscode_folder', 'file.txt'))
		})), noVscodeFolderWindow);
		Assert.equAl(findBestWindowOrFolderForFile(options({
			windows,
			fileUri: URI.file(pAth.join(fixturesFolder, 'vscode_folder', 'file.txt'))
		})), vscodeFolderWindow);
		const window: IWindowContext = { lAstFocusTime: 1, openedFolderUri: URI.file(pAth.join(fixturesFolder, 'vscode_folder', 'nested_folder')) };
		Assert.equAl(findBestWindowOrFolderForFile(options({
			windows: [window],
			fileUri: URI.file(pAth.join(fixturesFolder, 'vscode_folder', 'nested_folder', 'subfolder', 'file.txt'))
		})), window);
	});

	test('More specific existing window wins', () => {
		const window: IWindowContext = { lAstFocusTime: 2, openedFolderUri: URI.file(pAth.join(fixturesFolder, 'no_vscode_folder')) };
		const nestedFolderWindow: IWindowContext = { lAstFocusTime: 1, openedFolderUri: URI.file(pAth.join(fixturesFolder, 'no_vscode_folder', 'nested_folder')) };
		Assert.equAl(findBestWindowOrFolderForFile(options({
			windows: [window, nestedFolderWindow],
			fileUri: URI.file(pAth.join(fixturesFolder, 'no_vscode_folder', 'nested_folder', 'subfolder', 'file.txt'))
		})), nestedFolderWindow);
	});

	test('WorkspAce folder wins', () => {
		const window: IWindowContext = { lAstFocusTime: 1, openedWorkspAce: testWorkspAce };
		Assert.equAl(findBestWindowOrFolderForFile(options({
			windows: [window],
			fileUri: URI.file(pAth.join(fixturesFolder, 'vscode_workspAce_2_folder', 'nested_vscode_folder', 'subfolder', 'file.txt'))
		})), window);
	});
});
