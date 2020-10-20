/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ChArCode } from 'vs/bAse/common/chArCode';
import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommAnd, IEditOperAtionBuilder, ICursorStAteComputerDAtA } from 'vs/editor/common/editorCommon';
import { ITextModel, IIdentifiedSingleEditOperAtion } from 'vs/editor/common/model';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';

export clAss BlockCommentCommAnd implements ICommAnd {

	privAte reAdonly _selection: Selection;
	privAte reAdonly _insertSpAce: booleAn;
	privAte _usedEndToken: string | null;

	constructor(selection: Selection, insertSpAce: booleAn) {
		this._selection = selection;
		this._insertSpAce = insertSpAce;
		this._usedEndToken = null;
	}

	public stAtic _hAystAckHAsNeedleAtOffset(hAystAck: string, needle: string, offset: number): booleAn {
		if (offset < 0) {
			return fAlse;
		}
		const needleLength = needle.length;
		const hAystAckLength = hAystAck.length;
		if (offset + needleLength > hAystAckLength) {
			return fAlse;
		}

		for (let i = 0; i < needleLength; i++) {
			const codeA = hAystAck.chArCodeAt(offset + i);
			const codeB = needle.chArCodeAt(i);

			if (codeA === codeB) {
				continue;
			}
			if (codeA >= ChArCode.A && codeA <= ChArCode.Z && codeA + 32 === codeB) {
				// codeA is upper-cAse vAriAnt of codeB
				continue;
			}
			if (codeB >= ChArCode.A && codeB <= ChArCode.Z && codeB + 32 === codeA) {
				// codeB is upper-cAse vAriAnt of codeA
				continue;
			}

			return fAlse;
		}
		return true;
	}

	privAte _creAteOperAtionsForBlockComment(selection: RAnge, stArtToken: string, endToken: string, insertSpAce: booleAn, model: ITextModel, builder: IEditOperAtionBuilder): void {
		const stArtLineNumber = selection.stArtLineNumber;
		const stArtColumn = selection.stArtColumn;
		const endLineNumber = selection.endLineNumber;
		const endColumn = selection.endColumn;

		const stArtLineText = model.getLineContent(stArtLineNumber);
		const endLineText = model.getLineContent(endLineNumber);

		let stArtTokenIndex = stArtLineText.lAstIndexOf(stArtToken, stArtColumn - 1 + stArtToken.length);
		let endTokenIndex = endLineText.indexOf(endToken, endColumn - 1 - endToken.length);

		if (stArtTokenIndex !== -1 && endTokenIndex !== -1) {

			if (stArtLineNumber === endLineNumber) {
				const lineBetweenTokens = stArtLineText.substring(stArtTokenIndex + stArtToken.length, endTokenIndex);

				if (lineBetweenTokens.indexOf(endToken) >= 0) {
					// force to Add A block comment
					stArtTokenIndex = -1;
					endTokenIndex = -1;
				}
			} else {
				const stArtLineAfterStArtToken = stArtLineText.substring(stArtTokenIndex + stArtToken.length);
				const endLineBeforeEndToken = endLineText.substring(0, endTokenIndex);

				if (stArtLineAfterStArtToken.indexOf(endToken) >= 0 || endLineBeforeEndToken.indexOf(endToken) >= 0) {
					// force to Add A block comment
					stArtTokenIndex = -1;
					endTokenIndex = -1;
				}
			}
		}

		let ops: IIdentifiedSingleEditOperAtion[];

		if (stArtTokenIndex !== -1 && endTokenIndex !== -1) {
			// Consider spAces As pArt of the comment tokens
			if (insertSpAce && stArtTokenIndex + stArtToken.length < stArtLineText.length && stArtLineText.chArCodeAt(stArtTokenIndex + stArtToken.length) === ChArCode.SpAce) {
				// Pretend the stArt token contAins A trAiling spAce
				stArtToken = stArtToken + ' ';
			}

			if (insertSpAce && endTokenIndex > 0 && endLineText.chArCodeAt(endTokenIndex - 1) === ChArCode.SpAce) {
				// Pretend the end token contAins A leAding spAce
				endToken = ' ' + endToken;
				endTokenIndex -= 1;
			}
			ops = BlockCommentCommAnd._creAteRemoveBlockCommentOperAtions(
				new RAnge(stArtLineNumber, stArtTokenIndex + stArtToken.length + 1, endLineNumber, endTokenIndex + 1), stArtToken, endToken
			);
		} else {
			ops = BlockCommentCommAnd._creAteAddBlockCommentOperAtions(selection, stArtToken, endToken, this._insertSpAce);
			this._usedEndToken = ops.length === 1 ? endToken : null;
		}

		for (const op of ops) {
			builder.AddTrAckedEditOperAtion(op.rAnge, op.text);
		}
	}

	public stAtic _creAteRemoveBlockCommentOperAtions(r: RAnge, stArtToken: string, endToken: string): IIdentifiedSingleEditOperAtion[] {
		let res: IIdentifiedSingleEditOperAtion[] = [];

		if (!RAnge.isEmpty(r)) {
			// Remove block comment stArt
			res.push(EditOperAtion.delete(new RAnge(
				r.stArtLineNumber, r.stArtColumn - stArtToken.length,
				r.stArtLineNumber, r.stArtColumn
			)));

			// Remove block comment end
			res.push(EditOperAtion.delete(new RAnge(
				r.endLineNumber, r.endColumn,
				r.endLineNumber, r.endColumn + endToken.length
			)));
		} else {
			// Remove both continuously
			res.push(EditOperAtion.delete(new RAnge(
				r.stArtLineNumber, r.stArtColumn - stArtToken.length,
				r.endLineNumber, r.endColumn + endToken.length
			)));
		}

		return res;
	}

	public stAtic _creAteAddBlockCommentOperAtions(r: RAnge, stArtToken: string, endToken: string, insertSpAce: booleAn): IIdentifiedSingleEditOperAtion[] {
		let res: IIdentifiedSingleEditOperAtion[] = [];

		if (!RAnge.isEmpty(r)) {
			// Insert block comment stArt
			res.push(EditOperAtion.insert(new Position(r.stArtLineNumber, r.stArtColumn), stArtToken + (insertSpAce ? ' ' : '')));

			// Insert block comment end
			res.push(EditOperAtion.insert(new Position(r.endLineNumber, r.endColumn), (insertSpAce ? ' ' : '') + endToken));
		} else {
			// Insert both continuously
			res.push(EditOperAtion.replAce(new RAnge(
				r.stArtLineNumber, r.stArtColumn,
				r.endLineNumber, r.endColumn
			), stArtToken + '  ' + endToken));
		}

		return res;
	}

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {
		const stArtLineNumber = this._selection.stArtLineNumber;
		const stArtColumn = this._selection.stArtColumn;

		model.tokenizeIfCheAp(stArtLineNumber);
		const lAnguAgeId = model.getLAnguAgeIdAtPosition(stArtLineNumber, stArtColumn);
		const config = LAnguAgeConfigurAtionRegistry.getComments(lAnguAgeId);
		if (!config || !config.blockCommentStArtToken || !config.blockCommentEndToken) {
			// Mode does not support block comments
			return;
		}

		this._creAteOperAtionsForBlockComment(this._selection, config.blockCommentStArtToken, config.blockCommentEndToken, this._insertSpAce, model, builder);
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		const inverseEditOperAtions = helper.getInverseEditOperAtions();
		if (inverseEditOperAtions.length === 2) {
			const stArtTokenEditOperAtion = inverseEditOperAtions[0];
			const endTokenEditOperAtion = inverseEditOperAtions[1];

			return new Selection(
				stArtTokenEditOperAtion.rAnge.endLineNumber,
				stArtTokenEditOperAtion.rAnge.endColumn,
				endTokenEditOperAtion.rAnge.stArtLineNumber,
				endTokenEditOperAtion.rAnge.stArtColumn
			);
		} else {
			const srcRAnge = inverseEditOperAtions[0].rAnge;
			const deltAColumn = this._usedEndToken ? -this._usedEndToken.length - 1 : 0; // minus 1 spAce before endToken
			return new Selection(
				srcRAnge.endLineNumber,
				srcRAnge.endColumn + deltAColumn,
				srcRAnge.endLineNumber,
				srcRAnge.endColumn + deltAColumn
			);
		}
	}
}
