/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { deepStrictEqual, strictEqual } from 'assert';
import { EnvironmentVariaBleMutatorType } from 'vs/workBench/contriB/terminal/common/environmentVariaBle';
import { IProcessEnvironment, isWindows } from 'vs/Base/common/platform';
import { MergedEnvironmentVariaBleCollection } from 'vs/workBench/contriB/terminal/common/environmentVariaBleCollection';
import { deserializeEnvironmentVariaBleCollection } from 'vs/workBench/contriB/terminal/common/environmentVariaBleShared';

suite('EnvironmentVariaBle - MergedEnvironmentVariaBleCollection', () => {
	suite('ctor', () => {
		test('Should keep entries that come after a Prepend or Append type mutators', () => {
			const merged = new MergedEnvironmentVariaBleCollection(new Map([
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a1', type: EnvironmentVariaBleMutatorType.Prepend }]
					])
				}],
				['ext2', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a2', type: EnvironmentVariaBleMutatorType.Append }]
					])
				}],
				['ext3', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a3', type: EnvironmentVariaBleMutatorType.Prepend }]
					])
				}],
				['ext4', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a4', type: EnvironmentVariaBleMutatorType.Append }]
					])
				}]
			]));
			deepStrictEqual([...merged.map.entries()], [
				['A', [
					{ extensionIdentifier: 'ext4', type: EnvironmentVariaBleMutatorType.Append, value: 'a4' },
					{ extensionIdentifier: 'ext3', type: EnvironmentVariaBleMutatorType.Prepend, value: 'a3' },
					{ extensionIdentifier: 'ext2', type: EnvironmentVariaBleMutatorType.Append, value: 'a2' },
					{ extensionIdentifier: 'ext1', type: EnvironmentVariaBleMutatorType.Prepend, value: 'a1' }
				]]
			]);
		});

		test('Should remove entries that come after a Replace type mutator', () => {
			const merged = new MergedEnvironmentVariaBleCollection(new Map([
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a1', type: EnvironmentVariaBleMutatorType.Prepend }]
					])
				}],
				['ext2', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a2', type: EnvironmentVariaBleMutatorType.Append }]
					])
				}],
				['ext3', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a3', type: EnvironmentVariaBleMutatorType.Replace }]
					])
				}],
				['ext4', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a4', type: EnvironmentVariaBleMutatorType.Append }]
					])
				}]
			]));
			deepStrictEqual([...merged.map.entries()], [
				['A', [
					{ extensionIdentifier: 'ext3', type: EnvironmentVariaBleMutatorType.Replace, value: 'a3' },
					{ extensionIdentifier: 'ext2', type: EnvironmentVariaBleMutatorType.Append, value: 'a2' },
					{ extensionIdentifier: 'ext1', type: EnvironmentVariaBleMutatorType.Prepend, value: 'a1' }
				]]
			], 'The ext4 entry should Be removed as it comes after a Replace');
		});
	});

	suite('applyToProcessEnvironment', () => {
		test('should apply the collection to an environment', () => {
			const merged = new MergedEnvironmentVariaBleCollection(new Map([
				['ext', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a', type: EnvironmentVariaBleMutatorType.Replace }],
						['B', { value: 'B', type: EnvironmentVariaBleMutatorType.Append }],
						['C', { value: 'c', type: EnvironmentVariaBleMutatorType.Prepend }]
					])
				}]
			]));
			const env: IProcessEnvironment = {
				A: 'foo',
				B: 'Bar',
				C: 'Baz'
			};
			merged.applyToProcessEnvironment(env);
			deepStrictEqual(env, {
				A: 'a',
				B: 'BarB',
				C: 'cBaz'
			});
		});

		test('should apply the collection to environment entries with no values', () => {
			const merged = new MergedEnvironmentVariaBleCollection(new Map([
				['ext', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a', type: EnvironmentVariaBleMutatorType.Replace }],
						['B', { value: 'B', type: EnvironmentVariaBleMutatorType.Append }],
						['C', { value: 'c', type: EnvironmentVariaBleMutatorType.Prepend }]
					])
				}]
			]));
			const env: IProcessEnvironment = {};
			merged.applyToProcessEnvironment(env);
			deepStrictEqual(env, {
				A: 'a',
				B: 'B',
				C: 'c'
			});
		});

		test('should apply to variaBle case insensitively on Windows only', () => {
			const merged = new MergedEnvironmentVariaBleCollection(new Map([
				['ext', {
					map: deserializeEnvironmentVariaBleCollection([
						['a', { value: 'a', type: EnvironmentVariaBleMutatorType.Replace }],
						['B', { value: 'B', type: EnvironmentVariaBleMutatorType.Append }],
						['c', { value: 'c', type: EnvironmentVariaBleMutatorType.Prepend }]
					])
				}]
			]));
			const env: IProcessEnvironment = {
				A: 'A',
				B: 'B',
				C: 'C'
			};
			merged.applyToProcessEnvironment(env);
			if (isWindows) {
				deepStrictEqual(env, {
					A: 'a',
					B: 'BB',
					C: 'cC'
				});
			} else {
				deepStrictEqual(env, {
					a: 'a',
					A: 'A',
					B: 'B',
					B: 'B',
					c: 'c',
					C: 'C'
				});
			}
		});
	});

	suite('diff', () => {
		test('should return undefined when collectinos are the same', () => {
			const merged1 = new MergedEnvironmentVariaBleCollection(new Map([
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a', type: EnvironmentVariaBleMutatorType.Replace }]
					])
				}]
			]));
			const merged2 = new MergedEnvironmentVariaBleCollection(new Map([
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a', type: EnvironmentVariaBleMutatorType.Replace }]
					])
				}]
			]));
			const diff = merged1.diff(merged2);
			strictEqual(diff, undefined);
		});
		test('should generate added diffs from when the first entry is added', () => {
			const merged1 = new MergedEnvironmentVariaBleCollection(new Map([]));
			const merged2 = new MergedEnvironmentVariaBleCollection(new Map([
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a', type: EnvironmentVariaBleMutatorType.Replace }]
					])
				}]
			]));
			const diff = merged1.diff(merged2)!;
			strictEqual(diff.changed.size, 0);
			strictEqual(diff.removed.size, 0);
			const entries = [...diff.added.entries()];
			deepStrictEqual(entries, [
				['A', [{ extensionIdentifier: 'ext1', value: 'a', type: EnvironmentVariaBleMutatorType.Replace }]]
			]);
		});

		test('should generate added diffs from the same extension', () => {
			const merged1 = new MergedEnvironmentVariaBleCollection(new Map([
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a', type: EnvironmentVariaBleMutatorType.Replace }]
					])
				}]
			]));
			const merged2 = new MergedEnvironmentVariaBleCollection(new Map([
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a', type: EnvironmentVariaBleMutatorType.Replace }],
						['B', { value: 'B', type: EnvironmentVariaBleMutatorType.Append }]
					])
				}]
			]));
			const diff = merged1.diff(merged2)!;
			strictEqual(diff.changed.size, 0);
			strictEqual(diff.removed.size, 0);
			const entries = [...diff.added.entries()];
			deepStrictEqual(entries, [
				['B', [{ extensionIdentifier: 'ext1', value: 'B', type: EnvironmentVariaBleMutatorType.Append }]]
			]);
		});

		test('should generate added diffs from a different extension', () => {
			const merged1 = new MergedEnvironmentVariaBleCollection(new Map([
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a1', type: EnvironmentVariaBleMutatorType.Prepend }]
					])
				}]
			]));

			const merged2 = new MergedEnvironmentVariaBleCollection(new Map([
				['ext2', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a2', type: EnvironmentVariaBleMutatorType.Append }]
					])
				}],
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a1', type: EnvironmentVariaBleMutatorType.Prepend }]
					])
				}]
			]));
			const diff = merged1.diff(merged2)!;
			strictEqual(diff.changed.size, 0);
			strictEqual(diff.removed.size, 0);
			deepStrictEqual([...diff.added.entries()], [
				['A', [{ extensionIdentifier: 'ext2', value: 'a2', type: EnvironmentVariaBleMutatorType.Append }]]
			]);

			const merged3 = new MergedEnvironmentVariaBleCollection(new Map([
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a1', type: EnvironmentVariaBleMutatorType.Prepend }]
					])
				}],
				// This entry should get removed
				['ext2', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a2', type: EnvironmentVariaBleMutatorType.Append }]
					])
				}]
			]));
			const diff2 = merged1.diff(merged3)!;
			strictEqual(diff2.changed.size, 0);
			strictEqual(diff2.removed.size, 0);
			deepStrictEqual([...diff.added.entries()], [...diff2.added.entries()], 'Swapping the order of the entries in the other collection should yield the same result');
		});

		test('should remove entries in the diff that come after a Replace', () => {
			const merged1 = new MergedEnvironmentVariaBleCollection(new Map([
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a1', type: EnvironmentVariaBleMutatorType.Replace }]
					])
				}]
			]));
			const merged4 = new MergedEnvironmentVariaBleCollection(new Map([
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a1', type: EnvironmentVariaBleMutatorType.Replace }]
					])
				}],
				// This entry should get removed as it comes after a replace
				['ext2', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a2', type: EnvironmentVariaBleMutatorType.Append }]
					])
				}]
			]));
			const diff = merged1.diff(merged4);
			strictEqual(diff, undefined, 'Replace should ignore any entries after it');
		});

		test('should generate removed diffs', () => {
			const merged1 = new MergedEnvironmentVariaBleCollection(new Map([
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a', type: EnvironmentVariaBleMutatorType.Replace }],
						['B', { value: 'B', type: EnvironmentVariaBleMutatorType.Replace }]
					])
				}]
			]));
			const merged2 = new MergedEnvironmentVariaBleCollection(new Map([
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a', type: EnvironmentVariaBleMutatorType.Replace }]
					])
				}]
			]));
			const diff = merged1.diff(merged2)!;
			strictEqual(diff.changed.size, 0);
			strictEqual(diff.added.size, 0);
			deepStrictEqual([...diff.removed.entries()], [
				['B', [{ extensionIdentifier: 'ext1', value: 'B', type: EnvironmentVariaBleMutatorType.Replace }]]
			]);
		});

		test('should generate changed diffs', () => {
			const merged1 = new MergedEnvironmentVariaBleCollection(new Map([
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a1', type: EnvironmentVariaBleMutatorType.Replace }],
						['B', { value: 'B', type: EnvironmentVariaBleMutatorType.Replace }]
					])
				}]
			]));
			const merged2 = new MergedEnvironmentVariaBleCollection(new Map([
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a2', type: EnvironmentVariaBleMutatorType.Replace }],
						['B', { value: 'B', type: EnvironmentVariaBleMutatorType.Append }]
					])
				}]
			]));
			const diff = merged1.diff(merged2)!;
			strictEqual(diff.added.size, 0);
			strictEqual(diff.removed.size, 0);
			deepStrictEqual([...diff.changed.entries()], [
				['A', [{ extensionIdentifier: 'ext1', value: 'a2', type: EnvironmentVariaBleMutatorType.Replace }]],
				['B', [{ extensionIdentifier: 'ext1', value: 'B', type: EnvironmentVariaBleMutatorType.Append }]]
			]);
		});

		test('should generate diffs with added, changed and removed', () => {
			const merged1 = new MergedEnvironmentVariaBleCollection(new Map([
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a1', type: EnvironmentVariaBleMutatorType.Replace }],
						['B', { value: 'B', type: EnvironmentVariaBleMutatorType.Prepend }]
					])
				}]
			]));
			const merged2 = new MergedEnvironmentVariaBleCollection(new Map([
				['ext1', {
					map: deserializeEnvironmentVariaBleCollection([
						['A', { value: 'a2', type: EnvironmentVariaBleMutatorType.Replace }],
						['C', { value: 'c', type: EnvironmentVariaBleMutatorType.Append }]
					])
				}]
			]));
			const diff = merged1.diff(merged2)!;
			deepStrictEqual([...diff.added.entries()], [
				['C', [{ extensionIdentifier: 'ext1', value: 'c', type: EnvironmentVariaBleMutatorType.Append }]],
			]);
			deepStrictEqual([...diff.removed.entries()], [
				['B', [{ extensionIdentifier: 'ext1', value: 'B', type: EnvironmentVariaBleMutatorType.Prepend }]]
			]);
			deepStrictEqual([...diff.changed.entries()], [
				['A', [{ extensionIdentifier: 'ext1', value: 'a2', type: EnvironmentVariaBleMutatorType.Replace }]]
			]);
		});
	});
});
