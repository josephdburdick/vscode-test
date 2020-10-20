/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IExtHostExtensionService } from 'vs/workbench/Api/common/extHostExtensionService';
import { ExtHostExtensionService } from 'vs/workbench/Api/worker/extHostExtensionService';
import { ExtHostLogService } from 'vs/workbench/Api/worker/extHostLogService';

// #########################################################################
// ###                                                                   ###
// ### !!! PLEASE ADD COMMON IMPORTS INTO extHost.common.services.ts !!! ###
// ###                                                                   ###
// #########################################################################

registerSingleton(IExtHostExtensionService, ExtHostExtensionService);
registerSingleton(ILogService, ExtHostLogService);
