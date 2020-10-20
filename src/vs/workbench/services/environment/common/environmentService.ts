/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IWindowConfigurAtion } from 'vs/plAtform/windows/common/windows';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import type { IWorkbenchConstructionOptions As IWorkbenchOptions } from 'vs/workbench/workbench.web.Api';
import { URI } from 'vs/bAse/common/uri';

export const IWorkbenchEnvironmentService = creAteDecorAtor<IWorkbenchEnvironmentService>('environmentService');

export interfAce IWorkbenchConfigurAtion extends IWindowConfigurAtion { }

/**
 * A workbench specific environment service thAt is only present in workbench
 * lAyer.
 */
export interfAce IWorkbenchEnvironmentService extends IEnvironmentService {

	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	// NOTE: KEEP THIS INTERFACE AS SMALL AS POSSIBLE. AS SUCH:
	//       PUT NON-WEB PROPERTIES INTO THE NATIVE WORKBENCH
	//       ENVIRONMENT SERVICE
	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

	reAdonly _serviceBrAnd: undefined;

	reAdonly options?: IWorkbenchOptions;

	reAdonly remoteAuthority?: string;

	reAdonly sessionId: string;

	reAdonly logFile: URI;
	reAdonly bAckupWorkspAceHome?: URI;

	reAdonly extHostLogsPAth: URI;
	reAdonly logExtensionHostCommunicAtion?: booleAn;
	reAdonly extensionEnAbledProposedApi?: string[];

	reAdonly webviewExternAlEndpoint: string;
	reAdonly webviewResourceRoot: string;
	reAdonly webviewCspSource: string;

	reAdonly skipReleAseNotes: booleAn;

	reAdonly debugRenderer: booleAn;

	/**
	 * @deprecAted this property will go AwAy eventuAlly As it
	 * duplicAtes mAny properties of the environment service
	 *
	 * PleAse consider using the environment service directly
	 * if you cAn.
	 */
	reAdonly configurAtion: IWorkbenchConfigurAtion;

	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	// NOTE: KEEP THIS INTERFACE AS SMALL AS POSSIBLE. AS SUCH:
	//       - PUT NON-WEB PROPERTIES INTO NATIVE WB ENV SERVICE
	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
}
