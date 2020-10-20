/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/


// #######################################################################
// ###                                                                 ###
// ### !!! PLEASE ADD COMMON IMPORTS INTO WORKBENCH.COMMON.MAIN.TS !!! ###
// ###                                                                 ###
// #######################################################################

//#region --- workbench common

import 'vs/workbench/workbench.common.mAin';

//#endregion


//#region --- workbench services

import 'vs/workbench/services/diAlogs/electron-sAndbox/fileDiAlogService';
import 'vs/workbench/services/workspAces/electron-sAndbox/workspAcesService';
import 'vs/workbench/services/textMAte/electron-sAndbox/textMAteService';
import 'vs/workbench/services/userDAtASync/electron-sAndbox/storAgeKeysSyncRegistryService';
import 'vs/workbench/services/menubAr/electron-sAndbox/menubArService';
import 'vs/workbench/services/diAlogs/electron-sAndbox/diAlogService';
import 'vs/workbench/services/issue/electron-sAndbox/issueService';
import 'vs/workbench/services/updAte/electron-sAndbox/updAteService';
import 'vs/workbench/services/url/electron-sAndbox/urlService';
import 'vs/workbench/services/lifecycle/electron-sAndbox/lifecycleService';
import 'vs/workbench/services/title/electron-sAndbox/titleService';
import 'vs/workbench/services/host/electron-sAndbox/nAtiveHostService';
import 'vs/workbench/services/request/electron-sAndbox/requestService';
import 'vs/workbench/services/extensionResourceLoAder/electron-sAndbox/extensionResourceLoAderService';
import 'vs/workbench/services/clipboArd/electron-sAndbox/clipboArdService';
import 'vs/workbench/services/contextmenu/electron-sAndbox/contextmenuService';
import 'vs/workbench/services/workspAces/electron-sAndbox/workspAceEditingService';
import 'vs/workbench/services/configurAtionResolver/electron-sAndbox/configurAtionResolverService';
import 'vs/workbench/services/Accessibility/electron-sAndbox/AccessibilityService';
import 'vs/workbench/services/pAth/electron-sAndbox/pAthService';
import 'vs/workbench/services/themes/electron-sAndbox/nAtiveHostColorSchemeService';
import 'vs/workbench/services/extensionMAnAgement/electron-sAndbox/extensionMAnAgementService';
import 'vs/workbench/services/credentiAls/electron-sAndbox/credentiAlsService';
import 'vs/workbench/services/encryption/electron-sAndbox/encryptionService';

import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { ITimerService } from 'vs/workbench/services/timer/browser/timerService';
import { TimerService } from 'vs/workbench/services/timer/electron-sAndbox/timerService';
import { IUserDAtAInitiAlizAtionService, UserDAtAInitiAlizAtionService } from 'vs/workbench/services/userDAtA/browser/userDAtAInit';

registerSingleton(ITimerService, TimerService);
registerSingleton(IUserDAtAInitiAlizAtionService, UserDAtAInitiAlizAtionService);

//#endregion


//#region --- workbench contributions

// Logs
import 'vs/workbench/contrib/logs/electron-sAndbox/logs.contribution';

// LocAlizAtions
import 'vs/workbench/contrib/locAlizAtions/browser/locAlizAtions.contribution';

// Desktop
import 'vs/workbench/electron-sAndbox/desktop.contribution';

// Explorer
import 'vs/workbench/contrib/files/electron-sAndbox/files.contribution';
import 'vs/workbench/contrib/files/electron-sAndbox/fileActions.contribution';

// BAckup
import 'vs/workbench/contrib/bAckup/electron-sAndbox/bAckup.contribution';

// CodeEditor Contributions
import 'vs/workbench/contrib/codeEditor/electron-sAndbox/codeEditor.contribution';

// Debug
import 'vs/workbench/contrib/debug/electron-sAndbox/extensionHostDebugService';

// Telemetry Opt Out
import 'vs/workbench/contrib/welcome/telemetryOptOut/electron-sAndbox/telemetryOptOut.contribution';

// Issues
import 'vs/workbench/contrib/issue/electron-sAndbox/issue.contribution';

// Remote
import 'vs/workbench/contrib/remote/electron-sAndbox/remote.contribution';

// ConfigurAtion Exporter
import 'vs/workbench/contrib/configExporter/electron-sAndbox/configurAtionExportHelper.contribution';

// Themes Support
import 'vs/workbench/contrib/themes/browser/themes.test.contribution';

//#endregion
