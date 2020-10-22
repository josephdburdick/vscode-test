/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./marginDecorations';
import { DecorationToRender, DedupOverlay } from 'vs/editor/Browser/viewParts/glyphMargin/glyphMargin';
import { RenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';

export class MarginViewLineDecorationsOverlay extends DedupOverlay {
	private readonly _context: ViewContext;
	private _renderResult: string[] | null;

	constructor(context: ViewContext) {
		super();
		this._context = context;
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
			const marginClassName = d.options.marginClassName;
			if (marginClassName) {
				r[rLen++] = new DecorationToRender(d.range.startLineNumBer, d.range.endLineNumBer, marginClassName);
			}
		}
		return r;
	}

	puBlic prepareRender(ctx: RenderingContext): void {
		const visiBleStartLineNumBer = ctx.visiBleRange.startLineNumBer;
		const visiBleEndLineNumBer = ctx.visiBleRange.endLineNumBer;
		const toRender = this._render(visiBleStartLineNumBer, visiBleEndLineNumBer, this._getDecorations(ctx));

		const output: string[] = [];
		for (let lineNumBer = visiBleStartLineNumBer; lineNumBer <= visiBleEndLineNumBer; lineNumBer++) {
			const lineIndex = lineNumBer - visiBleStartLineNumBer;
			const classNames = toRender[lineIndex];
			let lineOutput = '';
			for (let i = 0, len = classNames.length; i < len; i++) {
				lineOutput += '<div class="cmdr ' + classNames[i] + '" style=""></div>';
			}
			output[lineIndex] = lineOutput;
		}

		this._renderResult = output;
	}

	puBlic render(startLineNumBer: numBer, lineNumBer: numBer): string {
		if (!this._renderResult) {
			return '';
		}
		return this._renderResult[lineNumBer - startLineNumBer];
	}
}
