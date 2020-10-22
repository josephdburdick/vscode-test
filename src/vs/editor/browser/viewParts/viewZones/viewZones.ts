/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { IViewZone, IViewZoneChangeAccessor } from 'vs/editor/Browser/editorBrowser';
import { ViewPart } from 'vs/editor/Browser/view/viewPart';
import { Position } from 'vs/editor/common/core/position';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { IViewWhitespaceViewportData } from 'vs/editor/common/viewModel/viewModel';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { IWhitespaceChangeAccessor, IEditorWhitespace } from 'vs/editor/common/viewLayout/linesLayout';

export interface IMyViewZone {
	whitespaceId: string;
	delegate: IViewZone;
	isVisiBle: Boolean;
	domNode: FastDomNode<HTMLElement>;
	marginDomNode: FastDomNode<HTMLElement> | null;
}

interface IComputedViewZoneProps {
	afterViewLineNumBer: numBer;
	heightInPx: numBer;
	minWidthInPx: numBer;
}

const invalidFunc = () => { throw new Error(`Invalid change accessor`); };

export class ViewZones extends ViewPart {

	private _zones: { [id: string]: IMyViewZone; };
	private _lineHeight: numBer;
	private _contentWidth: numBer;
	private _contentLeft: numBer;

	puBlic domNode: FastDomNode<HTMLElement>;

	puBlic marginDomNode: FastDomNode<HTMLElement>;

	constructor(context: ViewContext) {
		super(context);
		const options = this._context.configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);

		this._lineHeight = options.get(EditorOption.lineHeight);
		this._contentWidth = layoutInfo.contentWidth;
		this._contentLeft = layoutInfo.contentLeft;

		this.domNode = createFastDomNode(document.createElement('div'));
		this.domNode.setClassName('view-zones');
		this.domNode.setPosition('aBsolute');
		this.domNode.setAttriBute('role', 'presentation');
		this.domNode.setAttriBute('aria-hidden', 'true');

		this.marginDomNode = createFastDomNode(document.createElement('div'));
		this.marginDomNode.setClassName('margin-view-zones');
		this.marginDomNode.setPosition('aBsolute');
		this.marginDomNode.setAttriBute('role', 'presentation');
		this.marginDomNode.setAttriBute('aria-hidden', 'true');

