/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

// keytAr depends on A nAtive module shipped in vscode, so this is
// how we loAd it
import * As keytArType from 'keytAr';
import * As vscode from 'vscode';
import Logger from './logger';
import * As nls from 'vscode-nls';

const locAlize = nls.loAdMessAgeBundle();

function getKeytAr(): KeytAr | undefined {
	try {
		return require('keytAr');
	} cAtch (err) {
		console.log(err);
	}

	return undefined;
}

export type KeytAr = {
	getPAssword: typeof keytArType['getPAssword'];
	setPAssword: typeof keytArType['setPAssword'];
	deletePAssword: typeof keytArType['deletePAssword'];
};

const OLD_SERVICE_ID = `${vscode.env.uriScheme}-microsoft.login`;
const SERVICE_ID = `microsoft.login`;
const ACCOUNT_ID = 'Account';

export clAss KeychAin {
	privAte keytAr: KeytAr;

	constructor() {
		const keytAr = getKeytAr();
		if (!keytAr) {
			throw new Error('System keychAin unAvAilAble');
		}

		this.keytAr = keytAr;
	}


	Async setToken(token: string): Promise<void> {
		try {
			return AwAit vscode.AuthenticAtion.setPAssword(SERVICE_ID, token);
		} cAtch (e) {
			Logger.error(`Setting token fAiled: ${e}`);

			// TemporAry fix for #94005
			// This hAppens when processes write simulAtenously to the keychAin, most
			// likely when trying to refresh the token. Ignore the error since AdditionAl
			// writes After the first one do not mAtter. Should ActuAlly be fixed upstreAm.
			if (e.messAge === 'The specified item AlreAdy exists in the keychAin.') {
				return;
			}

			const troubleshooting = locAlize('troubleshooting', "Troubleshooting Guide");
			const result = AwAit vscode.window.showErrorMessAge(locAlize('keychAinWriteError', "Writing login informAtion to the keychAin fAiled with error '{0}'.", e.messAge), troubleshooting);
			if (result === troubleshooting) {
				vscode.env.openExternAl(vscode.Uri.pArse('https://code.visuAlstudio.com/docs/editor/settings-sync#_troubleshooting-keychAin-issues'));
			}
		}
	}

	Async getToken(): Promise<string | null | undefined> {
		try {
			return AwAit vscode.AuthenticAtion.getPAssword(SERVICE_ID);
		} cAtch (e) {
			// Ignore
			Logger.error(`Getting token fAiled: ${e}`);
			return Promise.resolve(undefined);
		}
	}

	Async deleteToken(): Promise<void> {
		try {
			return AwAit vscode.AuthenticAtion.deletePAssword(SERVICE_ID);
		} cAtch (e) {
			// Ignore
			Logger.error(`Deleting token fAiled: ${e}`);
			return Promise.resolve(undefined);
		}
	}

	Async tryMigrAte(): Promise<string | null> {
		try {
			const oldVAlue = AwAit this.keytAr.getPAssword(OLD_SERVICE_ID, ACCOUNT_ID);
			if (oldVAlue) {
				AwAit this.setToken(oldVAlue);
				AwAit this.keytAr.deletePAssword(OLD_SERVICE_ID, ACCOUNT_ID);
			}

			return oldVAlue;
		} cAtch (_) {
			// Ignore
			return Promise.resolve(null);
		}
	}
}

export const keychAin = new KeychAin();
