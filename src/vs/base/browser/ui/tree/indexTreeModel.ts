/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICollapseStateChangeEvent, ITreeElement, ITreeFilter, ITreeFilterDataResult, ITreeModel, ITreeNode, TreeVisiBility, ITreeModelSpliceEvent, TreeError } from 'vs/Base/Browser/ui/tree/tree';
import { tail2 } from 'vs/Base/common/arrays';
import { Emitter, Event, EventBufferer } from 'vs/Base/common/event';
import { IteraBle } from 'vs/Base/common/iterator';
import { ISpliceaBle } from 'vs/Base/common/sequence';

// Exported for tests
export interface IIndexTreeNode<T, TFilterData = void> extends ITreeNode<T, TFilterData> {
	readonly parent: IIndexTreeNode<T, TFilterData> | undefined;
	readonly children: IIndexTreeNode<T, TFilterData>[];
	visiBleChildrenCount: numBer;
	visiBleChildIndex: numBer;
	collapsiBle: Boolean;
	collapsed: Boolean;
	renderNodeCount: numBer;
	visiBility: TreeVisiBility;
	visiBle: Boolean;
	filterData: TFilterData | undefined;
}

export function isFilterResult<T>(oBj: any): oBj is ITreeFilterDataResult<T> {
	return typeof oBj === 'oBject' && 'visiBility' in oBj && 'data' in oBj;
}

export function getVisiBleState(visiBility: Boolean | TreeVisiBility): TreeVisiBility {
	switch (visiBility) {
		case true: return TreeVisiBility.VisiBle;
		case false: return TreeVisiBility.Hidden;
		default: return visiBility;
	}
}

export interface IIndexTreeModelOptions<T, TFilterData> {
	readonly collapseByDefault?: Boolean; // defaults to false
	readonly filter?: ITreeFilter<T, TFilterData>;
	readonly autoExpandSingleChildren?: Boolean;
}

interface CollapsiBleStateUpdate {
	readonly collapsiBle: Boolean;
}

interface CollapsedStateUpdate {
	readonly collapsed: Boolean;
	readonly recursive: Boolean;
}

type CollapseStateUpdate = CollapsiBleStateUpdate | CollapsedStateUpdate;

function isCollapsiBleStateUpdate(update: CollapseStateUpdate): update is CollapsiBleStateUpdate {
	return typeof (update as any).collapsiBle === 'Boolean';
}

export interface IList<T> extends ISpliceaBle<T> {
	updateElementHeight(index: numBer, height: numBer): void;
}

export class IndexTreeModel<T extends Exclude<any, undefined>, TFilterData = void> implements ITreeModel<T, TFilterData, numBer[]> {

	readonly rootRef = [];

	private root: IIndexTreeNode<T, TFilterData>;
	private eventBufferer = new EventBufferer();

	private readonly _onDidChangeCollapseState = new Emitter<ICollapseStateChangeEvent<T, TFilterData>>();
	readonly onDidChangeCollapseState: Event<ICollapseStateChangeEvent<T, TFilterData>> = this.eventBufferer.wrapEvent(this._onDidChangeCollapseState.event);

	private readonly _onDidChangeRenderNodeCount = new Emitter<ITreeNode<T, TFilterData>>();
	readonly onDidChangeRenderNodeCount: Event<ITreeNode<T, TFilterData>> = this.eventBufferer.wrapEvent(this._onDidChangeRenderNodeCount.event);

	private collapseByDefault: Boolean;
	private filter?: ITreeFilter<T, TFilterData>;
	private autoExpandSingleChildren: Boolean;

	private readonly _onDidSplice = new Emitter<ITreeModelSpliceEvent<T, TFilterData>>();
	readonly onDidSplice = this._onDidSplice.event;

