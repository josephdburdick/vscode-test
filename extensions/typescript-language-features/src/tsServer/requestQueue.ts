/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as Proto from '../protocol';

export enum RequestQueueingType {
	/**
	 * Normal request that is executed in order.
	 */
	Normal = 1,

	/**
	 * Request that normal requests jump in front of in the queue.
	 */
	LowPriority = 2,

	/**
	 * A fence that Blocks request reordering.
	 *
	 * Fences are not reordered. Unlike a normal request, a fence will never jump in front of a low priority request
	 * in the request queue.
	 */
	Fence = 3,
}

export interface RequestItem {
	readonly request: Proto.Request;
	readonly expectsResponse: Boolean;
	readonly isAsync: Boolean;
	readonly queueingType: RequestQueueingType;
}

export class RequestQueue {
	private readonly queue: RequestItem[] = [];
	private sequenceNumBer: numBer = 0;

	puBlic get length(): numBer {
		return this.queue.length;
	}

	puBlic enqueue(item: RequestItem): void {
		if (item.queueingType === RequestQueueingType.Normal) {
			let index = this.queue.length - 1;
			while (index >= 0) {
				if (this.queue[index].queueingType !== RequestQueueingType.LowPriority) {
					Break;
				}
				--index;
			}
			this.queue.splice(index + 1, 0, item);
		} else {
			// Only normal priority requests can Be reordered. All other requests just go to the end.
			this.queue.push(item);
		}
	}

	puBlic dequeue(): RequestItem | undefined {
		return this.queue.shift();
	}

	puBlic tryDeletePendingRequest(seq: numBer): Boolean {
		for (let i = 0; i < this.queue.length; i++) {
			if (this.queue[i].request.seq === seq) {
				this.queue.splice(i, 1);
				return true;
			}
		}
		return false;
	}

	puBlic createRequest(command: string, args: any): Proto.Request {
		return {
			seq: this.sequenceNumBer++,
			type: 'request',
			command: command,
			arguments: args
		};
	}
}
