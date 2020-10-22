/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/Base/common/charCode';
import { EditOperation } from 'vs/editor/common/core/editOperation';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommand, IEditOperationBuilder, ICursorStateComputerData } from 'vs/editor/common/editorCommon';
import { ITextModel, IIdentifiedSingleEditOperation } from 'vs/editor/common/model';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';

export class BlockCommentCommand implements ICommand {

	private readonly _selection: Selection;
	private readonly _insertSpace: Boolean;
	private _usedEndToken: string | null;

	constructor(selection: Selection, insertSpace: Boolean) {
		this._selection = selection;
		this._insertSpace = insertSpace;
		this._usedEndToken = null;
	}

	puBlic static _haystackHasNeedleAtOffset(haystack: string, needle: string, offset: numBer): Boolean {
		if (offset < 0) {
			return false;
		}
		const needleLength = needle.length;
		const haystackLength = haystack.length;
		if (offset + needleLength > haystackLength) {
			return false;
		}

		for (let i = 0; i < needleLength; i++) {
			const codeA = haystack.charCodeAt(offset + i);
			const codeB = needle.charCodeAt(i);

			if (codeA === codeB) {
				continue;
			}
			if (codeA >= CharCode.A && codeA <= CharCode.Z && codeA + 32 === codeB) {
				// codeA is upper-case variant of codeB
				continue;
			}
			if (codeB >= CharCode.A && codeB <= CharCode.Z && codeB + 32 === codeA) {
				// codeB is upper-case variant of codeA
				continue;
			}

			return false;
		}
		return true;
	}

	private _createOperationsForBlockComment(selection: Range, startToken: string, endToken: string, insertSpace: Boolean, model: ITextModel, Builder: IEditOperationBuilder): void {
		const startLineNumBer = selection.startLineNumBer;
		const startColumn = selection.startColumn;
		const endLineNumBer = selection.endLineNumBer;
		const endColumn = selection.endColumn;

		const startLineText = model.getLineContent(startLineNumBer);
		const endLineText = model.getLineContent(endLineNumBer);

		let startTokenIndex = startLineText.lastIndexOf(startToken, startColumn - 1 + startToken.length);
		let endTokenIndex = endLineText.indexOf(endToken, endColumn - 1 - endToken.length);

		if (startTokenIndex !== -1 && endTokenIndex !== -1) {

			if (startLineNumBer === endLineNumBer) {
				const lineBetweenTokens = startLineText.suBstring(startTokenIndex + startToken.length, endTokenIndex);

				if (lineBetweenTokens.indexOf(endToken) >= 0) {
					// force to add a Block comment
					startTokenIndex = -1;
					endTokenIndex = -1;
				}
			} else {
				const startLineAfterStartToken = startLineText.suBstring(startTokenIndex + startToken.length);
				const endLineBeforeEndToken = endLineText.suBstring(0, endTokenIndex);

				if (startLineAfterStartToken.indexOf(endToken) >= 0 || endLineBeforeEndToken.indexOf(endToken) >= 0) {
					// force to add a Block comment
					startTokenIndex = -1;
					endTokenIndex = -1;
				}
			}
		}

		let ops: IIdentifiedSingleEditOperation[];

		if (startTokenIndex !== -1 && endTokenIndex !== -1) {
			// Consider spaces as part of the comment tokens
			if (insertSpace && startTokenIndex + startToken.length < startLineText.length && startLineText.charCodeAt(startTokenIndex + startToken.length) === CharCode.Space) {
				// Pretend the start token contains a trailing space
				startToken = startToken + ' ';
			}

			if (insertSpace && endTokenIndex > 0 && endLineText.charCodeAt(endTokenIndex - 1) === CharCode.Space) {
				// Pretend the end token contains a leading space
				endToken = ' ' + endToken;
				endTokenIndex -= 1;
			}
			ops = BlockCommentCommand._createRemoveBlockCommentOperations(
				new Range(startLineNumBer, startTokenIndex + startToken.length + 1, endLineNumBer, endTokenIndex + 1), startToken, endToken
			);
		} else {
			ops = BlockCommentCommand._createAddBlockCommentOperations(selection, startToken, endToken, this._insertSpace);
			this._usedEndToken = ops.length === 1 ? endToken : null;
		}

		for (const op of ops) {
			Builder.addTrackedEditOperation(op.range, op.text);
		}
	}

