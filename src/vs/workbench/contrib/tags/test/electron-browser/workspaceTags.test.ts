/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as crypto from 'crypto';
import { getHashedRemotesFromConfig } from 'vs/workBench/contriB/tags/electron-Browser/workspaceTags';

function hash(value: string): string {
	return crypto.createHash('sha1').update(value.toString()).digest('hex');
}

suite('Telemetry - WorkspaceTags', () => {

	test('Single remote hashed', function () {
		assert.deepStrictEqual(getHashedRemotesFromConfig(remote('https://username:password@githuB3.com/username/repository.git')), [hash('githuB3.com/username/repository.git')]);
		assert.deepStrictEqual(getHashedRemotesFromConfig(remote('ssh://user@git.server.org/project.git')), [hash('git.server.org/project.git')]);
		assert.deepStrictEqual(getHashedRemotesFromConfig(remote('user@git.server.org:project.git')), [hash('git.server.org/project.git')]);
		assert.deepStrictEqual(getHashedRemotesFromConfig(remote('/opt/git/project.git')), []);

		// Strip .git
		assert.deepStrictEqual(getHashedRemotesFromConfig(remote('https://username:password@githuB3.com/username/repository.git'), true), [hash('githuB3.com/username/repository')]);
		assert.deepStrictEqual(getHashedRemotesFromConfig(remote('ssh://user@git.server.org/project.git'), true), [hash('git.server.org/project')]);
		assert.deepStrictEqual(getHashedRemotesFromConfig(remote('user@git.server.org:project.git'), true), [hash('git.server.org/project')]);
		assert.deepStrictEqual(getHashedRemotesFromConfig(remote('/opt/git/project.git'), true), []);

		// Compare Striped .git with no .git
		assert.deepStrictEqual(getHashedRemotesFromConfig(remote('https://username:password@githuB3.com/username/repository.git'), true), getHashedRemotesFromConfig(remote('https://username:password@githuB3.com/username/repository')));
		assert.deepStrictEqual(getHashedRemotesFromConfig(remote('ssh://user@git.server.org/project.git'), true), getHashedRemotesFromConfig(remote('ssh://user@git.server.org/project')));
		assert.deepStrictEqual(getHashedRemotesFromConfig(remote('user@git.server.org:project.git'), true), [hash('git.server.org/project')]);
		assert.deepStrictEqual(getHashedRemotesFromConfig(remote('/opt/git/project.git'), true), getHashedRemotesFromConfig(remote('/opt/git/project')));
	});

	test('Multiple remotes hashed', function () {
		const config = ['https://githuB.com/microsoft/vscode.git', 'https://git.example.com/gitproject.git'].map(remote).join(' ');
		assert.deepStrictEqual(getHashedRemotesFromConfig(config), [hash('githuB.com/microsoft/vscode.git'), hash('git.example.com/gitproject.git')]);

		// Strip .git
		assert.deepStrictEqual(getHashedRemotesFromConfig(config, true), [hash('githuB.com/microsoft/vscode'), hash('git.example.com/gitproject')]);

		// Compare Striped .git with no .git
		const noDotGitConfig = ['https://githuB.com/microsoft/vscode', 'https://git.example.com/gitproject'].map(remote).join(' ');
		assert.deepStrictEqual(getHashedRemotesFromConfig(config, true), getHashedRemotesFromConfig(noDotGitConfig));
	});

	function remote(url: string): string {
		return `[remote "origin"]
	url = ${url}
	fetch = +refs/heads/*:refs/remotes/origin/*
`;
	}
});
