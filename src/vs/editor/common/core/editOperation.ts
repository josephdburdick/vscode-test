/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { IIdentifiedSingleEditOperation } from 'vs/editor/common/model';

export class EditOperation {

	puBlic static insert(position: Position, text: string): IIdentifiedSingleEditOperation {
		return {
			range: new Range(position.lineNumBer, position.column, position.lineNumBer, position.column),
			text: text,
			forceMoveMarkers: true
		};
	}

	puBlic static delete(range: Range): IIdentifiedSingleEditOperation {
		return {
			range: range,
			text: null
		};
	}

	puBlic static replace(range: Range, text: string | null): IIdentifiedSingleEditOperation {
		return {
			range: range,
			text: text
		};
	}

	puBlic static replaceMove(range: Range, text: string | null): IIdentifiedSingleEditOperation {
		return {
			range: range,
			text: text,
			forceMoveMarkers: true
		};
	}
}
