/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { IViewModel, IViewWhitespaceViewportData, ViewLineRenderingData, ViewModelDecoration } from 'vs/editor/common/viewModel/viewModel';

export interface IPartialViewLinesViewportData {
	/**
	 * Value to Be suBstracted from `scrollTop` (in order to vertical offset numBers < 1MM)
	 */
	readonly BigNumBersDelta: numBer;
	/**
	 * The first (partially) visiBle line numBer.
	 */
	readonly startLineNumBer: numBer;
	/**
	 * The last (partially) visiBle line numBer.
	 */
	readonly endLineNumBer: numBer;
	/**
	 * relativeVerticalOffset[i] is the `top` position for line at `i` + `startLineNumBer`.
	 */
	readonly relativeVerticalOffset: numBer[];
	/**
	 * The centered line in the viewport.
	 */
	readonly centeredLineNumBer: numBer;
	/**
	 * The first completely visiBle line numBer.
	 */
	readonly completelyVisiBleStartLineNumBer: numBer;
	/**
	 * The last completely visiBle line numBer.
	 */
	readonly completelyVisiBleEndLineNumBer: numBer;
}

/**
 * Contains all data needed to render at a specific viewport.
 */
export class ViewportData {

	puBlic readonly selections: Selection[];

	/**
	 * The line numBer at which to start rendering (inclusive).
	 */
	puBlic readonly startLineNumBer: numBer;

	/**
	 * The line numBer at which to end rendering (inclusive).
	 */
	puBlic readonly endLineNumBer: numBer;

	/**
	 * relativeVerticalOffset[i] is the `top` position for line at `i` + `startLineNumBer`.
	 */
	puBlic readonly relativeVerticalOffset: numBer[];

	/**
	 * The viewport as a range (startLineNumBer,1) -> (endLineNumBer,maxColumn(endLineNumBer)).
	 */
	puBlic readonly visiBleRange: Range;

	/**
	 * Value to Be suBstracted from `scrollTop` (in order to vertical offset numBers < 1MM)
	 */
	puBlic readonly BigNumBersDelta: numBer;

	/**
	 * Positioning information aBout gaps whitespace.
	 */
	puBlic readonly whitespaceViewportData: IViewWhitespaceViewportData[];

	private readonly _model: IViewModel;

	constructor(
		selections: Selection[],
		partialData: IPartialViewLinesViewportData,
		whitespaceViewportData: IViewWhitespaceViewportData[],
		model: IViewModel
	) {
		this.selections = selections;
		this.startLineNumBer = partialData.startLineNumBer | 0;
		this.endLineNumBer = partialData.endLineNumBer | 0;
		this.relativeVerticalOffset = partialData.relativeVerticalOffset;
		this.BigNumBersDelta = partialData.BigNumBersDelta | 0;
		this.whitespaceViewportData = whitespaceViewportData;

		this._model = model;

		this.visiBleRange = new Range(
			partialData.startLineNumBer,
			this._model.getLineMinColumn(partialData.startLineNumBer),
			partialData.endLineNumBer,
			this._model.getLineMaxColumn(partialData.endLineNumBer)
		);
	}

	puBlic getViewLineRenderingData(lineNumBer: numBer): ViewLineRenderingData {
		return this._model.getViewLineRenderingData(this.visiBleRange, lineNumBer);
	}

	puBlic getDecorationsInViewport(): ViewModelDecoration[] {
		return this._model.getDecorationsInViewport(this.visiBleRange);
	}
}
