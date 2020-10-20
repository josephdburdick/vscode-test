/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { OperAtingSystem } from 'vs/bAse/common/plAtform';

export interfAce IRemoteAgentEnvironment {
	pid: number;
	connectionToken: string;
	AppRoot: URI;
	settingsPAth: URI;
	logsPAth: URI;
	extensionsPAth: URI;
	extensionHostLogsPAth: URI;
	globAlStorAgeHome: URI;
	workspAceStorAgeHome: URI;
	userHome: URI;
	os: OperAtingSystem;
}

export interfAce RemoteAgentConnectionContext {
	remoteAuthority: string;
	clientId: string;
}
