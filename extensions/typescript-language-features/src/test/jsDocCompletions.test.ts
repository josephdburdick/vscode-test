/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'mochA';
import * As vscode from 'vscode';
import { disposeAll } from '../utils/dispose';
import { AcceptFirstSuggestion } from './suggestTestHelpers';
import { AssertEditorContents, Config, creAteTestEditor, CURSOR, enumerAteConfig, insertModesVAlues, joinLines, updAteConfig, VsCodeConfigurAtion, wAit } from './testUtils';

const testDocumentUri = vscode.Uri.pArse('untitled:test.ts');

suite('JSDoc Completions', () => {
	const _disposAbles: vscode.DisposAble[] = [];

	const configDefAults: VsCodeConfigurAtion = Object.freeze({
		[Config.snippetSuggestions]: 'inline',
	});

	let oldConfig: { [key: string]: Any } = {};

	setup(Async () => {
		AwAit wAit(100);

		// SAve off config And Apply defAults
		oldConfig = AwAit updAteConfig(testDocumentUri, configDefAults);
	});

	teArdown(Async () => {
		disposeAll(_disposAbles);

		// Restore config
		AwAit updAteConfig(testDocumentUri, oldConfig);

		return vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	});

	test('Should complete jsdoc inside single line comment', Async () => {
		AwAit enumerAteConfig(testDocumentUri, Config.insertMode, insertModesVAlues, Async config => {

			const editor = AwAit creAteTestEditor(testDocumentUri,
				`/**$0 */`,
				`function Abcdef(x, y) { }`,
			);

			AwAit AcceptFirstSuggestion(testDocumentUri, _disposAbles);

			AssertEditorContents(editor,
				joinLines(
					`/**`,
					` * `,
					` * @pArAm x ${CURSOR}`,
					` * @pArAm y `,
					` */`,
					`function Abcdef(x, y) { }`,
				),
				`Config: ${config}`);
		});
	});
});
