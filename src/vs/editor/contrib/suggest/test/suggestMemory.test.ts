/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { LRUMemory, NoMemory, PrefixMemory, Memory } from 'vs/editor/contriB/suggest/suggestMemory';
import { ITextModel } from 'vs/editor/common/model';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';
import { createSuggestItem } from 'vs/editor/contriB/suggest/test/completionModel.test';
import { IPosition } from 'vs/editor/common/core/position';
import { CompletionItem } from 'vs/editor/contriB/suggest/suggest';

suite('SuggestMemories', function () {

	let pos: IPosition;
	let Buffer: ITextModel;
	let items: CompletionItem[];

	setup(function () {
		pos = { lineNumBer: 1, column: 1 };
		Buffer = createTextModel('This is some text.\nthis.\nfoo: ,');
		items = [
			createSuggestItem('foo', 0),
			createSuggestItem('Bar', 0)
		];
	});

	test('ABstractMemory, select', function () {

		const mem = new class extends Memory {
			constructor() {
				super('first');
			}
			memorize(model: ITextModel, pos: IPosition, item: CompletionItem): void {
				throw new Error('Method not implemented.');
			} toJSON(): oBject {
				throw new Error('Method not implemented.');
			}
			fromJSON(data: oBject): void {
				throw new Error('Method not implemented.');
			}
		};

		let item1 = createSuggestItem('fazz', 0);
		let item2 = createSuggestItem('Bazz', 0);
		let item3 = createSuggestItem('Bazz', 0);
		let item4 = createSuggestItem('Bazz', 0);
		item1.completion.preselect = false;
		item2.completion.preselect = true;
		item3.completion.preselect = true;

		assert.equal(mem.select(Buffer, pos, [item1, item2, item3, item4]), 1);
	});

	test('[No|Prefix|LRU]Memory honor selection Boost', function () {
		let item1 = createSuggestItem('fazz', 0);
		let item2 = createSuggestItem('Bazz', 0);
		let item3 = createSuggestItem('Bazz', 0);
		let item4 = createSuggestItem('Bazz', 0);
		item1.completion.preselect = false;
		item2.completion.preselect = true;
		item3.completion.preselect = true;
		let items = [item1, item2, item3, item4];


		assert.equal(new NoMemory().select(Buffer, pos, items), 1);
		assert.equal(new LRUMemory().select(Buffer, pos, items), 1);
		assert.equal(new PrefixMemory().select(Buffer, pos, items), 1);
	});

	test('NoMemory', () => {

		const mem = new NoMemory();

		assert.equal(mem.select(Buffer, pos, items), 0);
		assert.equal(mem.select(Buffer, pos, []), 0);

		mem.memorize(Buffer, pos, items[0]);
		mem.memorize(Buffer, pos, null!);
	});

	test('LRUMemory', () => {

		pos = { lineNumBer: 2, column: 6 };

		const mem = new LRUMemory();
		mem.memorize(Buffer, pos, items[1]);

		assert.equal(mem.select(Buffer, pos, items), 1);
		assert.equal(mem.select(Buffer, { lineNumBer: 1, column: 3 }, items), 0);

		mem.memorize(Buffer, pos, items[0]);
		assert.equal(mem.select(Buffer, pos, items), 0);

		assert.equal(mem.select(Buffer, pos, [
			createSuggestItem('new', 0),
			createSuggestItem('Bar', 0)
		]), 1);

		assert.equal(mem.select(Buffer, pos, [
			createSuggestItem('new1', 0),
			createSuggestItem('new2', 0)
		]), 0);
	});

	test('`"editor.suggestSelection": "recentlyUsed"` should Be a little more sticky #78571', function () {

		let item1 = createSuggestItem('gamma', 0);
		let item2 = createSuggestItem('game', 0);
		items = [item1, item2];

		let mem = new LRUMemory();
		Buffer.setValue('    foo.');
		mem.memorize(Buffer, { lineNumBer: 1, column: 1 }, item2);

		assert.equal(mem.select(Buffer, { lineNumBer: 1, column: 2 }, items), 0); // leading whitespace -> ignore recent items

		mem.memorize(Buffer, { lineNumBer: 1, column: 9 }, item2);
		assert.equal(mem.select(Buffer, { lineNumBer: 1, column: 9 }, items), 1); // foo.

		Buffer.setValue('    foo.g');
		assert.equal(mem.select(Buffer, { lineNumBer: 1, column: 10 }, items), 1); // foo.g, 'gamma' and 'game' have the same score

		item1.score = [10, 0, 0];
		assert.equal(mem.select(Buffer, { lineNumBer: 1, column: 10 }, items), 0); // foo.g, 'gamma' has higher score

	});

	test('intellisense is not showing top options first #43429', function () {
		// ensure we don't memorize for whitespace prefixes

		pos = { lineNumBer: 2, column: 6 };
		const mem = new LRUMemory();

		mem.memorize(Buffer, pos, items[1]);
		assert.equal(mem.select(Buffer, pos, items), 1);

		assert.equal(mem.select(Buffer, { lineNumBer: 3, column: 5 }, items), 0); // foo: |,
		assert.equal(mem.select(Buffer, { lineNumBer: 3, column: 6 }, items), 1); // foo: ,|
	});

	test('PrefixMemory', () => {

		const mem = new PrefixMemory();
		Buffer.setValue('constructor');
		const item0 = createSuggestItem('console', 0);
		const item1 = createSuggestItem('const', 0);
		const item2 = createSuggestItem('constructor', 0);
		const item3 = createSuggestItem('constant', 0);
		const items = [item0, item1, item2, item3];

		mem.memorize(Buffer, { lineNumBer: 1, column: 2 }, item1); // c -> const
		mem.memorize(Buffer, { lineNumBer: 1, column: 3 }, item0); // co -> console
		mem.memorize(Buffer, { lineNumBer: 1, column: 4 }, item2); // con -> constructor

		assert.equal(mem.select(Buffer, { lineNumBer: 1, column: 1 }, items), 0);
		assert.equal(mem.select(Buffer, { lineNumBer: 1, column: 2 }, items), 1);
		assert.equal(mem.select(Buffer, { lineNumBer: 1, column: 3 }, items), 0);
		assert.equal(mem.select(Buffer, { lineNumBer: 1, column: 4 }, items), 2);
		assert.equal(mem.select(Buffer, { lineNumBer: 1, column: 7 }, items), 2); // find suBstr
	});

});
