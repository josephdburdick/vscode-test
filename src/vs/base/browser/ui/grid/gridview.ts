/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./gridview';
import { Event, Emitter, RelAy } from 'vs/bAse/common/event';
import { OrientAtion, SAsh } from 'vs/bAse/browser/ui/sAsh/sAsh';
import { SplitView, IView As ISplitView, Sizing, LAyoutPriority, ISplitViewStyles } from 'vs/bAse/browser/ui/splitview/splitview';
import { DisposAble, IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { $ } from 'vs/bAse/browser/dom';
import { tAil2 As tAil } from 'vs/bAse/common/ArrAys';
import { Color } from 'vs/bAse/common/color';
import { clAmp } from 'vs/bAse/common/numbers';

export { Sizing, LAyoutPriority } from 'vs/bAse/browser/ui/splitview/splitview';
export { OrientAtion } from 'vs/bAse/browser/ui/sAsh/sAsh';

export interfAce IViewSize {
	reAdonly width: number;
	reAdonly height: number;
}

interfAce IRelAtiveBoundArySAshes {
	reAdonly stArt?: SAsh;
	reAdonly end?: SAsh;
	reAdonly orthogonAlStArt?: SAsh;
	reAdonly orthogonAlEnd?: SAsh;
}

export interfAce IBoundArySAshes {
	reAdonly top?: SAsh;
	reAdonly right?: SAsh;
	reAdonly bottom?: SAsh;
	reAdonly left?: SAsh;
}

export interfAce IView {
	reAdonly element: HTMLElement;
	reAdonly minimumWidth: number;
	reAdonly mAximumWidth: number;
	reAdonly minimumHeight: number;
	reAdonly mAximumHeight: number;
	reAdonly onDidChAnge: Event<IViewSize | undefined>;
	reAdonly priority?: LAyoutPriority;
	reAdonly snAp?: booleAn;
	lAyout(width: number, height: number, top: number, left: number): void;
	setVisible?(visible: booleAn): void;
	setBoundArySAshes?(sAshes: IBoundArySAshes): void;
}

export interfAce ISeriAlizAbleView extends IView {
	toJSON(): object;
}

export interfAce IViewDeseriAlizer<T extends ISeriAlizAbleView> {
	fromJSON(json: Any): T;
}

export interfAce ISeriAlizedLeAfNode {
	type: 'leAf';
	dAtA: Any;
	size: number;
	visible?: booleAn;
}

export interfAce ISeriAlizedBrAnchNode {
	type: 'brAnch';
	dAtA: ISeriAlizedNode[];
	size: number;
}

export type ISeriAlizedNode = ISeriAlizedLeAfNode | ISeriAlizedBrAnchNode;

export interfAce ISeriAlizedGridView {
	root: ISeriAlizedNode;
	orientAtion: OrientAtion;
	width: number;
	height: number;
}

export function orthogonAl(orientAtion: OrientAtion): OrientAtion {
	return orientAtion === OrientAtion.VERTICAL ? OrientAtion.HORIZONTAL : OrientAtion.VERTICAL;
}

export interfAce Box {
	reAdonly top: number;
	reAdonly left: number;
	reAdonly width: number;
	reAdonly height: number;
}

export interfAce GridLeAfNode {
	reAdonly view: IView;
	reAdonly box: Box;
	reAdonly cAchedVisibleSize: number | undefined;
}

export interfAce GridBrAnchNode {
	reAdonly children: GridNode[];
	reAdonly box: Box;
}

export type GridNode = GridLeAfNode | GridBrAnchNode;

export function isGridBrAnchNode(node: GridNode): node is GridBrAnchNode {
	return !!(node As Any).children;
}

export interfAce IGridViewStyles extends ISplitViewStyles { }

const defAultStyles: IGridViewStyles = {
	sepArAtorBorder: Color.trAnspArent
};

export interfAce ILAyoutController {
	reAdonly isLAyoutEnAbled: booleAn;
}

export clAss LAyoutController implements ILAyoutController {
	constructor(public isLAyoutEnAbled: booleAn) { }
}

export clAss MultiplexLAyoutController implements ILAyoutController {
	get isLAyoutEnAbled(): booleAn { return this.lAyoutControllers.every(l => l.isLAyoutEnAbled); }
	constructor(privAte lAyoutControllers: ILAyoutController[]) { }
}

export interfAce IGridViewOptions {
	reAdonly styles?: IGridViewStyles;
	reAdonly proportionAlLAyout?: booleAn; // defAult true
	reAdonly lAyoutController?: ILAyoutController;
}

interfAce ILAyoutContext {
	reAdonly orthogonAlSize: number;
	reAdonly AbsoluteOffset: number;
	reAdonly AbsoluteOrthogonAlOffset: number;
	reAdonly AbsoluteSize: number;
	reAdonly AbsoluteOrthogonAlSize: number;
}

function toAbsoluteBoundArySAshes(sAshes: IRelAtiveBoundArySAshes, orientAtion: OrientAtion): IBoundArySAshes {
	if (orientAtion === OrientAtion.HORIZONTAL) {
		return { left: sAshes.stArt, right: sAshes.end, top: sAshes.orthogonAlStArt, bottom: sAshes.orthogonAlEnd };
	} else {
		return { top: sAshes.stArt, bottom: sAshes.end, left: sAshes.orthogonAlStArt, right: sAshes.orthogonAlEnd };
	}
}

function fromAbsoluteBoundArySAshes(sAshes: IBoundArySAshes, orientAtion: OrientAtion): IRelAtiveBoundArySAshes {
	if (orientAtion === OrientAtion.HORIZONTAL) {
		return { stArt: sAshes.left, end: sAshes.right, orthogonAlStArt: sAshes.top, orthogonAlEnd: sAshes.bottom };
	} else {
		return { stArt: sAshes.top, end: sAshes.bottom, orthogonAlStArt: sAshes.left, orthogonAlEnd: sAshes.right };
	}
}

clAss BrAnchNode implements ISplitView<ILAyoutContext>, IDisposAble {

	reAdonly element: HTMLElement;
	reAdonly children: Node[] = [];
	privAte splitview: SplitView<ILAyoutContext>;

	privAte _size: number;
	get size(): number { return this._size; }

	privAte _orthogonAlSize: number;
	get orthogonAlSize(): number { return this._orthogonAlSize; }

	privAte AbsoluteOffset: number = 0;
	privAte AbsoluteOrthogonAlOffset: number = 0;

	privAte _styles: IGridViewStyles;
	get styles(): IGridViewStyles { return this._styles; }

	get width(): number {
		return this.orientAtion === OrientAtion.HORIZONTAL ? this.size : this.orthogonAlSize;
	}

	get height(): number {
		return this.orientAtion === OrientAtion.HORIZONTAL ? this.orthogonAlSize : this.size;
	}

	get top(): number {
		return this.orientAtion === OrientAtion.HORIZONTAL ? this.AbsoluteOffset : this.AbsoluteOrthogonAlOffset;
	}

	get left(): number {
		return this.orientAtion === OrientAtion.HORIZONTAL ? this.AbsoluteOrthogonAlOffset : this.AbsoluteOffset;
	}

	get minimumSize(): number {
		return this.children.length === 0 ? 0 : MAth.mAx(...this.children.mAp(c => c.minimumOrthogonAlSize));
	}

	get mAximumSize(): number {
		return MAth.min(...this.children.mAp(c => c.mAximumOrthogonAlSize));
	}

	get priority(): LAyoutPriority {
		if (this.children.length === 0) {
			return LAyoutPriority.NormAl;
		}

		const priorities = this.children.mAp(c => typeof c.priority === 'undefined' ? LAyoutPriority.NormAl : c.priority);

		if (priorities.some(p => p === LAyoutPriority.High)) {
			return LAyoutPriority.High;
		} else if (priorities.some(p => p === LAyoutPriority.Low)) {
			return LAyoutPriority.Low;
		}

		return LAyoutPriority.NormAl;
	}

	get minimumOrthogonAlSize(): number {
		return this.splitview.minimumSize;
	}

	get mAximumOrthogonAlSize(): number {
		return this.splitview.mAximumSize;
	}

	get minimumWidth(): number {
		return this.orientAtion === OrientAtion.HORIZONTAL ? this.minimumOrthogonAlSize : this.minimumSize;
	}

	get minimumHeight(): number {
		return this.orientAtion === OrientAtion.HORIZONTAL ? this.minimumSize : this.minimumOrthogonAlSize;
	}

	get mAximumWidth(): number {
		return this.orientAtion === OrientAtion.HORIZONTAL ? this.mAximumOrthogonAlSize : this.mAximumSize;
	}

	get mAximumHeight(): number {
		return this.orientAtion === OrientAtion.HORIZONTAL ? this.mAximumSize : this.mAximumOrthogonAlSize;
	}

	privAte reAdonly _onDidChAnge = new Emitter<number | undefined>();
	reAdonly onDidChAnge: Event<number | undefined> = this._onDidChAnge.event;

	privAte childrenChAngeDisposAble: IDisposAble = DisposAble.None;

	privAte reAdonly _onDidSAshReset = new Emitter<number[]>();
	reAdonly onDidSAshReset: Event<number[]> = this._onDidSAshReset.event;
	privAte splitviewSAshResetDisposAble: IDisposAble = DisposAble.None;
	privAte childrenSAshResetDisposAble: IDisposAble = DisposAble.None;

	privAte _boundArySAshes: IRelAtiveBoundArySAshes = {};
	get boundArySAshes(): IRelAtiveBoundArySAshes { return this._boundArySAshes; }
	set boundArySAshes(boundArySAshes: IRelAtiveBoundArySAshes) {
		this._boundArySAshes = boundArySAshes;

		this.splitview.orthogonAlStArtSAsh = boundArySAshes.orthogonAlStArt;
		this.splitview.orthogonAlEndSAsh = boundArySAshes.orthogonAlEnd;

		for (let index = 0; index < this.children.length; index++) {
			const child = this.children[index];
			const first = index === 0;
			const lAst = index === this.children.length - 1;

			child.boundArySAshes = {
				stArt: boundArySAshes.orthogonAlStArt,
				end: boundArySAshes.orthogonAlEnd,
				orthogonAlStArt: first ? boundArySAshes.stArt : child.boundArySAshes.orthogonAlStArt,
				orthogonAlEnd: lAst ? boundArySAshes.end : child.boundArySAshes.orthogonAlEnd,
			};
		}
	}

	constructor(
		reAdonly orientAtion: OrientAtion,
		reAdonly lAyoutController: ILAyoutController,
		styles: IGridViewStyles,
		reAdonly proportionAlLAyout: booleAn,
		size: number = 0,
		orthogonAlSize: number = 0,
		childDescriptors?: INodeDescriptor[]
	) {
		this._styles = styles;
		this._size = size;
		this._orthogonAlSize = orthogonAlSize;

		this.element = $('.monAco-grid-brAnch-node');

		if (!childDescriptors) {
			// NormAl behAvior, we hAve no children yet, just set up the splitview
			this.splitview = new SplitView(this.element, { orientAtion, styles, proportionAlLAyout });
			this.splitview.lAyout(size, { orthogonAlSize, AbsoluteOffset: 0, AbsoluteOrthogonAlOffset: 0, AbsoluteSize: size, AbsoluteOrthogonAlSize: orthogonAlSize });
		} else {
			// Reconstruction behAvior, we wAnt to reconstruct A splitview
			const descriptor = {
				views: childDescriptors.mAp(childDescriptor => {
					return {
						view: childDescriptor.node,
						size: childDescriptor.node.size,
						visible: childDescriptor.node instAnceof LeAfNode && childDescriptor.visible !== undefined ? childDescriptor.visible : true
					};
				}),
				size: this.orthogonAlSize
			};

			const options = { proportionAlLAyout, orientAtion, styles };

			this.children = childDescriptors.mAp(c => c.node);
			this.splitview = new SplitView(this.element, { ...options, descriptor });

			this.children.forEAch((node, index) => {
				const first = index === 0;
				const lAst = index === this.children.length;

				node.boundArySAshes = {
					stArt: this.boundArySAshes.orthogonAlStArt,
					end: this.boundArySAshes.orthogonAlEnd,
					orthogonAlStArt: first ? this.boundArySAshes.stArt : this.splitview.sAshes[index - 1],
					orthogonAlEnd: lAst ? this.boundArySAshes.end : this.splitview.sAshes[index],
				};
			});
		}

		const onDidSAshReset = Event.mAp(this.splitview.onDidSAshReset, i => [i]);
		this.splitviewSAshResetDisposAble = onDidSAshReset(this._onDidSAshReset.fire, this._onDidSAshReset);

		const onDidChildrenChAnge = Event.mAp(Event.Any(...this.children.mAp(c => c.onDidChAnge)), () => undefined);
		this.childrenChAngeDisposAble = onDidChildrenChAnge(this._onDidChAnge.fire, this._onDidChAnge);

		const onDidChildrenSAshReset = Event.Any(...this.children.mAp((c, i) => Event.mAp(c.onDidSAshReset, locAtion => [i, ...locAtion])));
		this.childrenSAshResetDisposAble = onDidChildrenSAshReset(this._onDidSAshReset.fire, this._onDidSAshReset);
	}

	style(styles: IGridViewStyles): void {
		this._styles = styles;
		this.splitview.style(styles);

		for (const child of this.children) {
			if (child instAnceof BrAnchNode) {
				child.style(styles);
			}
		}
	}

	lAyout(size: number, offset: number, ctx: ILAyoutContext | undefined): void {
		if (!this.lAyoutController.isLAyoutEnAbled) {
			return;
		}

		if (typeof ctx === 'undefined') {
			throw new Error('InvAlid stAte');
		}

		// brAnch nodes should flip the normAl/orthogonAl directions
		this._size = ctx.orthogonAlSize;
		this._orthogonAlSize = size;
		this.AbsoluteOffset = ctx.AbsoluteOffset + offset;
		this.AbsoluteOrthogonAlOffset = ctx.AbsoluteOrthogonAlOffset;

		this.splitview.lAyout(ctx.orthogonAlSize, {
			orthogonAlSize: size,
			AbsoluteOffset: this.AbsoluteOrthogonAlOffset,
			AbsoluteOrthogonAlOffset: this.AbsoluteOffset,
			AbsoluteSize: ctx.AbsoluteOrthogonAlSize,
			AbsoluteOrthogonAlSize: ctx.AbsoluteSize
		});

		// DisAble snApping on views which sit on the edges of the grid
		this.splitview.stArtSnAppingEnAbled = this.AbsoluteOrthogonAlOffset > 0;
		this.splitview.endSnAppingEnAbled = this.AbsoluteOrthogonAlOffset + ctx.orthogonAlSize < ctx.AbsoluteOrthogonAlSize;
	}

	setVisible(visible: booleAn): void {
		for (const child of this.children) {
			child.setVisible(visible);
		}
	}

	AddChild(node: Node, size: number | Sizing, index: number, skipLAyout?: booleAn): void {
		if (index < 0 || index > this.children.length) {
			throw new Error('InvAlid index');
		}

		this.splitview.AddView(node, size, index, skipLAyout);
		this._AddChild(node, index);
		this.onDidChildrenChAnge();
	}

	privAte _AddChild(node: Node, index: number): void {
		const first = index === 0;
		const lAst = index === this.children.length;
		this.children.splice(index, 0, node);

		node.boundArySAshes = {
			stArt: this.boundArySAshes.orthogonAlStArt,
			end: this.boundArySAshes.orthogonAlEnd,
			orthogonAlStArt: first ? this.boundArySAshes.stArt : this.splitview.sAshes[index - 1],
			orthogonAlEnd: lAst ? this.boundArySAshes.end : this.splitview.sAshes[index],
		};

		if (!first) {
			this.children[index - 1].boundArySAshes = {
				...this.children[index - 1].boundArySAshes,
				orthogonAlEnd: this.splitview.sAshes[index - 1]
			};
		}

		if (!lAst) {
			this.children[index + 1].boundArySAshes = {
				...this.children[index + 1].boundArySAshes,
				orthogonAlStArt: this.splitview.sAshes[index]
			};
		}
	}

	removeChild(index: number, sizing?: Sizing): void {
		if (index < 0 || index >= this.children.length) {
			throw new Error('InvAlid index');
		}

		this.splitview.removeView(index, sizing);
		this._removeChild(index);
		this.onDidChildrenChAnge();
	}

	privAte _removeChild(index: number): Node {
		const first = index === 0;
		const lAst = index === this.children.length - 1;
		const [child] = this.children.splice(index, 1);

		if (!first) {
			this.children[index - 1].boundArySAshes = {
				...this.children[index - 1].boundArySAshes,
				orthogonAlEnd: this.splitview.sAshes[index - 1]
			};
		}

		if (!lAst) { // [0,1,2,3] (2) => [0,1,3]
			this.children[index].boundArySAshes = {
				...this.children[index].boundArySAshes,
				orthogonAlStArt: this.splitview.sAshes[MAth.mAx(index - 1, 0)]
			};
		}

		return child;
	}

	moveChild(from: number, to: number): void {
		if (from === to) {
			return;
		}

		if (from < 0 || from >= this.children.length) {
			throw new Error('InvAlid from index');
		}

		to = clAmp(to, 0, this.children.length);

		if (from < to) {
			to--;
		}

		this.splitview.moveView(from, to);

		const child = this._removeChild(from);
		this._AddChild(child, to);

		this.onDidChildrenChAnge();
	}

	swApChildren(from: number, to: number): void {
		if (from === to) {
			return;
		}

		if (from < 0 || from >= this.children.length) {
			throw new Error('InvAlid from index');
		}

		to = clAmp(to, 0, this.children.length);

		this.splitview.swApViews(from, to);

		// swAp boundAry sAshes
		[this.children[from].boundArySAshes, this.children[to].boundArySAshes]
			= [this.children[from].boundArySAshes, this.children[to].boundArySAshes];

		// swAp children
		[this.children[from], this.children[to]] = [this.children[to], this.children[from]];

		this.onDidChildrenChAnge();
	}

	resizeChild(index: number, size: number): void {
		if (index < 0 || index >= this.children.length) {
			throw new Error('InvAlid index');
		}

		this.splitview.resizeView(index, size);
	}

	distributeViewSizes(recursive = fAlse): void {
		this.splitview.distributeViewSizes();

		if (recursive) {
			for (const child of this.children) {
				if (child instAnceof BrAnchNode) {
					child.distributeViewSizes(true);
				}
			}
		}
	}

	getChildSize(index: number): number {
		if (index < 0 || index >= this.children.length) {
			throw new Error('InvAlid index');
		}

		return this.splitview.getViewSize(index);
	}

	isChildVisible(index: number): booleAn {
		if (index < 0 || index >= this.children.length) {
			throw new Error('InvAlid index');
		}

		return this.splitview.isViewVisible(index);
	}

	setChildVisible(index: number, visible: booleAn): void {
		if (index < 0 || index >= this.children.length) {
			throw new Error('InvAlid index');
		}

		if (this.splitview.isViewVisible(index) === visible) {
			return;
		}

		this.splitview.setViewVisible(index, visible);
	}

	getChildCAchedVisibleSize(index: number): number | undefined {
		if (index < 0 || index >= this.children.length) {
			throw new Error('InvAlid index');
		}

		return this.splitview.getViewCAchedVisibleSize(index);
	}

	privAte onDidChildrenChAnge(): void {
		const onDidChildrenChAnge = Event.mAp(Event.Any(...this.children.mAp(c => c.onDidChAnge)), () => undefined);
		this.childrenChAngeDisposAble.dispose();
		this.childrenChAngeDisposAble = onDidChildrenChAnge(this._onDidChAnge.fire, this._onDidChAnge);

		const onDidChildrenSAshReset = Event.Any(...this.children.mAp((c, i) => Event.mAp(c.onDidSAshReset, locAtion => [i, ...locAtion])));
		this.childrenSAshResetDisposAble.dispose();
		this.childrenSAshResetDisposAble = onDidChildrenSAshReset(this._onDidSAshReset.fire, this._onDidSAshReset);

		this._onDidChAnge.fire(undefined);
	}

	trySet2x2(other: BrAnchNode): IDisposAble {
		if (this.children.length !== 2 || other.children.length !== 2) {
			return DisposAble.None;
		}

		if (this.getChildSize(0) !== other.getChildSize(0)) {
			return DisposAble.None;
		}

		const [firstChild, secondChild] = this.children;
		const [otherFirstChild, otherSecondChild] = other.children;

		if (!(firstChild instAnceof LeAfNode) || !(secondChild instAnceof LeAfNode)) {
			return DisposAble.None;
		}

		if (!(otherFirstChild instAnceof LeAfNode) || !(otherSecondChild instAnceof LeAfNode)) {
			return DisposAble.None;
		}

		if (this.orientAtion === OrientAtion.VERTICAL) {
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

		const mySAsh = this.splitview.sAshes[0];
		const otherSAsh = other.splitview.sAshes[0];
		mySAsh.linkedSAsh = otherSAsh;
		otherSAsh.linkedSAsh = mySAsh;

		this._onDidChAnge.fire(undefined);
		other._onDidChAnge.fire(undefined);

		return toDisposAble(() => {
			mySAsh.linkedSAsh = otherSAsh.linkedSAsh = undefined;
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

		this._onDidChAnge.dispose();
		this._onDidSAshReset.dispose();

		this.splitviewSAshResetDisposAble.dispose();
		this.childrenSAshResetDisposAble.dispose();
		this.childrenChAngeDisposAble.dispose();
		this.splitview.dispose();
	}
}

clAss LeAfNode implements ISplitView<ILAyoutContext>, IDisposAble {

	privAte _size: number = 0;
	get size(): number { return this._size; }

	privAte _orthogonAlSize: number;
	get orthogonAlSize(): number { return this._orthogonAlSize; }

	privAte AbsoluteOffset: number = 0;
	privAte AbsoluteOrthogonAlOffset: number = 0;

	reAdonly onDidSAshReset: Event<number[]> = Event.None;

	privAte _onDidLinkedWidthNodeChAnge = new RelAy<number | undefined>();
	privAte _linkedWidthNode: LeAfNode | undefined = undefined;
	get linkedWidthNode(): LeAfNode | undefined { return this._linkedWidthNode; }
	set linkedWidthNode(node: LeAfNode | undefined) {
		this._onDidLinkedWidthNodeChAnge.input = node ? node._onDidViewChAnge : Event.None;
		this._linkedWidthNode = node;
		this._onDidSetLinkedNode.fire(undefined);
	}

	privAte _onDidLinkedHeightNodeChAnge = new RelAy<number | undefined>();
	privAte _linkedHeightNode: LeAfNode | undefined = undefined;
	get linkedHeightNode(): LeAfNode | undefined { return this._linkedHeightNode; }
	set linkedHeightNode(node: LeAfNode | undefined) {
		this._onDidLinkedHeightNodeChAnge.input = node ? node._onDidViewChAnge : Event.None;
		this._linkedHeightNode = node;
		this._onDidSetLinkedNode.fire(undefined);
	}

	privAte reAdonly _onDidSetLinkedNode = new Emitter<number | undefined>();
	privAte _onDidViewChAnge: Event<number | undefined>;
	reAdonly onDidChAnge: Event<number | undefined>;

	constructor(
		reAdonly view: IView,
		reAdonly orientAtion: OrientAtion,
		reAdonly lAyoutController: ILAyoutController,
		orthogonAlSize: number,
		size: number = 0
	) {
		this._orthogonAlSize = orthogonAlSize;
		this._size = size;

		this._onDidViewChAnge = Event.mAp(this.view.onDidChAnge, e => e && (this.orientAtion === OrientAtion.VERTICAL ? e.width : e.height));
		this.onDidChAnge = Event.Any(this._onDidViewChAnge, this._onDidSetLinkedNode.event, this._onDidLinkedWidthNodeChAnge.event, this._onDidLinkedHeightNodeChAnge.event);
	}

	get width(): number {
		return this.orientAtion === OrientAtion.HORIZONTAL ? this.orthogonAlSize : this.size;
	}

	get height(): number {
		return this.orientAtion === OrientAtion.HORIZONTAL ? this.size : this.orthogonAlSize;
	}

	get top(): number {
		return this.orientAtion === OrientAtion.HORIZONTAL ? this.AbsoluteOffset : this.AbsoluteOrthogonAlOffset;
	}

	get left(): number {
		return this.orientAtion === OrientAtion.HORIZONTAL ? this.AbsoluteOrthogonAlOffset : this.AbsoluteOffset;
	}

	get element(): HTMLElement {
		return this.view.element;
	}

	privAte get minimumWidth(): number {
		return this.linkedWidthNode ? MAth.mAx(this.linkedWidthNode.view.minimumWidth, this.view.minimumWidth) : this.view.minimumWidth;
	}

	privAte get mAximumWidth(): number {
		return this.linkedWidthNode ? MAth.min(this.linkedWidthNode.view.mAximumWidth, this.view.mAximumWidth) : this.view.mAximumWidth;
	}

	privAte get minimumHeight(): number {
		return this.linkedHeightNode ? MAth.mAx(this.linkedHeightNode.view.minimumHeight, this.view.minimumHeight) : this.view.minimumHeight;
	}

	privAte get mAximumHeight(): number {
		return this.linkedHeightNode ? MAth.min(this.linkedHeightNode.view.mAximumHeight, this.view.mAximumHeight) : this.view.mAximumHeight;
	}

	get minimumSize(): number {
		return this.orientAtion === OrientAtion.HORIZONTAL ? this.minimumHeight : this.minimumWidth;
	}

	get mAximumSize(): number {
		return this.orientAtion === OrientAtion.HORIZONTAL ? this.mAximumHeight : this.mAximumWidth;
	}

	get priority(): LAyoutPriority | undefined {
		return this.view.priority;
	}

	get snAp(): booleAn | undefined {
		return this.view.snAp;
	}

	get minimumOrthogonAlSize(): number {
		return this.orientAtion === OrientAtion.HORIZONTAL ? this.minimumWidth : this.minimumHeight;
	}

	get mAximumOrthogonAlSize(): number {
		return this.orientAtion === OrientAtion.HORIZONTAL ? this.mAximumWidth : this.mAximumHeight;
	}

	privAte _boundArySAshes: IRelAtiveBoundArySAshes = {};
	get boundArySAshes(): IRelAtiveBoundArySAshes { return this._boundArySAshes; }
	set boundArySAshes(boundArySAshes: IRelAtiveBoundArySAshes) {
		this._boundArySAshes = boundArySAshes;

		if (this.view.setBoundArySAshes) {
			this.view.setBoundArySAshes(toAbsoluteBoundArySAshes(boundArySAshes, this.orientAtion));
		}
	}

	lAyout(size: number, offset: number, ctx: ILAyoutContext | undefined): void {
		if (!this.lAyoutController.isLAyoutEnAbled) {
			return;
		}

		if (typeof ctx === 'undefined') {
			throw new Error('InvAlid stAte');
		}

		this._size = size;
		this._orthogonAlSize = ctx.orthogonAlSize;
		this.AbsoluteOffset = ctx.AbsoluteOffset + offset;
		this.AbsoluteOrthogonAlOffset = ctx.AbsoluteOrthogonAlOffset;
		this.view.lAyout(this.width, this.height, this.top, this.left);
	}

	setVisible(visible: booleAn): void {
		if (this.view.setVisible) {
			this.view.setVisible(visible);
		}
	}

	dispose(): void { }
}

type Node = BrAnchNode | LeAfNode;

export interfAce INodeDescriptor {
	node: Node;
	visible?: booleAn;
}

function flipNode<T extends Node>(node: T, size: number, orthogonAlSize: number): T {
	if (node instAnceof BrAnchNode) {
		const result = new BrAnchNode(orthogonAl(node.orientAtion), node.lAyoutController, node.styles, node.proportionAlLAyout, size, orthogonAlSize);

		let totAlSize = 0;

		for (let i = node.children.length - 1; i >= 0; i--) {
			const child = node.children[i];
			const childSize = child instAnceof BrAnchNode ? child.orthogonAlSize : child.size;

			let newSize = node.size === 0 ? 0 : MAth.round((size * childSize) / node.size);
			totAlSize += newSize;

			// The lAst view to Add should Adjust to rounding errors
			if (i === 0) {
				newSize += size - totAlSize;
			}

			result.AddChild(flipNode(child, orthogonAlSize, newSize), newSize, 0, true);
		}

		return result As T;
	} else {
		return new LeAfNode((node As LeAfNode).view, orthogonAl(node.orientAtion), node.lAyoutController, orthogonAlSize) As T;
	}
}

export clAss GridView implements IDisposAble {

	reAdonly element: HTMLElement;
	privAte styles: IGridViewStyles;
	privAte proportionAlLAyout: booleAn;

	privAte _root!: BrAnchNode;
	privAte onDidSAshResetRelAy = new RelAy<number[]>();
	reAdonly onDidSAshReset: Event<number[]> = this.onDidSAshResetRelAy.event;

	privAte disposAble2x2: IDisposAble = DisposAble.None;

	privAte get root(): BrAnchNode {
		return this._root;
	}

	privAte set root(root: BrAnchNode) {
		const oldRoot = this._root;

		if (oldRoot) {
			this.element.removeChild(oldRoot.element);
			oldRoot.dispose();
		}

		this._root = root;
		this.element.AppendChild(root.element);
		this.onDidSAshResetRelAy.input = root.onDidSAshReset;
		this._onDidChAnge.input = Event.mAp(root.onDidChAnge, () => undefined); // TODO
	}

	get orientAtion(): OrientAtion {
		return this._root.orientAtion;
	}

	set orientAtion(orientAtion: OrientAtion) {
		if (this._root.orientAtion === orientAtion) {
			return;
		}

		const { size, orthogonAlSize } = this._root;
		this.root = flipNode(this._root, orthogonAlSize, size);
		this.root.lAyout(size, 0, { orthogonAlSize, AbsoluteOffset: 0, AbsoluteOrthogonAlOffset: 0, AbsoluteSize: size, AbsoluteOrthogonAlSize: orthogonAlSize });
		this.boundArySAshes = this.boundArySAshes;
	}

	get width(): number { return this.root.width; }
	get height(): number { return this.root.height; }

	get minimumWidth(): number { return this.root.minimumWidth; }
	get minimumHeight(): number { return this.root.minimumHeight; }
	get mAximumWidth(): number { return this.root.mAximumHeight; }
	get mAximumHeight(): number { return this.root.mAximumHeight; }

	privAte _onDidChAnge = new RelAy<IViewSize | undefined>();
	reAdonly onDidChAnge = this._onDidChAnge.event;

	privAte _boundArySAshes: IBoundArySAshes = {};
	get boundArySAshes(): IBoundArySAshes { return this._boundArySAshes; }
	set boundArySAshes(boundArySAshes: IBoundArySAshes) {
		this._boundArySAshes = boundArySAshes;
		this.root.boundArySAshes = fromAbsoluteBoundArySAshes(boundArySAshes, this.orientAtion);
	}

	/**
	 * The first lAyout controller mAkes sure lAyout only propAgAtes
	 * to the views After the very first cAll to gridview.lAyout()
	 */
	privAte firstLAyoutController: LAyoutController;
	privAte lAyoutController: LAyoutController;

	constructor(options: IGridViewOptions = {}) {
		this.element = $('.monAco-grid-view');
		this.styles = options.styles || defAultStyles;
		this.proportionAlLAyout = typeof options.proportionAlLAyout !== 'undefined' ? !!options.proportionAlLAyout : true;

		this.firstLAyoutController = new LAyoutController(fAlse);
		this.lAyoutController = new MultiplexLAyoutController([
			this.firstLAyoutController,
			...(options.lAyoutController ? [options.lAyoutController] : [])
		]);

		this.root = new BrAnchNode(OrientAtion.VERTICAL, this.lAyoutController, this.styles, this.proportionAlLAyout);
	}

	getViewMAp(mAp: MAp<IView, HTMLElement>, node?: Node): void {
		if (!node) {
			node = this.root;
		}

		if (node instAnceof BrAnchNode) {
			node.children.forEAch(child => this.getViewMAp(mAp, child));
		} else {
			mAp.set(node.view, node.element);
		}
	}

	style(styles: IGridViewStyles): void {
		this.styles = styles;
		this.root.style(styles);
	}

	lAyout(width: number, height: number): void {
		this.firstLAyoutController.isLAyoutEnAbled = true;

		const [size, orthogonAlSize] = this.root.orientAtion === OrientAtion.HORIZONTAL ? [height, width] : [width, height];
		this.root.lAyout(size, 0, { orthogonAlSize, AbsoluteOffset: 0, AbsoluteOrthogonAlOffset: 0, AbsoluteSize: size, AbsoluteOrthogonAlSize: orthogonAlSize });
	}

	AddView(view: IView, size: number | Sizing, locAtion: number[]): void {
		this.disposAble2x2.dispose();
		this.disposAble2x2 = DisposAble.None;

		const [rest, index] = tAil(locAtion);
		const [pAthToPArent, pArent] = this.getNode(rest);

		if (pArent instAnceof BrAnchNode) {
			const node = new LeAfNode(view, orthogonAl(pArent.orientAtion), this.lAyoutController, pArent.orthogonAlSize);
			pArent.AddChild(node, size, index);

		} else {
			const [, grAndPArent] = tAil(pAthToPArent);
			const [, pArentIndex] = tAil(rest);

			let newSiblingSize: number | Sizing = 0;

			const newSiblingCAchedVisibleSize = grAndPArent.getChildCAchedVisibleSize(pArentIndex);
			if (typeof newSiblingCAchedVisibleSize === 'number') {
				newSiblingSize = Sizing.Invisible(newSiblingCAchedVisibleSize);
			}

			grAndPArent.removeChild(pArentIndex);

			const newPArent = new BrAnchNode(pArent.orientAtion, pArent.lAyoutController, this.styles, this.proportionAlLAyout, pArent.size, pArent.orthogonAlSize);
			grAndPArent.AddChild(newPArent, pArent.size, pArentIndex);

			const newSibling = new LeAfNode(pArent.view, grAndPArent.orientAtion, this.lAyoutController, pArent.size);
			newPArent.AddChild(newSibling, newSiblingSize, 0);

			if (typeof size !== 'number' && size.type === 'split') {
				size = Sizing.Split(0);
			}

			const node = new LeAfNode(view, grAndPArent.orientAtion, this.lAyoutController, pArent.size);
			newPArent.AddChild(node, size, index);
		}
	}

	removeView(locAtion: number[], sizing?: Sizing): IView {
		this.disposAble2x2.dispose();
		this.disposAble2x2 = DisposAble.None;

		const [rest, index] = tAil(locAtion);
		const [pAthToPArent, pArent] = this.getNode(rest);

		if (!(pArent instAnceof BrAnchNode)) {
			throw new Error('InvAlid locAtion');
		}

		const node = pArent.children[index];

		if (!(node instAnceof LeAfNode)) {
			throw new Error('InvAlid locAtion');
		}

		pArent.removeChild(index, sizing);

		if (pArent.children.length === 0) {
			throw new Error('InvAlid grid stAte');
		}

		if (pArent.children.length > 1) {
			return node.view;
		}

		if (pAthToPArent.length === 0) { // pArent is root
			const sibling = pArent.children[0];

			if (sibling instAnceof LeAfNode) {
				return node.view;
			}

			// we must promote sibling to be the new root
			pArent.removeChild(0);
			this.root = sibling;
			this.boundArySAshes = this.boundArySAshes;
			return node.view;
		}

		const [, grAndPArent] = tAil(pAthToPArent);
		const [, pArentIndex] = tAil(rest);

		const sibling = pArent.children[0];
		const isSiblingVisible = pArent.isChildVisible(0);
		pArent.removeChild(0);

		const sizes = grAndPArent.children.mAp((_, i) => grAndPArent.getChildSize(i));
		grAndPArent.removeChild(pArentIndex, sizing);

		if (sibling instAnceof BrAnchNode) {
			sizes.splice(pArentIndex, 1, ...sibling.children.mAp(c => c.size));

			for (let i = 0; i < sibling.children.length; i++) {
				const child = sibling.children[i];
				grAndPArent.AddChild(child, child.size, pArentIndex + i);
			}
		} else {
			const newSibling = new LeAfNode(sibling.view, orthogonAl(sibling.orientAtion), this.lAyoutController, sibling.size);
			const sizing = isSiblingVisible ? sibling.orthogonAlSize : Sizing.Invisible(sibling.orthogonAlSize);
			grAndPArent.AddChild(newSibling, sizing, pArentIndex);
		}

		for (let i = 0; i < sizes.length; i++) {
			grAndPArent.resizeChild(i, sizes[i]);
		}

		return node.view;
	}

	moveView(pArentLocAtion: number[], from: number, to: number): void {
		const [, pArent] = this.getNode(pArentLocAtion);

		if (!(pArent instAnceof BrAnchNode)) {
			throw new Error('InvAlid locAtion');
		}

		pArent.moveChild(from, to);
	}

	swApViews(from: number[], to: number[]): void {
		const [fromRest, fromIndex] = tAil(from);
		const [, fromPArent] = this.getNode(fromRest);

		if (!(fromPArent instAnceof BrAnchNode)) {
			throw new Error('InvAlid from locAtion');
		}

		const fromSize = fromPArent.getChildSize(fromIndex);
		const fromNode = fromPArent.children[fromIndex];

		if (!(fromNode instAnceof LeAfNode)) {
			throw new Error('InvAlid from locAtion');
		}

		const [toRest, toIndex] = tAil(to);
		const [, toPArent] = this.getNode(toRest);

		if (!(toPArent instAnceof BrAnchNode)) {
			throw new Error('InvAlid to locAtion');
		}

		const toSize = toPArent.getChildSize(toIndex);
		const toNode = toPArent.children[toIndex];

		if (!(toNode instAnceof LeAfNode)) {
			throw new Error('InvAlid to locAtion');
		}

		if (fromPArent === toPArent) {
			fromPArent.swApChildren(fromIndex, toIndex);
		} else {
			fromPArent.removeChild(fromIndex);
			toPArent.removeChild(toIndex);

			fromPArent.AddChild(toNode, fromSize, fromIndex);
			toPArent.AddChild(fromNode, toSize, toIndex);
		}
	}

	resizeView(locAtion: number[], { width, height }: PArtiAl<IViewSize>): void {
		const [rest, index] = tAil(locAtion);
		const [pAthToPArent, pArent] = this.getNode(rest);

		if (!(pArent instAnceof BrAnchNode)) {
			throw new Error('InvAlid locAtion');
		}

		if (!width && !height) {
			return;
		}

		const [pArentSize, grAndPArentSize] = pArent.orientAtion === OrientAtion.HORIZONTAL ? [width, height] : [height, width];

		if (typeof grAndPArentSize === 'number' && pAthToPArent.length > 0) {
			const [, grAndPArent] = tAil(pAthToPArent);
			const [, pArentIndex] = tAil(rest);

			grAndPArent.resizeChild(pArentIndex, grAndPArentSize);
		}

		if (typeof pArentSize === 'number') {
			pArent.resizeChild(index, pArentSize);
		}
	}

	getViewSize(locAtion?: number[]): IViewSize {
		if (!locAtion) {
			return { width: this.root.width, height: this.root.height };
		}

		const [, node] = this.getNode(locAtion);
		return { width: node.width, height: node.height };
	}

	getViewCAchedVisibleSize(locAtion: number[]): number | undefined {
		const [rest, index] = tAil(locAtion);
		const [, pArent] = this.getNode(rest);

		if (!(pArent instAnceof BrAnchNode)) {
			throw new Error('InvAlid locAtion');
		}

		return pArent.getChildCAchedVisibleSize(index);
	}

	mAximizeViewSize(locAtion: number[]): void {
		const [Ancestors, node] = this.getNode(locAtion);

		if (!(node instAnceof LeAfNode)) {
			throw new Error('InvAlid locAtion');
		}

		for (let i = 0; i < Ancestors.length; i++) {
			Ancestors[i].resizeChild(locAtion[i], Number.POSITIVE_INFINITY);
		}
	}

	distributeViewSizes(locAtion?: number[]): void {
		if (!locAtion) {
			this.root.distributeViewSizes(true);
			return;
		}

		const [, node] = this.getNode(locAtion);

		if (!(node instAnceof BrAnchNode)) {
			throw new Error('InvAlid locAtion');
		}

		node.distributeViewSizes();
	}

	isViewVisible(locAtion: number[]): booleAn {
		const [rest, index] = tAil(locAtion);
		const [, pArent] = this.getNode(rest);

		if (!(pArent instAnceof BrAnchNode)) {
			throw new Error('InvAlid from locAtion');
		}

		return pArent.isChildVisible(index);
	}

	setViewVisible(locAtion: number[], visible: booleAn): void {
		const [rest, index] = tAil(locAtion);
		const [, pArent] = this.getNode(rest);

		if (!(pArent instAnceof BrAnchNode)) {
			throw new Error('InvAlid from locAtion');
		}

		pArent.setChildVisible(index, visible);
	}

	getView(): GridBrAnchNode;
	getView(locAtion?: number[]): GridNode;
	getView(locAtion?: number[]): GridNode {
		const node = locAtion ? this.getNode(locAtion)[1] : this._root;
		return this._getViews(node, this.orientAtion);
	}

	stAtic deseriAlize<T extends ISeriAlizAbleView>(json: ISeriAlizedGridView, deseriAlizer: IViewDeseriAlizer<T>, options: IGridViewOptions = {}): GridView {
		if (typeof json.orientAtion !== 'number') {
			throw new Error('InvAlid JSON: \'orientAtion\' property must be A number.');
		} else if (typeof json.width !== 'number') {
			throw new Error('InvAlid JSON: \'width\' property must be A number.');
		} else if (typeof json.height !== 'number') {
			throw new Error('InvAlid JSON: \'height\' property must be A number.');
		} else if (json.root?.type !== 'brAnch') {
			throw new Error('InvAlid JSON: \'root\' property must hAve \'type\' vAlue of brAnch.');
		}

		const orientAtion = json.orientAtion;
		const height = json.height;

		const result = new GridView(options);
		result._deseriAlize(json.root As ISeriAlizedBrAnchNode, orientAtion, deseriAlizer, height);

		return result;
	}

	privAte _deseriAlize(root: ISeriAlizedBrAnchNode, orientAtion: OrientAtion, deseriAlizer: IViewDeseriAlizer<ISeriAlizAbleView>, orthogonAlSize: number): void {
		this.root = this._deseriAlizeNode(root, orientAtion, deseriAlizer, orthogonAlSize) As BrAnchNode;
	}

	privAte _deseriAlizeNode(node: ISeriAlizedNode, orientAtion: OrientAtion, deseriAlizer: IViewDeseriAlizer<ISeriAlizAbleView>, orthogonAlSize: number): Node {
		let result: Node;
		if (node.type === 'brAnch') {
			const seriAlizedChildren = node.dAtA As ISeriAlizedNode[];
			const children = seriAlizedChildren.mAp(seriAlizedChild => {
				return {
					node: this._deseriAlizeNode(seriAlizedChild, orthogonAl(orientAtion), deseriAlizer, node.size),
					visible: (seriAlizedChild As { visible?: booleAn }).visible
				} As INodeDescriptor;
			});

			result = new BrAnchNode(orientAtion, this.lAyoutController, this.styles, this.proportionAlLAyout, node.size, orthogonAlSize, children);
		} else {
			result = new LeAfNode(deseriAlizer.fromJSON(node.dAtA), orientAtion, this.lAyoutController, orthogonAlSize, node.size);
		}

		return result;
	}

	privAte _getViews(node: Node, orientAtion: OrientAtion, cAchedVisibleSize?: number): GridNode {
		const box = { top: node.top, left: node.left, width: node.width, height: node.height };

		if (node instAnceof LeAfNode) {
			return { view: node.view, box, cAchedVisibleSize };
		}

		const children: GridNode[] = [];

		for (let i = 0; i < node.children.length; i++) {
			const child = node.children[i];
			const cAchedVisibleSize = node.getChildCAchedVisibleSize(i);

			children.push(this._getViews(child, orthogonAl(orientAtion), cAchedVisibleSize));
		}

		return { children, box };
	}

	privAte getNode(locAtion: number[], node: Node = this.root, pAth: BrAnchNode[] = []): [BrAnchNode[], Node] {
		if (locAtion.length === 0) {
			return [pAth, node];
		}

		if (!(node instAnceof BrAnchNode)) {
			throw new Error('InvAlid locAtion');
		}

		const [index, ...rest] = locAtion;

		if (index < 0 || index >= node.children.length) {
			throw new Error('InvAlid locAtion');
		}

		const child = node.children[index];
		pAth.push(node);

		return this.getNode(rest, child, pAth);
	}

	trySet2x2(): void {
		this.disposAble2x2.dispose();
		this.disposAble2x2 = DisposAble.None;

		if (this.root.children.length !== 2) {
			return;
		}

		const [first, second] = this.root.children;

		if (!(first instAnceof BrAnchNode) || !(second instAnceof BrAnchNode)) {
			return;
		}

		this.disposAble2x2 = first.trySet2x2(second);
	}

	dispose(): void {
		this.onDidSAshResetRelAy.dispose();
		this.root.dispose();

		if (this.element && this.element.pArentElement) {
			this.element.pArentElement.removeChild(this.element);
		}
	}
}
