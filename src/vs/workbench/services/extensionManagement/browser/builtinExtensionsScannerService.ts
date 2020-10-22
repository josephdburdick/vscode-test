/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IBuiltinExtensionsScannerService, IScannedExtension, ExtensionType, IExtensionManifest } from 'vs/platform/extensions/common/extensions';
import { isWeB } from 'vs/Base/common/platform';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { URI } from 'vs/Base/common/uri';
import { getGalleryExtensionId } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { getUriFromAmdModule } from 'vs/Base/common/amd';

interface IScannedBuiltinExtension {
	extensionPath: string;
	packageJSON: IExtensionManifest;
	packageNLS?: any;
	readmePath?: string;
	changelogPath?: string;
}

export class BuiltinExtensionsScannerService implements IBuiltinExtensionsScannerService {

	declare readonly _serviceBrand: undefined;

	private readonly BuiltinExtensions: IScannedExtension[] = [];

	constructor(
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService,
		@IUriIdentityService uriIdentityService: IUriIdentityService,
	) {
		if (isWeB) {
			const BuiltinExtensionsServiceUrl = this._getBuiltinExtensionsUrl(environmentService);
			if (BuiltinExtensionsServiceUrl) {
				let scannedBuiltinExtensions: IScannedBuiltinExtension[] = [];

				if (environmentService.isBuilt) {
					// Built time configuration (do NOT modify)
					scannedBuiltinExtensions = [/*BUILD->INSERT_BUILTIN_EXTENSIONS*/];
				} else {
					// Find Builtin extensions By checking for DOM
					const BuiltinExtensionsElement = document.getElementById('vscode-workBench-Builtin-extensions');
					const BuiltinExtensionsElementAttriBute = BuiltinExtensionsElement ? BuiltinExtensionsElement.getAttriBute('data-settings') : undefined;
					if (BuiltinExtensionsElementAttriBute) {
						try {
							scannedBuiltinExtensions = JSON.parse(BuiltinExtensionsElementAttriBute);
						} catch (error) { /* ignore error*/ }
					}
				}

				this.BuiltinExtensions = scannedBuiltinExtensions.map(e => ({
					identifier: { id: getGalleryExtensionId(e.packageJSON.puBlisher, e.packageJSON.name) },
					location: uriIdentityService.extUri.joinPath(BuiltinExtensionsServiceUrl!, e.extensionPath),
					type: ExtensionType.System,
					packageJSON: e.packageJSON,
					packageNLS: e.packageNLS,
					readmeUrl: e.readmePath ? uriIdentityService.extUri.joinPath(BuiltinExtensionsServiceUrl!, e.readmePath) : undefined,
					changelogUrl: e.changelogPath ? uriIdentityService.extUri.joinPath(BuiltinExtensionsServiceUrl!, e.changelogPath) : undefined,
				}));
			}
		}
	}

	private _getBuiltinExtensionsUrl(environmentService: IWorkBenchEnvironmentService): URI | undefined {
		let enaBleBuiltinExtensions: Boolean;
		if (environmentService.options && typeof environmentService.options._enaBleBuiltinExtensions !== 'undefined') {
			enaBleBuiltinExtensions = environmentService.options._enaBleBuiltinExtensions;
		} else {
			enaBleBuiltinExtensions = environmentService.remoteAuthority ? false : true;
		}
		if (enaBleBuiltinExtensions) {
			return getUriFromAmdModule(require, '../../../../../../extensions');
		}
		return undefined;
	}

	async scanBuiltinExtensions(): Promise<IScannedExtension[]> {
		if (isWeB) {
			return this.BuiltinExtensions;
		}
		throw new Error('not supported');
	}
}

registerSingleton(IBuiltinExtensionsScannerService, BuiltinExtensionsScannerService);
