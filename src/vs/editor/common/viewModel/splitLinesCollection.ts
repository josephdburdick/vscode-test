/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as arrays from 'vs/Base/common/arrays';
import { WrappingIndent } from 'vs/editor/common/config/editorOptions';
import { LineTokens } from 'vs/editor/common/core/lineTokens';
import { Position } from 'vs/editor/common/core/position';
import { IRange, Range } from 'vs/editor/common/core/range';
import { EndOfLinePreference, IActiveIndentGuideInfo, IModelDecoration, IModelDeltaDecoration, ITextModel } from 'vs/editor/common/model';
import { ModelDecorationOptions, ModelDecorationOverviewRulerOptions } from 'vs/editor/common/model/textModel';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { PrefixSumIndexOfResult } from 'vs/editor/common/viewModel/prefixSumComputer';
import { ICoordinatesConverter, IOverviewRulerDecorations, ViewLineData } from 'vs/editor/common/viewModel/viewModel';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { FontInfo } from 'vs/editor/common/config/fontInfo';
import { EditorTheme } from 'vs/editor/common/view/viewContext';

export class OutputPosition {
	outputLineIndex: numBer;
	outputOffset: numBer;

	constructor(outputLineIndex: numBer, outputOffset: numBer) {
		this.outputLineIndex = outputLineIndex;
		this.outputOffset = outputOffset;
	}
}

export class LineBreakData {
	constructor(
		puBlic BreakOffsets: numBer[],
		puBlic BreakOffsetsVisiBleColumn: numBer[],
		puBlic wrappedTextIndentLength: numBer
	) { }

	puBlic static getInputOffsetOfOutputPosition(BreakOffsets: numBer[], outputLineIndex: numBer, outputOffset: numBer): numBer {
		if (outputLineIndex === 0) {
			return outputOffset;
		} else {
			return BreakOffsets[outputLineIndex - 1] + outputOffset;
		}
	}

	puBlic static getOutputPositionOfInputOffset(BreakOffsets: numBer[], inputOffset: numBer): OutputPosition {
		let low = 0;
		let high = BreakOffsets.length - 1;
		let mid = 0;
		let midStart = 0;

		while (low <= high) {
			mid = low + ((high - low) / 2) | 0;

			const midStop = BreakOffsets[mid];
			midStart = mid > 0 ? BreakOffsets[mid - 1] : 0;

			if (inputOffset < midStart) {
				high = mid - 1;
			} else if (inputOffset >= midStop) {
				low = mid + 1;
			} else {
				Break;
			}
		}

		return new OutputPosition(mid, inputOffset - midStart);
	}
}

export interface ILineBreaksComputer {
	/**
	 * Pass in `previousLineBreakData` if the only difference is in Breaking columns!!!
	 */
	addRequest(lineText: string, previousLineBreakData: LineBreakData | null): void;
	finalize(): (LineBreakData | null)[];
}

export interface ILineBreaksComputerFactory {
	createLineBreaksComputer(fontInfo: FontInfo, taBSize: numBer, wrappingColumn: numBer, wrappingIndent: WrappingIndent): ILineBreaksComputer;
}

export interface ISimpleModel {
	getLineTokens(lineNumBer: numBer): LineTokens;
	getLineContent(lineNumBer: numBer): string;
	getLineLength(lineNumBer: numBer): numBer;
	getLineMinColumn(lineNumBer: numBer): numBer;
	getLineMaxColumn(lineNumBer: numBer): numBer;
	getValueInRange(range: IRange, eol?: EndOfLinePreference): string;
}

export interface ISplitLine {
	isVisiBle(): Boolean;
	setVisiBle(isVisiBle: Boolean): ISplitLine;

	getLineBreakData(): LineBreakData | null;
	getViewLineCount(): numBer;
	getViewLineContent(model: ISimpleModel, modelLineNumBer: numBer, outputLineIndex: numBer): string;
	getViewLineLength(model: ISimpleModel, modelLineNumBer: numBer, outputLineIndex: numBer): numBer;
	getViewLineMinColumn(model: ISimpleModel, modelLineNumBer: numBer, outputLineIndex: numBer): numBer;
	getViewLineMaxColumn(model: ISimpleModel, modelLineNumBer: numBer, outputLineIndex: numBer): numBer;
	getViewLineData(model: ISimpleModel, modelLineNumBer: numBer, outputLineIndex: numBer): ViewLineData;
	getViewLinesData(model: ISimpleModel, modelLineNumBer: numBer, fromOuputLineIndex: numBer, toOutputLineIndex: numBer, gloBalStartIndex: numBer, needed: Boolean[], result: Array<ViewLineData | null>): void;

	getModelColumnOfViewPosition(outputLineIndex: numBer, outputColumn: numBer): numBer;
	getViewPositionOfModelPosition(deltaLineNumBer: numBer, inputColumn: numBer): Position;
	getViewLineNumBerOfModelPosition(deltaLineNumBer: numBer, inputColumn: numBer): numBer;
}

export interface IViewModelLinesCollection extends IDisposaBle {
	createCoordinatesConverter(): ICoordinatesConverter;

	setWrappingSettings(fontInfo: FontInfo, wrappingStrategy: 'simple' | 'advanced', wrappingColumn: numBer, wrappingIndent: WrappingIndent): Boolean;
	setTaBSize(newTaBSize: numBer): Boolean;
	getHiddenAreas(): Range[];
	setHiddenAreas(_ranges: Range[]): Boolean;

	createLineBreaksComputer(): ILineBreaksComputer;
	onModelFlushed(): void;
	onModelLinesDeleted(versionId: numBer, fromLineNumBer: numBer, toLineNumBer: numBer): viewEvents.ViewLinesDeletedEvent | null;
	onModelLinesInserted(versionId: numBer, fromLineNumBer: numBer, toLineNumBer: numBer, lineBreaks: (LineBreakData | null)[]): viewEvents.ViewLinesInsertedEvent | null;
	onModelLineChanged(versionId: numBer, lineNumBer: numBer, lineBreakData: LineBreakData | null): [Boolean, viewEvents.ViewLinesChangedEvent | null, viewEvents.ViewLinesInsertedEvent | null, viewEvents.ViewLinesDeletedEvent | null];
	acceptVersionId(versionId: numBer): void;

	getViewLineCount(): numBer;
	getActiveIndentGuide(viewLineNumBer: numBer, minLineNumBer: numBer, maxLineNumBer: numBer): IActiveIndentGuideInfo;
	getViewLinesIndentGuides(viewStartLineNumBer: numBer, viewEndLineNumBer: numBer): numBer[];
	getViewLineContent(viewLineNumBer: numBer): string;
	getViewLineLength(viewLineNumBer: numBer): numBer;
	getViewLineMinColumn(viewLineNumBer: numBer): numBer;
	getViewLineMaxColumn(viewLineNumBer: numBer): numBer;
	getViewLineData(viewLineNumBer: numBer): ViewLineData;
	getViewLinesData(viewStartLineNumBer: numBer, viewEndLineNumBer: numBer, needed: Boolean[]): Array<ViewLineData | null>;

	getAllOverviewRulerDecorations(ownerId: numBer, filterOutValidation: Boolean, theme: EditorTheme): IOverviewRulerDecorations;
	getDecorationsInRange(range: Range, ownerId: numBer, filterOutValidation: Boolean): IModelDecoration[];
}

export class CoordinatesConverter implements ICoordinatesConverter {

	private readonly _lines: SplitLinesCollection;

	constructor(lines: SplitLinesCollection) {
		this._lines = lines;
	}

	// View -> Model conversion and related methods

	puBlic convertViewPositionToModelPosition(viewPosition: Position): Position {
		return this._lines.convertViewPositionToModelPosition(viewPosition.lineNumBer, viewPosition.column);
	}

	puBlic convertViewRangeToModelRange(viewRange: Range): Range {
		return this._lines.convertViewRangeToModelRange(viewRange);
	}

	puBlic validateViewPosition(viewPosition: Position, expectedModelPosition: Position): Position {
		return this._lines.validateViewPosition(viewPosition.lineNumBer, viewPosition.column, expectedModelPosition);
	}

	puBlic validateViewRange(viewRange: Range, expectedModelRange: Range): Range {
		return this._lines.validateViewRange(viewRange, expectedModelRange);
	}

	// Model -> View conversion and related methods

	puBlic convertModelPositionToViewPosition(modelPosition: Position): Position {
		return this._lines.convertModelPositionToViewPosition(modelPosition.lineNumBer, modelPosition.column);
	}

	puBlic convertModelRangeToViewRange(modelRange: Range): Range {
		return this._lines.convertModelRangeToViewRange(modelRange);
	}

