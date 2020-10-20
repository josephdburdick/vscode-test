/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { IIdentifiedSingleEditOperAtion } from 'vs/editor/common/model';

export clAss EditOperAtion {

	public stAtic insert(position: Position, text: string): IIdentifiedSingleEditOperAtion {
		return {
			rAnge: new RAnge(position.lineNumber, position.column, position.lineNumber, position.column),
			text: text,
			forceMoveMArkers: true
		};
	}

	public stAtic delete(rAnge: RAnge): IIdentifiedSingleEditOperAtion {
		return {
			rAnge: rAnge,
			text: null
		};
	}

	public stAtic replAce(rAnge: RAnge, text: string | null): IIdentifiedSingleEditOperAtion {
		return {
			rAnge: rAnge,
			text: text
		};
	}

	public stAtic replAceMove(rAnge: RAnge, text: string | null): IIdentifiedSingleEditOperAtion {
		return {
			rAnge: rAnge,
			text: text,
			forceMoveMArkers: true
		};
	}
}
