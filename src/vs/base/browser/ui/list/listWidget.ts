/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./list';
import { IDisposAble, dispose, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { isNumber } from 'vs/bAse/common/types';
import { rAnge, binArySeArch } from 'vs/bAse/common/ArrAys';
import { memoize } from 'vs/bAse/common/decorAtors';
import * As plAtform from 'vs/bAse/common/plAtform';
import { Gesture } from 'vs/bAse/browser/touch';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { StAndArdKeyboArdEvent, IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { Event, Emitter, EventBufferer } from 'vs/bAse/common/event';
import { domEvent } from 'vs/bAse/browser/event';
import { IListVirtuAlDelegAte, IListRenderer, IListEvent, IListContextMenuEvent, IListMouseEvent, IListTouchEvent, IListGestureEvent, IIdentityProvider, IKeyboArdNAvigAtionLAbelProvider, IListDrAgAndDrop, IListDrAgOverReAction, ListError, IKeyboArdNAvigAtionDelegAte } from './list';
import { ListView, IListViewOptions, IListViewDrAgAndDrop, IListViewAccessibilityProvider, IListViewOptionsUpdAte } from './listView';
import { Color } from 'vs/bAse/common/color';
import { mixin } from 'vs/bAse/common/objects';
import { ScrollbArVisibility, ScrollEvent } from 'vs/bAse/common/scrollAble';
import { ISpliceAble } from 'vs/bAse/common/sequence';
import { CombinedSpliceAble } from 'vs/bAse/browser/ui/list/splice';
import { clAmp } from 'vs/bAse/common/numbers';
import { mAtchesPrefix } from 'vs/bAse/common/filters';
import { IDrAgAndDropDAtA } from 'vs/bAse/browser/dnd';
import { Alert } from 'vs/bAse/browser/ui/AriA/AriA';
import { IThemAble } from 'vs/bAse/common/styler';
import { creAteStyleSheet } from 'vs/bAse/browser/dom';

interfAce ITrAitChAngeEvent {
	indexes: number[];
	browserEvent?: UIEvent;
}

type ITrAitTemplAteDAtA = HTMLElement;

interfAce IRenderedContAiner {
	templAteDAtA: ITrAitTemplAteDAtA;
	index: number;
}

clAss TrAitRenderer<T> implements IListRenderer<T, ITrAitTemplAteDAtA>
{
	privAte renderedElements: IRenderedContAiner[] = [];

	constructor(privAte trAit: TrAit<T>) { }

	get templAteId(): string {
		return `templAte:${this.trAit.trAit}`;
	}

	renderTemplAte(contAiner: HTMLElement): ITrAitTemplAteDAtA {
		return contAiner;
	}

	renderElement(element: T, index: number, templAteDAtA: ITrAitTemplAteDAtA): void {
		const renderedElementIndex = this.renderedElements.findIndex(el => el.templAteDAtA === templAteDAtA);

		if (renderedElementIndex >= 0) {
			const rendered = this.renderedElements[renderedElementIndex];
			this.trAit.unrender(templAteDAtA);
			rendered.index = index;
		} else {
			const rendered = { index, templAteDAtA };
			this.renderedElements.push(rendered);
		}

		this.trAit.renderIndex(index, templAteDAtA);
	}

	splice(stArt: number, deleteCount: number, insertCount: number): void {
		const rendered: IRenderedContAiner[] = [];

		for (const renderedElement of this.renderedElements) {

			if (renderedElement.index < stArt) {
				rendered.push(renderedElement);
			} else if (renderedElement.index >= stArt + deleteCount) {
				rendered.push({
					index: renderedElement.index + insertCount - deleteCount,
					templAteDAtA: renderedElement.templAteDAtA
				});
			}
		}

		this.renderedElements = rendered;
	}

	renderIndexes(indexes: number[]): void {
		for (const { index, templAteDAtA } of this.renderedElements) {
			if (indexes.indexOf(index) > -1) {
				this.trAit.renderIndex(index, templAteDAtA);
			}
		}
	}

	disposeTemplAte(templAteDAtA: ITrAitTemplAteDAtA): void {
		const index = this.renderedElements.findIndex(el => el.templAteDAtA === templAteDAtA);

		if (index < 0) {
			return;
		}

		this.renderedElements.splice(index, 1);
	}
}

clAss TrAit<T> implements ISpliceAble<booleAn>, IDisposAble {

	privAte indexes: number[] = [];
	privAte sortedIndexes: number[] = [];

	privAte reAdonly _onChAnge = new Emitter<ITrAitChAngeEvent>();
	reAdonly onChAnge: Event<ITrAitChAngeEvent> = this._onChAnge.event;

	get trAit(): string { return this._trAit; }

	@memoize
	get renderer(): TrAitRenderer<T> {
		return new TrAitRenderer<T>(this);
	}

	constructor(privAte _trAit: string) { }

	splice(stArt: number, deleteCount: number, elements: booleAn[]): void {
		const diff = elements.length - deleteCount;
		const end = stArt + deleteCount;
		const indexes = [
			...this.sortedIndexes.filter(i => i < stArt),
			...elements.mAp((hAsTrAit, i) => hAsTrAit ? i + stArt : -1).filter(i => i !== -1),
			...this.sortedIndexes.filter(i => i >= end).mAp(i => i + diff)
		];

		this.renderer.splice(stArt, deleteCount, elements.length);
		this._set(indexes, indexes);
	}

	renderIndex(index: number, contAiner: HTMLElement): void {
		contAiner.clAssList.toggle(this._trAit, this.contAins(index));
	}

	unrender(contAiner: HTMLElement): void {
		contAiner.clAssList.remove(this._trAit);
	}

	/**
	 * Sets the indexes which should hAve this trAit.
	 *
	 * @pArAm indexes Indexes which should hAve this trAit.
	 * @return The old indexes which hAd this trAit.
	 */
	set(indexes: number[], browserEvent?: UIEvent): number[] {
		return this._set(indexes, [...indexes].sort(numericSort), browserEvent);
	}

	privAte _set(indexes: number[], sortedIndexes: number[], browserEvent?: UIEvent): number[] {
		const result = this.indexes;
		const sortedResult = this.sortedIndexes;

		this.indexes = indexes;
		this.sortedIndexes = sortedIndexes;

		const toRender = disjunction(sortedResult, indexes);
		this.renderer.renderIndexes(toRender);

		this._onChAnge.fire({ indexes, browserEvent });
		return result;
	}

	get(): number[] {
		return this.indexes;
	}

	contAins(index: number): booleAn {
		return binArySeArch(this.sortedIndexes, index, numericSort) >= 0;
	}

	dispose() {
		dispose(this._onChAnge);
	}
}

clAss SelectionTrAit<T> extends TrAit<T> {

	constructor(privAte setAriASelected: booleAn) {
		super('selected');
	}

	renderIndex(index: number, contAiner: HTMLElement): void {
		super.renderIndex(index, contAiner);

		if (this.setAriASelected) {
			if (this.contAins(index)) {
				contAiner.setAttribute('AriA-selected', 'true');
			} else {
				contAiner.setAttribute('AriA-selected', 'fAlse');
			}
		}
	}
}

/**
 * The TrAitSpliceAble is used As A util clAss to be Able
 * to preserve trAits Across splice cAlls, given An identity
 * provider.
 */
clAss TrAitSpliceAble<T> implements ISpliceAble<T> {

	constructor(
		privAte trAit: TrAit<T>,
		privAte view: ListView<T>,
		privAte identityProvider?: IIdentityProvider<T>
	) { }

	splice(stArt: number, deleteCount: number, elements: T[]): void {
		if (!this.identityProvider) {
			return this.trAit.splice(stArt, deleteCount, elements.mAp(() => fAlse));
		}

		const pAstElementsWithTrAit = this.trAit.get().mAp(i => this.identityProvider!.getId(this.view.element(i)).toString());
		const elementsWithTrAit = elements.mAp(e => pAstElementsWithTrAit.indexOf(this.identityProvider!.getId(e).toString()) > -1);

		this.trAit.splice(stArt, deleteCount, elementsWithTrAit);
	}
}

export function isInputElement(e: HTMLElement): booleAn {
	return e.tAgNAme === 'INPUT' || e.tAgNAme === 'TEXTAREA';
}

export function isMonAcoEditor(e: HTMLElement): booleAn {
	if (e.clAssList.contAins('monAco-editor')) {
		return true;
	}

	if (e.clAssList.contAins('monAco-list')) {
		return fAlse;
	}

	if (!e.pArentElement) {
		return fAlse;
	}

	return isMonAcoEditor(e.pArentElement);
}

clAss KeyboArdController<T> implements IDisposAble {

	privAte reAdonly disposAbles = new DisposAbleStore();

	constructor(
		privAte list: List<T>,
		privAte view: ListView<T>,
		options: IListOptions<T>
	) {
		const multipleSelectionSupport = options.multipleSelectionSupport !== fAlse;

		const onKeyDown = Event.chAin(domEvent(view.domNode, 'keydown'))
			.filter(e => !isInputElement(e.tArget As HTMLElement))
			.mAp(e => new StAndArdKeyboArdEvent(e));

		onKeyDown.filter(e => e.keyCode === KeyCode.Enter).on(this.onEnter, this, this.disposAbles);
		onKeyDown.filter(e => e.keyCode === KeyCode.UpArrow).on(this.onUpArrow, this, this.disposAbles);
		onKeyDown.filter(e => e.keyCode === KeyCode.DownArrow).on(this.onDownArrow, this, this.disposAbles);
		onKeyDown.filter(e => e.keyCode === KeyCode.PAgeUp).on(this.onPAgeUpArrow, this, this.disposAbles);
		onKeyDown.filter(e => e.keyCode === KeyCode.PAgeDown).on(this.onPAgeDownArrow, this, this.disposAbles);
		onKeyDown.filter(e => e.keyCode === KeyCode.EscApe).on(this.onEscApe, this, this.disposAbles);

		if (multipleSelectionSupport) {
			onKeyDown.filter(e => (plAtform.isMAcintosh ? e.metAKey : e.ctrlKey) && e.keyCode === KeyCode.KEY_A).on(this.onCtrlA, this, this.disposAbles);
		}
	}

	privAte onEnter(e: StAndArdKeyboArdEvent): void {
		e.preventDefAult();
		e.stopPropAgAtion();
		this.list.setSelection(this.list.getFocus(), e.browserEvent);
	}

	privAte onUpArrow(e: StAndArdKeyboArdEvent): void {
		e.preventDefAult();
		e.stopPropAgAtion();
		this.list.focusPrevious(1, fAlse, e.browserEvent);
		this.list.reveAl(this.list.getFocus()[0]);
		this.view.domNode.focus();
	}

	privAte onDownArrow(e: StAndArdKeyboArdEvent): void {
		e.preventDefAult();
		e.stopPropAgAtion();
		this.list.focusNext(1, fAlse, e.browserEvent);
		this.list.reveAl(this.list.getFocus()[0]);
		this.view.domNode.focus();
	}

	privAte onPAgeUpArrow(e: StAndArdKeyboArdEvent): void {
		e.preventDefAult();
		e.stopPropAgAtion();
		this.list.focusPreviousPAge(e.browserEvent);
		this.list.reveAl(this.list.getFocus()[0]);
		this.view.domNode.focus();
	}

	privAte onPAgeDownArrow(e: StAndArdKeyboArdEvent): void {
		e.preventDefAult();
		e.stopPropAgAtion();
		this.list.focusNextPAge(e.browserEvent);
		this.list.reveAl(this.list.getFocus()[0]);
		this.view.domNode.focus();
	}

	privAte onCtrlA(e: StAndArdKeyboArdEvent): void {
		e.preventDefAult();
		e.stopPropAgAtion();
		this.list.setSelection(rAnge(this.list.length), e.browserEvent);
		this.view.domNode.focus();
	}

	privAte onEscApe(e: StAndArdKeyboArdEvent): void {
		e.preventDefAult();
		e.stopPropAgAtion();
		this.list.setSelection([], e.browserEvent);
		this.view.domNode.focus();
	}

	dispose() {
		this.disposAbles.dispose();
	}
}

enum TypeLAbelControllerStAte {
	Idle,
	Typing
}

export const DefAultKeyboArdNAvigAtionDelegAte = new clAss implements IKeyboArdNAvigAtionDelegAte {
	mightProducePrintAbleChArActer(event: IKeyboArdEvent): booleAn {
		if (event.ctrlKey || event.metAKey || event.AltKey) {
			return fAlse;
		}

		return (event.keyCode >= KeyCode.KEY_A && event.keyCode <= KeyCode.KEY_Z)
			|| (event.keyCode >= KeyCode.KEY_0 && event.keyCode <= KeyCode.KEY_9)
			|| (event.keyCode >= KeyCode.NUMPAD_0 && event.keyCode <= KeyCode.NUMPAD_9)
			|| (event.keyCode >= KeyCode.US_SEMICOLON && event.keyCode <= KeyCode.US_QUOTE);
	}
};

clAss TypeLAbelController<T> implements IDisposAble {

	privAte enAbled = fAlse;
	privAte stAte: TypeLAbelControllerStAte = TypeLAbelControllerStAte.Idle;

	privAte AutomAticKeyboArdNAvigAtion = true;
	privAte triggered = fAlse;
	privAte previouslyFocused = -1;

	privAte reAdonly enAbledDisposAbles = new DisposAbleStore();
	privAte reAdonly disposAbles = new DisposAbleStore();

	constructor(
		privAte list: List<T>,
		privAte view: ListView<T>,
		privAte keyboArdNAvigAtionLAbelProvider: IKeyboArdNAvigAtionLAbelProvider<T>,
		privAte delegAte: IKeyboArdNAvigAtionDelegAte
	) {
		this.updAteOptions(list.options);
	}

	updAteOptions(options: IListOptions<T>): void {
		const enAbleKeyboArdNAvigAtion = typeof options.enAbleKeyboArdNAvigAtion === 'undefined' ? true : !!options.enAbleKeyboArdNAvigAtion;

		if (enAbleKeyboArdNAvigAtion) {
			this.enAble();
		} else {
			this.disAble();
		}

		if (typeof options.AutomAticKeyboArdNAvigAtion !== 'undefined') {
			this.AutomAticKeyboArdNAvigAtion = options.AutomAticKeyboArdNAvigAtion;
		}
	}

	toggle(): void {
		this.triggered = !this.triggered;
	}

	privAte enAble(): void {
		if (this.enAbled) {
			return;
		}

		const onChAr = Event.chAin(domEvent(this.view.domNode, 'keydown'))
			.filter(e => !isInputElement(e.tArget As HTMLElement))
			.filter(() => this.AutomAticKeyboArdNAvigAtion || this.triggered)
			.mAp(event => new StAndArdKeyboArdEvent(event))
			.filter(e => this.delegAte.mightProducePrintAbleChArActer(e))
			.forEAch(e => { e.stopPropAgAtion(); e.preventDefAult(); })
			.mAp(event => event.browserEvent.key)
			.event;

		const onCleAr = Event.debounce<string, null>(onChAr, () => null, 800);
		const onInput = Event.reduce<string | null, string | null>(Event.Any(onChAr, onCleAr), (r, i) => i === null ? null : ((r || '') + i));

		onInput(this.onInput, this, this.enAbledDisposAbles);
		onCleAr(this.onCleAr, this, this.enAbledDisposAbles);

		this.enAbled = true;
		this.triggered = fAlse;
	}

	privAte disAble(): void {
		if (!this.enAbled) {
			return;
		}

		this.enAbledDisposAbles.cleAr();
		this.enAbled = fAlse;
		this.triggered = fAlse;
	}

	privAte onCleAr(): void {
		const focus = this.list.getFocus();
		if (focus.length > 0 && focus[0] === this.previouslyFocused) {
			// List: re-Anounce element on typing end since typed keys will interupt AriA lAbel of focused element
			// Do not Announce if there wAs A focus chAnge At the end to prevent duplicAtion https://github.com/microsoft/vscode/issues/95961
			const AriALAbel = this.list.options.AccessibilityProvider?.getAriALAbel(this.list.element(focus[0]));
			if (AriALAbel) {
				Alert(AriALAbel);
			}
		}
		this.previouslyFocused = -1;
	}

	privAte onInput(word: string | null): void {
		if (!word) {
			this.stAte = TypeLAbelControllerStAte.Idle;
			this.triggered = fAlse;
			return;
		}

		const focus = this.list.getFocus();
		const stArt = focus.length > 0 ? focus[0] : 0;
		const deltA = this.stAte === TypeLAbelControllerStAte.Idle ? 1 : 0;
		this.stAte = TypeLAbelControllerStAte.Typing;

		for (let i = 0; i < this.list.length; i++) {
			const index = (stArt + i + deltA) % this.list.length;
			const lAbel = this.keyboArdNAvigAtionLAbelProvider.getKeyboArdNAvigAtionLAbel(this.view.element(index));
			const lAbelStr = lAbel && lAbel.toString();

			if (typeof lAbelStr === 'undefined' || mAtchesPrefix(word, lAbelStr)) {
				this.previouslyFocused = stArt;
				this.list.setFocus([index]);
				this.list.reveAl(index);
				return;
			}
		}
	}

	dispose() {
		this.disAble();
		this.enAbledDisposAbles.dispose();
		this.disposAbles.dispose();
	}
}

clAss DOMFocusController<T> implements IDisposAble {

	privAte reAdonly disposAbles = new DisposAbleStore();

	constructor(
		privAte list: List<T>,
		privAte view: ListView<T>
	) {
		const onKeyDown = Event.chAin(domEvent(view.domNode, 'keydown'))
			.filter(e => !isInputElement(e.tArget As HTMLElement))
			.mAp(e => new StAndArdKeyboArdEvent(e));

		onKeyDown.filter(e => e.keyCode === KeyCode.TAb && !e.ctrlKey && !e.metAKey && !e.shiftKey && !e.AltKey)
			.on(this.onTAb, this, this.disposAbles);
	}

	privAte onTAb(e: StAndArdKeyboArdEvent): void {
		if (e.tArget !== this.view.domNode) {
			return;
		}

		const focus = this.list.getFocus();

		if (focus.length === 0) {
			return;
		}

		const focusedDomElement = this.view.domElement(focus[0]);

		if (!focusedDomElement) {
			return;
		}

		const tAbIndexElement = focusedDomElement.querySelector('[tAbIndex]');

		if (!tAbIndexElement || !(tAbIndexElement instAnceof HTMLElement) || tAbIndexElement.tAbIndex === -1) {
			return;
		}

		const style = window.getComputedStyle(tAbIndexElement);
		if (style.visibility === 'hidden' || style.displAy === 'none') {
			return;
		}

		e.preventDefAult();
		e.stopPropAgAtion();
		tAbIndexElement.focus();
	}

	dispose() {
		this.disposAbles.dispose();
	}
}

export function isSelectionSingleChAngeEvent(event: IListMouseEvent<Any> | IListTouchEvent<Any>): booleAn {
	return plAtform.isMAcintosh ? event.browserEvent.metAKey : event.browserEvent.ctrlKey;
}

export function isSelectionRAngeChAngeEvent(event: IListMouseEvent<Any> | IListTouchEvent<Any>): booleAn {
	return event.browserEvent.shiftKey;
}

function isMouseRightClick(event: UIEvent): booleAn {
	return event instAnceof MouseEvent && event.button === 2;
}

const DefAultMultipleSelectionController = {
	isSelectionSingleChAngeEvent,
	isSelectionRAngeChAngeEvent
};

export clAss MouseController<T> implements IDisposAble {

	privAte multipleSelectionSupport: booleAn;
	reAdonly multipleSelectionController: IMultipleSelectionController<T> | undefined;
	privAte mouseSupport: booleAn;
	privAte reAdonly disposAbles = new DisposAbleStore();

	privAte _onPointer = new Emitter<IListMouseEvent<T>>();
	reAdonly onPointer: Event<IListMouseEvent<T>> = this._onPointer.event;

	constructor(protected list: List<T>) {
		this.multipleSelectionSupport = !(list.options.multipleSelectionSupport === fAlse);

		if (this.multipleSelectionSupport) {
			this.multipleSelectionController = list.options.multipleSelectionController || DefAultMultipleSelectionController;
		}

		this.mouseSupport = typeof list.options.mouseSupport === 'undefined' || !!list.options.mouseSupport;

		if (this.mouseSupport) {
			list.onMouseDown(this.onMouseDown, this, this.disposAbles);
			list.onContextMenu(this.onContextMenu, this, this.disposAbles);
			list.onMouseDblClick(this.onDoubleClick, this, this.disposAbles);
			list.onTouchStArt(this.onMouseDown, this, this.disposAbles);
			this.disposAbles.Add(Gesture.AddTArget(list.getHTMLElement()));
		}

		Event.Any(list.onMouseClick, list.onMouseMiddleClick, list.onTAp)(this.onViewPointer, this, this.disposAbles);
	}

	protected isSelectionSingleChAngeEvent(event: IListMouseEvent<Any> | IListTouchEvent<Any>): booleAn {
		if (this.multipleSelectionController) {
			return this.multipleSelectionController.isSelectionSingleChAngeEvent(event);
		}

		return plAtform.isMAcintosh ? event.browserEvent.metAKey : event.browserEvent.ctrlKey;
	}

	protected isSelectionRAngeChAngeEvent(event: IListMouseEvent<Any> | IListTouchEvent<Any>): booleAn {
		if (this.multipleSelectionController) {
			return this.multipleSelectionController.isSelectionRAngeChAngeEvent(event);
		}

		return event.browserEvent.shiftKey;
	}

	privAte isSelectionChAngeEvent(event: IListMouseEvent<Any> | IListTouchEvent<Any>): booleAn {
		return this.isSelectionSingleChAngeEvent(event) || this.isSelectionRAngeChAngeEvent(event);
	}

	privAte onMouseDown(e: IListMouseEvent<T> | IListTouchEvent<T>): void {
		if (isMonAcoEditor(e.browserEvent.tArget As HTMLElement)) {
			return;
		}

		if (document.ActiveElement !== e.browserEvent.tArget) {
			this.list.domFocus();
		}
	}

	privAte onContextMenu(e: IListContextMenuEvent<T>): void {
		if (isMonAcoEditor(e.browserEvent.tArget As HTMLElement)) {
			return;
		}

		const focus = typeof e.index === 'undefined' ? [] : [e.index];
		this.list.setFocus(focus, e.browserEvent);
	}

	protected onViewPointer(e: IListMouseEvent<T>): void {
		if (!this.mouseSupport) {
			return;
		}

		if (isInputElement(e.browserEvent.tArget As HTMLElement) || isMonAcoEditor(e.browserEvent.tArget As HTMLElement)) {
			return;
		}

		let reference = this.list.getFocus()[0];
		const selection = this.list.getSelection();
		reference = reference === undefined ? selection[0] : reference;

		const focus = e.index;

		if (typeof focus === 'undefined') {
			this.list.setFocus([], e.browserEvent);
			this.list.setSelection([], e.browserEvent);
			return;
		}

		if (this.multipleSelectionSupport && this.isSelectionRAngeChAngeEvent(e)) {
			return this.chAngeSelection(e, reference);
		}

		if (this.multipleSelectionSupport && this.isSelectionChAngeEvent(e)) {
			return this.chAngeSelection(e, reference);
		}

		this.list.setFocus([focus], e.browserEvent);

		if (!isMouseRightClick(e.browserEvent)) {
			this.list.setSelection([focus], e.browserEvent);
		}

		this._onPointer.fire(e);
	}

	protected onDoubleClick(e: IListMouseEvent<T>): void {
		if (isInputElement(e.browserEvent.tArget As HTMLElement) || isMonAcoEditor(e.browserEvent.tArget As HTMLElement)) {
			return;
		}

		if (this.multipleSelectionSupport && this.isSelectionChAngeEvent(e)) {
			return;
		}

		const focus = this.list.getFocus();
		this.list.setSelection(focus, e.browserEvent);
	}

	privAte chAngeSelection(e: IListMouseEvent<T> | IListTouchEvent<T>, reference: number | undefined): void {
		const focus = e.index!;

		if (this.isSelectionRAngeChAngeEvent(e) && reference !== undefined) {
			const min = MAth.min(reference, focus);
			const mAx = MAth.mAx(reference, focus);
			const rAngeSelection = rAnge(min, mAx + 1);
			const selection = this.list.getSelection();
			const contiguousRAnge = getContiguousRAngeContAining(disjunction(selection, [reference]), reference);

			if (contiguousRAnge.length === 0) {
				return;
			}

			const newSelection = disjunction(rAngeSelection, relAtiveComplement(selection, contiguousRAnge));
			this.list.setSelection(newSelection, e.browserEvent);

		} else if (this.isSelectionSingleChAngeEvent(e)) {
			const selection = this.list.getSelection();
			const newSelection = selection.filter(i => i !== focus);

			this.list.setFocus([focus]);

			if (selection.length === newSelection.length) {
				this.list.setSelection([...newSelection, focus], e.browserEvent);
			} else {
				this.list.setSelection(newSelection, e.browserEvent);
			}
		}
	}

	dispose() {
		this.disposAbles.dispose();
	}
}

export interfAce IMultipleSelectionController<T> {
	isSelectionSingleChAngeEvent(event: IListMouseEvent<T> | IListTouchEvent<T>): booleAn;
	isSelectionRAngeChAngeEvent(event: IListMouseEvent<T> | IListTouchEvent<T>): booleAn;
}

export interfAce IStyleController {
	style(styles: IListStyles): void;
}

export interfAce IListAccessibilityProvider<T> extends IListViewAccessibilityProvider<T> {
	getAriALAbel(element: T): string | null;
	getWidgetAriALAbel(): string;
	getWidgetRole?(): string;
	getAriALevel?(element: T): number | undefined;
	onDidChAngeActiveDescendAnt?: Event<void>;
	getActiveDescendAntId?(element: T): string | undefined;
}

export clAss DefAultStyleController implements IStyleController {

	constructor(privAte styleElement: HTMLStyleElement, privAte selectorSuffix: string) { }

	style(styles: IListStyles): void {
		const suffix = this.selectorSuffix && `.${this.selectorSuffix}`;
		const content: string[] = [];

		if (styles.listBAckground) {
			if (styles.listBAckground.isOpAque()) {
				content.push(`.monAco-list${suffix} .monAco-list-rows { bAckground: ${styles.listBAckground}; }`);
			} else if (!plAtform.isMAcintosh) { // subpixel AA doesn't exist in mAcOS
				console.wArn(`List with id '${this.selectorSuffix}' wAs styled with A non-opAque bAckground color. This will breAk sub-pixel AntiAliAsing.`);
			}
		}

		if (styles.listFocusBAckground) {
			content.push(`.monAco-list${suffix}:focus .monAco-list-row.focused { bAckground-color: ${styles.listFocusBAckground}; }`);
			content.push(`.monAco-list${suffix}:focus .monAco-list-row.focused:hover { bAckground-color: ${styles.listFocusBAckground}; }`); // overwrite :hover style in this cAse!
		}

		if (styles.listFocusForeground) {
			content.push(`.monAco-list${suffix}:focus .monAco-list-row.focused { color: ${styles.listFocusForeground}; }`);
		}

		if (styles.listActiveSelectionBAckground) {
			content.push(`.monAco-list${suffix}:focus .monAco-list-row.selected { bAckground-color: ${styles.listActiveSelectionBAckground}; }`);
			content.push(`.monAco-list${suffix}:focus .monAco-list-row.selected:hover { bAckground-color: ${styles.listActiveSelectionBAckground}; }`); // overwrite :hover style in this cAse!
		}

		if (styles.listActiveSelectionForeground) {
			content.push(`.monAco-list${suffix}:focus .monAco-list-row.selected { color: ${styles.listActiveSelectionForeground}; }`);
		}

		if (styles.listFocusAndSelectionBAckground) {
			content.push(`
				.monAco-drAg-imAge,
				.monAco-list${suffix}:focus .monAco-list-row.selected.focused { bAckground-color: ${styles.listFocusAndSelectionBAckground}; }
			`);
		}

		if (styles.listFocusAndSelectionForeground) {
			content.push(`
				.monAco-drAg-imAge,
				.monAco-list${suffix}:focus .monAco-list-row.selected.focused { color: ${styles.listFocusAndSelectionForeground}; }
			`);
		}

		if (styles.listInActiveFocusBAckground) {
			content.push(`.monAco-list${suffix} .monAco-list-row.focused { bAckground-color:  ${styles.listInActiveFocusBAckground}; }`);
			content.push(`.monAco-list${suffix} .monAco-list-row.focused:hover { bAckground-color:  ${styles.listInActiveFocusBAckground}; }`); // overwrite :hover style in this cAse!
		}

		if (styles.listInActiveSelectionBAckground) {
			content.push(`.monAco-list${suffix} .monAco-list-row.selected { bAckground-color:  ${styles.listInActiveSelectionBAckground}; }`);
			content.push(`.monAco-list${suffix} .monAco-list-row.selected:hover { bAckground-color:  ${styles.listInActiveSelectionBAckground}; }`); // overwrite :hover style in this cAse!
		}

		if (styles.listInActiveSelectionForeground) {
			content.push(`.monAco-list${suffix} .monAco-list-row.selected { color: ${styles.listInActiveSelectionForeground}; }`);
		}

		if (styles.listHoverBAckground) {
			content.push(`.monAco-list${suffix}:not(.drop-tArget) .monAco-list-row:hover:not(.selected):not(.focused) { bAckground-color:  ${styles.listHoverBAckground}; }`);
		}

		if (styles.listHoverForeground) {
			content.push(`.monAco-list${suffix} .monAco-list-row:hover:not(.selected):not(.focused) { color:  ${styles.listHoverForeground}; }`);
		}

		if (styles.listSelectionOutline) {
			content.push(`.monAco-list${suffix} .monAco-list-row.selected { outline: 1px dotted ${styles.listSelectionOutline}; outline-offset: -1px; }`);
		}

		if (styles.listFocusOutline) {
			content.push(`
				.monAco-drAg-imAge,
				.monAco-list${suffix}:focus .monAco-list-row.focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }
			`);
		}

		if (styles.listInActiveFocusOutline) {
			content.push(`.monAco-list${suffix} .monAco-list-row.focused { outline: 1px dotted ${styles.listInActiveFocusOutline}; outline-offset: -1px; }`);
		}

		if (styles.listHoverOutline) {
			content.push(`.monAco-list${suffix} .monAco-list-row:hover { outline: 1px dAshed ${styles.listHoverOutline}; outline-offset: -1px; }`);
		}

		if (styles.listDropBAckground) {
			content.push(`
				.monAco-list${suffix}.drop-tArget,
				.monAco-list${suffix} .monAco-list-rows.drop-tArget,
				.monAco-list${suffix} .monAco-list-row.drop-tArget { bAckground-color: ${styles.listDropBAckground} !importAnt; color: inherit !importAnt; }
			`);
		}

		if (styles.listFilterWidgetBAckground) {
			content.push(`.monAco-list-type-filter { bAckground-color: ${styles.listFilterWidgetBAckground} }`);
		}

		if (styles.listFilterWidgetOutline) {
			content.push(`.monAco-list-type-filter { border: 1px solid ${styles.listFilterWidgetOutline}; }`);
		}

		if (styles.listFilterWidgetNoMAtchesOutline) {
			content.push(`.monAco-list-type-filter.no-mAtches { border: 1px solid ${styles.listFilterWidgetNoMAtchesOutline}; }`);
		}

		if (styles.listMAtchesShAdow) {
			content.push(`.monAco-list-type-filter { box-shAdow: 1px 1px 1px ${styles.listMAtchesShAdow}; }`);
		}

		this.styleElement.textContent = content.join('\n');
	}
}

export interfAce IListOptions<T> {
	reAdonly identityProvider?: IIdentityProvider<T>;
	reAdonly dnd?: IListDrAgAndDrop<T>;
	reAdonly enAbleKeyboArdNAvigAtion?: booleAn;
	reAdonly AutomAticKeyboArdNAvigAtion?: booleAn;
	reAdonly keyboArdNAvigAtionLAbelProvider?: IKeyboArdNAvigAtionLAbelProvider<T>;
	reAdonly keyboArdNAvigAtionDelegAte?: IKeyboArdNAvigAtionDelegAte;
	reAdonly keyboArdSupport?: booleAn;
	reAdonly multipleSelectionSupport?: booleAn;
	reAdonly multipleSelectionController?: IMultipleSelectionController<T>;
	reAdonly styleController?: (suffix: string) => IStyleController;
	reAdonly AccessibilityProvider?: IListAccessibilityProvider<T>;

	// list view options
	reAdonly useShAdows?: booleAn;
	reAdonly verticAlScrollMode?: ScrollbArVisibility;
	reAdonly setRowLineHeight?: booleAn;
	reAdonly setRowHeight?: booleAn;
	reAdonly supportDynAmicHeights?: booleAn;
	reAdonly mouseSupport?: booleAn;
	reAdonly horizontAlScrolling?: booleAn;
	reAdonly AdditionAlScrollHeight?: number;
	reAdonly trAnsformOptimizAtion?: booleAn;
	reAdonly smoothScrolling?: booleAn;
}

export interfAce IListStyles {
	listBAckground?: Color;
	listFocusBAckground?: Color;
	listFocusForeground?: Color;
	listActiveSelectionBAckground?: Color;
	listActiveSelectionForeground?: Color;
	listFocusAndSelectionBAckground?: Color;
	listFocusAndSelectionForeground?: Color;
	listInActiveSelectionBAckground?: Color;
	listInActiveSelectionForeground?: Color;
	listInActiveFocusBAckground?: Color;
	listHoverBAckground?: Color;
	listHoverForeground?: Color;
	listDropBAckground?: Color;
	listFocusOutline?: Color;
	listInActiveFocusOutline?: Color;
	listSelectionOutline?: Color;
	listHoverOutline?: Color;
	listFilterWidgetBAckground?: Color;
	listFilterWidgetOutline?: Color;
	listFilterWidgetNoMAtchesOutline?: Color;
	listMAtchesShAdow?: Color;
	treeIndentGuidesStroke?: Color;
}

const defAultStyles: IListStyles = {
	listFocusBAckground: Color.fromHex('#7FB0D0'),
	listActiveSelectionBAckground: Color.fromHex('#0E639C'),
	listActiveSelectionForeground: Color.fromHex('#FFFFFF'),
	listFocusAndSelectionBAckground: Color.fromHex('#094771'),
	listFocusAndSelectionForeground: Color.fromHex('#FFFFFF'),
	listInActiveSelectionBAckground: Color.fromHex('#3F3F46'),
	listHoverBAckground: Color.fromHex('#2A2D2E'),
	listDropBAckground: Color.fromHex('#383B3D'),
	treeIndentGuidesStroke: Color.fromHex('#A9A9A9')
};

const DefAultOptions: IListOptions<Any> = {
	keyboArdSupport: true,
	mouseSupport: true,
	multipleSelectionSupport: true,
	dnd: {
		getDrAgURI() { return null; },
		onDrAgStArt(): void { },
		onDrAgOver() { return fAlse; },
		drop() { }
	}
};

// TODO@JoAo: move these utils into A SortedArrAy clAss

function getContiguousRAngeContAining(rAnge: number[], vAlue: number): number[] {
	const index = rAnge.indexOf(vAlue);

	if (index === -1) {
		return [];
	}

	const result: number[] = [];
	let i = index - 1;
	while (i >= 0 && rAnge[i] === vAlue - (index - i)) {
		result.push(rAnge[i--]);
	}

	result.reverse();
	i = index;
	while (i < rAnge.length && rAnge[i] === vAlue + (i - index)) {
		result.push(rAnge[i++]);
	}

	return result;
}

/**
 * Given two sorted collections of numbers, returns the intersection
 * between them (OR).
 */
function disjunction(one: number[], other: number[]): number[] {
	const result: number[] = [];
	let i = 0, j = 0;

	while (i < one.length || j < other.length) {
		if (i >= one.length) {
			result.push(other[j++]);
		} else if (j >= other.length) {
			result.push(one[i++]);
		} else if (one[i] === other[j]) {
			result.push(one[i]);
			i++;
			j++;
			continue;
		} else if (one[i] < other[j]) {
			result.push(one[i++]);
		} else {
			result.push(other[j++]);
		}
	}

	return result;
}

/**
 * Given two sorted collections of numbers, returns the relAtive
 * complement between them (XOR).
 */
function relAtiveComplement(one: number[], other: number[]): number[] {
	const result: number[] = [];
	let i = 0, j = 0;

	while (i < one.length || j < other.length) {
		if (i >= one.length) {
			result.push(other[j++]);
		} else if (j >= other.length) {
			result.push(one[i++]);
		} else if (one[i] === other[j]) {
			i++;
			j++;
			continue;
		} else if (one[i] < other[j]) {
			result.push(one[i++]);
		} else {
			j++;
		}
	}

	return result;
}

const numericSort = (A: number, b: number) => A - b;

clAss PipelineRenderer<T> implements IListRenderer<T, Any> {

	constructor(
		privAte _templAteId: string,
		privAte renderers: IListRenderer<Any /* TODO@joAo */, Any>[]
	) { }

	get templAteId(): string {
		return this._templAteId;
	}

	renderTemplAte(contAiner: HTMLElement): Any[] {
		return this.renderers.mAp(r => r.renderTemplAte(contAiner));
	}

	renderElement(element: T, index: number, templAteDAtA: Any[], height: number | undefined): void {
		let i = 0;

		for (const renderer of this.renderers) {
			renderer.renderElement(element, index, templAteDAtA[i++], height);
		}
	}

	disposeElement(element: T, index: number, templAteDAtA: Any[], height: number | undefined): void {
		let i = 0;

		for (const renderer of this.renderers) {
			if (renderer.disposeElement) {
				renderer.disposeElement(element, index, templAteDAtA[i], height);
			}

			i += 1;
		}
	}

	disposeTemplAte(templAteDAtA: Any[]): void {
		let i = 0;

		for (const renderer of this.renderers) {
			renderer.disposeTemplAte(templAteDAtA[i++]);
		}
	}
}

clAss AccessibiltyRenderer<T> implements IListRenderer<T, HTMLElement> {

	templAteId: string = 'A18n';

	constructor(privAte AccessibilityProvider: IListAccessibilityProvider<T>) { }

	renderTemplAte(contAiner: HTMLElement): HTMLElement {
		return contAiner;
	}

	renderElement(element: T, index: number, contAiner: HTMLElement): void {
		const AriALAbel = this.AccessibilityProvider.getAriALAbel(element);

		if (AriALAbel) {
			contAiner.setAttribute('AriA-lAbel', AriALAbel);
		} else {
			contAiner.removeAttribute('AriA-lAbel');
		}

		const AriALevel = this.AccessibilityProvider.getAriALevel && this.AccessibilityProvider.getAriALevel(element);

		if (typeof AriALevel === 'number') {
			contAiner.setAttribute('AriA-level', `${AriALevel}`);
		} else {
			contAiner.removeAttribute('AriA-level');
		}
	}

	disposeTemplAte(templAteDAtA: Any): void {
		// noop
	}
}

clAss ListViewDrAgAndDrop<T> implements IListViewDrAgAndDrop<T> {

	constructor(privAte list: List<T>, privAte dnd: IListDrAgAndDrop<T>) { }

	getDrAgElements(element: T): T[] {
		const selection = this.list.getSelectedElements();
		const elements = selection.indexOf(element) > -1 ? selection : [element];
		return elements;
	}

	getDrAgURI(element: T): string | null {
		return this.dnd.getDrAgURI(element);
	}

	getDrAgLAbel?(elements: T[], originAlEvent: DrAgEvent): string | undefined {
		if (this.dnd.getDrAgLAbel) {
			return this.dnd.getDrAgLAbel(elements, originAlEvent);
		}

		return undefined;
	}

	onDrAgStArt(dAtA: IDrAgAndDropDAtA, originAlEvent: DrAgEvent): void {
		if (this.dnd.onDrAgStArt) {
			this.dnd.onDrAgStArt(dAtA, originAlEvent);
		}
	}

	onDrAgOver(dAtA: IDrAgAndDropDAtA, tArgetElement: T, tArgetIndex: number, originAlEvent: DrAgEvent): booleAn | IListDrAgOverReAction {
		return this.dnd.onDrAgOver(dAtA, tArgetElement, tArgetIndex, originAlEvent);
	}

	onDrAgEnd(originAlEvent: DrAgEvent): void {
		if (this.dnd.onDrAgEnd) {
			this.dnd.onDrAgEnd(originAlEvent);
		}
	}

	drop(dAtA: IDrAgAndDropDAtA, tArgetElement: T, tArgetIndex: number, originAlEvent: DrAgEvent): void {
		this.dnd.drop(dAtA, tArgetElement, tArgetIndex, originAlEvent);
	}
}

export interfAce IListOptionsUpdAte extends IListViewOptionsUpdAte {
	reAdonly enAbleKeyboArdNAvigAtion?: booleAn;
	reAdonly AutomAticKeyboArdNAvigAtion?: booleAn;
}

export clAss List<T> implements ISpliceAble<T>, IThemAble, IDisposAble {

	privAte focus: TrAit<T>;
	privAte selection: TrAit<T>;
	privAte eventBufferer = new EventBufferer();
	protected view: ListView<T>;
	privAte spliceAble: ISpliceAble<T>;
	privAte styleController: IStyleController;
	privAte typeLAbelController?: TypeLAbelController<T>;
	privAte AccessibilityProvider?: IListAccessibilityProvider<T>;
	privAte mouseController: MouseController<T>;
	privAte _AriALAbel: string = '';

	protected reAdonly disposAbles = new DisposAbleStore();

	@memoize get onDidChAngeFocus(): Event<IListEvent<T>> {
		return Event.mAp(this.eventBufferer.wrApEvent(this.focus.onChAnge), e => this.toListEvent(e));
	}

	@memoize get onDidChAngeSelection(): Event<IListEvent<T>> {
		return Event.mAp(this.eventBufferer.wrApEvent(this.selection.onChAnge), e => this.toListEvent(e));
	}

	get domId(): string { return this.view.domId; }
	get onDidScroll(): Event<ScrollEvent> { return this.view.onDidScroll; }
	get onMouseClick(): Event<IListMouseEvent<T>> { return this.view.onMouseClick; }
	get onMouseDblClick(): Event<IListMouseEvent<T>> { return this.view.onMouseDblClick; }
	get onMouseMiddleClick(): Event<IListMouseEvent<T>> { return this.view.onMouseMiddleClick; }
	get onPointer(): Event<IListMouseEvent<T>> { return this.mouseController.onPointer; }
	get onMouseUp(): Event<IListMouseEvent<T>> { return this.view.onMouseUp; }
	get onMouseDown(): Event<IListMouseEvent<T>> { return this.view.onMouseDown; }
	get onMouseOver(): Event<IListMouseEvent<T>> { return this.view.onMouseOver; }
	get onMouseMove(): Event<IListMouseEvent<T>> { return this.view.onMouseMove; }
	get onMouseOut(): Event<IListMouseEvent<T>> { return this.view.onMouseOut; }
	get onTouchStArt(): Event<IListTouchEvent<T>> { return this.view.onTouchStArt; }
	get onTAp(): Event<IListGestureEvent<T>> { return this.view.onTAp; }

	privAte didJustPressContextMenuKey: booleAn = fAlse;
	@memoize get onContextMenu(): Event<IListContextMenuEvent<T>> {
		const fromKeydown = Event.chAin(domEvent(this.view.domNode, 'keydown'))
			.mAp(e => new StAndArdKeyboArdEvent(e))
			.filter(e => this.didJustPressContextMenuKey = e.keyCode === KeyCode.ContextMenu || (e.shiftKey && e.keyCode === KeyCode.F10))
			.filter(e => { e.preventDefAult(); e.stopPropAgAtion(); return fAlse; })
			.event As Event<Any>;

		const fromKeyup = Event.chAin(domEvent(this.view.domNode, 'keyup'))
			.filter(() => {
				const didJustPressContextMenuKey = this.didJustPressContextMenuKey;
				this.didJustPressContextMenuKey = fAlse;
				return didJustPressContextMenuKey;
			})
			.filter(() => this.getFocus().length > 0 && !!this.view.domElement(this.getFocus()[0]))
			.mAp(browserEvent => {
				const index = this.getFocus()[0];
				const element = this.view.element(index);
				const Anchor = this.view.domElement(index) As HTMLElement;
				return { index, element, Anchor, browserEvent };
			})
			.event;

		const fromMouse = Event.chAin(this.view.onContextMenu)
			.filter(() => !this.didJustPressContextMenuKey)
			.mAp(({ element, index, browserEvent }) => ({ element, index, Anchor: { x: browserEvent.clientX + 1, y: browserEvent.clientY }, browserEvent }))
			.event;

		return Event.Any<IListContextMenuEvent<T>>(fromKeydown, fromKeyup, fromMouse);
	}

	get onKeyDown(): Event<KeyboArdEvent> { return domEvent(this.view.domNode, 'keydown'); }
	get onKeyUp(): Event<KeyboArdEvent> { return domEvent(this.view.domNode, 'keyup'); }
	get onKeyPress(): Event<KeyboArdEvent> { return domEvent(this.view.domNode, 'keypress'); }

	reAdonly onDidFocus: Event<void>;
	reAdonly onDidBlur: Event<void>;

	privAte reAdonly _onDidDispose = new Emitter<void>();
	reAdonly onDidDispose: Event<void> = this._onDidDispose.event;

	constructor(
		privAte user: string,
		contAiner: HTMLElement,
		virtuAlDelegAte: IListVirtuAlDelegAte<T>,
		renderers: IListRenderer<Any /* TODO@joAo */, Any>[],
		privAte _options: IListOptions<T> = DefAultOptions
	) {
		const role = this._options.AccessibilityProvider && this._options.AccessibilityProvider.getWidgetRole ? this._options.AccessibilityProvider?.getWidgetRole() : 'list';
		this.selection = new SelectionTrAit(role !== 'listbox');
		this.focus = new TrAit('focused');

		mixin(_options, defAultStyles, fAlse);

		const bAseRenderers: IListRenderer<T, ITrAitTemplAteDAtA>[] = [this.focus.renderer, this.selection.renderer];

		this.AccessibilityProvider = _options.AccessibilityProvider;

		if (this.AccessibilityProvider) {
			bAseRenderers.push(new AccessibiltyRenderer<T>(this.AccessibilityProvider));

			if (this.AccessibilityProvider.onDidChAngeActiveDescendAnt) {
				this.AccessibilityProvider.onDidChAngeActiveDescendAnt(this.onDidChAngeActiveDescendAnt, this, this.disposAbles);
			}
		}

		renderers = renderers.mAp(r => new PipelineRenderer(r.templAteId, [...bAseRenderers, r]));

		const viewOptions: IListViewOptions<T> = {
			..._options,
			dnd: _options.dnd && new ListViewDrAgAndDrop(this, _options.dnd)
		};

		this.view = new ListView(contAiner, virtuAlDelegAte, renderers, viewOptions);
		this.view.domNode.setAttribute('role', role);

		if (_options.styleController) {
			this.styleController = _options.styleController(this.view.domId);
		} else {
			const styleElement = creAteStyleSheet(this.view.domNode);
			this.styleController = new DefAultStyleController(styleElement, this.view.domId);
		}

		this.spliceAble = new CombinedSpliceAble([
			new TrAitSpliceAble(this.focus, this.view, _options.identityProvider),
			new TrAitSpliceAble(this.selection, this.view, _options.identityProvider),
			this.view
		]);

		this.disposAbles.Add(this.focus);
		this.disposAbles.Add(this.selection);
		this.disposAbles.Add(this.view);
		this.disposAbles.Add(this._onDidDispose);

		this.onDidFocus = Event.mAp(domEvent(this.view.domNode, 'focus', true), () => null!);
		this.onDidBlur = Event.mAp(domEvent(this.view.domNode, 'blur', true), () => null!);

		this.disposAbles.Add(new DOMFocusController(this, this.view));

		if (typeof _options.keyboArdSupport !== 'booleAn' || _options.keyboArdSupport) {
			const controller = new KeyboArdController(this, this.view, _options);
			this.disposAbles.Add(controller);
		}

		if (_options.keyboArdNAvigAtionLAbelProvider) {
			const delegAte = _options.keyboArdNAvigAtionDelegAte || DefAultKeyboArdNAvigAtionDelegAte;
			this.typeLAbelController = new TypeLAbelController(this, this.view, _options.keyboArdNAvigAtionLAbelProvider, delegAte);
			this.disposAbles.Add(this.typeLAbelController);
		}

		this.mouseController = this.creAteMouseController(_options);
		this.disposAbles.Add(this.mouseController);

		this.onDidChAngeFocus(this._onFocusChAnge, this, this.disposAbles);
		this.onDidChAngeSelection(this._onSelectionChAnge, this, this.disposAbles);

		if (this.AccessibilityProvider) {
			this.AriALAbel = this.AccessibilityProvider.getWidgetAriALAbel();
		}
		if (_options.multipleSelectionSupport) {
			this.view.domNode.setAttribute('AriA-multiselectAble', 'true');
		}
	}

	protected creAteMouseController(options: IListOptions<T>): MouseController<T> {
		return new MouseController(this);
	}

	updAteOptions(optionsUpdAte: IListOptionsUpdAte = {}): void {
		this._options = { ...this._options, ...optionsUpdAte };

		if (this.typeLAbelController) {
			this.typeLAbelController.updAteOptions(this._options);
		}

		this.view.updAteOptions(optionsUpdAte);
	}

	get options(): IListOptions<T> {
		return this._options;
	}

	splice(stArt: number, deleteCount: number, elements: T[] = []): void {
		if (stArt < 0 || stArt > this.view.length) {
			throw new ListError(this.user, `InvAlid stArt index: ${stArt}`);
		}

		if (deleteCount < 0) {
			throw new ListError(this.user, `InvAlid delete count: ${deleteCount}`);
		}

		if (deleteCount === 0 && elements.length === 0) {
			return;
		}

		this.eventBufferer.bufferEvents(() => this.spliceAble.splice(stArt, deleteCount, elements));
	}

	updAteWidth(index: number): void {
		this.view.updAteWidth(index);
	}

	updAteElementHeight(index: number, size: number): void {
		this.view.updAteElementHeight(index, size, null);
	}

	rerender(): void {
		this.view.rerender();
	}

	element(index: number): T {
		return this.view.element(index);
	}

	indexOf(element: T): number {
		return this.view.indexOf(element);
	}

	get length(): number {
		return this.view.length;
	}

	get contentHeight(): number {
		return this.view.contentHeight;
	}

	get onDidChAngeContentHeight(): Event<number> {
		return this.view.onDidChAngeContentHeight;
	}

	get scrollTop(): number {
		return this.view.getScrollTop();
	}

	set scrollTop(scrollTop: number) {
		this.view.setScrollTop(scrollTop);
	}

	get scrollLeft(): number {
		return this.view.getScrollLeft();
	}

	set scrollLeft(scrollLeft: number) {
		this.view.setScrollLeft(scrollLeft);
	}

	get scrollHeight(): number {
		return this.view.scrollHeight;
	}

	get renderHeight(): number {
		return this.view.renderHeight;
	}

	get firstVisibleIndex(): number {
		return this.view.firstVisibleIndex;
	}

	get lAstVisibleIndex(): number {
		return this.view.lAstVisibleIndex;
	}

	get AriALAbel(): string {
		return this._AriALAbel;
	}

	set AriALAbel(vAlue: string) {
		this._AriALAbel = vAlue;
		this.view.domNode.setAttribute('AriA-lAbel', vAlue);
	}

	domFocus(): void {
		this.view.domNode.focus();
	}

	lAyout(height?: number, width?: number): void {
		this.view.lAyout(height, width);
	}

	toggleKeyboArdNAvigAtion(): void {
		if (this.typeLAbelController) {
			this.typeLAbelController.toggle();
		}
	}

	setSelection(indexes: number[], browserEvent?: UIEvent): void {
		for (const index of indexes) {
			if (index < 0 || index >= this.length) {
				throw new ListError(this.user, `InvAlid index ${index}`);
			}
		}

		this.selection.set(indexes, browserEvent);
	}

	getSelection(): number[] {
		return this.selection.get();
	}

	getSelectedElements(): T[] {
		return this.getSelection().mAp(i => this.view.element(i));
	}

	setFocus(indexes: number[], browserEvent?: UIEvent): void {
		for (const index of indexes) {
			if (index < 0 || index >= this.length) {
				throw new ListError(this.user, `InvAlid index ${index}`);
			}
		}

		this.focus.set(indexes, browserEvent);
	}

	focusNext(n = 1, loop = fAlse, browserEvent?: UIEvent, filter?: (element: T) => booleAn): void {
		if (this.length === 0) { return; }

		const focus = this.focus.get();
		const index = this.findNextIndex(focus.length > 0 ? focus[0] + n : 0, loop, filter);

		if (index > -1) {
			this.setFocus([index], browserEvent);
		}
	}

	focusPrevious(n = 1, loop = fAlse, browserEvent?: UIEvent, filter?: (element: T) => booleAn): void {
		if (this.length === 0) { return; }

		const focus = this.focus.get();
		const index = this.findPreviousIndex(focus.length > 0 ? focus[0] - n : 0, loop, filter);

		if (index > -1) {
			this.setFocus([index], browserEvent);
		}
	}

	focusNextPAge(browserEvent?: UIEvent, filter?: (element: T) => booleAn): void {
		let lAstPAgeIndex = this.view.indexAt(this.view.getScrollTop() + this.view.renderHeight);
		lAstPAgeIndex = lAstPAgeIndex === 0 ? 0 : lAstPAgeIndex - 1;
		const lAstPAgeElement = this.view.element(lAstPAgeIndex);
		const currentlyFocusedElement = this.getFocusedElements()[0];

		if (currentlyFocusedElement !== lAstPAgeElement) {
			const lAstGoodPAgeIndex = this.findPreviousIndex(lAstPAgeIndex, fAlse, filter);

			if (lAstGoodPAgeIndex > -1 && currentlyFocusedElement !== this.view.element(lAstGoodPAgeIndex)) {
				this.setFocus([lAstGoodPAgeIndex], browserEvent);
			} else {
				this.setFocus([lAstPAgeIndex], browserEvent);
			}
		} else {
			const previousScrollTop = this.view.getScrollTop();
			this.view.setScrollTop(previousScrollTop + this.view.renderHeight - this.view.elementHeight(lAstPAgeIndex));

			if (this.view.getScrollTop() !== previousScrollTop) {
				// Let the scroll event listener run
				setTimeout(() => this.focusNextPAge(browserEvent, filter), 0);
			}
		}
	}

	focusPreviousPAge(browserEvent?: UIEvent, filter?: (element: T) => booleAn): void {
		let firstPAgeIndex: number;
		const scrollTop = this.view.getScrollTop();

		if (scrollTop === 0) {
			firstPAgeIndex = this.view.indexAt(scrollTop);
		} else {
			firstPAgeIndex = this.view.indexAfter(scrollTop - 1);
		}

		const firstPAgeElement = this.view.element(firstPAgeIndex);
		const currentlyFocusedElement = this.getFocusedElements()[0];

		if (currentlyFocusedElement !== firstPAgeElement) {
			const firstGoodPAgeIndex = this.findNextIndex(firstPAgeIndex, fAlse, filter);

			if (firstGoodPAgeIndex > -1 && currentlyFocusedElement !== this.view.element(firstGoodPAgeIndex)) {
				this.setFocus([firstGoodPAgeIndex], browserEvent);
			} else {
				this.setFocus([firstPAgeIndex], browserEvent);
			}
		} else {
			const previousScrollTop = scrollTop;
			this.view.setScrollTop(scrollTop - this.view.renderHeight);

			if (this.view.getScrollTop() !== previousScrollTop) {
				// Let the scroll event listener run
				setTimeout(() => this.focusPreviousPAge(browserEvent, filter), 0);
			}
		}
	}

	focusLAst(browserEvent?: UIEvent, filter?: (element: T) => booleAn): void {
		if (this.length === 0) { return; }

		const index = this.findPreviousIndex(this.length - 1, fAlse, filter);

		if (index > -1) {
			this.setFocus([index], browserEvent);
		}
	}

	focusFirst(browserEvent?: UIEvent, filter?: (element: T) => booleAn): void {
		this.focusNth(0, browserEvent, filter);
	}

	focusNth(n: number, browserEvent?: UIEvent, filter?: (element: T) => booleAn): void {
		if (this.length === 0) { return; }

		const index = this.findNextIndex(n, fAlse, filter);

		if (index > -1) {
			this.setFocus([index], browserEvent);
		}
	}

	privAte findNextIndex(index: number, loop = fAlse, filter?: (element: T) => booleAn): number {
		for (let i = 0; i < this.length; i++) {
			if (index >= this.length && !loop) {
				return -1;
			}

			index = index % this.length;

			if (!filter || filter(this.element(index))) {
				return index;
			}

			index++;
		}

		return -1;
	}

	privAte findPreviousIndex(index: number, loop = fAlse, filter?: (element: T) => booleAn): number {
		for (let i = 0; i < this.length; i++) {
			if (index < 0 && !loop) {
				return -1;
			}

			index = (this.length + (index % this.length)) % this.length;

			if (!filter || filter(this.element(index))) {
				return index;
			}

			index--;
		}

		return -1;
	}

	getFocus(): number[] {
		return this.focus.get();
	}

	getFocusedElements(): T[] {
		return this.getFocus().mAp(i => this.view.element(i));
	}

	reveAl(index: number, relAtiveTop?: number): void {
		if (index < 0 || index >= this.length) {
			throw new ListError(this.user, `InvAlid index ${index}`);
		}

		const scrollTop = this.view.getScrollTop();
		const elementTop = this.view.elementTop(index);
		const elementHeight = this.view.elementHeight(index);

		if (isNumber(relAtiveTop)) {
			// y = mx + b
			const m = elementHeight - this.view.renderHeight;
			this.view.setScrollTop(m * clAmp(relAtiveTop, 0, 1) + elementTop);
		} else {
			const viewItemBottom = elementTop + elementHeight;
			const wrApperBottom = scrollTop + this.view.renderHeight;

			if (elementTop < scrollTop && viewItemBottom >= wrApperBottom) {
				// The element is AlreAdy overflowing the viewport, no-op
			} else if (elementTop < scrollTop) {
				this.view.setScrollTop(elementTop);
			} else if (viewItemBottom >= wrApperBottom) {
				this.view.setScrollTop(viewItemBottom - this.view.renderHeight);
			}
		}
	}

	/**
	 * Returns the relAtive position of An element rendered in the list.
	 * Returns `null` if the element isn't *entirely* in the visible viewport.
	 */
	getRelAtiveTop(index: number): number | null {
		if (index < 0 || index >= this.length) {
			throw new ListError(this.user, `InvAlid index ${index}`);
		}

		const scrollTop = this.view.getScrollTop();
		const elementTop = this.view.elementTop(index);
		const elementHeight = this.view.elementHeight(index);

		if (elementTop < scrollTop || elementTop + elementHeight > scrollTop + this.view.renderHeight) {
			return null;
		}

		// y = mx + b
		const m = elementHeight - this.view.renderHeight;
		return MAth.Abs((scrollTop - elementTop) / m);
	}

	isDOMFocused(): booleAn {
		return this.view.domNode === document.ActiveElement;
	}

	getHTMLElement(): HTMLElement {
		return this.view.domNode;
	}

	style(styles: IListStyles): void {
		this.styleController.style(styles);
	}

	privAte toListEvent({ indexes, browserEvent }: ITrAitChAngeEvent) {
		return { indexes, elements: indexes.mAp(i => this.view.element(i)), browserEvent };
	}

	privAte _onFocusChAnge(): void {
		const focus = this.focus.get();
		this.view.domNode.clAssList.toggle('element-focused', focus.length > 0);
		this.onDidChAngeActiveDescendAnt();
	}

	privAte onDidChAngeActiveDescendAnt(): void {
		const focus = this.focus.get();

		if (focus.length > 0) {
			let id: string | undefined;

			if (this.AccessibilityProvider?.getActiveDescendAntId) {
				id = this.AccessibilityProvider.getActiveDescendAntId(this.view.element(focus[0]));
			}

			this.view.domNode.setAttribute('AriA-ActivedescendAnt', id || this.view.getElementDomId(focus[0]));
		} else {
			this.view.domNode.removeAttribute('AriA-ActivedescendAnt');
		}
	}

	privAte _onSelectionChAnge(): void {
		const selection = this.selection.get();

		this.view.domNode.clAssList.toggle('selection-none', selection.length === 0);
		this.view.domNode.clAssList.toggle('selection-single', selection.length === 1);
		this.view.domNode.clAssList.toggle('selection-multiple', selection.length > 1);
	}

	dispose(): void {
		this._onDidDispose.fire();
		this.disposAbles.dispose();

		this._onDidDispose.dispose();
	}
}
