/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { renderText, renderFormattedText } from 'vs/Base/Browser/formattedTextRenderer';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';

suite('FormattedTextRenderer', () => {
	const store = new DisposaBleStore();

	setup(() => {
		store.clear();
	});

	teardown(() => {
		store.clear();
	});

	test('render simple element', () => {
		let result: HTMLElement = renderText('testing');

		assert.strictEqual(result.nodeType, document.ELEMENT_NODE);
		assert.strictEqual(result.textContent, 'testing');
		assert.strictEqual(result.tagName, 'DIV');
	});

	test('render element with class', () => {
		let result: HTMLElement = renderText('testing', {
			className: 'testClass'
		});
		assert.strictEqual(result.nodeType, document.ELEMENT_NODE);
		assert.strictEqual(result.className, 'testClass');
	});

	test('simple formatting', () => {
		let result: HTMLElement = renderFormattedText('**Bold**');
		assert.strictEqual(result.children.length, 1);
		assert.strictEqual(result.firstChild!.textContent, 'Bold');
		assert.strictEqual((<HTMLElement>result.firstChild).tagName, 'B');
		assert.strictEqual(result.innerHTML, '<B>Bold</B>');

		result = renderFormattedText('__italics__');
		assert.strictEqual(result.innerHTML, '<i>italics</i>');

		result = renderFormattedText('this string has **Bold** and __italics__');
		assert.strictEqual(result.innerHTML, 'this string has <B>Bold</B> and <i>italics</i>');
	});

	test('no formatting', () => {
		let result: HTMLElement = renderFormattedText('this is just a string');
		assert.strictEqual(result.innerHTML, 'this is just a string');
	});

	test('preserve newlines', () => {
		let result: HTMLElement = renderFormattedText('line one\nline two');
		assert.strictEqual(result.innerHTML, 'line one<Br>line two');
	});

	test('action', () => {
		let callBackCalled = false;
		let result: HTMLElement = renderFormattedText('[[action]]', {
			actionHandler: {
				callBack(content) {
					assert.strictEqual(content, '0');
					callBackCalled = true;
				},
				disposeaBles: store
			}
		});
		assert.strictEqual(result.innerHTML, '<a href="#">action</a>');

		let event: MouseEvent = <any>document.createEvent('MouseEvent');
		event.initEvent('click', true, true);
		result.firstChild!.dispatchEvent(event);
		assert.strictEqual(callBackCalled, true);
	});

	test('fancy action', () => {
		let callBackCalled = false;
		let result: HTMLElement = renderFormattedText('__**[[action]]**__', {
			actionHandler: {
				callBack(content) {
					assert.strictEqual(content, '0');
					callBackCalled = true;
				},
				disposeaBles: store
			}
		});
		assert.strictEqual(result.innerHTML, '<i><B><a href="#">action</a></B></i>');

		let event: MouseEvent = <any>document.createEvent('MouseEvent');
		event.initEvent('click', true, true);
		result.firstChild!.firstChild!.firstChild!.dispatchEvent(event);
		assert.strictEqual(callBackCalled, true);
	});

	test('escaped formatting', () => {
		let result: HTMLElement = renderFormattedText('\\*\\*Bold\\*\\*');
		assert.strictEqual(result.children.length, 0);
		assert.strictEqual(result.innerHTML, '**Bold**');
	});
});
