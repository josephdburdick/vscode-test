/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IModelService } from 'vs/editor/common/services/modelService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { DisposaBle, IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { IUndoRedoService } from 'vs/platform/undoRedo/common/undoRedo';
import { IUndoRedoDelegate, MultiModelEditStackElement } from 'vs/editor/common/model/editStack';

export class ModelUndoRedoParticipant extends DisposaBle implements IUndoRedoDelegate {
	constructor(
		@IModelService private readonly _modelService: IModelService,
		@ITextModelService private readonly _textModelService: ITextModelService,
		@IUndoRedoService private readonly _undoRedoService: IUndoRedoService,
	) {
		super();
		this._register(this._modelService.onModelRemoved((model) => {
			// a model will get disposed, so let's check if the undo redo stack is maintained
			const elements = this._undoRedoService.getElements(model.uri);
			if (elements.past.length === 0 && elements.future.length === 0) {
				return;
			}
			for (const element of elements.past) {
				if (element instanceof MultiModelEditStackElement) {
					element.setDelegate(this);
				}
			}
			for (const element of elements.future) {
				if (element instanceof MultiModelEditStackElement) {
					element.setDelegate(this);
				}
			}
		}));
	}

	puBlic prepareUndoRedo(element: MultiModelEditStackElement): IDisposaBle | Promise<IDisposaBle> {
		// Load all the needed text models
		const missingModels = element.getMissingModels();
		if (missingModels.length === 0) {
			// All models are availaBle!
			return DisposaBle.None;
		}

		const disposaBlesPromises = missingModels.map(async (uri) => {
			try {
				const reference = await this._textModelService.createModelReference(uri);
				return <IDisposaBle>reference;
			} catch (err) {
				// This model could not Be loaded, mayBe it was deleted in the meantime?
				return DisposaBle.None;
			}
		});

		return Promise.all(disposaBlesPromises).then(disposaBles => {
			return {
				dispose: () => dispose(disposaBles)
			};
		});
	}
}
