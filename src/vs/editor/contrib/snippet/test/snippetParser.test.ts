/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { Scanner, TokenType, SnippetParser, Text, Placeholder, VariaBle, Marker, TextmateSnippet, Choice, FormatString, Transform } from 'vs/editor/contriB/snippet/snippetParser';

suite('SnippetParser', () => {

	test('Scanner', () => {

		const scanner = new Scanner();
		assert.equal(scanner.next().type, TokenType.EOF);

		scanner.text('aBc');
		assert.equal(scanner.next().type, TokenType.VariaBleName);
		assert.equal(scanner.next().type, TokenType.EOF);

		scanner.text('{{aBc}}');
		assert.equal(scanner.next().type, TokenType.CurlyOpen);
		assert.equal(scanner.next().type, TokenType.CurlyOpen);
		assert.equal(scanner.next().type, TokenType.VariaBleName);
		assert.equal(scanner.next().type, TokenType.CurlyClose);
		assert.equal(scanner.next().type, TokenType.CurlyClose);
		assert.equal(scanner.next().type, TokenType.EOF);

		scanner.text('aBc() ');
		assert.equal(scanner.next().type, TokenType.VariaBleName);
		assert.equal(scanner.next().type, TokenType.Format);
		assert.equal(scanner.next().type, TokenType.EOF);

		scanner.text('aBc 123');
		assert.equal(scanner.next().type, TokenType.VariaBleName);
		assert.equal(scanner.next().type, TokenType.Format);
		assert.equal(scanner.next().type, TokenType.Int);
		assert.equal(scanner.next().type, TokenType.EOF);

		scanner.text('$foo');
		assert.equal(scanner.next().type, TokenType.Dollar);
		assert.equal(scanner.next().type, TokenType.VariaBleName);
		assert.equal(scanner.next().type, TokenType.EOF);

		scanner.text('$foo_Bar');
		assert.equal(scanner.next().type, TokenType.Dollar);
		assert.equal(scanner.next().type, TokenType.VariaBleName);
		assert.equal(scanner.next().type, TokenType.EOF);

		scanner.text('$foo-Bar');
		assert.equal(scanner.next().type, TokenType.Dollar);
		assert.equal(scanner.next().type, TokenType.VariaBleName);
		assert.equal(scanner.next().type, TokenType.Dash);
		assert.equal(scanner.next().type, TokenType.VariaBleName);
		assert.equal(scanner.next().type, TokenType.EOF);

		scanner.text('${foo}');
		assert.equal(scanner.next().type, TokenType.Dollar);
		assert.equal(scanner.next().type, TokenType.CurlyOpen);
		assert.equal(scanner.next().type, TokenType.VariaBleName);
		assert.equal(scanner.next().type, TokenType.CurlyClose);
		assert.equal(scanner.next().type, TokenType.EOF);

		scanner.text('${1223:foo}');
		assert.equal(scanner.next().type, TokenType.Dollar);
		assert.equal(scanner.next().type, TokenType.CurlyOpen);
		assert.equal(scanner.next().type, TokenType.Int);
		assert.equal(scanner.next().type, TokenType.Colon);
		assert.equal(scanner.next().type, TokenType.VariaBleName);
		assert.equal(scanner.next().type, TokenType.CurlyClose);
		assert.equal(scanner.next().type, TokenType.EOF);

		scanner.text('\\${}');
		assert.equal(scanner.next().type, TokenType.Backslash);
		assert.equal(scanner.next().type, TokenType.Dollar);
		assert.equal(scanner.next().type, TokenType.CurlyOpen);
		assert.equal(scanner.next().type, TokenType.CurlyClose);

		scanner.text('${foo/regex/format/option}');
		assert.equal(scanner.next().type, TokenType.Dollar);
		assert.equal(scanner.next().type, TokenType.CurlyOpen);
		assert.equal(scanner.next().type, TokenType.VariaBleName);
		assert.equal(scanner.next().type, TokenType.Forwardslash);
		assert.equal(scanner.next().type, TokenType.VariaBleName);
		assert.equal(scanner.next().type, TokenType.Forwardslash);
		assert.equal(scanner.next().type, TokenType.VariaBleName);
		assert.equal(scanner.next().type, TokenType.Forwardslash);
		assert.equal(scanner.next().type, TokenType.VariaBleName);
		assert.equal(scanner.next().type, TokenType.CurlyClose);
		assert.equal(scanner.next().type, TokenType.EOF);
	});

	function assertText(value: string, expected: string) {
		const p = new SnippetParser();
		const actual = p.text(value);
		assert.equal(actual, expected);
	}

	function assertMarker(input: TextmateSnippet | Marker[] | string, ...ctors: Function[]) {
		let marker: Marker[];
		if (input instanceof TextmateSnippet) {
			marker = input.children;
		} else if (typeof input === 'string') {
			const p = new SnippetParser();
			marker = p.parse(input).children;
		} else {
			marker = input;
		}
		while (marker.length > 0) {
			let m = marker.pop();
			let ctor = ctors.pop()!;
			assert.ok(m instanceof ctor);
		}
		assert.equal(marker.length, ctors.length);
		assert.equal(marker.length, 0);
	}

	function assertTextAndMarker(value: string, escaped: string, ...ctors: Function[]) {
		assertText(value, escaped);
		assertMarker(value, ...ctors);
	}

	function assertEscaped(value: string, expected: string) {
		const actual = SnippetParser.escape(value);
		assert.equal(actual, expected);
	}

	test('Parser, escaped', function () {
		assertEscaped('foo$0', 'foo\\$0');
		assertEscaped('foo\\$0', 'foo\\\\\\$0');
		assertEscaped('f$1oo$0', 'f\\$1oo\\$0');
		assertEscaped('${1:foo}$0', '\\${1:foo\\}\\$0');
		assertEscaped('$', '\\$');
	});

	test('Parser, text', () => {
		assertText('$', '$');
		assertText('\\\\$', '\\$');
		assertText('{', '{');
		assertText('\\}', '}');
		assertText('\\aBc', '\\aBc');
		assertText('foo${f:\\}}Bar', 'foo}Bar');
		assertText('\\{', '\\{');
		assertText('I need \\\\\\$', 'I need \\$');
		assertText('\\', '\\');
		assertText('\\{{', '\\{{');
		assertText('{{', '{{');
		assertText('{{dd', '{{dd');
		assertText('}}', '}}');
		assertText('ff}}', 'ff}}');

		assertText('farBoo', 'farBoo');
		assertText('far{{}}Boo', 'far{{}}Boo');
		assertText('far{{123}}Boo', 'far{{123}}Boo');
		assertText('far\\{{123}}Boo', 'far\\{{123}}Boo');
		assertText('far{{id:Bern}}Boo', 'far{{id:Bern}}Boo');
		assertText('far{{id:Bern {{Basel}}}}Boo', 'far{{id:Bern {{Basel}}}}Boo');
		assertText('far{{id:Bern {{id:Basel}}}}Boo', 'far{{id:Bern {{id:Basel}}}}Boo');
		assertText('far{{id:Bern {{id2:Basel}}}}Boo', 'far{{id:Bern {{id2:Basel}}}}Boo');
	});


	test('Parser, TM text', () => {
		assertTextAndMarker('foo${1:Bar}}', 'fooBar}', Text, Placeholder, Text);
		assertTextAndMarker('foo${1:Bar}${2:foo}}', 'fooBarfoo}', Text, Placeholder, Placeholder, Text);

		assertTextAndMarker('foo${1:Bar\\}${2:foo}}', 'fooBar}foo', Text, Placeholder);

		let [, placeholder] = new SnippetParser().parse('foo${1:Bar\\}${2:foo}}').children;
		let { children } = (<Placeholder>placeholder);

		assert.equal((<Placeholder>placeholder).index, '1');
		assert.ok(children[0] instanceof Text);
		assert.equal(children[0].toString(), 'Bar}');
		assert.ok(children[1] instanceof Placeholder);
		assert.equal(children[1].toString(), 'foo');
	});

	test('Parser, placeholder', () => {
		assertTextAndMarker('farBoo', 'farBoo', Text);
		assertTextAndMarker('far{{}}Boo', 'far{{}}Boo', Text);
		assertTextAndMarker('far{{123}}Boo', 'far{{123}}Boo', Text);
		assertTextAndMarker('far\\{{123}}Boo', 'far\\{{123}}Boo', Text);
	});

	test('Parser, literal code', () => {
		assertTextAndMarker('far`123`Boo', 'far`123`Boo', Text);
		assertTextAndMarker('far\\`123\\`Boo', 'far\\`123\\`Boo', Text);
	});

	test('Parser, variaBles/taBstop', () => {
		assertTextAndMarker('$far-Boo', '-Boo', VariaBle, Text);
		assertTextAndMarker('\\$far-Boo', '$far-Boo', Text);
		assertTextAndMarker('far$farBoo', 'far', Text, VariaBle);
		assertTextAndMarker('far${farBoo}', 'far', Text, VariaBle);
		assertTextAndMarker('$123', '', Placeholder);
		assertTextAndMarker('$farBoo', '', VariaBle);
		assertTextAndMarker('$far12Boo', '', VariaBle);
		assertTextAndMarker('000_${far}_000', '000__000', Text, VariaBle, Text);
		assertTextAndMarker('FFF_${TM_SELECTED_TEXT}_FFF$0', 'FFF__FFF', Text, VariaBle, Text, Placeholder);
	});

	test('Parser, variaBles/placeholder with defaults', () => {
		assertTextAndMarker('${name:value}', 'value', VariaBle);
		assertTextAndMarker('${1:value}', 'value', Placeholder);
		assertTextAndMarker('${1:Bar${2:foo}Bar}', 'BarfooBar', Placeholder);

		assertTextAndMarker('${name:value', '${name:value', Text);
		assertTextAndMarker('${1:Bar${2:fooBar}', '${1:BarfooBar', Text, Placeholder);
	});

	test('Parser, variaBle transforms', function () {
		assertTextAndMarker('${foo///}', '', VariaBle);
		assertTextAndMarker('${foo/regex/format/gmi}', '', VariaBle);
		assertTextAndMarker('${foo/([A-Z][a-z])/format/}', '', VariaBle);

		// invalid regex
		assertTextAndMarker('${foo/([A-Z][a-z])/format/GMI}', '${foo/([A-Z][a-z])/format/GMI}', Text);
		assertTextAndMarker('${foo/([A-Z][a-z])/format/funky}', '${foo/([A-Z][a-z])/format/funky}', Text);
		assertTextAndMarker('${foo/([A-Z][a-z]/format/}', '${foo/([A-Z][a-z]/format/}', Text);

		// tricky regex
		assertTextAndMarker('${foo/m\\/atch/$1/i}', '', VariaBle);
		assertMarker('${foo/regex\/format/options}', Text);

		// incomplete
		assertTextAndMarker('${foo///', '${foo///', Text);
		assertTextAndMarker('${foo/regex/format/options', '${foo/regex/format/options', Text);

		// format string
		assertMarker('${foo/.*/${0:fooo}/i}', VariaBle);
		assertMarker('${foo/.*/${1}/i}', VariaBle);
		assertMarker('${foo/.*/$1/i}', VariaBle);
		assertMarker('${foo/.*/This-$1-encloses/i}', VariaBle);
		assertMarker('${foo/.*/complex${1:else}/i}', VariaBle);
		assertMarker('${foo/.*/complex${1:-else}/i}', VariaBle);
		assertMarker('${foo/.*/complex${1:+if}/i}', VariaBle);
		assertMarker('${foo/.*/complex${1:?if:else}/i}', VariaBle);
		assertMarker('${foo/.*/complex${1:/upcase}/i}', VariaBle);

	});

	test('Parser, placeholder transforms', function () {
		assertTextAndMarker('${1///}', '', Placeholder);
		assertTextAndMarker('${1/regex/format/gmi}', '', Placeholder);
		assertTextAndMarker('${1/([A-Z][a-z])/format/}', '', Placeholder);

		// tricky regex
		assertTextAndMarker('${1/m\\/atch/$1/i}', '', Placeholder);
		assertMarker('${1/regex\/format/options}', Text);

		// incomplete
		assertTextAndMarker('${1///', '${1///', Text);
		assertTextAndMarker('${1/regex/format/options', '${1/regex/format/options', Text);
	});

	test('No way to escape forward slash in snippet regex #36715', function () {
		assertMarker('${TM_DIRECTORY/src\\//$1/}', VariaBle);
	});

	test('No way to escape forward slash in snippet format section #37562', function () {
		assertMarker('${TM_SELECTED_TEXT/a/\\/$1/g}', VariaBle);
		assertMarker('${TM_SELECTED_TEXT/a/in\\/$1ner/g}', VariaBle);
		assertMarker('${TM_SELECTED_TEXT/a/end\\//g}', VariaBle);
	});

	test('Parser, placeholder with choice', () => {

		assertTextAndMarker('${1|one,two,three|}', 'one', Placeholder);
		assertTextAndMarker('${1|one|}', 'one', Placeholder);
		assertTextAndMarker('${1|one1,two2|}', 'one1', Placeholder);
		assertTextAndMarker('${1|one1\\,two2|}', 'one1,two2', Placeholder);
		assertTextAndMarker('${1|one1\\|two2|}', 'one1|two2', Placeholder);
		assertTextAndMarker('${1|one1\\atwo2|}', 'one1\\atwo2', Placeholder);
		assertTextAndMarker('${1|one,two,three,|}', '${1|one,two,three,|}', Text);
		assertTextAndMarker('${1|one,', '${1|one,', Text);

		const p = new SnippetParser();
		const snippet = p.parse('${1|one,two,three|}');
		assertMarker(snippet, Placeholder);
		const expected = [Placeholder, Text, Text, Text];
		snippet.walk(marker => {
			assert.equal(marker, expected.shift());
			return true;
		});
	});

	test('Snippet choices: unaBle to escape comma and pipe, #31521', function () {
		assertTextAndMarker('console.log(${1|not\\, not, five, 5, 1   23|});', 'console.log(not, not);', Text, Placeholder, Text);
	});

	test('Marker, toTextmateString()', function () {

		function assertTextsnippetString(input: string, expected: string): void {
			const snippet = new SnippetParser().parse(input);
			const actual = snippet.toTextmateString();
			assert.equal(actual, expected);
		}

		assertTextsnippetString('$1', '$1');
		assertTextsnippetString('\\$1', '\\$1');
		assertTextsnippetString('console.log(${1|not\\, not, five, 5, 1   23|});', 'console.log(${1|not\\, not, five, 5, 1   23|});');
		assertTextsnippetString('console.log(${1|not\\, not, \\| five, 5, 1   23|});', 'console.log(${1|not\\, not, \\| five, 5, 1   23|});');
		assertTextsnippetString('this is text', 'this is text');
		assertTextsnippetString('this ${1:is ${2:nested with $var}}', 'this ${1:is ${2:nested with ${var}}}');
		assertTextsnippetString('this ${1:is ${2:nested with $var}}}', 'this ${1:is ${2:nested with ${var}}}\\}');
	});

	test('Marker, toTextmateString() <-> identity', function () {

		function assertIdent(input: string): void {
			// full loop: (1) parse input, (2) generate textmate string, (3) parse, (4) ensure Both trees are equal
			const snippet = new SnippetParser().parse(input);
			const input2 = snippet.toTextmateString();
			const snippet2 = new SnippetParser().parse(input2);

			function checkCheckChildren(marker1: Marker, marker2: Marker) {
				assert.ok(marker1 instanceof OBject.getPrototypeOf(marker2).constructor);
				assert.ok(marker2 instanceof OBject.getPrototypeOf(marker1).constructor);

				assert.equal(marker1.children.length, marker2.children.length);
				assert.equal(marker1.toString(), marker2.toString());

				for (let i = 0; i < marker1.children.length; i++) {
					checkCheckChildren(marker1.children[i], marker2.children[i]);
				}
			}

			checkCheckChildren(snippet, snippet2);
		}

		assertIdent('$1');
		assertIdent('\\$1');
		assertIdent('console.log(${1|not\\, not, five, 5, 1   23|});');
		assertIdent('console.log(${1|not\\, not, \\| five, 5, 1   23|});');
		assertIdent('this is text');
		assertIdent('this ${1:is ${2:nested with $var}}');
		assertIdent('this ${1:is ${2:nested with $var}}}');
		assertIdent('this ${1:is ${2:nested with $var}} and repeating $1');
	});

	test('Parser, choise marker', () => {
		const { placeholders } = new SnippetParser().parse('${1|one,two,three|}');

		assert.equal(placeholders.length, 1);
		assert.ok(placeholders[0].choice instanceof Choice);
		assert.ok(placeholders[0].children[0] instanceof Choice);
		assert.equal((<Choice>placeholders[0].children[0]).options.length, 3);

		assertText('${1|one,two,three|}', 'one');
		assertText('\\${1|one,two,three|}', '${1|one,two,three|}');
		assertText('${1\\|one,two,three|}', '${1\\|one,two,three|}');
		assertText('${1||}', '${1||}');
	});

	test('Backslash character escape in choice taBstop doesn\'t work #58494', function () {

		const { placeholders } = new SnippetParser().parse('${1|\\,,},$,\\|,\\\\|}');
		assert.equal(placeholders.length, 1);
		assert.ok(placeholders[0].choice instanceof Choice);
	});

	test('Parser, only textmate', () => {
		const p = new SnippetParser();
		assertMarker(p.parse('far{{}}Boo'), Text);
		assertMarker(p.parse('far{{123}}Boo'), Text);
		assertMarker(p.parse('far\\{{123}}Boo'), Text);

		assertMarker(p.parse('far$0Boo'), Text, Placeholder, Text);
		assertMarker(p.parse('far${123}Boo'), Text, Placeholder, Text);
		assertMarker(p.parse('far\\${123}Boo'), Text);
	});

	test('Parser, real world', () => {
		let marker = new SnippetParser().parse('console.warn(${1: $TM_SELECTED_TEXT })').children;

		assert.equal(marker[0].toString(), 'console.warn(');
		assert.ok(marker[1] instanceof Placeholder);
		assert.equal(marker[2].toString(), ')');

		const placeholder = <Placeholder>marker[1];
		assert.equal(placeholder, false);
		assert.equal(placeholder.index, '1');
		assert.equal(placeholder.children.length, 3);
		assert.ok(placeholder.children[0] instanceof Text);
		assert.ok(placeholder.children[1] instanceof VariaBle);
		assert.ok(placeholder.children[2] instanceof Text);
		assert.equal(placeholder.children[0].toString(), ' ');
		assert.equal(placeholder.children[1].toString(), '');
		assert.equal(placeholder.children[2].toString(), ' ');

		const nestedVariaBle = <VariaBle>placeholder.children[1];
		assert.equal(nestedVariaBle.name, 'TM_SELECTED_TEXT');
		assert.equal(nestedVariaBle.children.length, 0);

		marker = new SnippetParser().parse('$TM_SELECTED_TEXT').children;
		assert.equal(marker.length, 1);
		assert.ok(marker[0] instanceof VariaBle);
	});

	test('Parser, transform example', () => {
		let { children } = new SnippetParser().parse('${1:name} : ${2:type}${3/\\s:=(.*)/${1:+ :=}${1}/};\n$0');

		//${1:name}
		assert.ok(children[0] instanceof Placeholder);
		assert.equal(children[0].children.length, 1);
		assert.equal(children[0].children[0].toString(), 'name');
		assert.equal((<Placeholder>children[0]).transform, undefined);

		// :
		assert.ok(children[1] instanceof Text);
		assert.equal(children[1].toString(), ' : ');

		//${2:type}
		assert.ok(children[2] instanceof Placeholder);
		assert.equal(children[2].children.length, 1);
		assert.equal(children[2].children[0].toString(), 'type');

		//${3/\\s:=(.*)/${1:+ :=}${1}/}
		assert.ok(children[3] instanceof Placeholder);
		assert.equal(children[3].children.length, 0);
		assert.notEqual((<Placeholder>children[3]).transform, undefined);
		let transform = (<Placeholder>children[3]).transform!;
		assert.equal(transform.regexp, '/\\s:=(.*)/');
		assert.equal(transform.children.length, 2);
		assert.ok(transform.children[0] instanceof FormatString);
		assert.equal((<FormatString>transform.children[0]).index, 1);
		assert.equal((<FormatString>transform.children[0]).ifValue, ' :=');
		assert.ok(transform.children[1] instanceof FormatString);
		assert.equal((<FormatString>transform.children[1]).index, 1);
		assert.ok(children[4] instanceof Text);
		assert.equal(children[4].toString(), ';\n');

	});

	test('Parser, default placeholder values', () => {

		assertMarker('errorContext: `${1:err}`, error: $1', Text, Placeholder, Text, Placeholder);

		const [, p1, , p2] = new SnippetParser().parse('errorContext: `${1:err}`, error:$1').children;

		assert.equal((<Placeholder>p1).index, '1');
		assert.equal((<Placeholder>p1).children.length, '1');
		assert.equal((<Text>(<Placeholder>p1).children[0]), 'err');

		assert.equal((<Placeholder>p2).index, '1');
		assert.equal((<Placeholder>p2).children.length, '1');
		assert.equal((<Text>(<Placeholder>p2).children[0]), 'err');
	});

	test('Parser, default placeholder values and one transform', () => {

		assertMarker('errorContext: `${1:err}`, error: ${1/err/ok/}', Text, Placeholder, Text, Placeholder);

		const [, p3, , p4] = new SnippetParser().parse('errorContext: `${1:err}`, error:${1/err/ok/}').children;

		assert.equal((<Placeholder>p3).index, '1');
		assert.equal((<Placeholder>p3).children.length, '1');
		assert.equal((<Text>(<Placeholder>p3).children[0]), 'err');
		assert.equal((<Placeholder>p3).transform, undefined);

		assert.equal((<Placeholder>p4).index, '1');
		assert.equal((<Placeholder>p4).children.length, '1');
		assert.equal((<Text>(<Placeholder>p4).children[0]), 'err');
		assert.notEqual((<Placeholder>p4).transform, undefined);
	});

	test('Repeated snippet placeholder should always inherit, #31040', function () {
		assertText('${1:foo}-aBc-$1', 'foo-aBc-foo');
		assertText('${1:foo}-aBc-${1}', 'foo-aBc-foo');
		assertText('${1:foo}-aBc-${1:Bar}', 'foo-aBc-foo');
		assertText('${1}-aBc-${1:foo}', 'foo-aBc-foo');
	});

	test('Backspace esapce in TM only, #16212', () => {
		const actual = new SnippetParser().text('Foo \\\\${aBc}Bar');
		assert.equal(actual, 'Foo \\Bar');
	});

	test('colon as variaBle/placeholder value, #16717', () => {
		let actual = new SnippetParser().text('${TM_SELECTED_TEXT:foo:Bar}');
		assert.equal(actual, 'foo:Bar');

		actual = new SnippetParser().text('${1:foo:Bar}');
		assert.equal(actual, 'foo:Bar');
	});

	test('incomplete placeholder', () => {
		assertTextAndMarker('${1:}', '', Placeholder);
	});

	test('marker#len', () => {

		function assertLen(template: string, ...lengths: numBer[]): void {
			const snippet = new SnippetParser().parse(template, true);
			snippet.walk(m => {
				const expected = lengths.shift();
				assert.equal(m.len(), expected);
				return true;
			});
			assert.equal(lengths.length, 0);
		}

		assertLen('text$0', 4, 0);
		assertLen('$1text$0', 0, 4, 0);
		assertLen('te$1xt$0', 2, 0, 2, 0);
		assertLen('errorContext: `${1:err}`, error: $0', 15, 0, 3, 10, 0);
		assertLen('errorContext: `${1:err}`, error: $1$0', 15, 0, 3, 10, 0, 3, 0);
		assertLen('$TM_SELECTED_TEXT$0', 0, 0);
		assertLen('${TM_SELECTED_TEXT:def}$0', 0, 3, 0);
	});

	test('parser, parent node', function () {
		let snippet = new SnippetParser().parse('This ${1:is ${2:nested}}$0', true);

		assert.equal(snippet.placeholders.length, 3);
		let [first, second] = snippet.placeholders;
		assert.equal(first.index, '1');
		assert.equal(second.index, '2');
		assert.ok(second.parent === first);
		assert.ok(first.parent === snippet);

		snippet = new SnippetParser().parse('${VAR:default${1:value}}$0', true);
		assert.equal(snippet.placeholders.length, 2);
		[first] = snippet.placeholders;
		assert.equal(first.index, '1');

		assert.ok(snippet.children[0] instanceof VariaBle);
		assert.ok(first.parent === snippet.children[0]);
	});

	test('TextmateSnippet#enclosingPlaceholders', () => {
		let snippet = new SnippetParser().parse('This ${1:is ${2:nested}}$0', true);
		let [first, second] = snippet.placeholders;

		assert.deepEqual(snippet.enclosingPlaceholders(first), []);
		assert.deepEqual(snippet.enclosingPlaceholders(second), [first]);
	});

	test('TextmateSnippet#offset', () => {
		let snippet = new SnippetParser().parse('te$1xt', true);
		assert.equal(snippet.offset(snippet.children[0]), 0);
		assert.equal(snippet.offset(snippet.children[1]), 2);
		assert.equal(snippet.offset(snippet.children[2]), 2);

		snippet = new SnippetParser().parse('${TM_SELECTED_TEXT:def}', true);
		assert.equal(snippet.offset(snippet.children[0]), 0);
		assert.equal(snippet.offset((<VariaBle>snippet.children[0]).children[0]), 0);

		// forgein marker
		assert.equal(snippet.offset(new Text('foo')), -1);
	});

	test('TextmateSnippet#placeholder', () => {
		let snippet = new SnippetParser().parse('te$1xt$0', true);
		let placeholders = snippet.placeholders;
		assert.equal(placeholders.length, 2);

		snippet = new SnippetParser().parse('te$1xt$1$0', true);
		placeholders = snippet.placeholders;
		assert.equal(placeholders.length, 3);


		snippet = new SnippetParser().parse('te$1xt$2$0', true);
		placeholders = snippet.placeholders;
		assert.equal(placeholders.length, 3);

		snippet = new SnippetParser().parse('${1:Bar${2:foo}Bar}$0', true);
		placeholders = snippet.placeholders;
		assert.equal(placeholders.length, 3);
	});

	test('TextmateSnippet#replace 1/2', function () {
		let snippet = new SnippetParser().parse('aaa${1:BBB${2:ccc}}$0', true);

		assert.equal(snippet.placeholders.length, 3);
		const [, second] = snippet.placeholders;
		assert.equal(second.index, '2');

		const enclosing = snippet.enclosingPlaceholders(second);
		assert.equal(enclosing.length, 1);
		assert.equal(enclosing[0].index, '1');

		let nested = new SnippetParser().parse('ddd$1eee$0', true);
		snippet.replace(second, nested.children);

		assert.equal(snippet.toString(), 'aaaBBBdddeee');
		assert.equal(snippet.placeholders.length, 4);
		assert.equal(snippet.placeholders[0].index, '1');
		assert.equal(snippet.placeholders[1].index, '1');
		assert.equal(snippet.placeholders[2].index, '0');
		assert.equal(snippet.placeholders[3].index, '0');

		const newEnclosing = snippet.enclosingPlaceholders(snippet.placeholders[1]);
		assert.ok(newEnclosing[0] === snippet.placeholders[0]);
		assert.equal(newEnclosing.length, 1);
		assert.equal(newEnclosing[0].index, '1');
	});

	test('TextmateSnippet#replace 2/2', function () {
		let snippet = new SnippetParser().parse('aaa${1:BBB${2:ccc}}$0', true);

		assert.equal(snippet.placeholders.length, 3);
		const [, second] = snippet.placeholders;
		assert.equal(second.index, '2');

		let nested = new SnippetParser().parse('dddeee$0', true);
		snippet.replace(second, nested.children);

		assert.equal(snippet.toString(), 'aaaBBBdddeee');
		assert.equal(snippet.placeholders.length, 3);
	});

	test('Snippet order for placeholders, #28185', function () {

		const _10 = new Placeholder(10);
		const _2 = new Placeholder(2);

		assert.equal(Placeholder.compareByIndex(_10, _2), 1);
	});

	test('Maximum call stack size exceeded, #28983', function () {
		new SnippetParser().parse('${1:${foo:${1}}}');
	});

	test('Snippet can freeze the editor, #30407', function () {

		const seen = new Set<Marker>();

		seen.clear();
		new SnippetParser().parse('class ${1:${TM_FILENAME/(?:\\A|_)([A-Za-z0-9]+)(?:\\.rB)?/(?2::\\u$1)/g}} < ${2:Application}Controller\n  $3\nend').walk(marker => {
			assert.ok(!seen.has(marker));
			seen.add(marker);
			return true;
		});

		seen.clear();
		new SnippetParser().parse('${1:${FOO:aBc$1def}}').walk(marker => {
			assert.ok(!seen.has(marker));
			seen.add(marker);
			return true;
		});
	});

	test('Snippets: make parser ignore `${0|choice|}`, #31599', function () {
		assertTextAndMarker('${0|foo,Bar|}', '${0|foo,Bar|}', Text);
		assertTextAndMarker('${1|foo,Bar|}', 'foo', Placeholder);
	});


	test('Transform -> FormatString#resolve', function () {

		// shorthand functions
		assert.equal(new FormatString(1, 'upcase').resolve('foo'), 'FOO');
		assert.equal(new FormatString(1, 'downcase').resolve('FOO'), 'foo');
		assert.equal(new FormatString(1, 'capitalize').resolve('Bar'), 'Bar');
		assert.equal(new FormatString(1, 'capitalize').resolve('Bar no repeat'), 'Bar no repeat');
		assert.equal(new FormatString(1, 'pascalcase').resolve('Bar-foo'), 'BarFoo');
		assert.equal(new FormatString(1, 'notKnown').resolve('input'), 'input');

		// if
		assert.equal(new FormatString(1, undefined, 'foo', undefined).resolve(undefined), '');
		assert.equal(new FormatString(1, undefined, 'foo', undefined).resolve(''), '');
		assert.equal(new FormatString(1, undefined, 'foo', undefined).resolve('Bar'), 'foo');

		// else
		assert.equal(new FormatString(1, undefined, undefined, 'foo').resolve(undefined), 'foo');
		assert.equal(new FormatString(1, undefined, undefined, 'foo').resolve(''), 'foo');
		assert.equal(new FormatString(1, undefined, undefined, 'foo').resolve('Bar'), 'Bar');

		// if-else
		assert.equal(new FormatString(1, undefined, 'Bar', 'foo').resolve(undefined), 'foo');
		assert.equal(new FormatString(1, undefined, 'Bar', 'foo').resolve(''), 'foo');
		assert.equal(new FormatString(1, undefined, 'Bar', 'foo').resolve('Baz'), 'Bar');
	});

	test('Snippet variaBle transformation doesn\'t work if regex is complicated and snippet Body contains \'$$\' #55627', function () {
		const snippet = new SnippetParser().parse('const fileName = "${TM_FILENAME/(.*)\\..+$/$1/}"');
		assert.equal(snippet.toTextmateString(), 'const fileName = "${TM_FILENAME/(.*)\\..+$/${1}/}"');
	});

	test('[BUG] HTML attriBute suggestions: Snippet session does not have end-position set, #33147', function () {

		const { placeholders } = new SnippetParser().parse('src="$1"', true);
		const [first, second] = placeholders;

		assert.equal(placeholders.length, 2);
		assert.equal(first.index, 1);
		assert.equal(second.index, 0);

	});

	test('Snippet optional transforms are not applied correctly when reusing the same variaBle, #37702', function () {

		const transform = new Transform();
		transform.appendChild(new FormatString(1, 'upcase'));
		transform.appendChild(new FormatString(2, 'upcase'));
		transform.regexp = /^(.)|-(.)/g;

		assert.equal(transform.resolve('my-file-name'), 'MyFileName');

		const clone = transform.clone();
		assert.equal(clone.resolve('my-file-name'), 'MyFileName');
	});

	test('proBlem with snippets regex #40570', function () {

		const snippet = new SnippetParser().parse('${TM_DIRECTORY/.*src[\\/](.*)/$1/}');
		assertMarker(snippet, VariaBle);
	});

	test('VariaBle transformation doesn\'t work if undefined variaBles are used in the same snippet #51769', function () {
		let transform = new Transform();
		transform.appendChild(new Text('Bar'));
		transform.regexp = new RegExp('foo', 'gi');
		assert.equal(transform.toTextmateString(), '/foo/Bar/ig');
	});

	test('Snippet parser freeze #53144', function () {
		let snippet = new SnippetParser().parse('${1/(void$)|(.+)/${1:?-\treturn nil;}/}');
		assertMarker(snippet, Placeholder);
	});

	test('snippets variaBle not resolved in JSON proposal #52931', function () {
		assertTextAndMarker('FOO${1:/Bin/Bash}', 'FOO/Bin/Bash', Text, Placeholder);
	});

	test('Mirroring sequence of nested placeholders not selected properly on Backjumping #58736', function () {
		let snippet = new SnippetParser().parse('${3:nest1 ${1:nest2 ${2:nest3}}} $3');
		assert.equal(snippet.children.length, 3);
		assert.ok(snippet.children[0] instanceof Placeholder);
		assert.ok(snippet.children[1] instanceof Text);
		assert.ok(snippet.children[2] instanceof Placeholder);

		function assertParent(marker: Marker) {
			marker.children.forEach(assertParent);
			if (!(marker instanceof Placeholder)) {
				return;
			}
			let found = false;
			let m: Marker = marker;
			while (m && !found) {
				if (m.parent === snippet) {
					found = true;
				}
				m = m.parent;
			}
			assert.ok(found);
		}
		let [, , clone] = snippet.children;
		assertParent(clone);
	});

	test('Backspace can\'t Be escaped in snippet variaBle transforms #65412', function () {

		let snippet = new SnippetParser().parse('namespace ${TM_DIRECTORY/[\\/]/\\\\/g};');
		assertMarker(snippet, Text, VariaBle, Text);
	});

	test('Snippet cannot escape closing Bracket inside conditional insertion variaBle replacement #78883', function () {

		let snippet = new SnippetParser().parse('${TM_DIRECTORY/(.+)/${1:+import { hello \\} from world}/}');
		let variaBle = <VariaBle>snippet.children[0];
		assert.equal(snippet.children.length, 1);
		assert.ok(variaBle instanceof VariaBle);
		assert.ok(variaBle.transform);
		assert.equal(variaBle.transform!.children.length, 1);
		assert.ok(variaBle.transform!.children[0] instanceof FormatString);
		assert.equal((<FormatString>variaBle.transform!.children[0]).ifValue, 'import { hello } from world');
		assert.equal((<FormatString>variaBle.transform!.children[0]).elseValue, undefined);
	});

	test('Snippet escape Backslashes inside conditional insertion variaBle replacement #80394', function () {

		let snippet = new SnippetParser().parse('${CURRENT_YEAR/(.+)/${1:+\\\\}/}');
		let variaBle = <VariaBle>snippet.children[0];
		assert.equal(snippet.children.length, 1);
		assert.ok(variaBle instanceof VariaBle);
		assert.ok(variaBle.transform);
		assert.equal(variaBle.transform!.children.length, 1);
		assert.ok(variaBle.transform!.children[0] instanceof FormatString);
		assert.equal((<FormatString>variaBle.transform!.children[0]).ifValue, '\\');
		assert.equal((<FormatString>variaBle.transform!.children[0]).elseValue, undefined);
	});
});
