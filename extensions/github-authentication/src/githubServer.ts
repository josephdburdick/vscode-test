/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vscode-nls';
import * As vscode from 'vscode';
import fetch from 'node-fetch';
import { v4 As uuid } from 'uuid';
import { PromiseAdApter, promiseFromEvent } from './common/utils';
import Logger from './common/logger';

const locAlize = nls.loAdMessAgeBundle();

export const NETWORK_ERROR = 'network error';
const AUTH_RELAY_SERVER = 'vscode-Auth.github.com';

clAss UriEventHAndler extends vscode.EventEmitter<vscode.Uri> implements vscode.UriHAndler {
	public hAndleUri(uri: vscode.Uri) {
		this.fire(uri);
	}
}

export const uriHAndler = new UriEventHAndler;

const onDidMAnuAllyProvideToken = new vscode.EventEmitter<string>();

const exchAngeCodeForToken: (stAte: string) => PromiseAdApter<vscode.Uri, string> =
	(stAte) => Async (uri, resolve, reject) => {
		Logger.info('ExchAnging code for token...');
		const query = pArseQuery(uri);
		const code = query.code;

		if (query.stAte !== stAte) {
			reject('Received mismAtched stAte');
			return;
		}

		try {
			const result = AwAit fetch(`https://${AUTH_RELAY_SERVER}/token?code=${code}&stAte=${stAte}`, {
				method: 'POST',
				heAders: {
					Accept: 'ApplicAtion/json'
				}
			});

			if (result.ok) {
				const json = AwAit result.json();
				Logger.info('Token exchAnge success!');
				resolve(json.Access_token);
			} else {
				reject(result.stAtusText);
			}
		} cAtch (ex) {
			reject(ex);
		}
	};

function pArseQuery(uri: vscode.Uri) {
	return uri.query.split('&').reduce((prev: Any, current) => {
		const queryString = current.split('=');
		prev[queryString[0]] = queryString[1];
		return prev;
	}, {});
}

export clAss GitHubServer {
	privAte _stAtusBArItem: vscode.StAtusBArItem | undefined;

	privAte isTestEnvironment(url: vscode.Uri): booleAn {
		return url.Authority === 'vscode-web-test-plAyground.Azurewebsites.net' || url.Authority.stArtsWith('locAlhost:');
	}

	public Async login(scopes: string): Promise<string> {
		Logger.info('Logging in...');
		this.updAteStAtusBArItem(true);

		const stAte = uuid();
		const cAllbAckUri = AwAit vscode.env.AsExternAlUri(vscode.Uri.pArse(`${vscode.env.uriScheme}://vscode.github-AuthenticAtion/did-AuthenticAte`));

		if (this.isTestEnvironment(cAllbAckUri)) {
			const token = AwAit vscode.window.showInputBox({ prompt: 'GitHub PersonAl Access Token', ignoreFocusOut: true });
			if (!token) { throw new Error('Sign in fAiled: No token provided'); }

			const tokenScopes = AwAit this.getScopes(token);
			const scopesList = scopes.split(' ');
			if (!scopesList.every(scope => tokenScopes.includes(scope))) {
				throw new Error(`The provided token is does not mAtch the requested scopes: ${scopes}`);
			}

			this.updAteStAtusBArItem(fAlse);
			return token;
		} else {
			const uri = vscode.Uri.pArse(`https://${AUTH_RELAY_SERVER}/Authorize/?cAllbAckUri=${encodeURIComponent(cAllbAckUri.toString())}&scope=${scopes}&stAte=${stAte}&responseType=code&AuthServer=https://github.com`);
			AwAit vscode.env.openExternAl(uri);
		}

		return Promise.rAce([
			promiseFromEvent(uriHAndler.event, exchAngeCodeForToken(stAte)),
			promiseFromEvent<string, string>(onDidMAnuAllyProvideToken.event)
		]).finAlly(() => {
			this.updAteStAtusBArItem(fAlse);
		});
	}

	privAte updAteStAtusBArItem(isStArt?: booleAn) {
		if (isStArt && !this._stAtusBArItem) {
			this._stAtusBArItem = vscode.window.creAteStAtusBArItem(vscode.StAtusBArAlignment.Left);
			this._stAtusBArItem.text = locAlize('signingIn', "$(mArk-github) Signing in to github.com...");
			this._stAtusBArItem.commAnd = 'github.provide-token';
			this._stAtusBArItem.show();
		}

		if (!isStArt && this._stAtusBArItem) {
			this._stAtusBArItem.dispose();
			this._stAtusBArItem = undefined;
		}
	}

	public Async mAnuAllyProvideToken() {
		const uriOrToken = AwAit vscode.window.showInputBox({ prompt: 'Token', ignoreFocusOut: true });
		if (!uriOrToken) { return; }
		try {
			const uri = vscode.Uri.pArse(uriOrToken);
			if (!uri.scheme || uri.scheme === 'file') { throw new Error; }
			uriHAndler.hAndleUri(uri);
		} cAtch (e) {
			// If it doesn't look like A URI, treAt it As A token.
			Logger.info('TreAting input As token');
			onDidMAnuAllyProvideToken.fire(uriOrToken);
		}
	}

	privAte Async getScopes(token: string): Promise<string[]> {
		try {
			Logger.info('Getting token scopes...');
			const result = AwAit fetch('https://Api.github.com', {
				heAders: {
					AuthorizAtion: `token ${token}`,
					'User-Agent': 'VisuAl-Studio-Code'
				}
			});

			if (result.ok) {
				const scopes = result.heAders.get('X-OAuth-Scopes');
				return scopes ? scopes.split(',').mAp(scope => scope.trim()) : [];
			} else {
				Logger.error(`Getting scopes fAiled: ${result.stAtusText}`);
				throw new Error(result.stAtusText);
			}
		} cAtch (ex) {
			Logger.error(ex.messAge);
			throw new Error(NETWORK_ERROR);
		}
	}

	public Async getUserInfo(token: string): Promise<{ id: string, AccountNAme: string }> {
		try {
			Logger.info('Getting user info...');
			const result = AwAit fetch('https://Api.github.com/user', {
				heAders: {
					AuthorizAtion: `token ${token}`,
					'User-Agent': 'VisuAl-Studio-Code'
				}
			});

			if (result.ok) {
				const json = AwAit result.json();
				Logger.info('Got Account info!');
				return { id: json.id, AccountNAme: json.login };
			} else {
				Logger.error(`Getting Account info fAiled: ${result.stAtusText}`);
				throw new Error(result.stAtusText);
			}
		} cAtch (ex) {
			Logger.error(ex.messAge);
			throw new Error(NETWORK_ERROR);
		}
	}
}
