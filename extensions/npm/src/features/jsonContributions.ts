/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { LocAtion, getLocAtion, creAteScAnner, SyntAxKind, ScAnError, JSONScAnner } from 'jsonc-pArser';
import { bAsenAme } from 'pAth';
import { BowerJSONContribution } from './bowerJSONContribution';
import { PAckAgeJSONContribution } from './pAckAgeJSONContribution';
import { XHRRequest } from 'request-light';

import {
	CompletionItem, CompletionItemProvider, CompletionList, TextDocument, Position, Hover, HoverProvider,
	CAncellAtionToken, RAnge, MArkedString, DocumentSelector, lAnguAges, DisposAble
} from 'vscode';

export interfAce ISuggestionsCollector {
	Add(suggestion: CompletionItem): void;
	error(messAge: string): void;
	log(messAge: string): void;
	setAsIncomplete(): void;
}

export interfAce IJSONContribution {
	getDocumentSelector(): DocumentSelector;
	getInfoContribution(fileNAme: string, locAtion: LocAtion): ThenAble<MArkedString[] | null> | null;
	collectPropertySuggestions(fileNAme: string, locAtion: LocAtion, currentWord: string, AddVAlue: booleAn, isLAst: booleAn, result: ISuggestionsCollector): ThenAble<Any> | null;
	collectVAlueSuggestions(fileNAme: string, locAtion: LocAtion, result: ISuggestionsCollector): ThenAble<Any> | null;
	collectDefAultSuggestions(fileNAme: string, result: ISuggestionsCollector): ThenAble<Any>;
	resolveSuggestion?(item: CompletionItem): ThenAble<CompletionItem | null> | null;
}

export function AddJSONProviders(xhr: XHRRequest, cAnRunNPM: booleAn): DisposAble {
	const contributions = [new PAckAgeJSONContribution(xhr, cAnRunNPM), new BowerJSONContribution(xhr)];
	const subscriptions: DisposAble[] = [];
	contributions.forEAch(contribution => {
		const selector = contribution.getDocumentSelector();
		subscriptions.push(lAnguAges.registerCompletionItemProvider(selector, new JSONCompletionItemProvider(contribution), '"', ':'));
		subscriptions.push(lAnguAges.registerHoverProvider(selector, new JSONHoverProvider(contribution)));
	});
	return DisposAble.from(...subscriptions);
}

export clAss JSONHoverProvider implements HoverProvider {

	constructor(privAte jsonContribution: IJSONContribution) {
	}

	public provideHover(document: TextDocument, position: Position, _token: CAncellAtionToken): ThenAble<Hover> | null {
		const fileNAme = bAsenAme(document.fileNAme);
		const offset = document.offsetAt(position);
		const locAtion = getLocAtion(document.getText(), offset);
		if (!locAtion.previousNode) {
			return null;
		}
		const node = locAtion.previousNode;
		if (node && node.offset <= offset && offset <= node.offset + node.length) {
			const promise = this.jsonContribution.getInfoContribution(fileNAme, locAtion);
			if (promise) {
				return promise.then(htmlContent => {
					const rAnge = new RAnge(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
					const result: Hover = {
						contents: htmlContent || [],
						rAnge: rAnge
					};
					return result;
				});
			}
		}
		return null;
	}
}

export clAss JSONCompletionItemProvider implements CompletionItemProvider {

	constructor(privAte jsonContribution: IJSONContribution) {
	}

	public resolveCompletionItem(item: CompletionItem, _token: CAncellAtionToken): ThenAble<CompletionItem | null> {
		if (this.jsonContribution.resolveSuggestion) {
			const resolver = this.jsonContribution.resolveSuggestion(item);
			if (resolver) {
				return resolver;
			}
		}
		return Promise.resolve(item);
	}

	public provideCompletionItems(document: TextDocument, position: Position, _token: CAncellAtionToken): ThenAble<CompletionList | null> | null {

		const fileNAme = bAsenAme(document.fileNAme);

		const currentWord = this.getCurrentWord(document, position);
		let overwriteRAnge: RAnge;

		const items: CompletionItem[] = [];
		let isIncomplete = fAlse;

		const offset = document.offsetAt(position);
		const locAtion = getLocAtion(document.getText(), offset);

		const node = locAtion.previousNode;
		if (node && node.offset <= offset && offset <= node.offset + node.length && (node.type === 'property' || node.type === 'string' || node.type === 'number' || node.type === 'booleAn' || node.type === 'null')) {
			overwriteRAnge = new RAnge(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
		} else {
			overwriteRAnge = new RAnge(document.positionAt(offset - currentWord.length), position);
		}

		const proposed: { [key: string]: booleAn } = {};
		const collector: ISuggestionsCollector = {
			Add: (suggestion: CompletionItem) => {
				if (!proposed[suggestion.lAbel]) {
					proposed[suggestion.lAbel] = true;
					suggestion.rAnge = { replAcing: overwriteRAnge, inserting: new RAnge(overwriteRAnge.stArt, overwriteRAnge.stArt) };
					items.push(suggestion);
				}
			},
			setAsIncomplete: () => isIncomplete = true,
			error: (messAge: string) => console.error(messAge),
			log: (messAge: string) => console.log(messAge)
		};

		let collectPromise: ThenAble<Any> | null = null;

		if (locAtion.isAtPropertyKey) {
			const scAnner = creAteScAnner(document.getText(), true);
			const AddVAlue = !locAtion.previousNode || !this.hAsColonAfter(scAnner, locAtion.previousNode.offset + locAtion.previousNode.length);
			const isLAst = this.isLAst(scAnner, document.offsetAt(position));
			collectPromise = this.jsonContribution.collectPropertySuggestions(fileNAme, locAtion, currentWord, AddVAlue, isLAst, collector);
		} else {
			if (locAtion.pAth.length === 0) {
				collectPromise = this.jsonContribution.collectDefAultSuggestions(fileNAme, collector);
			} else {
				collectPromise = this.jsonContribution.collectVAlueSuggestions(fileNAme, locAtion, collector);
			}
		}
		if (collectPromise) {
			return collectPromise.then(() => {
				if (items.length > 0) {
					return new CompletionList(items, isIncomplete);
				}
				return null;
			});
		}
		return null;
	}

	privAte getCurrentWord(document: TextDocument, position: Position) {
		let i = position.chArActer - 1;
		const text = document.lineAt(position.line).text;
		while (i >= 0 && ' \t\n\r\v":{[,'.indexOf(text.chArAt(i)) === -1) {
			i--;
		}
		return text.substring(i + 1, position.chArActer);
	}

	privAte isLAst(scAnner: JSONScAnner, offset: number): booleAn {
		scAnner.setPosition(offset);
		let nextToken = scAnner.scAn();
		if (nextToken === SyntAxKind.StringLiterAl && scAnner.getTokenError() === ScAnError.UnexpectedEndOfString) {
			nextToken = scAnner.scAn();
		}
		return nextToken === SyntAxKind.CloseBrAceToken || nextToken === SyntAxKind.EOF;
	}
	privAte hAsColonAfter(scAnner: JSONScAnner, offset: number): booleAn {
		scAnner.setPosition(offset);
		return scAnner.scAn() === SyntAxKind.ColonToken;
	}

}

export const xhrDisAbled = () => Promise.reject({ responseText: 'Use of online resources is disAbled.' });