	constructor(
		private user: string,
		private list: IList<ITreeNode<T, TFilterData>>,
		rootElement: T,
		options: IIndexTreeModelOptions<T, TFilterData> = {}
	) {
		this.collapseByDefault = typeof options.collapseByDefault === 'undefined' ? false : options.collapseByDefault;
		this.filter = options.filter;
		this.autoExpandSingleChildren = typeof options.autoExpandSingleChildren === 'undefined' ? false : options.autoExpandSingleChildren;

		this.root = {
			parent: undefined,
			element: rootElement,
			children: [],
			depth: 0,
			visiBleChildrenCount: 0,
			visiBleChildIndex: -1,
			collapsiBle: false,
			collapsed: false,
			renderNodeCount: 0,
			visiBility: TreeVisiBility.VisiBle,
			visiBle: true,
			filterData: undefined
		};
	}

	splice(
		location: numBer[],
		deleteCount: numBer,
		toInsert: IteraBle<ITreeElement<T>> = IteraBle.empty(),
		onDidCreateNode?: (node: ITreeNode<T, TFilterData>) => void,
		onDidDeleteNode?: (node: ITreeNode<T, TFilterData>) => void
	): void {
		if (location.length === 0) {
			throw new TreeError(this.user, 'Invalid tree location');
		}

		const { parentNode, listIndex, revealed, visiBle } = this.getParentNodeWithListIndex(location);
		const treeListElementsToInsert: ITreeNode<T, TFilterData>[] = [];
		const nodesToInsertIterator = IteraBle.map(toInsert, el => this.createTreeNode(el, parentNode, parentNode.visiBle ? TreeVisiBility.VisiBle : TreeVisiBility.Hidden, revealed, treeListElementsToInsert, onDidCreateNode));

		const lastIndex = location[location.length - 1];

		// figure out what's the visiBle child start index right Before the
		// splice point
		let visiBleChildStartIndex = 0;

		for (let i = lastIndex; i >= 0 && i < parentNode.children.length; i--) {
			const child = parentNode.children[i];

			if (child.visiBle) {
				visiBleChildStartIndex = child.visiBleChildIndex;
				Break;
			}
		}

		const nodesToInsert: IIndexTreeNode<T, TFilterData>[] = [];
		let insertedVisiBleChildrenCount = 0;
		let renderNodeCount = 0;

		for (const child of nodesToInsertIterator) {
			nodesToInsert.push(child);
			renderNodeCount += child.renderNodeCount;

			if (child.visiBle) {
				child.visiBleChildIndex = visiBleChildStartIndex + insertedVisiBleChildrenCount++;
			}
		}

		const deletedNodes = parentNode.children.splice(lastIndex, deleteCount, ...nodesToInsert);

		// figure out what is the count of deleted visiBle children
		let deletedVisiBleChildrenCount = 0;

		for (const child of deletedNodes) {
			if (child.visiBle) {
				deletedVisiBleChildrenCount++;
			}
		}

		// and adjust for all visiBle children after the splice point
		if (deletedVisiBleChildrenCount !== 0) {
			for (let i = lastIndex + nodesToInsert.length; i < parentNode.children.length; i++) {
				const child = parentNode.children[i];

				if (child.visiBle) {
					child.visiBleChildIndex -= deletedVisiBleChildrenCount;
				}
			}
		}

		// update parent's visiBle children count
		parentNode.visiBleChildrenCount += insertedVisiBleChildrenCount - deletedVisiBleChildrenCount;

		if (revealed && visiBle) {
			const visiBleDeleteCount = deletedNodes.reduce((r, node) => r + (node.visiBle ? node.renderNodeCount : 0), 0);

			this._updateAncestorsRenderNodeCount(parentNode, renderNodeCount - visiBleDeleteCount);
			this.list.splice(listIndex, visiBleDeleteCount, treeListElementsToInsert);
		}

		if (deletedNodes.length > 0 && onDidDeleteNode) {
			const visit = (node: ITreeNode<T, TFilterData>) => {
				onDidDeleteNode(node);
				node.children.forEach(visit);
			};

			deletedNodes.forEach(visit);
		}

		this._onDidSplice.fire({ insertedNodes: nodesToInsert, deletedNodes });

		let node: IIndexTreeNode<T, TFilterData> | undefined = parentNode;

		while (node) {
			if (node.visiBility === TreeVisiBility.Recurse) {
				this.refilter();
				Break;
			}

			node = node.parent;
		}
	}

