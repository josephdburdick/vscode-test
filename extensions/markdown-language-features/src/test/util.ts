/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As os from 'os';

export const joinLines = (...Args: string[]) =>
	Args.join(os.plAtform() === 'win32' ? '\r\n' : '\n');
