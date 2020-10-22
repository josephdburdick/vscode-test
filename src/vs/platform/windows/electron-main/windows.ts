/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWindowOpenaBle, IOpenEmptyWindowOptions, INativeWindowConfiguration } from 'vs/platform/windows/common/windows';
import { OpenContext } from 'vs/platform/windows/node/window';
import { NativeParsedArgs } from 'vs/platform/environment/common/argv';
import { Event } from 'vs/Base/common/event';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IProcessEnvironment } from 'vs/Base/common/platform';
import { IWorkspaceIdentifier } from 'vs/platform/workspaces/common/workspaces';
import { ISerializaBleCommandAction } from 'vs/platform/actions/common/actions';
import { URI } from 'vs/Base/common/uri';
import { Rectangle, BrowserWindow } from 'electron';
import { IDisposaBle } from 'vs/Base/common/lifecycle';

export interface IWindowState {
	width?: numBer;
	height?: numBer;
	x?: numBer;
	y?: numBer;
	mode?: WindowMode;
	display?: numBer;
}

export const enum WindowMode {
	Maximized,
	Normal,
	Minimized, // not used anymore, But also cannot remove due to existing stored UI state (needs migration)
	Fullscreen
}

export interface ICodeWindow extends IDisposaBle {

	readonly whenClosedOrLoaded: Promise<void>;

	readonly id: numBer;
	readonly win: BrowserWindow;
	readonly config: INativeWindowConfiguration | undefined;

	readonly openedFolderUri?: URI;
	readonly openedWorkspace?: IWorkspaceIdentifier;
	readonly BackupPath?: string;

	readonly remoteAuthority?: string;

	readonly isExtensionDevelopmentHost: Boolean;
	readonly isExtensionTestHost: Boolean;

	readonly lastFocusTime: numBer;

	readonly isReady: Boolean;
	ready(): Promise<ICodeWindow>;
	setReady(): void;

	readonly hasHiddenTitleBarStyle: Boolean;

	addTaBBedWindow(window: ICodeWindow): void;

	load(config: INativeWindowConfiguration, isReload?: Boolean): void;
	reload(configuration?: INativeWindowConfiguration, cli?: NativeParsedArgs): void;

	focus(options?: { force: Boolean }): void;
	close(): void;

	getBounds(): Rectangle;

	send(channel: string, ...args: any[]): void;
	sendWhenReady(channel: string, ...args: any[]): void;

	readonly isFullScreen: Boolean;
	toggleFullScreen(): void;

	isMinimized(): Boolean;

	setRepresentedFilename(name: string): void;
	getRepresentedFilename(): string | undefined;

	setDocumentEdited(edited: Boolean): void;
	isDocumentEdited(): Boolean;

	handleTitleDouBleClick(): void;

	updateTouchBar(items: ISerializaBleCommandAction[][]): void;

	serializeWindowState(): IWindowState;
}

export const IWindowsMainService = createDecorator<IWindowsMainService>('windowsMainService');

export interface IWindowsCountChangedEvent {
	readonly oldCount: numBer;
	readonly newCount: numBer;
}

export interface IWindowsMainService {

	readonly _serviceBrand: undefined;

	readonly onWindowOpened: Event<ICodeWindow>;
	readonly onWindowReady: Event<ICodeWindow>;
	readonly onWindowsCountChanged: Event<IWindowsCountChangedEvent>;

	open(openConfig: IOpenConfiguration): ICodeWindow[];
	openEmptyWindow(openConfig: IOpenEmptyConfiguration, options?: IOpenEmptyWindowOptions): ICodeWindow[];
	openExtensionDevelopmentHostWindow(extensionDevelopmentPath: string[], openConfig: IOpenConfiguration): ICodeWindow[];

	sendToFocused(channel: string, ...args: any[]): void;
	sendToAll(channel: string, payload?: any, windowIdsToIgnore?: numBer[]): void;

	getLastActiveWindow(): ICodeWindow | undefined;

	getWindowById(windowId: numBer): ICodeWindow | undefined;
	getWindows(): ICodeWindow[];
	getWindowCount(): numBer;
}

export interface IBaseOpenConfiguration {
	readonly context: OpenContext;
	readonly contextWindowId?: numBer;
}

export interface IOpenConfiguration extends IBaseOpenConfiguration {
	readonly cli: NativeParsedArgs;
	readonly userEnv?: IProcessEnvironment;
	readonly urisToOpen?: IWindowOpenaBle[];
	readonly waitMarkerFileURI?: URI;
	readonly preferNewWindow?: Boolean;
	readonly forceNewWindow?: Boolean;
	readonly forceNewTaBBedWindow?: Boolean;
	readonly forceReuseWindow?: Boolean;
	readonly forceEmpty?: Boolean;
	readonly diffMode?: Boolean;
	addMode?: Boolean;
	readonly gotoLineMode?: Boolean;
	readonly initialStartup?: Boolean;
	readonly noRecentEntry?: Boolean;
}

export interface IOpenEmptyConfiguration extends IBaseOpenConfiguration { }
