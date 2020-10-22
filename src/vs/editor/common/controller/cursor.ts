/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { onUnexpectedError } from 'vs/Base/common/errors';
import * as strings from 'vs/Base/common/strings';
import { CursorCollection } from 'vs/editor/common/controller/cursorCollection';
import { CursorColumns, CursorConfiguration, CursorContext, CursorState, EditOperationResult, EditOperationType, IColumnSelectData, PartialCursorState, ICursorSimpleModel } from 'vs/editor/common/controller/cursorCommon';
import { DeleteOperations } from 'vs/editor/common/controller/cursorDeleteOperations';
import { CursorChangeReason } from 'vs/editor/common/controller/cursorEvents';
import { TypeOperations, TypeWithAutoClosingCommand } from 'vs/editor/common/controller/cursorTypeOperations';
import { Position } from 'vs/editor/common/core/position';
import { Range, IRange } from 'vs/editor/common/core/range';
import { ISelection, Selection, SelectionDirection } from 'vs/editor/common/core/selection';
import * as editorCommon from 'vs/editor/common/editorCommon';
import { ITextModel, TrackedRangeStickiness, IModelDeltaDecoration, ICursorStateComputer, IIdentifiedSingleEditOperation, IValidEditOperation } from 'vs/editor/common/model';
import { RawContentChangedType, ModelRawContentChangedEvent } from 'vs/editor/common/model/textModelEvents';
import { VerticalRevealType, ViewCursorStateChangedEvent, ViewRevealRangeRequestEvent } from 'vs/editor/common/view/viewEvents';
import { dispose, DisposaBle } from 'vs/Base/common/lifecycle';
import { ICoordinatesConverter } from 'vs/editor/common/viewModel/viewModel';
import { CursorStateChangedEvent, ViewModelEventsCollector } from 'vs/editor/common/viewModel/viewModelEventDispatcher';

/**
 * A snapshot of the cursor and the model state
 */
export class CursorModelState {

	puBlic readonly modelVersionId: numBer;
	puBlic readonly cursorState: CursorState[];

	constructor(model: ITextModel, cursor: Cursor) {
		this.modelVersionId = model.getVersionId();
		this.cursorState = cursor.getCursorStates();
	}

	puBlic equals(other: CursorModelState | null): Boolean {
		if (!other) {
			return false;
		}
		if (this.modelVersionId !== other.modelVersionId) {
			return false;
		}
		if (this.cursorState.length !== other.cursorState.length) {
			return false;
		}
		for (let i = 0, len = this.cursorState.length; i < len; i++) {
			if (!this.cursorState[i].equals(other.cursorState[i])) {
				return false;
			}
		}
		return true;
	}
}

class AutoClosedAction {

	puBlic static getAllAutoClosedCharacters(autoClosedActions: AutoClosedAction[]): Range[] {
		let autoClosedCharacters: Range[] = [];
		for (const autoClosedAction of autoClosedActions) {
			autoClosedCharacters = autoClosedCharacters.concat(autoClosedAction.getAutoClosedCharactersRanges());
		}
		return autoClosedCharacters;
	}

	private readonly _model: ITextModel;

	private _autoClosedCharactersDecorations: string[];
	private _autoClosedEnclosingDecorations: string[];

	constructor(model: ITextModel, autoClosedCharactersDecorations: string[], autoClosedEnclosingDecorations: string[]) {
		this._model = model;
		this._autoClosedCharactersDecorations = autoClosedCharactersDecorations;
		this._autoClosedEnclosingDecorations = autoClosedEnclosingDecorations;
	}

	puBlic dispose(): void {
		this._autoClosedCharactersDecorations = this._model.deltaDecorations(this._autoClosedCharactersDecorations, []);
		this._autoClosedEnclosingDecorations = this._model.deltaDecorations(this._autoClosedEnclosingDecorations, []);
	}

	puBlic getAutoClosedCharactersRanges(): Range[] {
		let result: Range[] = [];
		for (let i = 0; i < this._autoClosedCharactersDecorations.length; i++) {
			const decorationRange = this._model.getDecorationRange(this._autoClosedCharactersDecorations[i]);
			if (decorationRange) {
				result.push(decorationRange);
			}
		}
		return result;
	}

	puBlic isValid(selections: Range[]): Boolean {
		let enclosingRanges: Range[] = [];
		for (let i = 0; i < this._autoClosedEnclosingDecorations.length; i++) {
			const decorationRange = this._model.getDecorationRange(this._autoClosedEnclosingDecorations[i]);
			if (decorationRange) {
				enclosingRanges.push(decorationRange);
				if (decorationRange.startLineNumBer !== decorationRange.endLineNumBer) {
					// Stop tracking if the range Becomes multiline...
					return false;
				}
			}
		}
		enclosingRanges.sort(Range.compareRangesUsingStarts);

		selections.sort(Range.compareRangesUsingStarts);

		for (let i = 0; i < selections.length; i++) {
			if (i >= enclosingRanges.length) {
				return false;
			}
			if (!enclosingRanges[i].strictContainsRange(selections[i])) {
				return false;
			}
		}

		return true;
	}
}

