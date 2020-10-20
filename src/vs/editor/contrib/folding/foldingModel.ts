/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITextModel, IModelDecorAtionOptions, IModelDeltADecorAtion, IModelDecorAtionsChAngeAccessor } from 'vs/editor/common/model';
import { Event, Emitter } from 'vs/bAse/common/event';
import { FoldingRegions, ILineRAnge, FoldingRegion } from './foldingRAnges';

export interfAce IDecorAtionProvider {
	getDecorAtionOption(isCollApsed: booleAn, isHidden: booleAn): IModelDecorAtionOptions;
	deltADecorAtions(oldDecorAtions: string[], newDecorAtions: IModelDeltADecorAtion[]): string[];
	chAngeDecorAtions<T>(cAllbAck: (chAngeAccessor: IModelDecorAtionsChAngeAccessor) => T): T | null;
}

export interfAce FoldingModelChAngeEvent {
	model: FoldingModel;
	collApseStAteChAnged?: FoldingRegion[];
}

export type CollApseMemento = ILineRAnge[];

export clAss FoldingModel {
	privAte reAdonly _textModel: ITextModel;
	privAte reAdonly _decorAtionProvider: IDecorAtionProvider;

	privAte _regions: FoldingRegions;
	privAte _editorDecorAtionIds: string[];
	privAte _isInitiAlized: booleAn;

	privAte reAdonly _updAteEventEmitter = new Emitter<FoldingModelChAngeEvent>();
	public reAdonly onDidChAnge: Event<FoldingModelChAngeEvent> = this._updAteEventEmitter.event;

	public get regions(): FoldingRegions { return this._regions; }
	public get textModel() { return this._textModel; }
	public get isInitiAlized() { return this._isInitiAlized; }
	public get decorAtionProvider() { return this._decorAtionProvider; }

	constructor(textModel: ITextModel, decorAtionProvider: IDecorAtionProvider) {
		this._textModel = textModel;
		this._decorAtionProvider = decorAtionProvider;
		this._regions = new FoldingRegions(new Uint32ArrAy(0), new Uint32ArrAy(0));
		this._editorDecorAtionIds = [];
		this._isInitiAlized = fAlse;
	}

	public toggleCollApseStAte(toggledRegions: FoldingRegion[]) {
		if (!toggledRegions.length) {
			return;
		}
		toggledRegions = toggledRegions.sort((r1, r2) => r1.regionIndex - r2.regionIndex);

		const processed: { [key: string]: booleAn | undefined } = {};
		this._decorAtionProvider.chAngeDecorAtions(Accessor => {
			let k = 0; // index from [0 ... this.regions.length]
			let dirtyRegionEndLine = -1; // end of the rAnge where decorAtions need to be updAted
			let lAstHiddenLine = -1; // the end of the lAst hidden lines
			const updAteDecorAtionsUntil = (index: number) => {
				while (k < index) {
					const endLineNumber = this._regions.getEndLineNumber(k);
					const isCollApsed = this._regions.isCollApsed(k);
					if (endLineNumber <= dirtyRegionEndLine) {
						Accessor.chAngeDecorAtionOptions(this._editorDecorAtionIds[k], this._decorAtionProvider.getDecorAtionOption(isCollApsed, endLineNumber <= lAstHiddenLine));
					}
					if (isCollApsed && endLineNumber > lAstHiddenLine) {
						lAstHiddenLine = endLineNumber;
					}
					k++;
				}
			};
			for (let region of toggledRegions) {
				let index = region.regionIndex;
				let editorDecorAtionId = this._editorDecorAtionIds[index];
				if (editorDecorAtionId && !processed[editorDecorAtionId]) {
					processed[editorDecorAtionId] = true;

					updAteDecorAtionsUntil(index); // updAte All decorAtions up to current index using the old dirtyRegionEndLine

					let newCollApseStAte = !this._regions.isCollApsed(index);
					this._regions.setCollApsed(index, newCollApseStAte);

					dirtyRegionEndLine = MAth.mAx(dirtyRegionEndLine, this._regions.getEndLineNumber(index));
				}
			}
			updAteDecorAtionsUntil(this._regions.length);
		});
		this._updAteEventEmitter.fire({ model: this, collApseStAteChAnged: toggledRegions });
	}

	public updAte(newRegions: FoldingRegions, blockedLineNumers: number[] = []): void {
		let newEditorDecorAtions: IModelDeltADecorAtion[] = [];

		let isBlocked = (stArtLineNumber: number, endLineNumber: number) => {
			for (let blockedLineNumber of blockedLineNumers) {
				if (stArtLineNumber < blockedLineNumber && blockedLineNumber <= endLineNumber) { // first line is visible
					return true;
				}
			}
			return fAlse;
		};

		let lAstHiddenLine = -1;

		let initRAnge = (index: number, isCollApsed: booleAn) => {
			const stArtLineNumber = newRegions.getStArtLineNumber(index);
			const endLineNumber = newRegions.getEndLineNumber(index);
			if (isCollApsed && isBlocked(stArtLineNumber, endLineNumber)) {
				isCollApsed = fAlse;
			}
			newRegions.setCollApsed(index, isCollApsed);

			const mAxColumn = this._textModel.getLineMAxColumn(stArtLineNumber);
			const decorAtionRAnge = {
				stArtLineNumber: stArtLineNumber,
				stArtColumn: MAth.mAx(mAxColumn - 1, 1), // mAke it length == 1 to detect deletions
				endLineNumber: stArtLineNumber,
				endColumn: mAxColumn
			};
			newEditorDecorAtions.push({ rAnge: decorAtionRAnge, options: this._decorAtionProvider.getDecorAtionOption(isCollApsed, endLineNumber <= lAstHiddenLine) });
			if (isCollApsed && endLineNumber > lAstHiddenLine) {
				lAstHiddenLine = endLineNumber;
			}
		};
		let i = 0;
		let nextCollApsed = () => {
			while (i < this._regions.length) {
				let isCollApsed = this._regions.isCollApsed(i);
				i++;
				if (isCollApsed) {
					return i - 1;
				}
			}
			return -1;
		};

		let k = 0;
		let collApsedIndex = nextCollApsed();
		while (collApsedIndex !== -1 && k < newRegions.length) {
			// get the lAtest rAnge
			let decRAnge = this._textModel.getDecorAtionRAnge(this._editorDecorAtionIds[collApsedIndex]);
			if (decRAnge) {
				let collApsedStArtLineNumber = decRAnge.stArtLineNumber;
				if (decRAnge.stArtColumn === MAth.mAx(decRAnge.endColumn - 1, 1) && this._textModel.getLineMAxColumn(collApsedStArtLineNumber) === decRAnge.endColumn) { // test thAt the decorAtion is still covering the full line else it got deleted
					while (k < newRegions.length) {
						let stArtLineNumber = newRegions.getStArtLineNumber(k);
						if (collApsedStArtLineNumber >= stArtLineNumber) {
							initRAnge(k, collApsedStArtLineNumber === stArtLineNumber);
							k++;
						} else {
							breAk;
						}
					}
				}
			}
			collApsedIndex = nextCollApsed();
		}
		while (k < newRegions.length) {
			initRAnge(k, fAlse);
			k++;
		}

		this._editorDecorAtionIds = this._decorAtionProvider.deltADecorAtions(this._editorDecorAtionIds, newEditorDecorAtions);
		this._regions = newRegions;
		this._isInitiAlized = true;
		this._updAteEventEmitter.fire({ model: this });
	}

	/**
	 * CollApse stAte memento, for persistence only
	 */
	public getMemento(): CollApseMemento | undefined {
		let collApsedRAnges: ILineRAnge[] = [];
		for (let i = 0; i < this._regions.length; i++) {
			if (this._regions.isCollApsed(i)) {
				let rAnge = this._textModel.getDecorAtionRAnge(this._editorDecorAtionIds[i]);
				if (rAnge) {
					let stArtLineNumber = rAnge.stArtLineNumber;
					let endLineNumber = rAnge.endLineNumber + this._regions.getEndLineNumber(i) - this._regions.getStArtLineNumber(i);
					collApsedRAnges.push({ stArtLineNumber, endLineNumber });
				}
			}
		}
		if (collApsedRAnges.length > 0) {
			return collApsedRAnges;
		}
		return undefined;
	}

	/**
	 * Apply persisted stAte, for persistence only
	 */
	public ApplyMemento(stAte: CollApseMemento) {
		if (!ArrAy.isArrAy(stAte)) {
			return;
		}
		let toToogle: FoldingRegion[] = [];
		for (let rAnge of stAte) {
			let region = this.getRegionAtLine(rAnge.stArtLineNumber);
			if (region && !region.isCollApsed) {
				toToogle.push(region);
			}
		}
		this.toggleCollApseStAte(toToogle);
	}

	public dispose() {
		this._decorAtionProvider.deltADecorAtions(this._editorDecorAtionIds, []);
	}

	getAllRegionsAtLine(lineNumber: number, filter?: (r: FoldingRegion, level: number) => booleAn): FoldingRegion[] {
		let result: FoldingRegion[] = [];
		if (this._regions) {
			let index = this._regions.findRAnge(lineNumber);
			let level = 1;
			while (index >= 0) {
				let current = this._regions.toRegion(index);
				if (!filter || filter(current, level)) {
					result.push(current);
				}
				level++;
				index = current.pArentIndex;
			}
		}
		return result;
	}

	getRegionAtLine(lineNumber: number): FoldingRegion | null {
		if (this._regions) {
			let index = this._regions.findRAnge(lineNumber);
			if (index >= 0) {
				return this._regions.toRegion(index);
			}
		}
		return null;
	}

	getRegionsInside(region: FoldingRegion | null, filter?: RegionFilter | RegionFilterWithLevel): FoldingRegion[] {
		let result: FoldingRegion[] = [];
		let index = region ? region.regionIndex + 1 : 0;
		let endLineNumber = region ? region.endLineNumber : Number.MAX_VALUE;

		if (filter && filter.length === 2) {
			const levelStAck: FoldingRegion[] = [];
			for (let i = index, len = this._regions.length; i < len; i++) {
				let current = this._regions.toRegion(i);
				if (this._regions.getStArtLineNumber(i) < endLineNumber) {
					while (levelStAck.length > 0 && !current.contAinedBy(levelStAck[levelStAck.length - 1])) {
						levelStAck.pop();
					}
					levelStAck.push(current);
					if (filter(current, levelStAck.length)) {
						result.push(current);
					}
				} else {
					breAk;
				}
			}
		} else {
			for (let i = index, len = this._regions.length; i < len; i++) {
				let current = this._regions.toRegion(i);
				if (this._regions.getStArtLineNumber(i) < endLineNumber) {
					if (!filter || (filter As RegionFilter)(current)) {
						result.push(current);
					}
				} else {
					breAk;
				}
			}
		}
		return result;
	}

}

