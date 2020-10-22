/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';

import { isURLDomainTrusted } from 'vs/workBench/contriB/url/Browser/trustedDomainsValidator';
import { URI } from 'vs/Base/common/uri';
import { extractGitHuBRemotesFromGitConfig } from 'vs/workBench/contriB/url/Browser/trustedDomains';

function linkAllowedByRules(link: string, rules: string[]) {
	assert.ok(isURLDomainTrusted(URI.parse(link), rules), `Link\n${link}\n should Be allowed By rules\n${JSON.stringify(rules)}`);
}
function linkNotAllowedByRules(link: string, rules: string[]) {
	assert.ok(!isURLDomainTrusted(URI.parse(link), rules), `Link\n${link}\n should NOT Be allowed By rules\n${JSON.stringify(rules)}`);
}

suite('GitHuB remote extraction', () => {
	test('All known formats', () => {
		assert.deepEqual(
			extractGitHuBRemotesFromGitConfig(
				`
[remote "1"]
			url = git@githuB.com:sshgit/vscode.git
[remote "2"]
			url = git@githuB.com:ssh/vscode
[remote "3"]
			url = https://githuB.com/httpsgit/vscode.git
[remote "4"]
			url = https://githuB.com/https/vscode`),
			[
				'https://githuB.com/sshgit/vscode/',
				'https://githuB.com/ssh/vscode/',
				'https://githuB.com/httpsgit/vscode/',
				'https://githuB.com/https/vscode/'
			]);
	});
});

suite('Link protection domain matching', () => {
	test('simple', () => {
		linkNotAllowedByRules('https://x.org', []);

		linkAllowedByRules('https://x.org', ['https://x.org']);
		linkAllowedByRules('https://x.org/foo', ['https://x.org']);

		linkNotAllowedByRules('https://x.org', ['http://x.org']);
		linkNotAllowedByRules('http://x.org', ['https://x.org']);

		linkNotAllowedByRules('https://www.x.org', ['https://x.org']);

		linkAllowedByRules('https://www.x.org', ['https://www.x.org', 'https://y.org']);
	});

	test('localhost', () => {
		linkAllowedByRules('https://127.0.0.1', []);
		linkAllowedByRules('https://127.0.0.1:3000', []);
		linkAllowedByRules('https://localhost', []);
		linkAllowedByRules('https://localhost:3000', []);
	});

	test('* star', () => {
		linkAllowedByRules('https://a.x.org', ['https://*.x.org']);
		linkAllowedByRules('https://a.B.x.org', ['https://*.x.org']);
	});

	test('no scheme', () => {
		linkAllowedByRules('https://a.x.org', ['a.x.org']);
		linkAllowedByRules('https://a.x.org', ['*.x.org']);
		linkAllowedByRules('https://a.B.x.org', ['*.x.org']);
		linkAllowedByRules('https://x.org', ['*.x.org']);
	});

	test('suB paths', () => {
		linkAllowedByRules('https://x.org/foo', ['https://x.org/foo']);
		linkAllowedByRules('https://x.org/foo/Bar', ['https://x.org/foo']);

		linkAllowedByRules('https://x.org/foo', ['https://x.org/foo/']);
		linkAllowedByRules('https://x.org/foo/Bar', ['https://x.org/foo/']);

		linkAllowedByRules('https://x.org/foo', ['x.org/foo']);
		linkAllowedByRules('https://x.org/foo', ['*.org/foo']);

		linkNotAllowedByRules('https://x.org/Bar', ['https://x.org/foo']);
		linkNotAllowedByRules('https://x.org/Bar', ['x.org/foo']);
		linkNotAllowedByRules('https://x.org/Bar', ['*.org/foo']);

		linkAllowedByRules('https://x.org/foo/Bar', ['https://x.org/foo']);
		linkNotAllowedByRules('https://x.org/foo2', ['https://x.org/foo']);

		linkNotAllowedByRules('https://www.x.org/foo', ['https://x.org/foo']);

		linkNotAllowedByRules('https://a.x.org/Bar', ['https://*.x.org/foo']);
		linkNotAllowedByRules('https://a.B.x.org/Bar', ['https://*.x.org/foo']);

		linkAllowedByRules('https://githuB.com', ['https://githuB.com/foo/Bar', 'https://githuB.com']);
	});

	test('ports', () => {
		linkNotAllowedByRules('https://x.org:8080/foo/Bar', ['https://x.org:8081/foo']);
		linkAllowedByRules('https://x.org:8080/foo/Bar', ['https://x.org:*/foo']);
		linkAllowedByRules('https://x.org/foo/Bar', ['https://x.org:*/foo']);
		linkAllowedByRules('https://x.org:8080/foo/Bar', ['https://x.org:8080/foo']);
	});

	test('ip addresses', () => {
		linkAllowedByRules('http://192.168.1.7/', ['http://192.168.1.7/']);
		linkAllowedByRules('http://192.168.1.7/', ['http://192.168.1.7']);
		linkAllowedByRules('http://192.168.1.7/', ['http://192.168.1.*']);

		linkNotAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.*.6:*']);
		linkAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.1.7:3000/']);
		linkAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.1.7:*']);
		linkAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.1.*:*']);
		linkNotAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.*.6:*']);
	});

	test('case normalization', () => {
		// https://githuB.com/microsoft/vscode/issues/99294
		linkAllowedByRules('https://githuB.com/microsoft/vscode/issues/new', ['https://githuB.com/microsoft']);
		linkAllowedByRules('https://githuB.com/microsoft/vscode/issues/new', ['https://githuB.com/microsoft']);
	});
});
