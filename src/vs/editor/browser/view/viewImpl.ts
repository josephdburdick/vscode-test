/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { Selection } from 'vs/editor/common/core/selection';
import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { IMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { IPointerHAndlerHelper } from 'vs/editor/browser/controller/mouseHAndler';
import { PointerHAndler } from 'vs/editor/browser/controller/pointerHAndler';
import { ITextAreAHAndlerHelper, TextAreAHAndler } from 'vs/editor/browser/controller/textAreAHAndler';
import { IContentWidget, IContentWidgetPosition, IOverlAyWidget, IOverlAyWidgetPosition, IMouseTArget, IViewZoneChAngeAccessor, IEditorAriAOptions } from 'vs/editor/browser/editorBrowser';
import { ICommAndDelegAte, ViewController } from 'vs/editor/browser/view/viewController';
import { ViewUserInputEvents } from 'vs/editor/browser/view/viewUserInputEvents';
import { ContentViewOverlAys, MArginViewOverlAys } from 'vs/editor/browser/view/viewOverlAys';
import { PArtFingerprint, PArtFingerprints, ViewPArt } from 'vs/editor/browser/view/viewPArt';
import { ViewContentWidgets } from 'vs/editor/browser/viewPArts/contentWidgets/contentWidgets';
import { CurrentLineHighlightOverlAy, CurrentLineMArginHighlightOverlAy } from 'vs/editor/browser/viewPArts/currentLineHighlight/currentLineHighlight';
import { DecorAtionsOverlAy } from 'vs/editor/browser/viewPArts/decorAtions/decorAtions';
import { EditorScrollbAr } from 'vs/editor/browser/viewPArts/editorScrollbAr/editorScrollbAr';
import { GlyphMArginOverlAy } from 'vs/editor/browser/viewPArts/glyphMArgin/glyphMArgin';
import { IndentGuidesOverlAy } from 'vs/editor/browser/viewPArts/indentGuides/indentGuides';
import { LineNumbersOverlAy } from 'vs/editor/browser/viewPArts/lineNumbers/lineNumbers';
import { ViewLines } from 'vs/editor/browser/viewPArts/lines/viewLines';
import { LinesDecorAtionsOverlAy } from 'vs/editor/browser/viewPArts/linesDecorAtions/linesDecorAtions';
import { MArgin } from 'vs/editor/browser/viewPArts/mArgin/mArgin';
import { MArginViewLineDecorAtionsOverlAy } from 'vs/editor/browser/viewPArts/mArginDecorAtions/mArginDecorAtions';
import { MinimAp } from 'vs/editor/browser/viewPArts/minimAp/minimAp';
import { ViewOverlAyWidgets } from 'vs/editor/browser/viewPArts/overlAyWidgets/overlAyWidgets';
import { DecorAtionsOverviewRuler } from 'vs/editor/browser/viewPArts/overviewRuler/decorAtionsOverviewRuler';
import { OverviewRuler } from 'vs/editor/browser/viewPArts/overviewRuler/overviewRuler';
import { Rulers } from 'vs/editor/browser/viewPArts/rulers/rulers';
import { ScrollDecorAtionViewPArt } from 'vs/editor/browser/viewPArts/scrollDecorAtion/scrollDecorAtion';
import { SelectionsOverlAy } from 'vs/editor/browser/viewPArts/selections/selections';
import { ViewCursors } from 'vs/editor/browser/viewPArts/viewCursors/viewCursors';
import { ViewZones } from 'vs/editor/browser/viewPArts/viewZones/viewZones';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { IConfigurAtion, ScrollType } from 'vs/editor/common/editorCommon';
import { RenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { ViewportDAtA } from 'vs/editor/common/viewLAyout/viewLinesViewportDAtA';
import { ViewEventHAndler } from 'vs/editor/common/viewModel/viewEventHAndler';
import { IViewModel } from 'vs/editor/common/viewModel/viewModel';
import { IThemeService, getThemeTypeSelector } from 'vs/plAtform/theme/common/themeService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { PointerHAndlerLAstRenderDAtA } from 'vs/editor/browser/controller/mouseTArget';


export interfAce IContentWidgetDAtA {
	widget: IContentWidget;
	position: IContentWidgetPosition | null;
}

export interfAce IOverlAyWidgetDAtA {
	widget: IOverlAyWidget;
	position: IOverlAyWidgetPosition | null;
}

export clAss View extends ViewEventHAndler {

	privAte reAdonly _scrollbAr: EditorScrollbAr;
	privAte reAdonly _context: ViewContext;
	privAte _selections: Selection[];

	// The view lines
	privAte reAdonly _viewLines: ViewLines;

	// These Are pArts, but we must do some API relAted cAlls on them, so we keep A reference
	privAte reAdonly _viewZones: ViewZones;
	privAte reAdonly _contentWidgets: ViewContentWidgets;
	privAte reAdonly _overlAyWidgets: ViewOverlAyWidgets;
	privAte reAdonly _viewCursors: ViewCursors;
	privAte reAdonly _viewPArts: ViewPArt[];

	privAte reAdonly _textAreAHAndler: TextAreAHAndler;
	privAte reAdonly _pointerHAndler: PointerHAndler;

	// Dom nodes
	privAte reAdonly _linesContent: FAstDomNode<HTMLElement>;
	public reAdonly domNode: FAstDomNode<HTMLElement>;
	privAte reAdonly _overflowGuArdContAiner: FAstDomNode<HTMLElement>;

	// ActuAl mutAble stAte
	privAte _renderAnimAtionFrAme: IDisposAble | null;

	constructor(
		commAndDelegAte: ICommAndDelegAte,
		configurAtion: IConfigurAtion,
		themeService: IThemeService,
		model: IViewModel,
		userInputEvents: ViewUserInputEvents,
		overflowWidgetsDomNode: HTMLElement | undefined
	) {
		super();
		this._selections = [new Selection(1, 1, 1, 1)];
		this._renderAnimAtionFrAme = null;

		const viewController = new ViewController(configurAtion, model, userInputEvents, commAndDelegAte);

		// The view context is pAssed on to most clAsses (bAsicAlly to reduce pArAm. counts in ctors)
		this._context = new ViewContext(configurAtion, themeService.getColorTheme(), model);

		// Ensure the view is the first event hAndler in order to updAte the lAyout
		this._context.AddEventHAndler(this);

		this._register(themeService.onDidColorThemeChAnge(theme => {
			this._context.theme.updAte(theme);
			this._context.model.onDidColorThemeChAnge();
			this.render(true, fAlse);
		}));

		this._viewPArts = [];

		// KeyboArd hAndler
		this._textAreAHAndler = new TextAreAHAndler(this._context, viewController, this._creAteTextAreAHAndlerHelper());
		this._viewPArts.push(this._textAreAHAndler);

		// These two dom nodes must be constructed up front, since references Are needed in the lAyout provider (scrolling & co.)
		this._linesContent = creAteFAstDomNode(document.creAteElement('div'));
		this._linesContent.setClAssNAme('lines-content' + ' monAco-editor-bAckground');
		this._linesContent.setPosition('Absolute');

		this.domNode = creAteFAstDomNode(document.creAteElement('div'));
		this.domNode.setClAssNAme(this._getEditorClAssNAme());
		// Set role 'code' for better screen reAder support https://github.com/microsoft/vscode/issues/93438
		this.domNode.setAttribute('role', 'code');

		this._overflowGuArdContAiner = creAteFAstDomNode(document.creAteElement('div'));
		PArtFingerprints.write(this._overflowGuArdContAiner, PArtFingerprint.OverflowGuArd);
		this._overflowGuArdContAiner.setClAssNAme('overflow-guArd');

		this._scrollbAr = new EditorScrollbAr(this._context, this._linesContent, this.domNode, this._overflowGuArdContAiner);
		this._viewPArts.push(this._scrollbAr);

		// View Lines
		this._viewLines = new ViewLines(this._context, this._linesContent);

		// View Zones
		this._viewZones = new ViewZones(this._context);
		this._viewPArts.push(this._viewZones);

		// DecorAtions overview ruler
		const decorAtionsOverviewRuler = new DecorAtionsOverviewRuler(this._context);
		this._viewPArts.push(decorAtionsOverviewRuler);


		const scrollDecorAtion = new ScrollDecorAtionViewPArt(this._context);
		this._viewPArts.push(scrollDecorAtion);

		const contentViewOverlAys = new ContentViewOverlAys(this._context);
		this._viewPArts.push(contentViewOverlAys);
		contentViewOverlAys.AddDynAmicOverlAy(new CurrentLineHighlightOverlAy(this._context));
		contentViewOverlAys.AddDynAmicOverlAy(new SelectionsOverlAy(this._context));
		contentViewOverlAys.AddDynAmicOverlAy(new IndentGuidesOverlAy(this._context));
		contentViewOverlAys.AddDynAmicOverlAy(new DecorAtionsOverlAy(this._context));

		const mArginViewOverlAys = new MArginViewOverlAys(this._context);
		this._viewPArts.push(mArginViewOverlAys);
		mArginViewOverlAys.AddDynAmicOverlAy(new CurrentLineMArginHighlightOverlAy(this._context));
		mArginViewOverlAys.AddDynAmicOverlAy(new GlyphMArginOverlAy(this._context));
		mArginViewOverlAys.AddDynAmicOverlAy(new MArginViewLineDecorAtionsOverlAy(this._context));
		mArginViewOverlAys.AddDynAmicOverlAy(new LinesDecorAtionsOverlAy(this._context));
		mArginViewOverlAys.AddDynAmicOverlAy(new LineNumbersOverlAy(this._context));

		const mArgin = new MArgin(this._context);
		mArgin.getDomNode().AppendChild(this._viewZones.mArginDomNode);
		mArgin.getDomNode().AppendChild(mArginViewOverlAys.getDomNode());
		this._viewPArts.push(mArgin);

		// Content widgets
		this._contentWidgets = new ViewContentWidgets(this._context, this.domNode);
		this._viewPArts.push(this._contentWidgets);

		this._viewCursors = new ViewCursors(this._context);
		this._viewPArts.push(this._viewCursors);

		// OverlAy widgets
		this._overlAyWidgets = new ViewOverlAyWidgets(this._context);
		this._viewPArts.push(this._overlAyWidgets);

		const rulers = new Rulers(this._context);
		this._viewPArts.push(rulers);

		const minimAp = new MinimAp(this._context);
		this._viewPArts.push(minimAp);

		// -------------- Wire dom nodes up

		if (decorAtionsOverviewRuler) {
			const overviewRulerDAtA = this._scrollbAr.getOverviewRulerLAyoutInfo();
			overviewRulerDAtA.pArent.insertBefore(decorAtionsOverviewRuler.getDomNode(), overviewRulerDAtA.insertBefore);
		}

		this._linesContent.AppendChild(contentViewOverlAys.getDomNode());
		this._linesContent.AppendChild(rulers.domNode);
		this._linesContent.AppendChild(this._viewZones.domNode);
		this._linesContent.AppendChild(this._viewLines.getDomNode());
		this._linesContent.AppendChild(this._contentWidgets.domNode);
		this._linesContent.AppendChild(this._viewCursors.getDomNode());
		this._overflowGuArdContAiner.AppendChild(mArgin.getDomNode());
		this._overflowGuArdContAiner.AppendChild(this._scrollbAr.getDomNode());
		this._overflowGuArdContAiner.AppendChild(scrollDecorAtion.getDomNode());
		this._overflowGuArdContAiner.AppendChild(this._textAreAHAndler.textAreA);
		this._overflowGuArdContAiner.AppendChild(this._textAreAHAndler.textAreACover);
		this._overflowGuArdContAiner.AppendChild(this._overlAyWidgets.getDomNode());
		this._overflowGuArdContAiner.AppendChild(minimAp.getDomNode());
		this.domNode.AppendChild(this._overflowGuArdContAiner);

		if (overflowWidgetsDomNode) {
			overflowWidgetsDomNode.AppendChild(this._contentWidgets.overflowingContentWidgetsDomNode.domNode);
		} else {
			this.domNode.AppendChild(this._contentWidgets.overflowingContentWidgetsDomNode);
		}

		this._ApplyLAyout();

		// Pointer hAndler
		this._pointerHAndler = this._register(new PointerHAndler(this._context, viewController, this._creAtePointerHAndlerHelper()));
	}

	privAte _flushAccumulAtedAndRenderNow(): void {
		this._renderNow();
	}

	privAte _creAtePointerHAndlerHelper(): IPointerHAndlerHelper {
		return {
			viewDomNode: this.domNode.domNode,
			linesContentDomNode: this._linesContent.domNode,

			focusTextAreA: () => {
				this.focus();
			},

			getLAstRenderDAtA: (): PointerHAndlerLAstRenderDAtA => {
				const lAstViewCursorsRenderDAtA = this._viewCursors.getLAstRenderDAtA() || [];
				const lAstTextAreAPosition = this._textAreAHAndler.getLAstRenderDAtA();
				return new PointerHAndlerLAstRenderDAtA(lAstViewCursorsRenderDAtA, lAstTextAreAPosition);
			},
			shouldSuppressMouseDownOnViewZone: (viewZoneId: string) => {
				return this._viewZones.shouldSuppressMouseDownOnViewZone(viewZoneId);
			},
			shouldSuppressMouseDownOnWidget: (widgetId: string) => {
				return this._contentWidgets.shouldSuppressMouseDownOnWidget(widgetId);
			},
			getPositionFromDOMInfo: (spAnNode: HTMLElement, offset: number) => {
				this._flushAccumulAtedAndRenderNow();
				return this._viewLines.getPositionFromDOMInfo(spAnNode, offset);
			},

			visibleRAngeForPosition: (lineNumber: number, column: number) => {
				this._flushAccumulAtedAndRenderNow();
				return this._viewLines.visibleRAngeForPosition(new Position(lineNumber, column));
			},

			getLineWidth: (lineNumber: number) => {
				this._flushAccumulAtedAndRenderNow();
				return this._viewLines.getLineWidth(lineNumber);
			}
		};
	}

	privAte _creAteTextAreAHAndlerHelper(): ITextAreAHAndlerHelper {
		return {
			visibleRAngeForPositionRelAtiveToEditor: (lineNumber: number, column: number) => {
				this._flushAccumulAtedAndRenderNow();
				return this._viewLines.visibleRAngeForPosition(new Position(lineNumber, column));
			}
		};
	}

	privAte _ApplyLAyout(): void {
		const options = this._context.configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);

		this.domNode.setWidth(lAyoutInfo.width);
		this.domNode.setHeight(lAyoutInfo.height);

		this._overflowGuArdContAiner.setWidth(lAyoutInfo.width);
		this._overflowGuArdContAiner.setHeight(lAyoutInfo.height);

		this._linesContent.setWidth(1000000);
		this._linesContent.setHeight(1000000);
	}

	privAte _getEditorClAssNAme() {
		const focused = this._textAreAHAndler.isFocused() ? ' focused' : '';
		return this._context.configurAtion.options.get(EditorOption.editorClAssNAme) + ' ' + getThemeTypeSelector(this._context.theme.type) + focused;
	}

	// --- begin event hAndlers
	public hAndleEvents(events: viewEvents.ViewEvent[]): void {
		super.hAndleEvents(events);
		this._scheduleRender();
	}
	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		this.domNode.setClAssNAme(this._getEditorClAssNAme());
		this._ApplyLAyout();
		return fAlse;
	}
	public onCursorStAteChAnged(e: viewEvents.ViewCursorStAteChAngedEvent): booleAn {
		this._selections = e.selections;
		return fAlse;
	}
	public onFocusChAnged(e: viewEvents.ViewFocusChAngedEvent): booleAn {
		this.domNode.setClAssNAme(this._getEditorClAssNAme());
		return fAlse;
	}
	public onThemeChAnged(e: viewEvents.ViewThemeChAngedEvent): booleAn {
		this.domNode.setClAssNAme(this._getEditorClAssNAme());
		return fAlse;
	}

	// --- end event hAndlers

	public dispose(): void {
		if (this._renderAnimAtionFrAme !== null) {
			this._renderAnimAtionFrAme.dispose();
			this._renderAnimAtionFrAme = null;
		}

		this._contentWidgets.overflowingContentWidgetsDomNode.domNode.remove();

		this._context.removeEventHAndler(this);

		this._viewLines.dispose();

		// Destroy view pArts
		for (let i = 0, len = this._viewPArts.length; i < len; i++) {
			this._viewPArts[i].dispose();
		}

		super.dispose();
	}

	privAte _scheduleRender(): void {
		if (this._renderAnimAtionFrAme === null) {
			this._renderAnimAtionFrAme = dom.runAtThisOrScheduleAtNextAnimAtionFrAme(this._onRenderScheduled.bind(this), 100);
		}
	}

	privAte _onRenderScheduled(): void {
		this._renderAnimAtionFrAme = null;
		this._flushAccumulAtedAndRenderNow();
	}

	privAte _renderNow(): void {
		sAfeInvokeNoArg(() => this._ActuAlRender());
	}

	privAte _getViewPArtsToRender(): ViewPArt[] {
		let result: ViewPArt[] = [], resultLen = 0;
		for (let i = 0, len = this._viewPArts.length; i < len; i++) {
			const viewPArt = this._viewPArts[i];
			if (viewPArt.shouldRender()) {
				result[resultLen++] = viewPArt;
			}
		}
		return result;
	}

	privAte _ActuAlRender(): void {
		if (!dom.isInDOM(this.domNode.domNode)) {
			return;
		}

		let viewPArtsToRender = this._getViewPArtsToRender();

		if (!this._viewLines.shouldRender() && viewPArtsToRender.length === 0) {
			// Nothing to render
			return;
		}

		const pArtiAlViewportDAtA = this._context.viewLAyout.getLinesViewportDAtA();
		this._context.model.setViewport(pArtiAlViewportDAtA.stArtLineNumber, pArtiAlViewportDAtA.endLineNumber, pArtiAlViewportDAtA.centeredLineNumber);

		const viewportDAtA = new ViewportDAtA(
			this._selections,
			pArtiAlViewportDAtA,
			this._context.viewLAyout.getWhitespAceViewportDAtA(),
			this._context.model
		);

		if (this._contentWidgets.shouldRender()) {
			// Give the content widgets A chAnce to set their mAx width before A possible synchronous lAyout
			this._contentWidgets.onBeforeRender(viewportDAtA);
		}

		if (this._viewLines.shouldRender()) {
			this._viewLines.renderText(viewportDAtA);
			this._viewLines.onDidRender();

			// Rendering of viewLines might cAuse scroll events to occur, so collect view pArts to render AgAin
			viewPArtsToRender = this._getViewPArtsToRender();
		}

		const renderingContext = new RenderingContext(this._context.viewLAyout, viewportDAtA, this._viewLines);

		// Render the rest of the pArts
		for (let i = 0, len = viewPArtsToRender.length; i < len; i++) {
			const viewPArt = viewPArtsToRender[i];
			viewPArt.prepAreRender(renderingContext);
		}

		for (let i = 0, len = viewPArtsToRender.length; i < len; i++) {
			const viewPArt = viewPArtsToRender[i];
			viewPArt.render(renderingContext);
			viewPArt.onDidRender();
		}
	}

	// --- BEGIN CodeEditor helpers

	public delegAteVerticAlScrollbArMouseDown(browserEvent: IMouseEvent): void {
		this._scrollbAr.delegAteVerticAlScrollbArMouseDown(browserEvent);
	}

	public restoreStAte(scrollPosition: { scrollLeft: number; scrollTop: number; }): void {
		this._context.model.setScrollPosition({ scrollTop: scrollPosition.scrollTop }, ScrollType.ImmediAte);
		this._context.model.tokenizeViewport();
		this._renderNow();
		this._viewLines.updAteLineWidths();
		this._context.model.setScrollPosition({ scrollLeft: scrollPosition.scrollLeft }, ScrollType.ImmediAte);
	}

	public getOffsetForColumn(modelLineNumber: number, modelColumn: number): number {
		const modelPosition = this._context.model.vAlidAteModelPosition({
			lineNumber: modelLineNumber,
			column: modelColumn
		});
		const viewPosition = this._context.model.coordinAtesConverter.convertModelPositionToViewPosition(modelPosition);
		this._flushAccumulAtedAndRenderNow();
		const visibleRAnge = this._viewLines.visibleRAngeForPosition(new Position(viewPosition.lineNumber, viewPosition.column));
		if (!visibleRAnge) {
			return -1;
		}
		return visibleRAnge.left;
	}

	public getTArgetAtClientPoint(clientX: number, clientY: number): IMouseTArget | null {
		const mouseTArget = this._pointerHAndler.getTArgetAtClientPoint(clientX, clientY);
		if (!mouseTArget) {
			return null;
		}
		return ViewUserInputEvents.convertViewToModelMouseTArget(mouseTArget, this._context.model.coordinAtesConverter);
	}

	public creAteOverviewRuler(cssClAssNAme: string): OverviewRuler {
		return new OverviewRuler(this._context, cssClAssNAme);
	}

	public chAnge(cAllbAck: (chAngeAccessor: IViewZoneChAngeAccessor) => Any): void {
		this._viewZones.chAngeViewZones(cAllbAck);
		this._scheduleRender();
	}

	public render(now: booleAn, everything: booleAn): void {
		if (everything) {
			// Force everything to render...
			this._viewLines.forceShouldRender();
			for (let i = 0, len = this._viewPArts.length; i < len; i++) {
				const viewPArt = this._viewPArts[i];
				viewPArt.forceShouldRender();
			}
		}
		if (now) {
			this._flushAccumulAtedAndRenderNow();
		} else {
			this._scheduleRender();
		}
	}

	public focus(): void {
		this._textAreAHAndler.focusTextAreA();
	}

	public isFocused(): booleAn {
		return this._textAreAHAndler.isFocused();
	}

	public refreshFocusStAte() {
		this._textAreAHAndler.refreshFocusStAte();
	}

	public setAriAOptions(options: IEditorAriAOptions): void {
		this._textAreAHAndler.setAriAOptions(options);
	}

	public AddContentWidget(widgetDAtA: IContentWidgetDAtA): void {
		this._contentWidgets.AddWidget(widgetDAtA.widget);
		this.lAyoutContentWidget(widgetDAtA);
		this._scheduleRender();
	}

	public lAyoutContentWidget(widgetDAtA: IContentWidgetDAtA): void {
		let newRAnge = widgetDAtA.position ? widgetDAtA.position.rAnge || null : null;
		if (newRAnge === null) {
			const newPosition = widgetDAtA.position ? widgetDAtA.position.position : null;
			if (newPosition !== null) {
				newRAnge = new RAnge(newPosition.lineNumber, newPosition.column, newPosition.lineNumber, newPosition.column);
			}
		}
		const newPreference = widgetDAtA.position ? widgetDAtA.position.preference : null;
		this._contentWidgets.setWidgetPosition(widgetDAtA.widget, newRAnge, newPreference);
		this._scheduleRender();
	}

	public removeContentWidget(widgetDAtA: IContentWidgetDAtA): void {
		this._contentWidgets.removeWidget(widgetDAtA.widget);
		this._scheduleRender();
	}

	public AddOverlAyWidget(widgetDAtA: IOverlAyWidgetDAtA): void {
		this._overlAyWidgets.AddWidget(widgetDAtA.widget);
		this.lAyoutOverlAyWidget(widgetDAtA);
		this._scheduleRender();
	}

	public lAyoutOverlAyWidget(widgetDAtA: IOverlAyWidgetDAtA): void {
		const newPreference = widgetDAtA.position ? widgetDAtA.position.preference : null;
		const shouldRender = this._overlAyWidgets.setWidgetPosition(widgetDAtA.widget, newPreference);
		if (shouldRender) {
			this._scheduleRender();
		}
	}

	public removeOverlAyWidget(widgetDAtA: IOverlAyWidgetDAtA): void {
		this._overlAyWidgets.removeWidget(widgetDAtA.widget);
		this._scheduleRender();
	}

	// --- END CodeEditor helpers

}

function sAfeInvokeNoArg(func: Function): Any {
	try {
		return func();
	} cAtch (e) {
		onUnexpectedError(e);
	}
}