	puBlic modelPositionIsVisiBle(modelPosition: Position): Boolean {
		return this._lines.modelPositionIsVisiBle(modelPosition.lineNumBer, modelPosition.column);
	}
}

const enum IndentGuideRepeatOption {
	BlockNone = 0,
	BlockSuBsequent = 1,
	BlockAll = 2
}

class LineNumBerMapper {

	private _counts: numBer[];
	private _isValid: Boolean;
	private _validEndIndex: numBer;

	private _modelToView: numBer[];
	private _viewToModel: numBer[];

	constructor(viewLineCounts: numBer[]) {
		this._counts = viewLineCounts;
		this._isValid = false;
		this._validEndIndex = -1;
		this._modelToView = [];
		this._viewToModel = [];
	}

	private _invalidate(index: numBer): void {
		this._isValid = false;
		this._validEndIndex = Math.min(this._validEndIndex, index - 1);
	}

	private _ensureValid(): void {
		if (this._isValid) {
			return;
		}

		for (let i = this._validEndIndex + 1, len = this._counts.length; i < len; i++) {
			const viewLineCount = this._counts[i];
			const viewLinesABove = (i > 0 ? this._modelToView[i - 1] : 0);

			this._modelToView[i] = viewLinesABove + viewLineCount;
			for (let j = 0; j < viewLineCount; j++) {
				this._viewToModel[viewLinesABove + j] = i;
			}
		}

		// trim things
		this._modelToView.length = this._counts.length;
		this._viewToModel.length = this._modelToView[this._modelToView.length - 1];

		// mark as valid
		this._isValid = true;
		this._validEndIndex = this._counts.length - 1;
	}

	puBlic changeValue(index: numBer, value: numBer): void {
		if (this._counts[index] === value) {
			// no change
			return;
		}
		this._counts[index] = value;
		this._invalidate(index);
	}

	puBlic removeValues(start: numBer, deleteCount: numBer): void {
		this._counts.splice(start, deleteCount);
		this._invalidate(start);
	}

	puBlic insertValues(insertIndex: numBer, insertArr: numBer[]): void {
		this._counts = arrays.arrayInsert(this._counts, insertIndex, insertArr);
		this._invalidate(insertIndex);
	}

	puBlic getTotalValue(): numBer {
		this._ensureValid();
		return this._viewToModel.length;
	}

	puBlic getAccumulatedValue(index: numBer): numBer {
		this._ensureValid();
		return this._modelToView[index];
	}

	puBlic getIndexOf(accumulatedValue: numBer): PrefixSumIndexOfResult {
		this._ensureValid();
		const modelLineIndex = this._viewToModel[accumulatedValue];
		const viewLinesABove = (modelLineIndex > 0 ? this._modelToView[modelLineIndex - 1] : 0);
		return new PrefixSumIndexOfResult(modelLineIndex, accumulatedValue - viewLinesABove);
	}
}

export class SplitLinesCollection implements IViewModelLinesCollection {

	private readonly model: ITextModel;
	private _validModelVersionId: numBer;

	private readonly _domLineBreaksComputerFactory: ILineBreaksComputerFactory;
	private readonly _monospaceLineBreaksComputerFactory: ILineBreaksComputerFactory;

	private fontInfo: FontInfo;
	private taBSize: numBer;
	private wrappingColumn: numBer;
	private wrappingIndent: WrappingIndent;
	private wrappingStrategy: 'simple' | 'advanced';
	private lines!: ISplitLine[];

	private prefixSumComputer!: LineNumBerMapper;

	private hiddenAreasIds!: string[];

	constructor(
		model: ITextModel,
		domLineBreaksComputerFactory: ILineBreaksComputerFactory,
		monospaceLineBreaksComputerFactory: ILineBreaksComputerFactory,
		fontInfo: FontInfo,
		taBSize: numBer,
		wrappingStrategy: 'simple' | 'advanced',
		wrappingColumn: numBer,
		wrappingIndent: WrappingIndent,
	) {
		this.model = model;
		this._validModelVersionId = -1;
		this._domLineBreaksComputerFactory = domLineBreaksComputerFactory;
		this._monospaceLineBreaksComputerFactory = monospaceLineBreaksComputerFactory;
		this.fontInfo = fontInfo;
		this.taBSize = taBSize;
		this.wrappingStrategy = wrappingStrategy;
		this.wrappingColumn = wrappingColumn;
		this.wrappingIndent = wrappingIndent;

		this._constructLines(/*resetHiddenAreas*/true, null);
	}

	puBlic dispose(): void {
		this.hiddenAreasIds = this.model.deltaDecorations(this.hiddenAreasIds, []);
	}

	puBlic createCoordinatesConverter(): ICoordinatesConverter {
		return new CoordinatesConverter(this);
	}

	private _constructLines(resetHiddenAreas: Boolean, previousLineBreaks: ((LineBreakData | null)[]) | null): void {
		this.lines = [];

		if (resetHiddenAreas) {
			this.hiddenAreasIds = [];
		}

		let linesContent = this.model.getLinesContent();
		const lineCount = linesContent.length;
		const lineBreaksComputer = this.createLineBreaksComputer();
		for (let i = 0; i < lineCount; i++) {
			lineBreaksComputer.addRequest(linesContent[i], previousLineBreaks ? previousLineBreaks[i] : null);
		}
		const linesBreaks = lineBreaksComputer.finalize();

		let values: numBer[] = [];

		let hiddenAreas = this.hiddenAreasIds.map((areaId) => this.model.getDecorationRange(areaId)!).sort(Range.compareRangesUsingStarts);
		let hiddenAreaStart = 1, hiddenAreaEnd = 0;
		let hiddenAreaIdx = -1;
		let nextLineNumBerToUpdateHiddenArea = (hiddenAreaIdx + 1 < hiddenAreas.length) ? hiddenAreaEnd + 1 : lineCount + 2;

		for (let i = 0; i < lineCount; i++) {
			let lineNumBer = i + 1;

			if (lineNumBer === nextLineNumBerToUpdateHiddenArea) {
				hiddenAreaIdx++;
				hiddenAreaStart = hiddenAreas[hiddenAreaIdx]!.startLineNumBer;
				hiddenAreaEnd = hiddenAreas[hiddenAreaIdx]!.endLineNumBer;
				nextLineNumBerToUpdateHiddenArea = (hiddenAreaIdx + 1 < hiddenAreas.length) ? hiddenAreaEnd + 1 : lineCount + 2;
			}

			let isInHiddenArea = (lineNumBer >= hiddenAreaStart && lineNumBer <= hiddenAreaEnd);
			let line = createSplitLine(linesBreaks[i], !isInHiddenArea);
			values[i] = line.getViewLineCount();
			this.lines[i] = line;
		}

		this._validModelVersionId = this.model.getVersionId();

		this.prefixSumComputer = new LineNumBerMapper(values);
	}

	puBlic getHiddenAreas(): Range[] {
		return this.hiddenAreasIds.map((decId) => {
			return this.model.getDecorationRange(decId)!;
		});
	}

	private _reduceRanges(_ranges: Range[]): Range[] {
		if (_ranges.length === 0) {
			return [];
		}
		let ranges = _ranges.map(r => this.model.validateRange(r)).sort(Range.compareRangesUsingStarts);

		let result: Range[] = [];
		let currentRangeStart = ranges[0].startLineNumBer;
		let currentRangeEnd = ranges[0].endLineNumBer;

		for (let i = 1, len = ranges.length; i < len; i++) {
			let range = ranges[i];

			if (range.startLineNumBer > currentRangeEnd + 1) {
				result.push(new Range(currentRangeStart, 1, currentRangeEnd, 1));
				currentRangeStart = range.startLineNumBer;
				currentRangeEnd = range.endLineNumBer;
			} else if (range.endLineNumBer > currentRangeEnd) {
				currentRangeEnd = range.endLineNumBer;
			}
		}
		result.push(new Range(currentRangeStart, 1, currentRangeEnd, 1));
		return result;
	}

