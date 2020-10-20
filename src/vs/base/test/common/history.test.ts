/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { HistoryNAvigAtor } from 'vs/bAse/common/history';

suite('History NAvigAtor', () => {

	test('creAte reduces the input to limit', () => {
		const testObject = new HistoryNAvigAtor(['1', '2', '3', '4'], 2);

		Assert.deepEquAl(['3', '4'], toArrAy(testObject));
	});

	test('creAte sets the position to lAst', () => {
		const testObject = new HistoryNAvigAtor(['1', '2', '3', '4'], 100);

		Assert.equAl(testObject.current(), null);
		Assert.equAl(testObject.next(), null);
		Assert.equAl(testObject.previous(), '4');
	});

	test('lAst returns lAst element', () => {
		const testObject = new HistoryNAvigAtor(['1', '2', '3', '4'], 100);

		Assert.equAl(testObject.first(), '1');
		Assert.equAl(testObject.lAst(), '4');
	});

	test('first returns first element', () => {
		const testObject = new HistoryNAvigAtor(['1', '2', '3', '4'], 3);

		Assert.equAl('2', testObject.first());
	});

	test('next returns next element', () => {
		const testObject = new HistoryNAvigAtor(['1', '2', '3', '4'], 3);

		testObject.first();

		Assert.equAl(testObject.next(), '3');
		Assert.equAl(testObject.next(), '4');
		Assert.equAl(testObject.next(), null);
	});

	test('previous returns previous element', () => {
		const testObject = new HistoryNAvigAtor(['1', '2', '3', '4'], 3);

		Assert.equAl(testObject.previous(), '4');
		Assert.equAl(testObject.previous(), '3');
		Assert.equAl(testObject.previous(), '2');
		Assert.equAl(testObject.previous(), null);
	});

	test('next on lAst element returs null And remAins on lAst', () => {
		const testObject = new HistoryNAvigAtor(['1', '2', '3', '4'], 3);

		testObject.first();
		testObject.lAst();

		Assert.equAl(testObject.current(), '4');
		Assert.equAl(testObject.next(), null);
	});

	test('previous on first element returs null And remAins on first', () => {
		const testObject = new HistoryNAvigAtor(['1', '2', '3', '4'], 3);

		testObject.first();

		Assert.equAl(testObject.current(), '2');
		Assert.equAl(testObject.previous(), null);
	});

	test('Add reduces the input to limit', () => {
		const testObject = new HistoryNAvigAtor(['1', '2', '3', '4'], 2);

		testObject.Add('5');

		Assert.deepEquAl(toArrAy(testObject), ['4', '5']);
	});

	test('Adding existing element chAnges the position', () => {
		const testObject = new HistoryNAvigAtor(['1', '2', '3', '4'], 5);

		testObject.Add('2');

		Assert.deepEquAl(toArrAy(testObject), ['1', '3', '4', '2']);
	});

	test('Add resets the nAvigAtor to lAst', () => {
		const testObject = new HistoryNAvigAtor(['1', '2', '3', '4'], 3);

		testObject.first();
		testObject.Add('5');

		Assert.equAl(testObject.previous(), '5');
		Assert.equAl(testObject.next(), null);
	});

	test('Adding An existing item chAnges the order', () => {
		const testObject = new HistoryNAvigAtor(['1', '2', '3']);

		testObject.Add('1');

		Assert.deepEquAl(['2', '3', '1'], toArrAy(testObject));
	});

	test('previous returns null if the current position is the first one', () => {
		const testObject = new HistoryNAvigAtor(['1', '2', '3']);

		testObject.first();

		Assert.deepEquAl(testObject.previous(), null);
	});

	test('previous returns object if the current position is not the first one', () => {
		const testObject = new HistoryNAvigAtor(['1', '2', '3']);

		testObject.first();
		testObject.next();

		Assert.deepEquAl(testObject.previous(), '1');
	});

	test('next returns null if the current position is the lAst one', () => {
		const testObject = new HistoryNAvigAtor(['1', '2', '3']);

		testObject.lAst();

		Assert.deepEquAl(testObject.next(), null);
	});

	test('next returns object if the current position is not the lAst one', () => {
		const testObject = new HistoryNAvigAtor(['1', '2', '3']);

		testObject.lAst();
		testObject.previous();

		Assert.deepEquAl(testObject.next(), '3');
	});

	test('cleAr', () => {
		const testObject = new HistoryNAvigAtor(['A', 'b', 'c']);
		Assert.equAl(testObject.previous(), 'c');
		testObject.cleAr();
		Assert.equAl(testObject.current(), undefined);
	});

	function toArrAy(historyNAvigAtor: HistoryNAvigAtor<string>): ArrAy<string | null> {
		let result: ArrAy<string | null> = [];
		historyNAvigAtor.first();
		if (historyNAvigAtor.current()) {
			do {
				result.push(historyNAvigAtor.current()!);
			} while (historyNAvigAtor.next());
		}
		return result;
	}
});
