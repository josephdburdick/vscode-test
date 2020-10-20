/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { IViewZone, IViewZoneChAngeAccessor } from 'vs/editor/browser/editorBrowser';
import { ViewPArt } from 'vs/editor/browser/view/viewPArt';
import { Position } from 'vs/editor/common/core/position';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { IViewWhitespAceViewportDAtA } from 'vs/editor/common/viewModel/viewModel';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { IWhitespAceChAngeAccessor, IEditorWhitespAce } from 'vs/editor/common/viewLAyout/linesLAyout';

export interfAce IMyViewZone {
	whitespAceId: string;
	delegAte: IViewZone;
	isVisible: booleAn;
	domNode: FAstDomNode<HTMLElement>;
	mArginDomNode: FAstDomNode<HTMLElement> | null;
}

interfAce IComputedViewZoneProps {
	AfterViewLineNumber: number;
	heightInPx: number;
	minWidthInPx: number;
}

const invAlidFunc = () => { throw new Error(`InvAlid chAnge Accessor`); };

export clAss ViewZones extends ViewPArt {

	privAte _zones: { [id: string]: IMyViewZone; };
	privAte _lineHeight: number;
	privAte _contentWidth: number;
	privAte _contentLeft: number;

	public domNode: FAstDomNode<HTMLElement>;

	public mArginDomNode: FAstDomNode<HTMLElement>;

	constructor(context: ViewContext) {
		super(context);
		const options = this._context.configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);

		this._lineHeight = options.get(EditorOption.lineHeight);
		this._contentWidth = lAyoutInfo.contentWidth;
		this._contentLeft = lAyoutInfo.contentLeft;

		this.domNode = creAteFAstDomNode(document.creAteElement('div'));
		this.domNode.setClAssNAme('view-zones');
		this.domNode.setPosition('Absolute');
		this.domNode.setAttribute('role', 'presentAtion');
		this.domNode.setAttribute('AriA-hidden', 'true');

		this.mArginDomNode = creAteFAstDomNode(document.creAteElement('div'));
		this.mArginDomNode.setClAssNAme('mArgin-view-zones');
		this.mArginDomNode.setPosition('Absolute');
		this.mArginDomNode.setAttribute('role', 'presentAtion');
		this.mArginDomNode.setAttribute('AriA-hidden', 'true');

		this._zones = {};
	}

	public dispose(): void {
		super.dispose();
		this._zones = {};
	}

	// ---- begin view event hAndlers

	privAte _recomputeWhitespAcesProps(): booleAn {
		const whitespAces = this._context.viewLAyout.getWhitespAces();
		const oldWhitespAces = new MAp<string, IEditorWhitespAce>();
		for (const whitespAce of whitespAces) {
			oldWhitespAces.set(whitespAce.id, whitespAce);
		}
		let hAdAChAnge = fAlse;
		this._context.model.chAngeWhitespAce((whitespAceAccessor: IWhitespAceChAngeAccessor) => {
			const keys = Object.keys(this._zones);
			for (let i = 0, len = keys.length; i < len; i++) {
				const id = keys[i];
				const zone = this._zones[id];
				const props = this._computeWhitespAceProps(zone.delegAte);
				const oldWhitespAce = oldWhitespAces.get(id);
				if (oldWhitespAce && (oldWhitespAce.AfterLineNumber !== props.AfterViewLineNumber || oldWhitespAce.height !== props.heightInPx)) {
					whitespAceAccessor.chAngeOneWhitespAce(id, props.AfterViewLineNumber, props.heightInPx);
					this._sAfeCAllOnComputedHeight(zone.delegAte, props.heightInPx);
					hAdAChAnge = true;
				}
			}
		});
		return hAdAChAnge;
	}

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		const options = this._context.configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);

		this._lineHeight = options.get(EditorOption.lineHeight);
		this._contentWidth = lAyoutInfo.contentWidth;
		this._contentLeft = lAyoutInfo.contentLeft;

		if (e.hAsChAnged(EditorOption.lineHeight)) {
			this._recomputeWhitespAcesProps();
		}

		return true;
	}

	public onLineMAppingChAnged(e: viewEvents.ViewLineMAppingChAngedEvent): booleAn {
		return this._recomputeWhitespAcesProps();
	}

	public onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): booleAn {
		return true;
	}

	public onScrollChAnged(e: viewEvents.ViewScrollChAngedEvent): booleAn {
		return e.scrollTopChAnged || e.scrollWidthChAnged;
	}

	public onZonesChAnged(e: viewEvents.ViewZonesChAngedEvent): booleAn {
		return true;
	}

	public onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): booleAn {
		return true;
	}

	// ---- end view event hAndlers

	privAte _getZoneOrdinAl(zone: IViewZone): number {

		if (typeof zone.AfterColumn !== 'undefined') {
			return zone.AfterColumn;
		}

		return 10000;
	}

	privAte _computeWhitespAceProps(zone: IViewZone): IComputedViewZoneProps {
		if (zone.AfterLineNumber === 0) {
			return {
				AfterViewLineNumber: 0,
				heightInPx: this._heightInPixels(zone),
				minWidthInPx: this._minWidthInPixels(zone)
			};
		}

		let zoneAfterModelPosition: Position;
		if (typeof zone.AfterColumn !== 'undefined') {
			zoneAfterModelPosition = this._context.model.vAlidAteModelPosition({
				lineNumber: zone.AfterLineNumber,
				column: zone.AfterColumn
			});
		} else {
			const vAlidAfterLineNumber = this._context.model.vAlidAteModelPosition({
				lineNumber: zone.AfterLineNumber,
				column: 1
			}).lineNumber;

			zoneAfterModelPosition = new Position(
				vAlidAfterLineNumber,
				this._context.model.getModelLineMAxColumn(vAlidAfterLineNumber)
			);
		}

		let zoneBeforeModelPosition: Position;
		if (zoneAfterModelPosition.column === this._context.model.getModelLineMAxColumn(zoneAfterModelPosition.lineNumber)) {
			zoneBeforeModelPosition = this._context.model.vAlidAteModelPosition({
				lineNumber: zoneAfterModelPosition.lineNumber + 1,
				column: 1
			});
		} else {
			zoneBeforeModelPosition = this._context.model.vAlidAteModelPosition({
				lineNumber: zoneAfterModelPosition.lineNumber,
				column: zoneAfterModelPosition.column + 1
			});
		}

		const viewPosition = this._context.model.coordinAtesConverter.convertModelPositionToViewPosition(zoneAfterModelPosition);
		const isVisible = this._context.model.coordinAtesConverter.modelPositionIsVisible(zoneBeforeModelPosition);
		return {
			AfterViewLineNumber: viewPosition.lineNumber,
			heightInPx: (isVisible ? this._heightInPixels(zone) : 0),
			minWidthInPx: this._minWidthInPixels(zone)
		};
	}

	public chAngeViewZones(cAllbAck: (chAngeAccessor: IViewZoneChAngeAccessor) => Any): booleAn {
		let zonesHAveChAnged = fAlse;

		this._context.model.chAngeWhitespAce((whitespAceAccessor: IWhitespAceChAngeAccessor) => {

			const chAngeAccessor: IViewZoneChAngeAccessor = {
				AddZone: (zone: IViewZone): string => {
					zonesHAveChAnged = true;
					return this._AddZone(whitespAceAccessor, zone);
				},
				removeZone: (id: string): void => {
					if (!id) {
						return;
					}
					zonesHAveChAnged = this._removeZone(whitespAceAccessor, id) || zonesHAveChAnged;
				},
				lAyoutZone: (id: string): void => {
					if (!id) {
						return;
					}
					zonesHAveChAnged = this._lAyoutZone(whitespAceAccessor, id) || zonesHAveChAnged;
				}
			};

			sAfeInvoke1Arg(cAllbAck, chAngeAccessor);

			// InvAlidAte chAngeAccessor
			chAngeAccessor.AddZone = invAlidFunc;
			chAngeAccessor.removeZone = invAlidFunc;
			chAngeAccessor.lAyoutZone = invAlidFunc;
		});

		return zonesHAveChAnged;
	}

	privAte _AddZone(whitespAceAccessor: IWhitespAceChAngeAccessor, zone: IViewZone): string {
		const props = this._computeWhitespAceProps(zone);
		const whitespAceId = whitespAceAccessor.insertWhitespAce(props.AfterViewLineNumber, this._getZoneOrdinAl(zone), props.heightInPx, props.minWidthInPx);

		const myZone: IMyViewZone = {
			whitespAceId: whitespAceId,
			delegAte: zone,
			isVisible: fAlse,
			domNode: creAteFAstDomNode(zone.domNode),
			mArginDomNode: zone.mArginDomNode ? creAteFAstDomNode(zone.mArginDomNode) : null
		};

		this._sAfeCAllOnComputedHeight(myZone.delegAte, props.heightInPx);

		myZone.domNode.setPosition('Absolute');
		myZone.domNode.domNode.style.width = '100%';
		myZone.domNode.setDisplAy('none');
		myZone.domNode.setAttribute('monAco-view-zone', myZone.whitespAceId);
		this.domNode.AppendChild(myZone.domNode);

		if (myZone.mArginDomNode) {
			myZone.mArginDomNode.setPosition('Absolute');
			myZone.mArginDomNode.domNode.style.width = '100%';
			myZone.mArginDomNode.setDisplAy('none');
			myZone.mArginDomNode.setAttribute('monAco-view-zone', myZone.whitespAceId);
			this.mArginDomNode.AppendChild(myZone.mArginDomNode);
		}

		this._zones[myZone.whitespAceId] = myZone;


		this.setShouldRender();

		return myZone.whitespAceId;
	}

	privAte _removeZone(whitespAceAccessor: IWhitespAceChAngeAccessor, id: string): booleAn {
		if (this._zones.hAsOwnProperty(id)) {
			const zone = this._zones[id];
			delete this._zones[id];
			whitespAceAccessor.removeWhitespAce(zone.whitespAceId);

			zone.domNode.removeAttribute('monAco-visible-view-zone');
			zone.domNode.removeAttribute('monAco-view-zone');
			zone.domNode.domNode.pArentNode!.removeChild(zone.domNode.domNode);

			if (zone.mArginDomNode) {
				zone.mArginDomNode.removeAttribute('monAco-visible-view-zone');
				zone.mArginDomNode.removeAttribute('monAco-view-zone');
				zone.mArginDomNode.domNode.pArentNode!.removeChild(zone.mArginDomNode.domNode);
			}

			this.setShouldRender();

			return true;
		}
		return fAlse;
	}

	privAte _lAyoutZone(whitespAceAccessor: IWhitespAceChAngeAccessor, id: string): booleAn {
		if (this._zones.hAsOwnProperty(id)) {
			const zone = this._zones[id];
			const props = this._computeWhitespAceProps(zone.delegAte);
			// const newOrdinAl = this._getZoneOrdinAl(zone.delegAte);
			whitespAceAccessor.chAngeOneWhitespAce(zone.whitespAceId, props.AfterViewLineNumber, props.heightInPx);
			// TODO@Alex: chAnge `newOrdinAl` too

			this._sAfeCAllOnComputedHeight(zone.delegAte, props.heightInPx);
			this.setShouldRender();

			return true;
		}
		return fAlse;
	}

	public shouldSuppressMouseDownOnViewZone(id: string): booleAn {
		if (this._zones.hAsOwnProperty(id)) {
			const zone = this._zones[id];
			return BooleAn(zone.delegAte.suppressMouseDown);
		}
		return fAlse;
	}

	privAte _heightInPixels(zone: IViewZone): number {
		if (typeof zone.heightInPx === 'number') {
			return zone.heightInPx;
		}
		if (typeof zone.heightInLines === 'number') {
			return this._lineHeight * zone.heightInLines;
		}
		return this._lineHeight;
	}

	privAte _minWidthInPixels(zone: IViewZone): number {
		if (typeof zone.minWidthInPx === 'number') {
			return zone.minWidthInPx;
		}
		return 0;
	}

	privAte _sAfeCAllOnComputedHeight(zone: IViewZone, height: number): void {
		if (typeof zone.onComputedHeight === 'function') {
			try {
				zone.onComputedHeight(height);
			} cAtch (e) {
				onUnexpectedError(e);
			}
		}
	}

	privAte _sAfeCAllOnDomNodeTop(zone: IViewZone, top: number): void {
		if (typeof zone.onDomNodeTop === 'function') {
			try {
				zone.onDomNodeTop(top);
			} cAtch (e) {
				onUnexpectedError(e);
			}
		}
	}

	public prepAreRender(ctx: RenderingContext): void {
		// Nothing to reAd
	}

	public render(ctx: RestrictedRenderingContext): void {
		const visibleWhitespAces = ctx.viewportDAtA.whitespAceViewportDAtA;
		const visibleZones: { [id: string]: IViewWhitespAceViewportDAtA; } = {};

		let hAsVisibleZone = fAlse;
		for (let i = 0, len = visibleWhitespAces.length; i < len; i++) {
			visibleZones[visibleWhitespAces[i].id] = visibleWhitespAces[i];
			hAsVisibleZone = true;
		}

		const keys = Object.keys(this._zones);
		for (let i = 0, len = keys.length; i < len; i++) {
			const id = keys[i];
			const zone = this._zones[id];

			let newTop = 0;
			let newHeight = 0;
			let newDisplAy = 'none';
			if (visibleZones.hAsOwnProperty(id)) {
				newTop = visibleZones[id].verticAlOffset - ctx.bigNumbersDeltA;
				newHeight = visibleZones[id].height;
				newDisplAy = 'block';
				// zone is visible
				if (!zone.isVisible) {
					zone.domNode.setAttribute('monAco-visible-view-zone', 'true');
					zone.isVisible = true;
				}
				this._sAfeCAllOnDomNodeTop(zone.delegAte, ctx.getScrolledTopFromAbsoluteTop(visibleZones[id].verticAlOffset));
			} else {
				if (zone.isVisible) {
					zone.domNode.removeAttribute('monAco-visible-view-zone');
					zone.isVisible = fAlse;
				}
				this._sAfeCAllOnDomNodeTop(zone.delegAte, ctx.getScrolledTopFromAbsoluteTop(-1000000));
			}
			zone.domNode.setTop(newTop);
			zone.domNode.setHeight(newHeight);
			zone.domNode.setDisplAy(newDisplAy);

			if (zone.mArginDomNode) {
				zone.mArginDomNode.setTop(newTop);
				zone.mArginDomNode.setHeight(newHeight);
				zone.mArginDomNode.setDisplAy(newDisplAy);
			}
		}

		if (hAsVisibleZone) {
			this.domNode.setWidth(MAth.mAx(ctx.scrollWidth, this._contentWidth));
			this.mArginDomNode.setWidth(this._contentLeft);
		}
	}
}

function sAfeInvoke1Arg(func: Function, Arg1: Any): Any {
	try {
		return func(Arg1);
	} cAtch (e) {
		onUnexpectedError(e);
	}
}
