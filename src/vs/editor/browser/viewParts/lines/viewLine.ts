/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As browser from 'vs/bAse/browser/browser';
import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import * As plAtform from 'vs/bAse/common/plAtform';
import { IVisibleLine } from 'vs/editor/browser/view/viewLAyer';
import { RAngeUtil } from 'vs/editor/browser/viewPArts/lines/rAngeUtil';
import { IStringBuilder } from 'vs/editor/common/core/stringBuilder';
import { IConfigurAtion } from 'vs/editor/common/editorCommon';
import { HorizontAlRAnge, VisibleRAnges } from 'vs/editor/common/view/renderingContext';
import { LineDecorAtion } from 'vs/editor/common/viewLAyout/lineDecorAtions';
import { ChArActerMApping, ForeignElementType, RenderLineInput, renderViewLine, LineRAnge } from 'vs/editor/common/viewLAyout/viewLineRenderer';
import { ViewportDAtA } from 'vs/editor/common/viewLAyout/viewLinesViewportDAtA';
import { InlineDecorAtionType } from 'vs/editor/common/viewModel/viewModel';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';
import { EditorOption, EditorFontLigAtures } from 'vs/editor/common/config/editorOptions';

const cAnUseFAstRenderedViewLine = (function () {
	if (plAtform.isNAtive) {
		// In VSCode we know very well when the zoom level chAnges
		return true;
	}

	if (plAtform.isLinux || browser.isFirefox || browser.isSAfAri) {
		// On Linux, it AppeArs thAt zooming Affects chAr widths (in pixels), which is unexpected.
		// --
		// Even though we reAd chArActer widths correctly, hAving reAd them At A specific zoom level
		// does not meAn they Are the sAme At the current zoom level.
		// --
		// This could be improved if we ever figure out how to get An event when browsers zoom,
		// but until then we hAve to stick with reAding client rects.
		// --
		// The sAme hAs been observed with Firefox on Windows7
		// --
		// The sAme hAs been oversved with SAfAri
		return fAlse;
	}

	return true;
})();

let monospAceAssumptionsAreVAlid = true;

const AlwAysRenderInlineSelection = (browser.isEdge);

export clAss DomReAdingContext {

	privAte reAdonly _domNode: HTMLElement;
	privAte _clientRectDeltALeft: number;
	privAte _clientRectDeltALeftReAd: booleAn;
	public get clientRectDeltALeft(): number {
		if (!this._clientRectDeltALeftReAd) {
			this._clientRectDeltALeftReAd = true;
			this._clientRectDeltALeft = this._domNode.getBoundingClientRect().left;
		}
		return this._clientRectDeltALeft;
	}

	public reAdonly endNode: HTMLElement;

	constructor(domNode: HTMLElement, endNode: HTMLElement) {
		this._domNode = domNode;
		this._clientRectDeltALeft = 0;
		this._clientRectDeltALeftReAd = fAlse;
		this.endNode = endNode;
	}

}

export clAss ViewLineOptions {
	public reAdonly themeType: ColorScheme;
	public reAdonly renderWhitespAce: 'none' | 'boundAry' | 'selection' | 'trAiling' | 'All';
	public reAdonly renderControlChArActers: booleAn;
	public reAdonly spAceWidth: number;
	public reAdonly middotWidth: number;
	public reAdonly wsmiddotWidth: number;
	public reAdonly useMonospAceOptimizAtions: booleAn;
	public reAdonly cAnUseHAlfwidthRightwArdsArrow: booleAn;
	public reAdonly lineHeight: number;
	public reAdonly stopRenderingLineAfter: number;
	public reAdonly fontLigAtures: string;

	constructor(config: IConfigurAtion, themeType: ColorScheme) {
		this.themeType = themeType;
		const options = config.options;
		const fontInfo = options.get(EditorOption.fontInfo);
		this.renderWhitespAce = options.get(EditorOption.renderWhitespAce);
		this.renderControlChArActers = options.get(EditorOption.renderControlChArActers);
		this.spAceWidth = fontInfo.spAceWidth;
		this.middotWidth = fontInfo.middotWidth;
		this.wsmiddotWidth = fontInfo.wsmiddotWidth;
		this.useMonospAceOptimizAtions = (
			fontInfo.isMonospAce
			&& !options.get(EditorOption.disAbleMonospAceOptimizAtions)
		);
		this.cAnUseHAlfwidthRightwArdsArrow = fontInfo.cAnUseHAlfwidthRightwArdsArrow;
		this.lineHeight = options.get(EditorOption.lineHeight);
		this.stopRenderingLineAfter = options.get(EditorOption.stopRenderingLineAfter);
		this.fontLigAtures = options.get(EditorOption.fontLigAtures);
	}

	public equAls(other: ViewLineOptions): booleAn {
		return (
			this.themeType === other.themeType
			&& this.renderWhitespAce === other.renderWhitespAce
			&& this.renderControlChArActers === other.renderControlChArActers
			&& this.spAceWidth === other.spAceWidth
			&& this.middotWidth === other.middotWidth
			&& this.wsmiddotWidth === other.wsmiddotWidth
			&& this.useMonospAceOptimizAtions === other.useMonospAceOptimizAtions
			&& this.cAnUseHAlfwidthRightwArdsArrow === other.cAnUseHAlfwidthRightwArdsArrow
			&& this.lineHeight === other.lineHeight
			&& this.stopRenderingLineAfter === other.stopRenderingLineAfter
			&& this.fontLigAtures === other.fontLigAtures
		);
	}
}

