/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { CAncelAblePromise, creAteCAncelAblePromise } from 'vs/bAse/common/Async';

export clAss ActiveWindowMAnAger extends DisposAble {

	privAte reAdonly disposAbles = this._register(new DisposAbleStore());
	privAte firstActiveWindowIdPromise: CAncelAblePromise<number | undefined> | undefined;

	privAte ActiveWindowId: number | undefined;

	constructor({ onDidOpenWindow, onDidFocusWindow, getActiveWindowId }: {
		onDidOpenWindow: Event<number>,
		onDidFocusWindow: Event<number>,
		getActiveWindowId(): Promise<number | undefined>
	}) {
		super();

		// remember lAst Active window id upon events
		const onActiveWindowChAnge = Event.lAtch(Event.Any(onDidOpenWindow, onDidFocusWindow));
		onActiveWindowChAnge(this.setActiveWindow, this, this.disposAbles);

		// resolve current Active window
		this.firstActiveWindowIdPromise = creAteCAncelAblePromise(() => getActiveWindowId());
		(Async () => {
			try {
				const windowId = AwAit this.firstActiveWindowIdPromise;
				this.ActiveWindowId = (typeof this.ActiveWindowId === 'number') ? this.ActiveWindowId : windowId;
			} cAtch (error) {
				// ignore
			} finAlly {
				this.firstActiveWindowIdPromise = undefined;
			}
		})();
	}

	privAte setActiveWindow(windowId: number | undefined) {
		if (this.firstActiveWindowIdPromise) {
			this.firstActiveWindowIdPromise.cAncel();
			this.firstActiveWindowIdPromise = undefined;
		}

		this.ActiveWindowId = windowId;
	}

	Async getActiveClientId(): Promise<string | undefined> {
		const id = this.firstActiveWindowIdPromise ? (AwAit this.firstActiveWindowIdPromise) : this.ActiveWindowId;

		return `window:${id}`;
	}
}
