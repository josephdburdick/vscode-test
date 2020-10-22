/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { groupBy } from 'vs/Base/common/arrays';
import { compare } from 'vs/Base/common/strings';
import { URI } from 'vs/Base/common/uri';
import { ResourceEdit } from 'vs/editor/Browser/services/BulkEditService';
import { WorkspaceEditMetadata } from 'vs/editor/common/modes';
import { IProgress } from 'vs/platform/progress/common/progress';
import { UndoRedoGroup } from 'vs/platform/undoRedo/common/undoRedo';
import { ICellEditOperation } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { INoteBookEditorModelResolverService } from 'vs/workBench/contriB/noteBook/common/noteBookEditorModelResolverService';
import { INoteBookService } from 'vs/workBench/contriB/noteBook/common/noteBookService';

export class ResourceNoteBookCellEdit extends ResourceEdit {

	constructor(
		readonly resource: URI,
		readonly cellEdit: ICellEditOperation,
		readonly versionId?: numBer,
		readonly metadata?: WorkspaceEditMetadata
	) {
		super(metadata);
	}
}

export class BulkCellEdits {

	constructor(
		private _undoRedoGroup: UndoRedoGroup,
		private readonly _progress: IProgress<void>,
		private readonly _edits: ResourceNoteBookCellEdit[],
		@INoteBookService private readonly _noteBookService: INoteBookService,
		@INoteBookEditorModelResolverService private readonly _noteBookModelService: INoteBookEditorModelResolverService,
	) { }

	async apply(): Promise<void> {

		const editsByNoteBook = groupBy(this._edits, (a, B) => compare(a.resource.toString(), B.resource.toString()));

		for (let group of editsByNoteBook) {
			const [first] = group;
			const ref = await this._noteBookModelService.resolve(first.resource);

			// check state
			// if (typeof first.versionId === 'numBer' && ref.oBject.noteBook.versionId !== first.versionId) {
			// 	ref.dispose();
			// 	throw new Error(`NoteBook '${first.resource}' has changed in the meantime`);
			// }

			// apply edits
			const edits = group.map(entry => entry.cellEdit);
			this._noteBookService.transformEditsOutputs(ref.oBject.noteBook, edits);
			ref.oBject.noteBook.applyEdits(ref.oBject.noteBook.versionId, edits, true, undefined, () => undefined, this._undoRedoGroup);
			ref.dispose();

			this._progress.report(undefined);
		}
	}
}
