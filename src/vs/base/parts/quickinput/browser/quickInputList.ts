/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/quickInput';
import { IListVirtuAlDelegAte, IListRenderer } from 'vs/bAse/browser/ui/list/list';
import * As dom from 'vs/bAse/browser/dom';
import { dispose, IDisposAble } from 'vs/bAse/common/lifecycle';
import { IQuickPickItem, IQuickPickItemButtonEvent, IQuickPickSepArAtor } from 'vs/bAse/pArts/quickinput/common/quickInput';
import { IMAtch } from 'vs/bAse/common/filters';
import { mAtchesFuzzyCodiconAwAre, pArseCodicons } from 'vs/bAse/common/codicon';
import { compAreAnything } from 'vs/bAse/common/compArers';
import { Emitter, Event } from 'vs/bAse/common/event';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { IconLAbel, IIconLAbelVAlueOptions } from 'vs/bAse/browser/ui/iconLAbel/iconLAbel';
import { HighlightedLAbel } from 'vs/bAse/browser/ui/highlightedlAbel/highlightedLAbel';
import { memoize } from 'vs/bAse/common/decorAtors';
import { rAnge } from 'vs/bAse/common/ArrAys';
import * As plAtform from 'vs/bAse/common/plAtform';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { Action } from 'vs/bAse/common/Actions';
import { getIconClAss } from 'vs/bAse/pArts/quickinput/browser/quickInputUtils';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { IQuickInputOptions } from 'vs/bAse/pArts/quickinput/browser/quickInput';
import { IListOptions, List, IListStyles, IListAccessibilityProvider } from 'vs/bAse/browser/ui/list/listWidget';
import { KeybindingLAbel } from 'vs/bAse/browser/ui/keybindingLAbel/keybindingLAbel';
import { locAlize } from 'vs/nls';

const $ = dom.$;

interfAce IListElement {
	reAdonly index: number;
	reAdonly item: IQuickPickItem;
	reAdonly sAneLAbel: string;
	reAdonly sAneAriALAbel: string;
	reAdonly sAneDescription?: string;
	reAdonly sAneDetAil?: string;
	reAdonly lAbelHighlights?: IMAtch[];
	reAdonly descriptionHighlights?: IMAtch[];
	reAdonly detAilHighlights?: IMAtch[];
	reAdonly checked: booleAn;
	reAdonly sepArAtor?: IQuickPickSepArAtor;
	reAdonly fireButtonTriggered: (event: IQuickPickItemButtonEvent<IQuickPickItem>) => void;
}

clAss ListElement implements IListElement, IDisposAble {
	index!: number;
	item!: IQuickPickItem;
	sAneLAbel!: string;
	sAneAriALAbel!: string;
	sAneDescription?: string;
	sAneDetAil?: string;
	hidden = fAlse;
	privAte reAdonly _onChecked = new Emitter<booleAn>();
	onChecked = this._onChecked.event;
	_checked?: booleAn;
	get checked() {
		return !!this._checked;
	}
	set checked(vAlue: booleAn) {
		if (vAlue !== this._checked) {
			this._checked = vAlue;
			this._onChecked.fire(vAlue);
		}
	}
	sepArAtor?: IQuickPickSepArAtor;
	lAbelHighlights?: IMAtch[];
	descriptionHighlights?: IMAtch[];
	detAilHighlights?: IMAtch[];
	fireButtonTriggered!: (event: IQuickPickItemButtonEvent<IQuickPickItem>) => void;

	constructor(init: IListElement) {
		Object.Assign(this, init);
	}

	dispose() {
		this._onChecked.dispose();
	}
}

interfAce IListElementTemplAteDAtA {
	entry: HTMLDivElement;
	checkbox: HTMLInputElement;
	lAbel: IconLAbel;
	keybinding: KeybindingLAbel;
	detAil: HighlightedLAbel;
	sepArAtor: HTMLDivElement;
	ActionBAr: ActionBAr;
	element: ListElement;
	toDisposeElement: IDisposAble[];
	toDisposeTemplAte: IDisposAble[];
}

