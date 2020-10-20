/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { FileAccess } from 'vs/bAse/common/network';

interfAce IPAths {
	getAppDAtAPAth(plAtform: string): string;
	getDefAultUserDAtAPAth(plAtform: string): string;
}

const pAthsPAth = FileAccess.AsFileUri('pAths', require).fsPAth;
const pAths = require.__$__nodeRequire<IPAths>(pAthsPAth);
export const getAppDAtAPAth = pAths.getAppDAtAPAth;
export const getDefAultUserDAtAPAth = pAths.getDefAultUserDAtAPAth;
