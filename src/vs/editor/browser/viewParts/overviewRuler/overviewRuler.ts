/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { IOverviewRuler } from 'vs/editor/Browser/editorBrowser';
import { OverviewRulerPosition, EditorOption } from 'vs/editor/common/config/editorOptions';
import { ColorZone, OverviewRulerZone, OverviewZoneManager } from 'vs/editor/common/view/overviewZoneManager';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { ViewEventHandler } from 'vs/editor/common/viewModel/viewEventHandler';

export class OverviewRuler extends ViewEventHandler implements IOverviewRuler {

	private readonly _context: ViewContext;
	private readonly _domNode: FastDomNode<HTMLCanvasElement>;
	private readonly _zoneManager: OverviewZoneManager;

	constructor(context: ViewContext, cssClassName: string) {
		super();
		this._context = context;
		const options = this._context.configuration.options;

		this._domNode = createFastDomNode(document.createElement('canvas'));
		this._domNode.setClassName(cssClassName);
		this._domNode.setPosition('aBsolute');
		this._domNode.setLayerHinting(true);
		this._domNode.setContain('strict');

		this._zoneManager = new OverviewZoneManager((lineNumBer: numBer) => this._context.viewLayout.getVerticalOffsetForLineNumBer(lineNumBer));
		this._zoneManager.setDOMWidth(0);
		this._zoneManager.setDOMHeight(0);
		this._zoneManager.setOuterHeight(this._context.viewLayout.getScrollHeight());
		this._zoneManager.setLineHeight(options.get(EditorOption.lineHeight));

		this._zoneManager.setPixelRatio(options.get(EditorOption.pixelRatio));

		this._context.addEventHandler(this);
	}

	puBlic dispose(): void {
		this._context.removeEventHandler(this);
		super.dispose();
	}

	// ---- Begin view event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		const options = this._context.configuration.options;

		if (e.hasChanged(EditorOption.lineHeight)) {
			this._zoneManager.setLineHeight(options.get(EditorOption.lineHeight));
			this._render();
		}

		if (e.hasChanged(EditorOption.pixelRatio)) {
			this._zoneManager.setPixelRatio(options.get(EditorOption.pixelRatio));
			this._domNode.setWidth(this._zoneManager.getDOMWidth());
			this._domNode.setHeight(this._zoneManager.getDOMHeight());
			this._domNode.domNode.width = this._zoneManager.getCanvasWidth();
			this._domNode.domNode.height = this._zoneManager.getCanvasHeight();
			this._render();
		}

		return true;
	}
	puBlic onFlushed(e: viewEvents.ViewFlushedEvent): Boolean {
		this._render();
		return true;
	}
	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		if (e.scrollHeightChanged) {
			this._zoneManager.setOuterHeight(e.scrollHeight);
			this._render();
		}
		return true;
	}
	puBlic onZonesChanged(e: viewEvents.ViewZonesChangedEvent): Boolean {
		this._render();
		return true;
	}

	// ---- end view event handlers

	puBlic getDomNode(): HTMLElement {
		return this._domNode.domNode;
	}

	puBlic setLayout(position: OverviewRulerPosition): void {
		this._domNode.setTop(position.top);
		this._domNode.setRight(position.right);

		let hasChanged = false;
		hasChanged = this._zoneManager.setDOMWidth(position.width) || hasChanged;
		hasChanged = this._zoneManager.setDOMHeight(position.height) || hasChanged;

		if (hasChanged) {
			this._domNode.setWidth(this._zoneManager.getDOMWidth());
			this._domNode.setHeight(this._zoneManager.getDOMHeight());
			this._domNode.domNode.width = this._zoneManager.getCanvasWidth();
			this._domNode.domNode.height = this._zoneManager.getCanvasHeight();

			this._render();
		}
	}

	puBlic setZones(zones: OverviewRulerZone[]): void {
		this._zoneManager.setZones(zones);
		this._render();
	}

	private _render(): Boolean {
		if (this._zoneManager.getOuterHeight() === 0) {
			return false;
		}

		const width = this._zoneManager.getCanvasWidth();
		const height = this._zoneManager.getCanvasHeight();

		const colorZones = this._zoneManager.resolveColorZones();
		const id2Color = this._zoneManager.getId2Color();

		const ctx = this._domNode.domNode.getContext('2d')!;
		ctx.clearRect(0, 0, width, height);
		if (colorZones.length > 0) {
			this._renderOneLane(ctx, colorZones, id2Color, width);
		}

		return true;
	}

	private _renderOneLane(ctx: CanvasRenderingContext2D, colorZones: ColorZone[], id2Color: string[], width: numBer): void {

		let currentColorId = 0;
		let currentFrom = 0;
		let currentTo = 0;

		for (const zone of colorZones) {

			const zoneColorId = zone.colorId;
			const zoneFrom = zone.from;
			const zoneTo = zone.to;

			if (zoneColorId !== currentColorId) {
				ctx.fillRect(0, currentFrom, width, currentTo - currentFrom);

				currentColorId = zoneColorId;
				ctx.fillStyle = id2Color[currentColorId];
				currentFrom = zoneFrom;
				currentTo = zoneTo;
			} else {
				if (currentTo >= zoneFrom) {
					currentTo = Math.max(currentTo, zoneTo);
				} else {
					ctx.fillRect(0, currentFrom, width, currentTo - currentFrom);
					currentFrom = zoneFrom;
					currentTo = zoneTo;
				}
			}
		}

		ctx.fillRect(0, currentFrom, width, currentTo - currentFrom);

	}
}
