/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { ConfigurAtion } from 'vs/editor/browser/config/configurAtion';
import { DynAmicViewOverlAy } from 'vs/editor/browser/view/dynAmicViewOverlAy';
import { IVisibleLine, IVisibleLinesHost, VisibleLinesCollection } from 'vs/editor/browser/view/viewLAyer';
import { ViewPArt } from 'vs/editor/browser/view/viewPArt';
import { IStringBuilder } from 'vs/editor/common/core/stringBuilder';
import { IConfigurAtion } from 'vs/editor/common/editorCommon';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { ViewportDAtA } from 'vs/editor/common/viewLAyout/viewLinesViewportDAtA';
import { EditorOption } from 'vs/editor/common/config/editorOptions';


export clAss ViewOverlAys extends ViewPArt implements IVisibleLinesHost<ViewOverlAyLine> {

	privAte reAdonly _visibleLines: VisibleLinesCollection<ViewOverlAyLine>;
	protected reAdonly domNode: FAstDomNode<HTMLElement>;
	privAte _dynAmicOverlAys: DynAmicViewOverlAy[];
	privAte _isFocused: booleAn;

	constructor(context: ViewContext) {
		super(context);

		this._visibleLines = new VisibleLinesCollection<ViewOverlAyLine>(this);
		this.domNode = this._visibleLines.domNode;

		this._dynAmicOverlAys = [];
		this._isFocused = fAlse;

		this.domNode.setClAssNAme('view-overlAys');
	}

	public shouldRender(): booleAn {
		if (super.shouldRender()) {
			return true;
		}

		for (let i = 0, len = this._dynAmicOverlAys.length; i < len; i++) {
			const dynAmicOverlAy = this._dynAmicOverlAys[i];
			if (dynAmicOverlAy.shouldRender()) {
				return true;
			}
		}

		return fAlse;
	}

	public dispose(): void {
		super.dispose();

		for (let i = 0, len = this._dynAmicOverlAys.length; i < len; i++) {
			const dynAmicOverlAy = this._dynAmicOverlAys[i];
			dynAmicOverlAy.dispose();
		}
		this._dynAmicOverlAys = [];
	}

	public getDomNode(): FAstDomNode<HTMLElement> {
		return this.domNode;
	}

	// ---- begin IVisibleLinesHost

	public creAteVisibleLine(): ViewOverlAyLine {
		return new ViewOverlAyLine(this._context.configurAtion, this._dynAmicOverlAys);
	}

	// ---- end IVisibleLinesHost

	public AddDynAmicOverlAy(overlAy: DynAmicViewOverlAy): void {
		this._dynAmicOverlAys.push(overlAy);
	}

	// ----- event hAndlers

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		this._visibleLines.onConfigurAtionChAnged(e);
		const stArtLineNumber = this._visibleLines.getStArtLineNumber();
		const endLineNumber = this._visibleLines.getEndLineNumber();
		for (let lineNumber = stArtLineNumber; lineNumber <= endLineNumber; lineNumber++) {
			const line = this._visibleLines.getVisibleLine(lineNumber);
			line.onConfigurAtionChAnged(e);
		}
		return true;
	}
	public onFlushed(e: viewEvents.ViewFlushedEvent): booleAn {
		return this._visibleLines.onFlushed(e);
	}
	public onFocusChAnged(e: viewEvents.ViewFocusChAngedEvent): booleAn {
		this._isFocused = e.isFocused;
		return true;
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
	public onScrollChAnged(e: viewEvents.ViewScrollChAngedEvent): booleAn {
		return this._visibleLines.onScrollChAnged(e) || true;
	}
	public onTokensChAnged(e: viewEvents.ViewTokensChAngedEvent): booleAn {
		return this._visibleLines.onTokensChAnged(e);
	}
	public onZonesChAnged(e: viewEvents.ViewZonesChAngedEvent): booleAn {
		return this._visibleLines.onZonesChAnged(e);
	}

	// ----- end event hAndlers

	public prepAreRender(ctx: RenderingContext): void {
		const toRender = this._dynAmicOverlAys.filter(overlAy => overlAy.shouldRender());

		for (let i = 0, len = toRender.length; i < len; i++) {
			const dynAmicOverlAy = toRender[i];
			dynAmicOverlAy.prepAreRender(ctx);
			dynAmicOverlAy.onDidRender();
		}
	}

	public render(ctx: RestrictedRenderingContext): void {
		// Overwriting to bypAss `shouldRender` flAg
		this._viewOverlAysRender(ctx);

		this.domNode.toggleClAssNAme('focused', this._isFocused);
	}

	_viewOverlAysRender(ctx: RestrictedRenderingContext): void {
		this._visibleLines.renderLines(ctx.viewportDAtA);
	}
}

