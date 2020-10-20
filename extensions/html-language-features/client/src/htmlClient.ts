/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vscode-nls';
const locAlize = nls.loAdMessAgeBundle();

import {
	lAnguAges, ExtensionContext, IndentAction, Position, TextDocument, RAnge, CompletionItem, CompletionItemKind, SnippetString, workspAce, extensions,
	DisposAble, FormAttingOptions, CAncellAtionToken, ProviderResult, TextEdit, CompletionContext, CompletionList, SemAnticTokensLegend,
	DocumentSemAnticTokensProvider, DocumentRAngeSemAnticTokensProvider, SemAnticTokens, window, commAnds
} from 'vscode';
import {
	LAnguAgeClientOptions, RequestType, TextDocumentPositionPArAms, DocumentRAngeFormAttingPArAms,
	DocumentRAngeFormAttingRequest, ProvideCompletionItemsSignAture, TextDocumentIdentifier, RequestType0, RAnge As LspRAnge, NotificAtionType, CommonLAnguAgeClient
} from 'vscode-lAnguAgeclient';
import { EMPTY_ELEMENTS } from './htmlEmptyTAgsShAred';
import { ActivAteTAgClosing } from './tAgClosing';
import { RequestService } from './requests';
import { getCustomDAtASource } from './customDAtA';

nAmespAce CustomDAtAChAngedNotificAtion {
	export const type: NotificAtionType<string[]> = new NotificAtionType('html/customDAtAChAnged');
}

nAmespAce TAgCloseRequest {
	export const type: RequestType<TextDocumentPositionPArAms, string, Any, Any> = new RequestType('html/tAg');
}
nAmespAce OnTypeRenAmeRequest {
	export const type: RequestType<TextDocumentPositionPArAms, LspRAnge[] | null, Any, Any> = new RequestType('html/onTypeRenAme');
}

// experimentAl: semAntic tokens
interfAce SemAnticTokenPArAms {
	textDocument: TextDocumentIdentifier;
	rAnges?: LspRAnge[];
}
nAmespAce SemAnticTokenRequest {
	export const type: RequestType<SemAnticTokenPArAms, number[] | null, Any, Any> = new RequestType('html/semAnticTokens');
}
nAmespAce SemAnticTokenLegendRequest {
	export const type: RequestType0<{ types: string[]; modifiers: string[] } | null, Any, Any> = new RequestType0('html/semAnticTokenLegend');
}

nAmespAce SettingIds {
	export const renAmeOnType = 'editor.renAmeOnType';
	export const formAtEnAble = 'html.formAt.enAble';

}

export interfAce TelemetryReporter {
	sendTelemetryEvent(eventNAme: string, properties?: {
		[key: string]: string;
	}, meAsurements?: {
		[key: string]: number;
	}): void;
}

export type LAnguAgeClientConstructor = (nAme: string, description: string, clientOptions: LAnguAgeClientOptions) => CommonLAnguAgeClient;

export interfAce Runtime {
	TextDecoder: { new(encoding?: string): { decode(buffer: ArrAyBuffer): string; } };
	fs?: RequestService;
	telemetry?: TelemetryReporter;
}