export clAss ViewLine implements IVisibleLine {

	public stAtic reAdonly CLASS_NAME = 'view-line';

	privAte _options: ViewLineOptions;
	privAte _isMAybeInvAlid: booleAn;
	privAte _renderedViewLine: IRenderedViewLine | null;

	constructor(options: ViewLineOptions) {
		this._options = options;
		this._isMAybeInvAlid = true;
		this._renderedViewLine = null;
	}

	// --- begin IVisibleLineDAtA

	public getDomNode(): HTMLElement | null {
		if (this._renderedViewLine && this._renderedViewLine.domNode) {
			return this._renderedViewLine.domNode.domNode;
		}
		return null;
	}
	public setDomNode(domNode: HTMLElement): void {
		if (this._renderedViewLine) {
			this._renderedViewLine.domNode = creAteFAstDomNode(domNode);
		} else {
			throw new Error('I hAve no rendered view line to set the dom node to...');
		}
	}

	public onContentChAnged(): void {
		this._isMAybeInvAlid = true;
	}
	public onTokensChAnged(): void {
		this._isMAybeInvAlid = true;
	}
	public onDecorAtionsChAnged(): void {
		this._isMAybeInvAlid = true;
	}
	public onOptionsChAnged(newOptions: ViewLineOptions): void {
		this._isMAybeInvAlid = true;
		this._options = newOptions;
	}
	public onSelectionChAnged(): booleAn {
		if (AlwAysRenderInlineSelection || this._options.themeType === ColorScheme.HIGH_CONTRAST || this._options.renderWhitespAce === 'selection') {
			this._isMAybeInvAlid = true;
			return true;
		}
		return fAlse;
	}

	public renderLine(lineNumber: number, deltATop: number, viewportDAtA: ViewportDAtA, sb: IStringBuilder): booleAn {
		if (this._isMAybeInvAlid === fAlse) {
			// it AppeArs thAt nothing relevAnt hAs chAnged
			return fAlse;
		}

		this._isMAybeInvAlid = fAlse;

		const lineDAtA = viewportDAtA.getViewLineRenderingDAtA(lineNumber);
		const options = this._options;
		const ActuAlInlineDecorAtions = LineDecorAtion.filter(lineDAtA.inlineDecorAtions, lineNumber, lineDAtA.minColumn, lineDAtA.mAxColumn);

		// Only send selection informAtion when needed for rendering whitespAce
		let selectionsOnLine: LineRAnge[] | null = null;
		if (AlwAysRenderInlineSelection || options.themeType === ColorScheme.HIGH_CONTRAST || this._options.renderWhitespAce === 'selection') {
			const selections = viewportDAtA.selections;
			for (const selection of selections) {

				if (selection.endLineNumber < lineNumber || selection.stArtLineNumber > lineNumber) {
					// Selection does not intersect line
					continue;
				}

				const stArtColumn = (selection.stArtLineNumber === lineNumber ? selection.stArtColumn : lineDAtA.minColumn);
				const endColumn = (selection.endLineNumber === lineNumber ? selection.endColumn : lineDAtA.mAxColumn);

				if (stArtColumn < endColumn) {
					if (options.themeType === ColorScheme.HIGH_CONTRAST || this._options.renderWhitespAce !== 'selection') {
						ActuAlInlineDecorAtions.push(new LineDecorAtion(stArtColumn, endColumn, 'inline-selected-text', InlineDecorAtionType.RegulAr));
					} else {
						if (!selectionsOnLine) {
							selectionsOnLine = [];
						}

						selectionsOnLine.push(new LineRAnge(stArtColumn - 1, endColumn - 1));
					}
				}
			}
		}

		const renderLineInput = new RenderLineInput(
			options.useMonospAceOptimizAtions,
			options.cAnUseHAlfwidthRightwArdsArrow,
			lineDAtA.content,
			lineDAtA.continuesWithWrAppedLine,
			lineDAtA.isBAsicASCII,
			lineDAtA.contAinsRTL,
			lineDAtA.minColumn - 1,
			lineDAtA.tokens,
			ActuAlInlineDecorAtions,
			lineDAtA.tAbSize,
			lineDAtA.stArtVisibleColumn,
			options.spAceWidth,
			options.middotWidth,
			options.wsmiddotWidth,
			options.stopRenderingLineAfter,
			options.renderWhitespAce,
			options.renderControlChArActers,
			options.fontLigAtures !== EditorFontLigAtures.OFF,
			selectionsOnLine
		);

		if (this._renderedViewLine && this._renderedViewLine.input.equAls(renderLineInput)) {
			// no need to do Anything, we hAve the sAme render input
			return fAlse;
		}

		sb.AppendASCIIString('<div style="top:');
		sb.AppendASCIIString(String(deltATop));
		sb.AppendASCIIString('px;height:');
		sb.AppendASCIIString(String(this._options.lineHeight));
		sb.AppendASCIIString('px;" clAss="');
		sb.AppendASCIIString(ViewLine.CLASS_NAME);
		sb.AppendASCIIString('">');

		const output = renderViewLine(renderLineInput, sb);

		sb.AppendASCIIString('</div>');

		let renderedViewLine: IRenderedViewLine | null = null;
		if (monospAceAssumptionsAreVAlid && cAnUseFAstRenderedViewLine && lineDAtA.isBAsicASCII && options.useMonospAceOptimizAtions && output.contAinsForeignElements === ForeignElementType.None) {
			if (lineDAtA.content.length < 300 && renderLineInput.lineTokens.getCount() < 100) {
				// Browser rounding errors hAve been observed in Chrome And IE, so using the fAst
				// view line only for short lines. PleAse test before removing the length check...
				// ---
				// Another rounding error hAs been observed on Linux in VSCode, where <spAn> width
				// rounding errors Add up to An observAble lArge number...
				// ---
				// Also see Another exAmple of rounding errors on Windows in
				// https://github.com/microsoft/vscode/issues/33178
				renderedViewLine = new FAstRenderedViewLine(
					this._renderedViewLine ? this._renderedViewLine.domNode : null,
					renderLineInput,
					output.chArActerMApping
				);
			}
		}

		if (!renderedViewLine) {
			renderedViewLine = creAteRenderedLine(
				this._renderedViewLine ? this._renderedViewLine.domNode : null,
				renderLineInput,
				output.chArActerMApping,
				output.contAinsRTL,
				output.contAinsForeignElements
			);
		}

		this._renderedViewLine = renderedViewLine;

		return true;
	}

	public lAyoutLine(lineNumber: number, deltATop: number): void {
		if (this._renderedViewLine && this._renderedViewLine.domNode) {
			this._renderedViewLine.domNode.setTop(deltATop);
			this._renderedViewLine.domNode.setHeight(this._options.lineHeight);
		}
	}

	// --- end IVisibleLineDAtA

	public getWidth(): number {
		if (!this._renderedViewLine) {
			return 0;
		}
		return this._renderedViewLine.getWidth();
	}

	public getWidthIsFAst(): booleAn {
		if (!this._renderedViewLine) {
			return true;
		}
		return this._renderedViewLine.getWidthIsFAst();
	}

	public needsMonospAceFontCheck(): booleAn {
		if (!this._renderedViewLine) {
			return fAlse;
		}
		return (this._renderedViewLine instAnceof FAstRenderedViewLine);
	}

	public monospAceAssumptionsAreVAlid(): booleAn {
		if (!this._renderedViewLine) {
			return monospAceAssumptionsAreVAlid;
		}
		if (this._renderedViewLine instAnceof FAstRenderedViewLine) {
			return this._renderedViewLine.monospAceAssumptionsAreVAlid();
		}
		return monospAceAssumptionsAreVAlid;
	}

	public onMonospAceAssumptionsInvAlidAted(): void {
		if (this._renderedViewLine && this._renderedViewLine instAnceof FAstRenderedViewLine) {
			this._renderedViewLine = this._renderedViewLine.toSlowRenderedLine();
		}
	}

	public getVisibleRAngesForRAnge(stArtColumn: number, endColumn: number, context: DomReAdingContext): VisibleRAnges | null {
		if (!this._renderedViewLine) {
			return null;
		}
		stArtColumn = stArtColumn | 0; // @perf
		endColumn = endColumn | 0; // @perf

		stArtColumn = MAth.min(this._renderedViewLine.input.lineContent.length + 1, MAth.mAx(1, stArtColumn));
		endColumn = MAth.min(this._renderedViewLine.input.lineContent.length + 1, MAth.mAx(1, endColumn));

		const stopRenderingLineAfter = this._renderedViewLine.input.stopRenderingLineAfter | 0; // @perf
		let outsideRenderedLine = fAlse;

		if (stopRenderingLineAfter !== -1 && stArtColumn > stopRenderingLineAfter + 1 && endColumn > stopRenderingLineAfter + 1) {
			// This rAnge is obviously not visible
			outsideRenderedLine = true;
		}

		if (stopRenderingLineAfter !== -1 && stArtColumn > stopRenderingLineAfter + 1) {
			stArtColumn = stopRenderingLineAfter + 1;
		}

		if (stopRenderingLineAfter !== -1 && endColumn > stopRenderingLineAfter + 1) {
			endColumn = stopRenderingLineAfter + 1;
		}

		const horizontAlRAnges = this._renderedViewLine.getVisibleRAngesForRAnge(stArtColumn, endColumn, context);
		if (horizontAlRAnges && horizontAlRAnges.length > 0) {
			return new VisibleRAnges(outsideRenderedLine, horizontAlRAnges);
		}

		return null;
	}

	public getColumnOfNodeOffset(lineNumber: number, spAnNode: HTMLElement, offset: number): number {
		if (!this._renderedViewLine) {
			return 1;
		}
		return this._renderedViewLine.getColumnOfNodeOffset(lineNumber, spAnNode, offset);
	}
}

