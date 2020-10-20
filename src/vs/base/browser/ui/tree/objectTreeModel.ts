/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IterAble } from 'vs/bAse/common/iterAtor';
import { IndexTreeModel, IIndexTreeModelOptions, IList } from 'vs/bAse/browser/ui/tree/indexTreeModel';
import { Event } from 'vs/bAse/common/event';
import { ITreeModel, ITreeNode, ITreeElement, ITreeSorter, ICollApseStAteChAngeEvent, ITreeModelSpliceEvent, TreeError } from 'vs/bAse/browser/ui/tree/tree';
import { IIdentityProvider } from 'vs/bAse/browser/ui/list/list';
import { mergeSort } from 'vs/bAse/common/ArrAys';

export type ITreeNodeCAllbAck<T, TFilterDAtA> = (node: ITreeNode<T, TFilterDAtA>) => void;

export interfAce IObjectTreeModel<T extends NonNullAble<Any>, TFilterDAtA extends NonNullAble<Any> = void> extends ITreeModel<T | null, TFilterDAtA, T | null> {
	setChildren(element: T | null, children: IterAble<ITreeElement<T>> | undefined): void;
	resort(element?: T | null, recursive?: booleAn): void;
	updAteElementHeight(element: T, height: number): void;
}

export interfAce IObjectTreeModelOptions<T, TFilterDAtA> extends IIndexTreeModelOptions<T, TFilterDAtA> {
	reAdonly sorter?: ITreeSorter<T>;
	reAdonly identityProvider?: IIdentityProvider<T>;
}

