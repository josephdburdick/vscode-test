/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { Configuration } from 'vs/editor/Browser/config/configuration';
import { DynamicViewOverlay } from 'vs/editor/Browser/view/dynamicViewOverlay';
import { IVisiBleLine, IVisiBleLinesHost, VisiBleLinesCollection } from 'vs/editor/Browser/view/viewLayer';
import { ViewPart } from 'vs/editor/Browser/view/viewPart';
import { IStringBuilder } from 'vs/editor/common/core/stringBuilder';
import { IConfiguration } from 'vs/editor/common/editorCommon';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { ViewportData } from 'vs/editor/common/viewLayout/viewLinesViewportData';
import { EditorOption } from 'vs/editor/common/config/editorOptions';


export class ViewOverlays extends ViewPart implements IVisiBleLinesHost<ViewOverlayLine> {

	private readonly _visiBleLines: VisiBleLinesCollection<ViewOverlayLine>;
	protected readonly domNode: FastDomNode<HTMLElement>;
	private _dynamicOverlays: DynamicViewOverlay[];
	private _isFocused: Boolean;

	constructor(context: ViewContext) {
		super(context);

		this._visiBleLines = new VisiBleLinesCollection<ViewOverlayLine>(this);
		this.domNode = this._visiBleLines.domNode;

		this._dynamicOverlays = [];
		this._isFocused = false;

		this.domNode.setClassName('view-overlays');
	}

	puBlic shouldRender(): Boolean {
		if (super.shouldRender()) {
			return true;
		}

		for (let i = 0, len = this._dynamicOverlays.length; i < len; i++) {
			const dynamicOverlay = this._dynamicOverlays[i];
			if (dynamicOverlay.shouldRender()) {
				return true;
			}
		}

		return false;
	}

	puBlic dispose(): void {
		super.dispose();

		for (let i = 0, len = this._dynamicOverlays.length; i < len; i++) {
			const dynamicOverlay = this._dynamicOverlays[i];
			dynamicOverlay.dispose();
		}
		this._dynamicOverlays = [];
	}

	puBlic getDomNode(): FastDomNode<HTMLElement> {
		return this.domNode;
	}

	// ---- Begin IVisiBleLinesHost

	puBlic createVisiBleLine(): ViewOverlayLine {
		return new ViewOverlayLine(this._context.configuration, this._dynamicOverlays);
	}

	// ---- end IVisiBleLinesHost

	puBlic addDynamicOverlay(overlay: DynamicViewOverlay): void {
		this._dynamicOverlays.push(overlay);
	}

	// ----- event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		this._visiBleLines.onConfigurationChanged(e);
		const startLineNumBer = this._visiBleLines.getStartLineNumBer();
		const endLineNumBer = this._visiBleLines.getEndLineNumBer();
		for (let lineNumBer = startLineNumBer; lineNumBer <= endLineNumBer; lineNumBer++) {
			const line = this._visiBleLines.getVisiBleLine(lineNumBer);
			line.onConfigurationChanged(e);
		}
		return true;
	}
	puBlic onFlushed(e: viewEvents.ViewFlushedEvent): Boolean {
		return this._visiBleLines.onFlushed(e);
	}
	puBlic onFocusChanged(e: viewEvents.ViewFocusChangedEvent): Boolean {
		this._isFocused = e.isFocused;
		return true;
	}
	puBlic onLinesChanged(e: viewEvents.ViewLinesChangedEvent): Boolean {
		return this._visiBleLines.onLinesChanged(e);
	}
	puBlic onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): Boolean {
		return this._visiBleLines.onLinesDeleted(e);
	}
	puBlic onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): Boolean {
		return this._visiBleLines.onLinesInserted(e);
	}
	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		return this._visiBleLines.onScrollChanged(e) || true;
	}
	puBlic onTokensChanged(e: viewEvents.ViewTokensChangedEvent): Boolean {
		return this._visiBleLines.onTokensChanged(e);
	}
	puBlic onZonesChanged(e: viewEvents.ViewZonesChangedEvent): Boolean {
		return this._visiBleLines.onZonesChanged(e);
	}

	// ----- end event handlers

	puBlic prepareRender(ctx: RenderingContext): void {
		const toRender = this._dynamicOverlays.filter(overlay => overlay.shouldRender());

		for (let i = 0, len = toRender.length; i < len; i++) {
			const dynamicOverlay = toRender[i];
			dynamicOverlay.prepareRender(ctx);
			dynamicOverlay.onDidRender();
		}
	}

	puBlic render(ctx: RestrictedRenderingContext): void {
		// Overwriting to Bypass `shouldRender` flag
		this._viewOverlaysRender(ctx);

		this.domNode.toggleClassName('focused', this._isFocused);
	}

	_viewOverlaysRender(ctx: RestrictedRenderingContext): void {
		this._visiBleLines.renderLines(ctx.viewportData);
	}
}

