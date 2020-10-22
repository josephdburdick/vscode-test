/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./lineNumBers';
import * as platform from 'vs/Base/common/platform';
import { DynamicViewOverlay } from 'vs/editor/Browser/view/dynamicViewOverlay';
import { RenderLineNumBersType, EditorOption } from 'vs/editor/common/config/editorOptions';
import { Position } from 'vs/editor/common/core/position';
import { editorActiveLineNumBer, editorLineNumBers } from 'vs/editor/common/view/editorColorRegistry';
import { RenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';

export class LineNumBersOverlay extends DynamicViewOverlay {

	puBlic static readonly CLASS_NAME = 'line-numBers';

	private readonly _context: ViewContext;

	private _lineHeight!: numBer;
	private _renderLineNumBers!: RenderLineNumBersType;
	private _renderCustomLineNumBers!: ((lineNumBer: numBer) => string) | null;
	private _renderFinalNewline!: Boolean;
	private _lineNumBersLeft!: numBer;
	private _lineNumBersWidth!: numBer;
	private _lastCursorModelPosition: Position;
	private _renderResult: string[] | null;

	constructor(context: ViewContext) {
		super();
		this._context = context;

		this._readConfig();

		this._lastCursorModelPosition = new Position(1, 1);
		this._renderResult = null;
		this._context.addEventHandler(this);
	}

	private _readConfig(): void {
		const options = this._context.configuration.options;
		this._lineHeight = options.get(EditorOption.lineHeight);
		const lineNumBers = options.get(EditorOption.lineNumBers);
		this._renderLineNumBers = lineNumBers.renderType;
		this._renderCustomLineNumBers = lineNumBers.renderFn;
		this._renderFinalNewline = options.get(EditorOption.renderFinalNewline);
		const layoutInfo = options.get(EditorOption.layoutInfo);
		this._lineNumBersLeft = layoutInfo.lineNumBersLeft;
		this._lineNumBersWidth = layoutInfo.lineNumBersWidth;
	}

	puBlic dispose(): void {
		this._context.removeEventHandler(this);
		this._renderResult = null;
		super.dispose();
	}

	// --- Begin event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		this._readConfig();
		return true;
	}
	puBlic onCursorStateChanged(e: viewEvents.ViewCursorStateChangedEvent): Boolean {
		const primaryViewPosition = e.selections[0].getPosition();
		this._lastCursorModelPosition = this._context.model.coordinatesConverter.convertViewPositionToModelPosition(primaryViewPosition);

		if (this._renderLineNumBers === RenderLineNumBersType.Relative || this._renderLineNumBers === RenderLineNumBersType.Interval) {
			return true;
		}
		return false;
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
		return e.scrollTopChanged;
	}
	puBlic onZonesChanged(e: viewEvents.ViewZonesChangedEvent): Boolean {
		return true;
	}

	// --- end event handlers

	private _getLineRenderLineNumBer(viewLineNumBer: numBer): string {
		const modelPosition = this._context.model.coordinatesConverter.convertViewPositionToModelPosition(new Position(viewLineNumBer, 1));
		if (modelPosition.column !== 1) {
			return '';
		}
		const modelLineNumBer = modelPosition.lineNumBer;

		if (this._renderCustomLineNumBers) {
			return this._renderCustomLineNumBers(modelLineNumBer);
		}

		if (this._renderLineNumBers === RenderLineNumBersType.Relative) {
			const diff = Math.aBs(this._lastCursorModelPosition.lineNumBer - modelLineNumBer);
			if (diff === 0) {
				return '<span class="relative-current-line-numBer">' + modelLineNumBer + '</span>';
			}
			return String(diff);
		}

		if (this._renderLineNumBers === RenderLineNumBersType.Interval) {
			if (this._lastCursorModelPosition.lineNumBer === modelLineNumBer) {
				return String(modelLineNumBer);
			}
			if (modelLineNumBer % 10 === 0) {
				return String(modelLineNumBer);
			}
			return '';
		}

		return String(modelLineNumBer);
	}

	puBlic prepareRender(ctx: RenderingContext): void {
		if (this._renderLineNumBers === RenderLineNumBersType.Off) {
			this._renderResult = null;
			return;
		}

		const lineHeightClassName = (platform.isLinux ? (this._lineHeight % 2 === 0 ? ' lh-even' : ' lh-odd') : '');
		const visiBleStartLineNumBer = ctx.visiBleRange.startLineNumBer;
		const visiBleEndLineNumBer = ctx.visiBleRange.endLineNumBer;
		const common = '<div class="' + LineNumBersOverlay.CLASS_NAME + lineHeightClassName + '" style="left:' + this._lineNumBersLeft.toString() + 'px;width:' + this._lineNumBersWidth.toString() + 'px;">';

		const lineCount = this._context.model.getLineCount();
		const output: string[] = [];
		for (let lineNumBer = visiBleStartLineNumBer; lineNumBer <= visiBleEndLineNumBer; lineNumBer++) {
			const lineIndex = lineNumBer - visiBleStartLineNumBer;

			if (!this._renderFinalNewline) {
				if (lineNumBer === lineCount && this._context.model.getLineLength(lineNumBer) === 0) {
					// Do not render last (empty) line
					output[lineIndex] = '';
					continue;
				}
			}

			const renderLineNumBer = this._getLineRenderLineNumBer(lineNumBer);

			if (renderLineNumBer) {
				output[lineIndex] = (
					common
					+ renderLineNumBer
					+ '</div>'
				);
			} else {
				output[lineIndex] = '';
			}
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

// theming

registerThemingParticipant((theme, collector) => {
	const lineNumBers = theme.getColor(editorLineNumBers);
	if (lineNumBers) {
		collector.addRule(`.monaco-editor .line-numBers { color: ${lineNumBers}; }`);
	}
	const activeLineNumBer = theme.getColor(editorActiveLineNumBer);
	if (activeLineNumBer) {
		collector.addRule(`.monaco-editor .current-line ~ .line-numBers { color: ${activeLineNumBer}; }`);
	}
});
