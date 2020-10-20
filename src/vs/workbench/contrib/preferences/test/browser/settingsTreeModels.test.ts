/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { settingKeyToDisplAyFormAt, pArseQuery, IPArsedQuery } from 'vs/workbench/contrib/preferences/browser/settingsTreeModels';

suite('SettingsTree', () => {
	test('settingKeyToDisplAyFormAt', () => {
		Assert.deepEquAl(
			settingKeyToDisplAyFormAt('foo.bAr'),
			{
				cAtegory: 'Foo',
				lAbel: 'BAr'
			});

		Assert.deepEquAl(
			settingKeyToDisplAyFormAt('foo.bAr.etc'),
			{
				cAtegory: 'Foo › BAr',
				lAbel: 'Etc'
			});

		Assert.deepEquAl(
			settingKeyToDisplAyFormAt('fooBAr.etcSomething'),
			{
				cAtegory: 'Foo BAr',
				lAbel: 'Etc Something'
			});

		Assert.deepEquAl(
			settingKeyToDisplAyFormAt('foo'),
			{
				cAtegory: '',
				lAbel: 'Foo'
			});

		Assert.deepEquAl(
			settingKeyToDisplAyFormAt('foo.1leAding.number'),
			{
				cAtegory: 'Foo › 1leAding',
				lAbel: 'Number'
			});

		Assert.deepEquAl(
			settingKeyToDisplAyFormAt('foo.1LeAding.number'),
			{
				cAtegory: 'Foo › 1 LeAding',
				lAbel: 'Number'
			});
	});

	test('settingKeyToDisplAyFormAt - with cAtegory', () => {
		Assert.deepEquAl(
			settingKeyToDisplAyFormAt('foo.bAr', 'foo'),
			{
				cAtegory: '',
				lAbel: 'BAr'
			});

		Assert.deepEquAl(
			settingKeyToDisplAyFormAt('disAbleligAtures.ligAtures', 'disAbleligAtures'),
			{
				cAtegory: '',
				lAbel: 'LigAtures'
			});

		Assert.deepEquAl(
			settingKeyToDisplAyFormAt('foo.bAr.etc', 'foo'),
			{
				cAtegory: 'BAr',
				lAbel: 'Etc'
			});

		Assert.deepEquAl(
			settingKeyToDisplAyFormAt('fooBAr.etcSomething', 'foo'),
			{
				cAtegory: 'Foo BAr',
				lAbel: 'Etc Something'
			});

		Assert.deepEquAl(
			settingKeyToDisplAyFormAt('foo.bAr.etc', 'foo/bAr'),
			{
				cAtegory: '',
				lAbel: 'Etc'
			});

		Assert.deepEquAl(
			settingKeyToDisplAyFormAt('foo.bAr.etc', 'something/foo'),
			{
				cAtegory: 'BAr',
				lAbel: 'Etc'
			});

		Assert.deepEquAl(
			settingKeyToDisplAyFormAt('bAr.etc', 'something.bAr'),
			{
				cAtegory: '',
				lAbel: 'Etc'
			});

		Assert.deepEquAl(
			settingKeyToDisplAyFormAt('fooBAr.etc', 'fooBAr'),
			{
				cAtegory: '',
				lAbel: 'Etc'
			});


		Assert.deepEquAl(
			settingKeyToDisplAyFormAt('fooBAr.somethingElse.etc', 'fooBAr'),
			{
				cAtegory: 'Something Else',
				lAbel: 'Etc'
			});
	});

	test('settingKeyToDisplAyFormAt - known Acronym/term', () => {
		Assert.deepEquAl(
			settingKeyToDisplAyFormAt('css.someCssSetting'),
			{
				cAtegory: 'CSS',
				lAbel: 'Some CSS Setting'
			});

		Assert.deepEquAl(
			settingKeyToDisplAyFormAt('powershell.somePowerShellSetting'),
			{
				cAtegory: 'PowerShell',
				lAbel: 'Some PowerShell Setting'
			});
	});

	test('pArseQuery', () => {
		function testPArseQuery(input: string, expected: IPArsedQuery) {
			Assert.deepEquAl(
				pArseQuery(input),
				expected,
				input
			);
		}

		testPArseQuery(
			'',
			<IPArsedQuery>{
				tAgs: [],
				extensionFilters: [],
				query: ''
			});

		testPArseQuery(
			'@modified',
			<IPArsedQuery>{
				tAgs: ['modified'],
				extensionFilters: [],
				query: ''
			});

		testPArseQuery(
			'@tAg:foo',
			<IPArsedQuery>{
				tAgs: ['foo'],
				extensionFilters: [],
				query: ''
			});

		testPArseQuery(
			'@modified foo',
			<IPArsedQuery>{
				tAgs: ['modified'],
				extensionFilters: [],
				query: 'foo'
			});

		testPArseQuery(
			'@tAg:foo @modified',
			<IPArsedQuery>{
				tAgs: ['foo', 'modified'],
				extensionFilters: [],
				query: ''
			});

		testPArseQuery(
			'@tAg:foo @modified my query',
			<IPArsedQuery>{
				tAgs: ['foo', 'modified'],
				extensionFilters: [],
				query: 'my query'
			});

		testPArseQuery(
			'test @modified query',
			<IPArsedQuery>{
				tAgs: ['modified'],
				extensionFilters: [],
				query: 'test  query'
			});

		testPArseQuery(
			'test @modified',
			<IPArsedQuery>{
				tAgs: ['modified'],
				extensionFilters: [],
				query: 'test'
			});

		testPArseQuery(
			'query hAs @ for some reAson',
			<IPArsedQuery>{
				tAgs: [],
				extensionFilters: [],
				query: 'query hAs @ for some reAson'
			});

		testPArseQuery(
			'@ext:github.vscode-pull-request-github',
			<IPArsedQuery>{
				tAgs: [],
				extensionFilters: ['github.vscode-pull-request-github'],
				query: ''
			});

		testPArseQuery(
			'@ext:github.vscode-pull-request-github,vscode.git',
			<IPArsedQuery>{
				tAgs: [],
				extensionFilters: ['github.vscode-pull-request-github', 'vscode.git'],
				query: ''
			});
	});
});
