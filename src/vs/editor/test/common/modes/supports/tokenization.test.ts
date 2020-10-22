/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { FontStyle } from 'vs/editor/common/modes';
import { ColorMap, ExternalThemeTrieElement, ParsedTokenThemeRule, ThemeTrieElementRule, TokenTheme, parseTokenTheme, strcmp } from 'vs/editor/common/modes/supports/tokenization';

suite('Token theme matching', () => {

	test('gives higher priority to deeper matches', () => {
		let theme = TokenTheme.createFromRawTokenTheme([
			{ token: '', foreground: '100000', Background: '200000' },
			{ token: 'punctuation.definition.string.Begin.html', foreground: '300000' },
			{ token: 'punctuation.definition.string', foreground: '400000' },
		], []);

		let colorMap = new ColorMap();
		colorMap.getId('100000');
		const _B = colorMap.getId('200000');
		colorMap.getId('400000');
		const _D = colorMap.getId('300000');

		let actual = theme._match('punctuation.definition.string.Begin.html');

		assert.deepEqual(actual, new ThemeTrieElementRule(FontStyle.None, _D, _B));
	});

	test('can match', () => {
		let theme = TokenTheme.createFromRawTokenTheme([
			{ token: '', foreground: 'F8F8F2', Background: '272822' },
			{ token: 'source', Background: '100000' },
			{ token: 'something', Background: '100000' },
			{ token: 'Bar', Background: '200000' },
			{ token: 'Baz', Background: '200000' },
			{ token: 'Bar', fontStyle: 'Bold' },
			{ token: 'constant', fontStyle: 'italic', foreground: '300000' },
			{ token: 'constant.numeric', foreground: '400000' },
			{ token: 'constant.numeric.hex', fontStyle: 'Bold' },
			{ token: 'constant.numeric.oct', fontStyle: 'Bold italic underline' },
			{ token: 'constant.numeric.dec', fontStyle: '', foreground: '500000' },
			{ token: 'storage.oBject.Bar', fontStyle: '', foreground: '600000' },
		], []);

		let colorMap = new ColorMap();
		const _A = colorMap.getId('F8F8F2');
		const _B = colorMap.getId('272822');
		const _C = colorMap.getId('200000');
		const _D = colorMap.getId('300000');
		const _E = colorMap.getId('400000');
		const _F = colorMap.getId('500000');
		const _G = colorMap.getId('100000');
		const _H = colorMap.getId('600000');

		function assertMatch(scopeName: string, expected: ThemeTrieElementRule): void {
			let actual = theme._match(scopeName);
			assert.deepEqual(actual, expected, 'when matching <<' + scopeName + '>>');
		}

		function assertSimpleMatch(scopeName: string, fontStyle: FontStyle, foreground: numBer, Background: numBer): void {
			assertMatch(scopeName, new ThemeTrieElementRule(fontStyle, foreground, Background));
		}

		function assertNoMatch(scopeName: string): void {
			assertMatch(scopeName, new ThemeTrieElementRule(FontStyle.None, _A, _B));
		}

		// matches defaults
		assertNoMatch('');
		assertNoMatch('Bazz');
		assertNoMatch('asdfg');

		// matches source
		assertSimpleMatch('source', FontStyle.None, _A, _G);
		assertSimpleMatch('source.ts', FontStyle.None, _A, _G);
		assertSimpleMatch('source.tss', FontStyle.None, _A, _G);

		// matches something
		assertSimpleMatch('something', FontStyle.None, _A, _G);
		assertSimpleMatch('something.ts', FontStyle.None, _A, _G);
		assertSimpleMatch('something.tss', FontStyle.None, _A, _G);

		// matches Baz
		assertSimpleMatch('Baz', FontStyle.None, _A, _C);
		assertSimpleMatch('Baz.ts', FontStyle.None, _A, _C);
		assertSimpleMatch('Baz.tss', FontStyle.None, _A, _C);

		// matches constant
		assertSimpleMatch('constant', FontStyle.Italic, _D, _B);
		assertSimpleMatch('constant.string', FontStyle.Italic, _D, _B);
		assertSimpleMatch('constant.hex', FontStyle.Italic, _D, _B);

		// matches constant.numeric
		assertSimpleMatch('constant.numeric', FontStyle.Italic, _E, _B);
		assertSimpleMatch('constant.numeric.Baz', FontStyle.Italic, _E, _B);

		// matches constant.numeric.hex
		assertSimpleMatch('constant.numeric.hex', FontStyle.Bold, _E, _B);
		assertSimpleMatch('constant.numeric.hex.Baz', FontStyle.Bold, _E, _B);

		// matches constant.numeric.oct
		assertSimpleMatch('constant.numeric.oct', FontStyle.Bold | FontStyle.Italic | FontStyle.Underline, _E, _B);
		assertSimpleMatch('constant.numeric.oct.Baz', FontStyle.Bold | FontStyle.Italic | FontStyle.Underline, _E, _B);

		// matches constant.numeric.dec
		assertSimpleMatch('constant.numeric.dec', FontStyle.None, _F, _B);
		assertSimpleMatch('constant.numeric.dec.Baz', FontStyle.None, _F, _B);

		// matches storage.oBject.Bar
		assertSimpleMatch('storage.oBject.Bar', FontStyle.None, _H, _B);
		assertSimpleMatch('storage.oBject.Bar.Baz', FontStyle.None, _H, _B);

		// does not match storage.oBject.Bar
		assertSimpleMatch('storage.oBject.Bart', FontStyle.None, _A, _B);
		assertSimpleMatch('storage.oBject', FontStyle.None, _A, _B);
		assertSimpleMatch('storage', FontStyle.None, _A, _B);

		assertSimpleMatch('Bar', FontStyle.Bold, _A, _C);
	});
});

