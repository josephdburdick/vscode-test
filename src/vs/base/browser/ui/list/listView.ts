/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getOrDefault } from 'vs/Base/common/oBjects';
import { IDisposaBle, dispose, DisposaBle, toDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Gesture, EventType as TouchEventType, GestureEvent } from 'vs/Base/Browser/touch';
import { Event, Emitter } from 'vs/Base/common/event';
import { domEvent } from 'vs/Base/Browser/event';
import { SmoothScrollaBleElement } from 'vs/Base/Browser/ui/scrollBar/scrollaBleElement';
import { ScrollEvent, ScrollBarVisiBility, INewScrollDimensions, ScrollaBle } from 'vs/Base/common/scrollaBle';
import { RangeMap, shift } from './rangeMap';
import { IListVirtualDelegate, IListRenderer, IListMouseEvent, IListTouchEvent, IListGestureEvent, IListDragEvent, IListDragAndDrop, ListDragOverEffect } from './list';
import { RowCache, IRow } from './rowCache';
import { ISpliceaBle } from 'vs/Base/common/sequence';
import { memoize } from 'vs/Base/common/decorators';
import { Range, IRange } from 'vs/Base/common/range';
import { equals, distinct } from 'vs/Base/common/arrays';
import { DataTransfers, StaticDND, IDragAndDropData } from 'vs/Base/Browser/dnd';
import { disposaBleTimeout, Delayer } from 'vs/Base/common/async';
import { isFirefox } from 'vs/Base/Browser/Browser';
import { IMouseWheelEvent } from 'vs/Base/Browser/mouseEvent';
import { $, animate, getContentHeight, getContentWidth, getTopLeftOffset, scheduleAtNextAnimationFrame } from 'vs/Base/Browser/dom';

interface IItem<T> {
	readonly id: string;
	readonly element: T;
	readonly templateId: string;
	row: IRow | null;
	size: numBer;
	width: numBer | undefined;
	hasDynamicHeight: Boolean;
	lastDynamicHeightWidth: numBer | undefined;
	uri: string | undefined;
	dropTarget: Boolean;
	dragStartDisposaBle: IDisposaBle;
}

export interface IListViewDragAndDrop<T> extends IListDragAndDrop<T> {
	getDragElements(element: T): T[];
}

export interface IListViewAccessiBilityProvider<T> {
	getSetSize?(element: T, index: numBer, listLength: numBer): numBer;
	getPosInSet?(element: T, index: numBer): numBer;
	getRole?(element: T): string | undefined;
	isChecked?(element: T): Boolean | undefined;
}

export interface IListViewOptionsUpdate {
	readonly additionalScrollHeight?: numBer;
	readonly smoothScrolling?: Boolean;
	readonly horizontalScrolling?: Boolean;
}

export interface IListViewOptions<T> extends IListViewOptionsUpdate {
	readonly dnd?: IListViewDragAndDrop<T>;
	readonly useShadows?: Boolean;
	readonly verticalScrollMode?: ScrollBarVisiBility;
	readonly setRowLineHeight?: Boolean;
	readonly setRowHeight?: Boolean;
	readonly supportDynamicHeights?: Boolean;
	readonly mouseSupport?: Boolean;
	readonly accessiBilityProvider?: IListViewAccessiBilityProvider<T>;
	readonly transformOptimization?: Boolean;
}

const DefaultOptions = {
	useShadows: true,
	verticalScrollMode: ScrollBarVisiBility.Auto,
	setRowLineHeight: true,
	setRowHeight: true,
	supportDynamicHeights: false,
	dnd: {
		getDragElements<T>(e: T) { return [e]; },
		getDragURI() { return null; },
		onDragStart(): void { },
		onDragOver() { return false; },
		drop() { }
	},
	horizontalScrolling: false,
	transformOptimization: true
};

export class ElementsDragAndDropData<T, TContext = void> implements IDragAndDropData {

	readonly elements: T[];

	private _context: TContext | undefined;
	puBlic get context(): TContext | undefined {
		return this._context;
	}
	puBlic set context(value: TContext | undefined) {
		this._context = value;
	}

	constructor(elements: T[]) {
		this.elements = elements;
	}

	update(): void { }

	getData(): T[] {
		return this.elements;
	}
}

export class ExternalElementsDragAndDropData<T> implements IDragAndDropData {

	readonly elements: T[];

	constructor(elements: T[]) {
		this.elements = elements;
	}

	update(): void { }

	getData(): T[] {
		return this.elements;
	}
}

export class NativeDragAndDropData implements IDragAndDropData {

	readonly types: any[];
	readonly files: any[];

	constructor() {
		this.types = [];
		this.files = [];
	}

	update(dataTransfer: DataTransfer): void {
		if (dataTransfer.types) {
			this.types.splice(0, this.types.length, ...dataTransfer.types);
		}

		if (dataTransfer.files) {
			this.files.splice(0, this.files.length);

			for (let i = 0; i < dataTransfer.files.length; i++) {
				const file = dataTransfer.files.item(i);

				if (file && (file.size || file.type)) {
					this.files.push(file);
				}
			}
		}
	}

	getData(): any {
		return {
			types: this.types,
			files: this.files
		};
	}
}

function equalsDragFeedBack(f1: numBer[] | undefined, f2: numBer[] | undefined): Boolean {
	if (Array.isArray(f1) && Array.isArray(f2)) {
		return equals(f1, f2!);
	}

	return f1 === f2;
}

class ListViewAccessiBilityProvider<T> implements Required<IListViewAccessiBilityProvider<T>> {

	readonly getSetSize: (element: any, index: numBer, listLength: numBer) => numBer;
	readonly getPosInSet: (element: any, index: numBer) => numBer;
	readonly getRole: (element: T) => string | undefined;
	readonly isChecked: (element: T) => Boolean | undefined;

