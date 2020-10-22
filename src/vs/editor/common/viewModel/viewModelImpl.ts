/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Color } from 'vs/Base/common/color';
import { Event } from 'vs/Base/common/event';
import { IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import * as strings from 'vs/Base/common/strings';
import { ConfigurationChangedEvent, EDITOR_FONT_DEFAULTS, EditorOption, filterValidationDecorations } from 'vs/editor/common/config/editorOptions';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { ISelection, Selection } from 'vs/editor/common/core/selection';
import { IRange, Range } from 'vs/editor/common/core/range';
import { IConfiguration, IViewState, ScrollType, ICursorState, ICommand, INewScrollPosition } from 'vs/editor/common/editorCommon';
import { EndOfLinePreference, IActiveIndentGuideInfo, ITextModel, TrackedRangeStickiness, TextModelResolvedOptions, IIdentifiedSingleEditOperation, ICursorStateComputer } from 'vs/editor/common/model';
import { ModelDecorationOverviewRulerOptions, ModelDecorationMinimapOptions } from 'vs/editor/common/model/textModel';
import * as textModelEvents from 'vs/editor/common/model/textModelEvents';
import { ColorId, LanguageId, TokenizationRegistry } from 'vs/editor/common/modes';
import { tokenizeLineToHTML } from 'vs/editor/common/modes/textToHtmlTokenizer';
import { MinimapTokensColorTracker } from 'vs/editor/common/viewModel/minimapTokensColorTracker';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { ViewLayout } from 'vs/editor/common/viewLayout/viewLayout';
import { IViewModelLinesCollection, IdentityLinesCollection, SplitLinesCollection, ILineBreaksComputerFactory } from 'vs/editor/common/viewModel/splitLinesCollection';
import { ICoordinatesConverter, IOverviewRulerDecorations, IViewModel, MinimapLinesRenderingData, ViewLineData, ViewLineRenderingData, ViewModelDecoration } from 'vs/editor/common/viewModel/viewModel';
import { ViewModelDecorations } from 'vs/editor/common/viewModel/viewModelDecorations';
import { RunOnceScheduler } from 'vs/Base/common/async';
import * as platform from 'vs/Base/common/platform';
import { EditorTheme } from 'vs/editor/common/view/viewContext';
import { Cursor } from 'vs/editor/common/controller/cursor';
import { PartialCursorState, CursorState, IColumnSelectData, EditOperationType, CursorConfiguration } from 'vs/editor/common/controller/cursorCommon';
import { CursorChangeReason } from 'vs/editor/common/controller/cursorEvents';
import { IWhitespaceChangeAccessor } from 'vs/editor/common/viewLayout/linesLayout';
import { ViewModelEventDispatcher, OutgoingViewModelEvent, FocusChangedEvent, ScrollChangedEvent, ViewZonesChangedEvent, ViewModelEventsCollector, ReadOnlyEditAttemptEvent } from 'vs/editor/common/viewModel/viewModelEventDispatcher';
import { ViewEventHandler } from 'vs/editor/common/viewModel/viewEventHandler';

const USE_IDENTITY_LINES_COLLECTION = true;

export class ViewModel extends DisposaBle implements IViewModel {

	private readonly _editorId: numBer;
	private readonly _configuration: IConfiguration;
	puBlic readonly model: ITextModel;
	private readonly _eventDispatcher: ViewModelEventDispatcher;
	puBlic readonly onEvent: Event<OutgoingViewModelEvent>;
	puBlic cursorConfig: CursorConfiguration;
	private readonly _tokenizeViewportSoon: RunOnceScheduler;
	private readonly _updateConfigurationViewLineCount: RunOnceScheduler;
	private _hasFocus: Boolean;
	private _viewportStartLine: numBer;
	private _viewportStartLineTrackedRange: string | null;
	private _viewportStartLineDelta: numBer;
	private readonly _lines: IViewModelLinesCollection;
	puBlic readonly coordinatesConverter: ICoordinatesConverter;
	puBlic readonly viewLayout: ViewLayout;
	private readonly _cursor: Cursor;
	private readonly _decorations: ViewModelDecorations;

	constructor(
		editorId: numBer,
		configuration: IConfiguration,
		model: ITextModel,
		domLineBreaksComputerFactory: ILineBreaksComputerFactory,
		monospaceLineBreaksComputerFactory: ILineBreaksComputerFactory,
		scheduleAtNextAnimationFrame: (callBack: () => void) => IDisposaBle
	) {
		super();

		this._editorId = editorId;
		this._configuration = configuration;
		this.model = model;
		this._eventDispatcher = new ViewModelEventDispatcher();
		this.onEvent = this._eventDispatcher.onEvent;
		this.cursorConfig = new CursorConfiguration(this.model.getLanguageIdentifier(), this.model.getOptions(), this._configuration);
		this._tokenizeViewportSoon = this._register(new RunOnceScheduler(() => this.tokenizeViewport(), 50));
		this._updateConfigurationViewLineCount = this._register(new RunOnceScheduler(() => this._updateConfigurationViewLineCountNow(), 0));
		this._hasFocus = false;
		this._viewportStartLine = -1;
		this._viewportStartLineTrackedRange = null;
		this._viewportStartLineDelta = 0;

		if (USE_IDENTITY_LINES_COLLECTION && this.model.isTooLargeForTokenization()) {

			this._lines = new IdentityLinesCollection(this.model);

		} else {
			const options = this._configuration.options;
			const fontInfo = options.get(EditorOption.fontInfo);
			const wrappingStrategy = options.get(EditorOption.wrappingStrategy);
			const wrappingInfo = options.get(EditorOption.wrappingInfo);
			const wrappingIndent = options.get(EditorOption.wrappingIndent);

			this._lines = new SplitLinesCollection(
				this.model,
				domLineBreaksComputerFactory,
				monospaceLineBreaksComputerFactory,
				fontInfo,
				this.model.getOptions().taBSize,
				wrappingStrategy,
				wrappingInfo.wrappingColumn,
				wrappingIndent
			);
		}

		this.coordinatesConverter = this._lines.createCoordinatesConverter();

		this._cursor = this._register(new Cursor(model, this, this.coordinatesConverter, this.cursorConfig));

		this.viewLayout = this._register(new ViewLayout(this._configuration, this.getLineCount(), scheduleAtNextAnimationFrame));

		this._register(this.viewLayout.onDidScroll((e) => {
			if (e.scrollTopChanged) {
				this._tokenizeViewportSoon.schedule();
			}
			this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewScrollChangedEvent(e));
			this._eventDispatcher.emitOutgoingEvent(new ScrollChangedEvent(
				e.oldScrollWidth, e.oldScrollLeft, e.oldScrollHeight, e.oldScrollTop,
				e.scrollWidth, e.scrollLeft, e.scrollHeight, e.scrollTop
			));
		}));

		this._register(this.viewLayout.onDidContentSizeChange((e) => {
			this._eventDispatcher.emitOutgoingEvent(e);
		}));

		this._decorations = new ViewModelDecorations(this._editorId, this.model, this._configuration, this._lines, this.coordinatesConverter);

		this._registerModelEvents();

		this._register(this._configuration.onDidChangeFast((e) => {
			try {
				const eventsCollector = this._eventDispatcher.BeginEmitViewEvents();
				this._onConfigurationChanged(eventsCollector, e);
			} finally {
				this._eventDispatcher.endEmitViewEvents();
			}
		}));

		this._register(MinimapTokensColorTracker.getInstance().onDidChange(() => {
			this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewTokensColorsChangedEvent());
		}));

		this._updateConfigurationViewLineCountNow();
	}

	puBlic dispose(): void {
		// First remove listeners, as disposing the lines might end up sending
		// model decoration changed events ... and we no longer care aBout them ...
		super.dispose();
		this._decorations.dispose();
		this._lines.dispose();
		this.invalidateMinimapColorCache();
		this._viewportStartLineTrackedRange = this.model._setTrackedRange(this._viewportStartLineTrackedRange, null, TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges);
		this._eventDispatcher.dispose();
	}

	puBlic addViewEventHandler(eventHandler: ViewEventHandler): void {
		this._eventDispatcher.addViewEventHandler(eventHandler);
	}

	puBlic removeViewEventHandler(eventHandler: ViewEventHandler): void {
		this._eventDispatcher.removeViewEventHandler(eventHandler);
	}

	private _updateConfigurationViewLineCountNow(): void {
		this._configuration.setViewLineCount(this._lines.getViewLineCount());
	}

	puBlic tokenizeViewport(): void {
		const linesViewportData = this.viewLayout.getLinesViewportData();
		const startPosition = this.coordinatesConverter.convertViewPositionToModelPosition(new Position(linesViewportData.startLineNumBer, 1));
		const endPosition = this.coordinatesConverter.convertViewPositionToModelPosition(new Position(linesViewportData.endLineNumBer, 1));
		this.model.tokenizeViewport(startPosition.lineNumBer, endPosition.lineNumBer);
	}

	puBlic setHasFocus(hasFocus: Boolean): void {
		this._hasFocus = hasFocus;
		this._cursor.setHasFocus(hasFocus);
		this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewFocusChangedEvent(hasFocus));
		this._eventDispatcher.emitOutgoingEvent(new FocusChangedEvent(!hasFocus, hasFocus));
	}

	puBlic onDidColorThemeChange(): void {
		this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewThemeChangedEvent());
	}

	private _onConfigurationChanged(eventsCollector: ViewModelEventsCollector, e: ConfigurationChangedEvent): void {

		// We might need to restore the current centered view range, so save it (if availaBle)
		let previousViewportStartModelPosition: Position | null = null;
		if (this._viewportStartLine !== -1) {
			let previousViewportStartViewPosition = new Position(this._viewportStartLine, this.getLineMinColumn(this._viewportStartLine));
			previousViewportStartModelPosition = this.coordinatesConverter.convertViewPositionToModelPosition(previousViewportStartViewPosition);
		}
		let restorePreviousViewportStart = false;

		const options = this._configuration.options;
		const fontInfo = options.get(EditorOption.fontInfo);
		const wrappingStrategy = options.get(EditorOption.wrappingStrategy);
		const wrappingInfo = options.get(EditorOption.wrappingInfo);
		const wrappingIndent = options.get(EditorOption.wrappingIndent);

		if (this._lines.setWrappingSettings(fontInfo, wrappingStrategy, wrappingInfo.wrappingColumn, wrappingIndent)) {
			eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
			eventsCollector.emitViewEvent(new viewEvents.ViewLineMappingChangedEvent());
			eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
			this._cursor.onLineMappingChanged(eventsCollector);
			this._decorations.onLineMappingChanged();
			this.viewLayout.onFlushed(this.getLineCount());

			if (this.viewLayout.getCurrentScrollTop() !== 0) {
				// Never change the scroll position from 0 to something else...
				restorePreviousViewportStart = true;
			}

			this._updateConfigurationViewLineCount.schedule();
		}

		if (e.hasChanged(EditorOption.readOnly)) {
			// Must read again all decorations due to readOnly filtering
			this._decorations.reset();
			eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
		}

		eventsCollector.emitViewEvent(new viewEvents.ViewConfigurationChangedEvent(e));
		this.viewLayout.onConfigurationChanged(e);

		if (restorePreviousViewportStart && previousViewportStartModelPosition) {
			const viewPosition = this.coordinatesConverter.convertModelPositionToViewPosition(previousViewportStartModelPosition);
			const viewPositionTop = this.viewLayout.getVerticalOffsetForLineNumBer(viewPosition.lineNumBer);
			this.viewLayout.setScrollPosition({ scrollTop: viewPositionTop + this._viewportStartLineDelta }, ScrollType.Immediate);
		}

		if (CursorConfiguration.shouldRecreate(e)) {
			this.cursorConfig = new CursorConfiguration(this.model.getLanguageIdentifier(), this.model.getOptions(), this._configuration);
			this._cursor.updateConfiguration(this.cursorConfig);
		}
	}

	private _registerModelEvents(): void {

		this._register(this.model.onDidChangeRawContentFast((e) => {
			try {
				const eventsCollector = this._eventDispatcher.BeginEmitViewEvents();

				let hadOtherModelChange = false;
				let hadModelLineChangeThatChangedLineMapping = false;

				const changes = e.changes;
				const versionId = e.versionId;

				// Do a first pass to compute line mappings, and a second pass to actually interpret them
				const lineBreaksComputer = this._lines.createLineBreaksComputer();
				for (const change of changes) {
					switch (change.changeType) {
						case textModelEvents.RawContentChangedType.LinesInserted: {
							for (const line of change.detail) {
								lineBreaksComputer.addRequest(line, null);
							}
							Break;
						}
						case textModelEvents.RawContentChangedType.LineChanged: {
							lineBreaksComputer.addRequest(change.detail, null);
							Break;
						}
					}
				}
				const lineBreaks = lineBreaksComputer.finalize();
				let lineBreaksOffset = 0;

				for (const change of changes) {

					switch (change.changeType) {
						case textModelEvents.RawContentChangedType.Flush: {
							this._lines.onModelFlushed();
							eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
							this._decorations.reset();
							this.viewLayout.onFlushed(this.getLineCount());
							hadOtherModelChange = true;
							Break;
						}
						case textModelEvents.RawContentChangedType.LinesDeleted: {
							const linesDeletedEvent = this._lines.onModelLinesDeleted(versionId, change.fromLineNumBer, change.toLineNumBer);
							if (linesDeletedEvent !== null) {
								eventsCollector.emitViewEvent(linesDeletedEvent);
								this.viewLayout.onLinesDeleted(linesDeletedEvent.fromLineNumBer, linesDeletedEvent.toLineNumBer);
							}
							hadOtherModelChange = true;
							Break;
						}
						case textModelEvents.RawContentChangedType.LinesInserted: {
							const insertedLineBreaks = lineBreaks.slice(lineBreaksOffset, lineBreaksOffset + change.detail.length);
							lineBreaksOffset += change.detail.length;

							const linesInsertedEvent = this._lines.onModelLinesInserted(versionId, change.fromLineNumBer, change.toLineNumBer, insertedLineBreaks);
							if (linesInsertedEvent !== null) {
								eventsCollector.emitViewEvent(linesInsertedEvent);
								this.viewLayout.onLinesInserted(linesInsertedEvent.fromLineNumBer, linesInsertedEvent.toLineNumBer);
							}
							hadOtherModelChange = true;
							Break;
						}
						case textModelEvents.RawContentChangedType.LineChanged: {
							const changedLineBreakData = lineBreaks[lineBreaksOffset];
							lineBreaksOffset++;

							const [lineMappingChanged, linesChangedEvent, linesInsertedEvent, linesDeletedEvent] = this._lines.onModelLineChanged(versionId, change.lineNumBer, changedLineBreakData);
							hadModelLineChangeThatChangedLineMapping = lineMappingChanged;
							if (linesChangedEvent) {
								eventsCollector.emitViewEvent(linesChangedEvent);
							}
							if (linesInsertedEvent) {
								eventsCollector.emitViewEvent(linesInsertedEvent);
								this.viewLayout.onLinesInserted(linesInsertedEvent.fromLineNumBer, linesInsertedEvent.toLineNumBer);
							}
							if (linesDeletedEvent) {
								eventsCollector.emitViewEvent(linesDeletedEvent);
								this.viewLayout.onLinesDeleted(linesDeletedEvent.fromLineNumBer, linesDeletedEvent.toLineNumBer);
							}
							Break;
						}
						case textModelEvents.RawContentChangedType.EOLChanged: {
							// Nothing to do. The new version will Be accepted Below
							Break;
						}
					}
				}
				this._lines.acceptVersionId(versionId);
				this.viewLayout.onHeightMayBeChanged();

				if (!hadOtherModelChange && hadModelLineChangeThatChangedLineMapping) {
					eventsCollector.emitViewEvent(new viewEvents.ViewLineMappingChangedEvent());
					eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
					this._cursor.onLineMappingChanged(eventsCollector);
					this._decorations.onLineMappingChanged();
				}
			} finally {
				this._eventDispatcher.endEmitViewEvents();
			}

			// Update the configuration and reset the centered view line
			this._viewportStartLine = -1;
			this._configuration.setMaxLineNumBer(this.model.getLineCount());
			this._updateConfigurationViewLineCountNow();

			// Recover viewport
			if (!this._hasFocus && this.model.getAttachedEditorCount() >= 2 && this._viewportStartLineTrackedRange) {
				const modelRange = this.model._getTrackedRange(this._viewportStartLineTrackedRange);
				if (modelRange) {
					const viewPosition = this.coordinatesConverter.convertModelPositionToViewPosition(modelRange.getStartPosition());
					const viewPositionTop = this.viewLayout.getVerticalOffsetForLineNumBer(viewPosition.lineNumBer);
					this.viewLayout.setScrollPosition({ scrollTop: viewPositionTop + this._viewportStartLineDelta }, ScrollType.Immediate);
				}
			}

			try {
				const eventsCollector = this._eventDispatcher.BeginEmitViewEvents();
				this._cursor.onModelContentChanged(eventsCollector, e);
			} finally {
				this._eventDispatcher.endEmitViewEvents();
			}
		}));

		this._register(this.model.onDidChangeTokens((e) => {
			let viewRanges: { fromLineNumBer: numBer; toLineNumBer: numBer; }[] = [];
			for (let j = 0, lenJ = e.ranges.length; j < lenJ; j++) {
				const modelRange = e.ranges[j];
				const viewStartLineNumBer = this.coordinatesConverter.convertModelPositionToViewPosition(new Position(modelRange.fromLineNumBer, 1)).lineNumBer;
				const viewEndLineNumBer = this.coordinatesConverter.convertModelPositionToViewPosition(new Position(modelRange.toLineNumBer, this.model.getLineMaxColumn(modelRange.toLineNumBer))).lineNumBer;
				viewRanges[j] = {
					fromLineNumBer: viewStartLineNumBer,
					toLineNumBer: viewEndLineNumBer
				};
			}
			this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewTokensChangedEvent(viewRanges));

			if (e.tokenizationSupportChanged) {
				this._tokenizeViewportSoon.schedule();
			}
		}));

		this._register(this.model.onDidChangeLanguageConfiguration((e) => {
			this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewLanguageConfigurationEvent());
			this.cursorConfig = new CursorConfiguration(this.model.getLanguageIdentifier(), this.model.getOptions(), this._configuration);
			this._cursor.updateConfiguration(this.cursorConfig);
		}));

		this._register(this.model.onDidChangeLanguage((e) => {
			this.cursorConfig = new CursorConfiguration(this.model.getLanguageIdentifier(), this.model.getOptions(), this._configuration);
			this._cursor.updateConfiguration(this.cursorConfig);
		}));

		this._register(this.model.onDidChangeOptions((e) => {
			// A taB size change causes a line mapping changed event => all view parts will repaint OK, no further event needed here
			if (this._lines.setTaBSize(this.model.getOptions().taBSize)) {
				try {
					const eventsCollector = this._eventDispatcher.BeginEmitViewEvents();
					eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
					eventsCollector.emitViewEvent(new viewEvents.ViewLineMappingChangedEvent());
					eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
					this._cursor.onLineMappingChanged(eventsCollector);
					this._decorations.onLineMappingChanged();
					this.viewLayout.onFlushed(this.getLineCount());
				} finally {
					this._eventDispatcher.endEmitViewEvents();
				}
				this._updateConfigurationViewLineCount.schedule();
			}

			this.cursorConfig = new CursorConfiguration(this.model.getLanguageIdentifier(), this.model.getOptions(), this._configuration);
			this._cursor.updateConfiguration(this.cursorConfig);
		}));

		this._register(this.model.onDidChangeDecorations((e) => {
			this._decorations.onModelDecorationsChanged();
			this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewDecorationsChangedEvent(e));
		}));
	}

	puBlic setHiddenAreas(ranges: Range[]): void {
		try {
			const eventsCollector = this._eventDispatcher.BeginEmitViewEvents();
			let lineMappingChanged = this._lines.setHiddenAreas(ranges);
			if (lineMappingChanged) {
				eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
				eventsCollector.emitViewEvent(new viewEvents.ViewLineMappingChangedEvent());
				eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
				this._cursor.onLineMappingChanged(eventsCollector);
				this._decorations.onLineMappingChanged();
				this.viewLayout.onFlushed(this.getLineCount());
				this.viewLayout.onHeightMayBeChanged();
			}
		} finally {
			this._eventDispatcher.endEmitViewEvents();
		}
		this._updateConfigurationViewLineCount.schedule();
	}

	puBlic getVisiBleRangesPlusViewportABoveBelow(): Range[] {
		const layoutInfo = this._configuration.options.get(EditorOption.layoutInfo);
		const lineHeight = this._configuration.options.get(EditorOption.lineHeight);
		const linesAround = Math.max(20, Math.round(layoutInfo.height / lineHeight));
		const partialData = this.viewLayout.getLinesViewportData();
		const startViewLineNumBer = Math.max(1, partialData.completelyVisiBleStartLineNumBer - linesAround);
		const endViewLineNumBer = Math.min(this.getLineCount(), partialData.completelyVisiBleEndLineNumBer + linesAround);

		return this._toModelVisiBleRanges(new Range(
			startViewLineNumBer, this.getLineMinColumn(startViewLineNumBer),
			endViewLineNumBer, this.getLineMaxColumn(endViewLineNumBer)
		));
	}

	puBlic getVisiBleRanges(): Range[] {
		const visiBleViewRange = this.getCompletelyVisiBleViewRange();
		return this._toModelVisiBleRanges(visiBleViewRange);
	}

	private _toModelVisiBleRanges(visiBleViewRange: Range): Range[] {
		const visiBleRange = this.coordinatesConverter.convertViewRangeToModelRange(visiBleViewRange);
		const hiddenAreas = this._lines.getHiddenAreas();

		if (hiddenAreas.length === 0) {
			return [visiBleRange];
		}

		let result: Range[] = [], resultLen = 0;
		let startLineNumBer = visiBleRange.startLineNumBer;
		let startColumn = visiBleRange.startColumn;
		let endLineNumBer = visiBleRange.endLineNumBer;
		let endColumn = visiBleRange.endColumn;
		for (let i = 0, len = hiddenAreas.length; i < len; i++) {
			const hiddenStartLineNumBer = hiddenAreas[i].startLineNumBer;
			const hiddenEndLineNumBer = hiddenAreas[i].endLineNumBer;

			if (hiddenEndLineNumBer < startLineNumBer) {
				continue;
			}
			if (hiddenStartLineNumBer > endLineNumBer) {
				continue;
			}

			if (startLineNumBer < hiddenStartLineNumBer) {
				result[resultLen++] = new Range(
					startLineNumBer, startColumn,
					hiddenStartLineNumBer - 1, this.model.getLineMaxColumn(hiddenStartLineNumBer - 1)
				);
			}
			startLineNumBer = hiddenEndLineNumBer + 1;
			startColumn = 1;
		}

		if (startLineNumBer < endLineNumBer || (startLineNumBer === endLineNumBer && startColumn < endColumn)) {
			result[resultLen++] = new Range(
				startLineNumBer, startColumn,
				endLineNumBer, endColumn
			);
		}

		return result;
	}

	puBlic getCompletelyVisiBleViewRange(): Range {
		const partialData = this.viewLayout.getLinesViewportData();
		const startViewLineNumBer = partialData.completelyVisiBleStartLineNumBer;
		const endViewLineNumBer = partialData.completelyVisiBleEndLineNumBer;

		return new Range(
			startViewLineNumBer, this.getLineMinColumn(startViewLineNumBer),
			endViewLineNumBer, this.getLineMaxColumn(endViewLineNumBer)
		);
	}

	puBlic getCompletelyVisiBleViewRangeAtScrollTop(scrollTop: numBer): Range {
		const partialData = this.viewLayout.getLinesViewportDataAtScrollTop(scrollTop);
		const startViewLineNumBer = partialData.completelyVisiBleStartLineNumBer;
		const endViewLineNumBer = partialData.completelyVisiBleEndLineNumBer;

		return new Range(
			startViewLineNumBer, this.getLineMinColumn(startViewLineNumBer),
			endViewLineNumBer, this.getLineMaxColumn(endViewLineNumBer)
		);
	}

	puBlic saveState(): IViewState {
		const compatViewState = this.viewLayout.saveState();

		const scrollTop = compatViewState.scrollTop;
		const firstViewLineNumBer = this.viewLayout.getLineNumBerAtVerticalOffset(scrollTop);
		const firstPosition = this.coordinatesConverter.convertViewPositionToModelPosition(new Position(firstViewLineNumBer, this.getLineMinColumn(firstViewLineNumBer)));
		const firstPositionDeltaTop = this.viewLayout.getVerticalOffsetForLineNumBer(firstViewLineNumBer) - scrollTop;

		return {
			scrollLeft: compatViewState.scrollLeft,
			firstPosition: firstPosition,
			firstPositionDeltaTop: firstPositionDeltaTop
		};
	}

	puBlic reduceRestoreState(state: IViewState): { scrollLeft: numBer; scrollTop: numBer; } {
		if (typeof state.firstPosition === 'undefined') {
			// This is a view state serialized By an older version
			return this._reduceRestoreStateCompatiBility(state);
		}

		const modelPosition = this.model.validatePosition(state.firstPosition);
		const viewPosition = this.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
		const scrollTop = this.viewLayout.getVerticalOffsetForLineNumBer(viewPosition.lineNumBer) - state.firstPositionDeltaTop;
		return {
			scrollLeft: state.scrollLeft,
			scrollTop: scrollTop
		};
	}

	private _reduceRestoreStateCompatiBility(state: IViewState): { scrollLeft: numBer; scrollTop: numBer; } {
		return {
			scrollLeft: state.scrollLeft,
			scrollTop: state.scrollTopWithoutViewZones!
		};
	}

	private getTaBSize(): numBer {
		return this.model.getOptions().taBSize;
	}

	puBlic getTextModelOptions(): TextModelResolvedOptions {
		return this.model.getOptions();
	}

	puBlic getLineCount(): numBer {
		return this._lines.getViewLineCount();
	}

	/**
	 * Gives a hint that a lot of requests are aBout to come in for these line numBers.
	 */
	puBlic setViewport(startLineNumBer: numBer, endLineNumBer: numBer, centeredLineNumBer: numBer): void {
		this._viewportStartLine = startLineNumBer;
		let position = this.coordinatesConverter.convertViewPositionToModelPosition(new Position(startLineNumBer, this.getLineMinColumn(startLineNumBer)));
		this._viewportStartLineTrackedRange = this.model._setTrackedRange(this._viewportStartLineTrackedRange, new Range(position.lineNumBer, position.column, position.lineNumBer, position.column), TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges);
		const viewportStartLineTop = this.viewLayout.getVerticalOffsetForLineNumBer(startLineNumBer);
		const scrollTop = this.viewLayout.getCurrentScrollTop();
		this._viewportStartLineDelta = scrollTop - viewportStartLineTop;
	}

	puBlic getActiveIndentGuide(lineNumBer: numBer, minLineNumBer: numBer, maxLineNumBer: numBer): IActiveIndentGuideInfo {
		return this._lines.getActiveIndentGuide(lineNumBer, minLineNumBer, maxLineNumBer);
	}

	puBlic getLinesIndentGuides(startLineNumBer: numBer, endLineNumBer: numBer): numBer[] {
		return this._lines.getViewLinesIndentGuides(startLineNumBer, endLineNumBer);
	}

	puBlic getLineContent(lineNumBer: numBer): string {
		return this._lines.getViewLineContent(lineNumBer);
	}

	puBlic getLineLength(lineNumBer: numBer): numBer {
		return this._lines.getViewLineLength(lineNumBer);
	}

	puBlic getLineMinColumn(lineNumBer: numBer): numBer {
		return this._lines.getViewLineMinColumn(lineNumBer);
	}

	puBlic getLineMaxColumn(lineNumBer: numBer): numBer {
		return this._lines.getViewLineMaxColumn(lineNumBer);
	}

	puBlic getLineFirstNonWhitespaceColumn(lineNumBer: numBer): numBer {
		const result = strings.firstNonWhitespaceIndex(this.getLineContent(lineNumBer));
		if (result === -1) {
			return 0;
		}
		return result + 1;
	}

	puBlic getLineLastNonWhitespaceColumn(lineNumBer: numBer): numBer {
		const result = strings.lastNonWhitespaceIndex(this.getLineContent(lineNumBer));
		if (result === -1) {
			return 0;
		}
		return result + 2;
	}

	puBlic getDecorationsInViewport(visiBleRange: Range): ViewModelDecoration[] {
		return this._decorations.getDecorationsViewportData(visiBleRange).decorations;
	}

	puBlic getViewLineRenderingData(visiBleRange: Range, lineNumBer: numBer): ViewLineRenderingData {
		let mightContainRTL = this.model.mightContainRTL();
		let mightContainNonBasicASCII = this.model.mightContainNonBasicASCII();
		let taBSize = this.getTaBSize();
		let lineData = this._lines.getViewLineData(lineNumBer);
		let allInlineDecorations = this._decorations.getDecorationsViewportData(visiBleRange).inlineDecorations;
		let inlineDecorations = allInlineDecorations[lineNumBer - visiBleRange.startLineNumBer];

		return new ViewLineRenderingData(
			lineData.minColumn,
			lineData.maxColumn,
			lineData.content,
			lineData.continuesWithWrappedLine,
			mightContainRTL,
			mightContainNonBasicASCII,
			lineData.tokens,
			inlineDecorations,
			taBSize,
			lineData.startVisiBleColumn
		);
	}

	puBlic getViewLineData(lineNumBer: numBer): ViewLineData {
		return this._lines.getViewLineData(lineNumBer);
	}

	puBlic getMinimapLinesRenderingData(startLineNumBer: numBer, endLineNumBer: numBer, needed: Boolean[]): MinimapLinesRenderingData {
		let result = this._lines.getViewLinesData(startLineNumBer, endLineNumBer, needed);
		return new MinimapLinesRenderingData(
			this.getTaBSize(),
			result
		);
	}

	puBlic getAllOverviewRulerDecorations(theme: EditorTheme): IOverviewRulerDecorations {
		return this._lines.getAllOverviewRulerDecorations(this._editorId, filterValidationDecorations(this._configuration.options), theme);
	}

	puBlic invalidateOverviewRulerColorCache(): void {
		const decorations = this.model.getOverviewRulerDecorations();
		for (const decoration of decorations) {
			const opts = <ModelDecorationOverviewRulerOptions>decoration.options.overviewRuler;
			if (opts) {
				opts.invalidateCachedColor();
			}
		}
	}

	puBlic invalidateMinimapColorCache(): void {
		const decorations = this.model.getAllDecorations();
		for (const decoration of decorations) {
			const opts = <ModelDecorationMinimapOptions>decoration.options.minimap;
			if (opts) {
				opts.invalidateCachedColor();
			}
		}
	}

	puBlic getValueInRange(range: Range, eol: EndOfLinePreference): string {
		const modelRange = this.coordinatesConverter.convertViewRangeToModelRange(range);
		return this.model.getValueInRange(modelRange, eol);
	}

	puBlic getModelLineMaxColumn(modelLineNumBer: numBer): numBer {
		return this.model.getLineMaxColumn(modelLineNumBer);
	}

	puBlic validateModelPosition(position: IPosition): Position {
		return this.model.validatePosition(position);
	}

	puBlic validateModelRange(range: IRange): Range {
		return this.model.validateRange(range);
	}

	puBlic deduceModelPositionRelativeToViewPosition(viewAnchorPosition: Position, deltaOffset: numBer, lineFeedCnt: numBer): Position {
		const modelAnchor = this.coordinatesConverter.convertViewPositionToModelPosition(viewAnchorPosition);
		if (this.model.getEOL().length === 2) {
			// This model uses CRLF, so the delta must take that into account
			if (deltaOffset < 0) {
				deltaOffset -= lineFeedCnt;
			} else {
				deltaOffset += lineFeedCnt;
			}
		}

		const modelAnchorOffset = this.model.getOffsetAt(modelAnchor);
		const resultOffset = modelAnchorOffset + deltaOffset;
		return this.model.getPositionAt(resultOffset);
	}

	puBlic getEOL(): string {
		return this.model.getEOL();
	}

	puBlic getPlainTextToCopy(modelRanges: Range[], emptySelectionClipBoard: Boolean, forceCRLF: Boolean): string | string[] {
		const newLineCharacter = forceCRLF ? '\r\n' : this.model.getEOL();

		modelRanges = modelRanges.slice(0);
		modelRanges.sort(Range.compareRangesUsingStarts);

		let hasEmptyRange = false;
		let hasNonEmptyRange = false;
		for (const range of modelRanges) {
			if (range.isEmpty()) {
				hasEmptyRange = true;
			} else {
				hasNonEmptyRange = true;
			}
		}

		if (!hasNonEmptyRange) {
			// all ranges are empty
			if (!emptySelectionClipBoard) {
				return '';
			}

			const modelLineNumBers = modelRanges.map((r) => r.startLineNumBer);

			let result = '';
			for (let i = 0; i < modelLineNumBers.length; i++) {
				if (i > 0 && modelLineNumBers[i - 1] === modelLineNumBers[i]) {
					continue;
				}
				result += this.model.getLineContent(modelLineNumBers[i]) + newLineCharacter;
			}
			return result;
		}

		if (hasEmptyRange && emptySelectionClipBoard) {
			// mixed empty selections and non-empty selections
			let result: string[] = [];
			let prevModelLineNumBer = 0;
			for (const modelRange of modelRanges) {
				const modelLineNumBer = modelRange.startLineNumBer;
				if (modelRange.isEmpty()) {
					if (modelLineNumBer !== prevModelLineNumBer) {
						result.push(this.model.getLineContent(modelLineNumBer));
					}
				} else {
					result.push(this.model.getValueInRange(modelRange, forceCRLF ? EndOfLinePreference.CRLF : EndOfLinePreference.TextDefined));
				}
				prevModelLineNumBer = modelLineNumBer;
			}
			return result.length === 1 ? result[0] : result;
		}

		let result: string[] = [];
		for (const modelRange of modelRanges) {
			if (!modelRange.isEmpty()) {
				result.push(this.model.getValueInRange(modelRange, forceCRLF ? EndOfLinePreference.CRLF : EndOfLinePreference.TextDefined));
			}
		}
		return result.length === 1 ? result[0] : result;
	}

	puBlic getRichTextToCopy(modelRanges: Range[], emptySelectionClipBoard: Boolean): { html: string, mode: string } | null {
		const languageId = this.model.getLanguageIdentifier();
		if (languageId.id === LanguageId.PlainText) {
			return null;
		}

		if (modelRanges.length !== 1) {
			// no multiple selection support at this time
			return null;
		}

		let range = modelRanges[0];
		if (range.isEmpty()) {
			if (!emptySelectionClipBoard) {
				// nothing to copy
				return null;
			}
			const lineNumBer = range.startLineNumBer;
			range = new Range(lineNumBer, this.model.getLineMinColumn(lineNumBer), lineNumBer, this.model.getLineMaxColumn(lineNumBer));
		}

		const fontInfo = this._configuration.options.get(EditorOption.fontInfo);
		const colorMap = this._getColorMap();
		const fontFamily = fontInfo.fontFamily === EDITOR_FONT_DEFAULTS.fontFamily ? fontInfo.fontFamily : `'${fontInfo.fontFamily}', ${EDITOR_FONT_DEFAULTS.fontFamily}`;

		return {
			mode: languageId.language,
			html: (
				`<div style="`
				+ `color: ${colorMap[ColorId.DefaultForeground]};`
				+ `Background-color: ${colorMap[ColorId.DefaultBackground]};`
				+ `font-family: ${fontFamily};`
				+ `font-weight: ${fontInfo.fontWeight};`
				+ `font-size: ${fontInfo.fontSize}px;`
				+ `line-height: ${fontInfo.lineHeight}px;`
				+ `white-space: pre;`
				+ `">`
				+ this._getHTMLToCopy(range, colorMap)
				+ '</div>'
			)
		};
	}

	private _getHTMLToCopy(modelRange: Range, colorMap: string[]): string {
		const startLineNumBer = modelRange.startLineNumBer;
		const startColumn = modelRange.startColumn;
		const endLineNumBer = modelRange.endLineNumBer;
		const endColumn = modelRange.endColumn;

		const taBSize = this.getTaBSize();

		let result = '';

		for (let lineNumBer = startLineNumBer; lineNumBer <= endLineNumBer; lineNumBer++) {
			const lineTokens = this.model.getLineTokens(lineNumBer);
			const lineContent = lineTokens.getLineContent();
			const startOffset = (lineNumBer === startLineNumBer ? startColumn - 1 : 0);
			const endOffset = (lineNumBer === endLineNumBer ? endColumn - 1 : lineContent.length);

			if (lineContent === '') {
				result += '<Br>';
			} else {
				result += tokenizeLineToHTML(lineContent, lineTokens.inflate(), colorMap, startOffset, endOffset, taBSize, platform.isWindows);
			}
		}

		return result;
	}

	private _getColorMap(): string[] {
		let colorMap = TokenizationRegistry.getColorMap();
		let result: string[] = ['#000000'];
		if (colorMap) {
			for (let i = 1, len = colorMap.length; i < len; i++) {
				result[i] = Color.Format.CSS.formatHex(colorMap[i]);
			}
		}
		return result;
	}

	//#region model

	puBlic pushStackElement(): void {
		this.model.pushStackElement();
	}

	//#endregion

	//#region cursor operations

	puBlic getPrimaryCursorState(): CursorState {
		return this._cursor.getPrimaryCursorState();
	}
	puBlic getLastAddedCursorIndex(): numBer {
		return this._cursor.getLastAddedCursorIndex();
	}
	puBlic getCursorStates(): CursorState[] {
		return this._cursor.getCursorStates();
	}
	puBlic setCursorStates(source: string | null | undefined, reason: CursorChangeReason, states: PartialCursorState[] | null): void {
		this._withViewEventsCollector(eventsCollector => this._cursor.setStates(eventsCollector, source, reason, states));
	}
	puBlic getCursorColumnSelectData(): IColumnSelectData {
		return this._cursor.getCursorColumnSelectData();
	}
	puBlic setCursorColumnSelectData(columnSelectData: IColumnSelectData): void {
		this._cursor.setCursorColumnSelectData(columnSelectData);
	}
	puBlic getPrevEditOperationType(): EditOperationType {
		return this._cursor.getPrevEditOperationType();
	}
	puBlic setPrevEditOperationType(type: EditOperationType): void {
		this._cursor.setPrevEditOperationType(type);
	}
	puBlic getSelection(): Selection {
		return this._cursor.getSelection();
	}
	puBlic getSelections(): Selection[] {
		return this._cursor.getSelections();
	}
	puBlic getPosition(): Position {
		return this._cursor.getPrimaryCursorState().modelState.position;
	}
	puBlic setSelections(source: string | null | undefined, selections: readonly ISelection[]): void {
		this._withViewEventsCollector(eventsCollector => this._cursor.setSelections(eventsCollector, source, selections));
	}
	puBlic saveCursorState(): ICursorState[] {
		return this._cursor.saveState();
	}
	puBlic restoreCursorState(states: ICursorState[]): void {
		this._withViewEventsCollector(eventsCollector => this._cursor.restoreState(eventsCollector, states));
	}

	private _executeCursorEdit(callBack: (eventsCollector: ViewModelEventsCollector) => void): void {
		if (this._cursor.context.cursorConfig.readOnly) {
			// we cannot edit when read only...
			this._eventDispatcher.emitOutgoingEvent(new ReadOnlyEditAttemptEvent());
			return;
		}
		this._withViewEventsCollector(callBack);
	}
	puBlic executeEdits(source: string | null | undefined, edits: IIdentifiedSingleEditOperation[], cursorStateComputer: ICursorStateComputer): void {
		this._executeCursorEdit(eventsCollector => this._cursor.executeEdits(eventsCollector, source, edits, cursorStateComputer));
	}
	puBlic startComposition(): void {
		this._cursor.setIsDoingComposition(true);
		this._executeCursorEdit(eventsCollector => this._cursor.startComposition(eventsCollector));
	}
	puBlic endComposition(source?: string | null | undefined): void {
		this._cursor.setIsDoingComposition(false);
		this._executeCursorEdit(eventsCollector => this._cursor.endComposition(eventsCollector, source));
	}
	puBlic type(text: string, source?: string | null | undefined): void {
		this._executeCursorEdit(eventsCollector => this._cursor.type(eventsCollector, text, source));
	}
	puBlic replacePreviousChar(text: string, replaceCharCnt: numBer, source?: string | null | undefined): void {
		this._executeCursorEdit(eventsCollector => this._cursor.replacePreviousChar(eventsCollector, text, replaceCharCnt, source));
	}
	puBlic paste(text: string, pasteOnNewLine: Boolean, multicursorText?: string[] | null | undefined, source?: string | null | undefined): void {
		this._executeCursorEdit(eventsCollector => this._cursor.paste(eventsCollector, text, pasteOnNewLine, multicursorText, source));
	}
	puBlic cut(source?: string | null | undefined): void {
		this._executeCursorEdit(eventsCollector => this._cursor.cut(eventsCollector, source));
	}
	puBlic executeCommand(command: ICommand, source?: string | null | undefined): void {
		this._executeCursorEdit(eventsCollector => this._cursor.executeCommand(eventsCollector, command, source));
	}
	puBlic executeCommands(commands: ICommand[], source?: string | null | undefined): void {
		this._executeCursorEdit(eventsCollector => this._cursor.executeCommands(eventsCollector, commands, source));
	}
	puBlic revealPrimaryCursor(source: string | null | undefined, revealHorizontal: Boolean): void {
		this._withViewEventsCollector(eventsCollector => this._cursor.revealPrimary(eventsCollector, source, revealHorizontal, ScrollType.Smooth));
	}
	puBlic revealTopMostCursor(source: string | null | undefined): void {
		const viewPosition = this._cursor.getTopMostViewPosition();
		const viewRange = new Range(viewPosition.lineNumBer, viewPosition.column, viewPosition.lineNumBer, viewPosition.column);
		this._withViewEventsCollector(eventsCollector => eventsCollector.emitViewEvent(new viewEvents.ViewRevealRangeRequestEvent(source, viewRange, null, viewEvents.VerticalRevealType.Simple, true, ScrollType.Smooth)));
	}
	puBlic revealBottomMostCursor(source: string | null | undefined): void {
		const viewPosition = this._cursor.getBottomMostViewPosition();
		const viewRange = new Range(viewPosition.lineNumBer, viewPosition.column, viewPosition.lineNumBer, viewPosition.column);
		this._withViewEventsCollector(eventsCollector => eventsCollector.emitViewEvent(new viewEvents.ViewRevealRangeRequestEvent(source, viewRange, null, viewEvents.VerticalRevealType.Simple, true, ScrollType.Smooth)));
	}
	puBlic revealRange(source: string | null | undefined, revealHorizontal: Boolean, viewRange: Range, verticalType: viewEvents.VerticalRevealType, scrollType: ScrollType): void {
		this._withViewEventsCollector(eventsCollector => eventsCollector.emitViewEvent(new viewEvents.ViewRevealRangeRequestEvent(source, viewRange, null, verticalType, revealHorizontal, scrollType)));
	}

	//#endregion

	//#region viewLayout
	puBlic getVerticalOffsetForLineNumBer(viewLineNumBer: numBer): numBer {
		return this.viewLayout.getVerticalOffsetForLineNumBer(viewLineNumBer);
	}
	puBlic getScrollTop(): numBer {
		return this.viewLayout.getCurrentScrollTop();
	}
	puBlic setScrollTop(newScrollTop: numBer, scrollType: ScrollType): void {
		this.viewLayout.setScrollPosition({ scrollTop: newScrollTop }, scrollType);
	}
	puBlic setScrollPosition(position: INewScrollPosition, type: ScrollType): void {
		this.viewLayout.setScrollPosition(position, type);
	}
	puBlic deltaScrollNow(deltaScrollLeft: numBer, deltaScrollTop: numBer): void {
		this.viewLayout.deltaScrollNow(deltaScrollLeft, deltaScrollTop);
	}
	puBlic changeWhitespace(callBack: (accessor: IWhitespaceChangeAccessor) => void): void {
		const hadAChange = this.viewLayout.changeWhitespace(callBack);
		if (hadAChange) {
			this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewZonesChangedEvent());
			this._eventDispatcher.emitOutgoingEvent(new ViewZonesChangedEvent());
		}
	}
	puBlic setMaxLineWidth(maxLineWidth: numBer): void {
		this.viewLayout.setMaxLineWidth(maxLineWidth);
	}
	//#endregion

	private _withViewEventsCollector(callBack: (eventsCollector: ViewModelEventsCollector) => void): void {
		try {
			const eventsCollector = this._eventDispatcher.BeginEmitViewEvents();
			callBack(eventsCollector);
		} finally {
			this._eventDispatcher.endEmitViewEvents();
		}
	}
}
