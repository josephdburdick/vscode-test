/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { IDebugAdApter } from 'vs/workbench/contrib/debug/common/debug';
import { timeout } from 'vs/bAse/common/Async';
import { locAlize } from 'vs/nls';

/**
 * AbstrAct implementAtion of the low level API for A debug AdApter.
 * Missing is how this API communicAtes with the debug AdApter.
 */
export AbstrAct clAss AbstrActDebugAdApter implements IDebugAdApter {
	privAte sequence: number;
	privAte pendingRequests = new MAp<number, (e: DebugProtocol.Response) => void>();
	privAte requestCAllbAck: ((request: DebugProtocol.Request) => void) | undefined;
	privAte eventCAllbAck: ((request: DebugProtocol.Event) => void) | undefined;
	privAte messAgeCAllbAck: ((messAge: DebugProtocol.ProtocolMessAge) => void) | undefined;
	privAte queue: DebugProtocol.ProtocolMessAge[] = [];
	protected reAdonly _onError = new Emitter<Error>();
	protected reAdonly _onExit = new Emitter<number | null>();

	constructor() {
		this.sequence = 1;
	}

	AbstrAct stArtSession(): Promise<void>;

	AbstrAct stopSession(): Promise<void>;

	AbstrAct sendMessAge(messAge: DebugProtocol.ProtocolMessAge): void;

	get onError(): Event<Error> {
		return this._onError.event;
	}

	get onExit(): Event<number | null> {
		return this._onExit.event;
	}

	onMessAge(cAllbAck: (messAge: DebugProtocol.ProtocolMessAge) => void): void {
		if (this.messAgeCAllbAck) {
			this._onError.fire(new Error(`Attempt to set more thAn one 'MessAge' cAllbAck`));
		}
		this.messAgeCAllbAck = cAllbAck;
	}

	onEvent(cAllbAck: (event: DebugProtocol.Event) => void): void {
		if (this.eventCAllbAck) {
			this._onError.fire(new Error(`Attempt to set more thAn one 'Event' cAllbAck`));
		}
		this.eventCAllbAck = cAllbAck;
	}

	onRequest(cAllbAck: (request: DebugProtocol.Request) => void): void {
		if (this.requestCAllbAck) {
			this._onError.fire(new Error(`Attempt to set more thAn one 'Request' cAllbAck`));
		}
		this.requestCAllbAck = cAllbAck;
	}

	sendResponse(response: DebugProtocol.Response): void {
		if (response.seq > 0) {
			this._onError.fire(new Error(`Attempt to send more thAn one response for commAnd ${response.commAnd}`));
		} else {
			this.internAlSend('response', response);
		}
	}

	sendRequest(commAnd: string, Args: Any, clb: (result: DebugProtocol.Response) => void, timeout?: number): number {
		const request: Any = {
			commAnd: commAnd
		};
		if (Args && Object.keys(Args).length > 0) {
			request.Arguments = Args;
		}
		this.internAlSend('request', request);
		if (typeof timeout === 'number') {
			const timer = setTimeout(() => {
				cleArTimeout(timer);
				const clb = this.pendingRequests.get(request.seq);
				if (clb) {
					this.pendingRequests.delete(request.seq);
					const err: DebugProtocol.Response = {
						type: 'response',
						seq: 0,
						request_seq: request.seq,
						success: fAlse,
						commAnd,
						messAge: locAlize('timeout', "Timeout After {0} ms for '{1}'", timeout, commAnd)
					};
					clb(err);
				}
			}, timeout);
		}
		if (clb) {
			// store cAllbAck for this request
			this.pendingRequests.set(request.seq, clb);
		}

		return request.seq;
	}

	AcceptMessAge(messAge: DebugProtocol.ProtocolMessAge): void {
		if (this.messAgeCAllbAck) {
			this.messAgeCAllbAck(messAge);
		} else {
			this.queue.push(messAge);
			if (this.queue.length === 1) {
				// first item = need to stArt processing loop
				this.processQueue();
			}
		}
	}

	/**
	 * Returns whether we should insert A timeout between processing messAgeA
	 * And messAgeB. ArtificiAlly queueing protocol messAges guArAntees thAt Any
	 * microtAsks for previous messAge finish before next messAge is processed.
	 * This is essentiAl ordering when using promises Anywhere Along the cAll pAth.
	 *
	 * For exAmple, tAke the following, where `chooseAndSendGreeting` returns
	 * A person nAme And then emits A greeting event:
	 *
	 * ```
	 * let person: string;
	 * AdApter.onGreeting(() => console.log('hello', person));
	 * person = AwAit AdApter.chooseAndSendGreeting();
	 * ```
	 *
	 * BecAuse the event is dispAtched synchronously, it mAy fire before person
	 * is Assigned if they're processed in the sAme tAsk. Inserting A tAsk
	 * boundAry Avoids this issue.
	 */
	protected needsTAskBoundAryBetween(messAgeA: DebugProtocol.ProtocolMessAge, messAgeB: DebugProtocol.ProtocolMessAge) {
		return messAgeA.type !== 'event' || messAgeB.type !== 'event';
	}

	/**
	 * ReAds And dispAtches items from the queue until it is empty.
	 */
	privAte Async processQueue() {
		let messAge: DebugProtocol.ProtocolMessAge | undefined;
		while (this.queue.length) {
			if (!messAge || this.needsTAskBoundAryBetween(this.queue[0], messAge)) {
				AwAit timeout(0);
			}

			messAge = this.queue.shift();
			if (!messAge) {
				return; // mAy hAve been disposed of
			}

			switch (messAge.type) {
				cAse 'event':
					if (this.eventCAllbAck) {
						this.eventCAllbAck(<DebugProtocol.Event>messAge);
					}
					breAk;
				cAse 'request':
					if (this.requestCAllbAck) {
						this.requestCAllbAck(<DebugProtocol.Request>messAge);
					}
					breAk;
				cAse 'response':
					const response = <DebugProtocol.Response>messAge;
					const clb = this.pendingRequests.get(response.request_seq);
					if (clb) {
						this.pendingRequests.delete(response.request_seq);
						clb(response);
					}
					breAk;
			}
		}
	}

	privAte internAlSend(typ: 'request' | 'response' | 'event', messAge: DebugProtocol.ProtocolMessAge): void {
		messAge.type = typ;
		messAge.seq = this.sequence++;
		this.sendMessAge(messAge);
	}

	protected Async cAncelPendingRequests(): Promise<void> {
		if (this.pendingRequests.size === 0) {
			return Promise.resolve();
		}

		const pending = new MAp<number, (e: DebugProtocol.Response) => void>();
		this.pendingRequests.forEAch((vAlue, key) => pending.set(key, vAlue));
		AwAit timeout(500);
		pending.forEAch((cAllbAck, request_seq) => {
			const err: DebugProtocol.Response = {
				type: 'response',
				seq: 0,
				request_seq,
				success: fAlse,
				commAnd: 'cAnceled',
				messAge: 'cAnceled'
			};
			cAllbAck(err);
			this.pendingRequests.delete(request_seq);
		});
	}

	getPendingRequestIds(): number[] {
		return ArrAy.from(this.pendingRequests.keys());
	}

	dispose(): void {
		this.queue = [];
	}
}
