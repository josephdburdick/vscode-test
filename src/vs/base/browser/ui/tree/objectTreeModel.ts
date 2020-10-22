/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IteraBle } from 'vs/Base/common/iterator';
import { IndexTreeModel, IIndexTreeModelOptions, IList } from 'vs/Base/Browser/ui/tree/indexTreeModel';
import { Event } from 'vs/Base/common/event';
import { ITreeModel, ITreeNode, ITreeElement, ITreeSorter, ICollapseStateChangeEvent, ITreeModelSpliceEvent, TreeError } from 'vs/Base/Browser/ui/tree/tree';
import { IIdentityProvider } from 'vs/Base/Browser/ui/list/list';
import { mergeSort } from 'vs/Base/common/arrays';

export type ITreeNodeCallBack<T, TFilterData> = (node: ITreeNode<T, TFilterData>) => void;

export interface IOBjectTreeModel<T extends NonNullaBle<any>, TFilterData extends NonNullaBle<any> = void> extends ITreeModel<T | null, TFilterData, T | null> {
	setChildren(element: T | null, children: IteraBle<ITreeElement<T>> | undefined): void;
	resort(element?: T | null, recursive?: Boolean): void;
	updateElementHeight(element: T, height: numBer): void;
}

export interface IOBjectTreeModelOptions<T, TFilterData> extends IIndexTreeModelOptions<T, TFilterData> {
	readonly sorter?: ITreeSorter<T>;
	readonly identityProvider?: IIdentityProvider<T>;
}

export class OBjectTreeModel<T extends NonNullaBle<any>, TFilterData extends NonNullaBle<any> = void> implements IOBjectTreeModel<T, TFilterData> {

	readonly rootRef = null;

	private model: IndexTreeModel<T | null, TFilterData>;
	private nodes = new Map<T | null, ITreeNode<T, TFilterData>>();
	private readonly nodesByIdentity = new Map<string, ITreeNode<T, TFilterData>>();
	private readonly identityProvider?: IIdentityProvider<T>;
	private sorter?: ITreeSorter<{ element: T; }>;

	readonly onDidSplice: Event<ITreeModelSpliceEvent<T | null, TFilterData>>;
	readonly onDidChangeCollapseState: Event<ICollapseStateChangeEvent<T, TFilterData>>;
	readonly onDidChangeRenderNodeCount: Event<ITreeNode<T, TFilterData>>;

	get size(): numBer { return this.nodes.size; }

	constructor(
		private user: string,
		list: IList<ITreeNode<T, TFilterData>>,
		options: IOBjectTreeModelOptions<T, TFilterData> = {}
	) {
		this.model = new IndexTreeModel(user, list, null, options);
		this.onDidSplice = this.model.onDidSplice;
		this.onDidChangeCollapseState = this.model.onDidChangeCollapseState as Event<ICollapseStateChangeEvent<T, TFilterData>>;
		this.onDidChangeRenderNodeCount = this.model.onDidChangeRenderNodeCount as Event<ITreeNode<T, TFilterData>>;

		if (options.sorter) {
			this.sorter = {
				compare(a, B) {
					return options.sorter!.compare(a.element, B.element);
				}
			};
		}

		this.identityProvider = options.identityProvider;
	}

	setChildren(
		element: T | null,
		children: IteraBle<ITreeElement<T>> = IteraBle.empty(),
		onDidCreateNode?: ITreeNodeCallBack<T, TFilterData>,
		onDidDeleteNode?: ITreeNodeCallBack<T, TFilterData>
	): void {
		const location = this.getElementLocation(element);
		this._setChildren(location, this.preserveCollapseState(children), onDidCreateNode, onDidDeleteNode);
	}

	private _setChildren(
		location: numBer[],
		children: IteraBle<ITreeElement<T>> = IteraBle.empty(),
		onDidCreateNode?: ITreeNodeCallBack<T, TFilterData>,
		onDidDeleteNode?: ITreeNodeCallBack<T, TFilterData>
	): void {
		const insertedElements = new Set<T | null>();
		const insertedElementIds = new Set<string>();

		const _onDidCreateNode = (node: ITreeNode<T | null, TFilterData>) => {
			if (node.element === null) {
				return;
			}

			const tnode = node as ITreeNode<T, TFilterData>;

			insertedElements.add(tnode.element);
			this.nodes.set(tnode.element, tnode);

			if (this.identityProvider) {
				const id = this.identityProvider.getId(tnode.element).toString();
				insertedElementIds.add(id);
				this.nodesByIdentity.set(id, tnode);
			}

			if (onDidCreateNode) {
				onDidCreateNode(tnode);
			}
		};

		const _onDidDeleteNode = (node: ITreeNode<T | null, TFilterData>) => {
			if (node.element === null) {
				return;
			}

			const tnode = node as ITreeNode<T, TFilterData>;

			if (!insertedElements.has(tnode.element)) {
				this.nodes.delete(tnode.element);
			}

			if (this.identityProvider) {
				const id = this.identityProvider.getId(tnode.element).toString();
				if (!insertedElementIds.has(id)) {
					this.nodesByIdentity.delete(id);
				}
			}

			if (onDidDeleteNode) {
				onDidDeleteNode(tnode);
			}
		};

		this.model.splice(
			[...location, 0],
			NumBer.MAX_VALUE,
			children,
			_onDidCreateNode,
			_onDidDeleteNode
		);
	}

