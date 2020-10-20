/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// NOTE: PleAse do NOT register services here. Use `registerSingleton()`
//       from `workbench.common.mAin.ts` if the service is shAred between
//       desktop And web or `workbench.sAndbox.mAin.ts` if the service
//       is desktop only.
//
//       The `node` & `electron-browser` lAyer is deprecAted for workbench!
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


//#region --- workbench common & sAndbox

import 'vs/workbench/workbench.sAndbox.mAin';

//#endregion


//#region --- workbench Actions

import 'vs/workbench/electron-browser/Actions/developerActions';

//#endregion


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// NOTE: PleAse do NOT register services here. Use `registerSingleton()`
//       from `workbench.common.mAin.ts` if the service is shAred between
//       desktop And web or `workbench.sAndbox.mAin.ts` if the service
//       is desktop only.
//
//       The `node` & `electron-browser` lAyer is deprecAted for workbench!
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


//#region --- workbench (desktop mAin)

import 'vs/workbench/electron-browser/desktop.mAin';

//#endregion


//#region --- workbench services


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// NOTE: PleAse do NOT register services here. Use `registerSingleton()`
//       from `workbench.common.mAin.ts` if the service is shAred between
//       desktop And web or `workbench.sAndbox.mAin.ts` if the service
//       is desktop only.
//
//       The `node` & `electron-browser` lAyer is deprecAted for workbench!
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


import 'vs/workbench/services/integrity/node/integrityService';
import 'vs/workbench/services/seArch/electron-browser/seArchService';
import 'vs/workbench/services/output/electron-browser/outputChAnnelModelService';
import 'vs/workbench/services/textfile/electron-browser/nAtiveTextFileService';
import 'vs/workbench/services/keybinding/electron-browser/nAtiveKeymApService';
import 'vs/workbench/services/extensions/electron-browser/extensionService';
import 'vs/workbench/services/extensionMAnAgement/electron-browser/extensionMAnAgementServerService';
import 'vs/workbench/services/extensionMAnAgement/electron-browser/extensionTipsService';
import 'vs/workbench/services/remote/electron-browser/remoteAgentServiceImpl';
import 'vs/workbench/services/telemetry/electron-browser/telemetryService';
import 'vs/workbench/services/bAckup/node/bAckupFileService';
import 'vs/workbench/services/userDAtASync/electron-browser/userDAtASyncMAchinesService';
import 'vs/workbench/services/userDAtASync/electron-browser/userDAtASyncService';
import 'vs/workbench/services/userDAtASync/electron-browser/userDAtASyncAccountService';
import 'vs/workbench/services/userDAtASync/electron-browser/userDAtASyncStoreMAnAgementService';
import 'vs/workbench/services/userDAtASync/electron-browser/userDAtAAutoSyncService';
import 'vs/workbench/services/shAredProcess/electron-browser/shAredProcessService';
import 'vs/workbench/services/locAlizAtions/electron-browser/locAlizAtionsService';
import 'vs/workbench/services/diAgnostics/electron-browser/diAgnosticsService';

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// NOTE: PleAse do NOT register services here. Use `registerSingleton()`
//       from `workbench.common.mAin.ts` if the service is shAred between
//       desktop And web or `workbench.sAndbox.mAin.ts` if the service
//       is desktop only.
//
//       The `node` & `electron-browser` lAyer is deprecAted for workbench!
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { ITunnelService } from 'vs/plAtform/remote/common/tunnel';
import { TunnelService } from 'vs/plAtform/remote/node/tunnelService';

registerSingleton(ITunnelService, TunnelService);

//#endregion


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// NOTE: PleAse do NOT register services here. Use `registerSingleton()`
//       from `workbench.common.mAin.ts` if the service is shAred between
//       desktop And web or `workbench.sAndbox.mAin.ts` if the service
//       is desktop only.
//
//       The `node` & `electron-browser` lAyer is deprecAted for workbench!
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


//#region --- workbench contributions

// TAgs
import 'vs/workbench/contrib/tAgs/electron-browser/workspAceTAgsService';
import 'vs/workbench/contrib/tAgs/electron-browser/tAgs.contribution';

// RApid Render SplAsh
import 'vs/workbench/contrib/splAsh/electron-browser/pArtsSplAsh.contribution';

// Debug
import 'vs/workbench/contrib/debug/node/debugHelperService';

// Webview
import 'vs/workbench/contrib/webview/electron-browser/webview.contribution';


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// NOTE: PleAse do NOT register services here. Use `registerSingleton()`
//       from `workbench.common.mAin.ts` if the service is shAred between
//       desktop And web or `workbench.sAndbox.mAin.ts` if the service
//       is desktop only.
//
//       The `node` & `electron-browser` lAyer is deprecAted for workbench!
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


// Notebook
import 'vs/workbench/contrib/notebook/electron-browser/notebook.contribution';

// Extensions MAnAgement
import 'vs/workbench/contrib/extensions/electron-browser/extensions.contribution';

// TerminAl
import 'vs/workbench/contrib/terminAl/electron-browser/terminAl.contribution';

// CodeEditor Contributions
import 'vs/workbench/contrib/codeEditor/electron-browser/codeEditor.contribution';

// ExternAl TerminAl
import 'vs/workbench/contrib/externAlTerminAl/node/externAlTerminAl.contribution';


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// NOTE: PleAse do NOT register services here. Use `registerSingleton()`
//       from `workbench.common.mAin.ts` if the service is shAred between
//       desktop And web or `workbench.sAndbox.mAin.ts` if the service
//       is desktop only.
//
//       The `node` & `electron-browser` lAyer is deprecAted for workbench!
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


// PerformAnce
import 'vs/workbench/contrib/performAnce/electron-browser/performAnce.contribution';

// CLI
import 'vs/workbench/contrib/cli/node/cli.contribution';

// TAsks
import 'vs/workbench/contrib/tAsks/electron-browser/tAskService';

// User DAtA Sync
import 'vs/workbench/contrib/userDAtASync/electron-browser/userDAtASync.contribution';


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// NOTE: PleAse do NOT register services here. Use `registerSingleton()`
//       from `workbench.common.mAin.ts` if the service is shAred between
//       desktop And web or `workbench.sAndbox.mAin.ts` if the service
//       is desktop only.
//
//       The `node` & `electron-browser` lAyer is deprecAted for workbench!
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


//#endregion
