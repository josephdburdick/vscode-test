/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { merge, updateIgnoredSettings, addSetting } from 'vs/platform/userDataSync/common/settingsMerge';
import type { IConflictSetting } from 'vs/platform/userDataSync/common/userDataSync';

const formattingOptions = { eol: '\n', insertSpaces: false, taBSize: 4 };

suite('SettingsMerge - Merge', () => {

	test('merge when local and remote are same with one entry', async () => {
		const localContent = stringify({ 'a': 1 });
		const remoteContent = stringify({ 'a': 1 });
		const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
		assert.equal(actual.localContent, null);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when local and remote are same with multiple entries', async () => {
		const localContent = stringify({
			'a': 1,
			'B': 2
		});
		const remoteContent = stringify({
			'a': 1,
			'B': 2
		});
		const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
		assert.equal(actual.localContent, null);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when local and remote are same with multiple entries in different order', async () => {
		const localContent = stringify({
			'B': 2,
			'a': 1,
		});
		const remoteContent = stringify({
			'a': 1,
			'B': 2
		});
		const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
		assert.equal(actual.localContent, localContent);
		assert.equal(actual.remoteContent, remoteContent);
		assert.ok(actual.hasConflicts);
		assert.equal(actual.conflictsSettings.length, 0);
	});

	test('merge when local and remote are same with different Base content', async () => {
		const localContent = stringify({
			'B': 2,
			'a': 1,
		});
		const BaseContent = stringify({
			'a': 2,
			'B': 1
		});
		const remoteContent = stringify({
			'a': 1,
			'B': 2
		});
		const actual = merge(localContent, remoteContent, BaseContent, [], [], formattingOptions);
		assert.equal(actual.localContent, localContent);
		assert.equal(actual.remoteContent, remoteContent);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(actual.hasConflicts);
	});

	test('merge when a new entry is added to remote', async () => {
		const localContent = stringify({
			'a': 1,
		});
		const remoteContent = stringify({
			'a': 1,
			'B': 2
		});
		const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
		assert.equal(actual.localContent, remoteContent);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when multiple new entries are added to remote', async () => {
		const localContent = stringify({
			'a': 1,
		});
		const remoteContent = stringify({
			'a': 1,
			'B': 2,
			'c': 3,
		});
		const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
		assert.equal(actual.localContent, remoteContent);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when multiple new entries are added to remote from Base and local has not changed', async () => {
		const localContent = stringify({
			'a': 1,
		});
		const remoteContent = stringify({
			'B': 2,
			'a': 1,
			'c': 3,
		});
		const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
		assert.equal(actual.localContent, remoteContent);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when an entry is removed from remote from Base and local has not changed', async () => {
		const localContent = stringify({
			'a': 1,
			'B': 2,
		});
		const remoteContent = stringify({
			'a': 1,
		});
		const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
		assert.equal(actual.localContent, remoteContent);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when all entries are removed from Base and local has not changed', async () => {
		const localContent = stringify({
			'a': 1,
		});
		const remoteContent = stringify({});
		const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
		assert.equal(actual.localContent, remoteContent);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when an entry is updated in remote from Base and local has not changed', async () => {
		const localContent = stringify({
			'a': 1,
		});
		const remoteContent = stringify({
			'a': 2
		});
		const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
		assert.equal(actual.localContent, remoteContent);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when remote has moved forwareded with multiple changes and local stays with Base', async () => {
		const localContent = stringify({
			'a': 1,
		});
		const remoteContent = stringify({
			'a': 2,
			'B': 1,
			'c': 3,
			'd': 4,
		});
		const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
		assert.equal(actual.localContent, remoteContent);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when remote has moved forwareded with order changes and local stays with Base', async () => {
		const localContent = stringify({
			'a': 1,
			'B': 2,
			'c': 3,
		});
		const remoteContent = stringify({
			'a': 2,
			'd': 4,
			'c': 3,
			'B': 2,
		});
		const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
		assert.equal(actual.localContent, remoteContent);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when remote has moved forwareded with comment changes and local stays with Base', async () => {
		const localContent = `
{
	// this is comment for B
	"B": 2,
	// this is comment for c
	"c": 1,
}`;
		const remoteContent = stringify`
{
	// comment B has changed
	"B": 2,
	// this is comment for c
	"c": 1,
}`;
		const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
		assert.equal(actual.localContent, remoteContent);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when remote has moved forwareded with comment and order changes and local stays with Base', async () => {
		const localContent = `
{
	// this is comment for B
	"B": 2,
	// this is comment for c
	"c": 1,
}`;
		const remoteContent = stringify`
{
	// this is comment for c
	"c": 1,
	// comment B has changed
	"B": 2,
}`;
		const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
		assert.equal(actual.localContent, remoteContent);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when a new entries are added to local', async () => {
		const localContent = stringify({
			'a': 1,
			'B': 2,
			'c': 3,
			'd': 4,
		});
		const remoteContent = stringify({
			'a': 1,
		});
		const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
		assert.equal(actual.localContent, null);
		assert.equal(actual.remoteContent, localContent);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when multiple new entries are added to local from Base and remote is not changed', async () => {
		const localContent = stringify({
			'a': 2,
			'B': 1,
			'c': 3,
			'd': 4,
		});
		const remoteContent = stringify({
			'a': 1,
		});
		const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
		assert.equal(actual.localContent, null);
		assert.equal(actual.remoteContent, localContent);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when an entry is removed from local from Base and remote has not changed', async () => {
		const localContent = stringify({
			'a': 1,
			'c': 2
		});
		const remoteContent = stringify({
			'a': 2,
			'B': 1,
			'c': 3,
			'd': 4,
		});
		const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
		assert.equal(actual.localContent, null);
		assert.equal(actual.remoteContent, localContent);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when an entry is updated in local from Base and remote has not changed', async () => {
		const localContent = stringify({
			'a': 1,
			'c': 2
		});
		const remoteContent = stringify({
			'a': 2,
			'c': 2,
		});
		const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
		assert.equal(actual.localContent, null);
		assert.equal(actual.remoteContent, localContent);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when local has moved forwarded with multiple changes and remote stays with Base', async () => {
		const localContent = stringify({
			'a': 2,
			'B': 1,
			'c': 3,
			'd': 4,
		});
		const remoteContent = stringify({
			'a': 1,
		});
		const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
		assert.equal(actual.localContent, null);
		assert.equal(actual.remoteContent, localContent);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when local has moved forwarded with order changes and remote stays with Base', async () => {
		const localContent = `
{
	"B": 2,
	"c": 1,
}`;
		const remoteContent = stringify`
{
	"c": 1,
	"B": 2,
}`;
		const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
		assert.equal(actual.localContent, null);
		assert.equal(actual.remoteContent, localContent);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when local has moved forwarded with comment changes and remote stays with Base', async () => {
		const localContent = `
{
	// comment for B has changed
	"B": 2,
	// comment for c
	"c": 1,
}`;
		const remoteContent = stringify`
{
	// comment for B
	"B": 2,
	// comment for c
	"c": 1,
}`;
		const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
		assert.equal(actual.localContent, null);
		assert.equal(actual.remoteContent, localContent);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when local has moved forwarded with comment and order changes and remote stays with Base', async () => {
		const localContent = `
{
	// comment for c
	"c": 1,
	// comment for B has changed
	"B": 2,
}`;
		const remoteContent = stringify`
{
	// comment for B
	"B": 2,
	// comment for c
	"c": 1,
}`;
		const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
		assert.equal(actual.localContent, null);
		assert.equal(actual.remoteContent, localContent);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('merge when local and remote with one entry But different value', async () => {
		const localContent = stringify({
			'a': 1
		});
		const remoteContent = stringify({
			'a': 2
		});
		const expectedConflicts: IConflictSetting[] = [{ key: 'a', localValue: 1, remoteValue: 2 }];
		const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
		assert.equal(actual.localContent, localContent);
		assert.equal(actual.remoteContent, remoteContent);
		assert.ok(actual.hasConflicts);
		assert.deepEqual(actual.conflictsSettings, expectedConflicts);
	});

	test('merge when the entry is removed in remote But updated in local and a new entry is added in remote', async () => {
		const BaseContent = stringify({
			'a': 1
		});
		const localContent = stringify({
			'a': 2
		});
		const remoteContent = stringify({
			'B': 2
		});
		const expectedConflicts: IConflictSetting[] = [{ key: 'a', localValue: 2, remoteValue: undefined }];
		const actual = merge(localContent, remoteContent, BaseContent, [], [], formattingOptions);
		assert.equal(actual.localContent, stringify({
			'a': 2,
			'B': 2
		}));
		assert.equal(actual.remoteContent, remoteContent);
		assert.ok(actual.hasConflicts);
		assert.deepEqual(actual.conflictsSettings, expectedConflicts);
	});

	test('merge with single entry and local is empty', async () => {
		const BaseContent = stringify({
			'a': 1
		});
		const localContent = stringify({});
		const remoteContent = stringify({
			'a': 2
		});
		const expectedConflicts: IConflictSetting[] = [{ key: 'a', localValue: undefined, remoteValue: 2 }];
		const actual = merge(localContent, remoteContent, BaseContent, [], [], formattingOptions);
		assert.equal(actual.localContent, localContent);
		assert.equal(actual.remoteContent, remoteContent);
		assert.ok(actual.hasConflicts);
		assert.deepEqual(actual.conflictsSettings, expectedConflicts);
	});

	test('merge when local and remote has moved forwareded with conflicts', async () => {
		const BaseContent = stringify({
			'a': 1,
			'B': 2,
			'c': 3,
			'd': 4,
		});
		const localContent = stringify({
			'a': 2,
			'c': 3,
			'd': 5,
			'e': 4,
			'f': 1,
		});
		const remoteContent = stringify({
			'B': 3,
			'c': 3,
			'd': 6,
			'e': 5,
		});
		const expectedConflicts: IConflictSetting[] = [
			{ key: 'B', localValue: undefined, remoteValue: 3 },
			{ key: 'a', localValue: 2, remoteValue: undefined },
			{ key: 'd', localValue: 5, remoteValue: 6 },
			{ key: 'e', localValue: 4, remoteValue: 5 },
		];
		const actual = merge(localContent, remoteContent, BaseContent, [], [], formattingOptions);
		assert.equal(actual.localContent, stringify({
			'a': 2,
			'c': 3,
			'd': 5,
			'e': 4,
			'f': 1,
		}));
		assert.equal(actual.remoteContent, stringify({
			'B': 3,
			'c': 3,
			'd': 6,
			'e': 5,
			'f': 1,
		}));
		assert.ok(actual.hasConflicts);
		assert.deepEqual(actual.conflictsSettings, expectedConflicts);
	});

	test('merge when local and remote has moved forwareded with change in order', async () => {
		const BaseContent = stringify({
			'a': 1,
			'B': 2,
			'c': 3,
			'd': 4,
		});
		const localContent = stringify({
			'a': 2,
			'c': 3,
			'B': 2,
			'd': 4,
			'e': 5,
		});
		const remoteContent = stringify({
			'a': 1,
			'B': 2,
			'c': 4,
		});
		const actual = merge(localContent, remoteContent, BaseContent, [], [], formattingOptions);
		assert.equal(actual.localContent, stringify({
			'a': 2,
			'c': 4,
			'B': 2,
			'e': 5,
		}));
		assert.equal(actual.remoteContent, stringify({
			'a': 2,
			'B': 2,
			'e': 5,
			'c': 4,
		}));
		assert.ok(actual.hasConflicts);
		assert.deepEqual(actual.conflictsSettings, []);
	});

	test('merge when local and remote has moved forwareded with comment changes', async () => {
		const BaseContent = `
{
	// this is comment for B
	"B": 2,
	// this is comment for c
	"c": 1
}`;
		const localContent = `
{
	// comment B has changed in local
	"B": 2,
	// this is comment for c
	"c": 1
}`;
		const remoteContent = `
{
	// comment B has changed in remote
	"B": 2,
	// this is comment for c
	"c": 1
}`;
		const actual = merge(localContent, remoteContent, BaseContent, [], [], formattingOptions);
		assert.equal(actual.localContent, localContent);
		assert.equal(actual.remoteContent, remoteContent);
		assert.ok(actual.hasConflicts);
		assert.deepEqual(actual.conflictsSettings, []);
	});

	test('resolve when local and remote has moved forwareded with resolved conflicts', async () => {
		const BaseContent = stringify({
			'a': 1,
			'B': 2,
			'c': 3,
			'd': 4,
		});
		const localContent = stringify({
			'a': 2,
			'c': 3,
			'd': 5,
			'e': 4,
			'f': 1,
		});
		const remoteContent = stringify({
			'B': 3,
			'c': 3,
			'd': 6,
			'e': 5,
		});
		const expectedConflicts: IConflictSetting[] = [
			{ key: 'd', localValue: 5, remoteValue: 6 },
		];
		const actual = merge(localContent, remoteContent, BaseContent, [], [{ key: 'a', value: 2 }, { key: 'B', value: undefined }, { key: 'e', value: 5 }], formattingOptions);
		assert.equal(actual.localContent, stringify({
			'a': 2,
			'c': 3,
			'd': 5,
			'e': 5,
			'f': 1,
		}));
		assert.equal(actual.remoteContent, stringify({
			'c': 3,
			'd': 6,
			'e': 5,
			'f': 1,
			'a': 2,
		}));
		assert.ok(actual.hasConflicts);
		assert.deepEqual(actual.conflictsSettings, expectedConflicts);
	});

	test('ignored setting is not merged when changed in local and remote', async () => {
		const localContent = stringify({ 'a': 1 });
		const remoteContent = stringify({ 'a': 2 });
		const actual = merge(localContent, remoteContent, null, ['a'], [], formattingOptions);
		assert.equal(actual.localContent, null);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('ignored setting is not merged when changed in local and remote from Base', async () => {
		const BaseContent = stringify({ 'a': 0 });
		const localContent = stringify({ 'a': 1 });
		const remoteContent = stringify({ 'a': 2 });
		const actual = merge(localContent, remoteContent, BaseContent, ['a'], [], formattingOptions);
		assert.equal(actual.localContent, null);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('ignored setting is not merged when added in remote', async () => {
		const localContent = stringify({});
		const remoteContent = stringify({ 'a': 1 });
		const actual = merge(localContent, remoteContent, null, ['a'], [], formattingOptions);
		assert.equal(actual.localContent, null);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('ignored setting is not merged when added in remote from Base', async () => {
		const localContent = stringify({ 'B': 2 });
		const remoteContent = stringify({ 'a': 1, 'B': 2 });
		const actual = merge(localContent, remoteContent, localContent, ['a'], [], formattingOptions);
		assert.equal(actual.localContent, null);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('ignored setting is not merged when removed in remote', async () => {
		const localContent = stringify({ 'a': 1 });
		const remoteContent = stringify({});
		const actual = merge(localContent, remoteContent, null, ['a'], [], formattingOptions);
		assert.equal(actual.localContent, null);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('ignored setting is not merged when removed in remote from Base', async () => {
		const localContent = stringify({ 'a': 2 });
		const remoteContent = stringify({});
		const actual = merge(localContent, remoteContent, localContent, ['a'], [], formattingOptions);
		assert.equal(actual.localContent, null);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('ignored setting is not merged with other changes without conflicts', async () => {
		const BaseContent = stringify({
			'a': 2,
			'B': 2,
			'c': 3,
			'd': 4,
			'e': 5,
		});
		const localContent = stringify({
			'a': 1,
			'B': 2,
			'c': 3,
		});
		const remoteContent = stringify({
			'a': 3,
			'B': 3,
			'd': 4,
			'e': 6,
		});
		const actual = merge(localContent, remoteContent, BaseContent, ['a', 'e'], [], formattingOptions);
		assert.equal(actual.localContent, stringify({
			'a': 1,
			'B': 3,
		}));
		assert.equal(actual.remoteContent, stringify({
			'a': 3,
			'B': 3,
			'e': 6,
		}));
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});

	test('ignored setting is not merged with other changes conflicts', async () => {
		const BaseContent = stringify({
			'a': 2,
			'B': 2,
			'c': 3,
			'd': 4,
			'e': 5,
		});
		const localContent = stringify({
			'a': 1,
			'B': 4,
			'c': 3,
			'd': 5,
		});
		const remoteContent = stringify({
			'a': 3,
			'B': 3,
			'e': 6,
		});
		const expectedConflicts: IConflictSetting[] = [
			{ key: 'd', localValue: 5, remoteValue: undefined },
			{ key: 'B', localValue: 4, remoteValue: 3 },
		];
		const actual = merge(localContent, remoteContent, BaseContent, ['a', 'e'], [], formattingOptions);
		assert.equal(actual.localContent, stringify({
			'a': 1,
			'B': 4,
			'd': 5,
		}));
		assert.equal(actual.remoteContent, stringify({
			'a': 3,
			'B': 3,
			'e': 6,
		}));
		assert.deepEqual(actual.conflictsSettings, expectedConflicts);
		assert.ok(actual.hasConflicts);
	});

	test('merge when remote has comments and local is empty', async () => {
		const localContent = `
{

}`;
		const remoteContent = stringify`
{
	// this is a comment
	"a": 1,
}`;
		const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
		assert.equal(actual.localContent, remoteContent);
		assert.equal(actual.remoteContent, null);
		assert.equal(actual.conflictsSettings.length, 0);
		assert.ok(!actual.hasConflicts);
	});
});

suite('SettingsMerge - Compute Remote Content', () => {

	test('local content is returned when there are no ignored settings', async () => {
		const localContent = stringify({
			'a': 1,
			'B': 2,
			'c': 3,
		});
		const remoteContent = stringify({
			'a': 3,
			'B': 3,
			'd': 4,
			'e': 6,
		});
		const actual = updateIgnoredSettings(localContent, remoteContent, [], formattingOptions);
		assert.equal(actual, localContent);
	});

	test('ignored settings are not updated from remote content', async () => {
		const localContent = stringify({
			'a': 1,
			'B': 2,
			'c': 3,
		});
		const remoteContent = stringify({
			'a': 3,
			'B': 3,
			'd': 4,
			'e': 6,
		});
		const expected = stringify({
			'a': 3,
			'B': 2,
			'c': 3,
		});
		const actual = updateIgnoredSettings(localContent, remoteContent, ['a'], formattingOptions);
		assert.equal(actual, expected);
	});

});

suite('SettingsMerge - Add Setting', () => {

	test('Insert after a setting without comments', () => {

		const sourceContent = `
{
	"a": 1,
	"B": 2,
	"c": 3
}`;
		const targetContent = `
{
	"a": 2,
	"d": 3
}`;

		const expected = `
{
	"a": 2,
	"B": 2,
	"d": 3
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert after a setting without comments at the end', () => {

		const sourceContent = `
{
	"a": 1,
	"B": 2,
	"c": 3
}`;
		const targetContent = `
{
	"a": 2
}`;

		const expected = `
{
	"a": 2,
	"B": 2
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert Between settings without comment', () => {

		const sourceContent = `
{
	"a": 1,
	"B": 2,
	"c": 3
}`;
		const targetContent = `
{
	"a": 1,
	"c": 3
}`;

		const expected = `
{
	"a": 1,
	"B": 2,
	"c": 3
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert Between settings and there is a comment in Between in source', () => {

		const sourceContent = `
{
	"a": 1,
	// this is comment for B
	"B": 2,
	"c": 3
}`;
		const targetContent = `
{
	"a": 1,
	"c": 3
}`;

		const expected = `
{
	"a": 1,
	"B": 2,
	"c": 3
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert after a setting and after a comment at the end', () => {

		const sourceContent = `
{
	"a": 1,
	// this is comment for B
	"B": 2
}`;
		const targetContent = `
{
	"a": 1
	// this is comment for B
}`;

		const expected = `
{
	"a": 1,
	// this is comment for B
	"B": 2
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert after a setting ending with comma and after a comment at the end', () => {

		const sourceContent = `
{
	"a": 1,
	// this is comment for B
	"B": 2
}`;
		const targetContent = `
{
	"a": 1,
	// this is comment for B
}`;

		const expected = `
{
	"a": 1,
	// this is comment for B
	"B": 2
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert after a comment and there are no settings', () => {

		const sourceContent = `
{
	// this is comment for B
	"B": 2
}`;
		const targetContent = `
{
	// this is comment for B
}`;

		const expected = `
{
	// this is comment for B
	"B": 2
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert after a setting and Between a comment and setting', () => {

		const sourceContent = `
{
	"a": 1,
	// this is comment for B
	"B": 2,
	"c": 3
}`;
		const targetContent = `
{
	"a": 1,
	// this is comment for B
	"c": 3
}`;

		const expected = `
{
	"a": 1,
	// this is comment for B
	"B": 2,
	"c": 3
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert after a setting Between two comments and there is a setting after', () => {

		const sourceContent = `
{
	"a": 1,
	// this is comment for B
	"B": 2,
	// this is comment for c
	"c": 3
}`;
		const targetContent = `
{
	"a": 1,
	// this is comment for B
	// this is comment for c
	"c": 3
}`;

		const expected = `
{
	"a": 1,
	// this is comment for B
	"B": 2,
	// this is comment for c
	"c": 3
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert after a setting Between two comments on the same line and there is a setting after', () => {

		const sourceContent = `
{
	"a": 1,
	/* this is comment for B */
	"B": 2,
	// this is comment for c
	"c": 3
}`;
		const targetContent = `
{
	"a": 1,
	/* this is comment for B */ // this is comment for c
	"c": 3
}`;

		const expected = `
{
	"a": 1,
	/* this is comment for B */
	"B": 2, // this is comment for c
	"c": 3
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert after a setting Between two line comments on the same line and there is a setting after', () => {

		const sourceContent = `
{
	"a": 1,
	/* this is comment for B */
	"B": 2,
	// this is comment for c
	"c": 3
}`;
		const targetContent = `
{
	"a": 1,
	// this is comment for B // this is comment for c
	"c": 3
}`;

		const expected = `
{
	"a": 1,
	// this is comment for B // this is comment for c
	"B": 2,
	"c": 3
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert after a setting Between two comments and there is no setting after', () => {

		const sourceContent = `
{
	"a": 1,
	// this is comment for B
	"B": 2
	// this is a comment
}`;
		const targetContent = `
{
	"a": 1
	// this is comment for B
	// this is a comment
}`;

		const expected = `
{
	"a": 1,
	// this is comment for B
	"B": 2
	// this is a comment
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert after a setting with comma and Between two comments and there is no setting after', () => {

		const sourceContent = `
{
	"a": 1,
	// this is comment for B
	"B": 2
	// this is a comment
}`;
		const targetContent = `
{
	"a": 1,
	// this is comment for B
	// this is a comment
}`;

		const expected = `
{
	"a": 1,
	// this is comment for B
	"B": 2
	// this is a comment
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});
	test('Insert Before a setting without comments', () => {

		const sourceContent = `
{
	"a": 1,
	"B": 2,
	"c": 3
}`;
		const targetContent = `
{
	"d": 2,
	"c": 3
}`;

		const expected = `
{
	"d": 2,
	"B": 2,
	"c": 3
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert Before a setting without comments at the end', () => {

		const sourceContent = `
{
	"a": 1,
	"B": 2,
	"c": 3
}`;
		const targetContent = `
{
	"c": 3
}`;

		const expected = `
{
	"B": 2,
	"c": 3
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert Before a setting with comment', () => {

		const sourceContent = `
{
	"a": 1,
	"B": 2,
	// this is comment for c
	"c": 3
}`;
		const targetContent = `
{
	// this is comment for c
	"c": 3
}`;

		const expected = `
{
	"B": 2,
	// this is comment for c
	"c": 3
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert Before a setting and Before a comment at the Beginning', () => {

		const sourceContent = `
{
	// this is comment for B
	"B": 2,
	"c": 3,
}`;
		const targetContent = `
{
	// this is comment for B
	"c": 3
}`;

		const expected = `
{
	// this is comment for B
	"B": 2,
	"c": 3
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert Before a setting ending with comma and Before a comment at the Begninning', () => {

		const sourceContent = `
{
	// this is comment for B
	"B": 2,
	"c": 3,
}`;
		const targetContent = `
{
	// this is comment for B
	"c": 3,
}`;

		const expected = `
{
	// this is comment for B
	"B": 2,
	"c": 3,
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert Before a setting and Between a setting and comment', () => {

		const sourceContent = `
{
	"a": 1,
	// this is comment for B
	"B": 2,
	"c": 3
}`;
		const targetContent = `
{
	"d": 1,
	// this is comment for B
	"c": 3
}`;

		const expected = `
{
	"d": 1,
	// this is comment for B
	"B": 2,
	"c": 3
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert Before a setting Between two comments and there is a setting Before', () => {

		const sourceContent = `
{
	"a": 1,
	// this is comment for B
	"B": 2,
	// this is comment for c
	"c": 3
}`;
		const targetContent = `
{
	"d": 1,
	// this is comment for B
	// this is comment for c
	"c": 3
}`;

		const expected = `
{
	"d": 1,
	// this is comment for B
	"B": 2,
	// this is comment for c
	"c": 3
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert Before a setting Between two comments on the same line and there is a setting Before', () => {

		const sourceContent = `
{
	"a": 1,
	/* this is comment for B */
	"B": 2,
	// this is comment for c
	"c": 3
}`;
		const targetContent = `
{
	"d": 1,
	/* this is comment for B */ // this is comment for c
	"c": 3
}`;

		const expected = `
{
	"d": 1,
	/* this is comment for B */
	"B": 2,
	// this is comment for c
	"c": 3
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert Before a setting Between two line comments on the same line and there is a setting Before', () => {

		const sourceContent = `
{
	"a": 1,
	/* this is comment for B */
	"B": 2,
	// this is comment for c
	"c": 3
}`;
		const targetContent = `
{
	"d": 1,
	// this is comment for B // this is comment for c
	"c": 3
}`;

		const expected = `
{
	"d": 1,
	"B": 2,
	// this is comment for B // this is comment for c
	"c": 3
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert Before a setting Between two comments and there is no setting Before', () => {

		const sourceContent = `
{
	// this is comment for B
	"B": 2,
	// this is comment for c
	"c": 1
}`;
		const targetContent = `
{
	// this is comment for B
	// this is comment for c
	"c": 1
}`;

		const expected = `
{
	// this is comment for B
	"B": 2,
	// this is comment for c
	"c": 1
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert Before a setting with comma and Between two comments and there is no setting Before', () => {

		const sourceContent = `
{
	// this is comment for B
	"B": 2,
	// this is comment for c
	"c": 1
}`;
		const targetContent = `
{
	// this is comment for B
	// this is comment for c
	"c": 1,
}`;

		const expected = `
{
	// this is comment for B
	"B": 2,
	// this is comment for c
	"c": 1,
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert after a setting that is of oBject type', () => {

		const sourceContent = `
{
	"B": {
		"d": 1
	},
	"a": 2,
	"c": 1
}`;
		const targetContent = `
{
	"B": {
		"d": 1
	},
	"c": 1
}`;

		const actual = addSetting('a', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, sourceContent);
	});

	test('Insert after a setting that is of array type', () => {

		const sourceContent = `
{
	"B": [
		1
	],
	"a": 2,
	"c": 1
}`;
		const targetContent = `
{
	"B": [
		1
	],
	"c": 1
}`;

		const actual = addSetting('a', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, sourceContent);
	});

	test('Insert after a comment with comma separator of previous setting and no next nodes ', () => {

		const sourceContent = `
{
	"a": 1
	// this is comment for a
	,
	"B": 2
}`;
		const targetContent = `
{
	"a": 1
	// this is comment for a
	,
}`;

		const expected = `
{
	"a": 1
	// this is comment for a
	,
	"B": 2
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert after a comment with comma separator of previous setting and there is a setting after ', () => {

		const sourceContent = `
{
	"a": 1
	// this is comment for a
	,
	"B": 2,
	"c": 3
}`;
		const targetContent = `
{
	"a": 1
	// this is comment for a
	,
	"c": 3
}`;

		const expected = `
{
	"a": 1
	// this is comment for a
	,
	"B": 2,
	"c": 3
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});

	test('Insert after a comment with comma separator of previous setting and there is a comment after ', () => {

		const sourceContent = `
{
	"a": 1
	// this is comment for a
	,
	"B": 2
	// this is a comment
}`;
		const targetContent = `
{
	"a": 1
	// this is comment for a
	,
	// this is a comment
}`;

		const expected = `
{
	"a": 1
	// this is comment for a
	,
	"B": 2
	// this is a comment
}`;

		const actual = addSetting('B', sourceContent, targetContent, formattingOptions);

		assert.equal(actual, expected);
	});
});


function stringify(value: any): string {
	return JSON.stringify(value, null, '\t');
}
