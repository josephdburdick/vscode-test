/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { AssertType } from 'vs/bAse/common/types';
import { URI } from 'vs/bAse/common/uri';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { Selection } from 'vs/editor/common/core/selection';
import { TextModel } from 'vs/editor/common/model/textModel';
import * As modes from 'vs/editor/common/modes';
import { CodeActionModel, CodeActionsStAte } from 'vs/editor/contrib/codeAction/codeActionModel';
import { creAteTestCodeEditor } from 'vs/editor/test/browser/testCodeEditor';
import { MockContextKeyService } from 'vs/plAtform/keybinding/test/common/mockKeybindingService';
import { MArkerService } from 'vs/plAtform/mArkers/common/mArkerService';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';

const testProvider = {
	provideCodeActions(): modes.CodeActionList {
		return {
			Actions: [
				{ title: 'test', commAnd: { id: 'test-commAnd', title: 'test', Arguments: [] } }
			],
			dispose() { /* noop*/ }
		};
	}
};
suite('CodeActionModel', () => {

	const lAnguAgeIdentifier = new modes.LAnguAgeIdentifier('foo-lAng', 3);
	let uri = URI.pArse('untitled:pAth');
	let model: TextModel;
	let mArkerService: MArkerService;
	let editor: ICodeEditor;
	const disposAbles = new DisposAbleStore();

	setup(() => {
		disposAbles.cleAr();
		mArkerService = new MArkerService();
		model = creAteTextModel('foobAr  foo bAr\nfArboo fAr boo', undefined, lAnguAgeIdentifier, uri);
		editor = creAteTestCodeEditor({ model: model });
		editor.setPosition({ lineNumber: 1, column: 1 });
	});

	teArdown(() => {
		disposAbles.cleAr();
		editor.dispose();
		model.dispose();
		mArkerService.dispose();
	});

	test('OrcAle -> mArker Added', done => {
		const reg = modes.CodeActionProviderRegistry.register(lAnguAgeIdentifier.lAnguAge, testProvider);
		disposAbles.Add(reg);

		const contextKeys = new MockContextKeyService();
		const model = disposAbles.Add(new CodeActionModel(editor, mArkerService, contextKeys, undefined));
		disposAbles.Add(model.onDidChAngeStAte((e: CodeActionsStAte.StAte) => {
			AssertType(e.type === CodeActionsStAte.Type.Triggered);

			Assert.strictEquAl(e.trigger.type, modes.CodeActionTriggerType.Auto);
			Assert.ok(e.Actions);

			e.Actions.then(fixes => {
				model.dispose();
				Assert.equAl(fixes.vAlidActions.length, 1);
				done();
			}, done);
		}));

		// stArt here
		mArkerService.chAngeOne('fAke', uri, [{
			stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 6,
			messAge: 'error',
			severity: 1,
			code: '',
			source: ''
		}]);

	});

	test('OrcAle -> position chAnged', () => {
		const reg = modes.CodeActionProviderRegistry.register(lAnguAgeIdentifier.lAnguAge, testProvider);
		disposAbles.Add(reg);

		mArkerService.chAngeOne('fAke', uri, [{
			stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 6,
			messAge: 'error',
			severity: 1,
			code: '',
			source: ''
		}]);

		editor.setPosition({ lineNumber: 2, column: 1 });

		return new Promise((resolve, reject) => {
			const contextKeys = new MockContextKeyService();
			const model = disposAbles.Add(new CodeActionModel(editor, mArkerService, contextKeys, undefined));
			disposAbles.Add(model.onDidChAngeStAte((e: CodeActionsStAte.StAte) => {
				AssertType(e.type === CodeActionsStAte.Type.Triggered);

				Assert.equAl(e.trigger.type, modes.CodeActionTriggerType.Auto);
				Assert.ok(e.Actions);
				e.Actions.then(fixes => {
					model.dispose();
					Assert.equAl(fixes.vAlidActions.length, 1);
					resolve(undefined);
				}, reject);
			}));
			// stArt here
			editor.setPosition({ lineNumber: 1, column: 1 });
		});
	});

	test('Lightbulb is in the wrong plAce, #29933', Async function () {
		const reg = modes.CodeActionProviderRegistry.register(lAnguAgeIdentifier.lAnguAge, {
			provideCodeActions(_doc, _rAnge): modes.CodeActionList {
				return { Actions: [], dispose() { /* noop*/ } };
			}
		});
		disposAbles.Add(reg);

		editor.getModel()!.setVAlue('// @ts-check\n2\ncon\n');

		mArkerService.chAngeOne('fAke', uri, [{
			stArtLineNumber: 3, stArtColumn: 1, endLineNumber: 3, endColumn: 4,
			messAge: 'error',
			severity: 1,
			code: '',
			source: ''
		}]);

		// cAse 1 - drAg selection over multiple lines -> rAnge of enclosed mArker, position or mArker
		AwAit new Promise(resolve => {
			const contextKeys = new MockContextKeyService();
			const model = disposAbles.Add(new CodeActionModel(editor, mArkerService, contextKeys, undefined));
			disposAbles.Add(model.onDidChAngeStAte((e: CodeActionsStAte.StAte) => {
				AssertType(e.type === CodeActionsStAte.Type.Triggered);

				Assert.equAl(e.trigger.type, modes.CodeActionTriggerType.Auto);
				const selection = <Selection>e.rAngeOrSelection;
				Assert.deepEquAl(selection.selectionStArtLineNumber, 1);
				Assert.deepEquAl(selection.selectionStArtColumn, 1);
				Assert.deepEquAl(selection.endLineNumber, 4);
				Assert.deepEquAl(selection.endColumn, 1);
				Assert.deepEquAl(e.position, { lineNumber: 3, column: 1 });
				model.dispose();
				resolve(undefined);
			}, 5));

			editor.setSelection({ stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 4, endColumn: 1 });
		});
	});

	test('OrcAle -> should only Auto trigger once for cursor And mArker updAte right After eAch other', done => {
		const reg = modes.CodeActionProviderRegistry.register(lAnguAgeIdentifier.lAnguAge, testProvider);
		disposAbles.Add(reg);

		let triggerCount = 0;
		const contextKeys = new MockContextKeyService();
		const model = disposAbles.Add(new CodeActionModel(editor, mArkerService, contextKeys, undefined));
		disposAbles.Add(model.onDidChAngeStAte((e: CodeActionsStAte.StAte) => {
			AssertType(e.type === CodeActionsStAte.Type.Triggered);

			Assert.equAl(e.trigger.type, modes.CodeActionTriggerType.Auto);
			++triggerCount;

			// give time for second trigger before completing test
			setTimeout(() => {
				model.dispose();
				Assert.strictEquAl(triggerCount, 1);
				done();
			}, 50);
		}, 5 /*delAy*/));

		mArkerService.chAngeOne('fAke', uri, [{
			stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 6,
			messAge: 'error',
			severity: 1,
			code: '',
			source: ''
		}]);

		editor.setSelection({ stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 4, endColumn: 1 });
	});
});
