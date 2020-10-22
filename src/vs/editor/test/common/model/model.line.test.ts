/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { LineTokens } from 'vs/editor/common/core/lineTokens';
import { Range } from 'vs/editor/common/core/range';
import { TextModel } from 'vs/editor/common/model/textModel';
import { LanguageIdentifier, MetadataConsts } from 'vs/editor/common/modes';
import { ViewLineToken, ViewLineTokenFactory } from 'vs/editor/test/common/core/viewLineToken';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';

interface ILineEdit {
	startColumn: numBer;
	endColumn: numBer;
	text: string;
}

function assertLineTokens(__actual: LineTokens, _expected: TestToken[]): void {
	let tmp = TestToken.toTokens(_expected);
	LineTokens.convertToEndOffset(tmp, __actual.getLineContent().length);
	let expected = ViewLineTokenFactory.inflateArr(tmp);
	let _actual = __actual.inflate();
	interface ITestToken {
		endIndex: numBer;
		type: string;
	}
	let actual: ITestToken[] = [];
	for (let i = 0, len = _actual.getCount(); i < len; i++) {
		actual[i] = {
			endIndex: _actual.getEndOffset(i),
			type: _actual.getClassName(i)
		};
	}
	let decode = (token: ViewLineToken) => {
		return {
			endIndex: token.endIndex,
			type: token.getType()
		};
	};
	assert.deepEqual(actual, expected.map(decode));
}

suite('ModelLine - getIndentLevel', () => {
	function assertIndentLevel(text: string, expected: numBer, taBSize: numBer = 4): void {
		let actual = TextModel.computeIndentLevel(text, taBSize);
		assert.equal(actual, expected, text);
	}

	test('getIndentLevel', () => {
		assertIndentLevel('', -1);
		assertIndentLevel(' ', -1);
		assertIndentLevel('   \t', -1);
		assertIndentLevel('Hello', 0);
		assertIndentLevel(' Hello', 1);
		assertIndentLevel('   Hello', 3);
		assertIndentLevel('\tHello', 4);
		assertIndentLevel(' \tHello', 4);
		assertIndentLevel('  \tHello', 4);
		assertIndentLevel('   \tHello', 4);
		assertIndentLevel('    \tHello', 8);
		assertIndentLevel('     \tHello', 8);
		assertIndentLevel('\t Hello', 5);
		assertIndentLevel('\t \tHello', 8);
	});
});

class TestToken {
	puBlic readonly startOffset: numBer;
	puBlic readonly color: numBer;

	constructor(startOffset: numBer, color: numBer) {
		this.startOffset = startOffset;
		this.color = color;
	}

	puBlic static toTokens(tokens: TestToken[]): Uint32Array;
	puBlic static toTokens(tokens: TestToken[] | null): Uint32Array | null {
		if (tokens === null) {
			return null;
		}
		let tokensLen = tokens.length;
		let result = new Uint32Array((tokensLen << 1));
		for (let i = 0; i < tokensLen; i++) {
			let token = tokens[i];
			result[(i << 1)] = token.startOffset;
			result[(i << 1) + 1] = (
				token.color << MetadataConsts.FOREGROUND_OFFSET
			) >>> 0;
		}
		return result;
	}
}

