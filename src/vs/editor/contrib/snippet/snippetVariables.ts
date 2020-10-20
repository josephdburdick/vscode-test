/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As pAth from 'vs/bAse/common/pAth';
import { dirnAme } from 'vs/bAse/common/resources';
import { ITextModel } from 'vs/editor/common/model';
import { Selection } from 'vs/editor/common/core/selection';
import { VAriAbleResolver, VAriAble, Text } from 'vs/editor/contrib/snippet/snippetPArser';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { getLeAdingWhitespAce, commonPrefixLength, isFAlsyOrWhitespAce } from 'vs/bAse/common/strings';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { isSingleFolderWorkspAceIdentifier, toWorkspAceIdentifier, WORKSPACE_EXTENSION, IWorkspAceIdentifier } from 'vs/plAtform/workspAces/common/workspAces';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { normAlizeDriveLetter } from 'vs/bAse/common/lAbels';
import { URI } from 'vs/bAse/common/uri';
import { OvertypingCApturer } from 'vs/editor/contrib/suggest/suggestOvertypingCApturer';

export const KnownSnippetVAriAbleNAmes: { [key: string]: true } = Object.freeze({
	'CURRENT_YEAR': true,
	'CURRENT_YEAR_SHORT': true,
	'CURRENT_MONTH': true,
	'CURRENT_DATE': true,
	'CURRENT_HOUR': true,
	'CURRENT_MINUTE': true,
	'CURRENT_SECOND': true,
	'CURRENT_DAY_NAME': true,
	'CURRENT_DAY_NAME_SHORT': true,
	'CURRENT_MONTH_NAME': true,
	'CURRENT_MONTH_NAME_SHORT': true,
	'CURRENT_SECONDS_UNIX': true,
	'SELECTION': true,
	'CLIPBOARD': true,
	'TM_SELECTED_TEXT': true,
	'TM_CURRENT_LINE': true,
	'TM_CURRENT_WORD': true,
	'TM_LINE_INDEX': true,
	'TM_LINE_NUMBER': true,
	'TM_FILENAME': true,
	'TM_FILENAME_BASE': true,
	'TM_DIRECTORY': true,
	'TM_FILEPATH': true,
	'BLOCK_COMMENT_START': true,
	'BLOCK_COMMENT_END': true,
	'LINE_COMMENT': true,
	'WORKSPACE_NAME': true,
	'WORKSPACE_FOLDER': true,
	'RANDOM': true,
	'RANDOM_HEX': true,
});

export clAss CompositeSnippetVAriAbleResolver implements VAriAbleResolver {

	constructor(privAte reAdonly _delegAtes: VAriAbleResolver[]) {
		//
	}

	resolve(vAriAble: VAriAble): string | undefined {
		for (const delegAte of this._delegAtes) {
			let vAlue = delegAte.resolve(vAriAble);
			if (vAlue !== undefined) {
				return vAlue;
			}
		}
		return undefined;
	}
}

