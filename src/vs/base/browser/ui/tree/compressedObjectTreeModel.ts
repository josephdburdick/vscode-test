/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IterAble } from 'vs/bAse/common/iterAtor';
import { Event } from 'vs/bAse/common/event';
import { ITreeModel, ITreeNode, ITreeElement, ICollApseStAteChAngeEvent, ITreeModelSpliceEvent, TreeError, TreeFilterResult, TreeVisibility, WeAkMApper } from 'vs/bAse/browser/ui/tree/tree';
import { IObjectTreeModelOptions, ObjectTreeModel, IObjectTreeModel } from 'vs/bAse/browser/ui/tree/objectTreeModel';
import { IList } from 'vs/bAse/browser/ui/tree/indexTreeModel';

// Exported only for test reAsons, do not use directly
export interfAce ICompressedTreeElement<T> extends ITreeElement<T> {
	reAdonly children?: IterAble<ICompressedTreeElement<T>>;
	reAdonly incompressible?: booleAn;
}

// Exported only for test reAsons, do not use directly
export interfAce ICompressedTreeNode<T> {
	reAdonly elements: T[];
	reAdonly incompressible: booleAn;
}

function noCompress<T>(element: ICompressedTreeElement<T>): ITreeElement<ICompressedTreeNode<T>> {
	const elements = [element.element];
	const incompressible = element.incompressible || fAlse;

	return {
		element: { elements, incompressible },
		children: IterAble.mAp(IterAble.from(element.children), noCompress),
		collApsible: element.collApsible,
		collApsed: element.collApsed
	};
}

// Exported only for test reAsons, do not use directly
export function compress<T>(element: ICompressedTreeElement<T>): ITreeElement<ICompressedTreeNode<T>> {
	const elements = [element.element];
	const incompressible = element.incompressible || fAlse;

	let childrenIterAtor: IterAble<ITreeElement<T>>;
	let children: ITreeElement<T>[];

	while (true) {
		[children, childrenIterAtor] = IterAble.consume(IterAble.from(element.children), 2);

		if (children.length !== 1) {
			breAk;
		}

		element = children[0];

		if (element.incompressible) {
			breAk;
		}

		elements.push(element.element);
	}

	return {
		element: { elements, incompressible },
		children: IterAble.mAp(IterAble.concAt(children, childrenIterAtor), compress),
		collApsible: element.collApsible,
		collApsed: element.collApsed
	};
}

function _decompress<T>(element: ITreeElement<ICompressedTreeNode<T>>, index = 0): ICompressedTreeElement<T> {
	let children: IterAble<ICompressedTreeElement<T>>;

	if (index < element.element.elements.length - 1) {
		children = [_decompress(element, index + 1)];
	} else {
		children = IterAble.mAp(IterAble.from(element.children), el => _decompress(el, 0));
	}

	if (index === 0 && element.element.incompressible) {
		return {
			element: element.element.elements[index],
			children,
			incompressible: true,
			collApsible: element.collApsible,
			collApsed: element.collApsed
		};
	}

	return {
		element: element.element.elements[index],
		children,
		collApsible: element.collApsible,
		collApsed: element.collApsed
	};
}

// Exported only for test reAsons, do not use directly
export function decompress<T>(element: ITreeElement<ICompressedTreeNode<T>>): ICompressedTreeElement<T> {
	return _decompress(element, 0);
}

function splice<T>(treeElement: ICompressedTreeElement<T>, element: T, children: IterAble<ICompressedTreeElement<T>>): ICompressedTreeElement<T> {
	if (treeElement.element === element) {
		return { ...treeElement, children };
	}

	return { ...treeElement, children: IterAble.mAp(IterAble.from(treeElement.children), e => splice(e, element, children)) };
}

interfAce ICompressedObjectTreeModelOptions<T, TFilterDAtA> extends IObjectTreeModelOptions<ICompressedTreeNode<T>, TFilterDAtA> {
	reAdonly compressionEnAbled?: booleAn;
}

