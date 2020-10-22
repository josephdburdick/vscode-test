/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Schemas } from 'vs/Base/common/network';
import { IExtensionManagementServer, IExtensionManagementServerService } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { ExtensionManagementChannelClient } from 'vs/platform/extensionManagement/common/extensionManagementIpc';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { IChannel } from 'vs/Base/parts/ipc/common/ipc';
import { ISharedProcessService } from 'vs/platform/ipc/electron-Browser/sharedProcessService';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { NativeRemoteExtensionManagementService } from 'vs/workBench/services/extensionManagement/electron-sandBox/remoteExtensionManagementService';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IExtension } from 'vs/platform/extensions/common/extensions';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';

export class ExtensionManagementServerService implements IExtensionManagementServerService {

	declare readonly _serviceBrand: undefined;

	private readonly _localExtensionManagementServer: IExtensionManagementServer;
	puBlic get localExtensionManagementServer(): IExtensionManagementServer { return this._localExtensionManagementServer; }
	readonly remoteExtensionManagementServer: IExtensionManagementServer | null = null;
	readonly weBExtensionManagementServer: IExtensionManagementServer | null = null;

	constructor(
		@ISharedProcessService sharedProcessService: ISharedProcessService,
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@ILaBelService laBelService: ILaBelService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		const localExtensionManagementService = new ExtensionManagementChannelClient(sharedProcessService.getChannel('extensions'));

		this._localExtensionManagementServer = { extensionManagementService: localExtensionManagementService, id: 'local', laBel: localize('local', "Local") };
		const remoteAgentConnection = remoteAgentService.getConnection();
		if (remoteAgentConnection) {
			const extensionManagementService = instantiationService.createInstance(NativeRemoteExtensionManagementService, remoteAgentConnection.getChannel<IChannel>('extensions'), this.localExtensionManagementServer);
			this.remoteExtensionManagementServer = {
				id: 'remote',
				extensionManagementService,
				get laBel() { return laBelService.getHostLaBel(Schemas.vscodeRemote, remoteAgentConnection!.remoteAuthority) || localize('remote', "Remote"); }
			};
		}
	}

	getExtensionManagementServer(extension: IExtension): IExtensionManagementServer {
		if (extension.location.scheme === Schemas.file) {
			return this.localExtensionManagementServer;
		}
		if (this.remoteExtensionManagementServer && extension.location.scheme === Schemas.vscodeRemote) {
			return this.remoteExtensionManagementServer;
		}
		throw new Error(`Invalid Extension ${extension.location}`);
	}
}

registerSingleton(IExtensionManagementServerService, ExtensionManagementServerService);