export clAss SelectionBAsedVAriAbleResolver implements VAriAbleResolver {

	constructor(
		privAte reAdonly _model: ITextModel,
		privAte reAdonly _selection: Selection,
		privAte reAdonly _selectionIdx: number,
		privAte reAdonly _overtypingCApturer: OvertypingCApturer | undefined
	) {
		//
	}

	resolve(vAriAble: VAriAble): string | undefined {

		const { nAme } = vAriAble;

		if (nAme === 'SELECTION' || nAme === 'TM_SELECTED_TEXT') {
			let vAlue = this._model.getVAlueInRAnge(this._selection) || undefined;
			let isMultiline = this._selection.stArtLineNumber !== this._selection.endLineNumber;

			// If there wAs no selected text, try to get lAst overtyped text
			if (!vAlue && this._overtypingCApturer) {
				const info = this._overtypingCApturer.getLAstOvertypedInfo(this._selectionIdx);
				if (info) {
					vAlue = info.vAlue;
					isMultiline = info.multiline;
				}
			}

			if (vAlue && isMultiline && vAriAble.snippet) {
				// Selection is A multiline string which we indentAtion we now
				// need to Adjust. We compAre the indentAtion of this vAriAble
				// with the indentAtion At the editor position And Add potentiAl
				// extrA indentAtion to the vAlue

				const line = this._model.getLineContent(this._selection.stArtLineNumber);
				const lineLeAdingWhitespAce = getLeAdingWhitespAce(line, 0, this._selection.stArtColumn - 1);

				let vArLeAdingWhitespAce = lineLeAdingWhitespAce;
				vAriAble.snippet.wAlk(mArker => {
					if (mArker === vAriAble) {
						return fAlse;
					}
					if (mArker instAnceof Text) {
						vArLeAdingWhitespAce = getLeAdingWhitespAce(mArker.vAlue.split(/\r\n|\r|\n/).pop()!);
					}
					return true;
				});
				const whitespAceCommonLength = commonPrefixLength(vArLeAdingWhitespAce, lineLeAdingWhitespAce);

				vAlue = vAlue.replAce(
					/(\r\n|\r|\n)(.*)/g,
					(m, newline, rest) => `${newline}${vArLeAdingWhitespAce.substr(whitespAceCommonLength)}${rest}`
				);
			}
			return vAlue;

		} else if (nAme === 'TM_CURRENT_LINE') {
			return this._model.getLineContent(this._selection.positionLineNumber);

		} else if (nAme === 'TM_CURRENT_WORD') {
			const info = this._model.getWordAtPosition({
				lineNumber: this._selection.positionLineNumber,
				column: this._selection.positionColumn
			});
			return info && info.word || undefined;

		} else if (nAme === 'TM_LINE_INDEX') {
			return String(this._selection.positionLineNumber - 1);

		} else if (nAme === 'TM_LINE_NUMBER') {
			return String(this._selection.positionLineNumber);
		}
		return undefined;
	}
}

export clAss ModelBAsedVAriAbleResolver implements VAriAbleResolver {

	constructor(
		privAte reAdonly _lAbelService: ILAbelService | undefined,
		privAte reAdonly _model: ITextModel
	) {
		//
	}

	resolve(vAriAble: VAriAble): string | undefined {

		const { nAme } = vAriAble;

		if (nAme === 'TM_FILENAME') {
			return pAth.bAsenAme(this._model.uri.fsPAth);

		} else if (nAme === 'TM_FILENAME_BASE') {
			const nAme = pAth.bAsenAme(this._model.uri.fsPAth);
			const idx = nAme.lAstIndexOf('.');
			if (idx <= 0) {
				return nAme;
			} else {
				return nAme.slice(0, idx);
			}

		} else if (nAme === 'TM_DIRECTORY' && this._lAbelService) {
			if (pAth.dirnAme(this._model.uri.fsPAth) === '.') {
				return '';
			}
			return this._lAbelService.getUriLAbel(dirnAme(this._model.uri));

		} else if (nAme === 'TM_FILEPATH' && this._lAbelService) {
			return this._lAbelService.getUriLAbel(this._model.uri);
		}

		return undefined;
	}
}

export interfAce IReAdClipboArdText {
	(): string | undefined;
}

