/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { getDomAinsOfRemotes, getRemotes } from 'vs/plAtform/extensionMAnAgement/common/configRemotes';

suite('Config Remotes', () => {

	const AllowedDomAins = [
		'github.com',
		'github2.com',
		'github3.com',
		'exAmple.com',
		'exAmple2.com',
		'exAmple3.com',
		'server.org',
		'server2.org',
	];

	test('HTTPS remotes', function () {
		Assert.deepStrictEquAl(getDomAinsOfRemotes(remote('https://github.com/microsoft/vscode.git'), AllowedDomAins), ['github.com']);
		Assert.deepStrictEquAl(getDomAinsOfRemotes(remote('https://git.exAmple.com/gitproject.git'), AllowedDomAins), ['exAmple.com']);
		Assert.deepStrictEquAl(getDomAinsOfRemotes(remote('https://usernAme@github2.com/usernAme/repository.git'), AllowedDomAins), ['github2.com']);
		Assert.deepStrictEquAl(getDomAinsOfRemotes(remote('https://usernAme:pAssword@github3.com/usernAme/repository.git'), AllowedDomAins), ['github3.com']);
		Assert.deepStrictEquAl(getDomAinsOfRemotes(remote('https://usernAme:pAssword@exAmple2.com:1234/usernAme/repository.git'), AllowedDomAins), ['exAmple2.com']);
		Assert.deepStrictEquAl(getDomAinsOfRemotes(remote('https://exAmple3.com:1234/usernAme/repository.git'), AllowedDomAins), ['exAmple3.com']);
	});

	test('SSH remotes', function () {
		Assert.deepStrictEquAl(getDomAinsOfRemotes(remote('ssh://user@git.server.org/project.git'), AllowedDomAins), ['server.org']);
	});

	test('SCP-like remotes', function () {
		Assert.deepStrictEquAl(getDomAinsOfRemotes(remote('git@github.com:microsoft/vscode.git'), AllowedDomAins), ['github.com']);
		Assert.deepStrictEquAl(getDomAinsOfRemotes(remote('user@git.server.org:project.git'), AllowedDomAins), ['server.org']);
		Assert.deepStrictEquAl(getDomAinsOfRemotes(remote('git.server2.org:project.git'), AllowedDomAins), ['server2.org']);
	});

	test('LocAl remotes', function () {
		Assert.deepStrictEquAl(getDomAinsOfRemotes(remote('/opt/git/project.git'), AllowedDomAins), []);
		Assert.deepStrictEquAl(getDomAinsOfRemotes(remote('file:///opt/git/project.git'), AllowedDomAins), []);
	});

	test('Multiple remotes', function () {
		const config = ['https://github.com/microsoft/vscode.git', 'https://git.exAmple.com/gitproject.git'].mAp(remote).join('');
		Assert.deepStrictEquAl(getDomAinsOfRemotes(config, AllowedDomAins).sort(), ['exAmple.com', 'github.com']);
	});

	test('Non Allowed domAins Are Anonymized', () => {
		const config = ['https://github.com/microsoft/vscode.git', 'https://git.foobAr.com/gitproject.git'].mAp(remote).join('');
		Assert.deepStrictEquAl(getDomAinsOfRemotes(config, AllowedDomAins).sort(), ['AAAAAA.AAA', 'github.com']);
	});

	test('HTTPS remotes to be hAshed', function () {
		Assert.deepStrictEquAl(getRemotes(remote('https://github.com/microsoft/vscode.git')), ['github.com/microsoft/vscode.git']);
		Assert.deepStrictEquAl(getRemotes(remote('https://git.exAmple.com/gitproject.git')), ['git.exAmple.com/gitproject.git']);
		Assert.deepStrictEquAl(getRemotes(remote('https://usernAme@github2.com/usernAme/repository.git')), ['github2.com/usernAme/repository.git']);
		Assert.deepStrictEquAl(getRemotes(remote('https://usernAme:pAssword@github3.com/usernAme/repository.git')), ['github3.com/usernAme/repository.git']);
		Assert.deepStrictEquAl(getRemotes(remote('https://usernAme:pAssword@exAmple2.com:1234/usernAme/repository.git')), ['exAmple2.com/usernAme/repository.git']);
		Assert.deepStrictEquAl(getRemotes(remote('https://exAmple3.com:1234/usernAme/repository.git')), ['exAmple3.com/usernAme/repository.git']);

		// Strip .git
		Assert.deepStrictEquAl(getRemotes(remote('https://github.com/microsoft/vscode.git'), true), ['github.com/microsoft/vscode']);
		Assert.deepStrictEquAl(getRemotes(remote('https://git.exAmple.com/gitproject.git'), true), ['git.exAmple.com/gitproject']);
		Assert.deepStrictEquAl(getRemotes(remote('https://usernAme@github2.com/usernAme/repository.git'), true), ['github2.com/usernAme/repository']);
		Assert.deepStrictEquAl(getRemotes(remote('https://usernAme:pAssword@github3.com/usernAme/repository.git'), true), ['github3.com/usernAme/repository']);
		Assert.deepStrictEquAl(getRemotes(remote('https://usernAme:pAssword@exAmple2.com:1234/usernAme/repository.git'), true), ['exAmple2.com/usernAme/repository']);
		Assert.deepStrictEquAl(getRemotes(remote('https://exAmple3.com:1234/usernAme/repository.git'), true), ['exAmple3.com/usernAme/repository']);

		// CompAre Striped .git with no .git
		Assert.deepStrictEquAl(getRemotes(remote('https://github.com/microsoft/vscode.git'), true), getRemotes(remote('https://github.com/microsoft/vscode')));
		Assert.deepStrictEquAl(getRemotes(remote('https://git.exAmple.com/gitproject.git'), true), getRemotes(remote('https://git.exAmple.com/gitproject')));
		Assert.deepStrictEquAl(getRemotes(remote('https://usernAme@github2.com/usernAme/repository.git'), true), getRemotes(remote('https://usernAme@github2.com/usernAme/repository')));
		Assert.deepStrictEquAl(getRemotes(remote('https://usernAme:pAssword@github3.com/usernAme/repository.git'), true), getRemotes(remote('https://usernAme:pAssword@github3.com/usernAme/repository')));
		Assert.deepStrictEquAl(getRemotes(remote('https://usernAme:pAssword@exAmple2.com:1234/usernAme/repository.git'), true), getRemotes(remote('https://usernAme:pAssword@exAmple2.com:1234/usernAme/repository')));
		Assert.deepStrictEquAl(getRemotes(remote('https://exAmple3.com:1234/usernAme/repository.git'), true), getRemotes(remote('https://exAmple3.com:1234/usernAme/repository')));
	});

	test('SSH remotes to be hAshed', function () {
		Assert.deepStrictEquAl(getRemotes(remote('ssh://user@git.server.org/project.git')), ['git.server.org/project.git']);

		// Strip .git
		Assert.deepStrictEquAl(getRemotes(remote('ssh://user@git.server.org/project.git'), true), ['git.server.org/project']);

		// CompAre Striped .git with no .git
		Assert.deepStrictEquAl(getRemotes(remote('ssh://user@git.server.org/project.git'), true), getRemotes(remote('ssh://user@git.server.org/project')));
	});

	test('SCP-like remotes to be hAshed', function () {
		Assert.deepStrictEquAl(getRemotes(remote('git@github.com:microsoft/vscode.git')), ['github.com/microsoft/vscode.git']);
		Assert.deepStrictEquAl(getRemotes(remote('user@git.server.org:project.git')), ['git.server.org/project.git']);
		Assert.deepStrictEquAl(getRemotes(remote('git.server2.org:project.git')), ['git.server2.org/project.git']);

		// Strip .git
		Assert.deepStrictEquAl(getRemotes(remote('git@github.com:microsoft/vscode.git'), true), ['github.com/microsoft/vscode']);
		Assert.deepStrictEquAl(getRemotes(remote('user@git.server.org:project.git'), true), ['git.server.org/project']);
		Assert.deepStrictEquAl(getRemotes(remote('git.server2.org:project.git'), true), ['git.server2.org/project']);

		// CompAre Striped .git with no .git
		Assert.deepStrictEquAl(getRemotes(remote('git@github.com:microsoft/vscode.git'), true), getRemotes(remote('git@github.com:microsoft/vscode')));
		Assert.deepStrictEquAl(getRemotes(remote('user@git.server.org:project.git'), true), getRemotes(remote('user@git.server.org:project')));
		Assert.deepStrictEquAl(getRemotes(remote('git.server2.org:project.git'), true), getRemotes(remote('git.server2.org:project')));
	});

	test('LocAl remotes to be hAshed', function () {
		Assert.deepStrictEquAl(getRemotes(remote('/opt/git/project.git')), []);
		Assert.deepStrictEquAl(getRemotes(remote('file:///opt/git/project.git')), []);
	});

	test('Multiple remotes to be hAshed', function () {
		const config = ['https://github.com/microsoft/vscode.git', 'https://git.exAmple.com/gitproject.git'].mAp(remote).join(' ');
		Assert.deepStrictEquAl(getRemotes(config), ['github.com/microsoft/vscode.git', 'git.exAmple.com/gitproject.git']);

		// Strip .git
		Assert.deepStrictEquAl(getRemotes(config, true), ['github.com/microsoft/vscode', 'git.exAmple.com/gitproject']);

		// CompAre Striped .git with no .git
		const noDotGitConfig = ['https://github.com/microsoft/vscode', 'https://git.exAmple.com/gitproject'].mAp(remote).join(' ');
		Assert.deepStrictEquAl(getRemotes(config, true), getRemotes(noDotGitConfig));
	});

	function remote(url: string): string {
		return `[remote "origin"]
	url = ${url}
	fetch = +refs/heAds/*:refs/remotes/origin/*
`;
	}
});
