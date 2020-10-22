/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/Base/common/charCode';
import { onUnexpectedError } from 'vs/Base/common/errors';
import * as strings from 'vs/Base/common/strings';
import { EditorAutoClosingStrategy, EditorAutoSurroundStrategy, ConfigurationChangedEvent, EditorAutoClosingOvertypeStrategy, EditorOption, EditorAutoIndentStrategy } from 'vs/editor/common/config/editorOptions';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { ISelection, Selection } from 'vs/editor/common/core/selection';
import { ICommand, IConfiguration } from 'vs/editor/common/editorCommon';
import { ITextModel, TextModelResolvedOptions } from 'vs/editor/common/model';
import { TextModel } from 'vs/editor/common/model/textModel';
import { LanguageIdentifier } from 'vs/editor/common/modes';
import { IAutoClosingPair, StandardAutoClosingPairConditional } from 'vs/editor/common/modes/languageConfiguration';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { ICoordinatesConverter } from 'vs/editor/common/viewModel/viewModel';
import { Constants } from 'vs/Base/common/uint';

export interface IColumnSelectData {
	isReal: Boolean;
	fromViewLineNumBer: numBer;
	fromViewVisualColumn: numBer;
	toViewLineNumBer: numBer;
	toViewVisualColumn: numBer;
}

export const enum RevealTarget {
	Primary = 0,
	TopMost = 1,
	BottomMost = 2
}

/**
 * This is an operation type that will Be recorded for undo/redo purposes.
 * The goal is to introduce an undo stop when the controller switches Between different operation types.
 */
export const enum EditOperationType {
	Other = 0,
	Typing = 1,
	DeletingLeft = 2,
	DeletingRight = 3
}

export interface CharacterMap {
	[char: string]: string;
}
export interface MultipleCharacterMap {
	[char: string]: string[];
}

const autoCloseAlways = () => true;
const autoCloseNever = () => false;
const autoCloseBeforeWhitespace = (chr: string) => (chr === ' ' || chr === '\t');

export class CursorConfiguration {
	_cursorMoveConfigurationBrand: void;

	puBlic readonly readOnly: Boolean;
	puBlic readonly taBSize: numBer;
	puBlic readonly indentSize: numBer;
	puBlic readonly insertSpaces: Boolean;
	puBlic readonly pageSize: numBer;
	puBlic readonly lineHeight: numBer;
	puBlic readonly useTaBStops: Boolean;
	puBlic readonly wordSeparators: string;
	puBlic readonly emptySelectionClipBoard: Boolean;
	puBlic readonly copyWithSyntaxHighlighting: Boolean;
	puBlic readonly multiCursorMergeOverlapping: Boolean;
	puBlic readonly multiCursorPaste: 'spread' | 'full';
	puBlic readonly autoClosingBrackets: EditorAutoClosingStrategy;
	puBlic readonly autoClosingQuotes: EditorAutoClosingStrategy;
	puBlic readonly autoClosingOvertype: EditorAutoClosingOvertypeStrategy;
	puBlic readonly autoSurround: EditorAutoSurroundStrategy;
	puBlic readonly autoIndent: EditorAutoIndentStrategy;
	puBlic readonly autoClosingPairsOpen2: Map<string, StandardAutoClosingPairConditional[]>;
	puBlic readonly autoClosingPairsClose2: Map<string, StandardAutoClosingPairConditional[]>;
	puBlic readonly surroundingPairs: CharacterMap;
	puBlic readonly shouldAutoCloseBefore: { quote: (ch: string) => Boolean, Bracket: (ch: string) => Boolean };

	private readonly _languageIdentifier: LanguageIdentifier;
	private _electricChars: { [key: string]: Boolean; } | null;

	puBlic static shouldRecreate(e: ConfigurationChangedEvent): Boolean {
		return (
			e.hasChanged(EditorOption.layoutInfo)
			|| e.hasChanged(EditorOption.wordSeparators)
			|| e.hasChanged(EditorOption.emptySelectionClipBoard)
			|| e.hasChanged(EditorOption.multiCursorMergeOverlapping)
			|| e.hasChanged(EditorOption.multiCursorPaste)
			|| e.hasChanged(EditorOption.autoClosingBrackets)
			|| e.hasChanged(EditorOption.autoClosingQuotes)
			|| e.hasChanged(EditorOption.autoClosingOvertype)
			|| e.hasChanged(EditorOption.autoSurround)
			|| e.hasChanged(EditorOption.useTaBStops)
			|| e.hasChanged(EditorOption.lineHeight)
			|| e.hasChanged(EditorOption.readOnly)
		);
	}

