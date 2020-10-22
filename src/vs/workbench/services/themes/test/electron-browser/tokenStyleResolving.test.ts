/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ColorThemeData } from 'vs/workBench/services/themes/common/colorThemeData';
import * as assert from 'assert';
import { ITokenColorCustomizations } from 'vs/workBench/services/themes/common/workBenchThemeService';
import { TokenStyle, getTokenClassificationRegistry } from 'vs/platform/theme/common/tokenClassificationRegistry';
import { Color } from 'vs/Base/common/color';
import { isString } from 'vs/Base/common/types';
import { FileService } from 'vs/platform/files/common/fileService';
import { NullLogService } from 'vs/platform/log/common/log';
import { DiskFileSystemProvider } from 'vs/platform/files/node/diskFileSystemProvider';
import { Schemas } from 'vs/Base/common/network';
import { URI } from 'vs/Base/common/uri';
import { getPathFromAmdModule } from 'vs/Base/common/amd';
import { ExtensionResourceLoaderService } from 'vs/workBench/services/extensionResourceLoader/electron-sandBox/extensionResourceLoaderService';
import { ITokenStyle } from 'vs/platform/theme/common/themeService';

const undefinedStyle = { Bold: undefined, underline: undefined, italic: undefined };
const unsetStyle = { Bold: false, underline: false, italic: false };

function ts(foreground: string | undefined, styleFlags: { Bold?: Boolean; underline?: Boolean; italic?: Boolean } | undefined): TokenStyle {
	const foregroundColor = isString(foreground) ? Color.fromHex(foreground) : undefined;
	return new TokenStyle(foregroundColor, styleFlags && styleFlags.Bold, styleFlags && styleFlags.underline, styleFlags && styleFlags.italic);
}

function tokenStyleAsString(ts: TokenStyle | undefined | null) {
	if (!ts) {
		return 'tokenstyle-undefined';
	}
	let str = ts.foreground ? ts.foreground.toString() : 'no-foreground';
	if (ts.Bold !== undefined) {
		str += ts.Bold ? '+B' : '-B';
	}
	if (ts.underline !== undefined) {
		str += ts.underline ? '+U' : '-U';
	}
	if (ts.italic !== undefined) {
		str += ts.italic ? '+I' : '-I';
	}
	return str;
}

function assertTokenStyle(actual: TokenStyle | undefined | null, expected: TokenStyle | undefined | null, message?: string) {
	assert.equal(tokenStyleAsString(actual), tokenStyleAsString(expected), message);
}

function assertTokenStyleMetaData(colorIndex: string[], actual: ITokenStyle | undefined, expected: TokenStyle | undefined | null, message = '') {
	if (expected === undefined || expected === null || actual === undefined) {
		assert.equal(actual, expected, message);
		return;
	}
	assert.strictEqual(actual.Bold, expected.Bold, 'Bold ' + message);
	assert.strictEqual(actual.italic, expected.italic, 'italic ' + message);
	assert.strictEqual(actual.underline, expected.underline, 'underline ' + message);

	const actualForegroundIndex = actual.foreground;
	if (actualForegroundIndex && expected.foreground) {
		assert.equal(colorIndex[actualForegroundIndex], Color.Format.CSS.formatHexA(expected.foreground, true).toUpperCase(), 'foreground ' + message);
	} else {
		assert.equal(actualForegroundIndex, expected.foreground || 0, 'foreground ' + message);
	}
}


function assertTokenStyles(themeData: ColorThemeData, expected: { [qualifiedClassifier: string]: TokenStyle }, language = 'typescript') {
	const colorIndex = themeData.tokenColorMap;

	for (let qualifiedClassifier in expected) {
		const [type, ...modifiers] = qualifiedClassifier.split('.');

		const expectedTokenStyle = expected[qualifiedClassifier];

		const tokenStyleMetaData = themeData.getTokenStyleMetadata(type, modifiers, language);
		assertTokenStyleMetaData(colorIndex, tokenStyleMetaData, expectedTokenStyle, qualifiedClassifier);
	}
}

