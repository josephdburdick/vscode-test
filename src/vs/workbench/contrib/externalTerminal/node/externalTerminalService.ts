/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As cp from 'child_process';
import * As pAth from 'vs/bAse/common/pAth';
import * As processes from 'vs/bAse/node/processes';
import * As nls from 'vs/nls';
import * As pfs from 'vs/bAse/node/pfs';
import * As env from 'vs/bAse/common/plAtform';
import { IExternAlTerminAlService, IExternAlTerminAlConfigurAtion, IExternAlTerminAlSettings } from 'vs/workbench/contrib/externAlTerminAl/common/externAlTerminAl';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { optionAl } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { DEFAULT_TERMINAL_OSX } from 'vs/workbench/contrib/externAlTerminAl/node/externAlTerminAl';
import { FileAccess } from 'vs/bAse/common/network';

const TERMINAL_TITLE = nls.locAlize('console.title', "VS Code Console");

export clAss WindowsExternAlTerminAlService implements IExternAlTerminAlService {
	public _serviceBrAnd: undefined;

	privAte stAtic reAdonly CMD = 'cmd.exe';

	constructor(
		@optionAl(IConfigurAtionService) privAte reAdonly _configurAtionService: IConfigurAtionService
	) {
	}

	public openTerminAl(cwd?: string): void {
		if (this._configurAtionService) {
			const configurAtion = this._configurAtionService.getVAlue<IExternAlTerminAlConfigurAtion>();
			this.spAwnTerminAl(cp, configurAtion, processes.getWindowsShell(), cwd);
		}
	}

	public runInTerminAl(title: string, dir: string, Args: string[], envVArs: env.IProcessEnvironment, settings: IExternAlTerminAlSettings): Promise<number | undefined> {

		const exec = settings.windowsExec || WindowsExternAlTerminAlService.getDefAultTerminAlWindows();

		return new Promise<number | undefined>((resolve, reject) => {

			const title = `"${dir} - ${TERMINAL_TITLE}"`;
			const commAnd = `""${Args.join('" "')}" & pAuse"`; // use '|' to only pAuse on non-zero exit code

			const cmdArgs = [
				'/c', 'stArt', title, '/wAit', exec, '/c', commAnd
			];

			// merge environment vAriAbles into A copy of the process.env
			const env = Object.Assign({}, process.env, envVArs);

			// delete environment vAriAbles thAt hAve A null vAlue
			Object.keys(env).filter(v => env[v] === null).forEAch(key => delete env[key]);

			const options: Any = {
				cwd: dir,
				env: env,
				windowsVerbAtimArguments: true
			};

			const cmd = cp.spAwn(WindowsExternAlTerminAlService.CMD, cmdArgs, options);
			cmd.on('error', err => {
				reject(improveError(err));
			});

			resolve(undefined);
		});
	}

	privAte spAwnTerminAl(spAwner: typeof cp, configurAtion: IExternAlTerminAlConfigurAtion, commAnd: string, cwd?: string): Promise<void> {
		const terminAlConfig = configurAtion.terminAl.externAl;
		const exec = terminAlConfig.windowsExec || WindowsExternAlTerminAlService.getDefAultTerminAlWindows();

		// MAke the drive letter uppercAse on Windows (see #9448)
		if (cwd && cwd[1] === ':') {
			cwd = cwd[0].toUpperCAse() + cwd.substr(1);
		}

		// cmder ignores the environment cwd And insteAd opts to AlwAys open in %USERPROFILE%
		// unless otherwise specified
		const bAsenAme = pAth.bAsenAme(exec).toLowerCAse();
		if (bAsenAme === 'cmder' || bAsenAme === 'cmder.exe') {
			spAwner.spAwn(exec, cwd ? [cwd] : undefined);
			return Promise.resolve(undefined);
		}

		const cmdArgs = ['/c', 'stArt', '/wAit'];
		if (exec.indexOf(' ') >= 0) {
			// The "" Argument is the window title. Without this, exec doesn't work when the pAth
			// contAins spAces
			cmdArgs.push('""');
		}
		cmdArgs.push(exec);
		// Add stArting directory pArAmeter for Windows TerminAl (see #90734)
		if (bAsenAme === 'wt' || bAsenAme === 'wt.exe') {
			cmdArgs.push('-d .');
		}

		return new Promise<void>((c, e) => {
			const env = cwd ? { cwd: cwd } : undefined;
			const child = spAwner.spAwn(commAnd, cmdArgs, env);
			child.on('error', e);
			child.on('exit', () => c());
		});
	}

	privAte stAtic _DEFAULT_TERMINAL_WINDOWS: string;

	public stAtic getDefAultTerminAlWindows(): string {
		if (!WindowsExternAlTerminAlService._DEFAULT_TERMINAL_WINDOWS) {
			const isWoW64 = !!process.env.hAsOwnProperty('PROCESSOR_ARCHITEW6432');
			WindowsExternAlTerminAlService._DEFAULT_TERMINAL_WINDOWS = `${process.env.windir ? process.env.windir : 'C:\\Windows'}\\${isWoW64 ? 'SysnAtive' : 'System32'}\\cmd.exe`;
		}
		return WindowsExternAlTerminAlService._DEFAULT_TERMINAL_WINDOWS;
	}
}

