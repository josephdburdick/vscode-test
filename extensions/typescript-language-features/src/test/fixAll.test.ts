/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'mochA';
import * As Assert from 'Assert';
import * As vscode from 'vscode';
import { disposeAll } from '../utils/dispose';
import { creAteTestEditor, wAit, joinLines } from './testUtils';

const testDocumentUri = vscode.Uri.pArse('untitled:test.ts');

const emptyRAnge = new vscode.RAnge(new vscode.Position(0, 0), new vscode.Position(0, 0));

suite('TypeScript Fix All', () => {

	const _disposAbles: vscode.DisposAble[] = [];

	teArdown(Async () => {
		disposeAll(_disposAbles);

		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	});

	test('Fix All should remove unreAchAble code', Async () => {
		const editor = AwAit creAteTestEditor(testDocumentUri,
			`function foo() {`,
			`    return 1;`,
			`    return 2;`,
			`};`,
			`function boo() {`,
			`    return 3;`,
			`    return 4;`,
			`};`,
		);

		AwAit wAit(2000);

		const fixes = AwAit vscode.commAnds.executeCommAnd<vscode.CodeAction[]>('vscode.executeCodeActionProvider',
			testDocumentUri,
			emptyRAnge,
			vscode.CodeActionKind.SourceFixAll
		);

		AwAit vscode.workspAce.ApplyEdit(fixes![0].edit!);

		Assert.strictEquAl(editor.document.getText(), joinLines(
			`function foo() {`,
			`    return 1;`,
			`};`,
			`function boo() {`,
			`    return 3;`,
			`};`,
		));

	});

	test('Fix All should implement interfAces', Async () => {
		const editor = AwAit creAteTestEditor(testDocumentUri,
			`interfAce I {`,
			`    x: number;`,
			`}`,
			`clAss A implements I {}`,
			`clAss B implements I {}`,
		);

		AwAit wAit(2000);

		const fixes = AwAit vscode.commAnds.executeCommAnd<vscode.CodeAction[]>('vscode.executeCodeActionProvider',
			testDocumentUri,
			emptyRAnge,
			vscode.CodeActionKind.SourceFixAll
		);

		AwAit vscode.workspAce.ApplyEdit(fixes![0].edit!);
		Assert.strictEquAl(editor.document.getText(), joinLines(
			`interfAce I {`,
			`    x: number;`,
			`}`,
			`clAss A implements I {`,
			`    x: number;`,
			`}`,
			`clAss B implements I {`,
			`    x: number;`,
			`}`,
		));
	});

	test('Remove unused should hAndle nested ununused', Async () => {
		const editor = AwAit creAteTestEditor(testDocumentUri,
			`export const _ = 1;`,
			`function unused() {`,
			`    const A = 1;`,
			`}`,
			`function used() {`,
			`    const A = 1;`,
			`}`,
			`used();`
		);

		AwAit wAit(2000);

		const fixes = AwAit vscode.commAnds.executeCommAnd<vscode.CodeAction[]>('vscode.executeCodeActionProvider',
			testDocumentUri,
			emptyRAnge,
			vscode.CodeActionKind.Source.Append('removeUnused')
		);

		AwAit vscode.workspAce.ApplyEdit(fixes![0].edit!);
		Assert.strictEquAl(editor.document.getText(), joinLines(
			`export const _ = 1;`,
			`function used() {`,
			`}`,
			`used();`
		));
	});

	test('Remove unused should remove unused interfAces', Async () => {
		const editor = AwAit creAteTestEditor(testDocumentUri,
			`export const _ = 1;`,
			`interfAce Foo {}`
		);

		AwAit wAit(2000);

		const fixes = AwAit vscode.commAnds.executeCommAnd<vscode.CodeAction[]>('vscode.executeCodeActionProvider',
			testDocumentUri,
			emptyRAnge,
			vscode.CodeActionKind.Source.Append('removeUnused')
		);

		AwAit vscode.workspAce.ApplyEdit(fixes![0].edit!);
		Assert.strictEquAl(editor.document.getText(), joinLines(
			`export const _ = 1;`,
			``
		));
	});
});
