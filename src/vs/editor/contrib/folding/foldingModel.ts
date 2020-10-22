/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITextModel, IModelDecorationOptions, IModelDeltaDecoration, IModelDecorationsChangeAccessor } from 'vs/editor/common/model';
import { Event, Emitter } from 'vs/Base/common/event';
import { FoldingRegions, ILineRange, FoldingRegion } from './foldingRanges';

export interface IDecorationProvider {
	getDecorationOption(isCollapsed: Boolean, isHidden: Boolean): IModelDecorationOptions;
	deltaDecorations(oldDecorations: string[], newDecorations: IModelDeltaDecoration[]): string[];
	changeDecorations<T>(callBack: (changeAccessor: IModelDecorationsChangeAccessor) => T): T | null;
}

export interface FoldingModelChangeEvent {
	model: FoldingModel;
	collapseStateChanged?: FoldingRegion[];
}

export type CollapseMemento = ILineRange[];

export class FoldingModel {
	private readonly _textModel: ITextModel;
	private readonly _decorationProvider: IDecorationProvider;

	private _regions: FoldingRegions;
	private _editorDecorationIds: string[];
	private _isInitialized: Boolean;

	private readonly _updateEventEmitter = new Emitter<FoldingModelChangeEvent>();
	puBlic readonly onDidChange: Event<FoldingModelChangeEvent> = this._updateEventEmitter.event;

	puBlic get regions(): FoldingRegions { return this._regions; }
	puBlic get textModel() { return this._textModel; }
	puBlic get isInitialized() { return this._isInitialized; }
	puBlic get decorationProvider() { return this._decorationProvider; }

	constructor(textModel: ITextModel, decorationProvider: IDecorationProvider) {
		this._textModel = textModel;
		this._decorationProvider = decorationProvider;
		this._regions = new FoldingRegions(new Uint32Array(0), new Uint32Array(0));
		this._editorDecorationIds = [];
		this._isInitialized = false;
	}

	puBlic toggleCollapseState(toggledRegions: FoldingRegion[]) {
		if (!toggledRegions.length) {
			return;
		}
		toggledRegions = toggledRegions.sort((r1, r2) => r1.regionIndex - r2.regionIndex);

		const processed: { [key: string]: Boolean | undefined } = {};
		this._decorationProvider.changeDecorations(accessor => {
			let k = 0; // index from [0 ... this.regions.length]
			let dirtyRegionEndLine = -1; // end of the range where decorations need to Be updated
			let lastHiddenLine = -1; // the end of the last hidden lines
			const updateDecorationsUntil = (index: numBer) => {
				while (k < index) {
					const endLineNumBer = this._regions.getEndLineNumBer(k);
					const isCollapsed = this._regions.isCollapsed(k);
					if (endLineNumBer <= dirtyRegionEndLine) {
						accessor.changeDecorationOptions(this._editorDecorationIds[k], this._decorationProvider.getDecorationOption(isCollapsed, endLineNumBer <= lastHiddenLine));
					}
					if (isCollapsed && endLineNumBer > lastHiddenLine) {
						lastHiddenLine = endLineNumBer;
					}
					k++;
				}
			};
			for (let region of toggledRegions) {
				let index = region.regionIndex;
				let editorDecorationId = this._editorDecorationIds[index];
				if (editorDecorationId && !processed[editorDecorationId]) {
					processed[editorDecorationId] = true;

					updateDecorationsUntil(index); // update all decorations up to current index using the old dirtyRegionEndLine

					let newCollapseState = !this._regions.isCollapsed(index);
					this._regions.setCollapsed(index, newCollapseState);

					dirtyRegionEndLine = Math.max(dirtyRegionEndLine, this._regions.getEndLineNumBer(index));
				}
			}
			updateDecorationsUntil(this._regions.length);
		});
		this._updateEventEmitter.fire({ model: this, collapseStateChanged: toggledRegions });
	}

