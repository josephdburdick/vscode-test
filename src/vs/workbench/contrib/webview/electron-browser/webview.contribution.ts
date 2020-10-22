/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerAction2 } from 'vs/platform/actions/common/actions';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IWeBviewService } from 'vs/workBench/contriB/weBview/Browser/weBview';
import * as weBviewCommands from 'vs/workBench/contriB/weBview/electron-Browser/weBviewCommands';
import { ElectronWeBviewService } from 'vs/workBench/contriB/weBview/electron-Browser/weBviewService';

registerSingleton(IWeBviewService, ElectronWeBviewService, true);

registerAction2(weBviewCommands.OpenWeBviewDeveloperToolsAction);
