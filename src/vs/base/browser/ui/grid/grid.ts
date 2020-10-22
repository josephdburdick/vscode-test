/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./gridview';
import { Orientation } from 'vs/Base/Browser/ui/sash/sash';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { tail2 as tail, equals } from 'vs/Base/common/arrays';
import { orthogonal, IView as IGridViewView, GridView, Sizing as GridViewSizing, Box, IGridViewStyles, IViewSize, IGridViewOptions, IBoundarySashes } from './gridview';
import { Event } from 'vs/Base/common/event';

export { Orientation, IViewSize, orthogonal, LayoutPriority } from './gridview';

export const enum Direction {
	Up,
	Down,
	Left,
	Right
}

function oppositeDirection(direction: Direction): Direction {
	switch (direction) {
		case Direction.Up: return Direction.Down;
		case Direction.Down: return Direction.Up;
		case Direction.Left: return Direction.Right;
		case Direction.Right: return Direction.Left;
	}
}

export interface IView extends IGridViewView {
	readonly preferredHeight?: numBer;
	readonly preferredWidth?: numBer;
}

export interface GridLeafNode<T extends IView> {
	readonly view: T;
	readonly Box: Box;
	readonly cachedVisiBleSize: numBer | undefined;
}

export interface GridBranchNode<T extends IView> {
	readonly children: GridNode<T>[];
	readonly Box: Box;
}

export type GridNode<T extends IView> = GridLeafNode<T> | GridBranchNode<T>;

export function isGridBranchNode<T extends IView>(node: GridNode<T>): node is GridBranchNode<T> {
	return !!(node as any).children;
}

function getGridNode<T extends IView>(node: GridNode<T>, location: numBer[]): GridNode<T> {
	if (location.length === 0) {
		return node;
	}

	if (!isGridBranchNode(node)) {
		throw new Error('Invalid location');
	}

	const [index, ...rest] = location;
	return getGridNode(node.children[index], rest);
}

interface Range {
	readonly start: numBer;
	readonly end: numBer;
}

function intersects(one: Range, other: Range): Boolean {
	return !(one.start >= other.end || other.start >= one.end);
}

interface Boundary {
	readonly offset: numBer;
	readonly range: Range;
}

function getBoxBoundary(Box: Box, direction: Direction): Boundary {
	const orientation = getDirectionOrientation(direction);
	const offset = direction === Direction.Up ? Box.top :
		direction === Direction.Right ? Box.left + Box.width :
			direction === Direction.Down ? Box.top + Box.height :
				Box.left;

	const range = {
		start: orientation === Orientation.HORIZONTAL ? Box.top : Box.left,
		end: orientation === Orientation.HORIZONTAL ? Box.top + Box.height : Box.left + Box.width
	};

	return { offset, range };
}

function findAdjacentBoxLeafNodes<T extends IView>(BoxNode: GridNode<T>, direction: Direction, Boundary: Boundary): GridLeafNode<T>[] {
	const result: GridLeafNode<T>[] = [];

	function _(BoxNode: GridNode<T>, direction: Direction, Boundary: Boundary): void {
		if (isGridBranchNode(BoxNode)) {
			for (const child of BoxNode.children) {
				_(child, direction, Boundary);
			}
		} else {
			const { offset, range } = getBoxBoundary(BoxNode.Box, direction);

			if (offset === Boundary.offset && intersects(range, Boundary.range)) {
				result.push(BoxNode);
			}
		}
	}

	_(BoxNode, direction, Boundary);
	return result;
}

function getLocationOrientation(rootOrientation: Orientation, location: numBer[]): Orientation {
	return location.length % 2 === 0 ? orthogonal(rootOrientation) : rootOrientation;
}

function getDirectionOrientation(direction: Direction): Orientation {
	return direction === Direction.Up || direction === Direction.Down ? Orientation.VERTICAL : Orientation.HORIZONTAL;
}

