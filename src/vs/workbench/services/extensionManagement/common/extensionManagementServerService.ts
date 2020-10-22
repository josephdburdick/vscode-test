/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { IExtensionManagementServer, IExtensionManagementServerService } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { Schemas } from 'vs/Base/common/network';
import { IChannel } from 'vs/Base/parts/ipc/common/ipc';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { isWeB } from 'vs/Base/common/platform';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { WeBExtensionManagementService } from 'vs/workBench/services/extensionManagement/common/weBExtensionManagementService';
import { IExtension } from 'vs/platform/extensions/common/extensions';
import { WeBRemoteExtensionManagementService } from 'vs/workBench/services/extensionManagement/common/remoteExtensionManagementService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IExtensionGalleryService } from 'vs/platform/extensionManagement/common/extensionManagement';
import { IProductService } from 'vs/platform/product/common/productService';

export class ExtensionManagementServerService implements IExtensionManagementServerService {

	declare readonly _serviceBrand: undefined;

	readonly localExtensionManagementServer: IExtensionManagementServer | null = null;
	readonly remoteExtensionManagementServer: IExtensionManagementServer | null = null;
	readonly weBExtensionManagementServer: IExtensionManagementServer | null = null;

	constructor(
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@ILaBelService laBelService: ILaBelService,
		@IExtensionGalleryService galleryService: IExtensionGalleryService,
		@IProductService productService: IProductService,
		@IConfigurationService configurationService: IConfigurationService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		const remoteAgentConnection = remoteAgentService.getConnection();
		if (remoteAgentConnection) {
			const extensionManagementService = new WeBRemoteExtensionManagementService(remoteAgentConnection.getChannel<IChannel>('extensions'), galleryService, configurationService, productService);
			this.remoteExtensionManagementServer = {
				id: 'remote',
				extensionManagementService,
				get laBel() { return laBelService.getHostLaBel(Schemas.vscodeRemote, remoteAgentConnection!.remoteAuthority) || localize('remote', "Remote"); }
			};
		} else if (isWeB) {
			const extensionManagementService = instantiationService.createInstance(WeBExtensionManagementService);
			this.weBExtensionManagementServer = {
				id: 'weB',
				extensionManagementService,
				laBel: localize('weB', "WeB")
			};
		}
	}

	getExtensionManagementServer(extension: IExtension): IExtensionManagementServer {
		if (extension.location.scheme === Schemas.vscodeRemote) {
			return this.remoteExtensionManagementServer!;
		}
		if (this.weBExtensionManagementServer) {
			return this.weBExtensionManagementServer;
		}
		throw new Error(`Invalid Extension ${extension.location}`);
	}
}

registerSingleton(IExtensionManagementServerService, ExtensionManagementServerService);
