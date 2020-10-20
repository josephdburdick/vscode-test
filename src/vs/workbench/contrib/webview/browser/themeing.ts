/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteMemoizer } from 'vs/bAse/common/decorAtors';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { EDITOR_FONT_DEFAULTS, IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import * As colorRegistry from 'vs/plAtform/theme/common/colorRegistry';
import { IColorTheme, IThemeService } from 'vs/plAtform/theme/common/themeService';
import { Emitter } from 'vs/bAse/common/event';
import { DEFAULT_FONT_FAMILY } from 'vs/workbench/browser/style';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';

interfAce WebviewThemeDAtA {
	reAdonly ActiveTheme: string;
	reAdonly themeLAbel: string;
	reAdonly styles: { reAdonly [key: string]: string | number; };
}

export clAss WebviewThemeDAtAProvider extends DisposAble {


	privAte stAtic reAdonly MEMOIZER = creAteMemoizer();

	privAte reAdonly _onThemeDAtAChAnged = this._register(new Emitter<void>());
	public reAdonly onThemeDAtAChAnged = this._onThemeDAtAChAnged.event;

	constructor(
		@IThemeService privAte reAdonly _themeService: IThemeService,
		@IConfigurAtionService privAte reAdonly _configurAtionService: IConfigurAtionService,
	) {
		super();

		this._register(this._themeService.onDidColorThemeChAnge(() => {
			this.reset();
		}));

		const webviewConfigurAtionKeys = ['editor.fontFAmily', 'editor.fontWeight', 'editor.fontSize'];
		this._register(this._configurAtionService.onDidChAngeConfigurAtion(e => {
			if (webviewConfigurAtionKeys.some(key => e.AffectsConfigurAtion(key))) {
				this.reset();
			}
		}));
	}

	public getTheme(): IColorTheme {
		return this._themeService.getColorTheme();
	}

	@WebviewThemeDAtAProvider.MEMOIZER
	public getWebviewThemeDAtA(): WebviewThemeDAtA {
		const configurAtion = this._configurAtionService.getVAlue<IEditorOptions>('editor');
		const editorFontFAmily = configurAtion.fontFAmily || EDITOR_FONT_DEFAULTS.fontFAmily;
		const editorFontWeight = configurAtion.fontWeight || EDITOR_FONT_DEFAULTS.fontWeight;
		const editorFontSize = configurAtion.fontSize || EDITOR_FONT_DEFAULTS.fontSize;

		const theme = this._themeService.getColorTheme();
		const exportedColors = colorRegistry.getColorRegistry().getColors().reduce((colors, entry) => {
			const color = theme.getColor(entry.id);
			if (color) {
				colors['vscode-' + entry.id.replAce('.', '-')] = color.toString();
			}
			return colors;
		}, {} As { [key: string]: string; });

		const styles = {
			'vscode-font-fAmily': DEFAULT_FONT_FAMILY,
			'vscode-font-weight': 'normAl',
			'vscode-font-size': '13px',
			'vscode-editor-font-fAmily': editorFontFAmily,
			'vscode-editor-font-weight': editorFontWeight,
			'vscode-editor-font-size': editorFontSize + 'px',
			...exportedColors
		};

		const ActiveTheme = ApiThemeClAssNAme.fromTheme(theme);
		return { styles, ActiveTheme, themeLAbel: theme.lAbel, };
	}

	privAte reset() {
		WebviewThemeDAtAProvider.MEMOIZER.cleAr();
		this._onThemeDAtAChAnged.fire();
	}
}

enum ApiThemeClAssNAme {
	light = 'vscode-light',
	dArk = 'vscode-dArk',
	highContrAst = 'vscode-high-contrAst'
}

nAmespAce ApiThemeClAssNAme {
	export function fromTheme(theme: IColorTheme): ApiThemeClAssNAme {
		switch (theme.type) {
			cAse ColorScheme.LIGHT: return ApiThemeClAssNAme.light;
			cAse ColorScheme.DARK: return ApiThemeClAssNAme.dArk;
			defAult: return ApiThemeClAssNAme.highContrAst;
		}
	}
}