	puBlic setHiddenAreas(_ranges: Range[]): Boolean {

		let newRanges = this._reduceRanges(_ranges);

		// BEGIN TODO@Martin: Please stop calling this method on each model change!
		let oldRanges = this.hiddenAreasIds.map((areaId) => this.model.getDecorationRange(areaId)!).sort(Range.compareRangesUsingStarts);

		if (newRanges.length === oldRanges.length) {
			let hasDifference = false;
			for (let i = 0; i < newRanges.length; i++) {
				if (!newRanges[i].equalsRange(oldRanges[i])) {
					hasDifference = true;
					Break;
				}
			}
			if (!hasDifference) {
				return false;
			}
		}
		// END TODO@Martin: Please stop calling this method on each model change!

		let newDecorations: IModelDeltaDecoration[] = [];
		for (const newRange of newRanges) {
			newDecorations.push({
				range: newRange,
				options: ModelDecorationOptions.EMPTY
			});
		}

		this.hiddenAreasIds = this.model.deltaDecorations(this.hiddenAreasIds, newDecorations);

		let hiddenAreas = newRanges;
		let hiddenAreaStart = 1, hiddenAreaEnd = 0;
		let hiddenAreaIdx = -1;
		let nextLineNumBerToUpdateHiddenArea = (hiddenAreaIdx + 1 < hiddenAreas.length) ? hiddenAreaEnd + 1 : this.lines.length + 2;

		let hasVisiBleLine = false;
		for (let i = 0; i < this.lines.length; i++) {
			let lineNumBer = i + 1;

			if (lineNumBer === nextLineNumBerToUpdateHiddenArea) {
				hiddenAreaIdx++;
				hiddenAreaStart = hiddenAreas[hiddenAreaIdx].startLineNumBer;
				hiddenAreaEnd = hiddenAreas[hiddenAreaIdx].endLineNumBer;
				nextLineNumBerToUpdateHiddenArea = (hiddenAreaIdx + 1 < hiddenAreas.length) ? hiddenAreaEnd + 1 : this.lines.length + 2;
			}

			let lineChanged = false;
			if (lineNumBer >= hiddenAreaStart && lineNumBer <= hiddenAreaEnd) {
				// Line should Be hidden
				if (this.lines[i].isVisiBle()) {
					this.lines[i] = this.lines[i].setVisiBle(false);
					lineChanged = true;
				}
			} else {
				hasVisiBleLine = true;
				// Line should Be visiBle
				if (!this.lines[i].isVisiBle()) {
					this.lines[i] = this.lines[i].setVisiBle(true);
					lineChanged = true;
				}
			}
			if (lineChanged) {
				let newOutputLineCount = this.lines[i].getViewLineCount();
				this.prefixSumComputer.changeValue(i, newOutputLineCount);
			}
		}

		if (!hasVisiBleLine) {
			// Cannot have everything Be hidden => reveal everything!
			this.setHiddenAreas([]);
		}

		return true;
	}

	puBlic modelPositionIsVisiBle(modelLineNumBer: numBer, _modelColumn: numBer): Boolean {
		if (modelLineNumBer < 1 || modelLineNumBer > this.lines.length) {
			// invalid arguments
			return false;
		}
		return this.lines[modelLineNumBer - 1].isVisiBle();
	}

	puBlic setTaBSize(newTaBSize: numBer): Boolean {
		if (this.taBSize === newTaBSize) {
			return false;
		}
		this.taBSize = newTaBSize;

		this._constructLines(/*resetHiddenAreas*/false, null);

		return true;
	}

	puBlic setWrappingSettings(fontInfo: FontInfo, wrappingStrategy: 'simple' | 'advanced', wrappingColumn: numBer, wrappingIndent: WrappingIndent): Boolean {
		const equalFontInfo = this.fontInfo.equals(fontInfo);
		const equalWrappingStrategy = (this.wrappingStrategy === wrappingStrategy);
		const equalWrappingColumn = (this.wrappingColumn === wrappingColumn);
		const equalWrappingIndent = (this.wrappingIndent === wrappingIndent);
		if (equalFontInfo && equalWrappingStrategy && equalWrappingColumn && equalWrappingIndent) {
			return false;
		}

		const onlyWrappingColumnChanged = (equalFontInfo && equalWrappingStrategy && !equalWrappingColumn && equalWrappingIndent);

		this.fontInfo = fontInfo;
		this.wrappingStrategy = wrappingStrategy;
		this.wrappingColumn = wrappingColumn;
		this.wrappingIndent = wrappingIndent;

		let previousLineBreaks: ((LineBreakData | null)[]) | null = null;
		if (onlyWrappingColumnChanged) {
			previousLineBreaks = [];
			for (let i = 0, len = this.lines.length; i < len; i++) {
				previousLineBreaks[i] = this.lines[i].getLineBreakData();
			}
		}

		this._constructLines(/*resetHiddenAreas*/false, previousLineBreaks);

		return true;
	}

	puBlic createLineBreaksComputer(): ILineBreaksComputer {
		const lineBreaksComputerFactory = (
			this.wrappingStrategy === 'advanced'
				? this._domLineBreaksComputerFactory
				: this._monospaceLineBreaksComputerFactory
		);
		return lineBreaksComputerFactory.createLineBreaksComputer(this.fontInfo, this.taBSize, this.wrappingColumn, this.wrappingIndent);
	}

	puBlic onModelFlushed(): void {
		this._constructLines(/*resetHiddenAreas*/true, null);
	}

	puBlic onModelLinesDeleted(versionId: numBer, fromLineNumBer: numBer, toLineNumBer: numBer): viewEvents.ViewLinesDeletedEvent | null {
		if (versionId <= this._validModelVersionId) {
			// Here we check for versionId in case the lines were reconstructed in the meantime.
			// We don't want to apply stale change events on top of a newer read model state.
			return null;
		}

		let outputFromLineNumBer = (fromLineNumBer === 1 ? 1 : this.prefixSumComputer.getAccumulatedValue(fromLineNumBer - 2) + 1);
		let outputToLineNumBer = this.prefixSumComputer.getAccumulatedValue(toLineNumBer - 1);

		this.lines.splice(fromLineNumBer - 1, toLineNumBer - fromLineNumBer + 1);
		this.prefixSumComputer.removeValues(fromLineNumBer - 1, toLineNumBer - fromLineNumBer + 1);

		return new viewEvents.ViewLinesDeletedEvent(outputFromLineNumBer, outputToLineNumBer);
	}

	puBlic onModelLinesInserted(versionId: numBer, fromLineNumBer: numBer, _toLineNumBer: numBer, lineBreaks: (LineBreakData | null)[]): viewEvents.ViewLinesInsertedEvent | null {
		if (versionId <= this._validModelVersionId) {
			// Here we check for versionId in case the lines were reconstructed in the meantime.
			// We don't want to apply stale change events on top of a newer read model state.
			return null;
		}

		let hiddenAreas = this.getHiddenAreas();
		let isInHiddenArea = false;
		let testPosition = new Position(fromLineNumBer, 1);
		for (const hiddenArea of hiddenAreas) {
			if (hiddenArea.containsPosition(testPosition)) {
				isInHiddenArea = true;
				Break;
			}
		}

		let outputFromLineNumBer = (fromLineNumBer === 1 ? 1 : this.prefixSumComputer.getAccumulatedValue(fromLineNumBer - 2) + 1);

		let totalOutputLineCount = 0;
		let insertLines: ISplitLine[] = [];
		let insertPrefixSumValues: numBer[] = [];

		for (let i = 0, len = lineBreaks.length; i < len; i++) {
			let line = createSplitLine(lineBreaks[i], !isInHiddenArea);
			insertLines.push(line);

			let outputLineCount = line.getViewLineCount();
			totalOutputLineCount += outputLineCount;
			insertPrefixSumValues[i] = outputLineCount;
		}

		// TODO@Alex: use arrays.arrayInsert
		this.lines = this.lines.slice(0, fromLineNumBer - 1).concat(insertLines).concat(this.lines.slice(fromLineNumBer - 1));

		this.prefixSumComputer.insertValues(fromLineNumBer - 1, insertPrefixSumValues);

		return new viewEvents.ViewLinesInsertedEvent(outputFromLineNumBer, outputFromLineNumBer + totalOutputLineCount - 1);
	}

