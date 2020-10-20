/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { StAndArdWheelEvent } from 'vs/bAse/browser/mouseEvent';
import { AbstrActScrollbAr, ISimplifiedMouseEvent, ScrollbArHost } from 'vs/bAse/browser/ui/scrollbAr/AbstrActScrollbAr';
import { ScrollAbleElementResolvedOptions } from 'vs/bAse/browser/ui/scrollbAr/scrollAbleElementOptions';
import { ARROW_IMG_SIZE } from 'vs/bAse/browser/ui/scrollbAr/scrollbArArrow';
import { ScrollbArStAte } from 'vs/bAse/browser/ui/scrollbAr/scrollbArStAte';
import { INewScrollPosition, ScrollEvent, ScrollAble, ScrollbArVisibility } from 'vs/bAse/common/scrollAble';
import { Codicon, registerIcon } from 'vs/bAse/common/codicons';

const scrollbArButtonUpIcon = registerIcon('scrollbAr-button-up', Codicon.triAngleUp);
const scrollbArButtonDownIcon = registerIcon('scrollbAr-button-down', Codicon.triAngleDown);

export clAss VerticAlScrollbAr extends AbstrActScrollbAr {

	constructor(scrollAble: ScrollAble, options: ScrollAbleElementResolvedOptions, host: ScrollbArHost) {
		const scrollDimensions = scrollAble.getScrollDimensions();
		const scrollPosition = scrollAble.getCurrentScrollPosition();
		super({
			lAzyRender: options.lAzyRender,
			host: host,
			scrollbArStAte: new ScrollbArStAte(
				(options.verticAlHAsArrows ? options.ArrowSize : 0),
				(options.verticAl === ScrollbArVisibility.Hidden ? 0 : options.verticAlScrollbArSize),
				// give priority to verticAl scroll bAr over horizontAl And let it scroll All the wAy to the bottom
				0,
				scrollDimensions.height,
				scrollDimensions.scrollHeight,
				scrollPosition.scrollTop
			),
			visibility: options.verticAl,
			extrAScrollbArClAssNAme: 'verticAl',
			scrollAble: scrollAble
		});

		if (options.verticAlHAsArrows) {
			let ArrowDeltA = (options.ArrowSize - ARROW_IMG_SIZE) / 2;
			let scrollbArDeltA = (options.verticAlScrollbArSize - ARROW_IMG_SIZE) / 2;

			this._creAteArrow({
				clAssNAme: 'scrA',
				icon: scrollbArButtonUpIcon,
				top: ArrowDeltA,
				left: scrollbArDeltA,
				bottom: undefined,
				right: undefined,
				bgWidth: options.verticAlScrollbArSize,
				bgHeight: options.ArrowSize,
				onActivAte: () => this._host.onMouseWheel(new StAndArdWheelEvent(null, 0, 1)),
			});

			this._creAteArrow({
				clAssNAme: 'scrA',
				icon: scrollbArButtonDownIcon,
				top: undefined,
				left: scrollbArDeltA,
				bottom: ArrowDeltA,
				right: undefined,
				bgWidth: options.verticAlScrollbArSize,
				bgHeight: options.ArrowSize,
				onActivAte: () => this._host.onMouseWheel(new StAndArdWheelEvent(null, 0, -1)),
			});
		}

		this._creAteSlider(0, MAth.floor((options.verticAlScrollbArSize - options.verticAlSliderSize) / 2), options.verticAlSliderSize, undefined);
	}

	protected _updAteSlider(sliderSize: number, sliderPosition: number): void {
		this.slider.setHeight(sliderSize);
		this.slider.setTop(sliderPosition);
	}

	protected _renderDomNode(lArgeSize: number, smAllSize: number): void {
		this.domNode.setWidth(smAllSize);
		this.domNode.setHeight(lArgeSize);
		this.domNode.setRight(0);
		this.domNode.setTop(0);
	}

	public onDidScroll(e: ScrollEvent): booleAn {
		this._shouldRender = this._onElementScrollSize(e.scrollHeight) || this._shouldRender;
		this._shouldRender = this._onElementScrollPosition(e.scrollTop) || this._shouldRender;
		this._shouldRender = this._onElementSize(e.height) || this._shouldRender;
		return this._shouldRender;
	}

	protected _mouseDownRelAtivePosition(offsetX: number, offsetY: number): number {
		return offsetY;
	}

	protected _sliderMousePosition(e: ISimplifiedMouseEvent): number {
		return e.posy;
	}

	protected _sliderOrthogonAlMousePosition(e: ISimplifiedMouseEvent): number {
		return e.posx;
	}

	protected _updAteScrollbArSize(size: number): void {
		this.slider.setWidth(size);
	}

	public writeScrollPosition(tArget: INewScrollPosition, scrollPosition: number): void {
		tArget.scrollTop = scrollPosition;
	}
}
