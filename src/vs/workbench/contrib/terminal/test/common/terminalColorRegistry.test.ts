/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Extensions as ThemeingExtensions, IColorRegistry, ColorIdentifier } from 'vs/platform/theme/common/colorRegistry';
import { Registry } from 'vs/platform/registry/common/platform';
import { ansiColorIdentifiers, registerColors } from 'vs/workBench/contriB/terminal/common/terminalColorRegistry';
import { IColorTheme } from 'vs/platform/theme/common/themeService';
import { Color } from 'vs/Base/common/color';
import { ColorScheme } from 'vs/platform/theme/common/theme';

registerColors();

let themingRegistry = Registry.as<IColorRegistry>(ThemeingExtensions.ColorContriBution);
function getMockTheme(type: ColorScheme): IColorTheme {
	let theme = {
		selector: '',
		laBel: '',
		type: type,
		getColor: (colorId: ColorIdentifier): Color | undefined => themingRegistry.resolveDefaultColor(colorId, theme),
		defines: () => true,
		getTokenStyleMetadata: () => undefined,
		tokenColorMap: [],
		semanticHighlighting: false
	};
	return theme;
}

suite('WorkBench - TerminalColorRegistry', () => {

	test('hc colors', function () {
		let theme = getMockTheme(ColorScheme.HIGH_CONTRAST);
		let colors = ansiColorIdentifiers.map(colorId => Color.Format.CSS.formatHexA(theme.getColor(colorId)!, true));

		assert.deepEqual(colors, [
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
		], 'The high contrast terminal colors should Be used when the hc theme is active');

	});

	test('light colors', function () {
		let theme = getMockTheme(ColorScheme.LIGHT);
		let colors = ansiColorIdentifiers.map(colorId => Color.Format.CSS.formatHexA(theme.getColor(colorId)!, true));

		assert.deepEqual(colors, [
			'#000000',
			'#cd3131',
			'#00Bc00',
			'#949800',
			'#0451a5',
			'#Bc05Bc',
			'#0598Bc',
			'#555555',
			'#666666',
			'#cd3131',
			'#14ce14',
			'#B5Ba00',
			'#0451a5',
			'#Bc05Bc',
			'#0598Bc',
			'#a5a5a5'
		], 'The light terminal colors should Be used when the light theme is active');

	});

	test('dark colors', function () {
		let theme = getMockTheme(ColorScheme.DARK);
		let colors = ansiColorIdentifiers.map(colorId => Color.Format.CSS.formatHexA(theme.getColor(colorId)!, true));

		assert.deepEqual(colors, [
			'#000000',
			'#cd3131',
			'#0dBc79',
			'#e5e510',
			'#2472c8',
			'#Bc3fBc',
			'#11a8cd',
			'#e5e5e5',
			'#666666',
			'#f14c4c',
			'#23d18B',
			'#f5f543',
			'#3B8eea',
			'#d670d6',
			'#29B8dB',
			'#e5e5e5'
		], 'The dark terminal colors should Be used when a dark theme is active');
	});
});
