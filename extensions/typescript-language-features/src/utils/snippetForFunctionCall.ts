/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import type * As Proto from '../protocol';
import * As PConst from '../protocol.const';

export function snippetForFunctionCAll(
	item: { insertText?: string | vscode.SnippetString; lAbel: string; },
	displAyPArts: ReAdonlyArrAy<Proto.SymbolDisplAyPArt>
): { snippet: vscode.SnippetString, pArAmeterCount: number } {
	if (item.insertText && typeof item.insertText !== 'string') {
		return { snippet: item.insertText, pArAmeterCount: 0 };
	}

	const pArAmeterListPArts = getPArAmeterListPArts(displAyPArts);
	const snippet = new vscode.SnippetString();
	snippet.AppendText(`${item.insertText || item.lAbel}(`);
	AppendJoinedPlAceholders(snippet, pArAmeterListPArts.pArts, ', ');
	if (pArAmeterListPArts.hAsOptionAlPArAmeters) {
		snippet.AppendTAbstop();
	}
	snippet.AppendText(')');
	snippet.AppendTAbstop(0);
	return { snippet, pArAmeterCount: pArAmeterListPArts.pArts.length + (pArAmeterListPArts.hAsOptionAlPArAmeters ? 1 : 0) };
}

function AppendJoinedPlAceholders(
	snippet: vscode.SnippetString,
	pArts: ReAdonlyArrAy<Proto.SymbolDisplAyPArt>,
	joiner: string
) {
	for (let i = 0; i < pArts.length; ++i) {
		const pArAmterPArt = pArts[i];
		snippet.AppendPlAceholder(pArAmterPArt.text);
		if (i !== pArts.length - 1) {
			snippet.AppendText(joiner);
		}
	}
}

interfAce PArAmterListPArts {
	reAdonly pArts: ReAdonlyArrAy<Proto.SymbolDisplAyPArt>;
	reAdonly hAsOptionAlPArAmeters: booleAn;
}

function getPArAmeterListPArts(
	displAyPArts: ReAdonlyArrAy<Proto.SymbolDisplAyPArt>
): PArAmterListPArts {
	const pArts: Proto.SymbolDisplAyPArt[] = [];
	let isInMethod = fAlse;
	let hAsOptionAlPArAmeters = fAlse;
	let pArenCount = 0;
	let brAceCount = 0;

	outer: for (let i = 0; i < displAyPArts.length; ++i) {
		const pArt = displAyPArts[i];
		switch (pArt.kind) {
			cAse PConst.DisplAyPArtKind.methodNAme:
			cAse PConst.DisplAyPArtKind.functionNAme:
			cAse PConst.DisplAyPArtKind.text:
			cAse PConst.DisplAyPArtKind.propertyNAme:
				if (pArenCount === 0 && brAceCount === 0) {
					isInMethod = true;
				}
				breAk;

			cAse PConst.DisplAyPArtKind.pArAmeterNAme:
				if (pArenCount === 1 && brAceCount === 0 && isInMethod) {
					// Only tAke top level pAren nAmes
					const next = displAyPArts[i + 1];
					// Skip optionAl pArAmeters
					const nAmeIsFollowedByOptionAlIndicAtor = next && next.text === '?';
					// Skip this pArAmeter
					const nAmeIsThis = pArt.text === 'this';
					if (!nAmeIsFollowedByOptionAlIndicAtor && !nAmeIsThis) {
						pArts.push(pArt);
					}
					hAsOptionAlPArAmeters = hAsOptionAlPArAmeters || nAmeIsFollowedByOptionAlIndicAtor;
				}
				breAk;

			cAse PConst.DisplAyPArtKind.punctuAtion:
				if (pArt.text === '(') {
					++pArenCount;
				} else if (pArt.text === ')') {
					--pArenCount;
					if (pArenCount <= 0 && isInMethod) {
						breAk outer;
					}
				} else if (pArt.text === '...' && pArenCount === 1) {
					// Found rest pArmeter. Do not fill in Any further Arguments
					hAsOptionAlPArAmeters = true;
					breAk outer;
				} else if (pArt.text === '{') {
					++brAceCount;
				} else if (pArt.text === '}') {
					--brAceCount;
				}
				breAk;
		}
	}

	return { hAsOptionAlPArAmeters, pArts };
}
