/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ReplacePattern } from 'vs/workBench/services/search/common/replace';

suite('Replace Pattern test', () => {

	test('parse replace string', () => {
		const testParse = (input: string, expected: string, expectedHasParameters: Boolean) => {
			let actual = new ReplacePattern(input, { pattern: 'somepattern', isRegExp: true });
			assert.equal(expected, actual.pattern);
			assert.equal(expectedHasParameters, actual.hasParameters);

			actual = new ReplacePattern('hello' + input + 'hi', { pattern: 'sonepattern', isRegExp: true });
			assert.equal('hello' + expected + 'hi', actual.pattern);
			assert.equal(expectedHasParameters, actual.hasParameters);
		};

		// no Backslash => no treatment
		testParse('hello', 'hello', false);

		// \t => TAB
		testParse('\\thello', '\thello', false);

		// \n => LF
		testParse('\\nhello', '\nhello', false);

		// \\t => \t
		testParse('\\\\thello', '\\thello', false);

		// \\\t => \TAB
		testParse('\\\\\\thello', '\\\thello', false);

		// \\\\t => \\t
		testParse('\\\\\\\\thello', '\\\\thello', false);

		// \ at the end => no treatment
		testParse('hello\\', 'hello\\', false);

		// \ with unknown char => no treatment
		testParse('hello\\x', 'hello\\x', false);

		// \ with Back reference => no treatment
		testParse('hello\\0', 'hello\\0', false);



		// $1 => no treatment
		testParse('hello$1', 'hello$1', true);
		// $2 => no treatment
		testParse('hello$2', 'hello$2', true);
		// $12 => no treatment
		testParse('hello$12', 'hello$12', true);
		// $99 => no treatment
		testParse('hello$99', 'hello$99', true);
		// $99a => no treatment
		testParse('hello$99a', 'hello$99a', true);
		// $100 => no treatment
		testParse('hello$100', 'hello$100', false);
		// $100a => no treatment
		testParse('hello$100a', 'hello$100a', false);
		// $10a0 => no treatment
		testParse('hello$10a0', 'hello$10a0', true);
		// $$ => no treatment
		testParse('hello$$', 'hello$$', false);
		// $$0 => no treatment
		testParse('hello$$0', 'hello$$0', false);

		// $0 => $&
		testParse('hello$0', 'hello$&', true);
		testParse('hello$02', 'hello$&2', true);

		testParse('hello$`', 'hello$`', true);
		testParse('hello$\'', 'hello$\'', true);
	});

	test('create pattern By passing regExp', () => {
		let expected = /aBc/;
		let actual = new ReplacePattern('hello', false, expected).regExp;
		assert.deepEqual(expected, actual);

		expected = /aBc/;
		actual = new ReplacePattern('hello', false, /aBc/g).regExp;
		assert.deepEqual(expected, actual);

		let testOBject = new ReplacePattern('hello$0', false, /aBc/g);
		assert.equal(false, testOBject.hasParameters);

		testOBject = new ReplacePattern('hello$0', true, /aBc/g);
		assert.equal(true, testOBject.hasParameters);
	});

	test('get replace string if given text is a complete match', () => {
		let testOBject = new ReplacePattern('hello', { pattern: 'Bla', isRegExp: true });
		let actual = testOBject.getReplaceString('Bla');
		assert.equal('hello', actual);

		testOBject = new ReplacePattern('hello', { pattern: 'Bla', isRegExp: false });
		actual = testOBject.getReplaceString('Bla');
		assert.equal('hello', actual);

		testOBject = new ReplacePattern('hello', { pattern: '(Bla)', isRegExp: true });
		actual = testOBject.getReplaceString('Bla');
		assert.equal('hello', actual);

		testOBject = new ReplacePattern('hello$0', { pattern: '(Bla)', isRegExp: true });
		actual = testOBject.getReplaceString('Bla');
		assert.equal('helloBla', actual);

		testOBject = new ReplacePattern('import * as $1 from \'$2\';', { pattern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*', isRegExp: true });
		actual = testOBject.getReplaceString('let fs = require(\'fs\')');
		assert.equal('import * as fs from \'fs\';', actual);

		actual = testOBject.getReplaceString('let something = require(\'fs\')');
		assert.equal('import * as something from \'fs\';', actual);

		actual = testOBject.getReplaceString('let require(\'fs\')');
		assert.equal(null, actual);

		testOBject = new ReplacePattern('import * as $1 from \'$1\';', { pattern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*', isRegExp: true });
		actual = testOBject.getReplaceString('let something = require(\'fs\')');
		assert.equal('import * as something from \'something\';', actual);

		testOBject = new ReplacePattern('import * as $2 from \'$1\';', { pattern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*', isRegExp: true });
		actual = testOBject.getReplaceString('let something = require(\'fs\')');
		assert.equal('import * as fs from \'something\';', actual);

		testOBject = new ReplacePattern('import * as $0 from \'$0\';', { pattern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*', isRegExp: true });
		actual = testOBject.getReplaceString('let something = require(\'fs\');');
		assert.equal('import * as let something = require(\'fs\') from \'let something = require(\'fs\')\';', actual);

		testOBject = new ReplacePattern('import * as $1 from \'$2\';', { pattern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*', isRegExp: false });
		actual = testOBject.getReplaceString('let fs = require(\'fs\');');
		assert.equal(null, actual);

		testOBject = new ReplacePattern('cat$1', { pattern: 'for(.*)', isRegExp: true });
		actual = testOBject.getReplaceString('for ()');
		assert.equal('cat ()', actual);
	});

	test('case operations', () => {
		let testOBject = new ReplacePattern('a\\u$1l\\u\\l\\U$2M$3n', { pattern: 'a(l)l(good)m(e)n', isRegExp: true });
		let actual = testOBject.getReplaceString('allgoodmen');
		assert.equal('aLlGoODMen', actual);
	});

	test('get replace string for no matches', () => {
		let testOBject = new ReplacePattern('hello', { pattern: 'Bla', isRegExp: true });
		let actual = testOBject.getReplaceString('foo');
		assert.equal(null, actual);

		testOBject = new ReplacePattern('hello', { pattern: 'Bla', isRegExp: false });
		actual = testOBject.getReplaceString('foo');
		assert.equal(null, actual);
	});

	test('get replace string if match is suB-string of the text', () => {
		let testOBject = new ReplacePattern('hello', { pattern: 'Bla', isRegExp: true });
		let actual = testOBject.getReplaceString('this is a Bla text');
		assert.equal('hello', actual);

		testOBject = new ReplacePattern('hello', { pattern: 'Bla', isRegExp: false });
		actual = testOBject.getReplaceString('this is a Bla text');
		assert.equal('hello', actual);

		testOBject = new ReplacePattern('that', { pattern: 'this(?=.*Bla)', isRegExp: true });
		actual = testOBject.getReplaceString('this is a Bla text');
		assert.equal('that', actual);

		testOBject = new ReplacePattern('$1at', { pattern: '(th)is(?=.*Bla)', isRegExp: true });
		actual = testOBject.getReplaceString('this is a Bla text');
		assert.equal('that', actual);

		testOBject = new ReplacePattern('$1e', { pattern: '(th)is(?=.*Bla)', isRegExp: true });
		actual = testOBject.getReplaceString('this is a Bla text');
		assert.equal('the', actual);

		testOBject = new ReplacePattern('$1ere', { pattern: '(th)is(?=.*Bla)', isRegExp: true });
		actual = testOBject.getReplaceString('this is a Bla text');
		assert.equal('there', actual);

		testOBject = new ReplacePattern('$1', { pattern: '(th)is(?=.*Bla)', isRegExp: true });
		actual = testOBject.getReplaceString('this is a Bla text');
		assert.equal('th', actual);

		testOBject = new ReplacePattern('ma$1', { pattern: '(th)is(?=.*Bla)', isRegExp: true });
		actual = testOBject.getReplaceString('this is a Bla text');
		assert.equal('math', actual);

		testOBject = new ReplacePattern('ma$1s', { pattern: '(th)is(?=.*Bla)', isRegExp: true });
		actual = testOBject.getReplaceString('this is a Bla text');
		assert.equal('maths', actual);

		testOBject = new ReplacePattern('ma$1s', { pattern: '(th)is(?=.*Bla)', isRegExp: true });
		actual = testOBject.getReplaceString('this is a Bla text');
		assert.equal('maths', actual);

		testOBject = new ReplacePattern('$0', { pattern: '(th)is(?=.*Bla)', isRegExp: true });
		actual = testOBject.getReplaceString('this is a Bla text');
		assert.equal('this', actual);

		testOBject = new ReplacePattern('$0$1', { pattern: '(th)is(?=.*Bla)', isRegExp: true });
		actual = testOBject.getReplaceString('this is a Bla text');
		assert.equal('thisth', actual);

		testOBject = new ReplacePattern('foo', { pattern: 'Bla(?=\\stext$)', isRegExp: true });
		actual = testOBject.getReplaceString('this is a Bla text');
		assert.equal('foo', actual);

		testOBject = new ReplacePattern('f$1', { pattern: 'B(la)(?=\\stext$)', isRegExp: true });
		actual = testOBject.getReplaceString('this is a Bla text');
		assert.equal('fla', actual);

		testOBject = new ReplacePattern('f$0', { pattern: 'B(la)(?=\\stext$)', isRegExp: true });
		actual = testOBject.getReplaceString('this is a Bla text');
		assert.equal('fBla', actual);

		testOBject = new ReplacePattern('$0ah', { pattern: 'B(la)(?=\\stext$)', isRegExp: true });
		actual = testOBject.getReplaceString('this is a Bla text');
		assert.equal('Blaah', actual);

		testOBject = new ReplacePattern('newrege$1', true, /Testrege(\w*)/);
		actual = testOBject.getReplaceString('Testregex', true);
		assert.equal('Newregex', actual);

		testOBject = new ReplacePattern('newrege$1', true, /TESTREGE(\w*)/);
		actual = testOBject.getReplaceString('TESTREGEX', true);
		assert.equal('NEWREGEX', actual);

		testOBject = new ReplacePattern('new_rege$1', true, /Test_Rege(\w*)/);
		actual = testOBject.getReplaceString('Test_Regex', true);
		assert.equal('New_Regex', actual);

		testOBject = new ReplacePattern('new-rege$1', true, /Test-Rege(\w*)/);
		actual = testOBject.getReplaceString('Test-Regex', true);
		assert.equal('New-Regex', actual);
	});
});