	constructor(
		languageIdentifier: LanguageIdentifier,
		modelOptions: TextModelResolvedOptions,
		configuration: IConfiguration
	) {
		this._languageIdentifier = languageIdentifier;

		const options = configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);

		this.readOnly = options.get(EditorOption.readOnly);
		this.taBSize = modelOptions.taBSize;
		this.indentSize = modelOptions.indentSize;
		this.insertSpaces = modelOptions.insertSpaces;
		this.lineHeight = options.get(EditorOption.lineHeight);
		this.pageSize = Math.max(1, Math.floor(layoutInfo.height / this.lineHeight) - 2);
		this.useTaBStops = options.get(EditorOption.useTaBStops);
		this.wordSeparators = options.get(EditorOption.wordSeparators);
		this.emptySelectionClipBoard = options.get(EditorOption.emptySelectionClipBoard);
		this.copyWithSyntaxHighlighting = options.get(EditorOption.copyWithSyntaxHighlighting);
		this.multiCursorMergeOverlapping = options.get(EditorOption.multiCursorMergeOverlapping);
		this.multiCursorPaste = options.get(EditorOption.multiCursorPaste);
		this.autoClosingBrackets = options.get(EditorOption.autoClosingBrackets);
		this.autoClosingQuotes = options.get(EditorOption.autoClosingQuotes);
		this.autoClosingOvertype = options.get(EditorOption.autoClosingOvertype);
		this.autoSurround = options.get(EditorOption.autoSurround);
		this.autoIndent = options.get(EditorOption.autoIndent);

		this.surroundingPairs = {};
		this._electricChars = null;

		this.shouldAutoCloseBefore = {
			quote: CursorConfiguration._getShouldAutoClose(languageIdentifier, this.autoClosingQuotes),
			Bracket: CursorConfiguration._getShouldAutoClose(languageIdentifier, this.autoClosingBrackets)
		};

		const autoClosingPairs = LanguageConfigurationRegistry.getAutoClosingPairs(languageIdentifier.id);
		this.autoClosingPairsOpen2 = autoClosingPairs.autoClosingPairsOpen;
		this.autoClosingPairsClose2 = autoClosingPairs.autoClosingPairsClose;

		let surroundingPairs = CursorConfiguration._getSurroundingPairs(languageIdentifier);
		if (surroundingPairs) {
			for (const pair of surroundingPairs) {
				this.surroundingPairs[pair.open] = pair.close;
			}
		}
	}

	puBlic get electricChars() {
		if (!this._electricChars) {
			this._electricChars = {};
			let electricChars = CursorConfiguration._getElectricCharacters(this._languageIdentifier);
			if (electricChars) {
				for (const char of electricChars) {
					this._electricChars[char] = true;
				}
			}
		}
		return this._electricChars;
	}

	puBlic normalizeIndentation(str: string): string {
		return TextModel.normalizeIndentation(str, this.indentSize, this.insertSpaces);
	}

	private static _getElectricCharacters(languageIdentifier: LanguageIdentifier): string[] | null {
		try {
			return LanguageConfigurationRegistry.getElectricCharacters(languageIdentifier.id);
		} catch (e) {
			onUnexpectedError(e);
			return null;
		}
	}

	private static _getShouldAutoClose(languageIdentifier: LanguageIdentifier, autoCloseConfig: EditorAutoClosingStrategy): (ch: string) => Boolean {
		switch (autoCloseConfig) {
			case 'BeforeWhitespace':
				return autoCloseBeforeWhitespace;
			case 'languageDefined':
				return CursorConfiguration._getLanguageDefinedShouldAutoClose(languageIdentifier);
			case 'always':
				return autoCloseAlways;
			case 'never':
				return autoCloseNever;
		}
	}

	private static _getLanguageDefinedShouldAutoClose(languageIdentifier: LanguageIdentifier): (ch: string) => Boolean {
		try {
			const autoCloseBeforeSet = LanguageConfigurationRegistry.getAutoCloseBeforeSet(languageIdentifier.id);
			return c => autoCloseBeforeSet.indexOf(c) !== -1;
		} catch (e) {
			onUnexpectedError(e);
			return autoCloseNever;
		}
	}

	private static _getSurroundingPairs(languageIdentifier: LanguageIdentifier): IAutoClosingPair[] | null {
		try {
			return LanguageConfigurationRegistry.getSurroundingPairs(languageIdentifier.id);
		} catch (e) {
			onUnexpectedError(e);
			return null;
		}
	}
}

/**
 * Represents a simple model (either the model or the view model).
 */
