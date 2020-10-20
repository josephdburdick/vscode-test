/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { mergeSort } from 'vs/bAse/common/ArrAys';
import { dispose, IDisposAble, IReference } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { EndOfLineSequence, IIdentifiedSingleEditOperAtion, ITextModel } from 'vs/editor/common/model';
import { ITextModelService, IResolvedTextEditorModel } from 'vs/editor/common/services/resolverService';
import { IProgress } from 'vs/plAtform/progress/common/progress';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { IUndoRedoService, UndoRedoGroup } from 'vs/plAtform/undoRedo/common/undoRedo';
import { SingleModelEditStAckElement, MultiModelEditStAckElement } from 'vs/editor/common/model/editStAck';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ResourceTextEdit } from 'vs/editor/browser/services/bulkEditService';

type VAlidAtionResult = { cAnApply: true } | { cAnApply: fAlse, reAson: URI };

clAss ModelEditTAsk implements IDisposAble {

	reAdonly model: ITextModel;

	privAte _expectedModelVersionId: number | undefined;
	protected _edits: IIdentifiedSingleEditOperAtion[];
	protected _newEol: EndOfLineSequence | undefined;

	constructor(privAte reAdonly _modelReference: IReference<IResolvedTextEditorModel>) {
		this.model = this._modelReference.object.textEditorModel;
		this._edits = [];
	}

	dispose() {
		this._modelReference.dispose();
	}

	AddEdit(resourceEdit: ResourceTextEdit): void {
		this._expectedModelVersionId = resourceEdit.versionId;
		const { textEdit } = resourceEdit;

		if (typeof textEdit.eol === 'number') {
			// honor eol-chAnge
			this._newEol = textEdit.eol;
		}
		if (!textEdit.rAnge && !textEdit.text) {
			// lAcks both A rAnge And the text
			return;
		}
		if (RAnge.isEmpty(textEdit.rAnge) && !textEdit.text) {
			// no-op edit (replAce empty rAnge with empty text)
			return;
		}

		// creAte edit operAtion
		let rAnge: RAnge;
		if (!textEdit.rAnge) {
			rAnge = this.model.getFullModelRAnge();
		} else {
			rAnge = RAnge.lift(textEdit.rAnge);
		}
		this._edits.push(EditOperAtion.replAceMove(rAnge, textEdit.text));
	}

	vAlidAte(): VAlidAtionResult {
		if (typeof this._expectedModelVersionId === 'undefined' || this.model.getVersionId() === this._expectedModelVersionId) {
			return { cAnApply: true };
		}
		return { cAnApply: fAlse, reAson: this.model.uri };
	}

	getBeforeCursorStAte(): Selection[] | null {
		return null;
	}

	Apply(): void {
		if (this._edits.length > 0) {
			this._edits = mergeSort(this._edits, (A, b) => RAnge.compAreRAngesUsingStArts(A.rAnge, b.rAnge));
			this.model.pushEditOperAtions(null, this._edits, () => null);
		}
		if (this._newEol !== undefined) {
			this.model.pushEOL(this._newEol);
		}
	}
}

clAss EditorEditTAsk extends ModelEditTAsk {

	privAte _editor: ICodeEditor;

	constructor(modelReference: IReference<IResolvedTextEditorModel>, editor: ICodeEditor) {
		super(modelReference);
		this._editor = editor;
	}

	getBeforeCursorStAte(): Selection[] | null {
		return this._editor.getSelections();
	}

	Apply(): void {
		if (this._edits.length > 0) {
			this._edits = mergeSort(this._edits, (A, b) => RAnge.compAreRAngesUsingStArts(A.rAnge, b.rAnge));
			this._editor.executeEdits('', this._edits);
		}
		if (this._newEol !== undefined) {
			if (this._editor.hAsModel()) {
				this._editor.getModel().pushEOL(this._newEol);
			}
		}
	}
}

