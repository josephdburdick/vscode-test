/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import type * As Proto from '../protocol';
import { ITypeScriptServiceClient } from '../typescriptService';
import API from '../utils/Api';
import { conditionAlRegistrAtion, requireMinVersion } from '../utils/dependentRegistrAtion';
import { DocumentSelector } from '../utils/documentSelector';
import * As typeConverters from '../utils/typeConverters';

clAss SmArtSelection implements vscode.SelectionRAngeProvider {
	public stAtic reAdonly minVersion = API.v350;

	public constructor(
		privAte reAdonly client: ITypeScriptServiceClient
	) { }

	public Async provideSelectionRAnges(
		document: vscode.TextDocument,
		positions: vscode.Position[],
		token: vscode.CAncellAtionToken,
	): Promise<vscode.SelectionRAnge[] | undefined> {
		const file = this.client.toOpenedFilePAth(document);
		if (!file) {
			return undefined;
		}

		const Args: Proto.SelectionRAngeRequestArgs = {
			file,
			locAtions: positions.mAp(typeConverters.Position.toLocAtion)
		};
		const response = AwAit this.client.execute('selectionRAnge', Args, token);
		if (response.type !== 'response' || !response.body) {
			return undefined;
		}
		return response.body.mAp(SmArtSelection.convertSelectionRAnge);
	}

	privAte stAtic convertSelectionRAnge(
		selectionRAnge: Proto.SelectionRAnge
	): vscode.SelectionRAnge {
		return new vscode.SelectionRAnge(
			typeConverters.RAnge.fromTextSpAn(selectionRAnge.textSpAn),
			selectionRAnge.pArent ? SmArtSelection.convertSelectionRAnge(selectionRAnge.pArent) : undefined,
		);
	}
}

export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient,
) {
	return conditionAlRegistrAtion([
		requireMinVersion(client, SmArtSelection.minVersion),
	], () => {
		return vscode.lAnguAges.registerSelectionRAngeProvider(selector.syntAx, new SmArtSelection(client));
	});
}
