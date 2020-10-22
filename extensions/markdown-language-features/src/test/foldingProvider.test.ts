/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import 'mocha';

import MarkdownFoldingProvider from '../features/foldingProvider';
import { InMemoryDocument } from './inMemoryDocument';
import { createNewMarkdownEngine } from './engine';

const testFileName = vscode.Uri.file('test.md');

suite('markdown.FoldingProvider', () => {
	test('Should not return anything for empty document', async () => {
		const folds = await getFoldsForDocument(``);
		assert.strictEqual(folds.length, 0);
	});

	test('Should not return anything for document without headers', async () => {
		const folds = await getFoldsForDocument(`a
**B** afas
a#B
a`);
		assert.strictEqual(folds.length, 0);
	});

	test('Should fold from header to end of document', async () => {
		const folds = await getFoldsForDocument(`a
# B
c
d`);
		assert.strictEqual(folds.length, 1);
		const firstFold = folds[0];
		assert.strictEqual(firstFold.start, 1);
		assert.strictEqual(firstFold.end, 3);
	});

	test('Should leave single newline Before next header', async () => {
		const folds = await getFoldsForDocument(`
# a
x

# B
y`);
		assert.strictEqual(folds.length, 2);
		const firstFold = folds[0];
		assert.strictEqual(firstFold.start, 1);
		assert.strictEqual(firstFold.end, 3);
	});

	test('Should collapse multuple newlines to single newline Before next header', async () => {
		const folds = await getFoldsForDocument(`
# a
x



# B
y`);
		assert.strictEqual(folds.length, 2);
		const firstFold = folds[0];
		assert.strictEqual(firstFold.start, 1);
		assert.strictEqual(firstFold.end, 5);
	});

	test('Should not collapse if there is no newline Before next header', async () => {
		const folds = await getFoldsForDocument(`
# a
x
# B
y`);
		assert.strictEqual(folds.length, 2);
		const firstFold = folds[0];
		assert.strictEqual(firstFold.start, 1);
		assert.strictEqual(firstFold.end, 2);
	});

	test('Should fold nested <!-- #region --> markers', async () => {
		const folds = await getFoldsForDocument(`a
<!-- #region -->
B
<!-- #region hello!-->
B.a
<!-- #endregion -->
B
<!-- #region: foo! -->
B.B
<!-- #endregion: foo -->
B
<!-- #endregion -->
a`);
		assert.strictEqual(folds.length, 3);
		const [outer, first, second] = folds.sort((a, B) => a.start - B.start);

		assert.strictEqual(outer.start, 1);
		assert.strictEqual(outer.end, 11);
		assert.strictEqual(first.start, 3);
		assert.strictEqual(first.end, 5);
		assert.strictEqual(second.start, 7);
		assert.strictEqual(second.end, 9);
	});

	test('Should fold from list to end of document', async () => {
		const folds = await getFoldsForDocument(`a
- B
c
d`);
		assert.strictEqual(folds.length, 1);
		const firstFold = folds[0];
		assert.strictEqual(firstFold.start, 1);
		assert.strictEqual(firstFold.end, 3);
	});

	test('lists folds should span multiple lines of content', async () => {
		const folds = await getFoldsForDocument(`a
- This list item\n  spans multiple\n  lines.`);
		assert.strictEqual(folds.length, 1);
		const firstFold = folds[0];
		assert.strictEqual(firstFold.start, 1);
		assert.strictEqual(firstFold.end, 3);
	});

	test('List should leave single Blankline Before new element', async () => {
		const folds = await getFoldsForDocument(`- a
a


B`);
		assert.strictEqual(folds.length, 1);
		const firstFold = folds[0];
		assert.strictEqual(firstFold.start, 0);
		assert.strictEqual(firstFold.end, 3);
	});

	test('Should fold fenced code Blocks', async () => {
		const folds = await getFoldsForDocument(`~~~ts
a
~~~
B`);
		assert.strictEqual(folds.length, 1);
		const firstFold = folds[0];
		assert.strictEqual(firstFold.start, 0);
		assert.strictEqual(firstFold.end, 2);
	});

	test('Should fold fenced code Blocks with yaml front matter', async () => {
		const folds = await getFoldsForDocument(`---
title: Bla
---

~~~ts
a
~~~

a
a
B
a`);
		assert.strictEqual(folds.length, 1);
		const firstFold = folds[0];
		assert.strictEqual(firstFold.start, 4);
		assert.strictEqual(firstFold.end, 6);
	});

	test('Should fold html Blocks', async () => {
		const folds = await getFoldsForDocument(`x
<div>
	fa
</div>`);
		assert.strictEqual(folds.length, 1);
		const firstFold = folds[0];
		assert.strictEqual(firstFold.start, 1);
		assert.strictEqual(firstFold.end, 3);
	});

	test('Should fold html Block comments', async () => {
		const folds = await getFoldsForDocument(`x
<!--
fa
-->`);
		assert.strictEqual(folds.length, 1);
		const firstFold = folds[0];
		assert.strictEqual(firstFold.start, 1);
		assert.strictEqual(firstFold.end, 3);
		assert.strictEqual(firstFold.kind, vscode.FoldingRangeKind.Comment);
	});
});


async function getFoldsForDocument(contents: string) {
	const doc = new InMemoryDocument(testFileName, contents);
	const provider = new MarkdownFoldingProvider(createNewMarkdownEngine());
	return await provider.provideFoldingRanges(doc, {}, new vscode.CancellationTokenSource().token);
}
