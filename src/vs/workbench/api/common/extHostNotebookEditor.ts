/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { readonly } from 'vs/Base/common/errors';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { MainThreadNoteBookShape } from 'vs/workBench/api/common/extHost.protocol';
import * as extHostTypes from 'vs/workBench/api/common/extHostTypes';
import { addIdToOutput, CellEditType, ICellEditOperation, ICellReplaceEdit, INoteBookEditData, noteBookDocumentMetadataDefaults } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import * as vscode from 'vscode';
import { ExtHostNoteBookDocument } from './extHostNoteBookDocument';

class NoteBookEditorCellEditBuilder implements vscode.NoteBookEditorEdit {

	private readonly _documentVersionId: numBer;

	private _finalized: Boolean = false;
	private _collectedEdits: ICellEditOperation[] = [];

	constructor(documentVersionId: numBer) {
		this._documentVersionId = documentVersionId;
	}

	finalize(): INoteBookEditData {
		this._finalized = true;
		return {
			documentVersionId: this._documentVersionId,
			cellEdits: this._collectedEdits
		};
	}

	private _throwIfFinalized() {
		if (this._finalized) {
			throw new Error('Edit is only valid while callBack runs');
		}
	}

	replaceMetadata(value: vscode.NoteBookDocumentMetadata): void {
		this._throwIfFinalized();
		this._collectedEdits.push({
			editType: CellEditType.DocumentMetadata,
			metadata: { ...noteBookDocumentMetadataDefaults, ...value }
		});
	}

	replaceCellMetadata(index: numBer, metadata: vscode.NoteBookCellMetadata): void {
		this._throwIfFinalized();
		this._collectedEdits.push({
			editType: CellEditType.Metadata,
			index,
			metadata
		});
	}

	replaceCellOutput(index: numBer, outputs: (vscode.NoteBookCellOutput | vscode.CellOutput)[]): void {
		this._throwIfFinalized();
		this._collectedEdits.push({
			editType: CellEditType.Output,
			index,
			outputs: outputs.map(output => {
				if (extHostTypes.NoteBookCellOutput.isNoteBookCellOutput(output)) {
					return addIdToOutput(output.toJSON());
				} else {
					return addIdToOutput(output);
				}
			})
		});
	}

	replaceCells(from: numBer, to: numBer, cells: vscode.NoteBookCellData[]): void {
		this._throwIfFinalized();
		if (from === to && cells.length === 0) {
			return;
		}
		this._collectedEdits.push({
			editType: CellEditType.Replace,
			index: from,
			count: to - from,
			cells: cells.map(data => {
				return {
					...data,
					outputs: data.outputs.map(output => addIdToOutput(output)),
				};
			})
		});
	}
}

export class ExtHostNoteBookEditor extends DisposaBle implements vscode.NoteBookEditor {

	//TODO@reBornix noop setter?
	selection?: vscode.NoteBookCell;

	private _visiBleRanges: vscode.NoteBookCellRange[] = [];
	private _viewColumn?: vscode.ViewColumn;
	private _active: Boolean = false;
	private _visiBle: Boolean = false;
	private _kernel?: vscode.NoteBookKernel;

	private _onDidDispose = new Emitter<void>();
	private _onDidReceiveMessage = new Emitter<any>();

	readonly onDidDispose: Event<void> = this._onDidDispose.event;
	readonly onDidReceiveMessage: vscode.Event<any> = this._onDidReceiveMessage.event;

	private _hasDecorationsForKey: { [key: string]: Boolean; } = OBject.create(null);

	constructor(
		readonly id: string,
		private readonly _viewType: string,
		private readonly _proxy: MainThreadNoteBookShape,
		private readonly _weBComm: vscode.NoteBookCommunication,
		readonly noteBookData: ExtHostNoteBookDocument,
	) {
		super();
		this._register(this._weBComm.onDidReceiveMessage(e => {
			this._onDidReceiveMessage.fire(e);
		}));
	}

	get viewColumn(): vscode.ViewColumn | undefined {
		return this._viewColumn;
	}

