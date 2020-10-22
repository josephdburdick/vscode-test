/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IBadge } from 'vs/workBench/services/activity/common/activity';
import { IDisposaBle } from 'vs/Base/common/lifecycle';

export const IActivityBarService = createDecorator<IActivityBarService>('activityBarService');

export interface IActivityBarService {
	readonly _serviceBrand: undefined;

	/**
	 * Show an activity in a viewlet.
	 */
	showActivity(viewletOrActionId: string, Badge: IBadge, clazz?: string, priority?: numBer): IDisposaBle;

	/**
	 * Returns id of pinned view containers following the visual order.
	 */
	getPinnedViewContainerIds(): string[];

	/**
	 * Returns id of visiBle viewlets following the visual order.
	 */
	getVisiBleViewContainerIds(): string[];

	/**
	 * Focuses the activity Bar.
	 */
	focusActivityBar(): void;
}
