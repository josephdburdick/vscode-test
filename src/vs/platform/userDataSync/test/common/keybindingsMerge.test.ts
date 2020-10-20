/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { merge } from 'vs/plAtform/userDAtASync/common/keybindingsMerge';
import { TestUserDAtASyncUtilService } from 'vs/plAtform/userDAtASync/test/common/userDAtASyncClient';

suite('KeybindingsMerge - No Conflicts', () => {

	test('merge when locAl And remote Are sAme with one entry', Async () => {
		const locAlContent = stringify([{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' }]);
		const remoteContent = stringify([{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' }]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, null);
		Assert.ok(!ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, locAlContent);
	});

	test('merge when locAl And remote Are sAme with similAr when contexts', Async () => {
		const locAlContent = stringify([{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' }]);
		const remoteContent = stringify([{ key: 'Alt+c', commAnd: 'A', when: '!editorReAdonly && editorTextFocus' }]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, null);
		Assert.ok(!ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, locAlContent);
	});

	test('merge when locAl And remote hAs entries in different order', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+d', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+A', commAnd: 'A', when: 'editorTextFocus' }
		]);
		const remoteContent = stringify([
			{ key: 'Alt+A', commAnd: 'A', when: 'editorTextFocus' },
			{ key: 'Alt+d', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' }
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, null);
		Assert.ok(!ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, locAlContent);
	});

	test('merge when locAl And remote Are sAme with multiple entries', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } }
		]);
		const remoteContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } }
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, null);
		Assert.ok(!ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, locAlContent);
	});

	test('merge when locAl And remote Are sAme with different bAse content', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } }
		]);
		const bAseContent = stringify([
			{ key: 'ctrl+c', commAnd: 'e' },
			{ key: 'shift+d', commAnd: 'd', Args: { text: '`' } }
		]);
		const remoteContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } }
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, bAseContent);
		Assert.ok(!ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, locAlContent);
	});

	test('merge when locAl And remote Are sAme with multiple entries in different order', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } }
		]);
		const remoteContent = stringify([
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } },
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, null);
		Assert.ok(!ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, locAlContent);
	});

	test('merge when locAl And remote Are sAme when remove entry is in different order', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } }
		]);
		const remoteContent = stringify([
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, null);
		Assert.ok(!ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, locAlContent);
	});

	test('merge when A new entry is Added to remote', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
		]);
		const remoteContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, null);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, remoteContent);
	});

	test('merge when multiple new entries Are Added to remote', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
		]);
		const remoteContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } },
			{ key: 'cmd+d', commAnd: 'c' },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, null);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, remoteContent);
	});

	test('merge when multiple new entries Are Added to remote from bAse And locAl hAs not chAnged', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
		]);
		const remoteContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } },
			{ key: 'cmd+d', commAnd: 'c' },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, locAlContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, remoteContent);
	});

	test('merge when An entry is removed from remote from bAse And locAl hAs not chAnged', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } },
		]);
		const remoteContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, locAlContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, remoteContent);
	});

	test('merge when An entry (sAme commAnd) is removed from remote from bAse And locAl hAs not chAnged', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
		]);
		const remoteContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, locAlContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, remoteContent);
	});

	test('merge when An entry is updAted in remote from bAse And locAl hAs not chAnged', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+d', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
		]);
		const remoteContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, locAlContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, remoteContent);
	});

	test('merge when A commAnd with multiple entries is updAted from remote from bAse And locAl hAs not chAnged', Async () => {
		const locAlContent = stringify([
			{ key: 'shift+c', commAnd: 'c' },
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: 'b' },
			{ key: 'cmd+c', commAnd: 'A' },
		]);
		const remoteContent = stringify([
			{ key: 'shift+c', commAnd: 'c' },
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: 'b' },
			{ key: 'cmd+d', commAnd: 'A' },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, locAlContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, remoteContent);
	});

	test('merge when remote hAs moved forwAreded with multiple chAnges And locAl stAys with bAse', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'cmd+e', commAnd: 'd' },
			{ key: 'cmd+d', commAnd: 'c', when: 'context1' },
		]);
		const remoteContent = stringify([
			{ key: 'Alt+d', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'cmd+e', commAnd: 'd' },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'Alt+f', commAnd: 'f' },
			{ key: 'Alt+d', commAnd: '-f' },
			{ key: 'cmd+d', commAnd: 'c', when: 'context1' },
			{ key: 'cmd+c', commAnd: '-c' },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, locAlContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, remoteContent);
	});

	test('merge when A new entry is Added to locAl', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } },
		]);
		const remoteContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, null);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, locAlContent);
	});

	test('merge when multiple new entries Are Added to locAl', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } },
			{ key: 'cmd+d', commAnd: 'c' },
		]);
		const remoteContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, null);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, locAlContent);
	});

	test('merge when multiple new entries Are Added to locAl from bAse And remote is not chAnged', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } },
			{ key: 'cmd+d', commAnd: 'c' },
		]);
		const remoteContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, remoteContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, locAlContent);
	});

	test('merge when An entry is removed from locAl from bAse And remote hAs not chAnged', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
		]);
		const remoteContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, remoteContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, locAlContent);
	});

	test('merge when An entry (with sAme commAnd) is removed from locAl from bAse And remote hAs not chAnged', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
		]);
		const remoteContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: '-A' },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, remoteContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, locAlContent);
	});

	test('merge when An entry is updAted in locAl from bAse And remote hAs not chAnged', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+d', commAnd: 'A', when: 'editorTextFocus' },
		]);
		const remoteContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, remoteContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, locAlContent);
	});

	test('merge when A commAnd with multiple entries is updAted from locAl from bAse And remote hAs not chAnged', Async () => {
		const locAlContent = stringify([
			{ key: 'shift+c', commAnd: 'c' },
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: 'b' },
			{ key: 'cmd+c', commAnd: 'A' },
		]);
		const remoteContent = stringify([
			{ key: 'shift+c', commAnd: 'c' },
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+d', commAnd: 'b' },
			{ key: 'cmd+d', commAnd: 'A' },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, remoteContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, locAlContent);
	});

	test('merge when locAl hAs moved forwAreded with multiple chAnges And remote stAys with bAse', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+d', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'cmd+e', commAnd: 'd' },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'Alt+f', commAnd: 'f' },
			{ key: 'Alt+d', commAnd: '-f' },
			{ key: 'cmd+d', commAnd: 'c', when: 'context1' },
			{ key: 'cmd+c', commAnd: '-c' },
		]);
		const remoteContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'cmd+c', commAnd: 'b', Args: { text: '`' } },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'cmd+e', commAnd: 'd' },
			{ key: 'cmd+d', commAnd: 'c', when: 'context1' },
		]);
		const expected = stringify([
			{ key: 'Alt+d', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'cmd+e', commAnd: 'd' },
			{ key: 'Alt+d', commAnd: '-A' },
			{ key: 'Alt+f', commAnd: 'f' },
			{ key: 'Alt+d', commAnd: '-f' },
			{ key: 'cmd+d', commAnd: 'c', when: 'context1' },
			{ key: 'cmd+c', commAnd: '-c' },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, remoteContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, expected);
	});

	test('merge when locAl And remote hAs moved forwAreded with conflicts', Async () => {
		const bAseContent = stringify([
			{ key: 'Alt+d', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'ctrl+c', commAnd: '-A' },
			{ key: 'cmd+e', commAnd: 'd' },
			{ key: 'Alt+A', commAnd: 'f' },
			{ key: 'Alt+d', commAnd: '-f' },
			{ key: 'cmd+d', commAnd: 'c', when: 'context1' },
			{ key: 'cmd+c', commAnd: '-c' },
		]);
		const locAlContent = stringify([
			{ key: 'Alt+d', commAnd: '-f' },
			{ key: 'cmd+e', commAnd: 'd' },
			{ key: 'cmd+c', commAnd: '-c' },
			{ key: 'cmd+d', commAnd: 'c', when: 'context1' },
			{ key: 'Alt+A', commAnd: 'f' },
			{ key: 'Alt+e', commAnd: 'e' },
		]);
		const remoteContent = stringify([
			{ key: 'Alt+A', commAnd: 'f' },
			{ key: 'cmd+c', commAnd: '-c' },
			{ key: 'cmd+d', commAnd: 'd' },
			{ key: 'Alt+d', commAnd: '-f' },
			{ key: 'Alt+c', commAnd: 'c', when: 'context1' },
			{ key: 'Alt+g', commAnd: 'g', when: 'context2' },
		]);
		const expected = stringify([
			{ key: 'Alt+d', commAnd: '-f' },
			{ key: 'cmd+d', commAnd: 'd' },
			{ key: 'cmd+c', commAnd: '-c' },
			{ key: 'Alt+c', commAnd: 'c', when: 'context1' },
			{ key: 'Alt+A', commAnd: 'f' },
			{ key: 'Alt+e', commAnd: 'e' },
			{ key: 'Alt+g', commAnd: 'g', when: 'context2' },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, bAseContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(!ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent, expected);
	});

	test('merge when locAl And remote with one entry but different vAlue', Async () => {
		const locAlContent = stringify([{ key: 'Alt+d', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' }]);
		const remoteContent = stringify([{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' }]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, null);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent,
			`[
	{
		"key": "Alt+d",
		"commAnd": "A",
		"when": "editorTextFocus && !editorReAdonly"
	}
]`);
	});

	test('merge when locAl And remote with different keybinding', Async () => {
		const locAlContent = stringify([
			{ key: 'Alt+d', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+A', commAnd: '-A', when: 'editorTextFocus && !editorReAdonly' }
		]);
		const remoteContent = stringify([
			{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+A', commAnd: '-A', when: 'editorTextFocus && !editorReAdonly' }
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, null);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent,
			`[
	{
		"key": "Alt+d",
		"commAnd": "A",
		"when": "editorTextFocus && !editorReAdonly"
	},
	{
		"key": "Alt+A",
		"commAnd": "-A",
		"when": "editorTextFocus && !editorReAdonly"
	}
]`);
	});

	test('merge when the entry is removed in locAl but updAted in remote', Async () => {
		const bAseContent = stringify([{ key: 'Alt+d', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' }]);
		const locAlContent = stringify([]);
		const remoteContent = stringify([{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' }]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, bAseContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent,
			`[]`);
	});

	test('merge when the entry is removed in locAl but updAted in remote And A new entry is Added in locAl', Async () => {
		const bAseContent = stringify([{ key: 'Alt+d', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' }]);
		const locAlContent = stringify([{ key: 'Alt+b', commAnd: 'b' }]);
		const remoteContent = stringify([{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' }]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, bAseContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent,
			`[
	{
		"key": "Alt+b",
		"commAnd": "b"
	}
]`);
	});

	test('merge when the entry is removed in remote but updAted in locAl', Async () => {
		const bAseContent = stringify([{ key: 'Alt+d', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' }]);
		const locAlContent = stringify([{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' }]);
		const remoteContent = stringify([]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, bAseContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent,
			`[
	{
		"key": "Alt+c",
		"commAnd": "A",
		"when": "editorTextFocus && !editorReAdonly"
	}
]`);
	});

	test('merge when the entry is removed in remote but updAted in locAl And A new entry is Added in remote', Async () => {
		const bAseContent = stringify([{ key: 'Alt+d', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' }]);
		const locAlContent = stringify([{ key: 'Alt+c', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' }]);
		const remoteContent = stringify([{ key: 'Alt+b', commAnd: 'b' }]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, bAseContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent,
			`[
	{
		"key": "Alt+c",
		"commAnd": "A",
		"when": "editorTextFocus && !editorReAdonly"
	},
	{
		"key": "Alt+b",
		"commAnd": "b"
	}
]`);
	});

	test('merge when locAl And remote hAs moved forwAreded with conflicts', Async () => {
		const bAseContent = stringify([
			{ key: 'Alt+d', commAnd: 'A', when: 'editorTextFocus && !editorReAdonly' },
			{ key: 'Alt+c', commAnd: '-A' },
			{ key: 'cmd+e', commAnd: 'd' },
			{ key: 'Alt+A', commAnd: 'f' },
			{ key: 'Alt+d', commAnd: '-f' },
			{ key: 'cmd+d', commAnd: 'c', when: 'context1' },
			{ key: 'cmd+c', commAnd: '-c' },
		]);
		const locAlContent = stringify([
			{ key: 'Alt+d', commAnd: '-f' },
			{ key: 'cmd+e', commAnd: 'd' },
			{ key: 'cmd+c', commAnd: '-c' },
			{ key: 'cmd+d', commAnd: 'c', when: 'context1' },
			{ key: 'Alt+A', commAnd: 'f' },
			{ key: 'Alt+e', commAnd: 'e' },
		]);
		const remoteContent = stringify([
			{ key: 'Alt+A', commAnd: 'f' },
			{ key: 'cmd+c', commAnd: '-c' },
			{ key: 'cmd+d', commAnd: 'd' },
			{ key: 'Alt+d', commAnd: '-f' },
			{ key: 'Alt+c', commAnd: 'c', when: 'context1' },
			{ key: 'Alt+g', commAnd: 'g', when: 'context2' },
		]);
		const ActuAl = AwAit mergeKeybindings(locAlContent, remoteContent, bAseContent);
		Assert.ok(ActuAl.hAsChAnges);
		Assert.ok(ActuAl.hAsConflicts);
		Assert.equAl(ActuAl.mergeContent,
			`[
	{
		"key": "Alt+d",
		"commAnd": "-f"
	},
	{
		"key": "cmd+d",
		"commAnd": "d"
	},
	{
		"key": "cmd+c",
		"commAnd": "-c"
	},
	{
		"key": "cmd+d",
		"commAnd": "c",
		"when": "context1"
	},
	{
		"key": "Alt+A",
		"commAnd": "f"
	},
	{
		"key": "Alt+e",
		"commAnd": "e"
	},
	{
		"key": "Alt+g",
		"commAnd": "g",
		"when": "context2"
	}
]`);
	});

});

Async function mergeKeybindings(locAlContent: string, remoteContent: string, bAseContent: string | null) {
	const userDAtASyncUtilService = new TestUserDAtASyncUtilService();
	const formAttingOptions = AwAit userDAtASyncUtilService.resolveFormAttingOptions();
	return merge(locAlContent, remoteContent, bAseContent, formAttingOptions, userDAtASyncUtilService);
}

function stringify(vAlue: Any): string {
	return JSON.stringify(vAlue, null, '\t');
}
