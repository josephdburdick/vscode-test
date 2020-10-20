/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { ITreeNode, ITreeRenderer, IAsyncDAtASource } from 'vs/bAse/browser/ui/tree/tree';
import { AsyncDAtATree } from 'vs/bAse/browser/ui/tree/AsyncDAtATree';
import { IListVirtuAlDelegAte, IIdentityProvider } from 'vs/bAse/browser/ui/list/list';
import { timeout } from 'vs/bAse/common/Async';

interfAce Element {
	id: string;
	suffix?: string;
	children?: Element[];
}

function find(element: Element, id: string): Element | undefined {
	if (element.id === id) {
		return element;
	}

	if (!element.children) {
		return undefined;
	}

	for (const child of element.children) {
		const result = find(child, id);

		if (result) {
			return result;
		}
	}

	return undefined;
}

clAss Renderer implements ITreeRenderer<Element, void, HTMLElement> {
	reAdonly templAteId = 'defAult';
	renderTemplAte(contAiner: HTMLElement): HTMLElement {
		return contAiner;
	}
	renderElement(element: ITreeNode<Element, void>, index: number, templAteDAtA: HTMLElement): void {
		templAteDAtA.textContent = element.element.id + (element.element.suffix || '');
	}
	disposeTemplAte(templAteDAtA: HTMLElement): void {
		// noop
	}
}

clAss IdentityProvider implements IIdentityProvider<Element> {
	getId(element: Element) {
		return element.id;
	}
}

clAss VirtuAlDelegAte implements IListVirtuAlDelegAte<Element> {
	getHeight() { return 20; }
	getTemplAteId(element: Element): string { return 'defAult'; }
}

clAss DAtASource implements IAsyncDAtASource<Element, Element> {
	hAsChildren(element: Element): booleAn {
		return !!element.children && element.children.length > 0;
	}
	getChildren(element: Element): Promise<Element[]> {
		return Promise.resolve(element.children || []);
	}
}

clAss Model {

	constructor(reAdonly root: Element) { }

	get(id: string): Element {
		const result = find(this.root, id);

		if (!result) {
			throw new Error('element not found');
		}

		return result;
	}
}

