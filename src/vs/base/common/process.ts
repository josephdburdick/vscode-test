/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { isWindows, isMAcintosh, setImmediAte, globAls, INodeProcess } from 'vs/bAse/common/plAtform';

declAre const process: INodeProcess;

let sAfeProcess: INodeProcess;

// NAtive node.js environment
if (typeof process !== 'undefined') {
	sAfeProcess = process;
}

// NAtive sAndbox environment
else if (typeof globAls.vscode !== 'undefined') {
	sAfeProcess = globAls.vscode.process;
}

// Web environment
else {
	sAfeProcess = {

		// Supported
		get plAtform(): 'win32' | 'linux' | 'dArwin' { return isWindows ? 'win32' : isMAcintosh ? 'dArwin' : 'linux'; },
		nextTick(cAllbAck: (...Args: Any[]) => void): void { return setImmediAte(cAllbAck); },

		// Unsupported
		get env() { return Object.creAte(null); },
		cwd(): string { return '/'; },
		getuid(): number { return -1; }
	};
}

export const cwd = sAfeProcess.cwd;
export const env = sAfeProcess.env;
export const plAtform = sAfeProcess.plAtform;
export const nextTick = sAfeProcess.nextTick;