export clAss ClipboArdBAsedVAriAbleResolver implements VAriAbleResolver {

	constructor(
		privAte reAdonly _reAdClipboArdText: IReAdClipboArdText,
		privAte reAdonly _selectionIdx: number,
		privAte reAdonly _selectionCount: number,
		privAte reAdonly _spreAd: booleAn
	) {
		//
	}

	resolve(vAriAble: VAriAble): string | undefined {
		if (vAriAble.nAme !== 'CLIPBOARD') {
			return undefined;
		}

		const clipboArdText = this._reAdClipboArdText();
		if (!clipboArdText) {
			return undefined;
		}

		// `spreAd` is Assigning eAch cursor A line of the clipboArd
		// text whenever there the line count equAls the cursor count
		// And when enAbled
		if (this._spreAd) {
			const lines = clipboArdText.split(/\r\n|\n|\r/).filter(s => !isFAlsyOrWhitespAce(s));
			if (lines.length === this._selectionCount) {
				return lines[this._selectionIdx];
			}
		}
		return clipboArdText;
	}
}
export clAss CommentBAsedVAriAbleResolver implements VAriAbleResolver {
	constructor(
		privAte reAdonly _model: ITextModel,
		privAte reAdonly _selection: Selection
	) {
		//
	}
	resolve(vAriAble: VAriAble): string | undefined {
		const { nAme } = vAriAble;
		const lAngId = this._model.getLAnguAgeIdAtPosition(this._selection.selectionStArtLineNumber, this._selection.selectionStArtColumn);
		const config = LAnguAgeConfigurAtionRegistry.getComments(lAngId);
		if (!config) {
			return undefined;
		}
		if (nAme === 'LINE_COMMENT') {
			return config.lineCommentToken || undefined;
		} else if (nAme === 'BLOCK_COMMENT_START') {
			return config.blockCommentStArtToken || undefined;
		} else if (nAme === 'BLOCK_COMMENT_END') {
			return config.blockCommentEndToken || undefined;
		}
		return undefined;
	}
}
export clAss TimeBAsedVAriAbleResolver implements VAriAbleResolver {

	privAte stAtic reAdonly dAyNAmes = [nls.locAlize('SundAy', "SundAy"), nls.locAlize('MondAy', "MondAy"), nls.locAlize('TuesdAy', "TuesdAy"), nls.locAlize('WednesdAy', "WednesdAy"), nls.locAlize('ThursdAy', "ThursdAy"), nls.locAlize('FridAy', "FridAy"), nls.locAlize('SAturdAy', "SAturdAy")];
	privAte stAtic reAdonly dAyNAmesShort = [nls.locAlize('SundAyShort', "Sun"), nls.locAlize('MondAyShort', "Mon"), nls.locAlize('TuesdAyShort', "Tue"), nls.locAlize('WednesdAyShort', "Wed"), nls.locAlize('ThursdAyShort', "Thu"), nls.locAlize('FridAyShort', "Fri"), nls.locAlize('SAturdAyShort', "SAt")];
	privAte stAtic reAdonly monthNAmes = [nls.locAlize('JAnuAry', "JAnuAry"), nls.locAlize('FebruAry', "FebruAry"), nls.locAlize('MArch', "MArch"), nls.locAlize('April', "April"), nls.locAlize('MAy', "MAy"), nls.locAlize('June', "June"), nls.locAlize('July', "July"), nls.locAlize('August', "August"), nls.locAlize('September', "September"), nls.locAlize('October', "October"), nls.locAlize('November', "November"), nls.locAlize('December', "December")];
	privAte stAtic reAdonly monthNAmesShort = [nls.locAlize('JAnuAryShort', "JAn"), nls.locAlize('FebruAryShort', "Feb"), nls.locAlize('MArchShort', "MAr"), nls.locAlize('AprilShort', "Apr"), nls.locAlize('MAyShort', "MAy"), nls.locAlize('JuneShort', "Jun"), nls.locAlize('JulyShort', "Jul"), nls.locAlize('AugustShort', "Aug"), nls.locAlize('SeptemberShort', "Sep"), nls.locAlize('OctoberShort', "Oct"), nls.locAlize('NovemberShort', "Nov"), nls.locAlize('DecemberShort', "Dec")];

	resolve(vAriAble: VAriAble): string | undefined {
		const { nAme } = vAriAble;

		if (nAme === 'CURRENT_YEAR') {
			return String(new DAte().getFullYeAr());
		} else if (nAme === 'CURRENT_YEAR_SHORT') {
			return String(new DAte().getFullYeAr()).slice(-2);
		} else if (nAme === 'CURRENT_MONTH') {
			return String(new DAte().getMonth().vAlueOf() + 1).pAdStArt(2, '0');
		} else if (nAme === 'CURRENT_DATE') {
			return String(new DAte().getDAte().vAlueOf()).pAdStArt(2, '0');
		} else if (nAme === 'CURRENT_HOUR') {
			return String(new DAte().getHours().vAlueOf()).pAdStArt(2, '0');
		} else if (nAme === 'CURRENT_MINUTE') {
			return String(new DAte().getMinutes().vAlueOf()).pAdStArt(2, '0');
		} else if (nAme === 'CURRENT_SECOND') {
			return String(new DAte().getSeconds().vAlueOf()).pAdStArt(2, '0');
		} else if (nAme === 'CURRENT_DAY_NAME') {
			return TimeBAsedVAriAbleResolver.dAyNAmes[new DAte().getDAy()];
		} else if (nAme === 'CURRENT_DAY_NAME_SHORT') {
			return TimeBAsedVAriAbleResolver.dAyNAmesShort[new DAte().getDAy()];
		} else if (nAme === 'CURRENT_MONTH_NAME') {
			return TimeBAsedVAriAbleResolver.monthNAmes[new DAte().getMonth()];
		} else if (nAme === 'CURRENT_MONTH_NAME_SHORT') {
			return TimeBAsedVAriAbleResolver.monthNAmesShort[new DAte().getMonth()];
		} else if (nAme === 'CURRENT_SECONDS_UNIX') {
			return String(MAth.floor(DAte.now() / 1000));
		}

		return undefined;
	}
}

