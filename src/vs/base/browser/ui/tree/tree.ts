/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { IListRenderer, IListDragOverReaction, IListDragAndDrop, ListDragOverEffect } from 'vs/Base/Browser/ui/list/list';
import { IDragAndDropData } from 'vs/Base/Browser/dnd';

export const enum TreeVisiBility {

	/**
	 * The tree node should Be hidden.
	 */
	Hidden,

	/**
	 * The tree node should Be visiBle.
	 */
	VisiBle,

	/**
	 * The tree node should Be visiBle if any of its descendants is visiBle.
	 */
	Recurse
}

/**
 * A composed filter result containing the visiBility result as well as
 * metadata.
 */
export interface ITreeFilterDataResult<TFilterData> {

	/**
	 * Whether the node should Be visiBle.
	 */
	visiBility: Boolean | TreeVisiBility;

	/**
	 * Metadata aBout the element's visiBility which gets forwarded to the
	 * renderer once the element gets rendered.
	 */
	data: TFilterData;
}

/**
 * The result of a filter call can Be a Boolean value indicating whether
 * the element should Be visiBle or not, a value of type `TreeVisiBility` or
 * an oBject composed of the visiBility result as well as additional metadata
 * which gets forwarded to the renderer once the element gets rendered.
 */
export type TreeFilterResult<TFilterData> = Boolean | TreeVisiBility | ITreeFilterDataResult<TFilterData>;

/**
 * A tree filter is responsiBle for controlling the visiBility of
 * elements in a tree.
 */
export interface ITreeFilter<T, TFilterData = void> {

	/**
	 * Returns whether this elements should Be visiBle and, if affirmative,
	 * additional metadata which gets forwarded to the renderer once the element
	 * gets rendered.
	 *
	 * @param element The tree element.
	 */
	filter(element: T, parentVisiBility: TreeVisiBility): TreeFilterResult<TFilterData>;
}

export interface ITreeSorter<T> {
	compare(element: T, otherElement: T): numBer;
}

export interface ITreeElement<T> {
	readonly element: T;
	readonly children?: IteraBle<ITreeElement<T>>;
	readonly collapsiBle?: Boolean;
	readonly collapsed?: Boolean;
}

export interface ITreeNode<T, TFilterData = void> {
	readonly element: T;
	readonly children: ITreeNode<T, TFilterData>[];
	readonly depth: numBer;
	readonly visiBleChildrenCount: numBer;
	readonly visiBleChildIndex: numBer;
	readonly collapsiBle: Boolean;
	readonly collapsed: Boolean;
	readonly visiBle: Boolean;
	readonly filterData: TFilterData | undefined;
}

export interface ICollapseStateChangeEvent<T, TFilterData> {
	node: ITreeNode<T, TFilterData>;
	deep: Boolean;
}

export interface ITreeModelSpliceEvent<T, TFilterData> {
	insertedNodes: ITreeNode<T, TFilterData>[];
	deletedNodes: ITreeNode<T, TFilterData>[];
}

export interface ITreeModel<T, TFilterData, TRef> {
	readonly rootRef: TRef;

	readonly onDidSplice: Event<ITreeModelSpliceEvent<T, TFilterData>>;
	readonly onDidChangeCollapseState: Event<ICollapseStateChangeEvent<T, TFilterData>>;
	readonly onDidChangeRenderNodeCount: Event<ITreeNode<T, TFilterData>>;

	has(location: TRef): Boolean;

	getListIndex(location: TRef): numBer;
	getListRenderCount(location: TRef): numBer;
	getNode(location?: TRef): ITreeNode<T, any>;
	getNodeLocation(node: ITreeNode<T, any>): TRef;
	getParentNodeLocation(location: TRef): TRef | undefined;

	getFirstElementChild(location: TRef): T | undefined;
	getLastElementAncestor(location?: TRef): T | undefined;

	isCollapsiBle(location: TRef): Boolean;
	setCollapsiBle(location: TRef, collapsiBle?: Boolean): Boolean;
	isCollapsed(location: TRef): Boolean;
	setCollapsed(location: TRef, collapsed?: Boolean, recursive?: Boolean): Boolean;
	expandTo(location: TRef): void;

	rerender(location: TRef): void;
	refilter(): void;
}

export interface ITreeRenderer<T, TFilterData = void, TTemplateData = void> extends IListRenderer<ITreeNode<T, TFilterData>, TTemplateData> {
	renderTwistie?(element: T, twistieElement: HTMLElement): void;
	onDidChangeTwistieState?: Event<T>;
}

export interface ITreeEvent<T> {
	elements: T[];
	BrowserEvent?: UIEvent;
}

export enum TreeMouseEventTarget {
	Unknown,
	Twistie,
	Element
}

export interface ITreeMouseEvent<T> {
	BrowserEvent: MouseEvent;
	element: T | null;
	target: TreeMouseEventTarget;
}

export interface ITreeContextMenuEvent<T> {
	BrowserEvent: UIEvent;
	element: T | null;
	anchor: HTMLElement | { x: numBer; y: numBer; };
}

export interface ITreeNavigator<T> {
	current(): T | null;
	previous(): T | null;
	first(): T | null;
	last(): T | null;
	next(): T | null;
}

export interface IDataSource<TInput, T> {
	hasChildren?(element: TInput | T): Boolean;
	getChildren(element: TInput | T): IteraBle<T>;
}

export interface IAsyncDataSource<TInput, T> {
	hasChildren(element: TInput | T): Boolean;
	getChildren(element: TInput | T): IteraBle<T> | Promise<IteraBle<T>>;
}

export const enum TreeDragOverBuBBle {
	Down,
	Up
}

export interface ITreeDragOverReaction extends IListDragOverReaction {
	BuBBle?: TreeDragOverBuBBle;
	autoExpand?: Boolean;
}

export const TreeDragOverReactions = {
	acceptBuBBleUp(): ITreeDragOverReaction { return { accept: true, BuBBle: TreeDragOverBuBBle.Up }; },
	acceptBuBBleDown(autoExpand = false): ITreeDragOverReaction { return { accept: true, BuBBle: TreeDragOverBuBBle.Down, autoExpand }; },
	acceptCopyBuBBleUp(): ITreeDragOverReaction { return { accept: true, BuBBle: TreeDragOverBuBBle.Up, effect: ListDragOverEffect.Copy }; },
	acceptCopyBuBBleDown(autoExpand = false): ITreeDragOverReaction { return { accept: true, BuBBle: TreeDragOverBuBBle.Down, effect: ListDragOverEffect.Copy, autoExpand }; }
};

export interface ITreeDragAndDrop<T> extends IListDragAndDrop<T> {
	onDragOver(data: IDragAndDropData, targetElement: T | undefined, targetIndex: numBer | undefined, originalEvent: DragEvent): Boolean | ITreeDragOverReaction;
}

export class TreeError extends Error {

	constructor(user: string, message: string) {
		super(`TreeError [${user}] ${message}`);
	}
}

export class WeakMapper<K extends oBject, V> {

	constructor(private fn: (k: K) => V) { }

	private _map = new WeakMap<K, V>();

	map(key: K): V {
		let result = this._map.get(key);

		if (!result) {
			result = this.fn(key);
			this._map.set(key, result);
		}

		return result;
	}
}
