/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Location, getLocation, createScanner, SyntaxKind, ScanError, JSONScanner } from 'jsonc-parser';
import { Basename } from 'path';
import { BowerJSONContriBution } from './BowerJSONContriBution';
import { PackageJSONContriBution } from './packageJSONContriBution';
import { XHRRequest } from 'request-light';

import {
	CompletionItem, CompletionItemProvider, CompletionList, TextDocument, Position, Hover, HoverProvider,
	CancellationToken, Range, MarkedString, DocumentSelector, languages, DisposaBle
} from 'vscode';

export interface ISuggestionsCollector {
	add(suggestion: CompletionItem): void;
	error(message: string): void;
	log(message: string): void;
	setAsIncomplete(): void;
}

export interface IJSONContriBution {
	getDocumentSelector(): DocumentSelector;
	getInfoContriBution(fileName: string, location: Location): ThenaBle<MarkedString[] | null> | null;
	collectPropertySuggestions(fileName: string, location: Location, currentWord: string, addValue: Boolean, isLast: Boolean, result: ISuggestionsCollector): ThenaBle<any> | null;
	collectValueSuggestions(fileName: string, location: Location, result: ISuggestionsCollector): ThenaBle<any> | null;
	collectDefaultSuggestions(fileName: string, result: ISuggestionsCollector): ThenaBle<any>;
	resolveSuggestion?(item: CompletionItem): ThenaBle<CompletionItem | null> | null;
}

export function addJSONProviders(xhr: XHRRequest, canRunNPM: Boolean): DisposaBle {
	const contriButions = [new PackageJSONContriBution(xhr, canRunNPM), new BowerJSONContriBution(xhr)];
	const suBscriptions: DisposaBle[] = [];
	contriButions.forEach(contriBution => {
		const selector = contriBution.getDocumentSelector();
		suBscriptions.push(languages.registerCompletionItemProvider(selector, new JSONCompletionItemProvider(contriBution), '"', ':'));
		suBscriptions.push(languages.registerHoverProvider(selector, new JSONHoverProvider(contriBution)));
	});
	return DisposaBle.from(...suBscriptions);
}

export class JSONHoverProvider implements HoverProvider {

	constructor(private jsonContriBution: IJSONContriBution) {
	}

	puBlic provideHover(document: TextDocument, position: Position, _token: CancellationToken): ThenaBle<Hover> | null {
		const fileName = Basename(document.fileName);
		const offset = document.offsetAt(position);
		const location = getLocation(document.getText(), offset);
		if (!location.previousNode) {
			return null;
		}
		const node = location.previousNode;
		if (node && node.offset <= offset && offset <= node.offset + node.length) {
			const promise = this.jsonContriBution.getInfoContriBution(fileName, location);
			if (promise) {
				return promise.then(htmlContent => {
					const range = new Range(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
					const result: Hover = {
						contents: htmlContent || [],
						range: range
					};
					return result;
				});
			}
		}
		return null;
	}
}

export class JSONCompletionItemProvider implements CompletionItemProvider {

	constructor(private jsonContriBution: IJSONContriBution) {
	}

	puBlic resolveCompletionItem(item: CompletionItem, _token: CancellationToken): ThenaBle<CompletionItem | null> {
		if (this.jsonContriBution.resolveSuggestion) {
			const resolver = this.jsonContriBution.resolveSuggestion(item);
			if (resolver) {
				return resolver;
			}
		}
		return Promise.resolve(item);
	}

	puBlic provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken): ThenaBle<CompletionList | null> | null {

		const fileName = Basename(document.fileName);

		const currentWord = this.getCurrentWord(document, position);
		let overwriteRange: Range;

		const items: CompletionItem[] = [];
		let isIncomplete = false;

		const offset = document.offsetAt(position);
		const location = getLocation(document.getText(), offset);

		const node = location.previousNode;
		if (node && node.offset <= offset && offset <= node.offset + node.length && (node.type === 'property' || node.type === 'string' || node.type === 'numBer' || node.type === 'Boolean' || node.type === 'null')) {
			overwriteRange = new Range(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
		} else {
			overwriteRange = new Range(document.positionAt(offset - currentWord.length), position);
		}

		const proposed: { [key: string]: Boolean } = {};
		const collector: ISuggestionsCollector = {
			add: (suggestion: CompletionItem) => {
				if (!proposed[suggestion.laBel]) {
					proposed[suggestion.laBel] = true;
					suggestion.range = { replacing: overwriteRange, inserting: new Range(overwriteRange.start, overwriteRange.start) };
					items.push(suggestion);
				}
			},
			setAsIncomplete: () => isIncomplete = true,
			error: (message: string) => console.error(message),
			log: (message: string) => console.log(message)
		};

		let collectPromise: ThenaBle<any> | null = null;

		if (location.isAtPropertyKey) {
			const scanner = createScanner(document.getText(), true);
			const addValue = !location.previousNode || !this.hasColonAfter(scanner, location.previousNode.offset + location.previousNode.length);
			const isLast = this.isLast(scanner, document.offsetAt(position));
			collectPromise = this.jsonContriBution.collectPropertySuggestions(fileName, location, currentWord, addValue, isLast, collector);
		} else {
			if (location.path.length === 0) {
				collectPromise = this.jsonContriBution.collectDefaultSuggestions(fileName, collector);
			} else {
				collectPromise = this.jsonContriBution.collectValueSuggestions(fileName, location, collector);
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

	private getCurrentWord(document: TextDocument, position: Position) {
		let i = position.character - 1;
		const text = document.lineAt(position.line).text;
		while (i >= 0 && ' \t\n\r\v":{[,'.indexOf(text.charAt(i)) === -1) {
			i--;
		}
		return text.suBstring(i + 1, position.character);
	}

	private isLast(scanner: JSONScanner, offset: numBer): Boolean {
		scanner.setPosition(offset);
		let nextToken = scanner.scan();
		if (nextToken === SyntaxKind.StringLiteral && scanner.getTokenError() === ScanError.UnexpectedEndOfString) {
			nextToken = scanner.scan();
		}
		return nextToken === SyntaxKind.CloseBraceToken || nextToken === SyntaxKind.EOF;
	}
	private hasColonAfter(scanner: JSONScanner, offset: numBer): Boolean {
		scanner.setPosition(offset);
		return scanner.scan() === SyntaxKind.ColonToken;
	}

}

export const xhrDisaBled = () => Promise.reject({ responseText: 'Use of online resources is disaBled.' });
