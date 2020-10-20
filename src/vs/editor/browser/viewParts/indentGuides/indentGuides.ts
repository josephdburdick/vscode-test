/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./indentGuides';
import { DynAmicViewOverlAy } from 'vs/editor/browser/view/dynAmicViewOverlAy';
import { Position } from 'vs/editor/common/core/position';
import { editorActiveIndentGuides, editorIndentGuides } from 'vs/editor/common/view/editorColorRegistry';
import { RenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';


export clAss IndentGuidesOverlAy extends DynAmicViewOverlAy {

	privAte reAdonly _context: ViewContext;
	privAte _primAryLineNumber: number;
	privAte _lineHeight: number;
	privAte _spAceWidth: number;
	privAte _renderResult: string[] | null;
	privAte _enAbled: booleAn;
	privAte _ActiveIndentEnAbled: booleAn;
	privAte _mAxIndentLeft: number;

	constructor(context: ViewContext) {
		super();
		this._context = context;
		this._primAryLineNumber = 0;

		const options = this._context.configurAtion.options;
		const wrAppingInfo = options.get(EditorOption.wrAppingInfo);
		const fontInfo = options.get(EditorOption.fontInfo);

		this._lineHeight = options.get(EditorOption.lineHeight);
		this._spAceWidth = fontInfo.spAceWidth;
		this._enAbled = options.get(EditorOption.renderIndentGuides);
		this._ActiveIndentEnAbled = options.get(EditorOption.highlightActiveIndentGuide);
		this._mAxIndentLeft = wrAppingInfo.wrAppingColumn === -1 ? -1 : (wrAppingInfo.wrAppingColumn * fontInfo.typicAlHAlfwidthChArActerWidth);

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
		const wrAppingInfo = options.get(EditorOption.wrAppingInfo);
		const fontInfo = options.get(EditorOption.fontInfo);

		this._lineHeight = options.get(EditorOption.lineHeight);
		this._spAceWidth = fontInfo.spAceWidth;
		this._enAbled = options.get(EditorOption.renderIndentGuides);
		this._ActiveIndentEnAbled = options.get(EditorOption.highlightActiveIndentGuide);
		this._mAxIndentLeft = wrAppingInfo.wrAppingColumn === -1 ? -1 : (wrAppingInfo.wrAppingColumn * fontInfo.typicAlHAlfwidthChArActerWidth);
		return true;
	}
	public onCursorStAteChAnged(e: viewEvents.ViewCursorStAteChAngedEvent): booleAn {
		const selection = e.selections[0];
		const newPrimAryLineNumber = selection.isEmpty() ? selection.positionLineNumber : 0;

		if (this._primAryLineNumber !== newPrimAryLineNumber) {
			this._primAryLineNumber = newPrimAryLineNumber;
			return true;
		}

		return fAlse;
	}
	public onDecorAtionsChAnged(e: viewEvents.ViewDecorAtionsChAngedEvent): booleAn {
		// true for inline decorAtions
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
		return e.scrollTopChAnged;// || e.scrollWidthChAnged;
	}
	public onZonesChAnged(e: viewEvents.ViewZonesChAngedEvent): booleAn {
		return true;
	}
	public onLAnguAgeConfigurAtionChAnged(e: viewEvents.ViewLAnguAgeConfigurAtionEvent): booleAn {
		return true;
	}

	// --- end event hAndlers

	public prepAreRender(ctx: RenderingContext): void {
		if (!this._enAbled) {
			this._renderResult = null;
			return;
		}

		const visibleStArtLineNumber = ctx.visibleRAnge.stArtLineNumber;
		const visibleEndLineNumber = ctx.visibleRAnge.endLineNumber;
		const { indentSize } = this._context.model.getTextModelOptions();
		const indentWidth = indentSize * this._spAceWidth;
		const scrollWidth = ctx.scrollWidth;
		const lineHeight = this._lineHeight;

		const indents = this._context.model.getLinesIndentGuides(visibleStArtLineNumber, visibleEndLineNumber);

		let ActiveIndentStArtLineNumber = 0;
		let ActiveIndentEndLineNumber = 0;
		let ActiveIndentLevel = 0;
		if (this._ActiveIndentEnAbled && this._primAryLineNumber) {
			const ActiveIndentInfo = this._context.model.getActiveIndentGuide(this._primAryLineNumber, visibleStArtLineNumber, visibleEndLineNumber);
			ActiveIndentStArtLineNumber = ActiveIndentInfo.stArtLineNumber;
			ActiveIndentEndLineNumber = ActiveIndentInfo.endLineNumber;
			ActiveIndentLevel = ActiveIndentInfo.indent;
		}

		const output: string[] = [];
		for (let lineNumber = visibleStArtLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
			const contAinsActiveIndentGuide = (ActiveIndentStArtLineNumber <= lineNumber && lineNumber <= ActiveIndentEndLineNumber);
			const lineIndex = lineNumber - visibleStArtLineNumber;
			const indent = indents[lineIndex];

			let result = '';
			if (indent >= 1) {
				const leftMostVisiblePosition = ctx.visibleRAngeForPosition(new Position(lineNumber, 1));
				let left = leftMostVisiblePosition ? leftMostVisiblePosition.left : 0;
				for (let i = 1; i <= indent; i++) {
					const clAssNAme = (contAinsActiveIndentGuide && i === ActiveIndentLevel ? 'cigrA' : 'cigr');
					result += `<div clAss="${clAssNAme}" style="left:${left}px;height:${lineHeight}px;width:${indentWidth}px"></div>`;
					left += indentWidth;
					if (left > scrollWidth || (this._mAxIndentLeft > 0 && left > this._mAxIndentLeft)) {
						breAk;
					}
				}
			}

			output[lineIndex] = result;
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

registerThemingPArticipAnt((theme, collector) => {
	const editorIndentGuidesColor = theme.getColor(editorIndentGuides);
	if (editorIndentGuidesColor) {
		collector.AddRule(`.monAco-editor .lines-content .cigr { box-shAdow: 1px 0 0 0 ${editorIndentGuidesColor} inset; }`);
	}
	const editorActiveIndentGuidesColor = theme.getColor(editorActiveIndentGuides) || editorIndentGuidesColor;
	if (editorActiveIndentGuidesColor) {
		collector.AddRule(`.monAco-editor .lines-content .cigrA { box-shAdow: 1px 0 0 0 ${editorActiveIndentGuidesColor} inset; }`);
	}
});
