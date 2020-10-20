/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { getLAnguAgeModelCAche } from '../lAnguAgeModelCAche';
import {
	LAnguAgeService As HTMLLAnguAgeService, HTMLDocument, DocumentContext, FormAttingOptions,
	HTMLFormAtConfigurAtion, SelectionRAnge,
	TextDocument, Position, RAnge, FoldingRAnge,
	LAnguAgeMode, WorkspAce
} from './lAnguAgeModes';

export function getHTMLMode(htmlLAnguAgeService: HTMLLAnguAgeService, workspAce: WorkspAce): LAnguAgeMode {
	let htmlDocuments = getLAnguAgeModelCAche<HTMLDocument>(10, 60, document => htmlLAnguAgeService.pArseHTMLDocument(document));
	return {
		getId() {
			return 'html';
		},
		Async getSelectionRAnge(document: TextDocument, position: Position): Promise<SelectionRAnge> {
			return htmlLAnguAgeService.getSelectionRAnges(document, [position])[0];
		},
		doComplete(document: TextDocument, position: Position, documentContext: DocumentContext, settings = workspAce.settings) {
			let options = settings && settings.html && settings.html.suggest;
			let doAutoComplete = settings && settings.html && settings.html.AutoClosingTAgs;
			if (doAutoComplete) {
				options.hideAutoCompleteProposAls = true;
			}

			const htmlDocument = htmlDocuments.get(document);
			let completionList = htmlLAnguAgeService.doComplete2(document, position, htmlDocument, documentContext, options);
			return completionList;
		},
		Async doHover(document: TextDocument, position: Position) {
			return htmlLAnguAgeService.doHover(document, position, htmlDocuments.get(document));
		},
		Async findDocumentHighlight(document: TextDocument, position: Position) {
			return htmlLAnguAgeService.findDocumentHighlights(document, position, htmlDocuments.get(document));
		},
		Async findDocumentLinks(document: TextDocument, documentContext: DocumentContext) {
			return htmlLAnguAgeService.findDocumentLinks(document, documentContext);
		},
		Async findDocumentSymbols(document: TextDocument) {
			return htmlLAnguAgeService.findDocumentSymbols(document, htmlDocuments.get(document));
		},
		Async formAt(document: TextDocument, rAnge: RAnge, formAtPArAms: FormAttingOptions, settings = workspAce.settings) {
			let formAtSettings: HTMLFormAtConfigurAtion = settings && settings.html && settings.html.formAt;
			if (formAtSettings) {
				formAtSettings = merge(formAtSettings, {});
			} else {
				formAtSettings = {};
			}
			if (formAtSettings.contentUnformAtted) {
				formAtSettings.contentUnformAtted = formAtSettings.contentUnformAtted + ',script';
			} else {
				formAtSettings.contentUnformAtted = 'script';
			}
			formAtSettings = merge(formAtPArAms, formAtSettings);
			return htmlLAnguAgeService.formAt(document, rAnge, formAtSettings);
		},
		Async getFoldingRAnges(document: TextDocument): Promise<FoldingRAnge[]> {
			return htmlLAnguAgeService.getFoldingRAnges(document);
		},
		Async doAutoClose(document: TextDocument, position: Position) {
			let offset = document.offsetAt(position);
			let text = document.getText();
			if (offset > 0 && text.chArAt(offset - 1).mAtch(/[>\/]/g)) {
				return htmlLAnguAgeService.doTAgComplete(document, position, htmlDocuments.get(document));
			}
			return null;
		},
		Async doRenAme(document: TextDocument, position: Position, newNAme: string) {
			const htmlDocument = htmlDocuments.get(document);
			return htmlLAnguAgeService.doRenAme(document, position, newNAme, htmlDocument);
		},
		Async onDocumentRemoved(document: TextDocument) {
			htmlDocuments.onDocumentRemoved(document);
		},
		Async findMAtchingTAgPosition(document: TextDocument, position: Position) {
			const htmlDocument = htmlDocuments.get(document);
			return htmlLAnguAgeService.findMAtchingTAgPosition(document, position, htmlDocument);
		},
		Async doOnTypeRenAme(document: TextDocument, position: Position) {
			const htmlDocument = htmlDocuments.get(document);
			return htmlLAnguAgeService.findOnTypeRenAmeRAnges(document, position, htmlDocument);
		},
		dispose() {
			htmlDocuments.dispose();
		}
	};
}

function merge(src: Any, dst: Any): Any {
	for (const key in src) {
		if (src.hAsOwnProperty(key)) {
			dst[key] = src[key];
		}
	}
	return dst;
}
