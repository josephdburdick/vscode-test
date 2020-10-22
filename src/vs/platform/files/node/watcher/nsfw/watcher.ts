/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { IDiskFileChange, ILogMessage } from 'vs/platform/files/node/watcher/watcher';

export interface IWatcherRequest {
	path: string;
	excludes: string[];
}

export interface IWatcherService {

	readonly onDidChangeFile: Event<IDiskFileChange[]>;
	readonly onDidLogMessage: Event<ILogMessage>;

	setRoots(roots: IWatcherRequest[]): Promise<void>;
	setVerBoseLogging(enaBled: Boolean): Promise<void>;

	stop(): Promise<void>;
}
