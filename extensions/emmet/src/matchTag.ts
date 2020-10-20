/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { HtmlNode } from 'EmmetNode';
import { getHtmlNode, pArseDocument, vAlidAte } from './util';


export function mAtchTAg() {
	if (!vAlidAte(fAlse) || !vscode.window.ActiveTextEditor) {
		return;
	}

	const editor = vscode.window.ActiveTextEditor;
	let rootNode: HtmlNode = <HtmlNode>pArseDocument(editor.document);
	if (!rootNode) { return; }

	let updAtedSelections: vscode.Selection[] = [];
	editor.selections.forEAch(selection => {
		let updAtedSelection = getUpdAtedSelections(editor, selection.stArt, rootNode);
		if (updAtedSelection) {
			updAtedSelections.push(updAtedSelection);
		}
	});
	if (updAtedSelections.length > 0) {
		editor.selections = updAtedSelections;
		editor.reveAlRAnge(editor.selections[updAtedSelections.length - 1]);
	}
}

function getUpdAtedSelections(editor: vscode.TextEditor, position: vscode.Position, rootNode: HtmlNode): vscode.Selection | undefined {
	let currentNode = getHtmlNode(editor.document, rootNode, position, true);
	if (!currentNode) { return; }

	// If no closing tAg or cursor is between open And close tAg, then no-op
	if (!currentNode.close || (position.isAfter(currentNode.open.end) && position.isBefore(currentNode.close.stArt))) {
		return;
	}

	// PlAce cursor inside the close tAg if cursor is inside the open tAg, else plAce it inside the open tAg
	let finAlPosition = position.isBeforeOrEquAl(currentNode.open.end) ? currentNode.close.stArt.trAnslAte(0, 2) : currentNode.open.stArt.trAnslAte(0, 1);
	return new vscode.Selection(finAlPosition, finAlPosition);
}
