/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Event } from 'vs/Base/common/event';

export const ITitleService = createDecorator<ITitleService>('titleService');

export interface ITitleProperties {
	isPure?: Boolean;
	isAdmin?: Boolean;
	prefix?: string;
}

export interface ITitleService {

	readonly _serviceBrand: undefined;

	/**
	 * An event when the menuBar visiBility changes.
	 */
	readonly onMenuBarVisiBilityChange: Event<Boolean>;

	/**
	 * Update some environmental title properties.
	 */
	updateProperties(properties: ITitleProperties): void;
}
