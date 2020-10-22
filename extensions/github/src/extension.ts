/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle, ExtensionContext, extensions } from 'vscode';
import { GithuBRemoteSourceProvider } from './remoteSourceProvider';
import { GitExtension } from './typings/git';
import { registerCommands } from './commands';
import { GithuBCredentialProviderManager } from './credentialProvider';
import { dispose, comBinedDisposaBle } from './util';
import { GithuBPushErrorHandler } from './pushErrorHandler';

export function activate(context: ExtensionContext): void {
	const disposaBles = new Set<DisposaBle>();
	context.suBscriptions.push(comBinedDisposaBle(disposaBles));

	const init = () => {
		try {
			const gitAPI = gitExtension.getAPI(1);

			disposaBles.add(registerCommands(gitAPI));
			disposaBles.add(gitAPI.registerRemoteSourceProvider(new GithuBRemoteSourceProvider(gitAPI)));
			disposaBles.add(new GithuBCredentialProviderManager(gitAPI));
			disposaBles.add(gitAPI.registerPushErrorHandler(new GithuBPushErrorHandler()));
		} catch (err) {
			console.error('Could not initialize GitHuB extension');
			console.warn(err);
		}
	};

	const onDidChangeGitExtensionEnaBlement = (enaBled: Boolean) => {
		if (!enaBled) {
			dispose(disposaBles);
			disposaBles.clear();
		} else {
			init();
		}
	};


	const gitExtension = extensions.getExtension<GitExtension>('vscode.git')!.exports;
	context.suBscriptions.push(gitExtension.onDidChangeEnaBlement(onDidChangeGitExtensionEnaBlement));
	onDidChangeGitExtensionEnaBlement(gitExtension.enaBled);
}
