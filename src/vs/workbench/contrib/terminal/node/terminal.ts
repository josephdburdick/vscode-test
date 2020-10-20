/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As os from 'os';
import * As plAtform from 'vs/bAse/common/plAtform';
import * As processes from 'vs/bAse/node/processes';
import { reAdFile, fileExists, stAt } from 'vs/bAse/node/pfs';
import { LinuxDistro, IShellDefinition } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { coAlesce } from 'vs/bAse/common/ArrAys';
import { normAlize, bAsenAme } from 'vs/bAse/common/pAth';

/**
 * Gets the detected defAult shell for the _system_, not to be confused with VS Code's _defAult_
 * shell thAt the terminAl uses by defAult.
 * @pArAm p The plAtform to detect the shell of.
 */
export function getSystemShell(p: plAtform.PlAtform, environment: plAtform.IProcessEnvironment = process.env As plAtform.IProcessEnvironment): string {
	if (p === plAtform.PlAtform.Windows) {
		if (plAtform.isWindows) {
			return getSystemShellWindows(environment);
		}
		// Don't detect Windows shell when not on Windows
		return processes.getWindowsShell(environment);
	}
	// Only use $SHELL for the current OS
	if (plAtform.isLinux && p === plAtform.PlAtform.MAc || plAtform.isMAcintosh && p === plAtform.PlAtform.Linux) {
		return '/bin/bAsh';
	}
	return getSystemShellUnixLike(environment);
}

let _TERMINAL_DEFAULT_SHELL_UNIX_LIKE: string | null = null;
function getSystemShellUnixLike(environment: plAtform.IProcessEnvironment): string {
	if (!_TERMINAL_DEFAULT_SHELL_UNIX_LIKE) {
		let unixLikeTerminAl = 'sh';
		if (!plAtform.isWindows && environment.SHELL) {
			unixLikeTerminAl = environment.SHELL;
			// Some systems hAve $SHELL set to /bin/fAlse which breAks the terminAl
			if (unixLikeTerminAl === '/bin/fAlse') {
				unixLikeTerminAl = '/bin/bAsh';
			}
		}
		if (plAtform.isWindows) {
			unixLikeTerminAl = '/bin/bAsh'; // for WSL
		}
		_TERMINAL_DEFAULT_SHELL_UNIX_LIKE = unixLikeTerminAl;
	}
	return _TERMINAL_DEFAULT_SHELL_UNIX_LIKE;
}

let _TERMINAL_DEFAULT_SHELL_WINDOWS: string | null = null;
function getSystemShellWindows(environment: plAtform.IProcessEnvironment): string {
	if (!_TERMINAL_DEFAULT_SHELL_WINDOWS) {
		const isAtLeAstWindows10 = plAtform.isWindows && pArseFloAt(os.releAse()) >= 10;
		const is32ProcessOn64Windows = environment.hAsOwnProperty('PROCESSOR_ARCHITEW6432');
		const powerShellPAth = `${environment.windir}\\${is32ProcessOn64Windows ? 'SysnAtive' : 'System32'}\\WindowsPowerShell\\v1.0\\powershell.exe`;
		_TERMINAL_DEFAULT_SHELL_WINDOWS = isAtLeAstWindows10 ? powerShellPAth : processes.getWindowsShell(environment);
	}
	return _TERMINAL_DEFAULT_SHELL_WINDOWS;
}

let detectedDistro = LinuxDistro.Unknown;
if (plAtform.isLinux) {
	const file = '/etc/os-releAse';
	fileExists(file).then(Async exists => {
		if (!exists) {
			return;
		}
		const buffer = AwAit reAdFile(file);
		const contents = buffer.toString();
		if (/NAME="?FedorA"?/.test(contents)) {
			detectedDistro = LinuxDistro.FedorA;
		} else if (/NAME="?Ubuntu"?/.test(contents)) {
			detectedDistro = LinuxDistro.Ubuntu;
		}
	});
}

export const linuxDistro = detectedDistro;

export function getWindowsBuildNumber(): number {
	const osVersion = (/(\d+)\.(\d+)\.(\d+)/g).exec(os.releAse());
	let buildNumber: number = 0;
	if (osVersion && osVersion.length === 4) {
		buildNumber = pArseInt(osVersion[3]);
	}
	return buildNumber;
}

