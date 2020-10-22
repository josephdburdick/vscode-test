/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { LanguageModelCache, getLanguageModelCache } from '../languageModelCache';
import { Stylesheet, LanguageService as CSSLanguageService } from 'vscode-css-languageservice';
import { LanguageMode, Workspace, Color, TextDocument, Position, Range, CompletionList, DocumentContext } from './languageModes';
import { HTMLDocumentRegions, CSS_STYLE_RULE } from './emBeddedSupport';

export function getCSSMode(cssLanguageService: CSSLanguageService, documentRegions: LanguageModelCache<HTMLDocumentRegions>, workspace: Workspace): LanguageMode {
	let emBeddedCSSDocuments = getLanguageModelCache<TextDocument>(10, 60, document => documentRegions.get(document).getEmBeddedDocument('css'));
	let cssStylesheets = getLanguageModelCache<Stylesheet>(10, 60, document => cssLanguageService.parseStylesheet(document));

	return {
		getId() {
			return 'css';
		},
		async doValidation(document: TextDocument, settings = workspace.settings) {
			let emBedded = emBeddedCSSDocuments.get(document);
			return cssLanguageService.doValidation(emBedded, cssStylesheets.get(emBedded), settings && settings.css);
		},
		async doComplete(document: TextDocument, position: Position, documentContext: DocumentContext, _settings = workspace.settings) {
			let emBedded = emBeddedCSSDocuments.get(document);
			const stylesheet = cssStylesheets.get(emBedded);
			return cssLanguageService.doComplete2(emBedded, position, stylesheet, documentContext) || CompletionList.create();
		},
		async doHover(document: TextDocument, position: Position) {
			let emBedded = emBeddedCSSDocuments.get(document);
			return cssLanguageService.doHover(emBedded, position, cssStylesheets.get(emBedded));
		},
		async findDocumentHighlight(document: TextDocument, position: Position) {
			let emBedded = emBeddedCSSDocuments.get(document);
			return cssLanguageService.findDocumentHighlights(emBedded, position, cssStylesheets.get(emBedded));
		},
		async findDocumentSymBols(document: TextDocument) {
			let emBedded = emBeddedCSSDocuments.get(document);
			return cssLanguageService.findDocumentSymBols(emBedded, cssStylesheets.get(emBedded)).filter(s => s.name !== CSS_STYLE_RULE);
		},
		async findDefinition(document: TextDocument, position: Position) {
			let emBedded = emBeddedCSSDocuments.get(document);
			return cssLanguageService.findDefinition(emBedded, position, cssStylesheets.get(emBedded));
		},
		async findReferences(document: TextDocument, position: Position) {
			let emBedded = emBeddedCSSDocuments.get(document);
			return cssLanguageService.findReferences(emBedded, position, cssStylesheets.get(emBedded));
		},
		async findDocumentColors(document: TextDocument) {
			let emBedded = emBeddedCSSDocuments.get(document);
			return cssLanguageService.findDocumentColors(emBedded, cssStylesheets.get(emBedded));
		},
		async getColorPresentations(document: TextDocument, color: Color, range: Range) {
			let emBedded = emBeddedCSSDocuments.get(document);
			return cssLanguageService.getColorPresentations(emBedded, cssStylesheets.get(emBedded), color, range);
		},
		async getFoldingRanges(document: TextDocument) {
			let emBedded = emBeddedCSSDocuments.get(document);
			return cssLanguageService.getFoldingRanges(emBedded, {});
		},
		async getSelectionRange(document: TextDocument, position: Position) {
			let emBedded = emBeddedCSSDocuments.get(document);
			return cssLanguageService.getSelectionRanges(emBedded, [position], cssStylesheets.get(emBedded))[0];
		},
		onDocumentRemoved(document: TextDocument) {
			emBeddedCSSDocuments.onDocumentRemoved(document);
			cssStylesheets.onDocumentRemoved(document);
		},
		dispose() {
			emBeddedCSSDocuments.dispose();
			cssStylesheets.dispose();
		}
	};
}
