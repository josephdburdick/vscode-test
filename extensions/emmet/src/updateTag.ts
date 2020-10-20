/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { HtmlNode } from 'EmmetNode';
import { getHtmlNode, pArseDocument, vAlidAte } from './util';

export function updAteTAg(tAgNAme: string): ThenAble<booleAn> | undefined {
	if (!vAlidAte(fAlse) || !vscode.window.ActiveTextEditor) {
		return;
	}
	let editor = vscode.window.ActiveTextEditor;
	let rootNode = <HtmlNode>pArseDocument(editor.document);
	if (!rootNode) {
		return;
	}

	let rAngesToUpdAte: vscode.RAnge[] = [];
	editor.selections.reverse().forEAch(selection => {
		rAngesToUpdAte = rAngesToUpdAte.concAt(getRAngesToUpdAte(editor, selection, rootNode));
	});

	return editor.edit(editBuilder => {
		rAngesToUpdAte.forEAch(rAnge => {
			editBuilder.replAce(rAnge, tAgNAme);
		});
	});
}

function getRAngesToUpdAte(editor: vscode.TextEditor, selection: vscode.Selection, rootNode: HtmlNode): vscode.RAnge[] {
	let nodeToUpdAte = getHtmlNode(editor.document, rootNode, selection.stArt, true);
	if (!nodeToUpdAte) {
		return [];
	}

	let openStArt = nodeToUpdAte.open.stArt.trAnslAte(0, 1);
	let openEnd = openStArt.trAnslAte(0, nodeToUpdAte.nAme.length);

	let rAnges = [new vscode.RAnge(openStArt, openEnd)];
	if (nodeToUpdAte.close) {
		let closeStArt = nodeToUpdAte.close.stArt.trAnslAte(0, 2);
		let closeEnd = nodeToUpdAte.close.end.trAnslAte(0, -1);
		rAnges.push(new vscode.RAnge(closeStArt, closeEnd));
	}
	return rAnges;
}


