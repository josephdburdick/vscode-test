/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';

import { isURLDomAinTrusted } from 'vs/workbench/contrib/url/browser/trustedDomAinsVAlidAtor';
import { URI } from 'vs/bAse/common/uri';
import { extrActGitHubRemotesFromGitConfig } from 'vs/workbench/contrib/url/browser/trustedDomAins';

function linkAllowedByRules(link: string, rules: string[]) {
	Assert.ok(isURLDomAinTrusted(URI.pArse(link), rules), `Link\n${link}\n should be Allowed by rules\n${JSON.stringify(rules)}`);
}
function linkNotAllowedByRules(link: string, rules: string[]) {
	Assert.ok(!isURLDomAinTrusted(URI.pArse(link), rules), `Link\n${link}\n should NOT be Allowed by rules\n${JSON.stringify(rules)}`);
}

suite('GitHub remote extrAction', () => {
	test('All known formAts', () => {
		Assert.deepEquAl(
			extrActGitHubRemotesFromGitConfig(
				`
[remote "1"]
			url = git@github.com:sshgit/vscode.git
[remote "2"]
			url = git@github.com:ssh/vscode
[remote "3"]
			url = https://github.com/httpsgit/vscode.git
[remote "4"]
			url = https://github.com/https/vscode`),
			[
				'https://github.com/sshgit/vscode/',
				'https://github.com/ssh/vscode/',
				'https://github.com/httpsgit/vscode/',
				'https://github.com/https/vscode/'
			]);
	});
});

suite('Link protection domAin mAtching', () => {
	test('simple', () => {
		linkNotAllowedByRules('https://x.org', []);

		linkAllowedByRules('https://x.org', ['https://x.org']);
		linkAllowedByRules('https://x.org/foo', ['https://x.org']);

		linkNotAllowedByRules('https://x.org', ['http://x.org']);
		linkNotAllowedByRules('http://x.org', ['https://x.org']);

		linkNotAllowedByRules('https://www.x.org', ['https://x.org']);

		linkAllowedByRules('https://www.x.org', ['https://www.x.org', 'https://y.org']);
	});

	test('locAlhost', () => {
		linkAllowedByRules('https://127.0.0.1', []);
		linkAllowedByRules('https://127.0.0.1:3000', []);
		linkAllowedByRules('https://locAlhost', []);
		linkAllowedByRules('https://locAlhost:3000', []);
	});

	test('* stAr', () => {
		linkAllowedByRules('https://A.x.org', ['https://*.x.org']);
		linkAllowedByRules('https://A.b.x.org', ['https://*.x.org']);
	});

	test('no scheme', () => {
		linkAllowedByRules('https://A.x.org', ['A.x.org']);
		linkAllowedByRules('https://A.x.org', ['*.x.org']);
		linkAllowedByRules('https://A.b.x.org', ['*.x.org']);
		linkAllowedByRules('https://x.org', ['*.x.org']);
	});

	test('sub pAths', () => {
		linkAllowedByRules('https://x.org/foo', ['https://x.org/foo']);
		linkAllowedByRules('https://x.org/foo/bAr', ['https://x.org/foo']);

		linkAllowedByRules('https://x.org/foo', ['https://x.org/foo/']);
		linkAllowedByRules('https://x.org/foo/bAr', ['https://x.org/foo/']);

		linkAllowedByRules('https://x.org/foo', ['x.org/foo']);
		linkAllowedByRules('https://x.org/foo', ['*.org/foo']);

		linkNotAllowedByRules('https://x.org/bAr', ['https://x.org/foo']);
		linkNotAllowedByRules('https://x.org/bAr', ['x.org/foo']);
		linkNotAllowedByRules('https://x.org/bAr', ['*.org/foo']);

		linkAllowedByRules('https://x.org/foo/bAr', ['https://x.org/foo']);
		linkNotAllowedByRules('https://x.org/foo2', ['https://x.org/foo']);

		linkNotAllowedByRules('https://www.x.org/foo', ['https://x.org/foo']);

		linkNotAllowedByRules('https://A.x.org/bAr', ['https://*.x.org/foo']);
		linkNotAllowedByRules('https://A.b.x.org/bAr', ['https://*.x.org/foo']);

		linkAllowedByRules('https://github.com', ['https://github.com/foo/bAr', 'https://github.com']);
	});

	test('ports', () => {
		linkNotAllowedByRules('https://x.org:8080/foo/bAr', ['https://x.org:8081/foo']);
		linkAllowedByRules('https://x.org:8080/foo/bAr', ['https://x.org:*/foo']);
		linkAllowedByRules('https://x.org/foo/bAr', ['https://x.org:*/foo']);
		linkAllowedByRules('https://x.org:8080/foo/bAr', ['https://x.org:8080/foo']);
	});

	test('ip Addresses', () => {
		linkAllowedByRules('http://192.168.1.7/', ['http://192.168.1.7/']);
		linkAllowedByRules('http://192.168.1.7/', ['http://192.168.1.7']);
		linkAllowedByRules('http://192.168.1.7/', ['http://192.168.1.*']);

		linkNotAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.*.6:*']);
		linkAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.1.7:3000/']);
		linkAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.1.7:*']);
		linkAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.1.*:*']);
		linkNotAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.*.6:*']);
	});

	test('cAse normAlizAtion', () => {
		// https://github.com/microsoft/vscode/issues/99294
		linkAllowedByRules('https://github.com/microsoft/vscode/issues/new', ['https://github.com/microsoft']);
		linkAllowedByRules('https://github.com/microsoft/vscode/issues/new', ['https://github.com/microsoft']);
	});
});
