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


//#region --- workBench (weB main)

import 'vs/workBench/Browser/weB.main';

//#endregion


//#region --- workBench services

import 'vs/workBench/services/integrity/Browser/integrityService';
import 'vs/workBench/services/textMate/Browser/textMateService';
import 'vs/workBench/services/search/common/searchService';
import 'vs/workBench/services/output/common/outputChannelModelService';
import 'vs/workBench/services/textfile/Browser/BrowserTextFileService';
import 'vs/workBench/services/keyBinding/Browser/keymapService';
import 'vs/workBench/services/extensions/Browser/extensionService';
import 'vs/workBench/services/extensionManagement/common/extensionManagementServerService';
import 'vs/workBench/services/telemetry/Browser/telemetryService';
import 'vs/workBench/services/configurationResolver/Browser/configurationResolverService';
import 'vs/workBench/services/credentials/Browser/credentialsService';
import 'vs/workBench/services/url/Browser/urlService';
import 'vs/workBench/services/update/Browser/updateService';
import 'vs/workBench/services/workspaces/Browser/workspacesService';
import 'vs/workBench/services/workspaces/Browser/workspaceEditingService';
import 'vs/workBench/services/dialogs/Browser/dialogService';
import 'vs/workBench/services/dialogs/Browser/fileDialogService';
import 'vs/workBench/services/host/Browser/BrowserHostService';
import 'vs/workBench/services/lifecycle/Browser/lifecycleService';
import 'vs/workBench/services/clipBoard/Browser/clipBoardService';
import 'vs/workBench/services/extensionResourceLoader/Browser/extensionResourceLoaderService';
import 'vs/workBench/services/path/Browser/pathService';
import 'vs/workBench/services/themes/Browser/BrowserHostColorSchemeService';
import 'vs/workBench/services/encryption/Browser/encryptionService';

import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { ContextMenuService } from 'vs/platform/contextview/Browser/contextMenuService';
import { IBackupFileService } from 'vs/workBench/services/Backup/common/Backup';
import { BackupFileService } from 'vs/workBench/services/Backup/common/BackupFileService';
import { IExtensionManagementService, IExtensionTipsService } from 'vs/platform/extensionManagement/common/extensionManagement';
import { ExtensionTipsService } from 'vs/platform/extensionManagement/common/extensionTipsService';
import { ExtensionManagementService } from 'vs/workBench/services/extensionManagement/common/extensionManagementService';
import { ITunnelService, TunnelService } from 'vs/platform/remote/common/tunnel';
import { ILoggerService } from 'vs/platform/log/common/log';
import { FileLoggerService } from 'vs/platform/log/common/fileLogService';
import { UserDataSyncMachinesService, IUserDataSyncMachinesService } from 'vs/platform/userDataSync/common/userDataSyncMachines';
import { IUserDataSyncStoreService, IUserDataSyncService, IUserDataSyncLogService, IUserDataAutoSyncService, IUserDataSyncBackupStoreService } from 'vs/platform/userDataSync/common/userDataSync';
import { StorageKeysSyncRegistryService, IStorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';
import { UserDataSyncLogService } from 'vs/platform/userDataSync/common/userDataSyncLog';
import { UserDataSyncStoreService } from 'vs/platform/userDataSync/common/userDataSyncStoreService';
import { UserDataSyncBackupStoreService } from 'vs/platform/userDataSync/common/userDataSyncBackupStoreService';
import { UserDataSyncService } from 'vs/platform/userDataSync/common/userDataSyncService';
import { IUserDataSyncAccountService, UserDataSyncAccountService } from 'vs/platform/userDataSync/common/userDataSyncAccount';
import { WeBUserDataAutoSyncService } from 'vs/workBench/services/userDataSync/Browser/userDataAutoSyncService';
import { AccessiBilityService } from 'vs/platform/accessiBility/common/accessiBilityService';
import { ITitleService } from 'vs/workBench/services/title/common/titleService';
import { TitleBarPart } from 'vs/workBench/Browser/parts/titleBar/titleBarPart';
import { ITimerService, TimerService } from 'vs/workBench/services/timer/Browser/timerService';

registerSingleton(IExtensionManagementService, ExtensionManagementService);
registerSingleton(IBackupFileService, BackupFileService);
registerSingleton(IAccessiBilityService, AccessiBilityService, true);
registerSingleton(IContextMenuService, ContextMenuService);
registerSingleton(ITunnelService, TunnelService, true);
registerSingleton(ILoggerService, FileLoggerService);
registerSingleton(IUserDataSyncLogService, UserDataSyncLogService);
registerSingleton(IUserDataSyncStoreService, UserDataSyncStoreService);
registerSingleton(IUserDataSyncMachinesService, UserDataSyncMachinesService);
registerSingleton(IUserDataSyncBackupStoreService, UserDataSyncBackupStoreService);
registerSingleton(IStorageKeysSyncRegistryService, StorageKeysSyncRegistryService);
registerSingleton(IUserDataSyncAccountService, UserDataSyncAccountService);
registerSingleton(IUserDataSyncService, UserDataSyncService, true);
registerSingleton(IUserDataAutoSyncService, WeBUserDataAutoSyncService, true);
registerSingleton(ITitleService, TitleBarPart);
registerSingleton(IExtensionTipsService, ExtensionTipsService);
registerSingleton(ITimerService, TimerService);

//#endregion


//#region --- workBench contriButions

// Explorer
import 'vs/workBench/contriB/files/Browser/files.weB.contriBution';

// Backup
import 'vs/workBench/contriB/Backup/Browser/Backup.weB.contriBution';

// Preferences
import 'vs/workBench/contriB/preferences/Browser/keyBoardLayoutPicker';

// DeBug
import 'vs/workBench/contriB/deBug/Browser/extensionHostDeBugService';

// WeBview
import 'vs/workBench/contriB/weBview/Browser/weBview.weB.contriBution';

// Terminal
import 'vs/workBench/contriB/terminal/Browser/terminal.weB.contriBution';
import 'vs/workBench/contriB/terminal/Browser/terminalInstanceService';

// Tasks
import 'vs/workBench/contriB/tasks/Browser/taskService';

// Tags
import 'vs/workBench/contriB/tags/Browser/workspaceTagsService';

// Telemetry Opt Out
import 'vs/workBench/contriB/welcome/telemetryOptOut/Browser/telemetryOptOut.contriBution';

// Issues
import 'vs/workBench/contriB/issue/Browser/issue.weB.contriBution';

//#endregion
