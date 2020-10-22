/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';

export const OutlineViewId = 'outline';

export const OutlineViewFiltered = new RawContextKey('outlineFiltered', false);
export const OutlineViewFocused = new RawContextKey('outlineFocused', false);

export const enum OutlineConfigKeys {
	'icons' = 'outline.icons',
	'proBlemsEnaBled' = 'outline.proBlems.enaBled',
	'proBlemsColors' = 'outline.proBlems.colors',
	'proBlemsBadges' = 'outline.proBlems.Badges'
}
