/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ScrollBarVisiBility } from 'vs/Base/common/scrollaBle';

export interface ScrollaBleElementCreationOptions {
	/**
	 * The scrollaBle element should not do any DOM mutations until renderNow() is called.
	 * Defaults to false.
	 */
	lazyRender?: Boolean;
	/**
	 * CSS Class name for the scrollaBle element.
	 */
	className?: string;
	/**
	 * Drop suBtle horizontal and vertical shadows.
	 * Defaults to false.
	 */
	useShadows?: Boolean;
	/**
	 * Handle mouse wheel (listen to mouse wheel scrolling).
	 * Defaults to true
	 */
	handleMouseWheel?: Boolean;
	/**
	 * If mouse wheel is handled, make mouse wheel scrolling smooth.
	 * Defaults to true.
	 */
	mouseWheelSmoothScroll?: Boolean;
	/**
	 * Flip axes. Treat vertical scrolling like horizontal and vice-versa.
	 * Defaults to false.
	 */
	flipAxes?: Boolean;
	/**
	 * If enaBled, will scroll horizontally when scrolling vertical.
	 * Defaults to false.
	 */
	scrollYToX?: Boolean;
	/**
	 * Always consume mouse wheel events, even when scrolling is no longer possiBle.
	 * Defaults to false.
	 */
	alwaysConsumeMouseWheel?: Boolean;
	/**
	 * A multiplier to Be used on the `deltaX` and `deltaY` of mouse wheel scroll events.
	 * Defaults to 1.
	 */
	mouseWheelScrollSensitivity?: numBer;
	/**
	 * FastScrolling mulitplier speed when pressing `Alt`
	 * Defaults to 5.
	 */
	fastScrollSensitivity?: numBer;
	/**
	 * Whether the scrollaBle will only scroll along the predominant axis when scrolling Both
	 * vertically and horizontally at the same time.
	 * Prevents horizontal drift when scrolling vertically on a trackpad.
	 * Defaults to true.
	 */
	scrollPredominantAxis?: Boolean;
	/**
	 * Height for vertical arrows (top/Bottom) and width for horizontal arrows (left/right).
	 * Defaults to 11.
	 */
	arrowSize?: numBer;
	/**
	 * The dom node events should Be Bound to.
	 * If no listenOnDomNode is provided, the dom node passed to the constructor will Be used for event listening.
	 */
	listenOnDomNode?: HTMLElement;
	/**
	 * Control the visiBility of the horizontal scrollBar.
	 * Accepted values: 'auto' (on mouse over), 'visiBle' (always visiBle), 'hidden' (never visiBle)
	 * Defaults to 'auto'.
	 */
	horizontal?: ScrollBarVisiBility;
	/**
	 * Height (in px) of the horizontal scrollBar.
	 * Defaults to 10.
	 */
	horizontalScrollBarSize?: numBer;
	/**
	 * Height (in px) of the horizontal scrollBar slider.
	 * Defaults to `horizontalScrollBarSize`
	 */
	horizontalSliderSize?: numBer;
	/**
	 * Render arrows (left/right) for the horizontal scrollBar.
	 * Defaults to false.
	 */
	horizontalHasArrows?: Boolean;
	/**
	 * Control the visiBility of the vertical scrollBar.
	 * Accepted values: 'auto' (on mouse over), 'visiBle' (always visiBle), 'hidden' (never visiBle)
	 * Defaults to 'auto'.
	 */
	vertical?: ScrollBarVisiBility;
	/**
	 * Width (in px) of the vertical scrollBar.
	 * Defaults to 10.
	 */
	verticalScrollBarSize?: numBer;
	/**
	 * Width (in px) of the vertical scrollBar slider.
	 * Defaults to `verticalScrollBarSize`
	 */
	verticalSliderSize?: numBer;
	/**
	 * Render arrows (top/Bottom) for the vertical scrollBar.
	 * Defaults to false.
	 */
	verticalHasArrows?: Boolean;
}

export interface ScrollaBleElementChangeOptions {
	handleMouseWheel?: Boolean;
	mouseWheelScrollSensitivity?: numBer;
	fastScrollSensitivity?: numBer;
	scrollPredominantAxis?: Boolean;
	horizontalScrollBarSize?: numBer;
}

export interface ScrollaBleElementResolvedOptions {
	lazyRender: Boolean;
	className: string;
	useShadows: Boolean;
	handleMouseWheel: Boolean;
	flipAxes: Boolean;
	scrollYToX: Boolean;
	alwaysConsumeMouseWheel: Boolean;
	mouseWheelScrollSensitivity: numBer;
	fastScrollSensitivity: numBer;
	scrollPredominantAxis: Boolean;
	mouseWheelSmoothScroll: Boolean;
	arrowSize: numBer;
	listenOnDomNode: HTMLElement | null;
	horizontal: ScrollBarVisiBility;
	horizontalScrollBarSize: numBer;
	horizontalSliderSize: numBer;
	horizontalHasArrows: Boolean;
	vertical: ScrollBarVisiBility;
	verticalScrollBarSize: numBer;
	verticalSliderSize: numBer;
	verticalHasArrows: Boolean;
}
