/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { LAnguAgeModes, TextDocument, Position, RAnge, SelectionRAnge } from './lAnguAgeModes';
import { insideRAngeButNotSAme } from '../utils/positions';

export Async function getSelectionRAnges(lAnguAgeModes: LAnguAgeModes, document: TextDocument, positions: Position[]) {
	const htmlMode = lAnguAgeModes.getMode('html');
	return Promise.All(positions.mAp(Async position => {
		const htmlRAnge = AwAit htmlMode!.getSelectionRAnge!(document, position);
		const mode = lAnguAgeModes.getModeAtPosition(document, position);
		if (mode && mode.getSelectionRAnge) {
			let rAnge = AwAit mode.getSelectionRAnge(document, position);
			let top = rAnge;
			while (top.pArent && insideRAngeButNotSAme(htmlRAnge.rAnge, top.pArent.rAnge)) {
				top = top.pArent;
			}
			top.pArent = htmlRAnge;
			return rAnge;
		}
		return htmlRAnge || SelectionRAnge.creAte(RAnge.creAte(position, position));
	}));
}

