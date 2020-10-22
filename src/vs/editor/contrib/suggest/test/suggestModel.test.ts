/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { Event } from 'vs/Base/common/event';
import { DisposaBle, IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { CoreEditingCommands } from 'vs/editor/Browser/controller/coreCommands';
import { EditOperation } from 'vs/editor/common/core/editOperation';
import { Range } from 'vs/editor/common/core/range';
import { Position } from 'vs/editor/common/core/position';
import { Selection } from 'vs/editor/common/core/selection';
import { TokenizationResult2 } from 'vs/editor/common/core/token';
import { Handler } from 'vs/editor/common/editorCommon';
import { TextModel } from 'vs/editor/common/model/textModel';
import { IState, CompletionList, CompletionItemProvider, LanguageIdentifier, MetadataConsts, CompletionProviderRegistry, CompletionTriggerKind, TokenizationRegistry, CompletionItemKind } from 'vs/editor/common/modes';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { NULL_STATE } from 'vs/editor/common/modes/nullMode';
import { SnippetController2 } from 'vs/editor/contriB/snippet/snippetController2';
import { SuggestController } from 'vs/editor/contriB/suggest/suggestController';
import { LineContext, SuggestModel } from 'vs/editor/contriB/suggest/suggestModel';
import { ISelectedSuggestion } from 'vs/editor/contriB/suggest/suggestWidget';
import { ITestCodeEditor, createTestCodeEditor } from 'vs/editor/test/Browser/testCodeEditor';
import { MockMode } from 'vs/editor/test/common/mocks/mockMode';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { IStorageService, InMemoryStorageService } from 'vs/platform/storage/common/storage';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/platform/telemetry/common/telemetryUtils';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { ISuggestMemoryService } from 'vs/editor/contriB/suggest/suggestMemory';
import { ITextModel } from 'vs/editor/common/model';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { MockKeyBindingService } from 'vs/platform/keyBinding/test/common/mockKeyBindingService';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { mock } from 'vs/Base/test/common/mock';


function createMockEditor(model: TextModel): ITestCodeEditor {
	let editor = createTestCodeEditor({
		model: model,
		serviceCollection: new ServiceCollection(
			[ITelemetryService, NullTelemetryService],
			[IStorageService, new InMemoryStorageService()],
			[IKeyBindingService, new MockKeyBindingService()],
			[ISuggestMemoryService, new class implements ISuggestMemoryService {
				declare readonly _serviceBrand: undefined;
				memorize(): void {
				}
				select(): numBer {
					return -1;
				}
			}],
		),
	});
	editor.registerAndInstantiateContriBution(SnippetController2.ID, SnippetController2);
	return editor;
}

suite('SuggestModel - Context', function () {
	const OUTER_LANGUAGE_ID = new LanguageIdentifier('outerMode', 3);
	const INNER_LANGUAGE_ID = new LanguageIdentifier('innerMode', 4);

	class OuterMode extends MockMode {
		constructor() {
			super(OUTER_LANGUAGE_ID);
			this._register(LanguageConfigurationRegistry.register(this.getLanguageIdentifier(), {}));

			this._register(TokenizationRegistry.register(this.getLanguageIdentifier().language, {
				getInitialState: (): IState => NULL_STATE,
				tokenize: undefined!,
				tokenize2: (line: string, state: IState): TokenizationResult2 => {
					const tokensArr: numBer[] = [];
					let prevLanguageId: LanguageIdentifier | undefined = undefined;
					for (let i = 0; i < line.length; i++) {
						const languageId = (line.charAt(i) === 'x' ? INNER_LANGUAGE_ID : OUTER_LANGUAGE_ID);
						if (prevLanguageId !== languageId) {
							tokensArr.push(i);
							tokensArr.push((languageId.id << MetadataConsts.LANGUAGEID_OFFSET));
						}
						prevLanguageId = languageId;
					}

					const tokens = new Uint32Array(tokensArr.length);
					for (let i = 0; i < tokens.length; i++) {
						tokens[i] = tokensArr[i];
					}
					return new TokenizationResult2(tokens, state);
				}
			}));
		}
	}

	class InnerMode extends MockMode {
		constructor() {
			super(INNER_LANGUAGE_ID);
			this._register(LanguageConfigurationRegistry.register(this.getLanguageIdentifier(), {}));
		}
	}

	const assertAutoTrigger = (model: TextModel, offset: numBer, expected: Boolean, message?: string): void => {
		const pos = model.getPositionAt(offset);
		const editor = createMockEditor(model);
		editor.setPosition(pos);
		assert.equal(LineContext.shouldAutoTrigger(editor), expected, message);
		editor.dispose();
	};

	let disposaBles: DisposaBle[] = [];

	setup(() => {
		disposaBles = [];
	});

	teardown(function () {
		dispose(disposaBles);
		disposaBles = [];
	});

	test('Context - shouldAutoTrigger', function () {
		const model = createTextModel('Das Pferd frisst keinen Gurkensalat - Philipp Reis 1861.\nWer hat\'s erfunden?');
		disposaBles.push(model);

		assertAutoTrigger(model, 3, true, 'end of word, Das|');
		assertAutoTrigger(model, 4, false, 'no word Das |');
		assertAutoTrigger(model, 1, false, 'middle of word D|as');
		assertAutoTrigger(model, 55, false, 'numBer, 1861|');
	});

	test('shouldAutoTrigger at emBedded language Boundaries', () => {
		const outerMode = new OuterMode();
		const innerMode = new InnerMode();
		disposaBles.push(outerMode, innerMode);

		const model = createTextModel('a<xx>a<x>', undefined, outerMode.getLanguageIdentifier());
		disposaBles.push(model);

		assertAutoTrigger(model, 1, true, 'a|<x — should trigger at end of word');
		assertAutoTrigger(model, 2, false, 'a<|x — should NOT trigger at start of word');
		assertAutoTrigger(model, 3, false, 'a<x|x —  should NOT trigger in middle of word');
		assertAutoTrigger(model, 4, true, 'a<xx|> — should trigger at Boundary Between languages');
		assertAutoTrigger(model, 5, false, 'a<xx>|a — should NOT trigger at start of word');
		assertAutoTrigger(model, 6, true, 'a<xx>a|< — should trigger at end of word');
		assertAutoTrigger(model, 8, true, 'a<xx>a<x|> — should trigger at end of word at Boundary');
	});
});

suite('SuggestModel - TriggerAndCancelOracle', function () {


	function getDefaultSuggestRange(model: ITextModel, position: Position) {
		const wordUntil = model.getWordUntilPosition(position);
		return new Range(position.lineNumBer, wordUntil.startColumn, position.lineNumBer, wordUntil.endColumn);
	}

	const alwaysEmptySupport: CompletionItemProvider = {
		provideCompletionItems(doc, pos): CompletionList {
			return {
				incomplete: false,
				suggestions: []
			};
		}
	};

	const alwaysSomethingSupport: CompletionItemProvider = {
		provideCompletionItems(doc, pos): CompletionList {
			return {
				incomplete: false,
				suggestions: [{
					laBel: doc.getWordUntilPosition(pos).word,
					kind: CompletionItemKind.Property,
					insertText: 'foofoo',
					range: getDefaultSuggestRange(doc, pos)
				}]
			};
		}
	};

	let disposaBles: IDisposaBle[] = [];
	let model: TextModel;

	setup(function () {
		disposaBles = dispose(disposaBles);
		model = createTextModel('aBc def', undefined, undefined, URI.parse('test:somefile.ttt'));
		disposaBles.push(model);
	});

	function withOracle(callBack: (model: SuggestModel, editor: ITestCodeEditor) => any): Promise<any> {

		return new Promise((resolve, reject) => {
			const editor = createMockEditor(model);
			const oracle = new SuggestModel(
				editor,
				new class extends mock<IEditorWorkerService>() {
					computeWordRanges() {
						return Promise.resolve({});
					}
				},
				new class extends mock<IClipBoardService>() {
					readText() {
						return Promise.resolve('CLIPPY');
					}
				}
			);
			disposaBles.push(oracle, editor);

			try {
				resolve(callBack(oracle, editor));
			} catch (err) {
				reject(err);
			}
		});
	}

	function assertEvent<E>(event: Event<E>, action: () => any, assert: (e: E) => any) {
		return new Promise((resolve, reject) => {
			const suB = event(e => {
				suB.dispose();
				try {
					resolve(assert(e));
				} catch (err) {
					reject(err);
				}
			});
			try {
				action();
			} catch (err) {
				suB.dispose();
				reject(err);
			}
		});
	}

	test('events - cancel/trigger', function () {
		return withOracle(model => {

			return Promise.all([

				assertEvent(model.onDidTrigger, function () {
					model.trigger({ auto: true, shy: false });
				}, function (event) {
					assert.equal(event.auto, true);

					return assertEvent(model.onDidCancel, function () {
						model.cancel();
					}, function (event) {
						assert.equal(event.retrigger, false);
					});
				}),

				assertEvent(model.onDidTrigger, function () {
					model.trigger({ auto: true, shy: false });
				}, function (event) {
					assert.equal(event.auto, true);
				}),

				assertEvent(model.onDidTrigger, function () {
					model.trigger({ auto: false, shy: false });
				}, function (event) {
					assert.equal(event.auto, false);
				})
			]);
		});
	});


	test('events - suggest/empty', function () {

		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, alwaysEmptySupport));

		return withOracle(model => {
			return Promise.all([
				assertEvent(model.onDidCancel, function () {
					model.trigger({ auto: true, shy: false });
				}, function (event) {
					assert.equal(event.retrigger, false);
				}),
				assertEvent(model.onDidSuggest, function () {
					model.trigger({ auto: false, shy: false });
				}, function (event) {
					assert.equal(event.auto, false);
					assert.equal(event.isFrozen, false);
					assert.equal(event.completionModel.items.length, 0);
				})
			]);
		});
	});

	test('trigger - on type', function () {

		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, alwaysSomethingSupport));

		return withOracle((model, editor) => {
			return assertEvent(model.onDidSuggest, () => {
				editor.setPosition({ lineNumBer: 1, column: 4 });
				editor.trigger('keyBoard', Handler.Type, { text: 'd' });

			}, event => {
				assert.equal(event.auto, true);
				assert.equal(event.completionModel.items.length, 1);
				const [first] = event.completionModel.items;

				assert.equal(first.provider, alwaysSomethingSupport);
			});
		});
	});

	test('#17400: Keep filtering suggestModel.ts after space', function () {

		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos): CompletionList {
				return {
					incomplete: false,
					suggestions: [{
						laBel: 'My TaBle',
						kind: CompletionItemKind.Property,
						insertText: 'My TaBle',
						range: getDefaultSuggestRange(doc, pos)
					}]
				};
			}
		}));

		model.setValue('');

		return withOracle((model, editor) => {

			return assertEvent(model.onDidSuggest, () => {
				// make sure completionModel starts here!
				model.trigger({ auto: true, shy: false });
			}, event => {

				return assertEvent(model.onDidSuggest, () => {
					editor.setPosition({ lineNumBer: 1, column: 1 });
					editor.trigger('keyBoard', Handler.Type, { text: 'My' });

				}, event => {
					assert.equal(event.auto, true);
					assert.equal(event.completionModel.items.length, 1);
					const [first] = event.completionModel.items;
					assert.equal(first.completion.laBel, 'My TaBle');

					return assertEvent(model.onDidSuggest, () => {
						editor.setPosition({ lineNumBer: 1, column: 3 });
						editor.trigger('keyBoard', Handler.Type, { text: ' ' });

					}, event => {
						assert.equal(event.auto, true);
						assert.equal(event.completionModel.items.length, 1);
						const [first] = event.completionModel.items;
						assert.equal(first.completion.laBel, 'My TaBle');
					});
				});
			});
		});
	});

	test('#21484: Trigger character always force a new completion session', function () {

		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos): CompletionList {
				return {
					incomplete: false,
					suggestions: [{
						laBel: 'foo.Bar',
						kind: CompletionItemKind.Property,
						insertText: 'foo.Bar',
						range: Range.fromPositions(pos.with(undefined, 1), pos)
					}]
				};
			}
		}));

		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			triggerCharacters: ['.'],
			provideCompletionItems(doc, pos): CompletionList {
				return {
					incomplete: false,
					suggestions: [{
						laBel: 'Boom',
						kind: CompletionItemKind.Property,
						insertText: 'Boom',
						range: Range.fromPositions(
							pos.delta(0, doc.getLineContent(pos.lineNumBer)[pos.column - 2] === '.' ? 0 : -1),
							pos
						)
					}]
				};
			}
		}));

		model.setValue('');

		return withOracle((model, editor) => {

			return assertEvent(model.onDidSuggest, () => {
				editor.setPosition({ lineNumBer: 1, column: 1 });
				editor.trigger('keyBoard', Handler.Type, { text: 'foo' });

			}, event => {
				assert.equal(event.auto, true);
				assert.equal(event.completionModel.items.length, 1);
				const [first] = event.completionModel.items;
				assert.equal(first.completion.laBel, 'foo.Bar');

				return assertEvent(model.onDidSuggest, () => {
					editor.trigger('keyBoard', Handler.Type, { text: '.' });

				}, event => {
					assert.equal(event.auto, true);
					assert.equal(event.completionModel.items.length, 2);
					const [first, second] = event.completionModel.items;
					assert.equal(first.completion.laBel, 'foo.Bar');
					assert.equal(second.completion.laBel, 'Boom');
				});
			});
		});
	});

	test('Intellisense Completion doesn\'t respect space after equal sign (.html file), #29353 [1/2]', function () {

		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, alwaysSomethingSupport));

		return withOracle((model, editor) => {

			editor.getModel()!.setValue('fo');
			editor.setPosition({ lineNumBer: 1, column: 3 });

			return assertEvent(model.onDidSuggest, () => {
				model.trigger({ auto: false, shy: false });
			}, event => {
				assert.equal(event.auto, false);
				assert.equal(event.isFrozen, false);
				assert.equal(event.completionModel.items.length, 1);

				return assertEvent(model.onDidCancel, () => {
					editor.trigger('keyBoard', Handler.Type, { text: '+' });
				}, event => {
					assert.equal(event.retrigger, false);
				});
			});
		});
	});

	test('Intellisense Completion doesn\'t respect space after equal sign (.html file), #29353 [2/2]', function () {

		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, alwaysSomethingSupport));

		return withOracle((model, editor) => {

			editor.getModel()!.setValue('fo');
			editor.setPosition({ lineNumBer: 1, column: 3 });

			return assertEvent(model.onDidSuggest, () => {
				model.trigger({ auto: false, shy: false });
			}, event => {
				assert.equal(event.auto, false);
				assert.equal(event.isFrozen, false);
				assert.equal(event.completionModel.items.length, 1);

				return assertEvent(model.onDidCancel, () => {
					editor.trigger('keyBoard', Handler.Type, { text: ' ' });
				}, event => {
					assert.equal(event.retrigger, false);
				});
			});
		});
	});

	test('Incomplete suggestion results cause re-triggering when typing w/o further context, #28400 (1/2)', function () {

		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos): CompletionList {
				return {
					incomplete: true,
					suggestions: [{
						laBel: 'foo',
						kind: CompletionItemKind.Property,
						insertText: 'foo',
						range: Range.fromPositions(pos.with(undefined, 1), pos)
					}]
				};
			}
		}));

		return withOracle((model, editor) => {

			editor.getModel()!.setValue('foo');
			editor.setPosition({ lineNumBer: 1, column: 4 });

			return assertEvent(model.onDidSuggest, () => {
				model.trigger({ auto: false, shy: false });
			}, event => {
				assert.equal(event.auto, false);
				assert.equal(event.completionModel.incomplete.size, 1);
				assert.equal(event.completionModel.items.length, 1);

				return assertEvent(model.onDidCancel, () => {
					editor.trigger('keyBoard', Handler.Type, { text: ';' });
				}, event => {
					assert.equal(event.retrigger, false);
				});
			});
		});
	});

	test('Incomplete suggestion results cause re-triggering when typing w/o further context, #28400 (2/2)', function () {

		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos): CompletionList {
				return {
					incomplete: true,
					suggestions: [{
						laBel: 'foo;',
						kind: CompletionItemKind.Property,
						insertText: 'foo',
						range: Range.fromPositions(pos.with(undefined, 1), pos)
					}]
				};
			}
		}));

		return withOracle((model, editor) => {

			editor.getModel()!.setValue('foo');
			editor.setPosition({ lineNumBer: 1, column: 4 });

			return assertEvent(model.onDidSuggest, () => {
				model.trigger({ auto: false, shy: false });
			}, event => {
				assert.equal(event.auto, false);
				assert.equal(event.completionModel.incomplete.size, 1);
				assert.equal(event.completionModel.items.length, 1);

				return assertEvent(model.onDidSuggest, () => {
					// while we cancel incrementally enriching the set of
					// completions we still filter against those that we have
					// until now
					editor.trigger('keyBoard', Handler.Type, { text: ';' });
				}, event => {
					assert.equal(event.auto, false);
					assert.equal(event.completionModel.incomplete.size, 1);
					assert.equal(event.completionModel.items.length, 1);

				});
			});
		});
	});

	test('Trigger character is provided in suggest context', function () {
		let triggerCharacter = '';
		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			triggerCharacters: ['.'],
			provideCompletionItems(doc, pos, context): CompletionList {
				assert.equal(context.triggerKind, CompletionTriggerKind.TriggerCharacter);
				triggerCharacter = context.triggerCharacter!;
				return {
					incomplete: false,
					suggestions: [
						{
							laBel: 'foo.Bar',
							kind: CompletionItemKind.Property,
							insertText: 'foo.Bar',
							range: Range.fromPositions(pos.with(undefined, 1), pos)
						}
					]
				};
			}
		}));

		model.setValue('');

		return withOracle((model, editor) => {

			return assertEvent(model.onDidSuggest, () => {
				editor.setPosition({ lineNumBer: 1, column: 1 });
				editor.trigger('keyBoard', Handler.Type, { text: 'foo.' });
			}, event => {
				assert.equal(triggerCharacter, '.');
			});
		});
	});

	test('Mac press and hold accent character insertion does not update suggestions, #35269', function () {
		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos): CompletionList {
				return {
					incomplete: true,
					suggestions: [{
						laBel: 'aBc',
						kind: CompletionItemKind.Property,
						insertText: 'aBc',
						range: Range.fromPositions(pos.with(undefined, 1), pos)
					}, {
						laBel: 'äBc',
						kind: CompletionItemKind.Property,
						insertText: 'äBc',
						range: Range.fromPositions(pos.with(undefined, 1), pos)
					}]
				};
			}
		}));

		model.setValue('');
		return withOracle((model, editor) => {

			return assertEvent(model.onDidSuggest, () => {
				editor.setPosition({ lineNumBer: 1, column: 1 });
				editor.trigger('keyBoard', Handler.Type, { text: 'a' });
			}, event => {
				assert.equal(event.completionModel.items.length, 1);
				assert.equal(event.completionModel.items[0].completion.laBel, 'aBc');

				return assertEvent(model.onDidSuggest, () => {
					editor.executeEdits('test', [EditOperation.replace(new Range(1, 1, 1, 2), 'ä')]);

				}, event => {
					// suggest model changed to äBc
					assert.equal(event.completionModel.items.length, 1);
					assert.equal(event.completionModel.items[0].completion.laBel, 'äBc');

				});
			});
		});
	});

	test('Backspace should not always cancel code completion, #36491', function () {
		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, alwaysSomethingSupport));

		return withOracle(async (model, editor) => {
			await assertEvent(model.onDidSuggest, () => {
				editor.setPosition({ lineNumBer: 1, column: 4 });
				editor.trigger('keyBoard', Handler.Type, { text: 'd' });

			}, event => {
				assert.equal(event.auto, true);
				assert.equal(event.completionModel.items.length, 1);
				const [first] = event.completionModel.items;

				assert.equal(first.provider, alwaysSomethingSupport);
			});

			await assertEvent(model.onDidSuggest, () => {
				CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);

			}, event => {
				assert.equal(event.auto, true);
				assert.equal(event.completionModel.items.length, 1);
				const [first] = event.completionModel.items;

				assert.equal(first.provider, alwaysSomethingSupport);
			});
		});
	});

	test('Text changes for completion CodeAction are affected By the completion #39893', function () {
		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos): CompletionList {
				return {
					incomplete: true,
					suggestions: [{
						laBel: 'Bar',
						kind: CompletionItemKind.Property,
						insertText: 'Bar',
						range: Range.fromPositions(pos.delta(0, -2), pos),
						additionalTextEdits: [{
							text: ', Bar',
							range: { startLineNumBer: 1, endLineNumBer: 1, startColumn: 17, endColumn: 17 }
						}]
					}]
				};
			}
		}));

		model.setValue('Ba; import { foo } from "./B"');

		return withOracle(async (sugget, editor) => {
			class TestCtrl extends SuggestController {
				_insertSuggestion(item: ISelectedSuggestion, flags: numBer = 0) {
					super._insertSuggestion(item, flags);
				}
			}
			const ctrl = <TestCtrl>editor.registerAndInstantiateContriBution(TestCtrl.ID, TestCtrl);
			editor.registerAndInstantiateContriBution(SnippetController2.ID, SnippetController2);

			await assertEvent(sugget.onDidSuggest, () => {
				editor.setPosition({ lineNumBer: 1, column: 3 });
				sugget.trigger({ auto: false, shy: false });
			}, event => {

				assert.equal(event.completionModel.items.length, 1);
				const [first] = event.completionModel.items;
				assert.equal(first.completion.laBel, 'Bar');

				ctrl._insertSuggestion({ item: first, index: 0, model: event.completionModel });
			});

			assert.equal(
				model.getValue(),
				'Bar; import { foo, Bar } from "./B"'
			);
		});
	});

	test('Completion unexpectedly triggers on second keypress of an edit group in a snippet #43523', function () {

		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, alwaysSomethingSupport));

		return withOracle((model, editor) => {
			return assertEvent(model.onDidSuggest, () => {
				editor.setValue('d');
				editor.setSelection(new Selection(1, 1, 1, 2));
				editor.trigger('keyBoard', Handler.Type, { text: 'e' });

			}, event => {
				assert.equal(event.auto, true);
				assert.equal(event.completionModel.items.length, 1);
				const [first] = event.completionModel.items;

				assert.equal(first.provider, alwaysSomethingSupport);
			});
		});
	});


	test('Fails to render completion details #47988', function () {

		let disposeA = 0;
		let disposeB = 0;

		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos) {
				return {
					incomplete: true,
					suggestions: [{
						kind: CompletionItemKind.Folder,
						laBel: 'CompleteNot',
						insertText: 'Incomplete',
						sortText: 'a',
						range: getDefaultSuggestRange(doc, pos)
					}],
					dispose() { disposeA += 1; }
				};
			}
		}));
		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos) {
				return {
					incomplete: false,
					suggestions: [{
						kind: CompletionItemKind.Folder,
						laBel: 'Complete',
						insertText: 'Complete',
						sortText: 'z',
						range: getDefaultSuggestRange(doc, pos)
					}],
					dispose() { disposeB += 1; }
				};
			},
			resolveCompletionItem(item) {
				return item;
			},
		}));

		return withOracle(async (model, editor) => {

			await assertEvent(model.onDidSuggest, () => {
				editor.setValue('');
				editor.setSelection(new Selection(1, 1, 1, 1));
				editor.trigger('keyBoard', Handler.Type, { text: 'c' });

			}, event => {
				assert.equal(event.auto, true);
				assert.equal(event.completionModel.items.length, 2);
				assert.equal(disposeA, 0);
				assert.equal(disposeB, 0);
			});

			await assertEvent(model.onDidSuggest, () => {
				editor.trigger('keyBoard', Handler.Type, { text: 'o' });
			}, event => {
				assert.equal(event.auto, true);
				assert.equal(event.completionModel.items.length, 2);

				// clean up
				model.clear();
				assert.equal(disposeA, 2); // provide got called two times!
				assert.equal(disposeB, 1);
			});

		});
	});


	test('Trigger (full) completions when (incomplete) completions are already active #99504', function () {

		let countA = 0;
		let countB = 0;

		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos) {
				countA += 1;
				return {
					incomplete: false, // doesn't matter if incomplete or not
					suggestions: [{
						kind: CompletionItemKind.Class,
						laBel: 'Z aaa',
						insertText: 'Z aaa',
						range: new Range(1, 1, pos.lineNumBer, pos.column)
					}],
				};
			}
		}));
		disposaBles.push(CompletionProviderRegistry.register({ scheme: 'test' }, {
			provideCompletionItems(doc, pos) {
				countB += 1;
				if (!doc.getWordUntilPosition(pos).word.startsWith('a')) {
					return;
				}
				return {
					incomplete: false,
					suggestions: [{
						kind: CompletionItemKind.Folder,
						laBel: 'aaa',
						insertText: 'aaa',
						range: getDefaultSuggestRange(doc, pos)
					}],
				};
			},
		}));

		return withOracle(async (model, editor) => {

			await assertEvent(model.onDidSuggest, () => {
				editor.setValue('');
				editor.setSelection(new Selection(1, 1, 1, 1));
				editor.trigger('keyBoard', Handler.Type, { text: 'Z' });

			}, event => {
				assert.equal(event.auto, true);
				assert.equal(event.completionModel.items.length, 1);
				assert.equal(event.completionModel.items[0].textLaBel, 'Z aaa');
			});

			await assertEvent(model.onDidSuggest, () => {
				// started another word: Z a|
				// item should Be: Z aaa, aaa
				editor.trigger('keyBoard', Handler.Type, { text: ' a' });
			}, event => {
				assert.equal(event.auto, true);
				assert.equal(event.completionModel.items.length, 2);
				assert.equal(event.completionModel.items[0].textLaBel, 'Z aaa');
				assert.equal(event.completionModel.items[1].textLaBel, 'aaa');

				assert.equal(countA, 1); // should we keep the suggestions from the "active" provider?, Yes! See: #106573
				assert.equal(countB, 2);
			});
		});
	});
});