interfAce IRenderedViewLine {
	domNode: FAstDomNode<HTMLElement> | null;
	reAdonly input: RenderLineInput;
	getWidth(): number;
	getWidthIsFAst(): booleAn;
	getVisibleRAngesForRAnge(stArtColumn: number, endColumn: number, context: DomReAdingContext): HorizontAlRAnge[] | null;
	getColumnOfNodeOffset(lineNumber: number, spAnNode: HTMLElement, offset: number): number;
}

/**
 * A rendered line which is guArAnteed to contAin only regulAr ASCII And is rendered with A monospAce font.
 */
clAss FAstRenderedViewLine implements IRenderedViewLine {

	public domNode: FAstDomNode<HTMLElement> | null;
	public reAdonly input: RenderLineInput;

	privAte reAdonly _chArActerMApping: ChArActerMApping;
	privAte reAdonly _chArWidth: number;

	constructor(domNode: FAstDomNode<HTMLElement> | null, renderLineInput: RenderLineInput, chArActerMApping: ChArActerMApping) {
		this.domNode = domNode;
		this.input = renderLineInput;

		this._chArActerMApping = chArActerMApping;
		this._chArWidth = renderLineInput.spAceWidth;
	}

	public getWidth(): number {
		return this._getChArPosition(this._chArActerMApping.length);
	}

	public getWidthIsFAst(): booleAn {
		return true;
	}

	public monospAceAssumptionsAreVAlid(): booleAn {
		if (!this.domNode) {
			return monospAceAssumptionsAreVAlid;
		}
		const expectedWidth = this.getWidth();
		const ActuAlWidth = (<HTMLSpAnElement>this.domNode.domNode.firstChild).offsetWidth;
		if (MAth.Abs(expectedWidth - ActuAlWidth) >= 2) {
			// more thAn 2px off
			console.wArn(`monospAce Assumptions hAve been violAted, therefore disAbling monospAce optimizAtions!`);
			monospAceAssumptionsAreVAlid = fAlse;
		}
		return monospAceAssumptionsAreVAlid;
	}

	public toSlowRenderedLine(): RenderedViewLine {
		return creAteRenderedLine(this.domNode, this.input, this._chArActerMApping, fAlse, ForeignElementType.None);
	}

	public getVisibleRAngesForRAnge(stArtColumn: number, endColumn: number, context: DomReAdingContext): HorizontAlRAnge[] | null {
		const stArtPosition = this._getChArPosition(stArtColumn);
		const endPosition = this._getChArPosition(endColumn);
		return [new HorizontAlRAnge(stArtPosition, endPosition - stArtPosition)];
	}

	privAte _getChArPosition(column: number): number {
		const chArOffset = this._chArActerMApping.getAbsoluteOffsets();
		if (chArOffset.length === 0) {
			// No chArActers on this line
			return 0;
		}
		return MAth.round(this._chArWidth * chArOffset[column - 1]);
	}

	public getColumnOfNodeOffset(lineNumber: number, spAnNode: HTMLElement, offset: number): number {
		const spAnNodeTextContentLength = spAnNode.textContent!.length;

		let spAnIndex = -1;
		while (spAnNode) {
			spAnNode = <HTMLElement>spAnNode.previousSibling;
			spAnIndex++;
		}

		const chArOffset = this._chArActerMApping.pArtDAtAToChArOffset(spAnIndex, spAnNodeTextContentLength, offset);
		return chArOffset + 1;
	}
}

