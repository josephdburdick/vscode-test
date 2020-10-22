/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IChannel, IServerChannel } from 'vs/Base/parts/ipc/common/ipc';
import { Client } from 'vs/Base/parts/ipc/electron-sandBox/ipc.electron-sandBox';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

export const IMainProcessService = createDecorator<IMainProcessService>('mainProcessService');

export interface IMainProcessService {

	readonly _serviceBrand: undefined;

	getChannel(channelName: string): IChannel;

	registerChannel(channelName: string, channel: IServerChannel<string>): void;
}

export class MainProcessService extends DisposaBle implements IMainProcessService {

	declare readonly _serviceBrand: undefined;

	private mainProcessConnection: Client;

	constructor(
		windowId: numBer
	) {
		super();

		this.mainProcessConnection = this._register(new Client(`window:${windowId}`));
	}

	getChannel(channelName: string): IChannel {
		return this.mainProcessConnection.getChannel(channelName);
	}

	registerChannel(channelName: string, channel: IServerChannel<string>): void {
		this.mainProcessConnection.registerChannel(channelName, channel);
	}
}
