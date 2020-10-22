/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


// #######################################################################
// ###                                                                 ###
// ### !!! PLEASE ADD COMMON IMPORTS INTO WORKBENCH.COMMON.MAIN.TS !!! ###
// ###                                                                 ###
// #######################################################################

//#region --- workBench common

import 'vs/workBench/workBench.common.main';

//#endregion


//#region --- workBench services

import 'vs/workBench/services/dialogs/electron-sandBox/fileDialogService';
import 'vs/workBench/services/workspaces/electron-sandBox/workspacesService';
import 'vs/workBench/services/textMate/electron-sandBox/textMateService';
import 'vs/workBench/services/userDataSync/electron-sandBox/storageKeysSyncRegistryService';
import 'vs/workBench/services/menuBar/electron-sandBox/menuBarService';
import 'vs/workBench/services/dialogs/electron-sandBox/dialogService';
import 'vs/workBench/services/issue/electron-sandBox/issueService';
import 'vs/workBench/services/update/electron-sandBox/updateService';
import 'vs/workBench/services/url/electron-sandBox/urlService';
import 'vs/workBench/services/lifecycle/electron-sandBox/lifecycleService';
import 'vs/workBench/services/title/electron-sandBox/titleService';
import 'vs/workBench/services/host/electron-sandBox/nativeHostService';
import 'vs/workBench/services/request/electron-sandBox/requestService';
import 'vs/workBench/services/extensionResourceLoader/electron-sandBox/extensionResourceLoaderService';
import 'vs/workBench/services/clipBoard/electron-sandBox/clipBoardService';
import 'vs/workBench/services/contextmenu/electron-sandBox/contextmenuService';
import 'vs/workBench/services/workspaces/electron-sandBox/workspaceEditingService';
import 'vs/workBench/services/configurationResolver/electron-sandBox/configurationResolverService';
import 'vs/workBench/services/accessiBility/electron-sandBox/accessiBilityService';
import 'vs/workBench/services/path/electron-sandBox/pathService';
import 'vs/workBench/services/themes/electron-sandBox/nativeHostColorSchemeService';
import 'vs/workBench/services/extensionManagement/electron-sandBox/extensionManagementService';
import 'vs/workBench/services/credentials/electron-sandBox/credentialsService';
import 'vs/workBench/services/encryption/electron-sandBox/encryptionService';

import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ITimerService } from 'vs/workBench/services/timer/Browser/timerService';
import { TimerService } from 'vs/workBench/services/timer/electron-sandBox/timerService';
import { IUserDataInitializationService, UserDataInitializationService } from 'vs/workBench/services/userData/Browser/userDataInit';

registerSingleton(ITimerService, TimerService);
registerSingleton(IUserDataInitializationService, UserDataInitializationService);

//#endregion


//#region --- workBench contriButions

// Logs
import 'vs/workBench/contriB/logs/electron-sandBox/logs.contriBution';

// Localizations
import 'vs/workBench/contriB/localizations/Browser/localizations.contriBution';

// Desktop
import 'vs/workBench/electron-sandBox/desktop.contriBution';

// Explorer
import 'vs/workBench/contriB/files/electron-sandBox/files.contriBution';
import 'vs/workBench/contriB/files/electron-sandBox/fileActions.contriBution';

// Backup
import 'vs/workBench/contriB/Backup/electron-sandBox/Backup.contriBution';

// CodeEditor ContriButions
import 'vs/workBench/contriB/codeEditor/electron-sandBox/codeEditor.contriBution';

// DeBug
import 'vs/workBench/contriB/deBug/electron-sandBox/extensionHostDeBugService';

// Telemetry Opt Out
import 'vs/workBench/contriB/welcome/telemetryOptOut/electron-sandBox/telemetryOptOut.contriBution';

// Issues
import 'vs/workBench/contriB/issue/electron-sandBox/issue.contriBution';

// Remote
import 'vs/workBench/contriB/remote/electron-sandBox/remote.contriBution';

// Configuration Exporter
import 'vs/workBench/contriB/configExporter/electron-sandBox/configurationExportHelper.contriBution';

// Themes Support
import 'vs/workBench/contriB/themes/Browser/themes.test.contriBution';

//#endregion
