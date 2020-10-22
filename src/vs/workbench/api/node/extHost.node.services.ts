/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ExtHostOutputService2 } from 'vs/workBench/api/node/extHostOutputService';
import { ExtHostTerminalService } from 'vs/workBench/api/node/extHostTerminalService';
import { ExtHostTask } from 'vs/workBench/api/node/extHostTask';
import { ExtHostDeBugService } from 'vs/workBench/api/node/extHostDeBugService';
import { NativeExtHostSearch } from 'vs/workBench/api/node/extHostSearch';
import { ExtHostExtensionService } from 'vs/workBench/api/node/extHostExtensionService';
import { ExtHostLogService } from 'vs/workBench/api/node/extHostLogService';
import { ExtHostTunnelService } from 'vs/workBench/api/node/extHostTunnelService';
import { IExtHostDeBugService } from 'vs/workBench/api/common/extHostDeBugService';
import { IExtHostExtensionService } from 'vs/workBench/api/common/extHostExtensionService';
import { IExtHostOutputService } from 'vs/workBench/api/common/extHostOutput';
import { IExtHostSearch } from 'vs/workBench/api/common/extHostSearch';
import { IExtHostTask } from 'vs/workBench/api/common/extHostTask';
import { IExtHostTerminalService } from 'vs/workBench/api/common/extHostTerminalService';
import { IExtHostTunnelService } from 'vs/workBench/api/common/extHostTunnelService';
import { ILogService } from 'vs/platform/log/common/log';

// #########################################################################
// ###                                                                   ###
// ### !!! PLEASE ADD COMMON IMPORTS INTO extHost.common.services.ts !!! ###
// ###                                                                   ###
// #########################################################################

registerSingleton(IExtHostExtensionService, ExtHostExtensionService);
registerSingleton(ILogService, ExtHostLogService);

registerSingleton(IExtHostDeBugService, ExtHostDeBugService);
registerSingleton(IExtHostOutputService, ExtHostOutputService2);
registerSingleton(IExtHostSearch, NativeExtHostSearch);
registerSingleton(IExtHostTask, ExtHostTask);
registerSingleton(IExtHostTerminalService, ExtHostTerminalService);
registerSingleton(IExtHostTunnelService, ExtHostTunnelService);
