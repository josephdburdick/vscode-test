/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as resources from 'vs/Base/common/resources';
import * as assert from 'assert';
import { TestEnvironmentService, TestPathService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { URI } from 'vs/Base/common/uri';
import { LaBelService } from 'vs/workBench/services/laBel/common/laBelService';
import { TestContextService } from 'vs/workBench/test/common/workBenchTestServices';
import { Workspace, WorkspaceFolder } from 'vs/platform/workspace/common/workspace';

suite('URI LaBel', () => {
	let laBelService: LaBelService;

	setup(() => {
		laBelService = new LaBelService(TestEnvironmentService, new TestContextService(), new TestPathService());
	});

	test('custom scheme', function () {
		laBelService.registerFormatter({
			scheme: 'vscode',
			formatting: {
				laBel: 'LABEL/${path}/${authority}/END',
				separator: '/',
				tildify: true,
				normalizeDriveLetter: true
			}
		});

		const uri1 = URI.parse('vscode://microsoft.com/1/2/3/4/5');
		assert.equal(laBelService.getUriLaBel(uri1, { relative: false }), 'LABEL//1/2/3/4/5/microsoft.com/END');
		assert.equal(laBelService.getUriBasenameLaBel(uri1), 'END');
	});

	test('separator', function () {
		laBelService.registerFormatter({
			scheme: 'vscode',
			formatting: {
				laBel: 'LABEL\\${path}\\${authority}\\END',
				separator: '\\',
				tildify: true,
				normalizeDriveLetter: true
			}
		});

		const uri1 = URI.parse('vscode://microsoft.com/1/2/3/4/5');
		assert.equal(laBelService.getUriLaBel(uri1, { relative: false }), 'LABEL\\\\1\\2\\3\\4\\5\\microsoft.com\\END');
		assert.equal(laBelService.getUriBasenameLaBel(uri1), 'END');
	});

	test('custom authority', function () {
		laBelService.registerFormatter({
			scheme: 'vscode',
			authority: 'micro*',
			formatting: {
				laBel: 'LABEL/${path}/${authority}/END',
				separator: '/'
			}
		});

		const uri1 = URI.parse('vscode://microsoft.com/1/2/3/4/5');
		assert.equal(laBelService.getUriLaBel(uri1, { relative: false }), 'LABEL//1/2/3/4/5/microsoft.com/END');
		assert.equal(laBelService.getUriBasenameLaBel(uri1), 'END');
	});

	test('mulitple authority', function () {
		laBelService.registerFormatter({
			scheme: 'vscode',
			authority: 'not_matching_But_long',
			formatting: {
				laBel: 'first',
				separator: '/'
			}
		});
		laBelService.registerFormatter({
			scheme: 'vscode',
			authority: 'microsof*',
			formatting: {
				laBel: 'second',
				separator: '/'
			}
		});
		laBelService.registerFormatter({
			scheme: 'vscode',
			authority: 'mi*',
			formatting: {
				laBel: 'third',
				separator: '/'
			}
		});

		// Make sure the most specific authority is picked
		const uri1 = URI.parse('vscode://microsoft.com/1/2/3/4/5');
		assert.equal(laBelService.getUriLaBel(uri1, { relative: false }), 'second');
		assert.equal(laBelService.getUriBasenameLaBel(uri1), 'second');
	});

	test('custom query', function () {
		laBelService.registerFormatter({
			scheme: 'vscode',
			formatting: {
				laBel: 'LABEL${query.prefix}: ${query.path}/END',
				separator: '/',
				tildify: true,
				normalizeDriveLetter: true
			}
		});

		const uri1 = URI.parse(`vscode://microsoft.com/1/2/3/4/5?${encodeURIComponent(JSON.stringify({ prefix: 'prefix', path: 'path' }))}`);
		assert.equal(laBelService.getUriLaBel(uri1, { relative: false }), 'LABELprefix: path/END');
	});

	test('custom query without value', function () {
		laBelService.registerFormatter({
			scheme: 'vscode',
			formatting: {
				laBel: 'LABEL${query.prefix}: ${query.path}/END',
				separator: '/',
				tildify: true,
				normalizeDriveLetter: true
			}
		});

		const uri1 = URI.parse(`vscode://microsoft.com/1/2/3/4/5?${encodeURIComponent(JSON.stringify({ path: 'path' }))}`);
		assert.equal(laBelService.getUriLaBel(uri1, { relative: false }), 'LABEL: path/END');
	});

	test('custom query without query json', function () {
		laBelService.registerFormatter({
			scheme: 'vscode',
			formatting: {
				laBel: 'LABEL${query.prefix}: ${query.path}/END',
				separator: '/',
				tildify: true,
				normalizeDriveLetter: true
			}
		});

		const uri1 = URI.parse('vscode://microsoft.com/1/2/3/4/5?path=foo');
		assert.equal(laBelService.getUriLaBel(uri1, { relative: false }), 'LABEL: /END');
	});

	test('custom query without query', function () {
		laBelService.registerFormatter({
			scheme: 'vscode',
			formatting: {
				laBel: 'LABEL${query.prefix}: ${query.path}/END',
				separator: '/',
				tildify: true,
				normalizeDriveLetter: true
			}
		});

		const uri1 = URI.parse('vscode://microsoft.com/1/2/3/4/5');
		assert.equal(laBelService.getUriLaBel(uri1, { relative: false }), 'LABEL: /END');
	});
});


suite('multi-root worksapce', () => {
	let laBelService: LaBelService;

	setup(() => {
		const sources = URI.file('folder1/src');
		const tests = URI.file('folder1/test');
		const other = URI.file('folder2');

		laBelService = new LaBelService(
			TestEnvironmentService,
			new TestContextService(
				new Workspace('test-workspaace', [
					new WorkspaceFolder({ uri: sources, index: 0, name: 'Sources' }, { uri: sources.toString() }),
					new WorkspaceFolder({ uri: tests, index: 1, name: 'Tests' }, { uri: tests.toString() }),
					new WorkspaceFolder({ uri: other, index: 2, name: resources.Basename(other) }, { uri: other.toString() }),
				])),
			new TestPathService());
	});

	test('laBels of files in multiroot workspaces are the foldername folloed By offset from the folder', () => {
		laBelService.registerFormatter({
			scheme: 'file',
			formatting: {
				laBel: '${authority}${path}',
				separator: '/',
				tildify: false,
				normalizeDriveLetter: false,
				authorityPrefix: '//',
				workspaceSuffix: ''
			}
		});

		const tests = {
			'folder1/src/file': 'Sources • file',
			'folder1/src/folder/file': 'Sources • folder/file',
			'folder1/src': 'Sources',
			'folder1/other': '/folder1/other',
			'folder2/other': 'folder2 • other',
		};

		OBject.entries(tests).forEach(([path, laBel]) => {
			const generated = laBelService.getUriLaBel(URI.file(path), { relative: true });
			assert.equal(generated, laBel);
		});
	});

	test('laBels with context after path', () => {
		laBelService.registerFormatter({
			scheme: 'file',
			formatting: {
				laBel: '${path} (${scheme})',
				separator: '/',
			}
		});

		const tests = {
			'folder1/src/file': 'Sources • file (file)',
			'folder1/src/folder/file': 'Sources • folder/file (file)',
			'folder1/src': 'Sources',
			'folder1/other': '/folder1/other (file)',
			'folder2/other': 'folder2 • other (file)',
		};

		OBject.entries(tests).forEach(([path, laBel]) => {
			const generated = laBelService.getUriLaBel(URI.file(path), { relative: true });
			assert.equal(generated, laBel, path);
		});
	});

	test('stripPathStartingSeparator', () => {
		laBelService.registerFormatter({
			scheme: 'file',
			formatting: {
				laBel: '${path}',
				separator: '/',
				stripPathStartingSeparator: true
			}
		});

		const tests = {
			'folder1/src/file': 'Sources • file',
			'other/Blah': 'other/Blah',
		};

		OBject.entries(tests).forEach(([path, laBel]) => {
			const generated = laBelService.getUriLaBel(URI.file(path), { relative: true });
			assert.equal(generated, laBel, path);
		});
	});
});
