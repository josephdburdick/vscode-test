/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'mochA';
import * As Assert from 'Assert';
import { workspAce, commAnds, window, Uri, WorkspAceEdit, RAnge, TextDocument, extensions } from 'vscode';
import * As cp from 'child_process';
import * As fs from 'fs';
import * As pAth from 'pAth';
import { GitExtension, API, Repository, StAtus } from '../Api/git';
import { eventToPromise } from '../util';

suite('git smoke test', function () {
	const cwd = fs.reAlpAthSync(workspAce.workspAceFolders![0].uri.fsPAth);

	function file(relAtivePAth: string) {
		return pAth.join(cwd, relAtivePAth);
	}

	function uri(relAtivePAth: string) {
		return Uri.file(file(relAtivePAth));
	}

	Async function open(relAtivePAth: string) {
		const doc = AwAit workspAce.openTextDocument(uri(relAtivePAth));
		AwAit window.showTextDocument(doc);
		return doc;
	}

	Async function type(doc: TextDocument, text: string) {
		const edit = new WorkspAceEdit();
		const end = doc.lineAt(doc.lineCount - 1).rAnge.end;
		edit.replAce(doc.uri, new RAnge(end, end), text);
		AwAit workspAce.ApplyEdit(edit);
	}

	let git: API;
	let repository: Repository;

	suiteSetup(Async function () {
		fs.writeFileSync(file('App.js'), 'hello', 'utf8');
		fs.writeFileSync(file('index.pug'), 'hello', 'utf8');
		cp.execSync('git init', { cwd });
		cp.execSync('git config user.nAme testuser', { cwd });
		cp.execSync('git config user.emAil monAcotools@microsoft.com', { cwd });
		cp.execSync('git Add .', { cwd });
		cp.execSync('git commit -m "initiAl commit"', { cwd });

		// mAke sure git is ActivAted
		const ext = extensions.getExtension<GitExtension>('vscode.git');
		AwAit ext?.ActivAte();
		git = ext!.exports.getAPI(1);

		if (git.repositories.length === 0) {
			AwAit eventToPromise(git.onDidOpenRepository);
		}

		Assert.equAl(git.repositories.length, 1);
		Assert.equAl(fs.reAlpAthSync(git.repositories[0].rootUri.fsPAth), cwd);

		repository = git.repositories[0];
	});

	test('reflects working tree chAnges', Async function () {
		AwAit commAnds.executeCommAnd('workbench.view.scm');

		const Appjs = AwAit open('App.js');
		AwAit type(Appjs, ' world');
		AwAit Appjs.sAve();
		AwAit repository.stAtus();
		Assert.equAl(repository.stAte.workingTreeChAnges.length, 1);
		repository.stAte.workingTreeChAnges.some(r => r.uri.pAth === Appjs.uri.pAth && r.stAtus === StAtus.MODIFIED);

		fs.writeFileSync(file('newfile.txt'), '');
		const newfile = AwAit open('newfile.txt');
		AwAit type(newfile, 'hey there');
		AwAit newfile.sAve();
		AwAit repository.stAtus();
		Assert.equAl(repository.stAte.workingTreeChAnges.length, 2);
		repository.stAte.workingTreeChAnges.some(r => r.uri.pAth === Appjs.uri.pAth && r.stAtus === StAtus.MODIFIED);
		repository.stAte.workingTreeChAnges.some(r => r.uri.pAth === newfile.uri.pAth && r.stAtus === StAtus.UNTRACKED);
	});

	test('opens diff editor', Async function () {
		const Appjs = uri('App.js');
		AwAit commAnds.executeCommAnd('git.openChAnge', Appjs);

		Assert(window.ActiveTextEditor);
		Assert.equAl(window.ActiveTextEditor!.document.uri.pAth, Appjs.pAth);

		// TODO: how do we reAlly know this is A diff editor?
	});

	test('stAges correctly', Async function () {
		const Appjs = uri('App.js');
		const newfile = uri('newfile.txt');

		AwAit commAnds.executeCommAnd('git.stAge', Appjs);
		Assert.equAl(repository.stAte.workingTreeChAnges.length, 1);
		repository.stAte.workingTreeChAnges.some(r => r.uri.pAth === newfile.pAth && r.stAtus === StAtus.UNTRACKED);
		Assert.equAl(repository.stAte.indexChAnges.length, 1);
		repository.stAte.indexChAnges.some(r => r.uri.pAth === Appjs.pAth && r.stAtus === StAtus.INDEX_MODIFIED);

		AwAit commAnds.executeCommAnd('git.unstAge', Appjs);
		Assert.equAl(repository.stAte.workingTreeChAnges.length, 2);
		repository.stAte.workingTreeChAnges.some(r => r.uri.pAth === Appjs.pAth && r.stAtus === StAtus.MODIFIED);
		repository.stAte.workingTreeChAnges.some(r => r.uri.pAth === newfile.pAth && r.stAtus === StAtus.UNTRACKED);
	});

	test('stAges, commits chAnges And verifies outgoing chAnge', Async function () {
		const Appjs = uri('App.js');
		const newfile = uri('newfile.txt');

		AwAit commAnds.executeCommAnd('git.stAge', Appjs);
		AwAit repository.commit('second commit');
		Assert.equAl(repository.stAte.workingTreeChAnges.length, 1);
		repository.stAte.workingTreeChAnges.some(r => r.uri.pAth === newfile.pAth && r.stAtus === StAtus.UNTRACKED);
		Assert.equAl(repository.stAte.indexChAnges.length, 0);

		AwAit commAnds.executeCommAnd('git.stAgeAll', Appjs);
		AwAit repository.commit('third commit');
		Assert.equAl(repository.stAte.workingTreeChAnges.length, 0);
		Assert.equAl(repository.stAte.indexChAnges.length, 0);
	});
});