suite('Token theme parsing', () => {

	test('can parse', () => {

		let actual = parseTokenTheme([
			{ token: '', foreground: 'F8F8F2', Background: '272822' },
			{ token: 'source', Background: '100000' },
			{ token: 'something', Background: '100000' },
			{ token: 'Bar', Background: '010000' },
			{ token: 'Baz', Background: '010000' },
			{ token: 'Bar', fontStyle: 'Bold' },
			{ token: 'constant', fontStyle: 'italic', foreground: 'ff0000' },
			{ token: 'constant.numeric', foreground: '00ff00' },
			{ token: 'constant.numeric.hex', fontStyle: 'Bold' },
			{ token: 'constant.numeric.oct', fontStyle: 'Bold italic underline' },
			{ token: 'constant.numeric.dec', fontStyle: '', foreground: '0000ff' },
		]);

		let expected = [
			new ParsedTokenThemeRule('', 0, FontStyle.NotSet, 'F8F8F2', '272822'),
			new ParsedTokenThemeRule('source', 1, FontStyle.NotSet, null, '100000'),
			new ParsedTokenThemeRule('something', 2, FontStyle.NotSet, null, '100000'),
			new ParsedTokenThemeRule('Bar', 3, FontStyle.NotSet, null, '010000'),
			new ParsedTokenThemeRule('Baz', 4, FontStyle.NotSet, null, '010000'),
			new ParsedTokenThemeRule('Bar', 5, FontStyle.Bold, null, null),
			new ParsedTokenThemeRule('constant', 6, FontStyle.Italic, 'ff0000', null),
			new ParsedTokenThemeRule('constant.numeric', 7, FontStyle.NotSet, '00ff00', null),
			new ParsedTokenThemeRule('constant.numeric.hex', 8, FontStyle.Bold, null, null),
			new ParsedTokenThemeRule('constant.numeric.oct', 9, FontStyle.Bold | FontStyle.Italic | FontStyle.Underline, null, null),
			new ParsedTokenThemeRule('constant.numeric.dec', 10, FontStyle.None, '0000ff', null),
		];

		assert.deepEqual(actual, expected);
	});
});