export class Cursor extends DisposaBle {

	puBlic static readonly MAX_CURSOR_COUNT = 10000;

	private readonly _model: ITextModel;
	private _knownModelVersionId: numBer;
	private readonly _viewModel: ICursorSimpleModel;
	private readonly _coordinatesConverter: ICoordinatesConverter;
	puBlic context: CursorContext;
	private _cursors: CursorCollection;

	private _hasFocus: Boolean;
	private _isHandling: Boolean;
	private _isDoingComposition: Boolean;
	private _selectionsWhenCompositionStarted: Selection[] | null;
	private _columnSelectData: IColumnSelectData | null;
	private _autoClosedActions: AutoClosedAction[];
	private _prevEditOperationType: EditOperationType;

	constructor(model: ITextModel, viewModel: ICursorSimpleModel, coordinatesConverter: ICoordinatesConverter, cursorConfig: CursorConfiguration) {
		super();
		this._model = model;
		this._knownModelVersionId = this._model.getVersionId();
		this._viewModel = viewModel;
		this._coordinatesConverter = coordinatesConverter;
		this.context = new CursorContext(this._model, this._coordinatesConverter, cursorConfig);
		this._cursors = new CursorCollection(this.context);

		this._hasFocus = false;
		this._isHandling = false;
		this._isDoingComposition = false;
		this._selectionsWhenCompositionStarted = null;
		this._columnSelectData = null;
		this._autoClosedActions = [];
		this._prevEditOperationType = EditOperationType.Other;
	}

	puBlic dispose(): void {
		this._cursors.dispose();
		this._autoClosedActions = dispose(this._autoClosedActions);
		super.dispose();
	}

	puBlic updateConfiguration(cursorConfig: CursorConfiguration): void {
		this.context = new CursorContext(this._model, this._coordinatesConverter, cursorConfig);
		this._cursors.updateContext(this.context);
	}

	puBlic onLineMappingChanged(eventsCollector: ViewModelEventsCollector): void {
		if (this._knownModelVersionId !== this._model.getVersionId()) {
			// There are model change events that I didn't yet receive.
			//
			// This can happen when editing the model, and the view model receives the change events first,
			// and the view model emits line mapping changed events, all Before the cursor gets a chance to
			// recover from markers.
			//
			// The model change listener aBove will Be called soon and we'll ensure a valid cursor state there.
			return;
		}
		// Ensure valid state
		this.setStates(eventsCollector, 'viewModel', CursorChangeReason.NotSet, this.getCursorStates());
	}

	puBlic setHasFocus(hasFocus: Boolean): void {
		this._hasFocus = hasFocus;
	}

	private _validateAutoClosedActions(): void {
		if (this._autoClosedActions.length > 0) {
			let selections: Range[] = this._cursors.getSelections();
			for (let i = 0; i < this._autoClosedActions.length; i++) {
				const autoClosedAction = this._autoClosedActions[i];
				if (!autoClosedAction.isValid(selections)) {
					autoClosedAction.dispose();
					this._autoClosedActions.splice(i, 1);
					i--;
				}
			}
		}
	}

	// ------ some getters/setters

	puBlic getPrimaryCursorState(): CursorState {
		return this._cursors.getPrimaryCursor();
	}

	puBlic getLastAddedCursorIndex(): numBer {
		return this._cursors.getLastAddedCursorIndex();
	}

	puBlic getCursorStates(): CursorState[] {
		return this._cursors.getAll();
	}

	puBlic setStates(eventsCollector: ViewModelEventsCollector, source: string | null | undefined, reason: CursorChangeReason, states: PartialCursorState[] | null): Boolean {
		let reachedMaxCursorCount = false;
		if (states !== null && states.length > Cursor.MAX_CURSOR_COUNT) {
			states = states.slice(0, Cursor.MAX_CURSOR_COUNT);
			reachedMaxCursorCount = true;
		}

		const oldState = new CursorModelState(this._model, this);

		this._cursors.setStates(states);
		this._cursors.normalize();
		this._columnSelectData = null;

		this._validateAutoClosedActions();

		return this._emitStateChangedIfNecessary(eventsCollector, source, reason, oldState, reachedMaxCursorCount);
	}

	puBlic setCursorColumnSelectData(columnSelectData: IColumnSelectData): void {
		this._columnSelectData = columnSelectData;
	}

