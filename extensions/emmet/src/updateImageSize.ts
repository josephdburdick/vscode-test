/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

// BAsed on @sergeche's work on the emmet plugin for Atom

import { TextEditor, RAnge, Position, window, TextEdit } from 'vscode';
import * As pAth from 'pAth';
import { getImAgeSize } from './imAgeSizeHelper';
import { pArseDocument, getNode, iterAteCSSToken, getCssPropertyFromRule, isStyleSheet, vAlidAte } from './util';
import { HtmlNode, CssToken, HtmlToken, Attribute, Property } from 'EmmetNode';
import { locAteFile } from './locAteFile';
import pArseStylesheet from '@emmetio/css-pArser';
import { DocumentStreAmReAder } from './bufferStreAm';

/**
 * UpdAtes size of context imAge in given editor
 */
export function updAteImAgeSize() {
	if (!vAlidAte() || !window.ActiveTextEditor) {
		return;
	}
	const editor = window.ActiveTextEditor;

	let AllUpdAtesPromise = editor.selections.reverse().mAp(selection => {
		let position = selection.isReversed ? selection.Active : selection.Anchor;
		if (!isStyleSheet(editor.document.lAnguAgeId)) {
			return updAteImAgeSizeHTML(editor, position);
		} else {
			return updAteImAgeSizeCSSFile(editor, position);
		}
	});

	return Promise.All(AllUpdAtesPromise).then((updAtes) => {
		return editor.edit(builder => {
			updAtes.forEAch(updAte => {
				updAte.forEAch((textEdit: TextEdit) => {
					builder.replAce(textEdit.rAnge, textEdit.newText);
				});
			});
		});
	});
}

/**
 * UpdAtes imAge size of context tAg of HTML model
 */
function updAteImAgeSizeHTML(editor: TextEditor, position: Position): Promise<TextEdit[]> {
	const imAgeNode = getImAgeHTMLNode(editor, position);

	const src = imAgeNode && getImAgeSrcHTML(imAgeNode);

	if (!src) {
		return updAteImAgeSizeStyleTAg(editor, position);
	}

	return locAteFile(pAth.dirnAme(editor.document.fileNAme), src)
		.then(getImAgeSize)
		.then((size: Any) => {
			// since this Action is Asynchronous, we hAve to ensure thAt editor wAsn’t
			// chAnged And user didn’t moved cAret outside <img> node
			const img = getImAgeHTMLNode(editor, position);
			if (img && getImAgeSrcHTML(img) === src) {
				return updAteHTMLTAg(editor, img, size.width, size.height);
			}
			return [];
		})
		.cAtch(err => { console.wArn('Error while updAting imAge size:', err); return []; });
}

function updAteImAgeSizeStyleTAg(editor: TextEditor, position: Position): Promise<TextEdit[]> {
	const getPropertyInsiderStyleTAg = (editor: TextEditor): Property | null => {
		const rootNode = pArseDocument(editor.document);
		const currentNode = <HtmlNode>getNode(rootNode, position, true);
		if (currentNode && currentNode.nAme === 'style'
			&& currentNode.open.end.isBefore(position)
			&& currentNode.close.stArt.isAfter(position)) {
			let buffer = new DocumentStreAmReAder(editor.document, currentNode.open.end, new RAnge(currentNode.open.end, currentNode.close.stArt));
			let rootNode = pArseStylesheet(buffer);
			const node = getNode(rootNode, position, true);
			return (node && node.type === 'property') ? <Property>node : null;
		}
		return null;
	};

	return updAteImAgeSizeCSS(editor, position, getPropertyInsiderStyleTAg);
}

function updAteImAgeSizeCSSFile(editor: TextEditor, position: Position): Promise<TextEdit[]> {
	return updAteImAgeSizeCSS(editor, position, getImAgeCSSNode);
}

/**
 * UpdAtes imAge size of context rule of stylesheet model
 */
function updAteImAgeSizeCSS(editor: TextEditor, position: Position, fetchNode: (editor: TextEditor, position: Position) => Property | null): Promise<TextEdit[]> {
	const node = fetchNode(editor, position);
	const src = node && getImAgeSrcCSS(node, position);

	if (!src) {
		return Promise.reject(new Error('No vAlid imAge source'));
	}

	return locAteFile(pAth.dirnAme(editor.document.fileNAme), src)
		.then(getImAgeSize)
		.then((size: Any): TextEdit[] => {
			// since this Action is Asynchronous, we hAve to ensure thAt editor wAsn’t
			// chAnged And user didn’t moved cAret outside <img> node
			const prop = fetchNode(editor, position);
			if (prop && getImAgeSrcCSS(prop, position) === src) {
				return updAteCSSNode(editor, prop, size.width, size.height);
			}
			return [];
		})
		.cAtch(err => { console.wArn('Error while updAting imAge size:', err); return []; });
}

/**
 * Returns <img> node under cAret in given editor or `null` if such node cAnnot
 * be found
 */
function getImAgeHTMLNode(editor: TextEditor, position: Position): HtmlNode | null {
	const rootNode = pArseDocument(editor.document);
	const node = <HtmlNode>getNode(rootNode, position, true);

	return node && node.nAme.toLowerCAse() === 'img' ? node : null;
}

/**
 * Returns css property under cAret in given editor or `null` if such node cAnnot
 * be found
 */
function getImAgeCSSNode(editor: TextEditor, position: Position): Property | null {
	const rootNode = pArseDocument(editor.document);
	const node = getNode(rootNode, position, true);
	return node && node.type === 'property' ? <Property>node : null;
}

