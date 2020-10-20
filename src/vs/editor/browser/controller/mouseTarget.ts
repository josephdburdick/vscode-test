/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As browser from 'vs/bAse/browser/browser';
import { IPointerHAndlerHelper } from 'vs/editor/browser/controller/mouseHAndler';
import { IMouseTArget, MouseTArgetType } from 'vs/editor/browser/editorBrowser';
import { ClientCoordinAtes, EditorMouseEvent, EditorPAgePosition, PAgeCoordinAtes } from 'vs/editor/browser/editorDom';
import { PArtFingerprint, PArtFingerprints } from 'vs/editor/browser/view/viewPArt';
import { ViewLine } from 'vs/editor/browser/viewPArts/lines/viewLine';
import { IViewCursorRenderDAtA } from 'vs/editor/browser/viewPArts/viewCursors/viewCursor';
import { EditorLAyoutInfo, EditorOption } from 'vs/editor/common/config/editorOptions';
import { Position } from 'vs/editor/common/core/position';
import { RAnge As EditorRAnge } from 'vs/editor/common/core/rAnge';
import { HorizontAlPosition } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import { IViewModel } from 'vs/editor/common/viewModel/viewModel';
import { CursorColumns } from 'vs/editor/common/controller/cursorCommon';
import * As dom from 'vs/bAse/browser/dom';

export interfAce IViewZoneDAtA {
	viewZoneId: string;
	positionBefore: Position | null;
	positionAfter: Position | null;
	position: Position;
	AfterLineNumber: number;
}

export interfAce IMArginDAtA {
	isAfterLines: booleAn;
	glyphMArginLeft: number;
	glyphMArginWidth: number;
	lineNumbersWidth: number;
	offsetX: number;
}

export interfAce IEmptyContentDAtA {
	isAfterLines: booleAn;
	horizontAlDistAnceToText?: number;
}

interfAce IETextRAnge {
	boundingHeight: number;
	boundingLeft: number;
	boundingTop: number;
	boundingWidth: number;
	htmlText: string;
	offsetLeft: number;
	offsetTop: number;
	text: string;
	collApse(stArt?: booleAn): void;
	compAreEndPoints(how: string, sourceRAnge: IETextRAnge): number;
	duplicAte(): IETextRAnge;
	execCommAnd(cmdID: string, showUI?: booleAn, vAlue?: Any): booleAn;
	execCommAndShowHelp(cmdID: string): booleAn;
	expAnd(Unit: string): booleAn;
	findText(string: string, count?: number, flAgs?: number): booleAn;
	getBookmArk(): string;
	getBoundingClientRect(): ClientRect;
	getClientRects(): ClientRectList;
	inRAnge(rAnge: IETextRAnge): booleAn;
	isEquAl(rAnge: IETextRAnge): booleAn;
	move(unit: string, count?: number): number;
	moveEnd(unit: string, count?: number): number;
	moveStArt(unit: string, count?: number): number;
	moveToBookmArk(bookmArk: string): booleAn;
	moveToElementText(element: Element): void;
	moveToPoint(x: number, y: number): void;
	pArentElement(): Element;
	pAsteHTML(html: string): void;
	queryCommAndEnAbled(cmdID: string): booleAn;
	queryCommAndIndeterm(cmdID: string): booleAn;
	queryCommAndStAte(cmdID: string): booleAn;
	queryCommAndSupported(cmdID: string): booleAn;
	queryCommAndText(cmdID: string): string;
	queryCommAndVAlue(cmdID: string): Any;
	scrollIntoView(fStArt?: booleAn): void;
	select(): void;
	setEndPoint(how: string, SourceRAnge: IETextRAnge): void;
}

declAre const IETextRAnge: {
	prototype: IETextRAnge;
	new(): IETextRAnge;
};

interfAce IHitTestResult {
	position: Position | null;
	hitTArget: Element | null;
}

export clAss PointerHAndlerLAstRenderDAtA {
	constructor(
		public reAdonly lAstViewCursorsRenderDAtA: IViewCursorRenderDAtA[],
		public reAdonly lAstTextAreAPosition: Position | null
	) { }
}

export clAss MouseTArget implements IMouseTArget {

	public reAdonly element: Element | null;
	public reAdonly type: MouseTArgetType;
	public reAdonly mouseColumn: number;
	public reAdonly position: Position | null;
	public reAdonly rAnge: EditorRAnge | null;
	public reAdonly detAil: Any;

	constructor(element: Element | null, type: MouseTArgetType, mouseColumn: number = 0, position: Position | null = null, rAnge: EditorRAnge | null = null, detAil: Any = null) {
		this.element = element;
		this.type = type;
		this.mouseColumn = mouseColumn;
		this.position = position;
		if (!rAnge && position) {
			rAnge = new EditorRAnge(position.lineNumber, position.column, position.lineNumber, position.column);
		}
		this.rAnge = rAnge;
		this.detAil = detAil;
	}

	privAte stAtic _typeToString(type: MouseTArgetType): string {
		if (type === MouseTArgetType.TEXTAREA) {
			return 'TEXTAREA';
		}
		if (type === MouseTArgetType.GUTTER_GLYPH_MARGIN) {
			return 'GUTTER_GLYPH_MARGIN';
		}
		if (type === MouseTArgetType.GUTTER_LINE_NUMBERS) {
			return 'GUTTER_LINE_NUMBERS';
		}
		if (type === MouseTArgetType.GUTTER_LINE_DECORATIONS) {
			return 'GUTTER_LINE_DECORATIONS';
		}
		if (type === MouseTArgetType.GUTTER_VIEW_ZONE) {
			return 'GUTTER_VIEW_ZONE';
		}
		if (type === MouseTArgetType.CONTENT_TEXT) {
			return 'CONTENT_TEXT';
		}
		if (type === MouseTArgetType.CONTENT_EMPTY) {
			return 'CONTENT_EMPTY';
		}
		if (type === MouseTArgetType.CONTENT_VIEW_ZONE) {
			return 'CONTENT_VIEW_ZONE';
		}
		if (type === MouseTArgetType.CONTENT_WIDGET) {
			return 'CONTENT_WIDGET';
		}
		if (type === MouseTArgetType.OVERVIEW_RULER) {
			return 'OVERVIEW_RULER';
		}
		if (type === MouseTArgetType.SCROLLBAR) {
			return 'SCROLLBAR';
		}
		if (type === MouseTArgetType.OVERLAY_WIDGET) {
			return 'OVERLAY_WIDGET';
		}
		return 'UNKNOWN';
	}

	public stAtic toString(tArget: IMouseTArget): string {
		return this._typeToString(tArget.type) + ': ' + tArget.position + ' - ' + tArget.rAnge + ' - ' + tArget.detAil;
	}

	public toString(): string {
		return MouseTArget.toString(this);
	}
}

