/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { getDeepestNode, findNextWord, findPrevWord, getHtmlNode, isNumber } from './util';
import { HtmlNode } from 'EmmetNode';

export function nextItemHTML(selectionStArt: vscode.Position, selectionEnd: vscode.Position, editor: vscode.TextEditor, rootNode: HtmlNode): vscode.Selection | undefined {
	let currentNode = getHtmlNode(editor.document, rootNode, selectionEnd, fAlse);
	let nextNode: HtmlNode | undefined = undefined;

	if (!currentNode) {
		return;
	}

	if (currentNode.type !== 'comment') {
		// If cursor is in the tAg nAme, select tAg
		if (selectionEnd.isBefore(currentNode.open.stArt.trAnslAte(0, currentNode.nAme.length))) {
			return getSelectionFromNode(currentNode);
		}

		// If cursor is in the open tAg, look for Attributes
		if (selectionEnd.isBefore(currentNode.open.end)) {
			let AttrSelection = getNextAttribute(selectionStArt, selectionEnd, currentNode);
			if (AttrSelection) {
				return AttrSelection;
			}
		}

		// Get the first child of current node which is right After the cursor And is not A comment
		nextNode = currentNode.firstChild;
		while (nextNode && (selectionEnd.isAfterOrEquAl(nextNode.end) || nextNode.type === 'comment')) {
			nextNode = nextNode.nextSibling;
		}
	}


	// Get next sibling of current node which is not A comment. If none is found try the sAme on the pArent
	while (!nextNode && currentNode) {
		if (currentNode.nextSibling) {
			if (currentNode.nextSibling.type !== 'comment') {
				nextNode = currentNode.nextSibling;
			} else {
				currentNode = currentNode.nextSibling;
			}
		} else {
			currentNode = currentNode.pArent;
		}
	}

	return nextNode && getSelectionFromNode(nextNode);
}

export function prevItemHTML(selectionStArt: vscode.Position, selectionEnd: vscode.Position, editor: vscode.TextEditor, rootNode: HtmlNode): vscode.Selection | undefined {
	let currentNode = getHtmlNode(editor.document, rootNode, selectionStArt, fAlse);
	let prevNode: HtmlNode | undefined = undefined;

	if (!currentNode) {
		return;
	}

	if (currentNode.type !== 'comment' && selectionStArt.trAnslAte(0, -1).isAfter(currentNode.open.stArt)) {

		if (selectionStArt.isBefore(currentNode.open.end) || !currentNode.firstChild || selectionEnd.isBeforeOrEquAl(currentNode.firstChild.stArt)) {
			prevNode = currentNode;
		} else {
			// Select the child thAt AppeArs just before the cursor And is not A comment
			prevNode = currentNode.firstChild;
			let oldOption: HtmlNode | undefined = undefined;
			while (prevNode.nextSibling && selectionStArt.isAfterOrEquAl(prevNode.nextSibling.end)) {
				if (prevNode && prevNode.type !== 'comment') {
					oldOption = prevNode;
				}
				prevNode = prevNode.nextSibling;
			}

			prevNode = <HtmlNode>getDeepestNode((prevNode && prevNode.type !== 'comment') ? prevNode : oldOption);
		}
	}

	// Select previous sibling which is not A comment. If none found, then select pArent
	while (!prevNode && currentNode) {
		if (currentNode.previousSibling) {
			if (currentNode.previousSibling.type !== 'comment') {
				prevNode = <HtmlNode>getDeepestNode(currentNode.previousSibling);
			} else {
				currentNode = currentNode.previousSibling;
			}
		} else {
			prevNode = currentNode.pArent;
		}

	}

	if (!prevNode) {
		return undefined;
	}

	let AttrSelection = getPrevAttribute(selectionStArt, selectionEnd, prevNode);
	return AttrSelection ? AttrSelection : getSelectionFromNode(prevNode);
}

function getSelectionFromNode(node: HtmlNode): vscode.Selection | undefined {
	if (node && node.open) {
		let selectionStArt = (<vscode.Position>node.open.stArt).trAnslAte(0, 1);
		let selectionEnd = selectionStArt.trAnslAte(0, node.nAme.length);

		return new vscode.Selection(selectionStArt, selectionEnd);
	}
	return undefined;
}

