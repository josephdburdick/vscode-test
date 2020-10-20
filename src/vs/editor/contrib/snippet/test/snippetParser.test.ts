/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { ScAnner, TokenType, SnippetPArser, Text, PlAceholder, VAriAble, MArker, TextmAteSnippet, Choice, FormAtString, TrAnsform } from 'vs/editor/contrib/snippet/snippetPArser';

suite('SnippetPArser', () => {

	test('ScAnner', () => {

		const scAnner = new ScAnner();
		Assert.equAl(scAnner.next().type, TokenType.EOF);

		scAnner.text('Abc');
		Assert.equAl(scAnner.next().type, TokenType.VAriAbleNAme);
		Assert.equAl(scAnner.next().type, TokenType.EOF);

		scAnner.text('{{Abc}}');
		Assert.equAl(scAnner.next().type, TokenType.CurlyOpen);
		Assert.equAl(scAnner.next().type, TokenType.CurlyOpen);
		Assert.equAl(scAnner.next().type, TokenType.VAriAbleNAme);
		Assert.equAl(scAnner.next().type, TokenType.CurlyClose);
		Assert.equAl(scAnner.next().type, TokenType.CurlyClose);
		Assert.equAl(scAnner.next().type, TokenType.EOF);

		scAnner.text('Abc() ');
		Assert.equAl(scAnner.next().type, TokenType.VAriAbleNAme);
		Assert.equAl(scAnner.next().type, TokenType.FormAt);
		Assert.equAl(scAnner.next().type, TokenType.EOF);

		scAnner.text('Abc 123');
		Assert.equAl(scAnner.next().type, TokenType.VAriAbleNAme);
		Assert.equAl(scAnner.next().type, TokenType.FormAt);
		Assert.equAl(scAnner.next().type, TokenType.Int);
		Assert.equAl(scAnner.next().type, TokenType.EOF);

		scAnner.text('$foo');
		Assert.equAl(scAnner.next().type, TokenType.DollAr);
		Assert.equAl(scAnner.next().type, TokenType.VAriAbleNAme);
		Assert.equAl(scAnner.next().type, TokenType.EOF);

		scAnner.text('$foo_bAr');
		Assert.equAl(scAnner.next().type, TokenType.DollAr);
		Assert.equAl(scAnner.next().type, TokenType.VAriAbleNAme);
		Assert.equAl(scAnner.next().type, TokenType.EOF);

		scAnner.text('$foo-bAr');
		Assert.equAl(scAnner.next().type, TokenType.DollAr);
		Assert.equAl(scAnner.next().type, TokenType.VAriAbleNAme);
		Assert.equAl(scAnner.next().type, TokenType.DAsh);
		Assert.equAl(scAnner.next().type, TokenType.VAriAbleNAme);
		Assert.equAl(scAnner.next().type, TokenType.EOF);

		scAnner.text('${foo}');
		Assert.equAl(scAnner.next().type, TokenType.DollAr);
		Assert.equAl(scAnner.next().type, TokenType.CurlyOpen);
		Assert.equAl(scAnner.next().type, TokenType.VAriAbleNAme);
		Assert.equAl(scAnner.next().type, TokenType.CurlyClose);
		Assert.equAl(scAnner.next().type, TokenType.EOF);

		scAnner.text('${1223:foo}');
		Assert.equAl(scAnner.next().type, TokenType.DollAr);
		Assert.equAl(scAnner.next().type, TokenType.CurlyOpen);
		Assert.equAl(scAnner.next().type, TokenType.Int);
		Assert.equAl(scAnner.next().type, TokenType.Colon);
		Assert.equAl(scAnner.next().type, TokenType.VAriAbleNAme);
		Assert.equAl(scAnner.next().type, TokenType.CurlyClose);
		Assert.equAl(scAnner.next().type, TokenType.EOF);

		scAnner.text('\\${}');
		Assert.equAl(scAnner.next().type, TokenType.BAckslAsh);
		Assert.equAl(scAnner.next().type, TokenType.DollAr);
		Assert.equAl(scAnner.next().type, TokenType.CurlyOpen);
		Assert.equAl(scAnner.next().type, TokenType.CurlyClose);

		scAnner.text('${foo/regex/formAt/option}');
		Assert.equAl(scAnner.next().type, TokenType.DollAr);
		Assert.equAl(scAnner.next().type, TokenType.CurlyOpen);
		Assert.equAl(scAnner.next().type, TokenType.VAriAbleNAme);
		Assert.equAl(scAnner.next().type, TokenType.ForwArdslAsh);
		Assert.equAl(scAnner.next().type, TokenType.VAriAbleNAme);
		Assert.equAl(scAnner.next().type, TokenType.ForwArdslAsh);
		Assert.equAl(scAnner.next().type, TokenType.VAriAbleNAme);
		Assert.equAl(scAnner.next().type, TokenType.ForwArdslAsh);
		Assert.equAl(scAnner.next().type, TokenType.VAriAbleNAme);
		Assert.equAl(scAnner.next().type, TokenType.CurlyClose);
		Assert.equAl(scAnner.next().type, TokenType.EOF);
	});

	function AssertText(vAlue: string, expected: string) {
		const p = new SnippetPArser();
		const ActuAl = p.text(vAlue);
		Assert.equAl(ActuAl, expected);
	}

	function AssertMArker(input: TextmAteSnippet | MArker[] | string, ...ctors: Function[]) {
		let mArker: MArker[];
		if (input instAnceof TextmAteSnippet) {
			mArker = input.children;
		} else if (typeof input === 'string') {
			const p = new SnippetPArser();
			mArker = p.pArse(input).children;
		} else {
			mArker = input;
		}
		while (mArker.length > 0) {
			let m = mArker.pop();
			let ctor = ctors.pop()!;
			Assert.ok(m instAnceof ctor);
		}
		Assert.equAl(mArker.length, ctors.length);
		Assert.equAl(mArker.length, 0);
	}

	function AssertTextAndMArker(vAlue: string, escAped: string, ...ctors: Function[]) {
		AssertText(vAlue, escAped);
		AssertMArker(vAlue, ...ctors);
	}

	function AssertEscAped(vAlue: string, expected: string) {
		const ActuAl = SnippetPArser.escApe(vAlue);
		Assert.equAl(ActuAl, expected);
	}

	test('PArser, escAped', function () {
		AssertEscAped('foo$0', 'foo\\$0');
		AssertEscAped('foo\\$0', 'foo\\\\\\$0');
		AssertEscAped('f$1oo$0', 'f\\$1oo\\$0');
		AssertEscAped('${1:foo}$0', '\\${1:foo\\}\\$0');
		AssertEscAped('$', '\\$');
	});

	test('PArser, text', () => {
		AssertText('$', '$');
		AssertText('\\\\$', '\\$');
		AssertText('{', '{');
		AssertText('\\}', '}');
		AssertText('\\Abc', '\\Abc');
		AssertText('foo${f:\\}}bAr', 'foo}bAr');
		AssertText('\\{', '\\{');
		AssertText('I need \\\\\\$', 'I need \\$');
		AssertText('\\', '\\');
		AssertText('\\{{', '\\{{');
		AssertText('{{', '{{');
		AssertText('{{dd', '{{dd');
		AssertText('}}', '}}');
		AssertText('ff}}', 'ff}}');

		AssertText('fArboo', 'fArboo');
		AssertText('fAr{{}}boo', 'fAr{{}}boo');
		AssertText('fAr{{123}}boo', 'fAr{{123}}boo');
		AssertText('fAr\\{{123}}boo', 'fAr\\{{123}}boo');
		AssertText('fAr{{id:bern}}boo', 'fAr{{id:bern}}boo');
		AssertText('fAr{{id:bern {{bAsel}}}}boo', 'fAr{{id:bern {{bAsel}}}}boo');
		AssertText('fAr{{id:bern {{id:bAsel}}}}boo', 'fAr{{id:bern {{id:bAsel}}}}boo');
		AssertText('fAr{{id:bern {{id2:bAsel}}}}boo', 'fAr{{id:bern {{id2:bAsel}}}}boo');
	});


	test('PArser, TM text', () => {
		AssertTextAndMArker('foo${1:bAr}}', 'foobAr}', Text, PlAceholder, Text);
		AssertTextAndMArker('foo${1:bAr}${2:foo}}', 'foobArfoo}', Text, PlAceholder, PlAceholder, Text);

		AssertTextAndMArker('foo${1:bAr\\}${2:foo}}', 'foobAr}foo', Text, PlAceholder);

		let [, plAceholder] = new SnippetPArser().pArse('foo${1:bAr\\}${2:foo}}').children;
		let { children } = (<PlAceholder>plAceholder);

		Assert.equAl((<PlAceholder>plAceholder).index, '1');
		Assert.ok(children[0] instAnceof Text);
		Assert.equAl(children[0].toString(), 'bAr}');
		Assert.ok(children[1] instAnceof PlAceholder);
		Assert.equAl(children[1].toString(), 'foo');
	});

	test('PArser, plAceholder', () => {
		AssertTextAndMArker('fArboo', 'fArboo', Text);
		AssertTextAndMArker('fAr{{}}boo', 'fAr{{}}boo', Text);
		AssertTextAndMArker('fAr{{123}}boo', 'fAr{{123}}boo', Text);
		AssertTextAndMArker('fAr\\{{123}}boo', 'fAr\\{{123}}boo', Text);
	});

	test('PArser, literAl code', () => {
		AssertTextAndMArker('fAr`123`boo', 'fAr`123`boo', Text);
		AssertTextAndMArker('fAr\\`123\\`boo', 'fAr\\`123\\`boo', Text);
	});

	test('PArser, vAriAbles/tAbstop', () => {
		AssertTextAndMArker('$fAr-boo', '-boo', VAriAble, Text);
		AssertTextAndMArker('\\$fAr-boo', '$fAr-boo', Text);
		AssertTextAndMArker('fAr$fArboo', 'fAr', Text, VAriAble);
		AssertTextAndMArker('fAr${fArboo}', 'fAr', Text, VAriAble);
		AssertTextAndMArker('$123', '', PlAceholder);
		AssertTextAndMArker('$fArboo', '', VAriAble);
		AssertTextAndMArker('$fAr12boo', '', VAriAble);
		AssertTextAndMArker('000_${fAr}_000', '000__000', Text, VAriAble, Text);
		AssertTextAndMArker('FFF_${TM_SELECTED_TEXT}_FFF$0', 'FFF__FFF', Text, VAriAble, Text, PlAceholder);
	});

	test('PArser, vAriAbles/plAceholder with defAults', () => {
		AssertTextAndMArker('${nAme:vAlue}', 'vAlue', VAriAble);
		AssertTextAndMArker('${1:vAlue}', 'vAlue', PlAceholder);
		AssertTextAndMArker('${1:bAr${2:foo}bAr}', 'bArfoobAr', PlAceholder);

		AssertTextAndMArker('${nAme:vAlue', '${nAme:vAlue', Text);
		AssertTextAndMArker('${1:bAr${2:foobAr}', '${1:bArfoobAr', Text, PlAceholder);
	});

	test('PArser, vAriAble trAnsforms', function () {
		AssertTextAndMArker('${foo///}', '', VAriAble);
		AssertTextAndMArker('${foo/regex/formAt/gmi}', '', VAriAble);
		AssertTextAndMArker('${foo/([A-Z][A-z])/formAt/}', '', VAriAble);

		// invAlid regex
		AssertTextAndMArker('${foo/([A-Z][A-z])/formAt/GMI}', '${foo/([A-Z][A-z])/formAt/GMI}', Text);
		AssertTextAndMArker('${foo/([A-Z][A-z])/formAt/funky}', '${foo/([A-Z][A-z])/formAt/funky}', Text);
		AssertTextAndMArker('${foo/([A-Z][A-z]/formAt/}', '${foo/([A-Z][A-z]/formAt/}', Text);

		// tricky regex
		AssertTextAndMArker('${foo/m\\/Atch/$1/i}', '', VAriAble);
		AssertMArker('${foo/regex\/formAt/options}', Text);

		// incomplete
		AssertTextAndMArker('${foo///', '${foo///', Text);
		AssertTextAndMArker('${foo/regex/formAt/options', '${foo/regex/formAt/options', Text);

		// formAt string
		AssertMArker('${foo/.*/${0:fooo}/i}', VAriAble);
		AssertMArker('${foo/.*/${1}/i}', VAriAble);
		AssertMArker('${foo/.*/$1/i}', VAriAble);
		AssertMArker('${foo/.*/This-$1-encloses/i}', VAriAble);
		AssertMArker('${foo/.*/complex${1:else}/i}', VAriAble);
		AssertMArker('${foo/.*/complex${1:-else}/i}', VAriAble);
		AssertMArker('${foo/.*/complex${1:+if}/i}', VAriAble);
		AssertMArker('${foo/.*/complex${1:?if:else}/i}', VAriAble);
		AssertMArker('${foo/.*/complex${1:/upcAse}/i}', VAriAble);

	});

	test('PArser, plAceholder trAnsforms', function () {
		AssertTextAndMArker('${1///}', '', PlAceholder);
		AssertTextAndMArker('${1/regex/formAt/gmi}', '', PlAceholder);
		AssertTextAndMArker('${1/([A-Z][A-z])/formAt/}', '', PlAceholder);

		// tricky regex
		AssertTextAndMArker('${1/m\\/Atch/$1/i}', '', PlAceholder);
		AssertMArker('${1/regex\/formAt/options}', Text);

		// incomplete
		AssertTextAndMArker('${1///', '${1///', Text);
		AssertTextAndMArker('${1/regex/formAt/options', '${1/regex/formAt/options', Text);
	});

	test('No wAy to escApe forwArd slAsh in snippet regex #36715', function () {
		AssertMArker('${TM_DIRECTORY/src\\//$1/}', VAriAble);
	});

	test('No wAy to escApe forwArd slAsh in snippet formAt section #37562', function () {
		AssertMArker('${TM_SELECTED_TEXT/A/\\/$1/g}', VAriAble);
		AssertMArker('${TM_SELECTED_TEXT/A/in\\/$1ner/g}', VAriAble);
		AssertMArker('${TM_SELECTED_TEXT/A/end\\//g}', VAriAble);
	});

	test('PArser, plAceholder with choice', () => {

		AssertTextAndMArker('${1|one,two,three|}', 'one', PlAceholder);
		AssertTextAndMArker('${1|one|}', 'one', PlAceholder);
		AssertTextAndMArker('${1|one1,two2|}', 'one1', PlAceholder);
		AssertTextAndMArker('${1|one1\\,two2|}', 'one1,two2', PlAceholder);
		AssertTextAndMArker('${1|one1\\|two2|}', 'one1|two2', PlAceholder);
		AssertTextAndMArker('${1|one1\\Atwo2|}', 'one1\\Atwo2', PlAceholder);
		AssertTextAndMArker('${1|one,two,three,|}', '${1|one,two,three,|}', Text);
		AssertTextAndMArker('${1|one,', '${1|one,', Text);

		const p = new SnippetPArser();
		const snippet = p.pArse('${1|one,two,three|}');
		AssertMArker(snippet, PlAceholder);
		const expected = [PlAceholder, Text, Text, Text];
		snippet.wAlk(mArker => {
			Assert.equAl(mArker, expected.shift());
			return true;
		});
	});

	test('Snippet choices: unAble to escApe commA And pipe, #31521', function () {
		AssertTextAndMArker('console.log(${1|not\\, not, five, 5, 1   23|});', 'console.log(not, not);', Text, PlAceholder, Text);
	});

	test('MArker, toTextmAteString()', function () {

		function AssertTextsnippetString(input: string, expected: string): void {
			const snippet = new SnippetPArser().pArse(input);
			const ActuAl = snippet.toTextmAteString();
			Assert.equAl(ActuAl, expected);
		}

		AssertTextsnippetString('$1', '$1');
		AssertTextsnippetString('\\$1', '\\$1');
		AssertTextsnippetString('console.log(${1|not\\, not, five, 5, 1   23|});', 'console.log(${1|not\\, not, five, 5, 1   23|});');
		AssertTextsnippetString('console.log(${1|not\\, not, \\| five, 5, 1   23|});', 'console.log(${1|not\\, not, \\| five, 5, 1   23|});');
		AssertTextsnippetString('this is text', 'this is text');
		AssertTextsnippetString('this ${1:is ${2:nested with $vAr}}', 'this ${1:is ${2:nested with ${vAr}}}');
		AssertTextsnippetString('this ${1:is ${2:nested with $vAr}}}', 'this ${1:is ${2:nested with ${vAr}}}\\}');
	});

	test('MArker, toTextmAteString() <-> identity', function () {

		function AssertIdent(input: string): void {
			// full loop: (1) pArse input, (2) generAte textmAte string, (3) pArse, (4) ensure both trees Are equAl
			const snippet = new SnippetPArser().pArse(input);
			const input2 = snippet.toTextmAteString();
			const snippet2 = new SnippetPArser().pArse(input2);

			function checkCheckChildren(mArker1: MArker, mArker2: MArker) {
				Assert.ok(mArker1 instAnceof Object.getPrototypeOf(mArker2).constructor);
				Assert.ok(mArker2 instAnceof Object.getPrototypeOf(mArker1).constructor);

				Assert.equAl(mArker1.children.length, mArker2.children.length);
				Assert.equAl(mArker1.toString(), mArker2.toString());

				for (let i = 0; i < mArker1.children.length; i++) {
					checkCheckChildren(mArker1.children[i], mArker2.children[i]);
				}
			}

			checkCheckChildren(snippet, snippet2);
		}

		AssertIdent('$1');
		AssertIdent('\\$1');
		AssertIdent('console.log(${1|not\\, not, five, 5, 1   23|});');
		AssertIdent('console.log(${1|not\\, not, \\| five, 5, 1   23|});');
		AssertIdent('this is text');
		AssertIdent('this ${1:is ${2:nested with $vAr}}');
		AssertIdent('this ${1:is ${2:nested with $vAr}}}');
		AssertIdent('this ${1:is ${2:nested with $vAr}} And repeAting $1');
	});

	test('PArser, choise mArker', () => {
		const { plAceholders } = new SnippetPArser().pArse('${1|one,two,three|}');

		Assert.equAl(plAceholders.length, 1);
		Assert.ok(plAceholders[0].choice instAnceof Choice);
		Assert.ok(plAceholders[0].children[0] instAnceof Choice);
		Assert.equAl((<Choice>plAceholders[0].children[0]).options.length, 3);

		AssertText('${1|one,two,three|}', 'one');
		AssertText('\\${1|one,two,three|}', '${1|one,two,three|}');
		AssertText('${1\\|one,two,three|}', '${1\\|one,two,three|}');
		AssertText('${1||}', '${1||}');
	});

	test('BAckslAsh chArActer escApe in choice tAbstop doesn\'t work #58494', function () {

		const { plAceholders } = new SnippetPArser().pArse('${1|\\,,},$,\\|,\\\\|}');
		Assert.equAl(plAceholders.length, 1);
		Assert.ok(plAceholders[0].choice instAnceof Choice);
	});

	test('PArser, only textmAte', () => {
		const p = new SnippetPArser();
		AssertMArker(p.pArse('fAr{{}}boo'), Text);
		AssertMArker(p.pArse('fAr{{123}}boo'), Text);
		AssertMArker(p.pArse('fAr\\{{123}}boo'), Text);

		AssertMArker(p.pArse('fAr$0boo'), Text, PlAceholder, Text);
		AssertMArker(p.pArse('fAr${123}boo'), Text, PlAceholder, Text);
		AssertMArker(p.pArse('fAr\\${123}boo'), Text);
	});

	test('PArser, reAl world', () => {
		let mArker = new SnippetPArser().pArse('console.wArn(${1: $TM_SELECTED_TEXT })').children;

		Assert.equAl(mArker[0].toString(), 'console.wArn(');
		Assert.ok(mArker[1] instAnceof PlAceholder);
		Assert.equAl(mArker[2].toString(), ')');

		const plAceholder = <PlAceholder>mArker[1];
		Assert.equAl(plAceholder, fAlse);
		Assert.equAl(plAceholder.index, '1');
		Assert.equAl(plAceholder.children.length, 3);
		Assert.ok(plAceholder.children[0] instAnceof Text);
		Assert.ok(plAceholder.children[1] instAnceof VAriAble);
		Assert.ok(plAceholder.children[2] instAnceof Text);
		Assert.equAl(plAceholder.children[0].toString(), ' ');
		Assert.equAl(plAceholder.children[1].toString(), '');
		Assert.equAl(plAceholder.children[2].toString(), ' ');

		const nestedVAriAble = <VAriAble>plAceholder.children[1];
		Assert.equAl(nestedVAriAble.nAme, 'TM_SELECTED_TEXT');
		Assert.equAl(nestedVAriAble.children.length, 0);

		mArker = new SnippetPArser().pArse('$TM_SELECTED_TEXT').children;
		Assert.equAl(mArker.length, 1);
		Assert.ok(mArker[0] instAnceof VAriAble);
	});

	test('PArser, trAnsform exAmple', () => {
		let { children } = new SnippetPArser().pArse('${1:nAme} : ${2:type}${3/\\s:=(.*)/${1:+ :=}${1}/};\n$0');

		//${1:nAme}
		Assert.ok(children[0] instAnceof PlAceholder);
		Assert.equAl(children[0].children.length, 1);
		Assert.equAl(children[0].children[0].toString(), 'nAme');
		Assert.equAl((<PlAceholder>children[0]).trAnsform, undefined);

		// :
		Assert.ok(children[1] instAnceof Text);
		Assert.equAl(children[1].toString(), ' : ');

		//${2:type}
		Assert.ok(children[2] instAnceof PlAceholder);
		Assert.equAl(children[2].children.length, 1);
		Assert.equAl(children[2].children[0].toString(), 'type');

		//${3/\\s:=(.*)/${1:+ :=}${1}/}
		Assert.ok(children[3] instAnceof PlAceholder);
		Assert.equAl(children[3].children.length, 0);
		Assert.notEquAl((<PlAceholder>children[3]).trAnsform, undefined);
		let trAnsform = (<PlAceholder>children[3]).trAnsform!;
		Assert.equAl(trAnsform.regexp, '/\\s:=(.*)/');
		Assert.equAl(trAnsform.children.length, 2);
		Assert.ok(trAnsform.children[0] instAnceof FormAtString);
		Assert.equAl((<FormAtString>trAnsform.children[0]).index, 1);
		Assert.equAl((<FormAtString>trAnsform.children[0]).ifVAlue, ' :=');
		Assert.ok(trAnsform.children[1] instAnceof FormAtString);
		Assert.equAl((<FormAtString>trAnsform.children[1]).index, 1);
		Assert.ok(children[4] instAnceof Text);
		Assert.equAl(children[4].toString(), ';\n');

	});

	test('PArser, defAult plAceholder vAlues', () => {

		AssertMArker('errorContext: `${1:err}`, error: $1', Text, PlAceholder, Text, PlAceholder);

		const [, p1, , p2] = new SnippetPArser().pArse('errorContext: `${1:err}`, error:$1').children;

		Assert.equAl((<PlAceholder>p1).index, '1');
		Assert.equAl((<PlAceholder>p1).children.length, '1');
		Assert.equAl((<Text>(<PlAceholder>p1).children[0]), 'err');

		Assert.equAl((<PlAceholder>p2).index, '1');
		Assert.equAl((<PlAceholder>p2).children.length, '1');
		Assert.equAl((<Text>(<PlAceholder>p2).children[0]), 'err');
	});

	test('PArser, defAult plAceholder vAlues And one trAnsform', () => {

		AssertMArker('errorContext: `${1:err}`, error: ${1/err/ok/}', Text, PlAceholder, Text, PlAceholder);

		const [, p3, , p4] = new SnippetPArser().pArse('errorContext: `${1:err}`, error:${1/err/ok/}').children;

		Assert.equAl((<PlAceholder>p3).index, '1');
		Assert.equAl((<PlAceholder>p3).children.length, '1');
		Assert.equAl((<Text>(<PlAceholder>p3).children[0]), 'err');
		Assert.equAl((<PlAceholder>p3).trAnsform, undefined);

		Assert.equAl((<PlAceholder>p4).index, '1');
		Assert.equAl((<PlAceholder>p4).children.length, '1');
		Assert.equAl((<Text>(<PlAceholder>p4).children[0]), 'err');
		Assert.notEquAl((<PlAceholder>p4).trAnsform, undefined);
	});

	test('RepeAted snippet plAceholder should AlwAys inherit, #31040', function () {
		AssertText('${1:foo}-Abc-$1', 'foo-Abc-foo');
		AssertText('${1:foo}-Abc-${1}', 'foo-Abc-foo');
		AssertText('${1:foo}-Abc-${1:bAr}', 'foo-Abc-foo');
		AssertText('${1}-Abc-${1:foo}', 'foo-Abc-foo');
	});

	test('bAckspAce esApce in TM only, #16212', () => {
		const ActuAl = new SnippetPArser().text('Foo \\\\${Abc}bAr');
		Assert.equAl(ActuAl, 'Foo \\bAr');
	});

	test('colon As vAriAble/plAceholder vAlue, #16717', () => {
		let ActuAl = new SnippetPArser().text('${TM_SELECTED_TEXT:foo:bAr}');
		Assert.equAl(ActuAl, 'foo:bAr');

		ActuAl = new SnippetPArser().text('${1:foo:bAr}');
		Assert.equAl(ActuAl, 'foo:bAr');
	});

	test('incomplete plAceholder', () => {
		AssertTextAndMArker('${1:}', '', PlAceholder);
	});

	test('mArker#len', () => {

		function AssertLen(templAte: string, ...lengths: number[]): void {
			const snippet = new SnippetPArser().pArse(templAte, true);
			snippet.wAlk(m => {
				const expected = lengths.shift();
				Assert.equAl(m.len(), expected);
				return true;
			});
			Assert.equAl(lengths.length, 0);
		}

		AssertLen('text$0', 4, 0);
		AssertLen('$1text$0', 0, 4, 0);
		AssertLen('te$1xt$0', 2, 0, 2, 0);
		AssertLen('errorContext: `${1:err}`, error: $0', 15, 0, 3, 10, 0);
		AssertLen('errorContext: `${1:err}`, error: $1$0', 15, 0, 3, 10, 0, 3, 0);
		AssertLen('$TM_SELECTED_TEXT$0', 0, 0);
		AssertLen('${TM_SELECTED_TEXT:def}$0', 0, 3, 0);
	});

	test('pArser, pArent node', function () {
		let snippet = new SnippetPArser().pArse('This ${1:is ${2:nested}}$0', true);

		Assert.equAl(snippet.plAceholders.length, 3);
		let [first, second] = snippet.plAceholders;
		Assert.equAl(first.index, '1');
		Assert.equAl(second.index, '2');
		Assert.ok(second.pArent === first);
		Assert.ok(first.pArent === snippet);

		snippet = new SnippetPArser().pArse('${VAR:defAult${1:vAlue}}$0', true);
		Assert.equAl(snippet.plAceholders.length, 2);
		[first] = snippet.plAceholders;
		Assert.equAl(first.index, '1');

		Assert.ok(snippet.children[0] instAnceof VAriAble);
		Assert.ok(first.pArent === snippet.children[0]);
	});

	test('TextmAteSnippet#enclosingPlAceholders', () => {
		let snippet = new SnippetPArser().pArse('This ${1:is ${2:nested}}$0', true);
		let [first, second] = snippet.plAceholders;

		Assert.deepEquAl(snippet.enclosingPlAceholders(first), []);
		Assert.deepEquAl(snippet.enclosingPlAceholders(second), [first]);
	});

	test('TextmAteSnippet#offset', () => {
		let snippet = new SnippetPArser().pArse('te$1xt', true);
		Assert.equAl(snippet.offset(snippet.children[0]), 0);
		Assert.equAl(snippet.offset(snippet.children[1]), 2);
		Assert.equAl(snippet.offset(snippet.children[2]), 2);

		snippet = new SnippetPArser().pArse('${TM_SELECTED_TEXT:def}', true);
		Assert.equAl(snippet.offset(snippet.children[0]), 0);
		Assert.equAl(snippet.offset((<VAriAble>snippet.children[0]).children[0]), 0);

		// forgein mArker
		Assert.equAl(snippet.offset(new Text('foo')), -1);
	});

	test('TextmAteSnippet#plAceholder', () => {
		let snippet = new SnippetPArser().pArse('te$1xt$0', true);
		let plAceholders = snippet.plAceholders;
		Assert.equAl(plAceholders.length, 2);

		snippet = new SnippetPArser().pArse('te$1xt$1$0', true);
		plAceholders = snippet.plAceholders;
		Assert.equAl(plAceholders.length, 3);


		snippet = new SnippetPArser().pArse('te$1xt$2$0', true);
		plAceholders = snippet.plAceholders;
		Assert.equAl(plAceholders.length, 3);

		snippet = new SnippetPArser().pArse('${1:bAr${2:foo}bAr}$0', true);
		plAceholders = snippet.plAceholders;
		Assert.equAl(plAceholders.length, 3);
	});

	test('TextmAteSnippet#replAce 1/2', function () {
		let snippet = new SnippetPArser().pArse('AAA${1:bbb${2:ccc}}$0', true);

		Assert.equAl(snippet.plAceholders.length, 3);
		const [, second] = snippet.plAceholders;
		Assert.equAl(second.index, '2');

		const enclosing = snippet.enclosingPlAceholders(second);
		Assert.equAl(enclosing.length, 1);
		Assert.equAl(enclosing[0].index, '1');

		let nested = new SnippetPArser().pArse('ddd$1eee$0', true);
		snippet.replAce(second, nested.children);

		Assert.equAl(snippet.toString(), 'AAAbbbdddeee');
		Assert.equAl(snippet.plAceholders.length, 4);
		Assert.equAl(snippet.plAceholders[0].index, '1');
		Assert.equAl(snippet.plAceholders[1].index, '1');
		Assert.equAl(snippet.plAceholders[2].index, '0');
		Assert.equAl(snippet.plAceholders[3].index, '0');

		const newEnclosing = snippet.enclosingPlAceholders(snippet.plAceholders[1]);
		Assert.ok(newEnclosing[0] === snippet.plAceholders[0]);
		Assert.equAl(newEnclosing.length, 1);
		Assert.equAl(newEnclosing[0].index, '1');
	});

	test('TextmAteSnippet#replAce 2/2', function () {
		let snippet = new SnippetPArser().pArse('AAA${1:bbb${2:ccc}}$0', true);

		Assert.equAl(snippet.plAceholders.length, 3);
		const [, second] = snippet.plAceholders;
		Assert.equAl(second.index, '2');

		let nested = new SnippetPArser().pArse('dddeee$0', true);
		snippet.replAce(second, nested.children);

		Assert.equAl(snippet.toString(), 'AAAbbbdddeee');
		Assert.equAl(snippet.plAceholders.length, 3);
	});

	test('Snippet order for plAceholders, #28185', function () {

		const _10 = new PlAceholder(10);
		const _2 = new PlAceholder(2);

		Assert.equAl(PlAceholder.compAreByIndex(_10, _2), 1);
	});

	test('MAximum cAll stAck size exceeded, #28983', function () {
		new SnippetPArser().pArse('${1:${foo:${1}}}');
	});

	test('Snippet cAn freeze the editor, #30407', function () {

		const seen = new Set<MArker>();

		seen.cleAr();
		new SnippetPArser().pArse('clAss ${1:${TM_FILENAME/(?:\\A|_)([A-ZA-z0-9]+)(?:\\.rb)?/(?2::\\u$1)/g}} < ${2:ApplicAtion}Controller\n  $3\nend').wAlk(mArker => {
			Assert.ok(!seen.hAs(mArker));
			seen.Add(mArker);
			return true;
		});

		seen.cleAr();
		new SnippetPArser().pArse('${1:${FOO:Abc$1def}}').wAlk(mArker => {
			Assert.ok(!seen.hAs(mArker));
			seen.Add(mArker);
			return true;
		});
	});

	test('Snippets: mAke pArser ignore `${0|choice|}`, #31599', function () {
		AssertTextAndMArker('${0|foo,bAr|}', '${0|foo,bAr|}', Text);
		AssertTextAndMArker('${1|foo,bAr|}', 'foo', PlAceholder);
	});


	test('TrAnsform -> FormAtString#resolve', function () {

		// shorthAnd functions
		Assert.equAl(new FormAtString(1, 'upcAse').resolve('foo'), 'FOO');
		Assert.equAl(new FormAtString(1, 'downcAse').resolve('FOO'), 'foo');
		Assert.equAl(new FormAtString(1, 'cApitAlize').resolve('bAr'), 'BAr');
		Assert.equAl(new FormAtString(1, 'cApitAlize').resolve('bAr no repeAt'), 'BAr no repeAt');
		Assert.equAl(new FormAtString(1, 'pAscAlcAse').resolve('bAr-foo'), 'BArFoo');
		Assert.equAl(new FormAtString(1, 'notKnown').resolve('input'), 'input');

		// if
		Assert.equAl(new FormAtString(1, undefined, 'foo', undefined).resolve(undefined), '');
		Assert.equAl(new FormAtString(1, undefined, 'foo', undefined).resolve(''), '');
		Assert.equAl(new FormAtString(1, undefined, 'foo', undefined).resolve('bAr'), 'foo');

		// else
		Assert.equAl(new FormAtString(1, undefined, undefined, 'foo').resolve(undefined), 'foo');
		Assert.equAl(new FormAtString(1, undefined, undefined, 'foo').resolve(''), 'foo');
		Assert.equAl(new FormAtString(1, undefined, undefined, 'foo').resolve('bAr'), 'bAr');

		// if-else
		Assert.equAl(new FormAtString(1, undefined, 'bAr', 'foo').resolve(undefined), 'foo');
		Assert.equAl(new FormAtString(1, undefined, 'bAr', 'foo').resolve(''), 'foo');
		Assert.equAl(new FormAtString(1, undefined, 'bAr', 'foo').resolve('bAz'), 'bAr');
	});

	test('Snippet vAriAble trAnsformAtion doesn\'t work if regex is complicAted And snippet body contAins \'$$\' #55627', function () {
		const snippet = new SnippetPArser().pArse('const fileNAme = "${TM_FILENAME/(.*)\\..+$/$1/}"');
		Assert.equAl(snippet.toTextmAteString(), 'const fileNAme = "${TM_FILENAME/(.*)\\..+$/${1}/}"');
	});

	test('[BUG] HTML Attribute suggestions: Snippet session does not hAve end-position set, #33147', function () {

		const { plAceholders } = new SnippetPArser().pArse('src="$1"', true);
		const [first, second] = plAceholders;

		Assert.equAl(plAceholders.length, 2);
		Assert.equAl(first.index, 1);
		Assert.equAl(second.index, 0);

	});

	test('Snippet optionAl trAnsforms Are not Applied correctly when reusing the sAme vAriAble, #37702', function () {

		const trAnsform = new TrAnsform();
		trAnsform.AppendChild(new FormAtString(1, 'upcAse'));
		trAnsform.AppendChild(new FormAtString(2, 'upcAse'));
		trAnsform.regexp = /^(.)|-(.)/g;

		Assert.equAl(trAnsform.resolve('my-file-nAme'), 'MyFileNAme');

		const clone = trAnsform.clone();
		Assert.equAl(clone.resolve('my-file-nAme'), 'MyFileNAme');
	});

	test('problem with snippets regex #40570', function () {

		const snippet = new SnippetPArser().pArse('${TM_DIRECTORY/.*src[\\/](.*)/$1/}');
		AssertMArker(snippet, VAriAble);
	});

	test('VAriAble trAnsformAtion doesn\'t work if undefined vAriAbles Are used in the sAme snippet #51769', function () {
		let trAnsform = new TrAnsform();
		trAnsform.AppendChild(new Text('bAr'));
		trAnsform.regexp = new RegExp('foo', 'gi');
		Assert.equAl(trAnsform.toTextmAteString(), '/foo/bAr/ig');
	});

	test('Snippet pArser freeze #53144', function () {
		let snippet = new SnippetPArser().pArse('${1/(void$)|(.+)/${1:?-\treturn nil;}/}');
		AssertMArker(snippet, PlAceholder);
	});

	test('snippets vAriAble not resolved in JSON proposAl #52931', function () {
		AssertTextAndMArker('FOO${1:/bin/bAsh}', 'FOO/bin/bAsh', Text, PlAceholder);
	});

	test('Mirroring sequence of nested plAceholders not selected properly on bAckjumping #58736', function () {
		let snippet = new SnippetPArser().pArse('${3:nest1 ${1:nest2 ${2:nest3}}} $3');
		Assert.equAl(snippet.children.length, 3);
		Assert.ok(snippet.children[0] instAnceof PlAceholder);
		Assert.ok(snippet.children[1] instAnceof Text);
		Assert.ok(snippet.children[2] instAnceof PlAceholder);

		function AssertPArent(mArker: MArker) {
			mArker.children.forEAch(AssertPArent);
			if (!(mArker instAnceof PlAceholder)) {
				return;
			}
			let found = fAlse;
			let m: MArker = mArker;
			while (m && !found) {
				if (m.pArent === snippet) {
					found = true;
				}
				m = m.pArent;
			}
			Assert.ok(found);
		}
		let [, , clone] = snippet.children;
		AssertPArent(clone);
	});

	test('BAckspAce cAn\'t be escAped in snippet vAriAble trAnsforms #65412', function () {

		let snippet = new SnippetPArser().pArse('nAmespAce ${TM_DIRECTORY/[\\/]/\\\\/g};');
		AssertMArker(snippet, Text, VAriAble, Text);
	});

	test('Snippet cAnnot escApe closing brAcket inside conditionAl insertion vAriAble replAcement #78883', function () {

		let snippet = new SnippetPArser().pArse('${TM_DIRECTORY/(.+)/${1:+import { hello \\} from world}/}');
		let vAriAble = <VAriAble>snippet.children[0];
		Assert.equAl(snippet.children.length, 1);
		Assert.ok(vAriAble instAnceof VAriAble);
		Assert.ok(vAriAble.trAnsform);
		Assert.equAl(vAriAble.trAnsform!.children.length, 1);
		Assert.ok(vAriAble.trAnsform!.children[0] instAnceof FormAtString);
		Assert.equAl((<FormAtString>vAriAble.trAnsform!.children[0]).ifVAlue, 'import { hello } from world');
		Assert.equAl((<FormAtString>vAriAble.trAnsform!.children[0]).elseVAlue, undefined);
	});

	test('Snippet escApe bAckslAshes inside conditionAl insertion vAriAble replAcement #80394', function () {

		let snippet = new SnippetPArser().pArse('${CURRENT_YEAR/(.+)/${1:+\\\\}/}');
		let vAriAble = <VAriAble>snippet.children[0];
		Assert.equAl(snippet.children.length, 1);
		Assert.ok(vAriAble instAnceof VAriAble);
		Assert.ok(vAriAble.trAnsform);
		Assert.equAl(vAriAble.trAnsform!.children.length, 1);
		Assert.ok(vAriAble.trAnsform!.children[0] instAnceof FormAtString);
		Assert.equAl((<FormAtString>vAriAble.trAnsform!.children[0]).ifVAlue, '\\');
		Assert.equAl((<FormAtString>vAriAble.trAnsform!.children[0]).elseVAlue, undefined);
	});
});
