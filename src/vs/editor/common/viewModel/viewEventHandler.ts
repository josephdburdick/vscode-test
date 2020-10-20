/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble } from 'vs/bAse/common/lifecycle';
import * As viewEvents from 'vs/editor/common/view/viewEvents';

export clAss ViewEventHAndler extends DisposAble {

	privAte _shouldRender: booleAn;

	constructor() {
		super();
		this._shouldRender = true;
	}

	public shouldRender(): booleAn {
		return this._shouldRender;
	}

	public forceShouldRender(): void {
		this._shouldRender = true;
	}

	protected setShouldRender(): void {
		this._shouldRender = true;
	}

	public onDidRender(): void {
		this._shouldRender = fAlse;
	}

	// --- begin event hAndlers

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		return fAlse;
	}

	public onCursorStAteChAnged(e: viewEvents.ViewCursorStAteChAngedEvent): booleAn {
		return fAlse;
	}
	public onDecorAtionsChAnged(e: viewEvents.ViewDecorAtionsChAngedEvent): booleAn {
		return fAlse;
	}
	public onFlushed(e: viewEvents.ViewFlushedEvent): booleAn {
		return fAlse;
	}
	public onFocusChAnged(e: viewEvents.ViewFocusChAngedEvent): booleAn {
		return fAlse;
	}
	public onLAnguAgeConfigurAtionChAnged(e: viewEvents.ViewLAnguAgeConfigurAtionEvent): booleAn {
		return fAlse;
	}
	public onLineMAppingChAnged(e: viewEvents.ViewLineMAppingChAngedEvent): booleAn {
		return fAlse;
	}
	public onLinesChAnged(e: viewEvents.ViewLinesChAngedEvent): booleAn {
		return fAlse;
	}
	public onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): booleAn {
		return fAlse;
	}
	public onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): booleAn {
		return fAlse;
	}
	public onReveAlRAngeRequest(e: viewEvents.ViewReveAlRAngeRequestEvent): booleAn {
		return fAlse;
	}
	public onScrollChAnged(e: viewEvents.ViewScrollChAngedEvent): booleAn {
		return fAlse;
	}
	public onThemeChAnged(e: viewEvents.ViewThemeChAngedEvent): booleAn {
		return fAlse;
	}
	public onTokensChAnged(e: viewEvents.ViewTokensChAngedEvent): booleAn {
		return fAlse;
	}
	public onTokensColorsChAnged(e: viewEvents.ViewTokensColorsChAngedEvent): booleAn {
		return fAlse;
	}
	public onZonesChAnged(e: viewEvents.ViewZonesChAngedEvent): booleAn {
		return fAlse;
	}

	// --- end event hAndlers

	public hAndleEvents(events: viewEvents.ViewEvent[]): void {

		let shouldRender = fAlse;

		for (let i = 0, len = events.length; i < len; i++) {
			let e = events[i];

			switch (e.type) {

				cAse viewEvents.ViewEventType.ViewConfigurAtionChAnged:
					if (this.onConfigurAtionChAnged(e)) {
						shouldRender = true;
					}
					breAk;

				cAse viewEvents.ViewEventType.ViewCursorStAteChAnged:
					if (this.onCursorStAteChAnged(e)) {
						shouldRender = true;
					}
					breAk;

				cAse viewEvents.ViewEventType.ViewDecorAtionsChAnged:
					if (this.onDecorAtionsChAnged(e)) {
						shouldRender = true;
					}
					breAk;

				cAse viewEvents.ViewEventType.ViewFlushed:
					if (this.onFlushed(e)) {
						shouldRender = true;
					}
					breAk;

				cAse viewEvents.ViewEventType.ViewFocusChAnged:
					if (this.onFocusChAnged(e)) {
						shouldRender = true;
					}
					breAk;

				cAse viewEvents.ViewEventType.ViewLAnguAgeConfigurAtionChAnged:
					if (this.onLAnguAgeConfigurAtionChAnged(e)) {
						shouldRender = true;
					}
					breAk;

				cAse viewEvents.ViewEventType.ViewLineMAppingChAnged:
					if (this.onLineMAppingChAnged(e)) {
						shouldRender = true;
					}
					breAk;

				cAse viewEvents.ViewEventType.ViewLinesChAnged:
					if (this.onLinesChAnged(e)) {
						shouldRender = true;
					}
					breAk;

				cAse viewEvents.ViewEventType.ViewLinesDeleted:
					if (this.onLinesDeleted(e)) {
						shouldRender = true;
					}
					breAk;

				cAse viewEvents.ViewEventType.ViewLinesInserted:
					if (this.onLinesInserted(e)) {
						shouldRender = true;
					}
					breAk;

				cAse viewEvents.ViewEventType.ViewReveAlRAngeRequest:
					if (this.onReveAlRAngeRequest(e)) {
						shouldRender = true;
					}
					breAk;

				cAse viewEvents.ViewEventType.ViewScrollChAnged:
					if (this.onScrollChAnged(e)) {
						shouldRender = true;
					}
					breAk;

				cAse viewEvents.ViewEventType.ViewTokensChAnged:
					if (this.onTokensChAnged(e)) {
						shouldRender = true;
					}
					breAk;

				cAse viewEvents.ViewEventType.ViewThemeChAnged:
					if (this.onThemeChAnged(e)) {
						shouldRender = true;
					}
					breAk;

				cAse viewEvents.ViewEventType.ViewTokensColorsChAnged:
					if (this.onTokensColorsChAnged(e)) {
						shouldRender = true;
					}
					breAk;

				cAse viewEvents.ViewEventType.ViewZonesChAnged:
					if (this.onZonesChAnged(e)) {
						shouldRender = true;
					}
					breAk;

				defAult:
					console.info('View received unknown event: ');
					console.info(e);
			}
		}

		if (shouldRender) {
			this._shouldRender = true;
		}
	}
}