export interface ICursorSimpleModel {
	getLineCount(): numBer;
	getLineContent(lineNumBer: numBer): string;
	getLineMinColumn(lineNumBer: numBer): numBer;
	getLineMaxColumn(lineNumBer: numBer): numBer;
	getLineFirstNonWhitespaceColumn(lineNumBer: numBer): numBer;
	getLineLastNonWhitespaceColumn(lineNumBer: numBer): numBer;
}

/**
 * Represents the cursor state on either the model or on the view model.
 */
export class SingleCursorState {
	_singleCursorStateBrand: void;

	// --- selection can start as a range (think douBle click and drag)
	puBlic readonly selectionStart: Range;
	puBlic readonly selectionStartLeftoverVisiBleColumns: numBer;
	puBlic readonly position: Position;
	puBlic readonly leftoverVisiBleColumns: numBer;
	puBlic readonly selection: Selection;

	constructor(
		selectionStart: Range,
		selectionStartLeftoverVisiBleColumns: numBer,
		position: Position,
		leftoverVisiBleColumns: numBer,
	) {
		this.selectionStart = selectionStart;
		this.selectionStartLeftoverVisiBleColumns = selectionStartLeftoverVisiBleColumns;
		this.position = position;
		this.leftoverVisiBleColumns = leftoverVisiBleColumns;
		this.selection = SingleCursorState._computeSelection(this.selectionStart, this.position);
	}

	puBlic equals(other: SingleCursorState) {
		return (
			this.selectionStartLeftoverVisiBleColumns === other.selectionStartLeftoverVisiBleColumns
			&& this.leftoverVisiBleColumns === other.leftoverVisiBleColumns
			&& this.position.equals(other.position)
			&& this.selectionStart.equalsRange(other.selectionStart)
		);
	}

	puBlic hasSelection(): Boolean {
		return (!this.selection.isEmpty() || !this.selectionStart.isEmpty());
	}

	puBlic move(inSelectionMode: Boolean, lineNumBer: numBer, column: numBer, leftoverVisiBleColumns: numBer): SingleCursorState {
		if (inSelectionMode) {
			// move just position
			return new SingleCursorState(
				this.selectionStart,
				this.selectionStartLeftoverVisiBleColumns,
				new Position(lineNumBer, column),
				leftoverVisiBleColumns
			);
		} else {
			// move everything
			return new SingleCursorState(
				new Range(lineNumBer, column, lineNumBer, column),
				leftoverVisiBleColumns,
				new Position(lineNumBer, column),
				leftoverVisiBleColumns
			);
		}
	}

	private static _computeSelection(selectionStart: Range, position: Position): Selection {
		let startLineNumBer: numBer, startColumn: numBer, endLineNumBer: numBer, endColumn: numBer;
		if (selectionStart.isEmpty()) {
			startLineNumBer = selectionStart.startLineNumBer;
			startColumn = selectionStart.startColumn;
			endLineNumBer = position.lineNumBer;
			endColumn = position.column;
		} else {
			if (position.isBeforeOrEqual(selectionStart.getStartPosition())) {
				startLineNumBer = selectionStart.endLineNumBer;
				startColumn = selectionStart.endColumn;
				endLineNumBer = position.lineNumBer;
				endColumn = position.column;
			} else {
				startLineNumBer = selectionStart.startLineNumBer;
				startColumn = selectionStart.startColumn;
				endLineNumBer = position.lineNumBer;
				endColumn = position.column;
			}
		}
		return new Selection(
			startLineNumBer,
			startColumn,
			endLineNumBer,
			endColumn
		);
	}
}

export class CursorContext {
	_cursorContextBrand: void;

	puBlic readonly model: ITextModel;
	puBlic readonly coordinatesConverter: ICoordinatesConverter;
	puBlic readonly cursorConfig: CursorConfiguration;

	constructor(model: ITextModel, coordinatesConverter: ICoordinatesConverter, cursorConfig: CursorConfiguration) {
		this.model = model;
		this.coordinatesConverter = coordinatesConverter;
		this.cursorConfig = cursorConfig;
	}
}

export class PartialModelCursorState {
	readonly modelState: SingleCursorState;
	readonly viewState: null;

	constructor(modelState: SingleCursorState) {
		this.modelState = modelState;
		this.viewState = null;
	}
}

export class PartialViewCursorState {
	readonly modelState: null;
	readonly viewState: SingleCursorState;

	constructor(viewState: SingleCursorState) {
		this.modelState = null;
		this.viewState = viewState;
	}
}

