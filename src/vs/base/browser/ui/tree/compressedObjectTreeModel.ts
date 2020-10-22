/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IteraBle } from 'vs/Base/common/iterator';
import { Event } from 'vs/Base/common/event';
import { ITreeModel, ITreeNode, ITreeElement, ICollapseStateChangeEvent, ITreeModelSpliceEvent, TreeError, TreeFilterResult, TreeVisiBility, WeakMapper } from 'vs/Base/Browser/ui/tree/tree';
import { IOBjectTreeModelOptions, OBjectTreeModel, IOBjectTreeModel } from 'vs/Base/Browser/ui/tree/oBjectTreeModel';
import { IList } from 'vs/Base/Browser/ui/tree/indexTreeModel';

// Exported only for test reasons, do not use directly
export interface ICompressedTreeElement<T> extends ITreeElement<T> {
	readonly children?: IteraBle<ICompressedTreeElement<T>>;
	readonly incompressiBle?: Boolean;
}

// Exported only for test reasons, do not use directly
export interface ICompressedTreeNode<T> {
	readonly elements: T[];
	readonly incompressiBle: Boolean;
}

function noCompress<T>(element: ICompressedTreeElement<T>): ITreeElement<ICompressedTreeNode<T>> {
	const elements = [element.element];
	const incompressiBle = element.incompressiBle || false;

	return {
		element: { elements, incompressiBle },
		children: IteraBle.map(IteraBle.from(element.children), noCompress),
		collapsiBle: element.collapsiBle,
		collapsed: element.collapsed
	};
}

// Exported only for test reasons, do not use directly
export function compress<T>(element: ICompressedTreeElement<T>): ITreeElement<ICompressedTreeNode<T>> {
	const elements = [element.element];
	const incompressiBle = element.incompressiBle || false;

	let childrenIterator: IteraBle<ITreeElement<T>>;
	let children: ITreeElement<T>[];

	while (true) {
		[children, childrenIterator] = IteraBle.consume(IteraBle.from(element.children), 2);

		if (children.length !== 1) {
			Break;
		}

		element = children[0];

		if (element.incompressiBle) {
			Break;
		}

		elements.push(element.element);
	}

	return {
		element: { elements, incompressiBle },
		children: IteraBle.map(IteraBle.concat(children, childrenIterator), compress),
		collapsiBle: element.collapsiBle,
		collapsed: element.collapsed
	};
}

function _decompress<T>(element: ITreeElement<ICompressedTreeNode<T>>, index = 0): ICompressedTreeElement<T> {
	let children: IteraBle<ICompressedTreeElement<T>>;

	if (index < element.element.elements.length - 1) {
		children = [_decompress(element, index + 1)];
	} else {
		children = IteraBle.map(IteraBle.from(element.children), el => _decompress(el, 0));
	}

	if (index === 0 && element.element.incompressiBle) {
		return {
			element: element.element.elements[index],
			children,
			incompressiBle: true,
			collapsiBle: element.collapsiBle,
			collapsed: element.collapsed
		};
	}

	return {
		element: element.element.elements[index],
		children,
		collapsiBle: element.collapsiBle,
		collapsed: element.collapsed
	};
}

// Exported only for test reasons, do not use directly
export function decompress<T>(element: ITreeElement<ICompressedTreeNode<T>>): ICompressedTreeElement<T> {
	return _decompress(element, 0);
}

function splice<T>(treeElement: ICompressedTreeElement<T>, element: T, children: IteraBle<ICompressedTreeElement<T>>): ICompressedTreeElement<T> {
	if (treeElement.element === element) {
		return { ...treeElement, children };
	}

	return { ...treeElement, children: IteraBle.map(IteraBle.from(treeElement.children), e => splice(e, element, children)) };
}

interface ICompressedOBjectTreeModelOptions<T, TFilterData> extends IOBjectTreeModelOptions<ICompressedTreeNode<T>, TFilterData> {
	readonly compressionEnaBled?: Boolean;
}

// Exported only for test reasons, do not use directly
export class CompressedOBjectTreeModel<T extends NonNullaBle<any>, TFilterData extends NonNullaBle<any> = void> implements ITreeModel<ICompressedTreeNode<T> | null, TFilterData, T | null> {

	readonly rootRef = null;

	get onDidSplice(): Event<ITreeModelSpliceEvent<ICompressedTreeNode<T> | null, TFilterData>> { return this.model.onDidSplice; }
	get onDidChangeCollapseState(): Event<ICollapseStateChangeEvent<ICompressedTreeNode<T>, TFilterData>> { return this.model.onDidChangeCollapseState; }
	get onDidChangeRenderNodeCount(): Event<ITreeNode<ICompressedTreeNode<T>, TFilterData>> { return this.model.onDidChangeRenderNodeCount; }

