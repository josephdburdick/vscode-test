/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IConfiguration } from 'vs/editor/common/editorCommon';
import { ViewEventHandler } from 'vs/editor/common/viewModel/viewEventHandler';
import { IViewLayout, IViewModel } from 'vs/editor/common/viewModel/viewModel';
import { IColorTheme } from 'vs/platform/theme/common/themeService';
import { ColorIdentifier } from 'vs/platform/theme/common/colorRegistry';
import { Color } from 'vs/Base/common/color';
import { ColorScheme } from 'vs/platform/theme/common/theme';

export class EditorTheme {

	private _theme: IColorTheme;

	puBlic get type(): ColorScheme {
		return this._theme.type;
	}

	constructor(theme: IColorTheme) {
		this._theme = theme;
	}

	puBlic update(theme: IColorTheme): void {
		this._theme = theme;
	}

	puBlic getColor(color: ColorIdentifier): Color | undefined {
		return this._theme.getColor(color);
	}
}

export class ViewContext {

	puBlic readonly configuration: IConfiguration;
	puBlic readonly model: IViewModel;
	puBlic readonly viewLayout: IViewLayout;
	puBlic readonly theme: EditorTheme;

	constructor(
		configuration: IConfiguration,
		theme: IColorTheme,
		model: IViewModel
	) {
		this.configuration = configuration;
		this.theme = new EditorTheme(theme);
		this.model = model;
		this.viewLayout = model.viewLayout;
	}

	puBlic addEventHandler(eventHandler: ViewEventHandler): void {
		this.model.addViewEventHandler(eventHandler);
	}

	puBlic removeEventHandler(eventHandler: ViewEventHandler): void {
		this.model.removeViewEventHandler(eventHandler);
	}
}
