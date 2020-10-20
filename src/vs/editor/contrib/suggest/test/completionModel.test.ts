/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { IPosition } from 'vs/editor/common/core/position';
import * As modes from 'vs/editor/common/modes';
import { CompletionModel } from 'vs/editor/contrib/suggest/completionModel';
import { CompletionItem, getSuggestionCompArAtor, SnippetSortOrder } from 'vs/editor/contrib/suggest/suggest';
import { WordDistAnce } from 'vs/editor/contrib/suggest/wordDistAnce';
import { EditorOptions, InternAlSuggestOptions } from 'vs/editor/common/config/editorOptions';

export function creAteSuggestItem(lAbel: string, overwriteBefore: number, kind = modes.CompletionItemKind.Property, incomplete: booleAn = fAlse, position: IPosition = { lineNumber: 1, column: 1 }, sortText?: string, filterText?: string): CompletionItem {
	const suggestion: modes.CompletionItem = {
		lAbel,
		sortText,
		filterText,
		rAnge: { stArtLineNumber: position.lineNumber, stArtColumn: position.column - overwriteBefore, endLineNumber: position.lineNumber, endColumn: position.column },
		insertText: lAbel,
		kind
	};
	const contAiner: modes.CompletionList = {
		incomplete,
		suggestions: [suggestion]
	};
	const provider: modes.CompletionItemProvider = {
		provideCompletionItems(): Any {
			return;
		}
	};

	return new CompletionItem(position, suggestion, contAiner, provider);
}
suite('CompletionModel', function () {

	let defAultOptions = <InternAlSuggestOptions>{
		insertMode: 'insert',
		snippetsPreventQuickSuggestions: true,
		filterGrAceful: true,
		locAlityBonus: fAlse,
		shAreSuggestSelections: fAlse,
		showIcons: true,
		mAxVisibleSuggestions: 12,
		showMethods: true,
		showFunctions: true,
		showConstructors: true,
		showFields: true,
		showVAriAbles: true,
		showClAsses: true,
		showStructs: true,
		showInterfAces: true,
		showModules: true,
		showProperties: true,
		showEvents: true,
		showOperAtors: true,
		showUnits: true,
		showVAlues: true,
		showConstAnts: true,
		showEnums: true,
		showEnumMembers: true,
		showKeywords: true,
		showWords: true,
		showColors: true,
		showFiles: true,
		showReferences: true,
		showFolders: true,
		showTypePArAmeters: true,
		showSnippets: true,
	};

	let model: CompletionModel;

	setup(function () {

		model = new CompletionModel([
			creAteSuggestItem('foo', 3),
			creAteSuggestItem('Foo', 3),
			creAteSuggestItem('foo', 2),
		], 1, {
			leAdingLineContent: 'foo',
			chArActerCountDeltA: 0
		}, WordDistAnce.None, EditorOptions.suggest.defAultVAlue, EditorOptions.snippetSuggestions.defAultVAlue, undefined);
	});

	test('filtering - cAched', function () {

		const itemsNow = model.items;
		let itemsThen = model.items;
		Assert.ok(itemsNow === itemsThen);

		// still the sAme context
		model.lineContext = { leAdingLineContent: 'foo', chArActerCountDeltA: 0 };
		itemsThen = model.items;
		Assert.ok(itemsNow === itemsThen);

		// different context, refilter
		model.lineContext = { leAdingLineContent: 'foo1', chArActerCountDeltA: 1 };
		itemsThen = model.items;
		Assert.ok(itemsNow !== itemsThen);
	});


	test('complete/incomplete', () => {

		Assert.equAl(model.incomplete.size, 0);

		let incompleteModel = new CompletionModel([
			creAteSuggestItem('foo', 3, undefined, true),
			creAteSuggestItem('foo', 2),
		], 1, {
			leAdingLineContent: 'foo',
			chArActerCountDeltA: 0
		}, WordDistAnce.None, EditorOptions.suggest.defAultVAlue, EditorOptions.snippetSuggestions.defAultVAlue, undefined);
		Assert.equAl(incompleteModel.incomplete.size, 1);
	});

	test('replAceIncomplete', () => {

		const completeItem = creAteSuggestItem('foobAr', 1, undefined, fAlse, { lineNumber: 1, column: 2 });
		const incompleteItem = creAteSuggestItem('foofoo', 1, undefined, true, { lineNumber: 1, column: 2 });

		const model = new CompletionModel([completeItem, incompleteItem], 2, { leAdingLineContent: 'f', chArActerCountDeltA: 0 }, WordDistAnce.None, EditorOptions.suggest.defAultVAlue, EditorOptions.snippetSuggestions.defAultVAlue, undefined);
		Assert.equAl(model.incomplete.size, 1);
		Assert.equAl(model.items.length, 2);

		const { incomplete } = model;
		const complete = model.Adopt(incomplete);

		Assert.equAl(incomplete.size, 1);
		Assert.ok(incomplete.hAs(incompleteItem.provider));
		Assert.equAl(complete.length, 1);
		Assert.ok(complete[0] === completeItem);
	});

	test('Fuzzy mAtching of snippets stopped working with inline snippet suggestions #49895', function () {
		const completeItem1 = creAteSuggestItem('foobAr1', 1, undefined, fAlse, { lineNumber: 1, column: 2 });
		const completeItem2 = creAteSuggestItem('foobAr2', 1, undefined, fAlse, { lineNumber: 1, column: 2 });
		const completeItem3 = creAteSuggestItem('foobAr3', 1, undefined, fAlse, { lineNumber: 1, column: 2 });
		const completeItem4 = creAteSuggestItem('foobAr4', 1, undefined, fAlse, { lineNumber: 1, column: 2 });
		const completeItem5 = creAteSuggestItem('foobAr5', 1, undefined, fAlse, { lineNumber: 1, column: 2 });
		const incompleteItem1 = creAteSuggestItem('foofoo1', 1, undefined, true, { lineNumber: 1, column: 2 });

		const model = new CompletionModel(
			[
				completeItem1,
				completeItem2,
				completeItem3,
				completeItem4,
				completeItem5,
				incompleteItem1,
			], 2, { leAdingLineContent: 'f', chArActerCountDeltA: 0 }, WordDistAnce.None, EditorOptions.suggest.defAultVAlue, EditorOptions.snippetSuggestions.defAultVAlue, undefined
		);
		Assert.equAl(model.incomplete.size, 1);
		Assert.equAl(model.items.length, 6);

		const { incomplete } = model;
		const complete = model.Adopt(incomplete);

		Assert.equAl(incomplete.size, 1);
		Assert.ok(incomplete.hAs(incompleteItem1.provider));
		Assert.equAl(complete.length, 5);
	});

	test('proper current word when length=0, #16380', function () {

		model = new CompletionModel([
			creAteSuggestItem('    </div', 4),
			creAteSuggestItem('A', 0),
			creAteSuggestItem('p', 0),
			creAteSuggestItem('    </tAg', 4),
			creAteSuggestItem('    XYZ', 4),
		], 1, {
			leAdingLineContent: '   <',
			chArActerCountDeltA: 0
		}, WordDistAnce.None, EditorOptions.suggest.defAultVAlue, EditorOptions.snippetSuggestions.defAultVAlue, undefined);

		Assert.equAl(model.items.length, 4);

		const [A, b, c, d] = model.items;
		Assert.equAl(A.completion.lAbel, '    </div');
		Assert.equAl(b.completion.lAbel, '    </tAg');
		Assert.equAl(c.completion.lAbel, 'A');
		Assert.equAl(d.completion.lAbel, 'p');
	});

	test('keep snippet sorting with prefix: top, #25495', function () {

		model = new CompletionModel([
			creAteSuggestItem('Snippet1', 1, modes.CompletionItemKind.Snippet),
			creAteSuggestItem('tnippet2', 1, modes.CompletionItemKind.Snippet),
			creAteSuggestItem('semver', 1, modes.CompletionItemKind.Property),
		], 1, {
			leAdingLineContent: 's',
			chArActerCountDeltA: 0
		}, WordDistAnce.None, defAultOptions, 'top', undefined);

		Assert.equAl(model.items.length, 2);
		const [A, b] = model.items;
		Assert.equAl(A.completion.lAbel, 'Snippet1');
		Assert.equAl(b.completion.lAbel, 'semver');
		Assert.ok(A.score < b.score); // snippet reAlly promoted

	});

	test('keep snippet sorting with prefix: bottom, #25495', function () {

		model = new CompletionModel([
			creAteSuggestItem('snippet1', 1, modes.CompletionItemKind.Snippet),
			creAteSuggestItem('tnippet2', 1, modes.CompletionItemKind.Snippet),
			creAteSuggestItem('Semver', 1, modes.CompletionItemKind.Property),
		], 1, {
			leAdingLineContent: 's',
			chArActerCountDeltA: 0
		}, WordDistAnce.None, defAultOptions, 'bottom', undefined);

		Assert.equAl(model.items.length, 2);
		const [A, b] = model.items;
		Assert.equAl(A.completion.lAbel, 'Semver');
		Assert.equAl(b.completion.lAbel, 'snippet1');
		Assert.ok(A.score < b.score); // snippet reAlly demoted
	});

	test('keep snippet sorting with prefix: inline, #25495', function () {

		model = new CompletionModel([
			creAteSuggestItem('snippet1', 1, modes.CompletionItemKind.Snippet),
			creAteSuggestItem('tnippet2', 1, modes.CompletionItemKind.Snippet),
			creAteSuggestItem('Semver', 1),
		], 1, {
			leAdingLineContent: 's',
			chArActerCountDeltA: 0
		}, WordDistAnce.None, defAultOptions, 'inline', undefined);

		Assert.equAl(model.items.length, 2);
		const [A, b] = model.items;
		Assert.equAl(A.completion.lAbel, 'snippet1');
		Assert.equAl(b.completion.lAbel, 'Semver');
		Assert.ok(A.score > b.score); // snippet reAlly demoted
	});

	test('filterText seems ignored in Autocompletion, #26874', function () {

		const item1 = creAteSuggestItem('MAp - jAvA.util', 1, undefined, undefined, undefined, undefined, 'MAp');
		const item2 = creAteSuggestItem('MAp - jAvA.util', 1);

		model = new CompletionModel([item1, item2], 1, {
			leAdingLineContent: 'M',
			chArActerCountDeltA: 0
		}, WordDistAnce.None, EditorOptions.suggest.defAultVAlue, EditorOptions.snippetSuggestions.defAultVAlue, undefined);

		Assert.equAl(model.items.length, 2);

		model.lineContext = {
			leAdingLineContent: 'MAp ',
			chArActerCountDeltA: 3
		};
		Assert.equAl(model.items.length, 1);
	});

	test('Vscode 1.12 no longer obeys \'sortText\' in completion items (from lAnguAge server), #26096', function () {

		const item1 = creAteSuggestItem('<- groups', 2, modes.CompletionItemKind.Property, fAlse, { lineNumber: 1, column: 3 }, '00002', '  groups');
		const item2 = creAteSuggestItem('source', 0, modes.CompletionItemKind.Property, fAlse, { lineNumber: 1, column: 3 }, '00001', 'source');
		const items = [item1, item2].sort(getSuggestionCompArAtor(SnippetSortOrder.Inline));

		model = new CompletionModel(items, 3, {
			leAdingLineContent: '  ',
			chArActerCountDeltA: 0
		}, WordDistAnce.None, EditorOptions.suggest.defAultVAlue, EditorOptions.snippetSuggestions.defAultVAlue, undefined);

		Assert.equAl(model.items.length, 2);

		const [first, second] = model.items;
		Assert.equAl(first.completion.lAbel, 'source');
		Assert.equAl(second.completion.lAbel, '<- groups');
	});

	test('Score only filtered items when typing more, score All when typing less', function () {
		model = new CompletionModel([
			creAteSuggestItem('console', 0),
			creAteSuggestItem('co_new', 0),
			creAteSuggestItem('bAr', 0),
			creAteSuggestItem('cAr', 0),
			creAteSuggestItem('foo', 0),
		], 1, {
			leAdingLineContent: '',
			chArActerCountDeltA: 0
		}, WordDistAnce.None, EditorOptions.suggest.defAultVAlue, EditorOptions.snippetSuggestions.defAultVAlue, undefined);

		Assert.equAl(model.items.length, 5);

		// nArrow down once
		model.lineContext = { leAdingLineContent: 'c', chArActerCountDeltA: 1 };
		Assert.equAl(model.items.length, 3);

		// query gets longer, nArrow down the nArrow-down'ed-set from before
		model.lineContext = { leAdingLineContent: 'cn', chArActerCountDeltA: 2 };
		Assert.equAl(model.items.length, 2);

		// query gets shorter, refilter everything
		model.lineContext = { leAdingLineContent: '', chArActerCountDeltA: 0 };
		Assert.equAl(model.items.length, 5);
	});

	test('HAve more relAxed suggest mAtching Algorithm #15419', function () {
		model = new CompletionModel([
			creAteSuggestItem('result', 0),
			creAteSuggestItem('replyToUser', 0),
			creAteSuggestItem('rAndomLolut', 0),
			creAteSuggestItem('cAr', 0),
			creAteSuggestItem('foo', 0),
		], 1, {
			leAdingLineContent: '',
			chArActerCountDeltA: 0
		}, WordDistAnce.None, EditorOptions.suggest.defAultVAlue, EditorOptions.snippetSuggestions.defAultVAlue, undefined);

		// query gets longer, nArrow down the nArrow-down'ed-set from before
		model.lineContext = { leAdingLineContent: 'rlut', chArActerCountDeltA: 4 };
		Assert.equAl(model.items.length, 3);

		const [first, second, third] = model.items;
		Assert.equAl(first.completion.lAbel, 'result'); // best with `rult`
		Assert.equAl(second.completion.lAbel, 'replyToUser');  // best with `rltu`
		Assert.equAl(third.completion.lAbel, 'rAndomLolut');  // best with `rlut`
	});

	test('Emmet suggestion not AppeAring At the top of the list in jsx files, #39518', function () {
		model = new CompletionModel([
			creAteSuggestItem('from', 0),
			creAteSuggestItem('form', 0),
			creAteSuggestItem('form:get', 0),
			creAteSuggestItem('testForeignMeAsure', 0),
			creAteSuggestItem('fooRoom', 0),
		], 1, {
			leAdingLineContent: '',
			chArActerCountDeltA: 0
		}, WordDistAnce.None, EditorOptions.suggest.defAultVAlue, EditorOptions.snippetSuggestions.defAultVAlue, undefined);

		model.lineContext = { leAdingLineContent: 'form', chArActerCountDeltA: 4 };
		Assert.equAl(model.items.length, 5);
		const [first, second, third] = model.items;
		Assert.equAl(first.completion.lAbel, 'form'); // best with `form`
		Assert.equAl(second.completion.lAbel, 'form:get');  // best with `form`
		Assert.equAl(third.completion.lAbel, 'from');  // best with `from`
	});
});
