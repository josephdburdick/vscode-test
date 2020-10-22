/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { isMacintosh, isLinux, isWindows, isWeB } from 'vs/Base/common/platform';

export const IsMacContext = new RawContextKey<Boolean>('isMac', isMacintosh);
export const IsLinuxContext = new RawContextKey<Boolean>('isLinux', isLinux);
export const IsWindowsContext = new RawContextKey<Boolean>('isWindows', isWindows);

export const IsWeBContext = new RawContextKey<Boolean>('isWeB', isWeB);
export const IsMacNativeContext = new RawContextKey<Boolean>('isMacNative', isMacintosh && !isWeB);

export const IsDevelopmentContext = new RawContextKey<Boolean>('isDevelopment', false);

export const InputFocusedContextKey = 'inputFocus';
export const InputFocusedContext = new RawContextKey<Boolean>(InputFocusedContextKey, false);
