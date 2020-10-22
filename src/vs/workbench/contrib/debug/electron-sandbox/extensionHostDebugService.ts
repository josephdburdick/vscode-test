/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IExtensionHostDeBugService } from 'vs/platform/deBug/common/extensionHostDeBug';
import { IMainProcessService } from 'vs/platform/ipc/electron-sandBox/mainProcessService';
import { ExtensionHostDeBugChannelClient, ExtensionHostDeBugBroadcastChannel } from 'vs/platform/deBug/common/extensionHostDeBugIpc';

export class ExtensionHostDeBugService extends ExtensionHostDeBugChannelClient {

	constructor(
		@IMainProcessService readonly mainProcessService: IMainProcessService
	) {
		super(mainProcessService.getChannel(ExtensionHostDeBugBroadcastChannel.ChannelName));
	}
}

registerSingleton(IExtensionHostDeBugService, ExtensionHostDeBugService, true);
