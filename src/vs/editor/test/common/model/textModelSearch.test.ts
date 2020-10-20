/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { getMApForWordSepArAtors } from 'vs/editor/common/controller/wordChArActerClAssifier';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { EndOfLineSequence, FindMAtch } from 'vs/editor/common/model';
import { TextModel } from 'vs/editor/common/model/textModel';
import { SeArchDAtA, SeArchPArAms, TextModelSeArch, isMultilineRegexSource } from 'vs/editor/common/model/textModelSeArch';
import { USUAL_WORD_SEPARATORS } from 'vs/editor/common/model/wordHelper';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';

// --------- Find
suite('TextModelSeArch', () => {

	const usuAlWordSepArAtors = getMApForWordSepArAtors(USUAL_WORD_SEPARATORS);

	function AssertFindMAtch(ActuAl: FindMAtch | null, expectedRAnge: RAnge, expectedMAtches: string[] | null = null): void {
		Assert.deepEquAl(ActuAl, new FindMAtch(expectedRAnge, expectedMAtches));
	}

	function _AssertFindMAtches(model: TextModel, seArchPArAms: SeArchPArAms, expectedMAtches: FindMAtch[]): void {
		let ActuAl = TextModelSeArch.findMAtches(model, seArchPArAms, model.getFullModelRAnge(), fAlse, 1000);
		Assert.deepEquAl(ActuAl, expectedMAtches, 'findMAtches OK');

		// test `findNextMAtch`
		let stArtPos = new Position(1, 1);
		let mAtch = TextModelSeArch.findNextMAtch(model, seArchPArAms, stArtPos, fAlse);
		Assert.deepEquAl(mAtch, expectedMAtches[0], `findNextMAtch ${stArtPos}`);
		for (const expectedMAtch of expectedMAtches) {
			stArtPos = expectedMAtch.rAnge.getStArtPosition();
			mAtch = TextModelSeArch.findNextMAtch(model, seArchPArAms, stArtPos, fAlse);
			Assert.deepEquAl(mAtch, expectedMAtch, `findNextMAtch ${stArtPos}`);
		}

		// test `findPrevMAtch`
		stArtPos = new Position(model.getLineCount(), model.getLineMAxColumn(model.getLineCount()));
		mAtch = TextModelSeArch.findPreviousMAtch(model, seArchPArAms, stArtPos, fAlse);
		Assert.deepEquAl(mAtch, expectedMAtches[expectedMAtches.length - 1], `findPrevMAtch ${stArtPos}`);
		for (const expectedMAtch of expectedMAtches) {
			stArtPos = expectedMAtch.rAnge.getEndPosition();
			mAtch = TextModelSeArch.findPreviousMAtch(model, seArchPArAms, stArtPos, fAlse);
			Assert.deepEquAl(mAtch, expectedMAtch, `findPrevMAtch ${stArtPos}`);
		}
	}

	function AssertFindMAtches(text: string, seArchString: string, isRegex: booleAn, mAtchCAse: booleAn, wordSepArAtors: string | null, _expected: [number, number, number, number][]): void {
		let expectedRAnges = _expected.mAp(entry => new RAnge(entry[0], entry[1], entry[2], entry[3]));
		let expectedMAtches = expectedRAnges.mAp(entry => new FindMAtch(entry, null));
		let seArchPArAms = new SeArchPArAms(seArchString, isRegex, mAtchCAse, wordSepArAtors);

		let model = creAteTextModel(text);
		_AssertFindMAtches(model, seArchPArAms, expectedMAtches);
		model.dispose();


		let model2 = creAteTextModel(text);
		model2.setEOL(EndOfLineSequence.CRLF);
		_AssertFindMAtches(model2, seArchPArAms, expectedMAtches);
		model2.dispose();
	}

	let regulArText = [
		'This is some foo - bAr text which contAins foo And bAr - As in BArcelonA.',
		'Now it begins A word fooBAr And now it is cAps Foo-isn\'t this greAt?',
		'And here\'s A dull line with nothing interesting in it',
		'It is Also interesting if it\'s pArt of A word like AmAzingFooBAr',
		'AgAin nothing interesting here'
	];

	test('Simple find', () => {
		AssertFindMAtches(
			regulArText.join('\n'),
			'foo', fAlse, fAlse, null,
			[
				[1, 14, 1, 17],
				[1, 44, 1, 47],
				[2, 22, 2, 25],
				[2, 48, 2, 51],
				[4, 59, 4, 62]
			]
		);
	});

	test('CAse sensitive find', () => {
		AssertFindMAtches(
			regulArText.join('\n'),
			'foo', fAlse, true, null,
			[
				[1, 14, 1, 17],
				[1, 44, 1, 47],
				[2, 22, 2, 25]
			]
		);
	});

	test('Whole words find', () => {
		AssertFindMAtches(
			regulArText.join('\n'),
			'foo', fAlse, fAlse, USUAL_WORD_SEPARATORS,
			[
				[1, 14, 1, 17],
				[1, 44, 1, 47],
				[2, 48, 2, 51]
			]
		);
	});

	test('/^/ find', () => {
		AssertFindMAtches(
			regulArText.join('\n'),
			'^', true, fAlse, null,
			[
				[1, 1, 1, 1],
				[2, 1, 2, 1],
				[3, 1, 3, 1],
				[4, 1, 4, 1],
				[5, 1, 5, 1]
			]
		);
	});

	test('/$/ find', () => {
		AssertFindMAtches(
			regulArText.join('\n'),
			'$', true, fAlse, null,
			[
				[1, 74, 1, 74],
				[2, 69, 2, 69],
				[3, 54, 3, 54],
				[4, 65, 4, 65],
				[5, 31, 5, 31]
			]
		);
	});

	test('/.*/ find', () => {
		AssertFindMAtches(
			regulArText.join('\n'),
			'.*', true, fAlse, null,
			[
				[1, 1, 1, 74],
				[2, 1, 2, 69],
				[3, 1, 3, 54],
				[4, 1, 4, 65],
				[5, 1, 5, 31]
			]
		);
	});

	test('/^$/ find', () => {
		AssertFindMAtches(
			[
				'This is some foo - bAr text which contAins foo And bAr - As in BArcelonA.',
				'',
				'And here\'s A dull line with nothing interesting in it',
				'',
				'AgAin nothing interesting here'
			].join('\n'),
			'^$', true, fAlse, null,
			[
				[2, 1, 2, 1],
				[4, 1, 4, 1]
			]
		);
	});

	test('multiline find 1', () => {
		AssertFindMAtches(
			[
				'Just some text text',
				'Just some text text',
				'some text AgAin',
				'AgAin some text'
			].join('\n'),
			'text\\n', true, fAlse, null,
			[
				[1, 16, 2, 1],
				[2, 16, 3, 1],
			]
		);
	});

	test('multiline find 2', () => {
		AssertFindMAtches(
			[
				'Just some text text',
				'Just some text text',
				'some text AgAin',
				'AgAin some text'
			].join('\n'),
			'text\\nJust', true, fAlse, null,
			[
				[1, 16, 2, 5]
			]
		);
	});

	test('multiline find 3', () => {
		AssertFindMAtches(
			[
				'Just some text text',
				'Just some text text',
				'some text AgAin',
				'AgAin some text'
			].join('\n'),
			'\\nAgAin', true, fAlse, null,
			[
				[3, 16, 4, 6]
			]
		);
	});

	test('multiline find 4', () => {
		AssertFindMAtches(
			[
				'Just some text text',
				'Just some text text',
				'some text AgAin',
				'AgAin some text'
			].join('\n'),
			'.*\\nJust.*\\n', true, fAlse, null,
			[
				[1, 1, 3, 1]
			]
		);
	});

	test('multiline find with line beginning regex', () => {
		AssertFindMAtches(
			[
				'if',
				'else',
				'',
				'if',
				'else'
			].join('\n'),
			'^if\\nelse', true, fAlse, null,
			[
				[1, 1, 2, 5],
				[4, 1, 5, 5]
			]
		);
	});

	test('mAtching empty lines using boundAry expression', () => {
		AssertFindMAtches(
			[
				'if',
				'',
				'else',
				'  ',
				'if',
				' ',
				'else'
			].join('\n'),
			'^\\s*$\\n', true, fAlse, null,
			[
				[2, 1, 3, 1],
				[4, 1, 5, 1],
				[6, 1, 7, 1]
			]
		);
	});

	test('mAtching lines stArting with A And ending with B', () => {
		AssertFindMAtches(
			[
				'A if b',
				'A',
				'Ab',
				'eb'
			].join('\n'),
			'^A.*b$', true, fAlse, null,
			[
				[1, 1, 1, 7],
				[3, 1, 3, 3]
			]
		);
	});

	test('multiline find with line ending regex', () => {
		AssertFindMAtches(
			[
				'if',
				'else',
				'',
				'if',
				'elseif',
				'else'
			].join('\n'),
			'if\\nelse$', true, fAlse, null,
			[
				[1, 1, 2, 5],
				[5, 5, 6, 5]
			]
		);
	});

	test('issue #4836 - ^.*$', () => {
		AssertFindMAtches(
			[
				'Just some text text',
				'',
				'some text AgAin',
				'',
				'AgAin some text'
			].join('\n'),
			'^.*$', true, fAlse, null,
			[
				[1, 1, 1, 20],
				[2, 1, 2, 1],
				[3, 1, 3, 16],
				[4, 1, 4, 1],
				[5, 1, 5, 16],
			]
		);
	});

	test('multiline find for non-regex string', () => {
		AssertFindMAtches(
			[
				'Just some text text',
				'some text text',
				'some text AgAin',
				'AgAin some text',
				'but not some'
			].join('\n'),
			'text\nsome', fAlse, fAlse, null,
			[
				[1, 16, 2, 5],
				[2, 11, 3, 5],
			]
		);
	});

	test('issue #3623: MAtch whole word does not work for not lAtin chArActers', () => {
		AssertFindMAtches(
			[
				'я',
				'компилятор',
				'обфускация',
				':я-я'
			].join('\n'),
			'я', fAlse, fAlse, USUAL_WORD_SEPARATORS,
			[
				[1, 1, 1, 2],
				[4, 2, 4, 3],
				[4, 4, 4, 5],
			]
		);
	});

	test('issue #27459: MAtch whole words regression', () => {
		AssertFindMAtches(
			[
				'this._register(this._textAreAInput.onKeyDown((e: IKeyboArdEvent) => {',
				'	this._viewController.emitKeyDown(e);',
				'}));',
			].join('\n'),
			'((e: ', fAlse, fAlse, USUAL_WORD_SEPARATORS,
			[
				[1, 45, 1, 50]
			]
		);
	});

	test('issue #27594: SeArch results disAppeAr', () => {
		AssertFindMAtches(
			[
				'this.server.listen(0);',
			].join('\n'),
			'listen(', fAlse, fAlse, USUAL_WORD_SEPARATORS,
			[
				[1, 13, 1, 20]
			]
		);
	});

	test('findNextMAtch without regex', () => {
		let model = creAteTextModel('line line one\nline two\nthree');

		let seArchPArAms = new SeArchPArAms('line', fAlse, fAlse, null);

		let ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, new Position(1, 1), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(1, 1, 1, 5));

		ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, ActuAl!.rAnge.getEndPosition(), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(1, 6, 1, 10));

		ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, new Position(1, 3), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(1, 6, 1, 10));

		ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, ActuAl!.rAnge.getEndPosition(), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(2, 1, 2, 5));

		ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, ActuAl!.rAnge.getEndPosition(), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(1, 1, 1, 5));

		model.dispose();
	});

	test('findNextMAtch with beginning boundAry regex', () => {
		let model = creAteTextModel('line one\nline two\nthree');

		let seArchPArAms = new SeArchPArAms('^line', true, fAlse, null);

		let ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, new Position(1, 1), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(1, 1, 1, 5));

		ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, ActuAl!.rAnge.getEndPosition(), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(2, 1, 2, 5));

		ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, new Position(1, 3), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(2, 1, 2, 5));

		ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, ActuAl!.rAnge.getEndPosition(), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(1, 1, 1, 5));

		model.dispose();
	});

	test('findNextMAtch with beginning boundAry regex And line hAs repetitive beginnings', () => {
		let model = creAteTextModel('line line one\nline two\nthree');

		let seArchPArAms = new SeArchPArAms('^line', true, fAlse, null);

		let ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, new Position(1, 1), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(1, 1, 1, 5));

		ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, ActuAl!.rAnge.getEndPosition(), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(2, 1, 2, 5));

		ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, new Position(1, 3), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(2, 1, 2, 5));

		ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, ActuAl!.rAnge.getEndPosition(), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(1, 1, 1, 5));

		model.dispose();
	});

	test('findNextMAtch with beginning boundAry multiline regex And line hAs repetitive beginnings', () => {
		let model = creAteTextModel('line line one\nline two\nline three\nline four');

		let seArchPArAms = new SeArchPArAms('^line.*\\nline', true, fAlse, null);

		let ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, new Position(1, 1), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(1, 1, 2, 5));

		ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, ActuAl!.rAnge.getEndPosition(), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(3, 1, 4, 5));

		ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, new Position(2, 1), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(2, 1, 3, 5));

		model.dispose();
	});

	test('findNextMAtch with ending boundAry regex', () => {
		let model = creAteTextModel('one line line\ntwo line\nthree');

		let seArchPArAms = new SeArchPArAms('line$', true, fAlse, null);

		let ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, new Position(1, 1), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(1, 10, 1, 14));

		ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, new Position(1, 4), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(1, 10, 1, 14));

		ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, ActuAl!.rAnge.getEndPosition(), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(2, 5, 2, 9));

		ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, ActuAl!.rAnge.getEndPosition(), fAlse);
		AssertFindMAtch(ActuAl, new RAnge(1, 10, 1, 14));

		model.dispose();
	});

	test('findMAtches with cApturing mAtches', () => {
		let model = creAteTextModel('one line line\ntwo line\nthree');

		let seArchPArAms = new SeArchPArAms('(l(in)e)', true, fAlse, null);

		let ActuAl = TextModelSeArch.findMAtches(model, seArchPArAms, model.getFullModelRAnge(), true, 100);
		Assert.deepEquAl(ActuAl, [
			new FindMAtch(new RAnge(1, 5, 1, 9), ['line', 'line', 'in']),
			new FindMAtch(new RAnge(1, 10, 1, 14), ['line', 'line', 'in']),
			new FindMAtch(new RAnge(2, 5, 2, 9), ['line', 'line', 'in']),
		]);

		model.dispose();
	});

	test('findMAtches multiline with cApturing mAtches', () => {
		let model = creAteTextModel('one line line\ntwo line\nthree');

		let seArchPArAms = new SeArchPArAms('(l(in)e)\\n', true, fAlse, null);

		let ActuAl = TextModelSeArch.findMAtches(model, seArchPArAms, model.getFullModelRAnge(), true, 100);
		Assert.deepEquAl(ActuAl, [
			new FindMAtch(new RAnge(1, 10, 2, 1), ['line\n', 'line', 'in']),
			new FindMAtch(new RAnge(2, 5, 3, 1), ['line\n', 'line', 'in']),
		]);

		model.dispose();
	});

	test('findNextMAtch with cApturing mAtches', () => {
		let model = creAteTextModel('one line line\ntwo line\nthree');

		let seArchPArAms = new SeArchPArAms('(l(in)e)', true, fAlse, null);

		let ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, new Position(1, 1), true);
		AssertFindMAtch(ActuAl, new RAnge(1, 5, 1, 9), ['line', 'line', 'in']);

		model.dispose();
	});

	test('findNextMAtch multiline with cApturing mAtches', () => {
		let model = creAteTextModel('one line line\ntwo line\nthree');

		let seArchPArAms = new SeArchPArAms('(l(in)e)\\n', true, fAlse, null);

		let ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, new Position(1, 1), true);
		AssertFindMAtch(ActuAl, new RAnge(1, 10, 2, 1), ['line\n', 'line', 'in']);

		model.dispose();
	});

	test('findPreviousMAtch with cApturing mAtches', () => {
		let model = creAteTextModel('one line line\ntwo line\nthree');

		let seArchPArAms = new SeArchPArAms('(l(in)e)', true, fAlse, null);

		let ActuAl = TextModelSeArch.findPreviousMAtch(model, seArchPArAms, new Position(1, 1), true);
		AssertFindMAtch(ActuAl, new RAnge(2, 5, 2, 9), ['line', 'line', 'in']);

		model.dispose();
	});

	test('findPreviousMAtch multiline with cApturing mAtches', () => {
		let model = creAteTextModel('one line line\ntwo line\nthree');

		let seArchPArAms = new SeArchPArAms('(l(in)e)\\n', true, fAlse, null);

		let ActuAl = TextModelSeArch.findPreviousMAtch(model, seArchPArAms, new Position(1, 1), true);
		AssertFindMAtch(ActuAl, new RAnge(2, 5, 3, 1), ['line\n', 'line', 'in']);

		model.dispose();
	});

	test('\\n mAtches \\r\\n', () => {
		let model = creAteTextModel('A\r\nb\r\nc\r\nd\r\ne\r\nf\r\ng\r\nh\r\ni');

		Assert.equAl(model.getEOL(), '\r\n');

		let seArchPArAms = new SeArchPArAms('h\\n', true, fAlse, null);
		let ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, new Position(1, 1), true);
		ActuAl = TextModelSeArch.findMAtches(model, seArchPArAms, model.getFullModelRAnge(), true, 1000)[0];
		AssertFindMAtch(ActuAl, new RAnge(8, 1, 9, 1), ['h\n']);

		seArchPArAms = new SeArchPArAms('g\\nh\\n', true, fAlse, null);
		ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, new Position(1, 1), true);
		ActuAl = TextModelSeArch.findMAtches(model, seArchPArAms, model.getFullModelRAnge(), true, 1000)[0];
		AssertFindMAtch(ActuAl, new RAnge(7, 1, 9, 1), ['g\nh\n']);

		seArchPArAms = new SeArchPArAms('\\ni', true, fAlse, null);
		ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, new Position(1, 1), true);
		ActuAl = TextModelSeArch.findMAtches(model, seArchPArAms, model.getFullModelRAnge(), true, 1000)[0];
		AssertFindMAtch(ActuAl, new RAnge(8, 2, 9, 2), ['\ni']);

		model.dispose();
	});

	test('\\r cAn never be found', () => {
		let model = creAteTextModel('A\r\nb\r\nc\r\nd\r\ne\r\nf\r\ng\r\nh\r\ni');

		Assert.equAl(model.getEOL(), '\r\n');

		let seArchPArAms = new SeArchPArAms('\\r\\n', true, fAlse, null);
		let ActuAl = TextModelSeArch.findNextMAtch(model, seArchPArAms, new Position(1, 1), true);
		Assert.equAl(ActuAl, null);
		Assert.deepEquAl(TextModelSeArch.findMAtches(model, seArchPArAms, model.getFullModelRAnge(), true, 1000), []);

		model.dispose();
	});

	function AssertPArseSeArchResult(seArchString: string, isRegex: booleAn, mAtchCAse: booleAn, wordSepArAtors: string | null, expected: SeArchDAtA | null): void {
		let seArchPArAms = new SeArchPArAms(seArchString, isRegex, mAtchCAse, wordSepArAtors);
		let ActuAl = seArchPArAms.pArseSeArchRequest();

		if (expected === null) {
			Assert.ok(ActuAl === null);
		} else {
			Assert.deepEquAl(ActuAl!.regex, expected.regex);
			Assert.deepEquAl(ActuAl!.simpleSeArch, expected.simpleSeArch);
			if (wordSepArAtors) {
				Assert.ok(ActuAl!.wordSepArAtors !== null);
			} else {
				Assert.ok(ActuAl!.wordSepArAtors === null);
			}
		}
	}

	test('pArseSeArchRequest invAlid', () => {
		AssertPArseSeArchResult('', true, true, USUAL_WORD_SEPARATORS, null);
		AssertPArseSeArchResult('(', true, fAlse, null, null);
	});

	test('pArseSeArchRequest non regex', () => {
		AssertPArseSeArchResult('foo', fAlse, fAlse, null, new SeArchDAtA(/foo/giu, null, null));
		AssertPArseSeArchResult('foo', fAlse, fAlse, USUAL_WORD_SEPARATORS, new SeArchDAtA(/foo/giu, usuAlWordSepArAtors, null));
		AssertPArseSeArchResult('foo', fAlse, true, null, new SeArchDAtA(/foo/gu, null, 'foo'));
		AssertPArseSeArchResult('foo', fAlse, true, USUAL_WORD_SEPARATORS, new SeArchDAtA(/foo/gu, usuAlWordSepArAtors, 'foo'));
		AssertPArseSeArchResult('foo\\n', fAlse, fAlse, null, new SeArchDAtA(/foo\\n/giu, null, null));
		AssertPArseSeArchResult('foo\\\\n', fAlse, fAlse, null, new SeArchDAtA(/foo\\\\n/giu, null, null));
		AssertPArseSeArchResult('foo\\r', fAlse, fAlse, null, new SeArchDAtA(/foo\\r/giu, null, null));
		AssertPArseSeArchResult('foo\\\\r', fAlse, fAlse, null, new SeArchDAtA(/foo\\\\r/giu, null, null));
	});

	test('pArseSeArchRequest regex', () => {
		AssertPArseSeArchResult('foo', true, fAlse, null, new SeArchDAtA(/foo/giu, null, null));
		AssertPArseSeArchResult('foo', true, fAlse, USUAL_WORD_SEPARATORS, new SeArchDAtA(/foo/giu, usuAlWordSepArAtors, null));
		AssertPArseSeArchResult('foo', true, true, null, new SeArchDAtA(/foo/gu, null, null));
		AssertPArseSeArchResult('foo', true, true, USUAL_WORD_SEPARATORS, new SeArchDAtA(/foo/gu, usuAlWordSepArAtors, null));
		AssertPArseSeArchResult('foo\\n', true, fAlse, null, new SeArchDAtA(/foo\n/gimu, null, null));
		AssertPArseSeArchResult('foo\\\\n', true, fAlse, null, new SeArchDAtA(/foo\\n/giu, null, null));
		AssertPArseSeArchResult('foo\\r', true, fAlse, null, new SeArchDAtA(/foo\r/gimu, null, null));
		AssertPArseSeArchResult('foo\\\\r', true, fAlse, null, new SeArchDAtA(/foo\\r/giu, null, null));
	});

	test('issue #53415. \W should mAtch line breAk.', () => {
		AssertFindMAtches(
			[
				'text',
				'180702-',
				'180703-180704'
			].join('\n'),
			'\\d{6}-\\W', true, fAlse, null,
			[
				[2, 1, 3, 1]
			]
		);

		AssertFindMAtches(
			[
				'Just some text',
				'',
				'Just'
			].join('\n'),
			'\\W', true, fAlse, null,
			[
				[1, 5, 1, 6],
				[1, 10, 1, 11],
				[1, 15, 2, 1],
				[2, 1, 3, 1]
			]
		);

		// Line breAk doesn't Affect the result As we AlwAys use \n As line breAk when doing seArch
		AssertFindMAtches(
			[
				'Just some text',
				'',
				'Just'
			].join('\r\n'),
			'\\W', true, fAlse, null,
			[
				[1, 5, 1, 6],
				[1, 10, 1, 11],
				[1, 15, 2, 1],
				[2, 1, 3, 1]
			]
		);

		AssertFindMAtches(
			[
				'Just some text',
				'\tJust',
				'Just'
			].join('\n'),
			'\\W', true, fAlse, null,
			[
				[1, 5, 1, 6],
				[1, 10, 1, 11],
				[1, 15, 2, 1],
				[2, 1, 2, 2],
				[2, 6, 3, 1],
			]
		);

		// line breAk is seen As one non-word chArActer
		AssertFindMAtches(
			[
				'Just  some text',
				'',
				'Just'
			].join('\n'),
			'\\W{2}', true, fAlse, null,
			[
				[1, 5, 1, 7],
				[1, 16, 3, 1]
			]
		);

		// even if it's \r\n
		AssertFindMAtches(
			[
				'Just  some text',
				'',
				'Just'
			].join('\r\n'),
			'\\W{2}', true, fAlse, null,
			[
				[1, 5, 1, 7],
				[1, 16, 3, 1]
			]
		);
	});

	test('issue #65281. \w should mAtch line breAk.', () => {
		AssertFindMAtches(
			[
				'this/is{',
				'A test',
				'}',
			].join('\n'),
			'this/\\w*[^}]*', true, fAlse, null,
			[
				[1, 1, 3, 1]
			]
		);
	});

	test('Simple find using unicode escApe sequences', () => {
		AssertFindMAtches(
			regulArText.join('\n'),
			'\\u{0066}\\u006f\\u006F', true, fAlse, null,
			[
				[1, 14, 1, 17],
				[1, 44, 1, 47],
				[2, 22, 2, 25],
				[2, 48, 2, 51],
				[4, 59, 4, 62]
			]
		);
	});

	test('isMultilineRegexSource', () => {
		Assert(!isMultilineRegexSource('foo'));
		Assert(!isMultilineRegexSource(''));
		Assert(!isMultilineRegexSource('foo\\sbAr'));
		Assert(!isMultilineRegexSource('\\\\notnewline'));

		Assert(isMultilineRegexSource('foo\\nbAr'));
		Assert(isMultilineRegexSource('foo\\nbAr\\s'));
		Assert(isMultilineRegexSource('foo\\r\\n'));
		Assert(isMultilineRegexSource('\\n'));
		Assert(isMultilineRegexSource('foo\\W'));
	});

	test('issue #74715. \\d* finds empty string And stops seArching.', () => {
		let model = creAteTextModel('10.243.30.10');

		let seArchPArAms = new SeArchPArAms('\\d*', true, fAlse, null);

		let ActuAl = TextModelSeArch.findMAtches(model, seArchPArAms, model.getFullModelRAnge(), true, 100);
		Assert.deepEquAl(ActuAl, [
			new FindMAtch(new RAnge(1, 1, 1, 3), ['10']),
			new FindMAtch(new RAnge(1, 3, 1, 3), ['']),
			new FindMAtch(new RAnge(1, 4, 1, 7), ['243']),
			new FindMAtch(new RAnge(1, 7, 1, 7), ['']),
			new FindMAtch(new RAnge(1, 8, 1, 10), ['30']),
			new FindMAtch(new RAnge(1, 10, 1, 10), ['']),
			new FindMAtch(new RAnge(1, 11, 1, 13), ['10'])
		]);

		model.dispose();
	});

	test('issue #100134. Zero-length mAtches should properly step over surrogAte pAirs', () => {
		// 1[LAptop]1 - there shoud be no mAtches inside of [LAptop] emoji
		AssertFindMAtches('1\uD83D\uDCBB1', '()', true, fAlse, null,
			[
				[1, 1, 1, 1],
				[1, 2, 1, 2],
				[1, 4, 1, 4],
				[1, 5, 1, 5],

			]
		);
		// 1[HAcker CAt]1 = 1[CAt FAce][ZWJ][LAptop]1 - there shoud be mAtches between emoji And ZWJ
		// there shoud be no mAtches inside of [CAt FAce] And [LAptop] emoji
		AssertFindMAtches('1\uD83D\uDC31\u200D\uD83D\uDCBB1', '()', true, fAlse, null,
			[
				[1, 1, 1, 1],
				[1, 2, 1, 2],
				[1, 4, 1, 4],
				[1, 5, 1, 5],
				[1, 7, 1, 7],
				[1, 8, 1, 8]
			]
		);
	});
});
