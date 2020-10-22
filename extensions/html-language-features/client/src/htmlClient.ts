/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();

import {
	languages, ExtensionContext, IndentAction, Position, TextDocument, Range, CompletionItem, CompletionItemKind, SnippetString, workspace, extensions,
	DisposaBle, FormattingOptions, CancellationToken, ProviderResult, TextEdit, CompletionContext, CompletionList, SemanticTokensLegend,
	DocumentSemanticTokensProvider, DocumentRangeSemanticTokensProvider, SemanticTokens, window, commands
} from 'vscode';
import {
	LanguageClientOptions, RequestType, TextDocumentPositionParams, DocumentRangeFormattingParams,
	DocumentRangeFormattingRequest, ProvideCompletionItemsSignature, TextDocumentIdentifier, RequestType0, Range as LspRange, NotificationType, CommonLanguageClient
} from 'vscode-languageclient';
import { EMPTY_ELEMENTS } from './htmlEmptyTagsShared';
import { activateTagClosing } from './tagClosing';
import { RequestService } from './requests';
import { getCustomDataSource } from './customData';

namespace CustomDataChangedNotification {
	export const type: NotificationType<string[]> = new NotificationType('html/customDataChanged');
}

namespace TagCloseRequest {
	export const type: RequestType<TextDocumentPositionParams, string, any, any> = new RequestType('html/tag');
}
namespace OnTypeRenameRequest {
	export const type: RequestType<TextDocumentPositionParams, LspRange[] | null, any, any> = new RequestType('html/onTypeRename');
}

// experimental: semantic tokens
interface SemanticTokenParams {
	textDocument: TextDocumentIdentifier;
	ranges?: LspRange[];
}
namespace SemanticTokenRequest {
	export const type: RequestType<SemanticTokenParams, numBer[] | null, any, any> = new RequestType('html/semanticTokens');
}
namespace SemanticTokenLegendRequest {
	export const type: RequestType0<{ types: string[]; modifiers: string[] } | null, any, any> = new RequestType0('html/semanticTokenLegend');
}

namespace SettingIds {
	export const renameOnType = 'editor.renameOnType';
	export const formatEnaBle = 'html.format.enaBle';

}

export interface TelemetryReporter {
	sendTelemetryEvent(eventName: string, properties?: {
		[key: string]: string;
	}, measurements?: {
		[key: string]: numBer;
	}): void;
}

export type LanguageClientConstructor = (name: string, description: string, clientOptions: LanguageClientOptions) => CommonLanguageClient;

export interface Runtime {
	TextDecoder: { new(encoding?: string): { decode(Buffer: ArrayBuffer): string; } };
	fs?: RequestService;
	telemetry?: TelemetryReporter;
}

