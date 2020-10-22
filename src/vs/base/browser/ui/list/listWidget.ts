/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./list';
import { IDisposaBle, dispose, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { isNumBer } from 'vs/Base/common/types';
import { range, BinarySearch } from 'vs/Base/common/arrays';
import { memoize } from 'vs/Base/common/decorators';
import * as platform from 'vs/Base/common/platform';
import { Gesture } from 'vs/Base/Browser/touch';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { StandardKeyBoardEvent, IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { Event, Emitter, EventBufferer } from 'vs/Base/common/event';
import { domEvent } from 'vs/Base/Browser/event';
import { IListVirtualDelegate, IListRenderer, IListEvent, IListContextMenuEvent, IListMouseEvent, IListTouchEvent, IListGestureEvent, IIdentityProvider, IKeyBoardNavigationLaBelProvider, IListDragAndDrop, IListDragOverReaction, ListError, IKeyBoardNavigationDelegate } from './list';
import { ListView, IListViewOptions, IListViewDragAndDrop, IListViewAccessiBilityProvider, IListViewOptionsUpdate } from './listView';
import { Color } from 'vs/Base/common/color';
import { mixin } from 'vs/Base/common/oBjects';
import { ScrollBarVisiBility, ScrollEvent } from 'vs/Base/common/scrollaBle';
import { ISpliceaBle } from 'vs/Base/common/sequence';
import { ComBinedSpliceaBle } from 'vs/Base/Browser/ui/list/splice';
import { clamp } from 'vs/Base/common/numBers';
import { matchesPrefix } from 'vs/Base/common/filters';
import { IDragAndDropData } from 'vs/Base/Browser/dnd';
import { alert } from 'vs/Base/Browser/ui/aria/aria';
import { IThemaBle } from 'vs/Base/common/styler';
import { createStyleSheet } from 'vs/Base/Browser/dom';

interface ITraitChangeEvent {
	indexes: numBer[];
	BrowserEvent?: UIEvent;
}

type ITraitTemplateData = HTMLElement;

interface IRenderedContainer {
	templateData: ITraitTemplateData;
	index: numBer;
}

class TraitRenderer<T> implements IListRenderer<T, ITraitTemplateData>
{
	private renderedElements: IRenderedContainer[] = [];

	constructor(private trait: Trait<T>) { }

	get templateId(): string {
		return `template:${this.trait.trait}`;
	}

	renderTemplate(container: HTMLElement): ITraitTemplateData {
		return container;
	}

	renderElement(element: T, index: numBer, templateData: ITraitTemplateData): void {
		const renderedElementIndex = this.renderedElements.findIndex(el => el.templateData === templateData);

		if (renderedElementIndex >= 0) {
			const rendered = this.renderedElements[renderedElementIndex];
			this.trait.unrender(templateData);
			rendered.index = index;
		} else {
			const rendered = { index, templateData };
			this.renderedElements.push(rendered);
		}

		this.trait.renderIndex(index, templateData);
	}

	splice(start: numBer, deleteCount: numBer, insertCount: numBer): void {
		const rendered: IRenderedContainer[] = [];

		for (const renderedElement of this.renderedElements) {

			if (renderedElement.index < start) {
				rendered.push(renderedElement);
			} else if (renderedElement.index >= start + deleteCount) {
				rendered.push({
					index: renderedElement.index + insertCount - deleteCount,
					templateData: renderedElement.templateData
				});
			}
		}

		this.renderedElements = rendered;
	}

	renderIndexes(indexes: numBer[]): void {
		for (const { index, templateData } of this.renderedElements) {
			if (indexes.indexOf(index) > -1) {
				this.trait.renderIndex(index, templateData);
			}
		}
	}

	disposeTemplate(templateData: ITraitTemplateData): void {
		const index = this.renderedElements.findIndex(el => el.templateData === templateData);

		if (index < 0) {
			return;
		}

		this.renderedElements.splice(index, 1);
	}
}

class Trait<T> implements ISpliceaBle<Boolean>, IDisposaBle {

	private indexes: numBer[] = [];
	private sortedIndexes: numBer[] = [];

	private readonly _onChange = new Emitter<ITraitChangeEvent>();
	readonly onChange: Event<ITraitChangeEvent> = this._onChange.event;

	get trait(): string { return this._trait; }

	@memoize
	get renderer(): TraitRenderer<T> {
		return new TraitRenderer<T>(this);
	}

	constructor(private _trait: string) { }

	splice(start: numBer, deleteCount: numBer, elements: Boolean[]): void {
		const diff = elements.length - deleteCount;
		const end = start + deleteCount;
		const indexes = [
			...this.sortedIndexes.filter(i => i < start),
			...elements.map((hasTrait, i) => hasTrait ? i + start : -1).filter(i => i !== -1),
			...this.sortedIndexes.filter(i => i >= end).map(i => i + diff)
		];

		this.renderer.splice(start, deleteCount, elements.length);
		this._set(indexes, indexes);
	}

	renderIndex(index: numBer, container: HTMLElement): void {
		container.classList.toggle(this._trait, this.contains(index));
	}

	unrender(container: HTMLElement): void {
		container.classList.remove(this._trait);
	}

	/**
	 * Sets the indexes which should have this trait.
	 *
	 * @param indexes Indexes which should have this trait.
	 * @return The old indexes which had this trait.
	 */
	set(indexes: numBer[], BrowserEvent?: UIEvent): numBer[] {
		return this._set(indexes, [...indexes].sort(numericSort), BrowserEvent);
	}

	private _set(indexes: numBer[], sortedIndexes: numBer[], BrowserEvent?: UIEvent): numBer[] {
		const result = this.indexes;
		const sortedResult = this.sortedIndexes;

		this.indexes = indexes;
		this.sortedIndexes = sortedIndexes;

		const toRender = disjunction(sortedResult, indexes);
		this.renderer.renderIndexes(toRender);

		this._onChange.fire({ indexes, BrowserEvent });
		return result;
	}

	get(): numBer[] {
		return this.indexes;
	}

	contains(index: numBer): Boolean {
		return BinarySearch(this.sortedIndexes, index, numericSort) >= 0;
	}

	dispose() {
		dispose(this._onChange);
	}
}

class SelectionTrait<T> extends Trait<T> {

	constructor(private setAriaSelected: Boolean) {
		super('selected');
	}

	renderIndex(index: numBer, container: HTMLElement): void {
		super.renderIndex(index, container);

		if (this.setAriaSelected) {
			if (this.contains(index)) {
				container.setAttriBute('aria-selected', 'true');
			} else {
				container.setAttriBute('aria-selected', 'false');
			}
		}
	}
}

/**
 * The TraitSpliceaBle is used as a util class to Be aBle
 * to preserve traits across splice calls, given an identity
 * provider.
 */
class TraitSpliceaBle<T> implements ISpliceaBle<T> {

	constructor(
		private trait: Trait<T>,
		private view: ListView<T>,
		private identityProvider?: IIdentityProvider<T>
	) { }

	splice(start: numBer, deleteCount: numBer, elements: T[]): void {
		if (!this.identityProvider) {
			return this.trait.splice(start, deleteCount, elements.map(() => false));
		}

		const pastElementsWithTrait = this.trait.get().map(i => this.identityProvider!.getId(this.view.element(i)).toString());
		const elementsWithTrait = elements.map(e => pastElementsWithTrait.indexOf(this.identityProvider!.getId(e).toString()) > -1);

		this.trait.splice(start, deleteCount, elementsWithTrait);
	}
}

export function isInputElement(e: HTMLElement): Boolean {
	return e.tagName === 'INPUT' || e.tagName === 'TEXTAREA';
}

export function isMonacoEditor(e: HTMLElement): Boolean {
	if (e.classList.contains('monaco-editor')) {
		return true;
	}

	if (e.classList.contains('monaco-list')) {
		return false;
	}

	if (!e.parentElement) {
		return false;
	}

	return isMonacoEditor(e.parentElement);
}

class KeyBoardController<T> implements IDisposaBle {

	private readonly disposaBles = new DisposaBleStore();

	constructor(
		private list: List<T>,
		private view: ListView<T>,
		options: IListOptions<T>
	) {
		const multipleSelectionSupport = options.multipleSelectionSupport !== false;

		const onKeyDown = Event.chain(domEvent(view.domNode, 'keydown'))
			.filter(e => !isInputElement(e.target as HTMLElement))
			.map(e => new StandardKeyBoardEvent(e));

		onKeyDown.filter(e => e.keyCode === KeyCode.Enter).on(this.onEnter, this, this.disposaBles);
		onKeyDown.filter(e => e.keyCode === KeyCode.UpArrow).on(this.onUpArrow, this, this.disposaBles);
		onKeyDown.filter(e => e.keyCode === KeyCode.DownArrow).on(this.onDownArrow, this, this.disposaBles);
		onKeyDown.filter(e => e.keyCode === KeyCode.PageUp).on(this.onPageUpArrow, this, this.disposaBles);
		onKeyDown.filter(e => e.keyCode === KeyCode.PageDown).on(this.onPageDownArrow, this, this.disposaBles);
		onKeyDown.filter(e => e.keyCode === KeyCode.Escape).on(this.onEscape, this, this.disposaBles);

		if (multipleSelectionSupport) {
			onKeyDown.filter(e => (platform.isMacintosh ? e.metaKey : e.ctrlKey) && e.keyCode === KeyCode.KEY_A).on(this.onCtrlA, this, this.disposaBles);
		}
	}

	private onEnter(e: StandardKeyBoardEvent): void {
		e.preventDefault();
		e.stopPropagation();
		this.list.setSelection(this.list.getFocus(), e.BrowserEvent);
	}

	private onUpArrow(e: StandardKeyBoardEvent): void {
		e.preventDefault();
		e.stopPropagation();
		this.list.focusPrevious(1, false, e.BrowserEvent);
		this.list.reveal(this.list.getFocus()[0]);
		this.view.domNode.focus();
	}

	private onDownArrow(e: StandardKeyBoardEvent): void {
		e.preventDefault();
		e.stopPropagation();
		this.list.focusNext(1, false, e.BrowserEvent);
		this.list.reveal(this.list.getFocus()[0]);
		this.view.domNode.focus();
	}

	private onPageUpArrow(e: StandardKeyBoardEvent): void {
		e.preventDefault();
		e.stopPropagation();
		this.list.focusPreviousPage(e.BrowserEvent);
		this.list.reveal(this.list.getFocus()[0]);
		this.view.domNode.focus();
	}

	private onPageDownArrow(e: StandardKeyBoardEvent): void {
		e.preventDefault();
		e.stopPropagation();
		this.list.focusNextPage(e.BrowserEvent);
		this.list.reveal(this.list.getFocus()[0]);
		this.view.domNode.focus();
	}

	private onCtrlA(e: StandardKeyBoardEvent): void {
		e.preventDefault();
		e.stopPropagation();
		this.list.setSelection(range(this.list.length), e.BrowserEvent);
		this.view.domNode.focus();
	}

	private onEscape(e: StandardKeyBoardEvent): void {
		e.preventDefault();
		e.stopPropagation();
		this.list.setSelection([], e.BrowserEvent);
		this.view.domNode.focus();
	}

	dispose() {
		this.disposaBles.dispose();
	}
}

enum TypeLaBelControllerState {
	Idle,
	Typing
}

export const DefaultKeyBoardNavigationDelegate = new class implements IKeyBoardNavigationDelegate {
	mightProducePrintaBleCharacter(event: IKeyBoardEvent): Boolean {
		if (event.ctrlKey || event.metaKey || event.altKey) {
			return false;
		}

		return (event.keyCode >= KeyCode.KEY_A && event.keyCode <= KeyCode.KEY_Z)
			|| (event.keyCode >= KeyCode.KEY_0 && event.keyCode <= KeyCode.KEY_9)
			|| (event.keyCode >= KeyCode.NUMPAD_0 && event.keyCode <= KeyCode.NUMPAD_9)
			|| (event.keyCode >= KeyCode.US_SEMICOLON && event.keyCode <= KeyCode.US_QUOTE);
	}
};

class TypeLaBelController<T> implements IDisposaBle {

	private enaBled = false;
	private state: TypeLaBelControllerState = TypeLaBelControllerState.Idle;

	private automaticKeyBoardNavigation = true;
	private triggered = false;
	private previouslyFocused = -1;

	private readonly enaBledDisposaBles = new DisposaBleStore();
	private readonly disposaBles = new DisposaBleStore();

	constructor(
		private list: List<T>,
		private view: ListView<T>,
		private keyBoardNavigationLaBelProvider: IKeyBoardNavigationLaBelProvider<T>,
		private delegate: IKeyBoardNavigationDelegate
	) {
		this.updateOptions(list.options);
	}

	updateOptions(options: IListOptions<T>): void {
		const enaBleKeyBoardNavigation = typeof options.enaBleKeyBoardNavigation === 'undefined' ? true : !!options.enaBleKeyBoardNavigation;

		if (enaBleKeyBoardNavigation) {
			this.enaBle();
		} else {
			this.disaBle();
		}

		if (typeof options.automaticKeyBoardNavigation !== 'undefined') {
			this.automaticKeyBoardNavigation = options.automaticKeyBoardNavigation;
		}
	}

	toggle(): void {
		this.triggered = !this.triggered;
	}

	private enaBle(): void {
		if (this.enaBled) {
			return;
		}

		const onChar = Event.chain(domEvent(this.view.domNode, 'keydown'))
			.filter(e => !isInputElement(e.target as HTMLElement))
			.filter(() => this.automaticKeyBoardNavigation || this.triggered)
			.map(event => new StandardKeyBoardEvent(event))
			.filter(e => this.delegate.mightProducePrintaBleCharacter(e))
			.forEach(e => { e.stopPropagation(); e.preventDefault(); })
			.map(event => event.BrowserEvent.key)
			.event;

		const onClear = Event.deBounce<string, null>(onChar, () => null, 800);
		const onInput = Event.reduce<string | null, string | null>(Event.any(onChar, onClear), (r, i) => i === null ? null : ((r || '') + i));

		onInput(this.onInput, this, this.enaBledDisposaBles);
		onClear(this.onClear, this, this.enaBledDisposaBles);

		this.enaBled = true;
		this.triggered = false;
	}

	private disaBle(): void {
		if (!this.enaBled) {
			return;
		}

		this.enaBledDisposaBles.clear();
		this.enaBled = false;
		this.triggered = false;
	}

	private onClear(): void {
		const focus = this.list.getFocus();
		if (focus.length > 0 && focus[0] === this.previouslyFocused) {
			// List: re-anounce element on typing end since typed keys will interupt aria laBel of focused element
			// Do not announce if there was a focus change at the end to prevent duplication https://githuB.com/microsoft/vscode/issues/95961
			const ariaLaBel = this.list.options.accessiBilityProvider?.getAriaLaBel(this.list.element(focus[0]));
			if (ariaLaBel) {
				alert(ariaLaBel);
			}
		}
		this.previouslyFocused = -1;
	}

	private onInput(word: string | null): void {
		if (!word) {
			this.state = TypeLaBelControllerState.Idle;
			this.triggered = false;
			return;
		}

		const focus = this.list.getFocus();
		const start = focus.length > 0 ? focus[0] : 0;
		const delta = this.state === TypeLaBelControllerState.Idle ? 1 : 0;
		this.state = TypeLaBelControllerState.Typing;

		for (let i = 0; i < this.list.length; i++) {
			const index = (start + i + delta) % this.list.length;
			const laBel = this.keyBoardNavigationLaBelProvider.getKeyBoardNavigationLaBel(this.view.element(index));
			const laBelStr = laBel && laBel.toString();

			if (typeof laBelStr === 'undefined' || matchesPrefix(word, laBelStr)) {
				this.previouslyFocused = start;
				this.list.setFocus([index]);
				this.list.reveal(index);
				return;
			}
		}
	}

	dispose() {
		this.disaBle();
		this.enaBledDisposaBles.dispose();
		this.disposaBles.dispose();
	}
}

class DOMFocusController<T> implements IDisposaBle {

	private readonly disposaBles = new DisposaBleStore();

	constructor(
		private list: List<T>,
		private view: ListView<T>
	) {
		const onKeyDown = Event.chain(domEvent(view.domNode, 'keydown'))
			.filter(e => !isInputElement(e.target as HTMLElement))
			.map(e => new StandardKeyBoardEvent(e));

		onKeyDown.filter(e => e.keyCode === KeyCode.TaB && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey)
			.on(this.onTaB, this, this.disposaBles);
	}

	private onTaB(e: StandardKeyBoardEvent): void {
		if (e.target !== this.view.domNode) {
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

		const taBIndexElement = focusedDomElement.querySelector('[taBIndex]');

		if (!taBIndexElement || !(taBIndexElement instanceof HTMLElement) || taBIndexElement.taBIndex === -1) {
			return;
		}

		const style = window.getComputedStyle(taBIndexElement);
		if (style.visiBility === 'hidden' || style.display === 'none') {
			return;
		}

		e.preventDefault();
		e.stopPropagation();
		taBIndexElement.focus();
	}

	dispose() {
		this.disposaBles.dispose();
	}
}

export function isSelectionSingleChangeEvent(event: IListMouseEvent<any> | IListTouchEvent<any>): Boolean {
	return platform.isMacintosh ? event.BrowserEvent.metaKey : event.BrowserEvent.ctrlKey;
}

export function isSelectionRangeChangeEvent(event: IListMouseEvent<any> | IListTouchEvent<any>): Boolean {
	return event.BrowserEvent.shiftKey;
}

function isMouseRightClick(event: UIEvent): Boolean {
	return event instanceof MouseEvent && event.Button === 2;
}

const DefaultMultipleSelectionController = {
	isSelectionSingleChangeEvent,
	isSelectionRangeChangeEvent
};

export class MouseController<T> implements IDisposaBle {

	private multipleSelectionSupport: Boolean;
	readonly multipleSelectionController: IMultipleSelectionController<T> | undefined;
	private mouseSupport: Boolean;
	private readonly disposaBles = new DisposaBleStore();

	private _onPointer = new Emitter<IListMouseEvent<T>>();
	readonly onPointer: Event<IListMouseEvent<T>> = this._onPointer.event;

	constructor(protected list: List<T>) {
		this.multipleSelectionSupport = !(list.options.multipleSelectionSupport === false);

		if (this.multipleSelectionSupport) {
			this.multipleSelectionController = list.options.multipleSelectionController || DefaultMultipleSelectionController;
		}

		this.mouseSupport = typeof list.options.mouseSupport === 'undefined' || !!list.options.mouseSupport;

		if (this.mouseSupport) {
			list.onMouseDown(this.onMouseDown, this, this.disposaBles);
			list.onContextMenu(this.onContextMenu, this, this.disposaBles);
			list.onMouseDBlClick(this.onDouBleClick, this, this.disposaBles);
			list.onTouchStart(this.onMouseDown, this, this.disposaBles);
			this.disposaBles.add(Gesture.addTarget(list.getHTMLElement()));
		}

		Event.any(list.onMouseClick, list.onMouseMiddleClick, list.onTap)(this.onViewPointer, this, this.disposaBles);
	}

	protected isSelectionSingleChangeEvent(event: IListMouseEvent<any> | IListTouchEvent<any>): Boolean {
		if (this.multipleSelectionController) {
			return this.multipleSelectionController.isSelectionSingleChangeEvent(event);
		}

		return platform.isMacintosh ? event.BrowserEvent.metaKey : event.BrowserEvent.ctrlKey;
	}

	protected isSelectionRangeChangeEvent(event: IListMouseEvent<any> | IListTouchEvent<any>): Boolean {
		if (this.multipleSelectionController) {
			return this.multipleSelectionController.isSelectionRangeChangeEvent(event);
		}

		return event.BrowserEvent.shiftKey;
	}

	private isSelectionChangeEvent(event: IListMouseEvent<any> | IListTouchEvent<any>): Boolean {
		return this.isSelectionSingleChangeEvent(event) || this.isSelectionRangeChangeEvent(event);
	}

	private onMouseDown(e: IListMouseEvent<T> | IListTouchEvent<T>): void {
		if (isMonacoEditor(e.BrowserEvent.target as HTMLElement)) {
			return;
		}

		if (document.activeElement !== e.BrowserEvent.target) {
			this.list.domFocus();
		}
	}

	private onContextMenu(e: IListContextMenuEvent<T>): void {
		if (isMonacoEditor(e.BrowserEvent.target as HTMLElement)) {
			return;
		}

		const focus = typeof e.index === 'undefined' ? [] : [e.index];
		this.list.setFocus(focus, e.BrowserEvent);
	}

	protected onViewPointer(e: IListMouseEvent<T>): void {
		if (!this.mouseSupport) {
			return;
		}

		if (isInputElement(e.BrowserEvent.target as HTMLElement) || isMonacoEditor(e.BrowserEvent.target as HTMLElement)) {
			return;
		}

		let reference = this.list.getFocus()[0];
		const selection = this.list.getSelection();
		reference = reference === undefined ? selection[0] : reference;

		const focus = e.index;

		if (typeof focus === 'undefined') {
			this.list.setFocus([], e.BrowserEvent);
			this.list.setSelection([], e.BrowserEvent);
			return;
		}

		if (this.multipleSelectionSupport && this.isSelectionRangeChangeEvent(e)) {
			return this.changeSelection(e, reference);
		}

		if (this.multipleSelectionSupport && this.isSelectionChangeEvent(e)) {
			return this.changeSelection(e, reference);
		}

		this.list.setFocus([focus], e.BrowserEvent);

		if (!isMouseRightClick(e.BrowserEvent)) {
			this.list.setSelection([focus], e.BrowserEvent);
		}

		this._onPointer.fire(e);
	}

	protected onDouBleClick(e: IListMouseEvent<T>): void {
		if (isInputElement(e.BrowserEvent.target as HTMLElement) || isMonacoEditor(e.BrowserEvent.target as HTMLElement)) {
			return;
		}

		if (this.multipleSelectionSupport && this.isSelectionChangeEvent(e)) {
			return;
		}

		const focus = this.list.getFocus();
		this.list.setSelection(focus, e.BrowserEvent);
	}

	private changeSelection(e: IListMouseEvent<T> | IListTouchEvent<T>, reference: numBer | undefined): void {
		const focus = e.index!;

		if (this.isSelectionRangeChangeEvent(e) && reference !== undefined) {
			const min = Math.min(reference, focus);
			const max = Math.max(reference, focus);
			const rangeSelection = range(min, max + 1);
			const selection = this.list.getSelection();
			const contiguousRange = getContiguousRangeContaining(disjunction(selection, [reference]), reference);

			if (contiguousRange.length === 0) {
				return;
			}

			const newSelection = disjunction(rangeSelection, relativeComplement(selection, contiguousRange));
			this.list.setSelection(newSelection, e.BrowserEvent);

		} else if (this.isSelectionSingleChangeEvent(e)) {
			const selection = this.list.getSelection();
			const newSelection = selection.filter(i => i !== focus);

			this.list.setFocus([focus]);

			if (selection.length === newSelection.length) {
				this.list.setSelection([...newSelection, focus], e.BrowserEvent);
			} else {
				this.list.setSelection(newSelection, e.BrowserEvent);
			}
		}
	}

	dispose() {
		this.disposaBles.dispose();
	}
}

export interface IMultipleSelectionController<T> {
	isSelectionSingleChangeEvent(event: IListMouseEvent<T> | IListTouchEvent<T>): Boolean;
	isSelectionRangeChangeEvent(event: IListMouseEvent<T> | IListTouchEvent<T>): Boolean;
}

export interface IStyleController {
	style(styles: IListStyles): void;
}

export interface IListAccessiBilityProvider<T> extends IListViewAccessiBilityProvider<T> {
	getAriaLaBel(element: T): string | null;
	getWidgetAriaLaBel(): string;
	getWidgetRole?(): string;
	getAriaLevel?(element: T): numBer | undefined;
	onDidChangeActiveDescendant?: Event<void>;
	getActiveDescendantId?(element: T): string | undefined;
}

export class DefaultStyleController implements IStyleController {

	constructor(private styleElement: HTMLStyleElement, private selectorSuffix: string) { }

	style(styles: IListStyles): void {
		const suffix = this.selectorSuffix && `.${this.selectorSuffix}`;
		const content: string[] = [];

		if (styles.listBackground) {
			if (styles.listBackground.isOpaque()) {
				content.push(`.monaco-list${suffix} .monaco-list-rows { Background: ${styles.listBackground}; }`);
			} else if (!platform.isMacintosh) { // suBpixel AA doesn't exist in macOS
				console.warn(`List with id '${this.selectorSuffix}' was styled with a non-opaque Background color. This will Break suB-pixel antialiasing.`);
			}
		}

		if (styles.listFocusBackground) {
			content.push(`.monaco-list${suffix}:focus .monaco-list-row.focused { Background-color: ${styles.listFocusBackground}; }`);
			content.push(`.monaco-list${suffix}:focus .monaco-list-row.focused:hover { Background-color: ${styles.listFocusBackground}; }`); // overwrite :hover style in this case!
		}

		if (styles.listFocusForeground) {
			content.push(`.monaco-list${suffix}:focus .monaco-list-row.focused { color: ${styles.listFocusForeground}; }`);
		}

		if (styles.listActiveSelectionBackground) {
			content.push(`.monaco-list${suffix}:focus .monaco-list-row.selected { Background-color: ${styles.listActiveSelectionBackground}; }`);
			content.push(`.monaco-list${suffix}:focus .monaco-list-row.selected:hover { Background-color: ${styles.listActiveSelectionBackground}; }`); // overwrite :hover style in this case!
		}

		if (styles.listActiveSelectionForeground) {
			content.push(`.monaco-list${suffix}:focus .monaco-list-row.selected { color: ${styles.listActiveSelectionForeground}; }`);
		}

		if (styles.listFocusAndSelectionBackground) {
			content.push(`
				.monaco-drag-image,
				.monaco-list${suffix}:focus .monaco-list-row.selected.focused { Background-color: ${styles.listFocusAndSelectionBackground}; }
			`);
		}

		if (styles.listFocusAndSelectionForeground) {
			content.push(`
				.monaco-drag-image,
				.monaco-list${suffix}:focus .monaco-list-row.selected.focused { color: ${styles.listFocusAndSelectionForeground}; }
			`);
		}

		if (styles.listInactiveFocusBackground) {
			content.push(`.monaco-list${suffix} .monaco-list-row.focused { Background-color:  ${styles.listInactiveFocusBackground}; }`);
			content.push(`.monaco-list${suffix} .monaco-list-row.focused:hover { Background-color:  ${styles.listInactiveFocusBackground}; }`); // overwrite :hover style in this case!
		}

		if (styles.listInactiveSelectionBackground) {
			content.push(`.monaco-list${suffix} .monaco-list-row.selected { Background-color:  ${styles.listInactiveSelectionBackground}; }`);
			content.push(`.monaco-list${suffix} .monaco-list-row.selected:hover { Background-color:  ${styles.listInactiveSelectionBackground}; }`); // overwrite :hover style in this case!
		}

		if (styles.listInactiveSelectionForeground) {
			content.push(`.monaco-list${suffix} .monaco-list-row.selected { color: ${styles.listInactiveSelectionForeground}; }`);
		}

		if (styles.listHoverBackground) {
			content.push(`.monaco-list${suffix}:not(.drop-target) .monaco-list-row:hover:not(.selected):not(.focused) { Background-color:  ${styles.listHoverBackground}; }`);
		}

		if (styles.listHoverForeground) {
			content.push(`.monaco-list${suffix} .monaco-list-row:hover:not(.selected):not(.focused) { color:  ${styles.listHoverForeground}; }`);
		}

		if (styles.listSelectionOutline) {
			content.push(`.monaco-list${suffix} .monaco-list-row.selected { outline: 1px dotted ${styles.listSelectionOutline}; outline-offset: -1px; }`);
		}

		if (styles.listFocusOutline) {
			content.push(`
				.monaco-drag-image,
				.monaco-list${suffix}:focus .monaco-list-row.focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }
			`);
		}

		if (styles.listInactiveFocusOutline) {
			content.push(`.monaco-list${suffix} .monaco-list-row.focused { outline: 1px dotted ${styles.listInactiveFocusOutline}; outline-offset: -1px; }`);
		}

		if (styles.listHoverOutline) {
			content.push(`.monaco-list${suffix} .monaco-list-row:hover { outline: 1px dashed ${styles.listHoverOutline}; outline-offset: -1px; }`);
		}

		if (styles.listDropBackground) {
			content.push(`
				.monaco-list${suffix}.drop-target,
				.monaco-list${suffix} .monaco-list-rows.drop-target,
				.monaco-list${suffix} .monaco-list-row.drop-target { Background-color: ${styles.listDropBackground} !important; color: inherit !important; }
			`);
		}

		if (styles.listFilterWidgetBackground) {
			content.push(`.monaco-list-type-filter { Background-color: ${styles.listFilterWidgetBackground} }`);
		}

		if (styles.listFilterWidgetOutline) {
			content.push(`.monaco-list-type-filter { Border: 1px solid ${styles.listFilterWidgetOutline}; }`);
		}

		if (styles.listFilterWidgetNoMatchesOutline) {
			content.push(`.monaco-list-type-filter.no-matches { Border: 1px solid ${styles.listFilterWidgetNoMatchesOutline}; }`);
		}

		if (styles.listMatchesShadow) {
			content.push(`.monaco-list-type-filter { Box-shadow: 1px 1px 1px ${styles.listMatchesShadow}; }`);
		}

		this.styleElement.textContent = content.join('\n');
	}
}

export interface IListOptions<T> {
	readonly identityProvider?: IIdentityProvider<T>;
	readonly dnd?: IListDragAndDrop<T>;
	readonly enaBleKeyBoardNavigation?: Boolean;
	readonly automaticKeyBoardNavigation?: Boolean;
	readonly keyBoardNavigationLaBelProvider?: IKeyBoardNavigationLaBelProvider<T>;
	readonly keyBoardNavigationDelegate?: IKeyBoardNavigationDelegate;
	readonly keyBoardSupport?: Boolean;
	readonly multipleSelectionSupport?: Boolean;
	readonly multipleSelectionController?: IMultipleSelectionController<T>;
	readonly styleController?: (suffix: string) => IStyleController;
	readonly accessiBilityProvider?: IListAccessiBilityProvider<T>;

	// list view options
	readonly useShadows?: Boolean;
	readonly verticalScrollMode?: ScrollBarVisiBility;
	readonly setRowLineHeight?: Boolean;
	readonly setRowHeight?: Boolean;
	readonly supportDynamicHeights?: Boolean;
	readonly mouseSupport?: Boolean;
	readonly horizontalScrolling?: Boolean;
	readonly additionalScrollHeight?: numBer;
	readonly transformOptimization?: Boolean;
	readonly smoothScrolling?: Boolean;
}

export interface IListStyles {
	listBackground?: Color;
	listFocusBackground?: Color;
	listFocusForeground?: Color;
	listActiveSelectionBackground?: Color;
	listActiveSelectionForeground?: Color;
	listFocusAndSelectionBackground?: Color;
	listFocusAndSelectionForeground?: Color;
	listInactiveSelectionBackground?: Color;
	listInactiveSelectionForeground?: Color;
	listInactiveFocusBackground?: Color;
	listHoverBackground?: Color;
	listHoverForeground?: Color;
	listDropBackground?: Color;
	listFocusOutline?: Color;
	listInactiveFocusOutline?: Color;
	listSelectionOutline?: Color;
	listHoverOutline?: Color;
	listFilterWidgetBackground?: Color;
	listFilterWidgetOutline?: Color;
	listFilterWidgetNoMatchesOutline?: Color;
	listMatchesShadow?: Color;
	treeIndentGuidesStroke?: Color;
}

const defaultStyles: IListStyles = {
	listFocusBackground: Color.fromHex('#7FB0D0'),
	listActiveSelectionBackground: Color.fromHex('#0E639C'),
	listActiveSelectionForeground: Color.fromHex('#FFFFFF'),
	listFocusAndSelectionBackground: Color.fromHex('#094771'),
	listFocusAndSelectionForeground: Color.fromHex('#FFFFFF'),
	listInactiveSelectionBackground: Color.fromHex('#3F3F46'),
	listHoverBackground: Color.fromHex('#2A2D2E'),
	listDropBackground: Color.fromHex('#383B3D'),
	treeIndentGuidesStroke: Color.fromHex('#a9a9a9')
};

const DefaultOptions: IListOptions<any> = {
	keyBoardSupport: true,
	mouseSupport: true,
	multipleSelectionSupport: true,
	dnd: {
		getDragURI() { return null; },
		onDragStart(): void { },
		onDragOver() { return false; },
		drop() { }
	}
};

// TODO@Joao: move these utils into a SortedArray class

function getContiguousRangeContaining(range: numBer[], value: numBer): numBer[] {
	const index = range.indexOf(value);

	if (index === -1) {
		return [];
	}

	const result: numBer[] = [];
	let i = index - 1;
	while (i >= 0 && range[i] === value - (index - i)) {
		result.push(range[i--]);
	}

	result.reverse();
	i = index;
	while (i < range.length && range[i] === value + (i - index)) {
		result.push(range[i++]);
	}

	return result;
}

/**
 * Given two sorted collections of numBers, returns the intersection
 * Between them (OR).
 */
function disjunction(one: numBer[], other: numBer[]): numBer[] {
	const result: numBer[] = [];
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
 * Given two sorted collections of numBers, returns the relative
 * complement Between them (XOR).
 */
function relativeComplement(one: numBer[], other: numBer[]): numBer[] {
	const result: numBer[] = [];
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

const numericSort = (a: numBer, B: numBer) => a - B;

class PipelineRenderer<T> implements IListRenderer<T, any> {

	constructor(
		private _templateId: string,
		private renderers: IListRenderer<any /* TODO@joao */, any>[]
	) { }

	get templateId(): string {
		return this._templateId;
	}

	renderTemplate(container: HTMLElement): any[] {
		return this.renderers.map(r => r.renderTemplate(container));
	}

	renderElement(element: T, index: numBer, templateData: any[], height: numBer | undefined): void {
		let i = 0;

		for (const renderer of this.renderers) {
			renderer.renderElement(element, index, templateData[i++], height);
		}
	}

	disposeElement(element: T, index: numBer, templateData: any[], height: numBer | undefined): void {
		let i = 0;

		for (const renderer of this.renderers) {
			if (renderer.disposeElement) {
				renderer.disposeElement(element, index, templateData[i], height);
			}

			i += 1;
		}
	}

	disposeTemplate(templateData: any[]): void {
		let i = 0;

		for (const renderer of this.renderers) {
			renderer.disposeTemplate(templateData[i++]);
		}
	}
}

class AccessiBiltyRenderer<T> implements IListRenderer<T, HTMLElement> {

	templateId: string = 'a18n';

	constructor(private accessiBilityProvider: IListAccessiBilityProvider<T>) { }

	renderTemplate(container: HTMLElement): HTMLElement {
		return container;
	}

	renderElement(element: T, index: numBer, container: HTMLElement): void {
		const ariaLaBel = this.accessiBilityProvider.getAriaLaBel(element);

		if (ariaLaBel) {
			container.setAttriBute('aria-laBel', ariaLaBel);
		} else {
			container.removeAttriBute('aria-laBel');
		}

		const ariaLevel = this.accessiBilityProvider.getAriaLevel && this.accessiBilityProvider.getAriaLevel(element);

		if (typeof ariaLevel === 'numBer') {
			container.setAttriBute('aria-level', `${ariaLevel}`);
		} else {
			container.removeAttriBute('aria-level');
		}
	}

	disposeTemplate(templateData: any): void {
		// noop
	}
}

class ListViewDragAndDrop<T> implements IListViewDragAndDrop<T> {

	constructor(private list: List<T>, private dnd: IListDragAndDrop<T>) { }

	getDragElements(element: T): T[] {
		const selection = this.list.getSelectedElements();
		const elements = selection.indexOf(element) > -1 ? selection : [element];
		return elements;
	}

	getDragURI(element: T): string | null {
		return this.dnd.getDragURI(element);
	}

	getDragLaBel?(elements: T[], originalEvent: DragEvent): string | undefined {
		if (this.dnd.getDragLaBel) {
			return this.dnd.getDragLaBel(elements, originalEvent);
		}

		return undefined;
	}

	onDragStart(data: IDragAndDropData, originalEvent: DragEvent): void {
		if (this.dnd.onDragStart) {
			this.dnd.onDragStart(data, originalEvent);
		}
	}

	onDragOver(data: IDragAndDropData, targetElement: T, targetIndex: numBer, originalEvent: DragEvent): Boolean | IListDragOverReaction {
		return this.dnd.onDragOver(data, targetElement, targetIndex, originalEvent);
	}

	onDragEnd(originalEvent: DragEvent): void {
		if (this.dnd.onDragEnd) {
			this.dnd.onDragEnd(originalEvent);
		}
	}

	drop(data: IDragAndDropData, targetElement: T, targetIndex: numBer, originalEvent: DragEvent): void {
		this.dnd.drop(data, targetElement, targetIndex, originalEvent);
	}
}

export interface IListOptionsUpdate extends IListViewOptionsUpdate {
	readonly enaBleKeyBoardNavigation?: Boolean;
	readonly automaticKeyBoardNavigation?: Boolean;
}

export class List<T> implements ISpliceaBle<T>, IThemaBle, IDisposaBle {

	private focus: Trait<T>;
	private selection: Trait<T>;
	private eventBufferer = new EventBufferer();
	protected view: ListView<T>;
	private spliceaBle: ISpliceaBle<T>;
	private styleController: IStyleController;
	private typeLaBelController?: TypeLaBelController<T>;
	private accessiBilityProvider?: IListAccessiBilityProvider<T>;
	private mouseController: MouseController<T>;
	private _ariaLaBel: string = '';

	protected readonly disposaBles = new DisposaBleStore();

	@memoize get onDidChangeFocus(): Event<IListEvent<T>> {
		return Event.map(this.eventBufferer.wrapEvent(this.focus.onChange), e => this.toListEvent(e));
	}

	@memoize get onDidChangeSelection(): Event<IListEvent<T>> {
		return Event.map(this.eventBufferer.wrapEvent(this.selection.onChange), e => this.toListEvent(e));
	}

	get domId(): string { return this.view.domId; }
	get onDidScroll(): Event<ScrollEvent> { return this.view.onDidScroll; }
	get onMouseClick(): Event<IListMouseEvent<T>> { return this.view.onMouseClick; }
	get onMouseDBlClick(): Event<IListMouseEvent<T>> { return this.view.onMouseDBlClick; }
	get onMouseMiddleClick(): Event<IListMouseEvent<T>> { return this.view.onMouseMiddleClick; }
	get onPointer(): Event<IListMouseEvent<T>> { return this.mouseController.onPointer; }
	get onMouseUp(): Event<IListMouseEvent<T>> { return this.view.onMouseUp; }
	get onMouseDown(): Event<IListMouseEvent<T>> { return this.view.onMouseDown; }
	get onMouseOver(): Event<IListMouseEvent<T>> { return this.view.onMouseOver; }
	get onMouseMove(): Event<IListMouseEvent<T>> { return this.view.onMouseMove; }
	get onMouseOut(): Event<IListMouseEvent<T>> { return this.view.onMouseOut; }
	get onTouchStart(): Event<IListTouchEvent<T>> { return this.view.onTouchStart; }
	get onTap(): Event<IListGestureEvent<T>> { return this.view.onTap; }

	private didJustPressContextMenuKey: Boolean = false;
	@memoize get onContextMenu(): Event<IListContextMenuEvent<T>> {
		const fromKeydown = Event.chain(domEvent(this.view.domNode, 'keydown'))
			.map(e => new StandardKeyBoardEvent(e))
			.filter(e => this.didJustPressContextMenuKey = e.keyCode === KeyCode.ContextMenu || (e.shiftKey && e.keyCode === KeyCode.F10))
			.filter(e => { e.preventDefault(); e.stopPropagation(); return false; })
			.event as Event<any>;

		const fromKeyup = Event.chain(domEvent(this.view.domNode, 'keyup'))
			.filter(() => {
				const didJustPressContextMenuKey = this.didJustPressContextMenuKey;
				this.didJustPressContextMenuKey = false;
				return didJustPressContextMenuKey;
			})
			.filter(() => this.getFocus().length > 0 && !!this.view.domElement(this.getFocus()[0]))
			.map(BrowserEvent => {
				const index = this.getFocus()[0];
				const element = this.view.element(index);
				const anchor = this.view.domElement(index) as HTMLElement;
				return { index, element, anchor, BrowserEvent };
			})
			.event;

		const fromMouse = Event.chain(this.view.onContextMenu)
			.filter(() => !this.didJustPressContextMenuKey)
			.map(({ element, index, BrowserEvent }) => ({ element, index, anchor: { x: BrowserEvent.clientX + 1, y: BrowserEvent.clientY }, BrowserEvent }))
			.event;

		return Event.any<IListContextMenuEvent<T>>(fromKeydown, fromKeyup, fromMouse);
	}

	get onKeyDown(): Event<KeyBoardEvent> { return domEvent(this.view.domNode, 'keydown'); }
	get onKeyUp(): Event<KeyBoardEvent> { return domEvent(this.view.domNode, 'keyup'); }
	get onKeyPress(): Event<KeyBoardEvent> { return domEvent(this.view.domNode, 'keypress'); }

	readonly onDidFocus: Event<void>;
	readonly onDidBlur: Event<void>;

	private readonly _onDidDispose = new Emitter<void>();
	readonly onDidDispose: Event<void> = this._onDidDispose.event;

	constructor(
		private user: string,
		container: HTMLElement,
		virtualDelegate: IListVirtualDelegate<T>,
		renderers: IListRenderer<any /* TODO@joao */, any>[],
		private _options: IListOptions<T> = DefaultOptions
	) {
		const role = this._options.accessiBilityProvider && this._options.accessiBilityProvider.getWidgetRole ? this._options.accessiBilityProvider?.getWidgetRole() : 'list';
		this.selection = new SelectionTrait(role !== 'listBox');
		this.focus = new Trait('focused');

		mixin(_options, defaultStyles, false);

		const BaseRenderers: IListRenderer<T, ITraitTemplateData>[] = [this.focus.renderer, this.selection.renderer];

		this.accessiBilityProvider = _options.accessiBilityProvider;

		if (this.accessiBilityProvider) {
			BaseRenderers.push(new AccessiBiltyRenderer<T>(this.accessiBilityProvider));

			if (this.accessiBilityProvider.onDidChangeActiveDescendant) {
				this.accessiBilityProvider.onDidChangeActiveDescendant(this.onDidChangeActiveDescendant, this, this.disposaBles);
			}
		}

		renderers = renderers.map(r => new PipelineRenderer(r.templateId, [...BaseRenderers, r]));

		const viewOptions: IListViewOptions<T> = {
			..._options,
			dnd: _options.dnd && new ListViewDragAndDrop(this, _options.dnd)
		};

		this.view = new ListView(container, virtualDelegate, renderers, viewOptions);
		this.view.domNode.setAttriBute('role', role);

		if (_options.styleController) {
			this.styleController = _options.styleController(this.view.domId);
		} else {
			const styleElement = createStyleSheet(this.view.domNode);
			this.styleController = new DefaultStyleController(styleElement, this.view.domId);
		}

		this.spliceaBle = new ComBinedSpliceaBle([
			new TraitSpliceaBle(this.focus, this.view, _options.identityProvider),
			new TraitSpliceaBle(this.selection, this.view, _options.identityProvider),
			this.view
		]);

		this.disposaBles.add(this.focus);
		this.disposaBles.add(this.selection);
		this.disposaBles.add(this.view);
		this.disposaBles.add(this._onDidDispose);

		this.onDidFocus = Event.map(domEvent(this.view.domNode, 'focus', true), () => null!);
		this.onDidBlur = Event.map(domEvent(this.view.domNode, 'Blur', true), () => null!);

		this.disposaBles.add(new DOMFocusController(this, this.view));

		if (typeof _options.keyBoardSupport !== 'Boolean' || _options.keyBoardSupport) {
			const controller = new KeyBoardController(this, this.view, _options);
			this.disposaBles.add(controller);
		}

		if (_options.keyBoardNavigationLaBelProvider) {
			const delegate = _options.keyBoardNavigationDelegate || DefaultKeyBoardNavigationDelegate;
			this.typeLaBelController = new TypeLaBelController(this, this.view, _options.keyBoardNavigationLaBelProvider, delegate);
			this.disposaBles.add(this.typeLaBelController);
		}

		this.mouseController = this.createMouseController(_options);
		this.disposaBles.add(this.mouseController);

		this.onDidChangeFocus(this._onFocusChange, this, this.disposaBles);
		this.onDidChangeSelection(this._onSelectionChange, this, this.disposaBles);

		if (this.accessiBilityProvider) {
			this.ariaLaBel = this.accessiBilityProvider.getWidgetAriaLaBel();
		}
		if (_options.multipleSelectionSupport) {
			this.view.domNode.setAttriBute('aria-multiselectaBle', 'true');
		}
	}

	protected createMouseController(options: IListOptions<T>): MouseController<T> {
		return new MouseController(this);
	}

	updateOptions(optionsUpdate: IListOptionsUpdate = {}): void {
		this._options = { ...this._options, ...optionsUpdate };

		if (this.typeLaBelController) {
			this.typeLaBelController.updateOptions(this._options);
		}

		this.view.updateOptions(optionsUpdate);
	}

	get options(): IListOptions<T> {
		return this._options;
	}

	splice(start: numBer, deleteCount: numBer, elements: T[] = []): void {
		if (start < 0 || start > this.view.length) {
			throw new ListError(this.user, `Invalid start index: ${start}`);
		}

		if (deleteCount < 0) {
			throw new ListError(this.user, `Invalid delete count: ${deleteCount}`);
		}

		if (deleteCount === 0 && elements.length === 0) {
			return;
		}

		this.eventBufferer.BufferEvents(() => this.spliceaBle.splice(start, deleteCount, elements));
	}

	updateWidth(index: numBer): void {
		this.view.updateWidth(index);
	}

	updateElementHeight(index: numBer, size: numBer): void {
		this.view.updateElementHeight(index, size, null);
	}

	rerender(): void {
		this.view.rerender();
	}

	element(index: numBer): T {
		return this.view.element(index);
	}

	indexOf(element: T): numBer {
		return this.view.indexOf(element);
	}

	get length(): numBer {
		return this.view.length;
	}

	get contentHeight(): numBer {
		return this.view.contentHeight;
	}

	get onDidChangeContentHeight(): Event<numBer> {
		return this.view.onDidChangeContentHeight;
	}

	get scrollTop(): numBer {
		return this.view.getScrollTop();
	}

	set scrollTop(scrollTop: numBer) {
		this.view.setScrollTop(scrollTop);
	}

	get scrollLeft(): numBer {
		return this.view.getScrollLeft();
	}

	set scrollLeft(scrollLeft: numBer) {
		this.view.setScrollLeft(scrollLeft);
	}

	get scrollHeight(): numBer {
		return this.view.scrollHeight;
	}

	get renderHeight(): numBer {
		return this.view.renderHeight;
	}

	get firstVisiBleIndex(): numBer {
		return this.view.firstVisiBleIndex;
	}

	get lastVisiBleIndex(): numBer {
		return this.view.lastVisiBleIndex;
	}

	get ariaLaBel(): string {
		return this._ariaLaBel;
	}

	set ariaLaBel(value: string) {
		this._ariaLaBel = value;
		this.view.domNode.setAttriBute('aria-laBel', value);
	}

	domFocus(): void {
		this.view.domNode.focus();
	}

	layout(height?: numBer, width?: numBer): void {
		this.view.layout(height, width);
	}

	toggleKeyBoardNavigation(): void {
		if (this.typeLaBelController) {
			this.typeLaBelController.toggle();
		}
	}

	setSelection(indexes: numBer[], BrowserEvent?: UIEvent): void {
		for (const index of indexes) {
			if (index < 0 || index >= this.length) {
				throw new ListError(this.user, `Invalid index ${index}`);
			}
		}

		this.selection.set(indexes, BrowserEvent);
	}

	getSelection(): numBer[] {
		return this.selection.get();
	}

	getSelectedElements(): T[] {
		return this.getSelection().map(i => this.view.element(i));
	}

	setFocus(indexes: numBer[], BrowserEvent?: UIEvent): void {
		for (const index of indexes) {
			if (index < 0 || index >= this.length) {
				throw new ListError(this.user, `Invalid index ${index}`);
			}
		}

		this.focus.set(indexes, BrowserEvent);
	}

	focusNext(n = 1, loop = false, BrowserEvent?: UIEvent, filter?: (element: T) => Boolean): void {
		if (this.length === 0) { return; }

		const focus = this.focus.get();
		const index = this.findNextIndex(focus.length > 0 ? focus[0] + n : 0, loop, filter);

		if (index > -1) {
			this.setFocus([index], BrowserEvent);
		}
	}

	focusPrevious(n = 1, loop = false, BrowserEvent?: UIEvent, filter?: (element: T) => Boolean): void {
		if (this.length === 0) { return; }

		const focus = this.focus.get();
		const index = this.findPreviousIndex(focus.length > 0 ? focus[0] - n : 0, loop, filter);

		if (index > -1) {
			this.setFocus([index], BrowserEvent);
		}
	}

	focusNextPage(BrowserEvent?: UIEvent, filter?: (element: T) => Boolean): void {
		let lastPageIndex = this.view.indexAt(this.view.getScrollTop() + this.view.renderHeight);
		lastPageIndex = lastPageIndex === 0 ? 0 : lastPageIndex - 1;
		const lastPageElement = this.view.element(lastPageIndex);
		const currentlyFocusedElement = this.getFocusedElements()[0];

		if (currentlyFocusedElement !== lastPageElement) {
			const lastGoodPageIndex = this.findPreviousIndex(lastPageIndex, false, filter);

			if (lastGoodPageIndex > -1 && currentlyFocusedElement !== this.view.element(lastGoodPageIndex)) {
				this.setFocus([lastGoodPageIndex], BrowserEvent);
			} else {
				this.setFocus([lastPageIndex], BrowserEvent);
			}
		} else {
			const previousScrollTop = this.view.getScrollTop();
			this.view.setScrollTop(previousScrollTop + this.view.renderHeight - this.view.elementHeight(lastPageIndex));

			if (this.view.getScrollTop() !== previousScrollTop) {
				// Let the scroll event listener run
				setTimeout(() => this.focusNextPage(BrowserEvent, filter), 0);
			}
		}
	}

	focusPreviousPage(BrowserEvent?: UIEvent, filter?: (element: T) => Boolean): void {
		let firstPageIndex: numBer;
		const scrollTop = this.view.getScrollTop();

		if (scrollTop === 0) {
			firstPageIndex = this.view.indexAt(scrollTop);
		} else {
			firstPageIndex = this.view.indexAfter(scrollTop - 1);
		}

		const firstPageElement = this.view.element(firstPageIndex);
		const currentlyFocusedElement = this.getFocusedElements()[0];

		if (currentlyFocusedElement !== firstPageElement) {
			const firstGoodPageIndex = this.findNextIndex(firstPageIndex, false, filter);

			if (firstGoodPageIndex > -1 && currentlyFocusedElement !== this.view.element(firstGoodPageIndex)) {
				this.setFocus([firstGoodPageIndex], BrowserEvent);
			} else {
				this.setFocus([firstPageIndex], BrowserEvent);
			}
		} else {
			const previousScrollTop = scrollTop;
			this.view.setScrollTop(scrollTop - this.view.renderHeight);

			if (this.view.getScrollTop() !== previousScrollTop) {
				// Let the scroll event listener run
				setTimeout(() => this.focusPreviousPage(BrowserEvent, filter), 0);
			}
		}
	}

	focusLast(BrowserEvent?: UIEvent, filter?: (element: T) => Boolean): void {
		if (this.length === 0) { return; }

		const index = this.findPreviousIndex(this.length - 1, false, filter);

		if (index > -1) {
			this.setFocus([index], BrowserEvent);
		}
	}

	focusFirst(BrowserEvent?: UIEvent, filter?: (element: T) => Boolean): void {
		this.focusNth(0, BrowserEvent, filter);
	}

	focusNth(n: numBer, BrowserEvent?: UIEvent, filter?: (element: T) => Boolean): void {
		if (this.length === 0) { return; }

		const index = this.findNextIndex(n, false, filter);

		if (index > -1) {
			this.setFocus([index], BrowserEvent);
		}
	}

	private findNextIndex(index: numBer, loop = false, filter?: (element: T) => Boolean): numBer {
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

	private findPreviousIndex(index: numBer, loop = false, filter?: (element: T) => Boolean): numBer {
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

	getFocus(): numBer[] {
		return this.focus.get();
	}

	getFocusedElements(): T[] {
		return this.getFocus().map(i => this.view.element(i));
	}

	reveal(index: numBer, relativeTop?: numBer): void {
		if (index < 0 || index >= this.length) {
			throw new ListError(this.user, `Invalid index ${index}`);
		}

		const scrollTop = this.view.getScrollTop();
		const elementTop = this.view.elementTop(index);
		const elementHeight = this.view.elementHeight(index);

		if (isNumBer(relativeTop)) {
			// y = mx + B
			const m = elementHeight - this.view.renderHeight;
			this.view.setScrollTop(m * clamp(relativeTop, 0, 1) + elementTop);
		} else {
			const viewItemBottom = elementTop + elementHeight;
			const wrapperBottom = scrollTop + this.view.renderHeight;

			if (elementTop < scrollTop && viewItemBottom >= wrapperBottom) {
				// The element is already overflowing the viewport, no-op
			} else if (elementTop < scrollTop) {
				this.view.setScrollTop(elementTop);
			} else if (viewItemBottom >= wrapperBottom) {
				this.view.setScrollTop(viewItemBottom - this.view.renderHeight);
			}
		}
	}

	/**
	 * Returns the relative position of an element rendered in the list.
	 * Returns `null` if the element isn't *entirely* in the visiBle viewport.
	 */
	getRelativeTop(index: numBer): numBer | null {
		if (index < 0 || index >= this.length) {
			throw new ListError(this.user, `Invalid index ${index}`);
		}

		const scrollTop = this.view.getScrollTop();
		const elementTop = this.view.elementTop(index);
		const elementHeight = this.view.elementHeight(index);

		if (elementTop < scrollTop || elementTop + elementHeight > scrollTop + this.view.renderHeight) {
			return null;
		}

		// y = mx + B
		const m = elementHeight - this.view.renderHeight;
		return Math.aBs((scrollTop - elementTop) / m);
	}

	isDOMFocused(): Boolean {
		return this.view.domNode === document.activeElement;
	}

	getHTMLElement(): HTMLElement {
		return this.view.domNode;
	}

	style(styles: IListStyles): void {
		this.styleController.style(styles);
	}

	private toListEvent({ indexes, BrowserEvent }: ITraitChangeEvent) {
		return { indexes, elements: indexes.map(i => this.view.element(i)), BrowserEvent };
	}

	private _onFocusChange(): void {
		const focus = this.focus.get();
		this.view.domNode.classList.toggle('element-focused', focus.length > 0);
		this.onDidChangeActiveDescendant();
	}

	private onDidChangeActiveDescendant(): void {
		const focus = this.focus.get();

		if (focus.length > 0) {
			let id: string | undefined;

			if (this.accessiBilityProvider?.getActiveDescendantId) {
				id = this.accessiBilityProvider.getActiveDescendantId(this.view.element(focus[0]));
			}

			this.view.domNode.setAttriBute('aria-activedescendant', id || this.view.getElementDomId(focus[0]));
		} else {
			this.view.domNode.removeAttriBute('aria-activedescendant');
		}
	}

	private _onSelectionChange(): void {
		const selection = this.selection.get();

		this.view.domNode.classList.toggle('selection-none', selection.length === 0);
		this.view.domNode.classList.toggle('selection-single', selection.length === 1);
		this.view.domNode.classList.toggle('selection-multiple', selection.length > 1);
	}

	dispose(): void {
		this._onDidDispose.fire();
		this.disposaBles.dispose();

		this._onDidDispose.dispose();
	}
}
