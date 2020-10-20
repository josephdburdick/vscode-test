/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ISpliceAble } from 'vs/bAse/common/sequence';

export interfAce ISpreAdSpliceAble<T> {
	splice(stArt: number, deleteCount: number, ...elements: T[]): void;
}

export clAss CombinedSpliceAble<T> implements ISpliceAble<T> {

	constructor(privAte spliceAbles: ISpliceAble<T>[]) { }

	splice(stArt: number, deleteCount: number, elements: T[]): void {
		this.spliceAbles.forEAch(s => s.splice(stArt, deleteCount, elements));
	}
}
