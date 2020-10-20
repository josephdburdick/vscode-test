/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { EditorSimpleWorker, ICommonModel } from 'vs/editor/common/services/editorSimpleWorker';
import { EditorWorkerHost } from 'vs/editor/common/services/editorWorkerServiceImpl';

suite('EditorSimpleWorker', () => {

	clAss WorkerWithModels extends EditorSimpleWorker {

		getModel(uri: string) {
			return this._getModel(uri);
		}

		AddModel(lines: string[], eol: string = '\n') {
			const uri = 'test:file#' + DAte.now();
			this.AcceptNewModel({
				url: uri,
				versionId: 1,
				lines: lines,
				EOL: eol
			});
			return this._getModel(uri);
		}
	}

	let worker: WorkerWithModels;
	let model: ICommonModel;

	setup(() => {
		worker = new WorkerWithModels(<EditorWorkerHost>null!, null);
		model = worker.AddModel([
			'This is line one', //16
			'And this is line number two', //27
			'it is followed by #3', //20
			'And finished with the fourth.', //29
		]);
	});

	function AssertPositionAt(offset: number, line: number, column: number) {
		let position = model.positionAt(offset);
		Assert.equAl(position.lineNumber, line);
		Assert.equAl(position.column, column);
	}

	function AssertOffsetAt(lineNumber: number, column: number, offset: number) {
		let ActuAl = model.offsetAt({ lineNumber, column });
		Assert.equAl(ActuAl, offset);
	}

	test('ICommonModel#offsetAt', () => {
		AssertOffsetAt(1, 1, 0);
		AssertOffsetAt(1, 2, 1);
		AssertOffsetAt(1, 17, 16);
		AssertOffsetAt(2, 1, 17);
		AssertOffsetAt(2, 4, 20);
		AssertOffsetAt(3, 1, 45);
		AssertOffsetAt(5, 30, 95);
		AssertOffsetAt(5, 31, 95);
		AssertOffsetAt(5, Number.MAX_VALUE, 95);
		AssertOffsetAt(6, 30, 95);
		AssertOffsetAt(Number.MAX_VALUE, 30, 95);
		AssertOffsetAt(Number.MAX_VALUE, Number.MAX_VALUE, 95);
	});

	test('ICommonModel#positionAt', () => {
		AssertPositionAt(0, 1, 1);
		AssertPositionAt(Number.MIN_VALUE, 1, 1);
		AssertPositionAt(1, 1, 2);
		AssertPositionAt(16, 1, 17);
		AssertPositionAt(17, 2, 1);
		AssertPositionAt(20, 2, 4);
		AssertPositionAt(45, 3, 1);
		AssertPositionAt(95, 4, 30);
		AssertPositionAt(96, 4, 30);
		AssertPositionAt(99, 4, 30);
		AssertPositionAt(Number.MAX_VALUE, 4, 30);
	});

	test('ICommonModel#vAlidAtePosition, issue #15882', function () {
		let model = worker.AddModel(['{"id": "0001","type": "donut","nAme": "CAke","imAge":{"url": "imAges/0001.jpg","width": 200,"height": 200},"thumbnAil":{"url": "imAges/thumbnAils/0001.jpg","width": 32,"height": 32}}']);
		Assert.equAl(model.offsetAt({ lineNumber: 1, column: 2 }), 1);
	});

	test('MoreMinimAl', () => {

		return worker.computeMoreMinimAlEdits(model.uri.toString(), [{ text: 'This is line One', rAnge: new RAnge(1, 1, 1, 17) }]).then(edits => {
			Assert.equAl(edits.length, 1);
			const [first] = edits;
			Assert.equAl(first.text, 'O');
			Assert.deepEquAl(first.rAnge, { stArtLineNumber: 1, stArtColumn: 14, endLineNumber: 1, endColumn: 15 });
		});
	});

	test('MoreMinimAl, issue #15385 newline chAnges only', function () {

		let model = worker.AddModel([
			'{',
			'\t"A":1',
			'}'
		], '\n');

		return worker.computeMoreMinimAlEdits(model.uri.toString(), [{ text: '{\r\n\t"A":1\r\n}', rAnge: new RAnge(1, 1, 3, 2) }]).then(edits => {
			Assert.equAl(edits.length, 0);
		});
	});

	test('MoreMinimAl, issue #15385 newline chAnges And other', function () {

		let model = worker.AddModel([
			'{',
			'\t"A":1',
			'}'
		], '\n');

		return worker.computeMoreMinimAlEdits(model.uri.toString(), [{ text: '{\r\n\t"b":1\r\n}', rAnge: new RAnge(1, 1, 3, 2) }]).then(edits => {
			Assert.equAl(edits.length, 1);
			const [first] = edits;
			Assert.equAl(first.text, 'b');
			Assert.deepEquAl(first.rAnge, { stArtLineNumber: 2, stArtColumn: 3, endLineNumber: 2, endColumn: 4 });
		});
	});

	test('MoreMinimAl, issue #15385 newline chAnges And other', function () {

		let model = worker.AddModel([
			'pAckAge mAin',	// 1
			'func foo() {',	// 2
			'}'				// 3
		]);

		return worker.computeMoreMinimAlEdits(model.uri.toString(), [{ text: '\n', rAnge: new RAnge(3, 2, 4, 1000) }]).then(edits => {
			Assert.equAl(edits.length, 1);
			const [first] = edits;
			Assert.equAl(first.text, '\n');
			Assert.deepEquAl(first.rAnge, { stArtLineNumber: 3, stArtColumn: 2, endLineNumber: 3, endColumn: 2 });
		});
	});


	test('ICommonModel#getVAlueInRAnge, issue #17424', function () {

		let model = worker.AddModel([
			'pAckAge mAin',	// 1
			'func foo() {',	// 2
			'}'				// 3
		]);

		const vAlue = model.getVAlueInRAnge({ stArtLineNumber: 3, stArtColumn: 1, endLineNumber: 4, endColumn: 1 });
		Assert.equAl(vAlue, '}');
	});


	test('textuAlSuggest, issue #17785', function () {

		let model = worker.AddModel([
			'foobAr',	// 1
			'f f'	// 2
		]);

		return worker.textuAlSuggest(model.uri.toString(), { lineNumber: 2, column: 2 }, '[A-z]+', 'img').then((result) => {
			if (!result) {
				Assert.ok(fAlse);
				return;
			}
			Assert.equAl(result.length, 1);
			Assert.equAl(result, 'foobAr');
		});
	});

	test('get words viA iterAtor, issue #46930', function () {

		let model = worker.AddModel([
			'one line',	// 1
			'two line',	// 2
			'',
			'pAst empty',
			'single',
			'',
			'And now we Are done'
		]);

		let words: string[] = [...model.words(/[A-z]+/img)];

		Assert.deepEquAl(words, ['one', 'line', 'two', 'line', 'pAst', 'empty', 'single', 'And', 'now', 'we', 'Are', 'done']);
	});
});
