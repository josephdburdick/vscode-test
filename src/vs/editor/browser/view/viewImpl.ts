/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import { Selection } from 'vs/editor/common/core/selection';
import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { IMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { IPointerHandlerHelper } from 'vs/editor/Browser/controller/mouseHandler';
import { PointerHandler } from 'vs/editor/Browser/controller/pointerHandler';
import { ITextAreaHandlerHelper, TextAreaHandler } from 'vs/editor/Browser/controller/textAreaHandler';
import { IContentWidget, IContentWidgetPosition, IOverlayWidget, IOverlayWidgetPosition, IMouseTarget, IViewZoneChangeAccessor, IEditorAriaOptions } from 'vs/editor/Browser/editorBrowser';
import { ICommandDelegate, ViewController } from 'vs/editor/Browser/view/viewController';
import { ViewUserInputEvents } from 'vs/editor/Browser/view/viewUserInputEvents';
import { ContentViewOverlays, MarginViewOverlays } from 'vs/editor/Browser/view/viewOverlays';
import { PartFingerprint, PartFingerprints, ViewPart } from 'vs/editor/Browser/view/viewPart';
import { ViewContentWidgets } from 'vs/editor/Browser/viewParts/contentWidgets/contentWidgets';
import { CurrentLineHighlightOverlay, CurrentLineMarginHighlightOverlay } from 'vs/editor/Browser/viewParts/currentLineHighlight/currentLineHighlight';
import { DecorationsOverlay } from 'vs/editor/Browser/viewParts/decorations/decorations';
import { EditorScrollBar } from 'vs/editor/Browser/viewParts/editorScrollBar/editorScrollBar';
import { GlyphMarginOverlay } from 'vs/editor/Browser/viewParts/glyphMargin/glyphMargin';
import { IndentGuidesOverlay } from 'vs/editor/Browser/viewParts/indentGuides/indentGuides';
import { LineNumBersOverlay } from 'vs/editor/Browser/viewParts/lineNumBers/lineNumBers';
import { ViewLines } from 'vs/editor/Browser/viewParts/lines/viewLines';
import { LinesDecorationsOverlay } from 'vs/editor/Browser/viewParts/linesDecorations/linesDecorations';
import { Margin } from 'vs/editor/Browser/viewParts/margin/margin';
import { MarginViewLineDecorationsOverlay } from 'vs/editor/Browser/viewParts/marginDecorations/marginDecorations';
import { Minimap } from 'vs/editor/Browser/viewParts/minimap/minimap';
import { ViewOverlayWidgets } from 'vs/editor/Browser/viewParts/overlayWidgets/overlayWidgets';
import { DecorationsOverviewRuler } from 'vs/editor/Browser/viewParts/overviewRuler/decorationsOverviewRuler';
import { OverviewRuler } from 'vs/editor/Browser/viewParts/overviewRuler/overviewRuler';
import { Rulers } from 'vs/editor/Browser/viewParts/rulers/rulers';
import { ScrollDecorationViewPart } from 'vs/editor/Browser/viewParts/scrollDecoration/scrollDecoration';
import { SelectionsOverlay } from 'vs/editor/Browser/viewParts/selections/selections';
import { ViewCursors } from 'vs/editor/Browser/viewParts/viewCursors/viewCursors';
import { ViewZones } from 'vs/editor/Browser/viewParts/viewZones/viewZones';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { IConfiguration, ScrollType } from 'vs/editor/common/editorCommon';
import { RenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { ViewportData } from 'vs/editor/common/viewLayout/viewLinesViewportData';
import { ViewEventHandler } from 'vs/editor/common/viewModel/viewEventHandler';
import { IViewModel } from 'vs/editor/common/viewModel/viewModel';
import { IThemeService, getThemeTypeSelector } from 'vs/platform/theme/common/themeService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { PointerHandlerLastRenderData } from 'vs/editor/Browser/controller/mouseTarget';


export interface IContentWidgetData {
	widget: IContentWidget;
	position: IContentWidgetPosition | null;
}

export interface IOverlayWidgetData {
	widget: IOverlayWidget;
	position: IOverlayWidgetPosition | null;
}

export class View extends ViewEventHandler {

	private readonly _scrollBar: EditorScrollBar;
	private readonly _context: ViewContext;
	private _selections: Selection[];

	// The view lines
	private readonly _viewLines: ViewLines;

	// These are parts, But we must do some API related calls on them, so we keep a reference
	private readonly _viewZones: ViewZones;
	private readonly _contentWidgets: ViewContentWidgets;
	private readonly _overlayWidgets: ViewOverlayWidgets;
	private readonly _viewCursors: ViewCursors;
	private readonly _viewParts: ViewPart[];

	private readonly _textAreaHandler: TextAreaHandler;
	private readonly _pointerHandler: PointerHandler;

	// Dom nodes
	private readonly _linesContent: FastDomNode<HTMLElement>;
	puBlic readonly domNode: FastDomNode<HTMLElement>;
	private readonly _overflowGuardContainer: FastDomNode<HTMLElement>;

	// Actual mutaBle state
	private _renderAnimationFrame: IDisposaBle | null;

	constructor(
		commandDelegate: ICommandDelegate,
		configuration: IConfiguration,
		themeService: IThemeService,
		model: IViewModel,
		userInputEvents: ViewUserInputEvents,
		overflowWidgetsDomNode: HTMLElement | undefined
	) {
		super();
		this._selections = [new Selection(1, 1, 1, 1)];
		this._renderAnimationFrame = null;

		const viewController = new ViewController(configuration, model, userInputEvents, commandDelegate);

		// The view context is passed on to most classes (Basically to reduce param. counts in ctors)
		this._context = new ViewContext(configuration, themeService.getColorTheme(), model);

		// Ensure the view is the first event handler in order to update the layout
		this._context.addEventHandler(this);

		this._register(themeService.onDidColorThemeChange(theme => {
			this._context.theme.update(theme);
			this._context.model.onDidColorThemeChange();
			this.render(true, false);
		}));

		this._viewParts = [];

		// KeyBoard handler
		this._textAreaHandler = new TextAreaHandler(this._context, viewController, this._createTextAreaHandlerHelper());
		this._viewParts.push(this._textAreaHandler);

		// These two dom nodes must Be constructed up front, since references are needed in the layout provider (scrolling & co.)
		this._linesContent = createFastDomNode(document.createElement('div'));
		this._linesContent.setClassName('lines-content' + ' monaco-editor-Background');
		this._linesContent.setPosition('aBsolute');

		this.domNode = createFastDomNode(document.createElement('div'));
		this.domNode.setClassName(this._getEditorClassName());
		// Set role 'code' for Better screen reader support https://githuB.com/microsoft/vscode/issues/93438
		this.domNode.setAttriBute('role', 'code');

		this._overflowGuardContainer = createFastDomNode(document.createElement('div'));
		PartFingerprints.write(this._overflowGuardContainer, PartFingerprint.OverflowGuard);
		this._overflowGuardContainer.setClassName('overflow-guard');

		this._scrollBar = new EditorScrollBar(this._context, this._linesContent, this.domNode, this._overflowGuardContainer);
		this._viewParts.push(this._scrollBar);

		// View Lines
		this._viewLines = new ViewLines(this._context, this._linesContent);

		// View Zones
		this._viewZones = new ViewZones(this._context);
		this._viewParts.push(this._viewZones);

		// Decorations overview ruler
		const decorationsOverviewRuler = new DecorationsOverviewRuler(this._context);
		this._viewParts.push(decorationsOverviewRuler);


		const scrollDecoration = new ScrollDecorationViewPart(this._context);
		this._viewParts.push(scrollDecoration);

		const contentViewOverlays = new ContentViewOverlays(this._context);
		this._viewParts.push(contentViewOverlays);
		contentViewOverlays.addDynamicOverlay(new CurrentLineHighlightOverlay(this._context));
		contentViewOverlays.addDynamicOverlay(new SelectionsOverlay(this._context));
		contentViewOverlays.addDynamicOverlay(new IndentGuidesOverlay(this._context));
		contentViewOverlays.addDynamicOverlay(new DecorationsOverlay(this._context));

		const marginViewOverlays = new MarginViewOverlays(this._context);
		this._viewParts.push(marginViewOverlays);
		marginViewOverlays.addDynamicOverlay(new CurrentLineMarginHighlightOverlay(this._context));
		marginViewOverlays.addDynamicOverlay(new GlyphMarginOverlay(this._context));
		marginViewOverlays.addDynamicOverlay(new MarginViewLineDecorationsOverlay(this._context));
		marginViewOverlays.addDynamicOverlay(new LinesDecorationsOverlay(this._context));
		marginViewOverlays.addDynamicOverlay(new LineNumBersOverlay(this._context));

		const margin = new Margin(this._context);
		margin.getDomNode().appendChild(this._viewZones.marginDomNode);
		margin.getDomNode().appendChild(marginViewOverlays.getDomNode());
		this._viewParts.push(margin);

		// Content widgets
		this._contentWidgets = new ViewContentWidgets(this._context, this.domNode);
		this._viewParts.push(this._contentWidgets);

		this._viewCursors = new ViewCursors(this._context);
		this._viewParts.push(this._viewCursors);

		// Overlay widgets
		this._overlayWidgets = new ViewOverlayWidgets(this._context);
		this._viewParts.push(this._overlayWidgets);

		const rulers = new Rulers(this._context);
		this._viewParts.push(rulers);

		const minimap = new Minimap(this._context);
		this._viewParts.push(minimap);

		// -------------- Wire dom nodes up

		if (decorationsOverviewRuler) {
			const overviewRulerData = this._scrollBar.getOverviewRulerLayoutInfo();
			overviewRulerData.parent.insertBefore(decorationsOverviewRuler.getDomNode(), overviewRulerData.insertBefore);
		}

		this._linesContent.appendChild(contentViewOverlays.getDomNode());
		this._linesContent.appendChild(rulers.domNode);
		this._linesContent.appendChild(this._viewZones.domNode);
		this._linesContent.appendChild(this._viewLines.getDomNode());
		this._linesContent.appendChild(this._contentWidgets.domNode);
		this._linesContent.appendChild(this._viewCursors.getDomNode());
		this._overflowGuardContainer.appendChild(margin.getDomNode());
		this._overflowGuardContainer.appendChild(this._scrollBar.getDomNode());
		this._overflowGuardContainer.appendChild(scrollDecoration.getDomNode());
		this._overflowGuardContainer.appendChild(this._textAreaHandler.textArea);
		this._overflowGuardContainer.appendChild(this._textAreaHandler.textAreaCover);
		this._overflowGuardContainer.appendChild(this._overlayWidgets.getDomNode());
		this._overflowGuardContainer.appendChild(minimap.getDomNode());
		this.domNode.appendChild(this._overflowGuardContainer);

		if (overflowWidgetsDomNode) {
			overflowWidgetsDomNode.appendChild(this._contentWidgets.overflowingContentWidgetsDomNode.domNode);
		} else {
			this.domNode.appendChild(this._contentWidgets.overflowingContentWidgetsDomNode);
		}

		this._applyLayout();

		// Pointer handler
		this._pointerHandler = this._register(new PointerHandler(this._context, viewController, this._createPointerHandlerHelper()));
	}

	private _flushAccumulatedAndRenderNow(): void {
		this._renderNow();
	}

	private _createPointerHandlerHelper(): IPointerHandlerHelper {
		return {
			viewDomNode: this.domNode.domNode,
			linesContentDomNode: this._linesContent.domNode,

			focusTextArea: () => {
				this.focus();
			},

			getLastRenderData: (): PointerHandlerLastRenderData => {
				const lastViewCursorsRenderData = this._viewCursors.getLastRenderData() || [];
				const lastTextareaPosition = this._textAreaHandler.getLastRenderData();
				return new PointerHandlerLastRenderData(lastViewCursorsRenderData, lastTextareaPosition);
			},
			shouldSuppressMouseDownOnViewZone: (viewZoneId: string) => {
				return this._viewZones.shouldSuppressMouseDownOnViewZone(viewZoneId);
			},
			shouldSuppressMouseDownOnWidget: (widgetId: string) => {
				return this._contentWidgets.shouldSuppressMouseDownOnWidget(widgetId);
			},
			getPositionFromDOMInfo: (spanNode: HTMLElement, offset: numBer) => {
				this._flushAccumulatedAndRenderNow();
				return this._viewLines.getPositionFromDOMInfo(spanNode, offset);
			},

			visiBleRangeForPosition: (lineNumBer: numBer, column: numBer) => {
				this._flushAccumulatedAndRenderNow();
				return this._viewLines.visiBleRangeForPosition(new Position(lineNumBer, column));
			},

			getLineWidth: (lineNumBer: numBer) => {
				this._flushAccumulatedAndRenderNow();
				return this._viewLines.getLineWidth(lineNumBer);
			}
		};
	}

	private _createTextAreaHandlerHelper(): ITextAreaHandlerHelper {
		return {
			visiBleRangeForPositionRelativeToEditor: (lineNumBer: numBer, column: numBer) => {
				this._flushAccumulatedAndRenderNow();
				return this._viewLines.visiBleRangeForPosition(new Position(lineNumBer, column));
			}
		};
	}

	private _applyLayout(): void {
		const options = this._context.configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);

		this.domNode.setWidth(layoutInfo.width);
		this.domNode.setHeight(layoutInfo.height);

		this._overflowGuardContainer.setWidth(layoutInfo.width);
		this._overflowGuardContainer.setHeight(layoutInfo.height);

		this._linesContent.setWidth(1000000);
		this._linesContent.setHeight(1000000);
	}

	private _getEditorClassName() {
		const focused = this._textAreaHandler.isFocused() ? ' focused' : '';
		return this._context.configuration.options.get(EditorOption.editorClassName) + ' ' + getThemeTypeSelector(this._context.theme.type) + focused;
	}

	// --- Begin event handlers
	puBlic handleEvents(events: viewEvents.ViewEvent[]): void {
		super.handleEvents(events);
		this._scheduleRender();
	}
	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		this.domNode.setClassName(this._getEditorClassName());
		this._applyLayout();
		return false;
	}
	puBlic onCursorStateChanged(e: viewEvents.ViewCursorStateChangedEvent): Boolean {
		this._selections = e.selections;
		return false;
	}
	puBlic onFocusChanged(e: viewEvents.ViewFocusChangedEvent): Boolean {
		this.domNode.setClassName(this._getEditorClassName());
		return false;
	}
	puBlic onThemeChanged(e: viewEvents.ViewThemeChangedEvent): Boolean {
		this.domNode.setClassName(this._getEditorClassName());
		return false;
	}

	// --- end event handlers

	puBlic dispose(): void {
		if (this._renderAnimationFrame !== null) {
			this._renderAnimationFrame.dispose();
			this._renderAnimationFrame = null;
		}

		this._contentWidgets.overflowingContentWidgetsDomNode.domNode.remove();

		this._context.removeEventHandler(this);

		this._viewLines.dispose();

		// Destroy view parts
		for (let i = 0, len = this._viewParts.length; i < len; i++) {
			this._viewParts[i].dispose();
		}

		super.dispose();
	}

	private _scheduleRender(): void {
		if (this._renderAnimationFrame === null) {
			this._renderAnimationFrame = dom.runAtThisOrScheduleAtNextAnimationFrame(this._onRenderScheduled.Bind(this), 100);
		}
	}

	private _onRenderScheduled(): void {
		this._renderAnimationFrame = null;
		this._flushAccumulatedAndRenderNow();
	}

	private _renderNow(): void {
		safeInvokeNoArg(() => this._actualRender());
	}

	private _getViewPartsToRender(): ViewPart[] {
		let result: ViewPart[] = [], resultLen = 0;
		for (let i = 0, len = this._viewParts.length; i < len; i++) {
			const viewPart = this._viewParts[i];
			if (viewPart.shouldRender()) {
				result[resultLen++] = viewPart;
			}
		}
		return result;
	}

	private _actualRender(): void {
		if (!dom.isInDOM(this.domNode.domNode)) {
			return;
		}

		let viewPartsToRender = this._getViewPartsToRender();

		if (!this._viewLines.shouldRender() && viewPartsToRender.length === 0) {
			// Nothing to render
			return;
		}

		const partialViewportData = this._context.viewLayout.getLinesViewportData();
		this._context.model.setViewport(partialViewportData.startLineNumBer, partialViewportData.endLineNumBer, partialViewportData.centeredLineNumBer);

		const viewportData = new ViewportData(
			this._selections,
			partialViewportData,
			this._context.viewLayout.getWhitespaceViewportData(),
			this._context.model
		);

		if (this._contentWidgets.shouldRender()) {
			// Give the content widgets a chance to set their max width Before a possiBle synchronous layout
			this._contentWidgets.onBeforeRender(viewportData);
		}

		if (this._viewLines.shouldRender()) {
			this._viewLines.renderText(viewportData);
			this._viewLines.onDidRender();

			// Rendering of viewLines might cause scroll events to occur, so collect view parts to render again
			viewPartsToRender = this._getViewPartsToRender();
		}

		const renderingContext = new RenderingContext(this._context.viewLayout, viewportData, this._viewLines);

		// Render the rest of the parts
		for (let i = 0, len = viewPartsToRender.length; i < len; i++) {
			const viewPart = viewPartsToRender[i];
			viewPart.prepareRender(renderingContext);
		}

		for (let i = 0, len = viewPartsToRender.length; i < len; i++) {
			const viewPart = viewPartsToRender[i];
			viewPart.render(renderingContext);
			viewPart.onDidRender();
		}
	}

	// --- BEGIN CodeEditor helpers

	puBlic delegateVerticalScrollBarMouseDown(BrowserEvent: IMouseEvent): void {
		this._scrollBar.delegateVerticalScrollBarMouseDown(BrowserEvent);
	}

	puBlic restoreState(scrollPosition: { scrollLeft: numBer; scrollTop: numBer; }): void {
		this._context.model.setScrollPosition({ scrollTop: scrollPosition.scrollTop }, ScrollType.Immediate);
		this._context.model.tokenizeViewport();
		this._renderNow();
		this._viewLines.updateLineWidths();
		this._context.model.setScrollPosition({ scrollLeft: scrollPosition.scrollLeft }, ScrollType.Immediate);
	}

	puBlic getOffsetForColumn(modelLineNumBer: numBer, modelColumn: numBer): numBer {
		const modelPosition = this._context.model.validateModelPosition({
			lineNumBer: modelLineNumBer,
			column: modelColumn
		});
		const viewPosition = this._context.model.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
		this._flushAccumulatedAndRenderNow();
		const visiBleRange = this._viewLines.visiBleRangeForPosition(new Position(viewPosition.lineNumBer, viewPosition.column));
		if (!visiBleRange) {
			return -1;
		}
		return visiBleRange.left;
	}

	puBlic getTargetAtClientPoint(clientX: numBer, clientY: numBer): IMouseTarget | null {
		const mouseTarget = this._pointerHandler.getTargetAtClientPoint(clientX, clientY);
		if (!mouseTarget) {
			return null;
		}
		return ViewUserInputEvents.convertViewToModelMouseTarget(mouseTarget, this._context.model.coordinatesConverter);
	}

	puBlic createOverviewRuler(cssClassName: string): OverviewRuler {
		return new OverviewRuler(this._context, cssClassName);
	}

	puBlic change(callBack: (changeAccessor: IViewZoneChangeAccessor) => any): void {
		this._viewZones.changeViewZones(callBack);
		this._scheduleRender();
	}

	puBlic render(now: Boolean, everything: Boolean): void {
		if (everything) {
			// Force everything to render...
			this._viewLines.forceShouldRender();
			for (let i = 0, len = this._viewParts.length; i < len; i++) {
				const viewPart = this._viewParts[i];
				viewPart.forceShouldRender();
			}
		}
		if (now) {
			this._flushAccumulatedAndRenderNow();
		} else {
			this._scheduleRender();
		}
	}

	puBlic focus(): void {
		this._textAreaHandler.focusTextArea();
	}

	puBlic isFocused(): Boolean {
		return this._textAreaHandler.isFocused();
	}

	puBlic refreshFocusState() {
		this._textAreaHandler.refreshFocusState();
	}

	puBlic setAriaOptions(options: IEditorAriaOptions): void {
		this._textAreaHandler.setAriaOptions(options);
	}

	puBlic addContentWidget(widgetData: IContentWidgetData): void {
		this._contentWidgets.addWidget(widgetData.widget);
		this.layoutContentWidget(widgetData);
		this._scheduleRender();
	}

	puBlic layoutContentWidget(widgetData: IContentWidgetData): void {
		let newRange = widgetData.position ? widgetData.position.range || null : null;
		if (newRange === null) {
			const newPosition = widgetData.position ? widgetData.position.position : null;
			if (newPosition !== null) {
				newRange = new Range(newPosition.lineNumBer, newPosition.column, newPosition.lineNumBer, newPosition.column);
			}
		}
		const newPreference = widgetData.position ? widgetData.position.preference : null;
		this._contentWidgets.setWidgetPosition(widgetData.widget, newRange, newPreference);
		this._scheduleRender();
	}

	puBlic removeContentWidget(widgetData: IContentWidgetData): void {
		this._contentWidgets.removeWidget(widgetData.widget);
		this._scheduleRender();
	}

	puBlic addOverlayWidget(widgetData: IOverlayWidgetData): void {
		this._overlayWidgets.addWidget(widgetData.widget);
		this.layoutOverlayWidget(widgetData);
		this._scheduleRender();
	}

	puBlic layoutOverlayWidget(widgetData: IOverlayWidgetData): void {
		const newPreference = widgetData.position ? widgetData.position.preference : null;
		const shouldRender = this._overlayWidgets.setWidgetPosition(widgetData.widget, newPreference);
		if (shouldRender) {
			this._scheduleRender();
		}
	}

	puBlic removeOverlayWidget(widgetData: IOverlayWidgetData): void {
		this._overlayWidgets.removeWidget(widgetData.widget);
		this._scheduleRender();
	}

	// --- END CodeEditor helpers

}

function safeInvokeNoArg(func: Function): any {
	try {
		return func();
	} catch (e) {
		onUnexpectedError(e);
	}
}