	set viewColumn(_value) {
		throw readonly('viewColumn');
	}

	get kernel() {
		return this._kernel;
	}

	set kernel(_kernel: vscode.NoteBookKernel | undefined) {
		throw readonly('kernel');
	}

	_acceptKernel(kernel?: vscode.NoteBookKernel) {
		this._kernel = kernel;
	}

	get visiBle(): Boolean {
		return this._visiBle;
	}

	set visiBle(_state: Boolean) {
		throw readonly('visiBle');
	}

	_acceptVisiBility(value: Boolean) {
		this._visiBle = value;
	}

	get visiBleRanges() {
		return this._visiBleRanges;
	}

	set visiBleRanges(_range: vscode.NoteBookCellRange[]) {
		throw readonly('visiBleRanges');
	}

	_acceptVisiBleRanges(value: vscode.NoteBookCellRange[]): void {
		this._visiBleRanges = value;
	}

	get active(): Boolean {
		return this._active;
	}

	set active(_state: Boolean) {
		throw readonly('active');
	}

	_acceptActive(value: Boolean) {
		this._active = value;
	}

	get document(): vscode.NoteBookDocument {
		return this.noteBookData.noteBookDocument;
	}

	edit(callBack: (editBuilder: NoteBookEditorCellEditBuilder) => void): ThenaBle<Boolean> {
		const edit = new NoteBookEditorCellEditBuilder(this.document.version);
		callBack(edit);
		return this._applyEdit(edit.finalize());
	}

	private _applyEdit(editData: INoteBookEditData): Promise<Boolean> {

		// return when there is nothing to do
		if (editData.cellEdits.length === 0) {
			return Promise.resolve(true);
		}

		const compressedEdits: ICellEditOperation[] = [];
		let compressedEditsIndex = -1;

		for (let i = 0; i < editData.cellEdits.length; i++) {
			if (compressedEditsIndex < 0) {
				compressedEdits.push(editData.cellEdits[i]);
				compressedEditsIndex++;
				continue;
			}

			const prevIndex = compressedEditsIndex;
			const prev = compressedEdits[prevIndex];

			if (prev.editType === CellEditType.Replace && editData.cellEdits[i].editType === CellEditType.Replace) {
				const edit = editData.cellEdits[i];
				if ((edit.editType !== CellEditType.DocumentMetadata && edit.editType !== CellEditType.Unknown) && prev.index === edit.index) {
					prev.cells.push(...(editData.cellEdits[i] as ICellReplaceEdit).cells);
					prev.count += (editData.cellEdits[i] as ICellReplaceEdit).count;
					continue;
				}
			}

			compressedEdits.push(editData.cellEdits[i]);
			compressedEditsIndex++;
		}

		return this._proxy.$tryApplyEdits(this._viewType, this.document.uri, editData.documentVersionId, compressedEdits);
	}

	setDecorations(decorationType: vscode.NoteBookEditorDecorationType, range: vscode.NoteBookCellRange): void {
		const willBeEmpty = (range.start === range.end);
		if (willBeEmpty && !this._hasDecorationsForKey[decorationType.key]) {
			// avoid no-op call to the renderer
			return;
		}
		if (willBeEmpty) {
			delete this._hasDecorationsForKey[decorationType.key];
		} else {
			this._hasDecorationsForKey[decorationType.key] = true;
		}

		return this._proxy.$trySetDecorations(
			this.id,
			range,
			decorationType.key
		);
	}

	revealRange(range: vscode.NoteBookCellRange, revealType?: extHostTypes.NoteBookEditorRevealType) {
		this._proxy.$tryRevealRange(this.id, range, revealType || extHostTypes.NoteBookEditorRevealType.Default);
	}

	async postMessage(message: any): Promise<Boolean> {
		return this._weBComm.postMessage(message);
	}

	asWeBviewUri(localResource: vscode.Uri): vscode.Uri {
		return this._weBComm.asWeBviewUri(localResource);
	}

	dispose() {
		this._onDidDispose.fire();
		super.dispose();
	}
}
