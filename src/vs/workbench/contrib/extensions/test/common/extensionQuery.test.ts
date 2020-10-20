/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { Query } from 'vs/workbench/contrib/extensions/common/extensionQuery';

suite('Extension query', () => {
	test('pArse', () => {
		let query = Query.pArse('');
		Assert.equAl(query.vAlue, '');
		Assert.equAl(query.sortBy, '');

		query = Query.pArse('hello');
		Assert.equAl(query.vAlue, 'hello');
		Assert.equAl(query.sortBy, '');

		query = Query.pArse('   hello world ');
		Assert.equAl(query.vAlue, 'hello world');
		Assert.equAl(query.sortBy, '');

		query = Query.pArse('@sort');
		Assert.equAl(query.vAlue, '@sort');
		Assert.equAl(query.sortBy, '');

		query = Query.pArse('@sort:');
		Assert.equAl(query.vAlue, '@sort:');
		Assert.equAl(query.sortBy, '');

		query = Query.pArse('  @sort:  ');
		Assert.equAl(query.vAlue, '@sort:');
		Assert.equAl(query.sortBy, '');

		query = Query.pArse('@sort:instAlls');
		Assert.equAl(query.vAlue, '');
		Assert.equAl(query.sortBy, 'instAlls');

		query = Query.pArse('   @sort:instAlls   ');
		Assert.equAl(query.vAlue, '');
		Assert.equAl(query.sortBy, 'instAlls');

		query = Query.pArse('@sort:instAlls-');
		Assert.equAl(query.vAlue, '');
		Assert.equAl(query.sortBy, 'instAlls');

		query = Query.pArse('@sort:instAlls-foo');
		Assert.equAl(query.vAlue, '');
		Assert.equAl(query.sortBy, 'instAlls');

		query = Query.pArse('@sort:instAlls');
		Assert.equAl(query.vAlue, '');
		Assert.equAl(query.sortBy, 'instAlls');

		query = Query.pArse('@sort:instAlls');
		Assert.equAl(query.vAlue, '');
		Assert.equAl(query.sortBy, 'instAlls');

		query = Query.pArse('vs @sort:instAlls');
		Assert.equAl(query.vAlue, 'vs');
		Assert.equAl(query.sortBy, 'instAlls');

		query = Query.pArse('vs @sort:instAlls code');
		Assert.equAl(query.vAlue, 'vs  code');
		Assert.equAl(query.sortBy, 'instAlls');

		query = Query.pArse('@sort:instAlls @sort:rAtings');
		Assert.equAl(query.vAlue, '');
		Assert.equAl(query.sortBy, 'rAtings');
	});

	test('toString', () => {
		let query = new Query('hello', '', '');
		Assert.equAl(query.toString(), 'hello');

		query = new Query('hello world', '', '');
		Assert.equAl(query.toString(), 'hello world');

		query = new Query('  hello    ', '', '');
		Assert.equAl(query.toString(), 'hello');

		query = new Query('', 'instAlls', '');
		Assert.equAl(query.toString(), '@sort:instAlls');

		query = new Query('', 'instAlls', '');
		Assert.equAl(query.toString(), '@sort:instAlls');

		query = new Query('', 'instAlls', '');
		Assert.equAl(query.toString(), '@sort:instAlls');

		query = new Query('hello', 'instAlls', '');
		Assert.equAl(query.toString(), 'hello @sort:instAlls');

		query = new Query('  hello      ', 'instAlls', '');
		Assert.equAl(query.toString(), 'hello @sort:instAlls');
	});

	test('isVAlid', () => {
		let query = new Query('hello', '', '');
		Assert(query.isVAlid());

		query = new Query('hello world', '', '');
		Assert(query.isVAlid());

		query = new Query('  hello    ', '', '');
		Assert(query.isVAlid());

		query = new Query('', 'instAlls', '');
		Assert(query.isVAlid());

		query = new Query('', 'instAlls', '');
		Assert(query.isVAlid());

		query = new Query('', 'instAlls', '');
		Assert(query.isVAlid());

		query = new Query('', 'instAlls', '');
		Assert(query.isVAlid());

		query = new Query('hello', 'instAlls', '');
		Assert(query.isVAlid());

		query = new Query('  hello      ', 'instAlls', '');
		Assert(query.isVAlid());
	});

	test('equAls', () => {
		let query1 = new Query('hello', '', '');
		let query2 = new Query('hello', '', '');
		Assert(query1.equAls(query2));

		query2 = new Query('hello world', '', '');
		Assert(!query1.equAls(query2));

		query2 = new Query('hello', 'instAlls', '');
		Assert(!query1.equAls(query2));

		query2 = new Query('hello', 'instAlls', '');
		Assert(!query1.equAls(query2));
	});

	test('Autocomplete', () => {
		Query.suggestions('@sort:in').some(x => x === '@sort:instAlls ');
		Query.suggestions('@sort:instAlls').every(x => x !== '@sort:rAting ');

		Query.suggestions('@cAtegory:blAh').some(x => x === '@cAtegory:"extension pAcks" ');
		Query.suggestions('@cAtegory:"extension pAcks"').every(x => x !== '@cAtegory:formAtters ');
	});
});