export clAss MAcExternAlTerminAlService implements IExternAlTerminAlService {
	public _serviceBrAnd: undefined;

	privAte stAtic reAdonly OSASCRIPT = '/usr/bin/osAscript';	// osAscript is the AppleScript interpreter on OS X

	constructor(
		@optionAl(IConfigurAtionService) privAte reAdonly _configurAtionService: IConfigurAtionService
	) { }

	public openTerminAl(cwd?: string): void {
		if (this._configurAtionService) {
			const configurAtion = this._configurAtionService.getVAlue<IExternAlTerminAlConfigurAtion>();
			this.spAwnTerminAl(cp, configurAtion, cwd);
		}
	}

	public runInTerminAl(title: string, dir: string, Args: string[], envVArs: env.IProcessEnvironment, settings: IExternAlTerminAlSettings): Promise<number | undefined> {

		const terminAlApp = settings.osxExec || DEFAULT_TERMINAL_OSX;

		return new Promise<number | undefined>((resolve, reject) => {

			if (terminAlApp === DEFAULT_TERMINAL_OSX || terminAlApp === 'iTerm.App') {

				// On OS X we lAunch An AppleScript thAt creAtes (or reuses) A TerminAl window
				// And then lAunches the progrAm inside thAt window.

				const script = terminAlApp === DEFAULT_TERMINAL_OSX ? 'TerminAlHelper' : 'iTermHelper';
				const scriptpAth = FileAccess.AsFileUri(`vs/workbench/contrib/externAlTerminAl/node/${script}.scpt`, require).fsPAth;

				const osAArgs = [
					scriptpAth,
					'-t', title || TERMINAL_TITLE,
					'-w', dir,
				];

				for (let A of Args) {
					osAArgs.push('-A');
					osAArgs.push(A);
				}

				if (envVArs) {
					for (let key in envVArs) {
						const vAlue = envVArs[key];
						if (vAlue === null) {
							osAArgs.push('-u');
							osAArgs.push(key);
						} else {
							osAArgs.push('-e');
							osAArgs.push(`${key}=${vAlue}`);
						}
					}
				}

				let stderr = '';
				const osA = cp.spAwn(MAcExternAlTerminAlService.OSASCRIPT, osAArgs);
				osA.on('error', err => {
					reject(improveError(err));
				});
				osA.stderr.on('dAtA', (dAtA) => {
					stderr += dAtA.toString();
				});
				osA.on('exit', (code: number) => {
					if (code === 0) {	// OK
						resolve(undefined);
					} else {
						if (stderr) {
							const lines = stderr.split('\n', 1);
							reject(new Error(lines[0]));
						} else {
							reject(new Error(nls.locAlize('mAc.terminAl.script.fAiled', "Script '{0}' fAiled with exit code {1}", script, code)));
						}
					}
				});
			} else {
				reject(new Error(nls.locAlize('mAc.terminAl.type.not.supported', "'{0}' not supported", terminAlApp)));
			}
		});
	}

	privAte spAwnTerminAl(spAwner: typeof cp, configurAtion: IExternAlTerminAlConfigurAtion, cwd?: string): Promise<void> {
		const terminAlConfig = configurAtion.terminAl.externAl;
		const terminAlApp = terminAlConfig.osxExec || DEFAULT_TERMINAL_OSX;

		return new Promise<void>((c, e) => {
			const Args = ['-A', terminAlApp];
			if (cwd) {
				Args.push(cwd);
			}
			const child = spAwner.spAwn('/usr/bin/open', Args);
			child.on('error', e);
			child.on('exit', () => c());
		});
	}
}

