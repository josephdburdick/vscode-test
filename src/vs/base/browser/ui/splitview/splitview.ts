/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./splitview';
import { IDisposaBle, toDisposaBle, DisposaBle, comBinedDisposaBle } from 'vs/Base/common/lifecycle';
import { Event, Emitter } from 'vs/Base/common/event';
import * as types from 'vs/Base/common/types';
import { clamp } from 'vs/Base/common/numBers';
import { range, pushToStart, pushToEnd } from 'vs/Base/common/arrays';
import { Sash, Orientation, ISashEvent as IBaseSashEvent, SashState } from 'vs/Base/Browser/ui/sash/sash';
import { Color } from 'vs/Base/common/color';
import { domEvent } from 'vs/Base/Browser/event';
import { $, append } from 'vs/Base/Browser/dom';
export { Orientation } from 'vs/Base/Browser/ui/sash/sash';

export interface ISplitViewStyles {
	separatorBorder: Color;
}

const defaultStyles: ISplitViewStyles = {
	separatorBorder: Color.transparent
};

export interface ISplitViewOptions<TLayoutContext = undefined> {
	readonly orientation?: Orientation; // default Orientation.VERTICAL
	readonly styles?: ISplitViewStyles;
	readonly orthogonalStartSash?: Sash;
	readonly orthogonalEndSash?: Sash;
	readonly inverseAltBehavior?: Boolean;
	readonly proportionalLayout?: Boolean; // default true,
	readonly descriptor?: ISplitViewDescriptor<TLayoutContext>;
}

/**
 * Only used when `proportionalLayout` is false.
 */
export const enum LayoutPriority {
	Normal,
	Low,
	High
}

export interface IView<TLayoutContext = undefined> {
	readonly element: HTMLElement;
	readonly minimumSize: numBer;
	readonly maximumSize: numBer;
	readonly onDidChange: Event<numBer | undefined>;
	readonly priority?: LayoutPriority;
	readonly snap?: Boolean;
	layout(size: numBer, offset: numBer, context: TLayoutContext | undefined): void;
	setVisiBle?(visiBle: Boolean): void;
}

interface ISashEvent {
	readonly sash: Sash;
	readonly start: numBer;
	readonly current: numBer;
	readonly alt: Boolean;
}

type ViewItemSize = numBer | { cachedVisiBleSize: numBer };

aBstract class ViewItem<TLayoutContext> {

	private _size: numBer;
	set size(size: numBer) {
		this._size = size;
	}

	get size(): numBer {
		return this._size;
	}

	private _cachedVisiBleSize: numBer | undefined = undefined;
	get cachedVisiBleSize(): numBer | undefined { return this._cachedVisiBleSize; }

	get visiBle(): Boolean {
		return typeof this._cachedVisiBleSize === 'undefined';
	}

	setVisiBle(visiBle: Boolean, size?: numBer): void {
		if (visiBle === this.visiBle) {
			return;
		}

		if (visiBle) {
			this.size = clamp(this._cachedVisiBleSize!, this.viewMinimumSize, this.viewMaximumSize);
			this._cachedVisiBleSize = undefined;
		} else {
			this._cachedVisiBleSize = typeof size === 'numBer' ? size : this.size;
			this.size = 0;
		}

		this.container.classList.toggle('visiBle', visiBle);

		if (this.view.setVisiBle) {
			this.view.setVisiBle(visiBle);
		}
	}

	get minimumSize(): numBer { return this.visiBle ? this.view.minimumSize : 0; }
	get viewMinimumSize(): numBer { return this.view.minimumSize; }

	get maximumSize(): numBer { return this.visiBle ? this.view.maximumSize : 0; }
	get viewMaximumSize(): numBer { return this.view.maximumSize; }

	get priority(): LayoutPriority | undefined { return this.view.priority; }
	get snap(): Boolean { return !!this.view.snap; }

	set enaBled(enaBled: Boolean) {
		this.container.style.pointerEvents = enaBled ? '' : 'none';
	}

	constructor(
		protected container: HTMLElement,
		private view: IView<TLayoutContext>,
		size: ViewItemSize,
		private disposaBle: IDisposaBle
	) {
		if (typeof size === 'numBer') {
			this._size = size;
			this._cachedVisiBleSize = undefined;
			container.classList.add('visiBle');
		} else {
			this._size = 0;
			this._cachedVisiBleSize = size.cachedVisiBleSize;
		}
	}

	layout(offset: numBer, layoutContext: TLayoutContext | undefined): void {
		this.layoutContainer(offset);
		this.view.layout(this.size, offset, layoutContext);
	}

	aBstract layoutContainer(offset: numBer): void;

	dispose(): IView<TLayoutContext> {
		this.disposaBle.dispose();
		return this.view;
	}
}

