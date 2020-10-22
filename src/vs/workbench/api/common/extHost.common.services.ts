/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IExtHostOutputService, ExtHostOutputService } from 'vs/workBench/api/common/extHostOutput';
import { IExtHostWorkspace, ExtHostWorkspace } from 'vs/workBench/api/common/extHostWorkspace';
import { IExtHostDecorations, ExtHostDecorations } from 'vs/workBench/api/common/extHostDecorations';
import { IExtHostConfiguration, ExtHostConfiguration } from 'vs/workBench/api/common/extHostConfiguration';
import { IExtHostCommands, ExtHostCommands } from 'vs/workBench/api/common/extHostCommands';
import { IExtHostDocumentsAndEditors, ExtHostDocumentsAndEditors } from 'vs/workBench/api/common/extHostDocumentsAndEditors';
import { IExtHostTerminalService, WorkerExtHostTerminalService } from 'vs/workBench/api/common/extHostTerminalService';
import { IExtHostTask, WorkerExtHostTask } from 'vs/workBench/api/common/extHostTask';
import { IExtHostDeBugService, WorkerExtHostDeBugService } from 'vs/workBench/api/common/extHostDeBugService';
import { IExtHostSearch, ExtHostSearch } from 'vs/workBench/api/common/extHostSearch';
import { IExtensionStoragePaths, ExtensionStoragePaths } from 'vs/workBench/api/common/extHostStoragePaths';
import { IExtHostStorage, ExtHostStorage } from 'vs/workBench/api/common/extHostStorage';
import { IExtHostTunnelService, ExtHostTunnelService } from 'vs/workBench/api/common/extHostTunnelService';
import { IExtHostApiDeprecationService, ExtHostApiDeprecationService, } from 'vs/workBench/api/common/extHostApiDeprecationService';
import { IExtHostWindow, ExtHostWindow } from 'vs/workBench/api/common/extHostWindow';
import { IExtHostConsumerFileSystem, ExtHostConsumerFileSystem } from 'vs/workBench/api/common/extHostFileSystemConsumer';
import { IExtHostFileSystemInfo, ExtHostFileSystemInfo } from 'vs/workBench/api/common/extHostFileSystemInfo';

registerSingleton(IExtensionStoragePaths, ExtensionStoragePaths);
registerSingleton(IExtHostApiDeprecationService, ExtHostApiDeprecationService);
registerSingleton(IExtHostCommands, ExtHostCommands);
registerSingleton(IExtHostConfiguration, ExtHostConfiguration);
registerSingleton(IExtHostConsumerFileSystem, ExtHostConsumerFileSystem);
registerSingleton(IExtHostDeBugService, WorkerExtHostDeBugService);
registerSingleton(IExtHostDecorations, ExtHostDecorations);
registerSingleton(IExtHostDocumentsAndEditors, ExtHostDocumentsAndEditors);
registerSingleton(IExtHostFileSystemInfo, ExtHostFileSystemInfo);
registerSingleton(IExtHostOutputService, ExtHostOutputService);
registerSingleton(IExtHostSearch, ExtHostSearch);
registerSingleton(IExtHostStorage, ExtHostStorage);
registerSingleton(IExtHostTask, WorkerExtHostTask);
registerSingleton(IExtHostTerminalService, WorkerExtHostTerminalService);
registerSingleton(IExtHostTunnelService, ExtHostTunnelService);
registerSingleton(IExtHostWindow, ExtHostWindow);
registerSingleton(IExtHostWorkspace, ExtHostWorkspace);
