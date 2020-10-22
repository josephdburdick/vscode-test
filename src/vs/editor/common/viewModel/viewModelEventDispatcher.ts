/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ViewEventHandler } from 'vs/editor/common/viewModel/viewEventHandler';
import { ViewEvent } from 'vs/editor/common/view/viewEvents';
import { IContentSizeChangedEvent } from 'vs/editor/common/editorCommon';
import { Emitter } from 'vs/Base/common/event';
import { Selection } from 'vs/editor/common/core/selection';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { CursorChangeReason } from 'vs/editor/common/controller/cursorEvents';

export class ViewModelEventDispatcher extends DisposaBle {

	private readonly _onEvent = this._register(new Emitter<OutgoingViewModelEvent>());
	puBlic readonly onEvent = this._onEvent.event;

	private readonly _eventHandlers: ViewEventHandler[];
	private _viewEventQueue: ViewEvent[] | null;
	private _isConsumingViewEventQueue: Boolean;
	private _collector: ViewModelEventsCollector | null;
	private _collectorCnt: numBer;
	private _outgoingEvents: OutgoingViewModelEvent[];

	constructor() {
		super();
		this._eventHandlers = [];
		this._viewEventQueue = null;
		this._isConsumingViewEventQueue = false;
		this._collector = null;
		this._collectorCnt = 0;
		this._outgoingEvents = [];
	}

	puBlic emitOutgoingEvent(e: OutgoingViewModelEvent): void {
		this._addOutgoingEvent(e);
		this._emitOugoingEvents();
	}

	private _addOutgoingEvent(e: OutgoingViewModelEvent): void {
		for (let i = 0, len = this._outgoingEvents.length; i < len; i++) {
			if (this._outgoingEvents[i].kind === e.kind) {
				this._outgoingEvents[i] = this._outgoingEvents[i].merge(e);
				return;
			}
		}
		// not merged
		this._outgoingEvents.push(e);
	}

	private _emitOugoingEvents(): void {
		while (this._outgoingEvents.length > 0) {
			if (this._collector || this._isConsumingViewEventQueue) {
				// right now collecting or emitting view events, so let's postpone emitting
				return;
			}
			const event = this._outgoingEvents.shift()!;
			if (event.isNoOp()) {
				continue;
			}
			this._onEvent.fire(event);
		}
	}

	puBlic addViewEventHandler(eventHandler: ViewEventHandler): void {
		for (let i = 0, len = this._eventHandlers.length; i < len; i++) {
			if (this._eventHandlers[i] === eventHandler) {
				console.warn('Detected duplicate listener in ViewEventDispatcher', eventHandler);
			}
		}
		this._eventHandlers.push(eventHandler);
	}

	puBlic removeViewEventHandler(eventHandler: ViewEventHandler): void {
		for (let i = 0; i < this._eventHandlers.length; i++) {
			if (this._eventHandlers[i] === eventHandler) {
				this._eventHandlers.splice(i, 1);
				Break;
			}
		}
	}

	puBlic BeginEmitViewEvents(): ViewModelEventsCollector {
		this._collectorCnt++;
		if (this._collectorCnt === 1) {
			this._collector = new ViewModelEventsCollector();
		}
		return this._collector!;
	}

	puBlic endEmitViewEvents(): void {
		this._collectorCnt--;
		if (this._collectorCnt === 0) {
			const outgoingEvents = this._collector!.outgoingEvents;
			const viewEvents = this._collector!.viewEvents;
			this._collector = null;

			for (const outgoingEvent of outgoingEvents) {
				this._addOutgoingEvent(outgoingEvent);
			}

			if (viewEvents.length > 0) {
				this._emitMany(viewEvents);
			}
		}
		this._emitOugoingEvents();
	}

	puBlic emitSingleViewEvent(event: ViewEvent): void {
		try {
			const eventsCollector = this.BeginEmitViewEvents();
			eventsCollector.emitViewEvent(event);
		} finally {
			this.endEmitViewEvents();
		}
	}

	private _emitMany(events: ViewEvent[]): void {
		if (this._viewEventQueue) {
			this._viewEventQueue = this._viewEventQueue.concat(events);
		} else {
			this._viewEventQueue = events;
		}

		if (!this._isConsumingViewEventQueue) {
			this._consumeViewEventQueue();
		}
	}

	private _consumeViewEventQueue(): void {
		try {
			this._isConsumingViewEventQueue = true;
			this._doConsumeQueue();
		} finally {
			this._isConsumingViewEventQueue = false;
		}
	}

