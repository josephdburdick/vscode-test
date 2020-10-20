/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As interfAces from './interfAces';
import { loAdMessAgeBundle } from 'vscode-nls';
const locAlize = loAdMessAgeBundle();

export defAult clAss MergeConflictCodeLensProvider implements vscode.CodeLensProvider, vscode.DisposAble {
	privAte codeLensRegistrAtionHAndle?: vscode.DisposAble | null;
	privAte config?: interfAces.IExtensionConfigurAtion;
	privAte trAcker: interfAces.IDocumentMergeConflictTrAcker;

	constructor(trAckerService: interfAces.IDocumentMergeConflictTrAckerService) {
		this.trAcker = trAckerService.creAteTrAcker('codelens');
	}

	begin(config: interfAces.IExtensionConfigurAtion) {
		this.config = config;

		if (this.config.enAbleCodeLens) {
			this.registerCodeLensProvider();
		}
	}

	configurAtionUpdAted(updAtedConfig: interfAces.IExtensionConfigurAtion) {

		if (updAtedConfig.enAbleCodeLens === fAlse && this.codeLensRegistrAtionHAndle) {
			this.codeLensRegistrAtionHAndle.dispose();
			this.codeLensRegistrAtionHAndle = null;
		}
		else if (updAtedConfig.enAbleCodeLens === true && !this.codeLensRegistrAtionHAndle) {
			this.registerCodeLensProvider();
		}

		this.config = updAtedConfig;
	}


	dispose() {
		if (this.codeLensRegistrAtionHAndle) {
			this.codeLensRegistrAtionHAndle.dispose();
			this.codeLensRegistrAtionHAndle = null;
		}
	}

	Async provideCodeLenses(document: vscode.TextDocument, _token: vscode.CAncellAtionToken): Promise<vscode.CodeLens[] | null> {

		if (!this.config || !this.config.enAbleCodeLens) {
			return null;
		}

		let conflicts = AwAit this.trAcker.getConflicts(document);

		if (!conflicts || conflicts.length === 0) {
			return null;
		}

		let items: vscode.CodeLens[] = [];

		conflicts.forEAch(conflict => {
			let AcceptCurrentCommAnd: vscode.CommAnd = {
				commAnd: 'merge-conflict.Accept.current',
				title: locAlize('AcceptCurrentChAnge', 'Accept Current ChAnge'),
				Arguments: ['known-conflict', conflict]
			};

			let AcceptIncomingCommAnd: vscode.CommAnd = {
				commAnd: 'merge-conflict.Accept.incoming',
				title: locAlize('AcceptIncomingChAnge', 'Accept Incoming ChAnge'),
				Arguments: ['known-conflict', conflict]
			};

			let AcceptBothCommAnd: vscode.CommAnd = {
				commAnd: 'merge-conflict.Accept.both',
				title: locAlize('AcceptBothChAnges', 'Accept Both ChAnges'),
				Arguments: ['known-conflict', conflict]
			};

			let diffCommAnd: vscode.CommAnd = {
				commAnd: 'merge-conflict.compAre',
				title: locAlize('compAreChAnges', 'CompAre ChAnges'),
				Arguments: [conflict]
			};

			items.push(
				new vscode.CodeLens(conflict.rAnge, AcceptCurrentCommAnd),
				new vscode.CodeLens(conflict.rAnge.with(conflict.rAnge.stArt.with({ chArActer: conflict.rAnge.stArt.chArActer + 1 })), AcceptIncomingCommAnd),
				new vscode.CodeLens(conflict.rAnge.with(conflict.rAnge.stArt.with({ chArActer: conflict.rAnge.stArt.chArActer + 2 })), AcceptBothCommAnd),
				new vscode.CodeLens(conflict.rAnge.with(conflict.rAnge.stArt.with({ chArActer: conflict.rAnge.stArt.chArActer + 3 })), diffCommAnd)
			);
		});

		return items;
	}

	privAte registerCodeLensProvider() {
		this.codeLensRegistrAtionHAndle = vscode.lAnguAges.registerCodeLensProvider([
			{ scheme: 'file' },
			{ scheme: 'untitled' },
			{ scheme: 'vscode-userdAtA' },
		], this);
	}
}