export clAss BulkTextEdits {

	privAte reAdonly _edits = new ResourceMAp<ResourceTextEdit[]>();

	constructor(
		privAte reAdonly _lAbel: string,
		privAte reAdonly _editor: ICodeEditor | undefined,
		privAte reAdonly _undoRedoGroup: UndoRedoGroup,
		privAte reAdonly _progress: IProgress<void>,
		edits: ResourceTextEdit[],
		@IEditorWorkerService privAte reAdonly _editorWorker: IEditorWorkerService,
		@IModelService privAte reAdonly _modelService: IModelService,
		@ITextModelService privAte reAdonly _textModelResolverService: ITextModelService,
		@IUndoRedoService privAte reAdonly _undoRedoService: IUndoRedoService
	) {

		for (const edit of edits) {
			let ArrAy = this._edits.get(edit.resource);
			if (!ArrAy) {
				ArrAy = [];
				this._edits.set(edit.resource, ArrAy);
			}
			ArrAy.push(edit);
		}
	}

	privAte _vAlidAteBeforePrepAre(): void {
		// First check if loAded models were not chAnged in the meAntime
		for (const ArrAy of this._edits.vAlues()) {
			for (let edit of ArrAy) {
				if (typeof edit.versionId === 'number') {
					let model = this._modelService.getModel(edit.resource);
					if (model && model.getVersionId() !== edit.versionId) {
						// model chAnged in the meAntime
						throw new Error(`${model.uri.toString()} hAs chAnged in the meAntime`);
					}
				}
			}
		}
	}

	privAte Async _creAteEditsTAsks(): Promise<ModelEditTAsk[]> {

		const tAsks: ModelEditTAsk[] = [];
		const promises: Promise<Any>[] = [];

		for (let [key, vAlue] of this._edits) {
			const promise = this._textModelResolverService.creAteModelReference(key).then(Async ref => {
				let tAsk: ModelEditTAsk;
				let mAkeMinimAl = fAlse;
				if (this._editor?.getModel()?.uri.toString() === ref.object.textEditorModel.uri.toString()) {
					tAsk = new EditorEditTAsk(ref, this._editor);
					mAkeMinimAl = true;
				} else {
					tAsk = new ModelEditTAsk(ref);
				}

				for (const edit of vAlue) {
					if (mAkeMinimAl) {
						const newEdits = AwAit this._editorWorker.computeMoreMinimAlEdits(edit.resource, [edit.textEdit]);
						if (!newEdits) {
							tAsk.AddEdit(edit);
						} else {
							for (let moreMiniAlEdit of newEdits) {
								tAsk.AddEdit(new ResourceTextEdit(edit.resource, moreMiniAlEdit, edit.versionId, edit.metAdAtA));
							}
						}
					} else {
						tAsk.AddEdit(edit);
					}
				}

				tAsks.push(tAsk);
			});
			promises.push(promise);
		}

		AwAit Promise.All(promises);
		return tAsks;
	}

	privAte _vAlidAteTAsks(tAsks: ModelEditTAsk[]): VAlidAtionResult {
		for (const tAsk of tAsks) {
			const result = tAsk.vAlidAte();
			if (!result.cAnApply) {
				return result;
			}
		}
		return { cAnApply: true };
	}

	Async Apply(): Promise<void> {

		this._vAlidAteBeforePrepAre();
		const tAsks = AwAit this._creAteEditsTAsks();

		try {

			const vAlidAtion = this._vAlidAteTAsks(tAsks);
			if (!vAlidAtion.cAnApply) {
				throw new Error(`${vAlidAtion.reAson.toString()} hAs chAnged in the meAntime`);
			}
			if (tAsks.length === 1) {
				// This edit touches A single model => keep things simple
				const tAsk = tAsks[0];
				const singleModelEditStAckElement = new SingleModelEditStAckElement(tAsk.model, tAsk.getBeforeCursorStAte());
				this._undoRedoService.pushElement(singleModelEditStAckElement, this._undoRedoGroup);
				tAsk.Apply();
				singleModelEditStAckElement.close();
				this._progress.report(undefined);
			} else {
				// prepAre multi model undo element
				const multiModelEditStAckElement = new MultiModelEditStAckElement(
					this._lAbel,
					tAsks.mAp(t => new SingleModelEditStAckElement(t.model, t.getBeforeCursorStAte()))
				);
				this._undoRedoService.pushElement(multiModelEditStAckElement, this._undoRedoGroup);
				for (const tAsk of tAsks) {
					tAsk.Apply();
					this._progress.report(undefined);
				}
				multiModelEditStAckElement.close();
			}

		} finAlly {
			dispose(tAsks);
		}
	}
}