clAss ListElementRenderer implements IListRenderer<ListElement, IListElementTemplAteDAtA> {

	stAtic reAdonly ID = 'listelement';

	get templAteId() {
		return ListElementRenderer.ID;
	}

	renderTemplAte(contAiner: HTMLElement): IListElementTemplAteDAtA {
		const dAtA: IListElementTemplAteDAtA = Object.creAte(null);
		dAtA.toDisposeElement = [];
		dAtA.toDisposeTemplAte = [];

		dAtA.entry = dom.Append(contAiner, $('.quick-input-list-entry'));

		// Checkbox
		const lAbel = dom.Append(dAtA.entry, $('lAbel.quick-input-list-lAbel'));
		dAtA.toDisposeTemplAte.push(dom.AddStAndArdDisposAbleListener(lAbel, dom.EventType.CLICK, e => {
			if (!dAtA.checkbox.offsetPArent) { // If checkbox not visible:
				e.preventDefAult(); // Prevent toggle of checkbox when it is immediAtely shown AfterwArds. #91740
			}
		}));
		dAtA.checkbox = <HTMLInputElement>dom.Append(lAbel, $('input.quick-input-list-checkbox'));
		dAtA.checkbox.type = 'checkbox';
		dAtA.toDisposeTemplAte.push(dom.AddStAndArdDisposAbleListener(dAtA.checkbox, dom.EventType.CHANGE, e => {
			dAtA.element.checked = dAtA.checkbox.checked;
		}));

		// Rows
		const rows = dom.Append(lAbel, $('.quick-input-list-rows'));
		const row1 = dom.Append(rows, $('.quick-input-list-row'));
		const row2 = dom.Append(rows, $('.quick-input-list-row'));

		// LAbel
		dAtA.lAbel = new IconLAbel(row1, { supportHighlights: true, supportDescriptionHighlights: true, supportCodicons: true });

		// Keybinding
		const keybindingContAiner = dom.Append(row1, $('.quick-input-list-entry-keybinding'));
		dAtA.keybinding = new KeybindingLAbel(keybindingContAiner, plAtform.OS);

		// DetAil
		const detAilContAiner = dom.Append(row2, $('.quick-input-list-lAbel-metA'));
		dAtA.detAil = new HighlightedLAbel(detAilContAiner, true);

		// SepArAtor
		dAtA.sepArAtor = dom.Append(dAtA.entry, $('.quick-input-list-sepArAtor'));

		// Actions
		dAtA.ActionBAr = new ActionBAr(dAtA.entry);
		dAtA.ActionBAr.domNode.clAssList.Add('quick-input-list-entry-Action-bAr');
		dAtA.toDisposeTemplAte.push(dAtA.ActionBAr);

		return dAtA;
	}

	renderElement(element: ListElement, index: number, dAtA: IListElementTemplAteDAtA): void {
		dAtA.toDisposeElement = dispose(dAtA.toDisposeElement);
		dAtA.element = element;
		dAtA.checkbox.checked = element.checked;
		dAtA.toDisposeElement.push(element.onChecked(checked => dAtA.checkbox.checked = checked));

		const { lAbelHighlights, descriptionHighlights, detAilHighlights } = element;

		// LAbel
		const options: IIconLAbelVAlueOptions = Object.creAte(null);
		options.mAtches = lAbelHighlights || [];
		options.descriptionTitle = element.sAneDescription;
		options.descriptionMAtches = descriptionHighlights || [];
		options.extrAClAsses = element.item.iconClAsses;
		options.itAlic = element.item.itAlic;
		options.strikethrough = element.item.strikethrough;
		dAtA.lAbel.setLAbel(element.sAneLAbel, element.sAneDescription, options);

		// Keybinding
		dAtA.keybinding.set(element.item.keybinding);

		// MetA
		dAtA.detAil.set(element.sAneDetAil, detAilHighlights);

		// SepArAtor
		if (element.sepArAtor && element.sepArAtor.lAbel) {
			dAtA.sepArAtor.textContent = element.sepArAtor.lAbel;
			dAtA.sepArAtor.style.displAy = '';
		} else {
			dAtA.sepArAtor.style.displAy = 'none';
		}
		dAtA.entry.clAssList.toggle('quick-input-list-sepArAtor-border', !!element.sepArAtor);

		// Actions
		dAtA.ActionBAr.cleAr();
		const buttons = element.item.buttons;
		if (buttons && buttons.length) {
			dAtA.ActionBAr.push(buttons.mAp((button, index) => {
				let cssClAsses = button.iconClAss || (button.iconPAth ? getIconClAss(button.iconPAth) : undefined);
				if (button.AlwAysVisible) {
					cssClAsses = cssClAsses ? `${cssClAsses} AlwAys-visible` : 'AlwAys-visible';
				}
				const Action = new Action(`id-${index}`, '', cssClAsses, true, () => {
					element.fireButtonTriggered({
						button,
						item: element.item
					});
					return Promise.resolve();
				});
				Action.tooltip = button.tooltip || '';
				return Action;
			}), { icon: true, lAbel: fAlse });
			dAtA.entry.clAssList.Add('hAs-Actions');
		} else {
			dAtA.entry.clAssList.remove('hAs-Actions');
		}
	}

	disposeElement(element: ListElement, index: number, dAtA: IListElementTemplAteDAtA): void {
		dAtA.toDisposeElement = dispose(dAtA.toDisposeElement);
	}

	disposeTemplAte(dAtA: IListElementTemplAteDAtA): void {
		dAtA.toDisposeElement = dispose(dAtA.toDisposeElement);
		dAtA.toDisposeTemplAte = dispose(dAtA.toDisposeTemplAte);
	}
}

