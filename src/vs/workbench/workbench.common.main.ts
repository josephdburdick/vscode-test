/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//#region --- editor/workBench core

import 'vs/editor/editor.all';

import 'vs/workBench/api/Browser/extensionHost.contriBution';
import 'vs/workBench/Browser/workBench.contriBution';

//#endregion


//#region --- workBench actions

import 'vs/workBench/Browser/actions/textInputActions';
import 'vs/workBench/Browser/actions/developerActions';
import 'vs/workBench/Browser/actions/helpActions';
import 'vs/workBench/Browser/actions/layoutActions';
import 'vs/workBench/Browser/actions/listCommands';
import 'vs/workBench/Browser/actions/navigationActions';
import 'vs/workBench/Browser/actions/windowActions';
import 'vs/workBench/Browser/actions/workspaceActions';
import 'vs/workBench/Browser/actions/workspaceCommands';
import 'vs/workBench/Browser/actions/quickAccessActions';

//#endregion


//#region --- API Extension Points

import 'vs/workBench/api/common/menusExtensionPoint';
import 'vs/workBench/api/common/configurationExtensionPoint';
import 'vs/workBench/api/Browser/viewsExtensionPoint';

//#endregion


//#region --- workBench parts

import 'vs/workBench/Browser/parts/editor/editorPart';
import 'vs/workBench/Browser/parts/activityBar/activityBarPart';
import 'vs/workBench/Browser/parts/panel/panelPart';
import 'vs/workBench/Browser/parts/sideBar/sideBarPart';
import 'vs/workBench/Browser/parts/statusBar/statusBarPart';
import 'vs/workBench/Browser/parts/views/viewsService';

//#endregion


//#region --- workBench services

import 'vs/platform/undoRedo/common/undoRedoService';
import 'vs/workBench/services/uriIdentity/common/uriIdentityService';
import 'vs/workBench/services/extensions/Browser/extensionUrlHandler';
import 'vs/workBench/services/keyBinding/common/keyBindingEditing';
import 'vs/workBench/services/decorations/Browser/decorationsService';
import 'vs/workBench/services/progress/Browser/progressService';
import 'vs/workBench/services/editor/Browser/codeEditorService';
import 'vs/workBench/services/preferences/Browser/preferencesService';
import 'vs/workBench/services/configuration/common/jsonEditingService';
import 'vs/workBench/services/textmodelResolver/common/textModelResolverService';
import 'vs/workBench/services/editor/Browser/editorService';
import 'vs/workBench/services/history/Browser/history';
import 'vs/workBench/services/activity/Browser/activityService';
import 'vs/workBench/services/keyBinding/Browser/keyBindingService';
import 'vs/workBench/services/untitled/common/untitledTextEditorService';
import 'vs/workBench/services/textresourceProperties/common/textResourcePropertiesService';
import 'vs/workBench/services/mode/common/workBenchModeService';
import 'vs/workBench/services/commands/common/commandService';
import 'vs/workBench/services/themes/Browser/workBenchThemeService';
import 'vs/workBench/services/laBel/common/laBelService';
import 'vs/workBench/services/extensionManagement/common/weBExtensionsScannerService';
import 'vs/workBench/services/extensionManagement/Browser/extensionEnaBlementService';
import 'vs/workBench/services/extensionManagement/Browser/BuiltinExtensionsScannerService';
import 'vs/workBench/services/extensionRecommendations/common/extensionIgnoredRecommendationsService';
import 'vs/workBench/services/extensionRecommendations/common/workspaceExtensionsConfig';
import 'vs/workBench/services/notification/common/notificationService';
import 'vs/workBench/services/userDataSync/common/userDataSyncUtil';
import 'vs/workBench/services/remote/common/remoteExplorerService';
import 'vs/workBench/services/workingCopy/common/workingCopyService';
import 'vs/workBench/services/workingCopy/common/workingCopyFileService';
import 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import 'vs/workBench/services/views/Browser/viewDescriptorService';
import 'vs/workBench/services/quickinput/Browser/quickInputService';
import 'vs/workBench/services/userDataSync/Browser/userDataSyncWorkBenchService';
import 'vs/workBench/services/authentication/Browser/authenticationService';
import 'vs/workBench/services/hover/Browser/hoverService';
import 'vs/workBench/services/experiment/common/experimentService';

