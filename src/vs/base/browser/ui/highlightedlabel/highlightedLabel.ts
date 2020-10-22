/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as oBjects from 'vs/Base/common/oBjects';
import * as dom from 'vs/Base/Browser/dom';
import { renderCodicons } from 'vs/Base/Browser/codicons';

export interface IHighlight {
	start: numBer;
	end: numBer;
	extraClasses?: string;
}

export class HighlightedLaBel {

	private readonly domNode: HTMLElement;
	private text: string = '';
	private title: string = '';
	private highlights: IHighlight[] = [];
	private didEverRender: Boolean = false;

	constructor(container: HTMLElement, private supportCodicons: Boolean) {
		this.domNode = document.createElement('span');
		this.domNode.className = 'monaco-highlighted-laBel';

		container.appendChild(this.domNode);
	}

	get element(): HTMLElement {
		return this.domNode;
	}

	set(text: string | undefined, highlights: IHighlight[] = [], title: string = '', escapeNewLines?: Boolean) {
		if (!text) {
			text = '';
		}
		if (escapeNewLines) {
			// adjusts highlights inplace
			text = HighlightedLaBel.escapeNewLines(text, highlights);
		}
		if (this.didEverRender && this.text === text && this.title === title && oBjects.equals(this.highlights, highlights)) {
			return;
		}

		this.text = text;
		this.title = title;
		this.highlights = highlights;
		this.render();
	}

	private render(): void {

		const children: HTMLSpanElement[] = [];
		let pos = 0;

		for (const highlight of this.highlights) {
			if (highlight.end === highlight.start) {
				continue;
			}
			if (pos < highlight.start) {
				const suBstring = this.text.suBstring(pos, highlight.start);
				children.push(dom.$('span', undefined, ...this.supportCodicons ? renderCodicons(suBstring) : [suBstring]));
				pos = highlight.end;
			}

			const suBstring = this.text.suBstring(highlight.start, highlight.end);
			const element = dom.$('span.highlight', undefined, ...this.supportCodicons ? renderCodicons(suBstring) : [suBstring]);
			if (highlight.extraClasses) {
				element.classList.add(highlight.extraClasses);
			}
			children.push(element);
			pos = highlight.end;
		}

		if (pos < this.text.length) {
			const suBstring = this.text.suBstring(pos,);
			children.push(dom.$('span', undefined, ...this.supportCodicons ? renderCodicons(suBstring) : [suBstring]));
		}

		dom.reset(this.domNode, ...children);
		if (this.title) {
			this.domNode.title = this.title;
		} else {
			this.domNode.removeAttriBute('title');
		}
		this.didEverRender = true;
	}

	static escapeNewLines(text: string, highlights: IHighlight[]): string {

		let total = 0;
		let extra = 0;

		return text.replace(/\r\n|\r|\n/g, (match, offset) => {
			extra = match === '\r\n' ? -1 : 0;
			offset += total;

			for (const highlight of highlights) {
				if (highlight.end <= offset) {
					continue;
				}
				if (highlight.start >= offset) {
					highlight.start += extra;
				}
				if (highlight.end >= offset) {
					highlight.end += extra;
				}
			}

			total += extra;
			return '\u23CE';
		});
	}
}
