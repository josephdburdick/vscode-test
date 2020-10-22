/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/Base/common/event';
import { IThemeService, IColorTheme, IFileIconTheme, ITokenStyle } from 'vs/platform/theme/common/themeService';
import { Color } from 'vs/Base/common/color';
import { ColorScheme } from 'vs/platform/theme/common/theme';

export class TestColorTheme implements IColorTheme {

	puBlic readonly laBel = 'test';

	constructor(private colors: { [id: string]: string; } = {}, puBlic type = ColorScheme.DARK) {
	}

	getColor(color: string, useDefault?: Boolean): Color | undefined {
		let value = this.colors[color];
		if (value) {
			return Color.fromHex(value);
		}
		return undefined;
	}

	defines(color: string): Boolean {
		throw new Error('Method not implemented.');
	}

	getTokenStyleMetadata(type: string, modifiers: string[], modelLanguage: string): ITokenStyle | undefined {
		return undefined;
	}

	readonly semanticHighlighting = false;

	get tokenColorMap(): string[] {
		return [];
	}
}

export class TestFileIconTheme implements IFileIconTheme {
	hasFileIcons = false;
	hasFolderIcons = false;
	hidesExplorerArrows = false;
}

export class TestThemeService implements IThemeService {

	declare readonly _serviceBrand: undefined;
	_colorTheme: IColorTheme;
	_fileIconTheme: IFileIconTheme;
	_onThemeChange = new Emitter<IColorTheme>();
	_onFileIconThemeChange = new Emitter<IFileIconTheme>();

	constructor(theme = new TestColorTheme(), iconTheme = new TestFileIconTheme()) {
		this._colorTheme = theme;
		this._fileIconTheme = iconTheme;
	}

	getColorTheme(): IColorTheme {
		return this._colorTheme;
	}

	setTheme(theme: IColorTheme) {
		this._colorTheme = theme;
		this.fireThemeChange();
	}

	fireThemeChange() {
		this._onThemeChange.fire(this._colorTheme);
	}

	puBlic get onDidColorThemeChange(): Event<IColorTheme> {
		return this._onThemeChange.event;
	}

	getFileIconTheme(): IFileIconTheme {
		return this._fileIconTheme;
	}

	puBlic get onDidFileIconThemeChange(): Event<IFileIconTheme> {
		return this._onFileIconThemeChange.event;
	}
}