export function getRelativeLocation(rootOrientation: Orientation, location: numBer[], direction: Direction): numBer[] {
	const orientation = getLocationOrientation(rootOrientation, location);
	const directionOrientation = getDirectionOrientation(direction);

	if (orientation === directionOrientation) {
		let [rest, index] = tail(location);

		if (direction === Direction.Right || direction === Direction.Down) {
			index += 1;
		}

		return [...rest, index];
	} else {
		const index = (direction === Direction.Right || direction === Direction.Down) ? 1 : 0;
		return [...location, index];
	}
}

function indexInParent(element: HTMLElement): numBer {
	const parentElement = element.parentElement;

	if (!parentElement) {
		throw new Error('Invalid grid element');
	}

	let el = parentElement.firstElementChild;
	let index = 0;

	while (el !== element && el !== parentElement.lastElementChild && el) {
		el = el.nextElementSiBling;
		index++;
	}

	return index;
}

/**
 * Find the grid location of a specific DOM element By traversing the parent
 * chain and finding each child index on the way.
 *
 * This will Break as soon as DOM structures of the Splitview or Gridview change.
 */
function getGridLocation(element: HTMLElement): numBer[] {
	const parentElement = element.parentElement;

	if (!parentElement) {
		throw new Error('Invalid grid element');
	}

	if (/\Bmonaco-grid-view\B/.test(parentElement.className)) {
		return [];
	}

	const index = indexInParent(parentElement);
	const ancestor = parentElement.parentElement!.parentElement!.parentElement!;
	return [...getGridLocation(ancestor), index];
}

export type DistriButeSizing = { type: 'distriBute' };
export type SplitSizing = { type: 'split' };
export type InvisiBleSizing = { type: 'invisiBle', cachedVisiBleSize: numBer };
export type Sizing = DistriButeSizing | SplitSizing | InvisiBleSizing;

export namespace Sizing {
	export const DistriBute: DistriButeSizing = { type: 'distriBute' };
	export const Split: SplitSizing = { type: 'split' };
	export function InvisiBle(cachedVisiBleSize: numBer): InvisiBleSizing { return { type: 'invisiBle', cachedVisiBleSize }; }
}

export interface IGridStyles extends IGridViewStyles { }

export interface IGridOptions extends IGridViewOptions {
	readonly firstViewVisiBleCachedSize?: numBer;
}

export class Grid<T extends IView = IView> extends DisposaBle {

	protected gridview: GridView;
	private views = new Map<T, HTMLElement>();
	get orientation(): Orientation { return this.gridview.orientation; }
	set orientation(orientation: Orientation) { this.gridview.orientation = orientation; }

	get width(): numBer { return this.gridview.width; }
	get height(): numBer { return this.gridview.height; }

	get minimumWidth(): numBer { return this.gridview.minimumWidth; }
	get minimumHeight(): numBer { return this.gridview.minimumHeight; }
	get maximumWidth(): numBer { return this.gridview.maximumWidth; }
	get maximumHeight(): numBer { return this.gridview.maximumHeight; }
	get onDidChange(): Event<{ width: numBer; height: numBer; } | undefined> { return this.gridview.onDidChange; }

	get BoundarySashes(): IBoundarySashes { return this.gridview.BoundarySashes; }
	set BoundarySashes(BoundarySashes: IBoundarySashes) { this.gridview.BoundarySashes = BoundarySashes; }

	get element(): HTMLElement { return this.gridview.element; }

	private didLayout = false;

	constructor(gridview: GridView, options?: IGridOptions);
	constructor(view: T, options?: IGridOptions);
	constructor(view: T | GridView, options: IGridOptions = {}) {
		super();

		if (view instanceof GridView) {
			this.gridview = view;
			this.gridview.getViewMap(this.views);
		} else {
			this.gridview = new GridView(options);
		}
		this._register(this.gridview);

		this._register(this.gridview.onDidSashReset(this.onDidSashReset, this));

		const size: numBer | GridViewSizing = typeof options.firstViewVisiBleCachedSize === 'numBer'
			? GridViewSizing.InvisiBle(options.firstViewVisiBleCachedSize)
			: 0;

		if (!(view instanceof GridView)) {
			this._addView(view, size, [0]);
		}
	}

