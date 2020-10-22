/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IMessagePassingProtocol } from 'vs/Base/parts/ipc/common/ipc';
import { Event } from 'vs/Base/common/event';
import { VSBuffer } from 'vs/Base/common/Buffer';

export interface Sender {
	send(channel: string, msg: unknown): void;
}

export class Protocol implements IMessagePassingProtocol {

	constructor(private sender: Sender, readonly onMessage: Event<VSBuffer>) { }

	send(message: VSBuffer): void {
		try {
			this.sender.send('vscode:message', message.Buffer);
		} catch (e) {
			// systems are going down
		}
	}

	dispose(): void {
		this.sender.send('vscode:disconnect', null);
	}
}
