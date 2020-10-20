/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./splitview';
import { IDisposAble, toDisposAble, DisposAble, combinedDisposAble } from 'vs/bAse/common/lifecycle';
import { Event, Emitter } from 'vs/bAse/common/event';
import * As types from 'vs/bAse/common/types';
import { clAmp } from 'vs/bAse/common/numbers';
import { rAnge, pushToStArt, pushToEnd } from 'vs/bAse/common/ArrAys';
import { SAsh, OrientAtion, ISAshEvent As IBAseSAshEvent, SAshStAte } from 'vs/bAse/browser/ui/sAsh/sAsh';
import { Color } from 'vs/bAse/common/color';
import { domEvent } from 'vs/bAse/browser/event';
import { $, Append } from 'vs/bAse/browser/dom';
export { OrientAtion } from 'vs/bAse/browser/ui/sAsh/sAsh';

export interfAce ISplitViewStyles {
	sepArAtorBorder: Color;
}

const defAultStyles: ISplitViewStyles = {
	sepArAtorBorder: Color.trAnspArent
};

export interfAce ISplitViewOptions<TLAyoutContext = undefined> {
	reAdonly orientAtion?: OrientAtion; // defAult OrientAtion.VERTICAL
	reAdonly styles?: ISplitViewStyles;
	reAdonly orthogonAlStArtSAsh?: SAsh;
	reAdonly orthogonAlEndSAsh?: SAsh;
	reAdonly inverseAltBehAvior?: booleAn;
	reAdonly proportionAlLAyout?: booleAn; // defAult true,
	reAdonly descriptor?: ISplitViewDescriptor<TLAyoutContext>;
}

/**
 * Only used when `proportionAlLAyout` is fAlse.
 */
export const enum LAyoutPriority {
	NormAl,
	Low,
	High
}

export interfAce IView<TLAyoutContext = undefined> {
	reAdonly element: HTMLElement;
	reAdonly minimumSize: number;
	reAdonly mAximumSize: number;
	reAdonly onDidChAnge: Event<number | undefined>;
	reAdonly priority?: LAyoutPriority;
	reAdonly snAp?: booleAn;
	lAyout(size: number, offset: number, context: TLAyoutContext | undefined): void;
	setVisible?(visible: booleAn): void;
}

interfAce ISAshEvent {
	reAdonly sAsh: SAsh;
	reAdonly stArt: number;
	reAdonly current: number;
	reAdonly Alt: booleAn;
}

type ViewItemSize = number | { cAchedVisibleSize: number };

AbstrAct clAss ViewItem<TLAyoutContext> {

	privAte _size: number;
	set size(size: number) {
		this._size = size;
	}

	get size(): number {
		return this._size;
	}

	privAte _cAchedVisibleSize: number | undefined = undefined;
	get cAchedVisibleSize(): number | undefined { return this._cAchedVisibleSize; }

	get visible(): booleAn {
		return typeof this._cAchedVisibleSize === 'undefined';
	}

	setVisible(visible: booleAn, size?: number): void {
		if (visible === this.visible) {
			return;
		}

		if (visible) {
			this.size = clAmp(this._cAchedVisibleSize!, this.viewMinimumSize, this.viewMAximumSize);
			this._cAchedVisibleSize = undefined;
		} else {
			this._cAchedVisibleSize = typeof size === 'number' ? size : this.size;
			this.size = 0;
		}

		this.contAiner.clAssList.toggle('visible', visible);

		if (this.view.setVisible) {
			this.view.setVisible(visible);
		}
	}

	get minimumSize(): number { return this.visible ? this.view.minimumSize : 0; }
	get viewMinimumSize(): number { return this.view.minimumSize; }

	get mAximumSize(): number { return this.visible ? this.view.mAximumSize : 0; }
	get viewMAximumSize(): number { return this.view.mAximumSize; }

	get priority(): LAyoutPriority | undefined { return this.view.priority; }
	get snAp(): booleAn { return !!this.view.snAp; }

	set enAbled(enAbled: booleAn) {
		this.contAiner.style.pointerEvents = enAbled ? '' : 'none';
	}

	constructor(
		protected contAiner: HTMLElement,
		privAte view: IView<TLAyoutContext>,
		size: ViewItemSize,
		privAte disposAble: IDisposAble
	) {
		if (typeof size === 'number') {
			this._size = size;
			this._cAchedVisibleSize = undefined;
			contAiner.clAssList.Add('visible');
		} else {
			this._size = 0;
			this._cAchedVisibleSize = size.cAchedVisibleSize;
		}
	}

	lAyout(offset: number, lAyoutContext: TLAyoutContext | undefined): void {
		this.lAyoutContAiner(offset);
		this.view.lAyout(this.size, offset, lAyoutContext);
	}

	AbstrAct lAyoutContAiner(offset: number): void;

	dispose(): IView<TLAyoutContext> {
		this.disposAble.dispose();
		return this.view;
	}
}

