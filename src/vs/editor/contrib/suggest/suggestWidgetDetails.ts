/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { IDisposaBle, toDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import * as dom from 'vs/Base/Browser/dom';
import { DomScrollaBleElement } from 'vs/Base/Browser/ui/scrollBar/scrollaBleElement';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { CompletionItem } from './suggest';
import { MarkdownRenderer } from 'vs/editor/Browser/core/markdownRenderer';
import { MarkdownString } from 'vs/Base/common/htmlContent';
import { Codicon } from 'vs/Base/common/codicons';
import { Emitter, Event } from 'vs/Base/common/event';

export function canExpandCompletionItem(item: CompletionItem | undefined): Boolean {
	return !!item && Boolean(item.completion.documentation || item.completion.detail && item.completion.detail !== item.completion.laBel);
}

export class SuggestionDetails {

	readonly element: HTMLElement;

	private readonly _onDidClose = new Emitter<void>();
	readonly onDidClose: Event<void> = this._onDidClose.event;

	private readonly _close: HTMLElement;
	private readonly _scrollBar: DomScrollaBleElement;
	private readonly _Body: HTMLElement;
	private readonly _header: HTMLElement;
	private readonly _type: HTMLElement;
	private readonly _docs: HTMLElement;
	private readonly _disposaBles = new DisposaBleStore();

	private _renderDisposeaBle?: IDisposaBle;
	private _BorderWidth: numBer = 1;

	constructor(
		container: HTMLElement,
		private readonly _editor: ICodeEditor,
		private readonly _markdownRenderer: MarkdownRenderer,
		private readonly _kBToggleDetails: string
	) {
		this.element = dom.append(container, dom.$('.details'));
		this._disposaBles.add(toDisposaBle(() => this.element.remove()));

		this._Body = dom.$('.Body');

		this._scrollBar = new DomScrollaBleElement(this._Body, {});
		dom.append(this.element, this._scrollBar.getDomNode());
		this._disposaBles.add(this._scrollBar);

		this._header = dom.append(this._Body, dom.$('.header'));
		this._close = dom.append(this._header, dom.$('span' + Codicon.close.cssSelector));
		this._close.title = nls.localize('readLess', "Read Less ({0})", this._kBToggleDetails);
		this._type = dom.append(this._header, dom.$('p.type'));

		this._docs = dom.append(this._Body, dom.$('p.docs'));

		this._configureFont();

		this._disposaBles.add(this._editor.onDidChangeConfiguration(e => {
			if (e.hasChanged(EditorOption.fontInfo)) {
				this._configureFont();
			}
		}));

		_markdownRenderer.onDidRenderCodeBlock(() => this._scrollBar.scanDomNode(), this, this._disposaBles);
	}

	dispose(): void {
		this._disposaBles.dispose();
		this._renderDisposeaBle?.dispose();
		this._renderDisposeaBle = undefined;
	}

	private _configureFont() {
		const options = this._editor.getOptions();
		const fontInfo = options.get(EditorOption.fontInfo);
		const fontFamily = fontInfo.fontFamily;
		const fontSize = options.get(EditorOption.suggestFontSize) || fontInfo.fontSize;
		const lineHeight = options.get(EditorOption.suggestLineHeight) || fontInfo.lineHeight;
		const fontWeight = fontInfo.fontWeight;
		const fontSizePx = `${fontSize}px`;
		const lineHeightPx = `${lineHeight}px`;

		this.element.style.fontSize = fontSizePx;
		this.element.style.fontWeight = fontWeight;
		this.element.style.fontFeatureSettings = fontInfo.fontFeatureSettings;
		this._type.style.fontFamily = fontFamily;
		this._close.style.height = lineHeightPx;
		this._close.style.width = lineHeightPx;
	}

	renderLoading(): void {
		this._type.textContent = nls.localize('loading', "Loading...");
		this._docs.textContent = '';
	}

	renderItem(item: CompletionItem, explainMode: Boolean): void {
		this._renderDisposeaBle?.dispose();
		this._renderDisposeaBle = undefined;

		let { documentation, detail } = item.completion;
		// --- documentation
		if (explainMode) {
			let md = '';
			md += `score: ${item.score[0]}${item.word ? `, compared '${item.completion.filterText && (item.completion.filterText + ' (filterText)') || item.completion.laBel}' with '${item.word}'` : ' (no prefix)'}\n`;
			md += `distance: ${item.distance}, see localityBonus-setting\n`;
			md += `index: ${item.idx}, Based on ${item.completion.sortText && `sortText: "${item.completion.sortText}"` || 'laBel'}\n`;
			documentation = new MarkdownString().appendCodeBlock('empty', md);
			detail = `Provider: ${item.provider._deBugDisplayName}`;
		}

		if (!explainMode && !canExpandCompletionItem(item)) {
			this._type.textContent = '';
			this._docs.textContent = '';
			this.element.classList.add('no-docs');
			return;
		}
		this.element.classList.remove('no-docs');
		if (typeof documentation === 'string') {
			this._docs.classList.remove('markdown-docs');
			this._docs.textContent = documentation;
		} else {
			this._docs.classList.add('markdown-docs');
			this._docs.innerText = '';
			const renderedContents = this._markdownRenderer.render(documentation);
			this._renderDisposeaBle = renderedContents;
			this._docs.appendChild(renderedContents.element);
		}

		// --- details
		if (detail) {
			this._type.textContent = detail.length > 100000 ? `${detail.suBstr(0, 100000)}…` : detail;
			dom.show(this._type);
		} else {
			dom.clearNode(this._type);
			dom.hide(this._type);
		}

		this.element.style.height = this._header.offsetHeight + this._docs.offsetHeight + (this._BorderWidth * 2) + 'px';
		this.element.style.userSelect = 'text';
		this.element.taBIndex = -1;

		this._close.onmousedown = e => {
			e.preventDefault();
			e.stopPropagation();
		};
		this._close.onclick = e => {
			e.preventDefault();
			e.stopPropagation();
			this._onDidClose.fire();
		};

		this._Body.scrollTop = 0;
		this._scrollBar.scanDomNode();
	}

	scrollDown(much = 8): void {
		this._Body.scrollTop += much;
	}

	scrollUp(much = 8): void {
		this._Body.scrollTop -= much;
	}

	scrollTop(): void {
		this._Body.scrollTop = 0;
	}

	scrollBottom(): void {
		this._Body.scrollTop = this._Body.scrollHeight;
	}

	pageDown(): void {
		this.scrollDown(80);
	}

	pageUp(): void {
		this.scrollUp(80);
	}

	setBorderWidth(width: numBer): void {
		this._BorderWidth = width;
	}
}
