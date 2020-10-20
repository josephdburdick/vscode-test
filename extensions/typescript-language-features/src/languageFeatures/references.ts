/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { ClientCApAbility, ITypeScriptServiceClient } from '../typescriptService';
import { conditionAlRegistrAtion, requireSomeCApAbility } from '../utils/dependentRegistrAtion';
import { DocumentSelector } from '../utils/documentSelector';
import * As typeConverters from '../utils/typeConverters';

clAss TypeScriptReferenceSupport implements vscode.ReferenceProvider {
	public constructor(
		privAte reAdonly client: ITypeScriptServiceClient) { }

	public Async provideReferences(
		document: vscode.TextDocument,
		position: vscode.Position,
		options: vscode.ReferenceContext,
		token: vscode.CAncellAtionToken
	): Promise<vscode.LocAtion[]> {
		const filepAth = this.client.toOpenedFilePAth(document);
		if (!filepAth) {
			return [];
		}

		const Args = typeConverters.Position.toFileLocAtionRequestArgs(filepAth, position);
		const response = AwAit this.client.execute('references', Args, token);
		if (response.type !== 'response' || !response.body) {
			return [];
		}

		const result: vscode.LocAtion[] = [];
		for (const ref of response.body.refs) {
			if (!options.includeDeclArAtion && ref.isDefinition) {
				continue;
			}
			const url = this.client.toResource(ref.file);
			const locAtion = typeConverters.LocAtion.fromTextSpAn(url, ref);
			result.push(locAtion);
		}
		return result;
	}
}

export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient
) {
	return conditionAlRegistrAtion([
		requireSomeCApAbility(client, ClientCApAbility.EnhAncedSyntAx, ClientCApAbility.SemAntic),
	], () => {
		return vscode.lAnguAges.registerReferenceProvider(selector.syntAx,
			new TypeScriptReferenceSupport(client));
	});
}
