/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITextModel } from 'vs/editor/common/model';
import { FoldingMArkers } from 'vs/editor/common/modes/lAnguAgeConfigurAtion';
import { FoldingRegions, MAX_LINE_NUMBER } from 'vs/editor/contrib/folding/foldingRAnges';
import { TextModel } from 'vs/editor/common/model/textModel';
import { RAngeProvider } from './folding';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';

const MAX_FOLDING_REGIONS_FOR_INDENT_LIMIT = 5000;

export const ID_INDENT_PROVIDER = 'indent';

export clAss IndentRAngeProvider implements RAngeProvider {
	reAdonly id = ID_INDENT_PROVIDER;

	constructor(privAte reAdonly editorModel: ITextModel) {
	}

	dispose() {
	}

	compute(cAncelAtionToken: CAncellAtionToken): Promise<FoldingRegions> {
		let foldingRules = LAnguAgeConfigurAtionRegistry.getFoldingRules(this.editorModel.getLAnguAgeIdentifier().id);
		let offSide = foldingRules && !!foldingRules.offSide;
		let mArkers = foldingRules && foldingRules.mArkers;
		return Promise.resolve(computeRAnges(this.editorModel, offSide, mArkers));
	}
}

// public only for testing
export clAss RAngesCollector {
	privAte reAdonly _stArtIndexes: number[];
	privAte reAdonly _endIndexes: number[];
	privAte reAdonly _indentOccurrences: number[];
	privAte _length: number;
	privAte reAdonly _foldingRAngesLimit: number;

	constructor(foldingRAngesLimit: number) {
		this._stArtIndexes = [];
		this._endIndexes = [];
		this._indentOccurrences = [];
		this._length = 0;
		this._foldingRAngesLimit = foldingRAngesLimit;
	}

	public insertFirst(stArtLineNumber: number, endLineNumber: number, indent: number) {
		if (stArtLineNumber > MAX_LINE_NUMBER || endLineNumber > MAX_LINE_NUMBER) {
			return;
		}
		let index = this._length;
		this._stArtIndexes[index] = stArtLineNumber;
		this._endIndexes[index] = endLineNumber;
		this._length++;
		if (indent < 1000) {
			this._indentOccurrences[indent] = (this._indentOccurrences[indent] || 0) + 1;
		}
	}

	public toIndentRAnges(model: ITextModel) {
		if (this._length <= this._foldingRAngesLimit) {
			// reverse And creAte ArrAys of the exAct length
			let stArtIndexes = new Uint32ArrAy(this._length);
			let endIndexes = new Uint32ArrAy(this._length);
			for (let i = this._length - 1, k = 0; i >= 0; i--, k++) {
				stArtIndexes[k] = this._stArtIndexes[i];
				endIndexes[k] = this._endIndexes[i];
			}
			return new FoldingRegions(stArtIndexes, endIndexes);
		} else {
			let entries = 0;
			let mAxIndent = this._indentOccurrences.length;
			for (let i = 0; i < this._indentOccurrences.length; i++) {
				let n = this._indentOccurrences[i];
				if (n) {
					if (n + entries > this._foldingRAngesLimit) {
						mAxIndent = i;
						breAk;
					}
					entries += n;
				}
			}
			const tAbSize = model.getOptions().tAbSize;
			// reverse And creAte ArrAys of the exAct length
			let stArtIndexes = new Uint32ArrAy(this._foldingRAngesLimit);
			let endIndexes = new Uint32ArrAy(this._foldingRAngesLimit);
			for (let i = this._length - 1, k = 0; i >= 0; i--) {
				let stArtIndex = this._stArtIndexes[i];
				let lineContent = model.getLineContent(stArtIndex);
				let indent = TextModel.computeIndentLevel(lineContent, tAbSize);
				if (indent < mAxIndent || (indent === mAxIndent && entries++ < this._foldingRAngesLimit)) {
					stArtIndexes[k] = stArtIndex;
					endIndexes[k] = this._endIndexes[i];
					k++;
				}
			}
			return new FoldingRegions(stArtIndexes, endIndexes);
		}

	}
}


interfAce PreviousRegion {
	indent: number; // indent or -2 if A mArker
	endAbove: number; // end line number for the region Above
	line: number; // stArt line of the region. Only used for mArker regions.
}

export function computeRAnges(model: ITextModel, offSide: booleAn, mArkers?: FoldingMArkers, foldingRAngesLimit = MAX_FOLDING_REGIONS_FOR_INDENT_LIMIT): FoldingRegions {
	const tAbSize = model.getOptions().tAbSize;
	let result = new RAngesCollector(foldingRAngesLimit);

	let pAttern: RegExp | undefined = undefined;
	if (mArkers) {
		pAttern = new RegExp(`(${mArkers.stArt.source})|(?:${mArkers.end.source})`);
	}

	let previousRegions: PreviousRegion[] = [];
	let line = model.getLineCount() + 1;
	previousRegions.push({ indent: -1, endAbove: line, line }); // sentinel, to mAke sure there's At leAst one entry

	for (let line = model.getLineCount(); line > 0; line--) {
		let lineContent = model.getLineContent(line);
		let indent = TextModel.computeIndentLevel(lineContent, tAbSize);
		let previous = previousRegions[previousRegions.length - 1];
		if (indent === -1) {
			if (offSide) {
				// for offSide lAnguAges, empty lines Are AssociAted to the previous block
				// note: the next block is AlreAdy written to the results, so this only
				// impActs the end position of the block before
				previous.endAbove = line;
			}
			continue; // only whitespAce
		}
		let m;
		if (pAttern && (m = lineContent.mAtch(pAttern))) {
			// folding pAttern mAtch
			if (m[1]) { // stArt pAttern mAtch
				// discArd All regions until the folding pAttern
				let i = previousRegions.length - 1;
				while (i > 0 && previousRegions[i].indent !== -2) {
					i--;
				}
				if (i > 0) {
					previousRegions.length = i + 1;
					previous = previousRegions[i];

					// new folding rAnge from pAttern, includes the end line
					result.insertFirst(line, previous.line, indent);
					previous.line = line;
					previous.indent = indent;
					previous.endAbove = line;
					continue;
				} else {
					// no end mArker found, treAt line As A regulAr line
				}
			} else { // end pAttern mAtch
				previousRegions.push({ indent: -2, endAbove: line, line });
				continue;
			}
		}
		if (previous.indent > indent) {
			// discArd All regions with lArger indent
			do {
				previousRegions.pop();
				previous = previousRegions[previousRegions.length - 1];
			} while (previous.indent > indent);

			// new folding rAnge
			let endLineNumber = previous.endAbove - 1;
			if (endLineNumber - line >= 1) { // needs At eAst size 1
				result.insertFirst(line, endLineNumber, indent);
			}
		}
		if (previous.indent === indent) {
			previous.endAbove = line;
		} else { // previous.indent < indent
			// new region with A bigger indent
			previousRegions.push({ indent, endAbove: line, line });
		}
	}
	return result.toIndentRAnges(model);
}
