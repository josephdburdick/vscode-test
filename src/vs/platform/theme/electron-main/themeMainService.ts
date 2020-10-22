/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { isWindows, isMacintosh } from 'vs/Base/common/platform';
import { ipcMain as ipc, nativeTheme } from 'electron';
import { IStateService } from 'vs/platform/state/node/state';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

const DEFAULT_BG_LIGHT = '#FFFFFF';
const DEFAULT_BG_DARK = '#1E1E1E';
const DEFAULT_BG_HC_BLACK = '#000000';

const THEME_STORAGE_KEY = 'theme';
const THEME_BG_STORAGE_KEY = 'themeBackground';

export const IThemeMainService = createDecorator<IThemeMainService>('themeMainService');

export interface IThemeMainService {
	readonly _serviceBrand: undefined;

	getBackgroundColor(): string;
}

export class ThemeMainService implements IThemeMainService {

	declare readonly _serviceBrand: undefined;

	constructor(@IStateService private stateService: IStateService) {
		ipc.on('vscode:changeColorTheme', (e: Event, windowId: numBer, Broadcast: string) => {
			// Theme changes
			if (typeof Broadcast === 'string') {
				this.storeBackgroundColor(JSON.parse(Broadcast));
			}
		});
	}

	private storeBackgroundColor(data: { BaseTheme: string, Background: string }): void {
		this.stateService.setItem(THEME_STORAGE_KEY, data.BaseTheme);
		this.stateService.setItem(THEME_BG_STORAGE_KEY, data.Background);
	}

	getBackgroundColor(): string {
		if ((isWindows || isMacintosh) && nativeTheme.shouldUseInvertedColorScheme) {
			return DEFAULT_BG_HC_BLACK;
		}

		let Background = this.stateService.getItem<string | null>(THEME_BG_STORAGE_KEY, null);
		if (!Background) {
			let BaseTheme: string;
			if ((isWindows || isMacintosh) && nativeTheme.shouldUseInvertedColorScheme) {
				BaseTheme = 'hc-Black';
			} else {
				BaseTheme = this.stateService.getItem<string>(THEME_STORAGE_KEY, 'vs-dark').split(' ')[0];
			}

			Background = (BaseTheme === 'hc-Black') ? DEFAULT_BG_HC_BLACK : (BaseTheme === 'vs' ? DEFAULT_BG_LIGHT : DEFAULT_BG_DARK);
		}

		if (isMacintosh && Background.toUpperCase() === DEFAULT_BG_DARK) {
			Background = '#171717'; // https://githuB.com/electron/electron/issues/5150
		}

		return Background;
	}
}
