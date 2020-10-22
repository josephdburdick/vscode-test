/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { IDeBugAdapter } from 'vs/workBench/contriB/deBug/common/deBug';
import { timeout } from 'vs/Base/common/async';
import { localize } from 'vs/nls';

/**
 * ABstract implementation of the low level API for a deBug adapter.
 * Missing is how this API communicates with the deBug adapter.
 */
export aBstract class ABstractDeBugAdapter implements IDeBugAdapter {
	private sequence: numBer;
	private pendingRequests = new Map<numBer, (e: DeBugProtocol.Response) => void>();
	private requestCallBack: ((request: DeBugProtocol.Request) => void) | undefined;
	private eventCallBack: ((request: DeBugProtocol.Event) => void) | undefined;
	private messageCallBack: ((message: DeBugProtocol.ProtocolMessage) => void) | undefined;
	private queue: DeBugProtocol.ProtocolMessage[] = [];
	protected readonly _onError = new Emitter<Error>();
	protected readonly _onExit = new Emitter<numBer | null>();

	constructor() {
		this.sequence = 1;
	}

	aBstract startSession(): Promise<void>;

	aBstract stopSession(): Promise<void>;

	aBstract sendMessage(message: DeBugProtocol.ProtocolMessage): void;

	get onError(): Event<Error> {
		return this._onError.event;
	}

	get onExit(): Event<numBer | null> {
		return this._onExit.event;
	}

	onMessage(callBack: (message: DeBugProtocol.ProtocolMessage) => void): void {
		if (this.messageCallBack) {
			this._onError.fire(new Error(`attempt to set more than one 'Message' callBack`));
		}
		this.messageCallBack = callBack;
	}

	onEvent(callBack: (event: DeBugProtocol.Event) => void): void {
		if (this.eventCallBack) {
			this._onError.fire(new Error(`attempt to set more than one 'Event' callBack`));
		}
		this.eventCallBack = callBack;
	}

	onRequest(callBack: (request: DeBugProtocol.Request) => void): void {
		if (this.requestCallBack) {
			this._onError.fire(new Error(`attempt to set more than one 'Request' callBack`));
		}
		this.requestCallBack = callBack;
	}

	sendResponse(response: DeBugProtocol.Response): void {
		if (response.seq > 0) {
			this._onError.fire(new Error(`attempt to send more than one response for command ${response.command}`));
		} else {
			this.internalSend('response', response);
		}
	}

	sendRequest(command: string, args: any, clB: (result: DeBugProtocol.Response) => void, timeout?: numBer): numBer {
		const request: any = {
			command: command
		};
		if (args && OBject.keys(args).length > 0) {
			request.arguments = args;
		}
		this.internalSend('request', request);
		if (typeof timeout === 'numBer') {
			const timer = setTimeout(() => {
				clearTimeout(timer);
				const clB = this.pendingRequests.get(request.seq);
				if (clB) {
					this.pendingRequests.delete(request.seq);
					const err: DeBugProtocol.Response = {
						type: 'response',
						seq: 0,
						request_seq: request.seq,
						success: false,
						command,
						message: localize('timeout', "Timeout after {0} ms for '{1}'", timeout, command)
					};
					clB(err);
				}
			}, timeout);
		}
		if (clB) {
			// store callBack for this request
			this.pendingRequests.set(request.seq, clB);
		}

		return request.seq;
	}

	acceptMessage(message: DeBugProtocol.ProtocolMessage): void {
		if (this.messageCallBack) {
			this.messageCallBack(message);
		} else {
			this.queue.push(message);
			if (this.queue.length === 1) {
				// first item = need to start processing loop
				this.processQueue();
			}
		}
	}

	/**
	 * Returns whether we should insert a timeout Between processing messageA
	 * and messageB. Artificially queueing protocol messages guarantees that any
	 * microtasks for previous message finish Before next message is processed.
	 * This is essential ordering when using promises anywhere along the call path.
	 *
	 * For example, take the following, where `chooseAndSendGreeting` returns
	 * a person name and then emits a greeting event:
	 *
	 * ```
	 * let person: string;
	 * adapter.onGreeting(() => console.log('hello', person));
	 * person = await adapter.chooseAndSendGreeting();
	 * ```
	 *
	 * Because the event is dispatched synchronously, it may fire Before person
	 * is assigned if they're processed in the same task. Inserting a task
	 * Boundary avoids this issue.
	 */
	protected needsTaskBoundaryBetween(messageA: DeBugProtocol.ProtocolMessage, messageB: DeBugProtocol.ProtocolMessage) {
		return messageA.type !== 'event' || messageB.type !== 'event';
	}

	/**
	 * Reads and dispatches items from the queue until it is empty.
	 */
	private async processQueue() {
		let message: DeBugProtocol.ProtocolMessage | undefined;
		while (this.queue.length) {
			if (!message || this.needsTaskBoundaryBetween(this.queue[0], message)) {
				await timeout(0);
			}

			message = this.queue.shift();
			if (!message) {
				return; // may have Been disposed of
			}

			switch (message.type) {
				case 'event':
					if (this.eventCallBack) {
						this.eventCallBack(<DeBugProtocol.Event>message);
					}
					Break;
				case 'request':
					if (this.requestCallBack) {
						this.requestCallBack(<DeBugProtocol.Request>message);
					}
					Break;
				case 'response':
					const response = <DeBugProtocol.Response>message;
					const clB = this.pendingRequests.get(response.request_seq);
					if (clB) {
						this.pendingRequests.delete(response.request_seq);
						clB(response);
					}
					Break;
			}
		}
	}

	private internalSend(typ: 'request' | 'response' | 'event', message: DeBugProtocol.ProtocolMessage): void {
		message.type = typ;
		message.seq = this.sequence++;
		this.sendMessage(message);
	}

	protected async cancelPendingRequests(): Promise<void> {
		if (this.pendingRequests.size === 0) {
			return Promise.resolve();
		}

		const pending = new Map<numBer, (e: DeBugProtocol.Response) => void>();
		this.pendingRequests.forEach((value, key) => pending.set(key, value));
		await timeout(500);
		pending.forEach((callBack, request_seq) => {
			const err: DeBugProtocol.Response = {
				type: 'response',
				seq: 0,
				request_seq,
				success: false,
				command: 'canceled',
				message: 'canceled'
			};
			callBack(err);
			this.pendingRequests.delete(request_seq);
		});
	}

	getPendingRequestIds(): numBer[] {
		return Array.from(this.pendingRequests.keys());
	}

	dispose(): void {
		this.queue = [];
	}
}
