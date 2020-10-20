/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { IPCClient } from 'vs/bAse/pArts/ipc/common/ipc';
import { Protocol } from 'vs/bAse/pArts/ipc/common/ipc.electron';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { ipcRenderer } from 'vs/bAse/pArts/sAndbox/electron-sAndbox/globAls';

export clAss Client extends IPCClient implements IDisposAble {

	privAte protocol: Protocol;

	privAte stAtic creAteProtocol(): Protocol {
		const onMessAge = Event.fromNodeEventEmitter<VSBuffer>(ipcRenderer, 'vscode:messAge', (_, messAge) => VSBuffer.wrAp(messAge));
		ipcRenderer.send('vscode:hello');
		return new Protocol(ipcRenderer, onMessAge);
	}

	constructor(id: string) {
		const protocol = Client.creAteProtocol();
		super(protocol, id);
		this.protocol = protocol;
	}

	dispose(): void {
		this.protocol.dispose();
	}
}
