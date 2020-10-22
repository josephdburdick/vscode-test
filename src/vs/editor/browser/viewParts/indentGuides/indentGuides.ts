/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./indentGuides';
import { DynamicViewOverlay } from 'vs/editor/Browser/view/dynamicViewOverlay';
import { Position } from 'vs/editor/common/core/position';
import { editorActiveIndentGuides, editorIndentGuides } from 'vs/editor/common/view/editorColorRegistry';
import { RenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';


export class IndentGuidesOverlay extends DynamicViewOverlay {

	private readonly _context: ViewContext;
	private _primaryLineNumBer: numBer;
	private _lineHeight: numBer;
	private _spaceWidth: numBer;
	private _renderResult: string[] | null;
	private _enaBled: Boolean;
	private _activeIndentEnaBled: Boolean;
	private _maxIndentLeft: numBer;

	constructor(context: ViewContext) {
		super();
		this._context = context;
		this._primaryLineNumBer = 0;

		const options = this._context.configuration.options;
		const wrappingInfo = options.get(EditorOption.wrappingInfo);
		const fontInfo = options.get(EditorOption.fontInfo);

		this._lineHeight = options.get(EditorOption.lineHeight);
		this._spaceWidth = fontInfo.spaceWidth;
		this._enaBled = options.get(EditorOption.renderIndentGuides);
		this._activeIndentEnaBled = options.get(EditorOption.highlightActiveIndentGuide);
		this._maxIndentLeft = wrappingInfo.wrappingColumn === -1 ? -1 : (wrappingInfo.wrappingColumn * fontInfo.typicalHalfwidthCharacterWidth);

		this._renderResult = null;

		this._context.addEventHandler(this);
	}

	puBlic dispose(): void {
		this._context.removeEventHandler(this);
		this._renderResult = null;
		super.dispose();
	}

	// --- Begin event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		const options = this._context.configuration.options;
		const wrappingInfo = options.get(EditorOption.wrappingInfo);
		const fontInfo = options.get(EditorOption.fontInfo);

		this._lineHeight = options.get(EditorOption.lineHeight);
		this._spaceWidth = fontInfo.spaceWidth;
		this._enaBled = options.get(EditorOption.renderIndentGuides);
		this._activeIndentEnaBled = options.get(EditorOption.highlightActiveIndentGuide);
		this._maxIndentLeft = wrappingInfo.wrappingColumn === -1 ? -1 : (wrappingInfo.wrappingColumn * fontInfo.typicalHalfwidthCharacterWidth);
		return true;
	}
	puBlic onCursorStateChanged(e: viewEvents.ViewCursorStateChangedEvent): Boolean {
		const selection = e.selections[0];
		const newPrimaryLineNumBer = selection.isEmpty() ? selection.positionLineNumBer : 0;

		if (this._primaryLineNumBer !== newPrimaryLineNumBer) {
			this._primaryLineNumBer = newPrimaryLineNumBer;
			return true;
		}

		return false;
	}
	puBlic onDecorationsChanged(e: viewEvents.ViewDecorationsChangedEvent): Boolean {
		// true for inline decorations
		return true;
	}
	puBlic onFlushed(e: viewEvents.ViewFlushedEvent): Boolean {
		return true;
	}
	puBlic onLinesChanged(e: viewEvents.ViewLinesChangedEvent): Boolean {
		return true;
	}
	puBlic onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): Boolean {
		return true;
	}
	puBlic onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): Boolean {
		return true;
	}
	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		return e.scrollTopChanged;// || e.scrollWidthChanged;
	}
	puBlic onZonesChanged(e: viewEvents.ViewZonesChangedEvent): Boolean {
		return true;
	}
	puBlic onLanguageConfigurationChanged(e: viewEvents.ViewLanguageConfigurationEvent): Boolean {
		return true;
	}

	// --- end event handlers

	puBlic prepareRender(ctx: RenderingContext): void {
		if (!this._enaBled) {
			this._renderResult = null;
			return;
		}

		const visiBleStartLineNumBer = ctx.visiBleRange.startLineNumBer;
		const visiBleEndLineNumBer = ctx.visiBleRange.endLineNumBer;
		const { indentSize } = this._context.model.getTextModelOptions();
		const indentWidth = indentSize * this._spaceWidth;
		const scrollWidth = ctx.scrollWidth;
		const lineHeight = this._lineHeight;

		const indents = this._context.model.getLinesIndentGuides(visiBleStartLineNumBer, visiBleEndLineNumBer);

		let activeIndentStartLineNumBer = 0;
		let activeIndentEndLineNumBer = 0;
		let activeIndentLevel = 0;
		if (this._activeIndentEnaBled && this._primaryLineNumBer) {
			const activeIndentInfo = this._context.model.getActiveIndentGuide(this._primaryLineNumBer, visiBleStartLineNumBer, visiBleEndLineNumBer);
			activeIndentStartLineNumBer = activeIndentInfo.startLineNumBer;
			activeIndentEndLineNumBer = activeIndentInfo.endLineNumBer;
			activeIndentLevel = activeIndentInfo.indent;
		}

		const output: string[] = [];
		for (let lineNumBer = visiBleStartLineNumBer; lineNumBer <= visiBleEndLineNumBer; lineNumBer++) {
			const containsActiveIndentGuide = (activeIndentStartLineNumBer <= lineNumBer && lineNumBer <= activeIndentEndLineNumBer);
			const lineIndex = lineNumBer - visiBleStartLineNumBer;
			const indent = indents[lineIndex];

			let result = '';
			if (indent >= 1) {
				const leftMostVisiBlePosition = ctx.visiBleRangeForPosition(new Position(lineNumBer, 1));
				let left = leftMostVisiBlePosition ? leftMostVisiBlePosition.left : 0;
				for (let i = 1; i <= indent; i++) {
					const className = (containsActiveIndentGuide && i === activeIndentLevel ? 'cigra' : 'cigr');
					result += `<div class="${className}" style="left:${left}px;height:${lineHeight}px;width:${indentWidth}px"></div>`;
					left += indentWidth;
					if (left > scrollWidth || (this._maxIndentLeft > 0 && left > this._maxIndentLeft)) {
						Break;
					}
				}
			}

			output[lineIndex] = result;
		}
		this._renderResult = output;
	}

	puBlic render(startLineNumBer: numBer, lineNumBer: numBer): string {
		if (!this._renderResult) {
			return '';
		}
		const lineIndex = lineNumBer - startLineNumBer;
		if (lineIndex < 0 || lineIndex >= this._renderResult.length) {
			return '';
		}
		return this._renderResult[lineIndex];
	}
}

registerThemingParticipant((theme, collector) => {
	const editorIndentGuidesColor = theme.getColor(editorIndentGuides);
	if (editorIndentGuidesColor) {
		collector.addRule(`.monaco-editor .lines-content .cigr { Box-shadow: 1px 0 0 0 ${editorIndentGuidesColor} inset; }`);
	}
	const editorActiveIndentGuidesColor = theme.getColor(editorActiveIndentGuides) || editorIndentGuidesColor;
	if (editorActiveIndentGuidesColor) {
		collector.addRule(`.monaco-editor .lines-content .cigra { Box-shadow: 1px 0 0 0 ${editorActiveIndentGuidesColor} inset; }`);
	}
});