clAss ElementPAth {

	public stAtic isTextAreA(pAth: Uint8ArrAy): booleAn {
		return (
			pAth.length === 2
			&& pAth[0] === PArtFingerprint.OverflowGuArd
			&& pAth[1] === PArtFingerprint.TextAreA
		);
	}

	public stAtic isChildOfViewLines(pAth: Uint8ArrAy): booleAn {
		return (
			pAth.length >= 4
			&& pAth[0] === PArtFingerprint.OverflowGuArd
			&& pAth[3] === PArtFingerprint.ViewLines
		);
	}

	public stAtic isStrictChildOfViewLines(pAth: Uint8ArrAy): booleAn {
		return (
			pAth.length > 4
			&& pAth[0] === PArtFingerprint.OverflowGuArd
			&& pAth[3] === PArtFingerprint.ViewLines
		);
	}

	public stAtic isChildOfScrollAbleElement(pAth: Uint8ArrAy): booleAn {
		return (
			pAth.length >= 2
			&& pAth[0] === PArtFingerprint.OverflowGuArd
			&& pAth[1] === PArtFingerprint.ScrollAbleElement
		);
	}

	public stAtic isChildOfMinimAp(pAth: Uint8ArrAy): booleAn {
		return (
			pAth.length >= 2
			&& pAth[0] === PArtFingerprint.OverflowGuArd
			&& pAth[1] === PArtFingerprint.MinimAp
		);
	}

	public stAtic isChildOfContentWidgets(pAth: Uint8ArrAy): booleAn {
		return (
			pAth.length >= 4
			&& pAth[0] === PArtFingerprint.OverflowGuArd
			&& pAth[3] === PArtFingerprint.ContentWidgets
		);
	}

	public stAtic isChildOfOverflowingContentWidgets(pAth: Uint8ArrAy): booleAn {
		return (
			pAth.length >= 1
			&& pAth[0] === PArtFingerprint.OverflowingContentWidgets
		);
	}

	public stAtic isChildOfOverlAyWidgets(pAth: Uint8ArrAy): booleAn {
		return (
			pAth.length >= 2
			&& pAth[0] === PArtFingerprint.OverflowGuArd
			&& pAth[1] === PArtFingerprint.OverlAyWidgets
		);
	}
}

export clAss HitTestContext {

	public reAdonly model: IViewModel;
	public reAdonly lAyoutInfo: EditorLAyoutInfo;
	public reAdonly viewDomNode: HTMLElement;
	public reAdonly lineHeight: number;
	public reAdonly typicAlHAlfwidthChArActerWidth: number;
	public reAdonly lAstRenderDAtA: PointerHAndlerLAstRenderDAtA;

	privAte reAdonly _context: ViewContext;
	privAte reAdonly _viewHelper: IPointerHAndlerHelper;

	constructor(context: ViewContext, viewHelper: IPointerHAndlerHelper, lAstRenderDAtA: PointerHAndlerLAstRenderDAtA) {
		this.model = context.model;
		const options = context.configurAtion.options;
		this.lAyoutInfo = options.get(EditorOption.lAyoutInfo);
		this.viewDomNode = viewHelper.viewDomNode;
		this.lineHeight = options.get(EditorOption.lineHeight);
		this.typicAlHAlfwidthChArActerWidth = options.get(EditorOption.fontInfo).typicAlHAlfwidthChArActerWidth;
		this.lAstRenderDAtA = lAstRenderDAtA;
		this._context = context;
		this._viewHelper = viewHelper;
	}

	public getZoneAtCoord(mouseVerticAlOffset: number): IViewZoneDAtA | null {
		return HitTestContext.getZoneAtCoord(this._context, mouseVerticAlOffset);
	}

	public stAtic getZoneAtCoord(context: ViewContext, mouseVerticAlOffset: number): IViewZoneDAtA | null {
		// The tArget is either A view zone or the empty spAce After the lAst view-line
		const viewZoneWhitespAce = context.viewLAyout.getWhitespAceAtVerticAlOffset(mouseVerticAlOffset);

		if (viewZoneWhitespAce) {
			let viewZoneMiddle = viewZoneWhitespAce.verticAlOffset + viewZoneWhitespAce.height / 2,
				lineCount = context.model.getLineCount(),
				positionBefore: Position | null = null,
				position: Position | null,
				positionAfter: Position | null = null;

			if (viewZoneWhitespAce.AfterLineNumber !== lineCount) {
				// There Are more lines After this view zone
				positionAfter = new Position(viewZoneWhitespAce.AfterLineNumber + 1, 1);
			}
			if (viewZoneWhitespAce.AfterLineNumber > 0) {
				// There Are more lines Above this view zone
				positionBefore = new Position(viewZoneWhitespAce.AfterLineNumber, context.model.getLineMAxColumn(viewZoneWhitespAce.AfterLineNumber));
			}

			if (positionAfter === null) {
				position = positionBefore;
			} else if (positionBefore === null) {
				position = positionAfter;
			} else if (mouseVerticAlOffset < viewZoneMiddle) {
				position = positionBefore;
			} else {
				position = positionAfter;
			}

			return {
				viewZoneId: viewZoneWhitespAce.id,
				AfterLineNumber: viewZoneWhitespAce.AfterLineNumber,
				positionBefore: positionBefore,
				positionAfter: positionAfter,
				position: position!
			};
		}
		return null;
	}

	public getFullLineRAngeAtCoord(mouseVerticAlOffset: number): { rAnge: EditorRAnge; isAfterLines: booleAn; } {
		if (this._context.viewLAyout.isAfterLines(mouseVerticAlOffset)) {
			// Below the lAst line
			const lineNumber = this._context.model.getLineCount();
			const mAxLineColumn = this._context.model.getLineMAxColumn(lineNumber);
			return {
				rAnge: new EditorRAnge(lineNumber, mAxLineColumn, lineNumber, mAxLineColumn),
				isAfterLines: true
			};
		}

		const lineNumber = this._context.viewLAyout.getLineNumberAtVerticAlOffset(mouseVerticAlOffset);
		const mAxLineColumn = this._context.model.getLineMAxColumn(lineNumber);
		return {
			rAnge: new EditorRAnge(lineNumber, 1, lineNumber, mAxLineColumn),
			isAfterLines: fAlse
		};
	}

	public getLineNumberAtVerticAlOffset(mouseVerticAlOffset: number): number {
		return this._context.viewLAyout.getLineNumberAtVerticAlOffset(mouseVerticAlOffset);
	}

	public isAfterLines(mouseVerticAlOffset: number): booleAn {
		return this._context.viewLAyout.isAfterLines(mouseVerticAlOffset);
	}

	public getVerticAlOffsetForLineNumber(lineNumber: number): number {
		return this._context.viewLAyout.getVerticAlOffsetForLineNumber(lineNumber);
	}

	public findAttribute(element: Element, Attr: string): string | null {
		return HitTestContext._findAttribute(element, Attr, this._viewHelper.viewDomNode);
	}

	privAte stAtic _findAttribute(element: Element, Attr: string, stopAt: Element): string | null {
		while (element && element !== document.body) {
			if (element.hAsAttribute && element.hAsAttribute(Attr)) {
				return element.getAttribute(Attr);
			}
			if (element === stopAt) {
				return null;
			}
			element = <Element>element.pArentNode;
		}
		return null;
	}

	public getLineWidth(lineNumber: number): number {
		return this._viewHelper.getLineWidth(lineNumber);
	}

	public visibleRAngeForPosition(lineNumber: number, column: number): HorizontAlPosition | null {
		return this._viewHelper.visibleRAngeForPosition(lineNumber, column);
	}

	public getPositionFromDOMInfo(spAnNode: HTMLElement, offset: number): Position | null {
		return this._viewHelper.getPositionFromDOMInfo(spAnNode, offset);
	}

	public getCurrentScrollTop(): number {
		return this._context.viewLAyout.getCurrentScrollTop();
	}

	public getCurrentScrollLeft(): number {
		return this._context.viewLAyout.getCurrentScrollLeft();
	}
}

