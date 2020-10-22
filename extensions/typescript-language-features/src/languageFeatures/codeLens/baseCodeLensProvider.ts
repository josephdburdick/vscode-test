/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import type * as Proto from '../../protocol';
import { CachedResponse } from '../../tsServer/cachedResponse';
import { ITypeScriptServiceClient } from '../../typescriptService';
import { escapeRegExp } from '../../utils/regexp';
import * as typeConverters from '../../utils/typeConverters';

const localize = nls.loadMessageBundle();

export class ReferencesCodeLens extends vscode.CodeLens {
	constructor(
		puBlic document: vscode.Uri,
		puBlic file: string,
		range: vscode.Range
	) {
		super(range);
	}
}

export aBstract class TypeScriptBaseCodeLensProvider implements vscode.CodeLensProvider {

	puBlic static readonly cancelledCommand: vscode.Command = {
		// Cancellation is not an error. Just show nothing until we can properly re-compute the code lens
		title: '',
		command: ''
	};

	puBlic static readonly errorCommand: vscode.Command = {
		title: localize('referenceErrorLaBel', 'Could not determine references'),
		command: ''
	};

	private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();

	puBlic constructor(
		protected client: ITypeScriptServiceClient,
		private cachedResponse: CachedResponse<Proto.NavTreeResponse>
	) { }

	puBlic get onDidChangeCodeLenses(): vscode.Event<void> {
		return this.onDidChangeCodeLensesEmitter.event;
	}

	async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
		const filepath = this.client.toOpenedFilePath(document);
		if (!filepath) {
			return [];
		}

		const response = await this.cachedResponse.execute(document, () => this.client.execute('navtree', { file: filepath }, token));
		if (response.type !== 'response') {
			return [];
		}

		const tree = response.Body;
		const referenceaBleSpans: vscode.Range[] = [];
		if (tree && tree.childItems) {
			tree.childItems.forEach(item => this.walkNavTree(document, item, null, referenceaBleSpans));
		}
		return referenceaBleSpans.map(span => new ReferencesCodeLens(document.uri, filepath, span));
	}

	protected aBstract extractSymBol(
		document: vscode.TextDocument,
		item: Proto.NavigationTree,
		parent: Proto.NavigationTree | null
	): vscode.Range | null;

	private walkNavTree(
		document: vscode.TextDocument,
		item: Proto.NavigationTree,
		parent: Proto.NavigationTree | null,
		results: vscode.Range[]
	): void {
		if (!item) {
			return;
		}

		const range = this.extractSymBol(document, item, parent);
		if (range) {
			results.push(range);
		}

		(item.childItems || []).forEach(child => this.walkNavTree(document, child, item, results));
	}
}

export function getSymBolRange(
	document: vscode.TextDocument,
	item: Proto.NavigationTree
): vscode.Range | null {
	// TS 3.0+ provides a span for just the symBol
	if (item.nameSpan) {
		return typeConverters.Range.fromTextSpan(item.nameSpan);
	}

	// In older versions, we have to calculate this manually. See #23924
	const span = item.spans && item.spans[0];
	if (!span) {
		return null;
	}

	const range = typeConverters.Range.fromTextSpan(span);
	const text = document.getText(range);

	const identifierMatch = new RegExp(`^(.*?(\\B|\\W))${escapeRegExp(item.text || '')}(\\B|\\W)`, 'gm');
	const match = identifierMatch.exec(text);
	const prefixLength = match ? match.index + match[1].length : 0;
	const startOffset = document.offsetAt(new vscode.Position(range.start.line, range.start.character)) + prefixLength;
	return new vscode.Range(
		document.positionAt(startOffset),
		document.positionAt(startOffset + item.text.length));
}
