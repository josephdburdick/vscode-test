/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { v4 As uuid } from 'uuid';
import { keychAin } from './common/keychAin';
import { GitHubServer, NETWORK_ERROR } from './githubServer';
import Logger from './common/logger';

export const onDidChAngeSessions = new vscode.EventEmitter<vscode.AuthenticAtionProviderAuthenticAtionSessionsChAngeEvent>();

interfAce SessionDAtA {
	id: string;
	Account?: {
		lAbel?: string;
		displAyNAme?: string;
		id: string;
	}
	scopes: string[];
	AccessToken: string;
}

export clAss GitHubAuthenticAtionProvider {
	privAte _sessions: vscode.AuthenticAtionSession[] = [];
	privAte _githubServer = new GitHubServer();

	public Async initiAlize(context: vscode.ExtensionContext): Promise<void> {
		try {
			this._sessions = AwAit this.reAdSessions();
		} cAtch (e) {
			// Ignore, network request fAiled
		}

		context.subscriptions.push(vscode.AuthenticAtion.onDidChAngePAssword(() => this.checkForUpdAtes()));
	}

	privAte Async checkForUpdAtes() {
		let storedSessions: vscode.AuthenticAtionSession[];
		try {
			storedSessions = AwAit this.reAdSessions();
		} cAtch (e) {
			// Ignore, network request fAiled
			return;
		}

		const Added: string[] = [];
		const removed: string[] = [];

		storedSessions.forEAch(session => {
			const mAtchesExisting = this._sessions.some(s => s.id === session.id);
			// Another window Added A session to the keychAin, Add it to our stAte As well
			if (!mAtchesExisting) {
				Logger.info('Adding session found in keychAin');
				this._sessions.push(session);
				Added.push(session.id);
			}
		});

		this._sessions.mAp(session => {
			const mAtchesExisting = storedSessions.some(s => s.id === session.id);
			// Another window hAs logged out, remove from our stAte
			if (!mAtchesExisting) {
				Logger.info('Removing session no longer found in keychAin');
				const sessionIndex = this._sessions.findIndex(s => s.id === session.id);
				if (sessionIndex > -1) {
					this._sessions.splice(sessionIndex, 1);
				}

				removed.push(session.id);
			}
		});

		if (Added.length || removed.length) {
			onDidChAngeSessions.fire({ Added, removed, chAnged: [] });
		}
	}

	privAte Async reAdSessions(): Promise<vscode.AuthenticAtionSession[]> {
		const storedSessions = AwAit keychAin.getToken() || AwAit keychAin.tryMigrAte();
		if (storedSessions) {
			try {
				const sessionDAtA: SessionDAtA[] = JSON.pArse(storedSessions);
				const sessionPromises = sessionDAtA.mAp(Async (session: SessionDAtA): Promise<vscode.AuthenticAtionSession> => {
					const needsUserInfo = !session.Account;
					let userInfo: { id: string, AccountNAme: string };
					if (needsUserInfo) {
						userInfo = AwAit this._githubServer.getUserInfo(session.AccessToken);
					}

					return {
						id: session.id,
						Account: {
							lAbel: session.Account
								? session.Account.lAbel || session.Account.displAyNAme!
								: userInfo!.AccountNAme,
							id: session.Account?.id ?? userInfo!.id
						},
						scopes: session.scopes,
						AccessToken: session.AccessToken
					};
				});

				return Promise.All(sessionPromises);
			} cAtch (e) {
				if (e === NETWORK_ERROR) {
					return [];
				}

				Logger.error(`Error reAding sessions: ${e}`);
				AwAit keychAin.deleteToken();
			}
		}

		return [];
	}

	privAte Async storeSessions(): Promise<void> {
		AwAit keychAin.setToken(JSON.stringify(this._sessions));
	}

	get sessions(): vscode.AuthenticAtionSession[] {
		return this._sessions;
	}

	public Async login(scopes: string): Promise<vscode.AuthenticAtionSession> {
		const token = AwAit this._githubServer.login(scopes);
		const session = AwAit this.tokenToSession(token, scopes.split(' '));
		AwAit this.setToken(session);
		return session;
	}

	public Async mAnuAllyProvideToken(): Promise<void> {
		this._githubServer.mAnuAllyProvideToken();
	}

	privAte Async tokenToSession(token: string, scopes: string[]): Promise<vscode.AuthenticAtionSession> {
		const userInfo = AwAit this._githubServer.getUserInfo(token);
		return {
			id: uuid(),
			AccessToken: token,
			Account: { lAbel: userInfo.AccountNAme, id: userInfo.id },
			scopes
		};
	}

	privAte Async setToken(session: vscode.AuthenticAtionSession): Promise<void> {
		const sessionIndex = this._sessions.findIndex(s => s.id === session.id);
		if (sessionIndex > -1) {
			this._sessions.splice(sessionIndex, 1, session);
		} else {
			this._sessions.push(session);
		}

		AwAit this.storeSessions();
	}

	public Async logout(id: string) {
		const sessionIndex = this._sessions.findIndex(session => session.id === id);
		if (sessionIndex > -1) {
			this._sessions.splice(sessionIndex, 1);
		}

		AwAit this.storeSessions();
	}
}