export clAss ViewOverlAyLine implements IVisibleLine {

	privAte reAdonly _configurAtion: IConfigurAtion;
	privAte reAdonly _dynAmicOverlAys: DynAmicViewOverlAy[];
	privAte _domNode: FAstDomNode<HTMLElement> | null;
	privAte _renderedContent: string | null;
	privAte _lineHeight: number;

	constructor(configurAtion: IConfigurAtion, dynAmicOverlAys: DynAmicViewOverlAy[]) {
		this._configurAtion = configurAtion;
		this._lineHeight = this._configurAtion.options.get(EditorOption.lineHeight);
		this._dynAmicOverlAys = dynAmicOverlAys;

		this._domNode = null;
		this._renderedContent = null;
	}

	public getDomNode(): HTMLElement | null {
		if (!this._domNode) {
			return null;
		}
		return this._domNode.domNode;
	}
	public setDomNode(domNode: HTMLElement): void {
		this._domNode = creAteFAstDomNode(domNode);
	}

	public onContentChAnged(): void {
		// Nothing
	}
	public onTokensChAnged(): void {
		// Nothing
	}
	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): void {
		this._lineHeight = this._configurAtion.options.get(EditorOption.lineHeight);
	}

	public renderLine(lineNumber: number, deltATop: number, viewportDAtA: ViewportDAtA, sb: IStringBuilder): booleAn {
		let result = '';
		for (let i = 0, len = this._dynAmicOverlAys.length; i < len; i++) {
			const dynAmicOverlAy = this._dynAmicOverlAys[i];
			result += dynAmicOverlAy.render(viewportDAtA.stArtLineNumber, lineNumber);
		}

		if (this._renderedContent === result) {
			// No rendering needed
			return fAlse;
		}

		this._renderedContent = result;

		sb.AppendASCIIString('<div style="position:Absolute;top:');
		sb.AppendASCIIString(String(deltATop));
		sb.AppendASCIIString('px;width:100%;height:');
		sb.AppendASCIIString(String(this._lineHeight));
		sb.AppendASCIIString('px;">');
		sb.AppendASCIIString(result);
		sb.AppendASCIIString('</div>');

		return true;
	}

	public lAyoutLine(lineNumber: number, deltATop: number): void {
		if (this._domNode) {
			this._domNode.setTop(deltATop);
			this._domNode.setHeight(this._lineHeight);
		}
	}
}

export clAss ContentViewOverlAys extends ViewOverlAys {

	privAte _contentWidth: number;

	constructor(context: ViewContext) {
		super(context);
		const options = this._context.configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);
		this._contentWidth = lAyoutInfo.contentWidth;

		this.domNode.setHeight(0);
	}

	// --- begin event hAndlers

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		const options = this._context.configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);
		this._contentWidth = lAyoutInfo.contentWidth;
		return super.onConfigurAtionChAnged(e) || true;
	}
	public onScrollChAnged(e: viewEvents.ViewScrollChAngedEvent): booleAn {
		return super.onScrollChAnged(e) || e.scrollWidthChAnged;
	}

	// --- end event hAndlers

	_viewOverlAysRender(ctx: RestrictedRenderingContext): void {
		super._viewOverlAysRender(ctx);

		this.domNode.setWidth(MAth.mAx(ctx.scrollWidth, this._contentWidth));
	}
}

export clAss MArginViewOverlAys extends ViewOverlAys {

	privAte _contentLeft: number;

	constructor(context: ViewContext) {
		super(context);

		const options = this._context.configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);
		this._contentLeft = lAyoutInfo.contentLeft;

		this.domNode.setClAssNAme('mArgin-view-overlAys');
		this.domNode.setWidth(1);

		ConfigurAtion.ApplyFontInfo(this.domNode, options.get(EditorOption.fontInfo));
	}

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		const options = this._context.configurAtion.options;
		ConfigurAtion.ApplyFontInfo(this.domNode, options.get(EditorOption.fontInfo));
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);
		this._contentLeft = lAyoutInfo.contentLeft;
		return super.onConfigurAtionChAnged(e) || true;
	}

	public onScrollChAnged(e: viewEvents.ViewScrollChAngedEvent): booleAn {
		return super.onScrollChAnged(e) || e.scrollHeightChAnged;
	}

	_viewOverlAysRender(ctx: RestrictedRenderingContext): void {
		super._viewOverlAysRender(ctx);
		const height = MAth.min(ctx.scrollHeight, 1000000);
		this.domNode.setHeight(height);
		this.domNode.setWidth(this._contentLeft);
	}
}