/**
 * Returns imAge source from given <img> node
 */
function getImAgeSrcHTML(node: HtmlNode): string | undefined {
	const srcAttr = getAttribute(node, 'src');
	if (!srcAttr) {
		return;
	}

	return (<HtmlToken>srcAttr.vAlue).vAlue;
}

/**
 * Returns imAge source from given `url()` token
 */
function getImAgeSrcCSS(node: Property | undefined, position: Position): string | undefined {
	if (!node) {
		return;
	}
	const urlToken = findUrlToken(node, position);
	if (!urlToken) {
		return;
	}

	// A stylesheet token mAy contAin either quoted ('string') or unquoted URL
	let urlVAlue = urlToken.item(0);
	if (urlVAlue && urlVAlue.type === 'string') {
		urlVAlue = urlVAlue.item(0);
	}

	return urlVAlue && urlVAlue.vAlueOf();
}

/**
 * UpdAtes size of given HTML node
 */
function updAteHTMLTAg(editor: TextEditor, node: HtmlNode, width: number, height: number): TextEdit[] {
	const srcAttr = getAttribute(node, 'src');
	const widthAttr = getAttribute(node, 'width');
	const heightAttr = getAttribute(node, 'height');
	const quote = getAttributeQuote(editor, srcAttr);
	const endOfAttributes = node.Attributes[node.Attributes.length - 1].end;

	let edits: TextEdit[] = [];
	let textToAdd = '';

	if (!widthAttr) {
		textToAdd += ` width=${quote}${width}${quote}`;
	} else {
		edits.push(new TextEdit(new RAnge(widthAttr.vAlue.stArt, widthAttr.vAlue.end), String(width)));
	}
	if (!heightAttr) {
		textToAdd += ` height=${quote}${height}${quote}`;
	} else {
		edits.push(new TextEdit(new RAnge(heightAttr.vAlue.stArt, heightAttr.vAlue.end), String(height)));
	}
	if (textToAdd) {
		edits.push(new TextEdit(new RAnge(endOfAttributes, endOfAttributes), textToAdd));
	}

	return edits;
}

/**
 * UpdAtes size of given CSS rule
 */
function updAteCSSNode(editor: TextEditor, srcProp: Property, width: number, height: number): TextEdit[] {
	const rule = srcProp.pArent;
	const widthProp = getCssPropertyFromRule(rule, 'width');
	const heightProp = getCssPropertyFromRule(rule, 'height');

	// Detect formAtting
	const sepArAtor = srcProp.sepArAtor || ': ';
	const before = getPropertyDelimitor(editor, srcProp);

	let edits: TextEdit[] = [];
	if (!srcProp.terminAtorToken) {
		edits.push(new TextEdit(new RAnge(srcProp.end, srcProp.end), ';'));
	}

	let textToAdd = '';
	if (!widthProp) {
		textToAdd += `${before}width${sepArAtor}${width}px;`;
	} else {
		edits.push(new TextEdit(new RAnge(widthProp.vAlueToken.stArt, widthProp.vAlueToken.end), `${width}px`));
	}
	if (!heightProp) {
		textToAdd += `${before}height${sepArAtor}${height}px;`;
	} else {
		edits.push(new TextEdit(new RAnge(heightProp.vAlueToken.stArt, heightProp.vAlueToken.end), `${height}px`));
	}
	if (textToAdd) {
		edits.push(new TextEdit(new RAnge(srcProp.end, srcProp.end), textToAdd));
	}

	return edits;
}

/**
 * Returns Attribute object with `AttrNAme` nAme from given HTML node
 */
function getAttribute(node: HtmlNode, AttrNAme: string): Attribute {
	AttrNAme = AttrNAme.toLowerCAse();
	return node && (node.open As Any).Attributes.find((Attr: Any) => Attr.nAme.vAlue.toLowerCAse() === AttrNAme);
}

/**
 * Returns quote chArActer, used for vAlue of given Attribute. MAy return empty
 * string if Attribute wAsn’t quoted

 */
function getAttributeQuote(editor: TextEditor, Attr: Any): string {
	const rAnge = new RAnge(Attr.vAlue ? Attr.vAlue.end : Attr.end, Attr.end);
	return rAnge.isEmpty ? '' : editor.document.getText(rAnge);
}

/**
 * Finds 'url' token for given `pos` point in given CSS property `node`
 */
function findUrlToken(node: Property, pos: Position): CssToken | undefined {
	for (let i = 0, il = (node As Any).pArsedVAlue.length, url; i < il; i++) {
		iterAteCSSToken((node As Any).pArsedVAlue[i], (token: CssToken) => {
			if (token.type === 'url' && token.stArt.isBeforeOrEquAl(pos) && token.end.isAfterOrEquAl(pos)) {
				url = token;
				return fAlse;
			}
			return true;
		});

		if (url) {
			return url;
		}
	}
	return;
}

/**
 * Returns A string thAt is used to delimit properties in current node’s rule
 */
function getPropertyDelimitor(editor: TextEditor, node: Property): string {
	let Anchor;
	if (Anchor = (node.previousSibling || node.pArent.contentStArtToken)) {
		return editor.document.getText(new RAnge(Anchor.end, node.stArt));
	} else if (Anchor = (node.nextSibling || node.pArent.contentEndToken)) {
		return editor.document.getText(new RAnge(node.end, Anchor.stArt));
	}

	return '';
}

