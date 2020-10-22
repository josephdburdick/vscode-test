/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/Base/common/charCode';
import * as strings from 'vs/Base/common/strings';
import { EditOperation } from 'vs/editor/common/core/editOperation';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommand, IEditOperationBuilder, ICursorStateComputerData } from 'vs/editor/common/editorCommon';
import { IIdentifiedSingleEditOperation, ITextModel } from 'vs/editor/common/model';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { BlockCommentCommand } from 'vs/editor/contriB/comment/BlockCommentCommand';
import { Constants } from 'vs/Base/common/uint';

export interface IInsertionPoint {
	ignore: Boolean;
	commentStrOffset: numBer;
}

export interface ILinePreflightData {
	ignore: Boolean;
	commentStr: string;
	commentStrOffset: numBer;
	commentStrLength: numBer;
}

export interface IPreflightDataSupported {
	supported: true;
	shouldRemoveComments: Boolean;
	lines: ILinePreflightData[];
}
export interface IPreflightDataUnsupported {
	supported: false;
}
export type IPreflightData = IPreflightDataSupported | IPreflightDataUnsupported;

export interface ISimpleModel {
	getLineContent(lineNumBer: numBer): string;
}

export const enum Type {
	Toggle = 0,
	ForceAdd = 1,
	ForceRemove = 2
}

export class LineCommentCommand implements ICommand {

	private readonly _selection: Selection;
	private readonly _taBSize: numBer;
	private readonly _type: Type;
	private readonly _insertSpace: Boolean;
	private readonly _ignoreEmptyLines: Boolean;
	private _selectionId: string | null;
	private _deltaColumn: numBer;
	private _moveEndPositionDown: Boolean;

	constructor(
		selection: Selection,
		taBSize: numBer,
		type: Type,
		insertSpace: Boolean,
		ignoreEmptyLines: Boolean
	) {
		this._selection = selection;
		this._taBSize = taBSize;
		this._type = type;
		this._insertSpace = insertSpace;
		this._selectionId = null;
		this._deltaColumn = 0;
		this._moveEndPositionDown = false;
		this._ignoreEmptyLines = ignoreEmptyLines;
	}

	/**
	 * Do an initial pass over the lines and gather info aBout the line comment string.
	 * Returns null if any of the lines doesn't support a line comment string.
	 */
	puBlic static _gatherPreflightCommentStrings(model: ITextModel, startLineNumBer: numBer, endLineNumBer: numBer): ILinePreflightData[] | null {

		model.tokenizeIfCheap(startLineNumBer);
		const languageId = model.getLanguageIdAtPosition(startLineNumBer, 1);

		const config = LanguageConfigurationRegistry.getComments(languageId);
		const commentStr = (config ? config.lineCommentToken : null);
		if (!commentStr) {
			// Mode does not support line comments
			return null;
		}

		let lines: ILinePreflightData[] = [];
		for (let i = 0, lineCount = endLineNumBer - startLineNumBer + 1; i < lineCount; i++) {
			lines[i] = {
				ignore: false,
				commentStr: commentStr,
				commentStrOffset: 0,
				commentStrLength: commentStr.length
			};
		}

		return lines;
	}

