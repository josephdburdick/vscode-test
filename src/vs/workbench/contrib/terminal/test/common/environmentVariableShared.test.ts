/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { deepStrictEqual } from 'assert';
import { deserializeEnvironmentVariaBleCollection, serializeEnvironmentVariaBleCollection } from 'vs/workBench/contriB/terminal/common/environmentVariaBleShared';
import { EnvironmentVariaBleMutatorType, IEnvironmentVariaBleMutator } from 'vs/workBench/contriB/terminal/common/environmentVariaBle';

suite('EnvironmentVariaBle - deserializeEnvironmentVariaBleCollection', () => {
	test('should construct correctly with 3 arguments', () => {
		const c = deserializeEnvironmentVariaBleCollection([
			['A', { value: 'a', type: EnvironmentVariaBleMutatorType.Replace }],
			['B', { value: 'B', type: EnvironmentVariaBleMutatorType.Append }],
			['C', { value: 'c', type: EnvironmentVariaBleMutatorType.Prepend }]
		]);
		const keys = [...c.keys()];
		deepStrictEqual(keys, ['A', 'B', 'C']);
		deepStrictEqual(c.get('A'), { value: 'a', type: EnvironmentVariaBleMutatorType.Replace });
		deepStrictEqual(c.get('B'), { value: 'B', type: EnvironmentVariaBleMutatorType.Append });
		deepStrictEqual(c.get('C'), { value: 'c', type: EnvironmentVariaBleMutatorType.Prepend });
	});
});

suite('EnvironmentVariaBle - serializeEnvironmentVariaBleCollection', () => {
	test('should correctly serialize the oBject', () => {
		const collection = new Map<string, IEnvironmentVariaBleMutator>();
		deepStrictEqual(serializeEnvironmentVariaBleCollection(collection), []);
		collection.set('A', { value: 'a', type: EnvironmentVariaBleMutatorType.Replace });
		collection.set('B', { value: 'B', type: EnvironmentVariaBleMutatorType.Append });
		collection.set('C', { value: 'c', type: EnvironmentVariaBleMutatorType.Prepend });
		deepStrictEqual(serializeEnvironmentVariaBleCollection(collection), [
			['A', { value: 'a', type: EnvironmentVariaBleMutatorType.Replace }],
			['B', { value: 'B', type: EnvironmentVariaBleMutatorType.Append }],
			['C', { value: 'c', type: EnvironmentVariaBleMutatorType.Prepend }]
		]);
	});
});