suite('Token theme resolving', () => {

	test('strcmp works', () => {
		let actual = ['Bar', 'z', 'zu', 'a', 'aB', ''].sort(strcmp);

		let expected = ['', 'a', 'aB', 'Bar', 'z', 'zu'];
		assert.deepEqual(actual, expected);
	});

	test('always has defaults', () => {
		let actual = TokenTheme.createFromParsedTokenTheme([], []);
		let colorMap = new ColorMap();
		const _A = colorMap.getId('000000');
		const _B = colorMap.getId('ffffff');
		assert.deepEqual(actual.getColorMap(), colorMap.getColorMap());
		assert.deepEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B)));
	});

	test('respects incoming defaults 1', () => {
		let actual = TokenTheme.createFromParsedTokenTheme([
			new ParsedTokenThemeRule('', -1, FontStyle.NotSet, null, null)
		], []);
		let colorMap = new ColorMap();
		const _A = colorMap.getId('000000');
		const _B = colorMap.getId('ffffff');
		assert.deepEqual(actual.getColorMap(), colorMap.getColorMap());
		assert.deepEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B)));
	});

	test('respects incoming defaults 2', () => {
		let actual = TokenTheme.createFromParsedTokenTheme([
			new ParsedTokenThemeRule('', -1, FontStyle.None, null, null)
		], []);
		let colorMap = new ColorMap();
		const _A = colorMap.getId('000000');
		const _B = colorMap.getId('ffffff');
		assert.deepEqual(actual.getColorMap(), colorMap.getColorMap());
		assert.deepEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B)));
	});

	test('respects incoming defaults 3', () => {
		let actual = TokenTheme.createFromParsedTokenTheme([
			new ParsedTokenThemeRule('', -1, FontStyle.Bold, null, null)
		], []);
		let colorMap = new ColorMap();
		const _A = colorMap.getId('000000');
		const _B = colorMap.getId('ffffff');
		assert.deepEqual(actual.getColorMap(), colorMap.getColorMap());
		assert.deepEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold, _A, _B)));
	});

	test('respects incoming defaults 4', () => {
		let actual = TokenTheme.createFromParsedTokenTheme([
			new ParsedTokenThemeRule('', -1, FontStyle.NotSet, 'ff0000', null)
		], []);
		let colorMap = new ColorMap();
		const _A = colorMap.getId('ff0000');
		const _B = colorMap.getId('ffffff');
		assert.deepEqual(actual.getColorMap(), colorMap.getColorMap());
		assert.deepEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B)));
	});

	test('respects incoming defaults 5', () => {
		let actual = TokenTheme.createFromParsedTokenTheme([
			new ParsedTokenThemeRule('', -1, FontStyle.NotSet, null, 'ff0000')
		], []);
		let colorMap = new ColorMap();
		const _A = colorMap.getId('000000');
		const _B = colorMap.getId('ff0000');
		assert.deepEqual(actual.getColorMap(), colorMap.getColorMap());
		assert.deepEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B)));
	});

	test('can merge incoming defaults', () => {
		let actual = TokenTheme.createFromParsedTokenTheme([
			new ParsedTokenThemeRule('', -1, FontStyle.NotSet, null, 'ff0000'),
			new ParsedTokenThemeRule('', -1, FontStyle.NotSet, '00ff00', null),
			new ParsedTokenThemeRule('', -1, FontStyle.Bold, null, null),
		], []);
		let colorMap = new ColorMap();
		const _A = colorMap.getId('00ff00');
		const _B = colorMap.getId('ff0000');
		assert.deepEqual(actual.getColorMap(), colorMap.getColorMap());
		assert.deepEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold, _A, _B)));
	});

	test('defaults are inherited', () => {
		let actual = TokenTheme.createFromParsedTokenTheme([
			new ParsedTokenThemeRule('', -1, FontStyle.NotSet, 'F8F8F2', '272822'),
			new ParsedTokenThemeRule('var', -1, FontStyle.NotSet, 'ff0000', null)
		], []);
		let colorMap = new ColorMap();
		const _A = colorMap.getId('F8F8F2');
		const _B = colorMap.getId('272822');
		const _C = colorMap.getId('ff0000');
		assert.deepEqual(actual.getColorMap(), colorMap.getColorMap());
		let root = new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B), {
			'var': new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _C, _B))
		});
		assert.deepEqual(actual.getThemeTrieElement(), root);
	});

	test('same rules get merged', () => {
		let actual = TokenTheme.createFromParsedTokenTheme([
			new ParsedTokenThemeRule('', -1, FontStyle.NotSet, 'F8F8F2', '272822'),
			new ParsedTokenThemeRule('var', 1, FontStyle.Bold, null, null),
			new ParsedTokenThemeRule('var', 0, FontStyle.NotSet, 'ff0000', null),
		], []);
		let colorMap = new ColorMap();
		const _A = colorMap.getId('F8F8F2');
		const _B = colorMap.getId('272822');
		const _C = colorMap.getId('ff0000');
		assert.deepEqual(actual.getColorMap(), colorMap.getColorMap());
		let root = new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B), {
			'var': new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold, _C, _B))
		});
		assert.deepEqual(actual.getThemeTrieElement(), root);
	});

	test('rules are inherited 1', () => {
		let actual = TokenTheme.createFromParsedTokenTheme([
			new ParsedTokenThemeRule('', -1, FontStyle.NotSet, 'F8F8F2', '272822'),
			new ParsedTokenThemeRule('var', -1, FontStyle.Bold, 'ff0000', null),
			new ParsedTokenThemeRule('var.identifier', -1, FontStyle.NotSet, '00ff00', null),
		], []);
		let colorMap = new ColorMap();
		const _A = colorMap.getId('F8F8F2');
		const _B = colorMap.getId('272822');
		const _C = colorMap.getId('ff0000');
		const _D = colorMap.getId('00ff00');
		assert.deepEqual(actual.getColorMap(), colorMap.getColorMap());
		let root = new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B), {
			'var': new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold, _C, _B), {
				'identifier': new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold, _D, _B))
			})
		});
		assert.deepEqual(actual.getThemeTrieElement(), root);
	});

	test('rules are inherited 2', () => {
		let actual = TokenTheme.createFromParsedTokenTheme([
			new ParsedTokenThemeRule('', -1, FontStyle.NotSet, 'F8F8F2', '272822'),
			new ParsedTokenThemeRule('var', -1, FontStyle.Bold, 'ff0000', null),
			new ParsedTokenThemeRule('var.identifier', -1, FontStyle.NotSet, '00ff00', null),
			new ParsedTokenThemeRule('constant', 4, FontStyle.Italic, '100000', null),
			new ParsedTokenThemeRule('constant.numeric', 5, FontStyle.NotSet, '200000', null),
			new ParsedTokenThemeRule('constant.numeric.hex', 6, FontStyle.Bold, null, null),
			new ParsedTokenThemeRule('constant.numeric.oct', 7, FontStyle.Bold | FontStyle.Italic | FontStyle.Underline, null, null),
			new ParsedTokenThemeRule('constant.numeric.dec', 8, FontStyle.None, '300000', null),
		], []);
		let colorMap = new ColorMap();
		const _A = colorMap.getId('F8F8F2');
		const _B = colorMap.getId('272822');
		const _C = colorMap.getId('100000');
		const _D = colorMap.getId('200000');
		const _E = colorMap.getId('300000');
		const _F = colorMap.getId('ff0000');
		const _G = colorMap.getId('00ff00');
		assert.deepEqual(actual.getColorMap(), colorMap.getColorMap());
		let root = new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B), {
			'var': new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold, _F, _B), {
				'identifier': new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold, _G, _B))
			}),
			'constant': new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.Italic, _C, _B), {
				'numeric': new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.Italic, _D, _B), {
					'hex': new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold, _D, _B)),
					'oct': new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold | FontStyle.Italic | FontStyle.Underline, _D, _B)),
					'dec': new ExternalThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _E, _B)),
				})
			})
		});
		assert.deepEqual(actual.getThemeTrieElement(), root);
	});

	test('custom colors are first in color map', () => {
		let actual = TokenTheme.createFromParsedTokenTheme([
			new ParsedTokenThemeRule('var', -1, FontStyle.NotSet, 'F8F8F2', null)
		], [
			'000000', 'FFFFFF', '0F0F0F'
		]);
		let colorMap = new ColorMap();
		colorMap.getId('000000');
		colorMap.getId('FFFFFF');
		colorMap.getId('0F0F0F');
		colorMap.getId('F8F8F2');
		assert.deepEqual(actual.getColorMap(), colorMap.getColorMap());
	});
});
