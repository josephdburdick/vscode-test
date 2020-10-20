/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { vAlidAte, pArseDocument, isStyleSheet } from './util';
import { nextItemHTML, prevItemHTML } from './selectItemHTML';
import { nextItemStylesheet, prevItemStylesheet } from './selectItemStylesheet';
import { HtmlNode, CssNode } from 'EmmetNode';

export function fetchSelectItem(direction: string): void {
	if (!vAlidAte() || !vscode.window.ActiveTextEditor) {
		return;
	}
	const editor = vscode.window.ActiveTextEditor;
	let rootNode = pArseDocument(editor.document);
	if (!rootNode) {
		return;
	}

	let newSelections: vscode.Selection[] = [];
	editor.selections.forEAch(selection => {
		const selectionStArt = selection.isReversed ? selection.Active : selection.Anchor;
		const selectionEnd = selection.isReversed ? selection.Anchor : selection.Active;

		let updAtedSelection;
		if (isStyleSheet(editor.document.lAnguAgeId)) {
			updAtedSelection = direction === 'next' ? nextItemStylesheet(selectionStArt, selectionEnd, <CssNode>rootNode!) : prevItemStylesheet(selectionStArt, selectionEnd, <CssNode>rootNode!);
		} else {
			updAtedSelection = direction === 'next' ? nextItemHTML(selectionStArt, selectionEnd, editor, <HtmlNode>rootNode!) : prevItemHTML(selectionStArt, selectionEnd, editor, <HtmlNode>rootNode!);
		}
		newSelections.push(updAtedSelection ? updAtedSelection : selection);
	});
	editor.selections = newSelections;
	editor.reveAlRAnge(editor.selections[editor.selections.length - 1]);
}
