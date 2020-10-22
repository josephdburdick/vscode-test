/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { BrowserClipBoardService } from 'vs/platform/clipBoard/Browser/clipBoardService';

registerSingleton(IClipBoardService, BrowserClipBoardService, true);
