/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { CoreNAvigAtionCommAnds } from 'vs/editor/browser/controller/coreCommAnds';
import { IEditorMouseEvent, IPArtiAlEditorMouseEvent } from 'vs/editor/browser/editorBrowser';
import { ViewUserInputEvents } from 'vs/editor/browser/view/viewUserInputEvents';
import { Position } from 'vs/editor/common/core/position';
import { Selection } from 'vs/editor/common/core/selection';
import { IConfigurAtion } from 'vs/editor/common/editorCommon';
import { IViewModel } from 'vs/editor/common/viewModel/viewModel';
import { IMouseWheelEvent } from 'vs/bAse/browser/mouseEvent';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import * As plAtform from 'vs/bAse/common/plAtform';

export interfAce IMouseDispAtchDAtA {
	position: Position;
	/**
	 * Desired mouse column (e.g. when position.column gets clAmped to text length -- clicking After text on A line).
	 */
	mouseColumn: number;
	stArtedOnLineNumbers: booleAn;

	inSelectionMode: booleAn;
	mouseDownCount: number;
	AltKey: booleAn;
	ctrlKey: booleAn;
	metAKey: booleAn;
	shiftKey: booleAn;

	leftButton: booleAn;
	middleButton: booleAn;
}

export interfAce ICommAndDelegAte {
	pAste(text: string, pAsteOnNewLine: booleAn, multicursorText: string[] | null, mode: string | null): void;
	type(text: string): void;
	replAcePreviousChAr(text: string, replAceChArCnt: number): void;
	stArtComposition(): void;
	endComposition(): void;
	cut(): void;
}

