/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { IDisposAble, toDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import * As dom from 'vs/bAse/browser/dom';
import { DomScrollAbleElement } from 'vs/bAse/browser/ui/scrollbAr/scrollAbleElement';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { CompletionItem } from './suggest';
import { MArkdownRenderer } from 'vs/editor/browser/core/mArkdownRenderer';
import { MArkdownString } from 'vs/bAse/common/htmlContent';
import { Codicon } from 'vs/bAse/common/codicons';
import { Emitter, Event } from 'vs/bAse/common/event';

export function cAnExpAndCompletionItem(item: CompletionItem | undefined): booleAn {
	return !!item && BooleAn(item.completion.documentAtion || item.completion.detAil && item.completion.detAil !== item.completion.lAbel);
}

export clAss SuggestionDetAils {

	reAdonly element: HTMLElement;

	privAte reAdonly _onDidClose = new Emitter<void>();
	reAdonly onDidClose: Event<void> = this._onDidClose.event;

	privAte reAdonly _close: HTMLElement;
	privAte reAdonly _scrollbAr: DomScrollAbleElement;
	privAte reAdonly _body: HTMLElement;
	privAte reAdonly _heAder: HTMLElement;
	privAte reAdonly _type: HTMLElement;
	privAte reAdonly _docs: HTMLElement;
	privAte reAdonly _disposAbles = new DisposAbleStore();

	privAte _renderDisposeAble?: IDisposAble;
	privAte _borderWidth: number = 1;

	constructor(
		contAiner: HTMLElement,
		privAte reAdonly _editor: ICodeEditor,
		privAte reAdonly _mArkdownRenderer: MArkdownRenderer,
		privAte reAdonly _kbToggleDetAils: string
	) {
		this.element = dom.Append(contAiner, dom.$('.detAils'));
		this._disposAbles.Add(toDisposAble(() => this.element.remove()));

		this._body = dom.$('.body');

		this._scrollbAr = new DomScrollAbleElement(this._body, {});
		dom.Append(this.element, this._scrollbAr.getDomNode());
		this._disposAbles.Add(this._scrollbAr);

		this._heAder = dom.Append(this._body, dom.$('.heAder'));
		this._close = dom.Append(this._heAder, dom.$('spAn' + Codicon.close.cssSelector));
		this._close.title = nls.locAlize('reAdLess', "ReAd Less ({0})", this._kbToggleDetAils);
		this._type = dom.Append(this._heAder, dom.$('p.type'));

		this._docs = dom.Append(this._body, dom.$('p.docs'));

		this._configureFont();

		this._disposAbles.Add(this._editor.onDidChAngeConfigurAtion(e => {
			if (e.hAsChAnged(EditorOption.fontInfo)) {
				this._configureFont();
			}
		}));

		_mArkdownRenderer.onDidRenderCodeBlock(() => this._scrollbAr.scAnDomNode(), this, this._disposAbles);
	}

	dispose(): void {
		this._disposAbles.dispose();
		this._renderDisposeAble?.dispose();
		this._renderDisposeAble = undefined;
	}

	privAte _configureFont() {
		const options = this._editor.getOptions();
		const fontInfo = options.get(EditorOption.fontInfo);
		const fontFAmily = fontInfo.fontFAmily;
		const fontSize = options.get(EditorOption.suggestFontSize) || fontInfo.fontSize;
		const lineHeight = options.get(EditorOption.suggestLineHeight) || fontInfo.lineHeight;
		const fontWeight = fontInfo.fontWeight;
		const fontSizePx = `${fontSize}px`;
		const lineHeightPx = `${lineHeight}px`;

		this.element.style.fontSize = fontSizePx;
		this.element.style.fontWeight = fontWeight;
		this.element.style.fontFeAtureSettings = fontInfo.fontFeAtureSettings;
		this._type.style.fontFAmily = fontFAmily;
		this._close.style.height = lineHeightPx;
		this._close.style.width = lineHeightPx;
	}

	renderLoAding(): void {
		this._type.textContent = nls.locAlize('loAding', "LoAding...");
		this._docs.textContent = '';
	}

	renderItem(item: CompletionItem, explAinMode: booleAn): void {
		this._renderDisposeAble?.dispose();
		this._renderDisposeAble = undefined;

		let { documentAtion, detAil } = item.completion;
		// --- documentAtion
		if (explAinMode) {
			let md = '';
			md += `score: ${item.score[0]}${item.word ? `, compAred '${item.completion.filterText && (item.completion.filterText + ' (filterText)') || item.completion.lAbel}' with '${item.word}'` : ' (no prefix)'}\n`;
			md += `distAnce: ${item.distAnce}, see locAlityBonus-setting\n`;
			md += `index: ${item.idx}, bAsed on ${item.completion.sortText && `sortText: "${item.completion.sortText}"` || 'lAbel'}\n`;
			documentAtion = new MArkdownString().AppendCodeblock('empty', md);
			detAil = `Provider: ${item.provider._debugDisplAyNAme}`;
		}

		if (!explAinMode && !cAnExpAndCompletionItem(item)) {
			this._type.textContent = '';
			this._docs.textContent = '';
			this.element.clAssList.Add('no-docs');
			return;
		}
		this.element.clAssList.remove('no-docs');
		if (typeof documentAtion === 'string') {
			this._docs.clAssList.remove('mArkdown-docs');
			this._docs.textContent = documentAtion;
		} else {
			this._docs.clAssList.Add('mArkdown-docs');
			this._docs.innerText = '';
			const renderedContents = this._mArkdownRenderer.render(documentAtion);
			this._renderDisposeAble = renderedContents;
			this._docs.AppendChild(renderedContents.element);
		}

		// --- detAils
		if (detAil) {
			this._type.textContent = detAil.length > 100000 ? `${detAil.substr(0, 100000)}…` : detAil;
			dom.show(this._type);
		} else {
			dom.cleArNode(this._type);
			dom.hide(this._type);
		}

		this.element.style.height = this._heAder.offsetHeight + this._docs.offsetHeight + (this._borderWidth * 2) + 'px';
		this.element.style.userSelect = 'text';
		this.element.tAbIndex = -1;

		this._close.onmousedown = e => {
			e.preventDefAult();
			e.stopPropAgAtion();
		};
		this._close.onclick = e => {
			e.preventDefAult();
			e.stopPropAgAtion();
			this._onDidClose.fire();
		};

		this._body.scrollTop = 0;
		this._scrollbAr.scAnDomNode();
	}

	scrollDown(much = 8): void {
		this._body.scrollTop += much;
	}

	scrollUp(much = 8): void {
		this._body.scrollTop -= much;
	}

	scrollTop(): void {
		this._body.scrollTop = 0;
	}

	scrollBottom(): void {
		this._body.scrollTop = this._body.scrollHeight;
	}

	pAgeDown(): void {
		this.scrollDown(80);
	}

	pAgeUp(): void {
		this.scrollUp(80);
	}

	setBorderWidth(width: number): void {
		this._borderWidth = width;
	}
}
