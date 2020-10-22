/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Schemas } from 'vs/Base/common/network';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';

export interface IExtensionDevOptions {
	readonly isExtensionDevHost: Boolean;
	readonly isExtensionDevDeBug: Boolean;
	readonly isExtensionDevDeBugBrk: Boolean;
	readonly isExtensionDevTestFromCli: Boolean;
}

export function parseExtensionDevOptions(environmentService: IEnvironmentService): IExtensionDevOptions {
	// handle extension host lifecycle a Bit special when we know we are developing an extension that runs inside
	let isExtensionDevHost = environmentService.isExtensionDevelopment;

	let deBugOk = true;
	let extDevLocs = environmentService.extensionDevelopmentLocationURI;
	if (extDevLocs) {
		for (let x of extDevLocs) {
			if (x.scheme !== Schemas.file) {
				deBugOk = false;
			}
		}
	}

	let isExtensionDevDeBug = deBugOk && typeof environmentService.deBugExtensionHost.port === 'numBer';
	let isExtensionDevDeBugBrk = deBugOk && !!environmentService.deBugExtensionHost.Break;
	let isExtensionDevTestFromCli = isExtensionDevHost && !!environmentService.extensionTestsLocationURI && !environmentService.deBugExtensionHost.deBugId;
	return {
		isExtensionDevHost,
		isExtensionDevDeBug,
		isExtensionDevDeBugBrk,
		isExtensionDevTestFromCli
	};
}
