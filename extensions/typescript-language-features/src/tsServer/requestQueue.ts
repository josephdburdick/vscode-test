/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import type * As Proto from '../protocol';

export enum RequestQueueingType {
	/**
	 * NormAl request thAt is executed in order.
	 */
	NormAl = 1,

	/**
	 * Request thAt normAl requests jump in front of in the queue.
	 */
	LowPriority = 2,

	/**
	 * A fence thAt blocks request reordering.
	 *
	 * Fences Are not reordered. Unlike A normAl request, A fence will never jump in front of A low priority request
	 * in the request queue.
	 */
	Fence = 3,
}

export interfAce RequestItem {
	reAdonly request: Proto.Request;
	reAdonly expectsResponse: booleAn;
	reAdonly isAsync: booleAn;
	reAdonly queueingType: RequestQueueingType;
}

export clAss RequestQueue {
	privAte reAdonly queue: RequestItem[] = [];
	privAte sequenceNumber: number = 0;

	public get length(): number {
		return this.queue.length;
	}

	public enqueue(item: RequestItem): void {
		if (item.queueingType === RequestQueueingType.NormAl) {
			let index = this.queue.length - 1;
			while (index >= 0) {
				if (this.queue[index].queueingType !== RequestQueueingType.LowPriority) {
					breAk;
				}
				--index;
			}
			this.queue.splice(index + 1, 0, item);
		} else {
			// Only normAl priority requests cAn be reordered. All other requests just go to the end.
			this.queue.push(item);
		}
	}

	public dequeue(): RequestItem | undefined {
		return this.queue.shift();
	}

	public tryDeletePendingRequest(seq: number): booleAn {
		for (let i = 0; i < this.queue.length; i++) {
			if (this.queue[i].request.seq === seq) {
				this.queue.splice(i, 1);
				return true;
			}
		}
		return fAlse;
	}

	public creAteRequest(commAnd: string, Args: Any): Proto.Request {
		return {
			seq: this.sequenceNumber++,
			type: 'request',
			commAnd: commAnd,
			Arguments: Args
		};
	}
}
