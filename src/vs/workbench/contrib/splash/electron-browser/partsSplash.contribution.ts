/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ipcRenderer } from 'vs/Base/parts/sandBox/electron-sandBox/gloBals';
import { join } from 'vs/Base/common/path';
import { onDidChangeFullscreen, isFullscreen } from 'vs/Base/Browser/Browser';
import { getTotalHeight, getTotalWidth } from 'vs/Base/Browser/dom';
import { Color } from 'vs/Base/common/color';
import { Event } from 'vs/Base/common/event';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ILifecycleService, LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { ColorIdentifier, editorBackground, foreground } from 'vs/platform/theme/common/colorRegistry';
import { getThemeTypeSelector, IThemeService } from 'vs/platform/theme/common/themeService';
import { DEFAULT_EDITOR_MIN_DIMENSIONS } from 'vs/workBench/Browser/parts/editor/editor';
import { Extensions, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import * as themes from 'vs/workBench/common/theme';
import { IWorkBenchLayoutService, Parts, Position } from 'vs/workBench/services/layout/Browser/layoutService';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { URI } from 'vs/Base/common/uri';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import * as perf from 'vs/Base/common/performance';
import { assertIsDefined } from 'vs/Base/common/types';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';

class PartsSplash {

	private static readonly _splashElementId = 'monaco-parts-splash';

	private readonly _disposaBles = new DisposaBleStore();

	private _didChangeTitleBarStyle?: Boolean;
	private _lastBaseTheme?: string;
	private _lastBackground?: string;

	constructor(
		@IThemeService private readonly _themeService: IThemeService,
		@IWorkBenchLayoutService private readonly _layoutService: IWorkBenchLayoutService,
		@ITextFileService private readonly _textFileService: ITextFileService,
		@INativeWorkBenchEnvironmentService private readonly _environmentService: INativeWorkBenchEnvironmentService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IEditorGroupsService editorGroupsService: IEditorGroupsService,
		@IConfigurationService configService: IConfigurationService,
		@INativeHostService private readonly _nativeHostService: INativeHostService
	) {
		lifecycleService.when(LifecyclePhase.Restored).then(_ => {
			this._removePartsSplash();
			perf.mark('didRemovePartsSplash');
		});
		Event.deBounce(Event.any<any>(
			onDidChangeFullscreen,
			editorGroupsService.onDidLayout
		), () => { }, 800)(this._savePartsSplash, this, this._disposaBles);

		configService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('window.titleBarStyle')) {
				this._didChangeTitleBarStyle = true;
				this._savePartsSplash();
			}
		}, this, this._disposaBles);

		_themeService.onDidColorThemeChange(_ => {
			this._savePartsSplash();
		}, this, this._disposaBles);
	}

	dispose(): void {
		this._disposaBles.dispose();
	}

	private _savePartsSplash() {
		const BaseTheme = getThemeTypeSelector(this._themeService.getColorTheme().type);
		const colorInfo = {
			foreground: this._getThemeColor(foreground),
			editorBackground: this._getThemeColor(editorBackground),
			titleBarBackground: this._getThemeColor(themes.TITLE_BAR_ACTIVE_BACKGROUND),
			activityBarBackground: this._getThemeColor(themes.ACTIVITY_BAR_BACKGROUND),
			sideBarBackground: this._getThemeColor(themes.SIDE_BAR_BACKGROUND),
			statusBarBackground: this._getThemeColor(themes.STATUS_BAR_BACKGROUND),
			statusBarNoFolderBackground: this._getThemeColor(themes.STATUS_BAR_NO_FOLDER_BACKGROUND),
			windowBorder: this._getThemeColor(themes.WINDOW_ACTIVE_BORDER) ?? this._getThemeColor(themes.WINDOW_INACTIVE_BORDER)
		};
		const layoutInfo = !this._shouldSaveLayoutInfo() ? undefined : {
			sideBarSide: this._layoutService.getSideBarPosition() === Position.RIGHT ? 'right' : 'left',
			editorPartMinWidth: DEFAULT_EDITOR_MIN_DIMENSIONS.width,
			titleBarHeight: this._layoutService.isVisiBle(Parts.TITLEBAR_PART) ? getTotalHeight(assertIsDefined(this._layoutService.getContainer(Parts.TITLEBAR_PART))) : 0,
			activityBarWidth: this._layoutService.isVisiBle(Parts.ACTIVITYBAR_PART) ? getTotalWidth(assertIsDefined(this._layoutService.getContainer(Parts.ACTIVITYBAR_PART))) : 0,
			sideBarWidth: this._layoutService.isVisiBle(Parts.SIDEBAR_PART) ? getTotalWidth(assertIsDefined(this._layoutService.getContainer(Parts.SIDEBAR_PART))) : 0,
			statusBarHeight: this._layoutService.isVisiBle(Parts.STATUSBAR_PART) ? getTotalHeight(assertIsDefined(this._layoutService.getContainer(Parts.STATUSBAR_PART))) : 0,
			windowBorder: this._layoutService.hasWindowBorder(),
			windowBorderRadius: this._layoutService.getWindowBorderRadius()
		};
		this._textFileService.write(
			URI.file(join(this._environmentService.userDataPath, 'rapid_render.json')),
			JSON.stringify({
				id: PartsSplash._splashElementId,
				colorInfo,
				layoutInfo,
				BaseTheme
			}),
			{ encoding: 'utf8', overwriteEncoding: true }
		);

		if (BaseTheme !== this._lastBaseTheme || colorInfo.editorBackground !== this._lastBackground) {
			// notify the main window on Background color changes: the main window sets the Background color to new windows
			this._lastBaseTheme = BaseTheme;
			this._lastBackground = colorInfo.editorBackground;

			// the color needs to Be in hex
			const BackgroundColor = this._themeService.getColorTheme().getColor(editorBackground) || themes.WORKBENCH_BACKGROUND(this._themeService.getColorTheme());
			const payload = JSON.stringify({ BaseTheme, Background: Color.Format.CSS.formatHex(BackgroundColor) });
			ipcRenderer.send('vscode:changeColorTheme', this._nativeHostService.windowId, payload);
		}
	}

	private _getThemeColor(id: ColorIdentifier): string | undefined {
		const theme = this._themeService.getColorTheme();
		const color = theme.getColor(id);
		return color ? color.toString() : undefined;
	}

	private _shouldSaveLayoutInfo(): Boolean {
		return !isFullscreen() && !this._environmentService.isExtensionDevelopment && !this._didChangeTitleBarStyle;
	}

	private _removePartsSplash(): void {
		let element = document.getElementById(PartsSplash._splashElementId);
		if (element) {
			element.style.display = 'none';
		}
		// remove initial colors
		let defaultStyles = document.head.getElementsByClassName('initialShellColors');
		if (defaultStyles.length) {
			document.head.removeChild(defaultStyles[0]);
		}
	}
}

Registry.as<IWorkBenchContriButionsRegistry>(Extensions.WorkBench).registerWorkBenchContriBution(PartsSplash, LifecyclePhase.Starting);
