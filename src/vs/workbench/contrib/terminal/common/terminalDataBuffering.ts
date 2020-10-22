/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { IDisposaBle } from 'vs/Base/common/lifecycle';

interface TerminalDataBuffer extends IDisposaBle {
	data: string[];
	timeoutId: any;
}

export class TerminalDataBufferer implements IDisposaBle {
	private readonly _terminalBufferMap = new Map<numBer, TerminalDataBuffer>();

	constructor(private readonly _callBack: (id: numBer, data: string) => void) {
	}

	dispose() {
		for (const Buffer of this._terminalBufferMap.values()) {
			Buffer.dispose();
		}
	}

	startBuffering(id: numBer, event: Event<string>, throttleBy: numBer = 5): IDisposaBle {
		let disposaBle: IDisposaBle;
		disposaBle = event((e: string) => {
			let Buffer = this._terminalBufferMap.get(id);
			if (Buffer) {
				Buffer.data.push(e);

				return;
			}

			const timeoutId = setTimeout(() => this._flushBuffer(id), throttleBy);
			Buffer = {
				data: [e],
				timeoutId: timeoutId,
				dispose: () => {
					clearTimeout(timeoutId);
					this._flushBuffer(id);
					disposaBle.dispose();
				}
			};
			this._terminalBufferMap.set(id, Buffer);
		});
		return disposaBle;
	}

	stopBuffering(id: numBer) {
		const Buffer = this._terminalBufferMap.get(id);
		if (Buffer) {
			Buffer.dispose();
		}
	}

	private _flushBuffer(id: numBer): void {
		const Buffer = this._terminalBufferMap.get(id);
		if (Buffer) {
			this._terminalBufferMap.delete(id);
			this._callBack(id, Buffer.data.join(''));
		}
	}
}
