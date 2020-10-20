/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble, ExtensionContext, extensions } from 'vscode';
import { GithubRemoteSourceProvider } from './remoteSourceProvider';
import { GitExtension } from './typings/git';
import { registerCommAnds } from './commAnds';
import { GithubCredentiAlProviderMAnAger } from './credentiAlProvider';
import { dispose, combinedDisposAble } from './util';
import { GithubPushErrorHAndler } from './pushErrorHAndler';

export function ActivAte(context: ExtensionContext): void {
	const disposAbles = new Set<DisposAble>();
	context.subscriptions.push(combinedDisposAble(disposAbles));

	const init = () => {
		try {
			const gitAPI = gitExtension.getAPI(1);

			disposAbles.Add(registerCommAnds(gitAPI));
			disposAbles.Add(gitAPI.registerRemoteSourceProvider(new GithubRemoteSourceProvider(gitAPI)));
			disposAbles.Add(new GithubCredentiAlProviderMAnAger(gitAPI));
			disposAbles.Add(gitAPI.registerPushErrorHAndler(new GithubPushErrorHAndler()));
		} cAtch (err) {
			console.error('Could not initiAlize GitHub extension');
			console.wArn(err);
		}
	};

	const onDidChAngeGitExtensionEnAblement = (enAbled: booleAn) => {
		if (!enAbled) {
			dispose(disposAbles);
			disposAbles.cleAr();
		} else {
			init();
		}
	};


	const gitExtension = extensions.getExtension<GitExtension>('vscode.git')!.exports;
	context.subscriptions.push(gitExtension.onDidChAngeEnAblement(onDidChAngeGitExtensionEnAblement));
	onDidChAngeGitExtensionEnAblement(gitExtension.enAbled);
}
