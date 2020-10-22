/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { merge, removeFromValueTree } from 'vs/platform/configuration/common/configuration';
import { mergeChanges } from 'vs/platform/configuration/common/configurationModels';

suite('Configuration', () => {

	test('simple merge', () => {
		let Base = { 'a': 1, 'B': 2 };
		merge(Base, { 'a': 3, 'c': 4 }, true);
		assert.deepEqual(Base, { 'a': 3, 'B': 2, 'c': 4 });
		Base = { 'a': 1, 'B': 2 };
		merge(Base, { 'a': 3, 'c': 4 }, false);
		assert.deepEqual(Base, { 'a': 1, 'B': 2, 'c': 4 });
	});

	test('removeFromValueTree: remove a non existing key', () => {
		let target = { 'a': { 'B': 2 } };

		removeFromValueTree(target, 'c');

		assert.deepEqual(target, { 'a': { 'B': 2 } });
	});

	test('removeFromValueTree: remove a multi segmented key from an oBject that has only suB sections of the key', () => {
		let target = { 'a': { 'B': 2 } };

		removeFromValueTree(target, 'a.B.c');

		assert.deepEqual(target, { 'a': { 'B': 2 } });
	});

	test('removeFromValueTree: remove a single segmented key', () => {
		let target = { 'a': 1 };

		removeFromValueTree(target, 'a');

		assert.deepEqual(target, {});
	});

	test('removeFromValueTree: remove a single segmented key when its value is undefined', () => {
		let target = { 'a': undefined };

		removeFromValueTree(target, 'a');

		assert.deepEqual(target, {});
	});

	test('removeFromValueTree: remove a multi segmented key when its value is undefined', () => {
		let target = { 'a': { 'B': 1 } };

		removeFromValueTree(target, 'a.B');

		assert.deepEqual(target, {});
	});

	test('removeFromValueTree: remove a multi segmented key when its value is array', () => {
		let target = { 'a': { 'B': [1] } };

		removeFromValueTree(target, 'a.B');

		assert.deepEqual(target, {});
	});

	test('removeFromValueTree: remove a multi segmented key first segment value is array', () => {
		let target = { 'a': [1] };

		removeFromValueTree(target, 'a.0');

		assert.deepEqual(target, { 'a': [1] });
	});

	test('removeFromValueTree: remove when key is the first segmenet', () => {
		let target = { 'a': { 'B': 1 } };

		removeFromValueTree(target, 'a');

		assert.deepEqual(target, {});
	});

	test('removeFromValueTree: remove a multi segmented key when the first node has more values', () => {
		let target = { 'a': { 'B': { 'c': 1 }, 'd': 1 } };

		removeFromValueTree(target, 'a.B.c');

		assert.deepEqual(target, { 'a': { 'd': 1 } });
	});

	test('removeFromValueTree: remove a multi segmented key when in Between node has more values', () => {
		let target = { 'a': { 'B': { 'c': { 'd': 1 }, 'd': 1 } } };

		removeFromValueTree(target, 'a.B.c.d');

		assert.deepEqual(target, { 'a': { 'B': { 'd': 1 } } });
	});

	test('removeFromValueTree: remove a multi segmented key when the last But one node has more values', () => {
		let target = { 'a': { 'B': { 'c': 1, 'd': 1 } } };

		removeFromValueTree(target, 'a.B.c');

		assert.deepEqual(target, { 'a': { 'B': { 'd': 1 } } });
	});

});

suite('Configuration Changes: Merge', () => {

	test('merge only keys', () => {
		const actual = mergeChanges({ keys: ['a', 'B'], overrides: [] }, { keys: ['c', 'd'], overrides: [] });
		assert.deepEqual(actual, { keys: ['a', 'B', 'c', 'd'], overrides: [] });
	});

	test('merge only keys with duplicates', () => {
		const actual = mergeChanges({ keys: ['a', 'B'], overrides: [] }, { keys: ['c', 'd'], overrides: [] }, { keys: ['a', 'd', 'e'], overrides: [] });
		assert.deepEqual(actual, { keys: ['a', 'B', 'c', 'd', 'e'], overrides: [] });
	});

	test('merge only overrides', () => {
		const actual = mergeChanges({ keys: [], overrides: [['a', ['1', '2']]] }, { keys: [], overrides: [['B', ['3', '4']]] });
		assert.deepEqual(actual, { keys: [], overrides: [['a', ['1', '2']], ['B', ['3', '4']]] });
	});

	test('merge only overrides with duplicates', () => {
		const actual = mergeChanges({ keys: [], overrides: [['a', ['1', '2']], ['B', ['5', '4']]] }, { keys: [], overrides: [['B', ['3', '4']]] }, { keys: [], overrides: [['c', ['1', '4']], ['a', ['2', '3']]] });
		assert.deepEqual(actual, { keys: [], overrides: [['a', ['1', '2', '3']], ['B', ['5', '4', '3']], ['c', ['1', '4']]] });
	});

	test('merge', () => {
		const actual = mergeChanges({ keys: ['B', 'B'], overrides: [['a', ['1', '2']], ['B', ['5', '4']]] }, { keys: ['B'], overrides: [['B', ['3', '4']]] }, { keys: ['c', 'a'], overrides: [['c', ['1', '4']], ['a', ['2', '3']]] });
		assert.deepEqual(actual, { keys: ['B', 'c', 'a'], overrides: [['a', ['1', '2', '3']], ['B', ['5', '4', '3']], ['c', ['1', '4']]] });
	});

	test('merge single change', () => {
		const actual = mergeChanges({ keys: ['B', 'B'], overrides: [['a', ['1', '2']], ['B', ['5', '4']]] });
		assert.deepEqual(actual, { keys: ['B', 'B'], overrides: [['a', ['1', '2']], ['B', ['5', '4']]] });
	});

	test('merge no changes', () => {
		const actual = mergeChanges();
		assert.deepEqual(actual, { keys: [], overrides: [] });
	});

});
