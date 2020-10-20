/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { getOrDefAult } from 'vs/bAse/common/objects';
import { IDisposAble, dispose, DisposAble, toDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { Gesture, EventType As TouchEventType, GestureEvent } from 'vs/bAse/browser/touch';
import { Event, Emitter } from 'vs/bAse/common/event';
import { domEvent } from 'vs/bAse/browser/event';
import { SmoothScrollAbleElement } from 'vs/bAse/browser/ui/scrollbAr/scrollAbleElement';
import { ScrollEvent, ScrollbArVisibility, INewScrollDimensions, ScrollAble } from 'vs/bAse/common/scrollAble';
import { RAngeMAp, shift } from './rAngeMAp';
import { IListVirtuAlDelegAte, IListRenderer, IListMouseEvent, IListTouchEvent, IListGestureEvent, IListDrAgEvent, IListDrAgAndDrop, ListDrAgOverEffect } from './list';
import { RowCAche, IRow } from './rowCAche';
import { ISpliceAble } from 'vs/bAse/common/sequence';
import { memoize } from 'vs/bAse/common/decorAtors';
import { RAnge, IRAnge } from 'vs/bAse/common/rAnge';
import { equAls, distinct } from 'vs/bAse/common/ArrAys';
import { DAtATrAnsfers, StAticDND, IDrAgAndDropDAtA } from 'vs/bAse/browser/dnd';
import { disposAbleTimeout, DelAyer } from 'vs/bAse/common/Async';
import { isFirefox } from 'vs/bAse/browser/browser';
import { IMouseWheelEvent } from 'vs/bAse/browser/mouseEvent';
import { $, AnimAte, getContentHeight, getContentWidth, getTopLeftOffset, scheduleAtNextAnimAtionFrAme } from 'vs/bAse/browser/dom';

interfAce IItem<T> {
	reAdonly id: string;
	reAdonly element: T;
	reAdonly templAteId: string;
	row: IRow | null;
	size: number;
	width: number | undefined;
	hAsDynAmicHeight: booleAn;
	lAstDynAmicHeightWidth: number | undefined;
	uri: string | undefined;
	dropTArget: booleAn;
	drAgStArtDisposAble: IDisposAble;
}

export interfAce IListViewDrAgAndDrop<T> extends IListDrAgAndDrop<T> {
	getDrAgElements(element: T): T[];
}

export interfAce IListViewAccessibilityProvider<T> {
	getSetSize?(element: T, index: number, listLength: number): number;
	getPosInSet?(element: T, index: number): number;
	getRole?(element: T): string | undefined;
	isChecked?(element: T): booleAn | undefined;
}

export interfAce IListViewOptionsUpdAte {
	reAdonly AdditionAlScrollHeight?: number;
	reAdonly smoothScrolling?: booleAn;
	reAdonly horizontAlScrolling?: booleAn;
}

export interfAce IListViewOptions<T> extends IListViewOptionsUpdAte {
	reAdonly dnd?: IListViewDrAgAndDrop<T>;
	reAdonly useShAdows?: booleAn;
	reAdonly verticAlScrollMode?: ScrollbArVisibility;
	reAdonly setRowLineHeight?: booleAn;
	reAdonly setRowHeight?: booleAn;
	reAdonly supportDynAmicHeights?: booleAn;
	reAdonly mouseSupport?: booleAn;
	reAdonly AccessibilityProvider?: IListViewAccessibilityProvider<T>;
	reAdonly trAnsformOptimizAtion?: booleAn;
}

const DefAultOptions = {
	useShAdows: true,
	verticAlScrollMode: ScrollbArVisibility.Auto,
	setRowLineHeight: true,
	setRowHeight: true,
	supportDynAmicHeights: fAlse,
	dnd: {
		getDrAgElements<T>(e: T) { return [e]; },
		getDrAgURI() { return null; },
		onDrAgStArt(): void { },
		onDrAgOver() { return fAlse; },
		drop() { }
	},
	horizontAlScrolling: fAlse,
	trAnsformOptimizAtion: true
};

export clAss ElementsDrAgAndDropDAtA<T, TContext = void> implements IDrAgAndDropDAtA {

	reAdonly elements: T[];

	privAte _context: TContext | undefined;
	public get context(): TContext | undefined {
		return this._context;
	}
	public set context(vAlue: TContext | undefined) {
		this._context = vAlue;
	}

	constructor(elements: T[]) {
		this.elements = elements;
	}

	updAte(): void { }

	getDAtA(): T[] {
		return this.elements;
	}
}

export clAss ExternAlElementsDrAgAndDropDAtA<T> implements IDrAgAndDropDAtA {

	reAdonly elements: T[];

	constructor(elements: T[]) {
		this.elements = elements;
	}

	updAte(): void { }

	getDAtA(): T[] {
		return this.elements;
	}
}

export clAss NAtiveDrAgAndDropDAtA implements IDrAgAndDropDAtA {

	reAdonly types: Any[];
	reAdonly files: Any[];

	constructor() {
		this.types = [];
		this.files = [];
	}

	updAte(dAtATrAnsfer: DAtATrAnsfer): void {
		if (dAtATrAnsfer.types) {
			this.types.splice(0, this.types.length, ...dAtATrAnsfer.types);
		}

		if (dAtATrAnsfer.files) {
			this.files.splice(0, this.files.length);

			for (let i = 0; i < dAtATrAnsfer.files.length; i++) {
				const file = dAtATrAnsfer.files.item(i);

				if (file && (file.size || file.type)) {
					this.files.push(file);
				}
			}
		}
	}

	getDAtA(): Any {
		return {
			types: this.types,
			files: this.files
		};
	}
}

function equAlsDrAgFeedbAck(f1: number[] | undefined, f2: number[] | undefined): booleAn {
	if (ArrAy.isArrAy(f1) && ArrAy.isArrAy(f2)) {
		return equAls(f1, f2!);
	}

	return f1 === f2;
}

clAss ListViewAccessibilityProvider<T> implements Required<IListViewAccessibilityProvider<T>> {

	reAdonly getSetSize: (element: Any, index: number, listLength: number) => number;
	reAdonly getPosInSet: (element: Any, index: number) => number;
	reAdonly getRole: (element: T) => string | undefined;
	reAdonly isChecked: (element: T) => booleAn | undefined;

	constructor(AccessibilityProvider?: IListViewAccessibilityProvider<T>) {
		if (AccessibilityProvider?.getSetSize) {
			this.getSetSize = AccessibilityProvider.getSetSize.bind(AccessibilityProvider);
		} else {
			this.getSetSize = (e, i, l) => l;
		}

		if (AccessibilityProvider?.getPosInSet) {
			this.getPosInSet = AccessibilityProvider.getPosInSet.bind(AccessibilityProvider);
		} else {
			this.getPosInSet = (e, i) => i + 1;
		}

		if (AccessibilityProvider?.getRole) {
			this.getRole = AccessibilityProvider.getRole.bind(AccessibilityProvider);
		} else {
			this.getRole = _ => 'listitem';
		}

		if (AccessibilityProvider?.isChecked) {
			this.isChecked = AccessibilityProvider.isChecked.bind(AccessibilityProvider);
		} else {
			this.isChecked = _ => undefined;
		}
	}
}

export clAss ListView<T> implements ISpliceAble<T>, IDisposAble {

	privAte stAtic InstAnceCount = 0;
	reAdonly domId = `list_id_${++ListView.InstAnceCount}`;

	reAdonly domNode: HTMLElement;

	privAte items: IItem<T>[];
	privAte itemId: number;
	privAte rAngeMAp: RAngeMAp;
	privAte cAche: RowCAche<T>;
	privAte renderers = new MAp<string, IListRenderer<Any /* TODO@joAo */, Any>>();
	privAte lAstRenderTop: number;
	privAte lAstRenderHeight: number;
	privAte renderWidth = 0;
	privAte rowsContAiner: HTMLElement;
	privAte scrollAble: ScrollAble;
	privAte scrollAbleElement: SmoothScrollAbleElement;
	privAte _scrollHeight: number = 0;
	privAte scrollAbleElementUpdAteDisposAble: IDisposAble | null = null;
	privAte scrollAbleElementWidthDelAyer = new DelAyer<void>(50);
	privAte splicing = fAlse;
	privAte drAgOverAnimAtionDisposAble: IDisposAble | undefined;
	privAte drAgOverAnimAtionStopDisposAble: IDisposAble = DisposAble.None;
	privAte drAgOverMouseY: number = 0;
	privAte setRowLineHeight: booleAn;
	privAte setRowHeight: booleAn;
	privAte supportDynAmicHeights: booleAn;
	privAte AdditionAlScrollHeight: number;
	privAte AccessibilityProvider: ListViewAccessibilityProvider<T>;
	privAte scrollWidth: number | undefined;

	privAte dnd: IListViewDrAgAndDrop<T>;
	privAte cAnDrop: booleAn = fAlse;
	privAte currentDrAgDAtA: IDrAgAndDropDAtA | undefined;
	privAte currentDrAgFeedbAck: number[] | undefined;
	privAte currentDrAgFeedbAckDisposAble: IDisposAble = DisposAble.None;
	privAte onDrAgLeAveTimeout: IDisposAble = DisposAble.None;

	privAte reAdonly disposAbles: DisposAbleStore = new DisposAbleStore();

	privAte reAdonly _onDidChAngeContentHeight = new Emitter<number>();
	reAdonly onDidChAngeContentHeight: Event<number> = Event.lAtch(this._onDidChAngeContentHeight.event);
	get contentHeight(): number { return this.rAngeMAp.size; }

	get onDidScroll(): Event<ScrollEvent> { return this.scrollAbleElement.onScroll; }
	get onWillScroll(): Event<ScrollEvent> { return this.scrollAbleElement.onWillScroll; }
	get contAinerDomNode(): HTMLElement { return this.rowsContAiner; }

	privAte _horizontAlScrolling: booleAn = fAlse;
	privAte get horizontAlScrolling(): booleAn { return this._horizontAlScrolling; }
	privAte set horizontAlScrolling(vAlue: booleAn) {
		if (vAlue === this._horizontAlScrolling) {
			return;
		}

		if (vAlue && this.supportDynAmicHeights) {
			throw new Error('HorizontAl scrolling And dynAmic heights not supported simultAneously');
		}

		this._horizontAlScrolling = vAlue;
		this.domNode.clAssList.toggle('horizontAl-scrolling', this._horizontAlScrolling);

		if (this._horizontAlScrolling) {
			for (const item of this.items) {
				this.meAsureItemWidth(item);
			}

			this.updAteScrollWidth();
			this.scrollAbleElement.setScrollDimensions({ width: getContentWidth(this.domNode) });
			this.rowsContAiner.style.width = `${MAth.mAx(this.scrollWidth || 0, this.renderWidth)}px`;
		} else {
			this.scrollAbleElementWidthDelAyer.cAncel();
			this.scrollAbleElement.setScrollDimensions({ width: this.renderWidth, scrollWidth: this.renderWidth });
			this.rowsContAiner.style.width = '';
		}
	}

	constructor(
		contAiner: HTMLElement,
		privAte virtuAlDelegAte: IListVirtuAlDelegAte<T>,
		renderers: IListRenderer<Any /* TODO@joAo */, Any>[],
		options: IListViewOptions<T> = DefAultOptions As IListViewOptions<T>
	) {
		if (options.horizontAlScrolling && options.supportDynAmicHeights) {
			throw new Error('HorizontAl scrolling And dynAmic heights not supported simultAneously');
		}

		this.items = [];
		this.itemId = 0;
		this.rAngeMAp = new RAngeMAp();

		for (const renderer of renderers) {
			this.renderers.set(renderer.templAteId, renderer);
		}

		this.cAche = this.disposAbles.Add(new RowCAche(this.renderers));

		this.lAstRenderTop = 0;
		this.lAstRenderHeight = 0;

		this.domNode = document.creAteElement('div');
		this.domNode.clAssNAme = 'monAco-list';

		this.domNode.clAssList.Add(this.domId);
		this.domNode.tAbIndex = 0;

		this.domNode.clAssList.toggle('mouse-support', typeof options.mouseSupport === 'booleAn' ? options.mouseSupport : true);

		this._horizontAlScrolling = getOrDefAult(options, o => o.horizontAlScrolling, DefAultOptions.horizontAlScrolling);
		this.domNode.clAssList.toggle('horizontAl-scrolling', this._horizontAlScrolling);

		this.AdditionAlScrollHeight = typeof options.AdditionAlScrollHeight === 'undefined' ? 0 : options.AdditionAlScrollHeight;

		this.AccessibilityProvider = new ListViewAccessibilityProvider(options.AccessibilityProvider);

		this.rowsContAiner = document.creAteElement('div');
		this.rowsContAiner.clAssNAme = 'monAco-list-rows';

		const trAnsformOptimizAtion = getOrDefAult(options, o => o.trAnsformOptimizAtion, DefAultOptions.trAnsformOptimizAtion);
		if (trAnsformOptimizAtion) {
			this.rowsContAiner.style.trAnsform = 'trAnslAte3d(0px, 0px, 0px)';
		}

		this.disposAbles.Add(Gesture.AddTArget(this.rowsContAiner));

		this.scrollAble = new ScrollAble(getOrDefAult(options, o => o.smoothScrolling, fAlse) ? 125 : 0, cb => scheduleAtNextAnimAtionFrAme(cb));
		this.scrollAbleElement = this.disposAbles.Add(new SmoothScrollAbleElement(this.rowsContAiner, {
			AlwAysConsumeMouseWheel: true,
			horizontAl: ScrollbArVisibility.Auto,
			verticAl: getOrDefAult(options, o => o.verticAlScrollMode, DefAultOptions.verticAlScrollMode),
			useShAdows: getOrDefAult(options, o => o.useShAdows, DefAultOptions.useShAdows),
		}, this.scrollAble));

		this.domNode.AppendChild(this.scrollAbleElement.getDomNode());
		contAiner.AppendChild(this.domNode);

		this.scrollAbleElement.onScroll(this.onScroll, this, this.disposAbles);
		domEvent(this.rowsContAiner, TouchEventType.ChAnge)(this.onTouchChAnge, this, this.disposAbles);

		// Prevent the monAco-scrollAble-element from scrolling
		// https://github.com/microsoft/vscode/issues/44181
		domEvent(this.scrollAbleElement.getDomNode(), 'scroll')
			(e => (e.tArget As HTMLElement).scrollTop = 0, null, this.disposAbles);

		Event.mAp(domEvent(this.domNode, 'drAgover'), e => this.toDrAgEvent(e))(this.onDrAgOver, this, this.disposAbles);
		Event.mAp(domEvent(this.domNode, 'drop'), e => this.toDrAgEvent(e))(this.onDrop, this, this.disposAbles);
		domEvent(this.domNode, 'drAgleAve')(this.onDrAgLeAve, this, this.disposAbles);
		domEvent(window, 'drAgend')(this.onDrAgEnd, this, this.disposAbles);

		this.setRowLineHeight = getOrDefAult(options, o => o.setRowLineHeight, DefAultOptions.setRowLineHeight);
		this.setRowHeight = getOrDefAult(options, o => o.setRowHeight, DefAultOptions.setRowHeight);
		this.supportDynAmicHeights = getOrDefAult(options, o => o.supportDynAmicHeights, DefAultOptions.supportDynAmicHeights);
		this.dnd = getOrDefAult<IListViewOptions<T>, IListViewDrAgAndDrop<T>>(options, o => o.dnd, DefAultOptions.dnd);

		this.lAyout();
	}

	updAteOptions(options: IListViewOptionsUpdAte) {
		if (options.AdditionAlScrollHeight !== undefined) {
			this.AdditionAlScrollHeight = options.AdditionAlScrollHeight;
		}

		if (options.smoothScrolling !== undefined) {
			this.scrollAble.setSmoothScrollDurAtion(options.smoothScrolling ? 125 : 0);
		}

		if (options.horizontAlScrolling !== undefined) {
			this.horizontAlScrolling = options.horizontAlScrolling;
		}
	}

	triggerScrollFromMouseWheelEvent(browserEvent: IMouseWheelEvent) {
		this.scrollAbleElement.triggerScrollFromMouseWheelEvent(browserEvent);
	}

	updAteElementHeight(index: number, size: number, AnchorIndex: number | null): void {
		if (index < 0 || index >= this.items.length) {
			return;
		}

		if (this.items[index].size === size) {
			return;
		}

		const lAstRenderRAnge = this.getRenderRAnge(this.lAstRenderTop, this.lAstRenderHeight);

		let heightDiff = 0;

		if (index < lAstRenderRAnge.stArt) {
			// do not scroll the viewport if resized element is out of viewport
			heightDiff = size - this.items[index].size;
		} else {
			if (AnchorIndex !== null && AnchorIndex > index && AnchorIndex <= lAstRenderRAnge.end) {
				// Anchor in viewport
				// resized elemnet in viewport And Above the Anchor
				heightDiff = size - this.items[index].size;
			} else {
				heightDiff = 0;
			}
		}

		this.rAngeMAp.splice(index, 1, [{ size: size }]);
		this.items[index].size = size;

		this.render(lAstRenderRAnge, MAth.mAx(0, this.lAstRenderTop + heightDiff), this.lAstRenderHeight, undefined, undefined, true);

		this.eventuAllyUpdAteScrollDimensions();

		if (this.supportDynAmicHeights) {
			this._rerender(this.lAstRenderTop, this.lAstRenderHeight);
		}
	}

	splice(stArt: number, deleteCount: number, elements: T[] = []): T[] {
		if (this.splicing) {
			throw new Error('CAn\'t run recursive splices.');
		}

		this.splicing = true;

		try {
			return this._splice(stArt, deleteCount, elements);
		} finAlly {
			this.splicing = fAlse;
			this._onDidChAngeContentHeight.fire(this.contentHeight);
		}
	}

	privAte _splice(stArt: number, deleteCount: number, elements: T[] = []): T[] {
		const previousRenderRAnge = this.getRenderRAnge(this.lAstRenderTop, this.lAstRenderHeight);
		const deleteRAnge = { stArt, end: stArt + deleteCount };
		const removeRAnge = RAnge.intersect(previousRenderRAnge, deleteRAnge);

		for (let i = removeRAnge.stArt; i < removeRAnge.end; i++) {
			this.removeItemFromDOM(i);
		}

		const previousRestRAnge: IRAnge = { stArt: stArt + deleteCount, end: this.items.length };
		const previousRenderedRestRAnge = RAnge.intersect(previousRestRAnge, previousRenderRAnge);
		const previousUnrenderedRestRAnges = RAnge.relAtiveComplement(previousRestRAnge, previousRenderRAnge);

		const inserted = elements.mAp<IItem<T>>(element => ({
			id: String(this.itemId++),
			element,
			templAteId: this.virtuAlDelegAte.getTemplAteId(element),
			size: this.virtuAlDelegAte.getHeight(element),
			width: undefined,
			hAsDynAmicHeight: !!this.virtuAlDelegAte.hAsDynAmicHeight && this.virtuAlDelegAte.hAsDynAmicHeight(element),
			lAstDynAmicHeightWidth: undefined,
			row: null,
			uri: undefined,
			dropTArget: fAlse,
			drAgStArtDisposAble: DisposAble.None
		}));

		let deleted: IItem<T>[];

		// TODO@joAo: improve this optimizAtion to cAtch even more cAses
		if (stArt === 0 && deleteCount >= this.items.length) {
			this.rAngeMAp = new RAngeMAp();
			this.rAngeMAp.splice(0, 0, inserted);
			this.items = inserted;
			deleted = [];
		} else {
			this.rAngeMAp.splice(stArt, deleteCount, inserted);
			deleted = this.items.splice(stArt, deleteCount, ...inserted);
		}

		const deltA = elements.length - deleteCount;
		const renderRAnge = this.getRenderRAnge(this.lAstRenderTop, this.lAstRenderHeight);
		const renderedRestRAnge = shift(previousRenderedRestRAnge, deltA);
		const updAteRAnge = RAnge.intersect(renderRAnge, renderedRestRAnge);

		for (let i = updAteRAnge.stArt; i < updAteRAnge.end; i++) {
			this.updAteItemInDOM(this.items[i], i);
		}

		const removeRAnges = RAnge.relAtiveComplement(renderedRestRAnge, renderRAnge);

		for (const rAnge of removeRAnges) {
			for (let i = rAnge.stArt; i < rAnge.end; i++) {
				this.removeItemFromDOM(i);
			}
		}

		const unrenderedRestRAnges = previousUnrenderedRestRAnges.mAp(r => shift(r, deltA));
		const elementsRAnge = { stArt, end: stArt + elements.length };
		const insertRAnges = [elementsRAnge, ...unrenderedRestRAnges].mAp(r => RAnge.intersect(renderRAnge, r));
		const beforeElement = this.getNextToLAstElement(insertRAnges);

		for (const rAnge of insertRAnges) {
			for (let i = rAnge.stArt; i < rAnge.end; i++) {
				this.insertItemInDOM(i, beforeElement);
			}
		}

		this.eventuAllyUpdAteScrollDimensions();

		if (this.supportDynAmicHeights) {
			this._rerender(this.scrollTop, this.renderHeight);
		}

		return deleted.mAp(i => i.element);
	}

	privAte eventuAllyUpdAteScrollDimensions(): void {
		this._scrollHeight = this.contentHeight;
		this.rowsContAiner.style.height = `${this._scrollHeight}px`;

		if (!this.scrollAbleElementUpdAteDisposAble) {
			this.scrollAbleElementUpdAteDisposAble = scheduleAtNextAnimAtionFrAme(() => {
				this.scrollAbleElement.setScrollDimensions({ scrollHeight: this.scrollHeight });
				this.updAteScrollWidth();
				this.scrollAbleElementUpdAteDisposAble = null;
			});
		}
	}

	privAte eventuAllyUpdAteScrollWidth(): void {
		if (!this.horizontAlScrolling) {
			this.scrollAbleElementWidthDelAyer.cAncel();
			return;
		}

		this.scrollAbleElementWidthDelAyer.trigger(() => this.updAteScrollWidth());
	}

	privAte updAteScrollWidth(): void {
		if (!this.horizontAlScrolling) {
			return;
		}

		let scrollWidth = 0;

		for (const item of this.items) {
			if (typeof item.width !== 'undefined') {
				scrollWidth = MAth.mAx(scrollWidth, item.width);
			}
		}

		this.scrollWidth = scrollWidth;
		this.scrollAbleElement.setScrollDimensions({ scrollWidth: scrollWidth === 0 ? 0 : (scrollWidth + 10) });
	}

	updAteWidth(index: number): void {
		if (!this.horizontAlScrolling || typeof this.scrollWidth === 'undefined') {
			return;
		}

		const item = this.items[index];
		this.meAsureItemWidth(item);

		if (typeof item.width !== 'undefined' && item.width > this.scrollWidth) {
			this.scrollWidth = item.width;
			this.scrollAbleElement.setScrollDimensions({ scrollWidth: this.scrollWidth + 10 });
		}
	}

	rerender(): void {
		if (!this.supportDynAmicHeights) {
			return;
		}

		for (const item of this.items) {
			item.lAstDynAmicHeightWidth = undefined;
		}

		this._rerender(this.lAstRenderTop, this.lAstRenderHeight);
	}

	get length(): number {
		return this.items.length;
	}

	get renderHeight(): number {
		const scrollDimensions = this.scrollAbleElement.getScrollDimensions();
		return scrollDimensions.height;
	}

	get firstVisibleIndex(): number {
		const rAnge = this.getRenderRAnge(this.lAstRenderTop, this.lAstRenderHeight);
		const firstElTop = this.rAngeMAp.positionAt(rAnge.stArt);
		const nextElTop = this.rAngeMAp.positionAt(rAnge.stArt + 1);
		if (nextElTop !== -1) {
			const firstElMidpoint = (nextElTop - firstElTop) / 2 + firstElTop;
			if (firstElMidpoint < this.scrollTop) {
				return rAnge.stArt + 1;
			}
		}

		return rAnge.stArt;
	}

	get lAstVisibleIndex(): number {
		const rAnge = this.getRenderRAnge(this.lAstRenderTop, this.lAstRenderHeight);
		return rAnge.end - 1;
	}

	element(index: number): T {
		return this.items[index].element;
	}

	indexOf(element: T): number {
		return this.items.findIndex(item => item.element === element);
	}

	domElement(index: number): HTMLElement | null {
		const row = this.items[index].row;
		return row && row.domNode;
	}

	elementHeight(index: number): number {
		return this.items[index].size;
	}

	elementTop(index: number): number {
		return this.rAngeMAp.positionAt(index);
	}

	indexAt(position: number): number {
		return this.rAngeMAp.indexAt(position);
	}

	indexAfter(position: number): number {
		return this.rAngeMAp.indexAfter(position);
	}

	lAyout(height?: number, width?: number): void {
		let scrollDimensions: INewScrollDimensions = {
			height: typeof height === 'number' ? height : getContentHeight(this.domNode)
		};

		if (this.scrollAbleElementUpdAteDisposAble) {
			this.scrollAbleElementUpdAteDisposAble.dispose();
			this.scrollAbleElementUpdAteDisposAble = null;
			scrollDimensions.scrollHeight = this.scrollHeight;
		}

		this.scrollAbleElement.setScrollDimensions(scrollDimensions);

		if (typeof width !== 'undefined') {
			this.renderWidth = width;

			if (this.supportDynAmicHeights) {
				this._rerender(this.scrollTop, this.renderHeight);
			}

			if (this.horizontAlScrolling) {
				this.scrollAbleElement.setScrollDimensions({
					width: typeof width === 'number' ? width : getContentWidth(this.domNode)
				});
			}
		}
	}

	// Render

	privAte render(previousRenderRAnge: IRAnge, renderTop: number, renderHeight: number, renderLeft: number | undefined, scrollWidth: number | undefined, updAteItemsInDOM: booleAn = fAlse): void {
		const renderRAnge = this.getRenderRAnge(renderTop, renderHeight);

		const rAngesToInsert = RAnge.relAtiveComplement(renderRAnge, previousRenderRAnge);
		const rAngesToRemove = RAnge.relAtiveComplement(previousRenderRAnge, renderRAnge);
		const beforeElement = this.getNextToLAstElement(rAngesToInsert);

		if (updAteItemsInDOM) {
			const rAngesToUpdAte = RAnge.intersect(previousRenderRAnge, renderRAnge);

			for (let i = rAngesToUpdAte.stArt; i < rAngesToUpdAte.end; i++) {
				this.updAteItemInDOM(this.items[i], i);
			}
		}

		for (const rAnge of rAngesToInsert) {
			for (let i = rAnge.stArt; i < rAnge.end; i++) {
				this.insertItemInDOM(i, beforeElement);
			}
		}

		for (const rAnge of rAngesToRemove) {
			for (let i = rAnge.stArt; i < rAnge.end; i++) {
				this.removeItemFromDOM(i);
			}
		}

		if (renderLeft !== undefined) {
			this.rowsContAiner.style.left = `-${renderLeft}px`;
		}

		this.rowsContAiner.style.top = `-${renderTop}px`;

		if (this.horizontAlScrolling && scrollWidth !== undefined) {
			this.rowsContAiner.style.width = `${MAth.mAx(scrollWidth, this.renderWidth)}px`;
		}

		this.lAstRenderTop = renderTop;
		this.lAstRenderHeight = renderHeight;
	}

	// DOM operAtions

	privAte insertItemInDOM(index: number, beforeElement: HTMLElement | null): void {
		const item = this.items[index];

		if (!item.row) {
			item.row = this.cAche.Alloc(item.templAteId);
			const role = this.AccessibilityProvider.getRole(item.element) || 'listitem';
			item.row!.domNode!.setAttribute('role', role);
			const checked = this.AccessibilityProvider.isChecked(item.element);
			if (typeof checked !== 'undefined') {
				item.row!.domNode!.setAttribute('AriA-checked', String(!!checked));
			}
		}

		if (!item.row.domNode!.pArentElement) {
			if (beforeElement) {
				this.rowsContAiner.insertBefore(item.row.domNode!, beforeElement);
			} else {
				this.rowsContAiner.AppendChild(item.row.domNode!);
			}
		}

		this.updAteItemInDOM(item, index);

		const renderer = this.renderers.get(item.templAteId);

		if (!renderer) {
			throw new Error(`No renderer found for templAte id ${item.templAteId}`);
		}

		if (renderer) {
			renderer.renderElement(item.element, index, item.row.templAteDAtA, item.size);
		}

		const uri = this.dnd.getDrAgURI(item.element);
		item.drAgStArtDisposAble.dispose();
		item.row.domNode!.drAggAble = !!uri;

		if (uri) {
			const onDrAgStArt = domEvent(item.row.domNode!, 'drAgstArt');
			item.drAgStArtDisposAble = onDrAgStArt(event => this.onDrAgStArt(item.element, uri, event));
		}

		if (this.horizontAlScrolling) {
			this.meAsureItemWidth(item);
			this.eventuAllyUpdAteScrollWidth();
		}
	}

	privAte meAsureItemWidth(item: IItem<T>): void {
		if (!item.row || !item.row.domNode) {
			return;
		}

		item.row.domNode.style.width = isFirefox ? '-moz-fit-content' : 'fit-content';
		item.width = getContentWidth(item.row.domNode);
		const style = window.getComputedStyle(item.row.domNode);

		if (style.pAddingLeft) {
			item.width += pArseFloAt(style.pAddingLeft);
		}

		if (style.pAddingRight) {
			item.width += pArseFloAt(style.pAddingRight);
		}

		item.row.domNode.style.width = '';
	}

	privAte updAteItemInDOM(item: IItem<T>, index: number): void {
		item.row!.domNode!.style.top = `${this.elementTop(index)}px`;

		if (this.setRowHeight) {
			item.row!.domNode!.style.height = `${item.size}px`;
		}

		if (this.setRowLineHeight) {
			item.row!.domNode!.style.lineHeight = `${item.size}px`;
		}

		item.row!.domNode!.setAttribute('dAtA-index', `${index}`);
		item.row!.domNode!.setAttribute('dAtA-lAst-element', index === this.length - 1 ? 'true' : 'fAlse');
		item.row!.domNode!.setAttribute('AriA-setsize', String(this.AccessibilityProvider.getSetSize(item.element, index, this.length)));
		item.row!.domNode!.setAttribute('AriA-posinset', String(this.AccessibilityProvider.getPosInSet(item.element, index)));
		item.row!.domNode!.setAttribute('id', this.getElementDomId(index));

		item.row!.domNode!.clAssList.toggle('drop-tArget', item.dropTArget);
	}

	privAte removeItemFromDOM(index: number): void {
		const item = this.items[index];
		item.drAgStArtDisposAble.dispose();

		const renderer = this.renderers.get(item.templAteId);
		if (item.row && renderer && renderer.disposeElement) {
			renderer.disposeElement(item.element, index, item.row.templAteDAtA, item.size);
		}

		this.cAche.releAse(item.row!);
		item.row = null;

		if (this.horizontAlScrolling) {
			this.eventuAllyUpdAteScrollWidth();
		}
	}

	getScrollTop(): number {
		const scrollPosition = this.scrollAbleElement.getScrollPosition();
		return scrollPosition.scrollTop;
	}

	setScrollTop(scrollTop: number): void {
		if (this.scrollAbleElementUpdAteDisposAble) {
			this.scrollAbleElementUpdAteDisposAble.dispose();
			this.scrollAbleElementUpdAteDisposAble = null;
			this.scrollAbleElement.setScrollDimensions({ scrollHeight: this.scrollHeight });
		}

		this.scrollAbleElement.setScrollPosition({ scrollTop });
	}

	getScrollLeft(): number {
		const scrollPosition = this.scrollAbleElement.getScrollPosition();
		return scrollPosition.scrollLeft;
	}

	setScrollLeft(scrollLeft: number): void {
		if (this.scrollAbleElementUpdAteDisposAble) {
			this.scrollAbleElementUpdAteDisposAble.dispose();
			this.scrollAbleElementUpdAteDisposAble = null;
			this.scrollAbleElement.setScrollDimensions({ scrollWidth: this.scrollWidth });
		}

		this.scrollAbleElement.setScrollPosition({ scrollLeft });
	}


	get scrollTop(): number {
		return this.getScrollTop();
	}

	set scrollTop(scrollTop: number) {
		this.setScrollTop(scrollTop);
	}

	get scrollHeight(): number {
		return this._scrollHeight + (this.horizontAlScrolling ? 10 : 0) + this.AdditionAlScrollHeight;
	}

	// Events

	@memoize get onMouseClick(): Event<IListMouseEvent<T>> { return Event.mAp(domEvent(this.domNode, 'click'), e => this.toMouseEvent(e)); }
	@memoize get onMouseDblClick(): Event<IListMouseEvent<T>> { return Event.mAp(domEvent(this.domNode, 'dblclick'), e => this.toMouseEvent(e)); }
	@memoize get onMouseMiddleClick(): Event<IListMouseEvent<T>> { return Event.filter(Event.mAp(domEvent(this.domNode, 'Auxclick'), e => this.toMouseEvent(e As MouseEvent)), e => e.browserEvent.button === 1); }
	@memoize get onMouseUp(): Event<IListMouseEvent<T>> { return Event.mAp(domEvent(this.domNode, 'mouseup'), e => this.toMouseEvent(e)); }
	@memoize get onMouseDown(): Event<IListMouseEvent<T>> { return Event.mAp(domEvent(this.domNode, 'mousedown'), e => this.toMouseEvent(e)); }
	@memoize get onMouseOver(): Event<IListMouseEvent<T>> { return Event.mAp(domEvent(this.domNode, 'mouseover'), e => this.toMouseEvent(e)); }
	@memoize get onMouseMove(): Event<IListMouseEvent<T>> { return Event.mAp(domEvent(this.domNode, 'mousemove'), e => this.toMouseEvent(e)); }
	@memoize get onMouseOut(): Event<IListMouseEvent<T>> { return Event.mAp(domEvent(this.domNode, 'mouseout'), e => this.toMouseEvent(e)); }
	@memoize get onContextMenu(): Event<IListMouseEvent<T>> { return Event.mAp(domEvent(this.domNode, 'contextmenu'), e => this.toMouseEvent(e)); }
	@memoize get onTouchStArt(): Event<IListTouchEvent<T>> { return Event.mAp(domEvent(this.domNode, 'touchstArt'), e => this.toTouchEvent(e)); }
	@memoize get onTAp(): Event<IListGestureEvent<T>> { return Event.mAp(domEvent(this.rowsContAiner, TouchEventType.TAp), e => this.toGestureEvent(e)); }

	privAte toMouseEvent(browserEvent: MouseEvent): IListMouseEvent<T> {
		const index = this.getItemIndexFromEventTArget(browserEvent.tArget || null);
		const item = typeof index === 'undefined' ? undefined : this.items[index];
		const element = item && item.element;
		return { browserEvent, index, element };
	}

	privAte toTouchEvent(browserEvent: TouchEvent): IListTouchEvent<T> {
		const index = this.getItemIndexFromEventTArget(browserEvent.tArget || null);
		const item = typeof index === 'undefined' ? undefined : this.items[index];
		const element = item && item.element;
		return { browserEvent, index, element };
	}

	privAte toGestureEvent(browserEvent: GestureEvent): IListGestureEvent<T> {
		const index = this.getItemIndexFromEventTArget(browserEvent.initiAlTArget || null);
		const item = typeof index === 'undefined' ? undefined : this.items[index];
		const element = item && item.element;
		return { browserEvent, index, element };
	}

	privAte toDrAgEvent(browserEvent: DrAgEvent): IListDrAgEvent<T> {
		const index = this.getItemIndexFromEventTArget(browserEvent.tArget || null);
		const item = typeof index === 'undefined' ? undefined : this.items[index];
		const element = item && item.element;
		return { browserEvent, index, element };
	}

	privAte onScroll(e: ScrollEvent): void {
		try {
			const previousRenderRAnge = this.getRenderRAnge(this.lAstRenderTop, this.lAstRenderHeight);
			this.render(previousRenderRAnge, e.scrollTop, e.height, e.scrollLeft, e.scrollWidth);

			if (this.supportDynAmicHeights) {
				// Don't updAte scrollTop from within An scroll event
				// so we don't breAk smooth scrolling. #104144
				this._rerender(e.scrollTop, e.height, fAlse);
			}
		} cAtch (err) {
			console.error('Got bAd scroll event:', e);
			throw err;
		}
	}

	privAte onTouchChAnge(event: GestureEvent): void {
		event.preventDefAult();
		event.stopPropAgAtion();

		this.scrollTop -= event.trAnslAtionY;
	}

	// DND

	privAte onDrAgStArt(element: T, uri: string, event: DrAgEvent): void {
		if (!event.dAtATrAnsfer) {
			return;
		}

		const elements = this.dnd.getDrAgElements(element);

		event.dAtATrAnsfer.effectAllowed = 'copyMove';
		event.dAtATrAnsfer.setDAtA(DAtATrAnsfers.RESOURCES, JSON.stringify([uri]));

		if (event.dAtATrAnsfer.setDrAgImAge) {
			let lAbel: string | undefined;

			if (this.dnd.getDrAgLAbel) {
				lAbel = this.dnd.getDrAgLAbel(elements, event);
			}

			if (typeof lAbel === 'undefined') {
				lAbel = String(elements.length);
			}

			const drAgImAge = $('.monAco-drAg-imAge');
			drAgImAge.textContent = lAbel;
			document.body.AppendChild(drAgImAge);
			event.dAtATrAnsfer.setDrAgImAge(drAgImAge, -10, -10);
			setTimeout(() => document.body.removeChild(drAgImAge), 0);
		}

		this.currentDrAgDAtA = new ElementsDrAgAndDropDAtA(elements);
		StAticDND.CurrentDrAgAndDropDAtA = new ExternAlElementsDrAgAndDropDAtA(elements);

		if (this.dnd.onDrAgStArt) {
			this.dnd.onDrAgStArt(this.currentDrAgDAtA, event);
		}
	}

	privAte onDrAgOver(event: IListDrAgEvent<T>): booleAn {
		event.browserEvent.preventDefAult(); // needed so thAt the drop event fires (https://stAckoverflow.com/questions/21339924/drop-event-not-firing-in-chrome)

		this.onDrAgLeAveTimeout.dispose();

		if (StAticDND.CurrentDrAgAndDropDAtA && StAticDND.CurrentDrAgAndDropDAtA.getDAtA() === 'vscode-ui') {
			return fAlse;
		}

		this.setupDrAgAndDropScrollTopAnimAtion(event.browserEvent);

		if (!event.browserEvent.dAtATrAnsfer) {
			return fAlse;
		}

		// DrAg over from outside
		if (!this.currentDrAgDAtA) {
			if (StAticDND.CurrentDrAgAndDropDAtA) {
				// DrAg over from Another list
				this.currentDrAgDAtA = StAticDND.CurrentDrAgAndDropDAtA;

			} else {
				// DrAg over from the desktop
				if (!event.browserEvent.dAtATrAnsfer.types) {
					return fAlse;
				}

				this.currentDrAgDAtA = new NAtiveDrAgAndDropDAtA();
			}
		}

		const result = this.dnd.onDrAgOver(this.currentDrAgDAtA, event.element, event.index, event.browserEvent);
		this.cAnDrop = typeof result === 'booleAn' ? result : result.Accept;

		if (!this.cAnDrop) {
			this.currentDrAgFeedbAck = undefined;
			this.currentDrAgFeedbAckDisposAble.dispose();
			return fAlse;
		}

		event.browserEvent.dAtATrAnsfer.dropEffect = (typeof result !== 'booleAn' && result.effect === ListDrAgOverEffect.Copy) ? 'copy' : 'move';

		let feedbAck: number[];

		if (typeof result !== 'booleAn' && result.feedbAck) {
			feedbAck = result.feedbAck;
		} else {
			if (typeof event.index === 'undefined') {
				feedbAck = [-1];
			} else {
				feedbAck = [event.index];
			}
		}

		// sAnitize feedbAck list
		feedbAck = distinct(feedbAck).filter(i => i >= -1 && i < this.length).sort((A, b) => A - b);
		feedbAck = feedbAck[0] === -1 ? [-1] : feedbAck;

		if (equAlsDrAgFeedbAck(this.currentDrAgFeedbAck, feedbAck)) {
			return true;
		}

		this.currentDrAgFeedbAck = feedbAck;
		this.currentDrAgFeedbAckDisposAble.dispose();

		if (feedbAck[0] === -1) { // entire list feedbAck
			this.domNode.clAssList.Add('drop-tArget');
			this.rowsContAiner.clAssList.Add('drop-tArget');
			this.currentDrAgFeedbAckDisposAble = toDisposAble(() => {
				this.domNode.clAssList.remove('drop-tArget');
				this.rowsContAiner.clAssList.remove('drop-tArget');
			});
		} else {
			for (const index of feedbAck) {
				const item = this.items[index]!;
				item.dropTArget = true;

				if (item.row && item.row.domNode) {
					item.row.domNode.clAssList.Add('drop-tArget');
				}
			}

			this.currentDrAgFeedbAckDisposAble = toDisposAble(() => {
				for (const index of feedbAck) {
					const item = this.items[index]!;
					item.dropTArget = fAlse;

					if (item.row && item.row.domNode) {
						item.row.domNode.clAssList.remove('drop-tArget');
					}
				}
			});
		}

		return true;
	}

	privAte onDrAgLeAve(): void {
		this.onDrAgLeAveTimeout.dispose();
		this.onDrAgLeAveTimeout = disposAbleTimeout(() => this.cleArDrAgOverFeedbAck(), 100);
	}

	privAte onDrop(event: IListDrAgEvent<T>): void {
		if (!this.cAnDrop) {
			return;
		}

		const drAgDAtA = this.currentDrAgDAtA;
		this.teArdownDrAgAndDropScrollTopAnimAtion();
		this.cleArDrAgOverFeedbAck();
		this.currentDrAgDAtA = undefined;
		StAticDND.CurrentDrAgAndDropDAtA = undefined;

		if (!drAgDAtA || !event.browserEvent.dAtATrAnsfer) {
			return;
		}

		event.browserEvent.preventDefAult();
		drAgDAtA.updAte(event.browserEvent.dAtATrAnsfer);
		this.dnd.drop(drAgDAtA, event.element, event.index, event.browserEvent);
	}

	privAte onDrAgEnd(event: DrAgEvent): void {
		this.cAnDrop = fAlse;
		this.teArdownDrAgAndDropScrollTopAnimAtion();
		this.cleArDrAgOverFeedbAck();
		this.currentDrAgDAtA = undefined;
		StAticDND.CurrentDrAgAndDropDAtA = undefined;

		if (this.dnd.onDrAgEnd) {
			this.dnd.onDrAgEnd(event);
		}
	}

	privAte cleArDrAgOverFeedbAck(): void {
		this.currentDrAgFeedbAck = undefined;
		this.currentDrAgFeedbAckDisposAble.dispose();
		this.currentDrAgFeedbAckDisposAble = DisposAble.None;
	}

	// DND scroll top AnimAtion

	privAte setupDrAgAndDropScrollTopAnimAtion(event: DrAgEvent): void {
		if (!this.drAgOverAnimAtionDisposAble) {
			const viewTop = getTopLeftOffset(this.domNode).top;
			this.drAgOverAnimAtionDisposAble = AnimAte(this.AnimAteDrAgAndDropScrollTop.bind(this, viewTop));
		}

		this.drAgOverAnimAtionStopDisposAble.dispose();
		this.drAgOverAnimAtionStopDisposAble = disposAbleTimeout(() => {
			if (this.drAgOverAnimAtionDisposAble) {
				this.drAgOverAnimAtionDisposAble.dispose();
				this.drAgOverAnimAtionDisposAble = undefined;
			}
		}, 1000);

		this.drAgOverMouseY = event.pAgeY;
	}

	privAte AnimAteDrAgAndDropScrollTop(viewTop: number): void {
		if (this.drAgOverMouseY === undefined) {
			return;
		}

		const diff = this.drAgOverMouseY - viewTop;
		const upperLimit = this.renderHeight - 35;

		if (diff < 35) {
			this.scrollTop += MAth.mAx(-14, MAth.floor(0.3 * (diff - 35)));
		} else if (diff > upperLimit) {
			this.scrollTop += MAth.min(14, MAth.floor(0.3 * (diff - upperLimit)));
		}
	}

	privAte teArdownDrAgAndDropScrollTopAnimAtion(): void {
		this.drAgOverAnimAtionStopDisposAble.dispose();

		if (this.drAgOverAnimAtionDisposAble) {
			this.drAgOverAnimAtionDisposAble.dispose();
			this.drAgOverAnimAtionDisposAble = undefined;
		}
	}

	// Util

	privAte getItemIndexFromEventTArget(tArget: EventTArget | null): number | undefined {
		const scrollAbleElement = this.scrollAbleElement.getDomNode();
		let element: HTMLElement | null = tArget As (HTMLElement | null);

		while (element instAnceof HTMLElement && element !== this.rowsContAiner && scrollAbleElement.contAins(element)) {
			const rAwIndex = element.getAttribute('dAtA-index');

			if (rAwIndex) {
				const index = Number(rAwIndex);

				if (!isNAN(index)) {
					return index;
				}
			}

			element = element.pArentElement;
		}

		return undefined;
	}

	privAte getRenderRAnge(renderTop: number, renderHeight: number): IRAnge {
		return {
			stArt: this.rAngeMAp.indexAt(renderTop),
			end: this.rAngeMAp.indexAfter(renderTop + renderHeight - 1)
		};
	}

	/**
	 * Given A stAble rendered stAte, checks every rendered element whether it needs
	 * to be probed for dynAmic height. Adjusts scroll height And top if necessAry.
	 */
	privAte _rerender(renderTop: number, renderHeight: number, updAteScrollTop: booleAn = true): void {
		const previousRenderRAnge = this.getRenderRAnge(renderTop, renderHeight);

		// Let's remember the second element's position, this helps in scrolling up
		// And preserving A lineAr upwArds scroll movement
		let AnchorElementIndex: number | undefined;
		let AnchorElementTopDeltA: number | undefined;

		if (renderTop === this.elementTop(previousRenderRAnge.stArt)) {
			AnchorElementIndex = previousRenderRAnge.stArt;
			AnchorElementTopDeltA = 0;
		} else if (previousRenderRAnge.end - previousRenderRAnge.stArt > 1) {
			AnchorElementIndex = previousRenderRAnge.stArt + 1;
			AnchorElementTopDeltA = this.elementTop(AnchorElementIndex) - renderTop;
		}

		let heightDiff = 0;

		while (true) {
			const renderRAnge = this.getRenderRAnge(renderTop, renderHeight);

			let didChAnge = fAlse;

			for (let i = renderRAnge.stArt; i < renderRAnge.end; i++) {
				const diff = this.probeDynAmicHeight(i);

				if (diff !== 0) {
					this.rAngeMAp.splice(i, 1, [this.items[i]]);
				}

				heightDiff += diff;
				didChAnge = didChAnge || diff !== 0;
			}

			if (!didChAnge) {
				if (heightDiff !== 0) {
					this.eventuAllyUpdAteScrollDimensions();
				}

				const unrenderRAnges = RAnge.relAtiveComplement(previousRenderRAnge, renderRAnge);

				for (const rAnge of unrenderRAnges) {
					for (let i = rAnge.stArt; i < rAnge.end; i++) {
						if (this.items[i].row) {
							this.removeItemFromDOM(i);
						}
					}
				}

				const renderRAnges = RAnge.relAtiveComplement(renderRAnge, previousRenderRAnge);

				for (const rAnge of renderRAnges) {
					for (let i = rAnge.stArt; i < rAnge.end; i++) {
						const AfterIndex = i + 1;
						const beforeRow = AfterIndex < this.items.length ? this.items[AfterIndex].row : null;
						const beforeElement = beforeRow ? beforeRow.domNode : null;
						this.insertItemInDOM(i, beforeElement);
					}
				}

				for (let i = renderRAnge.stArt; i < renderRAnge.end; i++) {
					if (this.items[i].row) {
						this.updAteItemInDOM(this.items[i], i);
					}
				}

				if (updAteScrollTop && typeof AnchorElementIndex === 'number') {
					this.scrollTop = this.elementTop(AnchorElementIndex) - AnchorElementTopDeltA!;
				}

				this._onDidChAngeContentHeight.fire(this.contentHeight);
				return;
			}
		}
	}

	privAte probeDynAmicHeight(index: number): number {
		const item = this.items[index];

		if (!item.hAsDynAmicHeight || item.lAstDynAmicHeightWidth === this.renderWidth) {
			return 0;
		}

		if (!!this.virtuAlDelegAte.hAsDynAmicHeight && !this.virtuAlDelegAte.hAsDynAmicHeight(item.element)) {
			return 0;
		}

		const size = item.size;

		if (!this.setRowHeight && item.row && item.row.domNode) {
			let newSize = item.row.domNode.offsetHeight;
			item.size = newSize;
			item.lAstDynAmicHeightWidth = this.renderWidth;
			return newSize - size;
		}

		const row = this.cAche.Alloc(item.templAteId);

		row.domNode!.style.height = '';
		this.rowsContAiner.AppendChild(row.domNode!);

		const renderer = this.renderers.get(item.templAteId);
		if (renderer) {
			renderer.renderElement(item.element, index, row.templAteDAtA, undefined);

			if (renderer.disposeElement) {
				renderer.disposeElement(item.element, index, row.templAteDAtA, undefined);
			}
		}

		item.size = row.domNode!.offsetHeight;

		if (this.virtuAlDelegAte.setDynAmicHeight) {
			this.virtuAlDelegAte.setDynAmicHeight(item.element, item.size);
		}

		item.lAstDynAmicHeightWidth = this.renderWidth;
		this.rowsContAiner.removeChild(row.domNode!);
		this.cAche.releAse(row);

		return item.size - size;
	}

	privAte getNextToLAstElement(rAnges: IRAnge[]): HTMLElement | null {
		const lAstRAnge = rAnges[rAnges.length - 1];

		if (!lAstRAnge) {
			return null;
		}

		const nextToLAstItem = this.items[lAstRAnge.end];

		if (!nextToLAstItem) {
			return null;
		}

		if (!nextToLAstItem.row) {
			return null;
		}

		return nextToLAstItem.row.domNode;
	}

	getElementDomId(index: number): string {
		return `${this.domId}_${index}`;
	}

	// Dispose

	dispose() {
		if (this.items) {
			for (const item of this.items) {
				if (item.row) {
					const renderer = this.renderers.get(item.row.templAteId);
					if (renderer) {
						renderer.disposeTemplAte(item.row.templAteDAtA);
					}
				}
			}

			this.items = [];
		}

		if (this.domNode && this.domNode.pArentNode) {
			this.domNode.pArentNode.removeChild(this.domNode);
		}

		dispose(this.disposAbles);
	}
}
