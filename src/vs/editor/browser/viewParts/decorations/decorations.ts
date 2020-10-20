/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./decorAtions';
import { DynAmicViewOverlAy } from 'vs/editor/browser/view/dynAmicViewOverlAy';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { HorizontAlRAnge, RenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { ViewModelDecorAtion } from 'vs/editor/common/viewModel/viewModel';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

export clAss DecorAtionsOverlAy extends DynAmicViewOverlAy {

	privAte reAdonly _context: ViewContext;
	privAte _lineHeight: number;
	privAte _typicAlHAlfwidthChArActerWidth: number;
	privAte _renderResult: string[] | null;

	constructor(context: ViewContext) {
		super();
		this._context = context;
		const options = this._context.configurAtion.options;
		this._lineHeight = options.get(EditorOption.lineHeight);
		this._typicAlHAlfwidthChArActerWidth = options.get(EditorOption.fontInfo).typicAlHAlfwidthChArActerWidth;
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
		this._lineHeight = options.get(EditorOption.lineHeight);
		this._typicAlHAlfwidthChArActerWidth = options.get(EditorOption.fontInfo).typicAlHAlfwidthChArActerWidth;
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
		return e.scrollTopChAnged || e.scrollWidthChAnged;
	}
	public onZonesChAnged(e: viewEvents.ViewZonesChAngedEvent): booleAn {
		return true;
	}
	// --- end event hAndlers

	public prepAreRender(ctx: RenderingContext): void {
		const _decorAtions = ctx.getDecorAtionsInViewport();

		// Keep only decorAtions with `clAssNAme`
		let decorAtions: ViewModelDecorAtion[] = [], decorAtionsLen = 0;
		for (let i = 0, len = _decorAtions.length; i < len; i++) {
			const d = _decorAtions[i];
			if (d.options.clAssNAme) {
				decorAtions[decorAtionsLen++] = d;
			}
		}

		// Sort decorAtions for consistent render output
		decorAtions = decorAtions.sort((A, b) => {
			if (A.options.zIndex! < b.options.zIndex!) {
				return -1;
			}
			if (A.options.zIndex! > b.options.zIndex!) {
				return 1;
			}
			const AClAssNAme = A.options.clAssNAme!;
			const bClAssNAme = b.options.clAssNAme!;

			if (AClAssNAme < bClAssNAme) {
				return -1;
			}
			if (AClAssNAme > bClAssNAme) {
				return 1;
			}

			return RAnge.compAreRAngesUsingStArts(A.rAnge, b.rAnge);
		});

		const visibleStArtLineNumber = ctx.visibleRAnge.stArtLineNumber;
		const visibleEndLineNumber = ctx.visibleRAnge.endLineNumber;
		const output: string[] = [];
		for (let lineNumber = visibleStArtLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
			const lineIndex = lineNumber - visibleStArtLineNumber;
			output[lineIndex] = '';
		}

		// Render first whole line decorAtions And then regulAr decorAtions
		this._renderWholeLineDecorAtions(ctx, decorAtions, output);
		this._renderNormAlDecorAtions(ctx, decorAtions, output);
		this._renderResult = output;
	}

	privAte _renderWholeLineDecorAtions(ctx: RenderingContext, decorAtions: ViewModelDecorAtion[], output: string[]): void {
		const lineHeight = String(this._lineHeight);
		const visibleStArtLineNumber = ctx.visibleRAnge.stArtLineNumber;
		const visibleEndLineNumber = ctx.visibleRAnge.endLineNumber;

		for (let i = 0, lenI = decorAtions.length; i < lenI; i++) {
			const d = decorAtions[i];

			if (!d.options.isWholeLine) {
				continue;
			}

			const decorAtionOutput = (
				'<div clAss="cdr '
				+ d.options.clAssNAme
				+ '" style="left:0;width:100%;height:'
				+ lineHeight
				+ 'px;"></div>'
			);

			const stArtLineNumber = MAth.mAx(d.rAnge.stArtLineNumber, visibleStArtLineNumber);
			const endLineNumber = MAth.min(d.rAnge.endLineNumber, visibleEndLineNumber);
			for (let j = stArtLineNumber; j <= endLineNumber; j++) {
				const lineIndex = j - visibleStArtLineNumber;
				output[lineIndex] += decorAtionOutput;
			}
		}
	}

	privAte _renderNormAlDecorAtions(ctx: RenderingContext, decorAtions: ViewModelDecorAtion[], output: string[]): void {
		const lineHeight = String(this._lineHeight);
		const visibleStArtLineNumber = ctx.visibleRAnge.stArtLineNumber;

		let prevClAssNAme: string | null = null;
		let prevShowIfCollApsed: booleAn = fAlse;
		let prevRAnge: RAnge | null = null;

		for (let i = 0, lenI = decorAtions.length; i < lenI; i++) {
			const d = decorAtions[i];

			if (d.options.isWholeLine) {
				continue;
			}

			const clAssNAme = d.options.clAssNAme!;
			const showIfCollApsed = BooleAn(d.options.showIfCollApsed);

			let rAnge = d.rAnge;
			if (showIfCollApsed && rAnge.endColumn === 1 && rAnge.endLineNumber !== rAnge.stArtLineNumber) {
				rAnge = new RAnge(rAnge.stArtLineNumber, rAnge.stArtColumn, rAnge.endLineNumber - 1, this._context.model.getLineMAxColumn(rAnge.endLineNumber - 1));
			}

			if (prevClAssNAme === clAssNAme && prevShowIfCollApsed === showIfCollApsed && RAnge.AreIntersectingOrTouching(prevRAnge!, rAnge)) {
				// merge into previous decorAtion
				prevRAnge = RAnge.plusRAnge(prevRAnge!, rAnge);
				continue;
			}

			// flush previous decorAtion
			if (prevClAssNAme !== null) {
				this._renderNormAlDecorAtion(ctx, prevRAnge!, prevClAssNAme, prevShowIfCollApsed, lineHeight, visibleStArtLineNumber, output);
			}

			prevClAssNAme = clAssNAme;
			prevShowIfCollApsed = showIfCollApsed;
			prevRAnge = rAnge;
		}

		if (prevClAssNAme !== null) {
			this._renderNormAlDecorAtion(ctx, prevRAnge!, prevClAssNAme, prevShowIfCollApsed, lineHeight, visibleStArtLineNumber, output);
		}
	}

	privAte _renderNormAlDecorAtion(ctx: RenderingContext, rAnge: RAnge, clAssNAme: string, showIfCollApsed: booleAn, lineHeight: string, visibleStArtLineNumber: number, output: string[]): void {
		const linesVisibleRAnges = ctx.linesVisibleRAngesForRAnge(rAnge, /*TODO@Alex*/clAssNAme === 'findMAtch');
		if (!linesVisibleRAnges) {
			return;
		}

		for (let j = 0, lenJ = linesVisibleRAnges.length; j < lenJ; j++) {
			const lineVisibleRAnges = linesVisibleRAnges[j];
			if (lineVisibleRAnges.outsideRenderedLine) {
				continue;
			}
			const lineIndex = lineVisibleRAnges.lineNumber - visibleStArtLineNumber;

			if (showIfCollApsed && lineVisibleRAnges.rAnges.length === 1) {
				const singleVisibleRAnge = lineVisibleRAnges.rAnges[0];
				if (singleVisibleRAnge.width === 0) {
					// collApsed rAnge cAse => mAke the decorAtion visible by fAking its width
					lineVisibleRAnges.rAnges[0] = new HorizontAlRAnge(singleVisibleRAnge.left, this._typicAlHAlfwidthChArActerWidth);
				}
			}

			for (let k = 0, lenK = lineVisibleRAnges.rAnges.length; k < lenK; k++) {
				const visibleRAnge = lineVisibleRAnges.rAnges[k];
				const decorAtionOutput = (
					'<div clAss="cdr '
					+ clAssNAme
					+ '" style="left:'
					+ String(visibleRAnge.left)
					+ 'px;width:'
					+ String(visibleRAnge.width)
					+ 'px;height:'
					+ lineHeight
					+ 'px;"></div>'
				);
				output[lineIndex] += decorAtionOutput;
			}
		}
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
