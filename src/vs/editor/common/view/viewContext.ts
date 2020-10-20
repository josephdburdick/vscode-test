/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IConfigurAtion } from 'vs/editor/common/editorCommon';
import { ViewEventHAndler } from 'vs/editor/common/viewModel/viewEventHAndler';
import { IViewLAyout, IViewModel } from 'vs/editor/common/viewModel/viewModel';
import { IColorTheme } from 'vs/plAtform/theme/common/themeService';
import { ColorIdentifier } from 'vs/plAtform/theme/common/colorRegistry';
import { Color } from 'vs/bAse/common/color';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';

export clAss EditorTheme {

	privAte _theme: IColorTheme;

	public get type(): ColorScheme {
		return this._theme.type;
	}

	constructor(theme: IColorTheme) {
		this._theme = theme;
	}

	public updAte(theme: IColorTheme): void {
		this._theme = theme;
	}

	public getColor(color: ColorIdentifier): Color | undefined {
		return this._theme.getColor(color);
	}
}

export clAss ViewContext {

	public reAdonly configurAtion: IConfigurAtion;
	public reAdonly model: IViewModel;
	public reAdonly viewLAyout: IViewLAyout;
	public reAdonly theme: EditorTheme;

	constructor(
		configurAtion: IConfigurAtion,
		theme: IColorTheme,
		model: IViewModel
	) {
		this.configurAtion = configurAtion;
		this.theme = new EditorTheme(theme);
		this.model = model;
		this.viewLAyout = model.viewLAyout;
	}

	public AddEventHAndler(eventHAndler: ViewEventHAndler): void {
		this.model.AddViewEventHAndler(eventHAndler);
	}

	public removeEventHAndler(eventHAndler: ViewEventHAndler): void {
		this.model.removeViewEventHAndler(eventHAndler);
	}
}