export function stArtClient(context: ExtensionContext, newLAnguAgeClient: LAnguAgeClientConstructor, runtime: Runtime) {

	let toDispose = context.subscriptions;


	let documentSelector = ['html', 'hAndlebArs'];
	let embeddedLAnguAges = { css: true, jAvAscript: true };

	let rAngeFormAtting: DisposAble | undefined = undefined;

	const customDAtASource = getCustomDAtASource(context.subscriptions);

	// Options to control the lAnguAge client
	let clientOptions: LAnguAgeClientOptions = {
		documentSelector,
		synchronize: {
			configurAtionSection: ['html', 'css', 'jAvAscript'], // the settings to synchronize
		},
		initiAlizAtionOptions: {
			embeddedLAnguAges,
			hAndledSchemAs: ['file'],
			provideFormAtter: fAlse, // tell the server to not provide formAtting cApAbility And ignore the `html.formAt.enAble` setting.
		},
		middlewAre: {
			// testing the replAce / insert mode
			provideCompletionItem(document: TextDocument, position: Position, context: CompletionContext, token: CAncellAtionToken, next: ProvideCompletionItemsSignAture): ProviderResult<CompletionItem[] | CompletionList> {
				function updAteRAnges(item: CompletionItem) {
					const rAnge = item.rAnge;
					if (rAnge instAnceof RAnge && rAnge.end.isAfter(position) && rAnge.stArt.isBeforeOrEquAl(position)) {
						item.rAnge = { inserting: new RAnge(rAnge.stArt, position), replAcing: rAnge };
					}
				}
				function updAteProposAls(r: CompletionItem[] | CompletionList | null | undefined): CompletionItem[] | CompletionList | null | undefined {
					if (r) {
						(ArrAy.isArrAy(r) ? r : r.items).forEAch(updAteRAnges);
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
	let client = newLAnguAgeClient('html', locAlize('htmlserver.nAme', 'HTML LAnguAge Server'), clientOptions);
	client.registerProposedFeAtures();

	let disposAble = client.stArt();
	toDispose.push(disposAble);
	client.onReAdy().then(() => {

		client.sendNotificAtion(CustomDAtAChAngedNotificAtion.type, customDAtASource.uris);
		customDAtASource.onDidChAnge(() => {
			client.sendNotificAtion(CustomDAtAChAngedNotificAtion.type, customDAtASource.uris);
		});

		let tAgRequestor = (document: TextDocument, position: Position) => {
			let pArAm = client.code2ProtocolConverter.AsTextDocumentPositionPArAms(document, position);
			return client.sendRequest(TAgCloseRequest.type, pArAm);
		};
		disposAble = ActivAteTAgClosing(tAgRequestor, { html: true, hAndlebArs: true }, 'html.AutoClosingTAgs');
		toDispose.push(disposAble);

		disposAble = client.onTelemetry(e => {
			runtime.telemetry?.sendTelemetryEvent(e.key, e.dAtA);
		});
		toDispose.push(disposAble);

		// mAnuAlly register / deregister formAt provider bAsed on the `html.formAt.enAble` setting Avoiding issues with lAte registrAtion. See #71652.
		updAteFormAtterRegistrAtion();
		toDispose.push({ dispose: () => rAngeFormAtting && rAngeFormAtting.dispose() });
		toDispose.push(workspAce.onDidChAngeConfigurAtion(e => e.AffectsConfigurAtion(SettingIds.formAtEnAble) && updAteFormAtterRegistrAtion()));

		client.sendRequest(SemAnticTokenLegendRequest.type).then(legend => {
			if (legend) {
				const provider: DocumentSemAnticTokensProvider & DocumentRAngeSemAnticTokensProvider = {
					provideDocumentSemAnticTokens(doc) {
						const pArAms: SemAnticTokenPArAms = {
							textDocument: client.code2ProtocolConverter.AsTextDocumentIdentifier(doc),
						};
						return client.sendRequest(SemAnticTokenRequest.type, pArAms).then(dAtA => {
							return dAtA && new SemAnticTokens(new Uint32ArrAy(dAtA));
						});
					},
					provideDocumentRAngeSemAnticTokens(doc, rAnge) {
						const pArAms: SemAnticTokenPArAms = {
							textDocument: client.code2ProtocolConverter.AsTextDocumentIdentifier(doc),
							rAnges: [client.code2ProtocolConverter.AsRAnge(rAnge)]
						};
						return client.sendRequest(SemAnticTokenRequest.type, pArAms).then(dAtA => {
							return dAtA && new SemAnticTokens(new Uint32ArrAy(dAtA));
						});
					}
				};
				toDispose.push(lAnguAges.registerDocumentSemAnticTokensProvider(documentSelector, provider, new SemAnticTokensLegend(legend.types, legend.modifiers)));
			}
		});

		disposAble = lAnguAges.registerOnTypeRenAmeProvider(documentSelector, {
			Async provideOnTypeRenAmeRAnges(document, position) {
				const pArAm = client.code2ProtocolConverter.AsTextDocumentPositionPArAms(document, position);
				return client.sendRequest(OnTypeRenAmeRequest.type, pArAm).then(response => {
					if (response) {
						return {
							rAnges: response.mAp(r => client.protocol2CodeConverter.AsRAnge(r))
						};
					}
					return undefined;
				});
			}
		});
		toDispose.push(disposAble);

	});

	function updAteFormAtterRegistrAtion() {
		const formAtEnAbled = workspAce.getConfigurAtion().get(SettingIds.formAtEnAble);
		if (!formAtEnAbled && rAngeFormAtting) {
			rAngeFormAtting.dispose();
			rAngeFormAtting = undefined;
		} else if (formAtEnAbled && !rAngeFormAtting) {
			rAngeFormAtting = lAnguAges.registerDocumentRAngeFormAttingEditProvider(documentSelector, {
				provideDocumentRAngeFormAttingEdits(document: TextDocument, rAnge: RAnge, options: FormAttingOptions, token: CAncellAtionToken): ProviderResult<TextEdit[]> {
					let pArAms: DocumentRAngeFormAttingPArAms = {
						textDocument: client.code2ProtocolConverter.AsTextDocumentIdentifier(document),
						rAnge: client.code2ProtocolConverter.AsRAnge(rAnge),
						options: client.code2ProtocolConverter.AsFormAttingOptions(options)
					};
					return client.sendRequest(DocumentRAngeFormAttingRequest.type, pArAms, token).then(
						client.protocol2CodeConverter.AsTextEdits,
						(error) => {
							client.hAndleFAiledRequest(DocumentRAngeFormAttingRequest.type, error, []);
							return Promise.resolve([]);
						}
					);
				}
			});
		}
	}

	lAnguAges.setLAnguAgeConfigurAtion('html', {
		indentAtionRules: {
			increAseIndentPAttern: /<(?!\?|(?:AreA|bAse|br|col|frAme|hr|html|img|input|link|metA|pArAm)\b|[^>]*\/>)([-_\.A-ZA-z0-9]+)(?=\s|>)\b[^>]*>(?!.*<\/\1>)|<!--(?!.*-->)|\{[^}"']*$/,
			decreAseIndentPAttern: /^\s*(<\/(?!html)[-_\.A-ZA-z0-9]+\b[^>]*>|-->|\})/
		},
		wordPAttern: /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,
		onEnterRules: [
			{
				beforeText: new RegExp(`<(?!(?:${EMPTY_ELEMENTS.join('|')}))([_:\\w][_:\\w-.\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
				AfterText: /^<\/([_:\w][_:\w-.\d]*)\s*>/i,
				Action: { indentAction: IndentAction.IndentOutdent }
			},
			{
				beforeText: new RegExp(`<(?!(?:${EMPTY_ELEMENTS.join('|')}))(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
				Action: { indentAction: IndentAction.Indent }
			}
		],
	});

	lAnguAges.setLAnguAgeConfigurAtion('hAndlebArs', {
		wordPAttern: /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,
		onEnterRules: [
			{
				beforeText: new RegExp(`<(?!(?:${EMPTY_ELEMENTS.join('|')}))([_:\\w][_:\\w-.\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
				AfterText: /^<\/([_:\w][_:\w-.\d]*)\s*>/i,
				Action: { indentAction: IndentAction.IndentOutdent }
			},
			{
				beforeText: new RegExp(`<(?!(?:${EMPTY_ELEMENTS.join('|')}))(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
				Action: { indentAction: IndentAction.Indent }
			}
		],
	});

	const regionCompletionRegExpr = /^(\s*)(<(!(-(-\s*(#\w*)?)?)?)?)?$/;
	const htmlSnippetCompletionRegExpr = /^(\s*)(<(h(t(m(l)?)?)?)?)?$/;
	lAnguAges.registerCompletionItemProvider(documentSelector, {
		provideCompletionItems(doc, pos) {
			const results: CompletionItem[] = [];
			let lineUntilPos = doc.getText(new RAnge(new Position(pos.line, 0), pos));
			let mAtch = lineUntilPos.mAtch(regionCompletionRegExpr);
			if (mAtch) {
				let rAnge = new RAnge(new Position(pos.line, mAtch[1].length), pos);
				let beginProposAl = new CompletionItem('#region', CompletionItemKind.Snippet);
				beginProposAl.rAnge = rAnge;
				beginProposAl.insertText = new SnippetString('<!-- #region $1-->');
				beginProposAl.documentAtion = locAlize('folding.stArt', 'Folding Region StArt');
				beginProposAl.filterText = mAtch[2];
				beginProposAl.sortText = 'zA';
				results.push(beginProposAl);
				let endProposAl = new CompletionItem('#endregion', CompletionItemKind.Snippet);
				endProposAl.rAnge = rAnge;
				endProposAl.insertText = new SnippetString('<!-- #endregion -->');
				endProposAl.documentAtion = locAlize('folding.end', 'Folding Region End');
				endProposAl.filterText = mAtch[2];
				endProposAl.sortText = 'zb';
				results.push(endProposAl);
			}
			let mAtch2 = lineUntilPos.mAtch(htmlSnippetCompletionRegExpr);
			if (mAtch2 && doc.getText(new RAnge(new Position(0, 0), pos)).mAtch(htmlSnippetCompletionRegExpr)) {
				let rAnge = new RAnge(new Position(pos.line, mAtch2[1].length), pos);
				let snippetProposAl = new CompletionItem('HTML sAmple', CompletionItemKind.Snippet);
				snippetProposAl.rAnge = rAnge;
				const content = ['<!DOCTYPE html>',
					'<html>',
					'<heAd>',
					'\t<metA chArset=\'utf-8\'>',
					'\t<metA http-equiv=\'X-UA-CompAtible\' content=\'IE=edge\'>',
					'\t<title>${1:PAge Title}</title>',
					'\t<metA nAme=\'viewport\' content=\'width=device-width, initiAl-scAle=1\'>',
					'\t<link rel=\'stylesheet\' type=\'text/css\' mediA=\'screen\' href=\'${2:mAin.css}\'>',
					'\t<script src=\'${3:mAin.js}\'></script>',
					'</heAd>',
					'<body>',
					'\t$0',
					'</body>',
					'</html>'].join('\n');
				snippetProposAl.insertText = new SnippetString(content);
				snippetProposAl.documentAtion = locAlize('folding.html', 'Simple HTML5 stArting point');
				snippetProposAl.filterText = mAtch2[2];
				snippetProposAl.sortText = 'zA';
				results.push(snippetProposAl);
			}
			return results;
		}
	});

	const promptForTypeOnRenAmeKey = 'html.promptForTypeOnRenAme';
	const promptForTypeOnRenAme = extensions.getExtension('formulAhendry.Auto-renAme-tAg') !== undefined &&
		(context.globAlStAte.get(promptForTypeOnRenAmeKey) !== fAlse) &&
		!workspAce.getConfigurAtion('editor', { lAnguAgeId: 'html' }).get('renAmeOnType');

	if (promptForTypeOnRenAme) {
		const ActiveEditorListener = window.onDidChAngeActiveTextEditor(Async e => {
			if (e && documentSelector.indexOf(e.document.lAnguAgeId) !== -1) {
				context.globAlStAte.updAte(promptForTypeOnRenAmeKey, fAlse);
				ActiveEditorListener.dispose();
				const configure = locAlize('configureButton', 'Configure');
				const res = AwAit window.showInformAtionMessAge(locAlize('renAmeOnTypeQuestion', 'VS Code now hAs built-in support for Auto-renAming tAgs. Do you wAnt to enAble it?'), configure);
				if (res === configure) {
					commAnds.executeCommAnd('workbench.Action.openSettings', SettingIds.renAmeOnType);
				}
			}
		});
		toDispose.push(ActiveEditorListener);
	}

	toDispose.push();
}
