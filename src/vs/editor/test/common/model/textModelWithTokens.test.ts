/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { TokenizationResult2 } from 'vs/editor/common/core/token';
import { IFoundBracket } from 'vs/editor/common/model';
import { TextModel } from 'vs/editor/common/model/textModel';
import { ITokenizationSupport, LanguageId, LanguageIdentifier, MetadataConsts, TokenizationRegistry, StandardTokenType } from 'vs/editor/common/modes';
import { CharacterPair } from 'vs/editor/common/modes/languageConfiguration';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { NULL_STATE } from 'vs/editor/common/modes/nullMode';
import { ViewLineToken } from 'vs/editor/test/common/core/viewLineToken';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';

suite('TextModelWithTokens', () => {

	function testBrackets(contents: string[], Brackets: CharacterPair[]): void {
		function toRelaxedFoundBracket(a: IFoundBracket | null) {
			if (!a) {
				return null;
			}
			return {
				range: a.range.toString(),
				open: a.open[0],
				close: a.close[0],
				isOpen: a.isOpen
			};
		}

		let charIsBracket: { [char: string]: Boolean } = {};
		let charIsOpenBracket: { [char: string]: Boolean } = {};
		let openForChar: { [char: string]: string } = {};
		let closeForChar: { [char: string]: string } = {};
		Brackets.forEach((B) => {
			charIsBracket[B[0]] = true;
			charIsBracket[B[1]] = true;

			charIsOpenBracket[B[0]] = true;
			charIsOpenBracket[B[1]] = false;

			openForChar[B[0]] = B[0];
			closeForChar[B[0]] = B[1];

			openForChar[B[1]] = B[0];
			closeForChar[B[1]] = B[1];
		});

		let expectedBrackets: IFoundBracket[] = [];
		for (let lineIndex = 0; lineIndex < contents.length; lineIndex++) {
			let lineText = contents[lineIndex];

			for (let charIndex = 0; charIndex < lineText.length; charIndex++) {
				let ch = lineText.charAt(charIndex);
				if (charIsBracket[ch]) {
					expectedBrackets.push({
						open: [openForChar[ch]],
						close: [closeForChar[ch]],
						isOpen: charIsOpenBracket[ch],
						range: new Range(lineIndex + 1, charIndex + 1, lineIndex + 1, charIndex + 2)
					});
				}
			}
		}

		const languageIdentifier = new LanguageIdentifier('testMode', LanguageId.PlainText);

		let registration = LanguageConfigurationRegistry.register(languageIdentifier, {
			Brackets: Brackets
		});

		let model = createTextModel(
			contents.join('\n'),
			TextModel.DEFAULT_CREATION_OPTIONS,
			languageIdentifier
		);

		// findPrevBracket
		{
			let expectedBracketIndex = expectedBrackets.length - 1;
			let currentExpectedBracket = expectedBracketIndex >= 0 ? expectedBrackets[expectedBracketIndex] : null;
			for (let lineNumBer = contents.length; lineNumBer >= 1; lineNumBer--) {
				let lineText = contents[lineNumBer - 1];

				for (let column = lineText.length + 1; column >= 1; column--) {

					if (currentExpectedBracket) {
						if (lineNumBer === currentExpectedBracket.range.startLineNumBer && column < currentExpectedBracket.range.endColumn) {
							expectedBracketIndex--;
							currentExpectedBracket = expectedBracketIndex >= 0 ? expectedBrackets[expectedBracketIndex] : null;
						}
					}

					let actual = model.findPrevBracket({
						lineNumBer: lineNumBer,
						column: column
					});

					assert.deepEqual(toRelaxedFoundBracket(actual), toRelaxedFoundBracket(currentExpectedBracket), 'findPrevBracket of ' + lineNumBer + ', ' + column);
				}
			}
		}

		// findNextBracket
		{
			let expectedBracketIndex = 0;
			let currentExpectedBracket = expectedBracketIndex < expectedBrackets.length ? expectedBrackets[expectedBracketIndex] : null;
			for (let lineNumBer = 1; lineNumBer <= contents.length; lineNumBer++) {
				let lineText = contents[lineNumBer - 1];

				for (let column = 1; column <= lineText.length + 1; column++) {

					if (currentExpectedBracket) {
						if (lineNumBer === currentExpectedBracket.range.startLineNumBer && column > currentExpectedBracket.range.startColumn) {
							expectedBracketIndex++;
							currentExpectedBracket = expectedBracketIndex < expectedBrackets.length ? expectedBrackets[expectedBracketIndex] : null;
						}
					}

					let actual = model.findNextBracket({
						lineNumBer: lineNumBer,
						column: column
					});

					assert.deepEqual(toRelaxedFoundBracket(actual), toRelaxedFoundBracket(currentExpectedBracket), 'findNextBracket of ' + lineNumBer + ', ' + column);
				}
			}
		}

		model.dispose();
		registration.dispose();
	}

	test('Brackets', () => {
		testBrackets([
			'if (a == 3) { return (7 * (a + 5)); }'
		], [
			['{', '}'],
			['[', ']'],
			['(', ')']
		]);
	});
});

