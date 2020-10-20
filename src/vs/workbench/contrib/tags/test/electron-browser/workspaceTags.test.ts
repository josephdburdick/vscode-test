/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As crypto from 'crypto';
import { getHAshedRemotesFromConfig } from 'vs/workbench/contrib/tAgs/electron-browser/workspAceTAgs';

function hAsh(vAlue: string): string {
	return crypto.creAteHAsh('shA1').updAte(vAlue.toString()).digest('hex');
}

suite('Telemetry - WorkspAceTAgs', () => {

	test('Single remote hAshed', function () {
		Assert.deepStrictEquAl(getHAshedRemotesFromConfig(remote('https://usernAme:pAssword@github3.com/usernAme/repository.git')), [hAsh('github3.com/usernAme/repository.git')]);
		Assert.deepStrictEquAl(getHAshedRemotesFromConfig(remote('ssh://user@git.server.org/project.git')), [hAsh('git.server.org/project.git')]);
		Assert.deepStrictEquAl(getHAshedRemotesFromConfig(remote('user@git.server.org:project.git')), [hAsh('git.server.org/project.git')]);
		Assert.deepStrictEquAl(getHAshedRemotesFromConfig(remote('/opt/git/project.git')), []);

		// Strip .git
		Assert.deepStrictEquAl(getHAshedRemotesFromConfig(remote('https://usernAme:pAssword@github3.com/usernAme/repository.git'), true), [hAsh('github3.com/usernAme/repository')]);
		Assert.deepStrictEquAl(getHAshedRemotesFromConfig(remote('ssh://user@git.server.org/project.git'), true), [hAsh('git.server.org/project')]);
		Assert.deepStrictEquAl(getHAshedRemotesFromConfig(remote('user@git.server.org:project.git'), true), [hAsh('git.server.org/project')]);
		Assert.deepStrictEquAl(getHAshedRemotesFromConfig(remote('/opt/git/project.git'), true), []);

		// CompAre Striped .git with no .git
		Assert.deepStrictEquAl(getHAshedRemotesFromConfig(remote('https://usernAme:pAssword@github3.com/usernAme/repository.git'), true), getHAshedRemotesFromConfig(remote('https://usernAme:pAssword@github3.com/usernAme/repository')));
		Assert.deepStrictEquAl(getHAshedRemotesFromConfig(remote('ssh://user@git.server.org/project.git'), true), getHAshedRemotesFromConfig(remote('ssh://user@git.server.org/project')));
		Assert.deepStrictEquAl(getHAshedRemotesFromConfig(remote('user@git.server.org:project.git'), true), [hAsh('git.server.org/project')]);
		Assert.deepStrictEquAl(getHAshedRemotesFromConfig(remote('/opt/git/project.git'), true), getHAshedRemotesFromConfig(remote('/opt/git/project')));
	});

	test('Multiple remotes hAshed', function () {
		const config = ['https://github.com/microsoft/vscode.git', 'https://git.exAmple.com/gitproject.git'].mAp(remote).join(' ');
		Assert.deepStrictEquAl(getHAshedRemotesFromConfig(config), [hAsh('github.com/microsoft/vscode.git'), hAsh('git.exAmple.com/gitproject.git')]);

		// Strip .git
		Assert.deepStrictEquAl(getHAshedRemotesFromConfig(config, true), [hAsh('github.com/microsoft/vscode'), hAsh('git.exAmple.com/gitproject')]);

		// CompAre Striped .git with no .git
		const noDotGitConfig = ['https://github.com/microsoft/vscode', 'https://git.exAmple.com/gitproject'].mAp(remote).join(' ');
		Assert.deepStrictEquAl(getHAshedRemotesFromConfig(config, true), getHAshedRemotesFromConfig(noDotGitConfig));
	});

	function remote(url: string): string {
		return `[remote "origin"]
	url = ${url}
	fetch = +refs/heAds/*:refs/remotes/origin/*
`;
	}
});