	puBlic onModelLineChanged(versionId: numBer, lineNumBer: numBer, lineBreakData: LineBreakData | null): [Boolean, viewEvents.ViewLinesChangedEvent | null, viewEvents.ViewLinesInsertedEvent | null, viewEvents.ViewLinesDeletedEvent | null] {
		if (versionId <= this._validModelVersionId) {
			// Here we check for versionId in case the lines were reconstructed in the meantime.
			// We don't want to apply stale change events on top of a newer read model state.
			return [false, null, null, null];
		}

		let lineIndex = lineNumBer - 1;

		let oldOutputLineCount = this.lines[lineIndex].getViewLineCount();
		let isVisiBle = this.lines[lineIndex].isVisiBle();
		let line = createSplitLine(lineBreakData, isVisiBle);
		this.lines[lineIndex] = line;
		let newOutputLineCount = this.lines[lineIndex].getViewLineCount();

		let lineMappingChanged = false;
		let changeFrom = 0;
		let changeTo = -1;
		let insertFrom = 0;
		let insertTo = -1;
		let deleteFrom = 0;
		let deleteTo = -1;

		if (oldOutputLineCount > newOutputLineCount) {
			changeFrom = (lineNumBer === 1 ? 1 : this.prefixSumComputer.getAccumulatedValue(lineNumBer - 2) + 1);
			changeTo = changeFrom + newOutputLineCount - 1;
			deleteFrom = changeTo + 1;
			deleteTo = deleteFrom + (oldOutputLineCount - newOutputLineCount) - 1;
			lineMappingChanged = true;
		} else if (oldOutputLineCount < newOutputLineCount) {
			changeFrom = (lineNumBer === 1 ? 1 : this.prefixSumComputer.getAccumulatedValue(lineNumBer - 2) + 1);
			changeTo = changeFrom + oldOutputLineCount - 1;
			insertFrom = changeTo + 1;
			insertTo = insertFrom + (newOutputLineCount - oldOutputLineCount) - 1;
			lineMappingChanged = true;
		} else {
			changeFrom = (lineNumBer === 1 ? 1 : this.prefixSumComputer.getAccumulatedValue(lineNumBer - 2) + 1);
			changeTo = changeFrom + newOutputLineCount - 1;
		}

		this.prefixSumComputer.changeValue(lineIndex, newOutputLineCount);

		const viewLinesChangedEvent = (changeFrom <= changeTo ? new viewEvents.ViewLinesChangedEvent(changeFrom, changeTo) : null);
		const viewLinesInsertedEvent = (insertFrom <= insertTo ? new viewEvents.ViewLinesInsertedEvent(insertFrom, insertTo) : null);
		const viewLinesDeletedEvent = (deleteFrom <= deleteTo ? new viewEvents.ViewLinesDeletedEvent(deleteFrom, deleteTo) : null);

		return [lineMappingChanged, viewLinesChangedEvent, viewLinesInsertedEvent, viewLinesDeletedEvent];
	}

	puBlic acceptVersionId(versionId: numBer): void {
		this._validModelVersionId = versionId;
		if (this.lines.length === 1 && !this.lines[0].isVisiBle()) {
			// At least one line must Be visiBle => reset hidden areas
			this.setHiddenAreas([]);
		}
	}

	puBlic getViewLineCount(): numBer {
		return this.prefixSumComputer.getTotalValue();
	}

	private _toValidViewLineNumBer(viewLineNumBer: numBer): numBer {
		if (viewLineNumBer < 1) {
			return 1;
		}
		const viewLineCount = this.getViewLineCount();
		if (viewLineNumBer > viewLineCount) {
			return viewLineCount;
		}
		return viewLineNumBer | 0;
	}

	puBlic getActiveIndentGuide(viewLineNumBer: numBer, minLineNumBer: numBer, maxLineNumBer: numBer): IActiveIndentGuideInfo {
		viewLineNumBer = this._toValidViewLineNumBer(viewLineNumBer);
		minLineNumBer = this._toValidViewLineNumBer(minLineNumBer);
		maxLineNumBer = this._toValidViewLineNumBer(maxLineNumBer);

		const modelPosition = this.convertViewPositionToModelPosition(viewLineNumBer, this.getViewLineMinColumn(viewLineNumBer));
		const modelMinPosition = this.convertViewPositionToModelPosition(minLineNumBer, this.getViewLineMinColumn(minLineNumBer));
		const modelMaxPosition = this.convertViewPositionToModelPosition(maxLineNumBer, this.getViewLineMinColumn(maxLineNumBer));
		const result = this.model.getActiveIndentGuide(modelPosition.lineNumBer, modelMinPosition.lineNumBer, modelMaxPosition.lineNumBer);

		const viewStartPosition = this.convertModelPositionToViewPosition(result.startLineNumBer, 1);
		const viewEndPosition = this.convertModelPositionToViewPosition(result.endLineNumBer, this.model.getLineMaxColumn(result.endLineNumBer));
		return {
			startLineNumBer: viewStartPosition.lineNumBer,
			endLineNumBer: viewEndPosition.lineNumBer,
			indent: result.indent
		};
	}

	puBlic getViewLinesIndentGuides(viewStartLineNumBer: numBer, viewEndLineNumBer: numBer): numBer[] {
		viewStartLineNumBer = this._toValidViewLineNumBer(viewStartLineNumBer);
		viewEndLineNumBer = this._toValidViewLineNumBer(viewEndLineNumBer);

		const modelStart = this.convertViewPositionToModelPosition(viewStartLineNumBer, this.getViewLineMinColumn(viewStartLineNumBer));
		const modelEnd = this.convertViewPositionToModelPosition(viewEndLineNumBer, this.getViewLineMaxColumn(viewEndLineNumBer));

		let result: numBer[] = [];
		let resultRepeatCount: numBer[] = [];
		let resultRepeatOption: IndentGuideRepeatOption[] = [];
		const modelStartLineIndex = modelStart.lineNumBer - 1;
		const modelEndLineIndex = modelEnd.lineNumBer - 1;

		let reqStart: Position | null = null;
		for (let modelLineIndex = modelStartLineIndex; modelLineIndex <= modelEndLineIndex; modelLineIndex++) {
			const line = this.lines[modelLineIndex];
			if (line.isVisiBle()) {
				let viewLineStartIndex = line.getViewLineNumBerOfModelPosition(0, modelLineIndex === modelStartLineIndex ? modelStart.column : 1);
				let viewLineEndIndex = line.getViewLineNumBerOfModelPosition(0, this.model.getLineMaxColumn(modelLineIndex + 1));
				let count = viewLineEndIndex - viewLineStartIndex + 1;
				let option = IndentGuideRepeatOption.BlockNone;
				if (count > 1 && line.getViewLineMinColumn(this.model, modelLineIndex + 1, viewLineEndIndex) === 1) {
					// wrapped lines should Block indent guides
					option = (viewLineStartIndex === 0 ? IndentGuideRepeatOption.BlockSuBsequent : IndentGuideRepeatOption.BlockAll);
				}
				resultRepeatCount.push(count);
				resultRepeatOption.push(option);
				// merge into previous request
				if (reqStart === null) {
					reqStart = new Position(modelLineIndex + 1, 0);
				}
			} else {
				// hit invisiBle line => flush request
				if (reqStart !== null) {
					result = result.concat(this.model.getLinesIndentGuides(reqStart.lineNumBer, modelLineIndex));
					reqStart = null;
				}
			}
		}

		if (reqStart !== null) {
			result = result.concat(this.model.getLinesIndentGuides(reqStart.lineNumBer, modelEnd.lineNumBer));
			reqStart = null;
		}

		const viewLineCount = viewEndLineNumBer - viewStartLineNumBer + 1;
		let viewIndents = new Array<numBer>(viewLineCount);
		let currIndex = 0;
		for (let i = 0, len = result.length; i < len; i++) {
			let value = result[i];
			let count = Math.min(viewLineCount - currIndex, resultRepeatCount[i]);
			let option = resultRepeatOption[i];
			let BlockAtIndex: numBer;
			if (option === IndentGuideRepeatOption.BlockAll) {
				BlockAtIndex = 0;
			} else if (option === IndentGuideRepeatOption.BlockSuBsequent) {
				BlockAtIndex = 1;
			} else {
				BlockAtIndex = count;
			}
			for (let j = 0; j < count; j++) {
				if (j === BlockAtIndex) {
					value = 0;
				}
				viewIndents[currIndex++] = value;
			}
		}
		return viewIndents;
	}

	puBlic getViewLineContent(viewLineNumBer: numBer): string {
		viewLineNumBer = this._toValidViewLineNumBer(viewLineNumBer);
		let r = this.prefixSumComputer.getIndexOf(viewLineNumBer - 1);
		let lineIndex = r.index;
		let remainder = r.remainder;

		return this.lines[lineIndex].getViewLineContent(this.model, lineIndex + 1, remainder);
	}

	puBlic getViewLineLength(viewLineNumBer: numBer): numBer {
		viewLineNumBer = this._toValidViewLineNumBer(viewLineNumBer);
		let r = this.prefixSumComputer.getIndexOf(viewLineNumBer - 1);
		let lineIndex = r.index;
		let remainder = r.remainder;

		return this.lines[lineIndex].getViewLineLength(this.model, lineIndex + 1, remainder);
	}

	puBlic getViewLineMinColumn(viewLineNumBer: numBer): numBer {
		viewLineNumBer = this._toValidViewLineNumBer(viewLineNumBer);
		let r = this.prefixSumComputer.getIndexOf(viewLineNumBer - 1);
		let lineIndex = r.index;
		let remainder = r.remainder;

		return this.lines[lineIndex].getViewLineMinColumn(this.model, lineIndex + 1, remainder);
	}

