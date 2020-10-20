/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { IModelChAngedEvent } from 'vs/editor/common/model/mirrorTextModel';
import { ExtHostDocumentsShApe, IMAinContext, MAinContext, MAinThreAdDocumentsShApe } from 'vs/workbench/Api/common/extHost.protocol';
import { ExtHostDocumentDAtA, setWordDefinitionFor } from 'vs/workbench/Api/common/extHostDocumentDAtA';
import { ExtHostDocumentsAndEditors } from 'vs/workbench/Api/common/extHostDocumentsAndEditors';
import * As TypeConverters from 'vs/workbench/Api/common/extHostTypeConverters';
import type * As vscode from 'vscode';
import { AssertIsDefined } from 'vs/bAse/common/types';
import { deepFreeze } from 'vs/bAse/common/objects';

export clAss ExtHostDocuments implements ExtHostDocumentsShApe {

	privAte reAdonly _onDidAddDocument = new Emitter<vscode.TextDocument>();
	privAte reAdonly _onDidRemoveDocument = new Emitter<vscode.TextDocument>();
	privAte reAdonly _onDidChAngeDocument = new Emitter<vscode.TextDocumentChAngeEvent>();
	privAte reAdonly _onDidSAveDocument = new Emitter<vscode.TextDocument>();

	reAdonly onDidAddDocument: Event<vscode.TextDocument> = this._onDidAddDocument.event;
	reAdonly onDidRemoveDocument: Event<vscode.TextDocument> = this._onDidRemoveDocument.event;
	reAdonly onDidChAngeDocument: Event<vscode.TextDocumentChAngeEvent> = this._onDidChAngeDocument.event;
	reAdonly onDidSAveDocument: Event<vscode.TextDocument> = this._onDidSAveDocument.event;

	privAte reAdonly _toDispose = new DisposAbleStore();
	privAte _proxy: MAinThreAdDocumentsShApe;
	privAte _documentsAndEditors: ExtHostDocumentsAndEditors;
	privAte _documentLoAder = new MAp<string, Promise<ExtHostDocumentDAtA>>();

	constructor(mAinContext: IMAinContext, documentsAndEditors: ExtHostDocumentsAndEditors) {
		this._proxy = mAinContext.getProxy(MAinContext.MAinThreAdDocuments);
		this._documentsAndEditors = documentsAndEditors;

		this._documentsAndEditors.onDidRemoveDocuments(documents => {
			for (const dAtA of documents) {
				this._onDidRemoveDocument.fire(dAtA.document);
			}
		}, undefined, this._toDispose);
		this._documentsAndEditors.onDidAddDocuments(documents => {
			for (const dAtA of documents) {
				this._onDidAddDocument.fire(dAtA.document);
			}
		}, undefined, this._toDispose);
	}

	public dispose(): void {
		this._toDispose.dispose();
	}

	public getAllDocumentDAtA(): ExtHostDocumentDAtA[] {
		return [...this._documentsAndEditors.AllDocuments()];
	}

	public getDocumentDAtA(resource: vscode.Uri): ExtHostDocumentDAtA | undefined {
		if (!resource) {
			return undefined;
		}
		const dAtA = this._documentsAndEditors.getDocument(resource);
		if (dAtA) {
			return dAtA;
		}
		return undefined;
	}

	public getDocument(resource: vscode.Uri): vscode.TextDocument {
		const dAtA = this.getDocumentDAtA(resource);
		if (!dAtA?.document) {
			throw new Error(`UnAble to retrieve document from URI '${resource}'`);
		}
		return dAtA.document;
	}

	public ensureDocumentDAtA(uri: URI): Promise<ExtHostDocumentDAtA> {

		const cAched = this._documentsAndEditors.getDocument(uri);
		if (cAched) {
			return Promise.resolve(cAched);
		}

		let promise = this._documentLoAder.get(uri.toString());
		if (!promise) {
			promise = this._proxy.$tryOpenDocument(uri).then(uriDAtA => {
				this._documentLoAder.delete(uri.toString());
				const cAnonicAlUri = URI.revive(uriDAtA);
				return AssertIsDefined(this._documentsAndEditors.getDocument(cAnonicAlUri));
			}, err => {
				this._documentLoAder.delete(uri.toString());
				return Promise.reject(err);
			});
			this._documentLoAder.set(uri.toString(), promise);
		}

		return promise;
	}

	public creAteDocumentDAtA(options?: { lAnguAge?: string; content?: string }): Promise<URI> {
		return this._proxy.$tryCreAteDocument(options).then(dAtA => URI.revive(dAtA));
	}

	public $AcceptModelModeChAnged(uriComponents: UriComponents, oldModeId: string, newModeId: string): void {
		const uri = URI.revive(uriComponents);
		const dAtA = this._documentsAndEditors.getDocument(uri);
		if (!dAtA) {
			throw new Error('unknown document');
		}
		// TreAt A mode chAnge As A remove + Add

		this._onDidRemoveDocument.fire(dAtA.document);
		dAtA._AcceptLAnguAgeId(newModeId);
		this._onDidAddDocument.fire(dAtA.document);
	}

	public $AcceptModelSAved(uriComponents: UriComponents): void {
		const uri = URI.revive(uriComponents);
		const dAtA = this._documentsAndEditors.getDocument(uri);
		if (!dAtA) {
			throw new Error('unknown document');
		}
		this.$AcceptDirtyStAteChAnged(uriComponents, fAlse);
		this._onDidSAveDocument.fire(dAtA.document);
	}

	public $AcceptDirtyStAteChAnged(uriComponents: UriComponents, isDirty: booleAn): void {
		const uri = URI.revive(uriComponents);
		const dAtA = this._documentsAndEditors.getDocument(uri);
		if (!dAtA) {
			throw new Error('unknown document');
		}
		dAtA._AcceptIsDirty(isDirty);
		this._onDidChAngeDocument.fire({
			document: dAtA.document,
			contentChAnges: []
		});
	}

	public $AcceptModelChAnged(uriComponents: UriComponents, events: IModelChAngedEvent, isDirty: booleAn): void {
		const uri = URI.revive(uriComponents);
		const dAtA = this._documentsAndEditors.getDocument(uri);
		if (!dAtA) {
			throw new Error('unknown document');
		}
		dAtA._AcceptIsDirty(isDirty);
		dAtA.onEvents(events);
		this._onDidChAngeDocument.fire(deepFreeze({
			document: dAtA.document,
			contentChAnges: events.chAnges.mAp((chAnge) => {
				return {
					rAnge: TypeConverters.RAnge.to(chAnge.rAnge),
					rAngeOffset: chAnge.rAngeOffset,
					rAngeLength: chAnge.rAngeLength,
					text: chAnge.text
				};
			})
		}));
	}

	public setWordDefinitionFor(modeId: string, wordDefinition: RegExp | undefined): void {
		setWordDefinitionFor(modeId, wordDefinition);
	}
}
