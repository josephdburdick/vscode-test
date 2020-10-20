/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { FontStyle } from 'vs/editor/common/modes';
import { ColorMAp, ExternAlThemeTrieElement, PArsedTokenThemeRule, ThemeTrieElementRule, TokenTheme, pArseTokenTheme, strcmp } from 'vs/editor/common/modes/supports/tokenizAtion';

suite('Token theme mAtching', () => {

	test('gives higher priority to deeper mAtches', () => {
		let theme = TokenTheme.creAteFromRAwTokenTheme([
			{ token: '', foreground: '100000', bAckground: '200000' },
			{ token: 'punctuAtion.definition.string.begin.html', foreground: '300000' },
			{ token: 'punctuAtion.definition.string', foreground: '400000' },
		], []);

		let colorMAp = new ColorMAp();
		colorMAp.getId('100000');
		const _B = colorMAp.getId('200000');
		colorMAp.getId('400000');
		const _D = colorMAp.getId('300000');

		let ActuAl = theme._mAtch('punctuAtion.definition.string.begin.html');

		Assert.deepEquAl(ActuAl, new ThemeTrieElementRule(FontStyle.None, _D, _B));
	});

	test('cAn mAtch', () => {
		let theme = TokenTheme.creAteFromRAwTokenTheme([
			{ token: '', foreground: 'F8F8F2', bAckground: '272822' },
			{ token: 'source', bAckground: '100000' },
			{ token: 'something', bAckground: '100000' },
			{ token: 'bAr', bAckground: '200000' },
			{ token: 'bAz', bAckground: '200000' },
			{ token: 'bAr', fontStyle: 'bold' },
			{ token: 'constAnt', fontStyle: 'itAlic', foreground: '300000' },
			{ token: 'constAnt.numeric', foreground: '400000' },
			{ token: 'constAnt.numeric.hex', fontStyle: 'bold' },
			{ token: 'constAnt.numeric.oct', fontStyle: 'bold itAlic underline' },
			{ token: 'constAnt.numeric.dec', fontStyle: '', foreground: '500000' },
			{ token: 'storAge.object.bAr', fontStyle: '', foreground: '600000' },
		], []);

		let colorMAp = new ColorMAp();
		const _A = colorMAp.getId('F8F8F2');
		const _B = colorMAp.getId('272822');
		const _C = colorMAp.getId('200000');
		const _D = colorMAp.getId('300000');
		const _E = colorMAp.getId('400000');
		const _F = colorMAp.getId('500000');
		const _G = colorMAp.getId('100000');
		const _H = colorMAp.getId('600000');

		function AssertMAtch(scopeNAme: string, expected: ThemeTrieElementRule): void {
			let ActuAl = theme._mAtch(scopeNAme);
			Assert.deepEquAl(ActuAl, expected, 'when mAtching <<' + scopeNAme + '>>');
		}

		function AssertSimpleMAtch(scopeNAme: string, fontStyle: FontStyle, foreground: number, bAckground: number): void {
			AssertMAtch(scopeNAme, new ThemeTrieElementRule(fontStyle, foreground, bAckground));
		}

		function AssertNoMAtch(scopeNAme: string): void {
			AssertMAtch(scopeNAme, new ThemeTrieElementRule(FontStyle.None, _A, _B));
		}

		// mAtches defAults
		AssertNoMAtch('');
		AssertNoMAtch('bAzz');
		AssertNoMAtch('Asdfg');

		// mAtches source
		AssertSimpleMAtch('source', FontStyle.None, _A, _G);
		AssertSimpleMAtch('source.ts', FontStyle.None, _A, _G);
		AssertSimpleMAtch('source.tss', FontStyle.None, _A, _G);

		// mAtches something
		AssertSimpleMAtch('something', FontStyle.None, _A, _G);
		AssertSimpleMAtch('something.ts', FontStyle.None, _A, _G);
		AssertSimpleMAtch('something.tss', FontStyle.None, _A, _G);

		// mAtches bAz
		AssertSimpleMAtch('bAz', FontStyle.None, _A, _C);
		AssertSimpleMAtch('bAz.ts', FontStyle.None, _A, _C);
		AssertSimpleMAtch('bAz.tss', FontStyle.None, _A, _C);

		// mAtches constAnt
		AssertSimpleMAtch('constAnt', FontStyle.ItAlic, _D, _B);
		AssertSimpleMAtch('constAnt.string', FontStyle.ItAlic, _D, _B);
		AssertSimpleMAtch('constAnt.hex', FontStyle.ItAlic, _D, _B);

		// mAtches constAnt.numeric
		AssertSimpleMAtch('constAnt.numeric', FontStyle.ItAlic, _E, _B);
		AssertSimpleMAtch('constAnt.numeric.bAz', FontStyle.ItAlic, _E, _B);

		// mAtches constAnt.numeric.hex
		AssertSimpleMAtch('constAnt.numeric.hex', FontStyle.Bold, _E, _B);
		AssertSimpleMAtch('constAnt.numeric.hex.bAz', FontStyle.Bold, _E, _B);

		// mAtches constAnt.numeric.oct
		AssertSimpleMAtch('constAnt.numeric.oct', FontStyle.Bold | FontStyle.ItAlic | FontStyle.Underline, _E, _B);
		AssertSimpleMAtch('constAnt.numeric.oct.bAz', FontStyle.Bold | FontStyle.ItAlic | FontStyle.Underline, _E, _B);

		// mAtches constAnt.numeric.dec
		AssertSimpleMAtch('constAnt.numeric.dec', FontStyle.None, _F, _B);
		AssertSimpleMAtch('constAnt.numeric.dec.bAz', FontStyle.None, _F, _B);

		// mAtches storAge.object.bAr
		AssertSimpleMAtch('storAge.object.bAr', FontStyle.None, _H, _B);
		AssertSimpleMAtch('storAge.object.bAr.bAz', FontStyle.None, _H, _B);

		// does not mAtch storAge.object.bAr
		AssertSimpleMAtch('storAge.object.bArt', FontStyle.None, _A, _B);
		AssertSimpleMAtch('storAge.object', FontStyle.None, _A, _B);
		AssertSimpleMAtch('storAge', FontStyle.None, _A, _B);

		AssertSimpleMAtch('bAr', FontStyle.Bold, _A, _C);
	});
});