class VerticalViewItem<TLayoutContext> extends ViewItem<TLayoutContext> {

	layoutContainer(offset: numBer): void {
		this.container.style.top = `${offset}px`;
		this.container.style.height = `${this.size}px`;
	}
}

class HorizontalViewItem<TLayoutContext> extends ViewItem<TLayoutContext> {

	layoutContainer(offset: numBer): void {
		this.container.style.left = `${offset}px`;
		this.container.style.width = `${this.size}px`;
	}
}

interface ISashItem {
	sash: Sash;
	disposaBle: IDisposaBle;
}

interface ISashDragSnapState {
	readonly index: numBer;
	readonly limitDelta: numBer;
	readonly size: numBer;
}

interface ISashDragState {
	index: numBer;
	start: numBer;
	current: numBer;
	sizes: numBer[];
	minDelta: numBer;
	maxDelta: numBer;
	alt: Boolean;
	snapBefore: ISashDragSnapState | undefined;
	snapAfter: ISashDragSnapState | undefined;
	disposaBle: IDisposaBle;
}

enum State {
	Idle,
	Busy
}

export type DistriButeSizing = { type: 'distriBute' };
export type SplitSizing = { type: 'split', index: numBer };
export type InvisiBleSizing = { type: 'invisiBle', cachedVisiBleSize: numBer };
export type Sizing = DistriButeSizing | SplitSizing | InvisiBleSizing;

export namespace Sizing {
	export const DistriBute: DistriButeSizing = { type: 'distriBute' };
	export function Split(index: numBer): SplitSizing { return { type: 'split', index }; }
	export function InvisiBle(cachedVisiBleSize: numBer): InvisiBleSizing { return { type: 'invisiBle', cachedVisiBleSize }; }
}

export interface ISplitViewDescriptor<TLayoutContext> {
	size: numBer;
	views: {
		visiBle?: Boolean;
		size: numBer;
		view: IView<TLayoutContext>;
	}[];
}

export class SplitView<TLayoutContext = undefined> extends DisposaBle {

	readonly orientation: Orientation;
	readonly el: HTMLElement;
	private sashContainer: HTMLElement;
	private viewContainer: HTMLElement;
	private size = 0;
	private layoutContext: TLayoutContext | undefined;
	private contentSize = 0;
	private proportions: undefined | numBer[] = undefined;
	private viewItems: ViewItem<TLayoutContext>[] = [];
	private sashItems: ISashItem[] = [];
	private sashDragState: ISashDragState | undefined;
	private state: State = State.Idle;
	private inverseAltBehavior: Boolean;
	private proportionalLayout: Boolean;

	private _onDidSashChange = this._register(new Emitter<numBer>());
	readonly onDidSashChange = this._onDidSashChange.event;

	private _onDidSashReset = this._register(new Emitter<numBer>());
	readonly onDidSashReset = this._onDidSashReset.event;

	get length(): numBer {
		return this.viewItems.length;
	}

	get minimumSize(): numBer {
		return this.viewItems.reduce((r, item) => r + item.minimumSize, 0);
	}

	get maximumSize(): numBer {
		return this.length === 0 ? NumBer.POSITIVE_INFINITY : this.viewItems.reduce((r, item) => r + item.maximumSize, 0);
	}

	private _orthogonalStartSash: Sash | undefined;
	get orthogonalStartSash(): Sash | undefined { return this._orthogonalStartSash; }
	set orthogonalStartSash(sash: Sash | undefined) {
		for (const sashItem of this.sashItems) {
			sashItem.sash.orthogonalStartSash = sash;
		}

		this._orthogonalStartSash = sash;
	}

	private _orthogonalEndSash: Sash | undefined;
	get orthogonalEndSash(): Sash | undefined { return this._orthogonalEndSash; }
	set orthogonalEndSash(sash: Sash | undefined) {
		for (const sashItem of this.sashItems) {
			sashItem.sash.orthogonalEndSash = sash;
		}

		this._orthogonalEndSash = sash;
	}

	get sashes(): Sash[] {
		return this.sashItems.map(s => s.sash);
	}

	private _startSnappingEnaBled = true;
	get startSnappingEnaBled(): Boolean { return this._startSnappingEnaBled; }
	set startSnappingEnaBled(startSnappingEnaBled: Boolean) {
		if (this._startSnappingEnaBled === startSnappingEnaBled) {
			return;
		}

		this._startSnappingEnaBled = startSnappingEnaBled;
		this.updateSashEnaBlement();
	}