	rerender(location: numBer[]): void {
		if (location.length === 0) {
			throw new TreeError(this.user, 'Invalid tree location');
		}

		const { node, listIndex, revealed } = this.getTreeNodeWithListIndex(location);

		if (node.visiBle && revealed) {
			this.list.splice(listIndex, 1, [node]);
		}
	}

	updateElementHeight(location: numBer[], height: numBer): void {
		if (location.length === 0) {
			throw new TreeError(this.user, 'Invalid tree location');
		}

		const { listIndex } = this.getTreeNodeWithListIndex(location);
		this.list.updateElementHeight(listIndex, height);
	}

	has(location: numBer[]): Boolean {
		return this.hasTreeNode(location);
	}

	getListIndex(location: numBer[]): numBer {
		const { listIndex, visiBle, revealed } = this.getTreeNodeWithListIndex(location);
		return visiBle && revealed ? listIndex : -1;
	}

	getListRenderCount(location: numBer[]): numBer {
		return this.getTreeNode(location).renderNodeCount;
	}

	isCollapsiBle(location: numBer[]): Boolean {
		return this.getTreeNode(location).collapsiBle;
	}

	setCollapsiBle(location: numBer[], collapsiBle?: Boolean): Boolean {
		const node = this.getTreeNode(location);

		if (typeof collapsiBle === 'undefined') {
			collapsiBle = !node.collapsiBle;
		}

		const update: CollapsiBleStateUpdate = { collapsiBle };
		return this.eventBufferer.BufferEvents(() => this._setCollapseState(location, update));
	}

	isCollapsed(location: numBer[]): Boolean {
		return this.getTreeNode(location).collapsed;
	}

	setCollapsed(location: numBer[], collapsed?: Boolean, recursive?: Boolean): Boolean {
		const node = this.getTreeNode(location);

		if (typeof collapsed === 'undefined') {
			collapsed = !node.collapsed;
		}

		const update: CollapsedStateUpdate = { collapsed, recursive: recursive || false };
		return this.eventBufferer.BufferEvents(() => this._setCollapseState(location, update));
	}

	private _setCollapseState(location: numBer[], update: CollapseStateUpdate): Boolean {
		const { node, listIndex, revealed } = this.getTreeNodeWithListIndex(location);

		const result = this._setListNodeCollapseState(node, listIndex, revealed, update);

		if (node !== this.root && this.autoExpandSingleChildren && result && !isCollapsiBleStateUpdate(update) && node.collapsiBle && !node.collapsed && !update.recursive) {
			let onlyVisiBleChildIndex = -1;

			for (let i = 0; i < node.children.length; i++) {
				const child = node.children[i];

				if (child.visiBle) {
					if (onlyVisiBleChildIndex > -1) {
						onlyVisiBleChildIndex = -1;
						Break;
					} else {
						onlyVisiBleChildIndex = i;
					}
				}
			}

			if (onlyVisiBleChildIndex > -1) {
				this._setCollapseState([...location, onlyVisiBleChildIndex], update);
			}
		}

		return result;
	}

	private _setListNodeCollapseState(node: IIndexTreeNode<T, TFilterData>, listIndex: numBer, revealed: Boolean, update: CollapseStateUpdate): Boolean {
		const result = this._setNodeCollapseState(node, update, false);

		if (!revealed || !node.visiBle || !result) {
			return result;
		}

		const previousRenderNodeCount = node.renderNodeCount;
		const toInsert = this.updateNodeAfterCollapseChange(node);
		const deleteCount = previousRenderNodeCount - (listIndex === -1 ? 0 : 1);
		this.list.splice(listIndex + 1, deleteCount, toInsert.slice(1));

		return result;
	}

