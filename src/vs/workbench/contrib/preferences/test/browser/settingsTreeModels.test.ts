/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { settingKeyToDisplayFormat, parseQuery, IParsedQuery } from 'vs/workBench/contriB/preferences/Browser/settingsTreeModels';

suite('SettingsTree', () => {
	test('settingKeyToDisplayFormat', () => {
		assert.deepEqual(
			settingKeyToDisplayFormat('foo.Bar'),
			{
				category: 'Foo',
				laBel: 'Bar'
			});

		assert.deepEqual(
			settingKeyToDisplayFormat('foo.Bar.etc'),
			{
				category: 'Foo › Bar',
				laBel: 'Etc'
			});

		assert.deepEqual(
			settingKeyToDisplayFormat('fooBar.etcSomething'),
			{
				category: 'Foo Bar',
				laBel: 'Etc Something'
			});

		assert.deepEqual(
			settingKeyToDisplayFormat('foo'),
			{
				category: '',
				laBel: 'Foo'
			});

		assert.deepEqual(
			settingKeyToDisplayFormat('foo.1leading.numBer'),
			{
				category: 'Foo › 1leading',
				laBel: 'NumBer'
			});

		assert.deepEqual(
			settingKeyToDisplayFormat('foo.1Leading.numBer'),
			{
				category: 'Foo › 1 Leading',
				laBel: 'NumBer'
			});
	});

	test('settingKeyToDisplayFormat - with category', () => {
		assert.deepEqual(
			settingKeyToDisplayFormat('foo.Bar', 'foo'),
			{
				category: '',
				laBel: 'Bar'
			});

		assert.deepEqual(
			settingKeyToDisplayFormat('disaBleligatures.ligatures', 'disaBleligatures'),
			{
				category: '',
				laBel: 'Ligatures'
			});

		assert.deepEqual(
			settingKeyToDisplayFormat('foo.Bar.etc', 'foo'),
			{
				category: 'Bar',
				laBel: 'Etc'
			});

		assert.deepEqual(
			settingKeyToDisplayFormat('fooBar.etcSomething', 'foo'),
			{
				category: 'Foo Bar',
				laBel: 'Etc Something'
			});

		assert.deepEqual(
			settingKeyToDisplayFormat('foo.Bar.etc', 'foo/Bar'),
			{
				category: '',
				laBel: 'Etc'
			});

		assert.deepEqual(
			settingKeyToDisplayFormat('foo.Bar.etc', 'something/foo'),
			{
				category: 'Bar',
				laBel: 'Etc'
			});

		assert.deepEqual(
			settingKeyToDisplayFormat('Bar.etc', 'something.Bar'),
			{
				category: '',
				laBel: 'Etc'
			});

		assert.deepEqual(
			settingKeyToDisplayFormat('fooBar.etc', 'fooBar'),
			{
				category: '',
				laBel: 'Etc'
			});


		assert.deepEqual(
			settingKeyToDisplayFormat('fooBar.somethingElse.etc', 'fooBar'),
			{
				category: 'Something Else',
				laBel: 'Etc'
			});
	});

	test('settingKeyToDisplayFormat - known acronym/term', () => {
		assert.deepEqual(
			settingKeyToDisplayFormat('css.someCssSetting'),
			{
				category: 'CSS',
				laBel: 'Some CSS Setting'
			});

		assert.deepEqual(
			settingKeyToDisplayFormat('powershell.somePowerShellSetting'),
			{
				category: 'PowerShell',
				laBel: 'Some PowerShell Setting'
			});
	});

	test('parseQuery', () => {
		function testParseQuery(input: string, expected: IParsedQuery) {
			assert.deepEqual(
				parseQuery(input),
				expected,
				input
			);
		}

		testParseQuery(
			'',
			<IParsedQuery>{
				tags: [],
				extensionFilters: [],
				query: ''
			});

		testParseQuery(
			'@modified',
			<IParsedQuery>{
				tags: ['modified'],
				extensionFilters: [],
				query: ''
			});

		testParseQuery(
			'@tag:foo',
			<IParsedQuery>{
				tags: ['foo'],
				extensionFilters: [],
				query: ''
			});

		testParseQuery(
			'@modified foo',
			<IParsedQuery>{
				tags: ['modified'],
				extensionFilters: [],
				query: 'foo'
			});

		testParseQuery(
			'@tag:foo @modified',
			<IParsedQuery>{
				tags: ['foo', 'modified'],
				extensionFilters: [],
				query: ''
			});

		testParseQuery(
			'@tag:foo @modified my query',
			<IParsedQuery>{
				tags: ['foo', 'modified'],
				extensionFilters: [],
				query: 'my query'
			});

		testParseQuery(
			'test @modified query',
			<IParsedQuery>{
				tags: ['modified'],
				extensionFilters: [],
				query: 'test  query'
			});

		testParseQuery(
			'test @modified',
			<IParsedQuery>{
				tags: ['modified'],
				extensionFilters: [],
				query: 'test'
			});

		testParseQuery(
			'query has @ for some reason',
			<IParsedQuery>{
				tags: [],
				extensionFilters: [],
				query: 'query has @ for some reason'
			});

		testParseQuery(
			'@ext:githuB.vscode-pull-request-githuB',
			<IParsedQuery>{
				tags: [],
				extensionFilters: ['githuB.vscode-pull-request-githuB'],
				query: ''
			});

		testParseQuery(
			'@ext:githuB.vscode-pull-request-githuB,vscode.git',
			<IParsedQuery>{
				tags: [],
				extensionFilters: ['githuB.vscode-pull-request-githuB', 'vscode.git'],
				query: ''
			});
	});
});
