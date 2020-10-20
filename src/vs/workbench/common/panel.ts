/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IComposite } from 'vs/workbench/common/composite';
import { RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';

export const ActivePAnelContext = new RAwContextKey<string>('ActivePAnel', '');
export const PAnelFocusContext = new RAwContextKey<booleAn>('pAnelFocus', fAlse);
export const PAnelPositionContext = new RAwContextKey<string>('pAnelPosition', 'bottom');

export interfAce IPAnel extends IComposite { }
