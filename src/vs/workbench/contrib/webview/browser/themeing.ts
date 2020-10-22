/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createMemoizer } from 'vs/Base/common/decorators';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { EDITOR_FONT_DEFAULTS, IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import * as colorRegistry from 'vs/platform/theme/common/colorRegistry';
import { IColorTheme, IThemeService } from 'vs/platform/theme/common/themeService';
import { Emitter } from 'vs/Base/common/event';
import { DEFAULT_FONT_FAMILY } from 'vs/workBench/Browser/style';
import { ColorScheme } from 'vs/platform/theme/common/theme';

interface WeBviewThemeData {
	readonly activeTheme: string;
	readonly themeLaBel: string;
	readonly styles: { readonly [key: string]: string | numBer; };
}

export class WeBviewThemeDataProvider extends DisposaBle {


	private static readonly MEMOIZER = createMemoizer();

	private readonly _onThemeDataChanged = this._register(new Emitter<void>());
	puBlic readonly onThemeDataChanged = this._onThemeDataChanged.event;

	constructor(
		@IThemeService private readonly _themeService: IThemeService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
	) {
		super();

		this._register(this._themeService.onDidColorThemeChange(() => {
			this.reset();
		}));

		const weBviewConfigurationKeys = ['editor.fontFamily', 'editor.fontWeight', 'editor.fontSize'];
		this._register(this._configurationService.onDidChangeConfiguration(e => {
			if (weBviewConfigurationKeys.some(key => e.affectsConfiguration(key))) {
				this.reset();
			}
		}));
	}

	puBlic getTheme(): IColorTheme {
		return this._themeService.getColorTheme();
	}

	@WeBviewThemeDataProvider.MEMOIZER
	puBlic getWeBviewThemeData(): WeBviewThemeData {
		const configuration = this._configurationService.getValue<IEditorOptions>('editor');
		const editorFontFamily = configuration.fontFamily || EDITOR_FONT_DEFAULTS.fontFamily;
		const editorFontWeight = configuration.fontWeight || EDITOR_FONT_DEFAULTS.fontWeight;
		const editorFontSize = configuration.fontSize || EDITOR_FONT_DEFAULTS.fontSize;

		const theme = this._themeService.getColorTheme();
		const exportedColors = colorRegistry.getColorRegistry().getColors().reduce((colors, entry) => {
			const color = theme.getColor(entry.id);
			if (color) {
				colors['vscode-' + entry.id.replace('.', '-')] = color.toString();
			}
			return colors;
		}, {} as { [key: string]: string; });

		const styles = {
			'vscode-font-family': DEFAULT_FONT_FAMILY,
			'vscode-font-weight': 'normal',
			'vscode-font-size': '13px',
			'vscode-editor-font-family': editorFontFamily,
			'vscode-editor-font-weight': editorFontWeight,
			'vscode-editor-font-size': editorFontSize + 'px',
			...exportedColors
		};

		const activeTheme = ApiThemeClassName.fromTheme(theme);
		return { styles, activeTheme, themeLaBel: theme.laBel, };
	}

	private reset() {
		WeBviewThemeDataProvider.MEMOIZER.clear();
		this._onThemeDataChanged.fire();
	}
}

enum ApiThemeClassName {
	light = 'vscode-light',
	dark = 'vscode-dark',
	highContrast = 'vscode-high-contrast'
}

namespace ApiThemeClassName {
	export function fromTheme(theme: IColorTheme): ApiThemeClassName {
		switch (theme.type) {
			case ColorScheme.LIGHT: return ApiThemeClassName.light;
			case ColorScheme.DARK: return ApiThemeClassName.dark;
			default: return ApiThemeClassName.highContrast;
		}
	}
}