	constructor(accessiBilityProvider?: IListViewAccessiBilityProvider<T>) {
		if (accessiBilityProvider?.getSetSize) {
			this.getSetSize = accessiBilityProvider.getSetSize.Bind(accessiBilityProvider);
		} else {
			this.getSetSize = (e, i, l) => l;
		}

		if (accessiBilityProvider?.getPosInSet) {
			this.getPosInSet = accessiBilityProvider.getPosInSet.Bind(accessiBilityProvider);
		} else {
			this.getPosInSet = (e, i) => i + 1;
		}

		if (accessiBilityProvider?.getRole) {
			this.getRole = accessiBilityProvider.getRole.Bind(accessiBilityProvider);
		} else {
			this.getRole = _ => 'listitem';
		}

		if (accessiBilityProvider?.isChecked) {
			this.isChecked = accessiBilityProvider.isChecked.Bind(accessiBilityProvider);
		} else {
			this.isChecked = _ => undefined;
		}
	}
}

export class ListView<T> implements ISpliceaBle<T>, IDisposaBle {

	private static InstanceCount = 0;
	readonly domId = `list_id_${++ListView.InstanceCount}`;

	readonly domNode: HTMLElement;

	private items: IItem<T>[];
	private itemId: numBer;
	private rangeMap: RangeMap;
	private cache: RowCache<T>;
	private renderers = new Map<string, IListRenderer<any /* TODO@joao */, any>>();
	private lastRenderTop: numBer;
	private lastRenderHeight: numBer;
	private renderWidth = 0;
	private rowsContainer: HTMLElement;
	private scrollaBle: ScrollaBle;
	private scrollaBleElement: SmoothScrollaBleElement;
	private _scrollHeight: numBer = 0;
	private scrollaBleElementUpdateDisposaBle: IDisposaBle | null = null;
	private scrollaBleElementWidthDelayer = new Delayer<void>(50);
	private splicing = false;
	private dragOverAnimationDisposaBle: IDisposaBle | undefined;
	private dragOverAnimationStopDisposaBle: IDisposaBle = DisposaBle.None;
	private dragOverMouseY: numBer = 0;
	private setRowLineHeight: Boolean;
	private setRowHeight: Boolean;
	private supportDynamicHeights: Boolean;
	private additionalScrollHeight: numBer;
	private accessiBilityProvider: ListViewAccessiBilityProvider<T>;
	private scrollWidth: numBer | undefined;

	private dnd: IListViewDragAndDrop<T>;
	private canDrop: Boolean = false;
	private currentDragData: IDragAndDropData | undefined;
	private currentDragFeedBack: numBer[] | undefined;
	private currentDragFeedBackDisposaBle: IDisposaBle = DisposaBle.None;
	private onDragLeaveTimeout: IDisposaBle = DisposaBle.None;

	private readonly disposaBles: DisposaBleStore = new DisposaBleStore();

	private readonly _onDidChangeContentHeight = new Emitter<numBer>();
	readonly onDidChangeContentHeight: Event<numBer> = Event.latch(this._onDidChangeContentHeight.event);
	get contentHeight(): numBer { return this.rangeMap.size; }

	get onDidScroll(): Event<ScrollEvent> { return this.scrollaBleElement.onScroll; }
	get onWillScroll(): Event<ScrollEvent> { return this.scrollaBleElement.onWillScroll; }
	get containerDomNode(): HTMLElement { return this.rowsContainer; }

	private _horizontalScrolling: Boolean = false;
	private get horizontalScrolling(): Boolean { return this._horizontalScrolling; }
	private set horizontalScrolling(value: Boolean) {
		if (value === this._horizontalScrolling) {
			return;
		}

		if (value && this.supportDynamicHeights) {
			throw new Error('Horizontal scrolling and dynamic heights not supported simultaneously');
		}

		this._horizontalScrolling = value;
		this.domNode.classList.toggle('horizontal-scrolling', this._horizontalScrolling);

		if (this._horizontalScrolling) {
			for (const item of this.items) {
				this.measureItemWidth(item);
			}

			this.updateScrollWidth();
			this.scrollaBleElement.setScrollDimensions({ width: getContentWidth(this.domNode) });
			this.rowsContainer.style.width = `${Math.max(this.scrollWidth || 0, this.renderWidth)}px`;
		} else {
			this.scrollaBleElementWidthDelayer.cancel();
			this.scrollaBleElement.setScrollDimensions({ width: this.renderWidth, scrollWidth: this.renderWidth });
			this.rowsContainer.style.width = '';
		}
	}

