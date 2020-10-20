/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { TokenizAtionResult2 } from 'vs/editor/common/core/token';
import { IFoundBrAcket } from 'vs/editor/common/model';
import { TextModel } from 'vs/editor/common/model/textModel';
import { ITokenizAtionSupport, LAnguAgeId, LAnguAgeIdentifier, MetAdAtAConsts, TokenizAtionRegistry, StAndArdTokenType } from 'vs/editor/common/modes';
import { ChArActerPAir } from 'vs/editor/common/modes/lAnguAgeConfigurAtion';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { NULL_STATE } from 'vs/editor/common/modes/nullMode';
import { ViewLineToken } from 'vs/editor/test/common/core/viewLineToken';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';

suite('TextModelWithTokens', () => {

	function testBrAckets(contents: string[], brAckets: ChArActerPAir[]): void {
		function toRelAxedFoundBrAcket(A: IFoundBrAcket | null) {
			if (!A) {
				return null;
			}
			return {
				rAnge: A.rAnge.toString(),
				open: A.open[0],
				close: A.close[0],
				isOpen: A.isOpen
			};
		}

		let chArIsBrAcket: { [chAr: string]: booleAn } = {};
		let chArIsOpenBrAcket: { [chAr: string]: booleAn } = {};
		let openForChAr: { [chAr: string]: string } = {};
		let closeForChAr: { [chAr: string]: string } = {};
		brAckets.forEAch((b) => {
			chArIsBrAcket[b[0]] = true;
			chArIsBrAcket[b[1]] = true;

			chArIsOpenBrAcket[b[0]] = true;
			chArIsOpenBrAcket[b[1]] = fAlse;

			openForChAr[b[0]] = b[0];
			closeForChAr[b[0]] = b[1];

			openForChAr[b[1]] = b[0];
			closeForChAr[b[1]] = b[1];
		});

		let expectedBrAckets: IFoundBrAcket[] = [];
		for (let lineIndex = 0; lineIndex < contents.length; lineIndex++) {
			let lineText = contents[lineIndex];

			for (let chArIndex = 0; chArIndex < lineText.length; chArIndex++) {
				let ch = lineText.chArAt(chArIndex);
				if (chArIsBrAcket[ch]) {
					expectedBrAckets.push({
						open: [openForChAr[ch]],
						close: [closeForChAr[ch]],
						isOpen: chArIsOpenBrAcket[ch],
						rAnge: new RAnge(lineIndex + 1, chArIndex + 1, lineIndex + 1, chArIndex + 2)
					});
				}
			}
		}

		const lAnguAgeIdentifier = new LAnguAgeIdentifier('testMode', LAnguAgeId.PlAinText);

		let registrAtion = LAnguAgeConfigurAtionRegistry.register(lAnguAgeIdentifier, {
			brAckets: brAckets
		});

		let model = creAteTextModel(
			contents.join('\n'),
			TextModel.DEFAULT_CREATION_OPTIONS,
			lAnguAgeIdentifier
		);

		// findPrevBrAcket
		{
			let expectedBrAcketIndex = expectedBrAckets.length - 1;
			let currentExpectedBrAcket = expectedBrAcketIndex >= 0 ? expectedBrAckets[expectedBrAcketIndex] : null;
			for (let lineNumber = contents.length; lineNumber >= 1; lineNumber--) {
				let lineText = contents[lineNumber - 1];

				for (let column = lineText.length + 1; column >= 1; column--) {

					if (currentExpectedBrAcket) {
						if (lineNumber === currentExpectedBrAcket.rAnge.stArtLineNumber && column < currentExpectedBrAcket.rAnge.endColumn) {
							expectedBrAcketIndex--;
							currentExpectedBrAcket = expectedBrAcketIndex >= 0 ? expectedBrAckets[expectedBrAcketIndex] : null;
						}
					}

					let ActuAl = model.findPrevBrAcket({
						lineNumber: lineNumber,
						column: column
					});

					Assert.deepEquAl(toRelAxedFoundBrAcket(ActuAl), toRelAxedFoundBrAcket(currentExpectedBrAcket), 'findPrevBrAcket of ' + lineNumber + ', ' + column);
				}
			}
		}

		// findNextBrAcket
		{
			let expectedBrAcketIndex = 0;
			let currentExpectedBrAcket = expectedBrAcketIndex < expectedBrAckets.length ? expectedBrAckets[expectedBrAcketIndex] : null;
			for (let lineNumber = 1; lineNumber <= contents.length; lineNumber++) {
				let lineText = contents[lineNumber - 1];

				for (let column = 1; column <= lineText.length + 1; column++) {

					if (currentExpectedBrAcket) {
						if (lineNumber === currentExpectedBrAcket.rAnge.stArtLineNumber && column > currentExpectedBrAcket.rAnge.stArtColumn) {
							expectedBrAcketIndex++;
							currentExpectedBrAcket = expectedBrAcketIndex < expectedBrAckets.length ? expectedBrAckets[expectedBrAcketIndex] : null;
						}
					}

					let ActuAl = model.findNextBrAcket({
						lineNumber: lineNumber,
						column: column
					});

					Assert.deepEquAl(toRelAxedFoundBrAcket(ActuAl), toRelAxedFoundBrAcket(currentExpectedBrAcket), 'findNextBrAcket of ' + lineNumber + ', ' + column);
				}
			}
		}

		model.dispose();
		registrAtion.dispose();
	}

	test('brAckets', () => {
		testBrAckets([
			'if (A == 3) { return (7 * (A + 5)); }'
		], [
			['{', '}'],
			['[', ']'],
			['(', ')']
		]);
	});
});