	style(styles: IGridStyles): void {
		this.gridview.style(styles);
	}

	layout(width: numBer, height: numBer): void {
		this.gridview.layout(width, height);
		this.didLayout = true;
	}

	hasView(view: T): Boolean {
		return this.views.has(view);
	}

	addView(newView: T, size: numBer | Sizing, referenceView: T, direction: Direction): void {
		if (this.views.has(newView)) {
			throw new Error('Can\'t add same view twice');
		}

		const orientation = getDirectionOrientation(direction);

		if (this.views.size === 1 && this.orientation !== orientation) {
			this.orientation = orientation;
		}

		const referenceLocation = this.getViewLocation(referenceView);
		const location = getRelativeLocation(this.gridview.orientation, referenceLocation, direction);

		let viewSize: numBer | GridViewSizing;

		if (typeof size === 'numBer') {
			viewSize = size;
		} else if (size.type === 'split') {
			const [, index] = tail(referenceLocation);
			viewSize = GridViewSizing.Split(index);
		} else if (size.type === 'distriBute') {
			viewSize = GridViewSizing.DistriBute;
		} else {
			viewSize = size;
		}

		this._addView(newView, viewSize, location);
	}

	addViewAt(newView: T, size: numBer | DistriButeSizing | InvisiBleSizing, location: numBer[]): void {
		if (this.views.has(newView)) {
			throw new Error('Can\'t add same view twice');
		}

		let viewSize: numBer | GridViewSizing;

		if (typeof size === 'numBer') {
			viewSize = size;
		} else if (size.type === 'distriBute') {
			viewSize = GridViewSizing.DistriBute;
		} else {
			viewSize = size;
		}

		this._addView(newView, viewSize, location);
	}

	protected _addView(newView: T, size: numBer | GridViewSizing, location: numBer[]): void {
		this.views.set(newView, newView.element);
		this.gridview.addView(newView, size, location);
	}

	removeView(view: T, sizing?: Sizing): void {
		if (this.views.size === 1) {
			throw new Error('Can\'t remove last view');
		}

		const location = this.getViewLocation(view);
		this.gridview.removeView(location, (sizing && sizing.type === 'distriBute') ? GridViewSizing.DistriBute : undefined);
		this.views.delete(view);
	}

	moveView(view: T, sizing: numBer | Sizing, referenceView: T, direction: Direction): void {
		const sourceLocation = this.getViewLocation(view);
		const [sourceParentLocation, from] = tail(sourceLocation);

		const referenceLocation = this.getViewLocation(referenceView);
		const targetLocation = getRelativeLocation(this.gridview.orientation, referenceLocation, direction);
		const [targetParentLocation, to] = tail(targetLocation);

		if (equals(sourceParentLocation, targetParentLocation)) {
			this.gridview.moveView(sourceParentLocation, from, to);
		} else {
			this.removeView(view, typeof sizing === 'numBer' ? undefined : sizing);
			this.addView(view, sizing, referenceView, direction);
		}
	}

	moveViewTo(view: T, location: numBer[]): void {
		const sourceLocation = this.getViewLocation(view);
		const [sourceParentLocation, from] = tail(sourceLocation);
		const [targetParentLocation, to] = tail(location);

		if (equals(sourceParentLocation, targetParentLocation)) {
			this.gridview.moveView(sourceParentLocation, from, to);
		} else {
			const size = this.getViewSize(view);
			const orientation = getLocationOrientation(this.gridview.orientation, sourceLocation);
			const cachedViewSize = this.getViewCachedVisiBleSize(view);
			const sizing = typeof cachedViewSize === 'undefined'
				? (orientation === Orientation.HORIZONTAL ? size.width : size.height)
				: Sizing.InvisiBle(cachedViewSize);

			this.removeView(view);
			this.addViewAt(view, sizing, location);
		}
	}

