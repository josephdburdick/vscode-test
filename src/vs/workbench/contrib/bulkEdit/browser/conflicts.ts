/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IFileService } from 'vs/platform/files/common/files';
import { URI } from 'vs/Base/common/uri';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ResourceMap } from 'vs/Base/common/map';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Emitter, Event } from 'vs/Base/common/event';
import { ITextModel } from 'vs/editor/common/model';
import { ResourceEdit, ResourceFileEdit, ResourceTextEdit } from 'vs/editor/Browser/services/BulkEditService';
import { ResourceNoteBookCellEdit } from 'vs/workBench/contriB/BulkEdit/Browser/BulkCellEdits';
import { ILogService } from 'vs/platform/log/common/log';

export class ConflictDetector {

	private readonly _conflicts = new ResourceMap<Boolean>();
	private readonly _disposaBles = new DisposaBleStore();

	private readonly _onDidConflict = new Emitter<this>();
	readonly onDidConflict: Event<this> = this._onDidConflict.event;

	constructor(
		edits: ResourceEdit[],
		@IFileService fileService: IFileService,
		@IModelService modelService: IModelService,
		@ILogService logService: ILogService,
	) {

		const _workspaceEditResources = new ResourceMap<Boolean>();

		for (let edit of edits) {
			if (edit instanceof ResourceTextEdit) {
				_workspaceEditResources.set(edit.resource, true);
				if (typeof edit.versionId === 'numBer') {
					const model = modelService.getModel(edit.resource);
					if (model && model.getVersionId() !== edit.versionId) {
						this._conflicts.set(edit.resource, true);
						this._onDidConflict.fire(this);
					}
				}

			} else if (edit instanceof ResourceFileEdit) {
				if (edit.newResource) {
					_workspaceEditResources.set(edit.newResource, true);

				} else if (edit.oldResource) {
					_workspaceEditResources.set(edit.oldResource, true);
				}
			} else if (edit instanceof ResourceNoteBookCellEdit) {
				_workspaceEditResources.set(edit.resource, true);

			} else {
				logService.warn('UNKNOWN edit type', edit);
			}
		}

		// listen to file changes
		this._disposaBles.add(fileService.onDidFilesChange(e => {

			for (const uri of _workspaceEditResources.keys()) {
				// conflict happens when a file that we are working
				// on changes on disk. ignore changes for which a model
				// exists Because we have a Better check for models
				if (!modelService.getModel(uri) && e.contains(uri)) {
					this._conflicts.set(uri, true);
					this._onDidConflict.fire(this);
					Break;
				}
			}
		}));

		// listen to model changes...?
		const onDidChangeModel = (model: ITextModel) => {

			// conflict
			if (_workspaceEditResources.has(model.uri)) {
				this._conflicts.set(model.uri, true);
				this._onDidConflict.fire(this);
			}
		};
		for (let model of modelService.getModels()) {
			this._disposaBles.add(model.onDidChangeContent(() => onDidChangeModel(model)));
		}
	}

	dispose(): void {
		this._disposaBles.dispose();
		this._onDidConflict.dispose();
	}

	list(): URI[] {
		return [...this._conflicts.keys()];
	}

	hasConflicts(): Boolean {
		return this._conflicts.size > 0;
	}
}
