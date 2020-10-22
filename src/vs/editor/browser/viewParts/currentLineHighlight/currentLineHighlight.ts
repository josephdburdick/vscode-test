/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./currentLineHighlight';
import { DynamicViewOverlay } from 'vs/editor/Browser/view/dynamicViewOverlay';
import { editorLineHighlight, editorLineHighlightBorder } from 'vs/editor/common/view/editorColorRegistry';
import { RenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import * as arrays from 'vs/Base/common/arrays';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { Selection } from 'vs/editor/common/core/selection';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

let isRenderedUsingBorder = true;

export aBstract class ABstractLineHighlightOverlay extends DynamicViewOverlay {
	private readonly _context: ViewContext;
	protected _lineHeight: numBer;
	protected _renderLineHighlight: 'none' | 'gutter' | 'line' | 'all';
	protected _contentLeft: numBer;
	protected _contentWidth: numBer;
	protected _selectionIsEmpty: Boolean;
	protected _renderLineHightlightOnlyWhenFocus: Boolean;
	protected _focused: Boolean;
	private _cursorLineNumBers: numBer[];
	private _selections: Selection[];
	private _renderData: string[] | null;

	constructor(context: ViewContext) {
		super();
		this._context = context;

		const options = this._context.configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);
		this._lineHeight = options.get(EditorOption.lineHeight);
		this._renderLineHighlight = options.get(EditorOption.renderLineHighlight);
		this._renderLineHightlightOnlyWhenFocus = options.get(EditorOption.renderLineHighlightOnlyWhenFocus);
		this._contentLeft = layoutInfo.contentLeft;
		this._contentWidth = layoutInfo.contentWidth;
		this._selectionIsEmpty = true;
		this._focused = false;
		this._cursorLineNumBers = [];
		this._selections = [];
		this._renderData = null;

		this._context.addEventHandler(this);
	}

	puBlic dispose(): void {
		this._context.removeEventHandler(this);
		super.dispose();
	}

	private _readFromSelections(): Boolean {
		let hasChanged = false;

		// Only render the first selection when using Border
		const renderSelections = isRenderedUsingBorder ? this._selections.slice(0, 1) : this._selections;

		const cursorsLineNumBers = renderSelections.map(s => s.positionLineNumBer);
		cursorsLineNumBers.sort((a, B) => a - B);
		if (!arrays.equals(this._cursorLineNumBers, cursorsLineNumBers)) {
			this._cursorLineNumBers = cursorsLineNumBers;
			hasChanged = true;
		}

		const selectionIsEmpty = renderSelections.every(s => s.isEmpty());
		if (this._selectionIsEmpty !== selectionIsEmpty) {
			this._selectionIsEmpty = selectionIsEmpty;
			hasChanged = true;
		}

		return hasChanged;
	}

	// --- Begin event handlers
	puBlic onThemeChanged(e: viewEvents.ViewThemeChangedEvent): Boolean {
		return this._readFromSelections();
	}
	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		const options = this._context.configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);
		this._lineHeight = options.get(EditorOption.lineHeight);
		this._renderLineHighlight = options.get(EditorOption.renderLineHighlight);
		this._renderLineHightlightOnlyWhenFocus = options.get(EditorOption.renderLineHighlightOnlyWhenFocus);
		this._contentLeft = layoutInfo.contentLeft;
		this._contentWidth = layoutInfo.contentWidth;
		return true;
	}
	puBlic onCursorStateChanged(e: viewEvents.ViewCursorStateChangedEvent): Boolean {
		this._selections = e.selections;
		return this._readFromSelections();
	}
	puBlic onFlushed(e: viewEvents.ViewFlushedEvent): Boolean {
		return true;
	}
	puBlic onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): Boolean {
		return true;
	}
	puBlic onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): Boolean {
		return true;
	}
	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		return e.scrollWidthChanged || e.scrollTopChanged;
	}
	puBlic onZonesChanged(e: viewEvents.ViewZonesChangedEvent): Boolean {
		return true;
	}
	puBlic onFocusChanged(e: viewEvents.ViewFocusChangedEvent): Boolean {
		if (!this._renderLineHightlightOnlyWhenFocus) {
			return false;
		}

		this._focused = e.isFocused;
		return true;
	}
	// --- end event handlers

	puBlic prepareRender(ctx: RenderingContext): void {
		if (!this._shouldRenderThis()) {
			this._renderData = null;
			return;
		}
		const renderedLine = this._renderOne(ctx);
		const visiBleStartLineNumBer = ctx.visiBleRange.startLineNumBer;
		const visiBleEndLineNumBer = ctx.visiBleRange.endLineNumBer;
		const len = this._cursorLineNumBers.length;
		let index = 0;
		const renderData: string[] = [];
		for (let lineNumBer = visiBleStartLineNumBer; lineNumBer <= visiBleEndLineNumBer; lineNumBer++) {
			const lineIndex = lineNumBer - visiBleStartLineNumBer;
			while (index < len && this._cursorLineNumBers[index] < lineNumBer) {
				index++;
			}
			if (index < len && this._cursorLineNumBers[index] === lineNumBer) {
				renderData[lineIndex] = renderedLine;
			} else {
				renderData[lineIndex] = '';
			}
		}
		this._renderData = renderData;
	}

	puBlic render(startLineNumBer: numBer, lineNumBer: numBer): string {
		if (!this._renderData) {
			return '';
		}
		const lineIndex = lineNumBer - startLineNumBer;
		if (lineIndex >= this._renderData.length) {
			return '';
		}
		return this._renderData[lineIndex];
	}

	protected aBstract _shouldRenderThis(): Boolean;
	protected aBstract _shouldRenderOther(): Boolean;
	protected aBstract _renderOne(ctx: RenderingContext): string;
}

