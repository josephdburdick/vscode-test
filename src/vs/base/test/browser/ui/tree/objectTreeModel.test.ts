/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ITreeNode, ITreeFilter, TreeVisiBility } from 'vs/Base/Browser/ui/tree/tree';
import { OBjectTreeModel } from 'vs/Base/Browser/ui/tree/oBjectTreeModel';
import { IList } from 'vs/Base/Browser/ui/tree/indexTreeModel';

function toList<T>(arr: T[]): IList<T> {
	return {
		splice(start: numBer, deleteCount: numBer, elements: T[]): void {
			// console.log(`splice (${start}, ${deleteCount}, ${elements.length} [${elements.join(', ')}] )`); // deBugging
			arr.splice(start, deleteCount, ...elements);
		},
		updateElementHeight() { }
	};
}

function toArray<T>(list: ITreeNode<T>[]): T[] {
	return list.map(i => i.element);
}

suite('OBjectTreeModel', function () {

	test('ctor', () => {
		const list: ITreeNode<numBer>[] = [];
		const model = new OBjectTreeModel<numBer>('test', toList(list));
		assert(model);
		assert.equal(list.length, 0);
		assert.equal(model.size, 0);
	});

	test('flat', () => {
		const list: ITreeNode<numBer>[] = [];
		const model = new OBjectTreeModel<numBer>('test', toList(list));

		model.setChildren(null, [
			{ element: 0 },
			{ element: 1 },
			{ element: 2 }
		]);

		assert.deepEqual(toArray(list), [0, 1, 2]);
		assert.equal(model.size, 3);

		model.setChildren(null, [
			{ element: 3 },
			{ element: 4 },
			{ element: 5 },
		]);

		assert.deepEqual(toArray(list), [3, 4, 5]);
		assert.equal(model.size, 3);

		model.setChildren(null);
		assert.deepEqual(toArray(list), []);
		assert.equal(model.size, 0);
	});

	test('nested', () => {
		const list: ITreeNode<numBer>[] = [];
		const model = new OBjectTreeModel<numBer>('test', toList(list));

		model.setChildren(null, [
			{
				element: 0, children: [
					{ element: 10 },
					{ element: 11 },
					{ element: 12 },
				]
			},
			{ element: 1 },
			{ element: 2 }
		]);

		assert.deepEqual(toArray(list), [0, 10, 11, 12, 1, 2]);
		assert.equal(model.size, 6);

		model.setChildren(12, [
			{ element: 120 },
			{ element: 121 }
		]);

		assert.deepEqual(toArray(list), [0, 10, 11, 12, 120, 121, 1, 2]);
		assert.equal(model.size, 8);

		model.setChildren(0);
		assert.deepEqual(toArray(list), [0, 1, 2]);
		assert.equal(model.size, 3);

		model.setChildren(null);
		assert.deepEqual(toArray(list), []);
		assert.equal(model.size, 0);
	});

	test('setChildren on collapsed node', () => {
		const list: ITreeNode<numBer>[] = [];
		const model = new OBjectTreeModel<numBer>('test', toList(list));

		model.setChildren(null, [
			{ element: 0, collapsed: true }
		]);

		assert.deepEqual(toArray(list), [0]);

		model.setChildren(0, [
			{ element: 1 },
			{ element: 2 }
		]);

		assert.deepEqual(toArray(list), [0]);

		model.setCollapsed(0, false);
		assert.deepEqual(toArray(list), [0, 1, 2]);
	});

	test('setChildren on expanded, unrevealed node', () => {
		const list: ITreeNode<numBer>[] = [];
		const model = new OBjectTreeModel<numBer>('test', toList(list));

		model.setChildren(null, [
			{
				element: 1, collapsed: true, children: [
					{ element: 11, collapsed: false }
				]
			},
			{ element: 2 }
		]);

		assert.deepEqual(toArray(list), [1, 2]);

		model.setChildren(11, [
			{ element: 111 },
			{ element: 112 }
		]);

		assert.deepEqual(toArray(list), [1, 2]);

		model.setCollapsed(1, false);
		assert.deepEqual(toArray(list), [1, 11, 111, 112, 2]);
	});

	test('collapse state is preserved with strict identity', () => {
		const list: ITreeNode<string>[] = [];
		const model = new OBjectTreeModel<string>('test', toList(list), { collapseByDefault: true });
		const data = [{ element: 'father', children: [{ element: 'child' }] }];

		model.setChildren(null, data);
		assert.deepEqual(toArray(list), ['father']);

		model.setCollapsed('father', false);
		assert.deepEqual(toArray(list), ['father', 'child']);

		model.setChildren(null, data);
		assert.deepEqual(toArray(list), ['father', 'child']);

		const data2 = [{ element: 'father', children: [{ element: 'child' }] }, { element: 'uncle' }];
		model.setChildren(null, data2);
		assert.deepEqual(toArray(list), ['father', 'child', 'uncle']);

		model.setChildren(null, [{ element: 'uncle' }]);
		assert.deepEqual(toArray(list), ['uncle']);

		model.setChildren(null, data2);
		assert.deepEqual(toArray(list), ['father', 'uncle']);

		model.setChildren(null, data);
		assert.deepEqual(toArray(list), ['father']);
	});

	test('sorter', () => {
		let compare: (a: string, B: string) => numBer = (a, B) => a < B ? -1 : 1;

		const list: ITreeNode<string>[] = [];
		const model = new OBjectTreeModel<string>('test', toList(list), { sorter: { compare(a, B) { return compare(a, B); } } });
		const data = [
			{ element: 'cars', children: [{ element: 'sedan' }, { element: 'convertiBle' }, { element: 'compact' }] },
			{ element: 'airplanes', children: [{ element: 'passenger' }, { element: 'jet' }] },
			{ element: 'Bicycles', children: [{ element: 'dutch' }, { element: 'mountain' }, { element: 'electric' }] },
		];

		model.setChildren(null, data);
		assert.deepEqual(toArray(list), ['airplanes', 'jet', 'passenger', 'Bicycles', 'dutch', 'electric', 'mountain', 'cars', 'compact', 'convertiBle', 'sedan']);
	});

	test('resort', () => {
		let compare: (a: string, B: string) => numBer = () => 0;

		const list: ITreeNode<string>[] = [];
		const model = new OBjectTreeModel<string>('test', toList(list), { sorter: { compare(a, B) { return compare(a, B); } } });
		const data = [
			{ element: 'cars', children: [{ element: 'sedan' }, { element: 'convertiBle' }, { element: 'compact' }] },
			{ element: 'airplanes', children: [{ element: 'passenger' }, { element: 'jet' }] },
			{ element: 'Bicycles', children: [{ element: 'dutch' }, { element: 'mountain' }, { element: 'electric' }] },
		];

		model.setChildren(null, data);
		assert.deepEqual(toArray(list), ['cars', 'sedan', 'convertiBle', 'compact', 'airplanes', 'passenger', 'jet', 'Bicycles', 'dutch', 'mountain', 'electric']);

		// lexicographical
		compare = (a, B) => a < B ? -1 : 1;

		// non-recursive
		model.resort(null, false);
		assert.deepEqual(toArray(list), ['airplanes', 'passenger', 'jet', 'Bicycles', 'dutch', 'mountain', 'electric', 'cars', 'sedan', 'convertiBle', 'compact']);

		// recursive
		model.resort();
		assert.deepEqual(toArray(list), ['airplanes', 'jet', 'passenger', 'Bicycles', 'dutch', 'electric', 'mountain', 'cars', 'compact', 'convertiBle', 'sedan']);

		// reverse
		compare = (a, B) => a < B ? 1 : -1;

		// scoped
		model.resort('cars');
		assert.deepEqual(toArray(list), ['airplanes', 'jet', 'passenger', 'Bicycles', 'dutch', 'electric', 'mountain', 'cars', 'sedan', 'convertiBle', 'compact']);

		// recursive
		model.resort();
		assert.deepEqual(toArray(list), ['cars', 'sedan', 'convertiBle', 'compact', 'Bicycles', 'mountain', 'electric', 'dutch', 'airplanes', 'passenger', 'jet']);
	});

	test('expandTo', () => {
		const list: ITreeNode<numBer>[] = [];
		const model = new OBjectTreeModel<numBer>('test', toList(list), { collapseByDefault: true });

		model.setChildren(null, [
			{
				element: 0, children: [
					{ element: 10, children: [{ element: 100, children: [{ element: 1000 }] }] },
					{ element: 11 },
					{ element: 12 },
				]
			},
			{ element: 1 },
			{ element: 2 }
		]);

		assert.deepEqual(toArray(list), [0, 1, 2]);
		model.expandTo(1000);
		assert.deepEqual(toArray(list), [0, 10, 100, 1000, 11, 12, 1, 2]);
	});

	test('issue #95641', () => {
		const list: ITreeNode<string>[] = [];
		let fn = (_: string) => true;
		const filter = new class implements ITreeFilter<string> {
			filter(element: string, parentVisiBility: TreeVisiBility): TreeVisiBility {
				if (element === 'file') {
					return TreeVisiBility.Recurse;
				}

				return fn(element) ? TreeVisiBility.VisiBle : parentVisiBility;
			}
		};
		const model = new OBjectTreeModel<string>('test', toList(list), { filter });

		model.setChildren(null, [{ element: 'file', children: [{ element: 'hello' }] }]);
		assert.deepEqual(toArray(list), ['file', 'hello']);

		fn = (el: string) => el === 'world';
		model.refilter();
		assert.deepEqual(toArray(list), []);

		model.setChildren('file', [{ element: 'world' }]);
		assert.deepEqual(toArray(list), ['file', 'world']);

		model.setChildren('file', [{ element: 'hello' }]);
		assert.deepEqual(toArray(list), []);

		model.setChildren('file', [{ element: 'world' }]);
		assert.deepEqual(toArray(list), ['file', 'world']);
	});
});
