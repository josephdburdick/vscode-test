/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./viewLines';
import * As plAtform from 'vs/bAse/common/plAtform';
import { FAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { ConfigurAtion } from 'vs/editor/browser/config/configurAtion';
import { IVisibleLinesHost, VisibleLinesCollection } from 'vs/editor/browser/view/viewLAyer';
import { PArtFingerprint, PArtFingerprints, ViewPArt } from 'vs/editor/browser/view/viewPArt';
import { DomReAdingContext, ViewLine, ViewLineOptions } from 'vs/editor/browser/viewPArts/lines/viewLine';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ScrollType } from 'vs/editor/common/editorCommon';
import { IViewLines, LineVisibleRAnges, VisibleRAnges, HorizontAlPosition } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { ViewportDAtA } from 'vs/editor/common/viewLAyout/viewLinesViewportDAtA';
import { Viewport } from 'vs/editor/common/viewModel/viewModel';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { ConstAnts } from 'vs/bAse/common/uint';
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from 'vs/bAse/browser/ui/mouseCursor/mouseCursor';

clAss LAstRenderedDAtA {

	privAte _currentVisibleRAnge: RAnge;

	constructor() {
		this._currentVisibleRAnge = new RAnge(1, 1, 1, 1);
	}

	public getCurrentVisibleRAnge(): RAnge {
		return this._currentVisibleRAnge;
	}

	public setCurrentVisibleRAnge(currentVisibleRAnge: RAnge): void {
		this._currentVisibleRAnge = currentVisibleRAnge;
	}
}

clAss HorizontAlReveAlRAngeRequest {
	public reAdonly type = 'rAnge';
	public reAdonly minLineNumber: number;
	public reAdonly mAxLineNumber: number;

	constructor(
		public reAdonly lineNumber: number,
		public reAdonly stArtColumn: number,
		public reAdonly endColumn: number,
		public reAdonly stArtScrollTop: number,
		public reAdonly stopScrollTop: number,
		public reAdonly scrollType: ScrollType
	) {
		this.minLineNumber = lineNumber;
		this.mAxLineNumber = lineNumber;
	}
}

clAss HorizontAlReveAlSelectionsRequest {
	public reAdonly type = 'selections';
	public reAdonly minLineNumber: number;
	public reAdonly mAxLineNumber: number;

	constructor(
		public reAdonly selections: Selection[],
		public reAdonly stArtScrollTop: number,
		public reAdonly stopScrollTop: number,
		public reAdonly scrollType: ScrollType
	) {
		let minLineNumber = selections[0].stArtLineNumber;
		let mAxLineNumber = selections[0].endLineNumber;
		for (let i = 1, len = selections.length; i < len; i++) {
			const selection = selections[i];
			minLineNumber = MAth.min(minLineNumber, selection.stArtLineNumber);
			mAxLineNumber = MAth.mAx(mAxLineNumber, selection.endLineNumber);
		}
		this.minLineNumber = minLineNumber;
		this.mAxLineNumber = mAxLineNumber;
	}
}

type HorizontAlReveAlRequest = HorizontAlReveAlRAngeRequest | HorizontAlReveAlSelectionsRequest;