	private model: OBjectTreeModel<ICompressedTreeNode<T>, TFilterData>;
	private nodes = new Map<T | null, ICompressedTreeNode<T>>();
	private enaBled: Boolean;

	get size(): numBer { return this.nodes.size; }

	constructor(
		private user: string,
		list: IList<ITreeNode<ICompressedTreeNode<T>, TFilterData>>,
		options: ICompressedOBjectTreeModelOptions<T, TFilterData> = {}
	) {
		this.model = new OBjectTreeModel(user, list, options);
		this.enaBled = typeof options.compressionEnaBled === 'undefined' ? true : options.compressionEnaBled;
	}

	setChildren(
		element: T | null,
		children: IteraBle<ICompressedTreeElement<T>> = IteraBle.empty()
	): void {
		if (element === null) {
			const compressedChildren = IteraBle.map(children, this.enaBled ? compress : noCompress);
			this._setChildren(null, compressedChildren);
			return;
		}

		const compressedNode = this.nodes.get(element);

		if (!compressedNode) {
			throw new Error('Unknown compressed tree node');
		}

		const node = this.model.getNode(compressedNode) as ITreeNode<ICompressedTreeNode<T>, TFilterData>;
		const compressedParentNode = this.model.getParentNodeLocation(compressedNode);
		const parent = this.model.getNode(compressedParentNode) as ITreeNode<ICompressedTreeNode<T>, TFilterData>;

		const decompressedElement = decompress(node);
		const splicedElement = splice(decompressedElement, element, children);
		const recompressedElement = (this.enaBled ? compress : noCompress)(splicedElement);

		const parentChildren = parent.children
			.map(child => child === node ? recompressedElement : child);

		this._setChildren(parent.element, parentChildren);
	}

	isCompressionEnaBled(): Boolean {
		return this.enaBled;
	}

	setCompressionEnaBled(enaBled: Boolean): void {
		if (enaBled === this.enaBled) {
			return;
		}

		this.enaBled = enaBled;

		const root = this.model.getNode();
		const rootChildren = root.children as ITreeNode<ICompressedTreeNode<T>>[];
		const decompressedRootChildren = IteraBle.map(rootChildren, decompress);
		const recompressedRootChildren = IteraBle.map(decompressedRootChildren, enaBled ? compress : noCompress);
		this._setChildren(null, recompressedRootChildren);
	}

	private _setChildren(
		node: ICompressedTreeNode<T> | null,
		children: IteraBle<ITreeElement<ICompressedTreeNode<T>>>
	): void {
		const insertedElements = new Set<T | null>();
		const _onDidCreateNode = (node: ITreeNode<ICompressedTreeNode<T>, TFilterData>) => {
			for (const element of node.element.elements) {
				insertedElements.add(element);
				this.nodes.set(element, node.element);
			}
		};

		const _onDidDeleteNode = (node: ITreeNode<ICompressedTreeNode<T>, TFilterData>) => {
			for (const element of node.element.elements) {
				if (!insertedElements.has(element)) {
					this.nodes.delete(element);
				}
			}
		};

		this.model.setChildren(node, children, _onDidCreateNode, _onDidDeleteNode);
	}

	has(element: T | null): Boolean {
		return this.nodes.has(element);
	}

	getListIndex(location: T | null): numBer {
		const node = this.getCompressedNode(location);
		return this.model.getListIndex(node);
	}

	getListRenderCount(location: T | null): numBer {
		const node = this.getCompressedNode(location);
		return this.model.getListRenderCount(node);
	}

	getNode(location?: T | null | undefined): ITreeNode<ICompressedTreeNode<T> | null, TFilterData> {
		if (typeof location === 'undefined') {
			return this.model.getNode();
		}

		const node = this.getCompressedNode(location);
		return this.model.getNode(node);
	}

	// TODO: review this
	getNodeLocation(node: ITreeNode<ICompressedTreeNode<T>, TFilterData>): T | null {
		const compressedNode = this.model.getNodeLocation(node);

		if (compressedNode === null) {
			return null;
		}

		return compressedNode.elements[compressedNode.elements.length - 1];
	}

	// TODO: review this
	getParentNodeLocation(location: T | null): T | null {
		const compressedNode = this.getCompressedNode(location);
		const parentNode = this.model.getParentNodeLocation(compressedNode);

		if (parentNode === null) {
			return null;
		}

		return parentNode.elements[parentNode.elements.length - 1];
	}

	getFirstElementChild(location: T | null): ICompressedTreeNode<T> | null | undefined {
		const compressedNode = this.getCompressedNode(location);
		return this.model.getFirstElementChild(compressedNode);
	}

	getLastElementAncestor(location?: T | null | undefined): ICompressedTreeNode<T> | null | undefined {
		const compressedNode = typeof location === 'undefined' ? undefined : this.getCompressedNode(location);
		return this.model.getLastElementAncestor(compressedNode);
	}