	/**
	 * Analyze lines and decide which lines are relevant and what the toggle should do.
	 * Also, Build up several offsets and lengths useful in the generation of editor operations.
	 */
	puBlic static _analyzeLines(type: Type, insertSpace: Boolean, model: ISimpleModel, lines: ILinePreflightData[], startLineNumBer: numBer, ignoreEmptyLines: Boolean): IPreflightData {
		let onlyWhitespaceLines = true;

		let shouldRemoveComments: Boolean;
		if (type === Type.Toggle) {
			shouldRemoveComments = true;
		} else if (type === Type.ForceAdd) {
			shouldRemoveComments = false;
		} else {
			shouldRemoveComments = true;
		}

		for (let i = 0, lineCount = lines.length; i < lineCount; i++) {
			const lineData = lines[i];
			const lineNumBer = startLineNumBer + i;

			const lineContent = model.getLineContent(lineNumBer);
			const lineContentStartOffset = strings.firstNonWhitespaceIndex(lineContent);

			if (lineContentStartOffset === -1) {
				// Empty or whitespace only line
				lineData.ignore = ignoreEmptyLines;
				lineData.commentStrOffset = lineContent.length;
				continue;
			}

			onlyWhitespaceLines = false;
			lineData.ignore = false;
			lineData.commentStrOffset = lineContentStartOffset;

			if (shouldRemoveComments && !BlockCommentCommand._haystackHasNeedleAtOffset(lineContent, lineData.commentStr, lineContentStartOffset)) {
				if (type === Type.Toggle) {
					// Every line so far has Been a line comment, But this one is not
					shouldRemoveComments = false;
				} else if (type === Type.ForceAdd) {
					// Will not happen
				} else {
					lineData.ignore = true;
				}
			}

			if (shouldRemoveComments && insertSpace) {
				// Remove a following space if present
				const commentStrEndOffset = lineContentStartOffset + lineData.commentStrLength;
				if (commentStrEndOffset < lineContent.length && lineContent.charCodeAt(commentStrEndOffset) === CharCode.Space) {
					lineData.commentStrLength += 1;
				}
			}
		}

		if (type === Type.Toggle && onlyWhitespaceLines) {
			// For only whitespace lines, we insert comments
			shouldRemoveComments = false;

			// Also, no longer ignore them
			for (let i = 0, lineCount = lines.length; i < lineCount; i++) {
				lines[i].ignore = false;
			}
		}

		return {
			supported: true,
			shouldRemoveComments: shouldRemoveComments,
			lines: lines
		};
	}

	/**
	 * Analyze all lines and decide exactly what to do => not supported | insert line comments | remove line comments
	 */
	puBlic static _gatherPreflightData(type: Type, insertSpace: Boolean, model: ITextModel, startLineNumBer: numBer, endLineNumBer: numBer, ignoreEmptyLines: Boolean): IPreflightData {
		const lines = LineCommentCommand._gatherPreflightCommentStrings(model, startLineNumBer, endLineNumBer);
		if (lines === null) {
			return {
				supported: false
			};
		}

		return LineCommentCommand._analyzeLines(type, insertSpace, model, lines, startLineNumBer, ignoreEmptyLines);
	}

	/**
	 * Given a successful analysis, execute either insert line comments, either remove line comments
	 */
	private _executeLineComments(model: ISimpleModel, Builder: IEditOperationBuilder, data: IPreflightDataSupported, s: Selection): void {

		let ops: IIdentifiedSingleEditOperation[];

		if (data.shouldRemoveComments) {
			ops = LineCommentCommand._createRemoveLineCommentsOperations(data.lines, s.startLineNumBer);
		} else {
			LineCommentCommand._normalizeInsertionPoint(model, data.lines, s.startLineNumBer, this._taBSize);
			ops = this._createAddLineCommentsOperations(data.lines, s.startLineNumBer);
		}

		const cursorPosition = new Position(s.positionLineNumBer, s.positionColumn);

		for (let i = 0, len = ops.length; i < len; i++) {
			Builder.addEditOperation(ops[i].range, ops[i].text);
			if (Range.isEmpty(ops[i].range) && Range.getStartPosition(ops[i].range).equals(cursorPosition)) {
				const lineContent = model.getLineContent(cursorPosition.lineNumBer);
				if (lineContent.length + 1 === cursorPosition.column) {
					this._deltaColumn = (ops[i].text || '').length;
				}
			}
		}

		this._selectionId = Builder.trackSelection(s);
	}

