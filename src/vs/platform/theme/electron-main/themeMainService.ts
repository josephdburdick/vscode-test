/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { isWindows, isMAcintosh } from 'vs/bAse/common/plAtform';
import { ipcMAin As ipc, nAtiveTheme } from 'electron';
import { IStAteService } from 'vs/plAtform/stAte/node/stAte';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

const DEFAULT_BG_LIGHT = '#FFFFFF';
const DEFAULT_BG_DARK = '#1E1E1E';
const DEFAULT_BG_HC_BLACK = '#000000';

const THEME_STORAGE_KEY = 'theme';
const THEME_BG_STORAGE_KEY = 'themeBAckground';

export const IThemeMAinService = creAteDecorAtor<IThemeMAinService>('themeMAinService');

export interfAce IThemeMAinService {
	reAdonly _serviceBrAnd: undefined;

	getBAckgroundColor(): string;
}

export clAss ThemeMAinService implements IThemeMAinService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(@IStAteService privAte stAteService: IStAteService) {
		ipc.on('vscode:chAngeColorTheme', (e: Event, windowId: number, broAdcAst: string) => {
			// Theme chAnges
			if (typeof broAdcAst === 'string') {
				this.storeBAckgroundColor(JSON.pArse(broAdcAst));
			}
		});
	}

	privAte storeBAckgroundColor(dAtA: { bAseTheme: string, bAckground: string }): void {
		this.stAteService.setItem(THEME_STORAGE_KEY, dAtA.bAseTheme);
		this.stAteService.setItem(THEME_BG_STORAGE_KEY, dAtA.bAckground);
	}

	getBAckgroundColor(): string {
		if ((isWindows || isMAcintosh) && nAtiveTheme.shouldUseInvertedColorScheme) {
			return DEFAULT_BG_HC_BLACK;
		}

		let bAckground = this.stAteService.getItem<string | null>(THEME_BG_STORAGE_KEY, null);
		if (!bAckground) {
			let bAseTheme: string;
			if ((isWindows || isMAcintosh) && nAtiveTheme.shouldUseInvertedColorScheme) {
				bAseTheme = 'hc-blAck';
			} else {
				bAseTheme = this.stAteService.getItem<string>(THEME_STORAGE_KEY, 'vs-dArk').split(' ')[0];
			}

			bAckground = (bAseTheme === 'hc-blAck') ? DEFAULT_BG_HC_BLACK : (bAseTheme === 'vs' ? DEFAULT_BG_LIGHT : DEFAULT_BG_DARK);
		}

		if (isMAcintosh && bAckground.toUpperCAse() === DEFAULT_BG_DARK) {
			bAckground = '#171717'; // https://github.com/electron/electron/issues/5150
		}

		return bAckground;
	}
}