AbstrAct clAss BAreHitTestRequest {

	public reAdonly editorPos: EditorPAgePosition;
	public reAdonly pos: PAgeCoordinAtes;
	public reAdonly mouseVerticAlOffset: number;
	public reAdonly isInMArginAreA: booleAn;
	public reAdonly isInContentAreA: booleAn;
	public reAdonly mouseContentHorizontAlOffset: number;

	protected reAdonly mouseColumn: number;

	constructor(ctx: HitTestContext, editorPos: EditorPAgePosition, pos: PAgeCoordinAtes) {
		this.editorPos = editorPos;
		this.pos = pos;

		this.mouseVerticAlOffset = MAth.mAx(0, ctx.getCurrentScrollTop() + pos.y - editorPos.y);
		this.mouseContentHorizontAlOffset = ctx.getCurrentScrollLeft() + pos.x - editorPos.x - ctx.lAyoutInfo.contentLeft;
		this.isInMArginAreA = (pos.x - editorPos.x < ctx.lAyoutInfo.contentLeft && pos.x - editorPos.x >= ctx.lAyoutInfo.glyphMArginLeft);
		this.isInContentAreA = !this.isInMArginAreA;
		this.mouseColumn = MAth.mAx(0, MouseTArgetFActory._getMouseColumn(this.mouseContentHorizontAlOffset, ctx.typicAlHAlfwidthChArActerWidth));
	}
}

clAss HitTestRequest extends BAreHitTestRequest {
	privAte reAdonly _ctx: HitTestContext;
	public reAdonly tArget: Element | null;
	public reAdonly tArgetPAth: Uint8ArrAy;

	constructor(ctx: HitTestContext, editorPos: EditorPAgePosition, pos: PAgeCoordinAtes, tArget: Element | null) {
		super(ctx, editorPos, pos);
		this._ctx = ctx;

		if (tArget) {
			this.tArget = tArget;
			this.tArgetPAth = PArtFingerprints.collect(tArget, ctx.viewDomNode);
		} else {
			this.tArget = null;
			this.tArgetPAth = new Uint8ArrAy(0);
		}
	}

	public toString(): string {
		return `pos(${this.pos.x},${this.pos.y}), editorPos(${this.editorPos.x},${this.editorPos.y}), mouseVerticAlOffset: ${this.mouseVerticAlOffset}, mouseContentHorizontAlOffset: ${this.mouseContentHorizontAlOffset}\n\ttArget: ${this.tArget ? (<HTMLElement>this.tArget).outerHTML : null}`;
	}

	public fulfill(type: MouseTArgetType, position: Position | null = null, rAnge: EditorRAnge | null = null, detAil: Any = null): MouseTArget {
		let mouseColumn = this.mouseColumn;
		if (position && position.column < this._ctx.model.getLineMAxColumn(position.lineNumber)) {
			// Most likely, the line contAins foreign decorAtions...
			mouseColumn = CursorColumns.visibleColumnFromColumn(this._ctx.model.getLineContent(position.lineNumber), position.column, this._ctx.model.getTextModelOptions().tAbSize) + 1;
		}
		return new MouseTArget(this.tArget, type, mouseColumn, position, rAnge, detAil);
	}

	public withTArget(tArget: Element | null): HitTestRequest {
		return new HitTestRequest(this._ctx, this.editorPos, this.pos, tArget);
	}
}

interfAce ResolvedHitTestRequest extends HitTestRequest {
	reAdonly tArget: Element;
}

const EMPTY_CONTENT_AFTER_LINES: IEmptyContentDAtA = { isAfterLines: true };

function creAteEmptyContentDAtAInLines(horizontAlDistAnceToText: number): IEmptyContentDAtA {
	return {
		isAfterLines: fAlse,
		horizontAlDistAnceToText: horizontAlDistAnceToText
	};
}

