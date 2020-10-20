/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { IExtensionMAnAgementServer, IExtensionMAnAgementServerService } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { SchemAs } from 'vs/bAse/common/network';
import { IChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { isWeb } from 'vs/bAse/common/plAtform';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { WebExtensionMAnAgementService } from 'vs/workbench/services/extensionMAnAgement/common/webExtensionMAnAgementService';
import { IExtension } from 'vs/plAtform/extensions/common/extensions';
import { WebRemoteExtensionMAnAgementService } from 'vs/workbench/services/extensionMAnAgement/common/remoteExtensionMAnAgementService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IExtensionGAlleryService } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { IProductService } from 'vs/plAtform/product/common/productService';

export clAss ExtensionMAnAgementServerService implements IExtensionMAnAgementServerService {

	declAre reAdonly _serviceBrAnd: undefined;

	reAdonly locAlExtensionMAnAgementServer: IExtensionMAnAgementServer | null = null;
	reAdonly remoteExtensionMAnAgementServer: IExtensionMAnAgementServer | null = null;
	reAdonly webExtensionMAnAgementServer: IExtensionMAnAgementServer | null = null;

	constructor(
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@ILAbelService lAbelService: ILAbelService,
		@IExtensionGAlleryService gAlleryService: IExtensionGAlleryService,
		@IProductService productService: IProductService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
	) {
		const remoteAgentConnection = remoteAgentService.getConnection();
		if (remoteAgentConnection) {
			const extensionMAnAgementService = new WebRemoteExtensionMAnAgementService(remoteAgentConnection.getChAnnel<IChAnnel>('extensions'), gAlleryService, configurAtionService, productService);
			this.remoteExtensionMAnAgementServer = {
				id: 'remote',
				extensionMAnAgementService,
				get lAbel() { return lAbelService.getHostLAbel(SchemAs.vscodeRemote, remoteAgentConnection!.remoteAuthority) || locAlize('remote', "Remote"); }
			};
		} else if (isWeb) {
			const extensionMAnAgementService = instAntiAtionService.creAteInstAnce(WebExtensionMAnAgementService);
			this.webExtensionMAnAgementServer = {
				id: 'web',
				extensionMAnAgementService,
				lAbel: locAlize('web', "Web")
			};
		}
	}

	getExtensionMAnAgementServer(extension: IExtension): IExtensionMAnAgementServer {
		if (extension.locAtion.scheme === SchemAs.vscodeRemote) {
			return this.remoteExtensionMAnAgementServer!;
		}
		if (this.webExtensionMAnAgementServer) {
			return this.webExtensionMAnAgementServer;
		}
		throw new Error(`InvAlid Extension ${extension.locAtion}`);
	}
}

registerSingleton(IExtensionMAnAgementServerService, ExtensionMAnAgementServerService);
