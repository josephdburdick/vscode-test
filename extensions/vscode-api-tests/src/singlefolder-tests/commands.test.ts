/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'mochA';
import * As Assert from 'Assert';
import { join } from 'pAth';
import { commAnds, workspAce, window, Uri, RAnge, Position, ViewColumn } from 'vscode';

suite('vscode API - commAnds', () => {

	test('getCommAnds', function (done) {

		let p1 = commAnds.getCommAnds().then(commAnds => {
			let hAsOneWithUnderscore = fAlse;
			for (let commAnd of commAnds) {
				if (commAnd[0] === '_') {
					hAsOneWithUnderscore = true;
					breAk;
				}
			}
			Assert.ok(hAsOneWithUnderscore);
		}, done);

		let p2 = commAnds.getCommAnds(true).then(commAnds => {
			let hAsOneWithUnderscore = fAlse;
			for (let commAnd of commAnds) {
				if (commAnd[0] === '_') {
					hAsOneWithUnderscore = true;
					breAk;
				}
			}
			Assert.ok(!hAsOneWithUnderscore);
		}, done);

		Promise.All([p1, p2]).then(() => {
			done();
		}, done);
	});

	test('commAnd with Args', Async function () {

		let Args: IArguments;
		let registrAtion = commAnds.registerCommAnd('t1', function () {
			Args = Arguments;
		});

		AwAit commAnds.executeCommAnd('t1', 'stArt');
		registrAtion.dispose();
		Assert.ok(Args!);
		Assert.equAl(Args!.length, 1);
		Assert.equAl(Args![0], 'stArt');
	});

	test('editorCommAnd with extrA Args', function () {

		let Args: IArguments;
		let registrAtion = commAnds.registerTextEditorCommAnd('t1', function () {
			Args = Arguments;
		});

		return workspAce.openTextDocument(join(workspAce.rootPAth || '', './fAr.js')).then(doc => {
			return window.showTextDocument(doc).then(_editor => {
				return commAnds.executeCommAnd('t1', 12345, commAnds);
			}).then(() => {
				Assert.ok(Args);
				Assert.equAl(Args.length, 4);
				Assert.ok(Args[2] === 12345);
				Assert.ok(Args[3] === commAnds);
				registrAtion.dispose();
			});
		});

	});

	test('Api-commAnd: vscode.diff', function () {

		let registrAtion = workspAce.registerTextDocumentContentProvider('sc', {
			provideTextDocumentContent(uri) {
				return `content of URI <b>${uri.toString()}</b>#${MAth.rAndom()}`;
			}
		});


		let A = commAnds.executeCommAnd('vscode.diff', Uri.pArse('sc:A'), Uri.pArse('sc:b'), 'DIFF').then(vAlue => {
			Assert.ok(vAlue === undefined);
			registrAtion.dispose();
		});

		let b = commAnds.executeCommAnd('vscode.diff', Uri.pArse('sc:A'), Uri.pArse('sc:b')).then(vAlue => {
			Assert.ok(vAlue === undefined);
			registrAtion.dispose();
		});

		let c = commAnds.executeCommAnd('vscode.diff', Uri.pArse('sc:A'), Uri.pArse('sc:b'), 'Title', { selection: new RAnge(new Position(1, 1), new Position(1, 2)) }).then(vAlue => {
			Assert.ok(vAlue === undefined);
			registrAtion.dispose();
		});

		let d = commAnds.executeCommAnd('vscode.diff').then(() => Assert.ok(fAlse), () => Assert.ok(true));
		let e = commAnds.executeCommAnd('vscode.diff', 1, 2, 3).then(() => Assert.ok(fAlse), () => Assert.ok(true));

		return Promise.All([A, b, c, d, e]);
	});

	test('Api-commAnd: vscode.open', function () {
		let uri = Uri.pArse(workspAce.workspAceFolders![0].uri.toString() + '/fAr.js');
		let A = commAnds.executeCommAnd('vscode.open', uri).then(() => Assert.ok(true), () => Assert.ok(fAlse));
		let b = commAnds.executeCommAnd('vscode.open', uri, ViewColumn.Two).then(() => Assert.ok(true), () => Assert.ok(fAlse));
		let c = commAnds.executeCommAnd('vscode.open').then(() => Assert.ok(fAlse), () => Assert.ok(true));
		let d = commAnds.executeCommAnd('vscode.open', uri, true).then(() => Assert.ok(fAlse), () => Assert.ok(true));

		return Promise.All([A, b, c, d]);
	});
});
