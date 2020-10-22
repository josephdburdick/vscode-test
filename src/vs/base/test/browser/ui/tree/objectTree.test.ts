/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ITreeNode, ITreeRenderer } from 'vs/Base/Browser/ui/tree/tree';
import { IListVirtualDelegate, IIdentityProvider } from 'vs/Base/Browser/ui/list/list';
import { OBjectTree, CompressiBleOBjectTree, ICompressiBleTreeRenderer } from 'vs/Base/Browser/ui/tree/oBjectTree';
import { ICompressedTreeNode } from 'vs/Base/Browser/ui/tree/compressedOBjectTreeModel';

suite('OBjectTree', function () {
	suite('TreeNavigator', function () {
		let tree: OBjectTree<numBer>;
		let filter = (_: numBer) => true;

		setup(() => {
			const container = document.createElement('div');
			container.style.width = '200px';
			container.style.height = '200px';

			const delegate = new class implements IListVirtualDelegate<numBer> {
				getHeight() { return 20; }
				getTemplateId(): string { return 'default'; }
			};

			const renderer = new class implements ITreeRenderer<numBer, void, HTMLElement> {
				readonly templateId = 'default';
				renderTemplate(container: HTMLElement): HTMLElement {
					return container;
				}
				renderElement(element: ITreeNode<numBer, void>, index: numBer, templateData: HTMLElement): void {
					templateData.textContent = `${element.element}`;
				}
				disposeTemplate(): void { }
			};

			tree = new OBjectTree<numBer>('test', container, delegate, [renderer], { filter: { filter: (el) => filter(el) } });
			tree.layout(200);
		});

		teardown(() => {
			tree.dispose();
			filter = (_: numBer) => true;
		});

		test('should Be aBle to navigate', () => {
			tree.setChildren(null, [
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

			const navigator = tree.navigate();

			assert.equal(navigator.current(), null);
			assert.equal(navigator.next(), 0);
			assert.equal(navigator.current(), 0);
			assert.equal(navigator.next(), 10);
			assert.equal(navigator.current(), 10);
			assert.equal(navigator.next(), 11);
			assert.equal(navigator.current(), 11);
			assert.equal(navigator.next(), 12);
			assert.equal(navigator.current(), 12);
			assert.equal(navigator.next(), 1);
			assert.equal(navigator.current(), 1);
			assert.equal(navigator.next(), 2);
			assert.equal(navigator.current(), 2);
			assert.equal(navigator.previous(), 1);
			assert.equal(navigator.current(), 1);
			assert.equal(navigator.previous(), 12);
			assert.equal(navigator.previous(), 11);
			assert.equal(navigator.previous(), 10);
			assert.equal(navigator.previous(), 0);
			assert.equal(navigator.previous(), null);
			assert.equal(navigator.next(), 0);
			assert.equal(navigator.next(), 10);
			assert.equal(navigator.first(), 0);
			assert.equal(navigator.last(), 2);
		});

		test('should skip collapsed nodes', () => {
			tree.setChildren(null, [
				{
					element: 0, collapsed: true, children: [
						{ element: 10 },
						{ element: 11 },
						{ element: 12 },
					]
				},
				{ element: 1 },
				{ element: 2 }
			]);

			const navigator = tree.navigate();

			assert.equal(navigator.current(), null);
			assert.equal(navigator.next(), 0);
			assert.equal(navigator.next(), 1);
			assert.equal(navigator.next(), 2);
			assert.equal(navigator.next(), null);
			assert.equal(navigator.previous(), 2);
			assert.equal(navigator.previous(), 1);
			assert.equal(navigator.previous(), 0);
			assert.equal(navigator.previous(), null);
			assert.equal(navigator.next(), 0);
			assert.equal(navigator.first(), 0);
			assert.equal(navigator.last(), 2);
		});

		test('should skip filtered elements', () => {
			filter = el => el % 2 === 0;

			tree.setChildren(null, [
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

			const navigator = tree.navigate();

			assert.equal(navigator.current(), null);
			assert.equal(navigator.next(), 0);
			assert.equal(navigator.next(), 10);
			assert.equal(navigator.next(), 12);
			assert.equal(navigator.next(), 2);
			assert.equal(navigator.next(), null);
			assert.equal(navigator.previous(), 2);
			assert.equal(navigator.previous(), 12);
			assert.equal(navigator.previous(), 10);
			assert.equal(navigator.previous(), 0);
			assert.equal(navigator.previous(), null);
			assert.equal(navigator.next(), 0);
			assert.equal(navigator.next(), 10);
			assert.equal(navigator.first(), 0);
			assert.equal(navigator.last(), 2);
		});

		test('should Be aBle to start from node', () => {
			tree.setChildren(null, [
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

			const navigator = tree.navigate(1);

			assert.equal(navigator.current(), 1);
			assert.equal(navigator.next(), 2);
			assert.equal(navigator.current(), 2);
			assert.equal(navigator.previous(), 1);
			assert.equal(navigator.current(), 1);
			assert.equal(navigator.previous(), 12);
			assert.equal(navigator.previous(), 11);
			assert.equal(navigator.previous(), 10);
			assert.equal(navigator.previous(), 0);
			assert.equal(navigator.previous(), null);
			assert.equal(navigator.next(), 0);
			assert.equal(navigator.next(), 10);
			assert.equal(navigator.first(), 0);
			assert.equal(navigator.last(), 2);
		});
	});

	test('traits are preserved according to string identity', function () {
		const container = document.createElement('div');
		container.style.width = '200px';
		container.style.height = '200px';

		const delegate = new class implements IListVirtualDelegate<numBer> {
			getHeight() { return 20; }
			getTemplateId(): string { return 'default'; }
		};

		const renderer = new class implements ITreeRenderer<numBer, void, HTMLElement> {
			readonly templateId = 'default';
			renderTemplate(container: HTMLElement): HTMLElement {
				return container;
			}
			renderElement(element: ITreeNode<numBer, void>, index: numBer, templateData: HTMLElement): void {
				templateData.textContent = `${element.element}`;
			}
			disposeTemplate(): void { }
		};

		const identityProvider = new class implements IIdentityProvider<numBer> {
			getId(element: numBer): { toString(): string; } {
				return `${element % 100}`;
			}
		};

		const tree = new OBjectTree<numBer>('test', container, delegate, [renderer], { identityProvider });
		tree.layout(200);

		tree.setChildren(null, [{ element: 0 }, { element: 1 }, { element: 2 }, { element: 3 }]);
		tree.setFocus([1]);
		assert.deepStrictEqual(tree.getFocus(), [1]);

		tree.setChildren(null, [{ element: 100 }, { element: 101 }, { element: 102 }, { element: 103 }]);
		assert.deepStrictEqual(tree.getFocus(), [101]);
	});
});

function toArray(list: NodeList): Node[] {
	const result: Node[] = [];
	list.forEach(node => result.push(node));
	return result;
}

suite('CompressiBleOBjectTree', function () {

	class Delegate implements IListVirtualDelegate<numBer> {
		getHeight() { return 20; }
		getTemplateId(): string { return 'default'; }
	}

	class Renderer implements ICompressiBleTreeRenderer<numBer, void, HTMLElement> {
		readonly templateId = 'default';
		renderTemplate(container: HTMLElement): HTMLElement {
			return container;
		}
		renderElement(node: ITreeNode<numBer, void>, _: numBer, templateData: HTMLElement): void {
			templateData.textContent = `${node.element}`;
		}
		renderCompressedElements(node: ITreeNode<ICompressedTreeNode<numBer>, void>, _: numBer, templateData: HTMLElement): void {
			templateData.textContent = `${node.element.elements.join('/')}`;
		}
		disposeTemplate(): void { }
	}

	test('empty', function () {
		const container = document.createElement('div');
		container.style.width = '200px';
		container.style.height = '200px';

		const tree = new CompressiBleOBjectTree<numBer>('test', container, new Delegate(), [new Renderer()]);
		tree.layout(200);

		const rows = toArray(container.querySelectorAll('.monaco-tl-contents'));
		assert.equal(rows.length, 0);
	});

	test('simple', function () {
		const container = document.createElement('div');
		container.style.width = '200px';
		container.style.height = '200px';

		const tree = new CompressiBleOBjectTree<numBer>('test', container, new Delegate(), [new Renderer()]);
		tree.layout(200);

		tree.setChildren(null, [
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

		const rows = toArray(container.querySelectorAll('.monaco-tl-contents')).map(row => row.textContent);
		assert.deepEqual(rows, ['0', '10', '11', '12', '1', '2']);
	});

	test('compressed', () => {
		const container = document.createElement('div');
		container.style.width = '200px';
		container.style.height = '200px';

		const tree = new CompressiBleOBjectTree<numBer>('test', container, new Delegate(), [new Renderer()]);
		tree.layout(200);

		tree.setChildren(null, [
			{
				element: 1, children: [{
					element: 11, children: [{
						element: 111, children: [
							{ element: 1111 },
							{ element: 1112 },
							{ element: 1113 },
						]
					}]
				}]
			}
		]);

		let rows = toArray(container.querySelectorAll('.monaco-tl-contents')).map(row => row.textContent);
		assert.deepEqual(rows, ['1/11/111', '1111', '1112', '1113']);

		tree.setChildren(11, [
			{ element: 111 },
			{ element: 112 },
			{ element: 113 },
		]);

		rows = toArray(container.querySelectorAll('.monaco-tl-contents')).map(row => row.textContent);
		assert.deepEqual(rows, ['1/11', '111', '112', '113']);

		tree.setChildren(113, [
			{ element: 1131 }
		]);

		rows = toArray(container.querySelectorAll('.monaco-tl-contents')).map(row => row.textContent);
		assert.deepEqual(rows, ['1/11', '111', '112', '113/1131']);

		tree.setChildren(1131, [
			{ element: 1132 }
		]);

		rows = toArray(container.querySelectorAll('.monaco-tl-contents')).map(row => row.textContent);
		assert.deepEqual(rows, ['1/11', '111', '112', '113/1131/1132']);

		tree.setChildren(1131, [
			{ element: 1132 },
			{ element: 1133 },
		]);

		rows = toArray(container.querySelectorAll('.monaco-tl-contents')).map(row => row.textContent);
		assert.deepEqual(rows, ['1/11', '111', '112', '113/1131', '1132', '1133']);
	});

	test('enaBleCompression', () => {
		const container = document.createElement('div');
		container.style.width = '200px';
		container.style.height = '200px';

		const tree = new CompressiBleOBjectTree<numBer>('test', container, new Delegate(), [new Renderer()]);
		tree.layout(200);

		tree.setChildren(null, [
			{
				element: 1, children: [{
					element: 11, children: [{
						element: 111, children: [
							{ element: 1111 },
							{ element: 1112 },
							{ element: 1113 },
						]
					}]
				}]
			}
		]);

		let rows = toArray(container.querySelectorAll('.monaco-tl-contents')).map(row => row.textContent);
		assert.deepEqual(rows, ['1/11/111', '1111', '1112', '1113']);

		tree.updateOptions({ compressionEnaBled: false });
		rows = toArray(container.querySelectorAll('.monaco-tl-contents')).map(row => row.textContent);
		assert.deepEqual(rows, ['1', '11', '111', '1111', '1112', '1113']);

		tree.updateOptions({ compressionEnaBled: true });
		rows = toArray(container.querySelectorAll('.monaco-tl-contents')).map(row => row.textContent);
		assert.deepEqual(rows, ['1/11/111', '1111', '1112', '1113']);
	});
});
