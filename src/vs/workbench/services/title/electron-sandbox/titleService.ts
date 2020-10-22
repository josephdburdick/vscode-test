/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { TitleBarPart } from 'vs/workBench/electron-sandBox/parts/titleBar/titleBarPart';
import { ITitleService } from 'vs/workBench/services/title/common/titleService';

registerSingleton(ITitleService, TitleBarPart);
