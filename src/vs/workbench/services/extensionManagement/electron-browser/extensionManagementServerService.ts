/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { SchemAs } from 'vs/bAse/common/network';
import { IExtensionMAnAgementServer, IExtensionMAnAgementServerService } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { ExtensionMAnAgementChAnnelClient } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementIpc';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { IChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';
import { IShAredProcessService } from 'vs/plAtform/ipc/electron-browser/shAredProcessService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { NAtiveRemoteExtensionMAnAgementService } from 'vs/workbench/services/extensionMAnAgement/electron-sAndbox/remoteExtensionMAnAgementService';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { IExtension } from 'vs/plAtform/extensions/common/extensions';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export clAss ExtensionMAnAgementServerService implements IExtensionMAnAgementServerService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _locAlExtensionMAnAgementServer: IExtensionMAnAgementServer;
	public get locAlExtensionMAnAgementServer(): IExtensionMAnAgementServer { return this._locAlExtensionMAnAgementServer; }
	reAdonly remoteExtensionMAnAgementServer: IExtensionMAnAgementServer | null = null;
	reAdonly webExtensionMAnAgementServer: IExtensionMAnAgementServer | null = null;

	constructor(
		@IShAredProcessService shAredProcessService: IShAredProcessService,
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@ILAbelService lAbelService: ILAbelService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
	) {
		const locAlExtensionMAnAgementService = new ExtensionMAnAgementChAnnelClient(shAredProcessService.getChAnnel('extensions'));

		this._locAlExtensionMAnAgementServer = { extensionMAnAgementService: locAlExtensionMAnAgementService, id: 'locAl', lAbel: locAlize('locAl', "LocAl") };
		const remoteAgentConnection = remoteAgentService.getConnection();
		if (remoteAgentConnection) {
			const extensionMAnAgementService = instAntiAtionService.creAteInstAnce(NAtiveRemoteExtensionMAnAgementService, remoteAgentConnection.getChAnnel<IChAnnel>('extensions'), this.locAlExtensionMAnAgementServer);
			this.remoteExtensionMAnAgementServer = {
				id: 'remote',
				extensionMAnAgementService,
				get lAbel() { return lAbelService.getHostLAbel(SchemAs.vscodeRemote, remoteAgentConnection!.remoteAuthority) || locAlize('remote', "Remote"); }
			};
		}
	}

	getExtensionMAnAgementServer(extension: IExtension): IExtensionMAnAgementServer {
		if (extension.locAtion.scheme === SchemAs.file) {
			return this.locAlExtensionMAnAgementServer;
		}
		if (this.remoteExtensionMAnAgementServer && extension.locAtion.scheme === SchemAs.vscodeRemote) {
			return this.remoteExtensionMAnAgementServer;
		}
		throw new Error(`InvAlid Extension ${extension.locAtion}`);
	}
}

registerSingleton(IExtensionMAnAgementServerService, ExtensionMAnAgementServerService);
