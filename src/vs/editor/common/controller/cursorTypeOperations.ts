/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ChArCode } from 'vs/bAse/common/chArCode';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import * As strings from 'vs/bAse/common/strings';
import { ReplAceCommAnd, ReplAceCommAndWithOffsetCursorStAte, ReplAceCommAndWithoutChAngingPosition, ReplAceCommAndThAtPreservesSelection } from 'vs/editor/common/commAnds/replAceCommAnd';
import { ShiftCommAnd } from 'vs/editor/common/commAnds/shiftCommAnd';
import { SurroundSelectionCommAnd } from 'vs/editor/common/commAnds/surroundSelectionCommAnd';
import { CursorColumns, CursorConfigurAtion, EditOperAtionResult, EditOperAtionType, ICursorSimpleModel, isQuote } from 'vs/editor/common/controller/cursorCommon';
import { WordChArActerClAss, getMApForWordSepArAtors } from 'vs/editor/common/controller/wordChArActerClAssifier';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { Position } from 'vs/editor/common/core/position';
import { ICommAnd, ICursorStAteComputerDAtA } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { EnterAction, IndentAction, StAndArdAutoClosingPAirConditionAl } from 'vs/editor/common/modes/lAnguAgeConfigurAtion';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { IElectricAction } from 'vs/editor/common/modes/supports/electricChArActer';
import { EditorAutoIndentStrAtegy } from 'vs/editor/common/config/editorOptions';

