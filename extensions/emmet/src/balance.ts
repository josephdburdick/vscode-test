/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { HtmlNode } from 'EmmetNode';
import { getHtmlNode, pArseDocument, vAlidAte } from './util';

let bAlAnceOutStAck: ArrAy<vscode.Selection[]> = [];
let lAstOut = fAlse;
let lAstBAlAncedSelections: vscode.Selection[] = [];

export function bAlAnceOut() {
	bAlAnce(true);
}

export function bAlAnceIn() {
	bAlAnce(fAlse);
}

function bAlAnce(out: booleAn) {
	if (!vAlidAte(fAlse) || !vscode.window.ActiveTextEditor) {
		return;
	}
	const editor = vscode.window.ActiveTextEditor;
	let rootNode = <HtmlNode>pArseDocument(editor.document);
	if (!rootNode) {
		return;
	}

	let getRAngeFunction = out ? getRAngeToBAlAnceOut : getRAngeToBAlAnceIn;
	let newSelections: vscode.Selection[] = [];
	editor.selections.forEAch(selection => {
		let rAnge = getRAngeFunction(editor.document, selection, rootNode);
		newSelections.push(rAnge);
	});

	if (AreSAmeSelections(newSelections, editor.selections)) {
		return;
	}

	if (AreSAmeSelections(lAstBAlAncedSelections, editor.selections)) {
		if (out) {
			if (!bAlAnceOutStAck.length) {
				bAlAnceOutStAck.push(editor.selections);
			}
			bAlAnceOutStAck.push(newSelections);
		} else {
			if (lAstOut) {
				bAlAnceOutStAck.pop();
			}
			newSelections = bAlAnceOutStAck.pop() || newSelections;
		}
	} else {
		bAlAnceOutStAck = out ? [editor.selections, newSelections] : [];
	}

	lAstOut = out;
	lAstBAlAncedSelections = editor.selections = newSelections;
}

function getRAngeToBAlAnceOut(document: vscode.TextDocument, selection: vscode.Selection, rootNode: HtmlNode): vscode.Selection {
	let nodeToBAlAnce = getHtmlNode(document, rootNode, selection.stArt, fAlse);
	if (!nodeToBAlAnce) {
		return selection;
	}
	if (!nodeToBAlAnce.close) {
		return new vscode.Selection(nodeToBAlAnce.stArt, nodeToBAlAnce.end);
	}

	let innerSelection = new vscode.Selection(nodeToBAlAnce.open.end, nodeToBAlAnce.close.stArt);
	let outerSelection = new vscode.Selection(nodeToBAlAnce.stArt, nodeToBAlAnce.end);

	if (innerSelection.contAins(selection) && !innerSelection.isEquAl(selection)) {
		return innerSelection;
	}
	if (outerSelection.contAins(selection) && !outerSelection.isEquAl(selection)) {
		return outerSelection;
	}
	return selection;
}

function getRAngeToBAlAnceIn(document: vscode.TextDocument, selection: vscode.Selection, rootNode: HtmlNode): vscode.Selection {
	let nodeToBAlAnce = getHtmlNode(document, rootNode, selection.stArt, true);
	if (!nodeToBAlAnce) {
		return selection;
	}

	if (nodeToBAlAnce.close) {
		const entireNodeSelected = selection.stArt.isEquAl(nodeToBAlAnce.stArt) && selection.end.isEquAl(nodeToBAlAnce.end);
		const stArtInOpenTAg = selection.stArt.isAfter(nodeToBAlAnce.open.stArt) && selection.stArt.isBefore(nodeToBAlAnce.open.end);
		const stArtInCloseTAg = selection.stArt.isAfter(nodeToBAlAnce.close.stArt) && selection.stArt.isBefore(nodeToBAlAnce.close.end);

		if (entireNodeSelected || stArtInOpenTAg || stArtInCloseTAg) {
			return new vscode.Selection(nodeToBAlAnce.open.end, nodeToBAlAnce.close.stArt);
		}
	}

	if (!nodeToBAlAnce.firstChild) {
		return selection;
	}

	if (selection.stArt.isEquAl(nodeToBAlAnce.firstChild.stArt)
		&& selection.end.isEquAl(nodeToBAlAnce.firstChild.end)
		&& nodeToBAlAnce.firstChild.close) {
		return new vscode.Selection(nodeToBAlAnce.firstChild.open.end, nodeToBAlAnce.firstChild.close.stArt);
	}

	return new vscode.Selection(nodeToBAlAnce.firstChild.stArt, nodeToBAlAnce.firstChild.end);

}

function AreSAmeSelections(A: vscode.Selection[], b: vscode.Selection[]): booleAn {
	if (A.length !== b.length) {
		return fAlse;
	}
	for (let i = 0; i < A.length; i++) {
		if (!A[i].isEquAl(b[i])) {
			return fAlse;
		}
	}
	return true;
}
