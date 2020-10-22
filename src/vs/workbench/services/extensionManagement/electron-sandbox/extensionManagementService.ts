/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { generateUuid } from 'vs/Base/common/uuid';
import { ILocalExtension, IExtensionManagementService, IExtensionGalleryService } from 'vs/platform/extensionManagement/common/extensionManagement';
import { URI } from 'vs/Base/common/uri';
import { ExtensionManagementService as BaseExtensionManagementService } from 'vs/workBench/services/extensionManagement/common/extensionManagementService';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IExtensionManagementServer, IExtensionManagementServerService } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { Schemas } from 'vs/Base/common/network';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IDownloadService } from 'vs/platform/download/common/download';
import { IProductService } from 'vs/platform/product/common/productService';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { joinPath } from 'vs/Base/common/resources';

export class ExtensionManagementService extends BaseExtensionManagementService {

	constructor(
		@IExtensionManagementServerService extensionManagementServerService: IExtensionManagementServerService,
		@IExtensionGalleryService extensionGalleryService: IExtensionGalleryService,
		@IConfigurationService configurationService: IConfigurationService,
		@IProductService productService: IProductService,
		@IDownloadService downloadService: IDownloadService,
		@INativeWorkBenchEnvironmentService private readonly environmentService: INativeWorkBenchEnvironmentService
	) {
		super(extensionManagementServerService, extensionGalleryService, configurationService, productService, downloadService);
	}

	protected async installVSIX(vsix: URI, server: IExtensionManagementServer): Promise<ILocalExtension> {
		if (vsix.scheme === Schemas.vscodeRemote && server === this.extensionManagementServerService.localExtensionManagementServer) {
			const downloadedLocation = joinPath(this.environmentService.tmpDir, generateUuid());
			await this.downloadService.download(vsix, downloadedLocation);
			vsix = downloadedLocation;
		}
		return server.extensionManagementService.install(vsix);
	}
}

registerSingleton(IExtensionManagementService, ExtensionManagementService);
