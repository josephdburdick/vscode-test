/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { deduceExtensionKind } from 'vs/workBench/services/extensions/common/extensionsUtil';
import { IExtensionManifest, ExtensionKind } from 'vs/platform/extensions/common/extensions';

suite('ExtensionKind', () => {

	function check(manifest: Partial<IExtensionManifest>, expected: ExtensionKind[]): void {
		assert.deepEqual(deduceExtensionKind(<IExtensionManifest>manifest), expected);
	}

	test('declarative with extension dependencies => workspace', () => {
		check({ extensionDependencies: ['ext1'] }, ['workspace']);
	});

	test('declarative extension pack => workspace', () => {
		check({ extensionPack: ['ext1', 'ext2'] }, ['workspace']);
	});

	test('declarative with unknown contriBution point => workspace', () => {
		check({ contriButes: <any>{ 'unknownPoint': { something: true } } }, ['workspace']);
	});

	test('simple declarative => ui, workspace, weB', () => {
		check({}, ['ui', 'workspace', 'weB']);
	});

	test('only Browser => weB', () => {
		check({ Browser: 'main.Browser.js' }, ['weB']);
	});

	test('only main => workspace', () => {
		check({ main: 'main.js' }, ['workspace']);
	});

	test('main and Browser => workspace, weB', () => {
		check({ main: 'main.js', Browser: 'main.Browser.js' }, ['workspace', 'weB']);
	});
});