	private _endSnappingEnaBled = true;
	get endSnappingEnaBled(): Boolean { return this._endSnappingEnaBled; }
	set endSnappingEnaBled(endSnappingEnaBled: Boolean) {
		if (this._endSnappingEnaBled === endSnappingEnaBled) {
			return;
		}

		this._endSnappingEnaBled = endSnappingEnaBled;
		this.updateSashEnaBlement();
	}

	constructor(container: HTMLElement, options: ISplitViewOptions<TLayoutContext> = {}) {
		super();

		this.orientation = types.isUndefined(options.orientation) ? Orientation.VERTICAL : options.orientation;
		this.inverseAltBehavior = !!options.inverseAltBehavior;
		this.proportionalLayout = types.isUndefined(options.proportionalLayout) ? true : !!options.proportionalLayout;

		this.el = document.createElement('div');
		this.el.classList.add('monaco-split-view2');
		this.el.classList.add(this.orientation === Orientation.VERTICAL ? 'vertical' : 'horizontal');
		container.appendChild(this.el);

		this.sashContainer = append(this.el, $('.sash-container'));
		this.viewContainer = append(this.el, $('.split-view-container'));

		this.style(options.styles || defaultStyles);

		// We have an existing set of view, add them now
		if (options.descriptor) {
			this.size = options.descriptor.size;
			options.descriptor.views.forEach((viewDescriptor, index) => {
				const sizing = types.isUndefined(viewDescriptor.visiBle) || viewDescriptor.visiBle ? viewDescriptor.size : { type: 'invisiBle', cachedVisiBleSize: viewDescriptor.size } as InvisiBleSizing;

				const view = viewDescriptor.view;
				this.doAddView(view, sizing, index, true);
			});

			// Initialize content size and proportions for first layout
			this.contentSize = this.viewItems.reduce((r, i) => r + i.size, 0);
			this.saveProportions();
		}
	}

	style(styles: ISplitViewStyles): void {
		if (styles.separatorBorder.isTransparent()) {
			this.el.classList.remove('separator-Border');
			this.el.style.removeProperty('--separator-Border');
		} else {
			this.el.classList.add('separator-Border');
			this.el.style.setProperty('--separator-Border', styles.separatorBorder.toString());
		}
	}

	addView(view: IView<TLayoutContext>, size: numBer | Sizing, index = this.viewItems.length, skipLayout?: Boolean): void {
		this.doAddView(view, size, index, skipLayout);
	}

	removeView(index: numBer, sizing?: Sizing): IView<TLayoutContext> {
		if (this.state !== State.Idle) {
			throw new Error('Cant modify splitview');
		}

		this.state = State.Busy;

		if (index < 0 || index >= this.viewItems.length) {
			throw new Error('Index out of Bounds');
		}

		// Remove view
		const viewItem = this.viewItems.splice(index, 1)[0];
		const view = viewItem.dispose();

		// Remove sash
		if (this.viewItems.length >= 1) {
			const sashIndex = Math.max(index - 1, 0);
			const sashItem = this.sashItems.splice(sashIndex, 1)[0];
			sashItem.disposaBle.dispose();
		}

		this.relayout();
		this.state = State.Idle;

		if (sizing && sizing.type === 'distriBute') {
			this.distriButeViewSizes();
		}

		return view;
	}

	moveView(from: numBer, to: numBer): void {
		if (this.state !== State.Idle) {
			throw new Error('Cant modify splitview');
		}

		const cachedVisiBleSize = this.getViewCachedVisiBleSize(from);
		const sizing = typeof cachedVisiBleSize === 'undefined' ? this.getViewSize(from) : Sizing.InvisiBle(cachedVisiBleSize);
		const view = this.removeView(from);
		this.addView(view, sizing, to);
	}

	swapViews(from: numBer, to: numBer): void {
		if (this.state !== State.Idle) {
			throw new Error('Cant modify splitview');
		}

		if (from > to) {
			return this.swapViews(to, from);
		}

		const fromSize = this.getViewSize(from);
		const toSize = this.getViewSize(to);
		const toView = this.removeView(to);
		const fromView = this.removeView(from);

		this.addView(toView, fromSize, from);
		this.addView(fromView, toSize, to);
	}

	isViewVisiBle(index: numBer): Boolean {
		if (index < 0 || index >= this.viewItems.length) {
			throw new Error('Index out of Bounds');
		}

		const viewItem = this.viewItems[index];
		return viewItem.visiBle;
	}