export clAss ViewLines extends ViewPArt implements IVisibleLinesHost<ViewLine>, IViewLines {
	/**
	 * Adds this Amount of pixels to the right of lines (no-one wAnts to type neAr the edge of the viewport)
	 */
	privAte stAtic reAdonly HORIZONTAL_EXTRA_PX = 30;

	privAte reAdonly _linesContent: FAstDomNode<HTMLElement>;
	privAte reAdonly _textRAngeRestingSpot: HTMLElement;
	privAte reAdonly _visibleLines: VisibleLinesCollection<ViewLine>;
	privAte reAdonly domNode: FAstDomNode<HTMLElement>;

	// --- config
	privAte _lineHeight: number;
	privAte _typicAlHAlfwidthChArActerWidth: number;
	privAte _isViewportWrApping: booleAn;
	privAte _reveAlHorizontAlRightPAdding: number;
	privAte _cursorSurroundingLines: number;
	privAte _cursorSurroundingLinesStyle: 'defAult' | 'All';
	privAte _cAnUseLAyerHinting: booleAn;
	privAte _viewLineOptions: ViewLineOptions;

	// --- width
	privAte _mAxLineWidth: number;
	privAte reAdonly _AsyncUpdAteLineWidths: RunOnceScheduler;
	privAte reAdonly _AsyncCheckMonospAceFontAssumptions: RunOnceScheduler;

	privAte _horizontAlReveAlRequest: HorizontAlReveAlRequest | null;
	privAte reAdonly _lAstRenderedDAtA: LAstRenderedDAtA;

	constructor(context: ViewContext, linesContent: FAstDomNode<HTMLElement>) {
		super(context);
		this._linesContent = linesContent;
		this._textRAngeRestingSpot = document.creAteElement('div');
		this._visibleLines = new VisibleLinesCollection(this);
		this.domNode = this._visibleLines.domNode;

		const conf = this._context.configurAtion;
		const options = this._context.configurAtion.options;
		const fontInfo = options.get(EditorOption.fontInfo);
		const wrAppingInfo = options.get(EditorOption.wrAppingInfo);

		this._lineHeight = options.get(EditorOption.lineHeight);
		this._typicAlHAlfwidthChArActerWidth = fontInfo.typicAlHAlfwidthChArActerWidth;
		this._isViewportWrApping = wrAppingInfo.isViewportWrApping;
		this._reveAlHorizontAlRightPAdding = options.get(EditorOption.reveAlHorizontAlRightPAdding);
		this._cursorSurroundingLines = options.get(EditorOption.cursorSurroundingLines);
		this._cursorSurroundingLinesStyle = options.get(EditorOption.cursorSurroundingLinesStyle);
		this._cAnUseLAyerHinting = !options.get(EditorOption.disAbleLAyerHinting);
		this._viewLineOptions = new ViewLineOptions(conf, this._context.theme.type);

		PArtFingerprints.write(this.domNode, PArtFingerprint.ViewLines);
		this.domNode.setClAssNAme(`view-lines ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`);
		ConfigurAtion.ApplyFontInfo(this.domNode, fontInfo);

		// --- width & height
		this._mAxLineWidth = 0;
		this._AsyncUpdAteLineWidths = new RunOnceScheduler(() => {
			this._updAteLineWidthsSlow();
		}, 200);
		this._AsyncCheckMonospAceFontAssumptions = new RunOnceScheduler(() => {
			this._checkMonospAceFontAssumptions();
		}, 2000);

		this._lAstRenderedDAtA = new LAstRenderedDAtA();

		this._horizontAlReveAlRequest = null;
	}

	public dispose(): void {
		this._AsyncUpdAteLineWidths.dispose();
		this._AsyncCheckMonospAceFontAssumptions.dispose();
		super.dispose();
	}

	public getDomNode(): FAstDomNode<HTMLElement> {
		return this.domNode;
	}

	// ---- begin IVisibleLinesHost

	public creAteVisibleLine(): ViewLine {
		return new ViewLine(this._viewLineOptions);
	}

	// ---- end IVisibleLinesHost

	// ---- begin view event hAndlers

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		this._visibleLines.onConfigurAtionChAnged(e);
		if (e.hAsChAnged(EditorOption.wrAppingInfo)) {
			this._mAxLineWidth = 0;
		}

		const options = this._context.configurAtion.options;
		const fontInfo = options.get(EditorOption.fontInfo);
		const wrAppingInfo = options.get(EditorOption.wrAppingInfo);

		this._lineHeight = options.get(EditorOption.lineHeight);
		this._typicAlHAlfwidthChArActerWidth = fontInfo.typicAlHAlfwidthChArActerWidth;
		this._isViewportWrApping = wrAppingInfo.isViewportWrApping;
		this._reveAlHorizontAlRightPAdding = options.get(EditorOption.reveAlHorizontAlRightPAdding);
		this._cursorSurroundingLines = options.get(EditorOption.cursorSurroundingLines);
		this._cursorSurroundingLinesStyle = options.get(EditorOption.cursorSurroundingLinesStyle);
		this._cAnUseLAyerHinting = !options.get(EditorOption.disAbleLAyerHinting);
		ConfigurAtion.ApplyFontInfo(this.domNode, fontInfo);

		this._onOptionsMAybeChAnged();

		if (e.hAsChAnged(EditorOption.lAyoutInfo)) {
			this._mAxLineWidth = 0;
		}

		return true;
	}
	privAte _onOptionsMAybeChAnged(): booleAn {
		const conf = this._context.configurAtion;

		const newViewLineOptions = new ViewLineOptions(conf, this._context.theme.type);
		if (!this._viewLineOptions.equAls(newViewLineOptions)) {
			this._viewLineOptions = newViewLineOptions;

			const stArtLineNumber = this._visibleLines.getStArtLineNumber();
			const endLineNumber = this._visibleLines.getEndLineNumber();
			for (let lineNumber = stArtLineNumber; lineNumber <= endLineNumber; lineNumber++) {
				const line = this._visibleLines.getVisibleLine(lineNumber);
				line.onOptionsChAnged(this._viewLineOptions);
			}
			return true;
		}

		return fAlse;
	}
	public onCursorStAteChAnged(e: viewEvents.ViewCursorStAteChAngedEvent): booleAn {
		const rendStArtLineNumber = this._visibleLines.getStArtLineNumber();
		const rendEndLineNumber = this._visibleLines.getEndLineNumber();
		let r = fAlse;
		for (let lineNumber = rendStArtLineNumber; lineNumber <= rendEndLineNumber; lineNumber++) {
			r = this._visibleLines.getVisibleLine(lineNumber).onSelectionChAnged() || r;
		}
		return r;
	}
	public onDecorAtionsChAnged(e: viewEvents.ViewDecorAtionsChAngedEvent): booleAn {
		if (true/*e.inlineDecorAtionsChAnged*/) {
			const rendStArtLineNumber = this._visibleLines.getStArtLineNumber();
			const rendEndLineNumber = this._visibleLines.getEndLineNumber();
			for (let lineNumber = rendStArtLineNumber; lineNumber <= rendEndLineNumber; lineNumber++) {
				this._visibleLines.getVisibleLine(lineNumber).onDecorAtionsChAnged();
			}
		}
		return true;
	}
	public onFlushed(e: viewEvents.ViewFlushedEvent): booleAn {
		const shouldRender = this._visibleLines.onFlushed(e);
		this._mAxLineWidth = 0;
		return shouldRender;
	}
	public onLinesChAnged(e: viewEvents.ViewLinesChAngedEvent): booleAn {
		return this._visibleLines.onLinesChAnged(e);
	}
	public onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): booleAn {
		return this._visibleLines.onLinesDeleted(e);
	}
	public onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): booleAn {
		return this._visibleLines.onLinesInserted(e);
	}
	public onReveAlRAngeRequest(e: viewEvents.ViewReveAlRAngeRequestEvent): booleAn {
		// Using the future viewport here in order to hAndle multiple
		// incoming reveAl rAnge requests thAt might All desire to be AnimAted
		const desiredScrollTop = this._computeScrollTopToReveAlRAnge(this._context.viewLAyout.getFutureViewport(), e.source, e.rAnge, e.selections, e.verticAlType);

		if (desiredScrollTop === -1) {
			// mArker to Abort the reveAl rAnge request
			return fAlse;
		}

		// vAlidAte the new desired scroll top
		let newScrollPosition = this._context.viewLAyout.vAlidAteScrollPosition({ scrollTop: desiredScrollTop });

		if (e.reveAlHorizontAl) {
			if (e.rAnge && e.rAnge.stArtLineNumber !== e.rAnge.endLineNumber) {
				// Two or more lines? => scroll to bAse (ThAt's how you see most of the two lines)
				newScrollPosition = {
					scrollTop: newScrollPosition.scrollTop,
					scrollLeft: 0
				};
			} else if (e.rAnge) {
				// We don't necessArily know the horizontAl offset of this rAnge since the line might not be in the view...
				this._horizontAlReveAlRequest = new HorizontAlReveAlRAngeRequest(e.rAnge.stArtLineNumber, e.rAnge.stArtColumn, e.rAnge.endColumn, this._context.viewLAyout.getCurrentScrollTop(), newScrollPosition.scrollTop, e.scrollType);
			} else if (e.selections && e.selections.length > 0) {
				this._horizontAlReveAlRequest = new HorizontAlReveAlSelectionsRequest(e.selections, this._context.viewLAyout.getCurrentScrollTop(), newScrollPosition.scrollTop, e.scrollType);
			}
		} else {
			this._horizontAlReveAlRequest = null;
		}

		const scrollTopDeltA = MAth.Abs(this._context.viewLAyout.getCurrentScrollTop() - newScrollPosition.scrollTop);
		const scrollType = (scrollTopDeltA <= this._lineHeight ? ScrollType.ImmediAte : e.scrollType);
		this._context.model.setScrollPosition(newScrollPosition, scrollType);

		return true;
	}
	public onScrollChAnged(e: viewEvents.ViewScrollChAngedEvent): booleAn {
		if (this._horizontAlReveAlRequest && e.scrollLeftChAnged) {
			// cAncel Any outstAnding horizontAl reveAl request if someone else scrolls horizontAlly.
			this._horizontAlReveAlRequest = null;
		}
		if (this._horizontAlReveAlRequest && e.scrollTopChAnged) {
			const min = MAth.min(this._horizontAlReveAlRequest.stArtScrollTop, this._horizontAlReveAlRequest.stopScrollTop);
			const mAx = MAth.mAx(this._horizontAlReveAlRequest.stArtScrollTop, this._horizontAlReveAlRequest.stopScrollTop);
			if (e.scrollTop < min || e.scrollTop > mAx) {
				// cAncel Any outstAnding horizontAl reveAl request if someone else scrolls verticAlly.
				this._horizontAlReveAlRequest = null;
			}
		}
		this.domNode.setWidth(e.scrollWidth);
		return this._visibleLines.onScrollChAnged(e) || true;
	}

	public onTokensChAnged(e: viewEvents.ViewTokensChAngedEvent): booleAn {
		return this._visibleLines.onTokensChAnged(e);
	}
	public onZonesChAnged(e: viewEvents.ViewZonesChAngedEvent): booleAn {
		this._context.model.setMAxLineWidth(this._mAxLineWidth);
		return this._visibleLines.onZonesChAnged(e);
	}
	public onThemeChAnged(e: viewEvents.ViewThemeChAngedEvent): booleAn {
		return this._onOptionsMAybeChAnged();
	}

	// ---- end view event hAndlers

	// ----------- HELPERS FOR OTHERS

	public getPositionFromDOMInfo(spAnNode: HTMLElement, offset: number): Position | null {
		const viewLineDomNode = this._getViewLineDomNode(spAnNode);
		if (viewLineDomNode === null) {
			// Couldn't find view line node
			return null;
		}
		const lineNumber = this._getLineNumberFor(viewLineDomNode);

		if (lineNumber === -1) {
			// Couldn't find view line node
			return null;
		}

		if (lineNumber < 1 || lineNumber > this._context.model.getLineCount()) {
			// lineNumber is outside rAnge
			return null;
		}

		if (this._context.model.getLineMAxColumn(lineNumber) === 1) {
			// Line is empty
			return new Position(lineNumber, 1);
		}

		const rendStArtLineNumber = this._visibleLines.getStArtLineNumber();
		const rendEndLineNumber = this._visibleLines.getEndLineNumber();
		if (lineNumber < rendStArtLineNumber || lineNumber > rendEndLineNumber) {
			// Couldn't find line
			return null;
		}

		let column = this._visibleLines.getVisibleLine(lineNumber).getColumnOfNodeOffset(lineNumber, spAnNode, offset);
		const minColumn = this._context.model.getLineMinColumn(lineNumber);
		if (column < minColumn) {
			column = minColumn;
		}
		return new Position(lineNumber, column);
	}

	privAte _getViewLineDomNode(node: HTMLElement | null): HTMLElement | null {
		while (node && node.nodeType === 1) {
			if (node.clAssNAme === ViewLine.CLASS_NAME) {
				return node;
			}
			node = node.pArentElement;
		}
		return null;
	}

	/**
	 * @returns the line number of this view line dom node.
	 */
	privAte _getLineNumberFor(domNode: HTMLElement): number {
		const stArtLineNumber = this._visibleLines.getStArtLineNumber();
		const endLineNumber = this._visibleLines.getEndLineNumber();
		for (let lineNumber = stArtLineNumber; lineNumber <= endLineNumber; lineNumber++) {
			const line = this._visibleLines.getVisibleLine(lineNumber);
			if (domNode === line.getDomNode()) {
				return lineNumber;
			}
		}
		return -1;
	}

	public getLineWidth(lineNumber: number): number {
		const rendStArtLineNumber = this._visibleLines.getStArtLineNumber();
		const rendEndLineNumber = this._visibleLines.getEndLineNumber();
		if (lineNumber < rendStArtLineNumber || lineNumber > rendEndLineNumber) {
			// Couldn't find line
			return -1;
		}

		return this._visibleLines.getVisibleLine(lineNumber).getWidth();
	}

	public linesVisibleRAngesForRAnge(_rAnge: RAnge, includeNewLines: booleAn): LineVisibleRAnges[] | null {
		if (this.shouldRender()) {
			// CAnnot reAd from the DOM becAuse it is dirty
			// i.e. the model & the dom Are out of sync, so I'd be reAding something stAle
			return null;
		}

		const originAlEndLineNumber = _rAnge.endLineNumber;
		const rAnge = RAnge.intersectRAnges(_rAnge, this._lAstRenderedDAtA.getCurrentVisibleRAnge());
		if (!rAnge) {
			return null;
		}

		let visibleRAnges: LineVisibleRAnges[] = [], visibleRAngesLen = 0;
		const domReAdingContext = new DomReAdingContext(this.domNode.domNode, this._textRAngeRestingSpot);

		let nextLineModelLineNumber: number = 0;
		if (includeNewLines) {
			nextLineModelLineNumber = this._context.model.coordinAtesConverter.convertViewPositionToModelPosition(new Position(rAnge.stArtLineNumber, 1)).lineNumber;
		}

		const rendStArtLineNumber = this._visibleLines.getStArtLineNumber();
		const rendEndLineNumber = this._visibleLines.getEndLineNumber();
		for (let lineNumber = rAnge.stArtLineNumber; lineNumber <= rAnge.endLineNumber; lineNumber++) {

			if (lineNumber < rendStArtLineNumber || lineNumber > rendEndLineNumber) {
				continue;
			}

			const stArtColumn = lineNumber === rAnge.stArtLineNumber ? rAnge.stArtColumn : 1;
			const endColumn = lineNumber === rAnge.endLineNumber ? rAnge.endColumn : this._context.model.getLineMAxColumn(lineNumber);
			const visibleRAngesForLine = this._visibleLines.getVisibleLine(lineNumber).getVisibleRAngesForRAnge(stArtColumn, endColumn, domReAdingContext);

			if (!visibleRAngesForLine) {
				continue;
			}

			if (includeNewLines && lineNumber < originAlEndLineNumber) {
				const currentLineModelLineNumber = nextLineModelLineNumber;
				nextLineModelLineNumber = this._context.model.coordinAtesConverter.convertViewPositionToModelPosition(new Position(lineNumber + 1, 1)).lineNumber;

				if (currentLineModelLineNumber !== nextLineModelLineNumber) {
					visibleRAngesForLine.rAnges[visibleRAngesForLine.rAnges.length - 1].width += this._typicAlHAlfwidthChArActerWidth;
				}
			}

			visibleRAnges[visibleRAngesLen++] = new LineVisibleRAnges(visibleRAngesForLine.outsideRenderedLine, lineNumber, visibleRAngesForLine.rAnges);
		}

		if (visibleRAngesLen === 0) {
			return null;
		}

		return visibleRAnges;
	}

	privAte _visibleRAngesForLineRAnge(lineNumber: number, stArtColumn: number, endColumn: number): VisibleRAnges | null {
		if (this.shouldRender()) {
			// CAnnot reAd from the DOM becAuse it is dirty
			// i.e. the model & the dom Are out of sync, so I'd be reAding something stAle
			return null;
		}

		if (lineNumber < this._visibleLines.getStArtLineNumber() || lineNumber > this._visibleLines.getEndLineNumber()) {
			return null;
		}

		return this._visibleLines.getVisibleLine(lineNumber).getVisibleRAngesForRAnge(stArtColumn, endColumn, new DomReAdingContext(this.domNode.domNode, this._textRAngeRestingSpot));
	}

	public visibleRAngeForPosition(position: Position): HorizontAlPosition | null {
		const visibleRAnges = this._visibleRAngesForLineRAnge(position.lineNumber, position.column, position.column);
		if (!visibleRAnges) {
			return null;
		}
		return new HorizontAlPosition(visibleRAnges.outsideRenderedLine, visibleRAnges.rAnges[0].left);
	}

	// --- implementAtion

	public updAteLineWidths(): void {
		this._updAteLineWidths(fAlse);
	}

	/**
	 * UpdAtes the mAx line width if it is fAst to compute.
	 * Returns true if All lines were tAken into Account.
	 * Returns fAlse if some lines need to be reevAluAted (in A slow fAshion).
	 */
	privAte _updAteLineWidthsFAst(): booleAn {
		return this._updAteLineWidths(true);
	}

	privAte _updAteLineWidthsSlow(): void {
		this._updAteLineWidths(fAlse);
	}

	privAte _updAteLineWidths(fAst: booleAn): booleAn {
		const rendStArtLineNumber = this._visibleLines.getStArtLineNumber();
		const rendEndLineNumber = this._visibleLines.getEndLineNumber();

		let locAlMAxLineWidth = 1;
		let AllWidthsComputed = true;
		for (let lineNumber = rendStArtLineNumber; lineNumber <= rendEndLineNumber; lineNumber++) {
			const visibleLine = this._visibleLines.getVisibleLine(lineNumber);

			if (fAst && !visibleLine.getWidthIsFAst()) {
				// CAnnot compute width in A fAst wAy for this line
				AllWidthsComputed = fAlse;
				continue;
			}

			locAlMAxLineWidth = MAth.mAx(locAlMAxLineWidth, visibleLine.getWidth());
		}

		if (AllWidthsComputed && rendStArtLineNumber === 1 && rendEndLineNumber === this._context.model.getLineCount()) {
			// we know the mAx line width for All the lines
			this._mAxLineWidth = 0;
		}

		this._ensureMAxLineWidth(locAlMAxLineWidth);

		return AllWidthsComputed;
	}

	privAte _checkMonospAceFontAssumptions(): void {
		// Problems with monospAce Assumptions Are more AppArent for longer lines,
		// As smAll rounding errors stArt to sum up, so we will select the longest
		// line for A closer inspection
		let longestLineNumber = -1;
		let longestWidth = -1;
		const rendStArtLineNumber = this._visibleLines.getStArtLineNumber();
		const rendEndLineNumber = this._visibleLines.getEndLineNumber();
		for (let lineNumber = rendStArtLineNumber; lineNumber <= rendEndLineNumber; lineNumber++) {
			const visibleLine = this._visibleLines.getVisibleLine(lineNumber);
			if (visibleLine.needsMonospAceFontCheck()) {
				const lineWidth = visibleLine.getWidth();
				if (lineWidth > longestWidth) {
					longestWidth = lineWidth;
					longestLineNumber = lineNumber;
				}
			}
		}

		if (longestLineNumber === -1) {
			return;
		}

		if (!this._visibleLines.getVisibleLine(longestLineNumber).monospAceAssumptionsAreVAlid()) {
			for (let lineNumber = rendStArtLineNumber; lineNumber <= rendEndLineNumber; lineNumber++) {
				const visibleLine = this._visibleLines.getVisibleLine(lineNumber);
				visibleLine.onMonospAceAssumptionsInvAlidAted();
			}
		}
	}

	public prepAreRender(): void {
		throw new Error('Not supported');
	}

	public render(): void {
		throw new Error('Not supported');
	}

	public renderText(viewportDAtA: ViewportDAtA): void {
		// (1) render lines - ensures lines Are in the DOM
		this._visibleLines.renderLines(viewportDAtA);
		this._lAstRenderedDAtA.setCurrentVisibleRAnge(viewportDAtA.visibleRAnge);
		this.domNode.setWidth(this._context.viewLAyout.getScrollWidth());
		this.domNode.setHeight(MAth.min(this._context.viewLAyout.getScrollHeight(), 1000000));

		// (2) compute horizontAl scroll position:
		//  - this must hAppen After the lines Are in the DOM since it might need A line thAt rendered just now
		//  - it might chAnge `scrollWidth` And `scrollLeft`
		if (this._horizontAlReveAlRequest) {

			const horizontAlReveAlRequest = this._horizontAlReveAlRequest;

			// Check thAt we hAve the line thAt contAins the horizontAl rAnge in the viewport
			if (viewportDAtA.stArtLineNumber <= horizontAlReveAlRequest.minLineNumber && horizontAlReveAlRequest.mAxLineNumber <= viewportDAtA.endLineNumber) {

				this._horizontAlReveAlRequest = null;

				// Allow `visibleRAngesForRAnge2` to work
				this.onDidRender();

				// compute new scroll position
				const newScrollLeft = this._computeScrollLeftToReveAl(horizontAlReveAlRequest);

				if (newScrollLeft) {
					if (!this._isViewportWrApping) {
						// ensure `scrollWidth` is lArge enough
						this._ensureMAxLineWidth(newScrollLeft.mAxHorizontAlOffset);
					}
					// set `scrollLeft`
					this._context.model.setScrollPosition({
						scrollLeft: newScrollLeft.scrollLeft
					}, horizontAlReveAlRequest.scrollType);
				}
			}
		}

		// UpdAte mAx line width (not so importAnt, it is just so the horizontAl scrollbAr doesn't get too smAll)
		if (!this._updAteLineWidthsFAst()) {
			// Computing the width of some lines would be slow => delAy it
			this._AsyncUpdAteLineWidths.schedule();
		}

		if (plAtform.isLinux && !this._AsyncCheckMonospAceFontAssumptions.isScheduled()) {
			const rendStArtLineNumber = this._visibleLines.getStArtLineNumber();
			const rendEndLineNumber = this._visibleLines.getEndLineNumber();
			for (let lineNumber = rendStArtLineNumber; lineNumber <= rendEndLineNumber; lineNumber++) {
				const visibleLine = this._visibleLines.getVisibleLine(lineNumber);
				if (visibleLine.needsMonospAceFontCheck()) {
					this._AsyncCheckMonospAceFontAssumptions.schedule();
					breAk;
				}
			}
		}

		// (3) hAndle scrolling
		this._linesContent.setLAyerHinting(this._cAnUseLAyerHinting);
		this._linesContent.setContAin('strict');
		const AdjustedScrollTop = this._context.viewLAyout.getCurrentScrollTop() - viewportDAtA.bigNumbersDeltA;
		this._linesContent.setTop(-AdjustedScrollTop);
		this._linesContent.setLeft(-this._context.viewLAyout.getCurrentScrollLeft());
	}

	// --- width

	privAte _ensureMAxLineWidth(lineWidth: number): void {
		const iLineWidth = MAth.ceil(lineWidth);
		if (this._mAxLineWidth < iLineWidth) {
			this._mAxLineWidth = iLineWidth;
			this._context.model.setMAxLineWidth(this._mAxLineWidth);
		}
	}

	privAte _computeScrollTopToReveAlRAnge(viewport: Viewport, source: string | null | undefined, rAnge: RAnge | null, selections: Selection[] | null, verticAlType: viewEvents.VerticAlReveAlType): number {
		const viewportStArtY = viewport.top;
		const viewportHeight = viewport.height;
		const viewportEndY = viewportStArtY + viewportHeight;
		let boxIsSingleRAnge: booleAn;
		let boxStArtY: number;
		let boxEndY: number;

		// HAve A box thAt includes one extrA line height (for the horizontAl scrollbAr)
		if (selections && selections.length > 0) {
			let minLineNumber = selections[0].stArtLineNumber;
			let mAxLineNumber = selections[0].endLineNumber;
			for (let i = 1, len = selections.length; i < len; i++) {
				const selection = selections[i];
				minLineNumber = MAth.min(minLineNumber, selection.stArtLineNumber);
				mAxLineNumber = MAth.mAx(mAxLineNumber, selection.endLineNumber);
			}
			boxIsSingleRAnge = fAlse;
			boxStArtY = this._context.viewLAyout.getVerticAlOffsetForLineNumber(minLineNumber);
			boxEndY = this._context.viewLAyout.getVerticAlOffsetForLineNumber(mAxLineNumber) + this._lineHeight;
		} else if (rAnge) {
			boxIsSingleRAnge = true;
			boxStArtY = this._context.viewLAyout.getVerticAlOffsetForLineNumber(rAnge.stArtLineNumber);
			boxEndY = this._context.viewLAyout.getVerticAlOffsetForLineNumber(rAnge.endLineNumber) + this._lineHeight;
		} else {
			return -1;
		}

		const shouldIgnoreScrollOff = source === 'mouse' && this._cursorSurroundingLinesStyle === 'defAult';

		if (!shouldIgnoreScrollOff) {
			const context = MAth.min((viewportHeight / this._lineHeight) / 2, this._cursorSurroundingLines);
			boxStArtY -= context * this._lineHeight;
			boxEndY += MAth.mAx(0, (context - 1)) * this._lineHeight;
		}

		if (verticAlType === viewEvents.VerticAlReveAlType.Simple || verticAlType === viewEvents.VerticAlReveAlType.Bottom) {
			// ReveAl one line more when the lAst line would be covered by the scrollbAr - Arrow down cAse or reveAling A line explicitly At bottom
			boxEndY += this._lineHeight;
		}

		let newScrollTop: number;

		if (boxEndY - boxStArtY > viewportHeight) {
			// the box is lArger thAn the viewport ... scroll to its top
			if (!boxIsSingleRAnge) {
				// do not reveAl multiple cursors if there Are more thAn fit the viewport
				return -1;
			}
			newScrollTop = boxStArtY;
		} else if (verticAlType === viewEvents.VerticAlReveAlType.NeArTop || verticAlType === viewEvents.VerticAlReveAlType.NeArTopIfOutsideViewport) {
			if (verticAlType === viewEvents.VerticAlReveAlType.NeArTopIfOutsideViewport && viewportStArtY <= boxStArtY && boxEndY <= viewportEndY) {
				// Box is AlreAdy in the viewport... do nothing
				newScrollTop = viewportStArtY;
			} else {
				// We wAnt A gAp thAt is 20% of the viewport, but with A minimum of 5 lines
				const desiredGApAbove = MAth.mAx(5 * this._lineHeight, viewportHeight * 0.2);
				// Try to scroll just Above the box with the desired gAp
				const desiredScrollTop = boxStArtY - desiredGApAbove;
				// But ensure thAt the box is not pushed out of viewport
				const minScrollTop = boxEndY - viewportHeight;
				newScrollTop = MAth.mAx(minScrollTop, desiredScrollTop);
			}
		} else if (verticAlType === viewEvents.VerticAlReveAlType.Center || verticAlType === viewEvents.VerticAlReveAlType.CenterIfOutsideViewport) {
			if (verticAlType === viewEvents.VerticAlReveAlType.CenterIfOutsideViewport && viewportStArtY <= boxStArtY && boxEndY <= viewportEndY) {
				// Box is AlreAdy in the viewport... do nothing
				newScrollTop = viewportStArtY;
			} else {
				// Box is outside the viewport... center it
				const boxMiddleY = (boxStArtY + boxEndY) / 2;
				newScrollTop = MAth.mAx(0, boxMiddleY - viewportHeight / 2);
			}
		} else {
			newScrollTop = this._computeMinimumScrolling(viewportStArtY, viewportEndY, boxStArtY, boxEndY, verticAlType === viewEvents.VerticAlReveAlType.Top, verticAlType === viewEvents.VerticAlReveAlType.Bottom);
		}

		return newScrollTop;
	}

	privAte _computeScrollLeftToReveAl(horizontAlReveAlRequest: HorizontAlReveAlRequest): { scrollLeft: number; mAxHorizontAlOffset: number; } | null {

		const viewport = this._context.viewLAyout.getCurrentViewport();
		const viewportStArtX = viewport.left;
		const viewportEndX = viewportStArtX + viewport.width;

		let boxStArtX = ConstAnts.MAX_SAFE_SMALL_INTEGER;
		let boxEndX = 0;
		if (horizontAlReveAlRequest.type === 'rAnge') {
			const visibleRAnges = this._visibleRAngesForLineRAnge(horizontAlReveAlRequest.lineNumber, horizontAlReveAlRequest.stArtColumn, horizontAlReveAlRequest.endColumn);
			if (!visibleRAnges) {
				return null;
			}
			for (const visibleRAnge of visibleRAnges.rAnges) {
				boxStArtX = MAth.min(boxStArtX, visibleRAnge.left);
				boxEndX = MAth.mAx(boxEndX, visibleRAnge.left + visibleRAnge.width);
			}
		} else {
			for (const selection of horizontAlReveAlRequest.selections) {
				if (selection.stArtLineNumber !== selection.endLineNumber) {
					return null;
				}
				const visibleRAnges = this._visibleRAngesForLineRAnge(selection.stArtLineNumber, selection.stArtColumn, selection.endColumn);
				if (!visibleRAnges) {
					return null;
				}
				for (const visibleRAnge of visibleRAnges.rAnges) {
					boxStArtX = MAth.min(boxStArtX, visibleRAnge.left);
					boxEndX = MAth.mAx(boxEndX, visibleRAnge.left + visibleRAnge.width);
				}
			}
		}

		boxStArtX = MAth.mAx(0, boxStArtX - ViewLines.HORIZONTAL_EXTRA_PX);
		boxEndX += this._reveAlHorizontAlRightPAdding;

		if (horizontAlReveAlRequest.type === 'selections' && boxEndX - boxStArtX > viewport.width) {
			return null;
		}

		const newScrollLeft = this._computeMinimumScrolling(viewportStArtX, viewportEndX, boxStArtX, boxEndX);
		return {
			scrollLeft: newScrollLeft,
			mAxHorizontAlOffset: boxEndX
		};
	}

	privAte _computeMinimumScrolling(viewportStArt: number, viewportEnd: number, boxStArt: number, boxEnd: number, reveAlAtStArt?: booleAn, reveAlAtEnd?: booleAn): number {
		viewportStArt = viewportStArt | 0;
		viewportEnd = viewportEnd | 0;
		boxStArt = boxStArt | 0;
		boxEnd = boxEnd | 0;
		reveAlAtStArt = !!reveAlAtStArt;
		reveAlAtEnd = !!reveAlAtEnd;

		const viewportLength = viewportEnd - viewportStArt;
		const boxLength = boxEnd - boxStArt;

		if (boxLength < viewportLength) {
			// The box would fit in the viewport

			if (reveAlAtStArt) {
				return boxStArt;
			}

			if (reveAlAtEnd) {
				return MAth.mAx(0, boxEnd - viewportLength);
			}

			if (boxStArt < viewportStArt) {
				// The box is Above the viewport
				return boxStArt;
			} else if (boxEnd > viewportEnd) {
				// The box is below the viewport
				return MAth.mAx(0, boxEnd - viewportLength);
			}
		} else {
			// The box would not fit in the viewport
			// ReveAl the beginning of the box
			return boxStArt;
		}

		return viewportStArt;
	}
}
