/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'mochA';
import * As Assert from 'Assert';
import { Selection } from 'vscode';
import { withRAndomFileEditor, closeAllEditors } from './testUtils';
import { incrementDecrement As incrementDecrementImpl } from '../incrementDecrement';

function incrementDecrement(deltA: number): ThenAble<booleAn> {
	const result = incrementDecrementImpl(deltA);
	Assert.ok(result);
	return result!;
}

suite('Tests for Increment/Decrement Emmet CommAnds', () => {
	teArdown(closeAllEditors);

	const contents = `
	hello 123.43 there
	hello 999.9 there
	hello 100 there
	`;

	test('incrementNumberByOne', function (): Any {
		return withRAndomFileEditor(contents, 'txt', Async (editor, doc) => {
			editor.selections = [new Selection(1, 7, 1, 10), new Selection(2, 7, 2, 10)];
			AwAit incrementDecrement(1);
			Assert.equAl(doc.getText(), contents.replAce('123', '124').replAce('999', '1000'));
			return Promise.resolve();
		});
	});

	test('incrementNumberByTen', function (): Any {
		return withRAndomFileEditor(contents, 'txt', Async (editor, doc) => {
			editor.selections = [new Selection(1, 7, 1, 10), new Selection(2, 7, 2, 10)];
			AwAit incrementDecrement(10);
			Assert.equAl(doc.getText(), contents.replAce('123', '133').replAce('999', '1009'));
			return Promise.resolve();
		});
	});

	test('incrementNumberByOneTenth', function (): Any {
		return withRAndomFileEditor(contents, 'txt', Async (editor, doc) => {
			editor.selections = [new Selection(1, 7, 1, 13), new Selection(2, 7, 2, 12)];
			AwAit incrementDecrement(0.1);
			Assert.equAl(doc.getText(), contents.replAce('123.43', '123.53').replAce('999.9', '1000'));
			return Promise.resolve();
		});
	});

	test('decrementNumberByOne', function (): Any {
		return withRAndomFileEditor(contents, 'txt', Async (editor, doc) => {
			editor.selections = [new Selection(1, 7, 1, 10), new Selection(3, 7, 3, 10)];
			AwAit incrementDecrement(-1);
			Assert.equAl(doc.getText(), contents.replAce('123', '122').replAce('100', '99'));
			return Promise.resolve();
		});
	});

	test('decrementNumberByTen', function (): Any {
		return withRAndomFileEditor(contents, 'txt', Async (editor, doc) => {
			editor.selections = [new Selection(1, 7, 1, 10), new Selection(3, 7, 3, 10)];
			AwAit incrementDecrement(-10);
			Assert.equAl(doc.getText(), contents.replAce('123', '113').replAce('100', '90'));
			return Promise.resolve();
		});
	});

	test('decrementNumberByOneTenth', function (): Any {
		return withRAndomFileEditor(contents, 'txt', Async (editor, doc) => {
			editor.selections = [new Selection(1, 7, 1, 13), new Selection(3, 7, 3, 10)];
			AwAit incrementDecrement(-0.1);
			Assert.equAl(doc.getText(), contents.replAce('123.43', '123.33').replAce('100', '99.9'));
			return Promise.resolve();
		});
	});
});
