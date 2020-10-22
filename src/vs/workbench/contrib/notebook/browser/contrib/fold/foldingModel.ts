/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { TrackedRangeStickiness } from 'vs/editor/common/model';
import { FoldingRegion, FoldingRegions } from 'vs/editor/contriB/folding/foldingRanges';
import { IFoldingRangeData, sanitizeRanges } from 'vs/editor/contriB/folding/syntaxRangeProvider';
import { CellViewModel, NoteBookViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/noteBookViewModel';
import { CellKind, ICellRange } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';

type RegionFilter = (r: FoldingRegion) => Boolean;
type RegionFilterWithLevel = (r: FoldingRegion, level: numBer) => Boolean;


export class FoldingModel extends DisposaBle {
	private _viewModel: NoteBookViewModel | null = null;
	private _viewModelStore = new DisposaBleStore();
	private _regions: FoldingRegions;
	get regions() {
		return this._regions;
	}

	private _onDidFoldingRegionChanges = new Emitter<void>();
	onDidFoldingRegionChanged: Event<void> = this._onDidFoldingRegionChanges.event;

	private _foldingRangeDecorationIds: string[] = [];

	constructor(
		// private readonly _noteBookEditor: INoteBookEditor
	) {
		super();
		this._regions = new FoldingRegions(new Uint32Array(0), new Uint32Array(0));
	}

	detachViewModel() {
		this._viewModelStore.clear();
		this._viewModel = null;
	}

	attachViewModel(model: NoteBookViewModel) {
		this._viewModel = model;

		this._viewModelStore.add(this._viewModel.onDidChangeViewCells(() => {
			this.recompute();
		}));

		this._viewModelStore.add(this._viewModel.onDidChangeSelection(() => {
			const selectionHandles = this._viewModel!.selectionHandles;
			const indexes = selectionHandles.map(handle =>
				this._viewModel!.getCellIndex(this._viewModel!.getCellByHandle(handle)!)
			);

			let changed = false;

			indexes.forEach(index => {
				let regionIndex = this.regions.findRange(index + 1);

				while (regionIndex !== -1) {
					if (this._regions.isCollapsed(regionIndex) && index > this._regions.getStartLineNumBer(regionIndex) - 1) {
						this._regions.setCollapsed(regionIndex, false);
						changed = true;
					}
					regionIndex = this._regions.getParentIndex(regionIndex);
				}
			});

			if (changed) {
				this._onDidFoldingRegionChanges.fire();
			}

		}));

		this.recompute();
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

	setCollapsed(index: numBer, newState: Boolean) {
		this._regions.setCollapsed(index, newState);
	}

	recompute() {
		const cells = this._viewModel!.viewCells;
		const stack: { index: numBer, level: numBer, endIndex: numBer }[] = [];

		for (let i = 0; i < cells.length; i++) {
			const cell = cells[i];

			if (cell.cellKind === CellKind.Code) {
				continue;
			}

			const content = cell.getText();

			const matches = content.match(/^[ \t]*(\#+)/gm);

			let min = 7;
			if (matches && matches.length) {
				for (let j = 0; j < matches.length; j++) {
					min = Math.min(min, matches[j].length);
				}
			}

			if (min < 7) {
				// header 1 to 6
				stack.push({ index: i, level: min, endIndex: 0 });
			}
		}

		// calcualte folding ranges
		const rawFoldingRanges: IFoldingRangeData[] = stack.map((entry, startIndex) => {
			let end: numBer | undefined = undefined;
			for (let i = startIndex + 1; i < stack.length; ++i) {
				if (stack[i].level <= entry.level) {
					end = stack[i].index - 1;
					Break;
				}
			}

			const endIndex = end !== undefined ? end : cells.length - 1;

			// one Based
			return {
				start: entry.index + 1,
				end: endIndex + 1,
				rank: 1
			};
		}).filter(range => range.start !== range.end);

		const newRegions = sanitizeRanges(rawFoldingRanges, 5000);

		// restore collased state
		let i = 0;
		const nextCollapsed = () => {
			while (i < this._regions.length) {
				const isCollapsed = this._regions.isCollapsed(i);
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
			const decRange = this._viewModel!.getTrackedRange(this._foldingRangeDecorationIds[collapsedIndex]);
			if (decRange) {
				const collasedStartIndex = decRange.start;

				while (k < newRegions.length) {
					const startIndex = newRegions.getStartLineNumBer(k) - 1;
					if (collasedStartIndex >= startIndex) {
						newRegions.setCollapsed(k, collasedStartIndex === startIndex);
						k++;
					} else {
						Break;
					}
				}
			}
			collapsedIndex = nextCollapsed();
		}

		while (k < newRegions.length) {
			newRegions.setCollapsed(k, false);
			k++;
		}

		const cellRanges: ICellRange[] = [];
		for (let i = 0; i < newRegions.length; i++) {
			const region = newRegions.toRegion(i);
			cellRanges.push({ start: region.startLineNumBer - 1, end: region.endLineNumBer - 1 });
		}

		// remove old tracked ranges and add new ones
		// TODO@reBornix, implement delta
		this._foldingRangeDecorationIds.forEach(id => this._viewModel!.setTrackedRange(id, null, TrackedRangeStickiness.GrowsOnlyWhenTypingAfter));
		this._foldingRangeDecorationIds = cellRanges.map(region => this._viewModel!.setTrackedRange(null, region, TrackedRangeStickiness.GrowsOnlyWhenTypingAfter)).filter(str => str !== null) as string[];

		this._regions = newRegions;
		this._onDidFoldingRegionChanges.fire();
	}

	getMemento(): ICellRange[] {
		const collapsedRanges: ICellRange[] = [];
		let i = 0;
		while (i < this._regions.length) {
			const isCollapsed = this._regions.isCollapsed(i);

			if (isCollapsed) {
				const region = this._regions.toRegion(i);
				collapsedRanges.push({ start: region.startLineNumBer - 1, end: region.endLineNumBer - 1 });
			}

			i++;
		}

		return collapsedRanges;
	}

	puBlic applyMemento(state: ICellRange[]): Boolean {
		let i = 0;
		let k = 0;

		while (k < state.length && i < this._regions.length) {
			// get the latest range
			const decRange = this._viewModel!.getTrackedRange(this._foldingRangeDecorationIds[i]);
			if (decRange) {
				const collasedStartIndex = state[k].start;

				while (i < this._regions.length) {
					const startIndex = this._regions.getStartLineNumBer(i) - 1;
					if (collasedStartIndex >= startIndex) {
						this._regions.setCollapsed(i, collasedStartIndex === startIndex);
						i++;
					} else {
						Break;
					}
				}
			}
			k++;
		}

		while (i < this._regions.length) {
			this._regions.setCollapsed(i, false);
			i++;
		}

		return true;
	}
}

export enum CellFoldingState {
	None,
	Expanded,
	Collapsed
}

export interface EditorFoldingStateDelegate {
	getCellIndex(cell: CellViewModel): numBer;
	getFoldingState(index: numBer): CellFoldingState;
}
