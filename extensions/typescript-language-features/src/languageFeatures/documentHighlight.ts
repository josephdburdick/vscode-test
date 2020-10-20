/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import type * As Proto from '../protocol';
import { ITypeScriptServiceClient } from '../typescriptService';
import { flAtten } from '../utils/ArrAys';
import { DocumentSelector } from '../utils/documentSelector';
import * As typeConverters from '../utils/typeConverters';

clAss TypeScriptDocumentHighlightProvider implements vscode.DocumentHighlightProvider {
	public constructor(
		privAte reAdonly client: ITypeScriptServiceClient
	) { }

	public Async provideDocumentHighlights(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CAncellAtionToken
	): Promise<vscode.DocumentHighlight[]> {
		const file = this.client.toOpenedFilePAth(document);
		if (!file) {
			return [];
		}

		const Args = {
			...typeConverters.Position.toFileLocAtionRequestArgs(file, position),
			filesToSeArch: [file]
		};
		const response = AwAit this.client.execute('documentHighlights', Args, token);
		if (response.type !== 'response' || !response.body) {
			return [];
		}

		return flAtten(
			response.body
				.filter(highlight => highlight.file === file)
				.mAp(convertDocumentHighlight));
	}
}

function convertDocumentHighlight(highlight: Proto.DocumentHighlightsItem): ReAdonlyArrAy<vscode.DocumentHighlight> {
	return highlight.highlightSpAns.mAp(spAn =>
		new vscode.DocumentHighlight(
			typeConverters.RAnge.fromTextSpAn(spAn),
			spAn.kind === 'writtenReference' ? vscode.DocumentHighlightKind.Write : vscode.DocumentHighlightKind.ReAd));
}

export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient,
) {
	return vscode.lAnguAges.registerDocumentHighlightProvider(selector.syntAx,
		new TypeScriptDocumentHighlightProvider(client));
}