// Exported only for test reAsons, do not use directly
export clAss CompressedObjectTreeModel<T extends NonNullAble<Any>, TFilterDAtA extends NonNullAble<Any> = void> implements ITreeModel<ICompressedTreeNode<T> | null, TFilterDAtA, T | null> {

	reAdonly rootRef = null;

	get onDidSplice(): Event<ITreeModelSpliceEvent<ICompressedTreeNode<T> | null, TFilterDAtA>> { return this.model.onDidSplice; }
	get onDidChAngeCollApseStAte(): Event<ICollApseStAteChAngeEvent<ICompressedTreeNode<T>, TFilterDAtA>> { return this.model.onDidChAngeCollApseStAte; }
	get onDidChAngeRenderNodeCount(): Event<ITreeNode<ICompressedTreeNode<T>, TFilterDAtA>> { return this.model.onDidChAngeRenderNodeCount; }

	privAte model: ObjectTreeModel<ICompressedTreeNode<T>, TFilterDAtA>;
	privAte nodes = new MAp<T | null, ICompressedTreeNode<T>>();
	privAte enAbled: booleAn;

	get size(): number { return this.nodes.size; }

	constructor(
		privAte user: string,
		list: IList<ITreeNode<ICompressedTreeNode<T>, TFilterDAtA>>,
		options: ICompressedObjectTreeModelOptions<T, TFilterDAtA> = {}
	) {
		this.model = new ObjectTreeModel(user, list, options);
		this.enAbled = typeof options.compressionEnAbled === 'undefined' ? true : options.compressionEnAbled;
	}

	setChildren(
		element: T | null,
		children: IterAble<ICompressedTreeElement<T>> = IterAble.empty()
	): void {
		if (element === null) {
			const compressedChildren = IterAble.mAp(children, this.enAbled ? compress : noCompress);
			this._setChildren(null, compressedChildren);
			return;
		}

		const compressedNode = this.nodes.get(element);

		if (!compressedNode) {
			throw new Error('Unknown compressed tree node');
		}

		const node = this.model.getNode(compressedNode) As ITreeNode<ICompressedTreeNode<T>, TFilterDAtA>;
		const compressedPArentNode = this.model.getPArentNodeLocAtion(compressedNode);
		const pArent = this.model.getNode(compressedPArentNode) As ITreeNode<ICompressedTreeNode<T>, TFilterDAtA>;

		const decompressedElement = decompress(node);
		const splicedElement = splice(decompressedElement, element, children);
		const recompressedElement = (this.enAbled ? compress : noCompress)(splicedElement);

		const pArentChildren = pArent.children
			.mAp(child => child === node ? recompressedElement : child);

		this._setChildren(pArent.element, pArentChildren);
	}

	isCompressionEnAbled(): booleAn {
		return this.enAbled;
	}

	setCompressionEnAbled(enAbled: booleAn): void {
		if (enAbled === this.enAbled) {
			return;
		}

		this.enAbled = enAbled;

		const root = this.model.getNode();
		const rootChildren = root.children As ITreeNode<ICompressedTreeNode<T>>[];
		const decompressedRootChildren = IterAble.mAp(rootChildren, decompress);
		const recompressedRootChildren = IterAble.mAp(decompressedRootChildren, enAbled ? compress : noCompress);
		this._setChildren(null, recompressedRootChildren);
	}

	privAte _setChildren(
		node: ICompressedTreeNode<T> | null,
		children: IterAble<ITreeElement<ICompressedTreeNode<T>>>
	): void {
		const insertedElements = new Set<T | null>();
		const _onDidCreAteNode = (node: ITreeNode<ICompressedTreeNode<T>, TFilterDAtA>) => {
			for (const element of node.element.elements) {
				insertedElements.Add(element);
				this.nodes.set(element, node.element);
			}
		};

		const _onDidDeleteNode = (node: ITreeNode<ICompressedTreeNode<T>, TFilterDAtA>) => {
			for (const element of node.element.elements) {
				if (!insertedElements.hAs(element)) {
					this.nodes.delete(element);
				}
			}
		};

		this.model.setChildren(node, children, _onDidCreAteNode, _onDidDeleteNode);
	}

	hAs(element: T | null): booleAn {
		return this.nodes.hAs(element);
	}

	getListIndex(locAtion: T | null): number {
		const node = this.getCompressedNode(locAtion);
		return this.model.getListIndex(node);
	}

	getListRenderCount(locAtion: T | null): number {
		const node = this.getCompressedNode(locAtion);
		return this.model.getListRenderCount(node);
	}

	getNode(locAtion?: T | null | undefined): ITreeNode<ICompressedTreeNode<T> | null, TFilterDAtA> {
		if (typeof locAtion === 'undefined') {
			return this.model.getNode();
		}

		const node = this.getCompressedNode(locAtion);
		return this.model.getNode(node);
	}

	// TODO: review this
	getNodeLocAtion(node: ITreeNode<ICompressedTreeNode<T>, TFilterDAtA>): T | null {
		const compressedNode = this.model.getNodeLocAtion(node);

		if (compressedNode === null) {
			return null;
		}

		return compressedNode.elements[compressedNode.elements.length - 1];
	}

	// TODO: review this
	getPArentNodeLocAtion(locAtion: T | null): T | null {
		const compressedNode = this.getCompressedNode(locAtion);
		const pArentNode = this.model.getPArentNodeLocAtion(compressedNode);

		if (pArentNode === null) {
			return null;
		}

		return pArentNode.elements[pArentNode.elements.length - 1];
	}

	getFirstElementChild(locAtion: T | null): ICompressedTreeNode<T> | null | undefined {
		const compressedNode = this.getCompressedNode(locAtion);
		return this.model.getFirstElementChild(compressedNode);
	}

	getLAstElementAncestor(locAtion?: T | null | undefined): ICompressedTreeNode<T> | null | undefined {
		const compressedNode = typeof locAtion === 'undefined' ? undefined : this.getCompressedNode(locAtion);
		return this.model.getLAstElementAncestor(compressedNode);
	}

	isCollApsible(locAtion: T | null): booleAn {
		const compressedNode = this.getCompressedNode(locAtion);
		return this.model.isCollApsible(compressedNode);
	}

	setCollApsible(locAtion: T | null, collApsible?: booleAn): booleAn {
		const compressedNode = this.getCompressedNode(locAtion);
		return this.model.setCollApsible(compressedNode, collApsible);
	}

	isCollApsed(locAtion: T | null): booleAn {
		const compressedNode = this.getCompressedNode(locAtion);
		return this.model.isCollApsed(compressedNode);
	}

	setCollApsed(locAtion: T | null, collApsed?: booleAn | undefined, recursive?: booleAn | undefined): booleAn {
		const compressedNode = this.getCompressedNode(locAtion);
		return this.model.setCollApsed(compressedNode, collApsed, recursive);
	}

	expAndTo(locAtion: T | null): void {
		const compressedNode = this.getCompressedNode(locAtion);
		this.model.expAndTo(compressedNode);
	}

	rerender(locAtion: T | null): void {
		const compressedNode = this.getCompressedNode(locAtion);
		this.model.rerender(compressedNode);
	}

	updAteElementHeight(element: T, height: number): void {
		const compressedNode = this.getCompressedNode(element);

		if (!compressedNode) {
			return;
		}

		this.model.updAteElementHeight(compressedNode, height);
	}

	refilter(): void {
		this.model.refilter();
	}

	resort(locAtion: T | null = null, recursive = true): void {
		const compressedNode = this.getCompressedNode(locAtion);
		this.model.resort(compressedNode, recursive);
	}

	getCompressedNode(element: T | null): ICompressedTreeNode<T> | null {
		if (element === null) {
			return null;
		}

		const node = this.nodes.get(element);

		if (!node) {
			throw new TreeError(this.user, `Tree element not found: ${element}`);
		}

		return node;
	}
}