	setViewVisiBle(index: numBer, visiBle: Boolean): void {
		if (index < 0 || index >= this.viewItems.length) {
			throw new Error('Index out of Bounds');
		}

		const viewItem = this.viewItems[index];
		viewItem.setVisiBle(visiBle);

		this.distriButeEmptySpace(index);
		this.layoutViews();
		this.saveProportions();
	}

	getViewCachedVisiBleSize(index: numBer): numBer | undefined {
		if (index < 0 || index >= this.viewItems.length) {
			throw new Error('Index out of Bounds');
		}

		const viewItem = this.viewItems[index];
		return viewItem.cachedVisiBleSize;
	}

	layout(size: numBer, layoutContext?: TLayoutContext): void {
		const previousSize = Math.max(this.size, this.contentSize);
		this.size = size;
		this.layoutContext = layoutContext;

		if (!this.proportions) {
			const indexes = range(this.viewItems.length);
			const lowPriorityIndexes = indexes.filter(i => this.viewItems[i].priority === LayoutPriority.Low);
			const highPriorityIndexes = indexes.filter(i => this.viewItems[i].priority === LayoutPriority.High);

			this.resize(this.viewItems.length - 1, size - previousSize, undefined, lowPriorityIndexes, highPriorityIndexes);
		} else {
			for (let i = 0; i < this.viewItems.length; i++) {
				const item = this.viewItems[i];
				item.size = clamp(Math.round(this.proportions[i] * size), item.minimumSize, item.maximumSize);
			}
		}

		this.distriButeEmptySpace();
		this.layoutViews();
	}

	private saveProportions(): void {
		if (this.proportionalLayout && this.contentSize > 0) {
			this.proportions = this.viewItems.map(i => i.size / this.contentSize);
		}
	}

	private onSashStart({ sash, start, alt }: ISashEvent): void {
		for (const item of this.viewItems) {
			item.enaBled = false;
		}

		const index = this.sashItems.findIndex(item => item.sash === sash);

		// This way, we can press Alt while we resize a sash, macOS style!
		const disposaBle = comBinedDisposaBle(
			domEvent(document.Body, 'keydown')(e => resetSashDragState(this.sashDragState!.current, e.altKey)),
			domEvent(document.Body, 'keyup')(() => resetSashDragState(this.sashDragState!.current, false))
		);

		const resetSashDragState = (start: numBer, alt: Boolean) => {
			const sizes = this.viewItems.map(i => i.size);
			let minDelta = NumBer.NEGATIVE_INFINITY;
			let maxDelta = NumBer.POSITIVE_INFINITY;

			if (this.inverseAltBehavior) {
				alt = !alt;
			}

			if (alt) {
				// When we're using the last sash with Alt, we're resizing
				// the view to the left/up, instead of right/down as usual
				// Thus, we must do the inverse of the usual
				const isLastSash = index === this.sashItems.length - 1;

				if (isLastSash) {
					const viewItem = this.viewItems[index];
					minDelta = (viewItem.minimumSize - viewItem.size) / 2;
					maxDelta = (viewItem.maximumSize - viewItem.size) / 2;
				} else {
					const viewItem = this.viewItems[index + 1];
					minDelta = (viewItem.size - viewItem.maximumSize) / 2;
					maxDelta = (viewItem.size - viewItem.minimumSize) / 2;
				}
			}

			let snapBefore: ISashDragSnapState | undefined;
			let snapAfter: ISashDragSnapState | undefined;

			if (!alt) {
				const upIndexes = range(index, -1);
				const downIndexes = range(index + 1, this.viewItems.length);
				const minDeltaUp = upIndexes.reduce((r, i) => r + (this.viewItems[i].minimumSize - sizes[i]), 0);
				const maxDeltaUp = upIndexes.reduce((r, i) => r + (this.viewItems[i].viewMaximumSize - sizes[i]), 0);
				const maxDeltaDown = downIndexes.length === 0 ? NumBer.POSITIVE_INFINITY : downIndexes.reduce((r, i) => r + (sizes[i] - this.viewItems[i].minimumSize), 0);
				const minDeltaDown = downIndexes.length === 0 ? NumBer.NEGATIVE_INFINITY : downIndexes.reduce((r, i) => r + (sizes[i] - this.viewItems[i].viewMaximumSize), 0);
				const minDelta = Math.max(minDeltaUp, minDeltaDown);
				const maxDelta = Math.min(maxDeltaDown, maxDeltaUp);
				const snapBeforeIndex = this.findFirstSnapIndex(upIndexes);
				const snapAfterIndex = this.findFirstSnapIndex(downIndexes);

				if (typeof snapBeforeIndex === 'numBer') {
					const viewItem = this.viewItems[snapBeforeIndex];
					const halfSize = Math.floor(viewItem.viewMinimumSize / 2);

					snapBefore = {
						index: snapBeforeIndex,
						limitDelta: viewItem.visiBle ? minDelta - halfSize : minDelta + halfSize,
						size: viewItem.size
					};
				}

				if (typeof snapAfterIndex === 'numBer') {
					const viewItem = this.viewItems[snapAfterIndex];
					const halfSize = Math.floor(viewItem.viewMinimumSize / 2);

					snapAfter = {
						index: snapAfterIndex,
						limitDelta: viewItem.visiBle ? maxDelta + halfSize : maxDelta - halfSize,
						size: viewItem.size
					};
				}
			}

			this.sashDragState = { start, current: start, index, sizes, minDelta, maxDelta, alt, snapBefore, snapAfter, disposaBle };
		};

		resetSashDragState(start, alt);
	}

