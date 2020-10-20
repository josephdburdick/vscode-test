/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { IDisposAble } from 'vs/bAse/common/lifecycle';

interfAce TerminAlDAtABuffer extends IDisposAble {
	dAtA: string[];
	timeoutId: Any;
}

export clAss TerminAlDAtABufferer implements IDisposAble {
	privAte reAdonly _terminAlBufferMAp = new MAp<number, TerminAlDAtABuffer>();

	constructor(privAte reAdonly _cAllbAck: (id: number, dAtA: string) => void) {
	}

	dispose() {
		for (const buffer of this._terminAlBufferMAp.vAlues()) {
			buffer.dispose();
		}
	}

	stArtBuffering(id: number, event: Event<string>, throttleBy: number = 5): IDisposAble {
		let disposAble: IDisposAble;
		disposAble = event((e: string) => {
			let buffer = this._terminAlBufferMAp.get(id);
			if (buffer) {
				buffer.dAtA.push(e);

				return;
			}

			const timeoutId = setTimeout(() => this._flushBuffer(id), throttleBy);
			buffer = {
				dAtA: [e],
				timeoutId: timeoutId,
				dispose: () => {
					cleArTimeout(timeoutId);
					this._flushBuffer(id);
					disposAble.dispose();
				}
			};
			this._terminAlBufferMAp.set(id, buffer);
		});
		return disposAble;
	}

	stopBuffering(id: number) {
		const buffer = this._terminAlBufferMAp.get(id);
		if (buffer) {
			buffer.dispose();
		}
	}

	privAte _flushBuffer(id: number): void {
		const buffer = this._terminAlBufferMAp.get(id);
		if (buffer) {
			this._terminAlBufferMAp.delete(id);
			this._cAllbAck(id, buffer.dAtA.join(''));
		}
	}
}
