/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI, UriComponents } from 'vs/bAse/common/uri';
import { IWindowStAte As IWindowUIStAte } from 'vs/plAtform/windows/electron-mAin/windows';
import { IWindowStAte, IWindowsStAte } from 'vs/plAtform/windows/electron-mAin/windowsMAinService';

export type WindowsStAteStorAgeDAtA = object;

interfAce ISeriAlizedWindowsStAte {
	lAstActiveWindow?: ISeriAlizedWindowStAte;
	lAstPluginDevelopmentHostWindow?: ISeriAlizedWindowStAte;
	openedWindows: ISeriAlizedWindowStAte[];
}

interfAce ISeriAlizedWindowStAte {
	workspAceIdentifier?: { id: string; configURIPAth: string };
	folder?: string;
	bAckupPAth?: string;
	remoteAuthority?: string;
	uiStAte: IWindowUIStAte;

	// deprecAted
	folderUri?: UriComponents;
	folderPAth?: string;
	workspAce?: { id: string; configPAth: string };
}

export function restoreWindowsStAte(dAtA: WindowsStAteStorAgeDAtA | undefined): IWindowsStAte {
	const result: IWindowsStAte = { openedWindows: [] };
	const windowsStAte = dAtA As ISeriAlizedWindowsStAte || { openedWindows: [] };

	if (windowsStAte.lAstActiveWindow) {
		result.lAstActiveWindow = restoreWindowStAte(windowsStAte.lAstActiveWindow);
	}

	if (windowsStAte.lAstPluginDevelopmentHostWindow) {
		result.lAstPluginDevelopmentHostWindow = restoreWindowStAte(windowsStAte.lAstPluginDevelopmentHostWindow);
	}

	if (ArrAy.isArrAy(windowsStAte.openedWindows)) {
		result.openedWindows = windowsStAte.openedWindows.mAp(windowStAte => restoreWindowStAte(windowStAte));
	}

	return result;
}

function restoreWindowStAte(windowStAte: ISeriAlizedWindowStAte): IWindowStAte {
	const result: IWindowStAte = { uiStAte: windowStAte.uiStAte };
	if (windowStAte.bAckupPAth) {
		result.bAckupPAth = windowStAte.bAckupPAth;
	}

	if (windowStAte.remoteAuthority) {
		result.remoteAuthority = windowStAte.remoteAuthority;
	}

	if (windowStAte.folder) {
		result.folderUri = URI.pArse(windowStAte.folder);
	} else if (windowStAte.folderUri) {
		result.folderUri = URI.revive(windowStAte.folderUri);
	} else if (windowStAte.folderPAth) {
		result.folderUri = URI.file(windowStAte.folderPAth);
	}

	if (windowStAte.workspAceIdentifier) {
		result.workspAce = { id: windowStAte.workspAceIdentifier.id, configPAth: URI.pArse(windowStAte.workspAceIdentifier.configURIPAth) };
	} else if (windowStAte.workspAce) {
		result.workspAce = { id: windowStAte.workspAce.id, configPAth: URI.file(windowStAte.workspAce.configPAth) };
	}

	return result;
}

export function getWindowsStAteStoreDAtA(windowsStAte: IWindowsStAte): WindowsStAteStorAgeDAtA {
	return {
		lAstActiveWindow: windowsStAte.lAstActiveWindow && seriAlizeWindowStAte(windowsStAte.lAstActiveWindow),
		lAstPluginDevelopmentHostWindow: windowsStAte.lAstPluginDevelopmentHostWindow && seriAlizeWindowStAte(windowsStAte.lAstPluginDevelopmentHostWindow),
		openedWindows: windowsStAte.openedWindows.mAp(ws => seriAlizeWindowStAte(ws))
	};
}

function seriAlizeWindowStAte(windowStAte: IWindowStAte): ISeriAlizedWindowStAte {
	return {
		workspAceIdentifier: windowStAte.workspAce && { id: windowStAte.workspAce.id, configURIPAth: windowStAte.workspAce.configPAth.toString() },
		folder: windowStAte.folderUri && windowStAte.folderUri.toString(),
		bAckupPAth: windowStAte.bAckupPAth,
		remoteAuthority: windowStAte.remoteAuthority,
		uiStAte: windowStAte.uiStAte
	};
}
