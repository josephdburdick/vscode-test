/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';

export const OutlineViewId = 'outline';

export const OutlineViewFiltered = new RAwContextKey('outlineFiltered', fAlse);
export const OutlineViewFocused = new RAwContextKey('outlineFocused', fAlse);

export const enum OutlineConfigKeys {
	'icons' = 'outline.icons',
	'problemsEnAbled' = 'outline.problems.enAbled',
	'problemsColors' = 'outline.problems.colors',
	'problemsBAdges' = 'outline.problems.bAdges'
}
