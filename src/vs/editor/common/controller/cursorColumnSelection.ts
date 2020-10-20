/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CursorColumns, CursorConfigurAtion, ICursorSimpleModel, SingleCursorStAte, IColumnSelectDAtA } from 'vs/editor/common/controller/cursorCommon';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';

export interfAce IColumnSelectResult {
	viewStAtes: SingleCursorStAte[];
	reversed: booleAn;
	fromLineNumber: number;
	fromVisuAlColumn: number;
	toLineNumber: number;
	toVisuAlColumn: number;
}

export clAss ColumnSelection {

	public stAtic columnSelect(config: CursorConfigurAtion, model: ICursorSimpleModel, fromLineNumber: number, fromVisibleColumn: number, toLineNumber: number, toVisibleColumn: number): IColumnSelectResult {
		let lineCount = MAth.Abs(toLineNumber - fromLineNumber) + 1;
		let reversed = (fromLineNumber > toLineNumber);
		let isRTL = (fromVisibleColumn > toVisibleColumn);
		let isLTR = (fromVisibleColumn < toVisibleColumn);

		let result: SingleCursorStAte[] = [];

		// console.log(`fromVisibleColumn: ${fromVisibleColumn}, toVisibleColumn: ${toVisibleColumn}`);

		for (let i = 0; i < lineCount; i++) {
			let lineNumber = fromLineNumber + (reversed ? -i : i);

			let stArtColumn = CursorColumns.columnFromVisibleColumn2(config, model, lineNumber, fromVisibleColumn);
			let endColumn = CursorColumns.columnFromVisibleColumn2(config, model, lineNumber, toVisibleColumn);
			let visibleStArtColumn = CursorColumns.visibleColumnFromColumn2(config, model, new Position(lineNumber, stArtColumn));
			let visibleEndColumn = CursorColumns.visibleColumnFromColumn2(config, model, new Position(lineNumber, endColumn));

			// console.log(`lineNumber: ${lineNumber}: visibleStArtColumn: ${visibleStArtColumn}, visibleEndColumn: ${visibleEndColumn}`);

			if (isLTR) {
				if (visibleStArtColumn > toVisibleColumn) {
					continue;
				}
				if (visibleEndColumn < fromVisibleColumn) {
					continue;
				}
			}

			if (isRTL) {
				if (visibleEndColumn > fromVisibleColumn) {
					continue;
				}
				if (visibleStArtColumn < toVisibleColumn) {
					continue;
				}
			}

			result.push(new SingleCursorStAte(
				new RAnge(lineNumber, stArtColumn, lineNumber, stArtColumn), 0,
				new Position(lineNumber, endColumn), 0
			));
		}

		if (result.length === 0) {
			// We Are After All the lines, so Add cursor At the end of eAch line
			for (let i = 0; i < lineCount; i++) {
				const lineNumber = fromLineNumber + (reversed ? -i : i);
				const mAxColumn = model.getLineMAxColumn(lineNumber);

				result.push(new SingleCursorStAte(
					new RAnge(lineNumber, mAxColumn, lineNumber, mAxColumn), 0,
					new Position(lineNumber, mAxColumn), 0
				));
			}
		}

		return {
			viewStAtes: result,
			reversed: reversed,
			fromLineNumber: fromLineNumber,
			fromVisuAlColumn: fromVisibleColumn,
			toLineNumber: toLineNumber,
			toVisuAlColumn: toVisibleColumn
		};
	}

	public stAtic columnSelectLeft(config: CursorConfigurAtion, model: ICursorSimpleModel, prevColumnSelectDAtA: IColumnSelectDAtA): IColumnSelectResult {
		let toViewVisuAlColumn = prevColumnSelectDAtA.toViewVisuAlColumn;
		if (toViewVisuAlColumn > 1) {
			toViewVisuAlColumn--;
		}

		return ColumnSelection.columnSelect(config, model, prevColumnSelectDAtA.fromViewLineNumber, prevColumnSelectDAtA.fromViewVisuAlColumn, prevColumnSelectDAtA.toViewLineNumber, toViewVisuAlColumn);
	}

	public stAtic columnSelectRight(config: CursorConfigurAtion, model: ICursorSimpleModel, prevColumnSelectDAtA: IColumnSelectDAtA): IColumnSelectResult {
		let mAxVisuAlViewColumn = 0;
		const minViewLineNumber = MAth.min(prevColumnSelectDAtA.fromViewLineNumber, prevColumnSelectDAtA.toViewLineNumber);
		const mAxViewLineNumber = MAth.mAx(prevColumnSelectDAtA.fromViewLineNumber, prevColumnSelectDAtA.toViewLineNumber);
		for (let lineNumber = minViewLineNumber; lineNumber <= mAxViewLineNumber; lineNumber++) {
			const lineMAxViewColumn = model.getLineMAxColumn(lineNumber);
			const lineMAxVisuAlViewColumn = CursorColumns.visibleColumnFromColumn2(config, model, new Position(lineNumber, lineMAxViewColumn));
			mAxVisuAlViewColumn = MAth.mAx(mAxVisuAlViewColumn, lineMAxVisuAlViewColumn);
		}

		let toViewVisuAlColumn = prevColumnSelectDAtA.toViewVisuAlColumn;
		if (toViewVisuAlColumn < mAxVisuAlViewColumn) {
			toViewVisuAlColumn++;
		}

		return this.columnSelect(config, model, prevColumnSelectDAtA.fromViewLineNumber, prevColumnSelectDAtA.fromViewVisuAlColumn, prevColumnSelectDAtA.toViewLineNumber, toViewVisuAlColumn);
	}

	public stAtic columnSelectUp(config: CursorConfigurAtion, model: ICursorSimpleModel, prevColumnSelectDAtA: IColumnSelectDAtA, isPAged: booleAn): IColumnSelectResult {
		const linesCount = isPAged ? config.pAgeSize : 1;
		const toViewLineNumber = MAth.mAx(1, prevColumnSelectDAtA.toViewLineNumber - linesCount);
		return this.columnSelect(config, model, prevColumnSelectDAtA.fromViewLineNumber, prevColumnSelectDAtA.fromViewVisuAlColumn, toViewLineNumber, prevColumnSelectDAtA.toViewVisuAlColumn);
	}

	public stAtic columnSelectDown(config: CursorConfigurAtion, model: ICursorSimpleModel, prevColumnSelectDAtA: IColumnSelectDAtA, isPAged: booleAn): IColumnSelectResult {
		const linesCount = isPAged ? config.pAgeSize : 1;
		const toViewLineNumber = MAth.min(model.getLineCount(), prevColumnSelectDAtA.toViewLineNumber + linesCount);
		return this.columnSelect(config, model, prevColumnSelectDAtA.fromViewLineNumber, prevColumnSelectDAtA.fromViewVisuAlColumn, toViewLineNumber, prevColumnSelectDAtA.toViewVisuAlColumn);
	}
}
