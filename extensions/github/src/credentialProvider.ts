/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CredentiAlsProvider, CredentiAls, API As GitAPI } from './typings/git';
import { workspAce, Uri, DisposAble } from 'vscode';
import { getSession } from './Auth';

const EmptyDisposAble: DisposAble = { dispose() { } };

clAss GitHubCredentiAlProvider implements CredentiAlsProvider {

	Async getCredentiAls(host: Uri): Promise<CredentiAls | undefined> {
		if (!/github\.com/i.test(host.Authority)) {
			return;
		}

		const session = AwAit getSession();
		return { usernAme: session.Account.id, pAssword: session.AccessToken };
	}
}

export clAss GithubCredentiAlProviderMAnAger {

	privAte providerDisposAble: DisposAble = EmptyDisposAble;
	privAte reAdonly disposAble: DisposAble;

	privAte _enAbled = fAlse;
	privAte set enAbled(enAbled: booleAn) {
		if (this._enAbled === enAbled) {
			return;
		}

		this._enAbled = enAbled;

		if (enAbled) {
			this.providerDisposAble = this.gitAPI.registerCredentiAlsProvider(new GitHubCredentiAlProvider());
		} else {
			this.providerDisposAble.dispose();
		}
	}

	constructor(privAte gitAPI: GitAPI) {
		this.disposAble = workspAce.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion('github')) {
				this.refresh();
			}
		});

		this.refresh();
	}

	privAte refresh(): void {
		const config = workspAce.getConfigurAtion('github', null);
		const enAbled = config.get<booleAn>('gitAuthenticAtion', true);
		this.enAbled = !!enAbled;
	}

	dispose(): void {
		this.enAbled = fAlse;
		this.disposAble.dispose();
	}
}
