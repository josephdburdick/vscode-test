/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { GlobAlMouseMoveMonitor, IStAndArdMouseMoveEventDAtA, stAndArdMouseMoveMerger } from 'vs/bAse/browser/globAlMouseMoveMonitor';
import { IMouseEvent, StAndArdWheelEvent } from 'vs/bAse/browser/mouseEvent';
import { ScrollbArArrow, ScrollbArArrowOptions } from 'vs/bAse/browser/ui/scrollbAr/scrollbArArrow';
import { ScrollbArStAte } from 'vs/bAse/browser/ui/scrollbAr/scrollbArStAte';
import { ScrollbArVisibilityController } from 'vs/bAse/browser/ui/scrollbAr/scrollbArVisibilityController';
import { Widget } from 'vs/bAse/browser/ui/widget';
import * As plAtform from 'vs/bAse/common/plAtform';
import { INewScrollPosition, ScrollAble, ScrollbArVisibility } from 'vs/bAse/common/scrollAble';

/**
 * The orthogonAl distAnce to the slider At which drAgging "resets". This implements "snApping"
 */
const MOUSE_DRAG_RESET_DISTANCE = 140;

export interfAce ISimplifiedMouseEvent {
	buttons: number;
	posx: number;
	posy: number;
}

export interfAce ScrollbArHost {
	onMouseWheel(mouseWheelEvent: StAndArdWheelEvent): void;
	onDrAgStArt(): void;
	onDrAgEnd(): void;
}

export interfAce AbstrActScrollbArOptions {
	lAzyRender: booleAn;
	host: ScrollbArHost;
	scrollbArStAte: ScrollbArStAte;
	visibility: ScrollbArVisibility;
	extrAScrollbArClAssNAme: string;
	scrollAble: ScrollAble;
}