	private _attemptRemoveBlockComment(model: ITextModel, s: Selection, startToken: string, endToken: string): IIdentifiedSingleEditOperation[] | null {
		let startLineNumBer = s.startLineNumBer;
		let endLineNumBer = s.endLineNumBer;

		let startTokenAllowedBeforeColumn = endToken.length + Math.max(
			model.getLineFirstNonWhitespaceColumn(s.startLineNumBer),
			s.startColumn
		);

		let startTokenIndex = model.getLineContent(startLineNumBer).lastIndexOf(startToken, startTokenAllowedBeforeColumn - 1);
		let endTokenIndex = model.getLineContent(endLineNumBer).indexOf(endToken, s.endColumn - 1 - startToken.length);

		if (startTokenIndex !== -1 && endTokenIndex === -1) {
			endTokenIndex = model.getLineContent(startLineNumBer).indexOf(endToken, startTokenIndex + startToken.length);
			endLineNumBer = startLineNumBer;
		}

		if (startTokenIndex === -1 && endTokenIndex !== -1) {
			startTokenIndex = model.getLineContent(endLineNumBer).lastIndexOf(startToken, endTokenIndex);
			startLineNumBer = endLineNumBer;
		}

		if (s.isEmpty() && (startTokenIndex === -1 || endTokenIndex === -1)) {
			startTokenIndex = model.getLineContent(startLineNumBer).indexOf(startToken);
			if (startTokenIndex !== -1) {
				endTokenIndex = model.getLineContent(startLineNumBer).indexOf(endToken, startTokenIndex + startToken.length);
			}
		}

		// We have to adjust to possiBle inner white space.
		// For Space after startToken, add Space to startToken - range math will work out.
		if (startTokenIndex !== -1 && model.getLineContent(startLineNumBer).charCodeAt(startTokenIndex + startToken.length) === CharCode.Space) {
			startToken += ' ';
		}

		// For Space Before endToken, add Space Before endToken and shift index one left.
		if (endTokenIndex !== -1 && model.getLineContent(endLineNumBer).charCodeAt(endTokenIndex - 1) === CharCode.Space) {
			endToken = ' ' + endToken;
			endTokenIndex -= 1;
		}

		if (startTokenIndex !== -1 && endTokenIndex !== -1) {
			return BlockCommentCommand._createRemoveBlockCommentOperations(
				new Range(startLineNumBer, startTokenIndex + startToken.length + 1, endLineNumBer, endTokenIndex + 1), startToken, endToken
			);
		}

		return null;
	}

