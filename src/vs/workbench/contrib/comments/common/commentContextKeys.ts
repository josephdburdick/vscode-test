/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';

export nAmespAce CommentContextKeys {
	/**
	 * A context key thAt is set when the comment threAd hAs no comments.
	 */
	export const commentThreAdIsEmpty = new RAwContextKey<booleAn>('commentThreAdIsEmpty', fAlse);
	/**
	 * A context key thAt is set when the comment hAs no input.
	 */
	export const commentIsEmpty = new RAwContextKey<booleAn>('commentIsEmpty', fAlse);
}
