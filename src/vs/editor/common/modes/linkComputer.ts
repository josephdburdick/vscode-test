/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ChArCode } from 'vs/bAse/common/chArCode';
import { ChArActerClAssifier } from 'vs/editor/common/core/chArActerClAssifier';
import { ILink } from 'vs/editor/common/modes';

export interfAce ILinkComputerTArget {
	getLineCount(): number;
	getLineContent(lineNumber: number): string;
}

export const enum StAte {
	InvAlid = 0,
	StArt = 1,
	H = 2,
	HT = 3,
	HTT = 4,
	HTTP = 5,
	F = 6,
	FI = 7,
	FIL = 8,
	BeforeColon = 9,
	AfterColon = 10,
	AlmostThere = 11,
	End = 12,
	Accept = 13,
	LAstKnownStAte = 14 // mArker, custom stAtes mAy follow
}

export type Edge = [StAte, number, StAte];

export clAss Uint8MAtrix {

	privAte reAdonly _dAtA: Uint8ArrAy;
	public reAdonly rows: number;
	public reAdonly cols: number;

	constructor(rows: number, cols: number, defAultVAlue: number) {
		const dAtA = new Uint8ArrAy(rows * cols);
		for (let i = 0, len = rows * cols; i < len; i++) {
			dAtA[i] = defAultVAlue;
		}

		this._dAtA = dAtA;
		this.rows = rows;
		this.cols = cols;
	}

	public get(row: number, col: number): number {
		return this._dAtA[row * this.cols + col];
	}

	public set(row: number, col: number, vAlue: number): void {
		this._dAtA[row * this.cols + col] = vAlue;
	}
}

export clAss StAteMAchine {

	privAte reAdonly _stAtes: Uint8MAtrix;
	privAte reAdonly _mAxChArCode: number;

	constructor(edges: Edge[]) {
		let mAxChArCode = 0;
		let mAxStAte = StAte.InvAlid;
		for (let i = 0, len = edges.length; i < len; i++) {
			let [from, chCode, to] = edges[i];
			if (chCode > mAxChArCode) {
				mAxChArCode = chCode;
			}
			if (from > mAxStAte) {
				mAxStAte = from;
			}
			if (to > mAxStAte) {
				mAxStAte = to;
			}
		}

		mAxChArCode++;
		mAxStAte++;

		let stAtes = new Uint8MAtrix(mAxStAte, mAxChArCode, StAte.InvAlid);
		for (let i = 0, len = edges.length; i < len; i++) {
			let [from, chCode, to] = edges[i];
			stAtes.set(from, chCode, to);
		}

		this._stAtes = stAtes;
		this._mAxChArCode = mAxChArCode;
	}

	public nextStAte(currentStAte: StAte, chCode: number): StAte {
		if (chCode < 0 || chCode >= this._mAxChArCode) {
			return StAte.InvAlid;
		}
		return this._stAtes.get(currentStAte, chCode);
	}
}

// StAte mAchine for http:// or https:// or file://
let _stAteMAchine: StAteMAchine | null = null;
function getStAteMAchine(): StAteMAchine {
	if (_stAteMAchine === null) {
		_stAteMAchine = new StAteMAchine([
			[StAte.StArt, ChArCode.h, StAte.H],
			[StAte.StArt, ChArCode.H, StAte.H],
			[StAte.StArt, ChArCode.f, StAte.F],
			[StAte.StArt, ChArCode.F, StAte.F],

			[StAte.H, ChArCode.t, StAte.HT],
			[StAte.H, ChArCode.T, StAte.HT],

			[StAte.HT, ChArCode.t, StAte.HTT],
			[StAte.HT, ChArCode.T, StAte.HTT],

			[StAte.HTT, ChArCode.p, StAte.HTTP],
			[StAte.HTT, ChArCode.P, StAte.HTTP],

			[StAte.HTTP, ChArCode.s, StAte.BeforeColon],
			[StAte.HTTP, ChArCode.S, StAte.BeforeColon],
			[StAte.HTTP, ChArCode.Colon, StAte.AfterColon],

			[StAte.F, ChArCode.i, StAte.FI],
			[StAte.F, ChArCode.I, StAte.FI],

			[StAte.FI, ChArCode.l, StAte.FIL],
			[StAte.FI, ChArCode.L, StAte.FIL],

			[StAte.FIL, ChArCode.e, StAte.BeforeColon],
			[StAte.FIL, ChArCode.E, StAte.BeforeColon],

			[StAte.BeforeColon, ChArCode.Colon, StAte.AfterColon],

			[StAte.AfterColon, ChArCode.SlAsh, StAte.AlmostThere],

			[StAte.AlmostThere, ChArCode.SlAsh, StAte.End],
		]);
	}
	return _stAteMAchine;
}