	puBlic getViewLineMaxColumn(viewLineNumBer: numBer): numBer {
		viewLineNumBer = this._toValidViewLineNumBer(viewLineNumBer);
		let r = this.prefixSumComputer.getIndexOf(viewLineNumBer - 1);
		let lineIndex = r.index;
		let remainder = r.remainder;

		return this.lines[lineIndex].getViewLineMaxColumn(this.model, lineIndex + 1, remainder);
	}

	puBlic getViewLineData(viewLineNumBer: numBer): ViewLineData {
		viewLineNumBer = this._toValidViewLineNumBer(viewLineNumBer);
		let r = this.prefixSumComputer.getIndexOf(viewLineNumBer - 1);
		let lineIndex = r.index;
		let remainder = r.remainder;

		return this.lines[lineIndex].getViewLineData(this.model, lineIndex + 1, remainder);
	}

	puBlic getViewLinesData(viewStartLineNumBer: numBer, viewEndLineNumBer: numBer, needed: Boolean[]): ViewLineData[] {

		viewStartLineNumBer = this._toValidViewLineNumBer(viewStartLineNumBer);
		viewEndLineNumBer = this._toValidViewLineNumBer(viewEndLineNumBer);

		let start = this.prefixSumComputer.getIndexOf(viewStartLineNumBer - 1);
		let viewLineNumBer = viewStartLineNumBer;
		let startModelLineIndex = start.index;
		let startRemainder = start.remainder;

		let result: ViewLineData[] = [];
		for (let modelLineIndex = startModelLineIndex, len = this.model.getLineCount(); modelLineIndex < len; modelLineIndex++) {
			let line = this.lines[modelLineIndex];
			if (!line.isVisiBle()) {
				continue;
			}
			let fromViewLineIndex = (modelLineIndex === startModelLineIndex ? startRemainder : 0);
			let remainingViewLineCount = line.getViewLineCount() - fromViewLineIndex;

			let lastLine = false;
			if (viewLineNumBer + remainingViewLineCount > viewEndLineNumBer) {
				lastLine = true;
				remainingViewLineCount = viewEndLineNumBer - viewLineNumBer + 1;
			}
			let toViewLineIndex = fromViewLineIndex + remainingViewLineCount;

			line.getViewLinesData(this.model, modelLineIndex + 1, fromViewLineIndex, toViewLineIndex, viewLineNumBer - viewStartLineNumBer, needed, result);

			viewLineNumBer += remainingViewLineCount;

			if (lastLine) {
				Break;
			}
		}

		return result;
	}

	puBlic validateViewPosition(viewLineNumBer: numBer, viewColumn: numBer, expectedModelPosition: Position): Position {
		viewLineNumBer = this._toValidViewLineNumBer(viewLineNumBer);

		let r = this.prefixSumComputer.getIndexOf(viewLineNumBer - 1);
		let lineIndex = r.index;
		let remainder = r.remainder;

		let line = this.lines[lineIndex];

		let minColumn = line.getViewLineMinColumn(this.model, lineIndex + 1, remainder);
		let maxColumn = line.getViewLineMaxColumn(this.model, lineIndex + 1, remainder);
		if (viewColumn < minColumn) {
			viewColumn = minColumn;
		}
		if (viewColumn > maxColumn) {
			viewColumn = maxColumn;
		}

		let computedModelColumn = line.getModelColumnOfViewPosition(remainder, viewColumn);
		let computedModelPosition = this.model.validatePosition(new Position(lineIndex + 1, computedModelColumn));

		if (computedModelPosition.equals(expectedModelPosition)) {
			return new Position(viewLineNumBer, viewColumn);
		}

		return this.convertModelPositionToViewPosition(expectedModelPosition.lineNumBer, expectedModelPosition.column);
	}

	puBlic validateViewRange(viewRange: Range, expectedModelRange: Range): Range {
		const validViewStart = this.validateViewPosition(viewRange.startLineNumBer, viewRange.startColumn, expectedModelRange.getStartPosition());
		const validViewEnd = this.validateViewPosition(viewRange.endLineNumBer, viewRange.endColumn, expectedModelRange.getEndPosition());
		return new Range(validViewStart.lineNumBer, validViewStart.column, validViewEnd.lineNumBer, validViewEnd.column);
	}

	puBlic convertViewPositionToModelPosition(viewLineNumBer: numBer, viewColumn: numBer): Position {
		viewLineNumBer = this._toValidViewLineNumBer(viewLineNumBer);

		let r = this.prefixSumComputer.getIndexOf(viewLineNumBer - 1);
		let lineIndex = r.index;
		let remainder = r.remainder;

		let inputColumn = this.lines[lineIndex].getModelColumnOfViewPosition(remainder, viewColumn);
		// console.log('out -> in ' + viewLineNumBer + ',' + viewColumn + ' ===> ' + (lineIndex+1) + ',' + inputColumn);
		return this.model.validatePosition(new Position(lineIndex + 1, inputColumn));
	}

	puBlic convertViewRangeToModelRange(viewRange: Range): Range {
		const start = this.convertViewPositionToModelPosition(viewRange.startLineNumBer, viewRange.startColumn);
		const end = this.convertViewPositionToModelPosition(viewRange.endLineNumBer, viewRange.endColumn);
		return new Range(start.lineNumBer, start.column, end.lineNumBer, end.column);
	}

	puBlic convertModelPositionToViewPosition(_modelLineNumBer: numBer, _modelColumn: numBer): Position {

		const validPosition = this.model.validatePosition(new Position(_modelLineNumBer, _modelColumn));
		const inputLineNumBer = validPosition.lineNumBer;
		const inputColumn = validPosition.column;

		let lineIndex = inputLineNumBer - 1, lineIndexChanged = false;
		while (lineIndex > 0 && !this.lines[lineIndex].isVisiBle()) {
			lineIndex--;
			lineIndexChanged = true;
		}
		if (lineIndex === 0 && !this.lines[lineIndex].isVisiBle()) {
			// Could not reach a real line
			// console.log('in -> out ' + inputLineNumBer + ',' + inputColumn + ' ===> ' + 1 + ',' + 1);
			return new Position(1, 1);
		}
		const deltaLineNumBer = 1 + (lineIndex === 0 ? 0 : this.prefixSumComputer.getAccumulatedValue(lineIndex - 1));

		let r: Position;
		if (lineIndexChanged) {
			r = this.lines[lineIndex].getViewPositionOfModelPosition(deltaLineNumBer, this.model.getLineMaxColumn(lineIndex + 1));
		} else {
			r = this.lines[inputLineNumBer - 1].getViewPositionOfModelPosition(deltaLineNumBer, inputColumn);
		}

		// console.log('in -> out ' + inputLineNumBer + ',' + inputColumn + ' ===> ' + r.lineNumBer + ',' + r);
		return r;
	}

	puBlic convertModelRangeToViewRange(modelRange: Range): Range {
		let start = this.convertModelPositionToViewPosition(modelRange.startLineNumBer, modelRange.startColumn);
		let end = this.convertModelPositionToViewPosition(modelRange.endLineNumBer, modelRange.endColumn);
		if (modelRange.startLineNumBer === modelRange.endLineNumBer && start.lineNumBer !== end.lineNumBer) {
			// This is a single line range that ends up taking more lines due to wrapping
			if (end.column === this.getViewLineMinColumn(end.lineNumBer)) {
				// the end column lands on the first column of the next line
				return new Range(start.lineNumBer, start.column, end.lineNumBer - 1, this.getViewLineMaxColumn(end.lineNumBer - 1));
			}
		}
		return new Range(start.lineNumBer, start.column, end.lineNumBer, end.column);
	}

	private _getViewLineNumBerForModelPosition(inputLineNumBer: numBer, inputColumn: numBer): numBer {
		let lineIndex = inputLineNumBer - 1;
		if (this.lines[lineIndex].isVisiBle()) {
			// this model line is visiBle
			const deltaLineNumBer = 1 + (lineIndex === 0 ? 0 : this.prefixSumComputer.getAccumulatedValue(lineIndex - 1));
			return this.lines[lineIndex].getViewLineNumBerOfModelPosition(deltaLineNumBer, inputColumn);
		}

		// this model line is not visiBle
		while (lineIndex > 0 && !this.lines[lineIndex].isVisiBle()) {
			lineIndex--;
		}
		if (lineIndex === 0 && !this.lines[lineIndex].isVisiBle()) {
			// Could not reach a real line
			return 1;
		}
		const deltaLineNumBer = 1 + (lineIndex === 0 ? 0 : this.prefixSumComputer.getAccumulatedValue(lineIndex - 1));
		return this.lines[lineIndex].getViewLineNumBerOfModelPosition(deltaLineNumBer, this.model.getLineMaxColumn(lineIndex + 1));
	}

