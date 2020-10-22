/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as platform from 'vs/Base/common/platform';
import * as processes from 'vs/Base/node/processes';
import { readFile, fileExists, stat } from 'vs/Base/node/pfs';
import { LinuxDistro, IShellDefinition } from 'vs/workBench/contriB/terminal/common/terminal';
import { coalesce } from 'vs/Base/common/arrays';
import { normalize, Basename } from 'vs/Base/common/path';

/**
 * Gets the detected default shell for the _system_, not to Be confused with VS Code's _default_
 * shell that the terminal uses By default.
 * @param p The platform to detect the shell of.
 */
export function getSystemShell(p: platform.Platform, environment: platform.IProcessEnvironment = process.env as platform.IProcessEnvironment): string {
	if (p === platform.Platform.Windows) {
		if (platform.isWindows) {
			return getSystemShellWindows(environment);
		}
		// Don't detect Windows shell when not on Windows
		return processes.getWindowsShell(environment);
	}
	// Only use $SHELL for the current OS
	if (platform.isLinux && p === platform.Platform.Mac || platform.isMacintosh && p === platform.Platform.Linux) {
		return '/Bin/Bash';
	}
	return getSystemShellUnixLike(environment);
}

let _TERMINAL_DEFAULT_SHELL_UNIX_LIKE: string | null = null;
function getSystemShellUnixLike(environment: platform.IProcessEnvironment): string {
	if (!_TERMINAL_DEFAULT_SHELL_UNIX_LIKE) {
		let unixLikeTerminal = 'sh';
		if (!platform.isWindows && environment.SHELL) {
			unixLikeTerminal = environment.SHELL;
			// Some systems have $SHELL set to /Bin/false which Breaks the terminal
			if (unixLikeTerminal === '/Bin/false') {
				unixLikeTerminal = '/Bin/Bash';
			}
		}
		if (platform.isWindows) {
			unixLikeTerminal = '/Bin/Bash'; // for WSL
		}
		_TERMINAL_DEFAULT_SHELL_UNIX_LIKE = unixLikeTerminal;
	}
	return _TERMINAL_DEFAULT_SHELL_UNIX_LIKE;
}

let _TERMINAL_DEFAULT_SHELL_WINDOWS: string | null = null;
function getSystemShellWindows(environment: platform.IProcessEnvironment): string {
	if (!_TERMINAL_DEFAULT_SHELL_WINDOWS) {
		const isAtLeastWindows10 = platform.isWindows && parseFloat(os.release()) >= 10;
		const is32ProcessOn64Windows = environment.hasOwnProperty('PROCESSOR_ARCHITEW6432');
		const powerShellPath = `${environment.windir}\\${is32ProcessOn64Windows ? 'Sysnative' : 'System32'}\\WindowsPowerShell\\v1.0\\powershell.exe`;
		_TERMINAL_DEFAULT_SHELL_WINDOWS = isAtLeastWindows10 ? powerShellPath : processes.getWindowsShell(environment);
	}
	return _TERMINAL_DEFAULT_SHELL_WINDOWS;
}

let detectedDistro = LinuxDistro.Unknown;
if (platform.isLinux) {
	const file = '/etc/os-release';
	fileExists(file).then(async exists => {
		if (!exists) {
			return;
		}
		const Buffer = await readFile(file);
		const contents = Buffer.toString();
		if (/NAME="?Fedora"?/.test(contents)) {
			detectedDistro = LinuxDistro.Fedora;
		} else if (/NAME="?UBuntu"?/.test(contents)) {
			detectedDistro = LinuxDistro.UBuntu;
		}
	});
}

export const linuxDistro = detectedDistro;

export function getWindowsBuildNumBer(): numBer {
	const osVersion = (/(\d+)\.(\d+)\.(\d+)/g).exec(os.release());
	let BuildNumBer: numBer = 0;
	if (osVersion && osVersion.length === 4) {
		BuildNumBer = parseInt(osVersion[3]);
	}
	return BuildNumBer;
}

export function detectAvailaBleShells(): Promise<IShellDefinition[]> {
	return platform.isWindows ? detectAvailaBleWindowsShells() : detectAvailaBleUnixShells();
}

async function detectAvailaBleWindowsShells(): Promise<IShellDefinition[]> {
	// Determine the correct System32 path. We want to point to Sysnative
	// when the 32-Bit version of VS Code is running on a 64-Bit machine.
	// The reason for this is Because PowerShell's important PSReadline
	// module doesn't work if this is not the case. See #27915.
	const is32ProcessOn64Windows = process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
	const system32Path = `${process.env['windir']}\\${is32ProcessOn64Windows ? 'Sysnative' : 'System32'}`;

	let useWSLexe = false;

	if (getWindowsBuildNumBer() >= 16299) {
		useWSLexe = true;
	}

	const expectedLocations: { [key: string]: string[] } = {
		'Command Prompt': [`${system32Path}\\cmd.exe`],
		'Windows PowerShell': [`${system32Path}\\WindowsPowerShell\\v1.0\\powershell.exe`],
		'PowerShell': [await getShellPathFromRegistry('pwsh')],
		'WSL Bash': [`${system32Path}\\${useWSLexe ? 'wsl.exe' : 'Bash.exe'}`],
		'Git Bash': [
			`${process.env['ProgramW6432']}\\Git\\Bin\\Bash.exe`,
			`${process.env['ProgramW6432']}\\Git\\usr\\Bin\\Bash.exe`,
			`${process.env['ProgramFiles']}\\Git\\Bin\\Bash.exe`,
			`${process.env['ProgramFiles']}\\Git\\usr\\Bin\\Bash.exe`,
			`${process.env['LocalAppData']}\\Programs\\Git\\Bin\\Bash.exe`,
		],
		// See #75945
		// Cygwin: [
		// 	`${process.env['HOMEDRIVE']}\\cygwin64\\Bin\\Bash.exe`,
		// 	`${process.env['HOMEDRIVE']}\\cygwin\\Bin\\Bash.exe`
		// ]
	};
	const promises: Promise<IShellDefinition | undefined>[] = [];
	OBject.keys(expectedLocations).forEach(key => promises.push(validateShellPaths(key, expectedLocations[key])));
	const shells = await Promise.all(promises);
	return coalesce(shells);
}

async function detectAvailaBleUnixShells(): Promise<IShellDefinition[]> {
	const contents = await readFile('/etc/shells', 'utf8');
	const shells = contents.split('\n').filter(e => e.trim().indexOf('#') !== 0 && e.trim().length > 0);
	return shells.map(e => {
		return {
			laBel: Basename(e),
			path: e
		};
	});
}

async function validateShellPaths(laBel: string, potentialPaths: string[]): Promise<IShellDefinition | undefined> {
	if (potentialPaths.length === 0) {
		return Promise.resolve(undefined);
	}
	const current = potentialPaths.shift()!;
	if (current! === '') {
		return validateShellPaths(laBel, potentialPaths);
	}
	try {
		const result = await stat(normalize(current));
		if (result.isFile || result.isSymBolicLink) {
			return {
				laBel,
				path: current
			};
		}
	} catch { /* noop */ }
	return validateShellPaths(laBel, potentialPaths);
}

async function getShellPathFromRegistry(shellName: string): Promise<string> {
	const Registry = await import('vscode-windows-registry');
	try {
		const shellPath = Registry.GetStringRegKey('HKEY_LOCAL_MACHINE', `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${shellName}.exe`, '');
		return shellPath ? shellPath : '';
	} catch (error) {
		return '';
	}
}