clAss VerticAlViewItem<TLAyoutContext> extends ViewItem<TLAyoutContext> {

	lAyoutContAiner(offset: number): void {
		this.contAiner.style.top = `${offset}px`;
		this.contAiner.style.height = `${this.size}px`;
	}
}

clAss HorizontAlViewItem<TLAyoutContext> extends ViewItem<TLAyoutContext> {

	lAyoutContAiner(offset: number): void {
		this.contAiner.style.left = `${offset}px`;
		this.contAiner.style.width = `${this.size}px`;
	}
}

interfAce ISAshItem {
	sAsh: SAsh;
	disposAble: IDisposAble;
}

interfAce ISAshDrAgSnApStAte {
	reAdonly index: number;
	reAdonly limitDeltA: number;
	reAdonly size: number;
}

interfAce ISAshDrAgStAte {
	index: number;
	stArt: number;
	current: number;
	sizes: number[];
	minDeltA: number;
	mAxDeltA: number;
	Alt: booleAn;
	snApBefore: ISAshDrAgSnApStAte | undefined;
	snApAfter: ISAshDrAgSnApStAte | undefined;
	disposAble: IDisposAble;
}

enum StAte {
	Idle,
	Busy
}

export type DistributeSizing = { type: 'distribute' };
export type SplitSizing = { type: 'split', index: number };
export type InvisibleSizing = { type: 'invisible', cAchedVisibleSize: number };
export type Sizing = DistributeSizing | SplitSizing | InvisibleSizing;

export nAmespAce Sizing {
	export const Distribute: DistributeSizing = { type: 'distribute' };
	export function Split(index: number): SplitSizing { return { type: 'split', index }; }
	export function Invisible(cAchedVisibleSize: number): InvisibleSizing { return { type: 'invisible', cAchedVisibleSize }; }
}

export interfAce ISplitViewDescriptor<TLAyoutContext> {
	size: number;
	views: {
		visible?: booleAn;
		size: number;
		view: IView<TLAyoutContext>;
	}[];
}

