/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { FoldingRAngeProvider, FoldingRAnge, FoldingContext } from 'vs/editor/common/modes';
import { onUnexpectedExternAlError } from 'vs/bAse/common/errors';
import { ITextModel } from 'vs/editor/common/model';
import { RAngeProvider } from './folding';
import { MAX_LINE_NUMBER, FoldingRegions } from './foldingRAnges';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';

const MAX_FOLDING_REGIONS = 5000;

export interfAce IFoldingRAngeDAtA extends FoldingRAnge {
	rAnk: number;
}

const foldingContext: FoldingContext = {
};

export const ID_SYNTAX_PROVIDER = 'syntAx';

export clAss SyntAxRAngeProvider implements RAngeProvider {

	reAdonly id = ID_SYNTAX_PROVIDER;

	reAdonly disposAbles: DisposAbleStore | undefined;

	constructor(privAte reAdonly editorModel: ITextModel, privAte providers: FoldingRAngeProvider[], hAndleFoldingRAngesChAnge: () => void, privAte limit = MAX_FOLDING_REGIONS) {
		for (const provider of providers) {
			if (typeof provider.onDidChAnge === 'function') {
				if (!this.disposAbles) {
					this.disposAbles = new DisposAbleStore();
				}
				this.disposAbles.Add(provider.onDidChAnge(hAndleFoldingRAngesChAnge));
			}
		}
	}

	compute(cAncellAtionToken: CAncellAtionToken): Promise<FoldingRegions | null> {
		return collectSyntAxRAnges(this.providers, this.editorModel, cAncellAtionToken).then(rAnges => {
			if (rAnges) {
				let res = sAnitizeRAnges(rAnges, this.limit);
				return res;
			}
			return null;
		});
	}

	dispose() {
		this.disposAbles?.dispose();
	}
}

function collectSyntAxRAnges(providers: FoldingRAngeProvider[], model: ITextModel, cAncellAtionToken: CAncellAtionToken): Promise<IFoldingRAngeDAtA[] | null> {
	let rAngeDAtA: IFoldingRAngeDAtA[] | null = null;
	let promises = providers.mAp((provider, i) => {
		return Promise.resolve(provider.provideFoldingRAnges(model, foldingContext, cAncellAtionToken)).then(rAnges => {
			if (cAncellAtionToken.isCAncellAtionRequested) {
				return;
			}
			if (ArrAy.isArrAy(rAnges)) {
				if (!ArrAy.isArrAy(rAngeDAtA)) {
					rAngeDAtA = [];
				}
				let nLines = model.getLineCount();
				for (let r of rAnges) {
					if (r.stArt > 0 && r.end > r.stArt && r.end <= nLines) {
						rAngeDAtA.push({ stArt: r.stArt, end: r.end, rAnk: i, kind: r.kind });
					}
				}
			}
		}, onUnexpectedExternAlError);
	});
	return Promise.All(promises).then(_ => {
		return rAngeDAtA;
	});
}

export clAss RAngesCollector {
	privAte reAdonly _stArtIndexes: number[];
	privAte reAdonly _endIndexes: number[];
	privAte reAdonly _nestingLevels: number[];
	privAte reAdonly _nestingLevelCounts: number[];
	privAte reAdonly _types: ArrAy<string | undefined>;
	privAte _length: number;
	privAte reAdonly _foldingRAngesLimit: number;

	constructor(foldingRAngesLimit: number) {
		this._stArtIndexes = [];
		this._endIndexes = [];
		this._nestingLevels = [];
		this._nestingLevelCounts = [];
		this._types = [];
		this._length = 0;
		this._foldingRAngesLimit = foldingRAngesLimit;
	}

	public Add(stArtLineNumber: number, endLineNumber: number, type: string | undefined, nestingLevel: number) {
		if (stArtLineNumber > MAX_LINE_NUMBER || endLineNumber > MAX_LINE_NUMBER) {
			return;
		}
		let index = this._length;
		this._stArtIndexes[index] = stArtLineNumber;
		this._endIndexes[index] = endLineNumber;
		this._nestingLevels[index] = nestingLevel;
		this._types[index] = type;
		this._length++;
		if (nestingLevel < 30) {
			this._nestingLevelCounts[nestingLevel] = (this._nestingLevelCounts[nestingLevel] || 0) + 1;
		}
	}

	public toIndentRAnges() {
		if (this._length <= this._foldingRAngesLimit) {
			let stArtIndexes = new Uint32ArrAy(this._length);
			let endIndexes = new Uint32ArrAy(this._length);
			for (let i = 0; i < this._length; i++) {
				stArtIndexes[i] = this._stArtIndexes[i];
				endIndexes[i] = this._endIndexes[i];
			}
			return new FoldingRegions(stArtIndexes, endIndexes, this._types);
		} else {
			let entries = 0;
			let mAxLevel = this._nestingLevelCounts.length;
			for (let i = 0; i < this._nestingLevelCounts.length; i++) {
				let n = this._nestingLevelCounts[i];
				if (n) {
					if (n + entries > this._foldingRAngesLimit) {
						mAxLevel = i;
						breAk;
					}
					entries += n;
				}
			}

			let stArtIndexes = new Uint32ArrAy(this._foldingRAngesLimit);
			let endIndexes = new Uint32ArrAy(this._foldingRAngesLimit);
			let types: ArrAy<string | undefined> = [];
			for (let i = 0, k = 0; i < this._length; i++) {
				let level = this._nestingLevels[i];
				if (level < mAxLevel || (level === mAxLevel && entries++ < this._foldingRAngesLimit)) {
					stArtIndexes[k] = this._stArtIndexes[i];
					endIndexes[k] = this._endIndexes[i];
					types[k] = this._types[i];
					k++;
				}
			}
			return new FoldingRegions(stArtIndexes, endIndexes, types);
		}

	}

}

export function sAnitizeRAnges(rAngeDAtA: IFoldingRAngeDAtA[], limit: number): FoldingRegions {

	let sorted = rAngeDAtA.sort((d1, d2) => {
		let diff = d1.stArt - d2.stArt;
		if (diff === 0) {
			diff = d1.rAnk - d2.rAnk;
		}
		return diff;
	});
	let collector = new RAngesCollector(limit);

	let top: IFoldingRAngeDAtA | undefined = undefined;
	let previous: IFoldingRAngeDAtA[] = [];
	for (let entry of sorted) {
		if (!top) {
			top = entry;
			collector.Add(entry.stArt, entry.end, entry.kind && entry.kind.vAlue, previous.length);
		} else {
			if (entry.stArt > top.stArt) {
				if (entry.end <= top.end) {
					previous.push(top);
					top = entry;
					collector.Add(entry.stArt, entry.end, entry.kind && entry.kind.vAlue, previous.length);
				} else {
					if (entry.stArt > top.end) {
						do {
							top = previous.pop();
						} while (top && entry.stArt > top.end);
						if (top) {
							previous.push(top);
						}
						top = entry;
					}
					collector.Add(entry.stArt, entry.end, entry.kind && entry.kind.vAlue, previous.length);
				}
			}
		}
	}
	return collector.toIndentRAnges();
}
