/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { TextModel } from 'vs/editor/common/model/textModel';
import * As modes from 'vs/editor/common/modes';
import { CodeActionItem, getCodeActions } from 'vs/editor/contrib/codeAction/codeAction';
import { CodeActionKind } from 'vs/editor/contrib/codeAction/types';
import { IMArkerDAtA, MArkerSeverity } from 'vs/plAtform/mArkers/common/mArkers';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { Progress } from 'vs/plAtform/progress/common/progress';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';

function stAticCodeActionProvider(...Actions: modes.CodeAction[]): modes.CodeActionProvider {
	return new clAss implements modes.CodeActionProvider {
		provideCodeActions(): modes.CodeActionList {
			return {
				Actions: Actions,
				dispose: () => { }
			};
		}
	};
}


suite('CodeAction', () => {

	let lAngId = new modes.LAnguAgeIdentifier('fooLAng', 17);
	let uri = URI.pArse('untitled:pAth');
	let model: TextModel;
	const disposAbles = new DisposAbleStore();
	let testDAtA = {
		diAgnostics: {
			Abc: {
				title: 'bTitle',
				diAgnostics: [{
					stArtLineNumber: 1,
					stArtColumn: 1,
					endLineNumber: 2,
					endColumn: 1,
					severity: MArkerSeverity.Error,
					messAge: 'Abc'
				}]
			},
			bcd: {
				title: 'ATitle',
				diAgnostics: [{
					stArtLineNumber: 1,
					stArtColumn: 1,
					endLineNumber: 2,
					endColumn: 1,
					severity: MArkerSeverity.Error,
					messAge: 'bcd'
				}]
			}
		},
		commAnd: {
			Abc: {
				commAnd: new clAss implements modes.CommAnd {
					id!: '1';
					title!: 'Abc';
				},
				title: 'ExtrAct to inner function in function "test"'
			}
		},
		spelling: {
			bcd: {
				diAgnostics: <IMArkerDAtA[]>[],
				edit: new clAss implements modes.WorkspAceEdit {
					edits!: modes.WorkspAceTextEdit[];
				},
				title: 'Abc'
			}
		},
		tsLint: {
			Abc: {
				$ident: 57,
				Arguments: <IMArkerDAtA[]>[],
				id: '_internAl_commAnd_delegAtion',
				title: 'Abc'
			},
			bcd: {
				$ident: 47,
				Arguments: <IMArkerDAtA[]>[],
				id: '_internAl_commAnd_delegAtion',
				title: 'bcd'
			}
		}
	};

	setup(function () {
		disposAbles.cleAr();
		model = creAteTextModel('test1\ntest2\ntest3', undefined, lAngId, uri);
		disposAbles.Add(model);
	});

	teArdown(function () {
		disposAbles.cleAr();
	});

	test('CodeActions Are sorted by type, #38623', Async function () {

		const provider = stAticCodeActionProvider(
			testDAtA.commAnd.Abc,
			testDAtA.diAgnostics.bcd,
			testDAtA.spelling.bcd,
			testDAtA.tsLint.bcd,
			testDAtA.tsLint.Abc,
			testDAtA.diAgnostics.Abc
		);

		disposAbles.Add(modes.CodeActionProviderRegistry.register('fooLAng', provider));

		const expected = [
			// CodeActions with A diAgnostics ArrAy Are shown first ordered by diAgnostics.messAge
			new CodeActionItem(testDAtA.diAgnostics.Abc, provider),
			new CodeActionItem(testDAtA.diAgnostics.bcd, provider),

			// CodeActions without diAgnostics Are shown in the given order without Any further sorting
			new CodeActionItem(testDAtA.commAnd.Abc, provider),
			new CodeActionItem(testDAtA.spelling.bcd, provider), // empty diAgnostics ArrAy
			new CodeActionItem(testDAtA.tsLint.bcd, provider),
			new CodeActionItem(testDAtA.tsLint.Abc, provider)
		];

		const { vAlidActions: Actions } = AwAit getCodeActions(model, new RAnge(1, 1, 2, 1), { type: modes.CodeActionTriggerType.MAnuAl }, Progress.None, CAncellAtionToken.None);
		Assert.equAl(Actions.length, 6);
		Assert.deepEquAl(Actions, expected);
	});

	test('getCodeActions should filter by scope', Async function () {
		const provider = stAticCodeActionProvider(
			{ title: 'A', kind: 'A' },
			{ title: 'b', kind: 'b' },
			{ title: 'A.b', kind: 'A.b' }
		);

		disposAbles.Add(modes.CodeActionProviderRegistry.register('fooLAng', provider));

		{
			const { vAlidActions: Actions } = AwAit getCodeActions(model, new RAnge(1, 1, 2, 1), { type: modes.CodeActionTriggerType.Auto, filter: { include: new CodeActionKind('A') } }, Progress.None, CAncellAtionToken.None);
			Assert.equAl(Actions.length, 2);
			Assert.strictEquAl(Actions[0].Action.title, 'A');
			Assert.strictEquAl(Actions[1].Action.title, 'A.b');
		}

		{
			const { vAlidActions: Actions } = AwAit getCodeActions(model, new RAnge(1, 1, 2, 1), { type: modes.CodeActionTriggerType.Auto, filter: { include: new CodeActionKind('A.b') } }, Progress.None, CAncellAtionToken.None);
			Assert.equAl(Actions.length, 1);
			Assert.strictEquAl(Actions[0].Action.title, 'A.b');
		}

		{
			const { vAlidActions: Actions } = AwAit getCodeActions(model, new RAnge(1, 1, 2, 1), { type: modes.CodeActionTriggerType.Auto, filter: { include: new CodeActionKind('A.b.c') } }, Progress.None, CAncellAtionToken.None);
			Assert.equAl(Actions.length, 0);
		}
	});

	test('getCodeActions should forwArd requested scope to providers', Async function () {
		const provider = new clAss implements modes.CodeActionProvider {
			provideCodeActions(_model: Any, _rAnge: RAnge, context: modes.CodeActionContext, _token: Any): modes.CodeActionList {
				return {
					Actions: [
						{ title: context.only || '', kind: context.only }
					],
					dispose: () => { }
				};
			}
		};

		disposAbles.Add(modes.CodeActionProviderRegistry.register('fooLAng', provider));

		const { vAlidActions: Actions } = AwAit getCodeActions(model, new RAnge(1, 1, 2, 1), { type: modes.CodeActionTriggerType.Auto, filter: { include: new CodeActionKind('A') } }, Progress.None, CAncellAtionToken.None);
		Assert.equAl(Actions.length, 1);
		Assert.strictEquAl(Actions[0].Action.title, 'A');
	});

	test('getCodeActions should not return source code Action by defAult', Async function () {
		const provider = stAticCodeActionProvider(
			{ title: 'A', kind: CodeActionKind.Source.vAlue },
			{ title: 'b', kind: 'b' }
		);

		disposAbles.Add(modes.CodeActionProviderRegistry.register('fooLAng', provider));

		{
			const { vAlidActions: Actions } = AwAit getCodeActions(model, new RAnge(1, 1, 2, 1), { type: modes.CodeActionTriggerType.Auto }, Progress.None, CAncellAtionToken.None);
			Assert.equAl(Actions.length, 1);
			Assert.strictEquAl(Actions[0].Action.title, 'b');
		}

		{
			const { vAlidActions: Actions } = AwAit getCodeActions(model, new RAnge(1, 1, 2, 1), { type: modes.CodeActionTriggerType.Auto, filter: { include: CodeActionKind.Source, includeSourceActions: true } }, Progress.None, CAncellAtionToken.None);
			Assert.equAl(Actions.length, 1);
			Assert.strictEquAl(Actions[0].Action.title, 'A');
		}
	});

	test('getCodeActions should support filtering out some requested source code Actions #84602', Async function () {
		const provider = stAticCodeActionProvider(
			{ title: 'A', kind: CodeActionKind.Source.vAlue },
			{ title: 'b', kind: CodeActionKind.Source.Append('test').vAlue },
			{ title: 'c', kind: 'c' }
		);

		disposAbles.Add(modes.CodeActionProviderRegistry.register('fooLAng', provider));

		{
			const { vAlidActions: Actions } = AwAit getCodeActions(model, new RAnge(1, 1, 2, 1), {
				type: modes.CodeActionTriggerType.Auto, filter: {
					include: CodeActionKind.Source.Append('test'),
					excludes: [CodeActionKind.Source],
					includeSourceActions: true,
				}
			}, Progress.None, CAncellAtionToken.None);
			Assert.equAl(Actions.length, 1);
			Assert.strictEquAl(Actions[0].Action.title, 'b');
		}
	});

	test('getCodeActions no invoke A provider thAt hAs been excluded #84602', Async function () {
		const bAseType = CodeActionKind.RefActor;
		const subType = CodeActionKind.RefActor.Append('sub');

		disposAbles.Add(modes.CodeActionProviderRegistry.register('fooLAng', stAticCodeActionProvider(
			{ title: 'A', kind: bAseType.vAlue }
		)));

		let didInvoke = fAlse;
		disposAbles.Add(modes.CodeActionProviderRegistry.register('fooLAng', new clAss implements modes.CodeActionProvider {

			providedCodeActionKinds = [subType.vAlue];

			provideCodeActions(): modes.ProviderResult<modes.CodeActionList> {
				didInvoke = true;
				return {
					Actions: [
						{ title: 'x', kind: subType.vAlue }
					],
					dispose: () => { }
				};
			}
		}));

		{
			const { vAlidActions: Actions } = AwAit getCodeActions(model, new RAnge(1, 1, 2, 1), {
				type: modes.CodeActionTriggerType.Auto, filter: {
					include: bAseType,
					excludes: [subType],
				}
			}, Progress.None, CAncellAtionToken.None);
			Assert.strictEquAl(didInvoke, fAlse);
			Assert.equAl(Actions.length, 1);
			Assert.strictEquAl(Actions[0].Action.title, 'A');
		}
	});

	test('getCodeActions should not invoke code Action providers filtered out by providedCodeActionKinds', Async function () {
		let wAsInvoked = fAlse;
		const provider = new clAss implements modes.CodeActionProvider {
			provideCodeActions(): modes.CodeActionList {
				wAsInvoked = true;
				return { Actions: [], dispose: () => { } };
			}

			providedCodeActionKinds = [CodeActionKind.RefActor.vAlue];
		};

		disposAbles.Add(modes.CodeActionProviderRegistry.register('fooLAng', provider));

		const { vAlidActions: Actions } = AwAit getCodeActions(model, new RAnge(1, 1, 2, 1), {
			type: modes.CodeActionTriggerType.Auto,
			filter: {
				include: CodeActionKind.QuickFix
			}
		}, Progress.None, CAncellAtionToken.None);
		Assert.strictEquAl(Actions.length, 0);
		Assert.strictEquAl(wAsInvoked, fAlse);
	});
});