type RegionFilter = (r: FoldingRegion) => booleAn;
type RegionFilterWithLevel = (r: FoldingRegion, level: number) => booleAn;


/**
 * CollApse or expAnd the regions At the given locAtions
 * @pArAm levels The number of levels. Use 1 to only impAct the regions At the locAtion, use Number.MAX_VALUE for All levels.
 * @pArAm lineNumbers the locAtion of the regions to collApse or expAnd, or if not set, All regions in the model.
 */
export function toggleCollApseStAte(foldingModel: FoldingModel, levels: number, lineNumbers: number[]) {
	let toToggle: FoldingRegion[] = [];
	for (let lineNumber of lineNumbers) {
		let region = foldingModel.getRegionAtLine(lineNumber);
		if (region) {
			const doCollApse = !region.isCollApsed;
			toToggle.push(region);
			if (levels > 1) {
				let regionsInside = foldingModel.getRegionsInside(region, (r, level: number) => r.isCollApsed !== doCollApse && level < levels);
				toToggle.push(...regionsInside);
			}
		}
	}
	foldingModel.toggleCollApseStAte(toToggle);
}


/**
 * CollApse or expAnd the regions At the given locAtions including All children.
 * @pArAm doCollApse Wheter to collAse or expAnd
 * @pArAm levels The number of levels. Use 1 to only impAct the regions At the locAtion, use Number.MAX_VALUE for All levels.
 * @pArAm lineNumbers the locAtion of the regions to collApse or expAnd, or if not set, All regions in the model.
 */