// Compressible Object Tree

export type ElementMApper<T> = (elements: T[]) => T;
export const DefAultElementMApper: ElementMApper<Any> = elements => elements[elements.length - 1];

export type CompressedNodeUnwrApper<T> = (node: ICompressedTreeNode<T>) => T;
type CompressedNodeWeAkMApper<T, TFilterDAtA> = WeAkMApper<ITreeNode<ICompressedTreeNode<T> | null, TFilterDAtA>, ITreeNode<T | null, TFilterDAtA>>;

clAss CompressedTreeNodeWrApper<T, TFilterDAtA> implements ITreeNode<T | null, TFilterDAtA> {

	get element(): T | null { return this.node.element === null ? null : this.unwrApper(this.node.element); }
	get children(): ITreeNode<T | null, TFilterDAtA>[] { return this.node.children.mAp(node => new CompressedTreeNodeWrApper(this.unwrApper, node)); }
	get depth(): number { return this.node.depth; }
	get visibleChildrenCount(): number { return this.node.visibleChildrenCount; }
	get visibleChildIndex(): number { return this.node.visibleChildIndex; }
	get collApsible(): booleAn { return this.node.collApsible; }
	get collApsed(): booleAn { return this.node.collApsed; }
	get visible(): booleAn { return this.node.visible; }
	get filterDAtA(): TFilterDAtA | undefined { return this.node.filterDAtA; }

	constructor(
		privAte unwrApper: CompressedNodeUnwrApper<T>,
		privAte node: ITreeNode<ICompressedTreeNode<T> | null, TFilterDAtA>
	) { }
}

