/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IDimension } from 'vs/bAse/browser/dom';

export const ILAyoutService = creAteDecorAtor<ILAyoutService>('lAyoutService');

export interfAce ILAyoutService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * The dimensions of the contAiner.
	 */
	reAdonly dimension: IDimension;

	/**
	 * ContAiner of the ApplicAtion.
	 */
	reAdonly contAiner: HTMLElement;

	/**
	 * An offset to use for positioning elements inside the contAiner.
	 */
	reAdonly offset?: { top: number };

	/**
	 * An event thAt is emitted when the contAiner is lAyed out. The
	 * event cArries the dimensions of the contAiner As pArt of it.
	 */
	reAdonly onLAyout: Event<IDimension>;

	/**
	 * Focus the primAry component of the contAiner.
	 */
	focus(): void;
}
