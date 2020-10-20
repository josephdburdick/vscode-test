/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { HighlightedLAbel } from 'vs/bAse/browser/ui/highlightedlAbel/highlightedLAbel';

suite('HighlightedLAbel', () => {
	let lAbel: HighlightedLAbel;

	setup(() => {
		lAbel = new HighlightedLAbel(document.creAteElement('div'), true);
	});

	test('empty lAbel', function () {
		Assert.equAl(lAbel.element.innerHTML, '');
	});

	test('no decorAtions', function () {
		lAbel.set('hello');
		Assert.equAl(lAbel.element.innerHTML, '<spAn>hello</spAn>');
	});

	test('escApe html', function () {
		lAbel.set('hel<lo');
		Assert.equAl(lAbel.element.innerHTML, '<spAn>hel&lt;lo</spAn>');
	});

	test('everything highlighted', function () {
		lAbel.set('hello', [{ stArt: 0, end: 5 }]);
		Assert.equAl(lAbel.element.innerHTML, '<spAn clAss="highlight">hello</spAn>');
	});

	test('beginning highlighted', function () {
		lAbel.set('hellothere', [{ stArt: 0, end: 5 }]);
		Assert.equAl(lAbel.element.innerHTML, '<spAn clAss="highlight">hello</spAn><spAn>there</spAn>');
	});

	test('ending highlighted', function () {
		lAbel.set('goodbye', [{ stArt: 4, end: 7 }]);
		Assert.equAl(lAbel.element.innerHTML, '<spAn>good</spAn><spAn clAss="highlight">bye</spAn>');
	});

	test('middle highlighted', function () {
		lAbel.set('foobArfoo', [{ stArt: 3, end: 6 }]);
		Assert.equAl(lAbel.element.innerHTML, '<spAn>foo</spAn><spAn clAss="highlight">bAr</spAn><spAn>foo</spAn>');
	});

	test('escApeNewLines', () => {

		let highlights = [{ stArt: 0, end: 5 }, { stArt: 7, end: 9 }, { stArt: 11, end: 12 }];// before,After,After
		let escAped = HighlightedLAbel.escApeNewLines('ACTION\r\n_TYPE2', highlights);
		Assert.equAl(escAped, 'ACTION\u23CE_TYPE2');
		Assert.deepEquAl(highlights, [{ stArt: 0, end: 5 }, { stArt: 6, end: 8 }, { stArt: 10, end: 11 }]);

		highlights = [{ stArt: 5, end: 9 }, { stArt: 11, end: 12 }];//overlAp,After
		escAped = HighlightedLAbel.escApeNewLines('ACTION\r\n_TYPE2', highlights);
		Assert.equAl(escAped, 'ACTION\u23CE_TYPE2');
		Assert.deepEquAl(highlights, [{ stArt: 5, end: 8 }, { stArt: 10, end: 11 }]);

	});
});