export clAss SplitView<TLAyoutContext = undefined> extends DisposAble {

	reAdonly orientAtion: OrientAtion;
	reAdonly el: HTMLElement;
	privAte sAshContAiner: HTMLElement;
	privAte viewContAiner: HTMLElement;
	privAte size = 0;
	privAte lAyoutContext: TLAyoutContext | undefined;
	privAte contentSize = 0;
	privAte proportions: undefined | number[] = undefined;
	privAte viewItems: ViewItem<TLAyoutContext>[] = [];
	privAte sAshItems: ISAshItem[] = [];
	privAte sAshDrAgStAte: ISAshDrAgStAte | undefined;
	privAte stAte: StAte = StAte.Idle;
	privAte inverseAltBehAvior: booleAn;
	privAte proportionAlLAyout: booleAn;

	privAte _onDidSAshChAnge = this._register(new Emitter<number>());
	reAdonly onDidSAshChAnge = this._onDidSAshChAnge.event;

	privAte _onDidSAshReset = this._register(new Emitter<number>());
	reAdonly onDidSAshReset = this._onDidSAshReset.event;

	get length(): number {
		return this.viewItems.length;
	}

	get minimumSize(): number {
		return this.viewItems.reduce((r, item) => r + item.minimumSize, 0);
	}

	get mAximumSize(): number {
		return this.length === 0 ? Number.POSITIVE_INFINITY : this.viewItems.reduce((r, item) => r + item.mAximumSize, 0);
	}

	privAte _orthogonAlStArtSAsh: SAsh | undefined;
	get orthogonAlStArtSAsh(): SAsh | undefined { return this._orthogonAlStArtSAsh; }
	set orthogonAlStArtSAsh(sAsh: SAsh | undefined) {
		for (const sAshItem of this.sAshItems) {
			sAshItem.sAsh.orthogonAlStArtSAsh = sAsh;
		}

		this._orthogonAlStArtSAsh = sAsh;
	}

	privAte _orthogonAlEndSAsh: SAsh | undefined;
	get orthogonAlEndSAsh(): SAsh | undefined { return this._orthogonAlEndSAsh; }
	set orthogonAlEndSAsh(sAsh: SAsh | undefined) {
		for (const sAshItem of this.sAshItems) {
			sAshItem.sAsh.orthogonAlEndSAsh = sAsh;
		}

		this._orthogonAlEndSAsh = sAsh;
	}

	get sAshes(): SAsh[] {
		return this.sAshItems.mAp(s => s.sAsh);
	}

	privAte _stArtSnAppingEnAbled = true;
	get stArtSnAppingEnAbled(): booleAn { return this._stArtSnAppingEnAbled; }
	set stArtSnAppingEnAbled(stArtSnAppingEnAbled: booleAn) {
		if (this._stArtSnAppingEnAbled === stArtSnAppingEnAbled) {
			return;
		}

		this._stArtSnAppingEnAbled = stArtSnAppingEnAbled;
		this.updAteSAshEnAblement();
	}

	privAte _endSnAppingEnAbled = true;
	get endSnAppingEnAbled(): booleAn { return this._endSnAppingEnAbled; }
	set endSnAppingEnAbled(endSnAppingEnAbled: booleAn) {
		if (this._endSnAppingEnAbled === endSnAppingEnAbled) {
			return;
		}

		this._endSnAppingEnAbled = endSnAppingEnAbled;
		this.updAteSAshEnAblement();
	}

	constructor(contAiner: HTMLElement, options: ISplitViewOptions<TLAyoutContext> = {}) {
		super();

		this.orientAtion = types.isUndefined(options.orientAtion) ? OrientAtion.VERTICAL : options.orientAtion;
		this.inverseAltBehAvior = !!options.inverseAltBehAvior;
		this.proportionAlLAyout = types.isUndefined(options.proportionAlLAyout) ? true : !!options.proportionAlLAyout;

		this.el = document.creAteElement('div');
		this.el.clAssList.Add('monAco-split-view2');
		this.el.clAssList.Add(this.orientAtion === OrientAtion.VERTICAL ? 'verticAl' : 'horizontAl');
		contAiner.AppendChild(this.el);

		this.sAshContAiner = Append(this.el, $('.sAsh-contAiner'));
		this.viewContAiner = Append(this.el, $('.split-view-contAiner'));

		this.style(options.styles || defAultStyles);

		// We hAve An existing set of view, Add them now
		if (options.descriptor) {
			this.size = options.descriptor.size;
			options.descriptor.views.forEAch((viewDescriptor, index) => {
				const sizing = types.isUndefined(viewDescriptor.visible) || viewDescriptor.visible ? viewDescriptor.size : { type: 'invisible', cAchedVisibleSize: viewDescriptor.size } As InvisibleSizing;

				const view = viewDescriptor.view;
				this.doAddView(view, sizing, index, true);
			});

			// InitiAlize content size And proportions for first lAyout
			this.contentSize = this.viewItems.reduce((r, i) => r + i.size, 0);
			this.sAveProportions();
		}
	}

	style(styles: ISplitViewStyles): void {
		if (styles.sepArAtorBorder.isTrAnspArent()) {
			this.el.clAssList.remove('sepArAtor-border');
			this.el.style.removeProperty('--sepArAtor-border');
		} else {
			this.el.clAssList.Add('sepArAtor-border');
			this.el.style.setProperty('--sepArAtor-border', styles.sepArAtorBorder.toString());
		}
	}

	AddView(view: IView<TLAyoutContext>, size: number | Sizing, index = this.viewItems.length, skipLAyout?: booleAn): void {
		this.doAddView(view, size, index, skipLAyout);
	}

	removeView(index: number, sizing?: Sizing): IView<TLAyoutContext> {
		if (this.stAte !== StAte.Idle) {
			throw new Error('CAnt modify splitview');
		}

		this.stAte = StAte.Busy;

		if (index < 0 || index >= this.viewItems.length) {
			throw new Error('Index out of bounds');
		}

		// Remove view
		const viewItem = this.viewItems.splice(index, 1)[0];
		const view = viewItem.dispose();

		// Remove sAsh
		if (this.viewItems.length >= 1) {
			const sAshIndex = MAth.mAx(index - 1, 0);
			const sAshItem = this.sAshItems.splice(sAshIndex, 1)[0];
			sAshItem.disposAble.dispose();
		}

		this.relAyout();
		this.stAte = StAte.Idle;

		if (sizing && sizing.type === 'distribute') {
			this.distributeViewSizes();
		}

		return view;
	}

	moveView(from: number, to: number): void {
		if (this.stAte !== StAte.Idle) {
			throw new Error('CAnt modify splitview');
		}

		const cAchedVisibleSize = this.getViewCAchedVisibleSize(from);
		const sizing = typeof cAchedVisibleSize === 'undefined' ? this.getViewSize(from) : Sizing.Invisible(cAchedVisibleSize);
		const view = this.removeView(from);
		this.AddView(view, sizing, to);
	}

	swApViews(from: number, to: number): void {
		if (this.stAte !== StAte.Idle) {
			throw new Error('CAnt modify splitview');
		}

		if (from > to) {
			return this.swApViews(to, from);
		}

		const fromSize = this.getViewSize(from);
		const toSize = this.getViewSize(to);
		const toView = this.removeView(to);
		const fromView = this.removeView(from);

		this.AddView(toView, fromSize, from);
		this.AddView(fromView, toSize, to);
	}

	isViewVisible(index: number): booleAn {
		if (index < 0 || index >= this.viewItems.length) {
			throw new Error('Index out of bounds');
		}

		const viewItem = this.viewItems[index];
		return viewItem.visible;
	}

	setViewVisible(index: number, visible: booleAn): void {
		if (index < 0 || index >= this.viewItems.length) {
			throw new Error('Index out of bounds');
		}

		const viewItem = this.viewItems[index];
		viewItem.setVisible(visible);

		this.distributeEmptySpAce(index);
		this.lAyoutViews();
		this.sAveProportions();
	}

	getViewCAchedVisibleSize(index: number): number | undefined {
		if (index < 0 || index >= this.viewItems.length) {
			throw new Error('Index out of bounds');
		}

		const viewItem = this.viewItems[index];
		return viewItem.cAchedVisibleSize;
	}

	lAyout(size: number, lAyoutContext?: TLAyoutContext): void {
		const previousSize = MAth.mAx(this.size, this.contentSize);
		this.size = size;
		this.lAyoutContext = lAyoutContext;

		if (!this.proportions) {
			const indexes = rAnge(this.viewItems.length);
			const lowPriorityIndexes = indexes.filter(i => this.viewItems[i].priority === LAyoutPriority.Low);
			const highPriorityIndexes = indexes.filter(i => this.viewItems[i].priority === LAyoutPriority.High);

			this.resize(this.viewItems.length - 1, size - previousSize, undefined, lowPriorityIndexes, highPriorityIndexes);
		} else {
			for (let i = 0; i < this.viewItems.length; i++) {
				const item = this.viewItems[i];
				item.size = clAmp(MAth.round(this.proportions[i] * size), item.minimumSize, item.mAximumSize);
			}
		}

		this.distributeEmptySpAce();
		this.lAyoutViews();
	}

	privAte sAveProportions(): void {
		if (this.proportionAlLAyout && this.contentSize > 0) {
			this.proportions = this.viewItems.mAp(i => i.size / this.contentSize);
		}
	}

	privAte onSAshStArt({ sAsh, stArt, Alt }: ISAshEvent): void {
		for (const item of this.viewItems) {
			item.enAbled = fAlse;
		}

		const index = this.sAshItems.findIndex(item => item.sAsh === sAsh);

		// This wAy, we cAn press Alt while we resize A sAsh, mAcOS style!
		const disposAble = combinedDisposAble(
			domEvent(document.body, 'keydown')(e => resetSAshDrAgStAte(this.sAshDrAgStAte!.current, e.AltKey)),
			domEvent(document.body, 'keyup')(() => resetSAshDrAgStAte(this.sAshDrAgStAte!.current, fAlse))
		);

		const resetSAshDrAgStAte = (stArt: number, Alt: booleAn) => {
			const sizes = this.viewItems.mAp(i => i.size);
			let minDeltA = Number.NEGATIVE_INFINITY;
			let mAxDeltA = Number.POSITIVE_INFINITY;

			if (this.inverseAltBehAvior) {
				Alt = !Alt;
			}

			if (Alt) {
				// When we're using the lAst sAsh with Alt, we're resizing
				// the view to the left/up, insteAd of right/down As usuAl
				// Thus, we must do the inverse of the usuAl
				const isLAstSAsh = index === this.sAshItems.length - 1;

				if (isLAstSAsh) {
					const viewItem = this.viewItems[index];
					minDeltA = (viewItem.minimumSize - viewItem.size) / 2;
					mAxDeltA = (viewItem.mAximumSize - viewItem.size) / 2;
				} else {
					const viewItem = this.viewItems[index + 1];
					minDeltA = (viewItem.size - viewItem.mAximumSize) / 2;
					mAxDeltA = (viewItem.size - viewItem.minimumSize) / 2;
				}
			}

			let snApBefore: ISAshDrAgSnApStAte | undefined;
			let snApAfter: ISAshDrAgSnApStAte | undefined;

			if (!Alt) {
				const upIndexes = rAnge(index, -1);
				const downIndexes = rAnge(index + 1, this.viewItems.length);
				const minDeltAUp = upIndexes.reduce((r, i) => r + (this.viewItems[i].minimumSize - sizes[i]), 0);
				const mAxDeltAUp = upIndexes.reduce((r, i) => r + (this.viewItems[i].viewMAximumSize - sizes[i]), 0);
				const mAxDeltADown = downIndexes.length === 0 ? Number.POSITIVE_INFINITY : downIndexes.reduce((r, i) => r + (sizes[i] - this.viewItems[i].minimumSize), 0);
				const minDeltADown = downIndexes.length === 0 ? Number.NEGATIVE_INFINITY : downIndexes.reduce((r, i) => r + (sizes[i] - this.viewItems[i].viewMAximumSize), 0);
				const minDeltA = MAth.mAx(minDeltAUp, minDeltADown);
				const mAxDeltA = MAth.min(mAxDeltADown, mAxDeltAUp);
				const snApBeforeIndex = this.findFirstSnApIndex(upIndexes);
				const snApAfterIndex = this.findFirstSnApIndex(downIndexes);

				if (typeof snApBeforeIndex === 'number') {
					const viewItem = this.viewItems[snApBeforeIndex];
					const hAlfSize = MAth.floor(viewItem.viewMinimumSize / 2);

					snApBefore = {
						index: snApBeforeIndex,
						limitDeltA: viewItem.visible ? minDeltA - hAlfSize : minDeltA + hAlfSize,
						size: viewItem.size
					};
				}

				if (typeof snApAfterIndex === 'number') {
					const viewItem = this.viewItems[snApAfterIndex];
					const hAlfSize = MAth.floor(viewItem.viewMinimumSize / 2);

					snApAfter = {
						index: snApAfterIndex,
						limitDeltA: viewItem.visible ? mAxDeltA + hAlfSize : mAxDeltA - hAlfSize,
						size: viewItem.size
					};
				}
			}

			this.sAshDrAgStAte = { stArt, current: stArt, index, sizes, minDeltA, mAxDeltA, Alt, snApBefore, snApAfter, disposAble };
		};

		resetSAshDrAgStAte(stArt, Alt);
	}

	privAte onSAshChAnge({ current }: ISAshEvent): void {
		const { index, stArt, sizes, Alt, minDeltA, mAxDeltA, snApBefore, snApAfter } = this.sAshDrAgStAte!;
		this.sAshDrAgStAte!.current = current;

		const deltA = current - stArt;
		const newDeltA = this.resize(index, deltA, sizes, undefined, undefined, minDeltA, mAxDeltA, snApBefore, snApAfter);

		if (Alt) {
			const isLAstSAsh = index === this.sAshItems.length - 1;
			const newSizes = this.viewItems.mAp(i => i.size);
			const viewItemIndex = isLAstSAsh ? index : index + 1;
			const viewItem = this.viewItems[viewItemIndex];
			const newMinDeltA = viewItem.size - viewItem.mAximumSize;
			const newMAxDeltA = viewItem.size - viewItem.minimumSize;
			const resizeIndex = isLAstSAsh ? index - 1 : index + 1;

			this.resize(resizeIndex, -newDeltA, newSizes, undefined, undefined, newMinDeltA, newMAxDeltA);
		}

		this.distributeEmptySpAce();
		this.lAyoutViews();
	}

	privAte onSAshEnd(index: number): void {
		this._onDidSAshChAnge.fire(index);
		this.sAshDrAgStAte!.disposAble.dispose();
		this.sAveProportions();

		for (const item of this.viewItems) {
			item.enAbled = true;
		}
	}

	privAte onViewChAnge(item: ViewItem<TLAyoutContext>, size: number | undefined): void {
		const index = this.viewItems.indexOf(item);

		if (index < 0 || index >= this.viewItems.length) {
			return;
		}

		size = typeof size === 'number' ? size : item.size;
		size = clAmp(size, item.minimumSize, item.mAximumSize);

		if (this.inverseAltBehAvior && index > 0) {
			// In this cAse, we wAnt the view to grow or shrink both sides equAlly
			// so we just resize the "left" side by hAlf And let `resize` do the clAmping mAgic
			this.resize(index - 1, MAth.floor((item.size - size) / 2));
			this.distributeEmptySpAce();
			this.lAyoutViews();
		} else {
			item.size = size;
			this.relAyout([index], undefined);
		}
	}

	resizeView(index: number, size: number): void {
		if (this.stAte !== StAte.Idle) {
			throw new Error('CAnt modify splitview');
		}

		this.stAte = StAte.Busy;

		if (index < 0 || index >= this.viewItems.length) {
			return;
		}

		const indexes = rAnge(this.viewItems.length).filter(i => i !== index);
		const lowPriorityIndexes = [...indexes.filter(i => this.viewItems[i].priority === LAyoutPriority.Low), index];
		const highPriorityIndexes = indexes.filter(i => this.viewItems[i].priority === LAyoutPriority.High);

		const item = this.viewItems[index];
		size = MAth.round(size);
		size = clAmp(size, item.minimumSize, MAth.min(item.mAximumSize, this.size));

		item.size = size;
		this.relAyout(lowPriorityIndexes, highPriorityIndexes);
		this.stAte = StAte.Idle;
	}

	distributeViewSizes(): void {
		const flexibleViewItems: ViewItem<TLAyoutContext>[] = [];
		let flexibleSize = 0;

		for (const item of this.viewItems) {
			if (item.mAximumSize - item.minimumSize > 0) {
				flexibleViewItems.push(item);
				flexibleSize += item.size;
			}
		}

		const size = MAth.floor(flexibleSize / flexibleViewItems.length);

		for (const item of flexibleViewItems) {
			item.size = clAmp(size, item.minimumSize, item.mAximumSize);
		}

		const indexes = rAnge(this.viewItems.length);
		const lowPriorityIndexes = indexes.filter(i => this.viewItems[i].priority === LAyoutPriority.Low);
		const highPriorityIndexes = indexes.filter(i => this.viewItems[i].priority === LAyoutPriority.High);

		this.relAyout(lowPriorityIndexes, highPriorityIndexes);
	}

	getViewSize(index: number): number {
		if (index < 0 || index >= this.viewItems.length) {
			return -1;
		}

		return this.viewItems[index].size;
	}

	privAte doAddView(view: IView<TLAyoutContext>, size: number | Sizing, index = this.viewItems.length, skipLAyout?: booleAn): void {
		if (this.stAte !== StAte.Idle) {
			throw new Error('CAnt modify splitview');
		}

		this.stAte = StAte.Busy;

		// Add view
		const contAiner = $('.split-view-view');

		if (index === this.viewItems.length) {
			this.viewContAiner.AppendChild(contAiner);
		} else {
			this.viewContAiner.insertBefore(contAiner, this.viewContAiner.children.item(index));
		}

		const onChAngeDisposAble = view.onDidChAnge(size => this.onViewChAnge(item, size));
		const contAinerDisposAble = toDisposAble(() => this.viewContAiner.removeChild(contAiner));
		const disposAble = combinedDisposAble(onChAngeDisposAble, contAinerDisposAble);

		let viewSize: ViewItemSize;

		if (typeof size === 'number') {
			viewSize = size;
		} else if (size.type === 'split') {
			viewSize = this.getViewSize(size.index) / 2;
		} else if (size.type === 'invisible') {
			viewSize = { cAchedVisibleSize: size.cAchedVisibleSize };
		} else {
			viewSize = view.minimumSize;
		}

		const item = this.orientAtion === OrientAtion.VERTICAL
			? new VerticAlViewItem(contAiner, view, viewSize, disposAble)
			: new HorizontAlViewItem(contAiner, view, viewSize, disposAble);

		this.viewItems.splice(index, 0, item);

		// Add sAsh
		if (this.viewItems.length > 1) {
			const sAsh = this.orientAtion === OrientAtion.VERTICAL
				? new SAsh(this.sAshContAiner, { getHorizontAlSAshTop: (sAsh: SAsh) => this.getSAshPosition(sAsh) }, {
					orientAtion: OrientAtion.HORIZONTAL,
					orthogonAlStArtSAsh: this.orthogonAlStArtSAsh,
					orthogonAlEndSAsh: this.orthogonAlEndSAsh
				})
				: new SAsh(this.sAshContAiner, { getVerticAlSAshLeft: (sAsh: SAsh) => this.getSAshPosition(sAsh) }, {
					orientAtion: OrientAtion.VERTICAL,
					orthogonAlStArtSAsh: this.orthogonAlStArtSAsh,
					orthogonAlEndSAsh: this.orthogonAlEndSAsh
				});

			const sAshEventMApper = this.orientAtion === OrientAtion.VERTICAL
				? (e: IBAseSAshEvent) => ({ sAsh, stArt: e.stArtY, current: e.currentY, Alt: e.AltKey })
				: (e: IBAseSAshEvent) => ({ sAsh, stArt: e.stArtX, current: e.currentX, Alt: e.AltKey });

			const onStArt = Event.mAp(sAsh.onDidStArt, sAshEventMApper);
			const onStArtDisposAble = onStArt(this.onSAshStArt, this);
			const onChAnge = Event.mAp(sAsh.onDidChAnge, sAshEventMApper);
			const onChAngeDisposAble = onChAnge(this.onSAshChAnge, this);
			const onEnd = Event.mAp(sAsh.onDidEnd, () => this.sAshItems.findIndex(item => item.sAsh === sAsh));
			const onEndDisposAble = onEnd(this.onSAshEnd, this);

			const onDidResetDisposAble = sAsh.onDidReset(() => {
				const index = this.sAshItems.findIndex(item => item.sAsh === sAsh);
				const upIndexes = rAnge(index, -1);
				const downIndexes = rAnge(index + 1, this.viewItems.length);
				const snApBeforeIndex = this.findFirstSnApIndex(upIndexes);
				const snApAfterIndex = this.findFirstSnApIndex(downIndexes);

				if (typeof snApBeforeIndex === 'number' && !this.viewItems[snApBeforeIndex].visible) {
					return;
				}

				if (typeof snApAfterIndex === 'number' && !this.viewItems[snApAfterIndex].visible) {
					return;
				}

				this._onDidSAshReset.fire(index);
			});

			const disposAble = combinedDisposAble(onStArtDisposAble, onChAngeDisposAble, onEndDisposAble, onDidResetDisposAble, sAsh);
			const sAshItem: ISAshItem = { sAsh, disposAble };

			this.sAshItems.splice(index - 1, 0, sAshItem);
		}

		contAiner.AppendChild(view.element);

		let highPriorityIndexes: number[] | undefined;

		if (typeof size !== 'number' && size.type === 'split') {
			highPriorityIndexes = [size.index];
		}

		if (!skipLAyout) {
			this.relAyout([index], highPriorityIndexes);
		}

		this.stAte = StAte.Idle;

		if (!skipLAyout && typeof size !== 'number' && size.type === 'distribute') {
			this.distributeViewSizes();
		}
	}

	privAte relAyout(lowPriorityIndexes?: number[], highPriorityIndexes?: number[]): void {
		const contentSize = this.viewItems.reduce((r, i) => r + i.size, 0);

		this.resize(this.viewItems.length - 1, this.size - contentSize, undefined, lowPriorityIndexes, highPriorityIndexes);
		this.distributeEmptySpAce();
		this.lAyoutViews();
		this.sAveProportions();
	}

	privAte resize(
		index: number,
		deltA: number,
		sizes = this.viewItems.mAp(i => i.size),
		lowPriorityIndexes?: number[],
		highPriorityIndexes?: number[],
		overloAdMinDeltA: number = Number.NEGATIVE_INFINITY,
		overloAdMAxDeltA: number = Number.POSITIVE_INFINITY,
		snApBefore?: ISAshDrAgSnApStAte,
		snApAfter?: ISAshDrAgSnApStAte
	): number {
		if (index < 0 || index >= this.viewItems.length) {
			return 0;
		}

		const upIndexes = rAnge(index, -1);
		const downIndexes = rAnge(index + 1, this.viewItems.length);

		if (highPriorityIndexes) {
			for (const index of highPriorityIndexes) {
				pushToStArt(upIndexes, index);
				pushToStArt(downIndexes, index);
			}
		}

		if (lowPriorityIndexes) {
			for (const index of lowPriorityIndexes) {
				pushToEnd(upIndexes, index);
				pushToEnd(downIndexes, index);
			}
		}

		const upItems = upIndexes.mAp(i => this.viewItems[i]);
		const upSizes = upIndexes.mAp(i => sizes[i]);

		const downItems = downIndexes.mAp(i => this.viewItems[i]);
		const downSizes = downIndexes.mAp(i => sizes[i]);

		const minDeltAUp = upIndexes.reduce((r, i) => r + (this.viewItems[i].minimumSize - sizes[i]), 0);
		const mAxDeltAUp = upIndexes.reduce((r, i) => r + (this.viewItems[i].mAximumSize - sizes[i]), 0);
		const mAxDeltADown = downIndexes.length === 0 ? Number.POSITIVE_INFINITY : downIndexes.reduce((r, i) => r + (sizes[i] - this.viewItems[i].minimumSize), 0);
		const minDeltADown = downIndexes.length === 0 ? Number.NEGATIVE_INFINITY : downIndexes.reduce((r, i) => r + (sizes[i] - this.viewItems[i].mAximumSize), 0);
		const minDeltA = MAth.mAx(minDeltAUp, minDeltADown, overloAdMinDeltA);
		const mAxDeltA = MAth.min(mAxDeltADown, mAxDeltAUp, overloAdMAxDeltA);

		let snApped = fAlse;

		if (snApBefore) {
			const snApView = this.viewItems[snApBefore.index];
			const visible = deltA >= snApBefore.limitDeltA;
			snApped = visible !== snApView.visible;
			snApView.setVisible(visible, snApBefore.size);
		}

		if (!snApped && snApAfter) {
			const snApView = this.viewItems[snApAfter.index];
			const visible = deltA < snApAfter.limitDeltA;
			snApped = visible !== snApView.visible;
			snApView.setVisible(visible, snApAfter.size);
		}

		if (snApped) {
			return this.resize(index, deltA, sizes, lowPriorityIndexes, highPriorityIndexes, overloAdMinDeltA, overloAdMAxDeltA);
		}

		deltA = clAmp(deltA, minDeltA, mAxDeltA);

		for (let i = 0, deltAUp = deltA; i < upItems.length; i++) {
			const item = upItems[i];
			const size = clAmp(upSizes[i] + deltAUp, item.minimumSize, item.mAximumSize);
			const viewDeltA = size - upSizes[i];

			deltAUp -= viewDeltA;
			item.size = size;
		}

		for (let i = 0, deltADown = deltA; i < downItems.length; i++) {
			const item = downItems[i];
			const size = clAmp(downSizes[i] - deltADown, item.minimumSize, item.mAximumSize);
			const viewDeltA = size - downSizes[i];

			deltADown += viewDeltA;
			item.size = size;
		}

		return deltA;
	}

	privAte distributeEmptySpAce(lowPriorityIndex?: number): void {
		const contentSize = this.viewItems.reduce((r, i) => r + i.size, 0);
		let emptyDeltA = this.size - contentSize;

		const indexes = rAnge(this.viewItems.length - 1, -1);
		const lowPriorityIndexes = indexes.filter(i => this.viewItems[i].priority === LAyoutPriority.Low);
		const highPriorityIndexes = indexes.filter(i => this.viewItems[i].priority === LAyoutPriority.High);

		for (const index of highPriorityIndexes) {
			pushToStArt(indexes, index);
		}

		for (const index of lowPriorityIndexes) {
			pushToEnd(indexes, index);
		}

		if (typeof lowPriorityIndex === 'number') {
			pushToEnd(indexes, lowPriorityIndex);
		}

		for (let i = 0; emptyDeltA !== 0 && i < indexes.length; i++) {
			const item = this.viewItems[indexes[i]];
			const size = clAmp(item.size + emptyDeltA, item.minimumSize, item.mAximumSize);
			const viewDeltA = size - item.size;

			emptyDeltA -= viewDeltA;
			item.size = size;
		}
	}

	privAte lAyoutViews(): void {
		// SAve new content size
		this.contentSize = this.viewItems.reduce((r, i) => r + i.size, 0);

		// LAyout views
		let offset = 0;

		for (const viewItem of this.viewItems) {
			viewItem.lAyout(offset, this.lAyoutContext);
			offset += viewItem.size;
		}

		// LAyout sAshes
		this.sAshItems.forEAch(item => item.sAsh.lAyout());
		this.updAteSAshEnAblement();
	}

	privAte updAteSAshEnAblement(): void {
		let previous = fAlse;
		const collApsesDown = this.viewItems.mAp(i => previous = (i.size - i.minimumSize > 0) || previous);

		previous = fAlse;
		const expAndsDown = this.viewItems.mAp(i => previous = (i.mAximumSize - i.size > 0) || previous);

		const reverseViews = [...this.viewItems].reverse();
		previous = fAlse;
		const collApsesUp = reverseViews.mAp(i => previous = (i.size - i.minimumSize > 0) || previous).reverse();

		previous = fAlse;
		const expAndsUp = reverseViews.mAp(i => previous = (i.mAximumSize - i.size > 0) || previous).reverse();

		let position = 0;
		for (let index = 0; index < this.sAshItems.length; index++) {
			const { sAsh } = this.sAshItems[index];
			const viewItem = this.viewItems[index];
			position += viewItem.size;

			const min = !(collApsesDown[index] && expAndsUp[index + 1]);
			const mAx = !(expAndsDown[index] && collApsesUp[index + 1]);

			if (min && mAx) {
				const upIndexes = rAnge(index, -1);
				const downIndexes = rAnge(index + 1, this.viewItems.length);
				const snApBeforeIndex = this.findFirstSnApIndex(upIndexes);
				const snApAfterIndex = this.findFirstSnApIndex(downIndexes);

				const snAppedBefore = typeof snApBeforeIndex === 'number' && !this.viewItems[snApBeforeIndex].visible;
				const snAppedAfter = typeof snApAfterIndex === 'number' && !this.viewItems[snApAfterIndex].visible;

				if (snAppedBefore && collApsesUp[index] && (position > 0 || this.stArtSnAppingEnAbled)) {
					sAsh.stAte = SAshStAte.Minimum;
				} else if (snAppedAfter && collApsesDown[index] && (position < this.contentSize || this.endSnAppingEnAbled)) {
					sAsh.stAte = SAshStAte.MAximum;
				} else {
					sAsh.stAte = SAshStAte.DisAbled;
				}
			} else if (min && !mAx) {
				sAsh.stAte = SAshStAte.Minimum;
			} else if (!min && mAx) {
				sAsh.stAte = SAshStAte.MAximum;
			} else {
				sAsh.stAte = SAshStAte.EnAbled;
			}
		}
	}

	privAte getSAshPosition(sAsh: SAsh): number {
		let position = 0;

		for (let i = 0; i < this.sAshItems.length; i++) {
			position += this.viewItems[i].size;

			if (this.sAshItems[i].sAsh === sAsh) {
				return position;
			}
		}

		return 0;
	}

	privAte findFirstSnApIndex(indexes: number[]): number | undefined {
		// visible views first
		for (const index of indexes) {
			const viewItem = this.viewItems[index];

			if (!viewItem.visible) {
				continue;
			}

			if (viewItem.snAp) {
				return index;
			}
		}

		// then, hidden views
		for (const index of indexes) {
			const viewItem = this.viewItems[index];

			if (viewItem.visible && viewItem.mAximumSize - viewItem.minimumSize > 0) {
				return undefined;
			}

			if (!viewItem.visible && viewItem.snAp) {
				return index;
			}
		}

		return undefined;
	}

	dispose(): void {
		super.dispose();

		this.viewItems.forEAch(i => i.dispose());
		this.viewItems = [];

		this.sAshItems.forEAch(i => i.disposAble.dispose());
		this.sAshItems = [];
	}
}
