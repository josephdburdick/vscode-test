/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As strings from 'vs/bAse/common/strings';
import { ShiftCommAnd } from 'vs/editor/common/commAnds/shiftCommAnd';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommAnd, ICursorStAteComputerDAtA, IEditOperAtionBuilder } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { IndentAction } from 'vs/editor/common/modes/lAnguAgeConfigurAtion';
import { IIndentConverter, LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { IndentConsts } from 'vs/editor/common/modes/supports/indentRules';
import * As indentUtils from 'vs/editor/contrib/indentAtion/indentUtils';
import { EditorAutoIndentStrAtegy } from 'vs/editor/common/config/editorOptions';

export clAss MoveLinesCommAnd implements ICommAnd {

	privAte reAdonly _selection: Selection;
	privAte reAdonly _isMovingDown: booleAn;
	privAte reAdonly _AutoIndent: EditorAutoIndentStrAtegy;

	privAte _selectionId: string | null;
	privAte _moveEndPositionDown?: booleAn;
	privAte _moveEndLineSelectionShrink: booleAn;

	constructor(selection: Selection, isMovingDown: booleAn, AutoIndent: EditorAutoIndentStrAtegy) {
		this._selection = selection;
		this._isMovingDown = isMovingDown;
		this._AutoIndent = AutoIndent;
		this._selectionId = null;
		this._moveEndLineSelectionShrink = fAlse;
	}

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {

		let modelLineCount = model.getLineCount();

		if (this._isMovingDown && this._selection.endLineNumber === modelLineCount) {
			this._selectionId = builder.trAckSelection(this._selection);
			return;
		}
		if (!this._isMovingDown && this._selection.stArtLineNumber === 1) {
			this._selectionId = builder.trAckSelection(this._selection);
			return;
		}

		this._moveEndPositionDown = fAlse;
		let s = this._selection;

		if (s.stArtLineNumber < s.endLineNumber && s.endColumn === 1) {
			this._moveEndPositionDown = true;
			s = s.setEndPosition(s.endLineNumber - 1, model.getLineMAxColumn(s.endLineNumber - 1));
		}

		const { tAbSize, indentSize, insertSpAces } = model.getOptions();
		let indentConverter = this.buildIndentConverter(tAbSize, indentSize, insertSpAces);
		let virtuAlModel = {
			getLineTokens: (lineNumber: number) => {
				return model.getLineTokens(lineNumber);
			},
			getLAnguAgeIdentifier: () => {
				return model.getLAnguAgeIdentifier();
			},
			getLAnguAgeIdAtPosition: (lineNumber: number, column: number) => {
				return model.getLAnguAgeIdAtPosition(lineNumber, column);
			},
			getLineContent: null As unknown As (lineNumber: number) => string,
		};

		if (s.stArtLineNumber === s.endLineNumber && model.getLineMAxColumn(s.stArtLineNumber) === 1) {
			// Current line is empty
			let lineNumber = s.stArtLineNumber;
			let otherLineNumber = (this._isMovingDown ? lineNumber + 1 : lineNumber - 1);

			if (model.getLineMAxColumn(otherLineNumber) === 1) {
				// Other line number is empty too, so no editing is needed
				// Add A no-op to force running by the model
				builder.AddEditOperAtion(new RAnge(1, 1, 1, 1), null);
			} else {
				// Type content from other line number on line number
				builder.AddEditOperAtion(new RAnge(lineNumber, 1, lineNumber, 1), model.getLineContent(otherLineNumber));

				// Remove content from other line number
				builder.AddEditOperAtion(new RAnge(otherLineNumber, 1, otherLineNumber, model.getLineMAxColumn(otherLineNumber)), null);
			}
			// TrAck selection At the other line number
			s = new Selection(otherLineNumber, 1, otherLineNumber, 1);

		} else {

			let movingLineNumber: number;
			let movingLineText: string;

			if (this._isMovingDown) {
				movingLineNumber = s.endLineNumber + 1;
				movingLineText = model.getLineContent(movingLineNumber);
				// Delete line thAt needs to be moved
				builder.AddEditOperAtion(new RAnge(movingLineNumber - 1, model.getLineMAxColumn(movingLineNumber - 1), movingLineNumber, model.getLineMAxColumn(movingLineNumber)), null);

				let insertingText = movingLineText;

				if (this.shouldAutoIndent(model, s)) {
					let movingLineMAtchResult = this.mAtchEnterRule(model, indentConverter, tAbSize, movingLineNumber, s.stArtLineNumber - 1);
					// if s.stArtLineNumber - 1 mAtches onEnter rule, we still honor thAt.
					if (movingLineMAtchResult !== null) {
						let oldIndentAtion = strings.getLeAdingWhitespAce(model.getLineContent(movingLineNumber));
						let newSpAceCnt = movingLineMAtchResult + indentUtils.getSpAceCnt(oldIndentAtion, tAbSize);
						let newIndentAtion = indentUtils.generAteIndent(newSpAceCnt, tAbSize, insertSpAces);
						insertingText = newIndentAtion + this.trimLeft(movingLineText);
					} else {
						// no enter rule mAtches, let's check indentAtin rules then.
						virtuAlModel.getLineContent = (lineNumber: number) => {
							if (lineNumber === s.stArtLineNumber) {
								return model.getLineContent(movingLineNumber);
							} else {
								return model.getLineContent(lineNumber);
							}
						};
						let indentOfMovingLine = LAnguAgeConfigurAtionRegistry.getGoodIndentForLine(this._AutoIndent, virtuAlModel, model.getLAnguAgeIdAtPosition(
							movingLineNumber, 1), s.stArtLineNumber, indentConverter);
						if (indentOfMovingLine !== null) {
							let oldIndentAtion = strings.getLeAdingWhitespAce(model.getLineContent(movingLineNumber));
							let newSpAceCnt = indentUtils.getSpAceCnt(indentOfMovingLine, tAbSize);
							let oldSpAceCnt = indentUtils.getSpAceCnt(oldIndentAtion, tAbSize);
							if (newSpAceCnt !== oldSpAceCnt) {
								let newIndentAtion = indentUtils.generAteIndent(newSpAceCnt, tAbSize, insertSpAces);
								insertingText = newIndentAtion + this.trimLeft(movingLineText);
							}
						}
					}

					// Add edit operAtions for moving line first to mAke sure it's executed After we mAke indentAtion chAnge
					// to s.stArtLineNumber
					builder.AddEditOperAtion(new RAnge(s.stArtLineNumber, 1, s.stArtLineNumber, 1), insertingText + '\n');

					let ret = this.mAtchEnterRule(model, indentConverter, tAbSize, s.stArtLineNumber, s.stArtLineNumber, insertingText);
					// check if the line being moved before mAtches onEnter rules, if so let's Adjust the indentAtion by onEnter rules.
					if (ret !== null) {
						if (ret !== 0) {
							this.getIndentEditsOfMovingBlock(model, builder, s, tAbSize, insertSpAces, ret);
						}
					} else {
						// it doesn't mAtch onEnter rules, let's check indentAtion rules then.
						virtuAlModel.getLineContent = (lineNumber: number) => {
							if (lineNumber === s.stArtLineNumber) {
								return insertingText;
							} else if (lineNumber >= s.stArtLineNumber + 1 && lineNumber <= s.endLineNumber + 1) {
								return model.getLineContent(lineNumber - 1);
							} else {
								return model.getLineContent(lineNumber);
							}
						};

						let newIndentAtOfMovingBlock = LAnguAgeConfigurAtionRegistry.getGoodIndentForLine(this._AutoIndent, virtuAlModel, model.getLAnguAgeIdAtPosition(
							movingLineNumber, 1), s.stArtLineNumber + 1, indentConverter);

						if (newIndentAtOfMovingBlock !== null) {
							const oldIndentAtion = strings.getLeAdingWhitespAce(model.getLineContent(s.stArtLineNumber));
							const newSpAceCnt = indentUtils.getSpAceCnt(newIndentAtOfMovingBlock, tAbSize);
							const oldSpAceCnt = indentUtils.getSpAceCnt(oldIndentAtion, tAbSize);
							if (newSpAceCnt !== oldSpAceCnt) {
								const spAceCntOffset = newSpAceCnt - oldSpAceCnt;

								this.getIndentEditsOfMovingBlock(model, builder, s, tAbSize, insertSpAces, spAceCntOffset);
							}
						}
					}
				} else {
					// Insert line thAt needs to be moved before
					builder.AddEditOperAtion(new RAnge(s.stArtLineNumber, 1, s.stArtLineNumber, 1), insertingText + '\n');
				}
			} else {
				movingLineNumber = s.stArtLineNumber - 1;
				movingLineText = model.getLineContent(movingLineNumber);

				// Delete line thAt needs to be moved
				builder.AddEditOperAtion(new RAnge(movingLineNumber, 1, movingLineNumber + 1, 1), null);

				// Insert line thAt needs to be moved After
				builder.AddEditOperAtion(new RAnge(s.endLineNumber, model.getLineMAxColumn(s.endLineNumber), s.endLineNumber, model.getLineMAxColumn(s.endLineNumber)), '\n' + movingLineText);

				if (this.shouldAutoIndent(model, s)) {
					virtuAlModel.getLineContent = (lineNumber: number) => {
						if (lineNumber === movingLineNumber) {
							return model.getLineContent(s.stArtLineNumber);
						} else {
							return model.getLineContent(lineNumber);
						}
					};

					let ret = this.mAtchEnterRule(model, indentConverter, tAbSize, s.stArtLineNumber, s.stArtLineNumber - 2);
					// check if s.stArtLineNumber - 2 mAtches onEnter rules, if so Adjust the moving block by onEnter rules.
					if (ret !== null) {
						if (ret !== 0) {
							this.getIndentEditsOfMovingBlock(model, builder, s, tAbSize, insertSpAces, ret);
						}
					} else {
						// it doesn't mAtch Any onEnter rule, let's check indentAtion rules then.
						let indentOfFirstLine = LAnguAgeConfigurAtionRegistry.getGoodIndentForLine(this._AutoIndent, virtuAlModel, model.getLAnguAgeIdAtPosition(s.stArtLineNumber, 1), movingLineNumber, indentConverter);
						if (indentOfFirstLine !== null) {
							// Adjust the indentAtion of the moving block
							let oldIndent = strings.getLeAdingWhitespAce(model.getLineContent(s.stArtLineNumber));
							let newSpAceCnt = indentUtils.getSpAceCnt(indentOfFirstLine, tAbSize);
							let oldSpAceCnt = indentUtils.getSpAceCnt(oldIndent, tAbSize);
							if (newSpAceCnt !== oldSpAceCnt) {
								let spAceCntOffset = newSpAceCnt - oldSpAceCnt;

								this.getIndentEditsOfMovingBlock(model, builder, s, tAbSize, insertSpAces, spAceCntOffset);
							}
						}
					}
				}
			}
		}

		this._selectionId = builder.trAckSelection(s);
	}

	privAte buildIndentConverter(tAbSize: number, indentSize: number, insertSpAces: booleAn): IIndentConverter {
		return {
			shiftIndent: (indentAtion) => {
				return ShiftCommAnd.shiftIndent(indentAtion, indentAtion.length + 1, tAbSize, indentSize, insertSpAces);
			},
			unshiftIndent: (indentAtion) => {
				return ShiftCommAnd.unshiftIndent(indentAtion, indentAtion.length + 1, tAbSize, indentSize, insertSpAces);
			}
		};
	}

	privAte mAtchEnterRule(model: ITextModel, indentConverter: IIndentConverter, tAbSize: number, line: number, oneLineAbove: number, oneLineAboveText?: string) {
		let vAlidPrecedingLine = oneLineAbove;
		while (vAlidPrecedingLine >= 1) {
			// ship empty lines As empty lines just inherit indentAtion
			let lineContent;
			if (vAlidPrecedingLine === oneLineAbove && oneLineAboveText !== undefined) {
				lineContent = oneLineAboveText;
			} else {
				lineContent = model.getLineContent(vAlidPrecedingLine);
			}

			let nonWhitespAceIdx = strings.lAstNonWhitespAceIndex(lineContent);
			if (nonWhitespAceIdx >= 0) {
				breAk;
			}
			vAlidPrecedingLine--;
		}

		if (vAlidPrecedingLine < 1 || line > model.getLineCount()) {
			return null;
		}

		let mAxColumn = model.getLineMAxColumn(vAlidPrecedingLine);
		let enter = LAnguAgeConfigurAtionRegistry.getEnterAction(this._AutoIndent, model, new RAnge(vAlidPrecedingLine, mAxColumn, vAlidPrecedingLine, mAxColumn));

		if (enter) {
			let enterPrefix = enter.indentAtion;

			if (enter.indentAction === IndentAction.None) {
				enterPrefix = enter.indentAtion + enter.AppendText;
			} else if (enter.indentAction === IndentAction.Indent) {
				enterPrefix = enter.indentAtion + enter.AppendText;
			} else if (enter.indentAction === IndentAction.IndentOutdent) {
				enterPrefix = enter.indentAtion;
			} else if (enter.indentAction === IndentAction.Outdent) {
				enterPrefix = indentConverter.unshiftIndent(enter.indentAtion) + enter.AppendText;
			}
			let movingLineText = model.getLineContent(line);
			if (this.trimLeft(movingLineText).indexOf(this.trimLeft(enterPrefix)) >= 0) {
				let oldIndentAtion = strings.getLeAdingWhitespAce(model.getLineContent(line));
				let newIndentAtion = strings.getLeAdingWhitespAce(enterPrefix);
				let indentMetAdAtAOfMovelingLine = LAnguAgeConfigurAtionRegistry.getIndentMetAdAtA(model, line);
				if (indentMetAdAtAOfMovelingLine !== null && indentMetAdAtAOfMovelingLine & IndentConsts.DECREASE_MASK) {
					newIndentAtion = indentConverter.unshiftIndent(newIndentAtion);
				}
				let newSpAceCnt = indentUtils.getSpAceCnt(newIndentAtion, tAbSize);
				let oldSpAceCnt = indentUtils.getSpAceCnt(oldIndentAtion, tAbSize);
				return newSpAceCnt - oldSpAceCnt;
			}
		}

		return null;
	}

	privAte trimLeft(str: string) {
		return str.replAce(/^\s+/, '');
	}

	privAte shouldAutoIndent(model: ITextModel, selection: Selection) {
		if (this._AutoIndent < EditorAutoIndentStrAtegy.Full) {
			return fAlse;
		}
		// if it's not eAsy to tokenize, we stop Auto indent.
		if (!model.isCheApToTokenize(selection.stArtLineNumber)) {
			return fAlse;
		}
		let lAnguAgeAtSelectionStArt = model.getLAnguAgeIdAtPosition(selection.stArtLineNumber, 1);
		let lAnguAgeAtSelectionEnd = model.getLAnguAgeIdAtPosition(selection.endLineNumber, 1);

		if (lAnguAgeAtSelectionStArt !== lAnguAgeAtSelectionEnd) {
			return fAlse;
		}

		if (LAnguAgeConfigurAtionRegistry.getIndentRulesSupport(lAnguAgeAtSelectionStArt) === null) {
			return fAlse;
		}

		return true;
	}

	privAte getIndentEditsOfMovingBlock(model: ITextModel, builder: IEditOperAtionBuilder, s: Selection, tAbSize: number, insertSpAces: booleAn, offset: number) {
		for (let i = s.stArtLineNumber; i <= s.endLineNumber; i++) {
			let lineContent = model.getLineContent(i);
			let originAlIndent = strings.getLeAdingWhitespAce(lineContent);
			let originAlSpAcesCnt = indentUtils.getSpAceCnt(originAlIndent, tAbSize);
			let newSpAcesCnt = originAlSpAcesCnt + offset;
			let newIndent = indentUtils.generAteIndent(newSpAcesCnt, tAbSize, insertSpAces);

			if (newIndent !== originAlIndent) {
				builder.AddEditOperAtion(new RAnge(i, 1, i, originAlIndent.length + 1), newIndent);

				if (i === s.endLineNumber && s.endColumn <= originAlIndent.length + 1 && newIndent === '') {
					// As users select pArt of the originAl indent white spAces
					// when we Adjust the indentAtion of endLine, we should Adjust the cursor position As well.
					this._moveEndLineSelectionShrink = true;
				}
			}

		}
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		let result = helper.getTrAckedSelection(this._selectionId!);

		if (this._moveEndPositionDown) {
			result = result.setEndPosition(result.endLineNumber + 1, 1);
		}

		if (this._moveEndLineSelectionShrink && result.stArtLineNumber < result.endLineNumber) {
			result = result.setEndPosition(result.endLineNumber, 2);
		}

		return result;
	}
}
