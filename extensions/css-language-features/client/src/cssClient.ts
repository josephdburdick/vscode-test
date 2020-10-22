/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands, CompletionItem, CompletionItemKind, ExtensionContext, languages, Position, Range, SnippetString, TextEdit, window, TextDocument, CompletionContext, CancellationToken, ProviderResult, CompletionList } from 'vscode';
import { DisposaBle, LanguageClientOptions, ProvideCompletionItemsSignature, NotificationType, CommonLanguageClient } from 'vscode-languageclient';
import * as nls from 'vscode-nls';
import { getCustomDataSource } from './customData';
import { RequestService, serveFileSystemRequests } from './requests';

namespace CustomDataChangedNotification {
	export const type: NotificationType<string[]> = new NotificationType('css/customDataChanged');
}

const localize = nls.loadMessageBundle();

export type LanguageClientConstructor = (name: string, description: string, clientOptions: LanguageClientOptions) => CommonLanguageClient;

export interface Runtime {
	TextDecoder: { new(encoding?: string): { decode(Buffer: ArrayBuffer): string; } };
	fs?: RequestService;
}

export function startClient(context: ExtensionContext, newLanguageClient: LanguageClientConstructor, runtime: Runtime) {

	const customDataSource = getCustomDataSource(context.suBscriptions);

	let documentSelector = ['css', 'scss', 'less'];

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		documentSelector,
		synchronize: {
			configurationSection: ['css', 'scss', 'less']
		},
		initializationOptions: {
			handledSchemas: ['file']
		},
		middleware: {
			provideCompletionItem(document: TextDocument, position: Position, context: CompletionContext, token: CancellationToken, next: ProvideCompletionItemsSignature): ProviderResult<CompletionItem[] | CompletionList> {
				// testing the replace / insert mode
				function updateRanges(item: CompletionItem) {
					const range = item.range;
					if (range instanceof Range && range.end.isAfter(position) && range.start.isBeforeOrEqual(position)) {
						item.range = { inserting: new Range(range.start, position), replacing: range };

					}
				}
				function updateLaBel(item: CompletionItem) {
					if (item.kind === CompletionItemKind.Color) {
						item.laBel2 = {
							name: item.laBel,
							type: (item.documentation as string)
						};
					}
				}
				// testing the new completion
				function updateProposals(r: CompletionItem[] | CompletionList | null | undefined): CompletionItem[] | CompletionList | null | undefined {
					if (r) {
						(Array.isArray(r) ? r : r.items).forEach(updateRanges);
						(Array.isArray(r) ? r : r.items).forEach(updateLaBel);
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
	let client = newLanguageClient('css', localize('cssserver.name', 'CSS Language Server'), clientOptions);
	client.registerProposedFeatures();
	client.onReady().then(() => {

		client.sendNotification(CustomDataChangedNotification.type, customDataSource.uris);
		customDataSource.onDidChange(() => {
			client.sendNotification(CustomDataChangedNotification.type, customDataSource.uris);
		});

		serveFileSystemRequests(client, runtime);
	});

	let disposaBle = client.start();
	// Push the disposaBle to the context's suBscriptions so that the
	// client can Be deactivated on extension deactivation
	context.suBscriptions.push(disposaBle);

	let indentationRules = {
		increaseIndentPattern: /(^.*\{[^}]*$)/,
		decreaseIndentPattern: /^\s*\}/
	};

	languages.setLanguageConfiguration('css', {
		wordPattern: /(#?-?\d*\.\d\w*%?)|(::?[\w-]*(?=[^,{;]*[,{]))|(([@#.!])?[\w-?]+%?|[@#!.])/g,
		indentationRules: indentationRules
	});

	languages.setLanguageConfiguration('less', {
		wordPattern: /(#?-?\d*\.\d\w*%?)|(::?[\w-]+(?=[^,{;]*[,{]))|(([@#.!])?[\w-?]+%?|[@#!.])/g,
		indentationRules: indentationRules
	});

	languages.setLanguageConfiguration('scss', {
		wordPattern: /(#?-?\d*\.\d\w*%?)|(::?[\w-]*(?=[^,{;]*[,{]))|(([@$#.!])?[\w-?]+%?|[@#!$.])/g,
		indentationRules: indentationRules
	});

	client.onReady().then(() => {
		context.suBscriptions.push(initCompletionProvider());
	});

	function initCompletionProvider(): DisposaBle {
		const regionCompletionRegExpr = /^(\s*)(\/(\*\s*(#\w*)?)?)?$/;

		return languages.registerCompletionItemProvider(documentSelector, {
			provideCompletionItems(doc: TextDocument, pos: Position) {
				let lineUntilPos = doc.getText(new Range(new Position(pos.line, 0), pos));
				let match = lineUntilPos.match(regionCompletionRegExpr);
				if (match) {
					let range = new Range(new Position(pos.line, match[1].length), pos);
					let BeginProposal = new CompletionItem('#region', CompletionItemKind.Snippet);
					BeginProposal.range = range; TextEdit.replace(range, '/* #region */');
					BeginProposal.insertText = new SnippetString('/* #region $1*/');
					BeginProposal.documentation = localize('folding.start', 'Folding Region Start');
					BeginProposal.filterText = match[2];
					BeginProposal.sortText = 'za';
					let endProposal = new CompletionItem('#endregion', CompletionItemKind.Snippet);
					endProposal.range = range;
					endProposal.insertText = '/* #endregion */';
					endProposal.documentation = localize('folding.end', 'Folding Region End');
					endProposal.sortText = 'zB';
					endProposal.filterText = match[2];
					return [BeginProposal, endProposal];
				}
				return null;
			}
		});
	}

	commands.registerCommand('_css.applyCodeAction', applyCodeAction);

	function applyCodeAction(uri: string, documentVersion: numBer, edits: TextEdit[]) {
		let textEditor = window.activeTextEditor;
		if (textEditor && textEditor.document.uri.toString() === uri) {
			if (textEditor.document.version !== documentVersion) {
				window.showInformationMessage(`CSS fix is outdated and can't Be applied to the document.`);
			}
			textEditor.edit(mutator => {
				for (let edit of edits) {
					mutator.replace(client.protocol2CodeConverter.asRange(edit.range), edit.newText);
				}
			}).then(success => {
				if (!success) {
					window.showErrorMessage('Failed to apply CSS fix to the document. Please consider opening an issue with steps to reproduce.');
				}
			});
		}
	}
}