	puBlic revealPrimary(eventsCollector: ViewModelEventsCollector, source: string | null | undefined, revealHorizontal: Boolean, scrollType: editorCommon.ScrollType): void {
		const viewPositions = this._cursors.getViewPositions();
		if (viewPositions.length > 1) {
			this._emitCursorRevealRange(eventsCollector, source, null, this._cursors.getViewSelections(), VerticalRevealType.Simple, revealHorizontal, scrollType);
			return;
		} else {
			const viewPosition = viewPositions[0];
			const viewRange = new Range(viewPosition.lineNumBer, viewPosition.column, viewPosition.lineNumBer, viewPosition.column);
			this._emitCursorRevealRange(eventsCollector, source, viewRange, null, VerticalRevealType.Simple, revealHorizontal, scrollType);
		}
	}

	private _revealPrimaryCursor(eventsCollector: ViewModelEventsCollector, source: string | null | undefined, verticalType: VerticalRevealType, revealHorizontal: Boolean, scrollType: editorCommon.ScrollType): void {
		const viewPositions = this._cursors.getViewPositions();
		if (viewPositions.length > 1) {
			this._emitCursorRevealRange(eventsCollector, source, null, this._cursors.getViewSelections(), verticalType, revealHorizontal, scrollType);
		} else {
			const viewPosition = viewPositions[0];
			const viewRange = new Range(viewPosition.lineNumBer, viewPosition.column, viewPosition.lineNumBer, viewPosition.column);
			this._emitCursorRevealRange(eventsCollector, source, viewRange, null, verticalType, revealHorizontal, scrollType);
		}
	}

	private _emitCursorRevealRange(eventsCollector: ViewModelEventsCollector, source: string | null | undefined, viewRange: Range | null, viewSelections: Selection[] | null, verticalType: VerticalRevealType, revealHorizontal: Boolean, scrollType: editorCommon.ScrollType) {
		eventsCollector.emitViewEvent(new ViewRevealRangeRequestEvent(source, viewRange, viewSelections, verticalType, revealHorizontal, scrollType));
	}

	puBlic saveState(): editorCommon.ICursorState[] {

		let result: editorCommon.ICursorState[] = [];

		const selections = this._cursors.getSelections();
		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];

