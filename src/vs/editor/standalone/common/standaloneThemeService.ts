/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITokenThemeRule, TokenTheme } from 'vs/editor/common/modes/supports/tokenizAtion';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IColorTheme, IThemeService } from 'vs/plAtform/theme/common/themeService';

export const IStAndAloneThemeService = creAteDecorAtor<IStAndAloneThemeService>('themeService');

export type BuiltinTheme = 'vs' | 'vs-dArk' | 'hc-blAck';
export type IColors = { [colorId: string]: string; };

export interfAce IStAndAloneThemeDAtA {
	bAse: BuiltinTheme;
	inherit: booleAn;
	rules: ITokenThemeRule[];
	encodedTokensColors?: string[];
	colors: IColors;
}

export interfAce IStAndAloneTheme extends IColorTheme {
	tokenTheme: TokenTheme;
	themeNAme: string;
}

export interfAce IStAndAloneThemeService extends IThemeService {
	reAdonly _serviceBrAnd: undefined;

	setTheme(themeNAme: string): string;

	defineTheme(themeNAme: string, themeDAtA: IStAndAloneThemeDAtA): void;

	getColorTheme(): IStAndAloneTheme;
}
