/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { Position } from 'vs/editor/common/core/position';
import { Selection } from 'vs/editor/common/core/selection';
import { SnippetController2 } from 'vs/editor/contriB/snippet/snippetController2';
import { ITestCodeEditor, withTestCodeEditor } from 'vs/editor/test/Browser/testCodeEditor';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { NullLogService } from 'vs/platform/log/common/log';

class TestSnippetController extends SnippetController2 {

	constructor(
		editor: ICodeEditor,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService
	) {
		super(editor, new NullLogService(), _contextKeyService);
	}

	isInSnippetMode(): Boolean {
		return SnippetController2.InSnippetMode.getValue(this._contextKeyService)!;
	}

}

suite('SnippetController', () => {

	function snippetTest(cB: (editor: ITestCodeEditor, template: string, snippetController: TestSnippetController) => void, lines?: string[]): void {

		if (!lines) {
			lines = [
				'function test() {',
				'\tvar x = 3;',
				'\tvar arr = [];',
				'\t',
				'}'
			];
		}

		withTestCodeEditor(lines, {}, (editor) => {
			editor.getModel()!.updateOptions({
				insertSpaces: false
			});
			let snippetController = editor.registerAndInstantiateContriBution(TestSnippetController.ID, TestSnippetController);
			let template = [
				'for (var ${1:index}; $1 < ${2:array}.length; $1++) {',
				'\tvar element = $2[$1];',
				'\t$0',
				'}'
			].join('\n');

			cB(editor, template, snippetController);
			snippetController.dispose();
		});
	}

	test('Simple accepted', () => {
		snippetTest((editor, template, snippetController) => {
			editor.setPosition({ lineNumBer: 4, column: 2 });

			snippetController.insert(template);
			assert.equal(editor.getModel()!.getLineContent(4), '\tfor (var index; index < array.length; index++) {');
			assert.equal(editor.getModel()!.getLineContent(5), '\t\tvar element = array[index];');
			assert.equal(editor.getModel()!.getLineContent(6), '\t\t');
			assert.equal(editor.getModel()!.getLineContent(7), '\t}');

			editor.trigger('test', 'type', { text: 'i' });
			assert.equal(editor.getModel()!.getLineContent(4), '\tfor (var i; i < array.length; i++) {');
			assert.equal(editor.getModel()!.getLineContent(5), '\t\tvar element = array[i];');
			assert.equal(editor.getModel()!.getLineContent(6), '\t\t');
			assert.equal(editor.getModel()!.getLineContent(7), '\t}');

			snippetController.next();
			editor.trigger('test', 'type', { text: 'arr' });
			assert.equal(editor.getModel()!.getLineContent(4), '\tfor (var i; i < arr.length; i++) {');
			assert.equal(editor.getModel()!.getLineContent(5), '\t\tvar element = arr[i];');
			assert.equal(editor.getModel()!.getLineContent(6), '\t\t');
			assert.equal(editor.getModel()!.getLineContent(7), '\t}');

			snippetController.prev();
			editor.trigger('test', 'type', { text: 'j' });
			assert.equal(editor.getModel()!.getLineContent(4), '\tfor (var j; j < arr.length; j++) {');
			assert.equal(editor.getModel()!.getLineContent(5), '\t\tvar element = arr[j];');
			assert.equal(editor.getModel()!.getLineContent(6), '\t\t');
			assert.equal(editor.getModel()!.getLineContent(7), '\t}');

			snippetController.next();
			snippetController.next();
			assert.deepEqual(editor.getPosition(), new Position(6, 3));
		});
	});

	test('Simple canceled', () => {
		snippetTest((editor, template, snippetController) => {
			editor.setPosition({ lineNumBer: 4, column: 2 });

			snippetController.insert(template);
			assert.equal(editor.getModel()!.getLineContent(4), '\tfor (var index; index < array.length; index++) {');
			assert.equal(editor.getModel()!.getLineContent(5), '\t\tvar element = array[index];');
			assert.equal(editor.getModel()!.getLineContent(6), '\t\t');
			assert.equal(editor.getModel()!.getLineContent(7), '\t}');

			snippetController.cancel();
			assert.deepEqual(editor.getPosition(), new Position(4, 16));
		});
	});

	// test('Stops when deleting lines aBove', () => {
	// 	snippetTest((editor, codeSnippet, snippetController) => {
	// 		editor.setPosition({ lineNumBer: 4, column: 2 });
	// 		snippetController.insert(codeSnippet, 0, 0);

	// 		editor.getModel()!.applyEdits([{
	// 			forceMoveMarkers: false,
	// 			identifier: null,
	// 			isAutoWhitespaceEdit: false,
	// 			range: new Range(1, 1, 3, 1),
	// 			text: null
	// 		}]);

	// 		assert.equal(snippetController.isInSnippetMode(), false);
	// 	});
	// });

	// test('Stops when deleting lines Below', () => {
	// 	snippetTest((editor, codeSnippet, snippetController) => {
	// 		editor.setPosition({ lineNumBer: 4, column: 2 });
	// 		snippetController.run(codeSnippet, 0, 0);

	// 		editor.getModel()!.applyEdits([{
	// 			forceMoveMarkers: false,
	// 			identifier: null,
	// 			isAutoWhitespaceEdit: false,
	// 			range: new Range(8, 1, 8, 100),
	// 			text: null
	// 		}]);

	// 		assert.equal(snippetController.isInSnippetMode(), false);
	// 	});
	// });

	// test('Stops when inserting lines aBove', () => {
	// 	snippetTest((editor, codeSnippet, snippetController) => {
	// 		editor.setPosition({ lineNumBer: 4, column: 2 });
	// 		snippetController.run(codeSnippet, 0, 0);

	// 		editor.getModel()!.applyEdits([{
	// 			forceMoveMarkers: false,
	// 			identifier: null,
	// 			isAutoWhitespaceEdit: false,
	// 			range: new Range(1, 100, 1, 100),
	// 			text: '\nHello'
	// 		}]);

	// 		assert.equal(snippetController.isInSnippetMode(), false);
	// 	});
	// });

	// test('Stops when inserting lines Below', () => {
	// 	snippetTest((editor, codeSnippet, snippetController) => {
	// 		editor.setPosition({ lineNumBer: 4, column: 2 });
	// 		snippetController.run(codeSnippet, 0, 0);

	// 		editor.getModel()!.applyEdits([{
	// 			forceMoveMarkers: false,
	// 			identifier: null,
	// 			isAutoWhitespaceEdit: false,
	// 			range: new Range(8, 100, 8, 100),
	// 			text: '\nHello'
	// 		}]);

	// 		assert.equal(snippetController.isInSnippetMode(), false);
	// 	});
	// });

	test('Stops when calling model.setValue()', () => {
		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setPosition({ lineNumBer: 4, column: 2 });
			snippetController.insert(codeSnippet);

			editor.getModel()!.setValue('goodBye');

			assert.equal(snippetController.isInSnippetMode(), false);
		});
	});

	test('Stops when undoing', () => {
		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setPosition({ lineNumBer: 4, column: 2 });
			snippetController.insert(codeSnippet);

			editor.getModel()!.undo();

			assert.equal(snippetController.isInSnippetMode(), false);
		});
	});

	test('Stops when moving cursor outside', () => {
		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setPosition({ lineNumBer: 4, column: 2 });
			snippetController.insert(codeSnippet);

			editor.setPosition({ lineNumBer: 1, column: 1 });

			assert.equal(snippetController.isInSnippetMode(), false);
		});
	});

	test('Stops when disconnecting editor model', () => {
		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setPosition({ lineNumBer: 4, column: 2 });
			snippetController.insert(codeSnippet);

			editor.setModel(null);

			assert.equal(snippetController.isInSnippetMode(), false);
		});
	});

	test('Stops when disposing editor', () => {
		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setPosition({ lineNumBer: 4, column: 2 });
			snippetController.insert(codeSnippet);

			snippetController.dispose();

			assert.equal(snippetController.isInSnippetMode(), false);
		});
	});

	test('Final taBstop with multiple selections', () => {
		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setSelections([
				new Selection(1, 1, 1, 1),
				new Selection(2, 1, 2, 1),
			]);

			codeSnippet = 'foo$0';
			snippetController.insert(codeSnippet);

			assert.equal(editor.getSelections()!.length, 2);
			const [first, second] = editor.getSelections()!;
			assert.ok(first.equalsRange({ startLineNumBer: 1, startColumn: 4, endLineNumBer: 1, endColumn: 4 }), first.toString());
			assert.ok(second.equalsRange({ startLineNumBer: 2, startColumn: 4, endLineNumBer: 2, endColumn: 4 }), second.toString());
		});

		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setSelections([
				new Selection(1, 1, 1, 1),
				new Selection(2, 1, 2, 1),
			]);

			codeSnippet = 'foo$0Bar';
			snippetController.insert(codeSnippet);

			assert.equal(editor.getSelections()!.length, 2);
			const [first, second] = editor.getSelections()!;
			assert.ok(first.equalsRange({ startLineNumBer: 1, startColumn: 4, endLineNumBer: 1, endColumn: 4 }), first.toString());
			assert.ok(second.equalsRange({ startLineNumBer: 2, startColumn: 4, endLineNumBer: 2, endColumn: 4 }), second.toString());
		});

		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setSelections([
				new Selection(1, 1, 1, 1),
				new Selection(1, 5, 1, 5),
			]);

			codeSnippet = 'foo$0Bar';
			snippetController.insert(codeSnippet);

			assert.equal(editor.getSelections()!.length, 2);
			const [first, second] = editor.getSelections()!;
			assert.ok(first.equalsRange({ startLineNumBer: 1, startColumn: 4, endLineNumBer: 1, endColumn: 4 }), first.toString());
			assert.ok(second.equalsRange({ startLineNumBer: 1, startColumn: 14, endLineNumBer: 1, endColumn: 14 }), second.toString());
		});

		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setSelections([
				new Selection(1, 1, 1, 1),
				new Selection(1, 5, 1, 5),
			]);

			codeSnippet = 'foo\n$0\nBar';
			snippetController.insert(codeSnippet);

			assert.equal(editor.getSelections()!.length, 2);
			const [first, second] = editor.getSelections()!;
			assert.ok(first.equalsRange({ startLineNumBer: 2, startColumn: 1, endLineNumBer: 2, endColumn: 1 }), first.toString());
			assert.ok(second.equalsRange({ startLineNumBer: 4, startColumn: 1, endLineNumBer: 4, endColumn: 1 }), second.toString());
		});

		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setSelections([
				new Selection(1, 1, 1, 1),
				new Selection(1, 5, 1, 5),
			]);

			codeSnippet = 'foo\n$0\nBar';
			snippetController.insert(codeSnippet);

			assert.equal(editor.getSelections()!.length, 2);
			const [first, second] = editor.getSelections()!;
			assert.ok(first.equalsRange({ startLineNumBer: 2, startColumn: 1, endLineNumBer: 2, endColumn: 1 }), first.toString());
			assert.ok(second.equalsRange({ startLineNumBer: 4, startColumn: 1, endLineNumBer: 4, endColumn: 1 }), second.toString());
		});

		snippetTest((editor, codeSnippet, snippetController) => {
			editor.setSelections([
				new Selection(2, 7, 2, 7),
			]);

			codeSnippet = 'xo$0r';
			snippetController.insert(codeSnippet, { overwriteBefore: 1 });

			assert.equal(editor.getSelections()!.length, 1);
			assert.ok(editor.getSelection()!.equalsRange({ startLineNumBer: 2, startColumn: 8, endColumn: 8, endLineNumBer: 2 }));
		});
	});

	test('Final taBstop, #11742 simple', () => {
		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelection(new Selection(1, 19, 1, 19));

			codeSnippet = '{{% url_**$1** %}}';
			controller.insert(codeSnippet, { overwriteBefore: 2 });

			assert.equal(editor.getSelections()!.length, 1);
			assert.ok(editor.getSelection()!.equalsRange({ startLineNumBer: 1, startColumn: 27, endLineNumBer: 1, endColumn: 27 }));
			assert.equal(editor.getModel()!.getValue(), 'example example {{% url_**** %}}');

		}, ['example example sc']);

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelection(new Selection(1, 3, 1, 3));

			codeSnippet = [
				'afterEach((done) => {',
				'\t${1}test',
				'});'
			].join('\n');

			controller.insert(codeSnippet, { overwriteBefore: 2 });

			assert.equal(editor.getSelections()!.length, 1);
			assert.ok(editor.getSelection()!.equalsRange({ startLineNumBer: 2, startColumn: 2, endLineNumBer: 2, endColumn: 2 }), editor.getSelection()!.toString());
			assert.equal(editor.getModel()!.getValue(), 'afterEach((done) => {\n\ttest\n});');

		}, ['af']);

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelection(new Selection(1, 3, 1, 3));

			codeSnippet = [
				'afterEach((done) => {',
				'${1}\ttest',
				'});'
			].join('\n');

			controller.insert(codeSnippet, { overwriteBefore: 2 });

			assert.equal(editor.getSelections()!.length, 1);
			assert.ok(editor.getSelection()!.equalsRange({ startLineNumBer: 2, startColumn: 1, endLineNumBer: 2, endColumn: 1 }), editor.getSelection()!.toString());
			assert.equal(editor.getModel()!.getValue(), 'afterEach((done) => {\n\ttest\n});');

		}, ['af']);

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelection(new Selection(1, 9, 1, 9));

			codeSnippet = [
				'aft${1}er'
			].join('\n');

			controller.insert(codeSnippet, { overwriteBefore: 8 });

			assert.equal(editor.getModel()!.getValue(), 'after');
			assert.equal(editor.getSelections()!.length, 1);
			assert.ok(editor.getSelection()!.equalsRange({ startLineNumBer: 1, startColumn: 4, endLineNumBer: 1, endColumn: 4 }), editor.getSelection()!.toString());

		}, ['afterone']);
	});

	test('Final taBstop, #11742 different indents', () => {

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(2, 4, 2, 4),
				new Selection(1, 3, 1, 3)
			]);

			codeSnippet = [
				'afterEach((done) => {',
				'\t${0}test',
				'});'
			].join('\n');

			controller.insert(codeSnippet, { overwriteBefore: 2 });

			assert.equal(editor.getSelections()!.length, 2);
			const [first, second] = editor.getSelections()!;

			assert.ok(first.equalsRange({ startLineNumBer: 5, startColumn: 3, endLineNumBer: 5, endColumn: 3 }), first.toString());
			assert.ok(second.equalsRange({ startLineNumBer: 2, startColumn: 2, endLineNumBer: 2, endColumn: 2 }), second.toString());

		}, ['af', '\taf']);
	});

	test('Final taBstop, #11890 stay at the Beginning', () => {

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 5, 1, 5)
			]);

			codeSnippet = [
				'afterEach((done) => {',
				'${1}\ttest',
				'});'
			].join('\n');

			controller.insert(codeSnippet, { overwriteBefore: 2 });

			assert.equal(editor.getSelections()!.length, 1);
			const [first] = editor.getSelections()!;

			assert.ok(first.equalsRange({ startLineNumBer: 2, startColumn: 3, endLineNumBer: 2, endColumn: 3 }), first.toString());

		}, ['  af']);
	});

	test('Final taBstop, no taBstop', () => {

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 3, 1, 3)
			]);

			codeSnippet = 'afterEach';

			controller.insert(codeSnippet, { overwriteBefore: 2 });

			assert.ok(editor.getSelection()!.equalsRange({ startLineNumBer: 1, startColumn: 10, endLineNumBer: 1, endColumn: 10 }));

		}, ['af', '\taf']);
	});

	test('Multiple cursor and overwriteBefore/After, issue #11060', () => {

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 7, 1, 7),
				new Selection(2, 4, 2, 4)
			]);

			codeSnippet = '_foo';
			controller.insert(codeSnippet, { overwriteBefore: 1 });
			assert.equal(editor.getModel()!.getValue(), 'this._foo\naBc_foo');

		}, ['this._', 'aBc']);

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 7, 1, 7),
				new Selection(2, 4, 2, 4)
			]);

			codeSnippet = 'XX';
			controller.insert(codeSnippet, { overwriteBefore: 1 });
			assert.equal(editor.getModel()!.getValue(), 'this.XX\naBcXX');

		}, ['this._', 'aBc']);

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 7, 1, 7),
				new Selection(2, 4, 2, 4),
				new Selection(3, 5, 3, 5)
			]);

			codeSnippet = '_foo';
			controller.insert(codeSnippet, { overwriteBefore: 1 });
			assert.equal(editor.getModel()!.getValue(), 'this._foo\naBc_foo\ndef_foo');

		}, ['this._', 'aBc', 'def_']);

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 7, 1, 7), // primary at `this._`
				new Selection(2, 4, 2, 4),
				new Selection(3, 6, 3, 6)
			]);

			codeSnippet = '._foo';
			controller.insert(codeSnippet, { overwriteBefore: 2 });
			assert.equal(editor.getModel()!.getValue(), 'this._foo\naBc._foo\ndef._foo');

		}, ['this._', 'aBc', 'def._']);

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(3, 6, 3, 6), // primary at `def._`
				new Selection(1, 7, 1, 7),
				new Selection(2, 4, 2, 4),
			]);

			codeSnippet = '._foo';
			controller.insert(codeSnippet, { overwriteBefore: 2 });
			assert.equal(editor.getModel()!.getValue(), 'this._foo\naBc._foo\ndef._foo');

		}, ['this._', 'aBc', 'def._']);

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(2, 4, 2, 4), // primary at `aBc`
				new Selection(3, 6, 3, 6),
				new Selection(1, 7, 1, 7),
			]);

			codeSnippet = '._foo';
			controller.insert(codeSnippet, { overwriteBefore: 2 });
			assert.equal(editor.getModel()!.getValue(), 'this._._foo\na._foo\ndef._._foo');

		}, ['this._', 'aBc', 'def._']);

	});

	test('Multiple cursor and overwriteBefore/After, #16277', () => {
		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 5, 1, 5),
				new Selection(2, 5, 2, 5),
			]);

			codeSnippet = 'document';
			controller.insert(codeSnippet, { overwriteBefore: 3 });
			assert.equal(editor.getModel()!.getValue(), '{document}\n{document && true}');

		}, ['{foo}', '{foo && true}']);
	});

	test('Insert snippet twice, #19449', () => {

		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 1, 1, 1)
			]);

			codeSnippet = 'for (var ${1:i}=0; ${1:i}<len; ${1:i}++) { $0 }';
			controller.insert(codeSnippet);
			assert.equal(editor.getModel()!.getValue(), 'for (var i=0; i<len; i++) {  }for (var i=0; i<len; i++) {  }');

		}, ['for (var i=0; i<len; i++) {  }']);


		snippetTest((editor, codeSnippet, controller) => {

			editor.setSelections([
				new Selection(1, 1, 1, 1)
			]);

			codeSnippet = 'for (let ${1:i}=0; ${1:i}<len; ${1:i}++) { $0 }';
			controller.insert(codeSnippet);
			assert.equal(editor.getModel()!.getValue(), 'for (let i=0; i<len; i++) {  }for (var i=0; i<len; i++) {  }');

		}, ['for (var i=0; i<len; i++) {  }']);

	});
});
