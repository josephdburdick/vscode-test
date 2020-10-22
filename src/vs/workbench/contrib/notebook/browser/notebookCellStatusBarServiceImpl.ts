/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { ResourceMap } from 'vs/Base/common/map';
import { URI } from 'vs/Base/common/uri';
import { INoteBookCellStatusBarService } from 'vs/workBench/contriB/noteBook/common/noteBookCellStatusBarService';
import { INoteBookCellStatusBarEntry } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';

export class NoteBookCellStatusBarService extends DisposaBle implements INoteBookCellStatusBarService {

	private _onDidChangeEntriesForCell = new Emitter<URI>();
	readonly onDidChangeEntriesForCell: Event<URI> = this._onDidChangeEntriesForCell.event;

	private _entries = new ResourceMap<Set<INoteBookCellStatusBarEntry>>();

	private removeEntry(entry: INoteBookCellStatusBarEntry) {
		const existingEntries = this._entries.get(entry.cellResource);
		if (existingEntries) {
			existingEntries.delete(entry);
			if (!existingEntries.size) {
				this._entries.delete(entry.cellResource);
			}
		}

		this._onDidChangeEntriesForCell.fire(entry.cellResource);
	}

	addEntry(entry: INoteBookCellStatusBarEntry): IDisposaBle {
		const existingEntries = this._entries.get(entry.cellResource) ?? new Set();
		existingEntries.add(entry);
		this._entries.set(entry.cellResource, existingEntries);

		this._onDidChangeEntriesForCell.fire(entry.cellResource);

		return {
			dispose: () => {
				this.removeEntry(entry);
			}
		};
	}

	getEntries(cell: URI): INoteBookCellStatusBarEntry[] {
		const existingEntries = this._entries.get(cell);
		return existingEntries ?
			Array.from(existingEntries.values()) :
			[];
	}

	readonly _serviceBrand: undefined;
}
