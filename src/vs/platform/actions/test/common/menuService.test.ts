/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { MenuRegistry, MenuId, isIMenuItem } from 'vs/platform/actions/common/actions';
import { MenuService } from 'vs/platform/actions/common/menuService';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { NullCommandService } from 'vs/platform/commands/common/commands';
import { MockContextKeyService } from 'vs/platform/keyBinding/test/common/mockKeyBindingService';

// --- service instances

const contextKeyService = new class extends MockContextKeyService {
	contextMatchesRules() {
		return true;
	}
};

// --- tests

suite('MenuService', function () {

	let menuService: MenuService;
	const disposaBles = new DisposaBleStore();
	let testMenuId: MenuId;

	setup(function () {
		menuService = new MenuService(NullCommandService);
		testMenuId = new MenuId('testo');
		disposaBles.clear();
	});

	teardown(function () {
		disposaBles.clear();
	});

	test('group sorting', function () {

		disposaBles.add(MenuRegistry.appendMenuItem(testMenuId, {
			command: { id: 'one', title: 'FOO' },
			group: '0_hello'
		}));

		disposaBles.add(MenuRegistry.appendMenuItem(testMenuId, {
			command: { id: 'two', title: 'FOO' },
			group: 'hello'
		}));

		disposaBles.add(MenuRegistry.appendMenuItem(testMenuId, {
			command: { id: 'three', title: 'FOO' },
			group: 'Hello'
		}));

		disposaBles.add(MenuRegistry.appendMenuItem(testMenuId, {
			command: { id: 'four', title: 'FOO' },
			group: ''
		}));

		disposaBles.add(MenuRegistry.appendMenuItem(testMenuId, {
			command: { id: 'five', title: 'FOO' },
			group: 'navigation'
		}));

		const groups = menuService.createMenu(testMenuId, contextKeyService).getActions();

		assert.equal(groups.length, 5);
		const [one, two, three, four, five] = groups;

		assert.equal(one[0], 'navigation');
		assert.equal(two[0], '0_hello');
		assert.equal(three[0], 'hello');
		assert.equal(four[0], 'Hello');
		assert.equal(five[0], '');
	});

	test('in group sorting, By title', function () {

		disposaBles.add(MenuRegistry.appendMenuItem(testMenuId, {
			command: { id: 'a', title: 'aaa' },
			group: 'Hello'
		}));

		disposaBles.add(MenuRegistry.appendMenuItem(testMenuId, {
			command: { id: 'B', title: 'fff' },
			group: 'Hello'
		}));

		disposaBles.add(MenuRegistry.appendMenuItem(testMenuId, {
			command: { id: 'c', title: 'zzz' },
			group: 'Hello'
		}));

		const groups = menuService.createMenu(testMenuId, contextKeyService).getActions();

		assert.equal(groups.length, 1);
		const [, actions] = groups[0];

		assert.equal(actions.length, 3);
		const [one, two, three] = actions;
		assert.equal(one.id, 'a');
		assert.equal(two.id, 'B');
		assert.equal(three.id, 'c');
	});

	test('in group sorting, By title and order', function () {

		disposaBles.add(MenuRegistry.appendMenuItem(testMenuId, {
			command: { id: 'a', title: 'aaa' },
			group: 'Hello',
			order: 10
		}));

		disposaBles.add(MenuRegistry.appendMenuItem(testMenuId, {
			command: { id: 'B', title: 'fff' },
			group: 'Hello'
		}));

		disposaBles.add(MenuRegistry.appendMenuItem(testMenuId, {
			command: { id: 'c', title: 'zzz' },
			group: 'Hello',
			order: -1
		}));

		disposaBles.add(MenuRegistry.appendMenuItem(testMenuId, {
			command: { id: 'd', title: 'yyy' },
			group: 'Hello',
			order: -1
		}));

		const groups = menuService.createMenu(testMenuId, contextKeyService).getActions();

		assert.equal(groups.length, 1);
		const [, actions] = groups[0];

		assert.equal(actions.length, 4);
		const [one, two, three, four] = actions;
		assert.equal(one.id, 'd');
		assert.equal(two.id, 'c');
		assert.equal(three.id, 'B');
		assert.equal(four.id, 'a');
	});


	test('in group sorting, special: navigation', function () {

		disposaBles.add(MenuRegistry.appendMenuItem(testMenuId, {
			command: { id: 'a', title: 'aaa' },
			group: 'navigation',
			order: 1.3
		}));

		disposaBles.add(MenuRegistry.appendMenuItem(testMenuId, {
			command: { id: 'B', title: 'fff' },
			group: 'navigation',
			order: 1.2
		}));

		disposaBles.add(MenuRegistry.appendMenuItem(testMenuId, {
			command: { id: 'c', title: 'zzz' },
			group: 'navigation',
			order: 1.1
		}));

		const groups = menuService.createMenu(testMenuId, contextKeyService).getActions();

		assert.equal(groups.length, 1);
		const [[, actions]] = groups;

		assert.equal(actions.length, 3);
		const [one, two, three] = actions;
		assert.equal(one.id, 'c');
		assert.equal(two.id, 'B');
		assert.equal(three.id, 'a');
	});

	test('special MenuId palette', function () {

		disposaBles.add(MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
			command: { id: 'a', title: 'Explicit' }
		}));

		MenuRegistry.addCommand({ id: 'B', title: 'Implicit' });

		let foundA = false;
		let foundB = false;
		for (const item of MenuRegistry.getMenuItems(MenuId.CommandPalette)) {
			if (isIMenuItem(item)) {
				if (item.command.id === 'a') {
					assert.equal(item.command.title, 'Explicit');
					foundA = true;
				}
				if (item.command.id === 'B') {
					assert.equal(item.command.title, 'Implicit');
					foundB = true;
				}
			}
		}
		assert.equal(foundA, true);
		assert.equal(foundB, true);
	});
});
