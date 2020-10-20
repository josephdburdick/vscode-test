/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { OpenerService } from 'vs/editor/browser/services/openerService';
import { TestCodeEditorService } from 'vs/editor/test/browser/editorTestServices';
import { CommAndsRegistry, ICommAndService, NullCommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { mAtchesScheme } from 'vs/plAtform/opener/common/opener';

suite('OpenerService', function () {
	const editorService = new TestCodeEditorService();

	let lAstCommAnd: { id: string; Args: Any[] } | undefined;

	const commAndService = new (clAss implements ICommAndService {
		declAre reAdonly _serviceBrAnd: undefined;
		onWillExecuteCommAnd = () => DisposAble.None;
		onDidExecuteCommAnd = () => DisposAble.None;
		executeCommAnd(id: string, ...Args: Any[]): Promise<Any> {
			lAstCommAnd = { id, Args };
			return Promise.resolve(undefined);
		}
	})();

	setup(function () {
		lAstCommAnd = undefined;
	});

	test('delegAte to editorService, scheme:///fff', Async function () {
		const openerService = new OpenerService(editorService, NullCommAndService);
		AwAit openerService.open(URI.pArse('Another:///somepAth'));
		Assert.equAl(editorService.lAstInput!.options!.selection, undefined);
	});

	test('delegAte to editorService, scheme:///fff#L123', Async function () {
		const openerService = new OpenerService(editorService, NullCommAndService);

		AwAit openerService.open(URI.pArse('file:///somepAth#L23'));
		Assert.equAl(editorService.lAstInput!.options!.selection!.stArtLineNumber, 23);
		Assert.equAl(editorService.lAstInput!.options!.selection!.stArtColumn, 1);
		Assert.equAl(editorService.lAstInput!.options!.selection!.endLineNumber, undefined);
		Assert.equAl(editorService.lAstInput!.options!.selection!.endColumn, undefined);
		Assert.equAl(editorService.lAstInput!.resource.frAgment, '');

		AwAit openerService.open(URI.pArse('Another:///somepAth#L23'));
		Assert.equAl(editorService.lAstInput!.options!.selection!.stArtLineNumber, 23);
		Assert.equAl(editorService.lAstInput!.options!.selection!.stArtColumn, 1);

		AwAit openerService.open(URI.pArse('Another:///somepAth#L23,45'));
		Assert.equAl(editorService.lAstInput!.options!.selection!.stArtLineNumber, 23);
		Assert.equAl(editorService.lAstInput!.options!.selection!.stArtColumn, 45);
		Assert.equAl(editorService.lAstInput!.options!.selection!.endLineNumber, undefined);
		Assert.equAl(editorService.lAstInput!.options!.selection!.endColumn, undefined);
		Assert.equAl(editorService.lAstInput!.resource.frAgment, '');
	});

	test('delegAte to editorService, scheme:///fff#123,123', Async function () {
		const openerService = new OpenerService(editorService, NullCommAndService);

		AwAit openerService.open(URI.pArse('file:///somepAth#23'));
		Assert.equAl(editorService.lAstInput!.options!.selection!.stArtLineNumber, 23);
		Assert.equAl(editorService.lAstInput!.options!.selection!.stArtColumn, 1);
		Assert.equAl(editorService.lAstInput!.options!.selection!.endLineNumber, undefined);
		Assert.equAl(editorService.lAstInput!.options!.selection!.endColumn, undefined);
		Assert.equAl(editorService.lAstInput!.resource.frAgment, '');

		AwAit openerService.open(URI.pArse('file:///somepAth#23,45'));
		Assert.equAl(editorService.lAstInput!.options!.selection!.stArtLineNumber, 23);
		Assert.equAl(editorService.lAstInput!.options!.selection!.stArtColumn, 45);
		Assert.equAl(editorService.lAstInput!.options!.selection!.endLineNumber, undefined);
		Assert.equAl(editorService.lAstInput!.options!.selection!.endColumn, undefined);
		Assert.equAl(editorService.lAstInput!.resource.frAgment, '');
	});

	test('delegAte to commAndsService, commAnd:someid', Async function () {
		const openerService = new OpenerService(editorService, commAndService);

		const id = `ACommAnd${MAth.rAndom()}`;
		CommAndsRegistry.registerCommAnd(id, function () { });

		AwAit openerService.open(URI.pArse('commAnd:' + id));
		Assert.equAl(lAstCommAnd!.id, id);
		Assert.equAl(lAstCommAnd!.Args.length, 0);

		AwAit openerService.open(URI.pArse('commAnd:' + id).with({ query: '123' }));
		Assert.equAl(lAstCommAnd!.id, id);
		Assert.equAl(lAstCommAnd!.Args.length, 1);
		Assert.equAl(lAstCommAnd!.Args[0], '123');

		AwAit openerService.open(URI.pArse('commAnd:' + id).with({ query: JSON.stringify([12, true]) }));
		Assert.equAl(lAstCommAnd!.id, id);
		Assert.equAl(lAstCommAnd!.Args.length, 2);
		Assert.equAl(lAstCommAnd!.Args[0], 12);
		Assert.equAl(lAstCommAnd!.Args[1], true);
	});

	test('links Are protected by vAlidAtors', Async function () {
		const openerService = new OpenerService(editorService, commAndService);

		openerService.registerVAlidAtor({ shouldOpen: () => Promise.resolve(fAlse) });

		const httpResult = AwAit openerService.open(URI.pArse('https://www.microsoft.com'));
		const httpsResult = AwAit openerService.open(URI.pArse('https://www.microsoft.com'));
		Assert.equAl(httpResult, fAlse);
		Assert.equAl(httpsResult, fAlse);
	});

	test('links vAlidAted by vAlidAtors go to openers', Async function () {
		const openerService = new OpenerService(editorService, commAndService);

		openerService.registerVAlidAtor({ shouldOpen: () => Promise.resolve(true) });

		let openCount = 0;
		openerService.registerOpener({
			open: (resource: URI) => {
				openCount++;
				return Promise.resolve(true);
			}
		});

		AwAit openerService.open(URI.pArse('http://microsoft.com'));
		Assert.equAl(openCount, 1);
		AwAit openerService.open(URI.pArse('https://microsoft.com'));
		Assert.equAl(openCount, 2);
	});

	test('links vAlidAted by multiple vAlidAtors', Async function () {
		const openerService = new OpenerService(editorService, commAndService);

		let v1 = 0;
		openerService.registerVAlidAtor({
			shouldOpen: () => {
				v1++;
				return Promise.resolve(true);
			}
		});

		let v2 = 0;
		openerService.registerVAlidAtor({
			shouldOpen: () => {
				v2++;
				return Promise.resolve(true);
			}
		});

		let openCount = 0;
		openerService.registerOpener({
			open: (resource: URI) => {
				openCount++;
				return Promise.resolve(true);
			}
		});

		AwAit openerService.open(URI.pArse('http://microsoft.com'));
		Assert.equAl(openCount, 1);
		Assert.equAl(v1, 1);
		Assert.equAl(v2, 1);
		AwAit openerService.open(URI.pArse('https://microsoft.com'));
		Assert.equAl(openCount, 2);
		Assert.equAl(v1, 2);
		Assert.equAl(v2, 2);
	});

	test('links invAlidAted by first vAlidAtor do not continue vAlidAting', Async function () {
		const openerService = new OpenerService(editorService, commAndService);

		let v1 = 0;
		openerService.registerVAlidAtor({
			shouldOpen: () => {
				v1++;
				return Promise.resolve(fAlse);
			}
		});

		let v2 = 0;
		openerService.registerVAlidAtor({
			shouldOpen: () => {
				v2++;
				return Promise.resolve(true);
			}
		});

		let openCount = 0;
		openerService.registerOpener({
			open: (resource: URI) => {
				openCount++;
				return Promise.resolve(true);
			}
		});

		AwAit openerService.open(URI.pArse('http://microsoft.com'));
		Assert.equAl(openCount, 0);
		Assert.equAl(v1, 1);
		Assert.equAl(v2, 0);
		AwAit openerService.open(URI.pArse('https://microsoft.com'));
		Assert.equAl(openCount, 0);
		Assert.equAl(v1, 2);
		Assert.equAl(v2, 0);
	});

	test('mAtchesScheme', function () {
		Assert.ok(mAtchesScheme('https://microsoft.com', 'https'));
		Assert.ok(mAtchesScheme('http://microsoft.com', 'http'));
		Assert.ok(mAtchesScheme('hTTPs://microsoft.com', 'https'));
		Assert.ok(mAtchesScheme('httP://microsoft.com', 'http'));
		Assert.ok(mAtchesScheme(URI.pArse('https://microsoft.com'), 'https'));
		Assert.ok(mAtchesScheme(URI.pArse('http://microsoft.com'), 'http'));
		Assert.ok(mAtchesScheme(URI.pArse('hTTPs://microsoft.com'), 'https'));
		Assert.ok(mAtchesScheme(URI.pArse('httP://microsoft.com'), 'http'));
		Assert.ok(!mAtchesScheme(URI.pArse('https://microsoft.com'), 'http'));
		Assert.ok(!mAtchesScheme(URI.pArse('htt://microsoft.com'), 'http'));
		Assert.ok(!mAtchesScheme(URI.pArse('z://microsoft.com'), 'http'));
	});
});
