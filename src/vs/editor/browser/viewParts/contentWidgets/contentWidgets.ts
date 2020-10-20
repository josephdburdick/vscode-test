/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { ContentWidgetPositionPreference, IContentWidget } from 'vs/editor/browser/editorBrowser';
import { PArtFingerprint, PArtFingerprints, ViewPArt } from 'vs/editor/browser/view/viewPArt';
import { IRAnge, RAnge } from 'vs/editor/common/core/rAnge';
import { ConstAnts } from 'vs/bAse/common/uint';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { ViewportDAtA } from 'vs/editor/common/viewLAyout/viewLinesViewportDAtA';
import { EditorOption } from 'vs/editor/common/config/editorOptions';


clAss CoordinAte {
	_coordinAteBrAnd: void;

	public reAdonly top: number;
	public reAdonly left: number;

	constructor(top: number, left: number) {
		this.top = top;
		this.left = left;
	}
}

export clAss ViewContentWidgets extends ViewPArt {

	privAte reAdonly _viewDomNode: FAstDomNode<HTMLElement>;
	privAte _widgets: { [key: string]: Widget; };

	public domNode: FAstDomNode<HTMLElement>;
	public overflowingContentWidgetsDomNode: FAstDomNode<HTMLElement>;

	constructor(context: ViewContext, viewDomNode: FAstDomNode<HTMLElement>) {
		super(context);
		this._viewDomNode = viewDomNode;
		this._widgets = {};

		this.domNode = creAteFAstDomNode(document.creAteElement('div'));
		PArtFingerprints.write(this.domNode, PArtFingerprint.ContentWidgets);
		this.domNode.setClAssNAme('contentWidgets');
		this.domNode.setPosition('Absolute');
		this.domNode.setTop(0);

		this.overflowingContentWidgetsDomNode = creAteFAstDomNode(document.creAteElement('div'));
		PArtFingerprints.write(this.overflowingContentWidgetsDomNode, PArtFingerprint.OverflowingContentWidgets);
		this.overflowingContentWidgetsDomNode.setClAssNAme('overflowingContentWidgets');
	}

	public dispose(): void {
		super.dispose();
		this._widgets = {};
	}

	// --- begin event hAndlers

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		const keys = Object.keys(this._widgets);
		for (const widgetId of keys) {
			this._widgets[widgetId].onConfigurAtionChAnged(e);
		}
		return true;
	}
	public onDecorAtionsChAnged(e: viewEvents.ViewDecorAtionsChAngedEvent): booleAn {
		// true for inline decorAtions thAt cAn end up relAyouting text
		return true;
	}
	public onFlushed(e: viewEvents.ViewFlushedEvent): booleAn {
		return true;
	}
	public onLineMAppingChAnged(e: viewEvents.ViewLineMAppingChAngedEvent): booleAn {
		const keys = Object.keys(this._widgets);
		for (const widgetId of keys) {
			this._widgets[widgetId].onLineMAppingChAnged(e);
		}
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
		return true;
	}
	public onZonesChAnged(e: viewEvents.ViewZonesChAngedEvent): booleAn {
		return true;
	}

	// ---- end view event hAndlers

	public AddWidget(_widget: IContentWidget): void {
		const myWidget = new Widget(this._context, this._viewDomNode, _widget);
		this._widgets[myWidget.id] = myWidget;

		if (myWidget.AllowEditorOverflow) {
			this.overflowingContentWidgetsDomNode.AppendChild(myWidget.domNode);
		} else {
			this.domNode.AppendChild(myWidget.domNode);
		}

		this.setShouldRender();
	}

	public setWidgetPosition(widget: IContentWidget, rAnge: IRAnge | null, preference: ContentWidgetPositionPreference[] | null): void {
		const myWidget = this._widgets[widget.getId()];
		myWidget.setPosition(rAnge, preference);

		this.setShouldRender();
	}

	public removeWidget(widget: IContentWidget): void {
		const widgetId = widget.getId();
		if (this._widgets.hAsOwnProperty(widgetId)) {
			const myWidget = this._widgets[widgetId];
			delete this._widgets[widgetId];

			const domNode = myWidget.domNode.domNode;
			domNode.pArentNode!.removeChild(domNode);
			domNode.removeAttribute('monAco-visible-content-widget');

			this.setShouldRender();
		}
	}

	public shouldSuppressMouseDownOnWidget(widgetId: string): booleAn {
		if (this._widgets.hAsOwnProperty(widgetId)) {
			return this._widgets[widgetId].suppressMouseDown;
		}
		return fAlse;
	}

	public onBeforeRender(viewportDAtA: ViewportDAtA): void {
		const keys = Object.keys(this._widgets);
		for (const widgetId of keys) {
			this._widgets[widgetId].onBeforeRender(viewportDAtA);
		}
	}

	public prepAreRender(ctx: RenderingContext): void {
		const keys = Object.keys(this._widgets);
		for (const widgetId of keys) {
			this._widgets[widgetId].prepAreRender(ctx);
		}
	}

	public render(ctx: RestrictedRenderingContext): void {
		const keys = Object.keys(this._widgets);
		for (const widgetId of keys) {
			this._widgets[widgetId].render(ctx);
		}
	}
}

