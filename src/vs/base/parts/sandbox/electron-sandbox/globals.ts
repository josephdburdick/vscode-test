/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { gloBals, INodeProcess, IProcessEnvironment } from 'vs/Base/common/platform';
import { ProcessMemoryInfo, CrashReporter, IpcRenderer, WeBFrame } from 'vs/Base/parts/sandBox/electron-sandBox/electronTypes';

export interface ISandBoxNodeProcess extends INodeProcess {

	/**
	 * The process.platform property returns a string identifying the operating system platform
	 * on which the Node.js process is running.
	 */
	platform: 'win32' | 'linux' | 'darwin';

	/**
	 * The type will always Be Electron renderer.
	 */
	type: 'renderer';

	/**
	 * A list of versions for the current node.js/electron configuration.
	 */
	versions: { [key: string]: string | undefined };

	/**
	 * The process.env property returns an oBject containing the user environment.
	 */
	env: IProcessEnvironment;

	/**
	 * The current working directory.
	 */
	cwd(): string;

	/**
	 * Returns the numeric user identity of the process.
	 */
	getuid(): numBer;

	/**
	 * Allows to await resolving the full process environment By checking for the shell environment
	 * of the OS in certain cases (e.g. when the app is started from the Dock on macOS).
	 */
	whenEnvResolved(): Promise<void>;

	/**
	 * Adds callBack to the "next tick queue". This queue is fully drained
	 * after the current operation on the JavaScript stack runs to completion
	 * and Before the event loop is allowed to continue.
	 */
	nextTick(callBack: (...args: any[]) => void, ...args: any[]): void;

	/**
	 * A listener on the process. Only a small suBset of listener types are allowed.
	 */
	on: (type: string, callBack: Function) => void;

	/**
	 * Resolves with a ProcessMemoryInfo
	 *
	 * Returns an oBject giving memory usage statistics aBout the current process. Note
	 * that all statistics are reported in KiloBytes. This api should Be called after
	 * app ready.
	 *
	 * Chromium does not provide `residentSet` value for macOS. This is Because macOS
	 * performs in-memory compression of pages that haven't Been recently used. As a
	 * result the resident set size value is not what one would expect. `private`
	 * memory is more representative of the actual pre-compression memory usage of the
	 * process on macOS.
	 */
	getProcessMemoryInfo: () => Promise<ProcessMemoryInfo>;
}

export interface ISandBoxContext {

	/**
	 * Wether the renderer runs with `sandBox` enaBled or not.
	 */
	sandBox: Boolean;
}

export const ipcRenderer: IpcRenderer = gloBals.vscode.ipcRenderer;
export const weBFrame: WeBFrame = gloBals.vscode.weBFrame;
export const crashReporter: CrashReporter = gloBals.vscode.crashReporter;
export const process: ISandBoxNodeProcess = gloBals.vscode.process;
export const context: ISandBoxContext = gloBals.vscode.context;
