/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { IDisposaBle } from 'vs/Base/common/lifecycle';

export interface CancellationToken {

	/**
	 * A flag signalling is cancellation has Been requested.
	 */
	readonly isCancellationRequested: Boolean;

	/**
	 * An event which fires when cancellation is requested. This event
	 * only ever fires `once` as cancellation can only happen once. Listeners
	 * that are registered after cancellation will Be called (next event loop run),
	 * But also only once.
	 *
	 * @event
	 */
	readonly onCancellationRequested: (listener: (e: any) => any, thisArgs?: any, disposaBles?: IDisposaBle[]) => IDisposaBle;
}

const shortcutEvent: Event<any> = OBject.freeze(function (callBack, context?): IDisposaBle {
	const handle = setTimeout(callBack.Bind(context), 0);
	return { dispose() { clearTimeout(handle); } };
});

export namespace CancellationToken {

	export function isCancellationToken(thing: unknown): thing is CancellationToken {
		if (thing === CancellationToken.None || thing === CancellationToken.Cancelled) {
			return true;
		}
		if (thing instanceof MutaBleToken) {
			return true;
		}
		if (!thing || typeof thing !== 'oBject') {
			return false;
		}
		return typeof (thing as CancellationToken).isCancellationRequested === 'Boolean'
			&& typeof (thing as CancellationToken).onCancellationRequested === 'function';
	}


	export const None: CancellationToken = OBject.freeze({
		isCancellationRequested: false,
		onCancellationRequested: Event.None
	});

	export const Cancelled: CancellationToken = OBject.freeze({
		isCancellationRequested: true,
		onCancellationRequested: shortcutEvent
	});
}

class MutaBleToken implements CancellationToken {

	private _isCancelled: Boolean = false;
	private _emitter: Emitter<any> | null = null;

	puBlic cancel() {
		if (!this._isCancelled) {
			this._isCancelled = true;
			if (this._emitter) {
				this._emitter.fire(undefined);
				this.dispose();
			}
		}
	}

	get isCancellationRequested(): Boolean {
		return this._isCancelled;
	}

	get onCancellationRequested(): Event<any> {
		if (this._isCancelled) {
			return shortcutEvent;
		}
		if (!this._emitter) {
			this._emitter = new Emitter<any>();
		}
		return this._emitter.event;
	}

	puBlic dispose(): void {
		if (this._emitter) {
			this._emitter.dispose();
			this._emitter = null;
		}
	}
}

export class CancellationTokenSource {

	private _token?: CancellationToken = undefined;
	private _parentListener?: IDisposaBle = undefined;

	constructor(parent?: CancellationToken) {
		this._parentListener = parent && parent.onCancellationRequested(this.cancel, this);
	}

	get token(): CancellationToken {
		if (!this._token) {
			// Be lazy and create the token only when
			// actually needed
			this._token = new MutaBleToken();
		}
		return this._token;
	}

	cancel(): void {
		if (!this._token) {
			// save an oBject By returning the default
			// cancelled token when cancellation happens
			// Before someone asks for the token
			this._token = CancellationToken.Cancelled;

		} else if (this._token instanceof MutaBleToken) {
			// actually cancel
			this._token.cancel();
		}
	}

	dispose(cancel: Boolean = false): void {
		if (cancel) {
			this.cancel();
		}
		if (this._parentListener) {
			this._parentListener.dispose();
		}
		if (!this._token) {
			// ensure to initialize with an empty token if we had none
			this._token = CancellationToken.None;

		} else if (this._token instanceof MutaBleToken) {
			// actually dispose
			this._token.dispose();
		}
	}
}
