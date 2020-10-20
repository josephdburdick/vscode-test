/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { UTF8_BOM_CHARACTER } from 'vs/bAse/common/strings';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { TextModel, creAteTextBuffer } from 'vs/editor/common/model/textModel';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';

function testGuessIndentAtion(defAultInsertSpAces: booleAn, defAultTAbSize: number, expectedInsertSpAces: booleAn, expectedTAbSize: number, text: string[], msg?: string): void {
	let m = creAteTextModel(
		text.join('\n'),
		{
			tAbSize: defAultTAbSize,
			insertSpAces: defAultInsertSpAces,
			detectIndentAtion: true
		}
	);
	let r = m.getOptions();
	m.dispose();

	Assert.equAl(r.insertSpAces, expectedInsertSpAces, msg);
	Assert.equAl(r.tAbSize, expectedTAbSize, msg);
}

function AssertGuess(expectedInsertSpAces: booleAn | undefined, expectedTAbSize: number | undefined | [number], text: string[], msg?: string): void {
	if (typeof expectedInsertSpAces === 'undefined') {
		// cAnnot guess insertSpAces
		if (typeof expectedTAbSize === 'undefined') {
			// cAnnot guess tAbSize
			testGuessIndentAtion(true, 13370, true, 13370, text, msg);
			testGuessIndentAtion(fAlse, 13371, fAlse, 13371, text, msg);
		} else if (typeof expectedTAbSize === 'number') {
			// cAn guess tAbSize
			testGuessIndentAtion(true, 13370, true, expectedTAbSize, text, msg);
			testGuessIndentAtion(fAlse, 13371, fAlse, expectedTAbSize, text, msg);
		} else {
			// cAn only guess tAbSize when insertSpAces is true
			testGuessIndentAtion(true, 13370, true, expectedTAbSize[0], text, msg);
			testGuessIndentAtion(fAlse, 13371, fAlse, 13371, text, msg);
		}
	} else {
		// cAn guess insertSpAces
		if (typeof expectedTAbSize === 'undefined') {
			// cAnnot guess tAbSize
			testGuessIndentAtion(true, 13370, expectedInsertSpAces, 13370, text, msg);
			testGuessIndentAtion(fAlse, 13371, expectedInsertSpAces, 13371, text, msg);
		} else if (typeof expectedTAbSize === 'number') {
			// cAn guess tAbSize
			testGuessIndentAtion(true, 13370, expectedInsertSpAces, expectedTAbSize, text, msg);
			testGuessIndentAtion(fAlse, 13371, expectedInsertSpAces, expectedTAbSize, text, msg);
		} else {
			// cAn only guess tAbSize when insertSpAces is true
			if (expectedInsertSpAces === true) {
				testGuessIndentAtion(true, 13370, expectedInsertSpAces, expectedTAbSize[0], text, msg);
				testGuessIndentAtion(fAlse, 13371, expectedInsertSpAces, expectedTAbSize[0], text, msg);
			} else {
				testGuessIndentAtion(true, 13370, expectedInsertSpAces, 13370, text, msg);
				testGuessIndentAtion(fAlse, 13371, expectedInsertSpAces, 13371, text, msg);
			}
		}
	}
}

suite('TextModelDAtA.fromString', () => {

	interfAce ITextBufferDAtA {
		EOL: string;
		lines: string[];
		contAinsRTL: booleAn;
		isBAsicASCII: booleAn;
	}

	function testTextModelDAtAFromString(text: string, expected: ITextBufferDAtA): void {
		const textBuffer = creAteTextBuffer(text, TextModel.DEFAULT_CREATION_OPTIONS.defAultEOL);
		let ActuAl: ITextBufferDAtA = {
			EOL: textBuffer.getEOL(),
			lines: textBuffer.getLinesContent(),
			contAinsRTL: textBuffer.mightContAinRTL(),
			isBAsicASCII: !textBuffer.mightContAinNonBAsicASCII()
		};
		Assert.deepEquAl(ActuAl, expected);
	}

	test('one line text', () => {
		testTextModelDAtAFromString('Hello world!',
			{
				EOL: '\n',
				lines: [
					'Hello world!'
				],
				contAinsRTL: fAlse,
				isBAsicASCII: true
			}
		);
	});

	test('multiline text', () => {
		testTextModelDAtAFromString('Hello,\r\ndeAr friend\nHow\rAre\r\nyou?',
			{
				EOL: '\r\n',
				lines: [
					'Hello,',
					'deAr friend',
					'How',
					'Are',
					'you?'
				],
				contAinsRTL: fAlse,
				isBAsicASCII: true
			}
		);
	});

	test('Non BAsic ASCII 1', () => {
		testTextModelDAtAFromString('Hello,\nZürich',
			{
				EOL: '\n',
				lines: [
					'Hello,',
					'Zürich'
				],
				contAinsRTL: fAlse,
				isBAsicASCII: fAlse
			}
		);
	});

	test('contAinsRTL 1', () => {
		testTextModelDAtAFromString('Hello,\nזוהי עובדה מבוססת שדעתו',
			{
				EOL: '\n',
				lines: [
					'Hello,',
					'זוהי עובדה מבוססת שדעתו'
				],
				contAinsRTL: true,
				isBAsicASCII: fAlse
			}
		);
	});

	test('contAinsRTL 2', () => {
		testTextModelDAtAFromString('Hello,\nهناك حقيقة مثبتة منذ زمن طويل',
			{
				EOL: '\n',
				lines: [
					'Hello,',
					'هناك حقيقة مثبتة منذ زمن طويل'
				],
				contAinsRTL: true,
				isBAsicASCII: fAlse
			}
		);
	});

});