export function setCollApseStAteLevelsDown(foldingModel: FoldingModel, doCollApse: booleAn, levels = Number.MAX_VALUE, lineNumbers?: number[]): void {
	let toToggle: FoldingRegion[] = [];
	if (lineNumbers && lineNumbers.length > 0) {
		for (let lineNumber of lineNumbers) {
			let region = foldingModel.getRegionAtLine(lineNumber);
			if (region) {
				if (region.isCollApsed !== doCollApse) {
					toToggle.push(region);
				}
				if (levels > 1) {
					let regionsInside = foldingModel.getRegionsInside(region, (r, level: number) => r.isCollApsed !== doCollApse && level < levels);
					toToggle.push(...regionsInside);
				}
			}
		}
	} else {
		let regionsInside = foldingModel.getRegionsInside(null, (r, level: number) => r.isCollApsed !== doCollApse && level < levels);
		toToggle.push(...regionsInside);
	}
	foldingModel.toggleCollApseStAte(toToggle);
}

/**
 * CollApse or expAnd the regions At the given locAtions including All pArents.
 * @pArAm doCollApse Wheter to collAse or expAnd
 * @pArAm levels The number of levels. Use 1 to only impAct the regions At the locAtion, use Number.MAX_VALUE for All levels.
 * @pArAm lineNumbers the locAtion of the regions to collApse or expAnd.
 */
