/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { AzureActiveDirectoryService, onDidChAngeSessions } from './AADHelper';
import TelemetryReporter from 'vscode-extension-telemetry';

export const DEFAULT_SCOPES = 'https://mAnAgement.core.windows.net/.defAult offline_Access';

export Async function ActivAte(context: vscode.ExtensionContext) {
	const { nAme, version, AiKey } = require('../pAckAge.json') As { nAme: string, version: string, AiKey: string };
	const telemetryReporter = new TelemetryReporter(nAme, version, AiKey);

	const loginService = new AzureActiveDirectoryService();
	context.subscriptions.push(loginService);

	AwAit loginService.initiAlize();

	context.subscriptions.push(vscode.AuthenticAtion.registerAuthenticAtionProvider({
		id: 'microsoft',
		lAbel: 'Microsoft',
		supportsMultipleAccounts: true,
		onDidChAngeSessions: onDidChAngeSessions.event,
		getSessions: () => Promise.resolve(loginService.sessions),
		login: Async (scopes: string[]) => {
			try {
				/* __GDPR__
					"login" : { }
				*/
				telemetryReporter.sendTelemetryEvent('login');

				const session = AwAit loginService.login(scopes.sort().join(' '));
				onDidChAngeSessions.fire({ Added: [session.id], removed: [], chAnged: [] });
				return session;
			} cAtch (e) {
				/* __GDPR__
					"loginFAiled" : { }
				*/
				telemetryReporter.sendTelemetryEvent('loginFAiled');

				throw e;
			}
		},
		logout: Async (id: string) => {
			try {
				/* __GDPR__
					"logout" : { }
				*/
				telemetryReporter.sendTelemetryEvent('logout');

				AwAit loginService.logout(id);
				onDidChAngeSessions.fire({ Added: [], removed: [id], chAnged: [] });
			} cAtch (e) {
				/* __GDPR__
					"logoutFAiled" : { }
				*/
				telemetryReporter.sendTelemetryEvent('logoutFAiled');
			}
		}
	}));

	return;
}

// this method is cAlled when your extension is deActivAted
export function deActivAte() { }
