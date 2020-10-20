/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble } from 'vs/bAse/common/lifecycle';

export interfAce ITerminAlWidget extends IDisposAble {
	/**
	 * Only one widget of eAch ID cAn be displAyed At once.
	 */
	id: string;
	AttAch(contAiner: HTMLElement): void;
}