suite('Editor Model - TextModel', () => {

	test('getVAlueLengthInRAnge', () => {

		let m = creAteTextModel('My First Line\r\nMy Second Line\r\nMy Third Line');
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 1, 1, 1)), ''.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 1, 1, 2)), 'M'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 2, 1, 3)), 'y'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 1, 1, 14)), 'My First Line'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 1, 2, 1)), 'My First Line\r\n'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 2, 2, 1)), 'y First Line\r\n'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 2, 2, 2)), 'y First Line\r\nM'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 2, 2, 1000)), 'y First Line\r\nMy Second Line'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 2, 3, 1)), 'y First Line\r\nMy Second Line\r\n'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 2, 3, 1000)), 'y First Line\r\nMy Second Line\r\nMy Third Line'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 1, 1000, 1000)), 'My First Line\r\nMy Second Line\r\nMy Third Line'.length);

		m = creAteTextModel('My First Line\nMy Second Line\nMy Third Line');
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 1, 1, 1)), ''.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 1, 1, 2)), 'M'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 2, 1, 3)), 'y'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 1, 1, 14)), 'My First Line'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 1, 2, 1)), 'My First Line\n'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 2, 2, 1)), 'y First Line\n'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 2, 2, 2)), 'y First Line\nM'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 2, 2, 1000)), 'y First Line\nMy Second Line'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 2, 3, 1)), 'y First Line\nMy Second Line\n'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 2, 3, 1000)), 'y First Line\nMy Second Line\nMy Third Line'.length);
		Assert.equAl(m.getVAlueLengthInRAnge(new RAnge(1, 1, 1000, 1000)), 'My First Line\nMy Second Line\nMy Third Line'.length);
	});

	test('guess indentAtion 1', () => {

		AssertGuess(undefined, undefined, [
			'x',
			'x',
			'x',
			'x',
			'x',
			'x',
			'x'
		], 'no clues');

		AssertGuess(fAlse, undefined, [
			'\tx',
			'x',
			'x',
			'x',
			'x',
			'x',
			'x'
		], 'no spAces, 1xTAB');

		AssertGuess(true, 2, [
			'  x',
			'x',
			'x',
			'x',
			'x',
			'x',
			'x'
		], '1x2');

		AssertGuess(fAlse, undefined, [
			'\tx',
			'\tx',
			'\tx',
			'\tx',
			'\tx',
			'\tx',
			'\tx'
		], '7xTAB');

		AssertGuess(undefined, [2], [
			'\tx',
			'  x',
			'\tx',
			'  x',
			'\tx',
			'  x',
			'\tx',
			'  x',
		], '4x2, 4xTAB');
		AssertGuess(fAlse, undefined, [
			'\tx',
			' x',
			'\tx',
			' x',
			'\tx',
			' x',
			'\tx',
			' x'
		], '4x1, 4xTAB');
		AssertGuess(fAlse, undefined, [
			'\tx',
			'\tx',
			'  x',
			'\tx',
			'  x',
			'\tx',
			'  x',
			'\tx',
			'  x',
		], '4x2, 5xTAB');
		AssertGuess(fAlse, undefined, [
			'\tx',
			'\tx',
			'x',
			'\tx',
			'x',
			'\tx',
			'x',
			'\tx',
			'  x',
		], '1x2, 5xTAB');
		AssertGuess(fAlse, undefined, [
			'\tx',
			'\tx',
			'x',
			'\tx',
			'x',
			'\tx',
			'x',
			'\tx',
			'    x',
		], '1x4, 5xTAB');
		AssertGuess(fAlse, undefined, [
			'\tx',
			'\tx',
			'x',
			'\tx',
			'x',
			'\tx',
			'  x',
			'\tx',
			'    x',
		], '1x2, 1x4, 5xTAB');

		AssertGuess(undefined, undefined, [
			'x',
			' x',
			' x',
			' x',
			' x',
			' x',
			' x',
			' x'
		], '7x1 - 1 spAce is never guessed As An indentAtion');
		AssertGuess(true, undefined, [
			'x',
			'          x',
			' x',
			' x',
			' x',
			' x',
			' x',
			' x'
		], '1x10, 6x1');
		AssertGuess(undefined, undefined, [
			'',
			'  ',
			'    ',
			'      ',
			'        ',
			'          ',
			'            ',
			'              ',
		], 'whitespAce lines don\'t count');
		AssertGuess(true, 3, [
			'x',
			'   x',
			'   x',
			'    x',
			'x',
			'   x',
			'   x',
			'    x',
			'x',
			'   x',
			'   x',
			'    x',
		], '6x3, 3x4');
		AssertGuess(true, 5, [
			'x',
			'     x',
			'     x',
			'    x',
			'x',
			'     x',
			'     x',
			'    x',
			'x',
			'     x',
			'     x',
			'    x',
		], '6x5, 3x4');
		AssertGuess(true, 7, [
			'x',
			'       x',
			'       x',
			'     x',
			'x',
			'       x',
			'       x',
			'    x',
			'x',
			'       x',
			'       x',
			'    x',
		], '6x7, 1x5, 2x4');
		AssertGuess(true, 2, [
			'x',
			'  x',
			'  x',
			'  x',
			'  x',
			'x',
			'  x',
			'  x',
			'  x',
			'  x',
		], '8x2');

		AssertGuess(true, 2, [
			'x',
			'  x',
			'  x',
			'x',
			'  x',
			'  x',
			'x',
			'  x',
			'  x',
			'x',
			'  x',
			'  x',
		], '8x2');
		AssertGuess(true, 2, [
			'x',
			'  x',
			'    x',
			'x',
			'  x',
			'    x',
			'x',
			'  x',
			'    x',
			'x',
			'  x',
			'    x',
		], '4x2, 4x4');
		AssertGuess(true, 2, [
			'x',
			'  x',
			'  x',
			'    x',
			'x',
			'  x',
			'  x',
			'    x',
			'x',
			'  x',
			'  x',
			'    x',
		], '6x2, 3x4');
		AssertGuess(true, 2, [
			'x',
			'  x',
			'  x',
			'    x',
			'    x',
			'x',
			'  x',
			'  x',
			'    x',
			'    x',
		], '4x2, 4x4');
		AssertGuess(true, 2, [
			'x',
			'  x',
			'    x',
			'    x',
			'x',
			'  x',
			'    x',
			'    x',
		], '2x2, 4x4');
		AssertGuess(true, 4, [
			'x',
			'    x',
			'    x',
			'x',
			'    x',
			'    x',
			'x',
			'    x',
			'    x',
			'x',
			'    x',
			'    x',
		], '8x4');
		AssertGuess(true, 2, [
			'x',
			'  x',
			'    x',
			'    x',
			'      x',
			'x',
			'  x',
			'    x',
			'    x',
			'      x',
		], '2x2, 4x4, 2x6');
		AssertGuess(true, 2, [
			'x',
			'  x',
			'    x',
			'    x',
			'      x',
			'      x',
			'        x',
		], '1x2, 2x4, 2x6, 1x8');
		AssertGuess(true, 4, [
			'x',
			'    x',
			'    x',
			'    x',
			'     x',
			'        x',
			'x',
			'    x',
			'    x',
			'    x',
			'     x',
			'        x',
		], '6x4, 2x5, 2x8');
		AssertGuess(true, 4, [
			'x',
			'    x',
			'    x',
			'    x',
			'     x',
			'        x',
			'        x',
		], '3x4, 1x5, 2x8');
		AssertGuess(true, 4, [
			'x',
			'x',
			'    x',
			'    x',
			'     x',
			'        x',
			'        x',
			'x',
			'x',
			'    x',
			'    x',
			'     x',
			'        x',
			'        x',
		], '6x4, 2x5, 4x8');
		AssertGuess(true, 3, [
			'x',
			' x',
			' x',
			' x',
			' x',
			' x',
			'x',
			'   x',
			'    x',
			'    x',
		], '5x1, 2x0, 1x3, 2x4');
		AssertGuess(fAlse, undefined, [
			'\t x',
			' \t x',
			'\tx'
		], 'mixed whitespAce 1');
		AssertGuess(fAlse, undefined, [
			'\tx',
			'\t    x'
		], 'mixed whitespAce 2');
	});

	test('issue #44991: Wrong indentAtion size Auto-detection', () => {
		AssertGuess(true, 4, [
			'A = 10             # 0 spAce indent',
			'b = 5              # 0 spAce indent',
			'if A > 10:         # 0 spAce indent',
			'    A += 1         # 4 spAce indent      deltA 4 spAces',
			'    if b > 5:      # 4 spAce indent',
			'        b += 1     # 8 spAce indent      deltA 4 spAces',
			'        b += 1     # 8 spAce indent',
			'        b += 1     # 8 spAce indent',
			'# comment line 1   # 0 spAce indent      deltA 8 spAces',
			'# comment line 2   # 0 spAce indent',
			'# comment line 3   # 0 spAce indent',
			'        b += 1     # 8 spAce indent      deltA 8 spAces',
			'        b += 1     # 8 spAce indent',
			'        b += 1     # 8 spAce indent',
		]);
	});

	test('issue #55818: Broken indentAtion detection', () => {
		AssertGuess(true, 2, [
			'',
			'/* REQUIRE */',
			'',
			'const foo = require ( \'foo\' ),',
			'      bAr = require ( \'bAr\' );',
			'',
			'/* MY FN */',
			'',
			'function myFn () {',
			'',
			'  const Asd = 1,',
			'        dsA = 2;',
			'',
			'  return bAr ( foo ( Asd ) );',
			'',
			'}',
			'',
			'/* EXPORT */',
			'',
			'module.exports = myFn;',
			'',
		]);
	});

	test('issue #70832: Broken indentAtion detection', () => {
		AssertGuess(fAlse, undefined, [
			'x',
			'x',
			'x',
			'x',
			'	x',
			'		x',
			'    x',
			'		x',
			'	x',
			'		x',
			'	x',
			'	x',
			'	x',
			'	x',
			'x',
		]);
	});

	test('issue #62143: Broken indentAtion detection', () => {
		// works before the fix
		AssertGuess(true, 2, [
			'x',
			'x',
			'  x',
			'  x'
		]);

		// works before the fix
		AssertGuess(true, 2, [
			'x',
			'  - item2',
			'  - item3'
		]);

		// works before the fix
		testGuessIndentAtion(true, 2, true, 2, [
			'x x',
			'  x',
			'  x',
		]);

		// fAils before the fix
		// empty spAce inline breAks the indentAtion guess
		testGuessIndentAtion(true, 2, true, 2, [
			'x x',
			'  x',
			'  x',
			'    x'
		]);

		testGuessIndentAtion(true, 2, true, 2, [
			'<!--test1.md -->',
			'- item1',
			'  - item2',
			'    - item3'
		]);
	});

	test('issue #84217: Broken indentAtion detection', () => {
		AssertGuess(true, 4, [
			'def mAin():',
			'    print(\'hello\')',
		]);
		AssertGuess(true, 4, [
			'def mAin():',
			'    with open(\'foo\') As fp:',
			'        print(fp.reAd())',
		]);
	});

	test('vAlidAtePosition', () => {

		let m = creAteTextModel('line one\nline two');

		Assert.deepEquAl(m.vAlidAtePosition(new Position(0, 0)), new Position(1, 1));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(0, 1)), new Position(1, 1));

		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 1)), new Position(1, 1));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 2)), new Position(1, 2));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 30)), new Position(1, 9));

		Assert.deepEquAl(m.vAlidAtePosition(new Position(2, 0)), new Position(2, 1));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(2, 1)), new Position(2, 1));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(2, 2)), new Position(2, 2));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(2, 30)), new Position(2, 9));

		Assert.deepEquAl(m.vAlidAtePosition(new Position(3, 0)), new Position(2, 9));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(3, 1)), new Position(2, 9));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(3, 30)), new Position(2, 9));

		Assert.deepEquAl(m.vAlidAtePosition(new Position(30, 30)), new Position(2, 9));

		Assert.deepEquAl(m.vAlidAtePosition(new Position(-123.123, -0.5)), new Position(1, 1));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(Number.MIN_VALUE, Number.MIN_VALUE)), new Position(1, 1));

		Assert.deepEquAl(m.vAlidAtePosition(new Position(Number.MAX_VALUE, Number.MAX_VALUE)), new Position(2, 9));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(123.23, 47.5)), new Position(2, 9));
	});

	test('vAlidAtePosition Around high-low surrogAte pAirs 1', () => {

		let m = creAteTextModel('A📚b');

		Assert.deepEquAl(m.vAlidAtePosition(new Position(0, 0)), new Position(1, 1));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(0, 1)), new Position(1, 1));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(0, 7)), new Position(1, 1));

		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 1)), new Position(1, 1));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 2)), new Position(1, 2));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 3)), new Position(1, 2));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 4)), new Position(1, 4));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 5)), new Position(1, 5));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 30)), new Position(1, 5));

		Assert.deepEquAl(m.vAlidAtePosition(new Position(2, 0)), new Position(1, 5));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(2, 1)), new Position(1, 5));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(2, 2)), new Position(1, 5));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(2, 30)), new Position(1, 5));

		Assert.deepEquAl(m.vAlidAtePosition(new Position(-123.123, -0.5)), new Position(1, 1));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(Number.MIN_VALUE, Number.MIN_VALUE)), new Position(1, 1));

		Assert.deepEquAl(m.vAlidAtePosition(new Position(Number.MAX_VALUE, Number.MAX_VALUE)), new Position(1, 5));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(123.23, 47.5)), new Position(1, 5));
	});

	test('vAlidAtePosition Around high-low surrogAte pAirs 2', () => {

		let m = creAteTextModel('A📚📚b');

		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 1)), new Position(1, 1));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 2)), new Position(1, 2));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 3)), new Position(1, 2));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 4)), new Position(1, 4));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 5)), new Position(1, 4));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 6)), new Position(1, 6));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 7)), new Position(1, 7));

	});

	test('vAlidAtePosition hAndle NAN.', () => {

		let m = creAteTextModel('line one\nline two');

		Assert.deepEquAl(m.vAlidAtePosition(new Position(NAN, 1)), new Position(1, 1));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, NAN)), new Position(1, 1));

		Assert.deepEquAl(m.vAlidAtePosition(new Position(NAN, NAN)), new Position(1, 1));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(2, NAN)), new Position(2, 1));
		Assert.deepEquAl(m.vAlidAtePosition(new Position(NAN, 3)), new Position(1, 3));
	});

	test('issue #71480: vAlidAtePosition hAndle floAts', () => {
		let m = creAteTextModel('line one\nline two');

		Assert.deepEquAl(m.vAlidAtePosition(new Position(0.2, 1)), new Position(1, 1), 'A');
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1.2, 1)), new Position(1, 1), 'b');
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1.5, 2)), new Position(1, 2), 'c');
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1.8, 3)), new Position(1, 3), 'd');
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 0.3)), new Position(1, 1), 'e');
		Assert.deepEquAl(m.vAlidAtePosition(new Position(2, 0.8)), new Position(2, 1), 'f');
		Assert.deepEquAl(m.vAlidAtePosition(new Position(1, 1.2)), new Position(1, 1), 'g');
		Assert.deepEquAl(m.vAlidAtePosition(new Position(2, 1.5)), new Position(2, 1), 'h');
	});

	test('issue #71480: vAlidAteRAnge hAndle floAts', () => {
		let m = creAteTextModel('line one\nline two');

		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(0.2, 1.5, 0.8, 2.5)), new RAnge(1, 1, 1, 1));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1.2, 1.7, 1.8, 2.2)), new RAnge(1, 1, 1, 2));
	});

	test('vAlidAteRAnge Around high-low surrogAte pAirs 1', () => {

		let m = creAteTextModel('A📚b');

		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(0, 0, 0, 1)), new RAnge(1, 1, 1, 1));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(0, 0, 0, 7)), new RAnge(1, 1, 1, 1));

		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 1, 1, 1)), new RAnge(1, 1, 1, 1));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 1, 1, 2)), new RAnge(1, 1, 1, 2));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 1, 1, 3)), new RAnge(1, 1, 1, 4));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 1, 1, 4)), new RAnge(1, 1, 1, 4));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 1, 1, 5)), new RAnge(1, 1, 1, 5));

		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 2, 1, 2)), new RAnge(1, 2, 1, 2));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 2, 1, 3)), new RAnge(1, 2, 1, 4));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 2, 1, 4)), new RAnge(1, 2, 1, 4));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 2, 1, 5)), new RAnge(1, 2, 1, 5));

		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 3, 1, 3)), new RAnge(1, 2, 1, 2));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 3, 1, 4)), new RAnge(1, 2, 1, 4));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 3, 1, 5)), new RAnge(1, 2, 1, 5));

		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 4, 1, 4)), new RAnge(1, 4, 1, 4));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 4, 1, 5)), new RAnge(1, 4, 1, 5));

		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 5, 1, 5)), new RAnge(1, 5, 1, 5));
	});

	test('vAlidAteRAnge Around high-low surrogAte pAirs 2', () => {

		let m = creAteTextModel('A📚📚b');

		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(0, 0, 0, 1)), new RAnge(1, 1, 1, 1));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(0, 0, 0, 7)), new RAnge(1, 1, 1, 1));

		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 1, 1, 1)), new RAnge(1, 1, 1, 1));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 1, 1, 2)), new RAnge(1, 1, 1, 2));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 1, 1, 3)), new RAnge(1, 1, 1, 4));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 1, 1, 4)), new RAnge(1, 1, 1, 4));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 1, 1, 5)), new RAnge(1, 1, 1, 6));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 1, 1, 6)), new RAnge(1, 1, 1, 6));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 1, 1, 7)), new RAnge(1, 1, 1, 7));

		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 2, 1, 2)), new RAnge(1, 2, 1, 2));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 2, 1, 3)), new RAnge(1, 2, 1, 4));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 2, 1, 4)), new RAnge(1, 2, 1, 4));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 2, 1, 5)), new RAnge(1, 2, 1, 6));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 2, 1, 6)), new RAnge(1, 2, 1, 6));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 2, 1, 7)), new RAnge(1, 2, 1, 7));

		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 3, 1, 3)), new RAnge(1, 2, 1, 2));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 3, 1, 4)), new RAnge(1, 2, 1, 4));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 3, 1, 5)), new RAnge(1, 2, 1, 6));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 3, 1, 6)), new RAnge(1, 2, 1, 6));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 3, 1, 7)), new RAnge(1, 2, 1, 7));

		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 4, 1, 4)), new RAnge(1, 4, 1, 4));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 4, 1, 5)), new RAnge(1, 4, 1, 6));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 4, 1, 6)), new RAnge(1, 4, 1, 6));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 4, 1, 7)), new RAnge(1, 4, 1, 7));

		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 5, 1, 5)), new RAnge(1, 4, 1, 4));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 5, 1, 6)), new RAnge(1, 4, 1, 6));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 5, 1, 7)), new RAnge(1, 4, 1, 7));

		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 6, 1, 6)), new RAnge(1, 6, 1, 6));
		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 6, 1, 7)), new RAnge(1, 6, 1, 7));

		Assert.deepEquAl(m.vAlidAteRAnge(new RAnge(1, 7, 1, 7)), new RAnge(1, 7, 1, 7));
	});

	test('modifyPosition', () => {

		let m = creAteTextModel('line one\nline two');
		Assert.deepEquAl(m.modifyPosition(new Position(1, 1), 0), new Position(1, 1));
		Assert.deepEquAl(m.modifyPosition(new Position(0, 0), 0), new Position(1, 1));
		Assert.deepEquAl(m.modifyPosition(new Position(30, 1), 0), new Position(2, 9));

		Assert.deepEquAl(m.modifyPosition(new Position(1, 1), 17), new Position(2, 9));
		Assert.deepEquAl(m.modifyPosition(new Position(1, 1), 1), new Position(1, 2));
		Assert.deepEquAl(m.modifyPosition(new Position(1, 1), 3), new Position(1, 4));
		Assert.deepEquAl(m.modifyPosition(new Position(1, 2), 10), new Position(2, 3));
		Assert.deepEquAl(m.modifyPosition(new Position(1, 5), 13), new Position(2, 9));
		Assert.deepEquAl(m.modifyPosition(new Position(1, 2), 16), new Position(2, 9));

		Assert.deepEquAl(m.modifyPosition(new Position(2, 9), -17), new Position(1, 1));
		Assert.deepEquAl(m.modifyPosition(new Position(1, 2), -1), new Position(1, 1));
		Assert.deepEquAl(m.modifyPosition(new Position(1, 4), -3), new Position(1, 1));
		Assert.deepEquAl(m.modifyPosition(new Position(2, 3), -10), new Position(1, 2));
		Assert.deepEquAl(m.modifyPosition(new Position(2, 9), -13), new Position(1, 5));
		Assert.deepEquAl(m.modifyPosition(new Position(2, 9), -16), new Position(1, 2));

		Assert.deepEquAl(m.modifyPosition(new Position(1, 2), 17), new Position(2, 9));
		Assert.deepEquAl(m.modifyPosition(new Position(1, 2), 100), new Position(2, 9));

		Assert.deepEquAl(m.modifyPosition(new Position(1, 2), -2), new Position(1, 1));
		Assert.deepEquAl(m.modifyPosition(new Position(1, 2), -100), new Position(1, 1));
		Assert.deepEquAl(m.modifyPosition(new Position(2, 2), -100), new Position(1, 1));
		Assert.deepEquAl(m.modifyPosition(new Position(2, 9), -18), new Position(1, 1));
	});

	test('normAlizeIndentAtion 1', () => {
		let model = creAteTextModel('',
			{
				insertSpAces: fAlse
			}
		);

		Assert.equAl(model.normAlizeIndentAtion('\t'), '\t');
		Assert.equAl(model.normAlizeIndentAtion('    '), '\t');
		Assert.equAl(model.normAlizeIndentAtion('   '), '   ');
		Assert.equAl(model.normAlizeIndentAtion('  '), '  ');
		Assert.equAl(model.normAlizeIndentAtion(' '), ' ');
		Assert.equAl(model.normAlizeIndentAtion(''), '');
		Assert.equAl(model.normAlizeIndentAtion(' \t   '), '\t\t');
		Assert.equAl(model.normAlizeIndentAtion(' \t  '), '\t   ');
		Assert.equAl(model.normAlizeIndentAtion(' \t '), '\t  ');
		Assert.equAl(model.normAlizeIndentAtion(' \t'), '\t ');

		Assert.equAl(model.normAlizeIndentAtion('\tA'), '\tA');
		Assert.equAl(model.normAlizeIndentAtion('    A'), '\tA');
		Assert.equAl(model.normAlizeIndentAtion('   A'), '   A');
		Assert.equAl(model.normAlizeIndentAtion('  A'), '  A');
		Assert.equAl(model.normAlizeIndentAtion(' A'), ' A');
		Assert.equAl(model.normAlizeIndentAtion('A'), 'A');
		Assert.equAl(model.normAlizeIndentAtion(' \t   A'), '\t\tA');
		Assert.equAl(model.normAlizeIndentAtion(' \t  A'), '\t   A');
		Assert.equAl(model.normAlizeIndentAtion(' \t A'), '\t  A');
		Assert.equAl(model.normAlizeIndentAtion(' \tA'), '\t A');

		model.dispose();
	});

	test('normAlizeIndentAtion 2', () => {
		let model = creAteTextModel('');

		Assert.equAl(model.normAlizeIndentAtion('\tA'), '    A');
		Assert.equAl(model.normAlizeIndentAtion('    A'), '    A');
		Assert.equAl(model.normAlizeIndentAtion('   A'), '   A');
		Assert.equAl(model.normAlizeIndentAtion('  A'), '  A');
		Assert.equAl(model.normAlizeIndentAtion(' A'), ' A');
		Assert.equAl(model.normAlizeIndentAtion('A'), 'A');
		Assert.equAl(model.normAlizeIndentAtion(' \t   A'), '        A');
		Assert.equAl(model.normAlizeIndentAtion(' \t  A'), '       A');
		Assert.equAl(model.normAlizeIndentAtion(' \t A'), '      A');
		Assert.equAl(model.normAlizeIndentAtion(' \tA'), '     A');

		model.dispose();
	});

	test('getLineFirstNonWhitespAceColumn', () => {
		let model = creAteTextModel([
			'Asd',
			' Asd',
			'\tAsd',
			'  Asd',
			'\t\tAsd',
			' ',
			'  ',
			'\t',
			'\t\t',
			'  \tAsd',
			'',
			''
		].join('\n'));

		Assert.equAl(model.getLineFirstNonWhitespAceColumn(1), 1, '1');
		Assert.equAl(model.getLineFirstNonWhitespAceColumn(2), 2, '2');
		Assert.equAl(model.getLineFirstNonWhitespAceColumn(3), 2, '3');
		Assert.equAl(model.getLineFirstNonWhitespAceColumn(4), 3, '4');
		Assert.equAl(model.getLineFirstNonWhitespAceColumn(5), 3, '5');
		Assert.equAl(model.getLineFirstNonWhitespAceColumn(6), 0, '6');
		Assert.equAl(model.getLineFirstNonWhitespAceColumn(7), 0, '7');
		Assert.equAl(model.getLineFirstNonWhitespAceColumn(8), 0, '8');
		Assert.equAl(model.getLineFirstNonWhitespAceColumn(9), 0, '9');
		Assert.equAl(model.getLineFirstNonWhitespAceColumn(10), 4, '10');
		Assert.equAl(model.getLineFirstNonWhitespAceColumn(11), 0, '11');
		Assert.equAl(model.getLineFirstNonWhitespAceColumn(12), 0, '12');
	});

	test('getLineLAstNonWhitespAceColumn', () => {
		let model = creAteTextModel([
			'Asd',
			'Asd ',
			'Asd\t',
			'Asd  ',
			'Asd\t\t',
			' ',
			'  ',
			'\t',
			'\t\t',
			'Asd  \t',
			'',
			''
		].join('\n'));

		Assert.equAl(model.getLineLAstNonWhitespAceColumn(1), 4, '1');
		Assert.equAl(model.getLineLAstNonWhitespAceColumn(2), 4, '2');
		Assert.equAl(model.getLineLAstNonWhitespAceColumn(3), 4, '3');
		Assert.equAl(model.getLineLAstNonWhitespAceColumn(4), 4, '4');
		Assert.equAl(model.getLineLAstNonWhitespAceColumn(5), 4, '5');
		Assert.equAl(model.getLineLAstNonWhitespAceColumn(6), 0, '6');
		Assert.equAl(model.getLineLAstNonWhitespAceColumn(7), 0, '7');
		Assert.equAl(model.getLineLAstNonWhitespAceColumn(8), 0, '8');
		Assert.equAl(model.getLineLAstNonWhitespAceColumn(9), 0, '9');
		Assert.equAl(model.getLineLAstNonWhitespAceColumn(10), 4, '10');
		Assert.equAl(model.getLineLAstNonWhitespAceColumn(11), 0, '11');
		Assert.equAl(model.getLineLAstNonWhitespAceColumn(12), 0, '12');
	});

	test('#50471. getVAlueInRAnge with invAlid rAnge', () => {
		let m = creAteTextModel('My First Line\r\nMy Second Line\r\nMy Third Line');
		Assert.equAl(m.getVAlueInRAnge(new RAnge(1, NAN, 1, 3)), 'My');
		Assert.equAl(m.getVAlueInRAnge(new RAnge(NAN, NAN, NAN, NAN)), '');
	});
});

