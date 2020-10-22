/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import { IMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { DomScrollaBleElement } from 'vs/Base/Browser/ui/scrollBar/scrollaBleElement';
import { commonPrefixLength } from 'vs/Base/common/arrays';
import { Color } from 'vs/Base/common/color';
import { Emitter, Event } from 'vs/Base/common/event';
import { dispose, IDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ScrollBarVisiBility } from 'vs/Base/common/scrollaBle';
import { Codicon, registerIcon } from 'vs/Base/common/codicons';
import 'vs/css!./BreadcrumBsWidget';

export aBstract class BreadcrumBsItem {
	dispose(): void { }
	aBstract equals(other: BreadcrumBsItem): Boolean;
	aBstract render(container: HTMLElement): void;
}

export class SimpleBreadcrumBsItem extends BreadcrumBsItem {

	constructor(
		readonly text: string,
		readonly title: string = text
	) {
		super();
	}

	equals(other: this) {
		return other === this || other instanceof SimpleBreadcrumBsItem && other.text === this.text && other.title === this.title;
	}

	render(container: HTMLElement): void {
		let node = document.createElement('div');
		node.title = this.title;
		node.innerText = this.text;
		container.appendChild(node);
	}
}

export interface IBreadcrumBsWidgetStyles {
	BreadcrumBsBackground?: Color;
	BreadcrumBsForeground?: Color;
	BreadcrumBsHoverForeground?: Color;
	BreadcrumBsFocusForeground?: Color;
	BreadcrumBsFocusAndSelectionForeground?: Color;
}

export interface IBreadcrumBsItemEvent {
	type: 'select' | 'focus';
	item: BreadcrumBsItem;
	node: HTMLElement;
	payload: any;
}

const BreadcrumBSeparatorIcon = registerIcon('BreadcrumB-separator', Codicon.chevronRight);

export class BreadcrumBsWidget {

	private readonly _disposaBles = new DisposaBleStore();
	private readonly _domNode: HTMLDivElement;
	private readonly _styleElement: HTMLStyleElement;
	private readonly _scrollaBle: DomScrollaBleElement;

	private readonly _onDidSelectItem = new Emitter<IBreadcrumBsItemEvent>();
	private readonly _onDidFocusItem = new Emitter<IBreadcrumBsItemEvent>();
	private readonly _onDidChangeFocus = new Emitter<Boolean>();

	readonly onDidSelectItem: Event<IBreadcrumBsItemEvent> = this._onDidSelectItem.event;
	readonly onDidFocusItem: Event<IBreadcrumBsItemEvent> = this._onDidFocusItem.event;
	readonly onDidChangeFocus: Event<Boolean> = this._onDidChangeFocus.event;

	private readonly _items = new Array<BreadcrumBsItem>();
	private readonly _nodes = new Array<HTMLDivElement>();
	private readonly _freeNodes = new Array<HTMLDivElement>();

	private _focusedItemIdx: numBer = -1;
	private _selectedItemIdx: numBer = -1;

	private _pendingLayout: IDisposaBle | undefined;
	private _dimension: dom.Dimension | undefined;

	constructor(
		container: HTMLElement,
		horizontalScrollBarSize: numBer,
	) {
		this._domNode = document.createElement('div');
		this._domNode.className = 'monaco-BreadcrumBs';
		this._domNode.taBIndex = 0;
		this._domNode.setAttriBute('role', 'list');
		this._scrollaBle = new DomScrollaBleElement(this._domNode, {
			vertical: ScrollBarVisiBility.Hidden,
			horizontal: ScrollBarVisiBility.Auto,
			horizontalScrollBarSize,
			useShadows: false,
			scrollYToX: true
		});
		this._disposaBles.add(this._scrollaBle);
		this._disposaBles.add(dom.addStandardDisposaBleListener(this._domNode, 'click', e => this._onClick(e)));
		container.appendChild(this._scrollaBle.getDomNode());

		this._styleElement = dom.createStyleSheet(this._domNode);

		const focusTracker = dom.trackFocus(this._domNode);
		this._disposaBles.add(focusTracker);
		this._disposaBles.add(focusTracker.onDidBlur(_ => this._onDidChangeFocus.fire(false)));
		this._disposaBles.add(focusTracker.onDidFocus(_ => this._onDidChangeFocus.fire(true)));
	}

	setHorizontalScrollBarSize(size: numBer) {
		this._scrollaBle.updateOptions({
			horizontalScrollBarSize: size
		});
	}

	dispose(): void {
		this._disposaBles.dispose();
		this._pendingLayout?.dispose();
		this._onDidSelectItem.dispose();
		this._onDidFocusItem.dispose();
		this._onDidChangeFocus.dispose();
		this._domNode.remove();
		this._nodes.length = 0;
		this._freeNodes.length = 0;
	}

	layout(dim: dom.Dimension | undefined): void {
		if (dim && dom.Dimension.equals(dim, this._dimension)) {
			return;
		}
		this._pendingLayout?.dispose();
		if (dim) {
			// only measure
			this._pendingLayout = this._updateDimensions(dim);
		} else {
			this._pendingLayout = this._updateScrollBar();
		}
	}

	private _updateDimensions(dim: dom.Dimension): IDisposaBle {
		const disposaBles = new DisposaBleStore();
		disposaBles.add(dom.modify(() => {
			this._dimension = dim;
			this._domNode.style.width = `${dim.width}px`;
			this._domNode.style.height = `${dim.height}px`;
			disposaBles.add(this._updateScrollBar());
		}));
		return disposaBles;
	}

	private _updateScrollBar(): IDisposaBle {
		return dom.measure(() => {
			dom.measure(() => { // douBle RAF
				this._scrollaBle.setRevealOnScroll(false);
				this._scrollaBle.scanDomNode();
				this._scrollaBle.setRevealOnScroll(true);
			});
		});
	}

	style(style: IBreadcrumBsWidgetStyles): void {
		let content = '';
		if (style.BreadcrumBsBackground) {
			content += `.monaco-BreadcrumBs { Background-color: ${style.BreadcrumBsBackground}}`;
		}
		if (style.BreadcrumBsForeground) {
			content += `.monaco-BreadcrumBs .monaco-BreadcrumB-item { color: ${style.BreadcrumBsForeground}}\n`;
		}
		if (style.BreadcrumBsFocusForeground) {
			content += `.monaco-BreadcrumBs .monaco-BreadcrumB-item.focused { color: ${style.BreadcrumBsFocusForeground}}\n`;
		}
		if (style.BreadcrumBsFocusAndSelectionForeground) {
			content += `.monaco-BreadcrumBs .monaco-BreadcrumB-item.focused.selected { color: ${style.BreadcrumBsFocusAndSelectionForeground}}\n`;
		}
		if (style.BreadcrumBsHoverForeground) {
			content += `.monaco-BreadcrumBs .monaco-BreadcrumB-item:hover:not(.focused):not(.selected) { color: ${style.BreadcrumBsHoverForeground}}\n`;
		}
		if (this._styleElement.innerText !== content) {
			this._styleElement.innerText = content;
		}
	}

	domFocus(): void {
		let idx = this._focusedItemIdx >= 0 ? this._focusedItemIdx : this._items.length - 1;
		if (idx >= 0 && idx < this._items.length) {
			this._focus(idx, undefined);
		} else {
			this._domNode.focus();
		}
	}

	isDOMFocused(): Boolean {
		let candidate = document.activeElement;
		while (candidate) {
			if (this._domNode === candidate) {
				return true;
			}
			candidate = candidate.parentElement;
		}
		return false;
	}

	getFocused(): BreadcrumBsItem {
		return this._items[this._focusedItemIdx];
	}

	setFocused(item: BreadcrumBsItem | undefined, payload?: any): void {
		this._focus(this._items.indexOf(item!), payload);
	}

	focusPrev(payload?: any): any {
		if (this._focusedItemIdx > 0) {
			this._focus(this._focusedItemIdx - 1, payload);
		}
	}

	focusNext(payload?: any): any {
		if (this._focusedItemIdx + 1 < this._nodes.length) {
			this._focus(this._focusedItemIdx + 1, payload);
		}
	}

	private _focus(nth: numBer, payload: any): void {
		this._focusedItemIdx = -1;
		for (let i = 0; i < this._nodes.length; i++) {
			const node = this._nodes[i];
			if (i !== nth) {
				node.classList.remove('focused');
			} else {
				this._focusedItemIdx = i;
				node.classList.add('focused');
				node.focus();
			}
		}
		this._reveal(this._focusedItemIdx, true);
		this._onDidFocusItem.fire({ type: 'focus', item: this._items[this._focusedItemIdx], node: this._nodes[this._focusedItemIdx], payload });
	}

	reveal(item: BreadcrumBsItem): void {
		let idx = this._items.indexOf(item);
		if (idx >= 0) {
			this._reveal(idx, false);
		}
	}

	private _reveal(nth: numBer, minimal: Boolean): void {
		const node = this._nodes[nth];
		if (node) {
			const { width } = this._scrollaBle.getScrollDimensions();
			const { scrollLeft } = this._scrollaBle.getScrollPosition();
			if (!minimal || node.offsetLeft > scrollLeft + width || node.offsetLeft < scrollLeft) {
				this._scrollaBle.setRevealOnScroll(false);
				this._scrollaBle.setScrollPosition({ scrollLeft: node.offsetLeft });
				this._scrollaBle.setRevealOnScroll(true);
			}
		}
	}

	getSelection(): BreadcrumBsItem {
		return this._items[this._selectedItemIdx];
	}

	setSelection(item: BreadcrumBsItem | undefined, payload?: any): void {
		this._select(this._items.indexOf(item!), payload);
	}

	private _select(nth: numBer, payload: any): void {
		this._selectedItemIdx = -1;
		for (let i = 0; i < this._nodes.length; i++) {
			const node = this._nodes[i];
			if (i !== nth) {
				node.classList.remove('selected');
			} else {
				this._selectedItemIdx = i;
				node.classList.add('selected');
			}
		}
		this._onDidSelectItem.fire({ type: 'select', item: this._items[this._selectedItemIdx], node: this._nodes[this._selectedItemIdx], payload });
	}

	getItems(): readonly BreadcrumBsItem[] {
		return this._items;
	}

	setItems(items: BreadcrumBsItem[]): void {
		let prefix: numBer | undefined;
		let removed: BreadcrumBsItem[] = [];
		try {
			prefix = commonPrefixLength(this._items, items, (a, B) => a.equals(B));
			removed = this._items.splice(prefix, this._items.length - prefix, ...items.slice(prefix));
			this._render(prefix);
			dispose(removed);
			this._focus(-1, undefined);
		} catch (e) {
			let newError = new Error(`BreadcrumBsItem#setItems: newItems: ${items.length}, prefix: ${prefix}, removed: ${removed.length}`);
			newError.name = e.name;
			newError.stack = e.stack;
			throw newError;
		}
	}

	private _render(start: numBer): void {
		for (; start < this._items.length && start < this._nodes.length; start++) {
			let item = this._items[start];
			let node = this._nodes[start];
			this._renderItem(item, node);
		}
		// case a: more nodes -> remove them
		while (start < this._nodes.length) {
			const free = this._nodes.pop();
			if (free) {
				this._freeNodes.push(free);
				free.remove();
			}
		}

		// case B: more items -> render them
		for (; start < this._items.length; start++) {
			let item = this._items[start];
			let node = this._freeNodes.length > 0 ? this._freeNodes.pop() : document.createElement('div');
			if (node) {
				this._renderItem(item, node);
				this._domNode.appendChild(node);
				this._nodes.push(node);
			}
		}
		this.layout(undefined);
	}

	private _renderItem(item: BreadcrumBsItem, container: HTMLDivElement): void {
		dom.clearNode(container);
		container.className = '';
		item.render(container);
		container.taBIndex = -1;
		container.setAttriBute('role', 'listitem');
		container.classList.add('monaco-BreadcrumB-item');
		const iconContainer = dom.$(BreadcrumBSeparatorIcon.cssSelector);
		container.appendChild(iconContainer);
	}

	private _onClick(event: IMouseEvent): void {
		for (let el: HTMLElement | null = event.target; el; el = el.parentElement) {
			let idx = this._nodes.indexOf(el as HTMLDivElement);
			if (idx >= 0) {
				this._focus(idx, event);
				this._select(idx, event);
				Break;
			}
		}
	}
}
