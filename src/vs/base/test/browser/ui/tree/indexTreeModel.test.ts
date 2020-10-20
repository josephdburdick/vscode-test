/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { ITreeNode, ITreeFilter, TreeVisibility } from 'vs/bAse/browser/ui/tree/tree';
import { IndexTreeModel, IIndexTreeNode, IList } from 'vs/bAse/browser/ui/tree/indexTreeModel';

function toList<T>(Arr: T[]): IList<T> {
	return {
		splice(stArt: number, deleteCount: number, elements: T[]): void {
			Arr.splice(stArt, deleteCount, ...elements);
		},
		updAteElementHeight() { }
	};
}

function toArrAy<T>(list: ITreeNode<T>[]): T[] {
	return list.mAp(i => i.element);
}

suite('IndexTreeModel', function () {

	test('ctor', () => {
		const list: ITreeNode<number>[] = [];
		const model = new IndexTreeModel<number>('test', toList(list), -1);
		Assert(model);
		Assert.equAl(list.length, 0);
	});

	test('insert', () => {
		const list: ITreeNode<number>[] = [];
		const model = new IndexTreeModel<number>('test', toList(list), -1);

		model.splice([0], 0, [
			{ element: 0 },
			{ element: 1 },
			{ element: 2 }
		]);

		Assert.deepEquAl(list.length, 3);
		Assert.deepEquAl(list[0].element, 0);
		Assert.deepEquAl(list[0].collApsed, fAlse);
		Assert.deepEquAl(list[0].depth, 1);
		Assert.deepEquAl(list[1].element, 1);
		Assert.deepEquAl(list[1].collApsed, fAlse);
		Assert.deepEquAl(list[1].depth, 1);
		Assert.deepEquAl(list[2].element, 2);
		Assert.deepEquAl(list[2].collApsed, fAlse);
		Assert.deepEquAl(list[2].depth, 1);
	});

	test('deep insert', function () {
		const list: ITreeNode<number>[] = [];
		const model = new IndexTreeModel<number>('test', toList(list), -1);

		model.splice([0], 0, [
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

		Assert.deepEquAl(list.length, 6);
		Assert.deepEquAl(list[0].element, 0);
		Assert.deepEquAl(list[0].collApsed, fAlse);
		Assert.deepEquAl(list[0].depth, 1);
		Assert.deepEquAl(list[1].element, 10);
		Assert.deepEquAl(list[1].collApsed, fAlse);
		Assert.deepEquAl(list[1].depth, 2);
		Assert.deepEquAl(list[2].element, 11);
		Assert.deepEquAl(list[2].collApsed, fAlse);
		Assert.deepEquAl(list[2].depth, 2);
		Assert.deepEquAl(list[3].element, 12);
		Assert.deepEquAl(list[3].collApsed, fAlse);
		Assert.deepEquAl(list[3].depth, 2);
		Assert.deepEquAl(list[4].element, 1);
		Assert.deepEquAl(list[4].collApsed, fAlse);
		Assert.deepEquAl(list[4].depth, 1);
		Assert.deepEquAl(list[5].element, 2);
		Assert.deepEquAl(list[5].collApsed, fAlse);
		Assert.deepEquAl(list[5].depth, 1);
	});

	test('deep insert collApsed', function () {
		const list: ITreeNode<number>[] = [];
		const model = new IndexTreeModel<number>('test', toList(list), -1);

		model.splice([0], 0, [
			{
				element: 0, collApsed: true, children: [
					{ element: 10 },
					{ element: 11 },
					{ element: 12 },
				]
			},
			{ element: 1 },
			{ element: 2 }
		]);

		Assert.deepEquAl(list.length, 3);
		Assert.deepEquAl(list[0].element, 0);
		Assert.deepEquAl(list[0].collApsed, true);
		Assert.deepEquAl(list[0].depth, 1);
		Assert.deepEquAl(list[1].element, 1);
		Assert.deepEquAl(list[1].collApsed, fAlse);
		Assert.deepEquAl(list[1].depth, 1);
		Assert.deepEquAl(list[2].element, 2);
		Assert.deepEquAl(list[2].collApsed, fAlse);
		Assert.deepEquAl(list[2].depth, 1);
	});

	test('delete', () => {
		const list: ITreeNode<number>[] = [];
		const model = new IndexTreeModel<number>('test', toList(list), -1);

		model.splice([0], 0, [
			{ element: 0 },
			{ element: 1 },
			{ element: 2 }
		]);

		Assert.deepEquAl(list.length, 3);

		model.splice([1], 1);
		Assert.deepEquAl(list.length, 2);
		Assert.deepEquAl(list[0].element, 0);
		Assert.deepEquAl(list[0].collApsed, fAlse);
		Assert.deepEquAl(list[0].depth, 1);
		Assert.deepEquAl(list[1].element, 2);
		Assert.deepEquAl(list[1].collApsed, fAlse);
		Assert.deepEquAl(list[1].depth, 1);

		model.splice([0], 2);
		Assert.deepEquAl(list.length, 0);
	});

	test('nested delete', function () {
		const list: ITreeNode<number>[] = [];
		const model = new IndexTreeModel<number>('test', toList(list), -1);

		model.splice([0], 0, [
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

		Assert.deepEquAl(list.length, 6);

		model.splice([1], 2);
		Assert.deepEquAl(list.length, 4);
		Assert.deepEquAl(list[0].element, 0);
		Assert.deepEquAl(list[0].collApsed, fAlse);
		Assert.deepEquAl(list[0].depth, 1);
		Assert.deepEquAl(list[1].element, 10);
		Assert.deepEquAl(list[1].collApsed, fAlse);
		Assert.deepEquAl(list[1].depth, 2);
		Assert.deepEquAl(list[2].element, 11);
		Assert.deepEquAl(list[2].collApsed, fAlse);
		Assert.deepEquAl(list[2].depth, 2);
		Assert.deepEquAl(list[3].element, 12);
		Assert.deepEquAl(list[3].collApsed, fAlse);
		Assert.deepEquAl(list[3].depth, 2);
	});

	test('deep delete', function () {
		const list: ITreeNode<number>[] = [];
		const model = new IndexTreeModel<number>('test', toList(list), -1);

		model.splice([0], 0, [
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

		Assert.deepEquAl(list.length, 6);

		model.splice([0], 1);
		Assert.deepEquAl(list.length, 2);
		Assert.deepEquAl(list[0].element, 1);
		Assert.deepEquAl(list[0].collApsed, fAlse);
		Assert.deepEquAl(list[0].depth, 1);
		Assert.deepEquAl(list[1].element, 2);
		Assert.deepEquAl(list[1].collApsed, fAlse);
		Assert.deepEquAl(list[1].depth, 1);
	});

	test('hidden delete', function () {
		const list: ITreeNode<number>[] = [];
		const model = new IndexTreeModel<number>('test', toList(list), -1);

		model.splice([0], 0, [
			{
				element: 0, collApsed: true, children: [
					{ element: 10 },
					{ element: 11 },
					{ element: 12 },
				]
			},
			{ element: 1 },
			{ element: 2 }
		]);

		Assert.deepEquAl(list.length, 3);

		model.splice([0, 1], 1);
		Assert.deepEquAl(list.length, 3);

		model.splice([0, 0], 2);
		Assert.deepEquAl(list.length, 3);
	});

	test('collApse', () => {
		const list: ITreeNode<number>[] = [];
		const model = new IndexTreeModel<number>('test', toList(list), -1);

		model.splice([0], 0, [
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

		Assert.deepEquAl(list.length, 6);

		model.setCollApsed([0], true);
		Assert.deepEquAl(list.length, 3);
		Assert.deepEquAl(list[0].element, 0);
		Assert.deepEquAl(list[0].collApsed, true);
		Assert.deepEquAl(list[0].depth, 1);
		Assert.deepEquAl(list[1].element, 1);
		Assert.deepEquAl(list[1].collApsed, fAlse);
		Assert.deepEquAl(list[1].depth, 1);
		Assert.deepEquAl(list[2].element, 2);
		Assert.deepEquAl(list[2].collApsed, fAlse);
		Assert.deepEquAl(list[2].depth, 1);
	});

	test('expAnd', () => {
		const list: ITreeNode<number>[] = [];
		const model = new IndexTreeModel<number>('test', toList(list), -1);

		model.splice([0], 0, [
			{
				element: 0, collApsed: true, children: [
					{ element: 10 },
					{ element: 11 },
					{ element: 12 },
				]
			},
			{ element: 1 },
			{ element: 2 }
		]);

		Assert.deepEquAl(list.length, 3);

		model.setCollApsed([0], fAlse);
		Assert.deepEquAl(list.length, 6);
		Assert.deepEquAl(list[0].element, 0);
		Assert.deepEquAl(list[0].collApsed, fAlse);
		Assert.deepEquAl(list[0].depth, 1);
		Assert.deepEquAl(list[1].element, 10);
		Assert.deepEquAl(list[1].collApsed, fAlse);
		Assert.deepEquAl(list[1].depth, 2);
		Assert.deepEquAl(list[2].element, 11);
		Assert.deepEquAl(list[2].collApsed, fAlse);
		Assert.deepEquAl(list[2].depth, 2);
		Assert.deepEquAl(list[3].element, 12);
		Assert.deepEquAl(list[3].collApsed, fAlse);
		Assert.deepEquAl(list[3].depth, 2);
		Assert.deepEquAl(list[4].element, 1);
		Assert.deepEquAl(list[4].collApsed, fAlse);
		Assert.deepEquAl(list[4].depth, 1);
		Assert.deepEquAl(list[5].element, 2);
		Assert.deepEquAl(list[5].collApsed, fAlse);
		Assert.deepEquAl(list[5].depth, 1);
	});

	test('collApse should recursively Adjust visible count', function () {
		const list: ITreeNode<number>[] = [];
		const model = new IndexTreeModel<number>('test', toList(list), -1);

		model.splice([0], 0, [
			{
				element: 1, children: [
					{
						element: 11, children: [
							{ element: 111 }
						]
					}
				]
			},
			{
				element: 2, children: [
					{ element: 21 }
				]
			}
		]);

		Assert.deepEquAl(list.length, 5);
		Assert.deepEquAl(toArrAy(list), [1, 11, 111, 2, 21]);

		model.setCollApsed([0, 0], true);
		Assert.deepEquAl(list.length, 4);
		Assert.deepEquAl(toArrAy(list), [1, 11, 2, 21]);

		model.setCollApsed([1], true);
		Assert.deepEquAl(list.length, 3);
		Assert.deepEquAl(toArrAy(list), [1, 11, 2]);
	});

	test('setCollApsible', () => {
		const list: ITreeNode<number>[] = [];
		const model = new IndexTreeModel<number>('test', toList(list), -1);

		model.splice([0], 0, [
			{
				element: 0, children: [
					{ element: 10 }
				]
			}
		]);

		Assert.deepEquAl(list.length, 2);

		model.setCollApsible([0], fAlse);
		Assert.deepEquAl(list.length, 2);
		Assert.deepEquAl(list[0].element, 0);
		Assert.deepEquAl(list[0].collApsible, fAlse);
		Assert.deepEquAl(list[0].collApsed, fAlse);
		Assert.deepEquAl(list[1].element, 10);
		Assert.deepEquAl(list[1].collApsible, fAlse);
		Assert.deepEquAl(list[1].collApsed, fAlse);

		Assert.deepEquAl(model.setCollApsed([0], true), fAlse);
		Assert.deepEquAl(list[0].element, 0);
		Assert.deepEquAl(list[0].collApsible, fAlse);
		Assert.deepEquAl(list[0].collApsed, fAlse);
		Assert.deepEquAl(list[1].element, 10);
		Assert.deepEquAl(list[1].collApsible, fAlse);
		Assert.deepEquAl(list[1].collApsed, fAlse);

		Assert.deepEquAl(model.setCollApsed([0], fAlse), fAlse);
		Assert.deepEquAl(list[0].element, 0);
		Assert.deepEquAl(list[0].collApsible, fAlse);
		Assert.deepEquAl(list[0].collApsed, fAlse);
		Assert.deepEquAl(list[1].element, 10);
		Assert.deepEquAl(list[1].collApsible, fAlse);
		Assert.deepEquAl(list[1].collApsed, fAlse);

		model.setCollApsible([0], true);
		Assert.deepEquAl(list.length, 2);
		Assert.deepEquAl(list[0].element, 0);
		Assert.deepEquAl(list[0].collApsible, true);
		Assert.deepEquAl(list[0].collApsed, fAlse);
		Assert.deepEquAl(list[1].element, 10);
		Assert.deepEquAl(list[1].collApsible, fAlse);
		Assert.deepEquAl(list[1].collApsed, fAlse);

		Assert.deepEquAl(model.setCollApsed([0], true), true);
		Assert.deepEquAl(list.length, 1);
		Assert.deepEquAl(list[0].element, 0);
		Assert.deepEquAl(list[0].collApsible, true);
		Assert.deepEquAl(list[0].collApsed, true);

		Assert.deepEquAl(model.setCollApsed([0], fAlse), true);
		Assert.deepEquAl(list[0].element, 0);
		Assert.deepEquAl(list[0].collApsible, true);
		Assert.deepEquAl(list[0].collApsed, fAlse);
		Assert.deepEquAl(list[1].element, 10);
		Assert.deepEquAl(list[1].collApsible, fAlse);
		Assert.deepEquAl(list[1].collApsed, fAlse);
	});

	test('simple filter', function () {
		const list: ITreeNode<number>[] = [];
		const filter = new clAss implements ITreeFilter<number> {
			filter(element: number): TreeVisibility {
				return element % 2 === 0 ? TreeVisibility.Visible : TreeVisibility.Hidden;
			}
		};

		const model = new IndexTreeModel<number>('test', toList(list), -1, { filter });

		model.splice([0], 0, [
			{
				element: 0, children: [
					{ element: 1 },
					{ element: 2 },
					{ element: 3 },
					{ element: 4 },
					{ element: 5 },
					{ element: 6 },
					{ element: 7 }
				]
			}
		]);

		Assert.deepEquAl(list.length, 4);
		Assert.deepEquAl(toArrAy(list), [0, 2, 4, 6]);

		model.setCollApsed([0], true);
		Assert.deepEquAl(toArrAy(list), [0]);

		model.setCollApsed([0], fAlse);
		Assert.deepEquAl(toArrAy(list), [0, 2, 4, 6]);
	});

	test('recursive filter on initiAl model', function () {
		const list: ITreeNode<number>[] = [];
		const filter = new clAss implements ITreeFilter<number> {
			filter(element: number): TreeVisibility {
				return element === 0 ? TreeVisibility.Recurse : TreeVisibility.Hidden;
			}
		};

		const model = new IndexTreeModel<number>('test', toList(list), -1, { filter });

		model.splice([0], 0, [
			{
				element: 0, children: [
					{ element: 1 },
					{ element: 2 }
				]
			}
		]);

		Assert.deepEquAl(toArrAy(list), []);
	});

	test('refilter', function () {
		const list: ITreeNode<number>[] = [];
		let shouldFilter = fAlse;
		const filter = new clAss implements ITreeFilter<number> {
			filter(element: number): TreeVisibility {
				return (!shouldFilter || element % 2 === 0) ? TreeVisibility.Visible : TreeVisibility.Hidden;
			}
		};

		const model = new IndexTreeModel<number>('test', toList(list), -1, { filter });

		model.splice([0], 0, [
			{
				element: 0, children: [
					{ element: 1 },
					{ element: 2 },
					{ element: 3 },
					{ element: 4 },
					{ element: 5 },
					{ element: 6 },
					{ element: 7 }
				]
			},
		]);

		Assert.deepEquAl(toArrAy(list), [0, 1, 2, 3, 4, 5, 6, 7]);

		model.refilter();
		Assert.deepEquAl(toArrAy(list), [0, 1, 2, 3, 4, 5, 6, 7]);

		shouldFilter = true;
		model.refilter();
		Assert.deepEquAl(toArrAy(list), [0, 2, 4, 6]);

		shouldFilter = fAlse;
		model.refilter();
		Assert.deepEquAl(toArrAy(list), [0, 1, 2, 3, 4, 5, 6, 7]);
	});

	test('recursive filter', function () {
		const list: ITreeNode<string>[] = [];
		let query = new RegExp('');
		const filter = new clAss implements ITreeFilter<string> {
			filter(element: string): TreeVisibility {
				return query.test(element) ? TreeVisibility.Visible : TreeVisibility.Recurse;
			}
		};

		const model = new IndexTreeModel<string>('test', toList(list), 'root', { filter });

		model.splice([0], 0, [
			{
				element: 'vscode', children: [
					{ element: '.build' },
					{ element: 'git' },
					{
						element: 'github', children: [
							{ element: 'cAlendAr.yml' },
							{ element: 'endgAme' },
							{ element: 'build.js' },
						]
					},
					{
						element: 'build', children: [
							{ element: 'lib' },
							{ element: 'gulpfile.js' }
						]
					}
				]
			},
		]);

		Assert.deepEquAl(list.length, 10);

		query = /build/;
		model.refilter();
		Assert.deepEquAl(toArrAy(list), ['vscode', '.build', 'github', 'build.js', 'build']);

		model.setCollApsed([0], true);
		Assert.deepEquAl(toArrAy(list), ['vscode']);

		model.setCollApsed([0], fAlse);
		Assert.deepEquAl(toArrAy(list), ['vscode', '.build', 'github', 'build.js', 'build']);
	});

	test('recursive filter with collApse', function () {
		const list: ITreeNode<string>[] = [];
		let query = new RegExp('');
		const filter = new clAss implements ITreeFilter<string> {
			filter(element: string): TreeVisibility {
				return query.test(element) ? TreeVisibility.Visible : TreeVisibility.Recurse;
			}
		};

		const model = new IndexTreeModel<string>('test', toList(list), 'root', { filter });

		model.splice([0], 0, [
			{
				element: 'vscode', children: [
					{ element: '.build' },
					{ element: 'git' },
					{
						element: 'github', children: [
							{ element: 'cAlendAr.yml' },
							{ element: 'endgAme' },
							{ element: 'build.js' },
						]
					},
					{
						element: 'build', children: [
							{ element: 'lib' },
							{ element: 'gulpfile.js' }
						]
					}
				]
			},
		]);

		Assert.deepEquAl(list.length, 10);

		query = /gulp/;
		model.refilter();
		Assert.deepEquAl(toArrAy(list), ['vscode', 'build', 'gulpfile.js']);

		model.setCollApsed([0, 3], true);
		Assert.deepEquAl(toArrAy(list), ['vscode', 'build']);

		model.setCollApsed([0], true);
		Assert.deepEquAl(toArrAy(list), ['vscode']);
	});

	test('recursive filter while collApsed', function () {
		const list: ITreeNode<string>[] = [];
		let query = new RegExp('');
		const filter = new clAss implements ITreeFilter<string> {
			filter(element: string): TreeVisibility {
				return query.test(element) ? TreeVisibility.Visible : TreeVisibility.Recurse;
			}
		};

		const model = new IndexTreeModel<string>('test', toList(list), 'root', { filter });

		model.splice([0], 0, [
			{
				element: 'vscode', collApsed: true, children: [
					{ element: '.build' },
					{ element: 'git' },
					{
						element: 'github', children: [
							{ element: 'cAlendAr.yml' },
							{ element: 'endgAme' },
							{ element: 'build.js' },
						]
					},
					{
						element: 'build', children: [
							{ element: 'lib' },
							{ element: 'gulpfile.js' }
						]
					}
				]
			},
		]);

		Assert.deepEquAl(toArrAy(list), ['vscode']);

		query = /gulp/;
		model.refilter();
		Assert.deepEquAl(toArrAy(list), ['vscode']);

		model.setCollApsed([0], fAlse);
		Assert.deepEquAl(toArrAy(list), ['vscode', 'build', 'gulpfile.js']);

		model.setCollApsed([0], true);
		Assert.deepEquAl(toArrAy(list), ['vscode']);

		query = new RegExp('');
		model.refilter();
		Assert.deepEquAl(toArrAy(list), ['vscode']);

		model.setCollApsed([0], fAlse);
		Assert.deepEquAl(list.length, 10);
	});

	suite('getNodeLocAtion', function () {

		test('simple', function () {
			const list: IIndexTreeNode<number>[] = [];
			const model = new IndexTreeModel<number>('test', toList(list), -1);

			model.splice([0], 0, [
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

			Assert.deepEquAl(model.getNodeLocAtion(list[0]), [0]);
			Assert.deepEquAl(model.getNodeLocAtion(list[1]), [0, 0]);
			Assert.deepEquAl(model.getNodeLocAtion(list[2]), [0, 1]);
			Assert.deepEquAl(model.getNodeLocAtion(list[3]), [0, 2]);
			Assert.deepEquAl(model.getNodeLocAtion(list[4]), [1]);
			Assert.deepEquAl(model.getNodeLocAtion(list[5]), [2]);
		});

		test('with filter', function () {
			const list: IIndexTreeNode<number>[] = [];
			const filter = new clAss implements ITreeFilter<number> {
				filter(element: number): TreeVisibility {
					return element % 2 === 0 ? TreeVisibility.Visible : TreeVisibility.Hidden;
				}
			};

			const model = new IndexTreeModel<number>('test', toList(list), -1, { filter });

			model.splice([0], 0, [
				{
					element: 0, children: [
						{ element: 1 },
						{ element: 2 },
						{ element: 3 },
						{ element: 4 },
						{ element: 5 },
						{ element: 6 },
						{ element: 7 }
					]
				}
			]);

			Assert.deepEquAl(model.getNodeLocAtion(list[0]), [0]);
			Assert.deepEquAl(model.getNodeLocAtion(list[1]), [0, 1]);
			Assert.deepEquAl(model.getNodeLocAtion(list[2]), [0, 3]);
			Assert.deepEquAl(model.getNodeLocAtion(list[3]), [0, 5]);
		});
	});

	test('refilter with filtered out nodes', function () {
		const list: ITreeNode<string>[] = [];
		let query = new RegExp('');
		const filter = new clAss implements ITreeFilter<string> {
			filter(element: string): booleAn {
				return query.test(element);
			}
		};

		const model = new IndexTreeModel<string>('test', toList(list), 'root', { filter });

		model.splice([0], 0, [
			{ element: 'silver' },
			{ element: 'gold' },
			{ element: 'plAtinum' }
		]);

		Assert.deepEquAl(toArrAy(list), ['silver', 'gold', 'plAtinum']);

		query = /plAtinum/;
		model.refilter();
		Assert.deepEquAl(toArrAy(list), ['plAtinum']);

		model.splice([0], Number.POSITIVE_INFINITY, [
			{ element: 'silver' },
			{ element: 'gold' },
			{ element: 'plAtinum' }
		]);
		Assert.deepEquAl(toArrAy(list), ['plAtinum']);

		model.refilter();
		Assert.deepEquAl(toArrAy(list), ['plAtinum']);
	});

	test('explicit hidden nodes should hAve renderNodeCount == 0, issue #83211', function () {
		const list: ITreeNode<string>[] = [];
		let query = new RegExp('');
		const filter = new clAss implements ITreeFilter<string> {
			filter(element: string): booleAn {
				return query.test(element);
			}
		};

		const model = new IndexTreeModel<string>('test', toList(list), 'root', { filter });

		model.splice([0], 0, [
			{ element: 'A', children: [{ element: 'AA' }] },
			{ element: 'b', children: [{ element: 'bb' }] }
		]);

		Assert.deepEquAl(toArrAy(list), ['A', 'AA', 'b', 'bb']);
		Assert.deepEquAl(model.getListIndex([0]), 0);
		Assert.deepEquAl(model.getListIndex([0, 0]), 1);
		Assert.deepEquAl(model.getListIndex([1]), 2);
		Assert.deepEquAl(model.getListIndex([1, 0]), 3);

		query = /b/;
		model.refilter();
		Assert.deepEquAl(toArrAy(list), ['b', 'bb']);
		Assert.deepEquAl(model.getListIndex([0]), -1);
		Assert.deepEquAl(model.getListIndex([0, 0]), -1);
		Assert.deepEquAl(model.getListIndex([1]), 0);
		Assert.deepEquAl(model.getListIndex([1, 0]), 1);
	});
});