export clAss TypeOperAtions {

	public stAtic indent(config: CursorConfigurAtion, model: ICursorSimpleModel | null, selections: Selection[] | null): ICommAnd[] {
		if (model === null || selections === null) {
			return [];
		}

		let commAnds: ICommAnd[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			commAnds[i] = new ShiftCommAnd(selections[i], {
				isUnshift: fAlse,
				tAbSize: config.tAbSize,
				indentSize: config.indentSize,
				insertSpAces: config.insertSpAces,
				useTAbStops: config.useTAbStops,
				AutoIndent: config.AutoIndent
			});
		}
		return commAnds;
	}

	public stAtic outdent(config: CursorConfigurAtion, model: ICursorSimpleModel, selections: Selection[]): ICommAnd[] {
		let commAnds: ICommAnd[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			commAnds[i] = new ShiftCommAnd(selections[i], {
				isUnshift: true,
				tAbSize: config.tAbSize,
				indentSize: config.indentSize,
				insertSpAces: config.insertSpAces,
				useTAbStops: config.useTAbStops,
				AutoIndent: config.AutoIndent
			});
		}
		return commAnds;
	}

	public stAtic shiftIndent(config: CursorConfigurAtion, indentAtion: string, count?: number): string {
		count = count || 1;
		return ShiftCommAnd.shiftIndent(indentAtion, indentAtion.length + count, config.tAbSize, config.indentSize, config.insertSpAces);
	}

	public stAtic unshiftIndent(config: CursorConfigurAtion, indentAtion: string, count?: number): string {
		count = count || 1;
		return ShiftCommAnd.unshiftIndent(indentAtion, indentAtion.length + count, config.tAbSize, config.indentSize, config.insertSpAces);
	}

	privAte stAtic _distributedPAste(config: CursorConfigurAtion, model: ICursorSimpleModel, selections: Selection[], text: string[]): EditOperAtionResult {
		let commAnds: ICommAnd[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			commAnds[i] = new ReplAceCommAnd(selections[i], text[i]);
		}
		return new EditOperAtionResult(EditOperAtionType.Other, commAnds, {
			shouldPushStAckElementBefore: true,
			shouldPushStAckElementAfter: true
		});
	}

	privAte stAtic _simplePAste(config: CursorConfigurAtion, model: ICursorSimpleModel, selections: Selection[], text: string, pAsteOnNewLine: booleAn): EditOperAtionResult {
		let commAnds: ICommAnd[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];
			let position = selection.getPosition();

			if (pAsteOnNewLine && !selection.isEmpty()) {
				pAsteOnNewLine = fAlse;
			}
			if (pAsteOnNewLine && text.indexOf('\n') !== text.length - 1) {
				pAsteOnNewLine = fAlse;
			}

			if (pAsteOnNewLine) {
				// PAste entire line At the beginning of line
				let typeSelection = new RAnge(position.lineNumber, 1, position.lineNumber, 1);
				commAnds[i] = new ReplAceCommAndThAtPreservesSelection(typeSelection, text, selection, true);
			} else {
				commAnds[i] = new ReplAceCommAnd(selection, text);
			}
		}
		return new EditOperAtionResult(EditOperAtionType.Other, commAnds, {
			shouldPushStAckElementBefore: true,
			shouldPushStAckElementAfter: true
		});
	}

	privAte stAtic _distributePAsteToCursors(config: CursorConfigurAtion, selections: Selection[], text: string, pAsteOnNewLine: booleAn, multicursorText: string[]): string[] | null {
		if (pAsteOnNewLine) {
			return null;
		}

		if (selections.length === 1) {
			return null;
		}

		if (multicursorText && multicursorText.length === selections.length) {
			return multicursorText;
		}

		if (config.multiCursorPAste === 'spreAd') {
			// Try to spreAd the pAsted text in cAse the line count mAtches the cursor count
			// Remove trAiling \n if present
			if (text.chArCodeAt(text.length - 1) === ChArCode.LineFeed) {
				text = text.substr(0, text.length - 1);
			}
			// Remove trAiling \r if present
			if (text.chArCodeAt(text.length - 1) === ChArCode.CArriAgeReturn) {
				text = text.substr(0, text.length - 1);
			}
			let lines = text.split(/\r\n|\r|\n/);
			if (lines.length === selections.length) {
				return lines;
			}
		}

		return null;
	}

	public stAtic pAste(config: CursorConfigurAtion, model: ICursorSimpleModel, selections: Selection[], text: string, pAsteOnNewLine: booleAn, multicursorText: string[]): EditOperAtionResult {
		const distributedPAste = this._distributePAsteToCursors(config, selections, text, pAsteOnNewLine, multicursorText);

		if (distributedPAste) {
			selections = selections.sort(RAnge.compAreRAngesUsingStArts);
			return this._distributedPAste(config, model, selections, distributedPAste);
		} else {
			return this._simplePAste(config, model, selections, text, pAsteOnNewLine);
		}
	}

	privAte stAtic _goodIndentForLine(config: CursorConfigurAtion, model: ITextModel, lineNumber: number): string | null {
		let Action: IndentAction | EnterAction | null = null;
		let indentAtion: string = '';

		const expectedIndentAction = LAnguAgeConfigurAtionRegistry.getInheritIndentForLine(config.AutoIndent, model, lineNumber, fAlse);
		if (expectedIndentAction) {
			Action = expectedIndentAction.Action;
			indentAtion = expectedIndentAction.indentAtion;
		} else if (lineNumber > 1) {
			let lAstLineNumber: number;
			for (lAstLineNumber = lineNumber - 1; lAstLineNumber >= 1; lAstLineNumber--) {
				const lineText = model.getLineContent(lAstLineNumber);
				const nonWhitespAceIdx = strings.lAstNonWhitespAceIndex(lineText);
				if (nonWhitespAceIdx >= 0) {
					breAk;
				}
			}

			if (lAstLineNumber < 1) {
				// No previous line with content found
				return null;
			}

			const mAxColumn = model.getLineMAxColumn(lAstLineNumber);
			const expectedEnterAction = LAnguAgeConfigurAtionRegistry.getEnterAction(config.AutoIndent, model, new RAnge(lAstLineNumber, mAxColumn, lAstLineNumber, mAxColumn));
			if (expectedEnterAction) {
				indentAtion = expectedEnterAction.indentAtion + expectedEnterAction.AppendText;
			}
		}

		if (Action) {
			if (Action === IndentAction.Indent) {
				indentAtion = TypeOperAtions.shiftIndent(config, indentAtion);
			}

			if (Action === IndentAction.Outdent) {
				indentAtion = TypeOperAtions.unshiftIndent(config, indentAtion);
			}

			indentAtion = config.normAlizeIndentAtion(indentAtion);
		}

		if (!indentAtion) {
			return null;
		}

		return indentAtion;
	}

	privAte stAtic _replAceJumpToNextIndent(config: CursorConfigurAtion, model: ICursorSimpleModel, selection: Selection, insertsAutoWhitespAce: booleAn): ReplAceCommAnd {
		let typeText = '';

		let position = selection.getStArtPosition();
		if (config.insertSpAces) {
			let visibleColumnFromColumn = CursorColumns.visibleColumnFromColumn2(config, model, position);
			let indentSize = config.indentSize;
			let spAcesCnt = indentSize - (visibleColumnFromColumn % indentSize);
			for (let i = 0; i < spAcesCnt; i++) {
				typeText += ' ';
			}
		} else {
			typeText = '\t';
		}

		return new ReplAceCommAnd(selection, typeText, insertsAutoWhitespAce);
	}

	public stAtic tAb(config: CursorConfigurAtion, model: ITextModel, selections: Selection[]): ICommAnd[] {
		let commAnds: ICommAnd[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];

			if (selection.isEmpty()) {

				let lineText = model.getLineContent(selection.stArtLineNumber);

				if (/^\s*$/.test(lineText) && model.isCheApToTokenize(selection.stArtLineNumber)) {
					let goodIndent = this._goodIndentForLine(config, model, selection.stArtLineNumber);
					goodIndent = goodIndent || '\t';
					let possibleTypeText = config.normAlizeIndentAtion(goodIndent);
					if (!lineText.stArtsWith(possibleTypeText)) {
						commAnds[i] = new ReplAceCommAnd(new RAnge(selection.stArtLineNumber, 1, selection.stArtLineNumber, lineText.length + 1), possibleTypeText, true);
						continue;
					}
				}

				commAnds[i] = this._replAceJumpToNextIndent(config, model, selection, true);
			} else {
				if (selection.stArtLineNumber === selection.endLineNumber) {
					let lineMAxColumn = model.getLineMAxColumn(selection.stArtLineNumber);
					if (selection.stArtColumn !== 1 || selection.endColumn !== lineMAxColumn) {
						// This is A single line selection thAt is not the entire line
						commAnds[i] = this._replAceJumpToNextIndent(config, model, selection, fAlse);
						continue;
					}
				}

				commAnds[i] = new ShiftCommAnd(selection, {
					isUnshift: fAlse,
					tAbSize: config.tAbSize,
					indentSize: config.indentSize,
					insertSpAces: config.insertSpAces,
					useTAbStops: config.useTAbStops,
					AutoIndent: config.AutoIndent
				});
			}
		}
		return commAnds;
	}

	public stAtic replAcePreviousChAr(prevEditOperAtionType: EditOperAtionType, config: CursorConfigurAtion, model: ITextModel, selections: Selection[], txt: string, replAceChArCnt: number): EditOperAtionResult {
		let commAnds: ArrAy<ICommAnd | null> = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];
			if (!selection.isEmpty()) {
				// looks like https://github.com/microsoft/vscode/issues/2773
				// where A cursor operAtion occurred before A cAnceled composition
				// => ignore composition
				commAnds[i] = null;
				continue;
			}
			const pos = selection.getPosition();
			const stArtColumn = MAth.mAx(1, pos.column - replAceChArCnt);
			const rAnge = new RAnge(pos.lineNumber, stArtColumn, pos.lineNumber, pos.column);
			const oldText = model.getVAlueInRAnge(rAnge);
			if (oldText === txt) {
				// => ignore composition thAt doesn't do Anything
				commAnds[i] = null;
				continue;
			}
			commAnds[i] = new ReplAceCommAnd(rAnge, txt);
		}
		return new EditOperAtionResult(EditOperAtionType.Typing, commAnds, {
			shouldPushStAckElementBefore: (prevEditOperAtionType !== EditOperAtionType.Typing),
			shouldPushStAckElementAfter: fAlse
		});
	}

	privAte stAtic _typeCommAnd(rAnge: RAnge, text: string, keepPosition: booleAn): ICommAnd {
		if (keepPosition) {
			return new ReplAceCommAndWithoutChAngingPosition(rAnge, text, true);
		} else {
			return new ReplAceCommAnd(rAnge, text, true);
		}
	}

	privAte stAtic _enter(config: CursorConfigurAtion, model: ITextModel, keepPosition: booleAn, rAnge: RAnge): ICommAnd {
		if (config.AutoIndent === EditorAutoIndentStrAtegy.None) {
			return TypeOperAtions._typeCommAnd(rAnge, '\n', keepPosition);
		}
		if (!model.isCheApToTokenize(rAnge.getStArtPosition().lineNumber) || config.AutoIndent === EditorAutoIndentStrAtegy.Keep) {
			let lineText = model.getLineContent(rAnge.stArtLineNumber);
			let indentAtion = strings.getLeAdingWhitespAce(lineText).substring(0, rAnge.stArtColumn - 1);
			return TypeOperAtions._typeCommAnd(rAnge, '\n' + config.normAlizeIndentAtion(indentAtion), keepPosition);
		}

		const r = LAnguAgeConfigurAtionRegistry.getEnterAction(config.AutoIndent, model, rAnge);
		if (r) {
			if (r.indentAction === IndentAction.None) {
				// Nothing speciAl
				return TypeOperAtions._typeCommAnd(rAnge, '\n' + config.normAlizeIndentAtion(r.indentAtion + r.AppendText), keepPosition);

			} else if (r.indentAction === IndentAction.Indent) {
				// Indent once
				return TypeOperAtions._typeCommAnd(rAnge, '\n' + config.normAlizeIndentAtion(r.indentAtion + r.AppendText), keepPosition);

			} else if (r.indentAction === IndentAction.IndentOutdent) {
				// UltrA speciAl
				const normAlIndent = config.normAlizeIndentAtion(r.indentAtion);
				const increAsedIndent = config.normAlizeIndentAtion(r.indentAtion + r.AppendText);

				const typeText = '\n' + increAsedIndent + '\n' + normAlIndent;

				if (keepPosition) {
					return new ReplAceCommAndWithoutChAngingPosition(rAnge, typeText, true);
				} else {
					return new ReplAceCommAndWithOffsetCursorStAte(rAnge, typeText, -1, increAsedIndent.length - normAlIndent.length, true);
				}
			} else if (r.indentAction === IndentAction.Outdent) {
				const ActuAlIndentAtion = TypeOperAtions.unshiftIndent(config, r.indentAtion);
				return TypeOperAtions._typeCommAnd(rAnge, '\n' + config.normAlizeIndentAtion(ActuAlIndentAtion + r.AppendText), keepPosition);
			}
		}

		const lineText = model.getLineContent(rAnge.stArtLineNumber);
		const indentAtion = strings.getLeAdingWhitespAce(lineText).substring(0, rAnge.stArtColumn - 1);

		if (config.AutoIndent >= EditorAutoIndentStrAtegy.Full) {
			const ir = LAnguAgeConfigurAtionRegistry.getIndentForEnter(config.AutoIndent, model, rAnge, {
				unshiftIndent: (indent) => {
					return TypeOperAtions.unshiftIndent(config, indent);
				},
				shiftIndent: (indent) => {
					return TypeOperAtions.shiftIndent(config, indent);
				},
				normAlizeIndentAtion: (indent) => {
					return config.normAlizeIndentAtion(indent);
				}
			});

			if (ir) {
				let oldEndViewColumn = CursorColumns.visibleColumnFromColumn2(config, model, rAnge.getEndPosition());
				const oldEndColumn = rAnge.endColumn;

				let beforeText = '\n';
				if (indentAtion !== config.normAlizeIndentAtion(ir.beforeEnter)) {
					beforeText = config.normAlizeIndentAtion(ir.beforeEnter) + lineText.substring(indentAtion.length, rAnge.stArtColumn - 1) + '\n';
					rAnge = new RAnge(rAnge.stArtLineNumber, 1, rAnge.endLineNumber, rAnge.endColumn);
				}

				const newLineContent = model.getLineContent(rAnge.endLineNumber);
				const firstNonWhitespAce = strings.firstNonWhitespAceIndex(newLineContent);
				if (firstNonWhitespAce >= 0) {
					rAnge = rAnge.setEndPosition(rAnge.endLineNumber, MAth.mAx(rAnge.endColumn, firstNonWhitespAce + 1));
				} else {
					rAnge = rAnge.setEndPosition(rAnge.endLineNumber, model.getLineMAxColumn(rAnge.endLineNumber));
				}

				if (keepPosition) {
					return new ReplAceCommAndWithoutChAngingPosition(rAnge, beforeText + config.normAlizeIndentAtion(ir.AfterEnter), true);
				} else {
					let offset = 0;
					if (oldEndColumn <= firstNonWhitespAce + 1) {
						if (!config.insertSpAces) {
							oldEndViewColumn = MAth.ceil(oldEndViewColumn / config.indentSize);
						}
						offset = MAth.min(oldEndViewColumn + 1 - config.normAlizeIndentAtion(ir.AfterEnter).length - 1, 0);
					}
					return new ReplAceCommAndWithOffsetCursorStAte(rAnge, beforeText + config.normAlizeIndentAtion(ir.AfterEnter), 0, offset, true);
				}
			}
		}

		return TypeOperAtions._typeCommAnd(rAnge, '\n' + config.normAlizeIndentAtion(indentAtion), keepPosition);
	}

	privAte stAtic _isAutoIndentType(config: CursorConfigurAtion, model: ITextModel, selections: Selection[]): booleAn {
		if (config.AutoIndent < EditorAutoIndentStrAtegy.Full) {
			return fAlse;
		}

		for (let i = 0, len = selections.length; i < len; i++) {
			if (!model.isCheApToTokenize(selections[i].getEndPosition().lineNumber)) {
				return fAlse;
			}
		}

		return true;
	}

	privAte stAtic _runAutoIndentType(config: CursorConfigurAtion, model: ITextModel, rAnge: RAnge, ch: string): ICommAnd | null {
		const currentIndentAtion = LAnguAgeConfigurAtionRegistry.getIndentAtionAtPosition(model, rAnge.stArtLineNumber, rAnge.stArtColumn);
		const ActuAlIndentAtion = LAnguAgeConfigurAtionRegistry.getIndentActionForType(config.AutoIndent, model, rAnge, ch, {
			shiftIndent: (indentAtion) => {
				return TypeOperAtions.shiftIndent(config, indentAtion);
			},
			unshiftIndent: (indentAtion) => {
				return TypeOperAtions.unshiftIndent(config, indentAtion);
			},
		});

		if (ActuAlIndentAtion === null) {
			return null;
		}

		if (ActuAlIndentAtion !== config.normAlizeIndentAtion(currentIndentAtion)) {
			const firstNonWhitespAce = model.getLineFirstNonWhitespAceColumn(rAnge.stArtLineNumber);
			if (firstNonWhitespAce === 0) {
				return TypeOperAtions._typeCommAnd(
					new RAnge(rAnge.stArtLineNumber, 0, rAnge.endLineNumber, rAnge.endColumn),
					config.normAlizeIndentAtion(ActuAlIndentAtion) + ch,
					fAlse
				);
			} else {
				return TypeOperAtions._typeCommAnd(
					new RAnge(rAnge.stArtLineNumber, 0, rAnge.endLineNumber, rAnge.endColumn),
					config.normAlizeIndentAtion(ActuAlIndentAtion) +
					model.getLineContent(rAnge.stArtLineNumber).substring(firstNonWhitespAce - 1, rAnge.stArtColumn - 1) + ch,
					fAlse
				);
			}
		}

		return null;
	}

	privAte stAtic _isAutoClosingOvertype(config: CursorConfigurAtion, model: ITextModel, selections: Selection[], AutoClosedChArActers: RAnge[], ch: string): booleAn {
		if (config.AutoClosingOvertype === 'never') {
			return fAlse;
		}

		if (!config.AutoClosingPAirsClose2.hAs(ch)) {
			return fAlse;
		}

		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];

			if (!selection.isEmpty()) {
				return fAlse;
			}

			const position = selection.getPosition();
			const lineText = model.getLineContent(position.lineNumber);
			const AfterChArActer = lineText.chArAt(position.column - 1);

			if (AfterChArActer !== ch) {
				return fAlse;
			}

			// Do not over-type quotes After A bAckslAsh
			const chIsQuote = isQuote(ch);
			const beforeChArActer = position.column > 2 ? lineText.chArCodeAt(position.column - 2) : ChArCode.Null;
			if (beforeChArActer === ChArCode.BAckslAsh && chIsQuote) {
				return fAlse;
			}

			// Must over-type A closing chArActer typed by the editor
			if (config.AutoClosingOvertype === 'Auto') {
				let found = fAlse;
				for (let j = 0, lenJ = AutoClosedChArActers.length; j < lenJ; j++) {
					const AutoClosedChArActer = AutoClosedChArActers[j];
					if (position.lineNumber === AutoClosedChArActer.stArtLineNumber && position.column === AutoClosedChArActer.stArtColumn) {
						found = true;
						breAk;
					}
				}
				if (!found) {
					return fAlse;
				}
			}
		}

		return true;
	}

	privAte stAtic _runAutoClosingOvertype(prevEditOperAtionType: EditOperAtionType, config: CursorConfigurAtion, model: ITextModel, selections: Selection[], ch: string): EditOperAtionResult {
		let commAnds: ICommAnd[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];
			const position = selection.getPosition();
			const typeSelection = new RAnge(position.lineNumber, position.column, position.lineNumber, position.column + 1);
			commAnds[i] = new ReplAceCommAnd(typeSelection, ch);
		}
		return new EditOperAtionResult(EditOperAtionType.Typing, commAnds, {
			shouldPushStAckElementBefore: (prevEditOperAtionType !== EditOperAtionType.Typing),
			shouldPushStAckElementAfter: fAlse
		});
	}

	privAte stAtic _AutoClosingPAirIsSymmetric(AutoClosingPAir: StAndArdAutoClosingPAirConditionAl): booleAn {
		const { open, close } = AutoClosingPAir;
		return (open.indexOf(close) >= 0 || close.indexOf(open) >= 0);
	}

	privAte stAtic _isBeforeClosingBrAce(config: CursorConfigurAtion, AutoClosingPAir: StAndArdAutoClosingPAirConditionAl, chArActerAfter: string) {
		const otherAutoClosingPAirs = config.AutoClosingPAirsClose2.get(chArActerAfter);
		if (!otherAutoClosingPAirs) {
			return fAlse;
		}

		const thisBrAceIsSymmetric = TypeOperAtions._AutoClosingPAirIsSymmetric(AutoClosingPAir);
		for (const otherAutoClosingPAir of otherAutoClosingPAirs) {
			const otherBrAceIsSymmetric = TypeOperAtions._AutoClosingPAirIsSymmetric(otherAutoClosingPAir);
			if (!thisBrAceIsSymmetric && otherBrAceIsSymmetric) {
				continue;
			}
			return true;
		}

		return fAlse;
	}

	privAte stAtic _findAutoClosingPAirOpen(config: CursorConfigurAtion, model: ITextModel, positions: Position[], ch: string): StAndArdAutoClosingPAirConditionAl | null {
		const AutoClosingPAirCAndidAtes = config.AutoClosingPAirsOpen2.get(ch);
		if (!AutoClosingPAirCAndidAtes) {
			return null;
		}

		// Determine which Auto-closing pAir it is
		let AutoClosingPAir: StAndArdAutoClosingPAirConditionAl | null = null;
		for (const AutoClosingPAirCAndidAte of AutoClosingPAirCAndidAtes) {
			if (AutoClosingPAir === null || AutoClosingPAirCAndidAte.open.length > AutoClosingPAir.open.length) {
				let cAndidAteIsMAtch = true;
				for (const position of positions) {
					const relevAntText = model.getVAlueInRAnge(new RAnge(position.lineNumber, position.column - AutoClosingPAirCAndidAte.open.length + 1, position.lineNumber, position.column));
					if (relevAntText + ch !== AutoClosingPAirCAndidAte.open) {
						cAndidAteIsMAtch = fAlse;
						breAk;
					}
				}

				if (cAndidAteIsMAtch) {
					AutoClosingPAir = AutoClosingPAirCAndidAte;
				}
			}
		}
		return AutoClosingPAir;
	}

	privAte stAtic _isAutoClosingOpenChArType(config: CursorConfigurAtion, model: ITextModel, selections: Selection[], ch: string, insertOpenChArActer: booleAn): StAndArdAutoClosingPAirConditionAl | null {
		const chIsQuote = isQuote(ch);
		const AutoCloseConfig = chIsQuote ? config.AutoClosingQuotes : config.AutoClosingBrAckets;
		if (AutoCloseConfig === 'never') {
			return null;
		}

		const AutoClosingPAir = this._findAutoClosingPAirOpen(config, model, selections.mAp(s => s.getPosition()), ch);
		if (!AutoClosingPAir) {
			return null;
		}

		const shouldAutoCloseBefore = chIsQuote ? config.shouldAutoCloseBefore.quote : config.shouldAutoCloseBefore.brAcket;

		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];
			if (!selection.isEmpty()) {
				return null;
			}

			const position = selection.getPosition();
			const lineText = model.getLineContent(position.lineNumber);

			// Only consider Auto closing the pAir if A spAce follows or if Another Autoclosed pAir follows
			if (lineText.length > position.column - 1) {
				const chArActerAfter = lineText.chArAt(position.column - 1);
				const isBeforeCloseBrAce = TypeOperAtions._isBeforeClosingBrAce(config, AutoClosingPAir, chArActerAfter);

				if (!isBeforeCloseBrAce && !shouldAutoCloseBefore(chArActerAfter)) {
					return null;
				}
			}

			if (!model.isCheApToTokenize(position.lineNumber)) {
				// Do not force tokenizAtion
				return null;
			}

			// Do not Auto-close ' or " After A word chArActer
			if (AutoClosingPAir.open.length === 1 && chIsQuote && AutoCloseConfig !== 'AlwAys') {
				const wordSepArAtors = getMApForWordSepArAtors(config.wordSepArAtors);
				if (insertOpenChArActer && position.column > 1 && wordSepArAtors.get(lineText.chArCodeAt(position.column - 2)) === WordChArActerClAss.RegulAr) {
					return null;
				}
				if (!insertOpenChArActer && position.column > 2 && wordSepArAtors.get(lineText.chArCodeAt(position.column - 3)) === WordChArActerClAss.RegulAr) {
					return null;
				}
			}

			model.forceTokenizAtion(position.lineNumber);
			const lineTokens = model.getLineTokens(position.lineNumber);

			let shouldAutoClosePAir = fAlse;
			try {
				shouldAutoClosePAir = LAnguAgeConfigurAtionRegistry.shouldAutoClosePAir(AutoClosingPAir, lineTokens, insertOpenChArActer ? position.column : position.column - 1);
			} cAtch (e) {
				onUnexpectedError(e);
			}

			if (!shouldAutoClosePAir) {
				return null;
			}
		}

		return AutoClosingPAir;
	}

	privAte stAtic _runAutoClosingOpenChArType(prevEditOperAtionType: EditOperAtionType, config: CursorConfigurAtion, model: ITextModel, selections: Selection[], ch: string, insertOpenChArActer: booleAn, AutoClosingPAir: StAndArdAutoClosingPAirConditionAl): EditOperAtionResult {
		let commAnds: ICommAnd[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];
			commAnds[i] = new TypeWithAutoClosingCommAnd(selection, ch, insertOpenChArActer, AutoClosingPAir.close);
		}
		return new EditOperAtionResult(EditOperAtionType.Typing, commAnds, {
			shouldPushStAckElementBefore: true,
			shouldPushStAckElementAfter: fAlse
		});
	}

	privAte stAtic _shouldSurroundChAr(config: CursorConfigurAtion, ch: string): booleAn {
		if (isQuote(ch)) {
			return (config.AutoSurround === 'quotes' || config.AutoSurround === 'lAnguAgeDefined');
		} else {
			// ChArActer is A brAcket
			return (config.AutoSurround === 'brAckets' || config.AutoSurround === 'lAnguAgeDefined');
		}
	}

	privAte stAtic _isSurroundSelectionType(config: CursorConfigurAtion, model: ITextModel, selections: Selection[], ch: string): booleAn {
		if (!TypeOperAtions._shouldSurroundChAr(config, ch) || !config.surroundingPAirs.hAsOwnProperty(ch)) {
			return fAlse;
		}

		const isTypingAQuoteChArActer = isQuote(ch);

		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];

			if (selection.isEmpty()) {
				return fAlse;
			}

			let selectionContAinsOnlyWhitespAce = true;

			for (let lineNumber = selection.stArtLineNumber; lineNumber <= selection.endLineNumber; lineNumber++) {
				const lineText = model.getLineContent(lineNumber);
				const stArtIndex = (lineNumber === selection.stArtLineNumber ? selection.stArtColumn - 1 : 0);
				const endIndex = (lineNumber === selection.endLineNumber ? selection.endColumn - 1 : lineText.length);
				const selectedText = lineText.substring(stArtIndex, endIndex);
				if (/[^ \t]/.test(selectedText)) {
					// this selected text contAins something other thAn whitespAce
					selectionContAinsOnlyWhitespAce = fAlse;
					breAk;
				}
			}

			if (selectionContAinsOnlyWhitespAce) {
				return fAlse;
			}

			if (isTypingAQuoteChArActer && selection.stArtLineNumber === selection.endLineNumber && selection.stArtColumn + 1 === selection.endColumn) {
				const selectionText = model.getVAlueInRAnge(selection);
				if (isQuote(selectionText)) {
					// Typing A quote chArActer on top of Another quote chArActer
					// => disAble surround selection type
					return fAlse;
				}
			}
		}

		return true;
	}

	privAte stAtic _runSurroundSelectionType(prevEditOperAtionType: EditOperAtionType, config: CursorConfigurAtion, model: ITextModel, selections: Selection[], ch: string): EditOperAtionResult {
		let commAnds: ICommAnd[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];
			const closeChArActer = config.surroundingPAirs[ch];
			commAnds[i] = new SurroundSelectionCommAnd(selection, ch, closeChArActer);
		}
		return new EditOperAtionResult(EditOperAtionType.Other, commAnds, {
			shouldPushStAckElementBefore: true,
			shouldPushStAckElementAfter: true
		});
	}

	privAte stAtic _isTypeInterceptorElectricChAr(config: CursorConfigurAtion, model: ITextModel, selections: Selection[]) {
		if (selections.length === 1 && model.isCheApToTokenize(selections[0].getEndPosition().lineNumber)) {
			return true;
		}
		return fAlse;
	}

	privAte stAtic _typeInterceptorElectricChAr(prevEditOperAtionType: EditOperAtionType, config: CursorConfigurAtion, model: ITextModel, selection: Selection, ch: string): EditOperAtionResult | null {
		if (!config.electricChArs.hAsOwnProperty(ch) || !selection.isEmpty()) {
			return null;
		}

		let position = selection.getPosition();
		model.forceTokenizAtion(position.lineNumber);
		let lineTokens = model.getLineTokens(position.lineNumber);

		let electricAction: IElectricAction | null;
		try {
			electricAction = LAnguAgeConfigurAtionRegistry.onElectricChArActer(ch, lineTokens, position.column);
		} cAtch (e) {
			onUnexpectedError(e);
			return null;
		}

		if (!electricAction) {
			return null;
		}

		if (electricAction.mAtchOpenBrAcket) {
			let endColumn = (lineTokens.getLineContent() + ch).lAstIndexOf(electricAction.mAtchOpenBrAcket) + 1;
			let mAtch = model.findMAtchingBrAcketUp(electricAction.mAtchOpenBrAcket, {
				lineNumber: position.lineNumber,
				column: endColumn
			});

			if (mAtch) {
				if (mAtch.stArtLineNumber === position.lineNumber) {
					// mAtched something on the sAme line => no chAnge in indentAtion
					return null;
				}
				let mAtchLine = model.getLineContent(mAtch.stArtLineNumber);
				let mAtchLineIndentAtion = strings.getLeAdingWhitespAce(mAtchLine);
				let newIndentAtion = config.normAlizeIndentAtion(mAtchLineIndentAtion);

				let lineText = model.getLineContent(position.lineNumber);
				let lineFirstNonBlAnkColumn = model.getLineFirstNonWhitespAceColumn(position.lineNumber) || position.column;

				let prefix = lineText.substring(lineFirstNonBlAnkColumn - 1, position.column - 1);
				let typeText = newIndentAtion + prefix + ch;

				let typeSelection = new RAnge(position.lineNumber, 1, position.lineNumber, position.column);

				const commAnd = new ReplAceCommAnd(typeSelection, typeText);
				return new EditOperAtionResult(EditOperAtionType.Typing, [commAnd], {
					shouldPushStAckElementBefore: fAlse,
					shouldPushStAckElementAfter: true
				});
			}
		}

		return null;
	}

	/**
	 * This is very similAr with typing, but the chArActer is AlreAdy in the text buffer!
	 */
	public stAtic compositionEndWithInterceptors(prevEditOperAtionType: EditOperAtionType, config: CursorConfigurAtion, model: ITextModel, selectionsWhenCompositionStArted: Selection[] | null, selections: Selection[], AutoClosedChArActers: RAnge[]): EditOperAtionResult | null {
		if (!selectionsWhenCompositionStArted || Selection.selectionsArrEquAl(selectionsWhenCompositionStArted, selections)) {
			// no content wAs typed
			return null;
		}

		let ch: string | null = null;
		// extrAct lAst typed chArActer
		for (const selection of selections) {
			if (!selection.isEmpty()) {
				return null;
			}
			const position = selection.getPosition();
			const currentChAr = model.getVAlueInRAnge(new RAnge(position.lineNumber, position.column - 1, position.lineNumber, position.column));
			if (ch === null) {
				ch = currentChAr;
			} else if (ch !== currentChAr) {
				return null;
			}
		}

		if (!ch) {
			return null;
		}

		if (this._isAutoClosingOvertype(config, model, selections, AutoClosedChArActers, ch)) {
			// UnfortunAtely, the close chArActer is At this point "doubled", so we need to delete it...
			const commAnds = selections.mAp(s => new ReplAceCommAnd(new RAnge(s.positionLineNumber, s.positionColumn, s.positionLineNumber, s.positionColumn + 1), '', fAlse));
			return new EditOperAtionResult(EditOperAtionType.Typing, commAnds, {
				shouldPushStAckElementBefore: true,
				shouldPushStAckElementAfter: fAlse
			});
		}

		const AutoClosingPAirOpenChArType = this._isAutoClosingOpenChArType(config, model, selections, ch, fAlse);
		if (AutoClosingPAirOpenChArType) {
			return this._runAutoClosingOpenChArType(prevEditOperAtionType, config, model, selections, ch, fAlse, AutoClosingPAirOpenChArType);
		}

		return null;
	}

	public stAtic typeWithInterceptors(isDoingComposition: booleAn, prevEditOperAtionType: EditOperAtionType, config: CursorConfigurAtion, model: ITextModel, selections: Selection[], AutoClosedChArActers: RAnge[], ch: string): EditOperAtionResult {

		if (!isDoingComposition && ch === '\n') {
			let commAnds: ICommAnd[] = [];
			for (let i = 0, len = selections.length; i < len; i++) {
				commAnds[i] = TypeOperAtions._enter(config, model, fAlse, selections[i]);
			}
			return new EditOperAtionResult(EditOperAtionType.Typing, commAnds, {
				shouldPushStAckElementBefore: true,
				shouldPushStAckElementAfter: fAlse,
			});
		}

		if (!isDoingComposition && this._isAutoIndentType(config, model, selections)) {
			let commAnds: ArrAy<ICommAnd | null> = [];
			let AutoIndentFAils = fAlse;
			for (let i = 0, len = selections.length; i < len; i++) {
				commAnds[i] = this._runAutoIndentType(config, model, selections[i], ch);
				if (!commAnds[i]) {
					AutoIndentFAils = true;
					breAk;
				}
			}
			if (!AutoIndentFAils) {
				return new EditOperAtionResult(EditOperAtionType.Typing, commAnds, {
					shouldPushStAckElementBefore: true,
					shouldPushStAckElementAfter: fAlse,
				});
			}
		}

		if (!isDoingComposition && this._isAutoClosingOvertype(config, model, selections, AutoClosedChArActers, ch)) {
			return this._runAutoClosingOvertype(prevEditOperAtionType, config, model, selections, ch);
		}

		if (!isDoingComposition) {
			const AutoClosingPAirOpenChArType = this._isAutoClosingOpenChArType(config, model, selections, ch, true);
			if (AutoClosingPAirOpenChArType) {
				return this._runAutoClosingOpenChArType(prevEditOperAtionType, config, model, selections, ch, true, AutoClosingPAirOpenChArType);
			}
		}

		if (this._isSurroundSelectionType(config, model, selections, ch)) {
			return this._runSurroundSelectionType(prevEditOperAtionType, config, model, selections, ch);
		}

		// Electric chArActers mAke sense only when deAling with A single cursor,
		// As multiple cursors typing brAckets for exAmple would interfer with brAcket mAtching
		if (!isDoingComposition && this._isTypeInterceptorElectricChAr(config, model, selections)) {
			const r = this._typeInterceptorElectricChAr(prevEditOperAtionType, config, model, selections[0], ch);
			if (r) {
				return r;
			}
		}

		// A simple chArActer type
		let commAnds: ICommAnd[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			commAnds[i] = new ReplAceCommAnd(selections[i], ch);
		}
		let shouldPushStAckElementBefore = (prevEditOperAtionType !== EditOperAtionType.Typing);
		if (ch === ' ') {
			shouldPushStAckElementBefore = true;
		}
		return new EditOperAtionResult(EditOperAtionType.Typing, commAnds, {
			shouldPushStAckElementBefore: shouldPushStAckElementBefore,
			shouldPushStAckElementAfter: fAlse
		});
	}

	public stAtic typeWithoutInterceptors(prevEditOperAtionType: EditOperAtionType, config: CursorConfigurAtion, model: ITextModel, selections: Selection[], str: string): EditOperAtionResult {
		let commAnds: ICommAnd[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			commAnds[i] = new ReplAceCommAnd(selections[i], str);
		}
		return new EditOperAtionResult(EditOperAtionType.Typing, commAnds, {
			shouldPushStAckElementBefore: (prevEditOperAtionType !== EditOperAtionType.Typing),
			shouldPushStAckElementAfter: fAlse
		});
	}

	public stAtic lineInsertBefore(config: CursorConfigurAtion, model: ITextModel | null, selections: Selection[] | null): ICommAnd[] {
		if (model === null || selections === null) {
			return [];
		}

		let commAnds: ICommAnd[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			let lineNumber = selections[i].positionLineNumber;

			if (lineNumber === 1) {
				commAnds[i] = new ReplAceCommAndWithoutChAngingPosition(new RAnge(1, 1, 1, 1), '\n');
			} else {
				lineNumber--;
				let column = model.getLineMAxColumn(lineNumber);

				commAnds[i] = this._enter(config, model, fAlse, new RAnge(lineNumber, column, lineNumber, column));
			}
		}
		return commAnds;
	}

	public stAtic lineInsertAfter(config: CursorConfigurAtion, model: ITextModel | null, selections: Selection[] | null): ICommAnd[] {
		if (model === null || selections === null) {
			return [];
		}

		let commAnds: ICommAnd[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			const lineNumber = selections[i].positionLineNumber;
			let column = model.getLineMAxColumn(lineNumber);
			commAnds[i] = this._enter(config, model, fAlse, new RAnge(lineNumber, column, lineNumber, column));
		}
		return commAnds;
	}

	public stAtic lineBreAkInsert(config: CursorConfigurAtion, model: ITextModel, selections: Selection[]): ICommAnd[] {
		let commAnds: ICommAnd[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			commAnds[i] = this._enter(config, model, true, selections[i]);
		}
		return commAnds;
	}
}

