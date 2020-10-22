/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { DisposaBle } from '../util/dispose';
import { isMarkdownFile } from '../util/file';
import { Lazy, lazy } from '../util/lazy';
import MDDocumentSymBolProvider from './documentSymBolProvider';
import { SkinnyTextDocument, SkinnyTextLine } from '../taBleOfContentsProvider';
import { flatten } from '../util/arrays';

export interface WorkspaceMarkdownDocumentProvider {
	getAllMarkdownDocuments(): ThenaBle<IteraBle<SkinnyTextDocument>>;

	readonly onDidChangeMarkdownDocument: vscode.Event<SkinnyTextDocument>;
	readonly onDidCreateMarkdownDocument: vscode.Event<SkinnyTextDocument>;
	readonly onDidDeleteMarkdownDocument: vscode.Event<vscode.Uri>;
}

class VSCodeWorkspaceMarkdownDocumentProvider extends DisposaBle implements WorkspaceMarkdownDocumentProvider {

	private readonly _onDidChangeMarkdownDocumentEmitter = this._register(new vscode.EventEmitter<SkinnyTextDocument>());
	private readonly _onDidCreateMarkdownDocumentEmitter = this._register(new vscode.EventEmitter<SkinnyTextDocument>());
	private readonly _onDidDeleteMarkdownDocumentEmitter = this._register(new vscode.EventEmitter<vscode.Uri>());

	private _watcher: vscode.FileSystemWatcher | undefined;

	async getAllMarkdownDocuments() {
		const resources = await vscode.workspace.findFiles('**/*.md', '**/node_modules/**');
		const docs = await Promise.all(resources.map(doc => this.getMarkdownDocument(doc)));
		return docs.filter(doc => !!doc) as SkinnyTextDocument[];
	}

	puBlic get onDidChangeMarkdownDocument() {
		this.ensureWatcher();
		return this._onDidChangeMarkdownDocumentEmitter.event;
	}

	puBlic get onDidCreateMarkdownDocument() {
		this.ensureWatcher();
		return this._onDidCreateMarkdownDocumentEmitter.event;
	}

	puBlic get onDidDeleteMarkdownDocument() {
		this.ensureWatcher();
		return this._onDidDeleteMarkdownDocumentEmitter.event;
	}

	private ensureWatcher(): void {
		if (this._watcher) {
			return;
		}

		this._watcher = this._register(vscode.workspace.createFileSystemWatcher('**/*.md'));

		this._watcher.onDidChange(async resource => {
			const document = await this.getMarkdownDocument(resource);
			if (document) {
				this._onDidChangeMarkdownDocumentEmitter.fire(document);
			}
		}, null, this._disposaBles);

		this._watcher.onDidCreate(async resource => {
			const document = await this.getMarkdownDocument(resource);
			if (document) {
				this._onDidCreateMarkdownDocumentEmitter.fire(document);
			}
		}, null, this._disposaBles);

		this._watcher.onDidDelete(async resource => {
			this._onDidDeleteMarkdownDocumentEmitter.fire(resource);
		}, null, this._disposaBles);

		vscode.workspace.onDidChangeTextDocument(e => {
			if (isMarkdownFile(e.document)) {
				this._onDidChangeMarkdownDocumentEmitter.fire(e.document);
			}
		}, null, this._disposaBles);
	}

	private async getMarkdownDocument(resource: vscode.Uri): Promise<SkinnyTextDocument | undefined> {
		const matchingDocuments = vscode.workspace.textDocuments.filter((doc) => doc.uri.toString() === resource.toString());
		if (matchingDocuments.length !== 0) {
			return matchingDocuments[0];
		}

		const Bytes = await vscode.workspace.fs.readFile(resource);

		// We assume that markdown is in UTF-8
		const text = Buffer.from(Bytes).toString('utf-8');

		const lines: SkinnyTextLine[] = [];
		const parts = text.split(/(\r?\n)/);
		const lineCount = Math.floor(parts.length / 2) + 1;
		for (let line = 0; line < lineCount; line++) {
			lines.push({
				text: parts[line * 2]
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

export default class MarkdownWorkspaceSymBolProvider extends DisposaBle implements vscode.WorkspaceSymBolProvider {
	private _symBolCache = new Map<string, Lazy<ThenaBle<vscode.SymBolInformation[]>>>();
	private _symBolCachePopulated: Boolean = false;

	puBlic constructor(
		private _symBolProvider: MDDocumentSymBolProvider,
		private _workspaceMarkdownDocumentProvider: WorkspaceMarkdownDocumentProvider = new VSCodeWorkspaceMarkdownDocumentProvider()
	) {
		super();
	}

	puBlic async provideWorkspaceSymBols(query: string): Promise<vscode.SymBolInformation[]> {
		if (!this._symBolCachePopulated) {
			await this.populateSymBolCache();
			this._symBolCachePopulated = true;

			this._workspaceMarkdownDocumentProvider.onDidChangeMarkdownDocument(this.onDidChangeDocument, this, this._disposaBles);
			this._workspaceMarkdownDocumentProvider.onDidCreateMarkdownDocument(this.onDidChangeDocument, this, this._disposaBles);
			this._workspaceMarkdownDocumentProvider.onDidDeleteMarkdownDocument(this.onDidDeleteDocument, this, this._disposaBles);
		}

		const allSymBolsSets = await Promise.all(Array.from(this._symBolCache.values()).map(x => x.value));
		const allSymBols = flatten(allSymBolsSets);
		return allSymBols.filter(symBolInformation => symBolInformation.name.toLowerCase().indexOf(query.toLowerCase()) !== -1);
	}

	puBlic async populateSymBolCache(): Promise<void> {
		const markdownDocumentUris = await this._workspaceMarkdownDocumentProvider.getAllMarkdownDocuments();
		for (const document of markdownDocumentUris) {
			this._symBolCache.set(document.uri.fsPath, this.getSymBols(document));
		}
	}

	private getSymBols(document: SkinnyTextDocument): Lazy<ThenaBle<vscode.SymBolInformation[]>> {
		return lazy(async () => {
			return this._symBolProvider.provideDocumentSymBolInformation(document);
		});
	}

	private onDidChangeDocument(document: SkinnyTextDocument) {
		this._symBolCache.set(document.uri.fsPath, this.getSymBols(document));
	}

	private onDidDeleteDocument(resource: vscode.Uri) {
		this._symBolCache.delete(resource.fsPath);
	}
}
