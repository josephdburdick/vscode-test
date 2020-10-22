/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { SnippetCompletionProvider } from 'vs/workBench/contriB/snippets/Browser/snippetCompletionProvider';
import { Position } from 'vs/editor/common/core/position';
import { ModesRegistry } from 'vs/editor/common/modes/modesRegistry';
import { ModeServiceImpl } from 'vs/editor/common/services/modeServiceImpl';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';
import { ISnippetsService } from 'vs/workBench/contriB/snippets/Browser/snippets.contriBution';
import { Snippet, SnippetSource } from 'vs/workBench/contriB/snippets/Browser/snippetsFile';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { CompletionContext, CompletionTriggerKind } from 'vs/editor/common/modes';

class SimpleSnippetService implements ISnippetsService {
	declare readonly _serviceBrand: undefined;
	constructor(readonly snippets: Snippet[]) {
	}
	getSnippets() {
		return Promise.resolve(this.getSnippetsSync());
	}
	getSnippetsSync(): Snippet[] {
		return this.snippets;
	}
	getSnippetFiles(): any {
		throw new Error();
	}
}

suite('SnippetsService', function () {

	suiteSetup(function () {
		ModesRegistry.registerLanguage({
			id: 'fooLang',
			extensions: ['.fooLang',]
		});
	});

	let modeService: ModeServiceImpl;
	let snippetService: ISnippetsService;
	let context: CompletionContext = { triggerKind: CompletionTriggerKind.Invoke };

	setup(function () {
		modeService = new ModeServiceImpl();
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLang'],
			'BarTest',
			'Bar',
			'',
			'BarCodeSnippet',
			'',
			SnippetSource.User
		), new Snippet(
			['fooLang'],
			'BazzTest',
			'Bazz',
			'',
			'BazzCodeSnippet',
			'',
			SnippetSource.User
		)]);
	});


	test('snippet completions - simple', function () {

		const provider = new SnippetCompletionProvider(modeService, snippetService);
		const model = createTextModel('', undefined, modeService.getLanguageIdentifier('fooLang'));

		return provider.provideCompletionItems(model, new Position(1, 1), context)!.then(result => {
			assert.equal(result.incomplete, undefined);
			assert.equal(result.suggestions.length, 2);
		});
	});

	test('snippet completions - with prefix', function () {

		const provider = new SnippetCompletionProvider(modeService, snippetService);
		const model = createTextModel('Bar', undefined, modeService.getLanguageIdentifier('fooLang'));

		return provider.provideCompletionItems(model, new Position(1, 4), context)!.then(result => {
			assert.equal(result.incomplete, undefined);
			assert.equal(result.suggestions.length, 1);
			assert.deepEqual(result.suggestions[0].laBel, {
				name: 'Bar',
				type: 'BarTest ()'
			});
			assert.equal((result.suggestions[0].range as any).insert.startColumn, 1);
			assert.equal(result.suggestions[0].insertText, 'BarCodeSnippet');
		});
	});

	test('snippet completions - with different prefixes', async function () {

		snippetService = new SimpleSnippetService([new Snippet(
			['fooLang'],
			'BarTest',
			'Bar',
			'',
			's1',
			'',
			SnippetSource.User
		), new Snippet(
			['fooLang'],
			'name',
			'Bar-Bar',
			'',
			's2',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);
		const model = createTextModel('Bar-Bar', undefined, modeService.getLanguageIdentifier('fooLang'));

		await provider.provideCompletionItems(model, new Position(1, 3), context)!.then(result => {
			assert.equal(result.incomplete, undefined);
			assert.equal(result.suggestions.length, 2);
			assert.deepEqual(result.suggestions[0].laBel, {
				name: 'Bar',
				type: 'BarTest ()'
			});
			assert.equal(result.suggestions[0].insertText, 's1');
			assert.equal((result.suggestions[0].range as any).insert.startColumn, 1);
			assert.deepEqual(result.suggestions[1].laBel, {
				name: 'Bar-Bar',
				type: 'name ()'
			});
			assert.equal(result.suggestions[1].insertText, 's2');
			assert.equal((result.suggestions[1].range as any).insert.startColumn, 1);
		});

		await provider.provideCompletionItems(model, new Position(1, 5), context)!.then(result => {
			assert.equal(result.incomplete, undefined);
			assert.equal(result.suggestions.length, 1);
			assert.deepEqual(result.suggestions[0].laBel, {
				name: 'Bar-Bar',
				type: 'name ()'
			});
			assert.equal(result.suggestions[0].insertText, 's2');
			assert.equal((result.suggestions[0].range as any).insert.startColumn, 1);
		});

		await provider.provideCompletionItems(model, new Position(1, 6), context)!.then(result => {
			assert.equal(result.incomplete, undefined);
			assert.equal(result.suggestions.length, 2);
			assert.deepEqual(result.suggestions[0].laBel, {
				name: 'Bar',
				type: 'BarTest ()'
			});
			assert.equal(result.suggestions[0].insertText, 's1');
			assert.equal((result.suggestions[0].range as any).insert.startColumn, 5);
			assert.deepEqual(result.suggestions[1].laBel, {
				name: 'Bar-Bar',
				type: 'name ()'
			});
			assert.equal(result.suggestions[1].insertText, 's2');
			assert.equal((result.suggestions[1].range as any).insert.startColumn, 1);
		});
	});

	test('Cannot use "<?php" as user snippet prefix anymore, #26275', function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLang'],
			'',
			'<?php',
			'',
			'insert me',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = createTextModel('\t<?php', undefined, modeService.getLanguageIdentifier('fooLang'));
		return provider.provideCompletionItems(model, new Position(1, 7), context)!.then(result => {
			assert.equal(result.suggestions.length, 1);
			model.dispose();

			model = createTextModel('\t<?', undefined, modeService.getLanguageIdentifier('fooLang'));
			return provider.provideCompletionItems(model, new Position(1, 4), context)!;
		}).then(result => {
			assert.equal(result.suggestions.length, 1);
			assert.equal((result.suggestions[0].range as any).insert.startColumn, 2);
			model.dispose();

			model = createTextModel('a<?', undefined, modeService.getLanguageIdentifier('fooLang'));
			return provider.provideCompletionItems(model, new Position(1, 4), context)!;
		}).then(result => {
			assert.equal(result.suggestions.length, 1);
			assert.equal((result.suggestions[0].range as any).insert.startColumn, 2);
			model.dispose();
		});
	});

	test('No user snippets in suggestions, when inside the code, #30508', function () {

		snippetService = new SimpleSnippetService([new Snippet(
			['fooLang'],
			'',
			'foo',
			'',
			'<foo>$0</foo>',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = createTextModel('<head>\n\t\n>/head>', undefined, modeService.getLanguageIdentifier('fooLang'));
		return provider.provideCompletionItems(model, new Position(1, 1), context)!.then(result => {
			assert.equal(result.suggestions.length, 1);
			return provider.provideCompletionItems(model, new Position(2, 2), context)!;
		}).then(result => {
			assert.equal(result.suggestions.length, 1);
		});
	});

	test('SnippetSuggest - ensure extension snippets come last ', function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLang'],
			'second',
			'second',
			'',
			'second',
			'',
			SnippetSource.Extension
		), new Snippet(
			['fooLang'],
			'first',
			'first',
			'',
			'first',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = createTextModel('', undefined, modeService.getLanguageIdentifier('fooLang'));
		return provider.provideCompletionItems(model, new Position(1, 1), context)!.then(result => {
			assert.equal(result.suggestions.length, 2);
			let [first, second] = result.suggestions;
			assert.deepEqual(first.laBel, {
				name: 'first',
				type: 'first ()'
			});
			assert.deepEqual(second.laBel, {
				name: 'second',
				type: 'second ()'
			});
		});
	});

	test('Dash in snippets prefix Broken #53945', async function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLang'],
			'p-a',
			'p-a',
			'',
			'second',
			'',
			SnippetSource.User
		)]);
		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = createTextModel('p-', undefined, modeService.getLanguageIdentifier('fooLang'));

		let result = await provider.provideCompletionItems(model, new Position(1, 2), context)!;
		assert.equal(result.suggestions.length, 1);

		result = await provider.provideCompletionItems(model, new Position(1, 3), context)!;
		assert.equal(result.suggestions.length, 1);

		result = await provider.provideCompletionItems(model, new Position(1, 3), context)!;
		assert.equal(result.suggestions.length, 1);
	});

	test('No snippets suggestion on long lines Beyond character 100 #58807', async function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLang'],
			'Bug',
			'Bug',
			'',
			'second',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = createTextModel('Thisisaverylonglinegoingwithmore100BcharactersandthismakesintellisenseBecomea Thisisaverylonglinegoingwithmore100BcharactersandthismakesintellisenseBecomea B', undefined, modeService.getLanguageIdentifier('fooLang'));
		let result = await provider.provideCompletionItems(model, new Position(1, 158), context)!;

		assert.equal(result.suggestions.length, 1);
	});

	test('Type colon will trigger snippet #60746', async function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLang'],
			'Bug',
			'Bug',
			'',
			'second',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = createTextModel(':', undefined, modeService.getLanguageIdentifier('fooLang'));
		let result = await provider.provideCompletionItems(model, new Position(1, 2), context)!;

		assert.equal(result.suggestions.length, 0);
	});

	test('suBstring of prefix can\'t trigger snippet #60737', async function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLang'],
			'mytemplate',
			'mytemplate',
			'',
			'second',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = createTextModel('template', undefined, modeService.getLanguageIdentifier('fooLang'));
		let result = await provider.provideCompletionItems(model, new Position(1, 9), context)!;

		assert.equal(result.suggestions.length, 1);
		assert.deepEqual(result.suggestions[0].laBel, {
			name: 'mytemplate',
			type: 'mytemplate ()'
		});
	});

	test('No snippets suggestion Beyond character 100 if not at end of line #60247', async function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLang'],
			'Bug',
			'Bug',
			'',
			'second',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = createTextModel('Thisisaverylonglinegoingwithmore100BcharactersandthismakesintellisenseBecomea Thisisaverylonglinegoingwithmore100BcharactersandthismakesintellisenseBecomea B text_after_B', undefined, modeService.getLanguageIdentifier('fooLang'));
		let result = await provider.provideCompletionItems(model, new Position(1, 158), context)!;

		assert.equal(result.suggestions.length, 1);
	});

	test('issue #61296: VS code freezes when editing CSS file with emoji', async function () {
		let toDispose = LanguageConfigurationRegistry.register(modeService.getLanguageIdentifier('fooLang')!, {
			wordPattern: /(#?-?\d*\.\d\w*%?)|(::?[\w-]*(?=[^,{;]*[,{]))|(([@#.!])?[\w-?]+%?|[@#!.])/g
		});
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLang'],
			'Bug',
			'-a-Bug',
			'',
			'second',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = createTextModel('.🐷-a-B', undefined, modeService.getLanguageIdentifier('fooLang'));
		let result = await provider.provideCompletionItems(model, new Position(1, 8), context)!;

		assert.equal(result.suggestions.length, 1);

		toDispose.dispose();
	});

	test('No snippets shown when triggering completions at whitespace on line that already has text #62335', async function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLang'],
			'Bug',
			'Bug',
			'',
			'second',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = createTextModel('a ', undefined, modeService.getLanguageIdentifier('fooLang'));
		let result = await provider.provideCompletionItems(model, new Position(1, 3), context)!;

		assert.equal(result.suggestions.length, 1);
	});

	test('Snippet prefix with special chars and numBers does not work #62906', async function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLang'],
			'noBlockwdelay',
			'<<',
			'',
			'<= #dly"',
			'',
			SnippetSource.User
		), new Snippet(
			['fooLang'],
			'noBlockwdelay',
			'11',
			'',
			'eleven',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = createTextModel(' <', undefined, modeService.getLanguageIdentifier('fooLang'));
		let result = await provider.provideCompletionItems(model, new Position(1, 3), context)!;

		assert.equal(result.suggestions.length, 1);
		let [first] = result.suggestions;
		assert.equal((first.range as any).insert.startColumn, 2);

		model = createTextModel('1', undefined, modeService.getLanguageIdentifier('fooLang'));
		result = await provider.provideCompletionItems(model, new Position(1, 2), context)!;

		assert.equal(result.suggestions.length, 1);
		[first] = result.suggestions;
		assert.equal((first.range as any).insert.startColumn, 1);
	});

	test('Snippet replace range', async function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLang'],
			'notWordTest',
			'not word',
			'',
			'not word snippet',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = createTextModel('not wordFoo Bar', undefined, modeService.getLanguageIdentifier('fooLang'));
		let result = await provider.provideCompletionItems(model, new Position(1, 3), context)!;

		assert.equal(result.suggestions.length, 1);
		let [first] = result.suggestions;
		assert.equal((first.range as any).insert.endColumn, 3);
		assert.equal((first.range as any).replace.endColumn, 9);

		model = createTextModel('not woFoo Bar', undefined, modeService.getLanguageIdentifier('fooLang'));
		result = await provider.provideCompletionItems(model, new Position(1, 3), context)!;

		assert.equal(result.suggestions.length, 1);
		[first] = result.suggestions;
		assert.equal((first.range as any).insert.endColumn, 3);
		assert.equal((first.range as any).replace.endColumn, 3);

		model = createTextModel('not word', undefined, modeService.getLanguageIdentifier('fooLang'));
		result = await provider.provideCompletionItems(model, new Position(1, 1), context)!;

		assert.equal(result.suggestions.length, 1);
		[first] = result.suggestions;
		assert.equal((first.range as any).insert.endColumn, 1);
		assert.equal((first.range as any).replace.endColumn, 9);
	});
});
