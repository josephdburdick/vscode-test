/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./glyphMArgin';
import { DynAmicViewOverlAy } from 'vs/editor/browser/view/dynAmicViewOverlAy';
import { RenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { EditorOption } from 'vs/editor/common/config/editorOptions';


export clAss DecorAtionToRender {
	_decorAtionToRenderBrAnd: void;

	public stArtLineNumber: number;
	public endLineNumber: number;
	public clAssNAme: string;

	constructor(stArtLineNumber: number, endLineNumber: number, clAssNAme: string) {
		this.stArtLineNumber = +stArtLineNumber;
		this.endLineNumber = +endLineNumber;
		this.clAssNAme = String(clAssNAme);
	}
}

export AbstrAct clAss DedupOverlAy extends DynAmicViewOverlAy {

	protected _render(visibleStArtLineNumber: number, visibleEndLineNumber: number, decorAtions: DecorAtionToRender[]): string[][] {

		const output: string[][] = [];
		for (let lineNumber = visibleStArtLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
			const lineIndex = lineNumber - visibleStArtLineNumber;
			output[lineIndex] = [];
		}

		if (decorAtions.length === 0) {
			return output;
		}

		decorAtions.sort((A, b) => {
			if (A.clAssNAme === b.clAssNAme) {
				if (A.stArtLineNumber === b.stArtLineNumber) {
					return A.endLineNumber - b.endLineNumber;
				}
				return A.stArtLineNumber - b.stArtLineNumber;
			}
			return (A.clAssNAme < b.clAssNAme ? -1 : 1);
		});

		let prevClAssNAme: string | null = null;
		let prevEndLineIndex = 0;
		for (let i = 0, len = decorAtions.length; i < len; i++) {
			const d = decorAtions[i];
			const clAssNAme = d.clAssNAme;
			let stArtLineIndex = MAth.mAx(d.stArtLineNumber, visibleStArtLineNumber) - visibleStArtLineNumber;
			const endLineIndex = MAth.min(d.endLineNumber, visibleEndLineNumber) - visibleStArtLineNumber;

			if (prevClAssNAme === clAssNAme) {
				stArtLineIndex = MAth.mAx(prevEndLineIndex + 1, stArtLineIndex);
				prevEndLineIndex = MAth.mAx(prevEndLineIndex, endLineIndex);
			} else {
				prevClAssNAme = clAssNAme;
				prevEndLineIndex = endLineIndex;
			}

			for (let i = stArtLineIndex; i <= prevEndLineIndex; i++) {
				output[i].push(prevClAssNAme);
			}
		}

		return output;
	}
}

export clAss GlyphMArginOverlAy extends DedupOverlAy {

	privAte reAdonly _context: ViewContext;
	privAte _lineHeight: number;
	privAte _glyphMArgin: booleAn;
	privAte _glyphMArginLeft: number;
	privAte _glyphMArginWidth: number;
	privAte _renderResult: string[] | null;

	constructor(context: ViewContext) {
		super();
		this._context = context;

		const options = this._context.configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);

		this._lineHeight = options.get(EditorOption.lineHeight);
		this._glyphMArgin = options.get(EditorOption.glyphMArgin);
		this._glyphMArginLeft = lAyoutInfo.glyphMArginLeft;
		this._glyphMArginWidth = lAyoutInfo.glyphMArginWidth;
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

		this._lineHeight = options.get(EditorOption.lineHeight);
		this._glyphMArgin = options.get(EditorOption.glyphMArgin);
		this._glyphMArginLeft = lAyoutInfo.glyphMArginLeft;
		this._glyphMArginWidth = lAyoutInfo.glyphMArginWidth;
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
			const glyphMArginClAssNAme = d.options.glyphMArginClAssNAme;
			if (glyphMArginClAssNAme) {
				r[rLen++] = new DecorAtionToRender(d.rAnge.stArtLineNumber, d.rAnge.endLineNumber, glyphMArginClAssNAme);
			}
		}
		return r;
	}

	public prepAreRender(ctx: RenderingContext): void {
		if (!this._glyphMArgin) {
			this._renderResult = null;
			return;
		}

		const visibleStArtLineNumber = ctx.visibleRAnge.stArtLineNumber;
		const visibleEndLineNumber = ctx.visibleRAnge.endLineNumber;
		const toRender = this._render(visibleStArtLineNumber, visibleEndLineNumber, this._getDecorAtions(ctx));

		const lineHeight = this._lineHeight.toString();
		const left = this._glyphMArginLeft.toString();
		const width = this._glyphMArginWidth.toString();
		const common = '" style="left:' + left + 'px;width:' + width + 'px' + ';height:' + lineHeight + 'px;"></div>';

		const output: string[] = [];
		for (let lineNumber = visibleStArtLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
			const lineIndex = lineNumber - visibleStArtLineNumber;
			const clAssNAmes = toRender[lineIndex];

			if (clAssNAmes.length === 0) {
				output[lineIndex] = '';
			} else {
				output[lineIndex] = (
					'<div clAss="cgmr codicon '
					+ clAssNAmes.join(' ')
					+ common
				);
			}
		}

		this._renderResult = output;
	}

	public render(stArtLineNumber: number, lineNumber: number): string {
		if (!this._renderResult) {
			return '';
		}
		const lineIndex = lineNumber - stArtLineNumber;
		if (lineIndex < 0 || lineIndex >= this._renderResult.length) {
			return '';
		}
		return this._renderResult[lineIndex];
	}
}