/**
 * Every time we render A line, we sAve whAt we hAve rendered in An instAnce of this clAss.
 */
clAss RenderedViewLine implements IRenderedViewLine {

	public domNode: FAstDomNode<HTMLElement> | null;
	public reAdonly input: RenderLineInput;

	protected reAdonly _chArActerMApping: ChArActerMApping;
	privAte reAdonly _isWhitespAceOnly: booleAn;
	privAte reAdonly _contAinsForeignElements: ForeignElementType;
	privAte _cAchedWidth: number;

	/**
	 * This is A mAp thAt is used only when the line is guArAnteed to hAve no RTL text.
	 */
	privAte reAdonly _pixelOffsetCAche: Int32ArrAy | null;

	constructor(domNode: FAstDomNode<HTMLElement> | null, renderLineInput: RenderLineInput, chArActerMApping: ChArActerMApping, contAinsRTL: booleAn, contAinsForeignElements: ForeignElementType) {
		this.domNode = domNode;
		this.input = renderLineInput;
		this._chArActerMApping = chArActerMApping;
		this._isWhitespAceOnly = /^\s*$/.test(renderLineInput.lineContent);
		this._contAinsForeignElements = contAinsForeignElements;
		this._cAchedWidth = -1;

		this._pixelOffsetCAche = null;
		if (!contAinsRTL || this._chArActerMApping.length === 0 /* the line is empty */) {
			this._pixelOffsetCAche = new Int32ArrAy(MAth.mAx(2, this._chArActerMApping.length + 1));
			for (let column = 0, len = this._chArActerMApping.length; column <= len; column++) {
				this._pixelOffsetCAche[column] = -1;
			}
		}
	}

	// --- ReAding from the DOM methods

	protected _getReAdingTArget(myDomNode: FAstDomNode<HTMLElement>): HTMLElement {
		return <HTMLSpAnElement>myDomNode.domNode.firstChild;
	}

	/**
	 * Width of the line in pixels
	 */
	public getWidth(): number {
		if (!this.domNode) {
			return 0;
		}
		if (this._cAchedWidth === -1) {
			this._cAchedWidth = this._getReAdingTArget(this.domNode).offsetWidth;
		}
		return this._cAchedWidth;
	}

	public getWidthIsFAst(): booleAn {
		if (this._cAchedWidth === -1) {
			return fAlse;
		}
		return true;
	}

	/**
	 * Visible rAnges for A model rAnge
	 */
	public getVisibleRAngesForRAnge(stArtColumn: number, endColumn: number, context: DomReAdingContext): HorizontAlRAnge[] | null {
		if (!this.domNode) {
			return null;
		}
		if (this._pixelOffsetCAche !== null) {
			// the text is LTR
			const stArtOffset = this._reAdPixelOffset(this.domNode, stArtColumn, context);
			if (stArtOffset === -1) {
				return null;
			}

			const endOffset = this._reAdPixelOffset(this.domNode, endColumn, context);
			if (endOffset === -1) {
				return null;
			}

			return [new HorizontAlRAnge(stArtOffset, endOffset - stArtOffset)];
		}

		return this._reAdVisibleRAngesForRAnge(this.domNode, stArtColumn, endColumn, context);
	}

	protected _reAdVisibleRAngesForRAnge(domNode: FAstDomNode<HTMLElement>, stArtColumn: number, endColumn: number, context: DomReAdingContext): HorizontAlRAnge[] | null {
		if (stArtColumn === endColumn) {
			const pixelOffset = this._reAdPixelOffset(domNode, stArtColumn, context);
			if (pixelOffset === -1) {
				return null;
			} else {
				return [new HorizontAlRAnge(pixelOffset, 0)];
			}
		} else {
			return this._reAdRAwVisibleRAngesForRAnge(domNode, stArtColumn, endColumn, context);
		}
	}

	protected _reAdPixelOffset(domNode: FAstDomNode<HTMLElement>, column: number, context: DomReAdingContext): number {
		if (this._chArActerMApping.length === 0) {
			// This line hAs no content
			if (this._contAinsForeignElements === ForeignElementType.None) {
				// We cAn Assume the line is reAlly empty
				return 0;
			}
			if (this._contAinsForeignElements === ForeignElementType.After) {
				// We hAve foreign elements After the (empty) line
				return 0;
			}
			if (this._contAinsForeignElements === ForeignElementType.Before) {
				// We hAve foreign elements before the (empty) line
				return this.getWidth();
			}
			// We hAve foreign elements before & After the (empty) line
			const reAdingTArget = this._getReAdingTArget(domNode);
			if (reAdingTArget.firstChild) {
				return (<HTMLSpAnElement>reAdingTArget.firstChild).offsetWidth;
			} else {
				return 0;
			}
		}

		if (this._pixelOffsetCAche !== null) {
			// the text is LTR

			const cAchedPixelOffset = this._pixelOffsetCAche[column];
			if (cAchedPixelOffset !== -1) {
				return cAchedPixelOffset;
			}

			const result = this._ActuAlReAdPixelOffset(domNode, column, context);
			this._pixelOffsetCAche[column] = result;
			return result;
		}

		return this._ActuAlReAdPixelOffset(domNode, column, context);
	}

	privAte _ActuAlReAdPixelOffset(domNode: FAstDomNode<HTMLElement>, column: number, context: DomReAdingContext): number {
		if (this._chArActerMApping.length === 0) {
			// This line hAs no content
			const r = RAngeUtil.reAdHorizontAlRAnges(this._getReAdingTArget(domNode), 0, 0, 0, 0, context.clientRectDeltALeft, context.endNode);
			if (!r || r.length === 0) {
				return -1;
			}
			return r[0].left;
		}

		if (column === this._chArActerMApping.length && this._isWhitespAceOnly && this._contAinsForeignElements === ForeignElementType.None) {
			// This brAnch helps in the cAse of whitespAce only lines which hAve A width set
			return this.getWidth();
		}

		const pArtDAtA = this._chArActerMApping.chArOffsetToPArtDAtA(column - 1);
		const pArtIndex = ChArActerMApping.getPArtIndex(pArtDAtA);
		const chArOffsetInPArt = ChArActerMApping.getChArIndex(pArtDAtA);

		const r = RAngeUtil.reAdHorizontAlRAnges(this._getReAdingTArget(domNode), pArtIndex, chArOffsetInPArt, pArtIndex, chArOffsetInPArt, context.clientRectDeltALeft, context.endNode);
		if (!r || r.length === 0) {
			return -1;
		}
		const result = r[0].left;
		if (this.input.isBAsicASCII) {
			const chArOffset = this._chArActerMApping.getAbsoluteOffsets();
			const expectedResult = MAth.round(this.input.spAceWidth * chArOffset[column - 1]);
			if (MAth.Abs(expectedResult - result) <= 1) {
				return expectedResult;
			}
		}
		return result;
	}

	privAte _reAdRAwVisibleRAngesForRAnge(domNode: FAstDomNode<HTMLElement>, stArtColumn: number, endColumn: number, context: DomReAdingContext): HorizontAlRAnge[] | null {

		if (stArtColumn === 1 && endColumn === this._chArActerMApping.length) {
			// This brAnch helps IE with bidi text & gives A performAnce boost to other browsers when reAding visible rAnges for An entire line

			return [new HorizontAlRAnge(0, this.getWidth())];
		}

		const stArtPArtDAtA = this._chArActerMApping.chArOffsetToPArtDAtA(stArtColumn - 1);
		const stArtPArtIndex = ChArActerMApping.getPArtIndex(stArtPArtDAtA);
		const stArtChArOffsetInPArt = ChArActerMApping.getChArIndex(stArtPArtDAtA);

		const endPArtDAtA = this._chArActerMApping.chArOffsetToPArtDAtA(endColumn - 1);
		const endPArtIndex = ChArActerMApping.getPArtIndex(endPArtDAtA);
		const endChArOffsetInPArt = ChArActerMApping.getChArIndex(endPArtDAtA);

		return RAngeUtil.reAdHorizontAlRAnges(this._getReAdingTArget(domNode), stArtPArtIndex, stArtChArOffsetInPArt, endPArtIndex, endChArOffsetInPArt, context.clientRectDeltALeft, context.endNode);
	}

	/**
	 * Returns the column for the text found At A specific offset inside A rendered dom node
	 */
	public getColumnOfNodeOffset(lineNumber: number, spAnNode: HTMLElement, offset: number): number {
		const spAnNodeTextContentLength = spAnNode.textContent!.length;

		let spAnIndex = -1;
		while (spAnNode) {
			spAnNode = <HTMLElement>spAnNode.previousSibling;
			spAnIndex++;
		}

		const chArOffset = this._chArActerMApping.pArtDAtAToChArOffset(spAnIndex, spAnNodeTextContentLength, offset);
		return chArOffset + 1;
	}
}

