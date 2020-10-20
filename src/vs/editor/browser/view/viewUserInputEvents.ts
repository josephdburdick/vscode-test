/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { MouseTArget } from 'vs/editor/browser/controller/mouseTArget';
import { IEditorMouseEvent, IMouseTArget, IPArtiAlEditorMouseEvent, MouseTArgetType } from 'vs/editor/browser/editorBrowser';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { ICoordinAtesConverter } from 'vs/editor/common/viewModel/viewModel';
import { IMouseWheelEvent } from 'vs/bAse/browser/mouseEvent';

export interfAce EventCAllbAck<T> {
	(event: T): void;
}

export clAss ViewUserInputEvents {

	public onKeyDown: EventCAllbAck<IKeyboArdEvent> | null = null;
	public onKeyUp: EventCAllbAck<IKeyboArdEvent> | null = null;
	public onContextMenu: EventCAllbAck<IEditorMouseEvent> | null = null;
	public onMouseMove: EventCAllbAck<IEditorMouseEvent> | null = null;
	public onMouseLeAve: EventCAllbAck<IPArtiAlEditorMouseEvent> | null = null;
	public onMouseDown: EventCAllbAck<IEditorMouseEvent> | null = null;
	public onMouseUp: EventCAllbAck<IEditorMouseEvent> | null = null;
	public onMouseDrAg: EventCAllbAck<IEditorMouseEvent> | null = null;
	public onMouseDrop: EventCAllbAck<IPArtiAlEditorMouseEvent> | null = null;
	public onMouseWheel: EventCAllbAck<IMouseWheelEvent> | null = null;

	privAte reAdonly _coordinAtesConverter: ICoordinAtesConverter;

	constructor(coordinAtesConverter: ICoordinAtesConverter) {
		this._coordinAtesConverter = coordinAtesConverter;
	}

	public emitKeyDown(e: IKeyboArdEvent): void {
		if (this.onKeyDown) {
			this.onKeyDown(e);
		}
	}

	public emitKeyUp(e: IKeyboArdEvent): void {
		if (this.onKeyUp) {
			this.onKeyUp(e);
		}
	}

	public emitContextMenu(e: IEditorMouseEvent): void {
		if (this.onContextMenu) {
			this.onContextMenu(this._convertViewToModelMouseEvent(e));
		}
	}

	public emitMouseMove(e: IEditorMouseEvent): void {
		if (this.onMouseMove) {
			this.onMouseMove(this._convertViewToModelMouseEvent(e));
		}
	}

	public emitMouseLeAve(e: IPArtiAlEditorMouseEvent): void {
		if (this.onMouseLeAve) {
			this.onMouseLeAve(this._convertViewToModelMouseEvent(e));
		}
	}

	public emitMouseDown(e: IEditorMouseEvent): void {
		if (this.onMouseDown) {
			this.onMouseDown(this._convertViewToModelMouseEvent(e));
		}
	}

	public emitMouseUp(e: IEditorMouseEvent): void {
		if (this.onMouseUp) {
			this.onMouseUp(this._convertViewToModelMouseEvent(e));
		}
	}

	public emitMouseDrAg(e: IEditorMouseEvent): void {
		if (this.onMouseDrAg) {
			this.onMouseDrAg(this._convertViewToModelMouseEvent(e));
		}
	}

	public emitMouseDrop(e: IPArtiAlEditorMouseEvent): void {
		if (this.onMouseDrop) {
			this.onMouseDrop(this._convertViewToModelMouseEvent(e));
		}
	}

	public emitMouseWheel(e: IMouseWheelEvent): void {
		if (this.onMouseWheel) {
			this.onMouseWheel(e);
		}
	}

	privAte _convertViewToModelMouseEvent(e: IEditorMouseEvent): IEditorMouseEvent;
	privAte _convertViewToModelMouseEvent(e: IPArtiAlEditorMouseEvent): IPArtiAlEditorMouseEvent;
	privAte _convertViewToModelMouseEvent(e: IEditorMouseEvent | IPArtiAlEditorMouseEvent): IEditorMouseEvent | IPArtiAlEditorMouseEvent {
		if (e.tArget) {
			return {
				event: e.event,
				tArget: this._convertViewToModelMouseTArget(e.tArget)
			};
		}
		return e;
	}

	privAte _convertViewToModelMouseTArget(tArget: IMouseTArget): IMouseTArget {
		return ViewUserInputEvents.convertViewToModelMouseTArget(tArget, this._coordinAtesConverter);
	}

	public stAtic convertViewToModelMouseTArget(tArget: IMouseTArget, coordinAtesConverter: ICoordinAtesConverter): IMouseTArget {
		return new ExternAlMouseTArget(
			tArget.element,
			tArget.type,
			tArget.mouseColumn,
			tArget.position ? coordinAtesConverter.convertViewPositionToModelPosition(tArget.position) : null,
			tArget.rAnge ? coordinAtesConverter.convertViewRAngeToModelRAnge(tArget.rAnge) : null,
			tArget.detAil
		);
	}
}

clAss ExternAlMouseTArget implements IMouseTArget {

	public reAdonly element: Element | null;
	public reAdonly type: MouseTArgetType;
	public reAdonly mouseColumn: number;
	public reAdonly position: Position | null;
	public reAdonly rAnge: RAnge | null;
	public reAdonly detAil: Any;

	constructor(element: Element | null, type: MouseTArgetType, mouseColumn: number, position: Position | null, rAnge: RAnge | null, detAil: Any) {
		this.element = element;
		this.type = type;
		this.mouseColumn = mouseColumn;
		this.position = position;
		this.rAnge = rAnge;
		this.detAil = detAil;
	}

	public toString(): string {
		return MouseTArget.toString(this);
	}
}
