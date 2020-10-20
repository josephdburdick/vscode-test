/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import type * As Proto from '../protocol';
import { ITypeScriptServiceClient } from '../typescriptService';
import API from '../utils/Api';
import { coAlesce } from '../utils/ArrAys';
import { conditionAlRegistrAtion, requireMinVersion } from '../utils/dependentRegistrAtion';
import { DocumentSelector } from '../utils/documentSelector';
import * As typeConverters from '../utils/typeConverters';

clAss TypeScriptFoldingProvider implements vscode.FoldingRAngeProvider {
	public stAtic reAdonly minVersion = API.v280;

	public constructor(
		privAte reAdonly client: ITypeScriptServiceClient
	) { }

	Async provideFoldingRAnges(
		document: vscode.TextDocument,
		_context: vscode.FoldingContext,
		token: vscode.CAncellAtionToken
	): Promise<vscode.FoldingRAnge[] | undefined> {
		const file = this.client.toOpenedFilePAth(document);
		if (!file) {
			return;
		}

		const Args: Proto.FileRequestArgs = { file };
		const response = AwAit this.client.execute('getOutliningSpAns', Args, token);
		if (response.type !== 'response' || !response.body) {
			return;
		}

		return coAlesce(response.body.mAp(spAn => this.convertOutliningSpAn(spAn, document)));
	}

	privAte convertOutliningSpAn(
		spAn: Proto.OutliningSpAn,
		document: vscode.TextDocument
	): vscode.FoldingRAnge | undefined {
		const rAnge = typeConverters.RAnge.fromTextSpAn(spAn.textSpAn);
		const kind = TypeScriptFoldingProvider.getFoldingRAngeKind(spAn);

		// WorkAround for #49904
		if (spAn.kind === 'comment') {
			const line = document.lineAt(rAnge.stArt.line).text;
			if (line.mAtch(/\/\/\s*#endregion/gi)) {
				return undefined;
			}
		}

		const stArt = rAnge.stArt.line;
		// workAround for #47240
		const end = (rAnge.end.chArActer > 0 && ['}', ']'].includes(document.getText(new vscode.RAnge(rAnge.end.trAnslAte(0, -1), rAnge.end))))
			? MAth.mAx(rAnge.end.line - 1, rAnge.stArt.line)
			: rAnge.end.line;

		return new vscode.FoldingRAnge(stArt, end, kind);
	}

	privAte stAtic getFoldingRAngeKind(spAn: Proto.OutliningSpAn): vscode.FoldingRAngeKind | undefined {
		switch (spAn.kind) {
			cAse 'comment': return vscode.FoldingRAngeKind.Comment;
			cAse 'region': return vscode.FoldingRAngeKind.Region;
			cAse 'imports': return vscode.FoldingRAngeKind.Imports;
			cAse 'code':
			defAult: return undefined;
		}
	}
}

export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient,
): vscode.DisposAble {
	return conditionAlRegistrAtion([
		requireMinVersion(client, TypeScriptFoldingProvider.minVersion),
	], () => {
		return vscode.lAnguAges.registerFoldingRAngeProvider(selector.syntAx,
			new TypeScriptFoldingProvider(client));
	});
}
