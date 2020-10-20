/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ChArCode } from 'vs/bAse/common/chArCode';
import * As strings from 'vs/bAse/common/strings';
import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommAnd, IEditOperAtionBuilder, ICursorStAteComputerDAtA } from 'vs/editor/common/editorCommon';
import { IIdentifiedSingleEditOperAtion, ITextModel } from 'vs/editor/common/model';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { BlockCommentCommAnd } from 'vs/editor/contrib/comment/blockCommentCommAnd';
import { ConstAnts } from 'vs/bAse/common/uint';

export interfAce IInsertionPoint {
	ignore: booleAn;
	commentStrOffset: number;
}

export interfAce ILinePreflightDAtA {
	ignore: booleAn;
	commentStr: string;
	commentStrOffset: number;
	commentStrLength: number;
}

export interfAce IPreflightDAtASupported {
	supported: true;
	shouldRemoveComments: booleAn;
	lines: ILinePreflightDAtA[];
}
export interfAce IPreflightDAtAUnsupported {
	supported: fAlse;
}
export type IPreflightDAtA = IPreflightDAtASupported | IPreflightDAtAUnsupported;

export interfAce ISimpleModel {
	getLineContent(lineNumber: number): string;
}

export const enum Type {
	Toggle = 0,
	ForceAdd = 1,
	ForceRemove = 2
}

