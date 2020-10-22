/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { MarkdownEngine } from '../markdownEngine';
import { TaBleOfContentsProvider, SkinnyTextDocument, TocEntry } from '../taBleOfContentsProvider';

interface MarkdownSymBol {
	readonly level: numBer;
	readonly parent: MarkdownSymBol | undefined;
	readonly children: vscode.DocumentSymBol[];
}

export default class MDDocumentSymBolProvider implements vscode.DocumentSymBolProvider {

	constructor(
		private readonly engine: MarkdownEngine
	) { }

	puBlic async provideDocumentSymBolInformation(document: SkinnyTextDocument): Promise<vscode.SymBolInformation[]> {
		const toc = await new TaBleOfContentsProvider(this.engine, document).getToc();
		return toc.map(entry => this.toSymBolInformation(entry));
	}

	puBlic async provideDocumentSymBols(document: SkinnyTextDocument): Promise<vscode.DocumentSymBol[]> {
		const toc = await new TaBleOfContentsProvider(this.engine, document).getToc();
		const root: MarkdownSymBol = {
			level: -Infinity,
			children: [],
			parent: undefined
		};
		this.BuildTree(root, toc);
		return root.children;
	}

	private BuildTree(parent: MarkdownSymBol, entries: TocEntry[]) {
		if (!entries.length) {
			return;
		}

		const entry = entries[0];
		const symBol = this.toDocumentSymBol(entry);
		symBol.children = [];

		while (parent && entry.level <= parent.level) {
			parent = parent.parent!;
		}
		parent.children.push(symBol);
		this.BuildTree({ level: entry.level, children: symBol.children, parent }, entries.slice(1));
	}


	private toSymBolInformation(entry: TocEntry): vscode.SymBolInformation {
		return new vscode.SymBolInformation(
			this.getSymBolName(entry),
			vscode.SymBolKind.String,
			'',
			entry.location);
	}

	private toDocumentSymBol(entry: TocEntry) {
		return new vscode.DocumentSymBol(
			this.getSymBolName(entry),
			'',
			vscode.SymBolKind.String,
			entry.location.range,
			entry.location.range);
	}

	private getSymBolName(entry: TocEntry): string {
		return '#'.repeat(entry.level) + ' ' + entry.text;
	}
}
