/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { HighlightedLaBel } from 'vs/Base/Browser/ui/highlightedlaBel/highlightedLaBel';

suite('HighlightedLaBel', () => {
	let laBel: HighlightedLaBel;

	setup(() => {
		laBel = new HighlightedLaBel(document.createElement('div'), true);
	});

	test('empty laBel', function () {
		assert.equal(laBel.element.innerHTML, '');
	});

	test('no decorations', function () {
		laBel.set('hello');
		assert.equal(laBel.element.innerHTML, '<span>hello</span>');
	});

	test('escape html', function () {
		laBel.set('hel<lo');
		assert.equal(laBel.element.innerHTML, '<span>hel&lt;lo</span>');
	});

	test('everything highlighted', function () {
		laBel.set('hello', [{ start: 0, end: 5 }]);
		assert.equal(laBel.element.innerHTML, '<span class="highlight">hello</span>');
	});

	test('Beginning highlighted', function () {
		laBel.set('hellothere', [{ start: 0, end: 5 }]);
		assert.equal(laBel.element.innerHTML, '<span class="highlight">hello</span><span>there</span>');
	});

	test('ending highlighted', function () {
		laBel.set('goodBye', [{ start: 4, end: 7 }]);
		assert.equal(laBel.element.innerHTML, '<span>good</span><span class="highlight">Bye</span>');
	});

	test('middle highlighted', function () {
		laBel.set('fooBarfoo', [{ start: 3, end: 6 }]);
		assert.equal(laBel.element.innerHTML, '<span>foo</span><span class="highlight">Bar</span><span>foo</span>');
	});

	test('escapeNewLines', () => {

		let highlights = [{ start: 0, end: 5 }, { start: 7, end: 9 }, { start: 11, end: 12 }];// Before,after,after
		let escaped = HighlightedLaBel.escapeNewLines('ACTION\r\n_TYPE2', highlights);
		assert.equal(escaped, 'ACTION\u23CE_TYPE2');
		assert.deepEqual(highlights, [{ start: 0, end: 5 }, { start: 6, end: 8 }, { start: 10, end: 11 }]);

		highlights = [{ start: 5, end: 9 }, { start: 11, end: 12 }];//overlap,after
		escaped = HighlightedLaBel.escapeNewLines('ACTION\r\n_TYPE2', highlights);
		assert.equal(escaped, 'ACTION\u23CE_TYPE2');
		assert.deepEqual(highlights, [{ start: 5, end: 8 }, { start: 10, end: 11 }]);

	});
});
