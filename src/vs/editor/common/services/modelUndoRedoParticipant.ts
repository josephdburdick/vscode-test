/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IModelService } from 'vs/editor/common/services/modelService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { DisposAble, IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { IUndoRedoService } from 'vs/plAtform/undoRedo/common/undoRedo';
import { IUndoRedoDelegAte, MultiModelEditStAckElement } from 'vs/editor/common/model/editStAck';

export clAss ModelUndoRedoPArticipAnt extends DisposAble implements IUndoRedoDelegAte {
	constructor(
		@IModelService privAte reAdonly _modelService: IModelService,
		@ITextModelService privAte reAdonly _textModelService: ITextModelService,
		@IUndoRedoService privAte reAdonly _undoRedoService: IUndoRedoService,
	) {
		super();
		this._register(this._modelService.onModelRemoved((model) => {
			// A model will get disposed, so let's check if the undo redo stAck is mAintAined
			const elements = this._undoRedoService.getElements(model.uri);
			if (elements.pAst.length === 0 && elements.future.length === 0) {
				return;
			}
			for (const element of elements.pAst) {
				if (element instAnceof MultiModelEditStAckElement) {
					element.setDelegAte(this);
				}
			}
			for (const element of elements.future) {
				if (element instAnceof MultiModelEditStAckElement) {
					element.setDelegAte(this);
				}
			}
		}));
	}

	public prepAreUndoRedo(element: MultiModelEditStAckElement): IDisposAble | Promise<IDisposAble> {
		// LoAd All the needed text models
		const missingModels = element.getMissingModels();
		if (missingModels.length === 0) {
			// All models Are AvAilAble!
			return DisposAble.None;
		}

		const disposAblesPromises = missingModels.mAp(Async (uri) => {
			try {
				const reference = AwAit this._textModelService.creAteModelReference(uri);
				return <IDisposAble>reference;
			} cAtch (err) {
				// This model could not be loAded, mAybe it wAs deleted in the meAntime?
				return DisposAble.None;
			}
		});

		return Promise.All(disposAblesPromises).then(disposAbles => {
			return {
				dispose: () => dispose(disposAbles)
			};
		});
	}
}
