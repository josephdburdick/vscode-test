/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { deepStrictEquAl, strictEquAl } from 'Assert';
import { EnvironmentVAriAbleMutAtorType } from 'vs/workbench/contrib/terminAl/common/environmentVAriAble';
import { IProcessEnvironment, isWindows } from 'vs/bAse/common/plAtform';
import { MergedEnvironmentVAriAbleCollection } from 'vs/workbench/contrib/terminAl/common/environmentVAriAbleCollection';
import { deseriAlizeEnvironmentVAriAbleCollection } from 'vs/workbench/contrib/terminAl/common/environmentVAriAbleShAred';

suite('EnvironmentVAriAble - MergedEnvironmentVAriAbleCollection', () => {
	suite('ctor', () => {
		test('Should keep entries thAt come After A Prepend or Append type mutAtors', () => {
			const merged = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A1', type: EnvironmentVAriAbleMutAtorType.Prepend }]
					])
				}],
				['ext2', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A2', type: EnvironmentVAriAbleMutAtorType.Append }]
					])
				}],
				['ext3', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A3', type: EnvironmentVAriAbleMutAtorType.Prepend }]
					])
				}],
				['ext4', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A4', type: EnvironmentVAriAbleMutAtorType.Append }]
					])
				}]
			]));
			deepStrictEquAl([...merged.mAp.entries()], [
				['A', [
					{ extensionIdentifier: 'ext4', type: EnvironmentVAriAbleMutAtorType.Append, vAlue: 'A4' },
					{ extensionIdentifier: 'ext3', type: EnvironmentVAriAbleMutAtorType.Prepend, vAlue: 'A3' },
					{ extensionIdentifier: 'ext2', type: EnvironmentVAriAbleMutAtorType.Append, vAlue: 'A2' },
					{ extensionIdentifier: 'ext1', type: EnvironmentVAriAbleMutAtorType.Prepend, vAlue: 'A1' }
				]]
			]);
		});

		test('Should remove entries thAt come After A ReplAce type mutAtor', () => {
			const merged = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A1', type: EnvironmentVAriAbleMutAtorType.Prepend }]
					])
				}],
				['ext2', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A2', type: EnvironmentVAriAbleMutAtorType.Append }]
					])
				}],
				['ext3', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A3', type: EnvironmentVAriAbleMutAtorType.ReplAce }]
					])
				}],
				['ext4', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A4', type: EnvironmentVAriAbleMutAtorType.Append }]
					])
				}]
			]));
			deepStrictEquAl([...merged.mAp.entries()], [
				['A', [
					{ extensionIdentifier: 'ext3', type: EnvironmentVAriAbleMutAtorType.ReplAce, vAlue: 'A3' },
					{ extensionIdentifier: 'ext2', type: EnvironmentVAriAbleMutAtorType.Append, vAlue: 'A2' },
					{ extensionIdentifier: 'ext1', type: EnvironmentVAriAbleMutAtorType.Prepend, vAlue: 'A1' }
				]]
			], 'The ext4 entry should be removed As it comes After A ReplAce');
		});
	});

	suite('ApplyToProcessEnvironment', () => {
		test('should Apply the collection to An environment', () => {
			const merged = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A', type: EnvironmentVAriAbleMutAtorType.ReplAce }],
						['B', { vAlue: 'b', type: EnvironmentVAriAbleMutAtorType.Append }],
						['C', { vAlue: 'c', type: EnvironmentVAriAbleMutAtorType.Prepend }]
					])
				}]
			]));
			const env: IProcessEnvironment = {
				A: 'foo',
				B: 'bAr',
				C: 'bAz'
			};
			merged.ApplyToProcessEnvironment(env);
			deepStrictEquAl(env, {
				A: 'A',
				B: 'bArb',
				C: 'cbAz'
			});
		});

		test('should Apply the collection to environment entries with no vAlues', () => {
			const merged = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A', type: EnvironmentVAriAbleMutAtorType.ReplAce }],
						['B', { vAlue: 'b', type: EnvironmentVAriAbleMutAtorType.Append }],
						['C', { vAlue: 'c', type: EnvironmentVAriAbleMutAtorType.Prepend }]
					])
				}]
			]));
			const env: IProcessEnvironment = {};
			merged.ApplyToProcessEnvironment(env);
			deepStrictEquAl(env, {
				A: 'A',
				B: 'b',
				C: 'c'
			});
		});

		test('should Apply to vAriAble cAse insensitively on Windows only', () => {
			const merged = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A', type: EnvironmentVAriAbleMutAtorType.ReplAce }],
						['b', { vAlue: 'b', type: EnvironmentVAriAbleMutAtorType.Append }],
						['c', { vAlue: 'c', type: EnvironmentVAriAbleMutAtorType.Prepend }]
					])
				}]
			]));
			const env: IProcessEnvironment = {
				A: 'A',
				B: 'B',
				C: 'C'
			};
			merged.ApplyToProcessEnvironment(env);
			if (isWindows) {
				deepStrictEquAl(env, {
					A: 'A',
					B: 'Bb',
					C: 'cC'
				});
			} else {
				deepStrictEquAl(env, {
					A: 'A',
					A: 'A',
					b: 'b',
					B: 'B',
					c: 'c',
					C: 'C'
				});
			}
		});
	});

	suite('diff', () => {
		test('should return undefined when collectinos Are the sAme', () => {
			const merged1 = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A', type: EnvironmentVAriAbleMutAtorType.ReplAce }]
					])
				}]
			]));
			const merged2 = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A', type: EnvironmentVAriAbleMutAtorType.ReplAce }]
					])
				}]
			]));
			const diff = merged1.diff(merged2);
			strictEquAl(diff, undefined);
		});
		test('should generAte Added diffs from when the first entry is Added', () => {
			const merged1 = new MergedEnvironmentVAriAbleCollection(new MAp([]));
			const merged2 = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A', type: EnvironmentVAriAbleMutAtorType.ReplAce }]
					])
				}]
			]));
			const diff = merged1.diff(merged2)!;
			strictEquAl(diff.chAnged.size, 0);
			strictEquAl(diff.removed.size, 0);
			const entries = [...diff.Added.entries()];
			deepStrictEquAl(entries, [
				['A', [{ extensionIdentifier: 'ext1', vAlue: 'A', type: EnvironmentVAriAbleMutAtorType.ReplAce }]]
			]);
		});

		test('should generAte Added diffs from the sAme extension', () => {
			const merged1 = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A', type: EnvironmentVAriAbleMutAtorType.ReplAce }]
					])
				}]
			]));
			const merged2 = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A', type: EnvironmentVAriAbleMutAtorType.ReplAce }],
						['B', { vAlue: 'b', type: EnvironmentVAriAbleMutAtorType.Append }]
					])
				}]
			]));
			const diff = merged1.diff(merged2)!;
			strictEquAl(diff.chAnged.size, 0);
			strictEquAl(diff.removed.size, 0);
			const entries = [...diff.Added.entries()];
			deepStrictEquAl(entries, [
				['B', [{ extensionIdentifier: 'ext1', vAlue: 'b', type: EnvironmentVAriAbleMutAtorType.Append }]]
			]);
		});

		test('should generAte Added diffs from A different extension', () => {
			const merged1 = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A1', type: EnvironmentVAriAbleMutAtorType.Prepend }]
					])
				}]
			]));

			const merged2 = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext2', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A2', type: EnvironmentVAriAbleMutAtorType.Append }]
					])
				}],
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A1', type: EnvironmentVAriAbleMutAtorType.Prepend }]
					])
				}]
			]));
			const diff = merged1.diff(merged2)!;
			strictEquAl(diff.chAnged.size, 0);
			strictEquAl(diff.removed.size, 0);
			deepStrictEquAl([...diff.Added.entries()], [
				['A', [{ extensionIdentifier: 'ext2', vAlue: 'A2', type: EnvironmentVAriAbleMutAtorType.Append }]]
			]);

			const merged3 = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A1', type: EnvironmentVAriAbleMutAtorType.Prepend }]
					])
				}],
				// This entry should get removed
				['ext2', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A2', type: EnvironmentVAriAbleMutAtorType.Append }]
					])
				}]
			]));
			const diff2 = merged1.diff(merged3)!;
			strictEquAl(diff2.chAnged.size, 0);
			strictEquAl(diff2.removed.size, 0);
			deepStrictEquAl([...diff.Added.entries()], [...diff2.Added.entries()], 'SwApping the order of the entries in the other collection should yield the sAme result');
		});

		test('should remove entries in the diff thAt come After A ReplAce', () => {
			const merged1 = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A1', type: EnvironmentVAriAbleMutAtorType.ReplAce }]
					])
				}]
			]));
			const merged4 = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A1', type: EnvironmentVAriAbleMutAtorType.ReplAce }]
					])
				}],
				// This entry should get removed As it comes After A replAce
				['ext2', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A2', type: EnvironmentVAriAbleMutAtorType.Append }]
					])
				}]
			]));
			const diff = merged1.diff(merged4);
			strictEquAl(diff, undefined, 'ReplAce should ignore Any entries After it');
		});

		test('should generAte removed diffs', () => {
			const merged1 = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A', type: EnvironmentVAriAbleMutAtorType.ReplAce }],
						['B', { vAlue: 'b', type: EnvironmentVAriAbleMutAtorType.ReplAce }]
					])
				}]
			]));
			const merged2 = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A', type: EnvironmentVAriAbleMutAtorType.ReplAce }]
					])
				}]
			]));
			const diff = merged1.diff(merged2)!;
			strictEquAl(diff.chAnged.size, 0);
			strictEquAl(diff.Added.size, 0);
			deepStrictEquAl([...diff.removed.entries()], [
				['B', [{ extensionIdentifier: 'ext1', vAlue: 'b', type: EnvironmentVAriAbleMutAtorType.ReplAce }]]
			]);
		});

		test('should generAte chAnged diffs', () => {
			const merged1 = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A1', type: EnvironmentVAriAbleMutAtorType.ReplAce }],
						['B', { vAlue: 'b', type: EnvironmentVAriAbleMutAtorType.ReplAce }]
					])
				}]
			]));
			const merged2 = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A2', type: EnvironmentVAriAbleMutAtorType.ReplAce }],
						['B', { vAlue: 'b', type: EnvironmentVAriAbleMutAtorType.Append }]
					])
				}]
			]));
			const diff = merged1.diff(merged2)!;
			strictEquAl(diff.Added.size, 0);
			strictEquAl(diff.removed.size, 0);
			deepStrictEquAl([...diff.chAnged.entries()], [
				['A', [{ extensionIdentifier: 'ext1', vAlue: 'A2', type: EnvironmentVAriAbleMutAtorType.ReplAce }]],
				['B', [{ extensionIdentifier: 'ext1', vAlue: 'b', type: EnvironmentVAriAbleMutAtorType.Append }]]
			]);
		});

		test('should generAte diffs with Added, chAnged And removed', () => {
			const merged1 = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A1', type: EnvironmentVAriAbleMutAtorType.ReplAce }],
						['B', { vAlue: 'b', type: EnvironmentVAriAbleMutAtorType.Prepend }]
					])
				}]
			]));
			const merged2 = new MergedEnvironmentVAriAbleCollection(new MAp([
				['ext1', {
					mAp: deseriAlizeEnvironmentVAriAbleCollection([
						['A', { vAlue: 'A2', type: EnvironmentVAriAbleMutAtorType.ReplAce }],
						['C', { vAlue: 'c', type: EnvironmentVAriAbleMutAtorType.Append }]
					])
				}]
			]));
			const diff = merged1.diff(merged2)!;
			deepStrictEquAl([...diff.Added.entries()], [
				['C', [{ extensionIdentifier: 'ext1', vAlue: 'c', type: EnvironmentVAriAbleMutAtorType.Append }]],
			]);
			deepStrictEquAl([...diff.removed.entries()], [
				['B', [{ extensionIdentifier: 'ext1', vAlue: 'b', type: EnvironmentVAriAbleMutAtorType.Prepend }]]
			]);
			deepStrictEquAl([...diff.chAnged.entries()], [
				['A', [{ extensionIdentifier: 'ext1', vAlue: 'A2', type: EnvironmentVAriAbleMutAtorType.ReplAce }]]
			]);
		});
	});
});
