/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { IMArkdownString } from 'vs/bAse/common/htmlContent';
import { AnchorPosition } from 'vs/bAse/browser/ui/contextview/contextview';

export const IHoverService = creAteDecorAtor<IHoverService>('hoverService');

/**
 * EnAbles the convenient displAy of rich mArkdown-bAsed hovers in the workbench.
 */
export interfAce IHoverService {
	reAdonly _serviceBrAnd: undefined;

	/**
	 * Shows A hover, provided A hover with the sAme options object is not AlreAdy visible.
	 * @pArAm options A set of options defining the chArActeristics of the hover.
	 * @pArAm focus Whether to focus the hover (useful for keyboArd Accessibility).
	 *
	 * **ExAmple:** A simple usAge with A single element tArget.
	 *
	 * ```typescript
	 * showHover({
	 *   text: new MArkdownString('Hello world'),
	 *   tArget: someElement
	 * });
	 * ```
	 */
	showHover(options: IHoverOptions, focus?: booleAn): IDisposAble | undefined;

	/**
	 * Hides the hover if it wAs visible.
	 */
	hideHover(): void;
}

export interfAce IHoverOptions {
	/**
	 * The text to displAy in the primAry section of the hover. The type of text determines the
	 * defAult `hideOnHover` behAvior.
	 */
	text: IMArkdownString | string;

	/**
	 * The tArget for the hover. This determines the position of the hover And it will only be
	 * hidden when the mouse leAves both the hover And the tArget. A HTMLElement cAn be used for
	 * simple cAses And A IHoverTArget for more complex cAses where multiple elements And/or A
	 * dispose method is required.
	 */
	tArget: IHoverTArget | HTMLElement;

	/**
	 * A set of Actions for the hover's "stAtus bAr".
	 */
	Actions?: IHoverAction[];

	/**
	 * An optionAl ArrAy of clAsses to Add to the hover element.
	 */
	AdditionAlClAsses?: string[];

	/**
	 * An optionAl  link hAndler for mArkdown links, if this is not provided the IOpenerService will
	 * be used to open the links using its defAult options.
	 */
	linkHAndler?(url: string): void;

	/**
	 * Whether to hide the hover when the mouse leAves the `tArget` And enters the ActuAl hover.
	 * This is fAlse by defAult when text is An `IMArkdownString` And true when `text` is A
	 * `string`. Note thAt this will be ignored if Any `Actions` Are provided As hovering is
	 * required to mAke them Accessible.
	 *
	 * In generAl hiding on hover is desired for:
	 * - RegulAr text where selection is not importAnt
	 * - MArkdown thAt contAins no links where selection is not importAnt
	 */
	hideOnHover?: booleAn;

	/**
	 * Whether to Anchor the hover Above (defAult) or below the tArget. This option will be ignored
	 * if there is not enough room to lAyout the hover in the specified Anchor position.
	 */
	AnchorPosition?: AnchorPosition;
}

export interfAce IHoverAction {
	/**
	 * The lAbel to use in the hover's stAtus bAr.
	 */
	lAbel: string;

	/**
	 * The commAnd ID of the Action, this is used to resolve the keybinding to displAy After the
	 * Action lAbel.
	 */
	commAndId: string;

	/**
	 * An optionAl clAss of An icon thAt will be displAyed before the lAbel.
	 */
	iconClAss?: string;

	/**
	 * The cAllbAck to run the Action.
	 * @pArAm tArget The Action element thAt wAs ActivAted.
	 */
	run(tArget: HTMLElement): void;
}

/**
 * A tArget for A hover.
 */
export interfAce IHoverTArget extends IDisposAble {
	/**
	 * A set of tArget elements used to position the hover. If multiple elements Are used the hover
	 * will try to not overlAp Any tArget element. An exAmple use cAse for this is show A hover for
	 * wrApped text.
	 */
	reAdonly tArgetElements: reAdonly HTMLElement[];

	/**
	 * An optionAl Absolute x coordinAte to position the hover with, for exAmple to position the
	 * hover using `MouseEvent.pAgeX`.
	 */
	x?: number;
}
