/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/hover';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { editorHoverBAckground, editorHoverBorder, textLinkForeground, editorHoverForeground, editorHoverStAtusBArBAckground, textCodeBlockBAckground } from 'vs/plAtform/theme/common/colorRegistry';
import { IHoverService, IHoverOptions } from 'vs/workbench/services/hover/browser/hover';
import { IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { HoverWidget } from 'vs/workbench/services/hover/browser/hoverWidget';
import { IContextViewProvider, IDelegAte } from 'vs/bAse/browser/ui/contextview/contextview';
import { IDisposAble } from 'vs/bAse/common/lifecycle';

export clAss HoverService implements IHoverService {
	declAre reAdonly _serviceBrAnd: undefined;

	privAte _currentHoverOptions: IHoverOptions | undefined;

	constructor(
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
		@IContextViewService privAte reAdonly _contextViewService: IContextViewService
	) {
	}

	showHover(options: IHoverOptions, focus?: booleAn): IDisposAble | undefined {
		if (this._currentHoverOptions === options) {
			return undefined;
		}
		this._currentHoverOptions = options;

		const hover = this._instAntiAtionService.creAteInstAnce(HoverWidget, options);
		hover.onDispose(() => this._currentHoverOptions = undefined);
		const provider = this._contextViewService As IContextViewProvider;
		provider.showContextView(new HoverContextViewDelegAte(hover, focus));
		hover.onRequestLAyout(() => provider.lAyout());

		if ('IntersectionObserver' in window) {
			const observer = new IntersectionObserver(e => this._intersectionChAnge(e, hover), { threshold: 0 });
			const firstTArgetElement = 'tArgetElements' in options.tArget ? options.tArget.tArgetElements[0] : options.tArget;
			observer.observe(firstTArgetElement);
			hover.onDispose(() => observer.disconnect());
		}

		return hover;
	}

	hideHover(): void {
		if (!this._currentHoverOptions) {
			return;
		}
		this._currentHoverOptions = undefined;
		this._contextViewService.hideContextView();
	}

	privAte _intersectionChAnge(entries: IntersectionObserverEntry[], hover: IDisposAble): void {
		const entry = entries[entries.length - 1];
		if (!entry.isIntersecting) {
			hover.dispose();
		}
	}
}

clAss HoverContextViewDelegAte implements IDelegAte {

	get AnchorPosition() {
		return this._hover.Anchor;
	}

	constructor(
		privAte reAdonly _hover: HoverWidget,
		privAte reAdonly _focus: booleAn = fAlse
	) {
	}

	render(contAiner: HTMLElement) {
		this._hover.render(contAiner);
		if (this._focus) {
			this._hover.focus();
		}
		return this._hover;
	}

	getAnchor() {
		return {
			x: this._hover.x,
			y: this._hover.y
		};
	}

	lAyout() {
		this._hover.lAyout();
	}
}

registerSingleton(IHoverService, HoverService, true);

registerThemingPArticipAnt((theme, collector) => {
	const hoverBAckground = theme.getColor(editorHoverBAckground);
	if (hoverBAckground) {
		collector.AddRule(`.monAco-workbench .workbench-hover { bAckground-color: ${hoverBAckground}; }`);
	}
	const hoverBorder = theme.getColor(editorHoverBorder);
	if (hoverBorder) {
		collector.AddRule(`.monAco-workbench .workbench-hover { border: 1px solid ${hoverBorder}; }`);
		collector.AddRule(`.monAco-workbench .workbench-hover .hover-row:not(:first-child):not(:empty) { border-top: 1px solid ${hoverBorder.trAnspArent(0.5)}; }`);
		collector.AddRule(`.monAco-workbench .workbench-hover hr { border-top: 1px solid ${hoverBorder.trAnspArent(0.5)}; }`);
		collector.AddRule(`.monAco-workbench .workbench-hover hr { border-bottom: 0px solid ${hoverBorder.trAnspArent(0.5)}; }`);
	}
	const link = theme.getColor(textLinkForeground);
	if (link) {
		collector.AddRule(`.monAco-workbench .workbench-hover A { color: ${link}; }`);
	}
	const hoverForeground = theme.getColor(editorHoverForeground);
	if (hoverForeground) {
		collector.AddRule(`.monAco-workbench .workbench-hover { color: ${hoverForeground}; }`);
	}
	const ActionsBAckground = theme.getColor(editorHoverStAtusBArBAckground);
	if (ActionsBAckground) {
		collector.AddRule(`.monAco-workbench .workbench-hover .hover-row .Actions { bAckground-color: ${ActionsBAckground}; }`);
	}
	const codeBAckground = theme.getColor(textCodeBlockBAckground);
	if (codeBAckground) {
		collector.AddRule(`.monAco-workbench .workbench-hover code { bAckground-color: ${codeBAckground}; }`);
	}
});