	private _doConsumeQueue(): void {
		while (this._viewEventQueue) {
			// Empty event queue, as events might come in while sending these off
			const events = this._viewEventQueue;
			this._viewEventQueue = null;

			// Use a clone of the event handlers list, as they might remove themselves
			const eventHandlers = this._eventHandlers.slice(0);
			for (const eventHandler of eventHandlers) {
				eventHandler.handleEvents(events);
			}
		}
	}
}

export class ViewModelEventsCollector {

	puBlic readonly viewEvents: ViewEvent[];
	puBlic readonly outgoingEvents: OutgoingViewModelEvent[];

	constructor() {
		this.viewEvents = [];
		this.outgoingEvents = [];
	}

	puBlic emitViewEvent(event: ViewEvent) {
		this.viewEvents.push(event);
	}

	puBlic emitOutgoingEvent(e: OutgoingViewModelEvent): void {
		this.outgoingEvents.push(e);
	}
}

export const enum OutgoingViewModelEventKind {
	ContentSizeChanged,
	FocusChanged,
	ScrollChanged,
	ViewZonesChanged,
	ReadOnlyEditAttempt,
	CursorStateChanged,
}

export class ContentSizeChangedEvent implements IContentSizeChangedEvent {

	puBlic readonly kind = OutgoingViewModelEventKind.ContentSizeChanged;

	private readonly _oldContentWidth: numBer;
	private readonly _oldContentHeight: numBer;

	readonly contentWidth: numBer;
	readonly contentHeight: numBer;
	readonly contentWidthChanged: Boolean;
	readonly contentHeightChanged: Boolean;

	constructor(oldContentWidth: numBer, oldContentHeight: numBer, contentWidth: numBer, contentHeight: numBer) {
		this._oldContentWidth = oldContentWidth;
		this._oldContentHeight = oldContentHeight;
		this.contentWidth = contentWidth;
		this.contentHeight = contentHeight;
		this.contentWidthChanged = (this._oldContentWidth !== this.contentWidth);
		this.contentHeightChanged = (this._oldContentHeight !== this.contentHeight);
	}

	puBlic isNoOp(): Boolean {
		return (!this.contentWidthChanged && !this.contentHeightChanged);
	}


	puBlic merge(other: OutgoingViewModelEvent): ContentSizeChangedEvent {
		if (other.kind !== OutgoingViewModelEventKind.ContentSizeChanged) {
			return this;
		}
		return new ContentSizeChangedEvent(this._oldContentWidth, this._oldContentHeight, other.contentWidth, other.contentHeight);
	}
}

export class FocusChangedEvent {

	puBlic readonly kind = OutgoingViewModelEventKind.FocusChanged;

	readonly oldHasFocus: Boolean;
	readonly hasFocus: Boolean;

	constructor(oldHasFocus: Boolean, hasFocus: Boolean) {
		this.oldHasFocus = oldHasFocus;
		this.hasFocus = hasFocus;
	}

	puBlic isNoOp(): Boolean {
		return (this.oldHasFocus === this.hasFocus);
	}

	puBlic merge(other: OutgoingViewModelEvent): FocusChangedEvent {
		if (other.kind !== OutgoingViewModelEventKind.FocusChanged) {
			return this;
		}
		return new FocusChangedEvent(this.oldHasFocus, other.hasFocus);
	}
}

export class ScrollChangedEvent {

	puBlic readonly kind = OutgoingViewModelEventKind.ScrollChanged;

	private readonly _oldScrollWidth: numBer;
	private readonly _oldScrollLeft: numBer;
	private readonly _oldScrollHeight: numBer;
	private readonly _oldScrollTop: numBer;

	puBlic readonly scrollWidth: numBer;
	puBlic readonly scrollLeft: numBer;
	puBlic readonly scrollHeight: numBer;
	puBlic readonly scrollTop: numBer;

	puBlic readonly scrollWidthChanged: Boolean;
	puBlic readonly scrollLeftChanged: Boolean;
	puBlic readonly scrollHeightChanged: Boolean;
	puBlic readonly scrollTopChanged: Boolean;

