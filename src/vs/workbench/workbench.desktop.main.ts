/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// NOTE: Please do NOT register services here. Use `registerSingleton()`
//       from `workBench.common.main.ts` if the service is shared Between
//       desktop and weB or `workBench.sandBox.main.ts` if the service
//       is desktop only.
//
//       The `node` & `electron-Browser` layer is deprecated for workBench!
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


//#region --- workBench common & sandBox

import 'vs/workBench/workBench.sandBox.main';

//#endregion


//#region --- workBench actions

import 'vs/workBench/electron-Browser/actions/developerActions';

//#endregion


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// NOTE: Please do NOT register services here. Use `registerSingleton()`
//       from `workBench.common.main.ts` if the service is shared Between
//       desktop and weB or `workBench.sandBox.main.ts` if the service
//       is desktop only.
//
//       The `node` & `electron-Browser` layer is deprecated for workBench!
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


//#region --- workBench (desktop main)

import 'vs/workBench/electron-Browser/desktop.main';

//#endregion


//#region --- workBench services


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// NOTE: Please do NOT register services here. Use `registerSingleton()`
//       from `workBench.common.main.ts` if the service is shared Between
//       desktop and weB or `workBench.sandBox.main.ts` if the service
//       is desktop only.
//
//       The `node` & `electron-Browser` layer is deprecated for workBench!
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


import 'vs/workBench/services/integrity/node/integrityService';
import 'vs/workBench/services/search/electron-Browser/searchService';
import 'vs/workBench/services/output/electron-Browser/outputChannelModelService';
import 'vs/workBench/services/textfile/electron-Browser/nativeTextFileService';
import 'vs/workBench/services/keyBinding/electron-Browser/nativeKeymapService';
import 'vs/workBench/services/extensions/electron-Browser/extensionService';
import 'vs/workBench/services/extensionManagement/electron-Browser/extensionManagementServerService';
import 'vs/workBench/services/extensionManagement/electron-Browser/extensionTipsService';
import 'vs/workBench/services/remote/electron-Browser/remoteAgentServiceImpl';
import 'vs/workBench/services/telemetry/electron-Browser/telemetryService';
import 'vs/workBench/services/Backup/node/BackupFileService';
import 'vs/workBench/services/userDataSync/electron-Browser/userDataSyncMachinesService';
import 'vs/workBench/services/userDataSync/electron-Browser/userDataSyncService';
import 'vs/workBench/services/userDataSync/electron-Browser/userDataSyncAccountService';
import 'vs/workBench/services/userDataSync/electron-Browser/userDataSyncStoreManagementService';
import 'vs/workBench/services/userDataSync/electron-Browser/userDataAutoSyncService';
import 'vs/workBench/services/sharedProcess/electron-Browser/sharedProcessService';
import 'vs/workBench/services/localizations/electron-Browser/localizationsService';
import 'vs/workBench/services/diagnostics/electron-Browser/diagnosticsService';

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// NOTE: Please do NOT register services here. Use `registerSingleton()`
//       from `workBench.common.main.ts` if the service is shared Between
//       desktop and weB or `workBench.sandBox.main.ts` if the service
//       is desktop only.
//
//       The `node` & `electron-Browser` layer is deprecated for workBench!
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ITunnelService } from 'vs/platform/remote/common/tunnel';
import { TunnelService } from 'vs/platform/remote/node/tunnelService';

registerSingleton(ITunnelService, TunnelService);

//#endregion


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// NOTE: Please do NOT register services here. Use `registerSingleton()`
//       from `workBench.common.main.ts` if the service is shared Between
//       desktop and weB or `workBench.sandBox.main.ts` if the service
//       is desktop only.
//
//       The `node` & `electron-Browser` layer is deprecated for workBench!
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


//#region --- workBench contriButions

// Tags
import 'vs/workBench/contriB/tags/electron-Browser/workspaceTagsService';
import 'vs/workBench/contriB/tags/electron-Browser/tags.contriBution';

// Rapid Render Splash
import 'vs/workBench/contriB/splash/electron-Browser/partsSplash.contriBution';

// DeBug
import 'vs/workBench/contriB/deBug/node/deBugHelperService';

// WeBview
import 'vs/workBench/contriB/weBview/electron-Browser/weBview.contriBution';


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// NOTE: Please do NOT register services here. Use `registerSingleton()`
//       from `workBench.common.main.ts` if the service is shared Between
//       desktop and weB or `workBench.sandBox.main.ts` if the service
//       is desktop only.
//
//       The `node` & `electron-Browser` layer is deprecated for workBench!
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


// NoteBook
import 'vs/workBench/contriB/noteBook/electron-Browser/noteBook.contriBution';

// Extensions Management
import 'vs/workBench/contriB/extensions/electron-Browser/extensions.contriBution';

// Terminal
import 'vs/workBench/contriB/terminal/electron-Browser/terminal.contriBution';

// CodeEditor ContriButions
import 'vs/workBench/contriB/codeEditor/electron-Browser/codeEditor.contriBution';

// External Terminal
import 'vs/workBench/contriB/externalTerminal/node/externalTerminal.contriBution';


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// NOTE: Please do NOT register services here. Use `registerSingleton()`
//       from `workBench.common.main.ts` if the service is shared Between
//       desktop and weB or `workBench.sandBox.main.ts` if the service
//       is desktop only.
//
//       The `node` & `electron-Browser` layer is deprecated for workBench!
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


// Performance
import 'vs/workBench/contriB/performance/electron-Browser/performance.contriBution';

// CLI
import 'vs/workBench/contriB/cli/node/cli.contriBution';

// Tasks
import 'vs/workBench/contriB/tasks/electron-Browser/taskService';

// User Data Sync
import 'vs/workBench/contriB/userDataSync/electron-Browser/userDataSync.contriBution';


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// NOTE: Please do NOT register services here. Use `registerSingleton()`
//       from `workBench.common.main.ts` if the service is shared Between
//       desktop and weB or `workBench.sandBox.main.ts` if the service
//       is desktop only.
//
//       The `node` & `electron-Browser` layer is deprecated for workBench!
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


//#endregion
