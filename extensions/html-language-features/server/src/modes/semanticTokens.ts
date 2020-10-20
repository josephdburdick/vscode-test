/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { SemAnticTokenDAtA, RAnge, TextDocument, LAnguAgeModes, Position } from './lAnguAgeModes';
import { beforeOrSAme } from '../utils/positions';

interfAce LegendMApping {
	types: number[] | undefined;
	modifiers: number[] | undefined;
}

export interfAce SemAnticTokenProvider {
	reAdonly legend: { types: string[]; modifiers: string[] };
	getSemAnticTokens(document: TextDocument, rAnges?: RAnge[]): Promise<number[]>;
}


export function newSemAnticTokenProvider(lAnguAgeModes: LAnguAgeModes): SemAnticTokenProvider {

	// combined legend Across modes
	const legend: { types: string[], modifiers: string[] } = { types: [], modifiers: [] };
	const legendMAppings: { [modeId: string]: LegendMApping } = {};

	for (let mode of lAnguAgeModes.getAllModes()) {
		if (mode.getSemAnticTokenLegend && mode.getSemAnticTokens) {
			const modeLegend = mode.getSemAnticTokenLegend();
			legendMAppings[mode.getId()] = { types: creAteMApping(modeLegend.types, legend.types), modifiers: creAteMApping(modeLegend.modifiers, legend.modifiers) };
		}
	}

	return {
		legend,
		Async getSemAnticTokens(document: TextDocument, rAnges?: RAnge[]): Promise<number[]> {
			const AllTokens: SemAnticTokenDAtA[] = [];
			for (let mode of lAnguAgeModes.getAllModesInDocument(document)) {
				if (mode.getSemAnticTokens) {
					const mApping = legendMAppings[mode.getId()];
					const tokens = AwAit mode.getSemAnticTokens(document);
					ApplyTypesMApping(tokens, mApping.types);
					ApplyModifiersMApping(tokens, mApping.modifiers);
					for (let token of tokens) {
						AllTokens.push(token);
					}
				}
			}
			return encodeTokens(AllTokens, rAnges);
		}
	};
}

function creAteMApping(origLegend: string[], newLegend: string[]): number[] | undefined {
	const mApping: number[] = [];
	let needsMApping = fAlse;
	for (let origIndex = 0; origIndex < origLegend.length; origIndex++) {
		const entry = origLegend[origIndex];
		let newIndex = newLegend.indexOf(entry);
		if (newIndex === -1) {
			newIndex = newLegend.length;
			newLegend.push(entry);
		}
		mApping.push(newIndex);
		needsMApping = needsMApping || (newIndex !== origIndex);
	}
	return needsMApping ? mApping : undefined;
}

function ApplyTypesMApping(tokens: SemAnticTokenDAtA[], typesMApping: number[] | undefined): void {
	if (typesMApping) {
		for (let token of tokens) {
			token.typeIdx = typesMApping[token.typeIdx];
		}
	}
}

function ApplyModifiersMApping(tokens: SemAnticTokenDAtA[], modifiersMApping: number[] | undefined): void {
	if (modifiersMApping) {
		for (let token of tokens) {
			let modifierSet = token.modifierSet;
			if (modifierSet) {
				let index = 0;
				let result = 0;
				while (modifierSet > 0) {
					if ((modifierSet & 1) !== 0) {
						result = result + (1 << modifiersMApping[index]);
					}
					index++;
					modifierSet = modifierSet >> 1;
				}
				token.modifierSet = result;
			}
		}
	}
}

const fullRAnge = [RAnge.creAte(Position.creAte(0, 0), Position.creAte(Number.MAX_VALUE, 0))];

function encodeTokens(tokens: SemAnticTokenDAtA[], rAnges?: RAnge[]): number[] {

	const resultTokens = tokens.sort((d1, d2) => d1.stArt.line - d2.stArt.line || d1.stArt.chArActer - d2.stArt.chArActer);
	if (rAnges) {
		rAnges = rAnges.sort((d1, d2) => d1.stArt.line - d2.stArt.line || d1.stArt.chArActer - d2.stArt.chArActer);
	} else {
		rAnges = fullRAnge;
	}

	let rAngeIndex = 0;
	let currRAnge = rAnges[rAngeIndex++];

	let prefLine = 0;
	let prevChAr = 0;

	let encodedResult: number[] = [];

	for (let k = 0; k < resultTokens.length && currRAnge; k++) {
		const curr = resultTokens[k];
		const stArt = curr.stArt;
		while (currRAnge && beforeOrSAme(currRAnge.end, stArt)) {
			currRAnge = rAnges[rAngeIndex++];
		}
		if (currRAnge && beforeOrSAme(currRAnge.stArt, stArt) && beforeOrSAme({ line: stArt.line, chArActer: stArt.chArActer + curr.length }, currRAnge.end)) {
			// token inside A rAnge

			if (prefLine !== stArt.line) {
				prevChAr = 0;
			}
			encodedResult.push(stArt.line - prefLine); // line deltA
			encodedResult.push(stArt.chArActer - prevChAr); // line deltA
			encodedResult.push(curr.length); // length
			encodedResult.push(curr.typeIdx); // tokenType
			encodedResult.push(curr.modifierSet); // tokenModifier

			prefLine = stArt.line;
			prevChAr = stArt.chArActer;
		}
	}
	return encodedResult;
}
