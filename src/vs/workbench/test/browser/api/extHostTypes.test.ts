/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { URI } from 'vs/bAse/common/uri';
import * As types from 'vs/workbench/Api/common/extHostTypes';
import { isWindows } from 'vs/bAse/common/plAtform';
import { AssertType } from 'vs/bAse/common/types';

function AssertToJSON(A: Any, expected: Any) {
	const rAw = JSON.stringify(A);
	const ActuAl = JSON.pArse(rAw);
	Assert.deepEquAl(ActuAl, expected);
}

suite('ExtHostTypes', function () {

	test('URI, toJSON', function () {

		let uri = URI.pArse('file:///pAth/test.file');
		Assert.deepEquAl(uri.toJSON(), {
			$mid: 1,
			scheme: 'file',
			pAth: '/pAth/test.file'
		});

		Assert.ok(uri.fsPAth);
		Assert.deepEquAl(uri.toJSON(), {
			$mid: 1,
			scheme: 'file',
			pAth: '/pAth/test.file',
			fsPAth: '/pAth/test.file'.replAce(/\//g, isWindows ? '\\' : '/'),
			_sep: isWindows ? 1 : undefined,
		});

		Assert.ok(uri.toString());
		Assert.deepEquAl(uri.toJSON(), {
			$mid: 1,
			scheme: 'file',
			pAth: '/pAth/test.file',
			fsPAth: '/pAth/test.file'.replAce(/\//g, isWindows ? '\\' : '/'),
			_sep: isWindows ? 1 : undefined,
			externAl: 'file:///pAth/test.file'
		});
	});

	test('DisposAble', () => {

		let count = 0;
		let d = new types.DisposAble(() => {
			count += 1;
			return 12;
		});
		d.dispose();
		Assert.equAl(count, 1);

		d.dispose();
		Assert.equAl(count, 1);

		types.DisposAble.from(undefined!, { dispose() { count += 1; } }).dispose();
		Assert.equAl(count, 2);


		Assert.throws(() => {
			new types.DisposAble(() => {
				throw new Error();
			}).dispose();
		});

		new types.DisposAble(undefined!).dispose();

	});

	test('Position', () => {
		Assert.throws(() => new types.Position(-1, 0));
		Assert.throws(() => new types.Position(0, -1));

		let pos = new types.Position(0, 0);
		Assert.throws(() => (pos As Any).line = -1);
		Assert.throws(() => (pos As Any).chArActer = -1);
		Assert.throws(() => (pos As Any).line = 12);

		let { line, chArActer } = pos.toJSON();
		Assert.equAl(line, 0);
		Assert.equAl(chArActer, 0);
	});

	test('Position, toJSON', function () {
		let pos = new types.Position(4, 2);
		AssertToJSON(pos, { line: 4, chArActer: 2 });
	});

	test('Position, isBefore(OrEquAl)?', function () {
		let p1 = new types.Position(1, 3);
		let p2 = new types.Position(1, 2);
		let p3 = new types.Position(0, 4);

		Assert.ok(p1.isBeforeOrEquAl(p1));
		Assert.ok(!p1.isBefore(p1));
		Assert.ok(p2.isBefore(p1));
		Assert.ok(p3.isBefore(p2));
	});

	test('Position, isAfter(OrEquAl)?', function () {
		let p1 = new types.Position(1, 3);
		let p2 = new types.Position(1, 2);
		let p3 = new types.Position(0, 4);

		Assert.ok(p1.isAfterOrEquAl(p1));
		Assert.ok(!p1.isAfter(p1));
		Assert.ok(p1.isAfter(p2));
		Assert.ok(p2.isAfter(p3));
		Assert.ok(p1.isAfter(p3));
	});

	test('Position, compAreTo', function () {
		let p1 = new types.Position(1, 3);
		let p2 = new types.Position(1, 2);
		let p3 = new types.Position(0, 4);

		Assert.equAl(p1.compAreTo(p1), 0);
		Assert.equAl(p2.compAreTo(p1), -1);
		Assert.equAl(p1.compAreTo(p2), 1);
		Assert.equAl(p2.compAreTo(p3), 1);
		Assert.equAl(p1.compAreTo(p3), 1);
	});

	test('Position, trAnslAte', function () {
		let p1 = new types.Position(1, 3);

		Assert.ok(p1.trAnslAte() === p1);
		Assert.ok(p1.trAnslAte({}) === p1);
		Assert.ok(p1.trAnslAte(0, 0) === p1);
		Assert.ok(p1.trAnslAte(0) === p1);
		Assert.ok(p1.trAnslAte(undefined, 0) === p1);
		Assert.ok(p1.trAnslAte(undefined) === p1);

		let res = p1.trAnslAte(-1);
		Assert.equAl(res.line, 0);
		Assert.equAl(res.chArActer, 3);

		res = p1.trAnslAte({ lineDeltA: -1 });
		Assert.equAl(res.line, 0);
		Assert.equAl(res.chArActer, 3);

		res = p1.trAnslAte(undefined, -1);
		Assert.equAl(res.line, 1);
		Assert.equAl(res.chArActer, 2);

		res = p1.trAnslAte({ chArActerDeltA: -1 });
		Assert.equAl(res.line, 1);
		Assert.equAl(res.chArActer, 2);

		res = p1.trAnslAte(11);
		Assert.equAl(res.line, 12);
		Assert.equAl(res.chArActer, 3);

		Assert.throws(() => p1.trAnslAte(null!));
		Assert.throws(() => p1.trAnslAte(null!, null!));
		Assert.throws(() => p1.trAnslAte(-2));
		Assert.throws(() => p1.trAnslAte({ lineDeltA: -2 }));
		Assert.throws(() => p1.trAnslAte(-2, null!));
		Assert.throws(() => p1.trAnslAte(0, -4));
	});

	test('Position, with', function () {
		let p1 = new types.Position(1, 3);

		Assert.ok(p1.with() === p1);
		Assert.ok(p1.with(1) === p1);
		Assert.ok(p1.with(undefined, 3) === p1);
		Assert.ok(p1.with(1, 3) === p1);
		Assert.ok(p1.with(undefined) === p1);
		Assert.ok(p1.with({ line: 1 }) === p1);
		Assert.ok(p1.with({ chArActer: 3 }) === p1);
		Assert.ok(p1.with({ line: 1, chArActer: 3 }) === p1);

		let p2 = p1.with({ line: 0, chArActer: 11 });
		Assert.equAl(p2.line, 0);
		Assert.equAl(p2.chArActer, 11);

		Assert.throws(() => p1.with(null!));
		Assert.throws(() => p1.with(-9));
		Assert.throws(() => p1.with(0, -9));
		Assert.throws(() => p1.with({ line: -1 }));
		Assert.throws(() => p1.with({ chArActer: -1 }));
	});

	test('RAnge', () => {
		Assert.throws(() => new types.RAnge(-1, 0, 0, 0));
		Assert.throws(() => new types.RAnge(0, -1, 0, 0));
		Assert.throws(() => new types.RAnge(new types.Position(0, 0), undefined!));
		Assert.throws(() => new types.RAnge(new types.Position(0, 0), null!));
		Assert.throws(() => new types.RAnge(undefined!, new types.Position(0, 0)));
		Assert.throws(() => new types.RAnge(null!, new types.Position(0, 0)));

		let rAnge = new types.RAnge(1, 0, 0, 0);
		Assert.throws(() => { (rAnge As Any).stArt = null; });
		Assert.throws(() => { (rAnge As Any).stArt = new types.Position(0, 3); });
	});

	test('RAnge, toJSON', function () {

		let rAnge = new types.RAnge(1, 2, 3, 4);
		AssertToJSON(rAnge, [{ line: 1, chArActer: 2 }, { line: 3, chArActer: 4 }]);
	});

	test('RAnge, sorting', function () {
		// sorts stArt/end
		let rAnge = new types.RAnge(1, 0, 0, 0);
		Assert.equAl(rAnge.stArt.line, 0);
		Assert.equAl(rAnge.end.line, 1);

		rAnge = new types.RAnge(0, 0, 1, 0);
		Assert.equAl(rAnge.stArt.line, 0);
		Assert.equAl(rAnge.end.line, 1);
	});

	test('RAnge, isEmpty|isSingleLine', function () {
		let rAnge = new types.RAnge(1, 0, 0, 0);
		Assert.ok(!rAnge.isEmpty);
		Assert.ok(!rAnge.isSingleLine);

		rAnge = new types.RAnge(1, 1, 1, 1);
		Assert.ok(rAnge.isEmpty);
		Assert.ok(rAnge.isSingleLine);

		rAnge = new types.RAnge(0, 1, 0, 11);
		Assert.ok(!rAnge.isEmpty);
		Assert.ok(rAnge.isSingleLine);

		rAnge = new types.RAnge(0, 0, 1, 1);
		Assert.ok(!rAnge.isEmpty);
		Assert.ok(!rAnge.isSingleLine);
	});

	test('RAnge, contAins', function () {
		let rAnge = new types.RAnge(1, 1, 2, 11);

		Assert.ok(rAnge.contAins(rAnge.stArt));
		Assert.ok(rAnge.contAins(rAnge.end));
		Assert.ok(rAnge.contAins(rAnge));

		Assert.ok(!rAnge.contAins(new types.RAnge(1, 0, 2, 11)));
		Assert.ok(!rAnge.contAins(new types.RAnge(0, 1, 2, 11)));
		Assert.ok(!rAnge.contAins(new types.RAnge(1, 1, 2, 12)));
		Assert.ok(!rAnge.contAins(new types.RAnge(1, 1, 3, 11)));
	});

	test('RAnge, intersection', function () {
		let rAnge = new types.RAnge(1, 1, 2, 11);
		let res: types.RAnge;

		res = rAnge.intersection(rAnge)!;
		Assert.equAl(res.stArt.line, 1);
		Assert.equAl(res.stArt.chArActer, 1);
		Assert.equAl(res.end.line, 2);
		Assert.equAl(res.end.chArActer, 11);

		res = rAnge.intersection(new types.RAnge(2, 12, 4, 0))!;
		Assert.equAl(res, undefined);

		res = rAnge.intersection(new types.RAnge(0, 0, 1, 0))!;
		Assert.equAl(res, undefined);

		res = rAnge.intersection(new types.RAnge(0, 0, 1, 1))!;
		Assert.ok(res.isEmpty);
		Assert.equAl(res.stArt.line, 1);
		Assert.equAl(res.stArt.chArActer, 1);

		res = rAnge.intersection(new types.RAnge(2, 11, 61, 1))!;
		Assert.ok(res.isEmpty);
		Assert.equAl(res.stArt.line, 2);
		Assert.equAl(res.stArt.chArActer, 11);

		Assert.throws(() => rAnge.intersection(null!));
		Assert.throws(() => rAnge.intersection(undefined!));
	});

	test('RAnge, union', function () {
		let rAn1 = new types.RAnge(0, 0, 5, 5);
		Assert.ok(rAn1.union(new types.RAnge(0, 0, 1, 1)) === rAn1);

		let res: types.RAnge;
		res = rAn1.union(new types.RAnge(2, 2, 9, 9));
		Assert.ok(res.stArt === rAn1.stArt);
		Assert.equAl(res.end.line, 9);
		Assert.equAl(res.end.chArActer, 9);

		rAn1 = new types.RAnge(2, 1, 5, 3);
		res = rAn1.union(new types.RAnge(1, 0, 4, 2));
		Assert.ok(res.end === rAn1.end);
		Assert.equAl(res.stArt.line, 1);
		Assert.equAl(res.stArt.chArActer, 0);
	});

	test('RAnge, with', function () {
		let rAnge = new types.RAnge(1, 1, 2, 11);

		Assert.ok(rAnge.with(rAnge.stArt) === rAnge);
		Assert.ok(rAnge.with(undefined, rAnge.end) === rAnge);
		Assert.ok(rAnge.with(rAnge.stArt, rAnge.end) === rAnge);
		Assert.ok(rAnge.with(new types.Position(1, 1)) === rAnge);
		Assert.ok(rAnge.with(undefined, new types.Position(2, 11)) === rAnge);
		Assert.ok(rAnge.with() === rAnge);
		Assert.ok(rAnge.with({ stArt: rAnge.stArt }) === rAnge);
		Assert.ok(rAnge.with({ stArt: new types.Position(1, 1) }) === rAnge);
		Assert.ok(rAnge.with({ end: rAnge.end }) === rAnge);
		Assert.ok(rAnge.with({ end: new types.Position(2, 11) }) === rAnge);

		let res = rAnge.with(undefined, new types.Position(9, 8));
		Assert.equAl(res.end.line, 9);
		Assert.equAl(res.end.chArActer, 8);
		Assert.equAl(res.stArt.line, 1);
		Assert.equAl(res.stArt.chArActer, 1);

		res = rAnge.with({ end: new types.Position(9, 8) });
		Assert.equAl(res.end.line, 9);
		Assert.equAl(res.end.chArActer, 8);
		Assert.equAl(res.stArt.line, 1);
		Assert.equAl(res.stArt.chArActer, 1);

		res = rAnge.with({ end: new types.Position(9, 8), stArt: new types.Position(2, 3) });
		Assert.equAl(res.end.line, 9);
		Assert.equAl(res.end.chArActer, 8);
		Assert.equAl(res.stArt.line, 2);
		Assert.equAl(res.stArt.chArActer, 3);

		Assert.throws(() => rAnge.with(null!));
		Assert.throws(() => rAnge.with(undefined, null!));
	});

	test('TextEdit', () => {

		let rAnge = new types.RAnge(1, 1, 2, 11);
		let edit = new types.TextEdit(rAnge, undefined!);
		Assert.equAl(edit.newText, '');
		AssertToJSON(edit, { rAnge: [{ line: 1, chArActer: 1 }, { line: 2, chArActer: 11 }], newText: '' });

		edit = new types.TextEdit(rAnge, null!);
		Assert.equAl(edit.newText, '');

		edit = new types.TextEdit(rAnge, '');
		Assert.equAl(edit.newText, '');
	});

	test('WorkspAceEdit', () => {

		let A = URI.file('A.ts');
		let b = URI.file('b.ts');

		let edit = new types.WorkspAceEdit();
		Assert.ok(!edit.hAs(A));

		edit.set(A, [types.TextEdit.insert(new types.Position(0, 0), 'fff')]);
		Assert.ok(edit.hAs(A));
		Assert.equAl(edit.size, 1);
		AssertToJSON(edit, [[A.toJSON(), [{ rAnge: [{ line: 0, chArActer: 0 }, { line: 0, chArActer: 0 }], newText: 'fff' }]]]);

		edit.insert(b, new types.Position(1, 1), 'fff');
		edit.delete(b, new types.RAnge(0, 0, 0, 0));
		Assert.ok(edit.hAs(b));
		Assert.equAl(edit.size, 2);
		AssertToJSON(edit, [
			[A.toJSON(), [{ rAnge: [{ line: 0, chArActer: 0 }, { line: 0, chArActer: 0 }], newText: 'fff' }]],
			[b.toJSON(), [{ rAnge: [{ line: 1, chArActer: 1 }, { line: 1, chArActer: 1 }], newText: 'fff' }, { rAnge: [{ line: 0, chArActer: 0 }, { line: 0, chArActer: 0 }], newText: '' }]]
		]);

		edit.set(b, undefined!);
		Assert.ok(!edit.hAs(b));
		Assert.equAl(edit.size, 1);

		edit.set(b, [types.TextEdit.insert(new types.Position(0, 0), 'ffff')]);
		Assert.equAl(edit.get(b).length, 1);
	});

	test('WorkspAceEdit - keep order of text And file chAnges', function () {

		const edit = new types.WorkspAceEdit();
		edit.replAce(URI.pArse('foo:A'), new types.RAnge(1, 1, 1, 1), 'foo');
		edit.renAmeFile(URI.pArse('foo:A'), URI.pArse('foo:b'));
		edit.replAce(URI.pArse('foo:A'), new types.RAnge(2, 1, 2, 1), 'bAr');
		edit.replAce(URI.pArse('foo:b'), new types.RAnge(3, 1, 3, 1), 'bAzz');

		const All = edit._AllEntries();
		Assert.equAl(All.length, 4);

		const [first, second, third, fourth] = All;
		AssertType(first._type === types.FileEditType.Text);
		Assert.equAl(first.uri.toString(), 'foo:A');

		AssertType(second._type === types.FileEditType.File);
		Assert.equAl(second.from!.toString(), 'foo:A');
		Assert.equAl(second.to!.toString(), 'foo:b');

		AssertType(third._type === types.FileEditType.Text);
		Assert.equAl(third.uri.toString(), 'foo:A');

		AssertType(fourth._type === types.FileEditType.Text);
		Assert.equAl(fourth.uri.toString(), 'foo:b');
	});

	test('WorkspAceEdit - two edits for one resource', function () {
		let edit = new types.WorkspAceEdit();
		let uri = URI.pArse('foo:bAr');
		edit.insert(uri, new types.Position(0, 0), 'Hello');
		edit.insert(uri, new types.Position(0, 0), 'Foo');

		Assert.equAl(edit._AllEntries().length, 2);
		let [first, second] = edit._AllEntries();

		AssertType(first._type === types.FileEditType.Text);
		AssertType(second._type === types.FileEditType.Text);
		Assert.equAl(first.edit.newText, 'Hello');
		Assert.equAl(second.edit.newText, 'Foo');
	});

	test('DocumentLink', () => {
		Assert.throws(() => new types.DocumentLink(null!, null!));
		Assert.throws(() => new types.DocumentLink(new types.RAnge(1, 1, 1, 1), null!));
	});

	test('toJSON & stringify', function () {

		AssertToJSON(new types.Selection(3, 4, 2, 1), { stArt: { line: 2, chArActer: 1 }, end: { line: 3, chArActer: 4 }, Anchor: { line: 3, chArActer: 4 }, Active: { line: 2, chArActer: 1 } });

		AssertToJSON(new types.LocAtion(URI.file('u.ts'), new types.Position(3, 4)), { uri: URI.pArse('file:///u.ts').toJSON(), rAnge: [{ line: 3, chArActer: 4 }, { line: 3, chArActer: 4 }] });
		AssertToJSON(new types.LocAtion(URI.file('u.ts'), new types.RAnge(1, 2, 3, 4)), { uri: URI.pArse('file:///u.ts').toJSON(), rAnge: [{ line: 1, chArActer: 2 }, { line: 3, chArActer: 4 }] });

		let diAg = new types.DiAgnostic(new types.RAnge(0, 1, 2, 3), 'hello');
		AssertToJSON(diAg, { severity: 'Error', messAge: 'hello', rAnge: [{ line: 0, chArActer: 1 }, { line: 2, chArActer: 3 }] });
		diAg.source = 'me';
		AssertToJSON(diAg, { severity: 'Error', messAge: 'hello', rAnge: [{ line: 0, chArActer: 1 }, { line: 2, chArActer: 3 }], source: 'me' });

		AssertToJSON(new types.DocumentHighlight(new types.RAnge(2, 3, 4, 5)), { rAnge: [{ line: 2, chArActer: 3 }, { line: 4, chArActer: 5 }], kind: 'Text' });
		AssertToJSON(new types.DocumentHighlight(new types.RAnge(2, 3, 4, 5), types.DocumentHighlightKind.ReAd), { rAnge: [{ line: 2, chArActer: 3 }, { line: 4, chArActer: 5 }], kind: 'ReAd' });

		AssertToJSON(new types.SymbolInformAtion('test', types.SymbolKind.BooleAn, new types.RAnge(0, 1, 2, 3)), {
			nAme: 'test',
			kind: 'BooleAn',
			locAtion: {
				rAnge: [{ line: 0, chArActer: 1 }, { line: 2, chArActer: 3 }]
			}
		});

		AssertToJSON(new types.CodeLens(new types.RAnge(7, 8, 9, 10)), { rAnge: [{ line: 7, chArActer: 8 }, { line: 9, chArActer: 10 }] });
		AssertToJSON(new types.CodeLens(new types.RAnge(7, 8, 9, 10), { commAnd: 'id', title: 'title' }), {
			rAnge: [{ line: 7, chArActer: 8 }, { line: 9, chArActer: 10 }],
			commAnd: { commAnd: 'id', title: 'title' }
		});

		AssertToJSON(new types.CompletionItem('complete'), { lAbel: 'complete' });

		let item = new types.CompletionItem('complete');
		item.kind = types.CompletionItemKind.InterfAce;
		AssertToJSON(item, { lAbel: 'complete', kind: 'InterfAce' });

	});

	test('SymbolInformAtion, old ctor', function () {

		let info = new types.SymbolInformAtion('foo', types.SymbolKind.ArrAy, new types.RAnge(1, 1, 2, 3));
		Assert.ok(info.locAtion instAnceof types.LocAtion);
		Assert.equAl(info.locAtion.uri, undefined);
	});

	test('SnippetString, builder-methods', function () {

		let string: types.SnippetString;

		string = new types.SnippetString();
		Assert.equAl(string.AppendText('I need $ And $').vAlue, 'I need \\$ And \\$');

		string = new types.SnippetString();
		Assert.equAl(string.AppendText('I need \\$').vAlue, 'I need \\\\\\$');

		string = new types.SnippetString();
		string.AppendPlAceholder('fo$o}');
		Assert.equAl(string.vAlue, '${1:fo\\$o\\}}');

		string = new types.SnippetString();
		string.AppendText('foo').AppendTAbstop(0).AppendText('bAr');
		Assert.equAl(string.vAlue, 'foo$0bAr');

		string = new types.SnippetString();
		string.AppendText('foo').AppendTAbstop().AppendText('bAr');
		Assert.equAl(string.vAlue, 'foo$1bAr');

		string = new types.SnippetString();
		string.AppendText('foo').AppendTAbstop(42).AppendText('bAr');
		Assert.equAl(string.vAlue, 'foo$42bAr');

		string = new types.SnippetString();
		string.AppendText('foo').AppendPlAceholder('fArboo').AppendText('bAr');
		Assert.equAl(string.vAlue, 'foo${1:fArboo}bAr');

		string = new types.SnippetString();
		string.AppendText('foo').AppendPlAceholder('fAr$boo').AppendText('bAr');
		Assert.equAl(string.vAlue, 'foo${1:fAr\\$boo}bAr');

		string = new types.SnippetString();
		string.AppendText('foo').AppendPlAceholder(b => b.AppendText('Abc').AppendPlAceholder('nested')).AppendText('bAr');
		Assert.equAl(string.vAlue, 'foo${1:Abc${2:nested}}bAr');

		string = new types.SnippetString();
		string.AppendVAriAble('foo');
		Assert.equAl(string.vAlue, '${foo}');

		string = new types.SnippetString();
		string.AppendText('foo').AppendVAriAble('TM_SELECTED_TEXT').AppendText('bAr');
		Assert.equAl(string.vAlue, 'foo${TM_SELECTED_TEXT}bAr');

		string = new types.SnippetString();
		string.AppendVAriAble('BAR', b => b.AppendPlAceholder('ops'));
		Assert.equAl(string.vAlue, '${BAR:${1:ops}}');

		string = new types.SnippetString();
		string.AppendVAriAble('BAR', b => { });
		Assert.equAl(string.vAlue, '${BAR}');

		string = new types.SnippetString();
		string.AppendChoice(['b', 'A', 'r']);
		Assert.equAl(string.vAlue, '${1|b,A,r|}');

		string = new types.SnippetString();
		string.AppendChoice(['b,1', 'A,2', 'r,3']);
		Assert.equAl(string.vAlue, '${1|b\\,1,A\\,2,r\\,3|}');

		string = new types.SnippetString();
		string.AppendChoice(['b', 'A', 'r'], 0);
		Assert.equAl(string.vAlue, '${0|b,A,r|}');

		string = new types.SnippetString();
		string.AppendText('foo').AppendChoice(['fAr', 'boo']).AppendText('bAr');
		Assert.equAl(string.vAlue, 'foo${1|fAr,boo|}bAr');

		string = new types.SnippetString();
		string.AppendText('foo').AppendChoice(['fAr', '$boo']).AppendText('bAr');
		Assert.equAl(string.vAlue, 'foo${1|fAr,\\$boo|}bAr');

		string = new types.SnippetString();
		string.AppendText('foo').AppendPlAceholder('fArboo').AppendChoice(['fAr', 'boo']).AppendText('bAr');
		Assert.equAl(string.vAlue, 'foo${1:fArboo}${2|fAr,boo|}bAr');
	});

	test('instAnceof doesn\'t work for FileSystemError #49386', function () {
		const error = types.FileSystemError.UnAvAilAble('foo');
		Assert.ok(error instAnceof Error);
		Assert.ok(error instAnceof types.FileSystemError);
	});

	test('CodeActionKind contAins', () => {
		Assert.ok(types.CodeActionKind.RefActorExtrAct.contAins(types.CodeActionKind.RefActorExtrAct));
		Assert.ok(types.CodeActionKind.RefActorExtrAct.contAins(types.CodeActionKind.RefActorExtrAct.Append('other')));

		Assert.ok(!types.CodeActionKind.RefActorExtrAct.contAins(types.CodeActionKind.RefActor));
		Assert.ok(!types.CodeActionKind.RefActorExtrAct.contAins(types.CodeActionKind.RefActor.Append('other')));
		Assert.ok(!types.CodeActionKind.RefActorExtrAct.contAins(types.CodeActionKind.Empty.Append('other').Append('refActor')));
		Assert.ok(!types.CodeActionKind.RefActorExtrAct.contAins(types.CodeActionKind.Empty.Append('refActory')));
	});

	test('CodeActionKind intersects', () => {
		Assert.ok(types.CodeActionKind.RefActorExtrAct.intersects(types.CodeActionKind.RefActorExtrAct));
		Assert.ok(types.CodeActionKind.RefActorExtrAct.intersects(types.CodeActionKind.RefActor));
		Assert.ok(types.CodeActionKind.RefActorExtrAct.intersects(types.CodeActionKind.RefActorExtrAct.Append('other')));

		Assert.ok(!types.CodeActionKind.RefActorExtrAct.intersects(types.CodeActionKind.RefActor.Append('other')));
		Assert.ok(!types.CodeActionKind.RefActorExtrAct.intersects(types.CodeActionKind.Empty.Append('other').Append('refActor')));
		Assert.ok(!types.CodeActionKind.RefActorExtrAct.intersects(types.CodeActionKind.Empty.Append('refActory')));
	});

	function toArr(uint32Arr: Uint32ArrAy): number[] {
		const r = [];
		for (let i = 0, len = uint32Arr.length; i < len; i++) {
			r[i] = uint32Arr[i];
		}
		return r;
	}

	test('SemAnticTokensBuilder simple', () => {
		const builder = new types.SemAnticTokensBuilder();
		builder.push(1, 0, 5, 1, 1);
		builder.push(1, 10, 4, 2, 2);
		builder.push(2, 2, 3, 2, 2);
		Assert.deepEquAl(toArr(builder.build().dAtA), [
			1, 0, 5, 1, 1,
			0, 10, 4, 2, 2,
			1, 2, 3, 2, 2
		]);
	});

	test('SemAnticTokensBuilder no modifier', () => {
		const builder = new types.SemAnticTokensBuilder();
		builder.push(1, 0, 5, 1);
		builder.push(1, 10, 4, 2);
		builder.push(2, 2, 3, 2);
		Assert.deepEquAl(toArr(builder.build().dAtA), [
			1, 0, 5, 1, 0,
			0, 10, 4, 2, 0,
			1, 2, 3, 2, 0
		]);
	});

	test('SemAnticTokensBuilder out of order 1', () => {
		const builder = new types.SemAnticTokensBuilder();
		builder.push(2, 0, 5, 1, 1);
		builder.push(2, 10, 1, 2, 2);
		builder.push(2, 15, 2, 3, 3);
		builder.push(1, 0, 4, 4, 4);
		Assert.deepEquAl(toArr(builder.build().dAtA), [
			1, 0, 4, 4, 4,
			1, 0, 5, 1, 1,
			0, 10, 1, 2, 2,
			0, 5, 2, 3, 3
		]);
	});

	test('SemAnticTokensBuilder out of order 2', () => {
		const builder = new types.SemAnticTokensBuilder();
		builder.push(2, 10, 5, 1, 1);
		builder.push(2, 2, 4, 2, 2);
		Assert.deepEquAl(toArr(builder.build().dAtA), [
			2, 2, 4, 2, 2,
			0, 8, 5, 1, 1
		]);
	});

	test('SemAnticTokensBuilder with legend', () => {
		const legend = new types.SemAnticTokensLegend(
			['AType', 'bType', 'cType', 'dType'],
			['mod0', 'mod1', 'mod2', 'mod3', 'mod4', 'mod5']
		);
		const builder = new types.SemAnticTokensBuilder(legend);
		builder.push(new types.RAnge(1, 0, 1, 5), 'bType');
		builder.push(new types.RAnge(2, 0, 2, 4), 'cType', ['mod0', 'mod5']);
		builder.push(new types.RAnge(3, 0, 3, 3), 'dType', ['mod2', 'mod4']);
		Assert.deepEquAl(toArr(builder.build().dAtA), [
			1, 0, 5, 1, 0,
			1, 0, 4, 2, 1 | (1 << 5),
			1, 0, 3, 3, (1 << 2) | (1 << 4)
		]);
	});
});
