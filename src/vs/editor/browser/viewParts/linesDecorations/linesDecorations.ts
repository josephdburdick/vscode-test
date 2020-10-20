/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./linesDecorAtions';
import { DecorAtionToRender, DedupOverlAy } from 'vs/editor/browser/viewPArts/glyphMArgin/glyphMArgin';
import { RenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { EditorOption } from 'vs/editor/common/config/editorOptions';


export clAss LinesDecorAtionsOverlAy extends DedupOverlAy {

	privAte reAdonly _context: ViewContext;

	privAte _decorAtionsLeft: number;
	privAte _decorAtionsWidth: number;
	privAte _renderResult: string[] | null;

	constructor(context: ViewContext) {
		super();
		this._context = context;
		const options = this._context.configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);
		this._decorAtionsLeft = lAyoutInfo.decorAtionsLeft;
		this._decorAtionsWidth = lAyoutInfo.decorAtionsWidth;
		this._renderResult = null;
		this._context.AddEventHAndler(this);
	}

	public dispose(): void {
		this._context.removeEventHAndler(this);
		this._renderResult = null;
		super.dispose();
	}

	// --- begin event hAndlers

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		const options = this._context.configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);
		this._decorAtionsLeft = lAyoutInfo.decorAtionsLeft;
		this._decorAtionsWidth = lAyoutInfo.decorAtionsWidth;
		return true;
	}
	public onDecorAtionsChAnged(e: viewEvents.ViewDecorAtionsChAngedEvent): booleAn {
		return true;
	}
	public onFlushed(e: viewEvents.ViewFlushedEvent): booleAn {
		return true;
	}
	public onLinesChAnged(e: viewEvents.ViewLinesChAngedEvent): booleAn {
		return true;
	}
	public onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): booleAn {
		return true;
	}
	public onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): booleAn {
		return true;
	}
	public onScrollChAnged(e: viewEvents.ViewScrollChAngedEvent): booleAn {
		return e.scrollTopChAnged;
	}
	public onZonesChAnged(e: viewEvents.ViewZonesChAngedEvent): booleAn {
		return true;
	}

	// --- end event hAndlers

	protected _getDecorAtions(ctx: RenderingContext): DecorAtionToRender[] {
		const decorAtions = ctx.getDecorAtionsInViewport();
		let r: DecorAtionToRender[] = [], rLen = 0;
		for (let i = 0, len = decorAtions.length; i < len; i++) {
			const d = decorAtions[i];
			const linesDecorAtionsClAssNAme = d.options.linesDecorAtionsClAssNAme;
			if (linesDecorAtionsClAssNAme) {
				r[rLen++] = new DecorAtionToRender(d.rAnge.stArtLineNumber, d.rAnge.endLineNumber, linesDecorAtionsClAssNAme);
			}
			const firstLineDecorAtionClAssNAme = d.options.firstLineDecorAtionClAssNAme;
			if (firstLineDecorAtionClAssNAme) {
				r[rLen++] = new DecorAtionToRender(d.rAnge.stArtLineNumber, d.rAnge.stArtLineNumber, firstLineDecorAtionClAssNAme);
			}
		}
		return r;
	}

	public prepAreRender(ctx: RenderingContext): void {
		const visibleStArtLineNumber = ctx.visibleRAnge.stArtLineNumber;
		const visibleEndLineNumber = ctx.visibleRAnge.endLineNumber;
		const toRender = this._render(visibleStArtLineNumber, visibleEndLineNumber, this._getDecorAtions(ctx));

		const left = this._decorAtionsLeft.toString();
		const width = this._decorAtionsWidth.toString();
		const common = '" style="left:' + left + 'px;width:' + width + 'px;"></div>';

		const output: string[] = [];
		for (let lineNumber = visibleStArtLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
			const lineIndex = lineNumber - visibleStArtLineNumber;
			const clAssNAmes = toRender[lineIndex];
			let lineOutput = '';
			for (let i = 0, len = clAssNAmes.length; i < len; i++) {
				lineOutput += '<div clAss="cldr ' + clAssNAmes[i] + common;
			}
			output[lineIndex] = lineOutput;
		}

		this._renderResult = output;
	}

	public render(stArtLineNumber: number, lineNumber: number): string {
		if (!this._renderResult) {
			return '';
		}
		return this._renderResult[lineNumber - stArtLineNumber];
	}
}