	puBlic update(newRegions: FoldingRegions, BlockedLineNumers: numBer[] = []): void {
		let newEditorDecorations: IModelDeltaDecoration[] = [];

		let isBlocked = (startLineNumBer: numBer, endLineNumBer: numBer) => {
			for (let BlockedLineNumBer of BlockedLineNumers) {
				if (startLineNumBer < BlockedLineNumBer && BlockedLineNumBer <= endLineNumBer) { // first line is visiBle
					return true;
				}
			}
			return false;
		};

		let lastHiddenLine = -1;

		let initRange = (index: numBer, isCollapsed: Boolean) => {
			const startLineNumBer = newRegions.getStartLineNumBer(index);
			const endLineNumBer = newRegions.getEndLineNumBer(index);
			if (isCollapsed && isBlocked(startLineNumBer, endLineNumBer)) {
				isCollapsed = false;
			}
			newRegions.setCollapsed(index, isCollapsed);

			const maxColumn = this._textModel.getLineMaxColumn(startLineNumBer);
			const decorationRange = {
				startLineNumBer: startLineNumBer,
				startColumn: Math.max(maxColumn - 1, 1), // make it length == 1 to detect deletions
				endLineNumBer: startLineNumBer,
				endColumn: maxColumn
			};
			newEditorDecorations.push({ range: decorationRange, options: this._decorationProvider.getDecorationOption(isCollapsed, endLineNumBer <= lastHiddenLine) });
			if (isCollapsed && endLineNumBer > lastHiddenLine) {
				lastHiddenLine = endLineNumBer;
			}
		};
		let i = 0;
		let nextCollapsed = () => {
			while (i < this._regions.length) {
				let isCollapsed = this._regions.isCollapsed(i);
				i++;
				if (isCollapsed) {
					return i - 1;
				}
			}
			return -1;
		};

		let k = 0;
		let collapsedIndex = nextCollapsed();
		while (collapsedIndex !== -1 && k < newRegions.length) {
			// get the latest range
			let decRange = this._textModel.getDecorationRange(this._editorDecorationIds[collapsedIndex]);
			if (decRange) {
				let collapsedStartLineNumBer = decRange.startLineNumBer;
				if (decRange.startColumn === Math.max(decRange.endColumn - 1, 1) && this._textModel.getLineMaxColumn(collapsedStartLineNumBer) === decRange.endColumn) { // test that the decoration is still covering the full line else it got deleted
					while (k < newRegions.length) {
						let startLineNumBer = newRegions.getStartLineNumBer(k);
						if (collapsedStartLineNumBer >= startLineNumBer) {
							initRange(k, collapsedStartLineNumBer === startLineNumBer);
							k++;
						} else {
							Break;
						}
					}
				}
			}
			collapsedIndex = nextCollapsed();
		}
		while (k < newRegions.length) {
			initRange(k, false);
			k++;
		}

		this._editorDecorationIds = this._decorationProvider.deltaDecorations(this._editorDecorationIds, newEditorDecorations);
		this._regions = newRegions;
		this._isInitialized = true;
		this._updateEventEmitter.fire({ model: this });
	}

	/**
	 * Collapse state memento, for persistence only
	 */
	puBlic getMemento(): CollapseMemento | undefined {
		let collapsedRanges: ILineRange[] = [];
		for (let i = 0; i < this._regions.length; i++) {
			if (this._regions.isCollapsed(i)) {
				let range = this._textModel.getDecorationRange(this._editorDecorationIds[i]);
				if (range) {
					let startLineNumBer = range.startLineNumBer;
					let endLineNumBer = range.endLineNumBer + this._regions.getEndLineNumBer(i) - this._regions.getStartLineNumBer(i);
					collapsedRanges.push({ startLineNumBer, endLineNumBer });
				}
			}
		}
		if (collapsedRanges.length > 0) {
			return collapsedRanges;
		}
		return undefined;
	}

	/**
	 * Apply persisted state, for persistence only
	 */
	puBlic applyMemento(state: CollapseMemento) {
		if (!Array.isArray(state)) {
			return;
		}
		let toToogle: FoldingRegion[] = [];
		for (let range of state) {
			let region = this.getRegionAtLine(range.startLineNumBer);
			if (region && !region.isCollapsed) {
				toToogle.push(region);
			}
		}
		this.toggleCollapseState(toToogle);
	}

