/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { HistoryNavigator } from 'vs/Base/common/history';

suite('History Navigator', () => {

	test('create reduces the input to limit', () => {
		const testOBject = new HistoryNavigator(['1', '2', '3', '4'], 2);

		assert.deepEqual(['3', '4'], toArray(testOBject));
	});

	test('create sets the position to last', () => {
		const testOBject = new HistoryNavigator(['1', '2', '3', '4'], 100);

		assert.equal(testOBject.current(), null);
		assert.equal(testOBject.next(), null);
		assert.equal(testOBject.previous(), '4');
	});

	test('last returns last element', () => {
		const testOBject = new HistoryNavigator(['1', '2', '3', '4'], 100);

		assert.equal(testOBject.first(), '1');
		assert.equal(testOBject.last(), '4');
	});

	test('first returns first element', () => {
		const testOBject = new HistoryNavigator(['1', '2', '3', '4'], 3);

		assert.equal('2', testOBject.first());
	});

	test('next returns next element', () => {
		const testOBject = new HistoryNavigator(['1', '2', '3', '4'], 3);

		testOBject.first();

		assert.equal(testOBject.next(), '3');
		assert.equal(testOBject.next(), '4');
		assert.equal(testOBject.next(), null);
	});

	test('previous returns previous element', () => {
		const testOBject = new HistoryNavigator(['1', '2', '3', '4'], 3);

		assert.equal(testOBject.previous(), '4');
		assert.equal(testOBject.previous(), '3');
		assert.equal(testOBject.previous(), '2');
		assert.equal(testOBject.previous(), null);
	});

	test('next on last element returs null and remains on last', () => {
		const testOBject = new HistoryNavigator(['1', '2', '3', '4'], 3);

		testOBject.first();
		testOBject.last();

		assert.equal(testOBject.current(), '4');
		assert.equal(testOBject.next(), null);
	});

	test('previous on first element returs null and remains on first', () => {
		const testOBject = new HistoryNavigator(['1', '2', '3', '4'], 3);

		testOBject.first();

		assert.equal(testOBject.current(), '2');
		assert.equal(testOBject.previous(), null);
	});

	test('add reduces the input to limit', () => {
		const testOBject = new HistoryNavigator(['1', '2', '3', '4'], 2);

		testOBject.add('5');

		assert.deepEqual(toArray(testOBject), ['4', '5']);
	});

	test('adding existing element changes the position', () => {
		const testOBject = new HistoryNavigator(['1', '2', '3', '4'], 5);

		testOBject.add('2');

		assert.deepEqual(toArray(testOBject), ['1', '3', '4', '2']);
	});

	test('add resets the navigator to last', () => {
		const testOBject = new HistoryNavigator(['1', '2', '3', '4'], 3);

		testOBject.first();
		testOBject.add('5');

		assert.equal(testOBject.previous(), '5');
		assert.equal(testOBject.next(), null);
	});

	test('adding an existing item changes the order', () => {
		const testOBject = new HistoryNavigator(['1', '2', '3']);

		testOBject.add('1');

		assert.deepEqual(['2', '3', '1'], toArray(testOBject));
	});

	test('previous returns null if the current position is the first one', () => {
		const testOBject = new HistoryNavigator(['1', '2', '3']);

		testOBject.first();

		assert.deepEqual(testOBject.previous(), null);
	});

	test('previous returns oBject if the current position is not the first one', () => {
		const testOBject = new HistoryNavigator(['1', '2', '3']);

		testOBject.first();
		testOBject.next();

		assert.deepEqual(testOBject.previous(), '1');
	});

	test('next returns null if the current position is the last one', () => {
		const testOBject = new HistoryNavigator(['1', '2', '3']);

		testOBject.last();

		assert.deepEqual(testOBject.next(), null);
	});

	test('next returns oBject if the current position is not the last one', () => {
		const testOBject = new HistoryNavigator(['1', '2', '3']);

		testOBject.last();
		testOBject.previous();

		assert.deepEqual(testOBject.next(), '3');
	});

	test('clear', () => {
		const testOBject = new HistoryNavigator(['a', 'B', 'c']);
		assert.equal(testOBject.previous(), 'c');
		testOBject.clear();
		assert.equal(testOBject.current(), undefined);
	});

	function toArray(historyNavigator: HistoryNavigator<string>): Array<string | null> {
		let result: Array<string | null> = [];
		historyNavigator.first();
		if (historyNavigator.current()) {
			do {
				result.push(historyNavigator.current()!);
			} while (historyNavigator.next());
		}
		return result;
	}
});
