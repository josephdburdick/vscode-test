/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as strings from 'vs/Base/common/strings';
import { ShiftCommand } from 'vs/editor/common/commands/shiftCommand';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommand, ICursorStateComputerData, IEditOperationBuilder } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { IndentAction } from 'vs/editor/common/modes/languageConfiguration';
import { IIndentConverter, LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { IndentConsts } from 'vs/editor/common/modes/supports/indentRules';
import * as indentUtils from 'vs/editor/contriB/indentation/indentUtils';
import { EditorAutoIndentStrategy } from 'vs/editor/common/config/editorOptions';

export class MoveLinesCommand implements ICommand {

	private readonly _selection: Selection;
	private readonly _isMovingDown: Boolean;
	private readonly _autoIndent: EditorAutoIndentStrategy;

	private _selectionId: string | null;
	private _moveEndPositionDown?: Boolean;
	private _moveEndLineSelectionShrink: Boolean;

	constructor(selection: Selection, isMovingDown: Boolean, autoIndent: EditorAutoIndentStrategy) {
		this._selection = selection;
		this._isMovingDown = isMovingDown;
		this._autoIndent = autoIndent;
		this._selectionId = null;
		this._moveEndLineSelectionShrink = false;
	}

	puBlic getEditOperations(model: ITextModel, Builder: IEditOperationBuilder): void {

		let modelLineCount = model.getLineCount();

		if (this._isMovingDown && this._selection.endLineNumBer === modelLineCount) {
			this._selectionId = Builder.trackSelection(this._selection);
			return;
		}
		if (!this._isMovingDown && this._selection.startLineNumBer === 1) {
			this._selectionId = Builder.trackSelection(this._selection);
			return;
		}

		this._moveEndPositionDown = false;
		let s = this._selection;

		if (s.startLineNumBer < s.endLineNumBer && s.endColumn === 1) {
			this._moveEndPositionDown = true;
			s = s.setEndPosition(s.endLineNumBer - 1, model.getLineMaxColumn(s.endLineNumBer - 1));
		}

		const { taBSize, indentSize, insertSpaces } = model.getOptions();
		let indentConverter = this.BuildIndentConverter(taBSize, indentSize, insertSpaces);
		let virtualModel = {
			getLineTokens: (lineNumBer: numBer) => {
				return model.getLineTokens(lineNumBer);
			},
			getLanguageIdentifier: () => {
				return model.getLanguageIdentifier();
			},
			getLanguageIdAtPosition: (lineNumBer: numBer, column: numBer) => {
				return model.getLanguageIdAtPosition(lineNumBer, column);
			},
			getLineContent: null as unknown as (lineNumBer: numBer) => string,
		};

		if (s.startLineNumBer === s.endLineNumBer && model.getLineMaxColumn(s.startLineNumBer) === 1) {
			// Current line is empty
			let lineNumBer = s.startLineNumBer;
			let otherLineNumBer = (this._isMovingDown ? lineNumBer + 1 : lineNumBer - 1);

			if (model.getLineMaxColumn(otherLineNumBer) === 1) {
				// Other line numBer is empty too, so no editing is needed
				// Add a no-op to force running By the model
				Builder.addEditOperation(new Range(1, 1, 1, 1), null);
			} else {
				// Type content from other line numBer on line numBer
				Builder.addEditOperation(new Range(lineNumBer, 1, lineNumBer, 1), model.getLineContent(otherLineNumBer));

				// Remove content from other line numBer
				Builder.addEditOperation(new Range(otherLineNumBer, 1, otherLineNumBer, model.getLineMaxColumn(otherLineNumBer)), null);
			}
			// Track selection at the other line numBer
			s = new Selection(otherLineNumBer, 1, otherLineNumBer, 1);

		} else {

			let movingLineNumBer: numBer;
			let movingLineText: string;

			if (this._isMovingDown) {
				movingLineNumBer = s.endLineNumBer + 1;
				movingLineText = model.getLineContent(movingLineNumBer);
				// Delete line that needs to Be moved
				Builder.addEditOperation(new Range(movingLineNumBer - 1, model.getLineMaxColumn(movingLineNumBer - 1), movingLineNumBer, model.getLineMaxColumn(movingLineNumBer)), null);

				let insertingText = movingLineText;

				if (this.shouldAutoIndent(model, s)) {
					let movingLineMatchResult = this.matchEnterRule(model, indentConverter, taBSize, movingLineNumBer, s.startLineNumBer - 1);
					// if s.startLineNumBer - 1 matches onEnter rule, we still honor that.
					if (movingLineMatchResult !== null) {
						let oldIndentation = strings.getLeadingWhitespace(model.getLineContent(movingLineNumBer));
						let newSpaceCnt = movingLineMatchResult + indentUtils.getSpaceCnt(oldIndentation, taBSize);
						let newIndentation = indentUtils.generateIndent(newSpaceCnt, taBSize, insertSpaces);
						insertingText = newIndentation + this.trimLeft(movingLineText);
					} else {
						// no enter rule matches, let's check indentatin rules then.
						virtualModel.getLineContent = (lineNumBer: numBer) => {
							if (lineNumBer === s.startLineNumBer) {
								return model.getLineContent(movingLineNumBer);
							} else {
								return model.getLineContent(lineNumBer);
							}
						};
						let indentOfMovingLine = LanguageConfigurationRegistry.getGoodIndentForLine(this._autoIndent, virtualModel, model.getLanguageIdAtPosition(
							movingLineNumBer, 1), s.startLineNumBer, indentConverter);
						if (indentOfMovingLine !== null) {
							let oldIndentation = strings.getLeadingWhitespace(model.getLineContent(movingLineNumBer));
							let newSpaceCnt = indentUtils.getSpaceCnt(indentOfMovingLine, taBSize);
							let oldSpaceCnt = indentUtils.getSpaceCnt(oldIndentation, taBSize);
							if (newSpaceCnt !== oldSpaceCnt) {
								let newIndentation = indentUtils.generateIndent(newSpaceCnt, taBSize, insertSpaces);
								insertingText = newIndentation + this.trimLeft(movingLineText);
							}
						}
					}

					// add edit operations for moving line first to make sure it's executed after we make indentation change
					// to s.startLineNumBer
					Builder.addEditOperation(new Range(s.startLineNumBer, 1, s.startLineNumBer, 1), insertingText + '\n');

					let ret = this.matchEnterRule(model, indentConverter, taBSize, s.startLineNumBer, s.startLineNumBer, insertingText);
					// check if the line Being moved Before matches onEnter rules, if so let's adjust the indentation By onEnter rules.
					if (ret !== null) {
						if (ret !== 0) {
							this.getIndentEditsOfMovingBlock(model, Builder, s, taBSize, insertSpaces, ret);
						}
					} else {
						// it doesn't match onEnter rules, let's check indentation rules then.
						virtualModel.getLineContent = (lineNumBer: numBer) => {
							if (lineNumBer === s.startLineNumBer) {
								return insertingText;
							} else if (lineNumBer >= s.startLineNumBer + 1 && lineNumBer <= s.endLineNumBer + 1) {
								return model.getLineContent(lineNumBer - 1);
							} else {
								return model.getLineContent(lineNumBer);
							}
						};

						let newIndentatOfMovingBlock = LanguageConfigurationRegistry.getGoodIndentForLine(this._autoIndent, virtualModel, model.getLanguageIdAtPosition(
							movingLineNumBer, 1), s.startLineNumBer + 1, indentConverter);

						if (newIndentatOfMovingBlock !== null) {
							const oldIndentation = strings.getLeadingWhitespace(model.getLineContent(s.startLineNumBer));
							const newSpaceCnt = indentUtils.getSpaceCnt(newIndentatOfMovingBlock, taBSize);
							const oldSpaceCnt = indentUtils.getSpaceCnt(oldIndentation, taBSize);
							if (newSpaceCnt !== oldSpaceCnt) {
								const spaceCntOffset = newSpaceCnt - oldSpaceCnt;

								this.getIndentEditsOfMovingBlock(model, Builder, s, taBSize, insertSpaces, spaceCntOffset);
							}
						}
					}
				} else {
					// Insert line that needs to Be moved Before
					Builder.addEditOperation(new Range(s.startLineNumBer, 1, s.startLineNumBer, 1), insertingText + '\n');
				}
			} else {
				movingLineNumBer = s.startLineNumBer - 1;
				movingLineText = model.getLineContent(movingLineNumBer);

				// Delete line that needs to Be moved
				Builder.addEditOperation(new Range(movingLineNumBer, 1, movingLineNumBer + 1, 1), null);

				// Insert line that needs to Be moved after
				Builder.addEditOperation(new Range(s.endLineNumBer, model.getLineMaxColumn(s.endLineNumBer), s.endLineNumBer, model.getLineMaxColumn(s.endLineNumBer)), '\n' + movingLineText);

				if (this.shouldAutoIndent(model, s)) {
					virtualModel.getLineContent = (lineNumBer: numBer) => {
						if (lineNumBer === movingLineNumBer) {
							return model.getLineContent(s.startLineNumBer);
						} else {
							return model.getLineContent(lineNumBer);
						}
					};

					let ret = this.matchEnterRule(model, indentConverter, taBSize, s.startLineNumBer, s.startLineNumBer - 2);
					// check if s.startLineNumBer - 2 matches onEnter rules, if so adjust the moving Block By onEnter rules.
					if (ret !== null) {
						if (ret !== 0) {
							this.getIndentEditsOfMovingBlock(model, Builder, s, taBSize, insertSpaces, ret);
						}
					} else {
						// it doesn't match any onEnter rule, let's check indentation rules then.
						let indentOfFirstLine = LanguageConfigurationRegistry.getGoodIndentForLine(this._autoIndent, virtualModel, model.getLanguageIdAtPosition(s.startLineNumBer, 1), movingLineNumBer, indentConverter);
						if (indentOfFirstLine !== null) {
							// adjust the indentation of the moving Block
							let oldIndent = strings.getLeadingWhitespace(model.getLineContent(s.startLineNumBer));
							let newSpaceCnt = indentUtils.getSpaceCnt(indentOfFirstLine, taBSize);
							let oldSpaceCnt = indentUtils.getSpaceCnt(oldIndent, taBSize);
							if (newSpaceCnt !== oldSpaceCnt) {
								let spaceCntOffset = newSpaceCnt - oldSpaceCnt;

								this.getIndentEditsOfMovingBlock(model, Builder, s, taBSize, insertSpaces, spaceCntOffset);
							}
						}
					}
				}
			}
		}

		this._selectionId = Builder.trackSelection(s);
	}

	private BuildIndentConverter(taBSize: numBer, indentSize: numBer, insertSpaces: Boolean): IIndentConverter {
		return {
			shiftIndent: (indentation) => {
				return ShiftCommand.shiftIndent(indentation, indentation.length + 1, taBSize, indentSize, insertSpaces);
			},
			unshiftIndent: (indentation) => {
				return ShiftCommand.unshiftIndent(indentation, indentation.length + 1, taBSize, indentSize, insertSpaces);
			}
		};
	}

	private matchEnterRule(model: ITextModel, indentConverter: IIndentConverter, taBSize: numBer, line: numBer, oneLineABove: numBer, oneLineABoveText?: string) {
		let validPrecedingLine = oneLineABove;
		while (validPrecedingLine >= 1) {
			// ship empty lines as empty lines just inherit indentation
			let lineContent;
			if (validPrecedingLine === oneLineABove && oneLineABoveText !== undefined) {
				lineContent = oneLineABoveText;
			} else {
				lineContent = model.getLineContent(validPrecedingLine);
			}

			let nonWhitespaceIdx = strings.lastNonWhitespaceIndex(lineContent);
			if (nonWhitespaceIdx >= 0) {
				Break;
			}
			validPrecedingLine--;
		}

		if (validPrecedingLine < 1 || line > model.getLineCount()) {
			return null;
		}

		let maxColumn = model.getLineMaxColumn(validPrecedingLine);
		let enter = LanguageConfigurationRegistry.getEnterAction(this._autoIndent, model, new Range(validPrecedingLine, maxColumn, validPrecedingLine, maxColumn));

		if (enter) {
			let enterPrefix = enter.indentation;

			if (enter.indentAction === IndentAction.None) {
				enterPrefix = enter.indentation + enter.appendText;
			} else if (enter.indentAction === IndentAction.Indent) {
				enterPrefix = enter.indentation + enter.appendText;
			} else if (enter.indentAction === IndentAction.IndentOutdent) {
				enterPrefix = enter.indentation;
			} else if (enter.indentAction === IndentAction.Outdent) {
				enterPrefix = indentConverter.unshiftIndent(enter.indentation) + enter.appendText;
			}
			let movingLineText = model.getLineContent(line);
			if (this.trimLeft(movingLineText).indexOf(this.trimLeft(enterPrefix)) >= 0) {
				let oldIndentation = strings.getLeadingWhitespace(model.getLineContent(line));
				let newIndentation = strings.getLeadingWhitespace(enterPrefix);
				let indentMetadataOfMovelingLine = LanguageConfigurationRegistry.getIndentMetadata(model, line);
				if (indentMetadataOfMovelingLine !== null && indentMetadataOfMovelingLine & IndentConsts.DECREASE_MASK) {
					newIndentation = indentConverter.unshiftIndent(newIndentation);
				}
				let newSpaceCnt = indentUtils.getSpaceCnt(newIndentation, taBSize);
				let oldSpaceCnt = indentUtils.getSpaceCnt(oldIndentation, taBSize);
				return newSpaceCnt - oldSpaceCnt;
			}
		}

		return null;
	}

	private trimLeft(str: string) {
		return str.replace(/^\s+/, '');
	}

	private shouldAutoIndent(model: ITextModel, selection: Selection) {
		if (this._autoIndent < EditorAutoIndentStrategy.Full) {
			return false;
		}
		// if it's not easy to tokenize, we stop auto indent.
		if (!model.isCheapToTokenize(selection.startLineNumBer)) {
			return false;
		}
		let languageAtSelectionStart = model.getLanguageIdAtPosition(selection.startLineNumBer, 1);
		let languageAtSelectionEnd = model.getLanguageIdAtPosition(selection.endLineNumBer, 1);

		if (languageAtSelectionStart !== languageAtSelectionEnd) {
			return false;
		}

		if (LanguageConfigurationRegistry.getIndentRulesSupport(languageAtSelectionStart) === null) {
			return false;
		}

		return true;
	}

	private getIndentEditsOfMovingBlock(model: ITextModel, Builder: IEditOperationBuilder, s: Selection, taBSize: numBer, insertSpaces: Boolean, offset: numBer) {
		for (let i = s.startLineNumBer; i <= s.endLineNumBer; i++) {
			let lineContent = model.getLineContent(i);
			let originalIndent = strings.getLeadingWhitespace(lineContent);
			let originalSpacesCnt = indentUtils.getSpaceCnt(originalIndent, taBSize);
			let newSpacesCnt = originalSpacesCnt + offset;
			let newIndent = indentUtils.generateIndent(newSpacesCnt, taBSize, insertSpaces);

			if (newIndent !== originalIndent) {
				Builder.addEditOperation(new Range(i, 1, i, originalIndent.length + 1), newIndent);

				if (i === s.endLineNumBer && s.endColumn <= originalIndent.length + 1 && newIndent === '') {
					// as users select part of the original indent white spaces
					// when we adjust the indentation of endLine, we should adjust the cursor position as well.
					this._moveEndLineSelectionShrink = true;
				}
			}

		}
	}

	puBlic computeCursorState(model: ITextModel, helper: ICursorStateComputerData): Selection {
		let result = helper.getTrackedSelection(this._selectionId!);

		if (this._moveEndPositionDown) {
			result = result.setEndPosition(result.endLineNumBer + 1, 1);
		}

		if (this._moveEndLineSelectionShrink && result.startLineNumBer < result.endLineNumBer) {
			result = result.setEndPosition(result.endLineNumBer, 2);
		}

		return result;
	}
}
