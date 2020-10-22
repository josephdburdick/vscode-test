/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/Base/common/charCode';
import { onUnexpectedError } from 'vs/Base/common/errors';
import * as strings from 'vs/Base/common/strings';
import { ReplaceCommand, ReplaceCommandWithOffsetCursorState, ReplaceCommandWithoutChangingPosition, ReplaceCommandThatPreservesSelection } from 'vs/editor/common/commands/replaceCommand';
import { ShiftCommand } from 'vs/editor/common/commands/shiftCommand';
import { SurroundSelectionCommand } from 'vs/editor/common/commands/surroundSelectionCommand';
import { CursorColumns, CursorConfiguration, EditOperationResult, EditOperationType, ICursorSimpleModel, isQuote } from 'vs/editor/common/controller/cursorCommon';
import { WordCharacterClass, getMapForWordSeparators } from 'vs/editor/common/controller/wordCharacterClassifier';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { Position } from 'vs/editor/common/core/position';
import { ICommand, ICursorStateComputerData } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { EnterAction, IndentAction, StandardAutoClosingPairConditional } from 'vs/editor/common/modes/languageConfiguration';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { IElectricAction } from 'vs/editor/common/modes/supports/electricCharacter';
import { EditorAutoIndentStrategy } from 'vs/editor/common/config/editorOptions';

export class TypeOperations {

	puBlic static indent(config: CursorConfiguration, model: ICursorSimpleModel | null, selections: Selection[] | null): ICommand[] {
		if (model === null || selections === null) {
			return [];
		}

		let commands: ICommand[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			commands[i] = new ShiftCommand(selections[i], {
				isUnshift: false,
				taBSize: config.taBSize,
				indentSize: config.indentSize,
				insertSpaces: config.insertSpaces,
				useTaBStops: config.useTaBStops,
				autoIndent: config.autoIndent
			});
		}
		return commands;
	}

	puBlic static outdent(config: CursorConfiguration, model: ICursorSimpleModel, selections: Selection[]): ICommand[] {
		let commands: ICommand[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			commands[i] = new ShiftCommand(selections[i], {
				isUnshift: true,
				taBSize: config.taBSize,
				indentSize: config.indentSize,
				insertSpaces: config.insertSpaces,
				useTaBStops: config.useTaBStops,
				autoIndent: config.autoIndent
			});
		}
		return commands;
	}

	puBlic static shiftIndent(config: CursorConfiguration, indentation: string, count?: numBer): string {
		count = count || 1;
		return ShiftCommand.shiftIndent(indentation, indentation.length + count, config.taBSize, config.indentSize, config.insertSpaces);
	}

	puBlic static unshiftIndent(config: CursorConfiguration, indentation: string, count?: numBer): string {
		count = count || 1;
		return ShiftCommand.unshiftIndent(indentation, indentation.length + count, config.taBSize, config.indentSize, config.insertSpaces);
	}

	private static _distriButedPaste(config: CursorConfiguration, model: ICursorSimpleModel, selections: Selection[], text: string[]): EditOperationResult {
		let commands: ICommand[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			commands[i] = new ReplaceCommand(selections[i], text[i]);
		}
		return new EditOperationResult(EditOperationType.Other, commands, {
			shouldPushStackElementBefore: true,
			shouldPushStackElementAfter: true
		});
	}

