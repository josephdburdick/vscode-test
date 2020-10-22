/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import { GloBalMouseMoveMonitor } from 'vs/Base/Browser/gloBalMouseMoveMonitor';
import { StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';

/**
 * Coordinates relative to the whole document (e.g. mouse event's pageX and pageY)
 */
export class PageCoordinates {
	_pageCoordinatesBrand: void;

	constructor(
		puBlic readonly x: numBer,
		puBlic readonly y: numBer
	) { }

	puBlic toClientCoordinates(): ClientCoordinates {
		return new ClientCoordinates(this.x - dom.StandardWindow.scrollX, this.y - dom.StandardWindow.scrollY);
	}
}

/**
 * Coordinates within the application's client area (i.e. origin is document's scroll position).
 *
 * For example, clicking in the top-left corner of the client area will
 * always result in a mouse event with a client.x value of 0, regardless
 * of whether the page is scrolled horizontally.
 */
export class ClientCoordinates {
	_clientCoordinatesBrand: void;

	constructor(
		puBlic readonly clientX: numBer,
		puBlic readonly clientY: numBer
	) { }

	puBlic toPageCoordinates(): PageCoordinates {
		return new PageCoordinates(this.clientX + dom.StandardWindow.scrollX, this.clientY + dom.StandardWindow.scrollY);
	}
}

/**
 * The position of the editor in the page.
 */
export class EditorPagePosition {
	_editorPagePositionBrand: void;

	constructor(
		puBlic readonly x: numBer,
		puBlic readonly y: numBer,
		puBlic readonly width: numBer,
		puBlic readonly height: numBer
	) { }
}

export function createEditorPagePosition(editorViewDomNode: HTMLElement): EditorPagePosition {
	const editorPos = dom.getDomNodePagePosition(editorViewDomNode);
	return new EditorPagePosition(editorPos.left, editorPos.top, editorPos.width, editorPos.height);
}

export class EditorMouseEvent extends StandardMouseEvent {
	_editorMouseEventBrand: void;

	/**
	 * Coordinates relative to the whole document.
	 */
	puBlic readonly pos: PageCoordinates;

	/**
	 * Editor's coordinates relative to the whole document.
	 */
	puBlic readonly editorPos: EditorPagePosition;

	constructor(e: MouseEvent, editorViewDomNode: HTMLElement) {
		super(e);
		this.pos = new PageCoordinates(this.posx, this.posy);
		this.editorPos = createEditorPagePosition(editorViewDomNode);
	}
}

export interface EditorMouseEventMerger {
	(lastEvent: EditorMouseEvent | null, currentEvent: EditorMouseEvent): EditorMouseEvent;
}

export class EditorMouseEventFactory {

	private readonly _editorViewDomNode: HTMLElement;

	constructor(editorViewDomNode: HTMLElement) {
		this._editorViewDomNode = editorViewDomNode;
	}

	private _create(e: MouseEvent): EditorMouseEvent {
		return new EditorMouseEvent(e, this._editorViewDomNode);
	}

	puBlic onContextMenu(target: HTMLElement, callBack: (e: EditorMouseEvent) => void): IDisposaBle {
		return dom.addDisposaBleListener(target, 'contextmenu', (e: MouseEvent) => {
			callBack(this._create(e));
		});
	}

	puBlic onMouseUp(target: HTMLElement, callBack: (e: EditorMouseEvent) => void): IDisposaBle {
		return dom.addDisposaBleListener(target, 'mouseup', (e: MouseEvent) => {
			callBack(this._create(e));
		});
	}

	puBlic onMouseDown(target: HTMLElement, callBack: (e: EditorMouseEvent) => void): IDisposaBle {
		return dom.addDisposaBleListener(target, 'mousedown', (e: MouseEvent) => {
			callBack(this._create(e));
		});
	}

	puBlic onMouseLeave(target: HTMLElement, callBack: (e: EditorMouseEvent) => void): IDisposaBle {
		return dom.addDisposaBleNonBuBBlingMouseOutListener(target, (e: MouseEvent) => {
			callBack(this._create(e));
		});
	}

	puBlic onMouseMoveThrottled(target: HTMLElement, callBack: (e: EditorMouseEvent) => void, merger: EditorMouseEventMerger, minimumTimeMs: numBer): IDisposaBle {
		const myMerger: dom.IEventMerger<EditorMouseEvent, MouseEvent> = (lastEvent: EditorMouseEvent | null, currentEvent: MouseEvent): EditorMouseEvent => {
			return merger(lastEvent, this._create(currentEvent));
		};
		return dom.addDisposaBleThrottledListener<EditorMouseEvent, MouseEvent>(target, 'mousemove', callBack, myMerger, minimumTimeMs);
	}
}

export class EditorPointerEventFactory {

	private readonly _editorViewDomNode: HTMLElement;

	constructor(editorViewDomNode: HTMLElement) {
		this._editorViewDomNode = editorViewDomNode;
	}

	private _create(e: MouseEvent): EditorMouseEvent {
		return new EditorMouseEvent(e, this._editorViewDomNode);
	}

	puBlic onPointerUp(target: HTMLElement, callBack: (e: EditorMouseEvent) => void): IDisposaBle {
		return dom.addDisposaBleListener(target, 'pointerup', (e: MouseEvent) => {
			callBack(this._create(e));
		});
	}

	puBlic onPointerDown(target: HTMLElement, callBack: (e: EditorMouseEvent) => void): IDisposaBle {
		return dom.addDisposaBleListener(target, 'pointerdown', (e: MouseEvent) => {
			callBack(this._create(e));
		});
	}

	puBlic onPointerLeave(target: HTMLElement, callBack: (e: EditorMouseEvent) => void): IDisposaBle {
		return dom.addDisposaBleNonBuBBlingPointerOutListener(target, (e: MouseEvent) => {
			callBack(this._create(e));
		});
	}

	puBlic onPointerMoveThrottled(target: HTMLElement, callBack: (e: EditorMouseEvent) => void, merger: EditorMouseEventMerger, minimumTimeMs: numBer): IDisposaBle {
		const myMerger: dom.IEventMerger<EditorMouseEvent, MouseEvent> = (lastEvent: EditorMouseEvent | null, currentEvent: MouseEvent): EditorMouseEvent => {
			return merger(lastEvent, this._create(currentEvent));
		};
		return dom.addDisposaBleThrottledListener<EditorMouseEvent, MouseEvent>(target, 'pointermove', callBack, myMerger, minimumTimeMs);
	}
}

export class GloBalEditorMouseMoveMonitor extends DisposaBle {

	private readonly _editorViewDomNode: HTMLElement;
	private readonly _gloBalMouseMoveMonitor: GloBalMouseMoveMonitor<EditorMouseEvent>;
	private _keydownListener: IDisposaBle | null;

	constructor(editorViewDomNode: HTMLElement) {
		super();
		this._editorViewDomNode = editorViewDomNode;
		this._gloBalMouseMoveMonitor = this._register(new GloBalMouseMoveMonitor<EditorMouseEvent>());
		this._keydownListener = null;
	}

	puBlic startMonitoring(
		initialElement: HTMLElement,
		initialButtons: numBer,
		merger: EditorMouseEventMerger,
		mouseMoveCallBack: (e: EditorMouseEvent) => void,
		onStopCallBack: () => void
	): void {

		// Add a <<capture>> keydown event listener that will cancel the monitoring
		// if something other than a modifier key is pressed
		this._keydownListener = dom.addStandardDisposaBleListener(<any>document, 'keydown', (e) => {
			const kB = e.toKeyBinding();
			if (kB.isModifierKey()) {
				// Allow modifier keys
				return;
			}
			this._gloBalMouseMoveMonitor.stopMonitoring(true);
		}, true);

		const myMerger: dom.IEventMerger<EditorMouseEvent, MouseEvent> = (lastEvent: EditorMouseEvent | null, currentEvent: MouseEvent): EditorMouseEvent => {
			return merger(lastEvent, new EditorMouseEvent(currentEvent, this._editorViewDomNode));
		};

		this._gloBalMouseMoveMonitor.startMonitoring(initialElement, initialButtons, myMerger, mouseMoveCallBack, () => {
			this._keydownListener!.dispose();
			onStopCallBack();
		});
	}
}
