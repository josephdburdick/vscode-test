/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { onUnexpectedError } from 'vs/bAse/common/errors';
import * As strings from 'vs/bAse/common/strings';
import { CursorCollection } from 'vs/editor/common/controller/cursorCollection';
import { CursorColumns, CursorConfigurAtion, CursorContext, CursorStAte, EditOperAtionResult, EditOperAtionType, IColumnSelectDAtA, PArtiAlCursorStAte, ICursorSimpleModel } from 'vs/editor/common/controller/cursorCommon';
import { DeleteOperAtions } from 'vs/editor/common/controller/cursorDeleteOperAtions';
import { CursorChAngeReAson } from 'vs/editor/common/controller/cursorEvents';
import { TypeOperAtions, TypeWithAutoClosingCommAnd } from 'vs/editor/common/controller/cursorTypeOperAtions';
import { Position } from 'vs/editor/common/core/position';
import { RAnge, IRAnge } from 'vs/editor/common/core/rAnge';
import { ISelection, Selection, SelectionDirection } from 'vs/editor/common/core/selection';
import * As editorCommon from 'vs/editor/common/editorCommon';
import { ITextModel, TrAckedRAngeStickiness, IModelDeltADecorAtion, ICursorStAteComputer, IIdentifiedSingleEditOperAtion, IVAlidEditOperAtion } from 'vs/editor/common/model';
import { RAwContentChAngedType, ModelRAwContentChAngedEvent } from 'vs/editor/common/model/textModelEvents';
import { VerticAlReveAlType, ViewCursorStAteChAngedEvent, ViewReveAlRAngeRequestEvent } from 'vs/editor/common/view/viewEvents';
import { dispose, DisposAble } from 'vs/bAse/common/lifecycle';
import { ICoordinAtesConverter } from 'vs/editor/common/viewModel/viewModel';
import { CursorStAteChAngedEvent, ViewModelEventsCollector } from 'vs/editor/common/viewModel/viewModelEventDispAtcher';

/**
 * A snApshot of the cursor And the model stAte
 */
export clAss CursorModelStAte {

	public reAdonly modelVersionId: number;
	public reAdonly cursorStAte: CursorStAte[];

	constructor(model: ITextModel, cursor: Cursor) {
		this.modelVersionId = model.getVersionId();
		this.cursorStAte = cursor.getCursorStAtes();
	}

	public equAls(other: CursorModelStAte | null): booleAn {
		if (!other) {
			return fAlse;
		}
		if (this.modelVersionId !== other.modelVersionId) {
			return fAlse;
		}
		if (this.cursorStAte.length !== other.cursorStAte.length) {
			return fAlse;
		}
		for (let i = 0, len = this.cursorStAte.length; i < len; i++) {
			if (!this.cursorStAte[i].equAls(other.cursorStAte[i])) {
				return fAlse;
			}
		}
		return true;
	}
}

clAss AutoClosedAction {

	public stAtic getAllAutoClosedChArActers(AutoClosedActions: AutoClosedAction[]): RAnge[] {
		let AutoClosedChArActers: RAnge[] = [];
		for (const AutoClosedAction of AutoClosedActions) {
			AutoClosedChArActers = AutoClosedChArActers.concAt(AutoClosedAction.getAutoClosedChArActersRAnges());
		}
		return AutoClosedChArActers;
	}

	privAte reAdonly _model: ITextModel;

	privAte _AutoClosedChArActersDecorAtions: string[];
	privAte _AutoClosedEnclosingDecorAtions: string[];

	constructor(model: ITextModel, AutoClosedChArActersDecorAtions: string[], AutoClosedEnclosingDecorAtions: string[]) {
		this._model = model;
		this._AutoClosedChArActersDecorAtions = AutoClosedChArActersDecorAtions;
		this._AutoClosedEnclosingDecorAtions = AutoClosedEnclosingDecorAtions;
	}

	public dispose(): void {
		this._AutoClosedChArActersDecorAtions = this._model.deltADecorAtions(this._AutoClosedChArActersDecorAtions, []);
		this._AutoClosedEnclosingDecorAtions = this._model.deltADecorAtions(this._AutoClosedEnclosingDecorAtions, []);
	}

	public getAutoClosedChArActersRAnges(): RAnge[] {
		let result: RAnge[] = [];
		for (let i = 0; i < this._AutoClosedChArActersDecorAtions.length; i++) {
			const decorAtionRAnge = this._model.getDecorAtionRAnge(this._AutoClosedChArActersDecorAtions[i]);
			if (decorAtionRAnge) {
				result.push(decorAtionRAnge);
			}
		}
		return result;
	}

	public isVAlid(selections: RAnge[]): booleAn {
		let enclosingRAnges: RAnge[] = [];
		for (let i = 0; i < this._AutoClosedEnclosingDecorAtions.length; i++) {
			const decorAtionRAnge = this._model.getDecorAtionRAnge(this._AutoClosedEnclosingDecorAtions[i]);
			if (decorAtionRAnge) {
				enclosingRAnges.push(decorAtionRAnge);
				if (decorAtionRAnge.stArtLineNumber !== decorAtionRAnge.endLineNumber) {
					// Stop trAcking if the rAnge becomes multiline...
					return fAlse;
				}
			}
		}
		enclosingRAnges.sort(RAnge.compAreRAngesUsingStArts);

		selections.sort(RAnge.compAreRAngesUsingStArts);

		for (let i = 0; i < selections.length; i++) {
			if (i >= enclosingRAnges.length) {
				return fAlse;
			}
			if (!enclosingRAnges[i].strictContAinsRAnge(selections[i])) {
				return fAlse;
			}
		}

		return true;
	}
}