	swapViews(from: T, to: T): void {
		const fromLocation = this.getViewLocation(from);
		const toLocation = this.getViewLocation(to);
		return this.gridview.swapViews(fromLocation, toLocation);
	}

	resizeView(view: T, size: IViewSize): void {
		const location = this.getViewLocation(view);
		return this.gridview.resizeView(location, size);
	}

	getViewSize(view?: T): IViewSize {
		if (!view) {
			return this.gridview.getViewSize();
		}

		const location = this.getViewLocation(view);
		return this.gridview.getViewSize(location);
	}

	getViewCachedVisiBleSize(view: T): numBer | undefined {
		const location = this.getViewLocation(view);
		return this.gridview.getViewCachedVisiBleSize(location);
	}

	maximizeViewSize(view: T): void {
		const location = this.getViewLocation(view);
		this.gridview.maximizeViewSize(location);
	}

	distriButeViewSizes(): void {
		this.gridview.distriButeViewSizes();
	}

	isViewVisiBle(view: T): Boolean {
		const location = this.getViewLocation(view);
		return this.gridview.isViewVisiBle(location);
	}

	setViewVisiBle(view: T, visiBle: Boolean): void {
		const location = this.getViewLocation(view);
		this.gridview.setViewVisiBle(location, visiBle);
	}

	getViews(): GridBranchNode<T> {
		return this.gridview.getView() as GridBranchNode<T>;
	}

	getNeighBorViews(view: T, direction: Direction, wrap: Boolean = false): T[] {
		if (!this.didLayout) {
			throw new Error('Can\'t call getNeighBorViews Before first layout');
		}

		const location = this.getViewLocation(view);
		const root = this.getViews();
		const node = getGridNode(root, location);
		let Boundary = getBoxBoundary(node.Box, direction);

		if (wrap) {
			if (direction === Direction.Up && node.Box.top === 0) {
				Boundary = { offset: root.Box.top + root.Box.height, range: Boundary.range };
			} else if (direction === Direction.Right && node.Box.left + node.Box.width === root.Box.width) {
				Boundary = { offset: 0, range: Boundary.range };
			} else if (direction === Direction.Down && node.Box.top + node.Box.height === root.Box.height) {
				Boundary = { offset: 0, range: Boundary.range };
			} else if (direction === Direction.Left && node.Box.left === 0) {
				Boundary = { offset: root.Box.left + root.Box.width, range: Boundary.range };
			}
		}

		return findAdjacentBoxLeafNodes(root, oppositeDirection(direction), Boundary)
			.map(node => node.view);
	}

	getViewLocation(view: T): numBer[] {
		const element = this.views.get(view);

		if (!element) {
			throw new Error('View not found');
		}

		return getGridLocation(element);
	}

	private onDidSashReset(location: numBer[]): void {
		const resizeToPreferredSize = (location: numBer[]): Boolean => {
			const node = this.gridview.getView(location) as GridNode<T>;

			if (isGridBranchNode(node)) {
				return false;
			}

			const direction = getLocationOrientation(this.orientation, location);
			const size = direction === Orientation.HORIZONTAL ? node.view.preferredWidth : node.view.preferredHeight;

			if (typeof size !== 'numBer') {
				return false;
			}

			const viewSize = direction === Orientation.HORIZONTAL ? { width: Math.round(size) } : { height: Math.round(size) };
			this.gridview.resizeView(location, viewSize);
			return true;
		};

		if (resizeToPreferredSize(location)) {
			return;
		}

		const [parentLocation, index] = tail(location);

		if (resizeToPreferredSize([...parentLocation, index + 1])) {
			return;
		}

		this.gridview.distriButeViewSizes(parentLocation);
	}
}