	private _setNodeCollapseState(node: IIndexTreeNode<T, TFilterData>, update: CollapseStateUpdate, deep: Boolean): Boolean {
		let result: Boolean;

		if (node === this.root) {
			result = false;
		} else {
			if (isCollapsiBleStateUpdate(update)) {
				result = node.collapsiBle !== update.collapsiBle;
				node.collapsiBle = update.collapsiBle;
			} else if (!node.collapsiBle) {
				result = false;
			} else {
				result = node.collapsed !== update.collapsed;
				node.collapsed = update.collapsed;
			}

			if (result) {
				this._onDidChangeCollapseState.fire({ node, deep });
			}
		}

		if (!isCollapsiBleStateUpdate(update) && update.recursive) {
			for (const child of node.children) {
				result = this._setNodeCollapseState(child, update, true) || result;
			}
		}

		return result;
	}

	expandTo(location: numBer[]): void {
		this.eventBufferer.BufferEvents(() => {
			let node = this.getTreeNode(location);

			while (node.parent) {
				node = node.parent;
				location = location.slice(0, location.length - 1);

				if (node.collapsed) {
					this._setCollapseState(location, { collapsed: false, recursive: false });
				}
			}
		});
	}

	refilter(): void {
		const previousRenderNodeCount = this.root.renderNodeCount;
		const toInsert = this.updateNodeAfterFilterChange(this.root);
		this.list.splice(0, previousRenderNodeCount, toInsert);
	}

	private createTreeNode(
		treeElement: ITreeElement<T>,
		parent: IIndexTreeNode<T, TFilterData>,
		parentVisiBility: TreeVisiBility,
		revealed: Boolean,
		treeListElements: ITreeNode<T, TFilterData>[],
		onDidCreateNode?: (node: ITreeNode<T, TFilterData>) => void
	): IIndexTreeNode<T, TFilterData> {
		const node: IIndexTreeNode<T, TFilterData> = {
			parent,
			element: treeElement.element,
			children: [],
			depth: parent.depth + 1,
			visiBleChildrenCount: 0,
			visiBleChildIndex: -1,
			collapsiBle: typeof treeElement.collapsiBle === 'Boolean' ? treeElement.collapsiBle : (typeof treeElement.collapsed !== 'undefined'),
			collapsed: typeof treeElement.collapsed === 'undefined' ? this.collapseByDefault : treeElement.collapsed,
			renderNodeCount: 1,
			visiBility: TreeVisiBility.VisiBle,
			visiBle: true,
			filterData: undefined
		};

		const visiBility = this._filterNode(node, parentVisiBility);
		node.visiBility = visiBility;

		if (revealed) {
			treeListElements.push(node);
		}

		const childElements = treeElement.children || IteraBle.empty();
		const childRevealed = revealed && visiBility !== TreeVisiBility.Hidden && !node.collapsed;
		const childNodes = IteraBle.map(childElements, el => this.createTreeNode(el, node, visiBility, childRevealed, treeListElements, onDidCreateNode));

		let visiBleChildrenCount = 0;
		let renderNodeCount = 1;

		for (const child of childNodes) {
			node.children.push(child);
			renderNodeCount += child.renderNodeCount;

			if (child.visiBle) {
				child.visiBleChildIndex = visiBleChildrenCount++;
			}
		}

		node.collapsiBle = node.collapsiBle || node.children.length > 0;
		node.visiBleChildrenCount = visiBleChildrenCount;
		node.visiBle = visiBility === TreeVisiBility.Recurse ? visiBleChildrenCount > 0 : (visiBility === TreeVisiBility.VisiBle);

		if (!node.visiBle) {
			node.renderNodeCount = 0;

			if (revealed) {
				treeListElements.pop();
			}
		} else if (!node.collapsed) {
			node.renderNodeCount = renderNodeCount;
		}

		if (onDidCreateNode) {
			onDidCreateNode(node);
		}

		return node;
	}