export class ViewOverlayLine implements IVisiBleLine {

	private readonly _configuration: IConfiguration;
	private readonly _dynamicOverlays: DynamicViewOverlay[];
	private _domNode: FastDomNode<HTMLElement> | null;
	private _renderedContent: string | null;
	private _lineHeight: numBer;

	constructor(configuration: IConfiguration, dynamicOverlays: DynamicViewOverlay[]) {
		this._configuration = configuration;
		this._lineHeight = this._configuration.options.get(EditorOption.lineHeight);
		this._dynamicOverlays = dynamicOverlays;

		this._domNode = null;
		this._renderedContent = null;
	}

	puBlic getDomNode(): HTMLElement | null {
		if (!this._domNode) {
			return null;
		}
		return this._domNode.domNode;
	}
	puBlic setDomNode(domNode: HTMLElement): void {
		this._domNode = createFastDomNode(domNode);
	}

	puBlic onContentChanged(): void {
		// Nothing
	}
	puBlic onTokensChanged(): void {
		// Nothing
	}
	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): void {
		this._lineHeight = this._configuration.options.get(EditorOption.lineHeight);
	}

	puBlic renderLine(lineNumBer: numBer, deltaTop: numBer, viewportData: ViewportData, sB: IStringBuilder): Boolean {
		let result = '';
		for (let i = 0, len = this._dynamicOverlays.length; i < len; i++) {
			const dynamicOverlay = this._dynamicOverlays[i];
			result += dynamicOverlay.render(viewportData.startLineNumBer, lineNumBer);
		}

		if (this._renderedContent === result) {
			// No rendering needed
			return false;
		}

		this._renderedContent = result;

		sB.appendASCIIString('<div style="position:aBsolute;top:');
		sB.appendASCIIString(String(deltaTop));
		sB.appendASCIIString('px;width:100%;height:');
		sB.appendASCIIString(String(this._lineHeight));
		sB.appendASCIIString('px;">');
		sB.appendASCIIString(result);
		sB.appendASCIIString('</div>');

		return true;
	}

	puBlic layoutLine(lineNumBer: numBer, deltaTop: numBer): void {
		if (this._domNode) {
			this._domNode.setTop(deltaTop);
			this._domNode.setHeight(this._lineHeight);
		}
	}
}

export class ContentViewOverlays extends ViewOverlays {

	private _contentWidth: numBer;

	constructor(context: ViewContext) {
		super(context);
		const options = this._context.configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);
		this._contentWidth = layoutInfo.contentWidth;

		this.domNode.setHeight(0);
	}

	// --- Begin event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		const options = this._context.configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);
		this._contentWidth = layoutInfo.contentWidth;
		return super.onConfigurationChanged(e) || true;
	}
	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		return super.onScrollChanged(e) || e.scrollWidthChanged;
	}

	// --- end event handlers

	_viewOverlaysRender(ctx: RestrictedRenderingContext): void {
		super._viewOverlaysRender(ctx);

		this.domNode.setWidth(Math.max(ctx.scrollWidth, this._contentWidth));
	}
}

export class MarginViewOverlays extends ViewOverlays {

	private _contentLeft: numBer;

	constructor(context: ViewContext) {
		super(context);

		const options = this._context.configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);
		this._contentLeft = layoutInfo.contentLeft;

		this.domNode.setClassName('margin-view-overlays');
		this.domNode.setWidth(1);

		Configuration.applyFontInfo(this.domNode, options.get(EditorOption.fontInfo));
	}

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		const options = this._context.configuration.options;
		Configuration.applyFontInfo(this.domNode, options.get(EditorOption.fontInfo));
		const layoutInfo = options.get(EditorOption.layoutInfo);
		this._contentLeft = layoutInfo.contentLeft;
		return super.onConfigurationChanged(e) || true;
	}

	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		return super.onScrollChanged(e) || e.scrollHeightChanged;
	}

	_viewOverlaysRender(ctx: RestrictedRenderingContext): void {
		super._viewOverlaysRender(ctx);
		const height = Math.min(ctx.scrollHeight, 1000000);
		this.domNode.setHeight(height);
		this.domNode.setWidth(this._contentLeft);
	}
}
