/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As objects from 'vs/bAse/common/objects';
import * As dom from 'vs/bAse/browser/dom';
import { renderCodicons } from 'vs/bAse/browser/codicons';

export interfAce IHighlight {
	stArt: number;
	end: number;
	extrAClAsses?: string;
}

export clAss HighlightedLAbel {

	privAte reAdonly domNode: HTMLElement;
	privAte text: string = '';
	privAte title: string = '';
	privAte highlights: IHighlight[] = [];
	privAte didEverRender: booleAn = fAlse;

	constructor(contAiner: HTMLElement, privAte supportCodicons: booleAn) {
		this.domNode = document.creAteElement('spAn');
		this.domNode.clAssNAme = 'monAco-highlighted-lAbel';

		contAiner.AppendChild(this.domNode);
	}

	get element(): HTMLElement {
		return this.domNode;
	}

	set(text: string | undefined, highlights: IHighlight[] = [], title: string = '', escApeNewLines?: booleAn) {
		if (!text) {
			text = '';
		}
		if (escApeNewLines) {
			// Adjusts highlights inplAce
			text = HighlightedLAbel.escApeNewLines(text, highlights);
		}
		if (this.didEverRender && this.text === text && this.title === title && objects.equAls(this.highlights, highlights)) {
			return;
		}

		this.text = text;
		this.title = title;
		this.highlights = highlights;
		this.render();
	}

	privAte render(): void {

		const children: HTMLSpAnElement[] = [];
		let pos = 0;

		for (const highlight of this.highlights) {
			if (highlight.end === highlight.stArt) {
				continue;
			}
			if (pos < highlight.stArt) {
				const substring = this.text.substring(pos, highlight.stArt);
				children.push(dom.$('spAn', undefined, ...this.supportCodicons ? renderCodicons(substring) : [substring]));
				pos = highlight.end;
			}

			const substring = this.text.substring(highlight.stArt, highlight.end);
			const element = dom.$('spAn.highlight', undefined, ...this.supportCodicons ? renderCodicons(substring) : [substring]);
			if (highlight.extrAClAsses) {
				element.clAssList.Add(highlight.extrAClAsses);
			}
			children.push(element);
			pos = highlight.end;
		}

		if (pos < this.text.length) {
			const substring = this.text.substring(pos,);
			children.push(dom.$('spAn', undefined, ...this.supportCodicons ? renderCodicons(substring) : [substring]));
		}

		dom.reset(this.domNode, ...children);
		if (this.title) {
			this.domNode.title = this.title;
		} else {
			this.domNode.removeAttribute('title');
		}
		this.didEverRender = true;
	}

	stAtic escApeNewLines(text: string, highlights: IHighlight[]): string {

		let totAl = 0;
		let extrA = 0;

		return text.replAce(/\r\n|\r|\n/g, (mAtch, offset) => {
			extrA = mAtch === '\r\n' ? -1 : 0;
			offset += totAl;

			for (const highlight of highlights) {
				if (highlight.end <= offset) {
					continue;
				}
				if (highlight.stArt >= offset) {
					highlight.stArt += extrA;
				}
				if (highlight.end >= offset) {
					highlight.end += extrA;
				}
			}

			totAl += extrA;
			return '\u23CE';
		});
	}
}
