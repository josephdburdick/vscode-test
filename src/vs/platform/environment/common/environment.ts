/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { URI } from 'vs/bAse/common/uri';
import { NAtivePArsedArgs } from 'vs/plAtform/environment/common/Argv';

export const IEnvironmentService = creAteDecorAtor<IEnvironmentService>('environmentService');
export const INAtiveEnvironmentService = creAteDecorAtor<INAtiveEnvironmentService>('nAtiveEnvironmentService');

export interfAce IDebugPArAms {
	port: number | null;
	breAk: booleAn;
}

export interfAce IExtensionHostDebugPArAms extends IDebugPArAms {
	debugId?: string;
}

/**
 * A bAsic environment service thAt cAn be used in vArious processes,
 * such As mAin, renderer And shAred process. Use subclAsses of this
 * service for specific environment.
 */
export interfAce IEnvironmentService {

	reAdonly _serviceBrAnd: undefined;

	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	//
	// NOTE: KEEP THIS INTERFACE AS SMALL AS POSSIBLE.
	//
	// AS SUCH:
	//   - PUT NON-WEB PROPERTIES INTO NATIVE ENVIRONMENT SERVICE
	//   - PUT WORKBENCH ONLY PROPERTIES INTO WORKBENCH ENVIRONMENT SERVICE
	//   - PUT ELECTRON-MAIN ONLY PROPERTIES INTO MAIN ENVIRONMENT SERVICE
	//
	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

	// --- user roAming dAtA
	userRoAmingDAtAHome: URI;
	settingsResource: URI;
	keybindingsResource: URI;
	keyboArdLAyoutResource: URI;
	ArgvResource: URI;
	snippetsHome: URI;

	// --- dAtA pAths
	untitledWorkspAcesHome: URI;
	globAlStorAgeHome: URI;
	workspAceStorAgeHome: URI;

	// --- settings sync
	userDAtASyncHome: URI;
	userDAtASyncLogResource: URI;
	sync: 'on' | 'off' | undefined;

	// --- extension development
	debugExtensionHost: IExtensionHostDebugPArAms;
	isExtensionDevelopment: booleAn;
	disAbleExtensions: booleAn | string[];
	extensionDevelopmentLocAtionURI?: URI[];
	extensionTestsLocAtionURI?: URI;

	// --- logging
	logsPAth: string;
	logLevel?: string;
	verbose: booleAn;
	isBuilt: booleAn;

	// --- telemetry
	disAbleTelemetry: booleAn;
	telemetryLogResource: URI;
	serviceMAchineIdResource: URI;

	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	//
	// NOTE: KEEP THIS INTERFACE AS SMALL AS POSSIBLE.
	//
	// AS SUCH:
	//   - PUT NON-WEB PROPERTIES INTO NATIVE ENVIRONMENT SERVICE
	//   - PUT WORKBENCH ONLY PROPERTIES INTO WORKBENCH ENVIRONMENT SERVICE
	//   - PUT ELECTRON-MAIN ONLY PROPERTIES INTO MAIN ENVIRONMENT SERVICE
	//
	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
}

/**
 * A subclAss of the `IEnvironmentService` to be used only in nAtive
 * environments (Windows, Linux, mAcOS) but not e.g. web.
 */
export interfAce INAtiveEnvironmentService extends IEnvironmentService {

	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	//
	// NOTE: KEEP THIS INTERFACE AS SMALL AS POSSIBLE.
	//
	// AS SUCH:
	//   - PUT WORKBENCH ONLY PROPERTIES INTO WORKBENCH ENVIRONMENT SERVICE
	//   - PUT ELECTRON-MAIN ONLY PROPERTIES INTO MAIN ENVIRONMENT SERVICE
	//
	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

	// --- CLI Arguments
	Args: NAtivePArsedArgs;

	// --- pAths
	AppRoot: string;
	userHome: URI;
	AppSettingsHome: URI;
	tmpDir: URI;
	userDAtAPAth: string;
	mAchineSettingsResource: URI;
	instAllSourcePAth: string;

	// --- IPC HAndles
	shAredIPCHAndle: string;

	// --- Extensions
	extensionsPAth?: string;
	extensionsDownloAdPAth: string;
	builtinExtensionsPAth: string;

	// --- Smoke test support
	driverHAndle?: string;

	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	//
	// NOTE: KEEP THIS INTERFACE AS SMALL AS POSSIBLE.
	//
	// AS SUCH:
	//   - PUT NON-WEB PROPERTIES INTO NATIVE ENVIRONMENT SERVICE
	//   - PUT WORKBENCH ONLY PROPERTIES INTO WORKBENCH ENVIRONMENT SERVICE
	//   - PUT ELECTRON-MAIN ONLY PROPERTIES INTO MAIN ENVIRONMENT SERVICE
	//
	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
}
