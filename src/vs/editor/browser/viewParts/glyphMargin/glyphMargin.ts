/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./glyphMargin';
import { DynamicViewOverlay } from 'vs/editor/Browser/view/dynamicViewOverlay';
import { RenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { EditorOption } from 'vs/editor/common/config/editorOptions';


export class DecorationToRender {
	_decorationToRenderBrand: void;

	puBlic startLineNumBer: numBer;
	puBlic endLineNumBer: numBer;
	puBlic className: string;

	constructor(startLineNumBer: numBer, endLineNumBer: numBer, className: string) {
		this.startLineNumBer = +startLineNumBer;
		this.endLineNumBer = +endLineNumBer;
		this.className = String(className);
	}
}

export aBstract class DedupOverlay extends DynamicViewOverlay {

	protected _render(visiBleStartLineNumBer: numBer, visiBleEndLineNumBer: numBer, decorations: DecorationToRender[]): string[][] {

		const output: string[][] = [];
		for (let lineNumBer = visiBleStartLineNumBer; lineNumBer <= visiBleEndLineNumBer; lineNumBer++) {
			const lineIndex = lineNumBer - visiBleStartLineNumBer;
			output[lineIndex] = [];
		}

		if (decorations.length === 0) {
			return output;
		}

		decorations.sort((a, B) => {
			if (a.className === B.className) {
				if (a.startLineNumBer === B.startLineNumBer) {
					return a.endLineNumBer - B.endLineNumBer;
				}
				return a.startLineNumBer - B.startLineNumBer;
			}
			return (a.className < B.className ? -1 : 1);
		});

		let prevClassName: string | null = null;
		let prevEndLineIndex = 0;
		for (let i = 0, len = decorations.length; i < len; i++) {
			const d = decorations[i];
			const className = d.className;
			let startLineIndex = Math.max(d.startLineNumBer, visiBleStartLineNumBer) - visiBleStartLineNumBer;
			const endLineIndex = Math.min(d.endLineNumBer, visiBleEndLineNumBer) - visiBleStartLineNumBer;

			if (prevClassName === className) {
				startLineIndex = Math.max(prevEndLineIndex + 1, startLineIndex);
				prevEndLineIndex = Math.max(prevEndLineIndex, endLineIndex);
			} else {
				prevClassName = className;
				prevEndLineIndex = endLineIndex;
			}

			for (let i = startLineIndex; i <= prevEndLineIndex; i++) {
				output[i].push(prevClassName);
			}
		}

		return output;
	}
}

export class GlyphMarginOverlay extends DedupOverlay {

	private readonly _context: ViewContext;
	private _lineHeight: numBer;
	private _glyphMargin: Boolean;
	private _glyphMarginLeft: numBer;
	private _glyphMarginWidth: numBer;
	private _renderResult: string[] | null;

	constructor(context: ViewContext) {
		super();
		this._context = context;

		const options = this._context.configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);

		this._lineHeight = options.get(EditorOption.lineHeight);
		this._glyphMargin = options.get(EditorOption.glyphMargin);
		this._glyphMarginLeft = layoutInfo.glyphMarginLeft;
		this._glyphMarginWidth = layoutInfo.glyphMarginWidth;
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
		const layoutInfo = options.get(EditorOption.layoutInfo);

		this._lineHeight = options.get(EditorOption.lineHeight);
		this._glyphMargin = options.get(EditorOption.glyphMargin);
		this._glyphMarginLeft = layoutInfo.glyphMarginLeft;
		this._glyphMarginWidth = layoutInfo.glyphMarginWidth;
		return true;
	}
	puBlic onDecorationsChanged(e: viewEvents.ViewDecorationsChangedEvent): Boolean {
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
		return e.scrollTopChanged;
	}
	puBlic onZonesChanged(e: viewEvents.ViewZonesChangedEvent): Boolean {
		return true;
	}

	// --- end event handlers

	protected _getDecorations(ctx: RenderingContext): DecorationToRender[] {
		const decorations = ctx.getDecorationsInViewport();
		let r: DecorationToRender[] = [], rLen = 0;
		for (let i = 0, len = decorations.length; i < len; i++) {
			const d = decorations[i];
			const glyphMarginClassName = d.options.glyphMarginClassName;
			if (glyphMarginClassName) {
				r[rLen++] = new DecorationToRender(d.range.startLineNumBer, d.range.endLineNumBer, glyphMarginClassName);
			}
		}
		return r;
	}

	puBlic prepareRender(ctx: RenderingContext): void {
		if (!this._glyphMargin) {
			this._renderResult = null;
			return;
		}

		const visiBleStartLineNumBer = ctx.visiBleRange.startLineNumBer;
		const visiBleEndLineNumBer = ctx.visiBleRange.endLineNumBer;
		const toRender = this._render(visiBleStartLineNumBer, visiBleEndLineNumBer, this._getDecorations(ctx));

		const lineHeight = this._lineHeight.toString();
		const left = this._glyphMarginLeft.toString();
		const width = this._glyphMarginWidth.toString();
		const common = '" style="left:' + left + 'px;width:' + width + 'px' + ';height:' + lineHeight + 'px;"></div>';

		const output: string[] = [];
		for (let lineNumBer = visiBleStartLineNumBer; lineNumBer <= visiBleEndLineNumBer; lineNumBer++) {
			const lineIndex = lineNumBer - visiBleStartLineNumBer;
			const classNames = toRender[lineIndex];

			if (classNames.length === 0) {
				output[lineIndex] = '';
			} else {
				output[lineIndex] = (
					'<div class="cgmr codicon '
					+ classNames.join(' ')
					+ common
				);
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