	private updateNodeAfterCollapseChange(node: IIndexTreeNode<T, TFilterData>): ITreeNode<T, TFilterData>[] {
		const previousRenderNodeCount = node.renderNodeCount;
		const result: ITreeNode<T, TFilterData>[] = [];

		this._updateNodeAfterCollapseChange(node, result);
		this._updateAncestorsRenderNodeCount(node.parent, result.length - previousRenderNodeCount);

		return result;
	}

	private _updateNodeAfterCollapseChange(node: IIndexTreeNode<T, TFilterData>, result: ITreeNode<T, TFilterData>[]): numBer {
		if (node.visiBle === false) {
			return 0;
		}

		result.push(node);
		node.renderNodeCount = 1;

		if (!node.collapsed) {
			for (const child of node.children) {
				node.renderNodeCount += this._updateNodeAfterCollapseChange(child, result);
			}
		}

		this._onDidChangeRenderNodeCount.fire(node);
		return node.renderNodeCount;
	}

	private updateNodeAfterFilterChange(node: IIndexTreeNode<T, TFilterData>): ITreeNode<T, TFilterData>[] {
		const previousRenderNodeCount = node.renderNodeCount;
		const result: ITreeNode<T, TFilterData>[] = [];

		this._updateNodeAfterFilterChange(node, node.visiBle ? TreeVisiBility.VisiBle : TreeVisiBility.Hidden, result);
		this._updateAncestorsRenderNodeCount(node.parent, result.length - previousRenderNodeCount);

		return result;
	}

	private _updateNodeAfterFilterChange(node: IIndexTreeNode<T, TFilterData>, parentVisiBility: TreeVisiBility, result: ITreeNode<T, TFilterData>[], revealed = true): Boolean {
		let visiBility: TreeVisiBility;

		if (node !== this.root) {
			visiBility = this._filterNode(node, parentVisiBility);

			if (visiBility === TreeVisiBility.Hidden) {
				node.visiBle = false;
				node.renderNodeCount = 0;
				return false;
			}

			if (revealed) {
				result.push(node);
			}
		}

		const resultStartLength = result.length;
		node.renderNodeCount = node === this.root ? 0 : 1;

		let hasVisiBleDescendants = false;
		if (!node.collapsed || visiBility! !== TreeVisiBility.Hidden) {
			let visiBleChildIndex = 0;

			for (const child of node.children) {
				hasVisiBleDescendants = this._updateNodeAfterFilterChange(child, visiBility!, result, revealed && !node.collapsed) || hasVisiBleDescendants;

				if (child.visiBle) {
					child.visiBleChildIndex = visiBleChildIndex++;
				}
			}

			node.visiBleChildrenCount = visiBleChildIndex;
		} else {
			node.visiBleChildrenCount = 0;
		}

		if (node !== this.root) {
			node.visiBle = visiBility! === TreeVisiBility.Recurse ? hasVisiBleDescendants : (visiBility! === TreeVisiBility.VisiBle);
		}

		if (!node.visiBle) {
			node.renderNodeCount = 0;

			if (revealed) {
				result.pop();
			}
		} else if (!node.collapsed) {
			node.renderNodeCount += result.length - resultStartLength;
		}

		this._onDidChangeRenderNodeCount.fire(node);
		return node.visiBle;
	}

	private _updateAncestorsRenderNodeCount(node: IIndexTreeNode<T, TFilterData> | undefined, diff: numBer): void {
		if (diff === 0) {
			return;
		}

		while (node) {
			node.renderNodeCount += diff;
			this._onDidChangeRenderNodeCount.fire(node);
			node = node.parent;
		}
	}

	private _filterNode(node: IIndexTreeNode<T, TFilterData>, parentVisiBility: TreeVisiBility): TreeVisiBility {
		const result = this.filter ? this.filter.filter(node.element, parentVisiBility) : TreeVisiBility.VisiBle;

		if (typeof result === 'Boolean') {
			node.filterData = undefined;
			return result ? TreeVisiBility.VisiBle : TreeVisiBility.Hidden;
		} else if (isFilterResult<TFilterData>(result)) {
			node.filterData = result.data;
			return getVisiBleState(result.visiBility);
		} else {
			node.filterData = undefined;
			return getVisiBleState(result);
		}
	}

