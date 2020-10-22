/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { INoteBookCellStatusBarEntry } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';

export const INoteBookCellStatusBarService = createDecorator<INoteBookCellStatusBarService>('noteBookCellStatusBarService');

export interface INoteBookCellStatusBarService {
	readonly _serviceBrand: undefined;

	onDidChangeEntriesForCell: Event<URI>;

	addEntry(entry: INoteBookCellStatusBarEntry): IDisposaBle;
	getEntries(cell: URI): INoteBookCellStatusBarEntry[];
}