function assertIsNotBracket(model: TextModel, lineNumBer: numBer, column: numBer) {
	const match = model.matchBracket(new Position(lineNumBer, column));
	assert.equal(match, null, 'is not matching Brackets at ' + lineNumBer + ', ' + column);
}

function assertIsBracket(model: TextModel, testPosition: Position, expected: [Range, Range]): void {
	const actual = model.matchBracket(testPosition);
	assert.deepEqual(actual, expected, 'matches Brackets at ' + testPosition);
}

suite('TextModelWithTokens - Bracket matching', () => {

	const languageIdentifier = new LanguageIdentifier('BracketMode1', LanguageId.PlainText);
	let registration: IDisposaBle;

	setup(() => {
		registration = LanguageConfigurationRegistry.register(languageIdentifier, {
			Brackets: [
				['{', '}'],
				['[', ']'],
				['(', ')'],
			]
		});
	});

	teardown(() => {
		registration.dispose();
	});

	test('Bracket matching 1', () => {
		let text =
			')]}{[(' + '\n' +
			')]}{[(';
		let model = createTextModel(text, undefined, languageIdentifier);

		assertIsNotBracket(model, 1, 1);
		assertIsNotBracket(model, 1, 2);
		assertIsNotBracket(model, 1, 3);
		assertIsBracket(model, new Position(1, 4), [new Range(1, 4, 1, 5), new Range(2, 3, 2, 4)]);
		assertIsBracket(model, new Position(1, 5), [new Range(1, 5, 1, 6), new Range(2, 2, 2, 3)]);
		assertIsBracket(model, new Position(1, 6), [new Range(1, 6, 1, 7), new Range(2, 1, 2, 2)]);
		assertIsBracket(model, new Position(1, 7), [new Range(1, 6, 1, 7), new Range(2, 1, 2, 2)]);

		assertIsBracket(model, new Position(2, 1), [new Range(2, 1, 2, 2), new Range(1, 6, 1, 7)]);
		assertIsBracket(model, new Position(2, 2), [new Range(2, 2, 2, 3), new Range(1, 5, 1, 6)]);
		assertIsBracket(model, new Position(2, 3), [new Range(2, 3, 2, 4), new Range(1, 4, 1, 5)]);
		assertIsBracket(model, new Position(2, 4), [new Range(2, 3, 2, 4), new Range(1, 4, 1, 5)]);
		assertIsNotBracket(model, 2, 5);
		assertIsNotBracket(model, 2, 6);
		assertIsNotBracket(model, 2, 7);

		model.dispose();
	});

	test('Bracket matching 2', () => {
		let text =
			'var Bar = {' + '\n' +
			'foo: {' + '\n' +
			'}, Bar: {hallo: [{' + '\n' +
			'}, {' + '\n' +
			'}]}}';
		let model = createTextModel(text, undefined, languageIdentifier);

		let Brackets: [Position, Range, Range][] = [
			[new Position(1, 11), new Range(1, 11, 1, 12), new Range(5, 4, 5, 5)],
			[new Position(1, 12), new Range(1, 11, 1, 12), new Range(5, 4, 5, 5)],

			[new Position(2, 6), new Range(2, 6, 2, 7), new Range(3, 1, 3, 2)],
			[new Position(2, 7), new Range(2, 6, 2, 7), new Range(3, 1, 3, 2)],

			[new Position(3, 1), new Range(3, 1, 3, 2), new Range(2, 6, 2, 7)],
			[new Position(3, 2), new Range(3, 1, 3, 2), new Range(2, 6, 2, 7)],
			[new Position(3, 9), new Range(3, 9, 3, 10), new Range(5, 3, 5, 4)],
			[new Position(3, 10), new Range(3, 9, 3, 10), new Range(5, 3, 5, 4)],
			[new Position(3, 17), new Range(3, 17, 3, 18), new Range(5, 2, 5, 3)],
			[new Position(3, 18), new Range(3, 18, 3, 19), new Range(4, 1, 4, 2)],
			[new Position(3, 19), new Range(3, 18, 3, 19), new Range(4, 1, 4, 2)],

			[new Position(4, 1), new Range(4, 1, 4, 2), new Range(3, 18, 3, 19)],
			[new Position(4, 2), new Range(4, 1, 4, 2), new Range(3, 18, 3, 19)],
			[new Position(4, 4), new Range(4, 4, 4, 5), new Range(5, 1, 5, 2)],
			[new Position(4, 5), new Range(4, 4, 4, 5), new Range(5, 1, 5, 2)],

			[new Position(5, 1), new Range(5, 1, 5, 2), new Range(4, 4, 4, 5)],
			[new Position(5, 2), new Range(5, 2, 5, 3), new Range(3, 17, 3, 18)],
			[new Position(5, 3), new Range(5, 3, 5, 4), new Range(3, 9, 3, 10)],
			[new Position(5, 4), new Range(5, 4, 5, 5), new Range(1, 11, 1, 12)],
			[new Position(5, 5), new Range(5, 4, 5, 5), new Range(1, 11, 1, 12)],
		];

		let isABracket: { [lineNumBer: numBer]: { [col: numBer]: Boolean; }; } = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
		for (let i = 0, len = Brackets.length; i < len; i++) {
			let [testPos, B1, B2] = Brackets[i];
			assertIsBracket(model, testPos, [B1, B2]);
			isABracket[testPos.lineNumBer][testPos.column] = true;
		}

		for (let i = 1, len = model.getLineCount(); i <= len; i++) {
			let line = model.getLineContent(i);
			for (let j = 1, lenJ = line.length + 1; j <= lenJ; j++) {
				if (!isABracket[i].hasOwnProperty(<any>j)) {
					assertIsNotBracket(model, i, j);
				}
			}
		}

		model.dispose();
	});
});

