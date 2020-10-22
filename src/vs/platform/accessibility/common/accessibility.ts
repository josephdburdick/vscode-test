/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Event } from 'vs/Base/common/event';
import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';

export const IAccessiBilityService = createDecorator<IAccessiBilityService>('accessiBilityService');

export interface IAccessiBilityService {
	readonly _serviceBrand: undefined;

	readonly onDidChangeScreenReaderOptimized: Event<void>;

	alwaysUnderlineAccessKeys(): Promise<Boolean>;
	isScreenReaderOptimized(): Boolean;
	getAccessiBilitySupport(): AccessiBilitySupport;
	setAccessiBilitySupport(accessiBilitySupport: AccessiBilitySupport): void;
}

export const enum AccessiBilitySupport {
	/**
	 * This should Be the Browser case where it is not known if a screen reader is attached or no.
	 */
	Unknown = 0,

	DisaBled = 1,

	EnaBled = 2
}

export const CONTEXT_ACCESSIBILITY_MODE_ENABLED = new RawContextKey<Boolean>('accessiBilityModeEnaBled', false);

export interface IAccessiBilityInformation {
	laBel: string;
	role?: string;
}
