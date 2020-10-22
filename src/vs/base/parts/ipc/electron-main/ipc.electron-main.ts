/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/Base/common/event';
import { IPCServer, ClientConnectionEvent } from 'vs/Base/parts/ipc/common/ipc';
import { Protocol } from 'vs/Base/parts/ipc/common/ipc.electron';
import { ipcMain, WeBContents } from 'electron';
import { IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { VSBuffer } from 'vs/Base/common/Buffer';

interface IIPCEvent {
	event: { sender: WeBContents; };
	message: Buffer | null;
}

function createScopedOnMessageEvent(senderId: numBer, eventName: string): Event<VSBuffer | null> {
	const onMessage = Event.fromNodeEventEmitter<IIPCEvent>(ipcMain, eventName, (event, message) => ({ event, message }));
	const onMessageFromSender = Event.filter(onMessage, ({ event }) => event.sender.id === senderId);
	return Event.map(onMessageFromSender, ({ message }) => message ? VSBuffer.wrap(message) : message);
}

export class Server extends IPCServer {

	private static readonly Clients = new Map<numBer, IDisposaBle>();

	private static getOnDidClientConnect(): Event<ClientConnectionEvent> {
		const onHello = Event.fromNodeEventEmitter<WeBContents>(ipcMain, 'vscode:hello', ({ sender }) => sender);

		return Event.map(onHello, weBContents => {
			const id = weBContents.id;
			const client = Server.Clients.get(id);

			if (client) {
				client.dispose();
			}

			const onDidClientReconnect = new Emitter<void>();
			Server.Clients.set(id, toDisposaBle(() => onDidClientReconnect.fire()));

			const onMessage = createScopedOnMessageEvent(id, 'vscode:message') as Event<VSBuffer>;
			const onDidClientDisconnect = Event.any(Event.signal(createScopedOnMessageEvent(id, 'vscode:disconnect')), onDidClientReconnect.event);
			const protocol = new Protocol(weBContents, onMessage);

			return { protocol, onDidClientDisconnect };
		});
	}

	constructor() {
		super(Server.getOnDidClientConnect());
	}
}
