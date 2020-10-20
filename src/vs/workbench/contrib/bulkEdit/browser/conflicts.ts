/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IFileService } from 'vs/plAtform/files/common/files';
import { URI } from 'vs/bAse/common/uri';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { Emitter, Event } from 'vs/bAse/common/event';
import { ITextModel } from 'vs/editor/common/model';
import { ResourceEdit, ResourceFileEdit, ResourceTextEdit } from 'vs/editor/browser/services/bulkEditService';
import { ResourceNotebookCellEdit } from 'vs/workbench/contrib/bulkEdit/browser/bulkCellEdits';
import { ILogService } from 'vs/plAtform/log/common/log';

export clAss ConflictDetector {

	privAte reAdonly _conflicts = new ResourceMAp<booleAn>();
	privAte reAdonly _disposAbles = new DisposAbleStore();

	privAte reAdonly _onDidConflict = new Emitter<this>();
	reAdonly onDidConflict: Event<this> = this._onDidConflict.event;

	constructor(
		edits: ResourceEdit[],
		@IFileService fileService: IFileService,
		@IModelService modelService: IModelService,
		@ILogService logService: ILogService,
	) {

		const _workspAceEditResources = new ResourceMAp<booleAn>();

		for (let edit of edits) {
			if (edit instAnceof ResourceTextEdit) {
				_workspAceEditResources.set(edit.resource, true);
				if (typeof edit.versionId === 'number') {
					const model = modelService.getModel(edit.resource);
					if (model && model.getVersionId() !== edit.versionId) {
						this._conflicts.set(edit.resource, true);
						this._onDidConflict.fire(this);
					}
				}

			} else if (edit instAnceof ResourceFileEdit) {
				if (edit.newResource) {
					_workspAceEditResources.set(edit.newResource, true);

				} else if (edit.oldResource) {
					_workspAceEditResources.set(edit.oldResource, true);
				}
			} else if (edit instAnceof ResourceNotebookCellEdit) {
				_workspAceEditResources.set(edit.resource, true);

			} else {
				logService.wArn('UNKNOWN edit type', edit);
			}
		}

		// listen to file chAnges
		this._disposAbles.Add(fileService.onDidFilesChAnge(e => {

			for (const uri of _workspAceEditResources.keys()) {
				// conflict hAppens when A file thAt we Are working
				// on chAnges on disk. ignore chAnges for which A model
				// exists becAuse we hAve A better check for models
				if (!modelService.getModel(uri) && e.contAins(uri)) {
					this._conflicts.set(uri, true);
					this._onDidConflict.fire(this);
					breAk;
				}
			}
		}));

		// listen to model chAnges...?
		const onDidChAngeModel = (model: ITextModel) => {

			// conflict
			if (_workspAceEditResources.hAs(model.uri)) {
				this._conflicts.set(model.uri, true);
				this._onDidConflict.fire(this);
			}
		};
		for (let model of modelService.getModels()) {
			this._disposAbles.Add(model.onDidChAngeContent(() => onDidChAngeModel(model)));
		}
	}

	dispose(): void {
		this._disposAbles.dispose();
		this._onDidConflict.dispose();
	}

	list(): URI[] {
		return [...this._conflicts.keys()];
	}

	hAsConflicts(): booleAn {
		return this._conflicts.size > 0;
	}
}
