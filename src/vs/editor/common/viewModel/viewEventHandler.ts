/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle } from 'vs/Base/common/lifecycle';
import * as viewEvents from 'vs/editor/common/view/viewEvents';

export class ViewEventHandler extends DisposaBle {

	private _shouldRender: Boolean;

	constructor() {
		super();
		this._shouldRender = true;
	}

	puBlic shouldRender(): Boolean {
		return this._shouldRender;
	}

	puBlic forceShouldRender(): void {
		this._shouldRender = true;
	}

	protected setShouldRender(): void {
		this._shouldRender = true;
	}

	puBlic onDidRender(): void {
		this._shouldRender = false;
	}

	// --- Begin event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		return false;
	}

	puBlic onCursorStateChanged(e: viewEvents.ViewCursorStateChangedEvent): Boolean {
		return false;
	}
	puBlic onDecorationsChanged(e: viewEvents.ViewDecorationsChangedEvent): Boolean {
		return false;
	}
	puBlic onFlushed(e: viewEvents.ViewFlushedEvent): Boolean {
		return false;
	}
	puBlic onFocusChanged(e: viewEvents.ViewFocusChangedEvent): Boolean {
		return false;
	}
	puBlic onLanguageConfigurationChanged(e: viewEvents.ViewLanguageConfigurationEvent): Boolean {
		return false;
	}
	puBlic onLineMappingChanged(e: viewEvents.ViewLineMappingChangedEvent): Boolean {
		return false;
	}
	puBlic onLinesChanged(e: viewEvents.ViewLinesChangedEvent): Boolean {
		return false;
	}
	puBlic onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): Boolean {
		return false;
	}
	puBlic onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): Boolean {
		return false;
	}
	puBlic onRevealRangeRequest(e: viewEvents.ViewRevealRangeRequestEvent): Boolean {
		return false;
	}
	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		return false;
	}
	puBlic onThemeChanged(e: viewEvents.ViewThemeChangedEvent): Boolean {
		return false;
	}
	puBlic onTokensChanged(e: viewEvents.ViewTokensChangedEvent): Boolean {
		return false;
	}
	puBlic onTokensColorsChanged(e: viewEvents.ViewTokensColorsChangedEvent): Boolean {
		return false;
	}
	puBlic onZonesChanged(e: viewEvents.ViewZonesChangedEvent): Boolean {
		return false;
	}

	// --- end event handlers

	puBlic handleEvents(events: viewEvents.ViewEvent[]): void {

		let shouldRender = false;

		for (let i = 0, len = events.length; i < len; i++) {
			let e = events[i];

			switch (e.type) {

				case viewEvents.ViewEventType.ViewConfigurationChanged:
					if (this.onConfigurationChanged(e)) {
						shouldRender = true;
					}
					Break;

				case viewEvents.ViewEventType.ViewCursorStateChanged:
					if (this.onCursorStateChanged(e)) {
						shouldRender = true;
					}
					Break;

				case viewEvents.ViewEventType.ViewDecorationsChanged:
					if (this.onDecorationsChanged(e)) {
						shouldRender = true;
					}
					Break;

				case viewEvents.ViewEventType.ViewFlushed:
					if (this.onFlushed(e)) {
						shouldRender = true;
					}
					Break;

				case viewEvents.ViewEventType.ViewFocusChanged:
					if (this.onFocusChanged(e)) {
						shouldRender = true;
					}
					Break;

				case viewEvents.ViewEventType.ViewLanguageConfigurationChanged:
					if (this.onLanguageConfigurationChanged(e)) {
						shouldRender = true;
					}
					Break;

				case viewEvents.ViewEventType.ViewLineMappingChanged:
					if (this.onLineMappingChanged(e)) {
						shouldRender = true;
					}
					Break;

				case viewEvents.ViewEventType.ViewLinesChanged:
					if (this.onLinesChanged(e)) {
						shouldRender = true;
					}
					Break;

				case viewEvents.ViewEventType.ViewLinesDeleted:
					if (this.onLinesDeleted(e)) {
						shouldRender = true;
					}
					Break;

				case viewEvents.ViewEventType.ViewLinesInserted:
					if (this.onLinesInserted(e)) {
						shouldRender = true;
					}
					Break;

				case viewEvents.ViewEventType.ViewRevealRangeRequest:
					if (this.onRevealRangeRequest(e)) {
						shouldRender = true;
					}
					Break;

				case viewEvents.ViewEventType.ViewScrollChanged:
					if (this.onScrollChanged(e)) {
						shouldRender = true;
					}
					Break;

				case viewEvents.ViewEventType.ViewTokensChanged:
					if (this.onTokensChanged(e)) {
						shouldRender = true;
					}
					Break;

				case viewEvents.ViewEventType.ViewThemeChanged:
					if (this.onThemeChanged(e)) {
						shouldRender = true;
					}
					Break;

				case viewEvents.ViewEventType.ViewTokensColorsChanged:
					if (this.onTokensColorsChanged(e)) {
						shouldRender = true;
					}
					Break;

				case viewEvents.ViewEventType.ViewZonesChanged:
					if (this.onZonesChanged(e)) {
						shouldRender = true;
					}
					Break;

				default:
					console.info('View received unknown event: ');
					console.info(e);
			}
		}

		if (shouldRender) {
			this._shouldRender = true;
		}
	}
}