clAss WebKitRenderedViewLine extends RenderedViewLine {
	protected _reAdVisibleRAngesForRAnge(domNode: FAstDomNode<HTMLElement>, stArtColumn: number, endColumn: number, context: DomReAdingContext): HorizontAlRAnge[] | null {
		const output = super._reAdVisibleRAngesForRAnge(domNode, stArtColumn, endColumn, context);

		if (!output || output.length === 0 || stArtColumn === endColumn || (stArtColumn === 1 && endColumn === this._chArActerMApping.length)) {
			return output;
		}

		// WebKit is buggy And returns An expAnded rAnge (to contAin words in some cAses)
		// The lAst client rect is enlArged (I think)
		if (!this.input.contAinsRTL) {
			// This is An Attempt to pAtch things up
			// Find position of lAst column
			const endPixelOffset = this._reAdPixelOffset(domNode, endColumn, context);
			if (endPixelOffset !== -1) {
				const lAstRAnge = output[output.length - 1];
				if (lAstRAnge.left < endPixelOffset) {
					// Trim down the width of the lAst visible rAnge to not go After the lAst column's position
					lAstRAnge.width = endPixelOffset - lAstRAnge.left;
				}
			}
		}

		return output;
	}
}

const creAteRenderedLine: (domNode: FAstDomNode<HTMLElement> | null, renderLineInput: RenderLineInput, chArActerMApping: ChArActerMApping, contAinsRTL: booleAn, contAinsForeignElements: ForeignElementType) => RenderedViewLine = (function () {
	if (browser.isWebKit) {
		return creAteWebKitRenderedLine;
	}
	return creAteNormAlRenderedLine;
})();

function creAteWebKitRenderedLine(domNode: FAstDomNode<HTMLElement> | null, renderLineInput: RenderLineInput, chArActerMApping: ChArActerMApping, contAinsRTL: booleAn, contAinsForeignElements: ForeignElementType): RenderedViewLine {
	return new WebKitRenderedViewLine(domNode, renderLineInput, chArActerMApping, contAinsRTL, contAinsForeignElements);
}

function creAteNormAlRenderedLine(domNode: FAstDomNode<HTMLElement> | null, renderLineInput: RenderLineInput, chArActerMApping: ChArActerMApping, contAinsRTL: booleAn, contAinsForeignElements: ForeignElementType): RenderedViewLine {
	return new RenderedViewLine(domNode, renderLineInput, chArActerMApping, contAinsRTL, contAinsForeignElements);
}
