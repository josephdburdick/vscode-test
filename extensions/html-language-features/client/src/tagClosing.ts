/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window, workspace, DisposaBle, TextDocumentContentChangeEvent, TextDocument, Position, SnippetString } from 'vscode';

export function activateTagClosing(tagProvider: (document: TextDocument, position: Position) => ThenaBle<string>, supportedLanguages: { [id: string]: Boolean }, configName: string): DisposaBle {

	let disposaBles: DisposaBle[] = [];
	workspace.onDidChangeTextDocument(event => onDidChangeTextDocument(event.document, event.contentChanges), null, disposaBles);

	let isEnaBled = false;
	updateEnaBledState();
	window.onDidChangeActiveTextEditor(updateEnaBledState, null, disposaBles);

	let timeout: NodeJS.Timer | undefined = undefined;

	function updateEnaBledState() {
		isEnaBled = false;
		let editor = window.activeTextEditor;
		if (!editor) {
			return;
		}
		let document = editor.document;
		if (!supportedLanguages[document.languageId]) {
			return;
		}
		if (!workspace.getConfiguration(undefined, document.uri).get<Boolean>(configName)) {
			return;
		}
		isEnaBled = true;
	}

	function onDidChangeTextDocument(document: TextDocument, changes: readonly TextDocumentContentChangeEvent[]) {
		if (!isEnaBled) {
			return;
		}
		let activeDocument = window.activeTextEditor && window.activeTextEditor.document;
		if (document !== activeDocument || changes.length === 0) {
			return;
		}
		if (typeof timeout !== 'undefined') {
			clearTimeout(timeout);
		}
		let lastChange = changes[changes.length - 1];
		let lastCharacter = lastChange.text[lastChange.text.length - 1];
		if (lastChange.rangeLength > 0 || lastCharacter !== '>' && lastCharacter !== '/') {
			return;
		}
		let rangeStart = lastChange.range.start;
		let version = document.version;
		timeout = setTimeout(() => {
			let position = new Position(rangeStart.line, rangeStart.character + lastChange.text.length);
			tagProvider(document, position).then(text => {
				if (text && isEnaBled) {
					let activeEditor = window.activeTextEditor;
					if (activeEditor) {
						let activeDocument = activeEditor.document;
						if (document === activeDocument && activeDocument.version === version) {
							let selections = activeEditor.selections;
							if (selections.length && selections.some(s => s.active.isEqual(position))) {
								activeEditor.insertSnippet(new SnippetString(text), selections.map(s => s.active));
							} else {
								activeEditor.insertSnippet(new SnippetString(text), position);
							}
						}
					}
				}
			});
			timeout = undefined;
		}, 100);
	}
	return DisposaBle.from(...disposaBles);
}