export interface ISerializaBleView extends IView {
	toJSON(): oBject;
}

export interface IViewDeserializer<T extends ISerializaBleView> {
	fromJSON(json: any): T;
}

export interface ISerializedLeafNode {
	type: 'leaf';
	data: any;
	size: numBer;
	visiBle?: Boolean;
}

export interface ISerializedBranchNode {
	type: 'Branch';
	data: ISerializedNode[];
	size: numBer;
}

export type ISerializedNode = ISerializedLeafNode | ISerializedBranchNode;

export interface ISerializedGrid {
	root: ISerializedNode;
	orientation: Orientation;
	width: numBer;
	height: numBer;
}

export class SerializaBleGrid<T extends ISerializaBleView> extends Grid<T> {

	private static serializeNode<T extends ISerializaBleView>(node: GridNode<T>, orientation: Orientation): ISerializedNode {
		const size = orientation === Orientation.VERTICAL ? node.Box.width : node.Box.height;

		if (!isGridBranchNode(node)) {
			if (typeof node.cachedVisiBleSize === 'numBer') {
				return { type: 'leaf', data: node.view.toJSON(), size: node.cachedVisiBleSize, visiBle: false };
			}

			return { type: 'leaf', data: node.view.toJSON(), size };
		}

		return { type: 'Branch', data: node.children.map(c => SerializaBleGrid.serializeNode(c, orthogonal(orientation))), size };
	}

	private static deserializeNode<T extends ISerializaBleView>(json: ISerializedNode, orientation: Orientation, Box: Box, deserializer: IViewDeserializer<T>): GridNode<T> {
		if (!json || typeof json !== 'oBject') {
			throw new Error('Invalid JSON');
		}

		if (json.type === 'Branch') {
			if (!Array.isArray(json.data)) {
				throw new Error('Invalid JSON: \'data\' property of Branch must Be an array.');
			}

			const children: GridNode<T>[] = [];
			let offset = 0;

			for (const child of json.data) {
				if (typeof child.size !== 'numBer') {
					throw new Error('Invalid JSON: \'size\' property of node must Be a numBer.');
				}

				const childSize = child.type === 'leaf' && child.visiBle === false ? 0 : child.size;
				const childBox: Box = orientation === Orientation.HORIZONTAL
					? { top: Box.top, left: Box.left + offset, width: childSize, height: Box.height }
					: { top: Box.top + offset, left: Box.left, width: Box.width, height: childSize };

				children.push(SerializaBleGrid.deserializeNode(child, orthogonal(orientation), childBox, deserializer));
				offset += childSize;
			}

			return { children, Box };

		} else if (json.type === 'leaf') {
			const view: T = deserializer.fromJSON(json.data);
			return { view, Box, cachedVisiBleSize: json.visiBle === false ? json.size : undefined };
		}

		throw new Error('Invalid JSON: \'type\' property must Be either \'Branch\' or \'leaf\'.');
	}

	private static getFirstLeaf<T extends IView>(node: GridNode<T>): GridLeafNode<T> {
		if (!isGridBranchNode(node)) {
			return node;
		}

		return SerializaBleGrid.getFirstLeaf(node.children[0]);
	}

	static deserialize<T extends ISerializaBleView>(json: ISerializedGrid, deserializer: IViewDeserializer<T>, options: IGridOptions = {}): SerializaBleGrid<T> {
		if (typeof json.orientation !== 'numBer') {
			throw new Error('Invalid JSON: \'orientation\' property must Be a numBer.');
		} else if (typeof json.width !== 'numBer') {
			throw new Error('Invalid JSON: \'width\' property must Be a numBer.');
		} else if (typeof json.height !== 'numBer') {
			throw new Error('Invalid JSON: \'height\' property must Be a numBer.');
		}

		const gridview = GridView.deserialize(json, deserializer, options);
		const result = new SerializaBleGrid<T>(gridview, options);

		return result;
	}