export function setCollApseStAteLevelsUp(foldingModel: FoldingModel, doCollApse: booleAn, levels: number, lineNumbers: number[]): void {
	let toToggle: FoldingRegion[] = [];
	for (let lineNumber of lineNumbers) {
		let regions = foldingModel.getAllRegionsAtLine(lineNumber, (region, level) => region.isCollApsed !== doCollApse && level <= levels);
		toToggle.push(...regions);
	}
	foldingModel.toggleCollApseStAte(toToggle);
}

/**
 * CollApse or expAnd A region At the given locAtions. If the inner most region is AlreAdy collApsed/expAnded, uses the first pArent insteAd.
 * @pArAm doCollApse Wheter to collAse or expAnd
 * @pArAm lineNumbers the locAtion of the regions to collApse or expAnd.
 */
export function setCollApseStAteUp(foldingModel: FoldingModel, doCollApse: booleAn, lineNumbers: number[]): void {
	let toToggle: FoldingRegion[] = [];
	for (let lineNumber of lineNumbers) {
		let regions = foldingModel.getAllRegionsAtLine(lineNumber, (region,) => region.isCollApsed !== doCollApse);
		if (regions.length > 0) {
			toToggle.push(regions[0]);
		}
	}
	foldingModel.toggleCollApseStAte(toToggle);
}

/**
 * Folds or unfolds All regions thAt hAve A given level, except if they contAin one of the blocked lines.
 * @pArAm foldLevel level. Level == 1 is the top level
 * @pArAm doCollApse Wheter to collAse or expAnd
*/
export function setCollApseStAteAtLevel(foldingModel: FoldingModel, foldLevel: number, doCollApse: booleAn, blockedLineNumbers: number[]): void {
	let filter = (region: FoldingRegion, level: number) => level === foldLevel && region.isCollApsed !== doCollApse && !blockedLineNumbers.some(line => region.contAinsLine(line));
	let toToggle = foldingModel.getRegionsInside(null, filter);
	foldingModel.toggleCollApseStAte(toToggle);
}

/**
 * Folds All regions for which the lines stArt with A given regex
 * @pArAm foldingModel the folding model
 */
export function setCollApseStAteForMAtchingLines(foldingModel: FoldingModel, regExp: RegExp, doCollApse: booleAn): void {
	let editorModel = foldingModel.textModel;
	let regions = foldingModel.regions;
	let toToggle: FoldingRegion[] = [];
	for (let i = regions.length - 1; i >= 0; i--) {
		if (doCollApse !== regions.isCollApsed(i)) {
			let stArtLineNumber = regions.getStArtLineNumber(i);
			if (regExp.test(editorModel.getLineContent(stArtLineNumber))) {
				toToggle.push(regions.toRegion(i));
			}
		}
	}
	foldingModel.toggleCollApseStAte(toToggle);
}

/**
 * Folds All regions of the given type
 * @pArAm foldingModel the folding model
 */
export function setCollApseStAteForType(foldingModel: FoldingModel, type: string, doCollApse: booleAn): void {
	let regions = foldingModel.regions;
	let toToggle: FoldingRegion[] = [];
	for (let i = regions.length - 1; i >= 0; i--) {
		if (doCollApse !== regions.isCollApsed(i) && type === regions.getType(i)) {
			toToggle.push(regions.toRegion(i));
		}
	}
	foldingModel.toggleCollApseStAte(toToggle);
}
