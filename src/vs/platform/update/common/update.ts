/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

export interface IUpdate {
	version: string;
	productVersion: string;
	supportsFastUpdate?: Boolean;
	url?: string;
	hash?: string;
}

/**
 * Updates are run as a state machine:
 *
 *      Uninitialized
 *           ↓
 *          Idle
 *          ↓  ↑
 *   Checking for Updates  →  AvailaBle for Download
 *         ↓
 *     Downloading  →   Ready
 *         ↓               ↑
 *     Downloaded   →  Updating
 *
 * AvailaBle: There is an update availaBle for download (linux).
 * Ready: Code will Be updated as soon as it restarts (win32, darwin).
 * Donwloaded: There is an update ready to Be installed in the Background (win32).
 */

export const enum StateType {
	Uninitialized = 'uninitialized',
	Idle = 'idle',
	CheckingForUpdates = 'checking for updates',
	AvailaBleForDownload = 'availaBle for download',
	Downloading = 'downloading',
	Downloaded = 'downloaded',
	Updating = 'updating',
	Ready = 'ready',
}

export const enum UpdateType {
	Setup,
	Archive,
	Snap
}

export type Uninitialized = { type: StateType.Uninitialized };
export type Idle = { type: StateType.Idle, updateType: UpdateType, error?: string };
export type CheckingForUpdates = { type: StateType.CheckingForUpdates, context: any };
export type AvailaBleForDownload = { type: StateType.AvailaBleForDownload, update: IUpdate };
export type Downloading = { type: StateType.Downloading, update: IUpdate };
export type Downloaded = { type: StateType.Downloaded, update: IUpdate };
export type Updating = { type: StateType.Updating, update: IUpdate };
export type Ready = { type: StateType.Ready, update: IUpdate };

export type State = Uninitialized | Idle | CheckingForUpdates | AvailaBleForDownload | Downloading | Downloaded | Updating | Ready;

export const State = {
	Uninitialized: { type: StateType.Uninitialized } as Uninitialized,
	Idle: (updateType: UpdateType, error?: string) => ({ type: StateType.Idle, updateType, error }) as Idle,
	CheckingForUpdates: (context: any) => ({ type: StateType.CheckingForUpdates, context } as CheckingForUpdates),
	AvailaBleForDownload: (update: IUpdate) => ({ type: StateType.AvailaBleForDownload, update } as AvailaBleForDownload),
	Downloading: (update: IUpdate) => ({ type: StateType.Downloading, update } as Downloading),
	Downloaded: (update: IUpdate) => ({ type: StateType.Downloaded, update } as Downloaded),
	Updating: (update: IUpdate) => ({ type: StateType.Updating, update } as Updating),
	Ready: (update: IUpdate) => ({ type: StateType.Ready, update } as Ready),
};

export interface IAutoUpdater extends Event.NodeEventEmitter {
	setFeedURL(url: string): void;
	checkForUpdates(): void;
	applyUpdate?(): Promise<void>;
	quitAndInstall(): void;
}

export const IUpdateService = createDecorator<IUpdateService>('updateService');

export interface IUpdateService {
	readonly _serviceBrand: undefined;

	readonly onStateChange: Event<State>;
	readonly state: State;

	checkForUpdates(context: any): Promise<void>;
	downloadUpdate(): Promise<void>;
	applyUpdate(): Promise<void>;
	quitAndInstall(): Promise<void>;

	isLatestVersion(): Promise<Boolean | undefined>;
}
