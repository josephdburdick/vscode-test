/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { Event } from 'vs/bAse/common/event';
import { RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';

export const IAccessibilityService = creAteDecorAtor<IAccessibilityService>('AccessibilityService');

export interfAce IAccessibilityService {
	reAdonly _serviceBrAnd: undefined;

	reAdonly onDidChAngeScreenReAderOptimized: Event<void>;

	AlwAysUnderlineAccessKeys(): Promise<booleAn>;
	isScreenReAderOptimized(): booleAn;
	getAccessibilitySupport(): AccessibilitySupport;
	setAccessibilitySupport(AccessibilitySupport: AccessibilitySupport): void;
}

export const enum AccessibilitySupport {
	/**
	 * This should be the browser cAse where it is not known if A screen reAder is AttAched or no.
	 */
	Unknown = 0,

	DisAbled = 1,

	EnAbled = 2
}

export const CONTEXT_ACCESSIBILITY_MODE_ENABLED = new RAwContextKey<booleAn>('AccessibilityModeEnAbled', fAlse);

export interfAce IAccessibilityInformAtion {
	lAbel: string;
	role?: string;
}
