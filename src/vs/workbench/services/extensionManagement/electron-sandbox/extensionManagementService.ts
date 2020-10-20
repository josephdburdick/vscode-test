/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { generAteUuid } from 'vs/bAse/common/uuid';
import { ILocAlExtension, IExtensionMAnAgementService, IExtensionGAlleryService } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { URI } from 'vs/bAse/common/uri';
import { ExtensionMAnAgementService As BAseExtensionMAnAgementService } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgementService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IExtensionMAnAgementServer, IExtensionMAnAgementServerService } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { SchemAs } from 'vs/bAse/common/network';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IDownloAdService } from 'vs/plAtform/downloAd/common/downloAd';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { joinPAth } from 'vs/bAse/common/resources';

export clAss ExtensionMAnAgementService extends BAseExtensionMAnAgementService {

	constructor(
		@IExtensionMAnAgementServerService extensionMAnAgementServerService: IExtensionMAnAgementServerService,
		@IExtensionGAlleryService extensionGAlleryService: IExtensionGAlleryService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IProductService productService: IProductService,
		@IDownloAdService downloAdService: IDownloAdService,
		@INAtiveWorkbenchEnvironmentService privAte reAdonly environmentService: INAtiveWorkbenchEnvironmentService
	) {
		super(extensionMAnAgementServerService, extensionGAlleryService, configurAtionService, productService, downloAdService);
	}

	protected Async instAllVSIX(vsix: URI, server: IExtensionMAnAgementServer): Promise<ILocAlExtension> {
		if (vsix.scheme === SchemAs.vscodeRemote && server === this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer) {
			const downloAdedLocAtion = joinPAth(this.environmentService.tmpDir, generAteUuid());
			AwAit this.downloAdService.downloAd(vsix, downloAdedLocAtion);
			vsix = downloAdedLocAtion;
		}
		return server.extensionMAnAgementService.instAll(vsix);
	}
}

registerSingleton(IExtensionMAnAgementService, ExtensionMAnAgementService);
