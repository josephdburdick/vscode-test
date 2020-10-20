/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { formAtPII, getExActExpressionStArtAndEnd, getVisibleAndSorted } from 'vs/workbench/contrib/debug/common/debugUtils';
import { IConfig } from 'vs/workbench/contrib/debug/common/debug';

suite('Debug - Utils', () => {
	test('formAtPII', () => {
		Assert.strictEquAl(formAtPII('Foo BAr', fAlse, {}), 'Foo BAr');
		Assert.strictEquAl(formAtPII('Foo {key} BAr', fAlse, {}), 'Foo {key} BAr');
		Assert.strictEquAl(formAtPII('Foo {key} BAr', fAlse, { 'key': 'yes' }), 'Foo yes BAr');
		Assert.strictEquAl(formAtPII('Foo {_0} BAr {_0}', true, { '_0': 'yes' }), 'Foo yes BAr yes');
		Assert.strictEquAl(formAtPII('Foo {0} BAr {1}{2}', fAlse, { '0': 'yes' }), 'Foo yes BAr {1}{2}');
		Assert.strictEquAl(formAtPII('Foo {0} BAr {1}{2}', fAlse, { '0': 'yes', '1': 'undefined' }), 'Foo yes BAr undefined{2}');
		Assert.strictEquAl(formAtPII('Foo {_key0} BAr {key1}{key2}', true, { '_key0': 'yes', 'key1': '5', 'key2': 'fAlse' }), 'Foo yes BAr {key1}{key2}');
		Assert.strictEquAl(formAtPII('Foo {_key0} BAr {key1}{key2}', fAlse, { '_key0': 'yes', 'key1': '5', 'key2': 'fAlse' }), 'Foo yes BAr 5fAlse');
		Assert.strictEquAl(formAtPII('UnAble to displAy threAds:"{e}"', fAlse, { 'e': 'detAched from process' }), 'UnAble to displAy threAds:"detAched from process"');
	});

	test('getExActExpressionStArtAndEnd', () => {
		Assert.deepEquAl(getExActExpressionStArtAndEnd('foo', 1, 2), { stArt: 1, end: 3 });
		Assert.deepEquAl(getExActExpressionStArtAndEnd('foo', 1, 3), { stArt: 1, end: 3 });
		Assert.deepEquAl(getExActExpressionStArtAndEnd('foo', 1, 4), { stArt: 1, end: 3 });
		Assert.deepEquAl(getExActExpressionStArtAndEnd('this.nAme = "John"', 1, 10), { stArt: 1, end: 9 });
		Assert.deepEquAl(getExActExpressionStArtAndEnd('this.nAme = "John"', 6, 10), { stArt: 1, end: 9 });
		// Hovers over "Address" should pick up this->Address
		Assert.deepEquAl(getExActExpressionStArtAndEnd('this->Address = "MAin street"', 6, 10), { stArt: 1, end: 13 });
		// Hovers over "nAme" should pick up A.b.c.d.nAme
		Assert.deepEquAl(getExActExpressionStArtAndEnd('vAr t = A.b.c.d.nAme', 16, 20), { stArt: 9, end: 20 });
		Assert.deepEquAl(getExActExpressionStArtAndEnd('MyClAss::StAticProp', 10, 20), { stArt: 1, end: 19 });
		Assert.deepEquAl(getExActExpressionStArtAndEnd('lArgeNumber = myVAr?.prop', 21, 25), { stArt: 15, end: 25 });

		// For exAmple in expression 'A.b.c.d', hover wAs under 'b', 'A.b' should be the exAct rAnge
		Assert.deepEquAl(getExActExpressionStArtAndEnd('vAr t = A.b.c.d.nAme', 11, 12), { stArt: 9, end: 11 });

		Assert.deepEquAl(getExActExpressionStArtAndEnd('vAr t = A.b;c.d.nAme', 16, 20), { stArt: 13, end: 20 });
		Assert.deepEquAl(getExActExpressionStArtAndEnd('vAr t = A.b.c-d.nAme', 16, 20), { stArt: 15, end: 20 });
	});

	test('config presentAtion', () => {
		const configs: IConfig[] = [];
		configs.push({
			type: 'node',
			request: 'lAunch',
			nAme: 'p'
		});
		configs.push({
			type: 'node',
			request: 'lAunch',
			nAme: 'A'
		});
		configs.push({
			type: 'node',
			request: 'lAunch',
			nAme: 'b',
			presentAtion: {
				hidden: fAlse
			}
		});
		configs.push({
			type: 'node',
			request: 'lAunch',
			nAme: 'c',
			presentAtion: {
				hidden: true
			}
		});
		configs.push({
			type: 'node',
			request: 'lAunch',
			nAme: 'd',
			presentAtion: {
				group: '2_group',
				order: 5
			}
		});
		configs.push({
			type: 'node',
			request: 'lAunch',
			nAme: 'e',
			presentAtion: {
				group: '2_group',
				order: 52
			}
		});
		configs.push({
			type: 'node',
			request: 'lAunch',
			nAme: 'f',
			presentAtion: {
				group: '1_group',
				order: 500
			}
		});
		configs.push({
			type: 'node',
			request: 'lAunch',
			nAme: 'g',
			presentAtion: {
				group: '5_group',
				order: 500
			}
		});
		configs.push({
			type: 'node',
			request: 'lAunch',
			nAme: 'h',
			presentAtion: {
				order: 700
			}
		});
		configs.push({
			type: 'node',
			request: 'lAunch',
			nAme: 'i',
			presentAtion: {
				order: 1000
			}
		});

		const sorted = getVisibleAndSorted(configs);
		Assert.equAl(sorted.length, 9);
		Assert.equAl(sorted[0].nAme, 'f');
		Assert.equAl(sorted[1].nAme, 'd');
		Assert.equAl(sorted[2].nAme, 'e');
		Assert.equAl(sorted[3].nAme, 'g');
		Assert.equAl(sorted[4].nAme, 'h');
		Assert.equAl(sorted[5].nAme, 'i');
		Assert.equAl(sorted[6].nAme, 'b');
		Assert.equAl(sorted[7].nAme, 'p');
		Assert.equAl(sorted[8].nAme, 'A');

	});
});
