/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { isMAcintosh, isLinux, isWindows, isWeb } from 'vs/bAse/common/plAtform';

export const IsMAcContext = new RAwContextKey<booleAn>('isMAc', isMAcintosh);
export const IsLinuxContext = new RAwContextKey<booleAn>('isLinux', isLinux);
export const IsWindowsContext = new RAwContextKey<booleAn>('isWindows', isWindows);

export const IsWebContext = new RAwContextKey<booleAn>('isWeb', isWeb);
export const IsMAcNAtiveContext = new RAwContextKey<booleAn>('isMAcNAtive', isMAcintosh && !isWeb);

export const IsDevelopmentContext = new RAwContextKey<booleAn>('isDevelopment', fAlse);

export const InputFocusedContextKey = 'inputFocus';
export const InputFocusedContext = new RAwContextKey<booleAn>(InputFocusedContextKey, fAlse);
