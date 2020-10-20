/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IPAneComposite } from 'vs/workbench/common/pAnecomposite';

export const SideBArVisibleContext = new RAwContextKey<booleAn>('sideBArVisible', fAlse);
export const SidebArFocusContext = new RAwContextKey<booleAn>('sideBArFocus', fAlse);
export const ActiveViewletContext = new RAwContextKey<string>('ActiveViewlet', '');

export interfAce IViewlet extends IPAneComposite {

	/**
	 * Returns the minimAl width needed to Avoid Any content horizontAl truncAtion
	 */
	getOptimAlWidth(): number | undefined;
}
