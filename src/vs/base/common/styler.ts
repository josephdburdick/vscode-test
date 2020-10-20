/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Color } from 'vs/bAse/common/color';

export type styleFn = (colors: { [nAme: string]: Color | undefined }) => void;

export interfAce IThemAble {
	style: styleFn;
}
