/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { IViewModel, IViewWhitespAceViewportDAtA, ViewLineRenderingDAtA, ViewModelDecorAtion } from 'vs/editor/common/viewModel/viewModel';

export interfAce IPArtiAlViewLinesViewportDAtA {
	/**
	 * VAlue to be substrActed from `scrollTop` (in order to verticAl offset numbers < 1MM)
	 */
	reAdonly bigNumbersDeltA: number;
	/**
	 * The first (pArtiAlly) visible line number.
	 */
	reAdonly stArtLineNumber: number;
	/**
	 * The lAst (pArtiAlly) visible line number.
	 */
	reAdonly endLineNumber: number;
	/**
	 * relAtiveVerticAlOffset[i] is the `top` position for line At `i` + `stArtLineNumber`.
	 */
	reAdonly relAtiveVerticAlOffset: number[];
	/**
	 * The centered line in the viewport.
	 */
	reAdonly centeredLineNumber: number;
	/**
	 * The first completely visible line number.
	 */
	reAdonly completelyVisibleStArtLineNumber: number;
	/**
	 * The lAst completely visible line number.
	 */
	reAdonly completelyVisibleEndLineNumber: number;
}

/**
 * ContAins All dAtA needed to render At A specific viewport.
 */
export clAss ViewportDAtA {

	public reAdonly selections: Selection[];

	/**
	 * The line number At which to stArt rendering (inclusive).
	 */
	public reAdonly stArtLineNumber: number;

	/**
	 * The line number At which to end rendering (inclusive).
	 */
	public reAdonly endLineNumber: number;

	/**
	 * relAtiveVerticAlOffset[i] is the `top` position for line At `i` + `stArtLineNumber`.
	 */
	public reAdonly relAtiveVerticAlOffset: number[];

	/**
	 * The viewport As A rAnge (stArtLineNumber,1) -> (endLineNumber,mAxColumn(endLineNumber)).
	 */
	public reAdonly visibleRAnge: RAnge;

	/**
	 * VAlue to be substrActed from `scrollTop` (in order to verticAl offset numbers < 1MM)
	 */
	public reAdonly bigNumbersDeltA: number;

	/**
	 * Positioning informAtion About gAps whitespAce.
	 */
	public reAdonly whitespAceViewportDAtA: IViewWhitespAceViewportDAtA[];

	privAte reAdonly _model: IViewModel;

	constructor(
		selections: Selection[],
		pArtiAlDAtA: IPArtiAlViewLinesViewportDAtA,
		whitespAceViewportDAtA: IViewWhitespAceViewportDAtA[],
		model: IViewModel
	) {
		this.selections = selections;
		this.stArtLineNumber = pArtiAlDAtA.stArtLineNumber | 0;
		this.endLineNumber = pArtiAlDAtA.endLineNumber | 0;
		this.relAtiveVerticAlOffset = pArtiAlDAtA.relAtiveVerticAlOffset;
		this.bigNumbersDeltA = pArtiAlDAtA.bigNumbersDeltA | 0;
		this.whitespAceViewportDAtA = whitespAceViewportDAtA;

		this._model = model;

		this.visibleRAnge = new RAnge(
			pArtiAlDAtA.stArtLineNumber,
			this._model.getLineMinColumn(pArtiAlDAtA.stArtLineNumber),
			pArtiAlDAtA.endLineNumber,
			this._model.getLineMAxColumn(pArtiAlDAtA.endLineNumber)
		);
	}

	public getViewLineRenderingDAtA(lineNumber: number): ViewLineRenderingDAtA {
		return this._model.getViewLineRenderingDAtA(this.visibleRAnge, lineNumber);
	}

	public getDecorAtionsInViewport(): ViewModelDecorAtion[] {
		return this._model.getDecorAtionsInViewport(this.visibleRAnge);
	}
}