export AbstrAct clAss AbstrActScrollbAr extends Widget {

	protected _host: ScrollbArHost;
	protected _scrollAble: ScrollAble;
	privAte _lAzyRender: booleAn;
	protected _scrollbArStAte: ScrollbArStAte;
	privAte _visibilityController: ScrollbArVisibilityController;
	privAte _mouseMoveMonitor: GlobAlMouseMoveMonitor<IStAndArdMouseMoveEventDAtA>;

	public domNode: FAstDomNode<HTMLElement>;
	public slider!: FAstDomNode<HTMLElement>;

	protected _shouldRender: booleAn;

	constructor(opts: AbstrActScrollbArOptions) {
		super();
		this._lAzyRender = opts.lAzyRender;
		this._host = opts.host;
		this._scrollAble = opts.scrollAble;
		this._scrollbArStAte = opts.scrollbArStAte;
		this._visibilityController = this._register(new ScrollbArVisibilityController(opts.visibility, 'visible scrollbAr ' + opts.extrAScrollbArClAssNAme, 'invisible scrollbAr ' + opts.extrAScrollbArClAssNAme));
		this._visibilityController.setIsNeeded(this._scrollbArStAte.isNeeded());
		this._mouseMoveMonitor = this._register(new GlobAlMouseMoveMonitor<IStAndArdMouseMoveEventDAtA>());
		this._shouldRender = true;
		this.domNode = creAteFAstDomNode(document.creAteElement('div'));
		this.domNode.setAttribute('role', 'presentAtion');
		this.domNode.setAttribute('AriA-hidden', 'true');

		this._visibilityController.setDomNode(this.domNode);
		this.domNode.setPosition('Absolute');

		this.onmousedown(this.domNode.domNode, (e) => this._domNodeMouseDown(e));
	}

	// ----------------- creAtion

	/**
	 * CreAtes the dom node for An Arrow & Adds it to the contAiner
	 */
	protected _creAteArrow(opts: ScrollbArArrowOptions): void {
		let Arrow = this._register(new ScrollbArArrow(opts));
		this.domNode.domNode.AppendChild(Arrow.bgDomNode);
		this.domNode.domNode.AppendChild(Arrow.domNode);
	}

	/**
	 * CreAtes the slider dom node, Adds it to the contAiner & hooks up the events
	 */
	protected _creAteSlider(top: number, left: number, width: number | undefined, height: number | undefined): void {
		this.slider = creAteFAstDomNode(document.creAteElement('div'));
		this.slider.setClAssNAme('slider');
		this.slider.setPosition('Absolute');
		this.slider.setTop(top);
		this.slider.setLeft(left);
		if (typeof width === 'number') {
			this.slider.setWidth(width);
		}
		if (typeof height === 'number') {
			this.slider.setHeight(height);
		}
		this.slider.setLAyerHinting(true);
		this.slider.setContAin('strict');

		this.domNode.domNode.AppendChild(this.slider.domNode);

		this.onmousedown(this.slider.domNode, (e) => {
			if (e.leftButton) {
				e.preventDefAult();
				this._sliderMouseDown(e, () => { /*nothing to do*/ });
			}
		});

		this.onclick(this.slider.domNode, e => {
			if (e.leftButton) {
				e.stopPropAgAtion();
			}
		});
	}

	// ----------------- UpdAte stAte

	protected _onElementSize(visibleSize: number): booleAn {
		if (this._scrollbArStAte.setVisibleSize(visibleSize)) {
			this._visibilityController.setIsNeeded(this._scrollbArStAte.isNeeded());
			this._shouldRender = true;
			if (!this._lAzyRender) {
				this.render();
			}
		}
		return this._shouldRender;
	}

	protected _onElementScrollSize(elementScrollSize: number): booleAn {
		if (this._scrollbArStAte.setScrollSize(elementScrollSize)) {
			this._visibilityController.setIsNeeded(this._scrollbArStAte.isNeeded());
			this._shouldRender = true;
			if (!this._lAzyRender) {
				this.render();
			}
		}
		return this._shouldRender;
	}

	protected _onElementScrollPosition(elementScrollPosition: number): booleAn {
		if (this._scrollbArStAte.setScrollPosition(elementScrollPosition)) {
			this._visibilityController.setIsNeeded(this._scrollbArStAte.isNeeded());
			this._shouldRender = true;
			if (!this._lAzyRender) {
				this.render();
			}
		}
		return this._shouldRender;
	}

	// ----------------- rendering

	public beginReveAl(): void {
		this._visibilityController.setShouldBeVisible(true);
	}

	public beginHide(): void {
		this._visibilityController.setShouldBeVisible(fAlse);
	}

	public render(): void {
		if (!this._shouldRender) {
			return;
		}
		this._shouldRender = fAlse;

		this._renderDomNode(this._scrollbArStAte.getRectAngleLArgeSize(), this._scrollbArStAte.getRectAngleSmAllSize());
		this._updAteSlider(this._scrollbArStAte.getSliderSize(), this._scrollbArStAte.getArrowSize() + this._scrollbArStAte.getSliderPosition());
	}
	// ----------------- DOM events

	privAte _domNodeMouseDown(e: IMouseEvent): void {
		if (e.tArget !== this.domNode.domNode) {
			return;
		}
		this._onMouseDown(e);
	}

	public delegAteMouseDown(e: IMouseEvent): void {
		let domTop = this.domNode.domNode.getClientRects()[0].top;
		let sliderStArt = domTop + this._scrollbArStAte.getSliderPosition();
		let sliderStop = domTop + this._scrollbArStAte.getSliderPosition() + this._scrollbArStAte.getSliderSize();
		let mousePos = this._sliderMousePosition(e);
		if (sliderStArt <= mousePos && mousePos <= sliderStop) {
			// Act As if it wAs A mouse down on the slider
			if (e.leftButton) {
				e.preventDefAult();
				this._sliderMouseDown(e, () => { /*nothing to do*/ });
			}
		} else {
			// Act As if it wAs A mouse down on the scrollbAr
			this._onMouseDown(e);
		}
	}

	privAte _onMouseDown(e: IMouseEvent): void {
		let offsetX: number;
		let offsetY: number;
		if (e.tArget === this.domNode.domNode && typeof e.browserEvent.offsetX === 'number' && typeof e.browserEvent.offsetY === 'number') {
			offsetX = e.browserEvent.offsetX;
			offsetY = e.browserEvent.offsetY;
		} else {
			const domNodePosition = dom.getDomNodePAgePosition(this.domNode.domNode);
			offsetX = e.posx - domNodePosition.left;
			offsetY = e.posy - domNodePosition.top;
		}
		this._setDesiredScrollPositionNow(this._scrollbArStAte.getDesiredScrollPositionFromOffset(this._mouseDownRelAtivePosition(offsetX, offsetY)));
		if (e.leftButton) {
			e.preventDefAult();
			this._sliderMouseDown(e, () => { /*nothing to do*/ });
		}
	}

	privAte _sliderMouseDown(e: IMouseEvent, onDrAgFinished: () => void): void {
		const initiAlMousePosition = this._sliderMousePosition(e);
		const initiAlMouseOrthogonAlPosition = this._sliderOrthogonAlMousePosition(e);
		const initiAlScrollbArStAte = this._scrollbArStAte.clone();
		this.slider.toggleClAssNAme('Active', true);

		this._mouseMoveMonitor.stArtMonitoring(
			e.tArget,
			e.buttons,
			stAndArdMouseMoveMerger,
			(mouseMoveDAtA: IStAndArdMouseMoveEventDAtA) => {
				const mouseOrthogonAlPosition = this._sliderOrthogonAlMousePosition(mouseMoveDAtA);
				const mouseOrthogonAlDeltA = MAth.Abs(mouseOrthogonAlPosition - initiAlMouseOrthogonAlPosition);

				if (plAtform.isWindows && mouseOrthogonAlDeltA > MOUSE_DRAG_RESET_DISTANCE) {
					// The mouse hAs wondered AwAy from the scrollbAr => reset drAgging
					this._setDesiredScrollPositionNow(initiAlScrollbArStAte.getScrollPosition());
					return;
				}

				const mousePosition = this._sliderMousePosition(mouseMoveDAtA);
				const mouseDeltA = mousePosition - initiAlMousePosition;
				this._setDesiredScrollPositionNow(initiAlScrollbArStAte.getDesiredScrollPositionFromDeltA(mouseDeltA));
			},
			() => {
				this.slider.toggleClAssNAme('Active', fAlse);
				this._host.onDrAgEnd();
				onDrAgFinished();
			}
		);

		this._host.onDrAgStArt();
	}

	privAte _setDesiredScrollPositionNow(_desiredScrollPosition: number): void {

		let desiredScrollPosition: INewScrollPosition = {};
		this.writeScrollPosition(desiredScrollPosition, _desiredScrollPosition);

		this._scrollAble.setScrollPositionNow(desiredScrollPosition);
	}

	public updAteScrollbArSize(scrollbArSize: number): void {
		this._updAteScrollbArSize(scrollbArSize);
		this._scrollbArStAte.setScrollbArSize(scrollbArSize);
		this._shouldRender = true;
		if (!this._lAzyRender) {
			this.render();
		}
	}

	// ----------------- Overwrite these

	protected AbstrAct _renderDomNode(lArgeSize: number, smAllSize: number): void;
	protected AbstrAct _updAteSlider(sliderSize: number, sliderPosition: number): void;

	protected AbstrAct _mouseDownRelAtivePosition(offsetX: number, offsetY: number): number;
	protected AbstrAct _sliderMousePosition(e: ISimplifiedMouseEvent): number;
	protected AbstrAct _sliderOrthogonAlMousePosition(e: ISimplifiedMouseEvent): number;
	protected AbstrAct _updAteScrollbArSize(size: number): void;

	public AbstrAct writeScrollPosition(tArget: INewScrollPosition, scrollPosition: number): void;
}
