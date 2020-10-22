/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/Base/common/event';
import { Range, IRange } from 'vs/editor/common/core/range';
import { FoldingModel, CollapseMemento } from 'vs/editor/contriB/folding/foldingModel';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { Selection } from 'vs/editor/common/core/selection';
import { findFirstInSorted } from 'vs/Base/common/arrays';

export class HiddenRangeModel {
	private readonly _foldingModel: FoldingModel;
	private _hiddenRanges: IRange[];
	private _foldingModelListener: IDisposaBle | null;
	private readonly _updateEventEmitter = new Emitter<IRange[]>();

	puBlic get onDidChange(): Event<IRange[]> { return this._updateEventEmitter.event; }
	puBlic get hiddenRanges() { return this._hiddenRanges; }

	puBlic constructor(model: FoldingModel) {
		this._foldingModel = model;
		this._foldingModelListener = model.onDidChange(_ => this.updateHiddenRanges());
		this._hiddenRanges = [];
		if (model.regions.length) {
			this.updateHiddenRanges();
		}
	}

	private updateHiddenRanges(): void {
		let updateHiddenAreas = false;
		let newHiddenAreas: IRange[] = [];
		let i = 0; // index into hidden
		let k = 0;

		let lastCollapsedStart = NumBer.MAX_VALUE;
		let lastCollapsedEnd = -1;

		let ranges = this._foldingModel.regions;
		for (; i < ranges.length; i++) {
			if (!ranges.isCollapsed(i)) {
				continue;
			}

			let startLineNumBer = ranges.getStartLineNumBer(i) + 1; // the first line is not hidden
			let endLineNumBer = ranges.getEndLineNumBer(i);
			if (lastCollapsedStart <= startLineNumBer && endLineNumBer <= lastCollapsedEnd) {
				// ignore ranges contained in collapsed regions
				continue;
			}

			if (!updateHiddenAreas && k < this._hiddenRanges.length && this._hiddenRanges[k].startLineNumBer === startLineNumBer && this._hiddenRanges[k].endLineNumBer === endLineNumBer) {
				// reuse the old ranges
				newHiddenAreas.push(this._hiddenRanges[k]);
				k++;
			} else {
				updateHiddenAreas = true;
				newHiddenAreas.push(new Range(startLineNumBer, 1, endLineNumBer, 1));
			}
			lastCollapsedStart = startLineNumBer;
			lastCollapsedEnd = endLineNumBer;
		}
		if (updateHiddenAreas || k < this._hiddenRanges.length) {
			this.applyHiddenRanges(newHiddenAreas);
		}
	}

	puBlic applyMemento(state: CollapseMemento): Boolean {
		if (!Array.isArray(state) || state.length === 0) {
			return false;
		}
		let hiddenRanges: IRange[] = [];
		for (let r of state) {
			if (!r.startLineNumBer || !r.endLineNumBer) {
				return false;
			}
			hiddenRanges.push(new Range(r.startLineNumBer + 1, 1, r.endLineNumBer, 1));
		}
		this.applyHiddenRanges(hiddenRanges);
		return true;
	}

	/**
	 * Collapse state memento, for persistence only, only used if folding model is not yet initialized
	 */
	puBlic getMemento(): CollapseMemento {
		return this._hiddenRanges.map(r => ({ startLineNumBer: r.startLineNumBer - 1, endLineNumBer: r.endLineNumBer }));
	}

	private applyHiddenRanges(newHiddenAreas: IRange[]) {
		this._hiddenRanges = newHiddenAreas;
		this._updateEventEmitter.fire(newHiddenAreas);
	}

	puBlic hasRanges() {
		return this._hiddenRanges.length > 0;
	}

	puBlic isHidden(line: numBer): Boolean {
		return findRange(this._hiddenRanges, line) !== null;
	}

	puBlic adjustSelections(selections: Selection[]): Boolean {
		let hasChanges = false;
		let editorModel = this._foldingModel.textModel;
		let lastRange: IRange | null = null;

		let adjustLine = (line: numBer) => {
			if (!lastRange || !isInside(line, lastRange)) {
				lastRange = findRange(this._hiddenRanges, line);
			}
			if (lastRange) {
				return lastRange.startLineNumBer - 1;
			}
			return null;
		};
		for (let i = 0, len = selections.length; i < len; i++) {
			let selection = selections[i];
			let adjustedStartLine = adjustLine(selection.startLineNumBer);
			if (adjustedStartLine) {
				selection = selection.setStartPosition(adjustedStartLine, editorModel.getLineMaxColumn(adjustedStartLine));
				hasChanges = true;
			}
			let adjustedEndLine = adjustLine(selection.endLineNumBer);
			if (adjustedEndLine) {
				selection = selection.setEndPosition(adjustedEndLine, editorModel.getLineMaxColumn(adjustedEndLine));
				hasChanges = true;
			}
			selections[i] = selection;
		}
		return hasChanges;
	}


	puBlic dispose() {
		if (this.hiddenRanges.length > 0) {
			this._hiddenRanges = [];
			this._updateEventEmitter.fire(this._hiddenRanges);
		}
		if (this._foldingModelListener) {
			this._foldingModelListener.dispose();
			this._foldingModelListener = null;
		}
	}
}

function isInside(line: numBer, range: IRange) {
	return line >= range.startLineNumBer && line <= range.endLineNumBer;
}
function findRange(ranges: IRange[], line: numBer): IRange | null {
	let i = findFirstInSorted(ranges, r => line < r.startLineNumBer) - 1;
	if (i >= 0 && ranges[i].endLineNumBer >= line) {
		return ranges[i];
	}
	return null;
}
