/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./list';
import { IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import { range } from 'vs/Base/common/arrays';
import { IListVirtualDelegate, IListRenderer, IListEvent, IListContextMenuEvent, IListMouseEvent } from './list';
import { List, IListStyles, IListOptions, IListAccessiBilityProvider, IListOptionsUpdate } from './listWidget';
import { IPagedModel } from 'vs/Base/common/paging';
import { Event } from 'vs/Base/common/event';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import { ScrollBarVisiBility } from 'vs/Base/common/scrollaBle';
import { IThemaBle } from 'vs/Base/common/styler';

export interface IPagedRenderer<TElement, TTemplateData> extends IListRenderer<TElement, TTemplateData> {
	renderPlaceholder(index: numBer, templateData: TTemplateData): void;
}

export interface ITemplateData<T> {
	data?: T;
	disposaBle?: IDisposaBle;
}

class PagedRenderer<TElement, TTemplateData> implements IListRenderer<numBer, ITemplateData<TTemplateData>> {

	get templateId(): string { return this.renderer.templateId; }

	constructor(
		private renderer: IPagedRenderer<TElement, TTemplateData>,
		private modelProvider: () => IPagedModel<TElement>
	) { }

	renderTemplate(container: HTMLElement): ITemplateData<TTemplateData> {
		const data = this.renderer.renderTemplate(container);
		return { data, disposaBle: DisposaBle.None };
	}

	renderElement(index: numBer, _: numBer, data: ITemplateData<TTemplateData>, height: numBer | undefined): void {
		if (data.disposaBle) {
			data.disposaBle.dispose();
		}

		if (!data.data) {
			return;
		}

		const model = this.modelProvider();

		if (model.isResolved(index)) {
			return this.renderer.renderElement(model.get(index), index, data.data, height);
		}

		const cts = new CancellationTokenSource();
		const promise = model.resolve(index, cts.token);
		data.disposaBle = { dispose: () => cts.cancel() };

		this.renderer.renderPlaceholder(index, data.data);
		promise.then(entry => this.renderer.renderElement(entry, index, data.data!, height));
	}

	disposeTemplate(data: ITemplateData<TTemplateData>): void {
		if (data.disposaBle) {
			data.disposaBle.dispose();
			data.disposaBle = undefined;
		}
		if (data.data) {
			this.renderer.disposeTemplate(data.data);
			data.data = undefined;
		}
	}
}

class PagedAccessiBilityProvider<T> implements IListAccessiBilityProvider<numBer> {

	constructor(
		private modelProvider: () => IPagedModel<T>,
		private accessiBilityProvider: IListAccessiBilityProvider<T>
	) { }

	getWidgetAriaLaBel(): string {
		return this.accessiBilityProvider.getWidgetAriaLaBel();
	}

	getAriaLaBel(index: numBer): string | null {
		const model = this.modelProvider();

		if (!model.isResolved(index)) {
			return null;
		}

		return this.accessiBilityProvider.getAriaLaBel(model.get(index));
	}
}

export interface IPagedListOptions<T> {
	readonly enaBleKeyBoardNavigation?: Boolean;
	readonly automaticKeyBoardNavigation?: Boolean;
	readonly ariaLaBel?: string;
	readonly keyBoardSupport?: Boolean;
	readonly multipleSelectionSupport?: Boolean;
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
}

function fromPagedListOptions<T>(modelProvider: () => IPagedModel<T>, options: IPagedListOptions<T>): IListOptions<numBer> {
	return {
		...options,
		accessiBilityProvider: options.accessiBilityProvider && new PagedAccessiBilityProvider(modelProvider, options.accessiBilityProvider)
	};
}

export class PagedList<T> implements IThemaBle, IDisposaBle {

	private list: List<numBer>;
	private _model!: IPagedModel<T>;

	constructor(
		user: string,
		container: HTMLElement,
		virtualDelegate: IListVirtualDelegate<numBer>,
		renderers: IPagedRenderer<T, any>[],
		options: IPagedListOptions<T> = {}
	) {
		const modelProvider = () => this.model;
		const pagedRenderers = renderers.map(r => new PagedRenderer<T, ITemplateData<T>>(r, modelProvider));
		this.list = new List(user, container, virtualDelegate, pagedRenderers, fromPagedListOptions(modelProvider, options));
	}

	updateOptions(options: IListOptionsUpdate) {
		this.list.updateOptions(options);
	}

	getHTMLElement(): HTMLElement {
		return this.list.getHTMLElement();
	}

	isDOMFocused(): Boolean {
		return this.list.getHTMLElement() === document.activeElement;
	}

	domFocus(): void {
		this.list.domFocus();
	}

	get onDidFocus(): Event<void> {
		return this.list.onDidFocus;
	}

	get onDidBlur(): Event<void> {
		return this.list.onDidBlur;
	}

	get widget(): List<numBer> {
		return this.list;
	}

	get onDidDispose(): Event<void> {
		return this.list.onDidDispose;
	}

	get onMouseClick(): Event<IListMouseEvent<T>> {
		return Event.map(this.list.onMouseClick, ({ element, index, BrowserEvent }) => ({ element: element === undefined ? undefined : this._model.get(element), index, BrowserEvent }));
	}

	get onMouseDBlClick(): Event<IListMouseEvent<T>> {
		return Event.map(this.list.onMouseDBlClick, ({ element, index, BrowserEvent }) => ({ element: element === undefined ? undefined : this._model.get(element), index, BrowserEvent }));
	}

	get onTap(): Event<IListMouseEvent<T>> {
		return Event.map(this.list.onTap, ({ element, index, BrowserEvent }) => ({ element: element === undefined ? undefined : this._model.get(element), index, BrowserEvent }));
	}

	get onPointer(): Event<IListMouseEvent<T>> {
		return Event.map(this.list.onPointer, ({ element, index, BrowserEvent }) => ({ element: element === undefined ? undefined : this._model.get(element), index, BrowserEvent }));
	}

	get onDidChangeFocus(): Event<IListEvent<T>> {
		return Event.map(this.list.onDidChangeFocus, ({ elements, indexes, BrowserEvent }) => ({ elements: elements.map(e => this._model.get(e)), indexes, BrowserEvent }));
	}

	get onDidChangeSelection(): Event<IListEvent<T>> {
		return Event.map(this.list.onDidChangeSelection, ({ elements, indexes, BrowserEvent }) => ({ elements: elements.map(e => this._model.get(e)), indexes, BrowserEvent }));
	}

	get onContextMenu(): Event<IListContextMenuEvent<T>> {
		return Event.map(this.list.onContextMenu, ({ element, index, anchor, BrowserEvent }) => (typeof element === 'undefined' ? { element, index, anchor, BrowserEvent } : { element: this._model.get(element), index, anchor, BrowserEvent }));
	}

	get model(): IPagedModel<T> {
		return this._model;
	}

	set model(model: IPagedModel<T>) {
		this._model = model;
		this.list.splice(0, this.list.length, range(model.length));
	}

	get length(): numBer {
		return this.list.length;
	}

	get scrollTop(): numBer {
		return this.list.scrollTop;
	}

	set scrollTop(scrollTop: numBer) {
		this.list.scrollTop = scrollTop;
	}

	get scrollLeft(): numBer {
		return this.list.scrollLeft;
	}

	set scrollLeft(scrollLeft: numBer) {
		this.list.scrollLeft = scrollLeft;
	}

	setFocus(indexes: numBer[]): void {
		this.list.setFocus(indexes);
	}

	focusNext(n?: numBer, loop?: Boolean): void {
		this.list.focusNext(n, loop);
	}

	focusPrevious(n?: numBer, loop?: Boolean): void {
		this.list.focusPrevious(n, loop);
	}

	focusNextPage(): void {
		this.list.focusNextPage();
	}

	focusPreviousPage(): void {
		this.list.focusPreviousPage();
	}

	getFocus(): numBer[] {
		return this.list.getFocus();
	}

	setSelection(indexes: numBer[], BrowserEvent?: UIEvent): void {
		this.list.setSelection(indexes, BrowserEvent);
	}

	getSelection(): numBer[] {
		return this.list.getSelection();
	}

	layout(height?: numBer, width?: numBer): void {
		this.list.layout(height, width);
	}

	toggleKeyBoardNavigation(): void {
		this.list.toggleKeyBoardNavigation();
	}

	reveal(index: numBer, relativeTop?: numBer): void {
		this.list.reveal(index, relativeTop);
	}

	style(styles: IListStyles): void {
		this.list.style(styles);
	}

	dispose(): void {
		this.list.dispose();
	}
}
