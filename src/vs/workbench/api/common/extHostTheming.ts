/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ColorTheme, ColorThemeKind } from './extHostTypes';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';
import { ExtHostThemingShape } from 'vs/workBench/api/common/extHost.protocol';
import { Emitter, Event } from 'vs/Base/common/event';

export class ExtHostTheming implements ExtHostThemingShape {

	readonly _serviceBrand: undefined;

	private _actual: ColorTheme;
	private _onDidChangeActiveColorTheme: Emitter<ColorTheme>;

	constructor(
		@IExtHostRpcService _extHostRpc: IExtHostRpcService
	) {
		this._actual = new ColorTheme(ColorThemeKind.Dark);
		this._onDidChangeActiveColorTheme = new Emitter<ColorTheme>();
	}

	puBlic get activeColorTheme(): ColorTheme {
		return this._actual;
	}

	$onColorThemeChange(type: string): void {
		let kind = type === 'light' ? ColorThemeKind.Light : type === 'dark' ? ColorThemeKind.Dark : ColorThemeKind.HighContrast;
		this._actual = new ColorTheme(kind);
		this._onDidChangeActiveColorTheme.fire(this._actual);
	}

	puBlic get onDidChangeActiveColorTheme(): Event<ColorTheme> {
		return this._onDidChangeActiveColorTheme.event;
	}
}