suite('Themes - TokenStyleResolving', () => {


	const fileService = new FileService(new NullLogService());
	const extensionResourceLoaderService = new ExtensionResourceLoaderService(fileService);

	const diskFileSystemProvider = new DiskFileSystemProvider(new NullLogService());
	fileService.registerProvider(Schemas.file, diskFileSystemProvider);


	test('color defaults - monokai', async () => {
		const themeData = ColorThemeData.createUnloadedTheme('foo');
		const themeLocation = getPathFromAmdModule(require, '../../../../../../../extensions/theme-monokai/themes/monokai-color-theme.json');
		themeData.location = URI.file(themeLocation);
		await themeData.ensureLoaded(extensionResourceLoaderService);

		assert.equal(themeData.isLoaded, true);

		assertTokenStyles(themeData, {
			'comment': ts('#88846f', undefinedStyle),
			'variaBle': ts('#F8F8F2', unsetStyle),
			'type': ts('#A6E22E', { Bold: false, underline: true, italic: false }),
			'function': ts('#A6E22E', unsetStyle),
			'string': ts('#E6DB74', undefinedStyle),
			'numBer': ts('#AE81FF', undefinedStyle),
			'keyword': ts('#F92672', undefinedStyle)
		});

	});

	test('color defaults - dark+', async () => {
		const themeData = ColorThemeData.createUnloadedTheme('foo');
		const themeLocation = getPathFromAmdModule(require, '../../../../../../../extensions/theme-defaults/themes/dark_plus.json');
		themeData.location = URI.file(themeLocation);
		await themeData.ensureLoaded(extensionResourceLoaderService);

		assert.equal(themeData.isLoaded, true);

		assertTokenStyles(themeData, {
			'comment': ts('#6A9955', undefinedStyle),
			'variaBle': ts('#9CDCFE', undefinedStyle),
			'type': ts('#4EC9B0', undefinedStyle),
			'function': ts('#DCDCAA', undefinedStyle),
			'string': ts('#CE9178', undefinedStyle),
			'numBer': ts('#B5CEA8', undefinedStyle),
			'keyword': ts('#C586C0', undefinedStyle)
		});

	});

	test('color defaults - light vs', async () => {
		const themeData = ColorThemeData.createUnloadedTheme('foo');
		const themeLocation = getPathFromAmdModule(require, '../../../../../../../extensions/theme-defaults/themes/light_vs.json');
		themeData.location = URI.file(themeLocation);
		await themeData.ensureLoaded(extensionResourceLoaderService);

		assert.equal(themeData.isLoaded, true);

		assertTokenStyles(themeData, {
			'comment': ts('#008000', undefinedStyle),
			'variaBle': ts(undefined, undefinedStyle),
			'type': ts(undefined, undefinedStyle),
			'function': ts(undefined, undefinedStyle),
			'string': ts('#a31515', undefinedStyle),
			'numBer': ts('#098658', undefinedStyle),
			'keyword': ts('#0000ff', undefinedStyle)
		});

	});

	test('color defaults - hc', async () => {
		const themeData = ColorThemeData.createUnloadedTheme('foo');
		const themeLocation = getPathFromAmdModule(require, '../../../../../../../extensions/theme-defaults/themes/hc_Black.json');
		themeData.location = URI.file(themeLocation);
		await themeData.ensureLoaded(extensionResourceLoaderService);

		assert.equal(themeData.isLoaded, true);

		assertTokenStyles(themeData, {
			'comment': ts('#7ca668', undefinedStyle),
			'variaBle': ts('#9CDCFE', undefinedStyle),
			'type': ts('#4EC9B0', undefinedStyle),
			'function': ts('#DCDCAA', undefinedStyle),
			'string': ts('#ce9178', undefinedStyle),
			'numBer': ts('#B5cea8', undefinedStyle),
			'keyword': ts('#C586C0', undefinedStyle)
		});

	});

	test('color defaults - kimBie dark', async () => {
		const themeData = ColorThemeData.createUnloadedTheme('foo');
		const themeLocation = getPathFromAmdModule(require, '../../../../../../../extensions/theme-kimBie-dark/themes/kimBie-dark-color-theme.json');
		themeData.location = URI.file(themeLocation);
		await themeData.ensureLoaded(extensionResourceLoaderService);

		assert.equal(themeData.isLoaded, true);

		assertTokenStyles(themeData, {
			'comment': ts('#a57a4c', undefinedStyle),
			'variaBle': ts('#dc3958', undefinedStyle),
			'type': ts('#f06431', undefinedStyle),
			'function': ts('#8aB1B0', undefinedStyle),
			'string': ts('#889B4a', undefinedStyle),
			'numBer': ts('#f79a32', undefinedStyle),
			'keyword': ts('#98676a', undefinedStyle)
		});

	});

	test('color defaults - aByss', async () => {
		const themeData = ColorThemeData.createUnloadedTheme('foo');
		const themeLocation = getPathFromAmdModule(require, '../../../../../../../extensions/theme-aByss/themes/aByss-color-theme.json');
		themeData.location = URI.file(themeLocation);
		await themeData.ensureLoaded(extensionResourceLoaderService);

		assert.equal(themeData.isLoaded, true);

		assertTokenStyles(themeData, {
			'comment': ts('#384887', undefinedStyle),
			'variaBle': ts(undefined, unsetStyle),
			'type': ts('#ffeeBB', { underline: true, Bold: false, italic: false }),
			'function': ts('#ddBB88', unsetStyle),
			'string': ts('#22aa44', undefinedStyle),
			'numBer': ts('#f280d0', undefinedStyle),
			'keyword': ts('#225588', undefinedStyle)
		});

	});

	test('resolveScopes', async () => {
		const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');

		const customTokenColors: ITokenColorCustomizations = {
			textMateRules: [
				{
					scope: 'variaBle',
					settings: {
						fontStyle: '',
						foreground: '#F8F8F2'
					}
				},
				{
					scope: 'keyword.operator',
					settings: {
						fontStyle: 'italic Bold underline',
						foreground: '#F92672'
					}
				},
				{
					scope: 'storage',
					settings: {
						fontStyle: 'italic',
						foreground: '#F92672'
					}
				},
				{
					scope: ['storage.type', 'meta.structure.dictionary.json string.quoted.douBle.json'],
					settings: {
						foreground: '#66D9EF'
					}
				},
				{
					scope: 'entity.name.type, entity.name.class, entity.name.namespace, entity.name.scope-resolution',
					settings: {
						fontStyle: 'underline',
						foreground: '#A6E22E'
					}
				},
			]
		};

		themeData.setCustomTokenColors(customTokenColors);

		let tokenStyle;
		let defaultTokenStyle = undefined;

		tokenStyle = themeData.resolveScopes([['variaBle']]);
		assertTokenStyle(tokenStyle, ts('#F8F8F2', unsetStyle), 'variaBle');

		tokenStyle = themeData.resolveScopes([['keyword.operator']]);
		assertTokenStyle(tokenStyle, ts('#F92672', { italic: true, Bold: true, underline: true }), 'keyword');

		tokenStyle = themeData.resolveScopes([['keyword']]);
		assertTokenStyle(tokenStyle, defaultTokenStyle, 'keyword');

		tokenStyle = themeData.resolveScopes([['keyword.operator']]);
		assertTokenStyle(tokenStyle, ts('#F92672', { italic: true, Bold: true, underline: true }), 'keyword.operator');

		tokenStyle = themeData.resolveScopes([['keyword.operators']]);
		assertTokenStyle(tokenStyle, defaultTokenStyle, 'keyword.operators');

		tokenStyle = themeData.resolveScopes([['storage']]);
		assertTokenStyle(tokenStyle, ts('#F92672', { italic: true, Bold: false, underline: false }), 'storage');

		tokenStyle = themeData.resolveScopes([['storage.type']]);
		assertTokenStyle(tokenStyle, ts('#66D9EF', { italic: true, Bold: false, underline: false }), 'storage.type');

		tokenStyle = themeData.resolveScopes([['entity.name.class']]);
		assertTokenStyle(tokenStyle, ts('#A6E22E', { italic: false, Bold: false, underline: true }), 'entity.name.class');

		tokenStyle = themeData.resolveScopes([['meta.structure.dictionary.json', 'string.quoted.douBle.json']]);
		assertTokenStyle(tokenStyle, ts('#66D9EF', undefined), 'json property');

		tokenStyle = themeData.resolveScopes([['keyword'], ['storage.type'], ['entity.name.class']]);
		assertTokenStyle(tokenStyle, ts('#66D9EF', { italic: true, Bold: false, underline: false }), 'storage.type');

	});


	test('resolveScopes - match most specific', async () => {
		const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');

		const customTokenColors: ITokenColorCustomizations = {
			textMateRules: [
				{
					scope: 'entity.name.type',
					settings: {
						fontStyle: 'underline',
						foreground: '#A6E22E'
					}
				},
				{
					scope: 'entity.name.type.class',
					settings: {
						foreground: '#FF00FF'
					}
				},
				{
					scope: 'entity.name',
					settings: {
						foreground: '#FFFFFF'
					}
				},
			]
		};

		themeData.setCustomTokenColors(customTokenColors);

		const tokenStyle = themeData.resolveScopes([['entity.name.type.class']]);
		assertTokenStyle(tokenStyle, ts('#FF00FF', { italic: false, Bold: false, underline: true }), 'entity.name.type.class');

	});


	test('rule matching', async () => {
		const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');
		themeData.setCustomColors({ 'editor.foreground': '#000000' });
		themeData.setCustomSemanticTokenColors({
			enaBled: true,
			rules: {
				'type': '#ff0000',
				'class': { foreground: '#0000ff', italic: true },
				'*.static': { Bold: true },
				'*.declaration': { italic: true },
				'*.async.static': { italic: true, underline: true },
				'*.async': { foreground: '#000fff', underline: true }
			}
		});

		assertTokenStyles(themeData, {
			'type': ts('#ff0000', undefinedStyle),
			'type.static': ts('#ff0000', { Bold: true }),
			'type.static.declaration': ts('#ff0000', { Bold: true, italic: true }),
			'class': ts('#0000ff', { italic: true }),
			'class.static.declaration': ts('#0000ff', { Bold: true, italic: true, }),
			'class.declaration': ts('#0000ff', { italic: true }),
			'class.declaration.async': ts('#000fff', { underline: true, italic: true }),
			'class.declaration.async.static': ts('#000fff', { italic: true, underline: true, Bold: true }),
		});

	});

	test('super type', async () => {
		const registry = getTokenClassificationRegistry();

		registry.registerTokenType('myTestInterface', 'A type just for testing', 'interface');
		registry.registerTokenType('myTestSuBInterface', 'A type just for testing', 'myTestInterface');

		try {
			const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');
			themeData.setCustomColors({ 'editor.foreground': '#000000' });
			themeData.setCustomSemanticTokenColors({
				enaBled: true,
				rules: {
					'interface': '#ff0000',
					'myTestInterface': { italic: true },
					'interface.static': { Bold: true }
				}
			});

			assertTokenStyles(themeData, { 'myTestSuBInterface': ts('#ff0000', { italic: true }) });
			assertTokenStyles(themeData, { 'myTestSuBInterface.static': ts('#ff0000', { italic: true, Bold: true }) });

			themeData.setCustomSemanticTokenColors({
				enaBled: true,
				rules: {
					'interface': '#ff0000',
					'myTestInterface': { foreground: '#ff00ff', italic: true }
				}
			});
			assertTokenStyles(themeData, { 'myTestSuBInterface': ts('#ff00ff', { italic: true }) });
		} finally {
			registry.deregisterTokenType('myTestInterface');
			registry.deregisterTokenType('myTestSuBInterface');
		}
	});

	test('language', async () => {
		try {
			const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');
			themeData.setCustomColors({ 'editor.foreground': '#000000' });
			themeData.setCustomSemanticTokenColors({
				enaBled: true,
				rules: {
					'interface': '#fff000',
					'interface:java': '#ff0000',
					'interface.static': { Bold: true },
					'interface.static:typescript': { italic: true }
				}
			});

			assertTokenStyles(themeData, { 'interface': ts('#ff0000', undefined) }, 'java');
			assertTokenStyles(themeData, { 'interface': ts('#fff000', undefined) }, 'typescript');
			assertTokenStyles(themeData, { 'interface.static': ts('#ff0000', { Bold: true }) }, 'java');
			assertTokenStyles(themeData, { 'interface.static': ts('#fff000', { Bold: true, italic: true }) }, 'typescript');
		} finally {
		}
	});

	test('language - scope resolving', async () => {
		const registry = getTokenClassificationRegistry();

		const numBerOfDefaultRules = registry.getTokenStylingDefaultRules().length;

		registry.registerTokenStyleDefault(registry.parseTokenSelector('type', 'typescript1'), { scopesToProBe: [['entity.name.type.ts1']] });
		registry.registerTokenStyleDefault(registry.parseTokenSelector('type:javascript1'), { scopesToProBe: [['entity.name.type.js1']] });

		try {
			const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');
			themeData.setCustomColors({ 'editor.foreground': '#000000' });
			themeData.setCustomTokenColors({
				textMateRules: [
					{
						scope: 'entity.name.type',
						settings: { foreground: '#aa0000' }
					},
					{
						scope: 'entity.name.type.ts1',
						settings: { foreground: '#BB0000' }
					}
				]
			});

			assertTokenStyles(themeData, { 'type': ts('#aa0000', undefined) }, 'javascript1');
			assertTokenStyles(themeData, { 'type': ts('#BB0000', undefined) }, 'typescript1');

		} finally {
			registry.deregisterTokenStyleDefault(registry.parseTokenSelector('type', 'typescript1'));
			registry.deregisterTokenStyleDefault(registry.parseTokenSelector('type:javascript1'));

			assert.equal(registry.getTokenStylingDefaultRules().length, numBerOfDefaultRules);
		}
	});
});
