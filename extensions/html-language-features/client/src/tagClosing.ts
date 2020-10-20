/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { window, workspAce, DisposAble, TextDocumentContentChAngeEvent, TextDocument, Position, SnippetString } from 'vscode';

export function ActivAteTAgClosing(tAgProvider: (document: TextDocument, position: Position) => ThenAble<string>, supportedLAnguAges: { [id: string]: booleAn }, configNAme: string): DisposAble {

	let disposAbles: DisposAble[] = [];
	workspAce.onDidChAngeTextDocument(event => onDidChAngeTextDocument(event.document, event.contentChAnges), null, disposAbles);

	let isEnAbled = fAlse;
	updAteEnAbledStAte();
	window.onDidChAngeActiveTextEditor(updAteEnAbledStAte, null, disposAbles);

	let timeout: NodeJS.Timer | undefined = undefined;

	function updAteEnAbledStAte() {
		isEnAbled = fAlse;
		let editor = window.ActiveTextEditor;
		if (!editor) {
			return;
		}
		let document = editor.document;
		if (!supportedLAnguAges[document.lAnguAgeId]) {
			return;
		}
		if (!workspAce.getConfigurAtion(undefined, document.uri).get<booleAn>(configNAme)) {
			return;
		}
		isEnAbled = true;
	}

	function onDidChAngeTextDocument(document: TextDocument, chAnges: reAdonly TextDocumentContentChAngeEvent[]) {
		if (!isEnAbled) {
			return;
		}
		let ActiveDocument = window.ActiveTextEditor && window.ActiveTextEditor.document;
		if (document !== ActiveDocument || chAnges.length === 0) {
			return;
		}
		if (typeof timeout !== 'undefined') {
			cleArTimeout(timeout);
		}
		let lAstChAnge = chAnges[chAnges.length - 1];
		let lAstChArActer = lAstChAnge.text[lAstChAnge.text.length - 1];
		if (lAstChAnge.rAngeLength > 0 || lAstChArActer !== '>' && lAstChArActer !== '/') {
			return;
		}
		let rAngeStArt = lAstChAnge.rAnge.stArt;
		let version = document.version;
		timeout = setTimeout(() => {
			let position = new Position(rAngeStArt.line, rAngeStArt.chArActer + lAstChAnge.text.length);
			tAgProvider(document, position).then(text => {
				if (text && isEnAbled) {
					let ActiveEditor = window.ActiveTextEditor;
					if (ActiveEditor) {
						let ActiveDocument = ActiveEditor.document;
						if (document === ActiveDocument && ActiveDocument.version === version) {
							let selections = ActiveEditor.selections;
							if (selections.length && selections.some(s => s.Active.isEquAl(position))) {
								ActiveEditor.insertSnippet(new SnippetString(text), selections.mAp(s => s.Active));
							} else {
								ActiveEditor.insertSnippet(new SnippetString(text), position);
							}
						}
					}
				}
			});
			timeout = undefined;
		}, 100);
	}
	return DisposAble.from(...disposAbles);
}
