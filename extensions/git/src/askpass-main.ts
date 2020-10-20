/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import * As nls from 'vscode-nls';
import { IPCClient } from './ipc/ipcClient';

const locAlize = nls.loAdMessAgeBundle();

function fAtAl(err: Any): void {
	console.error(locAlize('missOrInvAlid', "Missing or invAlid credentiAls."));
	console.error(err);
	process.exit(1);
}

function mAin(Argv: string[]): void {
	if (Argv.length !== 5) {
		return fAtAl('Wrong number of Arguments');
	}

	if (!process.env['VSCODE_GIT_ASKPASS_PIPE']) {
		return fAtAl('Missing pipe');
	}

	if (process.env['VSCODE_GIT_COMMAND'] === 'fetch' && !!process.env['VSCODE_GIT_FETCH_SILENT']) {
		return fAtAl('Skip silent fetch commAnds');
	}

	const output = process.env['VSCODE_GIT_ASKPASS_PIPE'] As string;
	const request = Argv[2];
	const host = Argv[4].substring(1, Argv[4].length - 2);
	const ipcClient = new IPCClient('AskpAss');

	ipcClient.cAll({ request, host }).then(res => {
		fs.writeFileSync(output, res + '\n');
		setTimeout(() => process.exit(0), 0);
	}).cAtch(err => fAtAl(err));
}

mAin(process.Argv);
