/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/quickInput';
import { IListVirtualDelegate, IListRenderer } from 'vs/Base/Browser/ui/list/list';
import * as dom from 'vs/Base/Browser/dom';
import { dispose, IDisposaBle } from 'vs/Base/common/lifecycle';
import { IQuickPickItem, IQuickPickItemButtonEvent, IQuickPickSeparator } from 'vs/Base/parts/quickinput/common/quickInput';
import { IMatch } from 'vs/Base/common/filters';
import { matchesFuzzyCodiconAware, parseCodicons } from 'vs/Base/common/codicon';
import { compareAnything } from 'vs/Base/common/comparers';
import { Emitter, Event } from 'vs/Base/common/event';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { IconLaBel, IIconLaBelValueOptions } from 'vs/Base/Browser/ui/iconLaBel/iconLaBel';
import { HighlightedLaBel } from 'vs/Base/Browser/ui/highlightedlaBel/highlightedLaBel';
import { memoize } from 'vs/Base/common/decorators';
import { range } from 'vs/Base/common/arrays';
import * as platform from 'vs/Base/common/platform';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { Action } from 'vs/Base/common/actions';
import { getIconClass } from 'vs/Base/parts/quickinput/Browser/quickInputUtils';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { IQuickInputOptions } from 'vs/Base/parts/quickinput/Browser/quickInput';
import { IListOptions, List, IListStyles, IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { KeyBindingLaBel } from 'vs/Base/Browser/ui/keyBindingLaBel/keyBindingLaBel';
import { localize } from 'vs/nls';

const $ = dom.$;

interface IListElement {
	readonly index: numBer;
	readonly item: IQuickPickItem;
	readonly saneLaBel: string;
	readonly saneAriaLaBel: string;
	readonly saneDescription?: string;
	readonly saneDetail?: string;
	readonly laBelHighlights?: IMatch[];
	readonly descriptionHighlights?: IMatch[];
	readonly detailHighlights?: IMatch[];
	readonly checked: Boolean;
	readonly separator?: IQuickPickSeparator;
	readonly fireButtonTriggered: (event: IQuickPickItemButtonEvent<IQuickPickItem>) => void;
}

class ListElement implements IListElement, IDisposaBle {
	index!: numBer;
	item!: IQuickPickItem;
	saneLaBel!: string;
	saneAriaLaBel!: string;
	saneDescription?: string;
	saneDetail?: string;
	hidden = false;
	private readonly _onChecked = new Emitter<Boolean>();
	onChecked = this._onChecked.event;
	_checked?: Boolean;
	get checked() {
		return !!this._checked;
	}
	set checked(value: Boolean) {
		if (value !== this._checked) {
			this._checked = value;
			this._onChecked.fire(value);
		}
	}
	separator?: IQuickPickSeparator;
	laBelHighlights?: IMatch[];
	descriptionHighlights?: IMatch[];
	detailHighlights?: IMatch[];
	fireButtonTriggered!: (event: IQuickPickItemButtonEvent<IQuickPickItem>) => void;

	constructor(init: IListElement) {
		OBject.assign(this, init);
	}

	dispose() {
		this._onChecked.dispose();
	}
}

interface IListElementTemplateData {
	entry: HTMLDivElement;
	checkBox: HTMLInputElement;
	laBel: IconLaBel;
	keyBinding: KeyBindingLaBel;
	detail: HighlightedLaBel;
	separator: HTMLDivElement;
	actionBar: ActionBar;
	element: ListElement;
	toDisposeElement: IDisposaBle[];
	toDisposeTemplate: IDisposaBle[];
}

class ListElementRenderer implements IListRenderer<ListElement, IListElementTemplateData> {

	static readonly ID = 'listelement';

	get templateId() {
		return ListElementRenderer.ID;
	}

	renderTemplate(container: HTMLElement): IListElementTemplateData {
		const data: IListElementTemplateData = OBject.create(null);
		data.toDisposeElement = [];
		data.toDisposeTemplate = [];

		data.entry = dom.append(container, $('.quick-input-list-entry'));

		// CheckBox
		const laBel = dom.append(data.entry, $('laBel.quick-input-list-laBel'));
		data.toDisposeTemplate.push(dom.addStandardDisposaBleListener(laBel, dom.EventType.CLICK, e => {
			if (!data.checkBox.offsetParent) { // If checkBox not visiBle:
				e.preventDefault(); // Prevent toggle of checkBox when it is immediately shown afterwards. #91740
			}
		}));
		data.checkBox = <HTMLInputElement>dom.append(laBel, $('input.quick-input-list-checkBox'));
		data.checkBox.type = 'checkBox';
		data.toDisposeTemplate.push(dom.addStandardDisposaBleListener(data.checkBox, dom.EventType.CHANGE, e => {
			data.element.checked = data.checkBox.checked;
		}));

		// Rows
		const rows = dom.append(laBel, $('.quick-input-list-rows'));
		const row1 = dom.append(rows, $('.quick-input-list-row'));
		const row2 = dom.append(rows, $('.quick-input-list-row'));

		// LaBel
		data.laBel = new IconLaBel(row1, { supportHighlights: true, supportDescriptionHighlights: true, supportCodicons: true });

		// KeyBinding
		const keyBindingContainer = dom.append(row1, $('.quick-input-list-entry-keyBinding'));
		data.keyBinding = new KeyBindingLaBel(keyBindingContainer, platform.OS);

		// Detail
		const detailContainer = dom.append(row2, $('.quick-input-list-laBel-meta'));
		data.detail = new HighlightedLaBel(detailContainer, true);

		// Separator
		data.separator = dom.append(data.entry, $('.quick-input-list-separator'));

		// Actions
		data.actionBar = new ActionBar(data.entry);
		data.actionBar.domNode.classList.add('quick-input-list-entry-action-Bar');
		data.toDisposeTemplate.push(data.actionBar);

		return data;
	}

	renderElement(element: ListElement, index: numBer, data: IListElementTemplateData): void {
		data.toDisposeElement = dispose(data.toDisposeElement);
		data.element = element;
		data.checkBox.checked = element.checked;
		data.toDisposeElement.push(element.onChecked(checked => data.checkBox.checked = checked));

		const { laBelHighlights, descriptionHighlights, detailHighlights } = element;

		// LaBel
		const options: IIconLaBelValueOptions = OBject.create(null);
		options.matches = laBelHighlights || [];
		options.descriptionTitle = element.saneDescription;
		options.descriptionMatches = descriptionHighlights || [];
		options.extraClasses = element.item.iconClasses;
		options.italic = element.item.italic;
		options.strikethrough = element.item.strikethrough;
		data.laBel.setLaBel(element.saneLaBel, element.saneDescription, options);

		// KeyBinding
		data.keyBinding.set(element.item.keyBinding);

		// Meta
		data.detail.set(element.saneDetail, detailHighlights);

		// Separator
		if (element.separator && element.separator.laBel) {
			data.separator.textContent = element.separator.laBel;
			data.separator.style.display = '';
		} else {
			data.separator.style.display = 'none';
		}
		data.entry.classList.toggle('quick-input-list-separator-Border', !!element.separator);

		// Actions
		data.actionBar.clear();
		const Buttons = element.item.Buttons;
		if (Buttons && Buttons.length) {
			data.actionBar.push(Buttons.map((Button, index) => {
				let cssClasses = Button.iconClass || (Button.iconPath ? getIconClass(Button.iconPath) : undefined);
				if (Button.alwaysVisiBle) {
					cssClasses = cssClasses ? `${cssClasses} always-visiBle` : 'always-visiBle';
				}
				const action = new Action(`id-${index}`, '', cssClasses, true, () => {
					element.fireButtonTriggered({
						Button,
						item: element.item
					});
					return Promise.resolve();
				});
				action.tooltip = Button.tooltip || '';
				return action;
			}), { icon: true, laBel: false });
			data.entry.classList.add('has-actions');
		} else {
			data.entry.classList.remove('has-actions');
		}
	}

	disposeElement(element: ListElement, index: numBer, data: IListElementTemplateData): void {
		data.toDisposeElement = dispose(data.toDisposeElement);
	}

	disposeTemplate(data: IListElementTemplateData): void {
		data.toDisposeElement = dispose(data.toDisposeElement);
		data.toDisposeTemplate = dispose(data.toDisposeTemplate);
	}
}

class ListElementDelegate implements IListVirtualDelegate<ListElement> {

	getHeight(element: ListElement): numBer {
		return element.saneDetail ? 44 : 22;
	}

	getTemplateId(element: ListElement): string {
		return ListElementRenderer.ID;
	}
}

export enum QuickInputListFocus {
	First = 1,
	Second,
	Last,
	Next,
	Previous,
	NextPage,
	PreviousPage
}

export class QuickInputList {

	readonly id: string;
	private container: HTMLElement;
	private list: List<ListElement>;
	private inputElements: Array<IQuickPickItem | IQuickPickSeparator> = [];
	private elements: ListElement[] = [];
	private elementsToIndexes = new Map<IQuickPickItem, numBer>();
	matchOnDescription = false;
	matchOnDetail = false;
	matchOnLaBel = true;
	sortByLaBel = true;
	private readonly _onChangedAllVisiBleChecked = new Emitter<Boolean>();
	onChangedAllVisiBleChecked: Event<Boolean> = this._onChangedAllVisiBleChecked.event;
	private readonly _onChangedCheckedCount = new Emitter<numBer>();
	onChangedCheckedCount: Event<numBer> = this._onChangedCheckedCount.event;
	private readonly _onChangedVisiBleCount = new Emitter<numBer>();
	onChangedVisiBleCount: Event<numBer> = this._onChangedVisiBleCount.event;
	private readonly _onChangedCheckedElements = new Emitter<IQuickPickItem[]>();
	onChangedCheckedElements: Event<IQuickPickItem[]> = this._onChangedCheckedElements.event;
	private readonly _onButtonTriggered = new Emitter<IQuickPickItemButtonEvent<IQuickPickItem>>();
	onButtonTriggered = this._onButtonTriggered.event;
	private readonly _onKeyDown = new Emitter<StandardKeyBoardEvent>();
	onKeyDown: Event<StandardKeyBoardEvent> = this._onKeyDown.event;
	private readonly _onLeave = new Emitter<void>();
	onLeave: Event<void> = this._onLeave.event;
	private _fireCheckedEvents = true;
	private elementDisposaBles: IDisposaBle[] = [];
	private disposaBles: IDisposaBle[] = [];

	constructor(
		private parent: HTMLElement,
		id: string,
		options: IQuickInputOptions,
	) {
		this.id = id;
		this.container = dom.append(this.parent, $('.quick-input-list'));
		const delegate = new ListElementDelegate();
		const accessiBilityProvider = new QuickInputAccessiBilityProvider();
		this.list = options.createList('QuickInput', this.container, delegate, [new ListElementRenderer()], {
			identityProvider: { getId: element => element.saneLaBel },
			setRowLineHeight: false,
			multipleSelectionSupport: false,
			horizontalScrolling: false,
			accessiBilityProvider
		} as IListOptions<ListElement>);
		this.list.getHTMLElement().id = id;
		this.disposaBles.push(this.list);
		this.disposaBles.push(this.list.onKeyDown(e => {
			const event = new StandardKeyBoardEvent(e);
			switch (event.keyCode) {
				case KeyCode.Space:
					this.toggleCheckBox();
					Break;
				case KeyCode.KEY_A:
					if (platform.isMacintosh ? e.metaKey : e.ctrlKey) {
						this.list.setFocus(range(this.list.length));
					}
					Break;
				case KeyCode.UpArrow:
					const focus1 = this.list.getFocus();
					if (focus1.length === 1 && focus1[0] === 0) {
						this._onLeave.fire();
					}
					Break;
				case KeyCode.DownArrow:
					const focus2 = this.list.getFocus();
					if (focus2.length === 1 && focus2[0] === this.list.length - 1) {
						this._onLeave.fire();
					}
					Break;
			}

			this._onKeyDown.fire(event);
		}));
		this.disposaBles.push(this.list.onMouseDown(e => {
			if (e.BrowserEvent.Button !== 2) {
				// Works around / fixes #64350.
				e.BrowserEvent.preventDefault();
			}
		}));
		this.disposaBles.push(dom.addDisposaBleListener(this.container, dom.EventType.CLICK, e => {
			if (e.x || e.y) { // Avoid 'click' triggered By 'space' on checkBox.
				this._onLeave.fire();
			}
		}));
		this.disposaBles.push(this.list.onMouseMiddleClick(e => {
			this._onLeave.fire();
		}));
		this.disposaBles.push(this.list.onContextMenu(e => {
			if (typeof e.index === 'numBer') {
				e.BrowserEvent.preventDefault();

				// we want to treat a context menu event as
				// a gesture to open the item at the index
				// since we do not have any context menu
				// this enaBles for example macOS to Ctrl-
				// click on an item to open it.
				this.list.setSelection([e.index]);
			}
		}));
		this.disposaBles.push(
			this._onChangedAllVisiBleChecked,
			this._onChangedCheckedCount,
			this._onChangedVisiBleCount,
			this._onChangedCheckedElements,
			this._onButtonTriggered,
			this._onLeave,
			this._onKeyDown
		);
	}

	@memoize
	get onDidChangeFocus() {
		return Event.map(this.list.onDidChangeFocus, e => e.elements.map(e => e.item));
	}

	@memoize
	get onDidChangeSelection() {
		return Event.map(this.list.onDidChangeSelection, e => ({ items: e.elements.map(e => e.item), event: e.BrowserEvent }));
	}

	getAllVisiBleChecked() {
		return this.allVisiBleChecked(this.elements, false);
	}

	private allVisiBleChecked(elements: ListElement[], whenNoneVisiBle = true) {
		for (let i = 0, n = elements.length; i < n; i++) {
			const element = elements[i];
			if (!element.hidden) {
				if (!element.checked) {
					return false;
				} else {
					whenNoneVisiBle = true;
				}
			}
		}
		return whenNoneVisiBle;
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

	getVisiBleCount() {
		let count = 0;
		const elements = this.elements;
		for (let i = 0, n = elements.length; i < n; i++) {
			if (!elements[i].hidden) {
				count++;
			}
		}
		return count;
	}

	setAllVisiBleChecked(checked: Boolean) {
		try {
			this._fireCheckedEvents = false;
			this.elements.forEach(element => {
				if (!element.hidden) {
					element.checked = checked;
				}
			});
		} finally {
			this._fireCheckedEvents = true;
			this.fireCheckedEvents();
		}
	}

	setElements(inputElements: Array<IQuickPickItem | IQuickPickSeparator>): void {
		this.elementDisposaBles = dispose(this.elementDisposaBles);
		const fireButtonTriggered = (event: IQuickPickItemButtonEvent<IQuickPickItem>) => this.fireButtonTriggered(event);
		this.inputElements = inputElements;
		this.elements = inputElements.reduce((result, item, index) => {
			if (item.type !== 'separator') {
				const previous = index && inputElements[index - 1];
				const saneLaBel = item.laBel && item.laBel.replace(/\r?\n/g, ' ');
				const saneDescription = item.description && item.description.replace(/\r?\n/g, ' ');
				const saneDetail = item.detail && item.detail.replace(/\r?\n/g, ' ');
				const saneAriaLaBel = item.ariaLaBel || [saneLaBel, saneDescription, saneDetail]
					.map(s => s && parseCodicons(s).text)
					.filter(s => !!s)
					.join(', ');

				result.push(new ListElement({
					index,
					item,
					saneLaBel,
					saneAriaLaBel,
					saneDescription,
					saneDetail,
					laBelHighlights: item.highlights?.laBel,
					descriptionHighlights: item.highlights?.description,
					detailHighlights: item.highlights?.detail,
					checked: false,
					separator: previous && previous.type === 'separator' ? previous : undefined,
					fireButtonTriggered
				}));
			}
			return result;
		}, [] as ListElement[]);
		this.elementDisposaBles.push(...this.elements);
		this.elementDisposaBles.push(...this.elements.map(element => element.onChecked(() => this.fireCheckedEvents())));

		this.elementsToIndexes = this.elements.reduce((map, element, index) => {
			map.set(element.item, index);
			return map;
		}, new Map<IQuickPickItem, numBer>());
		this.list.splice(0, this.list.length); // Clear focus and selection first, sending the events when the list is empty.
		this.list.splice(0, this.list.length, this.elements);
		this._onChangedVisiBleCount.fire(this.elements.length);
	}

	getElementsCount(): numBer {
		return this.inputElements.length;
	}

	getFocusedElements() {
		return this.list.getFocusedElements()
			.map(e => e.item);
	}

	setFocusedElements(items: IQuickPickItem[]) {
		this.list.setFocus(items
			.filter(item => this.elementsToIndexes.has(item))
			.map(item => this.elementsToIndexes.get(item)!));
		if (items.length > 0) {
			const focused = this.list.getFocus()[0];
			if (typeof focused === 'numBer') {
				this.list.reveal(focused);
			}
		}
	}

	getActiveDescendant() {
		return this.list.getHTMLElement().getAttriBute('aria-activedescendant');
	}

	getSelectedElements() {
		return this.list.getSelectedElements()
			.map(e => e.item);
	}

	setSelectedElements(items: IQuickPickItem[]) {
		this.list.setSelection(items
			.filter(item => this.elementsToIndexes.has(item))
			.map(item => this.elementsToIndexes.get(item)!));
	}

	getCheckedElements() {
		return this.elements.filter(e => e.checked)
			.map(e => e.item);
	}

	setCheckedElements(items: IQuickPickItem[]) {
		try {
			this._fireCheckedEvents = false;
			const checked = new Set();
			for (const item of items) {
				checked.add(item);
			}
			for (const element of this.elements) {
				element.checked = checked.has(element.item);
			}
		} finally {
			this._fireCheckedEvents = true;
			this.fireCheckedEvents();
		}
	}

	set enaBled(value: Boolean) {
		this.list.getHTMLElement().style.pointerEvents = value ? '' : 'none';
	}

	focus(what: QuickInputListFocus): void {
		if (!this.list.length) {
			return;
		}

		if (what === QuickInputListFocus.Next && this.list.getFocus()[0] === this.list.length - 1) {
			what = QuickInputListFocus.First;
		}

		if (what === QuickInputListFocus.Previous && this.list.getFocus()[0] === 0) {
			what = QuickInputListFocus.Last;
		}

		if (what === QuickInputListFocus.Second && this.list.length < 2) {
			what = QuickInputListFocus.First;
		}

		switch (what) {
			case QuickInputListFocus.First:
				this.list.focusFirst();
				Break;
			case QuickInputListFocus.Second:
				this.list.focusNth(1);
				Break;
			case QuickInputListFocus.Last:
				this.list.focusLast();
				Break;
			case QuickInputListFocus.Next:
				this.list.focusNext();
				Break;
			case QuickInputListFocus.Previous:
				this.list.focusPrevious();
				Break;
			case QuickInputListFocus.NextPage:
				this.list.focusNextPage();
				Break;
			case QuickInputListFocus.PreviousPage:
				this.list.focusPreviousPage();
				Break;
		}

		const focused = this.list.getFocus()[0];
		if (typeof focused === 'numBer') {
			this.list.reveal(focused);
		}
	}

	clearFocus() {
		this.list.setFocus([]);
	}

	domFocus() {
		this.list.domFocus();
	}

	layout(maxHeight?: numBer): void {
		this.list.getHTMLElement().style.maxHeight = maxHeight ? `calc(${Math.floor(maxHeight / 44) * 44}px)` : '';
		this.list.layout();
	}

	filter(query: string): Boolean {
		if (!(this.sortByLaBel || this.matchOnLaBel || this.matchOnDescription || this.matchOnDetail)) {
			this.list.layout();
			return false;
		}
		query = query.trim();

		// Reset filtering
		if (!query || !(this.matchOnLaBel || this.matchOnDescription || this.matchOnDetail)) {
			this.elements.forEach(element => {
				element.laBelHighlights = undefined;
				element.descriptionHighlights = undefined;
				element.detailHighlights = undefined;
				element.hidden = false;
				const previous = element.index && this.inputElements[element.index - 1];
				element.separator = previous && previous.type === 'separator' ? previous : undefined;
			});
		}

		// Filter By value (since we support codicons, use codicon aware fuzzy matching)
		else {
			this.elements.forEach(element => {
				const laBelHighlights = this.matchOnLaBel ? withNullAsUndefined(matchesFuzzyCodiconAware(query, parseCodicons(element.saneLaBel))) : undefined;
				const descriptionHighlights = this.matchOnDescription ? withNullAsUndefined(matchesFuzzyCodiconAware(query, parseCodicons(element.saneDescription || ''))) : undefined;
				const detailHighlights = this.matchOnDetail ? withNullAsUndefined(matchesFuzzyCodiconAware(query, parseCodicons(element.saneDetail || ''))) : undefined;

				if (laBelHighlights || descriptionHighlights || detailHighlights) {
					element.laBelHighlights = laBelHighlights;
					element.descriptionHighlights = descriptionHighlights;
					element.detailHighlights = detailHighlights;
					element.hidden = false;
				} else {
					element.laBelHighlights = undefined;
					element.descriptionHighlights = undefined;
					element.detailHighlights = undefined;
					element.hidden = !element.item.alwaysShow;
				}
				element.separator = undefined;
			});
		}

		const shownElements = this.elements.filter(element => !element.hidden);

		// Sort By value
		if (this.sortByLaBel && query) {
			const normalizedSearchValue = query.toLowerCase();
			shownElements.sort((a, B) => {
				return compareEntries(a, B, normalizedSearchValue);
			});
		}

		this.elementsToIndexes = shownElements.reduce((map, element, index) => {
			map.set(element.item, index);
			return map;
		}, new Map<IQuickPickItem, numBer>());
		this.list.splice(0, this.list.length, shownElements);
		this.list.setFocus([]);
		this.list.layout();

		this._onChangedAllVisiBleChecked.fire(this.getAllVisiBleChecked());
		this._onChangedVisiBleCount.fire(shownElements.length);

		return true;
	}

	toggleCheckBox() {
		try {
			this._fireCheckedEvents = false;
			const elements = this.list.getFocusedElements();
			const allChecked = this.allVisiBleChecked(elements);
			for (const element of elements) {
				element.checked = !allChecked;
			}
		} finally {
			this._fireCheckedEvents = true;
			this.fireCheckedEvents();
		}
	}

	display(display: Boolean) {
		this.container.style.display = display ? '' : 'none';
	}

	isDisplayed() {
		return this.container.style.display !== 'none';
	}

	dispose() {
		this.elementDisposaBles = dispose(this.elementDisposaBles);
		this.disposaBles = dispose(this.disposaBles);
	}

	private fireCheckedEvents() {
		if (this._fireCheckedEvents) {
			this._onChangedAllVisiBleChecked.fire(this.getAllVisiBleChecked());
			this._onChangedCheckedCount.fire(this.getCheckedCount());
			this._onChangedCheckedElements.fire(this.getCheckedElements());
		}
	}

	private fireButtonTriggered(event: IQuickPickItemButtonEvent<IQuickPickItem>) {
		this._onButtonTriggered.fire(event);
	}

	style(styles: IListStyles) {
		this.list.style(styles);
	}
}

function compareEntries(elementA: ListElement, elementB: ListElement, lookFor: string): numBer {

	const laBelHighlightsA = elementA.laBelHighlights || [];
	const laBelHighlightsB = elementB.laBelHighlights || [];
	if (laBelHighlightsA.length && !laBelHighlightsB.length) {
		return -1;
	}

	if (!laBelHighlightsA.length && laBelHighlightsB.length) {
		return 1;
	}

	if (laBelHighlightsA.length === 0 && laBelHighlightsB.length === 0) {
		return 0;
	}

	return compareAnything(elementA.saneLaBel, elementB.saneLaBel, lookFor);
}

class QuickInputAccessiBilityProvider implements IListAccessiBilityProvider<ListElement> {

	getWidgetAriaLaBel(): string {
		return localize('quickInput', "Quick Input");
	}

	getAriaLaBel(element: ListElement): string | null {
		return element.saneAriaLaBel;
	}

	getWidgetRole() {
		return 'listBox';
	}

	getRole() {
		return 'option';
	}
}
