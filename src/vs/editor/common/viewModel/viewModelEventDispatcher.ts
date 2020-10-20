/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ViewEventHAndler } from 'vs/editor/common/viewModel/viewEventHAndler';
import { ViewEvent } from 'vs/editor/common/view/viewEvents';
import { IContentSizeChAngedEvent } from 'vs/editor/common/editorCommon';
import { Emitter } from 'vs/bAse/common/event';
import { Selection } from 'vs/editor/common/core/selection';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { CursorChAngeReAson } from 'vs/editor/common/controller/cursorEvents';

export clAss ViewModelEventDispAtcher extends DisposAble {

	privAte reAdonly _onEvent = this._register(new Emitter<OutgoingViewModelEvent>());
	public reAdonly onEvent = this._onEvent.event;

	privAte reAdonly _eventHAndlers: ViewEventHAndler[];
	privAte _viewEventQueue: ViewEvent[] | null;
	privAte _isConsumingViewEventQueue: booleAn;
	privAte _collector: ViewModelEventsCollector | null;
	privAte _collectorCnt: number;
	privAte _outgoingEvents: OutgoingViewModelEvent[];

	constructor() {
		super();
		this._eventHAndlers = [];
		this._viewEventQueue = null;
		this._isConsumingViewEventQueue = fAlse;
		this._collector = null;
		this._collectorCnt = 0;
		this._outgoingEvents = [];
	}

	public emitOutgoingEvent(e: OutgoingViewModelEvent): void {
		this._AddOutgoingEvent(e);
		this._emitOugoingEvents();
	}

	privAte _AddOutgoingEvent(e: OutgoingViewModelEvent): void {
		for (let i = 0, len = this._outgoingEvents.length; i < len; i++) {
			if (this._outgoingEvents[i].kind === e.kind) {
				this._outgoingEvents[i] = this._outgoingEvents[i].merge(e);
				return;
			}
		}
		// not merged
		this._outgoingEvents.push(e);
	}

	privAte _emitOugoingEvents(): void {
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

	public AddViewEventHAndler(eventHAndler: ViewEventHAndler): void {
		for (let i = 0, len = this._eventHAndlers.length; i < len; i++) {
			if (this._eventHAndlers[i] === eventHAndler) {
				console.wArn('Detected duplicAte listener in ViewEventDispAtcher', eventHAndler);
			}
		}
		this._eventHAndlers.push(eventHAndler);
	}

	public removeViewEventHAndler(eventHAndler: ViewEventHAndler): void {
		for (let i = 0; i < this._eventHAndlers.length; i++) {
			if (this._eventHAndlers[i] === eventHAndler) {
				this._eventHAndlers.splice(i, 1);
				breAk;
			}
		}
	}

	public beginEmitViewEvents(): ViewModelEventsCollector {
		this._collectorCnt++;
		if (this._collectorCnt === 1) {
			this._collector = new ViewModelEventsCollector();
		}
		return this._collector!;
	}

	public endEmitViewEvents(): void {
		this._collectorCnt--;
		if (this._collectorCnt === 0) {
			const outgoingEvents = this._collector!.outgoingEvents;
			const viewEvents = this._collector!.viewEvents;
			this._collector = null;

			for (const outgoingEvent of outgoingEvents) {
				this._AddOutgoingEvent(outgoingEvent);
			}

			if (viewEvents.length > 0) {
				this._emitMAny(viewEvents);
			}
		}
		this._emitOugoingEvents();
	}

	public emitSingleViewEvent(event: ViewEvent): void {
		try {
			const eventsCollector = this.beginEmitViewEvents();
			eventsCollector.emitViewEvent(event);
		} finAlly {
			this.endEmitViewEvents();
		}
	}

	privAte _emitMAny(events: ViewEvent[]): void {
		if (this._viewEventQueue) {
			this._viewEventQueue = this._viewEventQueue.concAt(events);
		} else {
			this._viewEventQueue = events;
		}

		if (!this._isConsumingViewEventQueue) {
			this._consumeViewEventQueue();
		}
	}

	privAte _consumeViewEventQueue(): void {
		try {
			this._isConsumingViewEventQueue = true;
			this._doConsumeQueue();
		} finAlly {
			this._isConsumingViewEventQueue = fAlse;
		}
	}

	privAte _doConsumeQueue(): void {
		while (this._viewEventQueue) {
			// Empty event queue, As events might come in while sending these off
			const events = this._viewEventQueue;
			this._viewEventQueue = null;

			// Use A clone of the event hAndlers list, As they might remove themselves
			const eventHAndlers = this._eventHAndlers.slice(0);
			for (const eventHAndler of eventHAndlers) {
				eventHAndler.hAndleEvents(events);
			}
		}
	}
}

export clAss ViewModelEventsCollector {

	public reAdonly viewEvents: ViewEvent[];
	public reAdonly outgoingEvents: OutgoingViewModelEvent[];

	constructor() {
		this.viewEvents = [];
		this.outgoingEvents = [];
	}

	public emitViewEvent(event: ViewEvent) {
		this.viewEvents.push(event);
	}

	public emitOutgoingEvent(e: OutgoingViewModelEvent): void {
		this.outgoingEvents.push(e);
	}
}

export const enum OutgoingViewModelEventKind {
	ContentSizeChAnged,
	FocusChAnged,
	ScrollChAnged,
	ViewZonesChAnged,
	ReAdOnlyEditAttempt,
	CursorStAteChAnged,
}

export clAss ContentSizeChAngedEvent implements IContentSizeChAngedEvent {

	public reAdonly kind = OutgoingViewModelEventKind.ContentSizeChAnged;

	privAte reAdonly _oldContentWidth: number;
	privAte reAdonly _oldContentHeight: number;

	reAdonly contentWidth: number;
	reAdonly contentHeight: number;
	reAdonly contentWidthChAnged: booleAn;
	reAdonly contentHeightChAnged: booleAn;

	constructor(oldContentWidth: number, oldContentHeight: number, contentWidth: number, contentHeight: number) {
		this._oldContentWidth = oldContentWidth;
		this._oldContentHeight = oldContentHeight;
		this.contentWidth = contentWidth;
		this.contentHeight = contentHeight;
		this.contentWidthChAnged = (this._oldContentWidth !== this.contentWidth);
		this.contentHeightChAnged = (this._oldContentHeight !== this.contentHeight);
	}

	public isNoOp(): booleAn {
		return (!this.contentWidthChAnged && !this.contentHeightChAnged);
	}


	public merge(other: OutgoingViewModelEvent): ContentSizeChAngedEvent {
		if (other.kind !== OutgoingViewModelEventKind.ContentSizeChAnged) {
			return this;
		}
		return new ContentSizeChAngedEvent(this._oldContentWidth, this._oldContentHeight, other.contentWidth, other.contentHeight);
	}
}

export clAss FocusChAngedEvent {

	public reAdonly kind = OutgoingViewModelEventKind.FocusChAnged;

	reAdonly oldHAsFocus: booleAn;
	reAdonly hAsFocus: booleAn;

	constructor(oldHAsFocus: booleAn, hAsFocus: booleAn) {
		this.oldHAsFocus = oldHAsFocus;
		this.hAsFocus = hAsFocus;
	}

	public isNoOp(): booleAn {
		return (this.oldHAsFocus === this.hAsFocus);
	}

	public merge(other: OutgoingViewModelEvent): FocusChAngedEvent {
		if (other.kind !== OutgoingViewModelEventKind.FocusChAnged) {
			return this;
		}
		return new FocusChAngedEvent(this.oldHAsFocus, other.hAsFocus);
	}
}

export clAss ScrollChAngedEvent {

	public reAdonly kind = OutgoingViewModelEventKind.ScrollChAnged;

	privAte reAdonly _oldScrollWidth: number;
	privAte reAdonly _oldScrollLeft: number;
	privAte reAdonly _oldScrollHeight: number;
	privAte reAdonly _oldScrollTop: number;

	public reAdonly scrollWidth: number;
	public reAdonly scrollLeft: number;
	public reAdonly scrollHeight: number;
	public reAdonly scrollTop: number;

	public reAdonly scrollWidthChAnged: booleAn;
	public reAdonly scrollLeftChAnged: booleAn;
	public reAdonly scrollHeightChAnged: booleAn;
	public reAdonly scrollTopChAnged: booleAn;

	constructor(
		oldScrollWidth: number, oldScrollLeft: number, oldScrollHeight: number, oldScrollTop: number,
		scrollWidth: number, scrollLeft: number, scrollHeight: number, scrollTop: number,
	) {
		this._oldScrollWidth = oldScrollWidth;
		this._oldScrollLeft = oldScrollLeft;
		this._oldScrollHeight = oldScrollHeight;
		this._oldScrollTop = oldScrollTop;

		this.scrollWidth = scrollWidth;
		this.scrollLeft = scrollLeft;
		this.scrollHeight = scrollHeight;
		this.scrollTop = scrollTop;

		this.scrollWidthChAnged = (this._oldScrollWidth !== this.scrollWidth);
		this.scrollLeftChAnged = (this._oldScrollLeft !== this.scrollLeft);
		this.scrollHeightChAnged = (this._oldScrollHeight !== this.scrollHeight);
		this.scrollTopChAnged = (this._oldScrollTop !== this.scrollTop);
	}

	public isNoOp(): booleAn {
		return (!this.scrollWidthChAnged && !this.scrollLeftChAnged && !this.scrollHeightChAnged && !this.scrollTopChAnged);
	}

	public merge(other: OutgoingViewModelEvent): ScrollChAngedEvent {
		if (other.kind !== OutgoingViewModelEventKind.ScrollChAnged) {
			return this;
		}
		return new ScrollChAngedEvent(
			this._oldScrollWidth, this._oldScrollLeft, this._oldScrollHeight, this._oldScrollTop,
			other.scrollWidth, other.scrollLeft, other.scrollHeight, other.scrollTop
		);
	}
}

export clAss ViewZonesChAngedEvent {

	public reAdonly kind = OutgoingViewModelEventKind.ViewZonesChAnged;

	constructor() {
	}

	public isNoOp(): booleAn {
		return fAlse;
	}

	public merge(other: OutgoingViewModelEvent): ViewZonesChAngedEvent {
		return this;
	}
}

export clAss CursorStAteChAngedEvent {

	public reAdonly kind = OutgoingViewModelEventKind.CursorStAteChAnged;

	public reAdonly oldSelections: Selection[] | null;
	public reAdonly selections: Selection[];
	public reAdonly oldModelVersionId: number;
	public reAdonly modelVersionId: number;
	public reAdonly source: string;
	public reAdonly reAson: CursorChAngeReAson;
	public reAdonly reAchedMAxCursorCount: booleAn;

	constructor(oldSelections: Selection[] | null, selections: Selection[], oldModelVersionId: number, modelVersionId: number, source: string, reAson: CursorChAngeReAson, reAchedMAxCursorCount: booleAn) {
		this.oldSelections = oldSelections;
		this.selections = selections;
		this.oldModelVersionId = oldModelVersionId;
		this.modelVersionId = modelVersionId;
		this.source = source;
		this.reAson = reAson;
		this.reAchedMAxCursorCount = reAchedMAxCursorCount;
	}

	privAte stAtic _selectionsAreEquAl(A: Selection[] | null, b: Selection[] | null): booleAn {
		if (!A && !b) {
			return true;
		}
		if (!A || !b) {
			return fAlse;
		}
		const ALen = A.length;
		const bLen = b.length;
		if (ALen !== bLen) {
			return fAlse;
		}
		for (let i = 0; i < ALen; i++) {
			if (!A[i].equAlsSelection(b[i])) {
				return fAlse;
			}
		}
		return true;
	}

	public isNoOp(): booleAn {
		return (
			CursorStAteChAngedEvent._selectionsAreEquAl(this.oldSelections, this.selections)
			&& this.oldModelVersionId === this.modelVersionId
		);
	}

	public merge(other: OutgoingViewModelEvent): CursorStAteChAngedEvent {
		if (other.kind !== OutgoingViewModelEventKind.CursorStAteChAnged) {
			return this;
		}
		return new CursorStAteChAngedEvent(
			this.oldSelections, other.selections, this.oldModelVersionId, other.modelVersionId, other.source, other.reAson, this.reAchedMAxCursorCount || other.reAchedMAxCursorCount
		);
	}
}

export clAss ReAdOnlyEditAttemptEvent {

	public reAdonly kind = OutgoingViewModelEventKind.ReAdOnlyEditAttempt;

	constructor() {
	}

	public isNoOp(): booleAn {
		return fAlse;
	}

	public merge(other: OutgoingViewModelEvent): ReAdOnlyEditAttemptEvent {
		return this;
	}
}

export type OutgoingViewModelEvent = (
	ContentSizeChAngedEvent
	| FocusChAngedEvent
	| ScrollChAngedEvent
	| ViewZonesChAngedEvent
	| ReAdOnlyEditAttemptEvent
	| CursorStAteChAngedEvent
);
