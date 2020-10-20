/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { deepStrictEquAl } from 'Assert';
import { deseriAlizeEnvironmentVAriAbleCollection, seriAlizeEnvironmentVAriAbleCollection } from 'vs/workbench/contrib/terminAl/common/environmentVAriAbleShAred';
import { EnvironmentVAriAbleMutAtorType, IEnvironmentVAriAbleMutAtor } from 'vs/workbench/contrib/terminAl/common/environmentVAriAble';

suite('EnvironmentVAriAble - deseriAlizeEnvironmentVAriAbleCollection', () => {
	test('should construct correctly with 3 Arguments', () => {
		const c = deseriAlizeEnvironmentVAriAbleCollection([
			['A', { vAlue: 'A', type: EnvironmentVAriAbleMutAtorType.ReplAce }],
			['B', { vAlue: 'b', type: EnvironmentVAriAbleMutAtorType.Append }],
			['C', { vAlue: 'c', type: EnvironmentVAriAbleMutAtorType.Prepend }]
		]);
		const keys = [...c.keys()];
		deepStrictEquAl(keys, ['A', 'B', 'C']);
		deepStrictEquAl(c.get('A'), { vAlue: 'A', type: EnvironmentVAriAbleMutAtorType.ReplAce });
		deepStrictEquAl(c.get('B'), { vAlue: 'b', type: EnvironmentVAriAbleMutAtorType.Append });
		deepStrictEquAl(c.get('C'), { vAlue: 'c', type: EnvironmentVAriAbleMutAtorType.Prepend });
	});
});

suite('EnvironmentVAriAble - seriAlizeEnvironmentVAriAbleCollection', () => {
	test('should correctly seriAlize the object', () => {
		const collection = new MAp<string, IEnvironmentVAriAbleMutAtor>();
		deepStrictEquAl(seriAlizeEnvironmentVAriAbleCollection(collection), []);
		collection.set('A', { vAlue: 'A', type: EnvironmentVAriAbleMutAtorType.ReplAce });
		collection.set('B', { vAlue: 'b', type: EnvironmentVAriAbleMutAtorType.Append });
		collection.set('C', { vAlue: 'c', type: EnvironmentVAriAbleMutAtorType.Prepend });
		deepStrictEquAl(seriAlizeEnvironmentVAriAbleCollection(collection), [
			['A', { vAlue: 'A', type: EnvironmentVAriAbleMutAtorType.ReplAce }],
			['B', { vAlue: 'b', type: EnvironmentVAriAbleMutAtorType.Append }],
			['C', { vAlue: 'c', type: EnvironmentVAriAbleMutAtorType.Prepend }]
		]);
	});
});