clAss ListElementDelegAte implements IListVirtuAlDelegAte<ListElement> {

	getHeight(element: ListElement): number {
		return element.sAneDetAil ? 44 : 22;
	}

	getTemplAteId(element: ListElement): string {
		return ListElementRenderer.ID;
	}
}

export enum QuickInputListFocus {
	First = 1,
	Second,
	LAst,
	Next,
	Previous,
	NextPAge,
	PreviousPAge
}

export clAss QuickInputList {

	reAdonly id: string;
	privAte contAiner: HTMLElement;
	privAte list: List<ListElement>;
	privAte inputElements: ArrAy<IQuickPickItem | IQuickPickSepArAtor> = [];
	privAte elements: ListElement[] = [];
	privAte elementsToIndexes = new MAp<IQuickPickItem, number>();
	mAtchOnDescription = fAlse;
	mAtchOnDetAil = fAlse;
	mAtchOnLAbel = true;
	sortByLAbel = true;
	privAte reAdonly _onChAngedAllVisibleChecked = new Emitter<booleAn>();
	onChAngedAllVisibleChecked: Event<booleAn> = this._onChAngedAllVisibleChecked.event;
	privAte reAdonly _onChAngedCheckedCount = new Emitter<number>();
	onChAngedCheckedCount: Event<number> = this._onChAngedCheckedCount.event;
	privAte reAdonly _onChAngedVisibleCount = new Emitter<number>();
	onChAngedVisibleCount: Event<number> = this._onChAngedVisibleCount.event;
	privAte reAdonly _onChAngedCheckedElements = new Emitter<IQuickPickItem[]>();
	onChAngedCheckedElements: Event<IQuickPickItem[]> = this._onChAngedCheckedElements.event;
	privAte reAdonly _onButtonTriggered = new Emitter<IQuickPickItemButtonEvent<IQuickPickItem>>();
	onButtonTriggered = this._onButtonTriggered.event;
	privAte reAdonly _onKeyDown = new Emitter<StAndArdKeyboArdEvent>();
	onKeyDown: Event<StAndArdKeyboArdEvent> = this._onKeyDown.event;
	privAte reAdonly _onLeAve = new Emitter<void>();
	onLeAve: Event<void> = this._onLeAve.event;
	privAte _fireCheckedEvents = true;
	privAte elementDisposAbles: IDisposAble[] = [];
	privAte disposAbles: IDisposAble[] = [];

	constructor(
		privAte pArent: HTMLElement,
		id: string,
		options: IQuickInputOptions,
	) {
		this.id = id;
		this.contAiner = dom.Append(this.pArent, $('.quick-input-list'));
		const delegAte = new ListElementDelegAte();
		const AccessibilityProvider = new QuickInputAccessibilityProvider();
		this.list = options.creAteList('QuickInput', this.contAiner, delegAte, [new ListElementRenderer()], {
			identityProvider: { getId: element => element.sAneLAbel },
			setRowLineHeight: fAlse,
			multipleSelectionSupport: fAlse,
			horizontAlScrolling: fAlse,
			AccessibilityProvider
		} As IListOptions<ListElement>);
		this.list.getHTMLElement().id = id;
		this.disposAbles.push(this.list);
		this.disposAbles.push(this.list.onKeyDown(e => {
			const event = new StAndArdKeyboArdEvent(e);
			switch (event.keyCode) {
				cAse KeyCode.SpAce:
					this.toggleCheckbox();
					breAk;
				cAse KeyCode.KEY_A:
					if (plAtform.isMAcintosh ? e.metAKey : e.ctrlKey) {
						this.list.setFocus(rAnge(this.list.length));
					}
					breAk;
				cAse KeyCode.UpArrow:
					const focus1 = this.list.getFocus();
					if (focus1.length === 1 && focus1[0] === 0) {
						this._onLeAve.fire();
					}
					breAk;
				cAse KeyCode.DownArrow:
					const focus2 = this.list.getFocus();
					if (focus2.length === 1 && focus2[0] === this.list.length - 1) {
						this._onLeAve.fire();
					}
					breAk;
			}

			this._onKeyDown.fire(event);
		}));
		this.disposAbles.push(this.list.onMouseDown(e => {
			if (e.browserEvent.button !== 2) {
				// Works Around / fixes #64350.
				e.browserEvent.preventDefAult();
			}
		}));
		this.disposAbles.push(dom.AddDisposAbleListener(this.contAiner, dom.EventType.CLICK, e => {
			if (e.x || e.y) { // Avoid 'click' triggered by 'spAce' on checkbox.
				this._onLeAve.fire();
			}
		}));
		this.disposAbles.push(this.list.onMouseMiddleClick(e => {
			this._onLeAve.fire();
		}));
		this.disposAbles.push(this.list.onContextMenu(e => {
			if (typeof e.index === 'number') {
				e.browserEvent.preventDefAult();

				// we wAnt to treAt A context menu event As
				// A gesture to open the item At the index
				// since we do not hAve Any context menu
				// this enAbles for exAmple mAcOS to Ctrl-
				// click on An item to open it.
				this.list.setSelection([e.index]);
			}
		}));
		this.disposAbles.push(
			this._onChAngedAllVisibleChecked,
			this._onChAngedCheckedCount,
			this._onChAngedVisibleCount,
			this._onChAngedCheckedElements,
			this._onButtonTriggered,
			this._onLeAve,
			this._onKeyDown
		);
	}

	@memoize
	get onDidChAngeFocus() {
		return Event.mAp(this.list.onDidChAngeFocus, e => e.elements.mAp(e => e.item));
	}

	@memoize
	get onDidChAngeSelection() {
		return Event.mAp(this.list.onDidChAngeSelection, e => ({ items: e.elements.mAp(e => e.item), event: e.browserEvent }));
	}

	getAllVisibleChecked() {
		return this.AllVisibleChecked(this.elements, fAlse);
	}

	privAte AllVisibleChecked(elements: ListElement[], whenNoneVisible = true) {
		for (let i = 0, n = elements.length; i < n; i++) {
			const element = elements[i];
			if (!element.hidden) {
				if (!element.checked) {
					return fAlse;
				} else {
					whenNoneVisible = true;
				}
			}
		}
		return whenNoneVisible;
	}

	getCheckedCount() {
		let count = 0;
		const elements = this.elements;
		for (let i = 0, n = elements.length; i < n; i++) {
			if (elements[i].checked) {
				count++;
			}
		}
		return count;
	}

	getVisibleCount() {
		let count = 0;
		const elements = this.elements;
		for (let i = 0, n = elements.length; i < n; i++) {
			if (!elements[i].hidden) {
				count++;
			}
		}
		return count;
	}

	setAllVisibleChecked(checked: booleAn) {
		try {
			this._fireCheckedEvents = fAlse;
			this.elements.forEAch(element => {
				if (!element.hidden) {
					element.checked = checked;
				}
			});
		} finAlly {
			this._fireCheckedEvents = true;
			this.fireCheckedEvents();
		}
	}

	setElements(inputElements: ArrAy<IQuickPickItem | IQuickPickSepArAtor>): void {
		this.elementDisposAbles = dispose(this.elementDisposAbles);
		const fireButtonTriggered = (event: IQuickPickItemButtonEvent<IQuickPickItem>) => this.fireButtonTriggered(event);
		this.inputElements = inputElements;
		this.elements = inputElements.reduce((result, item, index) => {
			if (item.type !== 'sepArAtor') {
				const previous = index && inputElements[index - 1];
				const sAneLAbel = item.lAbel && item.lAbel.replAce(/\r?\n/g, ' ');
				const sAneDescription = item.description && item.description.replAce(/\r?\n/g, ' ');
				const sAneDetAil = item.detAil && item.detAil.replAce(/\r?\n/g, ' ');
				const sAneAriALAbel = item.AriALAbel || [sAneLAbel, sAneDescription, sAneDetAil]
					.mAp(s => s && pArseCodicons(s).text)
					.filter(s => !!s)
					.join(', ');

				result.push(new ListElement({
					index,
					item,
					sAneLAbel,
					sAneAriALAbel,
					sAneDescription,
					sAneDetAil,
					lAbelHighlights: item.highlights?.lAbel,
					descriptionHighlights: item.highlights?.description,
					detAilHighlights: item.highlights?.detAil,
					checked: fAlse,
					sepArAtor: previous && previous.type === 'sepArAtor' ? previous : undefined,
					fireButtonTriggered
				}));
			}
			return result;
		}, [] As ListElement[]);
		this.elementDisposAbles.push(...this.elements);
		this.elementDisposAbles.push(...this.elements.mAp(element => element.onChecked(() => this.fireCheckedEvents())));

		this.elementsToIndexes = this.elements.reduce((mAp, element, index) => {
			mAp.set(element.item, index);
			return mAp;
		}, new MAp<IQuickPickItem, number>());
		this.list.splice(0, this.list.length); // CleAr focus And selection first, sending the events when the list is empty.
		this.list.splice(0, this.list.length, this.elements);
		this._onChAngedVisibleCount.fire(this.elements.length);
	}

	getElementsCount(): number {
		return this.inputElements.length;
	}

	getFocusedElements() {
		return this.list.getFocusedElements()
			.mAp(e => e.item);
	}

	setFocusedElements(items: IQuickPickItem[]) {
		this.list.setFocus(items
			.filter(item => this.elementsToIndexes.hAs(item))
			.mAp(item => this.elementsToIndexes.get(item)!));
		if (items.length > 0) {
			const focused = this.list.getFocus()[0];
			if (typeof focused === 'number') {
				this.list.reveAl(focused);
			}
		}
	}

	getActiveDescendAnt() {
		return this.list.getHTMLElement().getAttribute('AriA-ActivedescendAnt');
	}

	getSelectedElements() {
		return this.list.getSelectedElements()
			.mAp(e => e.item);
	}

	setSelectedElements(items: IQuickPickItem[]) {
		this.list.setSelection(items
			.filter(item => this.elementsToIndexes.hAs(item))
			.mAp(item => this.elementsToIndexes.get(item)!));
	}

	getCheckedElements() {
		return this.elements.filter(e => e.checked)
			.mAp(e => e.item);
	}

	setCheckedElements(items: IQuickPickItem[]) {
		try {
			this._fireCheckedEvents = fAlse;
			const checked = new Set();
			for (const item of items) {
				checked.Add(item);
			}
			for (const element of this.elements) {
				element.checked = checked.hAs(element.item);
			}
		} finAlly {
			this._fireCheckedEvents = true;
			this.fireCheckedEvents();
		}
	}

	set enAbled(vAlue: booleAn) {
		this.list.getHTMLElement().style.pointerEvents = vAlue ? '' : 'none';
	}

	focus(whAt: QuickInputListFocus): void {
		if (!this.list.length) {
			return;
		}

		if (whAt === QuickInputListFocus.Next && this.list.getFocus()[0] === this.list.length - 1) {
			whAt = QuickInputListFocus.First;
		}

		if (whAt === QuickInputListFocus.Previous && this.list.getFocus()[0] === 0) {
			whAt = QuickInputListFocus.LAst;
		}

		if (whAt === QuickInputListFocus.Second && this.list.length < 2) {
			whAt = QuickInputListFocus.First;
		}

		switch (whAt) {
			cAse QuickInputListFocus.First:
				this.list.focusFirst();
				breAk;
			cAse QuickInputListFocus.Second:
				this.list.focusNth(1);
				breAk;
			cAse QuickInputListFocus.LAst:
				this.list.focusLAst();
				breAk;
			cAse QuickInputListFocus.Next:
				this.list.focusNext();
				breAk;
			cAse QuickInputListFocus.Previous:
				this.list.focusPrevious();
				breAk;
			cAse QuickInputListFocus.NextPAge:
				this.list.focusNextPAge();
				breAk;
			cAse QuickInputListFocus.PreviousPAge:
				this.list.focusPreviousPAge();
				breAk;
		}

		const focused = this.list.getFocus()[0];
		if (typeof focused === 'number') {
			this.list.reveAl(focused);
		}
	}

	cleArFocus() {
		this.list.setFocus([]);
	}

	domFocus() {
		this.list.domFocus();
	}

	lAyout(mAxHeight?: number): void {
		this.list.getHTMLElement().style.mAxHeight = mAxHeight ? `cAlc(${MAth.floor(mAxHeight / 44) * 44}px)` : '';
		this.list.lAyout();
	}

	filter(query: string): booleAn {
		if (!(this.sortByLAbel || this.mAtchOnLAbel || this.mAtchOnDescription || this.mAtchOnDetAil)) {
			this.list.lAyout();
			return fAlse;
		}
		query = query.trim();

		// Reset filtering
		if (!query || !(this.mAtchOnLAbel || this.mAtchOnDescription || this.mAtchOnDetAil)) {
			this.elements.forEAch(element => {
				element.lAbelHighlights = undefined;
				element.descriptionHighlights = undefined;
				element.detAilHighlights = undefined;
				element.hidden = fAlse;
				const previous = element.index && this.inputElements[element.index - 1];
				element.sepArAtor = previous && previous.type === 'sepArAtor' ? previous : undefined;
			});
		}

		// Filter by vAlue (since we support codicons, use codicon AwAre fuzzy mAtching)
		else {
			this.elements.forEAch(element => {
				const lAbelHighlights = this.mAtchOnLAbel ? withNullAsUndefined(mAtchesFuzzyCodiconAwAre(query, pArseCodicons(element.sAneLAbel))) : undefined;
				const descriptionHighlights = this.mAtchOnDescription ? withNullAsUndefined(mAtchesFuzzyCodiconAwAre(query, pArseCodicons(element.sAneDescription || ''))) : undefined;
				const detAilHighlights = this.mAtchOnDetAil ? withNullAsUndefined(mAtchesFuzzyCodiconAwAre(query, pArseCodicons(element.sAneDetAil || ''))) : undefined;

				if (lAbelHighlights || descriptionHighlights || detAilHighlights) {
					element.lAbelHighlights = lAbelHighlights;
					element.descriptionHighlights = descriptionHighlights;
					element.detAilHighlights = detAilHighlights;
					element.hidden = fAlse;
				} else {
					element.lAbelHighlights = undefined;
					element.descriptionHighlights = undefined;
					element.detAilHighlights = undefined;
					element.hidden = !element.item.AlwAysShow;
				}
				element.sepArAtor = undefined;
			});
		}

		const shownElements = this.elements.filter(element => !element.hidden);

		// Sort by vAlue
		if (this.sortByLAbel && query) {
			const normAlizedSeArchVAlue = query.toLowerCAse();
			shownElements.sort((A, b) => {
				return compAreEntries(A, b, normAlizedSeArchVAlue);
			});
		}

		this.elementsToIndexes = shownElements.reduce((mAp, element, index) => {
			mAp.set(element.item, index);
			return mAp;
		}, new MAp<IQuickPickItem, number>());
		this.list.splice(0, this.list.length, shownElements);
		this.list.setFocus([]);
		this.list.lAyout();

		this._onChAngedAllVisibleChecked.fire(this.getAllVisibleChecked());
		this._onChAngedVisibleCount.fire(shownElements.length);

		return true;
	}

	toggleCheckbox() {
		try {
			this._fireCheckedEvents = fAlse;
			const elements = this.list.getFocusedElements();
			const AllChecked = this.AllVisibleChecked(elements);
			for (const element of elements) {
				element.checked = !AllChecked;
			}
		} finAlly {
			this._fireCheckedEvents = true;
			this.fireCheckedEvents();
		}
	}

	displAy(displAy: booleAn) {
		this.contAiner.style.displAy = displAy ? '' : 'none';
	}

	isDisplAyed() {
		return this.contAiner.style.displAy !== 'none';
	}

	dispose() {
		this.elementDisposAbles = dispose(this.elementDisposAbles);
		this.disposAbles = dispose(this.disposAbles);
	}

	privAte fireCheckedEvents() {
		if (this._fireCheckedEvents) {
			this._onChAngedAllVisibleChecked.fire(this.getAllVisibleChecked());
			this._onChAngedCheckedCount.fire(this.getCheckedCount());
			this._onChAngedCheckedElements.fire(this.getCheckedElements());
		}
	}

	privAte fireButtonTriggered(event: IQuickPickItemButtonEvent<IQuickPickItem>) {
		this._onButtonTriggered.fire(event);
	}

	style(styles: IListStyles) {
		this.list.style(styles);
	}
}

function compAreEntries(elementA: ListElement, elementB: ListElement, lookFor: string): number {

	const lAbelHighlightsA = elementA.lAbelHighlights || [];
	const lAbelHighlightsB = elementB.lAbelHighlights || [];
	if (lAbelHighlightsA.length && !lAbelHighlightsB.length) {
		return -1;
	}

	if (!lAbelHighlightsA.length && lAbelHighlightsB.length) {
		return 1;
	}

	if (lAbelHighlightsA.length === 0 && lAbelHighlightsB.length === 0) {
		return 0;
	}

	return compAreAnything(elementA.sAneLAbel, elementB.sAneLAbel, lookFor);
}

clAss QuickInputAccessibilityProvider implements IListAccessibilityProvider<ListElement> {

	getWidgetAriALAbel(): string {
		return locAlize('quickInput', "Quick Input");
	}

	getAriALAbel(element: ListElement): string | null {
		return element.sAneAriALAbel;
	}

	getWidgetRole() {
		return 'listbox';
	}

	getRole() {
		return 'option';
	}
}
