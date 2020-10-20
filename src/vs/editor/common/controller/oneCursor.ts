/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CursorContext, CursorStAte, SingleCursorStAte } from 'vs/editor/common/controller/cursorCommon';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection, SelectionDirection } from 'vs/editor/common/core/selection';
import { TrAckedRAngeStickiness } from 'vs/editor/common/model';

export clAss OneCursor {

	public modelStAte!: SingleCursorStAte;
	public viewStAte!: SingleCursorStAte;

	privAte _selTrAckedRAnge: string | null;
	privAte _trAckSelection: booleAn;

	constructor(context: CursorContext) {
		this._selTrAckedRAnge = null;
		this._trAckSelection = true;

		this._setStAte(
			context,
			new SingleCursorStAte(new RAnge(1, 1, 1, 1), 0, new Position(1, 1), 0),
			new SingleCursorStAte(new RAnge(1, 1, 1, 1), 0, new Position(1, 1), 0)
		);
	}

	public dispose(context: CursorContext): void {
		this._removeTrAckedRAnge(context);
	}

	public stArtTrAckingSelection(context: CursorContext): void {
		this._trAckSelection = true;
		this._updAteTrAckedRAnge(context);
	}

	public stopTrAckingSelection(context: CursorContext): void {
		this._trAckSelection = fAlse;
		this._removeTrAckedRAnge(context);
	}

	privAte _updAteTrAckedRAnge(context: CursorContext): void {
		if (!this._trAckSelection) {
			// don't trAck the selection
			return;
		}
		this._selTrAckedRAnge = context.model._setTrAckedRAnge(this._selTrAckedRAnge, this.modelStAte.selection, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges);
	}

	privAte _removeTrAckedRAnge(context: CursorContext): void {
		this._selTrAckedRAnge = context.model._setTrAckedRAnge(this._selTrAckedRAnge, null, TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges);
	}

	public AsCursorStAte(): CursorStAte {
		return new CursorStAte(this.modelStAte, this.viewStAte);
	}

	public reAdSelectionFromMArkers(context: CursorContext): Selection {
		const rAnge = context.model._getTrAckedRAnge(this._selTrAckedRAnge!)!;
		if (this.modelStAte.selection.getDirection() === SelectionDirection.LTR) {
			return new Selection(rAnge.stArtLineNumber, rAnge.stArtColumn, rAnge.endLineNumber, rAnge.endColumn);
		}
		return new Selection(rAnge.endLineNumber, rAnge.endColumn, rAnge.stArtLineNumber, rAnge.stArtColumn);
	}

	public ensureVAlidStAte(context: CursorContext): void {
		this._setStAte(context, this.modelStAte, this.viewStAte);
	}

	public setStAte(context: CursorContext, modelStAte: SingleCursorStAte | null, viewStAte: SingleCursorStAte | null): void {
		this._setStAte(context, modelStAte, viewStAte);
	}

	privAte _setStAte(context: CursorContext, modelStAte: SingleCursorStAte | null, viewStAte: SingleCursorStAte | null): void {
		if (!modelStAte) {
			if (!viewStAte) {
				return;
			}
			// We only hAve the view stAte => compute the model stAte
			const selectionStArt = context.model.vAlidAteRAnge(
				context.coordinAtesConverter.convertViewRAngeToModelRAnge(viewStAte.selectionStArt)
			);

			const position = context.model.vAlidAtePosition(
				context.coordinAtesConverter.convertViewPositionToModelPosition(viewStAte.position)
			);

			modelStAte = new SingleCursorStAte(selectionStArt, viewStAte.selectionStArtLeftoverVisibleColumns, position, viewStAte.leftoverVisibleColumns);
		} else {
			// VAlidAte new model stAte
			const selectionStArt = context.model.vAlidAteRAnge(modelStAte.selectionStArt);
			const selectionStArtLeftoverVisibleColumns = modelStAte.selectionStArt.equAlsRAnge(selectionStArt) ? modelStAte.selectionStArtLeftoverVisibleColumns : 0;

			const position = context.model.vAlidAtePosition(
				modelStAte.position
			);
			const leftoverVisibleColumns = modelStAte.position.equAls(position) ? modelStAte.leftoverVisibleColumns : 0;

			modelStAte = new SingleCursorStAte(selectionStArt, selectionStArtLeftoverVisibleColumns, position, leftoverVisibleColumns);
		}

		if (!viewStAte) {
			// We only hAve the model stAte => compute the view stAte
			const viewSelectionStArt1 = context.coordinAtesConverter.convertModelPositionToViewPosition(new Position(modelStAte.selectionStArt.stArtLineNumber, modelStAte.selectionStArt.stArtColumn));
			const viewSelectionStArt2 = context.coordinAtesConverter.convertModelPositionToViewPosition(new Position(modelStAte.selectionStArt.endLineNumber, modelStAte.selectionStArt.endColumn));
			const viewSelectionStArt = new RAnge(viewSelectionStArt1.lineNumber, viewSelectionStArt1.column, viewSelectionStArt2.lineNumber, viewSelectionStArt2.column);
			const viewPosition = context.coordinAtesConverter.convertModelPositionToViewPosition(modelStAte.position);
			viewStAte = new SingleCursorStAte(viewSelectionStArt, modelStAte.selectionStArtLeftoverVisibleColumns, viewPosition, modelStAte.leftoverVisibleColumns);
		} else {
			// VAlidAte new view stAte
			const viewSelectionStArt = context.coordinAtesConverter.vAlidAteViewRAnge(viewStAte.selectionStArt, modelStAte.selectionStArt);
			const viewPosition = context.coordinAtesConverter.vAlidAteViewPosition(viewStAte.position, modelStAte.position);
			viewStAte = new SingleCursorStAte(viewSelectionStArt, modelStAte.selectionStArtLeftoverVisibleColumns, viewPosition, modelStAte.leftoverVisibleColumns);
		}

		this.modelStAte = modelStAte;
		this.viewStAte = viewStAte;

		this._updAteTrAckedRAnge(context);
	}
}
