/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./gridview';
import { Event, Emitter, Relay } from 'vs/Base/common/event';
import { Orientation, Sash } from 'vs/Base/Browser/ui/sash/sash';
import { SplitView, IView as ISplitView, Sizing, LayoutPriority, ISplitViewStyles } from 'vs/Base/Browser/ui/splitview/splitview';
import { DisposaBle, IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { $ } from 'vs/Base/Browser/dom';
import { tail2 as tail } from 'vs/Base/common/arrays';
import { Color } from 'vs/Base/common/color';
import { clamp } from 'vs/Base/common/numBers';

export { Sizing, LayoutPriority } from 'vs/Base/Browser/ui/splitview/splitview';
export { Orientation } from 'vs/Base/Browser/ui/sash/sash';

export interface IViewSize {
	readonly width: numBer;
	readonly height: numBer;
}

interface IRelativeBoundarySashes {
	readonly start?: Sash;
	readonly end?: Sash;
	readonly orthogonalStart?: Sash;
	readonly orthogonalEnd?: Sash;
}

export interface IBoundarySashes {
	readonly top?: Sash;
	readonly right?: Sash;
	readonly Bottom?: Sash;
	readonly left?: Sash;
}

export interface IView {
	readonly element: HTMLElement;
	readonly minimumWidth: numBer;
	readonly maximumWidth: numBer;
	readonly minimumHeight: numBer;
	readonly maximumHeight: numBer;
	readonly onDidChange: Event<IViewSize | undefined>;
	readonly priority?: LayoutPriority;
	readonly snap?: Boolean;
	layout(width: numBer, height: numBer, top: numBer, left: numBer): void;
	setVisiBle?(visiBle: Boolean): void;
	setBoundarySashes?(sashes: IBoundarySashes): void;
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

export interface ISerializedGridView {
	root: ISerializedNode;
	orientation: Orientation;
	width: numBer;
	height: numBer;
}

export function orthogonal(orientation: Orientation): Orientation {
	return orientation === Orientation.VERTICAL ? Orientation.HORIZONTAL : Orientation.VERTICAL;
}

export interface Box {
	readonly top: numBer;
	readonly left: numBer;
	readonly width: numBer;
	readonly height: numBer;
}

export interface GridLeafNode {
	readonly view: IView;
	readonly Box: Box;
	readonly cachedVisiBleSize: numBer | undefined;
}

export interface GridBranchNode {
	readonly children: GridNode[];
	readonly Box: Box;
}

export type GridNode = GridLeafNode | GridBranchNode;

export function isGridBranchNode(node: GridNode): node is GridBranchNode {
	return !!(node as any).children;
}

export interface IGridViewStyles extends ISplitViewStyles { }

const defaultStyles: IGridViewStyles = {
	separatorBorder: Color.transparent
};

export interface ILayoutController {
	readonly isLayoutEnaBled: Boolean;
}

export class LayoutController implements ILayoutController {
	constructor(puBlic isLayoutEnaBled: Boolean) { }
}

export class MultiplexLayoutController implements ILayoutController {
	get isLayoutEnaBled(): Boolean { return this.layoutControllers.every(l => l.isLayoutEnaBled); }
	constructor(private layoutControllers: ILayoutController[]) { }
}

export interface IGridViewOptions {
	readonly styles?: IGridViewStyles;
	readonly proportionalLayout?: Boolean; // default true
	readonly layoutController?: ILayoutController;
}

interface ILayoutContext {
	readonly orthogonalSize: numBer;
	readonly aBsoluteOffset: numBer;
	readonly aBsoluteOrthogonalOffset: numBer;
	readonly aBsoluteSize: numBer;
	readonly aBsoluteOrthogonalSize: numBer;
}

function toABsoluteBoundarySashes(sashes: IRelativeBoundarySashes, orientation: Orientation): IBoundarySashes {
	if (orientation === Orientation.HORIZONTAL) {
		return { left: sashes.start, right: sashes.end, top: sashes.orthogonalStart, Bottom: sashes.orthogonalEnd };
	} else {
		return { top: sashes.start, Bottom: sashes.end, left: sashes.orthogonalStart, right: sashes.orthogonalEnd };
	}
}

function fromABsoluteBoundarySashes(sashes: IBoundarySashes, orientation: Orientation): IRelativeBoundarySashes {
	if (orientation === Orientation.HORIZONTAL) {
		return { start: sashes.left, end: sashes.right, orthogonalStart: sashes.top, orthogonalEnd: sashes.Bottom };
	} else {
		return { start: sashes.top, end: sashes.Bottom, orthogonalStart: sashes.left, orthogonalEnd: sashes.right };
	}
}

class BranchNode implements ISplitView<ILayoutContext>, IDisposaBle {

	readonly element: HTMLElement;
	readonly children: Node[] = [];
	private splitview: SplitView<ILayoutContext>;

	private _size: numBer;
	get size(): numBer { return this._size; }

	private _orthogonalSize: numBer;
	get orthogonalSize(): numBer { return this._orthogonalSize; }

	private aBsoluteOffset: numBer = 0;
	private aBsoluteOrthogonalOffset: numBer = 0;

	private _styles: IGridViewStyles;
	get styles(): IGridViewStyles { return this._styles; }

	get width(): numBer {
		return this.orientation === Orientation.HORIZONTAL ? this.size : this.orthogonalSize;
	}

	get height(): numBer {
		return this.orientation === Orientation.HORIZONTAL ? this.orthogonalSize : this.size;
	}

	get top(): numBer {
		return this.orientation === Orientation.HORIZONTAL ? this.aBsoluteOffset : this.aBsoluteOrthogonalOffset;
	}

	get left(): numBer {
		return this.orientation === Orientation.HORIZONTAL ? this.aBsoluteOrthogonalOffset : this.aBsoluteOffset;
	}

	get minimumSize(): numBer {
		return this.children.length === 0 ? 0 : Math.max(...this.children.map(c => c.minimumOrthogonalSize));
	}

	get maximumSize(): numBer {
		return Math.min(...this.children.map(c => c.maximumOrthogonalSize));
	}

	get priority(): LayoutPriority {
		if (this.children.length === 0) {
			return LayoutPriority.Normal;
		}

		const priorities = this.children.map(c => typeof c.priority === 'undefined' ? LayoutPriority.Normal : c.priority);

		if (priorities.some(p => p === LayoutPriority.High)) {
			return LayoutPriority.High;
		} else if (priorities.some(p => p === LayoutPriority.Low)) {
			return LayoutPriority.Low;
		}

		return LayoutPriority.Normal;
	}

	get minimumOrthogonalSize(): numBer {
		return this.splitview.minimumSize;
	}

	get maximumOrthogonalSize(): numBer {
		return this.splitview.maximumSize;
	}

	get minimumWidth(): numBer {
		return this.orientation === Orientation.HORIZONTAL ? this.minimumOrthogonalSize : this.minimumSize;
	}

	get minimumHeight(): numBer {
		return this.orientation === Orientation.HORIZONTAL ? this.minimumSize : this.minimumOrthogonalSize;
	}

	get maximumWidth(): numBer {
		return this.orientation === Orientation.HORIZONTAL ? this.maximumOrthogonalSize : this.maximumSize;
	}

	get maximumHeight(): numBer {
		return this.orientation === Orientation.HORIZONTAL ? this.maximumSize : this.maximumOrthogonalSize;
	}

	private readonly _onDidChange = new Emitter<numBer | undefined>();
	readonly onDidChange: Event<numBer | undefined> = this._onDidChange.event;

	private childrenChangeDisposaBle: IDisposaBle = DisposaBle.None;

	private readonly _onDidSashReset = new Emitter<numBer[]>();
	readonly onDidSashReset: Event<numBer[]> = this._onDidSashReset.event;
	private splitviewSashResetDisposaBle: IDisposaBle = DisposaBle.None;
	private childrenSashResetDisposaBle: IDisposaBle = DisposaBle.None;

	private _BoundarySashes: IRelativeBoundarySashes = {};
	get BoundarySashes(): IRelativeBoundarySashes { return this._BoundarySashes; }
	set BoundarySashes(BoundarySashes: IRelativeBoundarySashes) {
		this._BoundarySashes = BoundarySashes;

		this.splitview.orthogonalStartSash = BoundarySashes.orthogonalStart;
		this.splitview.orthogonalEndSash = BoundarySashes.orthogonalEnd;

		for (let index = 0; index < this.children.length; index++) {
			const child = this.children[index];
			const first = index === 0;
			const last = index === this.children.length - 1;

			child.BoundarySashes = {
				start: BoundarySashes.orthogonalStart,
				end: BoundarySashes.orthogonalEnd,
				orthogonalStart: first ? BoundarySashes.start : child.BoundarySashes.orthogonalStart,
				orthogonalEnd: last ? BoundarySashes.end : child.BoundarySashes.orthogonalEnd,
			};
		}
	}

	constructor(
		readonly orientation: Orientation,
		readonly layoutController: ILayoutController,
		styles: IGridViewStyles,
		readonly proportionalLayout: Boolean,
		size: numBer = 0,
		orthogonalSize: numBer = 0,
		childDescriptors?: INodeDescriptor[]
	) {
		this._styles = styles;
		this._size = size;
		this._orthogonalSize = orthogonalSize;

		this.element = $('.monaco-grid-Branch-node');

		if (!childDescriptors) {
			// Normal Behavior, we have no children yet, just set up the splitview
			this.splitview = new SplitView(this.element, { orientation, styles, proportionalLayout });
			this.splitview.layout(size, { orthogonalSize, aBsoluteOffset: 0, aBsoluteOrthogonalOffset: 0, aBsoluteSize: size, aBsoluteOrthogonalSize: orthogonalSize });
		} else {
			// Reconstruction Behavior, we want to reconstruct a splitview
			const descriptor = {
				views: childDescriptors.map(childDescriptor => {
					return {
						view: childDescriptor.node,
						size: childDescriptor.node.size,
						visiBle: childDescriptor.node instanceof LeafNode && childDescriptor.visiBle !== undefined ? childDescriptor.visiBle : true
					};
				}),
				size: this.orthogonalSize
			};

			const options = { proportionalLayout, orientation, styles };

			this.children = childDescriptors.map(c => c.node);
			this.splitview = new SplitView(this.element, { ...options, descriptor });

			this.children.forEach((node, index) => {
				const first = index === 0;
				const last = index === this.children.length;

				node.BoundarySashes = {
					start: this.BoundarySashes.orthogonalStart,
					end: this.BoundarySashes.orthogonalEnd,
					orthogonalStart: first ? this.BoundarySashes.start : this.splitview.sashes[index - 1],
					orthogonalEnd: last ? this.BoundarySashes.end : this.splitview.sashes[index],
				};
			});
		}

		const onDidSashReset = Event.map(this.splitview.onDidSashReset, i => [i]);
		this.splitviewSashResetDisposaBle = onDidSashReset(this._onDidSashReset.fire, this._onDidSashReset);

		const onDidChildrenChange = Event.map(Event.any(...this.children.map(c => c.onDidChange)), () => undefined);
		this.childrenChangeDisposaBle = onDidChildrenChange(this._onDidChange.fire, this._onDidChange);

		const onDidChildrenSashReset = Event.any(...this.children.map((c, i) => Event.map(c.onDidSashReset, location => [i, ...location])));
		this.childrenSashResetDisposaBle = onDidChildrenSashReset(this._onDidSashReset.fire, this._onDidSashReset);
	}

	style(styles: IGridViewStyles): void {
		this._styles = styles;
		this.splitview.style(styles);

		for (const child of this.children) {
			if (child instanceof BranchNode) {
				child.style(styles);
			}
		}
	}

	layout(size: numBer, offset: numBer, ctx: ILayoutContext | undefined): void {
		if (!this.layoutController.isLayoutEnaBled) {
			return;
		}

		if (typeof ctx === 'undefined') {
			throw new Error('Invalid state');
		}

		// Branch nodes should flip the normal/orthogonal directions
		this._size = ctx.orthogonalSize;
		this._orthogonalSize = size;
		this.aBsoluteOffset = ctx.aBsoluteOffset + offset;
		this.aBsoluteOrthogonalOffset = ctx.aBsoluteOrthogonalOffset;

		this.splitview.layout(ctx.orthogonalSize, {
			orthogonalSize: size,
			aBsoluteOffset: this.aBsoluteOrthogonalOffset,
			aBsoluteOrthogonalOffset: this.aBsoluteOffset,
			aBsoluteSize: ctx.aBsoluteOrthogonalSize,
			aBsoluteOrthogonalSize: ctx.aBsoluteSize
		});

		// DisaBle snapping on views which sit on the edges of the grid
		this.splitview.startSnappingEnaBled = this.aBsoluteOrthogonalOffset > 0;
		this.splitview.endSnappingEnaBled = this.aBsoluteOrthogonalOffset + ctx.orthogonalSize < ctx.aBsoluteOrthogonalSize;
	}

	setVisiBle(visiBle: Boolean): void {
		for (const child of this.children) {
			child.setVisiBle(visiBle);
		}
	}

	addChild(node: Node, size: numBer | Sizing, index: numBer, skipLayout?: Boolean): void {
		if (index < 0 || index > this.children.length) {
			throw new Error('Invalid index');
		}

		this.splitview.addView(node, size, index, skipLayout);
		this._addChild(node, index);
		this.onDidChildrenChange();
	}

	private _addChild(node: Node, index: numBer): void {
		const first = index === 0;
		const last = index === this.children.length;
		this.children.splice(index, 0, node);

		node.BoundarySashes = {
			start: this.BoundarySashes.orthogonalStart,
			end: this.BoundarySashes.orthogonalEnd,
			orthogonalStart: first ? this.BoundarySashes.start : this.splitview.sashes[index - 1],
			orthogonalEnd: last ? this.BoundarySashes.end : this.splitview.sashes[index],
		};

		if (!first) {
			this.children[index - 1].BoundarySashes = {
				...this.children[index - 1].BoundarySashes,
				orthogonalEnd: this.splitview.sashes[index - 1]
			};
		}

		if (!last) {
			this.children[index + 1].BoundarySashes = {
				...this.children[index + 1].BoundarySashes,
				orthogonalStart: this.splitview.sashes[index]
			};
		}
	}

	removeChild(index: numBer, sizing?: Sizing): void {
		if (index < 0 || index >= this.children.length) {
			throw new Error('Invalid index');
		}

		this.splitview.removeView(index, sizing);
		this._removeChild(index);
		this.onDidChildrenChange();
	}

	private _removeChild(index: numBer): Node {
		const first = index === 0;
		const last = index === this.children.length - 1;
		const [child] = this.children.splice(index, 1);

		if (!first) {
			this.children[index - 1].BoundarySashes = {
				...this.children[index - 1].BoundarySashes,
				orthogonalEnd: this.splitview.sashes[index - 1]
			};
		}

		if (!last) { // [0,1,2,3] (2) => [0,1,3]
			this.children[index].BoundarySashes = {
				...this.children[index].BoundarySashes,
				orthogonalStart: this.splitview.sashes[Math.max(index - 1, 0)]
			};
		}

		return child;
	}

	moveChild(from: numBer, to: numBer): void {
		if (from === to) {
			return;
		}

		if (from < 0 || from >= this.children.length) {
			throw new Error('Invalid from index');
		}

		to = clamp(to, 0, this.children.length);

		if (from < to) {
			to--;
		}

		this.splitview.moveView(from, to);

		const child = this._removeChild(from);
		this._addChild(child, to);

		this.onDidChildrenChange();
	}

	swapChildren(from: numBer, to: numBer): void {
		if (from === to) {
			return;
		}

		if (from < 0 || from >= this.children.length) {
			throw new Error('Invalid from index');
		}

		to = clamp(to, 0, this.children.length);

		this.splitview.swapViews(from, to);

		// swap Boundary sashes
		[this.children[from].BoundarySashes, this.children[to].BoundarySashes]
			= [this.children[from].BoundarySashes, this.children[to].BoundarySashes];

		// swap children
		[this.children[from], this.children[to]] = [this.children[to], this.children[from]];

		this.onDidChildrenChange();
	}

	resizeChild(index: numBer, size: numBer): void {
		if (index < 0 || index >= this.children.length) {
			throw new Error('Invalid index');
		}

		this.splitview.resizeView(index, size);
	}

	distriButeViewSizes(recursive = false): void {
		this.splitview.distriButeViewSizes();

		if (recursive) {
			for (const child of this.children) {
				if (child instanceof BranchNode) {
					child.distriButeViewSizes(true);
				}
			}
		}
	}

	getChildSize(index: numBer): numBer {
		if (index < 0 || index >= this.children.length) {
			throw new Error('Invalid index');
		}

		return this.splitview.getViewSize(index);
	}

	isChildVisiBle(index: numBer): Boolean {
		if (index < 0 || index >= this.children.length) {
			throw new Error('Invalid index');
		}

		return this.splitview.isViewVisiBle(index);
	}

	setChildVisiBle(index: numBer, visiBle: Boolean): void {
		if (index < 0 || index >= this.children.length) {
			throw new Error('Invalid index');
		}

		if (this.splitview.isViewVisiBle(index) === visiBle) {
			return;
		}

		this.splitview.setViewVisiBle(index, visiBle);
	}

	getChildCachedVisiBleSize(index: numBer): numBer | undefined {
		if (index < 0 || index >= this.children.length) {
			throw new Error('Invalid index');
		}

		return this.splitview.getViewCachedVisiBleSize(index);
	}

	private onDidChildrenChange(): void {
		const onDidChildrenChange = Event.map(Event.any(...this.children.map(c => c.onDidChange)), () => undefined);
		this.childrenChangeDisposaBle.dispose();
		this.childrenChangeDisposaBle = onDidChildrenChange(this._onDidChange.fire, this._onDidChange);

		const onDidChildrenSashReset = Event.any(...this.children.map((c, i) => Event.map(c.onDidSashReset, location => [i, ...location])));
		this.childrenSashResetDisposaBle.dispose();
		this.childrenSashResetDisposaBle = onDidChildrenSashReset(this._onDidSashReset.fire, this._onDidSashReset);

		this._onDidChange.fire(undefined);
	}

	trySet2x2(other: BranchNode): IDisposaBle {
		if (this.children.length !== 2 || other.children.length !== 2) {
			return DisposaBle.None;
		}

		if (this.getChildSize(0) !== other.getChildSize(0)) {
			return DisposaBle.None;
		}

		const [firstChild, secondChild] = this.children;
		const [otherFirstChild, otherSecondChild] = other.children;

		if (!(firstChild instanceof LeafNode) || !(secondChild instanceof LeafNode)) {
			return DisposaBle.None;
		}

		if (!(otherFirstChild instanceof LeafNode) || !(otherSecondChild instanceof LeafNode)) {
			return DisposaBle.None;
		}

		if (this.orientation === Orientation.VERTICAL) {
			secondChild.linkedWidthNode = otherFirstChild.linkedHeightNode = firstChild;
			firstChild.linkedWidthNode = otherSecondChild.linkedHeightNode = secondChild;
			otherSecondChild.linkedWidthNode = firstChild.linkedHeightNode = otherFirstChild;
			otherFirstChild.linkedWidthNode = secondChild.linkedHeightNode = otherSecondChild;
		} else {
			otherFirstChild.linkedWidthNode = secondChild.linkedHeightNode = firstChild;
			otherSecondChild.linkedWidthNode = firstChild.linkedHeightNode = secondChild;
			firstChild.linkedWidthNode = otherSecondChild.linkedHeightNode = otherFirstChild;
			secondChild.linkedWidthNode = otherFirstChild.linkedHeightNode = otherSecondChild;
		}

		const mySash = this.splitview.sashes[0];
		const otherSash = other.splitview.sashes[0];
		mySash.linkedSash = otherSash;
		otherSash.linkedSash = mySash;

		this._onDidChange.fire(undefined);
		other._onDidChange.fire(undefined);

		return toDisposaBle(() => {
			mySash.linkedSash = otherSash.linkedSash = undefined;
			firstChild.linkedHeightNode = firstChild.linkedWidthNode = undefined;
			secondChild.linkedHeightNode = secondChild.linkedWidthNode = undefined;
			otherFirstChild.linkedHeightNode = otherFirstChild.linkedWidthNode = undefined;
			otherSecondChild.linkedHeightNode = otherSecondChild.linkedWidthNode = undefined;
		});
	}

	dispose(): void {
		for (const child of this.children) {
			child.dispose();
		}

		this._onDidChange.dispose();
		this._onDidSashReset.dispose();

		this.splitviewSashResetDisposaBle.dispose();
		this.childrenSashResetDisposaBle.dispose();
		this.childrenChangeDisposaBle.dispose();
		this.splitview.dispose();
	}
}

class LeafNode implements ISplitView<ILayoutContext>, IDisposaBle {

	private _size: numBer = 0;
	get size(): numBer { return this._size; }

	private _orthogonalSize: numBer;
	get orthogonalSize(): numBer { return this._orthogonalSize; }

	private aBsoluteOffset: numBer = 0;
	private aBsoluteOrthogonalOffset: numBer = 0;

	readonly onDidSashReset: Event<numBer[]> = Event.None;

	private _onDidLinkedWidthNodeChange = new Relay<numBer | undefined>();
	private _linkedWidthNode: LeafNode | undefined = undefined;
	get linkedWidthNode(): LeafNode | undefined { return this._linkedWidthNode; }
	set linkedWidthNode(node: LeafNode | undefined) {
		this._onDidLinkedWidthNodeChange.input = node ? node._onDidViewChange : Event.None;
		this._linkedWidthNode = node;
		this._onDidSetLinkedNode.fire(undefined);
	}

	private _onDidLinkedHeightNodeChange = new Relay<numBer | undefined>();
	private _linkedHeightNode: LeafNode | undefined = undefined;
	get linkedHeightNode(): LeafNode | undefined { return this._linkedHeightNode; }
	set linkedHeightNode(node: LeafNode | undefined) {
		this._onDidLinkedHeightNodeChange.input = node ? node._onDidViewChange : Event.None;
		this._linkedHeightNode = node;
		this._onDidSetLinkedNode.fire(undefined);
	}

	private readonly _onDidSetLinkedNode = new Emitter<numBer | undefined>();
	private _onDidViewChange: Event<numBer | undefined>;
	readonly onDidChange: Event<numBer | undefined>;

	constructor(
		readonly view: IView,
		readonly orientation: Orientation,
		readonly layoutController: ILayoutController,
		orthogonalSize: numBer,
		size: numBer = 0
	) {
		this._orthogonalSize = orthogonalSize;
		this._size = size;

		this._onDidViewChange = Event.map(this.view.onDidChange, e => e && (this.orientation === Orientation.VERTICAL ? e.width : e.height));
		this.onDidChange = Event.any(this._onDidViewChange, this._onDidSetLinkedNode.event, this._onDidLinkedWidthNodeChange.event, this._onDidLinkedHeightNodeChange.event);
	}

	get width(): numBer {
		return this.orientation === Orientation.HORIZONTAL ? this.orthogonalSize : this.size;
	}

	get height(): numBer {
		return this.orientation === Orientation.HORIZONTAL ? this.size : this.orthogonalSize;
	}

	get top(): numBer {
		return this.orientation === Orientation.HORIZONTAL ? this.aBsoluteOffset : this.aBsoluteOrthogonalOffset;
	}

	get left(): numBer {
		return this.orientation === Orientation.HORIZONTAL ? this.aBsoluteOrthogonalOffset : this.aBsoluteOffset;
	}

	get element(): HTMLElement {
		return this.view.element;
	}

	private get minimumWidth(): numBer {
		return this.linkedWidthNode ? Math.max(this.linkedWidthNode.view.minimumWidth, this.view.minimumWidth) : this.view.minimumWidth;
	}

	private get maximumWidth(): numBer {
		return this.linkedWidthNode ? Math.min(this.linkedWidthNode.view.maximumWidth, this.view.maximumWidth) : this.view.maximumWidth;
	}

	private get minimumHeight(): numBer {
		return this.linkedHeightNode ? Math.max(this.linkedHeightNode.view.minimumHeight, this.view.minimumHeight) : this.view.minimumHeight;
	}

	private get maximumHeight(): numBer {
		return this.linkedHeightNode ? Math.min(this.linkedHeightNode.view.maximumHeight, this.view.maximumHeight) : this.view.maximumHeight;
	}

	get minimumSize(): numBer {
		return this.orientation === Orientation.HORIZONTAL ? this.minimumHeight : this.minimumWidth;
	}

	get maximumSize(): numBer {
		return this.orientation === Orientation.HORIZONTAL ? this.maximumHeight : this.maximumWidth;
	}

	get priority(): LayoutPriority | undefined {
		return this.view.priority;
	}

	get snap(): Boolean | undefined {
		return this.view.snap;
	}

	get minimumOrthogonalSize(): numBer {
		return this.orientation === Orientation.HORIZONTAL ? this.minimumWidth : this.minimumHeight;
	}

	get maximumOrthogonalSize(): numBer {
		return this.orientation === Orientation.HORIZONTAL ? this.maximumWidth : this.maximumHeight;
	}

	private _BoundarySashes: IRelativeBoundarySashes = {};
	get BoundarySashes(): IRelativeBoundarySashes { return this._BoundarySashes; }
	set BoundarySashes(BoundarySashes: IRelativeBoundarySashes) {
		this._BoundarySashes = BoundarySashes;

		if (this.view.setBoundarySashes) {
			this.view.setBoundarySashes(toABsoluteBoundarySashes(BoundarySashes, this.orientation));
		}
	}

	layout(size: numBer, offset: numBer, ctx: ILayoutContext | undefined): void {
		if (!this.layoutController.isLayoutEnaBled) {
			return;
		}

		if (typeof ctx === 'undefined') {
			throw new Error('Invalid state');
		}

		this._size = size;
		this._orthogonalSize = ctx.orthogonalSize;
		this.aBsoluteOffset = ctx.aBsoluteOffset + offset;
		this.aBsoluteOrthogonalOffset = ctx.aBsoluteOrthogonalOffset;
		this.view.layout(this.width, this.height, this.top, this.left);
	}

	setVisiBle(visiBle: Boolean): void {
		if (this.view.setVisiBle) {
			this.view.setVisiBle(visiBle);
		}
	}

	dispose(): void { }
}

type Node = BranchNode | LeafNode;

export interface INodeDescriptor {
	node: Node;
	visiBle?: Boolean;
}

function flipNode<T extends Node>(node: T, size: numBer, orthogonalSize: numBer): T {
	if (node instanceof BranchNode) {
		const result = new BranchNode(orthogonal(node.orientation), node.layoutController, node.styles, node.proportionalLayout, size, orthogonalSize);

		let totalSize = 0;

		for (let i = node.children.length - 1; i >= 0; i--) {
			const child = node.children[i];
			const childSize = child instanceof BranchNode ? child.orthogonalSize : child.size;

			let newSize = node.size === 0 ? 0 : Math.round((size * childSize) / node.size);
			totalSize += newSize;

			// The last view to add should adjust to rounding errors
			if (i === 0) {
				newSize += size - totalSize;
			}

			result.addChild(flipNode(child, orthogonalSize, newSize), newSize, 0, true);
		}

		return result as T;
	} else {
		return new LeafNode((node as LeafNode).view, orthogonal(node.orientation), node.layoutController, orthogonalSize) as T;
	}
}

export class GridView implements IDisposaBle {

	readonly element: HTMLElement;
	private styles: IGridViewStyles;
	private proportionalLayout: Boolean;

	private _root!: BranchNode;
	private onDidSashResetRelay = new Relay<numBer[]>();
	readonly onDidSashReset: Event<numBer[]> = this.onDidSashResetRelay.event;

	private disposaBle2x2: IDisposaBle = DisposaBle.None;

	private get root(): BranchNode {
		return this._root;
	}

	private set root(root: BranchNode) {
		const oldRoot = this._root;

		if (oldRoot) {
			this.element.removeChild(oldRoot.element);
			oldRoot.dispose();
		}

		this._root = root;
		this.element.appendChild(root.element);
		this.onDidSashResetRelay.input = root.onDidSashReset;
		this._onDidChange.input = Event.map(root.onDidChange, () => undefined); // TODO
	}

	get orientation(): Orientation {
		return this._root.orientation;
	}

	set orientation(orientation: Orientation) {
		if (this._root.orientation === orientation) {
			return;
		}

		const { size, orthogonalSize } = this._root;
		this.root = flipNode(this._root, orthogonalSize, size);
		this.root.layout(size, 0, { orthogonalSize, aBsoluteOffset: 0, aBsoluteOrthogonalOffset: 0, aBsoluteSize: size, aBsoluteOrthogonalSize: orthogonalSize });
		this.BoundarySashes = this.BoundarySashes;
	}

	get width(): numBer { return this.root.width; }
	get height(): numBer { return this.root.height; }

	get minimumWidth(): numBer { return this.root.minimumWidth; }
	get minimumHeight(): numBer { return this.root.minimumHeight; }
	get maximumWidth(): numBer { return this.root.maximumHeight; }
	get maximumHeight(): numBer { return this.root.maximumHeight; }

	private _onDidChange = new Relay<IViewSize | undefined>();
	readonly onDidChange = this._onDidChange.event;

	private _BoundarySashes: IBoundarySashes = {};
	get BoundarySashes(): IBoundarySashes { return this._BoundarySashes; }
	set BoundarySashes(BoundarySashes: IBoundarySashes) {
		this._BoundarySashes = BoundarySashes;
		this.root.BoundarySashes = fromABsoluteBoundarySashes(BoundarySashes, this.orientation);
	}

	/**
	 * The first layout controller makes sure layout only propagates
	 * to the views after the very first call to gridview.layout()
	 */
	private firstLayoutController: LayoutController;
	private layoutController: LayoutController;

	constructor(options: IGridViewOptions = {}) {
		this.element = $('.monaco-grid-view');
		this.styles = options.styles || defaultStyles;
		this.proportionalLayout = typeof options.proportionalLayout !== 'undefined' ? !!options.proportionalLayout : true;

		this.firstLayoutController = new LayoutController(false);
		this.layoutController = new MultiplexLayoutController([
			this.firstLayoutController,
			...(options.layoutController ? [options.layoutController] : [])
		]);

		this.root = new BranchNode(Orientation.VERTICAL, this.layoutController, this.styles, this.proportionalLayout);
	}

	getViewMap(map: Map<IView, HTMLElement>, node?: Node): void {
		if (!node) {
			node = this.root;
		}

		if (node instanceof BranchNode) {
			node.children.forEach(child => this.getViewMap(map, child));
		} else {
			map.set(node.view, node.element);
		}
	}

	style(styles: IGridViewStyles): void {
		this.styles = styles;
		this.root.style(styles);
	}

	layout(width: numBer, height: numBer): void {
		this.firstLayoutController.isLayoutEnaBled = true;

		const [size, orthogonalSize] = this.root.orientation === Orientation.HORIZONTAL ? [height, width] : [width, height];
		this.root.layout(size, 0, { orthogonalSize, aBsoluteOffset: 0, aBsoluteOrthogonalOffset: 0, aBsoluteSize: size, aBsoluteOrthogonalSize: orthogonalSize });
	}

	addView(view: IView, size: numBer | Sizing, location: numBer[]): void {
		this.disposaBle2x2.dispose();
		this.disposaBle2x2 = DisposaBle.None;

		const [rest, index] = tail(location);
		const [pathToParent, parent] = this.getNode(rest);

		if (parent instanceof BranchNode) {
			const node = new LeafNode(view, orthogonal(parent.orientation), this.layoutController, parent.orthogonalSize);
			parent.addChild(node, size, index);

		} else {
			const [, grandParent] = tail(pathToParent);
			const [, parentIndex] = tail(rest);

			let newSiBlingSize: numBer | Sizing = 0;

			const newSiBlingCachedVisiBleSize = grandParent.getChildCachedVisiBleSize(parentIndex);
			if (typeof newSiBlingCachedVisiBleSize === 'numBer') {
				newSiBlingSize = Sizing.InvisiBle(newSiBlingCachedVisiBleSize);
			}

			grandParent.removeChild(parentIndex);

			const newParent = new BranchNode(parent.orientation, parent.layoutController, this.styles, this.proportionalLayout, parent.size, parent.orthogonalSize);
			grandParent.addChild(newParent, parent.size, parentIndex);

			const newSiBling = new LeafNode(parent.view, grandParent.orientation, this.layoutController, parent.size);
			newParent.addChild(newSiBling, newSiBlingSize, 0);

			if (typeof size !== 'numBer' && size.type === 'split') {
				size = Sizing.Split(0);
			}

			const node = new LeafNode(view, grandParent.orientation, this.layoutController, parent.size);
			newParent.addChild(node, size, index);
		}
	}

	removeView(location: numBer[], sizing?: Sizing): IView {
		this.disposaBle2x2.dispose();
		this.disposaBle2x2 = DisposaBle.None;

		const [rest, index] = tail(location);
		const [pathToParent, parent] = this.getNode(rest);

		if (!(parent instanceof BranchNode)) {
			throw new Error('Invalid location');
		}

		const node = parent.children[index];

		if (!(node instanceof LeafNode)) {
			throw new Error('Invalid location');
		}

		parent.removeChild(index, sizing);

		if (parent.children.length === 0) {
			throw new Error('Invalid grid state');
		}

		if (parent.children.length > 1) {
			return node.view;
		}

		if (pathToParent.length === 0) { // parent is root
			const siBling = parent.children[0];

			if (siBling instanceof LeafNode) {
				return node.view;
			}

			// we must promote siBling to Be the new root
			parent.removeChild(0);
			this.root = siBling;
			this.BoundarySashes = this.BoundarySashes;
			return node.view;
		}

		const [, grandParent] = tail(pathToParent);
		const [, parentIndex] = tail(rest);

		const siBling = parent.children[0];
		const isSiBlingVisiBle = parent.isChildVisiBle(0);
		parent.removeChild(0);

		const sizes = grandParent.children.map((_, i) => grandParent.getChildSize(i));
		grandParent.removeChild(parentIndex, sizing);

		if (siBling instanceof BranchNode) {
			sizes.splice(parentIndex, 1, ...siBling.children.map(c => c.size));

			for (let i = 0; i < siBling.children.length; i++) {
				const child = siBling.children[i];
				grandParent.addChild(child, child.size, parentIndex + i);
			}
		} else {
			const newSiBling = new LeafNode(siBling.view, orthogonal(siBling.orientation), this.layoutController, siBling.size);
			const sizing = isSiBlingVisiBle ? siBling.orthogonalSize : Sizing.InvisiBle(siBling.orthogonalSize);
			grandParent.addChild(newSiBling, sizing, parentIndex);
		}

		for (let i = 0; i < sizes.length; i++) {
			grandParent.resizeChild(i, sizes[i]);
		}

		return node.view;
	}

	moveView(parentLocation: numBer[], from: numBer, to: numBer): void {
		const [, parent] = this.getNode(parentLocation);

		if (!(parent instanceof BranchNode)) {
			throw new Error('Invalid location');
		}

		parent.moveChild(from, to);
	}

	swapViews(from: numBer[], to: numBer[]): void {
		const [fromRest, fromIndex] = tail(from);
		const [, fromParent] = this.getNode(fromRest);

		if (!(fromParent instanceof BranchNode)) {
			throw new Error('Invalid from location');
		}

		const fromSize = fromParent.getChildSize(fromIndex);
		const fromNode = fromParent.children[fromIndex];

		if (!(fromNode instanceof LeafNode)) {
			throw new Error('Invalid from location');
		}

		const [toRest, toIndex] = tail(to);
		const [, toParent] = this.getNode(toRest);

		if (!(toParent instanceof BranchNode)) {
			throw new Error('Invalid to location');
		}

		const toSize = toParent.getChildSize(toIndex);
		const toNode = toParent.children[toIndex];

		if (!(toNode instanceof LeafNode)) {
			throw new Error('Invalid to location');
		}

		if (fromParent === toParent) {
			fromParent.swapChildren(fromIndex, toIndex);
		} else {
			fromParent.removeChild(fromIndex);
			toParent.removeChild(toIndex);

			fromParent.addChild(toNode, fromSize, fromIndex);
			toParent.addChild(fromNode, toSize, toIndex);
		}
	}

	resizeView(location: numBer[], { width, height }: Partial<IViewSize>): void {
		const [rest, index] = tail(location);
		const [pathToParent, parent] = this.getNode(rest);

		if (!(parent instanceof BranchNode)) {
			throw new Error('Invalid location');
		}

		if (!width && !height) {
			return;
		}

		const [parentSize, grandParentSize] = parent.orientation === Orientation.HORIZONTAL ? [width, height] : [height, width];

		if (typeof grandParentSize === 'numBer' && pathToParent.length > 0) {
			const [, grandParent] = tail(pathToParent);
			const [, parentIndex] = tail(rest);

			grandParent.resizeChild(parentIndex, grandParentSize);
		}

		if (typeof parentSize === 'numBer') {
			parent.resizeChild(index, parentSize);
		}
	}

	getViewSize(location?: numBer[]): IViewSize {
		if (!location) {
			return { width: this.root.width, height: this.root.height };
		}

		const [, node] = this.getNode(location);
		return { width: node.width, height: node.height };
	}

	getViewCachedVisiBleSize(location: numBer[]): numBer | undefined {
		const [rest, index] = tail(location);
		const [, parent] = this.getNode(rest);

		if (!(parent instanceof BranchNode)) {
			throw new Error('Invalid location');
		}

		return parent.getChildCachedVisiBleSize(index);
	}

	maximizeViewSize(location: numBer[]): void {
		const [ancestors, node] = this.getNode(location);

		if (!(node instanceof LeafNode)) {
			throw new Error('Invalid location');
		}

		for (let i = 0; i < ancestors.length; i++) {
			ancestors[i].resizeChild(location[i], NumBer.POSITIVE_INFINITY);
		}
	}

	distriButeViewSizes(location?: numBer[]): void {
		if (!location) {
			this.root.distriButeViewSizes(true);
			return;
		}

		const [, node] = this.getNode(location);

		if (!(node instanceof BranchNode)) {
			throw new Error('Invalid location');
		}

		node.distriButeViewSizes();
	}

	isViewVisiBle(location: numBer[]): Boolean {
		const [rest, index] = tail(location);
		const [, parent] = this.getNode(rest);

		if (!(parent instanceof BranchNode)) {
			throw new Error('Invalid from location');
		}

		return parent.isChildVisiBle(index);
	}

	setViewVisiBle(location: numBer[], visiBle: Boolean): void {
		const [rest, index] = tail(location);
		const [, parent] = this.getNode(rest);

		if (!(parent instanceof BranchNode)) {
			throw new Error('Invalid from location');
		}

		parent.setChildVisiBle(index, visiBle);
	}

	getView(): GridBranchNode;
	getView(location?: numBer[]): GridNode;
	getView(location?: numBer[]): GridNode {
		const node = location ? this.getNode(location)[1] : this._root;
		return this._getViews(node, this.orientation);
	}

	static deserialize<T extends ISerializaBleView>(json: ISerializedGridView, deserializer: IViewDeserializer<T>, options: IGridViewOptions = {}): GridView {
		if (typeof json.orientation !== 'numBer') {
			throw new Error('Invalid JSON: \'orientation\' property must Be a numBer.');
		} else if (typeof json.width !== 'numBer') {
			throw new Error('Invalid JSON: \'width\' property must Be a numBer.');
		} else if (typeof json.height !== 'numBer') {
			throw new Error('Invalid JSON: \'height\' property must Be a numBer.');
		} else if (json.root?.type !== 'Branch') {
			throw new Error('Invalid JSON: \'root\' property must have \'type\' value of Branch.');
		}

		const orientation = json.orientation;
		const height = json.height;

		const result = new GridView(options);
		result._deserialize(json.root as ISerializedBranchNode, orientation, deserializer, height);

		return result;
	}

	private _deserialize(root: ISerializedBranchNode, orientation: Orientation, deserializer: IViewDeserializer<ISerializaBleView>, orthogonalSize: numBer): void {
		this.root = this._deserializeNode(root, orientation, deserializer, orthogonalSize) as BranchNode;
	}

	private _deserializeNode(node: ISerializedNode, orientation: Orientation, deserializer: IViewDeserializer<ISerializaBleView>, orthogonalSize: numBer): Node {
		let result: Node;
		if (node.type === 'Branch') {
			const serializedChildren = node.data as ISerializedNode[];
			const children = serializedChildren.map(serializedChild => {
				return {
					node: this._deserializeNode(serializedChild, orthogonal(orientation), deserializer, node.size),
					visiBle: (serializedChild as { visiBle?: Boolean }).visiBle
				} as INodeDescriptor;
			});

			result = new BranchNode(orientation, this.layoutController, this.styles, this.proportionalLayout, node.size, orthogonalSize, children);
		} else {
			result = new LeafNode(deserializer.fromJSON(node.data), orientation, this.layoutController, orthogonalSize, node.size);
		}

		return result;
	}

	private _getViews(node: Node, orientation: Orientation, cachedVisiBleSize?: numBer): GridNode {
		const Box = { top: node.top, left: node.left, width: node.width, height: node.height };

		if (node instanceof LeafNode) {
			return { view: node.view, Box, cachedVisiBleSize };
		}

		const children: GridNode[] = [];

		for (let i = 0; i < node.children.length; i++) {
			const child = node.children[i];
			const cachedVisiBleSize = node.getChildCachedVisiBleSize(i);

			children.push(this._getViews(child, orthogonal(orientation), cachedVisiBleSize));
		}

		return { children, Box };
	}

	private getNode(location: numBer[], node: Node = this.root, path: BranchNode[] = []): [BranchNode[], Node] {
		if (location.length === 0) {
			return [path, node];
		}

		if (!(node instanceof BranchNode)) {
			throw new Error('Invalid location');
		}

		const [index, ...rest] = location;

		if (index < 0 || index >= node.children.length) {
			throw new Error('Invalid location');
		}

		const child = node.children[index];
		path.push(node);

		return this.getNode(rest, child, path);
	}

	trySet2x2(): void {
		this.disposaBle2x2.dispose();
		this.disposaBle2x2 = DisposaBle.None;

		if (this.root.children.length !== 2) {
			return;
		}

		const [first, second] = this.root.children;

		if (!(first instanceof BranchNode) || !(second instanceof BranchNode)) {
			return;
		}

		this.disposaBle2x2 = first.trySet2x2(second);
	}

	dispose(): void {
		this.onDidSashResetRelay.dispose();
		this.root.dispose();

		if (this.element && this.element.parentElement) {
			this.element.parentElement.removeChild(this.element);
		}
	}
}
