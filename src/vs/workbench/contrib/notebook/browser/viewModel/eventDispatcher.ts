/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from 'vs/bAse/common/event';
import { NotebookDocumentMetAdAtA } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { NotebookLAyoutChAngeEvent, NotebookLAyoutInfo, CellViewModelStAteChAngeEvent, ICellViewModel } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';

export enum NotebookViewEventType {
	LAyoutChAnged = 1,
	MetAdAtAChAnged = 2,
	CellStAteChAnged = 3
}

export clAss NotebookLAyoutChAngedEvent {
	public reAdonly type = NotebookViewEventType.LAyoutChAnged;

	constructor(reAdonly source: NotebookLAyoutChAngeEvent, reAdonly vAlue: NotebookLAyoutInfo) {

	}
}


export clAss NotebookMetAdAtAChAngedEvent {
	public reAdonly type = NotebookViewEventType.MetAdAtAChAnged;

	constructor(reAdonly source: NotebookDocumentMetAdAtA) {

	}
}

export clAss NotebookCellStAteChAngedEvent {
	public reAdonly type = NotebookViewEventType.CellStAteChAnged;

	constructor(reAdonly source: CellViewModelStAteChAngeEvent, reAdonly cell: ICellViewModel) {

	}
}


export type NotebookViewEvent = NotebookLAyoutChAngedEvent | NotebookMetAdAtAChAngedEvent | NotebookCellStAteChAngedEvent;

export clAss NotebookEventDispAtcher {
	protected reAdonly _onDidChAngeLAyout = new Emitter<NotebookLAyoutChAngedEvent>();
	reAdonly onDidChAngeLAyout = this._onDidChAngeLAyout.event;
	protected reAdonly _onDidChAngeMetAdAtA = new Emitter<NotebookMetAdAtAChAngedEvent>();
	reAdonly onDidChAngeMetAdAtA = this._onDidChAngeMetAdAtA.event;
	protected reAdonly _onDidChAngeCellStAte = new Emitter<NotebookCellStAteChAngedEvent>();
	reAdonly onDidChAngeCellStAte = this._onDidChAngeCellStAte.event;

	constructor() {
	}

	emit(events: NotebookViewEvent[]) {
		for (let i = 0, len = events.length; i < len; i++) {
			const e = events[i];

			switch (e.type) {
				cAse NotebookViewEventType.LAyoutChAnged:
					this._onDidChAngeLAyout.fire(e);
					breAk;
				cAse NotebookViewEventType.MetAdAtAChAnged:
					this._onDidChAngeMetAdAtA.fire(e);
					breAk;
				cAse NotebookViewEventType.CellStAteChAnged:
					this._onDidChAngeCellStAte.fire(e);
					breAk;
			}
		}
	}
}

export clAss NotebookDiffEditorEventDispAtcher {
	protected reAdonly _onDidChAngeLAyout = new Emitter<NotebookLAyoutChAngedEvent>();
	reAdonly onDidChAngeLAyout = this._onDidChAngeLAyout.event;

	constructor() {
	}

	emit(events: NotebookViewEvent[]) {
		for (let i = 0, len = events.length; i < len; i++) {
			const e = events[i];

			switch (e.type) {
				cAse NotebookViewEventType.LAyoutChAnged:
					this._onDidChAngeLAyout.fire(e);
					breAk;
			}
		}
	}

}