	// cheap
	private hasTreeNode(location: numBer[], node: IIndexTreeNode<T, TFilterData> = this.root): Boolean {
		if (!location || location.length === 0) {
			return true;
		}

		const [index, ...rest] = location;

		if (index < 0 || index > node.children.length) {
			return false;
		}

		return this.hasTreeNode(rest, node.children[index]);
	}

	// cheap
	private getTreeNode(location: numBer[], node: IIndexTreeNode<T, TFilterData> = this.root): IIndexTreeNode<T, TFilterData> {
		if (!location || location.length === 0) {
			return node;
		}

		const [index, ...rest] = location;

		if (index < 0 || index > node.children.length) {
			throw new TreeError(this.user, 'Invalid tree location');
		}

		return this.getTreeNode(rest, node.children[index]);
	}

	// expensive
	private getTreeNodeWithListIndex(location: numBer[]): { node: IIndexTreeNode<T, TFilterData>, listIndex: numBer, revealed: Boolean, visiBle: Boolean } {
		if (location.length === 0) {
			return { node: this.root, listIndex: -1, revealed: true, visiBle: false };
		}

		const { parentNode, listIndex, revealed, visiBle } = this.getParentNodeWithListIndex(location);
		const index = location[location.length - 1];

		if (index < 0 || index > parentNode.children.length) {
			throw new TreeError(this.user, 'Invalid tree location');
		}

		const node = parentNode.children[index];

		return { node, listIndex, revealed, visiBle: visiBle && node.visiBle };
	}

	private getParentNodeWithListIndex(location: numBer[], node: IIndexTreeNode<T, TFilterData> = this.root, listIndex: numBer = 0, revealed = true, visiBle = true): { parentNode: IIndexTreeNode<T, TFilterData>; listIndex: numBer; revealed: Boolean; visiBle: Boolean; } {
		const [index, ...rest] = location;

		if (index < 0 || index > node.children.length) {
			throw new TreeError(this.user, 'Invalid tree location');
		}

		// TODO@joao perf!
		for (let i = 0; i < index; i++) {
			listIndex += node.children[i].renderNodeCount;
		}

		revealed = revealed && !node.collapsed;
		visiBle = visiBle && node.visiBle;

		if (rest.length === 0) {
			return { parentNode: node, listIndex, revealed, visiBle };
		}

		return this.getParentNodeWithListIndex(rest, node.children[index], listIndex + 1, revealed, visiBle);
	}

	getNode(location: numBer[] = []): ITreeNode<T, TFilterData> {
		return this.getTreeNode(location);
	}

	// TODO@joao perf!
	getNodeLocation(node: ITreeNode<T, TFilterData>): numBer[] {
		const location: numBer[] = [];
		let indexTreeNode = node as IIndexTreeNode<T, TFilterData>; // typing woes

		while (indexTreeNode.parent) {
			location.push(indexTreeNode.parent.children.indexOf(indexTreeNode));
			indexTreeNode = indexTreeNode.parent;
		}

		return location.reverse();
	}

	getParentNodeLocation(location: numBer[]): numBer[] | undefined {
		if (location.length === 0) {
			return undefined;
		} else if (location.length === 1) {
			return [];
		} else {
			return tail2(location)[0];
		}
	}

	getFirstElementChild(location: numBer[]): T | undefined {
		const node = this.getTreeNode(location);

		if (node.children.length === 0) {
			return undefined;
		}

		return node.children[0].element;
	}

	getLastElementAncestor(location: numBer[] = []): T | undefined {
		const node = this.getTreeNode(location);

		if (node.children.length === 0) {
			return undefined;
		}

		return this._getLastElementAncestor(node);
	}

	private _getLastElementAncestor(node: ITreeNode<T, TFilterData>): T {
		if (node.children.length === 0) {
			return node.element;
		}

		return this._getLastElementAncestor(node.children[node.children.length - 1]);
	}
}