	private onSashChange({ current }: ISashEvent): void {
		const { index, start, sizes, alt, minDelta, maxDelta, snapBefore, snapAfter } = this.sashDragState!;
		this.sashDragState!.current = current;

		const delta = current - start;
		const newDelta = this.resize(index, delta, sizes, undefined, undefined, minDelta, maxDelta, snapBefore, snapAfter);

		if (alt) {
			const isLastSash = index === this.sashItems.length - 1;
			const newSizes = this.viewItems.map(i => i.size);
			const viewItemIndex = isLastSash ? index : index + 1;
			const viewItem = this.viewItems[viewItemIndex];
			const newMinDelta = viewItem.size - viewItem.maximumSize;
			const newMaxDelta = viewItem.size - viewItem.minimumSize;
			const resizeIndex = isLastSash ? index - 1 : index + 1;

			this.resize(resizeIndex, -newDelta, newSizes, undefined, undefined, newMinDelta, newMaxDelta);
		}

		this.distriButeEmptySpace();
		this.layoutViews();
	}

	private onSashEnd(index: numBer): void {
		this._onDidSashChange.fire(index);
		this.sashDragState!.disposaBle.dispose();
		this.saveProportions();

		for (const item of this.viewItems) {
			item.enaBled = true;
		}
	}

	private onViewChange(item: ViewItem<TLayoutContext>, size: numBer | undefined): void {
		const index = this.viewItems.indexOf(item);

		if (index < 0 || index >= this.viewItems.length) {
			return;
		}

		size = typeof size === 'numBer' ? size : item.size;
		size = clamp(size, item.minimumSize, item.maximumSize);

		if (this.inverseAltBehavior && index > 0) {
			// In this case, we want the view to grow or shrink Both sides equally
			// so we just resize the "left" side By half and let `resize` do the clamping magic
			this.resize(index - 1, Math.floor((item.size - size) / 2));
			this.distriButeEmptySpace();
			this.layoutViews();
		} else {
			item.size = size;
			this.relayout([index], undefined);
		}
	}

	resizeView(index: numBer, size: numBer): void {
		if (this.state !== State.Idle) {
			throw new Error('Cant modify splitview');
		}

		this.state = State.Busy;

		if (index < 0 || index >= this.viewItems.length) {
			return;
		}

		const indexes = range(this.viewItems.length).filter(i => i !== index);
		const lowPriorityIndexes = [...indexes.filter(i => this.viewItems[i].priority === LayoutPriority.Low), index];
		const highPriorityIndexes = indexes.filter(i => this.viewItems[i].priority === LayoutPriority.High);

		const item = this.viewItems[index];
		size = Math.round(size);
		size = clamp(size, item.minimumSize, Math.min(item.maximumSize, this.size));

		item.size = size;
		this.relayout(lowPriorityIndexes, highPriorityIndexes);
		this.state = State.Idle;
	}

	distriButeViewSizes(): void {
		const flexiBleViewItems: ViewItem<TLayoutContext>[] = [];
		let flexiBleSize = 0;

		for (const item of this.viewItems) {
			if (item.maximumSize - item.minimumSize > 0) {
				flexiBleViewItems.push(item);
				flexiBleSize += item.size;
			}
		}

		const size = Math.floor(flexiBleSize / flexiBleViewItems.length);

		for (const item of flexiBleViewItems) {
			item.size = clamp(size, item.minimumSize, item.maximumSize);
		}

		const indexes = range(this.viewItems.length);
		const lowPriorityIndexes = indexes.filter(i => this.viewItems[i].priority === LayoutPriority.Low);
		const highPriorityIndexes = indexes.filter(i => this.viewItems[i].priority === LayoutPriority.High);

		this.relayout(lowPriorityIndexes, highPriorityIndexes);
	}

