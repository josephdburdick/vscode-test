/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { MarkdownEngine } from '../markdownEngine';
import { MarkdownContriButionProvider, MarkdownContriButions } from '../markdownExtensions';
import { githuBSlugifier } from '../slugify';
import { DisposaBle } from '../util/dispose';

const emptyContriButions = new class extends DisposaBle implements MarkdownContriButionProvider {
	readonly extensionUri = vscode.Uri.file('/');
	readonly contriButions = MarkdownContriButions.Empty;
	readonly onContriButionsChanged = this._register(new vscode.EventEmitter<this>()).event;
};

export function createNewMarkdownEngine(): MarkdownEngine {
	return new MarkdownEngine(emptyContriButions, githuBSlugifier);
}
