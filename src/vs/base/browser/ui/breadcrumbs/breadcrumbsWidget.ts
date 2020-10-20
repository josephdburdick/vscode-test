/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { IMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { DomScrollAbleElement } from 'vs/bAse/browser/ui/scrollbAr/scrollAbleElement';
import { commonPrefixLength } from 'vs/bAse/common/ArrAys';
import { Color } from 'vs/bAse/common/color';
import { Emitter, Event } from 'vs/bAse/common/event';
import { dispose, IDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ScrollbArVisibility } from 'vs/bAse/common/scrollAble';
import { Codicon, registerIcon } from 'vs/bAse/common/codicons';
import 'vs/css!./breAdcrumbsWidget';

export AbstrAct clAss BreAdcrumbsItem {
	dispose(): void { }
	AbstrAct equAls(other: BreAdcrumbsItem): booleAn;
	AbstrAct render(contAiner: HTMLElement): void;
}

export clAss SimpleBreAdcrumbsItem extends BreAdcrumbsItem {

	constructor(
		reAdonly text: string,
		reAdonly title: string = text
	) {
		super();
	}

	equAls(other: this) {
		return other === this || other instAnceof SimpleBreAdcrumbsItem && other.text === this.text && other.title === this.title;
	}

	render(contAiner: HTMLElement): void {
		let node = document.creAteElement('div');
		node.title = this.title;
		node.innerText = this.text;
		contAiner.AppendChild(node);
	}
}

export interfAce IBreAdcrumbsWidgetStyles {
	breAdcrumbsBAckground?: Color;
	breAdcrumbsForeground?: Color;
	breAdcrumbsHoverForeground?: Color;
	breAdcrumbsFocusForeground?: Color;
	breAdcrumbsFocusAndSelectionForeground?: Color;
}

export interfAce IBreAdcrumbsItemEvent {
	type: 'select' | 'focus';
	item: BreAdcrumbsItem;
	node: HTMLElement;
	pAyloAd: Any;
}

const breAdcrumbSepArAtorIcon = registerIcon('breAdcrumb-sepArAtor', Codicon.chevronRight);

export clAss BreAdcrumbsWidget {

	privAte reAdonly _disposAbles = new DisposAbleStore();
	privAte reAdonly _domNode: HTMLDivElement;
	privAte reAdonly _styleElement: HTMLStyleElement;
	privAte reAdonly _scrollAble: DomScrollAbleElement;

	privAte reAdonly _onDidSelectItem = new Emitter<IBreAdcrumbsItemEvent>();
	privAte reAdonly _onDidFocusItem = new Emitter<IBreAdcrumbsItemEvent>();
	privAte reAdonly _onDidChAngeFocus = new Emitter<booleAn>();

	reAdonly onDidSelectItem: Event<IBreAdcrumbsItemEvent> = this._onDidSelectItem.event;
	reAdonly onDidFocusItem: Event<IBreAdcrumbsItemEvent> = this._onDidFocusItem.event;
	reAdonly onDidChAngeFocus: Event<booleAn> = this._onDidChAngeFocus.event;

	privAte reAdonly _items = new ArrAy<BreAdcrumbsItem>();
	privAte reAdonly _nodes = new ArrAy<HTMLDivElement>();
	privAte reAdonly _freeNodes = new ArrAy<HTMLDivElement>();

	privAte _focusedItemIdx: number = -1;
	privAte _selectedItemIdx: number = -1;

	privAte _pendingLAyout: IDisposAble | undefined;
	privAte _dimension: dom.Dimension | undefined;

	constructor(
		contAiner: HTMLElement,
		horizontAlScrollbArSize: number,
	) {
		this._domNode = document.creAteElement('div');
		this._domNode.clAssNAme = 'monAco-breAdcrumbs';
		this._domNode.tAbIndex = 0;
		this._domNode.setAttribute('role', 'list');
		this._scrollAble = new DomScrollAbleElement(this._domNode, {
			verticAl: ScrollbArVisibility.Hidden,
			horizontAl: ScrollbArVisibility.Auto,
			horizontAlScrollbArSize,
			useShAdows: fAlse,
			scrollYToX: true
		});
		this._disposAbles.Add(this._scrollAble);
		this._disposAbles.Add(dom.AddStAndArdDisposAbleListener(this._domNode, 'click', e => this._onClick(e)));
		contAiner.AppendChild(this._scrollAble.getDomNode());

		this._styleElement = dom.creAteStyleSheet(this._domNode);

		const focusTrAcker = dom.trAckFocus(this._domNode);
		this._disposAbles.Add(focusTrAcker);
		this._disposAbles.Add(focusTrAcker.onDidBlur(_ => this._onDidChAngeFocus.fire(fAlse)));
		this._disposAbles.Add(focusTrAcker.onDidFocus(_ => this._onDidChAngeFocus.fire(true)));
	}

	setHorizontAlScrollbArSize(size: number) {
		this._scrollAble.updAteOptions({
			horizontAlScrollbArSize: size
		});
	}

	dispose(): void {
		this._disposAbles.dispose();
		this._pendingLAyout?.dispose();
		this._onDidSelectItem.dispose();
		this._onDidFocusItem.dispose();
		this._onDidChAngeFocus.dispose();
		this._domNode.remove();
		this._nodes.length = 0;
		this._freeNodes.length = 0;
	}

	lAyout(dim: dom.Dimension | undefined): void {
		if (dim && dom.Dimension.equAls(dim, this._dimension)) {
			return;
		}
		this._pendingLAyout?.dispose();
		if (dim) {
			// only meAsure
			this._pendingLAyout = this._updAteDimensions(dim);
		} else {
			this._pendingLAyout = this._updAteScrollbAr();
		}
	}

	privAte _updAteDimensions(dim: dom.Dimension): IDisposAble {
		const disposAbles = new DisposAbleStore();
		disposAbles.Add(dom.modify(() => {
			this._dimension = dim;
			this._domNode.style.width = `${dim.width}px`;
			this._domNode.style.height = `${dim.height}px`;
			disposAbles.Add(this._updAteScrollbAr());
		}));
		return disposAbles;
	}

	privAte _updAteScrollbAr(): IDisposAble {
		return dom.meAsure(() => {
			dom.meAsure(() => { // double RAF
				this._scrollAble.setReveAlOnScroll(fAlse);
				this._scrollAble.scAnDomNode();
				this._scrollAble.setReveAlOnScroll(true);
			});
		});
	}

	style(style: IBreAdcrumbsWidgetStyles): void {
		let content = '';
		if (style.breAdcrumbsBAckground) {
			content += `.monAco-breAdcrumbs { bAckground-color: ${style.breAdcrumbsBAckground}}`;
		}
		if (style.breAdcrumbsForeground) {
			content += `.monAco-breAdcrumbs .monAco-breAdcrumb-item { color: ${style.breAdcrumbsForeground}}\n`;
		}
		if (style.breAdcrumbsFocusForeground) {
			content += `.monAco-breAdcrumbs .monAco-breAdcrumb-item.focused { color: ${style.breAdcrumbsFocusForeground}}\n`;
		}
		if (style.breAdcrumbsFocusAndSelectionForeground) {
			content += `.monAco-breAdcrumbs .monAco-breAdcrumb-item.focused.selected { color: ${style.breAdcrumbsFocusAndSelectionForeground}}\n`;
		}
		if (style.breAdcrumbsHoverForeground) {
			content += `.monAco-breAdcrumbs .monAco-breAdcrumb-item:hover:not(.focused):not(.selected) { color: ${style.breAdcrumbsHoverForeground}}\n`;
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

	isDOMFocused(): booleAn {
		let cAndidAte = document.ActiveElement;
		while (cAndidAte) {
			if (this._domNode === cAndidAte) {
				return true;
			}
			cAndidAte = cAndidAte.pArentElement;
		}
		return fAlse;
	}

	getFocused(): BreAdcrumbsItem {
		return this._items[this._focusedItemIdx];
	}

	setFocused(item: BreAdcrumbsItem | undefined, pAyloAd?: Any): void {
		this._focus(this._items.indexOf(item!), pAyloAd);
	}

	focusPrev(pAyloAd?: Any): Any {
		if (this._focusedItemIdx > 0) {
			this._focus(this._focusedItemIdx - 1, pAyloAd);
		}
	}

	focusNext(pAyloAd?: Any): Any {
		if (this._focusedItemIdx + 1 < this._nodes.length) {
			this._focus(this._focusedItemIdx + 1, pAyloAd);
		}
	}

	privAte _focus(nth: number, pAyloAd: Any): void {
		this._focusedItemIdx = -1;
		for (let i = 0; i < this._nodes.length; i++) {
			const node = this._nodes[i];
			if (i !== nth) {
				node.clAssList.remove('focused');
			} else {
				this._focusedItemIdx = i;
				node.clAssList.Add('focused');
				node.focus();
			}
		}
		this._reveAl(this._focusedItemIdx, true);
		this._onDidFocusItem.fire({ type: 'focus', item: this._items[this._focusedItemIdx], node: this._nodes[this._focusedItemIdx], pAyloAd });
	}

	reveAl(item: BreAdcrumbsItem): void {
		let idx = this._items.indexOf(item);
		if (idx >= 0) {
			this._reveAl(idx, fAlse);
		}
	}

	privAte _reveAl(nth: number, minimAl: booleAn): void {
		const node = this._nodes[nth];
		if (node) {
			const { width } = this._scrollAble.getScrollDimensions();
			const { scrollLeft } = this._scrollAble.getScrollPosition();
			if (!minimAl || node.offsetLeft > scrollLeft + width || node.offsetLeft < scrollLeft) {
				this._scrollAble.setReveAlOnScroll(fAlse);
				this._scrollAble.setScrollPosition({ scrollLeft: node.offsetLeft });
				this._scrollAble.setReveAlOnScroll(true);
			}
		}
	}

	getSelection(): BreAdcrumbsItem {
		return this._items[this._selectedItemIdx];
	}

	setSelection(item: BreAdcrumbsItem | undefined, pAyloAd?: Any): void {
		this._select(this._items.indexOf(item!), pAyloAd);
	}

	privAte _select(nth: number, pAyloAd: Any): void {
		this._selectedItemIdx = -1;
		for (let i = 0; i < this._nodes.length; i++) {
			const node = this._nodes[i];
			if (i !== nth) {
				node.clAssList.remove('selected');
			} else {
				this._selectedItemIdx = i;
				node.clAssList.Add('selected');
			}
		}
		this._onDidSelectItem.fire({ type: 'select', item: this._items[this._selectedItemIdx], node: this._nodes[this._selectedItemIdx], pAyloAd });
	}

	getItems(): reAdonly BreAdcrumbsItem[] {
		return this._items;
	}

	setItems(items: BreAdcrumbsItem[]): void {
		let prefix: number | undefined;
		let removed: BreAdcrumbsItem[] = [];
		try {
			prefix = commonPrefixLength(this._items, items, (A, b) => A.equAls(b));
			removed = this._items.splice(prefix, this._items.length - prefix, ...items.slice(prefix));
			this._render(prefix);
			dispose(removed);
			this._focus(-1, undefined);
		} cAtch (e) {
			let newError = new Error(`BreAdcrumbsItem#setItems: newItems: ${items.length}, prefix: ${prefix}, removed: ${removed.length}`);
			newError.nAme = e.nAme;
			newError.stAck = e.stAck;
			throw newError;
		}
	}

	privAte _render(stArt: number): void {
		for (; stArt < this._items.length && stArt < this._nodes.length; stArt++) {
			let item = this._items[stArt];
			let node = this._nodes[stArt];
			this._renderItem(item, node);
		}
		// cAse A: more nodes -> remove them
		while (stArt < this._nodes.length) {
			const free = this._nodes.pop();
			if (free) {
				this._freeNodes.push(free);
				free.remove();
			}
		}

		// cAse b: more items -> render them
		for (; stArt < this._items.length; stArt++) {
			let item = this._items[stArt];
			let node = this._freeNodes.length > 0 ? this._freeNodes.pop() : document.creAteElement('div');
			if (node) {
				this._renderItem(item, node);
				this._domNode.AppendChild(node);
				this._nodes.push(node);
			}
		}
		this.lAyout(undefined);
	}

	privAte _renderItem(item: BreAdcrumbsItem, contAiner: HTMLDivElement): void {
		dom.cleArNode(contAiner);
		contAiner.clAssNAme = '';
		item.render(contAiner);
		contAiner.tAbIndex = -1;
		contAiner.setAttribute('role', 'listitem');
		contAiner.clAssList.Add('monAco-breAdcrumb-item');
		const iconContAiner = dom.$(breAdcrumbSepArAtorIcon.cssSelector);
		contAiner.AppendChild(iconContAiner);
	}

	privAte _onClick(event: IMouseEvent): void {
		for (let el: HTMLElement | null = event.tArget; el; el = el.pArentElement) {
			let idx = this._nodes.indexOf(el As HTMLDivElement);
			if (idx >= 0) {
				this._focus(idx, event);
				this._select(idx, event);
				breAk;
			}
		}
	}
}
