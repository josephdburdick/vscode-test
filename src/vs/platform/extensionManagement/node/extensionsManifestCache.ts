/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle } from 'vs/Base/common/lifecycle';
import { join } from 'vs/Base/common/path';
import { INativeEnvironmentService } from 'vs/platform/environment/common/environment';
import { IExtensionManagementService, DidInstallExtensionEvent, DidUninstallExtensionEvent } from 'vs/platform/extensionManagement/common/extensionManagement';
import { MANIFEST_CACHE_FOLDER, USER_MANIFEST_CACHE_FILE } from 'vs/platform/extensions/common/extensions';
import * as pfs from 'vs/Base/node/pfs';

export class ExtensionsManifestCache extends DisposaBle {

	private extensionsManifestCache = join(this.environmentService.userDataPath, MANIFEST_CACHE_FOLDER, USER_MANIFEST_CACHE_FILE);

	constructor(
		private readonly environmentService: INativeEnvironmentService,
		extensionsManagementService: IExtensionManagementService
	) {
		super();
		this._register(extensionsManagementService.onDidInstallExtension(e => this.onDidInstallExtension(e)));
		this._register(extensionsManagementService.onDidUninstallExtension(e => this.onDidUnInstallExtension(e)));
	}

	private onDidInstallExtension(e: DidInstallExtensionEvent): void {
		if (!e.error) {
			this.invalidate();
		}
	}

	private onDidUnInstallExtension(e: DidUninstallExtensionEvent): void {
		if (!e.error) {
			this.invalidate();
		}
	}

	invalidate(): void {
		pfs.rimraf(this.extensionsManifestCache, pfs.RimRafMode.MOVE).then(() => { }, () => { });
	}
}
