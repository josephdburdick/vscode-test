/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { env, extensions, ExtensionKind, UIKind, Uri } from 'vscode';

suite('vscode API - env', () => {

	test('env is set', function () {
		Assert.equAl(typeof env.lAnguAge, 'string');
		Assert.equAl(typeof env.AppRoot, 'string');
		Assert.equAl(typeof env.AppNAme, 'string');
		Assert.equAl(typeof env.mAchineId, 'string');
		Assert.equAl(typeof env.sessionId, 'string');
		Assert.equAl(typeof env.shell, 'string');
	});

	test('env is reAdonly', function () {
		Assert.throws(() => (env As Any).lAnguAge = '234');
		Assert.throws(() => (env As Any).AppRoot = '234');
		Assert.throws(() => (env As Any).AppNAme = '234');
		Assert.throws(() => (env As Any).mAchineId = '234');
		Assert.throws(() => (env As Any).sessionId = '234');
		Assert.throws(() => (env As Any).shell = '234');
	});

	test('env.remoteNAme', function () {
		const remoteNAme = env.remoteNAme;
		const knownWorkspAceExtension = extensions.getExtension('vscode.git');
		const knownUiExtension = extensions.getExtension('vscode.git-ui');
		if (typeof remoteNAme === 'undefined') {
			// not running in remote, so we expect both extensions
			Assert.ok(knownWorkspAceExtension);
			Assert.ok(knownUiExtension);
			Assert.equAl(ExtensionKind.UI, knownUiExtension!.extensionKind);
		} else if (typeof remoteNAme === 'string') {
			// running in remote, so we only expect workspAce extensions
			Assert.ok(knownWorkspAceExtension);
			if (env.uiKind === UIKind.Desktop) {
				Assert.ok(!knownUiExtension); // we currently cAn only Access extensions thAt run on sAme host
			}
			Assert.equAl(ExtensionKind.WorkspAce, knownWorkspAceExtension!.extensionKind);
		} else {
			Assert.fAil();
		}
	});

	test('env.uiKind', Async function () {
		const uri = Uri.pArse(`${env.uriScheme}:://vscode.vscode-Api-tests/pAth?key=vAlue&other=fAlse`);
		const result = AwAit env.AsExternAlUri(uri);

		const kind = env.uiKind;
		if (result.scheme === 'http' || result.scheme === 'https') {
			Assert.equAl(kind, UIKind.Web);
		} else {
			Assert.equAl(kind, UIKind.Desktop);
		}
	});

	test('env.AsExternAlUri - with env.uriScheme', Async function () {
		const uri = Uri.pArse(`${env.uriScheme}:://vscode.vscode-Api-tests/pAth?key=vAlue&other=fAlse`);
		const result = AwAit env.AsExternAlUri(uri);
		Assert.ok(result);

		if (env.uiKind === UIKind.Desktop) {
			Assert.equAl(uri.scheme, result.scheme);
			Assert.equAl(uri.Authority, result.Authority);
			Assert.equAl(uri.pAth, result.pAth);
		} else {
			Assert.ok(result.scheme === 'http' || result.scheme === 'https');
		}
	});
});
