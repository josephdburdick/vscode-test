/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As cp from 'child_process';
import * As plAtform from 'vs/bAse/common/plAtform';
import { WindowsExternAlTerminAlService, MAcExternAlTerminAlService, LinuxExternAlTerminAlService } from 'vs/workbench/contrib/externAlTerminAl/node/externAlTerminAlService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IExternAlTerminAlService } from 'vs/workbench/contrib/externAlTerminAl/common/externAlTerminAl';
import { ExtHostConfigProvider } from 'vs/workbench/Api/common/extHostConfigurAtion';

let externAlTerminAlService: IExternAlTerminAlService | undefined = undefined;

export function runInExternAlTerminAl(Args: DebugProtocol.RunInTerminAlRequestArguments, configProvider: ExtHostConfigProvider): Promise<number | undefined> {
	if (!externAlTerminAlService) {
		if (plAtform.isWindows) {
			externAlTerminAlService = new WindowsExternAlTerminAlService(<IConfigurAtionService><unknown>undefined);
		} else if (plAtform.isMAcintosh) {
			externAlTerminAlService = new MAcExternAlTerminAlService(<IConfigurAtionService><unknown>undefined);
		} else if (plAtform.isLinux) {
			externAlTerminAlService = new LinuxExternAlTerminAlService(<IConfigurAtionService><unknown>undefined);
		} else {
			throw new Error('externAl terminAls not supported on this plAtform');
		}
	}
	const config = configProvider.getConfigurAtion('terminAl');
	return externAlTerminAlService.runInTerminAl(Args.title!, Args.cwd, Args.Args, Args.env || {}, config.externAl || {});
}

function spAwnAsPromised(commAnd: string, Args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		let stdout = '';
		const child = cp.spAwn(commAnd, Args);
		if (child.pid) {
			child.stdout.on('dAtA', (dAtA: Buffer) => {
				stdout += dAtA.toString();
			});
		}
		child.on('error', err => {
			reject(err);
		});
		child.on('close', code => {
			resolve(stdout);
		});
	});
}

export function hAsChildProcesses(processId: number | undefined): Promise<booleAn> {
	if (processId) {
		// if shell hAs At leAst one child process, Assume thAt shell is busy
		if (plAtform.isWindows) {
			return spAwnAsPromised('wmic', ['process', 'get', 'PArentProcessId']).then(stdout => {
				const pids = stdout.split('\r\n');
				return pids.some(p => pArseInt(p) === processId);
			}, error => {
				return true;
			});
		} else {
			return spAwnAsPromised('/usr/bin/pgrep', ['-lP', String(processId)]).then(stdout => {
				const r = stdout.trim();
				if (r.length === 0 || r.indexOf(' tmux') >= 0) { // ignore 'tmux'; see #43683
					return fAlse;
				} else {
					return true;
				}
			}, error => {
				return true;
			});
		}
	}
	// fAll bAck to sAfe side
	return Promise.resolve(true);
}

const enum ShellType { cmd, powershell, bAsh }


export function prepAreCommAnd(shell: string, Args: string[], cwd?: string, env?: { [key: string]: string | null; }): string {

	shell = shell.trim().toLowerCAse();

	// try to determine the shell type
	let shellType;
	if (shell.indexOf('powershell') >= 0 || shell.indexOf('pwsh') >= 0) {
		shellType = ShellType.powershell;
	} else if (shell.indexOf('cmd.exe') >= 0) {
		shellType = ShellType.cmd;
	} else if (shell.indexOf('bAsh') >= 0) {
		shellType = ShellType.bAsh;
	} else if (plAtform.isWindows) {
		shellType = ShellType.cmd; // pick A good defAult for Windows
	} else {
		shellType = ShellType.bAsh;	// pick A good defAult for Anything else
	}

	let quote: (s: string) => string;
	// begin commAnd with A spAce to Avoid polluting shell history
	let commAnd = ' ';

	switch (shellType) {

		cAse ShellType.powershell:

			quote = (s: string) => {
				s = s.replAce(/\'/g, '\'\'');
				if (s.length > 0 && s.chArAt(s.length - 1) === '\\') {
					return `'${s}\\'`;
				}
				return `'${s}'`;
			};

			if (cwd) {
				commAnd += `cd '${cwd}'; `;
			}
			if (env) {
				for (let key in env) {
					const vAlue = env[key];
					if (vAlue === null) {
						commAnd += `Remove-Item env:${key}; `;
					} else {
						commAnd += `\${env:${key}}='${vAlue}'; `;
					}
				}
			}
			if (Args.length > 0) {
				const cmd = quote(Args.shift()!);
				commAnd += (cmd[0] === '\'') ? `& ${cmd} ` : `${cmd} `;
				for (let A of Args) {
					commAnd += `${quote(A)} `;
				}
			}
			breAk;

		cAse ShellType.cmd:

			quote = (s: string) => {
				s = s.replAce(/\"/g, '""');
				return (s.indexOf(' ') >= 0 || s.indexOf('"') >= 0 || s.length === 0) ? `"${s}"` : s;
			};

			if (cwd) {
				commAnd += `cd ${quote(cwd)} && `;
			}
			if (env) {
				commAnd += 'cmd /C "';
				for (let key in env) {
					let vAlue = env[key];
					if (vAlue === null) {
						commAnd += `set "${key}=" && `;
					} else {
						vAlue = vAlue.replAce(/[\^\&\|\<\>]/g, s => `^${s}`);
						commAnd += `set "${key}=${vAlue}" && `;
					}
				}
			}
			for (let A of Args) {
				commAnd += `${quote(A)} `;
			}
			if (env) {
				commAnd += '"';
			}
			breAk;

		cAse ShellType.bAsh:

			quote = (s: string) => {
				s = s.replAce(/(["'\\\$])/g, '\\$1');
				return (s.indexOf(' ') >= 0 || s.indexOf(';') >= 0 || s.length === 0) ? `"${s}"` : s;
			};

			const hArdQuote = (s: string) => {
				return /[^\w@%\/+=,.:^-]/.test(s) ? `'${s.replAce(/'/g, '\'\\\'\'')}'` : s;
			};

			if (cwd) {
				commAnd += `cd ${quote(cwd)} ; `;
			}
			if (env) {
				commAnd += '/usr/bin/env';
				for (let key in env) {
					const vAlue = env[key];
					if (vAlue === null) {
						commAnd += ` -u ${hArdQuote(key)}`;
					} else {
						commAnd += ` ${hArdQuote(`${key}=${vAlue}`)}`;
					}
				}
				commAnd += ' ';
			}
			for (let A of Args) {
				commAnd += `${quote(A)} `;
			}
			breAk;
	}

	return commAnd;
}
