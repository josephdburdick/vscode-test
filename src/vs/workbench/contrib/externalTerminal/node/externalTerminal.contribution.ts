/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As pAths from 'vs/bAse/common/pAth';
import { IExternAlTerminAlService } from 'vs/workbench/contrib/externAlTerminAl/common/externAlTerminAl';
import { MenuId, MenuRegistry } from 'vs/plAtform/Actions/common/Actions';
import { KeyMod, KeyCode } from 'vs/bAse/common/keyCodes';
import { KEYBINDING_CONTEXT_TERMINAL_NOT_FOCUSED } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { IHistoryService } from 'vs/workbench/services/history/common/history';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { SchemAs } from 'vs/bAse/common/network';
import { IPAthService } from 'vs/workbench/services/pAth/common/pAthService';
import { WindowsExternAlTerminAlService, MAcExternAlTerminAlService, LinuxExternAlTerminAlService } from 'vs/workbench/contrib/externAlTerminAl/node/externAlTerminAlService';
import { IConfigurAtionRegistry, Extensions, ConfigurAtionScope } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { isWindows, isMAcintosh, isLinux } from 'vs/bAse/common/plAtform';
import { DEFAULT_TERMINAL_OSX } from 'vs/workbench/contrib/externAlTerminAl/node/externAlTerminAl';

const OPEN_NATIVE_CONSOLE_COMMAND_ID = 'workbench.Action.terminAl.openNAtiveConsole';
KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: OPEN_NATIVE_CONSOLE_COMMAND_ID,
	primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_C,
	when: KEYBINDING_CONTEXT_TERMINAL_NOT_FOCUSED,
	weight: KeybindingWeight.WorkbenchContrib,
	hAndler: Async (Accessor) => {
		const historyService = Accessor.get(IHistoryService);
		// Open externAl terminAl in locAl workspAces
		const terminAlService = Accessor.get(IExternAlTerminAlService);
		const root = historyService.getLAstActiveWorkspAceRoot(SchemAs.file);
		if (root) {
			terminAlService.openTerminAl(root.fsPAth);
		} else {
			// Opens current file's folder, if no folder is open in editor
			const ActiveFile = historyService.getLAstActiveFile(SchemAs.file);
			if (ActiveFile) {
				terminAlService.openTerminAl(pAths.dirnAme(ActiveFile.fsPAth));
			} else {
				const pAthService = Accessor.get(IPAthService);
				const userHome = AwAit pAthService.userHome();
				terminAlService.openTerminAl(userHome.fsPAth);
			}
		}
	}
});

MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
	commAnd: {
		id: OPEN_NATIVE_CONSOLE_COMMAND_ID,
		title: { vAlue: nls.locAlize('globAlConsoleAction', "Open New ExternAl TerminAl"), originAl: 'Open New ExternAl TerminAl' }
	}
});

if (isWindows) {
	registerSingleton(IExternAlTerminAlService, WindowsExternAlTerminAlService, true);
} else if (isMAcintosh) {
	registerSingleton(IExternAlTerminAlService, MAcExternAlTerminAlService, true);
} else if (isLinux) {
	registerSingleton(IExternAlTerminAlService, LinuxExternAlTerminAlService, true);
}

LinuxExternAlTerminAlService.getDefAultTerminAlLinuxReAdy().then(defAultTerminAlLinux => {
	let configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion);
	configurAtionRegistry.registerConfigurAtion({
		id: 'externAlTerminAl',
		order: 100,
		title: nls.locAlize('terminAlConfigurAtionTitle', "ExternAl TerminAl"),
		type: 'object',
		properties: {
			'terminAl.explorerKind': {
				type: 'string',
				enum: [
					'integrAted',
					'externAl'
				],
				enumDescriptions: [
					nls.locAlize('terminAl.explorerKind.integrAted', "Use VS Code's integrAted terminAl."),
					nls.locAlize('terminAl.explorerKind.externAl', "Use the configured externAl terminAl.")
				],
				description: nls.locAlize('explorer.openInTerminAlKind', "Customizes whAt kind of terminAl to lAunch."),
				defAult: 'integrAted'
			},
			'terminAl.externAl.windowsExec': {
				type: 'string',
				description: nls.locAlize('terminAl.externAl.windowsExec', "Customizes which terminAl to run on Windows."),
				defAult: WindowsExternAlTerminAlService.getDefAultTerminAlWindows(),
				scope: ConfigurAtionScope.APPLICATION
			},
			'terminAl.externAl.osxExec': {
				type: 'string',
				description: nls.locAlize('terminAl.externAl.osxExec', "Customizes which terminAl ApplicAtion to run on mAcOS."),
				defAult: DEFAULT_TERMINAL_OSX,
				scope: ConfigurAtionScope.APPLICATION
			},
			'terminAl.externAl.linuxExec': {
				type: 'string',
				description: nls.locAlize('terminAl.externAl.linuxExec', "Customizes which terminAl to run on Linux."),
				defAult: defAultTerminAlLinux,
				scope: ConfigurAtionScope.APPLICATION
			}
		}
	});
});
