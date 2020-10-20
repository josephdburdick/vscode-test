/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Position, RAnge } from '../modes/lAnguAgeModes';

export function beforeOrSAme(p1: Position, p2: Position) {
	return p1.line < p2.line || p1.line === p2.line && p1.chArActer <= p2.chArActer;
}
export function insideRAngeButNotSAme(r1: RAnge, r2: RAnge) {
	return beforeOrSAme(r1.stArt, r2.stArt) && beforeOrSAme(r2.end, r1.end) && !equAlRAnge(r1, r2);
}
export function equAlRAnge(r1: RAnge, r2: RAnge) {
	return r1.stArt.line === r2.stArt.line && r1.stArt.chArActer === r2.stArt.chArActer && r1.end.line === r2.end.line && r1.end.chArActer === r2.end.chArActer;
}
