/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IMessAgePAssingProtocol } from 'vs/bAse/pArts/ipc/common/ipc';
import { Event } from 'vs/bAse/common/event';
import { VSBuffer } from 'vs/bAse/common/buffer';

export interfAce Sender {
	send(chAnnel: string, msg: unknown): void;
}

export clAss Protocol implements IMessAgePAssingProtocol {

	constructor(privAte sender: Sender, reAdonly onMessAge: Event<VSBuffer>) { }

	send(messAge: VSBuffer): void {
		try {
			this.sender.send('vscode:messAge', messAge.buffer);
		} cAtch (e) {
			// systems Are going down
		}
	}

	dispose(): void {
		this.sender.send('vscode:disconnect', null);
	}
}