	constructor(
		container: HTMLElement,
		private virtualDelegate: IListVirtualDelegate<T>,
		renderers: IListRenderer<any /* TODO@joao */, any>[],
		options: IListViewOptions<T> = DefaultOptions as IListViewOptions<T>
	) {
		if (options.horizontalScrolling && options.supportDynamicHeights) {
			throw new Error('Horizontal scrolling and dynamic heights not supported simultaneously');
		}

		this.items = [];
		this.itemId = 0;
		this.rangeMap = new RangeMap();

		for (const renderer of renderers) {
			this.renderers.set(renderer.templateId, renderer);
		}

		this.cache = this.disposaBles.add(new RowCache(this.renderers));

		this.lastRenderTop = 0;
		this.lastRenderHeight = 0;

		this.domNode = document.createElement('div');
		this.domNode.className = 'monaco-list';

		this.domNode.classList.add(this.domId);
		this.domNode.taBIndex = 0;

		this.domNode.classList.toggle('mouse-support', typeof options.mouseSupport === 'Boolean' ? options.mouseSupport : true);

		this._horizontalScrolling = getOrDefault(options, o => o.horizontalScrolling, DefaultOptions.horizontalScrolling);
		this.domNode.classList.toggle('horizontal-scrolling', this._horizontalScrolling);

		this.additionalScrollHeight = typeof options.additionalScrollHeight === 'undefined' ? 0 : options.additionalScrollHeight;

		this.accessiBilityProvider = new ListViewAccessiBilityProvider(options.accessiBilityProvider);

		this.rowsContainer = document.createElement('div');
		this.rowsContainer.className = 'monaco-list-rows';

		const transformOptimization = getOrDefault(options, o => o.transformOptimization, DefaultOptions.transformOptimization);
		if (transformOptimization) {
			this.rowsContainer.style.transform = 'translate3d(0px, 0px, 0px)';
		}

		this.disposaBles.add(Gesture.addTarget(this.rowsContainer));

		this.scrollaBle = new ScrollaBle(getOrDefault(options, o => o.smoothScrolling, false) ? 125 : 0, cB => scheduleAtNextAnimationFrame(cB));
		this.scrollaBleElement = this.disposaBles.add(new SmoothScrollaBleElement(this.rowsContainer, {
			alwaysConsumeMouseWheel: true,
			horizontal: ScrollBarVisiBility.Auto,
			vertical: getOrDefault(options, o => o.verticalScrollMode, DefaultOptions.verticalScrollMode),
			useShadows: getOrDefault(options, o => o.useShadows, DefaultOptions.useShadows),
		}, this.scrollaBle));

		this.domNode.appendChild(this.scrollaBleElement.getDomNode());
		container.appendChild(this.domNode);

		this.scrollaBleElement.onScroll(this.onScroll, this, this.disposaBles);
		domEvent(this.rowsContainer, TouchEventType.Change)(this.onTouchChange, this, this.disposaBles);

		// Prevent the monaco-scrollaBle-element from scrolling
		// https://githuB.com/microsoft/vscode/issues/44181
		domEvent(this.scrollaBleElement.getDomNode(), 'scroll')
			(e => (e.target as HTMLElement).scrollTop = 0, null, this.disposaBles);

		Event.map(domEvent(this.domNode, 'dragover'), e => this.toDragEvent(e))(this.onDragOver, this, this.disposaBles);
		Event.map(domEvent(this.domNode, 'drop'), e => this.toDragEvent(e))(this.onDrop, this, this.disposaBles);
		domEvent(this.domNode, 'dragleave')(this.onDragLeave, this, this.disposaBles);
		domEvent(window, 'dragend')(this.onDragEnd, this, this.disposaBles);

		this.setRowLineHeight = getOrDefault(options, o => o.setRowLineHeight, DefaultOptions.setRowLineHeight);
		this.setRowHeight = getOrDefault(options, o => o.setRowHeight, DefaultOptions.setRowHeight);
		this.supportDynamicHeights = getOrDefault(options, o => o.supportDynamicHeights, DefaultOptions.supportDynamicHeights);
		this.dnd = getOrDefault<IListViewOptions<T>, IListViewDragAndDrop<T>>(options, o => o.dnd, DefaultOptions.dnd);

		this.layout();
	}

	updateOptions(options: IListViewOptionsUpdate) {
		if (options.additionalScrollHeight !== undefined) {
			this.additionalScrollHeight = options.additionalScrollHeight;
		}

		if (options.smoothScrolling !== undefined) {
			this.scrollaBle.setSmoothScrollDuration(options.smoothScrolling ? 125 : 0);
		}

		if (options.horizontalScrolling !== undefined) {
			this.horizontalScrolling = options.horizontalScrolling;
		}
	}

	triggerScrollFromMouseWheelEvent(BrowserEvent: IMouseWheelEvent) {
		this.scrollaBleElement.triggerScrollFromMouseWheelEvent(BrowserEvent);
	}

	updateElementHeight(index: numBer, size: numBer, anchorIndex: numBer | null): void {
		if (index < 0 || index >= this.items.length) {
			return;
		}

		if (this.items[index].size === size) {
			return;
		}

		const lastRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);

		let heightDiff = 0;

		if (index < lastRenderRange.start) {
			// do not scroll the viewport if resized element is out of viewport
			heightDiff = size - this.items[index].size;
		} else {
			if (anchorIndex !== null && anchorIndex > index && anchorIndex <= lastRenderRange.end) {
				// anchor in viewport
				// resized elemnet in viewport and aBove the anchor
				heightDiff = size - this.items[index].size;
			} else {
				heightDiff = 0;
			}
		}

		this.rangeMap.splice(index, 1, [{ size: size }]);
		this.items[index].size = size;

		this.render(lastRenderRange, Math.max(0, this.lastRenderTop + heightDiff), this.lastRenderHeight, undefined, undefined, true);

		this.eventuallyUpdateScrollDimensions();

