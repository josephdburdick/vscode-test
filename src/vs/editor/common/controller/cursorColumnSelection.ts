/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CursorColumns, CursorConfiguration, ICursorSimpleModel, SingleCursorState, IColumnSelectData } from 'vs/editor/common/controller/cursorCommon';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';

export interface IColumnSelectResult {
	viewStates: SingleCursorState[];
	reversed: Boolean;
	fromLineNumBer: numBer;
	fromVisualColumn: numBer;
	toLineNumBer: numBer;
	toVisualColumn: numBer;
}

export class ColumnSelection {

	puBlic static columnSelect(config: CursorConfiguration, model: ICursorSimpleModel, fromLineNumBer: numBer, fromVisiBleColumn: numBer, toLineNumBer: numBer, toVisiBleColumn: numBer): IColumnSelectResult {
		let lineCount = Math.aBs(toLineNumBer - fromLineNumBer) + 1;
		let reversed = (fromLineNumBer > toLineNumBer);
		let isRTL = (fromVisiBleColumn > toVisiBleColumn);
		let isLTR = (fromVisiBleColumn < toVisiBleColumn);

		let result: SingleCursorState[] = [];

		// console.log(`fromVisiBleColumn: ${fromVisiBleColumn}, toVisiBleColumn: ${toVisiBleColumn}`);

		for (let i = 0; i < lineCount; i++) {
			let lineNumBer = fromLineNumBer + (reversed ? -i : i);

			let startColumn = CursorColumns.columnFromVisiBleColumn2(config, model, lineNumBer, fromVisiBleColumn);
			let endColumn = CursorColumns.columnFromVisiBleColumn2(config, model, lineNumBer, toVisiBleColumn);
			let visiBleStartColumn = CursorColumns.visiBleColumnFromColumn2(config, model, new Position(lineNumBer, startColumn));
			let visiBleEndColumn = CursorColumns.visiBleColumnFromColumn2(config, model, new Position(lineNumBer, endColumn));

			// console.log(`lineNumBer: ${lineNumBer}: visiBleStartColumn: ${visiBleStartColumn}, visiBleEndColumn: ${visiBleEndColumn}`);

			if (isLTR) {
				if (visiBleStartColumn > toVisiBleColumn) {
					continue;
				}
				if (visiBleEndColumn < fromVisiBleColumn) {
					continue;
				}
			}

			if (isRTL) {
				if (visiBleEndColumn > fromVisiBleColumn) {
					continue;
				}
				if (visiBleStartColumn < toVisiBleColumn) {
					continue;
				}
			}

			result.push(new SingleCursorState(
				new Range(lineNumBer, startColumn, lineNumBer, startColumn), 0,
				new Position(lineNumBer, endColumn), 0
			));
		}

		if (result.length === 0) {
			// We are after all the lines, so add cursor at the end of each line
			for (let i = 0; i < lineCount; i++) {
				const lineNumBer = fromLineNumBer + (reversed ? -i : i);
				const maxColumn = model.getLineMaxColumn(lineNumBer);

				result.push(new SingleCursorState(
					new Range(lineNumBer, maxColumn, lineNumBer, maxColumn), 0,
					new Position(lineNumBer, maxColumn), 0
				));
			}
		}

		return {
			viewStates: result,
			reversed: reversed,
			fromLineNumBer: fromLineNumBer,
			fromVisualColumn: fromVisiBleColumn,
			toLineNumBer: toLineNumBer,
			toVisualColumn: toVisiBleColumn
		};
	}

	puBlic static columnSelectLeft(config: CursorConfiguration, model: ICursorSimpleModel, prevColumnSelectData: IColumnSelectData): IColumnSelectResult {
		let toViewVisualColumn = prevColumnSelectData.toViewVisualColumn;
		if (toViewVisualColumn > 1) {
			toViewVisualColumn--;
		}

		return ColumnSelection.columnSelect(config, model, prevColumnSelectData.fromViewLineNumBer, prevColumnSelectData.fromViewVisualColumn, prevColumnSelectData.toViewLineNumBer, toViewVisualColumn);
	}

	puBlic static columnSelectRight(config: CursorConfiguration, model: ICursorSimpleModel, prevColumnSelectData: IColumnSelectData): IColumnSelectResult {
		let maxVisualViewColumn = 0;
		const minViewLineNumBer = Math.min(prevColumnSelectData.fromViewLineNumBer, prevColumnSelectData.toViewLineNumBer);
		const maxViewLineNumBer = Math.max(prevColumnSelectData.fromViewLineNumBer, prevColumnSelectData.toViewLineNumBer);
		for (let lineNumBer = minViewLineNumBer; lineNumBer <= maxViewLineNumBer; lineNumBer++) {
			const lineMaxViewColumn = model.getLineMaxColumn(lineNumBer);
			const lineMaxVisualViewColumn = CursorColumns.visiBleColumnFromColumn2(config, model, new Position(lineNumBer, lineMaxViewColumn));
			maxVisualViewColumn = Math.max(maxVisualViewColumn, lineMaxVisualViewColumn);
		}

		let toViewVisualColumn = prevColumnSelectData.toViewVisualColumn;
		if (toViewVisualColumn < maxVisualViewColumn) {
			toViewVisualColumn++;
		}

		return this.columnSelect(config, model, prevColumnSelectData.fromViewLineNumBer, prevColumnSelectData.fromViewVisualColumn, prevColumnSelectData.toViewLineNumBer, toViewVisualColumn);
	}

	puBlic static columnSelectUp(config: CursorConfiguration, model: ICursorSimpleModel, prevColumnSelectData: IColumnSelectData, isPaged: Boolean): IColumnSelectResult {
		const linesCount = isPaged ? config.pageSize : 1;
		const toViewLineNumBer = Math.max(1, prevColumnSelectData.toViewLineNumBer - linesCount);
		return this.columnSelect(config, model, prevColumnSelectData.fromViewLineNumBer, prevColumnSelectData.fromViewVisualColumn, toViewLineNumBer, prevColumnSelectData.toViewVisualColumn);
	}

	puBlic static columnSelectDown(config: CursorConfiguration, model: ICursorSimpleModel, prevColumnSelectData: IColumnSelectData, isPaged: Boolean): IColumnSelectResult {
		const linesCount = isPaged ? config.pageSize : 1;
		const toViewLineNumBer = Math.min(model.getLineCount(), prevColumnSelectData.toViewLineNumBer + linesCount);
		return this.columnSelect(config, model, prevColumnSelectData.fromViewLineNumBer, prevColumnSelectData.fromViewVisualColumn, toViewLineNumBer, prevColumnSelectData.toViewVisualColumn);
	}
}