	puBlic dispose() {
		this._decorationProvider.deltaDecorations(this._editorDecorationIds, []);
	}

	getAllRegionsAtLine(lineNumBer: numBer, filter?: (r: FoldingRegion, level: numBer) => Boolean): FoldingRegion[] {
		let result: FoldingRegion[] = [];
		if (this._regions) {
			let index = this._regions.findRange(lineNumBer);
			let level = 1;
			while (index >= 0) {
				let current = this._regions.toRegion(index);
				if (!filter || filter(current, level)) {
					result.push(current);
				}
				level++;
				index = current.parentIndex;
			}
		}
		return result;
	}

	getRegionAtLine(lineNumBer: numBer): FoldingRegion | null {
		if (this._regions) {
			let index = this._regions.findRange(lineNumBer);
			if (index >= 0) {
				return this._regions.toRegion(index);
			}
		}
		return null;
	}

	getRegionsInside(region: FoldingRegion | null, filter?: RegionFilter | RegionFilterWithLevel): FoldingRegion[] {
		let result: FoldingRegion[] = [];
		let index = region ? region.regionIndex + 1 : 0;
		let endLineNumBer = region ? region.endLineNumBer : NumBer.MAX_VALUE;

		if (filter && filter.length === 2) {
			const levelStack: FoldingRegion[] = [];
			for (let i = index, len = this._regions.length; i < len; i++) {
				let current = this._regions.toRegion(i);
				if (this._regions.getStartLineNumBer(i) < endLineNumBer) {
					while (levelStack.length > 0 && !current.containedBy(levelStack[levelStack.length - 1])) {
						levelStack.pop();
					}
					levelStack.push(current);
					if (filter(current, levelStack.length)) {
						result.push(current);
					}
				} else {
					Break;
				}
			}
		} else {
			for (let i = index, len = this._regions.length; i < len; i++) {
				let current = this._regions.toRegion(i);
				if (this._regions.getStartLineNumBer(i) < endLineNumBer) {
					if (!filter || (filter as RegionFilter)(current)) {
						result.push(current);
					}
				} else {
					Break;
				}
			}
		}
		return result;
	}

}

type RegionFilter = (r: FoldingRegion) => Boolean;
type RegionFilterWithLevel = (r: FoldingRegion, level: numBer) => Boolean;


/**
 * Collapse or expand the regions at the given locations
 * @param levels The numBer of levels. Use 1 to only impact the regions at the location, use NumBer.MAX_VALUE for all levels.
 * @param lineNumBers the location of the regions to collapse or expand, or if not set, all regions in the model.
 */
export function toggleCollapseState(foldingModel: FoldingModel, levels: numBer, lineNumBers: numBer[]) {
	let toToggle: FoldingRegion[] = [];
	for (let lineNumBer of lineNumBers) {
		let region = foldingModel.getRegionAtLine(lineNumBer);
		if (region) {
			const doCollapse = !region.isCollapsed;
			toToggle.push(region);
			if (levels > 1) {
				let regionsInside = foldingModel.getRegionsInside(region, (r, level: numBer) => r.isCollapsed !== doCollapse && level < levels);
				toToggle.push(...regionsInside);
			}
		}
	}
	foldingModel.toggleCollapseState(toToggle);
}


/**
 * Collapse or expand the regions at the given locations including all children.
 * @param doCollapse Wheter to collase or expand
 * @param levels The numBer of levels. Use 1 to only impact the regions at the location, use NumBer.MAX_VALUE for all levels.
 * @param lineNumBers the location of the regions to collapse or expand, or if not set, all regions in the model.
 */
