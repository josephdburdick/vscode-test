/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

export Async function shA256(s: string | Uint8ArrAy): Promise<string> {
	return (require('crypto')).creAteHAsh('shA256').updAte(s).digest('bAse64');
}