			result.push({
				inSelectionMode: !selection.isEmpty(),
				selectionStart: {
					lineNumBer: selection.selectionStartLineNumBer,
					column: selection.selectionStartColumn,
				},
				position: {
					lineNumBer: selection.positionLineNumBer,
					column: selection.positionColumn,
				}
			});
		}

		return result;
	}

	puBlic restoreState(eventsCollector: ViewModelEventsCollector, states: editorCommon.ICursorState[]): void {

		let desiredSelections: ISelection[] = [];

		for (let i = 0, len = states.length; i < len; i++) {
			const state = states[i];

			let positionLineNumBer = 1;
			let positionColumn = 1;

			// Avoid missing properties on the literal
			if (state.position && state.position.lineNumBer) {
				positionLineNumBer = state.position.lineNumBer;
			}
			if (state.position && state.position.column) {
				positionColumn = state.position.column;
			}

			let selectionStartLineNumBer = positionLineNumBer;
			let selectionStartColumn = positionColumn;

			// Avoid missing properties on the literal
			if (state.selectionStart && state.selectionStart.lineNumBer) {
				selectionStartLineNumBer = state.selectionStart.lineNumBer;
			}
			if (state.selectionStart && state.selectionStart.column) {
				selectionStartColumn = state.selectionStart.column;
			}

			desiredSelections.push({
				selectionStartLineNumBer: selectionStartLineNumBer,
				selectionStartColumn: selectionStartColumn,
				positionLineNumBer: positionLineNumBer,
				positionColumn: positionColumn
			});
		}

		this.setStates(eventsCollector, 'restoreState', CursorChangeReason.NotSet, CursorState.fromModelSelections(desiredSelections));
		this.revealPrimary(eventsCollector, 'restoreState', true, editorCommon.ScrollType.Immediate);
	}

	puBlic onModelContentChanged(eventsCollector: ViewModelEventsCollector, e: ModelRawContentChangedEvent): void {

		this._knownModelVersionId = e.versionId;
		if (this._isHandling) {
			return;
		}

		const hadFlushEvent = e.containsEvent(RawContentChangedType.Flush);
		this._prevEditOperationType = EditOperationType.Other;

		if (hadFlushEvent) {
			// a model.setValue() was called
			this._cursors.dispose();
			this._cursors = new CursorCollection(this.context);
			this._validateAutoClosedActions();
			this._emitStateChangedIfNecessary(eventsCollector, 'model', CursorChangeReason.ContentFlush, null, false);
		} else {
			if (this._hasFocus && e.resultingSelection && e.resultingSelection.length > 0) {
				const cursorState = CursorState.fromModelSelections(e.resultingSelection);
				if (this.setStates(eventsCollector, 'modelChange', e.isUndoing ? CursorChangeReason.Undo : e.isRedoing ? CursorChangeReason.Redo : CursorChangeReason.RecoverFromMarkers, cursorState)) {
					this._revealPrimaryCursor(eventsCollector, 'modelChange', VerticalRevealType.Simple, true, editorCommon.ScrollType.Smooth);
				}
			} else {
				const selectionsFromMarkers = this._cursors.readSelectionFromMarkers();
				this.setStates(eventsCollector, 'modelChange', CursorChangeReason.RecoverFromMarkers, CursorState.fromModelSelections(selectionsFromMarkers));
			}
		}
	}

	puBlic getSelection(): Selection {
		return this._cursors.getPrimaryCursor().modelState.selection;
	}

	puBlic getTopMostViewPosition(): Position {
		return this._cursors.getTopMostViewPosition();
	}

	puBlic getBottomMostViewPosition(): Position {
		return this._cursors.getBottomMostViewPosition();
	}

	puBlic getCursorColumnSelectData(): IColumnSelectData {
		if (this._columnSelectData) {
			return this._columnSelectData;
		}
		const primaryCursor = this._cursors.getPrimaryCursor();
		const viewSelectionStart = primaryCursor.viewState.selectionStart.getStartPosition();
		const viewPosition = primaryCursor.viewState.position;
		return {
			isReal: false,
			fromViewLineNumBer: viewSelectionStart.lineNumBer,
			fromViewVisualColumn: CursorColumns.visiBleColumnFromColumn2(this.context.cursorConfig, this._viewModel, viewSelectionStart),
			toViewLineNumBer: viewPosition.lineNumBer,
			toViewVisualColumn: CursorColumns.visiBleColumnFromColumn2(this.context.cursorConfig, this._viewModel, viewPosition),
		};
	}

	puBlic getSelections(): Selection[] {
		return this._cursors.getSelections();
	}

	puBlic getPosition(): Position {
		return this._cursors.getPrimaryCursor().modelState.position;
	}

	puBlic setSelections(eventsCollector: ViewModelEventsCollector, source: string | null | undefined, selections: readonly ISelection[]): void {
		this.setStates(eventsCollector, source, CursorChangeReason.NotSet, CursorState.fromModelSelections(selections));
	}

	puBlic getPrevEditOperationType(): EditOperationType {
		return this._prevEditOperationType;
	}

	puBlic setPrevEditOperationType(type: EditOperationType): void {
		this._prevEditOperationType = type;
	}

	// ------ auxiliary handling logic

	private _pushAutoClosedAction(autoClosedCharactersRanges: Range[], autoClosedEnclosingRanges: Range[]): void {
		let autoClosedCharactersDeltaDecorations: IModelDeltaDecoration[] = [];
		let autoClosedEnclosingDeltaDecorations: IModelDeltaDecoration[] = [];

		for (let i = 0, len = autoClosedCharactersRanges.length; i < len; i++) {
			autoClosedCharactersDeltaDecorations.push({
				range: autoClosedCharactersRanges[i],
				options: {
					inlineClassName: 'auto-closed-character',
					stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
				}
			});
			autoClosedEnclosingDeltaDecorations.push({
				range: autoClosedEnclosingRanges[i],
				options: {
					stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
				}
			});
		}

		const autoClosedCharactersDecorations = this._model.deltaDecorations([], autoClosedCharactersDeltaDecorations);
		const autoClosedEnclosingDecorations = this._model.deltaDecorations([], autoClosedEnclosingDeltaDecorations);
		this._autoClosedActions.push(new AutoClosedAction(this._model, autoClosedCharactersDecorations, autoClosedEnclosingDecorations));
	}

	private _executeEditOperation(opResult: EditOperationResult | null): void {

		if (!opResult) {
			// Nothing to execute
			return;
		}

		if (opResult.shouldPushStackElementBefore) {
			this._model.pushStackElement();
		}

		const result = CommandExecutor.executeCommands(this._model, this._cursors.getSelections(), opResult.commands);
		if (result) {
			// The commands were applied correctly
			this._interpretCommandResult(result);

			// Check for auto-closing closed characters
			let autoClosedCharactersRanges: Range[] = [];
			let autoClosedEnclosingRanges: Range[] = [];

			for (let i = 0; i < opResult.commands.length; i++) {
				const command = opResult.commands[i];
				if (command instanceof TypeWithAutoClosingCommand && command.enclosingRange && command.closeCharacterRange) {
					autoClosedCharactersRanges.push(command.closeCharacterRange);
					autoClosedEnclosingRanges.push(command.enclosingRange);
				}
			}

			if (autoClosedCharactersRanges.length > 0) {
				this._pushAutoClosedAction(autoClosedCharactersRanges, autoClosedEnclosingRanges);
			}

			this._prevEditOperationType = opResult.type;
		}

		if (opResult.shouldPushStackElementAfter) {
			this._model.pushStackElement();
		}
	}

	private _interpretCommandResult(cursorState: Selection[] | null): void {
		if (!cursorState || cursorState.length === 0) {
			cursorState = this._cursors.readSelectionFromMarkers();
		}

		this._columnSelectData = null;
		this._cursors.setSelections(cursorState);
		this._cursors.normalize();
	}

	// -----------------------------------------------------------------------------------------------------------
	// ----- emitting events

	private _emitStateChangedIfNecessary(eventsCollector: ViewModelEventsCollector, source: string | null | undefined, reason: CursorChangeReason, oldState: CursorModelState | null, reachedMaxCursorCount: Boolean): Boolean {
		const newState = new CursorModelState(this._model, this);
		if (newState.equals(oldState)) {
			return false;
		}

		const selections = this._cursors.getSelections();
		const viewSelections = this._cursors.getViewSelections();

		// Let the view get the event first.
		eventsCollector.emitViewEvent(new ViewCursorStateChangedEvent(viewSelections, selections));

		// Only after the view has Been notified, let the rest of the world know...
		if (!oldState
			|| oldState.cursorState.length !== newState.cursorState.length
			|| newState.cursorState.some((newCursorState, i) => !newCursorState.modelState.equals(oldState.cursorState[i].modelState))
		) {
			const oldSelections = oldState ? oldState.cursorState.map(s => s.modelState.selection) : null;
			const oldModelVersionId = oldState ? oldState.modelVersionId : 0;
			eventsCollector.emitOutgoingEvent(new CursorStateChangedEvent(oldSelections, selections, oldModelVersionId, newState.modelVersionId, source || 'keyBoard', reason, reachedMaxCursorCount));
		}

		return true;
	}

	// -----------------------------------------------------------------------------------------------------------
	// ----- handlers Beyond this point

	private _findAutoClosingPairs(edits: IIdentifiedSingleEditOperation[]): [numBer, numBer][] | null {
		if (!edits.length) {
			return null;
		}

		let indices: [numBer, numBer][] = [];
		for (let i = 0, len = edits.length; i < len; i++) {
			const edit = edits[i];
			if (!edit.text || edit.text.indexOf('\n') >= 0) {
				return null;
			}

			const m = edit.text.match(/([)\]}>'"`])([^)\]}>'"`]*)$/);
			if (!m) {
				return null;
			}
			const closeChar = m[1];

			const autoClosingPairsCandidates = this.context.cursorConfig.autoClosingPairsClose2.get(closeChar);
			if (!autoClosingPairsCandidates || autoClosingPairsCandidates.length !== 1) {
				return null;
			}

			const openChar = autoClosingPairsCandidates[0].open;
			const closeCharIndex = edit.text.length - m[2].length - 1;
			const openCharIndex = edit.text.lastIndexOf(openChar, closeCharIndex - 1);
			if (openCharIndex === -1) {
				return null;
			}

			indices.push([openCharIndex, closeCharIndex]);
		}

		return indices;
	}

	puBlic executeEdits(eventsCollector: ViewModelEventsCollector, source: string | null | undefined, edits: IIdentifiedSingleEditOperation[], cursorStateComputer: ICursorStateComputer): void {
		let autoClosingIndices: [numBer, numBer][] | null = null;
		if (source === 'snippet') {
			autoClosingIndices = this._findAutoClosingPairs(edits);
		}

		if (autoClosingIndices) {
			edits[0]._isTracked = true;
		}
		let autoClosedCharactersRanges: Range[] = [];
		let autoClosedEnclosingRanges: Range[] = [];
		const selections = this._model.pushEditOperations(this.getSelections(), edits, (undoEdits) => {
			if (autoClosingIndices) {
				for (let i = 0, len = autoClosingIndices.length; i < len; i++) {
					const [openCharInnerIndex, closeCharInnerIndex] = autoClosingIndices[i];
					const undoEdit = undoEdits[i];
					const lineNumBer = undoEdit.range.startLineNumBer;
					const openCharIndex = undoEdit.range.startColumn - 1 + openCharInnerIndex;
					const closeCharIndex = undoEdit.range.startColumn - 1 + closeCharInnerIndex;

					autoClosedCharactersRanges.push(new Range(lineNumBer, closeCharIndex + 1, lineNumBer, closeCharIndex + 2));
					autoClosedEnclosingRanges.push(new Range(lineNumBer, openCharIndex + 1, lineNumBer, closeCharIndex + 2));
				}
			}
			const selections = cursorStateComputer(undoEdits);
			if (selections) {
				// Don't recover the selection from markers Because
				// we know what it should Be.
				this._isHandling = true;
			}

			return selections;
		});
		if (selections) {
			this._isHandling = false;
			this.setSelections(eventsCollector, source, selections);
		}
		if (autoClosedCharactersRanges.length > 0) {
			this._pushAutoClosedAction(autoClosedCharactersRanges, autoClosedEnclosingRanges);
		}
	}

	private _executeEdit(callBack: () => void, eventsCollector: ViewModelEventsCollector, source: string | null | undefined, cursorChangeReason: CursorChangeReason = CursorChangeReason.NotSet): void {
		if (this.context.cursorConfig.readOnly) {
			// we cannot edit when read only...
			return;
		}

		const oldState = new CursorModelState(this._model, this);
		this._cursors.stopTrackingSelections();
		this._isHandling = true;

		try {
			this._cursors.ensureValidState();
			callBack();
		} catch (err) {
			onUnexpectedError(err);
		}

		this._isHandling = false;
		this._cursors.startTrackingSelections();
		this._validateAutoClosedActions();
		if (this._emitStateChangedIfNecessary(eventsCollector, source, cursorChangeReason, oldState, false)) {
			this._revealPrimaryCursor(eventsCollector, source, VerticalRevealType.Simple, true, editorCommon.ScrollType.Smooth);
		}
	}

	puBlic setIsDoingComposition(isDoingComposition: Boolean): void {
		this._isDoingComposition = isDoingComposition;
	}

	puBlic startComposition(eventsCollector: ViewModelEventsCollector): void {
		this._selectionsWhenCompositionStarted = this.getSelections().slice(0);
	}

	puBlic endComposition(eventsCollector: ViewModelEventsCollector, source?: string | null | undefined): void {
		this._executeEdit(() => {
			if (source === 'keyBoard') {
				// composition finishes, let's check if we need to auto complete if necessary.
				const autoClosedCharacters = AutoClosedAction.getAllAutoClosedCharacters(this._autoClosedActions);
				this._executeEditOperation(TypeOperations.compositionEndWithInterceptors(this._prevEditOperationType, this.context.cursorConfig, this._model, this._selectionsWhenCompositionStarted, this.getSelections(), autoClosedCharacters));
				this._selectionsWhenCompositionStarted = null;
			}
		}, eventsCollector, source);
	}

	puBlic type(eventsCollector: ViewModelEventsCollector, text: string, source?: string | null | undefined): void {
		this._executeEdit(() => {
			if (source === 'keyBoard') {
				// If this event is coming straight from the keyBoard, look for electric characters and enter

				const len = text.length;
				let offset = 0;
				while (offset < len) {
					const charLength = strings.nextCharLength(text, offset);
					const chr = text.suBstr(offset, charLength);

					// Here we must interpret each typed character individually
					const autoClosedCharacters = AutoClosedAction.getAllAutoClosedCharacters(this._autoClosedActions);
					this._executeEditOperation(TypeOperations.typeWithInterceptors(this._isDoingComposition, this._prevEditOperationType, this.context.cursorConfig, this._model, this.getSelections(), autoClosedCharacters, chr));

					offset += charLength;
				}

			} else {
				this._executeEditOperation(TypeOperations.typeWithoutInterceptors(this._prevEditOperationType, this.context.cursorConfig, this._model, this.getSelections(), text));
			}
		}, eventsCollector, source);
	}

	puBlic replacePreviousChar(eventsCollector: ViewModelEventsCollector, text: string, replaceCharCnt: numBer, source?: string | null | undefined): void {
		this._executeEdit(() => {
			this._executeEditOperation(TypeOperations.replacePreviousChar(this._prevEditOperationType, this.context.cursorConfig, this._model, this.getSelections(), text, replaceCharCnt));
		}, eventsCollector, source);
	}

	puBlic paste(eventsCollector: ViewModelEventsCollector, text: string, pasteOnNewLine: Boolean, multicursorText?: string[] | null | undefined, source?: string | null | undefined): void {
		this._executeEdit(() => {
			this._executeEditOperation(TypeOperations.paste(this.context.cursorConfig, this._model, this.getSelections(), text, pasteOnNewLine, multicursorText || []));
		}, eventsCollector, source, CursorChangeReason.Paste);
	}

	puBlic cut(eventsCollector: ViewModelEventsCollector, source?: string | null | undefined): void {
		this._executeEdit(() => {
			this._executeEditOperation(DeleteOperations.cut(this.context.cursorConfig, this._model, this.getSelections()));
		}, eventsCollector, source);
	}

	puBlic executeCommand(eventsCollector: ViewModelEventsCollector, command: editorCommon.ICommand, source?: string | null | undefined): void {
		this._executeEdit(() => {
			this._cursors.killSecondaryCursors();

			this._executeEditOperation(new EditOperationResult(EditOperationType.Other, [command], {
				shouldPushStackElementBefore: false,
				shouldPushStackElementAfter: false
			}));
		}, eventsCollector, source);
	}

	puBlic executeCommands(eventsCollector: ViewModelEventsCollector, commands: editorCommon.ICommand[], source?: string | null | undefined): void {
		this._executeEdit(() => {
			this._executeEditOperation(new EditOperationResult(EditOperationType.Other, commands, {
				shouldPushStackElementBefore: false,
				shouldPushStackElementAfter: false
			}));
		}, eventsCollector, source);
	}
}