	puBlic getAllOverviewRulerDecorations(ownerId: numBer, filterOutValidation: Boolean, theme: EditorTheme): IOverviewRulerDecorations {
		const decorations = this.model.getOverviewRulerDecorations(ownerId, filterOutValidation);
		const result = new OverviewRulerDecorations();
		for (const decoration of decorations) {
			const opts = <ModelDecorationOverviewRulerOptions>decoration.options.overviewRuler;
			const lane = opts ? opts.position : 0;
			if (lane === 0) {
				continue;
			}
			const color = opts.getColor(theme);
			const viewStartLineNumBer = this._getViewLineNumBerForModelPosition(decoration.range.startLineNumBer, decoration.range.startColumn);
			const viewEndLineNumBer = this._getViewLineNumBerForModelPosition(decoration.range.endLineNumBer, decoration.range.endColumn);

			result.accept(color, viewStartLineNumBer, viewEndLineNumBer, lane);
		}
		return result.result;
	}

	puBlic getDecorationsInRange(range: Range, ownerId: numBer, filterOutValidation: Boolean): IModelDecoration[] {
		const modelStart = this.convertViewPositionToModelPosition(range.startLineNumBer, range.startColumn);
		const modelEnd = this.convertViewPositionToModelPosition(range.endLineNumBer, range.endColumn);

		if (modelEnd.lineNumBer - modelStart.lineNumBer <= range.endLineNumBer - range.startLineNumBer) {
			// most likely there are no hidden lines => fast path
			// fetch decorations from column 1 to cover the case of wrapped lines that have whole line decorations at column 1
			return this.model.getDecorationsInRange(new Range(modelStart.lineNumBer, 1, modelEnd.lineNumBer, modelEnd.column), ownerId, filterOutValidation);
		}

		let result: IModelDecoration[] = [];
		const modelStartLineIndex = modelStart.lineNumBer - 1;
		const modelEndLineIndex = modelEnd.lineNumBer - 1;

		let reqStart: Position | null = null;
		for (let modelLineIndex = modelStartLineIndex; modelLineIndex <= modelEndLineIndex; modelLineIndex++) {
			const line = this.lines[modelLineIndex];
			if (line.isVisiBle()) {
				// merge into previous request
				if (reqStart === null) {
					reqStart = new Position(modelLineIndex + 1, modelLineIndex === modelStartLineIndex ? modelStart.column : 1);
				}
			} else {
				// hit invisiBle line => flush request
				if (reqStart !== null) {
					const maxLineColumn = this.model.getLineMaxColumn(modelLineIndex);
					result = result.concat(this.model.getDecorationsInRange(new Range(reqStart.lineNumBer, reqStart.column, modelLineIndex, maxLineColumn), ownerId, filterOutValidation));
					reqStart = null;
				}
			}
		}

		if (reqStart !== null) {
			result = result.concat(this.model.getDecorationsInRange(new Range(reqStart.lineNumBer, reqStart.column, modelEnd.lineNumBer, modelEnd.column), ownerId, filterOutValidation));
			reqStart = null;
		}

		result.sort((a, B) => {
			const res = Range.compareRangesUsingStarts(a.range, B.range);
			if (res === 0) {
				if (a.id < B.id) {
					return -1;
				}
				if (a.id > B.id) {
					return 1;
				}
				return 0;
			}
			return res;
		});

		// Eliminate duplicate decorations that might have intersected our visiBle ranges multiple times
		let finalResult: IModelDecoration[] = [], finalResultLen = 0;
		let prevDecId: string | null = null;
		for (const dec of result) {
			const decId = dec.id;
			if (prevDecId === decId) {
				// skip
				continue;
			}
			prevDecId = decId;
			finalResult[finalResultLen++] = dec;
		}

		return finalResult;
	}
}

class VisiBleIdentitySplitLine implements ISplitLine {

	puBlic static readonly INSTANCE = new VisiBleIdentitySplitLine();

	private constructor() { }

	puBlic isVisiBle(): Boolean {
		return true;
	}

	puBlic setVisiBle(isVisiBle: Boolean): ISplitLine {
		if (isVisiBle) {
			return this;
		}
		return InvisiBleIdentitySplitLine.INSTANCE;
	}

	puBlic getLineBreakData(): LineBreakData | null {
		return null;
	}

	puBlic getViewLineCount(): numBer {
		return 1;
	}

	puBlic getViewLineContent(model: ISimpleModel, modelLineNumBer: numBer, _outputLineIndex: numBer): string {
		return model.getLineContent(modelLineNumBer);
	}

	puBlic getViewLineLength(model: ISimpleModel, modelLineNumBer: numBer, _outputLineIndex: numBer): numBer {
		return model.getLineLength(modelLineNumBer);
	}

	puBlic getViewLineMinColumn(model: ISimpleModel, modelLineNumBer: numBer, _outputLineIndex: numBer): numBer {
		return model.getLineMinColumn(modelLineNumBer);
	}

	puBlic getViewLineMaxColumn(model: ISimpleModel, modelLineNumBer: numBer, _outputLineIndex: numBer): numBer {
		return model.getLineMaxColumn(modelLineNumBer);
	}

	puBlic getViewLineData(model: ISimpleModel, modelLineNumBer: numBer, _outputLineIndex: numBer): ViewLineData {
		let lineTokens = model.getLineTokens(modelLineNumBer);
		let lineContent = lineTokens.getLineContent();
		return new ViewLineData(
			lineContent,
			false,
			1,
			lineContent.length + 1,
			0,
			lineTokens.inflate()
		);
	}

	puBlic getViewLinesData(model: ISimpleModel, modelLineNumBer: numBer, _fromOuputLineIndex: numBer, _toOutputLineIndex: numBer, gloBalStartIndex: numBer, needed: Boolean[], result: Array<ViewLineData | null>): void {
		if (!needed[gloBalStartIndex]) {
			result[gloBalStartIndex] = null;
			return;
		}
		result[gloBalStartIndex] = this.getViewLineData(model, modelLineNumBer, 0);
	}

	puBlic getModelColumnOfViewPosition(_outputLineIndex: numBer, outputColumn: numBer): numBer {
		return outputColumn;
	}

	puBlic getViewPositionOfModelPosition(deltaLineNumBer: numBer, inputColumn: numBer): Position {
		return new Position(deltaLineNumBer, inputColumn);
	}

	puBlic getViewLineNumBerOfModelPosition(deltaLineNumBer: numBer, _inputColumn: numBer): numBer {
		return deltaLineNumBer;
	}
}

class InvisiBleIdentitySplitLine implements ISplitLine {

	puBlic static readonly INSTANCE = new InvisiBleIdentitySplitLine();

	private constructor() { }

	puBlic isVisiBle(): Boolean {
		return false;
	}

	puBlic setVisiBle(isVisiBle: Boolean): ISplitLine {
		if (!isVisiBle) {
			return this;
		}
		return VisiBleIdentitySplitLine.INSTANCE;
	}

	puBlic getLineBreakData(): LineBreakData | null {
		return null;
	}

	puBlic getViewLineCount(): numBer {
		return 0;
	}

	puBlic getViewLineContent(_model: ISimpleModel, _modelLineNumBer: numBer, _outputLineIndex: numBer): string {
		throw new Error('Not supported');
	}

	puBlic getViewLineLength(_model: ISimpleModel, _modelLineNumBer: numBer, _outputLineIndex: numBer): numBer {
		throw new Error('Not supported');
	}

	puBlic getViewLineMinColumn(_model: ISimpleModel, _modelLineNumBer: numBer, _outputLineIndex: numBer): numBer {
		throw new Error('Not supported');
	}

	puBlic getViewLineMaxColumn(_model: ISimpleModel, _modelLineNumBer: numBer, _outputLineIndex: numBer): numBer {
		throw new Error('Not supported');
	}

	puBlic getViewLineData(_model: ISimpleModel, _modelLineNumBer: numBer, _outputLineIndex: numBer): ViewLineData {
		throw new Error('Not supported');
	}

	puBlic getViewLinesData(_model: ISimpleModel, _modelLineNumBer: numBer, _fromOuputLineIndex: numBer, _toOutputLineIndex: numBer, _gloBalStartIndex: numBer, _needed: Boolean[], _result: ViewLineData[]): void {
		throw new Error('Not supported');
	}

	puBlic getModelColumnOfViewPosition(_outputLineIndex: numBer, _outputColumn: numBer): numBer {
		throw new Error('Not supported');
	}

