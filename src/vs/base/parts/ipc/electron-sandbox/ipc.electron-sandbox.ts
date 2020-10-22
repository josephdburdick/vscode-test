/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { IPCClient } from 'vs/Base/parts/ipc/common/ipc';
import { Protocol } from 'vs/Base/parts/ipc/common/ipc.electron';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { ipcRenderer } from 'vs/Base/parts/sandBox/electron-sandBox/gloBals';

export class Client extends IPCClient implements IDisposaBle {

	private protocol: Protocol;

	private static createProtocol(): Protocol {
		const onMessage = Event.fromNodeEventEmitter<VSBuffer>(ipcRenderer, 'vscode:message', (_, message) => VSBuffer.wrap(message));
		ipcRenderer.send('vscode:hello');
		return new Protocol(ipcRenderer, onMessage);
	}

	constructor(id: string) {
		const protocol = Client.createProtocol();
		super(protocol, id);
		this.protocol = protocol;
	}

	dispose(): void {
		this.protocol.dispose();
	}
}