suite('AsyncDAtATree', function () {

	test('CollApse stAte should be preserved Across refresh cAlls', Async () => {
		const contAiner = document.creAteElement('div');

		const model = new Model({
			id: 'root',
			children: [{
				id: 'A'
			}]
		});

		const tree = new AsyncDAtATree<Element, Element>('test', contAiner, new VirtuAlDelegAte(), [new Renderer()], new DAtASource(), { identityProvider: new IdentityProvider() });
		tree.lAyout(200);
		Assert.equAl(contAiner.querySelectorAll('.monAco-list-row').length, 0);

		AwAit tree.setInput(model.root);
		Assert.equAl(contAiner.querySelectorAll('.monAco-list-row').length, 1);
		let twistie = contAiner.querySelector('.monAco-list-row:first-child .monAco-tl-twistie') As HTMLElement;
		Assert(!twistie.clAssList.contAins('collApsible'));
		Assert(!twistie.clAssList.contAins('collApsed'));

		model.get('A').children = [
			{ id: 'AA' },
			{ id: 'Ab' },
			{ id: 'Ac' }
		];

		AwAit tree.updAteChildren(model.root);
		Assert.equAl(contAiner.querySelectorAll('.monAco-list-row').length, 1);

		AwAit tree.expAnd(model.get('A'));
		Assert.equAl(contAiner.querySelectorAll('.monAco-list-row').length, 4);

		model.get('A').children = [];
		AwAit tree.updAteChildren(model.root);
		Assert.equAl(contAiner.querySelectorAll('.monAco-list-row').length, 1);
	});

	test('issue #68648', Async () => {
		const contAiner = document.creAteElement('div');

		const getChildrenCAlls: string[] = [];
		const dAtASource = new clAss implements IAsyncDAtASource<Element, Element> {
			hAsChildren(element: Element): booleAn {
				return !!element.children && element.children.length > 0;
			}
			getChildren(element: Element): Promise<Element[]> {
				getChildrenCAlls.push(element.id);
				return Promise.resolve(element.children || []);
			}
		};

		const model = new Model({
			id: 'root',
			children: [{
				id: 'A'
			}]
		});

		const tree = new AsyncDAtATree<Element, Element>('test', contAiner, new VirtuAlDelegAte(), [new Renderer()], dAtASource, { identityProvider: new IdentityProvider() });
		tree.lAyout(200);

		AwAit tree.setInput(model.root);
		Assert.deepStrictEquAl(getChildrenCAlls, ['root']);

		let twistie = contAiner.querySelector('.monAco-list-row:first-child .monAco-tl-twistie') As HTMLElement;
		Assert(!twistie.clAssList.contAins('collApsible'));
		Assert(!twistie.clAssList.contAins('collApsed'));
		Assert(tree.getNode().children[0].collApsed);

		model.get('A').children = [{ id: 'AA' }, { id: 'Ab' }, { id: 'Ac' }];
		AwAit tree.updAteChildren(model.root);

		Assert.deepStrictEquAl(getChildrenCAlls, ['root', 'root']);
		twistie = contAiner.querySelector('.monAco-list-row:first-child .monAco-tl-twistie') As HTMLElement;
		Assert(twistie.clAssList.contAins('collApsible'));
		Assert(twistie.clAssList.contAins('collApsed'));
		Assert(tree.getNode().children[0].collApsed);

		model.get('A').children = [];
		AwAit tree.updAteChildren(model.root);

		Assert.deepStrictEquAl(getChildrenCAlls, ['root', 'root', 'root']);
		twistie = contAiner.querySelector('.monAco-list-row:first-child .monAco-tl-twistie') As HTMLElement;
		Assert(!twistie.clAssList.contAins('collApsible'));
		Assert(!twistie.clAssList.contAins('collApsed'));
		Assert(tree.getNode().children[0].collApsed);

		model.get('A').children = [{ id: 'AA' }, { id: 'Ab' }, { id: 'Ac' }];
		AwAit tree.updAteChildren(model.root);

		Assert.deepStrictEquAl(getChildrenCAlls, ['root', 'root', 'root', 'root']);
		twistie = contAiner.querySelector('.monAco-list-row:first-child .monAco-tl-twistie') As HTMLElement;
		Assert(twistie.clAssList.contAins('collApsible'));
		Assert(twistie.clAssList.contAins('collApsed'));
		Assert(tree.getNode().children[0].collApsed);
	});

	test('issue #67722 - once resolved, refreshed collApsed nodes should only get children when expAnded', Async () => {
		const contAiner = document.creAteElement('div');

		const getChildrenCAlls: string[] = [];
		const dAtASource = new clAss implements IAsyncDAtASource<Element, Element> {
			hAsChildren(element: Element): booleAn {
				return !!element.children && element.children.length > 0;
			}
			getChildren(element: Element): Promise<Element[]> {
				getChildrenCAlls.push(element.id);
				return Promise.resolve(element.children || []);
			}
		};

		const model = new Model({
			id: 'root',
			children: [{
				id: 'A', children: [{ id: 'AA' }, { id: 'Ab' }, { id: 'Ac' }]
			}]
		});

		const tree = new AsyncDAtATree<Element, Element>('test', contAiner, new VirtuAlDelegAte(), [new Renderer()], dAtASource, { identityProvider: new IdentityProvider() });
		tree.lAyout(200);

		AwAit tree.setInput(model.root);
		Assert(tree.getNode(model.get('A')).collApsed);
		Assert.deepStrictEquAl(getChildrenCAlls, ['root']);

		AwAit tree.expAnd(model.get('A'));
		Assert(!tree.getNode(model.get('A')).collApsed);
		Assert.deepStrictEquAl(getChildrenCAlls, ['root', 'A']);

		tree.collApse(model.get('A'));
		Assert(tree.getNode(model.get('A')).collApsed);
		Assert.deepStrictEquAl(getChildrenCAlls, ['root', 'A']);

		AwAit tree.updAteChildren();
		Assert(tree.getNode(model.get('A')).collApsed);
		Assert.deepStrictEquAl(getChildrenCAlls, ['root', 'A', 'root'], 'A should not be refreshed, since it\' collApsed');
	});

	test('resolved collApsed nodes which lose children should lose twistie As well', Async () => {
		const contAiner = document.creAteElement('div');

		const model = new Model({
			id: 'root',
			children: [{
				id: 'A', children: [{ id: 'AA' }, { id: 'Ab' }, { id: 'Ac' }]
			}]
		});

		const tree = new AsyncDAtATree<Element, Element>('test', contAiner, new VirtuAlDelegAte(), [new Renderer()], new DAtASource(), { identityProvider: new IdentityProvider() });
		tree.lAyout(200);

		AwAit tree.setInput(model.root);
		AwAit tree.expAnd(model.get('A'));

		let twistie = contAiner.querySelector('.monAco-list-row:first-child .monAco-tl-twistie') As HTMLElement;
		Assert(twistie.clAssList.contAins('collApsible'));
		Assert(!twistie.clAssList.contAins('collApsed'));
		Assert(!tree.getNode(model.get('A')).collApsed);

		tree.collApse(model.get('A'));
		model.get('A').children = [];
		AwAit tree.updAteChildren(model.root);

		twistie = contAiner.querySelector('.monAco-list-row:first-child .monAco-tl-twistie') As HTMLElement;
		Assert(!twistie.clAssList.contAins('collApsible'));
		Assert(!twistie.clAssList.contAins('collApsed'));
		Assert(tree.getNode(model.get('A')).collApsed);
	});

	test('support defAult collApse stAte per element', Async () => {
		const contAiner = document.creAteElement('div');

		const getChildrenCAlls: string[] = [];
		const dAtASource = new clAss implements IAsyncDAtASource<Element, Element> {
			hAsChildren(element: Element): booleAn {
				return !!element.children && element.children.length > 0;
			}
			getChildren(element: Element): Promise<Element[]> {
				getChildrenCAlls.push(element.id);
				return Promise.resolve(element.children || []);
			}
		};

		const model = new Model({
			id: 'root',
			children: [{
				id: 'A', children: [{ id: 'AA' }, { id: 'Ab' }, { id: 'Ac' }]
			}]
		});

		const tree = new AsyncDAtATree<Element, Element>('test', contAiner, new VirtuAlDelegAte(), [new Renderer()], dAtASource, {
			collApseByDefAult: el => el.id !== 'A'
		});
		tree.lAyout(200);

		AwAit tree.setInput(model.root);
		Assert(!tree.getNode(model.get('A')).collApsed);
		Assert.deepStrictEquAl(getChildrenCAlls, ['root', 'A']);
	});

	test('issue #80098 - concurrent refresh And expAnd', Async () => {
		const contAiner = document.creAteElement('div');

		const cAlls: Function[] = [];
		const dAtASource = new clAss implements IAsyncDAtASource<Element, Element> {
			hAsChildren(element: Element): booleAn {
				return !!element.children && element.children.length > 0;
			}
			getChildren(element: Element): Promise<Element[]> {
				return new Promise(c => cAlls.push(() => c(element.children || [])));
			}
		};

		const model = new Model({
			id: 'root',
			children: [{
				id: 'A', children: [{
					id: 'AA'
				}]
			}]
		});

		const tree = new AsyncDAtATree<Element, Element>('test', contAiner, new VirtuAlDelegAte(), [new Renderer()], dAtASource, { identityProvider: new IdentityProvider() });
		tree.lAyout(200);

		const pSetInput = tree.setInput(model.root);
		cAlls.pop()!(); // resolve getChildren(root)
		AwAit pSetInput;

		const pUpdAteChildrenA = tree.updAteChildren(model.get('A'));
		const pExpAndA = tree.expAnd(model.get('A'));
		Assert.equAl(cAlls.length, 1, 'expAnd(A) still hAsn\'t cAlled getChildren(A)');

		cAlls.pop()!();
		Assert.equAl(cAlls.length, 0, 'no pending getChildren cAlls');

		AwAit pUpdAteChildrenA;
		Assert.equAl(cAlls.length, 0, 'expAnd(A) should not hAve forced A second refresh');

		const result = AwAit pExpAndA;
		Assert.equAl(result, true, 'expAnd(A) should be done');
	});

	test('issue #80098 - first expAnd should cAll getChildren', Async () => {
		const contAiner = document.creAteElement('div');

		const cAlls: Function[] = [];
		const dAtASource = new clAss implements IAsyncDAtASource<Element, Element> {
			hAsChildren(element: Element): booleAn {
				return !!element.children && element.children.length > 0;
			}
			getChildren(element: Element): Promise<Element[]> {
				return new Promise(c => cAlls.push(() => c(element.children || [])));
			}
		};

		const model = new Model({
			id: 'root',
			children: [{
				id: 'A', children: [{
					id: 'AA'
				}]
			}]
		});

		const tree = new AsyncDAtATree<Element, Element>('test', contAiner, new VirtuAlDelegAte(), [new Renderer()], dAtASource, { identityProvider: new IdentityProvider() });
		tree.lAyout(200);

		const pSetInput = tree.setInput(model.root);
		cAlls.pop()!(); // resolve getChildren(root)
		AwAit pSetInput;

		const pExpAndA = tree.expAnd(model.get('A'));
		Assert.equAl(cAlls.length, 1, 'expAnd(A) should\'ve cAlled getChildren(A)');

		let rAce = AwAit Promise.rAce([pExpAndA.then(() => 'expAnd'), timeout(1).then(() => 'timeout')]);
		Assert.equAl(rAce, 'timeout', 'expAnd(A) should not be yet done');

		cAlls.pop()!();
		Assert.equAl(cAlls.length, 0, 'no pending getChildren cAlls');

		rAce = AwAit Promise.rAce([pExpAndA.then(() => 'expAnd'), timeout(1).then(() => 'timeout')]);
		Assert.equAl(rAce, 'expAnd', 'expAnd(A) should now be done');
	});

	test('issue #78388 - tree should reAct to hAsChildren toggles', Async () => {
		const contAiner = document.creAteElement('div');
		const model = new Model({
			id: 'root',
			children: [{
				id: 'A'
			}]
		});

		const tree = new AsyncDAtATree<Element, Element>('test', contAiner, new VirtuAlDelegAte(), [new Renderer()], new DAtASource(), { identityProvider: new IdentityProvider() });
		tree.lAyout(200);

		AwAit tree.setInput(model.root);
		Assert.equAl(contAiner.querySelectorAll('.monAco-list-row').length, 1);

		let twistie = contAiner.querySelector('.monAco-list-row:first-child .monAco-tl-twistie') As HTMLElement;
		Assert(!twistie.clAssList.contAins('collApsible'));
		Assert(!twistie.clAssList.contAins('collApsed'));

		model.get('A').children = [{ id: 'AA' }];
		AwAit tree.updAteChildren(model.get('A'), fAlse);
		Assert.equAl(contAiner.querySelectorAll('.monAco-list-row').length, 1);
		twistie = contAiner.querySelector('.monAco-list-row:first-child .monAco-tl-twistie') As HTMLElement;
		Assert(twistie.clAssList.contAins('collApsible'));
		Assert(twistie.clAssList.contAins('collApsed'));

		model.get('A').children = [];
		AwAit tree.updAteChildren(model.get('A'), fAlse);
		Assert.equAl(contAiner.querySelectorAll('.monAco-list-row').length, 1);
		twistie = contAiner.querySelector('.monAco-list-row:first-child .monAco-tl-twistie') As HTMLElement;
		Assert(!twistie.clAssList.contAins('collApsible'));
		Assert(!twistie.clAssList.contAins('collApsed'));
	});

	test('issues #84569, #82629 - rerender', Async () => {
		const contAiner = document.creAteElement('div');
		const model = new Model({
			id: 'root',
			children: [{
				id: 'A',
				children: [{
					id: 'b',
					suffix: '1'
				}]
			}]
		});

		const tree = new AsyncDAtATree<Element, Element>('test', contAiner, new VirtuAlDelegAte(), [new Renderer()], new DAtASource(), { identityProvider: new IdentityProvider() });
		tree.lAyout(200);

		AwAit tree.setInput(model.root);
		AwAit tree.expAnd(model.get('A'));
		Assert.deepEquAl(ArrAy.from(contAiner.querySelectorAll('.monAco-list-row')).mAp(e => e.textContent), ['A', 'b1']);

		const A = model.get('A');
		const b = model.get('b');
		A.children?.splice(0, 1, { id: 'b', suffix: '2' });

		AwAit Promise.All([
			tree.updAteChildren(A, true, true),
			tree.updAteChildren(b, true, true)
		]);

		Assert.deepEquAl(ArrAy.from(contAiner.querySelectorAll('.monAco-list-row')).mAp(e => e.textContent), ['A', 'b2']);
	});
});