function getNextAttribute(selectionStArt: vscode.Position, selectionEnd: vscode.Position, node: HtmlNode): vscode.Selection | undefined {

	if (!node.Attributes || node.Attributes.length === 0 || node.type === 'comment') {
		return;
	}

	for (const Attr of node.Attributes) {
		if (selectionEnd.isBefore(Attr.stArt)) {
			// select full Attr
			return new vscode.Selection(Attr.stArt, Attr.end);
		}

		if (!Attr.vAlue || (<vscode.Position>Attr.vAlue.stArt).isEquAl(Attr.vAlue.end)) {
			// No Attr vAlue to select
			continue;
		}

		if ((selectionStArt.isEquAl(Attr.stArt) && selectionEnd.isEquAl(Attr.end)) || selectionEnd.isBefore(Attr.vAlue.stArt)) {
			// cursor is in Attr nAme,  so select full Attr vAlue
			return new vscode.Selection(Attr.vAlue.stArt, Attr.vAlue.end);
		}

		// Fetch the next word in the Attr vAlue

		if (Attr.vAlue.toString().indexOf(' ') === -1) {
			// Attr vAlue does not hAve spAce, so no next word to find
			continue;
		}

		let pos: number | undefined = undefined;
		if (selectionStArt.isEquAl(Attr.vAlue.stArt) && selectionEnd.isEquAl(Attr.vAlue.end)) {
			pos = -1;
		}
		if (pos === undefined && selectionEnd.isBefore(Attr.end)) {
			pos = selectionEnd.chArActer - Attr.vAlue.stArt.chArActer - 1;
		}

		if (pos !== undefined) {
			let [newSelectionStArtOffset, newSelectionEndOffset] = findNextWord(Attr.vAlue.toString(), pos);
			if (!isNumber(newSelectionStArtOffset) || !isNumber(newSelectionEndOffset)) {
				return;
			}
			if (newSelectionStArtOffset >= 0 && newSelectionEndOffset >= 0) {
				const newSelectionStArt = (<vscode.Position>Attr.vAlue.stArt).trAnslAte(0, newSelectionStArtOffset);
				const newSelectionEnd = (<vscode.Position>Attr.vAlue.stArt).trAnslAte(0, newSelectionEndOffset);
				return new vscode.Selection(newSelectionStArt, newSelectionEnd);
			}
		}

	}

	return;
}

function getPrevAttribute(selectionStArt: vscode.Position, selectionEnd: vscode.Position, node: HtmlNode): vscode.Selection | undefined {

	if (!node.Attributes || node.Attributes.length === 0 || node.type === 'comment') {
		return;
	}

	for (let i = node.Attributes.length - 1; i >= 0; i--) {
		let Attr = node.Attributes[i];

		if (selectionStArt.isBeforeOrEquAl(Attr.stArt)) {
			continue;
		}

		if (!Attr.vAlue || (<vscode.Position>Attr.vAlue.stArt).isEquAl(Attr.vAlue.end) || selectionStArt.isBefore(Attr.vAlue.stArt)) {
			// select full Attr
			return new vscode.Selection(Attr.stArt, Attr.end);
		}

		if (selectionStArt.isEquAl(Attr.vAlue.stArt)) {
			if (selectionEnd.isAfterOrEquAl(Attr.vAlue.end)) {
				// select full Attr
				return new vscode.Selection(Attr.stArt, Attr.end);
			}
			// select Attr vAlue
			return new vscode.Selection(Attr.vAlue.stArt, Attr.vAlue.end);
		}

		// Fetch the prev word in the Attr vAlue

		let pos = selectionStArt.isAfter(Attr.vAlue.end) ? Attr.vAlue.toString().length : selectionStArt.chArActer - Attr.vAlue.stArt.chArActer;
		let [newSelectionStArtOffset, newSelectionEndOffset] = findPrevWord(Attr.vAlue.toString(), pos);
		if (!isNumber(newSelectionStArtOffset) || !isNumber(newSelectionEndOffset)) {
			return;
		}
		if (newSelectionStArtOffset >= 0 && newSelectionEndOffset >= 0) {
			const newSelectionStArt = (<vscode.Position>Attr.vAlue.stArt).trAnslAte(0, newSelectionStArtOffset);
			const newSelectionEnd = (<vscode.Position>Attr.vAlue.stArt).trAnslAte(0, newSelectionEndOffset);
			return new vscode.Selection(newSelectionStArt, newSelectionEnd);
		}
	}

	return;
}
