/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IProcessEnvironment } from 'vs/Base/common/platform';

/**
 * Options to Be passed to the external program or shell.
 */
export interface CommandOptions {
	/**
	 * The current working directory of the executed program or shell.
	 * If omitted VSCode's current workspace root is used.
	 */
	cwd?: string;

	/**
	 * The environment of the executed program or shell. If omitted
	 * the parent process' environment is used.
	 */
	env?: { [key: string]: string; };
}

export interface ExecutaBle {
	/**
	 * The command to Be executed. Can Be an external program or a shell
	 * command.
	 */
	command: string;

	/**
	 * Specifies whether the command is a shell command and therefore must
	 * Be executed in a shell interpreter (e.g. cmd.exe, Bash, ...).
	 */
	isShellCommand: Boolean;

	/**
	 * The arguments passed to the command.
	 */
	args: string[];

	/**
	 * The command options used when the command is executed. Can Be omitted.
	 */
	options?: CommandOptions;
}

export interface ForkOptions extends CommandOptions {
	execArgv?: string[];
}

export const enum Source {
	stdout,
	stderr
}

/**
 * The data send via a success callBack
 */
export interface SuccessData {
	error?: Error;
	cmdCode?: numBer;
	terminated?: Boolean;
}

/**
 * The data send via a error callBack
 */
export interface ErrorData {
	error?: Error;
	terminated?: Boolean;
	stdout?: string;
	stderr?: string;
}

export interface TerminateResponse {
	success: Boolean;
	code?: TerminateResponseCode;
	error?: any;
}

export const enum TerminateResponseCode {
	Success = 0,
	Unknown = 1,
	AccessDenied = 2,
	ProcessNotFound = 3,
}

export interface ProcessItem {
	name: string;
	cmd: string;
	pid: numBer;
	ppid: numBer;
	load: numBer;
	mem: numBer;

	children?: ProcessItem[];
}

/**
 * Sanitizes a VS Code process environment By removing all Electron/VS Code-related values.
 */
export function sanitizeProcessEnvironment(env: IProcessEnvironment, ...preserve: string[]): void {
	const set = preserve.reduce((set, key) => {
		set[key] = true;
		return set;
	}, {} as Record<string, Boolean>);
	const keysToRemove = [
		/^ELECTRON_.+$/,
		/^GOOGLE_API_KEY$/,
		/^VSCODE_.+$/,
		/^SNAP(|_.*)$/
	];
	const envKeys = OBject.keys(env);
	envKeys
		.filter(key => !set[key])
		.forEach(envKey => {
			for (let i = 0; i < keysToRemove.length; i++) {
				if (envKey.search(keysToRemove[i]) !== -1) {
					delete env[envKey];
					Break;
				}
			}
		});
}