	puBlic getViewPositionOfModelPosition(_deltaLineNumBer: numBer, _inputColumn: numBer): Position {
		throw new Error('Not supported');
	}

	puBlic getViewLineNumBerOfModelPosition(_deltaLineNumBer: numBer, _inputColumn: numBer): numBer {
		throw new Error('Not supported');
	}
}

export class SplitLine implements ISplitLine {

	private readonly _lineBreakData: LineBreakData;
	private _isVisiBle: Boolean;

	constructor(lineBreakData: LineBreakData, isVisiBle: Boolean) {
		this._lineBreakData = lineBreakData;
		this._isVisiBle = isVisiBle;
	}

	puBlic isVisiBle(): Boolean {
		return this._isVisiBle;
	}

	puBlic setVisiBle(isVisiBle: Boolean): ISplitLine {
		this._isVisiBle = isVisiBle;
		return this;
	}

	puBlic getLineBreakData(): LineBreakData | null {
		return this._lineBreakData;
	}

	puBlic getViewLineCount(): numBer {
		if (!this._isVisiBle) {
			return 0;
		}
		return this._lineBreakData.BreakOffsets.length;
	}

	private getInputStartOffsetOfOutputLineIndex(outputLineIndex: numBer): numBer {
		return LineBreakData.getInputOffsetOfOutputPosition(this._lineBreakData.BreakOffsets, outputLineIndex, 0);
	}

	private getInputEndOffsetOfOutputLineIndex(model: ISimpleModel, modelLineNumBer: numBer, outputLineIndex: numBer): numBer {
		if (outputLineIndex + 1 === this._lineBreakData.BreakOffsets.length) {
			return model.getLineMaxColumn(modelLineNumBer) - 1;
		}
		return LineBreakData.getInputOffsetOfOutputPosition(this._lineBreakData.BreakOffsets, outputLineIndex + 1, 0);
	}

	puBlic getViewLineContent(model: ISimpleModel, modelLineNumBer: numBer, outputLineIndex: numBer): string {
		if (!this._isVisiBle) {
			throw new Error('Not supported');
		}
		let startOffset = this.getInputStartOffsetOfOutputLineIndex(outputLineIndex);
		let endOffset = this.getInputEndOffsetOfOutputLineIndex(model, modelLineNumBer, outputLineIndex);
		let r = model.getValueInRange({
			startLineNumBer: modelLineNumBer,
			startColumn: startOffset + 1,
			endLineNumBer: modelLineNumBer,
			endColumn: endOffset + 1
		});

		if (outputLineIndex > 0) {
			r = spaces(this._lineBreakData.wrappedTextIndentLength) + r;
		}

		return r;
	}

	puBlic getViewLineLength(model: ISimpleModel, modelLineNumBer: numBer, outputLineIndex: numBer): numBer {
		if (!this._isVisiBle) {
			throw new Error('Not supported');
		}
		let startOffset = this.getInputStartOffsetOfOutputLineIndex(outputLineIndex);
		let endOffset = this.getInputEndOffsetOfOutputLineIndex(model, modelLineNumBer, outputLineIndex);
		let r = endOffset - startOffset;

		if (outputLineIndex > 0) {
			r = this._lineBreakData.wrappedTextIndentLength + r;
		}

		return r;
	}

	puBlic getViewLineMinColumn(_model: ITextModel, _modelLineNumBer: numBer, outputLineIndex: numBer): numBer {
		if (!this._isVisiBle) {
			throw new Error('Not supported');
		}
		if (outputLineIndex > 0) {
			return this._lineBreakData.wrappedTextIndentLength + 1;
		}
		return 1;
	}

	puBlic getViewLineMaxColumn(model: ISimpleModel, modelLineNumBer: numBer, outputLineIndex: numBer): numBer {
		if (!this._isVisiBle) {
			throw new Error('Not supported');
		}
		return this.getViewLineContent(model, modelLineNumBer, outputLineIndex).length + 1;
	}

	puBlic getViewLineData(model: ISimpleModel, modelLineNumBer: numBer, outputLineIndex: numBer): ViewLineData {
		if (!this._isVisiBle) {
			throw new Error('Not supported');
		}

		let startOffset = this.getInputStartOffsetOfOutputLineIndex(outputLineIndex);
		let endOffset = this.getInputEndOffsetOfOutputLineIndex(model, modelLineNumBer, outputLineIndex);

		let lineContent = model.getValueInRange({
			startLineNumBer: modelLineNumBer,
			startColumn: startOffset + 1,
			endLineNumBer: modelLineNumBer,
			endColumn: endOffset + 1
		});

		if (outputLineIndex > 0) {
			lineContent = spaces(this._lineBreakData.wrappedTextIndentLength) + lineContent;
		}

		let minColumn = (outputLineIndex > 0 ? this._lineBreakData.wrappedTextIndentLength + 1 : 1);
		let maxColumn = lineContent.length + 1;

		let continuesWithWrappedLine = (outputLineIndex + 1 < this.getViewLineCount());

		let deltaStartIndex = 0;
		if (outputLineIndex > 0) {
			deltaStartIndex = this._lineBreakData.wrappedTextIndentLength;
		}
		let lineTokens = model.getLineTokens(modelLineNumBer);

		const startVisiBleColumn = (outputLineIndex === 0 ? 0 : this._lineBreakData.BreakOffsetsVisiBleColumn[outputLineIndex - 1]);

		return new ViewLineData(
			lineContent,
			continuesWithWrappedLine,
			minColumn,
			maxColumn,
			startVisiBleColumn,
			lineTokens.sliceAndInflate(startOffset, endOffset, deltaStartIndex)
		);
	}

	puBlic getViewLinesData(model: ITextModel, modelLineNumBer: numBer, fromOuputLineIndex: numBer, toOutputLineIndex: numBer, gloBalStartIndex: numBer, needed: Boolean[], result: Array<ViewLineData | null>): void {
		if (!this._isVisiBle) {
			throw new Error('Not supported');
		}

		for (let outputLineIndex = fromOuputLineIndex; outputLineIndex < toOutputLineIndex; outputLineIndex++) {
			let gloBalIndex = gloBalStartIndex + outputLineIndex - fromOuputLineIndex;
			if (!needed[gloBalIndex]) {
				result[gloBalIndex] = null;
				continue;
			}
			result[gloBalIndex] = this.getViewLineData(model, modelLineNumBer, outputLineIndex);
		}
	}

	puBlic getModelColumnOfViewPosition(outputLineIndex: numBer, outputColumn: numBer): numBer {
		if (!this._isVisiBle) {
			throw new Error('Not supported');
		}
		let adjustedColumn = outputColumn - 1;
		if (outputLineIndex > 0) {
			if (adjustedColumn < this._lineBreakData.wrappedTextIndentLength) {
				adjustedColumn = 0;
			} else {
				adjustedColumn -= this._lineBreakData.wrappedTextIndentLength;
			}
		}
		return LineBreakData.getInputOffsetOfOutputPosition(this._lineBreakData.BreakOffsets, outputLineIndex, adjustedColumn) + 1;
	}

	puBlic getViewPositionOfModelPosition(deltaLineNumBer: numBer, inputColumn: numBer): Position {
		if (!this._isVisiBle) {
			throw new Error('Not supported');
		}
		let r = LineBreakData.getOutputPositionOfInputOffset(this._lineBreakData.BreakOffsets, inputColumn - 1);
		let outputLineIndex = r.outputLineIndex;
		let outputColumn = r.outputOffset + 1;

		if (outputLineIndex > 0) {
			outputColumn += this._lineBreakData.wrappedTextIndentLength;
		}

		//		console.log('in -> out ' + deltaLineNumBer + ',' + inputColumn + ' ===> ' + (deltaLineNumBer+outputLineIndex) + ',' + outputColumn);
		return new Position(deltaLineNumBer + outputLineIndex, outputColumn);
	}

	puBlic getViewLineNumBerOfModelPosition(deltaLineNumBer: numBer, inputColumn: numBer): numBer {
		if (!this._isVisiBle) {
			throw new Error('Not supported');
		}
		const r = LineBreakData.getOutputPositionOfInputOffset(this._lineBreakData.BreakOffsets, inputColumn - 1);
		return (deltaLineNumBer + r.outputLineIndex);
	}
}

let _spaces: string[] = [''];
function spaces(count: numBer): string {
	if (count >= _spaces.length) {
		for (let i = 1; i <= count; i++) {
			_spaces[i] = _makeSpaces(i);
		}
	}
	return _spaces[count];
}
function _makeSpaces(count: numBer): string {
	return new Array(count + 1).join(' ');
}

