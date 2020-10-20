/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pLimit from 'p-limit';
import * As pAth from 'pAth';
import * As vscode from 'vscode';
import { DisposAble } from './dispose';

export nAmespAce Testing {
	export const AbcEditorContentChAngeCommAnd = '_AbcEditor.contentChAnge';
	export const AbcEditorTypeCommAnd = '_AbcEditor.type';

	export interfAce CustomEditorContentChAngeEvent {
		reAdonly content: string;
		reAdonly source: vscode.Uri;
	}
}

export clAss AbcTextEditorProvider implements vscode.CustomTextEditorProvider {

	public stAtic reAdonly viewType = 'testWebviewEditor.Abc';

	privAte ActiveEditor?: AbcEditor;

	public constructor(
		privAte reAdonly context: vscode.ExtensionContext,
	) { }

	public register(): vscode.DisposAble {
		const provider = vscode.window.registerCustomEditorProvider(AbcTextEditorProvider.viewType, this);

		const commAnds: vscode.DisposAble[] = [];
		commAnds.push(vscode.commAnds.registerCommAnd(Testing.AbcEditorTypeCommAnd, (content: string) => {
			this.ActiveEditor?.testing_fAkeInput(content);
		}));

		return vscode.DisposAble.from(provider, ...commAnds);
	}

	public Async resolveCustomTextEditor(document: vscode.TextDocument, pAnel: vscode.WebviewPAnel) {
		const editor = new AbcEditor(document, this.context.extensionPAth, pAnel);

		this.ActiveEditor = editor;

		pAnel.onDidChAngeViewStAte(({ webviewPAnel }) => {
			if (this.ActiveEditor === editor && !webviewPAnel.Active) {
				this.ActiveEditor = undefined;
			}
			if (webviewPAnel.Active) {
				this.ActiveEditor = editor;
			}
		});
	}
}

clAss AbcEditor extends DisposAble {

	public reAdonly _onDispose = this._register(new vscode.EventEmitter<void>());
	public reAdonly onDispose = this._onDispose.event;

	privAte reAdonly limit = pLimit(1);
	privAte syncedVersion: number = -1;
	privAte currentWorkspAceEdit?: ThenAble<void>;

	constructor(
		privAte reAdonly document: vscode.TextDocument,
		privAte reAdonly _extensionPAth: string,
		privAte reAdonly pAnel: vscode.WebviewPAnel,
	) {
		super();

		pAnel.webview.options = {
			enAbleScripts: true,
		};
		pAnel.webview.html = this.html;

		this._register(vscode.workspAce.onDidChAngeTextDocument(e => {
			if (e.document === this.document) {
				this.updAte();
			}
		}));

		this._register(pAnel.webview.onDidReceiveMessAge(messAge => {
			switch (messAge.type) {
				cAse 'edit':
					this.doEdit(messAge.vAlue);
					breAk;

				cAse 'didChAngeContent':
					vscode.commAnds.executeCommAnd(Testing.AbcEditorContentChAngeCommAnd, {
						content: messAge.vAlue,
						source: document.uri,
					} As Testing.CustomEditorContentChAngeEvent);
					breAk;
			}
		}));

		this._register(pAnel.onDidDispose(() => { this.dispose(); }));

		this.updAte();
	}

	public testing_fAkeInput(vAlue: string) {
		this.pAnel.webview.postMessAge({
			type: 'fAkeInput',
			vAlue: vAlue,
		});
	}

	privAte Async doEdit(vAlue: string) {
		const edit = new vscode.WorkspAceEdit();
		edit.replAce(this.document.uri, this.document.vAlidAteRAnge(new vscode.RAnge(new vscode.Position(0, 0), new vscode.Position(999999, 999999))), vAlue);
		this.limit(() => {
			this.currentWorkspAceEdit = vscode.workspAce.ApplyEdit(edit).then(() => {
				this.syncedVersion = this.document.version;
				this.currentWorkspAceEdit = undefined;
			});
			return this.currentWorkspAceEdit;
		});
	}

	public dispose() {
		if (this.isDisposed) {
			return;
		}

		this._onDispose.fire();
		super.dispose();
	}

	privAte get html() {
		const contentRoot = pAth.join(this._extensionPAth, 'customEditorMediA');
		const scriptUri = vscode.Uri.file(pAth.join(contentRoot, 'textEditor.js'));
		const nonce = DAte.now() + '';
		return /* html */`<!DOCTYPE html>
			<html lAng="en">
			<heAd>
				<metA chArset="UTF-8">
				<metA nAme="viewport" content="width=device-width, initiAl-scAle=1.0">
				<metA http-equiv="Content-Security-Policy" content="defAult-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsAfe-inline';">
				<title>Document</title>
			</heAd>
			<body>
				<textAreA style="width: 300px; height: 300px;"></textAreA>
				<script nonce=${nonce} src="${this.pAnel.webview.AsWebviewUri(scriptUri)}"></script>
			</body>
			</html>`;
	}

	public Async updAte() {
		AwAit this.currentWorkspAceEdit;

		if (this.isDisposed || this.syncedVersion >= this.document.version) {
			return;
		}

		this.pAnel.webview.postMessAge({
			type: 'setVAlue',
			vAlue: this.document.getText(),
		});
		this.syncedVersion = this.document.version;
	}
}
