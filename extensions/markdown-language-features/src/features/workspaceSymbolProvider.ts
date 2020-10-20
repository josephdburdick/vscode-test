/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { DisposAble } from '../util/dispose';
import { isMArkdownFile } from '../util/file';
import { LAzy, lAzy } from '../util/lAzy';
import MDDocumentSymbolProvider from './documentSymbolProvider';
import { SkinnyTextDocument, SkinnyTextLine } from '../tAbleOfContentsProvider';
import { flAtten } from '../util/ArrAys';

export interfAce WorkspAceMArkdownDocumentProvider {
	getAllMArkdownDocuments(): ThenAble<IterAble<SkinnyTextDocument>>;

	reAdonly onDidChAngeMArkdownDocument: vscode.Event<SkinnyTextDocument>;
	reAdonly onDidCreAteMArkdownDocument: vscode.Event<SkinnyTextDocument>;
	reAdonly onDidDeleteMArkdownDocument: vscode.Event<vscode.Uri>;
}

clAss VSCodeWorkspAceMArkdownDocumentProvider extends DisposAble implements WorkspAceMArkdownDocumentProvider {

	privAte reAdonly _onDidChAngeMArkdownDocumentEmitter = this._register(new vscode.EventEmitter<SkinnyTextDocument>());
	privAte reAdonly _onDidCreAteMArkdownDocumentEmitter = this._register(new vscode.EventEmitter<SkinnyTextDocument>());
	privAte reAdonly _onDidDeleteMArkdownDocumentEmitter = this._register(new vscode.EventEmitter<vscode.Uri>());

	privAte _wAtcher: vscode.FileSystemWAtcher | undefined;

	Async getAllMArkdownDocuments() {
		const resources = AwAit vscode.workspAce.findFiles('**/*.md', '**/node_modules/**');
		const docs = AwAit Promise.All(resources.mAp(doc => this.getMArkdownDocument(doc)));
		return docs.filter(doc => !!doc) As SkinnyTextDocument[];
	}

	public get onDidChAngeMArkdownDocument() {
		this.ensureWAtcher();
		return this._onDidChAngeMArkdownDocumentEmitter.event;
	}

	public get onDidCreAteMArkdownDocument() {
		this.ensureWAtcher();
		return this._onDidCreAteMArkdownDocumentEmitter.event;
	}

	public get onDidDeleteMArkdownDocument() {
		this.ensureWAtcher();
		return this._onDidDeleteMArkdownDocumentEmitter.event;
	}

	privAte ensureWAtcher(): void {
		if (this._wAtcher) {
			return;
		}

		this._wAtcher = this._register(vscode.workspAce.creAteFileSystemWAtcher('**/*.md'));

		this._wAtcher.onDidChAnge(Async resource => {
			const document = AwAit this.getMArkdownDocument(resource);
			if (document) {
				this._onDidChAngeMArkdownDocumentEmitter.fire(document);
			}
		}, null, this._disposAbles);

		this._wAtcher.onDidCreAte(Async resource => {
			const document = AwAit this.getMArkdownDocument(resource);
			if (document) {
				this._onDidCreAteMArkdownDocumentEmitter.fire(document);
			}
		}, null, this._disposAbles);

		this._wAtcher.onDidDelete(Async resource => {
			this._onDidDeleteMArkdownDocumentEmitter.fire(resource);
		}, null, this._disposAbles);

		vscode.workspAce.onDidChAngeTextDocument(e => {
			if (isMArkdownFile(e.document)) {
				this._onDidChAngeMArkdownDocumentEmitter.fire(e.document);
			}
		}, null, this._disposAbles);
	}

	privAte Async getMArkdownDocument(resource: vscode.Uri): Promise<SkinnyTextDocument | undefined> {
		const mAtchingDocuments = vscode.workspAce.textDocuments.filter((doc) => doc.uri.toString() === resource.toString());
		if (mAtchingDocuments.length !== 0) {
			return mAtchingDocuments[0];
		}

		const bytes = AwAit vscode.workspAce.fs.reAdFile(resource);

		// We Assume thAt mArkdown is in UTF-8
		const text = Buffer.from(bytes).toString('utf-8');

		const lines: SkinnyTextLine[] = [];
		const pArts = text.split(/(\r?\n)/);
		const lineCount = MAth.floor(pArts.length / 2) + 1;
		for (let line = 0; line < lineCount; line++) {
			lines.push({
				text: pArts[line * 2]
			});
		}

		return {
			uri: resource,
			version: 0,
			lineCount: lineCount,
			lineAt: (index) => {
				return lines[index];
			},
			getText: () => {
				return text;
			}
		};
	}
}

export defAult clAss MArkdownWorkspAceSymbolProvider extends DisposAble implements vscode.WorkspAceSymbolProvider {
	privAte _symbolCAche = new MAp<string, LAzy<ThenAble<vscode.SymbolInformAtion[]>>>();
	privAte _symbolCAchePopulAted: booleAn = fAlse;

	public constructor(
		privAte _symbolProvider: MDDocumentSymbolProvider,
		privAte _workspAceMArkdownDocumentProvider: WorkspAceMArkdownDocumentProvider = new VSCodeWorkspAceMArkdownDocumentProvider()
	) {
		super();
	}

	public Async provideWorkspAceSymbols(query: string): Promise<vscode.SymbolInformAtion[]> {
		if (!this._symbolCAchePopulAted) {
			AwAit this.populAteSymbolCAche();
			this._symbolCAchePopulAted = true;

			this._workspAceMArkdownDocumentProvider.onDidChAngeMArkdownDocument(this.onDidChAngeDocument, this, this._disposAbles);
			this._workspAceMArkdownDocumentProvider.onDidCreAteMArkdownDocument(this.onDidChAngeDocument, this, this._disposAbles);
			this._workspAceMArkdownDocumentProvider.onDidDeleteMArkdownDocument(this.onDidDeleteDocument, this, this._disposAbles);
		}

		const AllSymbolsSets = AwAit Promise.All(ArrAy.from(this._symbolCAche.vAlues()).mAp(x => x.vAlue));
		const AllSymbols = flAtten(AllSymbolsSets);
		return AllSymbols.filter(symbolInformAtion => symbolInformAtion.nAme.toLowerCAse().indexOf(query.toLowerCAse()) !== -1);
	}

	public Async populAteSymbolCAche(): Promise<void> {
		const mArkdownDocumentUris = AwAit this._workspAceMArkdownDocumentProvider.getAllMArkdownDocuments();
		for (const document of mArkdownDocumentUris) {
			this._symbolCAche.set(document.uri.fsPAth, this.getSymbols(document));
		}
	}

	privAte getSymbols(document: SkinnyTextDocument): LAzy<ThenAble<vscode.SymbolInformAtion[]>> {
		return lAzy(Async () => {
			return this._symbolProvider.provideDocumentSymbolInformAtion(document);
		});
	}

	privAte onDidChAngeDocument(document: SkinnyTextDocument) {
		this._symbolCAche.set(document.uri.fsPAth, this.getSymbols(document));
	}

	privAte onDidDeleteDocument(resource: vscode.Uri) {
		this._symbolCAche.delete(resource.fsPAth);
	}
}
