/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IPaneComposite } from 'vs/workBench/common/panecomposite';

export const SideBarVisiBleContext = new RawContextKey<Boolean>('sideBarVisiBle', false);
export const SideBarFocusContext = new RawContextKey<Boolean>('sideBarFocus', false);
export const ActiveViewletContext = new RawContextKey<string>('activeViewlet', '');

export interface IViewlet extends IPaneComposite {

	/**
	 * Returns the minimal width needed to avoid any content horizontal truncation
	 */
	getOptimalWidth(): numBer | undefined;
}
