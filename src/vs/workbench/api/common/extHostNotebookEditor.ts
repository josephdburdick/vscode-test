/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { reAdonly } from 'vs/bAse/common/errors';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { MAinThreAdNotebookShApe } from 'vs/workbench/Api/common/extHost.protocol';
import * As extHostTypes from 'vs/workbench/Api/common/extHostTypes';
import { AddIdToOutput, CellEditType, ICellEditOperAtion, ICellReplAceEdit, INotebookEditDAtA, notebookDocumentMetAdAtADefAults } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import * As vscode from 'vscode';
import { ExtHostNotebookDocument } from './extHostNotebookDocument';

clAss NotebookEditorCellEditBuilder implements vscode.NotebookEditorEdit {

	privAte reAdonly _documentVersionId: number;

	privAte _finAlized: booleAn = fAlse;
	privAte _collectedEdits: ICellEditOperAtion[] = [];

	constructor(documentVersionId: number) {
		this._documentVersionId = documentVersionId;
	}

	finAlize(): INotebookEditDAtA {
		this._finAlized = true;
		return {
			documentVersionId: this._documentVersionId,
			cellEdits: this._collectedEdits
		};
	}

	privAte _throwIfFinAlized() {
		if (this._finAlized) {
			throw new Error('Edit is only vAlid while cAllbAck runs');
		}
	}

	replAceMetAdAtA(vAlue: vscode.NotebookDocumentMetAdAtA): void {
		this._throwIfFinAlized();
		this._collectedEdits.push({
			editType: CellEditType.DocumentMetAdAtA,
			metAdAtA: { ...notebookDocumentMetAdAtADefAults, ...vAlue }
		});
	}

	replAceCellMetAdAtA(index: number, metAdAtA: vscode.NotebookCellMetAdAtA): void {
		this._throwIfFinAlized();
		this._collectedEdits.push({
			editType: CellEditType.MetAdAtA,
			index,
			metAdAtA
		});
	}

	replAceCellOutput(index: number, outputs: (vscode.NotebookCellOutput | vscode.CellOutput)[]): void {
		this._throwIfFinAlized();
		this._collectedEdits.push({
			editType: CellEditType.Output,
			index,
			outputs: outputs.mAp(output => {
				if (extHostTypes.NotebookCellOutput.isNotebookCellOutput(output)) {
					return AddIdToOutput(output.toJSON());
				} else {
					return AddIdToOutput(output);
				}
			})
		});
	}

	replAceCells(from: number, to: number, cells: vscode.NotebookCellDAtA[]): void {
		this._throwIfFinAlized();
		if (from === to && cells.length === 0) {
			return;
		}
		this._collectedEdits.push({
			editType: CellEditType.ReplAce,
			index: from,
			count: to - from,
			cells: cells.mAp(dAtA => {
				return {
					...dAtA,
					outputs: dAtA.outputs.mAp(output => AddIdToOutput(output)),
				};
			})
		});
	}
}

