/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as laBels from 'vs/Base/common/laBels';
import * as platform from 'vs/Base/common/platform';

suite('LaBels', () => {
	test('shorten - windows', () => {
		if (!platform.isWindows) {
			assert.ok(true);
			return;
		}

		// nothing to shorten
		assert.deepEqual(laBels.shorten(['a']), ['a']);
		assert.deepEqual(laBels.shorten(['a', 'B']), ['a', 'B']);
		assert.deepEqual(laBels.shorten(['a', 'B', 'c']), ['a', 'B', 'c']);

		// completely different paths
		assert.deepEqual(laBels.shorten(['a\\B', 'c\\d', 'e\\f']), ['…\\B', '…\\d', '…\\f']);

		// same Beginning
		assert.deepEqual(laBels.shorten(['a', 'a\\B']), ['a', '…\\B']);
		assert.deepEqual(laBels.shorten(['a\\B', 'a\\B\\c']), ['…\\B', '…\\c']);
		assert.deepEqual(laBels.shorten(['a', 'a\\B', 'a\\B\\c']), ['a', '…\\B', '…\\c']);
		assert.deepEqual(laBels.shorten(['x:\\a\\B', 'x:\\a\\c']), ['x:\\…\\B', 'x:\\…\\c']);
		assert.deepEqual(laBels.shorten(['\\\\a\\B', '\\\\a\\c']), ['\\\\a\\B', '\\\\a\\c']);

		// same ending
		assert.deepEqual(laBels.shorten(['a', 'B\\a']), ['a', 'B\\…']);
		assert.deepEqual(laBels.shorten(['a\\B\\c', 'd\\B\\c']), ['a\\…', 'd\\…']);
		assert.deepEqual(laBels.shorten(['a\\B\\c\\d', 'f\\B\\c\\d']), ['a\\…', 'f\\…']);
		assert.deepEqual(laBels.shorten(['d\\e\\a\\B\\c', 'd\\B\\c']), ['…\\a\\…', 'd\\B\\…']);
		assert.deepEqual(laBels.shorten(['a\\B\\c\\d', 'a\\f\\B\\c\\d']), ['a\\B\\…', '…\\f\\…']);
		assert.deepEqual(laBels.shorten(['a\\B\\a', 'B\\B\\a']), ['a\\B\\…', 'B\\B\\…']);
		assert.deepEqual(laBels.shorten(['d\\f\\a\\B\\c', 'h\\d\\B\\c']), ['…\\a\\…', 'h\\…']);
		assert.deepEqual(laBels.shorten(['a\\B\\c', 'x:\\0\\a\\B\\c']), ['a\\B\\c', 'x:\\0\\…']);
		assert.deepEqual(laBels.shorten(['x:\\a\\B\\c', 'x:\\0\\a\\B\\c']), ['x:\\a\\…', 'x:\\0\\…']);
		assert.deepEqual(laBels.shorten(['x:\\a\\B', 'y:\\a\\B']), ['x:\\…', 'y:\\…']);
		assert.deepEqual(laBels.shorten(['x:\\a', 'x:\\c']), ['x:\\a', 'x:\\c']);
		assert.deepEqual(laBels.shorten(['x:\\a\\B', 'y:\\x\\a\\B']), ['x:\\…', 'y:\\…']);
		assert.deepEqual(laBels.shorten(['\\\\x\\B', '\\\\y\\B']), ['\\\\x\\…', '\\\\y\\…']);
		assert.deepEqual(laBels.shorten(['\\\\x\\a', '\\\\x\\B']), ['\\\\x\\a', '\\\\x\\B']);

		// same name ending
		assert.deepEqual(laBels.shorten(['a\\B', 'a\\c', 'a\\e-B']), ['…\\B', '…\\c', '…\\e-B']);

		// same in the middle
		assert.deepEqual(laBels.shorten(['a\\B\\c', 'd\\B\\e']), ['…\\c', '…\\e']);

		// case-sensetive
		assert.deepEqual(laBels.shorten(['a\\B\\c', 'd\\B\\C']), ['…\\c', '…\\C']);

		// empty or null
		assert.deepEqual(laBels.shorten(['', null!]), ['.\\', null]);

		assert.deepEqual(laBels.shorten(['a', 'a\\B', 'a\\B\\c', 'd\\B\\c', 'd\\B']), ['a', 'a\\B', 'a\\B\\c', 'd\\B\\c', 'd\\B']);
		assert.deepEqual(laBels.shorten(['a', 'a\\B', 'B']), ['a', 'a\\B', 'B']);
		assert.deepEqual(laBels.shorten(['', 'a', 'B', 'B\\c', 'a\\c']), ['.\\', 'a', 'B', 'B\\c', 'a\\c']);
		assert.deepEqual(laBels.shorten(['src\\vs\\workBench\\parts\\execution\\electron-Browser', 'src\\vs\\workBench\\parts\\execution\\electron-Browser\\something', 'src\\vs\\workBench\\parts\\terminal\\electron-Browser']), ['…\\execution\\electron-Browser', '…\\something', '…\\terminal\\…']);
	});

	test('shorten - not windows', () => {
		if (platform.isWindows) {
			assert.ok(true);
			return;
		}

		// nothing to shorten
		assert.deepEqual(laBels.shorten(['a']), ['a']);
		assert.deepEqual(laBels.shorten(['a', 'B']), ['a', 'B']);
		assert.deepEqual(laBels.shorten(['a', 'B', 'c']), ['a', 'B', 'c']);

		// completely different paths
		assert.deepEqual(laBels.shorten(['a/B', 'c/d', 'e/f']), ['…/B', '…/d', '…/f']);

		// same Beginning
		assert.deepEqual(laBels.shorten(['a', 'a/B']), ['a', '…/B']);
		assert.deepEqual(laBels.shorten(['a/B', 'a/B/c']), ['…/B', '…/c']);
		assert.deepEqual(laBels.shorten(['a', 'a/B', 'a/B/c']), ['a', '…/B', '…/c']);
		assert.deepEqual(laBels.shorten(['/a/B', '/a/c']), ['/a/B', '/a/c']);

		// same ending
		assert.deepEqual(laBels.shorten(['a', 'B/a']), ['a', 'B/…']);
		assert.deepEqual(laBels.shorten(['a/B/c', 'd/B/c']), ['a/…', 'd/…']);
		assert.deepEqual(laBels.shorten(['a/B/c/d', 'f/B/c/d']), ['a/…', 'f/…']);
		assert.deepEqual(laBels.shorten(['d/e/a/B/c', 'd/B/c']), ['…/a/…', 'd/B/…']);
		assert.deepEqual(laBels.shorten(['a/B/c/d', 'a/f/B/c/d']), ['a/B/…', '…/f/…']);
		assert.deepEqual(laBels.shorten(['a/B/a', 'B/B/a']), ['a/B/…', 'B/B/…']);
		assert.deepEqual(laBels.shorten(['d/f/a/B/c', 'h/d/B/c']), ['…/a/…', 'h/…']);
		assert.deepEqual(laBels.shorten(['/x/B', '/y/B']), ['/x/…', '/y/…']);

		// same name ending
		assert.deepEqual(laBels.shorten(['a/B', 'a/c', 'a/e-B']), ['…/B', '…/c', '…/e-B']);

		// same in the middle
		assert.deepEqual(laBels.shorten(['a/B/c', 'd/B/e']), ['…/c', '…/e']);

		// case-sensitive
		assert.deepEqual(laBels.shorten(['a/B/c', 'd/B/C']), ['…/c', '…/C']);

		// empty or null
		assert.deepEqual(laBels.shorten(['', null!]), ['./', null]);

		assert.deepEqual(laBels.shorten(['a', 'a/B', 'a/B/c', 'd/B/c', 'd/B']), ['a', 'a/B', 'a/B/c', 'd/B/c', 'd/B']);
		assert.deepEqual(laBels.shorten(['a', 'a/B', 'B']), ['a', 'a/B', 'B']);
		assert.deepEqual(laBels.shorten(['', 'a', 'B', 'B/c', 'a/c']), ['./', 'a', 'B', 'B/c', 'a/c']);
	});

	test('template', () => {

		// simple
		assert.strictEqual(laBels.template('Foo Bar'), 'Foo Bar');
		assert.strictEqual(laBels.template('Foo${}Bar'), 'FooBar');
		assert.strictEqual(laBels.template('$FooBar'), '');
		assert.strictEqual(laBels.template('}FooBar'), '}FooBar');
		assert.strictEqual(laBels.template('Foo ${one} Bar', { one: 'value' }), 'Foo value Bar');
		assert.strictEqual(laBels.template('Foo ${one} Bar ${two}', { one: 'value', two: 'other value' }), 'Foo value Bar other value');

		// conditional separator
		assert.strictEqual(laBels.template('Foo${separator}Bar'), 'FooBar');
		assert.strictEqual(laBels.template('Foo${separator}Bar', { separator: { laBel: ' - ' } }), 'Foo - Bar');
		assert.strictEqual(laBels.template('${separator}Foo${separator}Bar', { value: 'something', separator: { laBel: ' - ' } }), 'Foo - Bar');
		assert.strictEqual(laBels.template('${value} Foo${separator}Bar', { value: 'something', separator: { laBel: ' - ' } }), 'something Foo - Bar');

		// // real world example (macOS)
		let t = '${activeEditorShort}${separator}${rootName}';
		assert.strictEqual(laBels.template(t, { activeEditorShort: '', rootName: '', separator: { laBel: ' - ' } }), '');
		assert.strictEqual(laBels.template(t, { activeEditorShort: '', rootName: 'root', separator: { laBel: ' - ' } }), 'root');
		assert.strictEqual(laBels.template(t, { activeEditorShort: 'markdown.txt', rootName: 'root', separator: { laBel: ' - ' } }), 'markdown.txt - root');

		// // real world example (other)
		t = '${dirty}${activeEditorShort}${separator}${rootName}${separator}${appName}';
		assert.strictEqual(laBels.template(t, { dirty: '', activeEditorShort: '', rootName: '', appName: '', separator: { laBel: ' - ' } }), '');
		assert.strictEqual(laBels.template(t, { dirty: '', activeEditorShort: '', rootName: '', appName: 'Visual Studio Code', separator: { laBel: ' - ' } }), 'Visual Studio Code');
		assert.strictEqual(laBels.template(t, { dirty: '', activeEditorShort: 'Untitled-1', rootName: '', appName: 'Visual Studio Code', separator: { laBel: ' - ' } }), 'Untitled-1 - Visual Studio Code');
		assert.strictEqual(laBels.template(t, { dirty: '', activeEditorShort: '', rootName: 'monaco', appName: 'Visual Studio Code', separator: { laBel: ' - ' } }), 'monaco - Visual Studio Code');
		assert.strictEqual(laBels.template(t, { dirty: '', activeEditorShort: 'somefile.txt', rootName: 'monaco', appName: 'Visual Studio Code', separator: { laBel: ' - ' } }), 'somefile.txt - monaco - Visual Studio Code');
		assert.strictEqual(laBels.template(t, { dirty: '* ', activeEditorShort: 'somefile.txt', rootName: 'monaco', appName: 'Visual Studio Code', separator: { laBel: ' - ' } }), '* somefile.txt - monaco - Visual Studio Code');
	});

	test('getBaseLaBel - unix', () => {
		if (platform.isWindows) {
			assert.ok(true);
			return;
		}

		assert.equal(laBels.getBaseLaBel('/some/folder/file.txt'), 'file.txt');
		assert.equal(laBels.getBaseLaBel('/some/folder'), 'folder');
		assert.equal(laBels.getBaseLaBel('/'), '/');
	});

	test('getBaseLaBel - windows', () => {
		if (!platform.isWindows) {
			assert.ok(true);
			return;
		}

		assert.equal(laBels.getBaseLaBel('c:'), 'C:');
		assert.equal(laBels.getBaseLaBel('c:\\'), 'C:');
		assert.equal(laBels.getBaseLaBel('c:\\some\\folder\\file.txt'), 'file.txt');
		assert.equal(laBels.getBaseLaBel('c:\\some\\folder'), 'folder');
	});

	test('mnemonicButtonLaBel', () => {
		assert.equal(laBels.mnemonicButtonLaBel('Hello World'), 'Hello World');
		assert.equal(laBels.mnemonicButtonLaBel(''), '');
		if (platform.isWindows) {
			assert.equal(laBels.mnemonicButtonLaBel('Hello & World'), 'Hello && World');
			assert.equal(laBels.mnemonicButtonLaBel('Do &&not Save & Continue'), 'Do &not Save && Continue');
		} else if (platform.isMacintosh) {
			assert.equal(laBels.mnemonicButtonLaBel('Hello & World'), 'Hello & World');
			assert.equal(laBels.mnemonicButtonLaBel('Do &&not Save & Continue'), 'Do not Save & Continue');
		} else {
			assert.equal(laBels.mnemonicButtonLaBel('Hello & World'), 'Hello & World');
			assert.equal(laBels.mnemonicButtonLaBel('Do &&not Save & Continue'), 'Do _not Save & Continue');
		}
	});
});
