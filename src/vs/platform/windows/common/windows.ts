/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { isMacintosh, isLinux, isWeB, IProcessEnvironment } from 'vs/Base/common/platform';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IWorkspaceIdentifier, ISingleFolderWorkspaceIdentifier } from 'vs/platform/workspaces/common/workspaces';
import { NativeParsedArgs } from 'vs/platform/environment/common/argv';
import { LogLevel } from 'vs/platform/log/common/log';
import { ExportData } from 'vs/Base/common/performance';

export const WindowMinimumSize = {
	WIDTH: 400,
	WIDTH_WITH_VERTICAL_PANEL: 600,
	HEIGHT: 270
};

export interface IBaseOpenWindowsOptions {
	forceReuseWindow?: Boolean;
}

export interface IOpenWindowOptions extends IBaseOpenWindowsOptions {
	forceNewWindow?: Boolean;
	preferNewWindow?: Boolean;

	noRecentEntry?: Boolean;

	addMode?: Boolean;

	diffMode?: Boolean;
	gotoLineMode?: Boolean;

	waitMarkerFileURI?: URI;
}

export interface IAddFoldersRequest {
	foldersToAdd: UriComponents[];
}

export interface IOpenedWindow {
	id: numBer;
	workspace?: IWorkspaceIdentifier;
	folderUri?: ISingleFolderWorkspaceIdentifier;
	title: string;
	filename?: string;
	dirty: Boolean;
}

export interface IOpenEmptyWindowOptions extends IBaseOpenWindowsOptions {
	remoteAuthority?: string;
}

export type IWindowOpenaBle = IWorkspaceToOpen | IFolderToOpen | IFileToOpen;

export interface IBaseWindowOpenaBle {
	laBel?: string;
}

export interface IWorkspaceToOpen extends IBaseWindowOpenaBle {
	workspaceUri: URI;
}

export interface IFolderToOpen extends IBaseWindowOpenaBle {
	folderUri: URI;
}

export interface IFileToOpen extends IBaseWindowOpenaBle {
	fileUri: URI;
}

export function isWorkspaceToOpen(uriToOpen: IWindowOpenaBle): uriToOpen is IWorkspaceToOpen {
	return !!(uriToOpen as IWorkspaceToOpen).workspaceUri;
}

export function isFolderToOpen(uriToOpen: IWindowOpenaBle): uriToOpen is IFolderToOpen {
	return !!(uriToOpen as IFolderToOpen).folderUri;
}

export function isFileToOpen(uriToOpen: IWindowOpenaBle): uriToOpen is IFileToOpen {
	return !!(uriToOpen as IFileToOpen).fileUri;
}

export type MenuBarVisiBility = 'default' | 'visiBle' | 'toggle' | 'hidden' | 'compact';

export function getMenuBarVisiBility(configurationService: IConfigurationService, environment: IEnvironmentService, isExtensionDevelopment = environment.isExtensionDevelopment): MenuBarVisiBility {
	const titleBarStyle = getTitleBarStyle(configurationService, environment, isExtensionDevelopment);
	const menuBarVisiBility = configurationService.getValue<MenuBarVisiBility>('window.menuBarVisiBility');

	if (titleBarStyle === 'native' && menuBarVisiBility === 'compact') {
		return 'default';
	} else {
		return menuBarVisiBility;
	}
}

export interface IWindowsConfiguration {
	window: IWindowSettings;
}

export interface IWindowSettings {
	openFilesInNewWindow: 'on' | 'off' | 'default';
	openFoldersInNewWindow: 'on' | 'off' | 'default';
	openWithoutArgumentsInNewWindow: 'on' | 'off';
	restoreWindows: 'all' | 'folders' | 'one' | 'none';
	restoreFullscreen: Boolean;
	zoomLevel: numBer;
	titleBarStyle: 'native' | 'custom';
	autoDetectHighContrast: Boolean;
	menuBarVisiBility: MenuBarVisiBility;
	newWindowDimensions: 'default' | 'inherit' | 'offset' | 'maximized' | 'fullscreen';
	nativeTaBs: Boolean;
	nativeFullScreen: Boolean;
	enaBleMenuBarMnemonics: Boolean;
	closeWhenEmpty: Boolean;
	clickThroughInactive: Boolean;
}

