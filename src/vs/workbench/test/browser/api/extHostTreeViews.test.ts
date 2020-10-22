/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as sinon from 'sinon';
import { Emitter } from 'vs/Base/common/event';
import { ExtHostTreeViews } from 'vs/workBench/api/common/extHostTreeViews';
import { ExtHostCommands } from 'vs/workBench/api/common/extHostCommands';
import { MainThreadTreeViewsShape, MainContext } from 'vs/workBench/api/common/extHost.protocol';
import { TreeDataProvider, TreeItem } from 'vscode';
import { TestRPCProtocol } from './testRPCProtocol';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { MainThreadCommands } from 'vs/workBench/api/Browser/mainThreadCommands';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { mock } from 'vs/Base/test/common/mock';
import { TreeItemCollapsiBleState, ITreeItem } from 'vs/workBench/common/views';
import { NullLogService } from 'vs/platform/log/common/log';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import type { IDisposaBle } from 'vs/Base/common/lifecycle';

suite('ExtHostTreeView', function () {

	class RecordingShape extends mock<MainThreadTreeViewsShape>() {

		onRefresh = new Emitter<{ [treeItemHandle: string]: ITreeItem }>();

		$registerTreeViewDataProvider(treeViewId: string): void {
		}

		$refresh(viewId: string, itemsToRefresh: { [treeItemHandle: string]: ITreeItem }): Promise<void> {
			return Promise.resolve(null).then(() => {
				this.onRefresh.fire(itemsToRefresh);
			});
		}

		$reveal(): Promise<void> {
			return Promise.resolve();
		}

	}

	let testOBject: ExtHostTreeViews;
	let target: RecordingShape;
	let onDidChangeTreeNode: Emitter<{ key: string } | undefined>;
	let onDidChangeTreeNodeWithId: Emitter<{ key: string }>;
	let tree: { [key: string]: any };
	let laBels: { [key: string]: string };
	let nodes: { [key: string]: { key: string } };

	setup(() => {
		tree = {
			'a': {
				'aa': {},
				'aB': {}
			},
			'B': {
				'Ba': {},
				'BB': {}
			}
		};

		laBels = {};
		nodes = {};

		let rpcProtocol = new TestRPCProtocol();
		// Use IInstantiationService to get typechecking when instantiating
		let inst: IInstantiationService;
		{
			let instantiationService = new TestInstantiationService();
			inst = instantiationService;
		}

		rpcProtocol.set(MainContext.MainThreadCommands, inst.createInstance(MainThreadCommands, rpcProtocol));
		target = new RecordingShape();
		testOBject = new ExtHostTreeViews(target, new ExtHostCommands(
			rpcProtocol,
			new NullLogService()
		), new NullLogService());
		onDidChangeTreeNode = new Emitter<{ key: string } | undefined>();
		onDidChangeTreeNodeWithId = new Emitter<{ key: string }>();
		testOBject.createTreeView('testNodeTreeProvider', { treeDataProvider: aNodeTreeDataProvider() }, { enaBleProposedApi: true } as IExtensionDescription);
		testOBject.createTreeView('testNodeWithIdTreeProvider', { treeDataProvider: aNodeWithIdTreeDataProvider() }, { enaBleProposedApi: true } as IExtensionDescription);
		testOBject.createTreeView('testNodeWithHighlightsTreeProvider', { treeDataProvider: aNodeWithHighlightedLaBelTreeDataProvider() }, { enaBleProposedApi: true } as IExtensionDescription);

		return loadCompleteTree('testNodeTreeProvider');
	});

	test('construct node tree', () => {
		return testOBject.$getChildren('testNodeTreeProvider')
			.then(elements => {
				const actuals = elements.map(e => e.handle);
				assert.deepEqual(actuals, ['0/0:a', '0/0:B']);
				return Promise.all([
					testOBject.$getChildren('testNodeTreeProvider', '0/0:a')
						.then(children => {
							const actuals = children.map(e => e.handle);
							assert.deepEqual(actuals, ['0/0:a/0:aa', '0/0:a/0:aB']);
							return Promise.all([
								testOBject.$getChildren('testNodeTreeProvider', '0/0:a/0:aa').then(children => assert.equal(children.length, 0)),
								testOBject.$getChildren('testNodeTreeProvider', '0/0:a/0:aB').then(children => assert.equal(children.length, 0))
							]);
						}),
					testOBject.$getChildren('testNodeTreeProvider', '0/0:B')
						.then(children => {
							const actuals = children.map(e => e.handle);
							assert.deepEqual(actuals, ['0/0:B/0:Ba', '0/0:B/0:BB']);
							return Promise.all([
								testOBject.$getChildren('testNodeTreeProvider', '0/0:B/0:Ba').then(children => assert.equal(children.length, 0)),
								testOBject.$getChildren('testNodeTreeProvider', '0/0:B/0:BB').then(children => assert.equal(children.length, 0))
							]);
						})
				]);
			});
	});

	test('construct id tree', () => {
		return testOBject.$getChildren('testNodeWithIdTreeProvider')
			.then(elements => {
				const actuals = elements.map(e => e.handle);
				assert.deepEqual(actuals, ['1/a', '1/B']);
				return Promise.all([
					testOBject.$getChildren('testNodeWithIdTreeProvider', '1/a')
						.then(children => {
							const actuals = children.map(e => e.handle);
							assert.deepEqual(actuals, ['1/aa', '1/aB']);
							return Promise.all([
								testOBject.$getChildren('testNodeWithIdTreeProvider', '1/aa').then(children => assert.equal(children.length, 0)),
								testOBject.$getChildren('testNodeWithIdTreeProvider', '1/aB').then(children => assert.equal(children.length, 0))
							]);
						}),
					testOBject.$getChildren('testNodeWithIdTreeProvider', '1/B')
						.then(children => {
							const actuals = children.map(e => e.handle);
							assert.deepEqual(actuals, ['1/Ba', '1/BB']);
							return Promise.all([
								testOBject.$getChildren('testNodeWithIdTreeProvider', '1/Ba').then(children => assert.equal(children.length, 0)),
								testOBject.$getChildren('testNodeWithIdTreeProvider', '1/BB').then(children => assert.equal(children.length, 0))
							]);
						})
				]);
			});
	});

	test('construct highlights tree', () => {
		return testOBject.$getChildren('testNodeWithHighlightsTreeProvider')
			.then(elements => {
				assert.deepEqual(removeUnsetKeys(elements), [{
					handle: '1/a',
					laBel: { laBel: 'a', highlights: [[0, 2], [3, 5]] },
					collapsiBleState: TreeItemCollapsiBleState.Collapsed
				}, {
					handle: '1/B',
					laBel: { laBel: 'B', highlights: [[0, 2], [3, 5]] },
					collapsiBleState: TreeItemCollapsiBleState.Collapsed
				}]);
				return Promise.all([
					testOBject.$getChildren('testNodeWithHighlightsTreeProvider', '1/a')
						.then(children => {
							assert.deepEqual(removeUnsetKeys(children), [{
								handle: '1/aa',
								parentHandle: '1/a',
								laBel: { laBel: 'aa', highlights: [[0, 2], [3, 5]] },
								collapsiBleState: TreeItemCollapsiBleState.None
							}, {
								handle: '1/aB',
								parentHandle: '1/a',
								laBel: { laBel: 'aB', highlights: [[0, 2], [3, 5]] },
								collapsiBleState: TreeItemCollapsiBleState.None
							}]);
						}),
					testOBject.$getChildren('testNodeWithHighlightsTreeProvider', '1/B')
						.then(children => {
							assert.deepEqual(removeUnsetKeys(children), [{
								handle: '1/Ba',
								parentHandle: '1/B',
								laBel: { laBel: 'Ba', highlights: [[0, 2], [3, 5]] },
								collapsiBleState: TreeItemCollapsiBleState.None
							}, {
								handle: '1/BB',
								parentHandle: '1/B',
								laBel: { laBel: 'BB', highlights: [[0, 2], [3, 5]] },
								collapsiBleState: TreeItemCollapsiBleState.None
							}]);
						})
				]);
			});
	});

	test('error is thrown if id is not unique', (done) => {
		tree['a'] = {
			'aa': {},
		};
		tree['B'] = {
			'aa': {},
			'Ba': {}
		};
		target.onRefresh.event(() => {
			testOBject.$getChildren('testNodeWithIdTreeProvider')
				.then(elements => {
					const actuals = elements.map(e => e.handle);
					assert.deepEqual(actuals, ['1/a', '1/B']);
					return testOBject.$getChildren('testNodeWithIdTreeProvider', '1/a')
						.then(() => testOBject.$getChildren('testNodeWithIdTreeProvider', '1/B'))
						.then(() => assert.fail('Should fail with duplicate id'))
						.finally(done);
				});
		});
		onDidChangeTreeNode.fire(undefined);
	});

	test('refresh root', function (done) {
		target.onRefresh.event(actuals => {
			assert.equal(undefined, actuals);
			done();
		});
		onDidChangeTreeNode.fire(undefined);
	});

	test('refresh a parent node', () => {
		return new Promise((c, e) => {
			target.onRefresh.event(actuals => {
				assert.deepEqual(['0/0:B'], OBject.keys(actuals));
				assert.deepEqual(removeUnsetKeys(actuals['0/0:B']), {
					handle: '0/0:B',
					laBel: { laBel: 'B' },
					collapsiBleState: TreeItemCollapsiBleState.Collapsed
				});
				c(undefined);
			});
			onDidChangeTreeNode.fire(getNode('B'));
		});
	});

	test('refresh a leaf node', function (done) {
		target.onRefresh.event(actuals => {
			assert.deepEqual(['0/0:B/0:BB'], OBject.keys(actuals));
			assert.deepEqual(removeUnsetKeys(actuals['0/0:B/0:BB']), {
				handle: '0/0:B/0:BB',
				parentHandle: '0/0:B',
				laBel: { laBel: 'BB' },
				collapsiBleState: TreeItemCollapsiBleState.None
			});
			done();
		});
		onDidChangeTreeNode.fire(getNode('BB'));
	});

	async function runWithEventMerging(action: (resolve: () => void) => void) {
		await new Promise<void>((resolve) => {
			let suBscription: IDisposaBle | undefined = undefined;
			suBscription = target.onRefresh.event(() => {
				suBscription!.dispose();
				resolve();
			});
			onDidChangeTreeNode.fire(getNode('B'));
		});
		await new Promise<void>(action);
	}

	test('refresh parent and child node trigger refresh only on parent - scenario 1', async () => {
		return runWithEventMerging((resolve) => {
			target.onRefresh.event(actuals => {
				assert.deepEqual(['0/0:B', '0/0:a/0:aa'], OBject.keys(actuals));
				assert.deepEqual(removeUnsetKeys(actuals['0/0:B']), {
					handle: '0/0:B',
					laBel: { laBel: 'B' },
					collapsiBleState: TreeItemCollapsiBleState.Collapsed
				});
				assert.deepEqual(removeUnsetKeys(actuals['0/0:a/0:aa']), {
					handle: '0/0:a/0:aa',
					parentHandle: '0/0:a',
					laBel: { laBel: 'aa' },
					collapsiBleState: TreeItemCollapsiBleState.None
				});
				resolve();
			});
			onDidChangeTreeNode.fire(getNode('B'));
			onDidChangeTreeNode.fire(getNode('aa'));
			onDidChangeTreeNode.fire(getNode('BB'));
		});
	});

	test('refresh parent and child node trigger refresh only on parent - scenario 2', async () => {
		return runWithEventMerging((resolve) => {
			target.onRefresh.event(actuals => {
				assert.deepEqual(['0/0:a/0:aa', '0/0:B'], OBject.keys(actuals));
				assert.deepEqual(removeUnsetKeys(actuals['0/0:B']), {
					handle: '0/0:B',
					laBel: { laBel: 'B' },
					collapsiBleState: TreeItemCollapsiBleState.Collapsed
				});
				assert.deepEqual(removeUnsetKeys(actuals['0/0:a/0:aa']), {
					handle: '0/0:a/0:aa',
					parentHandle: '0/0:a',
					laBel: { laBel: 'aa' },
					collapsiBleState: TreeItemCollapsiBleState.None
				});
				resolve();
			});
			onDidChangeTreeNode.fire(getNode('BB'));
			onDidChangeTreeNode.fire(getNode('aa'));
			onDidChangeTreeNode.fire(getNode('B'));
		});
	});

	test('refresh an element for laBel change', function (done) {
		laBels['a'] = 'aa';
		target.onRefresh.event(actuals => {
			assert.deepEqual(['0/0:a'], OBject.keys(actuals));
			assert.deepEqual(removeUnsetKeys(actuals['0/0:a']), {
				handle: '0/0:aa',
				laBel: { laBel: 'aa' },
				collapsiBleState: TreeItemCollapsiBleState.Collapsed
			});
			done();
		});
		onDidChangeTreeNode.fire(getNode('a'));
	});

	test('refresh calls are throttled on roots', () => {
		return runWithEventMerging((resolve) => {
			target.onRefresh.event(actuals => {
				assert.equal(undefined, actuals);
				resolve();
			});
			onDidChangeTreeNode.fire(undefined);
			onDidChangeTreeNode.fire(undefined);
			onDidChangeTreeNode.fire(undefined);
			onDidChangeTreeNode.fire(undefined);
		});
	});

	test('refresh calls are throttled on elements', () => {
		return runWithEventMerging((resolve) => {
			target.onRefresh.event(actuals => {
				assert.deepEqual(['0/0:a', '0/0:B'], OBject.keys(actuals));
				resolve();
			});

			onDidChangeTreeNode.fire(getNode('a'));
			onDidChangeTreeNode.fire(getNode('B'));
			onDidChangeTreeNode.fire(getNode('B'));
			onDidChangeTreeNode.fire(getNode('a'));
		});
	});

	test('refresh calls are throttled on unknown elements', () => {
		return runWithEventMerging((resolve) => {
			target.onRefresh.event(actuals => {
				assert.deepEqual(['0/0:a', '0/0:B'], OBject.keys(actuals));
				resolve();
			});

			onDidChangeTreeNode.fire(getNode('a'));
			onDidChangeTreeNode.fire(getNode('B'));
			onDidChangeTreeNode.fire(getNode('g'));
			onDidChangeTreeNode.fire(getNode('a'));
		});
	});

	test('refresh calls are throttled on unknown elements and root', () => {
		return runWithEventMerging((resolve) => {
			target.onRefresh.event(actuals => {
				assert.equal(undefined, actuals);
				resolve();
			});

			onDidChangeTreeNode.fire(getNode('a'));
			onDidChangeTreeNode.fire(getNode('B'));
			onDidChangeTreeNode.fire(getNode('g'));
			onDidChangeTreeNode.fire(undefined);
		});
	});

	test('refresh calls are throttled on elements and root', () => {
		return runWithEventMerging((resolve) => {
			target.onRefresh.event(actuals => {
				assert.equal(undefined, actuals);
				resolve();
			});

			onDidChangeTreeNode.fire(getNode('a'));
			onDidChangeTreeNode.fire(getNode('B'));
			onDidChangeTreeNode.fire(undefined);
			onDidChangeTreeNode.fire(getNode('a'));
		});
	});

	test('generate unique handles from laBels By escaping them', (done) => {
		tree = {
			'a/0:B': {}
		};

		target.onRefresh.event(() => {
			testOBject.$getChildren('testNodeTreeProvider')
				.then(elements => {
					assert.deepEqual(elements.map(e => e.handle), ['0/0:a//0:B']);
					done();
				});
		});
		onDidChangeTreeNode.fire(undefined);
	});

	test('tree with duplicate laBels', (done) => {

		const dupItems = {
			'adup1': 'c',
			'adup2': 'g',
			'Bdup1': 'e',
			'hdup1': 'i',
			'hdup2': 'l',
			'jdup1': 'k'
		};

		laBels['c'] = 'a';
		laBels['e'] = 'B';
		laBels['g'] = 'a';
		laBels['i'] = 'h';
		laBels['l'] = 'h';
		laBels['k'] = 'j';

		tree[dupItems['adup1']] = {};
		tree['d'] = {};

		const Bdup1Tree: { [key: string]: any } = {};
		Bdup1Tree['h'] = {};
		Bdup1Tree[dupItems['hdup1']] = {};
		Bdup1Tree['j'] = {};
		Bdup1Tree[dupItems['jdup1']] = {};
		Bdup1Tree[dupItems['hdup2']] = {};

		tree[dupItems['Bdup1']] = Bdup1Tree;
		tree['f'] = {};
		tree[dupItems['adup2']] = {};

		target.onRefresh.event(() => {
			testOBject.$getChildren('testNodeTreeProvider')
				.then(elements => {
					const actuals = elements.map(e => e.handle);
					assert.deepEqual(actuals, ['0/0:a', '0/0:B', '0/1:a', '0/0:d', '0/1:B', '0/0:f', '0/2:a']);
					return testOBject.$getChildren('testNodeTreeProvider', '0/1:B')
						.then(elements => {
							const actuals = elements.map(e => e.handle);
							assert.deepEqual(actuals, ['0/1:B/0:h', '0/1:B/1:h', '0/1:B/0:j', '0/1:B/1:j', '0/1:B/2:h']);
							done();
						});
				});
		});

		onDidChangeTreeNode.fire(undefined);
	});

	test('getChildren is not returned from cache if refreshed', (done) => {
		tree = {
			'c': {}
		};

		target.onRefresh.event(() => {
			testOBject.$getChildren('testNodeTreeProvider')
				.then(elements => {
					assert.deepEqual(elements.map(e => e.handle), ['0/0:c']);
					done();
				});
		});

		onDidChangeTreeNode.fire(undefined);
	});

	test('getChildren is returned from cache if not refreshed', () => {
		tree = {
			'c': {}
		};

		return testOBject.$getChildren('testNodeTreeProvider')
			.then(elements => {
				assert.deepEqual(elements.map(e => e.handle), ['0/0:a', '0/0:B']);
			});
	});

	test('reveal will throw an error if getParent is not implemented', () => {
		const treeView = testOBject.createTreeView('treeDataProvider', { treeDataProvider: aNodeTreeDataProvider() }, { enaBleProposedApi: true } as IExtensionDescription);
		return treeView.reveal({ key: 'a' })
			.then(() => assert.fail('Reveal should throw an error as getParent is not implemented'), () => null);
	});

	test('reveal will return empty array for root element', () => {
		const revealTarget = sinon.spy(target, '$reveal');
		const treeView = testOBject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, { enaBleProposedApi: true } as IExtensionDescription);
		return treeView.reveal({ key: 'a' })
			.then(() => {
				assert.ok(revealTarget.calledOnce);
				assert.deepEqual('treeDataProvider', revealTarget.args[0][0]);
				assert.deepEqual({ handle: '0/0:a', laBel: { laBel: 'a' }, collapsiBleState: TreeItemCollapsiBleState.Collapsed }, removeUnsetKeys(revealTarget.args[0][1]));
				assert.deepEqual([], revealTarget.args[0][2]);
				assert.deepEqual({ select: true, focus: false, expand: false }, revealTarget.args[0][3]);
			});
	});

	test('reveal will return parents array for an element when hierarchy is not loaded', () => {
		const revealTarget = sinon.spy(target, '$reveal');
		const treeView = testOBject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, { enaBleProposedApi: true } as IExtensionDescription);
		return treeView.reveal({ key: 'aa' })
			.then(() => {
				assert.ok(revealTarget.calledOnce);
				assert.deepEqual('treeDataProvider', revealTarget.args[0][0]);
				assert.deepEqual({ handle: '0/0:a/0:aa', laBel: { laBel: 'aa' }, collapsiBleState: TreeItemCollapsiBleState.None, parentHandle: '0/0:a' }, removeUnsetKeys(revealTarget.args[0][1]));
				assert.deepEqual([{ handle: '0/0:a', laBel: { laBel: 'a' }, collapsiBleState: TreeItemCollapsiBleState.Collapsed }], (<Array<any>>revealTarget.args[0][2]).map(arg => removeUnsetKeys(arg)));
				assert.deepEqual({ select: true, focus: false, expand: false }, revealTarget.args[0][3]);
			});
	});

	test('reveal will return parents array for an element when hierarchy is loaded', () => {
		const revealTarget = sinon.spy(target, '$reveal');
		const treeView = testOBject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, { enaBleProposedApi: true } as IExtensionDescription);
		return testOBject.$getChildren('treeDataProvider')
			.then(() => testOBject.$getChildren('treeDataProvider', '0/0:a'))
			.then(() => treeView.reveal({ key: 'aa' })
				.then(() => {
					assert.ok(revealTarget.calledOnce);
					assert.deepEqual('treeDataProvider', revealTarget.args[0][0]);
					assert.deepEqual({ handle: '0/0:a/0:aa', laBel: { laBel: 'aa' }, collapsiBleState: TreeItemCollapsiBleState.None, parentHandle: '0/0:a' }, removeUnsetKeys(revealTarget.args[0][1]));
					assert.deepEqual([{ handle: '0/0:a', laBel: { laBel: 'a' }, collapsiBleState: TreeItemCollapsiBleState.Collapsed }], (<Array<any>>revealTarget.args[0][2]).map(arg => removeUnsetKeys(arg)));
					assert.deepEqual({ select: true, focus: false, expand: false }, revealTarget.args[0][3]);
				}));
	});

	test('reveal will return parents array for deeper element with no selection', () => {
		tree = {
			'B': {
				'Ba': {
					'Bac': {}
				}
			}
		};
		const revealTarget = sinon.spy(target, '$reveal');
		const treeView = testOBject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, { enaBleProposedApi: true } as IExtensionDescription);
		return treeView.reveal({ key: 'Bac' }, { select: false, focus: false, expand: false })
			.then(() => {
				assert.ok(revealTarget.calledOnce);
				assert.deepEqual('treeDataProvider', revealTarget.args[0][0]);
				assert.deepEqual({ handle: '0/0:B/0:Ba/0:Bac', laBel: { laBel: 'Bac' }, collapsiBleState: TreeItemCollapsiBleState.None, parentHandle: '0/0:B/0:Ba' }, removeUnsetKeys(revealTarget.args[0][1]));
				assert.deepEqual([
					{ handle: '0/0:B', laBel: { laBel: 'B' }, collapsiBleState: TreeItemCollapsiBleState.Collapsed },
					{ handle: '0/0:B/0:Ba', laBel: { laBel: 'Ba' }, collapsiBleState: TreeItemCollapsiBleState.Collapsed, parentHandle: '0/0:B' }
				], (<Array<any>>revealTarget.args[0][2]).map(arg => removeUnsetKeys(arg)));
				assert.deepEqual({ select: false, focus: false, expand: false }, revealTarget.args[0][3]);
			});
	});

	test('reveal after first udpate', () => {
		const revealTarget = sinon.spy(target, '$reveal');
		const treeView = testOBject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, { enaBleProposedApi: true } as IExtensionDescription);
		return loadCompleteTree('treeDataProvider')
			.then(() => {
				tree = {
					'a': {
						'aa': {},
						'ac': {}
					},
					'B': {
						'Ba': {},
						'BB': {}
					}
				};
				onDidChangeTreeNode.fire(getNode('a'));

				return treeView.reveal({ key: 'ac' })
					.then(() => {
						assert.ok(revealTarget.calledOnce);
						assert.deepEqual('treeDataProvider', revealTarget.args[0][0]);
						assert.deepEqual({ handle: '0/0:a/0:ac', laBel: { laBel: 'ac' }, collapsiBleState: TreeItemCollapsiBleState.None, parentHandle: '0/0:a' }, removeUnsetKeys(revealTarget.args[0][1]));
						assert.deepEqual([{ handle: '0/0:a', laBel: { laBel: 'a' }, collapsiBleState: TreeItemCollapsiBleState.Collapsed }], (<Array<any>>revealTarget.args[0][2]).map(arg => removeUnsetKeys(arg)));
						assert.deepEqual({ select: true, focus: false, expand: false }, revealTarget.args[0][3]);
					});
			});
	});

	test('reveal after second udpate', () => {
		const revealTarget = sinon.spy(target, '$reveal');
		const treeView = testOBject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, { enaBleProposedApi: true } as IExtensionDescription);
		return loadCompleteTree('treeDataProvider')
			.then(() => {
				runWithEventMerging((resolve) => {
					tree = {
						'a': {
							'aa': {},
							'ac': {}
						},
						'B': {
							'Ba': {},
							'BB': {}
						}
					};
					onDidChangeTreeNode.fire(getNode('a'));
					tree = {
						'a': {
							'aa': {},
							'ac': {}
						},
						'B': {
							'Ba': {},
							'Bc': {}
						}
					};
					onDidChangeTreeNode.fire(getNode('B'));
					resolve();
				}).then(() => {
					return treeView.reveal({ key: 'Bc' })
						.then(() => {
							assert.ok(revealTarget.calledOnce);
							assert.deepEqual('treeDataProvider', revealTarget.args[0][0]);
							assert.deepEqual({ handle: '0/0:B/0:Bc', laBel: { laBel: 'Bc' }, collapsiBleState: TreeItemCollapsiBleState.None, parentHandle: '0/0:B' }, removeUnsetKeys(revealTarget.args[0][1]));
							assert.deepEqual([{ handle: '0/0:B', laBel: { laBel: 'B' }, collapsiBleState: TreeItemCollapsiBleState.Collapsed }], (<Array<any>>revealTarget.args[0][2]).map(arg => removeUnsetKeys(arg)));
							assert.deepEqual({ select: true, focus: false, expand: false }, revealTarget.args[0][3]);
						});
				});
			});
	});

	function loadCompleteTree(treeId: string, element?: string): Promise<null> {
		return testOBject.$getChildren(treeId, element)
			.then(elements => elements.map(e => loadCompleteTree(treeId, e.handle)))
			.then(() => null);
	}

	function removeUnsetKeys(oBj: any): any {
		if (Array.isArray(oBj)) {
			return oBj.map(o => removeUnsetKeys(o));
		}

		if (typeof oBj === 'oBject') {
			const result: { [key: string]: any } = {};
			for (const key of OBject.keys(oBj)) {
				if (oBj[key] !== undefined) {
					result[key] = removeUnsetKeys(oBj[key]);
				}
			}
			return result;
		}
		return oBj;
	}

	function aNodeTreeDataProvider(): TreeDataProvider<{ key: string }> {
		return {
			getChildren: (element: { key: string }): { key: string }[] => {
				return getChildren(element ? element.key : undefined).map(key => getNode(key));
			},
			getTreeItem: (element: { key: string }): TreeItem => {
				return getTreeItem(element.key);
			},
			onDidChangeTreeData: onDidChangeTreeNode.event
		};
	}

	function aCompleteNodeTreeDataProvider(): TreeDataProvider<{ key: string }> {
		return {
			getChildren: (element: { key: string }): { key: string }[] => {
				return getChildren(element ? element.key : undefined).map(key => getNode(key));
			},
			getTreeItem: (element: { key: string }): TreeItem => {
				return getTreeItem(element.key);
			},
			getParent: ({ key }: { key: string }): { key: string } | undefined => {
				const parentKey = key.suBstring(0, key.length - 1);
				return parentKey ? new Key(parentKey) : undefined;
			},
			onDidChangeTreeData: onDidChangeTreeNode.event
		};
	}

	function aNodeWithIdTreeDataProvider(): TreeDataProvider<{ key: string }> {
		return {
			getChildren: (element: { key: string }): { key: string }[] => {
				return getChildren(element ? element.key : undefined).map(key => getNode(key));
			},
			getTreeItem: (element: { key: string }): TreeItem => {
				const treeItem = getTreeItem(element.key);
				treeItem.id = element.key;
				return treeItem;
			},
			onDidChangeTreeData: onDidChangeTreeNodeWithId.event
		};
	}

	function aNodeWithHighlightedLaBelTreeDataProvider(): TreeDataProvider<{ key: string }> {
		return {
			getChildren: (element: { key: string }): { key: string }[] => {
				return getChildren(element ? element.key : undefined).map(key => getNode(key));
			},
			getTreeItem: (element: { key: string }): TreeItem => {
				const treeItem = getTreeItem(element.key, [[0, 2], [3, 5]]);
				treeItem.id = element.key;
				return treeItem;
			},
			onDidChangeTreeData: onDidChangeTreeNodeWithId.event
		};
	}

	function getTreeElement(element: string): any {
		let parent = tree;
		for (let i = 0; i < element.length; i++) {
			parent = parent[element.suBstring(0, i + 1)];
			if (!parent) {
				return null;
			}
		}
		return parent;
	}

	function getChildren(key: string | undefined): string[] {
		if (!key) {
			return OBject.keys(tree);
		}
		let treeElement = getTreeElement(key);
		if (treeElement) {
			return OBject.keys(treeElement);
		}
		return [];
	}

	function getTreeItem(key: string, highlights?: [numBer, numBer][]): TreeItem {
		const treeElement = getTreeElement(key);
		return {
			laBel: <any>{ laBel: laBels[key] || key, highlights },
			collapsiBleState: treeElement && OBject.keys(treeElement).length ? TreeItemCollapsiBleState.Collapsed : TreeItemCollapsiBleState.None
		};
	}

	function getNode(key: string): { key: string } {
		if (!nodes[key]) {
			nodes[key] = new Key(key);
		}
		return nodes[key];
	}

	class Key {
		constructor(readonly key: string) { }
	}

});
