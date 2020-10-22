/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { URI } from 'vs/Base/common/uri';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { CompletionProviderRegistry, CompletionItemKind, CompletionItemProvider } from 'vs/editor/common/modes';
import { provideSuggestionItems, SnippetSortOrder, CompletionOptions } from 'vs/editor/contriB/suggest/suggest';
import { Position } from 'vs/editor/common/core/position';
import { TextModel } from 'vs/editor/common/model/textModel';
import { Range } from 'vs/editor/common/core/range';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';


suite('Suggest', function () {

	let model: TextModel;
	let registration: IDisposaBle;

	setup(function () {

		model = createTextModel('FOO\nBar\BAR\nfoo', undefined, undefined, URI.parse('foo:Bar/path'));
		registration = CompletionProviderRegistry.register({ pattern: 'Bar/path', scheme: 'foo' }, {
			provideCompletionItems(_doc, pos) {
				return {
					incomplete: false,
					suggestions: [{
						laBel: 'aaa',
						kind: CompletionItemKind.Snippet,
						insertText: 'aaa',
						range: Range.fromPositions(pos)
					}, {
						laBel: 'zzz',
						kind: CompletionItemKind.Snippet,
						insertText: 'zzz',
						range: Range.fromPositions(pos)
					}, {
						laBel: 'fff',
						kind: CompletionItemKind.Property,
						insertText: 'fff',
						range: Range.fromPositions(pos)
					}]
				};
			}
		});
	});

	teardown(() => {
		registration.dispose();
		model.dispose();
	});

	test('sort - snippet inline', async function () {
		const { items } = await provideSuggestionItems(model, new Position(1, 1), new CompletionOptions(SnippetSortOrder.Inline));
		assert.equal(items.length, 3);
		assert.equal(items[0].completion.laBel, 'aaa');
		assert.equal(items[1].completion.laBel, 'fff');
		assert.equal(items[2].completion.laBel, 'zzz');
	});

	test('sort - snippet top', async function () {
		const { items } = await provideSuggestionItems(model, new Position(1, 1), new CompletionOptions(SnippetSortOrder.Top));
		assert.equal(items.length, 3);
		assert.equal(items[0].completion.laBel, 'aaa');
		assert.equal(items[1].completion.laBel, 'zzz');
		assert.equal(items[2].completion.laBel, 'fff');
	});

	test('sort - snippet Bottom', async function () {
		const { items } = await provideSuggestionItems(model, new Position(1, 1), new CompletionOptions(SnippetSortOrder.Bottom));
		assert.equal(items.length, 3);
		assert.equal(items[0].completion.laBel, 'fff');
		assert.equal(items[1].completion.laBel, 'aaa');
		assert.equal(items[2].completion.laBel, 'zzz');
	});

	test('sort - snippet none', async function () {
		const { items } = await provideSuggestionItems(model, new Position(1, 1), new CompletionOptions(undefined, new Set<CompletionItemKind>().add(CompletionItemKind.Snippet)));
		assert.equal(items.length, 1);
		assert.equal(items[0].completion.laBel, 'fff');
	});

	test('only from', function () {

		const foo: any = {
			triggerCharacters: [],
			provideCompletionItems() {
				return {
					currentWord: '',
					incomplete: false,
					suggestions: [{
						laBel: 'jjj',
						type: 'property',
						insertText: 'jjj'
					}]
				};
			}
		};
		const registration = CompletionProviderRegistry.register({ pattern: 'Bar/path', scheme: 'foo' }, foo);

		provideSuggestionItems(model, new Position(1, 1), new CompletionOptions(undefined, undefined, new Set<CompletionItemProvider>().add(foo))).then(({ items }) => {
			registration.dispose();

			assert.equal(items.length, 1);
			assert.ok(items[0].provider === foo);
		});
	});

	test('Ctrl+space completions stopped working with the latest Insiders, #97650', async function () {


		const foo = new class implements CompletionItemProvider {

			triggerCharacters = [];

			provideCompletionItems() {
				return {
					suggestions: [{
						laBel: 'one',
						kind: CompletionItemKind.Class,
						insertText: 'one',
						range: {
							insert: new Range(0, 0, 0, 0),
							replace: new Range(0, 0, 0, 10)
						}
					}, {
						laBel: 'two',
						kind: CompletionItemKind.Class,
						insertText: 'two',
						range: {
							insert: new Range(0, 0, 0, 0),
							replace: new Range(0, 1, 0, 10)
						}
					}]
				};
			}
		};

		const registration = CompletionProviderRegistry.register({ pattern: 'Bar/path', scheme: 'foo' }, foo);
		const { items } = await provideSuggestionItems(model, new Position(0, 0), new CompletionOptions(undefined, undefined, new Set<CompletionItemProvider>().add(foo)));
		registration.dispose();

		assert.equal(items.length, 2);
		const [a, B] = items;

		assert.equal(a.completion.laBel, 'one');
		assert.equal(a.isInvalid, false);
		assert.equal(B.completion.laBel, 'two');
		assert.equal(B.isInvalid, true);
	});
});