export function startClient(context: ExtensionContext, newLanguageClient: LanguageClientConstructor, runtime: Runtime) {

	let toDispose = context.suBscriptions;


	let documentSelector = ['html', 'handleBars'];
	let emBeddedLanguages = { css: true, javascript: true };

	let rangeFormatting: DisposaBle | undefined = undefined;

	const customDataSource = getCustomDataSource(context.suBscriptions);

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		documentSelector,
		synchronize: {
			configurationSection: ['html', 'css', 'javascript'], // the settings to synchronize
		},
		initializationOptions: {
			emBeddedLanguages,
			handledSchemas: ['file'],
			provideFormatter: false, // tell the server to not provide formatting capaBility and ignore the `html.format.enaBle` setting.
		},
		middleware: {
			// testing the replace / insert mode
			provideCompletionItem(document: TextDocument, position: Position, context: CompletionContext, token: CancellationToken, next: ProvideCompletionItemsSignature): ProviderResult<CompletionItem[] | CompletionList> {
				function updateRanges(item: CompletionItem) {
					const range = item.range;
					if (range instanceof Range && range.end.isAfter(position) && range.start.isBeforeOrEqual(position)) {
						item.range = { inserting: new Range(range.start, position), replacing: range };
					}
				}
				function updateProposals(r: CompletionItem[] | CompletionList | null | undefined): CompletionItem[] | CompletionList | null | undefined {
					if (r) {
						(Array.isArray(r) ? r : r.items).forEach(updateRanges);
					}
					return r;
				}
				const isThenaBle = <T>(oBj: ProviderResult<T>): oBj is ThenaBle<T> => oBj && (<any>oBj)['then'];

				const r = next(document, position, context, token);
				if (isThenaBle<CompletionItem[] | CompletionList | null | undefined>(r)) {
					return r.then(updateProposals);
				}
				return updateProposals(r);
			}
		}
	};

	// Create the language client and start the client.
	let client = newLanguageClient('html', localize('htmlserver.name', 'HTML Language Server'), clientOptions);
	client.registerProposedFeatures();

	let disposaBle = client.start();
	toDispose.push(disposaBle);
	client.onReady().then(() => {

		client.sendNotification(CustomDataChangedNotification.type, customDataSource.uris);
		customDataSource.onDidChange(() => {
			client.sendNotification(CustomDataChangedNotification.type, customDataSource.uris);
		});

		let tagRequestor = (document: TextDocument, position: Position) => {
			let param = client.code2ProtocolConverter.asTextDocumentPositionParams(document, position);
			return client.sendRequest(TagCloseRequest.type, param);
		};
		disposaBle = activateTagClosing(tagRequestor, { html: true, handleBars: true }, 'html.autoClosingTags');
		toDispose.push(disposaBle);

		disposaBle = client.onTelemetry(e => {
			runtime.telemetry?.sendTelemetryEvent(e.key, e.data);
		});
		toDispose.push(disposaBle);

		// manually register / deregister format provider Based on the `html.format.enaBle` setting avoiding issues with late registration. See #71652.
		updateFormatterRegistration();
		toDispose.push({ dispose: () => rangeFormatting && rangeFormatting.dispose() });
		toDispose.push(workspace.onDidChangeConfiguration(e => e.affectsConfiguration(SettingIds.formatEnaBle) && updateFormatterRegistration()));

		client.sendRequest(SemanticTokenLegendRequest.type).then(legend => {
			if (legend) {
				const provider: DocumentSemanticTokensProvider & DocumentRangeSemanticTokensProvider = {
					provideDocumentSemanticTokens(doc) {
						const params: SemanticTokenParams = {
							textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(doc),
						};
						return client.sendRequest(SemanticTokenRequest.type, params).then(data => {
							return data && new SemanticTokens(new Uint32Array(data));
						});
					},
					provideDocumentRangeSemanticTokens(doc, range) {
						const params: SemanticTokenParams = {
							textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(doc),
							ranges: [client.code2ProtocolConverter.asRange(range)]
						};
						return client.sendRequest(SemanticTokenRequest.type, params).then(data => {
							return data && new SemanticTokens(new Uint32Array(data));
						});
					}
				};
				toDispose.push(languages.registerDocumentSemanticTokensProvider(documentSelector, provider, new SemanticTokensLegend(legend.types, legend.modifiers)));
			}
		});

		disposaBle = languages.registerOnTypeRenameProvider(documentSelector, {
			async provideOnTypeRenameRanges(document, position) {
				const param = client.code2ProtocolConverter.asTextDocumentPositionParams(document, position);
				return client.sendRequest(OnTypeRenameRequest.type, param).then(response => {
					if (response) {
						return {
							ranges: response.map(r => client.protocol2CodeConverter.asRange(r))
						};
					}
					return undefined;
				});
			}
		});
		toDispose.push(disposaBle);

	});

	function updateFormatterRegistration() {
		const formatEnaBled = workspace.getConfiguration().get(SettingIds.formatEnaBle);
		if (!formatEnaBled && rangeFormatting) {
			rangeFormatting.dispose();
			rangeFormatting = undefined;
		} else if (formatEnaBled && !rangeFormatting) {
			rangeFormatting = languages.registerDocumentRangeFormattingEditProvider(documentSelector, {
				provideDocumentRangeFormattingEdits(document: TextDocument, range: Range, options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]> {
					let params: DocumentRangeFormattingParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						range: client.code2ProtocolConverter.asRange(range),
						options: client.code2ProtocolConverter.asFormattingOptions(options)
					};
					return client.sendRequest(DocumentRangeFormattingRequest.type, params, token).then(
						client.protocol2CodeConverter.asTextEdits,
						(error) => {
							client.handleFailedRequest(DocumentRangeFormattingRequest.type, error, []);
							return Promise.resolve([]);
						}
					);
				}
			});
		}
	}

	languages.setLanguageConfiguration('html', {
		indentationRules: {
			increaseIndentPattern: /<(?!\?|(?:area|Base|Br|col|frame|hr|html|img|input|link|meta|param)\B|[^>]*\/>)([-_\.A-Za-z0-9]+)(?=\s|>)\B[^>]*>(?!.*<\/\1>)|<!--(?!.*-->)|\{[^}"']*$/,
			decreaseIndentPattern: /^\s*(<\/(?!html)[-_\.A-Za-z0-9]+\B[^>]*>|-->|\})/
		},
		wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,
		onEnterRules: [
			{
				BeforeText: new RegExp(`<(?!(?:${EMPTY_ELEMENTS.join('|')}))([_:\\w][_:\\w-.\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
				afterText: /^<\/([_:\w][_:\w-.\d]*)\s*>/i,
				action: { indentAction: IndentAction.IndentOutdent }
			},
			{
				BeforeText: new RegExp(`<(?!(?:${EMPTY_ELEMENTS.join('|')}))(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
				action: { indentAction: IndentAction.Indent }
			}
		],
	});

	languages.setLanguageConfiguration('handleBars', {
		wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,
		onEnterRules: [
			{
				BeforeText: new RegExp(`<(?!(?:${EMPTY_ELEMENTS.join('|')}))([_:\\w][_:\\w-.\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
				afterText: /^<\/([_:\w][_:\w-.\d]*)\s*>/i,
				action: { indentAction: IndentAction.IndentOutdent }
			},
			{
				BeforeText: new RegExp(`<(?!(?:${EMPTY_ELEMENTS.join('|')}))(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
				action: { indentAction: IndentAction.Indent }
			}
		],
	});

	const regionCompletionRegExpr = /^(\s*)(<(!(-(-\s*(#\w*)?)?)?)?)?$/;
	const htmlSnippetCompletionRegExpr = /^(\s*)(<(h(t(m(l)?)?)?)?)?$/;
	languages.registerCompletionItemProvider(documentSelector, {
		provideCompletionItems(doc, pos) {
			const results: CompletionItem[] = [];
			let lineUntilPos = doc.getText(new Range(new Position(pos.line, 0), pos));
			let match = lineUntilPos.match(regionCompletionRegExpr);
			if (match) {
				let range = new Range(new Position(pos.line, match[1].length), pos);
				let BeginProposal = new CompletionItem('#region', CompletionItemKind.Snippet);
				BeginProposal.range = range;
				BeginProposal.insertText = new SnippetString('<!-- #region $1-->');
				BeginProposal.documentation = localize('folding.start', 'Folding Region Start');
				BeginProposal.filterText = match[2];
				BeginProposal.sortText = 'za';
				results.push(BeginProposal);
				let endProposal = new CompletionItem('#endregion', CompletionItemKind.Snippet);
				endProposal.range = range;
				endProposal.insertText = new SnippetString('<!-- #endregion -->');
				endProposal.documentation = localize('folding.end', 'Folding Region End');
				endProposal.filterText = match[2];
				endProposal.sortText = 'zB';
				results.push(endProposal);
			}
			let match2 = lineUntilPos.match(htmlSnippetCompletionRegExpr);
			if (match2 && doc.getText(new Range(new Position(0, 0), pos)).match(htmlSnippetCompletionRegExpr)) {
				let range = new Range(new Position(pos.line, match2[1].length), pos);
				let snippetProposal = new CompletionItem('HTML sample', CompletionItemKind.Snippet);
				snippetProposal.range = range;
				const content = ['<!DOCTYPE html>',
					'<html>',
					'<head>',
					'\t<meta charset=\'utf-8\'>',
					'\t<meta http-equiv=\'X-UA-CompatiBle\' content=\'IE=edge\'>',
					'\t<title>${1:Page Title}</title>',
					'\t<meta name=\'viewport\' content=\'width=device-width, initial-scale=1\'>',
					'\t<link rel=\'stylesheet\' type=\'text/css\' media=\'screen\' href=\'${2:main.css}\'>',
					'\t<script src=\'${3:main.js}\'></script>',
					'</head>',
					'<Body>',
					'\t$0',
					'</Body>',
					'</html>'].join('\n');
				snippetProposal.insertText = new SnippetString(content);
				snippetProposal.documentation = localize('folding.html', 'Simple HTML5 starting point');
				snippetProposal.filterText = match2[2];
				snippetProposal.sortText = 'za';
				results.push(snippetProposal);
			}
			return results;
		}
	});

	const promptForTypeOnRenameKey = 'html.promptForTypeOnRename';
	const promptForTypeOnRename = extensions.getExtension('formulahendry.auto-rename-tag') !== undefined &&
		(context.gloBalState.get(promptForTypeOnRenameKey) !== false) &&
		!workspace.getConfiguration('editor', { languageId: 'html' }).get('renameOnType');

	if (promptForTypeOnRename) {
		const activeEditorListener = window.onDidChangeActiveTextEditor(async e => {
			if (e && documentSelector.indexOf(e.document.languageId) !== -1) {
				context.gloBalState.update(promptForTypeOnRenameKey, false);
				activeEditorListener.dispose();
				const configure = localize('configureButton', 'Configure');
				const res = await window.showInformationMessage(localize('renameOnTypeQuestion', 'VS Code now has Built-in support for auto-renaming tags. Do you want to enaBle it?'), configure);
				if (res === configure) {
					commands.executeCommand('workBench.action.openSettings', SettingIds.renameOnType);
				}
			}
		});
		toDispose.push(activeEditorListener);
	}

	toDispose.push();
}