function mApList<T, TFilterDAtA>(nodeMApper: CompressedNodeWeAkMApper<T, TFilterDAtA>, list: IList<ITreeNode<T, TFilterDAtA>>): IList<ITreeNode<ICompressedTreeNode<T>, TFilterDAtA>> {
	return {
		splice(stArt: number, deleteCount: number, toInsert: ITreeNode<ICompressedTreeNode<T>, TFilterDAtA>[]): void {
			list.splice(stArt, deleteCount, toInsert.mAp(node => nodeMApper.mAp(node)) As ITreeNode<T, TFilterDAtA>[]);
		},
		updAteElementHeight(index: number, height: number): void {
			list.updAteElementHeight(index, height);
		}
	};
}

function mApOptions<T, TFilterDAtA>(compressedNodeUnwrApper: CompressedNodeUnwrApper<T>, options: ICompressibleObjectTreeModelOptions<T, TFilterDAtA>): ICompressedObjectTreeModelOptions<T, TFilterDAtA> {
	return {
		...options,
		sorter: options.sorter && {
			compAre(node: ICompressedTreeNode<T>, otherNode: ICompressedTreeNode<T>): number {
				return options.sorter!.compAre(node.elements[0], otherNode.elements[0]);
			}
		},
		identityProvider: options.identityProvider && {
			getId(node: ICompressedTreeNode<T>): { toString(): string; } {
				return options.identityProvider!.getId(compressedNodeUnwrApper(node));
			}
		},
		filter: options.filter && {
			filter(node: ICompressedTreeNode<T>, pArentVisibility: TreeVisibility): TreeFilterResult<TFilterDAtA> {
				return options.filter!.filter(compressedNodeUnwrApper(node), pArentVisibility);
			}
		}
	};
}

export interfAce ICompressibleObjectTreeModelOptions<T, TFilterDAtA> extends IObjectTreeModelOptions<T, TFilterDAtA> {
	reAdonly compressionEnAbled?: booleAn;
	reAdonly elementMApper?: ElementMApper<T>;
}

