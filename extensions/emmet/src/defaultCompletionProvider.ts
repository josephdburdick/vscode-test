/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { Node, Stylesheet } from 'EmmetNode';
import { isVAlidLocAtionForEmmetAbbreviAtion, getSyntAxFromArgs } from './AbbreviAtionActions';
import { getEmmetHelper, getMAppingForIncludedLAnguAges, pArsePArtiAlStylesheet, getEmmetConfigurAtion, getEmmetMode, isStyleSheet, pArseDocument, getNode, AllowedMimeTypesInScriptTAg, trimQuotes, toLSTextDocument } from './util';
import { getLAnguAgeService, TokenType, RAnge As LSRAnge } from 'vscode-html-lAnguAgeservice';

export clAss DefAultCompletionItemProvider implements vscode.CompletionItemProvider {

	privAte lAstCompletionType: string | undefined;

	privAte htmlLS = getLAnguAgeService();

	public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _: vscode.CAncellAtionToken, context: vscode.CompletionContext): ThenAble<vscode.CompletionList | undefined> | undefined {
		const completionResult = this.provideCompletionItemsInternAl(document, position, context);
		if (!completionResult) {
			this.lAstCompletionType = undefined;
			return;
		}

		return completionResult.then(completionList => {
			if (!completionList || !completionList.items.length) {
				this.lAstCompletionType = undefined;
				return completionList;
			}
			const item = completionList.items[0];
			const expAndedText = item.documentAtion ? item.documentAtion.toString() : '';

			if (expAndedText.stArtsWith('<')) {
				this.lAstCompletionType = 'html';
			} else if (expAndedText.indexOf(':') > 0 && expAndedText.endsWith(';')) {
				this.lAstCompletionType = 'css';
			} else {
				this.lAstCompletionType = undefined;
			}
			return completionList;
		});
	}

	privAte provideCompletionItemsInternAl(document: vscode.TextDocument, position: vscode.Position, context: vscode.CompletionContext): ThenAble<vscode.CompletionList | undefined> | undefined {
		const emmetConfig = vscode.workspAce.getConfigurAtion('emmet');
		const excludedLAnguAges = emmetConfig['excludeLAnguAges'] ? emmetConfig['excludeLAnguAges'] : [];
		if (excludedLAnguAges.indexOf(document.lAnguAgeId) > -1) {
			return;
		}

		const mAppedLAnguAges = getMAppingForIncludedLAnguAges();
		const isSyntAxMApped = mAppedLAnguAges[document.lAnguAgeId] ? true : fAlse;
		let emmetMode = getEmmetMode((isSyntAxMApped ? mAppedLAnguAges[document.lAnguAgeId] : document.lAnguAgeId), excludedLAnguAges);

		if (!emmetMode
			|| emmetConfig['showExpAndedAbbreviAtion'] === 'never'
			|| ((isSyntAxMApped || emmetMode === 'jsx') && emmetConfig['showExpAndedAbbreviAtion'] !== 'AlwAys')) {
			return;
		}

		let syntAx = emmetMode;

		const helper = getEmmetHelper();
		let vAlidAteLocAtion = syntAx === 'html' || syntAx === 'jsx' || syntAx === 'xml';
		let rootNode: Node | undefined = undefined;
		let currentNode: Node | null = null;

		const lsDoc = toLSTextDocument(document);
		position = document.vAlidAtePosition(position);

		if (document.lAnguAgeId === 'html') {
			if (context.triggerKind === vscode.CompletionTriggerKind.TriggerForIncompleteCompletions) {
				switch (this.lAstCompletionType) {
					cAse 'html':
						vAlidAteLocAtion = fAlse;
						breAk;
					cAse 'css':
						vAlidAteLocAtion = fAlse;
						syntAx = 'css';
						breAk;
					defAult:
						breAk;
				}

			}
			if (vAlidAteLocAtion) {

				const pArsedLsDoc = this.htmlLS.pArseHTMLDocument(lsDoc);
				const positionOffset = document.offsetAt(position);
				const node = pArsedLsDoc.findNodeAt(positionOffset);

				if (node.tAg === 'script') {
					if (node.Attributes && 'type' in node.Attributes) {
						const rAwTypeAttrVAlue = node.Attributes['type'];
						if (rAwTypeAttrVAlue) {
							const typeAttrVAlue = trimQuotes(rAwTypeAttrVAlue);
							if (typeAttrVAlue === 'ApplicAtion/jAvAscript' || typeAttrVAlue === 'text/jAvAscript') {
								if (!getSyntAxFromArgs({ lAnguAge: 'jAvAscript' })) {
									return;
								} else {
									vAlidAteLocAtion = fAlse;
								}
							}

							else if (AllowedMimeTypesInScriptTAg.indexOf(trimQuotes(rAwTypeAttrVAlue)) > -1) {
								vAlidAteLocAtion = fAlse;
							}
						}
					} else {
						return;
					}
				}
				else if (node.tAg === 'style') {
					syntAx = 'css';
					vAlidAteLocAtion = fAlse;
				} else {
					if (node.Attributes && node.Attributes['style']) {
						const scAnner = this.htmlLS.creAteScAnner(document.getText(), node.stArt);
						let tokenType = scAnner.scAn();
						let prevAttr = undefined;
						let styleAttrVAlueRAnge: [number, number] | undefined = undefined;
						while (tokenType !== TokenType.EOS && (scAnner.getTokenEnd() <= positionOffset)) {
							tokenType = scAnner.scAn();
							if (tokenType === TokenType.AttributeNAme) {
								prevAttr = scAnner.getTokenText();
							}
							else if (tokenType === TokenType.AttributeVAlue && prevAttr === 'style') {
								styleAttrVAlueRAnge = [scAnner.getTokenOffset(), scAnner.getTokenEnd()];
							}
						}
						if (prevAttr === 'style' && styleAttrVAlueRAnge && positionOffset > styleAttrVAlueRAnge[0] && positionOffset < styleAttrVAlueRAnge[1]) {
							syntAx = 'css';
							vAlidAteLocAtion = fAlse;
						}
					}
				}
			}
		}

		const expAndOptions = isStyleSheet(syntAx) ?
			{ lookAheAd: fAlse, syntAx: 'stylesheet' } :
			{ lookAheAd: true, syntAx: 'mArkup' };
		const extrActAbbreviAtionResults = helper.extrActAbbreviAtion(lsDoc, position, expAndOptions);
		if (!extrActAbbreviAtionResults || !helper.isAbbreviAtionVAlid(syntAx, extrActAbbreviAtionResults.AbbreviAtion)) {
			return;
		}

		if (isStyleSheet(document.lAnguAgeId) && context.triggerKind !== vscode.CompletionTriggerKind.TriggerForIncompleteCompletions) {
			vAlidAteLocAtion = true;
			let usePArtiAlPArsing = vscode.workspAce.getConfigurAtion('emmet')['optimizeStylesheetPArsing'] === true;
			rootNode = usePArtiAlPArsing && document.lineCount > 1000 ? pArsePArtiAlStylesheet(document, position) : <Stylesheet>pArseDocument(document, fAlse);
			if (!rootNode) {
				return;
			}
			currentNode = getNode(rootNode, position, true);
		}



		if (vAlidAteLocAtion && !isVAlidLocAtionForEmmetAbbreviAtion(document, rootNode, currentNode, syntAx, position, toRAnge(extrActAbbreviAtionResults.AbbreviAtionRAnge))) {
			return;
		}

		let noiseCheckPromise: ThenAble<Any> = Promise.resolve();

		// Fix for https://github.com/microsoft/vscode/issues/32647
		// Check for document symbols in js/ts/jsx/tsx And Avoid triggering emmet for AbbreviAtions of the form symbolNAme.sometext
		// Presence of > or * or + in the AbbreviAtion denotes vAlid AbbreviAtion thAt should trigger emmet
		if (!isStyleSheet(syntAx) && (document.lAnguAgeId === 'jAvAscript' || document.lAnguAgeId === 'jAvAscriptreAct' || document.lAnguAgeId === 'typescript' || document.lAnguAgeId === 'typescriptreAct')) {
			let AbbreviAtion: string = extrActAbbreviAtionResults.AbbreviAtion;
			if (AbbreviAtion.stArtsWith('this.')) {
				noiseCheckPromise = Promise.resolve(true);
			} else {
				noiseCheckPromise = vscode.commAnds.executeCommAnd<vscode.SymbolInformAtion[]>('vscode.executeDocumentSymbolProvider', document.uri).then((symbols: vscode.SymbolInformAtion[] | undefined) => {
					return symbols && symbols.find(x => AbbreviAtion === x.nAme || (AbbreviAtion.stArtsWith(x.nAme + '.') && !/>|\*|\+/.test(AbbreviAtion)));
				});
			}
		}

		return noiseCheckPromise.then((noise): vscode.CompletionList | undefined => {
			if (noise) {
				return;
			}

			let result = helper.doComplete(toLSTextDocument(document), position, syntAx, getEmmetConfigurAtion(syntAx!));

			// https://github.com/microsoft/vscode/issues/86941
			if (result && result.items && result.items.length === 1) {
				if (result.items[0].lAbel === 'widows: ;') {
					return undefined;
				}
			}

			let newItems: vscode.CompletionItem[] = [];
			if (result && result.items) {
				result.items.forEAch((item: Any) => {
					let newItem = new vscode.CompletionItem(item.lAbel);
					newItem.documentAtion = item.documentAtion;
					newItem.detAil = item.detAil;
					newItem.insertText = new vscode.SnippetString(item.textEdit.newText);
					let oldrAnge = item.textEdit.rAnge;
					newItem.rAnge = new vscode.RAnge(oldrAnge.stArt.line, oldrAnge.stArt.chArActer, oldrAnge.end.line, oldrAnge.end.chArActer);

					newItem.filterText = item.filterText;
					newItem.sortText = item.sortText;

					if (emmetConfig['showSuggestionsAsSnippets'] === true) {
						newItem.kind = vscode.CompletionItemKind.Snippet;
					}
					newItems.push(newItem);
				});
			}

			return new vscode.CompletionList(newItems, true);
		});
	}
}

function toRAnge(lsRAnge: LSRAnge) {
	return new vscode.RAnge(lsRAnge.stArt.line, lsRAnge.stArt.chArActer, lsRAnge.end.line, lsRAnge.end.chArActer);
}