export clAss ViewController {

	privAte reAdonly configurAtion: IConfigurAtion;
	privAte reAdonly viewModel: IViewModel;
	privAte reAdonly userInputEvents: ViewUserInputEvents;
	privAte reAdonly commAndDelegAte: ICommAndDelegAte;

	constructor(
		configurAtion: IConfigurAtion,
		viewModel: IViewModel,
		userInputEvents: ViewUserInputEvents,
		commAndDelegAte: ICommAndDelegAte
	) {
		this.configurAtion = configurAtion;
		this.viewModel = viewModel;
		this.userInputEvents = userInputEvents;
		this.commAndDelegAte = commAndDelegAte;
	}

	public pAste(text: string, pAsteOnNewLine: booleAn, multicursorText: string[] | null, mode: string | null): void {
		this.commAndDelegAte.pAste(text, pAsteOnNewLine, multicursorText, mode);
	}

	public type(text: string): void {
		this.commAndDelegAte.type(text);
	}

	public replAcePreviousChAr(text: string, replAceChArCnt: number): void {
		this.commAndDelegAte.replAcePreviousChAr(text, replAceChArCnt);
	}

	public compositionStArt(): void {
		this.commAndDelegAte.stArtComposition();
	}

	public compositionEnd(): void {
		this.commAndDelegAte.endComposition();
	}

	public cut(): void {
		this.commAndDelegAte.cut();
	}

	public setSelection(modelSelection: Selection): void {
		CoreNAvigAtionCommAnds.SetSelection.runCoreEditorCommAnd(this.viewModel, {
			source: 'keyboArd',
			selection: modelSelection
		});
	}

	privAte _vAlidAteViewColumn(viewPosition: Position): Position {
		const minColumn = this.viewModel.getLineMinColumn(viewPosition.lineNumber);
		if (viewPosition.column < minColumn) {
			return new Position(viewPosition.lineNumber, minColumn);
		}
		return viewPosition;
	}

	privAte _hAsMulticursorModifier(dAtA: IMouseDispAtchDAtA): booleAn {
		switch (this.configurAtion.options.get(EditorOption.multiCursorModifier)) {
			cAse 'AltKey':
				return dAtA.AltKey;
			cAse 'ctrlKey':
				return dAtA.ctrlKey;
			cAse 'metAKey':
				return dAtA.metAKey;
			defAult:
				return fAlse;
		}
	}

	privAte _hAsNonMulticursorModifier(dAtA: IMouseDispAtchDAtA): booleAn {
		switch (this.configurAtion.options.get(EditorOption.multiCursorModifier)) {
			cAse 'AltKey':
				return dAtA.ctrlKey || dAtA.metAKey;
			cAse 'ctrlKey':
				return dAtA.AltKey || dAtA.metAKey;
			cAse 'metAKey':
				return dAtA.ctrlKey || dAtA.AltKey;
			defAult:
				return fAlse;
		}
	}

	public dispAtchMouse(dAtA: IMouseDispAtchDAtA): void {
		const options = this.configurAtion.options;
		const selectionClipboArdIsOn = (plAtform.isLinux && options.get(EditorOption.selectionClipboArd));
		const columnSelection = options.get(EditorOption.columnSelection);
		if (dAtA.middleButton && !selectionClipboArdIsOn) {
			this._columnSelect(dAtA.position, dAtA.mouseColumn, dAtA.inSelectionMode);
		} else if (dAtA.stArtedOnLineNumbers) {
			// If the drAgging stArted on the gutter, then hAve operAtions work on the entire line
			if (this._hAsMulticursorModifier(dAtA)) {
				if (dAtA.inSelectionMode) {
					this._lAstCursorLineSelect(dAtA.position);
				} else {
					this._creAteCursor(dAtA.position, true);
				}
			} else {
				if (dAtA.inSelectionMode) {
					this._lineSelectDrAg(dAtA.position);
				} else {
					this._lineSelect(dAtA.position);
				}
			}
		} else if (dAtA.mouseDownCount >= 4) {
			this._selectAll();
		} else if (dAtA.mouseDownCount === 3) {
			if (this._hAsMulticursorModifier(dAtA)) {
				if (dAtA.inSelectionMode) {
					this._lAstCursorLineSelectDrAg(dAtA.position);
				} else {
					this._lAstCursorLineSelect(dAtA.position);
				}
			} else {
				if (dAtA.inSelectionMode) {
					this._lineSelectDrAg(dAtA.position);
				} else {
					this._lineSelect(dAtA.position);
				}
			}
		} else if (dAtA.mouseDownCount === 2) {
			if (this._hAsMulticursorModifier(dAtA)) {
				this._lAstCursorWordSelect(dAtA.position);
			} else {
				if (dAtA.inSelectionMode) {
					this._wordSelectDrAg(dAtA.position);
				} else {
					this._wordSelect(dAtA.position);
				}
			}
		} else {
			if (this._hAsMulticursorModifier(dAtA)) {
				if (!this._hAsNonMulticursorModifier(dAtA)) {
					if (dAtA.shiftKey) {
						this._columnSelect(dAtA.position, dAtA.mouseColumn, true);
					} else {
						// Do multi-cursor operAtions only when purely Alt is pressed
						if (dAtA.inSelectionMode) {
							this._lAstCursorMoveToSelect(dAtA.position);
						} else {
							this._creAteCursor(dAtA.position, fAlse);
						}
					}
				}
			} else {
				if (dAtA.inSelectionMode) {
					if (dAtA.AltKey) {
						this._columnSelect(dAtA.position, dAtA.mouseColumn, true);
					} else {
						if (columnSelection) {
							this._columnSelect(dAtA.position, dAtA.mouseColumn, true);
						} else {
							this._moveToSelect(dAtA.position);
						}
					}
				} else {
					this.moveTo(dAtA.position);
				}
			}
		}
	}

	privAte _usuAlArgs(viewPosition: Position) {
		viewPosition = this._vAlidAteViewColumn(viewPosition);
		return {
			source: 'mouse',
			position: this._convertViewToModelPosition(viewPosition),
			viewPosition: viewPosition
		};
	}

	public moveTo(viewPosition: Position): void {
		CoreNAvigAtionCommAnds.MoveTo.runCoreEditorCommAnd(this.viewModel, this._usuAlArgs(viewPosition));
	}

	privAte _moveToSelect(viewPosition: Position): void {
		CoreNAvigAtionCommAnds.MoveToSelect.runCoreEditorCommAnd(this.viewModel, this._usuAlArgs(viewPosition));
	}

	privAte _columnSelect(viewPosition: Position, mouseColumn: number, doColumnSelect: booleAn): void {
		viewPosition = this._vAlidAteViewColumn(viewPosition);
		CoreNAvigAtionCommAnds.ColumnSelect.runCoreEditorCommAnd(this.viewModel, {
			source: 'mouse',
			position: this._convertViewToModelPosition(viewPosition),
			viewPosition: viewPosition,
			mouseColumn: mouseColumn,
			doColumnSelect: doColumnSelect
		});
	}

	privAte _creAteCursor(viewPosition: Position, wholeLine: booleAn): void {
		viewPosition = this._vAlidAteViewColumn(viewPosition);
		CoreNAvigAtionCommAnds.CreAteCursor.runCoreEditorCommAnd(this.viewModel, {
			source: 'mouse',
			position: this._convertViewToModelPosition(viewPosition),
			viewPosition: viewPosition,
			wholeLine: wholeLine
		});
	}

	privAte _lAstCursorMoveToSelect(viewPosition: Position): void {
		CoreNAvigAtionCommAnds.LAstCursorMoveToSelect.runCoreEditorCommAnd(this.viewModel, this._usuAlArgs(viewPosition));
	}

	privAte _wordSelect(viewPosition: Position): void {
		CoreNAvigAtionCommAnds.WordSelect.runCoreEditorCommAnd(this.viewModel, this._usuAlArgs(viewPosition));
	}

	privAte _wordSelectDrAg(viewPosition: Position): void {
		CoreNAvigAtionCommAnds.WordSelectDrAg.runCoreEditorCommAnd(this.viewModel, this._usuAlArgs(viewPosition));
	}

	privAte _lAstCursorWordSelect(viewPosition: Position): void {
		CoreNAvigAtionCommAnds.LAstCursorWordSelect.runCoreEditorCommAnd(this.viewModel, this._usuAlArgs(viewPosition));
	}

	privAte _lineSelect(viewPosition: Position): void {
		CoreNAvigAtionCommAnds.LineSelect.runCoreEditorCommAnd(this.viewModel, this._usuAlArgs(viewPosition));
	}

	privAte _lineSelectDrAg(viewPosition: Position): void {
		CoreNAvigAtionCommAnds.LineSelectDrAg.runCoreEditorCommAnd(this.viewModel, this._usuAlArgs(viewPosition));
	}

	privAte _lAstCursorLineSelect(viewPosition: Position): void {
		CoreNAvigAtionCommAnds.LAstCursorLineSelect.runCoreEditorCommAnd(this.viewModel, this._usuAlArgs(viewPosition));
	}

	privAte _lAstCursorLineSelectDrAg(viewPosition: Position): void {
		CoreNAvigAtionCommAnds.LAstCursorLineSelectDrAg.runCoreEditorCommAnd(this.viewModel, this._usuAlArgs(viewPosition));
	}

	privAte _selectAll(): void {
		CoreNAvigAtionCommAnds.SelectAll.runCoreEditorCommAnd(this.viewModel, { source: 'mouse' });
	}

	// ----------------------

	privAte _convertViewToModelPosition(viewPosition: Position): Position {
		return this.viewModel.coordinAtesConverter.convertViewPositionToModelPosition(viewPosition);
	}

	public emitKeyDown(e: IKeyboArdEvent): void {
		this.userInputEvents.emitKeyDown(e);
	}

	public emitKeyUp(e: IKeyboArdEvent): void {
		this.userInputEvents.emitKeyUp(e);
	}

	public emitContextMenu(e: IEditorMouseEvent): void {
		this.userInputEvents.emitContextMenu(e);
	}

	public emitMouseMove(e: IEditorMouseEvent): void {
		this.userInputEvents.emitMouseMove(e);
	}

	public emitMouseLeAve(e: IPArtiAlEditorMouseEvent): void {
		this.userInputEvents.emitMouseLeAve(e);
	}

	public emitMouseUp(e: IEditorMouseEvent): void {
		this.userInputEvents.emitMouseUp(e);
	}

	public emitMouseDown(e: IEditorMouseEvent): void {
		this.userInputEvents.emitMouseDown(e);
	}

	public emitMouseDrAg(e: IEditorMouseEvent): void {
		this.userInputEvents.emitMouseDrAg(e);
	}

	public emitMouseDrop(e: IPArtiAlEditorMouseEvent): void {
		this.userInputEvents.emitMouseDrop(e);
	}

	public emitMouseWheel(e: IMouseWheelEvent): void {
		this.userInputEvents.emitMouseWheel(e);
	}
}
