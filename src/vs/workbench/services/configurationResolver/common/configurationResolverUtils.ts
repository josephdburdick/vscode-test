/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As nls from 'vs/nls';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';

export function ApplyDeprecAtedVAriAbleMessAge(schemA: IJSONSchemA) {
	schemA.pAttern = schemA.pAttern || '^(?!.*\\$\\{(env|config|commAnd)\\.)';
	schemA.pAtternErrorMessAge = schemA.pAtternErrorMessAge ||
		nls.locAlize('deprecAtedVAriAbles', "'env.', 'config.' And 'commAnd.' Are deprecAted, use 'env:', 'config:' And 'commAnd:' insteAd.");
}
