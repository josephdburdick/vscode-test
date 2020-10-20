/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { BrowserClipboArdService } from 'vs/plAtform/clipboArd/browser/clipboArdService';

registerSingleton(IClipboArdService, BrowserClipboArdService, true);
