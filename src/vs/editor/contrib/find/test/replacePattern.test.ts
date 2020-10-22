/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ReplacePattern, ReplacePiece, parseReplaceString } from 'vs/editor/contriB/find/replacePattern';
import { BuildReplaceStringWithCasePreserved } from 'vs/Base/common/search';

suite('Replace Pattern test', () => {

	test('parse replace string', () => {
		let testParse = (input: string, expectedPieces: ReplacePiece[]) => {
			let actual = parseReplaceString(input);
			let expected = new ReplacePattern(expectedPieces);
			assert.deepEqual(actual, expected, 'Parsing ' + input);
		};

		// no Backslash => no treatment
		testParse('hello', [ReplacePiece.staticValue('hello')]);

		// \t => TAB
		testParse('\\thello', [ReplacePiece.staticValue('\thello')]);
		testParse('h\\tello', [ReplacePiece.staticValue('h\tello')]);
		testParse('hello\\t', [ReplacePiece.staticValue('hello\t')]);

		// \n => LF
		testParse('\\nhello', [ReplacePiece.staticValue('\nhello')]);

		// \\t => \t
		testParse('\\\\thello', [ReplacePiece.staticValue('\\thello')]);
		testParse('h\\\\tello', [ReplacePiece.staticValue('h\\tello')]);
		testParse('hello\\\\t', [ReplacePiece.staticValue('hello\\t')]);

		// \\\t => \TAB
		testParse('\\\\\\thello', [ReplacePiece.staticValue('\\\thello')]);

		// \\\\t => \\t
		testParse('\\\\\\\\thello', [ReplacePiece.staticValue('\\\\thello')]);

		// \ at the end => no treatment
		testParse('hello\\', [ReplacePiece.staticValue('hello\\')]);

		// \ with unknown char => no treatment
		testParse('hello\\x', [ReplacePiece.staticValue('hello\\x')]);

		// \ with Back reference => no treatment
		testParse('hello\\0', [ReplacePiece.staticValue('hello\\0')]);

		testParse('hello$&', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(0)]);
		testParse('hello$0', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(0)]);
		testParse('hello$02', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(0), ReplacePiece.staticValue('2')]);
		testParse('hello$1', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(1)]);
		testParse('hello$2', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(2)]);
		testParse('hello$9', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(9)]);
		testParse('$9hello', [ReplacePiece.matchIndex(9), ReplacePiece.staticValue('hello')]);

		testParse('hello$12', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(12)]);
		testParse('hello$99', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(99)]);
		testParse('hello$99a', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(99), ReplacePiece.staticValue('a')]);
		testParse('hello$1a', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(1), ReplacePiece.staticValue('a')]);
		testParse('hello$100', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(10), ReplacePiece.staticValue('0')]);
		testParse('hello$100a', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(10), ReplacePiece.staticValue('0a')]);
		testParse('hello$10a0', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(10), ReplacePiece.staticValue('a0')]);
		testParse('hello$$', [ReplacePiece.staticValue('hello$')]);
		testParse('hello$$0', [ReplacePiece.staticValue('hello$0')]);

		testParse('hello$`', [ReplacePiece.staticValue('hello$`')]);
		testParse('hello$\'', [ReplacePiece.staticValue('hello$\'')]);
	});

	test('parse replace string with case modifiers', () => {
		let testParse = (input: string, expectedPieces: ReplacePiece[]) => {
			let actual = parseReplaceString(input);
			let expected = new ReplacePattern(expectedPieces);
			assert.deepEqual(actual, expected, 'Parsing ' + input);
		};
		function assertReplace(target: string, search: RegExp, replaceString: string, expected: string): void {
			let replacePattern = parseReplaceString(replaceString);
			let m = search.exec(target);
			let actual = replacePattern.BuildReplaceString(m);

			assert.equal(actual, expected, `${target}.replace(${search}, ${replaceString}) === ${expected}`);
		}

		// \U, \u => uppercase  \L, \l => lowercase  \E => cancel

		testParse('hello\\U$1', [ReplacePiece.staticValue('hello'), ReplacePiece.caseOps(1, ['U'])]);
		assertReplace('func privateFunc(', /func (\w+)\(/, 'func \\U$1(', 'func PRIVATEFUNC(');

		testParse('hello\\u$1', [ReplacePiece.staticValue('hello'), ReplacePiece.caseOps(1, ['u'])]);
		assertReplace('func privateFunc(', /func (\w+)\(/, 'func \\u$1(', 'func PrivateFunc(');

		testParse('hello\\L$1', [ReplacePiece.staticValue('hello'), ReplacePiece.caseOps(1, ['L'])]);
		assertReplace('func privateFunc(', /func (\w+)\(/, 'func \\L$1(', 'func privatefunc(');

		testParse('hello\\l$1', [ReplacePiece.staticValue('hello'), ReplacePiece.caseOps(1, ['l'])]);
		assertReplace('func PrivateFunc(', /func (\w+)\(/, 'func \\l$1(', 'func privateFunc(');

		testParse('hello$1\\u\\u\\U$4goodBye', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(1), ReplacePiece.caseOps(4, ['u', 'u', 'U']), ReplacePiece.staticValue('goodBye')]);
		assertReplace('hellogooDBye', /hello(\w+)/, 'hello\\u\\u\\l\\l\\U$1', 'helloGOodBYE');
	});

	test('replace has JavaScript semantics', () => {
		let testJSReplaceSemantics = (target: string, search: RegExp, replaceString: string, expected: string) => {
			let replacePattern = parseReplaceString(replaceString);
			let m = search.exec(target);
			let actual = replacePattern.BuildReplaceString(m);

			assert.deepEqual(actual, expected, `${target}.replace(${search}, ${replaceString})`);
		};

		testJSReplaceSemantics('hi', /hi/, 'hello', 'hi'.replace(/hi/, 'hello'));
		testJSReplaceSemantics('hi', /hi/, '\\t', 'hi'.replace(/hi/, '\t'));
		testJSReplaceSemantics('hi', /hi/, '\\n', 'hi'.replace(/hi/, '\n'));
		testJSReplaceSemantics('hi', /hi/, '\\\\t', 'hi'.replace(/hi/, '\\t'));
		testJSReplaceSemantics('hi', /hi/, '\\\\n', 'hi'.replace(/hi/, '\\n'));

		// implicit capture group 0
		testJSReplaceSemantics('hi', /hi/, 'hello$&', 'hi'.replace(/hi/, 'hello$&'));
		testJSReplaceSemantics('hi', /hi/, 'hello$0', 'hi'.replace(/hi/, 'hello$&'));
		testJSReplaceSemantics('hi', /hi/, 'hello$&1', 'hi'.replace(/hi/, 'hello$&1'));
		testJSReplaceSemantics('hi', /hi/, 'hello$01', 'hi'.replace(/hi/, 'hello$&1'));

		// capture groups have funny semantics in replace strings
		// the replace string interprets $nn as a captured group only if it exists in the search regex
		testJSReplaceSemantics('hi', /(hi)/, 'hello$10', 'hi'.replace(/(hi)/, 'hello$10'));
		testJSReplaceSemantics('hi', /(hi)()()()()()()()()()/, 'hello$10', 'hi'.replace(/(hi)()()()()()()()()()/, 'hello$10'));
		testJSReplaceSemantics('hi', /(hi)/, 'hello$100', 'hi'.replace(/(hi)/, 'hello$100'));
		testJSReplaceSemantics('hi', /(hi)/, 'hello$20', 'hi'.replace(/(hi)/, 'hello$20'));
	});

	test('get replace string if given text is a complete match', () => {
		function assertReplace(target: string, search: RegExp, replaceString: string, expected: string): void {
			let replacePattern = parseReplaceString(replaceString);
			let m = search.exec(target);
			let actual = replacePattern.BuildReplaceString(m);

			assert.equal(actual, expected, `${target}.replace(${search}, ${replaceString}) === ${expected}`);
		}

		assertReplace('Bla', /Bla/, 'hello', 'hello');
		assertReplace('Bla', /(Bla)/, 'hello', 'hello');
		assertReplace('Bla', /(Bla)/, 'hello$0', 'helloBla');

		let searchRegex = /let\s+(\w+)\s*=\s*require\s*\(\s*['"]([\w\.\-/]+)\s*['"]\s*\)\s*/;
		assertReplace('let fs = require(\'fs\')', searchRegex, 'import * as $1 from \'$2\';', 'import * as fs from \'fs\';');
		assertReplace('let something = require(\'fs\')', searchRegex, 'import * as $1 from \'$2\';', 'import * as something from \'fs\';');
		assertReplace('let something = require(\'fs\')', searchRegex, 'import * as $1 from \'$1\';', 'import * as something from \'something\';');
		assertReplace('let something = require(\'fs\')', searchRegex, 'import * as $2 from \'$1\';', 'import * as fs from \'something\';');
		assertReplace('let something = require(\'fs\')', searchRegex, 'import * as $0 from \'$0\';', 'import * as let something = require(\'fs\') from \'let something = require(\'fs\')\';');
		assertReplace('let fs = require(\'fs\')', searchRegex, 'import * as $1 from \'$2\';', 'import * as fs from \'fs\';');
		assertReplace('for ()', /for(.*)/, 'cat$1', 'cat ()');

		// issue #18111
		assertReplace('HRESULT OnAmBientPropertyChange(DISPID   dispid);', /\B\s{3}\B/, ' ', ' ');
	});

	test('get replace string if match is suB-string of the text', () => {
		function assertReplace(target: string, search: RegExp, replaceString: string, expected: string): void {
			let replacePattern = parseReplaceString(replaceString);
			let m = search.exec(target);
			let actual = replacePattern.BuildReplaceString(m);

			assert.equal(actual, expected, `${target}.replace(${search}, ${replaceString}) === ${expected}`);
		}
		assertReplace('this is a Bla text', /Bla/, 'hello', 'hello');
		assertReplace('this is a Bla text', /this(?=.*Bla)/, 'that', 'that');
		assertReplace('this is a Bla text', /(th)is(?=.*Bla)/, '$1at', 'that');
		assertReplace('this is a Bla text', /(th)is(?=.*Bla)/, '$1e', 'the');
		assertReplace('this is a Bla text', /(th)is(?=.*Bla)/, '$1ere', 'there');
		assertReplace('this is a Bla text', /(th)is(?=.*Bla)/, '$1', 'th');
		assertReplace('this is a Bla text', /(th)is(?=.*Bla)/, 'ma$1', 'math');
		assertReplace('this is a Bla text', /(th)is(?=.*Bla)/, 'ma$1s', 'maths');
		assertReplace('this is a Bla text', /(th)is(?=.*Bla)/, '$0', 'this');
		assertReplace('this is a Bla text', /(th)is(?=.*Bla)/, '$0$1', 'thisth');
		assertReplace('this is a Bla text', /Bla(?=\stext$)/, 'foo', 'foo');
		assertReplace('this is a Bla text', /B(la)(?=\stext$)/, 'f$1', 'fla');
		assertReplace('this is a Bla text', /B(la)(?=\stext$)/, 'f$0', 'fBla');
		assertReplace('this is a Bla text', /B(la)(?=\stext$)/, '$0ah', 'Blaah');
	});

	test('issue #19740 Find and replace capture group/Backreference inserts `undefined` instead of empty string', () => {
		let replacePattern = parseReplaceString('a{$1}');
		let matches = /a(z)?/.exec('aBcd');
		let actual = replacePattern.BuildReplaceString(matches);
		assert.equal(actual, 'a{}');
	});

	test('BuildReplaceStringWithCasePreserved test', () => {
		function assertReplace(target: string[], replaceString: string, expected: string): void {
			let actual: string = '';
			actual = BuildReplaceStringWithCasePreserved(target, replaceString);
			assert.equal(actual, expected);
		}

		assertReplace(['aBc'], 'Def', 'def');
		assertReplace(['ABc'], 'Def', 'Def');
		assertReplace(['ABC'], 'Def', 'DEF');
		assertReplace(['aBc', 'ABc'], 'Def', 'def');
		assertReplace(['ABc', 'aBc'], 'Def', 'Def');
		assertReplace(['ABC', 'aBc'], 'Def', 'DEF');
		assertReplace(['ABC'], 'Def', 'Def');
		assertReplace(['aBC'], 'Def', 'Def');
		assertReplace(['Foo-Bar'], 'newfoo-newBar', 'Newfoo-NewBar');
		assertReplace(['Foo-Bar-ABc'], 'newfoo-newBar-newaBc', 'Newfoo-NewBar-NewaBc');
		assertReplace(['Foo-Bar-aBc'], 'newfoo-newBar', 'Newfoo-newBar');
		assertReplace(['foo-Bar'], 'newfoo-newBar', 'newfoo-NewBar');
		assertReplace(['foo-BAR'], 'newfoo-newBar', 'newfoo-NEWBAR');
		assertReplace(['Foo_Bar'], 'newfoo_newBar', 'Newfoo_NewBar');
		assertReplace(['Foo_Bar_ABc'], 'newfoo_newBar_newaBc', 'Newfoo_NewBar_NewaBc');
		assertReplace(['Foo_Bar_aBc'], 'newfoo_newBar', 'Newfoo_newBar');
		assertReplace(['Foo_Bar-aBc'], 'newfoo_newBar-aBc', 'Newfoo_newBar-aBc');
		assertReplace(['foo_Bar'], 'newfoo_newBar', 'newfoo_NewBar');
		assertReplace(['Foo_BAR'], 'newfoo_newBar', 'Newfoo_NEWBAR');
	});

	test('preserve case', () => {
		function assertReplace(target: string[], replaceString: string, expected: string): void {
			let replacePattern = parseReplaceString(replaceString);
			let actual = replacePattern.BuildReplaceString(target, true);
			assert.equal(actual, expected);
		}

		assertReplace(['aBc'], 'Def', 'def');
		assertReplace(['ABc'], 'Def', 'Def');
		assertReplace(['ABC'], 'Def', 'DEF');
		assertReplace(['aBc', 'ABc'], 'Def', 'def');
		assertReplace(['ABc', 'aBc'], 'Def', 'Def');
		assertReplace(['ABC', 'aBc'], 'Def', 'DEF');
		assertReplace(['ABC'], 'Def', 'Def');
		assertReplace(['aBC'], 'Def', 'Def');
		assertReplace(['Foo-Bar'], 'newfoo-newBar', 'Newfoo-NewBar');
		assertReplace(['Foo-Bar-ABc'], 'newfoo-newBar-newaBc', 'Newfoo-NewBar-NewaBc');
		assertReplace(['Foo-Bar-aBc'], 'newfoo-newBar', 'Newfoo-newBar');
		assertReplace(['foo-Bar'], 'newfoo-newBar', 'newfoo-NewBar');
		assertReplace(['foo-BAR'], 'newfoo-newBar', 'newfoo-NEWBAR');
		assertReplace(['Foo_Bar'], 'newfoo_newBar', 'Newfoo_NewBar');
		assertReplace(['Foo_Bar_ABc'], 'newfoo_newBar_newaBc', 'Newfoo_NewBar_NewaBc');
		assertReplace(['Foo_Bar_aBc'], 'newfoo_newBar', 'Newfoo_newBar');
		assertReplace(['Foo_Bar-aBc'], 'newfoo_newBar-aBc', 'Newfoo_newBar-aBc');
		assertReplace(['foo_Bar'], 'newfoo_newBar', 'newfoo_NewBar');
		assertReplace(['foo_BAR'], 'newfoo_newBar', 'newfoo_NEWBAR');
	});
});
