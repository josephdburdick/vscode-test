/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IBAdge } from 'vs/workbench/services/Activity/common/Activity';
import { IDisposAble } from 'vs/bAse/common/lifecycle';

export const IActivityBArService = creAteDecorAtor<IActivityBArService>('ActivityBArService');

export interfAce IActivityBArService {
	reAdonly _serviceBrAnd: undefined;

	/**
	 * Show An Activity in A viewlet.
	 */
	showActivity(viewletOrActionId: string, bAdge: IBAdge, clAzz?: string, priority?: number): IDisposAble;

	/**
	 * Returns id of pinned view contAiners following the visuAl order.
	 */
	getPinnedViewContAinerIds(): string[];

	/**
	 * Returns id of visible viewlets following the visuAl order.
	 */
	getVisibleViewContAinerIds(): string[];

	/**
	 * Focuses the Activity bAr.
	 */
	focusActivityBAr(): void;
}