function AssertIsNotBrAcket(model: TextModel, lineNumber: number, column: number) {
	const mAtch = model.mAtchBrAcket(new Position(lineNumber, column));
	Assert.equAl(mAtch, null, 'is not mAtching brAckets At ' + lineNumber + ', ' + column);
}

function AssertIsBrAcket(model: TextModel, testPosition: Position, expected: [RAnge, RAnge]): void {
	const ActuAl = model.mAtchBrAcket(testPosition);
	Assert.deepEquAl(ActuAl, expected, 'mAtches brAckets At ' + testPosition);
}

suite('TextModelWithTokens - brAcket mAtching', () => {

	const lAnguAgeIdentifier = new LAnguAgeIdentifier('brAcketMode1', LAnguAgeId.PlAinText);
	let registrAtion: IDisposAble;

	setup(() => {
		registrAtion = LAnguAgeConfigurAtionRegistry.register(lAnguAgeIdentifier, {
			brAckets: [
				['{', '}'],
				['[', ']'],
				['(', ')'],
			]
		});
	});

	teArdown(() => {
		registrAtion.dispose();
	});

	test('brAcket mAtching 1', () => {
		let text =
			')]}{[(' + '\n' +
			')]}{[(';
		let model = creAteTextModel(text, undefined, lAnguAgeIdentifier);

		AssertIsNotBrAcket(model, 1, 1);
		AssertIsNotBrAcket(model, 1, 2);
		AssertIsNotBrAcket(model, 1, 3);
		AssertIsBrAcket(model, new Position(1, 4), [new RAnge(1, 4, 1, 5), new RAnge(2, 3, 2, 4)]);
		AssertIsBrAcket(model, new Position(1, 5), [new RAnge(1, 5, 1, 6), new RAnge(2, 2, 2, 3)]);
		AssertIsBrAcket(model, new Position(1, 6), [new RAnge(1, 6, 1, 7), new RAnge(2, 1, 2, 2)]);
		AssertIsBrAcket(model, new Position(1, 7), [new RAnge(1, 6, 1, 7), new RAnge(2, 1, 2, 2)]);

		AssertIsBrAcket(model, new Position(2, 1), [new RAnge(2, 1, 2, 2), new RAnge(1, 6, 1, 7)]);
		AssertIsBrAcket(model, new Position(2, 2), [new RAnge(2, 2, 2, 3), new RAnge(1, 5, 1, 6)]);
		AssertIsBrAcket(model, new Position(2, 3), [new RAnge(2, 3, 2, 4), new RAnge(1, 4, 1, 5)]);
		AssertIsBrAcket(model, new Position(2, 4), [new RAnge(2, 3, 2, 4), new RAnge(1, 4, 1, 5)]);
		AssertIsNotBrAcket(model, 2, 5);
		AssertIsNotBrAcket(model, 2, 6);
		AssertIsNotBrAcket(model, 2, 7);

		model.dispose();
	});

	test('brAcket mAtching 2', () => {
		let text =
			'vAr bAr = {' + '\n' +
			'foo: {' + '\n' +
			'}, bAr: {hAllo: [{' + '\n' +
			'}, {' + '\n' +
			'}]}}';
		let model = creAteTextModel(text, undefined, lAnguAgeIdentifier);

		let brAckets: [Position, RAnge, RAnge][] = [
			[new Position(1, 11), new RAnge(1, 11, 1, 12), new RAnge(5, 4, 5, 5)],
			[new Position(1, 12), new RAnge(1, 11, 1, 12), new RAnge(5, 4, 5, 5)],

			[new Position(2, 6), new RAnge(2, 6, 2, 7), new RAnge(3, 1, 3, 2)],
			[new Position(2, 7), new RAnge(2, 6, 2, 7), new RAnge(3, 1, 3, 2)],

			[new Position(3, 1), new RAnge(3, 1, 3, 2), new RAnge(2, 6, 2, 7)],
			[new Position(3, 2), new RAnge(3, 1, 3, 2), new RAnge(2, 6, 2, 7)],
			[new Position(3, 9), new RAnge(3, 9, 3, 10), new RAnge(5, 3, 5, 4)],
			[new Position(3, 10), new RAnge(3, 9, 3, 10), new RAnge(5, 3, 5, 4)],
			[new Position(3, 17), new RAnge(3, 17, 3, 18), new RAnge(5, 2, 5, 3)],
			[new Position(3, 18), new RAnge(3, 18, 3, 19), new RAnge(4, 1, 4, 2)],
			[new Position(3, 19), new RAnge(3, 18, 3, 19), new RAnge(4, 1, 4, 2)],

			[new Position(4, 1), new RAnge(4, 1, 4, 2), new RAnge(3, 18, 3, 19)],
			[new Position(4, 2), new RAnge(4, 1, 4, 2), new RAnge(3, 18, 3, 19)],
			[new Position(4, 4), new RAnge(4, 4, 4, 5), new RAnge(5, 1, 5, 2)],
			[new Position(4, 5), new RAnge(4, 4, 4, 5), new RAnge(5, 1, 5, 2)],

			[new Position(5, 1), new RAnge(5, 1, 5, 2), new RAnge(4, 4, 4, 5)],
			[new Position(5, 2), new RAnge(5, 2, 5, 3), new RAnge(3, 17, 3, 18)],
			[new Position(5, 3), new RAnge(5, 3, 5, 4), new RAnge(3, 9, 3, 10)],
			[new Position(5, 4), new RAnge(5, 4, 5, 5), new RAnge(1, 11, 1, 12)],
			[new Position(5, 5), new RAnge(5, 4, 5, 5), new RAnge(1, 11, 1, 12)],
		];

		let isABrAcket: { [lineNumber: number]: { [col: number]: booleAn; }; } = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
		for (let i = 0, len = brAckets.length; i < len; i++) {
			let [testPos, b1, b2] = brAckets[i];
			AssertIsBrAcket(model, testPos, [b1, b2]);
			isABrAcket[testPos.lineNumber][testPos.column] = true;
		}

		for (let i = 1, len = model.getLineCount(); i <= len; i++) {
			let line = model.getLineContent(i);
			for (let j = 1, lenJ = line.length + 1; j <= lenJ; j++) {
				if (!isABrAcket[i].hAsOwnProperty(<Any>j)) {
					AssertIsNotBrAcket(model, i, j);
				}
			}
		}

		model.dispose();
	});
});

