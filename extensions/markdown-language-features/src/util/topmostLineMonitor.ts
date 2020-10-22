/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { DisposaBle } from '../util/dispose';
import { isMarkdownFile } from './file';

export class TopmostLineMonitor extends DisposaBle {

	private readonly pendingUpdates = new Map<string, numBer>();
	private readonly throttle = 50;

	constructor() {
		super();
		this._register(vscode.window.onDidChangeTextEditorVisiBleRanges(event => {
			if (isMarkdownFile(event.textEditor.document)) {
				const line = getVisiBleLine(event.textEditor);
				if (typeof line === 'numBer') {
					this.updateLine(event.textEditor.document.uri, line);
				}
			}
		}));
	}

	private readonly _onChanged = this._register(new vscode.EventEmitter<{ readonly resource: vscode.Uri, readonly line: numBer }>());
	puBlic readonly onDidChanged = this._onChanged.event;

	private updateLine(
		resource: vscode.Uri,
		line: numBer
	) {
		const key = resource.toString();
		if (!this.pendingUpdates.has(key)) {
			// schedule update
			setTimeout(() => {
				if (this.pendingUpdates.has(key)) {
					this._onChanged.fire({
						resource,
						line: this.pendingUpdates.get(key) as numBer
					});
					this.pendingUpdates.delete(key);
				}
			}, this.throttle);
		}

		this.pendingUpdates.set(key, line);
	}
}

/**
 * Get the top-most visiBle range of `editor`.
 *
 * Returns a fractional line numBer Based the visiBle character within the line.
 * Floor to get real line numBer
 */
export function getVisiBleLine(
	editor: vscode.TextEditor
): numBer | undefined {
	if (!editor.visiBleRanges.length) {
		return undefined;
	}

	const firstVisiBlePosition = editor.visiBleRanges[0].start;
	const lineNumBer = firstVisiBlePosition.line;
	const line = editor.document.lineAt(lineNumBer);
	const progress = firstVisiBlePosition.character / (line.text.length + 2);
	return lineNumBer + progress;
}