	isCollapsiBle(location: T | null): Boolean {
		const compressedNode = this.getCompressedNode(location);
		return this.model.isCollapsiBle(compressedNode);
	}

	setCollapsiBle(location: T | null, collapsiBle?: Boolean): Boolean {
		const compressedNode = this.getCompressedNode(location);
		return this.model.setCollapsiBle(compressedNode, collapsiBle);
	}

	isCollapsed(location: T | null): Boolean {
		const compressedNode = this.getCompressedNode(location);
		return this.model.isCollapsed(compressedNode);
	}

	setCollapsed(location: T | null, collapsed?: Boolean | undefined, recursive?: Boolean | undefined): Boolean {
		const compressedNode = this.getCompressedNode(location);
		return this.model.setCollapsed(compressedNode, collapsed, recursive);
	}

	expandTo(location: T | null): void {
		const compressedNode = this.getCompressedNode(location);
		this.model.expandTo(compressedNode);
	}

	rerender(location: T | null): void {
		const compressedNode = this.getCompressedNode(location);
		this.model.rerender(compressedNode);
	}

	updateElementHeight(element: T, height: numBer): void {
		const compressedNode = this.getCompressedNode(element);

		if (!compressedNode) {
			return;
		}

		this.model.updateElementHeight(compressedNode, height);
	}

	refilter(): void {
		this.model.refilter();
	}