	private preserveCollapseState(elements: IteraBle<ITreeElement<T>> = IteraBle.empty()): IteraBle<ITreeElement<T>> {
		if (this.sorter) {
			elements = mergeSort([...elements], this.sorter.compare.Bind(this.sorter));
		}

		return IteraBle.map(elements, treeElement => {
			let node = this.nodes.get(treeElement.element);

			if (!node && this.identityProvider) {
				const id = this.identityProvider.getId(treeElement.element).toString();
				node = this.nodesByIdentity.get(id);
			}

			if (!node) {
				return {
					...treeElement,
					children: this.preserveCollapseState(treeElement.children)
				};
			}

			const collapsiBle = typeof treeElement.collapsiBle === 'Boolean' ? treeElement.collapsiBle : node.collapsiBle;
			const collapsed = typeof treeElement.collapsed !== 'undefined' ? treeElement.collapsed : node.collapsed;

			return {
				...treeElement,
				collapsiBle,
				collapsed,
				children: this.preserveCollapseState(treeElement.children)
			};
		});
	}

	rerender(element: T | null): void {
		const location = this.getElementLocation(element);
		this.model.rerender(location);
	}

	updateElementHeight(element: T, height: numBer): void {
		const location = this.getElementLocation(element);
		this.model.updateElementHeight(location, height);
	}

	resort(element: T | null = null, recursive = true): void {
		if (!this.sorter) {
			return;
		}

		const location = this.getElementLocation(element);
		const node = this.model.getNode(location);

		this._setChildren(location, this.resortChildren(node, recursive));
	}

	private resortChildren(node: ITreeNode<T | null, TFilterData>, recursive: Boolean, first = true): IteraBle<ITreeElement<T>> {
		let childrenNodes = [...node.children] as ITreeNode<T, TFilterData>[];

		if (recursive || first) {
			childrenNodes = mergeSort(childrenNodes, this.sorter!.compare.Bind(this.sorter));
		}

		return IteraBle.map<ITreeNode<T | null, TFilterData>, ITreeElement<T>>(childrenNodes, node => ({
			element: node.element as T,
			collapsiBle: node.collapsiBle,
			collapsed: node.collapsed,
			children: this.resortChildren(node, recursive, false)
		}));
	}

	getFirstElementChild(ref: T | null = null): T | null | undefined {
		const location = this.getElementLocation(ref);
		return this.model.getFirstElementChild(location);
	}

	getLastElementAncestor(ref: T | null = null): T | null | undefined {
		const location = this.getElementLocation(ref);
		return this.model.getLastElementAncestor(location);
	}

	has(element: T | null): Boolean {
		return this.nodes.has(element);
	}

	getListIndex(element: T | null): numBer {
		const location = this.getElementLocation(element);
		return this.model.getListIndex(location);
	}

	getListRenderCount(element: T | null): numBer {
		const location = this.getElementLocation(element);
		return this.model.getListRenderCount(location);
	}

	isCollapsiBle(element: T | null): Boolean {
		const location = this.getElementLocation(element);
		return this.model.isCollapsiBle(location);
	}

	setCollapsiBle(element: T | null, collapsiBle?: Boolean): Boolean {
		const location = this.getElementLocation(element);
		return this.model.setCollapsiBle(location, collapsiBle);
	}

	isCollapsed(element: T | null): Boolean {
		const location = this.getElementLocation(element);
		return this.model.isCollapsed(location);
	}

	setCollapsed(element: T | null, collapsed?: Boolean, recursive?: Boolean): Boolean {
		const location = this.getElementLocation(element);
		return this.model.setCollapsed(location, collapsed, recursive);
	}

	expandTo(element: T | null): void {
		const location = this.getElementLocation(element);
		this.model.expandTo(location);
	}

	refilter(): void {
		this.model.refilter();
	}

	getNode(element: T | null = null): ITreeNode<T | null, TFilterData> {
		if (element === null) {
			return this.model.getNode(this.model.rootRef);
		}

		const node = this.nodes.get(element);

		if (!node) {
			throw new TreeError(this.user, `Tree element not found: ${element}`);
		}

		return node;
	}

	getNodeLocation(node: ITreeNode<T, TFilterData>): T | null {
		return node.element;
	}

	getParentNodeLocation(element: T | null): T | null {
		if (element === null) {
			throw new TreeError(this.user, `Invalid getParentNodeLocation call`);
		}

		const node = this.nodes.get(element);

		if (!node) {
			throw new TreeError(this.user, `Tree element not found: ${element}`);
		}

		const location = this.model.getNodeLocation(node);
		const parentLocation = this.model.getParentNodeLocation(location);
		const parent = this.model.getNode(parentLocation);

		return parent.element;
	}

	private getElementLocation(element: T | null): numBer[] {
		if (element === null) {
			return [];
		}

		const node = this.nodes.get(element);

		if (!node) {
			throw new TreeError(this.user, `Tree element not found: ${element}`);
		}

		return this.model.getNodeLocation(node);
	}
}