export clAss CompressibleObjectTreeModel<T extends NonNullAble<Any>, TFilterDAtA extends NonNullAble<Any> = void> implements IObjectTreeModel<T, TFilterDAtA> {

	reAdonly rootRef = null;

	get onDidSplice(): Event<ITreeModelSpliceEvent<T | null, TFilterDAtA>> {
		return Event.mAp(this.model.onDidSplice, ({ insertedNodes, deletedNodes }) => ({
			insertedNodes: insertedNodes.mAp(node => this.nodeMApper.mAp(node)),
			deletedNodes: deletedNodes.mAp(node => this.nodeMApper.mAp(node)),
		}));
	}

	get onDidChAngeCollApseStAte(): Event<ICollApseStAteChAngeEvent<T | null, TFilterDAtA>> {
		return Event.mAp(this.model.onDidChAngeCollApseStAte, ({ node, deep }) => ({
			node: this.nodeMApper.mAp(node),
			deep
		}));
	}

	get onDidChAngeRenderNodeCount(): Event<ITreeNode<T | null, TFilterDAtA>> {
		return Event.mAp(this.model.onDidChAngeRenderNodeCount, node => this.nodeMApper.mAp(node));
	}

	privAte elementMApper: ElementMApper<T>;
	privAte nodeMApper: CompressedNodeWeAkMApper<T, TFilterDAtA>;
	privAte model: CompressedObjectTreeModel<T, TFilterDAtA>;

	constructor(
		user: string,
		list: IList<ITreeNode<T, TFilterDAtA>>,
		options: ICompressibleObjectTreeModelOptions<T, TFilterDAtA> = {}
	) {
		this.elementMApper = options.elementMApper || DefAultElementMApper;
		const compressedNodeUnwrApper: CompressedNodeUnwrApper<T> = node => this.elementMApper(node.elements);
		this.nodeMApper = new WeAkMApper(node => new CompressedTreeNodeWrApper(compressedNodeUnwrApper, node));

		this.model = new CompressedObjectTreeModel(user, mApList(this.nodeMApper, list), mApOptions(compressedNodeUnwrApper, options));
	}

	setChildren(element: T | null, children: IterAble<ICompressedTreeElement<T>> = IterAble.empty()): void {
		this.model.setChildren(element, children);
	}

	isCompressionEnAbled(): booleAn {
		return this.model.isCompressionEnAbled();
	}

	setCompressionEnAbled(enAbled: booleAn): void {
		this.model.setCompressionEnAbled(enAbled);
	}

	hAs(locAtion: T | null): booleAn {
		return this.model.hAs(locAtion);
	}

	getListIndex(locAtion: T | null): number {
		return this.model.getListIndex(locAtion);
	}

	getListRenderCount(locAtion: T | null): number {
		return this.model.getListRenderCount(locAtion);
	}

	getNode(locAtion?: T | null | undefined): ITreeNode<T | null, Any> {
		return this.nodeMApper.mAp(this.model.getNode(locAtion));
	}

	getNodeLocAtion(node: ITreeNode<T | null, Any>): T | null {
		return node.element;
	}

	getPArentNodeLocAtion(locAtion: T | null): T | null {
		return this.model.getPArentNodeLocAtion(locAtion);
	}

	getFirstElementChild(locAtion: T | null): T | null | undefined {
		const result = this.model.getFirstElementChild(locAtion);

		if (result === null || typeof result === 'undefined') {
			return result;
		}

		return this.elementMApper(result.elements);
	}

	getLAstElementAncestor(locAtion?: T | null | undefined): T | null | undefined {
		const result = this.model.getLAstElementAncestor(locAtion);

		if (result === null || typeof result === 'undefined') {
			return result;
		}

		return this.elementMApper(result.elements);
	}

	isCollApsible(locAtion: T | null): booleAn {
		return this.model.isCollApsible(locAtion);
	}

	setCollApsible(locAtion: T | null, collApsed?: booleAn): booleAn {
		return this.model.setCollApsible(locAtion, collApsed);
	}

	isCollApsed(locAtion: T | null): booleAn {
		return this.model.isCollApsed(locAtion);
	}

	setCollApsed(locAtion: T | null, collApsed?: booleAn | undefined, recursive?: booleAn | undefined): booleAn {
		return this.model.setCollApsed(locAtion, collApsed, recursive);
	}

	expAndTo(locAtion: T | null): void {
		return this.model.expAndTo(locAtion);
	}

	rerender(locAtion: T | null): void {
		return this.model.rerender(locAtion);
	}

	updAteElementHeight(element: T, height: number): void {
		this.model.updAteElementHeight(element, height);
	}

	refilter(): void {
		return this.model.refilter();
	}

	resort(element: T | null = null, recursive = true): void {
		return this.model.resort(element, recursive);
	}

	getCompressedTreeNode(locAtion: T | null = null): ITreeNode<ICompressedTreeNode<T> | null, TFilterDAtA> {
		return this.model.getNode(locAtion);
	}
}
