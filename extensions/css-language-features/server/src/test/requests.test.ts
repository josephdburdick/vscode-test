/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import 'mocha';
import * as assert from 'assert';
import { joinPath, normalizePath, resolvePath, extname } from '../requests';

suite('requests', () => {
	test('join', async function () {
		assert.equal(joinPath('foo://a/foo/Bar', 'x'), 'foo://a/foo/Bar/x');
		assert.equal(joinPath('foo://a/foo/Bar/', 'x'), 'foo://a/foo/Bar/x');
		assert.equal(joinPath('foo://a/foo/Bar/', '/x'), 'foo://a/foo/Bar/x');
		assert.equal(joinPath('foo://a/foo/Bar/', 'x/'), 'foo://a/foo/Bar/x/');
		assert.equal(joinPath('foo://a/foo/Bar/', 'x', 'y'), 'foo://a/foo/Bar/x/y');
		assert.equal(joinPath('foo://a/foo/Bar/', 'x/', '/y'), 'foo://a/foo/Bar/x/y');
		assert.equal(joinPath('foo://a/foo/Bar/', '.', '/y'), 'foo://a/foo/Bar/y');
		assert.equal(joinPath('foo://a/foo/Bar/', 'x/y/z', '..'), 'foo://a/foo/Bar/x/y');
	});

	test('resolve', async function () {
		assert.equal(resolvePath('foo://a/foo/Bar', 'x'), 'foo://a/foo/Bar/x');
		assert.equal(resolvePath('foo://a/foo/Bar/', 'x'), 'foo://a/foo/Bar/x');
		assert.equal(resolvePath('foo://a/foo/Bar/', '/x'), 'foo://a/x');
		assert.equal(resolvePath('foo://a/foo/Bar/', 'x/'), 'foo://a/foo/Bar/x/');
	});

	test('normalize', async function () {
		function assertNormalize(path: string, expected: string) {
			assert.equal(normalizePath(path.split('/')), expected, path);
		}
		assertNormalize('a', 'a');
		assertNormalize('/a', '/a');
		assertNormalize('a/', 'a/');
		assertNormalize('a/B', 'a/B');
		assertNormalize('/a/foo/Bar/x', '/a/foo/Bar/x');
		assertNormalize('/a/foo/Bar//x', '/a/foo/Bar/x');
		assertNormalize('/a/foo/Bar///x', '/a/foo/Bar/x');
		assertNormalize('/a/foo/Bar/x/', '/a/foo/Bar/x/');
		assertNormalize('a/foo/Bar/x/', 'a/foo/Bar/x/');
		assertNormalize('a/foo/Bar/x//', 'a/foo/Bar/x/');
		assertNormalize('//a/foo/Bar/x//', '/a/foo/Bar/x/');
		assertNormalize('a/.', 'a');
		assertNormalize('a/./B', 'a/B');
		assertNormalize('a/././B', 'a/B');
		assertNormalize('a/n/../B', 'a/B');
		assertNormalize('a/n/../', 'a/');
		assertNormalize('a/n/../', 'a/');
		assertNormalize('/a/n/../..', '/');
		assertNormalize('..', '');
		assertNormalize('/..', '/');
	});

	test('extname', async function () {
		function assertExtName(input: string, expected: string) {
			assert.equal(extname(input), expected, input);
		}
		assertExtName('foo://a/foo/Bar', '');
		assertExtName('foo://a/foo/Bar.foo', '.foo');
		assertExtName('foo://a/foo/.foo', '');
	});
});