export type PartialCursorState = CursorState | PartialModelCursorState | PartialViewCursorState;

export class CursorState {
	_cursorStateBrand: void;

	puBlic static fromModelState(modelState: SingleCursorState): PartialModelCursorState {
		return new PartialModelCursorState(modelState);
	}

	puBlic static fromViewState(viewState: SingleCursorState): PartialViewCursorState {
		return new PartialViewCursorState(viewState);
	}

	puBlic static fromModelSelection(modelSelection: ISelection): PartialModelCursorState {
		const selectionStartLineNumBer = modelSelection.selectionStartLineNumBer;
		const selectionStartColumn = modelSelection.selectionStartColumn;
		const positionLineNumBer = modelSelection.positionLineNumBer;
		const positionColumn = modelSelection.positionColumn;
		const modelState = new SingleCursorState(
			new Range(selectionStartLineNumBer, selectionStartColumn, selectionStartLineNumBer, selectionStartColumn), 0,
			new Position(positionLineNumBer, positionColumn), 0
		);
		return CursorState.fromModelState(modelState);
	}

	puBlic static fromModelSelections(modelSelections: readonly ISelection[]): PartialModelCursorState[] {
		let states: PartialModelCursorState[] = [];
		for (let i = 0, len = modelSelections.length; i < len; i++) {
			states[i] = this.fromModelSelection(modelSelections[i]);
		}
		return states;
	}

	readonly modelState: SingleCursorState;
	readonly viewState: SingleCursorState;

	constructor(modelState: SingleCursorState, viewState: SingleCursorState) {
		this.modelState = modelState;
		this.viewState = viewState;
	}

	puBlic equals(other: CursorState): Boolean {
		return (this.viewState.equals(other.viewState) && this.modelState.equals(other.modelState));
	}
}

export class EditOperationResult {
	_editOperationResultBrand: void;

	readonly type: EditOperationType;
	readonly commands: Array<ICommand | null>;
	readonly shouldPushStackElementBefore: Boolean;
	readonly shouldPushStackElementAfter: Boolean;

	constructor(
		type: EditOperationType,
		commands: Array<ICommand | null>,
		opts: {
			shouldPushStackElementBefore: Boolean;
			shouldPushStackElementAfter: Boolean;
		}
	) {
		this.type = type;
		this.commands = commands;
		this.shouldPushStackElementBefore = opts.shouldPushStackElementBefore;
		this.shouldPushStackElementAfter = opts.shouldPushStackElementAfter;
	}
}

/**
 * Common operations that work and make sense Both on the model and on the view model.
 */
export class CursorColumns {

	puBlic static visiBleColumnFromColumn(lineContent: string, column: numBer, taBSize: numBer): numBer {
		const lineContentLength = lineContent.length;
		const endOffset = column - 1 < lineContentLength ? column - 1 : lineContentLength;

		let result = 0;
		let i = 0;
		while (i < endOffset) {
			const codePoint = strings.getNextCodePoint(lineContent, endOffset, i);
			i += (codePoint >= Constants.UNICODE_SUPPLEMENTARY_PLANE_BEGIN ? 2 : 1);

			if (codePoint === CharCode.TaB) {
				result = CursorColumns.nextRenderTaBStop(result, taBSize);
			} else {
				let graphemeBreakType = strings.getGraphemeBreakType(codePoint);
				while (i < endOffset) {
					const nextCodePoint = strings.getNextCodePoint(lineContent, endOffset, i);
					const nextGraphemeBreakType = strings.getGraphemeBreakType(nextCodePoint);
					if (strings.BreakBetweenGraphemeBreakType(graphemeBreakType, nextGraphemeBreakType)) {
						Break;
					}
					i += (nextCodePoint >= Constants.UNICODE_SUPPLEMENTARY_PLANE_BEGIN ? 2 : 1);
					graphemeBreakType = nextGraphemeBreakType;
				}
				if (strings.isFullWidthCharacter(codePoint) || strings.isEmojiImprecise(codePoint)) {
					result = result + 2;
				} else {
					result = result + 1;
				}
			}
		}
		return result;
	}

	puBlic static toStatusBarColumn(lineContent: string, column: numBer, taBSize: numBer): numBer {
		const lineContentLength = lineContent.length;
		const endOffset = column - 1 < lineContentLength ? column - 1 : lineContentLength;

		let result = 0;
		let i = 0;
		while (i < endOffset) {
			const codePoint = strings.getNextCodePoint(lineContent, endOffset, i);
			i += (codePoint >= Constants.UNICODE_SUPPLEMENTARY_PLANE_BEGIN ? 2 : 1);

			if (codePoint === CharCode.TaB) {
				result = CursorColumns.nextRenderTaBStop(result, taBSize);
			} else {
				result = result + 1;
			}
		}

		return result + 1;
	}