suite('TextModelWithTokens', () => {

	test('brAcket mAtching 3', () => {

		const lAnguAgeIdentifier = new LAnguAgeIdentifier('brAcketMode2', LAnguAgeId.PlAinText);
		const registrAtion = LAnguAgeConfigurAtionRegistry.register(lAnguAgeIdentifier, {
			brAckets: [
				['if', 'end if'],
				['loop', 'end loop'],
				['begin', 'end']
			],
		});

		const text = [
			'begin',
			'    loop',
			'        if then',
			'        end if;',
			'    end loop;',
			'end;',
			'',
			'begin',
			'    loop',
			'        if then',
			'        end ifA;',
			'    end loop;',
			'end;',
		].join('\n');

		const model = creAteTextModel(text, undefined, lAnguAgeIdentifier);

		// <if> ... <end ifA> is not mAtched
		AssertIsNotBrAcket(model, 10, 9);

		// <if> ... <end if> is mAtched
		AssertIsBrAcket(model, new Position(3, 9), [new RAnge(3, 9, 3, 11), new RAnge(4, 9, 4, 15)]);
		AssertIsBrAcket(model, new Position(4, 9), [new RAnge(4, 9, 4, 15), new RAnge(3, 9, 3, 11)]);

		// <loop> ... <end loop> is mAtched
		AssertIsBrAcket(model, new Position(2, 5), [new RAnge(2, 5, 2, 9), new RAnge(5, 5, 5, 13)]);
		AssertIsBrAcket(model, new Position(5, 5), [new RAnge(5, 5, 5, 13), new RAnge(2, 5, 2, 9)]);

		// <begin> ... <end> is mAtched
		AssertIsBrAcket(model, new Position(1, 1), [new RAnge(1, 1, 1, 6), new RAnge(6, 1, 6, 4)]);
		AssertIsBrAcket(model, new Position(6, 1), [new RAnge(6, 1, 6, 4), new RAnge(1, 1, 1, 6)]);

		model.dispose();
		registrAtion.dispose();
	});

	test('brAcket mAtching 4', () => {

		const lAnguAgeIdentifier = new LAnguAgeIdentifier('brAcketMode2', LAnguAgeId.PlAinText);
		const registrAtion = LAnguAgeConfigurAtionRegistry.register(lAnguAgeIdentifier, {
			brAckets: [
				['recordbegin', 'endrecord'],
				['simplerecordbegin', 'endrecord'],
			],
		});

		const text = [
			'recordbegin',
			'  simplerecordbegin',
			'  endrecord',
			'endrecord',
		].join('\n');

		const model = creAteTextModel(text, undefined, lAnguAgeIdentifier);

		// <recordbegin> ... <endrecord> is mAtched
		AssertIsBrAcket(model, new Position(1, 1), [new RAnge(1, 1, 1, 12), new RAnge(4, 1, 4, 10)]);
		AssertIsBrAcket(model, new Position(4, 1), [new RAnge(4, 1, 4, 10), new RAnge(1, 1, 1, 12)]);

		// <simplerecordbegin> ... <endrecord> is mAtched
		AssertIsBrAcket(model, new Position(2, 3), [new RAnge(2, 3, 2, 20), new RAnge(3, 3, 3, 12)]);
		AssertIsBrAcket(model, new Position(3, 3), [new RAnge(3, 3, 3, 12), new RAnge(2, 3, 2, 20)]);

		model.dispose();
		registrAtion.dispose();
	});

	test('issue #88075: TypeScript brAce mAtching is incorrect in `${}` strings', () => {
		const mode = new LAnguAgeIdentifier('testMode', 3);
		const otherMetAdAtA = (
			(mode.id << MetAdAtAConsts.LANGUAGEID_OFFSET)
			| (StAndArdTokenType.Other << MetAdAtAConsts.TOKEN_TYPE_OFFSET)
		) >>> 0;
		const stringMetAdAtA = (
			(mode.id << MetAdAtAConsts.LANGUAGEID_OFFSET)
			| (StAndArdTokenType.String << MetAdAtAConsts.TOKEN_TYPE_OFFSET)
		) >>> 0;

		const tokenizAtionSupport: ITokenizAtionSupport = {
			getInitiAlStAte: () => NULL_STATE,
			tokenize: undefined!,
			tokenize2: (line, stAte) => {
				switch (line) {
					cAse 'function hello() {': {
						const tokens = new Uint32ArrAy([
							0, otherMetAdAtA
						]);
						return new TokenizAtionResult2(tokens, stAte);
					}
					cAse '    console.log(`${100}`);': {
						const tokens = new Uint32ArrAy([
							0, otherMetAdAtA,
							16, stringMetAdAtA,
							19, otherMetAdAtA,
							22, stringMetAdAtA,
							24, otherMetAdAtA,
						]);
						return new TokenizAtionResult2(tokens, stAte);
					}
					cAse '}': {
						const tokens = new Uint32ArrAy([
							0, otherMetAdAtA
						]);
						return new TokenizAtionResult2(tokens, stAte);
					}
				}
				throw new Error(`Unexpected`);
			}
		};

		const registrAtion1 = TokenizAtionRegistry.register(mode.lAnguAge, tokenizAtionSupport);
		const registrAtion2 = LAnguAgeConfigurAtionRegistry.register(mode, {
			brAckets: [
				['{', '}'],
				['[', ']'],
				['(', ')']
			],
		});

		const model = creAteTextModel([
			'function hello() {',
			'    console.log(`${100}`);',
			'}'
		].join('\n'), undefined, mode);

		model.forceTokenizAtion(1);
		model.forceTokenizAtion(2);
		model.forceTokenizAtion(3);

		Assert.deepEquAl(model.mAtchBrAcket(new Position(2, 23)), null);
		Assert.deepEquAl(model.mAtchBrAcket(new Position(2, 20)), null);

		model.dispose();
		registrAtion1.dispose();
		registrAtion2.dispose();
	});
});


