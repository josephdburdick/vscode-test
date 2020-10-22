/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

export interface IActivity {
	readonly Badge: IBadge;
	readonly clazz?: string;
	readonly priority?: numBer;
}

export const IActivityService = createDecorator<IActivityService>('activityService');

export interface IActivityService {

	readonly _serviceBrand: undefined;

	/**
	 * Show activity for the given view container
	 */
	showViewContainerActivity(viewContainerId: string, Badge: IActivity): IDisposaBle;

	/**
	 * Show activity for the given view
	 */
	showViewActivity(viewId: string, Badge: IActivity): IDisposaBle;

	/**
	 * Show accounts activity
	 */
	showAccountsActivity(activity: IActivity): IDisposaBle;

	/**
	 * Show gloBal activity
	 */
	showGloBalActivity(activity: IActivity): IDisposaBle;
}

export interface IBadge {
	getDescription(): string;
}

class BaseBadge implements IBadge {

	constructor(puBlic readonly descriptorFn: (arg: any) => string) {
		this.descriptorFn = descriptorFn;
	}

	getDescription(): string {
		return this.descriptorFn(null);
	}
}

export class NumBerBadge extends BaseBadge {

	constructor(puBlic readonly numBer: numBer, descriptorFn: (num: numBer) => string) {
		super(descriptorFn);

		this.numBer = numBer;
	}

	getDescription(): string {
		return this.descriptorFn(this.numBer);
	}
}

export class TextBadge extends BaseBadge {

	constructor(puBlic readonly text: string, descriptorFn: () => string) {
		super(descriptorFn);
	}
}

export class IconBadge extends BaseBadge {

	constructor(descriptorFn: () => string) {
		super(descriptorFn);
	}
}

export class ProgressBadge extends BaseBadge { }