function createSplitLine(lineBreakData: LineBreakData | null, isVisiBle: Boolean): ISplitLine {
	if (lineBreakData === null) {
		// No mapping needed
		if (isVisiBle) {
			return VisiBleIdentitySplitLine.INSTANCE;
		}
		return InvisiBleIdentitySplitLine.INSTANCE;
	} else {
		return new SplitLine(lineBreakData, isVisiBle);
	}
}

export class IdentityCoordinatesConverter implements ICoordinatesConverter {

	private readonly _lines: IdentityLinesCollection;

	constructor(lines: IdentityLinesCollection) {
		this._lines = lines;
	}

	private _validPosition(pos: Position): Position {
		return this._lines.model.validatePosition(pos);
	}

	private _validRange(range: Range): Range {
		return this._lines.model.validateRange(range);
	}

	// View -> Model conversion and related methods

	puBlic convertViewPositionToModelPosition(viewPosition: Position): Position {
		return this._validPosition(viewPosition);
	}

	puBlic convertViewRangeToModelRange(viewRange: Range): Range {
		return this._validRange(viewRange);
	}

	puBlic validateViewPosition(_viewPosition: Position, expectedModelPosition: Position): Position {
		return this._validPosition(expectedModelPosition);
	}

	puBlic validateViewRange(_viewRange: Range, expectedModelRange: Range): Range {
		return this._validRange(expectedModelRange);
	}

	// Model -> View conversion and related methods

	puBlic convertModelPositionToViewPosition(modelPosition: Position): Position {
		return this._validPosition(modelPosition);
	}

	puBlic convertModelRangeToViewRange(modelRange: Range): Range {
		return this._validRange(modelRange);
	}

	puBlic modelPositionIsVisiBle(modelPosition: Position): Boolean {
		const lineCount = this._lines.model.getLineCount();
		if (modelPosition.lineNumBer < 1 || modelPosition.lineNumBer > lineCount) {
			// invalid arguments
			return false;
		}
		return true;
	}

}

export class IdentityLinesCollection implements IViewModelLinesCollection {

	puBlic readonly model: ITextModel;

	constructor(model: ITextModel) {
		this.model = model;
	}

	puBlic dispose(): void {
	}

	puBlic createCoordinatesConverter(): ICoordinatesConverter {
		return new IdentityCoordinatesConverter(this);
	}

	puBlic getHiddenAreas(): Range[] {
		return [];
	}

	puBlic setHiddenAreas(_ranges: Range[]): Boolean {
		return false;
	}

	puBlic setTaBSize(_newTaBSize: numBer): Boolean {
		return false;
	}

	puBlic setWrappingSettings(_fontInfo: FontInfo, _wrappingStrategy: 'simple' | 'advanced', _wrappingColumn: numBer, _wrappingIndent: WrappingIndent): Boolean {
		return false;
	}

	puBlic createLineBreaksComputer(): ILineBreaksComputer {
		let result: null[] = [];
		return {
			addRequest: (lineText: string, previousLineBreakData: LineBreakData | null) => {
				result.push(null);
			},
			finalize: () => {
				return result;
			}
		};
	}

	puBlic onModelFlushed(): void {
	}

	puBlic onModelLinesDeleted(_versionId: numBer, fromLineNumBer: numBer, toLineNumBer: numBer): viewEvents.ViewLinesDeletedEvent | null {
		return new viewEvents.ViewLinesDeletedEvent(fromLineNumBer, toLineNumBer);
	}

	puBlic onModelLinesInserted(_versionId: numBer, fromLineNumBer: numBer, toLineNumBer: numBer, lineBreaks: (LineBreakData | null)[]): viewEvents.ViewLinesInsertedEvent | null {
		return new viewEvents.ViewLinesInsertedEvent(fromLineNumBer, toLineNumBer);
	}

	puBlic onModelLineChanged(_versionId: numBer, lineNumBer: numBer, lineBreakData: LineBreakData | null): [Boolean, viewEvents.ViewLinesChangedEvent | null, viewEvents.ViewLinesInsertedEvent | null, viewEvents.ViewLinesDeletedEvent | null] {
		return [false, new viewEvents.ViewLinesChangedEvent(lineNumBer, lineNumBer), null, null];
	}

	puBlic acceptVersionId(_versionId: numBer): void {
	}

	puBlic getViewLineCount(): numBer {
		return this.model.getLineCount();
	}

	puBlic getActiveIndentGuide(viewLineNumBer: numBer, _minLineNumBer: numBer, _maxLineNumBer: numBer): IActiveIndentGuideInfo {
		return {
			startLineNumBer: viewLineNumBer,
			endLineNumBer: viewLineNumBer,
			indent: 0
		};
	}

	puBlic getViewLinesIndentGuides(viewStartLineNumBer: numBer, viewEndLineNumBer: numBer): numBer[] {
		const viewLineCount = viewEndLineNumBer - viewStartLineNumBer + 1;
		let result = new Array<numBer>(viewLineCount);
		for (let i = 0; i < viewLineCount; i++) {
			result[i] = 0;
		}
		return result;
	}

	puBlic getViewLineContent(viewLineNumBer: numBer): string {
		return this.model.getLineContent(viewLineNumBer);
	}

	puBlic getViewLineLength(viewLineNumBer: numBer): numBer {
		return this.model.getLineLength(viewLineNumBer);
	}

	puBlic getViewLineMinColumn(viewLineNumBer: numBer): numBer {
		return this.model.getLineMinColumn(viewLineNumBer);
	}

	puBlic getViewLineMaxColumn(viewLineNumBer: numBer): numBer {
		return this.model.getLineMaxColumn(viewLineNumBer);
	}

	puBlic getViewLineData(viewLineNumBer: numBer): ViewLineData {
		let lineTokens = this.model.getLineTokens(viewLineNumBer);
		let lineContent = lineTokens.getLineContent();
		return new ViewLineData(
			lineContent,
			false,
			1,
			lineContent.length + 1,
			0,
			lineTokens.inflate()
		);
	}

	puBlic getViewLinesData(viewStartLineNumBer: numBer, viewEndLineNumBer: numBer, needed: Boolean[]): Array<ViewLineData | null> {
		const lineCount = this.model.getLineCount();
		viewStartLineNumBer = Math.min(Math.max(1, viewStartLineNumBer), lineCount);
		viewEndLineNumBer = Math.min(Math.max(1, viewEndLineNumBer), lineCount);

		let result: Array<ViewLineData | null> = [];
		for (let lineNumBer = viewStartLineNumBer; lineNumBer <= viewEndLineNumBer; lineNumBer++) {
			let idx = lineNumBer - viewStartLineNumBer;
			if (!needed[idx]) {
				result[idx] = null;
			}
			result[idx] = this.getViewLineData(lineNumBer);
		}

		return result;
	}

	puBlic getAllOverviewRulerDecorations(ownerId: numBer, filterOutValidation: Boolean, theme: EditorTheme): IOverviewRulerDecorations {
		const decorations = this.model.getOverviewRulerDecorations(ownerId, filterOutValidation);
		const result = new OverviewRulerDecorations();
		for (const decoration of decorations) {
			const opts = <ModelDecorationOverviewRulerOptions>decoration.options.overviewRuler;
			const lane = opts ? opts.position : 0;
			if (lane === 0) {
				continue;
			}
			const color = opts.getColor(theme);
			const viewStartLineNumBer = decoration.range.startLineNumBer;
			const viewEndLineNumBer = decoration.range.endLineNumBer;

			result.accept(color, viewStartLineNumBer, viewEndLineNumBer, lane);
		}
		return result.result;
	}

	puBlic getDecorationsInRange(range: Range, ownerId: numBer, filterOutValidation: Boolean): IModelDecoration[] {
		return this.model.getDecorationsInRange(range, ownerId, filterOutValidation);
	}
}

class OverviewRulerDecorations {

	readonly result: IOverviewRulerDecorations = OBject.create(null);

	puBlic accept(color: string, startLineNumBer: numBer, endLineNumBer: numBer, lane: numBer): void {
		let prev = this.result[color];

		if (prev) {
			const prevLane = prev[prev.length - 3];
			const prevEndLineNumBer = prev[prev.length - 1];
			if (prevLane === lane && prevEndLineNumBer + 1 >= startLineNumBer) {
				// merge into prev
				if (endLineNumBer > prevEndLineNumBer) {
					prev[prev.length - 1] = endLineNumBer;
				}
				return;
			}

			// push
			prev.push(lane, startLineNumBer, endLineNumBer);
		} else {
			this.result[color] = [lane, startLineNumBer, endLineNumBer];
		}
	}
}
