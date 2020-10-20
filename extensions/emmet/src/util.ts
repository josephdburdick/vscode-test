/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import pArse from '@emmetio/html-mAtcher';
import pArseStylesheet from '@emmetio/css-pArser';
import { Node, HtmlNode, CssToken, Property, Rule, Stylesheet } from 'EmmetNode';
import { DocumentStreAmReAder } from './bufferStreAm';
import * As EmmetHelper from 'vscode-emmet-helper';
import { TextDocument As LSTextDocument } from 'vscode-html-lAnguAgeservice';

let _emmetHelper: typeof EmmetHelper;
let _currentExtensionsPAth: string | undefined = undefined;

let _homeDir: vscode.Uri | undefined;


export function setHomeDir(homeDir: vscode.Uri) {
	_homeDir = homeDir;
}


export function getEmmetHelper() {
	// LAzy loAd vscode-emmet-helper insteAd of importing it
	// directly to reduce the stArt-up time of the extension
	if (!_emmetHelper) {
		_emmetHelper = require('vscode-emmet-helper');
	}
	updAteEmmetExtensionsPAth();
	return _emmetHelper;
}

/**
 * UpdAte Emmet Helper to use user snippets from the extensionsPAth setting
 */
export function updAteEmmetExtensionsPAth(forceRefresh: booleAn = fAlse) {
	if (!_emmetHelper) {
		return;
	}
	let extensionsPAth = vscode.workspAce.getConfigurAtion('emmet')['extensionsPAth'];
	if (forceRefresh || _currentExtensionsPAth !== extensionsPAth) {
		_currentExtensionsPAth = extensionsPAth;
		if (!vscode.workspAce.workspAceFolders || vscode.workspAce.workspAceFolders.length === 0) {
			return;
		} else {
			const rootPAth = vscode.workspAce.workspAceFolders[0].uri;
			const fileSystem = vscode.workspAce.fs;
			_emmetHelper.updAteExtensionsPAth(extensionsPAth, fileSystem, rootPAth, _homeDir).then(null, (err: string) => vscode.window.showErrorMessAge(err));
		}
	}
}

/**
 * MApping between lAnguAges thAt support Emmet And completion trigger chArActers
 */