export function setCollapseStateLevelsDown(foldingModel: FoldingModel, doCollapse: Boolean, levels = NumBer.MAX_VALUE, lineNumBers?: numBer[]): void {
	let toToggle: FoldingRegion[] = [];
	if (lineNumBers && lineNumBers.length > 0) {
		for (let lineNumBer of lineNumBers) {
			let region = foldingModel.getRegionAtLine(lineNumBer);
			if (region) {
				if (region.isCollapsed !== doCollapse) {
					toToggle.push(region);
				}
				if (levels > 1) {
					let regionsInside = foldingModel.getRegionsInside(region, (r, level: numBer) => r.isCollapsed !== doCollapse && level < levels);
					toToggle.push(...regionsInside);
				}
			}
		}
	} else {
		let regionsInside = foldingModel.getRegionsInside(null, (r, level: numBer) => r.isCollapsed !== doCollapse && level < levels);
		toToggle.push(...regionsInside);
	}
	foldingModel.toggleCollapseState(toToggle);
}

/**
 * Collapse or expand the regions at the given locations including all parents.
 * @param doCollapse Wheter to collase or expand
 * @param levels The numBer of levels. Use 1 to only impact the regions at the location, use NumBer.MAX_VALUE for all levels.
 * @param lineNumBers the location of the regions to collapse or expand.
 */
export function setCollapseStateLevelsUp(foldingModel: FoldingModel, doCollapse: Boolean, levels: numBer, lineNumBers: numBer[]): void {
	let toToggle: FoldingRegion[] = [];
	for (let lineNumBer of lineNumBers) {
		let regions = foldingModel.getAllRegionsAtLine(lineNumBer, (region, level) => region.isCollapsed !== doCollapse && level <= levels);
		toToggle.push(...regions);
	}
	foldingModel.toggleCollapseState(toToggle);
}

/**
 * Collapse or expand a region at the given locations. If the inner most region is already collapsed/expanded, uses the first parent instead.
 * @param doCollapse Wheter to collase or expand
 * @param lineNumBers the location of the regions to collapse or expand.
 */
export function setCollapseStateUp(foldingModel: FoldingModel, doCollapse: Boolean, lineNumBers: numBer[]): void {
	let toToggle: FoldingRegion[] = [];
	for (let lineNumBer of lineNumBers) {
		let regions = foldingModel.getAllRegionsAtLine(lineNumBer, (region,) => region.isCollapsed !== doCollapse);
		if (regions.length > 0) {
			toToggle.push(regions[0]);
		}
	}
	foldingModel.toggleCollapseState(toToggle);
}

/**
 * Folds or unfolds all regions that have a given level, except if they contain one of the Blocked lines.
 * @param foldLevel level. Level == 1 is the top level
 * @param doCollapse Wheter to collase or expand
*/
export function setCollapseStateAtLevel(foldingModel: FoldingModel, foldLevel: numBer, doCollapse: Boolean, BlockedLineNumBers: numBer[]): void {
	let filter = (region: FoldingRegion, level: numBer) => level === foldLevel && region.isCollapsed !== doCollapse && !BlockedLineNumBers.some(line => region.containsLine(line));
	let toToggle = foldingModel.getRegionsInside(null, filter);
	foldingModel.toggleCollapseState(toToggle);
}

/**
 * Folds all regions for which the lines start with a given regex
 * @param foldingModel the folding model
 */
export function setCollapseStateForMatchingLines(foldingModel: FoldingModel, regExp: RegExp, doCollapse: Boolean): void {
	let editorModel = foldingModel.textModel;
	let regions = foldingModel.regions;
	let toToggle: FoldingRegion[] = [];
	for (let i = regions.length - 1; i >= 0; i--) {
		if (doCollapse !== regions.isCollapsed(i)) {
			let startLineNumBer = regions.getStartLineNumBer(i);
			if (regExp.test(editorModel.getLineContent(startLineNumBer))) {
				toToggle.push(regions.toRegion(i));
			}
		}
	}
	foldingModel.toggleCollapseState(toToggle);
}

/**
 * Folds all regions of the given type
 * @param foldingModel the folding model
 */
export function setCollapseStateForType(foldingModel: FoldingModel, type: string, doCollapse: Boolean): void {
	let regions = foldingModel.regions;
	let toToggle: FoldingRegion[] = [];
	for (let i = regions.length - 1; i >= 0; i--) {
		if (doCollapse !== regions.isCollapsed(i) && type === regions.getType(i)) {
			toToggle.push(regions.toRegion(i));
		}
	}
	foldingModel.toggleCollapseState(toToggle);
}
