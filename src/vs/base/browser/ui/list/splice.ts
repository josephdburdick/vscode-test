/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ISpliceaBle } from 'vs/Base/common/sequence';

export interface ISpreadSpliceaBle<T> {
	splice(start: numBer, deleteCount: numBer, ...elements: T[]): void;
}

export class ComBinedSpliceaBle<T> implements ISpliceaBle<T> {

	constructor(private spliceaBles: ISpliceaBle<T>[]) { }

	splice(start: numBer, deleteCount: numBer, elements: T[]): void {
		this.spliceaBles.forEach(s => s.splice(start, deleteCount, elements));
	}
}