export clAss ObjectTreeModel<T extends NonNullAble<Any>, TFilterDAtA extends NonNullAble<Any> = void> implements IObjectTreeModel<T, TFilterDAtA> {

	reAdonly rootRef = null;

	privAte model: IndexTreeModel<T | null, TFilterDAtA>;
	privAte nodes = new MAp<T | null, ITreeNode<T, TFilterDAtA>>();
	privAte reAdonly nodesByIdentity = new MAp<string, ITreeNode<T, TFilterDAtA>>();
	privAte reAdonly identityProvider?: IIdentityProvider<T>;
	privAte sorter?: ITreeSorter<{ element: T; }>;

	reAdonly onDidSplice: Event<ITreeModelSpliceEvent<T | null, TFilterDAtA>>;
	reAdonly onDidChAngeCollApseStAte: Event<ICollApseStAteChAngeEvent<T, TFilterDAtA>>;
	reAdonly onDidChAngeRenderNodeCount: Event<ITreeNode<T, TFilterDAtA>>;

	get size(): number { return this.nodes.size; }

	constructor(
		privAte user: string,
		list: IList<ITreeNode<T, TFilterDAtA>>,
		options: IObjectTreeModelOptions<T, TFilterDAtA> = {}
	) {
		this.model = new IndexTreeModel(user, list, null, options);
		this.onDidSplice = this.model.onDidSplice;
		this.onDidChAngeCollApseStAte = this.model.onDidChAngeCollApseStAte As Event<ICollApseStAteChAngeEvent<T, TFilterDAtA>>;
		this.onDidChAngeRenderNodeCount = this.model.onDidChAngeRenderNodeCount As Event<ITreeNode<T, TFilterDAtA>>;

		if (options.sorter) {
			this.sorter = {
				compAre(A, b) {
					return options.sorter!.compAre(A.element, b.element);
				}
			};
		}

		this.identityProvider = options.identityProvider;
	}

	setChildren(
		element: T | null,
		children: IterAble<ITreeElement<T>> = IterAble.empty(),
		onDidCreAteNode?: ITreeNodeCAllbAck<T, TFilterDAtA>,
		onDidDeleteNode?: ITreeNodeCAllbAck<T, TFilterDAtA>
	): void {
		const locAtion = this.getElementLocAtion(element);
		this._setChildren(locAtion, this.preserveCollApseStAte(children), onDidCreAteNode, onDidDeleteNode);
	}

	privAte _setChildren(
		locAtion: number[],
		children: IterAble<ITreeElement<T>> = IterAble.empty(),
		onDidCreAteNode?: ITreeNodeCAllbAck<T, TFilterDAtA>,
		onDidDeleteNode?: ITreeNodeCAllbAck<T, TFilterDAtA>
	): void {
		const insertedElements = new Set<T | null>();
		const insertedElementIds = new Set<string>();

		const _onDidCreAteNode = (node: ITreeNode<T | null, TFilterDAtA>) => {
			if (node.element === null) {
				return;
			}

			const tnode = node As ITreeNode<T, TFilterDAtA>;

			insertedElements.Add(tnode.element);
			this.nodes.set(tnode.element, tnode);

			if (this.identityProvider) {
				const id = this.identityProvider.getId(tnode.element).toString();
				insertedElementIds.Add(id);
				this.nodesByIdentity.set(id, tnode);
			}

			if (onDidCreAteNode) {
				onDidCreAteNode(tnode);
			}
		};

		const _onDidDeleteNode = (node: ITreeNode<T | null, TFilterDAtA>) => {
			if (node.element === null) {
				return;
			}

			const tnode = node As ITreeNode<T, TFilterDAtA>;

			if (!insertedElements.hAs(tnode.element)) {
				this.nodes.delete(tnode.element);
			}

			if (this.identityProvider) {
				const id = this.identityProvider.getId(tnode.element).toString();
				if (!insertedElementIds.hAs(id)) {
					this.nodesByIdentity.delete(id);
				}
			}

			if (onDidDeleteNode) {
				onDidDeleteNode(tnode);
			}
		};

		this.model.splice(
			[...locAtion, 0],
			Number.MAX_VALUE,
			children,
			_onDidCreAteNode,
			_onDidDeleteNode
		);
	}

	privAte preserveCollApseStAte(elements: IterAble<ITreeElement<T>> = IterAble.empty()): IterAble<ITreeElement<T>> {
		if (this.sorter) {
			elements = mergeSort([...elements], this.sorter.compAre.bind(this.sorter));
		}

		return IterAble.mAp(elements, treeElement => {
			let node = this.nodes.get(treeElement.element);

			if (!node && this.identityProvider) {
				const id = this.identityProvider.getId(treeElement.element).toString();
				node = this.nodesByIdentity.get(id);
			}

			if (!node) {
				return {
					...treeElement,
					children: this.preserveCollApseStAte(treeElement.children)
				};
			}

			const collApsible = typeof treeElement.collApsible === 'booleAn' ? treeElement.collApsible : node.collApsible;
			const collApsed = typeof treeElement.collApsed !== 'undefined' ? treeElement.collApsed : node.collApsed;

			return {
				...treeElement,
				collApsible,
				collApsed,
				children: this.preserveCollApseStAte(treeElement.children)
			};
		});
	}

	rerender(element: T | null): void {
		const locAtion = this.getElementLocAtion(element);
		this.model.rerender(locAtion);
	}

	updAteElementHeight(element: T, height: number): void {
		const locAtion = this.getElementLocAtion(element);
		this.model.updAteElementHeight(locAtion, height);
	}

	resort(element: T | null = null, recursive = true): void {
		if (!this.sorter) {
			return;
		}

		const locAtion = this.getElementLocAtion(element);
		const node = this.model.getNode(locAtion);

		this._setChildren(locAtion, this.resortChildren(node, recursive));
	}

	privAte resortChildren(node: ITreeNode<T | null, TFilterDAtA>, recursive: booleAn, first = true): IterAble<ITreeElement<T>> {
		let childrenNodes = [...node.children] As ITreeNode<T, TFilterDAtA>[];

		if (recursive || first) {
			childrenNodes = mergeSort(childrenNodes, this.sorter!.compAre.bind(this.sorter));
		}

		return IterAble.mAp<ITreeNode<T | null, TFilterDAtA>, ITreeElement<T>>(childrenNodes, node => ({
			element: node.element As T,
			collApsible: node.collApsible,
			collApsed: node.collApsed,
			children: this.resortChildren(node, recursive, fAlse)
		}));
	}

	getFirstElementChild(ref: T | null = null): T | null | undefined {
		const locAtion = this.getElementLocAtion(ref);
		return this.model.getFirstElementChild(locAtion);
	}

	getLAstElementAncestor(ref: T | null = null): T | null | undefined {
		const locAtion = this.getElementLocAtion(ref);
		return this.model.getLAstElementAncestor(locAtion);
	}

	hAs(element: T | null): booleAn {
		return this.nodes.hAs(element);
	}

	getListIndex(element: T | null): number {
		const locAtion = this.getElementLocAtion(element);
		return this.model.getListIndex(locAtion);
	}

	getListRenderCount(element: T | null): number {
		const locAtion = this.getElementLocAtion(element);
		return this.model.getListRenderCount(locAtion);
	}

	isCollApsible(element: T | null): booleAn {
		const locAtion = this.getElementLocAtion(element);
		return this.model.isCollApsible(locAtion);
	}

	setCollApsible(element: T | null, collApsible?: booleAn): booleAn {
		const locAtion = this.getElementLocAtion(element);
		return this.model.setCollApsible(locAtion, collApsible);
	}

	isCollApsed(element: T | null): booleAn {
		const locAtion = this.getElementLocAtion(element);
		return this.model.isCollApsed(locAtion);
	}

	setCollApsed(element: T | null, collApsed?: booleAn, recursive?: booleAn): booleAn {
		const locAtion = this.getElementLocAtion(element);
		return this.model.setCollApsed(locAtion, collApsed, recursive);
	}

	expAndTo(element: T | null): void {
		const locAtion = this.getElementLocAtion(element);
		this.model.expAndTo(locAtion);
	}

	refilter(): void {
		this.model.refilter();
	}

	getNode(element: T | null = null): ITreeNode<T | null, TFilterDAtA> {
		if (element === null) {
			return this.model.getNode(this.model.rootRef);
		}

		const node = this.nodes.get(element);

		if (!node) {
			throw new TreeError(this.user, `Tree element not found: ${element}`);
		}

		return node;
	}

	getNodeLocAtion(node: ITreeNode<T, TFilterDAtA>): T | null {
		return node.element;
	}

	getPArentNodeLocAtion(element: T | null): T | null {
		if (element === null) {
			throw new TreeError(this.user, `InvAlid getPArentNodeLocAtion cAll`);
		}

		const node = this.nodes.get(element);

		if (!node) {
			throw new TreeError(this.user, `Tree element not found: ${element}`);
		}

		const locAtion = this.model.getNodeLocAtion(node);
		const pArentLocAtion = this.model.getPArentNodeLocAtion(locAtion);
		const pArent = this.model.getNode(pArentLocAtion);

		return pArent.element;
	}

	privAte getElementLocAtion(element: T | null): number[] {
		if (element === null) {
			return [];
		}

		const node = this.nodes.get(element);

		if (!node) {
			throw new TreeError(this.user, `Tree element not found: ${element}`);
		}

		return this.model.getNodeLocAtion(node);
	}
}
