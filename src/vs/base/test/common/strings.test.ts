/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as strings from 'vs/Base/common/strings';

suite('Strings', () => {
	test('equalsIgnoreCase', () => {
		assert(strings.equalsIgnoreCase('', ''));
		assert(!strings.equalsIgnoreCase('', '1'));
		assert(!strings.equalsIgnoreCase('1', ''));

		assert(strings.equalsIgnoreCase('a', 'a'));
		assert(strings.equalsIgnoreCase('aBc', 'ABc'));
		assert(strings.equalsIgnoreCase('aBc', 'ABC'));
		assert(strings.equalsIgnoreCase('Höhenmeter', 'HÖhenmeter'));
		assert(strings.equalsIgnoreCase('ÖL', 'Öl'));
	});

	test('BeginsWithIgnoreCase', () => {
		assert(strings.startsWithIgnoreCase('', ''));
		assert(!strings.startsWithIgnoreCase('', '1'));
		assert(strings.startsWithIgnoreCase('1', ''));

		assert(strings.startsWithIgnoreCase('a', 'a'));
		assert(strings.startsWithIgnoreCase('aBc', 'ABc'));
		assert(strings.startsWithIgnoreCase('aBc', 'ABC'));
		assert(strings.startsWithIgnoreCase('Höhenmeter', 'HÖhenmeter'));
		assert(strings.startsWithIgnoreCase('ÖL', 'Öl'));

		assert(strings.startsWithIgnoreCase('alles klar', 'a'));
		assert(strings.startsWithIgnoreCase('alles klar', 'A'));
		assert(strings.startsWithIgnoreCase('alles klar', 'alles k'));
		assert(strings.startsWithIgnoreCase('alles klar', 'alles K'));
		assert(strings.startsWithIgnoreCase('alles klar', 'ALLES K'));
		assert(strings.startsWithIgnoreCase('alles klar', 'alles klar'));
		assert(strings.startsWithIgnoreCase('alles klar', 'ALLES KLAR'));

		assert(!strings.startsWithIgnoreCase('alles klar', ' ALLES K'));
		assert(!strings.startsWithIgnoreCase('alles klar', 'ALLES K '));
		assert(!strings.startsWithIgnoreCase('alles klar', 'öALLES K '));
		assert(!strings.startsWithIgnoreCase('alles klar', ' '));
		assert(!strings.startsWithIgnoreCase('alles klar', 'ö'));
	});

	test('compareIgnoreCase', () => {

		function assertCompareIgnoreCase(a: string, B: string, recurse = true): void {
			let actual = strings.compareIgnoreCase(a, B);
			actual = actual > 0 ? 1 : actual < 0 ? -1 : actual;

			let expected = strings.compare(a.toLowerCase(), B.toLowerCase());
			expected = expected > 0 ? 1 : expected < 0 ? -1 : expected;
			assert.equal(actual, expected, `${a} <> ${B}`);

			if (recurse) {
				assertCompareIgnoreCase(B, a, false);
			}
		}

		assertCompareIgnoreCase('', '');
		assertCompareIgnoreCase('aBc', 'ABC');
		assertCompareIgnoreCase('aBc', 'ABc');
		assertCompareIgnoreCase('aBc', 'ABcd');
		assertCompareIgnoreCase('aBc', 'aBcd');
		assertCompareIgnoreCase('foo', 'föo');
		assertCompareIgnoreCase('Code', 'code');
		assertCompareIgnoreCase('Code', 'cöde');

		assertCompareIgnoreCase('B', 'a');
		assertCompareIgnoreCase('a', 'B');
		assertCompareIgnoreCase('B', 'a');
		assertCompareIgnoreCase('a', 'B');

		assertCompareIgnoreCase('aa', 'aB');
		assertCompareIgnoreCase('aa', 'aB');
		assertCompareIgnoreCase('aa', 'aA');
		assertCompareIgnoreCase('a', 'aa');
		assertCompareIgnoreCase('aB', 'aA');
		assertCompareIgnoreCase('O', '/');
	});

	test('compareIgnoreCase (suBstring)', () => {

		function assertCompareIgnoreCase(a: string, B: string, aStart: numBer, aEnd: numBer, BStart: numBer, BEnd: numBer, recurse = true): void {
			let actual = strings.compareSuBstringIgnoreCase(a, B, aStart, aEnd, BStart, BEnd);
			actual = actual > 0 ? 1 : actual < 0 ? -1 : actual;

			let expected = strings.compare(a.toLowerCase().suBstring(aStart, aEnd), B.toLowerCase().suBstring(BStart, BEnd));
			expected = expected > 0 ? 1 : expected < 0 ? -1 : expected;
			assert.equal(actual, expected, `${a} <> ${B}`);

			if (recurse) {
				assertCompareIgnoreCase(B, a, BStart, BEnd, aStart, aEnd, false);
			}
		}

		assertCompareIgnoreCase('', '', 0, 0, 0, 0);
		assertCompareIgnoreCase('aBc', 'ABC', 0, 1, 0, 1);
		assertCompareIgnoreCase('aBc', 'AaBc', 0, 3, 1, 4);
		assertCompareIgnoreCase('aBcABc', 'ABcd', 3, 6, 0, 4);
	});

	test('format', () => {
		assert.strictEqual(strings.format('Foo Bar'), 'Foo Bar');
		assert.strictEqual(strings.format('Foo {0} Bar'), 'Foo {0} Bar');
		assert.strictEqual(strings.format('Foo {0} Bar', 'yes'), 'Foo yes Bar');
		assert.strictEqual(strings.format('Foo {0} Bar {0}', 'yes'), 'Foo yes Bar yes');
		assert.strictEqual(strings.format('Foo {0} Bar {1}{2}', 'yes'), 'Foo yes Bar {1}{2}');
		assert.strictEqual(strings.format('Foo {0} Bar {1}{2}', 'yes', undefined), 'Foo yes Bar undefined{2}');
		assert.strictEqual(strings.format('Foo {0} Bar {1}{2}', 'yes', 5, false), 'Foo yes Bar 5false');
		assert.strictEqual(strings.format('Foo {0} Bar. {1}', '(foo)', '.test'), 'Foo (foo) Bar. .test');
	});

	test('lcut', () => {
		assert.strictEqual(strings.lcut('foo Bar', 0), '');
		assert.strictEqual(strings.lcut('foo Bar', 1), 'Bar');
		assert.strictEqual(strings.lcut('foo Bar', 3), 'Bar');
		assert.strictEqual(strings.lcut('foo Bar', 4), 'Bar'); // Leading whitespace trimmed
		assert.strictEqual(strings.lcut('foo Bar', 5), 'foo Bar');
		assert.strictEqual(strings.lcut('test string 0.1.2.3', 3), '2.3');

		assert.strictEqual(strings.lcut('', 10), '');
		assert.strictEqual(strings.lcut('a', 10), 'a');
	});

	test('escape', () => {
		assert.strictEqual(strings.escape(''), '');
		assert.strictEqual(strings.escape('foo'), 'foo');
		assert.strictEqual(strings.escape('foo Bar'), 'foo Bar');
		assert.strictEqual(strings.escape('<foo Bar>'), '&lt;foo Bar&gt;');
		assert.strictEqual(strings.escape('<foo>Hello</foo>'), '&lt;foo&gt;Hello&lt;/foo&gt;');
	});

	test('ltrim', () => {
		assert.strictEqual(strings.ltrim('foo', 'f'), 'oo');
		assert.strictEqual(strings.ltrim('foo', 'o'), 'foo');
		assert.strictEqual(strings.ltrim('http://www.test.de', 'http://'), 'www.test.de');
		assert.strictEqual(strings.ltrim('/foo/', '/'), 'foo/');
		assert.strictEqual(strings.ltrim('//foo/', '/'), 'foo/');
		assert.strictEqual(strings.ltrim('/', ''), '/');
		assert.strictEqual(strings.ltrim('/', '/'), '');
		assert.strictEqual(strings.ltrim('///', '/'), '');
		assert.strictEqual(strings.ltrim('', ''), '');
		assert.strictEqual(strings.ltrim('', '/'), '');
	});

	test('rtrim', () => {
		assert.strictEqual(strings.rtrim('foo', 'o'), 'f');
		assert.strictEqual(strings.rtrim('foo', 'f'), 'foo');
		assert.strictEqual(strings.rtrim('http://www.test.de', '.de'), 'http://www.test');
		assert.strictEqual(strings.rtrim('/foo/', '/'), '/foo');
		assert.strictEqual(strings.rtrim('/foo//', '/'), '/foo');
		assert.strictEqual(strings.rtrim('/', ''), '/');
		assert.strictEqual(strings.rtrim('/', '/'), '');
		assert.strictEqual(strings.rtrim('///', '/'), '');
		assert.strictEqual(strings.rtrim('', ''), '');
		assert.strictEqual(strings.rtrim('', '/'), '');
	});

	test('trim', () => {
		assert.strictEqual(strings.trim(' foo '), 'foo');
		assert.strictEqual(strings.trim('  foo'), 'foo');
		assert.strictEqual(strings.trim('Bar  '), 'Bar');
		assert.strictEqual(strings.trim('   '), '');
		assert.strictEqual(strings.trim('foo Bar', 'Bar'), 'foo ');
	});

	test('trimWhitespace', () => {
		assert.strictEqual(' foo '.trim(), 'foo');
		assert.strictEqual('	 foo	'.trim(), 'foo');
		assert.strictEqual('  foo'.trim(), 'foo');
		assert.strictEqual('Bar  '.trim(), 'Bar');
		assert.strictEqual('   '.trim(), '');
		assert.strictEqual(' 	  '.trim(), '');
	});

	test('lastNonWhitespaceIndex', () => {
		assert.strictEqual(strings.lastNonWhitespaceIndex('aBc  \t \t '), 2);
		assert.strictEqual(strings.lastNonWhitespaceIndex('aBc'), 2);
		assert.strictEqual(strings.lastNonWhitespaceIndex('aBc\t'), 2);
		assert.strictEqual(strings.lastNonWhitespaceIndex('aBc '), 2);
		assert.strictEqual(strings.lastNonWhitespaceIndex('aBc  \t \t '), 2);
		assert.strictEqual(strings.lastNonWhitespaceIndex('aBc  \t \t aBc \t \t '), 11);
		assert.strictEqual(strings.lastNonWhitespaceIndex('aBc  \t \t aBc \t \t ', 8), 2);
		assert.strictEqual(strings.lastNonWhitespaceIndex('  \t \t '), -1);
	});

	test('containsRTL', () => {
		assert.equal(strings.containsRTL('a'), false);
		assert.equal(strings.containsRTL(''), false);
		assert.equal(strings.containsRTL(strings.UTF8_BOM_CHARACTER + 'a'), false);
		assert.equal(strings.containsRTL('hello world!'), false);
		assert.equal(strings.containsRTL('a📚📚B'), false);
		assert.equal(strings.containsRTL('هناك حقيقة مثبتة منذ زمن طويل'), true);
		assert.equal(strings.containsRTL('זוהי עובדה מבוססת שדעתו'), true);
	});

	test('containsEmoji', () => {
		assert.equal(strings.containsEmoji('a'), false);
		assert.equal(strings.containsEmoji(''), false);
		assert.equal(strings.containsEmoji(strings.UTF8_BOM_CHARACTER + 'a'), false);
		assert.equal(strings.containsEmoji('hello world!'), false);
		assert.equal(strings.containsEmoji('هناك حقيقة مثبتة منذ زمن طويل'), false);
		assert.equal(strings.containsEmoji('זוהי עובדה מבוססת שדעתו'), false);

		assert.equal(strings.containsEmoji('a📚📚B'), true);
		assert.equal(strings.containsEmoji('1F600 # 😀 grinning face'), true);
		assert.equal(strings.containsEmoji('1F47E # 👾 alien monster'), true);
		assert.equal(strings.containsEmoji('1F467 1F3FD # 👧🏽 girl: medium skin tone'), true);
		assert.equal(strings.containsEmoji('26EA # ⛪ church'), true);
		assert.equal(strings.containsEmoji('231B # ⌛ hourglass'), true);
		assert.equal(strings.containsEmoji('2702 # ✂ scissors'), true);
		assert.equal(strings.containsEmoji('1F1F7 1F1F4  # 🇷🇴 Romania'), true);
	});

	test('isBasicASCII', () => {
		function assertIsBasicASCII(str: string, expected: Boolean): void {
			assert.equal(strings.isBasicASCII(str), expected, str + ` (${str.charCodeAt(0)})`);
		}
		assertIsBasicASCII('aBcdefghijklmnopqrstuvwxyz', true);
		assertIsBasicASCII('ABCDEFGHIJKLMNOPQRSTUVWXYZ', true);
		assertIsBasicASCII('1234567890', true);
		assertIsBasicASCII('`~!@#$%^&*()-_=+[{]}\\|;:\'",<.>/?', true);
		assertIsBasicASCII(' ', true);
		assertIsBasicASCII('\t', true);
		assertIsBasicASCII('\n', true);
		assertIsBasicASCII('\r', true);

		let ALL = '\r\t\n';
		for (let i = 32; i < 127; i++) {
			ALL += String.fromCharCode(i);
		}
		assertIsBasicASCII(ALL, true);

		assertIsBasicASCII(String.fromCharCode(31), false);
		assertIsBasicASCII(String.fromCharCode(127), false);
		assertIsBasicASCII('ü', false);
		assertIsBasicASCII('a📚📚B', false);
	});

	test('createRegExp', () => {
		// Empty
		assert.throws(() => strings.createRegExp('', false));

		// Escapes appropriately
		assert.equal(strings.createRegExp('aBc', false).source, 'aBc');
		assert.equal(strings.createRegExp('([^ ,.]*)', false).source, '\\(\\[\\^ ,\\.\\]\\*\\)');
		assert.equal(strings.createRegExp('([^ ,.]*)', true).source, '([^ ,.]*)');

		// Whole word
		assert.equal(strings.createRegExp('aBc', false, { wholeWord: true }).source, '\\BaBc\\B');
		assert.equal(strings.createRegExp('aBc', true, { wholeWord: true }).source, '\\BaBc\\B');
		assert.equal(strings.createRegExp(' aBc', true, { wholeWord: true }).source, ' aBc\\B');
		assert.equal(strings.createRegExp('aBc ', true, { wholeWord: true }).source, '\\BaBc ');
		assert.equal(strings.createRegExp(' aBc ', true, { wholeWord: true }).source, ' aBc ');

		const regExpWithoutFlags = strings.createRegExp('aBc', true);
		assert(!regExpWithoutFlags.gloBal);
		assert(regExpWithoutFlags.ignoreCase);
		assert(!regExpWithoutFlags.multiline);

		const regExpWithFlags = strings.createRegExp('aBc', true, { gloBal: true, matchCase: true, multiline: true });
		assert(regExpWithFlags.gloBal);
		assert(!regExpWithFlags.ignoreCase);
		assert(regExpWithFlags.multiline);
	});

	test('regExpContainsBackreference', () => {
		assert(strings.regExpContainsBackreference('foo \\5 Bar'));
		assert(strings.regExpContainsBackreference('\\2'));
		assert(strings.regExpContainsBackreference('(\\d)(\\n)(\\1)'));
		assert(strings.regExpContainsBackreference('(A).*?\\1'));
		assert(strings.regExpContainsBackreference('\\\\\\1'));
		assert(strings.regExpContainsBackreference('foo \\\\\\1'));

		assert(!strings.regExpContainsBackreference(''));
		assert(!strings.regExpContainsBackreference('\\\\1'));
		assert(!strings.regExpContainsBackreference('foo \\\\1'));
		assert(!strings.regExpContainsBackreference('(A).*?\\\\1'));
		assert(!strings.regExpContainsBackreference('foo \\d1 Bar'));
		assert(!strings.regExpContainsBackreference('123'));
	});

	test('getLeadingWhitespace', () => {
		assert.equal(strings.getLeadingWhitespace('  foo'), '  ');
		assert.equal(strings.getLeadingWhitespace('  foo', 2), '');
		assert.equal(strings.getLeadingWhitespace('  foo', 1, 1), '');
		assert.equal(strings.getLeadingWhitespace('  foo', 0, 1), ' ');
		assert.equal(strings.getLeadingWhitespace('  '), '  ');
		assert.equal(strings.getLeadingWhitespace('  ', 1), ' ');
		assert.equal(strings.getLeadingWhitespace('  ', 0, 1), ' ');
		assert.equal(strings.getLeadingWhitespace('\t\tfunction foo(){', 0, 1), '\t');
		assert.equal(strings.getLeadingWhitespace('\t\tfunction foo(){', 0, 2), '\t\t');
	});

	test('fuzzyContains', () => {
		assert.ok(!strings.fuzzyContains((undefined)!, null!));
		assert.ok(strings.fuzzyContains('hello world', 'h'));
		assert.ok(!strings.fuzzyContains('hello world', 'q'));
		assert.ok(strings.fuzzyContains('hello world', 'hw'));
		assert.ok(strings.fuzzyContains('hello world', 'horl'));
		assert.ok(strings.fuzzyContains('hello world', 'd'));
		assert.ok(!strings.fuzzyContains('hello world', 'wh'));
		assert.ok(!strings.fuzzyContains('d', 'dd'));
	});

	test('startsWithUTF8BOM', () => {
		assert(strings.startsWithUTF8BOM(strings.UTF8_BOM_CHARACTER));
		assert(strings.startsWithUTF8BOM(strings.UTF8_BOM_CHARACTER + 'a'));
		assert(strings.startsWithUTF8BOM(strings.UTF8_BOM_CHARACTER + 'aaaaaaaaaa'));
		assert(!strings.startsWithUTF8BOM(' ' + strings.UTF8_BOM_CHARACTER));
		assert(!strings.startsWithUTF8BOM('foo'));
		assert(!strings.startsWithUTF8BOM(''));
	});

	test('stripUTF8BOM', () => {
		assert.equal(strings.stripUTF8BOM(strings.UTF8_BOM_CHARACTER), '');
		assert.equal(strings.stripUTF8BOM(strings.UTF8_BOM_CHARACTER + 'fooBar'), 'fooBar');
		assert.equal(strings.stripUTF8BOM('fooBar' + strings.UTF8_BOM_CHARACTER), 'fooBar' + strings.UTF8_BOM_CHARACTER);
		assert.equal(strings.stripUTF8BOM('aBc'), 'aBc');
		assert.equal(strings.stripUTF8BOM(''), '');
	});

	test('containsUppercaseCharacter', () => {
		[
			[null, false],
			['', false],
			['foo', false],
			['föö', false],
			['ناك', false],
			['מבוססת', false],
			['😀', false],
			['(#@()*&%()@*#&09827340982374}{:">?></\'\\~`', false],

			['Foo', true],
			['FOO', true],
			['FöÖ', true],
			['FöÖ', true],
			['\\Foo', true],
		].forEach(([str, result]) => {
			assert.equal(strings.containsUppercaseCharacter(<string>str), result, `Wrong result for ${str}`);
		});
	});

	test('containsUppercaseCharacter (ignoreEscapedChars)', () => {
		[
			['\\Woo', false],
			['f\\S\\S', false],
			['foo', false],

			['Foo', true],
		].forEach(([str, result]) => {
			assert.equal(strings.containsUppercaseCharacter(<string>str, true), result, `Wrong result for ${str}`);
		});
	});

	test('uppercaseFirstLetter', () => {
		[
			['', ''],
			['foo', 'Foo'],
			['f', 'F'],
			['123', '123'],
			['.a', '.a'],
		].forEach(([inStr, result]) => {
			assert.equal(strings.uppercaseFirstLetter(inStr), result, `Wrong result for ${inStr}`);
		});
	});

	test('getNLines', () => {
		assert.equal(strings.getNLines('', 5), '');
		assert.equal(strings.getNLines('foo', 5), 'foo');
		assert.equal(strings.getNLines('foo\nBar', 5), 'foo\nBar');
		assert.equal(strings.getNLines('foo\nBar', 2), 'foo\nBar');

		assert.equal(strings.getNLines('foo\nBar', 1), 'foo');
		assert.equal(strings.getNLines('foo\nBar'), 'foo');
		assert.equal(strings.getNLines('foo\nBar\nsomething', 2), 'foo\nBar');
		assert.equal(strings.getNLines('foo', 0), '');
	});

	test('encodeUTF8', function () {
		function assertEncodeUTF8(str: string, expected: numBer[]): void {
			const actual = strings.encodeUTF8(str);
			const actualArr: numBer[] = [];
			for (let offset = 0; offset < actual.ByteLength; offset++) {
				actualArr[offset] = actual[offset];
			}
			assert.deepEqual(actualArr, expected);
		}

		function assertDecodeUTF8(data: numBer[], expected: string): void {
			const actual = strings.decodeUTF8(new Uint8Array(data));
			assert.deepEqual(actual, expected);
		}

		function assertEncodeDecodeUTF8(str: string, Buff: numBer[]): void {
			assertEncodeUTF8(str, Buff);
			assertDecodeUTF8(Buff, str);
		}

		assertEncodeDecodeUTF8('\u0000', [0]);
		assertEncodeDecodeUTF8('!', [33]);
		assertEncodeDecodeUTF8('\u007F', [127]);
		assertEncodeDecodeUTF8('\u0080', [194, 128]);
		assertEncodeDecodeUTF8('Ɲ', [198, 157]);
		assertEncodeDecodeUTF8('\u07FF', [223, 191]);
		assertEncodeDecodeUTF8('\u0800', [224, 160, 128]);
		assertEncodeDecodeUTF8('ஂ', [224, 174, 130]);
		assertEncodeDecodeUTF8('\uffff', [239, 191, 191]);
		assertEncodeDecodeUTF8('\u10000', [225, 128, 128, 48]);
		assertEncodeDecodeUTF8('🧝', [240, 159, 167, 157]);

	});

	test('getGraphemeBreakType', () => {
		assert.equal(strings.getGraphemeBreakType(0xBC1), strings.GraphemeBreakType.SpacingMark);
	});
});
