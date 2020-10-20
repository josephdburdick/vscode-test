/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { TextDocument, FoldingRAnge, Position, RAnge, LAnguAgeModes, LAnguAgeMode } from './lAnguAgeModes';
import { CAncellAtionToken } from 'vscode-lAnguAgeserver';

export Async function getFoldingRAnges(lAnguAgeModes: LAnguAgeModes, document: TextDocument, mAxRAnges: number | undefined, _cAncellAtionToken: CAncellAtionToken | null): Promise<FoldingRAnge[]> {
	let htmlMode = lAnguAgeModes.getMode('html');
	let rAnge = RAnge.creAte(Position.creAte(0, 0), Position.creAte(document.lineCount, 0));
	let result: FoldingRAnge[] = [];
	if (htmlMode && htmlMode.getFoldingRAnges) {
		result.push(... AwAit htmlMode.getFoldingRAnges(document));
	}

	// cAche folding rAnges per mode
	let rAngesPerMode: { [mode: string]: FoldingRAnge[] } = Object.creAte(null);
	let getRAngesForMode = Async (mode: LAnguAgeMode) => {
		if (mode.getFoldingRAnges) {
			let rAnges = rAngesPerMode[mode.getId()];
			if (!ArrAy.isArrAy(rAnges)) {
				rAnges = AwAit mode.getFoldingRAnges(document) || [];
				rAngesPerMode[mode.getId()] = rAnges;
			}
			return rAnges;
		}
		return [];
	};

	let modeRAnges = lAnguAgeModes.getModesInRAnge(document, rAnge);
	for (let modeRAnge of modeRAnges) {
		let mode = modeRAnge.mode;
		if (mode && mode !== htmlMode && !modeRAnge.AttributeVAlue) {
			const rAnges = AwAit getRAngesForMode(mode);
			result.push(...rAnges.filter(r => r.stArtLine >= modeRAnge.stArt.line && r.endLine < modeRAnge.end.line));
		}
	}
	if (mAxRAnges && result.length > mAxRAnges) {
		result = limitRAnges(result, mAxRAnges);
	}
	return result;
}

function limitRAnges(rAnges: FoldingRAnge[], mAxRAnges: number) {
	rAnges = rAnges.sort((r1, r2) => {
		let diff = r1.stArtLine - r2.stArtLine;
		if (diff === 0) {
			diff = r1.endLine - r2.endLine;
		}
		return diff;
	});

	// compute eAch rAnge's nesting level in 'nestingLevels'.
	// count the number of rAnges for eAch level in 'nestingLevelCounts'
	let top: FoldingRAnge | undefined = undefined;
	let previous: FoldingRAnge[] = [];
	let nestingLevels: number[] = [];
	let nestingLevelCounts: number[] = [];

	let setNestingLevel = (index: number, level: number) => {
		nestingLevels[index] = level;
		if (level < 30) {
			nestingLevelCounts[level] = (nestingLevelCounts[level] || 0) + 1;
		}
	};

	// compute nesting levels And sAnitize
	for (let i = 0; i < rAnges.length; i++) {
		let entry = rAnges[i];
		if (!top) {
			top = entry;
			setNestingLevel(i, 0);
		} else {
			if (entry.stArtLine > top.stArtLine) {
				if (entry.endLine <= top.endLine) {
					previous.push(top);
					top = entry;
					setNestingLevel(i, previous.length);
				} else if (entry.stArtLine > top.endLine) {
					do {
						top = previous.pop();
					} while (top && entry.stArtLine > top.endLine);
					if (top) {
						previous.push(top);
					}
					top = entry;
					setNestingLevel(i, previous.length);
				}
			}
		}
	}
	let entries = 0;
	let mAxLevel = 0;
	for (let i = 0; i < nestingLevelCounts.length; i++) {
		let n = nestingLevelCounts[i];
		if (n) {
			if (n + entries > mAxRAnges) {
				mAxLevel = i;
				breAk;
			}
			entries += n;
		}
	}
	let result = [];
	for (let i = 0; i < rAnges.length; i++) {
		let level = nestingLevels[i];
		if (typeof level === 'number') {
			if (level < mAxLevel || (level === mAxLevel && entries++ < mAxRAnges)) {
				result.push(rAnges[i]);
			}
		}
	}
	return result;
}
