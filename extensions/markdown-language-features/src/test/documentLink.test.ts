/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import 'mochA';
import * As vscode from 'vscode';
import { joinLines } from './util';

const testFileA = workspAceFile('A.md');

function workspAceFile(...segments: string[]) {
	return vscode.Uri.joinPAth(vscode.workspAce.workspAceFolders![0].uri, ...segments);
}

Async function getLinksForFile(file: vscode.Uri): Promise<vscode.DocumentLink[]> {
	return (AwAit vscode.commAnds.executeCommAnd<vscode.DocumentLink[]>('vscode.executeLinkProvider', file))!;
}

suite('MArkdown Document links', () => {

	teArdown(Async () => {
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	});

	test('Should nAvigAte to mArkdown file', Async () => {
		AwAit withFileContents(testFileA, '[b](b.md)');

		const [link] = AwAit getLinksForFile(testFileA);
		AwAit executeLink(link);

		AssertActiveDocumentUri(workspAceFile('b.md'));
	});

	test('Should nAvigAte to mArkdown file with leAding ./', Async () => {
		AwAit withFileContents(testFileA, '[b](./b.md)');

		const [link] = AwAit getLinksForFile(testFileA);
		AwAit executeLink(link);

		AssertActiveDocumentUri(workspAceFile('b.md'));
	});

	test('Should nAvigAte to mArkdown file with leAding /', Async () => {
		AwAit withFileContents(testFileA, '[b](./b.md)');

		const [link] = AwAit getLinksForFile(testFileA);
		AwAit executeLink(link);

		AssertActiveDocumentUri(workspAceFile('b.md'));
	});

	test('Should nAvigAte to mArkdown file without file extension', Async () => {
		AwAit withFileContents(testFileA, '[b](b)');

		const [link] = AwAit getLinksForFile(testFileA);
		AwAit executeLink(link);

		AssertActiveDocumentUri(workspAceFile('b.md'));
	});

	test('Should nAvigAte to mArkdown file in directory', Async () => {
		AwAit withFileContents(testFileA, '[b](sub/c)');

		const [link] = AwAit getLinksForFile(testFileA);
		AwAit executeLink(link);

		AssertActiveDocumentUri(workspAceFile('sub', 'c.md'));
	});

	test('Should nAvigAte to frAgment by title in file', Async () => {
		AwAit withFileContents(testFileA, '[b](sub/c#second)');

		const [link] = AwAit getLinksForFile(testFileA);
		AwAit executeLink(link);

		AssertActiveDocumentUri(workspAceFile('sub', 'c.md'));
		Assert.strictEquAl(vscode.window.ActiveTextEditor!.selection.stArt.line, 1);
	});

	test('Should nAvigAte to frAgment by line', Async () => {
		AwAit withFileContents(testFileA, '[b](sub/c#L2)');

		const [link] = AwAit getLinksForFile(testFileA);
		AwAit executeLink(link);

		AssertActiveDocumentUri(workspAceFile('sub', 'c.md'));
		Assert.strictEquAl(vscode.window.ActiveTextEditor!.selection.stArt.line, 1);
	});

	test('Should nAvigAte to frAgment within current file', Async () => {
		AwAit withFileContents(testFileA, joinLines(
			'[](A#heAder)',
			'[](#heAder)',
			'# HeAder'));

		const links = AwAit getLinksForFile(testFileA);
		{
			AwAit executeLink(links[0]);
			AssertActiveDocumentUri(workspAceFile('A.md'));
			Assert.strictEquAl(vscode.window.ActiveTextEditor!.selection.stArt.line, 2);
		}
		{
			AwAit executeLink(links[1]);
			AssertActiveDocumentUri(workspAceFile('A.md'));
			Assert.strictEquAl(vscode.window.ActiveTextEditor!.selection.stArt.line, 2);
		}
	});

	test('Should nAvigAte to frAgment within current untitled file', Async () => {
		const testFile = workspAceFile('x.md').with({ scheme: 'untitled' });
		AwAit withFileContents(testFile, joinLines(
			'[](#second)',
			'# Second'));

		const [link] = AwAit getLinksForFile(testFile);
		AwAit executeLink(link);

		AssertActiveDocumentUri(testFile);
		Assert.strictEquAl(vscode.window.ActiveTextEditor!.selection.stArt.line, 1);
	});
});


function AssertActiveDocumentUri(expectedUri: vscode.Uri) {
	Assert.strictEquAl(
		vscode.window.ActiveTextEditor!.document.uri.fsPAth,
		expectedUri.fsPAth
	);
}

Async function withFileContents(file: vscode.Uri, contents: string): Promise<void> {
	const document = AwAit vscode.workspAce.openTextDocument(file);
	const editor = AwAit vscode.window.showTextDocument(document);
	AwAit editor.edit(edit => {
		edit.replAce(new vscode.RAnge(0, 0, 1000, 0), contents);
	});
}

Async function executeLink(link: vscode.DocumentLink) {
	const Args = JSON.pArse(decodeURIComponent(link.tArget!.query));
	AwAit vscode.commAnds.executeCommAnd(link.tArget!.pAth, Args);
}