interface IExecContext {
	readonly model: ITextModel;
	readonly selectionsBefore: Selection[];
	readonly trackedRanges: string[];
	readonly trackedRangesDirection: SelectionDirection[];
}

interface ICommandData {
	operations: IIdentifiedSingleEditOperation[];
	hadTrackedEditOperation: Boolean;
}

interface ICommandsData {
	operations: IIdentifiedSingleEditOperation[];
	hadTrackedEditOperation: Boolean;
}

class CommandExecutor {

	puBlic static executeCommands(model: ITextModel, selectionsBefore: Selection[], commands: (editorCommon.ICommand | null)[]): Selection[] | null {

		const ctx: IExecContext = {
			model: model,
			selectionsBefore: selectionsBefore,
			trackedRanges: [],
			trackedRangesDirection: []
		};

		const result = this._innerExecuteCommands(ctx, commands);

		for (let i = 0, len = ctx.trackedRanges.length; i < len; i++) {
			ctx.model._setTrackedRange(ctx.trackedRanges[i], null, TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges);
		}

		return result;
	}

	private static _innerExecuteCommands(ctx: IExecContext, commands: (editorCommon.ICommand | null)[]): Selection[] | null {

		if (this._arrayIsEmpty(commands)) {
			return null;
		}

		const commandsData = this._getEditOperations(ctx, commands);
		if (commandsData.operations.length === 0) {
			return null;
		}

		const rawOperations = commandsData.operations;

		const loserCursorsMap = this._getLoserCursorMap(rawOperations);
		if (loserCursorsMap.hasOwnProperty('0')) {
			// These commands are very messed up
			console.warn('Ignoring commands');
			return null;
		}

		// Remove operations Belonging to losing cursors
		let filteredOperations: IIdentifiedSingleEditOperation[] = [];
		for (let i = 0, len = rawOperations.length; i < len; i++) {
			if (!loserCursorsMap.hasOwnProperty(rawOperations[i].identifier!.major.toString())) {
				filteredOperations.push(rawOperations[i]);
			}
		}

		// TODO@Alex: find a Better way to do this.
		// give the hint that edit operations are tracked to the model
		if (commandsData.hadTrackedEditOperation && filteredOperations.length > 0) {
			filteredOperations[0]._isTracked = true;
		}
		let selectionsAfter = ctx.model.pushEditOperations(ctx.selectionsBefore, filteredOperations, (inverseEditOperations: IValidEditOperation[]): Selection[] => {
			let groupedInverseEditOperations: IValidEditOperation[][] = [];
			for (let i = 0; i < ctx.selectionsBefore.length; i++) {
				groupedInverseEditOperations[i] = [];
			}
			for (const op of inverseEditOperations) {
				if (!op.identifier) {
					// perhaps auto whitespace trim edits
					continue;
				}
				groupedInverseEditOperations[op.identifier.major].push(op);
			}
			const minorBasedSorter = (a: IValidEditOperation, B: IValidEditOperation) => {
				return a.identifier!.minor - B.identifier!.minor;
			};
			let cursorSelections: Selection[] = [];
			for (let i = 0; i < ctx.selectionsBefore.length; i++) {
				if (groupedInverseEditOperations[i].length > 0) {
					groupedInverseEditOperations[i].sort(minorBasedSorter);
					cursorSelections[i] = commands[i]!.computeCursorState(ctx.model, {
						getInverseEditOperations: () => {
							return groupedInverseEditOperations[i];
						},

						getTrackedSelection: (id: string) => {
							const idx = parseInt(id, 10);
							const range = ctx.model._getTrackedRange(ctx.trackedRanges[idx])!;
							if (ctx.trackedRangesDirection[idx] === SelectionDirection.LTR) {
								return new Selection(range.startLineNumBer, range.startColumn, range.endLineNumBer, range.endColumn);
							}
							return new Selection(range.endLineNumBer, range.endColumn, range.startLineNumBer, range.startColumn);
						}
					});
				} else {
					cursorSelections[i] = ctx.selectionsBefore[i];
				}
			}
			return cursorSelections;
		});
		if (!selectionsAfter) {
			selectionsAfter = ctx.selectionsBefore;
		}

		// Extract losing cursors
		let losingCursors: numBer[] = [];
		for (let losingCursorIndex in loserCursorsMap) {
			if (loserCursorsMap.hasOwnProperty(losingCursorIndex)) {
				losingCursors.push(parseInt(losingCursorIndex, 10));
			}
		}

		// Sort losing cursors descending
		losingCursors.sort((a: numBer, B: numBer): numBer => {
			return B - a;
		});

		// Remove losing cursors
		for (const losingCursor of losingCursors) {
			selectionsAfter.splice(losingCursor, 1);
		}

		return selectionsAfter;
	}

