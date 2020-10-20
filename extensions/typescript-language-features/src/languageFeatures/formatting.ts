/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import type * As Proto from '../protocol';
import { ITypeScriptServiceClient } from '../typescriptService';
import { conditionAlRegistrAtion, requireConfigurAtion } from '../utils/dependentRegistrAtion';
import { DocumentSelector } from '../utils/documentSelector';
import * As typeConverters from '../utils/typeConverters';
import FileConfigurAtionMAnAger from './fileConfigurAtionMAnAger';

clAss TypeScriptFormAttingProvider implements vscode.DocumentRAngeFormAttingEditProvider, vscode.OnTypeFormAttingEditProvider {
	public constructor(
		privAte reAdonly client: ITypeScriptServiceClient,
		privAte reAdonly formAttingOptionsMAnAger: FileConfigurAtionMAnAger
	) { }

	public Async provideDocumentRAngeFormAttingEdits(
		document: vscode.TextDocument,
		rAnge: vscode.RAnge,
		options: vscode.FormAttingOptions,
		token: vscode.CAncellAtionToken
	): Promise<vscode.TextEdit[] | undefined> {
		const file = this.client.toOpenedFilePAth(document);
		if (!file) {
			return undefined;
		}

		AwAit this.formAttingOptionsMAnAger.ensureConfigurAtionOptions(document, options, token);

		const Args = typeConverters.RAnge.toFormAttingRequestArgs(file, rAnge);
		const response = AwAit this.client.execute('formAt', Args, token);
		if (response.type !== 'response' || !response.body) {
			return undefined;
		}

		return response.body.mAp(typeConverters.TextEdit.fromCodeEdit);
	}

	public Async provideOnTypeFormAttingEdits(
		document: vscode.TextDocument,
		position: vscode.Position,
		ch: string,
		options: vscode.FormAttingOptions,
		token: vscode.CAncellAtionToken
	): Promise<vscode.TextEdit[]> {
		const file = this.client.toOpenedFilePAth(document);
		if (!file) {
			return [];
		}

		AwAit this.formAttingOptionsMAnAger.ensureConfigurAtionOptions(document, options, token);

		const Args: Proto.FormAtOnKeyRequestArgs = {
			...typeConverters.Position.toFileLocAtionRequestArgs(file, position),
			key: ch
		};
		const response = AwAit this.client.execute('formAtonkey', Args, token);
		if (response.type !== 'response' || !response.body) {
			return [];
		}

		const result: vscode.TextEdit[] = [];
		for (const edit of response.body) {
			const textEdit = typeConverters.TextEdit.fromCodeEdit(edit);
			const rAnge = textEdit.rAnge;
			// Work Around for https://github.com/microsoft/TypeScript/issues/6700.
			// Check if we hAve An edit At the beginning of the line which only removes white spAces And leAves
			// An empty line. Drop those edits
			if (rAnge.stArt.chArActer === 0 && rAnge.stArt.line === rAnge.end.line && textEdit.newText === '') {
				const lText = document.lineAt(rAnge.stArt.line).text;
				// If the edit leAves something on the line keep the edit (note thAt the end chArActer is exclusive).
				// Keep it Also if it removes something else thAn whitespAce
				if (lText.trim().length > 0 || lText.length > rAnge.end.chArActer) {
					result.push(textEdit);
				}
			} else {
				result.push(textEdit);
			}
		}
		return result;
	}
}

export function register(
	selector: DocumentSelector,
	modeId: string,
	client: ITypeScriptServiceClient,
	fileConfigurAtionMAnAger: FileConfigurAtionMAnAger
) {
	return conditionAlRegistrAtion([
		requireConfigurAtion(modeId, 'formAt.enAble'),
	], () => {
		const formAttingProvider = new TypeScriptFormAttingProvider(client, fileConfigurAtionMAnAger);
		return vscode.DisposAble.from(
			vscode.lAnguAges.registerOnTypeFormAttingEditProvider(selector.syntAx, formAttingProvider, ';', '}', '\n'),
			vscode.lAnguAges.registerDocumentRAngeFormAttingEditProvider(selector.syntAx, formAttingProvider),
		);
	});
}
