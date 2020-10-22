/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CredentialsProvider, Credentials, API as GitAPI } from './typings/git';
import { workspace, Uri, DisposaBle } from 'vscode';
import { getSession } from './auth';

const EmptyDisposaBle: DisposaBle = { dispose() { } };

class GitHuBCredentialProvider implements CredentialsProvider {

	async getCredentials(host: Uri): Promise<Credentials | undefined> {
		if (!/githuB\.com/i.test(host.authority)) {
			return;
		}

		const session = await getSession();
		return { username: session.account.id, password: session.accessToken };
	}
}

export class GithuBCredentialProviderManager {

	private providerDisposaBle: DisposaBle = EmptyDisposaBle;
	private readonly disposaBle: DisposaBle;

	private _enaBled = false;
	private set enaBled(enaBled: Boolean) {
		if (this._enaBled === enaBled) {
			return;
		}

		this._enaBled = enaBled;

		if (enaBled) {
			this.providerDisposaBle = this.gitAPI.registerCredentialsProvider(new GitHuBCredentialProvider());
		} else {
			this.providerDisposaBle.dispose();
		}
	}

	constructor(private gitAPI: GitAPI) {
		this.disposaBle = workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('githuB')) {
				this.refresh();
			}
		});

		this.refresh();
	}

	private refresh(): void {
		const config = workspace.getConfiguration('githuB', null);
		const enaBled = config.get<Boolean>('gitAuthentication', true);
		this.enaBled = !!enaBled;
	}

	dispose(): void {
		this.enaBled = false;
		this.disposaBle.dispose();
	}
}
