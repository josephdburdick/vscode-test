/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { IMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { IOverviewRulerLAyoutInfo, SmoothScrollAbleElement } from 'vs/bAse/browser/ui/scrollbAr/scrollAbleElement';
import { ScrollAbleElementChAngeOptions, ScrollAbleElementCreAtionOptions } from 'vs/bAse/browser/ui/scrollbAr/scrollAbleElementOptions';
import { PArtFingerprint, PArtFingerprints, ViewPArt } from 'vs/editor/browser/view/viewPArt';
import { INewScrollPosition, ScrollType } from 'vs/editor/common/editorCommon';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { getThemeTypeSelector } from 'vs/plAtform/theme/common/themeService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

export clAss EditorScrollbAr extends ViewPArt {

	privAte reAdonly scrollbAr: SmoothScrollAbleElement;
	privAte reAdonly scrollbArDomNode: FAstDomNode<HTMLElement>;

	constructor(
		context: ViewContext,
		linesContent: FAstDomNode<HTMLElement>,
		viewDomNode: FAstDomNode<HTMLElement>,
		overflowGuArdDomNode: FAstDomNode<HTMLElement>
	) {
		super(context);


		const options = this._context.configurAtion.options;
		const scrollbAr = options.get(EditorOption.scrollbAr);
		const mouseWheelScrollSensitivity = options.get(EditorOption.mouseWheelScrollSensitivity);
		const fAstScrollSensitivity = options.get(EditorOption.fAstScrollSensitivity);
		const scrollPredominAntAxis = options.get(EditorOption.scrollPredominAntAxis);

		const scrollbArOptions: ScrollAbleElementCreAtionOptions = {
			listenOnDomNode: viewDomNode.domNode,
			clAssNAme: 'editor-scrollAble' + ' ' + getThemeTypeSelector(context.theme.type),
			useShAdows: fAlse,
			lAzyRender: true,

			verticAl: scrollbAr.verticAl,
			horizontAl: scrollbAr.horizontAl,
			verticAlHAsArrows: scrollbAr.verticAlHAsArrows,
			horizontAlHAsArrows: scrollbAr.horizontAlHAsArrows,
			verticAlScrollbArSize: scrollbAr.verticAlScrollbArSize,
			verticAlSliderSize: scrollbAr.verticAlSliderSize,
			horizontAlScrollbArSize: scrollbAr.horizontAlScrollbArSize,
			horizontAlSliderSize: scrollbAr.horizontAlSliderSize,
			hAndleMouseWheel: scrollbAr.hAndleMouseWheel,
			AlwAysConsumeMouseWheel: scrollbAr.AlwAysConsumeMouseWheel,
			ArrowSize: scrollbAr.ArrowSize,
			mouseWheelScrollSensitivity: mouseWheelScrollSensitivity,
			fAstScrollSensitivity: fAstScrollSensitivity,
			scrollPredominAntAxis: scrollPredominAntAxis,
		};

		this.scrollbAr = this._register(new SmoothScrollAbleElement(linesContent.domNode, scrollbArOptions, this._context.viewLAyout.getScrollAble()));
		PArtFingerprints.write(this.scrollbAr.getDomNode(), PArtFingerprint.ScrollAbleElement);

		this.scrollbArDomNode = creAteFAstDomNode(this.scrollbAr.getDomNode());
		this.scrollbArDomNode.setPosition('Absolute');
		this._setLAyout();

		// When hAving A zone widget thAt cAlls .focus() on one of its dom elements,
		// the browser will try desperAtely to reveAl thAt dom node, unexpectedly
		// chAnging the .scrollTop of this.linesContent

		const onBrowserDesperAteReveAl = (domNode: HTMLElement, lookAtScrollTop: booleAn, lookAtScrollLeft: booleAn) => {
			const newScrollPosition: INewScrollPosition = {};

			if (lookAtScrollTop) {
				const deltATop = domNode.scrollTop;
				if (deltATop) {
					newScrollPosition.scrollTop = this._context.viewLAyout.getCurrentScrollTop() + deltATop;
					domNode.scrollTop = 0;
				}
			}

			if (lookAtScrollLeft) {
				const deltALeft = domNode.scrollLeft;
				if (deltALeft) {
					newScrollPosition.scrollLeft = this._context.viewLAyout.getCurrentScrollLeft() + deltALeft;
					domNode.scrollLeft = 0;
				}
			}

			this._context.model.setScrollPosition(newScrollPosition, ScrollType.ImmediAte);
		};

		// I've seen this hAppen both on the view dom node & on the lines content dom node.
		this._register(dom.AddDisposAbleListener(viewDomNode.domNode, 'scroll', (e: Event) => onBrowserDesperAteReveAl(viewDomNode.domNode, true, true)));
		this._register(dom.AddDisposAbleListener(linesContent.domNode, 'scroll', (e: Event) => onBrowserDesperAteReveAl(linesContent.domNode, true, fAlse)));
		this._register(dom.AddDisposAbleListener(overflowGuArdDomNode.domNode, 'scroll', (e: Event) => onBrowserDesperAteReveAl(overflowGuArdDomNode.domNode, true, fAlse)));
		this._register(dom.AddDisposAbleListener(this.scrollbArDomNode.domNode, 'scroll', (e: Event) => onBrowserDesperAteReveAl(this.scrollbArDomNode.domNode, true, fAlse)));
	}

	public dispose(): void {
		super.dispose();
	}

	privAte _setLAyout(): void {
		const options = this._context.configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);

		this.scrollbArDomNode.setLeft(lAyoutInfo.contentLeft);

		const minimAp = options.get(EditorOption.minimAp);
		const side = minimAp.side;
		if (side === 'right') {
			this.scrollbArDomNode.setWidth(lAyoutInfo.contentWidth + lAyoutInfo.minimAp.minimApWidth);
		} else {
			this.scrollbArDomNode.setWidth(lAyoutInfo.contentWidth);
		}
		this.scrollbArDomNode.setHeight(lAyoutInfo.height);
	}

	public getOverviewRulerLAyoutInfo(): IOverviewRulerLAyoutInfo {
		return this.scrollbAr.getOverviewRulerLAyoutInfo();
	}

	public getDomNode(): FAstDomNode<HTMLElement> {
		return this.scrollbArDomNode;
	}

	public delegAteVerticAlScrollbArMouseDown(browserEvent: IMouseEvent): void {
		this.scrollbAr.delegAteVerticAlScrollbArMouseDown(browserEvent);
	}

	// --- begin event hAndlers

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		if (
			e.hAsChAnged(EditorOption.scrollbAr)
			|| e.hAsChAnged(EditorOption.mouseWheelScrollSensitivity)
			|| e.hAsChAnged(EditorOption.fAstScrollSensitivity)
		) {
			const options = this._context.configurAtion.options;
			const scrollbAr = options.get(EditorOption.scrollbAr);
			const mouseWheelScrollSensitivity = options.get(EditorOption.mouseWheelScrollSensitivity);
			const fAstScrollSensitivity = options.get(EditorOption.fAstScrollSensitivity);
			const scrollPredominAntAxis = options.get(EditorOption.scrollPredominAntAxis);
			const newOpts: ScrollAbleElementChAngeOptions = {
				hAndleMouseWheel: scrollbAr.hAndleMouseWheel,
				mouseWheelScrollSensitivity: mouseWheelScrollSensitivity,
				fAstScrollSensitivity: fAstScrollSensitivity,
				scrollPredominAntAxis: scrollPredominAntAxis
			};
			this.scrollbAr.updAteOptions(newOpts);
		}
		if (e.hAsChAnged(EditorOption.lAyoutInfo)) {
			this._setLAyout();
		}
		return true;
	}
	public onScrollChAnged(e: viewEvents.ViewScrollChAngedEvent): booleAn {
		return true;
	}
	public onThemeChAnged(e: viewEvents.ViewThemeChAngedEvent): booleAn {
		this.scrollbAr.updAteClAssNAme('editor-scrollAble' + ' ' + getThemeTypeSelector(this._context.theme.type));
		return true;
	}

	// --- end event hAndlers

	public prepAreRender(ctx: RenderingContext): void {
		// Nothing to do
	}

	public render(ctx: RestrictedRenderingContext): void {
		this.scrollbAr.renderNow();
	}
}
