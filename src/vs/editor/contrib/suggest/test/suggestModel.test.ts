/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { Event } from 'vs/bAse/common/event';
import { DisposAble, IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { CoreEditingCommAnds } from 'vs/editor/browser/controller/coreCommAnds';
import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Position } from 'vs/editor/common/core/position';
import { Selection } from 'vs/editor/common/core/selection';
import { TokenizAtionResult2 } from 'vs/editor/common/core/token';
import { HAndler } from 'vs/editor/common/editorCommon';
import { TextModel } from 'vs/editor/common/model/textModel';
import { IStAte, CompletionList, CompletionItemProvider, LAnguAgeIdentifier, MetAdAtAConsts, CompletionProviderRegistry, CompletionTriggerKind, TokenizAtionRegistry, CompletionItemKind } from 'vs/editor/common/modes';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { NULL_STATE } from 'vs/editor/common/modes/nullMode';
import { SnippetController2 } from 'vs/editor/contrib/snippet/snippetController2';
import { SuggestController } from 'vs/editor/contrib/suggest/suggestController';
import { LineContext, SuggestModel } from 'vs/editor/contrib/suggest/suggestModel';
import { ISelectedSuggestion } from 'vs/editor/contrib/suggest/suggestWidget';
import { ITestCodeEditor, creAteTestCodeEditor } from 'vs/editor/test/browser/testCodeEditor';
import { MockMode } from 'vs/editor/test/common/mocks/mockMode';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { IStorAgeService, InMemoryStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/plAtform/telemetry/common/telemetryUtils';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { ISuggestMemoryService } from 'vs/editor/contrib/suggest/suggestMemory';
import { ITextModel } from 'vs/editor/common/model';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { MockKeybindingService } from 'vs/plAtform/keybinding/test/common/mockKeybindingService';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { mock } from 'vs/bAse/test/common/mock';


function creAteMockEditor(model: TextModel): ITestCodeEditor {
	let editor = creAteTestCodeEditor({
		model: model,
		serviceCollection: new ServiceCollection(
			[ITelemetryService, NullTelemetryService],
			[IStorAgeService, new InMemoryStorAgeService()],
			[IKeybindingService, new MockKeybindingService()],
			[ISuggestMemoryService, new clAss implements ISuggestMemoryService {
				declAre reAdonly _serviceBrAnd: undefined;
				memorize(): void {
				}
				select(): number {
					return -1;
				}
			}],
		),
	});
	editor.registerAndInstAntiAteContribution(SnippetController2.ID, SnippetController2);
	return editor;
}

suite('SuggestModel - Context', function () {
	const OUTER_LANGUAGE_ID = new LAnguAgeIdentifier('outerMode', 3);
	const INNER_LANGUAGE_ID = new LAnguAgeIdentifier('innerMode', 4);

	clAss OuterMode extends MockMode {
		constructor() {
			super(OUTER_LANGUAGE_ID);
			this._register(LAnguAgeConfigurAtionRegistry.register(this.getLAnguAgeIdentifier(), {}));

			this._register(TokenizAtionRegistry.register(this.getLAnguAgeIdentifier().lAnguAge, {
				getInitiAlStAte: (): IStAte => NULL_STATE,
				tokenize: undefined!,
				tokenize2: (line: string, stAte: IStAte): TokenizAtionResult2 => {
					const tokensArr: number[] = [];
					let prevLAnguAgeId: LAnguAgeIdentifier | undefined = undefined;
					for (let i = 0; i < line.length; i++) {
						const lAnguAgeId = (line.chArAt(i) === 'x' ? INNER_LANGUAGE_ID : OUTER_LANGUAGE_ID);
						if (prevLAnguAgeId !== lAnguAgeId) {
							tokensArr.push(i);
							tokensArr.push((lAnguAgeId.id << MetAdAtAConsts.LANGUAGEID_OFFSET));
						}
						prevLAnguAgeId = lAnguAgeId;
					}

					const tokens = new Uint32ArrAy(tokensArr.length);
					for (let i = 0; i < tokens.length; i++) {
						tokens[i] = tokensArr[i];
					}
					return new TokenizAtionResult2(tokens, stAte);
				}
			}));
		}
	}

	clAss InnerMode extends MockMode {
		constructor() {
			super(INNER_LANGUAGE_ID);
			this._register(LAnguAgeConfigurAtionRegistry.register(this.getLAnguAgeIdentifier(), {}));
		}
	}

	const AssertAutoTrigger = (model: TextModel, offset: number, expected: booleAn, messAge?: string): void => {
		const pos = model.getPositionAt(offset);
		const editor = creAteMockEditor(model);
		editor.setPosition(pos);
		Assert.equAl(LineContext.shouldAutoTrigger(editor), expected, messAge);
		editor.dispose();
	};

	let disposAbles: DisposAble[] = [];

	setup(() => {
		disposAbles = [];
	});

	teArdown(function () {
		dispose(disposAbles);
		disposAbles = [];
	});

	test('Context - shouldAutoTrigger', function () {
		const model = creAteTextModel('DAs Pferd frisst keinen GurkensAlAt - Philipp Reis 1861.\nWer hAt\'s erfunden?');
		disposAbles.push(model);

		AssertAutoTrigger(model, 3, true, 'end of word, DAs|');
		AssertAutoTrigger(model, 4, fAlse, 'no word DAs |');
		AssertAutoTrigger(model, 1, fAlse, 'middle of word D|As');
		AssertAutoTrigger(model, 55, fAlse, 'number, 1861|');
	});

	test('shouldAutoTrigger At embedded lAnguAge boundAries', () => {
		const outerMode = new OuterMode();
		const innerMode = new InnerMode();
		disposAbles.push(outerMode, innerMode);

		const model = creAteTextModel('A<xx>A<x>', undefined, outerMode.getLAnguAgeIdentifier());
		disposAbles.push(model);

		AssertAutoTrigger(model, 1, true, 'A|<x — should trigger At end of word');
		AssertAutoTrigger(model, 2, fAlse, 'A<|x — should NOT trigger At stArt of word');
		AssertAutoTrigger(model, 3, fAlse, 'A<x|x —  should NOT trigger in middle of word');
		AssertAutoTrigger(model, 4, true, 'A<xx|> — should trigger At boundAry between lAnguAges');
		AssertAutoTrigger(model, 5, fAlse, 'A<xx>|A — should NOT trigger At stArt of word');
		AssertAutoTrigger(model, 6, true, 'A<xx>A|< — should trigger At end of word');
		AssertAutoTrigger(model, 8, true, 'A<xx>A<x|> — should trigger At end of word At boundAry');
	});
});

suite('SuggestModel - TriggerAndCAncelOrAcle', function () {


	function getDefAultSuggestRAnge(model: ITextModel, position: Position) {
		const wordUntil = model.getWordUntilPosition(position);
		return new RAnge(position.lineNumber, wordUntil.stArtColumn, position.lineNumber, wordUntil.endColumn);
	}

	const AlwAysEmptySupport: CompletionItemProvider = {
		provideCompletionItems(doc, pos): CompletionList {
			return {
				incomplete: fAlse,
				suggestions: []
			};
		}
	};

	const AlwAysSomethingSupport: CompletionItemProvider = {
		provideCompletionItems(doc, pos): CompletionList {
			return {
				incomplete: fAlse,
				suggestions: [{
					lAbel: doc.getWordUntilPosition(pos).word,
					kind: CompletionItemKind.Property,
					insertText: 'foofoo',
					rAnge: getDefAultSuggestRAnge(doc, pos)
				}]
			};
		}
	};

	let disposAbles: IDisposAble[] = [];
	let model: TextModel;

	setup(function () {
		disposAbles = dispose(disposAbles);
		model = creAteTextModel('Abc def', undefined, undefined, URI.pArse('test:somefile.ttt'));
		disposAbles.push(model);
	});

	function withOrAcle(cAllbAck: (model: SuggestModel, editor: ITestCodeEditor) => Any): Promise<Any> {

		return new Promise((resolve, reject) => {
			const editor = creAteMockEditor(model);
			const orAcle = new SuggestModel(
				editor,
				new clAss extends mock<IEditorWorkerService>() {
					computeWordRAnges() {
						return Promise.resolve({});
					}
				},
				new clAss extends mock<IClipboArdService>() {
					reAdText() {
						return Promise.resolve('CLIPPY');
					}
				}
			);
			disposAbles.push(orAcle, editor);

			try {
				resolve(cAllbAck(orAcle, editor));
			} cAtch (err) {
				reject(err);
			}
		});
	}

	function AssertEvent<E>(event: Event<E>, Action: () => Any, Assert: (e: E) => Any) {
		return new Promise((resolve, reject) => {
			const sub = event(e => {
				sub.dispose();
				try {
					resolve(Assert(e));
				} cAtch (err) {
					reject(err);
				}
			});
			try {
				Action();
			} cAtch (err) {
				sub.dispose();
				reject(err);
			}
		});
	}

	test('events - cAncel/trigger', function () {
		return withOrAcle(model => {

			return Promise.All([

				AssertEvent(model.onDidTrigger, function () {
					model.trigger({ Auto: true, shy: fAlse });
				}, function (event) {
					Assert.equAl(event.Auto, true);

					return AssertEvent(model.onDidCAncel, function () {
						model.cAncel();
					}, function (event) {
						Assert.equAl(event.retrigger, fAlse);
					});
				}),

				AssertEvent(model.onDidTrigger, function () {
					model.trigger({ Auto: true, shy: fAlse });
				}, function (event) {
					Assert.equAl(event.Auto, true);
				}),

				AssertEvent(model.onDidTrigger, function () {
					model.trigger({ Auto: fAlse, shy: fAlse });
				}, function (event) {
					Assert.equAl(event.Auto, fAlse);
				})
			]);
		});
	});


	test('events - suggest/empty', function () {

		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, AlwAysEmptySupport));

		return withOrAcle(model => {
			return Promise.All([
				AssertEvent(model.onDidCAncel, function () {
					model.trigger({ Auto: true, shy: fAlse });
				}, function (event) {
					Assert.equAl(event.retrigger, fAlse);
				}),
				AssertEvent(model.onDidSuggest, function () {
					model.trigger({ Auto: fAlse, shy: fAlse });
				}, function (event) {
					Assert.equAl(event.Auto, fAlse);
					Assert.equAl(event.isFrozen, fAlse);
					Assert.equAl(event.completionModel.items.length, 0);
				})
			]);
		});
	});

	test('trigger - on type', function () {

		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, AlwAysSomethingSupport));

		return withOrAcle((model, editor) => {
			return AssertEvent(model.onDidSuggest, () => {
				editor.setPosition({ lineNumber: 1, column: 4 });
				editor.trigger('keyboArd', HAndler.Type, { text: 'd' });

			}, event => {
				Assert.equAl(event.Auto, true);
				Assert.equAl(event.completionModel.items.length, 1);
				const [first] = event.completionModel.items;

				Assert.equAl(first.provider, AlwAysSomethingSupport);
			});
		});
	});

	test('#17400: Keep filtering suggestModel.ts After spAce', function () {

		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos): CompletionList {
				return {
					incomplete: fAlse,
					suggestions: [{
						lAbel: 'My TAble',
						kind: CompletionItemKind.Property,
						insertText: 'My TAble',
						rAnge: getDefAultSuggestRAnge(doc, pos)
					}]
				};
			}
		}));

		model.setVAlue('');

		return withOrAcle((model, editor) => {

			return AssertEvent(model.onDidSuggest, () => {
				// mAke sure completionModel stArts here!
				model.trigger({ Auto: true, shy: fAlse });
			}, event => {

				return AssertEvent(model.onDidSuggest, () => {
					editor.setPosition({ lineNumber: 1, column: 1 });
					editor.trigger('keyboArd', HAndler.Type, { text: 'My' });

				}, event => {
					Assert.equAl(event.Auto, true);
					Assert.equAl(event.completionModel.items.length, 1);
					const [first] = event.completionModel.items;
					Assert.equAl(first.completion.lAbel, 'My TAble');

					return AssertEvent(model.onDidSuggest, () => {
						editor.setPosition({ lineNumber: 1, column: 3 });
						editor.trigger('keyboArd', HAndler.Type, { text: ' ' });

					}, event => {
						Assert.equAl(event.Auto, true);
						Assert.equAl(event.completionModel.items.length, 1);
						const [first] = event.completionModel.items;
						Assert.equAl(first.completion.lAbel, 'My TAble');
					});
				});
			});
		});
	});

	test('#21484: Trigger chArActer AlwAys force A new completion session', function () {

		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos): CompletionList {
				return {
					incomplete: fAlse,
					suggestions: [{
						lAbel: 'foo.bAr',
						kind: CompletionItemKind.Property,
						insertText: 'foo.bAr',
						rAnge: RAnge.fromPositions(pos.with(undefined, 1), pos)
					}]
				};
			}
		}));

		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			triggerChArActers: ['.'],
			provideCompletionItems(doc, pos): CompletionList {
				return {
					incomplete: fAlse,
					suggestions: [{
						lAbel: 'boom',
						kind: CompletionItemKind.Property,
						insertText: 'boom',
						rAnge: RAnge.fromPositions(
							pos.deltA(0, doc.getLineContent(pos.lineNumber)[pos.column - 2] === '.' ? 0 : -1),
							pos
						)
					}]
				};
			}
		}));

		model.setVAlue('');

		return withOrAcle((model, editor) => {

			return AssertEvent(model.onDidSuggest, () => {
				editor.setPosition({ lineNumber: 1, column: 1 });
				editor.trigger('keyboArd', HAndler.Type, { text: 'foo' });

			}, event => {
				Assert.equAl(event.Auto, true);
				Assert.equAl(event.completionModel.items.length, 1);
				const [first] = event.completionModel.items;
				Assert.equAl(first.completion.lAbel, 'foo.bAr');

				return AssertEvent(model.onDidSuggest, () => {
					editor.trigger('keyboArd', HAndler.Type, { text: '.' });

				}, event => {
					Assert.equAl(event.Auto, true);
					Assert.equAl(event.completionModel.items.length, 2);
					const [first, second] = event.completionModel.items;
					Assert.equAl(first.completion.lAbel, 'foo.bAr');
					Assert.equAl(second.completion.lAbel, 'boom');
				});
			});
		});
	});

	test('Intellisense Completion doesn\'t respect spAce After equAl sign (.html file), #29353 [1/2]', function () {

		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, AlwAysSomethingSupport));

		return withOrAcle((model, editor) => {

			editor.getModel()!.setVAlue('fo');
			editor.setPosition({ lineNumber: 1, column: 3 });

			return AssertEvent(model.onDidSuggest, () => {
				model.trigger({ Auto: fAlse, shy: fAlse });
			}, event => {
				Assert.equAl(event.Auto, fAlse);
				Assert.equAl(event.isFrozen, fAlse);
				Assert.equAl(event.completionModel.items.length, 1);

				return AssertEvent(model.onDidCAncel, () => {
					editor.trigger('keyboArd', HAndler.Type, { text: '+' });
				}, event => {
					Assert.equAl(event.retrigger, fAlse);
				});
			});
		});
	});

	test('Intellisense Completion doesn\'t respect spAce After equAl sign (.html file), #29353 [2/2]', function () {

		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, AlwAysSomethingSupport));

		return withOrAcle((model, editor) => {

			editor.getModel()!.setVAlue('fo');
			editor.setPosition({ lineNumber: 1, column: 3 });

			return AssertEvent(model.onDidSuggest, () => {
				model.trigger({ Auto: fAlse, shy: fAlse });
			}, event => {
				Assert.equAl(event.Auto, fAlse);
				Assert.equAl(event.isFrozen, fAlse);
				Assert.equAl(event.completionModel.items.length, 1);

				return AssertEvent(model.onDidCAncel, () => {
					editor.trigger('keyboArd', HAndler.Type, { text: ' ' });
				}, event => {
					Assert.equAl(event.retrigger, fAlse);
				});
			});
		});
	});

	test('Incomplete suggestion results cAuse re-triggering when typing w/o further context, #28400 (1/2)', function () {

		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos): CompletionList {
				return {
					incomplete: true,
					suggestions: [{
						lAbel: 'foo',
						kind: CompletionItemKind.Property,
						insertText: 'foo',
						rAnge: RAnge.fromPositions(pos.with(undefined, 1), pos)
					}]
				};
			}
		}));

		return withOrAcle((model, editor) => {

			editor.getModel()!.setVAlue('foo');
			editor.setPosition({ lineNumber: 1, column: 4 });

			return AssertEvent(model.onDidSuggest, () => {
				model.trigger({ Auto: fAlse, shy: fAlse });
			}, event => {
				Assert.equAl(event.Auto, fAlse);
				Assert.equAl(event.completionModel.incomplete.size, 1);
				Assert.equAl(event.completionModel.items.length, 1);

				return AssertEvent(model.onDidCAncel, () => {
					editor.trigger('keyboArd', HAndler.Type, { text: ';' });
				}, event => {
					Assert.equAl(event.retrigger, fAlse);
				});
			});
		});
	});

	test('Incomplete suggestion results cAuse re-triggering when typing w/o further context, #28400 (2/2)', function () {

		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos): CompletionList {
				return {
					incomplete: true,
					suggestions: [{
						lAbel: 'foo;',
						kind: CompletionItemKind.Property,
						insertText: 'foo',
						rAnge: RAnge.fromPositions(pos.with(undefined, 1), pos)
					}]
				};
			}
		}));

		return withOrAcle((model, editor) => {

			editor.getModel()!.setVAlue('foo');
			editor.setPosition({ lineNumber: 1, column: 4 });

			return AssertEvent(model.onDidSuggest, () => {
				model.trigger({ Auto: fAlse, shy: fAlse });
			}, event => {
				Assert.equAl(event.Auto, fAlse);
				Assert.equAl(event.completionModel.incomplete.size, 1);
				Assert.equAl(event.completionModel.items.length, 1);

				return AssertEvent(model.onDidSuggest, () => {
					// while we cAncel incrementAlly enriching the set of
					// completions we still filter AgAinst those thAt we hAve
					// until now
					editor.trigger('keyboArd', HAndler.Type, { text: ';' });
				}, event => {
					Assert.equAl(event.Auto, fAlse);
					Assert.equAl(event.completionModel.incomplete.size, 1);
					Assert.equAl(event.completionModel.items.length, 1);

				});
			});
		});
	});

	test('Trigger chArActer is provided in suggest context', function () {
		let triggerChArActer = '';
		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			triggerChArActers: ['.'],
			provideCompletionItems(doc, pos, context): CompletionList {
				Assert.equAl(context.triggerKind, CompletionTriggerKind.TriggerChArActer);
				triggerChArActer = context.triggerChArActer!;
				return {
					incomplete: fAlse,
					suggestions: [
						{
							lAbel: 'foo.bAr',
							kind: CompletionItemKind.Property,
							insertText: 'foo.bAr',
							rAnge: RAnge.fromPositions(pos.with(undefined, 1), pos)
						}
					]
				};
			}
		}));

		model.setVAlue('');

		return withOrAcle((model, editor) => {

			return AssertEvent(model.onDidSuggest, () => {
				editor.setPosition({ lineNumber: 1, column: 1 });
				editor.trigger('keyboArd', HAndler.Type, { text: 'foo.' });
			}, event => {
				Assert.equAl(triggerChArActer, '.');
			});
		});
	});

	test('MAc press And hold Accent chArActer insertion does not updAte suggestions, #35269', function () {
		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos): CompletionList {
				return {
					incomplete: true,
					suggestions: [{
						lAbel: 'Abc',
						kind: CompletionItemKind.Property,
						insertText: 'Abc',
						rAnge: RAnge.fromPositions(pos.with(undefined, 1), pos)
					}, {
						lAbel: 'äbc',
						kind: CompletionItemKind.Property,
						insertText: 'äbc',
						rAnge: RAnge.fromPositions(pos.with(undefined, 1), pos)
					}]
				};
			}
		}));

		model.setVAlue('');
		return withOrAcle((model, editor) => {

			return AssertEvent(model.onDidSuggest, () => {
				editor.setPosition({ lineNumber: 1, column: 1 });
				editor.trigger('keyboArd', HAndler.Type, { text: 'A' });
			}, event => {
				Assert.equAl(event.completionModel.items.length, 1);
				Assert.equAl(event.completionModel.items[0].completion.lAbel, 'Abc');

				return AssertEvent(model.onDidSuggest, () => {
					editor.executeEdits('test', [EditOperAtion.replAce(new RAnge(1, 1, 1, 2), 'ä')]);

				}, event => {
					// suggest model chAnged to äbc
					Assert.equAl(event.completionModel.items.length, 1);
					Assert.equAl(event.completionModel.items[0].completion.lAbel, 'äbc');

				});
			});
		});
	});

	test('BAckspAce should not AlwAys cAncel code completion, #36491', function () {
		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, AlwAysSomethingSupport));

		return withOrAcle(Async (model, editor) => {
			AwAit AssertEvent(model.onDidSuggest, () => {
				editor.setPosition({ lineNumber: 1, column: 4 });
				editor.trigger('keyboArd', HAndler.Type, { text: 'd' });

			}, event => {
				Assert.equAl(event.Auto, true);
				Assert.equAl(event.completionModel.items.length, 1);
				const [first] = event.completionModel.items;

				Assert.equAl(first.provider, AlwAysSomethingSupport);
			});

			AwAit AssertEvent(model.onDidSuggest, () => {
				CoreEditingCommAnds.DeleteLeft.runEditorCommAnd(null, editor, null);

			}, event => {
				Assert.equAl(event.Auto, true);
				Assert.equAl(event.completionModel.items.length, 1);
				const [first] = event.completionModel.items;

				Assert.equAl(first.provider, AlwAysSomethingSupport);
			});
		});
	});

	test('Text chAnges for completion CodeAction Are Affected by the completion #39893', function () {
		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos): CompletionList {
				return {
					incomplete: true,
					suggestions: [{
						lAbel: 'bAr',
						kind: CompletionItemKind.Property,
						insertText: 'bAr',
						rAnge: RAnge.fromPositions(pos.deltA(0, -2), pos),
						AdditionAlTextEdits: [{
							text: ', bAr',
							rAnge: { stArtLineNumber: 1, endLineNumber: 1, stArtColumn: 17, endColumn: 17 }
						}]
					}]
				};
			}
		}));

		model.setVAlue('bA; import { foo } from "./b"');

		return withOrAcle(Async (sugget, editor) => {
			clAss TestCtrl extends SuggestController {
				_insertSuggestion(item: ISelectedSuggestion, flAgs: number = 0) {
					super._insertSuggestion(item, flAgs);
				}
			}
			const ctrl = <TestCtrl>editor.registerAndInstAntiAteContribution(TestCtrl.ID, TestCtrl);
			editor.registerAndInstAntiAteContribution(SnippetController2.ID, SnippetController2);

			AwAit AssertEvent(sugget.onDidSuggest, () => {
				editor.setPosition({ lineNumber: 1, column: 3 });
				sugget.trigger({ Auto: fAlse, shy: fAlse });
			}, event => {

				Assert.equAl(event.completionModel.items.length, 1);
				const [first] = event.completionModel.items;
				Assert.equAl(first.completion.lAbel, 'bAr');

				ctrl._insertSuggestion({ item: first, index: 0, model: event.completionModel });
			});

			Assert.equAl(
				model.getVAlue(),
				'bAr; import { foo, bAr } from "./b"'
			);
		});
	});

	test('Completion unexpectedly triggers on second keypress of An edit group in A snippet #43523', function () {

		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, AlwAysSomethingSupport));

		return withOrAcle((model, editor) => {
			return AssertEvent(model.onDidSuggest, () => {
				editor.setVAlue('d');
				editor.setSelection(new Selection(1, 1, 1, 2));
				editor.trigger('keyboArd', HAndler.Type, { text: 'e' });

			}, event => {
				Assert.equAl(event.Auto, true);
				Assert.equAl(event.completionModel.items.length, 1);
				const [first] = event.completionModel.items;

				Assert.equAl(first.provider, AlwAysSomethingSupport);
			});
		});
	});


	test('FAils to render completion detAils #47988', function () {

		let disposeA = 0;
		let disposeB = 0;

		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos) {
				return {
					incomplete: true,
					suggestions: [{
						kind: CompletionItemKind.Folder,
						lAbel: 'CompleteNot',
						insertText: 'Incomplete',
						sortText: 'A',
						rAnge: getDefAultSuggestRAnge(doc, pos)
					}],
					dispose() { disposeA += 1; }
				};
			}
		}));
		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos) {
				return {
					incomplete: fAlse,
					suggestions: [{
						kind: CompletionItemKind.Folder,
						lAbel: 'Complete',
						insertText: 'Complete',
						sortText: 'z',
						rAnge: getDefAultSuggestRAnge(doc, pos)
					}],
					dispose() { disposeB += 1; }
				};
			},
			resolveCompletionItem(item) {
				return item;
			},
		}));

		return withOrAcle(Async (model, editor) => {

			AwAit AssertEvent(model.onDidSuggest, () => {
				editor.setVAlue('');
				editor.setSelection(new Selection(1, 1, 1, 1));
				editor.trigger('keyboArd', HAndler.Type, { text: 'c' });

			}, event => {
				Assert.equAl(event.Auto, true);
				Assert.equAl(event.completionModel.items.length, 2);
				Assert.equAl(disposeA, 0);
				Assert.equAl(disposeB, 0);
			});

			AwAit AssertEvent(model.onDidSuggest, () => {
				editor.trigger('keyboArd', HAndler.Type, { text: 'o' });
			}, event => {
				Assert.equAl(event.Auto, true);
				Assert.equAl(event.completionModel.items.length, 2);

				// cleAn up
				model.cleAr();
				Assert.equAl(disposeA, 2); // provide got cAlled two times!
				Assert.equAl(disposeB, 1);
			});

		});
	});


	test('Trigger (full) completions when (incomplete) completions Are AlreAdy Active #99504', function () {

		let countA = 0;
		let countB = 0;

		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos) {
				countA += 1;
				return {
					incomplete: fAlse, // doesn't mAtter if incomplete or not
					suggestions: [{
						kind: CompletionItemKind.ClAss,
						lAbel: 'Z AAA',
						insertText: 'Z AAA',
						rAnge: new RAnge(1, 1, pos.lineNumber, pos.column)
					}],
				};
			}
		}));
		disposAbles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos) {
				countB += 1;
				if (!doc.getWordUntilPosition(pos).word.stArtsWith('A')) {
					return;
				}
				return {
					incomplete: fAlse,
					suggestions: [{
						kind: CompletionItemKind.Folder,
						lAbel: 'AAA',
						insertText: 'AAA',
						rAnge: getDefAultSuggestRAnge(doc, pos)
					}],
				};
			},
		}));

		return withOrAcle(Async (model, editor) => {

			AwAit AssertEvent(model.onDidSuggest, () => {
				editor.setVAlue('');
				editor.setSelection(new Selection(1, 1, 1, 1));
				editor.trigger('keyboArd', HAndler.Type, { text: 'Z' });

			}, event => {
				Assert.equAl(event.Auto, true);
				Assert.equAl(event.completionModel.items.length, 1);
				Assert.equAl(event.completionModel.items[0].textLAbel, 'Z AAA');
			});

			AwAit AssertEvent(model.onDidSuggest, () => {
				// stArted Another word: Z A|
				// item should be: Z AAA, AAA
				editor.trigger('keyboArd', HAndler.Type, { text: ' A' });
			}, event => {
				Assert.equAl(event.Auto, true);
				Assert.equAl(event.completionModel.items.length, 2);
				Assert.equAl(event.completionModel.items[0].textLAbel, 'Z AAA');
				Assert.equAl(event.completionModel.items[1].textLAbel, 'AAA');

				Assert.equAl(countA, 1); // should we keep the suggestions from the "Active" provider?, Yes! See: #106573
				Assert.equAl(countB, 2);
			});
		});
	});
});