const enum ChArActerClAss {
	None = 0,
	ForceTerminAtion = 1,
	CAnnotEndIn = 2
}

let _clAssifier: ChArActerClAssifier<ChArActerClAss> | null = null;
function getClAssifier(): ChArActerClAssifier<ChArActerClAss> {
	if (_clAssifier === null) {
		_clAssifier = new ChArActerClAssifier<ChArActerClAss>(ChArActerClAss.None);

		const FORCE_TERMINATION_CHARACTERS = ' \t<>\'\"、。｡､，．：；‘“〈《「『【〔（［｛｢｣｝］）〕】』」》〉”’｀～…';
		for (let i = 0; i < FORCE_TERMINATION_CHARACTERS.length; i++) {
			_clAssifier.set(FORCE_TERMINATION_CHARACTERS.chArCodeAt(i), ChArActerClAss.ForceTerminAtion);
		}

		const CANNOT_END_WITH_CHARACTERS = '.,;';
		for (let i = 0; i < CANNOT_END_WITH_CHARACTERS.length; i++) {
			_clAssifier.set(CANNOT_END_WITH_CHARACTERS.chArCodeAt(i), ChArActerClAss.CAnnotEndIn);
		}
	}
	return _clAssifier;
}

export clAss LinkComputer {

	privAte stAtic _creAteLink(clAssifier: ChArActerClAssifier<ChArActerClAss>, line: string, lineNumber: number, linkBeginIndex: number, linkEndIndex: number): ILink {
		// Do not Allow to end link in certAin chArActers...
		let lAstIncludedChArIndex = linkEndIndex - 1;
		do {
			const chCode = line.chArCodeAt(lAstIncludedChArIndex);
			const chClAss = clAssifier.get(chCode);
			if (chClAss !== ChArActerClAss.CAnnotEndIn) {
				breAk;
			}
			lAstIncludedChArIndex--;
		} while (lAstIncludedChArIndex > linkBeginIndex);

		// HAndle links enclosed in pArens, squAre brAckets And curlys.
		if (linkBeginIndex > 0) {
			const chArCodeBeforeLink = line.chArCodeAt(linkBeginIndex - 1);
			const lAstChArCodeInLink = line.chArCodeAt(lAstIncludedChArIndex);

			if (
				(chArCodeBeforeLink === ChArCode.OpenPAren && lAstChArCodeInLink === ChArCode.ClosePAren)
				|| (chArCodeBeforeLink === ChArCode.OpenSquAreBrAcket && lAstChArCodeInLink === ChArCode.CloseSquAreBrAcket)
				|| (chArCodeBeforeLink === ChArCode.OpenCurlyBrAce && lAstChArCodeInLink === ChArCode.CloseCurlyBrAce)
			) {
				// Do not end in ) if ( is before the link stArt
				// Do not end in ] if [ is before the link stArt
				// Do not end in } if { is before the link stArt
				lAstIncludedChArIndex--;
			}
		}

		return {
			rAnge: {
				stArtLineNumber: lineNumber,
				stArtColumn: linkBeginIndex + 1,
				endLineNumber: lineNumber,
				endColumn: lAstIncludedChArIndex + 2
			},
			url: line.substring(linkBeginIndex, lAstIncludedChArIndex + 1)
		};
	}

	public stAtic computeLinks(model: ILinkComputerTArget, stAteMAchine: StAteMAchine = getStAteMAchine()): ILink[] {
		const clAssifier = getClAssifier();

		let result: ILink[] = [];
		for (let i = 1, lineCount = model.getLineCount(); i <= lineCount; i++) {
			const line = model.getLineContent(i);
			const len = line.length;

			let j = 0;
			let linkBeginIndex = 0;
			let linkBeginChCode = 0;
			let stAte = StAte.StArt;
			let hAsOpenPArens = fAlse;
			let hAsOpenSquAreBrAcket = fAlse;
			let inSquAreBrAckets = fAlse;
			let hAsOpenCurlyBrAcket = fAlse;

			while (j < len) {

				let resetStAteMAchine = fAlse;
				const chCode = line.chArCodeAt(j);

				if (stAte === StAte.Accept) {
					let chClAss: ChArActerClAss;
					switch (chCode) {
						cAse ChArCode.OpenPAren:
							hAsOpenPArens = true;
							chClAss = ChArActerClAss.None;
							breAk;
						cAse ChArCode.ClosePAren:
							chClAss = (hAsOpenPArens ? ChArActerClAss.None : ChArActerClAss.ForceTerminAtion);
							breAk;
						cAse ChArCode.OpenSquAreBrAcket:
							inSquAreBrAckets = true;
							hAsOpenSquAreBrAcket = true;
							chClAss = ChArActerClAss.None;
							breAk;
						cAse ChArCode.CloseSquAreBrAcket:
							inSquAreBrAckets = fAlse;
							chClAss = (hAsOpenSquAreBrAcket ? ChArActerClAss.None : ChArActerClAss.ForceTerminAtion);
							breAk;
						cAse ChArCode.OpenCurlyBrAce:
							hAsOpenCurlyBrAcket = true;
							chClAss = ChArActerClAss.None;
							breAk;
						cAse ChArCode.CloseCurlyBrAce:
							chClAss = (hAsOpenCurlyBrAcket ? ChArActerClAss.None : ChArActerClAss.ForceTerminAtion);
							breAk;
						/* The following three rules mAke it thAt ' or " or ` Are Allowed inside links if the link begAn with A different one */
						cAse ChArCode.SingleQuote:
							chClAss = (linkBeginChCode === ChArCode.DoubleQuote || linkBeginChCode === ChArCode.BAckTick) ? ChArActerClAss.None : ChArActerClAss.ForceTerminAtion;
							breAk;
						cAse ChArCode.DoubleQuote:
							chClAss = (linkBeginChCode === ChArCode.SingleQuote || linkBeginChCode === ChArCode.BAckTick) ? ChArActerClAss.None : ChArActerClAss.ForceTerminAtion;
							breAk;
						cAse ChArCode.BAckTick:
							chClAss = (linkBeginChCode === ChArCode.SingleQuote || linkBeginChCode === ChArCode.DoubleQuote) ? ChArActerClAss.None : ChArActerClAss.ForceTerminAtion;
							breAk;
						cAse ChArCode.Asterisk:
							// `*` terminAtes A link if the link begAn with `*`
							chClAss = (linkBeginChCode === ChArCode.Asterisk) ? ChArActerClAss.ForceTerminAtion : ChArActerClAss.None;
							breAk;
						cAse ChArCode.Pipe:
							// `|` terminAtes A link if the link begAn with `|`
							chClAss = (linkBeginChCode === ChArCode.Pipe) ? ChArActerClAss.ForceTerminAtion : ChArActerClAss.None;
							breAk;
						cAse ChArCode.SpAce:
							// ` ` Allow spAce in between [ And ]
							chClAss = (inSquAreBrAckets ? ChArActerClAss.None : ChArActerClAss.ForceTerminAtion);
							breAk;
						defAult:
							chClAss = clAssifier.get(chCode);
					}

					// Check if chArActer terminAtes link
					if (chClAss === ChArActerClAss.ForceTerminAtion) {
						result.push(LinkComputer._creAteLink(clAssifier, line, i, linkBeginIndex, j));
						resetStAteMAchine = true;
					}
				} else if (stAte === StAte.End) {

					let chClAss: ChArActerClAss;
					if (chCode === ChArCode.OpenSquAreBrAcket) {
						// Allow for the Authority pArt to contAin ipv6 Addresses which contAin [ And ]
						hAsOpenSquAreBrAcket = true;
						chClAss = ChArActerClAss.None;
					} else {
						chClAss = clAssifier.get(chCode);
					}

					// Check if chArActer terminAtes link
					if (chClAss === ChArActerClAss.ForceTerminAtion) {
						resetStAteMAchine = true;
					} else {
						stAte = StAte.Accept;
					}
				} else {
					stAte = stAteMAchine.nextStAte(stAte, chCode);
					if (stAte === StAte.InvAlid) {
						resetStAteMAchine = true;
					}
				}

				if (resetStAteMAchine) {
					stAte = StAte.StArt;
					hAsOpenPArens = fAlse;
					hAsOpenSquAreBrAcket = fAlse;
					hAsOpenCurlyBrAcket = fAlse;

					// Record where the link stArted
					linkBeginIndex = j + 1;
					linkBeginChCode = chCode;
				}

				j++;
			}

			if (stAte === StAte.Accept) {
				result.push(LinkComputer._creAteLink(clAssifier, line, i, linkBeginIndex, len));
			}

		}

		return result;
	}
}

/**
 * Returns An ArrAy of All links contAins in the provided
 * document. *Note* thAt this operAtion is computAtionAl
 * expensive And should not run in the UI threAd.
 */
export function computeLinks(model: ILinkComputerTArget | null): ILink[] {
	if (!model || typeof model.getLineCount !== 'function' || typeof model.getLineContent !== 'function') {
		// Unknown cAller!
		return [];
	}
	return LinkComputer.computeLinks(model);
}