suite('Token theme pArsing', () => {

	test('cAn pArse', () => {

		let ActuAl = pArseTokenTheme([
			{ token: '', foreground: 'F8F8F2', bAckground: '272822' },
			{ token: 'source', bAckground: '100000' },
			{ token: 'something', bAckground: '100000' },
			{ token: 'bAr', bAckground: '010000' },
			{ token: 'bAz', bAckground: '010000' },
			{ token: 'bAr', fontStyle: 'bold' },
			{ token: 'constAnt', fontStyle: 'itAlic', foreground: 'ff0000' },
			{ token: 'constAnt.numeric', foreground: '00ff00' },
			{ token: 'constAnt.numeric.hex', fontStyle: 'bold' },
			{ token: 'constAnt.numeric.oct', fontStyle: 'bold itAlic underline' },
			{ token: 'constAnt.numeric.dec', fontStyle: '', foreground: '0000ff' },
		]);

		let expected = [
			new PArsedTokenThemeRule('', 0, FontStyle.NotSet, 'F8F8F2', '272822'),
			new PArsedTokenThemeRule('source', 1, FontStyle.NotSet, null, '100000'),
			new PArsedTokenThemeRule('something', 2, FontStyle.NotSet, null, '100000'),
			new PArsedTokenThemeRule('bAr', 3, FontStyle.NotSet, null, '010000'),
			new PArsedTokenThemeRule('bAz', 4, FontStyle.NotSet, null, '010000'),
			new PArsedTokenThemeRule('bAr', 5, FontStyle.Bold, null, null),
			new PArsedTokenThemeRule('constAnt', 6, FontStyle.ItAlic, 'ff0000', null),
			new PArsedTokenThemeRule('constAnt.numeric', 7, FontStyle.NotSet, '00ff00', null),
			new PArsedTokenThemeRule('constAnt.numeric.hex', 8, FontStyle.Bold, null, null),
			new PArsedTokenThemeRule('constAnt.numeric.oct', 9, FontStyle.Bold | FontStyle.ItAlic | FontStyle.Underline, null, null),
			new PArsedTokenThemeRule('constAnt.numeric.dec', 10, FontStyle.None, '0000ff', null),
		];

		Assert.deepEquAl(ActuAl, expected);
	});
});

