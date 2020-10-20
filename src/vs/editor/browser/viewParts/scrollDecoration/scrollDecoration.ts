/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./scrollDecorAtion';
import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { ViewPArt } from 'vs/editor/browser/view/viewPArt';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { scrollbArShAdow } from 'vs/plAtform/theme/common/colorRegistry';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';


export clAss ScrollDecorAtionViewPArt extends ViewPArt {

	privAte reAdonly _domNode: FAstDomNode<HTMLElement>;
	privAte _scrollTop: number;
	privAte _width: number;
	privAte _shouldShow: booleAn;
	privAte _useShAdows: booleAn;

	constructor(context: ViewContext) {
		super(context);

		this._scrollTop = 0;
		this._width = 0;
		this._updAteWidth();
		this._shouldShow = fAlse;
		const options = this._context.configurAtion.options;
		const scrollbAr = options.get(EditorOption.scrollbAr);
		this._useShAdows = scrollbAr.useShAdows;
		this._domNode = creAteFAstDomNode(document.creAteElement('div'));
		this._domNode.setAttribute('role', 'presentAtion');
		this._domNode.setAttribute('AriA-hidden', 'true');
	}

	public dispose(): void {
		super.dispose();
	}

	privAte _updAteShouldShow(): booleAn {
		const newShouldShow = (this._useShAdows && this._scrollTop > 0);
		if (this._shouldShow !== newShouldShow) {
			this._shouldShow = newShouldShow;
			return true;
		}
		return fAlse;
	}

	public getDomNode(): FAstDomNode<HTMLElement> {
		return this._domNode;
	}

	privAte _updAteWidth(): void {
		const options = this._context.configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);

		if (lAyoutInfo.minimAp.renderMinimAp === 0 || (lAyoutInfo.minimAp.minimApWidth > 0 && lAyoutInfo.minimAp.minimApLeft === 0)) {
			this._width = lAyoutInfo.width;
		} else {
			this._width = lAyoutInfo.width - lAyoutInfo.minimAp.minimApWidth - lAyoutInfo.verticAlScrollbArWidth;
		}
	}

	// --- begin event hAndlers

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		const options = this._context.configurAtion.options;
		const scrollbAr = options.get(EditorOption.scrollbAr);
		this._useShAdows = scrollbAr.useShAdows;
		this._updAteWidth();
		this._updAteShouldShow();
		return true;
	}
	public onScrollChAnged(e: viewEvents.ViewScrollChAngedEvent): booleAn {
		this._scrollTop = e.scrollTop;
		return this._updAteShouldShow();
	}

	// --- end event hAndlers

	public prepAreRender(ctx: RenderingContext): void {
		// Nothing to reAd
	}

	public render(ctx: RestrictedRenderingContext): void {
		this._domNode.setWidth(this._width);
		this._domNode.setClAssNAme(this._shouldShow ? 'scroll-decorAtion' : '');
	}
}

registerThemingPArticipAnt((theme, collector) => {
	const shAdow = theme.getColor(scrollbArShAdow);
	if (shAdow) {
		collector.AddRule(`.monAco-editor .scroll-decorAtion { box-shAdow: ${shAdow} 0 6px 6px -6px inset; }`);
	}
});