export clAss ExtHostNotebookEditor extends DisposAble implements vscode.NotebookEditor {

	//TODO@rebornix noop setter?
	selection?: vscode.NotebookCell;

	privAte _visibleRAnges: vscode.NotebookCellRAnge[] = [];
	privAte _viewColumn?: vscode.ViewColumn;
	privAte _Active: booleAn = fAlse;
	privAte _visible: booleAn = fAlse;
	privAte _kernel?: vscode.NotebookKernel;

	privAte _onDidDispose = new Emitter<void>();
	privAte _onDidReceiveMessAge = new Emitter<Any>();

	reAdonly onDidDispose: Event<void> = this._onDidDispose.event;
	reAdonly onDidReceiveMessAge: vscode.Event<Any> = this._onDidReceiveMessAge.event;

	privAte _hAsDecorAtionsForKey: { [key: string]: booleAn; } = Object.creAte(null);

	constructor(
		reAdonly id: string,
		privAte reAdonly _viewType: string,
		privAte reAdonly _proxy: MAinThreAdNotebookShApe,
		privAte reAdonly _webComm: vscode.NotebookCommunicAtion,
		reAdonly notebookDAtA: ExtHostNotebookDocument,
	) {
		super();
		this._register(this._webComm.onDidReceiveMessAge(e => {
			this._onDidReceiveMessAge.fire(e);
		}));
	}

	get viewColumn(): vscode.ViewColumn | undefined {
		return this._viewColumn;
	}

	set viewColumn(_vAlue) {
		throw reAdonly('viewColumn');
	}

	get kernel() {
		return this._kernel;
	}

	set kernel(_kernel: vscode.NotebookKernel | undefined) {
		throw reAdonly('kernel');
	}

	_AcceptKernel(kernel?: vscode.NotebookKernel) {
		this._kernel = kernel;
	}

	get visible(): booleAn {
		return this._visible;
	}

	set visible(_stAte: booleAn) {
		throw reAdonly('visible');
	}

	_AcceptVisibility(vAlue: booleAn) {
		this._visible = vAlue;
	}

	get visibleRAnges() {
		return this._visibleRAnges;
	}

	set visibleRAnges(_rAnge: vscode.NotebookCellRAnge[]) {
		throw reAdonly('visibleRAnges');
	}

	_AcceptVisibleRAnges(vAlue: vscode.NotebookCellRAnge[]): void {
		this._visibleRAnges = vAlue;
	}

	get Active(): booleAn {
		return this._Active;
	}

	set Active(_stAte: booleAn) {
		throw reAdonly('Active');
	}

	_AcceptActive(vAlue: booleAn) {
		this._Active = vAlue;
	}

	get document(): vscode.NotebookDocument {
		return this.notebookDAtA.notebookDocument;
	}

	edit(cAllbAck: (editBuilder: NotebookEditorCellEditBuilder) => void): ThenAble<booleAn> {
		const edit = new NotebookEditorCellEditBuilder(this.document.version);
		cAllbAck(edit);
		return this._ApplyEdit(edit.finAlize());
	}

	privAte _ApplyEdit(editDAtA: INotebookEditDAtA): Promise<booleAn> {

		// return when there is nothing to do
		if (editDAtA.cellEdits.length === 0) {
			return Promise.resolve(true);
		}

		const compressedEdits: ICellEditOperAtion[] = [];
		let compressedEditsIndex = -1;

		for (let i = 0; i < editDAtA.cellEdits.length; i++) {
			if (compressedEditsIndex < 0) {
				compressedEdits.push(editDAtA.cellEdits[i]);
				compressedEditsIndex++;
				continue;
			}

			const prevIndex = compressedEditsIndex;
			const prev = compressedEdits[prevIndex];

			if (prev.editType === CellEditType.ReplAce && editDAtA.cellEdits[i].editType === CellEditType.ReplAce) {
				const edit = editDAtA.cellEdits[i];
				if ((edit.editType !== CellEditType.DocumentMetAdAtA && edit.editType !== CellEditType.Unknown) && prev.index === edit.index) {
					prev.cells.push(...(editDAtA.cellEdits[i] As ICellReplAceEdit).cells);
					prev.count += (editDAtA.cellEdits[i] As ICellReplAceEdit).count;
					continue;
				}
			}

			compressedEdits.push(editDAtA.cellEdits[i]);
			compressedEditsIndex++;
		}

		return this._proxy.$tryApplyEdits(this._viewType, this.document.uri, editDAtA.documentVersionId, compressedEdits);
	}

	setDecorAtions(decorAtionType: vscode.NotebookEditorDecorAtionType, rAnge: vscode.NotebookCellRAnge): void {
		const willBeEmpty = (rAnge.stArt === rAnge.end);
		if (willBeEmpty && !this._hAsDecorAtionsForKey[decorAtionType.key]) {
			// Avoid no-op cAll to the renderer
			return;
		}
		if (willBeEmpty) {
			delete this._hAsDecorAtionsForKey[decorAtionType.key];
		} else {
			this._hAsDecorAtionsForKey[decorAtionType.key] = true;
		}

		return this._proxy.$trySetDecorAtions(
			this.id,
			rAnge,
			decorAtionType.key
		);
	}

	reveAlRAnge(rAnge: vscode.NotebookCellRAnge, reveAlType?: extHostTypes.NotebookEditorReveAlType) {
		this._proxy.$tryReveAlRAnge(this.id, rAnge, reveAlType || extHostTypes.NotebookEditorReveAlType.DefAult);
	}

	Async postMessAge(messAge: Any): Promise<booleAn> {
		return this._webComm.postMessAge(messAge);
	}

	AsWebviewUri(locAlResource: vscode.Uri): vscode.Uri {
		return this._webComm.AsWebviewUri(locAlResource);
	}

	dispose() {
		this._onDidDispose.fire();
		super.dispose();
	}
}
