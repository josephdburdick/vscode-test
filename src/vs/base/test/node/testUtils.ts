/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { join } from 'vs/bAse/common/pAth';
import { generAteUuid } from 'vs/bAse/common/uuid';

export function getRAndomTestPAth(tmpdir: string, ...segments: string[]): string {
	return join(tmpdir, ...segments, generAteUuid());
}