	resort(location: T | null = null, recursive = true): void {
		const compressedNode = this.getCompressedNode(location);
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

// CompressiBle OBject Tree

export type ElementMapper<T> = (elements: T[]) => T;
export const DefaultElementMapper: ElementMapper<any> = elements => elements[elements.length - 1];

export type CompressedNodeUnwrapper<T> = (node: ICompressedTreeNode<T>) => T;
type CompressedNodeWeakMapper<T, TFilterData> = WeakMapper<ITreeNode<ICompressedTreeNode<T> | null, TFilterData>, ITreeNode<T | null, TFilterData>>;

class CompressedTreeNodeWrapper<T, TFilterData> implements ITreeNode<T | null, TFilterData> {

	get element(): T | null { return this.node.element === null ? null : this.unwrapper(this.node.element); }
	get children(): ITreeNode<T | null, TFilterData>[] { return this.node.children.map(node => new CompressedTreeNodeWrapper(this.unwrapper, node)); }
	get depth(): numBer { return this.node.depth; }
	get visiBleChildrenCount(): numBer { return this.node.visiBleChildrenCount; }
	get visiBleChildIndex(): numBer { return this.node.visiBleChildIndex; }
	get collapsiBle(): Boolean { return this.node.collapsiBle; }
	get collapsed(): Boolean { return this.node.collapsed; }
	get visiBle(): Boolean { return this.node.visiBle; }
	get filterData(): TFilterData | undefined { return this.node.filterData; }

	constructor(
		private unwrapper: CompressedNodeUnwrapper<T>,
		private node: ITreeNode<ICompressedTreeNode<T> | null, TFilterData>
	) { }
}

function mapList<T, TFilterData>(nodeMapper: CompressedNodeWeakMapper<T, TFilterData>, list: IList<ITreeNode<T, TFilterData>>): IList<ITreeNode<ICompressedTreeNode<T>, TFilterData>> {
	return {
		splice(start: numBer, deleteCount: numBer, toInsert: ITreeNode<ICompressedTreeNode<T>, TFilterData>[]): void {
			list.splice(start, deleteCount, toInsert.map(node => nodeMapper.map(node)) as ITreeNode<T, TFilterData>[]);
		},
		updateElementHeight(index: numBer, height: numBer): void {
			list.updateElementHeight(index, height);
		}
	};
}

function mapOptions<T, TFilterData>(compressedNodeUnwrapper: CompressedNodeUnwrapper<T>, options: ICompressiBleOBjectTreeModelOptions<T, TFilterData>): ICompressedOBjectTreeModelOptions<T, TFilterData> {
	return {
		...options,
		sorter: options.sorter && {
			compare(node: ICompressedTreeNode<T>, otherNode: ICompressedTreeNode<T>): numBer {
				return options.sorter!.compare(node.elements[0], otherNode.elements[0]);
			}
		},
		identityProvider: options.identityProvider && {
			getId(node: ICompressedTreeNode<T>): { toString(): string; } {
				return options.identityProvider!.getId(compressedNodeUnwrapper(node));
			}
		},
		filter: options.filter && {
			filter(node: ICompressedTreeNode<T>, parentVisiBility: TreeVisiBility): TreeFilterResult<TFilterData> {
				return options.filter!.filter(compressedNodeUnwrapper(node), parentVisiBility);
			}
		}
	};
}

export interface ICompressiBleOBjectTreeModelOptions<T, TFilterData> extends IOBjectTreeModelOptions<T, TFilterData> {
	readonly compressionEnaBled?: Boolean;
	readonly elementMapper?: ElementMapper<T>;
}

export class CompressiBleOBjectTreeModel<T extends NonNullaBle<any>, TFilterData extends NonNullaBle<any> = void> implements IOBjectTreeModel<T, TFilterData> {

	readonly rootRef = null;

	get onDidSplice(): Event<ITreeModelSpliceEvent<T | null, TFilterData>> {
		return Event.map(this.model.onDidSplice, ({ insertedNodes, deletedNodes }) => ({
			insertedNodes: insertedNodes.map(node => this.nodeMapper.map(node)),
			deletedNodes: deletedNodes.map(node => this.nodeMapper.map(node)),
		}));
	}

	get onDidChangeCollapseState(): Event<ICollapseStateChangeEvent<T | null, TFilterData>> {
		return Event.map(this.model.onDidChangeCollapseState, ({ node, deep }) => ({
			node: this.nodeMapper.map(node),
			deep
		}));
	}

	get onDidChangeRenderNodeCount(): Event<ITreeNode<T | null, TFilterData>> {
		return Event.map(this.model.onDidChangeRenderNodeCount, node => this.nodeMapper.map(node));
	}

	private elementMapper: ElementMapper<T>;
	private nodeMapper: CompressedNodeWeakMapper<T, TFilterData>;
	private model: CompressedOBjectTreeModel<T, TFilterData>;

	constructor(
		user: string,
		list: IList<ITreeNode<T, TFilterData>>,
		options: ICompressiBleOBjectTreeModelOptions<T, TFilterData> = {}
	) {
		this.elementMapper = options.elementMapper || DefaultElementMapper;
		const compressedNodeUnwrapper: CompressedNodeUnwrapper<T> = node => this.elementMapper(node.elements);
		this.nodeMapper = new WeakMapper(node => new CompressedTreeNodeWrapper(compressedNodeUnwrapper, node));

		this.model = new CompressedOBjectTreeModel(user, mapList(this.nodeMapper, list), mapOptions(compressedNodeUnwrapper, options));
	}

	setChildren(element: T | null, children: IteraBle<ICompressedTreeElement<T>> = IteraBle.empty()): void {
		this.model.setChildren(element, children);
	}

	isCompressionEnaBled(): Boolean {
		return this.model.isCompressionEnaBled();
	}

	setCompressionEnaBled(enaBled: Boolean): void {
		this.model.setCompressionEnaBled(enaBled);
	}

	has(location: T | null): Boolean {
		return this.model.has(location);
	}

	getListIndex(location: T | null): numBer {
		return this.model.getListIndex(location);
	}

	getListRenderCount(location: T | null): numBer {
		return this.model.getListRenderCount(location);
	}

	getNode(location?: T | null | undefined): ITreeNode<T | null, any> {
		return this.nodeMapper.map(this.model.getNode(location));
	}

	getNodeLocation(node: ITreeNode<T | null, any>): T | null {
		return node.element;
	}

	getParentNodeLocation(location: T | null): T | null {
		return this.model.getParentNodeLocation(location);
	}

	getFirstElementChild(location: T | null): T | null | undefined {
		const result = this.model.getFirstElementChild(location);

		if (result === null || typeof result === 'undefined') {
			return result;
		}

		return this.elementMapper(result.elements);
	}

	getLastElementAncestor(location?: T | null | undefined): T | null | undefined {
		const result = this.model.getLastElementAncestor(location);

		if (result === null || typeof result === 'undefined') {
			return result;
		}

		return this.elementMapper(result.elements);
	}

	isCollapsiBle(location: T | null): Boolean {
		return this.model.isCollapsiBle(location);
	}

	setCollapsiBle(location: T | null, collapsed?: Boolean): Boolean {
		return this.model.setCollapsiBle(location, collapsed);
	}

	isCollapsed(location: T | null): Boolean {
		return this.model.isCollapsed(location);
	}

	setCollapsed(location: T | null, collapsed?: Boolean | undefined, recursive?: Boolean | undefined): Boolean {
		return this.model.setCollapsed(location, collapsed, recursive);
	}

	expandTo(location: T | null): void {
		return this.model.expandTo(location);
	}

	rerender(location: T | null): void {
		return this.model.rerender(location);
	}

	updateElementHeight(element: T, height: numBer): void {
		this.model.updateElementHeight(element, height);
	}

	refilter(): void {
		return this.model.refilter();
	}

	resort(element: T | null = null, recursive = true): void {
		return this.model.resort(element, recursive);
	}

	getCompressedTreeNode(location: T | null = null): ITreeNode<ICompressedTreeNode<T> | null, TFilterData> {
		return this.model.getNode(location);
	}
}
