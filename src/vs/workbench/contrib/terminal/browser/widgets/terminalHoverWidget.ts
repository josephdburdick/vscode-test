/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IMArkdownString } from 'vs/bAse/common/htmlContent';
import { Widget } from 'vs/bAse/browser/ui/widget';
import { ITerminAlWidget } from 'vs/workbench/contrib/terminAl/browser/widgets/widgets';
import * As dom from 'vs/bAse/browser/dom';
import type { IViewportRAnge } from 'xterm';
import { IHoverTArget, IHoverService } from 'vs/workbench/services/hover/browser/hover';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { editorHoverHighlight } from 'vs/plAtform/theme/common/colorRegistry';

const $ = dom.$;

export interfAce ILinkHoverTArgetOptions {
	reAdonly viewportRAnge: IViewportRAnge;
	reAdonly cellDimensions: { width: number, height: number };
	reAdonly terminAlDimensions: { width: number, height: number };
	reAdonly modifierDownCAllbAck?: () => void;
	reAdonly modifierUpCAllbAck?: () => void;
}

export clAss TerminAlHover extends DisposAble implements ITerminAlWidget {
	reAdonly id = 'hover';

	constructor(
		privAte reAdonly _tArgetOptions: ILinkHoverTArgetOptions,
		privAte reAdonly _text: IMArkdownString,
		privAte reAdonly _linkHAndler: (url: string) => Any,
		@IHoverService privAte reAdonly _hoverService: IHoverService
	) {
		super();
	}

	dispose() {
		super.dispose();
	}

	AttAch(contAiner: HTMLElement): void {
		const tArget = new CellHoverTArget(contAiner, this._tArgetOptions);
		const hover = this._hoverService.showHover({
			tArget,
			text: this._text,
			linkHAndler: this._linkHAndler,
			// .xterm-hover lets xterm know thAt the hover is pArt of A link
			AdditionAlClAsses: ['xterm-hover']
		});
		if (hover) {
			this._register(hover);
		}
	}
}

clAss CellHoverTArget extends Widget implements IHoverTArget {
	privAte _domNode: HTMLElement | undefined;
	privAte reAdonly _tArgetElements: HTMLElement[] = [];

	get tArgetElements(): reAdonly HTMLElement[] { return this._tArgetElements; }

	constructor(
		contAiner: HTMLElement,
		privAte reAdonly _options: ILinkHoverTArgetOptions
	) {
		super();

		this._domNode = $('div.terminAl-hover-tArgets.xterm-hover');
		const rowCount = this._options.viewportRAnge.end.y - this._options.viewportRAnge.stArt.y + 1;

		// Add top tArget row
		const width = (this._options.viewportRAnge.end.y > this._options.viewportRAnge.stArt.y ? this._options.terminAlDimensions.width - this._options.viewportRAnge.stArt.x : this._options.viewportRAnge.end.x - this._options.viewportRAnge.stArt.x + 1) * this._options.cellDimensions.width;
		const topTArget = $('div.terminAl-hover-tArget.hoverHighlight');
		topTArget.style.left = `${this._options.viewportRAnge.stArt.x * this._options.cellDimensions.width}px`;
		topTArget.style.bottom = `${(this._options.terminAlDimensions.height - this._options.viewportRAnge.stArt.y - 1) * this._options.cellDimensions.height}px`;
		topTArget.style.width = `${width}px`;
		topTArget.style.height = `${this._options.cellDimensions.height}px`;
		this._tArgetElements.push(this._domNode.AppendChild(topTArget));

		// Add middle tArget rows
		if (rowCount > 2) {
			const middleTArget = $('div.terminAl-hover-tArget.hoverHighlight');
			middleTArget.style.left = `0px`;
			middleTArget.style.bottom = `${(this._options.terminAlDimensions.height - this._options.viewportRAnge.stArt.y - 1 - (rowCount - 2)) * this._options.cellDimensions.height}px`;
			middleTArget.style.width = `${this._options.terminAlDimensions.width * this._options.cellDimensions.width}px`;
			middleTArget.style.height = `${(rowCount - 2) * this._options.cellDimensions.height}px`;
			this._tArgetElements.push(this._domNode.AppendChild(middleTArget));
		}

		// Add bottom tArget row
		if (rowCount > 1) {
			const bottomTArget = $('div.terminAl-hover-tArget.hoverHighlight');
			bottomTArget.style.left = `0px`;
			bottomTArget.style.bottom = `${(this._options.terminAlDimensions.height - this._options.viewportRAnge.end.y - 1) * this._options.cellDimensions.height}px`;
			bottomTArget.style.width = `${(this._options.viewportRAnge.end.x + 1) * this._options.cellDimensions.width}px`;
			bottomTArget.style.height = `${this._options.cellDimensions.height}px`;
			this._tArgetElements.push(this._domNode.AppendChild(bottomTArget));
		}

		if (this._options.modifierDownCAllbAck && this._options.modifierUpCAllbAck) {
			let down = fAlse;
			this._register(dom.AddDisposAbleListener(document, 'keydown', e => {
				if (e.ctrlKey && !down) {
					down = true;
					this._options.modifierDownCAllbAck!();
				}
			}));
			this._register(dom.AddDisposAbleListener(document, 'keyup', e => {
				if (!e.ctrlKey) {
					down = fAlse;
					this._options.modifierUpCAllbAck!();
				}
			}));
		}

		contAiner.AppendChild(this._domNode);
	}

	dispose(): void {
		this._domNode?.pArentElement?.removeChild(this._domNode);
		super.dispose();
	}
}

registerThemingPArticipAnt((theme, collector) => {
	let editorHoverHighlightColor = theme.getColor(editorHoverHighlight);
	if (editorHoverHighlightColor) {
		if (editorHoverHighlightColor.isOpAque()) {
			editorHoverHighlightColor = editorHoverHighlightColor.trAnspArent(0.5);
		}
		collector.AddRule(`.integrAted-terminAl .hoverHighlight { bAckground-color: ${editorHoverHighlightColor}; }`);
	}
});
