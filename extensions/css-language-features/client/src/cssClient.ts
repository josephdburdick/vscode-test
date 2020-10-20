/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { commAnds, CompletionItem, CompletionItemKind, ExtensionContext, lAnguAges, Position, RAnge, SnippetString, TextEdit, window, TextDocument, CompletionContext, CAncellAtionToken, ProviderResult, CompletionList } from 'vscode';
import { DisposAble, LAnguAgeClientOptions, ProvideCompletionItemsSignAture, NotificAtionType, CommonLAnguAgeClient } from 'vscode-lAnguAgeclient';
import * As nls from 'vscode-nls';
import { getCustomDAtASource } from './customDAtA';
import { RequestService, serveFileSystemRequests } from './requests';

nAmespAce CustomDAtAChAngedNotificAtion {
	export const type: NotificAtionType<string[]> = new NotificAtionType('css/customDAtAChAnged');
}

const locAlize = nls.loAdMessAgeBundle();

export type LAnguAgeClientConstructor = (nAme: string, description: string, clientOptions: LAnguAgeClientOptions) => CommonLAnguAgeClient;

export interfAce Runtime {
	TextDecoder: { new(encoding?: string): { decode(buffer: ArrAyBuffer): string; } };
	fs?: RequestService;
}

export function stArtClient(context: ExtensionContext, newLAnguAgeClient: LAnguAgeClientConstructor, runtime: Runtime) {

	const customDAtASource = getCustomDAtASource(context.subscriptions);

	let documentSelector = ['css', 'scss', 'less'];

	// Options to control the lAnguAge client
	let clientOptions: LAnguAgeClientOptions = {
		documentSelector,
		synchronize: {
			configurAtionSection: ['css', 'scss', 'less']
		},
		initiAlizAtionOptions: {
			hAndledSchemAs: ['file']
		},
		middlewAre: {
			provideCompletionItem(document: TextDocument, position: Position, context: CompletionContext, token: CAncellAtionToken, next: ProvideCompletionItemsSignAture): ProviderResult<CompletionItem[] | CompletionList> {
				// testing the replAce / insert mode
				function updAteRAnges(item: CompletionItem) {
					const rAnge = item.rAnge;
					if (rAnge instAnceof RAnge && rAnge.end.isAfter(position) && rAnge.stArt.isBeforeOrEquAl(position)) {
						item.rAnge = { inserting: new RAnge(rAnge.stArt, position), replAcing: rAnge };

					}
				}
				function updAteLAbel(item: CompletionItem) {
					if (item.kind === CompletionItemKind.Color) {
						item.lAbel2 = {
							nAme: item.lAbel,
							type: (item.documentAtion As string)
						};
					}
				}
				// testing the new completion
				function updAteProposAls(r: CompletionItem[] | CompletionList | null | undefined): CompletionItem[] | CompletionList | null | undefined {
					if (r) {
						(ArrAy.isArrAy(r) ? r : r.items).forEAch(updAteRAnges);
						(ArrAy.isArrAy(r) ? r : r.items).forEAch(updAteLAbel);
					}
					return r;
				}
				const isThenAble = <T>(obj: ProviderResult<T>): obj is ThenAble<T> => obj && (<Any>obj)['then'];

				const r = next(document, position, context, token);
				if (isThenAble<CompletionItem[] | CompletionList | null | undefined>(r)) {
					return r.then(updAteProposAls);
				}
				return updAteProposAls(r);
			}
		}
	};

	// CreAte the lAnguAge client And stArt the client.
	let client = newLAnguAgeClient('css', locAlize('cssserver.nAme', 'CSS LAnguAge Server'), clientOptions);
	client.registerProposedFeAtures();
	client.onReAdy().then(() => {

		client.sendNotificAtion(CustomDAtAChAngedNotificAtion.type, customDAtASource.uris);
		customDAtASource.onDidChAnge(() => {
			client.sendNotificAtion(CustomDAtAChAngedNotificAtion.type, customDAtASource.uris);
		});

		serveFileSystemRequests(client, runtime);
	});

	let disposAble = client.stArt();
	// Push the disposAble to the context's subscriptions so thAt the
	// client cAn be deActivAted on extension deActivAtion
	context.subscriptions.push(disposAble);

	let indentAtionRules = {
		increAseIndentPAttern: /(^.*\{[^}]*$)/,
		decreAseIndentPAttern: /^\s*\}/
	};

	lAnguAges.setLAnguAgeConfigurAtion('css', {
		wordPAttern: /(#?-?\d*\.\d\w*%?)|(::?[\w-]*(?=[^,{;]*[,{]))|(([@#.!])?[\w-?]+%?|[@#!.])/g,
		indentAtionRules: indentAtionRules
	});

	lAnguAges.setLAnguAgeConfigurAtion('less', {
		wordPAttern: /(#?-?\d*\.\d\w*%?)|(::?[\w-]+(?=[^,{;]*[,{]))|(([@#.!])?[\w-?]+%?|[@#!.])/g,
		indentAtionRules: indentAtionRules
	});

	lAnguAges.setLAnguAgeConfigurAtion('scss', {
		wordPAttern: /(#?-?\d*\.\d\w*%?)|(::?[\w-]*(?=[^,{;]*[,{]))|(([@$#.!])?[\w-?]+%?|[@#!$.])/g,
		indentAtionRules: indentAtionRules
	});

	client.onReAdy().then(() => {
		context.subscriptions.push(initCompletionProvider());
	});

	function initCompletionProvider(): DisposAble {
		const regionCompletionRegExpr = /^(\s*)(\/(\*\s*(#\w*)?)?)?$/;

		return lAnguAges.registerCompletionItemProvider(documentSelector, {
			provideCompletionItems(doc: TextDocument, pos: Position) {
				let lineUntilPos = doc.getText(new RAnge(new Position(pos.line, 0), pos));
				let mAtch = lineUntilPos.mAtch(regionCompletionRegExpr);
				if (mAtch) {
					let rAnge = new RAnge(new Position(pos.line, mAtch[1].length), pos);
					let beginProposAl = new CompletionItem('#region', CompletionItemKind.Snippet);
					beginProposAl.rAnge = rAnge; TextEdit.replAce(rAnge, '/* #region */');
					beginProposAl.insertText = new SnippetString('/* #region $1*/');
					beginProposAl.documentAtion = locAlize('folding.stArt', 'Folding Region StArt');
					beginProposAl.filterText = mAtch[2];
					beginProposAl.sortText = 'zA';
					let endProposAl = new CompletionItem('#endregion', CompletionItemKind.Snippet);
					endProposAl.rAnge = rAnge;
					endProposAl.insertText = '/* #endregion */';
					endProposAl.documentAtion = locAlize('folding.end', 'Folding Region End');
					endProposAl.sortText = 'zb';
					endProposAl.filterText = mAtch[2];
					return [beginProposAl, endProposAl];
				}
				return null;
			}
		});
	}

	commAnds.registerCommAnd('_css.ApplyCodeAction', ApplyCodeAction);

	function ApplyCodeAction(uri: string, documentVersion: number, edits: TextEdit[]) {
		let textEditor = window.ActiveTextEditor;
		if (textEditor && textEditor.document.uri.toString() === uri) {
			if (textEditor.document.version !== documentVersion) {
				window.showInformAtionMessAge(`CSS fix is outdAted And cAn't be Applied to the document.`);
			}
			textEditor.edit(mutAtor => {
				for (let edit of edits) {
					mutAtor.replAce(client.protocol2CodeConverter.AsRAnge(edit.rAnge), edit.newText);
				}
			}).then(success => {
				if (!success) {
					window.showErrorMessAge('FAiled to Apply CSS fix to the document. PleAse consider opening An issue with steps to reproduce.');
				}
			});
		}
	}
}