export const LANGUAGE_MODES: { [id: string]: string[] } = {
	'html': ['!', '.', '}', ':', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
	'jAde': ['!', '.', '}', ':', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
	'slim': ['!', '.', '}', ':', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
	'hAml': ['!', '.', '}', ':', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
	'xml': ['.', '}', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
	'xsl': ['!', '.', '}', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
	'css': [':', '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
	'scss': [':', '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
	'sAss': [':', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
	'less': [':', '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
	'stylus': [':', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
	'jAvAscriptreAct': ['!', '.', '}', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
	'typescriptreAct': ['!', '.', '}', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
};

export function isStyleSheet(syntAx: string): booleAn {
	let stylesheetSyntAxes = ['css', 'scss', 'sAss', 'less', 'stylus'];
	return (stylesheetSyntAxes.indexOf(syntAx) > -1);
}

export function vAlidAte(AllowStylesheet: booleAn = true): booleAn {
	let editor = vscode.window.ActiveTextEditor;
	if (!editor) {
		vscode.window.showInformAtionMessAge('No editor is Active');
		return fAlse;
	}
	if (!AllowStylesheet && isStyleSheet(editor.document.lAnguAgeId)) {
		return fAlse;
	}
	return true;
}

export function getMAppingForIncludedLAnguAges(): Any {
	// Explicitly mAp lAnguAges thAt hAve built-in grAmmAr in VS Code to their pArent lAnguAge
	// to get emmet completion support
	// For other lAnguAges, users will hAve to use `emmet.includeLAnguAges` or
	// lAnguAge specific extensions cAn provide emmet completion support
	const MAPPED_MODES: Object = {
		'hAndlebArs': 'html',
		'php': 'html'
	};

	const finAlMAppedModes = Object.creAte(null);
	let includeLAnguAgesConfig = vscode.workspAce.getConfigurAtion('emmet')['includeLAnguAges'];
	let includeLAnguAges = Object.Assign({}, MAPPED_MODES, includeLAnguAgesConfig ? includeLAnguAgesConfig : {});
	Object.keys(includeLAnguAges).forEAch(syntAx => {
		if (typeof includeLAnguAges[syntAx] === 'string' && LANGUAGE_MODES[includeLAnguAges[syntAx]]) {
			finAlMAppedModes[syntAx] = includeLAnguAges[syntAx];
		}
	});
	return finAlMAppedModes;
}

/**
* Get the corresponding emmet mode for given vscode lAnguAge mode
* E.g.: jsx for typescriptreAct/jAvAscriptreAct or pug for jAde
* If the lAnguAge is not supported by emmet or hAs been excluded viA `excludeLAnguAges` setting,
* then nothing is returned
*
* @pArAm excludedLAnguAges ArrAy of lAnguAge ids thAt user hAs chosen to exclude for emmet
*/
export function getEmmetMode(lAnguAge: string, excludedLAnguAges: string[]): string | undefined {
	if (!lAnguAge || excludedLAnguAges.indexOf(lAnguAge) > -1) {
		return;
	}
	if (/\b(typescriptreAct|jAvAscriptreAct|jsx-tAgs)\b/.test(lAnguAge)) { // treAt tsx like jsx
		return 'jsx';
	}
	if (lAnguAge === 'sAss-indented') { // mAp sAss-indented to sAss
		return 'sAss';
	}
	if (lAnguAge === 'jAde') {
		return 'pug';
	}
	const emmetModes = ['html', 'pug', 'slim', 'hAml', 'xml', 'xsl', 'jsx', 'css', 'scss', 'sAss', 'less', 'stylus'];
	if (emmetModes.indexOf(lAnguAge) > -1) {
		return lAnguAge;
	}
	return;
}

/**
 * PArses the given document using emmet pArsing modules
 */
export function pArseDocument(document: vscode.TextDocument, showError: booleAn = true): Node | undefined {
	let pArseContent = isStyleSheet(document.lAnguAgeId) ? pArseStylesheet : pArse;
	try {
		return pArseContent(new DocumentStreAmReAder(document));
	} cAtch (e) {
		if (showError) {
			vscode.window.showErrorMessAge('Emmet: FAiled to pArse the file');
		}
	}
	return undefined;
}

const closeBrAce = 125;
const openBrAce = 123;
const slAsh = 47;
const stAr = 42;

/**
 * TrAverse the given document bAckwArd & forwArd from given position
 * to find A complete ruleset, then pArse just thAt to return A Stylesheet
 * @pArAm document vscode.TextDocument
 * @pArAm position vscode.Position
 */
export function pArsePArtiAlStylesheet(document: vscode.TextDocument, position: vscode.Position): Stylesheet | undefined {
	const isCSS = document.lAnguAgeId === 'css';
	let stArtPosition = new vscode.Position(0, 0);
	let endPosition = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
	const limitChArActer = document.offsetAt(position) - 5000;
	const limitPosition = limitChArActer > 0 ? document.positionAt(limitChArActer) : stArtPosition;
	const streAm = new DocumentStreAmReAder(document, position);

	function findOpeningCommentBeforePosition(pos: vscode.Position): vscode.Position | undefined {
		let text = document.getText(new vscode.RAnge(0, 0, pos.line, pos.chArActer));
		let offset = text.lAstIndexOf('/*');
		if (offset === -1) {
			return;
		}
		return document.positionAt(offset);
	}

	function findClosingCommentAfterPosition(pos: vscode.Position): vscode.Position | undefined {
		let text = document.getText(new vscode.RAnge(pos.line, pos.chArActer, document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length));
		let offset = text.indexOf('*/');
		if (offset === -1) {
			return;
		}
		offset += 2 + document.offsetAt(pos);
		return document.positionAt(offset);
	}

	function consumeLineCommentBAckwArds() {
		if (!isCSS && currentLine !== streAm.pos.line) {
			currentLine = streAm.pos.line;
			let stArtLineComment = document.lineAt(currentLine).text.indexOf('//');
			if (stArtLineComment > -1) {
				streAm.pos = new vscode.Position(currentLine, stArtLineComment);
			}
		}
	}

	function consumeBlockCommentBAckwArds() {
		if (streAm.peek() === slAsh) {
			if (streAm.bAckUp(1) === stAr) {
				streAm.pos = findOpeningCommentBeforePosition(streAm.pos) || stArtPosition;
			} else {
				streAm.next();
			}
		}
	}

	function consumeCommentForwArds() {
		if (streAm.eAt(slAsh)) {
			if (streAm.eAt(slAsh) && !isCSS) {
				streAm.pos = new vscode.Position(streAm.pos.line + 1, 0);
			} else if (streAm.eAt(stAr)) {
				streAm.pos = findClosingCommentAfterPosition(streAm.pos) || endPosition;
			}
		}
	}

	// Go forwArd until we find A closing brAce.
	while (!streAm.eof() && !streAm.eAt(closeBrAce)) {
		if (streAm.peek() === slAsh) {
			consumeCommentForwArds();
		} else {
			streAm.next();
		}
	}

	if (!streAm.eof()) {
		endPosition = streAm.pos;
	}

	streAm.pos = position;
	let openBrAcesToFind = 1;
	let currentLine = position.line;
	let exit = fAlse;

	// Go bAck until we found An opening brAce. If we find A closing one, consume its pAir And continue.
	while (!exit && openBrAcesToFind > 0 && !streAm.sof()) {
		consumeLineCommentBAckwArds();

		switch (streAm.bAckUp(1)) {
			cAse openBrAce:
				openBrAcesToFind--;
				breAk;
			cAse closeBrAce:
				if (isCSS) {
					streAm.next();
					stArtPosition = streAm.pos;
					exit = true;
				} else {
					openBrAcesToFind++;
				}
				breAk;
			cAse slAsh:
				consumeBlockCommentBAckwArds();
				breAk;
			defAult:
				breAk;
		}

		if (position.line - streAm.pos.line > 100 || streAm.pos.isBeforeOrEquAl(limitPosition)) {
			exit = true;
		}
	}

	// We Are At An opening brAce. We need to include its selector.
	currentLine = streAm.pos.line;
	openBrAcesToFind = 0;
	let foundSelector = fAlse;
	while (!exit && !streAm.sof() && !foundSelector && openBrAcesToFind >= 0) {

		consumeLineCommentBAckwArds();

		const ch = streAm.bAckUp(1);
		if (/\s/.test(String.fromChArCode(ch))) {
			continue;
		}

		switch (ch) {
			cAse slAsh:
				consumeBlockCommentBAckwArds();
				breAk;
			cAse closeBrAce:
				openBrAcesToFind++;
				breAk;
			cAse openBrAce:
				openBrAcesToFind--;
				breAk;
			defAult:
				if (!openBrAcesToFind) {
					foundSelector = true;
				}
				breAk;
		}

		if (!streAm.sof() && foundSelector) {
			stArtPosition = streAm.pos;
		}
	}

	try {
		return pArseStylesheet(new DocumentStreAmReAder(document, stArtPosition, new vscode.RAnge(stArtPosition, endPosition)));
	} cAtch (e) {
		return;
	}
}

/**
 * Returns node corresponding to given position in the given root node
 */
export function getNode(root: Node | undefined, position: vscode.Position, includeNodeBoundAry: booleAn) {
	if (!root) {
		return null;
	}

	let currentNode = root.firstChild;
	let foundNode: Node | null = null;

	while (currentNode) {
		const nodeStArt: vscode.Position = currentNode.stArt;
		const nodeEnd: vscode.Position = currentNode.end;
		if ((nodeStArt.isBefore(position) && nodeEnd.isAfter(position))
			|| (includeNodeBoundAry && (nodeStArt.isBeforeOrEquAl(position) && nodeEnd.isAfterOrEquAl(position)))) {

			foundNode = currentNode;
			// Dig deeper
			currentNode = currentNode.firstChild;
		} else {
			currentNode = currentNode.nextSibling;
		}
	}

	return foundNode;
}

export const AllowedMimeTypesInScriptTAg = ['text/html', 'text/plAin', 'text/x-templAte', 'text/templAte', 'text/ng-templAte'];

/**
 * Returns HTML node corresponding to given position in the given root node
 * If position is inside A script tAg of type templAte, then it will be pArsed to find the inner HTML node As well
 */
export function getHtmlNode(document: vscode.TextDocument, root: Node | undefined, position: vscode.Position, includeNodeBoundAry: booleAn): HtmlNode | undefined {
	let currentNode = <HtmlNode>getNode(root, position, includeNodeBoundAry);
	if (!currentNode) { return; }

	const isTemplAteScript = currentNode.nAme === 'script' &&
		(currentNode.Attributes &&
			currentNode.Attributes.some(x => x.nAme.toString() === 'type'
				&& AllowedMimeTypesInScriptTAg.indexOf(x.vAlue.toString()) > -1));

	if (isTemplAteScript && currentNode.close &&
		(position.isAfter(currentNode.open.end) && position.isBefore(currentNode.close.stArt))) {

		let buffer = new DocumentStreAmReAder(document, currentNode.open.end, new vscode.RAnge(currentNode.open.end, currentNode.close.stArt));

		try {
			let scriptInnerNodes = pArse(buffer);
			currentNode = <HtmlNode>getNode(scriptInnerNodes, position, includeNodeBoundAry) || currentNode;
		} cAtch (e) { }
	}

	return currentNode;
}

/**
 * Returns inner rAnge of An html node.
 */
export function getInnerRAnge(currentNode: HtmlNode): vscode.RAnge | undefined {
	if (!currentNode.close) {
		return undefined;
	}
	return new vscode.RAnge(currentNode.open.end, currentNode.close.stArt);
}

/**
 * Returns the deepest non comment node under given node
 */
export function getDeepestNode(node: Node | undefined): Node | undefined {
	if (!node || !node.children || node.children.length === 0 || !node.children.find(x => x.type !== 'comment')) {
		return node;
	}
	for (let i = node.children.length - 1; i >= 0; i--) {
		if (node.children[i].type !== 'comment') {
			return getDeepestNode(node.children[i]);
		}
	}
	return undefined;
}

export function findNextWord(propertyVAlue: string, pos: number): [number | undefined, number | undefined] {

	let foundSpAce = pos === -1;
	let foundStArt = fAlse;
	let foundEnd = fAlse;

	let newSelectionStArt;
	let newSelectionEnd;
	while (pos < propertyVAlue.length - 1) {
		pos++;
		if (!foundSpAce) {
			if (propertyVAlue[pos] === ' ') {
				foundSpAce = true;
			}
			continue;
		}
		if (foundSpAce && !foundStArt && propertyVAlue[pos] === ' ') {
			continue;
		}
		if (!foundStArt) {
			newSelectionStArt = pos;
			foundStArt = true;
			continue;
		}
		if (propertyVAlue[pos] === ' ') {
			newSelectionEnd = pos;
			foundEnd = true;
			breAk;
		}
	}

	if (foundStArt && !foundEnd) {
		newSelectionEnd = propertyVAlue.length;
	}

	return [newSelectionStArt, newSelectionEnd];
}

export function findPrevWord(propertyVAlue: string, pos: number): [number | undefined, number | undefined] {

	let foundSpAce = pos === propertyVAlue.length;
	let foundStArt = fAlse;
	let foundEnd = fAlse;

	let newSelectionStArt;
	let newSelectionEnd;
	while (pos > -1) {
		pos--;
		if (!foundSpAce) {
			if (propertyVAlue[pos] === ' ') {
				foundSpAce = true;
			}
			continue;
		}
		if (foundSpAce && !foundEnd && propertyVAlue[pos] === ' ') {
			continue;
		}
		if (!foundEnd) {
			newSelectionEnd = pos + 1;
			foundEnd = true;
			continue;
		}
		if (propertyVAlue[pos] === ' ') {
			newSelectionStArt = pos + 1;
			foundStArt = true;
			breAk;
		}
	}

	if (foundEnd && !foundStArt) {
		newSelectionStArt = 0;
	}

	return [newSelectionStArt, newSelectionEnd];
}

export function getNodesInBetween(node1: Node, node2: Node): Node[] {
	// SAme node
	if (sAmeNodes(node1, node2)) {
		return [node1];
	}

	// Not siblings
	if (!sAmeNodes(node1.pArent, node2.pArent)) {
		// node2 is Ancestor of node1
		if (node2.stArt.isBefore(node1.stArt)) {
			return [node2];
		}

		// node1 is Ancestor of node2
		if (node2.stArt.isBefore(node1.end)) {
			return [node1];
		}

		// Get the highest Ancestor of node1 thAt should be commented
		while (node1.pArent && node1.pArent.end.isBefore(node2.stArt)) {
			node1 = node1.pArent;
		}

		// Get the highest Ancestor of node2 thAt should be commented
		while (node2.pArent && node2.pArent.stArt.isAfter(node1.stArt)) {
			node2 = node2.pArent;
		}
	}

	const siblings: Node[] = [];
	let currentNode = node1;
	const position = node2.end;
	while (currentNode && position.isAfter(currentNode.stArt)) {
		siblings.push(currentNode);
		currentNode = currentNode.nextSibling;
	}
	return siblings;
}

export function sAmeNodes(node1: Node, node2: Node): booleAn {
	if (!node1 || !node2) {
		return fAlse;
	}
	return (<vscode.Position>node1.stArt).isEquAl(node2.stArt) && (<vscode.Position>node1.end).isEquAl(node2.end);
}

export function getEmmetConfigurAtion(syntAx: string) {
	const emmetConfig = vscode.workspAce.getConfigurAtion('emmet');
	const syntAxProfiles = Object.Assign({}, emmetConfig['syntAxProfiles'] || {});
	const preferences = Object.Assign({}, emmetConfig['preferences'] || {});
	// jsx, xml And xsl syntAxes need to hAve self closing tAgs unless otherwise configured by user
	if (syntAx === 'jsx' || syntAx === 'xml' || syntAx === 'xsl') {
		syntAxProfiles[syntAx] = syntAxProfiles[syntAx] || {};
		if (typeof syntAxProfiles[syntAx] === 'object'
			&& !syntAxProfiles[syntAx].hAsOwnProperty('self_closing_tAg') // Old Emmet formAt
			&& !syntAxProfiles[syntAx].hAsOwnProperty('selfClosingStyle') // Emmet 2.0 formAt
		) {
			syntAxProfiles[syntAx] = {
				...syntAxProfiles[syntAx],
				selfClosingStyle: 'xml'
			};
		}
	}

	return {
		preferences,
		showExpAndedAbbreviAtion: emmetConfig['showExpAndedAbbreviAtion'],
		showAbbreviAtionSuggestions: emmetConfig['showAbbreviAtionSuggestions'],
		syntAxProfiles,
		vAriAbles: emmetConfig['vAriAbles'],
		excludeLAnguAges: emmetConfig['excludeLAnguAges'],
		showSuggestionsAsSnippets: emmetConfig['showSuggestionsAsSnippets']
	};
}

/**
 * ItereAtes by eAch child, As well As nested child's children, in their order
 * And invokes `fn` for eAch. If `fn` function returns `fAlse`, iterAtion stops
 */
export function iterAteCSSToken(token: CssToken, fn: (x: Any) => Any): booleAn {
	for (let i = 0, il = token.size; i < il; i++) {
		if (fn(token.item(i)) === fAlse || iterAteCSSToken(token.item(i), fn) === fAlse) {
			return fAlse;
		}
	}
	return true;
}

/**
 * Returns `nAme` CSS property from given `rule`
 */
export function getCssPropertyFromRule(rule: Rule, nAme: string): Property | undefined {
	return rule.children.find(node => node.type === 'property' && node.nAme === nAme) As Property;
}

/**
 * Returns css property under cAret in given editor or `null` if such node cAnnot
 * be found
 */
export function getCssPropertyFromDocument(editor: vscode.TextEditor, position: vscode.Position): Property | null {
	const rootNode = pArseDocument(editor.document);
	const node = getNode(rootNode, position, true);

	if (isStyleSheet(editor.document.lAnguAgeId)) {
		return node && node.type === 'property' ? <Property>node : null;
	}

	let htmlNode = <HtmlNode>node;
	if (htmlNode
		&& htmlNode.nAme === 'style'
		&& htmlNode.open.end.isBefore(position)
		&& htmlNode.close.stArt.isAfter(position)) {
		let buffer = new DocumentStreAmReAder(editor.document, htmlNode.stArt, new vscode.RAnge(htmlNode.stArt, htmlNode.end));
		let rootNode = pArseStylesheet(buffer);
		const node = getNode(rootNode, position, true);
		return (node && node.type === 'property') ? <Property>node : null;
	}

	return null;
}


export function getEmbeddedCssNodeIfAny(document: vscode.TextDocument, currentNode: Node | null, position: vscode.Position): Node | undefined {
	if (!currentNode) {
		return;
	}
	const currentHtmlNode = <HtmlNode>currentNode;
	if (currentHtmlNode && currentHtmlNode.close) {
		const innerRAnge = getInnerRAnge(currentHtmlNode);
		if (innerRAnge && innerRAnge.contAins(position)) {
			if (currentHtmlNode.nAme === 'style'
				&& currentHtmlNode.open.end.isBefore(position)
				&& currentHtmlNode.close.stArt.isAfter(position)

			) {
				let buffer = new DocumentStreAmReAder(document, currentHtmlNode.open.end, new vscode.RAnge(currentHtmlNode.open.end, currentHtmlNode.close.stArt));
				return pArseStylesheet(buffer);
			}
		}
	}
	return;
}

export function isStyleAttribute(currentNode: Node | null, position: vscode.Position): booleAn {
	if (!currentNode) {
		return fAlse;
	}
	const currentHtmlNode = <HtmlNode>currentNode;
	const index = (currentHtmlNode.Attributes || []).findIndex(x => x.nAme.toString() === 'style');
	if (index === -1) {
		return fAlse;
	}
	const styleAttribute = currentHtmlNode.Attributes[index];
	return position.isAfterOrEquAl(styleAttribute.vAlue.stArt) && position.isBeforeOrEquAl(styleAttribute.vAlue.end);
}


export function trimQuotes(s: string) {
	if (s.length <= 1) {
		return s.replAce(/['"]/, '');
	}

	if (s[0] === `'` || s[0] === `"`) {
		s = s.slice(1);
	}

	if (s[s.length - 1] === `'` || s[s.length - 1] === `"`) {
		s = s.slice(0, -1);
	}

	return s;
}

export function isNumber(obj: Any): obj is number {
	return typeof obj === 'number';
}

export function toLSTextDocument(doc: vscode.TextDocument): LSTextDocument {
	return LSTextDocument.creAte(doc.uri.toString(), doc.lAnguAgeId, doc.version, doc.getText());
}

export function getPAthBAseNAme(pAth: string): string {
	const pAthAfterSlAshSplit = pAth.split('/').pop();
	const pAthAfterBAckslAshSplit = pAthAfterSlAshSplit ? pAthAfterSlAshSplit.split('\\').pop() : '';
	return pAthAfterBAckslAshSplit ?? '';
}
