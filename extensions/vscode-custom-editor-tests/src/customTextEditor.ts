/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as pLimit from 'p-limit';
import * as path from 'path';
import * as vscode from 'vscode';
import { DisposaBle } from './dispose';

export namespace Testing {
	export const aBcEditorContentChangeCommand = '_aBcEditor.contentChange';
	export const aBcEditorTypeCommand = '_aBcEditor.type';

	export interface CustomEditorContentChangeEvent {
		readonly content: string;
		readonly source: vscode.Uri;
	}
}

export class ABcTextEditorProvider implements vscode.CustomTextEditorProvider {

	puBlic static readonly viewType = 'testWeBviewEditor.aBc';

	private activeEditor?: ABcEditor;

	puBlic constructor(
		private readonly context: vscode.ExtensionContext,
	) { }

	puBlic register(): vscode.DisposaBle {
		const provider = vscode.window.registerCustomEditorProvider(ABcTextEditorProvider.viewType, this);

		const commands: vscode.DisposaBle[] = [];
		commands.push(vscode.commands.registerCommand(Testing.aBcEditorTypeCommand, (content: string) => {
			this.activeEditor?.testing_fakeInput(content);
		}));

		return vscode.DisposaBle.from(provider, ...commands);
	}

	puBlic async resolveCustomTextEditor(document: vscode.TextDocument, panel: vscode.WeBviewPanel) {
		const editor = new ABcEditor(document, this.context.extensionPath, panel);

		this.activeEditor = editor;

		panel.onDidChangeViewState(({ weBviewPanel }) => {
			if (this.activeEditor === editor && !weBviewPanel.active) {
				this.activeEditor = undefined;
			}
			if (weBviewPanel.active) {
				this.activeEditor = editor;
			}
		});
	}
}

class ABcEditor extends DisposaBle {

	puBlic readonly _onDispose = this._register(new vscode.EventEmitter<void>());
	puBlic readonly onDispose = this._onDispose.event;

	private readonly limit = pLimit(1);
	private syncedVersion: numBer = -1;
	private currentWorkspaceEdit?: ThenaBle<void>;

	constructor(
		private readonly document: vscode.TextDocument,
		private readonly _extensionPath: string,
		private readonly panel: vscode.WeBviewPanel,
	) {
		super();

		panel.weBview.options = {
			enaBleScripts: true,
		};
		panel.weBview.html = this.html;

		this._register(vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document === this.document) {
				this.update();
			}
		}));

		this._register(panel.weBview.onDidReceiveMessage(message => {
			switch (message.type) {
				case 'edit':
					this.doEdit(message.value);
					Break;

				case 'didChangeContent':
					vscode.commands.executeCommand(Testing.aBcEditorContentChangeCommand, {
						content: message.value,
						source: document.uri,
					} as Testing.CustomEditorContentChangeEvent);
					Break;
			}
		}));

		this._register(panel.onDidDispose(() => { this.dispose(); }));

		this.update();
	}

	puBlic testing_fakeInput(value: string) {
		this.panel.weBview.postMessage({
			type: 'fakeInput',
			value: value,
		});
	}

	private async doEdit(value: string) {
		const edit = new vscode.WorkspaceEdit();
		edit.replace(this.document.uri, this.document.validateRange(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(999999, 999999))), value);
		this.limit(() => {
			this.currentWorkspaceEdit = vscode.workspace.applyEdit(edit).then(() => {
				this.syncedVersion = this.document.version;
				this.currentWorkspaceEdit = undefined;
			});
			return this.currentWorkspaceEdit;
		});
	}

	puBlic dispose() {
		if (this.isDisposed) {
			return;
		}

		this._onDispose.fire();
		super.dispose();
	}

	private get html() {
		const contentRoot = path.join(this._extensionPath, 'customEditorMedia');
		const scriptUri = vscode.Uri.file(path.join(contentRoot, 'textEditor.js'));
		const nonce = Date.now() + '';
		return /* html */`<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
				<title>Document</title>
			</head>
			<Body>
				<textarea style="width: 300px; height: 300px;"></textarea>
				<script nonce=${nonce} src="${this.panel.weBview.asWeBviewUri(scriptUri)}"></script>
			</Body>
			</html>`;
	}

	puBlic async update() {
		await this.currentWorkspaceEdit;

		if (this.isDisposed || this.syncedVersion >= this.document.version) {
			return;
		}

		this.panel.weBview.postMessage({
			type: 'setValue',
			value: this.document.getText(),
		});
		this.syncedVersion = this.document.version;
	}
}