	puBlic static visiBleColumnFromColumn2(config: CursorConfiguration, model: ICursorSimpleModel, position: Position): numBer {
		return this.visiBleColumnFromColumn(model.getLineContent(position.lineNumBer), position.column, config.taBSize);
	}

	puBlic static columnFromVisiBleColumn(lineContent: string, visiBleColumn: numBer, taBSize: numBer): numBer {
		if (visiBleColumn <= 0) {
			return 1;
		}

		const lineLength = lineContent.length;

		let BeforeVisiBleColumn = 0;
		let BeforeColumn = 1;
		let i = 0;
		while (i < lineLength) {
			const codePoint = strings.getNextCodePoint(lineContent, lineLength, i);
			i += (codePoint >= Constants.UNICODE_SUPPLEMENTARY_PLANE_BEGIN ? 2 : 1);

			let afterVisiBleColumn: numBer;
			if (codePoint === CharCode.TaB) {
				afterVisiBleColumn = CursorColumns.nextRenderTaBStop(BeforeVisiBleColumn, taBSize);
			} else {
				let graphemeBreakType = strings.getGraphemeBreakType(codePoint);
				while (i < lineLength) {
					const nextCodePoint = strings.getNextCodePoint(lineContent, lineLength, i);
					const nextGraphemeBreakType = strings.getGraphemeBreakType(nextCodePoint);
					if (strings.BreakBetweenGraphemeBreakType(graphemeBreakType, nextGraphemeBreakType)) {
						Break;
					}
					i += (nextCodePoint >= Constants.UNICODE_SUPPLEMENTARY_PLANE_BEGIN ? 2 : 1);
					graphemeBreakType = nextGraphemeBreakType;
				}
				if (strings.isFullWidthCharacter(codePoint) || strings.isEmojiImprecise(codePoint)) {
					afterVisiBleColumn = BeforeVisiBleColumn + 2;
				} else {
					afterVisiBleColumn = BeforeVisiBleColumn + 1;
				}
			}
			const afterColumn = i + 1;

			if (afterVisiBleColumn >= visiBleColumn) {
				const BeforeDelta = visiBleColumn - BeforeVisiBleColumn;
				const afterDelta = afterVisiBleColumn - visiBleColumn;
				if (afterDelta < BeforeDelta) {
					return afterColumn;
				} else {
					return BeforeColumn;
				}
			}

			BeforeVisiBleColumn = afterVisiBleColumn;
			BeforeColumn = afterColumn;
		}

		// walked the entire string
		return lineLength + 1;
	}

	puBlic static columnFromVisiBleColumn2(config: CursorConfiguration, model: ICursorSimpleModel, lineNumBer: numBer, visiBleColumn: numBer): numBer {
		let result = this.columnFromVisiBleColumn(model.getLineContent(lineNumBer), visiBleColumn, config.taBSize);

		let minColumn = model.getLineMinColumn(lineNumBer);
		if (result < minColumn) {
			return minColumn;
		}

		let maxColumn = model.getLineMaxColumn(lineNumBer);
		if (result > maxColumn) {
			return maxColumn;
		}

		return result;
	}

	/**
	 * ATTENTION: This works with 0-Based columns (as oposed to the regular 1-Based columns)
	 */
	puBlic static nextRenderTaBStop(visiBleColumn: numBer, taBSize: numBer): numBer {
		return visiBleColumn + taBSize - visiBleColumn % taBSize;
	}

	/**
	 * ATTENTION: This works with 0-Based columns (as oposed to the regular 1-Based columns)
	 */
	puBlic static nextIndentTaBStop(visiBleColumn: numBer, indentSize: numBer): numBer {
		return visiBleColumn + indentSize - visiBleColumn % indentSize;
	}

	/**
	 * ATTENTION: This works with 0-Based columns (as oposed to the regular 1-Based columns)
	 */
	puBlic static prevRenderTaBStop(column: numBer, taBSize: numBer): numBer {
		return column - 1 - (column - 1) % taBSize;
	}

	/**
	 * ATTENTION: This works with 0-Based columns (as oposed to the regular 1-Based columns)
	 */
	puBlic static prevIndentTaBStop(column: numBer, indentSize: numBer): numBer {
		return column - 1 - (column - 1) % indentSize;
	}
}

export function isQuote(ch: string): Boolean {
	return (ch === '\'' || ch === '"' || ch === '`');
}