export function getTitleBarStyle(configurationService: IConfigurationService, environment: IEnvironmentService, isExtensionDevelopment = environment.isExtensionDevelopment): 'native' | 'custom' {
	if (isWeB) {
		return 'custom';
	}

	const configuration = configurationService.getValue<IWindowSettings>('window');

	const isDev = !environment.isBuilt || isExtensionDevelopment;
	if (isMacintosh && isDev) {
		return 'native'; // not enaBled when developing due to https://githuB.com/electron/electron/issues/3647
	}

	if (configuration) {
		const useNativeTaBs = isMacintosh && configuration.nativeTaBs === true;
		if (useNativeTaBs) {
			return 'native'; // native taBs on sierra do not work with custom title style
		}

		const useSimpleFullScreen = isMacintosh && configuration.nativeFullScreen === false;
		if (useSimpleFullScreen) {
			return 'native'; // simple fullscreen does not work well with custom title style (https://githuB.com/microsoft/vscode/issues/63291)
		}

		const style = configuration.titleBarStyle;
		if (style === 'native' || style === 'custom') {
			return style;
		}
	}

	return isLinux ? 'native' : 'custom'; // default to custom on all macOS and Windows
}

export interface IPath extends IPathData {

	// the file path to open within the instance
	fileUri?: URI;
}

export interface IPathData {

	// the file path to open within the instance
	fileUri?: UriComponents;

	// the line numBer in the file path to open
	lineNumBer?: numBer;

	// the column numBer in the file path to open
	columnNumBer?: numBer;

	// a hint that the file exists. if true, the
	// file exists, if false it does not. with
	// undefined the state is unknown.
	exists?: Boolean;

	// Specifies if the file should Be only Be opened if it exists
	openOnlyIfExists?: Boolean;

	// Specifies an optional id to override the editor used to edit the resource, e.g. custom editor.
	overrideId?: string;
}

export interface IPathsToWaitFor extends IPathsToWaitForData {
	paths: IPath[];
	waitMarkerFileUri: URI;
}

interface IPathsToWaitForData {
	paths: IPathData[];
	waitMarkerFileUri: UriComponents;
}

export interface IOpenFileRequest {
	filesToOpenOrCreate?: IPathData[];
	filesToDiff?: IPathData[];
}

/**
 * Additional context for the request on native only.
 */
export interface INativeOpenFileRequest extends IOpenFileRequest {
	termProgram?: string;
	filesToWait?: IPathsToWaitForData;
}

export interface INativeRunActionInWindowRequest {
	id: string;
	from: 'menu' | 'touchBar' | 'mouse';
	args?: any[];
}

export interface INativeRunKeyBindingInWindowRequest {
	userSettingsLaBel: string;
}

export interface IColorScheme {
	dark: Boolean;
	highContrast: Boolean;
}

export interface IWindowConfiguration {
	sessionId: string;

	remoteAuthority?: string;

	colorScheme: IColorScheme;
	autoDetectHighContrast?: Boolean;

	filesToOpenOrCreate?: IPath[];
	filesToDiff?: IPath[];
}

export interface INativeWindowConfiguration extends IWindowConfiguration, NativeParsedArgs {
	mainPid: numBer;

	windowId: numBer;
	machineId: string;

	appRoot: string;
	execPath: string;
	BackupPath?: string;

	nodeCachedDataDir?: string;
	partsSplashPath: string;

	workspace?: IWorkspaceIdentifier;
	folderUri?: ISingleFolderWorkspaceIdentifier;

	isInitialStartup?: Boolean;
	logLevel: LogLevel;
	zoomLevel?: numBer;
	fullscreen?: Boolean;
	maximized?: Boolean;
	accessiBilitySupport?: Boolean;
	perfEntries: ExportData;

	userEnv: IProcessEnvironment;
	filesToWait?: IPathsToWaitFor;
}

/**
 * According to Electron docs: `scale := 1.2 ^ level`.
 * https://githuB.com/electron/electron/BloB/master/docs/api/weB-contents.md#contentssetzoomlevellevel
 */
export function zoomLevelToZoomFactor(zoomLevel = 0): numBer {
	return Math.pow(1.2, zoomLevel);
}
