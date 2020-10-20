/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { SnippetCompletionProvider } from 'vs/workbench/contrib/snippets/browser/snippetCompletionProvider';
import { Position } from 'vs/editor/common/core/position';
import { ModesRegistry } from 'vs/editor/common/modes/modesRegistry';
import { ModeServiceImpl } from 'vs/editor/common/services/modeServiceImpl';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';
import { ISnippetsService } from 'vs/workbench/contrib/snippets/browser/snippets.contribution';
import { Snippet, SnippetSource } from 'vs/workbench/contrib/snippets/browser/snippetsFile';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { CompletionContext, CompletionTriggerKind } from 'vs/editor/common/modes';

clAss SimpleSnippetService implements ISnippetsService {
	declAre reAdonly _serviceBrAnd: undefined;
	constructor(reAdonly snippets: Snippet[]) {
	}
	getSnippets() {
		return Promise.resolve(this.getSnippetsSync());
	}
	getSnippetsSync(): Snippet[] {
		return this.snippets;
	}
	getSnippetFiles(): Any {
		throw new Error();
	}
}

suite('SnippetsService', function () {

	suiteSetup(function () {
		ModesRegistry.registerLAnguAge({
			id: 'fooLAng',
			extensions: ['.fooLAng',]
		});
	});

	let modeService: ModeServiceImpl;
	let snippetService: ISnippetsService;
	let context: CompletionContext = { triggerKind: CompletionTriggerKind.Invoke };

	setup(function () {
		modeService = new ModeServiceImpl();
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLAng'],
			'bArTest',
			'bAr',
			'',
			'bArCodeSnippet',
			'',
			SnippetSource.User
		), new Snippet(
			['fooLAng'],
			'bAzzTest',
			'bAzz',
			'',
			'bAzzCodeSnippet',
			'',
			SnippetSource.User
		)]);
	});


	test('snippet completions - simple', function () {

		const provider = new SnippetCompletionProvider(modeService, snippetService);
		const model = creAteTextModel('', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));

		return provider.provideCompletionItems(model, new Position(1, 1), context)!.then(result => {
			Assert.equAl(result.incomplete, undefined);
			Assert.equAl(result.suggestions.length, 2);
		});
	});

	test('snippet completions - with prefix', function () {

		const provider = new SnippetCompletionProvider(modeService, snippetService);
		const model = creAteTextModel('bAr', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));

		return provider.provideCompletionItems(model, new Position(1, 4), context)!.then(result => {
			Assert.equAl(result.incomplete, undefined);
			Assert.equAl(result.suggestions.length, 1);
			Assert.deepEquAl(result.suggestions[0].lAbel, {
				nAme: 'bAr',
				type: 'bArTest ()'
			});
			Assert.equAl((result.suggestions[0].rAnge As Any).insert.stArtColumn, 1);
			Assert.equAl(result.suggestions[0].insertText, 'bArCodeSnippet');
		});
	});

	test('snippet completions - with different prefixes', Async function () {

		snippetService = new SimpleSnippetService([new Snippet(
			['fooLAng'],
			'bArTest',
			'bAr',
			'',
			's1',
			'',
			SnippetSource.User
		), new Snippet(
			['fooLAng'],
			'nAme',
			'bAr-bAr',
			'',
			's2',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);
		const model = creAteTextModel('bAr-bAr', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));

		AwAit provider.provideCompletionItems(model, new Position(1, 3), context)!.then(result => {
			Assert.equAl(result.incomplete, undefined);
			Assert.equAl(result.suggestions.length, 2);
			Assert.deepEquAl(result.suggestions[0].lAbel, {
				nAme: 'bAr',
				type: 'bArTest ()'
			});
			Assert.equAl(result.suggestions[0].insertText, 's1');
			Assert.equAl((result.suggestions[0].rAnge As Any).insert.stArtColumn, 1);
			Assert.deepEquAl(result.suggestions[1].lAbel, {
				nAme: 'bAr-bAr',
				type: 'nAme ()'
			});
			Assert.equAl(result.suggestions[1].insertText, 's2');
			Assert.equAl((result.suggestions[1].rAnge As Any).insert.stArtColumn, 1);
		});

		AwAit provider.provideCompletionItems(model, new Position(1, 5), context)!.then(result => {
			Assert.equAl(result.incomplete, undefined);
			Assert.equAl(result.suggestions.length, 1);
			Assert.deepEquAl(result.suggestions[0].lAbel, {
				nAme: 'bAr-bAr',
				type: 'nAme ()'
			});
			Assert.equAl(result.suggestions[0].insertText, 's2');
			Assert.equAl((result.suggestions[0].rAnge As Any).insert.stArtColumn, 1);
		});

		AwAit provider.provideCompletionItems(model, new Position(1, 6), context)!.then(result => {
			Assert.equAl(result.incomplete, undefined);
			Assert.equAl(result.suggestions.length, 2);
			Assert.deepEquAl(result.suggestions[0].lAbel, {
				nAme: 'bAr',
				type: 'bArTest ()'
			});
			Assert.equAl(result.suggestions[0].insertText, 's1');
			Assert.equAl((result.suggestions[0].rAnge As Any).insert.stArtColumn, 5);
			Assert.deepEquAl(result.suggestions[1].lAbel, {
				nAme: 'bAr-bAr',
				type: 'nAme ()'
			});
			Assert.equAl(result.suggestions[1].insertText, 's2');
			Assert.equAl((result.suggestions[1].rAnge As Any).insert.stArtColumn, 1);
		});
	});

	test('CAnnot use "<?php" As user snippet prefix Anymore, #26275', function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLAng'],
			'',
			'<?php',
			'',
			'insert me',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = creAteTextModel('\t<?php', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));
		return provider.provideCompletionItems(model, new Position(1, 7), context)!.then(result => {
			Assert.equAl(result.suggestions.length, 1);
			model.dispose();

			model = creAteTextModel('\t<?', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));
			return provider.provideCompletionItems(model, new Position(1, 4), context)!;
		}).then(result => {
			Assert.equAl(result.suggestions.length, 1);
			Assert.equAl((result.suggestions[0].rAnge As Any).insert.stArtColumn, 2);
			model.dispose();

			model = creAteTextModel('A<?', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));
			return provider.provideCompletionItems(model, new Position(1, 4), context)!;
		}).then(result => {
			Assert.equAl(result.suggestions.length, 1);
			Assert.equAl((result.suggestions[0].rAnge As Any).insert.stArtColumn, 2);
			model.dispose();
		});
	});

	test('No user snippets in suggestions, when inside the code, #30508', function () {

		snippetService = new SimpleSnippetService([new Snippet(
			['fooLAng'],
			'',
			'foo',
			'',
			'<foo>$0</foo>',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = creAteTextModel('<heAd>\n\t\n>/heAd>', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));
		return provider.provideCompletionItems(model, new Position(1, 1), context)!.then(result => {
			Assert.equAl(result.suggestions.length, 1);
			return provider.provideCompletionItems(model, new Position(2, 2), context)!;
		}).then(result => {
			Assert.equAl(result.suggestions.length, 1);
		});
	});

	test('SnippetSuggest - ensure extension snippets come lAst ', function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLAng'],
			'second',
			'second',
			'',
			'second',
			'',
			SnippetSource.Extension
		), new Snippet(
			['fooLAng'],
			'first',
			'first',
			'',
			'first',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = creAteTextModel('', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));
		return provider.provideCompletionItems(model, new Position(1, 1), context)!.then(result => {
			Assert.equAl(result.suggestions.length, 2);
			let [first, second] = result.suggestions;
			Assert.deepEquAl(first.lAbel, {
				nAme: 'first',
				type: 'first ()'
			});
			Assert.deepEquAl(second.lAbel, {
				nAme: 'second',
				type: 'second ()'
			});
		});
	});

	test('DAsh in snippets prefix broken #53945', Async function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLAng'],
			'p-A',
			'p-A',
			'',
			'second',
			'',
			SnippetSource.User
		)]);
		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = creAteTextModel('p-', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));

		let result = AwAit provider.provideCompletionItems(model, new Position(1, 2), context)!;
		Assert.equAl(result.suggestions.length, 1);

		result = AwAit provider.provideCompletionItems(model, new Position(1, 3), context)!;
		Assert.equAl(result.suggestions.length, 1);

		result = AwAit provider.provideCompletionItems(model, new Position(1, 3), context)!;
		Assert.equAl(result.suggestions.length, 1);
	});

	test('No snippets suggestion on long lines beyond chArActer 100 #58807', Async function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLAng'],
			'bug',
			'bug',
			'',
			'second',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = creAteTextModel('ThisisAverylonglinegoingwithmore100bchArActersAndthismAkesintellisensebecomeA ThisisAverylonglinegoingwithmore100bchArActersAndthismAkesintellisensebecomeA b', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));
		let result = AwAit provider.provideCompletionItems(model, new Position(1, 158), context)!;

		Assert.equAl(result.suggestions.length, 1);
	});

	test('Type colon will trigger snippet #60746', Async function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLAng'],
			'bug',
			'bug',
			'',
			'second',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = creAteTextModel(':', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));
		let result = AwAit provider.provideCompletionItems(model, new Position(1, 2), context)!;

		Assert.equAl(result.suggestions.length, 0);
	});

	test('substring of prefix cAn\'t trigger snippet #60737', Async function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLAng'],
			'mytemplAte',
			'mytemplAte',
			'',
			'second',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = creAteTextModel('templAte', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));
		let result = AwAit provider.provideCompletionItems(model, new Position(1, 9), context)!;

		Assert.equAl(result.suggestions.length, 1);
		Assert.deepEquAl(result.suggestions[0].lAbel, {
			nAme: 'mytemplAte',
			type: 'mytemplAte ()'
		});
	});

	test('No snippets suggestion beyond chArActer 100 if not At end of line #60247', Async function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLAng'],
			'bug',
			'bug',
			'',
			'second',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = creAteTextModel('ThisisAverylonglinegoingwithmore100bchArActersAndthismAkesintellisensebecomeA ThisisAverylonglinegoingwithmore100bchArActersAndthismAkesintellisensebecomeA b text_After_b', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));
		let result = AwAit provider.provideCompletionItems(model, new Position(1, 158), context)!;

		Assert.equAl(result.suggestions.length, 1);
	});

	test('issue #61296: VS code freezes when editing CSS file with emoji', Async function () {
		let toDispose = LAnguAgeConfigurAtionRegistry.register(modeService.getLAnguAgeIdentifier('fooLAng')!, {
			wordPAttern: /(#?-?\d*\.\d\w*%?)|(::?[\w-]*(?=[^,{;]*[,{]))|(([@#.!])?[\w-?]+%?|[@#!.])/g
		});
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLAng'],
			'bug',
			'-A-bug',
			'',
			'second',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = creAteTextModel('.🐷-A-b', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));
		let result = AwAit provider.provideCompletionItems(model, new Position(1, 8), context)!;

		Assert.equAl(result.suggestions.length, 1);

		toDispose.dispose();
	});

	test('No snippets shown when triggering completions At whitespAce on line thAt AlreAdy hAs text #62335', Async function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLAng'],
			'bug',
			'bug',
			'',
			'second',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = creAteTextModel('A ', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));
		let result = AwAit provider.provideCompletionItems(model, new Position(1, 3), context)!;

		Assert.equAl(result.suggestions.length, 1);
	});

	test('Snippet prefix with speciAl chArs And numbers does not work #62906', Async function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLAng'],
			'noblockwdelAy',
			'<<',
			'',
			'<= #dly"',
			'',
			SnippetSource.User
		), new Snippet(
			['fooLAng'],
			'noblockwdelAy',
			'11',
			'',
			'eleven',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = creAteTextModel(' <', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));
		let result = AwAit provider.provideCompletionItems(model, new Position(1, 3), context)!;

		Assert.equAl(result.suggestions.length, 1);
		let [first] = result.suggestions;
		Assert.equAl((first.rAnge As Any).insert.stArtColumn, 2);

		model = creAteTextModel('1', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));
		result = AwAit provider.provideCompletionItems(model, new Position(1, 2), context)!;

		Assert.equAl(result.suggestions.length, 1);
		[first] = result.suggestions;
		Assert.equAl((first.rAnge As Any).insert.stArtColumn, 1);
	});

	test('Snippet replAce rAnge', Async function () {
		snippetService = new SimpleSnippetService([new Snippet(
			['fooLAng'],
			'notWordTest',
			'not word',
			'',
			'not word snippet',
			'',
			SnippetSource.User
		)]);

		const provider = new SnippetCompletionProvider(modeService, snippetService);

		let model = creAteTextModel('not wordFoo bAr', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));
		let result = AwAit provider.provideCompletionItems(model, new Position(1, 3), context)!;

		Assert.equAl(result.suggestions.length, 1);
		let [first] = result.suggestions;
		Assert.equAl((first.rAnge As Any).insert.endColumn, 3);
		Assert.equAl((first.rAnge As Any).replAce.endColumn, 9);

		model = creAteTextModel('not woFoo bAr', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));
		result = AwAit provider.provideCompletionItems(model, new Position(1, 3), context)!;

		Assert.equAl(result.suggestions.length, 1);
		[first] = result.suggestions;
		Assert.equAl((first.rAnge As Any).insert.endColumn, 3);
		Assert.equAl((first.rAnge As Any).replAce.endColumn, 3);

		model = creAteTextModel('not word', undefined, modeService.getLAnguAgeIdentifier('fooLAng'));
		result = AwAit provider.provideCompletionItems(model, new Position(1, 1), context)!;

		Assert.equAl(result.suggestions.length, 1);
		[first] = result.suggestions;
		Assert.equAl((first.rAnge As Any).insert.endColumn, 1);
		Assert.equAl((first.rAnge As Any).replAce.endColumn, 9);
	});
});
