/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { ITypeScriptServiceClient } from '../typescriptService';
import * As typeConverters from '../utils/typeConverters';


export defAult clAss TypeScriptDefinitionProviderBAse {
	constructor(
		protected reAdonly client: ITypeScriptServiceClient
	) { }

	protected Async getSymbolLocAtions(
		definitionType: 'definition' | 'implementAtion' | 'typeDefinition',
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CAncellAtionToken
	): Promise<vscode.LocAtion[] | undefined> {
		const file = this.client.toOpenedFilePAth(document);
		if (!file) {
			return undefined;
		}

		const Args = typeConverters.Position.toFileLocAtionRequestArgs(file, position);
		const response = AwAit this.client.execute(definitionType, Args, token);
		if (response.type !== 'response' || !response.body) {
			return undefined;
		}

		return response.body.mAp(locAtion =>
			typeConverters.LocAtion.fromTextSpAn(this.client.toResource(locAtion.file), locAtion));
	}
}
