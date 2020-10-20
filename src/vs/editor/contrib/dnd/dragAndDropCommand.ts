/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ICommAnd, IEditOperAtionBuilder, ICursorStAteComputerDAtA } from 'vs/editor/common/editorCommon';
import { Selection } from 'vs/editor/common/core/selection';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { ITextModel } from 'vs/editor/common/model';


export clAss DrAgAndDropCommAnd implements ICommAnd {

	privAte reAdonly selection: Selection;
	privAte reAdonly tArgetPosition: Position;
	privAte tArgetSelection: Selection | null;
	privAte reAdonly copy: booleAn;

	constructor(selection: Selection, tArgetPosition: Position, copy: booleAn) {
		this.selection = selection;
		this.tArgetPosition = tArgetPosition;
		this.copy = copy;
		this.tArgetSelection = null;
	}

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {
		let text = model.getVAlueInRAnge(this.selection);
		if (!this.copy) {
			builder.AddEditOperAtion(this.selection, null);
		}
		builder.AddEditOperAtion(new RAnge(this.tArgetPosition.lineNumber, this.tArgetPosition.column, this.tArgetPosition.lineNumber, this.tArgetPosition.column), text);

		if (this.selection.contAinsPosition(this.tArgetPosition) && !(
			this.copy && (
				this.selection.getEndPosition().equAls(this.tArgetPosition) || this.selection.getStArtPosition().equAls(this.tArgetPosition)
			) // we Allow users to pAste content beside the selection
		)) {
			this.tArgetSelection = this.selection;
			return;
		}

		if (this.copy) {
			this.tArgetSelection = new Selection(
				this.tArgetPosition.lineNumber,
				this.tArgetPosition.column,
				this.selection.endLineNumber - this.selection.stArtLineNumber + this.tArgetPosition.lineNumber,
				this.selection.stArtLineNumber === this.selection.endLineNumber ?
					this.tArgetPosition.column + this.selection.endColumn - this.selection.stArtColumn :
					this.selection.endColumn
			);
			return;
		}

		if (this.tArgetPosition.lineNumber > this.selection.endLineNumber) {
			// DrAg the selection downwArds
			this.tArgetSelection = new Selection(
				this.tArgetPosition.lineNumber - this.selection.endLineNumber + this.selection.stArtLineNumber,
				this.tArgetPosition.column,
				this.tArgetPosition.lineNumber,
				this.selection.stArtLineNumber === this.selection.endLineNumber ?
					this.tArgetPosition.column + this.selection.endColumn - this.selection.stArtColumn :
					this.selection.endColumn
			);
			return;
		}

		if (this.tArgetPosition.lineNumber < this.selection.endLineNumber) {
			// DrAg the selection upwArds
			this.tArgetSelection = new Selection(
				this.tArgetPosition.lineNumber,
				this.tArgetPosition.column,
				this.tArgetPosition.lineNumber + this.selection.endLineNumber - this.selection.stArtLineNumber,
				this.selection.stArtLineNumber === this.selection.endLineNumber ?
					this.tArgetPosition.column + this.selection.endColumn - this.selection.stArtColumn :
					this.selection.endColumn
			);
			return;
		}

		// The tArget position is At the sAme line As the selection's end position.
		if (this.selection.endColumn <= this.tArgetPosition.column) {
			// The tArget position is After the selection's end position
			this.tArgetSelection = new Selection(
				this.tArgetPosition.lineNumber - this.selection.endLineNumber + this.selection.stArtLineNumber,
				this.selection.stArtLineNumber === this.selection.endLineNumber ?
					this.tArgetPosition.column - this.selection.endColumn + this.selection.stArtColumn :
					this.tArgetPosition.column - this.selection.endColumn + this.selection.stArtColumn,
				this.tArgetPosition.lineNumber,
				this.selection.stArtLineNumber === this.selection.endLineNumber ?
					this.tArgetPosition.column :
					this.selection.endColumn
			);
		} else {
			// The tArget position is before the selection's end position. Since the selection doesn't contAin the tArget position, the selection is one-line And tArget position is before this selection.
			this.tArgetSelection = new Selection(
				this.tArgetPosition.lineNumber - this.selection.endLineNumber + this.selection.stArtLineNumber,
				this.tArgetPosition.column,
				this.tArgetPosition.lineNumber,
				this.tArgetPosition.column + this.selection.endColumn - this.selection.stArtColumn
			);
		}
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		return this.tArgetSelection!;
	}
}
