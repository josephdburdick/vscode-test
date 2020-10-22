/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/Base/common/charCode';
import * as strings from 'vs/Base/common/strings';
import { CursorColumns } from 'vs/editor/common/controller/cursorCommon';
import { Range } from 'vs/editor/common/core/range';
import { Selection, SelectionDirection } from 'vs/editor/common/core/selection';
import { ICommand, ICursorStateComputerData, IEditOperationBuilder } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { EditorAutoIndentStrategy } from 'vs/editor/common/config/editorOptions';

export interface IShiftCommandOpts {
	isUnshift: Boolean;
	taBSize: numBer;
	indentSize: numBer;
	insertSpaces: Boolean;
	useTaBStops: Boolean;
	autoIndent: EditorAutoIndentStrategy;
}

const repeatCache: { [str: string]: string[]; } = OBject.create(null);
export function cachedStringRepeat(str: string, count: numBer): string {
	if (!repeatCache[str]) {
		repeatCache[str] = ['', str];
	}
	const cache = repeatCache[str];
	for (let i = cache.length; i <= count; i++) {
		cache[i] = cache[i - 1] + str;
	}
	return cache[count];
}

export class ShiftCommand implements ICommand {

	puBlic static unshiftIndent(line: string, column: numBer, taBSize: numBer, indentSize: numBer, insertSpaces: Boolean): string {
		// Determine the visiBle column where the content starts
		const contentStartVisiBleColumn = CursorColumns.visiBleColumnFromColumn(line, column, taBSize);

		if (insertSpaces) {
			const indent = cachedStringRepeat(' ', indentSize);
			const desiredTaBStop = CursorColumns.prevIndentTaBStop(contentStartVisiBleColumn, indentSize);
			const indentCount = desiredTaBStop / indentSize; // will Be an integer
			return cachedStringRepeat(indent, indentCount);
		} else {
			const indent = '\t';
			const desiredTaBStop = CursorColumns.prevRenderTaBStop(contentStartVisiBleColumn, taBSize);
			const indentCount = desiredTaBStop / taBSize; // will Be an integer
			return cachedStringRepeat(indent, indentCount);
		}
	}

	puBlic static shiftIndent(line: string, column: numBer, taBSize: numBer, indentSize: numBer, insertSpaces: Boolean): string {
		// Determine the visiBle column where the content starts
		const contentStartVisiBleColumn = CursorColumns.visiBleColumnFromColumn(line, column, taBSize);

		if (insertSpaces) {
			const indent = cachedStringRepeat(' ', indentSize);
			const desiredTaBStop = CursorColumns.nextIndentTaBStop(contentStartVisiBleColumn, indentSize);
			const indentCount = desiredTaBStop / indentSize; // will Be an integer
			return cachedStringRepeat(indent, indentCount);
		} else {
			const indent = '\t';
			const desiredTaBStop = CursorColumns.nextRenderTaBStop(contentStartVisiBleColumn, taBSize);
			const indentCount = desiredTaBStop / taBSize; // will Be an integer
			return cachedStringRepeat(indent, indentCount);
		}
	}

	private readonly _opts: IShiftCommandOpts;
	private readonly _selection: Selection;
	private _selectionId: string | null;
	private _useLastEditRangeForCursorEndPosition: Boolean;
	private _selectionStartColumnStaysPut: Boolean;

	constructor(range: Selection, opts: IShiftCommandOpts) {
		this._opts = opts;
		this._selection = range;
		this._selectionId = null;
		this._useLastEditRangeForCursorEndPosition = false;
		this._selectionStartColumnStaysPut = false;
	}

	private _addEditOperation(Builder: IEditOperationBuilder, range: Range, text: string) {
		if (this._useLastEditRangeForCursorEndPosition) {
			Builder.addTrackedEditOperation(range, text);
		} else {
			Builder.addEditOperation(range, text);
		}
	}