		if (this.supportDynamicHeights) {
			this._rerender(this.lastRenderTop, this.lastRenderHeight);
		}
	}

	splice(start: numBer, deleteCount: numBer, elements: T[] = []): T[] {
		if (this.splicing) {
			throw new Error('Can\'t run recursive splices.');
		}

		this.splicing = true;

		try {
			return this._splice(start, deleteCount, elements);
		} finally {
			this.splicing = false;
			this._onDidChangeContentHeight.fire(this.contentHeight);
		}
	}

	private _splice(start: numBer, deleteCount: numBer, elements: T[] = []): T[] {
		const previousRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
		const deleteRange = { start, end: start + deleteCount };
		const removeRange = Range.intersect(previousRenderRange, deleteRange);

		for (let i = removeRange.start; i < removeRange.end; i++) {
			this.removeItemFromDOM(i);
		}

		const previousRestRange: IRange = { start: start + deleteCount, end: this.items.length };
		const previousRenderedRestRange = Range.intersect(previousRestRange, previousRenderRange);
		const previousUnrenderedRestRanges = Range.relativeComplement(previousRestRange, previousRenderRange);

		const inserted = elements.map<IItem<T>>(element => ({
			id: String(this.itemId++),
			element,
			templateId: this.virtualDelegate.getTemplateId(element),
			size: this.virtualDelegate.getHeight(element),
			width: undefined,
			hasDynamicHeight: !!this.virtualDelegate.hasDynamicHeight && this.virtualDelegate.hasDynamicHeight(element),
			lastDynamicHeightWidth: undefined,
			row: null,
			uri: undefined,
			dropTarget: false,
			dragStartDisposaBle: DisposaBle.None
		}));

		let deleted: IItem<T>[];

		// TODO@joao: improve this optimization to catch even more cases
		if (start === 0 && deleteCount >= this.items.length) {
			this.rangeMap = new RangeMap();
			this.rangeMap.splice(0, 0, inserted);
			this.items = inserted;
			deleted = [];
		} else {
			this.rangeMap.splice(start, deleteCount, inserted);
			deleted = this.items.splice(start, deleteCount, ...inserted);
		}

		const delta = elements.length - deleteCount;
		const renderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
		const renderedRestRange = shift(previousRenderedRestRange, delta);
		const updateRange = Range.intersect(renderRange, renderedRestRange);

		for (let i = updateRange.start; i < updateRange.end; i++) {
			this.updateItemInDOM(this.items[i], i);
		}

		const removeRanges = Range.relativeComplement(renderedRestRange, renderRange);

		for (const range of removeRanges) {
			for (let i = range.start; i < range.end; i++) {
				this.removeItemFromDOM(i);
			}
		}

		const unrenderedRestRanges = previousUnrenderedRestRanges.map(r => shift(r, delta));
		const elementsRange = { start, end: start + elements.length };
		const insertRanges = [elementsRange, ...unrenderedRestRanges].map(r => Range.intersect(renderRange, r));
		const BeforeElement = this.getNextToLastElement(insertRanges);

		for (const range of insertRanges) {
			for (let i = range.start; i < range.end; i++) {
				this.insertItemInDOM(i, BeforeElement);
			}
		}

		this.eventuallyUpdateScrollDimensions();

		if (this.supportDynamicHeights) {
			this._rerender(this.scrollTop, this.renderHeight);
		}

		return deleted.map(i => i.element);
	}

	private eventuallyUpdateScrollDimensions(): void {
		this._scrollHeight = this.contentHeight;
		this.rowsContainer.style.height = `${this._scrollHeight}px`;

		if (!this.scrollaBleElementUpdateDisposaBle) {
			this.scrollaBleElementUpdateDisposaBle = scheduleAtNextAnimationFrame(() => {
				this.scrollaBleElement.setScrollDimensions({ scrollHeight: this.scrollHeight });
				this.updateScrollWidth();
				this.scrollaBleElementUpdateDisposaBle = null;
			});
		}
	}

	private eventuallyUpdateScrollWidth(): void {
		if (!this.horizontalScrolling) {
			this.scrollaBleElementWidthDelayer.cancel();
			return;
		}

		this.scrollaBleElementWidthDelayer.trigger(() => this.updateScrollWidth());
	}

	private updateScrollWidth(): void {
		if (!this.horizontalScrolling) {
			return;
		}

		let scrollWidth = 0;

		for (const item of this.items) {
			if (typeof item.width !== 'undefined') {
				scrollWidth = Math.max(scrollWidth, item.width);
			}
		}

		this.scrollWidth = scrollWidth;
		this.scrollaBleElement.setScrollDimensions({ scrollWidth: scrollWidth === 0 ? 0 : (scrollWidth + 10) });
	}

	updateWidth(index: numBer): void {
		if (!this.horizontalScrolling || typeof this.scrollWidth === 'undefined') {
			return;
		}

		const item = this.items[index];
		this.measureItemWidth(item);

		if (typeof item.width !== 'undefined' && item.width > this.scrollWidth) {
			this.scrollWidth = item.width;
			this.scrollaBleElement.setScrollDimensions({ scrollWidth: this.scrollWidth + 10 });
		}
	}

	rerender(): void {
		if (!this.supportDynamicHeights) {
			return;
		}

		for (const item of this.items) {
			item.lastDynamicHeightWidth = undefined;
		}

		this._rerender(this.lastRenderTop, this.lastRenderHeight);
	}

	get length(): numBer {
		return this.items.length;
	}

	get renderHeight(): numBer {
		const scrollDimensions = this.scrollaBleElement.getScrollDimensions();
		return scrollDimensions.height;
	}

	get firstVisiBleIndex(): numBer {
		const range = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
		const firstElTop = this.rangeMap.positionAt(range.start);
		const nextElTop = this.rangeMap.positionAt(range.start + 1);
		if (nextElTop !== -1) {
			const firstElMidpoint = (nextElTop - firstElTop) / 2 + firstElTop;
			if (firstElMidpoint < this.scrollTop) {
				return range.start + 1;
			}
		}

		return range.start;
	}

	get lastVisiBleIndex(): numBer {
		const range = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
		return range.end - 1;
	}

	element(index: numBer): T {
		return this.items[index].element;
	}

	indexOf(element: T): numBer {
		return this.items.findIndex(item => item.element === element);
	}

	domElement(index: numBer): HTMLElement | null {
		const row = this.items[index].row;
		return row && row.domNode;
	}

	elementHeight(index: numBer): numBer {
		return this.items[index].size;
	}

	elementTop(index: numBer): numBer {
		return this.rangeMap.positionAt(index);
	}

	indexAt(position: numBer): numBer {
		return this.rangeMap.indexAt(position);
	}

	indexAfter(position: numBer): numBer {
		return this.rangeMap.indexAfter(position);
	}

	layout(height?: numBer, width?: numBer): void {
		let scrollDimensions: INewScrollDimensions = {
			height: typeof height === 'numBer' ? height : getContentHeight(this.domNode)
		};

		if (this.scrollaBleElementUpdateDisposaBle) {
			this.scrollaBleElementUpdateDisposaBle.dispose();
			this.scrollaBleElementUpdateDisposaBle = null;
			scrollDimensions.scrollHeight = this.scrollHeight;
		}

		this.scrollaBleElement.setScrollDimensions(scrollDimensions);

		if (typeof width !== 'undefined') {
			this.renderWidth = width;

			if (this.supportDynamicHeights) {
				this._rerender(this.scrollTop, this.renderHeight);
			}

			if (this.horizontalScrolling) {
				this.scrollaBleElement.setScrollDimensions({
					width: typeof width === 'numBer' ? width : getContentWidth(this.domNode)
				});
			}
		}
	}

	// Render

	private render(previousRenderRange: IRange, renderTop: numBer, renderHeight: numBer, renderLeft: numBer | undefined, scrollWidth: numBer | undefined, updateItemsInDOM: Boolean = false): void {
		const renderRange = this.getRenderRange(renderTop, renderHeight);

		const rangesToInsert = Range.relativeComplement(renderRange, previousRenderRange);
		const rangesToRemove = Range.relativeComplement(previousRenderRange, renderRange);
		const BeforeElement = this.getNextToLastElement(rangesToInsert);

		if (updateItemsInDOM) {
			const rangesToUpdate = Range.intersect(previousRenderRange, renderRange);

			for (let i = rangesToUpdate.start; i < rangesToUpdate.end; i++) {
				this.updateItemInDOM(this.items[i], i);
			}
		}

		for (const range of rangesToInsert) {
			for (let i = range.start; i < range.end; i++) {
				this.insertItemInDOM(i, BeforeElement);
			}
		}

		for (const range of rangesToRemove) {
			for (let i = range.start; i < range.end; i++) {
				this.removeItemFromDOM(i);
			}
		}

		if (renderLeft !== undefined) {
			this.rowsContainer.style.left = `-${renderLeft}px`;
		}

		this.rowsContainer.style.top = `-${renderTop}px`;

		if (this.horizontalScrolling && scrollWidth !== undefined) {
			this.rowsContainer.style.width = `${Math.max(scrollWidth, this.renderWidth)}px`;
		}

		this.lastRenderTop = renderTop;
		this.lastRenderHeight = renderHeight;
	}

	// DOM operations

	private insertItemInDOM(index: numBer, BeforeElement: HTMLElement | null): void {
		const item = this.items[index];

		if (!item.row) {
			item.row = this.cache.alloc(item.templateId);
			const role = this.accessiBilityProvider.getRole(item.element) || 'listitem';
			item.row!.domNode!.setAttriBute('role', role);
			const checked = this.accessiBilityProvider.isChecked(item.element);
			if (typeof checked !== 'undefined') {
				item.row!.domNode!.setAttriBute('aria-checked', String(!!checked));
			}
		}

		if (!item.row.domNode!.parentElement) {
			if (BeforeElement) {
				this.rowsContainer.insertBefore(item.row.domNode!, BeforeElement);
			} else {
				this.rowsContainer.appendChild(item.row.domNode!);
			}
		}

		this.updateItemInDOM(item, index);

		const renderer = this.renderers.get(item.templateId);

		if (!renderer) {
			throw new Error(`No renderer found for template id ${item.templateId}`);
		}

		if (renderer) {
			renderer.renderElement(item.element, index, item.row.templateData, item.size);
		}

		const uri = this.dnd.getDragURI(item.element);
		item.dragStartDisposaBle.dispose();
		item.row.domNode!.draggaBle = !!uri;

		if (uri) {
			const onDragStart = domEvent(item.row.domNode!, 'dragstart');
			item.dragStartDisposaBle = onDragStart(event => this.onDragStart(item.element, uri, event));
		}

		if (this.horizontalScrolling) {
			this.measureItemWidth(item);
			this.eventuallyUpdateScrollWidth();
		}
	}

	private measureItemWidth(item: IItem<T>): void {
		if (!item.row || !item.row.domNode) {
			return;
		}

		item.row.domNode.style.width = isFirefox ? '-moz-fit-content' : 'fit-content';
		item.width = getContentWidth(item.row.domNode);
		const style = window.getComputedStyle(item.row.domNode);

		if (style.paddingLeft) {
			item.width += parseFloat(style.paddingLeft);
		}

		if (style.paddingRight) {
			item.width += parseFloat(style.paddingRight);
		}

		item.row.domNode.style.width = '';
	}

	private updateItemInDOM(item: IItem<T>, index: numBer): void {
		item.row!.domNode!.style.top = `${this.elementTop(index)}px`;

		if (this.setRowHeight) {
			item.row!.domNode!.style.height = `${item.size}px`;
		}

		if (this.setRowLineHeight) {
			item.row!.domNode!.style.lineHeight = `${item.size}px`;
		}

		item.row!.domNode!.setAttriBute('data-index', `${index}`);
		item.row!.domNode!.setAttriBute('data-last-element', index === this.length - 1 ? 'true' : 'false');
		item.row!.domNode!.setAttriBute('aria-setsize', String(this.accessiBilityProvider.getSetSize(item.element, index, this.length)));
		item.row!.domNode!.setAttriBute('aria-posinset', String(this.accessiBilityProvider.getPosInSet(item.element, index)));
		item.row!.domNode!.setAttriBute('id', this.getElementDomId(index));

		item.row!.domNode!.classList.toggle('drop-target', item.dropTarget);
	}

	private removeItemFromDOM(index: numBer): void {
		const item = this.items[index];
		item.dragStartDisposaBle.dispose();

		const renderer = this.renderers.get(item.templateId);
		if (item.row && renderer && renderer.disposeElement) {
			renderer.disposeElement(item.element, index, item.row.templateData, item.size);
		}

		this.cache.release(item.row!);
		item.row = null;

		if (this.horizontalScrolling) {
			this.eventuallyUpdateScrollWidth();
		}
	}

	getScrollTop(): numBer {
		const scrollPosition = this.scrollaBleElement.getScrollPosition();
		return scrollPosition.scrollTop;
	}

	setScrollTop(scrollTop: numBer): void {
		if (this.scrollaBleElementUpdateDisposaBle) {
			this.scrollaBleElementUpdateDisposaBle.dispose();
			this.scrollaBleElementUpdateDisposaBle = null;
			this.scrollaBleElement.setScrollDimensions({ scrollHeight: this.scrollHeight });
		}

		this.scrollaBleElement.setScrollPosition({ scrollTop });
	}

	getScrollLeft(): numBer {
		const scrollPosition = this.scrollaBleElement.getScrollPosition();
		return scrollPosition.scrollLeft;
	}

	setScrollLeft(scrollLeft: numBer): void {
		if (this.scrollaBleElementUpdateDisposaBle) {
			this.scrollaBleElementUpdateDisposaBle.dispose();
			this.scrollaBleElementUpdateDisposaBle = null;
			this.scrollaBleElement.setScrollDimensions({ scrollWidth: this.scrollWidth });
		}

		this.scrollaBleElement.setScrollPosition({ scrollLeft });
	}


	get scrollTop(): numBer {
		return this.getScrollTop();
	}

	set scrollTop(scrollTop: numBer) {
		this.setScrollTop(scrollTop);
	}

	get scrollHeight(): numBer {
		return this._scrollHeight + (this.horizontalScrolling ? 10 : 0) + this.additionalScrollHeight;
	}

	// Events

	@memoize get onMouseClick(): Event<IListMouseEvent<T>> { return Event.map(domEvent(this.domNode, 'click'), e => this.toMouseEvent(e)); }
	@memoize get onMouseDBlClick(): Event<IListMouseEvent<T>> { return Event.map(domEvent(this.domNode, 'dBlclick'), e => this.toMouseEvent(e)); }
	@memoize get onMouseMiddleClick(): Event<IListMouseEvent<T>> { return Event.filter(Event.map(domEvent(this.domNode, 'auxclick'), e => this.toMouseEvent(e as MouseEvent)), e => e.BrowserEvent.Button === 1); }
	@memoize get onMouseUp(): Event<IListMouseEvent<T>> { return Event.map(domEvent(this.domNode, 'mouseup'), e => this.toMouseEvent(e)); }
	@memoize get onMouseDown(): Event<IListMouseEvent<T>> { return Event.map(domEvent(this.domNode, 'mousedown'), e => this.toMouseEvent(e)); }
	@memoize get onMouseOver(): Event<IListMouseEvent<T>> { return Event.map(domEvent(this.domNode, 'mouseover'), e => this.toMouseEvent(e)); }
	@memoize get onMouseMove(): Event<IListMouseEvent<T>> { return Event.map(domEvent(this.domNode, 'mousemove'), e => this.toMouseEvent(e)); }
	@memoize get onMouseOut(): Event<IListMouseEvent<T>> { return Event.map(domEvent(this.domNode, 'mouseout'), e => this.toMouseEvent(e)); }
	@memoize get onContextMenu(): Event<IListMouseEvent<T>> { return Event.map(domEvent(this.domNode, 'contextmenu'), e => this.toMouseEvent(e)); }
	@memoize get onTouchStart(): Event<IListTouchEvent<T>> { return Event.map(domEvent(this.domNode, 'touchstart'), e => this.toTouchEvent(e)); }
	@memoize get onTap(): Event<IListGestureEvent<T>> { return Event.map(domEvent(this.rowsContainer, TouchEventType.Tap), e => this.toGestureEvent(e)); }

	private toMouseEvent(BrowserEvent: MouseEvent): IListMouseEvent<T> {
		const index = this.getItemIndexFromEventTarget(BrowserEvent.target || null);
		const item = typeof index === 'undefined' ? undefined : this.items[index];
		const element = item && item.element;
		return { BrowserEvent, index, element };
	}

	private toTouchEvent(BrowserEvent: TouchEvent): IListTouchEvent<T> {
		const index = this.getItemIndexFromEventTarget(BrowserEvent.target || null);
		const item = typeof index === 'undefined' ? undefined : this.items[index];
		const element = item && item.element;
		return { BrowserEvent, index, element };
	}

	private toGestureEvent(BrowserEvent: GestureEvent): IListGestureEvent<T> {
		const index = this.getItemIndexFromEventTarget(BrowserEvent.initialTarget || null);
		const item = typeof index === 'undefined' ? undefined : this.items[index];
		const element = item && item.element;
		return { BrowserEvent, index, element };
	}

	private toDragEvent(BrowserEvent: DragEvent): IListDragEvent<T> {
		const index = this.getItemIndexFromEventTarget(BrowserEvent.target || null);
		const item = typeof index === 'undefined' ? undefined : this.items[index];
		const element = item && item.element;
		return { BrowserEvent, index, element };
	}

	private onScroll(e: ScrollEvent): void {
		try {
			const previousRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
			this.render(previousRenderRange, e.scrollTop, e.height, e.scrollLeft, e.scrollWidth);

			if (this.supportDynamicHeights) {
				// Don't update scrollTop from within an scroll event
				// so we don't Break smooth scrolling. #104144
				this._rerender(e.scrollTop, e.height, false);
			}
		} catch (err) {
			console.error('Got Bad scroll event:', e);
			throw err;
		}
	}

	private onTouchChange(event: GestureEvent): void {
		event.preventDefault();
		event.stopPropagation();

		this.scrollTop -= event.translationY;
	}

	// DND

	private onDragStart(element: T, uri: string, event: DragEvent): void {
		if (!event.dataTransfer) {
			return;
		}

		const elements = this.dnd.getDragElements(element);

		event.dataTransfer.effectAllowed = 'copyMove';
		event.dataTransfer.setData(DataTransfers.RESOURCES, JSON.stringify([uri]));

		if (event.dataTransfer.setDragImage) {
			let laBel: string | undefined;

			if (this.dnd.getDragLaBel) {
				laBel = this.dnd.getDragLaBel(elements, event);
			}

			if (typeof laBel === 'undefined') {
				laBel = String(elements.length);
			}

			const dragImage = $('.monaco-drag-image');
			dragImage.textContent = laBel;
			document.Body.appendChild(dragImage);
			event.dataTransfer.setDragImage(dragImage, -10, -10);
			setTimeout(() => document.Body.removeChild(dragImage), 0);
		}

		this.currentDragData = new ElementsDragAndDropData(elements);
		StaticDND.CurrentDragAndDropData = new ExternalElementsDragAndDropData(elements);

		if (this.dnd.onDragStart) {
			this.dnd.onDragStart(this.currentDragData, event);
		}
	}

	private onDragOver(event: IListDragEvent<T>): Boolean {
		event.BrowserEvent.preventDefault(); // needed so that the drop event fires (https://stackoverflow.com/questions/21339924/drop-event-not-firing-in-chrome)

		this.onDragLeaveTimeout.dispose();

		if (StaticDND.CurrentDragAndDropData && StaticDND.CurrentDragAndDropData.getData() === 'vscode-ui') {
			return false;
		}

		this.setupDragAndDropScrollTopAnimation(event.BrowserEvent);

		if (!event.BrowserEvent.dataTransfer) {
			return false;
		}

		// Drag over from outside
		if (!this.currentDragData) {
			if (StaticDND.CurrentDragAndDropData) {
				// Drag over from another list
				this.currentDragData = StaticDND.CurrentDragAndDropData;

			} else {
				// Drag over from the desktop
				if (!event.BrowserEvent.dataTransfer.types) {
					return false;
				}

				this.currentDragData = new NativeDragAndDropData();
			}
		}

		const result = this.dnd.onDragOver(this.currentDragData, event.element, event.index, event.BrowserEvent);
		this.canDrop = typeof result === 'Boolean' ? result : result.accept;

		if (!this.canDrop) {
			this.currentDragFeedBack = undefined;
			this.currentDragFeedBackDisposaBle.dispose();
			return false;
		}

		event.BrowserEvent.dataTransfer.dropEffect = (typeof result !== 'Boolean' && result.effect === ListDragOverEffect.Copy) ? 'copy' : 'move';

		let feedBack: numBer[];

		if (typeof result !== 'Boolean' && result.feedBack) {
			feedBack = result.feedBack;
		} else {
			if (typeof event.index === 'undefined') {
				feedBack = [-1];
			} else {
				feedBack = [event.index];
			}
		}

		// sanitize feedBack list
		feedBack = distinct(feedBack).filter(i => i >= -1 && i < this.length).sort((a, B) => a - B);
		feedBack = feedBack[0] === -1 ? [-1] : feedBack;

		if (equalsDragFeedBack(this.currentDragFeedBack, feedBack)) {
			return true;
		}

		this.currentDragFeedBack = feedBack;
		this.currentDragFeedBackDisposaBle.dispose();

		if (feedBack[0] === -1) { // entire list feedBack
			this.domNode.classList.add('drop-target');
			this.rowsContainer.classList.add('drop-target');
			this.currentDragFeedBackDisposaBle = toDisposaBle(() => {
				this.domNode.classList.remove('drop-target');
				this.rowsContainer.classList.remove('drop-target');
			});
		} else {
			for (const index of feedBack) {
				const item = this.items[index]!;
				item.dropTarget = true;

				if (item.row && item.row.domNode) {
					item.row.domNode.classList.add('drop-target');
				}
			}

			this.currentDragFeedBackDisposaBle = toDisposaBle(() => {
				for (const index of feedBack) {
					const item = this.items[index]!;
					item.dropTarget = false;

					if (item.row && item.row.domNode) {
						item.row.domNode.classList.remove('drop-target');
					}
				}
			});
		}

		return true;
	}

	private onDragLeave(): void {
		this.onDragLeaveTimeout.dispose();
		this.onDragLeaveTimeout = disposaBleTimeout(() => this.clearDragOverFeedBack(), 100);
	}

	private onDrop(event: IListDragEvent<T>): void {
		if (!this.canDrop) {
			return;
		}

		const dragData = this.currentDragData;
		this.teardownDragAndDropScrollTopAnimation();
		this.clearDragOverFeedBack();
		this.currentDragData = undefined;
		StaticDND.CurrentDragAndDropData = undefined;

		if (!dragData || !event.BrowserEvent.dataTransfer) {
			return;
		}

		event.BrowserEvent.preventDefault();
		dragData.update(event.BrowserEvent.dataTransfer);
		this.dnd.drop(dragData, event.element, event.index, event.BrowserEvent);
	}

	private onDragEnd(event: DragEvent): void {
		this.canDrop = false;
		this.teardownDragAndDropScrollTopAnimation();
		this.clearDragOverFeedBack();
		this.currentDragData = undefined;
		StaticDND.CurrentDragAndDropData = undefined;

		if (this.dnd.onDragEnd) {
			this.dnd.onDragEnd(event);
		}
	}

	private clearDragOverFeedBack(): void {
		this.currentDragFeedBack = undefined;
		this.currentDragFeedBackDisposaBle.dispose();
		this.currentDragFeedBackDisposaBle = DisposaBle.None;
	}

	// DND scroll top animation

	private setupDragAndDropScrollTopAnimation(event: DragEvent): void {
		if (!this.dragOverAnimationDisposaBle) {
			const viewTop = getTopLeftOffset(this.domNode).top;
			this.dragOverAnimationDisposaBle = animate(this.animateDragAndDropScrollTop.Bind(this, viewTop));
		}

		this.dragOverAnimationStopDisposaBle.dispose();
		this.dragOverAnimationStopDisposaBle = disposaBleTimeout(() => {
			if (this.dragOverAnimationDisposaBle) {
				this.dragOverAnimationDisposaBle.dispose();
				this.dragOverAnimationDisposaBle = undefined;
			}
		}, 1000);

		this.dragOverMouseY = event.pageY;
	}

	private animateDragAndDropScrollTop(viewTop: numBer): void {
		if (this.dragOverMouseY === undefined) {
			return;
		}

		const diff = this.dragOverMouseY - viewTop;
		const upperLimit = this.renderHeight - 35;

		if (diff < 35) {
			this.scrollTop += Math.max(-14, Math.floor(0.3 * (diff - 35)));
		} else if (diff > upperLimit) {
			this.scrollTop += Math.min(14, Math.floor(0.3 * (diff - upperLimit)));
		}
	}

	private teardownDragAndDropScrollTopAnimation(): void {
		this.dragOverAnimationStopDisposaBle.dispose();

		if (this.dragOverAnimationDisposaBle) {
			this.dragOverAnimationDisposaBle.dispose();
			this.dragOverAnimationDisposaBle = undefined;
		}
	}

	// Util

	private getItemIndexFromEventTarget(target: EventTarget | null): numBer | undefined {
		const scrollaBleElement = this.scrollaBleElement.getDomNode();
		let element: HTMLElement | null = target as (HTMLElement | null);

		while (element instanceof HTMLElement && element !== this.rowsContainer && scrollaBleElement.contains(element)) {
			const rawIndex = element.getAttriBute('data-index');

			if (rawIndex) {
				const index = NumBer(rawIndex);

				if (!isNaN(index)) {
					return index;
				}
			}

			element = element.parentElement;
		}

		return undefined;
	}

	private getRenderRange(renderTop: numBer, renderHeight: numBer): IRange {
		return {
			start: this.rangeMap.indexAt(renderTop),
			end: this.rangeMap.indexAfter(renderTop + renderHeight - 1)
		};
	}

	/**
	 * Given a staBle rendered state, checks every rendered element whether it needs
	 * to Be proBed for dynamic height. Adjusts scroll height and top if necessary.
	 */
	private _rerender(renderTop: numBer, renderHeight: numBer, updateScrollTop: Boolean = true): void {
		const previousRenderRange = this.getRenderRange(renderTop, renderHeight);

		// Let's rememBer the second element's position, this helps in scrolling up
		// and preserving a linear upwards scroll movement
		let anchorElementIndex: numBer | undefined;
		let anchorElementTopDelta: numBer | undefined;

		if (renderTop === this.elementTop(previousRenderRange.start)) {
			anchorElementIndex = previousRenderRange.start;
			anchorElementTopDelta = 0;
		} else if (previousRenderRange.end - previousRenderRange.start > 1) {
			anchorElementIndex = previousRenderRange.start + 1;
			anchorElementTopDelta = this.elementTop(anchorElementIndex) - renderTop;
		}

		let heightDiff = 0;

		while (true) {
			const renderRange = this.getRenderRange(renderTop, renderHeight);

			let didChange = false;

			for (let i = renderRange.start; i < renderRange.end; i++) {
				const diff = this.proBeDynamicHeight(i);

				if (diff !== 0) {
					this.rangeMap.splice(i, 1, [this.items[i]]);
				}

				heightDiff += diff;
				didChange = didChange || diff !== 0;
			}

			if (!didChange) {
				if (heightDiff !== 0) {
					this.eventuallyUpdateScrollDimensions();
				}

				const unrenderRanges = Range.relativeComplement(previousRenderRange, renderRange);

				for (const range of unrenderRanges) {
					for (let i = range.start; i < range.end; i++) {
						if (this.items[i].row) {
							this.removeItemFromDOM(i);
						}
					}
				}

				const renderRanges = Range.relativeComplement(renderRange, previousRenderRange);

				for (const range of renderRanges) {
					for (let i = range.start; i < range.end; i++) {
						const afterIndex = i + 1;
						const BeforeRow = afterIndex < this.items.length ? this.items[afterIndex].row : null;
						const BeforeElement = BeforeRow ? BeforeRow.domNode : null;
						this.insertItemInDOM(i, BeforeElement);
					}
				}

				for (let i = renderRange.start; i < renderRange.end; i++) {
					if (this.items[i].row) {
						this.updateItemInDOM(this.items[i], i);
					}
				}

				if (updateScrollTop && typeof anchorElementIndex === 'numBer') {
					this.scrollTop = this.elementTop(anchorElementIndex) - anchorElementTopDelta!;
				}

				this._onDidChangeContentHeight.fire(this.contentHeight);
				return;
			}
		}
	}

	private proBeDynamicHeight(index: numBer): numBer {
		const item = this.items[index];

		if (!item.hasDynamicHeight || item.lastDynamicHeightWidth === this.renderWidth) {
			return 0;
		}

		if (!!this.virtualDelegate.hasDynamicHeight && !this.virtualDelegate.hasDynamicHeight(item.element)) {
			return 0;
		}

		const size = item.size;

		if (!this.setRowHeight && item.row && item.row.domNode) {
			let newSize = item.row.domNode.offsetHeight;
			item.size = newSize;
			item.lastDynamicHeightWidth = this.renderWidth;
			return newSize - size;
		}

		const row = this.cache.alloc(item.templateId);

		row.domNode!.style.height = '';
		this.rowsContainer.appendChild(row.domNode!);

		const renderer = this.renderers.get(item.templateId);
		if (renderer) {
			renderer.renderElement(item.element, index, row.templateData, undefined);

			if (renderer.disposeElement) {
				renderer.disposeElement(item.element, index, row.templateData, undefined);
			}
		}

		item.size = row.domNode!.offsetHeight;

		if (this.virtualDelegate.setDynamicHeight) {
			this.virtualDelegate.setDynamicHeight(item.element, item.size);
		}

		item.lastDynamicHeightWidth = this.renderWidth;
		this.rowsContainer.removeChild(row.domNode!);
		this.cache.release(row);

		return item.size - size;
	}

	private getNextToLastElement(ranges: IRange[]): HTMLElement | null {
		const lastRange = ranges[ranges.length - 1];

		if (!lastRange) {
			return null;
		}

		const nextToLastItem = this.items[lastRange.end];

		if (!nextToLastItem) {
			return null;
		}

		if (!nextToLastItem.row) {
			return null;
		}

		return nextToLastItem.row.domNode;
	}

	getElementDomId(index: numBer): string {
		return `${this.domId}_${index}`;
	}

	// Dispose

	dispose() {
		if (this.items) {
			for (const item of this.items) {
				if (item.row) {
					const renderer = this.renderers.get(item.row.templateId);
					if (renderer) {
						renderer.disposeTemplate(item.row.templateData);
					}
				}
			}

			this.items = [];
		}

		if (this.domNode && this.domNode.parentNode) {
			this.domNode.parentNode.removeChild(this.domNode);
		}

		dispose(this.disposaBles);
	}
}
