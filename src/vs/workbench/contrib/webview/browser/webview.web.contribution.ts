/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IWeBviewService } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { WeBviewService } from './weBviewService';

registerSingleton(IWeBviewService, WeBviewService, true);