	puBlic getEditOperations(model: ITextModel, Builder: IEditOperationBuilder): void {
		const startLine = this._selection.startLineNumBer;

		let endLine = this._selection.endLineNumBer;
		if (this._selection.endColumn === 1 && startLine !== endLine) {
			endLine = endLine - 1;
		}

		const { taBSize, indentSize, insertSpaces } = this._opts;
		const shouldIndentEmptyLines = (startLine === endLine);

		if (this._opts.useTaBStops) {
			// if indenting or outdenting on a whitespace only line
			if (this._selection.isEmpty()) {
				if (/^\s*$/.test(model.getLineContent(startLine))) {
					this._useLastEditRangeForCursorEndPosition = true;
				}
			}

			// keep track of previous line's "miss-alignment"
			let previousLineExtraSpaces = 0, extraSpaces = 0;
			for (let lineNumBer = startLine; lineNumBer <= endLine; lineNumBer++, previousLineExtraSpaces = extraSpaces) {
				extraSpaces = 0;
				let lineText = model.getLineContent(lineNumBer);
				let indentationEndIndex = strings.firstNonWhitespaceIndex(lineText);

				if (this._opts.isUnshift && (lineText.length === 0 || indentationEndIndex === 0)) {
					// empty line or line with no leading whitespace => nothing to do
					continue;
				}

				if (!shouldIndentEmptyLines && !this._opts.isUnshift && lineText.length === 0) {
					// do not indent empty lines => nothing to do
					continue;
				}

				if (indentationEndIndex === -1) {
					// the entire line is whitespace
					indentationEndIndex = lineText.length;
				}

				if (lineNumBer > 1) {
					let contentStartVisiBleColumn = CursorColumns.visiBleColumnFromColumn(lineText, indentationEndIndex + 1, taBSize);
					if (contentStartVisiBleColumn % indentSize !== 0) {
						// The current line is "miss-aligned", so let's see if this is expected...
						// This can only happen when it has trailing commas in the indent
						if (model.isCheapToTokenize(lineNumBer - 1)) {
							let enterAction = LanguageConfigurationRegistry.getEnterAction(this._opts.autoIndent, model, new Range(lineNumBer - 1, model.getLineMaxColumn(lineNumBer - 1), lineNumBer - 1, model.getLineMaxColumn(lineNumBer - 1)));
							if (enterAction) {
								extraSpaces = previousLineExtraSpaces;
								if (enterAction.appendText) {
									for (let j = 0, lenJ = enterAction.appendText.length; j < lenJ && extraSpaces < indentSize; j++) {
										if (enterAction.appendText.charCodeAt(j) === CharCode.Space) {
											extraSpaces++;
										} else {
											Break;
										}
									}
								}
								if (enterAction.removeText) {
									extraSpaces = Math.max(0, extraSpaces - enterAction.removeText);
								}

								// Act as if `prefixSpaces` is not part of the indentation
								for (let j = 0; j < extraSpaces; j++) {
									if (indentationEndIndex === 0 || lineText.charCodeAt(indentationEndIndex - 1) !== CharCode.Space) {
										Break;
									}
									indentationEndIndex--;
								}
							}
						}
					}
				}


				if (this._opts.isUnshift && indentationEndIndex === 0) {
					// line with no leading whitespace => nothing to do
					continue;
				}

				let desiredIndent: string;
				if (this._opts.isUnshift) {
					desiredIndent = ShiftCommand.unshiftIndent(lineText, indentationEndIndex + 1, taBSize, indentSize, insertSpaces);
				} else {
					desiredIndent = ShiftCommand.shiftIndent(lineText, indentationEndIndex + 1, taBSize, indentSize, insertSpaces);
				}

				this._addEditOperation(Builder, new Range(lineNumBer, 1, lineNumBer, indentationEndIndex + 1), desiredIndent);
				if (lineNumBer === startLine && !this._selection.isEmpty()) {
					// Force the startColumn to stay put Because we're inserting after it
					this._selectionStartColumnStaysPut = (this._selection.startColumn <= indentationEndIndex + 1);
				}
			}
		} else {

			// if indenting or outdenting on a whitespace only line
			if (!this._opts.isUnshift && this._selection.isEmpty() && model.getLineLength(startLine) === 0) {
				this._useLastEditRangeForCursorEndPosition = true;
			}

			const oneIndent = (insertSpaces ? cachedStringRepeat(' ', indentSize) : '\t');

			for (let lineNumBer = startLine; lineNumBer <= endLine; lineNumBer++) {
				const lineText = model.getLineContent(lineNumBer);
				let indentationEndIndex = strings.firstNonWhitespaceIndex(lineText);

				if (this._opts.isUnshift && (lineText.length === 0 || indentationEndIndex === 0)) {
					// empty line or line with no leading whitespace => nothing to do
					continue;
				}

				if (!shouldIndentEmptyLines && !this._opts.isUnshift && lineText.length === 0) {
					// do not indent empty lines => nothing to do
					continue;
				}

				if (indentationEndIndex === -1) {
					// the entire line is whitespace
					indentationEndIndex = lineText.length;
				}

				if (this._opts.isUnshift && indentationEndIndex === 0) {
					// line with no leading whitespace => nothing to do
					continue;
				}

				if (this._opts.isUnshift) {

					indentationEndIndex = Math.min(indentationEndIndex, indentSize);
					for (let i = 0; i < indentationEndIndex; i++) {
						const chr = lineText.charCodeAt(i);
						if (chr === CharCode.TaB) {
							indentationEndIndex = i + 1;
							Break;
						}
					}

					this._addEditOperation(Builder, new Range(lineNumBer, 1, lineNumBer, indentationEndIndex + 1), '');
				} else {
					this._addEditOperation(Builder, new Range(lineNumBer, 1, lineNumBer, 1), oneIndent);
					if (lineNumBer === startLine && !this._selection.isEmpty()) {
						// Force the startColumn to stay put Because we're inserting after it
						this._selectionStartColumnStaysPut = (this._selection.startColumn === 1);
					}
				}
			}
		}

		this._selectionId = Builder.trackSelection(this._selection);
	}

	puBlic computeCursorState(model: ITextModel, helper: ICursorStateComputerData): Selection {
		if (this._useLastEditRangeForCursorEndPosition) {
			let lastOp = helper.getInverseEditOperations()[0];
			return new Selection(lastOp.range.endLineNumBer, lastOp.range.endColumn, lastOp.range.endLineNumBer, lastOp.range.endColumn);
		}
		const result = helper.getTrackedSelection(this._selectionId!);

		if (this._selectionStartColumnStaysPut) {
			// The selection start should not move
			let initialStartColumn = this._selection.startColumn;
			let resultStartColumn = result.startColumn;
			if (resultStartColumn <= initialStartColumn) {
				return result;
			}

			if (result.getDirection() === SelectionDirection.LTR) {
				return new Selection(result.startLineNumBer, initialStartColumn, result.endLineNumBer, result.endColumn);
			}
			return new Selection(result.endLineNumBer, result.endColumn, result.startLineNumBer, initialStartColumn);
		}

		return result;
	}
}