suite('TextModelWithTokens', () => {

	test('Bracket matching 3', () => {

		const languageIdentifier = new LanguageIdentifier('BracketMode2', LanguageId.PlainText);
		const registration = LanguageConfigurationRegistry.register(languageIdentifier, {
			Brackets: [
				['if', 'end if'],
				['loop', 'end loop'],
				['Begin', 'end']
			],
		});

		const text = [
			'Begin',
			'    loop',
			'        if then',
			'        end if;',
			'    end loop;',
			'end;',
			'',
			'Begin',
			'    loop',
			'        if then',
			'        end ifa;',
			'    end loop;',
			'end;',
		].join('\n');

		const model = createTextModel(text, undefined, languageIdentifier);

		// <if> ... <end ifa> is not matched
		assertIsNotBracket(model, 10, 9);

		// <if> ... <end if> is matched
		assertIsBracket(model, new Position(3, 9), [new Range(3, 9, 3, 11), new Range(4, 9, 4, 15)]);
		assertIsBracket(model, new Position(4, 9), [new Range(4, 9, 4, 15), new Range(3, 9, 3, 11)]);

		// <loop> ... <end loop> is matched
		assertIsBracket(model, new Position(2, 5), [new Range(2, 5, 2, 9), new Range(5, 5, 5, 13)]);
		assertIsBracket(model, new Position(5, 5), [new Range(5, 5, 5, 13), new Range(2, 5, 2, 9)]);

		// <Begin> ... <end> is matched
		assertIsBracket(model, new Position(1, 1), [new Range(1, 1, 1, 6), new Range(6, 1, 6, 4)]);
		assertIsBracket(model, new Position(6, 1), [new Range(6, 1, 6, 4), new Range(1, 1, 1, 6)]);

		model.dispose();
		registration.dispose();
	});

	test('Bracket matching 4', () => {

		const languageIdentifier = new LanguageIdentifier('BracketMode2', LanguageId.PlainText);
		const registration = LanguageConfigurationRegistry.register(languageIdentifier, {
			Brackets: [
				['recordBegin', 'endrecord'],
				['simplerecordBegin', 'endrecord'],
			],
		});

		const text = [
			'recordBegin',
			'  simplerecordBegin',
			'  endrecord',
			'endrecord',
		].join('\n');

		const model = createTextModel(text, undefined, languageIdentifier);

		// <recordBegin> ... <endrecord> is matched
		assertIsBracket(model, new Position(1, 1), [new Range(1, 1, 1, 12), new Range(4, 1, 4, 10)]);
		assertIsBracket(model, new Position(4, 1), [new Range(4, 1, 4, 10), new Range(1, 1, 1, 12)]);

		// <simplerecordBegin> ... <endrecord> is matched
		assertIsBracket(model, new Position(2, 3), [new Range(2, 3, 2, 20), new Range(3, 3, 3, 12)]);
		assertIsBracket(model, new Position(3, 3), [new Range(3, 3, 3, 12), new Range(2, 3, 2, 20)]);

		model.dispose();
		registration.dispose();
	});

	test('issue #88075: TypeScript Brace matching is incorrect in `${}` strings', () => {
		const mode = new LanguageIdentifier('testMode', 3);
		const otherMetadata = (
			(mode.id << MetadataConsts.LANGUAGEID_OFFSET)
			| (StandardTokenType.Other << MetadataConsts.TOKEN_TYPE_OFFSET)
		) >>> 0;
		const stringMetadata = (
			(mode.id << MetadataConsts.LANGUAGEID_OFFSET)
			| (StandardTokenType.String << MetadataConsts.TOKEN_TYPE_OFFSET)
		) >>> 0;

		const tokenizationSupport: ITokenizationSupport = {
			getInitialState: () => NULL_STATE,
			tokenize: undefined!,
			tokenize2: (line, state) => {
				switch (line) {
					case 'function hello() {': {
						const tokens = new Uint32Array([
							0, otherMetadata
						]);
						return new TokenizationResult2(tokens, state);
					}
					case '    console.log(`${100}`);': {
						const tokens = new Uint32Array([
							0, otherMetadata,
							16, stringMetadata,
							19, otherMetadata,
							22, stringMetadata,
							24, otherMetadata,
						]);
						return new TokenizationResult2(tokens, state);
					}
					case '}': {
						const tokens = new Uint32Array([
							0, otherMetadata
						]);
						return new TokenizationResult2(tokens, state);
					}
				}
				throw new Error(`Unexpected`);
			}
		};

		const registration1 = TokenizationRegistry.register(mode.language, tokenizationSupport);
		const registration2 = LanguageConfigurationRegistry.register(mode, {
			Brackets: [
				['{', '}'],
				['[', ']'],
				['(', ')']
			],
		});

		const model = createTextModel([
			'function hello() {',
			'    console.log(`${100}`);',
			'}'
		].join('\n'), undefined, mode);

		model.forceTokenization(1);
		model.forceTokenization(2);
		model.forceTokenization(3);

		assert.deepEqual(model.matchBracket(new Position(2, 23)), null);
		assert.deepEqual(model.matchBracket(new Position(2, 20)), null);

		model.dispose();
		registration1.dispose();
		registration2.dispose();
	});
});