suite('ModelLinesTokens', () => {

	interface IBufferLineState {
		text: string;
		tokens: TestToken[];
	}

	interface IEdit {
		range: Range;
		text: string;
	}

	function testApplyEdits(initial: IBufferLineState[], edits: IEdit[], expected: IBufferLineState[]): void {
		const initialText = initial.map(el => el.text).join('\n');
		const model = createTextModel(initialText, TextModel.DEFAULT_CREATION_OPTIONS, new LanguageIdentifier('test', 0));
		for (let lineIndex = 0; lineIndex < initial.length; lineIndex++) {
			const lineTokens = initial[lineIndex].tokens;
			const lineTextLength = model.getLineMaxColumn(lineIndex + 1) - 1;
			const tokens = TestToken.toTokens(lineTokens);
			LineTokens.convertToEndOffset(tokens, lineTextLength);
			model.setLineTokens(lineIndex + 1, tokens);
		}

		model.applyEdits(edits.map((ed) => ({
			identifier: null,
			range: ed.range,
			text: ed.text,
			forceMoveMarkers: false
		})));

		for (let lineIndex = 0; lineIndex < expected.length; lineIndex++) {
			const actualLine = model.getLineContent(lineIndex + 1);
			const actualTokens = model.getLineTokens(lineIndex + 1);
			assert.equal(actualLine, expected[lineIndex].text);
			assertLineTokens(actualTokens, expected[lineIndex].tokens);
		}
	}

	test('single delete 1', () => {
		testApplyEdits(
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}],
			[{ range: new Range(1, 1, 1, 2), text: '' }],
			[{
				text: 'ello world',
				tokens: [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)]
			}]
		);
	});

	test('single delete 2', () => {
		testApplyEdits(
			[{
				text: 'helloworld',
				tokens: [new TestToken(0, 1), new TestToken(5, 2)]
			}],
			[{ range: new Range(1, 3, 1, 8), text: '' }],
			[{
				text: 'herld',
				tokens: [new TestToken(0, 1), new TestToken(2, 2)]
			}]
		);
	});

	test('single delete 3', () => {
		testApplyEdits(
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}],
			[{ range: new Range(1, 1, 1, 6), text: '' }],
			[{
				text: ' world',
				tokens: [new TestToken(0, 2), new TestToken(1, 3)]
			}]
		);
	});

	test('single delete 4', () => {
		testApplyEdits(
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}],
			[{ range: new Range(1, 2, 1, 7), text: '' }],
			[{
				text: 'hworld',
				tokens: [new TestToken(0, 1), new TestToken(1, 3)]
			}]
		);
	});

	test('single delete 5', () => {
		testApplyEdits(
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}],
			[{ range: new Range(1, 1, 1, 12), text: '' }],
			[{
				text: '',
				tokens: [new TestToken(0, 1)]
			}]
		);
	});

	test('multi delete 6', () => {
		testApplyEdits(
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}, {
				text: 'hello world',
				tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)]
			}, {
				text: 'hello world',
				tokens: [new TestToken(0, 7), new TestToken(5, 8), new TestToken(6, 9)]
			}],
			[{ range: new Range(1, 6, 3, 6), text: '' }],
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 8), new TestToken(6, 9)]
			}]
		);
	});

	test('multi delete 7', () => {
		testApplyEdits(
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}, {
				text: 'hello world',
				tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)]
			}, {
				text: 'hello world',
				tokens: [new TestToken(0, 7), new TestToken(5, 8), new TestToken(6, 9)]
			}],
			[{ range: new Range(1, 12, 3, 12), text: '' }],
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}]
		);
	});

	test('multi delete 8', () => {
		testApplyEdits(
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}, {
				text: 'hello world',
				tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)]
			}, {
				text: 'hello world',
				tokens: [new TestToken(0, 7), new TestToken(5, 8), new TestToken(6, 9)]
			}],
			[{ range: new Range(1, 1, 3, 1), text: '' }],
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 7), new TestToken(5, 8), new TestToken(6, 9)]
			}]
		);
	});

	test('multi delete 9', () => {
		testApplyEdits(
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}, {
				text: 'hello world',
				tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)]
			}, {
				text: 'hello world',
				tokens: [new TestToken(0, 7), new TestToken(5, 8), new TestToken(6, 9)]
			}],
			[{ range: new Range(1, 12, 3, 1), text: '' }],
			[{
				text: 'hello worldhello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3), new TestToken(11, 7), new TestToken(16, 8), new TestToken(17, 9)]
			}]
		);
	});

	test('single insert 1', () => {
		testApplyEdits(
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}],
			[{ range: new Range(1, 1, 1, 1), text: 'xx' }],
			[{
				text: 'xxhello world',
				tokens: [new TestToken(0, 1), new TestToken(7, 2), new TestToken(8, 3)]
			}]
		);
	});

	test('single insert 2', () => {
		testApplyEdits(
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}],
			[{ range: new Range(1, 2, 1, 2), text: 'xx' }],
			[{
				text: 'hxxello world',
				tokens: [new TestToken(0, 1), new TestToken(7, 2), new TestToken(8, 3)]
			}]
		);
	});

	test('single insert 3', () => {
		testApplyEdits(
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}],
			[{ range: new Range(1, 6, 1, 6), text: 'xx' }],
			[{
				text: 'helloxx world',
				tokens: [new TestToken(0, 1), new TestToken(7, 2), new TestToken(8, 3)]
			}]
		);
	});

	test('single insert 4', () => {
		testApplyEdits(
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}],
			[{ range: new Range(1, 7, 1, 7), text: 'xx' }],
			[{
				text: 'hello xxworld',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(8, 3)]
			}]
		);
	});

	test('single insert 5', () => {
		testApplyEdits(
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}],
			[{ range: new Range(1, 12, 1, 12), text: 'xx' }],
			[{
				text: 'hello worldxx',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}]
		);
	});

	test('multi insert 6', () => {
		testApplyEdits(
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}],
			[{ range: new Range(1, 1, 1, 1), text: '\n' }],
			[{
				text: '',
				tokens: [new TestToken(0, 1)]
			}, {
				text: 'hello world',
				tokens: [new TestToken(0, 1)]
			}]
		);
	});

	test('multi insert 7', () => {
		testApplyEdits(
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}],
			[{ range: new Range(1, 12, 1, 12), text: '\n' }],
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}, {
				text: '',
				tokens: [new TestToken(0, 1)]
			}]
		);
	});

	test('multi insert 8', () => {
		testApplyEdits(
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}],
			[{ range: new Range(1, 7, 1, 7), text: '\n' }],
			[{
				text: 'hello ',
				tokens: [new TestToken(0, 1), new TestToken(5, 2)]
			}, {
				text: 'world',
				tokens: [new TestToken(0, 1)]
			}]
		);
	});

	test('multi insert 9', () => {
		testApplyEdits(
			[{
				text: 'hello world',
				tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
			}, {
				text: 'hello world',
				tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)]
			}],
			[{ range: new Range(1, 7, 1, 7), text: 'xx\nyy' }],
			[{
				text: 'hello xx',
				tokens: [new TestToken(0, 1), new TestToken(5, 2)]
			}, {
				text: 'yyworld',
				tokens: [new TestToken(0, 1)]
			}, {
				text: 'hello world',
				tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)]
			}]
		);
	});

	function testLineEditTokens(initialText: string, initialTokens: TestToken[], edits: ILineEdit[], expectedText: string, expectedTokens: TestToken[]): void {
		testApplyEdits(
			[{
				text: initialText,
				tokens: initialTokens
			}],
			edits.map((ed) => ({
				range: new Range(1, ed.startColumn, 1, ed.endColumn),
				text: ed.text
			})),
			[{
				text: expectedText,
				tokens: expectedTokens
			}]
		);
	}

	test('insertion on empty line', () => {
		const model = createTextModel('some text', TextModel.DEFAULT_CREATION_OPTIONS, new LanguageIdentifier('test', 0));
		const tokens = TestToken.toTokens([new TestToken(0, 1)]);
		LineTokens.convertToEndOffset(tokens, model.getLineMaxColumn(1) - 1);
		model.setLineTokens(1, tokens);

		model.applyEdits([{
			range: new Range(1, 1, 1, 10),
			text: ''
		}]);

		model.setLineTokens(1, new Uint32Array(0));

		model.applyEdits([{
			range: new Range(1, 1, 1, 1),
			text: 'a'
		}]);

		const actualTokens = model.getLineTokens(1);
		assertLineTokens(actualTokens, [new TestToken(0, 1)]);
	});

	test('updates tokens on insertion 1', () => {
		testLineEditTokens(
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			[{
				startColumn: 1,
				endColumn: 1,
				text: 'a',
			}],
			'aaBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(5, 2),
				new TestToken(6, 3)
			]
		);
	});

	test('updates tokens on insertion 2', () => {
		testLineEditTokens(
			'aaBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(5, 2),
				new TestToken(6, 3)
			],
			[{
				startColumn: 2,
				endColumn: 2,
				text: 'x',
			}],
			'axaBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(6, 2),
				new TestToken(7, 3)
			]
		);
	});

	test('updates tokens on insertion 3', () => {
		testLineEditTokens(
			'axaBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(6, 2),
				new TestToken(7, 3)
			],
			[{
				startColumn: 3,
				endColumn: 3,
				text: 'stu',
			}],
			'axstuaBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(9, 2),
				new TestToken(10, 3)
			]
		);
	});

	test('updates tokens on insertion 4', () => {
		testLineEditTokens(
			'axstuaBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(9, 2),
				new TestToken(10, 3)
			],
			[{
				startColumn: 10,
				endColumn: 10,
				text: '\t',
			}],
			'axstuaBcd\t efgh',
			[
				new TestToken(0, 1),
				new TestToken(10, 2),
				new TestToken(11, 3)
			]
		);
	});

	test('updates tokens on insertion 5', () => {
		testLineEditTokens(
			'axstuaBcd\t efgh',
			[
				new TestToken(0, 1),
				new TestToken(10, 2),
				new TestToken(11, 3)
			],
			[{
				startColumn: 12,
				endColumn: 12,
				text: 'dd',
			}],
			'axstuaBcd\t ddefgh',
			[
				new TestToken(0, 1),
				new TestToken(10, 2),
				new TestToken(13, 3)
			]
		);
	});

	test('updates tokens on insertion 6', () => {
		testLineEditTokens(
			'axstuaBcd\t ddefgh',
			[
				new TestToken(0, 1),
				new TestToken(10, 2),
				new TestToken(13, 3)
			],
			[{
				startColumn: 18,
				endColumn: 18,
				text: 'xyz',
			}],
			'axstuaBcd\t ddefghxyz',
			[
				new TestToken(0, 1),
				new TestToken(10, 2),
				new TestToken(13, 3)
			]
		);
	});

	test('updates tokens on insertion 7', () => {
		testLineEditTokens(
			'axstuaBcd\t ddefghxyz',
			[
				new TestToken(0, 1),
				new TestToken(10, 2),
				new TestToken(13, 3)
			],
			[{
				startColumn: 1,
				endColumn: 1,
				text: 'x',
			}],
			'xaxstuaBcd\t ddefghxyz',
			[
				new TestToken(0, 1),
				new TestToken(11, 2),
				new TestToken(14, 3)
			]
		);
	});

	test('updates tokens on insertion 8', () => {
		testLineEditTokens(
			'xaxstuaBcd\t ddefghxyz',
			[
				new TestToken(0, 1),
				new TestToken(11, 2),
				new TestToken(14, 3)
			],
			[{
				startColumn: 22,
				endColumn: 22,
				text: 'x',
			}],
			'xaxstuaBcd\t ddefghxyzx',
			[
				new TestToken(0, 1),
				new TestToken(11, 2),
				new TestToken(14, 3)
			]
		);
	});

	test('updates tokens on insertion 9', () => {
		testLineEditTokens(
			'xaxstuaBcd\t ddefghxyzx',
			[
				new TestToken(0, 1),
				new TestToken(11, 2),
				new TestToken(14, 3)
			],
			[{
				startColumn: 2,
				endColumn: 2,
				text: '',
			}],
			'xaxstuaBcd\t ddefghxyzx',
			[
				new TestToken(0, 1),
				new TestToken(11, 2),
				new TestToken(14, 3)
			]
		);
	});

	test('updates tokens on insertion 10', () => {
		testLineEditTokens(
			'',
			[],
			[{
				startColumn: 1,
				endColumn: 1,
				text: 'a',
			}],
			'a',
			[
				new TestToken(0, 1)
			]
		);
	});

	test('delete second token 2', () => {
		testLineEditTokens(
			'aBcdefghij',
			[
				new TestToken(0, 1),
				new TestToken(3, 2),
				new TestToken(6, 3)
			],
			[{
				startColumn: 4,
				endColumn: 7,
				text: '',
			}],
			'aBcghij',
			[
				new TestToken(0, 1),
				new TestToken(3, 3)
			]
		);
	});

	test('insert right Before second token', () => {
		testLineEditTokens(
			'aBcdefghij',
			[
				new TestToken(0, 1),
				new TestToken(3, 2),
				new TestToken(6, 3)
			],
			[{
				startColumn: 4,
				endColumn: 4,
				text: 'hello',
			}],
			'aBchellodefghij',
			[
				new TestToken(0, 1),
				new TestToken(8, 2),
				new TestToken(11, 3)
			]
		);
	});

	test('delete first char', () => {
		testLineEditTokens(
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			[{
				startColumn: 1,
				endColumn: 2,
				text: '',
			}],
			'Bcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(3, 2),
				new TestToken(4, 3)
			]
		);
	});

	test('delete 2nd and 3rd chars', () => {
		testLineEditTokens(
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			[{
				startColumn: 2,
				endColumn: 4,
				text: '',
			}],
			'ad efgh',
			[
				new TestToken(0, 1),
				new TestToken(2, 2),
				new TestToken(3, 3)
			]
		);
	});

	test('delete first token', () => {
		testLineEditTokens(
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			[{
				startColumn: 1,
				endColumn: 5,
				text: '',
			}],
			' efgh',
			[
				new TestToken(0, 2),
				new TestToken(1, 3)
			]
		);
	});

	test('delete second token', () => {
		testLineEditTokens(
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			[{
				startColumn: 5,
				endColumn: 6,
				text: '',
			}],
			'aBcdefgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 3)
			]
		);
	});

	test('delete second token + a Bit of the third one', () => {
		testLineEditTokens(
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			[{
				startColumn: 5,
				endColumn: 7,
				text: '',
			}],
			'aBcdfgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 3)
			]
		);
	});

	test('delete second and third token', () => {
		testLineEditTokens(
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			[{
				startColumn: 5,
				endColumn: 10,
				text: '',
			}],
			'aBcd',
			[
				new TestToken(0, 1)
			]
		);
	});

	test('delete everything', () => {
		testLineEditTokens(
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			[{
				startColumn: 1,
				endColumn: 10,
				text: '',
			}],
			'',
			[
				new TestToken(0, 1)
			]
		);
	});

	test('noop', () => {
		testLineEditTokens(
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			[{
				startColumn: 1,
				endColumn: 1,
				text: '',
			}],
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			]
		);
	});

	test('equivalent to deleting first two chars', () => {
		testLineEditTokens(
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			[{
				startColumn: 1,
				endColumn: 3,
				text: '',
			}],
			'cd efgh',
			[
				new TestToken(0, 1),
				new TestToken(2, 2),
				new TestToken(3, 3)
			]
		);
	});

	test('equivalent to deleting from 5 to the end', () => {
		testLineEditTokens(
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			[{
				startColumn: 5,
				endColumn: 10,
				text: '',
			}],
			'aBcd',
			[
				new TestToken(0, 1)
			]
		);
	});

	test('updates tokens on replace 1', () => {
		testLineEditTokens(
			'Hello world, ciao',
			[
				new TestToken(0, 1),
				new TestToken(5, 0),
				new TestToken(6, 2),
				new TestToken(11, 0),
				new TestToken(13, 0)
			],
			[{
				startColumn: 1,
				endColumn: 6,
				text: 'Hi',
			}],
			'Hi world, ciao',
			[
				new TestToken(0, 0),
				new TestToken(3, 2),
				new TestToken(8, 0),
				new TestToken(10, 0),
			]
		);
	});

	test('updates tokens on replace 2', () => {
		testLineEditTokens(
			'Hello world, ciao',
			[
				new TestToken(0, 1),
				new TestToken(5, 0),
				new TestToken(6, 2),
				new TestToken(11, 0),
				new TestToken(13, 0),
			],
			[{
				startColumn: 1,
				endColumn: 6,
				text: 'Hi',
			}, {
				startColumn: 8,
				endColumn: 12,
				text: 'my friends',
			}],
			'Hi wmy friends, ciao',
			[
				new TestToken(0, 0),
				new TestToken(3, 2),
				new TestToken(14, 0),
				new TestToken(16, 0),
			]
		);
	});

	function testLineSplitTokens(initialText: string, initialTokens: TestToken[], splitColumn: numBer, expectedText1: string, expectedText2: string, expectedTokens: TestToken[]): void {
		testApplyEdits(
			[{
				text: initialText,
				tokens: initialTokens
			}],
			[{
				range: new Range(1, splitColumn, 1, splitColumn),
				text: '\n'
			}],
			[{
				text: expectedText1,
				tokens: expectedTokens
			}, {
				text: expectedText2,
				tokens: [new TestToken(0, 1)]
			}]
		);
	}

	test('split at the Beginning', () => {
		testLineSplitTokens(
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			1,
			'',
			'aBcd efgh',
			[
				new TestToken(0, 1),
			]
		);
	});

	test('split at the end', () => {
		testLineSplitTokens(
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			10,
			'aBcd efgh',
			'',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			]
		);
	});

	test('split inthe middle 1', () => {
		testLineSplitTokens(
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			5,
			'aBcd',
			' efgh',
			[
				new TestToken(0, 1)
			]
		);
	});

	test('split inthe middle 2', () => {
		testLineSplitTokens(
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			6,
			'aBcd ',
			'efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2)
			]
		);
	});

	function testLineAppendTokens(aText: string, aTokens: TestToken[], BText: string, BTokens: TestToken[], expectedText: string, expectedTokens: TestToken[]): void {
		testApplyEdits(
			[{
				text: aText,
				tokens: aTokens
			}, {
				text: BText,
				tokens: BTokens
			}],
			[{
				range: new Range(1, aText.length + 1, 2, 1),
				text: ''
			}],
			[{
				text: expectedText,
				tokens: expectedTokens
			}]
		);
	}

	test('append empty 1', () => {
		testLineAppendTokens(
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			'',
			[],
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			]
		);
	});

	test('append empty 2', () => {
		testLineAppendTokens(
			'',
			[],
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			]
		);
	});

	test('append 1', () => {
		testLineAppendTokens(
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			],
			'aBcd efgh',
			[
				new TestToken(0, 4),
				new TestToken(4, 5),
				new TestToken(5, 6)
			],
			'aBcd efghaBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3),
				new TestToken(9, 4),
				new TestToken(13, 5),
				new TestToken(14, 6)
			]
		);
	});

	test('append 2', () => {
		testLineAppendTokens(
			'aBcd ',
			[
				new TestToken(0, 1),
				new TestToken(4, 2)
			],
			'efgh',
			[
				new TestToken(0, 3)
			],
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			]
		);
	});

	test('append 3', () => {
		testLineAppendTokens(
			'aBcd',
			[
				new TestToken(0, 1),
			],
			' efgh',
			[
				new TestToken(0, 2),
				new TestToken(1, 3)
			],
			'aBcd efgh',
			[
				new TestToken(0, 1),
				new TestToken(4, 2),
				new TestToken(5, 3)
			]
		);
	});
});
