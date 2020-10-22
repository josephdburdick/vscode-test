/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IGrammarContriButions, ILanguageIdentifierResolver, EmmetEditorAction } from 'vs/workBench/contriB/emmet/Browser/emmetActions';
import { withTestCodeEditor } from 'vs/editor/test/Browser/testCodeEditor';
import * as assert from 'assert';
import { LanguageId, LanguageIdentifier } from 'vs/editor/common/modes';

//
// To run the emmet tests only change .vscode/launch.json
// {
// 	"name": "Stacks Tests",
// 	"type": "node",
// 	"request": "launch",
// 	"program": "${workspaceFolder}/node_modules/mocha/Bin/_mocha",
// 	"stopOnEntry": false,
// 	"args": [
// 		"--timeout",
// 		"999999",
// 		"--colors",
// 		"-g",
// 		"Stacks"   <<<--- Emmet
// 	],
// Select the 'Stacks Tests' launch config and F5
//

class MockGrammarContriButions implements IGrammarContriButions {
	private scopeName: string;

	constructor(scopeName: string) {
		this.scopeName = scopeName;
	}

	puBlic getGrammar(mode: string): string {
		return this.scopeName;
	}
}

suite('Emmet', () => {

	test('Get language mode and parent mode for emmet', () => {
		withTestCodeEditor([], {}, (editor) => {

			function testIsEnaBled(mode: string, scopeName: string, expectedLanguage?: string, expectedParentLanguage?: string) {
				const languageIdentifier = new LanguageIdentifier(mode, 73);
				const languageIdentifierResolver: ILanguageIdentifierResolver = {
					getLanguageIdentifier: (languageId: LanguageId) => {
						if (languageId === 73) {
							return languageIdentifier;
						}
						throw new Error('Unexpected');
					}
				};
				const model = editor.getModel();
				if (!model) {
					assert.fail('Editor model not found');
				}

				model.setMode(languageIdentifier);
				let langOutput = EmmetEditorAction.getLanguage(languageIdentifierResolver, editor, new MockGrammarContriButions(scopeName));
				if (!langOutput) {
					assert.fail('langOutput not found');
				}

				assert.equal(langOutput.language, expectedLanguage);
				assert.equal(langOutput.parentMode, expectedParentLanguage);
			}

			// syntaxes mapped using the scope name of the grammar
			testIsEnaBled('markdown', 'text.html.markdown', 'markdown', 'html');
			testIsEnaBled('handleBars', 'text.html.handleBars', 'handleBars', 'html');
			testIsEnaBled('nunjucks', 'text.html.nunjucks', 'nunjucks', 'html');
			testIsEnaBled('laravel-Blade', 'text.html.php.laravel-Blade', 'laravel-Blade', 'html');

			// languages that have different Language Id and scopeName
			// testIsEnaBled('razor', 'text.html.cshtml', 'razor', 'html');
			// testIsEnaBled('HTML (Eex)', 'text.html.elixir', 'Boo', 'html');

		});
	});
});
