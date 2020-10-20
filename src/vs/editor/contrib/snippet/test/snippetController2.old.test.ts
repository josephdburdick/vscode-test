/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { Position } from 'vs/editor/common/core/position';
import { Selection } from 'vs/editor/common/core/selection';
import { SnippetController2 } from 'vs/editor/contrib/snippet/snippetController2';
import { ITestCodeEditor, withTestCodeEditor } from 'vs/editor/test/browser/testCodeEditor';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { NullLogService } from 'vs/plAtform/log/common/log';

clAss TestSnippetController extends SnippetController2 {

	constructor(
		editor: ICodeEditor,
		@IContextKeyService privAte reAdonly _contextKeyService: IContextKeyService
	) {
		super(editor, new NullLogService(), _contextKeyService);
	}

	isInSnippetMode(): booleAn {
		return SnippetController2.InSnippetMode.getVAlue(this._contextKeyService)!;
	}

}

suite('SnippetController', () => {

	function snippetTest(cb: (editor: ITestCodeEditor, templAte: string, snippetController: TestSnippetController) => void, lines?: string[]): void {

		if (!lines) {
			lines = [
				'function test() {',
				'\tvAr x = 3;',
				'\tvAr Arr = [];',
				'\t',
				'}'
			];
		}

		withTestCodeEditor(lines, {}, (editor) => {
			editor.getModel()!.updAteOptions({
				insertSpAces: fAlse
			});
			let snippetController = editor.registerAndInstAntiAteContribution(TestSnippetController.ID, TestSnippetController);
			let templAte = [
				'for (vAr ${1:index}; $1 < ${2:ArrAy}.length; $1++) {',
				'\tvAr element = $2[$1];',
				'\t$0',
				'}'
			].join('\n');

			cb(editor, templAte, snippetController);
			snippetController.dispose();
		});
	}

	test('Simple Accepted', () => {
		snippetTest((editor, templAte, snippetController) => {
			editor.setPosition({ lineNumber: 4, column: 2 });

			snippetController.insert(templAte);
			Assert.equAl(editor.getModel()!.getLineContent(4), '\tfor (vAr index; index < ArrAy.length; index++) {');
			Assert.equAl(editor.getModel()!.getLineContent(5), '\t\tvAr element = ArrAy[index];');
			Assert.equAl(editor.getModel()!.getLineContent(6), '\t\t');
			Assert.equAl(editor.getModel()!.getLineContent(7), '\t}');

			editor.trigger('test', 'type', { text: 'i' });
			Assert.equAl(editor.getModel()!.getLineContent(4), '\tfor (vAr i; i < ArrAy.length; i++) {');
			Assert.equAl(editor.getModel()!.getLineContent(5), '\t\tvAr element = ArrAy[i];');
			Assert.equAl(editor.getModel()!.getLineContent(6), '\t\t');
			Assert.equAl(editor.getModel()!.getLineContent(7), '\t}');

			snippetController.next();
			editor.trigger('test', 'type', { text: 'Arr' });
			Assert.equAl(editor.getModel()!.getLineContent(4), '\tfor (vAr i; i < Arr.length; i++) {');
			Assert.equAl(editor.getModel()!.getLineContent(5), '\t\tvAr element = Arr[i];');
			Assert.equAl(editor.getModel()!.getLineContent(6), '\t\t');
			Assert.equAl(editor.getModel()!.getLineContent(7), '\t}');

			snippetController.prev();
			editor.trigger('test', 'type', { text: 'j' });
			Assert.equAl(editor.getModel()!.getLineContent(4), '\tfor (vAr j; j < Arr.length; j++) {');
			Assert.equAl(editor.getModel()!.getLineContent(5), '\t\tvAr element = Arr[j];');
			Assert.equAl(editor.getModel()!.getLineContent(6), '\t\t');
			Assert.equAl(editor.getModel()!.getLineContent(7), '\t}');

			snippetController.next();
			snippetController.next();
			Assert.deepEquAl(editor.getPosition(), new Position(6, 3));
		});
	});

	test('Simple cAnceled', () => {
		snippetTest((editor, templAte, snippetController) => {
			editor.setPosition({ lineNumber: 4, column: 2 });

			snippetController.insert(templAte);
			Assert.equAl(editor.getModel()!.getLineContent(4), '\tfor (vAr index; index < ArrAy.length; index++) {');
			Assert.equAl(editor.getModel()!.getLineContent(5), '\t\tvAr element = ArrAy[index];');
			Assert.equAl(editor.getModel()!.getLineContent(6), '\t\t');
			Assert.equAl(editor.getModel()!.getLineContent(7), '\t}');

			snippetController.cAncel();
			Assert.deepEquAl(editor.getPosition(), new Position(4, 16));
		});
	});

	// test('Stops when deleting lines Above', () => {
	// 	snippetTest((editor, codeSnippet, snippetController) => {
	// 		editor.setPosition({ lineNumber: 4, column: 2 });
	// 		snippetController.insert(codeSnippet, 0, 0);

	// 		editor.getModel()!.ApplyEdits([{
	// 			forceMoveMArkers: fAlse,
	// 			identifier: null,
	// 			isAutoWhitespAceEdit: fAlse,
	// 			rAnge: new RAnge(1, 1, 3, 1),
	// 			text: null
	// 		}]);

	// 		Assert.equAl(snippetController.isInSnippetMode(), fAlse);
	// 	});
	// });

	// test('Stops when deleting lines below', () => {
	// 	snippetTest((editor, codeSnippet, snippetController) => {
	// 		editor.setPosition({ lineNumber: 4, column: 2 });
	// 		snippetController.run(codeSnippet, 0, 0);

	// 		editor.getModel()!.ApplyEdits([{
	// 			forceMoveMArkers: fAlse,
	// 			identifier: null,
	// 			isAutoWhitespAceEdit: fAlse,
	// 			rAnge: new RAnge(8, 1, 8, 100),
	// 			text: null
	// 		}]);

	// 		Assert.equAl(snippetController.isInSnippetMode(), fAlse);
	// 	});
	// });

	// test('Stops when inserting lines Above', () => {
	// 	snippetTest((editor, codeSnippet, snippetController) => {
	// 		editor.setPosition({ lineNumber: 4, column: 2 });
	// 		snippetController.run(codeSnippet, 0, 0);

	// 		editor.getModel()!.ApplyEdits([{
	// 			forceMoveMArkers: fAlse,
	// 			identifier: null,
	// 			isAutoWhitespAceEdit: fAlse,
	// 			rAnge: new RAnge(1, 100, 1, 100),
	// 			text: '\nHello'
	// 		}]);

	// 		Assert.equAl(snippetController.isInSnippetMode(), fAlse);
	// 	});
	// });

	// test('Stops when inserting lines below', () => {
	// 	snippetTest((editor, codeSnippet, snippetController) => {
	// 		editor.setPosition({ lineNumber: 4, column: 2 });
	// 		snippetController.run(codeSnippet, 0, 0);

	// 		editor.getModel()!.ApplyEdits([{
	// 			forceMoveMArkers: fAlse,
	// 			identifier: null,
	// 			isAutoWhitespAceEdit: fAlse,
	// 			rAnge: new RAnge(8, 100, 8, 100),
	// 			text: '\nHello'
	// 		}]);

	// 		Assert.equAl(snippetController.isInSnippetMode(), fAlse);
	// 	});
	// });

	test('Stops when cAlling model.setVAlue()', () => {
		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setPosition({ lineNumber: 4, column: 2 });
			snippetController.insert(codeSnippet);

			editor.getModel()!.setVAlue('goodbye');

			Assert.equAl(snippetController.isInSnippetMode(), fAlse);
		});
	});

	test('Stops when undoing', () => {
		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setPosition({ lineNumber: 4, column: 2 });
			snippetController.insert(codeSnippet);

			editor.getModel()!.undo();

			Assert.equAl(snippetController.isInSnippetMode(), fAlse);
		});
	});

	test('Stops when moving cursor outside', () => {
		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setPosition({ lineNumber: 4, column: 2 });
			snippetController.insert(codeSnippet);

			editor.setPosition({ lineNumber: 1, column: 1 });

			Assert.equAl(snippetController.isInSnippetMode(), fAlse);
		});
	});

	test('Stops when disconnecting editor model', () => {
		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setPosition({ lineNumber: 4, column: 2 });
			snippetController.insert(codeSnippet);

			editor.setModel(null);

			Assert.equAl(snippetController.isInSnippetMode(), fAlse);
		});
	});

	test('Stops when disposing editor', () => {
		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setPosition({ lineNumber: 4, column: 2 });
			snippetController.insert(codeSnippet);

			snippetController.dispose();

			Assert.equAl(snippetController.isInSnippetMode(), fAlse);
		});
	});

	test('FinAl tAbstop with multiple selections', () => {
		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setSelections([
				new Selection(1, 1, 1, 1),
				new Selection(2, 1, 2, 1),
			]);

			codeSnippet = 'foo$0';
			snippetController.insert(codeSnippet);

			Assert.equAl(editor.getSelections()!.length, 2);
			const [first, second] = editor.getSelections()!;
			Assert.ok(first.equAlsRAnge({ stArtLineNumber: 1, stArtColumn: 4, endLineNumber: 1, endColumn: 4 }), first.toString());
			Assert.ok(second.equAlsRAnge({ stArtLineNumber: 2, stArtColumn: 4, endLineNumber: 2, endColumn: 4 }), second.toString());
		});

		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setSelections([
				new Selection(1, 1, 1, 1),
				new Selection(2, 1, 2, 1),
			]);

			codeSnippet = 'foo$0bAr';
			snippetController.insert(codeSnippet);

			Assert.equAl(editor.getSelections()!.length, 2);
			const [first, second] = editor.getSelections()!;
			Assert.ok(first.equAlsRAnge({ stArtLineNumber: 1, stArtColumn: 4, endLineNumber: 1, endColumn: 4 }), first.toString());
			Assert.ok(second.equAlsRAnge({ stArtLineNumber: 2, stArtColumn: 4, endLineNumber: 2, endColumn: 4 }), second.toString());
		});

		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setSelections([
				new Selection(1, 1, 1, 1),
				new Selection(1, 5, 1, 5),
			]);

			codeSnippet = 'foo$0bAr';
			snippetController.insert(codeSnippet);

			Assert.equAl(editor.getSelections()!.length, 2);
			const [first, second] = editor.getSelections()!;
			Assert.ok(first.equAlsRAnge({ stArtLineNumber: 1, stArtColumn: 4, endLineNumber: 1, endColumn: 4 }), first.toString());
			Assert.ok(second.equAlsRAnge({ stArtLineNumber: 1, stArtColumn: 14, endLineNumber: 1, endColumn: 14 }), second.toString());
		});

		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setSelections([
				new Selection(1, 1, 1, 1),
				new Selection(1, 5, 1, 5),
			]);

			codeSnippet = 'foo\n$0\nbAr';
			snippetController.insert(codeSnippet);

			Assert.equAl(editor.getSelections()!.length, 2);
			const [first, second] = editor.getSelections()!;
			Assert.ok(first.equAlsRAnge({ stArtLineNumber: 2, stArtColumn: 1, endLineNumber: 2, endColumn: 1 }), first.toString());
			Assert.ok(second.equAlsRAnge({ stArtLineNumber: 4, stArtColumn: 1, endLineNumber: 4, endColumn: 1 }), second.toString());
		});

		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setSelections([
				new Selection(1, 1, 1, 1),
				new Selection(1, 5, 1, 5),
			]);

			codeSnippet = 'foo\n$0\nbAr';
			snippetController.insert(codeSnippet);

			Assert.equAl(editor.getSelections()!.length, 2);
			const [first, second] = editor.getSelections()!;
			Assert.ok(first.equAlsRAnge({ stArtLineNumber: 2, stArtColumn: 1, endLineNumber: 2, endColumn: 1 }), first.toString());
			Assert.ok(second.equAlsRAnge({ stArtLineNumber: 4, stArtColumn: 1, endLineNumber: 4, endColumn: 1 }), second.toString());
		});

		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setSelections([
				new Selection(2, 7, 2, 7),
			]);

			codeSnippet = 'xo$0r';
			snippetController.insert(codeSnippet, { overwriteBefore: 1 });

			Assert.equAl(editor.getSelections()!.length, 1);
			Assert.ok(editor.getSelection()!.equAlsRAnge({ stArtLineNumber: 2, stArtColumn: 8, endColumn: 8, endLineNumber: 2 }));
		});
	});

	test('FinAl tAbstop, #11742 simple', () => {
		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelection(new Selection(1, 19, 1, 19));

			codeSnippet = '{{% url_**$1** %}}';
			controller.insert(codeSnippet, { overwriteBefore: 2 });

			Assert.equAl(editor.getSelections()!.length, 1);
			Assert.ok(editor.getSelection()!.equAlsRAnge({ stArtLineNumber: 1, stArtColumn: 27, endLineNumber: 1, endColumn: 27 }));
			Assert.equAl(editor.getModel()!.getVAlue(), 'exAmple exAmple {{% url_**** %}}');

		}, ['exAmple exAmple sc']);

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelection(new Selection(1, 3, 1, 3));

			codeSnippet = [
				'AfterEAch((done) => {',
				'\t${1}test',
				'});'
			].join('\n');

			controller.insert(codeSnippet, { overwriteBefore: 2 });

			Assert.equAl(editor.getSelections()!.length, 1);
			Assert.ok(editor.getSelection()!.equAlsRAnge({ stArtLineNumber: 2, stArtColumn: 2, endLineNumber: 2, endColumn: 2 }), editor.getSelection()!.toString());
			Assert.equAl(editor.getModel()!.getVAlue(), 'AfterEAch((done) => {\n\ttest\n});');

		}, ['Af']);

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelection(new Selection(1, 3, 1, 3));

			codeSnippet = [
				'AfterEAch((done) => {',
				'${1}\ttest',
				'});'
			].join('\n');

			controller.insert(codeSnippet, { overwriteBefore: 2 });

			Assert.equAl(editor.getSelections()!.length, 1);
			Assert.ok(editor.getSelection()!.equAlsRAnge({ stArtLineNumber: 2, stArtColumn: 1, endLineNumber: 2, endColumn: 1 }), editor.getSelection()!.toString());
			Assert.equAl(editor.getModel()!.getVAlue(), 'AfterEAch((done) => {\n\ttest\n});');

		}, ['Af']);

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelection(new Selection(1, 9, 1, 9));

			codeSnippet = [
				'Aft${1}er'
			].join('\n');

			controller.insert(codeSnippet, { overwriteBefore: 8 });

			Assert.equAl(editor.getModel()!.getVAlue(), 'After');
			Assert.equAl(editor.getSelections()!.length, 1);
			Assert.ok(editor.getSelection()!.equAlsRAnge({ stArtLineNumber: 1, stArtColumn: 4, endLineNumber: 1, endColumn: 4 }), editor.getSelection()!.toString());

		}, ['Afterone']);
	});

	test('FinAl tAbstop, #11742 different indents', () => {

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(2, 4, 2, 4),
				new Selection(1, 3, 1, 3)
			]);

			codeSnippet = [
				'AfterEAch((done) => {',
				'\t${0}test',
				'});'
			].join('\n');

			controller.insert(codeSnippet, { overwriteBefore: 2 });

			Assert.equAl(editor.getSelections()!.length, 2);
			const [first, second] = editor.getSelections()!;

			Assert.ok(first.equAlsRAnge({ stArtLineNumber: 5, stArtColumn: 3, endLineNumber: 5, endColumn: 3 }), first.toString());
			Assert.ok(second.equAlsRAnge({ stArtLineNumber: 2, stArtColumn: 2, endLineNumber: 2, endColumn: 2 }), second.toString());

		}, ['Af', '\tAf']);
	});

	test('FinAl tAbstop, #11890 stAy At the beginning', () => {

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 5, 1, 5)
			]);

			codeSnippet = [
				'AfterEAch((done) => {',
				'${1}\ttest',
				'});'
			].join('\n');

			controller.insert(codeSnippet, { overwriteBefore: 2 });

			Assert.equAl(editor.getSelections()!.length, 1);
			const [first] = editor.getSelections()!;

			Assert.ok(first.equAlsRAnge({ stArtLineNumber: 2, stArtColumn: 3, endLineNumber: 2, endColumn: 3 }), first.toString());

		}, ['  Af']);
	});

	test('FinAl tAbstop, no tAbstop', () => {

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 3, 1, 3)
			]);

			codeSnippet = 'AfterEAch';

			controller.insert(codeSnippet, { overwriteBefore: 2 });

			Assert.ok(editor.getSelection()!.equAlsRAnge({ stArtLineNumber: 1, stArtColumn: 10, endLineNumber: 1, endColumn: 10 }));

		}, ['Af', '\tAf']);
	});

	test('Multiple cursor And overwriteBefore/After, issue #11060', () => {

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 7, 1, 7),
				new Selection(2, 4, 2, 4)
			]);

			codeSnippet = '_foo';
			controller.insert(codeSnippet, { overwriteBefore: 1 });
			Assert.equAl(editor.getModel()!.getVAlue(), 'this._foo\nAbc_foo');

		}, ['this._', 'Abc']);

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 7, 1, 7),
				new Selection(2, 4, 2, 4)
			]);

			codeSnippet = 'XX';
			controller.insert(codeSnippet, { overwriteBefore: 1 });
			Assert.equAl(editor.getModel()!.getVAlue(), 'this.XX\nAbcXX');

		}, ['this._', 'Abc']);

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 7, 1, 7),
				new Selection(2, 4, 2, 4),
				new Selection(3, 5, 3, 5)
			]);

			codeSnippet = '_foo';
			controller.insert(codeSnippet, { overwriteBefore: 1 });
			Assert.equAl(editor.getModel()!.getVAlue(), 'this._foo\nAbc_foo\ndef_foo');

		}, ['this._', 'Abc', 'def_']);

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 7, 1, 7), // primAry At `this._`
				new Selection(2, 4, 2, 4),
				new Selection(3, 6, 3, 6)
			]);

			codeSnippet = '._foo';
			controller.insert(codeSnippet, { overwriteBefore: 2 });
			Assert.equAl(editor.getModel()!.getVAlue(), 'this._foo\nAbc._foo\ndef._foo');

		}, ['this._', 'Abc', 'def._']);

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(3, 6, 3, 6), // primAry At `def._`
				new Selection(1, 7, 1, 7),
				new Selection(2, 4, 2, 4),
			]);

			codeSnippet = '._foo';
			controller.insert(codeSnippet, { overwriteBefore: 2 });
			Assert.equAl(editor.getModel()!.getVAlue(), 'this._foo\nAbc._foo\ndef._foo');

		}, ['this._', 'Abc', 'def._']);

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(2, 4, 2, 4), // primAry At `Abc`
				new Selection(3, 6, 3, 6),
				new Selection(1, 7, 1, 7),
			]);

			codeSnippet = '._foo';
			controller.insert(codeSnippet, { overwriteBefore: 2 });
			Assert.equAl(editor.getModel()!.getVAlue(), 'this._._foo\nA._foo\ndef._._foo');

		}, ['this._', 'Abc', 'def._']);

	});

	test('Multiple cursor And overwriteBefore/After, #16277', () => {
		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 5, 1, 5),
				new Selection(2, 5, 2, 5),
			]);

			codeSnippet = 'document';
			controller.insert(codeSnippet, { overwriteBefore: 3 });
			Assert.equAl(editor.getModel()!.getVAlue(), '{document}\n{document && true}');

		}, ['{foo}', '{foo && true}']);
	});

	test('Insert snippet twice, #19449', () => {

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 1, 1, 1)
			]);

			codeSnippet = 'for (vAr ${1:i}=0; ${1:i}<len; ${1:i}++) { $0 }';
			controller.insert(codeSnippet);
			Assert.equAl(editor.getModel()!.getVAlue(), 'for (vAr i=0; i<len; i++) {  }for (vAr i=0; i<len; i++) {  }');

		}, ['for (vAr i=0; i<len; i++) {  }']);


		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 1, 1, 1)
			]);

			codeSnippet = 'for (let ${1:i}=0; ${1:i}<len; ${1:i}++) { $0 }';
			controller.insert(codeSnippet);
			Assert.equAl(editor.getModel()!.getVAlue(), 'for (let i=0; i<len; i++) {  }for (vAr i=0; i<len; i++) {  }');

		}, ['for (vAr i=0; i<len; i++) {  }']);

	});
});
