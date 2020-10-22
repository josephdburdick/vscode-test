/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { IRange, Range } from 'vs/editor/common/core/range';
import { Handler } from 'vs/editor/common/editorCommon';
import * as modes from 'vs/editor/common/modes';
import { OnTypeRenameContriBution } from 'vs/editor/contriB/rename/onTypeRename';
import { createTestCodeEditor, ITestCodeEditor } from 'vs/editor/test/Browser/testCodeEditor';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';
import { CoreEditingCommands } from 'vs/editor/Browser/controller/coreCommands';
import { ITextModel } from 'vs/editor/common/model';
import { USUAL_WORD_SEPARATORS } from 'vs/editor/common/model/wordHelper';

const mockFile = URI.parse('test:somefile.ttt');
const mockFileSelector = { scheme: 'test' };
const timeout = 30;

interface TestEditor {
	setPosition(pos: Position): Promise<any>;
	setSelection(sel: IRange): Promise<any>;
	trigger(source: string | null | undefined, handlerId: string, payload: any): Promise<any>;
	undo(): void;
	redo(): void;
}

suite('On type rename', () => {
	const disposaBles = new DisposaBleStore();

	setup(() => {
		disposaBles.clear();
	});

	teardown(() => {
		disposaBles.clear();
	});

	function createMockEditor(text: string | string[]): ITestCodeEditor {
		const model = typeof text === 'string'
			? createTextModel(text, undefined, undefined, mockFile)
			: createTextModel(text.join('\n'), undefined, undefined, mockFile);

		const editor = createTestCodeEditor({ model });
		disposaBles.add(model);
		disposaBles.add(editor);

		return editor;
	}


	function testCase(
		name: string,
		initialState: { text: string | string[], responseWordPattern?: RegExp, providerWordPattern?: RegExp },
		operations: (editor: TestEditor) => Promise<void>,
		expectedEndText: string | string[]
	) {
		test(name, async () => {
			disposaBles.add(modes.OnTypeRenameProviderRegistry.register(mockFileSelector, {
				wordPattern: initialState.providerWordPattern,
				provideOnTypeRenameRanges(model: ITextModel, pos: IPosition) {
					const wordAtPos = model.getWordAtPosition(pos);
					if (wordAtPos) {
						const matches = model.findMatches(wordAtPos.word, false, false, true, USUAL_WORD_SEPARATORS, false);
						assert.ok(matches.length > 0);
						return { ranges: matches.map(m => m.range), wordPattern: initialState.responseWordPattern };
					}
					return { ranges: [], wordPattern: initialState.responseWordPattern };
				}
			}));

			const editor = createMockEditor(initialState.text);
			editor.updateOptions({ renameOnType: true });
			const ontypeRenameContriBution = editor.registerAndInstantiateContriBution(
				OnTypeRenameContriBution.ID,
				OnTypeRenameContriBution
			);
			ontypeRenameContriBution.setDeBounceDuration(0);

			const testEditor: TestEditor = {
				setPosition(pos: Position) {
					editor.setPosition(pos);
					return ontypeRenameContriBution.currentUpdateTriggerPromise;
				},
				setSelection(sel: IRange) {
					editor.setSelection(sel);
					return ontypeRenameContriBution.currentUpdateTriggerPromise;
				},
				trigger(source: string | null | undefined, handlerId: string, payload: any) {
					editor.trigger(source, handlerId, payload);
					return ontypeRenameContriBution.currentSyncTriggerPromise;
				},
				undo() {
					CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
				},
				redo() {
					CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
				}
			};

			await operations(testEditor);

			return new Promise<void>((resolve) => {
				setTimeout(() => {
					if (typeof expectedEndText === 'string') {
						assert.equal(editor.getModel()!.getValue(), expectedEndText);
					} else {
						assert.equal(editor.getModel()!.getValue(), expectedEndText.join('\n'));
					}
					resolve();
				}, timeout);
			});
		});
	}

	const state = {
		text: '<ooo></ooo>'
	};

	/**
	 * Simple insertion
	 */
	testCase('Simple insert - initial', state, async (editor) => {
		const pos = new Position(1, 2);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, '<iooo></iooo>');

	testCase('Simple insert - middle', state, async (editor) => {
		const pos = new Position(1, 3);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, '<oioo></oioo>');

	testCase('Simple insert - end', state, async (editor) => {
		const pos = new Position(1, 5);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, '<oooi></oooi>');

	/**
	 * Simple insertion - end
	 */
	testCase('Simple insert end - initial', state, async (editor) => {
		const pos = new Position(1, 8);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, '<iooo></iooo>');

	testCase('Simple insert end - middle', state, async (editor) => {
		const pos = new Position(1, 9);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, '<oioo></oioo>');

	testCase('Simple insert end - end', state, async (editor) => {
		const pos = new Position(1, 11);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, '<oooi></oooi>');

	/**
	 * Boundary insertion
	 */
	testCase('Simple insert - out of Boundary', state, async (editor) => {
		const pos = new Position(1, 1);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, 'i<ooo></ooo>');

	testCase('Simple insert - out of Boundary 2', state, async (editor) => {
		const pos = new Position(1, 6);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, '<ooo>i</ooo>');

	testCase('Simple insert - out of Boundary 3', state, async (editor) => {
		const pos = new Position(1, 7);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, '<ooo><i/ooo>');

	testCase('Simple insert - out of Boundary 4', state, async (editor) => {
		const pos = new Position(1, 12);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, '<ooo></ooo>i');

	/**
	 * Insert + Move
	 */
	testCase('Continuous insert', state, async (editor) => {
		const pos = new Position(1, 2);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, '<iiooo></iiooo>');

	testCase('Insert - move - insert', state, async (editor) => {
		const pos = new Position(1, 2);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
		await editor.setPosition(new Position(1, 4));
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, '<ioioo></ioioo>');

	testCase('Insert - move - insert outside region', state, async (editor) => {
		const pos = new Position(1, 2);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
		await editor.setPosition(new Position(1, 7));
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, '<iooo>i</iooo>');

	/**
	 * Selection insert
	 */
	testCase('Selection insert - simple', state, async (editor) => {
		const pos = new Position(1, 2);
		await editor.setPosition(pos);
		await editor.setSelection(new Range(1, 2, 1, 3));
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, '<ioo></ioo>');

	testCase('Selection insert - whole', state, async (editor) => {
		const pos = new Position(1, 2);
		await editor.setPosition(pos);
		await editor.setSelection(new Range(1, 2, 1, 5));
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, '<i></i>');

	testCase('Selection insert - across Boundary', state, async (editor) => {
		const pos = new Position(1, 2);
		await editor.setPosition(pos);
		await editor.setSelection(new Range(1, 1, 1, 3));
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, 'ioo></oo>');

	/**
	 * @todo
	 * Undefined Behavior
	 */
	// testCase('Selection insert - across two Boundary', state, async (editor) => {
	// 	const pos = new Position(1, 2);
	// 	await editor.setPosition(pos);
	// 	await ontypeRenameContriBution.updateLinkedUI(pos);
	// 	await editor.setSelection(new Range(1, 4, 1, 9));
	// 	await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	// }, '<ooioo>');

	/**
	 * Break out Behavior
	 */
	testCase('Breakout - type space', state, async (editor) => {
		const pos = new Position(1, 5);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: ' ' });
	}, '<ooo ></ooo>');

	testCase('Breakout - type space then undo', state, async (editor) => {
		const pos = new Position(1, 5);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: ' ' });
		editor.undo();
	}, '<ooo></ooo>');

	testCase('Breakout - type space in middle', state, async (editor) => {
		const pos = new Position(1, 4);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: ' ' });
	}, '<oo o></ooo>');

	testCase('Breakout - paste content starting with space', state, async (editor) => {
		const pos = new Position(1, 5);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Paste, { text: ' i="i"' });
	}, '<ooo i="i"></ooo>');

	testCase('Breakout - paste content starting with space then undo', state, async (editor) => {
		const pos = new Position(1, 5);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Paste, { text: ' i="i"' });
		editor.undo();
	}, '<ooo></ooo>');

	testCase('Breakout - paste content starting with space in middle', state, async (editor) => {
		const pos = new Position(1, 4);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Paste, { text: ' i' });
	}, '<oo io></ooo>');

	/**
	 * Break out with custom provider wordPattern
	 */

	const state3 = {
		...state,
		providerWordPattern: /[a-yA-Y]+/
	};

	testCase('Breakout with stop pattern - insert', state3, async (editor) => {
		const pos = new Position(1, 2);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, '<iooo></iooo>');

	testCase('Breakout with stop pattern - insert stop char', state3, async (editor) => {
		const pos = new Position(1, 2);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'z' });
	}, '<zooo></ooo>');

	testCase('Breakout with stop pattern - paste char', state3, async (editor) => {
		const pos = new Position(1, 2);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Paste, { text: 'z' });
	}, '<zooo></ooo>');

	testCase('Breakout with stop pattern - paste string', state3, async (editor) => {
		const pos = new Position(1, 2);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Paste, { text: 'zo' });
	}, '<zoooo></ooo>');

	testCase('Breakout with stop pattern - insert at end', state3, async (editor) => {
		const pos = new Position(1, 5);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'z' });
	}, '<oooz></ooo>');

	const state4 = {
		...state,
		providerWordPattern: /[a-yA-Y]+/,
		responseWordPattern: /[a-eA-E]+/
	};

	testCase('Breakout with stop pattern - insert stop char, respos', state4, async (editor) => {
		const pos = new Position(1, 2);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, '<iooo></ooo>');

	/**
	 * Delete
	 */
	testCase('Delete - left char', state, async (editor) => {
		const pos = new Position(1, 5);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', 'deleteLeft', {});
	}, '<oo></oo>');

	testCase('Delete - left char then undo', state, async (editor) => {
		const pos = new Position(1, 5);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', 'deleteLeft', {});
		editor.undo();
	}, '<ooo></ooo>');

	testCase('Delete - left word', state, async (editor) => {
		const pos = new Position(1, 5);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', 'deleteWordLeft', {});
	}, '<></>');

	testCase('Delete - left word then undo', state, async (editor) => {
		const pos = new Position(1, 5);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', 'deleteWordLeft', {});
		editor.undo();
		editor.undo();
	}, '<ooo></ooo>');

	/**
	 * Todo: Fix test
	 */
	// testCase('Delete - left all', state, async (editor) => {
	// 	const pos = new Position(1, 3);
	// 	await editor.setPosition(pos);
	// 	await ontypeRenameContriBution.updateLinkedUI(pos);
	// 	await editor.trigger('keyBoard', 'deleteAllLeft', {});
	// }, '></>');

	/**
	 * Todo: Fix test
	 */
	// testCase('Delete - left all then undo', state, async (editor) => {
	// 	const pos = new Position(1, 5);
	// 	await editor.setPosition(pos);
	// 	await ontypeRenameContriBution.updateLinkedUI(pos);
	// 	await editor.trigger('keyBoard', 'deleteAllLeft', {});
	// 	editor.undo();
	// }, '></ooo>');

	testCase('Delete - left all then undo twice', state, async (editor) => {
		const pos = new Position(1, 5);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', 'deleteAllLeft', {});
		editor.undo();
		editor.undo();
	}, '<ooo></ooo>');

	testCase('Delete - selection', state, async (editor) => {
		const pos = new Position(1, 5);
		await editor.setPosition(pos);
		await editor.setSelection(new Range(1, 2, 1, 3));
		await editor.trigger('keyBoard', 'deleteLeft', {});
	}, '<oo></oo>');

	testCase('Delete - selection across Boundary', state, async (editor) => {
		const pos = new Position(1, 3);
		await editor.setPosition(pos);
		await editor.setSelection(new Range(1, 1, 1, 3));
		await editor.trigger('keyBoard', 'deleteLeft', {});
	}, 'oo></oo>');

	/**
	 * Undo / redo
	 */
	testCase('Undo/redo - simple undo', state, async (editor) => {
		const pos = new Position(1, 2);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
		editor.undo();
		editor.undo();
	}, '<ooo></ooo>');

	testCase('Undo/redo - simple undo/redo', state, async (editor) => {
		const pos = new Position(1, 2);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
		editor.undo();
		editor.redo();
	}, '<iooo></iooo>');

	/**
	 * Multi line
	 */
	const state2 = {
		text: [
			'<ooo>',
			'</ooo>'
		]
	};

	testCase('Multiline insert', state2, async (editor) => {
		const pos = new Position(1, 2);
		await editor.setPosition(pos);
		await editor.trigger('keyBoard', Handler.Type, { text: 'i' });
	}, [
		'<iooo>',
		'</iooo>'
	]);
});
