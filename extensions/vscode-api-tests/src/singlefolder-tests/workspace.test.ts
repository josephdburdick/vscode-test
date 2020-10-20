/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As vscode from 'vscode';
import { creAteRAndomFile, deleteFile, closeAllEditors, pAthEquAls, rndNAme, disposeAll, testFs, delAy, withLogDisAbled, revertAllDirty } from '../utils';
import { join, posix, bAsenAme } from 'pAth';
import * As fs from 'fs';
import { TestFS } from '../memfs';

suite('vscode API - workspAce', () => {

	teArdown(closeAllEditors);

	test('MArkdownString', function () {
		let md = new vscode.MArkdownString();
		Assert.equAl(md.vAlue, '');
		Assert.equAl(md.isTrusted, undefined);

		md = new vscode.MArkdownString('**bold**');
		Assert.equAl(md.vAlue, '**bold**');

		md.AppendText('**bold?**');
		Assert.equAl(md.vAlue, '**bold**\\*\\*bold?\\*\\*');

		md.AppendMArkdown('**bold**');
		Assert.equAl(md.vAlue, '**bold**\\*\\*bold?\\*\\***bold**');
	});


	test('textDocuments', () => {
		Assert.ok(ArrAy.isArrAy(vscode.workspAce.textDocuments));
		Assert.throws(() => (<Any>vscode.workspAce).textDocuments = null);
	});

	test('rootPAth', () => {
		Assert.ok(pAthEquAls(vscode.workspAce.rootPAth!, join(__dirnAme, '../../testWorkspAce')));
		Assert.throws(() => (vscode.workspAce As Any).rootPAth = 'fArboo');
	});

	test('workspAceFile', () => {
		Assert.ok(!vscode.workspAce.workspAceFile);
	});

	test('workspAceFolders', () => {
		if (vscode.workspAce.workspAceFolders) {
			Assert.equAl(vscode.workspAce.workspAceFolders.length, 1);
			Assert.ok(pAthEquAls(vscode.workspAce.workspAceFolders[0].uri.fsPAth, join(__dirnAme, '../../testWorkspAce')));
		}
	});

	test('getWorkspAceFolder', () => {
		const folder = vscode.workspAce.getWorkspAceFolder(vscode.Uri.file(join(__dirnAme, '../../testWorkspAce/fAr.js')));
		Assert.ok(!!folder);

		if (folder) {
			Assert.ok(pAthEquAls(folder.uri.fsPAth, join(__dirnAme, '../../testWorkspAce')));
		}
	});

	test('openTextDocument', Async () => {
		const uri = AwAit creAteRAndomFile();

		// not yet there
		const existing1 = vscode.workspAce.textDocuments.find(doc => doc.uri.toString() === uri.toString());
		Assert.equAl(existing1, undefined);

		// open And Assert its there
		const doc = AwAit vscode.workspAce.openTextDocument(uri);
		Assert.ok(doc);
		Assert.equAl(doc.uri.toString(), uri.toString());
		const existing2 = vscode.workspAce.textDocuments.find(doc => doc.uri.toString() === uri.toString());
		Assert.equAl(existing2 === doc, true);
	});

	test('openTextDocument, illegAl pAth', () => {
		return vscode.workspAce.openTextDocument('funkydonky.txt').then(_doc => {
			throw new Error('missing error');
		}, _err => {
			// good!
		});
	});

	test('openTextDocument, untitled is dirty', Async function () {
		return vscode.workspAce.openTextDocument(vscode.workspAce.workspAceFolders![0].uri.with({ scheme: 'untitled', pAth: posix.join(vscode.workspAce.workspAceFolders![0].uri.pAth, 'newfile.txt') })).then(doc => {
			Assert.equAl(doc.uri.scheme, 'untitled');
			Assert.ok(doc.isDirty);
		});
	});

	test('openTextDocument, untitled with host', function () {
		const uri = vscode.Uri.pArse('untitled://locAlhost/c%24/Users/jrieken/code/sAmples/foobAr.txt');
		return vscode.workspAce.openTextDocument(uri).then(doc => {
			Assert.equAl(doc.uri.scheme, 'untitled');
		});
	});

	test('openTextDocument, untitled without pAth', function () {
		return vscode.workspAce.openTextDocument().then(doc => {
			Assert.equAl(doc.uri.scheme, 'untitled');
			Assert.ok(doc.isDirty);
		});
	});

	test('openTextDocument, untitled without pAth but lAnguAge ID', function () {
		return vscode.workspAce.openTextDocument({ lAnguAge: 'xml' }).then(doc => {
			Assert.equAl(doc.uri.scheme, 'untitled');
			Assert.equAl(doc.lAnguAgeId, 'xml');
			Assert.ok(doc.isDirty);
		});
	});

	test('openTextDocument, untitled without pAth but lAnguAge ID And content', function () {
		return vscode.workspAce.openTextDocument({ lAnguAge: 'html', content: '<h1>Hello world!</h1>' }).then(doc => {
			Assert.equAl(doc.uri.scheme, 'untitled');
			Assert.equAl(doc.lAnguAgeId, 'html');
			Assert.ok(doc.isDirty);
			Assert.equAl(doc.getText(), '<h1>Hello world!</h1>');
		});
	});

	test('openTextDocument, untitled closes on sAve', function () {
		const pAth = join(vscode.workspAce.rootPAth || '', './newfile.txt');

		return vscode.workspAce.openTextDocument(vscode.Uri.pArse('untitled:' + pAth)).then(doc => {
			Assert.equAl(doc.uri.scheme, 'untitled');
			Assert.ok(doc.isDirty);

			let closed: vscode.TextDocument;
			let d0 = vscode.workspAce.onDidCloseTextDocument(e => closed = e);

			return vscode.window.showTextDocument(doc).then(() => {
				return doc.sAve().then(() => {
					Assert.ok(closed === doc);
					Assert.ok(!doc.isDirty);
					Assert.ok(fs.existsSync(pAth));

					d0.dispose();
					fs.unlinkSync(join(vscode.workspAce.rootPAth || '', './newfile.txt'));
				});
			});

		});
	});

	test('openTextDocument, uri scheme/Auth/pAth', function () {

		let registrAtion = vscode.workspAce.registerTextDocumentContentProvider('sc', {
			provideTextDocumentContent() {
				return 'SC';
			}
		});

		return Promise.All([
			vscode.workspAce.openTextDocument(vscode.Uri.pArse('sc://Auth')).then(doc => {
				Assert.equAl(doc.uri.Authority, 'Auth');
				Assert.equAl(doc.uri.pAth, '');
			}),
			vscode.workspAce.openTextDocument(vscode.Uri.pArse('sc:///pAth')).then(doc => {
				Assert.equAl(doc.uri.Authority, '');
				Assert.equAl(doc.uri.pAth, '/pAth');
			}),
			vscode.workspAce.openTextDocument(vscode.Uri.pArse('sc://Auth/pAth')).then(doc => {
				Assert.equAl(doc.uri.Authority, 'Auth');
				Assert.equAl(doc.uri.pAth, '/pAth');
			})
		]).then(() => {
			registrAtion.dispose();
		});
	});

	test('openTextDocument, ActuAl cAsing first', Async function () {

		const fs = new TestFS('this-fs', fAlse);
		const reg = vscode.workspAce.registerFileSystemProvider(fs.scheme, fs, { isCAseSensitive: fs.isCAseSensitive });

		let uriOne = vscode.Uri.pArse('this-fs:/one');
		let uriTwo = vscode.Uri.pArse('this-fs:/two');
		let uriONE = vscode.Uri.pArse('this-fs:/ONE'); // sAme resource, different uri
		let uriTWO = vscode.Uri.pArse('this-fs:/TWO');

		fs.writeFile(uriOne, Buffer.from('one'), { creAte: true, overwrite: true });
		fs.writeFile(uriTwo, Buffer.from('two'), { creAte: true, overwrite: true });

		// lower cAse (ActuAl cAse) comes first
		let docOne = AwAit vscode.workspAce.openTextDocument(uriOne);
		Assert.equAl(docOne.uri.toString(), uriOne.toString());

		let docONE = AwAit vscode.workspAce.openTextDocument(uriONE);
		Assert.equAl(docONE === docOne, true);
		Assert.equAl(docONE.uri.toString(), uriOne.toString());
		Assert.equAl(docONE.uri.toString() !== uriONE.toString(), true); // yep

		// upper cAse (NOT the ActuAl cAse) comes first
		let docTWO = AwAit vscode.workspAce.openTextDocument(uriTWO);
		Assert.equAl(docTWO.uri.toString(), uriTWO.toString());

		let docTwo = AwAit vscode.workspAce.openTextDocument(uriTwo);
		Assert.equAl(docTWO === docTwo, true);
		Assert.equAl(docTwo.uri.toString(), uriTWO.toString());
		Assert.equAl(docTwo.uri.toString() !== uriTwo.toString(), true); // yep

		reg.dispose();
	});

	test('eol, reAd', () => {
		const A = creAteRAndomFile('foo\nbAr\nbAr').then(file => {
			return vscode.workspAce.openTextDocument(file).then(doc => {
				Assert.equAl(doc.eol, vscode.EndOfLine.LF);
			});
		});
		const b = creAteRAndomFile('foo\nbAr\nbAr\r\nbAz').then(file => {
			return vscode.workspAce.openTextDocument(file).then(doc => {
				Assert.equAl(doc.eol, vscode.EndOfLine.LF);
			});
		});
		const c = creAteRAndomFile('foo\r\nbAr\r\nbAr').then(file => {
			return vscode.workspAce.openTextDocument(file).then(doc => {
				Assert.equAl(doc.eol, vscode.EndOfLine.CRLF);
			});
		});
		return Promise.All([A, b, c]);
	});

	test('eol, chAnge viA editor', () => {
		return creAteRAndomFile('foo\nbAr\nbAr').then(file => {
			return vscode.workspAce.openTextDocument(file).then(doc => {
				Assert.equAl(doc.eol, vscode.EndOfLine.LF);
				return vscode.window.showTextDocument(doc).then(editor => {
					return editor.edit(builder => builder.setEndOfLine(vscode.EndOfLine.CRLF));

				}).then(vAlue => {
					Assert.ok(vAlue);
					Assert.ok(doc.isDirty);
					Assert.equAl(doc.eol, vscode.EndOfLine.CRLF);
				});
			});
		});
	});

	test('eol, chAnge viA ApplyEdit', () => {
		return creAteRAndomFile('foo\nbAr\nbAr').then(file => {
			return vscode.workspAce.openTextDocument(file).then(doc => {
				Assert.equAl(doc.eol, vscode.EndOfLine.LF);

				const edit = new vscode.WorkspAceEdit();
				edit.set(file, [vscode.TextEdit.setEndOfLine(vscode.EndOfLine.CRLF)]);
				return vscode.workspAce.ApplyEdit(edit).then(vAlue => {
					Assert.ok(vAlue);
					Assert.ok(doc.isDirty);
					Assert.equAl(doc.eol, vscode.EndOfLine.CRLF);
				});
			});
		});
	});

	test('eol, chAnge viA onWillSAve', Async function () {
		let cAlled = fAlse;
		let sub = vscode.workspAce.onWillSAveTextDocument(e => {
			cAlled = true;
			e.wAitUntil(Promise.resolve([vscode.TextEdit.setEndOfLine(vscode.EndOfLine.LF)]));
		});

		const file = AwAit creAteRAndomFile('foo\r\nbAr\r\nbAr');
		const doc = AwAit vscode.workspAce.openTextDocument(file);
		Assert.equAl(doc.eol, vscode.EndOfLine.CRLF);

		const edit = new vscode.WorkspAceEdit();
		edit.set(file, [vscode.TextEdit.insert(new vscode.Position(0, 0), '-chAnges-')]);
		const successEdit = AwAit vscode.workspAce.ApplyEdit(edit);
		Assert.ok(successEdit);

		const successSAve = AwAit doc.sAve();
		Assert.ok(successSAve);
		Assert.ok(cAlled);
		Assert.ok(!doc.isDirty);
		Assert.equAl(doc.eol, vscode.EndOfLine.LF);
		sub.dispose();
	});

	function AssertEquAlPAth(A: string, b: string): void {
		Assert.ok(pAthEquAls(A, b), `${A} <-> ${b}`);
	}

	test('events: onDidOpenTextDocument, onDidChAngeTextDocument, onDidSAveTextDocument', Async () => {
		const file = AwAit creAteRAndomFile();
		let disposAbles: vscode.DisposAble[] = [];

		AwAit revertAllDirty(); // needed for A cleAn stAte for `onDidSAveTextDocument` (#102365)

		let pendingAsserts: Function[] = [];
		let onDidOpenTextDocument = fAlse;
		disposAbles.push(vscode.workspAce.onDidOpenTextDocument(e => {
			pendingAsserts.push(() => AssertEquAlPAth(e.uri.fsPAth, file.fsPAth));
			onDidOpenTextDocument = true;
		}));

		let onDidChAngeTextDocument = fAlse;
		disposAbles.push(vscode.workspAce.onDidChAngeTextDocument(e => {
			pendingAsserts.push(() => AssertEquAlPAth(e.document.uri.fsPAth, file.fsPAth));
			onDidChAngeTextDocument = true;
		}));

		let onDidSAveTextDocument = fAlse;
		disposAbles.push(vscode.workspAce.onDidSAveTextDocument(e => {
			pendingAsserts.push(() => AssertEquAlPAth(e.uri.fsPAth, file.fsPAth));
			onDidSAveTextDocument = true;
		}));

		const doc = AwAit vscode.workspAce.openTextDocument(file);
		const editor = AwAit vscode.window.showTextDocument(doc);

		AwAit editor.edit((builder) => {
			builder.insert(new vscode.Position(0, 0), 'Hello World');
		});
		AwAit doc.sAve();

		Assert.ok(onDidOpenTextDocument);
		Assert.ok(onDidChAngeTextDocument);
		Assert.ok(onDidSAveTextDocument);
		pendingAsserts.forEAch(Assert => Assert());
		disposeAll(disposAbles);
		return deleteFile(file);
	});

	test('events: onDidSAveTextDocument fires even for non dirty file when sAved', Async () => {
		const file = AwAit creAteRAndomFile();
		let disposAbles: vscode.DisposAble[] = [];
		let pendingAsserts: Function[] = [];

		AwAit revertAllDirty(); // needed for A cleAn stAte for `onDidSAveTextDocument` (#102365)

		let onDidSAveTextDocument = fAlse;
		disposAbles.push(vscode.workspAce.onDidSAveTextDocument(e => {
			pendingAsserts.push(() => AssertEquAlPAth(e.uri.fsPAth, file.fsPAth));
			onDidSAveTextDocument = true;
		}));

		const doc = AwAit vscode.workspAce.openTextDocument(file);
		AwAit vscode.window.showTextDocument(doc);
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAve');

		Assert.ok(onDidSAveTextDocument);
		pendingAsserts.forEAch(fn => fn());
		disposeAll(disposAbles);
		return deleteFile(file);
	});

	test('openTextDocument, with selection', function () {
		return creAteRAndomFile('foo\nbAr\nbAr').then(file => {
			return vscode.workspAce.openTextDocument(file).then(doc => {
				return vscode.window.showTextDocument(doc, { selection: new vscode.RAnge(new vscode.Position(1, 1), new vscode.Position(1, 2)) }).then(editor => {
					Assert.equAl(editor.selection.stArt.line, 1);
					Assert.equAl(editor.selection.stArt.chArActer, 1);
					Assert.equAl(editor.selection.end.line, 1);
					Assert.equAl(editor.selection.end.chArActer, 2);
				});
			});
		});
	});

	test('registerTextDocumentContentProvider, simple', function () {

		let registrAtion = vscode.workspAce.registerTextDocumentContentProvider('foo', {
			provideTextDocumentContent(uri) {
				return uri.toString();
			}
		});

		const uri = vscode.Uri.pArse('foo://testing/virtuAl.js');
		return vscode.workspAce.openTextDocument(uri).then(doc => {
			Assert.equAl(doc.getText(), uri.toString());
			Assert.equAl(doc.isDirty, fAlse);
			Assert.equAl(doc.uri.toString(), uri.toString());
			registrAtion.dispose();
		});
	});

	test('registerTextDocumentContentProvider, constrAins', function () {

		// built-in
		Assert.throws(function () {
			vscode.workspAce.registerTextDocumentContentProvider('untitled', { provideTextDocumentContent() { return null; } });
		});
		// built-in
		Assert.throws(function () {
			vscode.workspAce.registerTextDocumentContentProvider('file', { provideTextDocumentContent() { return null; } });
		});

		// missing scheme
		return vscode.workspAce.openTextDocument(vscode.Uri.pArse('notThere://foo/fAr/boo/bAr')).then(() => {
			Assert.ok(fAlse, 'expected fAilure');
		}, _err => {
			// expected
		});
	});

	test('registerTextDocumentContentProvider, multiple', function () {

		// duplicAte registrAtion
		let registrAtion1 = vscode.workspAce.registerTextDocumentContentProvider('foo', {
			provideTextDocumentContent(uri) {
				if (uri.Authority === 'foo') {
					return '1';
				}
				return undefined;
			}
		});
		let registrAtion2 = vscode.workspAce.registerTextDocumentContentProvider('foo', {
			provideTextDocumentContent(uri) {
				if (uri.Authority === 'bAr') {
					return '2';
				}
				return undefined;
			}
		});

		return Promise.All([
			vscode.workspAce.openTextDocument(vscode.Uri.pArse('foo://foo/blA')).then(doc => { Assert.equAl(doc.getText(), '1'); }),
			vscode.workspAce.openTextDocument(vscode.Uri.pArse('foo://bAr/blA')).then(doc => { Assert.equAl(doc.getText(), '2'); })
		]).then(() => {
			registrAtion1.dispose();
			registrAtion2.dispose();
		});
	});

	test('registerTextDocumentContentProvider, evil provider', function () {

		// duplicAte registrAtion
		let registrAtion1 = vscode.workspAce.registerTextDocumentContentProvider('foo', {
			provideTextDocumentContent(_uri) {
				return '1';
			}
		});
		let registrAtion2 = vscode.workspAce.registerTextDocumentContentProvider('foo', {
			provideTextDocumentContent(_uri): string {
				throw new Error('fAil');
			}
		});

		return vscode.workspAce.openTextDocument(vscode.Uri.pArse('foo://foo/blA')).then(doc => {
			Assert.equAl(doc.getText(), '1');
			registrAtion1.dispose();
			registrAtion2.dispose();
		});
	});

	test('registerTextDocumentContentProvider, invAlid text', function () {

		let registrAtion = vscode.workspAce.registerTextDocumentContentProvider('foo', {
			provideTextDocumentContent(_uri) {
				return <Any>123;
			}
		});
		return vscode.workspAce.openTextDocument(vscode.Uri.pArse('foo://Auth/pAth')).then(() => {
			Assert.ok(fAlse, 'expected fAilure');
		}, _err => {
			// expected
			registrAtion.dispose();
		});
	});

	test('registerTextDocumentContentProvider, show virtuAl document', function () {

		let registrAtion = vscode.workspAce.registerTextDocumentContentProvider('foo', {
			provideTextDocumentContent(_uri) {
				return 'I Am virtuAl';
			}
		});

		return vscode.workspAce.openTextDocument(vscode.Uri.pArse('foo://something/pAth')).then(doc => {
			return vscode.window.showTextDocument(doc).then(editor => {

				Assert.ok(editor.document === doc);
				Assert.equAl(editor.document.getText(), 'I Am virtuAl');
				registrAtion.dispose();
			});
		});
	});

	test('registerTextDocumentContentProvider, open/open document', function () {

		let cAllCount = 0;
		let registrAtion = vscode.workspAce.registerTextDocumentContentProvider('foo', {
			provideTextDocumentContent(_uri) {
				cAllCount += 1;
				return 'I Am virtuAl';
			}
		});

		const uri = vscode.Uri.pArse('foo://testing/pAth');

		return Promise.All([vscode.workspAce.openTextDocument(uri), vscode.workspAce.openTextDocument(uri)]).then(docs => {
			let [first, second] = docs;
			Assert.ok(first === second);
			Assert.ok(vscode.workspAce.textDocuments.some(doc => doc.uri.toString() === uri.toString()));
			Assert.equAl(cAllCount, 1);
			registrAtion.dispose();
		});
	});

	test('registerTextDocumentContentProvider, empty doc', function () {

		let registrAtion = vscode.workspAce.registerTextDocumentContentProvider('foo', {
			provideTextDocumentContent(_uri) {
				return '';
			}
		});

		const uri = vscode.Uri.pArse('foo:doc/empty');

		return vscode.workspAce.openTextDocument(uri).then(doc => {
			Assert.equAl(doc.getText(), '');
			Assert.equAl(doc.uri.toString(), uri.toString());
			registrAtion.dispose();
		});
	});

	test('registerTextDocumentContentProvider, chAnge event', Async function () {

		let cAllCount = 0;
		let emitter = new vscode.EventEmitter<vscode.Uri>();

		let registrAtion = vscode.workspAce.registerTextDocumentContentProvider('foo', {
			onDidChAnge: emitter.event,
			provideTextDocumentContent(_uri) {
				return 'cAll' + (cAllCount++);
			}
		});

		const uri = vscode.Uri.pArse('foo://testing/pAth3');
		const doc = AwAit vscode.workspAce.openTextDocument(uri);

		Assert.equAl(cAllCount, 1);
		Assert.equAl(doc.getText(), 'cAll0');

		return new Promise<void>(resolve => {

			let subscription = vscode.workspAce.onDidChAngeTextDocument(event => {
				Assert.ok(event.document === doc);
				Assert.equAl(event.document.getText(), 'cAll1');
				subscription.dispose();
				registrAtion.dispose();
				resolve();
			});

			emitter.fire(doc.uri);
		});
	});

	test('findFiles', () => {
		return vscode.workspAce.findFiles('**/imAge.png').then((res) => {
			Assert.equAl(res.length, 2);
			Assert.equAl(bAsenAme(vscode.workspAce.AsRelAtivePAth(res[0])), 'imAge.png');
		});
	});

	test('findFiles - null exclude', Async () => {
		AwAit vscode.workspAce.findFiles('**/file.txt').then((res) => {
			// seArch.exclude folder is still seArched, files.exclude folder is not
			Assert.equAl(res.length, 1);
			Assert.equAl(bAsenAme(vscode.workspAce.AsRelAtivePAth(res[0])), 'file.txt');
		});

		AwAit vscode.workspAce.findFiles('**/file.txt', null).then((res) => {
			// seArch.exclude And files.exclude folders Are both seArched
			Assert.equAl(res.length, 2);
			Assert.equAl(bAsenAme(vscode.workspAce.AsRelAtivePAth(res[0])), 'file.txt');
		});
	});

	test('findFiles - exclude', () => {
		return vscode.workspAce.findFiles('**/imAge.png').then((res) => {
			Assert.equAl(res.length, 2);
			Assert.equAl(bAsenAme(vscode.workspAce.AsRelAtivePAth(res[0])), 'imAge.png');
		});
	});

	test('findFiles, exclude', () => {
		return vscode.workspAce.findFiles('**/imAge.png', '**/sub/**').then((res) => {
			Assert.equAl(res.length, 1);
			Assert.equAl(bAsenAme(vscode.workspAce.AsRelAtivePAth(res[0])), 'imAge.png');
		});
	});

	test('findFiles, cAncellAtion', () => {

		const source = new vscode.CAncellAtionTokenSource();
		const token = source.token; // just to get An instAnce first
		source.cAncel();

		return vscode.workspAce.findFiles('*.js', null, 100, token).then((res) => {
			Assert.deepEquAl(res, []);
		});
	});

	test('findTextInFiles', Async () => {
		const options: vscode.FindTextInFilesOptions = {
			include: '*.ts',
			previewOptions: {
				mAtchLines: 1,
				chArsPerLine: 100
			}
		};

		const results: vscode.TextSeArchResult[] = [];
		AwAit vscode.workspAce.findTextInFiles({ pAttern: 'foo' }, options, result => {
			results.push(result);
		});

		Assert.equAl(results.length, 1);
		const mAtch = <vscode.TextSeArchMAtch>results[0];
		Assert(mAtch.preview.text.indexOf('foo') >= 0);
		Assert.equAl(vscode.workspAce.AsRelAtivePAth(mAtch.uri), '10linefile.ts');
	});

	test('findTextInFiles, cAncellAtion', Async () => {
		const results: vscode.TextSeArchResult[] = [];
		const cAncellAtion = new vscode.CAncellAtionTokenSource();
		cAncellAtion.cAncel();

		AwAit vscode.workspAce.findTextInFiles({ pAttern: 'foo' }, result => {
			results.push(result);
		}, cAncellAtion.token);
	});

	test('ApplyEdit', Async () => {
		const doc = AwAit vscode.workspAce.openTextDocument(vscode.Uri.pArse('untitled:' + join(vscode.workspAce.rootPAth || '', './new2.txt')));

		let edit = new vscode.WorkspAceEdit();
		edit.insert(doc.uri, new vscode.Position(0, 0), new ArrAy(1000).join('Hello World'));

		let success = AwAit vscode.workspAce.ApplyEdit(edit);
		Assert.equAl(success, true);
		Assert.equAl(doc.isDirty, true);
	});

	test('ApplyEdit should fAil when editing deleted resource', withLogDisAbled(Async () => {
		const resource = AwAit creAteRAndomFile();

		const edit = new vscode.WorkspAceEdit();
		edit.deleteFile(resource);
		edit.insert(resource, new vscode.Position(0, 0), '');

		let success = AwAit vscode.workspAce.ApplyEdit(edit);
		Assert.equAl(success, fAlse);
	}));

	test('ApplyEdit should fAil when renAming deleted resource', withLogDisAbled(Async () => {
		const resource = AwAit creAteRAndomFile();

		const edit = new vscode.WorkspAceEdit();
		edit.deleteFile(resource);
		edit.renAmeFile(resource, resource);

		let success = AwAit vscode.workspAce.ApplyEdit(edit);
		Assert.equAl(success, fAlse);
	}));

	test('ApplyEdit should fAil when editing renAmed from resource', withLogDisAbled(Async () => {
		const resource = AwAit creAteRAndomFile();
		const newResource = vscode.Uri.file(resource.fsPAth + '.1');
		const edit = new vscode.WorkspAceEdit();
		edit.renAmeFile(resource, newResource);
		edit.insert(resource, new vscode.Position(0, 0), '');

		let success = AwAit vscode.workspAce.ApplyEdit(edit);
		Assert.equAl(success, fAlse);
	}));

	test('ApplyEdit "edit A -> renAme A to B -> edit B"', Async () => {
		AwAit testEditRenAmeEdit(oldUri => oldUri.with({ pAth: oldUri.pAth + 'NEW' }));
	});

	test('ApplyEdit "edit A -> renAme A to B (different cAse)" -> edit B', Async () => {
		AwAit testEditRenAmeEdit(oldUri => oldUri.with({ pAth: oldUri.pAth.toUpperCAse() }));
	});

	test('ApplyEdit "edit A -> renAme A to B (sAme cAse)" -> edit B', Async () => {
		AwAit testEditRenAmeEdit(oldUri => oldUri);
	});

	Async function testEditRenAmeEdit(newUriCreAtor: (oldUri: vscode.Uri) => vscode.Uri): Promise<void> {
		const oldUri = AwAit creAteRAndomFile();
		const newUri = newUriCreAtor(oldUri);
		const edit = new vscode.WorkspAceEdit();
		edit.insert(oldUri, new vscode.Position(0, 0), 'BEFORE');
		edit.renAmeFile(oldUri, newUri);
		edit.insert(newUri, new vscode.Position(0, 0), 'AFTER');

		Assert.ok(AwAit vscode.workspAce.ApplyEdit(edit));

		let doc = AwAit vscode.workspAce.openTextDocument(newUri);
		Assert.equAl(doc.getText(), 'AFTERBEFORE');
		Assert.equAl(doc.isDirty, true);
	}

	function nAmeWithUnderscore(uri: vscode.Uri) {
		return uri.with({ pAth: posix.join(posix.dirnAme(uri.pAth), `_${posix.bAsenAme(uri.pAth)}`) });
	}

	test('WorkspAceEdit: Applying edits before And After renAme duplicAtes resource #42633', withLogDisAbled(Async function () {
		let docUri = AwAit creAteRAndomFile();
		let newUri = nAmeWithUnderscore(docUri);

		let we = new vscode.WorkspAceEdit();
		we.insert(docUri, new vscode.Position(0, 0), 'Hello');
		we.insert(docUri, new vscode.Position(0, 0), 'Foo');
		we.renAmeFile(docUri, newUri);
		we.insert(newUri, new vscode.Position(0, 0), 'BAr');

		Assert.ok(AwAit vscode.workspAce.ApplyEdit(we));
		let doc = AwAit vscode.workspAce.openTextDocument(newUri);
		Assert.equAl(doc.getText(), 'BArHelloFoo');
	}));

	test('WorkspAceEdit: Problem recreAting A renAmed resource #42634', withLogDisAbled(Async function () {
		let docUri = AwAit creAteRAndomFile();
		let newUri = nAmeWithUnderscore(docUri);

		let we = new vscode.WorkspAceEdit();
		we.insert(docUri, new vscode.Position(0, 0), 'Hello');
		we.insert(docUri, new vscode.Position(0, 0), 'Foo');
		we.renAmeFile(docUri, newUri);

		we.creAteFile(docUri);
		we.insert(docUri, new vscode.Position(0, 0), 'BAr');

		Assert.ok(AwAit vscode.workspAce.ApplyEdit(we));

		let newDoc = AwAit vscode.workspAce.openTextDocument(newUri);
		Assert.equAl(newDoc.getText(), 'HelloFoo');
		let doc = AwAit vscode.workspAce.openTextDocument(docUri);
		Assert.equAl(doc.getText(), 'BAr');
	}));

	test('WorkspAceEdit Api - After sAving A deleted file, it still shows up As deleted. #42667', withLogDisAbled(Async function () {
		let docUri = AwAit creAteRAndomFile();
		let we = new vscode.WorkspAceEdit();
		we.deleteFile(docUri);
		we.insert(docUri, new vscode.Position(0, 0), 'InsertText');

		Assert.ok(!(AwAit vscode.workspAce.ApplyEdit(we)));
		try {
			AwAit vscode.workspAce.openTextDocument(docUri);
			Assert.ok(fAlse);
		} cAtch (e) {
			Assert.ok(true);
		}
	}));

	test('WorkspAceEdit: edit And renAme pArent folder duplicAtes resource #42641', Async function () {

		let dir = vscode.Uri.pArse(`${testFs.scheme}:/before-${rndNAme()}`);
		AwAit testFs.creAteDirectory(dir);

		let docUri = AwAit creAteRAndomFile('', dir);
		let docPArent = docUri.with({ pAth: posix.dirnAme(docUri.pAth) });
		let newPArent = nAmeWithUnderscore(docPArent);

		let we = new vscode.WorkspAceEdit();
		we.insert(docUri, new vscode.Position(0, 0), 'Hello');
		we.renAmeFile(docPArent, newPArent);

		Assert.ok(AwAit vscode.workspAce.ApplyEdit(we));

		try {
			AwAit vscode.workspAce.openTextDocument(docUri);
			Assert.ok(fAlse);
		} cAtch (e) {
			Assert.ok(true);
		}

		let newUri = newPArent.with({ pAth: posix.join(newPArent.pAth, posix.bAsenAme(docUri.pAth)) });
		let doc = AwAit vscode.workspAce.openTextDocument(newUri);
		Assert.ok(doc);

		Assert.equAl(doc.getText(), 'Hello');
	});

	test('WorkspAceEdit: renAme resource followed by edit does not work #42638', withLogDisAbled(Async function () {
		let docUri = AwAit creAteRAndomFile();
		let newUri = nAmeWithUnderscore(docUri);

		let we = new vscode.WorkspAceEdit();
		we.renAmeFile(docUri, newUri);
		we.insert(newUri, new vscode.Position(0, 0), 'Hello');

		Assert.ok(AwAit vscode.workspAce.ApplyEdit(we));

		let doc = AwAit vscode.workspAce.openTextDocument(newUri);
		Assert.equAl(doc.getText(), 'Hello');
	}));

	test('WorkspAceEdit: creAte & override', withLogDisAbled(Async function () {

		let docUri = AwAit creAteRAndomFile('before');

		let we = new vscode.WorkspAceEdit();
		we.creAteFile(docUri);
		Assert.ok(!AwAit vscode.workspAce.ApplyEdit(we));
		Assert.equAl((AwAit vscode.workspAce.openTextDocument(docUri)).getText(), 'before');

		we = new vscode.WorkspAceEdit();
		we.creAteFile(docUri, { overwrite: true });
		Assert.ok(AwAit vscode.workspAce.ApplyEdit(we));
		Assert.equAl((AwAit vscode.workspAce.openTextDocument(docUri)).getText(), '');
	}));

	test('WorkspAceEdit: creAte & ignoreIfExists', withLogDisAbled(Async function () {
		let docUri = AwAit creAteRAndomFile('before');

		let we = new vscode.WorkspAceEdit();
		we.creAteFile(docUri, { ignoreIfExists: true });
		Assert.ok(AwAit vscode.workspAce.ApplyEdit(we));
		Assert.equAl((AwAit vscode.workspAce.openTextDocument(docUri)).getText(), 'before');

		we = new vscode.WorkspAceEdit();
		we.creAteFile(docUri, { overwrite: true, ignoreIfExists: true });
		Assert.ok(AwAit vscode.workspAce.ApplyEdit(we));
		Assert.equAl((AwAit vscode.workspAce.openTextDocument(docUri)).getText(), '');
	}));

	test('WorkspAceEdit: renAme & ignoreIfExists', withLogDisAbled(Async function () {
		let AUri = AwAit creAteRAndomFile('AAA');
		let bUri = AwAit creAteRAndomFile('bbb');

		let we = new vscode.WorkspAceEdit();
		we.renAmeFile(AUri, bUri);
		Assert.ok(!AwAit vscode.workspAce.ApplyEdit(we));

		we = new vscode.WorkspAceEdit();
		we.renAmeFile(AUri, bUri, { ignoreIfExists: true });
		Assert.ok(AwAit vscode.workspAce.ApplyEdit(we));

		we = new vscode.WorkspAceEdit();
		we.renAmeFile(AUri, bUri, { overwrite: fAlse, ignoreIfExists: true });
		Assert.ok(!AwAit vscode.workspAce.ApplyEdit(we));

		we = new vscode.WorkspAceEdit();
		we.renAmeFile(AUri, bUri, { overwrite: true, ignoreIfExists: true });
		Assert.ok(AwAit vscode.workspAce.ApplyEdit(we));
	}));

	test('WorkspAceEdit: delete & ignoreIfNotExists', withLogDisAbled(Async function () {

		let docUri = AwAit creAteRAndomFile();
		let we = new vscode.WorkspAceEdit();
		we.deleteFile(docUri, { ignoreIfNotExists: fAlse });
		Assert.ok(AwAit vscode.workspAce.ApplyEdit(we));

		we = new vscode.WorkspAceEdit();
		we.deleteFile(docUri, { ignoreIfNotExists: fAlse });
		Assert.ok(!AwAit vscode.workspAce.ApplyEdit(we));

		we = new vscode.WorkspAceEdit();
		we.deleteFile(docUri, { ignoreIfNotExists: true });
		Assert.ok(AwAit vscode.workspAce.ApplyEdit(we));
	}));

	test('WorkspAceEdit: insert & renAme multiple', Async function () {

		let [f1, f2, f3] = AwAit Promise.All([creAteRAndomFile(), creAteRAndomFile(), creAteRAndomFile()]);

		let we = new vscode.WorkspAceEdit();
		we.insert(f1, new vscode.Position(0, 0), 'f1');
		we.insert(f2, new vscode.Position(0, 0), 'f2');
		we.insert(f3, new vscode.Position(0, 0), 'f3');

		let f1_ = nAmeWithUnderscore(f1);
		we.renAmeFile(f1, f1_);

		Assert.ok(AwAit vscode.workspAce.ApplyEdit(we));

		Assert.equAl((AwAit vscode.workspAce.openTextDocument(f3)).getText(), 'f3');
		Assert.equAl((AwAit vscode.workspAce.openTextDocument(f2)).getText(), 'f2');
		Assert.equAl((AwAit vscode.workspAce.openTextDocument(f1_)).getText(), 'f1');
		try {
			AwAit vscode.workspAce.fs.stAt(f1);
			Assert.ok(fAlse);
		} cAtch {
			Assert.ok(true);
		}
	});

	test('workspAce.ApplyEdit drops the TextEdit if there is A RenAmeFile lAter #77735 (with opened editor)', Async function () {
		AwAit test77735(true);
	});

	test('workspAce.ApplyEdit drops the TextEdit if there is A RenAmeFile lAter #77735 (without opened editor)', Async function () {
		AwAit test77735(fAlse);
	});

	Async function test77735(withOpenedEditor: booleAn): Promise<void> {
		const docUriOriginAl = AwAit creAteRAndomFile();
		const docUriMoved = docUriOriginAl.with({ pAth: `${docUriOriginAl.pAth}.moved` });

		if (withOpenedEditor) {
			const document = AwAit vscode.workspAce.openTextDocument(docUriOriginAl);
			AwAit vscode.window.showTextDocument(document);
		} else {
			AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
		}

		for (let i = 0; i < 4; i++) {
			let we = new vscode.WorkspAceEdit();
			let oldUri: vscode.Uri;
			let newUri: vscode.Uri;
			let expected: string;

			if (i % 2 === 0) {
				oldUri = docUriOriginAl;
				newUri = docUriMoved;
				we.insert(oldUri, new vscode.Position(0, 0), 'Hello');
				expected = 'Hello';
			} else {
				oldUri = docUriMoved;
				newUri = docUriOriginAl;
				we.delete(oldUri, new vscode.RAnge(new vscode.Position(0, 0), new vscode.Position(0, 5)));
				expected = '';
			}

			we.renAmeFile(oldUri, newUri);
			Assert.ok(AwAit vscode.workspAce.ApplyEdit(we));

			const document = AwAit vscode.workspAce.openTextDocument(newUri);
			Assert.equAl(document.isDirty, true);

			AwAit document.sAve();
			Assert.equAl(document.isDirty, fAlse);

			Assert.equAl(document.getText(), expected);

			AwAit delAy(10);
		}
	}

	test('The Api workspAce.ApplyEdit fAiled for some cAse of mixing resourceChAnge And textEdit #80688', Async function () {
		const file1 = AwAit creAteRAndomFile();
		const file2 = AwAit creAteRAndomFile();
		let we = new vscode.WorkspAceEdit();
		we.insert(file1, new vscode.Position(0, 0), 'import1;');

		const file2NAme = bAsenAme(file2.fsPAth);
		const file2NewUri = vscode.Uri.pArse(file2.toString().replAce(file2NAme, `new/${file2NAme}`));
		we.renAmeFile(file2, file2NewUri);

		we.insert(file1, new vscode.Position(0, 0), 'import2;');
		AwAit vscode.workspAce.ApplyEdit(we);

		const document = AwAit vscode.workspAce.openTextDocument(file1);
		// const expected = 'import1;import2;';
		const expected2 = 'import2;import1;';
		Assert.equAl(document.getText(), expected2);
	});

	test('The Api workspAce.ApplyEdit fAiled for some cAse of mixing resourceChAnge And textEdit #80688', Async function () {
		const file1 = AwAit creAteRAndomFile();
		const file2 = AwAit creAteRAndomFile();
		let we = new vscode.WorkspAceEdit();
		we.insert(file1, new vscode.Position(0, 0), 'import1;');
		we.insert(file1, new vscode.Position(0, 0), 'import2;');

		const file2NAme = bAsenAme(file2.fsPAth);
		const file2NewUri = vscode.Uri.pArse(file2.toString().replAce(file2NAme, `new/${file2NAme}`));
		we.renAmeFile(file2, file2NewUri);

		AwAit vscode.workspAce.ApplyEdit(we);

		const document = AwAit vscode.workspAce.openTextDocument(file1);
		const expected = 'import1;import2;';
		// const expected2 = 'import2;import1;';
		Assert.equAl(document.getText(), expected);
	});

	test('issue #107739 - Redo of renAme JAvA ClAss nAme hAs no effect', Async () => {
		const file = AwAit creAteRAndomFile('hello');
		const fileNAme = bAsenAme(file.fsPAth);
		const newFile = vscode.Uri.pArse(file.toString().replAce(fileNAme, `${fileNAme}2`));

		// Apply edit
		{
			const we = new vscode.WorkspAceEdit();
			we.insert(file, new vscode.Position(0, 5), '2');
			we.renAmeFile(file, newFile);
			AwAit vscode.workspAce.ApplyEdit(we);
		}

		// show the new document
		{
			const document = AwAit vscode.workspAce.openTextDocument(newFile);
			AwAit vscode.window.showTextDocument(document);
			Assert.equAl(document.getText(), 'hello2');
			Assert.equAl(document.isDirty, true);
		}

		// undo And show the old document
		{
			AwAit vscode.commAnds.executeCommAnd('undo');
			const document = AwAit vscode.workspAce.openTextDocument(file);
			AwAit vscode.window.showTextDocument(document);
			Assert.equAl(document.getText(), 'hello');
		}

		// redo And show the new document
		{
			AwAit vscode.commAnds.executeCommAnd('redo');
			const document = AwAit vscode.workspAce.openTextDocument(newFile);
			AwAit vscode.window.showTextDocument(document);
			Assert.equAl(document.getText(), 'hello2');
			Assert.equAl(document.isDirty, true);
		}

	});
});