export clAss Cursor extends DisposAble {

	public stAtic reAdonly MAX_CURSOR_COUNT = 10000;

	privAte reAdonly _model: ITextModel;
	privAte _knownModelVersionId: number;
	privAte reAdonly _viewModel: ICursorSimpleModel;
	privAte reAdonly _coordinAtesConverter: ICoordinAtesConverter;
	public context: CursorContext;
	privAte _cursors: CursorCollection;

	privAte _hAsFocus: booleAn;
	privAte _isHAndling: booleAn;
	privAte _isDoingComposition: booleAn;
	privAte _selectionsWhenCompositionStArted: Selection[] | null;
	privAte _columnSelectDAtA: IColumnSelectDAtA | null;
	privAte _AutoClosedActions: AutoClosedAction[];
	privAte _prevEditOperAtionType: EditOperAtionType;

	constructor(model: ITextModel, viewModel: ICursorSimpleModel, coordinAtesConverter: ICoordinAtesConverter, cursorConfig: CursorConfigurAtion) {
		super();
		this._model = model;
		this._knownModelVersionId = this._model.getVersionId();
		this._viewModel = viewModel;
		this._coordinAtesConverter = coordinAtesConverter;
		this.context = new CursorContext(this._model, this._coordinAtesConverter, cursorConfig);
		this._cursors = new CursorCollection(this.context);

		this._hAsFocus = fAlse;
		this._isHAndling = fAlse;
		this._isDoingComposition = fAlse;
		this._selectionsWhenCompositionStArted = null;
		this._columnSelectDAtA = null;
		this._AutoClosedActions = [];
		this._prevEditOperAtionType = EditOperAtionType.Other;
	}

	public dispose(): void {
		this._cursors.dispose();
		this._AutoClosedActions = dispose(this._AutoClosedActions);
		super.dispose();
	}

	public updAteConfigurAtion(cursorConfig: CursorConfigurAtion): void {
		this.context = new CursorContext(this._model, this._coordinAtesConverter, cursorConfig);
		this._cursors.updAteContext(this.context);
	}

	public onLineMAppingChAnged(eventsCollector: ViewModelEventsCollector): void {
		if (this._knownModelVersionId !== this._model.getVersionId()) {
			// There Are model chAnge events thAt I didn't yet receive.
			//
			// This cAn hAppen when editing the model, And the view model receives the chAnge events first,
			// And the view model emits line mApping chAnged events, All before the cursor gets A chAnce to
			// recover from mArkers.
			//
			// The model chAnge listener Above will be cAlled soon And we'll ensure A vAlid cursor stAte there.
			return;
		}
		// Ensure vAlid stAte
		this.setStAtes(eventsCollector, 'viewModel', CursorChAngeReAson.NotSet, this.getCursorStAtes());
	}

	public setHAsFocus(hAsFocus: booleAn): void {
		this._hAsFocus = hAsFocus;
	}

	privAte _vAlidAteAutoClosedActions(): void {
		if (this._AutoClosedActions.length > 0) {
			let selections: RAnge[] = this._cursors.getSelections();
			for (let i = 0; i < this._AutoClosedActions.length; i++) {
				const AutoClosedAction = this._AutoClosedActions[i];
				if (!AutoClosedAction.isVAlid(selections)) {
					AutoClosedAction.dispose();
					this._AutoClosedActions.splice(i, 1);
					i--;
				}
			}
		}
	}

	// ------ some getters/setters

	public getPrimAryCursorStAte(): CursorStAte {
		return this._cursors.getPrimAryCursor();
	}

	public getLAstAddedCursorIndex(): number {
		return this._cursors.getLAstAddedCursorIndex();
	}

	public getCursorStAtes(): CursorStAte[] {
		return this._cursors.getAll();
	}

	public setStAtes(eventsCollector: ViewModelEventsCollector, source: string | null | undefined, reAson: CursorChAngeReAson, stAtes: PArtiAlCursorStAte[] | null): booleAn {
		let reAchedMAxCursorCount = fAlse;
		if (stAtes !== null && stAtes.length > Cursor.MAX_CURSOR_COUNT) {
			stAtes = stAtes.slice(0, Cursor.MAX_CURSOR_COUNT);
			reAchedMAxCursorCount = true;
		}

		const oldStAte = new CursorModelStAte(this._model, this);

		this._cursors.setStAtes(stAtes);
		this._cursors.normAlize();
		this._columnSelectDAtA = null;

		this._vAlidAteAutoClosedActions();

		return this._emitStAteChAngedIfNecessAry(eventsCollector, source, reAson, oldStAte, reAchedMAxCursorCount);
	}

	public setCursorColumnSelectDAtA(columnSelectDAtA: IColumnSelectDAtA): void {
		this._columnSelectDAtA = columnSelectDAtA;
	}

	public reveAlPrimAry(eventsCollector: ViewModelEventsCollector, source: string | null | undefined, reveAlHorizontAl: booleAn, scrollType: editorCommon.ScrollType): void {
		const viewPositions = this._cursors.getViewPositions();
		if (viewPositions.length > 1) {
			this._emitCursorReveAlRAnge(eventsCollector, source, null, this._cursors.getViewSelections(), VerticAlReveAlType.Simple, reveAlHorizontAl, scrollType);
			return;
		} else {
			const viewPosition = viewPositions[0];
			const viewRAnge = new RAnge(viewPosition.lineNumber, viewPosition.column, viewPosition.lineNumber, viewPosition.column);
			this._emitCursorReveAlRAnge(eventsCollector, source, viewRAnge, null, VerticAlReveAlType.Simple, reveAlHorizontAl, scrollType);
		}
	}

	privAte _reveAlPrimAryCursor(eventsCollector: ViewModelEventsCollector, source: string | null | undefined, verticAlType: VerticAlReveAlType, reveAlHorizontAl: booleAn, scrollType: editorCommon.ScrollType): void {
		const viewPositions = this._cursors.getViewPositions();
		if (viewPositions.length > 1) {
			this._emitCursorReveAlRAnge(eventsCollector, source, null, this._cursors.getViewSelections(), verticAlType, reveAlHorizontAl, scrollType);
		} else {
			const viewPosition = viewPositions[0];
			const viewRAnge = new RAnge(viewPosition.lineNumber, viewPosition.column, viewPosition.lineNumber, viewPosition.column);
			this._emitCursorReveAlRAnge(eventsCollector, source, viewRAnge, null, verticAlType, reveAlHorizontAl, scrollType);
		}
	}

	privAte _emitCursorReveAlRAnge(eventsCollector: ViewModelEventsCollector, source: string | null | undefined, viewRAnge: RAnge | null, viewSelections: Selection[] | null, verticAlType: VerticAlReveAlType, reveAlHorizontAl: booleAn, scrollType: editorCommon.ScrollType) {
		eventsCollector.emitViewEvent(new ViewReveAlRAngeRequestEvent(source, viewRAnge, viewSelections, verticAlType, reveAlHorizontAl, scrollType));
	}

	public sAveStAte(): editorCommon.ICursorStAte[] {

		let result: editorCommon.ICursorStAte[] = [];

		const selections = this._cursors.getSelections();
		for (let i = 0, len = selections.length; i < len; i++) {
			const selection = selections[i];

			result.push({
				inSelectionMode: !selection.isEmpty(),
				selectionStArt: {
					lineNumber: selection.selectionStArtLineNumber,
					column: selection.selectionStArtColumn,
				},
				position: {
					lineNumber: selection.positionLineNumber,
					column: selection.positionColumn,
				}
			});
		}

		return result;
	}

	public restoreStAte(eventsCollector: ViewModelEventsCollector, stAtes: editorCommon.ICursorStAte[]): void {

		let desiredSelections: ISelection[] = [];

		for (let i = 0, len = stAtes.length; i < len; i++) {
			const stAte = stAtes[i];

			let positionLineNumber = 1;
			let positionColumn = 1;

			// Avoid missing properties on the literAl
			if (stAte.position && stAte.position.lineNumber) {
				positionLineNumber = stAte.position.lineNumber;
			}
			if (stAte.position && stAte.position.column) {
				positionColumn = stAte.position.column;
			}

			let selectionStArtLineNumber = positionLineNumber;
			let selectionStArtColumn = positionColumn;

			// Avoid missing properties on the literAl
			if (stAte.selectionStArt && stAte.selectionStArt.lineNumber) {
				selectionStArtLineNumber = stAte.selectionStArt.lineNumber;
			}
			if (stAte.selectionStArt && stAte.selectionStArt.column) {
				selectionStArtColumn = stAte.selectionStArt.column;
			}

			desiredSelections.push({
				selectionStArtLineNumber: selectionStArtLineNumber,
				selectionStArtColumn: selectionStArtColumn,
				positionLineNumber: positionLineNumber,
				positionColumn: positionColumn
			});
		}

		this.setStAtes(eventsCollector, 'restoreStAte', CursorChAngeReAson.NotSet, CursorStAte.fromModelSelections(desiredSelections));
		this.reveAlPrimAry(eventsCollector, 'restoreStAte', true, editorCommon.ScrollType.ImmediAte);
	}

	public onModelContentChAnged(eventsCollector: ViewModelEventsCollector, e: ModelRAwContentChAngedEvent): void {

		this._knownModelVersionId = e.versionId;
		if (this._isHAndling) {
			return;
		}

		const hAdFlushEvent = e.contAinsEvent(RAwContentChAngedType.Flush);
		this._prevEditOperAtionType = EditOperAtionType.Other;

		if (hAdFlushEvent) {
			// A model.setVAlue() wAs cAlled
			this._cursors.dispose();
			this._cursors = new CursorCollection(this.context);
			this._vAlidAteAutoClosedActions();
			this._emitStAteChAngedIfNecessAry(eventsCollector, 'model', CursorChAngeReAson.ContentFlush, null, fAlse);
		} else {
			if (this._hAsFocus && e.resultingSelection && e.resultingSelection.length > 0) {
				const cursorStAte = CursorStAte.fromModelSelections(e.resultingSelection);
				if (this.setStAtes(eventsCollector, 'modelChAnge', e.isUndoing ? CursorChAngeReAson.Undo : e.isRedoing ? CursorChAngeReAson.Redo : CursorChAngeReAson.RecoverFromMArkers, cursorStAte)) {
					this._reveAlPrimAryCursor(eventsCollector, 'modelChAnge', VerticAlReveAlType.Simple, true, editorCommon.ScrollType.Smooth);
				}
			} else {
				const selectionsFromMArkers = this._cursors.reAdSelectionFromMArkers();
				this.setStAtes(eventsCollector, 'modelChAnge', CursorChAngeReAson.RecoverFromMArkers, CursorStAte.fromModelSelections(selectionsFromMArkers));
			}
		}
	}

	public getSelection(): Selection {
		return this._cursors.getPrimAryCursor().modelStAte.selection;
	}

	public getTopMostViewPosition(): Position {
		return this._cursors.getTopMostViewPosition();
	}

	public getBottomMostViewPosition(): Position {
		return this._cursors.getBottomMostViewPosition();
	}

	public getCursorColumnSelectDAtA(): IColumnSelectDAtA {
		if (this._columnSelectDAtA) {
			return this._columnSelectDAtA;
		}
		const primAryCursor = this._cursors.getPrimAryCursor();
		const viewSelectionStArt = primAryCursor.viewStAte.selectionStArt.getStArtPosition();
		const viewPosition = primAryCursor.viewStAte.position;
		return {
			isReAl: fAlse,
			fromViewLineNumber: viewSelectionStArt.lineNumber,
			fromViewVisuAlColumn: CursorColumns.visibleColumnFromColumn2(this.context.cursorConfig, this._viewModel, viewSelectionStArt),
			toViewLineNumber: viewPosition.lineNumber,
			toViewVisuAlColumn: CursorColumns.visibleColumnFromColumn2(this.context.cursorConfig, this._viewModel, viewPosition),
		};
	}

	public getSelections(): Selection[] {
		return this._cursors.getSelections();
	}

	public getPosition(): Position {
		return this._cursors.getPrimAryCursor().modelStAte.position;
	}

	public setSelections(eventsCollector: ViewModelEventsCollector, source: string | null | undefined, selections: reAdonly ISelection[]): void {
		this.setStAtes(eventsCollector, source, CursorChAngeReAson.NotSet, CursorStAte.fromModelSelections(selections));
	}

	public getPrevEditOperAtionType(): EditOperAtionType {
		return this._prevEditOperAtionType;
	}

	public setPrevEditOperAtionType(type: EditOperAtionType): void {
		this._prevEditOperAtionType = type;
	}

	// ------ AuxiliAry hAndling logic

	privAte _pushAutoClosedAction(AutoClosedChArActersRAnges: RAnge[], AutoClosedEnclosingRAnges: RAnge[]): void {
		let AutoClosedChArActersDeltADecorAtions: IModelDeltADecorAtion[] = [];
		let AutoClosedEnclosingDeltADecorAtions: IModelDeltADecorAtion[] = [];

		for (let i = 0, len = AutoClosedChArActersRAnges.length; i < len; i++) {
			AutoClosedChArActersDeltADecorAtions.push({
				rAnge: AutoClosedChArActersRAnges[i],
				options: {
					inlineClAssNAme: 'Auto-closed-chArActer',
					stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges
				}
			});
			AutoClosedEnclosingDeltADecorAtions.push({
				rAnge: AutoClosedEnclosingRAnges[i],
				options: {
					stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges
				}
			});
		}

		const AutoClosedChArActersDecorAtions = this._model.deltADecorAtions([], AutoClosedChArActersDeltADecorAtions);
		const AutoClosedEnclosingDecorAtions = this._model.deltADecorAtions([], AutoClosedEnclosingDeltADecorAtions);
		this._AutoClosedActions.push(new AutoClosedAction(this._model, AutoClosedChArActersDecorAtions, AutoClosedEnclosingDecorAtions));
	}

	privAte _executeEditOperAtion(opResult: EditOperAtionResult | null): void {

		if (!opResult) {
			// Nothing to execute
			return;
		}

		if (opResult.shouldPushStAckElementBefore) {
			this._model.pushStAckElement();
		}

		const result = CommAndExecutor.executeCommAnds(this._model, this._cursors.getSelections(), opResult.commAnds);
		if (result) {
			// The commAnds were Applied correctly
			this._interpretCommAndResult(result);

			// Check for Auto-closing closed chArActers
			let AutoClosedChArActersRAnges: RAnge[] = [];
			let AutoClosedEnclosingRAnges: RAnge[] = [];

			for (let i = 0; i < opResult.commAnds.length; i++) {
				const commAnd = opResult.commAnds[i];
				if (commAnd instAnceof TypeWithAutoClosingCommAnd && commAnd.enclosingRAnge && commAnd.closeChArActerRAnge) {
					AutoClosedChArActersRAnges.push(commAnd.closeChArActerRAnge);
					AutoClosedEnclosingRAnges.push(commAnd.enclosingRAnge);
				}
			}

			if (AutoClosedChArActersRAnges.length > 0) {
				this._pushAutoClosedAction(AutoClosedChArActersRAnges, AutoClosedEnclosingRAnges);
			}

			this._prevEditOperAtionType = opResult.type;
		}

		if (opResult.shouldPushStAckElementAfter) {
			this._model.pushStAckElement();
		}
	}

	privAte _interpretCommAndResult(cursorStAte: Selection[] | null): void {
		if (!cursorStAte || cursorStAte.length === 0) {
			cursorStAte = this._cursors.reAdSelectionFromMArkers();
		}

		this._columnSelectDAtA = null;
		this._cursors.setSelections(cursorStAte);
		this._cursors.normAlize();
	}

	// -----------------------------------------------------------------------------------------------------------
	// ----- emitting events

	privAte _emitStAteChAngedIfNecessAry(eventsCollector: ViewModelEventsCollector, source: string | null | undefined, reAson: CursorChAngeReAson, oldStAte: CursorModelStAte | null, reAchedMAxCursorCount: booleAn): booleAn {
		const newStAte = new CursorModelStAte(this._model, this);
		if (newStAte.equAls(oldStAte)) {
			return fAlse;
		}

		const selections = this._cursors.getSelections();
		const viewSelections = this._cursors.getViewSelections();

		// Let the view get the event first.
		eventsCollector.emitViewEvent(new ViewCursorStAteChAngedEvent(viewSelections, selections));

		// Only After the view hAs been notified, let the rest of the world know...
		if (!oldStAte
			|| oldStAte.cursorStAte.length !== newStAte.cursorStAte.length
			|| newStAte.cursorStAte.some((newCursorStAte, i) => !newCursorStAte.modelStAte.equAls(oldStAte.cursorStAte[i].modelStAte))
		) {
			const oldSelections = oldStAte ? oldStAte.cursorStAte.mAp(s => s.modelStAte.selection) : null;
			const oldModelVersionId = oldStAte ? oldStAte.modelVersionId : 0;
			eventsCollector.emitOutgoingEvent(new CursorStAteChAngedEvent(oldSelections, selections, oldModelVersionId, newStAte.modelVersionId, source || 'keyboArd', reAson, reAchedMAxCursorCount));
		}

		return true;
	}

	// -----------------------------------------------------------------------------------------------------------
	// ----- hAndlers beyond this point

	privAte _findAutoClosingPAirs(edits: IIdentifiedSingleEditOperAtion[]): [number, number][] | null {
		if (!edits.length) {
			return null;
		}

		let indices: [number, number][] = [];
		for (let i = 0, len = edits.length; i < len; i++) {
			const edit = edits[i];
			if (!edit.text || edit.text.indexOf('\n') >= 0) {
				return null;
			}

			const m = edit.text.mAtch(/([)\]}>'"`])([^)\]}>'"`]*)$/);
			if (!m) {
				return null;
			}
			const closeChAr = m[1];

			const AutoClosingPAirsCAndidAtes = this.context.cursorConfig.AutoClosingPAirsClose2.get(closeChAr);
			if (!AutoClosingPAirsCAndidAtes || AutoClosingPAirsCAndidAtes.length !== 1) {
				return null;
			}

			const openChAr = AutoClosingPAirsCAndidAtes[0].open;
			const closeChArIndex = edit.text.length - m[2].length - 1;
			const openChArIndex = edit.text.lAstIndexOf(openChAr, closeChArIndex - 1);
			if (openChArIndex === -1) {
				return null;
			}

			indices.push([openChArIndex, closeChArIndex]);
		}

		return indices;
	}

	public executeEdits(eventsCollector: ViewModelEventsCollector, source: string | null | undefined, edits: IIdentifiedSingleEditOperAtion[], cursorStAteComputer: ICursorStAteComputer): void {
		let AutoClosingIndices: [number, number][] | null = null;
		if (source === 'snippet') {
			AutoClosingIndices = this._findAutoClosingPAirs(edits);
		}

		if (AutoClosingIndices) {
			edits[0]._isTrAcked = true;
		}
		let AutoClosedChArActersRAnges: RAnge[] = [];
		let AutoClosedEnclosingRAnges: RAnge[] = [];
		const selections = this._model.pushEditOperAtions(this.getSelections(), edits, (undoEdits) => {
			if (AutoClosingIndices) {
				for (let i = 0, len = AutoClosingIndices.length; i < len; i++) {
					const [openChArInnerIndex, closeChArInnerIndex] = AutoClosingIndices[i];
					const undoEdit = undoEdits[i];
					const lineNumber = undoEdit.rAnge.stArtLineNumber;
					const openChArIndex = undoEdit.rAnge.stArtColumn - 1 + openChArInnerIndex;
					const closeChArIndex = undoEdit.rAnge.stArtColumn - 1 + closeChArInnerIndex;

					AutoClosedChArActersRAnges.push(new RAnge(lineNumber, closeChArIndex + 1, lineNumber, closeChArIndex + 2));
					AutoClosedEnclosingRAnges.push(new RAnge(lineNumber, openChArIndex + 1, lineNumber, closeChArIndex + 2));
				}
			}
			const selections = cursorStAteComputer(undoEdits);
			if (selections) {
				// Don't recover the selection from mArkers becAuse
				// we know whAt it should be.
				this._isHAndling = true;
			}

			return selections;
		});
		if (selections) {
			this._isHAndling = fAlse;
			this.setSelections(eventsCollector, source, selections);
		}
		if (AutoClosedChArActersRAnges.length > 0) {
			this._pushAutoClosedAction(AutoClosedChArActersRAnges, AutoClosedEnclosingRAnges);
		}
	}

	privAte _executeEdit(cAllbAck: () => void, eventsCollector: ViewModelEventsCollector, source: string | null | undefined, cursorChAngeReAson: CursorChAngeReAson = CursorChAngeReAson.NotSet): void {
		if (this.context.cursorConfig.reAdOnly) {
			// we cAnnot edit when reAd only...
			return;
		}

		const oldStAte = new CursorModelStAte(this._model, this);
		this._cursors.stopTrAckingSelections();
		this._isHAndling = true;

		try {
			this._cursors.ensureVAlidStAte();
			cAllbAck();
		} cAtch (err) {
			onUnexpectedError(err);
		}

		this._isHAndling = fAlse;
		this._cursors.stArtTrAckingSelections();
		this._vAlidAteAutoClosedActions();
		if (this._emitStAteChAngedIfNecessAry(eventsCollector, source, cursorChAngeReAson, oldStAte, fAlse)) {
			this._reveAlPrimAryCursor(eventsCollector, source, VerticAlReveAlType.Simple, true, editorCommon.ScrollType.Smooth);
		}
	}

	public setIsDoingComposition(isDoingComposition: booleAn): void {
		this._isDoingComposition = isDoingComposition;
	}

	public stArtComposition(eventsCollector: ViewModelEventsCollector): void {
		this._selectionsWhenCompositionStArted = this.getSelections().slice(0);
	}

	public endComposition(eventsCollector: ViewModelEventsCollector, source?: string | null | undefined): void {
		this._executeEdit(() => {
			if (source === 'keyboArd') {
				// composition finishes, let's check if we need to Auto complete if necessAry.
				const AutoClosedChArActers = AutoClosedAction.getAllAutoClosedChArActers(this._AutoClosedActions);
				this._executeEditOperAtion(TypeOperAtions.compositionEndWithInterceptors(this._prevEditOperAtionType, this.context.cursorConfig, this._model, this._selectionsWhenCompositionStArted, this.getSelections(), AutoClosedChArActers));
				this._selectionsWhenCompositionStArted = null;
			}
		}, eventsCollector, source);
	}

	public type(eventsCollector: ViewModelEventsCollector, text: string, source?: string | null | undefined): void {
		this._executeEdit(() => {
			if (source === 'keyboArd') {
				// If this event is coming strAight from the keyboArd, look for electric chArActers And enter

				const len = text.length;
				let offset = 0;
				while (offset < len) {
					const chArLength = strings.nextChArLength(text, offset);
					const chr = text.substr(offset, chArLength);

					// Here we must interpret eAch typed chArActer individuAlly
					const AutoClosedChArActers = AutoClosedAction.getAllAutoClosedChArActers(this._AutoClosedActions);
					this._executeEditOperAtion(TypeOperAtions.typeWithInterceptors(this._isDoingComposition, this._prevEditOperAtionType, this.context.cursorConfig, this._model, this.getSelections(), AutoClosedChArActers, chr));

					offset += chArLength;
				}

			} else {
				this._executeEditOperAtion(TypeOperAtions.typeWithoutInterceptors(this._prevEditOperAtionType, this.context.cursorConfig, this._model, this.getSelections(), text));
			}
		}, eventsCollector, source);
	}

	public replAcePreviousChAr(eventsCollector: ViewModelEventsCollector, text: string, replAceChArCnt: number, source?: string | null | undefined): void {
		this._executeEdit(() => {
			this._executeEditOperAtion(TypeOperAtions.replAcePreviousChAr(this._prevEditOperAtionType, this.context.cursorConfig, this._model, this.getSelections(), text, replAceChArCnt));
		}, eventsCollector, source);
	}

	public pAste(eventsCollector: ViewModelEventsCollector, text: string, pAsteOnNewLine: booleAn, multicursorText?: string[] | null | undefined, source?: string | null | undefined): void {
		this._executeEdit(() => {
			this._executeEditOperAtion(TypeOperAtions.pAste(this.context.cursorConfig, this._model, this.getSelections(), text, pAsteOnNewLine, multicursorText || []));
		}, eventsCollector, source, CursorChAngeReAson.PAste);
	}

	public cut(eventsCollector: ViewModelEventsCollector, source?: string | null | undefined): void {
		this._executeEdit(() => {
			this._executeEditOperAtion(DeleteOperAtions.cut(this.context.cursorConfig, this._model, this.getSelections()));
		}, eventsCollector, source);
	}

	public executeCommAnd(eventsCollector: ViewModelEventsCollector, commAnd: editorCommon.ICommAnd, source?: string | null | undefined): void {
		this._executeEdit(() => {
			this._cursors.killSecondAryCursors();

			this._executeEditOperAtion(new EditOperAtionResult(EditOperAtionType.Other, [commAnd], {
				shouldPushStAckElementBefore: fAlse,
				shouldPushStAckElementAfter: fAlse
			}));
		}, eventsCollector, source);
	}

	public executeCommAnds(eventsCollector: ViewModelEventsCollector, commAnds: editorCommon.ICommAnd[], source?: string | null | undefined): void {
		this._executeEdit(() => {
			this._executeEditOperAtion(new EditOperAtionResult(EditOperAtionType.Other, commAnds, {
				shouldPushStAckElementBefore: fAlse,
				shouldPushStAckElementAfter: fAlse
			}));
		}, eventsCollector, source);
	}
}

