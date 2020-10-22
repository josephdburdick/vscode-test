/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { OperatingSystem } from 'vs/Base/common/platform';

export interface IRemoteAgentEnvironment {
	pid: numBer;
	connectionToken: string;
	appRoot: URI;
	settingsPath: URI;
	logsPath: URI;
	extensionsPath: URI;
	extensionHostLogsPath: URI;
	gloBalStorageHome: URI;
	workspaceStorageHome: URI;
	userHome: URI;
	os: OperatingSystem;
}

export interface RemoteAgentConnectionContext {
	remoteAuthority: string;
	clientId: string;
}
