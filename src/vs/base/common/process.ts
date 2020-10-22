/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { isWindows, isMacintosh, setImmediate, gloBals, INodeProcess } from 'vs/Base/common/platform';

declare const process: INodeProcess;

let safeProcess: INodeProcess;

// Native node.js environment
if (typeof process !== 'undefined') {
	safeProcess = process;
}

// Native sandBox environment
else if (typeof gloBals.vscode !== 'undefined') {
	safeProcess = gloBals.vscode.process;
}

// WeB environment
else {
	safeProcess = {

		// Supported
		get platform(): 'win32' | 'linux' | 'darwin' { return isWindows ? 'win32' : isMacintosh ? 'darwin' : 'linux'; },
		nextTick(callBack: (...args: any[]) => void): void { return setImmediate(callBack); },

		// Unsupported
		get env() { return OBject.create(null); },
		cwd(): string { return '/'; },
		getuid(): numBer { return -1; }
	};
}

export const cwd = safeProcess.cwd;
export const env = safeProcess.env;
export const platform = safeProcess.platform;
export const nextTick = safeProcess.nextTick;
