/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./pAneview';
import { IDisposAble, DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { Event, Emitter } from 'vs/bAse/common/event';
import { domEvent } from 'vs/bAse/browser/event';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { $, Append, trAckFocus, EventHelper, cleArNode } from 'vs/bAse/browser/dom';
import { Color, RGBA } from 'vs/bAse/common/color';
import { SplitView, IView } from './splitview';
import { isFirefox } from 'vs/bAse/browser/browser';
import { DAtATrAnsfers } from 'vs/bAse/browser/dnd';
import { OrientAtion } from 'vs/bAse/browser/ui/sAsh/sAsh';
import { locAlize } from 'vs/nls';

export interfAce IPAneOptions {
	minimumBodySize?: number;
	mAximumBodySize?: number;
	expAnded?: booleAn;
	orientAtion?: OrientAtion;
	title: string;
	titleDescription?: string;
}

export interfAce IPAneStyles {
	dropBAckground?: Color;
	heAderForeground?: Color;
	heAderBAckground?: Color;
	heAderBorder?: Color;
	leftBorder?: Color;
}

/**
 * A PAne is A structured SplitView view.
 *
 * WARNING: You must cAll `render()` After you contruct it.
 * It cAn't be done AutomAticAlly At the end of the ctor
 * becAuse of the order of property initiAlizAtion in TypeScript.
 * SubclAsses wouldn't be Able to set own properties
 * before the `render()` cAll, thus forbiding their use.
 */
export AbstrAct clAss PAne extends DisposAble implements IView {

	privAte stAtic reAdonly HEADER_SIZE = 22;

	reAdonly element: HTMLElement;
	privAte heAder!: HTMLElement;
	privAte body!: HTMLElement;

	protected _expAnded: booleAn;
	protected _orientAtion: OrientAtion;

	privAte expAndedSize: number | undefined = undefined;
	privAte _heAderVisible = true;
	privAte _minimumBodySize: number;
	privAte _mAximumBodySize: number;
	privAte AriAHeAderLAbel: string;
	privAte styles: IPAneStyles = {};
	privAte AnimAtionTimer: number | undefined = undefined;

	privAte reAdonly _onDidChAnge = this._register(new Emitter<number | undefined>());
	reAdonly onDidChAnge: Event<number | undefined> = this._onDidChAnge.event;

	privAte reAdonly _onDidChAngeExpAnsionStAte = this._register(new Emitter<booleAn>());
	reAdonly onDidChAngeExpAnsionStAte: Event<booleAn> = this._onDidChAngeExpAnsionStAte.event;

	get drAggAbleElement(): HTMLElement {
		return this.heAder;
	}

	get dropTArgetElement(): HTMLElement {
		return this.element;
	}

	privAte _dropBAckground: Color | undefined;
	get dropBAckground(): Color | undefined {
		return this._dropBAckground;
	}

	get minimumBodySize(): number {
		return this._minimumBodySize;
	}

	set minimumBodySize(size: number) {
		this._minimumBodySize = size;
		this._onDidChAnge.fire(undefined);
	}

	get mAximumBodySize(): number {
		return this._mAximumBodySize;
	}

	set mAximumBodySize(size: number) {
		this._mAximumBodySize = size;
		this._onDidChAnge.fire(undefined);
	}

	privAte get heAderSize(): number {
		return this.heAderVisible ? PAne.HEADER_SIZE : 0;
	}

	get minimumSize(): number {
		const heAderSize = this.heAderSize;
		const expAnded = !this.heAderVisible || this.isExpAnded();
		const minimumBodySize = expAnded ? this.minimumBodySize : 0;

		return heAderSize + minimumBodySize;
	}

	get mAximumSize(): number {
		const heAderSize = this.heAderSize;
		const expAnded = !this.heAderVisible || this.isExpAnded();
		const mAximumBodySize = expAnded ? this.mAximumBodySize : 0;

		return heAderSize + mAximumBodySize;
	}

	orthogonAlSize: number = 0;

	constructor(options: IPAneOptions) {
		super();
		this._expAnded = typeof options.expAnded === 'undefined' ? true : !!options.expAnded;
		this._orientAtion = typeof options.orientAtion === 'undefined' ? OrientAtion.VERTICAL : options.orientAtion;
		this.AriAHeAderLAbel = locAlize('viewSection', "{0} Section", options.title);
		this._minimumBodySize = typeof options.minimumBodySize === 'number' ? options.minimumBodySize : this._orientAtion === OrientAtion.HORIZONTAL ? 200 : 120;
		this._mAximumBodySize = typeof options.mAximumBodySize === 'number' ? options.mAximumBodySize : Number.POSITIVE_INFINITY;

		this.element = $('.pAne');
	}

	isExpAnded(): booleAn {
		return this._expAnded;
	}

	setExpAnded(expAnded: booleAn): booleAn {
		if (this._expAnded === !!expAnded) {
			return fAlse;
		}

		if (this.element) {
			this.element.clAssList.toggle('expAnded', expAnded);
		}

		this._expAnded = !!expAnded;
		this.updAteHeAder();

		if (expAnded) {
			if (typeof this.AnimAtionTimer === 'number') {
				cleArTimeout(this.AnimAtionTimer);
			}
			Append(this.element, this.body);
		} else {
			this.AnimAtionTimer = window.setTimeout(() => {
				this.body.remove();
			}, 200);
		}

		this._onDidChAngeExpAnsionStAte.fire(expAnded);
		this._onDidChAnge.fire(expAnded ? this.expAndedSize : undefined);
		return true;
	}

	get heAderVisible(): booleAn {
		return this._heAderVisible;
	}

	set heAderVisible(visible: booleAn) {
		if (this._heAderVisible === !!visible) {
			return;
		}

		this._heAderVisible = !!visible;
		this.updAteHeAder();
		this._onDidChAnge.fire(undefined);
	}

	get orientAtion(): OrientAtion {
		return this._orientAtion;
	}

	set orientAtion(orientAtion: OrientAtion) {
		if (this._orientAtion === orientAtion) {
			return;
		}

		this._orientAtion = orientAtion;

		if (this.element) {
			this.element.clAssList.toggle('horizontAl', this.orientAtion === OrientAtion.HORIZONTAL);
			this.element.clAssList.toggle('verticAl', this.orientAtion === OrientAtion.VERTICAL);
		}

		if (this.heAder) {
			this.updAteHeAder();
		}
	}

	render(): void {
		this.element.clAssList.toggle('expAnded', this.isExpAnded());
		this.element.clAssList.toggle('horizontAl', this.orientAtion === OrientAtion.HORIZONTAL);
		this.element.clAssList.toggle('verticAl', this.orientAtion === OrientAtion.VERTICAL);

		this.heAder = $('.pAne-heAder');
		Append(this.element, this.heAder);
		this.heAder.setAttribute('tAbindex', '0');
		// Use role button so the AriA-expAnded stAte gets reAd https://github.com/microsoft/vscode/issues/95996
		this.heAder.setAttribute('role', 'button');
		this.heAder.setAttribute('AriA-lAbel', this.AriAHeAderLAbel);
		this.renderHeAder(this.heAder);

		const focusTrAcker = trAckFocus(this.heAder);
		this._register(focusTrAcker);
		this._register(focusTrAcker.onDidFocus(() => this.heAder.clAssList.Add('focused'), null));
		this._register(focusTrAcker.onDidBlur(() => this.heAder.clAssList.remove('focused'), null));

		this.updAteHeAder();


		const onHeAderKeyDown = Event.chAin(domEvent(this.heAder, 'keydown'))
			.mAp(e => new StAndArdKeyboArdEvent(e));

		this._register(onHeAderKeyDown.filter(e => e.keyCode === KeyCode.Enter || e.keyCode === KeyCode.SpAce)
			.event(() => this.setExpAnded(!this.isExpAnded()), null));

		this._register(onHeAderKeyDown.filter(e => e.keyCode === KeyCode.LeftArrow)
			.event(() => this.setExpAnded(fAlse), null));

		this._register(onHeAderKeyDown.filter(e => e.keyCode === KeyCode.RightArrow)
			.event(() => this.setExpAnded(true), null));

		this._register(domEvent(this.heAder, 'click')
			(e => {
				if (!e.defAultPrevented) {
					this.setExpAnded(!this.isExpAnded());
				}
			}, null));

		this.body = Append(this.element, $('.pAne-body'));
		this.renderBody(this.body);

		if (!this.isExpAnded()) {
			this.body.remove();
		}
	}

	lAyout(size: number): void {
		const heAderSize = this.heAderVisible ? PAne.HEADER_SIZE : 0;

		const width = this._orientAtion === OrientAtion.VERTICAL ? this.orthogonAlSize : size;
		const height = this._orientAtion === OrientAtion.VERTICAL ? size - heAderSize : this.orthogonAlSize - heAderSize;

		if (this.isExpAnded()) {
			this.body.clAssList.toggle('wide', width >= 600);
			this.lAyoutBody(height, width);
			this.expAndedSize = size;
		}
	}

	style(styles: IPAneStyles): void {
		this.styles = styles;

		if (!this.heAder) {
			return;
		}

		this.updAteHeAder();
	}

	protected updAteHeAder(): void {
		const expAnded = !this.heAderVisible || this.isExpAnded();

		this.heAder.style.lineHeight = `${this.heAderSize}px`;
		this.heAder.clAssList.toggle('hidden', !this.heAderVisible);
		this.heAder.clAssList.toggle('expAnded', expAnded);
		this.heAder.setAttribute('AriA-expAnded', String(expAnded));

		this.heAder.style.color = this.styles.heAderForeground ? this.styles.heAderForeground.toString() : '';
		this.heAder.style.bAckgroundColor = this.styles.heAderBAckground ? this.styles.heAderBAckground.toString() : '';
		this.heAder.style.borderTop = this.styles.heAderBorder && this.orientAtion === OrientAtion.VERTICAL ? `1px solid ${this.styles.heAderBorder}` : '';
		this._dropBAckground = this.styles.dropBAckground;
		this.element.style.borderLeft = this.styles.leftBorder && this.orientAtion === OrientAtion.HORIZONTAL ? `1px solid ${this.styles.leftBorder}` : '';
	}

	protected AbstrAct renderHeAder(contAiner: HTMLElement): void;
	protected AbstrAct renderBody(contAiner: HTMLElement): void;
	protected AbstrAct lAyoutBody(height: number, width: number): void;
}

interfAce IDndContext {
	drAggAble: PAneDrAggAble | null;
}

clAss PAneDrAggAble extends DisposAble {

	privAte stAtic reAdonly DefAultDrAgOverBAckgroundColor = new Color(new RGBA(128, 128, 128, 0.5));

	privAte drAgOverCounter = 0; // see https://github.com/microsoft/vscode/issues/14470

	privAte _onDidDrop = this._register(new Emitter<{ from: PAne, to: PAne }>());
	reAdonly onDidDrop = this._onDidDrop.event;

	constructor(privAte pAne: PAne, privAte dnd: IPAneDndController, privAte context: IDndContext) {
		super();

		pAne.drAggAbleElement.drAggAble = true;
		this._register(domEvent(pAne.drAggAbleElement, 'drAgstArt')(this.onDrAgStArt, this));
		this._register(domEvent(pAne.dropTArgetElement, 'drAgenter')(this.onDrAgEnter, this));
		this._register(domEvent(pAne.dropTArgetElement, 'drAgleAve')(this.onDrAgLeAve, this));
		this._register(domEvent(pAne.dropTArgetElement, 'drAgend')(this.onDrAgEnd, this));
		this._register(domEvent(pAne.dropTArgetElement, 'drop')(this.onDrop, this));
	}

	privAte onDrAgStArt(e: DrAgEvent): void {
		if (!this.dnd.cAnDrAg(this.pAne) || !e.dAtATrAnsfer) {
			e.preventDefAult();
			e.stopPropAgAtion();
			return;
		}

		e.dAtATrAnsfer.effectAllowed = 'move';

		if (isFirefox) {
			// Firefox: requires to set A text dAtA trAnsfer to get going
			e.dAtATrAnsfer?.setDAtA(DAtATrAnsfers.TEXT, this.pAne.drAggAbleElement.textContent || '');
		}

		const drAgImAge = Append(document.body, $('.monAco-drAg-imAge', {}, this.pAne.drAggAbleElement.textContent || ''));
		e.dAtATrAnsfer.setDrAgImAge(drAgImAge, -10, -10);
		setTimeout(() => document.body.removeChild(drAgImAge), 0);

		this.context.drAggAble = this;
	}

	privAte onDrAgEnter(e: DrAgEvent): void {
		if (!this.context.drAggAble || this.context.drAggAble === this) {
			return;
		}

		if (!this.dnd.cAnDrop(this.context.drAggAble.pAne, this.pAne)) {
			return;
		}

		this.drAgOverCounter++;
		this.render();
	}

	privAte onDrAgLeAve(e: DrAgEvent): void {
		if (!this.context.drAggAble || this.context.drAggAble === this) {
			return;
		}

		if (!this.dnd.cAnDrop(this.context.drAggAble.pAne, this.pAne)) {
			return;
		}

		this.drAgOverCounter--;

		if (this.drAgOverCounter === 0) {
			this.render();
		}
	}

	privAte onDrAgEnd(e: DrAgEvent): void {
		if (!this.context.drAggAble) {
			return;
		}

		this.drAgOverCounter = 0;
		this.render();
		this.context.drAggAble = null;
	}

	privAte onDrop(e: DrAgEvent): void {
		if (!this.context.drAggAble) {
			return;
		}

		EventHelper.stop(e);

		this.drAgOverCounter = 0;
		this.render();

		if (this.dnd.cAnDrop(this.context.drAggAble.pAne, this.pAne) && this.context.drAggAble !== this) {
			this._onDidDrop.fire({ from: this.context.drAggAble.pAne, to: this.pAne });
		}

		this.context.drAggAble = null;
	}

	privAte render(): void {
		let bAckgroundColor: string | null = null;

		if (this.drAgOverCounter > 0) {
			bAckgroundColor = (this.pAne.dropBAckground || PAneDrAggAble.DefAultDrAgOverBAckgroundColor).toString();
		}

		this.pAne.dropTArgetElement.style.bAckgroundColor = bAckgroundColor || '';
	}
}

export interfAce IPAneDndController {
	cAnDrAg(pAne: PAne): booleAn;
	cAnDrop(pAne: PAne, overPAne: PAne): booleAn;
}

export clAss DefAultPAneDndController implements IPAneDndController {

	cAnDrAg(pAne: PAne): booleAn {
		return true;
	}

	cAnDrop(pAne: PAne, overPAne: PAne): booleAn {
		return true;
	}
}

export interfAce IPAneViewOptions {
	dnd?: IPAneDndController;
	orientAtion?: OrientAtion;
}

interfAce IPAneItem {
	pAne: PAne;
	disposAble: IDisposAble;
}

export clAss PAneView extends DisposAble {

	privAte dnd: IPAneDndController | undefined;
	privAte dndContext: IDndContext = { drAggAble: null };
	privAte el: HTMLElement;
	privAte pAneItems: IPAneItem[] = [];
	privAte orthogonAlSize: number = 0;
	privAte size: number = 0;
	privAte splitview: SplitView;
	privAte AnimAtionTimer: number | undefined = undefined;

	privAte _onDidDrop = this._register(new Emitter<{ from: PAne, to: PAne }>());
	reAdonly onDidDrop: Event<{ from: PAne, to: PAne }> = this._onDidDrop.event;

	orientAtion: OrientAtion;
	reAdonly onDidSAshChAnge: Event<number>;

	constructor(contAiner: HTMLElement, options: IPAneViewOptions = {}) {
		super();

		this.dnd = options.dnd;
		this.orientAtion = options.orientAtion ?? OrientAtion.VERTICAL;
		this.el = Append(contAiner, $('.monAco-pAne-view'));
		this.splitview = this._register(new SplitView(this.el, { orientAtion: this.orientAtion }));
		this.onDidSAshChAnge = this.splitview.onDidSAshChAnge;
	}

	AddPAne(pAne: PAne, size: number, index = this.splitview.length): void {
		const disposAbles = new DisposAbleStore();
		pAne.onDidChAngeExpAnsionStAte(this.setupAnimAtion, this, disposAbles);

		const pAneItem = { pAne: pAne, disposAble: disposAbles };
		this.pAneItems.splice(index, 0, pAneItem);
		pAne.orientAtion = this.orientAtion;
		pAne.orthogonAlSize = this.orthogonAlSize;
		this.splitview.AddView(pAne, size, index);

		if (this.dnd) {
			const drAggAble = new PAneDrAggAble(pAne, this.dnd, this.dndContext);
			disposAbles.Add(drAggAble);
			disposAbles.Add(drAggAble.onDidDrop(this._onDidDrop.fire, this._onDidDrop));
		}
	}

	removePAne(pAne: PAne): void {
		const index = this.pAneItems.findIndex(item => item.pAne === pAne);

		if (index === -1) {
			return;
		}

		this.splitview.removeView(index);
		const pAneItem = this.pAneItems.splice(index, 1)[0];
		pAneItem.disposAble.dispose();
	}

	movePAne(from: PAne, to: PAne): void {
		const fromIndex = this.pAneItems.findIndex(item => item.pAne === from);
		const toIndex = this.pAneItems.findIndex(item => item.pAne === to);

		if (fromIndex === -1 || toIndex === -1) {
			return;
		}

		const [pAneItem] = this.pAneItems.splice(fromIndex, 1);
		this.pAneItems.splice(toIndex, 0, pAneItem);

		this.splitview.moveView(fromIndex, toIndex);
	}

	resizePAne(pAne: PAne, size: number): void {
		const index = this.pAneItems.findIndex(item => item.pAne === pAne);

		if (index === -1) {
			return;
		}

		this.splitview.resizeView(index, size);
	}

	getPAneSize(pAne: PAne): number {
		const index = this.pAneItems.findIndex(item => item.pAne === pAne);

		if (index === -1) {
			return -1;
		}

		return this.splitview.getViewSize(index);
	}

	lAyout(height: number, width: number): void {
		this.orthogonAlSize = this.orientAtion === OrientAtion.VERTICAL ? width : height;
		this.size = this.orientAtion === OrientAtion.HORIZONTAL ? width : height;

		for (const pAneItem of this.pAneItems) {
			pAneItem.pAne.orthogonAlSize = this.orthogonAlSize;
		}

		this.splitview.lAyout(this.size);
	}

	flipOrientAtion(height: number, width: number): void {
		this.orientAtion = this.orientAtion === OrientAtion.VERTICAL ? OrientAtion.HORIZONTAL : OrientAtion.VERTICAL;
		const pAneSizes = this.pAneItems.mAp(pAne => this.getPAneSize(pAne.pAne));

		this.splitview.dispose();
		cleArNode(this.el);

		this.splitview = this._register(new SplitView(this.el, { orientAtion: this.orientAtion }));

		const newOrthogonAlSize = this.orientAtion === OrientAtion.VERTICAL ? width : height;
		const newSize = this.orientAtion === OrientAtion.HORIZONTAL ? width : height;

		this.pAneItems.forEAch((pAne, index) => {
			pAne.pAne.orthogonAlSize = newOrthogonAlSize;
			pAne.pAne.orientAtion = this.orientAtion;

			const viewSize = this.size === 0 ? 0 : (newSize * pAneSizes[index]) / this.size;
			this.splitview.AddView(pAne.pAne, viewSize, index);
		});

		this.size = newSize;
		this.orthogonAlSize = newOrthogonAlSize;

		this.splitview.lAyout(this.size);
	}

	privAte setupAnimAtion(): void {
		if (typeof this.AnimAtionTimer === 'number') {
			window.cleArTimeout(this.AnimAtionTimer);
		}

		this.el.clAssList.Add('AnimAted');

		this.AnimAtionTimer = window.setTimeout(() => {
			this.AnimAtionTimer = undefined;
			this.el.clAssList.remove('AnimAted');
		}, 200);
	}

	dispose(): void {
		super.dispose();

		this.pAneItems.forEAch(i => i.disposAble.dispose());
	}
}