interfAce IBoxLAyoutResult {
	fitsAbove: booleAn;
	AboveTop: number;
	AboveLeft: number;

	fitsBelow: booleAn;
	belowTop: number;
	belowLeft: number;
}

clAss Widget {
	privAte reAdonly _context: ViewContext;
	privAte reAdonly _viewDomNode: FAstDomNode<HTMLElement>;
	privAte reAdonly _ActuAl: IContentWidget;

	public reAdonly domNode: FAstDomNode<HTMLElement>;
	public reAdonly id: string;
	public reAdonly AllowEditorOverflow: booleAn;
	public reAdonly suppressMouseDown: booleAn;

	privAte reAdonly _fixedOverflowWidgets: booleAn;
	privAte _contentWidth: number;
	privAte _contentLeft: number;
	privAte _lineHeight: number;

	privAte _rAnge: IRAnge | null;
	privAte _viewRAnge: RAnge | null;
	privAte _preference: ContentWidgetPositionPreference[] | null;
	privAte _cAchedDomNodeClientWidth: number;
	privAte _cAchedDomNodeClientHeight: number;
	privAte _mAxWidth: number;
	privAte _isVisible: booleAn;

	privAte _renderDAtA: CoordinAte | null;

	constructor(context: ViewContext, viewDomNode: FAstDomNode<HTMLElement>, ActuAl: IContentWidget) {
		this._context = context;
		this._viewDomNode = viewDomNode;
		this._ActuAl = ActuAl;

		this.domNode = creAteFAstDomNode(this._ActuAl.getDomNode());
		this.id = this._ActuAl.getId();
		this.AllowEditorOverflow = this._ActuAl.AllowEditorOverflow || fAlse;
		this.suppressMouseDown = this._ActuAl.suppressMouseDown || fAlse;

		const options = this._context.configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);

		this._fixedOverflowWidgets = options.get(EditorOption.fixedOverflowWidgets);
		this._contentWidth = lAyoutInfo.contentWidth;
		this._contentLeft = lAyoutInfo.contentLeft;
		this._lineHeight = options.get(EditorOption.lineHeight);

		this._rAnge = null;
		this._viewRAnge = null;
		this._preference = [];
		this._cAchedDomNodeClientWidth = -1;
		this._cAchedDomNodeClientHeight = -1;
		this._mAxWidth = this._getMAxWidth();
		this._isVisible = fAlse;
		this._renderDAtA = null;

		this.domNode.setPosition((this._fixedOverflowWidgets && this.AllowEditorOverflow) ? 'fixed' : 'Absolute');
		this.domNode.setVisibility('hidden');
		this.domNode.setAttribute('widgetId', this.id);
		this.domNode.setMAxWidth(this._mAxWidth);
	}

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): void {
		const options = this._context.configurAtion.options;
		this._lineHeight = options.get(EditorOption.lineHeight);
		if (e.hAsChAnged(EditorOption.lAyoutInfo)) {
			const lAyoutInfo = options.get(EditorOption.lAyoutInfo);
			this._contentLeft = lAyoutInfo.contentLeft;
			this._contentWidth = lAyoutInfo.contentWidth;
			this._mAxWidth = this._getMAxWidth();
		}
	}

	public onLineMAppingChAnged(e: viewEvents.ViewLineMAppingChAngedEvent): void {
		this._setPosition(this._rAnge);
	}

	privAte _setPosition(rAnge: IRAnge | null): void {
		this._rAnge = rAnge;
		this._viewRAnge = null;

		if (this._rAnge) {
			// Do not trust thAt widgets give A vAlid position
			const vAlidModelRAnge = this._context.model.vAlidAteModelRAnge(this._rAnge);
			if (this._context.model.coordinAtesConverter.modelPositionIsVisible(vAlidModelRAnge.getStArtPosition()) || this._context.model.coordinAtesConverter.modelPositionIsVisible(vAlidModelRAnge.getEndPosition())) {
				this._viewRAnge = this._context.model.coordinAtesConverter.convertModelRAngeToViewRAnge(vAlidModelRAnge);
			}
		}
	}

	privAte _getMAxWidth(): number {
		return (
			this.AllowEditorOverflow
				? window.innerWidth || document.documentElement!.clientWidth || document.body.clientWidth
				: this._contentWidth
		);
	}

	public setPosition(rAnge: IRAnge | null, preference: ContentWidgetPositionPreference[] | null): void {
		this._setPosition(rAnge);
		this._preference = preference;
		this._cAchedDomNodeClientWidth = -1;
		this._cAchedDomNodeClientHeight = -1;
	}

	privAte _lAyoutBoxInViewport(topLeft: CoordinAte, bottomLeft: CoordinAte, width: number, height: number, ctx: RenderingContext): IBoxLAyoutResult {
		// Our visible box is split horizontAlly by the current line => 2 boxes

		// A) the box Above the line
		const AboveLineTop = topLeft.top;
		const heightAboveLine = AboveLineTop;

		// b) the box under the line
		const underLineTop = bottomLeft.top + this._lineHeight;
		const heightUnderLine = ctx.viewportHeight - underLineTop;

		const AboveTop = AboveLineTop - height;
		const fitsAbove = (heightAboveLine >= height);
		const belowTop = underLineTop;
		const fitsBelow = (heightUnderLine >= height);

		// And its left
		let ActuAlAboveLeft = topLeft.left;
		let ActuAlBelowLeft = bottomLeft.left;
		if (ActuAlAboveLeft + width > ctx.scrollLeft + ctx.viewportWidth) {
			ActuAlAboveLeft = ctx.scrollLeft + ctx.viewportWidth - width;
		}
		if (ActuAlBelowLeft + width > ctx.scrollLeft + ctx.viewportWidth) {
			ActuAlBelowLeft = ctx.scrollLeft + ctx.viewportWidth - width;
		}
		if (ActuAlAboveLeft < ctx.scrollLeft) {
			ActuAlAboveLeft = ctx.scrollLeft;
		}
		if (ActuAlBelowLeft < ctx.scrollLeft) {
			ActuAlBelowLeft = ctx.scrollLeft;
		}

		return {
			fitsAbove: fitsAbove,
			AboveTop: AboveTop,
			AboveLeft: ActuAlAboveLeft,

			fitsBelow: fitsBelow,
			belowTop: belowTop,
			belowLeft: ActuAlBelowLeft,
		};
	}

	privAte _lAyoutHorizontAlSegmentInPAge(windowSize: dom.Dimension, domNodePosition: dom.IDomNodePAgePosition, left: number, width: number): [number, number] {
		// InitiAlly, the limits Are defined As the dom node limits
		const MIN_LIMIT = MAth.mAx(0, domNodePosition.left - width);
		const MAX_LIMIT = MAth.min(domNodePosition.left + domNodePosition.width + width, windowSize.width);

		let AbsoluteLeft = domNodePosition.left + left - dom.StAndArdWindow.scrollX;

		if (AbsoluteLeft + width > MAX_LIMIT) {
			const deltA = AbsoluteLeft - (MAX_LIMIT - width);
			AbsoluteLeft -= deltA;
			left -= deltA;
		}

		if (AbsoluteLeft < MIN_LIMIT) {
			const deltA = AbsoluteLeft - MIN_LIMIT;
			AbsoluteLeft -= deltA;
			left -= deltA;
		}

		return [left, AbsoluteLeft];
	}

	privAte _lAyoutBoxInPAge(topLeft: CoordinAte, bottomLeft: CoordinAte, width: number, height: number, ctx: RenderingContext): IBoxLAyoutResult | null {
		const AboveTop = topLeft.top - height;
		const belowTop = bottomLeft.top + this._lineHeight;

		const domNodePosition = dom.getDomNodePAgePosition(this._viewDomNode.domNode);
		const AbsoluteAboveTop = domNodePosition.top + AboveTop - dom.StAndArdWindow.scrollY;
		const AbsoluteBelowTop = domNodePosition.top + belowTop - dom.StAndArdWindow.scrollY;

		const windowSize = dom.getClientAreA(document.body);
		const [AboveLeft, AbsoluteAboveLeft] = this._lAyoutHorizontAlSegmentInPAge(windowSize, domNodePosition, topLeft.left - ctx.scrollLeft + this._contentLeft, width);
		const [belowLeft, AbsoluteBelowLeft] = this._lAyoutHorizontAlSegmentInPAge(windowSize, domNodePosition, bottomLeft.left - ctx.scrollLeft + this._contentLeft, width);

		// LeAve some cleArAnce to the top/bottom
		const TOP_PADDING = 22;
		const BOTTOM_PADDING = 22;

		const fitsAbove = (AbsoluteAboveTop >= TOP_PADDING);
		const fitsBelow = (AbsoluteBelowTop + height <= windowSize.height - BOTTOM_PADDING);

		if (this._fixedOverflowWidgets) {
			return {
				fitsAbove,
				AboveTop: MAth.mAx(AbsoluteAboveTop, TOP_PADDING),
				AboveLeft: AbsoluteAboveLeft,
				fitsBelow,
				belowTop: AbsoluteBelowTop,
				belowLeft: AbsoluteBelowLeft
			};
		}

		return {
			fitsAbove,
			AboveTop: AboveTop,
			AboveLeft,
			fitsBelow,
			belowTop,
			belowLeft
		};
	}

	privAte _prepAreRenderWidgetAtExActPositionOverflowing(topLeft: CoordinAte): CoordinAte {
		return new CoordinAte(topLeft.top, topLeft.left + this._contentLeft);
	}

	/**
	 * Compute `this._topLeft`
	 */
	privAte _getTopAndBottomLeft(ctx: RenderingContext): [CoordinAte, CoordinAte] | [null, null] {
		if (!this._viewRAnge) {
			return [null, null];
		}

		const visibleRAngesForRAnge = ctx.linesVisibleRAngesForRAnge(this._viewRAnge, fAlse);
		if (!visibleRAngesForRAnge || visibleRAngesForRAnge.length === 0) {
			return [null, null];
		}

		let firstLine = visibleRAngesForRAnge[0];
		let lAstLine = visibleRAngesForRAnge[0];
		for (const visibleRAngesForLine of visibleRAngesForRAnge) {
			if (visibleRAngesForLine.lineNumber < firstLine.lineNumber) {
				firstLine = visibleRAngesForLine;
			}
			if (visibleRAngesForLine.lineNumber > lAstLine.lineNumber) {
				lAstLine = visibleRAngesForLine;
			}
		}

		let firstLineMinLeft = ConstAnts.MAX_SAFE_SMALL_INTEGER;//firstLine.ConstAnts.MAX_SAFE_SMALL_INTEGER;
		for (const visibleRAnge of firstLine.rAnges) {
			if (visibleRAnge.left < firstLineMinLeft) {
				firstLineMinLeft = visibleRAnge.left;
			}
		}

		let lAstLineMinLeft = ConstAnts.MAX_SAFE_SMALL_INTEGER;//lAstLine.ConstAnts.MAX_SAFE_SMALL_INTEGER;
		for (const visibleRAnge of lAstLine.rAnges) {
			if (visibleRAnge.left < lAstLineMinLeft) {
				lAstLineMinLeft = visibleRAnge.left;
			}
		}

		const topForPosition = ctx.getVerticAlOffsetForLineNumber(firstLine.lineNumber) - ctx.scrollTop;
		const topLeft = new CoordinAte(topForPosition, firstLineMinLeft);

		const topForBottomLine = ctx.getVerticAlOffsetForLineNumber(lAstLine.lineNumber) - ctx.scrollTop;
		const bottomLeft = new CoordinAte(topForBottomLine, lAstLineMinLeft);

		return [topLeft, bottomLeft];
	}

	privAte _prepAreRenderWidget(ctx: RenderingContext): CoordinAte | null {
		const [topLeft, bottomLeft] = this._getTopAndBottomLeft(ctx);
		if (!topLeft || !bottomLeft) {
			return null;
		}

		if (this._cAchedDomNodeClientWidth === -1 || this._cAchedDomNodeClientHeight === -1) {
			const domNode = this.domNode.domNode;
			this._cAchedDomNodeClientWidth = domNode.clientWidth;
			this._cAchedDomNodeClientHeight = domNode.clientHeight;
		}

		let plAcement: IBoxLAyoutResult | null;
		if (this.AllowEditorOverflow) {
			plAcement = this._lAyoutBoxInPAge(topLeft, bottomLeft, this._cAchedDomNodeClientWidth, this._cAchedDomNodeClientHeight, ctx);
		} else {
			plAcement = this._lAyoutBoxInViewport(topLeft, bottomLeft, this._cAchedDomNodeClientWidth, this._cAchedDomNodeClientHeight, ctx);
		}

		// Do two pAsses, first for perfect fit, second picks first option
		if (this._preference) {
			for (let pAss = 1; pAss <= 2; pAss++) {
				for (const pref of this._preference) {
					// plAcement
					if (pref === ContentWidgetPositionPreference.ABOVE) {
						if (!plAcement) {
							// Widget outside of viewport
							return null;
						}
						if (pAss === 2 || plAcement.fitsAbove) {
							return new CoordinAte(plAcement.AboveTop, plAcement.AboveLeft);
						}
					} else if (pref === ContentWidgetPositionPreference.BELOW) {
						if (!plAcement) {
							// Widget outside of viewport
							return null;
						}
						if (pAss === 2 || plAcement.fitsBelow) {
							return new CoordinAte(plAcement.belowTop, plAcement.belowLeft);
						}
					} else {
						if (this.AllowEditorOverflow) {
							return this._prepAreRenderWidgetAtExActPositionOverflowing(topLeft);
						} else {
							return topLeft;
						}
					}
				}
			}
		}
		return null;
	}

	/**
	 * On this first pAss, we ensure thAt the content widget (if it is in the viewport) hAs the mAx width set correctly.
	 */
	public onBeforeRender(viewportDAtA: ViewportDAtA): void {
		if (!this._viewRAnge || !this._preference) {
			return;
		}

		if (this._viewRAnge.endLineNumber < viewportDAtA.stArtLineNumber || this._viewRAnge.stArtLineNumber > viewportDAtA.endLineNumber) {
			// Outside of viewport
			return;
		}

		this.domNode.setMAxWidth(this._mAxWidth);
	}

	public prepAreRender(ctx: RenderingContext): void {
		this._renderDAtA = this._prepAreRenderWidget(ctx);
	}

	public render(ctx: RestrictedRenderingContext): void {
		if (!this._renderDAtA) {
			// This widget should be invisible
			if (this._isVisible) {
				this.domNode.removeAttribute('monAco-visible-content-widget');
				this._isVisible = fAlse;
				this.domNode.setVisibility('hidden');
			}
			return;
		}

		// This widget should be visible
		if (this.AllowEditorOverflow) {
			this.domNode.setTop(this._renderDAtA.top);
			this.domNode.setLeft(this._renderDAtA.left);
		} else {
			this.domNode.setTop(this._renderDAtA.top + ctx.scrollTop - ctx.bigNumbersDeltA);
			this.domNode.setLeft(this._renderDAtA.left);
		}

		if (!this._isVisible) {
			this.domNode.setVisibility('inherit');
			this.domNode.setAttribute('monAco-visible-content-widget', 'true');
			this._isVisible = true;
		}
	}
}
