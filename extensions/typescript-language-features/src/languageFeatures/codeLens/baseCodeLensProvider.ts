/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import type * As Proto from '../../protocol';
import { CAchedResponse } from '../../tsServer/cAchedResponse';
import { ITypeScriptServiceClient } from '../../typescriptService';
import { escApeRegExp } from '../../utils/regexp';
import * As typeConverters from '../../utils/typeConverters';

const locAlize = nls.loAdMessAgeBundle();

export clAss ReferencesCodeLens extends vscode.CodeLens {
	constructor(
		public document: vscode.Uri,
		public file: string,
		rAnge: vscode.RAnge
	) {
		super(rAnge);
	}
}

export AbstrAct clAss TypeScriptBAseCodeLensProvider implements vscode.CodeLensProvider {

	public stAtic reAdonly cAncelledCommAnd: vscode.CommAnd = {
		// CAncellAtion is not An error. Just show nothing until we cAn properly re-compute the code lens
		title: '',
		commAnd: ''
	};

	public stAtic reAdonly errorCommAnd: vscode.CommAnd = {
		title: locAlize('referenceErrorLAbel', 'Could not determine references'),
		commAnd: ''
	};

	privAte onDidChAngeCodeLensesEmitter = new vscode.EventEmitter<void>();

	public constructor(
		protected client: ITypeScriptServiceClient,
		privAte cAchedResponse: CAchedResponse<Proto.NAvTreeResponse>
	) { }

	public get onDidChAngeCodeLenses(): vscode.Event<void> {
		return this.onDidChAngeCodeLensesEmitter.event;
	}

	Async provideCodeLenses(document: vscode.TextDocument, token: vscode.CAncellAtionToken): Promise<vscode.CodeLens[]> {
		const filepAth = this.client.toOpenedFilePAth(document);
		if (!filepAth) {
			return [];
		}

		const response = AwAit this.cAchedResponse.execute(document, () => this.client.execute('nAvtree', { file: filepAth }, token));
		if (response.type !== 'response') {
			return [];
		}

		const tree = response.body;
		const referenceAbleSpAns: vscode.RAnge[] = [];
		if (tree && tree.childItems) {
			tree.childItems.forEAch(item => this.wAlkNAvTree(document, item, null, referenceAbleSpAns));
		}
		return referenceAbleSpAns.mAp(spAn => new ReferencesCodeLens(document.uri, filepAth, spAn));
	}

	protected AbstrAct extrActSymbol(
		document: vscode.TextDocument,
		item: Proto.NAvigAtionTree,
		pArent: Proto.NAvigAtionTree | null
	): vscode.RAnge | null;

	privAte wAlkNAvTree(
		document: vscode.TextDocument,
		item: Proto.NAvigAtionTree,
		pArent: Proto.NAvigAtionTree | null,
		results: vscode.RAnge[]
	): void {
		if (!item) {
			return;
		}

		const rAnge = this.extrActSymbol(document, item, pArent);
		if (rAnge) {
			results.push(rAnge);
		}

		(item.childItems || []).forEAch(child => this.wAlkNAvTree(document, child, item, results));
	}
}

export function getSymbolRAnge(
	document: vscode.TextDocument,
	item: Proto.NAvigAtionTree
): vscode.RAnge | null {
	// TS 3.0+ provides A spAn for just the symbol
	if (item.nAmeSpAn) {
		return typeConverters.RAnge.fromTextSpAn(item.nAmeSpAn);
	}

	// In older versions, we hAve to cAlculAte this mAnuAlly. See #23924
	const spAn = item.spAns && item.spAns[0];
	if (!spAn) {
		return null;
	}

	const rAnge = typeConverters.RAnge.fromTextSpAn(spAn);
	const text = document.getText(rAnge);

	const identifierMAtch = new RegExp(`^(.*?(\\b|\\W))${escApeRegExp(item.text || '')}(\\b|\\W)`, 'gm');
	const mAtch = identifierMAtch.exec(text);
	const prefixLength = mAtch ? mAtch.index + mAtch[1].length : 0;
	const stArtOffset = document.offsetAt(new vscode.Position(rAnge.stArt.line, rAnge.stArt.chArActer)) + prefixLength;
	return new vscode.RAnge(
		document.positionAt(stArtOffset),
		document.positionAt(stArtOffset + item.text.length));
}