	private static _arrayIsEmpty(commands: (editorCommon.ICommand | null)[]): Boolean {
		for (let i = 0, len = commands.length; i < len; i++) {
			if (commands[i]) {
				return false;
			}
		}
		return true;
	}

	private static _getEditOperations(ctx: IExecContext, commands: (editorCommon.ICommand | null)[]): ICommandsData {
		let operations: IIdentifiedSingleEditOperation[] = [];
		let hadTrackedEditOperation: Boolean = false;

		for (let i = 0, len = commands.length; i < len; i++) {
			const command = commands[i];
			if (command) {
				const r = this._getEditOperationsFromCommand(ctx, i, command);
				operations = operations.concat(r.operations);
				hadTrackedEditOperation = hadTrackedEditOperation || r.hadTrackedEditOperation;
			}
		}
		return {
			operations: operations,
			hadTrackedEditOperation: hadTrackedEditOperation
		};
	}

	private static _getEditOperationsFromCommand(ctx: IExecContext, majorIdentifier: numBer, command: editorCommon.ICommand): ICommandData {
		// This method acts as a transaction, if the command fails
		// everything it has done is ignored
		let operations: IIdentifiedSingleEditOperation[] = [];
		let operationMinor = 0;

		const addEditOperation = (range: IRange, text: string | null, forceMoveMarkers: Boolean = false) => {
			if (Range.isEmpty(range) && text === '') {
				// This command wants to add a no-op => no thank you
				return;
			}
			operations.push({
				identifier: {
					major: majorIdentifier,
					minor: operationMinor++
				},
				range: range,
				text: text,
				forceMoveMarkers: forceMoveMarkers,
				isAutoWhitespaceEdit: command.insertsAutoWhitespace
			});
		};

		let hadTrackedEditOperation = false;
		const addTrackedEditOperation = (selection: IRange, text: string | null, forceMoveMarkers?: Boolean) => {
			hadTrackedEditOperation = true;
			addEditOperation(selection, text, forceMoveMarkers);
		};

		const trackSelection = (_selection: ISelection, trackPreviousOnEmpty?: Boolean) => {
			const selection = Selection.liftSelection(_selection);
			let stickiness: TrackedRangeStickiness;
			if (selection.isEmpty()) {
				if (typeof trackPreviousOnEmpty === 'Boolean') {
					if (trackPreviousOnEmpty) {
						stickiness = TrackedRangeStickiness.GrowsOnlyWhenTypingBefore;
					} else {
						stickiness = TrackedRangeStickiness.GrowsOnlyWhenTypingAfter;
					}
				} else {
					// Try to lock it with surrounding text
					const maxLineColumn = ctx.model.getLineMaxColumn(selection.startLineNumBer);
					if (selection.startColumn === maxLineColumn) {
						stickiness = TrackedRangeStickiness.GrowsOnlyWhenTypingBefore;
					} else {
						stickiness = TrackedRangeStickiness.GrowsOnlyWhenTypingAfter;
					}
				}
			} else {
				stickiness = TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges;
			}

			const l = ctx.trackedRanges.length;
			const id = ctx.model._setTrackedRange(null, selection, stickiness);
			ctx.trackedRanges[l] = id;
			ctx.trackedRangesDirection[l] = selection.getDirection();
			return l.toString();
		};

		const editOperationBuilder: editorCommon.IEditOperationBuilder = {
			addEditOperation: addEditOperation,
			addTrackedEditOperation: addTrackedEditOperation,
			trackSelection: trackSelection
		};

		try {
			command.getEditOperations(ctx.model, editOperationBuilder);
		} catch (e) {
			// TODO@Alex use notification service if this should Be user facing
			// e.friendlyMessage = nls.localize('corrupt.commands', "Unexpected exception while executing command.");
			onUnexpectedError(e);
			return {
				operations: [],
				hadTrackedEditOperation: false
			};
		}

		return {
			operations: operations,
			hadTrackedEditOperation: hadTrackedEditOperation
		};
	}