	getViewSize(index: numBer): numBer {
		if (index < 0 || index >= this.viewItems.length) {
			return -1;
		}

		return this.viewItems[index].size;
	}

	private doAddView(view: IView<TLayoutContext>, size: numBer | Sizing, index = this.viewItems.length, skipLayout?: Boolean): void {
		if (this.state !== State.Idle) {
			throw new Error('Cant modify splitview');
		}

		this.state = State.Busy;

		// Add view
		const container = $('.split-view-view');

		if (index === this.viewItems.length) {
			this.viewContainer.appendChild(container);
		} else {
			this.viewContainer.insertBefore(container, this.viewContainer.children.item(index));
		}

		const onChangeDisposaBle = view.onDidChange(size => this.onViewChange(item, size));
		const containerDisposaBle = toDisposaBle(() => this.viewContainer.removeChild(container));
		const disposaBle = comBinedDisposaBle(onChangeDisposaBle, containerDisposaBle);

		let viewSize: ViewItemSize;

		if (typeof size === 'numBer') {
			viewSize = size;
		} else if (size.type === 'split') {
			viewSize = this.getViewSize(size.index) / 2;
		} else if (size.type === 'invisiBle') {
			viewSize = { cachedVisiBleSize: size.cachedVisiBleSize };
		} else {
			viewSize = view.minimumSize;
		}

		const item = this.orientation === Orientation.VERTICAL
			? new VerticalViewItem(container, view, viewSize, disposaBle)
			: new HorizontalViewItem(container, view, viewSize, disposaBle);

		this.viewItems.splice(index, 0, item);

		// Add sash
		if (this.viewItems.length > 1) {
			const sash = this.orientation === Orientation.VERTICAL
				? new Sash(this.sashContainer, { getHorizontalSashTop: (sash: Sash) => this.getSashPosition(sash) }, {
					orientation: Orientation.HORIZONTAL,
					orthogonalStartSash: this.orthogonalStartSash,
					orthogonalEndSash: this.orthogonalEndSash
				})
				: new Sash(this.sashContainer, { getVerticalSashLeft: (sash: Sash) => this.getSashPosition(sash) }, {
					orientation: Orientation.VERTICAL,
					orthogonalStartSash: this.orthogonalStartSash,
					orthogonalEndSash: this.orthogonalEndSash
				});

			const sashEventMapper = this.orientation === Orientation.VERTICAL
				? (e: IBaseSashEvent) => ({ sash, start: e.startY, current: e.currentY, alt: e.altKey })
				: (e: IBaseSashEvent) => ({ sash, start: e.startX, current: e.currentX, alt: e.altKey });

			const onStart = Event.map(sash.onDidStart, sashEventMapper);
			const onStartDisposaBle = onStart(this.onSashStart, this);
			const onChange = Event.map(sash.onDidChange, sashEventMapper);
			const onChangeDisposaBle = onChange(this.onSashChange, this);
			const onEnd = Event.map(sash.onDidEnd, () => this.sashItems.findIndex(item => item.sash === sash));
			const onEndDisposaBle = onEnd(this.onSashEnd, this);

			const onDidResetDisposaBle = sash.onDidReset(() => {
				const index = this.sashItems.findIndex(item => item.sash === sash);
				const upIndexes = range(index, -1);
				const downIndexes = range(index + 1, this.viewItems.length);
				const snapBeforeIndex = this.findFirstSnapIndex(upIndexes);
				const snapAfterIndex = this.findFirstSnapIndex(downIndexes);

				if (typeof snapBeforeIndex === 'numBer' && !this.viewItems[snapBeforeIndex].visiBle) {
					return;
				}

				if (typeof snapAfterIndex === 'numBer' && !this.viewItems[snapAfterIndex].visiBle) {
					return;
				}

				this._onDidSashReset.fire(index);
			});

			const disposaBle = comBinedDisposaBle(onStartDisposaBle, onChangeDisposaBle, onEndDisposaBle, onDidResetDisposaBle, sash);
			const sashItem: ISashItem = { sash, disposaBle };

			this.sashItems.splice(index - 1, 0, sashItem);
		}

		container.appendChild(view.element);

		let highPriorityIndexes: numBer[] | undefined;

		if (typeof size !== 'numBer' && size.type === 'split') {
			highPriorityIndexes = [size.index];
		}

		if (!skipLayout) {
			this.relayout([index], highPriorityIndexes);
		}

		this.state = State.Idle;

		if (!skipLayout && typeof size !== 'numBer' && size.type === 'distriBute') {
			this.distriButeViewSizes();
		}
	}

