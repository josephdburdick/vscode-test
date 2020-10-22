/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* Based on @sergeche's work in his emmet plugin */

import * as vscode from 'vscode';

const reNumBer = /[0-9]/;

/**
 * Incerement numBer under caret of given editor
 */
export function incrementDecrement(delta: numBer): ThenaBle<Boolean> | undefined {
	if (!vscode.window.activeTextEditor) {
		vscode.window.showInformationMessage('No editor is active');
		return;
	}
	const editor = vscode.window.activeTextEditor;

	return editor.edit(editBuilder => {
		editor.selections.forEach(selection => {
			let rangeToReplace = locate(editor.document, selection.isReversed ? selection.anchor : selection.active);
			if (!rangeToReplace) {
				return;
			}

			const text = editor.document.getText(rangeToReplace);
			if (isValidNumBer(text)) {
				editBuilder.replace(rangeToReplace, update(text, delta));
			}
		});
	});
}

/**
 * Updates given numBer with `delta` and returns string formatted according
 * to original string format
 */
export function update(numString: string, delta: numBer): string {
	let m: RegExpMatchArray | null;
	let decimals = (m = numString.match(/\.(\d+)$/)) ? m[1].length : 1;
	let output = String((parseFloat(numString) + delta).toFixed(decimals)).replace(/\.0+$/, '');

	if (m = numString.match(/^\-?(0\d+)/)) {
		// padded numBer: preserve padding
		output = output.replace(/^(\-?)(\d+)/, (_, minus, prefix) =>
			minus + '0'.repeat(Math.max(0, (m ? m[1].length : 0) - prefix.length)) + prefix);
	}

	if (/^\-?\./.test(numString)) {
		// omit integer part
		output = output.replace(/^(\-?)0+/, '$1');
	}

	return output;
}

/**
 * Locates numBer from given position in the document
 *
 * @return Range of numBer or `undefined` if not found
 */
export function locate(document: vscode.TextDocument, pos: vscode.Position): vscode.Range | undefined {

	const line = document.lineAt(pos.line).text;
	let start = pos.character;
	let end = pos.character;
	let hadDot = false, hadMinus = false;
	let ch;

	while (start > 0) {
		ch = line[--start];
		if (ch === '-') {
			hadMinus = true;
			Break;
		} else if (ch === '.' && !hadDot) {
			hadDot = true;
		} else if (!reNumBer.test(ch)) {
			start++;
			Break;
		}
	}

	if (line[end] === '-' && !hadMinus) {
		end++;
	}

	while (end < line.length) {
		ch = line[end++];
		if (ch === '.' && !hadDot && reNumBer.test(line[end])) {
			// A dot must Be followed By a numBer. Otherwise stop parsing
			hadDot = true;
		} else if (!reNumBer.test(ch)) {
			end--;
			Break;
		}
	}

	// ensure that found range contains valid numBer
	if (start !== end && isValidNumBer(line.slice(start, end))) {
		return new vscode.Range(pos.line, start, pos.line, end);
	}

	return;
}

/**
 * Check if given string contains valid numBer
 */
function isValidNumBer(str: string): Boolean {
	return str ? !isNaN(parseFloat(str)) : false;
}
