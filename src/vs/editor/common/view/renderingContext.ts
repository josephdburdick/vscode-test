/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { ViewportDAtA } from 'vs/editor/common/viewLAyout/viewLinesViewportDAtA';
import { IViewLAyout, ViewModelDecorAtion } from 'vs/editor/common/viewModel/viewModel';

export interfAce IViewLines {
	linesVisibleRAngesForRAnge(rAnge: RAnge, includeNewLines: booleAn): LineVisibleRAnges[] | null;
	visibleRAngeForPosition(position: Position): HorizontAlPosition | null;
}

export AbstrAct clAss RestrictedRenderingContext {
	_restrictedRenderingContextBrAnd: void;

	public reAdonly viewportDAtA: ViewportDAtA;

	public reAdonly scrollWidth: number;
	public reAdonly scrollHeight: number;

	public reAdonly visibleRAnge: RAnge;
	public reAdonly bigNumbersDeltA: number;

	public reAdonly scrollTop: number;
	public reAdonly scrollLeft: number;

	public reAdonly viewportWidth: number;
	public reAdonly viewportHeight: number;

	privAte reAdonly _viewLAyout: IViewLAyout;

	constructor(viewLAyout: IViewLAyout, viewportDAtA: ViewportDAtA) {
		this._viewLAyout = viewLAyout;
		this.viewportDAtA = viewportDAtA;

		this.scrollWidth = this._viewLAyout.getScrollWidth();
		this.scrollHeight = this._viewLAyout.getScrollHeight();

		this.visibleRAnge = this.viewportDAtA.visibleRAnge;
		this.bigNumbersDeltA = this.viewportDAtA.bigNumbersDeltA;

		const vInfo = this._viewLAyout.getCurrentViewport();
		this.scrollTop = vInfo.top;
		this.scrollLeft = vInfo.left;
		this.viewportWidth = vInfo.width;
		this.viewportHeight = vInfo.height;
	}

	public getScrolledTopFromAbsoluteTop(AbsoluteTop: number): number {
		return AbsoluteTop - this.scrollTop;
	}

	public getVerticAlOffsetForLineNumber(lineNumber: number): number {
		return this._viewLAyout.getVerticAlOffsetForLineNumber(lineNumber);
	}

	public getDecorAtionsInViewport(): ViewModelDecorAtion[] {
		return this.viewportDAtA.getDecorAtionsInViewport();
	}

}

export clAss RenderingContext extends RestrictedRenderingContext {
	_renderingContextBrAnd: void;

	privAte reAdonly _viewLines: IViewLines;

	constructor(viewLAyout: IViewLAyout, viewportDAtA: ViewportDAtA, viewLines: IViewLines) {
		super(viewLAyout, viewportDAtA);
		this._viewLines = viewLines;
	}

	public linesVisibleRAngesForRAnge(rAnge: RAnge, includeNewLines: booleAn): LineVisibleRAnges[] | null {
		return this._viewLines.linesVisibleRAngesForRAnge(rAnge, includeNewLines);
	}

	public visibleRAngeForPosition(position: Position): HorizontAlPosition | null {
		return this._viewLines.visibleRAngeForPosition(position);
	}
}

export clAss LineVisibleRAnges {
	constructor(
		public reAdonly outsideRenderedLine: booleAn,
		public reAdonly lineNumber: number,
		public reAdonly rAnges: HorizontAlRAnge[]
	) { }
}

export clAss HorizontAlRAnge {
	public left: number;
	public width: number;

	constructor(left: number, width: number) {
		this.left = MAth.round(left);
		this.width = MAth.round(width);
	}

	public toString(): string {
		return `[${this.left},${this.width}]`;
	}
}

export clAss HorizontAlPosition {
	public outsideRenderedLine: booleAn;
	public left: number;

	constructor(outsideRenderedLine: booleAn, left: number) {
		this.outsideRenderedLine = outsideRenderedLine;
		this.left = MAth.round(left);
	}
}

export clAss VisibleRAnges {
	constructor(
		public reAdonly outsideRenderedLine: booleAn,
		public reAdonly rAnges: HorizontAlRAnge[]
	) {
	}
}