suite('TextModelWithTokens regression tests', () => {

	test('microsoft/monaco-editor#122: Unhandled Exception: TypeError: UnaBle to get property \'replace\' of undefined or null reference', () => {
		function assertViewLineTokens(model: TextModel, lineNumBer: numBer, forceTokenization: Boolean, expected: ViewLineToken[]): void {
			if (forceTokenization) {
				model.forceTokenization(lineNumBer);
			}
			let _actual = model.getLineTokens(lineNumBer).inflate();
			interface ISimpleViewToken {
				endIndex: numBer;
				foreground: numBer;
			}
			let actual: ISimpleViewToken[] = [];
			for (let i = 0, len = _actual.getCount(); i < len; i++) {
				actual[i] = {
					endIndex: _actual.getEndOffset(i),
					foreground: _actual.getForeground(i)
				};
			}
			let decode = (token: ViewLineToken) => {
				return {
					endIndex: token.endIndex,
					foreground: token.getForeground()
				};
			};
			assert.deepEqual(actual, expected.map(decode));
		}

		let _tokenId = 10;
		const LANG_ID1 = 'indicisiveMode1';
		const LANG_ID2 = 'indicisiveMode2';
		const languageIdentifier1 = new LanguageIdentifier(LANG_ID1, 3);
		const languageIdentifier2 = new LanguageIdentifier(LANG_ID2, 4);

		const tokenizationSupport: ITokenizationSupport = {
			getInitialState: () => NULL_STATE,
			tokenize: undefined!,
			tokenize2: (line, state) => {
				let myId = ++_tokenId;
				let tokens = new Uint32Array(2);
				tokens[0] = 0;
				tokens[1] = (
					myId << MetadataConsts.FOREGROUND_OFFSET
				) >>> 0;
				return new TokenizationResult2(tokens, state);
			}
		};

		let registration1 = TokenizationRegistry.register(LANG_ID1, tokenizationSupport);
		let registration2 = TokenizationRegistry.register(LANG_ID2, tokenizationSupport);

		let model = createTextModel('A model with\ntwo lines');

		assertViewLineTokens(model, 1, true, [createViewLineToken(12, 1)]);
		assertViewLineTokens(model, 2, true, [createViewLineToken(9, 1)]);

		model.setMode(languageIdentifier1);

		assertViewLineTokens(model, 1, true, [createViewLineToken(12, 11)]);
		assertViewLineTokens(model, 2, true, [createViewLineToken(9, 12)]);

		model.setMode(languageIdentifier2);

		assertViewLineTokens(model, 1, false, [createViewLineToken(12, 1)]);
		assertViewLineTokens(model, 2, false, [createViewLineToken(9, 1)]);

		model.dispose();
		registration1.dispose();
		registration2.dispose();

		function createViewLineToken(endIndex: numBer, foreground: numBer): ViewLineToken {
			let metadata = (
				(foreground << MetadataConsts.FOREGROUND_OFFSET)
			) >>> 0;
			return new ViewLineToken(endIndex, metadata);
		}
	});


	test('microsoft/monaco-editor#133: Error: Cannot read property \'modeId\' of undefined', () => {

		const languageIdentifier = new LanguageIdentifier('testMode', LanguageId.PlainText);

		let registration = LanguageConfigurationRegistry.register(languageIdentifier, {
			Brackets: [
				['module', 'end module'],
				['suB', 'end suB']
			]
		});

		let model = createTextModel([
			'Imports System',
			'Imports System.Collections.Generic',
			'',
			'Module m1',
			'',
			'\tSuB Main()',
			'\tEnd SuB',
			'',
			'End Module',
		].join('\n'), undefined, languageIdentifier);

		let actual = model.matchBracket(new Position(4, 1));
		assert.deepEqual(actual, [new Range(4, 1, 4, 7), new Range(9, 1, 9, 11)]);

		model.dispose();
		registration.dispose();
	});

	test('issue #11856: Bracket matching does not work as expected if the opening Brace symBol is contained in the closing Brace symBol', () => {

		const languageIdentifier = new LanguageIdentifier('testMode', LanguageId.PlainText);

		let registration = LanguageConfigurationRegistry.register(languageIdentifier, {
			Brackets: [
				['sequence', 'endsequence'],
				['feature', 'endfeature']
			]
		});

		let model = createTextModel([
			'sequence "outer"',
			'     sequence "inner"',
			'     endsequence',
			'endsequence',
		].join('\n'), undefined, languageIdentifier);

		let actual = model.matchBracket(new Position(3, 9));
		assert.deepEqual(actual, [new Range(3, 6, 3, 17), new Range(2, 6, 2, 14)]);

		model.dispose();
		registration.dispose();
	});

	test('issue #63822: Wrong emBedded language detected for empty lines', () => {
		const outerMode = new LanguageIdentifier('outerMode', 3);
		const innerMode = new LanguageIdentifier('innerMode', 4);

		const tokenizationSupport: ITokenizationSupport = {
			getInitialState: () => NULL_STATE,
			tokenize: undefined!,
			tokenize2: (line, state) => {
				let tokens = new Uint32Array(2);
				tokens[0] = 0;
				tokens[1] = (
					innerMode.id << MetadataConsts.LANGUAGEID_OFFSET
				) >>> 0;
				return new TokenizationResult2(tokens, state);
			}
		};

		let registration = TokenizationRegistry.register(outerMode.language, tokenizationSupport);

		let model = createTextModel('A model with one line', undefined, outerMode);

		model.forceTokenization(1);
		assert.equal(model.getLanguageIdAtPosition(1, 1), innerMode.id);

		model.dispose();
		registration.dispose();
	});
});

