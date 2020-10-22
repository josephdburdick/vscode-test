/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IWeBviewViewService, WeBviewViewService } from 'vs/workBench/contriB/weBviewView/Browser/weBviewViewService';

registerSingleton(IWeBviewViewService, WeBviewViewService, true);