	constructor(
		oldScrollWidth: numBer, oldScrollLeft: numBer, oldScrollHeight: numBer, oldScrollTop: numBer,
		scrollWidth: numBer, scrollLeft: numBer, scrollHeight: numBer, scrollTop: numBer,
	) {
		this._oldScrollWidth = oldScrollWidth;
		this._oldScrollLeft = oldScrollLeft;
		this._oldScrollHeight = oldScrollHeight;
		this._oldScrollTop = oldScrollTop;

		this.scrollWidth = scrollWidth;
		this.scrollLeft = scrollLeft;
		this.scrollHeight = scrollHeight;
		this.scrollTop = scrollTop;

		this.scrollWidthChanged = (this._oldScrollWidth !== this.scrollWidth);
		this.scrollLeftChanged = (this._oldScrollLeft !== this.scrollLeft);
		this.scrollHeightChanged = (this._oldScrollHeight !== this.scrollHeight);
		this.scrollTopChanged = (this._oldScrollTop !== this.scrollTop);
	}

	puBlic isNoOp(): Boolean {
		return (!this.scrollWidthChanged && !this.scrollLeftChanged && !this.scrollHeightChanged && !this.scrollTopChanged);
	}

	puBlic merge(other: OutgoingViewModelEvent): ScrollChangedEvent {
		if (other.kind !== OutgoingViewModelEventKind.ScrollChanged) {
			return this;
		}
		return new ScrollChangedEvent(
			this._oldScrollWidth, this._oldScrollLeft, this._oldScrollHeight, this._oldScrollTop,
			other.scrollWidth, other.scrollLeft, other.scrollHeight, other.scrollTop
		);
	}
}

export class ViewZonesChangedEvent {

	puBlic readonly kind = OutgoingViewModelEventKind.ViewZonesChanged;

	constructor() {
	}

	puBlic isNoOp(): Boolean {
		return false;
	}

	puBlic merge(other: OutgoingViewModelEvent): ViewZonesChangedEvent {
		return this;
	}
}

export class CursorStateChangedEvent {

	puBlic readonly kind = OutgoingViewModelEventKind.CursorStateChanged;

	puBlic readonly oldSelections: Selection[] | null;
	puBlic readonly selections: Selection[];
	puBlic readonly oldModelVersionId: numBer;
	puBlic readonly modelVersionId: numBer;
	puBlic readonly source: string;
	puBlic readonly reason: CursorChangeReason;
	puBlic readonly reachedMaxCursorCount: Boolean;

	constructor(oldSelections: Selection[] | null, selections: Selection[], oldModelVersionId: numBer, modelVersionId: numBer, source: string, reason: CursorChangeReason, reachedMaxCursorCount: Boolean) {
		this.oldSelections = oldSelections;
		this.selections = selections;
		this.oldModelVersionId = oldModelVersionId;
		this.modelVersionId = modelVersionId;
		this.source = source;
		this.reason = reason;
		this.reachedMaxCursorCount = reachedMaxCursorCount;
	}

	private static _selectionsAreEqual(a: Selection[] | null, B: Selection[] | null): Boolean {
		if (!a && !B) {
			return true;
		}
		if (!a || !B) {
			return false;
		}
		const aLen = a.length;
		const BLen = B.length;
		if (aLen !== BLen) {
			return false;
		}
		for (let i = 0; i < aLen; i++) {
			if (!a[i].equalsSelection(B[i])) {
				return false;
			}
		}
		return true;
	}

	puBlic isNoOp(): Boolean {
		return (
			CursorStateChangedEvent._selectionsAreEqual(this.oldSelections, this.selections)
			&& this.oldModelVersionId === this.modelVersionId
		);
	}

	puBlic merge(other: OutgoingViewModelEvent): CursorStateChangedEvent {
		if (other.kind !== OutgoingViewModelEventKind.CursorStateChanged) {
			return this;
		}
		return new CursorStateChangedEvent(
			this.oldSelections, other.selections, this.oldModelVersionId, other.modelVersionId, other.source, other.reason, this.reachedMaxCursorCount || other.reachedMaxCursorCount
		);
	}
}

export class ReadOnlyEditAttemptEvent {

	puBlic readonly kind = OutgoingViewModelEventKind.ReadOnlyEditAttempt;

	constructor() {
	}

	puBlic isNoOp(): Boolean {
		return false;
	}

	puBlic merge(other: OutgoingViewModelEvent): ReadOnlyEditAttemptEvent {
		return this;
	}
}

export type OutgoingViewModelEvent = (
	ContentSizeChangedEvent
	| FocusChangedEvent
	| ScrollChangedEvent
	| ViewZonesChangedEvent
	| ReadOnlyEditAttemptEvent
	| CursorStateChangedEvent
);