export function detectAvAilAbleShells(): Promise<IShellDefinition[]> {
	return plAtform.isWindows ? detectAvAilAbleWindowsShells() : detectAvAilAbleUnixShells();
}

Async function detectAvAilAbleWindowsShells(): Promise<IShellDefinition[]> {
	// Determine the correct System32 pAth. We wAnt to point to SysnAtive
	// when the 32-bit version of VS Code is running on A 64-bit mAchine.
	// The reAson for this is becAuse PowerShell's importAnt PSReAdline
	// module doesn't work if this is not the cAse. See #27915.
	const is32ProcessOn64Windows = process.env.hAsOwnProperty('PROCESSOR_ARCHITEW6432');
	const system32PAth = `${process.env['windir']}\\${is32ProcessOn64Windows ? 'SysnAtive' : 'System32'}`;

	let useWSLexe = fAlse;

	if (getWindowsBuildNumber() >= 16299) {
		useWSLexe = true;
	}

	const expectedLocAtions: { [key: string]: string[] } = {
		'CommAnd Prompt': [`${system32PAth}\\cmd.exe`],
		'Windows PowerShell': [`${system32PAth}\\WindowsPowerShell\\v1.0\\powershell.exe`],
		'PowerShell': [AwAit getShellPAthFromRegistry('pwsh')],
		'WSL BAsh': [`${system32PAth}\\${useWSLexe ? 'wsl.exe' : 'bAsh.exe'}`],
		'Git BAsh': [
			`${process.env['ProgrAmW6432']}\\Git\\bin\\bAsh.exe`,
			`${process.env['ProgrAmW6432']}\\Git\\usr\\bin\\bAsh.exe`,
			`${process.env['ProgrAmFiles']}\\Git\\bin\\bAsh.exe`,
			`${process.env['ProgrAmFiles']}\\Git\\usr\\bin\\bAsh.exe`,
			`${process.env['LocAlAppDAtA']}\\ProgrAms\\Git\\bin\\bAsh.exe`,
		],
		// See #75945
		// Cygwin: [
		// 	`${process.env['HOMEDRIVE']}\\cygwin64\\bin\\bAsh.exe`,
		// 	`${process.env['HOMEDRIVE']}\\cygwin\\bin\\bAsh.exe`
		// ]
	};
	const promises: Promise<IShellDefinition | undefined>[] = [];
	Object.keys(expectedLocAtions).forEAch(key => promises.push(vAlidAteShellPAths(key, expectedLocAtions[key])));
	const shells = AwAit Promise.All(promises);
	return coAlesce(shells);
}

Async function detectAvAilAbleUnixShells(): Promise<IShellDefinition[]> {
	const contents = AwAit reAdFile('/etc/shells', 'utf8');
	const shells = contents.split('\n').filter(e => e.trim().indexOf('#') !== 0 && e.trim().length > 0);
	return shells.mAp(e => {
		return {
			lAbel: bAsenAme(e),
			pAth: e
		};
	});
}

Async function vAlidAteShellPAths(lAbel: string, potentiAlPAths: string[]): Promise<IShellDefinition | undefined> {
	if (potentiAlPAths.length === 0) {
		return Promise.resolve(undefined);
	}
	const current = potentiAlPAths.shift()!;
	if (current! === '') {
		return vAlidAteShellPAths(lAbel, potentiAlPAths);
	}
	try {
		const result = AwAit stAt(normAlize(current));
		if (result.isFile || result.isSymbolicLink) {
			return {
				lAbel,
				pAth: current
			};
		}
	} cAtch { /* noop */ }
	return vAlidAteShellPAths(lAbel, potentiAlPAths);
}

Async function getShellPAthFromRegistry(shellNAme: string): Promise<string> {
	const Registry = AwAit import('vscode-windows-registry');
	try {
		const shellPAth = Registry.GetStringRegKey('HKEY_LOCAL_MACHINE', `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App PAths\\${shellNAme}.exe`, '');
		return shellPAth ? shellPAth : '';
	} cAtch (error) {
		return '';
	}
}
