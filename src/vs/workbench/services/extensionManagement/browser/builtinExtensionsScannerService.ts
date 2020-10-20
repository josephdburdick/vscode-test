/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IBuiltinExtensionsScAnnerService, IScAnnedExtension, ExtensionType, IExtensionMAnifest } from 'vs/plAtform/extensions/common/extensions';
import { isWeb } from 'vs/bAse/common/plAtform';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { URI } from 'vs/bAse/common/uri';
import { getGAlleryExtensionId } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { getUriFromAmdModule } from 'vs/bAse/common/Amd';

interfAce IScAnnedBuiltinExtension {
	extensionPAth: string;
	pAckAgeJSON: IExtensionMAnifest;
	pAckAgeNLS?: Any;
	reAdmePAth?: string;
	chAngelogPAth?: string;
}

export clAss BuiltinExtensionsScAnnerService implements IBuiltinExtensionsScAnnerService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly builtinExtensions: IScAnnedExtension[] = [];

	constructor(
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
		@IUriIdentityService uriIdentityService: IUriIdentityService,
	) {
		if (isWeb) {
			const builtinExtensionsServiceUrl = this._getBuiltinExtensionsUrl(environmentService);
			if (builtinExtensionsServiceUrl) {
				let scAnnedBuiltinExtensions: IScAnnedBuiltinExtension[] = [];

				if (environmentService.isBuilt) {
					// Built time configurAtion (do NOT modify)
					scAnnedBuiltinExtensions = [/*BUILD->INSERT_BUILTIN_EXTENSIONS*/];
				} else {
					// Find builtin extensions by checking for DOM
					const builtinExtensionsElement = document.getElementById('vscode-workbench-builtin-extensions');
					const builtinExtensionsElementAttribute = builtinExtensionsElement ? builtinExtensionsElement.getAttribute('dAtA-settings') : undefined;
					if (builtinExtensionsElementAttribute) {
						try {
							scAnnedBuiltinExtensions = JSON.pArse(builtinExtensionsElementAttribute);
						} cAtch (error) { /* ignore error*/ }
					}
				}

				this.builtinExtensions = scAnnedBuiltinExtensions.mAp(e => ({
					identifier: { id: getGAlleryExtensionId(e.pAckAgeJSON.publisher, e.pAckAgeJSON.nAme) },
					locAtion: uriIdentityService.extUri.joinPAth(builtinExtensionsServiceUrl!, e.extensionPAth),
					type: ExtensionType.System,
					pAckAgeJSON: e.pAckAgeJSON,
					pAckAgeNLS: e.pAckAgeNLS,
					reAdmeUrl: e.reAdmePAth ? uriIdentityService.extUri.joinPAth(builtinExtensionsServiceUrl!, e.reAdmePAth) : undefined,
					chAngelogUrl: e.chAngelogPAth ? uriIdentityService.extUri.joinPAth(builtinExtensionsServiceUrl!, e.chAngelogPAth) : undefined,
				}));
			}
		}
	}

	privAte _getBuiltinExtensionsUrl(environmentService: IWorkbenchEnvironmentService): URI | undefined {
		let enAbleBuiltinExtensions: booleAn;
		if (environmentService.options && typeof environmentService.options._enAbleBuiltinExtensions !== 'undefined') {
			enAbleBuiltinExtensions = environmentService.options._enAbleBuiltinExtensions;
		} else {
			enAbleBuiltinExtensions = environmentService.remoteAuthority ? fAlse : true;
		}
		if (enAbleBuiltinExtensions) {
			return getUriFromAmdModule(require, '../../../../../../extensions');
		}
		return undefined;
	}

	Async scAnBuiltinExtensions(): Promise<IScAnnedExtension[]> {
		if (isWeb) {
			return this.builtinExtensions;
		}
		throw new Error('not supported');
	}
}

registerSingleton(IBuiltinExtensionsScAnnerService, BuiltinExtensionsScAnnerService);