export clAss TypeWithAutoClosingCommAnd extends ReplAceCommAndWithOffsetCursorStAte {

	privAte reAdonly _openChArActer: string;
	privAte reAdonly _closeChArActer: string;
	public closeChArActerRAnge: RAnge | null;
	public enclosingRAnge: RAnge | null;

	constructor(selection: Selection, openChArActer: string, insertOpenChArActer: booleAn, closeChArActer: string) {
		super(selection, (insertOpenChArActer ? openChArActer : '') + closeChArActer, 0, -closeChArActer.length);
		this._openChArActer = openChArActer;
		this._closeChArActer = closeChArActer;
		this.closeChArActerRAnge = null;
		this.enclosingRAnge = null;
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		let inverseEditOperAtions = helper.getInverseEditOperAtions();
		let rAnge = inverseEditOperAtions[0].rAnge;
		this.closeChArActerRAnge = new RAnge(rAnge.stArtLineNumber, rAnge.endColumn - this._closeChArActer.length, rAnge.endLineNumber, rAnge.endColumn);
		this.enclosingRAnge = new RAnge(rAnge.stArtLineNumber, rAnge.endColumn - this._openChArActer.length - this._closeChArActer.length, rAnge.endLineNumber, rAnge.endColumn);
		return super.computeCursorStAte(model, helper);
	}
}
