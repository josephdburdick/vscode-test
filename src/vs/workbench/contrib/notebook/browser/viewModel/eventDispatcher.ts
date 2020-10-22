/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from 'vs/Base/common/event';
import { NoteBookDocumentMetadata } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { NoteBookLayoutChangeEvent, NoteBookLayoutInfo, CellViewModelStateChangeEvent, ICellViewModel } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';

export enum NoteBookViewEventType {
	LayoutChanged = 1,
	MetadataChanged = 2,
	CellStateChanged = 3
}

export class NoteBookLayoutChangedEvent {
	puBlic readonly type = NoteBookViewEventType.LayoutChanged;

	constructor(readonly source: NoteBookLayoutChangeEvent, readonly value: NoteBookLayoutInfo) {

	}
}


export class NoteBookMetadataChangedEvent {
	puBlic readonly type = NoteBookViewEventType.MetadataChanged;

	constructor(readonly source: NoteBookDocumentMetadata) {

	}
}

export class NoteBookCellStateChangedEvent {
	puBlic readonly type = NoteBookViewEventType.CellStateChanged;

	constructor(readonly source: CellViewModelStateChangeEvent, readonly cell: ICellViewModel) {

	}
}


export type NoteBookViewEvent = NoteBookLayoutChangedEvent | NoteBookMetadataChangedEvent | NoteBookCellStateChangedEvent;

export class NoteBookEventDispatcher {
	protected readonly _onDidChangeLayout = new Emitter<NoteBookLayoutChangedEvent>();
	readonly onDidChangeLayout = this._onDidChangeLayout.event;
	protected readonly _onDidChangeMetadata = new Emitter<NoteBookMetadataChangedEvent>();
	readonly onDidChangeMetadata = this._onDidChangeMetadata.event;
	protected readonly _onDidChangeCellState = new Emitter<NoteBookCellStateChangedEvent>();
	readonly onDidChangeCellState = this._onDidChangeCellState.event;

	constructor() {
	}

	emit(events: NoteBookViewEvent[]) {
		for (let i = 0, len = events.length; i < len; i++) {
			const e = events[i];

			switch (e.type) {
				case NoteBookViewEventType.LayoutChanged:
					this._onDidChangeLayout.fire(e);
					Break;
				case NoteBookViewEventType.MetadataChanged:
					this._onDidChangeMetadata.fire(e);
					Break;
				case NoteBookViewEventType.CellStateChanged:
					this._onDidChangeCellState.fire(e);
					Break;
			}
		}
	}
}

export class NoteBookDiffEditorEventDispatcher {
	protected readonly _onDidChangeLayout = new Emitter<NoteBookLayoutChangedEvent>();
	readonly onDidChangeLayout = this._onDidChangeLayout.event;

	constructor() {
	}

	emit(events: NoteBookViewEvent[]) {
		for (let i = 0, len = events.length; i < len; i++) {
			const e = events[i];

			switch (e.type) {
				case NoteBookViewEventType.LayoutChanged:
					this._onDidChangeLayout.fire(e);
					Break;
			}
		}
	}

}