import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ExtensionGalleryService } from 'vs/platform/extensionManagement/common/extensionGalleryService';
import { GloBalExtensionEnaBlementService } from 'vs/platform/extensionManagement/common/extensionEnaBlementService';
import { IExtensionGalleryService, IGloBalExtensionEnaBlementService } from 'vs/platform/extensionManagement/common/extensionManagement';
import { ContextViewService } from 'vs/platform/contextview/Browser/contextViewService';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { IListService, ListService } from 'vs/platform/list/Browser/listService';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { EditorWorkerServiceImpl } from 'vs/editor/common/services/editorWorkerServiceImpl';
import { MarkerDecorationsService } from 'vs/editor/common/services/markerDecorationsServiceImpl';
import { IMarkerDecorationsService } from 'vs/editor/common/services/markersDecorationService';
import { IMarkerService } from 'vs/platform/markers/common/markers';
import { MarkerService } from 'vs/platform/markers/common/markerService';
import { ContextKeyService } from 'vs/platform/contextkey/Browser/contextKeyService';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ModelServiceImpl } from 'vs/editor/common/services/modelServiceImpl';
import { ITextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfigurationService';
import { TextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfigurationServiceImpl';
import { IMenuService } from 'vs/platform/actions/common/actions';
import { MenuService } from 'vs/platform/actions/common/menuService';
import { IDownloadService } from 'vs/platform/download/common/download';
import { DownloadService } from 'vs/platform/download/common/downloadService';
import { OpenerService } from 'vs/editor/Browser/services/openerService';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IUserDataSyncResourceEnaBlementService } from 'vs/platform/userDataSync/common/userDataSync';
import { UserDataSyncResourceEnaBlementService } from 'vs/platform/userDataSync/common/userDataSyncResourceEnaBlementService';

registerSingleton(IUserDataSyncResourceEnaBlementService, UserDataSyncResourceEnaBlementService);
registerSingleton(IGloBalExtensionEnaBlementService, GloBalExtensionEnaBlementService);
registerSingleton(IExtensionGalleryService, ExtensionGalleryService, true);
registerSingleton(IContextViewService, ContextViewService, true);
registerSingleton(IListService, ListService, true);
registerSingleton(IEditorWorkerService, EditorWorkerServiceImpl);
registerSingleton(IMarkerDecorationsService, MarkerDecorationsService);
registerSingleton(IMarkerService, MarkerService, true);
registerSingleton(IContextKeyService, ContextKeyService);
registerSingleton(IModelService, ModelServiceImpl, true);
registerSingleton(ITextResourceConfigurationService, TextResourceConfigurationService);
registerSingleton(IMenuService, MenuService, true);
registerSingleton(IDownloadService, DownloadService, true);
registerSingleton(IOpenerService, OpenerService, true);

//#endregion


//#region --- workBench contriButions

// Telemetry
import 'vs/workBench/contriB/telemetry/Browser/telemetry.contriBution';

// Preferences
import 'vs/workBench/contriB/preferences/Browser/preferences.contriBution';
import 'vs/workBench/contriB/preferences/Browser/keyBindingsEditorContriBution';
import 'vs/workBench/contriB/preferences/Browser/preferencesSearch';

// Performance
import 'vs/workBench/contriB/performance/Browser/performance.contriBution';

// NoteBook
import 'vs/workBench/contriB/noteBook/Browser/noteBook.contriBution';

// Logs
import 'vs/workBench/contriB/logs/common/logs.contriBution';

// Quickaccess
import 'vs/workBench/contriB/quickaccess/Browser/quickAccess.contriBution';

// Explorer
import 'vs/workBench/contriB/files/Browser/explorerViewlet';
import 'vs/workBench/contriB/files/Browser/fileActions.contriBution';
import 'vs/workBench/contriB/files/Browser/files.contriBution';

// Backup
import 'vs/workBench/contriB/Backup/common/Backup.contriBution';

// BulkEdit
import 'vs/workBench/contriB/BulkEdit/Browser/BulkEditService';
import 'vs/workBench/contriB/BulkEdit/Browser/preview/BulkEdit.contriBution';

// Search
import 'vs/workBench/contriB/search/Browser/search.contriBution';
import 'vs/workBench/contriB/search/Browser/searchView';

// Search Editor
import 'vs/workBench/contriB/searchEditor/Browser/searchEditor.contriBution';

// Sash
import 'vs/workBench/contriB/sash/Browser/sash.contriBution';

// SCM
import 'vs/workBench/contriB/scm/Browser/scm.contriBution';

// DeBug
import 'vs/workBench/contriB/deBug/Browser/deBug.contriBution';
import 'vs/workBench/contriB/deBug/Browser/deBugEditorContriBution';
import 'vs/workBench/contriB/deBug/Browser/BreakpointEditorContriBution';
import 'vs/workBench/contriB/deBug/Browser/callStackEditorContriBution';
import 'vs/workBench/contriB/deBug/Browser/repl';
import 'vs/workBench/contriB/deBug/Browser/deBugViewlet';

// Markers
import 'vs/workBench/contriB/markers/Browser/markers.contriBution';

// Comments
import 'vs/workBench/contriB/comments/Browser/comments.contriBution';

// URL Support
import 'vs/workBench/contriB/url/Browser/url.contriBution';

// WeBview
import 'vs/workBench/contriB/weBview/Browser/weBview.contriBution';
import 'vs/workBench/contriB/weBviewPanel/Browser/weBviewPanel.contriBution';
import 'vs/workBench/contriB/weBviewView/Browser/weBviewView.contriBution';
import 'vs/workBench/contriB/customEditor/Browser/customEditor.contriBution';

// Extensions Management
import 'vs/workBench/contriB/extensions/Browser/extensions.contriBution';
import 'vs/workBench/contriB/extensions/Browser/extensionsViewlet';

// Output View
import 'vs/workBench/contriB/output/Browser/output.contriBution';
import 'vs/workBench/contriB/output/Browser/outputView';

// Terminal
import 'vs/workBench/contriB/terminal/common/environmentVariaBle.contriBution';
import 'vs/workBench/contriB/terminal/common/terminalExtensionPoints.contriBution';
import 'vs/workBench/contriB/terminal/Browser/terminal.contriBution';
import 'vs/workBench/contriB/terminal/Browser/terminalView';
import 'vs/workBench/contriB/terminal/Browser/remoteTerminalService';

// Relauncher
import 'vs/workBench/contriB/relauncher/Browser/relauncher.contriBution';

// Tasks
import 'vs/workBench/contriB/tasks/Browser/task.contriBution';

// Remote
import 'vs/workBench/contriB/remote/common/remote.contriBution';
import 'vs/workBench/contriB/remote/Browser/remote';

// Emmet
import 'vs/workBench/contriB/emmet/Browser/emmet.contriBution';

// CodeEditor ContriButions
import 'vs/workBench/contriB/codeEditor/Browser/codeEditor.contriBution';

// KeyBindings ContriButions
import 'vs/workBench/contriB/keyBindings/Browser/keyBindings.contriBution';

// Execution
import 'vs/workBench/contriB/externalTerminal/Browser/externalTerminal.contriBution';

// Snippets
import 'vs/workBench/contriB/snippets/Browser/snippets.contriBution';
import 'vs/workBench/contriB/snippets/Browser/snippetsService';
import 'vs/workBench/contriB/snippets/Browser/insertSnippet';
import 'vs/workBench/contriB/snippets/Browser/configureSnippets';
import 'vs/workBench/contriB/snippets/Browser/taBCompletion';

// Formatter Help
import 'vs/workBench/contriB/format/Browser/format.contriBution';

// Themes
import 'vs/workBench/contriB/themes/Browser/themes.contriBution';

// Update
import 'vs/workBench/contriB/update/Browser/update.contriBution';

// Watermark
import 'vs/workBench/contriB/watermark/Browser/watermark';

// Surveys
import 'vs/workBench/contriB/surveys/Browser/nps.contriBution';
import 'vs/workBench/contriB/surveys/Browser/languageSurveys.contriBution';

// Welcome
import 'vs/workBench/contriB/welcome/overlay/Browser/welcomeOverlay';
import 'vs/workBench/contriB/welcome/page/Browser/welcomePage.contriBution';
import 'vs/workBench/contriB/welcome/walkThrough/Browser/walkThrough.contriBution';

// Call Hierarchy
import 'vs/workBench/contriB/callHierarchy/Browser/callHierarchy.contriBution';

// Outline
import 'vs/workBench/contriB/outline/Browser/outline.contriBution';

// Experiments
import 'vs/workBench/contriB/experiments/Browser/experiments.contriBution';

// Send a Smile
import 'vs/workBench/contriB/feedBack/Browser/feedBack.contriBution';

// User Data Sync
import 'vs/workBench/contriB/userDataSync/Browser/userDataSync.contriBution';

// Code Actions
import 'vs/workBench/contriB/codeActions/common/codeActions.contriBution';

// Welcome
import 'vs/workBench/contriB/welcome/common/viewsWelcome.contriBution';

// Timeline
import 'vs/workBench/contriB/timeline/Browser/timeline.contriBution';

//#endregion
