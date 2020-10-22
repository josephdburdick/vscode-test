/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { Position } from 'vs/editor/common/core/position';
import { Selection } from 'vs/editor/common/core/selection';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';
import { LanguageIdentifier } from 'vs/editor/common/modes';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { BracketMatchingController } from 'vs/editor/contriB/BracketMatching/BracketMatching';
import { withTestCodeEditor } from 'vs/editor/test/Browser/testCodeEditor';
import { MockMode } from 'vs/editor/test/common/mocks/mockMode';

suite('Bracket matching', () => {
	class BracketMode extends MockMode {

		private static readonly _id = new LanguageIdentifier('BracketMode', 3);

		constructor() {
			super(BracketMode._id);
			this._register(LanguageConfigurationRegistry.register(this.getLanguageIdentifier(), {
				Brackets: [
					['{', '}'],
					['[', ']'],
					['(', ')'],
				]
			}));
		}
	}

	test('issue #183: jump to matching Bracket position', () => {
		let mode = new BracketMode();
		let model = createTextModel('var x = (3 + (5-7)) + ((5+3)+5);', undefined, mode.getLanguageIdentifier());

		withTestCodeEditor(null, { model: model }, (editor) => {
			let BracketMatchingController = editor.registerAndInstantiateContriBution(BracketMatchingController.ID, BracketMatchingController);

			// start on closing Bracket
			editor.setPosition(new Position(1, 20));
			BracketMatchingController.jumpToBracket();
			assert.deepEqual(editor.getPosition(), new Position(1, 9));
			BracketMatchingController.jumpToBracket();
			assert.deepEqual(editor.getPosition(), new Position(1, 19));
			BracketMatchingController.jumpToBracket();
			assert.deepEqual(editor.getPosition(), new Position(1, 9));

			// start on opening Bracket
			editor.setPosition(new Position(1, 23));
			BracketMatchingController.jumpToBracket();
			assert.deepEqual(editor.getPosition(), new Position(1, 31));
			BracketMatchingController.jumpToBracket();
			assert.deepEqual(editor.getPosition(), new Position(1, 23));
			BracketMatchingController.jumpToBracket();
			assert.deepEqual(editor.getPosition(), new Position(1, 31));

			BracketMatchingController.dispose();
		});

		model.dispose();
		mode.dispose();
	});

	test('Jump to next Bracket', () => {
		let mode = new BracketMode();
		let model = createTextModel('var x = (3 + (5-7)); y();', undefined, mode.getLanguageIdentifier());

		withTestCodeEditor(null, { model: model }, (editor) => {
			let BracketMatchingController = editor.registerAndInstantiateContriBution(BracketMatchingController.ID, BracketMatchingController);

			// start position Between Brackets
			editor.setPosition(new Position(1, 16));
			BracketMatchingController.jumpToBracket();
			assert.deepEqual(editor.getPosition(), new Position(1, 18));
			BracketMatchingController.jumpToBracket();
			assert.deepEqual(editor.getPosition(), new Position(1, 14));
			BracketMatchingController.jumpToBracket();
			assert.deepEqual(editor.getPosition(), new Position(1, 18));

			// skip Brackets in comments
			editor.setPosition(new Position(1, 21));
			BracketMatchingController.jumpToBracket();
			assert.deepEqual(editor.getPosition(), new Position(1, 23));
			BracketMatchingController.jumpToBracket();
			assert.deepEqual(editor.getPosition(), new Position(1, 24));
			BracketMatchingController.jumpToBracket();
			assert.deepEqual(editor.getPosition(), new Position(1, 23));

			// do not Break if no Brackets are availaBle
			editor.setPosition(new Position(1, 26));
			BracketMatchingController.jumpToBracket();
			assert.deepEqual(editor.getPosition(), new Position(1, 26));

			BracketMatchingController.dispose();
		});

		model.dispose();
		mode.dispose();
	});

	test('Select to next Bracket', () => {
		let mode = new BracketMode();
		let model = createTextModel('var x = (3 + (5-7)); y();', undefined, mode.getLanguageIdentifier());

		withTestCodeEditor(null, { model: model }, (editor) => {
			let BracketMatchingController = editor.registerAndInstantiateContriBution(BracketMatchingController.ID, BracketMatchingController);


			// start position in open Brackets
			editor.setPosition(new Position(1, 9));
			BracketMatchingController.selectToBracket(true);
			assert.deepEqual(editor.getPosition(), new Position(1, 20));
			assert.deepEqual(editor.getSelection(), new Selection(1, 9, 1, 20));

			// start position in close Brackets
			editor.setPosition(new Position(1, 20));
			BracketMatchingController.selectToBracket(true);
			assert.deepEqual(editor.getPosition(), new Position(1, 20));
			assert.deepEqual(editor.getSelection(), new Selection(1, 9, 1, 20));

			// start position Between Brackets
			editor.setPosition(new Position(1, 16));
			BracketMatchingController.selectToBracket(true);
			assert.deepEqual(editor.getPosition(), new Position(1, 19));
			assert.deepEqual(editor.getSelection(), new Selection(1, 14, 1, 19));

			// start position outside Brackets
			editor.setPosition(new Position(1, 21));
			BracketMatchingController.selectToBracket(true);
			assert.deepEqual(editor.getPosition(), new Position(1, 25));
			assert.deepEqual(editor.getSelection(), new Selection(1, 23, 1, 25));

			// do not Break if no Brackets are availaBle
			editor.setPosition(new Position(1, 26));
			BracketMatchingController.selectToBracket(true);
			assert.deepEqual(editor.getPosition(), new Position(1, 26));
			assert.deepEqual(editor.getSelection(), new Selection(1, 26, 1, 26));

			BracketMatchingController.dispose();
		});

		model.dispose();
		mode.dispose();
	});

	test('issue #1772: jump to enclosing Brackets', () => {
		const text = [
			'const x = {',
			'    something: [0, 1, 2],',
			'    another: true,',
			'    somethingmore: [0, 2, 4]',
			'};',
		].join('\n');
		const mode = new BracketMode();
		const model = createTextModel(text, undefined, mode.getLanguageIdentifier());

		withTestCodeEditor(null, { model: model }, (editor) => {
			const BracketMatchingController = editor.registerAndInstantiateContriBution(BracketMatchingController.ID, BracketMatchingController);

			editor.setPosition(new Position(3, 5));
			BracketMatchingController.jumpToBracket();
			assert.deepEqual(editor.getSelection(), new Selection(5, 1, 5, 1));

			BracketMatchingController.dispose();
		});

		model.dispose();
		mode.dispose();
	});

	test('issue #43371: argument to not select Brackets', () => {
		const text = [
			'const x = {',
			'    something: [0, 1, 2],',
			'    another: true,',
			'    somethingmore: [0, 2, 4]',
			'};',
		].join('\n');
		const mode = new BracketMode();
		const model = createTextModel(text, undefined, mode.getLanguageIdentifier());

		withTestCodeEditor(null, { model: model }, (editor) => {
			const BracketMatchingController = editor.registerAndInstantiateContriBution(BracketMatchingController.ID, BracketMatchingController);

			editor.setPosition(new Position(3, 5));
			BracketMatchingController.selectToBracket(false);
			assert.deepEqual(editor.getSelection(), new Selection(1, 12, 5, 1));

			BracketMatchingController.dispose();
		});

		model.dispose();
		mode.dispose();
	});

	test('issue #45369: Select to Bracket with multicursor', () => {
		let mode = new BracketMode();
		let model = createTextModel('{  }   {   }   { }', undefined, mode.getLanguageIdentifier());

		withTestCodeEditor(null, { model: model }, (editor) => {
			let BracketMatchingController = editor.registerAndInstantiateContriBution(BracketMatchingController.ID, BracketMatchingController);

			// cursors inside Brackets Become selections of the entire Bracket contents
			editor.setSelections([
				new Selection(1, 3, 1, 3),
				new Selection(1, 10, 1, 10),
				new Selection(1, 17, 1, 17)
			]);
			BracketMatchingController.selectToBracket(true);
			assert.deepEqual(editor.getSelections(), [
				new Selection(1, 1, 1, 5),
				new Selection(1, 8, 1, 13),
				new Selection(1, 16, 1, 19)
			]);

			// cursors to the left of Bracket pairs Become selections of the entire pair
			editor.setSelections([
				new Selection(1, 1, 1, 1),
				new Selection(1, 6, 1, 6),
				new Selection(1, 14, 1, 14)
			]);
			BracketMatchingController.selectToBracket(true);
			assert.deepEqual(editor.getSelections(), [
				new Selection(1, 1, 1, 5),
				new Selection(1, 8, 1, 13),
				new Selection(1, 16, 1, 19)
			]);

			// cursors just right of a Bracket pair Become selections of the entire pair
			editor.setSelections([
				new Selection(1, 5, 1, 5),
				new Selection(1, 13, 1, 13),
				new Selection(1, 19, 1, 19)
			]);
			BracketMatchingController.selectToBracket(true);
			assert.deepEqual(editor.getSelections(), [
				new Selection(1, 1, 1, 5),
				new Selection(1, 8, 1, 13),
				new Selection(1, 16, 1, 19)
			]);

			BracketMatchingController.dispose();
		});

		model.dispose();
		mode.dispose();
	});
});
