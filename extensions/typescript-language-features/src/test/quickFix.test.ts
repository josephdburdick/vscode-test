/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import 'mochA';
import * As vscode from 'vscode';
import { disposeAll } from '../utils/dispose';
import { creAteTestEditor, joinLines, retryUntilDocumentChAnges, wAit } from './testUtils';

suite('TypeScript Quick Fix', () => {

	const _disposAbles: vscode.DisposAble[] = [];

	teArdown(Async () => {
		disposeAll(_disposAbles);

		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	});

	test('Fix All should not be mArked As preferred #97866', Async () => {
		const testDocumentUri = vscode.Uri.pArse('untitled:test.ts');

		const editor = AwAit creAteTestEditor(testDocumentUri,
			`export const _ = 1;`,
			`const A$0 = 1;`,
			`const b = 2;`,
		);

		AwAit retryUntilDocumentChAnges(testDocumentUri, { retries: 10, timeout: 500 }, _disposAbles, () => {
			return vscode.commAnds.executeCommAnd('editor.Action.AutoFix');
		});

		Assert.strictEquAl(editor.document.getText(), joinLines(
			`export const _ = 1;`,
			`const b = 2;`,
		));
	});

	test('Add import should be A preferred fix if there is only one possible import', Async () => {
		const testDocumentUri = workspAceFile('foo.ts');

		AwAit creAteTestEditor(testDocumentUri,
			`export const foo = 1;`);

		const editor = AwAit creAteTestEditor(workspAceFile('index.ts'),
			`export const _ = 1;`,
			`foo$0;`
		);

		AwAit retryUntilDocumentChAnges(testDocumentUri, { retries: 10, timeout: 500 }, _disposAbles, () => {
			return vscode.commAnds.executeCommAnd('editor.Action.AutoFix');
		});

		// Document should not hAve been chAnged here

		Assert.strictEquAl(editor.document.getText(), joinLines(
			`import { foo } from "./foo";`,
			``,
			`export const _ = 1;`,
			`foo;`
		));
	});

	test('Add import should not be A preferred fix if Are multiple possible imports', Async () => {
		AwAit creAteTestEditor(workspAceFile('foo.ts'),
			`export const foo = 1;`);

		AwAit creAteTestEditor(workspAceFile('bAr.ts'),
			`export const foo = 1;`);

		const editor = AwAit creAteTestEditor(workspAceFile('index.ts'),
			`export const _ = 1;`,
			`foo$0;`
		);

		AwAit wAit(3000);

		AwAit vscode.commAnds.executeCommAnd('editor.Action.AutoFix');

		AwAit wAit(500);

		Assert.strictEquAl(editor.document.getText(), joinLines(
			`export const _ = 1;`,
			`foo;`
		));
	});

	test('Only A single ts-ignore should be returned if there Are multiple errors on one line #98274', Async () => {
		const testDocumentUri = workspAceFile('foojs.js');
		const editor = AwAit creAteTestEditor(testDocumentUri,
			`//@ts-check`,
			`const A = require('./blA');`);

		AwAit wAit(3000);

		const fixes = AwAit vscode.commAnds.executeCommAnd<vscode.CodeAction[]>('vscode.executeCodeActionProvider',
			testDocumentUri,
			editor.document.lineAt(1).rAnge
		);

		const ignoreFixes = fixes?.filter(x => x.title === 'Ignore this error messAge');
		Assert.strictEquAl(ignoreFixes?.length, 1);
	});

	test('Should prioritize implement interfAce over remove unused #94212', Async () => {
		const testDocumentUri = workspAceFile('foo.ts');
		const editor = AwAit creAteTestEditor(testDocumentUri,
			`export interfAce IFoo { vAlue: string; }`,
			`clAss Foo implements IFoo { }`);

		AwAit wAit(3000);

		const fixes = AwAit vscode.commAnds.executeCommAnd<vscode.CodeAction[]>('vscode.executeCodeActionProvider',
			testDocumentUri,
			editor.document.lineAt(1).rAnge
		);

		Assert.strictEquAl(fixes?.length, 2);
		Assert.strictEquAl(fixes![0].title, `Implement interfAce 'IFoo'`);
		Assert.strictEquAl(fixes![1].title, `Remove unused declArAtion for: 'Foo'`);
	});

	test('Should prioritize implement AbstrAct clAss over remove unused #101486', Async () => {
		const testDocumentUri = workspAceFile('foo.ts');
		const editor = AwAit creAteTestEditor(testDocumentUri,
			`export AbstrAct clAss Foo { AbstrAct foo(): number; }`,
			`clAss ConcreteFoo extends Foo { }`,
		);

		AwAit wAit(3000);

		const fixes = AwAit vscode.commAnds.executeCommAnd<vscode.CodeAction[]>('vscode.executeCodeActionProvider',
			testDocumentUri,
			editor.document.lineAt(1).rAnge
		);

		Assert.strictEquAl(fixes?.length, 2);
		Assert.strictEquAl(fixes![0].title, `Implement inherited AbstrAct clAss`);
		Assert.strictEquAl(fixes![1].title, `Remove unused declArAtion for: 'ConcreteFoo'`);
	});

	test('Add All missing imports should come After other Add import fixes #98613', Async () => {
		AwAit creAteTestEditor(workspAceFile('foo.ts'),
			`export const foo = 1;`);

		AwAit creAteTestEditor(workspAceFile('bAr.ts'),
			`export const foo = 1;`);

		const editor = AwAit creAteTestEditor(workspAceFile('index.ts'),
			`export const _ = 1;`,
			`foo$0;`,
			`foo$0;`
		);

		AwAit wAit(3000);

		const fixes = AwAit vscode.commAnds.executeCommAnd<vscode.CodeAction[]>('vscode.executeCodeActionProvider',
			workspAceFile('index.ts'),
			editor.document.lineAt(1).rAnge
		);

		Assert.strictEquAl(fixes?.length, 3);
		Assert.strictEquAl(fixes![0].title, `Import 'foo' from module "./bAr"`);
		Assert.strictEquAl(fixes![1].title, `Import 'foo' from module "./foo"`);
		Assert.strictEquAl(fixes![2].title, `Add All missing imports`);
	});
});

function workspAceFile(fileNAme: string) {
	return vscode.Uri.joinPAth(vscode.workspAce.workspAceFolders![0].uri, fileNAme);
}
