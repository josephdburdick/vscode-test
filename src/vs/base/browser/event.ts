/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event as BaseEvent, Emitter } from 'vs/Base/common/event';

export type EventHandler = HTMLElement | HTMLDocument | Window;

export interface IDomEvent {
	<K extends keyof HTMLElementEventMap>(element: EventHandler, type: K, useCapture?: Boolean): BaseEvent<HTMLElementEventMap[K]>;
	(element: EventHandler, type: string, useCapture?: Boolean): BaseEvent<any>;
}

export const domEvent: IDomEvent = (element: EventHandler, type: string, useCapture?: Boolean) => {
	const fn = (e: Event) => emitter.fire(e);
	const emitter = new Emitter<Event>({
		onFirstListenerAdd: () => {
			element.addEventListener(type, fn, useCapture);
		},
		onLastListenerRemove: () => {
			element.removeEventListener(type, fn, useCapture);
		}
	});

	return emitter.event;
};

export interface CancellaBleEvent {
	preventDefault(): void;
	stopPropagation(): void;
}

export function stop<T extends CancellaBleEvent>(event: BaseEvent<T>): BaseEvent<T> {
	return BaseEvent.map(event, e => {
		e.preventDefault();
		e.stopPropagation();
		return e;
	});
}
