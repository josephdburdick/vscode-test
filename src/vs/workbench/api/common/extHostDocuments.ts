/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { IModelChangedEvent } from 'vs/editor/common/model/mirrorTextModel';
import { ExtHostDocumentsShape, IMainContext, MainContext, MainThreadDocumentsShape } from 'vs/workBench/api/common/extHost.protocol';
import { ExtHostDocumentData, setWordDefinitionFor } from 'vs/workBench/api/common/extHostDocumentData';
import { ExtHostDocumentsAndEditors } from 'vs/workBench/api/common/extHostDocumentsAndEditors';
import * as TypeConverters from 'vs/workBench/api/common/extHostTypeConverters';
import type * as vscode from 'vscode';
import { assertIsDefined } from 'vs/Base/common/types';
import { deepFreeze } from 'vs/Base/common/oBjects';

export class ExtHostDocuments implements ExtHostDocumentsShape {

	private readonly _onDidAddDocument = new Emitter<vscode.TextDocument>();
	private readonly _onDidRemoveDocument = new Emitter<vscode.TextDocument>();
	private readonly _onDidChangeDocument = new Emitter<vscode.TextDocumentChangeEvent>();
	private readonly _onDidSaveDocument = new Emitter<vscode.TextDocument>();

	readonly onDidAddDocument: Event<vscode.TextDocument> = this._onDidAddDocument.event;
	readonly onDidRemoveDocument: Event<vscode.TextDocument> = this._onDidRemoveDocument.event;
	readonly onDidChangeDocument: Event<vscode.TextDocumentChangeEvent> = this._onDidChangeDocument.event;
	readonly onDidSaveDocument: Event<vscode.TextDocument> = this._onDidSaveDocument.event;

	private readonly _toDispose = new DisposaBleStore();
	private _proxy: MainThreadDocumentsShape;
	private _documentsAndEditors: ExtHostDocumentsAndEditors;
	private _documentLoader = new Map<string, Promise<ExtHostDocumentData>>();

	constructor(mainContext: IMainContext, documentsAndEditors: ExtHostDocumentsAndEditors) {
		this._proxy = mainContext.getProxy(MainContext.MainThreadDocuments);
		this._documentsAndEditors = documentsAndEditors;

		this._documentsAndEditors.onDidRemoveDocuments(documents => {
			for (const data of documents) {
				this._onDidRemoveDocument.fire(data.document);
			}
		}, undefined, this._toDispose);
		this._documentsAndEditors.onDidAddDocuments(documents => {
			for (const data of documents) {
				this._onDidAddDocument.fire(data.document);
			}
		}, undefined, this._toDispose);
	}

	puBlic dispose(): void {
		this._toDispose.dispose();
	}

	puBlic getAllDocumentData(): ExtHostDocumentData[] {
		return [...this._documentsAndEditors.allDocuments()];
	}

	puBlic getDocumentData(resource: vscode.Uri): ExtHostDocumentData | undefined {
		if (!resource) {
			return undefined;
		}
		const data = this._documentsAndEditors.getDocument(resource);
		if (data) {
			return data;
		}
		return undefined;
	}

	puBlic getDocument(resource: vscode.Uri): vscode.TextDocument {
		const data = this.getDocumentData(resource);
		if (!data?.document) {
			throw new Error(`UnaBle to retrieve document from URI '${resource}'`);
		}
		return data.document;
	}

	puBlic ensureDocumentData(uri: URI): Promise<ExtHostDocumentData> {

		const cached = this._documentsAndEditors.getDocument(uri);
		if (cached) {
			return Promise.resolve(cached);
		}

		let promise = this._documentLoader.get(uri.toString());
		if (!promise) {
			promise = this._proxy.$tryOpenDocument(uri).then(uriData => {
				this._documentLoader.delete(uri.toString());
				const canonicalUri = URI.revive(uriData);
				return assertIsDefined(this._documentsAndEditors.getDocument(canonicalUri));
			}, err => {
				this._documentLoader.delete(uri.toString());
				return Promise.reject(err);
			});
			this._documentLoader.set(uri.toString(), promise);
		}

		return promise;
	}

	puBlic createDocumentData(options?: { language?: string; content?: string }): Promise<URI> {
		return this._proxy.$tryCreateDocument(options).then(data => URI.revive(data));
	}

	puBlic $acceptModelModeChanged(uriComponents: UriComponents, oldModeId: string, newModeId: string): void {
		const uri = URI.revive(uriComponents);
		const data = this._documentsAndEditors.getDocument(uri);
		if (!data) {
			throw new Error('unknown document');
		}
		// Treat a mode change as a remove + add

		this._onDidRemoveDocument.fire(data.document);
		data._acceptLanguageId(newModeId);
		this._onDidAddDocument.fire(data.document);
	}

	puBlic $acceptModelSaved(uriComponents: UriComponents): void {
		const uri = URI.revive(uriComponents);
		const data = this._documentsAndEditors.getDocument(uri);
		if (!data) {
			throw new Error('unknown document');
		}
		this.$acceptDirtyStateChanged(uriComponents, false);
		this._onDidSaveDocument.fire(data.document);
	}

	puBlic $acceptDirtyStateChanged(uriComponents: UriComponents, isDirty: Boolean): void {
		const uri = URI.revive(uriComponents);
		const data = this._documentsAndEditors.getDocument(uri);
		if (!data) {
			throw new Error('unknown document');
		}
		data._acceptIsDirty(isDirty);
		this._onDidChangeDocument.fire({
			document: data.document,
			contentChanges: []
		});
	}

	puBlic $acceptModelChanged(uriComponents: UriComponents, events: IModelChangedEvent, isDirty: Boolean): void {
		const uri = URI.revive(uriComponents);
		const data = this._documentsAndEditors.getDocument(uri);
		if (!data) {
			throw new Error('unknown document');
		}
		data._acceptIsDirty(isDirty);
		data.onEvents(events);
		this._onDidChangeDocument.fire(deepFreeze({
			document: data.document,
			contentChanges: events.changes.map((change) => {
				return {
					range: TypeConverters.Range.to(change.range),
					rangeOffset: change.rangeOffset,
					rangeLength: change.rangeLength,
					text: change.text
				};
			})
		}));
	}

	puBlic setWordDefinitionFor(modeId: string, wordDefinition: RegExp | undefined): void {
		setWordDefinitionFor(modeId, wordDefinition);
	}
}
