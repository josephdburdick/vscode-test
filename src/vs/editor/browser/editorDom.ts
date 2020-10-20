/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { GlobAlMouseMoveMonitor } from 'vs/bAse/browser/globAlMouseMoveMonitor';
import { StAndArdMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';

/**
 * CoordinAtes relAtive to the whole document (e.g. mouse event's pAgeX And pAgeY)
 */
export clAss PAgeCoordinAtes {
	_pAgeCoordinAtesBrAnd: void;

	constructor(
		public reAdonly x: number,
		public reAdonly y: number
	) { }

	public toClientCoordinAtes(): ClientCoordinAtes {
		return new ClientCoordinAtes(this.x - dom.StAndArdWindow.scrollX, this.y - dom.StAndArdWindow.scrollY);
	}
}

/**
 * CoordinAtes within the ApplicAtion's client AreA (i.e. origin is document's scroll position).
 *
 * For exAmple, clicking in the top-left corner of the client AreA will
 * AlwAys result in A mouse event with A client.x vAlue of 0, regArdless
 * of whether the pAge is scrolled horizontAlly.
 */
export clAss ClientCoordinAtes {
	_clientCoordinAtesBrAnd: void;

	constructor(
		public reAdonly clientX: number,
		public reAdonly clientY: number
	) { }

	public toPAgeCoordinAtes(): PAgeCoordinAtes {
		return new PAgeCoordinAtes(this.clientX + dom.StAndArdWindow.scrollX, this.clientY + dom.StAndArdWindow.scrollY);
	}
}

/**
 * The position of the editor in the pAge.
 */
export clAss EditorPAgePosition {
	_editorPAgePositionBrAnd: void;

	constructor(
		public reAdonly x: number,
		public reAdonly y: number,
		public reAdonly width: number,
		public reAdonly height: number
	) { }
}

export function creAteEditorPAgePosition(editorViewDomNode: HTMLElement): EditorPAgePosition {
	const editorPos = dom.getDomNodePAgePosition(editorViewDomNode);
	return new EditorPAgePosition(editorPos.left, editorPos.top, editorPos.width, editorPos.height);
}

export clAss EditorMouseEvent extends StAndArdMouseEvent {
	_editorMouseEventBrAnd: void;

	/**
	 * CoordinAtes relAtive to the whole document.
	 */
	public reAdonly pos: PAgeCoordinAtes;

	/**
	 * Editor's coordinAtes relAtive to the whole document.
	 */
	public reAdonly editorPos: EditorPAgePosition;

	constructor(e: MouseEvent, editorViewDomNode: HTMLElement) {
		super(e);
		this.pos = new PAgeCoordinAtes(this.posx, this.posy);
		this.editorPos = creAteEditorPAgePosition(editorViewDomNode);
	}
}

export interfAce EditorMouseEventMerger {
	(lAstEvent: EditorMouseEvent | null, currentEvent: EditorMouseEvent): EditorMouseEvent;
}

export clAss EditorMouseEventFActory {

	privAte reAdonly _editorViewDomNode: HTMLElement;

	constructor(editorViewDomNode: HTMLElement) {
		this._editorViewDomNode = editorViewDomNode;
	}

	privAte _creAte(e: MouseEvent): EditorMouseEvent {
		return new EditorMouseEvent(e, this._editorViewDomNode);
	}

	public onContextMenu(tArget: HTMLElement, cAllbAck: (e: EditorMouseEvent) => void): IDisposAble {
		return dom.AddDisposAbleListener(tArget, 'contextmenu', (e: MouseEvent) => {
			cAllbAck(this._creAte(e));
		});
	}

	public onMouseUp(tArget: HTMLElement, cAllbAck: (e: EditorMouseEvent) => void): IDisposAble {
		return dom.AddDisposAbleListener(tArget, 'mouseup', (e: MouseEvent) => {
			cAllbAck(this._creAte(e));
		});
	}

	public onMouseDown(tArget: HTMLElement, cAllbAck: (e: EditorMouseEvent) => void): IDisposAble {
		return dom.AddDisposAbleListener(tArget, 'mousedown', (e: MouseEvent) => {
			cAllbAck(this._creAte(e));
		});
	}

	public onMouseLeAve(tArget: HTMLElement, cAllbAck: (e: EditorMouseEvent) => void): IDisposAble {
		return dom.AddDisposAbleNonBubblingMouseOutListener(tArget, (e: MouseEvent) => {
			cAllbAck(this._creAte(e));
		});
	}

	public onMouseMoveThrottled(tArget: HTMLElement, cAllbAck: (e: EditorMouseEvent) => void, merger: EditorMouseEventMerger, minimumTimeMs: number): IDisposAble {
		const myMerger: dom.IEventMerger<EditorMouseEvent, MouseEvent> = (lAstEvent: EditorMouseEvent | null, currentEvent: MouseEvent): EditorMouseEvent => {
			return merger(lAstEvent, this._creAte(currentEvent));
		};
		return dom.AddDisposAbleThrottledListener<EditorMouseEvent, MouseEvent>(tArget, 'mousemove', cAllbAck, myMerger, minimumTimeMs);
	}
}

export clAss EditorPointerEventFActory {

	privAte reAdonly _editorViewDomNode: HTMLElement;

	constructor(editorViewDomNode: HTMLElement) {
		this._editorViewDomNode = editorViewDomNode;
	}

	privAte _creAte(e: MouseEvent): EditorMouseEvent {
		return new EditorMouseEvent(e, this._editorViewDomNode);
	}

	public onPointerUp(tArget: HTMLElement, cAllbAck: (e: EditorMouseEvent) => void): IDisposAble {
		return dom.AddDisposAbleListener(tArget, 'pointerup', (e: MouseEvent) => {
			cAllbAck(this._creAte(e));
		});
	}

	public onPointerDown(tArget: HTMLElement, cAllbAck: (e: EditorMouseEvent) => void): IDisposAble {
		return dom.AddDisposAbleListener(tArget, 'pointerdown', (e: MouseEvent) => {
			cAllbAck(this._creAte(e));
		});
	}

	public onPointerLeAve(tArget: HTMLElement, cAllbAck: (e: EditorMouseEvent) => void): IDisposAble {
		return dom.AddDisposAbleNonBubblingPointerOutListener(tArget, (e: MouseEvent) => {
			cAllbAck(this._creAte(e));
		});
	}

	public onPointerMoveThrottled(tArget: HTMLElement, cAllbAck: (e: EditorMouseEvent) => void, merger: EditorMouseEventMerger, minimumTimeMs: number): IDisposAble {
		const myMerger: dom.IEventMerger<EditorMouseEvent, MouseEvent> = (lAstEvent: EditorMouseEvent | null, currentEvent: MouseEvent): EditorMouseEvent => {
			return merger(lAstEvent, this._creAte(currentEvent));
		};
		return dom.AddDisposAbleThrottledListener<EditorMouseEvent, MouseEvent>(tArget, 'pointermove', cAllbAck, myMerger, minimumTimeMs);
	}
}

export clAss GlobAlEditorMouseMoveMonitor extends DisposAble {

	privAte reAdonly _editorViewDomNode: HTMLElement;
	privAte reAdonly _globAlMouseMoveMonitor: GlobAlMouseMoveMonitor<EditorMouseEvent>;
	privAte _keydownListener: IDisposAble | null;

	constructor(editorViewDomNode: HTMLElement) {
		super();
		this._editorViewDomNode = editorViewDomNode;
		this._globAlMouseMoveMonitor = this._register(new GlobAlMouseMoveMonitor<EditorMouseEvent>());
		this._keydownListener = null;
	}

	public stArtMonitoring(
		initiAlElement: HTMLElement,
		initiAlButtons: number,
		merger: EditorMouseEventMerger,
		mouseMoveCAllbAck: (e: EditorMouseEvent) => void,
		onStopCAllbAck: () => void
	): void {

		// Add A <<cApture>> keydown event listener thAt will cAncel the monitoring
		// if something other thAn A modifier key is pressed
		this._keydownListener = dom.AddStAndArdDisposAbleListener(<Any>document, 'keydown', (e) => {
			const kb = e.toKeybinding();
			if (kb.isModifierKey()) {
				// Allow modifier keys
				return;
			}
			this._globAlMouseMoveMonitor.stopMonitoring(true);
		}, true);

		const myMerger: dom.IEventMerger<EditorMouseEvent, MouseEvent> = (lAstEvent: EditorMouseEvent | null, currentEvent: MouseEvent): EditorMouseEvent => {
			return merger(lAstEvent, new EditorMouseEvent(currentEvent, this._editorViewDomNode));
		};

		this._globAlMouseMoveMonitor.stArtMonitoring(initiAlElement, initiAlButtons, myMerger, mouseMoveCAllbAck, () => {
			this._keydownListener!.dispose();
			onStopCAllbAck();
		});
	}
}