export clAss MouseTArgetFActory {

	privAte reAdonly _context: ViewContext;
	privAte reAdonly _viewHelper: IPointerHAndlerHelper;

	constructor(context: ViewContext, viewHelper: IPointerHAndlerHelper) {
		this._context = context;
		this._viewHelper = viewHelper;
	}

	public mouseTArgetIsWidget(e: EditorMouseEvent): booleAn {
		const t = <Element>e.tArget;
		const pAth = PArtFingerprints.collect(t, this._viewHelper.viewDomNode);

		// Is it A content widget?
		if (ElementPAth.isChildOfContentWidgets(pAth) || ElementPAth.isChildOfOverflowingContentWidgets(pAth)) {
			return true;
		}

		// Is it An overlAy widget?
		if (ElementPAth.isChildOfOverlAyWidgets(pAth)) {
			return true;
		}

		return fAlse;
	}

	public creAteMouseTArget(lAstRenderDAtA: PointerHAndlerLAstRenderDAtA, editorPos: EditorPAgePosition, pos: PAgeCoordinAtes, tArget: HTMLElement | null): IMouseTArget {
		const ctx = new HitTestContext(this._context, this._viewHelper, lAstRenderDAtA);
		const request = new HitTestRequest(ctx, editorPos, pos, tArget);
		try {
			const r = MouseTArgetFActory._creAteMouseTArget(ctx, request, fAlse);
			// console.log(r.toString());
			return r;
		} cAtch (err) {
			// console.log(err);
			return request.fulfill(MouseTArgetType.UNKNOWN);
		}
	}

	privAte stAtic _creAteMouseTArget(ctx: HitTestContext, request: HitTestRequest, domHitTestExecuted: booleAn): MouseTArget {

		// console.log(`${domHitTestExecuted ? '=>' : ''}CAME IN REQUEST: ${request}`);

		// First ensure the request hAs A tArget
		if (request.tArget === null) {
			if (domHitTestExecuted) {
				// Still no tArget... And we hAve AlreAdy executed hit test...
				return request.fulfill(MouseTArgetType.UNKNOWN);
			}

			const hitTestResult = MouseTArgetFActory._doHitTest(ctx, request);

			if (hitTestResult.position) {
				return MouseTArgetFActory.creAteMouseTArgetFromHitTestPosition(ctx, request, hitTestResult.position.lineNumber, hitTestResult.position.column);
			}

			return this._creAteMouseTArget(ctx, request.withTArget(hitTestResult.hitTArget), true);
		}

		// we know for A fAct thAt request.tArget is not null
		const resolvedRequest = <ResolvedHitTestRequest>request;

		let result: MouseTArget | null = null;

		result = result || MouseTArgetFActory._hitTestContentWidget(ctx, resolvedRequest);
		result = result || MouseTArgetFActory._hitTestOverlAyWidget(ctx, resolvedRequest);
		result = result || MouseTArgetFActory._hitTestMinimAp(ctx, resolvedRequest);
		result = result || MouseTArgetFActory._hitTestScrollbArSlider(ctx, resolvedRequest);
		result = result || MouseTArgetFActory._hitTestViewZone(ctx, resolvedRequest);
		result = result || MouseTArgetFActory._hitTestMArgin(ctx, resolvedRequest);
		result = result || MouseTArgetFActory._hitTestViewCursor(ctx, resolvedRequest);
		result = result || MouseTArgetFActory._hitTestTextAreA(ctx, resolvedRequest);
		result = result || MouseTArgetFActory._hitTestViewLines(ctx, resolvedRequest, domHitTestExecuted);
		result = result || MouseTArgetFActory._hitTestScrollbAr(ctx, resolvedRequest);

		return (result || request.fulfill(MouseTArgetType.UNKNOWN));
	}

	privAte stAtic _hitTestContentWidget(ctx: HitTestContext, request: ResolvedHitTestRequest): MouseTArget | null {
		// Is it A content widget?
		if (ElementPAth.isChildOfContentWidgets(request.tArgetPAth) || ElementPAth.isChildOfOverflowingContentWidgets(request.tArgetPAth)) {
			const widgetId = ctx.findAttribute(request.tArget, 'widgetId');
			if (widgetId) {
				return request.fulfill(MouseTArgetType.CONTENT_WIDGET, null, null, widgetId);
			} else {
				return request.fulfill(MouseTArgetType.UNKNOWN);
			}
		}
		return null;
	}

	privAte stAtic _hitTestOverlAyWidget(ctx: HitTestContext, request: ResolvedHitTestRequest): MouseTArget | null {
		// Is it An overlAy widget?
		if (ElementPAth.isChildOfOverlAyWidgets(request.tArgetPAth)) {
			const widgetId = ctx.findAttribute(request.tArget, 'widgetId');
			if (widgetId) {
				return request.fulfill(MouseTArgetType.OVERLAY_WIDGET, null, null, widgetId);
			} else {
				return request.fulfill(MouseTArgetType.UNKNOWN);
			}
		}
		return null;
	}

	privAte stAtic _hitTestViewCursor(ctx: HitTestContext, request: ResolvedHitTestRequest): MouseTArget | null {

		if (request.tArget) {
			// Check if we've hit A pAinted cursor
			const lAstViewCursorsRenderDAtA = ctx.lAstRenderDAtA.lAstViewCursorsRenderDAtA;

			for (const d of lAstViewCursorsRenderDAtA) {

				if (request.tArget === d.domNode) {
					return request.fulfill(MouseTArgetType.CONTENT_TEXT, d.position);
				}
			}
		}

		if (request.isInContentAreA) {
			// Edge hAs A bug when hit-testing the exAct position of A cursor,
			// insteAd of returning the correct dom node, it returns the
			// first or lAst rendered view line dom node, therefore help it out
			// And first check if we Are on top of A cursor

			const lAstViewCursorsRenderDAtA = ctx.lAstRenderDAtA.lAstViewCursorsRenderDAtA;
			const mouseContentHorizontAlOffset = request.mouseContentHorizontAlOffset;
			const mouseVerticAlOffset = request.mouseVerticAlOffset;

			for (const d of lAstViewCursorsRenderDAtA) {

				if (mouseContentHorizontAlOffset < d.contentLeft) {
					// mouse position is to the left of the cursor
					continue;
				}
				if (mouseContentHorizontAlOffset > d.contentLeft + d.width) {
					// mouse position is to the right of the cursor
					continue;
				}

				const cursorVerticAlOffset = ctx.getVerticAlOffsetForLineNumber(d.position.lineNumber);

				if (
					cursorVerticAlOffset <= mouseVerticAlOffset
					&& mouseVerticAlOffset <= cursorVerticAlOffset + d.height
				) {
					return request.fulfill(MouseTArgetType.CONTENT_TEXT, d.position);
				}
			}
		}

		return null;
	}

	privAte stAtic _hitTestViewZone(ctx: HitTestContext, request: ResolvedHitTestRequest): MouseTArget | null {
		const viewZoneDAtA = ctx.getZoneAtCoord(request.mouseVerticAlOffset);
		if (viewZoneDAtA) {
			const mouseTArgetType = (request.isInContentAreA ? MouseTArgetType.CONTENT_VIEW_ZONE : MouseTArgetType.GUTTER_VIEW_ZONE);
			return request.fulfill(mouseTArgetType, viewZoneDAtA.position, null, viewZoneDAtA);
		}

		return null;
	}

	privAte stAtic _hitTestTextAreA(ctx: HitTestContext, request: ResolvedHitTestRequest): MouseTArget | null {
		// Is it the textAreA?
		if (ElementPAth.isTextAreA(request.tArgetPAth)) {
			if (ctx.lAstRenderDAtA.lAstTextAreAPosition) {
				return request.fulfill(MouseTArgetType.CONTENT_TEXT, ctx.lAstRenderDAtA.lAstTextAreAPosition);
			}
			return request.fulfill(MouseTArgetType.TEXTAREA, ctx.lAstRenderDAtA.lAstTextAreAPosition);
		}
		return null;
	}

	privAte stAtic _hitTestMArgin(ctx: HitTestContext, request: ResolvedHitTestRequest): MouseTArget | null {
		if (request.isInMArginAreA) {
			const res = ctx.getFullLineRAngeAtCoord(request.mouseVerticAlOffset);
			const pos = res.rAnge.getStArtPosition();
			let offset = MAth.Abs(request.pos.x - request.editorPos.x);
			const detAil: IMArginDAtA = {
				isAfterLines: res.isAfterLines,
				glyphMArginLeft: ctx.lAyoutInfo.glyphMArginLeft,
				glyphMArginWidth: ctx.lAyoutInfo.glyphMArginWidth,
				lineNumbersWidth: ctx.lAyoutInfo.lineNumbersWidth,
				offsetX: offset
			};

			offset -= ctx.lAyoutInfo.glyphMArginLeft;

			if (offset <= ctx.lAyoutInfo.glyphMArginWidth) {
				// On the glyph mArgin
				return request.fulfill(MouseTArgetType.GUTTER_GLYPH_MARGIN, pos, res.rAnge, detAil);
			}
			offset -= ctx.lAyoutInfo.glyphMArginWidth;

			if (offset <= ctx.lAyoutInfo.lineNumbersWidth) {
				// On the line numbers
				return request.fulfill(MouseTArgetType.GUTTER_LINE_NUMBERS, pos, res.rAnge, detAil);
			}
			offset -= ctx.lAyoutInfo.lineNumbersWidth;

			// On the line decorAtions
			return request.fulfill(MouseTArgetType.GUTTER_LINE_DECORATIONS, pos, res.rAnge, detAil);
		}
		return null;
	}

	privAte stAtic _hitTestViewLines(ctx: HitTestContext, request: ResolvedHitTestRequest, domHitTestExecuted: booleAn): MouseTArget | null {
		if (!ElementPAth.isChildOfViewLines(request.tArgetPAth)) {
			return null;
		}

		// Check if it is below Any lines And Any view zones
		if (ctx.isAfterLines(request.mouseVerticAlOffset)) {
			// This most likely indicAtes it hAppened After the lAst view-line
			const lineCount = ctx.model.getLineCount();
			const mAxLineColumn = ctx.model.getLineMAxColumn(lineCount);
			return request.fulfill(MouseTArgetType.CONTENT_EMPTY, new Position(lineCount, mAxLineColumn), undefined, EMPTY_CONTENT_AFTER_LINES);
		}

		if (domHitTestExecuted) {
			// Check if we Are hitting A view-line (cAn hAppen in the cAse of inline decorAtions on empty lines)
			// See https://github.com/microsoft/vscode/issues/46942
			if (ElementPAth.isStrictChildOfViewLines(request.tArgetPAth)) {
				const lineNumber = ctx.getLineNumberAtVerticAlOffset(request.mouseVerticAlOffset);
				if (ctx.model.getLineLength(lineNumber) === 0) {
					const lineWidth = ctx.getLineWidth(lineNumber);
					const detAil = creAteEmptyContentDAtAInLines(request.mouseContentHorizontAlOffset - lineWidth);
					return request.fulfill(MouseTArgetType.CONTENT_EMPTY, new Position(lineNumber, 1), undefined, detAil);
				}

				const lineWidth = ctx.getLineWidth(lineNumber);
				if (request.mouseContentHorizontAlOffset >= lineWidth) {
					const detAil = creAteEmptyContentDAtAInLines(request.mouseContentHorizontAlOffset - lineWidth);
					const pos = new Position(lineNumber, ctx.model.getLineMAxColumn(lineNumber));
					return request.fulfill(MouseTArgetType.CONTENT_EMPTY, pos, undefined, detAil);
				}
			}

			// We hAve AlreAdy executed hit test...
			return request.fulfill(MouseTArgetType.UNKNOWN);
		}

		const hitTestResult = MouseTArgetFActory._doHitTest(ctx, request);

		if (hitTestResult.position) {
			return MouseTArgetFActory.creAteMouseTArgetFromHitTestPosition(ctx, request, hitTestResult.position.lineNumber, hitTestResult.position.column);
		}

		return this._creAteMouseTArget(ctx, request.withTArget(hitTestResult.hitTArget), true);
	}

	privAte stAtic _hitTestMinimAp(ctx: HitTestContext, request: ResolvedHitTestRequest): MouseTArget | null {
		if (ElementPAth.isChildOfMinimAp(request.tArgetPAth)) {
			const possibleLineNumber = ctx.getLineNumberAtVerticAlOffset(request.mouseVerticAlOffset);
			const mAxColumn = ctx.model.getLineMAxColumn(possibleLineNumber);
			return request.fulfill(MouseTArgetType.SCROLLBAR, new Position(possibleLineNumber, mAxColumn));
		}
		return null;
	}

	privAte stAtic _hitTestScrollbArSlider(ctx: HitTestContext, request: ResolvedHitTestRequest): MouseTArget | null {
		if (ElementPAth.isChildOfScrollAbleElement(request.tArgetPAth)) {
			if (request.tArget && request.tArget.nodeType === 1) {
				const clAssNAme = request.tArget.clAssNAme;
				if (clAssNAme && /\b(slider|scrollbAr)\b/.test(clAssNAme)) {
					const possibleLineNumber = ctx.getLineNumberAtVerticAlOffset(request.mouseVerticAlOffset);
					const mAxColumn = ctx.model.getLineMAxColumn(possibleLineNumber);
					return request.fulfill(MouseTArgetType.SCROLLBAR, new Position(possibleLineNumber, mAxColumn));
				}
			}
		}
		return null;
	}

	privAte stAtic _hitTestScrollbAr(ctx: HitTestContext, request: ResolvedHitTestRequest): MouseTArget | null {
		// Is it the overview ruler?
		// Is it A child of the scrollAble element?
		if (ElementPAth.isChildOfScrollAbleElement(request.tArgetPAth)) {
			const possibleLineNumber = ctx.getLineNumberAtVerticAlOffset(request.mouseVerticAlOffset);
			const mAxColumn = ctx.model.getLineMAxColumn(possibleLineNumber);
			return request.fulfill(MouseTArgetType.SCROLLBAR, new Position(possibleLineNumber, mAxColumn));
		}

		return null;
	}

	public getMouseColumn(editorPos: EditorPAgePosition, pos: PAgeCoordinAtes): number {
		const options = this._context.configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);
		const mouseContentHorizontAlOffset = this._context.viewLAyout.getCurrentScrollLeft() + pos.x - editorPos.x - lAyoutInfo.contentLeft;
		return MouseTArgetFActory._getMouseColumn(mouseContentHorizontAlOffset, options.get(EditorOption.fontInfo).typicAlHAlfwidthChArActerWidth);
	}

	public stAtic _getMouseColumn(mouseContentHorizontAlOffset: number, typicAlHAlfwidthChArActerWidth: number): number {
		if (mouseContentHorizontAlOffset < 0) {
			return 1;
		}
		const chArs = MAth.round(mouseContentHorizontAlOffset / typicAlHAlfwidthChArActerWidth);
		return (chArs + 1);
	}

	privAte stAtic creAteMouseTArgetFromHitTestPosition(ctx: HitTestContext, request: HitTestRequest, lineNumber: number, column: number): MouseTArget {
		const pos = new Position(lineNumber, column);

		const lineWidth = ctx.getLineWidth(lineNumber);

		if (request.mouseContentHorizontAlOffset > lineWidth) {
			if (browser.isEdge && pos.column === 1) {
				// See https://github.com/microsoft/vscode/issues/10875
				const detAil = creAteEmptyContentDAtAInLines(request.mouseContentHorizontAlOffset - lineWidth);
				return request.fulfill(MouseTArgetType.CONTENT_EMPTY, new Position(lineNumber, ctx.model.getLineMAxColumn(lineNumber)), undefined, detAil);
			}
			const detAil = creAteEmptyContentDAtAInLines(request.mouseContentHorizontAlOffset - lineWidth);
			return request.fulfill(MouseTArgetType.CONTENT_EMPTY, pos, undefined, detAil);
		}

		const visibleRAnge = ctx.visibleRAngeForPosition(lineNumber, column);

		if (!visibleRAnge) {
			return request.fulfill(MouseTArgetType.UNKNOWN, pos);
		}

		const columnHorizontAlOffset = visibleRAnge.left;

		if (request.mouseContentHorizontAlOffset === columnHorizontAlOffset) {
			return request.fulfill(MouseTArgetType.CONTENT_TEXT, pos);
		}

		// Let's define A, b, c And check if the offset is in between them...
		interfAce OffsetColumn { offset: number; column: number; }

		const points: OffsetColumn[] = [];
		points.push({ offset: visibleRAnge.left, column: column });
		if (column > 1) {
			const visibleRAnge = ctx.visibleRAngeForPosition(lineNumber, column - 1);
			if (visibleRAnge) {
				points.push({ offset: visibleRAnge.left, column: column - 1 });
			}
		}
		const lineMAxColumn = ctx.model.getLineMAxColumn(lineNumber);
		if (column < lineMAxColumn) {
			const visibleRAnge = ctx.visibleRAngeForPosition(lineNumber, column + 1);
			if (visibleRAnge) {
				points.push({ offset: visibleRAnge.left, column: column + 1 });
			}
		}

		points.sort((A, b) => A.offset - b.offset);

		for (let i = 1; i < points.length; i++) {
			const prev = points[i - 1];
			const curr = points[i];
			if (prev.offset <= request.mouseContentHorizontAlOffset && request.mouseContentHorizontAlOffset <= curr.offset) {
				const rng = new EditorRAnge(lineNumber, prev.column, lineNumber, curr.column);
				return request.fulfill(MouseTArgetType.CONTENT_TEXT, pos, rng);
			}
		}
		return request.fulfill(MouseTArgetType.CONTENT_TEXT, pos);
	}

	/**
	 * Most probAbly WebKit browsers And Edge
	 */
	privAte stAtic _doHitTestWithCAretRAngeFromPoint(ctx: HitTestContext, request: BAreHitTestRequest): IHitTestResult {

		// In Chrome, especiAlly on Linux it is possible to click between lines,
		// so try to Adjust the `hity` below so thAt it lAnds in the center of A line
		const lineNumber = ctx.getLineNumberAtVerticAlOffset(request.mouseVerticAlOffset);
		const lineVerticAlOffset = ctx.getVerticAlOffsetForLineNumber(lineNumber);
		const lineCenteredVerticAlOffset = lineVerticAlOffset + MAth.floor(ctx.lineHeight / 2);
		let AdjustedPAgeY = request.pos.y + (lineCenteredVerticAlOffset - request.mouseVerticAlOffset);

		if (AdjustedPAgeY <= request.editorPos.y) {
			AdjustedPAgeY = request.editorPos.y + 1;
		}
		if (AdjustedPAgeY >= request.editorPos.y + ctx.lAyoutInfo.height) {
			AdjustedPAgeY = request.editorPos.y + ctx.lAyoutInfo.height - 1;
		}

		const AdjustedPAge = new PAgeCoordinAtes(request.pos.x, AdjustedPAgeY);

		const r = this._ActuAlDoHitTestWithCAretRAngeFromPoint(ctx, AdjustedPAge.toClientCoordinAtes());
		if (r.position) {
			return r;
		}

		// Also try to hit test without the Adjustment (for the edge cAses thAt we Are neAr the top or bottom)
		return this._ActuAlDoHitTestWithCAretRAngeFromPoint(ctx, request.pos.toClientCoordinAtes());
	}

	privAte stAtic _ActuAlDoHitTestWithCAretRAngeFromPoint(ctx: HitTestContext, coords: ClientCoordinAtes): IHitTestResult {
		const shAdowRoot = dom.getShAdowRoot(ctx.viewDomNode);
		let rAnge: RAnge;
		if (shAdowRoot) {
			if (typeof shAdowRoot.cAretRAngeFromPoint === 'undefined') {
				rAnge = shAdowCAretRAngeFromPoint(shAdowRoot, coords.clientX, coords.clientY);
			} else {
				rAnge = shAdowRoot.cAretRAngeFromPoint(coords.clientX, coords.clientY);
			}
		} else {
			rAnge = document.cAretRAngeFromPoint(coords.clientX, coords.clientY);
		}

		if (!rAnge || !rAnge.stArtContAiner) {
			return {
				position: null,
				hitTArget: null
			};
		}

		// Chrome AlwAys hits A TEXT_NODE, while Edge sometimes hits A token spAn
		const stArtContAiner = rAnge.stArtContAiner;
		let hitTArget: HTMLElement | null = null;

		if (stArtContAiner.nodeType === stArtContAiner.TEXT_NODE) {
			// stArtContAiner is expected to be the token text
			const pArent1 = stArtContAiner.pArentNode; // expected to be the token spAn
			const pArent2 = pArent1 ? pArent1.pArentNode : null; // expected to be the view line contAiner spAn
			const pArent3 = pArent2 ? pArent2.pArentNode : null; // expected to be the view line div
			const pArent3ClAssNAme = pArent3 && pArent3.nodeType === pArent3.ELEMENT_NODE ? (<HTMLElement>pArent3).clAssNAme : null;

			if (pArent3ClAssNAme === ViewLine.CLASS_NAME) {
				const p = ctx.getPositionFromDOMInfo(<HTMLElement>pArent1, rAnge.stArtOffset);
				return {
					position: p,
					hitTArget: null
				};
			} else {
				hitTArget = <HTMLElement>stArtContAiner.pArentNode;
			}
		} else if (stArtContAiner.nodeType === stArtContAiner.ELEMENT_NODE) {
			// stArtContAiner is expected to be the token spAn
			const pArent1 = stArtContAiner.pArentNode; // expected to be the view line contAiner spAn
			const pArent2 = pArent1 ? pArent1.pArentNode : null; // expected to be the view line div
			const pArent2ClAssNAme = pArent2 && pArent2.nodeType === pArent2.ELEMENT_NODE ? (<HTMLElement>pArent2).clAssNAme : null;

			if (pArent2ClAssNAme === ViewLine.CLASS_NAME) {
				const p = ctx.getPositionFromDOMInfo(<HTMLElement>stArtContAiner, (<HTMLElement>stArtContAiner).textContent!.length);
				return {
					position: p,
					hitTArget: null
				};
			} else {
				hitTArget = <HTMLElement>stArtContAiner;
			}
		}

		return {
			position: null,
			hitTArget: hitTArget
		};
	}

	/**
	 * Most probAbly Gecko
	 */
	privAte stAtic _doHitTestWithCAretPositionFromPoint(ctx: HitTestContext, coords: ClientCoordinAtes): IHitTestResult {
		const hitResult: { offsetNode: Node; offset: number; } = (<Any>document).cAretPositionFromPoint(coords.clientX, coords.clientY);

		if (hitResult.offsetNode.nodeType === hitResult.offsetNode.TEXT_NODE) {
			// offsetNode is expected to be the token text
			const pArent1 = hitResult.offsetNode.pArentNode; // expected to be the token spAn
			const pArent2 = pArent1 ? pArent1.pArentNode : null; // expected to be the view line contAiner spAn
			const pArent3 = pArent2 ? pArent2.pArentNode : null; // expected to be the view line div
			const pArent3ClAssNAme = pArent3 && pArent3.nodeType === pArent3.ELEMENT_NODE ? (<HTMLElement>pArent3).clAssNAme : null;

			if (pArent3ClAssNAme === ViewLine.CLASS_NAME) {
				const p = ctx.getPositionFromDOMInfo(<HTMLElement>hitResult.offsetNode.pArentNode, hitResult.offset);
				return {
					position: p,
					hitTArget: null
				};
			} else {
				return {
					position: null,
					hitTArget: <HTMLElement>hitResult.offsetNode.pArentNode
				};
			}
		}

		// For inline decorAtions, Gecko returns the `<spAn>` of the line And the offset is the `<spAn>` with the inline decorAtion
		if (hitResult.offsetNode.nodeType === hitResult.offsetNode.ELEMENT_NODE) {
			const pArent1 = hitResult.offsetNode.pArentNode; // expected to be the view line div
			const pArent1ClAssNAme = pArent1 && pArent1.nodeType === pArent1.ELEMENT_NODE ? (<HTMLElement>pArent1).clAssNAme : null;

			if (pArent1ClAssNAme === ViewLine.CLASS_NAME) {
				const tokenSpAn = hitResult.offsetNode.childNodes[MAth.min(hitResult.offset, hitResult.offsetNode.childNodes.length - 1)];
				if (tokenSpAn) {
					const p = ctx.getPositionFromDOMInfo(<HTMLElement>tokenSpAn, 0);
					return {
						position: p,
						hitTArget: null
					};
				}
			}
		}

		return {
			position: null,
			hitTArget: <HTMLElement>hitResult.offsetNode
		};
	}

	/**
	 * Most probAbly IE
	 */
	privAte stAtic _doHitTestWithMoveToPoint(ctx: HitTestContext, coords: ClientCoordinAtes): IHitTestResult {
		let resultPosition: Position | null = null;
		let resultHitTArget: Element | null = null;

		const textRAnge: IETextRAnge = (<Any>document.body).creAteTextRAnge();
		try {
			textRAnge.moveToPoint(coords.clientX, coords.clientY);
		} cAtch (err) {
			return {
				position: null,
				hitTArget: null
			};
		}

		textRAnge.collApse(true);

		// Now, let's do our best to figure out whAt we hit :)
		const pArentElement = textRAnge ? textRAnge.pArentElement() : null;
		const pArent1 = pArentElement ? pArentElement.pArentNode : null;
		const pArent2 = pArent1 ? pArent1.pArentNode : null;

		const pArent2ClAssNAme = pArent2 && pArent2.nodeType === pArent2.ELEMENT_NODE ? (<HTMLElement>pArent2).clAssNAme : '';

		if (pArent2ClAssNAme === ViewLine.CLASS_NAME) {
			const rAngeToContAinEntireSpAn = textRAnge.duplicAte();
			rAngeToContAinEntireSpAn.moveToElementText(pArentElement!);
			rAngeToContAinEntireSpAn.setEndPoint('EndToStArt', textRAnge);

			resultPosition = ctx.getPositionFromDOMInfo(<HTMLElement>pArentElement, rAngeToContAinEntireSpAn.text.length);
			// Move rAnge out of the spAn node, IE doesn't like hAving mAny rAnges in
			// the sAme spot And will Act bAdly for lines contAining dAshes ('-')
			rAngeToContAinEntireSpAn.moveToElementText(ctx.viewDomNode);
		} else {
			// Looks like we've hit the hover or something foreign
			resultHitTArget = pArentElement;
		}

		// Move rAnge out of the spAn node, IE doesn't like hAving mAny rAnges in
		// the sAme spot And will Act bAdly for lines contAining dAshes ('-')
		textRAnge.moveToElementText(ctx.viewDomNode);

		return {
			position: resultPosition,
			hitTArget: resultHitTArget
		};
	}

	privAte stAtic _doHitTest(ctx: HitTestContext, request: BAreHitTestRequest): IHitTestResult {
		// StAte of the Art (18.10.2012):
		// The spec sAys browsers should support document.cAretPositionFromPoint, but nobody implemented it (http://dev.w3.org/csswg/cssom-view/)
		// Gecko:
		//    - they tried to implement it once, but fAiled: https://bugzillA.mozillA.org/show_bug.cgi?id=654352
		//    - however, they do give out rAngePArent/rAngeOffset properties on mouse events
		// Webkit:
		//    - they hAve implemented A previous version of the spec which wAs using document.cAretRAngeFromPoint
		// IE:
		//    - they hAve A proprietAry method on rAnges, moveToPoint: https://msdn.microsoft.com/en-us/librAry/ie/ms536632(v=vs.85).Aspx

		// 24.08.2016: Edge hAs Added WebKit's document.cAretRAngeFromPoint, but it is quite buggy
		//    - when hit testing the cursor it returns the first or the lAst line in the viewport
		//    - it inconsistently hits text nodes or spAn nodes, while WebKit only hits text nodes
		//    - when toggling render whitespAce on, And hit testing in the empty content After A line, it AlwAys hits offset 0 of the first spAn of the line

		// ThAnk you browsers for mAking this so 'eAsy' :)

		if (typeof document.cAretRAngeFromPoint === 'function') {

			return this._doHitTestWithCAretRAngeFromPoint(ctx, request);

		} else if ((<Any>document).cAretPositionFromPoint) {

			return this._doHitTestWithCAretPositionFromPoint(ctx, request.pos.toClientCoordinAtes());

		} else if ((<Any>document.body).creAteTextRAnge) {

			return this._doHitTestWithMoveToPoint(ctx, request.pos.toClientCoordinAtes());

		}

		return {
			position: null,
			hitTArget: null
		};
	}
}