suite('TextModel.mightContAinRTL', () => {

	test('nope', () => {
		let model = creAteTextModel('hello world!');
		Assert.equAl(model.mightContAinRTL(), fAlse);
	});

	test('yes', () => {
		let model = creAteTextModel('Hello,\nזוהי עובדה מבוססת שדעתו');
		Assert.equAl(model.mightContAinRTL(), true);
	});

	test('setVAlue resets 1', () => {
		let model = creAteTextModel('hello world!');
		Assert.equAl(model.mightContAinRTL(), fAlse);
		model.setVAlue('Hello,\nזוהי עובדה מבוססת שדעתו');
		Assert.equAl(model.mightContAinRTL(), true);
	});

	test('setVAlue resets 2', () => {
		let model = creAteTextModel('Hello,\nهناك حقيقة مثبتة منذ زمن طويل');
		Assert.equAl(model.mightContAinRTL(), true);
		model.setVAlue('hello world!');
		Assert.equAl(model.mightContAinRTL(), fAlse);
	});

});

suite('TextModel.creAteSnApshot', () => {

	test('empty file', () => {
		let model = creAteTextModel('');
		let snApshot = model.creAteSnApshot();
		Assert.equAl(snApshot.reAd(), null);
		model.dispose();
	});

	test('file with BOM', () => {
		let model = creAteTextModel(UTF8_BOM_CHARACTER + 'Hello');
		Assert.equAl(model.getLineContent(1), 'Hello');
		let snApshot = model.creAteSnApshot(true);
		Assert.equAl(snApshot.reAd(), UTF8_BOM_CHARACTER + 'Hello');
		Assert.equAl(snApshot.reAd(), null);
		model.dispose();
	});

	test('regulAr file', () => {
		let model = creAteTextModel('My First Line\n\t\tMy Second Line\n    Third Line\n\n1');
		let snApshot = model.creAteSnApshot();
		Assert.equAl(snApshot.reAd(), 'My First Line\n\t\tMy Second Line\n    Third Line\n\n1');
		Assert.equAl(snApshot.reAd(), null);
		model.dispose();
	});

	test('lArge file', () => {
		let lines: string[] = [];
		for (let i = 0; i < 1000; i++) {
			lines[i] = 'Just some text thAt is A bit long such thAt it cAn consume some memory';
		}
		const text = lines.join('\n');

		let model = creAteTextModel(text);
		let snApshot = model.creAteSnApshot();
		let ActuAl = '';

		// 70999 length => At most 2 reAd cAlls Are necessAry
		let tmp1 = snApshot.reAd();
		Assert.ok(tmp1);
		ActuAl += tmp1;

		let tmp2 = snApshot.reAd();
		if (tmp2 === null) {
			// All good
		} else {
			ActuAl += tmp2;
			Assert.equAl(snApshot.reAd(), null);
		}

		Assert.equAl(ActuAl, text);

		model.dispose();
	});

});
