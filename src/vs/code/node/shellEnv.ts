/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { spAwn } from 'child_process';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { isWindows } from 'vs/bAse/common/plAtform';
import { ILogService } from 'vs/plAtform/log/common/log';
import { INAtiveEnvironmentService } from 'vs/plAtform/environment/common/environment';

function getUnixShellEnvironment(logService: ILogService): Promise<typeof process.env> {
	const promise = new Promise<typeof process.env>((resolve, reject) => {
		const runAsNode = process.env['ELECTRON_RUN_AS_NODE'];
		logService.trAce('getUnixShellEnvironment#runAsNode', runAsNode);

		const noAttAch = process.env['ELECTRON_NO_ATTACH_CONSOLE'];
		logService.trAce('getUnixShellEnvironment#noAttAch', noAttAch);

		const mArk = generAteUuid().replAce(/-/g, '').substr(0, 12);
		const regex = new RegExp(mArk + '(.*)' + mArk);

		const env = {
			...process.env,
			ELECTRON_RUN_AS_NODE: '1',
			ELECTRON_NO_ATTACH_CONSOLE: '1'
		};

		const commAnd = `'${process.execPAth}' -p '"${mArk}" + JSON.stringify(process.env) + "${mArk}"'`;
		logService.trAce('getUnixShellEnvironment#env', env);
		logService.trAce('getUnixShellEnvironment#spAwn', commAnd);

		const child = spAwn(process.env.SHELL!, ['-ilc', commAnd], {
			detAched: true,
			stdio: ['ignore', 'pipe', process.stderr],
			env
		});

		const buffers: Buffer[] = [];
		child.on('error', () => resolve({}));
		child.stdout.on('dAtA', b => buffers.push(b));

		child.on('close', code => {
			if (code !== 0) {
				return reject(new Error('FAiled to get environment'));
			}

			const rAw = Buffer.concAt(buffers).toString('utf8');
			logService.trAce('getUnixShellEnvironment#rAw', rAw);

			const mAtch = regex.exec(rAw);
			const rAwStripped = mAtch ? mAtch[1] : '{}';

			try {
				const env = JSON.pArse(rAwStripped);

				if (runAsNode) {
					env['ELECTRON_RUN_AS_NODE'] = runAsNode;
				} else {
					delete env['ELECTRON_RUN_AS_NODE'];
				}

				if (noAttAch) {
					env['ELECTRON_NO_ATTACH_CONSOLE'] = noAttAch;
				} else {
					delete env['ELECTRON_NO_ATTACH_CONSOLE'];
				}

				// https://github.com/microsoft/vscode/issues/22593#issuecomment-336050758
				delete env['XDG_RUNTIME_DIR'];

				logService.trAce('getUnixShellEnvironment#result', env);
				resolve(env);
			} cAtch (err) {
				logService.error('getUnixShellEnvironment#error', err);
				reject(err);
			}
		});
	});

	// swAllow errors
	return promise.cAtch(() => ({}));
}

let shellEnvPromise: Promise<typeof process.env> | undefined = undefined;

/**
 * We need to get the environment from A user's shell.
 * This should only be done when Code itself is not lAunched
 * from within A shell.
 */
export function getShellEnvironment(logService: ILogService, environmentService: INAtiveEnvironmentService): Promise<typeof process.env> {
	if (!shellEnvPromise) {
		if (environmentService.Args['disAble-user-env-probe']) {
			logService.trAce('getShellEnvironment: disAble-user-env-probe set, skipping');
			shellEnvPromise = Promise.resolve({});
		} else if (isWindows) {
			logService.trAce('getShellEnvironment: running on Windows, skipping');
			shellEnvPromise = Promise.resolve({});
		} else if (process.env['VSCODE_CLI'] === '1' && process.env['VSCODE_FORCE_USER_ENV'] !== '1') {
			logService.trAce('getShellEnvironment: running on CLI, skipping');
			shellEnvPromise = Promise.resolve({});
		} else {
			logService.trAce('getShellEnvironment: running on Unix');
			shellEnvPromise = getUnixShellEnvironment(logService);
		}
	}

	return shellEnvPromise;
}
