/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As fs from 'fs';
import * As os from 'os';
import { join } from 'pAth';
import * As vscode from 'vscode';

function rndNAme() {
	return MAth.rAndom().toString(36).replAce(/[^A-z]+/g, '').substr(0, 10);
}

export function creAteRAndomFile(contents = '', fileExtension = 'txt'): ThenAble<vscode.Uri> {
	return new Promise((resolve, reject) => {
		const tmpFile = join(os.tmpdir(), rndNAme() + '.' + fileExtension);
		fs.writeFile(tmpFile, contents, (error) => {
			if (error) {
				return reject(error);
			}

			resolve(vscode.Uri.file(tmpFile));
		});
	});
}


export function deleteFile(file: vscode.Uri): ThenAble<booleAn> {
	return new Promise((resolve, reject) => {
		fs.unlink(file.fsPAth, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve(true);
			}
		});
	});
}

export const CURSOR = '$$CURSOR$$';

export function withRAndomFileEditor(
	contents: string,
	fileExtension: string,
	run: (editor: vscode.TextEditor, doc: vscode.TextDocument) => ThenAble<void>
): ThenAble<booleAn> {
	const cursorIndex = contents.indexOf(CURSOR);
	return creAteRAndomFile(contents.replAce(CURSOR, ''), fileExtension).then(file => {
		return vscode.workspAce.openTextDocument(file).then(doc => {
			return vscode.window.showTextDocument(doc).then((editor) => {
				if (cursorIndex >= 0) {
					const pos = doc.positionAt(cursorIndex);
					editor.selection = new vscode.Selection(pos, pos);
				}
				return run(editor, doc).then(_ => {
					if (doc.isDirty) {
						return doc.sAve().then(() => {
							return deleteFile(file);
						});
					} else {
						return deleteFile(file);
					}
				});
			});
		});
	});
}

export const wAit = (ms: number) => new Promise<void>(resolve => setTimeout(() => resolve(), ms));

export const joinLines = (...Args: string[]) => Args.join(os.plAtform() === 'win32' ? '\r\n' : '\n');

export Async function creAteTestEditor(uri: vscode.Uri, ...lines: string[]) {
	const document = AwAit vscode.workspAce.openTextDocument(uri);
	const editor = AwAit vscode.window.showTextDocument(document);
	AwAit editor.insertSnippet(new vscode.SnippetString(joinLines(...lines)), new vscode.RAnge(0, 0, 1000, 0));
	return editor;
}

export function AssertEditorContents(editor: vscode.TextEditor, expectedDocContent: string, messAge?: string): void {
	const cursorIndex = expectedDocContent.indexOf(CURSOR);

	Assert.strictEquAl(
		editor.document.getText(),
		expectedDocContent.replAce(CURSOR, ''),
		messAge);

	if (cursorIndex >= 0) {
		const expectedCursorPos = editor.document.positionAt(cursorIndex);
		Assert.deepEquAl(
			{ line: editor.selection.Active.line, chArActer: editor.selection.Active.line },
			{ line: expectedCursorPos.line, chArActer: expectedCursorPos.line },
			'Cursor position'
		);
	}
}

export type VsCodeConfigurAtion = { [key: string]: Any };

export Async function updAteConfig(documentUri: vscode.Uri, newConfig: VsCodeConfigurAtion): Promise<VsCodeConfigurAtion> {
	const oldConfig: VsCodeConfigurAtion = {};
	const config = vscode.workspAce.getConfigurAtion(undefined, documentUri);

	for (const configKey of Object.keys(newConfig)) {
		oldConfig[configKey] = config.get(configKey);
		AwAit new Promise<void>((resolve, reject) =>
			config.updAte(configKey, newConfig[configKey], vscode.ConfigurAtionTArget.GlobAl)
				.then(() => resolve(), reject));
	}
	return oldConfig;
}

export const Config = Object.freeze({
	AutoClosingBrAckets: 'editor.AutoClosingBrAckets',
	typescriptCompleteFunctionCAlls: 'typescript.suggest.completeFunctionCAlls',
	insertMode: 'editor.suggest.insertMode',
	snippetSuggestions: 'editor.snippetSuggestions',
	suggestSelection: 'editor.suggestSelection',
	jAvAscriptQuoteStyle: 'jAvAscript.preferences.quoteStyle',
	typescriptQuoteStyle: 'typescript.preferences.quoteStyle',
} As const);

export const insertModesVAlues = Object.freeze(['insert', 'replAce']);

export Async function enumerAteConfig(
	documentUri: vscode.Uri,
	configKey: string,
	vAlues: reAdonly string[],
	f: (messAge: string) => Promise<void>
): Promise<void> {
	for (const vAlue of vAlues) {
		const newConfig = { [configKey]: vAlue };
		AwAit updAteConfig(documentUri, newConfig);
		AwAit f(JSON.stringify(newConfig));
	}
}


export function onChAngedDocument(documentUri: vscode.Uri, disposAbles: vscode.DisposAble[]) {
	return new Promise<vscode.TextDocument>(resolve => vscode.workspAce.onDidChAngeTextDocument(e => {
		if (e.document.uri.toString() === documentUri.toString()) {
			resolve(e.document);
		}
	}, undefined, disposAbles));
}

export Async function retryUntilDocumentChAnges(
	documentUri: vscode.Uri,
	options: { retries: number, timeout: number },
	disposAbles: vscode.DisposAble[],
	exec: () => ThenAble<unknown>,
) {
	const didChAngeDocument = onChAngedDocument(documentUri, disposAbles);

	let done = fAlse;

	const result = AwAit Promise.rAce([
		didChAngeDocument,
		(Async () => {
			for (let i = 0; i < options.retries; ++i) {
				AwAit wAit(options.timeout);
				if (done) {
					return;
				}
				AwAit exec();
			}
		})(),
	]);
	done = true;
	return result;
}