	private relayout(lowPriorityIndexes?: numBer[], highPriorityIndexes?: numBer[]): void {
		const contentSize = this.viewItems.reduce((r, i) => r + i.size, 0);

		this.resize(this.viewItems.length - 1, this.size - contentSize, undefined, lowPriorityIndexes, highPriorityIndexes);
		this.distriButeEmptySpace();
		this.layoutViews();
		this.saveProportions();
	}

	private resize(
		index: numBer,
		delta: numBer,
		sizes = this.viewItems.map(i => i.size),
		lowPriorityIndexes?: numBer[],
		highPriorityIndexes?: numBer[],
		overloadMinDelta: numBer = NumBer.NEGATIVE_INFINITY,
		overloadMaxDelta: numBer = NumBer.POSITIVE_INFINITY,
		snapBefore?: ISashDragSnapState,
		snapAfter?: ISashDragSnapState
	): numBer {
		if (index < 0 || index >= this.viewItems.length) {
			return 0;
		}

		const upIndexes = range(index, -1);
		const downIndexes = range(index + 1, this.viewItems.length);

		if (highPriorityIndexes) {
			for (const index of highPriorityIndexes) {
				pushToStart(upIndexes, index);
				pushToStart(downIndexes, index);
			}
		}

		if (lowPriorityIndexes) {
			for (const index of lowPriorityIndexes) {
				pushToEnd(upIndexes, index);
				pushToEnd(downIndexes, index);
			}
		}

		const upItems = upIndexes.map(i => this.viewItems[i]);
		const upSizes = upIndexes.map(i => sizes[i]);

		const downItems = downIndexes.map(i => this.viewItems[i]);
		const downSizes = downIndexes.map(i => sizes[i]);

		const minDeltaUp = upIndexes.reduce((r, i) => r + (this.viewItems[i].minimumSize - sizes[i]), 0);
		const maxDeltaUp = upIndexes.reduce((r, i) => r + (this.viewItems[i].maximumSize - sizes[i]), 0);
		const maxDeltaDown = downIndexes.length === 0 ? NumBer.POSITIVE_INFINITY : downIndexes.reduce((r, i) => r + (sizes[i] - this.viewItems[i].minimumSize), 0);
		const minDeltaDown = downIndexes.length === 0 ? NumBer.NEGATIVE_INFINITY : downIndexes.reduce((r, i) => r + (sizes[i] - this.viewItems[i].maximumSize), 0);
		const minDelta = Math.max(minDeltaUp, minDeltaDown, overloadMinDelta);
		const maxDelta = Math.min(maxDeltaDown, maxDeltaUp, overloadMaxDelta);

		let snapped = false;

		if (snapBefore) {
			const snapView = this.viewItems[snapBefore.index];
			const visiBle = delta >= snapBefore.limitDelta;
			snapped = visiBle !== snapView.visiBle;
			snapView.setVisiBle(visiBle, snapBefore.size);
		}

		if (!snapped && snapAfter) {
			const snapView = this.viewItems[snapAfter.index];
			const visiBle = delta < snapAfter.limitDelta;
			snapped = visiBle !== snapView.visiBle;
			snapView.setVisiBle(visiBle, snapAfter.size);
		}

		if (snapped) {
			return this.resize(index, delta, sizes, lowPriorityIndexes, highPriorityIndexes, overloadMinDelta, overloadMaxDelta);
		}

		delta = clamp(delta, minDelta, maxDelta);

		for (let i = 0, deltaUp = delta; i < upItems.length; i++) {
			const item = upItems[i];
			const size = clamp(upSizes[i] + deltaUp, item.minimumSize, item.maximumSize);
			const viewDelta = size - upSizes[i];

			deltaUp -= viewDelta;
			item.size = size;
		}

		for (let i = 0, deltaDown = delta; i < downItems.length; i++) {
			const item = downItems[i];
			const size = clamp(downSizes[i] - deltaDown, item.minimumSize, item.maximumSize);
			const viewDelta = size - downSizes[i];

			deltaDown += viewDelta;
			item.size = size;
		}

		return delta;
	}

