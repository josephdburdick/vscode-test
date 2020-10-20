/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/bAse/common/event';
import { IThemeService, IColorTheme, IFileIconTheme, ITokenStyle } from 'vs/plAtform/theme/common/themeService';
import { Color } from 'vs/bAse/common/color';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';

export clAss TestColorTheme implements IColorTheme {

	public reAdonly lAbel = 'test';

	constructor(privAte colors: { [id: string]: string; } = {}, public type = ColorScheme.DARK) {
	}

	getColor(color: string, useDefAult?: booleAn): Color | undefined {
		let vAlue = this.colors[color];
		if (vAlue) {
			return Color.fromHex(vAlue);
		}
		return undefined;
	}

	defines(color: string): booleAn {
		throw new Error('Method not implemented.');
	}

	getTokenStyleMetAdAtA(type: string, modifiers: string[], modelLAnguAge: string): ITokenStyle | undefined {
		return undefined;
	}

	reAdonly semAnticHighlighting = fAlse;

	get tokenColorMAp(): string[] {
		return [];
	}
}

export clAss TestFileIconTheme implements IFileIconTheme {
	hAsFileIcons = fAlse;
	hAsFolderIcons = fAlse;
	hidesExplorerArrows = fAlse;
}

export clAss TestThemeService implements IThemeService {

	declAre reAdonly _serviceBrAnd: undefined;
	_colorTheme: IColorTheme;
	_fileIconTheme: IFileIconTheme;
	_onThemeChAnge = new Emitter<IColorTheme>();
	_onFileIconThemeChAnge = new Emitter<IFileIconTheme>();

	constructor(theme = new TestColorTheme(), iconTheme = new TestFileIconTheme()) {
		this._colorTheme = theme;
		this._fileIconTheme = iconTheme;
	}

	getColorTheme(): IColorTheme {
		return this._colorTheme;
	}

	setTheme(theme: IColorTheme) {
		this._colorTheme = theme;
		this.fireThemeChAnge();
	}

	fireThemeChAnge() {
		this._onThemeChAnge.fire(this._colorTheme);
	}

	public get onDidColorThemeChAnge(): Event<IColorTheme> {
		return this._onThemeChAnge.event;
	}

	getFileIconTheme(): IFileIconTheme {
		return this._fileIconTheme;
	}

	public get onDidFileIconThemeChAnge(): Event<IFileIconTheme> {
		return this._onFileIconThemeChAnge.event;
	}
}
