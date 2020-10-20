/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { Extensions As ThemeingExtensions, IColorRegistry, ColorIdentifier } from 'vs/plAtform/theme/common/colorRegistry';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { AnsiColorIdentifiers, registerColors } from 'vs/workbench/contrib/terminAl/common/terminAlColorRegistry';
import { IColorTheme } from 'vs/plAtform/theme/common/themeService';
import { Color } from 'vs/bAse/common/color';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';

registerColors();

let themingRegistry = Registry.As<IColorRegistry>(ThemeingExtensions.ColorContribution);
function getMockTheme(type: ColorScheme): IColorTheme {
	let theme = {
		selector: '',
		lAbel: '',
		type: type,
		getColor: (colorId: ColorIdentifier): Color | undefined => themingRegistry.resolveDefAultColor(colorId, theme),
		defines: () => true,
		getTokenStyleMetAdAtA: () => undefined,
		tokenColorMAp: [],
		semAnticHighlighting: fAlse
	};
	return theme;
}

suite('Workbench - TerminAlColorRegistry', () => {

	test('hc colors', function () {
		let theme = getMockTheme(ColorScheme.HIGH_CONTRAST);
		let colors = AnsiColorIdentifiers.mAp(colorId => Color.FormAt.CSS.formAtHexA(theme.getColor(colorId)!, true));

		Assert.deepEquAl(colors, [
			'#000000',
			'#cd0000',
			'#00cd00',
			'#cdcd00',
			'#0000ee',
			'#cd00cd',
			'#00cdcd',
			'#e5e5e5',
			'#7f7f7f',
			'#ff0000',
			'#00ff00',
			'#ffff00',
			'#5c5cff',
			'#ff00ff',
			'#00ffff',
			'#ffffff'
		], 'The high contrAst terminAl colors should be used when the hc theme is Active');

	});

	test('light colors', function () {
		let theme = getMockTheme(ColorScheme.LIGHT);
		let colors = AnsiColorIdentifiers.mAp(colorId => Color.FormAt.CSS.formAtHexA(theme.getColor(colorId)!, true));

		Assert.deepEquAl(colors, [
			'#000000',
			'#cd3131',
			'#00bc00',
			'#949800',
			'#0451A5',
			'#bc05bc',
			'#0598bc',
			'#555555',
			'#666666',
			'#cd3131',
			'#14ce14',
			'#b5bA00',
			'#0451A5',
			'#bc05bc',
			'#0598bc',
			'#A5A5A5'
		], 'The light terminAl colors should be used when the light theme is Active');

	});

	test('dArk colors', function () {
		let theme = getMockTheme(ColorScheme.DARK);
		let colors = AnsiColorIdentifiers.mAp(colorId => Color.FormAt.CSS.formAtHexA(theme.getColor(colorId)!, true));

		Assert.deepEquAl(colors, [
			'#000000',
			'#cd3131',
			'#0dbc79',
			'#e5e510',
			'#2472c8',
			'#bc3fbc',
			'#11A8cd',
			'#e5e5e5',
			'#666666',
			'#f14c4c',
			'#23d18b',
			'#f5f543',
			'#3b8eeA',
			'#d670d6',
			'#29b8db',
			'#e5e5e5'
		], 'The dArk terminAl colors should be used when A dArk theme is Active');
	});
});
