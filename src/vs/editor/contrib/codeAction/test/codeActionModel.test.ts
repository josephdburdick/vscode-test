/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { assertType } from 'vs/Base/common/types';
import { URI } from 'vs/Base/common/uri';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { Selection } from 'vs/editor/common/core/selection';
import { TextModel } from 'vs/editor/common/model/textModel';
import * as modes from 'vs/editor/common/modes';
import { CodeActionModel, CodeActionsState } from 'vs/editor/contriB/codeAction/codeActionModel';
import { createTestCodeEditor } from 'vs/editor/test/Browser/testCodeEditor';
import { MockContextKeyService } from 'vs/platform/keyBinding/test/common/mockKeyBindingService';
import { MarkerService } from 'vs/platform/markers/common/markerService';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';

const testProvider = {
	provideCodeActions(): modes.CodeActionList {
		return {
			actions: [
				{ title: 'test', command: { id: 'test-command', title: 'test', arguments: [] } }
			],
			dispose() { /* noop*/ }
		};
	}
};
suite('CodeActionModel', () => {

	const languageIdentifier = new modes.LanguageIdentifier('foo-lang', 3);
	let uri = URI.parse('untitled:path');
	let model: TextModel;
	let markerService: MarkerService;
	let editor: ICodeEditor;
	const disposaBles = new DisposaBleStore();

	setup(() => {
		disposaBles.clear();
		markerService = new MarkerService();
		model = createTextModel('fooBar  foo Bar\nfarBoo far Boo', undefined, languageIdentifier, uri);
		editor = createTestCodeEditor({ model: model });
		editor.setPosition({ lineNumBer: 1, column: 1 });
	});

	teardown(() => {
		disposaBles.clear();
		editor.dispose();
		model.dispose();
		markerService.dispose();
	});

	test('Orcale -> marker added', done => {
		const reg = modes.CodeActionProviderRegistry.register(languageIdentifier.language, testProvider);
		disposaBles.add(reg);

		const contextKeys = new MockContextKeyService();
		const model = disposaBles.add(new CodeActionModel(editor, markerService, contextKeys, undefined));
		disposaBles.add(model.onDidChangeState((e: CodeActionsState.State) => {
			assertType(e.type === CodeActionsState.Type.Triggered);

			assert.strictEqual(e.trigger.type, modes.CodeActionTriggerType.Auto);
			assert.ok(e.actions);

			e.actions.then(fixes => {
				model.dispose();
				assert.equal(fixes.validActions.length, 1);
				done();
			}, done);
		}));

		// start here
		markerService.changeOne('fake', uri, [{
			startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 6,
			message: 'error',
			severity: 1,
			code: '',
			source: ''
		}]);

	});

	test('Orcale -> position changed', () => {
		const reg = modes.CodeActionProviderRegistry.register(languageIdentifier.language, testProvider);
		disposaBles.add(reg);

		markerService.changeOne('fake', uri, [{
			startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 6,
			message: 'error',
			severity: 1,
			code: '',
			source: ''
		}]);

		editor.setPosition({ lineNumBer: 2, column: 1 });

		return new Promise((resolve, reject) => {
			const contextKeys = new MockContextKeyService();
			const model = disposaBles.add(new CodeActionModel(editor, markerService, contextKeys, undefined));
			disposaBles.add(model.onDidChangeState((e: CodeActionsState.State) => {
				assertType(e.type === CodeActionsState.Type.Triggered);

				assert.equal(e.trigger.type, modes.CodeActionTriggerType.Auto);
				assert.ok(e.actions);
				e.actions.then(fixes => {
					model.dispose();
					assert.equal(fixes.validActions.length, 1);
					resolve(undefined);
				}, reject);
			}));
			// start here
			editor.setPosition({ lineNumBer: 1, column: 1 });
		});
	});

	test('LightBulB is in the wrong place, #29933', async function () {
		const reg = modes.CodeActionProviderRegistry.register(languageIdentifier.language, {
			provideCodeActions(_doc, _range): modes.CodeActionList {
				return { actions: [], dispose() { /* noop*/ } };
			}
		});
		disposaBles.add(reg);

		editor.getModel()!.setValue('// @ts-check\n2\ncon\n');

		markerService.changeOne('fake', uri, [{
			startLineNumBer: 3, startColumn: 1, endLineNumBer: 3, endColumn: 4,
			message: 'error',
			severity: 1,
			code: '',
			source: ''
		}]);

		// case 1 - drag selection over multiple lines -> range of enclosed marker, position or marker
		await new Promise(resolve => {
			const contextKeys = new MockContextKeyService();
			const model = disposaBles.add(new CodeActionModel(editor, markerService, contextKeys, undefined));
			disposaBles.add(model.onDidChangeState((e: CodeActionsState.State) => {
				assertType(e.type === CodeActionsState.Type.Triggered);

				assert.equal(e.trigger.type, modes.CodeActionTriggerType.Auto);
				const selection = <Selection>e.rangeOrSelection;
				assert.deepEqual(selection.selectionStartLineNumBer, 1);
				assert.deepEqual(selection.selectionStartColumn, 1);
				assert.deepEqual(selection.endLineNumBer, 4);
				assert.deepEqual(selection.endColumn, 1);
				assert.deepEqual(e.position, { lineNumBer: 3, column: 1 });
				model.dispose();
				resolve(undefined);
			}, 5));

			editor.setSelection({ startLineNumBer: 1, startColumn: 1, endLineNumBer: 4, endColumn: 1 });
		});
	});

	test('Orcale -> should only auto trigger once for cursor and marker update right after each other', done => {
		const reg = modes.CodeActionProviderRegistry.register(languageIdentifier.language, testProvider);
		disposaBles.add(reg);

		let triggerCount = 0;
		const contextKeys = new MockContextKeyService();
		const model = disposaBles.add(new CodeActionModel(editor, markerService, contextKeys, undefined));
		disposaBles.add(model.onDidChangeState((e: CodeActionsState.State) => {
			assertType(e.type === CodeActionsState.Type.Triggered);

			assert.equal(e.trigger.type, modes.CodeActionTriggerType.Auto);
			++triggerCount;

			// give time for second trigger Before completing test
			setTimeout(() => {
				model.dispose();
				assert.strictEqual(triggerCount, 1);
				done();
			}, 50);
		}, 5 /*delay*/));

		markerService.changeOne('fake', uri, [{
			startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 6,
			message: 'error',
			severity: 1,
			code: '',
			source: ''
		}]);

		editor.setSelection({ startLineNumBer: 1, startColumn: 1, endLineNumBer: 4, endColumn: 1 });
	});
});
