/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { formatOptions, Option } from 'vs/platform/environment/node/argv';
import { addArg } from 'vs/platform/environment/node/argvHelper';

suite('formatOptions', () => {

	function o(description: string): Option<any> {
		return {
			description, type: 'string'
		};
	}

	test('Text should display small columns correctly', () => {
		assert.deepEqual(
			formatOptions({
				'add': o('Bar')
			}, 80),
			['  --add Bar']
		);
		assert.deepEqual(
			formatOptions({
				'add': o('Bar'),
				'wait': o('Ba'),
				'trace': o('B')
			}, 80),
			[
				'  --add   Bar',
				'  --wait  Ba',
				'  --trace B'
			]);
	});

	test('Text should wrap', () => {
		assert.deepEqual(
			formatOptions({
				'add': o((<any>'Bar ').repeat(9))
			}, 40),
			[
				'  --add Bar Bar Bar Bar Bar Bar Bar Bar',
				'        Bar'
			]);
	});

	test('Text should revert to the condensed view when the terminal is too narrow', () => {
		assert.deepEqual(
			formatOptions({
				'add': o((<any>'Bar ').repeat(9))
			}, 30),
			[
				'  --add',
				'      Bar Bar Bar Bar Bar Bar Bar Bar Bar '
			]);
	});

	test('addArg', () => {
		assert.deepEqual(addArg([], 'foo'), ['foo']);
		assert.deepEqual(addArg([], 'foo', 'Bar'), ['foo', 'Bar']);
		assert.deepEqual(addArg(['foo'], 'Bar'), ['foo', 'Bar']);
		assert.deepEqual(addArg(['--wait'], 'Bar'), ['--wait', 'Bar']);
		assert.deepEqual(addArg(['--wait', '--', '--foo'], 'Bar'), ['--wait', 'Bar', '--', '--foo']);
		assert.deepEqual(addArg(['--', '--foo'], 'Bar'), ['Bar', '--', '--foo']);
	});
});