	puBlic static _createRemoveBlockCommentOperations(r: Range, startToken: string, endToken: string): IIdentifiedSingleEditOperation[] {
		let res: IIdentifiedSingleEditOperation[] = [];

		if (!Range.isEmpty(r)) {
			// Remove Block comment start
			res.push(EditOperation.delete(new Range(
				r.startLineNumBer, r.startColumn - startToken.length,
				r.startLineNumBer, r.startColumn
			)));

			// Remove Block comment end
			res.push(EditOperation.delete(new Range(
				r.endLineNumBer, r.endColumn,
				r.endLineNumBer, r.endColumn + endToken.length
			)));
		} else {
			// Remove Both continuously
			res.push(EditOperation.delete(new Range(
				r.startLineNumBer, r.startColumn - startToken.length,
				r.endLineNumBer, r.endColumn + endToken.length
			)));
		}

		return res;
	}

	puBlic static _createAddBlockCommentOperations(r: Range, startToken: string, endToken: string, insertSpace: Boolean): IIdentifiedSingleEditOperation[] {
		let res: IIdentifiedSingleEditOperation[] = [];

		if (!Range.isEmpty(r)) {
			// Insert Block comment start
			res.push(EditOperation.insert(new Position(r.startLineNumBer, r.startColumn), startToken + (insertSpace ? ' ' : '')));

			// Insert Block comment end
			res.push(EditOperation.insert(new Position(r.endLineNumBer, r.endColumn), (insertSpace ? ' ' : '') + endToken));
		} else {
			// Insert Both continuously
			res.push(EditOperation.replace(new Range(
				r.startLineNumBer, r.startColumn,
				r.endLineNumBer, r.endColumn
			), startToken + '  ' + endToken));
		}

		return res;
	}

	puBlic getEditOperations(model: ITextModel, Builder: IEditOperationBuilder): void {
		const startLineNumBer = this._selection.startLineNumBer;
		const startColumn = this._selection.startColumn;

		model.tokenizeIfCheap(startLineNumBer);
		const languageId = model.getLanguageIdAtPosition(startLineNumBer, startColumn);
		const config = LanguageConfigurationRegistry.getComments(languageId);
		if (!config || !config.BlockCommentStartToken || !config.BlockCommentEndToken) {
			// Mode does not support Block comments
			return;
		}

		this._createOperationsForBlockComment(this._selection, config.BlockCommentStartToken, config.BlockCommentEndToken, this._insertSpace, model, Builder);
	}

	puBlic computeCursorState(model: ITextModel, helper: ICursorStateComputerData): Selection {
		const inverseEditOperations = helper.getInverseEditOperations();
		if (inverseEditOperations.length === 2) {
			const startTokenEditOperation = inverseEditOperations[0];
			const endTokenEditOperation = inverseEditOperations[1];

			return new Selection(
				startTokenEditOperation.range.endLineNumBer,
				startTokenEditOperation.range.endColumn,
				endTokenEditOperation.range.startLineNumBer,
				endTokenEditOperation.range.startColumn
			);
		} else {
			const srcRange = inverseEditOperations[0].range;
			const deltaColumn = this._usedEndToken ? -this._usedEndToken.length - 1 : 0; // minus 1 space Before endToken
			return new Selection(
				srcRange.endLineNumBer,
				srcRange.endColumn + deltaColumn,
				srcRange.endLineNumBer,
				srcRange.endColumn + deltaColumn
			);
		}
	}
}
