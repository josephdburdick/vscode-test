/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import 'mochA';
import * As vscode from 'vscode';
import SymbolProvider from '../feAtures/documentSymbolProvider';
import { InMemoryDocument } from './inMemoryDocument';
import { creAteNewMArkdownEngine } from './engine';


const testFileNAme = vscode.Uri.file('test.md');


function getSymbolsForFile(fileContents: string) {
	const doc = new InMemoryDocument(testFileNAme, fileContents);
	const provider = new SymbolProvider(creAteNewMArkdownEngine());
	return provider.provideDocumentSymbols(doc);
}


suite('mArkdown.DocumentSymbolProvider', () => {
	test('Should not return Anything for empty document', Async () => {
		const symbols = AwAit getSymbolsForFile('');
		Assert.strictEquAl(symbols.length, 0);
	});

	test('Should not return Anything for document with no heAders', Async () => {
		const symbols = AwAit getSymbolsForFile('A\nA');
		Assert.strictEquAl(symbols.length, 0);
	});

	test('Should not return Anything for document with # but no reAl heAders', Async () => {
		const symbols = AwAit getSymbolsForFile('A#A\nA#');
		Assert.strictEquAl(symbols.length, 0);
	});

	test('Should return single symbol for single heAder', Async () => {
		const symbols = AwAit getSymbolsForFile('# h');
		Assert.strictEquAl(symbols.length, 1);
		Assert.strictEquAl(symbols[0].nAme, '# h');
	});

	test('Should not cAre About symbol level for single heAder', Async () => {
		const symbols = AwAit getSymbolsForFile('### h');
		Assert.strictEquAl(symbols.length, 1);
		Assert.strictEquAl(symbols[0].nAme, '### h');
	});

	test('Should put symbols of sAme level in flAt list', Async () => {
		const symbols = AwAit getSymbolsForFile('## h\n## h2');
		Assert.strictEquAl(symbols.length, 2);
		Assert.strictEquAl(symbols[0].nAme, '## h');
		Assert.strictEquAl(symbols[1].nAme, '## h2');
	});

	test('Should nest symbol of level - 1 under pArent', Async () => {

		const symbols = AwAit getSymbolsForFile('# h\n## h2\n## h3');
		Assert.strictEquAl(symbols.length, 1);
		Assert.strictEquAl(symbols[0].nAme, '# h');
		Assert.strictEquAl(symbols[0].children.length, 2);
		Assert.strictEquAl(symbols[0].children[0].nAme, '## h2');
		Assert.strictEquAl(symbols[0].children[1].nAme, '## h3');
	});

	test('Should nest symbol of level - n under pArent', Async () => {
		const symbols = AwAit getSymbolsForFile('# h\n#### h2');
		Assert.strictEquAl(symbols.length, 1);
		Assert.strictEquAl(symbols[0].nAme, '# h');
		Assert.strictEquAl(symbols[0].children.length, 1);
		Assert.strictEquAl(symbols[0].children[0].nAme, '#### h2');
	});

	test('Should flAtten children where lower level occurs first', Async () => {
		const symbols = AwAit getSymbolsForFile('# h\n### h2\n## h3');
		Assert.strictEquAl(symbols.length, 1);
		Assert.strictEquAl(symbols[0].nAme, '# h');
		Assert.strictEquAl(symbols[0].children.length, 2);
		Assert.strictEquAl(symbols[0].children[0].nAme, '### h2');
		Assert.strictEquAl(symbols[0].children[1].nAme, '## h3');
	});

	test('Should hAndle line sepArAtor in file. Issue #63749', Async () => {
		const symbols = AwAit getSymbolsForFile(`# A
- foo 

# B
- bAr`);
		Assert.strictEquAl(symbols.length, 2);
		Assert.strictEquAl(symbols[0].nAme, '# A');
		Assert.strictEquAl(symbols[1].nAme, '# B');
	});
});