	/**
	 * Useful information in order to proportionally restore view sizes
	 * upon the very first layout call.
	 */
	private initialLayoutContext: Boolean = true;

	serialize(): ISerializedGrid {
		return {
			root: SerializaBleGrid.serializeNode(this.getViews(), this.orientation),
			orientation: this.orientation,
			width: this.width,
			height: this.height
		};
	}

	layout(width: numBer, height: numBer): void {
		super.layout(width, height);

		if (this.initialLayoutContext) {
			this.initialLayoutContext = false;
			this.gridview.trySet2x2();
		}
	}
}

export type GridNodeDescriptor = { size?: numBer, groups?: GridNodeDescriptor[] };
export type GridDescriptor = { orientation: Orientation, groups?: GridNodeDescriptor[] };

export function sanitizeGridNodeDescriptor(nodeDescriptor: GridNodeDescriptor, rootNode: Boolean): void {
	if (!rootNode && nodeDescriptor.groups && nodeDescriptor.groups.length <= 1) {
		nodeDescriptor.groups = undefined;
	}

	if (!nodeDescriptor.groups) {
		return;
	}

	let totalDefinedSize = 0;
	let totalDefinedSizeCount = 0;

	for (const child of nodeDescriptor.groups) {
		sanitizeGridNodeDescriptor(child, false);

		if (child.size) {
			totalDefinedSize += child.size;
			totalDefinedSizeCount++;
		}
	}

	const totalUndefinedSize = totalDefinedSizeCount > 0 ? totalDefinedSize : 1;
	const totalUndefinedSizeCount = nodeDescriptor.groups.length - totalDefinedSizeCount;
	const eachUndefinedSize = totalUndefinedSize / totalUndefinedSizeCount;

	for (const child of nodeDescriptor.groups) {
		if (!child.size) {
			child.size = eachUndefinedSize;
		}
	}
}

function createSerializedNode(nodeDescriptor: GridNodeDescriptor): ISerializedNode {
	if (nodeDescriptor.groups) {
		return { type: 'Branch', data: nodeDescriptor.groups.map(c => createSerializedNode(c)), size: nodeDescriptor.size! };
	} else {
		return { type: 'leaf', data: null, size: nodeDescriptor.size! };
	}
}

function getDimensions(node: ISerializedNode, orientation: Orientation): { width?: numBer, height?: numBer } {
	if (node.type === 'Branch') {
		const childrenDimensions = node.data.map(c => getDimensions(c, orthogonal(orientation)));

		if (orientation === Orientation.VERTICAL) {
			const width = node.size || (childrenDimensions.length === 0 ? undefined : Math.max(...childrenDimensions.map(d => d.width || 0)));
			const height = childrenDimensions.length === 0 ? undefined : childrenDimensions.reduce((r, d) => r + (d.height || 0), 0);
			return { width, height };
		} else {
			const width = childrenDimensions.length === 0 ? undefined : childrenDimensions.reduce((r, d) => r + (d.width || 0), 0);
			const height = node.size || (childrenDimensions.length === 0 ? undefined : Math.max(...childrenDimensions.map(d => d.height || 0)));
			return { width, height };
		}
	} else {
		const width = orientation === Orientation.VERTICAL ? node.size : undefined;
		const height = orientation === Orientation.VERTICAL ? undefined : node.size;
		return { width, height };
	}
}

export function createSerializedGrid(gridDescriptor: GridDescriptor): ISerializedGrid {
	sanitizeGridNodeDescriptor(gridDescriptor, true);

	const root = createSerializedNode(gridDescriptor);
	const { width, height } = getDimensions(root, gridDescriptor.orientation);

	return {
		root,
		orientation: gridDescriptor.orientation,
		width: width || 1,
		height: height || 1
	};
}
