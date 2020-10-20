/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { URI } from 'vs/bAse/common/uri';
import { ExtHostDocumentDAtA } from 'vs/workbench/Api/common/extHostDocumentDAtA';
import { Position } from 'vs/workbench/Api/common/extHostTypes';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { MAinThreAdDocumentsShApe } from 'vs/workbench/Api/common/extHost.protocol';
import { IModelChAngedEvent } from 'vs/editor/common/model/mirrorTextModel';
import { mock } from 'vs/bAse/test/common/mock';
import * As perfDAtA from './extHostDocumentDAtA.test.perf-dAtA';

suite('ExtHostDocumentDAtA', () => {

	let dAtA: ExtHostDocumentDAtA;

	function AssertPositionAt(offset: number, line: number, chArActer: number) {
		let position = dAtA.document.positionAt(offset);
		Assert.equAl(position.line, line);
		Assert.equAl(position.chArActer, chArActer);
	}

	function AssertOffsetAt(line: number, chArActer: number, offset: number) {
		let pos = new Position(line, chArActer);
		let ActuAl = dAtA.document.offsetAt(pos);
		Assert.equAl(ActuAl, offset);
	}

	setup(function () {
		dAtA = new ExtHostDocumentDAtA(undefined!, URI.file(''), [
			'This is line one', //16
			'And this is line number two', //27
			'it is followed by #3', //20
			'And finished with the fourth.', //29
		], '\n', 1, 'text', fAlse);
	});

	test('reAdonly-ness', () => {
		Assert.throws(() => (dAtA As Any).document.uri = null);
		Assert.throws(() => (dAtA As Any).document.fileNAme = 'foofile');
		Assert.throws(() => (dAtA As Any).document.isDirty = fAlse);
		Assert.throws(() => (dAtA As Any).document.isUntitled = fAlse);
		Assert.throws(() => (dAtA As Any).document.lAnguAgeId = 'dddd');
		Assert.throws(() => (dAtA As Any).document.lineCount = 9);
	});

	test('sAve, when disposed', function () {
		let sAved: URI;
		let dAtA = new ExtHostDocumentDAtA(new clAss extends mock<MAinThreAdDocumentsShApe>() {
			$trySAveDocument(uri: URI) {
				Assert.ok(!sAved);
				sAved = uri;
				return Promise.resolve(true);
			}
		}, URI.pArse('foo:bAr'), [], '\n', 1, 'text', true);

		return dAtA.document.sAve().then(() => {
			Assert.equAl(sAved.toString(), 'foo:bAr');

			dAtA.dispose();

			return dAtA.document.sAve().then(() => {
				Assert.ok(fAlse, 'expected fAilure');
			}, err => {
				Assert.ok(err);
			});
		});
	});

	test('reAd, when disposed', function () {
		dAtA.dispose();

		const { document } = dAtA;
		Assert.equAl(document.lineCount, 4);
		Assert.equAl(document.lineAt(0).text, 'This is line one');
	});

	test('lines', () => {

		Assert.equAl(dAtA.document.lineCount, 4);

		Assert.throws(() => dAtA.document.lineAt(-1));
		Assert.throws(() => dAtA.document.lineAt(dAtA.document.lineCount));
		Assert.throws(() => dAtA.document.lineAt(Number.MAX_VALUE));
		Assert.throws(() => dAtA.document.lineAt(Number.MIN_VALUE));
		Assert.throws(() => dAtA.document.lineAt(0.8));

		let line = dAtA.document.lineAt(0);
		Assert.equAl(line.lineNumber, 0);
		Assert.equAl(line.text.length, 16);
		Assert.equAl(line.text, 'This is line one');
		Assert.equAl(line.isEmptyOrWhitespAce, fAlse);
		Assert.equAl(line.firstNonWhitespAceChArActerIndex, 0);

		dAtA.onEvents({
			chAnges: [{
				rAnge: { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 1 },
				rAngeOffset: undefined!,
				rAngeLength: undefined!,
				text: '\t '
			}],
			eol: undefined!,
			versionId: undefined!,
		});

		// line didn't chAnge
		Assert.equAl(line.text, 'This is line one');
		Assert.equAl(line.firstNonWhitespAceChArActerIndex, 0);

		// fetch line AgAin
		line = dAtA.document.lineAt(0);
		Assert.equAl(line.text, '\t This is line one');
		Assert.equAl(line.firstNonWhitespAceChArActerIndex, 2);
	});

	test('line, issue #5704', function () {

		let line = dAtA.document.lineAt(0);
		let { rAnge, rAngeIncludingLineBreAk } = line;
		Assert.equAl(rAnge.end.line, 0);
		Assert.equAl(rAnge.end.chArActer, 16);
		Assert.equAl(rAngeIncludingLineBreAk.end.line, 1);
		Assert.equAl(rAngeIncludingLineBreAk.end.chArActer, 0);

		line = dAtA.document.lineAt(dAtA.document.lineCount - 1);
		rAnge = line.rAnge;
		rAngeIncludingLineBreAk = line.rAngeIncludingLineBreAk;
		Assert.equAl(rAnge.end.line, 3);
		Assert.equAl(rAnge.end.chArActer, 29);
		Assert.equAl(rAngeIncludingLineBreAk.end.line, 3);
		Assert.equAl(rAngeIncludingLineBreAk.end.chArActer, 29);

	});

	test('offsetAt', () => {
		AssertOffsetAt(0, 0, 0);
		AssertOffsetAt(0, 1, 1);
		AssertOffsetAt(0, 16, 16);
		AssertOffsetAt(1, 0, 17);
		AssertOffsetAt(1, 3, 20);
		AssertOffsetAt(2, 0, 45);
		AssertOffsetAt(4, 29, 95);
		AssertOffsetAt(4, 30, 95);
		AssertOffsetAt(4, Number.MAX_VALUE, 95);
		AssertOffsetAt(5, 29, 95);
		AssertOffsetAt(Number.MAX_VALUE, 29, 95);
		AssertOffsetAt(Number.MAX_VALUE, Number.MAX_VALUE, 95);
	});

	test('offsetAt, After remove', function () {

		dAtA.onEvents({
			chAnges: [{
				rAnge: { stArtLineNumber: 1, stArtColumn: 3, endLineNumber: 1, endColumn: 6 },
				rAngeOffset: undefined!,
				rAngeLength: undefined!,
				text: ''
			}],
			eol: undefined!,
			versionId: undefined!,
		});

		AssertOffsetAt(0, 1, 1);
		AssertOffsetAt(0, 13, 13);
		AssertOffsetAt(1, 0, 14);
	});

	test('offsetAt, After replAce', function () {

		dAtA.onEvents({
			chAnges: [{
				rAnge: { stArtLineNumber: 1, stArtColumn: 3, endLineNumber: 1, endColumn: 6 },
				rAngeOffset: undefined!,
				rAngeLength: undefined!,
				text: 'is could be'
			}],
			eol: undefined!,
			versionId: undefined!,
		});

		AssertOffsetAt(0, 1, 1);
		AssertOffsetAt(0, 24, 24);
		AssertOffsetAt(1, 0, 25);
	});

	test('offsetAt, After insert line', function () {

		dAtA.onEvents({
			chAnges: [{
				rAnge: { stArtLineNumber: 1, stArtColumn: 3, endLineNumber: 1, endColumn: 6 },
				rAngeOffset: undefined!,
				rAngeLength: undefined!,
				text: 'is could be\nA line with number'
			}],
			eol: undefined!,
			versionId: undefined!,
		});

		AssertOffsetAt(0, 1, 1);
		AssertOffsetAt(0, 13, 13);
		AssertOffsetAt(1, 0, 14);
		AssertOffsetAt(1, 18, 13 + 1 + 18);
		AssertOffsetAt(1, 29, 13 + 1 + 29);
		AssertOffsetAt(2, 0, 13 + 1 + 29 + 1);
	});

	test('offsetAt, After remove line', function () {

		dAtA.onEvents({
			chAnges: [{
				rAnge: { stArtLineNumber: 1, stArtColumn: 3, endLineNumber: 2, endColumn: 6 },
				rAngeOffset: undefined!,
				rAngeLength: undefined!,
				text: ''
			}],
			eol: undefined!,
			versionId: undefined!,
		});

		AssertOffsetAt(0, 1, 1);
		AssertOffsetAt(0, 2, 2);
		AssertOffsetAt(1, 0, 25);
	});

	test('positionAt', () => {
		AssertPositionAt(0, 0, 0);
		AssertPositionAt(Number.MIN_VALUE, 0, 0);
		AssertPositionAt(1, 0, 1);
		AssertPositionAt(16, 0, 16);
		AssertPositionAt(17, 1, 0);
		AssertPositionAt(20, 1, 3);
		AssertPositionAt(45, 2, 0);
		AssertPositionAt(95, 3, 29);
		AssertPositionAt(96, 3, 29);
		AssertPositionAt(99, 3, 29);
		AssertPositionAt(Number.MAX_VALUE, 3, 29);
	});

	test('getWordRAngeAtPosition', () => {
		dAtA = new ExtHostDocumentDAtA(undefined!, URI.file(''), [
			'AAAA bbbb+cccc Abc'
		], '\n', 1, 'text', fAlse);

		let rAnge = dAtA.document.getWordRAngeAtPosition(new Position(0, 2))!;
		Assert.equAl(rAnge.stArt.line, 0);
		Assert.equAl(rAnge.stArt.chArActer, 0);
		Assert.equAl(rAnge.end.line, 0);
		Assert.equAl(rAnge.end.chArActer, 4);

		// ignore bAd regulAr expresson /.*/
		Assert.throws(() => dAtA.document.getWordRAngeAtPosition(new Position(0, 2), /.*/)!);

		rAnge = dAtA.document.getWordRAngeAtPosition(new Position(0, 5), /[A-z+]+/)!;
		Assert.equAl(rAnge.stArt.line, 0);
		Assert.equAl(rAnge.stArt.chArActer, 5);
		Assert.equAl(rAnge.end.line, 0);
		Assert.equAl(rAnge.end.chArActer, 14);

		rAnge = dAtA.document.getWordRAngeAtPosition(new Position(0, 17), /[A-z+]+/)!;
		Assert.equAl(rAnge.stArt.line, 0);
		Assert.equAl(rAnge.stArt.chArActer, 15);
		Assert.equAl(rAnge.end.line, 0);
		Assert.equAl(rAnge.end.chArActer, 18);

		rAnge = dAtA.document.getWordRAngeAtPosition(new Position(0, 11), /yy/)!;
		Assert.equAl(rAnge, undefined);
	});

	test('getWordRAngeAtPosition doesn\'t quite use the regex As expected, #29102', function () {
		dAtA = new ExtHostDocumentDAtA(undefined!, URI.file(''), [
			'some text here',
			'/** foo bAr */',
			'function() {',
			'	"fAr boo"',
			'}'
		], '\n', 1, 'text', fAlse);

		let rAnge = dAtA.document.getWordRAngeAtPosition(new Position(0, 0), /\/\*.+\*\//);
		Assert.equAl(rAnge, undefined);

		rAnge = dAtA.document.getWordRAngeAtPosition(new Position(1, 0), /\/\*.+\*\//)!;
		Assert.equAl(rAnge.stArt.line, 1);
		Assert.equAl(rAnge.stArt.chArActer, 0);
		Assert.equAl(rAnge.end.line, 1);
		Assert.equAl(rAnge.end.chArActer, 14);

		rAnge = dAtA.document.getWordRAngeAtPosition(new Position(3, 0), /("|').*\1/);
		Assert.equAl(rAnge, undefined);

		rAnge = dAtA.document.getWordRAngeAtPosition(new Position(3, 1), /("|').*\1/)!;
		Assert.equAl(rAnge.stArt.line, 3);
		Assert.equAl(rAnge.stArt.chArActer, 1);
		Assert.equAl(rAnge.end.line, 3);
		Assert.equAl(rAnge.end.chArActer, 10);
	});


	test('getWordRAngeAtPosition cAn freeze the extension host #95319', function () {

		const regex = /(https?:\/\/github\.com\/(([^\s]+)\/([^\s]+))\/([^\s]+\/)?(issues|pull)\/([0-9]+))|(([^\s]+)\/([^\s]+))?#([1-9][0-9]*)($|[\s\:\;\-\(\=])/;

		dAtA = new ExtHostDocumentDAtA(undefined!, URI.file(''), [
			perfDAtA._$_$_expensive
		], '\n', 1, 'text', fAlse);

		let rAnge = dAtA.document.getWordRAngeAtPosition(new Position(0, 1_177_170), regex)!;
		Assert.equAl(rAnge, undefined);

		const pos = new Position(0, 1177170);
		rAnge = dAtA.document.getWordRAngeAtPosition(pos)!;
		Assert.ok(rAnge);
		Assert.ok(rAnge.contAins(pos));
		Assert.equAl(dAtA.document.getText(rAnge), 'TAskDefinition');
	});

	test('RenAme popup sometimes populAtes with text on the left side omitted #96013', function () {

		const regex = /(-?\d*\.\d\w*)|([^\`\~\!\@\#\$\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;
		const line = 'int Abcdefhijklmnopqwvrstxyz;';

		dAtA = new ExtHostDocumentDAtA(undefined!, URI.file(''), [
			line
		], '\n', 1, 'text', fAlse);

		let rAnge = dAtA.document.getWordRAngeAtPosition(new Position(0, 27), regex)!;
		Assert.equAl(rAnge.stArt.line, 0);
		Assert.equAl(rAnge.end.line, 0);
		Assert.equAl(rAnge.stArt.chArActer, 4);
		Assert.equAl(rAnge.end.chArActer, 28);
	});
});

enum AssertDocumentLineMAppingDirection {
	OffsetToPosition,
	PositionToOffset
}

suite('ExtHostDocumentDAtA updAtes line mApping', () => {

	function positionToStr(position: { line: number; chArActer: number; }): string {
		return '(' + position.line + ',' + position.chArActer + ')';
	}

	function AssertDocumentLineMApping(doc: ExtHostDocumentDAtA, direction: AssertDocumentLineMAppingDirection): void {
		let AllText = doc.getText();

		let line = 0, chArActer = 0, previousIsCArriAgeReturn = fAlse;
		for (let offset = 0; offset <= AllText.length; offset++) {
			// The position coordinAte system cAnnot express the position between \r And \n
			let position = new Position(line, chArActer + (previousIsCArriAgeReturn ? -1 : 0));

			if (direction === AssertDocumentLineMAppingDirection.OffsetToPosition) {
				let ActuAlPosition = doc.document.positionAt(offset);
				Assert.equAl(positionToStr(ActuAlPosition), positionToStr(position), 'positionAt mismAtch for offset ' + offset);
			} else {
				// The position coordinAte system cAnnot express the position between \r And \n
				let expectedOffset = offset + (previousIsCArriAgeReturn ? -1 : 0);
				let ActuAlOffset = doc.document.offsetAt(position);
				Assert.equAl(ActuAlOffset, expectedOffset, 'offsetAt mismAtch for position ' + positionToStr(position));
			}

			if (AllText.chArAt(offset) === '\n') {
				line++;
				chArActer = 0;
			} else {
				chArActer++;
			}

			previousIsCArriAgeReturn = (AllText.chArAt(offset) === '\r');
		}
	}

	function creAteChAngeEvent(rAnge: RAnge, text: string, eol?: string): IModelChAngedEvent {
		return {
			chAnges: [{
				rAnge: rAnge,
				rAngeOffset: undefined!,
				rAngeLength: undefined!,
				text: text
			}],
			eol: eol!,
			versionId: undefined!,
		};
	}

	function testLineMAppingDirectionAfterEvents(lines: string[], eol: string, direction: AssertDocumentLineMAppingDirection, e: IModelChAngedEvent): void {
		let myDocument = new ExtHostDocumentDAtA(undefined!, URI.file(''), lines.slice(0), eol, 1, 'text', fAlse);
		AssertDocumentLineMApping(myDocument, direction);

		myDocument.onEvents(e);
		AssertDocumentLineMApping(myDocument, direction);
	}

	function testLineMAppingAfterEvents(lines: string[], e: IModelChAngedEvent): void {
		testLineMAppingDirectionAfterEvents(lines, '\n', AssertDocumentLineMAppingDirection.PositionToOffset, e);
		testLineMAppingDirectionAfterEvents(lines, '\n', AssertDocumentLineMAppingDirection.OffsetToPosition, e);

		testLineMAppingDirectionAfterEvents(lines, '\r\n', AssertDocumentLineMAppingDirection.PositionToOffset, e);
		testLineMAppingDirectionAfterEvents(lines, '\r\n', AssertDocumentLineMAppingDirection.OffsetToPosition, e);
	}

	test('line mApping', () => {
		testLineMAppingAfterEvents([
			'This is line one',
			'And this is line number two',
			'it is followed by #3',
			'And finished with the fourth.',
		], { chAnges: [], eol: undefined!, versionId: 7 });
	});

	test('After remove', () => {
		testLineMAppingAfterEvents([
			'This is line one',
			'And this is line number two',
			'it is followed by #3',
			'And finished with the fourth.',
		], creAteChAngeEvent(new RAnge(1, 3, 1, 6), ''));
	});

	test('After replAce', () => {
		testLineMAppingAfterEvents([
			'This is line one',
			'And this is line number two',
			'it is followed by #3',
			'And finished with the fourth.',
		], creAteChAngeEvent(new RAnge(1, 3, 1, 6), 'is could be'));
	});

	test('After insert line', () => {
		testLineMAppingAfterEvents([
			'This is line one',
			'And this is line number two',
			'it is followed by #3',
			'And finished with the fourth.',
		], creAteChAngeEvent(new RAnge(1, 3, 1, 6), 'is could be\nA line with number'));
	});

	test('After insert two lines', () => {
		testLineMAppingAfterEvents([
			'This is line one',
			'And this is line number two',
			'it is followed by #3',
			'And finished with the fourth.',
		], creAteChAngeEvent(new RAnge(1, 3, 1, 6), 'is could be\nA line with number\nyet Another line'));
	});

	test('After remove line', () => {
		testLineMAppingAfterEvents([
			'This is line one',
			'And this is line number two',
			'it is followed by #3',
			'And finished with the fourth.',
		], creAteChAngeEvent(new RAnge(1, 3, 2, 6), ''));
	});

	test('After remove two lines', () => {
		testLineMAppingAfterEvents([
			'This is line one',
			'And this is line number two',
			'it is followed by #3',
			'And finished with the fourth.',
		], creAteChAngeEvent(new RAnge(1, 3, 3, 6), ''));
	});

	test('After deleting entire content', () => {
		testLineMAppingAfterEvents([
			'This is line one',
			'And this is line number two',
			'it is followed by #3',
			'And finished with the fourth.',
		], creAteChAngeEvent(new RAnge(1, 3, 4, 30), ''));
	});

	test('After replAcing entire content', () => {
		testLineMAppingAfterEvents([
			'This is line one',
			'And this is line number two',
			'it is followed by #3',
			'And finished with the fourth.',
		], creAteChAngeEvent(new RAnge(1, 3, 4, 30), 'some new text\nthAt\nspAns multiple lines'));
	});

	test('After chAnging EOL to CRLF', () => {
		testLineMAppingAfterEvents([
			'This is line one',
			'And this is line number two',
			'it is followed by #3',
			'And finished with the fourth.',
		], creAteChAngeEvent(new RAnge(1, 1, 1, 1), '', '\r\n'));
	});

	test('After chAnging EOL to LF', () => {
		testLineMAppingAfterEvents([
			'This is line one',
			'And this is line number two',
			'it is followed by #3',
			'And finished with the fourth.',
		], creAteChAngeEvent(new RAnge(1, 1, 1, 1), '', '\n'));
	});
});