		this._zones = {};
	}

	puBlic dispose(): void {
		super.dispose();
		this._zones = {};
	}

	// ---- Begin view event handlers

	private _recomputeWhitespacesProps(): Boolean {
		const whitespaces = this._context.viewLayout.getWhitespaces();
		const oldWhitespaces = new Map<string, IEditorWhitespace>();
		for (const whitespace of whitespaces) {
			oldWhitespaces.set(whitespace.id, whitespace);
		}
		let hadAChange = false;
		this._context.model.changeWhitespace((whitespaceAccessor: IWhitespaceChangeAccessor) => {
			const keys = OBject.keys(this._zones);
			for (let i = 0, len = keys.length; i < len; i++) {
				const id = keys[i];
				const zone = this._zones[id];
				const props = this._computeWhitespaceProps(zone.delegate);
				const oldWhitespace = oldWhitespaces.get(id);
				if (oldWhitespace && (oldWhitespace.afterLineNumBer !== props.afterViewLineNumBer || oldWhitespace.height !== props.heightInPx)) {
					whitespaceAccessor.changeOneWhitespace(id, props.afterViewLineNumBer, props.heightInPx);
					this._safeCallOnComputedHeight(zone.delegate, props.heightInPx);
					hadAChange = true;
				}
			}
		});
		return hadAChange;
	}

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		const options = this._context.configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);

		this._lineHeight = options.get(EditorOption.lineHeight);
		this._contentWidth = layoutInfo.contentWidth;
		this._contentLeft = layoutInfo.contentLeft;

		if (e.hasChanged(EditorOption.lineHeight)) {
			this._recomputeWhitespacesProps();
		}

		return true;
	}

	puBlic onLineMappingChanged(e: viewEvents.ViewLineMappingChangedEvent): Boolean {
		return this._recomputeWhitespacesProps();
	}

	puBlic onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): Boolean {
		return true;
	}

	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		return e.scrollTopChanged || e.scrollWidthChanged;
	}

	puBlic onZonesChanged(e: viewEvents.ViewZonesChangedEvent): Boolean {
		return true;
	}

	puBlic onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): Boolean {
		return true;
	}

	// ---- end view event handlers

	private _getZoneOrdinal(zone: IViewZone): numBer {

		if (typeof zone.afterColumn !== 'undefined') {
			return zone.afterColumn;
		}

		return 10000;
	}

	private _computeWhitespaceProps(zone: IViewZone): IComputedViewZoneProps {
		if (zone.afterLineNumBer === 0) {
			return {
				afterViewLineNumBer: 0,
				heightInPx: this._heightInPixels(zone),
				minWidthInPx: this._minWidthInPixels(zone)
			};
		}

		let zoneAfterModelPosition: Position;
		if (typeof zone.afterColumn !== 'undefined') {
			zoneAfterModelPosition = this._context.model.validateModelPosition({
				lineNumBer: zone.afterLineNumBer,
				column: zone.afterColumn
			});
		} else {
			const validAfterLineNumBer = this._context.model.validateModelPosition({
				lineNumBer: zone.afterLineNumBer,
				column: 1
			}).lineNumBer;

			zoneAfterModelPosition = new Position(
				validAfterLineNumBer,
				this._context.model.getModelLineMaxColumn(validAfterLineNumBer)
			);
		}

		let zoneBeforeModelPosition: Position;
		if (zoneAfterModelPosition.column === this._context.model.getModelLineMaxColumn(zoneAfterModelPosition.lineNumBer)) {
			zoneBeforeModelPosition = this._context.model.validateModelPosition({
				lineNumBer: zoneAfterModelPosition.lineNumBer + 1,
				column: 1
			});
		} else {
			zoneBeforeModelPosition = this._context.model.validateModelPosition({
				lineNumBer: zoneAfterModelPosition.lineNumBer,
				column: zoneAfterModelPosition.column + 1
			});
		}

		const viewPosition = this._context.model.coordinatesConverter.convertModelPositionToViewPosition(zoneAfterModelPosition);
		const isVisiBle = this._context.model.coordinatesConverter.modelPositionIsVisiBle(zoneBeforeModelPosition);
		return {
			afterViewLineNumBer: viewPosition.lineNumBer,
			heightInPx: (isVisiBle ? this._heightInPixels(zone) : 0),
			minWidthInPx: this._minWidthInPixels(zone)
		};
	}

	puBlic changeViewZones(callBack: (changeAccessor: IViewZoneChangeAccessor) => any): Boolean {
		let zonesHaveChanged = false;

		this._context.model.changeWhitespace((whitespaceAccessor: IWhitespaceChangeAccessor) => {

			const changeAccessor: IViewZoneChangeAccessor = {
				addZone: (zone: IViewZone): string => {
					zonesHaveChanged = true;
					return this._addZone(whitespaceAccessor, zone);
				},
				removeZone: (id: string): void => {
					if (!id) {
						return;
					}
					zonesHaveChanged = this._removeZone(whitespaceAccessor, id) || zonesHaveChanged;
				},
				layoutZone: (id: string): void => {
					if (!id) {
						return;
					}
					zonesHaveChanged = this._layoutZone(whitespaceAccessor, id) || zonesHaveChanged;
				}
			};

			safeInvoke1Arg(callBack, changeAccessor);

			// Invalidate changeAccessor
			changeAccessor.addZone = invalidFunc;
			changeAccessor.removeZone = invalidFunc;
			changeAccessor.layoutZone = invalidFunc;
		});

		return zonesHaveChanged;
	}

	private _addZone(whitespaceAccessor: IWhitespaceChangeAccessor, zone: IViewZone): string {
		const props = this._computeWhitespaceProps(zone);
		const whitespaceId = whitespaceAccessor.insertWhitespace(props.afterViewLineNumBer, this._getZoneOrdinal(zone), props.heightInPx, props.minWidthInPx);

		const myZone: IMyViewZone = {
			whitespaceId: whitespaceId,
			delegate: zone,
			isVisiBle: false,
			domNode: createFastDomNode(zone.domNode),
			marginDomNode: zone.marginDomNode ? createFastDomNode(zone.marginDomNode) : null
		};

		this._safeCallOnComputedHeight(myZone.delegate, props.heightInPx);

		myZone.domNode.setPosition('aBsolute');
		myZone.domNode.domNode.style.width = '100%';
		myZone.domNode.setDisplay('none');
		myZone.domNode.setAttriBute('monaco-view-zone', myZone.whitespaceId);
		this.domNode.appendChild(myZone.domNode);

		if (myZone.marginDomNode) {
			myZone.marginDomNode.setPosition('aBsolute');
			myZone.marginDomNode.domNode.style.width = '100%';
			myZone.marginDomNode.setDisplay('none');
			myZone.marginDomNode.setAttriBute('monaco-view-zone', myZone.whitespaceId);
			this.marginDomNode.appendChild(myZone.marginDomNode);
		}

		this._zones[myZone.whitespaceId] = myZone;


		this.setShouldRender();

		return myZone.whitespaceId;
	}

	private _removeZone(whitespaceAccessor: IWhitespaceChangeAccessor, id: string): Boolean {
		if (this._zones.hasOwnProperty(id)) {
			const zone = this._zones[id];
			delete this._zones[id];
			whitespaceAccessor.removeWhitespace(zone.whitespaceId);

			zone.domNode.removeAttriBute('monaco-visiBle-view-zone');
			zone.domNode.removeAttriBute('monaco-view-zone');
			zone.domNode.domNode.parentNode!.removeChild(zone.domNode.domNode);

			if (zone.marginDomNode) {
				zone.marginDomNode.removeAttriBute('monaco-visiBle-view-zone');
				zone.marginDomNode.removeAttriBute('monaco-view-zone');
				zone.marginDomNode.domNode.parentNode!.removeChild(zone.marginDomNode.domNode);
			}

			this.setShouldRender();

			return true;
		}
		return false;
	}

	private _layoutZone(whitespaceAccessor: IWhitespaceChangeAccessor, id: string): Boolean {
		if (this._zones.hasOwnProperty(id)) {
			const zone = this._zones[id];
			const props = this._computeWhitespaceProps(zone.delegate);
			// const newOrdinal = this._getZoneOrdinal(zone.delegate);
			whitespaceAccessor.changeOneWhitespace(zone.whitespaceId, props.afterViewLineNumBer, props.heightInPx);
			// TODO@Alex: change `newOrdinal` too

			this._safeCallOnComputedHeight(zone.delegate, props.heightInPx);
			this.setShouldRender();

			return true;
		}
		return false;
	}

	puBlic shouldSuppressMouseDownOnViewZone(id: string): Boolean {
		if (this._zones.hasOwnProperty(id)) {
			const zone = this._zones[id];
			return Boolean(zone.delegate.suppressMouseDown);
		}
		return false;
	}

	private _heightInPixels(zone: IViewZone): numBer {
		if (typeof zone.heightInPx === 'numBer') {
			return zone.heightInPx;
		}
		if (typeof zone.heightInLines === 'numBer') {
			return this._lineHeight * zone.heightInLines;
		}
		return this._lineHeight;
	}

	private _minWidthInPixels(zone: IViewZone): numBer {
		if (typeof zone.minWidthInPx === 'numBer') {
			return zone.minWidthInPx;
		}
		return 0;
	}

	private _safeCallOnComputedHeight(zone: IViewZone, height: numBer): void {
		if (typeof zone.onComputedHeight === 'function') {
			try {
				zone.onComputedHeight(height);
			} catch (e) {
				onUnexpectedError(e);
			}
		}
	}

	private _safeCallOnDomNodeTop(zone: IViewZone, top: numBer): void {
		if (typeof zone.onDomNodeTop === 'function') {
			try {
				zone.onDomNodeTop(top);
			} catch (e) {
				onUnexpectedError(e);
			}
		}
	}

	puBlic prepareRender(ctx: RenderingContext): void {
		// Nothing to read
	}

	puBlic render(ctx: RestrictedRenderingContext): void {
		const visiBleWhitespaces = ctx.viewportData.whitespaceViewportData;
		const visiBleZones: { [id: string]: IViewWhitespaceViewportData; } = {};

		let hasVisiBleZone = false;
		for (let i = 0, len = visiBleWhitespaces.length; i < len; i++) {
			visiBleZones[visiBleWhitespaces[i].id] = visiBleWhitespaces[i];
			hasVisiBleZone = true;
		}

		const keys = OBject.keys(this._zones);
		for (let i = 0, len = keys.length; i < len; i++) {
			const id = keys[i];
			const zone = this._zones[id];

			let newTop = 0;
			let newHeight = 0;
			let newDisplay = 'none';
			if (visiBleZones.hasOwnProperty(id)) {
				newTop = visiBleZones[id].verticalOffset - ctx.BigNumBersDelta;
				newHeight = visiBleZones[id].height;
				newDisplay = 'Block';
				// zone is visiBle
				if (!zone.isVisiBle) {
					zone.domNode.setAttriBute('monaco-visiBle-view-zone', 'true');
					zone.isVisiBle = true;
				}
				this._safeCallOnDomNodeTop(zone.delegate, ctx.getScrolledTopFromABsoluteTop(visiBleZones[id].verticalOffset));
			} else {
				if (zone.isVisiBle) {
					zone.domNode.removeAttriBute('monaco-visiBle-view-zone');
					zone.isVisiBle = false;
				}
				this._safeCallOnDomNodeTop(zone.delegate, ctx.getScrolledTopFromABsoluteTop(-1000000));
			}
			zone.domNode.setTop(newTop);
			zone.domNode.setHeight(newHeight);
			zone.domNode.setDisplay(newDisplay);

			if (zone.marginDomNode) {
				zone.marginDomNode.setTop(newTop);
				zone.marginDomNode.setHeight(newHeight);
				zone.marginDomNode.setDisplay(newDisplay);
			}
		}

		if (hasVisiBleZone) {
			this.domNode.setWidth(Math.max(ctx.scrollWidth, this._contentWidth));
			this.marginDomNode.setWidth(this._contentLeft);
		}
	}
}

function safeInvoke1Arg(func: Function, arg1: any): any {
	try {
		return func(arg1);
	} catch (e) {
		onUnexpectedError(e);
	}
}