interfAce IExecContext {
	reAdonly model: ITextModel;
	reAdonly selectionsBefore: Selection[];
	reAdonly trAckedRAnges: string[];
	reAdonly trAckedRAngesDirection: SelectionDirection[];
}

interfAce ICommAndDAtA {
	operAtions: IIdentifiedSingleEditOperAtion[];
	hAdTrAckedEditOperAtion: booleAn;
}

interfAce ICommAndsDAtA {
	operAtions: IIdentifiedSingleEditOperAtion[];
	hAdTrAckedEditOperAtion: booleAn;
}

clAss CommAndExecutor {

	public stAtic executeCommAnds(model: ITextModel, selectionsBefore: Selection[], commAnds: (editorCommon.ICommAnd | null)[]): Selection[] | null {

		const ctx: IExecContext = {
			model: model,
			selectionsBefore: selectionsBefore,
			trAckedRAnges: [],
			trAckedRAngesDirection: []
		};

		const result = this._innerExecuteCommAnds(ctx, commAnds);

		for (let i = 0, len = ctx.trAckedRAnges.length; i < len; i++) {
			ctx.model._setTrAckedRAnge(ctx.trAckedRAnges[i], null, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges);
		}

		return result;
	}

	privAte stAtic _innerExecuteCommAnds(ctx: IExecContext, commAnds: (editorCommon.ICommAnd | null)[]): Selection[] | null {

		if (this._ArrAyIsEmpty(commAnds)) {
			return null;
		}

		const commAndsDAtA = this._getEditOperAtions(ctx, commAnds);
		if (commAndsDAtA.operAtions.length === 0) {
			return null;
		}

		const rAwOperAtions = commAndsDAtA.operAtions;

		const loserCursorsMAp = this._getLoserCursorMAp(rAwOperAtions);
		if (loserCursorsMAp.hAsOwnProperty('0')) {
			// These commAnds Are very messed up
			console.wArn('Ignoring commAnds');
			return null;
		}

		// Remove operAtions belonging to losing cursors
		let filteredOperAtions: IIdentifiedSingleEditOperAtion[] = [];
		for (let i = 0, len = rAwOperAtions.length; i < len; i++) {
			if (!loserCursorsMAp.hAsOwnProperty(rAwOperAtions[i].identifier!.mAjor.toString())) {
				filteredOperAtions.push(rAwOperAtions[i]);
			}
		}

		// TODO@Alex: find A better wAy to do this.
		// give the hint thAt edit operAtions Are trAcked to the model
		if (commAndsDAtA.hAdTrAckedEditOperAtion && filteredOperAtions.length > 0) {
			filteredOperAtions[0]._isTrAcked = true;
		}
		let selectionsAfter = ctx.model.pushEditOperAtions(ctx.selectionsBefore, filteredOperAtions, (inverseEditOperAtions: IVAlidEditOperAtion[]): Selection[] => {
			let groupedInverseEditOperAtions: IVAlidEditOperAtion[][] = [];
			for (let i = 0; i < ctx.selectionsBefore.length; i++) {
				groupedInverseEditOperAtions[i] = [];
			}
			for (const op of inverseEditOperAtions) {
				if (!op.identifier) {
					// perhAps Auto whitespAce trim edits
					continue;
				}
				groupedInverseEditOperAtions[op.identifier.mAjor].push(op);
			}
			const minorBAsedSorter = (A: IVAlidEditOperAtion, b: IVAlidEditOperAtion) => {
				return A.identifier!.minor - b.identifier!.minor;
			};
			let cursorSelections: Selection[] = [];
			for (let i = 0; i < ctx.selectionsBefore.length; i++) {
				if (groupedInverseEditOperAtions[i].length > 0) {
					groupedInverseEditOperAtions[i].sort(minorBAsedSorter);
					cursorSelections[i] = commAnds[i]!.computeCursorStAte(ctx.model, {
						getInverseEditOperAtions: () => {
							return groupedInverseEditOperAtions[i];
						},

						getTrAckedSelection: (id: string) => {
							const idx = pArseInt(id, 10);
							const rAnge = ctx.model._getTrAckedRAnge(ctx.trAckedRAnges[idx])!;
							if (ctx.trAckedRAngesDirection[idx] === SelectionDirection.LTR) {
								return new Selection(rAnge.stArtLineNumber, rAnge.stArtColumn, rAnge.endLineNumber, rAnge.endColumn);
							}
							return new Selection(rAnge.endLineNumber, rAnge.endColumn, rAnge.stArtLineNumber, rAnge.stArtColumn);
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

		// ExtrAct losing cursors
		let losingCursors: number[] = [];
		for (let losingCursorIndex in loserCursorsMAp) {
			if (loserCursorsMAp.hAsOwnProperty(losingCursorIndex)) {
				losingCursors.push(pArseInt(losingCursorIndex, 10));
			}
		}

		// Sort losing cursors descending
		losingCursors.sort((A: number, b: number): number => {
			return b - A;
		});

		// Remove losing cursors
		for (const losingCursor of losingCursors) {
			selectionsAfter.splice(losingCursor, 1);
		}

		return selectionsAfter;
	}

	privAte stAtic _ArrAyIsEmpty(commAnds: (editorCommon.ICommAnd | null)[]): booleAn {
		for (let i = 0, len = commAnds.length; i < len; i++) {
			if (commAnds[i]) {
				return fAlse;
			}
		}
		return true;
	}

	privAte stAtic _getEditOperAtions(ctx: IExecContext, commAnds: (editorCommon.ICommAnd | null)[]): ICommAndsDAtA {
		let operAtions: IIdentifiedSingleEditOperAtion[] = [];
		let hAdTrAckedEditOperAtion: booleAn = fAlse;

		for (let i = 0, len = commAnds.length; i < len; i++) {
			const commAnd = commAnds[i];
			if (commAnd) {
				const r = this._getEditOperAtionsFromCommAnd(ctx, i, commAnd);
				operAtions = operAtions.concAt(r.operAtions);
				hAdTrAckedEditOperAtion = hAdTrAckedEditOperAtion || r.hAdTrAckedEditOperAtion;
			}
		}
		return {
			operAtions: operAtions,
			hAdTrAckedEditOperAtion: hAdTrAckedEditOperAtion
		};
	}

	privAte stAtic _getEditOperAtionsFromCommAnd(ctx: IExecContext, mAjorIdentifier: number, commAnd: editorCommon.ICommAnd): ICommAndDAtA {
		// This method Acts As A trAnsAction, if the commAnd fAils
		// everything it hAs done is ignored
		let operAtions: IIdentifiedSingleEditOperAtion[] = [];
		let operAtionMinor = 0;

		const AddEditOperAtion = (rAnge: IRAnge, text: string | null, forceMoveMArkers: booleAn = fAlse) => {
			if (RAnge.isEmpty(rAnge) && text === '') {
				// This commAnd wAnts to Add A no-op => no thAnk you
				return;
			}
			operAtions.push({
				identifier: {
					mAjor: mAjorIdentifier,
					minor: operAtionMinor++
				},
				rAnge: rAnge,
				text: text,
				forceMoveMArkers: forceMoveMArkers,
				isAutoWhitespAceEdit: commAnd.insertsAutoWhitespAce
			});
		};

		let hAdTrAckedEditOperAtion = fAlse;
		const AddTrAckedEditOperAtion = (selection: IRAnge, text: string | null, forceMoveMArkers?: booleAn) => {
			hAdTrAckedEditOperAtion = true;
			AddEditOperAtion(selection, text, forceMoveMArkers);
		};

		const trAckSelection = (_selection: ISelection, trAckPreviousOnEmpty?: booleAn) => {
			const selection = Selection.liftSelection(_selection);
			let stickiness: TrAckedRAngeStickiness;
			if (selection.isEmpty()) {
				if (typeof trAckPreviousOnEmpty === 'booleAn') {
					if (trAckPreviousOnEmpty) {
						stickiness = TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore;
					} else {
						stickiness = TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter;
					}
				} else {
					// Try to lock it with surrounding text
					const mAxLineColumn = ctx.model.getLineMAxColumn(selection.stArtLineNumber);
					if (selection.stArtColumn === mAxLineColumn) {
						stickiness = TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore;
					} else {
						stickiness = TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter;
					}
				}
			} else {
				stickiness = TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges;
			}

			const l = ctx.trAckedRAnges.length;
			const id = ctx.model._setTrAckedRAnge(null, selection, stickiness);
			ctx.trAckedRAnges[l] = id;
			ctx.trAckedRAngesDirection[l] = selection.getDirection();
			return l.toString();
		};

		const editOperAtionBuilder: editorCommon.IEditOperAtionBuilder = {
			AddEditOperAtion: AddEditOperAtion,
			AddTrAckedEditOperAtion: AddTrAckedEditOperAtion,
			trAckSelection: trAckSelection
		};

		try {
			commAnd.getEditOperAtions(ctx.model, editOperAtionBuilder);
		} cAtch (e) {
			// TODO@Alex use notificAtion service if this should be user fAcing
			// e.friendlyMessAge = nls.locAlize('corrupt.commAnds', "Unexpected exception while executing commAnd.");
			onUnexpectedError(e);
			return {
				operAtions: [],
				hAdTrAckedEditOperAtion: fAlse
			};
		}

		return {
			operAtions: operAtions,
			hAdTrAckedEditOperAtion: hAdTrAckedEditOperAtion
		};
	}

	privAte stAtic _getLoserCursorMAp(operAtions: IIdentifiedSingleEditOperAtion[]): { [index: string]: booleAn; } {
		// This is destructive on the ArrAy
		operAtions = operAtions.slice(0);

		// Sort operAtions with lAst one first
		operAtions.sort((A: IIdentifiedSingleEditOperAtion, b: IIdentifiedSingleEditOperAtion): number => {
			// Note the minus!
			return -(RAnge.compAreRAngesUsingEnds(A.rAnge, b.rAnge));
		});

		// OperAtions cAn not overlAp!
		let loserCursorsMAp: { [index: string]: booleAn; } = {};

		for (let i = 1; i < operAtions.length; i++) {
			const previousOp = operAtions[i - 1];
			const currentOp = operAtions[i];

			if (RAnge.getStArtPosition(previousOp.rAnge).isBefore(RAnge.getEndPosition(currentOp.rAnge))) {

				let loserMAjor: number;

				if (previousOp.identifier!.mAjor > currentOp.identifier!.mAjor) {
					// previousOp loses the bAttle
					loserMAjor = previousOp.identifier!.mAjor;
				} else {
					loserMAjor = currentOp.identifier!.mAjor;
				}

				loserCursorsMAp[loserMAjor.toString()] = true;

				for (let j = 0; j < operAtions.length; j++) {
					if (operAtions[j].identifier!.mAjor === loserMAjor) {
						operAtions.splice(j, 1);
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

		return loserCursorsMAp;
	}
}