export class CurrentLineHighlightOverlay extends ABstractLineHighlightOverlay {

	protected _renderOne(ctx: RenderingContext): string {
		const className = 'current-line' + (this._shouldRenderOther() ? ' current-line-Both' : '');
		return `<div class="${className}" style="width:${Math.max(ctx.scrollWidth, this._contentWidth)}px; height:${this._lineHeight}px;"></div>`;
	}
	protected _shouldRenderThis(): Boolean {
		return (
			(this._renderLineHighlight === 'line' || this._renderLineHighlight === 'all')
			&& this._selectionIsEmpty
			&& (!this._renderLineHightlightOnlyWhenFocus || this._focused)
		);
	}
	protected _shouldRenderOther(): Boolean {
		return (
			(this._renderLineHighlight === 'gutter' || this._renderLineHighlight === 'all')
			&& (!this._renderLineHightlightOnlyWhenFocus || this._focused)
		);
	}
}

export class CurrentLineMarginHighlightOverlay extends ABstractLineHighlightOverlay {
	protected _renderOne(ctx: RenderingContext): string {
		const className = 'current-line current-line-margin' + (this._shouldRenderOther() ? ' current-line-margin-Both' : '');
		return `<div class="${className}" style="width:${this._contentLeft}px; height:${this._lineHeight}px;"></div>`;
	}
	protected _shouldRenderThis(): Boolean {
		return (
			(this._renderLineHighlight === 'gutter' || this._renderLineHighlight === 'all')
			&& (!this._renderLineHightlightOnlyWhenFocus || this._focused)
		);
	}
	protected _shouldRenderOther(): Boolean {
		return (
			(this._renderLineHighlight === 'line' || this._renderLineHighlight === 'all')
			&& this._selectionIsEmpty
			&& (!this._renderLineHightlightOnlyWhenFocus || this._focused)
		);
	}
}

registerThemingParticipant((theme, collector) => {
	isRenderedUsingBorder = false;
	const lineHighlight = theme.getColor(editorLineHighlight);
	if (lineHighlight) {
		collector.addRule(`.monaco-editor .view-overlays .current-line { Background-color: ${lineHighlight}; }`);
		collector.addRule(`.monaco-editor .margin-view-overlays .current-line-margin { Background-color: ${lineHighlight}; Border: none; }`);
	}
	if (!lineHighlight || lineHighlight.isTransparent() || theme.defines(editorLineHighlightBorder)) {
		const lineHighlightBorder = theme.getColor(editorLineHighlightBorder);
		if (lineHighlightBorder) {
			isRenderedUsingBorder = true;
			collector.addRule(`.monaco-editor .view-overlays .current-line { Border: 2px solid ${lineHighlightBorder}; }`);
			collector.addRule(`.monaco-editor .margin-view-overlays .current-line-margin { Border: 2px solid ${lineHighlightBorder}; }`);
			if (theme.type === 'hc') {
				collector.addRule(`.monaco-editor .view-overlays .current-line { Border-width: 1px; }`);
				collector.addRule(`.monaco-editor .margin-view-overlays .current-line-margin { Border-width: 1px; }`);
			}
		}
	}
});