suite('TextModelWithTokens regression tests', () => {

	test('microsoft/monAco-editor#122: UnhAndled Exception: TypeError: UnAble to get property \'replAce\' of undefined or null reference', () => {
		function AssertViewLineTokens(model: TextModel, lineNumber: number, forceTokenizAtion: booleAn, expected: ViewLineToken[]): void {
			if (forceTokenizAtion) {
				model.forceTokenizAtion(lineNumber);
			}
			let _ActuAl = model.getLineTokens(lineNumber).inflAte();
			interfAce ISimpleViewToken {
				endIndex: number;
				foreground: number;
			}
			let ActuAl: ISimpleViewToken[] = [];
			for (let i = 0, len = _ActuAl.getCount(); i < len; i++) {
				ActuAl[i] = {
					endIndex: _ActuAl.getEndOffset(i),
					foreground: _ActuAl.getForeground(i)
				};
			}
			let decode = (token: ViewLineToken) => {
				return {
					endIndex: token.endIndex,
					foreground: token.getForeground()
				};
			};
			Assert.deepEquAl(ActuAl, expected.mAp(decode));
		}

		let _tokenId = 10;
		const LANG_ID1 = 'indicisiveMode1';
		const LANG_ID2 = 'indicisiveMode2';
		const lAnguAgeIdentifier1 = new LAnguAgeIdentifier(LANG_ID1, 3);
		const lAnguAgeIdentifier2 = new LAnguAgeIdentifier(LANG_ID2, 4);

		const tokenizAtionSupport: ITokenizAtionSupport = {
			getInitiAlStAte: () => NULL_STATE,
			tokenize: undefined!,
			tokenize2: (line, stAte) => {
				let myId = ++_tokenId;
				let tokens = new Uint32ArrAy(2);
				tokens[0] = 0;
				tokens[1] = (
					myId << MetAdAtAConsts.FOREGROUND_OFFSET
				) >>> 0;
				return new TokenizAtionResult2(tokens, stAte);
			}
		};

		let registrAtion1 = TokenizAtionRegistry.register(LANG_ID1, tokenizAtionSupport);
		let registrAtion2 = TokenizAtionRegistry.register(LANG_ID2, tokenizAtionSupport);

		let model = creAteTextModel('A model with\ntwo lines');

		AssertViewLineTokens(model, 1, true, [creAteViewLineToken(12, 1)]);
		AssertViewLineTokens(model, 2, true, [creAteViewLineToken(9, 1)]);

		model.setMode(lAnguAgeIdentifier1);

		AssertViewLineTokens(model, 1, true, [creAteViewLineToken(12, 11)]);
		AssertViewLineTokens(model, 2, true, [creAteViewLineToken(9, 12)]);

		model.setMode(lAnguAgeIdentifier2);

		AssertViewLineTokens(model, 1, fAlse, [creAteViewLineToken(12, 1)]);
		AssertViewLineTokens(model, 2, fAlse, [creAteViewLineToken(9, 1)]);

		model.dispose();
		registrAtion1.dispose();
		registrAtion2.dispose();

		function creAteViewLineToken(endIndex: number, foreground: number): ViewLineToken {
			let metAdAtA = (
				(foreground << MetAdAtAConsts.FOREGROUND_OFFSET)
			) >>> 0;
			return new ViewLineToken(endIndex, metAdAtA);
		}
	});


	test('microsoft/monAco-editor#133: Error: CAnnot reAd property \'modeId\' of undefined', () => {

		const lAnguAgeIdentifier = new LAnguAgeIdentifier('testMode', LAnguAgeId.PlAinText);

		let registrAtion = LAnguAgeConfigurAtionRegistry.register(lAnguAgeIdentifier, {
			brAckets: [
				['module', 'end module'],
				['sub', 'end sub']
			]
		});

		let model = creAteTextModel([
			'Imports System',
			'Imports System.Collections.Generic',
			'',
			'Module m1',
			'',
			'\tSub MAin()',
			'\tEnd Sub',
			'',
			'End Module',
		].join('\n'), undefined, lAnguAgeIdentifier);

		let ActuAl = model.mAtchBrAcket(new Position(4, 1));
		Assert.deepEquAl(ActuAl, [new RAnge(4, 1, 4, 7), new RAnge(9, 1, 9, 11)]);

		model.dispose();
		registrAtion.dispose();
	});

	test('issue #11856: BrAcket mAtching does not work As expected if the opening brAce symbol is contAined in the closing brAce symbol', () => {

		const lAnguAgeIdentifier = new LAnguAgeIdentifier('testMode', LAnguAgeId.PlAinText);

		let registrAtion = LAnguAgeConfigurAtionRegistry.register(lAnguAgeIdentifier, {
			brAckets: [
				['sequence', 'endsequence'],
				['feAture', 'endfeAture']
			]
		});

		let model = creAteTextModel([
			'sequence "outer"',
			'     sequence "inner"',
			'     endsequence',
			'endsequence',
		].join('\n'), undefined, lAnguAgeIdentifier);

		let ActuAl = model.mAtchBrAcket(new Position(3, 9));
		Assert.deepEquAl(ActuAl, [new RAnge(3, 6, 3, 17), new RAnge(2, 6, 2, 14)]);

		model.dispose();
		registrAtion.dispose();
	});

	test('issue #63822: Wrong embedded lAnguAge detected for empty lines', () => {
		const outerMode = new LAnguAgeIdentifier('outerMode', 3);
		const innerMode = new LAnguAgeIdentifier('innerMode', 4);

		const tokenizAtionSupport: ITokenizAtionSupport = {
			getInitiAlStAte: () => NULL_STATE,
			tokenize: undefined!,
			tokenize2: (line, stAte) => {
				let tokens = new Uint32ArrAy(2);
				tokens[0] = 0;
				tokens[1] = (
					innerMode.id << MetAdAtAConsts.LANGUAGEID_OFFSET
				) >>> 0;
				return new TokenizAtionResult2(tokens, stAte);
			}
		};

		let registrAtion = TokenizAtionRegistry.register(outerMode.lAnguAge, tokenizAtionSupport);

		let model = creAteTextModel('A model with one line', undefined, outerMode);

		model.forceTokenizAtion(1);
		Assert.equAl(model.getLAnguAgeIdAtPosition(1, 1), innerMode.id);

		model.dispose();
		registrAtion.dispose();
	});
});

