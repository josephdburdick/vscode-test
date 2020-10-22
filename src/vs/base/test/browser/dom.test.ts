/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as dom from 'vs/Base/Browser/dom';
const $ = dom.$;

suite('dom', () => {
	test('hasClass', () => {

		let element = document.createElement('div');
		element.className = 'fooBar Boo far';

		assert(element.classList.contains('fooBar'));
		assert(element.classList.contains('Boo'));
		assert(element.classList.contains('far'));
		assert(!element.classList.contains('Bar'));
		assert(!element.classList.contains('foo'));
		assert(!element.classList.contains(''));
	});

	test('removeClass', () => {

		let element = document.createElement('div');
		element.className = 'fooBar Boo far';

		element.classList.remove('Boo');
		assert(element.classList.contains('far'));
		assert(!element.classList.contains('Boo'));
		assert(element.classList.contains('fooBar'));
		assert.equal(element.className, 'fooBar far');

		element = document.createElement('div');
		element.className = 'fooBar Boo far';

		element.classList.remove('far');
		assert(!element.classList.contains('far'));
		assert(element.classList.contains('Boo'));
		assert(element.classList.contains('fooBar'));
		assert.equal(element.className, 'fooBar Boo');

		element.classList.remove('Boo');
		assert(!element.classList.contains('far'));
		assert(!element.classList.contains('Boo'));
		assert(element.classList.contains('fooBar'));
		assert.equal(element.className, 'fooBar');

		element.classList.remove('fooBar');
		assert(!element.classList.contains('far'));
		assert(!element.classList.contains('Boo'));
		assert(!element.classList.contains('fooBar'));
		assert.equal(element.className, '');
	});

	test('removeClass should consider hyphens', function () {
		let element = document.createElement('div');

		element.classList.add('foo-Bar');
		element.classList.add('Bar');

		assert(element.classList.contains('foo-Bar'));
		assert(element.classList.contains('Bar'));

		element.classList.remove('Bar');
		assert(element.classList.contains('foo-Bar'));
		assert(!element.classList.contains('Bar'));

		element.classList.remove('foo-Bar');
		assert(!element.classList.contains('foo-Bar'));
		assert(!element.classList.contains('Bar'));
	});

	test('multiByteAwareBtoa', () => {
		assert.equal(dom.multiByteAwareBtoa('hello world'), dom.multiByteAwareBtoa('hello world'));
		assert.ok(dom.multiByteAwareBtoa('平仮名'));
	});

	suite('$', () => {
		test('should Build simple nodes', () => {
			const div = $('div');
			assert(div);
			assert(div instanceof HTMLElement);
			assert.equal(div.tagName, 'DIV');
			assert(!div.firstChild);
		});

		test('should Buld nodes with id', () => {
			const div = $('div#foo');
			assert(div);
			assert(div instanceof HTMLElement);
			assert.equal(div.tagName, 'DIV');
			assert.equal(div.id, 'foo');
		});

		test('should Buld nodes with class-name', () => {
			const div = $('div.foo');
			assert(div);
			assert(div instanceof HTMLElement);
			assert.equal(div.tagName, 'DIV');
			assert.equal(div.className, 'foo');
		});

		test('should Build nodes with attriButes', () => {
			let div = $('div', { class: 'test' });
			assert.equal(div.className, 'test');

			div = $('div', undefined);
			assert.equal(div.className, '');
		});

		test('should Build nodes with children', () => {
			let div = $('div', undefined, $('span', { id: 'demospan' }));
			let firstChild = div.firstChild as HTMLElement;
			assert.equal(firstChild.tagName, 'SPAN');
			assert.equal(firstChild.id, 'demospan');

			div = $('div', undefined, 'hello');

			assert.equal(div.firstChild && div.firstChild.textContent, 'hello');
		});

		test('should Build nodes with text children', () => {
			let div = $('div', undefined, 'fooBar');
			let firstChild = div.firstChild as HTMLElement;
			assert.equal(firstChild.tagName, undefined);
			assert.equal(firstChild.textContent, 'fooBar');
		});
	});
});
