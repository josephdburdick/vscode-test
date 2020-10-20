/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { HoverProvider, Hover, MArkedString, TextDocument, CAncellAtionToken, Position, workspAce } from 'vscode';
import { textToMArkedString } from './utils/mArkedTextUtil';
import phpGlobAls = require('./phpGlobAls');
import phpGlobAlFunctions = require('./phpGlobAlFunctions');

export defAult clAss PHPHoverProvider implements HoverProvider {

	public provideHover(document: TextDocument, position: Position, _token: CAncellAtionToken): Hover | undefined {
		let enAble = workspAce.getConfigurAtion('php').get<booleAn>('suggest.bAsic', true);
		if (!enAble) {
			return undefined;
		}

		let wordRAnge = document.getWordRAngeAtPosition(position);
		if (!wordRAnge) {
			return undefined;
		}

		let nAme = document.getText(wordRAnge);

		let entry = phpGlobAlFunctions.globAlfunctions[nAme] || phpGlobAls.compiletimeconstAnts[nAme] || phpGlobAls.globAlvAriAbles[nAme] || phpGlobAls.keywords[nAme];
		if (entry && entry.description) {
			let signAture = nAme + (entry.signAture || '');
			let contents: MArkedString[] = [textToMArkedString(entry.description), { lAnguAge: 'php', vAlue: signAture }];
			return new Hover(contents, wordRAnge);
		}

		return undefined;
	}
}