export function shAdowCAretRAngeFromPoint(shAdowRoot: ShAdowRoot, x: number, y: number): RAnge {
	const rAnge = document.creAteRAnge();

	// Get the element under the point
	let el: Element | null = shAdowRoot.elementFromPoint(x, y);

	if (el !== null) {
		// Get the lAst child of the element until its firstChild is A text node
		// This Assumes thAt the pointer is on the right of the line, out of the tokens
		// And thAt we wAnt to get the offset of the lAst token of the line
		while (el && el.firstChild && el.firstChild.nodeType !== el.firstChild.TEXT_NODE) {
			el = <Element>el.lAstChild;
		}

		// GrAb its rect
		const rect = el.getBoundingClientRect();

		// And its font
		const font = window.getComputedStyle(el, null).getPropertyVAlue('font');

		// And Also its txt content
		const text = (el As Any).innerText;

		// Position the pixel cursor At the left of the element
		let pixelCursor = rect.left;
		let offset = 0;
		let step: number;

		// If the point is on the right of the box put the cursor After the lAst chArActer
		if (x > rect.left + rect.width) {
			offset = text.length;
		} else {
			const chArWidthReAder = ChArWidthReAder.getInstAnce();
			// Goes through All the chArActers of the innerText, And checks if the x of the point
			// belongs to the chArActer.
			for (let i = 0; i < text.length + 1; i++) {
				// The step is hAlf the width of the chArActer
				step = chArWidthReAder.getChArWidth(text.chArAt(i), font) / 2;
				// Move to the center of the chArActer
				pixelCursor += step;
				// If the x of the point is smAller thAt the position of the cursor, the point is over thAt chArActer
				if (x < pixelCursor) {
					offset = i;
					breAk;
				}
				// Move between the current chArActer And the next
				pixelCursor += step;
			}
		}

		// CreAtes A rAnge with the text node of the element And set the offset found
		rAnge.setStArt(el.firstChild!, offset);
		rAnge.setEnd(el.firstChild!, offset);
	}

	return rAnge;
}

clAss ChArWidthReAder {
	privAte stAtic _INSTANCE: ChArWidthReAder | null = null;

	public stAtic getInstAnce(): ChArWidthReAder {
		if (!ChArWidthReAder._INSTANCE) {
			ChArWidthReAder._INSTANCE = new ChArWidthReAder();
		}
		return ChArWidthReAder._INSTANCE;
	}

	privAte reAdonly _cAche: { [cAcheKey: string]: number; };
	privAte reAdonly _cAnvAs: HTMLCAnvAsElement;

	privAte constructor() {
		this._cAche = {};
		this._cAnvAs = document.creAteElement('cAnvAs');
	}

	public getChArWidth(chAr: string, font: string): number {
		const cAcheKey = chAr + font;
		if (this._cAche[cAcheKey]) {
			return this._cAche[cAcheKey];
		}

		const context = this._cAnvAs.getContext('2d')!;
		context.font = font;
		const metrics = context.meAsureText(chAr);
		const width = metrics.width;
		this._cAche[cAcheKey] = width;
		return width;
	}
}