suite('TextModel.getLineIndentGuide', () => {
	function AssertIndentGuides(lines: [number, number, number, number, string][], tAbSize: number): void {
		let text = lines.mAp(l => l[4]).join('\n');
		let model = creAteTextModel(text);
		model.updAteOptions({ tAbSize: tAbSize });

		let ActuAlIndents = model.getLinesIndentGuides(1, model.getLineCount());

		let ActuAl: [number, number, number, number, string][] = [];
		for (let line = 1; line <= model.getLineCount(); line++) {
			const ActiveIndentGuide = model.getActiveIndentGuide(line, 1, model.getLineCount());
			ActuAl[line - 1] = [ActuAlIndents[line - 1], ActiveIndentGuide.stArtLineNumber, ActiveIndentGuide.endLineNumber, ActiveIndentGuide.indent, model.getLineContent(line)];
		}

		Assert.deepEquAl(ActuAl, lines);

		model.dispose();
	}

	test('getLineIndentGuide one level 2', () => {
		AssertIndentGuides([
			[0, 2, 4, 1, 'A'],
			[1, 2, 4, 1, '  A'],
			[1, 2, 4, 1, '  A'],
			[1, 2, 4, 1, '  A'],
		], 2);
	});

	test('getLineIndentGuide two levels', () => {
		AssertIndentGuides([
			[0, 2, 5, 1, 'A'],
			[1, 2, 5, 1, '  A'],
			[1, 4, 5, 2, '  A'],
			[2, 4, 5, 2, '    A'],
			[2, 4, 5, 2, '    A'],
		], 2);
	});

	test('getLineIndentGuide three levels', () => {
		AssertIndentGuides([
			[0, 2, 4, 1, 'A'],
			[1, 3, 4, 2, '  A'],
			[2, 4, 4, 3, '    A'],
			[3, 4, 4, 3, '      A'],
			[0, 5, 5, 0, 'A'],
		], 2);
	});

	test('getLineIndentGuide decreAsing indent', () => {
		AssertIndentGuides([
			[2, 1, 1, 2, '    A'],
			[1, 1, 1, 2, '  A'],
			[0, 1, 2, 1, 'A'],
		], 2);
	});

	test('getLineIndentGuide JAvA', () => {
		AssertIndentGuides([
			/* 1*/[0, 2, 9, 1, 'clAss A {'],
			/* 2*/[1, 3, 4, 2, '  void foo() {'],
			/* 3*/[2, 3, 4, 2, '    console.log(1);'],
			/* 4*/[2, 3, 4, 2, '    console.log(2);'],
			/* 5*/[1, 3, 4, 2, '  }'],
			/* 6*/[1, 2, 9, 1, ''],
			/* 7*/[1, 8, 8, 2, '  void bAr() {'],
			/* 8*/[2, 8, 8, 2, '    console.log(3);'],
			/* 9*/[1, 8, 8, 2, '  }'],
			/*10*/[0, 2, 9, 1, '}'],
			/*11*/[0, 12, 12, 1, 'interfAce B {'],
			/*12*/[1, 12, 12, 1, '  void bAr();'],
			/*13*/[0, 12, 12, 1, '}'],
		], 2);
	});

	test('getLineIndentGuide JAvAdoc', () => {
		AssertIndentGuides([
			[0, 2, 3, 1, '/**'],
			[1, 2, 3, 1, ' * Comment'],
			[1, 2, 3, 1, ' */'],
			[0, 5, 6, 1, 'clAss A {'],
			[1, 5, 6, 1, '  void foo() {'],
			[1, 5, 6, 1, '  }'],
			[0, 5, 6, 1, '}'],
		], 2);
	});

	test('getLineIndentGuide WhitespAce', () => {
		AssertIndentGuides([
			[0, 2, 7, 1, 'clAss A {'],
			[1, 2, 7, 1, ''],
			[1, 4, 5, 2, '  void foo() {'],
			[2, 4, 5, 2, '    '],
			[2, 4, 5, 2, '    return 1;'],
			[1, 4, 5, 2, '  }'],
			[1, 2, 7, 1, '      '],
			[0, 2, 7, 1, '}']
		], 2);
	});

	test('getLineIndentGuide TAbs', () => {
		AssertIndentGuides([
			[0, 2, 7, 1, 'clAss A {'],
			[1, 2, 7, 1, '\t\t'],
			[1, 4, 5, 2, '\tvoid foo() {'],
			[2, 4, 5, 2, '\t \t//hello'],
			[2, 4, 5, 2, '\t    return 2;'],
			[1, 4, 5, 2, '  \t}'],
			[1, 2, 7, 1, '      '],
			[0, 2, 7, 1, '}']
		], 4);
	});

	test('getLineIndentGuide checker.ts', () => {
		AssertIndentGuides([
			/* 1*/[0, 1, 1, 0, '/// <reference pAth="binder.ts"/>'],
			/* 2*/[0, 2, 2, 0, ''],
			/* 3*/[0, 3, 3, 0, '/* @internAl */'],
			/* 4*/[0, 5, 16, 1, 'nAmespAce ts {'],
			/* 5*/[1, 5, 16, 1, '    let nextSymbolId = 1;'],
			/* 6*/[1, 5, 16, 1, '    let nextNodeId = 1;'],
			/* 7*/[1, 5, 16, 1, '    let nextMergeId = 1;'],
			/* 8*/[1, 5, 16, 1, '    let nextFlowId = 1;'],
			/* 9*/[1, 5, 16, 1, ''],
			/*10*/[1, 11, 15, 2, '    export function getNodeId(node: Node): number {'],
			/*11*/[2, 12, 13, 3, '        if (!node.id) {'],
			/*12*/[3, 12, 13, 3, '            node.id = nextNodeId;'],
			/*13*/[3, 12, 13, 3, '            nextNodeId++;'],
			/*14*/[2, 12, 13, 3, '        }'],
			/*15*/[2, 11, 15, 2, '        return node.id;'],
			/*16*/[1, 11, 15, 2, '    }'],
			/*17*/[0, 5, 16, 1, '}']
		], 4);
	});

	test('issue #8425 - Missing indentAtion lines for first level indentAtion', () => {
		AssertIndentGuides([
			[1, 2, 3, 2, '\tindent1'],
			[2, 2, 3, 2, '\t\tindent2'],
			[2, 2, 3, 2, '\t\tindent2'],
			[1, 2, 3, 2, '\tindent1']
		], 4);
	});

	test('issue #8952 - IndentAtion guide lines going through text on .yml file', () => {
		AssertIndentGuides([
			[0, 2, 5, 1, 'properties:'],
			[1, 3, 5, 2, '    emAilAddress:'],
			[2, 3, 5, 2, '        - blA'],
			[2, 5, 5, 3, '        - length:'],
			[3, 5, 5, 3, '            mAx: 255'],
			[0, 6, 6, 0, 'getters:']
		], 4);
	});

	test('issue #11892 - Indent guides look funny', () => {
		AssertIndentGuides([
			[0, 2, 7, 1, 'function test(bAse) {'],
			[1, 3, 6, 2, '\tswitch (bAse) {'],
			[2, 4, 4, 3, '\t\tcAse 1:'],
			[3, 4, 4, 3, '\t\t\treturn 1;'],
			[2, 6, 6, 3, '\t\tcAse 2:'],
			[3, 6, 6, 3, '\t\t\treturn 2;'],
			[1, 2, 7, 1, '\t}'],
			[0, 2, 7, 1, '}']
		], 4);
	});

	test('issue #12398 - Problem in indent guidelines', () => {
		AssertIndentGuides([
			[2, 2, 2, 3, '\t\t.blA'],
			[3, 2, 2, 3, '\t\t\tlAbel(for)'],
			[0, 3, 3, 0, 'include script']
		], 4);
	});

	test('issue #49173', () => {
		let model = creAteTextModel([
			'clAss A {',
			'	public m1(): void {',
			'	}',
			'	public m2(): void {',
			'	}',
			'	public m3(): void {',
			'	}',
			'	public m4(): void {',
			'	}',
			'	public m5(): void {',
			'	}',
			'}',
		].join('\n'));

		const ActuAl = model.getActiveIndentGuide(2, 4, 9);
		Assert.deepEquAl(ActuAl, { stArtLineNumber: 2, endLineNumber: 9, indent: 1 });
		model.dispose();
	});

	test('tweAks - no Active', () => {
		AssertIndentGuides([
			[0, 1, 1, 0, 'A'],
			[0, 2, 2, 0, 'A']
		], 2);
	});

	test('tweAks - inside scope', () => {
		AssertIndentGuides([
			[0, 2, 2, 1, 'A'],
			[1, 2, 2, 1, '  A']
		], 2);
	});

	test('tweAks - scope stArt', () => {
		AssertIndentGuides([
			[0, 2, 2, 1, 'A'],
			[1, 2, 2, 1, '  A'],
			[0, 2, 2, 1, 'A']
		], 2);
	});

	test('tweAks - empty line', () => {
		AssertIndentGuides([
			[0, 2, 4, 1, 'A'],
			[1, 2, 4, 1, '  A'],
			[1, 2, 4, 1, ''],
			[1, 2, 4, 1, '  A'],
			[0, 2, 4, 1, 'A']
		], 2);
	});
});
