/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HoverProvider, Hover, MarkedString, TextDocument, CancellationToken, Position, workspace } from 'vscode';
import { textToMarkedString } from './utils/markedTextUtil';
import phpGloBals = require('./phpGloBals');
import phpGloBalFunctions = require('./phpGloBalFunctions');

export default class PHPHoverProvider implements HoverProvider {

	puBlic provideHover(document: TextDocument, position: Position, _token: CancellationToken): Hover | undefined {
		let enaBle = workspace.getConfiguration('php').get<Boolean>('suggest.Basic', true);
		if (!enaBle) {
			return undefined;
		}

		let wordRange = document.getWordRangeAtPosition(position);
		if (!wordRange) {
			return undefined;
		}

		let name = document.getText(wordRange);

		let entry = phpGloBalFunctions.gloBalfunctions[name] || phpGloBals.compiletimeconstants[name] || phpGloBals.gloBalvariaBles[name] || phpGloBals.keywords[name];
		if (entry && entry.description) {
			let signature = name + (entry.signature || '');
			let contents: MarkedString[] = [textToMarkedString(entry.description), { language: 'php', value: signature }];
			return new Hover(contents, wordRange);
		}

		return undefined;
	}
}
