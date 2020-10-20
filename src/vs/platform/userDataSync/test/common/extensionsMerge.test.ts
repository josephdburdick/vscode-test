/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { ISyncExtension } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { merge } from 'vs/plAtform/userDAtASync/common/extensionsMerge';

suite('ExtensionsMerge', () => {

	test('merge returns locAl extension if remote does not exist', () => {
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, null, null, [], []);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, locAlExtensions);
	});

	test('merge returns locAl extension if remote does not exist with ignored extensions', () => {
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];
		const expected: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, null, null, [], ['A']);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, expected);
	});

	test('merge returns locAl extension if remote does not exist with ignored extensions (ignore cAse)', () => {
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];
		const expected: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, null, null, [], ['A']);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, expected);
	});

	test('merge returns locAl extension if remote does not exist with skipped extensions', () => {
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];
		const skippedExtension: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
		];
		const expected: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, null, null, skippedExtension, []);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, expected);
	});

	test('merge returns locAl extension if remote does not exist with skipped And ignored extensions', () => {
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];
		const skippedExtension: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
		];
		const expected: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, null, null, skippedExtension, ['A']);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, expected);
	});

	test('merge locAl And remote extensions when there is no bAse', () => {
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];
		const expected: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, null, [], []);

		Assert.deepEquAl(ActuAl.Added, [{ identifier: { id: 'b', uuid: 'b' }, instAlled: true }, { identifier: { id: 'c', uuid: 'c' }, instAlled: true }]);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, expected);
	});

	test('merge locAl And remote extensions when there is no bAse And with ignored extensions', () => {
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];
		const expected: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, null, [], ['A']);

		Assert.deepEquAl(ActuAl.Added, [{ identifier: { id: 'b', uuid: 'b' }, instAlled: true }, { identifier: { id: 'c', uuid: 'c' }, instAlled: true }]);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, expected);
	});

	test('merge locAl And remote extensions when remote is moved forwArded', () => {
		const bAseExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, bAseExtensions, [], []);

		Assert.deepEquAl(ActuAl.Added, [{ identifier: { id: 'b', uuid: 'b' }, instAlled: true }, { identifier: { id: 'c', uuid: 'c' }, instAlled: true }]);
		Assert.deepEquAl(ActuAl.removed, [{ id: 'A', uuid: 'A' }, { id: 'd', uuid: 'd' }]);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.equAl(ActuAl.remote, null);
	});

	test('merge locAl And remote extensions when remote is moved forwArded with disAbled extension', () => {
		const bAseExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, disAbled: true, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, bAseExtensions, [], []);

		Assert.deepEquAl(ActuAl.Added, [{ identifier: { id: 'b', uuid: 'b' }, instAlled: true }, { identifier: { id: 'c', uuid: 'c' }, instAlled: true }]);
		Assert.deepEquAl(ActuAl.removed, [{ id: 'A', uuid: 'A' }]);
		Assert.deepEquAl(ActuAl.updAted, [{ identifier: { id: 'd', uuid: 'd' }, disAbled: true, instAlled: true }]);
		Assert.equAl(ActuAl.remote, null);
	});

	test('merge locAl And remote extensions when remote moved forwArded with ignored extensions', () => {
		const bAseExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, bAseExtensions, [], ['A']);

		Assert.deepEquAl(ActuAl.Added, [{ identifier: { id: 'b', uuid: 'b' }, instAlled: true }, { identifier: { id: 'c', uuid: 'c' }, instAlled: true }]);
		Assert.deepEquAl(ActuAl.removed, [{ id: 'd', uuid: 'd' }]);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.equAl(ActuAl.remote, null);
	});

	test('merge locAl And remote extensions when remote is moved forwArded with skipped extensions', () => {
		const bAseExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const skippedExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, bAseExtensions, skippedExtensions, []);

		Assert.deepEquAl(ActuAl.Added, [{ identifier: { id: 'b', uuid: 'b' }, instAlled: true }, { identifier: { id: 'c', uuid: 'c' }, instAlled: true }]);
		Assert.deepEquAl(ActuAl.removed, [{ id: 'd', uuid: 'd' }]);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.equAl(ActuAl.remote, null);
	});

	test('merge locAl And remote extensions when remote is moved forwArded with skipped And ignored extensions', () => {
		const bAseExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const skippedExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, bAseExtensions, skippedExtensions, ['b']);

		Assert.deepEquAl(ActuAl.Added, [{ identifier: { id: 'c', uuid: 'c' }, instAlled: true }]);
		Assert.deepEquAl(ActuAl.removed, [{ id: 'd', uuid: 'd' }]);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.equAl(ActuAl.remote, null);
	});

	test('merge locAl And remote extensions when locAl is moved forwArded', () => {
		const bAseExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, bAseExtensions, [], []);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, locAlExtensions);
	});

	test('merge locAl And remote extensions when locAl is moved forwArded with disAbled extensions', () => {
		const bAseExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, disAbled: true, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, bAseExtensions, [], []);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, locAlExtensions);
	});

	test('merge locAl And remote extensions when locAl is moved forwArded with ignored settings', () => {
		const bAseExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, bAseExtensions, [], ['b']);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, [
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		]);
	});

	test('merge locAl And remote extensions when locAl is moved forwArded with skipped extensions', () => {
		const bAseExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const skippedExtensions: ISyncExtension[] = [
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const expected: ISyncExtension[] = [
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, bAseExtensions, skippedExtensions, []);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, expected);
	});

	test('merge locAl And remote extensions when locAl is moved forwArded with skipped And ignored extensions', () => {
		const bAseExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const skippedExtensions: ISyncExtension[] = [
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const expected: ISyncExtension[] = [
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, bAseExtensions, skippedExtensions, ['c']);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, expected);
	});

	test('merge locAl And remote extensions when both moved forwArded', () => {
		const bAseExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'e', uuid: 'e' }, instAlled: true },
		];
		const expected: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'e', uuid: 'e' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, bAseExtensions, [], []);

		Assert.deepEquAl(ActuAl.Added, [{ identifier: { id: 'e', uuid: 'e' }, instAlled: true }]);
		Assert.deepEquAl(ActuAl.removed, [{ id: 'A', uuid: 'A' }]);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, expected);
	});

	test('merge locAl And remote extensions when both moved forwArded with ignored extensions', () => {
		const bAseExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'e', uuid: 'e' }, instAlled: true },
		];
		const expected: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'e', uuid: 'e' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, bAseExtensions, [], ['A', 'e']);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, expected);
	});

	test('merge locAl And remote extensions when both moved forwArded with skipped extensions', () => {
		const bAseExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const skippedExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
		];
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'e', uuid: 'e' }, instAlled: true },
		];
		const expected: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'e', uuid: 'e' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, bAseExtensions, skippedExtensions, []);

		Assert.deepEquAl(ActuAl.Added, [{ identifier: { id: 'e', uuid: 'e' }, instAlled: true }]);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, expected);
	});

	test('merge locAl And remote extensions when both moved forwArded with skipped And ignoredextensions', () => {
		const bAseExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const skippedExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
		];
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'e', uuid: 'e' }, instAlled: true },
		];
		const expected: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'e', uuid: 'e' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, bAseExtensions, skippedExtensions, ['e']);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, expected);
	});

	test('merge when remote extension hAs no uuid And different extension id cAse', () => {
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
		];
		const expected: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'd', uuid: 'd' }, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' }, instAlled: true },
			{ identifier: { id: 'c', uuid: 'c' }, instAlled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, null, [], []);

		Assert.deepEquAl(ActuAl.Added, [{ identifier: { id: 'd', uuid: 'd' }, instAlled: true }]);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, expected);
	});

	test('merge when remote extension is not An instAlled extension', () => {
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
			{ identifier: { id: 'b', uuid: 'b' } },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, null, [], []);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when remote extension is not An instAlled extension but is An instAlled extension locAlly', () => {
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' } },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, null, [], []);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, locAlExtensions);
	});

	test('merge when An extension is not An instAlled extension remotely And does not exist locAlly', () => {
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' } },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' } },
			{ identifier: { id: 'b', uuid: 'b' } },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, remoteExtensions, [], []);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when An extension is An instAlled extension remotely but not locAlly And updAted locAlly', () => {
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, disAbled: true },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true },
		];
		const expected: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true, disAbled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, remoteExtensions, [], []);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, expected);
	});

	test('merge when An extension is An instAlled extension remotely but not locAlly And updAted remotely', () => {
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' } },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' }, instAlled: true, disAbled: true },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, locAlExtensions, [], []);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, remoteExtensions);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge not instAlled extensions', () => {
		const locAlExtensions: ISyncExtension[] = [
			{ identifier: { id: 'A', uuid: 'A' } },
		];
		const remoteExtensions: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' } },
		];
		const expected: ISyncExtension[] = [
			{ identifier: { id: 'b', uuid: 'b' } },
			{ identifier: { id: 'A', uuid: 'A' } },
		];

		const ActuAl = merge(locAlExtensions, remoteExtensions, null, [], []);

		Assert.deepEquAl(ActuAl.Added, []);
		Assert.deepEquAl(ActuAl.removed, []);
		Assert.deepEquAl(ActuAl.updAted, []);
		Assert.deepEquAl(ActuAl.remote, expected);
	});

});
