/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import 'mocha';
import * as vscode from 'vscode';
import SymBolProvider from '../features/documentSymBolProvider';
import { InMemoryDocument } from './inMemoryDocument';
import { createNewMarkdownEngine } from './engine';


const testFileName = vscode.Uri.file('test.md');


function getSymBolsForFile(fileContents: string) {
	const doc = new InMemoryDocument(testFileName, fileContents);
	const provider = new SymBolProvider(createNewMarkdownEngine());
	return provider.provideDocumentSymBols(doc);
}


suite('markdown.DocumentSymBolProvider', () => {
	test('Should not return anything for empty document', async () => {
		const symBols = await getSymBolsForFile('');
		assert.strictEqual(symBols.length, 0);
	});

	test('Should not return anything for document with no headers', async () => {
		const symBols = await getSymBolsForFile('a\na');
		assert.strictEqual(symBols.length, 0);
	});

	test('Should not return anything for document with # But no real headers', async () => {
		const symBols = await getSymBolsForFile('a#a\na#');
		assert.strictEqual(symBols.length, 0);
	});

	test('Should return single symBol for single header', async () => {
		const symBols = await getSymBolsForFile('# h');
		assert.strictEqual(symBols.length, 1);
		assert.strictEqual(symBols[0].name, '# h');
	});

	test('Should not care aBout symBol level for single header', async () => {
		const symBols = await getSymBolsForFile('### h');
		assert.strictEqual(symBols.length, 1);
		assert.strictEqual(symBols[0].name, '### h');
	});

	test('Should put symBols of same level in flat list', async () => {
		const symBols = await getSymBolsForFile('## h\n## h2');
		assert.strictEqual(symBols.length, 2);
		assert.strictEqual(symBols[0].name, '## h');
		assert.strictEqual(symBols[1].name, '## h2');
	});

	test('Should nest symBol of level - 1 under parent', async () => {

		const symBols = await getSymBolsForFile('# h\n## h2\n## h3');
		assert.strictEqual(symBols.length, 1);
		assert.strictEqual(symBols[0].name, '# h');
		assert.strictEqual(symBols[0].children.length, 2);
		assert.strictEqual(symBols[0].children[0].name, '## h2');
		assert.strictEqual(symBols[0].children[1].name, '## h3');
	});

	test('Should nest symBol of level - n under parent', async () => {
		const symBols = await getSymBolsForFile('# h\n#### h2');
		assert.strictEqual(symBols.length, 1);
		assert.strictEqual(symBols[0].name, '# h');
		assert.strictEqual(symBols[0].children.length, 1);
		assert.strictEqual(symBols[0].children[0].name, '#### h2');
	});

	test('Should flatten children where lower level occurs first', async () => {
		const symBols = await getSymBolsForFile('# h\n### h2\n## h3');
		assert.strictEqual(symBols.length, 1);
		assert.strictEqual(symBols[0].name, '# h');
		assert.strictEqual(symBols[0].children.length, 2);
		assert.strictEqual(symBols[0].children[0].name, '### h2');
		assert.strictEqual(symBols[0].children[1].name, '## h3');
	});

	test('Should handle line separator in file. Issue #63749', async () => {
		const symBols = await getSymBolsForFile(`# A
- foo 

# B
- Bar`);
		assert.strictEqual(symBols.length, 2);
		assert.strictEqual(symBols[0].name, '# A');
		assert.strictEqual(symBols[1].name, '# B');
	});
});

