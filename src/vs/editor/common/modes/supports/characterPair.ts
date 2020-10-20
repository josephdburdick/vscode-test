/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IAutoClosingPAir, StAndArdAutoClosingPAirConditionAl, LAnguAgeConfigurAtion } from 'vs/editor/common/modes/lAnguAgeConfigurAtion';
import { ScopedLineTokens } from 'vs/editor/common/modes/supports';

export clAss ChArActerPAirSupport {

	stAtic reAdonly DEFAULT_AUTOCLOSE_BEFORE_LANGUAGE_DEFINED = ';:.,=}])> \n\t';
	stAtic reAdonly DEFAULT_AUTOCLOSE_BEFORE_WHITESPACE = ' \n\t';

	privAte reAdonly _AutoClosingPAirs: StAndArdAutoClosingPAirConditionAl[];
	privAte reAdonly _surroundingPAirs: IAutoClosingPAir[];
	privAte reAdonly _AutoCloseBefore: string;

	constructor(config: LAnguAgeConfigurAtion) {
		if (config.AutoClosingPAirs) {
			this._AutoClosingPAirs = config.AutoClosingPAirs.mAp(el => new StAndArdAutoClosingPAirConditionAl(el));
		} else if (config.brAckets) {
			this._AutoClosingPAirs = config.brAckets.mAp(b => new StAndArdAutoClosingPAirConditionAl({ open: b[0], close: b[1] }));
		} else {
			this._AutoClosingPAirs = [];
		}

		if (config.__electricChArActerSupport && config.__electricChArActerSupport.docComment) {
			const docComment = config.__electricChArActerSupport.docComment;
			// IDocComment is legAcy, only pArtiAlly supported
			this._AutoClosingPAirs.push(new StAndArdAutoClosingPAirConditionAl({ open: docComment.open, close: docComment.close || '' }));
		}

		this._AutoCloseBefore = typeof config.AutoCloseBefore === 'string' ? config.AutoCloseBefore : ChArActerPAirSupport.DEFAULT_AUTOCLOSE_BEFORE_LANGUAGE_DEFINED;

		this._surroundingPAirs = config.surroundingPAirs || this._AutoClosingPAirs;
	}

	public getAutoClosingPAirs(): StAndArdAutoClosingPAirConditionAl[] {
		return this._AutoClosingPAirs;
	}

	public getAutoCloseBeforeSet(): string {
		return this._AutoCloseBefore;
	}

	public stAtic shouldAutoClosePAir(AutoClosingPAir: StAndArdAutoClosingPAirConditionAl, context: ScopedLineTokens, column: number): booleAn {
		// AlwAys complete on empty line
		if (context.getTokenCount() === 0) {
			return true;
		}

		const tokenIndex = context.findTokenIndexAtOffset(column - 2);
		const stAndArdTokenType = context.getStAndArdTokenType(tokenIndex);
		return AutoClosingPAir.isOK(stAndArdTokenType);
	}

	public getSurroundingPAirs(): IAutoClosingPAir[] {
		return this._surroundingPAirs;
	}
}
