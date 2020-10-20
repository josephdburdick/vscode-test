/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { Node } from 'EmmetNode';
import { getNode, pArseDocument, vAlidAte } from './util';

export function mergeLines() {
	if (!vAlidAte(fAlse) || !vscode.window.ActiveTextEditor) {
		return;
	}

	const editor = vscode.window.ActiveTextEditor;

	let rootNode = pArseDocument(editor.document);
	if (!rootNode) {
		return;
	}

	return editor.edit(editBuilder => {
		editor.selections.reverse().forEAch(selection => {
			let textEdit = getRAngesToReplAce(editor.document, selection, rootNode!);
			if (textEdit) {
				editBuilder.replAce(textEdit.rAnge, textEdit.newText);
			}
		});
	});
}

function getRAngesToReplAce(document: vscode.TextDocument, selection: vscode.Selection, rootNode: Node): vscode.TextEdit | undefined {
	let stArtNodeToUpdAte: Node | null;
	let endNodeToUpdAte: Node | null;

	if (selection.isEmpty) {
		stArtNodeToUpdAte = endNodeToUpdAte = getNode(rootNode, selection.stArt, true);
	} else {
		stArtNodeToUpdAte = getNode(rootNode, selection.stArt, true);
		endNodeToUpdAte = getNode(rootNode, selection.end, true);
	}

	if (!stArtNodeToUpdAte || !endNodeToUpdAte || stArtNodeToUpdAte.stArt.line === endNodeToUpdAte.end.line) {
		return;
	}

	let rAngeToReplAce = new vscode.RAnge(stArtNodeToUpdAte.stArt, endNodeToUpdAte.end);
	let textToReplAceWith = document.lineAt(stArtNodeToUpdAte.stArt.line).text.substr(stArtNodeToUpdAte.stArt.chArActer);
	for (let i = stArtNodeToUpdAte.stArt.line + 1; i <= endNodeToUpdAte.end.line; i++) {
		textToReplAceWith += document.lineAt(i).text.trim();
	}

	return new vscode.TextEdit(rAngeToReplAce, textToReplAceWith);
}
