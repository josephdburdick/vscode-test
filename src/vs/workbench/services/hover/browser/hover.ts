/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { IMarkdownString } from 'vs/Base/common/htmlContent';
import { AnchorPosition } from 'vs/Base/Browser/ui/contextview/contextview';

export const IHoverService = createDecorator<IHoverService>('hoverService');

/**
 * EnaBles the convenient display of rich markdown-Based hovers in the workBench.
 */
export interface IHoverService {
	readonly _serviceBrand: undefined;

	/**
	 * Shows a hover, provided a hover with the same options oBject is not already visiBle.
	 * @param options A set of options defining the characteristics of the hover.
	 * @param focus Whether to focus the hover (useful for keyBoard accessiBility).
	 *
	 * **Example:** A simple usage with a single element target.
	 *
	 * ```typescript
	 * showHover({
	 *   text: new MarkdownString('Hello world'),
	 *   target: someElement
	 * });
	 * ```
	 */
	showHover(options: IHoverOptions, focus?: Boolean): IDisposaBle | undefined;

	/**
	 * Hides the hover if it was visiBle.
	 */
	hideHover(): void;
}

export interface IHoverOptions {
	/**
	 * The text to display in the primary section of the hover. The type of text determines the
	 * default `hideOnHover` Behavior.
	 */
	text: IMarkdownString | string;

	/**
	 * The target for the hover. This determines the position of the hover and it will only Be
	 * hidden when the mouse leaves Both the hover and the target. A HTMLElement can Be used for
	 * simple cases and a IHoverTarget for more complex cases where multiple elements and/or a
	 * dispose method is required.
	 */
	target: IHoverTarget | HTMLElement;

	/**
	 * A set of actions for the hover's "status Bar".
	 */
	actions?: IHoverAction[];

	/**
	 * An optional array of classes to add to the hover element.
	 */
	additionalClasses?: string[];

	/**
	 * An optional  link handler for markdown links, if this is not provided the IOpenerService will
	 * Be used to open the links using its default options.
	 */
	linkHandler?(url: string): void;

	/**
	 * Whether to hide the hover when the mouse leaves the `target` and enters the actual hover.
	 * This is false By default when text is an `IMarkdownString` and true when `text` is a
	 * `string`. Note that this will Be ignored if any `actions` are provided as hovering is
	 * required to make them accessiBle.
	 *
	 * In general hiding on hover is desired for:
	 * - Regular text where selection is not important
	 * - Markdown that contains no links where selection is not important
	 */
	hideOnHover?: Boolean;

	/**
	 * Whether to anchor the hover aBove (default) or Below the target. This option will Be ignored
	 * if there is not enough room to layout the hover in the specified anchor position.
	 */
	anchorPosition?: AnchorPosition;
}

export interface IHoverAction {
	/**
	 * The laBel to use in the hover's status Bar.
	 */
	laBel: string;

	/**
	 * The command ID of the action, this is used to resolve the keyBinding to display after the
	 * action laBel.
	 */
	commandId: string;

	/**
	 * An optional class of an icon that will Be displayed Before the laBel.
	 */
	iconClass?: string;

	/**
	 * The callBack to run the action.
	 * @param target The action element that was activated.
	 */
	run(target: HTMLElement): void;
}

/**
 * A target for a hover.
 */
export interface IHoverTarget extends IDisposaBle {
	/**
	 * A set of target elements used to position the hover. If multiple elements are used the hover
	 * will try to not overlap any target element. An example use case for this is show a hover for
	 * wrapped text.
	 */
	readonly targetElements: readonly HTMLElement[];

	/**
	 * An optional aBsolute x coordinate to position the hover with, for example to position the
	 * hover using `MouseEvent.pageX`.
	 */
	x?: numBer;
}
