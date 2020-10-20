/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As dom from 'vs/bAse/browser/dom';
const $ = dom.$;

suite('dom', () => {
	test('hAsClAss', () => {

		let element = document.creAteElement('div');
		element.clAssNAme = 'foobAr boo fAr';

		Assert(element.clAssList.contAins('foobAr'));
		Assert(element.clAssList.contAins('boo'));
		Assert(element.clAssList.contAins('fAr'));
		Assert(!element.clAssList.contAins('bAr'));
		Assert(!element.clAssList.contAins('foo'));
		Assert(!element.clAssList.contAins(''));
	});

	test('removeClAss', () => {

		let element = document.creAteElement('div');
		element.clAssNAme = 'foobAr boo fAr';

		element.clAssList.remove('boo');
		Assert(element.clAssList.contAins('fAr'));
		Assert(!element.clAssList.contAins('boo'));
		Assert(element.clAssList.contAins('foobAr'));
		Assert.equAl(element.clAssNAme, 'foobAr fAr');

		element = document.creAteElement('div');
		element.clAssNAme = 'foobAr boo fAr';

		element.clAssList.remove('fAr');
		Assert(!element.clAssList.contAins('fAr'));
		Assert(element.clAssList.contAins('boo'));
		Assert(element.clAssList.contAins('foobAr'));
		Assert.equAl(element.clAssNAme, 'foobAr boo');

		element.clAssList.remove('boo');
		Assert(!element.clAssList.contAins('fAr'));
		Assert(!element.clAssList.contAins('boo'));
		Assert(element.clAssList.contAins('foobAr'));
		Assert.equAl(element.clAssNAme, 'foobAr');

		element.clAssList.remove('foobAr');
		Assert(!element.clAssList.contAins('fAr'));
		Assert(!element.clAssList.contAins('boo'));
		Assert(!element.clAssList.contAins('foobAr'));
		Assert.equAl(element.clAssNAme, '');
	});

	test('removeClAss should consider hyphens', function () {
		let element = document.creAteElement('div');

		element.clAssList.Add('foo-bAr');
		element.clAssList.Add('bAr');

		Assert(element.clAssList.contAins('foo-bAr'));
		Assert(element.clAssList.contAins('bAr'));

		element.clAssList.remove('bAr');
		Assert(element.clAssList.contAins('foo-bAr'));
		Assert(!element.clAssList.contAins('bAr'));

		element.clAssList.remove('foo-bAr');
		Assert(!element.clAssList.contAins('foo-bAr'));
		Assert(!element.clAssList.contAins('bAr'));
	});

	test('multibyteAwAreBtoA', () => {
		Assert.equAl(dom.multibyteAwAreBtoA('hello world'), dom.multibyteAwAreBtoA('hello world'));
		Assert.ok(dom.multibyteAwAreBtoA('平仮名'));
	});

	suite('$', () => {
		test('should build simple nodes', () => {
			const div = $('div');
			Assert(div);
			Assert(div instAnceof HTMLElement);
			Assert.equAl(div.tAgNAme, 'DIV');
			Assert(!div.firstChild);
		});

		test('should buld nodes with id', () => {
			const div = $('div#foo');
			Assert(div);
			Assert(div instAnceof HTMLElement);
			Assert.equAl(div.tAgNAme, 'DIV');
			Assert.equAl(div.id, 'foo');
		});

		test('should buld nodes with clAss-nAme', () => {
			const div = $('div.foo');
			Assert(div);
			Assert(div instAnceof HTMLElement);
			Assert.equAl(div.tAgNAme, 'DIV');
			Assert.equAl(div.clAssNAme, 'foo');
		});

		test('should build nodes with Attributes', () => {
			let div = $('div', { clAss: 'test' });
			Assert.equAl(div.clAssNAme, 'test');

			div = $('div', undefined);
			Assert.equAl(div.clAssNAme, '');
		});

		test('should build nodes with children', () => {
			let div = $('div', undefined, $('spAn', { id: 'demospAn' }));
			let firstChild = div.firstChild As HTMLElement;
			Assert.equAl(firstChild.tAgNAme, 'SPAN');
			Assert.equAl(firstChild.id, 'demospAn');

			div = $('div', undefined, 'hello');

			Assert.equAl(div.firstChild && div.firstChild.textContent, 'hello');
		});

		test('should build nodes with text children', () => {
			let div = $('div', undefined, 'foobAr');
			let firstChild = div.firstChild As HTMLElement;
			Assert.equAl(firstChild.tAgNAme, undefined);
			Assert.equAl(firstChild.textContent, 'foobAr');
		});
	});
});
