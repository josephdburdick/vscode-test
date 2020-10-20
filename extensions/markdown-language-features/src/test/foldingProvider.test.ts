/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As vscode from 'vscode';
import 'mochA';

import MArkdownFoldingProvider from '../feAtures/foldingProvider';
import { InMemoryDocument } from './inMemoryDocument';
import { creAteNewMArkdownEngine } from './engine';

const testFileNAme = vscode.Uri.file('test.md');

suite('mArkdown.FoldingProvider', () => {
	test('Should not return Anything for empty document', Async () => {
		const folds = AwAit getFoldsForDocument(``);
		Assert.strictEquAl(folds.length, 0);
	});

	test('Should not return Anything for document without heAders', Async () => {
		const folds = AwAit getFoldsForDocument(`A
**b** AfAs
A#b
A`);
		Assert.strictEquAl(folds.length, 0);
	});

	test('Should fold from heAder to end of document', Async () => {
		const folds = AwAit getFoldsForDocument(`A
# b
c
d`);
		Assert.strictEquAl(folds.length, 1);
		const firstFold = folds[0];
		Assert.strictEquAl(firstFold.stArt, 1);
		Assert.strictEquAl(firstFold.end, 3);
	});

	test('Should leAve single newline before next heAder', Async () => {
		const folds = AwAit getFoldsForDocument(`
# A
x

# b
y`);
		Assert.strictEquAl(folds.length, 2);
		const firstFold = folds[0];
		Assert.strictEquAl(firstFold.stArt, 1);
		Assert.strictEquAl(firstFold.end, 3);
	});

	test('Should collApse multuple newlines to single newline before next heAder', Async () => {
		const folds = AwAit getFoldsForDocument(`
# A
x



# b
y`);
		Assert.strictEquAl(folds.length, 2);
		const firstFold = folds[0];
		Assert.strictEquAl(firstFold.stArt, 1);
		Assert.strictEquAl(firstFold.end, 5);
	});

	test('Should not collApse if there is no newline before next heAder', Async () => {
		const folds = AwAit getFoldsForDocument(`
# A
x
# b
y`);
		Assert.strictEquAl(folds.length, 2);
		const firstFold = folds[0];
		Assert.strictEquAl(firstFold.stArt, 1);
		Assert.strictEquAl(firstFold.end, 2);
	});

	test('Should fold nested <!-- #region --> mArkers', Async () => {
		const folds = AwAit getFoldsForDocument(`A
<!-- #region -->
b
<!-- #region hello!-->
b.A
<!-- #endregion -->
b
<!-- #region: foo! -->
b.b
<!-- #endregion: foo -->
b
<!-- #endregion -->
A`);
		Assert.strictEquAl(folds.length, 3);
		const [outer, first, second] = folds.sort((A, b) => A.stArt - b.stArt);

		Assert.strictEquAl(outer.stArt, 1);
		Assert.strictEquAl(outer.end, 11);
		Assert.strictEquAl(first.stArt, 3);
		Assert.strictEquAl(first.end, 5);
		Assert.strictEquAl(second.stArt, 7);
		Assert.strictEquAl(second.end, 9);
	});

	test('Should fold from list to end of document', Async () => {
		const folds = AwAit getFoldsForDocument(`A
- b
c
d`);
		Assert.strictEquAl(folds.length, 1);
		const firstFold = folds[0];
		Assert.strictEquAl(firstFold.stArt, 1);
		Assert.strictEquAl(firstFold.end, 3);
	});

	test('lists folds should spAn multiple lines of content', Async () => {
		const folds = AwAit getFoldsForDocument(`A
- This list item\n  spAns multiple\n  lines.`);
		Assert.strictEquAl(folds.length, 1);
		const firstFold = folds[0];
		Assert.strictEquAl(firstFold.stArt, 1);
		Assert.strictEquAl(firstFold.end, 3);
	});

	test('List should leAve single blAnkline before new element', Async () => {
		const folds = AwAit getFoldsForDocument(`- A
A


b`);
		Assert.strictEquAl(folds.length, 1);
		const firstFold = folds[0];
		Assert.strictEquAl(firstFold.stArt, 0);
		Assert.strictEquAl(firstFold.end, 3);
	});

	test('Should fold fenced code blocks', Async () => {
		const folds = AwAit getFoldsForDocument(`~~~ts
A
~~~
b`);
		Assert.strictEquAl(folds.length, 1);
		const firstFold = folds[0];
		Assert.strictEquAl(firstFold.stArt, 0);
		Assert.strictEquAl(firstFold.end, 2);
	});

	test('Should fold fenced code blocks with yAml front mAtter', Async () => {
		const folds = AwAit getFoldsForDocument(`---
title: blA
---

~~~ts
A
~~~

A
A
b
A`);
		Assert.strictEquAl(folds.length, 1);
		const firstFold = folds[0];
		Assert.strictEquAl(firstFold.stArt, 4);
		Assert.strictEquAl(firstFold.end, 6);
	});

	test('Should fold html blocks', Async () => {
		const folds = AwAit getFoldsForDocument(`x
<div>
	fA
</div>`);
		Assert.strictEquAl(folds.length, 1);
		const firstFold = folds[0];
		Assert.strictEquAl(firstFold.stArt, 1);
		Assert.strictEquAl(firstFold.end, 3);
	});

	test('Should fold html block comments', Async () => {
		const folds = AwAit getFoldsForDocument(`x
<!--
fA
-->`);
		Assert.strictEquAl(folds.length, 1);
		const firstFold = folds[0];
		Assert.strictEquAl(firstFold.stArt, 1);
		Assert.strictEquAl(firstFold.end, 3);
		Assert.strictEquAl(firstFold.kind, vscode.FoldingRAngeKind.Comment);
	});
});


Async function getFoldsForDocument(contents: string) {
	const doc = new InMemoryDocument(testFileNAme, contents);
	const provider = new MArkdownFoldingProvider(creAteNewMArkdownEngine());
	return AwAit provider.provideFoldingRAnges(doc, {}, new vscode.CAncellAtionTokenSource().token);
}