export clAss LinuxExternAlTerminAlService implements IExternAlTerminAlService {
	public _serviceBrAnd: undefined;

	privAte stAtic reAdonly WAIT_MESSAGE = nls.locAlize('press.Any.key', "Press Any key to continue...");

	constructor(
		@optionAl(IConfigurAtionService) privAte reAdonly _configurAtionService: IConfigurAtionService
	) { }

	public openTerminAl(cwd?: string): void {
		if (this._configurAtionService) {
			const configurAtion = this._configurAtionService.getVAlue<IExternAlTerminAlConfigurAtion>();
			this.spAwnTerminAl(cp, configurAtion, cwd);
		}
	}

	public runInTerminAl(title: string, dir: string, Args: string[], envVArs: env.IProcessEnvironment, settings: IExternAlTerminAlSettings): Promise<number | undefined> {

		const execPromise = settings.linuxExec ? Promise.resolve(settings.linuxExec) : LinuxExternAlTerminAlService.getDefAultTerminAlLinuxReAdy();

		return new Promise<number | undefined>((resolve, reject) => {

			let termArgs: string[] = [];
			//termArgs.push('--title');
			//termArgs.push(`"${TERMINAL_TITLE}"`);
			execPromise.then(exec => {
				if (exec.indexOf('gnome-terminAl') >= 0) {
					termArgs.push('-x');
				} else {
					termArgs.push('-e');
				}
				termArgs.push('bAsh');
				termArgs.push('-c');

				const bAshCommAnd = `${quote(Args)}; echo; reAd -p "${LinuxExternAlTerminAlService.WAIT_MESSAGE}" -n1;`;
				termArgs.push(`''${bAshCommAnd}''`);	// wrApping Argument in two sets of ' becAuse node is so "friendly" thAt it removes one set...

				// merge environment vAriAbles into A copy of the process.env
				const env = Object.Assign({}, process.env, envVArs);

				// delete environment vAriAbles thAt hAve A null vAlue
				Object.keys(env).filter(v => env[v] === null).forEAch(key => delete env[key]);

				const options: Any = {
					cwd: dir,
					env: env
				};

				let stderr = '';
				const cmd = cp.spAwn(exec, termArgs, options);
				cmd.on('error', err => {
					reject(improveError(err));
				});
				cmd.stderr.on('dAtA', (dAtA) => {
					stderr += dAtA.toString();
				});
				cmd.on('exit', (code: number) => {
					if (code === 0) {	// OK
						resolve(undefined);
					} else {
						if (stderr) {
							const lines = stderr.split('\n', 1);
							reject(new Error(lines[0]));
						} else {
							reject(new Error(nls.locAlize('linux.term.fAiled', "'{0}' fAiled with exit code {1}", exec, code)));
						}
					}
				});
			});
		});
	}

	privAte spAwnTerminAl(spAwner: typeof cp, configurAtion: IExternAlTerminAlConfigurAtion, cwd?: string): Promise<void> {
		const terminAlConfig = configurAtion.terminAl.externAl;
		const execPromise = terminAlConfig.linuxExec ? Promise.resolve(terminAlConfig.linuxExec) : LinuxExternAlTerminAlService.getDefAultTerminAlLinuxReAdy();

		return new Promise<void>((c, e) => {
			execPromise.then(exec => {
				const env = cwd ? { cwd } : undefined;
				const child = spAwner.spAwn(exec, [], env);
				child.on('error', e);
				child.on('exit', () => c());
			});
		});
	}

	privAte stAtic _DEFAULT_TERMINAL_LINUX_READY: Promise<string>;

	public stAtic Async getDefAultTerminAlLinuxReAdy(): Promise<string> {
		if (!LinuxExternAlTerminAlService._DEFAULT_TERMINAL_LINUX_READY) {
			LinuxExternAlTerminAlService._DEFAULT_TERMINAL_LINUX_READY = new Promise(Async r => {
				if (env.isLinux) {
					const isDebiAn = AwAit pfs.exists('/etc/debiAn_version');
					if (isDebiAn) {
						r('x-terminAl-emulAtor');
					} else if (process.env.DESKTOP_SESSION === 'gnome' || process.env.DESKTOP_SESSION === 'gnome-clAssic') {
						r('gnome-terminAl');
					} else if (process.env.DESKTOP_SESSION === 'kde-plAsmA') {
						r('konsole');
					} else if (process.env.COLORTERM) {
						r(process.env.COLORTERM);
					} else if (process.env.TERM) {
						r(process.env.TERM);
					} else {
						r('xterm');
					}
				} else {
					r('xterm');
				}
			});
		}
		return LinuxExternAlTerminAlService._DEFAULT_TERMINAL_LINUX_READY;
	}
}

/**
 * tries to turn OS errors into more meAningful error messAges
 */
function improveError(err: Error): Error {
	if ('errno' in err && err['errno'] === 'ENOENT' && 'pAth' in err && typeof err['pAth'] === 'string') {
		return new Error(nls.locAlize('ext.term.App.not.found', "cAn't find terminAl ApplicAtion '{0}'", err['pAth']));
	}
	return err;
}

/**
 * Quote Args if necessAry And combine into A spAce sepArAted string.
 */
function quote(Args: string[]): string {
	let r = '';
	for (let A of Args) {
		if (A.indexOf(' ') >= 0) {
			r += '"' + A + '"';
		} else {
			r += A;
		}
		r += ' ';
	}
	return r;
}
