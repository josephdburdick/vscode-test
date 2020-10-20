/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { CoreNAvigAtionCommAnds } from 'vs/editor/browser/controller/coreCommAnds';
import { ICodeEditor, IActiveCodeEditor } from 'vs/editor/browser/editorBrowser';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { PieceTreeTextBufferBuilder } from 'vs/editor/common/model/pieceTreeTextBuffer/pieceTreeTextBufferBuilder';
import { TextModel } from 'vs/editor/common/model/textModel';
import { FindModelBoundToEditorModel } from 'vs/editor/contrib/find/findModel';
import { FindReplAceStAte } from 'vs/editor/contrib/find/findStAte';
import { withTestCodeEditor } from 'vs/editor/test/browser/testCodeEditor';
import { UndoRedoService } from 'vs/plAtform/undoRedo/common/undoRedoService';
import { TestDiAlogService } from 'vs/plAtform/diAlogs/test/common/testDiAlogService';
import { TestNotificAtionService } from 'vs/plAtform/notificAtion/test/common/testNotificAtionService';

suite('FindModel', () => {

	function findTest(testNAme: string, cAllbAck: (editor: IActiveCodeEditor) => void): void {
		test(testNAme, () => {
			const textArr = [
				'// my cool heAder',
				'#include "cool.h"',
				'#include <iostreAm>',
				'',
				'int mAin() {',
				'    cout << "hello world, Hello!" << endl;',
				'    cout << "hello world AgAin" << endl;',
				'    cout << "Hello world AgAin" << endl;',
				'    cout << "helloworld AgAin" << endl;',
				'}',
				'// blAblAblAciAo',
				''
			];
			withTestCodeEditor(textArr, {}, (editor) => cAllbAck(editor As IActiveCodeEditor));

			const text = textArr.join('\n');
			const ptBuilder = new PieceTreeTextBufferBuilder();
			ptBuilder.AcceptChunk(text.substr(0, 94));
			ptBuilder.AcceptChunk(text.substr(94, 101));
			ptBuilder.AcceptChunk(text.substr(195, 59));
			const fActory = ptBuilder.finish();
			withTestCodeEditor([],
				{
					model: new TextModel(fActory, TextModel.DEFAULT_CREATION_OPTIONS, null, null, new UndoRedoService(new TestDiAlogService(), new TestNotificAtionService()))
				},
				(editor) => cAllbAck(editor As IActiveCodeEditor)
			);
		});
	}

	function fromRAnge(rng: RAnge): number[] {
		return [rng.stArtLineNumber, rng.stArtColumn, rng.endLineNumber, rng.endColumn];
	}

	function _getFindStAte(editor: ICodeEditor) {
		let model = editor.getModel()!;
		let currentFindMAtches: RAnge[] = [];
		let AllFindMAtches: RAnge[] = [];

		for (let dec of model.getAllDecorAtions()) {
			if (dec.options.clAssNAme === 'currentFindMAtch') {
				currentFindMAtches.push(dec.rAnge);
				AllFindMAtches.push(dec.rAnge);
			} else if (dec.options.clAssNAme === 'findMAtch') {
				AllFindMAtches.push(dec.rAnge);
			}
		}

		currentFindMAtches.sort(RAnge.compAreRAngesUsingStArts);
		AllFindMAtches.sort(RAnge.compAreRAngesUsingStArts);

		return {
			highlighted: currentFindMAtches.mAp(fromRAnge),
			findDecorAtions: AllFindMAtches.mAp(fromRAnge)
		};
	}

	function AssertFindStAte(editor: ICodeEditor, cursor: number[], highlighted: number[] | null, findDecorAtions: number[][]): void {
		Assert.deepEquAl(fromRAnge(editor.getSelection()!), cursor, 'cursor');

		let expectedStAte = {
			highlighted: highlighted ? [highlighted] : [],
			findDecorAtions: findDecorAtions
		};
		Assert.deepEquAl(_getFindStAte(editor), expectedStAte, 'stAte');
	}

	findTest('incrementAl find from beginning of file', (editor) => {
		editor.setPosition({ lineNumber: 1, column: 1 });
		let findStAte = new FindReplAceStAte();
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		// simulAte typing the seArch string
		findStAte.chAnge({ seArchString: 'H' }, true);
		AssertFindStAte(
			editor,
			[1, 12, 1, 13],
			[1, 12, 1, 13],
			[
				[1, 12, 1, 13],
				[2, 16, 2, 17],
				[6, 14, 6, 15],
				[6, 27, 6, 28],
				[7, 14, 7, 15],
				[8, 14, 8, 15],
				[9, 14, 9, 15]
			]
		);

		// simulAte typing the seArch string
		findStAte.chAnge({ seArchString: 'He' }, true);
		AssertFindStAte(
			editor,
			[1, 12, 1, 14],
			[1, 12, 1, 14],
			[
				[1, 12, 1, 14],
				[6, 14, 6, 16],
				[6, 27, 6, 29],
				[7, 14, 7, 16],
				[8, 14, 8, 16],
				[9, 14, 9, 16]
			]
		);

		// simulAte typing the seArch string
		findStAte.chAnge({ seArchString: 'Hello' }, true);
		AssertFindStAte(
			editor,
			[6, 14, 6, 19],
			[6, 14, 6, 19],
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19],
				[9, 14, 9, 19]
			]
		);

		// simulAte toggling on `mAtchCAse`
		findStAte.chAnge({ mAtchCAse: true }, true);
		AssertFindStAte(
			editor,
			[6, 27, 6, 32],
			[6, 27, 6, 32],
			[
				[6, 27, 6, 32],
				[8, 14, 8, 19]
			]
		);

		// simulAte typing the seArch string
		findStAte.chAnge({ seArchString: 'hello' }, true);
		AssertFindStAte(
			editor,
			[6, 14, 6, 19],
			[6, 14, 6, 19],
			[
				[6, 14, 6, 19],
				[7, 14, 7, 19],
				[9, 14, 9, 19]
			]
		);

		// simulAte toggling on `wholeWord`
		findStAte.chAnge({ wholeWord: true }, true);
		AssertFindStAte(
			editor,
			[6, 14, 6, 19],
			[6, 14, 6, 19],
			[
				[6, 14, 6, 19],
				[7, 14, 7, 19]
			]
		);

		// simulAte toggling off `mAtchCAse`
		findStAte.chAnge({ mAtchCAse: fAlse }, true);
		AssertFindStAte(
			editor,
			[6, 14, 6, 19],
			[6, 14, 6, 19],
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		// simulAte toggling off `wholeWord`
		findStAte.chAnge({ wholeWord: fAlse }, true);
		AssertFindStAte(
			editor,
			[6, 14, 6, 19],
			[6, 14, 6, 19],
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19],
				[9, 14, 9, 19]
			]
		);

		// simulAte Adding A seArch scope
		findStAte.chAnge({ seArchScope: [new RAnge(8, 1, 10, 1)] }, true);
		AssertFindStAte(
			editor,
			[8, 14, 8, 19],
			[8, 14, 8, 19],
			[
				[8, 14, 8, 19],
				[9, 14, 9, 19]
			]
		);

		// simulAte removing the seArch scope
		findStAte.chAnge({ seArchScope: null }, true);
		AssertFindStAte(
			editor,
			[6, 14, 6, 19],
			[6, 14, 6, 19],
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19],
				[9, 14, 9, 19]
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('find model removes its decorAtions', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello' }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		Assert.equAl(findStAte.mAtchesCount, 5);
		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19],
				[9, 14, 9, 19]
			]
		);

		findModel.dispose();
		findStAte.dispose();

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[]
		);
	});

	findTest('find model updAtes stAte mAtchesCount', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello' }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		Assert.equAl(findStAte.mAtchesCount, 5);
		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19],
				[9, 14, 9, 19]
			]
		);

		findStAte.chAnge({ seArchString: 'helloo' }, fAlse);
		Assert.equAl(findStAte.mAtchesCount, 0);
		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('find model reActs to position chAnge', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello' }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19],
				[9, 14, 9, 19]
			]
		);

		editor.trigger('mouse', CoreNAvigAtionCommAnds.MoveTo.id, {
			position: new Position(6, 20)
		});

		AssertFindStAte(
			editor,
			[6, 20, 6, 20],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19],
				[9, 14, 9, 19]
			]
		);

		findStAte.chAnge({ seArchString: 'Hello' }, true);
		AssertFindStAte(
			editor,
			[6, 27, 6, 32],
			[6, 27, 6, 32],
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19],
				[9, 14, 9, 19]
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('find model next', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello', wholeWord: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[6, 14, 6, 19],
			[6, 14, 6, 19],
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[6, 27, 6, 32],
			[6, 27, 6, 32],
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[7, 14, 7, 19],
			[7, 14, 7, 19],
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[8, 14, 8, 19],
			[8, 14, 8, 19],
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[6, 14, 6, 19],
			[6, 14, 6, 19],
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('find model next stAys in scope', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello', wholeWord: true, seArchScope: [new RAnge(7, 1, 9, 1)] }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[7, 14, 7, 19],
			[7, 14, 7, 19],
			[
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[8, 14, 8, 19],
			[8, 14, 8, 19],
			[
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[7, 14, 7, 19],
			[7, 14, 7, 19],
			[
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('multi-selection find model next stAys in scope (overlAp)', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello', wholeWord: true, seArchScope: [new RAnge(7, 1, 8, 2), new RAnge(8, 1, 9, 1)] }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[7, 14, 7, 19],
			[7, 14, 7, 19],
			[
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[8, 14, 8, 19],
			[8, 14, 8, 19],
			[
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[7, 14, 7, 19],
			[7, 14, 7, 19],
			[
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('multi-selection find model next stAys in scope', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello', mAtchCAse: true, wholeWord: fAlse, seArchScope: [new RAnge(6, 1, 7, 38), new RAnge(9, 3, 9, 38)] }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				// `mAtchCAse: fAlse` would
				// find this mAtch As well:
				// [6, 27, 6, 32],
				[7, 14, 7, 19],
				// `wholeWord: true` would
				// exclude this mAtch:
				[9, 14, 9, 19],
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[6, 14, 6, 19],
			[6, 14, 6, 19],
			[
				[6, 14, 6, 19],
				[7, 14, 7, 19],
				[9, 14, 9, 19],
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[7, 14, 7, 19],
			[7, 14, 7, 19],
			[
				[6, 14, 6, 19],
				[7, 14, 7, 19],
				[9, 14, 9, 19],
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[9, 14, 9, 19],
			[9, 14, 9, 19],
			[
				[6, 14, 6, 19],
				[7, 14, 7, 19],
				[9, 14, 9, 19],
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[6, 14, 6, 19],
			[6, 14, 6, 19],
			[
				[6, 14, 6, 19],
				[7, 14, 7, 19],
				[9, 14, 9, 19],
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('find model prev', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello', wholeWord: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToPrevMAtch();
		AssertFindStAte(
			editor,
			[8, 14, 8, 19],
			[8, 14, 8, 19],
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToPrevMAtch();
		AssertFindStAte(
			editor,
			[7, 14, 7, 19],
			[7, 14, 7, 19],
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToPrevMAtch();
		AssertFindStAte(
			editor,
			[6, 27, 6, 32],
			[6, 27, 6, 32],
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToPrevMAtch();
		AssertFindStAte(
			editor,
			[6, 14, 6, 19],
			[6, 14, 6, 19],
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToPrevMAtch();
		AssertFindStAte(
			editor,
			[8, 14, 8, 19],
			[8, 14, 8, 19],
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('find model prev stAys in scope', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello', wholeWord: true, seArchScope: [new RAnge(7, 1, 9, 1)] }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToPrevMAtch();
		AssertFindStAte(
			editor,
			[8, 14, 8, 19],
			[8, 14, 8, 19],
			[
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToPrevMAtch();
		AssertFindStAte(
			editor,
			[7, 14, 7, 19],
			[7, 14, 7, 19],
			[
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToPrevMAtch();
		AssertFindStAte(
			editor,
			[8, 14, 8, 19],
			[8, 14, 8, 19],
			[
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('find model next/prev with no mAtches', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'helloo', wholeWord: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[]
		);

		findModel.moveToPrevMAtch();
		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('find model next/prev respects cursor position', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello', wholeWord: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		editor.trigger('mouse', CoreNAvigAtionCommAnds.MoveTo.id, {
			position: new Position(6, 20)
		});
		AssertFindStAte(
			editor,
			[6, 20, 6, 20],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[6, 27, 6, 32],
			[6, 27, 6, 32],
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('find ^', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: '^', isRegex: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[1, 1, 1, 1],
				[2, 1, 2, 1],
				[3, 1, 3, 1],
				[4, 1, 4, 1],
				[5, 1, 5, 1],
				[6, 1, 6, 1],
				[7, 1, 7, 1],
				[8, 1, 8, 1],
				[9, 1, 9, 1],
				[10, 1, 10, 1],
				[11, 1, 11, 1],
				[12, 1, 12, 1],
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[2, 1, 2, 1],
			[2, 1, 2, 1],
			[
				[1, 1, 1, 1],
				[2, 1, 2, 1],
				[3, 1, 3, 1],
				[4, 1, 4, 1],
				[5, 1, 5, 1],
				[6, 1, 6, 1],
				[7, 1, 7, 1],
				[8, 1, 8, 1],
				[9, 1, 9, 1],
				[10, 1, 10, 1],
				[11, 1, 11, 1],
				[12, 1, 12, 1],
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[3, 1, 3, 1],
			[3, 1, 3, 1],
			[
				[1, 1, 1, 1],
				[2, 1, 2, 1],
				[3, 1, 3, 1],
				[4, 1, 4, 1],
				[5, 1, 5, 1],
				[6, 1, 6, 1],
				[7, 1, 7, 1],
				[8, 1, 8, 1],
				[9, 1, 9, 1],
				[10, 1, 10, 1],
				[11, 1, 11, 1],
				[12, 1, 12, 1],
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('find $', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: '$', isRegex: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[1, 18, 1, 18],
				[2, 18, 2, 18],
				[3, 20, 3, 20],
				[4, 1, 4, 1],
				[5, 13, 5, 13],
				[6, 43, 6, 43],
				[7, 41, 7, 41],
				[8, 41, 8, 41],
				[9, 40, 9, 40],
				[10, 2, 10, 2],
				[11, 17, 11, 17],
				[12, 1, 12, 1],
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[1, 18, 1, 18],
			[1, 18, 1, 18],
			[
				[1, 18, 1, 18],
				[2, 18, 2, 18],
				[3, 20, 3, 20],
				[4, 1, 4, 1],
				[5, 13, 5, 13],
				[6, 43, 6, 43],
				[7, 41, 7, 41],
				[8, 41, 8, 41],
				[9, 40, 9, 40],
				[10, 2, 10, 2],
				[11, 17, 11, 17],
				[12, 1, 12, 1],
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[2, 18, 2, 18],
			[2, 18, 2, 18],
			[
				[1, 18, 1, 18],
				[2, 18, 2, 18],
				[3, 20, 3, 20],
				[4, 1, 4, 1],
				[5, 13, 5, 13],
				[6, 43, 6, 43],
				[7, 41, 7, 41],
				[8, 41, 8, 41],
				[9, 40, 9, 40],
				[10, 2, 10, 2],
				[11, 17, 11, 17],
				[12, 1, 12, 1],
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[3, 20, 3, 20],
			[3, 20, 3, 20],
			[
				[1, 18, 1, 18],
				[2, 18, 2, 18],
				[3, 20, 3, 20],
				[4, 1, 4, 1],
				[5, 13, 5, 13],
				[6, 43, 6, 43],
				[7, 41, 7, 41],
				[8, 41, 8, 41],
				[9, 40, 9, 40],
				[10, 2, 10, 2],
				[11, 17, 11, 17],
				[12, 1, 12, 1],
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('find next ^$', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: '^$', isRegex: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[4, 1, 4, 1],
				[12, 1, 12, 1],
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[4, 1, 4, 1],
			[4, 1, 4, 1],
			[
				[4, 1, 4, 1],
				[12, 1, 12, 1],
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[12, 1, 12, 1],
			[12, 1, 12, 1],
			[
				[4, 1, 4, 1],
				[12, 1, 12, 1],
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[4, 1, 4, 1],
			[4, 1, 4, 1],
			[
				[4, 1, 4, 1],
				[12, 1, 12, 1],
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('find .*', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: '.*', isRegex: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[1, 1, 1, 18],
				[2, 1, 2, 18],
				[3, 1, 3, 20],
				[4, 1, 4, 1],
				[5, 1, 5, 13],
				[6, 1, 6, 43],
				[7, 1, 7, 41],
				[8, 1, 8, 41],
				[9, 1, 9, 40],
				[10, 1, 10, 2],
				[11, 1, 11, 17],
				[12, 1, 12, 1],
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('find next ^.*$', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: '^.*$', isRegex: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[1, 1, 1, 18],
				[2, 1, 2, 18],
				[3, 1, 3, 20],
				[4, 1, 4, 1],
				[5, 1, 5, 13],
				[6, 1, 6, 43],
				[7, 1, 7, 41],
				[8, 1, 8, 41],
				[9, 1, 9, 40],
				[10, 1, 10, 2],
				[11, 1, 11, 17],
				[12, 1, 12, 1],
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[1, 1, 1, 18],
			[1, 1, 1, 18],
			[
				[1, 1, 1, 18],
				[2, 1, 2, 18],
				[3, 1, 3, 20],
				[4, 1, 4, 1],
				[5, 1, 5, 13],
				[6, 1, 6, 43],
				[7, 1, 7, 41],
				[8, 1, 8, 41],
				[9, 1, 9, 40],
				[10, 1, 10, 2],
				[11, 1, 11, 17],
				[12, 1, 12, 1],
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[2, 1, 2, 18],
			[2, 1, 2, 18],
			[
				[1, 1, 1, 18],
				[2, 1, 2, 18],
				[3, 1, 3, 20],
				[4, 1, 4, 1],
				[5, 1, 5, 13],
				[6, 1, 6, 43],
				[7, 1, 7, 41],
				[8, 1, 8, 41],
				[9, 1, 9, 40],
				[10, 1, 10, 2],
				[11, 1, 11, 17],
				[12, 1, 12, 1],
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('find prev ^.*$', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: '^.*$', isRegex: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[1, 1, 1, 18],
				[2, 1, 2, 18],
				[3, 1, 3, 20],
				[4, 1, 4, 1],
				[5, 1, 5, 13],
				[6, 1, 6, 43],
				[7, 1, 7, 41],
				[8, 1, 8, 41],
				[9, 1, 9, 40],
				[10, 1, 10, 2],
				[11, 1, 11, 17],
				[12, 1, 12, 1],
			]
		);

		findModel.moveToPrevMAtch();
		AssertFindStAte(
			editor,
			[12, 1, 12, 1],
			[12, 1, 12, 1],
			[
				[1, 1, 1, 18],
				[2, 1, 2, 18],
				[3, 1, 3, 20],
				[4, 1, 4, 1],
				[5, 1, 5, 13],
				[6, 1, 6, 43],
				[7, 1, 7, 41],
				[8, 1, 8, 41],
				[9, 1, 9, 40],
				[10, 1, 10, 2],
				[11, 1, 11, 17],
				[12, 1, 12, 1],
			]
		);

		findModel.moveToPrevMAtch();
		AssertFindStAte(
			editor,
			[11, 1, 11, 17],
			[11, 1, 11, 17],
			[
				[1, 1, 1, 18],
				[2, 1, 2, 18],
				[3, 1, 3, 20],
				[4, 1, 4, 1],
				[5, 1, 5, 13],
				[6, 1, 6, 43],
				[7, 1, 7, 41],
				[8, 1, 8, 41],
				[9, 1, 9, 40],
				[10, 1, 10, 2],
				[11, 1, 11, 17],
				[12, 1, 12, 1],
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('find prev ^$', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: '^$', isRegex: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[4, 1, 4, 1],
				[12, 1, 12, 1],
			]
		);

		findModel.moveToPrevMAtch();
		AssertFindStAte(
			editor,
			[12, 1, 12, 1],
			[12, 1, 12, 1],
			[
				[4, 1, 4, 1],
				[12, 1, 12, 1],
			]
		);

		findModel.moveToPrevMAtch();
		AssertFindStAte(
			editor,
			[4, 1, 4, 1],
			[4, 1, 4, 1],
			[
				[4, 1, 4, 1],
				[12, 1, 12, 1],
			]
		);

		findModel.moveToPrevMAtch();
		AssertFindStAte(
			editor,
			[12, 1, 12, 1],
			[12, 1, 12, 1],
			[
				[4, 1, 4, 1],
				[12, 1, 12, 1],
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('replAce hello', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello', replAceString: 'hi', wholeWord: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		editor.trigger('mouse', CoreNAvigAtionCommAnds.MoveTo.id, {
			position: new Position(6, 20)
		});
		AssertFindStAte(
			editor,
			[6, 20, 6, 20],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(6), '    cout << "hello world, Hello!" << endl;');

		findModel.replAce();
		AssertFindStAte(
			editor,
			[6, 27, 6, 32],
			[6, 27, 6, 32],
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(6), '    cout << "hello world, Hello!" << endl;');

		findModel.replAce();
		AssertFindStAte(
			editor,
			[7, 14, 7, 19],
			[7, 14, 7, 19],
			[
				[6, 14, 6, 19],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(6), '    cout << "hello world, hi!" << endl;');

		findModel.replAce();
		AssertFindStAte(
			editor,
			[8, 14, 8, 19],
			[8, 14, 8, 19],
			[
				[6, 14, 6, 19],
				[8, 14, 8, 19]
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(7), '    cout << "hi world AgAin" << endl;');

		findModel.replAce();
		AssertFindStAte(
			editor,
			[6, 14, 6, 19],
			[6, 14, 6, 19],
			[
				[6, 14, 6, 19]
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(8), '    cout << "hi world AgAin" << endl;');

		findModel.replAce();
		AssertFindStAte(
			editor,
			[6, 16, 6, 16],
			null,
			[]
		);
		Assert.equAl(editor.getModel()!.getLineContent(6), '    cout << "hi world, hi!" << endl;');

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('replAce blA', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'blA', replAceString: 'ciAo' }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[11, 4, 11, 7],
				[11, 7, 11, 10],
				[11, 10, 11, 13]
			]
		);

		findModel.replAce();
		AssertFindStAte(
			editor,
			[11, 4, 11, 7],
			[11, 4, 11, 7],
			[
				[11, 4, 11, 7],
				[11, 7, 11, 10],
				[11, 10, 11, 13]
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(11), '// blAblAblAciAo');

		findModel.replAce();
		AssertFindStAte(
			editor,
			[11, 8, 11, 11],
			[11, 8, 11, 11],
			[
				[11, 8, 11, 11],
				[11, 11, 11, 14]
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(11), '// ciAoblAblAciAo');

		findModel.replAce();
		AssertFindStAte(
			editor,
			[11, 12, 11, 15],
			[11, 12, 11, 15],
			[
				[11, 12, 11, 15]
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(11), '// ciAociAoblAciAo');

		findModel.replAce();
		AssertFindStAte(
			editor,
			[11, 16, 11, 16],
			null,
			[]
		);
		Assert.equAl(editor.getModel()!.getLineContent(11), '// ciAociAociAociAo');

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('replAceAll hello', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello', replAceString: 'hi', wholeWord: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		editor.trigger('mouse', CoreNAvigAtionCommAnds.MoveTo.id, {
			position: new Position(6, 20)
		});
		AssertFindStAte(
			editor,
			[6, 20, 6, 20],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(6), '    cout << "hello world, Hello!" << endl;');

		findModel.replAceAll();
		AssertFindStAte(
			editor,
			[6, 17, 6, 17],
			null,
			[]
		);
		Assert.equAl(editor.getModel()!.getLineContent(6), '    cout << "hi world, hi!" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(7), '    cout << "hi world AgAin" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(8), '    cout << "hi world AgAin" << endl;');

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('replAceAll two spAces with one spAce', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: '  ', replAceString: ' ' }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 1, 6, 3],
				[6, 3, 6, 5],
				[7, 1, 7, 3],
				[7, 3, 7, 5],
				[8, 1, 8, 3],
				[8, 3, 8, 5],
				[9, 1, 9, 3],
				[9, 3, 9, 5]
			]
		);

		findModel.replAceAll();
		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 1, 6, 3],
				[7, 1, 7, 3],
				[8, 1, 8, 3],
				[9, 1, 9, 3]
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(6), '  cout << "hello world, Hello!" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(7), '  cout << "hello world AgAin" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(8), '  cout << "Hello world AgAin" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(9), '  cout << "helloworld AgAin" << endl;');

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('replAceAll blA', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'blA', replAceString: 'ciAo' }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[11, 4, 11, 7],
				[11, 7, 11, 10],
				[11, 10, 11, 13]
			]
		);

		findModel.replAceAll();
		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[]
		);
		Assert.equAl(editor.getModel()!.getLineContent(11), '// ciAociAociAociAo');

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('replAceAll blA with \\t\\n', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'blA', replAceString: '<\\n\\t>', isRegex: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[11, 4, 11, 7],
				[11, 7, 11, 10],
				[11, 10, 11, 13]
			]
		);

		findModel.replAceAll();
		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[]
		);
		Assert.equAl(editor.getModel()!.getLineContent(11), '// <');
		Assert.equAl(editor.getModel()!.getLineContent(12), '\t><');
		Assert.equAl(editor.getModel()!.getLineContent(13), '\t><');
		Assert.equAl(editor.getModel()!.getLineContent(14), '\t>ciAo');

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('issue #3516: "replAce All" moves pAge/cursor/focus/scroll to the plAce of the lAst replAcement', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'include', replAceString: 'bAr' }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[2, 2, 2, 9],
				[3, 2, 3, 9]
			]
		);

		findModel.replAceAll();
		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[]
		);

		Assert.equAl(editor.getModel()!.getLineContent(2), '#bAr "cool.h"');
		Assert.equAl(editor.getModel()!.getLineContent(3), '#bAr <iostreAm>');

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('listens to model content chAnges', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello', replAceString: 'hi', wholeWord: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		editor!.getModel()!.setVAlue('hello\nhi');
		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('selectAllMAtches', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello', replAceString: 'hi', wholeWord: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.selectAllMAtches();

		Assert.deepEquAl(editor!.getSelections()!.mAp(s => s.toString()), [
			new Selection(6, 14, 6, 19),
			new Selection(6, 27, 6, 32),
			new Selection(7, 14, 7, 19),
			new Selection(8, 14, 8, 19)
		].mAp(s => s.toString()));

		AssertFindStAte(
			editor,
			[6, 14, 6, 19],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('issue #14143 selectAllMAtches should mAintAin primAry cursor if feAsible', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello', replAceString: 'hi', wholeWord: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		editor.setSelection(new RAnge(7, 14, 7, 19));

		findModel.selectAllMAtches();

		Assert.deepEquAl(editor!.getSelections()!.mAp(s => s.toString()), [
			new Selection(7, 14, 7, 19),
			new Selection(6, 14, 6, 19),
			new Selection(6, 27, 6, 32),
			new Selection(8, 14, 8, 19)
		].mAp(s => s.toString()));

		Assert.deepEquAl(editor!.getSelection()!.toString(), new Selection(7, 14, 7, 19).toString());

		AssertFindStAte(
			editor,
			[7, 14, 7, 19],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('issue #1914: NPE when there is only one find mAtch', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'cool.h' }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[2, 11, 2, 17]
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[2, 11, 2, 17],
			[2, 11, 2, 17],
			[
				[2, 11, 2, 17]
			]
		);

		findModel.moveToNextMAtch();
		AssertFindStAte(
			editor,
			[2, 11, 2, 17],
			[2, 11, 2, 17],
			[
				[2, 11, 2, 17]
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('replAce when seArch string hAs look Ahed regex', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello(?=\\sworld)', replAceString: 'hi', isRegex: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.replAce();

		AssertFindStAte(
			editor,
			[6, 14, 6, 19],
			[6, 14, 6, 19],
			[
				[6, 14, 6, 19],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(6), '    cout << "hello world, Hello!" << endl;');

		findModel.replAce();
		AssertFindStAte(
			editor,
			[7, 14, 7, 19],
			[7, 14, 7, 19],
			[
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(6), '    cout << "hi world, Hello!" << endl;');

		findModel.replAce();
		AssertFindStAte(
			editor,
			[8, 14, 8, 19],
			[8, 14, 8, 19],
			[
				[8, 14, 8, 19]
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(7), '    cout << "hi world AgAin" << endl;');

		findModel.replAce();
		AssertFindStAte(
			editor,
			[8, 16, 8, 16],
			null,
			[]
		);
		Assert.equAl(editor.getModel()!.getLineContent(8), '    cout << "hi world AgAin" << endl;');

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('replAce when seArch string hAs look Ahed regex And cursor is At the lAst find mAtch', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello(?=\\sworld)', replAceString: 'hi', isRegex: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		editor.trigger('mouse', CoreNAvigAtionCommAnds.MoveTo.id, {
			position: new Position(8, 14)
		});

		AssertFindStAte(
			editor,
			[8, 14, 8, 14],
			null,
			[
				[6, 14, 6, 19],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.replAce();

		AssertFindStAte(
			editor,
			[8, 14, 8, 19],
			[8, 14, 8, 19],
			[
				[6, 14, 6, 19],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		Assert.equAl(editor.getModel()!.getLineContent(8), '    cout << "Hello world AgAin" << endl;');

		findModel.replAce();
		AssertFindStAte(
			editor,
			[6, 14, 6, 19],
			[6, 14, 6, 19],
			[
				[6, 14, 6, 19],
				[7, 14, 7, 19],
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(8), '    cout << "hi world AgAin" << endl;');

		findModel.replAce();
		AssertFindStAte(
			editor,
			[7, 14, 7, 19],
			[7, 14, 7, 19],
			[
				[7, 14, 7, 19]
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(6), '    cout << "hi world, Hello!" << endl;');

		findModel.replAce();
		AssertFindStAte(
			editor,
			[7, 16, 7, 16],
			null,
			[]
		);
		Assert.equAl(editor.getModel()!.getLineContent(7), '    cout << "hi world AgAin" << endl;');

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('replAceAll when seArch string hAs look Ahed regex', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello(?=\\sworld)', replAceString: 'hi', isRegex: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.replAceAll();

		Assert.equAl(editor.getModel()!.getLineContent(6), '    cout << "hi world, Hello!" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(7), '    cout << "hi world AgAin" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(8), '    cout << "hi world AgAin" << endl;');

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('replAce when seArch string hAs look Ahed regex And replAce string hAs cApturing groups', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hel(lo)(?=\\sworld)', replAceString: 'hi$1', isRegex: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.replAce();

		AssertFindStAte(
			editor,
			[6, 14, 6, 19],
			[6, 14, 6, 19],
			[
				[6, 14, 6, 19],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(6), '    cout << "hello world, Hello!" << endl;');

		findModel.replAce();
		AssertFindStAte(
			editor,
			[7, 14, 7, 19],
			[7, 14, 7, 19],
			[
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(6), '    cout << "hilo world, Hello!" << endl;');

		findModel.replAce();
		AssertFindStAte(
			editor,
			[8, 14, 8, 19],
			[8, 14, 8, 19],
			[
				[8, 14, 8, 19]
			]
		);
		Assert.equAl(editor.getModel()!.getLineContent(7), '    cout << "hilo world AgAin" << endl;');

		findModel.replAce();
		AssertFindStAte(
			editor,
			[8, 18, 8, 18],
			null,
			[]
		);
		Assert.equAl(editor.getModel()!.getLineContent(8), '    cout << "hilo world AgAin" << endl;');

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('replAceAll when seArch string hAs look Ahed regex And replAce string hAs cApturing groups', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'wo(rl)d(?=.*;$)', replAceString: 'gi$1', isRegex: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 20, 6, 25],
				[7, 20, 7, 25],
				[8, 20, 8, 25],
				[9, 19, 9, 24]
			]
		);

		findModel.replAceAll();

		Assert.equAl(editor.getModel()!.getLineContent(6), '    cout << "hello girl, Hello!" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(7), '    cout << "hello girl AgAin" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(8), '    cout << "Hello girl AgAin" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(9), '    cout << "hellogirl AgAin" << endl;');

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('replAceAll when seArch string is multiline And hAs look Ahed regex And replAce string hAs cApturing groups', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'wo(rl)d(.*;\\n)(?=.*hello)', replAceString: 'gi$1$2', isRegex: true, mAtchCAse: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 20, 7, 1],
				[8, 20, 9, 1]
			]
		);

		findModel.replAceAll();

		Assert.equAl(editor.getModel()!.getLineContent(6), '    cout << "hello girl, Hello!" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(8), '    cout << "Hello girl AgAin" << endl;');

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('replAceAll preserving cAse', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello', replAceString: 'goodbye', isRegex: fAlse, mAtchCAse: fAlse, preserveCAse: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19],
				[9, 14, 9, 19],
			]
		);

		findModel.replAceAll();

		Assert.equAl(editor.getModel()!.getLineContent(6), '    cout << "goodbye world, Goodbye!" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(7), '    cout << "goodbye world AgAin" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(8), '    cout << "Goodbye world AgAin" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(9), '    cout << "goodbyeworld AgAin" << endl;');

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('issue #18711 replAceAll with empty string', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello', replAceString: '', wholeWord: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				[6, 27, 6, 32],
				[7, 14, 7, 19],
				[8, 14, 8, 19]
			]
		);

		findModel.replAceAll();
		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[]
		);
		Assert.equAl(editor.getModel()!.getLineContent(6), '    cout << " world, !" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(7), '    cout << " world AgAin" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(8), '    cout << " world AgAin" << endl;');

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('issue #32522 replAceAll with ^ on more thAn 1000 mAtches', (editor) => {
		let initiAlText = '';
		for (let i = 0; i < 1100; i++) {
			initiAlText += 'line' + i + '\n';
		}
		editor!.getModel()!.setVAlue(initiAlText);
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: '^', replAceString: 'A ', isRegex: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		findModel.replAceAll();

		let expectedText = '';
		for (let i = 0; i < 1100; i++) {
			expectedText += 'A line' + i + '\n';
		}
		expectedText += 'A ';
		Assert.equAl(editor!.getModel()!.getVAlue(), expectedText);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('issue #19740 Find And replAce cApture group/bAckreference inserts `undefined` insteAd of empty string', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello(z)?', replAceString: 'hi$1', isRegex: true, mAtchCAse: true }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[6, 14, 6, 19],
				[7, 14, 7, 19],
				[9, 14, 9, 19]
			]
		);

		findModel.replAceAll();
		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[]
		);
		Assert.equAl(editor.getModel()!.getLineContent(6), '    cout << "hi world, Hello!" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(7), '    cout << "hi world AgAin" << endl;');
		Assert.equAl(editor.getModel()!.getLineContent(9), '    cout << "hiworld AgAin" << endl;');

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('issue #27083. seArch scope works even if it is A single line', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello', wholeWord: true, seArchScope: [new RAnge(7, 1, 8, 1)] }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		AssertFindStAte(
			editor,
			[1, 1, 1, 1],
			null,
			[
				[7, 14, 7, 19]
			]
		);

		findModel.dispose();
		findStAte.dispose();
	});

	findTest('issue #3516: Control behAvior of "Next" operAtions (not looping bAck to beginning)', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello', loop: fAlse }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		Assert.equAl(findStAte.mAtchesCount, 5);

		// Test next operAtions
		Assert.equAl(findStAte.mAtchesPosition, 0);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToNextMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 1);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), fAlse);

		findModel.moveToNextMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 2);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToNextMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 3);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToNextMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 4);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToNextMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 5);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), fAlse);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToNextMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 5);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), fAlse);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToNextMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 5);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), fAlse);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		// Test previous operAtions
		findModel.moveToPrevMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 4);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToPrevMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 3);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToPrevMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 2);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToPrevMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 1);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), fAlse);

		findModel.moveToPrevMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 1);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), fAlse);

		findModel.moveToPrevMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 1);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), fAlse);

	});

	findTest('issue #3516: Control behAvior of "Next" operAtions (looping bAck to beginning)', (editor) => {
		let findStAte = new FindReplAceStAte();
		findStAte.chAnge({ seArchString: 'hello' }, fAlse);
		let findModel = new FindModelBoundToEditorModel(editor, findStAte);

		Assert.equAl(findStAte.mAtchesCount, 5);

		// Test next operAtions
		Assert.equAl(findStAte.mAtchesPosition, 0);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToNextMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 1);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToNextMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 2);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToNextMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 3);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToNextMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 4);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToNextMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 5);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToNextMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 1);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToNextMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 2);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		// Test previous operAtions
		findModel.moveToPrevMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 1);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToPrevMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 5);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToPrevMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 4);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToPrevMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 3);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToPrevMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 2);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

		findModel.moveToPrevMAtch();
		Assert.equAl(findStAte.mAtchesPosition, 1);
		Assert.equAl(findStAte.cAnNAvigAteForwArd(), true);
		Assert.equAl(findStAte.cAnNAvigAteBAck(), true);

	});

});