	private static _simplePaste(config: CursorConfiguration, model: ICursorSimpleModel, selections: Selection[], text: string, pasteOnNewLine: Boolean): EditOperationResult {
		let commands: ICommand[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];
			let position = selection.getPosition();

			if (pasteOnNewLine && !selection.isEmpty()) {
				pasteOnNewLine = false;
			}
			if (pasteOnNewLine && text.indexOf('\n') !== text.length - 1) {
				pasteOnNewLine = false;
			}

			if (pasteOnNewLine) {
				// Paste entire line at the Beginning of line
				let typeSelection = new Range(position.lineNumBer, 1, position.lineNumBer, 1);
				commands[i] = new ReplaceCommandThatPreservesSelection(typeSelection, text, selection, true);
			} else {
				commands[i] = new ReplaceCommand(selection, text);
			}
		}
		return new EditOperationResult(EditOperationType.Other, commands, {
			shouldPushStackElementBefore: true,
			shouldPushStackElementAfter: true
		});
	}

	private static _distriButePasteToCursors(config: CursorConfiguration, selections: Selection[], text: string, pasteOnNewLine: Boolean, multicursorText: string[]): string[] | null {
		if (pasteOnNewLine) {
			return null;
		}

		if (selections.length === 1) {
			return null;
		}

		if (multicursorText && multicursorText.length === selections.length) {
			return multicursorText;
		}

		if (config.multiCursorPaste === 'spread') {
			// Try to spread the pasted text in case the line count matches the cursor count
			// Remove trailing \n if present
			if (text.charCodeAt(text.length - 1) === CharCode.LineFeed) {
				text = text.suBstr(0, text.length - 1);
			}
			// Remove trailing \r if present
			if (text.charCodeAt(text.length - 1) === CharCode.CarriageReturn) {
				text = text.suBstr(0, text.length - 1);
			}
			let lines = text.split(/\r\n|\r|\n/);
			if (lines.length === selections.length) {
				return lines;
			}
		}

		return null;
	}

	puBlic static paste(config: CursorConfiguration, model: ICursorSimpleModel, selections: Selection[], text: string, pasteOnNewLine: Boolean, multicursorText: string[]): EditOperationResult {
		const distriButedPaste = this._distriButePasteToCursors(config, selections, text, pasteOnNewLine, multicursorText);

		if (distriButedPaste) {
			selections = selections.sort(Range.compareRangesUsingStarts);
			return this._distriButedPaste(config, model, selections, distriButedPaste);
		} else {
			return this._simplePaste(config, model, selections, text, pasteOnNewLine);
		}
	}

	private static _goodIndentForLine(config: CursorConfiguration, model: ITextModel, lineNumBer: numBer): string | null {
		let action: IndentAction | EnterAction | null = null;
		let indentation: string = '';

		const expectedIndentAction = LanguageConfigurationRegistry.getInheritIndentForLine(config.autoIndent, model, lineNumBer, false);
		if (expectedIndentAction) {
			action = expectedIndentAction.action;
			indentation = expectedIndentAction.indentation;
		} else if (lineNumBer > 1) {
			let lastLineNumBer: numBer;
			for (lastLineNumBer = lineNumBer - 1; lastLineNumBer >= 1; lastLineNumBer--) {
				const lineText = model.getLineContent(lastLineNumBer);
				const nonWhitespaceIdx = strings.lastNonWhitespaceIndex(lineText);
				if (nonWhitespaceIdx >= 0) {
					Break;
				}
			}

			if (lastLineNumBer < 1) {
				// No previous line with content found
				return null;
			}

			const maxColumn = model.getLineMaxColumn(lastLineNumBer);
			const expectedEnterAction = LanguageConfigurationRegistry.getEnterAction(config.autoIndent, model, new Range(lastLineNumBer, maxColumn, lastLineNumBer, maxColumn));
			if (expectedEnterAction) {
				indentation = expectedEnterAction.indentation + expectedEnterAction.appendText;
			}
		}

		if (action) {
			if (action === IndentAction.Indent) {
				indentation = TypeOperations.shiftIndent(config, indentation);
			}

			if (action === IndentAction.Outdent) {
				indentation = TypeOperations.unshiftIndent(config, indentation);
			}

			indentation = config.normalizeIndentation(indentation);
		}

		if (!indentation) {
			return null;
		}

		return indentation;
	}

	private static _replaceJumpToNextIndent(config: CursorConfiguration, model: ICursorSimpleModel, selection: Selection, insertsAutoWhitespace: Boolean): ReplaceCommand {
		let typeText = '';

		let position = selection.getStartPosition();
		if (config.insertSpaces) {
			let visiBleColumnFromColumn = CursorColumns.visiBleColumnFromColumn2(config, model, position);
			let indentSize = config.indentSize;
			let spacesCnt = indentSize - (visiBleColumnFromColumn % indentSize);
			for (let i = 0; i < spacesCnt; i++) {
				typeText += ' ';
			}
		} else {
			typeText = '\t';
		}

		return new ReplaceCommand(selection, typeText, insertsAutoWhitespace);
	}

	puBlic static taB(config: CursorConfiguration, model: ITextModel, selections: Selection[]): ICommand[] {
		let commands: ICommand[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];

			if (selection.isEmpty()) {

				let lineText = model.getLineContent(selection.startLineNumBer);

				if (/^\s*$/.test(lineText) && model.isCheapToTokenize(selection.startLineNumBer)) {
					let goodIndent = this._goodIndentForLine(config, model, selection.startLineNumBer);
					goodIndent = goodIndent || '\t';
					let possiBleTypeText = config.normalizeIndentation(goodIndent);
					if (!lineText.startsWith(possiBleTypeText)) {
						commands[i] = new ReplaceCommand(new Range(selection.startLineNumBer, 1, selection.startLineNumBer, lineText.length + 1), possiBleTypeText, true);
						continue;
					}
				}

				commands[i] = this._replaceJumpToNextIndent(config, model, selection, true);
			} else {
				if (selection.startLineNumBer === selection.endLineNumBer) {
					let lineMaxColumn = model.getLineMaxColumn(selection.startLineNumBer);
					if (selection.startColumn !== 1 || selection.endColumn !== lineMaxColumn) {
						// This is a single line selection that is not the entire line
						commands[i] = this._replaceJumpToNextIndent(config, model, selection, false);
						continue;
					}
				}

				commands[i] = new ShiftCommand(selection, {
					isUnshift: false,
					taBSize: config.taBSize,
					indentSize: config.indentSize,
					insertSpaces: config.insertSpaces,
					useTaBStops: config.useTaBStops,
					autoIndent: config.autoIndent
				});
			}
		}
		return commands;
	}

	puBlic static replacePreviousChar(prevEditOperationType: EditOperationType, config: CursorConfiguration, model: ITextModel, selections: Selection[], txt: string, replaceCharCnt: numBer): EditOperationResult {
		let commands: Array<ICommand | null> = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];
			if (!selection.isEmpty()) {
				// looks like https://githuB.com/microsoft/vscode/issues/2773
				// where a cursor operation occurred Before a canceled composition
				// => ignore composition
				commands[i] = null;
				continue;
			}
			const pos = selection.getPosition();
			const startColumn = Math.max(1, pos.column - replaceCharCnt);
			const range = new Range(pos.lineNumBer, startColumn, pos.lineNumBer, pos.column);
			const oldText = model.getValueInRange(range);
			if (oldText === txt) {
				// => ignore composition that doesn't do anything
				commands[i] = null;
				continue;
			}
			commands[i] = new ReplaceCommand(range, txt);
		}
		return new EditOperationResult(EditOperationType.Typing, commands, {
			shouldPushStackElementBefore: (prevEditOperationType !== EditOperationType.Typing),
			shouldPushStackElementAfter: false
		});
	}

	private static _typeCommand(range: Range, text: string, keepPosition: Boolean): ICommand {
		if (keepPosition) {
			return new ReplaceCommandWithoutChangingPosition(range, text, true);
		} else {
			return new ReplaceCommand(range, text, true);
		}
	}

	private static _enter(config: CursorConfiguration, model: ITextModel, keepPosition: Boolean, range: Range): ICommand {
		if (config.autoIndent === EditorAutoIndentStrategy.None) {
			return TypeOperations._typeCommand(range, '\n', keepPosition);
		}
		if (!model.isCheapToTokenize(range.getStartPosition().lineNumBer) || config.autoIndent === EditorAutoIndentStrategy.Keep) {
			let lineText = model.getLineContent(range.startLineNumBer);
			let indentation = strings.getLeadingWhitespace(lineText).suBstring(0, range.startColumn - 1);
			return TypeOperations._typeCommand(range, '\n' + config.normalizeIndentation(indentation), keepPosition);
		}

		const r = LanguageConfigurationRegistry.getEnterAction(config.autoIndent, model, range);
		if (r) {
			if (r.indentAction === IndentAction.None) {
				// Nothing special
				return TypeOperations._typeCommand(range, '\n' + config.normalizeIndentation(r.indentation + r.appendText), keepPosition);

			} else if (r.indentAction === IndentAction.Indent) {
				// Indent once
				return TypeOperations._typeCommand(range, '\n' + config.normalizeIndentation(r.indentation + r.appendText), keepPosition);

			} else if (r.indentAction === IndentAction.IndentOutdent) {
				// Ultra special
				const normalIndent = config.normalizeIndentation(r.indentation);
				const increasedIndent = config.normalizeIndentation(r.indentation + r.appendText);

				const typeText = '\n' + increasedIndent + '\n' + normalIndent;

				if (keepPosition) {
					return new ReplaceCommandWithoutChangingPosition(range, typeText, true);
				} else {
					return new ReplaceCommandWithOffsetCursorState(range, typeText, -1, increasedIndent.length - normalIndent.length, true);
				}
			} else if (r.indentAction === IndentAction.Outdent) {
				const actualIndentation = TypeOperations.unshiftIndent(config, r.indentation);
				return TypeOperations._typeCommand(range, '\n' + config.normalizeIndentation(actualIndentation + r.appendText), keepPosition);
			}
		}

		const lineText = model.getLineContent(range.startLineNumBer);
		const indentation = strings.getLeadingWhitespace(lineText).suBstring(0, range.startColumn - 1);

		if (config.autoIndent >= EditorAutoIndentStrategy.Full) {
			const ir = LanguageConfigurationRegistry.getIndentForEnter(config.autoIndent, model, range, {
				unshiftIndent: (indent) => {
					return TypeOperations.unshiftIndent(config, indent);
				},
				shiftIndent: (indent) => {
					return TypeOperations.shiftIndent(config, indent);
				},
				normalizeIndentation: (indent) => {
					return config.normalizeIndentation(indent);
				}
			});

			if (ir) {
				let oldEndViewColumn = CursorColumns.visiBleColumnFromColumn2(config, model, range.getEndPosition());
				const oldEndColumn = range.endColumn;

				let BeforeText = '\n';
				if (indentation !== config.normalizeIndentation(ir.BeforeEnter)) {
					BeforeText = config.normalizeIndentation(ir.BeforeEnter) + lineText.suBstring(indentation.length, range.startColumn - 1) + '\n';
					range = new Range(range.startLineNumBer, 1, range.endLineNumBer, range.endColumn);
				}

				const newLineContent = model.getLineContent(range.endLineNumBer);
				const firstNonWhitespace = strings.firstNonWhitespaceIndex(newLineContent);
				if (firstNonWhitespace >= 0) {
					range = range.setEndPosition(range.endLineNumBer, Math.max(range.endColumn, firstNonWhitespace + 1));
				} else {
					range = range.setEndPosition(range.endLineNumBer, model.getLineMaxColumn(range.endLineNumBer));
				}

				if (keepPosition) {
					return new ReplaceCommandWithoutChangingPosition(range, BeforeText + config.normalizeIndentation(ir.afterEnter), true);
				} else {
					let offset = 0;
					if (oldEndColumn <= firstNonWhitespace + 1) {
						if (!config.insertSpaces) {
							oldEndViewColumn = Math.ceil(oldEndViewColumn / config.indentSize);
						}
						offset = Math.min(oldEndViewColumn + 1 - config.normalizeIndentation(ir.afterEnter).length - 1, 0);
					}
					return new ReplaceCommandWithOffsetCursorState(range, BeforeText + config.normalizeIndentation(ir.afterEnter), 0, offset, true);
				}
			}
		}

		return TypeOperations._typeCommand(range, '\n' + config.normalizeIndentation(indentation), keepPosition);
	}

	private static _isAutoIndentType(config: CursorConfiguration, model: ITextModel, selections: Selection[]): Boolean {
		if (config.autoIndent < EditorAutoIndentStrategy.Full) {
			return false;
		}

		for (let i = 0, len = selections.length; i < len; i++) {
			if (!model.isCheapToTokenize(selections[i].getEndPosition().lineNumBer)) {
				return false;
			}
		}

		return true;
	}

	private static _runAutoIndentType(config: CursorConfiguration, model: ITextModel, range: Range, ch: string): ICommand | null {
		const currentIndentation = LanguageConfigurationRegistry.getIndentationAtPosition(model, range.startLineNumBer, range.startColumn);
		const actualIndentation = LanguageConfigurationRegistry.getIndentActionForType(config.autoIndent, model, range, ch, {
			shiftIndent: (indentation) => {
				return TypeOperations.shiftIndent(config, indentation);
			},
			unshiftIndent: (indentation) => {
				return TypeOperations.unshiftIndent(config, indentation);
			},
		});

		if (actualIndentation === null) {
			return null;
		}

		if (actualIndentation !== config.normalizeIndentation(currentIndentation)) {
			const firstNonWhitespace = model.getLineFirstNonWhitespaceColumn(range.startLineNumBer);
			if (firstNonWhitespace === 0) {
				return TypeOperations._typeCommand(
					new Range(range.startLineNumBer, 0, range.endLineNumBer, range.endColumn),
					config.normalizeIndentation(actualIndentation) + ch,
					false
				);
			} else {
				return TypeOperations._typeCommand(
					new Range(range.startLineNumBer, 0, range.endLineNumBer, range.endColumn),
					config.normalizeIndentation(actualIndentation) +
					model.getLineContent(range.startLineNumBer).suBstring(firstNonWhitespace - 1, range.startColumn - 1) + ch,
					false
				);
			}
		}

		return null;
	}

	private static _isAutoClosingOvertype(config: CursorConfiguration, model: ITextModel, selections: Selection[], autoClosedCharacters: Range[], ch: string): Boolean {
		if (config.autoClosingOvertype === 'never') {
			return false;
		}

		if (!config.autoClosingPairsClose2.has(ch)) {
			return false;
		}

		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];

			if (!selection.isEmpty()) {
				return false;
			}

			const position = selection.getPosition();
			const lineText = model.getLineContent(position.lineNumBer);
			const afterCharacter = lineText.charAt(position.column - 1);

			if (afterCharacter !== ch) {
				return false;
			}

			// Do not over-type quotes after a Backslash
			const chIsQuote = isQuote(ch);
			const BeforeCharacter = position.column > 2 ? lineText.charCodeAt(position.column - 2) : CharCode.Null;
			if (BeforeCharacter === CharCode.Backslash && chIsQuote) {
				return false;
			}

			// Must over-type a closing character typed By the editor
			if (config.autoClosingOvertype === 'auto') {
				let found = false;
				for (let j = 0, lenJ = autoClosedCharacters.length; j < lenJ; j++) {
					const autoClosedCharacter = autoClosedCharacters[j];
					if (position.lineNumBer === autoClosedCharacter.startLineNumBer && position.column === autoClosedCharacter.startColumn) {
						found = true;
						Break;
					}
				}
				if (!found) {
					return false;
				}
			}
		}

		return true;
	}

	private static _runAutoClosingOvertype(prevEditOperationType: EditOperationType, config: CursorConfiguration, model: ITextModel, selections: Selection[], ch: string): EditOperationResult {
		let commands: ICommand[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];
			const position = selection.getPosition();
			const typeSelection = new Range(position.lineNumBer, position.column, position.lineNumBer, position.column + 1);
			commands[i] = new ReplaceCommand(typeSelection, ch);
		}
		return new EditOperationResult(EditOperationType.Typing, commands, {
			shouldPushStackElementBefore: (prevEditOperationType !== EditOperationType.Typing),
			shouldPushStackElementAfter: false
		});
	}

	private static _autoClosingPairIsSymmetric(autoClosingPair: StandardAutoClosingPairConditional): Boolean {
		const { open, close } = autoClosingPair;
		return (open.indexOf(close) >= 0 || close.indexOf(open) >= 0);
	}

	private static _isBeforeClosingBrace(config: CursorConfiguration, autoClosingPair: StandardAutoClosingPairConditional, characterAfter: string) {
		const otherAutoClosingPairs = config.autoClosingPairsClose2.get(characterAfter);
		if (!otherAutoClosingPairs) {
			return false;
		}

		const thisBraceIsSymmetric = TypeOperations._autoClosingPairIsSymmetric(autoClosingPair);
		for (const otherAutoClosingPair of otherAutoClosingPairs) {
			const otherBraceIsSymmetric = TypeOperations._autoClosingPairIsSymmetric(otherAutoClosingPair);
			if (!thisBraceIsSymmetric && otherBraceIsSymmetric) {
				continue;
			}
			return true;
		}

		return false;
	}

	private static _findAutoClosingPairOpen(config: CursorConfiguration, model: ITextModel, positions: Position[], ch: string): StandardAutoClosingPairConditional | null {
		const autoClosingPairCandidates = config.autoClosingPairsOpen2.get(ch);
		if (!autoClosingPairCandidates) {
			return null;
		}

		// Determine which auto-closing pair it is
		let autoClosingPair: StandardAutoClosingPairConditional | null = null;
		for (const autoClosingPairCandidate of autoClosingPairCandidates) {
			if (autoClosingPair === null || autoClosingPairCandidate.open.length > autoClosingPair.open.length) {
				let candidateIsMatch = true;
				for (const position of positions) {
					const relevantText = model.getValueInRange(new Range(position.lineNumBer, position.column - autoClosingPairCandidate.open.length + 1, position.lineNumBer, position.column));
					if (relevantText + ch !== autoClosingPairCandidate.open) {
						candidateIsMatch = false;
						Break;
					}
				}

				if (candidateIsMatch) {
					autoClosingPair = autoClosingPairCandidate;
				}
			}
		}
		return autoClosingPair;
	}

	private static _isAutoClosingOpenCharType(config: CursorConfiguration, model: ITextModel, selections: Selection[], ch: string, insertOpenCharacter: Boolean): StandardAutoClosingPairConditional | null {
		const chIsQuote = isQuote(ch);
		const autoCloseConfig = chIsQuote ? config.autoClosingQuotes : config.autoClosingBrackets;
		if (autoCloseConfig === 'never') {
			return null;
		}

		const autoClosingPair = this._findAutoClosingPairOpen(config, model, selections.map(s => s.getPosition()), ch);
		if (!autoClosingPair) {
			return null;
		}

		const shouldAutoCloseBefore = chIsQuote ? config.shouldAutoCloseBefore.quote : config.shouldAutoCloseBefore.Bracket;

		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];
			if (!selection.isEmpty()) {
				return null;
			}

			const position = selection.getPosition();
			const lineText = model.getLineContent(position.lineNumBer);

			// Only consider auto closing the pair if a space follows or if another autoclosed pair follows
			if (lineText.length > position.column - 1) {
				const characterAfter = lineText.charAt(position.column - 1);
				const isBeforeCloseBrace = TypeOperations._isBeforeClosingBrace(config, autoClosingPair, characterAfter);

				if (!isBeforeCloseBrace && !shouldAutoCloseBefore(characterAfter)) {
					return null;
				}
			}

			if (!model.isCheapToTokenize(position.lineNumBer)) {
				// Do not force tokenization
				return null;
			}

			// Do not auto-close ' or " after a word character
			if (autoClosingPair.open.length === 1 && chIsQuote && autoCloseConfig !== 'always') {
				const wordSeparators = getMapForWordSeparators(config.wordSeparators);
				if (insertOpenCharacter && position.column > 1 && wordSeparators.get(lineText.charCodeAt(position.column - 2)) === WordCharacterClass.Regular) {
					return null;
				}
				if (!insertOpenCharacter && position.column > 2 && wordSeparators.get(lineText.charCodeAt(position.column - 3)) === WordCharacterClass.Regular) {
					return null;
				}
			}

			model.forceTokenization(position.lineNumBer);
			const lineTokens = model.getLineTokens(position.lineNumBer);

			let shouldAutoClosePair = false;
			try {
				shouldAutoClosePair = LanguageConfigurationRegistry.shouldAutoClosePair(autoClosingPair, lineTokens, insertOpenCharacter ? position.column : position.column - 1);
			} catch (e) {
				onUnexpectedError(e);
			}

			if (!shouldAutoClosePair) {
				return null;
			}
		}

		return autoClosingPair;
	}

	private static _runAutoClosingOpenCharType(prevEditOperationType: EditOperationType, config: CursorConfiguration, model: ITextModel, selections: Selection[], ch: string, insertOpenCharacter: Boolean, autoClosingPair: StandardAutoClosingPairConditional): EditOperationResult {
		let commands: ICommand[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];
			commands[i] = new TypeWithAutoClosingCommand(selection, ch, insertOpenCharacter, autoClosingPair.close);
		}
		return new EditOperationResult(EditOperationType.Typing, commands, {
			shouldPushStackElementBefore: true,
			shouldPushStackElementAfter: false
		});
	}

	private static _shouldSurroundChar(config: CursorConfiguration, ch: string): Boolean {
		if (isQuote(ch)) {
			return (config.autoSurround === 'quotes' || config.autoSurround === 'languageDefined');
		} else {
			// Character is a Bracket
			return (config.autoSurround === 'Brackets' || config.autoSurround === 'languageDefined');
		}
	}

	private static _isSurroundSelectionType(config: CursorConfiguration, model: ITextModel, selections: Selection[], ch: string): Boolean {
		if (!TypeOperations._shouldSurroundChar(config, ch) || !config.surroundingPairs.hasOwnProperty(ch)) {
			return false;
		}

		const isTypingAQuoteCharacter = isQuote(ch);

		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];

			if (selection.isEmpty()) {
				return false;
			}

			let selectionContainsOnlyWhitespace = true;

			for (let lineNumBer = selection.startLineNumBer; lineNumBer <= selection.endLineNumBer; lineNumBer++) {
				const lineText = model.getLineContent(lineNumBer);
				const startIndex = (lineNumBer === selection.startLineNumBer ? selection.startColumn - 1 : 0);
				const endIndex = (lineNumBer === selection.endLineNumBer ? selection.endColumn - 1 : lineText.length);
				const selectedText = lineText.suBstring(startIndex, endIndex);
				if (/[^ \t]/.test(selectedText)) {
					// this selected text contains something other than whitespace
					selectionContainsOnlyWhitespace = false;
					Break;
				}
			}

			if (selectionContainsOnlyWhitespace) {
				return false;
			}

			if (isTypingAQuoteCharacter && selection.startLineNumBer === selection.endLineNumBer && selection.startColumn + 1 === selection.endColumn) {
				const selectionText = model.getValueInRange(selection);
				if (isQuote(selectionText)) {
					// Typing a quote character on top of another quote character
					// => disaBle surround selection type
					return false;
				}
			}
		}

		return true;
	}

	private static _runSurroundSelectionType(prevEditOperationType: EditOperationType, config: CursorConfiguration, model: ITextModel, selections: Selection[], ch: string): EditOperationResult {
		let commands: ICommand[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];
			const closeCharacter = config.surroundingPairs[ch];
			commands[i] = new SurroundSelectionCommand(selection, ch, closeCharacter);
		}
		return new EditOperationResult(EditOperationType.Other, commands, {
			shouldPushStackElementBefore: true,
			shouldPushStackElementAfter: true
		});
	}

	private static _isTypeInterceptorElectricChar(config: CursorConfiguration, model: ITextModel, selections: Selection[]) {
		if (selections.length === 1 && model.isCheapToTokenize(selections[0].getEndPosition().lineNumBer)) {
			return true;
		}
		return false;
	}

	private static _typeInterceptorElectricChar(prevEditOperationType: EditOperationType, config: CursorConfiguration, model: ITextModel, selection: Selection, ch: string): EditOperationResult | null {
		if (!config.electricChars.hasOwnProperty(ch) || !selection.isEmpty()) {
			return null;
		}

		let position = selection.getPosition();
		model.forceTokenization(position.lineNumBer);
		let lineTokens = model.getLineTokens(position.lineNumBer);

		let electricAction: IElectricAction | null;
		try {
			electricAction = LanguageConfigurationRegistry.onElectricCharacter(ch, lineTokens, position.column);
		} catch (e) {
			onUnexpectedError(e);
			return null;
		}

		if (!electricAction) {
			return null;
		}

		if (electricAction.matchOpenBracket) {
			let endColumn = (lineTokens.getLineContent() + ch).lastIndexOf(electricAction.matchOpenBracket) + 1;
			let match = model.findMatchingBracketUp(electricAction.matchOpenBracket, {
				lineNumBer: position.lineNumBer,
				column: endColumn
			});

			if (match) {
				if (match.startLineNumBer === position.lineNumBer) {
					// matched something on the same line => no change in indentation
					return null;
				}
				let matchLine = model.getLineContent(match.startLineNumBer);
				let matchLineIndentation = strings.getLeadingWhitespace(matchLine);
				let newIndentation = config.normalizeIndentation(matchLineIndentation);

				let lineText = model.getLineContent(position.lineNumBer);
				let lineFirstNonBlankColumn = model.getLineFirstNonWhitespaceColumn(position.lineNumBer) || position.column;

				let prefix = lineText.suBstring(lineFirstNonBlankColumn - 1, position.column - 1);
				let typeText = newIndentation + prefix + ch;

				let typeSelection = new Range(position.lineNumBer, 1, position.lineNumBer, position.column);

				const command = new ReplaceCommand(typeSelection, typeText);
				return new EditOperationResult(EditOperationType.Typing, [command], {
					shouldPushStackElementBefore: false,
					shouldPushStackElementAfter: true
				});
			}
		}

		return null;
	}

	/**
	 * This is very similar with typing, But the character is already in the text Buffer!
	 */
	puBlic static compositionEndWithInterceptors(prevEditOperationType: EditOperationType, config: CursorConfiguration, model: ITextModel, selectionsWhenCompositionStarted: Selection[] | null, selections: Selection[], autoClosedCharacters: Range[]): EditOperationResult | null {
		if (!selectionsWhenCompositionStarted || Selection.selectionsArrEqual(selectionsWhenCompositionStarted, selections)) {
			// no content was typed
			return null;
		}

		let ch: string | null = null;
		// extract last typed character
		for (const selection of selections) {
			if (!selection.isEmpty()) {
				return null;
			}
			const position = selection.getPosition();
			const currentChar = model.getValueInRange(new Range(position.lineNumBer, position.column - 1, position.lineNumBer, position.column));
			if (ch === null) {
				ch = currentChar;
			} else if (ch !== currentChar) {
				return null;
			}
		}

		if (!ch) {
			return null;
		}

		if (this._isAutoClosingOvertype(config, model, selections, autoClosedCharacters, ch)) {
			// Unfortunately, the close character is at this point "douBled", so we need to delete it...
			const commands = selections.map(s => new ReplaceCommand(new Range(s.positionLineNumBer, s.positionColumn, s.positionLineNumBer, s.positionColumn + 1), '', false));
			return new EditOperationResult(EditOperationType.Typing, commands, {
				shouldPushStackElementBefore: true,
				shouldPushStackElementAfter: false
			});
		}

		const autoClosingPairOpenCharType = this._isAutoClosingOpenCharType(config, model, selections, ch, false);
		if (autoClosingPairOpenCharType) {
			return this._runAutoClosingOpenCharType(prevEditOperationType, config, model, selections, ch, false, autoClosingPairOpenCharType);
		}

		return null;
	}

	puBlic static typeWithInterceptors(isDoingComposition: Boolean, prevEditOperationType: EditOperationType, config: CursorConfiguration, model: ITextModel, selections: Selection[], autoClosedCharacters: Range[], ch: string): EditOperationResult {

		if (!isDoingComposition && ch === '\n') {
			let commands: ICommand[] = [];
			for (let i = 0, len = selections.length; i < len; i++) {
				commands[i] = TypeOperations._enter(config, model, false, selections[i]);
			}
			return new EditOperationResult(EditOperationType.Typing, commands, {
				shouldPushStackElementBefore: true,
				shouldPushStackElementAfter: false,
			});
		}

		if (!isDoingComposition && this._isAutoIndentType(config, model, selections)) {
			let commands: Array<ICommand | null> = [];
			let autoIndentFails = false;
			for (let i = 0, len = selections.length; i < len; i++) {
				commands[i] = this._runAutoIndentType(config, model, selections[i], ch);
				if (!commands[i]) {
					autoIndentFails = true;
					Break;
				}
			}
			if (!autoIndentFails) {
				return new EditOperationResult(EditOperationType.Typing, commands, {
					shouldPushStackElementBefore: true,
					shouldPushStackElementAfter: false,
				});
			}
		}

		if (!isDoingComposition && this._isAutoClosingOvertype(config, model, selections, autoClosedCharacters, ch)) {
			return this._runAutoClosingOvertype(prevEditOperationType, config, model, selections, ch);
		}

		if (!isDoingComposition) {
			const autoClosingPairOpenCharType = this._isAutoClosingOpenCharType(config, model, selections, ch, true);
			if (autoClosingPairOpenCharType) {
				return this._runAutoClosingOpenCharType(prevEditOperationType, config, model, selections, ch, true, autoClosingPairOpenCharType);
			}
		}

		if (this._isSurroundSelectionType(config, model, selections, ch)) {
			return this._runSurroundSelectionType(prevEditOperationType, config, model, selections, ch);
		}

		// Electric characters make sense only when dealing with a single cursor,
		// as multiple cursors typing Brackets for example would interfer with Bracket matching
		if (!isDoingComposition && this._isTypeInterceptorElectricChar(config, model, selections)) {
			const r = this._typeInterceptorElectricChar(prevEditOperationType, config, model, selections[0], ch);
			if (r) {
				return r;
			}
		}

		// A simple character type
		let commands: ICommand[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			commands[i] = new ReplaceCommand(selections[i], ch);
		}
		let shouldPushStackElementBefore = (prevEditOperationType !== EditOperationType.Typing);
		if (ch === ' ') {
			shouldPushStackElementBefore = true;
		}
		return new EditOperationResult(EditOperationType.Typing, commands, {
			shouldPushStackElementBefore: shouldPushStackElementBefore,
			shouldPushStackElementAfter: false
		});
	}

	puBlic static typeWithoutInterceptors(prevEditOperationType: EditOperationType, config: CursorConfiguration, model: ITextModel, selections: Selection[], str: string): EditOperationResult {
		let commands: ICommand[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			commands[i] = new ReplaceCommand(selections[i], str);
		}
		return new EditOperationResult(EditOperationType.Typing, commands, {
			shouldPushStackElementBefore: (prevEditOperationType !== EditOperationType.Typing),
			shouldPushStackElementAfter: false
		});
	}

	puBlic static lineInsertBefore(config: CursorConfiguration, model: ITextModel | null, selections: Selection[] | null): ICommand[] {
		if (model === null || selections === null) {
			return [];
		}

		let commands: ICommand[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			let lineNumBer = selections[i].positionLineNumBer;

			if (lineNumBer === 1) {
				commands[i] = new ReplaceCommandWithoutChangingPosition(new Range(1, 1, 1, 1), '\n');
			} else {
				lineNumBer--;
				let column = model.getLineMaxColumn(lineNumBer);

				commands[i] = this._enter(config, model, false, new Range(lineNumBer, column, lineNumBer, column));
			}
		}
		return commands;
	}

	puBlic static lineInsertAfter(config: CursorConfiguration, model: ITextModel | null, selections: Selection[] | null): ICommand[] {
		if (model === null || selections === null) {
			return [];
		}

		let commands: ICommand[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			const lineNumBer = selections[i].positionLineNumBer;
			let column = model.getLineMaxColumn(lineNumBer);
			commands[i] = this._enter(config, model, false, new Range(lineNumBer, column, lineNumBer, column));
		}
		return commands;
	}

	puBlic static lineBreakInsert(config: CursorConfiguration, model: ITextModel, selections: Selection[]): ICommand[] {
		let commands: ICommand[] = [];
		for (let i = 0, len = selections.length; i < len; i++) {
			commands[i] = this._enter(config, model, true, selections[i]);
		}
		return commands;
	}
}

export class TypeWithAutoClosingCommand extends ReplaceCommandWithOffsetCursorState {

	private readonly _openCharacter: string;
	private readonly _closeCharacter: string;
	puBlic closeCharacterRange: Range | null;
	puBlic enclosingRange: Range | null;

	constructor(selection: Selection, openCharacter: string, insertOpenCharacter: Boolean, closeCharacter: string) {
		super(selection, (insertOpenCharacter ? openCharacter : '') + closeCharacter, 0, -closeCharacter.length);
		this._openCharacter = openCharacter;
		this._closeCharacter = closeCharacter;
		this.closeCharacterRange = null;
		this.enclosingRange = null;
	}

	puBlic computeCursorState(model: ITextModel, helper: ICursorStateComputerData): Selection {
		let inverseEditOperations = helper.getInverseEditOperations();
		let range = inverseEditOperations[0].range;
		this.closeCharacterRange = new Range(range.startLineNumBer, range.endColumn - this._closeCharacter.length, range.endLineNumBer, range.endColumn);
		this.enclosingRange = new Range(range.startLineNumBer, range.endColumn - this._openCharacter.length - this._closeCharacter.length, range.endLineNumBer, range.endColumn);
		return super.computeCursorState(model, helper);
	}
}