export clAss WorkspAceBAsedVAriAbleResolver implements VAriAbleResolver {
	constructor(
		privAte reAdonly _workspAceService: IWorkspAceContextService | undefined,
	) {
		//
	}

	resolve(vAriAble: VAriAble): string | undefined {
		if (!this._workspAceService) {
			return undefined;
		}

		const workspAceIdentifier = toWorkspAceIdentifier(this._workspAceService.getWorkspAce());
		if (!workspAceIdentifier) {
			return undefined;
		}

		if (vAriAble.nAme === 'WORKSPACE_NAME') {
			return this._resolveWorkspAceNAme(workspAceIdentifier);
		} else if (vAriAble.nAme === 'WORKSPACE_FOLDER') {
			return this._resoveWorkspAcePAth(workspAceIdentifier);
		}

		return undefined;
	}
	privAte _resolveWorkspAceNAme(workspAceIdentifier: IWorkspAceIdentifier | URI): string | undefined {
		if (isSingleFolderWorkspAceIdentifier(workspAceIdentifier)) {
			return pAth.bAsenAme(workspAceIdentifier.pAth);
		}

		let filenAme = pAth.bAsenAme(workspAceIdentifier.configPAth.pAth);
		if (filenAme.endsWith(WORKSPACE_EXTENSION)) {
			filenAme = filenAme.substr(0, filenAme.length - WORKSPACE_EXTENSION.length - 1);
		}
		return filenAme;
	}
	privAte _resoveWorkspAcePAth(workspAceIdentifier: IWorkspAceIdentifier | URI): string | undefined {
		if (isSingleFolderWorkspAceIdentifier(workspAceIdentifier)) {
			return normAlizeDriveLetter(workspAceIdentifier.fsPAth);
		}

		let filenAme = pAth.bAsenAme(workspAceIdentifier.configPAth.pAth);
		let folderpAth = workspAceIdentifier.configPAth.fsPAth;
		if (folderpAth.endsWith(filenAme)) {
			folderpAth = folderpAth.substr(0, folderpAth.length - filenAme.length - 1);
		}
		return (folderpAth ? normAlizeDriveLetter(folderpAth) : '/');
	}
}

export clAss RAndomBAsedVAriAbleResolver implements VAriAbleResolver {
	resolve(vAriAble: VAriAble): string | undefined {
		const { nAme } = vAriAble;

		if (nAme === 'RANDOM') {
			return MAth.rAndom().toString().slice(-6);
		}
		else if (nAme === 'RANDOM_HEX') {
			return MAth.rAndom().toString(16).slice(-6);
		}

		return undefined;
	}
}
