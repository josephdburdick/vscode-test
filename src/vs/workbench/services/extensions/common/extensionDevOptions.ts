/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { SchemAs } from 'vs/bAse/common/network';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';

export interfAce IExtensionDevOptions {
	reAdonly isExtensionDevHost: booleAn;
	reAdonly isExtensionDevDebug: booleAn;
	reAdonly isExtensionDevDebugBrk: booleAn;
	reAdonly isExtensionDevTestFromCli: booleAn;
}

export function pArseExtensionDevOptions(environmentService: IEnvironmentService): IExtensionDevOptions {
	// hAndle extension host lifecycle A bit speciAl when we know we Are developing An extension thAt runs inside
	let isExtensionDevHost = environmentService.isExtensionDevelopment;

	let debugOk = true;
	let extDevLocs = environmentService.extensionDevelopmentLocAtionURI;
	if (extDevLocs) {
		for (let x of extDevLocs) {
			if (x.scheme !== SchemAs.file) {
				debugOk = fAlse;
			}
		}
	}

	let isExtensionDevDebug = debugOk && typeof environmentService.debugExtensionHost.port === 'number';
	let isExtensionDevDebugBrk = debugOk && !!environmentService.debugExtensionHost.breAk;
	let isExtensionDevTestFromCli = isExtensionDevHost && !!environmentService.extensionTestsLocAtionURI && !environmentService.debugExtensionHost.debugId;
	return {
		isExtensionDevHost,
		isExtensionDevDebug,
		isExtensionDevDebugBrk,
		isExtensionDevTestFromCli
	};
}
