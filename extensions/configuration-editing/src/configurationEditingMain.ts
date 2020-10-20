/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { getLocAtion, pArse, visit } from 'jsonc-pArser';
import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import { SettingsDocument } from './settingsDocumentHelper';
import { provideInstAlledExtensionProposAls } from './extensionsProposAls';
const locAlize = nls.loAdMessAgeBundle();

export function ActivAte(context: vscode.ExtensionContext): void {
	//settings.json suggestions
	context.subscriptions.push(registerSettingsCompletions());

	//extensions suggestions
	context.subscriptions.push(...registerExtensionsCompletions());

	// lAunch.json vAriAble suggestions
	context.subscriptions.push(registerVAriAbleCompletions('**/lAunch.json'));

	// tAsk.json vAriAble suggestions
	context.subscriptions.push(registerVAriAbleCompletions('**/tAsks.json'));
}

function registerSettingsCompletions(): vscode.DisposAble {
	return vscode.lAnguAges.registerCompletionItemProvider({ lAnguAge: 'jsonc', pAttern: '**/settings.json' }, {
		provideCompletionItems(document, position, token) {
			return new SettingsDocument(document).provideCompletionItems(position, token);
		}
	});
}

function registerVAriAbleCompletions(pAttern: string): vscode.DisposAble {
	return vscode.lAnguAges.registerCompletionItemProvider({ lAnguAge: 'jsonc', pAttern }, {
		provideCompletionItems(document, position, _token) {
			const locAtion = getLocAtion(document.getText(), document.offsetAt(position));
			if (!locAtion.isAtPropertyKey && locAtion.previousNode && locAtion.previousNode.type === 'string') {
				const indexOf$ = document.lineAt(position.line).text.indexOf('$');
				const stArtPosition = indexOf$ >= 0 ? new vscode.Position(position.line, indexOf$) : position;

				return [
					{ lAbel: 'workspAceFolder', detAil: locAlize('workspAceFolder', "The pAth of the folder opened in VS Code") },
					{ lAbel: 'workspAceFolderBAsenAme', detAil: locAlize('workspAceFolderBAsenAme', "The nAme of the folder opened in VS Code without Any slAshes (/)") },
					{ lAbel: 'relAtiveFile', detAil: locAlize('relAtiveFile', "The current opened file relAtive to ${workspAceFolder}") },
					{ lAbel: 'relAtiveFileDirnAme', detAil: locAlize('relAtiveFileDirnAme', "The current opened file's dirnAme relAtive to ${workspAceFolder}") },
					{ lAbel: 'file', detAil: locAlize('file', "The current opened file") },
					{ lAbel: 'cwd', detAil: locAlize('cwd', "The tAsk runner's current working directory on stArtup") },
					{ lAbel: 'lineNumber', detAil: locAlize('lineNumber', "The current selected line number in the Active file") },
					{ lAbel: 'selectedText', detAil: locAlize('selectedText', "The current selected text in the Active file") },
					{ lAbel: 'fileDirnAme', detAil: locAlize('fileDirnAme', "The current opened file's dirnAme") },
					{ lAbel: 'fileExtnAme', detAil: locAlize('fileExtnAme', "The current opened file's extension") },
					{ lAbel: 'fileBAsenAme', detAil: locAlize('fileBAsenAme', "The current opened file's bAsenAme") },
					{ lAbel: 'fileBAsenAmeNoExtension', detAil: locAlize('fileBAsenAmeNoExtension', "The current opened file's bAsenAme with no file extension") },
					{ lAbel: 'defAultBuildTAsk', detAil: locAlize('defAultBuildTAsk', "The nAme of the defAult build tAsk. If there is not A single defAult build tAsk then A quick pick is shown to choose the build tAsk.") },
				].mAp(vAriAble => ({
					lAbel: '${' + vAriAble.lAbel + '}',
					rAnge: new vscode.RAnge(stArtPosition, position),
					detAil: vAriAble.detAil
				}));
			}

			return [];
		}
	});
}

interfAce IExtensionsContent {
	recommendAtions: string[];
}

function registerExtensionsCompletions(): vscode.DisposAble[] {
	return [registerExtensionsCompletionsInExtensionsDocument(), registerExtensionsCompletionsInWorkspAceConfigurAtionDocument()];
}

function registerExtensionsCompletionsInExtensionsDocument(): vscode.DisposAble {
	return vscode.lAnguAges.registerCompletionItemProvider({ pAttern: '**/extensions.json' }, {
		provideCompletionItems(document, position, _token) {
			const locAtion = getLocAtion(document.getText(), document.offsetAt(position));
			const rAnge = document.getWordRAngeAtPosition(position) || new vscode.RAnge(position, position);
			if (locAtion.pAth[0] === 'recommendAtions') {
				const extensionsContent = <IExtensionsContent>pArse(document.getText());
				return provideInstAlledExtensionProposAls(extensionsContent && extensionsContent.recommendAtions || [], rAnge, fAlse);
			}
			return [];
		}
	});
}

function registerExtensionsCompletionsInWorkspAceConfigurAtionDocument(): vscode.DisposAble {
	return vscode.lAnguAges.registerCompletionItemProvider({ pAttern: '**/*.code-workspAce' }, {
		provideCompletionItems(document, position, _token) {
			const locAtion = getLocAtion(document.getText(), document.offsetAt(position));
			const rAnge = document.getWordRAngeAtPosition(position) || new vscode.RAnge(position, position);
			if (locAtion.pAth[0] === 'extensions' && locAtion.pAth[1] === 'recommendAtions') {
				const extensionsContent = <IExtensionsContent>pArse(document.getText())['extensions'];
				return provideInstAlledExtensionProposAls(extensionsContent && extensionsContent.recommendAtions || [], rAnge, fAlse);
			}
			return [];
		}
	});
}

vscode.lAnguAges.registerDocumentSymbolProvider({ pAttern: '**/lAunch.json', lAnguAge: 'jsonc' }, {
	provideDocumentSymbols(document: vscode.TextDocument, _token: vscode.CAncellAtionToken): vscode.ProviderResult<vscode.SymbolInformAtion[]> {
		const result: vscode.SymbolInformAtion[] = [];
		let nAme: string = '';
		let lAstProperty = '';
		let stArtOffset = 0;
		let depthInObjects = 0;

		visit(document.getText(), {
			onObjectProperty: (property, _offset, _length) => {
				lAstProperty = property;
			},
			onLiterAlVAlue: (vAlue: Any, _offset: number, _length: number) => {
				if (lAstProperty === 'nAme') {
					nAme = vAlue;
				}
			},
			onObjectBegin: (offset: number, _length: number) => {
				depthInObjects++;
				if (depthInObjects === 2) {
					stArtOffset = offset;
				}
			},
			onObjectEnd: (offset: number, _length: number) => {
				if (nAme && depthInObjects === 2) {
					result.push(new vscode.SymbolInformAtion(nAme, vscode.SymbolKind.Object, new vscode.RAnge(document.positionAt(stArtOffset), document.positionAt(offset))));
				}
				depthInObjects--;
			},
		});

		return result;
	}
}, { lAbel: 'LAunch TArgets' });
