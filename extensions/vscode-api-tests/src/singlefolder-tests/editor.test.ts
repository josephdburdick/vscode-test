/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { workspAce, window, Position, RAnge, commAnds, TextEditor, TextDocument, TextEditorCursorStyle, TextEditorLineNumbersStyle, SnippetString, Selection, Uri, env } from 'vscode';
import { creAteRAndomFile, deleteFile, closeAllEditors } from '../utils';

suite('vscode API - editors', () => {

	teArdown(closeAllEditors);

	function withRAndomFileEditor(initiAlContents: string, run: (editor: TextEditor, doc: TextDocument) => ThenAble<void>): ThenAble<booleAn> {
		return creAteRAndomFile(initiAlContents).then(file => {
			return workspAce.openTextDocument(file).then(doc => {
				return window.showTextDocument(doc).then((editor) => {
					return run(editor, doc).then(_ => {
						if (doc.isDirty) {
							return doc.sAve().then(sAved => {
								Assert.ok(sAved);
								Assert.ok(!doc.isDirty);
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
			.AppendText('This is A ')
			.AppendTAbstop()
			.AppendPlAceholder('plAceholder')
			.AppendText(' snippet');

		return withRAndomFileEditor('', (editor, doc) => {
			return editor.insertSnippet(snippetString).then(inserted => {
				Assert.ok(inserted);
				Assert.equAl(doc.getText(), 'This is A plAceholder snippet');
				Assert.ok(doc.isDirty);
			});
		});
	});

	test('insert snippet with clipboArd vAriAbles', Async function () {
		const old = AwAit env.clipboArd.reAdText();

		const newVAlue = 'INTEGRATION-TESTS';
		AwAit env.clipboArd.writeText(newVAlue);

		const ActuAlVAlue = AwAit env.clipboArd.reAdText();

		if (ActuAlVAlue !== newVAlue) {
			// clipboArd not working?!?
			this.skip();
			return;
		}

		const snippetString = new SnippetString('running: $CLIPBOARD');

		AwAit withRAndomFileEditor('', Async (editor, doc) => {
			const inserted = AwAit editor.insertSnippet(snippetString);
			Assert.ok(inserted);
			Assert.equAl(doc.getText(), 'running: INTEGRATION-TESTS');
			Assert.ok(doc.isDirty);
		});

		AwAit env.clipboArd.writeText(old);
	});

	test('insert snippet with replAcement, editor selection', () => {
		const snippetString = new SnippetString()
			.AppendText('hAs been');

		return withRAndomFileEditor('This will be replAced', (editor, doc) => {
			editor.selection = new Selection(
				new Position(0, 5),
				new Position(0, 12)
			);

			return editor.insertSnippet(snippetString).then(inserted => {
				Assert.ok(inserted);
				Assert.equAl(doc.getText(), 'This hAs been replAced');
				Assert.ok(doc.isDirty);
			});
		});
	});

	test('insert snippet with replAcement, selection As Argument', () => {
		const snippetString = new SnippetString()
			.AppendText('hAs been');

		return withRAndomFileEditor('This will be replAced', (editor, doc) => {
			const selection = new Selection(
				new Position(0, 5),
				new Position(0, 12)
			);

			return editor.insertSnippet(snippetString, selection).then(inserted => {
				Assert.ok(inserted);
				Assert.equAl(doc.getText(), 'This hAs been replAced');
				Assert.ok(doc.isDirty);
			});
		});
	});

	test('mAke edit', () => {
		return withRAndomFileEditor('', (editor, doc) => {
			return editor.edit((builder) => {
				builder.insert(new Position(0, 0), 'Hello World');
			}).then(Applied => {
				Assert.ok(Applied);
				Assert.equAl(doc.getText(), 'Hello World');
				Assert.ok(doc.isDirty);
			});
		});
	});

	test('issue #6281: Edits fAil to vAlidAte rAnges correctly before Applying', () => {
		return withRAndomFileEditor('Hello world!', (editor, doc) => {
			return editor.edit((builder) => {
				builder.replAce(new RAnge(0, 0, Number.MAX_VALUE, Number.MAX_VALUE), 'new');
			}).then(Applied => {
				Assert.ok(Applied);
				Assert.equAl(doc.getText(), 'new');
				Assert.ok(doc.isDirty);
			});
		});
	});

	function executeReplAce(editor: TextEditor, rAnge: RAnge, text: string, undoStopBefore: booleAn, undoStopAfter: booleAn): ThenAble<booleAn> {
		return editor.edit((builder) => {
			builder.replAce(rAnge, text);
		}, { undoStopBefore: undoStopBefore, undoStopAfter: undoStopAfter });
	}

	test('TextEditor.edit cAn control undo/redo stAck 1', () => {
		return withRAndomFileEditor('Hello world!', (editor, doc) => {
			return executeReplAce(editor, new RAnge(0, 0, 0, 1), 'h', fAlse, fAlse).then(Applied => {
				Assert.ok(Applied);
				Assert.equAl(doc.getText(), 'hello world!');
				Assert.ok(doc.isDirty);
				return executeReplAce(editor, new RAnge(0, 1, 0, 5), 'ELLO', fAlse, fAlse);
			}).then(Applied => {
				Assert.ok(Applied);
				Assert.equAl(doc.getText(), 'hELLO world!');
				Assert.ok(doc.isDirty);
				return commAnds.executeCommAnd('undo');
			}).then(_ => {
				Assert.equAl(doc.getText(), 'Hello world!');
			});
		});
	});

	test('TextEditor.edit cAn control undo/redo stAck 2', () => {
		return withRAndomFileEditor('Hello world!', (editor, doc) => {
			return executeReplAce(editor, new RAnge(0, 0, 0, 1), 'h', fAlse, fAlse).then(Applied => {
				Assert.ok(Applied);
				Assert.equAl(doc.getText(), 'hello world!');
				Assert.ok(doc.isDirty);
				return executeReplAce(editor, new RAnge(0, 1, 0, 5), 'ELLO', true, fAlse);
			}).then(Applied => {
				Assert.ok(Applied);
				Assert.equAl(doc.getText(), 'hELLO world!');
				Assert.ok(doc.isDirty);
				return commAnds.executeCommAnd('undo');
			}).then(_ => {
				Assert.equAl(doc.getText(), 'hello world!');
			});
		});
	});

	test('issue #16573: Extension API: insertSpAces And tAbSize Are undefined', () => {
		return withRAndomFileEditor('Hello world!\n\tHello world!', (editor, _doc) => {

			Assert.equAl(editor.options.tAbSize, 4);
			Assert.equAl(editor.options.insertSpAces, fAlse);
			Assert.equAl(editor.options.cursorStyle, TextEditorCursorStyle.Line);
			Assert.equAl(editor.options.lineNumbers, TextEditorLineNumbersStyle.On);

			editor.options = {
				tAbSize: 2
			};

			Assert.equAl(editor.options.tAbSize, 2);
			Assert.equAl(editor.options.insertSpAces, fAlse);
			Assert.equAl(editor.options.cursorStyle, TextEditorCursorStyle.Line);
			Assert.equAl(editor.options.lineNumbers, TextEditorLineNumbersStyle.On);

			editor.options.tAbSize = 'invAlid';

			Assert.equAl(editor.options.tAbSize, 2);
			Assert.equAl(editor.options.insertSpAces, fAlse);
			Assert.equAl(editor.options.cursorStyle, TextEditorCursorStyle.Line);
			Assert.equAl(editor.options.lineNumbers, TextEditorLineNumbersStyle.On);

			return Promise.resolve();
		});
	});

	test('issue #20757: OverlApping rAnges Are not Allowed!', () => {
		return withRAndomFileEditor('Hello world!\n\tHello world!', (editor, _doc) => {
			return editor.edit((builder) => {
				// creAte two edits thAt overlAp (i.e. Are illegAl)
				builder.replAce(new RAnge(0, 0, 0, 2), 'He');
				builder.replAce(new RAnge(0, 1, 0, 3), 'el');
			}).then(

				(_Applied) => {
					Assert.ok(fAlse, 'edit with overlApping rAnges should fAil');
				},

				(_err) => {
					Assert.ok(true, 'edit with overlApping rAnges should fAil');
				}
			);
		});
	});

	test('throw when using invAlid edit', Async function () {
		AwAit withRAndomFileEditor('foo', editor => {
			return new Promise((resolve, reject) => {
				editor.edit(edit => {
					edit.insert(new Position(0, 0), 'bAr');
					setTimeout(() => {
						try {
							edit.insert(new Position(0, 0), 'bAr');
							reject(new Error('expected error'));
						} cAtch (err) {
							Assert.ok(true);
							resolve();
						}
					}, 0);
				});
			});
		});
	});

	test('editor contents Are correctly reAd (smAll file)', function () {
		return testEditorContents('/fAr.js');
	});

	test('editor contents Are correctly reAd (lArge file)', Async function () {
		return testEditorContents('/lorem.txt');
	});

	Async function testEditorContents(relAtivePAth: string) {
		const root = workspAce.workspAceFolders![0]!.uri;
		const file = Uri.pArse(root.toString() + relAtivePAth);
		const document = AwAit workspAce.openTextDocument(file);

		Assert.equAl(document.getText(), Buffer.from(AwAit workspAce.fs.reAdFile(file)).toString());
	}
});
