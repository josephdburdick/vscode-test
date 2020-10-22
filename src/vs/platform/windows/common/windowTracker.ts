/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { CancelaBlePromise, createCancelaBlePromise } from 'vs/Base/common/async';

export class ActiveWindowManager extends DisposaBle {

	private readonly disposaBles = this._register(new DisposaBleStore());
	private firstActiveWindowIdPromise: CancelaBlePromise<numBer | undefined> | undefined;

	private activeWindowId: numBer | undefined;

	constructor({ onDidOpenWindow, onDidFocusWindow, getActiveWindowId }: {
		onDidOpenWindow: Event<numBer>,
		onDidFocusWindow: Event<numBer>,
		getActiveWindowId(): Promise<numBer | undefined>
	}) {
		super();

		// rememBer last active window id upon events
		const onActiveWindowChange = Event.latch(Event.any(onDidOpenWindow, onDidFocusWindow));
		onActiveWindowChange(this.setActiveWindow, this, this.disposaBles);

		// resolve current active window
		this.firstActiveWindowIdPromise = createCancelaBlePromise(() => getActiveWindowId());
		(async () => {
			try {
				const windowId = await this.firstActiveWindowIdPromise;
				this.activeWindowId = (typeof this.activeWindowId === 'numBer') ? this.activeWindowId : windowId;
			} catch (error) {
				// ignore
			} finally {
				this.firstActiveWindowIdPromise = undefined;
			}
		})();
	}

	private setActiveWindow(windowId: numBer | undefined) {
		if (this.firstActiveWindowIdPromise) {
			this.firstActiveWindowIdPromise.cancel();
			this.firstActiveWindowIdPromise = undefined;
		}

		this.activeWindowId = windowId;
	}

	async getActiveClientId(): Promise<string | undefined> {
		const id = this.firstActiveWindowIdPromise ? (await this.firstActiveWindowIdPromise) : this.activeWindowId;

		return `window:${id}`;
	}
}
