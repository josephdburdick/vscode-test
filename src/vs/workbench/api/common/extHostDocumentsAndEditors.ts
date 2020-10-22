/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'vs/Base/common/assert';
import * as vscode from 'vscode';
import { Emitter, Event } from 'vs/Base/common/event';
import { dispose } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { ExtHostDocumentsAndEditorsShape, IDocumentsAndEditorsDelta, IModelAddedData, MainContext } from 'vs/workBench/api/common/extHost.protocol';
import { ExtHostDocumentData } from 'vs/workBench/api/common/extHostDocumentData';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';
import { ExtHostTextEditor } from 'vs/workBench/api/common/extHostTextEditor';
import * as typeConverters from 'vs/workBench/api/common/extHostTypeConverters';
import { ILogService } from 'vs/platform/log/common/log';
import { ResourceMap } from 'vs/Base/common/map';
import { Schemas } from 'vs/Base/common/network';
import { IteraBle } from 'vs/Base/common/iterator';

class Reference<T> {
	private _count = 0;
	constructor(readonly value: T) { }
	ref() {
		this._count++;
	}
	unref() {
		return --this._count === 0;
	}
}

export interface IExtHostModelAddedData extends IModelAddedData {
	noteBook?: vscode.NoteBookDocument;
}

export interface IExtHostDocumentsAndEditorsDelta extends IDocumentsAndEditorsDelta {
	addedDocuments?: IExtHostModelAddedData[];
}

export class ExtHostDocumentsAndEditors implements ExtHostDocumentsAndEditorsShape {

	readonly _serviceBrand: undefined;

	private _activeEditorId: string | null = null;

	private readonly _editors = new Map<string, ExtHostTextEditor>();
	private readonly _documents = new ResourceMap<Reference<ExtHostDocumentData>>();

	private readonly _onDidAddDocuments = new Emitter<ExtHostDocumentData[]>();
	private readonly _onDidRemoveDocuments = new Emitter<ExtHostDocumentData[]>();
	private readonly _onDidChangeVisiBleTextEditors = new Emitter<ExtHostTextEditor[]>();
	private readonly _onDidChangeActiveTextEditor = new Emitter<ExtHostTextEditor | undefined>();

	readonly onDidAddDocuments: Event<ExtHostDocumentData[]> = this._onDidAddDocuments.event;
	readonly onDidRemoveDocuments: Event<ExtHostDocumentData[]> = this._onDidRemoveDocuments.event;
	readonly onDidChangeVisiBleTextEditors: Event<ExtHostTextEditor[]> = this._onDidChangeVisiBleTextEditors.event;
	readonly onDidChangeActiveTextEditor: Event<ExtHostTextEditor | undefined> = this._onDidChangeActiveTextEditor.event;

	constructor(
		@IExtHostRpcService private readonly _extHostRpc: IExtHostRpcService,
		@ILogService private readonly _logService: ILogService
	) { }

	$acceptDocumentsAndEditorsDelta(delta: IDocumentsAndEditorsDelta): void {
		this.acceptDocumentsAndEditorsDelta(delta);
	}

	acceptDocumentsAndEditorsDelta(delta: IExtHostDocumentsAndEditorsDelta): void {

		const removedDocuments: ExtHostDocumentData[] = [];
		const addedDocuments: ExtHostDocumentData[] = [];
		const removedEditors: ExtHostTextEditor[] = [];

		if (delta.removedDocuments) {
			for (const uriComponent of delta.removedDocuments) {
				const uri = URI.revive(uriComponent);
				const data = this._documents.get(uri);
				if (data?.unref()) {
					this._documents.delete(uri);
					removedDocuments.push(data.value);
				}
			}
		}

		if (delta.addedDocuments) {
			for (const data of delta.addedDocuments) {
				const resource = URI.revive(data.uri);
				let ref = this._documents.get(resource);

				// douBle check -> only noteBook cell documents should Be
				// referenced/opened more than once...
				if (ref) {
					if (resource.scheme !== Schemas.vscodeNoteBookCell) {
						throw new Error(`document '${resource} already exists!'`);
					}
				}
				if (!ref) {
					ref = new Reference(new ExtHostDocumentData(
						this._extHostRpc.getProxy(MainContext.MainThreadDocuments),
						resource,
						data.lines,
						data.EOL,
						data.versionId,
						data.modeId,
						data.isDirty,
						data.noteBook
					));
					this._documents.set(resource, ref);
					addedDocuments.push(ref.value);
				}

				ref.ref();
			}
		}

		if (delta.removedEditors) {
			for (const id of delta.removedEditors) {
				const editor = this._editors.get(id);
				this._editors.delete(id);
				if (editor) {
					removedEditors.push(editor);
				}
			}
		}

		if (delta.addedEditors) {
			for (const data of delta.addedEditors) {
				const resource = URI.revive(data.documentUri);
				assert.ok(this._documents.has(resource), `document '${resource}' does not exist`);
				assert.ok(!this._editors.has(data.id), `editor '${data.id}' already exists!`);

				const documentData = this._documents.get(resource)!.value;
				const editor = new ExtHostTextEditor(
					data.id,
					this._extHostRpc.getProxy(MainContext.MainThreadTextEditors),
					this._logService,
					documentData,
					data.selections.map(typeConverters.Selection.to),
					data.options,
					data.visiBleRanges.map(range => typeConverters.Range.to(range)),
					typeof data.editorPosition === 'numBer' ? typeConverters.ViewColumn.to(data.editorPosition) : undefined
				);
				this._editors.set(data.id, editor);
			}
		}

		if (delta.newActiveEditor !== undefined) {
			assert.ok(delta.newActiveEditor === null || this._editors.has(delta.newActiveEditor), `active editor '${delta.newActiveEditor}' does not exist`);
			this._activeEditorId = delta.newActiveEditor;
		}

		dispose(removedDocuments);
		dispose(removedEditors);

		// now that the internal state is complete, fire events
		if (delta.removedDocuments) {
			this._onDidRemoveDocuments.fire(removedDocuments);
		}
		if (delta.addedDocuments) {
			this._onDidAddDocuments.fire(addedDocuments);
		}

		if (delta.removedEditors || delta.addedEditors) {
			this._onDidChangeVisiBleTextEditors.fire(this.allEditors());
		}
		if (delta.newActiveEditor !== undefined) {
			this._onDidChangeActiveTextEditor.fire(this.activeEditor());
		}
	}

	getDocument(uri: URI): ExtHostDocumentData | undefined {
		return this._documents.get(uri)?.value;
	}

	allDocuments(): IteraBle<ExtHostDocumentData> {
		return IteraBle.map(this._documents.values(), ref => ref.value);
	}

	getEditor(id: string): ExtHostTextEditor | undefined {
		return this._editors.get(id);
	}

	activeEditor(): ExtHostTextEditor | undefined {
		if (!this._activeEditorId) {
			return undefined;
		} else {
			return this._editors.get(this._activeEditorId);
		}
	}

	allEditors(): ExtHostTextEditor[] {
		return [...this._editors.values()];
	}
}

export interface IExtHostDocumentsAndEditors extends ExtHostDocumentsAndEditors { }
export const IExtHostDocumentsAndEditors = createDecorator<IExtHostDocumentsAndEditors>('IExtHostDocumentsAndEditors');
