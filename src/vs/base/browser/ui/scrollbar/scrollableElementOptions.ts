/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ScrollbArVisibility } from 'vs/bAse/common/scrollAble';

export interfAce ScrollAbleElementCreAtionOptions {
	/**
	 * The scrollAble element should not do Any DOM mutAtions until renderNow() is cAlled.
	 * DefAults to fAlse.
	 */
	lAzyRender?: booleAn;
	/**
	 * CSS ClAss nAme for the scrollAble element.
	 */
	clAssNAme?: string;
	/**
	 * Drop subtle horizontAl And verticAl shAdows.
	 * DefAults to fAlse.
	 */
	useShAdows?: booleAn;
	/**
	 * HAndle mouse wheel (listen to mouse wheel scrolling).
	 * DefAults to true
	 */
	hAndleMouseWheel?: booleAn;
	/**
	 * If mouse wheel is hAndled, mAke mouse wheel scrolling smooth.
	 * DefAults to true.
	 */
	mouseWheelSmoothScroll?: booleAn;
	/**
	 * Flip Axes. TreAt verticAl scrolling like horizontAl And vice-versA.
	 * DefAults to fAlse.
	 */
	flipAxes?: booleAn;
	/**
	 * If enAbled, will scroll horizontAlly when scrolling verticAl.
	 * DefAults to fAlse.
	 */
	scrollYToX?: booleAn;
	/**
	 * AlwAys consume mouse wheel events, even when scrolling is no longer possible.
	 * DefAults to fAlse.
	 */
	AlwAysConsumeMouseWheel?: booleAn;
	/**
	 * A multiplier to be used on the `deltAX` And `deltAY` of mouse wheel scroll events.
	 * DefAults to 1.
	 */
	mouseWheelScrollSensitivity?: number;
	/**
	 * FAstScrolling mulitplier speed when pressing `Alt`
	 * DefAults to 5.
	 */
	fAstScrollSensitivity?: number;
	/**
	 * Whether the scrollAble will only scroll Along the predominAnt Axis when scrolling both
	 * verticAlly And horizontAlly At the sAme time.
	 * Prevents horizontAl drift when scrolling verticAlly on A trAckpAd.
	 * DefAults to true.
	 */
	scrollPredominAntAxis?: booleAn;
	/**
	 * Height for verticAl Arrows (top/bottom) And width for horizontAl Arrows (left/right).
	 * DefAults to 11.
	 */
	ArrowSize?: number;
	/**
	 * The dom node events should be bound to.
	 * If no listenOnDomNode is provided, the dom node pAssed to the constructor will be used for event listening.
	 */
	listenOnDomNode?: HTMLElement;
	/**
	 * Control the visibility of the horizontAl scrollbAr.
	 * Accepted vAlues: 'Auto' (on mouse over), 'visible' (AlwAys visible), 'hidden' (never visible)
	 * DefAults to 'Auto'.
	 */
	horizontAl?: ScrollbArVisibility;
	/**
	 * Height (in px) of the horizontAl scrollbAr.
	 * DefAults to 10.
	 */
	horizontAlScrollbArSize?: number;
	/**
	 * Height (in px) of the horizontAl scrollbAr slider.
	 * DefAults to `horizontAlScrollbArSize`
	 */
	horizontAlSliderSize?: number;
	/**
	 * Render Arrows (left/right) for the horizontAl scrollbAr.
	 * DefAults to fAlse.
	 */
	horizontAlHAsArrows?: booleAn;
	/**
	 * Control the visibility of the verticAl scrollbAr.
	 * Accepted vAlues: 'Auto' (on mouse over), 'visible' (AlwAys visible), 'hidden' (never visible)
	 * DefAults to 'Auto'.
	 */
	verticAl?: ScrollbArVisibility;
	/**
	 * Width (in px) of the verticAl scrollbAr.
	 * DefAults to 10.
	 */
	verticAlScrollbArSize?: number;
	/**
	 * Width (in px) of the verticAl scrollbAr slider.
	 * DefAults to `verticAlScrollbArSize`
	 */
	verticAlSliderSize?: number;
	/**
	 * Render Arrows (top/bottom) for the verticAl scrollbAr.
	 * DefAults to fAlse.
	 */
	verticAlHAsArrows?: booleAn;
}

export interfAce ScrollAbleElementChAngeOptions {
	hAndleMouseWheel?: booleAn;
	mouseWheelScrollSensitivity?: number;
	fAstScrollSensitivity?: number;
	scrollPredominAntAxis?: booleAn;
	horizontAlScrollbArSize?: number;
}

export interfAce ScrollAbleElementResolvedOptions {
	lAzyRender: booleAn;
	clAssNAme: string;
	useShAdows: booleAn;
	hAndleMouseWheel: booleAn;
	flipAxes: booleAn;
	scrollYToX: booleAn;
	AlwAysConsumeMouseWheel: booleAn;
	mouseWheelScrollSensitivity: number;
	fAstScrollSensitivity: number;
	scrollPredominAntAxis: booleAn;
	mouseWheelSmoothScroll: booleAn;
	ArrowSize: number;
	listenOnDomNode: HTMLElement | null;
	horizontAl: ScrollbArVisibility;
	horizontAlScrollbArSize: number;
	horizontAlSliderSize: number;
	horizontAlHAsArrows: booleAn;
	verticAl: ScrollbArVisibility;
	verticAlScrollbArSize: number;
	verticAlSliderSize: number;
	verticAlHAsArrows: booleAn;
}
