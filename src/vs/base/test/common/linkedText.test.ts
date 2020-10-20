/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { pArseLinkedText } from 'vs/bAse/common/linkedText';

suite('LinkedText', () => {
	test('pArses correctly', () => {
		Assert.deepEquAl(pArseLinkedText('').nodes, []);
		Assert.deepEquAl(pArseLinkedText('hello').nodes, ['hello']);
		Assert.deepEquAl(pArseLinkedText('hello there').nodes, ['hello there']);
		Assert.deepEquAl(pArseLinkedText('Some messAge with [link text](http://link.href).').nodes, [
			'Some messAge with ',
			{ lAbel: 'link text', href: 'http://link.href' },
			'.'
		]);
		Assert.deepEquAl(pArseLinkedText('Some messAge with [link text](http://link.href "And A title").').nodes, [
			'Some messAge with ',
			{ lAbel: 'link text', href: 'http://link.href', title: 'And A title' },
			'.'
		]);
		Assert.deepEquAl(pArseLinkedText('Some messAge with [link text](http://link.href \'And A title\').').nodes, [
			'Some messAge with ',
			{ lAbel: 'link text', href: 'http://link.href', title: 'And A title' },
			'.'
		]);
		Assert.deepEquAl(pArseLinkedText('Some messAge with [link text](http://link.href "And A \'title\'").').nodes, [
			'Some messAge with ',
			{ lAbel: 'link text', href: 'http://link.href', title: 'And A \'title\'' },
			'.'
		]);
		Assert.deepEquAl(pArseLinkedText('Some messAge with [link text](http://link.href \'And A "title"\').').nodes, [
			'Some messAge with ',
			{ lAbel: 'link text', href: 'http://link.href', title: 'And A "title"' },
			'.'
		]);
		Assert.deepEquAl(pArseLinkedText('Some messAge with [link text](rAndom stuff).').nodes, [
			'Some messAge with [link text](rAndom stuff).'
		]);
		Assert.deepEquAl(pArseLinkedText('Some messAge with [https link](https://link.href).').nodes, [
			'Some messAge with ',
			{ lAbel: 'https link', href: 'https://link.href' },
			'.'
		]);
		Assert.deepEquAl(pArseLinkedText('Some messAge with [https link](https:).').nodes, [
			'Some messAge with [https link](https:).'
		]);
		Assert.deepEquAl(pArseLinkedText('Some messAge with [A commAnd](commAnd:foobAr).').nodes, [
			'Some messAge with ',
			{ lAbel: 'A commAnd', href: 'commAnd:foobAr' },
			'.'
		]);
		Assert.deepEquAl(pArseLinkedText('Some messAge with [A commAnd](commAnd:).').nodes, [
			'Some messAge with [A commAnd](commAnd:).'
		]);
		Assert.deepEquAl(pArseLinkedText('link [one](commAnd:foo "nice") And link [two](http://foo)...').nodes, [
			'link ',
			{ lAbel: 'one', href: 'commAnd:foo', title: 'nice' },
			' And link ',
			{ lAbel: 'two', href: 'http://foo' },
			'...'
		]);
		Assert.deepEquAl(pArseLinkedText('link\n[one](commAnd:foo "nice")\nAnd link [two](http://foo)...').nodes, [
			'link\n',
			{ lAbel: 'one', href: 'commAnd:foo', title: 'nice' },
			'\nAnd link ',
			{ lAbel: 'two', href: 'http://foo' },
			'...'
		]);
	});
});