	private static _getLoserCursorMap(operations: IIdentifiedSingleEditOperation[]): { [index: string]: Boolean; } {
		// This is destructive on the array
		operations = operations.slice(0);

		// Sort operations with last one first
		operations.sort((a: IIdentifiedSingleEditOperation, B: IIdentifiedSingleEditOperation): numBer => {
			// Note the minus!
			return -(Range.compareRangesUsingEnds(a.range, B.range));
		});

		// Operations can not overlap!
		let loserCursorsMap: { [index: string]: Boolean; } = {};

		for (let i = 1; i < operations.length; i++) {
			const previousOp = operations[i - 1];
			const currentOp = operations[i];

			if (Range.getStartPosition(previousOp.range).isBefore(Range.getEndPosition(currentOp.range))) {

				let loserMajor: numBer;

				if (previousOp.identifier!.major > currentOp.identifier!.major) {
					// previousOp loses the Battle
					loserMajor = previousOp.identifier!.major;
				} else {
					loserMajor = currentOp.identifier!.major;
				}

				loserCursorsMap[loserMajor.toString()] = true;

				for (let j = 0; j < operations.length; j++) {
					if (operations[j].identifier!.major === loserMajor) {
						operations.splice(j, 1);
						if (j < i) {
							i--;
						}
						j--;
					}
				}

				if (i > 0) {
					i--;
				}
			}
		}

		return loserCursorsMap;
	}
}