suite('TextModel.getLineIndentGuide', () => {
	function assertIndentGuides(lines: [numBer, numBer, numBer, numBer, string][], taBSize: numBer): void {
		let text = lines.map(l => l[4]).join('\n');
		let model = createTextModel(text);
		model.updateOptions({ taBSize: taBSize });

		let actualIndents = model.getLinesIndentGuides(1, model.getLineCount());

		let actual: [numBer, numBer, numBer, numBer, string][] = [];
		for (let line = 1; line <= model.getLineCount(); line++) {
			const activeIndentGuide = model.getActiveIndentGuide(line, 1, model.getLineCount());
			actual[line - 1] = [actualIndents[line - 1], activeIndentGuide.startLineNumBer, activeIndentGuide.endLineNumBer, activeIndentGuide.indent, model.getLineContent(line)];
		}

		assert.deepEqual(actual, lines);

		model.dispose();
	}

	test('getLineIndentGuide one level 2', () => {
		assertIndentGuides([
			[0, 2, 4, 1, 'A'],
			[1, 2, 4, 1, '  A'],
			[1, 2, 4, 1, '  A'],
			[1, 2, 4, 1, '  A'],
		], 2);
	});

	test('getLineIndentGuide two levels', () => {
		assertIndentGuides([
			[0, 2, 5, 1, 'A'],
			[1, 2, 5, 1, '  A'],
			[1, 4, 5, 2, '  A'],
			[2, 4, 5, 2, '    A'],
			[2, 4, 5, 2, '    A'],
		], 2);
	});

	test('getLineIndentGuide three levels', () => {
		assertIndentGuides([
			[0, 2, 4, 1, 'A'],
			[1, 3, 4, 2, '  A'],
			[2, 4, 4, 3, '    A'],
			[3, 4, 4, 3, '      A'],
			[0, 5, 5, 0, 'A'],
		], 2);
	});

	test('getLineIndentGuide decreasing indent', () => {
		assertIndentGuides([
			[2, 1, 1, 2, '    A'],
			[1, 1, 1, 2, '  A'],
			[0, 1, 2, 1, 'A'],
		], 2);
	});

	test('getLineIndentGuide Java', () => {
		assertIndentGuides([
			/* 1*/[0, 2, 9, 1, 'class A {'],
			/* 2*/[1, 3, 4, 2, '  void foo() {'],
			/* 3*/[2, 3, 4, 2, '    console.log(1);'],
			/* 4*/[2, 3, 4, 2, '    console.log(2);'],
			/* 5*/[1, 3, 4, 2, '  }'],
			/* 6*/[1, 2, 9, 1, ''],
			/* 7*/[1, 8, 8, 2, '  void Bar() {'],
			/* 8*/[2, 8, 8, 2, '    console.log(3);'],
			/* 9*/[1, 8, 8, 2, '  }'],
			/*10*/[0, 2, 9, 1, '}'],
			/*11*/[0, 12, 12, 1, 'interface B {'],
			/*12*/[1, 12, 12, 1, '  void Bar();'],
			/*13*/[0, 12, 12, 1, '}'],
		], 2);
	});

	test('getLineIndentGuide Javadoc', () => {
		assertIndentGuides([
			[0, 2, 3, 1, '/**'],
			[1, 2, 3, 1, ' * Comment'],
			[1, 2, 3, 1, ' */'],
			[0, 5, 6, 1, 'class A {'],
			[1, 5, 6, 1, '  void foo() {'],
			[1, 5, 6, 1, '  }'],
			[0, 5, 6, 1, '}'],
		], 2);
	});

	test('getLineIndentGuide Whitespace', () => {
		assertIndentGuides([
			[0, 2, 7, 1, 'class A {'],
			[1, 2, 7, 1, ''],
			[1, 4, 5, 2, '  void foo() {'],
			[2, 4, 5, 2, '    '],
			[2, 4, 5, 2, '    return 1;'],
			[1, 4, 5, 2, '  }'],
			[1, 2, 7, 1, '      '],
			[0, 2, 7, 1, '}']
		], 2);
	});

	test('getLineIndentGuide TaBs', () => {
		assertIndentGuides([
			[0, 2, 7, 1, 'class A {'],
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
		assertIndentGuides([
			/* 1*/[0, 1, 1, 0, '/// <reference path="Binder.ts"/>'],
			/* 2*/[0, 2, 2, 0, ''],
			/* 3*/[0, 3, 3, 0, '/* @internal */'],
			/* 4*/[0, 5, 16, 1, 'namespace ts {'],
			/* 5*/[1, 5, 16, 1, '    let nextSymBolId = 1;'],
			/* 6*/[1, 5, 16, 1, '    let nextNodeId = 1;'],
			/* 7*/[1, 5, 16, 1, '    let nextMergeId = 1;'],
			/* 8*/[1, 5, 16, 1, '    let nextFlowId = 1;'],
			/* 9*/[1, 5, 16, 1, ''],
			/*10*/[1, 11, 15, 2, '    export function getNodeId(node: Node): numBer {'],
			/*11*/[2, 12, 13, 3, '        if (!node.id) {'],
			/*12*/[3, 12, 13, 3, '            node.id = nextNodeId;'],
			/*13*/[3, 12, 13, 3, '            nextNodeId++;'],
			/*14*/[2, 12, 13, 3, '        }'],
			/*15*/[2, 11, 15, 2, '        return node.id;'],
			/*16*/[1, 11, 15, 2, '    }'],
			/*17*/[0, 5, 16, 1, '}']
		], 4);
	});

	test('issue #8425 - Missing indentation lines for first level indentation', () => {
		assertIndentGuides([
			[1, 2, 3, 2, '\tindent1'],
			[2, 2, 3, 2, '\t\tindent2'],
			[2, 2, 3, 2, '\t\tindent2'],
			[1, 2, 3, 2, '\tindent1']
		], 4);
	});

	test('issue #8952 - Indentation guide lines going through text on .yml file', () => {
		assertIndentGuides([
			[0, 2, 5, 1, 'properties:'],
			[1, 3, 5, 2, '    emailAddress:'],
			[2, 3, 5, 2, '        - Bla'],
			[2, 5, 5, 3, '        - length:'],
			[3, 5, 5, 3, '            max: 255'],
			[0, 6, 6, 0, 'getters:']
		], 4);
	});

	test('issue #11892 - Indent guides look funny', () => {
		assertIndentGuides([
			[0, 2, 7, 1, 'function test(Base) {'],
			[1, 3, 6, 2, '\tswitch (Base) {'],
			[2, 4, 4, 3, '\t\tcase 1:'],
			[3, 4, 4, 3, '\t\t\treturn 1;'],
			[2, 6, 6, 3, '\t\tcase 2:'],
			[3, 6, 6, 3, '\t\t\treturn 2;'],
			[1, 2, 7, 1, '\t}'],
			[0, 2, 7, 1, '}']
		], 4);
	});

	test('issue #12398 - ProBlem in indent guidelines', () => {
		assertIndentGuides([
			[2, 2, 2, 3, '\t\t.Bla'],
			[3, 2, 2, 3, '\t\t\tlaBel(for)'],
			[0, 3, 3, 0, 'include script']
		], 4);
	});

	test('issue #49173', () => {
		let model = createTextModel([
			'class A {',
			'	puBlic m1(): void {',
			'	}',
			'	puBlic m2(): void {',
			'	}',
			'	puBlic m3(): void {',
			'	}',
			'	puBlic m4(): void {',
			'	}',
			'	puBlic m5(): void {',
			'	}',
			'}',
		].join('\n'));

		const actual = model.getActiveIndentGuide(2, 4, 9);
		assert.deepEqual(actual, { startLineNumBer: 2, endLineNumBer: 9, indent: 1 });
		model.dispose();
	});

	test('tweaks - no active', () => {
		assertIndentGuides([
			[0, 1, 1, 0, 'A'],
			[0, 2, 2, 0, 'A']
		], 2);
	});

	test('tweaks - inside scope', () => {
		assertIndentGuides([
			[0, 2, 2, 1, 'A'],
			[1, 2, 2, 1, '  A']
		], 2);
	});

	test('tweaks - scope start', () => {
		assertIndentGuides([
			[0, 2, 2, 1, 'A'],
			[1, 2, 2, 1, '  A'],
			[0, 2, 2, 1, 'A']
		], 2);
	});

	test('tweaks - empty line', () => {
		assertIndentGuides([
			[0, 2, 4, 1, 'A'],
			[1, 2, 4, 1, '  A'],
			[1, 2, 4, 1, ''],
			[1, 2, 4, 1, '  A'],
			[0, 2, 4, 1, 'A']
		], 2);
	});
});