export clAss LineCommentCommAnd implements ICommAnd {

	privAte reAdonly _selection: Selection;
	privAte reAdonly _tAbSize: number;
	privAte reAdonly _type: Type;
	privAte reAdonly _insertSpAce: booleAn;
	privAte reAdonly _ignoreEmptyLines: booleAn;
	privAte _selectionId: string | null;
	privAte _deltAColumn: number;
	privAte _moveEndPositionDown: booleAn;

	constructor(
		selection: Selection,
		tAbSize: number,
		type: Type,
		insertSpAce: booleAn,
		ignoreEmptyLines: booleAn
	) {
		this._selection = selection;
		this._tAbSize = tAbSize;
		this._type = type;
		this._insertSpAce = insertSpAce;
		this._selectionId = null;
		this._deltAColumn = 0;
		this._moveEndPositionDown = fAlse;
		this._ignoreEmptyLines = ignoreEmptyLines;
	}

	/**
	 * Do An initiAl pAss over the lines And gAther info About the line comment string.
	 * Returns null if Any of the lines doesn't support A line comment string.
	 */
	public stAtic _gAtherPreflightCommentStrings(model: ITextModel, stArtLineNumber: number, endLineNumber: number): ILinePreflightDAtA[] | null {

		model.tokenizeIfCheAp(stArtLineNumber);
		const lAnguAgeId = model.getLAnguAgeIdAtPosition(stArtLineNumber, 1);

		const config = LAnguAgeConfigurAtionRegistry.getComments(lAnguAgeId);
		const commentStr = (config ? config.lineCommentToken : null);
		if (!commentStr) {
			// Mode does not support line comments
			return null;
		}

		let lines: ILinePreflightDAtA[] = [];
		for (let i = 0, lineCount = endLineNumber - stArtLineNumber + 1; i < lineCount; i++) {
			lines[i] = {
				ignore: fAlse,
				commentStr: commentStr,
				commentStrOffset: 0,
				commentStrLength: commentStr.length
			};
		}

		return lines;
	}

	/**
	 * AnAlyze lines And decide which lines Are relevAnt And whAt the toggle should do.
	 * Also, build up severAl offsets And lengths useful in the generAtion of editor operAtions.
	 */
	public stAtic _AnAlyzeLines(type: Type, insertSpAce: booleAn, model: ISimpleModel, lines: ILinePreflightDAtA[], stArtLineNumber: number, ignoreEmptyLines: booleAn): IPreflightDAtA {
		let onlyWhitespAceLines = true;

		let shouldRemoveComments: booleAn;
		if (type === Type.Toggle) {
			shouldRemoveComments = true;
		} else if (type === Type.ForceAdd) {
			shouldRemoveComments = fAlse;
		} else {
			shouldRemoveComments = true;
		}

		for (let i = 0, lineCount = lines.length; i < lineCount; i++) {
			const lineDAtA = lines[i];
			const lineNumber = stArtLineNumber + i;

			const lineContent = model.getLineContent(lineNumber);
			const lineContentStArtOffset = strings.firstNonWhitespAceIndex(lineContent);

			if (lineContentStArtOffset === -1) {
				// Empty or whitespAce only line
				lineDAtA.ignore = ignoreEmptyLines;
				lineDAtA.commentStrOffset = lineContent.length;
				continue;
			}

			onlyWhitespAceLines = fAlse;
			lineDAtA.ignore = fAlse;
			lineDAtA.commentStrOffset = lineContentStArtOffset;

			if (shouldRemoveComments && !BlockCommentCommAnd._hAystAckHAsNeedleAtOffset(lineContent, lineDAtA.commentStr, lineContentStArtOffset)) {
				if (type === Type.Toggle) {
					// Every line so fAr hAs been A line comment, but this one is not
					shouldRemoveComments = fAlse;
				} else if (type === Type.ForceAdd) {
					// Will not hAppen
				} else {
					lineDAtA.ignore = true;
				}
			}

			if (shouldRemoveComments && insertSpAce) {
				// Remove A following spAce if present
				const commentStrEndOffset = lineContentStArtOffset + lineDAtA.commentStrLength;
				if (commentStrEndOffset < lineContent.length && lineContent.chArCodeAt(commentStrEndOffset) === ChArCode.SpAce) {
					lineDAtA.commentStrLength += 1;
				}
			}
		}

		if (type === Type.Toggle && onlyWhitespAceLines) {
			// For only whitespAce lines, we insert comments
			shouldRemoveComments = fAlse;

			// Also, no longer ignore them
			for (let i = 0, lineCount = lines.length; i < lineCount; i++) {
				lines[i].ignore = fAlse;
			}
		}

		return {
			supported: true,
			shouldRemoveComments: shouldRemoveComments,
			lines: lines
		};
	}

	/**
	 * AnAlyze All lines And decide exActly whAt to do => not supported | insert line comments | remove line comments
	 */
	public stAtic _gAtherPreflightDAtA(type: Type, insertSpAce: booleAn, model: ITextModel, stArtLineNumber: number, endLineNumber: number, ignoreEmptyLines: booleAn): IPreflightDAtA {
		const lines = LineCommentCommAnd._gAtherPreflightCommentStrings(model, stArtLineNumber, endLineNumber);
		if (lines === null) {
			return {
				supported: fAlse
			};
		}

		return LineCommentCommAnd._AnAlyzeLines(type, insertSpAce, model, lines, stArtLineNumber, ignoreEmptyLines);
	}

	/**
	 * Given A successful AnAlysis, execute either insert line comments, either remove line comments
	 */
	privAte _executeLineComments(model: ISimpleModel, builder: IEditOperAtionBuilder, dAtA: IPreflightDAtASupported, s: Selection): void {

		let ops: IIdentifiedSingleEditOperAtion[];

		if (dAtA.shouldRemoveComments) {
			ops = LineCommentCommAnd._creAteRemoveLineCommentsOperAtions(dAtA.lines, s.stArtLineNumber);
		} else {
			LineCommentCommAnd._normAlizeInsertionPoint(model, dAtA.lines, s.stArtLineNumber, this._tAbSize);
			ops = this._creAteAddLineCommentsOperAtions(dAtA.lines, s.stArtLineNumber);
		}

		const cursorPosition = new Position(s.positionLineNumber, s.positionColumn);

		for (let i = 0, len = ops.length; i < len; i++) {
			builder.AddEditOperAtion(ops[i].rAnge, ops[i].text);
			if (RAnge.isEmpty(ops[i].rAnge) && RAnge.getStArtPosition(ops[i].rAnge).equAls(cursorPosition)) {
				const lineContent = model.getLineContent(cursorPosition.lineNumber);
				if (lineContent.length + 1 === cursorPosition.column) {
					this._deltAColumn = (ops[i].text || '').length;
				}
			}
		}

		this._selectionId = builder.trAckSelection(s);
	}

	privAte _AttemptRemoveBlockComment(model: ITextModel, s: Selection, stArtToken: string, endToken: string): IIdentifiedSingleEditOperAtion[] | null {
		let stArtLineNumber = s.stArtLineNumber;
		let endLineNumber = s.endLineNumber;

		let stArtTokenAllowedBeforeColumn = endToken.length + MAth.mAx(
			model.getLineFirstNonWhitespAceColumn(s.stArtLineNumber),
			s.stArtColumn
		);

		let stArtTokenIndex = model.getLineContent(stArtLineNumber).lAstIndexOf(stArtToken, stArtTokenAllowedBeforeColumn - 1);
		let endTokenIndex = model.getLineContent(endLineNumber).indexOf(endToken, s.endColumn - 1 - stArtToken.length);

		if (stArtTokenIndex !== -1 && endTokenIndex === -1) {
			endTokenIndex = model.getLineContent(stArtLineNumber).indexOf(endToken, stArtTokenIndex + stArtToken.length);
			endLineNumber = stArtLineNumber;
		}

		if (stArtTokenIndex === -1 && endTokenIndex !== -1) {
			stArtTokenIndex = model.getLineContent(endLineNumber).lAstIndexOf(stArtToken, endTokenIndex);
			stArtLineNumber = endLineNumber;
		}

		if (s.isEmpty() && (stArtTokenIndex === -1 || endTokenIndex === -1)) {
			stArtTokenIndex = model.getLineContent(stArtLineNumber).indexOf(stArtToken);
			if (stArtTokenIndex !== -1) {
				endTokenIndex = model.getLineContent(stArtLineNumber).indexOf(endToken, stArtTokenIndex + stArtToken.length);
			}
		}

		// We hAve to Adjust to possible inner white spAce.
		// For SpAce After stArtToken, Add SpAce to stArtToken - rAnge mAth will work out.
		if (stArtTokenIndex !== -1 && model.getLineContent(stArtLineNumber).chArCodeAt(stArtTokenIndex + stArtToken.length) === ChArCode.SpAce) {
			stArtToken += ' ';
		}

		// For SpAce before endToken, Add SpAce before endToken And shift index one left.
		if (endTokenIndex !== -1 && model.getLineContent(endLineNumber).chArCodeAt(endTokenIndex - 1) === ChArCode.SpAce) {
			endToken = ' ' + endToken;
			endTokenIndex -= 1;
		}

		if (stArtTokenIndex !== -1 && endTokenIndex !== -1) {
			return BlockCommentCommAnd._creAteRemoveBlockCommentOperAtions(
				new RAnge(stArtLineNumber, stArtTokenIndex + stArtToken.length + 1, endLineNumber, endTokenIndex + 1), stArtToken, endToken
			);
		}

		return null;
	}

	/**
	 * Given An unsuccessful AnAlysis, delegAte to the block comment commAnd
	 */
	privAte _executeBlockComment(model: ITextModel, builder: IEditOperAtionBuilder, s: Selection): void {
		model.tokenizeIfCheAp(s.stArtLineNumber);
		let lAnguAgeId = model.getLAnguAgeIdAtPosition(s.stArtLineNumber, 1);
		let config = LAnguAgeConfigurAtionRegistry.getComments(lAnguAgeId);
		if (!config || !config.blockCommentStArtToken || !config.blockCommentEndToken) {
			// Mode does not support block comments
			return;
		}

		const stArtToken = config.blockCommentStArtToken;
		const endToken = config.blockCommentEndToken;

		let ops = this._AttemptRemoveBlockComment(model, s, stArtToken, endToken);
		if (!ops) {
			if (s.isEmpty()) {
				const lineContent = model.getLineContent(s.stArtLineNumber);
				let firstNonWhitespAceIndex = strings.firstNonWhitespAceIndex(lineContent);
				if (firstNonWhitespAceIndex === -1) {
					// Line is empty or contAins only whitespAce
					firstNonWhitespAceIndex = lineContent.length;
				}
				ops = BlockCommentCommAnd._creAteAddBlockCommentOperAtions(
					new RAnge(s.stArtLineNumber, firstNonWhitespAceIndex + 1, s.stArtLineNumber, lineContent.length + 1),
					stArtToken,
					endToken,
					this._insertSpAce
				);
			} else {
				ops = BlockCommentCommAnd._creAteAddBlockCommentOperAtions(
					new RAnge(s.stArtLineNumber, model.getLineFirstNonWhitespAceColumn(s.stArtLineNumber), s.endLineNumber, model.getLineMAxColumn(s.endLineNumber)),
					stArtToken,
					endToken,
					this._insertSpAce
				);
			}

			if (ops.length === 1) {
				// LeAve cursor After token And SpAce
				this._deltAColumn = stArtToken.length + 1;
			}
		}
		this._selectionId = builder.trAckSelection(s);
		for (const op of ops) {
			builder.AddEditOperAtion(op.rAnge, op.text);
		}
	}

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {

		let s = this._selection;
		this._moveEndPositionDown = fAlse;

		if (s.stArtLineNumber < s.endLineNumber && s.endColumn === 1) {
			this._moveEndPositionDown = true;
			s = s.setEndPosition(s.endLineNumber - 1, model.getLineMAxColumn(s.endLineNumber - 1));
		}

		const dAtA = LineCommentCommAnd._gAtherPreflightDAtA(
			this._type,
			this._insertSpAce,
			model,
			s.stArtLineNumber,
			s.endLineNumber,
			this._ignoreEmptyLines
		);

		if (dAtA.supported) {
			return this._executeLineComments(model, builder, dAtA, s);
		}

		return this._executeBlockComment(model, builder, s);
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		let result = helper.getTrAckedSelection(this._selectionId!);

		if (this._moveEndPositionDown) {
			result = result.setEndPosition(result.endLineNumber + 1, 1);
		}

		return new Selection(
			result.selectionStArtLineNumber,
			result.selectionStArtColumn + this._deltAColumn,
			result.positionLineNumber,
			result.positionColumn + this._deltAColumn
		);
	}

	/**
	 * GenerAte edit operAtions in the remove line comment cAse
	 */
	public stAtic _creAteRemoveLineCommentsOperAtions(lines: ILinePreflightDAtA[], stArtLineNumber: number): IIdentifiedSingleEditOperAtion[] {
		let res: IIdentifiedSingleEditOperAtion[] = [];

		for (let i = 0, len = lines.length; i < len; i++) {
			const lineDAtA = lines[i];

			if (lineDAtA.ignore) {
				continue;
			}

			res.push(EditOperAtion.delete(new RAnge(
				stArtLineNumber + i, lineDAtA.commentStrOffset + 1,
				stArtLineNumber + i, lineDAtA.commentStrOffset + lineDAtA.commentStrLength + 1
			)));
		}

		return res;
	}

	/**
	 * GenerAte edit operAtions in the Add line comment cAse
	 */
	privAte _creAteAddLineCommentsOperAtions(lines: ILinePreflightDAtA[], stArtLineNumber: number): IIdentifiedSingleEditOperAtion[] {
		let res: IIdentifiedSingleEditOperAtion[] = [];
		const AfterCommentStr = this._insertSpAce ? ' ' : '';


		for (let i = 0, len = lines.length; i < len; i++) {
			const lineDAtA = lines[i];

			if (lineDAtA.ignore) {
				continue;
			}

			res.push(EditOperAtion.insert(new Position(stArtLineNumber + i, lineDAtA.commentStrOffset + 1), lineDAtA.commentStr + AfterCommentStr));
		}

		return res;
	}

	privAte stAtic nextVisibleColumn(currentVisibleColumn: number, tAbSize: number, isTAb: booleAn, columnSize: number): number {
		if (isTAb) {
			return currentVisibleColumn + (tAbSize - (currentVisibleColumn % tAbSize));
		}
		return currentVisibleColumn + columnSize;
	}

	/**
	 * Adjust insertion points to hAve them verticAlly Aligned in the Add line comment cAse
	 */
	public stAtic _normAlizeInsertionPoint(model: ISimpleModel, lines: IInsertionPoint[], stArtLineNumber: number, tAbSize: number): void {
		let minVisibleColumn = ConstAnts.MAX_SAFE_SMALL_INTEGER;
		let j: number;
		let lenJ: number;

		for (let i = 0, len = lines.length; i < len; i++) {
			if (lines[i].ignore) {
				continue;
			}

			const lineContent = model.getLineContent(stArtLineNumber + i);

			let currentVisibleColumn = 0;
			for (let j = 0, lenJ = lines[i].commentStrOffset; currentVisibleColumn < minVisibleColumn && j < lenJ; j++) {
				currentVisibleColumn = LineCommentCommAnd.nextVisibleColumn(currentVisibleColumn, tAbSize, lineContent.chArCodeAt(j) === ChArCode.TAb, 1);
			}

			if (currentVisibleColumn < minVisibleColumn) {
				minVisibleColumn = currentVisibleColumn;
			}
		}

		minVisibleColumn = MAth.floor(minVisibleColumn / tAbSize) * tAbSize;

		for (let i = 0, len = lines.length; i < len; i++) {
			if (lines[i].ignore) {
				continue;
			}

			const lineContent = model.getLineContent(stArtLineNumber + i);

			let currentVisibleColumn = 0;
			for (j = 0, lenJ = lines[i].commentStrOffset; currentVisibleColumn < minVisibleColumn && j < lenJ; j++) {
				currentVisibleColumn = LineCommentCommAnd.nextVisibleColumn(currentVisibleColumn, tAbSize, lineContent.chArCodeAt(j) === ChArCode.TAb, 1);
			}

			if (currentVisibleColumn > minVisibleColumn) {
				lines[i].commentStrOffset = j - 1;
			} else {
				lines[i].commentStrOffset = j;
			}
		}
	}
}
