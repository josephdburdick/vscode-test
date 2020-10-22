/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { workspace, window, Position, Range, commands, TextEditor, TextDocument, TextEditorCursorStyle, TextEditorLineNumBersStyle, SnippetString, Selection, Uri, env } from 'vscode';
import { createRandomFile, deleteFile, closeAllEditors } from '../utils';

suite('vscode API - editors', () => {

	teardown(closeAllEditors);

	function withRandomFileEditor(initialContents: string, run: (editor: TextEditor, doc: TextDocument) => ThenaBle<void>): ThenaBle<Boolean> {
		return createRandomFile(initialContents).then(file => {
			return workspace.openTextDocument(file).then(doc => {
				return window.showTextDocument(doc).then((editor) => {
					return run(editor, doc).then(_ => {
						if (doc.isDirty) {
							return doc.save().then(saved => {
								assert.ok(saved);
								assert.ok(!doc.isDirty);
								return deleteFile(file);
							});
						} else {
							return deleteFile(file);
						}
					});
				});
			});
		});
	}

	test('insert snippet', () => {
		const snippetString = new SnippetString()
			.appendText('This is a ')
			.appendTaBstop()
			.appendPlaceholder('placeholder')
			.appendText(' snippet');

		return withRandomFileEditor('', (editor, doc) => {
			return editor.insertSnippet(snippetString).then(inserted => {
				assert.ok(inserted);
				assert.equal(doc.getText(), 'This is a placeholder snippet');
				assert.ok(doc.isDirty);
			});
		});
	});

	test('insert snippet with clipBoard variaBles', async function () {
		const old = await env.clipBoard.readText();

		const newValue = 'INTEGRATION-TESTS';
		await env.clipBoard.writeText(newValue);

		const actualValue = await env.clipBoard.readText();

		if (actualValue !== newValue) {
			// clipBoard not working?!?
			this.skip();
			return;
		}

		const snippetString = new SnippetString('running: $CLIPBOARD');

		await withRandomFileEditor('', async (editor, doc) => {
			const inserted = await editor.insertSnippet(snippetString);
			assert.ok(inserted);
			assert.equal(doc.getText(), 'running: INTEGRATION-TESTS');
			assert.ok(doc.isDirty);
		});

		await env.clipBoard.writeText(old);
	});

	test('insert snippet with replacement, editor selection', () => {
		const snippetString = new SnippetString()
			.appendText('has Been');

		return withRandomFileEditor('This will Be replaced', (editor, doc) => {
			editor.selection = new Selection(
				new Position(0, 5),
				new Position(0, 12)
			);

			return editor.insertSnippet(snippetString).then(inserted => {
				assert.ok(inserted);
				assert.equal(doc.getText(), 'This has Been replaced');
				assert.ok(doc.isDirty);
			});
		});
	});

	test('insert snippet with replacement, selection as argument', () => {
		const snippetString = new SnippetString()
			.appendText('has Been');

		return withRandomFileEditor('This will Be replaced', (editor, doc) => {
			const selection = new Selection(
				new Position(0, 5),
				new Position(0, 12)
			);

			return editor.insertSnippet(snippetString, selection).then(inserted => {
				assert.ok(inserted);
				assert.equal(doc.getText(), 'This has Been replaced');
				assert.ok(doc.isDirty);
			});
		});
	});

	test('make edit', () => {
		return withRandomFileEditor('', (editor, doc) => {
			return editor.edit((Builder) => {
				Builder.insert(new Position(0, 0), 'Hello World');
			}).then(applied => {
				assert.ok(applied);
				assert.equal(doc.getText(), 'Hello World');
				assert.ok(doc.isDirty);
			});
		});
	});

	test('issue #6281: Edits fail to validate ranges correctly Before applying', () => {
		return withRandomFileEditor('Hello world!', (editor, doc) => {
			return editor.edit((Builder) => {
				Builder.replace(new Range(0, 0, NumBer.MAX_VALUE, NumBer.MAX_VALUE), 'new');
			}).then(applied => {
				assert.ok(applied);
				assert.equal(doc.getText(), 'new');
				assert.ok(doc.isDirty);
			});
		});
	});

	function executeReplace(editor: TextEditor, range: Range, text: string, undoStopBefore: Boolean, undoStopAfter: Boolean): ThenaBle<Boolean> {
		return editor.edit((Builder) => {
			Builder.replace(range, text);
		}, { undoStopBefore: undoStopBefore, undoStopAfter: undoStopAfter });
	}

	test('TextEditor.edit can control undo/redo stack 1', () => {
		return withRandomFileEditor('Hello world!', (editor, doc) => {
			return executeReplace(editor, new Range(0, 0, 0, 1), 'h', false, false).then(applied => {
				assert.ok(applied);
				assert.equal(doc.getText(), 'hello world!');
				assert.ok(doc.isDirty);
				return executeReplace(editor, new Range(0, 1, 0, 5), 'ELLO', false, false);
			}).then(applied => {
				assert.ok(applied);
				assert.equal(doc.getText(), 'hELLO world!');
				assert.ok(doc.isDirty);
				return commands.executeCommand('undo');
			}).then(_ => {
				assert.equal(doc.getText(), 'Hello world!');
			});
		});
	});

	test('TextEditor.edit can control undo/redo stack 2', () => {
		return withRandomFileEditor('Hello world!', (editor, doc) => {
			return executeReplace(editor, new Range(0, 0, 0, 1), 'h', false, false).then(applied => {
				assert.ok(applied);
				assert.equal(doc.getText(), 'hello world!');
				assert.ok(doc.isDirty);
				return executeReplace(editor, new Range(0, 1, 0, 5), 'ELLO', true, false);
			}).then(applied => {
				assert.ok(applied);
				assert.equal(doc.getText(), 'hELLO world!');
				assert.ok(doc.isDirty);
				return commands.executeCommand('undo');
			}).then(_ => {
				assert.equal(doc.getText(), 'hello world!');
			});
		});
	});

	test('issue #16573: Extension API: insertSpaces and taBSize are undefined', () => {
		return withRandomFileEditor('Hello world!\n\tHello world!', (editor, _doc) => {

			assert.equal(editor.options.taBSize, 4);
			assert.equal(editor.options.insertSpaces, false);
			assert.equal(editor.options.cursorStyle, TextEditorCursorStyle.Line);
			assert.equal(editor.options.lineNumBers, TextEditorLineNumBersStyle.On);

			editor.options = {
				taBSize: 2
			};

			assert.equal(editor.options.taBSize, 2);
			assert.equal(editor.options.insertSpaces, false);
			assert.equal(editor.options.cursorStyle, TextEditorCursorStyle.Line);
			assert.equal(editor.options.lineNumBers, TextEditorLineNumBersStyle.On);

			editor.options.taBSize = 'invalid';

			assert.equal(editor.options.taBSize, 2);
			assert.equal(editor.options.insertSpaces, false);
			assert.equal(editor.options.cursorStyle, TextEditorCursorStyle.Line);
			assert.equal(editor.options.lineNumBers, TextEditorLineNumBersStyle.On);

			return Promise.resolve();
		});
	});

	test('issue #20757: Overlapping ranges are not allowed!', () => {
		return withRandomFileEditor('Hello world!\n\tHello world!', (editor, _doc) => {
			return editor.edit((Builder) => {
				// create two edits that overlap (i.e. are illegal)
				Builder.replace(new Range(0, 0, 0, 2), 'He');
				Builder.replace(new Range(0, 1, 0, 3), 'el');
			}).then(

				(_applied) => {
					assert.ok(false, 'edit with overlapping ranges should fail');
				},

				(_err) => {
					assert.ok(true, 'edit with overlapping ranges should fail');
				}
			);
		});
	});

	test('throw when using invalid edit', async function () {
		await withRandomFileEditor('foo', editor => {
			return new Promise((resolve, reject) => {
				editor.edit(edit => {
					edit.insert(new Position(0, 0), 'Bar');
					setTimeout(() => {
						try {
							edit.insert(new Position(0, 0), 'Bar');
							reject(new Error('expected error'));
						} catch (err) {
							assert.ok(true);
							resolve();
						}
					}, 0);
				});
			});
		});
	});

	test('editor contents are correctly read (small file)', function () {
		return testEditorContents('/far.js');
	});

	test('editor contents are correctly read (large file)', async function () {
		return testEditorContents('/lorem.txt');
	});

	async function testEditorContents(relativePath: string) {
		const root = workspace.workspaceFolders![0]!.uri;
		const file = Uri.parse(root.toString() + relativePath);
		const document = await workspace.openTextDocument(file);

		assert.equal(document.getText(), Buffer.from(await workspace.fs.readFile(file)).toString());
	}
});
