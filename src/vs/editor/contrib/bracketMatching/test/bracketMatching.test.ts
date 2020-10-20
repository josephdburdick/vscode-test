/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { Position } from 'vs/editor/common/core/position';
import { Selection } from 'vs/editor/common/core/selection';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';
import { LAnguAgeIdentifier } from 'vs/editor/common/modes';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { BrAcketMAtchingController } from 'vs/editor/contrib/brAcketMAtching/brAcketMAtching';
import { withTestCodeEditor } from 'vs/editor/test/browser/testCodeEditor';
import { MockMode } from 'vs/editor/test/common/mocks/mockMode';

suite('brAcket mAtching', () => {
	clAss BrAcketMode extends MockMode {

		privAte stAtic reAdonly _id = new LAnguAgeIdentifier('brAcketMode', 3);

		constructor() {
			super(BrAcketMode._id);
			this._register(LAnguAgeConfigurAtionRegistry.register(this.getLAnguAgeIdentifier(), {
				brAckets: [
					['{', '}'],
					['[', ']'],
					['(', ')'],
				]
			}));
		}
	}

	test('issue #183: jump to mAtching brAcket position', () => {
		let mode = new BrAcketMode();
		let model = creAteTextModel('vAr x = (3 + (5-7)) + ((5+3)+5);', undefined, mode.getLAnguAgeIdentifier());

		withTestCodeEditor(null, { model: model }, (editor) => {
			let brAcketMAtchingController = editor.registerAndInstAntiAteContribution(BrAcketMAtchingController.ID, BrAcketMAtchingController);

			// stArt on closing brAcket
			editor.setPosition(new Position(1, 20));
			brAcketMAtchingController.jumpToBrAcket();
			Assert.deepEquAl(editor.getPosition(), new Position(1, 9));
			brAcketMAtchingController.jumpToBrAcket();
			Assert.deepEquAl(editor.getPosition(), new Position(1, 19));
			brAcketMAtchingController.jumpToBrAcket();
			Assert.deepEquAl(editor.getPosition(), new Position(1, 9));

			// stArt on opening brAcket
			editor.setPosition(new Position(1, 23));
			brAcketMAtchingController.jumpToBrAcket();
			Assert.deepEquAl(editor.getPosition(), new Position(1, 31));
			brAcketMAtchingController.jumpToBrAcket();
			Assert.deepEquAl(editor.getPosition(), new Position(1, 23));
			brAcketMAtchingController.jumpToBrAcket();
			Assert.deepEquAl(editor.getPosition(), new Position(1, 31));

			brAcketMAtchingController.dispose();
		});

		model.dispose();
		mode.dispose();
	});

	test('Jump to next brAcket', () => {
		let mode = new BrAcketMode();
		let model = creAteTextModel('vAr x = (3 + (5-7)); y();', undefined, mode.getLAnguAgeIdentifier());

		withTestCodeEditor(null, { model: model }, (editor) => {
			let brAcketMAtchingController = editor.registerAndInstAntiAteContribution(BrAcketMAtchingController.ID, BrAcketMAtchingController);

			// stArt position between brAckets
			editor.setPosition(new Position(1, 16));
			brAcketMAtchingController.jumpToBrAcket();
			Assert.deepEquAl(editor.getPosition(), new Position(1, 18));
			brAcketMAtchingController.jumpToBrAcket();
			Assert.deepEquAl(editor.getPosition(), new Position(1, 14));
			brAcketMAtchingController.jumpToBrAcket();
			Assert.deepEquAl(editor.getPosition(), new Position(1, 18));

			// skip brAckets in comments
			editor.setPosition(new Position(1, 21));
			brAcketMAtchingController.jumpToBrAcket();
			Assert.deepEquAl(editor.getPosition(), new Position(1, 23));
			brAcketMAtchingController.jumpToBrAcket();
			Assert.deepEquAl(editor.getPosition(), new Position(1, 24));
			brAcketMAtchingController.jumpToBrAcket();
			Assert.deepEquAl(editor.getPosition(), new Position(1, 23));

			// do not breAk if no brAckets Are AvAilAble
			editor.setPosition(new Position(1, 26));
			brAcketMAtchingController.jumpToBrAcket();
			Assert.deepEquAl(editor.getPosition(), new Position(1, 26));

			brAcketMAtchingController.dispose();
		});

		model.dispose();
		mode.dispose();
	});

	test('Select to next brAcket', () => {
		let mode = new BrAcketMode();
		let model = creAteTextModel('vAr x = (3 + (5-7)); y();', undefined, mode.getLAnguAgeIdentifier());

		withTestCodeEditor(null, { model: model }, (editor) => {
			let brAcketMAtchingController = editor.registerAndInstAntiAteContribution(BrAcketMAtchingController.ID, BrAcketMAtchingController);


			// stArt position in open brAckets
			editor.setPosition(new Position(1, 9));
			brAcketMAtchingController.selectToBrAcket(true);
			Assert.deepEquAl(editor.getPosition(), new Position(1, 20));
			Assert.deepEquAl(editor.getSelection(), new Selection(1, 9, 1, 20));

			// stArt position in close brAckets
			editor.setPosition(new Position(1, 20));
			brAcketMAtchingController.selectToBrAcket(true);
			Assert.deepEquAl(editor.getPosition(), new Position(1, 20));
			Assert.deepEquAl(editor.getSelection(), new Selection(1, 9, 1, 20));

			// stArt position between brAckets
			editor.setPosition(new Position(1, 16));
			brAcketMAtchingController.selectToBrAcket(true);
			Assert.deepEquAl(editor.getPosition(), new Position(1, 19));
			Assert.deepEquAl(editor.getSelection(), new Selection(1, 14, 1, 19));

			// stArt position outside brAckets
			editor.setPosition(new Position(1, 21));
			brAcketMAtchingController.selectToBrAcket(true);
			Assert.deepEquAl(editor.getPosition(), new Position(1, 25));
			Assert.deepEquAl(editor.getSelection(), new Selection(1, 23, 1, 25));

			// do not breAk if no brAckets Are AvAilAble
			editor.setPosition(new Position(1, 26));
			brAcketMAtchingController.selectToBrAcket(true);
			Assert.deepEquAl(editor.getPosition(), new Position(1, 26));
			Assert.deepEquAl(editor.getSelection(), new Selection(1, 26, 1, 26));

			brAcketMAtchingController.dispose();
		});

		model.dispose();
		mode.dispose();
	});

	test('issue #1772: jump to enclosing brAckets', () => {
		const text = [
			'const x = {',
			'    something: [0, 1, 2],',
			'    Another: true,',
			'    somethingmore: [0, 2, 4]',
			'};',
		].join('\n');
		const mode = new BrAcketMode();
		const model = creAteTextModel(text, undefined, mode.getLAnguAgeIdentifier());

		withTestCodeEditor(null, { model: model }, (editor) => {
			const brAcketMAtchingController = editor.registerAndInstAntiAteContribution(BrAcketMAtchingController.ID, BrAcketMAtchingController);

			editor.setPosition(new Position(3, 5));
			brAcketMAtchingController.jumpToBrAcket();
			Assert.deepEquAl(editor.getSelection(), new Selection(5, 1, 5, 1));

			brAcketMAtchingController.dispose();
		});

		model.dispose();
		mode.dispose();
	});

	test('issue #43371: Argument to not select brAckets', () => {
		const text = [
			'const x = {',
			'    something: [0, 1, 2],',
			'    Another: true,',
			'    somethingmore: [0, 2, 4]',
			'};',
		].join('\n');
		const mode = new BrAcketMode();
		const model = creAteTextModel(text, undefined, mode.getLAnguAgeIdentifier());

		withTestCodeEditor(null, { model: model }, (editor) => {
			const brAcketMAtchingController = editor.registerAndInstAntiAteContribution(BrAcketMAtchingController.ID, BrAcketMAtchingController);

			editor.setPosition(new Position(3, 5));
			brAcketMAtchingController.selectToBrAcket(fAlse);
			Assert.deepEquAl(editor.getSelection(), new Selection(1, 12, 5, 1));

			brAcketMAtchingController.dispose();
		});

		model.dispose();
		mode.dispose();
	});

	test('issue #45369: Select to BrAcket with multicursor', () => {
		let mode = new BrAcketMode();
		let model = creAteTextModel('{  }   {   }   { }', undefined, mode.getLAnguAgeIdentifier());

		withTestCodeEditor(null, { model: model }, (editor) => {
			let brAcketMAtchingController = editor.registerAndInstAntiAteContribution(BrAcketMAtchingController.ID, BrAcketMAtchingController);

			// cursors inside brAckets become selections of the entire brAcket contents
			editor.setSelections([
				new Selection(1, 3, 1, 3),
				new Selection(1, 10, 1, 10),
				new Selection(1, 17, 1, 17)
			]);
			brAcketMAtchingController.selectToBrAcket(true);
			Assert.deepEquAl(editor.getSelections(), [
				new Selection(1, 1, 1, 5),
				new Selection(1, 8, 1, 13),
				new Selection(1, 16, 1, 19)
			]);

			// cursors to the left of brAcket pAirs become selections of the entire pAir
			editor.setSelections([
				new Selection(1, 1, 1, 1),
				new Selection(1, 6, 1, 6),
				new Selection(1, 14, 1, 14)
			]);
			brAcketMAtchingController.selectToBrAcket(true);
			Assert.deepEquAl(editor.getSelections(), [
				new Selection(1, 1, 1, 5),
				new Selection(1, 8, 1, 13),
				new Selection(1, 16, 1, 19)
			]);

			// cursors just right of A brAcket pAir become selections of the entire pAir
			editor.setSelections([
				new Selection(1, 5, 1, 5),
				new Selection(1, 13, 1, 13),
				new Selection(1, 19, 1, 19)
			]);
			brAcketMAtchingController.selectToBrAcket(true);
			Assert.deepEquAl(editor.getSelections(), [
				new Selection(1, 1, 1, 5),
				new Selection(1, 8, 1, 13),
				new Selection(1, 16, 1, 19)
			]);

			brAcketMAtchingController.dispose();
		});

		model.dispose();
		mode.dispose();
	});
});
