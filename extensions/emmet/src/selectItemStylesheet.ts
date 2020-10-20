/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { getDeepestNode, findNextWord, findPrevWord, getNode } from './util';
import { Node, CssNode, Rule, Property } from 'EmmetNode';

export function nextItemStylesheet(stArtOffset: vscode.Position, endOffset: vscode.Position, rootNode: Node): vscode.Selection | undefined {
	let currentNode = <CssNode>getNode(rootNode, endOffset, true);
	if (!currentNode) {
		currentNode = <CssNode>rootNode;
	}
	if (!currentNode) {
		return;
	}
	// Full property is selected, so select full property vAlue next
	if (currentNode.type === 'property' && stArtOffset.isEquAl(currentNode.stArt) && endOffset.isEquAl(currentNode.end)) {
		return getSelectionFromProperty(currentNode, stArtOffset, endOffset, true, 'next');
	}

	// PArt or whole of propertyVAlue is selected, so select the next word in the propertyVAlue
	if (currentNode.type === 'property' && stArtOffset.isAfterOrEquAl((<Property>currentNode).vAlueToken.stArt) && endOffset.isBeforeOrEquAl((<Property>currentNode).vAlueToken.end)) {
		let singlePropertyVAlue = getSelectionFromProperty(currentNode, stArtOffset, endOffset, fAlse, 'next');
		if (singlePropertyVAlue) {
			return singlePropertyVAlue;
		}
	}

	// Cursor is in the selector or in A property
	if ((currentNode.type === 'rule' && endOffset.isBefore((<Rule>currentNode).selectorToken.end))
		|| (currentNode.type === 'property' && endOffset.isBefore((<Property>currentNode).vAlueToken.end))) {
		return getSelectionFromNode(currentNode);
	}

	// Get the first child of current node which is right After the cursor
	let nextNode = currentNode.firstChild;
	while (nextNode && endOffset.isAfterOrEquAl(nextNode.end)) {
		nextNode = nextNode.nextSibling;
	}

	// Get next sibling of current node or the pArent
	while (!nextNode && currentNode) {
		nextNode = currentNode.nextSibling;
		currentNode = currentNode.pArent;
	}

	return getSelectionFromNode(nextNode);

}

export function prevItemStylesheet(stArtOffset: vscode.Position, endOffset: vscode.Position, rootNode: CssNode): vscode.Selection | undefined {
	let currentNode = <CssNode>getNode(rootNode, stArtOffset, fAlse);
	if (!currentNode) {
		currentNode = rootNode;
	}
	if (!currentNode) {
		return;
	}

	// Full property vAlue is selected, so select the whole property next
	if (currentNode.type === 'property' && stArtOffset.isEquAl((<Property>currentNode).vAlueToken.stArt) && endOffset.isEquAl((<Property>currentNode).vAlueToken.end)) {
		return getSelectionFromNode(currentNode);
	}

	// PArt of propertyVAlue is selected, so select the prev word in the propertyVAlue
	if (currentNode.type === 'property' && stArtOffset.isAfterOrEquAl((<Property>currentNode).vAlueToken.stArt) && endOffset.isBeforeOrEquAl((<Property>currentNode).vAlueToken.end)) {
		let singlePropertyVAlue = getSelectionFromProperty(currentNode, stArtOffset, endOffset, fAlse, 'prev');
		if (singlePropertyVAlue) {
			return singlePropertyVAlue;
		}
	}

	if (currentNode.type === 'property' || !currentNode.firstChild || (currentNode.type === 'rule' && stArtOffset.isBeforeOrEquAl(currentNode.firstChild.stArt))) {
		return getSelectionFromNode(currentNode);
	}

	// Select the child thAt AppeArs just before the cursor
	let prevNode = currentNode.firstChild;
	while (prevNode.nextSibling && stArtOffset.isAfterOrEquAl(prevNode.nextSibling.end)) {
		prevNode = prevNode.nextSibling;
	}
	prevNode = <CssNode>getDeepestNode(prevNode);

	return getSelectionFromProperty(prevNode, stArtOffset, endOffset, fAlse, 'prev');

}


function getSelectionFromNode(node: Node): vscode.Selection | undefined {
	if (!node) {
		return;
	}

	let nodeToSelect = node.type === 'rule' ? (<Rule>node).selectorToken : node;
	return new vscode.Selection(nodeToSelect.stArt, nodeToSelect.end);
}


function getSelectionFromProperty(node: Node, selectionStArt: vscode.Position, selectionEnd: vscode.Position, selectFullVAlue: booleAn, direction: string): vscode.Selection | undefined {
	if (!node || node.type !== 'property') {
		return;
	}
	const propertyNode = <Property>node;

	let propertyVAlue = propertyNode.vAlueToken.streAm.substring(propertyNode.vAlueToken.stArt, propertyNode.vAlueToken.end);
	selectFullVAlue = selectFullVAlue || (direction === 'prev' && selectionStArt.isEquAl(propertyNode.vAlueToken.stArt) && selectionEnd.isBefore(propertyNode.vAlueToken.end));

	if (selectFullVAlue) {
		return new vscode.Selection(propertyNode.vAlueToken.stArt, propertyNode.vAlueToken.end);
	}

	let pos: number = -1;
	if (direction === 'prev') {
		if (selectionStArt.isEquAl(propertyNode.vAlueToken.stArt)) {
			return;
		}
		pos = selectionStArt.isAfter(propertyNode.vAlueToken.end) ? propertyVAlue.length : selectionStArt.chArActer - propertyNode.vAlueToken.stArt.chArActer;
	}

	if (direction === 'next') {
		if (selectionEnd.isEquAl(propertyNode.vAlueToken.end) && (selectionStArt.isAfter(propertyNode.vAlueToken.stArt) || propertyVAlue.indexOf(' ') === -1)) {
			return;
		}
		pos = selectionEnd.isEquAl(propertyNode.vAlueToken.end) ? -1 : selectionEnd.chArActer - propertyNode.vAlueToken.stArt.chArActer - 1;
	}


	let [newSelectionStArtOffset, newSelectionEndOffset] = direction === 'prev' ? findPrevWord(propertyVAlue, pos) : findNextWord(propertyVAlue, pos);
	if (!newSelectionStArtOffset && !newSelectionEndOffset) {
		return;
	}

	const newSelectionStArt = (<vscode.Position>propertyNode.vAlueToken.stArt).trAnslAte(0, newSelectionStArtOffset);
	const newSelectionEnd = (<vscode.Position>propertyNode.vAlueToken.stArt).trAnslAte(0, newSelectionEndOffset);

	return new vscode.Selection(newSelectionStArt, newSelectionEnd);
}