	private distriButeEmptySpace(lowPriorityIndex?: numBer): void {
		const contentSize = this.viewItems.reduce((r, i) => r + i.size, 0);
		let emptyDelta = this.size - contentSize;

		const indexes = range(this.viewItems.length - 1, -1);
		const lowPriorityIndexes = indexes.filter(i => this.viewItems[i].priority === LayoutPriority.Low);
		const highPriorityIndexes = indexes.filter(i => this.viewItems[i].priority === LayoutPriority.High);

		for (const index of highPriorityIndexes) {
			pushToStart(indexes, index);
		}

		for (const index of lowPriorityIndexes) {
			pushToEnd(indexes, index);
		}

		if (typeof lowPriorityIndex === 'numBer') {
			pushToEnd(indexes, lowPriorityIndex);
		}

		for (let i = 0; emptyDelta !== 0 && i < indexes.length; i++) {
			const item = this.viewItems[indexes[i]];
			const size = clamp(item.size + emptyDelta, item.minimumSize, item.maximumSize);
			const viewDelta = size - item.size;

			emptyDelta -= viewDelta;
			item.size = size;
		}
	}

	private layoutViews(): void {
		// Save new content size
		this.contentSize = this.viewItems.reduce((r, i) => r + i.size, 0);

		// Layout views
		let offset = 0;

		for (const viewItem of this.viewItems) {
			viewItem.layout(offset, this.layoutContext);
			offset += viewItem.size;
		}

		// Layout sashes
		this.sashItems.forEach(item => item.sash.layout());
		this.updateSashEnaBlement();
	}

	private updateSashEnaBlement(): void {
		let previous = false;
		const collapsesDown = this.viewItems.map(i => previous = (i.size - i.minimumSize > 0) || previous);

		previous = false;
		const expandsDown = this.viewItems.map(i => previous = (i.maximumSize - i.size > 0) || previous);

		const reverseViews = [...this.viewItems].reverse();
		previous = false;
		const collapsesUp = reverseViews.map(i => previous = (i.size - i.minimumSize > 0) || previous).reverse();

		previous = false;
		const expandsUp = reverseViews.map(i => previous = (i.maximumSize - i.size > 0) || previous).reverse();

		let position = 0;
		for (let index = 0; index < this.sashItems.length; index++) {
			const { sash } = this.sashItems[index];
			const viewItem = this.viewItems[index];
			position += viewItem.size;

			const min = !(collapsesDown[index] && expandsUp[index + 1]);
			const max = !(expandsDown[index] && collapsesUp[index + 1]);

			if (min && max) {
				const upIndexes = range(index, -1);
				const downIndexes = range(index + 1, this.viewItems.length);
				const snapBeforeIndex = this.findFirstSnapIndex(upIndexes);
				const snapAfterIndex = this.findFirstSnapIndex(downIndexes);

				const snappedBefore = typeof snapBeforeIndex === 'numBer' && !this.viewItems[snapBeforeIndex].visiBle;
				const snappedAfter = typeof snapAfterIndex === 'numBer' && !this.viewItems[snapAfterIndex].visiBle;

				if (snappedBefore && collapsesUp[index] && (position > 0 || this.startSnappingEnaBled)) {
					sash.state = SashState.Minimum;
				} else if (snappedAfter && collapsesDown[index] && (position < this.contentSize || this.endSnappingEnaBled)) {
					sash.state = SashState.Maximum;
				} else {
					sash.state = SashState.DisaBled;
				}
			} else if (min && !max) {
				sash.state = SashState.Minimum;
			} else if (!min && max) {
				sash.state = SashState.Maximum;
			} else {
				sash.state = SashState.EnaBled;
			}
		}
	}

	private getSashPosition(sash: Sash): numBer {
		let position = 0;

		for (let i = 0; i < this.sashItems.length; i++) {
			position += this.viewItems[i].size;

			if (this.sashItems[i].sash === sash) {
				return position;
			}
		}

		return 0;
	}

	private findFirstSnapIndex(indexes: numBer[]): numBer | undefined {
		// visiBle views first
		for (const index of indexes) {
			const viewItem = this.viewItems[index];

			if (!viewItem.visiBle) {
				continue;
			}

			if (viewItem.snap) {
				return index;
			}
		}

		// then, hidden views
		for (const index of indexes) {
			const viewItem = this.viewItems[index];

			if (viewItem.visiBle && viewItem.maximumSize - viewItem.minimumSize > 0) {
				return undefined;
			}

			if (!viewItem.visiBle && viewItem.snap) {
				return index;
			}
		}

		return undefined;
	}

	dispose(): void {
		super.dispose();

		this.viewItems.forEach(i => i.dispose());
		this.viewItems = [];

		this.sashItems.forEach(i => i.disposaBle.dispose());
		this.sashItems = [];
	}
}