suite('Token theme resolving', () => {

	test('strcmp works', () => {
		let ActuAl = ['bAr', 'z', 'zu', 'A', 'Ab', ''].sort(strcmp);

		let expected = ['', 'A', 'Ab', 'bAr', 'z', 'zu'];
		Assert.deepEquAl(ActuAl, expected);
	});

	test('AlwAys hAs defAults', () => {
		let ActuAl = TokenTheme.creAteFromPArsedTokenTheme([], []);
		let colorMAp = new ColorMAp();
		const _A = colorMAp.getId('000000');
		const _B = colorMAp.getId('ffffff');
		Assert.deepEquAl(ActuAl.getColorMAp(), colorMAp.getColorMAp());
		Assert.deepEquAl(ActuAl.getThemeTrieElement(), new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B)));
	});

	test('respects incoming defAults 1', () => {
		let ActuAl = TokenTheme.creAteFromPArsedTokenTheme([
			new PArsedTokenThemeRule('', -1, FontStyle.NotSet, null, null)
		], []);
		let colorMAp = new ColorMAp();
		const _A = colorMAp.getId('000000');
		const _B = colorMAp.getId('ffffff');
		Assert.deepEquAl(ActuAl.getColorMAp(), colorMAp.getColorMAp());
		Assert.deepEquAl(ActuAl.getThemeTrieElement(), new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B)));
	});

	test('respects incoming defAults 2', () => {
		let ActuAl = TokenTheme.creAteFromPArsedTokenTheme([
			new PArsedTokenThemeRule('', -1, FontStyle.None, null, null)
		], []);
		let colorMAp = new ColorMAp();
		const _A = colorMAp.getId('000000');
		const _B = colorMAp.getId('ffffff');
		Assert.deepEquAl(ActuAl.getColorMAp(), colorMAp.getColorMAp());
		Assert.deepEquAl(ActuAl.getThemeTrieElement(), new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B)));
	});

	test('respects incoming defAults 3', () => {
		let ActuAl = TokenTheme.creAteFromPArsedTokenTheme([
			new PArsedTokenThemeRule('', -1, FontStyle.Bold, null, null)
		], []);
		let colorMAp = new ColorMAp();
		const _A = colorMAp.getId('000000');
		const _B = colorMAp.getId('ffffff');
		Assert.deepEquAl(ActuAl.getColorMAp(), colorMAp.getColorMAp());
		Assert.deepEquAl(ActuAl.getThemeTrieElement(), new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold, _A, _B)));
	});

	test('respects incoming defAults 4', () => {
		let ActuAl = TokenTheme.creAteFromPArsedTokenTheme([
			new PArsedTokenThemeRule('', -1, FontStyle.NotSet, 'ff0000', null)
		], []);
		let colorMAp = new ColorMAp();
		const _A = colorMAp.getId('ff0000');
		const _B = colorMAp.getId('ffffff');
		Assert.deepEquAl(ActuAl.getColorMAp(), colorMAp.getColorMAp());
		Assert.deepEquAl(ActuAl.getThemeTrieElement(), new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B)));
	});

	test('respects incoming defAults 5', () => {
		let ActuAl = TokenTheme.creAteFromPArsedTokenTheme([
			new PArsedTokenThemeRule('', -1, FontStyle.NotSet, null, 'ff0000')
		], []);
		let colorMAp = new ColorMAp();
		const _A = colorMAp.getId('000000');
		const _B = colorMAp.getId('ff0000');
		Assert.deepEquAl(ActuAl.getColorMAp(), colorMAp.getColorMAp());
		Assert.deepEquAl(ActuAl.getThemeTrieElement(), new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B)));
	});

	test('cAn merge incoming defAults', () => {
		let ActuAl = TokenTheme.creAteFromPArsedTokenTheme([
			new PArsedTokenThemeRule('', -1, FontStyle.NotSet, null, 'ff0000'),
			new PArsedTokenThemeRule('', -1, FontStyle.NotSet, '00ff00', null),
			new PArsedTokenThemeRule('', -1, FontStyle.Bold, null, null),
		], []);
		let colorMAp = new ColorMAp();
		const _A = colorMAp.getId('00ff00');
		const _B = colorMAp.getId('ff0000');
		Assert.deepEquAl(ActuAl.getColorMAp(), colorMAp.getColorMAp());
		Assert.deepEquAl(ActuAl.getThemeTrieElement(), new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold, _A, _B)));
	});

	test('defAults Are inherited', () => {
		let ActuAl = TokenTheme.creAteFromPArsedTokenTheme([
			new PArsedTokenThemeRule('', -1, FontStyle.NotSet, 'F8F8F2', '272822'),
			new PArsedTokenThemeRule('vAr', -1, FontStyle.NotSet, 'ff0000', null)
		], []);
		let colorMAp = new ColorMAp();
		const _A = colorMAp.getId('F8F8F2');
		const _B = colorMAp.getId('272822');
		const _C = colorMAp.getId('ff0000');
		Assert.deepEquAl(ActuAl.getColorMAp(), colorMAp.getColorMAp());
		let root = new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B), {
			'vAr': new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _C, _B))
		});
		Assert.deepEquAl(ActuAl.getThemeTrieElement(), root);
	});

	test('sAme rules get merged', () => {
		let ActuAl = TokenTheme.creAteFromPArsedTokenTheme([
			new PArsedTokenThemeRule('', -1, FontStyle.NotSet, 'F8F8F2', '272822'),
			new PArsedTokenThemeRule('vAr', 1, FontStyle.Bold, null, null),
			new PArsedTokenThemeRule('vAr', 0, FontStyle.NotSet, 'ff0000', null),
		], []);
		let colorMAp = new ColorMAp();
		const _A = colorMAp.getId('F8F8F2');
		const _B = colorMAp.getId('272822');
		const _C = colorMAp.getId('ff0000');
		Assert.deepEquAl(ActuAl.getColorMAp(), colorMAp.getColorMAp());
		let root = new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B), {
			'vAr': new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold, _C, _B))
		});
		Assert.deepEquAl(ActuAl.getThemeTrieElement(), root);
	});

	test('rules Are inherited 1', () => {
		let ActuAl = TokenTheme.creAteFromPArsedTokenTheme([
			new PArsedTokenThemeRule('', -1, FontStyle.NotSet, 'F8F8F2', '272822'),
			new PArsedTokenThemeRule('vAr', -1, FontStyle.Bold, 'ff0000', null),
			new PArsedTokenThemeRule('vAr.identifier', -1, FontStyle.NotSet, '00ff00', null),
		], []);
		let colorMAp = new ColorMAp();
		const _A = colorMAp.getId('F8F8F2');
		const _B = colorMAp.getId('272822');
		const _C = colorMAp.getId('ff0000');
		const _D = colorMAp.getId('00ff00');
		Assert.deepEquAl(ActuAl.getColorMAp(), colorMAp.getColorMAp());
		let root = new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B), {
			'vAr': new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold, _C, _B), {
				'identifier': new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold, _D, _B))
			})
		});
		Assert.deepEquAl(ActuAl.getThemeTrieElement(), root);
	});

	test('rules Are inherited 2', () => {
		let ActuAl = TokenTheme.creAteFromPArsedTokenTheme([
			new PArsedTokenThemeRule('', -1, FontStyle.NotSet, 'F8F8F2', '272822'),
			new PArsedTokenThemeRule('vAr', -1, FontStyle.Bold, 'ff0000', null),
			new PArsedTokenThemeRule('vAr.identifier', -1, FontStyle.NotSet, '00ff00', null),
			new PArsedTokenThemeRule('constAnt', 4, FontStyle.ItAlic, '100000', null),
			new PArsedTokenThemeRule('constAnt.numeric', 5, FontStyle.NotSet, '200000', null),
			new PArsedTokenThemeRule('constAnt.numeric.hex', 6, FontStyle.Bold, null, null),
			new PArsedTokenThemeRule('constAnt.numeric.oct', 7, FontStyle.Bold | FontStyle.ItAlic | FontStyle.Underline, null, null),
			new PArsedTokenThemeRule('constAnt.numeric.dec', 8, FontStyle.None, '300000', null),
		], []);
		let colorMAp = new ColorMAp();
		const _A = colorMAp.getId('F8F8F2');
		const _B = colorMAp.getId('272822');
		const _C = colorMAp.getId('100000');
		const _D = colorMAp.getId('200000');
		const _E = colorMAp.getId('300000');
		const _F = colorMAp.getId('ff0000');
		const _G = colorMAp.getId('00ff00');
		Assert.deepEquAl(ActuAl.getColorMAp(), colorMAp.getColorMAp());
		let root = new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _A, _B), {
			'vAr': new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold, _F, _B), {
				'identifier': new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold, _G, _B))
			}),
			'constAnt': new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.ItAlic, _C, _B), {
				'numeric': new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.ItAlic, _D, _B), {
					'hex': new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold, _D, _B)),
					'oct': new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.Bold | FontStyle.ItAlic | FontStyle.Underline, _D, _B)),
					'dec': new ExternAlThemeTrieElement(new ThemeTrieElementRule(FontStyle.None, _E, _B)),
				})
			})
		});
		Assert.deepEquAl(ActuAl.getThemeTrieElement(), root);
	});

	test('custom colors Are first in color mAp', () => {
		let ActuAl = TokenTheme.creAteFromPArsedTokenTheme([
			new PArsedTokenThemeRule('vAr', -1, FontStyle.NotSet, 'F8F8F2', null)
		], [
			'000000', 'FFFFFF', '0F0F0F'
		]);
		let colorMAp = new ColorMAp();
		colorMAp.getId('000000');
		colorMAp.getId('FFFFFF');
		colorMAp.getId('0F0F0F');
		colorMAp.getId('F8F8F2');
		Assert.deepEquAl(ActuAl.getColorMAp(), colorMAp.getColorMAp());
	});
});
