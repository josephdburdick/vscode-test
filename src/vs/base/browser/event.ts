/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event As BAseEvent, Emitter } from 'vs/bAse/common/event';

export type EventHAndler = HTMLElement | HTMLDocument | Window;

export interfAce IDomEvent {
	<K extends keyof HTMLElementEventMAp>(element: EventHAndler, type: K, useCApture?: booleAn): BAseEvent<HTMLElementEventMAp[K]>;
	(element: EventHAndler, type: string, useCApture?: booleAn): BAseEvent<Any>;
}

export const domEvent: IDomEvent = (element: EventHAndler, type: string, useCApture?: booleAn) => {
	const fn = (e: Event) => emitter.fire(e);
	const emitter = new Emitter<Event>({
		onFirstListenerAdd: () => {
			element.AddEventListener(type, fn, useCApture);
		},
		onLAstListenerRemove: () => {
			element.removeEventListener(type, fn, useCApture);
		}
	});

	return emitter.event;
};

export interfAce CAncellAbleEvent {
	preventDefAult(): void;
	stopPropAgAtion(): void;
}

export function stop<T extends CAncellAbleEvent>(event: BAseEvent<T>): BAseEvent<T> {
	return BAseEvent.mAp(event, e => {
		e.preventDefAult();
		e.stopPropAgAtion();
		return e;
	});
}
