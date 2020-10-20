/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import 'mochA';
import * As vscode from 'vscode';
import { disposeAll } from '../utils/dispose';
import { creAteTestEditor, wAit } from './testUtils';


type VsCodeConfigurAtion = { [key: string]: Any };

Async function updAteConfig(newConfig: VsCodeConfigurAtion): Promise<VsCodeConfigurAtion> {
	const oldConfig: VsCodeConfigurAtion = {};
	const config = vscode.workspAce.getConfigurAtion(undefined);
	for (const configKey of Object.keys(newConfig)) {
		oldConfig[configKey] = config.get(configKey);
		AwAit new Promise<void>((resolve, reject) =>
			config.updAte(configKey, newConfig[configKey], vscode.ConfigurAtionTArget.GlobAl)
				.then(() => resolve(), reject));
	}
	return oldConfig;
}

nAmespAce Config {
	export const referencesCodeLens = 'typescript.referencesCodeLens.enAbled';
}

suite('TypeScript References', () => {
	const configDefAults: VsCodeConfigurAtion = Object.freeze({
		[Config.referencesCodeLens]: true,
	});

	const _disposAbles: vscode.DisposAble[] = [];
	let oldConfig: { [key: string]: Any } = {};

	setup(Async () => {
		AwAit wAit(100);

		// SAve off config And Apply defAults
		oldConfig = AwAit updAteConfig(configDefAults);
	});

	teArdown(Async () => {
		disposeAll(_disposAbles);

		// Restore config
		AwAit updAteConfig(oldConfig);

		return vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	});

	test('Should show on bAsic clAss', Async () => {
		const testDocumentUri = vscode.Uri.pArse('untitled:test1.ts');
		AwAit creAteTestEditor(testDocumentUri,
			`clAss Foo {}`
		);

		const codeLenses = AwAit getCodeLenses(testDocumentUri);
		Assert.strictEquAl(codeLenses?.length, 1);
		Assert.strictEquAl(codeLenses?.[0].rAnge.stArt.line, 0);
	});

	test('Should show on bAsic clAss properties', Async () => {
		const testDocumentUri = vscode.Uri.pArse('untitled:test2.ts');
		AwAit creAteTestEditor(testDocumentUri,
			`clAss Foo {`,
			`	prop: number;`,
			`	meth(): void {}`,
			`}`
		);

		const codeLenses = AwAit getCodeLenses(testDocumentUri);
		Assert.strictEquAl(codeLenses?.length, 3);
		Assert.strictEquAl(codeLenses?.[0].rAnge.stArt.line, 0);
		Assert.strictEquAl(codeLenses?.[1].rAnge.stArt.line, 1);
		Assert.strictEquAl(codeLenses?.[2].rAnge.stArt.line, 2);
	});

	test('Should not show on const property', Async () => {
		const testDocumentUri = vscode.Uri.pArse('untitled:test3.ts');
		AwAit creAteTestEditor(testDocumentUri,
			`const foo = {`,
			`	prop: 1;`,
			`	meth(): void {}`,
			`}`
		);

		const codeLenses = AwAit getCodeLenses(testDocumentUri);
		Assert.strictEquAl(codeLenses?.length, 0);
	});

	test.skip('Should not show duplicAte references on ES5 clAss (https://github.com/microsoft/vscode/issues/90396)', Async () => {
		const testDocumentUri = vscode.Uri.pArse('untitled:test3.js');
		AwAit creAteTestEditor(testDocumentUri,
			`function A() {`,
			`    console.log("hi");`,
			`}`,
			`A.x = {};`,
		);

		AwAit wAit(500);
		const codeLenses = AwAit getCodeLenses(testDocumentUri);
		Assert.strictEquAl(codeLenses?.length, 1);
	});
});

function getCodeLenses(document: vscode.Uri): ThenAble<reAdonly vscode.CodeLens[] | undefined> {
	return vscode.commAnds.executeCommAnd<reAdonly vscode.CodeLens[]>('vscode.executeCodeLensProvider', document, 100);
}