	/**
	 * Given an unsuccessful analysis, delegate to the Block comment command
	 */
	private _executeBlockComment(model: ITextModel, Builder: IEditOperationBuilder, s: Selection): void {
		model.tokenizeIfCheap(s.startLineNumBer);
		let languageId = model.getLanguageIdAtPosition(s.startLineNumBer, 1);
		let config = LanguageConfigurationRegistry.getComments(languageId);
		if (!config || !config.BlockCommentStartToken || !config.BlockCommentEndToken) {
			// Mode does not support Block comments
			return;
		}

		const startToken = config.BlockCommentStartToken;
		const endToken = config.BlockCommentEndToken;

		let ops = this._attemptRemoveBlockComment(model, s, startToken, endToken);
		if (!ops) {
			if (s.isEmpty()) {
				const lineContent = model.getLineContent(s.startLineNumBer);
				let firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineContent);
				if (firstNonWhitespaceIndex === -1) {
					// Line is empty or contains only whitespace
					firstNonWhitespaceIndex = lineContent.length;
				}
				ops = BlockCommentCommand._createAddBlockCommentOperations(
					new Range(s.startLineNumBer, firstNonWhitespaceIndex + 1, s.startLineNumBer, lineContent.length + 1),
					startToken,
					endToken,
					this._insertSpace
				);
			} else {
				ops = BlockCommentCommand._createAddBlockCommentOperations(
					new Range(s.startLineNumBer, model.getLineFirstNonWhitespaceColumn(s.startLineNumBer), s.endLineNumBer, model.getLineMaxColumn(s.endLineNumBer)),
					startToken,
					endToken,
					this._insertSpace
				);
			}

			if (ops.length === 1) {
				// Leave cursor after token and Space
				this._deltaColumn = startToken.length + 1;
			}
		}
		this._selectionId = Builder.trackSelection(s);
		for (const op of ops) {
			Builder.addEditOperation(op.range, op.text);
		}
	}

	puBlic getEditOperations(model: ITextModel, Builder: IEditOperationBuilder): void {

		let s = this._selection;
		this._moveEndPositionDown = false;

		if (s.startLineNumBer < s.endLineNumBer && s.endColumn === 1) {
			this._moveEndPositionDown = true;
			s = s.setEndPosition(s.endLineNumBer - 1, model.getLineMaxColumn(s.endLineNumBer - 1));
		}

		const data = LineCommentCommand._gatherPreflightData(
			this._type,
			this._insertSpace,
			model,
			s.startLineNumBer,
			s.endLineNumBer,
			this._ignoreEmptyLines
		);

		if (data.supported) {
			return this._executeLineComments(model, Builder, data, s);
		}

		return this._executeBlockComment(model, Builder, s);
	}

	puBlic computeCursorState(model: ITextModel, helper: ICursorStateComputerData): Selection {
		let result = helper.getTrackedSelection(this._selectionId!);

		if (this._moveEndPositionDown) {
			result = result.setEndPosition(result.endLineNumBer + 1, 1);
		}

		return new Selection(
			result.selectionStartLineNumBer,
			result.selectionStartColumn + this._deltaColumn,
			result.positionLineNumBer,
			result.positionColumn + this._deltaColumn
		);
	}

	/**
	 * Generate edit operations in the remove line comment case
	 */
	puBlic static _createRemoveLineCommentsOperations(lines: ILinePreflightData[], startLineNumBer: numBer): IIdentifiedSingleEditOperation[] {
		let res: IIdentifiedSingleEditOperation[] = [];

		for (let i = 0, len = lines.length; i < len; i++) {
			const lineData = lines[i];

			if (lineData.ignore) {
				continue;
			}

			res.push(EditOperation.delete(new Range(
				startLineNumBer + i, lineData.commentStrOffset + 1,
				startLineNumBer + i, lineData.commentStrOffset + lineData.commentStrLength + 1
			)));
		}

		return res;
	}

	/**
	 * Generate edit operations in the add line comment case
	 */
	private _createAddLineCommentsOperations(lines: ILinePreflightData[], startLineNumBer: numBer): IIdentifiedSingleEditOperation[] {
		let res: IIdentifiedSingleEditOperation[] = [];
		const afterCommentStr = this._insertSpace ? ' ' : '';


		for (let i = 0, len = lines.length; i < len; i++) {
			const lineData = lines[i];

			if (lineData.ignore) {
				continue;
			}

			res.push(EditOperation.insert(new Position(startLineNumBer + i, lineData.commentStrOffset + 1), lineData.commentStr + afterCommentStr));
		}

		return res;
	}

	private static nextVisiBleColumn(currentVisiBleColumn: numBer, taBSize: numBer, isTaB: Boolean, columnSize: numBer): numBer {
		if (isTaB) {
			return currentVisiBleColumn + (taBSize - (currentVisiBleColumn % taBSize));
		}
		return currentVisiBleColumn + columnSize;
	}

	/**
	 * Adjust insertion points to have them vertically aligned in the add line comment case
	 */
	puBlic static _normalizeInsertionPoint(model: ISimpleModel, lines: IInsertionPoint[], startLineNumBer: numBer, taBSize: numBer): void {
		let minVisiBleColumn = Constants.MAX_SAFE_SMALL_INTEGER;
		let j: numBer;
		let lenJ: numBer;

		for (let i = 0, len = lines.length; i < len; i++) {
			if (lines[i].ignore) {
				continue;
			}

			const lineContent = model.getLineContent(startLineNumBer + i);

			let currentVisiBleColumn = 0;
			for (let j = 0, lenJ = lines[i].commentStrOffset; currentVisiBleColumn < minVisiBleColumn && j < lenJ; j++) {
				currentVisiBleColumn = LineCommentCommand.nextVisiBleColumn(currentVisiBleColumn, taBSize, lineContent.charCodeAt(j) === CharCode.TaB, 1);
			}

			if (currentVisiBleColumn < minVisiBleColumn) {
				minVisiBleColumn = currentVisiBleColumn;
			}
		}

		minVisiBleColumn = Math.floor(minVisiBleColumn / taBSize) * taBSize;

		for (let i = 0, len = lines.length; i < len; i++) {
			if (lines[i].ignore) {
				continue;
			}

			const lineContent = model.getLineContent(startLineNumBer + i);

			let currentVisiBleColumn = 0;
			for (j = 0, lenJ = lines[i].commentStrOffset; currentVisiBleColumn < minVisiBleColumn && j < lenJ; j++) {
				currentVisiBleColumn = LineCommentCommand.nextVisiBleColumn(currentVisiBleColumn, taBSize, lineContent.charCodeAt(j) === CharCode.TaB, 1);
			}

			if (currentVisiBleColumn > minVisiBleColumn) {
				lines[i].commentStrOffset = j - 1;
			} else {
				lines[i].commentStrOffset = j;
			}
		}
	}
}
