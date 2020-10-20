/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Color } from 'vs/bAse/common/color';
import { Event } from 'vs/bAse/common/event';
import { IDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import * As strings from 'vs/bAse/common/strings';
import { ConfigurAtionChAngedEvent, EDITOR_FONT_DEFAULTS, EditorOption, filterVAlidAtionDecorAtions } from 'vs/editor/common/config/editorOptions';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { ISelection, Selection } from 'vs/editor/common/core/selection';
import { IRAnge, RAnge } from 'vs/editor/common/core/rAnge';
import { IConfigurAtion, IViewStAte, ScrollType, ICursorStAte, ICommAnd, INewScrollPosition } from 'vs/editor/common/editorCommon';
import { EndOfLinePreference, IActiveIndentGuideInfo, ITextModel, TrAckedRAngeStickiness, TextModelResolvedOptions, IIdentifiedSingleEditOperAtion, ICursorStAteComputer } from 'vs/editor/common/model';
import { ModelDecorAtionOverviewRulerOptions, ModelDecorAtionMinimApOptions } from 'vs/editor/common/model/textModel';
import * As textModelEvents from 'vs/editor/common/model/textModelEvents';
import { ColorId, LAnguAgeId, TokenizAtionRegistry } from 'vs/editor/common/modes';
import { tokenizeLineToHTML } from 'vs/editor/common/modes/textToHtmlTokenizer';
import { MinimApTokensColorTrAcker } from 'vs/editor/common/viewModel/minimApTokensColorTrAcker';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { ViewLAyout } from 'vs/editor/common/viewLAyout/viewLAyout';
import { IViewModelLinesCollection, IdentityLinesCollection, SplitLinesCollection, ILineBreAksComputerFActory } from 'vs/editor/common/viewModel/splitLinesCollection';
import { ICoordinAtesConverter, IOverviewRulerDecorAtions, IViewModel, MinimApLinesRenderingDAtA, ViewLineDAtA, ViewLineRenderingDAtA, ViewModelDecorAtion } from 'vs/editor/common/viewModel/viewModel';
import { ViewModelDecorAtions } from 'vs/editor/common/viewModel/viewModelDecorAtions';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import * As plAtform from 'vs/bAse/common/plAtform';
import { EditorTheme } from 'vs/editor/common/view/viewContext';
import { Cursor } from 'vs/editor/common/controller/cursor';
import { PArtiAlCursorStAte, CursorStAte, IColumnSelectDAtA, EditOperAtionType, CursorConfigurAtion } from 'vs/editor/common/controller/cursorCommon';
import { CursorChAngeReAson } from 'vs/editor/common/controller/cursorEvents';
import { IWhitespAceChAngeAccessor } from 'vs/editor/common/viewLAyout/linesLAyout';
import { ViewModelEventDispAtcher, OutgoingViewModelEvent, FocusChAngedEvent, ScrollChAngedEvent, ViewZonesChAngedEvent, ViewModelEventsCollector, ReAdOnlyEditAttemptEvent } from 'vs/editor/common/viewModel/viewModelEventDispAtcher';
import { ViewEventHAndler } from 'vs/editor/common/viewModel/viewEventHAndler';

const USE_IDENTITY_LINES_COLLECTION = true;

export clAss ViewModel extends DisposAble implements IViewModel {

	privAte reAdonly _editorId: number;
	privAte reAdonly _configurAtion: IConfigurAtion;
	public reAdonly model: ITextModel;
	privAte reAdonly _eventDispAtcher: ViewModelEventDispAtcher;
	public reAdonly onEvent: Event<OutgoingViewModelEvent>;
	public cursorConfig: CursorConfigurAtion;
	privAte reAdonly _tokenizeViewportSoon: RunOnceScheduler;
	privAte reAdonly _updAteConfigurAtionViewLineCount: RunOnceScheduler;
	privAte _hAsFocus: booleAn;
	privAte _viewportStArtLine: number;
	privAte _viewportStArtLineTrAckedRAnge: string | null;
	privAte _viewportStArtLineDeltA: number;
	privAte reAdonly _lines: IViewModelLinesCollection;
	public reAdonly coordinAtesConverter: ICoordinAtesConverter;
	public reAdonly viewLAyout: ViewLAyout;
	privAte reAdonly _cursor: Cursor;
	privAte reAdonly _decorAtions: ViewModelDecorAtions;

	constructor(
		editorId: number,
		configurAtion: IConfigurAtion,
		model: ITextModel,
		domLineBreAksComputerFActory: ILineBreAksComputerFActory,
		monospAceLineBreAksComputerFActory: ILineBreAksComputerFActory,
		scheduleAtNextAnimAtionFrAme: (cAllbAck: () => void) => IDisposAble
	) {
		super();

		this._editorId = editorId;
		this._configurAtion = configurAtion;
		this.model = model;
		this._eventDispAtcher = new ViewModelEventDispAtcher();
		this.onEvent = this._eventDispAtcher.onEvent;
		this.cursorConfig = new CursorConfigurAtion(this.model.getLAnguAgeIdentifier(), this.model.getOptions(), this._configurAtion);
		this._tokenizeViewportSoon = this._register(new RunOnceScheduler(() => this.tokenizeViewport(), 50));
		this._updAteConfigurAtionViewLineCount = this._register(new RunOnceScheduler(() => this._updAteConfigurAtionViewLineCountNow(), 0));
		this._hAsFocus = fAlse;
		this._viewportStArtLine = -1;
		this._viewportStArtLineTrAckedRAnge = null;
		this._viewportStArtLineDeltA = 0;

		if (USE_IDENTITY_LINES_COLLECTION && this.model.isTooLArgeForTokenizAtion()) {

			this._lines = new IdentityLinesCollection(this.model);

		} else {
			const options = this._configurAtion.options;
			const fontInfo = options.get(EditorOption.fontInfo);
			const wrAppingStrAtegy = options.get(EditorOption.wrAppingStrAtegy);
			const wrAppingInfo = options.get(EditorOption.wrAppingInfo);
			const wrAppingIndent = options.get(EditorOption.wrAppingIndent);

			this._lines = new SplitLinesCollection(
				this.model,
				domLineBreAksComputerFActory,
				monospAceLineBreAksComputerFActory,
				fontInfo,
				this.model.getOptions().tAbSize,
				wrAppingStrAtegy,
				wrAppingInfo.wrAppingColumn,
				wrAppingIndent
			);
		}

		this.coordinAtesConverter = this._lines.creAteCoordinAtesConverter();

		this._cursor = this._register(new Cursor(model, this, this.coordinAtesConverter, this.cursorConfig));

		this.viewLAyout = this._register(new ViewLAyout(this._configurAtion, this.getLineCount(), scheduleAtNextAnimAtionFrAme));

		this._register(this.viewLAyout.onDidScroll((e) => {
			if (e.scrollTopChAnged) {
				this._tokenizeViewportSoon.schedule();
			}
			this._eventDispAtcher.emitSingleViewEvent(new viewEvents.ViewScrollChAngedEvent(e));
			this._eventDispAtcher.emitOutgoingEvent(new ScrollChAngedEvent(
				e.oldScrollWidth, e.oldScrollLeft, e.oldScrollHeight, e.oldScrollTop,
				e.scrollWidth, e.scrollLeft, e.scrollHeight, e.scrollTop
			));
		}));

		this._register(this.viewLAyout.onDidContentSizeChAnge((e) => {
			this._eventDispAtcher.emitOutgoingEvent(e);
		}));

		this._decorAtions = new ViewModelDecorAtions(this._editorId, this.model, this._configurAtion, this._lines, this.coordinAtesConverter);

		this._registerModelEvents();

		this._register(this._configurAtion.onDidChAngeFAst((e) => {
			try {
				const eventsCollector = this._eventDispAtcher.beginEmitViewEvents();
				this._onConfigurAtionChAnged(eventsCollector, e);
			} finAlly {
				this._eventDispAtcher.endEmitViewEvents();
			}
		}));

		this._register(MinimApTokensColorTrAcker.getInstAnce().onDidChAnge(() => {
			this._eventDispAtcher.emitSingleViewEvent(new viewEvents.ViewTokensColorsChAngedEvent());
		}));

		this._updAteConfigurAtionViewLineCountNow();
	}

	public dispose(): void {
		// First remove listeners, As disposing the lines might end up sending
		// model decorAtion chAnged events ... And we no longer cAre About them ...
		super.dispose();
		this._decorAtions.dispose();
		this._lines.dispose();
		this.invAlidAteMinimApColorCAche();
		this._viewportStArtLineTrAckedRAnge = this.model._setTrAckedRAnge(this._viewportStArtLineTrAckedRAnge, null, TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges);
		this._eventDispAtcher.dispose();
	}

	public AddViewEventHAndler(eventHAndler: ViewEventHAndler): void {
		this._eventDispAtcher.AddViewEventHAndler(eventHAndler);
	}

	public removeViewEventHAndler(eventHAndler: ViewEventHAndler): void {
		this._eventDispAtcher.removeViewEventHAndler(eventHAndler);
	}

	privAte _updAteConfigurAtionViewLineCountNow(): void {
		this._configurAtion.setViewLineCount(this._lines.getViewLineCount());
	}

	public tokenizeViewport(): void {
		const linesViewportDAtA = this.viewLAyout.getLinesViewportDAtA();
		const stArtPosition = this.coordinAtesConverter.convertViewPositionToModelPosition(new Position(linesViewportDAtA.stArtLineNumber, 1));
		const endPosition = this.coordinAtesConverter.convertViewPositionToModelPosition(new Position(linesViewportDAtA.endLineNumber, 1));
		this.model.tokenizeViewport(stArtPosition.lineNumber, endPosition.lineNumber);
	}

	public setHAsFocus(hAsFocus: booleAn): void {
		this._hAsFocus = hAsFocus;
		this._cursor.setHAsFocus(hAsFocus);
		this._eventDispAtcher.emitSingleViewEvent(new viewEvents.ViewFocusChAngedEvent(hAsFocus));
		this._eventDispAtcher.emitOutgoingEvent(new FocusChAngedEvent(!hAsFocus, hAsFocus));
	}

	public onDidColorThemeChAnge(): void {
		this._eventDispAtcher.emitSingleViewEvent(new viewEvents.ViewThemeChAngedEvent());
	}

	privAte _onConfigurAtionChAnged(eventsCollector: ViewModelEventsCollector, e: ConfigurAtionChAngedEvent): void {

		// We might need to restore the current centered view rAnge, so sAve it (if AvAilAble)
		let previousViewportStArtModelPosition: Position | null = null;
		if (this._viewportStArtLine !== -1) {
			let previousViewportStArtViewPosition = new Position(this._viewportStArtLine, this.getLineMinColumn(this._viewportStArtLine));
			previousViewportStArtModelPosition = this.coordinAtesConverter.convertViewPositionToModelPosition(previousViewportStArtViewPosition);
		}
		let restorePreviousViewportStArt = fAlse;

		const options = this._configurAtion.options;
		const fontInfo = options.get(EditorOption.fontInfo);
		const wrAppingStrAtegy = options.get(EditorOption.wrAppingStrAtegy);
		const wrAppingInfo = options.get(EditorOption.wrAppingInfo);
		const wrAppingIndent = options.get(EditorOption.wrAppingIndent);

		if (this._lines.setWrAppingSettings(fontInfo, wrAppingStrAtegy, wrAppingInfo.wrAppingColumn, wrAppingIndent)) {
			eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
			eventsCollector.emitViewEvent(new viewEvents.ViewLineMAppingChAngedEvent());
			eventsCollector.emitViewEvent(new viewEvents.ViewDecorAtionsChAngedEvent(null));
			this._cursor.onLineMAppingChAnged(eventsCollector);
			this._decorAtions.onLineMAppingChAnged();
			this.viewLAyout.onFlushed(this.getLineCount());

			if (this.viewLAyout.getCurrentScrollTop() !== 0) {
				// Never chAnge the scroll position from 0 to something else...
				restorePreviousViewportStArt = true;
			}

			this._updAteConfigurAtionViewLineCount.schedule();
		}

		if (e.hAsChAnged(EditorOption.reAdOnly)) {
			// Must reAd AgAin All decorAtions due to reAdOnly filtering
			this._decorAtions.reset();
			eventsCollector.emitViewEvent(new viewEvents.ViewDecorAtionsChAngedEvent(null));
		}

		eventsCollector.emitViewEvent(new viewEvents.ViewConfigurAtionChAngedEvent(e));
		this.viewLAyout.onConfigurAtionChAnged(e);

		if (restorePreviousViewportStArt && previousViewportStArtModelPosition) {
			const viewPosition = this.coordinAtesConverter.convertModelPositionToViewPosition(previousViewportStArtModelPosition);
			const viewPositionTop = this.viewLAyout.getVerticAlOffsetForLineNumber(viewPosition.lineNumber);
			this.viewLAyout.setScrollPosition({ scrollTop: viewPositionTop + this._viewportStArtLineDeltA }, ScrollType.ImmediAte);
		}

		if (CursorConfigurAtion.shouldRecreAte(e)) {
			this.cursorConfig = new CursorConfigurAtion(this.model.getLAnguAgeIdentifier(), this.model.getOptions(), this._configurAtion);
			this._cursor.updAteConfigurAtion(this.cursorConfig);
		}
	}

	privAte _registerModelEvents(): void {

		this._register(this.model.onDidChAngeRAwContentFAst((e) => {
			try {
				const eventsCollector = this._eventDispAtcher.beginEmitViewEvents();

				let hAdOtherModelChAnge = fAlse;
				let hAdModelLineChAngeThAtChAngedLineMApping = fAlse;

				const chAnges = e.chAnges;
				const versionId = e.versionId;

				// Do A first pAss to compute line mAppings, And A second pAss to ActuAlly interpret them
				const lineBreAksComputer = this._lines.creAteLineBreAksComputer();
				for (const chAnge of chAnges) {
					switch (chAnge.chAngeType) {
						cAse textModelEvents.RAwContentChAngedType.LinesInserted: {
							for (const line of chAnge.detAil) {
								lineBreAksComputer.AddRequest(line, null);
							}
							breAk;
						}
						cAse textModelEvents.RAwContentChAngedType.LineChAnged: {
							lineBreAksComputer.AddRequest(chAnge.detAil, null);
							breAk;
						}
					}
				}
				const lineBreAks = lineBreAksComputer.finAlize();
				let lineBreAksOffset = 0;

				for (const chAnge of chAnges) {

					switch (chAnge.chAngeType) {
						cAse textModelEvents.RAwContentChAngedType.Flush: {
							this._lines.onModelFlushed();
							eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
							this._decorAtions.reset();
							this.viewLAyout.onFlushed(this.getLineCount());
							hAdOtherModelChAnge = true;
							breAk;
						}
						cAse textModelEvents.RAwContentChAngedType.LinesDeleted: {
							const linesDeletedEvent = this._lines.onModelLinesDeleted(versionId, chAnge.fromLineNumber, chAnge.toLineNumber);
							if (linesDeletedEvent !== null) {
								eventsCollector.emitViewEvent(linesDeletedEvent);
								this.viewLAyout.onLinesDeleted(linesDeletedEvent.fromLineNumber, linesDeletedEvent.toLineNumber);
							}
							hAdOtherModelChAnge = true;
							breAk;
						}
						cAse textModelEvents.RAwContentChAngedType.LinesInserted: {
							const insertedLineBreAks = lineBreAks.slice(lineBreAksOffset, lineBreAksOffset + chAnge.detAil.length);
							lineBreAksOffset += chAnge.detAil.length;

							const linesInsertedEvent = this._lines.onModelLinesInserted(versionId, chAnge.fromLineNumber, chAnge.toLineNumber, insertedLineBreAks);
							if (linesInsertedEvent !== null) {
								eventsCollector.emitViewEvent(linesInsertedEvent);
								this.viewLAyout.onLinesInserted(linesInsertedEvent.fromLineNumber, linesInsertedEvent.toLineNumber);
							}
							hAdOtherModelChAnge = true;
							breAk;
						}
						cAse textModelEvents.RAwContentChAngedType.LineChAnged: {
							const chAngedLineBreAkDAtA = lineBreAks[lineBreAksOffset];
							lineBreAksOffset++;

							const [lineMAppingChAnged, linesChAngedEvent, linesInsertedEvent, linesDeletedEvent] = this._lines.onModelLineChAnged(versionId, chAnge.lineNumber, chAngedLineBreAkDAtA);
							hAdModelLineChAngeThAtChAngedLineMApping = lineMAppingChAnged;
							if (linesChAngedEvent) {
								eventsCollector.emitViewEvent(linesChAngedEvent);
							}
							if (linesInsertedEvent) {
								eventsCollector.emitViewEvent(linesInsertedEvent);
								this.viewLAyout.onLinesInserted(linesInsertedEvent.fromLineNumber, linesInsertedEvent.toLineNumber);
							}
							if (linesDeletedEvent) {
								eventsCollector.emitViewEvent(linesDeletedEvent);
								this.viewLAyout.onLinesDeleted(linesDeletedEvent.fromLineNumber, linesDeletedEvent.toLineNumber);
							}
							breAk;
						}
						cAse textModelEvents.RAwContentChAngedType.EOLChAnged: {
							// Nothing to do. The new version will be Accepted below
							breAk;
						}
					}
				}
				this._lines.AcceptVersionId(versionId);
				this.viewLAyout.onHeightMAybeChAnged();

				if (!hAdOtherModelChAnge && hAdModelLineChAngeThAtChAngedLineMApping) {
					eventsCollector.emitViewEvent(new viewEvents.ViewLineMAppingChAngedEvent());
					eventsCollector.emitViewEvent(new viewEvents.ViewDecorAtionsChAngedEvent(null));
					this._cursor.onLineMAppingChAnged(eventsCollector);
					this._decorAtions.onLineMAppingChAnged();
				}
			} finAlly {
				this._eventDispAtcher.endEmitViewEvents();
			}

			// UpdAte the configurAtion And reset the centered view line
			this._viewportStArtLine = -1;
			this._configurAtion.setMAxLineNumber(this.model.getLineCount());
			this._updAteConfigurAtionViewLineCountNow();

			// Recover viewport
			if (!this._hAsFocus && this.model.getAttAchedEditorCount() >= 2 && this._viewportStArtLineTrAckedRAnge) {
				const modelRAnge = this.model._getTrAckedRAnge(this._viewportStArtLineTrAckedRAnge);
				if (modelRAnge) {
					const viewPosition = this.coordinAtesConverter.convertModelPositionToViewPosition(modelRAnge.getStArtPosition());
					const viewPositionTop = this.viewLAyout.getVerticAlOffsetForLineNumber(viewPosition.lineNumber);
					this.viewLAyout.setScrollPosition({ scrollTop: viewPositionTop + this._viewportStArtLineDeltA }, ScrollType.ImmediAte);
				}
			}

			try {
				const eventsCollector = this._eventDispAtcher.beginEmitViewEvents();
				this._cursor.onModelContentChAnged(eventsCollector, e);
			} finAlly {
				this._eventDispAtcher.endEmitViewEvents();
			}
		}));

		this._register(this.model.onDidChAngeTokens((e) => {
			let viewRAnges: { fromLineNumber: number; toLineNumber: number; }[] = [];
			for (let j = 0, lenJ = e.rAnges.length; j < lenJ; j++) {
				const modelRAnge = e.rAnges[j];
				const viewStArtLineNumber = this.coordinAtesConverter.convertModelPositionToViewPosition(new Position(modelRAnge.fromLineNumber, 1)).lineNumber;
				const viewEndLineNumber = this.coordinAtesConverter.convertModelPositionToViewPosition(new Position(modelRAnge.toLineNumber, this.model.getLineMAxColumn(modelRAnge.toLineNumber))).lineNumber;
				viewRAnges[j] = {
					fromLineNumber: viewStArtLineNumber,
					toLineNumber: viewEndLineNumber
				};
			}
			this._eventDispAtcher.emitSingleViewEvent(new viewEvents.ViewTokensChAngedEvent(viewRAnges));

			if (e.tokenizAtionSupportChAnged) {
				this._tokenizeViewportSoon.schedule();
			}
		}));

		this._register(this.model.onDidChAngeLAnguAgeConfigurAtion((e) => {
			this._eventDispAtcher.emitSingleViewEvent(new viewEvents.ViewLAnguAgeConfigurAtionEvent());
			this.cursorConfig = new CursorConfigurAtion(this.model.getLAnguAgeIdentifier(), this.model.getOptions(), this._configurAtion);
			this._cursor.updAteConfigurAtion(this.cursorConfig);
		}));

		this._register(this.model.onDidChAngeLAnguAge((e) => {
			this.cursorConfig = new CursorConfigurAtion(this.model.getLAnguAgeIdentifier(), this.model.getOptions(), this._configurAtion);
			this._cursor.updAteConfigurAtion(this.cursorConfig);
		}));

		this._register(this.model.onDidChAngeOptions((e) => {
			// A tAb size chAnge cAuses A line mApping chAnged event => All view pArts will repAint OK, no further event needed here
			if (this._lines.setTAbSize(this.model.getOptions().tAbSize)) {
				try {
					const eventsCollector = this._eventDispAtcher.beginEmitViewEvents();
					eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
					eventsCollector.emitViewEvent(new viewEvents.ViewLineMAppingChAngedEvent());
					eventsCollector.emitViewEvent(new viewEvents.ViewDecorAtionsChAngedEvent(null));
					this._cursor.onLineMAppingChAnged(eventsCollector);
					this._decorAtions.onLineMAppingChAnged();
					this.viewLAyout.onFlushed(this.getLineCount());
				} finAlly {
					this._eventDispAtcher.endEmitViewEvents();
				}
				this._updAteConfigurAtionViewLineCount.schedule();
			}

			this.cursorConfig = new CursorConfigurAtion(this.model.getLAnguAgeIdentifier(), this.model.getOptions(), this._configurAtion);
			this._cursor.updAteConfigurAtion(this.cursorConfig);
		}));

		this._register(this.model.onDidChAngeDecorAtions((e) => {
			this._decorAtions.onModelDecorAtionsChAnged();
			this._eventDispAtcher.emitSingleViewEvent(new viewEvents.ViewDecorAtionsChAngedEvent(e));
		}));
	}

	public setHiddenAreAs(rAnges: RAnge[]): void {
		try {
			const eventsCollector = this._eventDispAtcher.beginEmitViewEvents();
			let lineMAppingChAnged = this._lines.setHiddenAreAs(rAnges);
			if (lineMAppingChAnged) {
				eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
				eventsCollector.emitViewEvent(new viewEvents.ViewLineMAppingChAngedEvent());
				eventsCollector.emitViewEvent(new viewEvents.ViewDecorAtionsChAngedEvent(null));
				this._cursor.onLineMAppingChAnged(eventsCollector);
				this._decorAtions.onLineMAppingChAnged();
				this.viewLAyout.onFlushed(this.getLineCount());
				this.viewLAyout.onHeightMAybeChAnged();
			}
		} finAlly {
			this._eventDispAtcher.endEmitViewEvents();
		}
		this._updAteConfigurAtionViewLineCount.schedule();
	}

	public getVisibleRAngesPlusViewportAboveBelow(): RAnge[] {
		const lAyoutInfo = this._configurAtion.options.get(EditorOption.lAyoutInfo);
		const lineHeight = this._configurAtion.options.get(EditorOption.lineHeight);
		const linesAround = MAth.mAx(20, MAth.round(lAyoutInfo.height / lineHeight));
		const pArtiAlDAtA = this.viewLAyout.getLinesViewportDAtA();
		const stArtViewLineNumber = MAth.mAx(1, pArtiAlDAtA.completelyVisibleStArtLineNumber - linesAround);
		const endViewLineNumber = MAth.min(this.getLineCount(), pArtiAlDAtA.completelyVisibleEndLineNumber + linesAround);

		return this._toModelVisibleRAnges(new RAnge(
			stArtViewLineNumber, this.getLineMinColumn(stArtViewLineNumber),
			endViewLineNumber, this.getLineMAxColumn(endViewLineNumber)
		));
	}

	public getVisibleRAnges(): RAnge[] {
		const visibleViewRAnge = this.getCompletelyVisibleViewRAnge();
		return this._toModelVisibleRAnges(visibleViewRAnge);
	}

	privAte _toModelVisibleRAnges(visibleViewRAnge: RAnge): RAnge[] {
		const visibleRAnge = this.coordinAtesConverter.convertViewRAngeToModelRAnge(visibleViewRAnge);
		const hiddenAreAs = this._lines.getHiddenAreAs();

		if (hiddenAreAs.length === 0) {
			return [visibleRAnge];
		}

		let result: RAnge[] = [], resultLen = 0;
		let stArtLineNumber = visibleRAnge.stArtLineNumber;
		let stArtColumn = visibleRAnge.stArtColumn;
		let endLineNumber = visibleRAnge.endLineNumber;
		let endColumn = visibleRAnge.endColumn;
		for (let i = 0, len = hiddenAreAs.length; i < len; i++) {
			const hiddenStArtLineNumber = hiddenAreAs[i].stArtLineNumber;
			const hiddenEndLineNumber = hiddenAreAs[i].endLineNumber;

			if (hiddenEndLineNumber < stArtLineNumber) {
				continue;
			}
			if (hiddenStArtLineNumber > endLineNumber) {
				continue;
			}

			if (stArtLineNumber < hiddenStArtLineNumber) {
				result[resultLen++] = new RAnge(
					stArtLineNumber, stArtColumn,
					hiddenStArtLineNumber - 1, this.model.getLineMAxColumn(hiddenStArtLineNumber - 1)
				);
			}
			stArtLineNumber = hiddenEndLineNumber + 1;
			stArtColumn = 1;
		}

		if (stArtLineNumber < endLineNumber || (stArtLineNumber === endLineNumber && stArtColumn < endColumn)) {
			result[resultLen++] = new RAnge(
				stArtLineNumber, stArtColumn,
				endLineNumber, endColumn
			);
		}

		return result;
	}

	public getCompletelyVisibleViewRAnge(): RAnge {
		const pArtiAlDAtA = this.viewLAyout.getLinesViewportDAtA();
		const stArtViewLineNumber = pArtiAlDAtA.completelyVisibleStArtLineNumber;
		const endViewLineNumber = pArtiAlDAtA.completelyVisibleEndLineNumber;

		return new RAnge(
			stArtViewLineNumber, this.getLineMinColumn(stArtViewLineNumber),
			endViewLineNumber, this.getLineMAxColumn(endViewLineNumber)
		);
	}

	public getCompletelyVisibleViewRAngeAtScrollTop(scrollTop: number): RAnge {
		const pArtiAlDAtA = this.viewLAyout.getLinesViewportDAtAAtScrollTop(scrollTop);
		const stArtViewLineNumber = pArtiAlDAtA.completelyVisibleStArtLineNumber;
		const endViewLineNumber = pArtiAlDAtA.completelyVisibleEndLineNumber;

		return new RAnge(
			stArtViewLineNumber, this.getLineMinColumn(stArtViewLineNumber),
			endViewLineNumber, this.getLineMAxColumn(endViewLineNumber)
		);
	}

	public sAveStAte(): IViewStAte {
		const compAtViewStAte = this.viewLAyout.sAveStAte();

		const scrollTop = compAtViewStAte.scrollTop;
		const firstViewLineNumber = this.viewLAyout.getLineNumberAtVerticAlOffset(scrollTop);
		const firstPosition = this.coordinAtesConverter.convertViewPositionToModelPosition(new Position(firstViewLineNumber, this.getLineMinColumn(firstViewLineNumber)));
		const firstPositionDeltATop = this.viewLAyout.getVerticAlOffsetForLineNumber(firstViewLineNumber) - scrollTop;

		return {
			scrollLeft: compAtViewStAte.scrollLeft,
			firstPosition: firstPosition,
			firstPositionDeltATop: firstPositionDeltATop
		};
	}

	public reduceRestoreStAte(stAte: IViewStAte): { scrollLeft: number; scrollTop: number; } {
		if (typeof stAte.firstPosition === 'undefined') {
			// This is A view stAte seriAlized by An older version
			return this._reduceRestoreStAteCompAtibility(stAte);
		}

		const modelPosition = this.model.vAlidAtePosition(stAte.firstPosition);
		const viewPosition = this.coordinAtesConverter.convertModelPositionToViewPosition(modelPosition);
		const scrollTop = this.viewLAyout.getVerticAlOffsetForLineNumber(viewPosition.lineNumber) - stAte.firstPositionDeltATop;
		return {
			scrollLeft: stAte.scrollLeft,
			scrollTop: scrollTop
		};
	}

	privAte _reduceRestoreStAteCompAtibility(stAte: IViewStAte): { scrollLeft: number; scrollTop: number; } {
		return {
			scrollLeft: stAte.scrollLeft,
			scrollTop: stAte.scrollTopWithoutViewZones!
		};
	}

	privAte getTAbSize(): number {
		return this.model.getOptions().tAbSize;
	}

	public getTextModelOptions(): TextModelResolvedOptions {
		return this.model.getOptions();
	}

	public getLineCount(): number {
		return this._lines.getViewLineCount();
	}

	/**
	 * Gives A hint thAt A lot of requests Are About to come in for these line numbers.
	 */
	public setViewport(stArtLineNumber: number, endLineNumber: number, centeredLineNumber: number): void {
		this._viewportStArtLine = stArtLineNumber;
		let position = this.coordinAtesConverter.convertViewPositionToModelPosition(new Position(stArtLineNumber, this.getLineMinColumn(stArtLineNumber)));
		this._viewportStArtLineTrAckedRAnge = this.model._setTrAckedRAnge(this._viewportStArtLineTrAckedRAnge, new RAnge(position.lineNumber, position.column, position.lineNumber, position.column), TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges);
		const viewportStArtLineTop = this.viewLAyout.getVerticAlOffsetForLineNumber(stArtLineNumber);
		const scrollTop = this.viewLAyout.getCurrentScrollTop();
		this._viewportStArtLineDeltA = scrollTop - viewportStArtLineTop;
	}

	public getActiveIndentGuide(lineNumber: number, minLineNumber: number, mAxLineNumber: number): IActiveIndentGuideInfo {
		return this._lines.getActiveIndentGuide(lineNumber, minLineNumber, mAxLineNumber);
	}

	public getLinesIndentGuides(stArtLineNumber: number, endLineNumber: number): number[] {
		return this._lines.getViewLinesIndentGuides(stArtLineNumber, endLineNumber);
	}

	public getLineContent(lineNumber: number): string {
		return this._lines.getViewLineContent(lineNumber);
	}

	public getLineLength(lineNumber: number): number {
		return this._lines.getViewLineLength(lineNumber);
	}

	public getLineMinColumn(lineNumber: number): number {
		return this._lines.getViewLineMinColumn(lineNumber);
	}

	public getLineMAxColumn(lineNumber: number): number {
		return this._lines.getViewLineMAxColumn(lineNumber);
	}

	public getLineFirstNonWhitespAceColumn(lineNumber: number): number {
		const result = strings.firstNonWhitespAceIndex(this.getLineContent(lineNumber));
		if (result === -1) {
			return 0;
		}
		return result + 1;
	}

	public getLineLAstNonWhitespAceColumn(lineNumber: number): number {
		const result = strings.lAstNonWhitespAceIndex(this.getLineContent(lineNumber));
		if (result === -1) {
			return 0;
		}
		return result + 2;
	}

	public getDecorAtionsInViewport(visibleRAnge: RAnge): ViewModelDecorAtion[] {
		return this._decorAtions.getDecorAtionsViewportDAtA(visibleRAnge).decorAtions;
	}

	public getViewLineRenderingDAtA(visibleRAnge: RAnge, lineNumber: number): ViewLineRenderingDAtA {
		let mightContAinRTL = this.model.mightContAinRTL();
		let mightContAinNonBAsicASCII = this.model.mightContAinNonBAsicASCII();
		let tAbSize = this.getTAbSize();
		let lineDAtA = this._lines.getViewLineDAtA(lineNumber);
		let AllInlineDecorAtions = this._decorAtions.getDecorAtionsViewportDAtA(visibleRAnge).inlineDecorAtions;
		let inlineDecorAtions = AllInlineDecorAtions[lineNumber - visibleRAnge.stArtLineNumber];

		return new ViewLineRenderingDAtA(
			lineDAtA.minColumn,
			lineDAtA.mAxColumn,
			lineDAtA.content,
			lineDAtA.continuesWithWrAppedLine,
			mightContAinRTL,
			mightContAinNonBAsicASCII,
			lineDAtA.tokens,
			inlineDecorAtions,
			tAbSize,
			lineDAtA.stArtVisibleColumn
		);
	}

	public getViewLineDAtA(lineNumber: number): ViewLineDAtA {
		return this._lines.getViewLineDAtA(lineNumber);
	}

	public getMinimApLinesRenderingDAtA(stArtLineNumber: number, endLineNumber: number, needed: booleAn[]): MinimApLinesRenderingDAtA {
		let result = this._lines.getViewLinesDAtA(stArtLineNumber, endLineNumber, needed);
		return new MinimApLinesRenderingDAtA(
			this.getTAbSize(),
			result
		);
	}

	public getAllOverviewRulerDecorAtions(theme: EditorTheme): IOverviewRulerDecorAtions {
		return this._lines.getAllOverviewRulerDecorAtions(this._editorId, filterVAlidAtionDecorAtions(this._configurAtion.options), theme);
	}

	public invAlidAteOverviewRulerColorCAche(): void {
		const decorAtions = this.model.getOverviewRulerDecorAtions();
		for (const decorAtion of decorAtions) {
			const opts = <ModelDecorAtionOverviewRulerOptions>decorAtion.options.overviewRuler;
			if (opts) {
				opts.invAlidAteCAchedColor();
			}
		}
	}

	public invAlidAteMinimApColorCAche(): void {
		const decorAtions = this.model.getAllDecorAtions();
		for (const decorAtion of decorAtions) {
			const opts = <ModelDecorAtionMinimApOptions>decorAtion.options.minimAp;
			if (opts) {
				opts.invAlidAteCAchedColor();
			}
		}
	}

	public getVAlueInRAnge(rAnge: RAnge, eol: EndOfLinePreference): string {
		const modelRAnge = this.coordinAtesConverter.convertViewRAngeToModelRAnge(rAnge);
		return this.model.getVAlueInRAnge(modelRAnge, eol);
	}

	public getModelLineMAxColumn(modelLineNumber: number): number {
		return this.model.getLineMAxColumn(modelLineNumber);
	}

	public vAlidAteModelPosition(position: IPosition): Position {
		return this.model.vAlidAtePosition(position);
	}

	public vAlidAteModelRAnge(rAnge: IRAnge): RAnge {
		return this.model.vAlidAteRAnge(rAnge);
	}

	public deduceModelPositionRelAtiveToViewPosition(viewAnchorPosition: Position, deltAOffset: number, lineFeedCnt: number): Position {
		const modelAnchor = this.coordinAtesConverter.convertViewPositionToModelPosition(viewAnchorPosition);
		if (this.model.getEOL().length === 2) {
			// This model uses CRLF, so the deltA must tAke thAt into Account
			if (deltAOffset < 0) {
				deltAOffset -= lineFeedCnt;
			} else {
				deltAOffset += lineFeedCnt;
			}
		}

		const modelAnchorOffset = this.model.getOffsetAt(modelAnchor);
		const resultOffset = modelAnchorOffset + deltAOffset;
		return this.model.getPositionAt(resultOffset);
	}

	public getEOL(): string {
		return this.model.getEOL();
	}

	public getPlAinTextToCopy(modelRAnges: RAnge[], emptySelectionClipboArd: booleAn, forceCRLF: booleAn): string | string[] {
		const newLineChArActer = forceCRLF ? '\r\n' : this.model.getEOL();

		modelRAnges = modelRAnges.slice(0);
		modelRAnges.sort(RAnge.compAreRAngesUsingStArts);

		let hAsEmptyRAnge = fAlse;
		let hAsNonEmptyRAnge = fAlse;
		for (const rAnge of modelRAnges) {
			if (rAnge.isEmpty()) {
				hAsEmptyRAnge = true;
			} else {
				hAsNonEmptyRAnge = true;
			}
		}

		if (!hAsNonEmptyRAnge) {
			// All rAnges Are empty
			if (!emptySelectionClipboArd) {
				return '';
			}

			const modelLineNumbers = modelRAnges.mAp((r) => r.stArtLineNumber);

			let result = '';
			for (let i = 0; i < modelLineNumbers.length; i++) {
				if (i > 0 && modelLineNumbers[i - 1] === modelLineNumbers[i]) {
					continue;
				}
				result += this.model.getLineContent(modelLineNumbers[i]) + newLineChArActer;
			}
			return result;
		}

		if (hAsEmptyRAnge && emptySelectionClipboArd) {
			// mixed empty selections And non-empty selections
			let result: string[] = [];
			let prevModelLineNumber = 0;
			for (const modelRAnge of modelRAnges) {
				const modelLineNumber = modelRAnge.stArtLineNumber;
				if (modelRAnge.isEmpty()) {
					if (modelLineNumber !== prevModelLineNumber) {
						result.push(this.model.getLineContent(modelLineNumber));
					}
				} else {
					result.push(this.model.getVAlueInRAnge(modelRAnge, forceCRLF ? EndOfLinePreference.CRLF : EndOfLinePreference.TextDefined));
				}
				prevModelLineNumber = modelLineNumber;
			}
			return result.length === 1 ? result[0] : result;
		}

		let result: string[] = [];
		for (const modelRAnge of modelRAnges) {
			if (!modelRAnge.isEmpty()) {
				result.push(this.model.getVAlueInRAnge(modelRAnge, forceCRLF ? EndOfLinePreference.CRLF : EndOfLinePreference.TextDefined));
			}
		}
		return result.length === 1 ? result[0] : result;
	}

	public getRichTextToCopy(modelRAnges: RAnge[], emptySelectionClipboArd: booleAn): { html: string, mode: string } | null {
		const lAnguAgeId = this.model.getLAnguAgeIdentifier();
		if (lAnguAgeId.id === LAnguAgeId.PlAinText) {
			return null;
		}

		if (modelRAnges.length !== 1) {
			// no multiple selection support At this time
			return null;
		}

		let rAnge = modelRAnges[0];
		if (rAnge.isEmpty()) {
			if (!emptySelectionClipboArd) {
				// nothing to copy
				return null;
			}
			const lineNumber = rAnge.stArtLineNumber;
			rAnge = new RAnge(lineNumber, this.model.getLineMinColumn(lineNumber), lineNumber, this.model.getLineMAxColumn(lineNumber));
		}

		const fontInfo = this._configurAtion.options.get(EditorOption.fontInfo);
		const colorMAp = this._getColorMAp();
		const fontFAmily = fontInfo.fontFAmily === EDITOR_FONT_DEFAULTS.fontFAmily ? fontInfo.fontFAmily : `'${fontInfo.fontFAmily}', ${EDITOR_FONT_DEFAULTS.fontFAmily}`;

		return {
			mode: lAnguAgeId.lAnguAge,
			html: (
				`<div style="`
				+ `color: ${colorMAp[ColorId.DefAultForeground]};`
				+ `bAckground-color: ${colorMAp[ColorId.DefAultBAckground]};`
				+ `font-fAmily: ${fontFAmily};`
				+ `font-weight: ${fontInfo.fontWeight};`
				+ `font-size: ${fontInfo.fontSize}px;`
				+ `line-height: ${fontInfo.lineHeight}px;`
				+ `white-spAce: pre;`
				+ `">`
				+ this._getHTMLToCopy(rAnge, colorMAp)
				+ '</div>'
			)
		};
	}

	privAte _getHTMLToCopy(modelRAnge: RAnge, colorMAp: string[]): string {
		const stArtLineNumber = modelRAnge.stArtLineNumber;
		const stArtColumn = modelRAnge.stArtColumn;
		const endLineNumber = modelRAnge.endLineNumber;
		const endColumn = modelRAnge.endColumn;

		const tAbSize = this.getTAbSize();

		let result = '';

		for (let lineNumber = stArtLineNumber; lineNumber <= endLineNumber; lineNumber++) {
			const lineTokens = this.model.getLineTokens(lineNumber);
			const lineContent = lineTokens.getLineContent();
			const stArtOffset = (lineNumber === stArtLineNumber ? stArtColumn - 1 : 0);
			const endOffset = (lineNumber === endLineNumber ? endColumn - 1 : lineContent.length);

			if (lineContent === '') {
				result += '<br>';
			} else {
				result += tokenizeLineToHTML(lineContent, lineTokens.inflAte(), colorMAp, stArtOffset, endOffset, tAbSize, plAtform.isWindows);
			}
		}

		return result;
	}

	privAte _getColorMAp(): string[] {
		let colorMAp = TokenizAtionRegistry.getColorMAp();
		let result: string[] = ['#000000'];
		if (colorMAp) {
			for (let i = 1, len = colorMAp.length; i < len; i++) {
				result[i] = Color.FormAt.CSS.formAtHex(colorMAp[i]);
			}
		}
		return result;
	}

	//#region model

	public pushStAckElement(): void {
		this.model.pushStAckElement();
	}

	//#endregion

	//#region cursor operAtions

	public getPrimAryCursorStAte(): CursorStAte {
		return this._cursor.getPrimAryCursorStAte();
	}
	public getLAstAddedCursorIndex(): number {
		return this._cursor.getLAstAddedCursorIndex();
	}
	public getCursorStAtes(): CursorStAte[] {
		return this._cursor.getCursorStAtes();
	}
	public setCursorStAtes(source: string | null | undefined, reAson: CursorChAngeReAson, stAtes: PArtiAlCursorStAte[] | null): void {
		this._withViewEventsCollector(eventsCollector => this._cursor.setStAtes(eventsCollector, source, reAson, stAtes));
	}
	public getCursorColumnSelectDAtA(): IColumnSelectDAtA {
		return this._cursor.getCursorColumnSelectDAtA();
	}
	public setCursorColumnSelectDAtA(columnSelectDAtA: IColumnSelectDAtA): void {
		this._cursor.setCursorColumnSelectDAtA(columnSelectDAtA);
	}
	public getPrevEditOperAtionType(): EditOperAtionType {
		return this._cursor.getPrevEditOperAtionType();
	}
	public setPrevEditOperAtionType(type: EditOperAtionType): void {
		this._cursor.setPrevEditOperAtionType(type);
	}
	public getSelection(): Selection {
		return this._cursor.getSelection();
	}
	public getSelections(): Selection[] {
		return this._cursor.getSelections();
	}
	public getPosition(): Position {
		return this._cursor.getPrimAryCursorStAte().modelStAte.position;
	}
	public setSelections(source: string | null | undefined, selections: reAdonly ISelection[]): void {
		this._withViewEventsCollector(eventsCollector => this._cursor.setSelections(eventsCollector, source, selections));
	}
	public sAveCursorStAte(): ICursorStAte[] {
		return this._cursor.sAveStAte();
	}
	public restoreCursorStAte(stAtes: ICursorStAte[]): void {
		this._withViewEventsCollector(eventsCollector => this._cursor.restoreStAte(eventsCollector, stAtes));
	}

	privAte _executeCursorEdit(cAllbAck: (eventsCollector: ViewModelEventsCollector) => void): void {
		if (this._cursor.context.cursorConfig.reAdOnly) {
			// we cAnnot edit when reAd only...
			this._eventDispAtcher.emitOutgoingEvent(new ReAdOnlyEditAttemptEvent());
			return;
		}
		this._withViewEventsCollector(cAllbAck);
	}
	public executeEdits(source: string | null | undefined, edits: IIdentifiedSingleEditOperAtion[], cursorStAteComputer: ICursorStAteComputer): void {
		this._executeCursorEdit(eventsCollector => this._cursor.executeEdits(eventsCollector, source, edits, cursorStAteComputer));
	}
	public stArtComposition(): void {
		this._cursor.setIsDoingComposition(true);
		this._executeCursorEdit(eventsCollector => this._cursor.stArtComposition(eventsCollector));
	}
	public endComposition(source?: string | null | undefined): void {
		this._cursor.setIsDoingComposition(fAlse);
		this._executeCursorEdit(eventsCollector => this._cursor.endComposition(eventsCollector, source));
	}
	public type(text: string, source?: string | null | undefined): void {
		this._executeCursorEdit(eventsCollector => this._cursor.type(eventsCollector, text, source));
	}
	public replAcePreviousChAr(text: string, replAceChArCnt: number, source?: string | null | undefined): void {
		this._executeCursorEdit(eventsCollector => this._cursor.replAcePreviousChAr(eventsCollector, text, replAceChArCnt, source));
	}
	public pAste(text: string, pAsteOnNewLine: booleAn, multicursorText?: string[] | null | undefined, source?: string | null | undefined): void {
		this._executeCursorEdit(eventsCollector => this._cursor.pAste(eventsCollector, text, pAsteOnNewLine, multicursorText, source));
	}
	public cut(source?: string | null | undefined): void {
		this._executeCursorEdit(eventsCollector => this._cursor.cut(eventsCollector, source));
	}
	public executeCommAnd(commAnd: ICommAnd, source?: string | null | undefined): void {
		this._executeCursorEdit(eventsCollector => this._cursor.executeCommAnd(eventsCollector, commAnd, source));
	}
	public executeCommAnds(commAnds: ICommAnd[], source?: string | null | undefined): void {
		this._executeCursorEdit(eventsCollector => this._cursor.executeCommAnds(eventsCollector, commAnds, source));
	}
	public reveAlPrimAryCursor(source: string | null | undefined, reveAlHorizontAl: booleAn): void {
		this._withViewEventsCollector(eventsCollector => this._cursor.reveAlPrimAry(eventsCollector, source, reveAlHorizontAl, ScrollType.Smooth));
	}
	public reveAlTopMostCursor(source: string | null | undefined): void {
		const viewPosition = this._cursor.getTopMostViewPosition();
		const viewRAnge = new RAnge(viewPosition.lineNumber, viewPosition.column, viewPosition.lineNumber, viewPosition.column);
		this._withViewEventsCollector(eventsCollector => eventsCollector.emitViewEvent(new viewEvents.ViewReveAlRAngeRequestEvent(source, viewRAnge, null, viewEvents.VerticAlReveAlType.Simple, true, ScrollType.Smooth)));
	}
	public reveAlBottomMostCursor(source: string | null | undefined): void {
		const viewPosition = this._cursor.getBottomMostViewPosition();
		const viewRAnge = new RAnge(viewPosition.lineNumber, viewPosition.column, viewPosition.lineNumber, viewPosition.column);
		this._withViewEventsCollector(eventsCollector => eventsCollector.emitViewEvent(new viewEvents.ViewReveAlRAngeRequestEvent(source, viewRAnge, null, viewEvents.VerticAlReveAlType.Simple, true, ScrollType.Smooth)));
	}
	public reveAlRAnge(source: string | null | undefined, reveAlHorizontAl: booleAn, viewRAnge: RAnge, verticAlType: viewEvents.VerticAlReveAlType, scrollType: ScrollType): void {
		this._withViewEventsCollector(eventsCollector => eventsCollector.emitViewEvent(new viewEvents.ViewReveAlRAngeRequestEvent(source, viewRAnge, null, verticAlType, reveAlHorizontAl, scrollType)));
	}

	//#endregion

	//#region viewLAyout
	public getVerticAlOffsetForLineNumber(viewLineNumber: number): number {
		return this.viewLAyout.getVerticAlOffsetForLineNumber(viewLineNumber);
	}
	public getScrollTop(): number {
		return this.viewLAyout.getCurrentScrollTop();
	}
	public setScrollTop(newScrollTop: number, scrollType: ScrollType): void {
		this.viewLAyout.setScrollPosition({ scrollTop: newScrollTop }, scrollType);
	}
	public setScrollPosition(position: INewScrollPosition, type: ScrollType): void {
		this.viewLAyout.setScrollPosition(position, type);
	}
	public deltAScrollNow(deltAScrollLeft: number, deltAScrollTop: number): void {
		this.viewLAyout.deltAScrollNow(deltAScrollLeft, deltAScrollTop);
	}
	public chAngeWhitespAce(cAllbAck: (Accessor: IWhitespAceChAngeAccessor) => void): void {
		const hAdAChAnge = this.viewLAyout.chAngeWhitespAce(cAllbAck);
		if (hAdAChAnge) {
			this._eventDispAtcher.emitSingleViewEvent(new viewEvents.ViewZonesChAngedEvent());
			this._eventDispAtcher.emitOutgoingEvent(new ViewZonesChAngedEvent());
		}
	}
	public setMAxLineWidth(mAxLineWidth: number): void {
		this.viewLAyout.setMAxLineWidth(mAxLineWidth);
	}
	//#endregion

	privAte _withViewEventsCollector(cAllbAck: (eventsCollector: ViewModelEventsCollector) => void): void {
		try {
			const eventsCollector = this._eventDispAtcher.beginEmitViewEvents();
			cAllbAck(eventsCollector);
		} finAlly {
			this._eventDispAtcher.endEmitViewEvents();
		}
	}
}
