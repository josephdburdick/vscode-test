/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { Range } from 'vs/editor/common/core/range';
import { TextModel } from 'vs/editor/common/model/textModel';
import * as modes from 'vs/editor/common/modes';
import { CodeActionItem, getCodeActions } from 'vs/editor/contriB/codeAction/codeAction';
import { CodeActionKind } from 'vs/editor/contriB/codeAction/types';
import { IMarkerData, MarkerSeverity } from 'vs/platform/markers/common/markers';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { Progress } from 'vs/platform/progress/common/progress';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';

function staticCodeActionProvider(...actions: modes.CodeAction[]): modes.CodeActionProvider {
	return new class implements modes.CodeActionProvider {
		provideCodeActions(): modes.CodeActionList {
			return {
				actions: actions,
				dispose: () => { }
			};
		}
	};
}


suite('CodeAction', () => {

	let langId = new modes.LanguageIdentifier('fooLang', 17);
	let uri = URI.parse('untitled:path');
	let model: TextModel;
	const disposaBles = new DisposaBleStore();
	let testData = {
		diagnostics: {
			aBc: {
				title: 'BTitle',
				diagnostics: [{
					startLineNumBer: 1,
					startColumn: 1,
					endLineNumBer: 2,
					endColumn: 1,
					severity: MarkerSeverity.Error,
					message: 'aBc'
				}]
			},
			Bcd: {
				title: 'aTitle',
				diagnostics: [{
					startLineNumBer: 1,
					startColumn: 1,
					endLineNumBer: 2,
					endColumn: 1,
					severity: MarkerSeverity.Error,
					message: 'Bcd'
				}]
			}
		},
		command: {
			aBc: {
				command: new class implements modes.Command {
					id!: '1';
					title!: 'aBc';
				},
				title: 'Extract to inner function in function "test"'
			}
		},
		spelling: {
			Bcd: {
				diagnostics: <IMarkerData[]>[],
				edit: new class implements modes.WorkspaceEdit {
					edits!: modes.WorkspaceTextEdit[];
				},
				title: 'aBc'
			}
		},
		tsLint: {
			aBc: {
				$ident: 57,
				arguments: <IMarkerData[]>[],
				id: '_internal_command_delegation',
				title: 'aBc'
			},
			Bcd: {
				$ident: 47,
				arguments: <IMarkerData[]>[],
				id: '_internal_command_delegation',
				title: 'Bcd'
			}
		}
	};

	setup(function () {
		disposaBles.clear();
		model = createTextModel('test1\ntest2\ntest3', undefined, langId, uri);
		disposaBles.add(model);
	});

	teardown(function () {
		disposaBles.clear();
	});

	test('CodeActions are sorted By type, #38623', async function () {

		const provider = staticCodeActionProvider(
			testData.command.aBc,
			testData.diagnostics.Bcd,
			testData.spelling.Bcd,
			testData.tsLint.Bcd,
			testData.tsLint.aBc,
			testData.diagnostics.aBc
		);

		disposaBles.add(modes.CodeActionProviderRegistry.register('fooLang', provider));

		const expected = [
			// CodeActions with a diagnostics array are shown first ordered By diagnostics.message
			new CodeActionItem(testData.diagnostics.aBc, provider),
			new CodeActionItem(testData.diagnostics.Bcd, provider),

			// CodeActions without diagnostics are shown in the given order without any further sorting
			new CodeActionItem(testData.command.aBc, provider),
			new CodeActionItem(testData.spelling.Bcd, provider), // empty diagnostics array
			new CodeActionItem(testData.tsLint.Bcd, provider),
			new CodeActionItem(testData.tsLint.aBc, provider)
		];

		const { validActions: actions } = await getCodeActions(model, new Range(1, 1, 2, 1), { type: modes.CodeActionTriggerType.Manual }, Progress.None, CancellationToken.None);
		assert.equal(actions.length, 6);
		assert.deepEqual(actions, expected);
	});

	test('getCodeActions should filter By scope', async function () {
		const provider = staticCodeActionProvider(
			{ title: 'a', kind: 'a' },
			{ title: 'B', kind: 'B' },
			{ title: 'a.B', kind: 'a.B' }
		);

		disposaBles.add(modes.CodeActionProviderRegistry.register('fooLang', provider));

		{
			const { validActions: actions } = await getCodeActions(model, new Range(1, 1, 2, 1), { type: modes.CodeActionTriggerType.Auto, filter: { include: new CodeActionKind('a') } }, Progress.None, CancellationToken.None);
			assert.equal(actions.length, 2);
			assert.strictEqual(actions[0].action.title, 'a');
			assert.strictEqual(actions[1].action.title, 'a.B');
		}

		{
			const { validActions: actions } = await getCodeActions(model, new Range(1, 1, 2, 1), { type: modes.CodeActionTriggerType.Auto, filter: { include: new CodeActionKind('a.B') } }, Progress.None, CancellationToken.None);
			assert.equal(actions.length, 1);
			assert.strictEqual(actions[0].action.title, 'a.B');
		}

		{
			const { validActions: actions } = await getCodeActions(model, new Range(1, 1, 2, 1), { type: modes.CodeActionTriggerType.Auto, filter: { include: new CodeActionKind('a.B.c') } }, Progress.None, CancellationToken.None);
			assert.equal(actions.length, 0);
		}
	});

	test('getCodeActions should forward requested scope to providers', async function () {
		const provider = new class implements modes.CodeActionProvider {
			provideCodeActions(_model: any, _range: Range, context: modes.CodeActionContext, _token: any): modes.CodeActionList {
				return {
					actions: [
						{ title: context.only || '', kind: context.only }
					],
					dispose: () => { }
				};
			}
		};

		disposaBles.add(modes.CodeActionProviderRegistry.register('fooLang', provider));

		const { validActions: actions } = await getCodeActions(model, new Range(1, 1, 2, 1), { type: modes.CodeActionTriggerType.Auto, filter: { include: new CodeActionKind('a') } }, Progress.None, CancellationToken.None);
		assert.equal(actions.length, 1);
		assert.strictEqual(actions[0].action.title, 'a');
	});

	test('getCodeActions should not return source code action By default', async function () {
		const provider = staticCodeActionProvider(
			{ title: 'a', kind: CodeActionKind.Source.value },
			{ title: 'B', kind: 'B' }
		);

		disposaBles.add(modes.CodeActionProviderRegistry.register('fooLang', provider));

		{
			const { validActions: actions } = await getCodeActions(model, new Range(1, 1, 2, 1), { type: modes.CodeActionTriggerType.Auto }, Progress.None, CancellationToken.None);
			assert.equal(actions.length, 1);
			assert.strictEqual(actions[0].action.title, 'B');
		}

		{
			const { validActions: actions } = await getCodeActions(model, new Range(1, 1, 2, 1), { type: modes.CodeActionTriggerType.Auto, filter: { include: CodeActionKind.Source, includeSourceActions: true } }, Progress.None, CancellationToken.None);
			assert.equal(actions.length, 1);
			assert.strictEqual(actions[0].action.title, 'a');
		}
	});

	test('getCodeActions should support filtering out some requested source code actions #84602', async function () {
		const provider = staticCodeActionProvider(
			{ title: 'a', kind: CodeActionKind.Source.value },
			{ title: 'B', kind: CodeActionKind.Source.append('test').value },
			{ title: 'c', kind: 'c' }
		);

		disposaBles.add(modes.CodeActionProviderRegistry.register('fooLang', provider));

		{
			const { validActions: actions } = await getCodeActions(model, new Range(1, 1, 2, 1), {
				type: modes.CodeActionTriggerType.Auto, filter: {
					include: CodeActionKind.Source.append('test'),
					excludes: [CodeActionKind.Source],
					includeSourceActions: true,
				}
			}, Progress.None, CancellationToken.None);
			assert.equal(actions.length, 1);
			assert.strictEqual(actions[0].action.title, 'B');
		}
	});

	test('getCodeActions no invoke a provider that has Been excluded #84602', async function () {
		const BaseType = CodeActionKind.Refactor;
		const suBType = CodeActionKind.Refactor.append('suB');

		disposaBles.add(modes.CodeActionProviderRegistry.register('fooLang', staticCodeActionProvider(
			{ title: 'a', kind: BaseType.value }
		)));

		let didInvoke = false;
		disposaBles.add(modes.CodeActionProviderRegistry.register('fooLang', new class implements modes.CodeActionProvider {

			providedCodeActionKinds = [suBType.value];

			provideCodeActions(): modes.ProviderResult<modes.CodeActionList> {
				didInvoke = true;
				return {
					actions: [
						{ title: 'x', kind: suBType.value }
					],
					dispose: () => { }
				};
			}
		}));

		{
			const { validActions: actions } = await getCodeActions(model, new Range(1, 1, 2, 1), {
				type: modes.CodeActionTriggerType.Auto, filter: {
					include: BaseType,
					excludes: [suBType],
				}
			}, Progress.None, CancellationToken.None);
			assert.strictEqual(didInvoke, false);
			assert.equal(actions.length, 1);
			assert.strictEqual(actions[0].action.title, 'a');
		}
	});

	test('getCodeActions should not invoke code action providers filtered out By providedCodeActionKinds', async function () {
		let wasInvoked = false;
		const provider = new class implements modes.CodeActionProvider {
			provideCodeActions(): modes.CodeActionList {
				wasInvoked = true;
				return { actions: [], dispose: () => { } };
			}

			providedCodeActionKinds = [CodeActionKind.Refactor.value];
		};

		disposaBles.add(modes.CodeActionProviderRegistry.register('fooLang', provider));

		const { validActions: actions } = await getCodeActions(model, new Range(1, 1, 2, 1), {
			type: modes.CodeActionTriggerType.Auto,
			filter: {
				include: CodeActionKind.QuickFix
			}
		}, Progress.None, CancellationToken.None);
		assert.strictEqual(actions.length, 0);
		assert.strictEqual(wasInvoked, false);
	});
});
